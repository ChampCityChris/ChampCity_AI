import type { RepositoryCheckout } from "../../shared/sourceLifecycleContracts";
import type {
  AgentHarnessRegisteredRepositoryCheckoutSummary,
  AgentHarnessRegisteredWorkspaceSummary,
  AgentHarnessWorkspaceRegistrySnapshot,
  ModelAccessProjectionStatus,
} from "../../shared/workspaceContracts";
import { conventionalRepositoryCheckout } from "../sourceControl/repositoryCheckoutDescriptors";
import {
  publishRepositoryCheckoutAccess,
  revokeRepositoryCheckoutAccess,
} from "../agentHarness/modelAccess/repositoryCheckoutAccessProjectionService";

export interface ProjectModelAccessPort {
  registerWorkspace(workspaceRoot: string): Promise<{
    workspace: AgentHarnessRegisteredWorkspaceSummary;
    registry: AgentHarnessWorkspaceRegistrySnapshot;
  }>;
  registerRepositoryCheckout(workspaceId: string, checkout: RepositoryCheckout): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>;
  unregisterRepositoryCheckout(workspaceId: string, repositoryCheckoutId: string): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]>;
}

export type ProjectModelAccessPortFactory = () => ProjectModelAccessPort;

export class ModelAccessQuiescenceError extends Error {
  readonly code = "MODEL_ACCESS_QUIESCENCE_FAILED";

  constructor(cause: unknown) {
    const busy = typeof cause === "object" && cause !== null && "code" in cause &&
      (cause as { code?: unknown }).code === "REPOSITORY_CHECKOUT_RETIRING";
    super(busy
      ? "Model access is live and the conventional checkout is busy; Git conversion was not started. Release the active model operation and retry."
      : "Model access is live but the conventional checkout could not be safely quiesced; Git conversion was not started. Restore Agent Harness availability and retry.");
    this.name = "ModelAccessQuiescenceError";
  }
}

function degraded(error: unknown): ModelAccessProjectionStatus {
  const message = error instanceof Error ? error.message : String(error);
  return {
    state: "degraded",
    error: (message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Agent Harness model access is unavailable."),
  };
}

/** Transport absence is degraded state; a live registry that cannot retire access is a pre-cutover safety blocker. */
export async function quiesceConventionalProjectModelAccess(
  projectRoot: string,
  portFactory: ProjectModelAccessPortFactory,
): Promise<ModelAccessProjectionStatus> {
  let port: ProjectModelAccessPort;
  let workspaceId: string;
  try {
    port = portFactory();
    const registration = await port.registerWorkspace(projectRoot);
    workspaceId = registration.workspace.workspaceId;
  } catch (error) {
    return degraded(error);
  }

  try {
    await revokeRepositoryCheckoutAccess(
      workspaceId,
      [conventionalRepositoryCheckout(workspaceId)],
      {
        unregisterRepositoryCheckout: (id, checkoutId) => port.unregisterRepositoryCheckout(id, checkoutId),
        registerRepositoryCheckout: (id, checkout) => port.registerRepositoryCheckout(id, checkout),
      },
    );
    return { state: "ready", error: null };
  } catch (error) {
    throw new ModelAccessQuiescenceError(error);
  }
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

/** Best-effort rollback projection for a source conversion that failed before conventional Git authority changed. */
export async function reconcileConventionalProjectModelAccess(
  projectRoot: string,
  portFactory: ProjectModelAccessPortFactory,
): Promise<ModelAccessProjectionStatus> {
  try {
    const port = portFactory();
    const registration = await port.registerWorkspace(projectRoot);
    const workspaceId = registration.workspace.workspaceId;
    await publishRepositoryCheckoutAccess(workspaceId, [conventionalRepositoryCheckout(workspaceId)], {
      registerRepositoryCheckout: (id, checkout) => port.registerRepositoryCheckout(id, checkout),
    });
    return { state: "ready", error: null };
  } catch (error) {
    return degraded(error);
  }
}
