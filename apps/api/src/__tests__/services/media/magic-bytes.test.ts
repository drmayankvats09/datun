// ═══════════════════════════════════════════════════════════════
// MAGIC-BYTES TESTS — Task #46
//
// Hermetic tests using real file signature byte sequences. We do not
// mock `file-type` — the library is the contract under test. We feed
// it short Buffer prefixes that match known magic bytes for JPEG, PNG,
// WebP, GIF, PDF, MP4, etc., and assert our classification logic.
//
// Pattern: existing apps/api/src/__tests__ vitest style.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  detectAndVerifyImage,
  assertImageOrThrow,
  MagicByteRefusal,
} from '../../../services/media/magic-bytes.js';
import { MEDIA_ERROR_KEYS } from '@repo/shared';

// ─── Real magic-byte fixtures ─────────────────────────────────

/** SOI marker + JFIF segment — minimal valid JPEG header. */
function jpegHeader(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
  ]);
}
/** PNG 8-byte signature + IHDR chunk start. */
function pngHeader(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
}
/** RIFF/WEBP header. */
function webpHeader(): Buffer {
  return Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from('WEBPVP8 ', 'ascii'),
  ]);
}
/** GIF89a signature. */
function gifHeader(): Buffer {
  return Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
}
/** PDF %PDF-1.4 signature. */
function pdfHeader(): Buffer {
  return Buffer.from('%PDF-1.4\n', 'ascii');
}
/** MP4 ftyp box — typical mobile-recorded video. */
function mp4Header(): Buffer {
  return Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x20]),
    Buffer.from('ftypisom', 'ascii'),
    Buffer.from([0x00, 0x00, 0x02, 0x00]),
    Buffer.from('isomiso2avc1mp41', 'ascii'),
  ]);
}

// ─── Tests ────────────────────────────────────────────────────

describe('detectAndVerifyImage', () => {
  it('accepts a JPEG', async () => {
    const result = await detectAndVerifyImage(jpegHeader());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mime).toBe('image/jpeg');
  });

  it('accepts a PNG', async () => {
    const result = await detectAndVerifyImage(pngHeader());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mime).toBe('image/png');
  });

  it('accepts a WebP', async () => {
    const result = await detectAndVerifyImage(webpHeader());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mime).toBe('image/webp');
  });

  it('rejects GIF (not in INPUT_MIME_TYPES whitelist)', async () => {
    const result = await detectAndVerifyImage(gifHeader());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorKey).toBe(MEDIA_ERROR_KEYS.notAnImage);
      expect(result.detected).toBe('image/gif');
    }
  });

  it('rejects PDF with notAnImage key', async () => {
    const result = await detectAndVerifyImage(pdfHeader());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorKey).toBe(MEDIA_ERROR_KEYS.notAnImage);
      expect(result.detected).toBe('application/pdf');
    }
  });

  it('rejects MP4 with looksLikeVideo key (friendly redirect)', async () => {
    const result = await detectAndVerifyImage(mp4Header());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorKey).toBe(MEDIA_ERROR_KEYS.looksLikeVideo);
      expect(result.detected).toContain('video/');
    }
  });

  it('rejects empty buffer with cannotProcess', async () => {
    const result = await detectAndVerifyImage(Buffer.alloc(0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe(MEDIA_ERROR_KEYS.cannotProcess);
  });

  it('rejects random bytes that do not match any signature', async () => {
    const result = await detectAndVerifyImage(Buffer.from('not an image, just text'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe(MEDIA_ERROR_KEYS.notAnImage);
  });
});

describe('assertImageOrThrow', () => {
  it('returns mime+ext on acceptable image', async () => {
    const result = await assertImageOrThrow(jpegHeader());
    expect(result.mime).toBe('image/jpeg');
    expect(result.ext).toBe('jpg');
  });

  it('throws MagicByteRefusal with errorKey on refusal', async () => {
    await expect(assertImageOrThrow(mp4Header())).rejects.toBeInstanceOf(MagicByteRefusal);
    try {
      await assertImageOrThrow(mp4Header());
    } catch (err) {
      expect(err).toBeInstanceOf(MagicByteRefusal);
      const refusal = err as MagicByteRefusal;
      expect(refusal.errorKey).toBe(MEDIA_ERROR_KEYS.looksLikeVideo);
    }
  });
});
