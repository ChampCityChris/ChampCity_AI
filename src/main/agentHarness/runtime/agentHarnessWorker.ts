import type {
  AgentHarnessStatus,
  AgentHarnessWorkspaceRegistrySnapshot,
  AgentHarnessRegisteredWorkspaceSummary,
  LegacyOAuthClientImportResult,
  AgentHarnessControlledRestartDisposition,
} from "../../../shared/workspaceContracts";
import { AgentHarnessService } from "./agentHarnessService";
import { AgentHarnessError } from "../core/errors";
import {
  agentHarnessProcessProtocolVersion,
  isAgentHarnessControlRequest,
  type AgentHarnessControlRequest,
  type AgentHarnessWorkerInitialization,
  type AgentHarnessWorkerHeartbeat,
} from "./agentHarnessProcessProtocol";

const controlPort = process.parentPort;
if (!controlPort) {
  throw new Error("Agent Harness worker requires an Electron utility-process parent port.");
}

// Electron 37+ otherwise leaves utility processes alive after an unhandled
// rejection. Preserve fail-stop behavior so the owning controller sees failure.
process.on("unhandledRejection", () => process.exit(1));

let service: AgentHarnessService | null = null;
let shuttingDown = false;
let requestQueue = Promise.resolve();

controlPort.on("message", (event) => {
  const message = event.data as unknown;
  requestQueue = requestQueue
    .then(() => dispatchControlMessage(message))
    .catch(() => undefined);
});

async function dispatchControlMessage(message: unknown): Promise<void> {
  if (!isAgentHarnessControlRequest(message) || shuttingDown) {
    return;
  }

  try {
    const result = await executeControlRequest(message);
    respondSuccess(message, result);
    if (message.operation === "shutdown") {
      shuttingDown = true;
      setImmediate(() => process.exit(0));
    }
  } catch (error) {
    respondFailure(message, error);
  }
}

async function executeControlRequest(
  request: AgentHarnessControlRequest,
): Promise<
  AgentHarnessStatus |
  AgentHarnessWorkerHeartbeat |
  AgentHarnessControlledRestartDisposition |
  LegacyOAuthClientImportResult |
  AgentHarnessWorkspaceRegistrySnapshot |
  { workspace: AgentHarnessRegisteredWorkspaceSummary; registry: AgentHarnessWorkspaceRegistrySnapshot }
> {
  switch (request.operation) {
    case "initialize":
      return initializeService(request.payload as AgentHarnessWorkerInitialization);
    case "status":
      return requireService().status();
    case "start":
      return requireService().start();
    case "stop":
      return requireService().stop();
    case "restart":
      return requireService().restart();
    case "heartbeat":
      return requireService().heartbeat();
    case "prepare-suspend":
      return requireService().prepareSuspend(request.payload.powerEpoch);
    case "resume-reconcile":
      return requireService().reconcileAfterResume(request.payload.powerEpoch);
    case "prepare-controlled-restart":
      return requireService().prepareControlledRestart(request.payload.drainDeadlineMs);
    case "save-configuration":
      return requireService().saveConfiguration(request.payload);
    case "import-legacy-oauth-clients":
      return requireService().importLegacyOAuthClientRegistry(request.payload.source);
    case "list-registered-workspaces":
      return requireService().listRegisteredWorkspaces();
    case "register-workspace":
      return requireService().registerWorkspaceRoot(request.payload.workspaceRoot);
    case "unregister-workspace":
      return requireService().unregisterWorkspace(request.payload.workspaceId);
    case "shutdown":
      return requireService().stop();
  }
}

async function initializeService(input: AgentHarnessWorkerInitialization): Promise<AgentHarnessStatus> {
  if (service) {
    throw new Error("Agent Harness worker is already initialized.");
  }
  if (!input || typeof input !== "object" || typeof input.userDataRoot !== "string" || !input.userDataRoot.trim()) {
    throw new Error("Agent Harness worker initialization requires a user-data root.");
  }
  if (!input.environmentOverrides || typeof input.environmentOverrides !== "object") {
    throw new Error("Agent Harness worker initialization requires bounded environment overrides.");
  }
  if (typeof input.workerGeneration !== "string" || !/^[0-9a-f-]{36}$/i.test(input.workerGeneration) ||
    !Number.isSafeInteger(input.workerRestartCount) || input.workerRestartCount < 0 ||
    !(input.lastWorkerRestartReason === null || typeof input.lastWorkerRestartReason === "string")) {
    throw new Error("Agent Harness worker initialization requires bounded generation diagnostics.");
  }

  service = new AgentHarnessService({
    userDataRoot: input.userDataRoot,
    workerGeneration: input.workerGeneration,
    workerRestartCount: input.workerRestartCount,
    lastWorkerRestartReason: input.lastWorkerRestartReason,
    ...input.environmentOverrides,
  });
  return service.initialize();
}

function requireService(): AgentHarnessService {
  if (!service) {
    throw new Error("Agent Harness worker has not been initialized.");
  }
  return service;
}

function respondSuccess(
  request: AgentHarnessControlRequest,
  result: AgentHarnessStatus |
    AgentHarnessWorkerHeartbeat |
    AgentHarnessControlledRestartDisposition |
    LegacyOAuthClientImportResult |
    AgentHarnessWorkspaceRegistrySnapshot |
    { workspace: AgentHarnessRegisteredWorkspaceSummary; registry: AgentHarnessWorkspaceRegistrySnapshot },
): void {
  controlPort.postMessage({
    protocolVersion: agentHarnessProcessProtocolVersion,
    kind: "response",
    requestId: request.requestId,
    operation: request.operation,
    ok: true,
    workerProcessId: process.pid,
    result,
  });
}

function respondFailure(request: AgentHarnessControlRequest, error: unknown): void {
  controlPort.postMessage({
    protocolVersion: agentHarnessProcessProtocolVersion,
    kind: "response",
    requestId: request.requestId,
    operation: request.operation,
    ok: false,
    workerProcessId: process.pid,
    error: {
      code: error instanceof AgentHarnessError ? error.code : "AGENT_HARNESS_CONTROL_OPERATION_FAILED",
      message: boundedErrorMessage(error),
    },
  });
}

function boundedErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Agent Harness worker operation failed.";
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Agent Harness worker operation failed.";
}
