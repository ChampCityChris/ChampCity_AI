import type { WorkItemCheckpointEvidence } from "../../shared/workItemCheckpointContracts";
import type { LifecycleEvidenceCheckpointEvidence } from "../../shared/lifecycleEvidenceCheckpointContracts";
import { readCheckpointReceipt } from "./workItemCheckpointReceipt";
import { lifecycleCheckpointSubject, readLifecycleCheckpointReceipt } from "./lifecycleEvidenceCheckpointReceipt";

export type ApplicationCheckpointReceipt =
  | { kind: "source"; checkpointId: string; evidence: WorkItemCheckpointEvidence }
  | { kind: "lifecycle"; checkpointId: string; evidence: LifecycleEvidenceCheckpointEvidence };

/** Accept only the two deterministic application-owned checkpoint subjects and canonical receipts. */
export function readApplicationCheckpointReceipt(subject: string, message: string): ApplicationCheckpointReceipt {
  const sourceId = /: source checkpoint ([a-f0-9]{64})$/.exec(subject)?.[1];
  if (sourceId) {
    const evidence = readCheckpointReceipt(message, sourceId);
    if (subject !== `${evidence.workItemId}: source checkpoint ${sourceId}`) throw Error("Source checkpoint subject does not match its receipt.");
    return { kind: "source", checkpointId: sourceId, evidence };
  }
  const lifecycleId = /: lifecycle checkpoint ([a-f0-9]{64})$/.exec(subject)?.[1];
  if (lifecycleId) {
    const evidence = readLifecycleCheckpointReceipt(message, lifecycleId);
    if (subject !== lifecycleCheckpointSubject(evidence.boundary, lifecycleId)) throw Error("Lifecycle checkpoint subject does not match its receipt.");
    return { kind: "lifecycle", checkpointId: lifecycleId, evidence };
  }
  throw Error("Commit has no recognized application checkpoint receipt.");
}
