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
  const shortRevision = (value: string | null): string => value ? value.slice(0, 12) : "not present";
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
            <p className="landing-eyebrow">Git migration required</p>
            <h2 id="migration-warning-heading">Move this repository into ChampCity’s managed layout?</h2>
            <p>Your Git history, branches, tags, remotes, and working files will be preserved.</p>
            <dl>
              <div><dt>Current branch</dt><dd>{migrationPlan.currentBranch ?? "detached"}</dd></div>
              <div><dt>main</dt><dd>{migrationPlan.mainAction === "create-from-source"
                ? `Create from ${migrationPlan.baselineSourceRef ?? "selected baseline"} at ${shortRevision(migrationPlan.mainRevision)}`
                : `Preserve at ${shortRevision(migrationPlan.mainRevision)}`}</dd></div>
              <div><dt>dev</dt><dd>{migrationPlan.devAction === "create-from-main" ? "Create from main"
                : migrationPlan.devAction === "fast-forward" ? `Advance to include ${migrationPlan.currentBranch ?? "active source"}`
                  : migrationPlan.devAction === "merge" ? `Merge ${migrationPlan.currentBranch ?? "active source"} with conflict fallback`
                    : `Preserve at ${shortRevision(migrationPlan.devRevision)}`}</dd></div>
              <div><dt>Working changes</dt><dd>{migrationPlan.workingState.stagedCount} staged, {migrationPlan.workingState.unstagedCount} unstaged,
                {" "}{migrationPlan.workingState.untrackedCount} untracked; {migrationPlan.workingState.captureSnapshotRequired
                  ? "capture non-ignored files in an adoption snapshot" : "no adoption snapshot required"}</dd></div>
            </dl>
            <p>ChampCity will not merge unrelated branches or discard conflicts. A conflict stops migration for manual Git resolution.</p>
            <div className="landing-migration-actions">
              <button className="primary-action" disabled={isChoosing} onClick={onAcceptMigration} type="button">
                {isChoosing ? "Migrating..." : "Accept Migration"}
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
