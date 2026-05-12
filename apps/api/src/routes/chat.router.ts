// ═══════════════════════════════════════════════════════════════
// CHAT ROUTES — /api/chat
// Task #44 Phase 2 — wires aiComplete() + captureMessage().
// Every AI turn is now captured into ConsultationMessage with
// full per-message AI metadata (provider, model, tokens, cost).
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireUser } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { chatMessageSchema } from '../validators/schemas.js';
import { aiComplete, type ChatMessage } from '../services/ai/index.js';
import { captureMessage } from '../services/training/index.js';
import { buildSystemPrompt } from '../prompts/index.js';
import { SYSTEM_PROMPT_VERSION } from '@repo/shared';

export const chatRouter = Router();

// ─── POST /api/chat ────────────────────────────────────────────

chatRouter.post(
  '/chat',
  chatLimiter,
  requireUser,
  validate(chatMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as {
        consultationId: string;
        messages: ChatMessage[];
        language?: 'hi' | 'en';
        patientContext?: Record<string, unknown>;
      };

      // ── 1. Capture the latest user message (last item in messages array) ──
      const lastUserMessage = body.messages[body.messages.length - 1];
      if (lastUserMessage?.role === 'user' && typeof lastUserMessage.content === 'string') {
        await captureMessage({
          consultationId: body.consultationId,
          role: 'USER',
          content: lastUserMessage.content,
        });
      }

      // ── 2. Call AI failover chain ──
      // Extract patient context for system prompt (signature: lang, name, age, gender)
      const ctx = (body.patientContext ?? {}) as Record<string, unknown>;
      const patientName = typeof ctx.name === 'string' ? ctx.name : 'Patient';
      const patientAge =
        typeof ctx.age === 'string'
          ? ctx.age
          : typeof ctx.age === 'number'
            ? String(ctx.age)
            : 'unknown';
      const patientGender = typeof ctx.gender === 'string' ? ctx.gender : 'unknown';
      const systemPrompt = buildSystemPrompt(
        body.language ?? 'en',
        patientName,
        patientAge,
        patientGender,
      );

      const aiResponse = await aiComplete(systemPrompt, body.messages, {
        // Multi-turn — skip cache to preserve per-turn context fidelity
        skipCache: body.messages.length > 3,
      });

      // ── 3. Capture AI response with full metadata ──
      await captureMessage({
        consultationId: body.consultationId,
        role: 'ASSISTANT',
        content: aiResponse.text,
        aiProvider: aiResponse.provider,
        aiModel: aiResponse.model,
        aiLatencyMs: aiResponse.latencyMs,
        aiTokensInput: aiResponse.usage.inputTokens,
        aiTokensOutput: aiResponse.usage.outputTokens,
        aiCostUsd: aiResponse.costUsd,
        promptVersion: SYSTEM_PROMPT_VERSION,
      });

      // ── 4. Return AI text to client (FE renders streaming-style) ──
      res.json({
        success: true,
        data: {
          text: aiResponse.text,
          provider: aiResponse.provider,
          model: aiResponse.model,
          latencyMs: aiResponse.latencyMs,
          cached: aiResponse.cached,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
