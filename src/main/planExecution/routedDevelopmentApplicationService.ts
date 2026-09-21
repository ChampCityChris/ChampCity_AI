import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import { codexImplementerExecutionService } from "../workCardBuilding/codexImplementerExecutionService";
import { createRoutedDevelopmentExecutionService, type RoutedWorkItemRequest } from "./routedDevelopmentExecutionService";
import { createRoutedIntegrationService } from "./routedIntegrationService";

/** The production routed caller uses the shared Codex execution service and its existing completion hook. */
export function createRoutedDevelopmentApplicationService(root: string, intakeId: string, implementer = codexImplementerExecutionService) {
  const execution = createRoutedDevelopmentExecutionService(root, intakeId);
  const integration = createRoutedIntegrationService(root, intakeId);
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
