import type {ReactNode} from "react";
import type {StructuredWorkItemReview} from "../../shared/structuredWorkItemReviewContracts";
/** SQL evidence presentation only; domain mutations remain adapter actions. */
export function ReviewValidationShell(props:{review:StructuredWorkItemReview|null; children:ReactNode}) {
  const review=props.review;
  return <section aria-label="Structured Review and Validation"><h3>Review and Validation</h3>
    {review ? <><p>Exact WorkItem <code>{review.workItem.id}</code> · SQL revision {review.workItem.recordVersion}</p>
      <h4>Implementation evidence</h4><ul>{review.implementations.map(record=><li key={record.id}>{record.id} · {record.body.outcome} · {record.body.summary}</li>)}</ul>
      <h4>Tester evidence</h4><ul>{review.testers.map(record=><li key={record.id}>{record.id} · attempt {record.body.implementationRecordId} · {record.body.recommendation} · {record.body.rationale}</li>)}</ul>
      <p>Current attempt: {review.validation.implementationRecordId ?? "none"} · current Tester: {review.validation.testerResultId ?? "required before completion"}</p>
      <ul>{review.validations.map(record=><li key={record.id}>Validation {record.id} · Criterion {record.body.targetEntityId}@{record.body.targetRecordVersion} · {record.body.validationMode} · {record.body.outcome}</li>)}</ul>
      <ul>{review.decisions.map(record=><li key={record.id}>Decision {record.id} · {record.body.outcome} · {record.body.rationale}</li>)}</ul>
      <ul>{review.evidence.map(record=><li key={record.id}>Evidence {record.id} · {record.body.description}</li>)}</ul>
      <ul>{review.checkpoints.map(record=><li key={record.id}>SourceCheckpoint {record.id} · {record.body.checkpointState}</li>)}</ul>
      <p>Repair lineage: {review.repairs.map(edge=>`${edge.repairId} repairs ${edge.parentId}`).join("; ") || "none"}</p>
      <details><summary>Generated SQL review report</summary><pre>{review.markdown}</pre></details>
    </> : null}{props.children}
  </section>;
}
