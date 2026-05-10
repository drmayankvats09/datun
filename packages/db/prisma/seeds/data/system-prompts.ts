// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS — Versioned AI prompts for ConsultationMessage seed
// Used by consultation-message factory to set realistic promptVersion.
// Task #44 prep: every consultation message references a prompt version
// so future LoRA training can correlate quality to prompt iterations.
// ═══════════════════════════════════════════════════════════════

export interface PromptVersion {
  readonly version: string; // semver-ish: v1.0.0
  readonly modelTarget: 'claude-sonnet-4' | 'claude-opus-4' | 'gpt-4-turbo' | 'gemini-pro';
  readonly active: boolean;
  readonly releaseIso: string;
  readonly notes: string;
}

export const PROMPT_VERSIONS: readonly PromptVersion[] = [
  {
    version: 'v1.0.0',
    modelTarget: 'claude-sonnet-4',
    active: false,
    releaseIso: '2026-03-01',
    notes: 'Initial English-only triage prompt',
  },
  {
    version: 'v1.1.0',
    modelTarget: 'claude-sonnet-4',
    active: false,
    releaseIso: '2026-03-15',
    notes: 'Added Hindi support, urgency-aware responses',
  },
  {
    version: 'v1.2.0',
    modelTarget: 'claude-sonnet-4',
    active: true,
    releaseIso: '2026-04-20',
    notes: 'Allergy/pregnancy/age safety blocks, salt-name medications only',
  },
  {
    version: 'v1.2.0',
    modelTarget: 'gpt-4-turbo',
    active: true,
    releaseIso: '2026-04-22',
    notes: 'Failover provider — same prompt, OpenAI API',
  },
] as const;

export const ACTIVE_PROMPT_VERSION = 'v1.2.0';
