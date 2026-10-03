import type {ComponentProps, ReactNode} from "react";
import {FolderOpen} from "lucide-react";
import {projectTypeOptions, type ProjectIntakeSubmission} from "../../shared/workspaceContracts";
import {IntakeWorkspaceShell} from "./IntakeWorkspaceShell";
import {FigmaDocumentCard} from "./FigmaDocumentCard";
import {FigmaDocumentDispositionPanel} from "./FigmaDocumentDispositionPanel";

export type ProjectIntakeShellProps = ComponentProps<typeof ProjectIntakeCapture> & {
  document: ComponentProps<typeof FigmaDocumentCard>;
  disposition: ComponentProps<typeof FigmaDocumentDispositionPanel> | null;
  captureDisabled?: boolean;
  feedback?: ReactNode;
  supportControls?: ReactNode;
};
/** Exact RWS01 intake presentation with authority supplied by the Greenfield adapter. */
export function ProjectIntakeShell(props: ProjectIntakeShellProps): JSX.Element {
  return <IntakeWorkspaceShell heading="Project Intake Questionnaire"
    intake={<>{props.feedback}<fieldset disabled={props.captureDisabled} style={{display:"contents"}}>
      <ProjectIntakeCapture {...props} />
    </fieldset>{props.disposition ? <FigmaDocumentDispositionPanel {...props.disposition} /> : null}{props.supportControls}</>}
    companion={<FigmaDocumentCard {...props.document} />} />;
}

function ProjectIntakeCapture({
  isChoosingProjectRepository,
  isSubmittingIntake,
  onChange,
  onChooseProjectRepository,
  onSubmit,
  postSubmitConfirmation,
  value,
}: {
  isChoosingProjectRepository: boolean;
  isSubmittingIntake: boolean;
  onChange: (value: ProjectIntakeSubmission) => void;
  onChooseProjectRepository: () => void;
  onSubmit: () => void;
  postSubmitConfirmation: {summary: string; entries: readonly {label: string; value: string}[]} | null;
  value: ProjectIntakeSubmission;
}): JSX.Element {
  const update = <Key extends keyof ProjectIntakeSubmission>(
    key: Key,
    nextValue: ProjectIntakeSubmission[Key],
  ): void => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <section className="intake-form" aria-label="Project Intake Capture">
      <label className="figma-intake-full">
        <span>Project Name</span>
        <input
          onChange={(event) => update("projectName", event.target.value)}
          required
          value={value.projectName}
        />
      </label>
      <label className="figma-intake-full">
        <span>Project Purpose - What are you trying to create, change, or accomplish?</span>
        <textarea
          onChange={(event) => update("projectPurpose", event.target.value)}
          required
          value={value.projectPurpose}
        />
      </label>
      <label className="figma-intake-full">
        <span>Desired Outcome - What should the finished product allow the user or Operator to do?</span>
        <textarea
          onChange={(event) => update("desiredOutcome", event.target.value)}
          required
          value={value.desiredOutcome}
        />
      </label>
      <div className="figma-intake-project-type">
        <label>
          <span>Project Type</span>
          <select
            onChange={(event) =>
              update("projectType", event.target.value as ProjectIntakeSubmission["projectType"])
            }
            required
            value={value.projectType}
          >
            {projectTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            checked={value.hasExistingSourceOrPlanning}
            onChange={(event) => update("hasExistingSourceOrPlanning", event.target.checked)}
            type="checkbox"
          />
          <span>Does this repository already contain source code or project planning documents?</span>
        </label>
      </div>
      <label>
        <span>Constraints / Non-Negotiables</span>
        <textarea
          onChange={(event) => update("knownConstraints", event.target.value)}
          value={value.knownConstraints ?? ""}
        />
      </label>
      <div className="intake-repository-row figma-intake-full">
        <label>
          <span>Project Repository</span>
          <input readOnly required value={value.projectRepository} />
        </label>
        <button
          className="icon-button text-button"
          disabled={isChoosingProjectRepository}
          onClick={onChooseProjectRepository}
          type="button"
        >
          <FolderOpen aria-hidden="true" size={18} />
          {isChoosingProjectRepository ? "Choosing..." : "Choose"}
        </button>
      </div>
      {value.hasExistingSourceOrPlanning ? (
        <label className="figma-intake-full">
          <span>What should the Architect know before reviewing the existing repository?</span>
          <textarea
            onChange={(event) => update("repositoryReviewContext", event.target.value)}
            value={value.repositoryReviewContext ?? ""}
          />
        </label>
      ) : null}
      <button
        className="apply-button"
        disabled={isSubmittingIntake}
        onClick={onSubmit}
        type="button"
      >
        {isSubmittingIntake ? "Saving..." : "Submit Project Intake"}
      </button>
      {postSubmitConfirmation ? (
        <section className="intake-confirmation" aria-label="Project Intake submission confirmation">
          <strong>{postSubmitConfirmation.summary}</strong>
          <dl>{postSubmitConfirmation.entries.map(entry => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl>
        </section>
      ) : null}
    </section>
  );
}
