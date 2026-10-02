import {useEffect, useRef, useState, type ReactNode} from "react";
import type {ProjectIntakeSubmission, WorkspaceId} from "../../shared/workspaceContracts";
import type {GreenfieldNavigationProjection} from "../../shared/greenfieldNavigationContracts";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import {ProjectIntakeWorkspace} from "./ProjectIntakeWorkspace";
import {StructuredArchitectWorkspace} from "./StructuredArchitectWorkspace";
import {StructuredProjectPlanningWorkspace} from "./StructuredProjectPlanningWorkspace";
import {StructuredPhaseMapWorkspace} from "./StructuredPhaseMapWorkspace";
import {StructuredPhaseLoopWorkspace, DerivedPhaseWorkIntakeWorkspace} from "./StructuredPhaseLoopWorkspace";
import {WorkItemPlanningWorkspace} from "./WorkItemPlanningWorkspace";
import {GreenfieldExecutionWorkspace} from "./GreenfieldExecutionWorkspace";
import {CloseAdvanceWorkspace} from "./CloseAdvanceWorkspace";

const emptyIntake: ProjectIntakeSubmission = {projectName: "", projectPurpose: "", desiredOutcome: "", projectType: "Desktop application", projectRepository: "", hasExistingSourceOrPlanning: false, knownConstraints: "", repositoryReviewContext: ""};

/** Owns Greenfield stage composition; all mutations retain exact SQL identities. */
export function GreenfieldWorkspace({workflow, repositoryIdentity, browserPanel, onReturn}: {
  workflow: WorkflowInstanceSummary; repositoryIdentity: string; browserPanel: ReactNode; onReturn: () => void;
}) {
  const [navigation, setNavigation] = useState<GreenfieldNavigationProjection | null>(null), [stage, setStage] = useState<WorkspaceId>(workflow.currentWorkspace as WorkspaceId);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [intake, setIntake] = useState({...emptyIntake, projectRepository: repositoryIdentity});
  const generation = useRef(0);
  const refresh = async () => {
    const request = ++generation.current;
    const current = await window.champcity.getGreenfieldNavigation(workflow.workflowId);
    const nextStage = current.currentWorkspace;
    if (request !== generation.current) return;
    setNavigation(current); setStage(nextStage); setError("");
  };
  useEffect(() => {void refresh().catch(reason => setError(String(reason))); return () => {generation.current++;};}, [workflow.workflowId]);
  const go = async (_destination: WorkspaceId) => {await refresh();};
  const begin = async (workItemId: string) => {
    if (!navigation?.currentPhaseId) return;
    setBusy(true); setError("");
    try {
      const prepared = await window.champcity.getStructuredPhaseWorkIntake(navigation.currentPhaseId, workItemId);
      await window.champcity.prepareStructuredPhaseWorkItem(prepared.reviewCycleId, prepared.workItemId);
      await go("work-card-intake");
    } catch (reason) {setError(String(reason));} finally {setBusy(false);}
  };
  const phaseId = navigation?.currentPhaseId, workItemId = navigation?.currentWorkItemId;
  let content: ReactNode;
  switch (stage) {
    case "project-intake-capture":
      content = <ProjectIntakeWorkspace workflowId={workflow.workflowId} value={intake} onChange={setIntake}
        repositoryIdentity={repositoryIdentity} isChoosingProjectRepository={false} onChooseProjectRepository={() => setError("Use Change Project to select a different repository.")}
        onRailStatus={() => undefined} onPrepared={() => void go("architect-interview").catch(reason => setError(String(reason)))} />; break;
    case "architect-interview":
      content = <StructuredArchitectWorkspace workflowId={workflow.workflowId} browserVisible browserCompanion={browserPanel} onNext={() => go("project-planning-review")} />; break;
    case "project-planning-review":
      content = <StructuredProjectPlanningWorkspace workflowId={workflow.workflowId} browserPanel={browserPanel} onNext={() => go("project-phase-map")} />; break;
    case "project-phase-map":
      content = <StructuredPhaseMapWorkspace workflowId={workflow.workflowId} browserPanel={browserPanel} onNext={() => go("phase-interview")} />; break;
    case "phase-interview": case "phase-planning-bundle":
      content = <StructuredPhaseLoopWorkspace workflowId={workflow.workflowId} phaseId={phaseId ?? undefined} stageKind={stage === "phase-interview" ? "interview" : "planning"}
        browserPanel={browserPanel} onNext={() => go(stage === "phase-interview" ? "phase-planning-bundle" : "phase-work-card-selection")} />; break;
    case "phase-work-card-selection":
      content = <section aria-label="Current Phase WorkItem">
        <h2>Current Phase WorkItem</h2>
        {workItemId ? <><p>The SQL Phase map has selected WorkItem <strong>{workItemId}</strong>.</p>
          <button disabled={busy} onClick={() => void begin(workItemId)}>Open WorkItem Planning</button></>
          : <p role="status">No current SQL WorkItem is ready for planning.</p>}
      </section>; break;
    case "work-card-intake":
      content = <DerivedPhaseWorkIntakeWorkspace phaseId={phaseId ?? undefined} workItemId={workItemId ?? undefined} onNext={() => go("work-card-planning")} />; break;
    case "work-card-planning":
      content = workItemId ? <WorkItemPlanningWorkspace workflowId={workflow.workflowId} workItemId={workItemId} browserPanel={browserPanel}
        onChanged={() => refresh()} onNext={() => go("work-card-building-review")} /> : <p role="alert">Select the current SQL WorkItem.</p>; break;
    case "phase-validation": case "phase-close": case "project-validation": case "project-close":
      content = <><CloseAdvanceWorkspace workflowId={workflow.workflowId} scope={stage.startsWith("phase-") ? "phase" : "workflow"}
        entityId={stage.startsWith("phase-") ? phaseId ?? "" : workflow.workflowId} onNext={next => {
          if (next.workspaceId === "workflow-hub") onReturn();
          else void go(next.workspaceId === "workflow-execution" ? "phase-work-card-selection" : next.workspaceId).catch(reason => setError(String(reason)));
        }} /><GreenfieldExecutionWorkspace workflowId={workflow.workflowId} browserPanel={browserPanel}
          onReturn={() => void refresh().catch(reason => setError(String(reason)))} /></>; break;
    case "work-card-building-review": case "work-card-report-review": case "work-card-repair": case "work-card-close":
      content = <GreenfieldExecutionWorkspace workflowId={workflow.workflowId} workItemId={workItemId ?? undefined} browserPanel={browserPanel}
        onReturn={() => void go("phase-work-card-selection").catch(reason => setError(String(reason)))} />; break;
    default: content = <p role="status">The current SQL stage is {stage}. Refresh to resolve its current destination.</p>;
  }
  return <section aria-label="Greenfield Workflow"><header><button onClick={onReturn}>Workflows</button><h1 id="workspace-heading">{workflow.title}</h1>
    <button onClick={() => void refresh().catch(reason => setError(String(reason)))}>Resume current stage</button></header>
    {error ? <p role="alert">{error}</p> : null}{navigation ? content : <p>Loading current SQL stage…</p>}</section>;
}
