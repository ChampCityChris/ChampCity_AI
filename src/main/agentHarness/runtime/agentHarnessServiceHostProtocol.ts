import type {
  AgentHarnessSettingsInput,
  AgentHarnessStatus,
  AgentHarnessWorkspaceRegistrySnapshot,
  AgentHarnessRegisteredWorkspaceSummary,
  LegacyOAuthClientImportResult,
  AgentHarnessControlledRestartDisposition,
  AgentHarnessServiceLifecycleState,
  AgentHarnessServiceRecoveryReason,
} from "../../../shared/workspaceContracts";
import {
  agentHarnessServiceHostControlProtocolVersion,
  type AgentHarnessServiceHostDescriptor,
} from "./agentHarnessServiceHostDescriptor";

export { agentHarnessServiceHostControlProtocolVersion } from "./agentHarnessServiceHostDescriptor";

export type AgentHarnessServiceHostOperation =
  | "handshake"
  | "reconcile-descriptor"
  | "agent-harness-status"
  | "agent-harness-start"
  | "agent-harness-stop"
  | "agent-harness-restart"
  | "agent-harness-save-configuration"
  | "agent-harness-import-legacy-oauth-clients"
  | "list-registered-workspaces"
  | "register-workspace"
  | "unregister-workspace"
  | "service-host-shutdown"
  | "background-agent-user-exit"
  | "service-host-controlled-restart";

export interface AgentHarnessServiceHostIdentity {
  descriptorSchemaVersion: AgentHarnessServiceHostDescriptor["schemaVersion"];
  controlProtocolVersion: typeof agentHarnessServiceHostControlProtocolVersion;
  serviceHostProcessId: number;
  workerProcessId: number | null;
  instanceId: string;
  runtimeBuildIdentity: string;
  lifecycleState: AgentHarnessServiceLifecycleState;
  lifecycleReason: AgentHarnessServiceRecoveryReason | null;
  lifecycleStateChangedAt: string;
  powerEpoch: number;
  consecutiveHeartbeatMisses: number;
  workerRecoveryState: "idle" | "recovering" | "circuit-open";
  workerRecoveryError: string | null;
  lastControlledRestart: AgentHarnessControlledRestartDisposition | null;
  lastSuspendAt: string | null;
  lastResumeAt: string | null;
  lastRecoveryStartedAt: string | null;
  lastReadyAt: string | null;
  workerRestartCount: number;
  lastWorkerRestartReason: string | null;
  trayPresent: boolean;
}

export interface AgentHarnessServiceHostRequestPayloads {
  handshake: null;
  "reconcile-descriptor": null;
  "agent-harness-status": null;
  "agent-harness-start": null;
  "agent-harness-stop": null;
  "agent-harness-restart": null;
  "agent-harness-save-configuration": AgentHarnessSettingsInput;
  "agent-harness-import-legacy-oauth-clients": { source: unknown };
  "list-registered-workspaces": null;
  "register-workspace": { workspaceRoot: string };
  "unregister-workspace": { workspaceId: string };
  "service-host-shutdown": null;
  "background-agent-user-exit": null;
  "service-host-controlled-restart": { expectedBuildIdentity: string };
}

export interface AgentHarnessServiceHostResponsePayloads {
  handshake: AgentHarnessServiceHostIdentity;
  "reconcile-descriptor": AgentHarnessServiceHostIdentity;
  "agent-harness-status": AgentHarnessStatus;
  "agent-harness-start": AgentHarnessStatus;
  "agent-harness-stop": AgentHarnessStatus;
  "agent-harness-restart": AgentHarnessStatus;
  "agent-harness-save-configuration": AgentHarnessStatus;
  "agent-harness-import-legacy-oauth-clients": LegacyOAuthClientImportResult;
  "list-registered-workspaces": AgentHarnessWorkspaceRegistrySnapshot;
  "register-workspace": {
    workspace: AgentHarnessRegisteredWorkspaceSummary;
    registry: AgentHarnessWorkspaceRegistrySnapshot;
  };
  "unregister-workspace": AgentHarnessWorkspaceRegistrySnapshot;
  "service-host-shutdown": null;
  "background-agent-user-exit": null;
  "service-host-controlled-restart": AgentHarnessControlledRestartDisposition;
}

export type AgentHarnessServiceHostRequest = {
  [Operation in AgentHarnessServiceHostOperation]: {
    protocolVersion: typeof agentHarnessServiceHostControlProtocolVersion;
    kind: "request";
    requestId: string;
    expectedInstanceId: Operation extends "handshake" ? string | null : string;
    operation: Operation;
    payload: AgentHarnessServiceHostRequestPayloads[Operation];
  };
}[AgentHarnessServiceHostOperation];

type AgentHarnessServiceHostSuccessResponse = {
  [Operation in AgentHarnessServiceHostOperation]: {
    protocolVersion: typeof agentHarnessServiceHostControlProtocolVersion;
    kind: "response";
    requestId: string;
    operation: Operation;
    ok: true;
    serviceHostProcessId: number;
    workerProcessId: number | null;
    instanceId: string;
    result: AgentHarnessServiceHostResponsePayloads[Operation];
  };
}[AgentHarnessServiceHostOperation];

export interface AgentHarnessServiceHostFailureResponse {
  protocolVersion: typeof agentHarnessServiceHostControlProtocolVersion;
  kind: "response";
  requestId: string;
  operation: AgentHarnessServiceHostOperation;
  ok: false;
  serviceHostProcessId: number;
  workerProcessId: number | null;
  instanceId: string;
  error: { code: string; message: string };
}

export type AgentHarnessServiceHostResponse =
  | AgentHarnessServiceHostSuccessResponse
  | AgentHarnessServiceHostFailureResponse;

const serviceHostOperations = new Set<AgentHarnessServiceHostOperation>([
  "handshake",
  "reconcile-descriptor",
  "agent-harness-status",
  "agent-harness-start",
  "agent-harness-stop",
  "agent-harness-restart",
  "agent-harness-save-configuration",
  "agent-harness-import-legacy-oauth-clients",
  "list-registered-workspaces",
  "register-workspace",
  "unregister-workspace",
  "service-host-shutdown",
  "background-agent-user-exit",
  "service-host-controlled-restart",
]);

export function isAgentHarnessServiceHostRequest(value: unknown): value is AgentHarnessServiceHostRequest {
  return isRecord(value) &&
    value.protocolVersion === agentHarnessServiceHostControlProtocolVersion &&
    value.kind === "request" &&
    typeof value.requestId === "string" &&
    value.requestId.length > 0 &&
    isAgentHarnessServiceHostOperation(value.operation) &&
    ((value.operation === "handshake" &&
      (value.expectedInstanceId === null || (typeof value.expectedInstanceId === "string" && value.expectedInstanceId.length > 0))) ||
      (value.operation !== "handshake" && typeof value.expectedInstanceId === "string" && value.expectedInstanceId.length > 0)) &&
    Object.prototype.hasOwnProperty.call(value, "payload");
}

export function isAgentHarnessServiceHostResponse(value: unknown): value is AgentHarnessServiceHostResponse {
  if (!isRecord(value) ||
    value.protocolVersion !== agentHarnessServiceHostControlProtocolVersion ||
    value.kind !== "response" ||
    typeof value.requestId !== "string" ||
    !isAgentHarnessServiceHostOperation(value.operation) ||
    typeof value.ok !== "boolean" ||
    !Number.isInteger(value.serviceHostProcessId) ||
    (value.serviceHostProcessId as number) <= 0 ||
    !(value.workerProcessId === null || (Number.isInteger(value.workerProcessId) && (value.workerProcessId as number) > 0)) ||
    typeof value.instanceId !== "string") {
    return false;
  }
  if (value.ok) {
    return Object.prototype.hasOwnProperty.call(value, "result");
  }
  return isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string";
}

export function isAgentHarnessServiceHostIdentity(value: unknown): value is AgentHarnessServiceHostIdentity {
  return isAgentHarnessServiceHostIdentityCore(value) &&
    typeof value.trayPresent === "boolean";
}

export function normalizeAgentHarnessServiceHostIdentity(
  value: unknown,
): AgentHarnessServiceHostIdentity | null {
  if (!isAgentHarnessServiceHostIdentityCore(value)) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(value, "trayPresent")) {
    return typeof value.trayPresent === "boolean"
      ? value as unknown as AgentHarnessServiceHostIdentity
      : null;
  }
  return { ...value, trayPresent: false } as unknown as AgentHarnessServiceHostIdentity;
}

function isAgentHarnessServiceHostIdentityCore(value: unknown): value is Record<string, unknown> {
  return isRecord(value) &&
    value.descriptorSchemaVersion === 1 &&
    value.controlProtocolVersion === agentHarnessServiceHostControlProtocolVersion &&
    Number.isInteger(value.serviceHostProcessId) &&
    (value.serviceHostProcessId as number) > 0 &&
    (value.workerProcessId === null || (Number.isInteger(value.workerProcessId) && (value.workerProcessId as number) > 0)) &&
    typeof value.instanceId === "string" &&
    value.instanceId.length > 0 &&
    typeof value.runtimeBuildIdentity === "string" &&
    /^sha256:[0-9a-f]{64}$/i.test(value.runtimeBuildIdentity) &&
    ["starting", "ready", "suspending", "suspended", "resuming", "recovering", "degraded", "stopping"].includes(String(value.lifecycleState)) &&
    (value.lifecycleReason === null || serviceRecoveryReasons.has(String(value.lifecycleReason))) &&
    typeof value.lifecycleStateChangedAt === "string" &&
    Number.isSafeInteger(value.powerEpoch) &&
    (value.powerEpoch as number) >= 0 &&
    Number.isSafeInteger(value.consecutiveHeartbeatMisses) &&
    (value.consecutiveHeartbeatMisses as number) >= 0 &&
    ["idle", "recovering", "circuit-open"].includes(String(value.workerRecoveryState)) &&
    (value.workerRecoveryError === null || typeof value.workerRecoveryError === "string") &&
    isNullableString(value.lastSuspendAt) &&
    isNullableString(value.lastResumeAt) &&
    isNullableString(value.lastRecoveryStartedAt) &&
    isNullableString(value.lastReadyAt) &&
    Number.isSafeInteger(value.workerRestartCount) &&
    (value.workerRestartCount as number) >= 0 &&
    isNullableString(value.lastWorkerRestartReason) &&
    (value.lastControlledRestart === null || isControlledRestartDisposition(value.lastControlledRestart));
}

const serviceRecoveryReasons = new Set([
  "startup",
  "power-suspend",
  "resume-reset",
  "resume-liveness-timeout",
  "resume-readiness-failed",
  "heartbeat-timeout",
  "heartbeat-miss-threshold",
  "worker-exited",
  "worker-restart-backoff",
  "worker-recovery-exhausted",
  "build-generation-mismatch",
  "controlled-restart",
  "controlled-restart-drain-timeout",
  "host-stopping",
]);

function isControlledRestartDisposition(value: unknown): boolean {
  return isRecord(value) &&
    ["drained", "deadline-exceeded", "no-runtime"].includes(String(value.outcome)) &&
    Number.isSafeInteger(value.activeRequestsAtStart) &&
    Number.isSafeInteger(value.activeRequestsAtEnd) &&
    typeof value.requestedAt === "string" &&
    typeof value.completedAt === "string";
}

function isAgentHarnessServiceHostOperation(value: unknown): value is AgentHarnessServiceHostOperation {
  return typeof value === "string" && serviceHostOperations.has(value as AgentHarnessServiceHostOperation);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}
