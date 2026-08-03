import fs from "node:fs";
import path from "node:path";
import type {
  ArchitectDraftCleanupResult,
  ArchitectDraftInspectionResult,
  ArchitectDraftSlotExpectation,
  ArchitectDraftSlotRead,
  ArchitectDraftSubmission,
  ArchitectDraftSubmissionContext,
  ArchitectDraftSubmissionState,
  ArchitectOutputDefinition,
} from "../../shared/architectOutputs/architectOutputContracts";
import {
  assertArchitectDraftSlotPath,
  assertSafeSubmissionId,
  buildArchitectDraftSubmissionDirectory,
  buildArchitectDraftSlotPath,
} from "./architectDraftPaths";

interface ArchitectDraftCleanupTestHooks {
  failBeforeExpectedDraftDelete?: (draftRelativePath: string) => Error | string | undefined;
}

let cleanupTestHooks: ArchitectDraftCleanupTestHooks = {};

export function __setArchitectDraftCleanupTestHooks(
  hooks: ArchitectDraftCleanupTestHooks = {},
): void {
  cleanupTestHooks = hooks;
}

export function createArchitectDraftSubmission<TSlotId extends string, TSelection, TDomainContext>(
  definition: ArchitectOutputDefinition<TSlotId, TSelection, TDomainContext>,
  context: ArchitectDraftSubmissionContext,
  state: ArchitectDraftSubmissionState = "waiting-for-drafts",
): ArchitectDraftSubmission<TSlotId, TSelection> {
  const submissionId = assertSafeSubmissionId(definition.buildSubmissionId(context));
  const expectedDraftSlots = definition.slots.map((slot): ArchitectDraftSlotExpectation<TSlotId> => ({
    slotId: slot.slotId,
    displayLabel: slot.displayLabel,
    draftRelativePath: buildArchitectDraftSlotPath(submissionId, slot.draftPathComponent),
  }));
  return {
    submissionId,
    outputKind: definition.outputKind,
    owningWorkspaceId: definition.owningWorkspaceId,
    sourceHandoff: context.sourceHandoff,
    expectedDraftSlots,
    promotionGroupId: assertSafeSubmissionId(definition.buildPromotionGroupId(context)),
    state,
  };
}

export function inspectArchitectDraftSubmission<TSlotId extends string>(
  workspaceRoot: string,
  submission: ArchitectDraftSubmission<TSlotId>,
): ArchitectDraftInspectionResult<TSlotId> {
  const resolvedRoot = path.resolve(workspaceRoot);
  const presentSlots: ArchitectDraftSlotRead<TSlotId>[] = [];
  const missingSlots: ArchitectDraftSlotExpectation<TSlotId>[] = [];
  const readErrors: ArchitectDraftInspectionResult<TSlotId>["readErrors"] = [];

  for (const slot of submission.expectedDraftSlots) {
    const draftRelativePath = assertArchitectDraftSlotPath(
      submission.submissionId,
      slot.draftRelativePath,
    );
    const absolutePath = path.resolve(resolvedRoot, draftRelativePath);
    if (!isInside(resolvedRoot, absolutePath)) {
      throw new Error("Architect draft path escapes selected workspace.");
    }
    if (!fs.existsSync(absolutePath)) {
      missingSlots.push(slot);
      continue;
    }
    try {
      presentSlots.push({
        slotId: slot.slotId,
        draftRelativePath,
        bodyMarkdown: fs.readFileSync(absolutePath, "utf8"),
      });
    } catch (error) {
      readErrors.push({ slotId: slot.slotId, message: errorMessage(error) });
    }
  }

  return {
    submission,
    state: terminalState(submission.state) ?? deriveState(presentSlots.length, missingSlots.length, readErrors.length),
    presentSlots,
    missingSlots,
    readErrors,
  };
}

export function cleanupArchitectDraftSubmission<TSlotId extends string>(
  workspaceRoot: string,
  submission: ArchitectDraftSubmission<TSlotId>,
): void {
  const resolvedRoot = path.resolve(workspaceRoot);
  const submissionDirectory = path.resolve(
    resolvedRoot,
    buildArchitectDraftSubmissionDirectory(submission.submissionId),
  );
  if (!isInside(path.resolve(resolvedRoot, "planning", "Architect_Drafts"), submissionDirectory)) {
    throw new Error("Architect draft cleanup requires an exact submission directory under the central draft root.");
  }

  for (const slot of submission.expectedDraftSlots) {
    const draftRelativePath = assertArchitectDraftSlotPath(
      submission.submissionId,
      slot.draftRelativePath,
    );
    const absolutePath = path.resolve(resolvedRoot, draftRelativePath);
    if (!isInside(submissionDirectory, absolutePath)) {
      throw new Error("Architect draft cleanup path escapes the exact submission directory.");
    }
    const injectedError = cleanupTestHooks.failBeforeExpectedDraftDelete?.(draftRelativePath);
    if (injectedError) {
      throw injectedError instanceof Error ? injectedError : new Error(injectedError);
    }
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  try {
    fs.rmdirSync(submissionDirectory);
  } catch (error) {
    if (!isDirectoryNotEmpty(error)) {
      throw error;
    }
  }
}

export function retryArchitectDraftSubmissionCleanup<TSlotId extends string>(
  workspaceRoot: string,
  submission: ArchitectDraftSubmission<TSlotId>,
): ArchitectDraftCleanupResult {
  try {
    cleanupArchitectDraftSubmission(workspaceRoot, submission);
    return { cleanupStatus: "completed" };
  } catch (error) {
    return {
      cleanupStatus: "failed",
      cleanupError: boundedErrorMessage(error),
    };
  }
}

function deriveState(
  presentCount: number,
  missingCount: number,
  readErrorCount: number,
): ArchitectDraftSubmissionState {
  if (readErrorCount > 0) return "partial-draft-set";
  if (presentCount === 0) return "waiting-for-drafts";
  if (missingCount > 0) return "partial-draft-set";
  return "ready-for-promotion";
}

function terminalState(
  state: ArchitectDraftSubmissionState,
): ArchitectDraftSubmissionState | null {
  return state === "promotion-failed" || state === "promoted" || state === "superseded"
    ? state
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function boundedErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  return message.length <= 1000
    ? message
    : "Architect draft cleanup error exceeded the supported message bound.";
}

function isDirectoryNotEmpty(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOTEMPTY"
  );
}

function isInside(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}
