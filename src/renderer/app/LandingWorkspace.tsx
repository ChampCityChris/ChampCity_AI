import { ArrowRight, FolderOpen, Plus } from "lucide-react";

export function LandingWorkspace({
  feedback,
  isChoosing,
  onOpenExistingProject,
  onStartNewProject,
}: {
  feedback: string;
  isChoosing: boolean;
  onOpenExistingProject: () => void;
  onStartNewProject: () => void;
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
