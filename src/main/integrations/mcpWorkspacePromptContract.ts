import fs from "node:fs";
import path from "node:path";
import type { RepositoryAuthority } from "../documents/repositoryAuthority";
import {
  repositoryAuthorityFromWorkflowData,
} from "../documents/repositoryAuthority";

export interface BoundMcpWorkspaceDescriptor {
  workspaceId: string;
  label?: string;
  repositoryName?: string;
  branch?: string;
  gitBacked: boolean;
}

const bindingRelativePath = ".champcity/mcp-workspace-binding.json";
const blockedReason =
  "BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH: selected project has no explicit MCP workspace binding. Bind or select the ChampCity MCP workspace before generating this prompt.";
const projectRepositoryRouteRequiredReason =
  "BLOCKED_PROJECT_REPOSITORY_MCP_ROUTE_REQUIRED: current prompt metadata has no projectRepository authority. Regenerate the current canonical handoff from Project Intake before preparing MCP prompts.";
const projectRepositoryRouteInvalidReason =
  "BLOCKED_PROJECT_REPOSITORY_MCP_ROUTE_INVALID: projectRepository folder basename does not produce a safe MCP workspaceId. Select a project repository folder with at least one alphanumeric or underscore character.";

export function requireBoundMcpWorkspace(workspaceRoot: string): BoundMcpWorkspaceDescriptor {
  const configured = readConfiguredBinding(workspaceRoot);
  if (configured) {
    return configured;
  }
  throw new Error(blockedReason);
}

export function readExplicitMcpWorkspaceBinding(workspaceRoot: string): BoundMcpWorkspaceDescriptor | null {
  return readConfiguredBinding(workspaceRoot);
}

export function buildMcpWorkspaceBindingPromptBlock(
  workspaceRoot: string,
  workflowData?: Record<string, unknown>,
): string[] {
  const binding = workflowData
    ? bindingForPrompt(workspaceRoot, workflowData)
    : requireBoundMcpWorkspace(workspaceRoot);
  return [
    "MCP workspace binding:",
    `- Bound workspaceId: ${binding.workspaceId}`,
    `- Bound workspace label: ${binding.label ?? "Not provided"}`,
    `- Bound repository: ${binding.repositoryName ?? "Not provided"}`,
    ...(binding.branch ? [`- Bound branch: ${binding.branch}`] : []),
    `- Use ChampCity MCP workspaceId "${binding.workspaceId}" only.`,
    "- Use this workspaceId in every ChampCity MCP tool call.",
    "- Do not inspect, search, compare, or fall back to any other configured workspace.",
    "- diagnostics_toolbox.list_workspaces may be used only to confirm that this workspaceId exists.",
    "- If the bound workspaceId is absent, inaccessible, or does not contain the exact required artifact path, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.",
  ];
}

export function resolveMcpWorkspaceBindingForPrompt(
  workspaceRoot: string,
  workflowData: Record<string, unknown>,
): BoundMcpWorkspaceDescriptor {
  return bindingForPrompt(workspaceRoot, workflowData);
}

export function workspaceIdFromProjectRepository(projectRepository: string): string {
  const folderName = projectRepositoryBasename(projectRepository);
  return normalizeWorkspaceId(folderName);
}

export function normalizeWorkspaceId(value: string): string {
  const workspaceId = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!/^[a-z0-9_]+$/.test(workspaceId)) {
    throw new Error(projectRepositoryRouteInvalidReason);
  }
  return workspaceId;
}

export function buildCreateMarkdownArtifactJsonBlock(
  workspaceRoot: string,
  relativePath: string,
  contentPlaceholder: string,
  workflowData?: Record<string, unknown>,
): string[] {
  const binding = workflowData
    ? bindingForPrompt(workspaceRoot, workflowData)
    : requireBoundMcpWorkspace(workspaceRoot);
  return JSON.stringify({
    action: "create_markdown_artifact",
    workspaceId: binding.workspaceId,
    params: {
      relativePath,
      content: contentPlaceholder,
      overwrite: false,
    },
  }, null, 2).split("\n");
}

function bindingForPrompt(
  workspaceRoot: string,
  workflowData: Record<string, unknown>,
): BoundMcpWorkspaceDescriptor {
  const authority = repositoryAuthorityFromWorkflowData(workflowData);
  if (!authority) {
    const configured = readConfiguredBinding(workspaceRoot);
    if (configured) {
      return configured;
    }
    throw new Error(projectRepositoryRouteRequiredReason);
  }
  if (authority.mcpWorkspaceBinding) {
    return bindingFromRepositoryAuthority(authority as RepositoryAuthority & {
      mcpWorkspaceBinding: NonNullable<RepositoryAuthority["mcpWorkspaceBinding"]>;
    });
  }
  const workspaceId = workspaceIdFromProjectRepository(authority.projectRepository);
  return {
    workspaceId,
    repositoryName: projectRepositoryBasename(authority.projectRepository),
    gitBacked: false,
  };
}

function bindingFromRepositoryAuthority(
  authority: RepositoryAuthority & { mcpWorkspaceBinding: NonNullable<RepositoryAuthority["mcpWorkspaceBinding"]> },
): BoundMcpWorkspaceDescriptor {
  return {
    workspaceId: authority.mcpWorkspaceBinding.mcpWorkspaceId,
    label: authority.mcpWorkspaceBinding.label,
    repositoryName: authority.mcpWorkspaceBinding.repositoryName,
    branch: authority.mcpWorkspaceBinding.branch,
    gitBacked: authority.mcpWorkspaceBinding.gitBacked,
  };
}

export function mcpWorkspaceBindingConfigPath(workspaceRoot: string): string {
  return path.join(path.resolve(workspaceRoot), bindingRelativePath);
}

function readConfiguredBinding(workspaceRoot: string): BoundMcpWorkspaceDescriptor | null {
  const configPath = mcpWorkspaceBindingConfigPath(workspaceRoot);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
  const workspaceId = stringValue(parsed.mcpWorkspaceId) ?? stringValue(parsed.workspaceId);
  if (!workspaceId) {
    throw new Error(blockedReason);
  }
  return {
    workspaceId,
    label: stringValue(parsed.label),
    repositoryName: stringValue(parsed.repositoryName),
    branch: stringValue(parsed.branch),
    gitBacked: parsed.gitBacked === true,
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function projectRepositoryBasename(projectRepository: string): string {
  const trimmed = projectRepository.trim();
  if (!trimmed) {
    throw new Error(projectRepositoryRouteRequiredReason);
  }
  const normalized = trimmed.replace(/[\\/]+$/g, "").replace(/\\/g, "/");
  const basename = path.posix.basename(normalized).trim();
  if (!basename || basename === "." || basename === "..") {
    throw new Error(projectRepositoryRouteInvalidReason);
  }
  return basename;
}
