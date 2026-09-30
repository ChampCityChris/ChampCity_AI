import fs from "node:fs";
import path from "node:path";
import { runBoundedGit } from "../repository/boundedGit";
import type { RepositoryCheckout } from "../../../shared/sourceLifecycleContracts";
import type { AgentHarnessRegisteredRepositoryCheckoutSummary } from "../../../shared/workspaceContracts";
import { conventionalRepositoryCheckout } from "../../sourceControl/repositoryCheckoutDescriptors";

export interface RepositoryCheckoutAccessProjectionPort {
  registerRepositoryCheckout(workspaceId: string, checkout: RepositoryCheckout): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>;
  unregisterRepositoryCheckout?(workspaceId: string, repositoryCheckoutId: string): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]>;
  listRepositoryCheckoutSummaries?(workspaceId: string): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]>;
}

function confirms(expected: RepositoryCheckout, actual: AgentHarnessRegisteredRepositoryCheckoutSummary): boolean {
  return actual.repositoryCheckoutId === expected.repositoryCheckoutId && actual.repositoryId === expected.repositoryId &&
    actual.sourceLineId === expected.sourceLineId && actual.role === expected.role && actual.projectRelativePath === expected.projectRelativePath &&
    actual.workflowId === expected.workflowId && actual.availability === "available" && actual.validationError === null;
}

/** Publishes deterministic application-owned checkout descriptors to the model-access registry. */
export async function publishRepositoryCheckoutAccess(workspaceId: string, checkouts: readonly RepositoryCheckout[],
  projection: RepositoryCheckoutAccessProjectionPort): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]> {
  const published: AgentHarnessRegisteredRepositoryCheckoutSummary[] = [];
  for (const checkout of checkouts) {
    const result = await projection.registerRepositoryCheckout(workspaceId, checkout);
    if (!confirms(checkout, result)) throw new Error("Agent Harness did not confirm the exact RepositoryCheckout projection.");
    published.push(result);
  }
  return published;
}

/** Revokes model access without changing source-control state; missing projections are an idempotent no-op. */
export async function revokeRepositoryCheckoutAccess(workspaceId: string, checkouts: readonly RepositoryCheckout[],
  projection: RepositoryCheckoutAccessProjectionPort): Promise<void> {
  if (!projection.unregisterRepositoryCheckout) throw new Error("Agent Harness RepositoryCheckout revocation is unavailable.");
  for (const checkout of checkouts) await projection.unregisterRepositoryCheckout(workspaceId, checkout.repositoryCheckoutId);
}

async function isExactConventionalGitRoot(workspaceRoot: string): Promise<boolean> {
  try {
    const resolved = fs.realpathSync(workspaceRoot);
    if (path.resolve(resolved) !== path.resolve(workspaceRoot) || !fs.statSync(resolved).isDirectory()) return false;
    const result = await runBoundedGit({ cwd: resolved, args: ["rev-parse", "--show-toplevel"], rejectNonZero: false });
    return result.exitCode === 0 && path.resolve(result.stdout.trim()) === path.resolve(resolved);
  } catch {
    return false;
  }
}

/** Reconciles conventional Git access after generic workspace registration without initializing source. */
export async function reconcileWorkspaceRepositoryCheckouts(workspaceRoot: string, workspaceId: string,
  projection: RepositoryCheckoutAccessProjectionPort): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]> {
  if (!projection.listRepositoryCheckoutSummaries) throw new Error("Agent Harness RepositoryCheckout discovery is unavailable.");
  const registered = await projection.listRepositoryCheckoutSummaries(workspaceId);
  if (!(await isExactConventionalGitRoot(workspaceRoot))) return registered;
  if (registered.some(checkout => checkout.role === "conventional")) return registered;
  await publishRepositoryCheckoutAccess(workspaceId, [conventionalRepositoryCheckout(workspaceId)], projection);
  return projection.listRepositoryCheckoutSummaries(workspaceId);
}
