import sharp from "sharp";
import { AgentHarnessError } from "../core/errors";
import {
  VISUAL_ASSET_PREVIEW_SOURCE_MAX_PIXELS,
  type VisualAssetMetadata,
} from "./visualAssetReview";

export const VISUAL_ASSET_PREVIEW_MAX_EDGE = 4096;
export const VISUAL_ASSET_PREVIEW_MAX_PIXELS = 16_777_216;
export const VISUAL_ASSET_PREVIEW_MAX_BYTES = 12_000_000;

export interface VisualAssetCrop {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

// The only image-processing dependency boundary. No paths, files, renderer APIs,
// or caller-selected encoder/transform settings cross this interface.
export async function encodeVisualAssetPreview(
  source: Buffer,
  metadata: VisualAssetMetadata,
  crop: VisualAssetCrop | null,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const input = {
    limitInputPixels: VISUAL_ASSET_PREVIEW_SOURCE_MAX_PIXELS,
    failOn: "warning" as const,
  };
  try {
    const decoded = await sharp(source, input).metadata();
    if (decoded.width !== metadata.width || decoded.height !== metadata.height ||
        decoded.format !== metadata.format || (decoded.pages ?? 1) !== 1) {
      throw new Error("Inconsistent or multi-frame source");
    }
    const width = crop?.cropWidth ?? metadata.width;
    const height = crop?.cropHeight ?? metadata.height;
    const nativeEdge = Math.max(width, height);
    const minimumEdge = nativeEdge >= 1024 ? 1024 : 1;
    let edge = Math.min(VISUAL_ASSET_PREVIEW_MAX_EDGE, nativeEdge);
    for (;;) {
      let pipeline = sharp(source, input);
      if (crop) {
        pipeline = pipeline.extract({
          left: crop.cropX, top: crop.cropY, width: crop.cropWidth, height: crop.cropHeight,
        });
      }
      // Extract in original source pixel coordinates, then fit the whole region.
      // Never auto-orient, crop-to-fill, flatten, or apply appearance adjustments.
      const { data, info } = await pipeline
        .resize({
          width: edge, height: edge, fit: "inside", withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3, fastShrinkOnLoad: false,
        })
        .keepIccProfile()
        .png({ compressionLevel: 6, adaptiveFiltering: true, palette: false })
        .timeout({ seconds: 30 })
        .toBuffer({ resolveWithObject: true });
      if (info.width < 1 || info.height < 1 || info.width > edge || info.height > edge ||
          info.width > width || info.height > height ||
          info.width * info.height > VISUAL_ASSET_PREVIEW_MAX_PIXELS ||
          (decoded.hasAlpha && info.channels !== 4 && info.channels !== 2)) {
        throw new Error("Invalid preview output");
      }
      if (data.length <= VISUAL_ASSET_PREVIEW_MAX_BYTES) {
        return { buffer: data, width: info.width, height: info.height };
      }
      if (edge === minimumEdge) {
        throw new AgentHarnessError(
          "FILE_DENIED", "Preview cannot meet the 12,000,000-byte limit within the minimum review dimensions.",
        );
      }
      // Fixed 3/4 schedule; every attempt starts from the canonical source, never
      // a previously resized preview. The final attempt uses exactly the floor.
      edge = Math.max(minimumEdge, Math.floor(edge * 3 / 4));
    }
  } catch (error) {
    if (error instanceof AgentHarnessError) throw error;
    // Native decoder errors can contain sensitive implementation details.
    throw new AgentHarnessError("FILE_DENIED", "Visual asset could not be decoded and previewed safely.");
  }
}
