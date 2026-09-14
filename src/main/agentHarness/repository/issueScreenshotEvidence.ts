import { createHash } from "node:crypto";
import fs from "node:fs";
import { AgentHarnessError } from "../core/errors";
import {
  assertSupportedImageBounds,
  inspectSupportedImageBytes,
  SupportedImageValidationError,
  type SupportedImageMimeType,
} from "../../supportedImageValidation";
import { resolveRepositoryPath } from "./pathPolicy";

const MAX_ISSUE_SCREENSHOT_BYTES = 5_000_000;
const MAX_ISSUE_SCREENSHOT_WIDTH = 4096;
const MAX_ISSUE_SCREENSHOT_HEIGHT = 4096;
const MAX_ISSUE_SCREENSHOT_PIXELS = 12_000_000;
const ISSUE_SCREENSHOT_PATH_PATTERN = /^issues\/ISSUE_\d+\/evidence\/screenshot-\d{3}\.(png|jpg|webp)$/;

export interface IssueScreenshotEvidenceMetadata {
  relativePath: string;
  mimeType: SupportedImageMimeType;
  bytes: number;
  sha256: string;
  width: number;
  height: number;
  pixels: number;
}

export interface IssueScreenshotEvidenceReadResult extends IssueScreenshotEvidenceMetadata {
  imageBase64: string;
}

export function readIssueScreenshotEvidence(
  root: string,
  relativePath: string,
): IssueScreenshotEvidenceReadResult {
  const resolved = resolveRepositoryPath(root, relativePath);
  const pathMatch = ISSUE_SCREENSHOT_PATH_PATTERN.exec(resolved.relativePath);
  if (!pathMatch) {
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Only persisted Issue screenshot evidence can be read by this action.",
      { relativePath: resolved.relativePath },
    );
  }

  const buffer = readBoundedRegularFile(resolved.resolvedPath, resolved.relativePath);
  const detected = inspectIssueScreenshot(buffer);
  if (pathMatch[1] !== detected.extension) {
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Issue screenshot extension does not match the detected image format.",
      { relativePath: resolved.relativePath },
    );
  }
  assertIssueScreenshotBounds(detected);

  return {
    relativePath: resolved.relativePath,
    mimeType: detected.mimeType,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    width: detected.width,
    height: detected.height,
    pixels: detected.pixels,
    imageBase64: buffer.toString("base64"),
  };
}

function readBoundedRegularFile(absolutePath: string, relativePath: string): Buffer {
  const initial = fs.statSync(absolutePath);
  if (!initial.isFile()) {
    throw new AgentHarnessError("FILE_DENIED", "Issue screenshot evidence must be a regular file.", {
      relativePath,
    });
  }
  const descriptor = fs.openSync(absolutePath, "r");
  try {
    const before = fs.fstatSync(descriptor);
    if (!before.isFile()) {
      throw new AgentHarnessError("FILE_DENIED", "Issue screenshot evidence must be a regular file.", {
        relativePath,
      });
    }
    if (before.size === 0 || before.size > MAX_ISSUE_SCREENSHOT_BYTES) {
      throw new AgentHarnessError(
        "FILE_DENIED",
        "Issue screenshot evidence is empty or exceeds the 5,000,000-byte limit.",
        { relativePath },
      );
    }

    const buffer = Buffer.alloc(before.size);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = fs.readSync(descriptor, buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (count === 0) {
        break;
      }
      bytesRead += count;
    }
    const after = fs.fstatSync(descriptor);
    if (bytesRead !== buffer.length || after.size !== before.size) {
      throw new AgentHarnessError("FILE_DENIED", "Issue screenshot evidence changed while it was being read.", {
        relativePath,
      });
    }
    return buffer;
  } finally {
    fs.closeSync(descriptor);
  }
}

function inspectIssueScreenshot(buffer: Buffer): ReturnType<typeof inspectSupportedImageBytes> {
  try {
    return inspectSupportedImageBytes(buffer, MAX_ISSUE_SCREENSHOT_BYTES);
  } catch (error) {
    if (error instanceof SupportedImageValidationError && error.failure === "empty-or-oversized") {
      throw new AgentHarnessError(
        "FILE_DENIED",
        "Issue screenshot evidence is empty or exceeds the 5,000,000-byte limit.",
      );
    }
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Issue screenshot bytes are not a supported PNG, JPEG, or WEBP image.",
    );
  }
}

function assertIssueScreenshotBounds(image: ReturnType<typeof inspectSupportedImageBytes>): void {
  try {
    assertSupportedImageBounds(image, {
      maxDecodedBytesPerImage: MAX_ISSUE_SCREENSHOT_BYTES,
      maxWidth: MAX_ISSUE_SCREENSHOT_WIDTH,
      maxHeight: MAX_ISSUE_SCREENSHOT_HEIGHT,
      maxPixelsPerImage: MAX_ISSUE_SCREENSHOT_PIXELS,
    });
  } catch {
    throw new AgentHarnessError(
      "FILE_DENIED",
      "Issue screenshot dimensions exceed the 4096 x 4096 or 12,000,000-pixel limits.",
    );
  }
}
