// ═══════════════════════════════════════════════════════════════
// VOICE TRANSCRIPT FACTORY — Voice-to-text consultation records
// Use case: tier-3 patients prefer voice over typing
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface VoiceTranscriptOutput {
  readonly id: string;
  readonly consultationMessageId: string;
  readonly audioUrl: string;
  readonly audioDurationSec: number;
  readonly audioFormat: 'mp3' | 'ogg' | 'opus' | 'aac' | 'wav';
  readonly audioFileSizeBytes: number;
  readonly transcribedText: string;
  readonly transcribedLocale:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati';
  readonly transcriptionConfidence: number;
  readonly transcriptionProvider: 'WHISPER_API' | 'GOOGLE_STT' | 'AZURE_STT' | 'BHASHINI';
  readonly transcriptionDurationMs: number;
  readonly languageDetected: string;
  readonly noiseLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly isRedacted: boolean;
  readonly createdAt: Date;
}

interface VoiceTranscriptTransient {
  readonly consultationMessageId: string;
  readonly locale?:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati';
}

export const voiceTranscriptFactory = defineFactory<
  VoiceTranscriptOutput,
  VoiceTranscriptTransient
>({
  name: 'consultation-message' as 'consultation-message',
  defaultTransient: { consultationMessageId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const audioDurationSec = faker.number.int({ min: 3, max: 90 });
    const locale = transient.locale ?? 'hindi';

    return {
      id: `voice-${String(sequence).padStart(10, '0')}`,
      consultationMessageId: transient.consultationMessageId,
      audioUrl: `https://r2.datunai.com/voice/voice-${sequence}.opus`,
      audioDurationSec,
      audioFormat: 'opus',
      audioFileSizeBytes: audioDurationSec * 8000, // ~8 KB/sec for opus
      transcribedText:
        'Doctor sahab, mere dant mein bahut dard hai, kal raat se neend nahi aa rahi',
      transcribedLocale: locale,
      transcriptionConfidence: faker.number.float({ min: 0.65, max: 0.98 }),
      transcriptionProvider: faker.helpers.weightedArrayElement([
        { weight: 55, value: 'WHISPER_API' as const },
        { weight: 25, value: 'BHASHINI' as const },
        { weight: 12, value: 'GOOGLE_STT' as const },
        { weight: 8, value: 'AZURE_STT' as const },
      ]),
      transcriptionDurationMs: faker.number.int({ min: 500, max: 5000 }),
      languageDetected: locale,
      noiseLevel: faker.helpers.weightedArrayElement([
        { weight: 55, value: 'LOW' as const },
        { weight: 35, value: 'MEDIUM' as const },
        { weight: 10, value: 'HIGH' as const },
      ]),
      isRedacted: false,
      createdAt: new Date(),
    };
  },

  persist: async (voice) => voice,
});
