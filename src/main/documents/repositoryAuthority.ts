import fs from "node:fs";
import path from "node:path";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { SourceRevision } from "../../shared/documents/planningDocument";
import type { McpWorkspaceBinding } from "../../shared/workspaceContracts";

export interface RepositoryAuthority {
  projectRepository: string;
  mcpWorkspaceBinding?: McpWorkspaceBinding;
}

const blockedReason =
  "BLOCKED_REPOSITORY_AUTHORITY_REQUIRED: current prompt metadata has no repository authority. Regenerate the current canonical handoff from Project Intake before preparing MCP prompts.";
export const mcpWorkspaceBindingRequiredReason =
  "BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED: current project has repository authority but no explicit MCP workspace binding. Bind/select the ChampCity MCP workspace before preparing MCP handoff prompts.";

export function buildRepositoryAuthorityFromProjectIntake(input: {
  projectRepository: string;
  mcpWorkspaceBinding?: McpWorkspaceBinding | null;
}): RepositoryAuthority {
  const projectRepository = normalizedString(input.projectRepository);
  if (!projectRepository) {
    throw new Error("Project Intake repository authority requires projectRepository.");
  }
  const mcpWorkspaceBinding = bindingValue(input.mcpWorkspaceBinding);
  return {
    projectRepository,
    ...(mcpWorkspaceBinding ? { mcpWorkspaceBinding } : {}),
  };
}

export function inheritRepositoryAuthorityFromSources(
  ...sources: Array<Record<string, unknown> | undefined | null>
): RepositoryAuthority | undefined {
  for (const source of sources) {
    const authority = repositoryAuthorityFromWorkflowData(source);
    if (authority) {
      return authority;
    }
  }
  return undefined;
}

export function inheritRepositoryAuthorityFromSourceRevisions(
  workspaceRoot: string,
  sourceRevisions: SourceRevision[],
): RepositoryAuthority | undefined {
  const sources = sourceRevisions
    .map((source) => readWorkflowDataIfPresent(workspaceRoot, source.path))
    .filter((source): source is Record<string, unknown> => Boolean(source));
  return inheritRepositoryAuthorityFromSources(...sources);
}

export function mergeRepositoryAuthorityIntoWorkflowData(
  workflowData: Record<string, unknown>,
  repositoryAuthority: RepositoryAuthority | undefined,
): Record<string, unknown> {
  return repositoryAuthority
    ? { ...workflowData, repositoryAuthority }
    : { ...workflowData };
}

export function requireRepositoryAuthorityForPrompt(
  workflowData: Record<string, unknown> | undefined | null,
): RepositoryAuthority {
  const authority = repositoryAuthorityFromWorkflowData(workflowData);
  if (!authority) {
    throw new Error(blockedReason);
  }
  return authority;
}

export function requireMcpWorkspaceBindingForPrompt(
  workflowData: Record<string, unknown> | undefined | null,
): RepositoryAuthority & { mcpWorkspaceBinding: McpWorkspaceBinding } {
  const authority = requireRepositoryAuthorityForPrompt(workflowData);
  if (!authority.mcpWorkspaceBinding) {
    throw new Error(mcpWorkspaceBindingRequiredReason);
  }
  return authority as RepositoryAuthority & { mcpWorkspaceBinding: McpWorkspaceBinding };
}

export function repositoryAuthorityFromWorkflowData(
  workflowData: Record<string, unknown> | undefined | null,
): RepositoryAuthority | undefined {
  if (!workflowData) {
    return undefined;
  }

  const nested = recordValue(workflowData.repositoryAuthority);
  if (nested) {
    const projectRepository = normalizedString(nested.projectRepository);
    if (projectRepository) {
      const mcpWorkspaceBinding = bindingValue(nested.mcpWorkspaceBinding);
      return {
        projectRepository,
        ...(mcpWorkspaceBinding ? { mcpWorkspaceBinding } : {}),
      };
    }
  }

  const projectRepository = normalizedString(workflowData.projectRepository);
  return projectRepository ? { projectRepository } : undefined;
}

export function workflowDataFromMetadata(
  metadata: CanonicalDocumentMetadata | undefined,
): Record<string, unknown> | undefined {
  return metadata?.workflowData;
}

function readWorkflowDataIfPresent(
  workspaceRoot: string,
  relativePath: string,
): Record<string, unknown> | undefined {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized.trim() || path.isAbsolute(normalized) || normalized.includes("..") || !normalized.endsWith(".md")) {
    return undefined;
  }
  const absolutePath = path.join(path.resolve(workspaceRoot), normalized);
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }
  try {
    return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8")).metadata.workflowData;
  } catch {
    return undefined;
  }
}

function bindingValue(value: unknown): McpWorkspaceBinding | undefined {
  const record = recordValue(value);
  if (!record) {
    return undefined;
  }
  const mcpWorkspaceId = normalizedString(record.mcpWorkspaceId);
  if (!mcpWorkspaceId) {
    return undefined;
  }
  return {
    mcpWorkspaceId,
    ...(normalizedString(record.label) ? { label: normalizedString(record.label) } : {}),
    ...(normalizedString(record.repositoryName) ? { repositoryName: normalizedString(record.repositoryName) } : {}),
    ...(normalizedString(record.branch) ? { branch: normalizedString(record.branch) } : {}),
    gitBacked: record.gitBacked === true,
  };
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function normalizedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
