import fs from "node:fs";
import path from "node:path";

export interface BoundMcpWorkspaceDescriptor {
  workspaceId: string;
  label?: string;
  repositoryName?: string;
  branch?: string;
  gitBacked: boolean;
}

const bindingRelativePath = ".champcity/mcp-workspace-binding.json";
const explicitMcpWorkspaceBindingInvalidReason =
  "BLOCKED_MCP_WORKSPACE_BINDING_INVALID: configured MCP workspace binding is missing mcpWorkspaceId.";
const selectedWorkspaceRouteInvalidReason =
  "BLOCKED_SELECTED_PROJECT_ROOT_MCP_ROUTE_INVALID: selected project root folder basename does not produce a safe MCP workspaceId. Select a project repository folder with at least one alphanumeric or underscore character.";

export function requireBoundMcpWorkspace(workspaceRoot: string): BoundMcpWorkspaceDescriptor {
  return bindingFromSelectedProjectRoot(workspaceRoot);
}

export function readExplicitMcpWorkspaceBinding(workspaceRoot: string): BoundMcpWorkspaceDescriptor | null {
  return readConfiguredBinding(workspaceRoot);
}

export function buildMcpWorkspaceBindingPromptBlock(
  workspaceRoot: string,
  _workflowData?: Record<string, unknown>,
  options: { includeDiagnosticsToolboxHint?: boolean } = {},
): string[] {
  const binding = requireBoundMcpWorkspace(workspaceRoot);
  return [
    "MCP workspace binding:",
    `- Bound workspaceId: ${binding.workspaceId}`,
    `- Bound workspace label: ${binding.label ?? "Not provided"}`,
    `- Bound repository: ${binding.repositoryName ?? "Not provided"}`,
    ...(binding.branch ? [`- Bound branch: ${binding.branch}`] : []),
    `- Use ChampCity MCP workspaceId "${binding.workspaceId}" only.`,
    "- Use this workspaceId in every ChampCity MCP tool call.",
    "- Do not inspect, search, compare, or fall back to any other configured workspace.",
    ...(options.includeDiagnosticsToolboxHint === false
      ? []
      : ["- diagnostics_toolbox.list_workspaces may be used only to confirm that this workspaceId exists."]),
    "- A truncated or incomplete repository result never establishes that an artifact is absent.",
    "- Prefer an exact known artifact path over broad repository enumeration whenever that path is available.",
    "- Use registered workspace IDs exactly as returned by registered-workspace diagnostics; do not invent, normalize, or infer an alternate workspaceId from an incomplete repository result.",
    "- An unknown workspaceId fails closed with WORKSPACE_ACCESS_DENIED.",
    "- If the bound workspaceId is absent, inaccessible, or does not contain the exact required artifact path, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.",
  ];
}

export function resolveMcpWorkspaceBindingForPrompt(
  workspaceRoot: string,
  _workflowData?: Record<string, unknown>,
): BoundMcpWorkspaceDescriptor {
  return requireBoundMcpWorkspace(workspaceRoot);
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
    throw new Error(selectedWorkspaceRouteInvalidReason);
  }
  return workspaceId;
}

export function buildWriteMarkdownArtifactJsonBlock(
  workspaceRoot: string,
  relativePath: string,
  contentPlaceholder: string,
  _workflowData?: Record<string, unknown>,
): string[] {
  const binding = requireBoundMcpWorkspace(workspaceRoot);
  return JSON.stringify({
    action: "write_markdown_artifact",
    workspaceId: binding.workspaceId,
    params: {
      relativePath,
      content: contentPlaceholder,
      overwrite: false,
    },
  }, null, 2).split("\n");
}

export function buildReplaceMarkdownBodyJsonBlock(
  workspaceRoot: string,
  input: {
    relativePath: string;
    submissionId: string;
    expectedMetadataSha256: string;
    expectedBodySha256: string;
    bodyPlaceholder: string;
  },
): string[] {
  const binding = requireBoundMcpWorkspace(workspaceRoot);
  return JSON.stringify({
    action: "replace_markdown_body",
    workspaceId: binding.workspaceId,
    params: {
      relativePath: input.relativePath,
      submissionId: input.submissionId,
      expectedMetadataSha256: input.expectedMetadataSha256,
      expectedBodySha256: input.expectedBodySha256,
      bodyMarkdown: input.bodyPlaceholder,
    },
  }, null, 2).split("\n");
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
    throw new Error(explicitMcpWorkspaceBindingInvalidReason);
  }
  return {
    workspaceId,
    label: stringValue(parsed.label),
    repositoryName: stringValue(parsed.repositoryName),
    branch: stringValue(parsed.branch),
    gitBacked: parsed.gitBacked === true,
  };
}

function bindingFromSelectedProjectRoot(workspaceRoot: string): BoundMcpWorkspaceDescriptor {
  const resolvedRoot = path.resolve(workspaceRoot);
  const folderName = path.basename(resolvedRoot).trim();
  if (!folderName) {
    throw new Error(selectedWorkspaceRouteInvalidReason);
  }
  return {
    workspaceId: normalizeWorkspaceId(folderName),
    repositoryName: folderName,
    gitBacked: false,
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function projectRepositoryBasename(projectRepository: string): string {
  const trimmed = projectRepository.trim();
  if (!trimmed) {
    throw new Error(selectedWorkspaceRouteInvalidReason);
  }
  const normalized = trimmed.replace(/[\\/]+$/g, "").replace(/\\/g, "/");
  const basename = path.posix.basename(normalized).trim();
  if (!basename || basename === "." || basename === "..") {
    throw new Error(selectedWorkspaceRouteInvalidReason);
  }
  return basename;
}
