import { createHash } from "node:crypto";
import { MANAGED_PROJECT_SOURCE_PATHS, type RepositoryCheckout } from "../../shared/sourceLifecycleContracts";
import { AgentHarnessError } from "../core/applicationErrors";
import { workflowSourceLineName } from "./workSourceNaming";

const opaqueId = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const canonicalWorkflowId = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function boundedIdentity(value: string, label: string): void {
  if (!opaqueId.test(value)) throw new AgentHarnessError("INVALID_INPUT", `A bounded ${label} identity is required.`);
}

function suffix(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/** Pure application-owned descriptor for an exact conventional Project-root checkout. */
export function conventionalRepositoryCheckout(workspaceId: string): RepositoryCheckout {
  boundedIdentity(workspaceId, "workspace");
  const identity = suffix(workspaceId);
  return { repositoryCheckoutId: `conventional-${identity}`, repositoryId: `repository-${identity}`,
    sourceLineId: "conventional", role: "conventional", projectRelativePath: "." };
}

/** Pure application-owned descriptors for the durable managed Main and Dev checkouts. */
export function managedRepositoryCheckouts(repositoryId: string): { mainCheckout: RepositoryCheckout; devCheckout: RepositoryCheckout } {
  boundedIdentity(repositoryId, "repository");
  const identity = suffix(repositoryId);
  return {
    mainCheckout: { repositoryCheckoutId: `main-${identity}`, repositoryId, sourceLineId: "main", role: "main",
      projectRelativePath: MANAGED_PROJECT_SOURCE_PATHS.mainCheckoutRelativePath },
    devCheckout: { repositoryCheckoutId: `dev-${identity}`, repositoryId, sourceLineId: "dev", role: "dev",
      projectRelativePath: MANAGED_PROJECT_SOURCE_PATHS.devCheckoutRelativePath },
  };
}

export function workflowRepositoryCheckoutId(workflowId: string): string {
  if (!canonicalWorkflowId.test(workflowId)) throw new AgentHarnessError("INVALID_INPUT", "Workflow ID must be a canonical lowercase UUID.");
  return `workflow-${workflowId}`;
}

/** Deterministic descriptor for one Workflow's immutable source checkout. */
export function workflowRepositoryCheckout(repositoryId: string, workflowId: string): RepositoryCheckout {
  boundedIdentity(repositoryId, "repository");
  return { repositoryCheckoutId: workflowRepositoryCheckoutId(workflowId), repositoryId, sourceLineId: workflowSourceLineName(workflowId), role: "workflow",
    projectRelativePath: `${MANAGED_PROJECT_SOURCE_PATHS.workflowCheckoutRootRelativePath}/${workflowId}`, workflowId };
}
