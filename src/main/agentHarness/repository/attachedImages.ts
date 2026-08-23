import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../core/errors";
import { isPathInside, resolveRepositoryPath } from "./pathPolicy";

const MAX_IMAGE_BYTES = 5_000_000;
const MAX_IMAGE_WIDTH = 4096;
const MAX_IMAGE_HEIGHT = 4096;
const MAX_IMAGE_PIXELS = 12_000_000;

type SupportedImageMime = "image/png" | "image/jpeg" | "image/webp";

interface DetectedImage {
  mimeType: SupportedImageMime;
  extension: ".png" | ".jpg" | ".jpeg" | ".webp";
  width: number;
  height: number;
}

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
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new AgentHarnessError("FILE_DENIED", "Attached image exceeds the write limit or is empty.");
  }

  const detected = detectImage(buffer);
  if (input.mimeType !== detected.mimeType) {
    throw new AgentHarnessError("FILE_DENIED", "Attached image MIME type does not match the image bytes.");
  }
  assertExtensionMatches(input.relativePath, detected.mimeType);
  assertImageBounds(detected);

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

function detectImage(buffer: Buffer): DetectedImage {
  return detectPng(buffer) ?? detectJpeg(buffer) ?? detectWebp(buffer) ?? rejectInvalidImage();
}

function detectPng(buffer: Buffer): DetectedImage | null {
  if (
    buffer.length < 33 ||
    buffer.readUInt32BE(0) !== 0x89504e47 ||
    buffer.readUInt32BE(4) !== 0x0d0a1a0a ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }
  return {
    mimeType: "image/png",
    extension: ".png",
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function detectJpeg(buffer: Buffer): DetectedImage | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }
    if (offset + 2 > buffer.length) {
      return null;
    }
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      return null;
    }
    if (isStartOfFrameMarker(marker) && segmentLength >= 7) {
      return {
        mimeType: "image/jpeg",
        extension: ".jpg",
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
}

function detectWebp(buffer: Buffer): DetectedImage | null {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }
  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X" && buffer.length >= 30) {
    return {
      mimeType: "image/webp",
      extension: ".webp",
      width: 1 + readUInt24LE(buffer, 24),
      height: 1 + readUInt24LE(buffer, 27),
    };
  }
  if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      mimeType: "image/webp",
      extension: ".webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      mimeType: "image/webp",
      extension: ".webp",
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
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

function assertImageBounds(image: DetectedImage): void {
  if (
    image.width < 1 ||
    image.height < 1 ||
    image.width > MAX_IMAGE_WIDTH ||
    image.height > MAX_IMAGE_HEIGHT ||
    image.width * image.height > MAX_IMAGE_PIXELS
  ) {
    throw new AgentHarnessError("FILE_DENIED", "Attached image dimensions exceed the write limits.");
  }
}

function isStartOfFrameMarker(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function rejectInvalidImage(): never {
  throw new AgentHarnessError("FILE_DENIED", "Attached image bytes are not a supported PNG, JPEG, or WEBP image.");
}
