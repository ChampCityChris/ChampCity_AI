import fs from "node:fs";
import path from "node:path";
import { requireBoundMcpWorkspace } from "../../integrations/mcpWorkspacePromptContract";
import { AgentHarnessError } from "../../core/applicationErrors";
import type { RepositoryCheckout } from "../../../shared/sourceLifecycleContracts";
import type { AgentHarnessRegisteredRepositoryCheckoutSummary } from "../../../shared/workspaceContracts";

export interface AgentHarnessRepositoryCheckoutContext {
  workspaceId: string;
  root: string;
  checkout: RepositoryCheckout;
  release: () => void;
}

/** Git-only target; never enrolled as a workspace or application RepositoryCheckout. */
export interface AgentHarnessLocalGitContext {
  root: string;
  gitDirectory: string;
  commonDirectory: string;
  primary: boolean;
  localCheckoutHandle: string;
  repositoryHandle: string;
}

export type HarnessActionKind =
  | "read"
  | "workflow-write"
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
  return workspaceContext(resolvedRoot, binding.workspaceId, binding.repositoryName);
}

export async function resolveWorkspaceRootContextAsync(
  root: string,
): Promise<AgentHarnessWorkspaceContext> {
  const resolvedRoot = await fs.promises.realpath(path.resolve(root));
  const binding = requireBoundMcpWorkspace(resolvedRoot);
  return workspaceContext(resolvedRoot, binding.workspaceId, binding.repositoryName);
}

function workspaceContext(
  resolvedRoot: string,
  workspaceId: string,
  repositoryName: string | null | undefined,
): AgentHarnessWorkspaceContext {
  return {
    workspaceId,
    root: resolvedRoot,
    repositoryName: repositoryName ?? path.basename(resolvedRoot),
    // Workspace registration is intentionally Git-neutral. This legacy field is
    // retained as a non-authoritative diagnostic until downstream contracts retire it.
    gitBacked: false,
    capabilities: {
      filesystemRead: true,
      artifactWrite: true,
      patchWorkflow: true,
      gitInspection: false,
    },
  };
}

export function assertActionAccess(context: AgentHarnessWorkspaceContext, kind: HarnessActionKind): void {
  if ((kind === "git-mutation" || kind === "git-inspection") && !context.capabilities.gitInspection) {
    throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "A validated repository checkout is required for Git access.");
  }
}
