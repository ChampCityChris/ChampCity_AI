import type {WorkflowSidebarContext} from "./workflowSidebarContext";
import type {WorkflowContextAction} from "./figma/FigmaSidebar";
import {useEffect, useState, type ReactNode} from "react";
import {WorkflowStageRail} from "./WorkflowStageRail";
import {canonicalWorkflowRailStage, deriveWorkflowStageRailModel, workflowStageInspectionBlocker, type InspectedWorkflowStage} from "./workflowStageRailModel";
import type {WorkflowStageInspection} from "../../shared/workflowApplicationContracts";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import {workflowPlanningSurface} from "./workflowPlanningDispatch";
import {WorkflowIntakeWorkspace} from "./WorkflowIntakeWorkspace";
import {WorkflowExecutionWorkspace} from "./WorkflowExecutionWorkspace";
import {ExactWorkflowPlanningWorkspace} from "./ExactWorkflowPlanningWorkspace";
import {WorkflowInstanceWorkspace} from "./WorkflowInstanceWorkspace";
import {OptionalWorkIntakeWorkspace} from "./OptionalWorkIntakeWorkspace";
import {GreenfieldWorkspace} from "./GreenfieldWorkspace";
export function StructuredWorkflowWorkspace({workflow, repositoryIdentity, browserPanel, onReturn, onOpen, onProgressed, onWorkflowContextAction, onWorkflowSidebarContext}: {
  workflow: WorkflowInstanceSummary; repositoryIdentity: string; browserPanel: ReactNode; onReturn: () => void; onOpen: (id: string) => void; onProgressed: (id: string) => Promise<void>; onWorkflowContextAction?: (action: WorkflowContextAction | null) => void; onWorkflowSidebarContext?: (context: WorkflowSidebarContext | null) => void;
}) {
  // Bind selection to the exact loaded object. Any open/progression reload resets to SQL.
  const [inspection, setInspection] = useState<{workflow: WorkflowInstanceSummary; stage: InspectedWorkflowStage} | null>(null);
  const canonical = canonicalWorkflowRailStage(workflow);
  const inspectedStage = inspection?.workflow === workflow ? inspection.stage : canonical;
  const stages = deriveWorkflowStageRailModel(workflow, inspectedStage ?? undefined, stage => setInspection({workflow,stage}));
  const reloadCurrentWorkflow = async () => { await onProgressed(workflow.workflowId); };
  let content: ReactNode;
  if (workflow.workflowType === "project-creation") return <GreenfieldWorkspace workflow={workflow} repositoryIdentity={repositoryIdentity} browserPanel={browserPanel} onReturn={onReturn} onWorkflowContextAction={onWorkflowContextAction} onWorkflowSidebarContext={onWorkflowSidebarContext} />;
  if (!canonical && workflow.lifecycleState !== "active") return <WorkflowInstanceWorkspace workflow={workflow} onReturn={onReturn} />;
  if (workflow.workflowType === "work-intake-routing") return <OptionalWorkIntakeWorkspace workflow={workflow} browserPanel={browserPanel} onReturn={onReturn} onRouted={onOpen} />;
  if (stages && canonical && inspectedStage && inspectedStage !== canonical) {
    const stage = stages.find(entry => entry.id === inspectedStage)!;
    content = <WorkflowStageInspectionWorkspace key={`${workflow.workflowId}:${workflow.currentWorkspace}:${inspectedStage}`} workflow={workflow} stage={inspectedStage} label={stage.label} status={stage.statusLabel} canonical={canonical} onReturn={onReturn} />;
  } else if (workflow.lifecycleState !== "active") content = <WorkflowInstanceWorkspace workflow={workflow} onReturn={onReturn} />;
  else switch (workflowPlanningSurface(workflow)) {
    case "intake": content = <WorkflowIntakeWorkspace workflow={workflow} onReturn={onReturn} onPrepared={reloadCurrentWorkflow} />; break;
    case "execution": content = <WorkflowExecutionWorkspace workflow={workflow} onReturn={onReturn} browserPanel={browserPanel} onProgressed={reloadCurrentWorkflow} />; break;
    case "feature": case "issue": case "planning": case "architect": content = <ExactWorkflowPlanningWorkspace key={workflow.currentWorkspace} workflow={workflow} onReturn={onReturn} browserPanel={browserPanel} onProgressed={reloadCurrentWorkflow} />; break;
    default: content = <WorkflowInstanceWorkspace workflow={workflow} onReturn={onReturn} />;
  }
  return <>{stages ? <WorkflowStageRail stages={stages} ariaLabel="Workflow pipeline" /> : null}{content}</>;
}

export function WorkflowStageInspectionWorkspace({workflow,stage,label,status,canonical,onReturn}: {
  workflow: WorkflowInstanceSummary; stage: InspectedWorkflowStage; label: string; status: string; canonical: InspectedWorkflowStage; onReturn: () => void;
}) {
  const [snapshot,setSnapshot] = useState<WorkflowStageInspection | null>(null), [error,setError] = useState("");
  useEffect(() => {
    let active = true;
    setSnapshot(null); setError("");
    window.champcity.getWorkflowStageInspection(workflow.workflowId).then(next => {
      if (next.workflowId !== workflow.workflowId || next.currentWorkspace !== workflow.currentWorkspace) throw Error("Workflow changed; reopen its current stage before inspection.");
      if (active) setSnapshot(next);
    }).catch(reason => {if (active) setError(String(reason));});
    return () => {active = false;};
  }, [workflow,stage]);
  const types: Record<InspectedWorkflowStage, string[]> = {
    intake:["WorkflowIntake"], assessment:["ArchitectReviewCycle","Finding","RootCause","BoundedSolution","Criterion","Evidence","ResearchOutcome"],
    planning:["PlanReviewCycle","BoundedSolution","Criterion"], topology:["PlanReviewCycle","WorkItem","Phase"],
    execution:["WorkItem","ImplementationRecord","TesterResult","SourceCheckpoint"], validation:["Validation","Criterion","TesterResult"], close:["Workflow","IntegrationRecord","ResearchOutcome"],
  };
  const currentLabel = deriveWorkflowStageRailModel(workflow)?.find(entry => entry.isRequired)?.label ?? "Closed";
  const evidence = snapshot?.records.filter(record => types[stage].includes(record.entityType)) ?? [];
  const ids = new Set(evidence.map(record => record.id));
  const decisionIds = new Set(snapshot?.relationships.filter(edge => edge.relationshipType === "governs" && ids.has(edge.toEntityId)).map(edge => edge.fromEntityId));
  const decisions = snapshot?.records.filter(record => record.entityType === "Decision" && decisionIds.has(record.id)) ?? [];
  return <section className="workflow-instance-workspace" aria-labelledby="workspace-heading">
    <header><h1 id="workspace-heading">{label} — Inspection</h1><p>{workflow.title}</p><button onClick={onReturn}>Back to Workflows</button></header>
    <p role="status"><strong>{status}</strong> · Read only</p>
    {status === "Not Ready" ? <p role="note">{workflowStageInspectionBlocker(stage,canonical)}</p> : <p>Saved evidence is available for inspection. Viewing it does not reopen work or create a revision.</p>}
    <p>Workflow <code>{workflow.workflowId}</code> · Current required stage: {currentLabel}</p>
    {error ? <p role="alert">{error}</p> : null}
    {snapshot?.truncated ? <p role="note">Showing a bounded selection of saved evidence.</p> : null}
    {snapshot ? evidence.length || decisions.length ? <><h2>Saved {label} evidence and decisions</h2>{[...evidence,...decisions].map(record => <article key={record.id}>
      <h3>{record.entityType.replace(/([a-z])([A-Z])/g,"$1 $2")}</h3>
      <p>Revision {record.recordVersion} - <code>{record.id}</code></p>
      <InspectionEvidenceValue value={Object.fromEntries(Object.entries(record.body).filter(([key]) => !["workflowId","workflowType","semanticDigest"].includes(key)))} />
    </article>)}</> : <p>No saved {label} evidence yet.</p> : !error ? <p>Loading saved evidence…</p> : null}
  </section>;
}

function InspectionEvidenceValue({value}: {value: unknown}): JSX.Element {
  if (Array.isArray(value)) return <ul>{value.map((item,index) => <li key={index}><InspectionEvidenceValue value={item} /></li>)}</ul>;
  if (value && typeof value === "object") return <dl>{Object.entries(value).map(([key,item]) => <div key={key}><dt>{key.replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("_"," ")}</dt><dd><InspectionEvidenceValue value={item} /></dd></div>)}</dl>;
  return <span style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{value === null || value === undefined ? "None" : String(value)}</span>;
}
