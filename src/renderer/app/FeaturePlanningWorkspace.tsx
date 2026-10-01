import { StructuredArchitectWorkspace } from "./StructuredGreenfieldArchitectWorkspace";
import { useEffect, useState, type ReactNode } from "react";
import type { FeaturePlanningProjection } from "../../shared/featurePlanningContracts";
import type { WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import type { WorkflowExecutionPlanView } from "../../shared/projectState/projectStateService";
import { WorkflowPlanningMap } from "./WorkflowPlanningMap";
import { runPlanningDraftAction } from "./planningDraftAction";


export function FeaturePlanningWorkspace({ workflow, onReturn, browserPanel }: { workflow: WorkflowInstanceSummary; onReturn: () => void; browserPanel: ReactNode }): JSX.Element {
  const [model, setModel] = useState<FeaturePlanningProjection | null>(null); const [draft, setDraft] = useState(""); const [feedback, setFeedback] = useState(""); const [error, setError] = useState("");
  const refresh = async () => { try { const next = await window.champcity.getFeaturePlanning(workflow.workflowId); setModel(next); setDraft(next.draft?.content ?? ""); setError(""); } catch (e) { setError(String(e)); } };
  useEffect(() => { void refresh(); }, [workflow.workflowId]);
  const act = async (action: Parameters<typeof window.champcity.actOnFeaturePlanning>[1]) => { try { const next = await window.champcity.actOnFeaturePlanning(workflow.workflowId, action); setModel(next); setDraft(next.draft?.content ?? ""); setFeedback("Feature planning state updated."); setError(""); } catch (e) { setError(String(e)); } };
  const saveDraft = async () => { try { const next = await window.champcity.actOnFeaturePlanning(workflow.workflowId, { type: "save-draft", content: draft }); setModel(next); setFeedback("Architect draft refreshed from the text below."); setError(""); } catch (e) { setError(String(e)); } };
  const planGraph = (): any => { const raw = draft.match(/\{[\s\S]*\}/)?.[0]; if (!raw) throw Error("Draft does not contain a JSON planning graph."); return JSON.parse(raw); };
  const acceptPlan = async () => runPlanningDraftAction(planGraph, graph => act({ type: "decide", stage: "plan", outcome: "accept", rationale: "Operator accepted Feature planning graph.", graph }), setError);
  if (model?.stage === "assessment" || !model && workflow.currentWorkspace === "feature-assessment") return <StructuredArchitectWorkspace workflowId={workflow.workflowId}
    stageLabel="Architect Feature Assessment" browserVisible={!!browserPanel} browserCompanion={<div className="figma-browser-column">{browserPanel}</div>} onReturn={onReturn}
    onNext={async () => { await window.champcity.prepareFeaturePlanning(workflow.workflowId, "plan"); await refresh(); }} />;
  return <section className="workflow-instance-workspace" aria-labelledby="workspace-heading"><header className="workflow-instance-shell-header"><div><p>Feature / Capability</p><h1 id="workspace-heading">{workflow.title}</h1></div><button type="button" className="workflow-instance-back" onClick={onReturn}>Back to Workflows</button></header>
    {error && <p role="alert">{error}</p>}{feedback && <p role="status">{feedback}</p>}
    <p>Workflow ID: <code>{workflow.workflowId}</code> · {model?.provenance === "routed" ? `Routed from ${workflow.routedSourceWorkflowId ?? "Work Intake"} (context only)` : "Started directly"}</p>
    {model?.source && <p>SourceBaseline <code>{model.source.baselineId}</code> at <code>{model.source.revisionId}</code>; source binding {model.source.bindingPrepared ? "prepared" : "unprepared"}.</p>}
    {model?.stage === "work-item-map" ? <><h2>Canonical Work Item Map</h2><WorkflowPlanningMap plan={model.acceptedPlan as WorkflowExecutionPlanView | null} /></> : <>
      <><h2>{"Feature Plan Review"}</h2><button onClick={() => void refresh()}>Refresh from SPS</button><button onClick={async () => { await window.champcity.prepareFeaturePlanning(workflow.workflowId, "plan"); await refresh(); }}>Prepare Architect Handoff</button><button onClick={() => void window.champcity.copyFeaturePlanningHandoff(workflow.workflowId)}>Copy Instructions</button><p>Send the prepared instructions in the embedded Architect browser, then paste its response below.</p><textarea aria-label="Architect draft" value={draft} onChange={e => setDraft(e.target.value)} /><button onClick={() => void saveDraft()}>Refresh Draft</button><button onClick={() => void act({ type: "decide", stage: "plan", outcome: "revision", rationale: "Request a revised Architect draft." })}>Request Revision</button><button onClick={() => void act({ type: "decide", stage: "plan", outcome: "reject", rationale: "Reject current Architect draft." })}>Reject</button><button onClick={() => { void acceptPlan(); }}>Accept</button></>
    </>}<aside aria-label="Embedded Architect">{browserPanel}</aside></section>;
}
