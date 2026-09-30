import { ArrowRight, FolderOpen, Plus } from "lucide-react";
import type { ExistingProjectGitAdoptionPlan } from "../../shared/sourceControlContracts";

export function LandingWorkspace({
  feedback,
  isChoosing,
  onOpenExistingProject,
  onStartNewProject,
  migrationPlan,
  onAcceptMigration,
  onCancelMigration,
}: {
  feedback: string;
  isChoosing: boolean;
  onOpenExistingProject: () => void;
  onStartNewProject: () => void;
  migrationPlan?: ExistingProjectGitAdoptionPlan | null;
  onAcceptMigration?: () => void;
  onCancelMigration?: () => void;
}): JSX.Element {
  return (
    <section className="landing-workspace" aria-labelledby="workspace-heading">
      <div className="landing-content">
        <header className="landing-header">
          <p className="landing-eyebrow">ChampCity A/I</p>
          <h1 id="workspace-heading">Choose where to begin</h1>
          <p>
            Open a project to continue its governed workflow, or select a writable
            directory and define a new project through Project Intake.
          </p>
        </header>

        {migrationPlan ? (
          <section className="landing-migration-warning" aria-labelledby="migration-warning-heading">
            <p className="landing-eyebrow">Git conversion required</p>
            <h2 id="migration-warning-heading">Convert this project for ChampCity source control?</h2>
            <p>
              ChampCity A/I needs to reorganize this project&apos;s Git repository into the source-control layout used by the
              application. This conversion may change or damage the project&apos;s existing Git branch, worktree, and repository configuration.
            </p>
            <p>
              ChampCity will preserve the current project files and will retain readable Git history where possible. After conversion,
              ChampCity&apos;s managed Git layout becomes authoritative for this project.
            </p>
            <p>If you want to preserve or manually reorganize the current Git repository first, choose Cancel.</p>
            <div className="landing-migration-actions">
              <button className="primary-action" disabled={isChoosing} onClick={onAcceptMigration} type="button">
                {isChoosing ? "Converting..." : "Accept and Convert"}
              </button>
              <button disabled={isChoosing} onClick={onCancelMigration} type="button">Cancel</button>
            </div>
          </section>
        ) : null}

        <div className="landing-action-grid" aria-label="Project entry actions">
          <button
            className="landing-action-card"
            disabled={isChoosing}
            onClick={onOpenExistingProject}
            type="button"
          >
            <span className="landing-action-icon" aria-hidden="true">
              <FolderOpen size={34} strokeWidth={1.7} />
            </span>
            <span className="landing-action-copy">
              <strong>Open Existing Project</strong>
              <span>Select a validated project directory and continue from its Workflow Hub.</span>
            </span>
            <span className="landing-action-link">
              {isChoosing ? "Selecting project..." : "Open project"}
              <ArrowRight aria-hidden="true" size={18} />
            </span>
          </button>

          <button
            className="landing-action-card"
            disabled={isChoosing}
            onClick={onStartNewProject}
            type="button"
          >
            <span className="landing-action-icon" aria-hidden="true">
              <Plus size={34} strokeWidth={1.8} />
            </span>
            <span className="landing-action-copy">
              <strong>Start New Project</strong>
              <span>Select a writable directory and begin with canonical Project Intake.</span>
            </span>
            <span className="landing-action-link">
              {isChoosing ? "Selecting project..." : "Start project"}
              <ArrowRight aria-hidden="true" size={18} />
            </span>
          </button>
        </div>

        {feedback ? (
          <div className="landing-feedback" role="status">
            {feedback}
          </div>
        ) : null}
      </div>
    </section>
  );
}
