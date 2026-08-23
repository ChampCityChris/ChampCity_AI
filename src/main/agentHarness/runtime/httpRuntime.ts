import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  exchangeAuthorizationCode,
  issueAuthorizationCode,
  normalizeScope,
  OAUTH_SCOPES,
  refreshOAuthAccessToken,
  registerOAuthClient,
  validateOAuthAuthorizationRequest,
  validateAccessToken,
} from "./oauthStore";
import type { AgentHarnessToolRegistry } from "../tools/toolRegistry";
import { createAgentHarnessMcpServer } from "./mcpServer";
import { assertAgentHarnessLoopbackHost } from "./bindingPolicy";

export interface AgentHarnessHttpRuntimeOptions {
  host: string;
  port: number;
  publicBaseUrl?: string;
  userDataRoot: string;
  registry: AgentHarnessToolRegistry;
  allowUnauthenticatedLocal?: boolean;
}

export interface AgentHarnessHttpRuntimeHandle {
  port: number;
  url: string;
  healthUrl: string;
  close: () => Promise<void>;
}

const MCP_MAX_REQUEST_BYTES = 1_000_000;
const OAUTH_MAX_REQUEST_BYTES = 64_000;

interface McpSession {
  server: ReturnType<typeof createAgentHarnessMcpServer>;
  transport: StreamableHTTPServerTransport;
  requiredScope: string;
}

class RequestBodyTooLargeError extends Error {
  constructor(readonly limitBytes: number) {
    super(`Request body exceeds ${limitBytes} bytes.`);
  }
}

export async function startAgentHarnessHttpRuntime(options: AgentHarnessHttpRuntimeOptions): Promise<AgentHarnessHttpRuntimeHandle> {
  assertAgentHarnessLoopbackHost(options.host);
  if (options.publicBaseUrl && options.allowUnauthenticatedLocal === true) {
    throw new Error("Public Agent Harness connectors require OAuth; unauthenticated local mode is development-only.");
  }
  const sessions = new Map<string, McpSession>();
  let actualPort = options.port;
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? "/", publicBaseUrl(options, actualPort));
      if (requestUrl.pathname === "/health") {
        writeJson(res, 200, {
          status: "ok",
          app: "ChampCity A/I Agent Harness",
          transport: "http",
          host: options.host,
          port: actualPort,
          mcpEndpoint: `${publicBaseUrl(options, actualPort)}/mcp`,
        });
        return;
      }
      if (requestUrl.pathname === "/.well-known/oauth-protected-resource" || requestUrl.pathname === "/.well-known/oauth-protected-resource/mcp") {
        writeJson(res, 200, {
          resource: `${publicBaseUrl(options, actualPort)}/mcp`,
          authorization_servers: [publicBaseUrl(options, actualPort)],
          bearer_methods_supported: ["header"],
          scopes_supported: OAUTH_SCOPES,
          resource_name: "ChampCity A/I Agent Harness",
        });
        return;
      }
      if (requestUrl.pathname === "/.well-known/oauth-authorization-server" || requestUrl.pathname === "/.well-known/oauth-authorization-server/mcp") {
        writeJson(res, 200, {
          issuer: publicBaseUrl(options, actualPort),
          registration_endpoint: `${publicBaseUrl(options, actualPort)}/oauth/register`,
          authorization_endpoint: `${publicBaseUrl(options, actualPort)}/oauth/authorize`,
          token_endpoint: `${publicBaseUrl(options, actualPort)}/oauth/token`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none"],
          scopes_supported: OAUTH_SCOPES,
        });
        return;
      }
      if (requestUrl.pathname === "/oauth/register") {
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method_not_allowed" });
          return;
        }
        let body: Record<string, unknown>;
        try {
          body = recordValue(await readBody(req, OAUTH_MAX_REQUEST_BYTES));
          const client = registerOAuthClient(options.userDataRoot, body);
          writeJson(res, 201, {
            client_id: client.client_id,
            client_id_issued_at: Math.floor(Date.parse(client.created_at) / 1000),
            redirect_uris: client.redirect_uris,
            client_name: client.client_name,
            client_uri: client.client_uri,
            grant_types: client.grant_types,
            response_types: client.response_types,
            scope: client.scope,
            token_endpoint_auth_method: "none",
          });
        } catch (error) {
          writeJson(res, 400, {
            error: "invalid_client_metadata",
            error_description: safeOAuthErrorDescription(error),
          });
        }
        return;
      }
      if (requestUrl.pathname === "/oauth/authorize") {
        if (req.method !== "GET") {
          writeJson(res, 405, { error: "method_not_allowed" });
          return;
        }
        const validation = validateOAuthAuthorizationRequest(options.userDataRoot, {
          client_id: requestUrl.searchParams.get("client_id") ?? "",
          redirect_uri: requestUrl.searchParams.get("redirect_uri") ?? "",
          response_type: requestUrl.searchParams.get("response_type") ?? undefined,
          scope: requestUrl.searchParams.get("scope") ?? "files.read",
          code_challenge: requestUrl.searchParams.get("code_challenge") ?? "",
          code_challenge_method: requestUrl.searchParams.get("code_challenge_method") ?? undefined,
        });
        if (!validation.ok) {
          writeJson(res, 400, {
            error: validation.error,
            error_description: validation.description,
          });
          return;
        }
        const redirectUri = requestUrl.searchParams.get("redirect_uri") ?? "";
        const code = issueAuthorizationCode(options.userDataRoot, {
          client_id: validation.client.client_id,
          redirect_uri: redirectUri,
          scope: validation.scope,
          code_challenge: requestUrl.searchParams.get("code_challenge") ?? "",
        });
        const redirectTarget = new URL(redirectUri);
        redirectTarget.searchParams.set("code", code);
        const state = requestUrl.searchParams.get("state");
        if (state) {
          redirectTarget.searchParams.set("state", state);
        }
        redirect(res, redirectTarget.toString());
        return;
      }
      if (requestUrl.pathname === "/oauth/token") {
        if (req.method !== "POST") {
          writeJson(res, 405, { error: "method_not_allowed" });
          return;
        }
        const body = recordValue(await readBody(req, OAUTH_MAX_REQUEST_BYTES));
        if (body.grant_type === "authorization_code") {
          if (!stringValue(body.code) || !stringValue(body.client_id) || !stringValue(body.redirect_uri) || !stringValue(body.code_verifier)) {
            writeJson(res, 400, { error: "invalid_request" });
            return;
          }
          const token = exchangeAuthorizationCode(options.userDataRoot, {
            code: stringValue(body.code),
            client_id: stringValue(body.client_id),
            redirect_uri: stringValue(body.redirect_uri),
            code_verifier: stringValue(body.code_verifier),
          });
          writeJson(res, token ? 200 : 400, token ?? { error: "invalid_grant" });
          return;
        }
        if (body.grant_type === "refresh_token") {
          if (!stringValue(body.refresh_token) || !stringValue(body.client_id)) {
            writeJson(res, 400, { error: "invalid_request" });
            return;
          }
          const token = refreshOAuthAccessToken(options.userDataRoot, {
            refresh_token: stringValue(body.refresh_token),
            client_id: stringValue(body.client_id),
          });
          writeJson(res, token ? 200 : 400, token ?? { error: "invalid_grant" });
          return;
        }
        writeJson(res, 400, { error: "unsupported_grant_type" });
        return;
      }
      if (requestUrl.pathname === "/mcp") {
        const auth = authenticate(req, options);
        if (!auth) {
          res.writeHead(401, {
            "content-type": "application/json; charset=utf-8",
            "www-authenticate": `Bearer resource_metadata="${publicBaseUrl(options, actualPort)}/.well-known/oauth-protected-resource"`,
          });
          res.end(`${JSON.stringify({ error: "Unauthorized" })}\n`);
          return;
        }
        await handleMcpRequest(req, res, {
          registry: options.registry,
          scope: auth.scope,
          sessions,
        });
        return;
      }
      writeJson(res, 404, { error: "Not found" });
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        writeJson(res, 413, {
          error: "Request body too large",
          limitBytes: error.limitBytes,
        });
        return;
      }
      writeJson(res, 500, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
      });
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  actualPort = address && typeof address === "object" ? address.port : options.port;
  return {
    port: actualPort,
    url: `${publicBaseUrl(options, actualPort)}/mcp`,
    healthUrl: `${publicBaseUrl(options, actualPort)}/health`,
    close: async () => {
      await closeMcpSessions(sessions);
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    },
  };
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse, options: {
  registry: AgentHarnessToolRegistry;
  scope: string;
  sessions: Map<string, McpSession>;
}): Promise<void> {
  const sessionId = headerValue(req.headers["mcp-session-id"]);
  const existingSession = sessionId ? options.sessions.get(sessionId) : undefined;
  if (existingSession) {
    if (!scopeSatisfies(options.scope, existingSession.requiredScope)) {
      writeJson(res, 403, {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "OAUTH_SCOPE_DENIED: OAuth scope is insufficient for this MCP session.",
        },
      });
      return;
    }
    const parsedBody = req.method === "POST" ? await readBody(req, MCP_MAX_REQUEST_BYTES) : undefined;
    await existingSession.transport.handleRequest(req, res, parsedBody);
    return;
  }
  if (req.method === "POST") {
    const parsedBody = await readBody(req, MCP_MAX_REQUEST_BYTES);
    if (!isMcpInitializeBody(parsedBody)) {
      writeJson(res, 400, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      });
      return;
    }
    let mcpSession: McpSession | null = null;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (initializedSessionId) => {
        if (mcpSession) {
          options.sessions.set(initializedSessionId, mcpSession);
        }
      },
    });
    transport.onclose = () => {
      const initializedSessionId = transport.sessionId;
      if (initializedSessionId) {
        options.sessions.delete(initializedSessionId);
      }
    };
    const requiredScope = normalizeScope(options.scope);
    const mcpServer = createAgentHarnessMcpServer(options.registry, requiredScope);
    mcpSession = { server: mcpServer, transport, requiredScope };
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
    return;
  }
  if (sessionId) {
    writeJson(res, 404, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32001, message: "Session not found" },
    });
    return;
  }
  writeJson(res, 405, {
    jsonrpc: "2.0",
    id: null,
    error: { code: -32000, message: "Method not allowed." },
  });
}

async function closeMcpSessions(sessions: Map<string, McpSession>): Promise<void> {
  const openSessions = [...sessions.values()];
  sessions.clear();
  await Promise.all(openSessions.map(async (session) => {
    await session.server.close();
  }));
}

function isMcpInitializeBody(body: unknown): boolean {
  const messages = Array.isArray(body) ? body : [body];
  return messages.some((message) => isInitializeRequest(message));
}

function scopeSatisfies(presentedScope: string, requiredScope: string): boolean {
  const presented = new Set(normalizeScope(presentedScope).split(/\s+/).filter(Boolean));
  return normalizeScope(requiredScope).split(/\s+/).filter(Boolean).every((scope) => presented.has(scope));
}

function authenticate(req: IncomingMessage, options: AgentHarnessHttpRuntimeOptions): { scope: string } | null {
  if (options.allowUnauthenticatedLocal === true) {
    return { scope: "files.read files.write" };
  }
  const auth = req.headers.authorization;
  const match = typeof auth === "string" ? /^Bearer\s+(.+)$/i.exec(auth.trim()) : null;
  if (!match) {
    return null;
  }
  const token = validateAccessToken(options.userDataRoot, match[1]);
  return token ? { scope: normalizeScope(token.scope) } : null;
}

async function readBody(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  const contentLength = headerValue(req.headers["content-length"]);
  if (contentLength && Number.parseInt(contentLength, 10) > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes);
  }
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw new RequestBodyTooLargeError(maxBytes);
    }
    chunks.push(buffer);
  }
  const body = Buffer.concat(chunks).toString("utf8").trim();
  if (!body) {
    return {};
  }
  const contentType = req.headers["content-type"];
  const normalized = Array.isArray(contentType) ? contentType[0] : contentType ?? "";
  if (normalized.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(body).entries());
  }
  return JSON.parse(body) as unknown;
}

function writeJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(`${JSON.stringify(data, null, 2)}\n`);
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(302, {
    location,
    "cache-control": "no-store",
  });
  res.end();
}

function safeOAuthErrorDescription(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .replace(/([A-Za-z]:\\|\/)[^\s"]+/g, "[path]");
}

function publicBaseUrl(options: AgentHarnessHttpRuntimeOptions, port: number): string {
  return options.publicBaseUrl?.replace(/\/+$/g, "") ?? `http://${options.host}:${port}`;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
