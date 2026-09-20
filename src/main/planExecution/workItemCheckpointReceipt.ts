import { createHash } from "node:crypto";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { WorkItemCheckpointEvidence } from "../../shared/workItemCheckpointContracts";

export const checkpointIdFor = (evidence: WorkItemCheckpointEvidence) => createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
/** Canonical Markdown follows the deterministic subject in the commit message; its containing commit supplies the resulting baseline. */
export function readCheckpointReceipt(bytes: string, checkpointId: string) {
  const document = parseCanonicalMarkdownDocument(bytes.slice(bytes.indexOf("\n\n") + 2));
  const evidence = document.metadata.workflowData.evidence as WorkItemCheckpointEvidence;
  if (document.metadata.artifactType !== "work-item-checkpoint" || document.metadata.participationRole !== "contextOnly" ||
    !evidence || checkpointIdFor(evidence) !== checkpointId || document.metadata.identity.checkpointId !== checkpointId ||
    document.metadata.identity.intakeId !== evidence.intakeId || document.metadata.identity.workItemId !== evidence.workItemId ||
    !Array.isArray(evidence.files) || !evidence.files.length || evidence.files.length > 500) throw Error("Checkpoint receipt is invalid.");
  return evidence;
}
