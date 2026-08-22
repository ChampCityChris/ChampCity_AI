const fs = require("node:fs");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

const logPath = process.argv[2] || process.env.CHAMPCITY_FAKE_WINGET_MCP_LOG;

if (!logPath) {
  process.exit(0);
}

function log(event, data = {}) {
  fs.appendFileSync(logPath, `${JSON.stringify({ event, ...data })}\n`, "utf8");
}

const server = new Server(
  { name: "fake-winget-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.oninitialized = () => log("initialized");

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log("tools/list");
  return {
    tools: [{
      name: "find",
      description: "Find Windows Package Manager packages.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    }],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  log("tools/call", {
    name: request.params.name,
    query: request.params.arguments?.query,
  });
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        packages: [{
          id: "Kitware.CMake",
          name: "CMake",
          version: "3.31.0",
          source: "winget",
        }],
      }),
    }],
  };
});

process.on("exit", () => log("close"));
process.stdin.on("end", () => process.exit(0));

server.connect(new StdioServerTransport()).catch((error) => {
  log("error", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
