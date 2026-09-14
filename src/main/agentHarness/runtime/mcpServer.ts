import { createHash } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  AgentHarnessToolContractSnapshot,
  AgentHarnessToolContractToolSummary,
} from "../../../shared/workspaceContracts";
import type { IssueScreenshotEvidenceReadResult } from "../repository/issueScreenshotEvidence";
import type {
  AgentHarnessToolDefinition,
  AgentHarnessToolRegistry,
  AgentHarnessToolResult,
} from "../tools/toolRegistry";
import type { AgentHarnessOperationalDiagnosticsCollector } from "./operationalDiagnostics";

export interface CapturedAgentHarnessToolContract extends AgentHarnessToolContractSnapshot {
  definitions: AgentHarnessToolDefinition[];
  publicDefinitions: Array<Record<string, unknown>>;
}

export interface AgentHarnessMcpServer {
  connect: McpServer["connect"];
  close: McpServer["close"];
  publishedContract: () => AgentHarnessToolContractSnapshot;
}

export function captureAgentHarnessPublicToolContract(
  registry: AgentHarnessToolRegistry,
  scope: string,
): AgentHarnessToolContractSnapshot {
  return snapshotContract(captureContract(registry, scope));
}

export function captureAgentHarnessRuntimeToolContract(
  registry: AgentHarnessToolRegistry,
  scope: string,
): CapturedAgentHarnessToolContract {
  return captureContract(registry, scope);
}

export function snapshotAgentHarnessRuntimeToolContract(
  contract: CapturedAgentHarnessToolContract,
): AgentHarnessToolContractSnapshot {
  return snapshotContract(contract);
}

export function normalizeAgentHarnessPublicToolScope(scope: string): string {
  return normalizePublicScope(scope);
}

export function fingerprintAgentHarnessPublicToolDefinitions(
  scope: string,
  tools: Array<Record<string, unknown>>,
): string {
  const fingerprintSource = tools
    .map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    }))
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
  return createHash("sha256")
    .update(stableJson({ scope: normalizePublicScope(scope), tools: fingerprintSource }))
    .digest("hex");
}

export function createAgentHarnessMcpServer(
  registry: AgentHarnessToolRegistry,
  publishedContract: CapturedAgentHarnessToolContract,
  operationalDiagnostics?: AgentHarnessOperationalDiagnosticsCollector,
): AgentHarnessMcpServer {
  const server = new McpServer({
    name: "champcity-ai-agent-harness",
    title: "ChampCity Agent Harness",
    version: "0.1.0",
  });
  registerContractTools(publishedContract);
  server.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: publishedContract.publicDefinitions,
  }));

  function registerContractTools(contract: CapturedAgentHarnessToolContract): void {
    for (const tool of contract.definitions) {
      (server.registerTool as unknown as (
        name: string,
        config: Record<string, unknown>,
        callback: (args: unknown, extra?: { signal?: AbortSignal }) => Promise<CallToolResult>,
      ) => unknown)(
        tool.name,
        {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputZodSchema,
          annotations: toolAnnotations(tool),
        },
        async (args: unknown, extra?: { signal?: AbortSignal }): Promise<CallToolResult> => {
          const record = args && typeof args === "object" && !Array.isArray(args)
            ? args as Record<string, unknown>
            : {};
          const observation = operationalDiagnostics?.beginOperation({
            toolbox: tool.name,
            action: record.action,
            workspaceId: record.workspaceId,
          });
          try {
            const result = await registry.callTool({
              name: tool.name,
              arguments: record,
              scope: contract.scope,
            });
            observation?.finish(result, extra?.signal?.aborted === true);
            return projectCallToolResult(result);
          } catch (error) {
            observation?.finish({
              ok: false,
              toolName: tool.name,
              action: typeof record.action === "string" ? record.action : "unknown",
              error: { code: "RUNTIME_ERROR", message: "Tool execution failed." },
              attemptId: observation.attemptId,
              timestamp: new Date().toISOString(),
            }, extra?.signal?.aborted === true);
            throw error;
          }
        },
      );
    }
  }

  return {
    connect: (transport) => server.connect(transport),
    close: () => server.close(),
    publishedContract: () => snapshotContract(publishedContract),
  };
}

function projectCallToolResult(result: AgentHarnessToolResult): CallToolResult {
  if (result.ok && result.toolName === "repo_toolbox" && result.action === "read_issue_screenshot") {
    const payload = result.payload as IssueScreenshotEvidenceReadResult;
    const { imageBase64, ...metadata } = payload;
    const structuredResult = { ...result, payload: metadata };
    return {
      isError: false,
      content: [
        { type: "text", text: JSON.stringify(structuredResult, null, 2) },
        { type: "image", data: imageBase64, mimeType: metadata.mimeType },
      ],
      structuredContent: structuredResult as unknown as Record<string, unknown>,
    };
  }
  return {
    isError: !result.ok,
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}

function captureContract(registry: AgentHarnessToolRegistry, scope: string): CapturedAgentHarnessToolContract {
  const normalizedScope = normalizePublicScope(scope);
  const definitions = registry.listTools(normalizedScope)
    .map((tool) => ({
      ...tool,
      actions: [...tool.actions],
      inputSchema: cloneJsonRecord(tool.inputSchema),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const tools = definitions.map(toolSummary);
  const publicDefinitions = definitions.map(publicToolDefinition);
  return {
    scope: normalizedScope,
    fingerprint: fingerprintAgentHarnessPublicToolDefinitions(normalizedScope, publicDefinitions),
    toolCount: definitions.length,
    tools,
    definitions,
    publicDefinitions,
  };
}

function snapshotContract(contract: CapturedAgentHarnessToolContract): AgentHarnessToolContractSnapshot {
  return {
    scope: contract.scope,
    fingerprint: contract.fingerprint,
    toolCount: contract.toolCount,
    tools: contract.tools.map((tool) => ({ name: tool.name, actions: [...tool.actions] })),
  };
}

function toolSummary(tool: AgentHarnessToolDefinition): AgentHarnessToolContractToolSummary {
  return { name: tool.name, actions: [...tool.actions] };
}

function publicToolDefinition(tool: AgentHarnessToolDefinition): Record<string, unknown> {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: toolAnnotations(tool),
  };
}

function toolAnnotations(tool: AgentHarnessToolDefinition): Record<string, boolean> {
  return {
    readOnlyHint: tool.readOnly,
    destructiveHint: !tool.readOnly,
    openWorldHint: false,
  };
}

function normalizePublicScope(scope: string): string {
  return [...new Set(scope.split(/\s+/).filter(Boolean))].sort().join(" ");
}

function cloneJsonRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortJsonValue(entry)]),
    );
  }
  return value;
}
