import {useEffect, useState, type ReactNode} from "react";
import type {WorkIntakeProjection} from "../../shared/workIntakeContracts";
import type {WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import {WorkIntakeWorkspace} from "./WorkIntakeWorkspace";
import {StructuredWorkRoutingWorkspace} from "./StructuredWorkRoutingWorkspace";
export function OptionalWorkIntakeWorkspace({workflow, browserPanel, onReturn, onRouted}: {
  workflow: WorkflowInstanceSummary | null; browserPanel: ReactNode; onReturn: () => void; onRouted: (workflowId: string) => void;
}) {
  const [projection, setProjection] = useState<WorkIntakeProjection | null>(null), [routing, setRouting] = useState(workflow), [error, setError] = useState("");
  useEffect(() => {let active = true; setProjection(null); setRouting(workflow); setError("");
    void window.champcity.getWorkIntakeProjection().then(result => {if (active) setProjection(result);}).catch(reason => {if (active) setError(String(reason));});
    return () => {active = false;};}, [workflow?.workflowId]);
  if (routing?.workIntakeId) return <StructuredWorkRoutingWorkspace intakeId={routing.workIntakeId} routingWorkflowId={routing.workflowId}
    browserPanel={browserPanel} onReloadBrowser={() => void window.champcity.reloadArchitectBrowser().catch(reason => setError(String(reason)))} onReturn={onReturn} onRouted={onRouted} />;
  return <>{error ? <p role="alert">{error}</p> : null}{projection ? <WorkIntakeWorkspace projection={projection} onReturn={onReturn}
    onSaved={async intakeId => {
      const inventory = await window.champcity.listWorkflows();
      const exact = inventory.groups.find(group => group.workflowType === "work-intake-routing")?.workflows.find(item => item.workIntakeId === intakeId);
      if (!exact) throw Error("Saved Work Intake routing identity is unavailable.");
      setRouting((await window.champcity.getWorkflow(exact.workflowId)).workflow);
    }} /> : <p>Loading optional Work Intake…</p>}</>;
}
