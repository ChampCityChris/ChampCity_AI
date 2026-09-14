import type {
  AgentHarnessSettingsInput,
  AgentHarnessStatus,
  AgentHarnessWorkspaceRegistrySnapshot,
  AgentHarnessRegisteredWorkspaceSummary,
  LegacyOAuthClientImportResult,
  AgentHarnessControlledRestartDisposition,
} from "../../../shared/workspaceContracts";

export const agentHarnessProcessProtocolVersion = 1 as const;

export type AgentHarnessControlOperation =
  | "initialize"
  | "status"
  | "start"
  | "stop"
  | "restart"
  | "heartbeat"
  | "prepare-suspend"
  | "resume-reconcile"
  | "prepare-controlled-restart"
  | "save-configuration"
  | "import-legacy-oauth-clients"
  | "list-registered-workspaces"
  | "register-workspace"
  | "unregister-workspace"
  | "shutdown";

export interface AgentHarnessWorkerEnvironmentOverrides {
  enabled?: boolean;
  host?: string;
  port?: number;
  publicBaseUrl?: string;
  allowUnauthenticatedLocal?: boolean;
}

export interface AgentHarnessWorkerInitialization {
  userDataRoot: string;
  environmentOverrides: AgentHarnessWorkerEnvironmentOverrides;
  workerGeneration: string;
  workerRestartCount: number;
  lastWorkerRestartReason: string | null;
}

export interface AgentHarnessWorkspaceRegistrationControlResult {
  workspace: AgentHarnessRegisteredWorkspaceSummary;
  registry: AgentHarnessWorkspaceRegistrySnapshot;
}

export interface AgentHarnessWorkerHeartbeat {
  workerProcessId: number;
  runtimeReady: boolean;
  workspaceRegistryReady: boolean;
  registeredWorkspaceCount: number;
  powerEpoch: number;
  observedAt: string;
}

export interface AgentHarnessControlRequestPayloads {
  initialize: AgentHarnessWorkerInitialization;
  status: null;
  start: null;
  stop: null;
  restart: null;
  heartbeat: null;
  "prepare-suspend": { powerEpoch: number };
  "resume-reconcile": { powerEpoch: number };
  "prepare-controlled-restart": { drainDeadlineMs: number };
  "save-configuration": AgentHarnessSettingsInput;
  "import-legacy-oauth-clients": { source: unknown };
  "list-registered-workspaces": null;
  "register-workspace": { workspaceRoot: string };
  "unregister-workspace": { workspaceId: string };
  shutdown: null;
}

export interface AgentHarnessControlResponsePayloads {
  initialize: AgentHarnessStatus;
  status: AgentHarnessStatus;
  start: AgentHarnessStatus;
  stop: AgentHarnessStatus;
  restart: AgentHarnessStatus;
  heartbeat: AgentHarnessWorkerHeartbeat;
  "prepare-suspend": AgentHarnessWorkerHeartbeat;
  "resume-reconcile": AgentHarnessWorkerHeartbeat;
  "prepare-controlled-restart": AgentHarnessControlledRestartDisposition;
  "save-configuration": AgentHarnessStatus;
  "import-legacy-oauth-clients": LegacyOAuthClientImportResult;
  "list-registered-workspaces": AgentHarnessWorkspaceRegistrySnapshot;
  "register-workspace": AgentHarnessWorkspaceRegistrationControlResult;
  "unregister-workspace": AgentHarnessWorkspaceRegistrySnapshot;
  shutdown: AgentHarnessStatus;
}

export type AgentHarnessControlRequest = {
  [Operation in AgentHarnessControlOperation]: {
    protocolVersion: typeof agentHarnessProcessProtocolVersion;
    kind: "request";
    requestId: string;
    operation: Operation;
    payload: AgentHarnessControlRequestPayloads[Operation];
  };
}[AgentHarnessControlOperation];

export interface AgentHarnessControlError {
  code: string;
  message: string;
}

type AgentHarnessControlSuccessResponse = {
  [Operation in AgentHarnessControlOperation]: {
    protocolVersion: typeof agentHarnessProcessProtocolVersion;
    kind: "response";
    requestId: string;
    operation: Operation;
    ok: true;
    workerProcessId: number;
    result: AgentHarnessControlResponsePayloads[Operation];
  };
}[AgentHarnessControlOperation];

interface AgentHarnessControlFailureResponse {
  protocolVersion: typeof agentHarnessProcessProtocolVersion;
  kind: "response";
  requestId: string;
  operation: AgentHarnessControlOperation;
  ok: false;
  workerProcessId: number;
  error: AgentHarnessControlError;
}

export type AgentHarnessControlResponse =
  | AgentHarnessControlSuccessResponse
  | AgentHarnessControlFailureResponse;

const controlOperations = new Set<AgentHarnessControlOperation>([
  "initialize",
  "status",
  "start",
  "stop",
  "restart",
  "heartbeat",
  "prepare-suspend",
  "resume-reconcile",
  "prepare-controlled-restart",
  "save-configuration",
  "import-legacy-oauth-clients",
  "list-registered-workspaces",
  "register-workspace",
  "unregister-workspace",
  "shutdown",
]);

export function isAgentHarnessControlRequest(value: unknown): value is AgentHarnessControlRequest {
  if (!isRecord(value)) {
    return false;
  }
  return value.protocolVersion === agentHarnessProcessProtocolVersion &&
    value.kind === "request" &&
    typeof value.requestId === "string" &&
    value.requestId.length > 0 &&
    isAgentHarnessControlOperation(value.operation) &&
    Object.prototype.hasOwnProperty.call(value, "payload");
}

export function isAgentHarnessControlResponse(value: unknown): value is AgentHarnessControlResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (
    value.protocolVersion !== agentHarnessProcessProtocolVersion ||
    value.kind !== "response" ||
    typeof value.requestId !== "string" ||
    value.requestId.length === 0 ||
    !isAgentHarnessControlOperation(value.operation) ||
    !Number.isInteger(value.workerProcessId) ||
    (value.workerProcessId as number) <= 0 ||
    typeof value.ok !== "boolean"
  ) {
    return false;
  }
  if (value.ok) {
    return Object.prototype.hasOwnProperty.call(value, "result");
  }
  return isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string";
}

function isAgentHarnessControlOperation(value: unknown): value is AgentHarnessControlOperation {
  return typeof value === "string" && controlOperations.has(value as AgentHarnessControlOperation);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isAgentHarnessStatus(value: unknown): value is AgentHarnessStatus {
  if (!isRecord(value)) {
    return false;
  }
  return ["stopped", "starting", "running", "stopping", "failed"].includes(String(value.state)) &&
    typeof value.enabled === "boolean" &&
    typeof value.host === "string" &&
    Number.isInteger(value.configuredPort) &&
    isNullableInteger(value.port) &&
    isNullableString(value.healthEndpoint) &&
    isNullableString(value.readinessEndpoint) &&
    isNullableString(value.mcpEndpoint) &&
    isNullableString(value.publicBaseUrl) &&
    typeof value.publicBaseUrlConfigured === "boolean" &&
    typeof value.oauthConfigured === "boolean" &&
    ["local-unauthenticated", "oauth-required"].includes(String(value.localAuthenticationMode)) &&
    typeof value.filesReadTransportAuthorized === "boolean" &&
    typeof value.filesWriteTransportAuthorized === "boolean" &&
    Number.isInteger(value.registeredClientCount) &&
    Number.isInteger(value.activeOAuthTokenCount) &&
    Number.isInteger(value.activeFilesReadAuthorizationCount) &&
    Number.isInteger(value.activeFilesWriteAuthorizationCount) &&
    Number.isInteger(value.publicToolCount) &&
    isStringArray(value.publicToolNames) &&
    isAgentHarnessToolContractDiagnostics(value.toolContractDiagnostics) &&
    isAgentHarnessOperationalDiagnostics(value.operationalDiagnostics) &&
    ["ready", "failed"].includes(String(value.workspaceRegistryState)) &&
    isNullableString(value.workspaceRegistryError) &&
    Number.isInteger(value.registeredWorkspaceCount) &&
    isStringArray(value.registeredWorkspaceIds) &&
    isNullableString(value.activeWorkspaceId) &&
    isNullableString(value.expectedWorkspaceId) &&
    isNullableString(value.selectedProjectRootSummary) &&
    ["matched", "mismatched", "unavailable"].includes(String(value.routingState)) &&
    isNullableString(value.lastError) &&
    isStringArray(value.recentActivity);
}

function isAgentHarnessOperationalDiagnostics(value: unknown): boolean {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.workerGeneration !== "string" ||
    typeof value.capturedAt !== "string" || !isRecord(value.readiness) || !isRecord(value.requests) ||
    !isRecord(value.requests.latencyMs) ||
    !isRecord(value.toolContract) || !isRecord(value.eventLoopLagMs) || !isRecord(value.lifecycle) ||
    !isRecord(value.repositoryIncompleteByReason) || !isRecord(value.limits) ||
    !Array.isArray(value.recentRequests)) {
    return false;
  }
  return ["ready", "degraded"].includes(String(value.readiness.state)) &&
    typeof value.readiness.reasonCode === "string" &&
    isMcpSessionDiagnostics(value.sessions) &&
    [
      value.requests.currentInFlight,
      value.requests.totalBegun,
      value.requests.totalCompleted,
      value.requests.totalFailed,
      value.requests.totalCancelled,
      value.requests.totalTimedOut,
      value.requests.latencyMs.sampleCount,
      value.toolContract.captureCount,
      value.toolContract.publicationGenerationCount,
      value.toolContract.periodicRecaptureTimerCount,
      value.lifecycle.workerRestartCount,
      value.limits.recentRequestCapacity,
      value.limits.latencySampleCapacity,
    ].every(isNonNegativeInteger) &&
    [value.requests.latencyMs.p50, value.requests.latencyMs.p95, value.requests.latencyMs.maximum,
      value.eventLoopLagMs.p95, value.eventLoopLagMs.maximum]
      .every((entry) => typeof entry === "number" && Number.isFinite(entry) && entry >= 0) &&
    Array.isArray(value.requests.latencyMs.histogram) &&
    value.requests.latencyMs.histogram.every((entry) => isRecord(entry) &&
      (entry.upperBoundMs === null || (typeof entry.upperBoundMs === "number" && entry.upperBoundMs >= 0)) &&
      isNonNegativeInteger(entry.count)) &&
    typeof value.toolContract.currentGeneration === "string" &&
    isNullableString(value.lifecycle.lastSuspendAt) &&
    isNullableString(value.lifecycle.lastResumeAt) &&
    isNullableString(value.lifecycle.lastRecoveryStartedAt) &&
    isNullableString(value.lifecycle.lastReadyAt) &&
    isNullableString(value.lifecycle.lastWorkerRestartReason) &&
    value.recentRequests.length <= Number(value.limits.recentRequestCapacity) &&
    Object.values(value.repositoryIncompleteByReason).every(isNonNegativeInteger) &&
    value.recentRequests.every((entry) => isRecord(entry) &&
      typeof entry.attemptId === "string" &&
      typeof entry.toolbox === "string" &&
      typeof entry.action === "string" &&
      isNullableString(entry.workspaceId) &&
      typeof entry.startedAt === "string" &&
      isNullableString(entry.completedAt) &&
      (entry.durationMs === null || (typeof entry.durationMs === "number" && entry.durationMs >= 0)) &&
      ["in-flight", "completed", "failed", "cancelled", "timed-out"].includes(String(entry.outcome)) &&
      isNullableString(entry.reasonCode));
}

export function isAgentHarnessWorkspaceRegistrySnapshot(
  value: unknown,
): value is AgentHarnessWorkspaceRegistrySnapshot {
  return isRecord(value) &&
    value.schemaVersion === 1 &&
    ["ready", "failed"].includes(String(value.state)) &&
    isNullableString(value.error) &&
    Array.isArray(value.workspaces) &&
    value.workspaces.every((workspace) => isRecord(workspace) &&
      typeof workspace.workspaceId === "string" &&
      typeof workspace.repositoryName === "string" &&
      typeof workspace.gitBacked === "boolean" &&
      ["available", "unavailable"].includes(String(workspace.availability)) &&
      isNullableString(workspace.validationError));
}

export function isAgentHarnessWorkspaceRegistrationControlResult(
  value: unknown,
): value is AgentHarnessWorkspaceRegistrationControlResult {
  if (!isRecord(value) ||
    !isAgentHarnessWorkspaceRegistrySnapshot(value.registry) ||
    !isRecord(value.workspace) ||
    typeof value.workspace.workspaceId !== "string") {
    return false;
  }
  const workspaceId = value.workspace.workspaceId;
  return value.registry.workspaces.some((workspace) => workspace.workspaceId === workspaceId);
}

function isAgentHarnessToolContractDiagnostics(value: unknown): boolean {
  if (!isRecord(value) || !isToolContractSnapshot(value.registry, false) || !isRecord(value.published)) {
    return false;
  }
  return ["none", "all-current", "stale"].includes(String(value.published.state)) &&
    isNullableString(value.published.runtimeGeneration) &&
    Number.isInteger(value.published.capturedScopeCount) &&
    Number.isInteger(value.published.contractCaptureCount) &&
    Number.isInteger(value.published.explicitGenerationChangeCount) &&
    isNullableString(value.published.lastControlledPublicationAt) &&
    Number.isInteger(value.published.periodicContractTimerCount) &&
    Number.isInteger(value.published.activeSessionCount) &&
    Number.isInteger(value.published.staleSessionCount) &&
    Array.isArray(value.published.contracts) &&
    value.published.contracts.every((contract) => isToolContractSnapshot(contract, true)) &&
    isMcpSessionDiagnostics(value.published.sessionLifecycle);
}

function isMcpSessionDiagnostics(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.totalDisposed) || !isRecord(value.limits)) {
    return false;
  }
  return [
    value.retainedSessionCount,
    value.busySessionCount,
    value.idleSessionCount,
    value.streamingSessionCount,
    value.inFlightSessionCount,
    value.currentInFlightRequestCount,
    value.liveStreamCount,
    value.totalCreated,
    value.rejectedInitializationCount,
    value.reaperTimerCount,
    value.reaperRunCount,
    value.totalDisposed.cleanClose,
    value.totalDisposed.idleTtl,
    value.totalDisposed.capEviction,
    value.totalDisposed.runtimeClose,
    value.totalDisposed.resumeReset,
    value.totalDisposed.initializationFailure,
    value.limits.globalCap,
    value.limits.perPrincipalCap,
    value.limits.idleTtlMs,
  ].every(isNonNegativeInteger) && isNullableString(value.lastSuccessfulReaperAt);
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isToolContractSnapshot(value: unknown, published: boolean): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const validBase = typeof value.scope === "string" &&
    typeof value.fingerprint === "string" &&
    Number.isInteger(value.toolCount) &&
    Array.isArray(value.tools) &&
    value.tools.every((tool) => isRecord(tool) && typeof tool.name === "string" && isStringArray(tool.actions));
  return validBase && (!published || (typeof value.current === "boolean" && Number.isInteger(value.sessionCount)));
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isNullableInteger(value: unknown): boolean {
  return value === null || Number.isInteger(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
