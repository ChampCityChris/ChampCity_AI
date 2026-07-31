import fs from "node:fs";
import path from "node:path";
import type {
  ArchitectCanonicalDocumentBuildResult,
  ArchitectDraftPromotionResult,
  ArchitectDraftSlotRead,
  ArchitectDraftSubmission,
  ArchitectOutputDefinition,
} from "../../shared/architectOutputs/architectOutputContracts";
import {
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import {
  writeCanonicalMarkdownDocument,
  writeCanonicalMarkdownDocuments,
} from "../documents/canonicalMarkdownDocumentWriter";
import type { ArchitectOutputRegistry } from "./architectOutputRegistry";
import {
  cleanupArchitectDraftSubmission,
  inspectArchitectDraftSubmission,
} from "./architectDraftSubmissionService";

const maxDraftBodyBytes = 512 * 1024;

export interface PromoteArchitectDraftSubmissionInput<TSelection = unknown> {
  workspaceRoot: string;
  registry: ArchitectOutputRegistry;
  submission: ArchitectDraftSubmission<string, TSelection>;
}

export function promoteArchitectDraftSubmission<TSelection = unknown>(
  input: PromoteArchitectDraftSubmissionInput<TSelection>,
): ArchitectDraftPromotionResult<TSelection> {
  const definition = input.registry.resolve(
    input.submission.outputKind,
    input.submission.owningWorkspaceId,
  ) as ArchitectOutputDefinition<string, TSelection>;

  if (input.submission.state === "superseded") {
    return {
      status: "superseded",
      submission: input.submission as ArchitectDraftSubmission<string, TSelection>,
      finalRelativePaths: [],
      alreadyPromoted: false,
    };
  }

  if (input.submission.state === "promoted") {
    return {
      status: "promoted",
      submission: input.submission as ArchitectDraftSubmission<string, TSelection>,
      finalRelativePaths: input.submission.promotionRecord?.finalRelativePaths ?? [],
      selection: input.submission.promotionRecord?.selection as TSelection | undefined,
      alreadyPromoted: true,
    };
  }

  try {
    assertSubmissionMatchesDefinition(input.submission, definition);
    const inspection = inspectArchitectDraftSubmission(input.workspaceRoot, input.submission);
    if (inspection.state !== "ready-for-promotion") {
      return {
        status: "not-ready",
        submission: { ...input.submission, state: inspection.state },
        finalRelativePaths: [],
        alreadyPromoted: false,
      };
    }

    const documents = definition.slots.map((slot) => {
      const draft = requireDraft(inspection.presentSlots, slot.slotId);
      validateGenericBodyInvariants(draft.bodyMarkdown, slot.slotId);
      slot.validateBody(draft.bodyMarkdown);
      return {
        ...slot.buildCanonicalDocument({
          submission: input.submission,
          slotId: slot.slotId,
          bodyMarkdown: draft.bodyMarkdown,
        }),
        bodyMarkdown: draft.bodyMarkdown,
      };
    });

    if (definition.bundleMode === "single-output") {
      writeCanonicalMarkdownDocument({
        workspaceRoot: input.workspaceRoot,
        relativePath: documents[0].relativePath,
        metadata: documents[0].metadata,
        bodyMarkdown: documents[0].bodyMarkdown,
      });
    } else {
      writeCanonicalMarkdownDocuments(documents.map((document) => ({
        workspaceRoot: input.workspaceRoot,
        relativePath: document.relativePath,
        metadata: document.metadata,
        bodyMarkdown: document.bodyMarkdown,
      })));
    }

    verifyFinalCanonicalDocuments(input.workspaceRoot, documents);
    cleanupArchitectDraftSubmission(input.workspaceRoot, input.submission);

    const promotedDocuments = documents.map((document): ArchitectCanonicalDocumentBuildResult => ({
      relativePath: document.relativePath,
      metadata: document.metadata,
    }));
    const selection = definition.buildPostPromotionSelection({
      submission: input.submission,
      promotedDocuments,
    });
    const finalRelativePaths = promotedDocuments.map((document) => document.relativePath);
    const promotedSubmission: ArchitectDraftSubmission<string, TSelection> = {
      ...input.submission,
      state: "promoted",
      promotionRecord: {
        finalRelativePaths,
        selection,
      },
    };
    return {
      status: "promoted",
      submission: promotedSubmission,
      finalRelativePaths,
      selection,
      alreadyPromoted: false,
    };
  } catch (error) {
    return {
      status: "promotion-failed",
      submission: { ...input.submission, state: "promotion-failed" },
      finalRelativePaths: [],
      alreadyPromoted: false,
      error: errorMessage(error),
    };
  }
}

function assertSubmissionMatchesDefinition(
  submission: ArchitectDraftSubmission,
  definition: ArchitectOutputDefinition,
): void {
  if (
    submission.outputKind !== definition.outputKind ||
    submission.owningWorkspaceId !== definition.owningWorkspaceId
  ) {
    throw new Error("Architect draft submission does not match its registered definition.");
  }
  const expectedSlotIds = new Set(definition.slots.map((slot) => slot.slotId));
  if (submission.expectedDraftSlots.length !== expectedSlotIds.size) {
    throw new Error("Architect draft submission slot count does not match its definition.");
  }
  for (const slot of submission.expectedDraftSlots) {
    if (!expectedSlotIds.has(slot.slotId)) {
      throw new Error("Architect draft submission contains an unexpected slot.");
    }
  }
}

function requireDraft(
  drafts: readonly ArchitectDraftSlotRead[],
  slotId: string,
): ArchitectDraftSlotRead {
  const draft = drafts.find((candidate) => candidate.slotId === slotId);
  if (!draft) {
    throw new Error("Architect draft submission is missing an expected draft.");
  }
  return draft;
}

function validateGenericBodyInvariants(bodyMarkdown: string, slotId: string): void {
  if (!bodyMarkdown.trim()) {
    throw new Error(`Architect draft slot ${slotId} is empty.`);
  }
  if (
    bodyMarkdown.includes(metadataOpenDelimiter) ||
    bodyMarkdown.includes(metadataCloseDelimiter)
  ) {
    throw new Error(`Architect draft slot ${slotId} contains application metadata delimiters.`);
  }
  if (Buffer.byteLength(bodyMarkdown, "utf8") > maxDraftBodyBytes) {
    throw new Error(`Architect draft slot ${slotId} exceeds the application size bound.`);
  }
}

function verifyFinalCanonicalDocuments(
  workspaceRoot: string,
  documents: ReadonlyArray<ArchitectCanonicalDocumentBuildResult & { bodyMarkdown: string }>,
): void {
  for (const document of documents) {
    const installed = parseCanonicalMarkdownDocument(
      fs.readFileSync(path.join(path.resolve(workspaceRoot), document.relativePath), "utf8"),
    );
    if (JSON.stringify(installed.metadata) !== JSON.stringify(document.metadata)) {
      throw new Error("Promoted canonical metadata verification failed.");
    }
    if (installed.bodyMarkdown !== normalizeExpectedBody(document.bodyMarkdown)) {
      throw new Error("Promoted canonical body verification failed.");
    }
  }
}

function normalizeExpectedBody(bodyMarkdown: string): string {
  return `${bodyMarkdown.replace(/\r\n?/g, "\n").replace(/\n*$/, "")}\n`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
