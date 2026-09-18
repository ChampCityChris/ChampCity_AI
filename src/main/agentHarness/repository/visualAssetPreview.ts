import { createHash } from "node:crypto";
import { AgentHarnessError } from "../core/errors";
import { readVisualAssetPreviewSource } from "./visualAssetReview";
import { encodeVisualAssetPreview, type VisualAssetCrop } from "./visualAssetPreviewBackend";

export async function createVisualAssetPreview(
  root: string,
  relativePath: string,
  cropInput: Partial<VisualAssetCrop> = {},
) {
  const crop = validateCrop(cropInput);
  const source = readVisualAssetPreviewSource(root, relativePath);
  if (crop && (crop.cropX > source.metadata.width - crop.cropWidth ||
      crop.cropY > source.metadata.height - crop.cropHeight)) {
    throw new AgentHarnessError("INVALID_INPUT", "Crop must fit completely inside the source image.");
  }
  const preview = await encodeVisualAssetPreview(source.buffer, source.metadata, crop);
  source.assertUnchanged();
  return {
    metadata: {
      source: source.metadata,
      preview: {
        mimeType: "image/png" as const,
        format: "png" as const,
        bytes: preview.buffer.length,
        sha256: createHash("sha256").update(preview.buffer).digest("hex"),
        width: preview.width,
        height: preview.height,
        pixels: preview.width * preview.height,
      },
      derivedFromSourceSha256: source.metadata.sha256,
      crop,
    },
    imageBase64: preview.buffer.toString("base64"),
  };
}

function validateCrop(input: Partial<VisualAssetCrop>): VisualAssetCrop | null {
  const fields = ["cropX", "cropY", "cropWidth", "cropHeight"] as const;
  const values = fields.map((field) => input[field]);
  if (values.every((value) => value === undefined)) return null;
  if (values.some((value) => !Number.isSafeInteger(value))) {
    throw new AgentHarnessError("INVALID_INPUT", "Crop requires all four fields as safe integers.");
  }
  const crop = Object.fromEntries(fields.map((field) => [field, input[field]])) as unknown as VisualAssetCrop;
  if (crop.cropX < 0 || crop.cropY < 0 || crop.cropWidth <= 0 || crop.cropHeight <= 0) {
    throw new AgentHarnessError("INVALID_INPUT", "Crop X/Y must be nonnegative and width/height must be positive.");
  }
  return crop;
}
