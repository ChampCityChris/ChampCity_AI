import { AgentHarnessError, toBoundedError } from "../core/errors";
import { writeAttachedImage } from "../repository/attachedImages";
import {
  gitDiff,
  gitStatus,
  inspectRepositoryTextFile,
  listRepositoryFiles,
  preCommitSafetyScan,
  readRepositoryFile,
  readRepositoryMarkdownSection,
  readRepositoryTextChunk,
  readRepositoryTextLines,
  searchRepositoryFiles,
  writeTextArtifact,
} from "../repository/repositoryOperations";
import {
  applyApprovedPatch,
  registerPatchProposal,
} from "../repository/patches";
import {
  type AgentHarnessAuthorityProvider,
  type AgentHarnessWorkspaceContext,
  assertActionAuthority,
  assertWorkspaceIdMatches,
  type HarnessActionKind,
} from "../workspace/workspaceAuthority";
import * as z from "zod/v4";

export type PublicToolName =
  | "repo_toolbox"
  | "git_toolbox"
  | "artifact_toolbox"
  | "diagnostics_toolbox"
  | "integration_toolbox"
  | "browser_toolbox"
  | "knowledge_toolbox"
  | "workspace_write_attached_image";

type RequiredScope = "files.read" | "files.write";
type ParamType = "string" | "number" | "boolean";

interface ParamSpec {
  type: ParamType;
  required?: boolean;
}

interface ToolActionContract {
  name: string;
  kind: HarnessActionKind;
  requiredScope: RequiredScope;
  params: Record<string, ParamSpec>;
  dispatch: (input: DispatchInput) => unknown;
}

interface ToolProvider {
  name: PublicToolName;
  title: string;
  description: string;
  actions: ToolActionContract[];
}

interface DispatchInput {
  context: AgentHarnessWorkspaceContext;
  params: Record<string, unknown>;
  userDataRoot: string;
  runtimeDiagnostics?: () => Record<string, unknown>;
}

export interface AgentHarnessToolDefinition {
  name: PublicToolName;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  inputZodSchema: z.ZodType<Record<string, unknown>>;
  readOnly: boolean;
  actions: string[];
}

export interface AgentHarnessToolCall {
  name: string;
  arguments: Record<string, unknown>;
  scope?: string;
}

export interface AgentHarnessToolResult {
  ok: boolean;
  toolName: string;
  action: string;
  workspaceId?: string;
  payload?: unknown;
  error?: ReturnType<typeof toBoundedError>;
  attemptId: string;
  timestamp: string;
}

export interface AgentHarnessToolRegistry {
  listTools: (scope?: string) => AgentHarnessToolDefinition[];
  callTool: (call: AgentHarnessToolCall) => AgentHarnessToolResult;
}

interface RegistryOptions {
  authority: AgentHarnessAuthorityProvider;
  userDataRoot: string;
  runtimeDiagnostics?: () => Record<string, unknown>;
}

export function createAgentHarnessToolRegistry(options: RegistryOptions): AgentHarnessToolRegistry {
  const providers = createToolProviders();
  const providerByName = new Map(providers.map((provider) => [provider.name, provider]));
  return {
    listTools: (scope = "files.read files.write") => providers
      .map((provider) => buildToolDefinition(provider, scope))
      .filter((definition): definition is AgentHarnessToolDefinition => Boolean(definition)),
    callTool: (call) => {
      const attemptId = `ahr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString();
      let action = "unknown";
      try {
        const args = recordArgumentValue(call.arguments);
        rejectUnknownKeys(args, ["workspaceId", "action", "params"], "tool arguments");
        const provider = providerByName.get(call.name as PublicToolName);
        if (!provider) {
          throw new AgentHarnessError("INVALID_INPUT", "Unknown Agent Harness tool.");
        }
        action = requiredString(args.action, "action");
        const contract = provider.actions.find((entry) => entry.name === action);
        if (!contract) {
          throw new AgentHarnessError("INVALID_INPUT", "Unsupported or missing toolbox action.", {
            toolName: call.name,
            action,
          });
        }
        if (!scopeIncludes(call.scope, contract.requiredScope)) {
          throw new AgentHarnessError("OAUTH_SCOPE_DENIED", `${contract.requiredScope} scope is required for this action.`, {
            requiredScope: contract.requiredScope,
            toolName: provider.name,
            action,
          });
        }
        const context = options.authority.resolveWorkspaceContext();
        assertWorkspaceIdMatches(context, args.workspaceId);
        const params = validateParams(args.params, contract);
        assertActionAuthority(context, contract.kind);
        const payload = contract.dispatch({
          context,
          params,
          userDataRoot: options.userDataRoot,
          runtimeDiagnostics: options.runtimeDiagnostics,
        });
        return { ok: true, toolName: provider.name, action, workspaceId: context.workspaceId, payload, attemptId, timestamp };
      } catch (error) {
        return {
          ok: false,
          toolName: call.name,
          action,
          error: toBoundedError(error),
          attemptId,
          timestamp,
        };
      }
    },
  };
}

function createToolProviders(): ToolProvider[] {
  return [
    {
      name: "repo_toolbox",
      title: "repo_toolbox",
      description: "ChampCity A/I Agent Harness repo_toolbox.",
      actions: [
        readAction("status", {}, ({ context }) => ({ workspace: context, repository: gitStatus(context.root) })),
        readAction("list_files", optionalParams({ directory: "string", maxFiles: "number" }), ({ context, params }) => (
          listRepositoryFiles(context.root, { directory: stringValue(params.directory), maxFiles: numberValue(params.maxFiles) })
        )),
        readAction("read_file", requiredParams({ relativePath: "string" }), ({ context, params }) => (
          readRepositoryFile(context.root, context.workspaceId, requiredString(params.relativePath, "relativePath"))
        )),
        readAction("inspect_text_file", requiredParams({ relativePath: "string" }), ({ context, params }) => (
          inspectRepositoryTextFile(context.root, context.workspaceId, requiredString(params.relativePath, "relativePath"))
        )),
        readAction(
          "read_text_chunk",
          {
            ...optionalParams({
              relativePath: "string",
              cursor: "string",
              maximumBytes: "number",
              maximumLines: "number",
              expectedSourceSha256: "string",
            }),
          },
          ({ context, params }) => readRepositoryTextChunk(context.root, context.workspaceId, params),
        ),
        readAction(
          "read_text_lines",
          {
            ...requiredParams({ relativePath: "string", startLine: "number", maximumLines: "number" }),
            ...optionalParams({ maximumBytes: "number" }),
          },
          ({ context, params }) => readRepositoryTextLines(context.root, context.workspaceId, params),
        ),
        readAction(
          "read_markdown_section",
          {
            ...requiredParams({ relativePath: "string", sectionId: "string" }),
            ...optionalParams({ maximumBytes: "number", maximumLines: "number" }),
          },
          ({ context, params }) => readRepositoryMarkdownSection(context.root, context.workspaceId, params),
        ),
        readAction(
          "search_files",
          { ...requiredParams({ query: "string" }), ...optionalParams({ directory: "string", maxResults: "number" }) },
          ({ context, params }) => searchRepositoryFiles(context.root, requiredString(params.query, "query"), {
            directory: stringValue(params.directory),
            maxResults: numberValue(params.maxResults),
          }),
        ),
        writeAction("write_markdown_artifact", "artifact-write", {
          ...requiredParams({ relativePath: "string", content: "string" }),
          ...optionalParams({ overwrite: "boolean" }),
        }, ({ context, params }) => writeTextArtifact(
          context.root,
          requiredString(params.relativePath, "relativePath"),
          requiredString(params.content, "content"),
          { overwrite: booleanValue(params.overwrite), expectedExtension: ".md" },
        )),
        writeAction("write_json_artifact", "artifact-write", {
          ...requiredParams({ relativePath: "string", content: "string" }),
          ...optionalParams({ overwrite: "boolean" }),
        }, ({ context, params }) => writeTextArtifact(
          context.root,
          requiredString(params.relativePath, "relativePath"),
          requiredString(params.content, "content"),
          { overwrite: booleanValue(params.overwrite), expectedExtension: ".json" },
        )),
        writeAction("propose_patch", "patch-write", requiredParams({ patch: "string" }), ({ context, params, userDataRoot }) => (
          registerPatchProposal(userDataRoot, context.root, requiredString(params.patch, "patch"))
        )),
        writeAction("apply_approved_patch", "patch-write", requiredParams({
          patch: "string",
          proposalId: "string",
          patchHash: "string",
        }), ({ context, params, userDataRoot }) => applyApprovedPatch(
          userDataRoot,
          context.root,
          requiredString(params.patch, "patch"),
          requiredString(params.proposalId, "proposalId"),
          requiredString(params.patchHash, "patchHash"),
        )),
      ],
    },
    {
      name: "git_toolbox",
      title: "git_toolbox",
      description: "ChampCity A/I Agent Harness git_toolbox.",
      actions: [
        gitInspectionAction("status", {}, ({ context }) => gitStatus(context.root)),
        gitInspectionAction("diff", {}, ({ context }) => gitDiff(context.root)),
        gitInspectionAction("pre_commit_scan", {}, ({ context }) => preCommitSafetyScan(context.root)),
        gitInspectionAction("readiness_summary", {}, ({ context }) => preCommitSafetyScan(context.root)),
        gitInspectionAction("inspect_history", {}, ({ context }) => ({
          gitBacked: context.gitBacked,
          message: "History inspection is deferred to a later bounded provider.",
        })),
        gitMutationAction("prepare_branch"),
        gitMutationAction("stage_changes"),
        gitMutationAction("commit"),
        gitMutationAction("push"),
        gitMutationAction("integrate_to_dev"),
      ],
    },
    {
      name: "artifact_toolbox",
      title: "artifact_toolbox",
      description: "ChampCity A/I Agent Harness artifact_toolbox.",
      actions: [
        readAction("status", {}, () => ({
          canonicalAuthority: "ChampCity A/I planning document services",
          genericPersistenceOnly: true,
        })),
        writeAction("write_markdown_artifact", "artifact-write", {
          ...requiredParams({ relativePath: "string", content: "string" }),
          ...optionalParams({ overwrite: "boolean" }),
        }, ({ context, params }) => writeTextArtifact(
          context.root,
          requiredString(params.relativePath, "relativePath"),
          requiredString(params.content, "content"),
          { overwrite: booleanValue(params.overwrite), expectedExtension: ".md" },
        )),
        writeAction("write_json_artifact", "artifact-write", {
          ...requiredParams({ relativePath: "string", content: "string" }),
          ...optionalParams({ overwrite: "boolean" }),
        }, ({ context, params }) => writeTextArtifact(
          context.root,
          requiredString(params.relativePath, "relativePath"),
          requiredString(params.content, "content"),
          { overwrite: booleanValue(params.overwrite), expectedExtension: ".json" },
        )),
      ],
    },
    {
      name: "diagnostics_toolbox",
      title: "diagnostics_toolbox",
      description: "ChampCity A/I Agent Harness diagnostics_toolbox.",
      actions: [
        readAction("status", {}, ({ context, runtimeDiagnostics }) => ({
          workspace: context,
          runtime: runtimeDiagnostics?.() ?? {},
        })),
        readAction("list_workspaces", {}, ({ context }) => ({ workspaces: [context] })),
        readAction("tool_inventory", {}, () => ({
          tools: createToolProviders().map((provider) => ({
            name: provider.name,
            actions: provider.actions.map((action) => action.name),
          })),
        })),
      ],
    },
    statusOnlyProvider("integration_toolbox"),
    statusOnlyProvider("browser_toolbox"),
    statusOnlyProvider("knowledge_toolbox"),
    {
      name: "workspace_write_attached_image",
      title: "workspace_write_attached_image",
      description: "ChampCity A/I Agent Harness workspace_write_attached_image.",
      actions: [
        writeAction("write_attached_image", "artifact-write", requiredParams({
          relativePath: "string",
          base64: "string",
          mimeType: "string",
        }), ({ context, params }) => writeAttachedImage(context.root, {
          relativePath: requiredString(params.relativePath, "relativePath"),
          base64: requiredString(params.base64, "base64"),
          mimeType: requiredString(params.mimeType, "mimeType"),
        })),
      ],
    },
  ];
}

function buildToolDefinition(provider: ToolProvider, scope: string): AgentHarnessToolDefinition | null {
  const actions = provider.actions.filter((action) => scopeIncludes(scope, action.requiredScope));
  if (actions.length === 0) {
    return null;
  }
  return {
    name: provider.name,
    title: provider.title,
    description: provider.description,
    inputSchema: buildInputSchema(actions),
    inputZodSchema: buildInputZodSchema(actions),
    readOnly: actions.every((action) => action.requiredScope === "files.read"),
    actions: actions.map((action) => action.name),
  };
}

function buildInputSchema(actions: ToolActionContract[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "action"],
    properties: {
      workspaceId: { type: "string" },
      action: { type: "string", enum: actions.map((action) => action.name) },
      params: { type: "object" },
    },
    oneOf: actions.map((action) => buildActionInputSchema(action)),
  };
}

function buildActionInputSchema(action: ToolActionContract): Record<string, unknown> {
  const required = ["workspaceId", "action"];
  if (requiredParamNames(action.params).length > 0) {
    required.push("params");
  }
  return {
    title: action.name,
    type: "object",
    additionalProperties: false,
    required,
    properties: {
      workspaceId: { type: "string" },
      action: { type: "string", const: action.name },
      params: buildParamsInputSchema(action.params),
    },
  };
}

function buildParamsInputSchema(params: Record<string, ParamSpec>): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: requiredParamNames(params),
    properties: Object.fromEntries(Object.entries(params).map(([name, spec]) => [name, { type: spec.type }])),
  };
}

function buildInputZodSchema(actions: ToolActionContract[]): z.ZodType<Record<string, unknown>> {
  const actionSchemas = actions.map((action) => z.object({
    workspaceId: z.string(),
    action: z.literal(action.name),
    params: buildParamsZodSchema(action.params),
  }).strict());
  if (actionSchemas.length === 1) {
    return actionSchemas[0] as z.ZodType<Record<string, unknown>>;
  }
  return z.union(actionSchemas as unknown as [
    z.ZodObject<Record<string, z.ZodType<unknown>>>,
    z.ZodObject<Record<string, z.ZodType<unknown>>>,
    ...z.ZodObject<Record<string, z.ZodType<unknown>>>[],
  ]) as z.ZodType<Record<string, unknown>>;
}

function buildParamsZodSchema(params: Record<string, ParamSpec>): z.ZodType<Record<string, unknown> | undefined> {
  const shape = Object.fromEntries(Object.entries(params).map(([name, spec]) => {
    const schema = zodParamSchema(spec.type);
    return [name, spec.required ? schema : schema.optional()];
  })) as Record<string, z.ZodType<unknown>>;
  const paramsSchema = z.object(shape).strict();
  if (requiredParamNames(params).length > 0) {
    return paramsSchema as z.ZodType<Record<string, unknown>>;
  }
  return paramsSchema.optional() as z.ZodType<Record<string, unknown> | undefined>;
}

function zodParamSchema(type: ParamType): z.ZodType<unknown> {
  if (type === "number") {
    return z.number().refine((value) => Number.isFinite(value), "number must be finite");
  }
  if (type === "boolean") {
    return z.boolean();
  }
  return z.string();
}

function readAction(name: string, params: Record<string, ParamSpec>, dispatch: ToolActionContract["dispatch"]): ToolActionContract {
  return { name, kind: "read", requiredScope: "files.read", params, dispatch };
}

function gitInspectionAction(name: string, params: Record<string, ParamSpec>, dispatch: ToolActionContract["dispatch"]): ToolActionContract {
  return { name, kind: "git-inspection", requiredScope: "files.read", params, dispatch };
}

function writeAction(
  name: string,
  kind: Extract<HarnessActionKind, "artifact-write" | "patch-write">,
  params: Record<string, ParamSpec>,
  dispatch: ToolActionContract["dispatch"],
): ToolActionContract {
  return { name, kind, requiredScope: "files.write", params, dispatch };
}

function gitMutationAction(name: string): ToolActionContract {
  return {
    name,
    kind: "git-mutation",
    requiredScope: "files.write",
    params: {},
    dispatch: () => {
      throw new AgentHarnessError("GIT_MUTATION_DENIED", "Git mutation is not authorized by the active A/I workflow.");
    },
  };
}

function statusOnlyProvider(name: PublicToolName): ToolProvider {
  return {
    name,
    title: name,
    description: `ChampCity A/I Agent Harness ${name}.`,
    actions: [
      readAction("status", {}, () => ({
        available: false,
        reason: `${name}.status is a compatibility foundation surface only in WC60.`,
      })),
    ],
  };
}

function requiredParams(params: Record<string, ParamType>): Record<string, ParamSpec> {
  return Object.fromEntries(Object.entries(params).map(([name, type]) => [name, { type, required: true }]));
}

function optionalParams(params: Record<string, ParamType>): Record<string, ParamSpec> {
  return Object.fromEntries(Object.entries(params).map(([name, type]) => [name, { type }]));
}

function validateParams(value: unknown, contract: ToolActionContract): Record<string, unknown> {
  const params = value === undefined ? {} : recordArgumentValue(value, "params");
  rejectUnknownKeys(params, Object.keys(contract.params), `${contract.name} params`);
  for (const [name, spec] of Object.entries(contract.params)) {
    const paramValue = params[name];
    if (paramValue === undefined) {
      if (spec.required) {
        throw new AgentHarnessError("INVALID_INPUT", `${name} is required.`);
      }
      continue;
    }
    if (!paramMatchesType(paramValue, spec.type)) {
      throw new AgentHarnessError("INVALID_INPUT", `${name} must be a ${spec.type}.`);
    }
    if (spec.type === "string" && typeof paramValue === "string" && !paramValue.trim()) {
      throw new AgentHarnessError("INVALID_INPUT", `${name} is required.`);
    }
  }
  return params;
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    throw new AgentHarnessError("INVALID_INPUT", `Unknown ${label}: ${unknown.join(", ")}.`);
  }
}

function requiredParamNames(params: Record<string, ParamSpec>): string[] {
  return Object.entries(params)
    .filter(([, spec]) => spec.required)
    .map(([name]) => name);
}

function paramMatchesType(value: unknown, type: ParamType): boolean {
  if (type === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }
  return typeof value === type;
}

function scopeIncludes(scope: string | undefined, required: string): boolean {
  return (scope ?? "files.read files.write").split(/\s+/).includes(required);
}

function recordArgumentValue(value: unknown, label = "tool arguments"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentHarnessError("INVALID_INPUT", `${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AgentHarnessError("INVALID_INPUT", `${name} is required.`);
  }
  return value;
}
