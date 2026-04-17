// ═══════════════════════════════════════════════════════════════
// CONSULTATION SERVICE — AI consultation business logic
// Lifecycle: start → message → message → ... → complete → PDF
// TODO: Implement in Task #24+ (consultation flow routes)
// ═══════════════════════════════════════════════════════════════

/**
 * Extract diagnosis and urgency from AI [RX_START] block.
 * Used after AI generates prescription to parse structured data.
 */
export function extractAssessment(messages: Array<{ role: string; content: string }>): {
  diagnosis: string;
  urgency: string;
  chiefComplaint: string;
} {
  let diagnosis = '';
  let urgency = '';
  let chiefComplaint = '';

  for (const msg of messages) {
    const content = typeof msg.content === 'string' ? msg.content : '';

    // First meaningful user message = chief complaint
    if (msg.role === 'user' && !chiefComplaint && content.length > 3) {
      chiefComplaint = content.slice(0, 200);
    }

    // AI's RX block contains structured diagnosis
    if (msg.role === 'assistant' && content.includes('[RX_START]')) {
      const diagMatch = content.match(/DIAGNOSIS:\s*([^\n]+)/);
      const urgMatch = content.match(/URGENCY:\s*([^\n]+)/);
      if (diagMatch?.[1]) diagnosis = diagMatch[1].trim();
      if (urgMatch?.[1]) urgency = urgMatch[1].trim();
    }
  }

  return { diagnosis, urgency, chiefComplaint };
}
