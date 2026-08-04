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
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  getActiveArchitectOutputRuntimeSubmission,
  getArchitectOutputRuntimeStatus,
  prepareArchitectOutputRuntimeSubmission,
  type ActiveArchitectOutputRuntimeSubmission,
} from "../architectOutputs/architectOutputRuntimeService";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";

export type RepairOrigin = "preValidationReportReview" | "postValidationRecord";

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
            workflowData: repairWorkflowData(context),
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
  buildPreparedInstruction({ submission, sourceHandoff, domainContext: context }) {
    return buildRepairWorkCardPreparedInstruction(context, submission, sourceHandoff);
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
  const originalParentId = parentWorkCardId.replace(/-REPAIR\d+$/i, "");
  const repairId = nextRepairId(workspaceRoot, phaseId, originalParentId);
  const slug = defect.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "repair";
  const handoffMarkdownPath = `planning/phases/${phaseId}/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_${repairId}.md`;
  const repairMarkdownPath = `planning/phases/${phaseId}/Work_Cards/${repairId}_${slug}.md`;
  const returnTarget = origin === "preValidationReportReview"
    ? "work-card-building-review"
    : "work-card-validation";
  const content = {
    handoffKind: "repair",
    repairId,
    originalParentWorkCardId: originalParentId,
    origin,
    evidencePath,
    boundedDefect: defect,
    returnTarget,
  };
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoffMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "generated-handoff",
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      identity: { handoffKind: "repair", phaseId, repairId },
      sourceRevisions: [{ path: evidence.markdownPath, revision: evidence.metadata.artifactRevision ?? 1 }],
      workflowData: { ...content, repairWorkCardTarget: repairMarkdownPath },
      documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Repair Architect Handoff\n\nRepair Work Card Markdown: ${repairMarkdownPath}\n`,
  });
  return { repairId, handoffMarkdownPath, repairMarkdownPath };
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
      workflowData,
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
    workflowData,
    targetPath,
    sourceRevisions: [
      ...(handoff.metadata.sourceRevisions ?? []),
      { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
    ],
    existing,
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
    workflowData: repairWorkflowData(input),
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
  context: RepairWorkCardContext,
  submission: ArchitectDraftSubmission<typeof slotId>,
  sourceHandoff: SourceRevision,
): string {
  const draftPath = submission.expectedDraftSlots[0].draftRelativePath;
  const boundedDefect = requiredString(context.workflowData.boundedDefect, "boundedDefect");
  const evidencePath = requiredString(context.workflowData.evidencePath, "evidencePath");
  const returnTarget = requiredString(context.workflowData.returnTarget, "returnTarget");
  const revisionInstructionLines = currentOperatorRevisionInstructionLines(context.existing);
  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "This is the prepared Repair Work Card Architect output handoff.",
    `Read the exact current Approved Repair Architect handoff: ${sourceHandoff.path} revision ${sourceHandoff.revision}.`,
    `Repair ID: ${context.repairId}`,
    `Parent Work Card: ${context.parentWorkCardId}`,
    `Bounded defect: ${boundedDefect}`,
    `Source evidence path: ${evidencePath}`,
    `Return target: ${returnTarget}`,
    `Final Repair Work Card target: ${context.targetPath}`,
    `Temporary body-only draft path: ${draftPath}`,
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
    "{",
    '  "action": "create_markdown_artifact",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    `    "relativePath": "${draftPath}",`,
    '    "content": "<complete body-only Repair Work Card Markdown>",',
    '    "overwrite": false',
    "  }",
    "}",
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
