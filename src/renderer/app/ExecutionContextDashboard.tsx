import type {
  CurrentWorkspaceModel,
  ExecutionContextProjection,
  WorkspaceSelection,
} from "../../shared/workspaceContracts";

const emptyExecutionContext: ExecutionContextProjection = {
  phase: {
    state: "none",
    dependsOn: [],
    reason: "No project selected.",
  },
  workCard: {
    state: "none",
    dispositionOrState: "No project selected.",
    reason: "No active Work Card.",
  },
};

export function executionContextForDashboard(
  workspace: WorkspaceSelection,
  model: CurrentWorkspaceModel | null,
): ExecutionContextProjection {
  if (!workspace.ok) {
    return emptyExecutionContext;
  }
  return model?.executionContext ?? {
    phase: {
      state: "none",
      dependsOn: [],
      projectStep: "Refresh required",
      reason: "Refresh to resolve current phase context.",
    },
    workCard: {
      state: "none",
      dispositionOrState: "Refresh required",
      reason: "Refresh to resolve current Work Card context.",
    },
  };
}

export function ExecutionContextDashboard({
  model,
  workspace,
}: {
  model: CurrentWorkspaceModel | null;
  workspace: WorkspaceSelection;
}): JSX.Element {
  const context = executionContextForDashboard(workspace, model);
  const phase = context.phase;
  const workCard = context.workCard;

  return (
    <section className="execution-context-dashboard" aria-label="Current execution context">
      <header>
        <span>Execution Context</span>
        <strong>{workspace.ok ? "Repository Derived" : "No Project Selected"}</strong>
      </header>

      <div className="execution-context-section">
        <span className="execution-context-label">Current Phase</span>
        {phase.state === "active" ? (
          <>
            <strong className="execution-context-id">{phase.phaseId}</strong>
            <span>{phase.title}</span>
            <dl>
              <div>
                <dt>Position</dt>
                <dd>{phase.order} of {phase.totalPhaseCount ?? "?"}</dd>
              </div>
              <div>
                <dt>Loop</dt>
                <dd>{phase.loopStep}</dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{phase.purpose}</dd>
              </div>
              <div>
                <dt>Depends On</dt>
                <dd>{phase.dependsOn.length > 0 ? phase.dependsOn.join(", ") : "None"}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <strong>No active phase</strong>
            <span>{phase.projectStep ?? phase.reason}</span>
          </>
        )}
      </div>

      <div className="execution-context-section">
        <span className="execution-context-label">Current Work Card</span>
        {workCard.state === "active" ? (
          <>
            <strong className="execution-context-id">{workCard.workCardId}</strong>
            <span>{workCard.title}</span>
            <dl>
              <div>
                <dt>Loop</dt>
                <dd>{workCard.loopStep}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{workCard.dispositionOrState}</dd>
              </div>
              {workCard.repairId ? (
                <div>
                  <dt>Repair</dt>
                  <dd>{workCard.repairId}</dd>
                </div>
              ) : null}
            </dl>
          </>
        ) : (
          <>
            <strong>No active Work Card</strong>
            <span>{workCard.reason}</span>
            <small>{workCard.dispositionOrState}</small>
          </>
        )}
      </div>
    </section>
  );
}
