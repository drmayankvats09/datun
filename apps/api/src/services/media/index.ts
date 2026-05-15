// ═══════════════════════════════════════════════════════════════
// MEDIA SERVICE BARREL — Task #46
//
// Single import surface for callers. Routes / worker / tests should
// import from '../services/media/index.js' (or '../services/media')
// and never reach into individual files. This makes refactors safe:
// moving moderateImage from moderation.service.ts to ai/moderation.ts
// later only requires a one-line update here.
//
// Pattern: services/email/index.ts, services/whatsapp/index.ts.
// ═══════════════════════════════════════════════════════════════

// ── Public service API (orchestrator entry points) ──
export {
  requestUploadIntent,
  confirmUpload,
  processMedia,
  getMediaAsset,
  deleteMedia,
  // Test-only — never use from app code.
  __resetProvidersForTest,
  // Re-exports for convenient router/error-mapping use.
  MEDIA_ERROR_KEYS,
  MEDIA_KINDS,
} from './media.service.js';

export type {
  RequestUploadIntentArgs,
  UploadIntentResult,
  ConfirmUploadArgs,
  GetMediaAssetOptions,
  DeleteMediaArgs,
} from './media.service.js';

// ── Storage / Delivery contracts (consumed by tests and admin tools) ──
export type {
  StorageProvider,
  DeliveryProvider,
  SignedUploadDescriptor,
  CreateSignedUploadOptions,
  HeadObjectResult,
  WriteObjectOptions,
  DeliveryUploadResult,
  UploadFromOriginOptions,
  GetVariantUrlsOptions,
} from './storage.types.js';

export {
  StorageNotFoundError,
  StorageProviderError,
  DeliveryProviderError,
} from './storage.types.js';

// ── Adapters (re-exported for tests / future admin override) ──
export { R2Provider } from './r2.provider.js';
export { CloudflareImagesProvider } from './cloudflare-images.provider.js';
export { CloudinaryProvider } from './cloudinary.provider.js';

// ── Utilities (consumed by the worker pipeline) ──
export { processImageBuffer } from './image-processor.service.js';
export type { ProcessedImage, ProcessImageOptions } from './image-processor.service.js';

export { detectAndVerifyImage, assertImageOrThrow, MagicByteRefusal } from './magic-bytes.js';
export type { MagicByteResult } from './magic-bytes.js';

export { moderateImage } from './moderation.service.js';
export type { ModerationResult, ModerateImageOptions } from './moderation.service.js';
