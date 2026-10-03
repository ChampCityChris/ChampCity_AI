import {PlanReviewShell} from "./PlanReviewShell";
import {useEffect, useState, type ReactNode} from "react";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import type {ExactWorkflowPlanningModel} from "../../shared/exactWorkflowPlanningContracts";
import type {PlanCandidate} from "../../shared/projectState/planReviewContracts";
import {StructuredArchitectWorkspace} from "./StructuredArchitectWorkspace";

export function ExactWorkflowPlanningWorkspace(props: {workflow: WorkflowInstanceSummary; onReturn: () => void; browserPanel: ReactNode; onProgressed: () => Promise<void>}): JSX.Element {
  const id = props.workflow.workflowId;
  const [model, setModel] = useState<ExactWorkflowPlanningModel | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [viewed, setViewed] = useState<string | null>(null);
  const planningWorkspace = props.workflow.workflowType === "feature-capability" ? "feature-planning" : props.workflow.workflowType === "issue-resolution" ? "issue-planning" : "planning";
  const [planning, setPlanning] = useState(props.workflow.currentWorkspace === planningWorkspace);
  useEffect(() => {let active = true; if (planning) window.champcity.getExactWorkflowPlanning(id).then(next => {if (active) setModel(next);}).catch(reason => {if (active) setError(String(reason));}); return () => {active = false;};}, [id, planning]);
  async function action(work: () => Promise<void>) {setBusy(true); setError(""); try {await work();} catch (reason) {setError(reason instanceof Error ? reason.message : String(reason));} finally {setBusy(false);}}
  if (!planning) return <StructuredArchitectWorkspace workflowId={id} onApproved={props.onProgressed} onReturn={props.onReturn} browserCompanion={props.browserPanel} browserVisible={!!props.browserPanel} onNext={async () => {const next = await window.champcity.prepareExactWorkflowPlanning(id); if (props.workflow.currentWorkspace === planningWorkspace) {setModel(next); setPlanning(true);} else await props.onProgressed();}} />;
  return <section aria-labelledby="workspace-heading" className="workflow-instance-workspace"><header><h1 id="workspace-heading">{props.workflow.workflowType === "issue-resolution" ? "Correction Planning" : "Planning"}</h1><p>{props.workflow.title}</p><button onClick={props.onReturn}>Back to Workflows</button></header>
    {error ? <p role="alert">{error}</p> : null}{model?.staleReview ? <p role="alert">This Plan needs revision: {model.staleReview.reason}</p> : null}<p>Workflow <code>{id}</code></p>
    {model?.researchOutcome?.outcome === "no-implementation-plan-required" ? <><h2>Research evidence and outcome</h2><p>{model.researchOutcome.decisionEnabled}</p><p>{model.researchOutcome.successFailureResult}</p><button disabled={busy} onClick={() => void action(async () => {await window.champcity.closeExactResearch(id); await props.onProgressed();})}>Close Research with approved outcome</button></> : <>
      <PlanReviewShell title={props.workflow.workflowType === "issue-resolution" ? "Correction Planning" : "Planning"} workflowId={id} browserPanel={props.browserPanel} handoff={model?.handoff} projection={model?.review?.markdown} revision={model?.review?.recordVersion} cycleId={model?.review?.cycleId} disposition={model?.review?.disposition.state} staleReason={model?.staleReview?.reason}
        onPrepare={async () => setModel(await window.champcity.prepareExactWorkflowPlanning(id))}
        onSave={async json => {const parsed = JSON.parse(json) as PlanCandidate; setModel(await window.champcity.saveExactWorkflowPlan(id, {...parsed, expectedRecordVersion: model?.review?.recordVersion ?? model?.staleReview?.recordVersion}));}}
        onReview={async input => {const next = await window.champcity.reviewExactWorkflowPlan(id, model!.review!.cycleId, input); if (input.outcome === "approved") await props.onProgressed(); else setModel(next);}} />
    </>}</section>;
}
