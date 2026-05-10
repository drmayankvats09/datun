// ═══════════════════════════════════════════════════════════════
// SELF-INSTRUCT — bootstrap new instructions from existing seed pool
// Source: Wang et al. 2022 (Self-Instruct), adapted for clinical
// ═══════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import type { SynthesizedExample } from './synthesis.types';
import type { Locale } from '../eval/eval.types';

const SELF_INSTRUCT_PROMPT = `You are generating new dental triage scenarios from an existing pool. Each scenario must be:
- Clinically realistic (Indian dental practice context)
- Distinct from existing seeds (different complaint type, demographic, or urgency)
- Use salt-name medications only when relevant
- Cover at least one of: pregnancy, child<6, blood-thinners, allergy-unknown, elderly

Existing seeds (sample):
{seeds}

Generate {count} NEW scenarios. Output JSON array:
[{"chiefComplaint": "...", "locale": "hindi|english|...", "ageYears": int, "gender": "M|F|O", "safetyConstraints": [...], "expectedUrgency": "EMERGENCY|URGENT|MODERATE|ROUTINE"}]`;

export async function selfInstructGenerate(
  seedComplaints: readonly string[],
  count: number,
  apiKey?: string,
): Promise<readonly SynthesizedExample[]> {
  const client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  const sampleSeeds = seedComplaints
    .slice(0, 10)
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');
  const r = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: SELF_INSTRUCT_PROMPT.replace('{seeds}', sampleSeeds).replace(
          '{count}',
          String(count),
        ),
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') return [];
  const cleaned = block.text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as Array<{
    chiefComplaint: string;
    locale: Locale;
    ageYears: number;
    gender: 'M' | 'F' | 'O';
    safetyConstraints: string[];
  }>;
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
      strategy: 'self-instruct',
      seedExampleId: 'pool-sample',
      generatorModel: 'claude-sonnet-4-6',
      generatedAt: new Date(),
    },
  }));
}
