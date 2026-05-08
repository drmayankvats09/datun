// ═══════════════════════════════════════════════════════════════
// IFD SCORER — Instruction-Following Difficulty (Li et al. 2023)
// Higher IFD = harder examples = better for fine-tuning
// Approximation: token-length × lexical-diversity × question-density
// ═══════════════════════════════════════════════════════════════
export async function computeIfdScore(text: string): Promise<number> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 0;
  const uniqueRatio = new Set(tokens).size / tokens.length;
  const lengthScore = Math.min(tokens.length / 50, 1.0);
  const questionDensity =
    (text.match(/[?]/g) ?? []).length / Math.max(text.split(/[.!?]/).length, 1);
  // Composite, normalized 0-1
  return Math.min(uniqueRatio * 0.5 + lengthScore * 0.3 + questionDensity * 0.2, 1.0);
}
