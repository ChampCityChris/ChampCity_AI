import { FolderOpen, LayoutGrid, Settings, X } from "lucide-react";
import type React from "react";

import type {
  CurrentWorkspaceModel,
  WorkspaceSelection,
} from "../../../shared/workspaceContracts";

export type FigmaThemeMode = "dark" | "light";
export type FigmaSidebarMode = "hub" | "development";

export function FigmaSidebar({
  currentModel,
  activeWorkspaceId,
  isChoosing,
  mode = "development",
  onChooseProject,
  onClearProject,
  onOpenSettings,
  onReturnToWorkflowHub,
  onThemeChange,
  projectName,
  themeMode,
  workspace,
}: {
  activeWorkspaceId: string;
  currentModel: CurrentWorkspaceModel | null;
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
}): JSX.Element {
  const phase = currentModel?.executionContext.phase;
  const workCard = currentModel?.executionContext.workCard;
  const isDark = themeMode === "dark";
  const isHubMode = mode === "hub";

  return (
    <aside className="sidebar figma-sidebar" aria-label="Project navigation">
      {isHubMode ? null : (
        <section className="figma-sidebar-section workflow-return-section" aria-label="Workflow navigation">
          <button
            className="figma-sidebar-action figma-workflows-action"
            onClick={onReturnToWorkflowHub}
            title="Return to Workflows"
            type="button"
          >
            <LayoutGrid aria-hidden="true" size={14} />
            Workflows
          </button>
        </section>
      )}

      <section className="figma-sidebar-section project-selector" aria-label={isHubMode ? "Project" : "Select Project"}>
        <p className="figma-sidebar-label">{isHubMode ? "Project" : "Select Project"}</p>
        {isHubMode ? (
          <strong className="figma-sidebar-primary">{projectName}</strong>
        ) : null}
        <div className="project-selector-actions">
          <button
            className="figma-sidebar-action icon-button text-button"
            disabled={isChoosing}
            onClick={onChooseProject}
            title="Choose project"
            type="button"
          >
            <FolderOpen aria-hidden="true" size={14} />
            {isChoosing
              ? "Choosing..."
              : isHubMode
              ? workspace.ok ? "Change Project" : "Open Project"
              : "Choose Project"}
          </button>
          {workspace.ok ? (
            <button
              className="figma-sidebar-action icon-button text-button"
              onClick={onClearProject}
              title="Clear selected project"
              type="button"
            >
              <X aria-hidden="true" size={14} />
              Clear Project
            </button>
          ) : null}
        </div>
      </section>

      {isHubMode ? null : (
        <section className="figma-sidebar-section" aria-label="Current Project">
          <p className="figma-sidebar-label">Current Project</p>
          <strong className="figma-sidebar-primary">{projectName}</strong>
        </section>
      )}

      {isHubMode ? null : (
      <div className="figma-sidebar-scroll">
        <section className="figma-sidebar-section" aria-label="Current Phase">
          <p className="figma-sidebar-label">Current Phase</p>
          {phase?.state === "active" ? (
            <>
              <SidebarField>
                <span className="figma-sidebar-id">{phase.phaseId}</span>
                <span className="figma-sidebar-muted">{phase.title ?? "Current phase"}</span>
              </SidebarField>
              <SidebarField label="Phase Position">
                <span className="figma-sidebar-mono-value">{formatPhasePosition(phase.order, phase.totalPhaseCount)}</span>
              </SidebarField>
              <SidebarField label="Loop Step">
                <span className="figma-sidebar-muted">{phase.loopStep ?? "Repository derived"}</span>
              </SidebarField>
            </>
          ) : (
            <>
              <SidebarField>
                <span className="figma-sidebar-muted">No active phase</span>
              </SidebarField>
              <SidebarField label="State">
                <span className="figma-sidebar-muted">{phase?.projectStep ?? phase?.reason ?? "Refresh to resolve phase context."}</span>
              </SidebarField>
            </>
          )}
        </section>

        <section className="figma-sidebar-section" aria-label="Current Work Card">
          <p className="figma-sidebar-label">Current Work Card</p>
          {workCard?.state === "active" ? (
            <>
              <SidebarField>
                <span className="figma-sidebar-id">{workCard.workCardId}</span>
                <span className="figma-sidebar-muted">{workCard.title ?? "Current Work Card"}</span>
              </SidebarField>
              <SidebarField label="Work Card Position">
                <span className="figma-sidebar-mono-value">{formatWorkCardPosition(workCard.loopStep)}</span>
              </SidebarField>
              <SidebarField label="Loop Step">
                <span className="figma-sidebar-muted">{workCard.loopStep ?? "Repository derived"}</span>
              </SidebarField>
            </>
          ) : (
            <>
              <SidebarField>
                <span className="figma-sidebar-muted">No active Work Card</span>
              </SidebarField>
              <SidebarField label="State">
                <span className="figma-sidebar-muted">{workCard?.dispositionOrState ?? "Refresh required"}</span>
              </SidebarField>
            </>
          )}
        </section>
      </div>
      )}

      <section className="figma-sidebar-section figma-settings-section" aria-label="Settings">
        <button
          aria-current={activeWorkspaceId === "settings" ? "page" : undefined}
          className={[
            "figma-sidebar-action",
            "figma-settings-action",
            activeWorkspaceId === "settings" ? "active" : "",
          ].filter(Boolean).join(" ")}
          onClick={onOpenSettings}
          title="Open Settings"
          type="button"
        >
          <Settings aria-hidden="true" size={14} />
          Settings
        </button>
      </section>

      <section className="figma-sidebar-section figma-theme-section" aria-label="Theme">
        <p className="figma-sidebar-label">Theme</p>
        <div className="figma-theme-toggle" role="group" aria-label="Theme selection">
          <button
            aria-pressed={isDark}
            className={isDark ? "active" : ""}
            onClick={() => onThemeChange("dark")}
            type="button"
          >
            Dark
          </button>
          <button
            aria-pressed={!isDark}
            className={!isDark ? "active" : ""}
            onClick={() => onThemeChange("light")}
            type="button"
          >
            Light
          </button>
        </div>
      </section>
    </aside>
  );
}

function SidebarField({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}): JSX.Element {
  return (
    <div className="figma-sidebar-field">
      {label ? <p>{label}</p> : null}
      {children}
    </div>
  );
}

function formatPhasePosition(order: number | undefined, total: number | undefined): string {
  if (order && total) {
    return `Phase ${order} of ${total}`;
  }
  if (order) {
    return `Phase ${order}`;
  }
  return "Position unavailable";
}

function formatWorkCardPosition(loopStep: string | undefined): string {
  return loopStep ? `${loopStep} in phase` : "Position unavailable";
}
