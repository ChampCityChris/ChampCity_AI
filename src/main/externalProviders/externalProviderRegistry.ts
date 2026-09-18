import type {
  ExternalProviderCapabilityStatus,
  ExternalProviderTransportKind,
} from "../../shared/externalProviderContracts";
import { ExternalProviderError } from "./externalProviderErrors";

export interface ExternalProviderDiscoveredTool {
  name: string;
  description?: string;
  inputSchema: unknown;
}

export interface ExternalProviderDiscovery {
  tools: readonly ExternalProviderDiscoveredTool[];
  resourceCount: number;
}

export interface ExternalProviderAdapterContext {
  capabilityId: string;
  request: unknown;
  capability: ExternalProviderCapabilityStatus;
  discovery: ExternalProviderDiscovery;
}

export interface ExternalProviderPreparedInvocation {
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ExternalProviderAdapter {
  readonly capabilityIds: readonly string[];
  mapCapabilities(discovery: ExternalProviderDiscovery): readonly ExternalProviderCapabilityStatus[];
  prepareInvocation(context: ExternalProviderAdapterContext): ExternalProviderPreparedInvocation;
  validateResult(capabilityId: string, result: unknown): boolean;
}

export interface ExternalProviderNativeToolFilter {
  tools?: readonly string[];
  toolsets?: readonly string[];
}

export interface ExternalProviderStdioTransportDefinition {
  kind: "stdio";
  command: string;
  args?: readonly string[];
  cwd?: string;
}

export interface ExternalProviderHttpTransportDefinition {
  kind: "streamable-http";
  endpoint: string;
  fixedHeaders?: Readonly<Record<string, string>>;
}

export type ExternalProviderTransportDefinition =
  | ExternalProviderStdioTransportDefinition
  | ExternalProviderHttpTransportDefinition;

export interface ExternalProviderDefinition {
  providerId: string;
  displayName: string;
  configured: boolean;
  transport: ExternalProviderTransportDefinition | null;
  authenticationStrategyReference?: string;
  nativeToolFilter?: ExternalProviderNativeToolFilter;
  lifecycle: "ephemeral" | "persistent";
  requestTimeoutMs: number;
  adapter: ExternalProviderAdapter;
}

export class ExternalProviderRegistry {
  private readonly definitions = new Map<string, ExternalProviderDefinition>();

  register(definition: ExternalProviderDefinition): void {
    validateDefinition(definition);
    if (this.definitions.has(definition.providerId)) {
      throw new Error(`External provider ${definition.providerId} is already registered.`);
    }
    this.definitions.set(definition.providerId, freezeDefinition(definition));
  }

  require(providerId: string): ExternalProviderDefinition {
    const definition = this.definitions.get(providerId);
    if (!definition) {
      throw new ExternalProviderError(
        "unknown-provider",
        providerId,
        `External provider ${providerId} is not registered.`,
      );
    }
    return definition;
  }

  list(): readonly ExternalProviderDefinition[] {
    return [...this.definitions.values()];
  }
}

function validateDefinition(definition: ExternalProviderDefinition): void {
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(definition.providerId)) {
    throw new Error("External provider IDs must be stable lowercase identifiers.");
  }
  if (!definition.displayName.trim()) {
    throw new Error("External providers require a display name.");
  }
  if (definition.configured && !definition.transport) {
    throw new Error(`Configured external provider ${definition.providerId} requires a transport.`);
  }
  if (!Number.isInteger(definition.requestTimeoutMs) || definition.requestTimeoutMs < 1 || definition.requestTimeoutMs > 120_000) {
    throw new Error("External provider request timeouts must be between 1 and 120000 milliseconds.");
  }
  const capabilityIds = [...definition.adapter.capabilityIds];
  if (capabilityIds.length === 0 || new Set(capabilityIds).size !== capabilityIds.length) {
    throw new Error(`External provider ${definition.providerId} requires unique normalized capability IDs.`);
  }
  const filteredTools = definition.nativeToolFilter?.tools ?? [];
  if (new Set(filteredTools).size !== filteredTools.length || filteredTools.some((name) => !name.trim())) {
    throw new Error(`External provider ${definition.providerId} has an invalid tool filter.`);
  }
  if (definition.transport?.kind === "stdio" && !definition.transport.command.trim()) {
    throw new Error(`External provider ${definition.providerId} requires an application-owned command.`);
  }
  if (definition.transport?.kind === "streamable-http") {
    const endpoint = new URL(definition.transport.endpoint);
    if (endpoint.protocol !== "https:" && !isLoopbackHttp(endpoint)) {
      throw new Error("Streamable HTTP providers require HTTPS except for loopback test/development endpoints.");
    }
    if (endpoint.username || endpoint.password || [...endpoint.searchParams.keys()].some(isSensitiveConfigurationKey)) {
      throw new Error("Streamable HTTP provider endpoints must not contain credentials.");
    }
    if (Object.keys(definition.transport.fixedHeaders ?? {}).some(isSensitiveConfigurationKey)) {
      throw new Error("Provider credentials must use a registered authentication strategy, not fixed headers.");
    }
  }
}

function isLoopbackHttp(url: URL): boolean {
  return url.protocol === "http:" && ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname);
}

function isSensitiveConfigurationKey(value: string): boolean {
  return /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|password|secret|token|access_token|refresh_token|api[-_]?key|private[-_]?key)$/i.test(value);
}

function freezeDefinition(definition: ExternalProviderDefinition): ExternalProviderDefinition {
  const transport = definition.transport?.kind === "stdio"
    ? Object.freeze({ ...definition.transport, args: Object.freeze([...(definition.transport.args ?? [])]) })
    : definition.transport
      ? Object.freeze({ ...definition.transport, fixedHeaders: Object.freeze({ ...(definition.transport.fixedHeaders ?? {}) }) })
      : null;
  const nativeToolFilter = definition.nativeToolFilter
    ? Object.freeze({
      tools: Object.freeze([...(definition.nativeToolFilter.tools ?? [])]),
      toolsets: Object.freeze([...(definition.nativeToolFilter.toolsets ?? [])]),
    })
    : undefined;
  return Object.freeze({
    ...definition,
    transport,
    nativeToolFilter,
  });
}

export function transportKindForDefinition(
  definition: ExternalProviderDefinition,
): ExternalProviderTransportKind | null {
  return definition.transport?.kind ?? null;
}
