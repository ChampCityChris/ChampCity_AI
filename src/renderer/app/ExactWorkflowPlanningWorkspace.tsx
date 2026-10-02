import {useEffect, useState, type ReactNode} from "react";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import type {ExactWorkflowPlanningModel} from "../../shared/exactWorkflowPlanningContracts";
import type {PlanCandidate} from "../../shared/projectState/planReviewContracts";
import {StructuredArchitectWorkspace} from "./StructuredArchitectWorkspace";
import {WorkflowPlanningMap} from "./WorkflowPlanningMap";

export function ExactWorkflowPlanningWorkspace(props: {workflow: WorkflowInstanceSummary; onReturn: () => void; browserPanel: ReactNode}): JSX.Element {
  const id = props.workflow.workflowId;
  const [model, setModel] = useState<ExactWorkflowPlanningModel | null>(null), [candidate, setCandidate] = useState(""), [notes, setNotes] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [viewed, setViewed] = useState<string | null>(null);
  const [planning, setPlanning] = useState(props.workflow.currentWorkspace.includes("planning") || props.workflow.currentWorkspace === "work-item-map");
  const revision = model?.review ? `${id}:${model.review.cycleId}@${model.review.recordVersion}` : null;
  useEffect(() => {let active = true; if (planning) window.champcity.getExactWorkflowPlanning(id).then(next => {if (active) setModel(next);}).catch(reason => {if (active) setError(String(reason));}); return () => {active = false;};}, [id, planning]);
  async function action(work: () => Promise<void>) {setBusy(true); setError(""); try {await work();} catch (reason) {setError(reason instanceof Error ? reason.message : String(reason));} finally {setBusy(false);}}
  if (!planning) return <StructuredArchitectWorkspace workflowId={id} onReturn={props.onReturn} browserCompanion={props.browserPanel} browserVisible={!!props.browserPanel} onNext={async () => {const next = await window.champcity.prepareExactWorkflowPlanning(id); setModel(next); setPlanning(true);}} />;
  return <section aria-labelledby="workspace-heading" className="workflow-instance-workspace"><header><h1 id="workspace-heading">{props.workflow.workflowType === "issue-resolution" ? "Correction Planning" : "Planning"}</h1><p>{props.workflow.title}</p><button onClick={props.onReturn}>Back to Workflows</button><button disabled={busy} onClick={() => {setPlanning(false); setViewed(null);}}>Architect Assessment</button></header>
    {error ? <p role="alert">{error}</p> : null}{model?.staleReview ? <p role="alert">This Plan needs revision: {model.staleReview.reason}</p> : null}<p>Workflow <code>{id}</code></p>
    {model?.acceptedPlan ? <WorkflowPlanningMap plan={model.acceptedPlan} /> : model?.researchOutcome?.outcome === "no-implementation-plan-required" ? <><h2>Research evidence and outcome</h2><p>{model.researchOutcome.decisionEnabled}</p><p>{model.researchOutcome.successFailureResult}</p><button disabled={busy} onClick={() => void action(async () => {await window.champcity.closeExactResearch(id); props.onReturn();})}>Close Research with approved outcome</button></> : <>
      <button disabled={busy} onClick={() => void action(async () => setModel(await window.champcity.prepareExactWorkflowPlanning(id)))}>Prepare / Refresh handoff</button>
      <button disabled={!model?.handoff || busy} onClick={() => void action(async () => navigator.clipboard.writeText(model!.handoff!))}>Copy handoff</button>
      <label>Architect Plan JSON<textarea maxLength={200000} value={candidate} onChange={event => setCandidate(event.target.value)} /></label>
      <button disabled={busy || !candidate.trim()} onClick={() => void action(async () => {const parsed = JSON.parse(candidate) as PlanCandidate; setModel(await window.champcity.saveExactWorkflowPlan(id, {...parsed, expectedRecordVersion: model?.review?.recordVersion ?? model?.staleReview?.recordVersion})); setCandidate(""); setViewed(null);})}>Save Plan for review</button>
      {model?.review ? <><h2>Plan revision {model.review.recordVersion}</h2><pre>{model.review.markdown}</pre><button onClick={() => setViewed(revision)}>I have reviewed this revision</button><label>Operator notes<textarea maxLength={4096} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        {(["approved", "revision_requested", "rejected"] as const).map(outcome => <button key={outcome} disabled={busy || !revision || viewed !== revision || outcome === "revision_requested" && !notes.trim()} onClick={() => void action(async () => {setModel(await window.champcity.reviewExactWorkflowPlan(id, model!.review!.cycleId, {expectedRecordVersion: model!.review!.recordVersion, outcome, notes})); setViewed(null);})}>{{approved: "Approve Plan", revision_requested: "Request Revision", rejected: "Reject Plan"}[outcome]}</button>)}</> : null}
    </>}<aside aria-label="Embedded Architect">{props.browserPanel}</aside></section>;
}
