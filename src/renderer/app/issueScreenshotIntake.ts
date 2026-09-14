import {
  issueScreenshotEvidenceMimeTypes,
  issueScreenshotEvidencePolicy,
  type IssueScreenshotEvidenceInput,
  type IssueScreenshotEvidenceMimeType,
  type NewIssueInput,
} from "../../shared/issueResolutionContracts";

export interface ClipboardImageCandidate {
  advertisedMimeType: string;
  blob: Blob | null;
}

export interface ClipboardImageSelection {
  candidates: ClipboardImageCandidate[];
  shouldHandle: boolean;
}

export type ScreenshotPasteAdmission =
  | { kind: "native-text-paste" }
  | { kind: "blocked-during-create"; feedback: string }
  | { kind: "admit-image"; candidates: readonly ClipboardImageCandidate[] };

export const screenshotPasteBlockedDuringCreateFeedback =
  "Screenshot paste is paused while Issue creation finishes. Paste the screenshot again after Issue creation finishes.";

export interface PendingIssueScreenshot {
  id: string;
  mimeType: IssueScreenshotEvidenceMimeType;
  base64: string;
  sourceByteCount: number;
  width: number;
  height: number;
  previewUrl: string;
}

interface ClipboardFileItem {
  kind: string;
  type: string;
  getAsFile: () => File | null;
}

interface ScreenshotDimensions {
  width: number;
  height: number;
}

interface ScreenshotPasteDependencies {
  readDimensions: (blob: Blob) => Promise<ScreenshotDimensions>;
  encodeBase64: (blob: Blob) => Promise<string>;
  createPreviewUrl: (blob: Blob) => string;
  revokePreviewUrl: (previewUrl: string) => void;
  makeId: () => string;
}

const supportedMimeTypes = new Set<string>(issueScreenshotEvidenceMimeTypes);

function isAdvertisedImageMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("image/");
}

function clipboardCandidateFromItem(item: ClipboardFileItem): ClipboardImageCandidate | null {
  const advertisesImage = isAdvertisedImageMimeType(item.type);
  if (item.kind !== "file" && !advertisesImage) {
    return null;
  }

  let blob: File | null = null;
  if (item.kind === "file") {
    try {
      blob = item.getAsFile();
    } catch {
      blob = null;
    }
  }

  if (!advertisesImage && !blob?.type.toLowerCase().startsWith("image/")) {
    return null;
  }

  return {
    advertisedMimeType: item.type,
    blob,
  };
}

export function inspectClipboardImageData(
  items: ArrayLike<ClipboardFileItem>,
  files: ArrayLike<File>,
): ClipboardImageSelection {
  const candidates = Array.from(items)
    .map(clipboardCandidateFromItem)
    .filter((candidate): candidate is ClipboardImageCandidate => candidate !== null);

  if (candidates.length > 0) {
    return { candidates, shouldHandle: true };
  }

  const fileCandidates = Array.from(files)
    .filter((file) => file.type.toLowerCase().startsWith("image/"))
    .map((file) => ({ advertisedMimeType: file.type, blob: file }));
  return {
    candidates: fileCandidates,
    shouldHandle: fileCandidates.length > 0,
  };
}

export function decideScreenshotPasteAdmission(
  selection: ClipboardImageSelection,
  createInFlight: boolean,
): ScreenshotPasteAdmission {
  if (!selection.shouldHandle) {
    return { kind: "native-text-paste" };
  }
  if (createInFlight) {
    return {
      kind: "blocked-during-create",
      feedback: screenshotPasteBlockedDuringCreateFeedback,
    };
  }
  return { kind: "admit-image", candidates: selection.candidates };
}

export async function readClipboardImageDimensions(blob: Blob): Promise<ScreenshotDimensions> {
  const bitmap = await createImageBitmap(blob);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export async function blobToCanonicalBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function describeMimeType(mimeType: string): string {
  return mimeType || "an unknown image format";
}

function ensureSupportedMimeType(
  candidate: ClipboardImageCandidate,
  position: number,
): { blob: Blob; mimeType: IssueScreenshotEvidenceMimeType } {
  if (!candidate.blob) {
    throw new Error(`Screenshot ${position} could not be read from the clipboard.`);
  }
  if (!supportedMimeTypes.has(candidate.blob.type)) {
    throw new Error(
      `Screenshot ${position} uses unsupported format ${describeMimeType(candidate.blob.type)}. Paste PNG, JPEG, or WEBP.`,
    );
  }
  return {
    blob: candidate.blob,
    mimeType: candidate.blob.type as IssueScreenshotEvidenceMimeType,
  };
}

function validateDimensions(dimensions: ScreenshotDimensions, position: number): void {
  const { width, height } = dimensions;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Screenshot ${position} did not decode to valid image dimensions.`);
  }
  if (width > issueScreenshotEvidencePolicy.maxWidth) {
    throw new Error(
      `Screenshot ${position} is ${width}px wide; the maximum is ${issueScreenshotEvidencePolicy.maxWidth}px.`,
    );
  }
  if (height > issueScreenshotEvidencePolicy.maxHeight) {
    throw new Error(
      `Screenshot ${position} is ${height}px high; the maximum is ${issueScreenshotEvidencePolicy.maxHeight}px.`,
    );
  }
  if (width * height > issueScreenshotEvidencePolicy.maxPixelsPerImage) {
    throw new Error(
      `Screenshot ${position} exceeds the ${issueScreenshotEvidencePolicy.maxPixelsPerImage.toLocaleString()}-pixel limit.`,
    );
  }
}

function isCanonicalBase64(base64: string): boolean {
  return base64.length > 0 && base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64);
}

export async function prepareScreenshotPaste(
  existing: readonly PendingIssueScreenshot[],
  candidates: readonly ClipboardImageCandidate[],
  dependencies: ScreenshotPasteDependencies,
): Promise<PendingIssueScreenshot[]> {
  if (candidates.length === 0) {
    throw new Error("No readable screenshot image was found on the clipboard.");
  }
  if (existing.length + candidates.length > issueScreenshotEvidencePolicy.maxCount) {
    throw new Error(
      `A maximum of ${issueScreenshotEvidencePolicy.maxCount} screenshots can be pending. Remove one before pasting more.`,
    );
  }

  const normalized: Array<{
    blob: Blob;
    mimeType: IssueScreenshotEvidenceMimeType;
    position: number;
  }> = [];
  let aggregateByteCount = existing.reduce(
    (total, screenshot) => total + screenshot.sourceByteCount,
    0,
  );

  for (const [index, candidate] of candidates.entries()) {
    const position = existing.length + index + 1;
    const { blob, mimeType } = ensureSupportedMimeType(candidate, position);
    if (blob.size <= 0) {
      throw new Error(`Screenshot ${position} is empty or unreadable.`);
    }
    if (blob.size > issueScreenshotEvidencePolicy.maxDecodedBytesPerImage) {
      throw new Error(
        `Screenshot ${position} is larger than the ${issueScreenshotEvidencePolicy.maxDecodedBytesPerImage.toLocaleString()}-byte limit.`,
      );
    }
    aggregateByteCount += blob.size;
    if (aggregateByteCount > issueScreenshotEvidencePolicy.maxAggregateDecodedBytes) {
      throw new Error(
        `Pending screenshots would exceed the ${issueScreenshotEvidencePolicy.maxAggregateDecodedBytes.toLocaleString()}-byte aggregate limit.`,
      );
    }
    normalized.push({ blob, mimeType, position });
  }

  const converted: Array<{
    blob: Blob;
    mimeType: IssueScreenshotEvidenceMimeType;
    sourceByteCount: number;
    width: number;
    height: number;
    base64: string;
  }> = [];
  for (const candidate of normalized) {
    let dimensions: ScreenshotDimensions;
    try {
      dimensions = await dependencies.readDimensions(candidate.blob);
    } catch {
      throw new Error(`Screenshot ${candidate.position} could not be decoded as a valid image.`);
    }
    validateDimensions(dimensions, candidate.position);

    let base64: string;
    try {
      base64 = await dependencies.encodeBase64(candidate.blob);
    } catch {
      throw new Error(`Screenshot ${candidate.position} could not be converted for submission.`);
    }
    if (!isCanonicalBase64(base64)) {
      throw new Error(`Screenshot ${candidate.position} could not be converted to canonical base64.`);
    }
    converted.push({
      blob: candidate.blob,
      mimeType: candidate.mimeType,
      sourceByteCount: candidate.blob.size,
      width: dimensions.width,
      height: dimensions.height,
      base64,
    });
  }

  const previewUrls: string[] = [];
  try {
    return converted.map((candidate) => {
      const previewUrl = dependencies.createPreviewUrl(candidate.blob);
      previewUrls.push(previewUrl);
      return {
        id: dependencies.makeId(),
        mimeType: candidate.mimeType,
        base64: candidate.base64,
        sourceByteCount: candidate.sourceByteCount,
        width: candidate.width,
        height: candidate.height,
        previewUrl,
      };
    });
  } catch {
    for (const previewUrl of previewUrls) {
      dependencies.revokePreviewUrl(previewUrl);
    }
    throw new Error("Screenshot previews could not be prepared.");
  }
}

export function removePendingScreenshot(
  pending: readonly PendingIssueScreenshot[],
  screenshotId: string,
): PendingIssueScreenshot[] {
  return pending.filter((screenshot) => screenshot.id !== screenshotId);
}

export function toScreenshotEvidenceInputs(
  pending: readonly PendingIssueScreenshot[],
): IssueScreenshotEvidenceInput[] {
  return pending.map(({ mimeType, base64 }) => ({ mimeType, base64 }));
}

export function buildNewIssueSubmission(
  input: NewIssueInput,
  pending: readonly PendingIssueScreenshot[],
): NewIssueInput {
  const { screenshots: _discardedScreenshots, ...textInput } = input;
  if (pending.length === 0) {
    return textInput;
  }
  return {
    ...textInput,
    screenshots: toScreenshotEvidenceInputs(pending),
  };
}

export async function submitIssueAndResetOnSuccess(
  input: NewIssueInput,
  createIssue: (input: NewIssueInput) => Promise<void>,
  resetOnSuccess: () => void,
): Promise<void> {
  await createIssue(input);
  resetOnSuccess();
}
