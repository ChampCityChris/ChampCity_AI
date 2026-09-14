export type SupportedImageMimeType = "image/png" | "image/jpeg" | "image/webp";

export interface SupportedImageValidationPolicy {
  maxDecodedBytesPerImage: number;
  maxWidth: number;
  maxHeight: number;
  maxPixelsPerImage: number;
}

export interface DetectedSupportedImage {
  mimeType: SupportedImageMimeType;
  extension: "png" | "jpg" | "webp";
  width: number;
  height: number;
  pixels: number;
}

export type SupportedImageValidationFailure =
  | "empty-or-oversized"
  | "unsupported-format"
  | "dimensions-out-of-bounds";

export class SupportedImageValidationError extends Error {
  readonly failure: SupportedImageValidationFailure;

  constructor(failure: SupportedImageValidationFailure, message: string) {
    super(message);
    this.name = "SupportedImageValidationError";
    this.failure = failure;
  }
}

export function inspectSupportedImageBytes(
  buffer: Buffer,
  maxDecodedBytes: number,
): DetectedSupportedImage {
  if (buffer.length === 0 || buffer.length > maxDecodedBytes) {
    throw new SupportedImageValidationError(
      "empty-or-oversized",
      "Image bytes exceed the decoded-byte limit or are empty.",
    );
  }

  const detected = detectPng(buffer) ?? detectJpeg(buffer) ?? detectWebp(buffer);
  if (!detected) {
    throw new SupportedImageValidationError(
      "unsupported-format",
      "Image bytes are not a supported PNG, JPEG, or WEBP image.",
    );
  }
  return {
    ...detected,
    pixels: detected.width * detected.height,
  };
}

export function assertSupportedImageBounds(
  image: DetectedSupportedImage,
  policy: SupportedImageValidationPolicy,
): void {
  if (
    image.width < 1 ||
    image.height < 1 ||
    image.width > policy.maxWidth ||
    image.height > policy.maxHeight ||
    image.pixels > policy.maxPixelsPerImage
  ) {
    throw new SupportedImageValidationError(
      "dimensions-out-of-bounds",
      "Image dimensions exceed the supported bounds.",
    );
  }
}

function detectPng(buffer: Buffer): Omit<DetectedSupportedImage, "pixels"> | null {
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
    extension: "png",
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function detectJpeg(buffer: Buffer): Omit<DetectedSupportedImage, "pixels"> | null {
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
        extension: "jpg",
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
}

function detectWebp(buffer: Buffer): Omit<DetectedSupportedImage, "pixels"> | null {
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
      extension: "webp",
      width: 1 + readUInt24LE(buffer, 24),
      height: 1 + readUInt24LE(buffer, 27),
    };
  }
  if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      mimeType: "image/webp",
      extension: "webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      mimeType: "image/webp",
      extension: "webp",
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
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
