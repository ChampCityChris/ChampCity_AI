import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import { codexImplementerExecutionService } from "../workCardBuilding/codexImplementerExecutionService";
import { createRoutedDevelopmentExecutionService, type RoutedWorkItemRequest } from "./routedDevelopmentExecutionService";
import { createWorkflowIntegrationService } from "../sourceControl/workflowIntegrationService";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createProjectStateService } from "../../shared/projectState/projectStateService";

/** The production routed caller uses the shared Codex execution service and its existing completion hook. */
export function createRoutedDevelopmentApplicationService(root: string, intakeId: string, implementer = codexImplementerExecutionService) {
  const execution = createRoutedDevelopmentExecutionService(root, intakeId);
  async function exactWorkflowIntegration() {
    const projectId = selectedCurrentProjectId(root);
    if (!projectId) throw Error("Selected Current Project registration is unavailable.");
    const store = createSQLiteProjectStateStore(`${root}/.champcity/project-state.sqlite`);
    try {
      const summary = await createProjectStateService(store, { principalId: "local-operator", principalType: "human", role: "Operator" }).getWorkIntakeSummary(projectId, intakeId);
      if (!summary.targetWorkflowId) throw Error("WorkIntake route has no exact target Workflow.");
      return createWorkflowIntegrationService(root, summary.targetWorkflowId);
    } finally { store.close(); }
  }
  const integration = {
    async query() { return (await exactWorkflowIntegration()).query(); },
    async integrate() { return (await exactWorkflowIntegration()).integrate(); },
    async prepareRepair(candidateId: string) { return (await exactWorkflowIntegration()).prepareRepair(candidateId); },
    async applyRepair(candidateId: string, repairId: string, patches: import("../../shared/integrationRepairContracts").IntegrationRepairPatch[]) { return (await exactWorkflowIntegration()).applyRepair(candidateId, repairId, patches); },
    async completeRepair(candidateId: string, repairId: string) { return (await exactWorkflowIntegration()).completeRepair(candidateId, repairId); },
  };
  return {
    execution, integration,
    async query() { return { execution: await execution.query(), integration: await integration.query() }; },
    async implementationStatus(workItemId: string) { return implementer.getStatus(root, { ownerKind: "routed-development", intakeId, workItemId }); },
    async implement(request: RoutedWorkItemRequest & { selection?: CodexModelSelection }) {
      const current = await execution.query();
      if (current.fingerprint !== request.expectedFingerprint || current.nextWorkItemId !== request.workItemId) throw Error("Presented routed Work Item changed; refresh before implementation.");
      return implementer.start(root, { ownerKind: "routed-development", intakeId, workItemId: request.workItemId }, request.selection);
    },
  };
}
