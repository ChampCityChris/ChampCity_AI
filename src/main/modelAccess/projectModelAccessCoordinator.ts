import type { RepositoryCheckout } from "../../shared/sourceLifecycleContracts";
import type {
  AgentHarnessRegisteredRepositoryCheckoutSummary,
  AgentHarnessRegisteredWorkspaceSummary,
  AgentHarnessWorkspaceRegistrySnapshot,
  ModelAccessProjectionStatus,
} from "../../shared/workspaceContracts";
import {
  publishRepositoryCheckoutAccess,
} from "../agentHarness/modelAccess/repositoryCheckoutAccessProjectionService";

export interface ProjectModelAccessPort {
  registerWorkspace(workspaceRoot: string): Promise<{
    workspace: AgentHarnessRegisteredWorkspaceSummary;
    registry: AgentHarnessWorkspaceRegistrySnapshot;
  }>;
  registerRepositoryCheckout(workspaceId: string, checkout: RepositoryCheckout): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>;
}

export type ProjectModelAccessPortFactory = () => ProjectModelAccessPort;

function degraded(error: unknown): ModelAccessProjectionStatus {
  const message = error instanceof Error ? error.message : String(error);
  return {
    state: "degraded",
    error: (message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Agent Harness model access is unavailable."),
  };
}

/** Downstream, idempotent model-access projection never changes application-owned source state. */
export async function reconcileProjectModelAccess(
  projectRoot: string,
  checkouts: readonly RepositoryCheckout[],
  portFactory: ProjectModelAccessPortFactory,
): Promise<ModelAccessProjectionStatus> {
  try {
    const port = portFactory();
    const registration = await port.registerWorkspace(projectRoot);
    const workspaceId = registration.workspace.workspaceId;
    if (checkouts.length > 0) {
      await publishRepositoryCheckoutAccess(workspaceId, checkouts, {
        registerRepositoryCheckout: (id, checkout) => port.registerRepositoryCheckout(id, checkout),
      });
    }
    return { state: "ready", error: null };
  } catch (error) {
    return degraded(error);
  }
}
