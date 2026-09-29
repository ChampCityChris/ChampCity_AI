import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import type { RepositoryCheckout } from "../../shared/sourceLifecycleContracts";
import type { AgentHarnessRegisteredRepositoryCheckoutSummary } from "../../shared/workspaceContracts";

export interface RepositoryCheckoutReconciliationPort {
  registerRepositoryCheckout(workspaceId: string, checkout: RepositoryCheckout): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>;
  listRepositoryCheckoutSummaries(workspaceId: string): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]>;
}

function conventionalIdentity(workspaceId: string): { repositoryId: string; repositoryCheckoutId: string } {
  const suffix = createHash("sha256").update(workspaceId).digest("hex").slice(0, 32);
  return { repositoryId: `repository-${suffix}`, repositoryCheckoutId: `conventional-${suffix}` };
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

/**
 * Reconciles application-owned source-control authority after generic workspace
 * registration. Absence of Git is a normal no-op and never initializes a repo.
 */
export async function reconcileWorkspaceRepositoryCheckouts(
  workspaceRoot: string,
  workspaceId: string,
  registration: RepositoryCheckoutReconciliationPort,
): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]> {
  const registered = await registration.listRepositoryCheckoutSummaries(workspaceId);
  if (!(await isExactConventionalGitRoot(workspaceRoot))) return registered;

  const identity = conventionalIdentity(workspaceId);
  const expected: RepositoryCheckout = {
    repositoryCheckoutId: identity.repositoryCheckoutId,
    repositoryId: identity.repositoryId,
    sourceLineId: "conventional",
    role: "conventional",
    projectRelativePath: ".",
  };
  const conventional = registered.find((checkout) => checkout.role === "conventional");
  if (conventional) return registered;
  await registration.registerRepositoryCheckout(workspaceId, expected);
  return registration.listRepositoryCheckoutSummaries(workspaceId);
}
