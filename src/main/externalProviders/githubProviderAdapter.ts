import type { ExternalProviderAdapter, ExternalProviderDefinition, ExternalProviderDiscoveredTool } from "./externalProviderRegistry";
import { ExternalProviderError } from "./externalProviderErrors";

export const githubToolsets = ["context", "repos", "issues", "pull_requests", "actions"] as const;
// Exact pinned provider contracts, never name heuristics or arbitrary native-tool passthrough.
const bindings: Record<string, { tool: string; fields: string[]; method?: string; fixed?: Record<string, string> }> = {
  "github.context.read": { tool: "get_me", fields: [] },
  "github.repository.read": { tool: "search_repositories", fields: ["query"] },
  "github.issue.read": { tool: "issue_read", fields: ["owner", "repo", "issue_number", "method"], method: "get" },
  "github.issue.write": { tool: "issue_write", fields: ["owner", "repo", "method"], method: "create" },
  "github.pull_request.read": { tool: "pull_request_read", fields: ["owner", "repo", "pullNumber", "method"], method: "get" },
  "github.pull_request.write": { tool: "create_pull_request", fields: ["owner", "repo", "title", "head", "base", "body"] },
  "github.actions.read": { tool: "actions_list", fields: ["owner", "repo", "method"], method: "list_workflow_runs" },
  "github.actions.write": { tool: "actions_run_trigger", fields: ["owner", "repo", "workflow_id", "ref", "method"], method: "run_workflow" },
  "github.release.read": { tool: "get_release_by_tag", fields: ["owner", "repo", "tag"] },
  "github.release.list": { tool: "list_releases", fields: ["owner", "repo"] },
  "github.tag.read": { tool: "get_tag", fields: ["owner", "repo", "tag"] },
  "github.release.create": { tool: "create_release", fields: ["owner", "repo", "tag_name", "name", "body", "draft", "prerelease"] },
  "github.release.update": { tool: "update_release", fields: ["owner", "repo", "release_id", "tag_name", "name", "body", "draft", "prerelease"] },
  "github.release.delete": { tool: "delete_release", fields: ["owner", "repo", "release_id"] },
  "github.release.asset.upload": { tool: "upload_release_asset", fields: ["owner", "repo", "release_id", "name"] },
  "github.repository.create": { tool: "create_repository", fields: ["name", "description", "organization", "private", "autoInit"] },
  "github.repository.list": { tool: "search_repositories", fields: ["query", "page", "perPage", "minimal_output"] },
  "github.branch.list": { tool: "list_branches", fields: ["owner", "repo", "page", "perPage"] },
  "github.branch.create": { tool: "create_branch", fields: ["owner", "repo", "branch", "from_branch"] },
  "github.commit.read": { tool: "get_commit", fields: ["owner", "repo", "sha", "detail"], fixed: { detail: "none" } },
  "github.tag.list": { tool: "list_tags", fields: ["owner", "repo", "page", "perPage"] },
  "github.file.read": { tool: "get_file_contents", fields: ["owner", "repo", "path", "ref"] },
  "github.file.write": { tool: "create_or_update_file", fields: ["owner", "repo", "path", "content", "message", "branch", "sha"] },
  "github.file.delete": { tool: "delete_file", fields: ["owner", "repo", "path", "message", "branch"] },
  "github.pull_request.list": { tool: "list_pull_requests", fields: ["owner", "repo", "state", "page", "perPage"] },
  "github.pull_request.update": { tool: "update_pull_request", fields: ["owner", "repo", "pullNumber", "title", "body", "state", "base"] },
  "github.pull_request.merge": { tool: "merge_pull_request", fields: ["owner", "repo", "pullNumber", "merge_method", "expectedHeadSha"] },
  "github.review.list": { tool: "pull_request_read", fields: ["owner", "repo", "pullNumber", "method", "page", "perPage"], method: "get_reviews" },
  "github.review.create": { tool: "pull_request_review_write", fields: ["owner", "repo", "pullNumber", "method", "event", "body", "commitID"], method: "create" },
};

export const githubCapabilityIds = Object.keys(bindings);
export const githubMinimumCapabilities = ["github.context.read", "github.repository.read", "github.issue.read", "github.pull_request.read", "github.release.read", "github.release.list", "github.tag.read"];

function supports(tool: ExternalProviderDiscoveredTool, binding: typeof bindings[string]): boolean {
  const schema = tool.inputSchema as { properties?: Record<string, { enum?: unknown[] }> } | null;
  if (!schema?.properties || !binding.fields.every((field) => field in schema.properties!)) return false;
  if (Object.entries(binding.fixed ?? {}).some(([field, value]) => !schema.properties?.[field]?.enum?.includes(value))) return false;
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
    if (capabilityId === "github.repository.create") {
      const value = request as Record<string, unknown>;
      if (!validCoordinate(value.name) || value.organization !== undefined && !validCoordinate(value.organization) || value.autoInit !== false || typeof value.private !== "boolean") throw new Error("Select an explicit empty GitHub repository identity.");
      return { toolName, arguments: boundedArguments(value, bindings[capabilityId]) };
    }
    if (capabilityId === "github.repository.list") {
      const value = request as Record<string, unknown>;
      if (!validCoordinate(value.owner)) throw new Error("Select an explicit GitHub namespace.");
      return { toolName, arguments: { query: `user:${value.owner}`, page: value.page, perPage: value.perPage, minimal_output: false } };
    }
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
      default: {
        const binding = bindings[capabilityId];
        if (!binding) throw new ExternalProviderError("capability-unavailable", "github", "This GitHub capability has no application invocation route.", capabilityId);
        return { toolName, arguments: boundedArguments(request as Record<string, unknown>, binding) };
      }
    }
  },
  validateResult(capabilityId, result) {
    const data = githubResultData(result);
    if (capabilityId === "github.context.read") return !!data && typeof data === "object" && typeof (data as Record<string, unknown>).login === "string";
    return data !== null && typeof data === "object";
  },
};

function boundedArguments(input: Record<string, unknown>, binding: typeof bindings[string]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of binding.fields) {
    const value = field === "method" && binding.method ? binding.method : binding.fixed?.[field] ?? input[field];
    if (value === undefined) continue;
    if (typeof value === "string" ? value.includes("\0") || Buffer.byteLength(value) > (field === "content" ? 131072 : field === "body" ? 65536 : 4096) : typeof value === "number" ? !Number.isSafeInteger(value) || value < 1 : typeof value !== "boolean") throw new Error("GitHub arguments exceed their typed bounds.");
    result[field] = value;
  }
  return result;
}

function validCoordinate(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$/.test(value) && value !== "." && value !== "..";
}

export function githubResultData(result: unknown): unknown {
  if (!result || typeof result !== "object") return null;
  const value = result as { structuredContent?: unknown; content?: { type?: string; text?: string }[] };
  if (value.structuredContent) return value.structuredContent;
  if (!Array.isArray(value.content)) return null;
  if (value.content.length === 1 && value.content[0].type === "text" && value.content[0].text === "pull request review submitted successfully") return { acknowledged: true };
  const resource = value.content.find(entry => entry.type === "resource") as unknown as { resource?: { uri?: string; text?: string } } | undefined;
  if (resource?.resource && typeof resource.resource.text === "string") {
    const message = value.content.filter(entry => entry.type === "text").map(entry => entry.text ?? "").join(" ");
    const sha = /\(SHA: ([a-f0-9]{40})\)/.exec(message)?.[1];
    if (!sha || /fallback|does not exist|symlink|dereferenced/i.test(message)) return null;
    return { sha, content: resource.resource.text, uri: resource.resource.uri };
  }
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
    // A bounded 128 KiB UTF-8 resource can expand sixfold when JSON-escaped.
    resultCaptureLimits: { "github.file.read": 1_000_000 },
  };
}
