import fs from "node:fs";
import path from "node:path";
import { requireBoundMcpWorkspace } from "../../integrations/mcpWorkspacePromptContract";
import { AgentHarnessError } from "../core/errors";
import { isGitBacked } from "../repository/repositoryOperations";
import type { RepositoryCheckout } from "../../../shared/sourceLifecycleContracts";
import type { AgentHarnessRegisteredRepositoryCheckoutSummary } from "../../../shared/workspaceContracts";

export interface AgentHarnessRepositoryCheckoutContext {
  workspaceId: string;
  root: string;
  checkout: RepositoryCheckout;
}

export type HarnessActionKind =
  | "read"
  | "artifact-write"
  | "patch-write"
  | "git-inspection"
  | "git-mutation"
  | "release-inspection"
  | "test-execution"
  | "release-mutation";

export interface AgentHarnessWorkspaceContext {
  workspaceId: string;
  root: string;
  repositoryName: string;
  gitBacked: boolean;
  capabilities: {
    filesystemRead: true;
    artifactWrite: true;
    patchWorkflow: true;
    gitInspection: boolean;
  };
}

export interface AgentHarnessWorkspaceAccessProvider {
  resolveWorkspaceContext: (workspaceId: unknown) => AgentHarnessWorkspaceContext | Promise<AgentHarnessWorkspaceContext>;
  listWorkspaceSummaries: () => Array<Omit<AgentHarnessWorkspaceContext, "root" | "capabilities"> & {
    availability: "available" | "unavailable";
  }>;
  resolveRepositoryCheckoutContext: (workspaceId: unknown, repositoryCheckoutId: unknown) => Promise<AgentHarnessRepositoryCheckoutContext>;
  listRepositoryCheckoutSummaries: (workspaceId: unknown) => Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]>;
}

export function createRegisteredWorkspaceAccessProvider(options: {
  resolveWorkspaceContext: AgentHarnessWorkspaceAccessProvider["resolveWorkspaceContext"];
  listWorkspaceSummaries: AgentHarnessWorkspaceAccessProvider["listWorkspaceSummaries"];
  resolveRepositoryCheckoutContext?: AgentHarnessWorkspaceAccessProvider["resolveRepositoryCheckoutContext"];
  listRepositoryCheckoutSummaries?: AgentHarnessWorkspaceAccessProvider["listRepositoryCheckoutSummaries"];
}): AgentHarnessWorkspaceAccessProvider {
  return {
    resolveWorkspaceContext: options.resolveWorkspaceContext,
    listWorkspaceSummaries: options.listWorkspaceSummaries,
    resolveRepositoryCheckoutContext: options.resolveRepositoryCheckoutContext ?? (async () => { throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "No registered RepositoryCheckout resolver is available."); }),
    listRepositoryCheckoutSummaries: options.listRepositoryCheckoutSummaries ?? (async () => []),
  };
}

export function resolveWorkspaceRootContext(root: string): AgentHarnessWorkspaceContext {
  const resolvedRoot = fs.realpathSync.native(path.resolve(root));
  const binding = requireBoundMcpWorkspace(resolvedRoot);
  const gitMetadataPath = path.join(resolvedRoot, ".git");
  const gitBacked = fs.existsSync(path.join(gitMetadataPath, "HEAD")) || fs.statSync(gitMetadataPath, {
    throwIfNoEntry: false,
  })?.isFile() === true;
  return workspaceContext(resolvedRoot, binding.workspaceId, binding.repositoryName, gitBacked);
}

export async function resolveWorkspaceRootContextAsync(
  root: string,
): Promise<AgentHarnessWorkspaceContext> {
  const resolvedRoot = await fs.promises.realpath(path.resolve(root));
  const binding = requireBoundMcpWorkspace(resolvedRoot);
  const gitBacked = await isGitBacked(resolvedRoot);
  return workspaceContext(resolvedRoot, binding.workspaceId, binding.repositoryName, gitBacked);
}

function workspaceContext(
  resolvedRoot: string,
  workspaceId: string,
  repositoryName: string | null | undefined,
  gitBacked: boolean,
): AgentHarnessWorkspaceContext {
  return {
    workspaceId,
    root: resolvedRoot,
    repositoryName: repositoryName ?? path.basename(resolvedRoot),
    gitBacked,
    capabilities: {
      filesystemRead: true,
      artifactWrite: true,
      patchWorkflow: true,
      gitInspection: gitBacked,
    },
  };
}

export function assertActionAccess(context: AgentHarnessWorkspaceContext, kind: HarnessActionKind): void {
  if ((kind === "git-mutation" || kind === "git-inspection") && !context.capabilities.gitInspection) {
    throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "A validated repository checkout is required for Git access.");
  }
}
