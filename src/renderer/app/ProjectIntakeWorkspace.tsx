import { useEffect, useState } from "react";
import { useWorkflowIntake } from "./useWorkflowIntake";
import { WorkflowIntakeReviewCard, WorkflowIntakeDisposition } from "./WorkflowIntakeReview";
import { FolderOpen } from "lucide-react";
import { projectTypeOptions, type ProjectIntakeSubmission } from "../../shared/workspaceContracts";
import { IntakeWorkspaceShell } from "./IntakeWorkspaceShell";

type ProjectIntakeWorkspaceProps = {
  workflowId?: string;
  onPrepared: () => void;
  onRailStatus: (status: "Open" | "Awaiting Approval" | "Completed") => void;
  repositoryIdentity: string;
  isChoosingProjectRepository: boolean;
  onChooseProjectRepository: () => void;
  onChange: (value: ProjectIntakeSubmission) => void;
  value: ProjectIntakeSubmission;
};

export function ProjectIntakeWorkspace(props: ProjectIntakeWorkspaceProps): JSX.Element {
  const state = useWorkflowIntake(props.workflowId);
  const [preparing, setPreparing] = useState(false), [prepareError, setPrepareError] = useState("");
  const prepare = async () => {
    if (!state.approved || state.busy) return;
    setPreparing(true); setPrepareError("");
    try {
      if (!props.workflowId) throw Error("Exact Project Creation Workflow is required.");
      const architect = await window.champcity.prepareStructuredArchitectWorkspace(props.workflowId);
      if (!architect.ready) throw Error(architect.reason ?? "Approve current Intake before Architect Interview.");
      props.onPrepared();
    }
    catch (error) { setPrepareError(String(error).slice(0, 1000)); }
    finally { setPreparing(false); }
  };
  useEffect(() => { props.onRailStatus(!state.model?.values ? "Open" : state.approved ? "Completed" : "Awaiting Approval"); }, [state.model, state.dirty, state.loaded]);
  useEffect(() => {
    if (state.model?.workflowType === "project-creation" && state.model.values)
      props.onChange(state.model.values);
  }, [state.model]);
  return <IntakeWorkspaceShell heading="Project Intake Questionnaire"
    intake={<>
      {state.error && <p role="alert">{state.error}</p>}
      <fieldset disabled={!state.loaded || state.busy || preparing} style={{display: "contents"}}>
        <ProjectIntakeCapture {...props} isSubmittingIntake={state.busy}
          onChange={value => { props.onChange(value); state.markDirty(); }}
          onSubmit={() => void state.save({workflowType: "project-creation", values: {...props.value, projectRepository: props.repositoryIdentity}})}
          />
      </fieldset>
      <WorkflowIntakeDisposition state={state} />
      {prepareError && <p role="alert">{prepareError}</p>}
      <button type="button" disabled={!state.approved || state.busy || preparing} onClick={() => void prepare()}>Prepare Architect Interview</button>
    </>}
    companion={<WorkflowIntakeReviewCard state={state} />} />;
}

function ProjectIntakeCapture({
  isChoosingProjectRepository,
  isSubmittingIntake,
  onChange,
  onChooseProjectRepository,
  onSubmit,
  value,
}: {
  isChoosingProjectRepository: boolean;
  isSubmittingIntake: boolean;
  onChange: (value: ProjectIntakeSubmission) => void;
  onChooseProjectRepository: () => void;
  onSubmit: () => void;
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

    </section>
  );
}
