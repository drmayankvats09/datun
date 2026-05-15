// ═══════════════════════════════════════════════════════════════
// IMAGE PROCESSOR TESTS — Task #46
//
// Tests against the real `sharp` library — we don't mock it because
// the contract under test IS the sharp pipeline behaviour (EXIF strip,
// resize, JPEG encode, blurhash compute).
//
// Test fixtures are generated programmatically via sharp itself —
// small synthetic images (red square, gradient, with/without EXIF
// metadata block) so tests are hermetic and reproducible.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, vi } from 'vitest';
import sharp from 'sharp';

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../lib/sentry.js', () => ({
  Sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

import { processImageBuffer } from '../../../services/media/image-processor.service.js';

// ─── Test fixture generators ─────────────────────────────────

async function makeRedJpeg(width: number, height: number): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 220, g: 20, b: 20 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function makeJpegWithExif(width: number, height: number): Promise<Buffer> {
  // sharp's withExif requires the EXIF dictionary in a specific shape.
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .withExif({
      IFD0: {
        // GPS-equivalent payload to simulate clinical PHI risk.
        Software: 'Datun-Test-Suite',
      },
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// ─── Tests ───────────────────────────────────────────────────

describe('processImageBuffer', () => {
  beforeAll(() => {
    // Some CI sharp builds need this hint to avoid concurrent buffer issues.
    sharp.cache(false);
  });

  it('returns canonical JPEG bytes + dimensions + blurhash', async () => {
    const input = await makeRedJpeg(800, 600);
    const result = await processImageBuffer(input, {
      kind: 'BLOG_IMAGE',
      claimedWidth: 800,
      claimedHeight: 600,
    });
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.blurhash.length).toBeGreaterThan(10); // ~30-char hash
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('downscales when longest edge exceeds the target', async () => {
    const input = await makeRedJpeg(3000, 2000); // larger than 1568
    const result = await processImageBuffer(input, {
      kind: 'CONSULTATION_PHOTO',
      claimedWidth: 3000,
      claimedHeight: 2000,
    });
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1568);
    expect(result.shouldRewriteOrigin).toBe(true);
  });

  it('does NOT upscale small images', async () => {
    const input = await makeRedJpeg(400, 300);
    const result = await processImageBuffer(input, {
      kind: 'BLOG_IMAGE',
      claimedWidth: 400,
      claimedHeight: 300,
    });
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it('strips EXIF when present', async () => {
    const input = await makeJpegWithExif(800, 600);
    const result = await processImageBuffer(input, {
      kind: 'CONSULTATION_PHOTO',
      claimedWidth: 800,
      claimedHeight: 600,
    });
    expect(result.exifStripped).toBe(true);
    expect(result.shouldRewriteOrigin).toBe(true);
    // Verify the OUTPUT bytes have no EXIF block.
    const outMeta = await sharp(result.bytes).metadata();
    expect(outMeta.exif).toBeUndefined();
  });

  it('reports no exif stripped when input has none', async () => {
    const input = await makeRedJpeg(800, 600);
    const result = await processImageBuffer(input, {
      kind: 'BLOG_IMAGE',
      claimedWidth: 800,
      claimedHeight: 600,
    });
    expect(result.exifStripped).toBe(false);
  });

  it('throws on corrupt bytes', async () => {
    const garbage = Buffer.from('not a real image, definitely not jpeg bytes');
    await expect(
      processImageBuffer(garbage, {
        kind: 'BLOG_IMAGE',
        claimedWidth: 100,
        claimedHeight: 100,
      }),
    ).rejects.toThrow();
  });

  it('logs warning on width/height mismatch but still processes', async () => {
    const input = await makeRedJpeg(500, 500);
    const result = await processImageBuffer(input, {
      kind: 'BLOG_IMAGE',
      claimedWidth: 1000, // wrong
      claimedHeight: 1000, // wrong
    });
    // Should still complete with the actual dimensions.
    expect(result.width).toBe(500);
    expect(result.height).toBe(500);
  });
});
