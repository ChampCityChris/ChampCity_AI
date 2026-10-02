import {useEffect, useRef, useState, type ReactNode} from "react";
import type {ProjectIntakeSubmission, WorkspaceId} from "../../shared/workspaceContracts";
import type {GreenfieldNavigationProjection, GreenfieldStage} from "../../shared/greenfieldNavigationContracts";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import {ProjectIntakeWorkspace} from "./ProjectIntakeWorkspace";
import {StructuredArchitectWorkspace} from "./StructuredArchitectWorkspace";
import {StructuredProjectPlanningWorkspace} from "./StructuredProjectPlanningWorkspace";
import {StructuredPhaseMapWorkspace} from "./StructuredPhaseMapWorkspace";
import {StructuredPhaseLoopWorkspace} from "./StructuredPhaseLoopWorkspace";
import {WorkflowExecutionWorkspace} from "./WorkflowExecutionWorkspace";

const emptyIntake: ProjectIntakeSubmission = {projectName: "", projectPurpose: "", desiredOutcome: "", projectType: "Desktop application", projectRepository: "", hasExistingSourceOrPlanning: false, knownConstraints: "", repositoryReviewContext: ""};

/** Owns Greenfield stage composition; all mutations retain exact SQL identities. */
export function GreenfieldWorkspace({workflow, repositoryIdentity, browserPanel, onReturn}: {
  workflow: WorkflowInstanceSummary; repositoryIdentity: string; browserPanel: ReactNode; onReturn: () => void;
}) {
  const [navigation, setNavigation] = useState<GreenfieldNavigationProjection | null>(null), [stage, setStage] = useState<GreenfieldStage>("project-intake-capture");
  const [error, setError] = useState("");
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
  const phaseId = navigation?.currentPhaseId;
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
        browserPanel={browserPanel} onNext={() => go(stage === "phase-interview" ? "phase-planning-bundle" : "workflow-execution")} />; break;
    case "workflow-execution":
      content = <WorkflowExecutionWorkspace workflow={workflow} browserPanel={browserPanel} onReturn={onReturn} onProjectionChanged={refresh} />; break;
    case "workflow-hub":
      content = <p role="status">Project Creation is complete. <button onClick={onReturn}>Return to Workflows</button></p>; break;
    default: content = <p role="status">The current SQL stage is {stage}. Refresh to resolve its current destination.</p>;
  }
  return <section aria-label="Greenfield Workflow"><header><button onClick={onReturn}>Workflows</button><h1 id="workspace-heading">{workflow.title}</h1>
    <button onClick={() => void refresh().catch(reason => setError(String(reason)))}>Resume current stage</button></header>
    {error ? <p role="alert">{error}</p> : null}{navigation ? content : <p>Loading current SQL stage…</p>}</section>;
}
