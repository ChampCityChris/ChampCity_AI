import { workItemCloseReturnPath, workItemArtifactIdentity, workItemMatchesScope, type WorkItemArtifactScope } from "./workItemArtifactScope";
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import type { PlanningProjectionContext } from "../documents/planningProjectionContext";
import type { EffectiveWorkCardCompletion } from "./effectiveWorkCardCompletion";

export interface WorkCardCloseReturnConsumption {
  consumed: boolean;
  recordPath: string;
  record?: PlanningDocumentSummary;
  reason: string;
}

export interface WorkCardCloseReturnConsumptionResult {
  phaseId?: string;
  parentWorkCardId: string;
  recordPath: string;
  artifactRevision: number;
  reusedExisting: boolean;
}

export function workCardCloseReturnRecordPath(
  phaseId: WorkItemArtifactScope,
  parentWorkCardId: string,
): string {
  return workItemCloseReturnPath(phaseId, parentWorkCardId);
}

export function resolveWorkCardCloseReturnConsumption(
  workspaceRoot: string,
  completion: EffectiveWorkCardCompletion,
  planningContext?: PlanningProjectionContext,
): WorkCardCloseReturnConsumption {
  const recordPath = workCardCloseReturnRecordPath(completionScope(completion), completion.parentWorkCardId);
  if (!isApprovedCompletion(completion)) {
    return {
      consumed: false,
      recordPath,
      reason: "Close-return consumption requires exact current Approved completion evidence.",
    };
  }

  const record = listPlanningDocuments(planningContext ?? workspaceRoot)
    .find((document) => document.markdownPath === recordPath);
  if (!record) {
    return {
      consumed: false,
      recordPath,
      reason: "No close-return consumption record exists for the current completion evidence.",
    };
  }
  if (
    record.documentReadState !== "readable" ||
    record.readError ||
    record.metadata.artifactType !== "work-card-close-return-record" ||
    record.metadata.participationRole !== "contextOnly" ||
    record.effectiveDisposition !== "Approved"
  ) {
    return {
      consumed: false,
      recordPath,
      record,
      reason: "The close-return record is not readable current Approved context-only evidence.",
    };
  }
  if (evaluateDocumentFreshness(planningContext ?? workspaceRoot, record.logicalDocumentId).state !== "fresh") {
    return {
      consumed: false,
      recordPath,
      record,
      reason: "The close-return record is stale for its source completion evidence.",
    };
  }

  const validationRecord = completion.validationRecord;
  const validationRevision = validationRecord.metadata.artifactRevision ?? 1;
  const canonical = record.metadata.canonical;
  const sourceMatches = (record.metadata.sourceRevisions ?? []).some((source) =>
    source.path === validationRecord.markdownPath && source.revision === validationRevision
  ) && (typeof completionScope(completion) === "string" || canonical?.workflowData.completionValidationDigest === validationDigest(workspaceRoot, validationRecord.markdownPath));
  const identityMatches =
    canonical && workItemMatchesScope(canonical.identity, completionScope(completion), completion.parentWorkCardId) &&
    canonical.identity.parentWorkCardId === completion.parentWorkCardId &&
    canonical.identity.executionWorkCardId === completion.executionWorkCardId &&
    canonical.identity.executionKind === completion.executionKind &&
    optionalStringMatches(canonical.identity.repairId, completion.repairId);
  const workflowMatches =
    canonical?.workflowData.transition === "close-return-consumed" &&
    canonical.workflowData.returnTarget === closeReturnTarget(completion) &&
    canonical.workflowData.completionValidationRecordPath === validationRecord.markdownPath &&
    canonical.workflowData.parentWorkCardId === completion.parentWorkCardId &&
    canonical.workflowData.executionWorkCardId === completion.executionWorkCardId &&
    canonical.workflowData.executionKind === completion.executionKind &&
    optionalStringMatches(canonical.workflowData.repairId, completion.repairId);
  if (!sourceMatches || !identityMatches || !workflowMatches) {
    return {
      consumed: false,
      recordPath,
      record,
      reason: "The close-return record does not match the exact current completion evidence.",
    };
  }

  return {
    consumed: true,
    recordPath,
    record,
    reason: "The exact current completion evidence has been consumed by Close / Next.",
  };
}

export function consumeWorkCardCloseReturn(
  workspaceRoot: string,
  completion: EffectiveWorkCardCompletion,
): WorkCardCloseReturnConsumptionResult {
  if (!isApprovedCompletion(completion)) {
    throw new Error("Close / Next requires exact current Approved completion evidence.");
  }

  const current = resolveWorkCardCloseReturnConsumption(workspaceRoot, completion);
  if (current.consumed && current.record) {
    return {
      phaseId: completion.phaseId,
      parentWorkCardId: completion.parentWorkCardId,
      recordPath: current.recordPath,
      artifactRevision: current.record.metadata.artifactRevision ?? 1,
      reusedExisting: true,
    };
  }

  const absolutePath = path.join(path.resolve(workspaceRoot), current.recordPath);
  let artifactRevision = 1;
  if (fs.existsSync(absolutePath)) {
    const existing = parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
    if (
      existing.metadata.artifactType !== "work-card-close-return-record" ||
      existing.metadata.identity.parentWorkCardId !== completion.parentWorkCardId
    ) {
      throw new Error(`Existing close-return target is not the canonical record for ${completion.parentWorkCardId}.`);
    }
    artifactRevision = existing.metadata.artifactRevision + 1;
  }

  const validationRecord = completion.validationRecord;
  const validationRevision = validationRecord.metadata.artifactRevision ?? 1;
  const repairIdentity = completion.repairId ? { repairId: completion.repairId } : {};
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: current.recordPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "work-card-close-return-record",
      artifactRevision,
      participationRole: "contextOnly",
      identity: {
        ...workItemArtifactIdentity(completionScope(completion), completion.parentWorkCardId),
        parentWorkCardId: completion.parentWorkCardId,
        executionWorkCardId: completion.executionWorkCardId,
        executionKind: completion.executionKind,
        ...repairIdentity,
      },
      sourceRevisions: [
        { path: validationRecord.markdownPath, revision: validationRevision },
      ],
      workflowData: {
        transition: "close-return-consumed",
        ...(typeof completionScope(completion) === "string" ? {} : { completionValidationDigest: validationDigest(workspaceRoot, validationRecord.markdownPath) }),
        returnTarget: closeReturnTarget(completion),
        completionValidationRecordPath: validationRecord.markdownPath,
        parentWorkCardId: completion.parentWorkCardId,
        executionWorkCardId: completion.executionWorkCardId,
        executionKind: completion.executionKind,
        ...repairIdentity,
      },
      documentDisposition: {
        status: "Approved",
        notes: "",
        reviewedAt: new Date().toISOString(),
      },
    },
    bodyMarkdown: [
      `# Work Card Close Return - ${completion.parentWorkCardId}`,
      "",
      "Close / Next was consumed for the exact current Approved completion evidence.",
      "",
      `Completion Validation Record: ${validationRecord.markdownPath}`,
      `Return target: ${closeReturnTarget(completion)}`,
      "",
    ].join("\n"),
  });

  return {
    phaseId: completion.phaseId,
    parentWorkCardId: completion.parentWorkCardId,
    recordPath: current.recordPath,
    artifactRevision,
    reusedExisting: false,
  };
}

function isApprovedCompletion(
  completion: EffectiveWorkCardCompletion,
): completion is EffectiveWorkCardCompletion & { validationRecord: PlanningDocumentSummary } {
  return completion.state === "approved" && completion.complete && Boolean(completion.validationRecord);
}

function optionalStringMatches(value: unknown, expected: string | undefined): boolean {
  return expected ? value === expected : value === undefined;
}

function completionScope(completion: EffectiveWorkCardCompletion): WorkItemArtifactScope {
  const scope = completion.scope ?? completion.phaseId;
  if (!scope) throw Error("Completion requires its exact Work Item artifact scope.");
  return scope;
}
function closeReturnTarget(completion: EffectiveWorkCardCompletion): string {
  return typeof completionScope(completion) === "string" ? "phase-work-card-selection" : "routed-work-item-selection";
}
function validationDigest(root: string, relativePath: string): string {
  return createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}
