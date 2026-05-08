// ═══════════════════════════════════════════════════════════════
// BACK-TRANSLATOR — Hindi → English → Hindi for paraphrase variation
// Source: themomentum.ai healthcare AI guide 2025
// ═══════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import type { Locale } from '../eval/eval.types';

const TRANSLATE_PROMPT = `Translate the following text from {from} to {to}. Preserve clinical entities, measurements, and timelines exactly. Output only the translation, no preamble.

Text: {text}`;

export class BackTranslator {
  private client: Anthropic;
  constructor(
    apiKey?: string,
    private readonly model = 'claude-sonnet-4-6',
  ) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async backTranslate(
    text: string,
    sourceLocale: Locale,
    intermediate: Locale = 'english',
  ): Promise<string> {
    if (sourceLocale === intermediate) return text;
    const toIntermediate = await this.translate(text, sourceLocale, intermediate);
    return this.translate(toIntermediate, intermediate, sourceLocale);
  }

  private async translate(text: string, from: Locale, to: Locale): Promise<string> {
    const r = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: TRANSLATE_PROMPT.replace('{from}', from)
            .replace('{to}', to)
            .replace('{text}', text),
        },
      ],
    });
    const block = r.content.find((b) => b.type === 'text');
    return block && block.type === 'text' ? block.text.trim() : text;
  }
}
