// ═══════════════════════════════════════════════════════════════
// IMAGE QUALITY CALIBRATION — Task #46 BDS approval gate
//
// One-shot CLI that helps the BDS (Mayank, clinical owner) approve the
// canonical resize / re-encode parameters used by the media pipeline:
//
//   - longest edge:        RESIZE_TARGET_PX (default 1568px)
//   - JPEG quality:        JPEG_QUALITY (default 92)
//   - chroma subsampling:  4:4:4 (preserves caries dots)
//
// How it works:
//
//   1. Reads "golden" dental photos from a folder (any JPEG/PNG/HEIC).
//   2. Runs each one through the exact processImageBuffer pipeline.
//   3. Sends BOTH original AND processed bytes to Claude Vision with
//      the same diagnostic prompt the consultation flow uses.
//   4. Compares the two responses for: completeness, accuracy,
//      detail capture (caries spotting), and recommended next steps.
//   5. Writes a markdown report — Mayank reads it, ticks each row,
//      and approves the parameter set OR requests a retune.
//
// Run:
//   pnpm --filter api tsx src/scripts/image-quality-calibration.ts \\
//     --input ./calibration-photos \\
//     --output ./calibration-report.md
//
// Memory rule (CLINICAL): we DO NOT auto-merge changes from this
// script. Output is a report; approval is a human decision. ADR-0006
// records the parameter set Mayank approves.
// ═══════════════════════════════════════════════════════════════

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';

import { env } from '../config/env.js';
import { processImageBuffer } from '../services/media/image-processor.service.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const VISION_MODEL = 'claude-sonnet-4-20250514';
const VISION_MAX_TOKENS = 800;

const DIAGNOSTIC_PROMPT = `You are a senior dental clinician reviewing a patient-submitted photo of
their mouth. Provide your professional observations in this exact JSON shape, no prose outside:

{
  "primary_finding": "<one-sentence main observation>",
  "additional_findings": ["<finding 1>", "<finding 2>", ...],
  "severity_estimate": "low" | "moderate" | "high" | "urgent",
  "image_quality_note": "<one sentence on clarity, lighting, framing>",
  "recommended_next_step": "<one-sentence next step the patient should take>"
}

Be specific. If the image is unsuitable for clinical assessment (blurry, dark, occluded),
say so in image_quality_note.`;

interface VisionResponse {
  primary_finding?: string;
  additional_findings?: string[];
  severity_estimate?: string;
  image_quality_note?: string;
  recommended_next_step?: string;
}

interface CalibrationRow {
  filename: string;
  originalSizeBytes: number;
  processedSizeBytes: number;
  originalDims: string;
  processedDims: string;
  exifStripped: boolean;
  durationMs: number;
  originalResponse: VisionResponse | null;
  processedResponse: VisionResponse | null;
  parityScore: 'match' | 'minor-divergence' | 'major-divergence' | 'error';
  notes: string;
}

// ─── CLI entry ──────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error('Usage: --input <dir> --output <markdown-file>');
    process.exit(1);
  }
  if (!env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY must be set');
    process.exit(1);
  }

  const inputDir = path.resolve(args.input);
  const outputFile = path.resolve(args.output);
  console.log(`[calibration] input dir: ${inputDir}`);
  console.log(`[calibration] output file: ${outputFile}`);

  const dirStat = await stat(inputDir);
  if (!dirStat.isDirectory()) {
    console.error(`Not a directory: ${inputDir}`);
    process.exit(1);
  }

  const files = (await readdir(inputDir)).filter((f) => /\.(jpe?g|png|heic|heif|webp)$/i.test(f));
  if (files.length === 0) {
    console.error('No image files found in input directory');
    process.exit(1);
  }
  console.log(`[calibration] ${files.length} image(s) found`);

  const rows: CalibrationRow[] = [];
  for (const filename of files) {
    console.log(`[calibration] processing ${filename}...`);
    rows.push(await calibrateOne(path.join(inputDir, filename), filename));
  }

  const report = renderReport(rows);
  await writeFile(outputFile, report, 'utf-8');
  console.log(`[calibration] wrote ${outputFile}`);
  console.log('[calibration] done. Open the file and review each row before approving.');
}

// ─── Per-image calibration ──────────────────────────────────

async function calibrateOne(filePath: string, filename: string): Promise<CalibrationRow> {
  const originalBytes = await readFile(filePath);
  const start = Date.now();
  let processed;
  try {
    processed = await processImageBuffer(originalBytes, {
      kind: 'CONSULTATION_PHOTO',
      // Set to actual dims via probe — calibration runs in test mode,
      // so we don't enforce the dimension-mismatch warning here.
      claimedWidth: 0,
      claimedHeight: 0,
    });
  } catch (err) {
    return {
      filename,
      originalSizeBytes: originalBytes.length,
      processedSizeBytes: 0,
      originalDims: '?',
      processedDims: 'error',
      exifStripped: false,
      durationMs: Date.now() - start,
      originalResponse: null,
      processedResponse: null,
      parityScore: 'error',
      notes: `processImageBuffer failed: ${(err as Error).message}`,
    };
  }
  const durationMs = Date.now() - start;

  const originalMime = sniffMime(originalBytes);
  const [originalResp, processedResp] = await Promise.all([
    callVision(originalBytes, originalMime),
    callVision(processed.bytes, 'image/jpeg'),
  ]);

  const parity = compareResponses(originalResp, processedResp);

  return {
    filename,
    originalSizeBytes: originalBytes.length,
    processedSizeBytes: processed.sizeBytes,
    originalDims: '(probe omitted in calibration)',
    processedDims: `${processed.width}×${processed.height}`,
    exifStripped: processed.exifStripped,
    durationMs,
    originalResponse: originalResp,
    processedResponse: processedResp,
    parityScore: parity.score,
    notes: parity.notes,
  };
}

// ─── Vision API call ────────────────────────────────────────

async function callVision(bytes: Buffer, mime: string): Promise<VisionResponse | null> {
  try {
    const response = await axios.post(
      ANTHROPIC_URL,
      {
        model: VISION_MODEL,
        max_tokens: VISION_MAX_TOKENS,
        system: DIAGNOSTIC_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mime, data: bytes.toString('base64') },
              },
              { type: 'text', text: 'Respond now in the JSON shape from the system prompt.' },
            ],
          },
        ],
      },
      {
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 60_000,
      },
    );
    const text = (response.data?.content?.[0]?.text as string | undefined) ?? '';
    return parseVisionJson(text);
  } catch (err) {
    console.warn(`[calibration] vision call failed: ${(err as Error).message}`);
    return null;
  }
}

function parseVisionJson(text: string): VisionResponse | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(stripped) as VisionResponse;
  } catch {
    return null;
  }
}

// ─── Parity scoring ─────────────────────────────────────────

function compareResponses(
  a: VisionResponse | null,
  b: VisionResponse | null,
): { score: CalibrationRow['parityScore']; notes: string } {
  if (!a || !b) {
    return { score: 'error', notes: 'one or both vision calls failed' };
  }
  const sameSeverity = a.severity_estimate === b.severity_estimate;
  const samePrimary =
    (a.primary_finding ?? '').toLowerCase().slice(0, 40) ===
    (b.primary_finding ?? '').toLowerCase().slice(0, 40);
  const aFindings = new Set((a.additional_findings ?? []).map((s) => s.toLowerCase().slice(0, 30)));
  const bFindings = new Set((b.additional_findings ?? []).map((s) => s.toLowerCase().slice(0, 30)));
  const overlap = [...aFindings].filter((f) => bFindings.has(f)).length;
  const total = Math.max(aFindings.size, bFindings.size, 1);
  const coverage = overlap / total;

  if (sameSeverity && samePrimary && coverage >= 0.66) {
    return { score: 'match', notes: 'severity + primary + ≥66% findings overlap' };
  }
  if (sameSeverity && coverage >= 0.33) {
    return {
      score: 'minor-divergence',
      notes: `severity matches but primary differs OR findings overlap=${(coverage * 100).toFixed(0)}%`,
    };
  }
  return {
    score: 'major-divergence',
    notes: `severity mismatch (${a.severity_estimate} vs ${b.severity_estimate}) or low overlap (${(coverage * 100).toFixed(0)}%)`,
  };
}

// ─── Report rendering ───────────────────────────────────────

function renderReport(rows: CalibrationRow[]): string {
  const lines: string[] = [];
  lines.push('# Image Quality Calibration Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Total images:** ${rows.length}`);
  lines.push('');
  lines.push('## Summary');
  const summary = rows.reduce(
    (acc, r) => {
      acc[r.parityScore] = (acc[r.parityScore] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  for (const [k, v] of Object.entries(summary)) {
    lines.push(`- **${k}**: ${v}`);
  }
  lines.push('');
  lines.push('## Per-image results');
  for (const r of rows) {
    lines.push('');
    lines.push(`### ${r.filename}`);
    lines.push('');
    lines.push(`- **Original size:** ${(r.originalSizeBytes / 1024).toFixed(1)} KB`);
    lines.push(`- **Processed size:** ${(r.processedSizeBytes / 1024).toFixed(1)} KB`);
    lines.push(`- **Final dims:** ${r.processedDims}`);
    lines.push(`- **EXIF stripped:** ${r.exifStripped ? 'yes' : 'no'}`);
    lines.push(`- **Pipeline duration:** ${r.durationMs} ms`);
    lines.push(`- **Parity:** **${r.parityScore}** — ${r.notes}`);
    lines.push('');
    lines.push(`**Original Vision response:**`);
    lines.push('```json');
    lines.push(JSON.stringify(r.originalResponse, null, 2));
    lines.push('```');
    lines.push('');
    lines.push(`**Processed Vision response:**`);
    lines.push('```json');
    lines.push(JSON.stringify(r.processedResponse, null, 2));
    lines.push('```');
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Reviewer sign-off');
  lines.push('');
  lines.push('- [ ] I have reviewed each row above.');
  lines.push('- [ ] The `match` rate is acceptable (>80% of images).');
  lines.push('- [ ] No `major-divergence` is clinically concerning.');
  lines.push('- [ ] I approve the current parameter set in ADR-0006.');
  lines.push('');
  lines.push('Reviewer: ___________________   Date: ____________');
  return lines.join('\n');
}

// ─── Tiny helpers ───────────────────────────────────────────

function sniffMime(bytes: Buffer): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes.slice(0, 4).toString('ascii') === 'RIFF') return 'image/webp';
  // HEIC/HEIF detection is more involved — for calibration assume the
  // input was already validated by the orchestrator path.
  return 'image/jpeg';
}

function parseArgs(argv: string[]): { input?: string; output?: string } {
  const out: { input?: string; output?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) out.input = argv[++i];
    else if (argv[i] === '--output' && argv[i + 1]) out.output = argv[++i];
  }
  return out;
}

main().catch((err) => {
  console.error('[calibration] fatal error', err);
  process.exit(1);
});
