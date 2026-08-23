import fs from "node:fs";
import path from "node:path";
import { requireBoundMcpWorkspace } from "../../integrations/mcpWorkspacePromptContract";
import { AgentHarnessError } from "../core/errors";
import { isGitBacked } from "../repository/repositoryOperations";

export type HarnessActionKind = "read" | "artifact-write" | "patch-write" | "git-inspection" | "git-mutation";

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
    gitMutation: boolean;
  };
}

export interface AgentHarnessAuthorityProvider {
  resolveWorkspaceContext: () => AgentHarnessWorkspaceContext;
  isGitMutationAuthorized: () => boolean;
}

export function createSelectedProjectAuthorityProvider(options: {
  getSelectedProjectRoot: () => string;
  isGitMutationAuthorized?: () => boolean;
}): AgentHarnessAuthorityProvider {
  return {
    resolveWorkspaceContext: () => resolveSelectedProjectContext(options.getSelectedProjectRoot(), {
      gitMutationAuthorized: options.isGitMutationAuthorized?.() ?? false,
    }),
    isGitMutationAuthorized: () => options.isGitMutationAuthorized?.() ?? false,
  };
}

export function resolveSelectedProjectContext(root: string, options: { gitMutationAuthorized?: boolean } = {}): AgentHarnessWorkspaceContext {
  const resolvedRoot = fs.realpathSync.native(path.resolve(root));
  const binding = requireBoundMcpWorkspace(resolvedRoot);
  const gitBacked = isGitBacked(resolvedRoot);
  return {
    workspaceId: binding.workspaceId,
    root: resolvedRoot,
    repositoryName: binding.repositoryName ?? path.basename(resolvedRoot),
    gitBacked,
    capabilities: {
      filesystemRead: true,
      artifactWrite: true,
      patchWorkflow: true,
      gitInspection: gitBacked,
      gitMutation: options.gitMutationAuthorized === true,
    },
  };
}

export function assertWorkspaceIdMatches(context: AgentHarnessWorkspaceContext, suppliedWorkspaceId: unknown): void {
  if (typeof suppliedWorkspaceId !== "string" || suppliedWorkspaceId !== context.workspaceId) {
    throw new AgentHarnessError("AUTHORITY_DENIED", "Tool call workspaceId does not match the active selected project.", {
      expectedWorkspaceId: context.workspaceId,
      suppliedWorkspaceId: typeof suppliedWorkspaceId === "string" ? suppliedWorkspaceId : null,
    });
  }
}

export function assertActionAuthority(context: AgentHarnessWorkspaceContext, kind: HarnessActionKind): void {
  if (kind === "git-mutation" && !context.capabilities.gitMutation) {
    throw new AgentHarnessError("GIT_MUTATION_DENIED", "Git mutation requires explicit active A/I workflow authorization.");
  }
  if (kind === "git-inspection" && !context.capabilities.gitInspection) {
    throw new AgentHarnessError("AUTHORITY_DENIED", "The active selected project is not Git-backed.");
  }
}
