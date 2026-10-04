import { useEffect } from "react";
import { useWorkflowIntake } from "./useWorkflowIntake";
import { type ProjectIntakeSubmission } from "../../shared/workspaceContracts";
import {ProjectIntakeShell} from "./ProjectIntakeShell";

type ProjectIntakeWorkspaceProps = {
  readOnly?: boolean;
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
  const state = useWorkflowIntake(props.workflowId, props.onPrepared);
  useEffect(() => { props.onRailStatus(!state.model?.values ? "Open" : state.approved ? "Completed" : "Awaiting Approval"); }, [state.model, state.dirty, state.loaded]);
  useEffect(() => {
    if (state.model?.workflowType === "project-creation" && state.model.values)
      props.onChange(state.model.values);
  }, [state.model]);
  const document = state.model?.reviewDocument ?? null;
  return <ProjectIntakeShell {...props} isSubmittingIntake={state.busy}
    onChange={value => {props.onChange(value); state.markDirty();}}
    onSubmit={() => !props.readOnly && void state.save({workflowType:"project-creation", values:{...props.value, projectRepository:props.repositoryIdentity}})}
    captureDisabled={props.readOnly || !state.loaded || state.busy}
    postSubmitConfirmation={document && !state.dirty ? {
      summary:"Project Intake Markdown was created successfully in the active repository.",
      entries:[{label:"Project Intake Markdown", value:document.markdownPath}],
    } : null}
    feedback={state.error ? <p role="alert">{state.error}</p> : null}
    document={{selectedDocument:document, documentError:state.error, feedback:state.model?.materializationError ?? "",
      neutralMessage:"Save Intake to generate Markdown for review.", onCopy:() => {void navigator.clipboard.writeText(document?.bodyMarkdown ?? "");}}}
    disposition={document ? {canApply:!props.readOnly && Boolean(state.status) && !state.dirty && state.loaded, currentDocument:document.displayFilename,
      effectiveDisposition:document.effectiveDisposition, isApplying:state.busy, notes:state.notes, onNotesChange:state.setNotes,
      onStatusChange:state.setStatus, status:state.status, onApply:() => {if(!props.readOnly)void state.review();}, workflowStep:"Review & Validation",
      warning:state.dirty ? "Save changes before reviewing the current Intake revision." : undefined} : null}
    />;
}
