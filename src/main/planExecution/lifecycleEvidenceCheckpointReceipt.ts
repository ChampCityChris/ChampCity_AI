import { createHash } from "node:crypto";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { LifecycleEvidenceBoundary, LifecycleEvidenceCheckpointEvidence } from "../../shared/lifecycleEvidenceCheckpointContracts";

const commitPattern = /^[a-f0-9]{40,64}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const identifierPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const branchPattern = /^[a-zA-Z0-9][a-zA-Z0-9._\/-]{0,255}$/;

export const lifecycleCheckpointIdFor = (evidence: LifecycleEvidenceCheckpointEvidence) =>
  createHash("sha256").update(JSON.stringify(evidence)).digest("hex");

export function lifecycleCheckpointSubject(boundary: LifecycleEvidenceBoundary, checkpointId: string): string {
  const label = boundary.kind === "work-item" ? boundary.workItemId : boundary.kind === "phase" ? boundary.phaseId
    : boundary.kind === "research" ? boundary.assessmentId : boundary.planId;
  return `${label}: lifecycle checkpoint ${checkpointId}`;
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && identifierPattern.test(value);
}

function validBoundary(value: unknown): value is LifecycleEvidenceBoundary {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const boundary = value as Record<string, unknown>;
  if (!validIdentifier(boundary.routeDecisionId)) return false;
  if (boundary.kind === "research") return validIdentifier(boundary.assessmentId) && Number.isSafeInteger(boundary.assessmentRevision) && Number(boundary.assessmentRevision) >= 1 &&
    Object.keys(boundary).every((key) => ["kind", "routeDecisionId", "assessmentId", "assessmentRevision"].includes(key));
  if (!validIdentifier(boundary.planId) || !Number.isSafeInteger(boundary.planRevision) || Number(boundary.planRevision) < 1) return false;
  if (boundary.kind === "plan") return Object.keys(boundary).every((key) => ["kind", "routeDecisionId", "planId", "planRevision"].includes(key));
  if (boundary.kind === "phase") return validIdentifier(boundary.phaseId) && Object.keys(boundary).every((key) => ["kind", "routeDecisionId", "planId", "planRevision", "phaseId"].includes(key));
  return boundary.kind === "work-item" && validIdentifier(boundary.workItemId) && validIdentifier(boundary.implementationId) &&
    (boundary.phaseId === undefined || validIdentifier(boundary.phaseId)) &&
    Object.keys(boundary).every((key) => ["kind", "routeDecisionId", "planId", "planRevision", "workItemId", "implementationId", "phaseId"].includes(key));
}

/** The containing single-parent commit supplies the resulting durable checkpoint identity. */
export function readLifecycleCheckpointReceipt(bytes: string, checkpointId: string): LifecycleEvidenceCheckpointEvidence {
  const separator = bytes.indexOf("\n\n");
  if (separator < 0 || !digestPattern.test(checkpointId)) throw Error("Lifecycle checkpoint receipt is invalid.");
  const document = parseCanonicalMarkdownDocument(bytes.slice(separator + 2));
  const evidence = document.metadata.workflowData.evidence as LifecycleEvidenceCheckpointEvidence;
  const files = evidence?.files;
  if (document.metadata.artifactType !== "lifecycle-evidence-checkpoint" || document.metadata.participationRole !== "contextOnly" ||
    !evidence || lifecycleCheckpointIdFor(evidence) !== checkpointId || document.metadata.identity.checkpointId !== checkpointId ||
    document.metadata.identity.intakeId !== evidence.intakeId || document.metadata.identity.boundaryKind !== evidence.boundary?.kind ||
    !validIdentifier(evidence.intakeId) || !validIdentifier(evidence.repositoryId) || !branchPattern.test(evidence.workBranch) ||
    !commitPattern.test(evidence.beforeHead) || !validBoundary(evidence.boundary) || !Array.isArray(files) || !files.length || files.length > 100 ||
    files.some((entry) => !entry || typeof entry.path !== "string" || !entry.path || !digestPattern.test(entry.sha256) ||
      !validIdentifier(entry.artifactType) || !Number.isSafeInteger(entry.artifactRevision) || entry.artifactRevision < 1) ||
    new Set(files.map((entry) => entry.path)).size !== files.length ||
    files.some((entry, index) => index > 0 && files[index - 1].path >= entry.path)) throw Error("Lifecycle checkpoint receipt is invalid.");
  return evidence;
}
