import { useEffect, useState, type ReactNode } from "react";
import type { WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import { isIntakeWorkflowType, WORKFLOW_INTAKE_DEFINITIONS, type WorkflowIntakePayload } from "../../shared/workflowIntakeContracts";
import { WORKFLOW_TYPE_REGISTRY } from "../../shared/projectState/workflowTypeRegistry";
import { IntakeWorkspaceShell } from "./IntakeWorkspaceShell";

export function WorkflowIntakeWorkspace({ workflow, onReturn, browserPanel, onPrepared }: {
  workflow: WorkflowInstanceSummary; onReturn: () => void; browserPanel: ReactNode; onPrepared: () => void;
}): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(""), [feedback, setFeedback] = useState("");
  useEffect(() => {
    let active = true;
    setLoaded(false); setSaved(false); setValues({}); setError(""); setFeedback("");
    void window.champcity.getWorkflowIntake(workflow.workflowId).then(model => {
      if (!active) return;
      setValues(model.workflowType !== "project-creation" && model.values ? { ...model.values } : {}); setSaved(!!model.values); setLoaded(true);
    }).catch(e => { if (active) setError(String(e).slice(0, 1000)); });
    return () => { active = false; };
  }, [workflow.workflowId]);
  if (!isIntakeWorkflowType(workflow.workflowType)) return <p role="alert">Workflow intake is unavailable.</p>;
  const workflowType = workflow.workflowType, definition = WORKFLOW_INTAKE_DEFINITIONS[workflowType];
  const save = async () => {
    setBusy(true); setError(""); setFeedback("");
    try {
      const model = await window.champcity.saveWorkflowIntake(workflow.workflowId, { workflowType, values } as unknown as WorkflowIntakePayload);
      setValues(model.workflowType !== "project-creation" && model.values ? { ...model.values } : {}); setSaved(true); setFeedback("Intake saved in Project State.");
    } catch (e) { setError(String(e).slice(0, 1000)); } finally { setBusy(false); }
  };
  const prepare = async () => {
    setBusy(true); setError("");
    try {
      if (workflowType === "feature-capability") await window.champcity.prepareFeaturePlanning(workflow.workflowId, "assessment");
      else if (workflowType === "issue-resolution") await window.champcity.prepareIssueWorkflowPlanning(workflow.workflowId, "rca");
      onPrepared();
    } catch (e) { setError(String(e).slice(0, 1000)); } finally { setBusy(false); }
  };
  return <IntakeWorkspaceShell heading={`${WORKFLOW_TYPE_REGISTRY[workflowType].label} Intake`}
    headerActions={<button type="button" className="workflow-instance-back" onClick={onReturn}>Back to Workflows</button>}
    companion={browserPanel}
    intake={<form className="intake-form" onSubmit={e => { e.preventDefault(); void save(); }}>
      {error && <p className="figma-intake-full" role="alert">{error}</p>}{feedback && <p className="figma-intake-full" role="status">{feedback}</p>}
      {definition.fields.map(field => <label className="figma-intake-full" key={field.key}><span>{field.label}{field.required ? " *" : ""}</span>
        {"helpText" in field && <small className="intake-help-text" id={`intake-help-${field.key}`}>{field.helpText}</small>}
        <textarea required={field.required} maxLength={field.maxLength} value={values[field.key] ?? ""}
          aria-describedby={"helpText" in field ? `intake-help-${field.key}` : undefined}
          disabled={!loaded || busy} onChange={e => { setValues({ ...values, [field.key]: e.target.value }); setSaved(false); setFeedback(""); }} />
      </label>)}
      <button type="submit" className="apply-button" disabled={!loaded || busy}>Save Intake</button>
      {(workflowType === "feature-capability" || workflowType === "issue-resolution") &&
        <button type="button" disabled={!saved || busy} onClick={() => void prepare()}>{workflowType === "feature-capability" ? "Prepare Feature Assessment" : "Prepare Issue RCA"}</button>}
    </form>} />;
}
