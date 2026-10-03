import { useEffect, useRef, useState } from "react";
import { FigmaAppStrip } from "./figma/FigmaAppStrip";
import { FigmaSidebar, type FigmaThemeMode } from "./figma/FigmaSidebar";
import { LandingWorkspace } from "./LandingWorkspace";
import { WorkflowHubWorkspace } from "./WorkflowHubWorkspace";
import { WorkflowTypeWorkspace } from "./WorkflowTypeWorkspace";
import { StructuredWorkflowWorkspace } from "./StructuredWorkflowWorkspace";
import { OptionalWorkIntakeWorkspace } from "./OptionalWorkIntakeWorkspace";
import { SourceControlWorkspace } from "./SourceControlWorkspace";
import { ApplicationSettingsController } from "./ApplicationSettingsController";
import { ApplicationBrowserHost } from "./ApplicationBrowserHost";
import { WorkflowStageRail } from "./WorkflowStageRail";
import { deriveWorkflowStageRailModel } from "./workflowStageRailModel";
import { admitExistingProject, acceptExistingProjectAdoption, openInspectedExistingProject } from "./existingProjectEntryController";
import { shouldShowClosedWorkIntakeSummary } from "./workflowPlanningDispatch";
import type { ExistingProjectGitAdoptionPlan } from "../../shared/sourceControlContracts";
import type { CurrentProjectRuntimeContext, WorkspaceSelection } from "../../shared/workspaceContracts";
import type { DirectWorkflowStartRequest, WorkflowInstanceSummary, WorkflowInventory } from "../../shared/workflowApplicationContracts";
import type { WorkIntakeProjection } from "../../shared/workIntakeContracts";
import type { WorkflowType } from "../../shared/projectState/workflowTypeRegistry";

const themePreferenceKey = "champcity:figma-theme";
type ShellView = "landing" | "workflow-hub" | "workflow-type" | "workflow-instance" | "settings" | "work-intake" | "source-control";
type SettingsReturnView = Exclude<ShellView, "landing" | "settings">;
type EntrySelection = Extract<WorkspaceSelection, { ok: true }>;

const noProject: WorkspaceSelection = { ok: false, workspaceRoot: null, reason: "No project selected." };

interface SettingsReturnContext {
  view: SettingsReturnView;
  workflowType: WorkflowType | null;
  workflowId: string | null;
  workIntakeId: string | null;
}

export function App(): JSX.Element {
  const [themeMode, setThemeMode] = useState<FigmaThemeMode>(() => {
    try { return window.localStorage.getItem(themePreferenceKey) === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  const [view, setView] = useState<ShellView>("landing");
  const [workspace, setWorkspace] = useState<WorkspaceSelection>(noProject);
  const [project, setProject] = useState<CurrentProjectRuntimeContext | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState("");
  const [pendingAdoption, setPendingAdoption] = useState<ExistingProjectGitAdoptionPlan | null>(null);
  const [pendingSelection, setPendingSelection] = useState<EntrySelection | null>(null);
  const [inventory, setInventory] = useState<WorkflowInventory | null>(null);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [workflowType, setWorkflowType] = useState<WorkflowType | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowInstanceSummary | null>(null);
  const [workIntake, setWorkIntake] = useState<WorkIntakeProjection | null>(null);
  const [workIntakeId, setWorkIntakeId] = useState<string | null>(null);
  const settingsReturn = useRef<SettingsReturnContext | null>(null);
  const inventoryRequest = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    try { window.localStorage.setItem(themePreferenceKey, themeMode); } catch { /* Keep the in-memory preference. */ }
  }, [themeMode]);

  useEffect(() => {
    let disposed = false;
    void window.champcity.getSelectedWorkspace().then(selection => {
      if (!disposed) setWorkspace(selection);
    });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!workspace.ok || !project || (view !== "workflow-hub" && view !== "workflow-type")) return;
    void refreshWorkflowInventory(workflowId);
  }, [workspace.ok, workspace.ok ? workspace.workspaceRoot : null, project?.projectId, view, workflowType]);

  async function refreshWorkflowInventory(preferredId: string | null = workflowId): Promise<WorkflowInventory | null> {
    if (!workspace.ok || !project) {
      setInventory(null); setWorkflowType(null); setWorkflowId(null); setWorkflow(null);
      return null;
    }
    const request = ++inventoryRequest.current;
    setIsInventoryLoading(true);
    setWorkflowError("");
    try {
      const next = await window.champcity.listWorkflows();
      if (request !== inventoryRequest.current) return null;
      const exists = preferredId !== null && next.groups.some(group => group.workflows.some(item => item.workflowId === preferredId));
      setInventory(next);
      setWorkflowId(exists ? preferredId : null);
      if (!exists) setWorkflow(null);
      return next;
    } catch (failure) {
      if (request === inventoryRequest.current) setWorkflowError(failure instanceof Error ? failure.message : "Workflow inventory could not be loaded.");
      return null;
    } finally {
      if (request === inventoryRequest.current) setIsInventoryLoading(false);
    }
  }

  function resetProjectRoutes(): void {
    settingsReturn.current = null;
    inventoryRequest.current++;
    setInventory(null); setWorkflowType(null); setWorkflowId(null); setWorkflow(null);
    setWorkIntake(null); setWorkIntakeId(null); setWorkflowError("");
  }

  async function activateProject(selection: WorkspaceSelection, destination: "workflow-hub" | "project-creation", registeredProject: CurrentProjectRuntimeContext): Promise<void> {
    if (!selection.ok) throw new Error(selection.reason);
    resetProjectRoutes();
    setProject(registeredProject);
    setWorkspace(selection);
    setError(selection.mcpRegistrationError ? `Project selected, but MCP registration failed: ${selection.mcpRegistrationError}` : "");
    if (destination === "project-creation") {
      const id = registeredProject.projectCreationWorkflowId;
      if (!id) throw new Error("Project Creation Workflow identity is unavailable.");
      const opened = await window.champcity.getWorkflow(id);
      if (opened.workflow.workflowType !== "project-creation" || opened.workflow.workflowId !== id) throw new Error("Project Creation Workflow identity could not be verified.");
      setWorkflowId(id); setWorkflow(opened.workflow); setView("workflow-instance");
    } else {
      setView("workflow-hub");
    }
  }

  async function openExistingProject(): Promise<void> {
    setIsChoosing(true); setError(""); setPendingAdoption(null); setPendingSelection(null);
    try {
      const result = await admitExistingProject(window.champcity);
      if (result.kind === "selection-failed") { setError(result.reason); return; }
      resetProjectRoutes(); setProject(null); setWorkspace(result.selection); setView("landing");
      if (result.kind === "conversion-failed") {
        setError(result.reason); setWorkspace(await window.champcity.clearSelectedWorkspace()); return;
      }
      if (result.kind === "consent-required") { setPendingSelection(result.selection); setPendingAdoption(result.plan); return; }
      await activateProject(result.selection, "workflow-hub", result.project);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Existing project could not be opened.");
    } finally { setIsChoosing(false); }
  }

  async function continueProjectEntry(selection: EntrySelection, plan: ExistingProjectGitAdoptionPlan): Promise<void> {
    const result = await openInspectedExistingProject(window.champcity, plan);
    if (result.kind === "conversion-failed") {
      setError(result.reason); setWorkspace(await window.champcity.clearSelectedWorkspace()); setProject(null); setView("landing"); return;
    }
    if (result.kind === "consent-required") { setPendingSelection(selection); setPendingAdoption(result.plan); return; }
    await activateProject(selection, "workflow-hub", result.project);
  }

  async function acceptProjectAdoption(): Promise<void> {
    const selection = pendingSelection; const plan = pendingAdoption;
    if (!selection || !plan || isChoosing) return;
    setIsChoosing(true); setError("");
    try {
      const registered = await acceptExistingProjectAdoption(window.champcity, plan);
      setPendingAdoption(null); setPendingSelection(null);
      await activateProject(selection, "workflow-hub", registered);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Existing Project migration failed.";
      if (/stale/i.test(message)) {
        const refreshed = await window.champcity.inspectExistingProjectGitAdoption();
        if (refreshed.state === "conversion-failed") {
          setPendingAdoption(null); setPendingSelection(null); setError(refreshed.failureReason ?? message);
          setWorkspace(await window.champcity.clearSelectedWorkspace()); setProject(null); setView("landing");
        } else if (refreshed.state === "conversion-required") {
          setPendingAdoption(refreshed); setError("Project source changed. Review the conversion warning before accepting again.");
        } else await continueProjectEntry(selection, refreshed);
      } else {
        const refreshed = await window.champcity.inspectExistingProjectGitAdoption().catch(() => null);
        setPendingAdoption(null); setPendingSelection(null); setError(refreshed?.failureReason ?? message);
        setWorkspace(await window.champcity.clearSelectedWorkspace()); setProject(null); setView("landing");
      }
    } finally { setIsChoosing(false); }
  }

  async function cancelProjectAdoption(): Promise<void> {
    if (isChoosing) return;
    setPendingAdoption(null); setPendingSelection(null);
    setWorkspace(await window.champcity.clearSelectedWorkspace()); setProject(null); resetProjectRoutes(); setView("landing");
    setError("Conversion canceled. No conversion or Current Project registration was applied.");
  }

  async function startNewProject(): Promise<void> {
    setIsChoosing(true); setError("");
    try {
      const selection = await window.champcity.chooseWorkspaceFolder();
      if (!selection.ok) { setError(selection.reason); return; }
      const registered = await window.champcity.registerCurrentProject("greenfield");
      await activateProject(selection, "project-creation", registered);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "New project directory could not be selected."); }
    finally { setIsChoosing(false); }
  }

  async function clearProject(): Promise<void> {
    setWorkspace(await window.champcity.clearSelectedWorkspace()); setProject(null); resetProjectRoutes(); setView("landing");
  }

  function openSettings(): void {
    if (view === "settings") return;
    settingsReturn.current = { view: view === "landing" ? "workflow-hub" : view, workflowType, workflowId, workIntakeId };
    setView("settings");
  }

  async function returnFromSettings(): Promise<void> {
    const context = settingsReturn.current;
    if (!context) { returnToWorkflowHub(); return; }
    try {
      if (context.workflowId) {
        const opened = await window.champcity.getWorkflow(context.workflowId);
        if (opened.workflow.workflowId !== context.workflowId) throw new Error("The previous Workflow is no longer available.");
        if (settingsReturn.current !== context) return;
        setWorkflow(opened.workflow);
      }
      if (settingsReturn.current !== context) return;
      setWorkflowType(context.workflowType); setWorkflowId(context.workflowId); setWorkIntakeId(context.workIntakeId);
      setView(context.view); settingsReturn.current = null;
    } catch {
      if (settingsReturn.current !== context) return;
      returnToWorkflowHub(); setWorkflowId(null); setWorkflow(null);
      setWorkflowError("The previous Workflow is no longer available. Choose a Workflow from Workflows.");
    }
  }

  async function openWorkIntakeForWorkflow(intakeId: string, routingWorkflowId: string): Promise<void> {
    const projection = await window.champcity.getWorkIntakeProjection();
    if (projection.authority !== "structured") throw new Error("Current Project Work Intake routing is unavailable.");
    const opened = await window.champcity.getWorkflow(routingWorkflowId);
    if (opened.workflow.workflowType !== "work-intake-routing" || opened.workflow.workIntakeId !== intakeId) throw new Error("Exact Work Intake routing Workflow identity could not be verified.");
    setWorkIntake(projection); setWorkIntakeId(intakeId); setWorkflowId(routingWorkflowId); setWorkflow(opened.workflow); setView("work-intake");
  }

  async function openWorkflow(id: string): Promise<void> {
    setWorkflowError("");
    try {
      const opened = await window.champcity.getWorkflow(id);
      setWorkflowType(opened.workflow.workflowType === "project-creation" ? null : opened.workflow.workflowType);
      setWorkflowId(opened.workflow.workflowId);
      if (opened.workflow.workflowType === "work-intake-routing") {
        if (shouldShowClosedWorkIntakeSummary(opened.workflow)) { setWorkflow(opened.workflow); setView("workflow-instance"); return; }
        if (!opened.workflow.workIntakeId) throw new Error("The Work Intake for this Workflow is unavailable.");
        await openWorkIntakeForWorkflow(opened.workflow.workIntakeId, opened.workflow.workflowId); return;
      }
      setWorkflow(opened.workflow); setView("workflow-instance");
    } catch (failure) { setWorkflowError(failure instanceof Error ? failure.message : "Workflow could not be opened."); }
  }

  async function refreshWorkflowStage(id: string): Promise<void> {
    const opened = await window.champcity.getWorkflow(id);
    if (opened.workflow.workflowId !== id) throw new Error("Exact Workflow progression identity could not be verified.");
    setWorkflow(opened.workflow);
    if (opened.workflow.lifecycleState !== "active" || ["closed", "cancelled"].includes(opened.workflow.workflowState)) returnToWorkflowType();
  }

  async function startWorkflow(request: DirectWorkflowStartRequest): Promise<void> {
    setWorkflowError("");
    const created = await window.champcity.startWorkflow(request);
    const refreshed = await refreshWorkflowInventory(created.workflow.workflowId);
    if (!refreshed || !refreshed.groups.some(group => group.workflows.some(item => item.workflowId === created.workflow.workflowId))) throw new Error("The new Workflow was not available in the refreshed Current Project inventory.");
    const opened = await window.champcity.getWorkflow(created.workflow.workflowId);
    setWorkflowType(opened.workflow.workflowType); setWorkflowId(opened.workflow.workflowId); setWorkflow(opened.workflow); setView("workflow-instance");
  }

  async function openRoutedWorkflow(id: string): Promise<void> {
    try {
      const refreshed = await refreshWorkflowInventory(id);
      if (!refreshed || !refreshed.groups.some(group => group.workflows.some(item => item.workflowId === id))) throw new Error("The routed target Workflow was not available in the refreshed Current Project inventory.");
      const opened = await window.champcity.getWorkflow(id);
      setWorkflowType(opened.workflow.workflowType); setWorkflowId(opened.workflow.workflowId); setWorkflow(opened.workflow); setView("workflow-instance");
    } catch (failure) { setWorkflowError(failure instanceof Error ? failure.message : "Routed Workflow could not be opened."); }
  }

  async function openWorkIntake(): Promise<void> {
    try {
      const projection = await window.champcity.getWorkIntakeProjection();
      if (projection.authority !== "structured") throw new Error("Current Project Work Intake is unavailable.");
      setWorkIntake(projection); setWorkflowType("work-intake-routing"); setWorkIntakeId(null); setWorkflowId(null); setWorkflow(null); setView("work-intake");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Work Intake could not be opened."); }
  }

  function returnToWorkflowHub(): void {
    settingsReturn.current = null; setWorkflowType(null); setView("workflow-hub");
  }

  function returnToWorkflowType(): void {
    setWorkflowId(null); setWorkflow(null); setView(workflowType ? "workflow-type" : "workflow-hub");
  }

  const isLanding = view === "landing";
  const isSettings = view === "settings";
  const workflowStages = view === "workflow-instance" ? deriveWorkflowStageRailModel(workflow) : null;
  const projectName = workspace.ok ? workspace.workspaceRoot.split(/[\\/]/).filter(Boolean).at(-1) ?? workspace.workspaceRoot : "No Project selected";
  const browserPanel = <ApplicationBrowserHost />;

  return <div className={`app-root ${themeMode === "dark" ? "dark" : ""}`}>
    <FigmaAppStrip />
    {workflowStages ? <WorkflowStageRail stages={workflowStages} ariaLabel="Workflow pipeline" /> : null}
    <div className={isLanding ? "app-body landing-app-body" : "app-body"}>
      {!isLanding ? <FigmaSidebar activeWorkspaceId={isSettings ? "settings" : "app"} isChoosing={isChoosing}
        mode={view === "workflow-hub" || view === "workflow-type" ? "hub" : view === "source-control" ? "source-control" : "settings"}
        onChooseProject={() => void openExistingProject()} onClearProject={() => void clearProject()}
        onOpenSettings={openSettings} onReturnToWorkflowHub={returnToWorkflowHub} onThemeChange={setThemeMode}
        projectName={projectName} themeMode={themeMode} workspace={workspace} /> : null}
      <section className={["workspace-surface", isLanding ? "landing-surface" : "", view === "workflow-hub" ? "workflow-hub-surface" : "", view === "source-control" ? "source-control-surface" : "", isSettings ? "settings-workspace-surface" : ""].filter(Boolean).join(" ")}>
        {isLanding ? <LandingWorkspace feedback={error} isChoosing={isChoosing} migrationPlan={pendingAdoption}
          onAcceptMigration={() => void acceptProjectAdoption()} onCancelMigration={() => void cancelProjectAdoption()}
          onOpenExistingProject={() => void openExistingProject()} onStartNewProject={() => void startNewProject()} />
          : isSettings ? <ApplicationSettingsController projectName={projectName} onReturn={() => void returnFromSettings()} />
          : view === "work-intake" && workIntake?.authority === "structured" ? <OptionalWorkIntakeWorkspace key={`${workspace.ok ? workspace.workspaceRoot : "none"}:${workflow?.workflowId ?? "new"}`}
            workflow={workflow?.workflowType === "work-intake-routing" ? workflow : null} browserPanel={browserPanel}
            onReturn={returnToWorkflowType} onRouted={id => void openRoutedWorkflow(id)} />
          : view === "source-control" ? <SourceControlWorkspace key={workspace.ok ? workspace.workspaceRoot : "none"} projectName={projectName} onReturn={returnToWorkflowHub} />
          : view === "workflow-instance" ? workflow ? <StructuredWorkflowWorkspace key={workflow.workflowId} workflow={workflow}
            repositoryIdentity={workspace.ok ? workspace.workspaceRoot : ""} browserPanel={browserPanel} onReturn={returnToWorkflowType} onOpen={id => void openWorkflow(id)} onProgressed={refreshWorkflowStage} /> : <p role="status">Loading Workflow…</p>
          : view === "workflow-type" && workflowType ? <WorkflowTypeWorkspace key={workflowType} workflowType={workflowType}
            workflows={inventory?.groups.find(group => group.workflowType === workflowType)?.workflows ?? []}
            loading={isInventoryLoading} error={workflowError} onOpenWorkflow={id => void openWorkflow(id)}
            onStartWorkflow={startWorkflow} onStartWorkIntake={() => void openWorkIntake()} onReturn={returnToWorkflowHub} />
          : view === "workflow-hub" ? <><WorkflowHubWorkspace
            onSelectType={type => { setWorkflowType(type); setWorkflowId(null); setWorkflow(null); setView("workflow-type"); }}
            onOpenGreenfield={id => void openWorkflow(id)} onOpenSourceControl={() => { if (project?.repositoryId) setView("source-control"); }}
            projectName={projectName} sourceControlAvailable={project?.repositoryId !== null && project?.repositoryId !== undefined}
            inventory={inventory} loading={isInventoryLoading} error={workflowError} workspace={workspace} />
            {error ? <p role="alert">{error}</p> : null}</>
          : <p role="status">Choose a Workflow from Workflow Hub.</p>}
      </section>
    </div>
  </div>;
}
