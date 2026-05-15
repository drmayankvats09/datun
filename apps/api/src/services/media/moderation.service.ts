// ═══════════════════════════════════════════════════════════════
// MEDIA MODERATION SERVICE — Task #46 Datun-specific AI moderation
//
// Goal: detect uploads that are NOT what they should be, without
// blocking legitimate clinical content. Dental triage is the primary
// use case — patients sometimes accidentally upload faces, full-body
// shots, screenshots, or unrelated images. We surface those for human
// review (FLAGGED) instead of auto-rejecting.
//
// Hard-rejects only for:
//   - Adult / sexual / nudity content (any kind)
//   - Graphic violence / gore
//   - Recognised CSAM signatures (defensive — we never expect these
//     but the worker must surface immediately to admin)
//
// Implementation reuses the existing AI client (Claude Vision primary
// with OpenAI / Gemini failover). No new vendor integration — every
// MediaKind that requires moderation routes through the same provider
// chain we already operate for consultations.
//
// Cost optimisation:
//   - Moderation calls a 'lite' system prompt + tight max_tokens
//   - Image is the THUMBNAIL variant (200px) not the origin — saves
//     ~95% of image-token cost vs sending the full 1568px frame
//   - Cache disabled (skipCache: true) — every upload is unique bytes
//
// Per memory rule #15: AI exercises judgment; the prompt is a
// foundation, the model adapts to context. We do NOT enumerate
// hundreds of edge-case rules — we trust Claude's vision capabilities.
// ═══════════════════════════════════════════════════════════════

import { aiComplete } from '../ai/index.js';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';

import { getMediaKindConfig, type MediaKind, type MediaModerationStatus } from '@repo/shared';

import type { ChatMessage } from '../ai/types.js';

/**
 * Outcome of an AI moderation pass.
 *
 *   APPROVED — safe + on-topic for the kind (dental for CONSULTATION_PHOTO).
 *   FLAGGED  — off-topic but not harmful; queue for human admin review.
 *   REJECTED — explicit content / graphic violence / abuse signatures.
 *
 * `reasoning` is stored on `MediaAsset.moderationFlags` so an admin
 * reviewer (or future audit) can see WHY the model decided what it did.
 */
export interface ModerationResult {
  readonly status: MediaModerationStatus;
  readonly confidence: number;
  readonly reasoning: string;
  readonly category: string | null;
  readonly model: string;
}

export interface ModerateImageOptions {
  readonly mediaId: string;
  readonly kind: MediaKind;
  /**
   * Base64-encoded image (without the `data:` URI prefix). Worker
   * fetches the THUMBNAIL variant from CF Images for cost efficiency
   * — the moderation decision does NOT need 1568px granularity.
   */
  readonly imageBase64: string;
  readonly mimeType: string;
}

/**
 * Run the moderation pass for one media asset. Returns a typed result
 * the orchestrator stores on the DB row. On AI provider total failure
 * we return a default PENDING-equivalent (status FLAGGED, reasoning
 * notes the failure) — never silently APPROVE on failure.
 */
export async function moderateImage(opts: ModerateImageOptions): Promise<ModerationResult> {
  const cfg = getMediaKindConfig(opts.kind);
  if (!cfg.requiresModeration) {
    // Caller should not have invoked us; defensive return to avoid
    // crashing the worker if config is mid-rollout.
    return {
      status: 'APPROVED',
      confidence: 1,
      reasoning: 'Moderation not required for this MediaKind',
      category: null,
      model: 'skipped',
    };
  }

  const systemPrompt = buildSystemPrompt(opts.kind);
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: opts.mimeType,
            data: opts.imageBase64,
          },
        },
        {
          type: 'text',
          text: 'Classify this image per the rules in the system prompt. Respond with a single JSON object as instructed — no prose outside the JSON.',
        },
      ],
    },
  ];

  let responseText: string;
  let model: string;
  try {
    const response = await aiComplete(systemPrompt, messages, {
      maxTokens: 300,
      skipCache: true, // every upload is unique — caching wastes Redis
    });
    responseText = response.text;
    model = response.model;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: 'media', op: 'moderateImage' },
      extra: { mediaId: opts.mediaId, kind: opts.kind },
    });
    logger.error('[MediaModeration] AI completion failed — defaulting to FLAGGED', {
      mediaId: opts.mediaId,
      kind: opts.kind,
      error: (err as Error).message,
    });
    return {
      status: 'FLAGGED',
      confidence: 0,
      reasoning: `AI moderation call failed: ${(err as Error).message}`,
      category: 'ai_failure',
      model: 'unknown',
    };
  }

  const parsed = parseModerationResponse(responseText);
  if (!parsed) {
    Sentry.captureMessage('Moderation response unparseable — falling back to FLAGGED', {
      level: 'warning',
      extra: { mediaId: opts.mediaId, responseText },
    });
    return {
      status: 'FLAGGED',
      confidence: 0.5,
      reasoning: `AI returned non-conforming response: ${responseText.slice(0, 200)}`,
      category: 'parse_failure',
      model,
    };
  }

  return { ...parsed, model };
}

// ─── Prompt construction ──────────────────────────────────────

function buildSystemPrompt(kind: MediaKind): string {
  // Per-kind decision rules. We keep the prompt SMALL and DIRECTIVE —
  // larger prompts cost more tokens per upload and don't improve the
  // signal. Claude is good at following short rules over long ones.
  switch (kind) {
    case 'CONSULTATION_PHOTO':
      return CLINICAL_PROMPT;
    case 'PRESCRIPTION_DOC':
      return PRESCRIPTION_PROMPT;
    case 'USER_AVATAR':
    case 'DOCTOR_AVATAR':
      return AVATAR_PROMPT;
    case 'CLINIC_COVER':
    case 'CLINIC_GALLERY':
      return CLINIC_PROMPT;
    default:
      return GENERIC_PROMPT;
  }
}

const CLINICAL_PROMPT = `You are a content-safety classifier for a dental triage platform.

The user upload SHOULD show one of: teeth, gums, oral cavity, dental
appliance, dental X-ray, mouth area. Photos with patient face visible
incidentally are acceptable.

Classify into exactly one of three statuses:
  APPROVED — clear dental/oral subject matter, no safety issues.
  FLAGGED  — not dental but otherwise benign (face-only, unrelated
             body part, screenshot, blurry/unusable). Will go to
             admin review.
  REJECTED — explicit/sexual content, graphic violence/gore, or any
             content that appears to involve a minor in a sensitive
             manner. Hard reject.

Respond with this exact JSON shape, no extra prose:
{
  "status": "APPROVED" | "FLAGGED" | "REJECTED",
  "confidence": 0.0-1.0,
  "category": "dental" | "face_only" | "unrelated" | "screenshot" | "explicit" | "violence" | "other",
  "reasoning": "<one short sentence in English>"
}`;

const PRESCRIPTION_PROMPT = `You are a content-safety classifier.

The user upload SHOULD show a medical prescription document, paper or
digital, including handwritten Rx, printed prescriptions, dental
treatment plans, X-ray reports, or lab reports.

Statuses:
  APPROVED — recognisable medical document.
  FLAGGED  — not a medical document but benign (random page, photo,
             non-medical paperwork).
  REJECTED — explicit/violent/abusive content.

Respond ONLY with this JSON:
{ "status": "APPROVED" | "FLAGGED" | "REJECTED",
  "confidence": 0.0-1.0,
  "category": "rx" | "report" | "unrelated_document" | "non_document" | "explicit" | "other",
  "reasoning": "<one short English sentence>" }`;

const AVATAR_PROMPT = `You are a content-safety classifier for profile avatars.

The user upload SHOULD show a single recognisable person's face/head,
suitable as a profile picture, fully clothed, no inappropriate content.

Statuses:
  APPROVED — appropriate profile photo.
  FLAGGED  — not a person (logo, illustration, scenery) — benign but
             unusual for an avatar.
  REJECTED — explicit/sexual/violent content, or appears to depict a
             minor in a sensitive manner.

Respond ONLY with this JSON:
{ "status": "APPROVED" | "FLAGGED" | "REJECTED",
  "confidence": 0.0-1.0,
  "category": "person" | "logo" | "scenery" | "explicit" | "violence" | "other",
  "reasoning": "<one short English sentence>" }`;

const CLINIC_PROMPT = `You are a content-safety classifier for partner clinic photos.

The upload SHOULD show clinic interior, equipment, staff, signage, or
exterior. Clinical photography of treatments is acceptable. Patient
faces should not be prominent (privacy).

Statuses:
  APPROVED — clinic-relevant content.
  FLAGGED  — unrelated business/location or prominent patient face.
  REJECTED — explicit/violent content.

Respond ONLY with this JSON:
{ "status": "APPROVED" | "FLAGGED" | "REJECTED",
  "confidence": 0.0-1.0,
  "category": "interior" | "exterior" | "staff" | "equipment" | "patient_face" | "unrelated" | "explicit" | "other",
  "reasoning": "<one short English sentence>" }`;

const GENERIC_PROMPT = `You are a content-safety classifier.

Statuses:
  APPROVED — benign content, no safety concerns.
  FLAGGED  — unclear or potentially off-topic.
  REJECTED — explicit/sexual/violent content.

Respond ONLY with this JSON:
{ "status": "APPROVED" | "FLAGGED" | "REJECTED",
  "confidence": 0.0-1.0,
  "category": "<one-word category>",
  "reasoning": "<one short English sentence>" }`;

// ─── Response parsing ─────────────────────────────────────────

interface ParsedResponse {
  status: MediaModerationStatus;
  confidence: number;
  reasoning: string;
  category: string | null;
}

/**
 * Defensive JSON parser — Claude usually returns clean JSON but can
 * occasionally wrap it in markdown fences. We strip fences and parse;
 * on any failure we return null and let the caller fall back to FLAGGED.
 */
function parseModerationResponse(text: string): ParsedResponse | null {
  const trimmed = text.trim();
  // Strip ```json … ``` fences if present.
  const noFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  let raw: unknown;
  try {
    raw = JSON.parse(noFences);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const statusValue = String(obj['status'] ?? '').toUpperCase();
  if (statusValue !== 'APPROVED' && statusValue !== 'FLAGGED' && statusValue !== 'REJECTED') {
    return null;
  }

  const confidenceRaw = obj['confidence'];
  const confidence =
    typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0.5;

  const reasoning = typeof obj['reasoning'] === 'string' ? obj['reasoning'].slice(0, 500) : '';
  const category = typeof obj['category'] === 'string' ? obj['category'].slice(0, 100) : null;

  return {
    status: statusValue as MediaModerationStatus,
    confidence,
    reasoning,
    category,
  };
}
