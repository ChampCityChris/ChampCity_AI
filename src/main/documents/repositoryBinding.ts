import fs from "node:fs";
import path from "node:path";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { SourceRevision } from "../../shared/documents/planningDocument";
import type { McpWorkspaceBinding } from "../../shared/workspaceContracts";

export interface RepositoryBinding {
  projectRepository: string;
  mcpWorkspaceBinding?: McpWorkspaceBinding;
}

const blockedReason =
  "BLOCKED_REPOSITORY_BINDING_REQUIRED: current prompt metadata has no repository binding. Regenerate the current canonical handoff from Project Intake before preparing MCP prompts.";
export const mcpWorkspaceBindingRequiredReason =
  "BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED: current project has a repository binding but no explicit MCP workspace binding. Bind/select the ChampCity MCP workspace before preparing MCP handoff prompts.";

// Current V1 records written before WC06 may contain this exact field. Keep the
// alias confined to this parser boundary and remove it from every projected write.
const legacyRepositoryBindingField = "repositoryAuthority";

export function buildRepositoryBindingFromProjectIntake(input: {
  projectRepository: string;
  mcpWorkspaceBinding?: McpWorkspaceBinding | null;
}): RepositoryBinding {
  const projectRepository = normalizedString(input.projectRepository);
  if (!projectRepository) {
    throw new Error("Project Intake repository binding requires projectRepository.");
  }
  const mcpWorkspaceBinding = bindingValue(input.mcpWorkspaceBinding);
  return {
    projectRepository,
    ...(mcpWorkspaceBinding ? { mcpWorkspaceBinding } : {}),
  };
}

export function inheritRepositoryBindingFromSources(
  ...sources: Array<Record<string, unknown> | undefined | null>
): RepositoryBinding | undefined {
  for (const source of sources) {
    const binding = repositoryBindingFromWorkflowData(source);
    if (binding) {
      return binding;
    }
  }
  return undefined;
}

export function inheritRepositoryBindingFromSourceRevisions(
  workspaceRoot: string,
  sourceRevisions: SourceRevision[],
): RepositoryBinding | undefined {
  const sources = sourceRevisions
    .map((source) => readWorkflowDataIfPresent(workspaceRoot, source.path))
    .filter((source): source is Record<string, unknown> => Boolean(source));
  return inheritRepositoryBindingFromSources(...sources);
}

export function mergeRepositoryBindingIntoWorkflowData(
  workflowData: Record<string, unknown>,
  repositoryBinding: RepositoryBinding | undefined,
): Record<string, unknown> {
  const canonicalWorkflowData = withoutLegacyRepositoryBindingField(workflowData);
  return repositoryBinding
    ? { ...canonicalWorkflowData, repositoryBinding }
    : canonicalWorkflowData;
}

export function requireRepositoryBindingForPrompt(
  workflowData: Record<string, unknown> | undefined | null,
): RepositoryBinding {
  const binding = repositoryBindingFromWorkflowData(workflowData);
  if (!binding) {
    throw new Error(blockedReason);
  }
  return binding;
}

export function requireMcpWorkspaceBindingForPrompt(
  workflowData: Record<string, unknown> | undefined | null,
): RepositoryBinding & { mcpWorkspaceBinding: McpWorkspaceBinding } {
  const binding = requireRepositoryBindingForPrompt(workflowData);
  if (!binding.mcpWorkspaceBinding) {
    throw new Error(mcpWorkspaceBindingRequiredReason);
  }
  return binding as RepositoryBinding & { mcpWorkspaceBinding: McpWorkspaceBinding };
}

export function repositoryBindingFromWorkflowData(
  workflowData: Record<string, unknown> | undefined | null,
): RepositoryBinding | undefined {
  if (!workflowData) {
    return undefined;
  }

  const explicitBinding = explicitRepositoryBindingFromWorkflowData(workflowData);
  if (explicitBinding) {
    return explicitBinding;
  }

  const projectRepository = normalizedString(workflowData.projectRepository);
  return projectRepository ? { projectRepository } : undefined;
}

export function explicitRepositoryBindingFromWorkflowData(
  workflowData: Record<string, unknown> | undefined | null,
): RepositoryBinding | undefined {
  if (!workflowData) {
    return undefined;
  }
  return repositoryBindingValue(workflowData.repositoryBinding) ??
    repositoryBindingValue(workflowData[legacyRepositoryBindingField]);
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

function repositoryBindingValue(value: unknown): RepositoryBinding | undefined {
  const nested = recordValue(value);
  const projectRepository = normalizedString(nested?.projectRepository);
  if (!nested || !projectRepository) {
    return undefined;
  }
  const mcpWorkspaceBinding = bindingValue(nested.mcpWorkspaceBinding);
  return {
    projectRepository,
    ...(mcpWorkspaceBinding ? { mcpWorkspaceBinding } : {}),
  };
}

function withoutLegacyRepositoryBindingField(
  workflowData: Record<string, unknown>,
): Record<string, unknown> {
  const canonical = { ...workflowData };
  delete canonical[legacyRepositoryBindingField];
  return canonical;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function normalizedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
