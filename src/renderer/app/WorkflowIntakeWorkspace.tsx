import { useEffect, useState } from "react";
import type { WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import { isIntakeWorkflowType, WORKFLOW_INTAKE_DEFINITIONS, type WorkflowIntakePayload } from "../../shared/workflowIntakeContracts";
import { WORKFLOW_TYPE_REGISTRY } from "../../shared/projectState/workflowTypeRegistry";
import { useWorkflowIntake } from "./useWorkflowIntake";
import { WorkflowIntakeReviewCard, WorkflowIntakeDisposition } from "./WorkflowIntakeReview";
import { IntakeWorkspaceShell } from "./IntakeWorkspaceShell";

export function WorkflowIntakeWorkspace({ workflow, onReturn, onPrepared }: {
  workflow: WorkflowInstanceSummary; onReturn: () => void; onPrepared: () => void;
}): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({});
  const state = useWorkflowIntake(workflow.workflowId);
  const {busy, loaded, error} = state;
  const [preparing, setPreparing] = useState(false), [prepareError, setPrepareError] = useState("");
  useEffect(() => {
    setValues(state.model?.workflowType !== "project-creation" && state.model?.values ? { ...state.model.values } : {});
  }, [state.model]);
  if (!isIntakeWorkflowType(workflow.workflowType)) return <p role="alert">Workflow intake is unavailable.</p>;
  const workflowType = workflow.workflowType, definition = WORKFLOW_INTAKE_DEFINITIONS[workflowType];
  const save = () => state.save({workflowType, values} as unknown as WorkflowIntakePayload);
  const prepare = async () => {
    if (!state.approved || busy) return;
    setPreparing(true); setPrepareError("");
    try {
      if (workflowType === "feature-capability" || workflowType === "issue-resolution") await window.champcity.prepareStructuredArchitectWorkspace(workflow.workflowId);
      onPrepared();
    } catch (e) { setPrepareError(String(e).slice(0, 1000)); } finally { setPreparing(false); }
  };
  return <IntakeWorkspaceShell heading={`${WORKFLOW_TYPE_REGISTRY[workflowType].label} Intake`}
    headerActions={<button type="button" className="workflow-instance-back" onClick={onReturn}>Back to Workflows</button>}
    companion={<WorkflowIntakeReviewCard state={state} />}
    intake={<><form className="intake-form" onSubmit={e => { e.preventDefault(); void save(); }}>
      {error && <p className="figma-intake-full" role="alert">{error}</p>}{prepareError && <p role="alert">{prepareError}</p>}
      {definition.fields.map(field => <label className="figma-intake-full" key={field.key}><span>{field.label}{field.required ? " *" : ""}</span>
        {"helpText" in field && <small className="intake-help-text" id={`intake-help-${field.key}`}>{field.helpText}</small>}
        <textarea required={field.required} maxLength={field.maxLength} value={values[field.key] ?? ""}
          aria-describedby={"helpText" in field ? `intake-help-${field.key}` : undefined}
          disabled={!loaded || busy || preparing} onChange={e => { setValues({ ...values, [field.key]: e.target.value }); state.markDirty(); }} />
      </label>)}
      <button type="submit" className="apply-button" disabled={!loaded || busy || preparing}>Save Intake</button>
      {(workflowType === "feature-capability" || workflowType === "issue-resolution") &&
        <button type="button" disabled={!state.approved || busy || preparing} onClick={() => void prepare()}>{workflowType === "feature-capability" ? "Prepare Feature Assessment" : "Prepare Issue RCA"}</button>}
    </form><WorkflowIntakeDisposition state={state} /></>} />;
}
