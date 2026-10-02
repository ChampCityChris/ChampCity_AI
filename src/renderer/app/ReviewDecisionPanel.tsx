import type { ArchitectReviewDecisionInput } from "../../shared/projectState/architectReviewContracts";

export function ReviewDecisionPanel(props: {
  label?: string; notes: string; onNotesChange: (notes: string) => void; hasCurrentRevision: boolean;
  busy: boolean; onReview: (input: ArchitectReviewDecisionInput) => void | Promise<void>; expectedRecordVersion: number;
}): JSX.Element {
  const label = props.label ?? "Review Decision";
  return <section className="figma-disposition-panel shared-review-decision" aria-label={label}>
    <header><span>{label}</span></header>
    <label><span>Operator notes</span><textarea maxLength={4096} value={props.notes} onChange={event => props.onNotesChange(event.target.value)} /></label>
    <div className="figma-disposition-row">{(["approved", "revision_requested", "rejected"] as const).map(outcome => <button className="apply-button" key={outcome}
      disabled={props.busy || !props.hasCurrentRevision || (outcome === "revision_requested" && !props.notes.trim())}
      onClick={() => void props.onReview({ expectedRecordVersion: props.expectedRecordVersion, outcome, notes: props.notes })}>
      {{ approved: "Approve", revision_requested: "Revision Requested", rejected: "Reject" }[outcome]}</button>)}</div>
  </section>;
}
