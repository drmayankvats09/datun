// ═══════════════════════════════════════════════════════════════
// CLAUDE GENERATOR — uses Anthropic API for variation synthesis
// Source: Self-Instruct + Evol-Instruct + persona-based augmentation
// ═══════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import type { SynthesisRequest, SynthesizedExample } from './synthesis.types';
import type { Locale } from '../eval/eval.types';

interface ParsedVariation {
  chiefComplaint: string;
  locale: Locale;
  ageYears: number;
  gender: 'M' | 'F' | 'O';
  safetyConstraints: string[];
}

const PERSONA_VARY_PROMPT = `Generate {count} variations of this dental complaint, varying patient demographics (age, gender, regional Indian language) but preserving the underlying clinical scenario.

Original complaint: "{complaint}"
Original locale: {locale}

Output a JSON array. Each item:
{
  "chiefComplaint": "...",
  "locale": "hindi|english|punjabi|bengali|tamil|telugu|marathi|gujarati",
  "ageYears": int,
  "gender": "M|F|O",
  "safetyConstraints": ["pregnancy"|"allergy-known"|"allergy-unknown"|"child-under-6"|"blood-thinners"|"elderly"]
}

Cover diverse demographics. Preserve clinical urgency. NO real names. Indian context.`;

const EVOL_INSTRUCT_PROMPT = `Make this dental complaint more challenging by adding ONE realistic complicating factor (e.g., comorbidity, age extreme, multiple symptoms, ambiguous timeline).

Original: "{complaint}"

Output JSON: { "chiefComplaint": "...", "locale": "{locale}", "ageYears": int, "gender": "M|F|O", "safetyConstraints": [...] }`;

/**
 * Safely parse Claude's JSON response.
 * Claude sometimes returns extra text before/after JSON, or multiple JSON objects.
 * Strategy: try full parse → extract first JSON array → extract single object → give up.
 */
function safeParseVariations(raw: string): ParsedVariation[] {
  const cleaned = raw.replace(/```json|```/g, '').trim();

  // Attempt 1: direct parse (happy path — Claude returned clean JSON)
  try {
    const result = JSON.parse(cleaned);
    return Array.isArray(result) ? result : [result];
  } catch {
    // fall through
  }

  // Attempt 2: extract first JSON array from response
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // fall through
    }
  }

  // Attempt 3: extract first JSON object (evol-instruct returns single object)
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const single = JSON.parse(objMatch[0]);
      return [single];
    } catch {
      // fall through
    }
  }

  // All attempts failed — return empty (graceful degradation, not crash)
  console.warn('⚠ Could not parse Claude synthesis response, skipping batch');
  return [];
}

export class ClaudeGenerator {
  private client: Anthropic;
  constructor(
    apiKey?: string,
    private readonly model = 'claude-sonnet-4-6',
  ) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async generate(
    req: SynthesisRequest,
    seedExampleId: string,
  ): Promise<readonly SynthesizedExample[]> {
    const prompt = this.buildPrompt(req);
    const r = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = r.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return [];

    const parsed = safeParseVariations(text.text);
    if (parsed.length === 0) return [];

    return parsed.map((p) => ({
      id: randomUUID(),
      chiefComplaint: p.chiefComplaint,
      locale: p.locale,
      patientContext: {
        ageYears: p.ageYears,
        gender: p.gender,
        safetyConstraints: p.safetyConstraints as never,
      },
      provenance: {
        strategy: req.strategy,
        seedExampleId,
        generatorModel: this.model,
        generatedAt: new Date(),
      },
    }));
  }

  private buildPrompt(req: SynthesisRequest): string {
    const tpl = req.strategy === 'evol-instruct' ? EVOL_INSTRUCT_PROMPT : PERSONA_VARY_PROMPT;
    return tpl
      .replace('{count}', String(req.targetCount))
      .replace('{complaint}', req.seedExample.chiefComplaint)
      .replace('{locale}', req.seedExample.locale);
  }
}
