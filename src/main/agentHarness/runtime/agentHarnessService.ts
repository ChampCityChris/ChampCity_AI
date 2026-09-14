import type {
  AgentHarnessRegisteredWorkspaceSummary,
  AgentHarnessMcpSessionDiagnostics,
  AgentHarnessToolContractDiagnostics,
  AgentHarnessToolContractSnapshot,
  AgentHarnessSettings,
  AgentHarnessSettingsInput,
  AgentHarnessWorkspaceRegistrySnapshot,
  LegacyOAuthClientImportResult,
  AgentHarnessStatus,
  AgentHarnessControlledRestartDisposition,
  AgentHarnessOperationalDiagnostics,
} from "../../../shared/workspaceContracts";
import type { AgentHarnessWorkerHeartbeat } from "./agentHarnessProcessProtocol";
import type { AgentHarnessToolDefinition } from "../tools/toolRegistry";
import { createAgentHarnessToolRegistry, type AgentHarnessToolRegistry } from "../tools/toolRegistry";
import { createRegisteredWorkspaceAccessProvider, type AgentHarnessWorkspaceAccessProvider } from "../workspace/workspaceAccess";
import { RegisteredWorkspaceRegistry } from "../workspace/registeredWorkspaceRegistry";
import {
  readAgentHarnessSettings,
  validateAgentHarnessSettingsInput,
  writeAgentHarnessSettings,
} from "./agentHarnessSettings";
import { startAgentHarnessHttpRuntime, type AgentHarnessHttpRuntimeHandle } from "./httpRuntime";
import { captureAgentHarnessPublicToolContract } from "./mcpServer";
import { importLegacyOAuthClientRegistry, readOAuthStoreDiagnostics } from "./oauthStore";

export type AgentHarnessRuntimeState = "stopped" | "starting" | "running" | "stopping" | "failed";

export interface AgentHarnessServiceOptions {
  userDataRoot: string;
  enabled?: boolean;
  host?: string;
  port?: number;
  publicBaseUrl?: string;
  allowUnauthenticatedLocal?: boolean;
  workerGeneration?: string;
  workerRestartCount?: number;
  lastWorkerRestartReason?: string | null;
}

export class AgentHarnessService {
  private readonly workspaceAccess: AgentHarnessWorkspaceAccessProvider;
  private readonly registry: AgentHarnessToolRegistry;
  private readonly workspaceRegistry: RegisteredWorkspaceRegistry;
  private readonly workspaceRegistryReady: Promise<void>;
  private readonly pendingRegistryOperations = new Set<Promise<unknown>>();
  private readonly userDataRoot: string;
  private configuration: AgentHarnessSettings;
  private handle: AgentHarnessHttpRuntimeHandle | null = null;
  private state: AgentHarnessRuntimeState = "stopped";
  private lastError: string | null = null;
  private recentActivity: string[] = [];
  private lastSessionDiagnostics: AgentHarnessMcpSessionDiagnostics = emptyMcpSessionDiagnostics();
  private registryContract: AgentHarnessToolContractSnapshot;
  private lastPublishedContractDiagnostics: AgentHarnessToolContractDiagnostics["published"] =
    emptyPublishedToolContractDiagnostics();
  private lastOperationalDiagnostics: AgentHarnessOperationalDiagnostics = emptyOperationalDiagnostics();
  private readonly workerGeneration: string | undefined;
  private readonly workerRestartCount: number | undefined;
  private readonly lastWorkerRestartReason: string | null | undefined;
  private powerEpoch = 0;

  constructor(options: AgentHarnessServiceOptions) {
    this.userDataRoot = options.userDataRoot;
    this.configuration = readAgentHarnessSettings(options.userDataRoot, serviceOptionsToSettingsInput(options));
    this.workerGeneration = options.workerGeneration;
    this.workerRestartCount = options.workerRestartCount;
    this.lastWorkerRestartReason = options.lastWorkerRestartReason;
    this.workspaceRegistry = new RegisteredWorkspaceRegistry({
      userDataRoot: options.userDataRoot,
    });
    this.workspaceRegistryReady = this.workspaceRegistry.initialize();
    this.workspaceAccess = createRegisteredWorkspaceAccessProvider({
      resolveWorkspaceContext: (workspaceId) => this.workspaceRegistry.resolve(workspaceId),
      listWorkspaceSummaries: () => this.workspaceRegistry.snapshot().workspaces,
    });
    this.registry = createAgentHarnessToolRegistry({
      workspaceAccess: this.workspaceAccess,
      userDataRoot: options.userDataRoot,
      runtimeDiagnostics: () => this.status() as unknown as Record<string, unknown>,
    });
    this.registryContract = captureAgentHarnessPublicToolContract(this.registry, "files.read files.write");
  }

  tools(): AgentHarnessToolDefinition[] {
    return this.registry.listTools("files.read files.write");
  }

  toolRegistry(): AgentHarnessToolRegistry {
    return this.registry;
  }

  async initialize(): Promise<AgentHarnessStatus> {
    await this.workspaceRegistryReady;
    return this.status();
  }

  async listRegisteredWorkspaces(): Promise<AgentHarnessWorkspaceRegistrySnapshot> {
    await this.workspaceRegistryReady;
    return this.workspaceRegistry.snapshot();
  }

  registerWorkspaceRoot(workspaceRoot: string): Promise<{
    workspace: AgentHarnessRegisteredWorkspaceSummary;
    registry: AgentHarnessWorkspaceRegistrySnapshot;
  }> {
    const operation = (async () => {
      await this.workspaceRegistryReady;
      const workspace = await this.workspaceRegistry.register(workspaceRoot);
      this.recordActivity(`Registered MCP workspace ${workspace.workspaceId}.`);
      return { workspace, registry: this.workspaceRegistry.snapshot() };
    })();
    this.trackRegistryOperation(operation);
    return operation;
  }

  async unregisterWorkspace(workspaceId: string): Promise<AgentHarnessWorkspaceRegistrySnapshot> {
    await this.workspaceRegistryReady;
    const registry = this.workspaceRegistry.unregister(workspaceId);
    this.recordActivity(`Unregistered MCP workspace ${workspaceId}.`);
    return registry;
  }

  async start(): Promise<AgentHarnessStatus> {
    await this.workspaceRegistryReady;
    await Promise.all([...this.pendingRegistryOperations]);
    if (!this.configuration.enabled) {
      this.recordActivity("Start skipped because Agent Harness startup is disabled.");
      return this.status();
    }
    if (this.handle) {
      return this.status();
    }
    this.state = "starting";
    this.lastError = null;
    this.recordActivity(`Starting Agent Harness on ${this.configuration.host}:${this.configuration.port || "auto"}.`);
    try {
      this.handle = await this.openRuntime(this.configuration);
      this.state = "running";
      this.recordActivity(`Agent Harness running at ${this.handle.url}.`);
    } catch (error) {
      this.state = "failed";
      this.lastError = error instanceof Error ? error.message : String(error);
      this.recordActivity(`Agent Harness startup failed: ${this.lastError}`);
    }
    return this.status();
  }

  async stop(): Promise<AgentHarnessStatus> {
    if (!this.handle) {
      this.state = "stopped";
      this.recordActivity("Stop requested while Agent Harness was already stopped.");
      return this.status();
    }
    this.state = "stopping";
    this.recordActivity("Stopping Agent Harness.");
    try {
      const closingHandle = this.handle;
      await closingHandle.close();
      this.lastSessionDiagnostics = closingHandle.sessionDiagnostics();
      this.registryContract = closingHandle.runtimeToolContract();
      this.lastPublishedContractDiagnostics = closingHandle.publishedToolContractDiagnostics();
      this.lastOperationalDiagnostics = mergeOperationalDiagnostics(
        this.lastOperationalDiagnostics,
        closingHandle.operationalDiagnostics(),
      );
      this.handle = null;
      this.state = "stopped";
      this.recordActivity("Agent Harness stopped.");
    } catch (error) {
      this.state = "failed";
      this.lastError = error instanceof Error ? error.message : String(error);
      this.recordActivity(`Agent Harness shutdown failed: ${this.lastError}`);
    }
    return this.status();
  }

  async restart(): Promise<AgentHarnessStatus> {
    this.recordActivity("Restart requested from ChampCity A/I Settings.");
    await this.stop();
    return this.start();
  }

  heartbeat(): AgentHarnessWorkerHeartbeat {
    const workspaceRegistry = this.workspaceRegistry.snapshot();
    return {
      workerProcessId: process.pid,
      runtimeReady: this.state === "running" && Boolean(this.handle),
      workspaceRegistryReady: workspaceRegistry.state === "ready",
      registeredWorkspaceCount: workspaceRegistry.workspaces.length,
      powerEpoch: this.powerEpoch,
      observedAt: new Date().toISOString(),
    };
  }

  prepareSuspend(powerEpoch: number): AgentHarnessWorkerHeartbeat {
    this.powerEpoch = Math.max(this.powerEpoch, powerEpoch);
    this.handle?.suspendAdmission();
    this.recordActivity("MCP admission paused for operating-system suspend.");
    return this.heartbeat();
  }

  async reconcileAfterResume(powerEpoch: number): Promise<AgentHarnessWorkerHeartbeat> {
    this.powerEpoch = Math.max(this.powerEpoch, powerEpoch);
    if (this.handle) {
      await this.handle.resumeAfterPowerEpoch();
    }
    this.recordActivity(`Disposed pre-resume MCP sessions for power epoch ${this.powerEpoch}.`);
    return this.heartbeat();
  }

  async prepareControlledRestart(drainDeadlineMs: number): Promise<AgentHarnessControlledRestartDisposition> {
    const requestedAt = new Date().toISOString();
    if (!this.handle) {
      return {
        outcome: "no-runtime",
        activeRequestsAtStart: 0,
        activeRequestsAtEnd: 0,
        requestedAt,
        completedAt: new Date().toISOString(),
      };
    }
    const result = await this.handle.drainForControlledRestart(drainDeadlineMs);
    this.recordActivity(
      result.outcome === "drained"
        ? "Active MCP requests drained for controlled Service Host restart."
        : "Controlled Service Host restart drain deadline was reached.",
    );
    return {
      ...result,
      requestedAt,
      completedAt: new Date().toISOString(),
    };
  }

  async saveConfiguration(input: AgentHarnessSettingsInput): Promise<AgentHarnessStatus> {
    const nextConfiguration = validateAgentHarnessSettingsInput(input, this.configuration);

    if (!nextConfiguration.enabled) {
      return this.saveDisabledConfiguration(nextConfiguration);
    }

    return this.saveEnabledConfiguration(nextConfiguration);
  }

  importLegacyOAuthClientRegistry(source: unknown): LegacyOAuthClientImportResult {
    const result = importLegacyOAuthClientRegistry(this.userDataRoot, source);
    this.recordActivity(`Imported legacy OAuth clients: ${result.importedCount} imported, ${result.alreadyPresentCount} already present.`);
    return { canceled: false, ...result };
  }

  status(): AgentHarnessStatus {
    const workspaceRegistry = this.workspaceRegistry.snapshot();
    const registryContract = this.handle?.runtimeToolContract() ?? this.registryContract;
    const publishedContract = this.handle?.publishedToolContractDiagnostics() ?? this.lastPublishedContractDiagnostics;
    const oauth = readOAuthStoreDiagnostics(this.userDataRoot);
    const localUnauthenticated = this.configuration.localAuthenticationMode === "local-unauthenticated";
    return {
      state: this.state,
      enabled: this.configuration.enabled,
      host: this.configuration.host,
      configuredPort: this.configuration.port,
      port: this.handle?.port ?? null,
      healthEndpoint: this.handle?.healthUrl ?? null,
      readinessEndpoint: this.handle?.readinessUrl ?? null,
      mcpEndpoint: this.handle?.url ?? null,
      publicBaseUrl: this.configuration.publicBaseUrl,
      publicBaseUrlConfigured: Boolean(this.configuration.publicBaseUrl),
      oauthConfigured: !localUnauthenticated,
      localAuthenticationMode: localUnauthenticated ? "local-unauthenticated" : "oauth-required",
      filesReadTransportAuthorized: localUnauthenticated || oauth.activeFilesReadAuthorizationCount > 0,
      filesWriteTransportAuthorized: localUnauthenticated || oauth.activeFilesWriteAuthorizationCount > 0,
      registeredClientCount: oauth.clientCount,
      activeOAuthTokenCount: oauth.activeTokenCount,
      activeFilesReadAuthorizationCount: oauth.activeFilesReadAuthorizationCount,
      activeFilesWriteAuthorizationCount: oauth.activeFilesWriteAuthorizationCount,
      publicToolCount: registryContract.toolCount,
      publicToolNames: registryContract.tools.map((tool) => tool.name),
      toolContractDiagnostics: {
        registry: registryContract,
        published: publishedContract,
      },
      operationalDiagnostics: this.handle
        ? mergeOperationalDiagnostics(this.lastOperationalDiagnostics, this.handle.operationalDiagnostics())
        : this.lastOperationalDiagnostics,
      workspaceRegistryState: workspaceRegistry.state,
      workspaceRegistryError: workspaceRegistry.error,
      registeredWorkspaceCount: workspaceRegistry.workspaces.length,
      registeredWorkspaceIds: workspaceRegistry.workspaces.map((workspace) => workspace.workspaceId),
      activeWorkspaceId: null,
      expectedWorkspaceId: null,
      selectedProjectRootSummary: null,
      routingState: "unavailable",
      lastError: this.lastError,
      recentActivity: [...this.recentActivity],
    };
  }

  private recordActivity(message: string): void {
    this.recentActivity = [
      `${new Date().toISOString()} ${message}`,
      ...this.recentActivity,
    ].slice(0, 8);
  }

  private trackRegistryOperation(operation: Promise<unknown>): void {
    this.pendingRegistryOperations.add(operation);
    void operation.then(
      () => this.pendingRegistryOperations.delete(operation),
      () => this.pendingRegistryOperations.delete(operation),
    );
  }

  private async saveDisabledConfiguration(nextConfiguration: AgentHarnessSettings): Promise<AgentHarnessStatus> {
    if (this.handle) {
      await this.stopRuntimeForConfigurationApply();
    } else {
      this.state = "stopped";
    }
    writeAgentHarnessSettings(this.userDataRoot, nextConfiguration);
    this.configuration = nextConfiguration;
    this.lastError = null;
    this.recordActivity("Agent Harness settings saved.");
    return this.status();
  }

  private async saveEnabledConfiguration(nextConfiguration: AgentHarnessSettings): Promise<AgentHarnessStatus> {
    const previousConfiguration = this.configuration;
    const previousState = this.state;
    const hadRunningRuntime = Boolean(this.handle);
    if (hadRunningRuntime) {
      this.recordActivity("Applying Agent Harness settings through last-known-good restart transaction.");
    }

    try {
      if (this.handle) {
        await this.stopRuntimeForConfigurationApply();
      }
      this.configuration = nextConfiguration;
      this.state = "starting";
      this.lastError = null;
      this.recordActivity(`Starting Agent Harness on ${nextConfiguration.host}:${nextConfiguration.port || "auto"}.`);
      this.handle = await this.openRuntime(nextConfiguration);
      this.state = "running";
      writeAgentHarnessSettings(this.userDataRoot, nextConfiguration);
      this.recordActivity("Agent Harness settings saved.");
      this.recordActivity(`Agent Harness running at ${this.handle.url}.`);
      return this.status();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.configuration = previousConfiguration;
      this.lastError = `Rejected Agent Harness settings: ${message}`;
      this.recordActivity(this.lastError);
      if (!this.handle && hadRunningRuntime && previousConfiguration.enabled) {
        await this.recoverPreviousRuntime(previousConfiguration);
      } else if (!this.handle) {
        this.state = previousState;
      }
      throw new Error(this.lastError);
    }
  }

  private async stopRuntimeForConfigurationApply(): Promise<void> {
    if (!this.handle) {
      this.state = "stopped";
      return;
    }
    this.state = "stopping";
    this.recordActivity("Stopping Agent Harness.");
    try {
      const closingHandle = this.handle;
      await closingHandle.close();
      this.lastSessionDiagnostics = closingHandle.sessionDiagnostics();
      this.registryContract = closingHandle.runtimeToolContract();
      this.lastPublishedContractDiagnostics = closingHandle.publishedToolContractDiagnostics();
      this.lastOperationalDiagnostics = mergeOperationalDiagnostics(
        this.lastOperationalDiagnostics,
        closingHandle.operationalDiagnostics(),
      );
      this.handle = null;
      this.state = "stopped";
      this.recordActivity("Agent Harness stopped.");
    } catch (error) {
      this.state = "failed";
      this.lastError = error instanceof Error ? error.message : String(error);
      this.recordActivity(`Agent Harness shutdown failed: ${this.lastError}`);
      throw error;
    }
  }

  private async recoverPreviousRuntime(previousConfiguration: AgentHarnessSettings): Promise<void> {
    this.state = "starting";
    this.recordActivity("Recovering previous Agent Harness runtime after rejected settings.");
    try {
      this.handle = await this.openRuntime(previousConfiguration);
      this.state = "running";
      this.recordActivity(`Agent Harness running at ${this.handle.url}.`);
    } catch (error) {
      const recoveryMessage = error instanceof Error ? error.message : String(error);
      this.state = "failed";
      this.lastError = `Rejected Agent Harness settings and failed to recover previous runtime: ${recoveryMessage}`;
      this.recordActivity(this.lastError);
    }
  }

  private openRuntime(configuration: AgentHarnessSettings): Promise<AgentHarnessHttpRuntimeHandle> {
    return startAgentHarnessHttpRuntime({
      host: configuration.host,
      port: configuration.port,
      publicBaseUrl: configuration.publicBaseUrl ?? undefined,
      userDataRoot: this.userDataRoot,
      registry: this.registry,
      allowUnauthenticatedLocal: configuration.localAuthenticationMode === "local-unauthenticated",
      operationalDiagnosticsOptions: {
        workerGeneration: this.workerGeneration,
        workerRestartCount: this.workerRestartCount,
        lastWorkerRestartReason: this.lastWorkerRestartReason,
      },
    });
  }
}

function emptyMcpSessionDiagnostics(): AgentHarnessMcpSessionDiagnostics {
  return {
    retainedSessionCount: 0,
    busySessionCount: 0,
    idleSessionCount: 0,
    streamingSessionCount: 0,
    inFlightSessionCount: 0,
    currentInFlightRequestCount: 0,
    liveStreamCount: 0,
    totalCreated: 0,
    totalDisposed: {
      cleanClose: 0,
      idleTtl: 0,
      capEviction: 0,
      runtimeClose: 0,
      resumeReset: 0,
      initializationFailure: 0,
    },
    rejectedInitializationCount: 0,
    reaperTimerCount: 0,
    reaperRunCount: 0,
    lastSuccessfulReaperAt: null,
    limits: {
      globalCap: 32,
      perPrincipalCap: 8,
      idleTtlMs: 5 * 60 * 1_000,
    },
  };
}

function emptyOperationalDiagnostics(): AgentHarnessOperationalDiagnostics {
  return {
    schemaVersion: 1,
    workerGeneration: "unavailable",
    capturedAt: new Date(0).toISOString(),
    readiness: { state: "degraded", reasonCode: "runtime-not-running" },
    sessions: emptyMcpSessionDiagnostics(),
    requests: {
      currentInFlight: 0,
      totalBegun: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalCancelled: 0,
      totalTimedOut: 0,
      latencyMs: {
        sampleCount: 0,
        p50: 0,
        p95: 0,
        maximum: 0,
        histogram: [],
      },
    },
    toolContract: {
      currentGeneration: "unavailable",
      captureCount: 0,
      publicationGenerationCount: 0,
      periodicRecaptureTimerCount: 0,
    },
    eventLoopLagMs: { p95: 0, maximum: 0 },
    lifecycle: {
      lastSuspendAt: null,
      lastResumeAt: null,
      lastRecoveryStartedAt: null,
      lastReadyAt: null,
      workerRestartCount: 0,
      lastWorkerRestartReason: null,
    },
    repositoryIncompleteByReason: {},
    recentRequests: [],
    limits: { recentRequestCapacity: 100, latencySampleCapacity: 512 },
  };
}

function mergeOperationalDiagnostics(
  previous: AgentHarnessOperationalDiagnostics,
  current: AgentHarnessOperationalDiagnostics,
): AgentHarnessOperationalDiagnostics {
  if (previous.workerGeneration === "unavailable" || previous.workerGeneration !== current.workerGeneration) {
    return current;
  }
  const recentRequests = [...previous.recentRequests, ...current.recentRequests]
    .slice(-current.limits.recentRequestCapacity)
    .map((entry) => ({ ...entry }));
  const recentDurations = recentRequests
    .map((entry) => entry.durationMs)
    .filter((duration): duration is number => duration !== null)
    .sort((left, right) => left - right);
  return {
    ...current,
    sessions: {
      ...current.sessions,
      totalCreated: previous.sessions.totalCreated + current.sessions.totalCreated,
      totalDisposed: {
        cleanClose: previous.sessions.totalDisposed.cleanClose + current.sessions.totalDisposed.cleanClose,
        idleTtl: previous.sessions.totalDisposed.idleTtl + current.sessions.totalDisposed.idleTtl,
        capEviction: previous.sessions.totalDisposed.capEviction + current.sessions.totalDisposed.capEviction,
        runtimeClose: previous.sessions.totalDisposed.runtimeClose + current.sessions.totalDisposed.runtimeClose,
        resumeReset: previous.sessions.totalDisposed.resumeReset + current.sessions.totalDisposed.resumeReset,
        initializationFailure: previous.sessions.totalDisposed.initializationFailure + current.sessions.totalDisposed.initializationFailure,
      },
      rejectedInitializationCount:
        previous.sessions.rejectedInitializationCount + current.sessions.rejectedInitializationCount,
      reaperRunCount: previous.sessions.reaperRunCount + current.sessions.reaperRunCount,
      lastSuccessfulReaperAt:
        current.sessions.lastSuccessfulReaperAt ?? previous.sessions.lastSuccessfulReaperAt,
    },
    requests: {
      ...current.requests,
      totalBegun: previous.requests.totalBegun + current.requests.totalBegun,
      totalCompleted: previous.requests.totalCompleted + current.requests.totalCompleted,
      totalFailed: previous.requests.totalFailed + current.requests.totalFailed,
      totalCancelled: previous.requests.totalCancelled + current.requests.totalCancelled,
      totalTimedOut: previous.requests.totalTimedOut + current.requests.totalTimedOut,
      latencyMs: {
        sampleCount: recentDurations.length,
        p50: recentPercentile(recentDurations, 50),
        p95: recentPercentile(recentDurations, 95),
        maximum: recentDurations.at(-1) ?? 0,
        histogram: recentLatencyHistogram(recentDurations),
      },
    },
    toolContract: {
      ...current.toolContract,
      captureCount: previous.toolContract.captureCount + current.toolContract.captureCount,
      publicationGenerationCount:
        previous.toolContract.publicationGenerationCount + current.toolContract.publicationGenerationCount,
    },
    lifecycle: {
      ...current.lifecycle,
      lastSuspendAt: current.lifecycle.lastSuspendAt ?? previous.lifecycle.lastSuspendAt,
      lastResumeAt: current.lifecycle.lastResumeAt ?? previous.lifecycle.lastResumeAt,
      lastRecoveryStartedAt:
        current.lifecycle.lastRecoveryStartedAt ?? previous.lifecycle.lastRecoveryStartedAt,
      lastReadyAt: current.lifecycle.lastReadyAt ?? previous.lifecycle.lastReadyAt,
    },
    repositoryIncompleteByReason: mergeCounters(
      previous.repositoryIncompleteByReason,
      current.repositoryIncompleteByReason,
    ),
    recentRequests,
  };
}

function mergeCounters(previous: Record<string, number>, current: Record<string, number>): Record<string, number> {
  const merged = { ...previous };
  for (const [reason, count] of Object.entries(current)) {
    merged[reason] = (merged[reason] ?? 0) + count;
  }
  return merged;
}

function recentPercentile(sorted: number[], requestedPercentile: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  return sorted[Math.max(0, Math.ceil((requestedPercentile / 100) * sorted.length) - 1)] ?? 0;
}

function recentLatencyHistogram(sorted: number[]): Array<{ upperBoundMs: number | null; count: number }> {
  const bounds = [10, 50, 100, 250, 500, 1_000, 3_000, 10_000];
  return [
    ...bounds.map((upperBoundMs) => ({
      upperBoundMs,
      count: sorted.filter((sample) => sample <= upperBoundMs).length,
    })),
    { upperBoundMs: null, count: sorted.length },
  ];
}

function emptyPublishedToolContractDiagnostics(): AgentHarnessToolContractDiagnostics["published"] {
  return {
    state: "none",
    runtimeGeneration: null,
    capturedScopeCount: 0,
    contractCaptureCount: 0,
    explicitGenerationChangeCount: 0,
    lastControlledPublicationAt: null,
    periodicContractTimerCount: 0,
    activeSessionCount: 0,
    staleSessionCount: 0,
    contracts: [],
    sessionLifecycle: emptyMcpSessionDiagnostics(),
  };
}

function serviceOptionsToSettingsInput(options: AgentHarnessServiceOptions): AgentHarnessSettingsInput {
  return {
    ...(options.enabled !== undefined ? { enabled: options.enabled } : {}),
    ...(options.host !== undefined ? { host: options.host } : {}),
    ...(options.port !== undefined ? { port: options.port } : {}),
    ...(options.publicBaseUrl !== undefined ? { publicBaseUrl: options.publicBaseUrl } : {}),
    ...(options.allowUnauthenticatedLocal !== undefined
      ? {
          localAuthenticationMode: options.allowUnauthenticatedLocal
            ? "local-unauthenticated"
            : "oauth-required",
        }
      : {}),
  };
}
