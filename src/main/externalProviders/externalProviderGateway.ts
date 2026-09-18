import type {
  ExternalProviderCapabilityStatus,
  ExternalProviderInvocationReceipt,
  ExternalProviderStatus,
} from "../../shared/externalProviderContracts";
import {
  boundedProviderDiagnostic,
  classifyExternalProviderError,
  ExternalProviderError,
} from "./externalProviderErrors";
import {
  ExternalProviderRegistry,
  transportKindForDefinition,
  type ExternalProviderDefinition,
  type ExternalProviderDiscovery,
} from "./externalProviderRegistry";
import {
  SdkExternalMcpSessionFactory,
  type ExternalMcpSession,
  type ExternalMcpSessionFactory,
} from "./externalMcpTransport";

const maximumStatusToolNames = 200;
const maximumCapturedResultCharacters = 64_000;
const maximumCapturedNodes = 2_000;
const sensitiveKeyPattern = /(?:authorization|cookie|password|passwd|secret|token|api[-_]?key|private[-_]?key)/i;

interface SessionLease {
  session: ExternalMcpSession;
  closeAfterUse: boolean;
}

export interface ExternalProviderGatewayOptions {
  registry?: ExternalProviderRegistry;
  sessionFactory?: ExternalMcpSessionFactory;
  now?: () => Date;
}

export class ExternalProviderGateway {
  readonly registry: ExternalProviderRegistry;
  private readonly sessionFactory: ExternalMcpSessionFactory;
  private readonly now: () => Date;
  private readonly statuses = new Map<string, ExternalProviderStatus>();
  private readonly discoveries = new Map<string, ExternalProviderDiscovery>();
  private readonly persistentSessions = new Map<string, ExternalMcpSession>();

  constructor(options: ExternalProviderGatewayOptions = {}) {
    this.registry = options.registry ?? new ExternalProviderRegistry();
    this.sessionFactory = options.sessionFactory ?? new SdkExternalMcpSessionFactory();
    this.now = options.now ?? (() => new Date());
    for (const definition of this.registry.list()) {
      this.statuses.set(definition.providerId, initialStatus(definition));
    }
  }

  register(definition: ExternalProviderDefinition): void {
    this.registry.register(definition);
    this.statuses.set(definition.providerId, initialStatus(this.registry.require(definition.providerId)));
  }

  getStatus(providerId: string): ExternalProviderStatus {
    const definition = this.registry.require(providerId);
    const session = this.persistentSessions.get(providerId);
    if (session?.isConnected?.() === false) {
      this.persistentSessions.delete(providerId);
      this.clearDiscoveredState(definition, "Provider connection closed. Reconnect to refresh capabilities.");
    }
    const status = this.statuses.get(providerId) ?? initialStatus(definition);
    this.statuses.set(providerId, status);
    return cloneStatus(status);
  }

  listStatuses(): ExternalProviderStatus[] {
    return this.registry.list().map((definition) => this.getStatus(definition.providerId));
  }

  async discover(providerId: string, signal?: AbortSignal): Promise<ExternalProviderStatus> {
    const definition = this.requireConfigured(providerId);
    let lease: SessionLease | undefined;
    let status: ExternalProviderStatus | undefined;
    let failure: ExternalProviderError | undefined;
    try {
      lease = await this.acquireSession(definition, signal);
      status = await this.refreshDiscovery(definition, lease.session, signal);
    } catch (error) {
      failure = classifyExternalProviderError(providerId, error, lease ? "discovery" : "connect");
      this.recordFailure(definition, failure, true);
    }
    const closeFailure = await this.releaseLease(definition, lease);
    if (failure) {
      throw failure;
    }
    if (closeFailure) {
      this.recordFailure(definition, closeFailure, false);
      throw closeFailure;
    }
    return cloneStatus(status!);
  }

  async invokeCapability(
    providerId: string,
    capabilityId: string,
    request: unknown,
    signal?: AbortSignal,
  ): Promise<ExternalProviderInvocationReceipt> {
    const definition = this.requireConfigured(providerId);
    let lease: SessionLease | undefined;
    let receipt: ExternalProviderInvocationReceipt | undefined;
    let failure: ExternalProviderError | undefined;
    let toolName: string | undefined;
    try {
      lease = await this.acquireSession(definition, signal);
      const discovery = await this.discoveryForInvocation(definition, lease.session, signal);
      const status = this.getMutableStatus(definition);
      const capability = status.capabilities.find((entry) => entry.capabilityId === capabilityId);
      if (!capability || capability.availability !== "available" || !capability.toolName) {
        throw new ExternalProviderError(
          "capability-unavailable",
          providerId,
          `External provider capability ${capabilityId} is unavailable.`,
          capabilityId,
        );
      }
      const prepared = definition.adapter.prepareInvocation({
        capabilityId,
        request,
        capability: { ...capability },
        discovery,
      });
      toolName = prepared.toolName;
      if (
        prepared.toolName !== capability.toolName ||
        !discovery.tools.some((tool) => tool.name === prepared.toolName)
      ) {
        throw new ExternalProviderError(
          "undiscovered-tool",
          providerId,
          "The provider adapter selected a tool outside the discovered capability binding.",
          capabilityId,
          prepared.toolName,
        );
      }
      const started = this.now();
      const result = await lease.session.invokeTool(prepared.toolName, prepared.arguments, signal);
      if (isProviderErrorResult(result)) {
        throw new ExternalProviderError(
          "provider-error",
          providerId,
          providerErrorDiagnostic(result),
          capabilityId,
          prepared.toolName,
        );
      }
      if (!definition.adapter.validateResult(capabilityId, result)) {
        throw new ExternalProviderError(
          "malformed-result",
          providerId,
          "The external provider returned a malformed result for the requested capability.",
          capabilityId,
          prepared.toolName,
        );
      }
      const completed = this.now();
      receipt = {
        providerId,
        displayName: definition.displayName,
        capabilityId,
        toolName: prepared.toolName,
        capabilityGeneration: status.capabilityGeneration,
        startedAt: started.toISOString(),
        completedAt: completed.toISOString(),
        durationMs: Math.max(0, completed.getTime() - started.getTime()),
        result: captureProviderResult(result),
      };
      status.readiness = "ready";
      status.transport = "connected";
      status.lastDiagnostic = null;
    } catch (error) {
      failure = classifyExternalProviderError(
        providerId,
        error,
        lease ? "invocation" : "connect",
        capabilityId,
        toolName,
      );
      this.recordFailure(definition, failure, false);
    }
    const closeFailure = await this.releaseLease(definition, lease);
    if (failure) {
      throw failure;
    }
    if (closeFailure) {
      this.recordFailure(definition, closeFailure, false);
      throw closeFailure;
    }
    return receipt!;
  }

  async reconnect(providerId: string, signal?: AbortSignal): Promise<ExternalProviderStatus> {
    const definition = this.requireConfigured(providerId);
    const closeFailure = await this.closePersistentSession(definition);
    this.clearDiscoveredState(definition, closeFailure?.message ?? "Provider reconnect requested.");
    if (closeFailure) {
      this.recordFailure(definition, closeFailure, false);
      throw closeFailure;
    }
    return this.discover(providerId, signal);
  }

  async shutdown(): Promise<void> {
    const failures: ExternalProviderError[] = [];
    for (const definition of this.registry.list()) {
      const failure = await this.closePersistentSession(definition);
      this.clearDiscoveredState(definition, "Provider gateway is shut down.");
      if (failure) {
        this.recordFailure(definition, failure, false);
        failures.push(failure);
      }
    }
    if (failures.length > 0) {
      throw failures[0];
    }
  }

  private requireConfigured(providerId: string): ExternalProviderDefinition {
    const definition = this.registry.require(providerId);
    if (!definition.configured || !definition.transport) {
      const error = new ExternalProviderError(
        "not-configured",
        providerId,
        `External provider ${providerId} is not configured.`,
      );
      this.recordFailure(definition, error, true);
      throw error;
    }
    return definition;
  }

  private async acquireSession(
    definition: ExternalProviderDefinition,
    signal?: AbortSignal,
  ): Promise<SessionLease> {
    const existing = this.persistentSessions.get(definition.providerId);
    if (existing) {
      return { session: existing, closeAfterUse: false };
    }
    const session = await this.sessionFactory.createSession(definition);
    try {
      await session.connect(signal);
    } catch (error) {
      await session.close().catch(() => undefined);
      throw error;
    }
    if (definition.lifecycle === "persistent") {
      this.persistentSessions.set(definition.providerId, session);
    }
    const status = this.getMutableStatus(definition);
    status.transport = "connected";
    return { session, closeAfterUse: definition.lifecycle === "ephemeral" };
  }

  private async releaseLease(
    definition: ExternalProviderDefinition,
    lease: SessionLease | undefined,
  ): Promise<ExternalProviderError | undefined> {
    if (!lease?.closeAfterUse) {
      return undefined;
    }
    try {
      await lease.session.close();
      const status = this.getMutableStatus(definition);
      status.transport = "not-connected";
      return undefined;
    } catch (error) {
      return classifyExternalProviderError(definition.providerId, error, "close");
    }
  }

  private async closePersistentSession(
    definition: ExternalProviderDefinition,
  ): Promise<ExternalProviderError | undefined> {
    const session = this.persistentSessions.get(definition.providerId);
    this.persistentSessions.delete(definition.providerId);
    if (!session) {
      return undefined;
    }
    try {
      await session.close();
      return undefined;
    } catch (error) {
      return classifyExternalProviderError(definition.providerId, error, "close");
    }
  }

  private async discoveryForInvocation(
    definition: ExternalProviderDefinition,
    session: ExternalMcpSession,
    signal?: AbortSignal,
  ): Promise<ExternalProviderDiscovery> {
    const cached = this.discoveries.get(definition.providerId);
    if (definition.lifecycle === "persistent" && cached) {
      return cached;
    }
    await this.refreshDiscovery(definition, session, signal);
    return this.discoveries.get(definition.providerId)!;
  }

  private async refreshDiscovery(
    definition: ExternalProviderDefinition,
    session: ExternalMcpSession,
    signal?: AbortSignal,
  ): Promise<ExternalProviderStatus> {
    const discovered = await session.discover(signal);
    const allowedTools = definition.nativeToolFilter?.tools;
    const tools = allowedTools && allowedTools.length > 0
      ? discovered.tools.filter((tool) => allowedTools.includes(tool.name))
      : [...discovered.tools];
    const discovery: ExternalProviderDiscovery = {
      tools,
      resourceCount: discovered.resourceCount,
    };
    const capabilities = normalizeCapabilities(definition, discovery);
    this.discoveries.set(definition.providerId, discovery);
    const status = this.getMutableStatus(definition);
    status.readiness = "ready";
    status.discovery = "succeeded";
    status.transport = "connected";
    status.lastDiagnostic = null;
    status.capabilityGeneration += 1;
    status.discoveredToolNames = tools.slice(0, maximumStatusToolNames).map((tool) => tool.name);
    status.discoveredResourceCount = discovery.resourceCount;
    status.capabilities = capabilities;
    return status;
  }

  private clearDiscoveredState(definition: ExternalProviderDefinition, diagnostic: string): void {
    this.discoveries.delete(definition.providerId);
    const status = this.getMutableStatus(definition);
    status.readiness = definition.configured ? "unavailable" : "unavailable";
    status.discovery = "not-attempted";
    status.transport = "not-connected";
    status.lastDiagnostic = boundedProviderDiagnostic(diagnostic);
    status.discoveredToolNames = [];
    status.discoveredResourceCount = 0;
    status.capabilities = unknownCapabilities(definition);
  }

  private recordFailure(
    definition: ExternalProviderDefinition,
    error: ExternalProviderError,
    discoveryFailed: boolean,
  ): void {
    const status = this.getMutableStatus(definition);
    status.lastDiagnostic = boundedProviderDiagnostic(error.message);
    if (error.kind === "authentication-required") {
      status.readiness = "authentication-required";
      status.transport = "failed";
    } else if (error.kind === "transport-failure" || error.kind === "not-configured") {
      status.readiness = "unavailable";
      status.transport = "failed";
    } else if (error.kind !== "capability-unavailable" && error.kind !== "undiscovered-tool") {
      status.readiness = "degraded";
    }
    if (discoveryFailed) {
      this.discoveries.delete(definition.providerId);
      status.discovery = "failed";
      status.discoveredToolNames = [];
      status.discoveredResourceCount = 0;
      status.capabilities = unknownCapabilities(definition);
    }
  }

  private getMutableStatus(definition: ExternalProviderDefinition): ExternalProviderStatus {
    let status = this.statuses.get(definition.providerId);
    if (!status) {
      status = initialStatus(definition);
      this.statuses.set(definition.providerId, status);
    }
    return status;
  }
}

function initialStatus(definition: ExternalProviderDefinition): ExternalProviderStatus {
  return {
    providerId: definition.providerId,
    displayName: definition.displayName,
    transportKind: transportKindForDefinition(definition),
    configuration: definition.configured ? "configured" : "not-configured",
    readiness: "unavailable",
    discovery: "not-attempted",
    transport: "not-connected",
    lastDiagnostic: definition.configured ? null : "External provider is not configured.",
    capabilityGeneration: 0,
    discoveredToolNames: [],
    discoveredResourceCount: 0,
    capabilities: unknownCapabilities(definition),
  };
}

function unknownCapabilities(definition: ExternalProviderDefinition): ExternalProviderCapabilityStatus[] {
  return definition.adapter.capabilityIds.map((capabilityId) => ({
    capabilityId,
    availability: "unknown",
  }));
}

function normalizeCapabilities(
  definition: ExternalProviderDefinition,
  discovery: ExternalProviderDiscovery,
): ExternalProviderCapabilityStatus[] {
  const mapped = definition.adapter.mapCapabilities(discovery);
  const mappedById = new Map(mapped.map((entry) => [entry.capabilityId, entry]));
  const discoveredToolNames = new Set(discovery.tools.map((tool) => tool.name));
  return definition.adapter.capabilityIds.map((capabilityId) => {
    const candidate = mappedById.get(capabilityId);
    if (!candidate) {
      return { capabilityId, availability: "unavailable" };
    }
    if (
      candidate.availability === "available" &&
      (!candidate.toolName || !discoveredToolNames.has(candidate.toolName))
    ) {
      return {
        capabilityId,
        availability: "unavailable",
        diagnostic: "The adapter capability binding was not present in bounded discovery.",
      };
    }
    return {
      capabilityId,
      availability: candidate.availability,
      toolName: candidate.availability === "available" ? candidate.toolName : undefined,
      diagnostic: candidate.diagnostic
        ? boundedProviderDiagnostic(candidate.diagnostic)
        : undefined,
    };
  });
}

function cloneStatus(status: ExternalProviderStatus): ExternalProviderStatus {
  return {
    ...status,
    discoveredToolNames: [...status.discoveredToolNames],
    capabilities: status.capabilities.map((capability) => ({ ...capability })),
  };
}

function isProviderErrorResult(result: unknown): boolean {
  return Boolean(result && typeof result === "object" && (result as { isError?: unknown }).isError === true);
}

function providerErrorDiagnostic(result: unknown): string {
  const text = result && typeof result === "object" && Array.isArray((result as { content?: unknown }).content)
    ? (result as { content: unknown[] }).content
      .map((entry) => entry && typeof entry === "object" && "text" in entry
        ? String((entry as { text?: unknown }).text ?? "")
        : "")
      .filter(Boolean)
      .join(" ")
    : "";
  return text || "The external provider reported a tool execution error.";
}

function captureProviderResult(result: unknown): unknown {
  const state = { nodes: 0, characters: 0, truncated: false };
  const seen = new WeakSet<object>();
  const captured = captureValue(result, state, seen, 0);
  const serialized = JSON.stringify(captured);
  if (serialized.length <= maximumCapturedResultCharacters) {
    return captured;
  }
  return {
    truncated: true,
    preview: redactProviderText(serialized.slice(0, maximumCapturedResultCharacters)),
  };
}

function captureValue(
  value: unknown,
  state: { nodes: number; characters: number; truncated: boolean },
  seen: WeakSet<object>,
  depth: number,
): unknown {
  state.nodes += 1;
  if (state.nodes > maximumCapturedNodes || depth > 20) {
    state.truncated = true;
    return "[TRUNCATED]";
  }
  if (typeof value === "string") {
    const remaining = Math.max(0, maximumCapturedResultCharacters - state.characters);
    const text = redactProviderText(value).slice(0, remaining);
    state.characters += text.length;
    if (text.length < value.length) state.truncated = true;
    return text;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if (seen.has(value)) {
    return "[CIRCULAR]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const entries = value.slice(0, 200).map((entry) => captureValue(entry, state, seen, depth + 1));
    if (entries.length < value.length) state.truncated = true;
    return entries;
  }
  const captured: Record<string, unknown> = {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 200);
  for (const [key, entry] of entries) {
    captured[key] = sensitiveKeyPattern.test(key)
      ? "[REDACTED]"
      : captureValue(entry, state, seen, depth + 1);
  }
  if (entries.length < Object.keys(value).length) state.truncated = true;
  if (depth === 0 && state.truncated) captured.truncated = true;
  return captured;
}

function redactProviderText(value: string): string {
  // MCP text blocks commonly contain JSON. Preserve its grammar while removing
  // complete sensitive values, including values containing spaces or escapes.
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && typeof parsed === "object") {
      return JSON.stringify(parsed, (key, entry: unknown) => sensitiveKeyPattern.test(key)
        ? "[REDACTED]"
        : typeof entry === "string" ? redactPlainProviderText(entry) : entry);
    }
  } catch { /* Non-JSON provider text uses bounded textual redaction below. */ }
  return redactPlainProviderText(value);
}

function redactPlainProviderText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(authorization|proxy-authorization|cookie|set-cookie|x-api-key)\s*[:=]\s*[^\s,;]+/gi, "$1: [REDACTED]")
    .replace(/(["']?(?:password|secret|token|access_token|refresh_token|api[-_]?key|private[-_]?key)["']?\s*[:=]\s*)["']?[^\s,;&"']+["']?/gi, '$1"[REDACTED]"');
}
