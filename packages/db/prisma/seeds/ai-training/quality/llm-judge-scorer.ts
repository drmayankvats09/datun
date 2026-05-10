// ═══════════════════════════════════════════════════════════════
// LLM JUDGE QUALITY — score example quality 1-5
// Source: MT-Bench-style quality scoring
// ═══════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';

const QUALITY_PROMPT = `Rate the following dental triage scenario from 1-5 on:
- Clinical realism (would a real patient say this?)
- Specificity (enough detail for triage?)
- Safety relevance (does it touch a critical safety dimension?)

Respond ONLY with a single integer 1-5.

Scenario: "{text}"`;

const cache = new Map<string, number>();

export async function llmJudgeQuality(text: string, apiKey?: string): Promise<number> {
  if (cache.has(text)) return cache.get(text)!;
  const client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  try {
    const r = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8,
      messages: [{ role: 'user', content: QUALITY_PROMPT.replace('{text}', text) }],
    });
    const block = r.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return 0;
    const match = block.text.match(/[1-5]/);
    const score = match ? Number(match[0]) : 0;
    cache.set(text, score);
    return score;
  } catch {
    return 3; // fail-safe neutral
  }
}
