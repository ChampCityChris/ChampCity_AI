import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export interface FormalWorkCardResult {
  phaseId: string;
  workCardId: string;
  markdownPath: string;
}

export interface WorkCardBuildingEligibility {
  eligible: boolean;
  reason: string;
}

export function createFormalWorkCardFromIntakeHandoff(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): FormalWorkCardResult {
  requiredApproved(
    workspaceRoot,
    `planning/phases/${phaseId}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_${workCardId}`,
    ".md",
  );
  const content = {
    implementationContract: {
      scope: "Architect-authored implementation scope required before approval.",
      nonScope: "No out-of-scope implementation is authorized.",
      risks: [],
      authorizedFilesAndTests: [],
      acceptanceCriteria: [],
      validationExpectations: ["npm run typecheck", "npm run build", "npm test"],
      implementerInstructions: "Implement only this approved Formal Work Card.",
      requiredReportContract: "Write the required Implementer Report for this Work Card.",
      manualValidation: "Operator manual validation remains required after implementation.",
    },
  };
  const handoff = requiredApproved(
    workspaceRoot,
    `planning/phases/${phaseId}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_${workCardId}`,
    ".md",
  );
  const markdownPath = formalWorkCardTargetFromHandoff(handoff, phaseId, workCardId);
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: markdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "formal-work-card",
      artifactRevision: 1,
      participationRole: "gatingReview",
      identity: { phaseId, workCardId, candidateId: workCardId, title: workCardId },
      sourceRevisions: [{ path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 }],
      workflowData: {
        phaseId,
        workCardId,
        candidateId: workCardId,
        implementationContract: content.implementationContract,
        returnToPhasePlanningOnRejected: true,
      },
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Formal Work Card - ${workCardId}\n\n## Implementation Contract\n\nScope, non-scope, risks, authorized files/tests, acceptance criteria, validation expectations, Implementer instructions, report contract, and manual validation are required before approval.\n`,
  });

  return {
    phaseId,
    workCardId,
    markdownPath,
  };
}

export function setFormalWorkCardDisposition(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  status: DocumentDispositionStatus,
): PlanningDocumentSummary {
  const formal = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  return setDocumentDisposition(workspaceRoot, formal.logicalDocumentId, status);
}

export function getWorkCardBuildingEligibility(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): WorkCardBuildingEligibility {
  const formal = findByPrefix(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  if (!formal) {
    return { eligible: false, reason: "Formal Work Card is required." };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, formal.logicalDocumentId);
  const eligible =
    formal.effectiveDisposition === "Approved" &&
    formal.documentReadState === "readable" &&
    freshness.state === "fresh";
  if (eligible) {
    return { eligible: true, reason: "Approved Formal Work Card is the Work Card Building instruction." };
  }
  if (formal.effectiveDisposition === "Rejected") {
    return { eligible: false, reason: "Rejected Formal Work Card must return to Phase Planning bundle revision." };
  }
  return { eligible: false, reason: "Work Card Building requires a readable, fresh, Approved Formal Work Card." };
}

export function reviseFormalWorkCard(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): void {
  const formal = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  savePlanningDocumentRevision(workspaceRoot, formal.logicalDocumentId);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  if (!document.markdownPath) {
    throw new Error(`Canonical Markdown input is required: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Formal Work Card document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".md") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(prefix))
    .filter((document) => document.markdownPath.endsWith(extension))
    .at(-1);
}

function formalWorkCardTargetFromHandoff(
  handoff: PlanningDocumentSummary,
  phaseId: string,
  workCardId: string,
): string {
  const target = handoff.metadata.canonical?.workflowData.formalWorkCardTarget;
  if (typeof target === "string" && target.endsWith(".md")) {
    return target;
  }
  return `planning/phases/${phaseId}/Work_Cards/${workCardId}_work_card.md`;
}
