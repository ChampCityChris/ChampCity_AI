import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type {
  AgentHarnessMcpSessionDiagnostics,
  AgentHarnessOperationalDiagnostics,
  AgentHarnessReadinessReasonCode,
  AgentHarnessToolContractSnapshot,
  AgentHarnessToolContractDiagnostics,
} from "../../../shared/workspaceContracts";
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
import {
  captureAgentHarnessRuntimeToolContract,
  createAgentHarnessMcpServer,
  normalizeAgentHarnessPublicToolScope,
  snapshotAgentHarnessRuntimeToolContract,
  type CapturedAgentHarnessToolContract,
  type AgentHarnessMcpServer,
} from "./mcpServer";
import { assertAgentHarnessLoopbackHost } from "./bindingPolicy";
import {
  AgentHarnessOperationalDiagnosticsCollector,
  type AgentHarnessOperationalDiagnosticsOptions,
} from "./operationalDiagnostics";

export interface AgentHarnessHttpRuntimeOptions {
  host: string;
  port: number;
  publicBaseUrl?: string;
  userDataRoot: string;
  registry: AgentHarnessToolRegistry;
  allowUnauthenticatedLocal?: boolean;
  sessionLifecyclePolicy?: Partial<AgentHarnessMcpSessionPolicy>;
  sessionLifecycleClock?: () => number;
  operationalDiagnosticsOptions?: AgentHarnessOperationalDiagnosticsOptions;
}

export interface AgentHarnessMcpSessionPolicy {
  idleTtlMs: number;
  reaperCadenceMs: number;
  globalCap: number;
  perPrincipalCap: number;
}

export interface AgentHarnessHttpRuntimeHandle {
  port: number;
  url: string;
  healthUrl: string;
  readinessUrl: string;
  runtimeToolContract: () => AgentHarnessToolContractSnapshot;
  publishedToolContractDiagnostics: () => AgentHarnessToolContractDiagnostics["published"];
  sessionDiagnostics: () => AgentHarnessMcpSessionDiagnostics;
  operationalDiagnostics: () => AgentHarnessOperationalDiagnostics;
  reapIdleSessions: () => Promise<number>;
  suspendAdmission: () => void;
  resumeAfterPowerEpoch: () => Promise<void>;
  drainForControlledRestart: (deadlineMs: number) => Promise<{
    outcome: "drained" | "deadline-exceeded";
    activeRequestsAtStart: number;
    activeRequestsAtEnd: number;
  }>;
  close: () => Promise<void>;
}

const MCP_MAX_REQUEST_BYTES = 1_000_000;
const OAUTH_MAX_REQUEST_BYTES = 64_000;
const PRIMARY_PUBLIC_TOOL_SCOPE = "files.read files.write";
const DEFAULT_MCP_SESSION_POLICY: AgentHarnessMcpSessionPolicy = {
  idleTtlMs: 5 * 60 * 1_000,
  reaperCadenceMs: 60 * 1_000,
  globalCap: 32,
  perPrincipalCap: 8,
};

type McpSessionLifecycleState = "initializing" | "active" | "disposing" | "disposed";
type McpSessionDisposalReason =
  | "cleanClose"
  | "idleTtl"
  | "capEviction"
  | "runtimeClose"
  | "resumeReset"
  | "initializationFailure";

interface McpSessionRecord {
  registrationKey: string;
  sessionId: string | null;
  authorizationPrincipal: string;
  requiredScope: string;
  createdAt: number;
  lastMeaningfulActivityAt: number;
  inFlightRequestCount: number;
  liveResponseCount: number;
  lifecycleState: McpSessionLifecycleState;
  server: AgentHarnessMcpServer | null;
  transport: StreamableHTTPServerTransport | null;
  disposalReason: McpSessionDisposalReason | null;
  disposalPromise: Promise<boolean> | null;
}

class RequestBodyTooLargeError extends Error {
  constructor(readonly limitBytes: number) {
    super(`Request body exceeds ${limitBytes} bytes.`);
  }
}

class McpSessionCapacityError extends Error {
  constructor() {
    super("MCP session capacity is temporarily unavailable.");
  }
}

class McpSessionRegistry {
  private readonly records = new Map<string, McpSessionRecord>();
  private readonly disposedCounts: Record<McpSessionDisposalReason, number> = {
    cleanClose: 0,
    idleTtl: 0,
    capEviction: 0,
    runtimeClose: 0,
    resumeReset: 0,
    initializationFailure: 0,
  };
  private mutationTail: Promise<void> = Promise.resolve();
  private accepting = true;
  private totalCreated = 0;
  private rejectedInitializationCount = 0;
  private reaperTimerCount = 0;
  private reaperRunCount = 0;
  private lastSuccessfulReaperAt: string | null = null;
  private readonly activeSessionCountsByScope = new Map<string, number>();

  constructor(
    private readonly policy: AgentHarnessMcpSessionPolicy,
    private readonly now: () => number,
  ) {}

  reserve(authorizationPrincipal: string, requiredScope: string): Promise<McpSessionRecord> {
    return this.enqueueMutation(async () => {
      if (!this.accepting) {
        this.rejectedInitializationCount += 1;
        throw new McpSessionCapacityError();
      }
      await this.reapExpiredExclusive();
      await this.makeCapacityForPrincipal(authorizationPrincipal);
      await this.makeGlobalCapacity();
      const timestamp = this.now();
      const record: McpSessionRecord = {
        registrationKey: randomUUID(),
        sessionId: null,
        authorizationPrincipal,
        requiredScope,
        createdAt: timestamp,
        lastMeaningfulActivityAt: timestamp,
        inFlightRequestCount: 0,
        liveResponseCount: 0,
        lifecycleState: "initializing",
        server: null,
        transport: null,
        disposalReason: null,
        disposalPromise: null,
      };
      this.records.set(record.registrationKey, record);
      return record;
    });
  }

  attachResources(
    record: McpSessionRecord,
    server: AgentHarnessMcpServer,
    transport: StreamableHTTPServerTransport,
  ): void {
    if (record.lifecycleState !== "initializing" || !this.records.has(record.registrationKey)) {
      throw new Error("MCP session initialization is no longer active.");
    }
    record.server = server;
    record.transport = transport;
  }

  markInitialized(record: McpSessionRecord, sessionId: string): void {
    if (record.lifecycleState !== "initializing" || !this.records.has(record.registrationKey)) {
      throw new Error("MCP session initialization is no longer active.");
    }
    if ([...this.records.values()].some((entry) => entry !== record && entry.sessionId === sessionId)) {
      throw new Error("MCP session initialization produced a duplicate session ID.");
    }
    record.sessionId = sessionId;
    record.lifecycleState = "active";
    record.lastMeaningfulActivityAt = this.now();
    this.totalCreated += 1;
    this.activeSessionCountsByScope.set(
      record.requiredScope,
      (this.activeSessionCountsByScope.get(record.requiredScope) ?? 0) + 1,
    );
  }

  find(sessionId: string): McpSessionRecord | undefined {
    return [...this.records.values()].find((record) =>
      record.lifecycleState === "active" && record.sessionId === sessionId
    );
  }

  activeSessionCounts(): ReadonlyMap<string, number> {
    return new Map(this.activeSessionCountsByScope);
  }

  beginRequest(record: McpSessionRecord, response: ServerResponse): {
    finish: (successful: boolean) => void;
  } {
    if (!this.records.has(record.registrationKey) || !["initializing", "active"].includes(record.lifecycleState)) {
      throw new Error("MCP session is no longer addressable.");
    }
    record.inFlightRequestCount += 1;
    record.liveResponseCount += 1;
    record.lastMeaningfulActivityAt = this.now();
    let responseReleased = false;
    const releaseResponse = (): void => {
      if (responseReleased) {
        return;
      }
      responseReleased = true;
      record.liveResponseCount = Math.max(0, record.liveResponseCount - 1);
    };
    response.once("finish", releaseResponse);
    response.once("close", releaseResponse);
    response.once("error", releaseResponse);
    let requestReleased = false;
    return {
      finish: (successful) => {
        if (requestReleased) {
          return;
        }
        requestReleased = true;
        record.inFlightRequestCount = Math.max(0, record.inFlightRequestCount - 1);
        if (successful && record.lifecycleState === "active") {
          record.lastMeaningfulActivityAt = this.now();
        }
      },
    };
  }

  dispose(record: McpSessionRecord, reason: McpSessionDisposalReason): Promise<boolean> {
    if (record.lifecycleState === "disposed") {
      return Promise.resolve(false);
    }
    if (record.lifecycleState === "disposing") {
      return record.disposalPromise ?? Promise.resolve(false);
    }
    const wasActive = record.lifecycleState === "active";
    record.lifecycleState = "disposing";
    record.disposalReason = reason;
    this.records.delete(record.registrationKey);
    if (wasActive) {
      const nextScopeCount = Math.max(0, (this.activeSessionCountsByScope.get(record.requiredScope) ?? 0) - 1);
      if (nextScopeCount === 0) {
        this.activeSessionCountsByScope.delete(record.requiredScope);
      } else {
        this.activeSessionCountsByScope.set(record.requiredScope, nextScopeCount);
      }
    }
    record.inFlightRequestCount = 0;
    record.liveResponseCount = 0;
    this.disposedCounts[reason] += 1;
    const disposalPromise = (async () => {
      try {
        if (record.server) {
          await record.server.close();
        } else if (record.transport) {
          await record.transport.close();
        }
      } finally {
        record.lifecycleState = "disposed";
      }
      return true;
    })();
    record.disposalPromise = disposalPromise;
    return disposalPromise;
  }

  reapExpired(): Promise<number> {
    return this.enqueueMutation(() => this.reapExpiredExclusive());
  }

  closeAll(reason: "runtimeClose" | "resumeReset"): Promise<void> {
    this.accepting = false;
    return this.enqueueMutation(async () => {
      const retained = [...this.records.values()];
      await Promise.all(retained.map((record) => this.dispose(record, reason)));
    });
  }

  async resetAfterResume(): Promise<void> {
    this.accepting = false;
    await this.enqueueMutation(async () => {
      const retained = [...this.records.values()];
      await Promise.all(retained.map((record) => this.dispose(record, "resumeReset")));
    });
    this.accepting = true;
  }

  setAccepting(accepting: boolean): void {
    this.accepting = accepting;
  }

  setReaperTimerActive(active: boolean): void {
    this.reaperTimerCount = active ? 1 : 0;
  }

  diagnostics(): AgentHarnessMcpSessionDiagnostics {
    const retained = [...this.records.values()];
    const busy = retained.filter((record) => this.isBusy(record)).length;
    const streaming = retained.filter((record) => record.liveResponseCount > 0).length;
    const inFlight = retained.filter((record) => record.inFlightRequestCount > 0).length;
    return {
      retainedSessionCount: retained.length,
      busySessionCount: busy,
      idleSessionCount: retained.length - busy,
      streamingSessionCount: streaming,
      inFlightSessionCount: inFlight,
      currentInFlightRequestCount: this.activeRequestCount(),
      liveStreamCount: retained.reduce((count, record) => count + record.liveResponseCount, 0),
      totalCreated: this.totalCreated,
      totalDisposed: { ...this.disposedCounts },
      rejectedInitializationCount: this.rejectedInitializationCount,
      reaperTimerCount: this.reaperTimerCount,
      reaperRunCount: this.reaperRunCount,
      lastSuccessfulReaperAt: this.lastSuccessfulReaperAt,
      limits: {
        globalCap: this.policy.globalCap,
        perPrincipalCap: this.policy.perPrincipalCap,
        idleTtlMs: this.policy.idleTtlMs,
      },
    };
  }

  activeRequestCount(): number {
    return [...this.records.values()].reduce((count, record) => count + record.inFlightRequestCount, 0);
  }

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.mutationTail.then(operation, operation);
    this.mutationTail = next.then(() => undefined, () => undefined);
    return next;
  }

  private async reapExpiredExclusive(): Promise<number> {
    const now = this.now();
    const expired = [...this.records.values()].filter((record) =>
      this.isEligible(record) && now - record.lastMeaningfulActivityAt >= this.policy.idleTtlMs
    );
    await Promise.all(expired.map((record) => this.dispose(record, "idleTtl")));
    this.reaperRunCount += 1;
    this.lastSuccessfulReaperAt = new Date(now).toISOString();
    return expired.length;
  }

  private async makeCapacityForPrincipal(authorizationPrincipal: string): Promise<void> {
    while (this.countForPrincipal(authorizationPrincipal) >= this.policy.perPrincipalCap) {
      const victim = this.leastRecentlyActiveEligible((record) =>
        record.authorizationPrincipal === authorizationPrincipal
      );
      if (!victim) {
        this.rejectedInitializationCount += 1;
        throw new McpSessionCapacityError();
      }
      await this.dispose(victim, "capEviction");
    }
  }

  private async makeGlobalCapacity(): Promise<void> {
    while (this.records.size >= this.policy.globalCap) {
      const victim = this.leastRecentlyActiveEligible(() => true);
      if (!victim) {
        this.rejectedInitializationCount += 1;
        throw new McpSessionCapacityError();
      }
      await this.dispose(victim, "capEviction");
    }
  }

  private countForPrincipal(authorizationPrincipal: string): number {
    return [...this.records.values()].filter((record) =>
      record.authorizationPrincipal === authorizationPrincipal
    ).length;
  }

  private leastRecentlyActiveEligible(predicate: (record: McpSessionRecord) => boolean): McpSessionRecord | undefined {
    return [...this.records.values()]
      .filter((record) => predicate(record) && this.isEligible(record))
      .sort((left, right) =>
        left.lastMeaningfulActivityAt - right.lastMeaningfulActivityAt || left.createdAt - right.createdAt
      )[0];
  }

  private isBusy(record: McpSessionRecord): boolean {
    return record.lifecycleState === "initializing" ||
      record.inFlightRequestCount > 0 ||
      record.liveResponseCount > 0;
  }

  private isEligible(record: McpSessionRecord): boolean {
    return record.lifecycleState === "active" && !this.isBusy(record);
  }
}

class RuntimeToolContractGeneration {
  readonly id: string;
  readonly publishedAt: string;
  private readonly contracts = new Map<string, CapturedAgentHarnessToolContract>();
  private captureCount = 0;

  constructor(
    private readonly registry: AgentHarnessToolRegistry,
    initialScope: string,
    generationId: string = randomUUID(),
  ) {
    this.id = generationId;
    this.publishedAt = new Date().toISOString();
    this.contractForScope(initialScope);
  }

  contractForScope(scope: string): CapturedAgentHarnessToolContract {
    const normalizedScope = normalizeAgentHarnessPublicToolScope(scope);
    const existing = this.contracts.get(normalizedScope);
    if (existing) {
      return existing;
    }
    const captured = captureAgentHarnessRuntimeToolContract(this.registry, normalizedScope);
    this.contracts.set(normalizedScope, captured);
    this.captureCount += 1;
    return captured;
  }

  primarySnapshot(): AgentHarnessToolContractSnapshot {
    return snapshotAgentHarnessRuntimeToolContract(this.contractForScope(PRIMARY_PUBLIC_TOOL_SCOPE));
  }

  publishedDiagnostics(sessions: McpSessionRegistry): AgentHarnessToolContractDiagnostics["published"] {
    const sessionCounts = sessions.activeSessionCounts();
    const activeSessionCount = [...sessionCounts.values()].reduce((total, count) => total + count, 0);
    const contracts = [...this.contracts.values()]
      .map((contract) => ({
        ...snapshotAgentHarnessRuntimeToolContract(contract),
        current: true,
        sessionCount: sessionCounts.get(contract.scope) ?? 0,
      }))
      .sort((left, right) => left.scope.localeCompare(right.scope));
    return {
      state: activeSessionCount === 0 ? "none" : "all-current",
      runtimeGeneration: this.id,
      capturedScopeCount: this.contracts.size,
      contractCaptureCount: this.captureCount,
      explicitGenerationChangeCount: 0,
      lastControlledPublicationAt: this.publishedAt,
      periodicContractTimerCount: 0,
      activeSessionCount,
      staleSessionCount: 0,
      contracts,
      sessionLifecycle: sessions.diagnostics(),
    };
  }
}

export async function startAgentHarnessHttpRuntime(options: AgentHarnessHttpRuntimeOptions): Promise<AgentHarnessHttpRuntimeHandle> {
  assertAgentHarnessLoopbackHost(options.host);
  if (options.publicBaseUrl && options.allowUnauthenticatedLocal === true) {
    throw new Error("Public Agent Harness connectors require OAuth; unauthenticated local mode is development-only.");
  }
  const sessionPolicy = resolveMcpSessionPolicy(options.sessionLifecyclePolicy);
  const sessions = new McpSessionRegistry(sessionPolicy, options.sessionLifecycleClock ?? Date.now);
  const operationalDiagnostics = new AgentHarnessOperationalDiagnosticsCollector(options.operationalDiagnosticsOptions);
  const contractGeneration = new RuntimeToolContractGeneration(
    options.registry,
    PRIMARY_PUBLIC_TOOL_SCOPE,
  );
  let admittingRequests = true;
  let readinessReasonCode: AgentHarnessReadinessReasonCode = "ready";
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
      if (requestUrl.pathname === "/ready") {
        writeJson(res, admittingRequests ? 200 : 503, {
          status: admittingRequests ? "ready" : "degraded",
          workerGeneration: operationalDiagnostics.workerGeneration,
          reasonCode: readinessReasonCode,
        });
        return;
      }
      if (!admittingRequests && requestUrl.pathname === "/mcp") {
        writeJson(res, 503, {
          error: "SERVICE_RECOVERY_IN_PROGRESS",
          message: "Agent Harness is temporarily not admitting MCP work during lifecycle recovery.",
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
        const publicUrls = resolvePublicUrlModel(options, actualPort);
        writeJson(res, 200, {
          issuer: publicUrls.authorizationServerIssuer,
          registration_endpoint: publicUrls.oauthEndpoint("/oauth/register"),
          authorization_endpoint: publicUrls.oauthEndpoint("/oauth/authorize"),
          token_endpoint: publicUrls.oauthEndpoint("/oauth/token"),
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
          authorizationPrincipal: auth.authorizationPrincipal,
          sessions,
          contractGeneration,
          operationalDiagnostics,
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
  const sessionReaperTimer = setInterval(() => {
    void sessions.reapExpired().catch(() => undefined);
  }, sessionPolicy.reaperCadenceMs);
  sessionReaperTimer.unref();
  sessions.setReaperTimerActive(true);
  const address = server.address();
  actualPort = address && typeof address === "object" ? address.port : options.port;
  let closePromise: Promise<void> | null = null;
  return {
    port: actualPort,
    url: `${publicBaseUrl(options, actualPort)}/mcp`,
    healthUrl: `${publicBaseUrl(options, actualPort)}/health`,
    readinessUrl: `${publicBaseUrl(options, actualPort)}/ready`,
    runtimeToolContract: () => contractGeneration.primarySnapshot(),
    publishedToolContractDiagnostics: () => contractGeneration.publishedDiagnostics(sessions),
    sessionDiagnostics: () => sessions.diagnostics(),
    operationalDiagnostics: () => operationalDiagnostics.snapshot(
      sessions.diagnostics(),
      contractGeneration.publishedDiagnostics(sessions),
    ),
    reapIdleSessions: () => sessions.reapExpired(),
    suspendAdmission: () => {
      admittingRequests = false;
      readinessReasonCode = "suspend-admission-paused";
      operationalDiagnostics.markSuspend();
      sessions.setAccepting(false);
    },
    resumeAfterPowerEpoch: async () => {
      admittingRequests = false;
      readinessReasonCode = "resume-reconciliation";
      operationalDiagnostics.markResumeStarted();
      await sessions.resetAfterResume();
      admittingRequests = true;
      readinessReasonCode = "ready";
      operationalDiagnostics.setReadiness("ready", "ready");
    },
    drainForControlledRestart: async (deadlineMs) => {
      admittingRequests = false;
      readinessReasonCode = "controlled-restart-draining";
      operationalDiagnostics.setReadiness("degraded", "controlled-restart-draining");
      sessions.setAccepting(false);
      const activeRequestsAtStart = sessions.activeRequestCount();
      const deadline = Date.now() + Math.max(0, deadlineMs);
      let activeRequestsAtEnd = activeRequestsAtStart;
      while (activeRequestsAtEnd > 0 && Date.now() < deadline) {
        await delay(25);
        activeRequestsAtEnd = sessions.activeRequestCount();
      }
      return {
        outcome: activeRequestsAtEnd === 0 ? "drained" : "deadline-exceeded",
        activeRequestsAtStart,
        activeRequestsAtEnd,
      };
    },
    close: () => {
      closePromise ??= (async () => {
        admittingRequests = false;
        readinessReasonCode = "runtime-closing";
        operationalDiagnostics.close();
        clearInterval(sessionReaperTimer);
        sessions.setReaperTimerActive(false);
        await sessions.closeAll("runtimeClose");
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      })();
      return closePromise;
    },
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse, options: {
  registry: AgentHarnessToolRegistry;
  scope: string;
  authorizationPrincipal: string;
  sessions: McpSessionRegistry;
  contractGeneration: RuntimeToolContractGeneration;
  operationalDiagnostics: AgentHarnessOperationalDiagnosticsCollector;
}): Promise<void> {
  const sessionId = headerValue(req.headers["mcp-session-id"]);
  const existingSession = sessionId ? options.sessions.find(sessionId) : undefined;
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
    const request = options.sessions.beginRequest(existingSession, res);
    let successful = false;
    try {
      const parsedBody = req.method === "POST" ? await readBody(req, MCP_MAX_REQUEST_BYTES) : undefined;
      if (!existingSession.transport) {
        throw new Error("MCP session transport is unavailable.");
      }
      await existingSession.transport.handleRequest(req, res, parsedBody);
      successful = true;
    } finally {
      request.finish(successful);
    }
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
    const requiredScope = normalizeAgentHarnessPublicToolScope(normalizeScope(options.scope));
    let record: McpSessionRecord | null = null;
    try {
      record = await options.sessions.reserve(options.authorizationPrincipal, requiredScope);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
          if (!record) {
            throw new Error("MCP session initialization record is unavailable.");
          }
          options.sessions.markInitialized(record, initializedSessionId);
        },
        onsessionclosed: async () => {
          if (record) {
            await options.sessions.dispose(record, "cleanClose");
          }
        },
      });
      transport.onclose = () => {
        if (record) {
          void options.sessions.dispose(record, "cleanClose").catch(() => undefined);
        }
      };
      const publishedContract = options.contractGeneration.contractForScope(requiredScope);
      const mcpServer = createAgentHarnessMcpServer(
        options.registry,
        publishedContract,
        options.operationalDiagnostics,
      );
      options.sessions.attachResources(record, mcpServer, transport);
      const request = options.sessions.beginRequest(record, res);
      let successful = false;
      try {
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, parsedBody);
        if (!record.sessionId || record.lifecycleState !== "active") {
          throw new Error("MCP session initialization did not establish active session state.");
        }
        successful = true;
      } finally {
        request.finish(successful);
      }
    } catch (error) {
      if (record) {
        await options.sessions.dispose(record, "initializationFailure");
      }
      if (error instanceof McpSessionCapacityError) {
        writeMcpCapacityUnavailable(res);
        return;
      }
      throw error;
    }
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

function isMcpInitializeBody(body: unknown): boolean {
  const messages = Array.isArray(body) ? body : [body];
  return messages.some((message) => isInitializeRequest(message));
}

function scopeSatisfies(presentedScope: string, requiredScope: string): boolean {
  const presented = new Set(normalizeScope(presentedScope).split(/\s+/).filter(Boolean));
  return normalizeScope(requiredScope).split(/\s+/).filter(Boolean).every((scope) => presented.has(scope));
}

function authenticate(req: IncomingMessage, options: AgentHarnessHttpRuntimeOptions): {
  scope: string;
  authorizationPrincipal: string;
} | null {
  if (options.allowUnauthenticatedLocal === true) {
    return {
      scope: "files.read files.write",
      authorizationPrincipal: "local-unauthenticated",
    };
  }
  const auth = req.headers.authorization;
  const match = typeof auth === "string" ? /^Bearer\s+(.+)$/i.exec(auth.trim()) : null;
  if (!match) {
    return null;
  }
  const token = validateAccessToken(options.userDataRoot, match[1]);
  return token ? {
    scope: normalizeScope(token.scope),
    authorizationPrincipal: token.clientId,
  } : null;
}

function resolveMcpSessionPolicy(
  overrides: Partial<AgentHarnessMcpSessionPolicy> | undefined,
): AgentHarnessMcpSessionPolicy {
  const policy = { ...DEFAULT_MCP_SESSION_POLICY, ...overrides };
  for (const [name, value] of Object.entries(policy)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`Agent Harness MCP session ${name} must be a positive integer.`);
    }
  }
  if (policy.perPrincipalCap > policy.globalCap) {
    throw new Error("Agent Harness MCP per-principal session cap cannot exceed the global cap.");
  }
  return policy;
}

function writeMcpCapacityUnavailable(res: ServerResponse): void {
  res.writeHead(503, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "retry-after": "1",
  });
  res.end(`${JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32003,
      message: "MCP session capacity is temporarily unavailable. Retry later.",
    },
  }, null, 2)}\n`);
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

function resolvePublicUrlModel(options: AgentHarnessHttpRuntimeOptions, port: number): {
  authorizationServerIssuer: string;
  oauthEndpoint: (pathname: `/oauth/${string}`) => string;
} {
  const authorizationServerIssuer = publicBaseUrl(options, port);
  const oauthOrigin = new URL(authorizationServerIssuer).origin;
  return {
    authorizationServerIssuer,
    oauthEndpoint: (pathname) => new URL(pathname, oauthOrigin).toString(),
  };
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
