import type { ExternalProviderAdapter, ExternalProviderDefinition, ExternalProviderDiscoveredTool } from "./externalProviderRegistry";
import { ExternalProviderError } from "./externalProviderErrors";

export const githubToolsets = ["context", "repos", "issues", "pull_requests", "actions"] as const;
// Exact provider contracts, never name heuristics. Write bindings are evidence only;
// prepareInvocation deliberately implements only the application read operations.
const bindings: Record<string, { tool: string; fields: string[]; method?: string }> = {
  "github.context.read": { tool: "get_me", fields: [] },
  "github.repository.read": { tool: "search_repositories", fields: ["query"] },
  "github.issue.read": { tool: "issue_read", fields: ["owner", "repo", "issue_number", "method"], method: "get" },
  "github.issue.write": { tool: "issue_write", fields: ["owner", "repo", "method"], method: "create" },
  "github.pull_request.read": { tool: "pull_request_read", fields: ["owner", "repo", "pullNumber", "method"], method: "get" },
  "github.pull_request.write": { tool: "create_pull_request", fields: ["owner", "repo", "title", "head", "base"] },
  "github.actions.read": { tool: "actions_list", fields: ["owner", "repo", "method"], method: "list_workflow_runs" },
  "github.actions.write": { tool: "actions_run_trigger", fields: ["owner", "repo", "workflow_id", "ref", "method"], method: "run_workflow" },
  "github.release.read": { tool: "get_release_by_tag", fields: ["owner", "repo", "tag"] },
  "github.release.list": { tool: "list_releases", fields: ["owner", "repo"] },
  "github.tag.read": { tool: "get_tag", fields: ["owner", "repo", "tag"] },
  "github.release.create": { tool: "create_release", fields: ["owner", "repo", "tag_name"] },
  "github.release.update": { tool: "update_release", fields: ["owner", "repo", "release_id"] },
  "github.release.delete": { tool: "delete_release", fields: ["owner", "repo", "release_id"] },
  "github.release.asset.upload": { tool: "upload_release_asset", fields: ["owner", "repo", "release_id", "name"] },
};

export const githubCapabilityIds = Object.keys(bindings);
export const githubMinimumCapabilities = ["github.context.read", "github.repository.read", "github.issue.read", "github.pull_request.read", "github.release.read", "github.release.list", "github.tag.read"];

function supports(tool: ExternalProviderDiscoveredTool, binding: typeof bindings[string]): boolean {
  const schema = tool.inputSchema as { properties?: Record<string, { enum?: unknown[] }> } | null;
  if (!schema?.properties || !binding.fields.every((field) => field in schema.properties!)) return false;
  return !binding.method || Boolean(schema.properties.method?.enum?.includes(binding.method));
}

export const githubProviderAdapter: ExternalProviderAdapter = {
  capabilityIds: githubCapabilityIds,
  mapCapabilities: ({ tools }) => githubCapabilityIds.map((capabilityId) => {
    const binding = bindings[capabilityId];
    const tool = tools.find((entry) => entry.name === binding.tool && supports(entry, binding));
    return { capabilityId, availability: tool ? "available" : "unavailable", ...(tool ? { toolName: tool.name } : {}) };
  }),
  prepareInvocation({ capabilityId, request, capability }) {
    const input = request as { owner?: string; repo?: string; number?: number; tag?: string };
    const toolName = capability.toolName!;
    if (capabilityId === "github.context.read") return { toolName, arguments: {} };
    if (!input || !validCoordinate(input.owner) || !validCoordinate(input.repo)) throw new Error("A bound GitHub repository is required.");
    const repository = { owner: input.owner, repo: input.repo };
    switch (capabilityId) {
      case "github.repository.read": return { toolName, arguments: { query: `repo:${input.owner}/${input.repo}`, perPage: 1, minimal_output: false } };
      case "github.issue.read":
      case "github.pull_request.read":
        if (!Number.isSafeInteger(input.number) || input.number! <= 0) throw new Error("A positive Issue or Pull Request number is required.");
        return { toolName, arguments: { ...repository, method: "get", [capabilityId === "github.issue.read" ? "issue_number" : "pullNumber"]: input.number } };
      case "github.release.read":
      case "github.tag.read":
        if (typeof input.tag !== "string" || !input.tag.trim() || input.tag.length > 200 || /[\x00-\x20]/.test(input.tag)) throw new Error("Invalid GitHub tag.");
        return { toolName, arguments: { ...repository, tag: input.tag } };
      case "github.release.list": return { toolName, arguments: { ...repository, perPage: 20, page: 1 } };
      default: throw new ExternalProviderError("capability-unavailable", "github", "This GitHub capability has no application invocation route.", capabilityId);
    }
  },
  validateResult(capabilityId, result) {
    const data = githubResultData(result);
    if (capabilityId === "github.context.read") return !!data && typeof data === "object" && typeof (data as Record<string, unknown>).login === "string";
    return data !== null && typeof data === "object";
  },
};

function validCoordinate(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$/.test(value) && value !== "." && value !== "..";
}

export function githubResultData(result: unknown): unknown {
  if (!result || typeof result !== "object") return null;
  const value = result as { structuredContent?: unknown; content?: { type?: string; text?: string }[] };
  if (value.structuredContent) return value.structuredContent;
  if (!Array.isArray(value.content)) return null;
  try { return JSON.parse(value.content.filter((entry) => entry.type === "text").map((entry) => entry.text ?? "").join("")); }
  catch { return null; }
}

export function githubProviderDefinition(executable: string, directory: string): ExternalProviderDefinition {
  return {
    providerId: "github", displayName: "GitHub", configured: true,
    transport: { kind: "stdio", command: executable, cwd: directory, args: ["stdio", "--toolsets", githubToolsets.join(","), "--oauth-scopes", "repo,read:org,workflow"] },
    nativeToolFilter: { toolsets: githubToolsets },
    authenticationStrategyReference: "github-provider-oauth",
    lifecycle: "persistent", requestTimeoutMs: 120_000, adapter: githubProviderAdapter,
  };
}
