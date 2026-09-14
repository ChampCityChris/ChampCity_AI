import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import {
  assertSupportedImageBounds,
  inspectSupportedImageBytes,
  SupportedImageValidationError,
} from "../../supportedImageValidation";
import { isPathInside, resolveRepositoryPath } from "./pathPolicy";

const MAX_IMAGE_BYTES = 5_000_000;
const MAX_IMAGE_WIDTH = 4096;
const MAX_IMAGE_HEIGHT = 4096;
const MAX_IMAGE_PIXELS = 12_000_000;

type SupportedImageMime = "image/png" | "image/jpeg" | "image/webp";

export interface AttachedImageWriteInput {
  relativePath: string;
  base64: string;
  mimeType: string;
}

export interface AttachedImageWriteResult {
  relativePath: string;
  bytes: number;
  mimeType: SupportedImageMime;
  extension: string;
  width: number;
  height: number;
  pixels: number;
}

export function writeAttachedImage(root: string, input: AttachedImageWriteInput): AttachedImageWriteResult {
  const buffer = Buffer.from(input.base64, "base64");
  const detected = inspectAttachedImage(buffer);
  if (input.mimeType !== detected.mimeType) {
    throw new AgentHarnessError("FILE_DENIED", "Attached image MIME type does not match the image bytes.");
  }
  assertExtensionMatches(input.relativePath, detected.mimeType);
  assertAttachedImageBounds(detected);

  const resolved = resolveRepositoryPath(root, input.relativePath, { allowMissingLeaf: true });
  if (fs.existsSync(resolved.resolvedPath)) {
    throw new AgentHarnessError("FILE_DENIED", "Attached image destination already exists.", {
      relativePath: resolved.relativePath,
    });
  }

  fs.mkdirSync(path.dirname(resolved.resolvedPath), { recursive: true });
  const parentRealPath = fs.realpathSync.native(path.dirname(resolved.resolvedPath));
  if (!isPathInside(parentRealPath, resolved.rootRealPath)) {
    throw new AgentHarnessError("PATH_DENIED", "Attached image destination escapes the selected project.");
  }

  fs.writeFileSync(resolved.resolvedPath, buffer, { flag: "wx" });
  return {
    relativePath: resolved.relativePath,
    bytes: buffer.length,
    mimeType: detected.mimeType,
    extension: path.extname(resolved.relativePath).toLowerCase(),
    width: detected.width,
    height: detected.height,
    pixels: detected.width * detected.height,
  };
}

function inspectAttachedImage(buffer: Buffer) {
  try {
    return inspectSupportedImageBytes(buffer, MAX_IMAGE_BYTES);
  } catch (error) {
    if (error instanceof SupportedImageValidationError && error.failure === "empty-or-oversized") {
      throw new AgentHarnessError("FILE_DENIED", "Attached image exceeds the write limit or is empty.");
    }
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Attached image bytes are not a supported PNG, JPEG, or WEBP image.",
    );
  }
}

function assertExtensionMatches(relativePath: string, mimeType: SupportedImageMime): void {
  const extension = path.extname(relativePath).toLowerCase();
  if (
    (mimeType === "image/png" && extension !== ".png") ||
    (mimeType === "image/jpeg" && extension !== ".jpg" && extension !== ".jpeg") ||
    (mimeType === "image/webp" && extension !== ".webp")
  ) {
    throw new AgentHarnessError("FILE_DENIED", "Attached image extension does not match the detected image format.");
  }
}

function assertAttachedImageBounds(image: ReturnType<typeof inspectSupportedImageBytes>): void {
  try {
    assertSupportedImageBounds(image, {
      maxDecodedBytesPerImage: MAX_IMAGE_BYTES,
      maxWidth: MAX_IMAGE_WIDTH,
      maxHeight: MAX_IMAGE_HEIGHT,
      maxPixelsPerImage: MAX_IMAGE_PIXELS,
    });
  } catch {
    throw new AgentHarnessError("FILE_DENIED", "Attached image dimensions exceed the write limits.");
  }
}
