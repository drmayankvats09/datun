// ═══════════════════════════════════════════════════════════════
// CHAT ROUTES — /api/chat
// Main AI consultation endpoint. Claude API + prompt caching.
// TODO: Implement full consultation flow in Task #24+
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { chatLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { chatMessageSchema } from '../validators/schemas.js';

export const chatRouter = Router();

// POST /api/chat — Send message to dental AI
chatRouter.post('/chat', chatLimiter, validate(chatMessageSchema), async (_req, res) => {
  // TODO (Task #24):
  // 1. Build system prompt from prompts/index.ts
  // 2. Call AI provider (getAIProvider().complete())
  // 3. Track cost in Consultation row (aiCostUsd, aiTokensUsed, promptVersion)
  // 4. Parse [RX_START] if present → extract assessment
  // 5. Parse [PHOTO_FINDINGS_START] if present → store visual findings
  // 6. Return AI response text to frontend
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Chat endpoint pending implementation' },
  });
});
