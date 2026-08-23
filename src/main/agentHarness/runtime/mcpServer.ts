import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { AgentHarnessToolDefinition, AgentHarnessToolRegistry } from "../tools/toolRegistry";

export function createAgentHarnessMcpServer(registry: AgentHarnessToolRegistry, scope: string): McpServer {
  const server = new McpServer({
    name: "champcity-ai-agent-harness",
    title: "ChampCity Agent Harness",
    version: "0.1.0",
  });
  const tools = registry.listTools(scope);
  for (const tool of tools) {
    (server.registerTool as unknown as (
      name: string,
      config: Record<string, unknown>,
      callback: (args: unknown) => Promise<CallToolResult>,
    ) => unknown)(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputZodSchema,
        annotations: toolAnnotations(tool),
      },
      async (args: unknown): Promise<CallToolResult> => {
        const result = registry.callTool({
          name: tool.name,
          arguments: args as Record<string, unknown>,
          scope,
        });
        return {
          isError: !result.ok,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      },
    );
  }
  server.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: toolAnnotations(tool),
    })),
  }));
  return server;
}

function toolAnnotations(tool: AgentHarnessToolDefinition): Record<string, boolean> {
  return {
    readOnlyHint: tool.readOnly,
    destructiveHint: !tool.readOnly,
    openWorldHint: false,
  };
}
