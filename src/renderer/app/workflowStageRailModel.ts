import { getWorkflowTypeDefinition } from "../../shared/projectState/workflowTypeRegistry";
import type { WorkflowStage } from "./WorkflowStageRail";

/** Only exact substantive entry workspaces have an Intake rail. */
export function deriveWorkflowStageRailModel(workflow: {
  workflowType: string;
  currentWorkspace: string;
} | null | undefined): readonly WorkflowStage[] | null {
  if (!workflow) return null;
  const definition = getWorkflowTypeDefinition(workflow.workflowType);
  if (!definition || definition.workflowType === "project-creation" ||
      definition.workflowType === "work-intake-routing" ||
      workflow.currentWorkspace !== definition.entryWorkspace) return null;
  const issue = definition.workflowType === "issue-resolution";
  return [
    ["intake", "Intake"],
    ["assessment", issue ? "Root Cause Analysis" : "Architect Assessment"],
    ["planning", issue ? "Correction Planning" : "Planning"],
    ["topology", "Topology"], ["execution", "Execution"],
    ["validation", "Validation"], ["close", "Close"],
  ].map(([id, label], index) => ({
    id, label, statusLabel: index === 0 ? "Open" : "Not Ready",
    state: index === 0 ? "exact" : "available",
    isRequired: index === 0, enabled: index === 0,
    // Intake is already current; no persistence or workspace transition is needed.
    onClick: index === 0 ? () => {} : undefined,
  }));
}
