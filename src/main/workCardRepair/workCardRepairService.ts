import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataWithSubstantiveRevision,
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { ArchitectDraftSubmission, ArchitectOutputDefinition } from "../../shared/architectOutputs/architectOutputContracts";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import type { WorkCardRepairEvidenceDocument, WorkCardRepairProjection } from "../../shared/workspaceContracts";
import { evaluateDocumentFreshness, listPlanningDocuments, readPlanningDocument } from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  getActiveArchitectOutputRuntimeSubmission,
  getArchitectOutputRuntimeStatus,
  prepareArchitectOutputRuntimeSubmission,
  type ActiveArchitectOutputRuntimeSubmission,
} from "../architectOutputs/architectOutputRuntimeService";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import {
  buildCreateMarkdownArtifactJsonBlock,
  buildMcpWorkspaceBindingPromptBlock,
} from "../integrations/mcpWorkspacePromptContract";
import {
  inheritRepositoryAuthorityFromSources,
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export type RepairOrigin = "preValidationReportReview" | "postValidationRecord";

export interface CurrentRepairEvidence {
  phaseId: string;
  workCardId: string;
  path: string;
  revision: number;
  origin: RepairOrigin;
  repairDefectText?: string;
  operatorValidationNotes?: string;
  advisorySummary?: string;
  formalWorkCardPath?: string;
  implementerReportPath?: string;
  implementerReportRevision?: number;
}

export interface RepairCreationResult {
  repairId: string;
  handoffMarkdownPath: string;
  repairMarkdownPath: string;
}

export interface RepairWorkCardSaveResult {
  phaseId: string;
  repairId: string;
  repairWorkCardMarkdownPath: string;
}

const outputKind = "repair-work-card";
const owningWorkspaceId = "work-card-repair";
const slotId = "repair-work-card";

export interface RepairWorkCardContext {
  handoff: PlanningDocumentSummary;
  phaseId: string;
  repairId: string;
  parentWorkCardId: string;
  workflowData: Record<string, unknown>;
  targetPath: string;
  sourceRevisions: Array<{ path: string; revision: number }>;
  existing?: PlanningDocumentSummary;
}

export type ExactActiveRepairWorkCardContextResolution =
  | {
      status: "ready";
      reason: string;
      evidencePaths: string[];
      context: RepairWorkCardContext;
    }
  | {
      status: "not-ready" | "needs-attention";
      reason: string;
      evidencePaths: string[];
      context?: undefined;
    };

export type ApprovedRepairImplementationContextResolution = ExactActiveRepairWorkCardContextResolution;

export const repairWorkCardArchitectOutputDefinition: ArchitectOutputDefinition<
  typeof slotId,
  RepairWorkCardSaveResult,
  RepairWorkCardContext
> = {
  outputKind,
  owningWorkspaceId,
  bundleMode: "single-output",
  slots: [{
    slotId,
    displayLabel: "Repair Work Card",
    draftPathComponent: "repair-work-card.md",
    validateBody(bodyMarkdown, context) {
      validateRepairWorkCardBody(bodyMarkdown, context.repairId, context.workflowData.returnTarget);
    },
    buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
      const existing = context.existing
        ? readExistingCanonical(workspaceRoot, context.targetPath)
        : null;
      const metadata = existing
        ? {
            ...metadataWithSubstantiveRevision(existing.metadata, context.sourceRevisions),
            identity: {
              phaseId: context.phaseId,
              workCardId: context.repairId,
              repairId: context.repairId,
              parentWorkCardId: context.parentWorkCardId,
            },
            workflowData: mergeRepositoryAuthorityIntoWorkflowData(
              repairWorkflowData(context),
              inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, context.sourceRevisions),
            ),
          }
        : outputMetadata({
            workspaceRoot,
            relativePath: context.targetPath,
            phaseId: context.phaseId,
            repairId: context.repairId,
            parentWorkCardId: context.parentWorkCardId,
            workflowData: context.workflowData,
            sourceRevisions: context.sourceRevisions,
          });
      return { relativePath: context.targetPath, metadata, bodyMarkdown };
    },
  }],
  buildSubmissionId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind,
      owningWorkspaceId,
      ...context,
    });
  },
  buildPromotionGroupId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind,
      owningWorkspaceId,
      ...context,
    });
  },
  resolvePreparation(workspaceRoot) {
    const context = requireRepairWorkCardContext(workspaceRoot);
    assertRepairWorkCardEligible(workspaceRoot, context);
    return {
      sourceHandoff: { path: context.handoff.markdownPath, revision: context.handoff.metadata.artifactRevision ?? 1 },
      domainContext: context,
    };
  },
  resolvePromotionContext({ workspaceRoot, submission, preparedContext }) {
    const context = requireRepairWorkCardContext(workspaceRoot);
    const original = preparedContext as RepairWorkCardContext;
    if (
      context.handoff.markdownPath !== submission.sourceHandoff.path ||
      (context.handoff.metadata.artifactRevision ?? 1) !== submission.sourceHandoff.revision ||
      context.targetPath !== original.targetPath ||
      JSON.stringify(context.sourceRevisions) !== JSON.stringify(original.sourceRevisions)
    ) {
      throw new Error("Repair Work Card draft no longer matches the current Repair Architect handoff.");
    }
    assertRepairWorkCardEligible(workspaceRoot, context);
    return context;
  },
  buildPreparedInstruction({ workspaceRoot, submission, sourceHandoff, domainContext: context }) {
    return buildRepairWorkCardPreparedInstruction(workspaceRoot, context, submission, sourceHandoff);
  },
  buildPostPromotionSelection({ promotedDocuments, domainContext: context }) {
    return {
      phaseId: context.phaseId,
      repairId: context.repairId,
      repairWorkCardMarkdownPath: promotedDocuments[0].relativePath,
    };
  },
};

export function prepareRepairWorkCardDraftSubmission(
  workspaceRoot: string,
): ArchitectDraftSubmission<typeof slotId, RepairWorkCardSaveResult> {
  return prepareArchitectOutputRuntimeSubmission(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getRepairWorkCardDraftStatus(
  workspaceRoot: string,
): ActiveArchitectOutputRuntimeSubmission<typeof slotId, RepairWorkCardSaveResult> | undefined {
  return getArchitectOutputRuntimeStatus(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getActiveRepairWorkCardDraftSubmission(
  workspaceRoot: string,
): ActiveArchitectOutputRuntimeSubmission<typeof slotId, RepairWorkCardSaveResult> | undefined {
  return getActiveArchitectOutputRuntimeSubmission(workspaceRoot, owningWorkspaceId);
}

export function resolveExactActiveRepairWorkCardContext(
  workspaceRoot: string,
): ExactActiveRepairWorkCardContextResolution {
  const documents = listPlanningDocuments(workspaceRoot);
  const handoffs = approvedRepairHandoffs(documents);
  const activeRepairOutputs = documents
    .filter((document) => document.metadata.artifactType === "repair-work-card")
    .filter((document) => document.effectiveDisposition !== "Approved");
  if (handoffs.length === 0) {
    return {
      status: "not-ready",
      reason: "Current Approved Repair Architect handoff is required.",
      evidencePaths: activeRepairOutputs.map((document) => document.markdownPath),
    };
  }

  if (activeRepairOutputs.length > 1) {
    return {
      status: "needs-attention",
      reason: "Multiple active Repair Work Card outputs conflict.",
      evidencePaths: activeRepairOutputs.map((document) => document.markdownPath),
    };
  }

  try {
    const handoff = activeRepairOutputs.length === 1
      ? selectHandoffForActiveRepairOutput(handoffs, activeRepairOutputs[0])
      : selectHandoffForMissingRepairOutput(documents, handoffs);
    if (!handoff) {
      return {
        status: "not-ready",
        reason: "No active Repair Work Card handoff requires preparation.",
        evidencePaths: [],
      };
    }
    const context = repairWorkCardContextFromHandoff(workspaceRoot, documents, handoff);
    return {
      status: "ready",
      reason: "Exact active Repair Architect handoff resolved.",
      evidencePaths: context.sourceRevisions.map((source) => source.path),
      context,
    };
  } catch (error) {
    return {
      status: "needs-attention",
      reason: error instanceof Error ? error.message : String(error),
      evidencePaths: repairAuthorityEvidencePaths(handoffs, activeRepairOutputs),
    };
  }
}

export function resolveApprovedRepairImplementationContext(
  workspaceRoot: string,
): ApprovedRepairImplementationContextResolution {
  let evidence: CurrentRepairEvidence;
  try {
    evidence = resolveCurrentRepairEvidence(workspaceRoot);
  } catch (error) {
    return {
      status: "not-ready",
      reason: error instanceof Error ? error.message : String(error),
      evidencePaths: [],
    };
  }
  const documents = listPlanningDocuments(workspaceRoot);
  const handoffs = approvedRepairHandoffs(documents).filter((handoff) => {
    const workflowData = handoff.metadata.canonical?.workflowData ?? {};
    const identity = handoff.metadata.canonical?.identity ?? {};
    const sourceMatches = (handoff.metadata.sourceRevisions ?? []).some((source) =>
      source.path === evidence.path && source.revision === evidence.revision
    );
    return sourceMatches &&
      identity.phaseId === evidence.phaseId &&
      workflowData.originalParentWorkCardId === evidence.workCardId &&
      workflowData.origin === evidence.origin &&
      workflowData.evidencePath === evidence.path;
  });
  const approved = handoffs
    .map((handoff) => {
      const target = safeRepairWorkCardTargetFromHandoff(handoff);
      const output = target
        ? documents.find((document) =>
            document.markdownPath === target &&
            document.metadata.artifactType === "repair-work-card" &&
            document.effectiveDisposition === "Approved"
          )
        : undefined;
      return output ? { handoff, output } : null;
    })
    .filter((entry): entry is { handoff: PlanningDocumentSummary; output: PlanningDocumentSummary } => Boolean(entry));
  if (approved.length === 0) {
    return {
      status: "not-ready",
      reason: "No Approved Repair Work Card is ready for implementation.",
      evidencePaths: repairAuthorityEvidencePaths(handoffs, []),
    };
  }
  if (approved.length > 1) {
    return {
      status: "needs-attention",
      reason: "Multiple Approved Repair Work Cards match the current repair evidence.",
      evidencePaths: repairAuthorityEvidencePaths(
        approved.map((entry) => entry.handoff),
        approved.map((entry) => entry.output),
      ),
    };
  }
  try {
    const context = repairWorkCardContextFromHandoff(workspaceRoot, documents, approved[0].handoff);
    return {
      status: "ready",
      reason: "Approved Repair Work Card is ready for implementation.",
      evidencePaths: [context.handoff.markdownPath, context.targetPath, ...context.sourceRevisions.map((source) => source.path)]
        .filter((value, index, values) => values.indexOf(value) === index),
      context,
    };
  } catch (error) {
    return {
      status: "needs-attention",
      reason: error instanceof Error ? error.message : String(error),
      evidencePaths: repairAuthorityEvidencePaths(handoffs, approved.map((entry) => entry.output)),
    };
  }
}

export function getWorkCardRepairProjection(workspaceRoot: string): WorkCardRepairProjection {
  let evidence: CurrentRepairEvidence | undefined;
  try {
    evidence = resolveCurrentRepairEvidence(workspaceRoot);
  } catch (error) {
    return {
      state: "needs-attention",
      canCreateRepairHandoff: false,
      canPrepareArchitectHandoff: false,
      canCopyArchitectHandoff: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  const evidenceDocuments = buildRepairEvidenceDocuments(workspaceRoot, evidence);
  const evidenceProblem = repairEvidenceProblem(evidenceDocuments);
  if (evidenceProblem) {
    return {
      state: "needs-attention",
      phaseId: evidence.phaseId,
      parentWorkCardId: evidence.workCardId,
      evidencePath: evidence.path,
      evidenceRevision: evidence.revision,
      ...repairEvidenceProjectionFields(evidence, evidenceDocuments),
      repairOrigin: evidence.origin,
      canCreateRepairHandoff: false,
      canPrepareArchitectHandoff: false,
      canCopyArchitectHandoff: false,
      reason: evidenceProblem,
    };
  }

  const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
  if (resolved.status === "needs-attention") {
    return {
      state: "needs-attention",
      phaseId: evidence.phaseId,
      parentWorkCardId: evidence.workCardId,
      evidencePath: evidence.path,
      evidenceRevision: evidence.revision,
      ...repairEvidenceProjectionFields(evidence, evidenceDocuments),
      repairOrigin: evidence.origin,
      canCreateRepairHandoff: false,
      canPrepareArchitectHandoff: false,
      canCopyArchitectHandoff: false,
      reason: resolved.reason,
    };
  }

  const context = resolved.context;
  if (!context) {
    return {
      state: "handoff-needed",
      phaseId: evidence.phaseId,
      parentWorkCardId: evidence.workCardId,
      evidencePath: evidence.path,
      evidenceRevision: evidence.revision,
      ...repairEvidenceProjectionFields(evidence, evidenceDocuments),
      repairOrigin: evidence.origin,
      returnTarget: returnTargetForRepairOrigin(evidence.origin),
      canCreateRepairHandoff: true,
      canPrepareArchitectHandoff: false,
      canCopyArchitectHandoff: false,
      reason: "Create or reuse the Repair Architect handoff from current RevisionRequested evidence.",
    };
  }

  const submission = getRepairWorkCardDraftStatus(workspaceRoot);
  const targetDisposition = context.existing?.effectiveDisposition;
  const state: WorkCardRepairProjection["state"] =
    targetDisposition && targetDisposition !== "Approved"
      ? "repair-card-reviewable"
      : submission?.submission.state === "waiting-for-drafts" || submission?.submission.state === "partial-draft-set"
      ? "draft-pending"
      : "handoff-ready";
  return {
    state,
    phaseId: context.phaseId,
    parentWorkCardId: context.parentWorkCardId,
    repairId: context.repairId,
    evidencePath: requiredString(context.workflowData.evidencePath, "evidencePath"),
    evidenceRevision: context.sourceRevisions.find((source) => source.path === context.workflowData.evidencePath)?.revision,
    ...repairEvidenceProjectionFields(evidence, evidenceDocuments),
    repairOrigin: requiredString(context.workflowData.origin, "origin") as RepairOrigin,
    repairWorkCardTarget: context.targetPath,
    returnTarget: requiredString(context.workflowData.returnTarget, "returnTarget") as WorkCardRepairProjection["returnTarget"],
    handoffPath: context.handoff.markdownPath,
    handoffRevision: context.handoff.metadata.artifactRevision ?? 1,
    canCreateRepairHandoff: true,
    canPrepareArchitectHandoff: state !== "repair-card-reviewable",
    canCopyArchitectHandoff: state === "draft-pending",
    reason: state === "repair-card-reviewable"
      ? "Repair Work Card output is ready for review."
      : state === "draft-pending"
      ? "Repair Work Card Architect prompt is prepared; copy it into embedded ChatGPT."
      : "Repair Architect handoff is ready; prepare and copy the Repair Work Card Architect prompt.",
  };
}

function repairEvidenceProjectionFields(
  evidence: CurrentRepairEvidence,
  evidenceDocuments: {
    primaryEvidenceDocument: WorkCardRepairEvidenceDocument;
    supportingEvidenceDocuments: WorkCardRepairEvidenceDocument[];
  },
): Pick<
  WorkCardRepairProjection,
  "primaryEvidenceDocument" | "supportingEvidenceDocuments" | "operatorValidationNotes" | "advisorySummary" | "repairDefectText"
> {
  return {
    primaryEvidenceDocument: evidenceDocuments.primaryEvidenceDocument,
    supportingEvidenceDocuments: evidenceDocuments.supportingEvidenceDocuments,
    operatorValidationNotes: evidence.operatorValidationNotes,
    advisorySummary: evidence.advisorySummary,
    repairDefectText: evidence.repairDefectText,
  };
}

function buildRepairEvidenceDocuments(
  workspaceRoot: string,
  evidence: CurrentRepairEvidence,
): {
  primaryEvidenceDocument: WorkCardRepairEvidenceDocument;
  supportingEvidenceDocuments: WorkCardRepairEvidenceDocument[];
} {
  const documents = listPlanningDocuments(workspaceRoot);
  const primaryEvidenceDocument = documentEvidenceProjection({
    workspaceRoot,
    documents,
    markdownPath: evidence.path,
    role: evidence.origin === "postValidationRecord" ? "primary-validation-record" : "primary-implementer-report",
    label: evidence.origin === "postValidationRecord" ? "Validation Record" : "Implementer Report",
  });
  const supportingEvidenceDocuments = evidence.origin === "postValidationRecord"
    ? [
        documentEvidenceProjection({
          workspaceRoot,
          documents,
          markdownPath: evidence.implementerReportPath,
          role: "supporting-implementer-report",
          label: "Implementer Report",
        }),
        documentEvidenceProjection({
          workspaceRoot,
          documents,
          markdownPath: evidence.formalWorkCardPath,
          role: "supporting-formal-work-card",
          label: "Formal Work Card",
        }),
      ]
    : [
        documentEvidenceProjection({
          workspaceRoot,
          documents,
          markdownPath: evidence.formalWorkCardPath,
          role: "supporting-formal-work-card",
          label: "Formal Work Card",
          optional: true,
        }),
      ].filter((document) => document.markdownPath !== unresolvedEvidencePath("Formal Work Card"));
  return { primaryEvidenceDocument, supportingEvidenceDocuments };
}

function documentEvidenceProjection(input: {
  workspaceRoot: string;
  documents: PlanningDocumentSummary[];
  markdownPath?: string;
  role: WorkCardRepairEvidenceDocument["role"];
  label: string;
  optional?: boolean;
}): WorkCardRepairEvidenceDocument {
  const markdownPath = input.markdownPath?.trim();
  if (!markdownPath) {
    return {
      role: input.role,
      label: input.label,
      markdownPath: unresolvedEvidencePath(input.label),
      documentReadState: "missing",
      readError: input.optional ? undefined : `${input.label} path is missing from the repair evidence authority.`,
    };
  }
  const document = input.documents.find((candidate) => candidate.markdownPath === markdownPath);
  if (!document) {
    return {
      role: input.role,
      label: input.label,
      markdownPath,
      documentReadState: "missing",
      readError: `${input.label} is missing at the path recorded in repair evidence.`,
    };
  }
  const documentReadState = document.documentReadState ?? "readable";
  if (documentReadState !== "readable" || document.readError) {
    return {
      role: input.role,
      label: input.label,
      markdownPath: document.markdownPath,
      logicalDocumentId: document.logicalDocumentId,
      artifactRevision: document.metadata.artifactRevision,
      disposition: document.effectiveDisposition,
      documentReadState,
      readError: document.readError ?? `${input.label} is not readable.`,
    };
  }
  try {
    const detail = readPlanningDocument(input.workspaceRoot, document.logicalDocumentId);
    return {
      role: input.role,
      label: input.label,
      markdownPath: document.markdownPath,
      logicalDocumentId: document.logicalDocumentId,
      artifactRevision: document.metadata.artifactRevision,
      disposition: document.effectiveDisposition,
      documentReadState: "readable",
      bodyMarkdown: detail.bodyMarkdown,
    };
  } catch (error) {
    return {
      role: input.role,
      label: input.label,
      markdownPath: document.markdownPath,
      logicalDocumentId: document.logicalDocumentId,
      artifactRevision: document.metadata.artifactRevision,
      disposition: document.effectiveDisposition,
      documentReadState: "read-error",
      readError: error instanceof Error ? error.message : String(error),
    };
  }
}

function repairEvidenceProblem(input: {
  primaryEvidenceDocument: WorkCardRepairEvidenceDocument;
  supportingEvidenceDocuments: WorkCardRepairEvidenceDocument[];
}): string | null {
  const problem = [input.primaryEvidenceDocument, ...input.supportingEvidenceDocuments]
    .find((document) => document.documentReadState !== "readable" || Boolean(document.readError));
  if (!problem) {
    return null;
  }
  return `${problem.label} repair evidence needs attention: ${problem.readError ?? problem.documentReadState}.`;
}

function unresolvedEvidencePath(label: string): string {
  return `<unresolved ${label} path>`;
}

function repairAuthorityEvidencePaths(
  handoffs: PlanningDocumentSummary[],
  outputs: PlanningDocumentSummary[],
): string[] {
  return [...new Set([
    ...handoffs.flatMap((handoff) => {
      const workflowData = handoff.metadata.canonical?.workflowData ?? {};
      return [handoff.markdownPath, workflowData.evidencePath, workflowData.repairWorkCardTarget];
    }),
    ...outputs.map((output) => output.markdownPath),
  ].filter((value): value is string => typeof value === "string" && Boolean(value.trim())))];
}

export function createRepairWorkCard(
  workspaceRoot: string,
  phaseId: string,
  parentWorkCardId: string,
  evidencePath: string,
  origin: RepairOrigin,
  defect: string,
): RepairCreationResult {
  const evidence = requiredRevisionRequestedEvidence(workspaceRoot, evidencePath, origin);
  const documents = listPlanningDocuments(workspaceRoot);
  const originalParentId = parentWorkCardId.replace(/-REPAIR\d+$/i, "");
  const trimmedDefect = defect.trim();
  if (!trimmedDefect) {
    throw new Error("Repair defect is required.");
  }
  const evidenceRevision = evidence.metadata.artifactRevision ?? 1;
  const existing = findExistingRepairHandoffForEvidence(
    workspaceRoot,
    documents,
    phaseId,
    originalParentId,
    evidencePath,
    evidenceRevision,
    origin,
    trimmedDefect,
  );
  if (existing) {
    return existing;
  }
  assertNoConflictingActiveRepairAuthority(documents);
  const repairId = nextRepairId(workspaceRoot, phaseId, originalParentId);
  const handoffMarkdownPath = `planning/phases/${phaseId}/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_${repairId}.md`;
  const repairMarkdownPath = deterministicRepairWorkCardTargetPath(phaseId, repairId);
  const returnTarget = returnTargetForRepairOrigin(origin);
  const content = {
    handoffKind: "repair",
    repairId,
    originalParentWorkCardId: originalParentId,
    origin,
    evidencePath,
    boundedDefect: trimmedDefect,
    returnTarget,
  };
  const sourceRevisions = [{ path: evidence.markdownPath, revision: evidenceRevision }];
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoffMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "generated-handoff",
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      identity: { handoffKind: "repair", phaseId, repairId },
      sourceRevisions,
      workflowData: mergeRepositoryAuthorityIntoWorkflowData(
        { ...content, repairWorkCardTarget: repairMarkdownPath },
        inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions),
      ),
      documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
    },
    bodyMarkdown: repairHandoffBodyMarkdown(repairMarkdownPath),
  });
  return { repairId, handoffMarkdownPath, repairMarkdownPath };
}

export function resolveCurrentRepairEvidence(workspaceRoot: string): CurrentRepairEvidence {
  const candidates = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.effectiveDisposition === "RevisionRequested")
    .map(currentRepairEvidenceFromDocument)
    .filter((value): value is CurrentRepairEvidence => Boolean(value));

  const candidate = candidates.at(-1);
  if (!candidate) {
    throw new Error("Current RevisionRequested report or validation record evidence is required.");
  }
  return candidate;
}

function requiredRevisionRequestedEvidence(workspaceRoot: string, relativePath: string, origin: RepairOrigin): PlanningDocumentSummary {
  const document = listPlanningDocuments(workspaceRoot).find((candidate) =>
    candidate.markdownPath === relativePath
  );
  if (!document || document.effectiveDisposition !== "RevisionRequested") {
    throw new Error("Repair creation requires RevisionRequested evidence.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error("Repair evidence is stale.");
  }
  const value = relativePath.replace(/\\/g, "/").toLowerCase();
  if (origin === "preValidationReportReview" && !value.includes("/implementer_reports/")) {
    throw new Error("Pre-validation repair requires an Implementer Report.");
  }
  if (origin === "postValidationRecord" && !value.includes("validation")) {
    throw new Error("Post-validation repair requires validation evidence.");
  }
  return document;
}

function currentRepairEvidenceFromDocument(document: PlanningDocumentSummary): CurrentRepairEvidence | null {
  const canonical = document.metadata.canonical;
  const artifactType = document.metadata.artifactType;
  const normalizedPath = document.markdownPath.replace(/\\/g, "/");
  const phaseId = stringValue(canonical?.identity.phaseId) ??
    stringValue(document.metadata.phaseId) ??
    normalizedPath.match(/planning\/phases\/([^/]+)\//i)?.[1];
  const workCardId = stringValue(canonical?.identity.workCardId) ??
    stringValue(document.metadata.workCardId) ??
    normalizedPath.match(/IMPLEMENTER_REPORT_([A-Z0-9-]+)/i)?.[1] ??
    normalizedPath.match(/VALIDATION_RECORD_([A-Z0-9-]+)_ATTEMPT/i)?.[1];
  const origin: RepairOrigin | undefined =
    artifactType === "validation-record" || normalizedPath.toLowerCase().includes("/validation")
      ? "postValidationRecord"
      : artifactType === "implementer-report" || normalizedPath.toLowerCase().includes("/implementer_reports/")
      ? "preValidationReportReview"
      : undefined;
  if (!phaseId || !workCardId || !origin) {
    return null;
  }
  const repairDefectText = stringValue(canonical?.workflowData.repairDefectText) ??
    (origin === "preValidationReportReview"
      ? stringValue(canonical?.documentDisposition.notes)
      : undefined);
  const operatorValidationNotes = stringValue(canonical?.workflowData.operatorValidationNotes);
  const advisorySummary = stringValue(canonical?.workflowData.advisorySummary);
  const formalWorkCardPath = stringValue(canonical?.workflowData.formalWorkCardPath) ??
    sourcePathForArtifactType(document.metadata.sourceRevisions ?? [], "formal-work-card");
  const implementerReportPath = stringValue(canonical?.workflowData.implementerReportPath) ??
    sourcePathForArtifactType(document.metadata.sourceRevisions ?? [], "implementer-report");
  const implementerReportRevision = numberValue(canonical?.workflowData.implementerReportRevision) ??
    revisionForSourcePath(document.metadata.sourceRevisions ?? [], implementerReportPath);
  return {
    phaseId,
    workCardId,
    path: document.markdownPath,
    revision: document.metadata.artifactRevision ?? 1,
    origin,
    repairDefectText,
    operatorValidationNotes,
    advisorySummary,
    formalWorkCardPath,
    implementerReportPath,
    implementerReportRevision,
  };
}

function findExistingRepairHandoffForEvidence(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  phaseId: string,
  parentWorkCardId: string,
  evidencePath: string,
  evidenceRevision: number,
  origin: RepairOrigin,
  defect: string,
): RepairCreationResult | null {
  const matches = approvedRepairHandoffs(documents).filter((handoff) => {
    const workflowData = handoff.metadata.canonical?.workflowData ?? {};
    const identity = handoff.metadata.canonical?.identity ?? {};
    const sourceMatches = (handoff.metadata.sourceRevisions ?? []).some((source) =>
      source.path === evidencePath && source.revision === evidenceRevision
    );
    return sourceMatches &&
      identity.phaseId === phaseId &&
      workflowData.originalParentWorkCardId === parentWorkCardId &&
      workflowData.origin === origin &&
      workflowData.evidencePath === evidencePath &&
      workflowData.boundedDefect === defect;
  });
  if (matches.length > 1) {
    throw new Error("Multiple active Repair Architect handoffs match the current RevisionRequested evidence.");
  }
  if (matches.length === 0) {
    return null;
  }
  const match = matches[0];
  const workflowData = match.metadata.canonical?.workflowData ?? {};
  const repairId = requiredString(workflowData.repairId, "repairId");
  const currentTarget = repairWorkCardTargetFromHandoff(match);
  const deterministicTarget = deterministicRepairWorkCardTargetPath(phaseId, repairId);
  if (currentTarget === deterministicTarget) {
    return {
      repairId,
      handoffMarkdownPath: match.markdownPath,
      repairMarkdownPath: currentTarget,
    };
  }
  const normalized = normalizeDefectSlugHandoffIfSafe(
    workspaceRoot,
    documents,
    match,
    currentTarget,
    deterministicTarget,
  );
  return {
    repairId,
    handoffMarkdownPath: match.markdownPath,
    repairMarkdownPath: normalized,
  };
}

function deterministicRepairWorkCardTargetPath(phaseId: string, repairId: string): string {
  return `planning/phases/${phaseId}/Work_Cards/${repairId}.md`;
}

function normalizeDefectSlugHandoffIfSafe(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  handoff: PlanningDocumentSummary,
  currentTarget: string,
  deterministicTarget: string,
): string {
  const existingOldTarget = documents.find((document) => document.markdownPath === currentTarget);
  const existingDeterministicTarget = documents.find((document) => document.markdownPath === deterministicTarget);
  const activeDraft = getActiveRepairWorkCardDraftSubmission(workspaceRoot);
  const draftTargetsOldHandoff =
    activeDraft?.submission.sourceHandoff.path === handoff.markdownPath ||
    (activeDraft?.preparedContext as RepairWorkCardContext | undefined)?.targetPath === currentTarget;
  if (existingOldTarget || draftTargetsOldHandoff) {
    return currentTarget;
  }
  if (existingDeterministicTarget) {
    throw new Error("Existing Repair Architect handoff has a legacy target while the deterministic Repair Work Card target already exists.");
  }
  const parsed = readExistingCanonical(workspaceRoot, handoff.markdownPath);
  if (!parsed) {
    throw new Error("Existing Repair Architect handoff disappeared during target normalization.");
  }
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoff.markdownPath,
    metadata: {
      ...parsed.metadata,
      artifactRevision: parsed.metadata.artifactRevision + 1,
      workflowData: {
        ...mergeRepositoryAuthorityIntoWorkflowData(
          parsed.metadata.workflowData,
          inheritRepositoryAuthorityFromSources(parsed.metadata.workflowData),
        ),
        repairWorkCardTarget: deterministicTarget,
      },
    },
    bodyMarkdown: repairHandoffBodyMarkdown(deterministicTarget),
  });
  return deterministicTarget;
}

function repairHandoffBodyMarkdown(repairMarkdownPath: string): string {
  return `# Repair Architect Handoff\n\nRepair Work Card Markdown: ${repairMarkdownPath}\n`;
}

function assertNoConflictingActiveRepairAuthority(documents: PlanningDocumentSummary[]): void {
  const handoffs = approvedRepairHandoffs(documents);
  const activeOutputs = documents
    .filter((document) => document.metadata.artifactType === "repair-work-card")
    .filter((document) => document.effectiveDisposition !== "Approved");
  if (activeOutputs.length > 1) {
    throw new Error("Multiple active Repair Work Card outputs conflict.");
  }
  const activeHandoffs = handoffs.filter((handoff) => {
    const target = safeRepairWorkCardTargetFromHandoff(handoff);
    const output = target ? documents.find((document) => document.markdownPath === target) : undefined;
    return !output || output.effectiveDisposition !== "Approved";
  });
  if (activeHandoffs.length > 0) {
    throw new Error("An active Repair Architect handoff already exists for different repair evidence.");
  }
}

function returnTargetForRepairOrigin(origin: RepairOrigin): "work-card-building-review" | "work-card-validation" {
  return origin === "preValidationReportReview"
    ? "work-card-building-review"
    : "work-card-validation";
}

function requireRepairWorkCardContext(workspaceRoot: string): RepairWorkCardContext {
  const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
  if (resolved.status !== "ready") {
    throw new Error(resolved.reason);
  }
  return resolved.context;
}

function assertRepairWorkCardEligible(workspaceRoot: string, context: RepairWorkCardContext): void {
  if (!context.existing) return;
  if (context.existing.documentReadState !== "readable") {
    throw new Error(context.existing.readError ?? "Existing Repair Work Card is not readable.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, context.existing.logicalDocumentId).state === "stale") {
    throw new Error("Existing Repair Work Card is stale.");
  }
  if (context.existing.effectiveDisposition !== "RevisionRequested") {
    throw new Error("Repair Work Card draft can only replace an absent target or a current RevisionRequested Repair Work Card.");
  }
}

function approvedRepairHandoffs(documents: PlanningDocumentSummary[]): PlanningDocumentSummary[] {
  return documents
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "repair")
    .filter((document) => document.effectiveDisposition === "Approved");
}

function selectHandoffForActiveRepairOutput(
  handoffs: PlanningDocumentSummary[],
  repairOutput: PlanningDocumentSummary,
): PlanningDocumentSummary {
  const matches = handoffs.filter((handoff) =>
    safeRepairWorkCardTargetFromHandoff(handoff) === repairOutput.markdownPath
  );
  if (matches.length === 0) {
    throw new Error("Active Repair Work Card output is missing its exact Approved Repair Architect handoff.");
  }
  if (matches.length > 1) {
    throw new Error("Multiple Approved Repair Architect handoffs target the same active Repair Work Card.");
  }
  return matches[0];
}

function selectHandoffForMissingRepairOutput(
  documents: PlanningDocumentSummary[],
  handoffs: PlanningDocumentSummary[],
): PlanningDocumentSummary | null {
  const unresolved = handoffs.filter((handoff) => {
    const target = safeRepairWorkCardTargetFromHandoff(handoff);
    return target && !documents.some((document) => document.markdownPath === target);
  });
  if (unresolved.length === 0) {
    return null;
  }
  if (unresolved.length > 1) {
    throw new Error("Multiple Approved Repair Architect handoffs have no final Repair Work Card output.");
  }
  return unresolved[0];
}

function repairWorkCardContextFromHandoff(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  handoff: PlanningDocumentSummary,
): RepairWorkCardContext {
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    throw new Error("Current Repair Architect handoff is stale.");
  }
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const phaseId = requiredString(handoff.metadata.canonical?.identity.phaseId, "phaseId");
  const repairId = requiredString(workflowData.repairId, "repairId");
  const identityRepairId = requiredString(handoff.metadata.canonical?.identity.repairId, "identity.repairId");
  if (identityRepairId !== repairId) {
    throw new Error("Repair Architect handoff repair identity is inconsistent.");
  }
  const parentWorkCardId = requiredString(workflowData.originalParentWorkCardId, "originalParentWorkCardId");
  const origin = requiredString(workflowData.origin, "origin");
  if (origin !== "preValidationReportReview" && origin !== "postValidationRecord") {
    throw new Error("Repair Architect handoff origin is not current.");
  }
  const returnTarget = requiredString(workflowData.returnTarget, "returnTarget");
  const evidencePath = requiredString(workflowData.evidencePath, "evidencePath");
  const targetPath = repairWorkCardTargetFromHandoff(handoff);
  const evidence = documents.find((document) => document.markdownPath === evidencePath);
  if (!evidence) {
    throw new Error("Repair Architect handoff evidence path is missing.");
  }
  const evidenceWorkflowData = repairEvidenceWorkflowData(evidence);
  const expectedEvidenceType = origin === "preValidationReportReview" ? "implementer-report" : "validation-record";
  const expectedReturnTarget = origin === "preValidationReportReview" ? "work-card-building-review" : "work-card-validation";
  if (evidence.metadata.artifactType !== expectedEvidenceType || returnTarget !== expectedReturnTarget) {
    throw new Error("Repair Architect handoff origin, evidence, and return target do not match the required authority mapping.");
  }
  const source = (handoff.metadata.sourceRevisions ?? []).find((candidate) => candidate.path === evidencePath);
  if (!source || source.revision !== (evidence.metadata.artifactRevision ?? 1)) {
    throw new Error("Repair Architect handoff evidence revision is stale or mismatched.");
  }
  const existing = documents.find((document) => document.markdownPath === targetPath);
  if (existing) {
    assertExistingRepairOutputMatchesContext(existing, {
      phaseId,
      repairId,
      parentWorkCardId,
      workflowData: { ...workflowData, ...evidenceWorkflowData },
      sourceRevisions: [
        ...(handoff.metadata.sourceRevisions ?? []),
        { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
      ],
    });
  }
  return {
    handoff,
    phaseId,
    repairId,
    parentWorkCardId,
    workflowData: { ...workflowData, ...evidenceWorkflowData },
    targetPath,
    sourceRevisions: [
      ...(handoff.metadata.sourceRevisions ?? []),
      { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
    ],
    existing,
  };
}

function repairEvidenceWorkflowData(evidence: PlanningDocumentSummary): Record<string, unknown> {
  const workflowData = evidence.metadata.canonical?.workflowData ?? {};
  const sourceRevisions = evidence.metadata.sourceRevisions ?? [];
  return {
    validationRecordPath: evidence.metadata.artifactType === "validation-record" ? evidence.markdownPath : undefined,
    operatorValidationNotes: stringValue(workflowData.operatorValidationNotes),
    advisorySummary: stringValue(workflowData.advisorySummary),
    repairDefectText: stringValue(workflowData.repairDefectText),
    formalWorkCardPath: stringValue(workflowData.formalWorkCardPath) ??
      sourcePathForArtifactType(sourceRevisions, "formal-work-card"),
    implementerReportPath: stringValue(workflowData.implementerReportPath) ??
      sourcePathForArtifactType(sourceRevisions, "implementer-report"),
    implementerReportRevision: numberValue(workflowData.implementerReportRevision) ??
      revisionForSourcePath(sourceRevisions, stringValue(workflowData.implementerReportPath)),
  };
}

function repairWorkCardTargetFromHandoff(handoff: PlanningDocumentSummary): string {
  const target = handoff.metadata.canonical?.workflowData.repairWorkCardTarget;
  if (typeof target !== "string" || !target.trim() || path.isAbsolute(target) || target.includes("..") || !target.endsWith(".md")) {
    throw new Error("Repair Architect handoff is missing repairWorkCardTarget.");
  }
  return target;
}

function safeRepairWorkCardTargetFromHandoff(handoff: PlanningDocumentSummary): string | null {
  try {
    return repairWorkCardTargetFromHandoff(handoff);
  } catch {
    return null;
  }
}

function assertExistingRepairOutputMatchesContext(
  existing: PlanningDocumentSummary,
  expected: {
    phaseId: string;
    repairId: string;
    parentWorkCardId: string;
    workflowData: Record<string, unknown>;
    sourceRevisions: SourceRevision[];
  },
): void {
  const identity = existing.metadata.canonical?.identity ?? {};
  const workflowData = existing.metadata.canonical?.workflowData ?? {};
  if (
    existing.metadata.artifactType !== "repair-work-card" ||
    existing.metadata.participationRole !== "gatingReview" ||
    identity.phaseId !== expected.phaseId ||
    identity.workCardId !== expected.repairId ||
    identity.repairId !== expected.repairId ||
    identity.parentWorkCardId !== expected.parentWorkCardId ||
    workflowData.repairId !== expected.repairId ||
    workflowData.parentWorkCardId !== expected.parentWorkCardId ||
    workflowData.originalParentWorkCardId !== expected.parentWorkCardId ||
    workflowData.origin !== expected.workflowData.origin ||
    workflowData.evidencePath !== expected.workflowData.evidencePath ||
    workflowData.boundedDefect !== expected.workflowData.boundedDefect ||
    workflowData.returnTarget !== expected.workflowData.returnTarget ||
    !sourceRevisionsEqual(existing.metadata.sourceRevisions ?? [], expected.sourceRevisions)
  ) {
    throw new Error("Active Repair Work Card output does not match the exact Repair Architect handoff authority.");
  }
}

function sourceRevisionsEqual(actual: SourceRevision[], expected: SourceRevision[]): boolean {
  return actual.length === expected.length && actual.every((source, index) =>
    source.path === expected[index].path && source.revision === expected[index].revision
  );
}

function outputMetadata(input: {
  workspaceRoot: string;
  relativePath: string;
  phaseId: string;
  repairId: string;
  parentWorkCardId: string;
  workflowData: Record<string, unknown>;
  sourceRevisions: Array<{ path: string; revision: number }>;
}): CanonicalDocumentMetadata {
  const existing = readExistingCanonical(input.workspaceRoot, input.relativePath);
  return {
    schemaVersion: 1,
    artifactType: "repair-work-card",
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "gatingReview",
    identity: {
      phaseId: input.phaseId,
      workCardId: input.repairId,
      repairId: input.repairId,
      parentWorkCardId: input.parentWorkCardId,
    },
    sourceRevisions: input.sourceRevisions,
    workflowData: mergeRepositoryAuthorityIntoWorkflowData(
      repairWorkflowData(input),
      inheritRepositoryAuthorityFromSourceRevisions(input.workspaceRoot, input.sourceRevisions),
    ),
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function repairWorkflowData(input: {
  repairId: string;
  parentWorkCardId: string;
  workflowData: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    repairId: input.repairId,
    parentWorkCardId: input.parentWorkCardId,
    originalParentWorkCardId: input.workflowData.originalParentWorkCardId,
    origin: input.workflowData.origin,
    evidencePath: input.workflowData.evidencePath,
    boundedDefect: input.workflowData.boundedDefect,
    returnTarget: input.workflowData.returnTarget,
  };
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}

function buildRepairWorkCardPreparedInstruction(
  workspaceRoot: string,
  context: RepairWorkCardContext,
  submission: ArchitectDraftSubmission<typeof slotId>,
  sourceHandoff: SourceRevision,
): string {
  const draftPath = submission.expectedDraftSlots[0].draftRelativePath;
  const boundedDefect = requiredString(context.workflowData.boundedDefect, "boundedDefect");
  const evidencePath = requiredString(context.workflowData.evidencePath, "evidencePath");
  const returnTarget = requiredString(context.workflowData.returnTarget, "returnTarget");
  const origin = requiredString(context.workflowData.origin, "origin");
  const validationRecordPath = origin === "postValidationRecord"
    ? requiredString(context.workflowData.validationRecordPath ?? evidencePath, "validationRecordPath")
    : "Not applicable for pre-validation report repair.";
  const implementerReportPath = origin === "postValidationRecord"
    ? requiredString(context.workflowData.implementerReportPath, "implementerReportPath")
    : evidencePath;
  const formalWorkCardPath = stringValue(context.workflowData.formalWorkCardPath) ??
    "Not recorded in the Repair evidence.";
  const revisionInstructionLines = currentOperatorRevisionInstructionLines(context.existing);
  const promptWorkflowData = context.handoff.metadata?.canonical?.workflowData ?? {};
  return [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, promptWorkflowData),
    "",
    "This is the Repair Work Card Architect session.",
    "This is the prepared Repair Work Card Architect output handoff.",
    "Do not inspect or write any other repository or workspace.",
    "Treat the Validation Record as the repair authority. Do not invent or request a separate advisory-review document.",
    "Read the Validation Record first when this is a post-validation repair.",
    `- Validation Record path: ${validationRecordPath}`,
    `- Implementer Report path: ${implementerReportPath}`,
    `- Formal Work Card path: ${formalWorkCardPath}`,
    "",
    "Read the exact current Approved Repair Architect handoff:",
    `- Handoff path: ${sourceHandoff.path}`,
    `- Handoff revision: ${sourceHandoff.revision}`,
    `Phase ID: ${context.phaseId}`,
    `Repair ID: ${context.repairId}`,
    `Parent Work Card: ${context.parentWorkCardId}`,
    `Bounded defect: ${boundedDefect}`,
    `Source evidence path: ${evidencePath}`,
    `Repair handoff path: ${context.handoff.markdownPath}`,
    `Return target: ${returnTarget}`,
    `Final Repair Work Card target: ${context.targetPath}`,
    `Temporary body-only draft path: ${draftPath}`,
    "If any exact source path above is absent from the bound workspace, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.",
    "",
    ...revisionInstructionLines,
    "Evidence inputs:",
    ...context.sourceRevisions.map((source) => `- ${source.path} revision ${source.revision}`),
    "",
    "Write one complete Repair Work Card body with exactly this structure:",
    `# ${context.repairId} \u2014 ${boundedDefect}`,
    ...repairWorkCardHeadings.map((heading) => `## ${heading}`),
    "",
    "The Return Target section must include the exact return target above.",
    "Every heading must appear exactly once and contain substantive content.",
    "Do not include application metadata delimiters, canonical metadata, source revisions, final write metadata, fallback fields, or hidden authority values.",
    "ChampCity A/I owns validation, canonical metadata, promotion, final writes, review state, and cleanup.",
    "",
    "When the body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    ...buildCreateMarkdownArtifactJsonBlock(
      workspaceRoot,
      draftPath,
      "<complete body-only Repair Work Card Markdown>",
      promptWorkflowData,
    ),
    "```",
    "After the draft is created, respond with a concise draft-created confirmation.",
  ].join("\n");
}

function currentOperatorRevisionInstructionLines(existing?: PlanningDocumentSummary): string[] {
  if (existing?.effectiveDisposition !== "RevisionRequested") {
    return [];
  }
  const notes = existing.metadata.canonical?.documentDisposition.notes?.trim();
  if (!notes) {
    throw new Error("RevisionRequested Repair Work Card requires current Operator revision instructions.");
  }
  return ["Current Operator revision instructions:", notes, ""];
}

function substantiveMarkdown(value: string, label: string): string {
  const body = value.trim();
  if (!body) {
    throw new Error(`${label} output requires substantive Markdown.`);
  }
  if (body.includes(metadataOpenDelimiter) || body.includes(metadataCloseDelimiter)) {
    throw new Error(`${label} output must not contain application metadata delimiters.`);
  }
  return body;
}

const repairWorkCardHeadings = [
  "Confirmed Defect",
  "Source Evidence",
  "Objective",
  "Runtime Sequence",
  "Required Changes",
  "Preserved Behavior",
  "Authorized Surface",
  "Acceptance Criteria",
  "Negative Constraints",
  "Return Target",
  "Implementer Report Requirements",
  "Manual Validation",
] as const;

function validateRepairWorkCardBody(
  bodyMarkdown: string,
  _repairId: string,
  returnTarget: unknown,
): void {
  substantiveMarkdown(bodyMarkdown, "Repair Work Card");
  if (typeof returnTarget === "string" && !bodyMarkdown.includes(returnTarget)) {
    throw new Error("Repair Work Card Return Target section must agree with the handoff return target.");
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Repair Architect handoff is missing ${field}.`);
  }
  return value.trim();
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function revisionForSourcePath(sources: SourceRevision[], sourcePath?: string): number | undefined {
  if (!sourcePath) {
    return undefined;
  }
  return sources.find((source) => source.path === sourcePath)?.revision;
}

function sourcePathForArtifactType(sources: SourceRevision[], artifactType: "formal-work-card" | "implementer-report"): string | undefined {
  return sources.find((source) => {
    const normalized = source.path.replace(/\\/g, "/").toLowerCase();
    return artifactType === "formal-work-card"
      ? normalized.includes("/work_cards/")
      : normalized.includes("/implementer_reports/");
  })?.path;
}

function nextRepairId(workspaceRoot: string, phaseId: string, parentId: string): string {
  const regex = new RegExp(`^${parentId}-REPAIR(\\d+)`, "i");
  const max = listPlanningDocuments(workspaceRoot)
    .filter((document) =>
      document.markdownPath.includes(`planning/phases/${phaseId}/Work_Cards/`) ||
      document.markdownPath.includes(`planning/phases/${phaseId}/Architect_Handoffs/`)
    )
    .map((document) =>
      document.displayFilename.match(regex)?.[1] ??
      (typeof document.metadata.canonical?.workflowData.repairId === "string"
        ? document.metadata.canonical.workflowData.repairId.match(regex)?.[1]
        : undefined)
    )
    .filter((value): value is string => Boolean(value))
    .reduce((highest, value) => Math.max(highest, Number(value)), 0);
  return `${parentId}-REPAIR${String(max + 1).padStart(2, "0")}`;
}
