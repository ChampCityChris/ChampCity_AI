import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  ExternalProviderDefinition,
  ExternalProviderDiscovery,
  ExternalProviderDiscoveredTool,
} from "./externalProviderRegistry";

const maximumDiscoveryPages = 20;
const maximumDiscoveredEntries = 5_000;
const maximumStderrCharacters = 4_000;

export interface ExternalProviderResolvedAuthentication {
  headers?: Readonly<Record<string, string>>;
  environment?: Readonly<Record<string, string>>;
  oauthProvider?: OAuthClientProvider;
}

export interface ExternalProviderAuthenticationStrategy {
  readonly reference: string;
  resolve(
    providerId: string,
    transportKind: "stdio" | "streamable-http",
  ): Promise<ExternalProviderResolvedAuthentication>;
}

export class ExternalProviderAuthenticationRegistry {
  private readonly strategies = new Map<string, ExternalProviderAuthenticationStrategy>();

  register(strategy: ExternalProviderAuthenticationStrategy): void {
    if (!strategy.reference.trim() || this.strategies.has(strategy.reference)) {
      throw new Error("External provider authentication strategy references must be unique and non-empty.");
    }
    this.strategies.set(strategy.reference, strategy);
  }

  async resolve(
    reference: string | undefined,
    providerId: string,
    transportKind: "stdio" | "streamable-http",
  ): Promise<ExternalProviderResolvedAuthentication> {
    if (!reference) {
      return {};
    }
    const strategy = this.strategies.get(reference);
    if (!strategy) {
      throw new Error("Authentication required: the configured secure strategy is unavailable.");
    }
    return strategy.resolve(providerId, transportKind);
  }
}

export interface ExternalMcpSession {
  isConnected?(): boolean;
  connect(signal?: AbortSignal): Promise<void>;
  discover(signal?: AbortSignal): Promise<ExternalProviderDiscovery>;
  invokeTool(
    toolName: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown>;
  close(): Promise<void>;
}

export interface ExternalMcpSessionFactory {
  createSession(definition: ExternalProviderDefinition): Promise<ExternalMcpSession>;
}

export class SdkExternalMcpSessionFactory implements ExternalMcpSessionFactory {
  constructor(
    private readonly authentication = new ExternalProviderAuthenticationRegistry(),
  ) {}

  async createSession(definition: ExternalProviderDefinition): Promise<ExternalMcpSession> {
    if (!definition.transport) {
      throw new Error(`External provider ${definition.providerId} is not configured.`);
    }
    const resolvedAuthentication = await this.authentication.resolve(
      definition.authenticationStrategyReference,
      definition.providerId,
      definition.transport.kind,
    );
    return new SdkExternalMcpSession(definition, resolvedAuthentication);
  }
}

class SdkExternalMcpSession implements ExternalMcpSession {
  private readonly client = new Client(
    { name: "champcity-ai", version: "0.1.0" },
    { capabilities: {} },
  );
  private readonly transport: Transport;
  private stderr = "";
  private connected = false;
  private closed = false;

  constructor(
    private readonly definition: ExternalProviderDefinition,
    authentication: ExternalProviderResolvedAuthentication,
  ) {
    this.client.onclose = () => { this.connected = false; };
    const transport = definition.transport;
    if (!transport) {
      throw new Error(`External provider ${definition.providerId} is not configured.`);
    }
    if (transport.kind === "stdio") {
      const stdio = new StdioClientTransport({
        command: transport.command,
        args: [...(transport.args ?? [])],
        cwd: transport.cwd,
        env: authentication.environment
          ? { ...getDefaultEnvironment(), ...authentication.environment }
          : undefined,
        stderr: "pipe",
      });
      stdio.stderr?.on("data", (chunk: Buffer | string) => {
        const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
        this.stderr = `${this.stderr}${text}`.slice(-maximumStderrCharacters);
      });
      this.transport = stdio;
    } else {
      this.transport = new StreamableHTTPClientTransport(new URL(transport.endpoint), {
        authProvider: authentication.oauthProvider,
        requestInit: {
          headers: {
            ...(transport.fixedHeaders ?? {}),
            ...(authentication.headers ?? {}),
          },
        },
        reconnectionOptions: {
          initialReconnectionDelay: 100,
          maxReconnectionDelay: 1_000,
          reconnectionDelayGrowFactor: 2,
          maxRetries: 1,
        },
      });
    }
  }

  async connect(signal?: AbortSignal): Promise<void> {
    this.assertOpen();
    try {
      await this.client.connect(this.transport, this.requestOptions(signal));
      this.connected = true;
    } catch (error) {
      throw this.withStderr(error);
    }
  }

  isConnected(): boolean { return this.connected && !this.closed; }

  async discover(signal?: AbortSignal): Promise<ExternalProviderDiscovery> {
    this.assertConnected();
    try {
      const tools = await this.listAllTools(signal);
      const resourceCount = this.client.getServerCapabilities()?.resources
        ? await this.countAllResources(signal)
        : 0;
      return { tools, resourceCount };
    } catch (error) {
      throw this.withStderr(error);
    }
  }

  async invokeTool(
    toolName: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    this.assertConnected();
    try {
      return await this.client.callTool(
        { name: toolName, arguments: args },
        undefined,
        this.requestOptions(signal),
      );
    } catch (error) {
      throw this.withStderr(error);
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.connected = false;
    await this.client.close();
  }

  private async listAllTools(signal?: AbortSignal): Promise<ExternalProviderDiscoveredTool[]> {
    const tools: ExternalProviderDiscoveredTool[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < maximumDiscoveryPages; page += 1) {
      const result = await this.client.listTools(
        cursor ? { cursor } : undefined,
        this.requestOptions(signal),
      );
      tools.push(...result.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })));
      this.assertDiscoveryBound(tools.length);
      cursor = result.nextCursor;
      if (!cursor) {
        return tools;
      }
    }
    throw new Error("External provider tool discovery exceeded the bounded page limit.");
  }

  private async countAllResources(signal?: AbortSignal): Promise<number> {
    let count = 0;
    let cursor: string | undefined;
    for (let page = 0; page < maximumDiscoveryPages; page += 1) {
      const result = await this.client.listResources(
        cursor ? { cursor } : undefined,
        this.requestOptions(signal),
      );
      count += result.resources.length;
      this.assertDiscoveryBound(count);
      cursor = result.nextCursor;
      if (!cursor) {
        return count;
      }
    }
    throw new Error("External provider resource discovery exceeded the bounded page limit.");
  }

  private requestOptions(signal?: AbortSignal): { timeout: number; maxTotalTimeout: number; signal?: AbortSignal } {
    return {
      timeout: this.definition.requestTimeoutMs,
      maxTotalTimeout: this.definition.requestTimeoutMs,
      signal,
    };
  }

  private assertDiscoveryBound(count: number): void {
    if (count > maximumDiscoveredEntries) {
      throw new Error("External provider discovery exceeded the bounded entry limit.");
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error("External provider session is closed.");
    }
  }

  private assertConnected(): void {
    this.assertOpen();
    if (!this.connected) {
      throw new Error("External provider session is not connected.");
    }
  }

  private withStderr(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    const stderr = this.stderr.trim();
    const combined = stderr ? `${message} ${stderr}` : message;
    if (error instanceof Error) {
      error.message = combined;
      return error;
    }
    return new Error(combined);
  }
}
