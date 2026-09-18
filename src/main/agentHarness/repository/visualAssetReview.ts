import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  assertSupportedImageBounds,
  inspectSupportedImageBytes,
  SupportedImageValidationError,
  type DetectedSupportedImage,
  type SupportedImageMimeType,
} from "../../supportedImageValidation";
import { AgentHarnessError } from "../core/errors";
import { isPathInside, resolveRepositoryPath } from "./pathPolicy";

export const VISUAL_ASSET_MAX_BYTES = 15_000_000;
export const VISUAL_ASSET_MAX_WIDTH = 8192;
export const VISUAL_ASSET_MAX_HEIGHT = 8192;
export const VISUAL_ASSET_MAX_PIXELS = 40_000_000;
export const VISUAL_ASSET_COMPARE_MAX_IMAGES = 6;
export const VISUAL_ASSET_COMPARE_MAX_BYTES = 45_000_000;
export const VISUAL_ASSET_COMPARE_MAX_PIXELS = 100_000_000;

export type VisualAssetFormat = "png" | "jpeg" | "webp";
export type VisualAssetFormatFact = "present" | "absent" | "unknown";

export interface VisualAssetMetadata {
  relativePath: string;
  mimeType: SupportedImageMimeType;
  format: VisualAssetFormat;
  extension: string | null;
  bytes: number;
  sha256: string;
  width: number;
  height: number;
  pixels: number;
  alphaCapability: VisualAssetFormatFact;
  iccProfilePresent: boolean | "unknown";
}

export interface VisualAssetImageReadResult {
  metadata: VisualAssetMetadata;
  imageBase64: string;
  canonicalIdentity: string;
}

export interface VisualAssetComparisonResult {
  images: VisualAssetMetadata[];
  imageContents: Array<{ data: string; mimeType: SupportedImageMimeType }>;
}

interface BoundedFileRead {
  buffer: Buffer;
  canonicalIdentity: string;
}

interface ValidatedVisualAssetRead extends BoundedFileRead {
  metadata: VisualAssetMetadata;
}

const KNOWN_IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "avif",
  "heic",
  "heif",
]);

export function readVisualAssetImage(root: string, relativePath: string): VisualAssetImageReadResult {
  const read = readValidatedVisualAsset(root, relativePath);
  return {
    metadata: read.metadata,
    imageBase64: read.buffer.toString("base64"),
    canonicalIdentity: read.canonicalIdentity,
  };
}

export function inspectVisualAssetImage(root: string, relativePath: string): VisualAssetMetadata {
  return readValidatedVisualAsset(root, relativePath).metadata;
}

export function compareVisualAssetImages(root: string, relativePaths: string[]): VisualAssetComparisonResult {
  if (relativePaths.length < 2 || relativePaths.length > VISUAL_ASSET_COMPARE_MAX_IMAGES) {
    throw new AgentHarnessError(
      "INVALID_INPUT",
      "relativePaths must contain between 2 and 6 repository-relative image paths.",
    );
  }

  const reads = relativePaths.map((relativePath) => readValidatedVisualAsset(root, relativePath));
  const identities = new Set<string>();
  let aggregateBytes = 0;
  let aggregatePixels = 0;
  for (const read of reads) {
    if (identities.has(read.canonicalIdentity)) {
      throw new AgentHarnessError(
        "INVALID_INPUT",
        "compare_images does not allow duplicate canonical file identities.",
      );
    }
    identities.add(read.canonicalIdentity);
    aggregateBytes += read.metadata.bytes;
    aggregatePixels += read.metadata.pixels;
  }
  if (aggregateBytes > VISUAL_ASSET_COMPARE_MAX_BYTES) {
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Compared images exceed the 45,000,000-byte aggregate limit.",
    );
  }
  if (aggregatePixels > VISUAL_ASSET_COMPARE_MAX_PIXELS) {
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Compared images exceed the 100,000,000-pixel aggregate limit.",
    );
  }

  return {
    images: reads.map((read) => read.metadata),
    imageContents: reads.map((read) => ({
      data: read.buffer.toString("base64"),
      mimeType: read.metadata.mimeType,
    })),
  };
}

function readValidatedVisualAsset(root: string, relativePath: string): ValidatedVisualAssetRead {
  const resolved = resolveRepositoryPath(root, relativePath);
  assertNoLinkComponents(resolved.rootRealPath, resolved.requestedPath, resolved.relativePath);
  const boundedRead = readBoundedRegularFile(
    resolved.rootRealPath,
    resolved.resolvedPath,
    resolved.relativePath,
  );
  const detected = inspectVisualAsset(boundedRead.buffer, resolved.relativePath);
  const extension = requestedExtension(resolved.relativePath);
  assertExtensionMatches(extension, detected, resolved.relativePath);
  assertVisualAssetBounds(detected, resolved.relativePath);
  const facts = inspectFormatFacts(boundedRead.buffer, detected);
  const metadata: VisualAssetMetadata = {
    relativePath: resolved.relativePath,
    mimeType: detected.mimeType,
    format: detectedFormat(detected),
    extension,
    bytes: boundedRead.buffer.length,
    sha256: createHash("sha256").update(boundedRead.buffer).digest("hex"),
    width: detected.width,
    height: detected.height,
    pixels: detected.pixels,
    ...facts,
  };
  return {
    metadata,
    buffer: boundedRead.buffer,
    canonicalIdentity: boundedRead.canonicalIdentity,
  };
}

function assertNoLinkComponents(rootRealPath: string, requestedPath: string, relativePath: string): void {
  const tail = path.relative(rootRealPath, requestedPath);
  let current = rootRealPath;
  for (const segment of tail.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let entry: fs.Stats;
    try {
      entry = fs.lstatSync(current);
    } catch {
      throw new AgentHarnessError("FILE_DENIED", "Requested image does not exist.", { relativePath });
    }
    if (entry.isSymbolicLink()) {
      throw new AgentHarnessError(
        "FILE_DENIED",
        "Visual asset paths must not contain symbolic links, junctions, or reparse-point links.",
        { relativePath },
      );
    }
  }
}

function readBoundedRegularFile(
  rootRealPath: string,
  absolutePath: string,
  relativePath: string,
): BoundedFileRead {
  let descriptor: number | undefined;
  try {
    const pathEntry = fs.lstatSync(absolutePath, { bigint: true });
    if (!pathEntry.isFile() || pathEntry.isSymbolicLink()) {
      throw new AgentHarnessError("FILE_DENIED", "Visual assets must be regular non-link files.", {
        relativePath,
      });
    }
    assertCurrentRealPathContained(rootRealPath, absolutePath, relativePath);
    descriptor = fs.openSync(absolutePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) {
      throw new AgentHarnessError("FILE_DENIED", "Visual assets must be regular files.", { relativePath });
    }
    if (!sameFileIdentity(pathEntry, before)) {
      throw new AgentHarnessError("FILE_DENIED", "Visual asset identity changed before it could be read.", {
        relativePath,
      });
    }
    if (before.size === 0n || before.size > BigInt(VISUAL_ASSET_MAX_BYTES)) {
      throw new AgentHarnessError(
        "FILE_DENIED",
        "Visual asset is empty or exceeds the 15,000,000-byte limit.",
        { relativePath },
      );
    }

    const buffer = Buffer.alloc(Number(before.size));
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = fs.readSync(descriptor, buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (count === 0) {
        break;
      }
      bytesRead += count;
    }
    const after = fs.fstatSync(descriptor, { bigint: true });
    const currentPathEntry = fs.lstatSync(absolutePath, { bigint: true });
    if (
      bytesRead !== buffer.length ||
      !sameFileIdentity(before, after) ||
      !sameFileIdentity(after, currentPathEntry) ||
      after.size !== before.size ||
      after.mtimeNs !== before.mtimeNs ||
      after.ctimeNs !== before.ctimeNs
    ) {
      throw new AgentHarnessError("FILE_DENIED", "Visual asset changed while it was being read.", {
        relativePath,
      });
    }
    assertCurrentRealPathContained(rootRealPath, absolutePath, relativePath);
    return {
      buffer,
      canonicalIdentity: canonicalIdentity(after, absolutePath),
    };
  } catch (error) {
    if (error instanceof AgentHarnessError) {
      throw error;
    }
    throw new AgentHarnessError("FILE_DENIED", "Visual asset could not be read safely.", { relativePath });
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
  }
}

function assertCurrentRealPathContained(
  rootRealPath: string,
  absolutePath: string,
  relativePath: string,
): void {
  const currentRealPath = fs.realpathSync.native(absolutePath);
  if (!isPathInside(currentRealPath, rootRealPath)) {
    throw new AgentHarnessError(
      "PATH_DENIED",
      "Visual asset resolution escaped the selected repository root.",
      { relativePath },
    );
  }
}

function sameFileIdentity(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function canonicalIdentity(stat: fs.BigIntStats, absolutePath: string): string {
  if (stat.ino !== 0n) {
    return `${stat.dev.toString()}:${stat.ino.toString()}`;
  }
  const resolved = fs.realpathSync.native(absolutePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function inspectVisualAsset(buffer: Buffer, relativePath: string): DetectedSupportedImage {
  try {
    return inspectSupportedImageBytes(buffer, VISUAL_ASSET_MAX_BYTES);
  } catch (error) {
    if (error instanceof SupportedImageValidationError && error.failure === "empty-or-oversized") {
      throw new AgentHarnessError(
        "FILE_DENIED",
        "Visual asset is empty or exceeds the 15,000,000-byte limit.",
        { relativePath },
      );
    }
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Visual asset bytes are not a supported PNG, JPEG, or WEBP image.",
      { relativePath },
    );
  }
}

function assertVisualAssetBounds(image: DetectedSupportedImage, relativePath: string): void {
  try {
    assertSupportedImageBounds(image, {
      maxDecodedBytesPerImage: VISUAL_ASSET_MAX_BYTES,
      maxWidth: VISUAL_ASSET_MAX_WIDTH,
      maxHeight: VISUAL_ASSET_MAX_HEIGHT,
      maxPixelsPerImage: VISUAL_ASSET_MAX_PIXELS,
    });
  } catch {
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Visual asset dimensions exceed the 8192 x 8192 or 40,000,000-pixel limits.",
      { relativePath },
    );
  }
}

function requestedExtension(relativePath: string): string | null {
  const extension = path.posix.extname(relativePath).slice(1).toLowerCase();
  return extension || null;
}

function assertExtensionMatches(
  extension: string | null,
  image: DetectedSupportedImage,
  relativePath: string,
): void {
  if (!extension || !KNOWN_IMAGE_EXTENSIONS.has(extension)) {
    return;
  }
  const format = detectedFormat(image);
  const matches = format === "png"
    ? extension === "png"
    : format === "jpeg"
      ? extension === "jpg" || extension === "jpeg"
      : extension === "webp";
  if (!matches) {
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Visual asset extension does not match the detected image format.",
      { relativePath },
    );
  }
}

function detectedFormat(image: DetectedSupportedImage): VisualAssetFormat {
  if (image.mimeType === "image/png") return "png";
  if (image.mimeType === "image/jpeg") return "jpeg";
  return "webp";
}

function inspectFormatFacts(
  buffer: Buffer,
  image: DetectedSupportedImage,
): Pick<VisualAssetMetadata, "alphaCapability" | "iccProfilePresent"> {
  if (image.mimeType === "image/png") {
    return inspectPngFacts(buffer);
  }
  if (image.mimeType === "image/jpeg") {
    return { alphaCapability: "absent", iccProfilePresent: jpegHasIccProfile(buffer) };
  }
  return inspectWebpFacts(buffer);
}

function inspectPngFacts(buffer: Buffer): Pick<VisualAssetMetadata, "alphaCapability" | "iccProfilePresent"> {
  const colorType = buffer[25];
  let transparencyChunkPresent = false;
  let iccProfilePresent = false;
  for (let offset = 8; offset + 12 <= buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const next = offset + 12 + length;
    if (next > buffer.length) break;
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "tRNS") transparencyChunkPresent = true;
    if (type === "iCCP") iccProfilePresent = true;
    offset = next;
  }
  return {
    alphaCapability: colorType === 4 || colorType === 6 || transparencyChunkPresent ? "present" : "absent",
    iccProfilePresent,
  };
}

function jpegHasIccProfile(buffer: Buffer): boolean {
  for (let offset = 2; offset + 4 <= buffer.length;) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xda || offset + 4 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) break;
    if (marker === 0xe2 && buffer.toString("ascii", offset + 4, offset + 16) === "ICC_PROFILE\0") {
      return true;
    }
    offset += 2 + segmentLength;
  }
  return false;
}

function inspectWebpFacts(buffer: Buffer): Pick<VisualAssetMetadata, "alphaCapability" | "iccProfilePresent"> {
  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X" && buffer.length >= 21) {
    const flags = buffer[20];
    return {
      alphaCapability: (flags & 0x10) !== 0 ? "present" : "absent",
      iccProfilePresent: (flags & 0x20) !== 0,
    };
  }
  if (chunkType === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      alphaCapability: (bits & 0x10000000) !== 0 ? "present" : "absent",
      iccProfilePresent: false,
    };
  }
  if (chunkType === "VP8 ") {
    return { alphaCapability: "absent", iccProfilePresent: false };
  }
  return { alphaCapability: "unknown", iccProfilePresent: "unknown" };
}
