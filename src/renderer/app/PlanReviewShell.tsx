import {useState, type ReactNode} from "react";
import {ArchitectWorkspaceShell} from "./ArchitectWorkspaceShell";
import type {ArchitectReviewDecisionInput} from "../../shared/projectState/architectReviewContracts";
import { ReviewDecisionPanel } from "./ReviewDecisionPanel";

export function PlanReviewShell(props: {title: string; workflowId: string; browserPanel: ReactNode; handoff?: string | null; projection?: string; revision?: number; cycleId?: string; disposition?: string; staleReason?: string; content?: ReactNode; onPrepare: () => Promise<void>; onSave: (json: string) => Promise<void>; onReview: (input: ArchitectReviewDecisionInput) => Promise<void>}): JSX.Element {
  const [candidate, setCandidate] = useState(""), [notes, setNotes] = useState(""), [error, setError] = useState(""), [feedback, setFeedback] = useState(""), [busy, setBusy] = useState(false);
  const hasCurrentRevision = !!props.revision && !!props.cycleId;
  async function action(work: () => Promise<void>, message: string) {setBusy(true); setError(""); setFeedback(""); try {await work(); setFeedback(message);} catch (reason) {setError(String(reason));} finally {setBusy(false);}}
  return <ArchitectWorkspaceShell label={props.title} browserVisible={!!props.browserPanel} browserCompanion={props.browserPanel}
    context={<>{props.disposition === "revision_requested" ? <p>Revision requested. Include the Operator’s notes in the next Architect handoff and submit a revised structured candidate.</p> : null}{props.staleReason ? <p role="alert">Fresh structured output required: {props.staleReason}</p> : null}</>}
    feedback={<>{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}</>}
    headerActions={<><button disabled={busy} onClick={() => void action(props.onPrepare, "Handoff refreshed from current SQL sources.")}>Prepare / Refresh</button><button disabled={busy || !props.handoff} onClick={() => void action(async () => navigator.clipboard.writeText(`${props.handoff}\n\nOperator revision instructions: ${notes}`), "Handoff copied.")}>Copy handoff</button></>}
    reviewContent={<>{props.content}{props.projection ? <pre>{props.projection}</pre> : <p>No structured candidate saved.</p>}<label>Architect Planning JSON<textarea maxLength={200000} value={candidate} onChange={event => setCandidate(event.target.value)} /></label><button disabled={busy || !candidate.trim()} onClick={() => void action(async () => {await props.onSave(candidate); setCandidate("");}, "Structured candidate saved for review.")}>Save for review</button></>}
    reviewControls={hasCurrentRevision ? <ReviewDecisionPanel notes={notes} onNotesChange={setNotes} hasCurrentRevision={hasCurrentRevision} busy={busy} expectedRecordVersion={props.revision!}
      onReview={input => action(async () => {await props.onReview(input);}, "Exact revision disposition recorded.")} /> : null} />;
}
