import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import {
  resolvePlanningProjectionContext,
  type PlanningProjectionContext,
} from "../documents/planningProjectionContext";
import { getWorkCardBuildingReviewProjection } from "../workCardBuilding/workCardBuildingReviewService";
import { resolveTerminalApprovedRepairImplementationContext } from "../workCardRepair/workCardRepairService";

export type EffectiveWorkCardCompletionState =
  | "incomplete"
  | "awaiting-validation"
  | "revision-requested"
  | "approved";

export interface EffectiveWorkCardCompletion {
  state: EffectiveWorkCardCompletionState;
  complete: boolean;
  phaseId: string;
  parentWorkCardId: string;
  executionWorkCardId: string;
  executionKind: "parent" | "repair";
  formalWorkCard?: PlanningDocumentSummary;
  implementerReport?: PlanningDocumentSummary;
  implementerReportRevision?: number;
  validationRecord?: PlanningDocumentSummary;
  validationDisposition?: "Approved" | "RevisionRequested";
  repairId?: string;
  sourceEvidence: string[];
  reason: string;
}

export function resolveEffectiveWorkCardCompletion(
  workspaceRoot: string,
  phaseId: string,
  parentWorkCardId: string,
  planningContext?: PlanningProjectionContext,
): EffectiveWorkCardCompletion {
  planningContext = resolvePlanningProjectionContext(workspaceRoot, planningContext);
  const terminalRepair = resolveTerminalApprovedRepairImplementationContext(
    workspaceRoot,
    phaseId,
    parentWorkCardId,
    planningContext,
  );
  if (terminalRepair.status === "ready") {
    return resolveExecutionCompletion(workspaceRoot, {
      phaseId,
      parentWorkCardId,
      executionWorkCardId: terminalRepair.context.repairId,
      executionKind: "repair",
      repairId: terminalRepair.context.repairId,
      formalWorkCardPath: terminalRepair.context.targetPath,
      baseEvidence: terminalRepair.evidencePaths,
    }, planningContext);
  }
  if (terminalRepair.evidencePaths.length > 0) {
    return {
      state: "incomplete",
      complete: false,
      phaseId,
      parentWorkCardId,
      executionWorkCardId: parentWorkCardId,
      executionKind: "parent",
      sourceEvidence: unique(terminalRepair.evidencePaths),
      reason: terminalRepair.reason,
    };
  }

  return resolveExecutionCompletion(workspaceRoot, {
    phaseId,
    parentWorkCardId,
    executionWorkCardId: parentWorkCardId,
    executionKind: "parent",
    baseEvidence: [],
  }, planningContext);
}

function resolveExecutionCompletion(
  workspaceRoot: string,
  input: {
    phaseId: string;
    parentWorkCardId: string;
    executionWorkCardId: string;
    executionKind: "parent" | "repair";
    formalWorkCardPath?: string;
    repairId?: string;
    baseEvidence: string[];
  },
  planningContext?: PlanningProjectionContext,
): EffectiveWorkCardCompletion {
  let projection: ReturnType<typeof getWorkCardBuildingReviewProjection>;
  try {
    projection = getWorkCardBuildingReviewProjection(
      workspaceRoot,
      input.phaseId,
      input.executionWorkCardId,
      planningContext,
    );
  } catch (error) {
    return {
      state: "incomplete",
      complete: false,
      phaseId: input.phaseId,
      parentWorkCardId: input.parentWorkCardId,
      executionWorkCardId: input.executionWorkCardId,
      executionKind: input.executionKind,
      repairId: input.repairId,
      sourceEvidence: unique(input.baseEvidence),
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  const documents = listPlanningDocuments(planningContext ?? workspaceRoot);
  const formalWorkCardPath = input.formalWorkCardPath ?? projection.formalWorkCardPath;
  const formalWorkCard = documents.find((document) => document.markdownPath === formalWorkCardPath);
  const implementerReport = documents.find((document) =>
    document.markdownPath === projection.implementerReportPath
  );
  const base = {
    phaseId: input.phaseId,
    parentWorkCardId: input.parentWorkCardId,
    executionWorkCardId: input.executionWorkCardId,
    executionKind: input.executionKind,
    formalWorkCard,
    implementerReport,
    planningContext,
    implementerReportRevision: implementerReport
      ? implementerReport.metadata.artifactRevision ?? 1
      : undefined,
    repairId: input.repairId,
  };
  const reportEvidence = unique([
    ...input.baseEvidence,
    formalWorkCardPath,
    ...(implementerReport ? [implementerReport.markdownPath] : []),
  ]);
  if (projection.reportReadiness !== "ready-for-review" || !implementerReport) {
    return {
      ...base,
      state: "incomplete",
      complete: false,
      sourceEvidence: reportEvidence,
      reason: projection.reportReadinessReason,
    };
  }

  const validationRecords = exactCurrentValidationRecords(
    workspaceRoot,
    documents,
    input.phaseId,
    input.executionWorkCardId,
    implementerReport,
    planningContext,
  );
  if (validationRecords.length !== 1) {
    return {
      ...base,
      state: "awaiting-validation",
      complete: false,
      sourceEvidence: reportEvidence,
      reason: validationRecords.length > 1
        ? "Multiple readable, fresh final Validation Records conflict for the exact current Implementer Report revision."
        : "The exact current Implementer Report revision has no readable, fresh final Validation Record.",
    };
  }

  const validationRecord = validationRecords[0];
  const validationDisposition = validationRecord.effectiveDisposition as "Approved" | "RevisionRequested";
  return {
    ...base,
    state: validationDisposition === "Approved" ? "approved" : "revision-requested",
    complete: validationDisposition === "Approved",
    validationRecord,
    validationDisposition,
    sourceEvidence: unique([...reportEvidence, validationRecord.markdownPath]),
    reason: validationDisposition === "Approved"
      ? `Exact current ${input.executionKind === "repair" ? "Repair " : ""}validation approves ${input.parentWorkCardId}.`
      : `Exact current ${input.executionKind === "repair" ? "Repair " : ""}validation requests revision for ${input.parentWorkCardId}.`,
  };
}

function exactCurrentValidationRecords(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  phaseId: string,
  executionWorkCardId: string,
  report: PlanningDocumentSummary,
  planningContext?: PlanningProjectionContext,
): PlanningDocumentSummary[] {
  const reportRevision = report.metadata.artifactRevision ?? 1;
  return documents
    .filter((document) => document.metadata.artifactType === "validation-record")
    .filter((document) => document.metadata.phaseId === phaseId || document.metadata.canonical?.identity.phaseId === phaseId)
    .filter((document) =>
      document.metadata.workCardId === executionWorkCardId ||
      document.metadata.canonical?.identity.workCardId === executionWorkCardId
    )
    .filter((document) => document.documentReadState === "readable" && !document.readError)
    .filter((document) => (document.metadata.sourceRevisions ?? []).some((source) =>
      source.path === report.markdownPath && source.revision === reportRevision
    ))
    .filter((document) => evaluateDocumentFreshness(planningContext ?? workspaceRoot, document.logicalDocumentId).state === "fresh")
    .filter((document) =>
      document.effectiveDisposition === "Approved" ||
      document.effectiveDisposition === "RevisionRequested"
    );
}

function unique(values: string[]): string[] {
  return values.filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
}
