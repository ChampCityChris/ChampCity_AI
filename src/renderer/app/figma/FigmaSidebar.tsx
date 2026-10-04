import { FolderOpen, LayoutGrid, Settings, X } from "lucide-react";
import type { WorkspaceSelection } from "../../../shared/workspaceContracts";
import type { WorkflowSidebarContext } from "../workflowSidebarContext";

export type FigmaThemeMode = "dark" | "light";
export type FigmaSidebarMode = "hub" | "source-control" | "settings";

export interface WorkflowContextAction {workflowId: string; label: string; onClick: () => void}

export function FigmaSidebar({
  activeWorkspaceId,
  isChoosing,
  mode = "hub",
  onChooseProject,
  onClearProject,
  onOpenSettings,
  onReturnToWorkflowHub,
  onThemeChange,
  projectName,
  themeMode,
  workspace,
  workflowContextAction,
  workflowSidebarContext,
}: {
  activeWorkspaceId: string;
  isChoosing: boolean;
  mode?: FigmaSidebarMode;
  onChooseProject: () => void;
  onClearProject: () => void;
  onOpenSettings: () => void;
  onReturnToWorkflowHub?: () => void;
  onThemeChange: (themeMode: FigmaThemeMode) => void;
  projectName: string;
  themeMode: FigmaThemeMode;
  workspace: WorkspaceSelection;
  workflowContextAction?: WorkflowContextAction | null;
  workflowSidebarContext?: WorkflowSidebarContext | null;
}): JSX.Element {
  const isDark = themeMode === "dark";
  const isHubMode = mode === "hub";
  const showsProjectName = isHubMode || mode === "source-control";

  return (
    <aside className="sidebar figma-sidebar" aria-label="Project navigation">
      {!isHubMode && !(mode === "settings" && !workspace.ok) ? (
        <section className="figma-sidebar-section workflow-return-section" aria-label="Workflow navigation">
          <button className="figma-sidebar-action figma-workflows-action" onClick={onReturnToWorkflowHub} title="Return to Workflows" type="button">
            <LayoutGrid aria-hidden="true" size={14} />Workflows
          </button>
        </section>
      ) : null}
      {workflowContextAction ? <section className="figma-sidebar-section" aria-label="Current Workflow"><button className="figma-sidebar-action" onClick={workflowContextAction.onClick} type="button">{workflowContextAction.label}</button></section> : null}
      <section className="figma-sidebar-section project-selector" aria-label="Select Project">
        <p className="figma-sidebar-label">{showsProjectName ? "Project" : "Select Project"}</p>
        {showsProjectName ? <strong className="figma-sidebar-primary">{projectName}</strong> : null}
        <div className="project-selector-actions">
          <button className="figma-sidebar-action icon-button text-button" disabled={isChoosing} onClick={onChooseProject} title="Choose project" type="button">
            <FolderOpen aria-hidden="true" size={14} />
            {isChoosing ? "Choosing..." : isHubMode ? workspace.ok ? "Change Project" : "Open Project" : "Choose Project"}
          </button>
          {workspace.ok ? <button className="figma-sidebar-action icon-button text-button" onClick={onClearProject} title="Clear selected project" type="button"><X aria-hidden="true" size={14} />Clear Project</button> : null}
        </div>
      </section>
      {workflowSidebarContext ? <div className="figma-sidebar-scroll" aria-label="Current Workflow context">
        <section className="figma-sidebar-section">
          <div className="figma-sidebar-field">
            <p>Current Stage</p>
            <strong className="figma-sidebar-primary">{workflowSidebarContext.stage.label}</strong>
            <span>{workflowSidebarContext.stage.reason}</span>
          </div>
          <div className="figma-sidebar-field">
            <p>Current Phase</p>
            {workflowSidebarContext.phase ? <>
              <strong className="figma-sidebar-primary">{workflowSidebarContext.phase.title}</strong>
              <small className="figma-sidebar-id">{workflowSidebarContext.phase.id}</small>
              {workflowSidebarContext.phase.order !== undefined && workflowSidebarContext.phase.total !== undefined ? <span>Phase {workflowSidebarContext.phase.order} of {workflowSidebarContext.phase.total}</span> : null}
              <span>{workflowSidebarContext.phase.state}</span>
              {workflowSidebarContext.phase.loopStep ? <span>{workflowSidebarContext.phase.loopStep}</span> : null}
            </> : <><strong className="figma-sidebar-primary">No active Phase</strong><span>{workflowSidebarContext.phaseReason}</span></>}
          </div>
          <div className="figma-sidebar-field">
            <p>Current Work Card</p>
            {workflowSidebarContext.workCard ? <>
              <strong className="figma-sidebar-primary">{workflowSidebarContext.workCard.title}</strong>
              <small className="figma-sidebar-id">{workflowSidebarContext.workCard.id}</small>
              <span>{workflowSidebarContext.workCard.state}</span>
              {workflowSidebarContext.workCard.loopStep ? <span>{workflowSidebarContext.workCard.loopStep}</span> : null}
              {workflowSidebarContext.workCard.repairId ? <small>Repair: {workflowSidebarContext.workCard.repairId}</small> : null}
              {workflowSidebarContext.workCard.parentId ? <small>Parent Work Card: {workflowSidebarContext.workCard.parentId}</small> : null}
            </> : <><strong className="figma-sidebar-primary">No active Work Card</strong><span>{workflowSidebarContext.workCardReason}</span></>}
          </div>
        </section>
      </div> : null}
      <section className="figma-sidebar-section figma-settings-section" aria-label="Settings">
        <button aria-current={activeWorkspaceId === "settings" ? "page" : undefined} className={["figma-sidebar-action", "figma-settings-action", activeWorkspaceId === "settings" ? "active" : ""].filter(Boolean).join(" ")} onClick={onOpenSettings} title="Open Settings" type="button">
          <Settings aria-hidden="true" size={14} />Settings
        </button>
      </section>
      <section className="figma-sidebar-section figma-theme-section" aria-label="Theme">
        <p className="figma-sidebar-label">Theme</p>
        <div className="figma-theme-toggle" role="group" aria-label="Theme selection">
          <button aria-pressed={isDark} className={isDark ? "active" : ""} onClick={() => onThemeChange("dark")} type="button">Dark</button>
          <button aria-pressed={!isDark} className={!isDark ? "active" : ""} onClick={() => onThemeChange("light")} type="button">Light</button>
        </div>
      </section>
    </aside>
  );
}
