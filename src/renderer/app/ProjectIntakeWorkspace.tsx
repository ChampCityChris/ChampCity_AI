import { useEffect, useState } from "react";
import { useWorkflowIntake } from "./useWorkflowIntake";
import { type ProjectIntakeSubmission } from "../../shared/workspaceContracts";
import {ProjectIntakeShell} from "./ProjectIntakeShell";

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
  const document = state.model?.reviewDocument ?? null;
  return <ProjectIntakeShell {...props} isSubmittingIntake={state.busy}
    onChange={value => {props.onChange(value); state.markDirty();}}
    onSubmit={() => void state.save({workflowType:"project-creation", values:{...props.value, projectRepository:props.repositoryIdentity}})}
    captureDisabled={!state.loaded || state.busy || preparing}
    postSubmitConfirmation={document && !state.dirty ? {
      summary:"Project Intake Markdown was created successfully in the active repository.",
      entries:[{label:"Project Intake Markdown", value:document.markdownPath}],
    } : null}
    feedback={state.error ? <p role="alert">{state.error}</p> : null}
    document={{selectedDocument:document, documentError:state.error, feedback:state.model?.materializationError ?? "",
      neutralMessage:"Save Intake to generate Markdown for review.", onCopy:() => {void navigator.clipboard.writeText(document?.bodyMarkdown ?? "");}}}
    disposition={document ? {canApply:Boolean(state.status) && !state.dirty && state.loaded, currentDocument:document.displayFilename,
      effectiveDisposition:document.effectiveDisposition, isApplying:state.busy, notes:state.notes, onNotesChange:state.setNotes,
      onStatusChange:state.setStatus, status:state.status, onApply:() => void state.review(), workflowStep:"Review & Validation",
      warning:state.dirty ? "Save changes before reviewing the current Intake revision." : undefined} : null}
    supportControls={<>{prepareError ? <p role="alert">{prepareError}</p> : null}
      <button type="button" disabled={!state.approved || state.busy || preparing} onClick={() => void prepare()}>Prepare Architect Interview</button></>} />;
}
