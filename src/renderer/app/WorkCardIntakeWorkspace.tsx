import type { CurrentWorkspaceModel, WorkCardIntakeProjection } from "../../shared/workspaceContracts";

export function WorkCardIntakeWorkspace({
  actionError,
  actionFeedback,
  isGenerating,
  model,
  onGenerate,
}: {
  actionError: string;
  actionFeedback: string;
  isGenerating: boolean;
  model: CurrentWorkspaceModel | null;
  onGenerate: () => void;
}): JSX.Element {
  const projection = model?.workCardIntake;

  if (!projection) {
    return (
      <section className="work-card-intake-workspace" aria-label="Work Card Planning preparation">
        <div className="work-card-intake-message error" role="status">
          Work Card Planning preparation is unavailable. Refresh the current workflow model.
        </div>
      </section>
    );
  }

  const phase = model?.executionContext.phase;
  const phaseTitle = phase?.state === "active" ? phase.title ?? "Untitled phase" : "Untitled phase";

  return (
    <section className="work-card-intake-workspace" aria-label="Work Card Planning preparation">
      <header className="work-card-intake-header">
        <div>
          <span>Phase</span>
          <strong>{projection.phaseId}</strong>
          <small>{phaseTitle}</small>
        </div>
        <div>
          <span>Selected Candidate</span>
          <strong>
            {projection.candidate.order}. {projection.candidate.candidateId}
          </strong>
          <small>{projection.candidate.title}</small>
        </div>
      </header>

      <section className="work-card-intake-primary" aria-label="Selected Work Card candidate">
        <div className="work-card-intake-purpose">
          <span>Purpose</span>
          <p>{projection.candidate.purpose}</p>
        </div>
        <Field label="Dependencies" values={projection.candidate.dependsOn} />
        <Field label="Resolution Status" value={projection.candidate.resolutionStatus} />
        <Field label="Resolution Reason" value={projection.candidate.resolutionReason || "None"} />
        {projection.candidate.carriedForwardToPhaseId ? (
          <Field label="Carried Forward To Phase" value={projection.candidate.carriedForwardToPhaseId} />
        ) : null}
        <Field label="Selection Eligibility" value={projection.selectionReason} wide />
      </section>

      <section className="work-card-intake-paths" aria-label="Work Card Intake paths">
        <Field label="Evidence Paths" values={projection.candidate.evidencePaths} wide />
        <Field label="Source Work Card Plan" value={projection.sourceWorkCardPlanPath} wide />
        <Field label="Intake Handoff Target" value={projection.handoffMarkdownPath} wide />
        <Field label="Formal Work Card Target" value={projection.formalWorkCardMarkdownPath} wide />
      </section>

      <footer className="work-card-intake-actions">
        <div>
          <strong>Application-generated non-review handoff</strong>
          <small>Creates the application-owned Approved non-review intake handoff. No disposition is required at this step.</small>
        </div>
        <button
          aria-label="Prepare Work Card Planning"
          className="apply-button"
          disabled={isGenerating}
          onClick={onGenerate}
          type="button"
        >
          {isGenerating ? "Preparing..." : "Prepare Work Card Planning"}
        </button>
      </footer>

      {actionError ? (
        <div className="work-card-intake-message error" role="status">
          {actionError}
        </div>
      ) : null}
      {actionFeedback ? (
        <div className="work-card-intake-message success" role="status">
          {actionFeedback}
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  values,
  wide,
}: {
  label: string;
  value?: string;
  values?: string[];
  wide?: boolean;
}): JSX.Element {
  const resolvedValues = values ?? (value ? [value] : []);
  return (
    <div className={wide ? "work-card-intake-field wide" : "work-card-intake-field"}>
      <dt>{label}</dt>
      <dd>
        {resolvedValues.length > 0
          ? resolvedValues.map((item) => <span key={item}>{item}</span>)
          : <span>None</span>}
      </dd>
    </div>
  );
}

export function workCardIntakeProjectionFingerprint(
  projection: WorkCardIntakeProjection,
): string {
  return [
    projection.phaseId,
    projection.candidate.candidateId,
    projection.handoffMarkdownPath,
    projection.formalWorkCardMarkdownPath,
  ].join("|");
}
