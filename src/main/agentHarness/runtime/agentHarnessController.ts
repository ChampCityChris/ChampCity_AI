import { randomUUID } from "node:crypto";
import { utilityProcess, type UtilityProcess } from "electron";
import type {
  AgentHarnessSettingsInput,
  AgentHarnessStatus,
  AgentHarnessWorkspaceRegistrySnapshot,
  AgentHarnessRegisteredWorkspaceSummary,
  LegacyOAuthClientImportResult,
  AgentHarnessControlledRestartDisposition,
} from "../../../shared/workspaceContracts";
import {
  agentHarnessProcessProtocolVersion,
  isAgentHarnessControlResponse,
  isAgentHarnessStatus,
  isAgentHarnessWorkspaceRegistrySnapshot,
  isAgentHarnessWorkspaceRegistrationControlResult,
  type AgentHarnessControlOperation,
  type AgentHarnessControlRequest,
  type AgentHarnessControlRequestPayloads,
  type AgentHarnessControlResponsePayloads,
  type AgentHarnessWorkerEnvironmentOverrides,
  type AgentHarnessWorkerHeartbeat,
} from "./agentHarnessProcessProtocol";

export type { AgentHarnessWorkerEnvironmentOverrides } from "./agentHarnessProcessProtocol";

interface AgentHarnessControllerOptions {
  workerEntryPath: string;
  userDataRoot: string;
  environmentOverrides?: AgentHarnessWorkerEnvironmentOverrides;
  requestTimeoutMs?: number;
  spawnTimeoutMs?: number;
  shutdownTimeoutMs?: number;
  automaticRecoveryLimit?: number;
  automaticRecoveryBackoffMs?: number[];
}

interface PendingControlRequest {
  operation: AgentHarnessControlOperation;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

type ControllerLifecycle = "new" | "spawning" | "recovering" | "available" | "failed" | "shutting-down" | "closed";

export interface AgentHarnessControllerRecoveryStatus {
  state: "idle" | "recovering" | "circuit-open";
  attemptCount: number;
  attemptLimit: number;
  lastError: string | null;
  workerRestartCount: number;
  lastWorkerRestartReason: string | null;
}

export class AgentHarnessControllerError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AgentHarnessControllerError";
  }
}

export class AgentHarnessController {
  private readonly workerEntryPath: string;
  private readonly userDataRoot: string;
  private readonly environmentOverrides: AgentHarnessWorkerEnvironmentOverrides;
  private readonly requestTimeoutMs: number;
  private readonly spawnTimeoutMs: number;
  private readonly shutdownTimeoutMs: number;
  private readonly automaticRecoveryLimit: number;
  private readonly automaticRecoveryBackoffMs: number[];
  private readonly pending = new Map<string, PendingControlRequest>();
  private worker: UtilityProcess | null = null;
  private fencedWorkerAwaitingExit: UtilityProcess | null = null;
  private spawnPromise: Promise<void> | null = null;
  private fencingPromise: Promise<void> | null = null;
  private lifecycle: ControllerLifecycle = "new";
  private cachedStatus: AgentHarnessStatus | null = null;
  private lastFailure = "Agent Harness worker is unavailable.";
  private shutdownExpected = false;
  private automaticRecoveryPromise: Promise<void> | null = null;
  private automaticRecoveryAttempts = 0;
  private automaticRecoveryCircuitOpen = false;
  private automaticRecoveryCancelled = false;
  private runtimeDesiredRunning = false;
  private replacementPromise: Promise<AgentHarnessWorkerHeartbeat> | null = null;
  private workerGeneration: string | null = null;
  private workerRestartCount = 0;
  private lastWorkerRestartReason: string | null = null;
  private pendingWorkerRestartReason: string | null = null;

  constructor(options: AgentHarnessControllerOptions) {
    this.workerEntryPath = options.workerEntryPath;
    this.userDataRoot = options.userDataRoot;
    this.environmentOverrides = { ...options.environmentOverrides };
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.spawnTimeoutMs = options.spawnTimeoutMs ?? 10_000;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? 5_000;
    this.automaticRecoveryLimit = options.automaticRecoveryLimit ?? 3;
    this.automaticRecoveryBackoffMs = options.automaticRecoveryBackoffMs ?? [100, 500, 1_500];
  }

  workerProcessId(): number | null {
    return this.worker?.pid ?? null;
  }

  isRuntimeDesiredRunning(): boolean {
    return this.runtimeDesiredRunning;
  }

  recoveryStatus(): AgentHarnessControllerRecoveryStatus {
    return {
      state: this.automaticRecoveryCircuitOpen
        ? "circuit-open"
        : this.automaticRecoveryPromise
        ? "recovering"
        : "idle",
      attemptCount: this.automaticRecoveryAttempts,
      attemptLimit: this.automaticRecoveryLimit,
      lastError: this.lifecycle === "failed" || this.automaticRecoveryPromise ? this.lastFailure : null,
      workerRestartCount: this.workerRestartCount,
      lastWorkerRestartReason: this.lastWorkerRestartReason,
    };
  }

  async status(): Promise<AgentHarnessStatus> {
    if (!this.worker && this.lifecycle === "recovering" && this.cachedStatus) {
      return this.cachedStatus;
    }
    if (!this.worker && this.lifecycle === "failed") {
      if (this.cachedStatus) {
        return this.cachedStatus;
      }
      throw this.unavailableError();
    }
    await this.ensureWorker(false);
    return this.sendRequest("status", null);
  }

  async start(): Promise<AgentHarnessStatus> {
    this.runtimeDesiredRunning = true;
    await this.prepareExplicitRecovery();
    await this.ensureWorker(this.lifecycle === "failed");
    const status = await this.sendRequest("start", null);
    this.runtimeDesiredRunning = status.enabled;
    return status;
  }

  async stop(): Promise<AgentHarnessStatus> {
    this.runtimeDesiredRunning = false;
    if (!this.worker && this.lifecycle === "failed") {
      if (this.cachedStatus) {
        return this.cachedStatus;
      }
      throw this.unavailableError();
    }
    await this.ensureWorker(false);
    return this.sendRequest("stop", null);
  }

  async restart(): Promise<AgentHarnessStatus> {
    this.runtimeDesiredRunning = true;
    await this.prepareExplicitRecovery();
    await this.ensureWorker(this.lifecycle === "failed");
    const status = await this.sendRequest("restart", null);
    this.runtimeDesiredRunning = status.enabled;
    return status;
  }

  heartbeat(deadlineMs = 2_000): Promise<AgentHarnessWorkerHeartbeat> {
    if (!this.worker || this.lifecycle !== "available") {
      return Promise.reject(this.unavailableError());
    }
    return this.sendRequest("heartbeat", null, deadlineMs);
  }

  async prepareSuspend(powerEpoch: number, deadlineMs = 2_000): Promise<void> {
    if (!this.worker || this.lifecycle !== "available") {
      return;
    }
    await this.sendRequest("prepare-suspend", { powerEpoch }, deadlineMs);
  }

  async reconcileAfterResume(powerEpoch: number, deadlineMs = 3_000): Promise<AgentHarnessWorkerHeartbeat> {
    if (!this.worker || this.lifecycle !== "available") {
      throw this.unavailableError();
    }
    return this.sendRequest("resume-reconcile", { powerEpoch }, deadlineMs);
  }

  async prepareControlledRestart(drainDeadlineMs: number): Promise<AgentHarnessControlledRestartDisposition> {
    if (!this.worker || this.lifecycle !== "available") {
      const timestamp = new Date().toISOString();
      return {
        outcome: "no-runtime",
        activeRequestsAtStart: 0,
        activeRequestsAtEnd: 0,
        requestedAt: timestamp,
        completedAt: timestamp,
      };
    }
    return this.sendRequest(
      "prepare-controlled-restart",
      { drainDeadlineMs },
      drainDeadlineMs + 1_000,
    );
  }

  replaceWorker(reason: string): Promise<AgentHarnessWorkerHeartbeat> {
    if (this.replacementPromise) {
      return this.replacementPromise;
    }
    this.replacementPromise = this.replaceWorkerExclusive(reason)
      .finally(() => {
        this.replacementPromise = null;
      });
    return this.replacementPromise;
  }

  async saveConfiguration(input: AgentHarnessSettingsInput): Promise<AgentHarnessStatus> {
    await this.ensureWorker(this.lifecycle === "failed");
    const status = await this.sendRequest("save-configuration", input);
    this.runtimeDesiredRunning = status.enabled;
    return status;
  }

  async importLegacyOAuthClientRegistry(source: unknown): Promise<LegacyOAuthClientImportResult> {
    await this.ensureWorker(this.lifecycle === "failed");
    return this.sendRequest("import-legacy-oauth-clients", { source });
  }

  async listRegisteredWorkspaces(): Promise<AgentHarnessWorkspaceRegistrySnapshot> {
    await this.ensureWorker(false);
    const registry = await this.sendRequest("list-registered-workspaces", null);
    if (!isAgentHarnessWorkspaceRegistrySnapshot(registry)) {
      throw new AgentHarnessControllerError("AGENT_HARNESS_REGISTRY_RESPONSE_INVALID", "Worker returned an invalid registry snapshot.");
    }
    return registry;
  }

  async registerWorkspace(workspaceRoot: string): Promise<{
    workspace: AgentHarnessRegisteredWorkspaceSummary;
    registry: AgentHarnessWorkspaceRegistrySnapshot;
  }> {
    await this.ensureWorker(false);
    const result = await this.sendRequest("register-workspace", { workspaceRoot });
    if (!isAgentHarnessWorkspaceRegistrationControlResult(result)) {
      throw new AgentHarnessControllerError("AGENT_HARNESS_REGISTRY_RESPONSE_INVALID", "Worker returned an invalid registration result.");
    }
    return result;
  }

  async unregisterWorkspace(workspaceId: string): Promise<AgentHarnessWorkspaceRegistrySnapshot> {
    await this.ensureWorker(false);
    const registry = await this.sendRequest("unregister-workspace", { workspaceId });
    if (!isAgentHarnessWorkspaceRegistrySnapshot(registry)) {
      throw new AgentHarnessControllerError("AGENT_HARNESS_REGISTRY_RESPONSE_INVALID", "Worker returned an invalid registry snapshot.");
    }
    return registry;
  }

  async shutdown(): Promise<void> {
    this.shutdownExpected = true;
    this.automaticRecoveryCancelled = true;
    if (this.automaticRecoveryPromise) {
      await this.automaticRecoveryPromise.catch(() => undefined);
    }
    if (this.fencingPromise) {
      await this.fencingPromise;
    }
    if (this.spawnPromise) {
      await this.spawnPromise.catch(() => undefined);
    }
    const fencedWorker = this.fencedWorkerAwaitingExit;
    if (fencedWorker) {
      const fencedExitPromise = this.waitForExit(fencedWorker, this.shutdownTimeoutMs);
      try {
        fencedWorker.kill();
      } catch {
        // Application shutdown remains bounded even if the OS rejects a repeated kill.
      }
      await fencedExitPromise;
      if (this.fencedWorkerAwaitingExit === fencedWorker) {
        this.fencedWorkerAwaitingExit = null;
      }
    }
    const worker = this.worker;
    if (!worker) {
      this.lifecycle = "closed";
      return;
    }

    this.lifecycle = "shutting-down";
    const exitPromise = this.waitForExit(worker, this.shutdownTimeoutMs);
    try {
      await this.sendRequest("shutdown", null);
    } catch {
      // A failed graceful request is followed by bounded termination below.
    }

    if (!(await exitPromise)) {
      worker.kill();
      await this.waitForExit(worker, this.shutdownTimeoutMs);
    }
    if (this.worker === worker) {
      this.worker = null;
    }
    this.lifecycle = "closed";
  }

  private async ensureWorker(allowFailedRecovery: boolean): Promise<void> {
    if (this.fencingPromise) {
      await this.fencingPromise;
    }
    if (this.spawnPromise) {
      return this.spawnPromise;
    }
    if (this.fencedWorkerAwaitingExit) {
      throw new AgentHarnessControllerError(
        "AGENT_HARNESS_WORKER_FENCE_UNCONFIRMED",
        "Agent Harness cannot start a replacement while the fenced worker exit is unconfirmed.",
      );
    }
    if (this.worker && this.lifecycle === "available") {
      return;
    }
    if (this.lifecycle === "closed" || this.lifecycle === "shutting-down") {
      throw new AgentHarnessControllerError("AGENT_HARNESS_CONTROLLER_CLOSED", "Agent Harness controller is shutting down.");
    }
    if ((this.lifecycle === "failed" || this.lifecycle === "recovering") && !allowFailedRecovery) {
      throw this.unavailableError();
    }

    this.lifecycle = "spawning";
    this.shutdownExpected = false;
    this.spawnPromise = this.spawnAndInitialize()
      .finally(() => {
        this.spawnPromise = null;
      });
    return this.spawnPromise;
  }

  private async spawnAndInitialize(): Promise<void> {
    let worker: UtilityProcess;
    try {
      worker = utilityProcess.fork(this.workerEntryPath, [], {
        serviceName: "ChampCity A/I Agent Harness",
        stdio: "ignore",
      });
    } catch (error) {
      this.markFailed(`Agent Harness worker could not be spawned: ${boundedMessage(error)}`);
      throw this.unavailableError();
    }

    this.worker = worker;
    worker.on("message", (message: unknown) => this.handleWorkerMessage(worker, message));
    worker.once("exit", (code) => this.handleWorkerExit(worker, code));

    try {
      await this.waitForSpawn(worker);
      const workerGeneration = randomUUID();
      const isReplacement = this.workerGeneration !== null;
      const workerRestartCount = this.workerRestartCount + (isReplacement ? 1 : 0);
      const lastWorkerRestartReason = isReplacement
        ? this.pendingWorkerRestartReason ?? "worker-exited"
        : null;
      const status = await this.sendRequest("initialize", {
        userDataRoot: this.userDataRoot,
        environmentOverrides: this.environmentOverrides,
        workerGeneration,
        workerRestartCount,
        lastWorkerRestartReason,
      });
      if (this.worker !== worker) {
        throw this.unavailableError();
      }
      if (!isAgentHarnessStatus(status)) {
        throw new AgentHarnessControllerError(
          "AGENT_HARNESS_INITIALIZATION_RESPONSE_INVALID",
          "Agent Harness worker returned an invalid initialization status.",
        );
      }
      this.cachedStatus = status;
      this.workerGeneration = workerGeneration;
      this.workerRestartCount = workerRestartCount;
      this.lastWorkerRestartReason = lastWorkerRestartReason;
      this.pendingWorkerRestartReason = null;
      this.lifecycle = "available";
    } catch (error) {
      await this.fenceIndeterminateWorkspaceState("initialize", error, worker);
      throw this.unavailableError();
    }
  }

  private fenceIndeterminateWorkspaceState(
    operation: "initialize",
    cause: unknown,
    affectedWorker: UtilityProcess | null,
  ): Promise<void> {
    if (this.fencingPromise) {
      return this.fencingPromise;
    }

    const failure = new AgentHarnessControllerError(
      "AGENT_HARNESS_WORKSPACE_STATE_INDETERMINATE",
      `Agent Harness workspace state became indeterminate during ${operation}: ${boundedMessage(cause)}`,
    );
    this.markFailed(failure.message);

    const worker = affectedWorker && affectedWorker === this.worker
      ? affectedWorker
      : null;
    if (!worker) {
      this.rejectPending(failure);
      return Promise.resolve();
    }

    this.worker = null;
    this.fencedWorkerAwaitingExit = worker;
    this.rejectPending(failure);
    const exitPromise = this.waitForExit(worker, this.shutdownTimeoutMs);
    this.fencingPromise = (async () => {
      try {
        worker.kill();
      } catch (error) {
        this.markFailed(`Agent Harness worker fencing failed during ${operation}: ${boundedMessage(error)}`);
      }
      if (await exitPromise) {
        if (this.fencedWorkerAwaitingExit === worker) {
          this.fencedWorkerAwaitingExit = null;
        }
      } else {
        this.markFailed(`Agent Harness worker fencing timed out during ${operation}.`);
      }
    })().finally(() => {
      this.fencingPromise = null;
    });
    return this.fencingPromise;
  }

  private sendRequest<Operation extends AgentHarnessControlOperation>(
    operation: Operation,
    payload: AgentHarnessControlRequestPayloads[Operation],
    timeoutMs = this.requestTimeoutMs,
  ): Promise<AgentHarnessControlResponsePayloads[Operation]> {
    const worker = this.worker;
    if (!worker) {
      return Promise.reject(this.unavailableError());
    }

    const requestId = randomUUID();
    const request = {
      protocolVersion: agentHarnessProcessProtocolVersion,
      kind: "request",
      requestId,
      operation,
      payload,
    } as Extract<AgentHarnessControlRequest, { operation: Operation }>;

    return new Promise<AgentHarnessControlResponsePayloads[Operation]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new AgentHarnessControllerError(
          "AGENT_HARNESS_CONTROL_TIMEOUT",
          `Agent Harness worker did not respond to ${operation} within the bounded timeout.`,
        ));
      }, timeoutMs);
      this.pending.set(requestId, {
        operation,
        resolve: (value) => resolve(value as AgentHarnessControlResponsePayloads[Operation]),
        reject,
        timeout,
      });
      try {
        worker.postMessage(request);
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(requestId);
        reject(new AgentHarnessControllerError(
          "AGENT_HARNESS_CONTROL_SEND_FAILED",
          `Agent Harness worker request could not be sent: ${boundedMessage(error)}`,
        ));
      }
    });
  }

  private async replaceWorkerExclusive(reason: string): Promise<AgentHarnessWorkerHeartbeat> {
    this.pendingWorkerRestartReason = safeReasonCode(reason);
    this.automaticRecoveryCancelled = true;
    if (this.automaticRecoveryPromise) {
      await this.automaticRecoveryPromise.catch(() => undefined);
    }
    const worker = this.worker;
    this.worker = null;
    this.lifecycle = "recovering";
    this.projectRecoveryStatus(`Replacing fenced Agent Harness worker: ${boundedMessage(reason)}`);
    this.rejectPending(new AgentHarnessControllerError(
      "AGENT_HARNESS_WORKER_REPLACED",
      "Agent Harness worker request was interrupted by bounded recovery.",
    ));
    if (worker) {
      this.fencedWorkerAwaitingExit = worker;
      const exitPromise = this.waitForExit(worker, this.shutdownTimeoutMs);
      try {
        worker.kill();
      } catch {
        // The exit confirmation below remains the fencing prerequisite.
      }
      if (!(await exitPromise)) {
        this.markFailed("Agent Harness worker replacement was blocked because fenced exit could not be confirmed.");
        throw new AgentHarnessControllerError(
          "AGENT_HARNESS_WORKER_FENCE_UNCONFIRMED",
          this.lastFailure,
        );
      }
      if (this.fencedWorkerAwaitingExit === worker) {
        this.fencedWorkerAwaitingExit = null;
      }
    }
    this.automaticRecoveryAttempts = 0;
    this.automaticRecoveryCircuitOpen = false;
    this.automaticRecoveryCancelled = false;
    await this.ensureWorker(true);
    if (this.runtimeDesiredRunning) {
      await this.sendRequest("start", null);
    }
    return this.sendRequest("heartbeat", null, 2_000);
  }

  private handleWorkerMessage(worker: UtilityProcess, message: unknown): void {
    if (worker !== this.worker || !isAgentHarnessControlResponse(message)) {
      return;
    }
    const pending = this.pending.get(message.requestId);
    if (!pending || pending.operation !== message.operation) {
      return;
    }
    clearTimeout(pending.timeout);
    this.pending.delete(message.requestId);

    if (worker.pid !== message.workerProcessId || message.workerProcessId === process.pid) {
      pending.reject(new AgentHarnessControllerError(
        "AGENT_HARNESS_PROCESS_IDENTITY_MISMATCH",
        "Agent Harness worker response did not match the isolated utility-process identity.",
      ));
      return;
    }
    if (!message.ok) {
      pending.reject(new AgentHarnessControllerError(message.error.code, message.error.message));
      return;
    }

    if (isAgentHarnessStatus(message.result)) {
      this.cachedStatus = message.result;
    }
    pending.resolve(message.result);
  }

  private handleWorkerExit(worker: UtilityProcess, code: number): void {
    if (worker === this.fencedWorkerAwaitingExit) {
      this.fencedWorkerAwaitingExit = null;
      return;
    }
    if (worker !== this.worker) {
      return;
    }
    this.worker = null;
    this.rejectPending(new AgentHarnessControllerError(
      "AGENT_HARNESS_WORKER_EXITED",
      `Agent Harness worker exited before completing its request (exit code ${code}).`,
    ));
    if (this.shutdownExpected) {
      this.lifecycle = "closed";
      return;
    }
    const failure = `Agent Harness worker exited unexpectedly (exit code ${code}).`;
    this.pendingWorkerRestartReason = "worker-exited";
    this.markFailed(failure);
    this.beginAutomaticRecovery(failure);
  }

  private beginAutomaticRecovery(failure: string): void {
    if (this.automaticRecoveryPromise || this.automaticRecoveryCancelled || this.shutdownExpected) {
      return;
    }
    if (this.automaticRecoveryAttempts >= this.automaticRecoveryLimit) {
      this.openAutomaticRecoveryCircuit(failure);
      return;
    }
    this.lifecycle = "recovering";
    this.projectRecoveryStatus(`Recovering Agent Harness after unexpected worker exit.`);
    this.automaticRecoveryPromise = this.runAutomaticRecovery()
      .finally(() => {
        this.automaticRecoveryPromise = null;
      });
  }

  private async runAutomaticRecovery(): Promise<void> {
    while (!this.automaticRecoveryCancelled && !this.shutdownExpected) {
      if (this.automaticRecoveryAttempts >= this.automaticRecoveryLimit) {
        this.openAutomaticRecoveryCircuit(this.lastFailure);
        return;
      }
      const attemptIndex = this.automaticRecoveryAttempts;
      this.automaticRecoveryAttempts += 1;
      const backoff = this.automaticRecoveryBackoffMs[
        Math.min(attemptIndex, Math.max(0, this.automaticRecoveryBackoffMs.length - 1))
      ] ?? 0;
      if (backoff > 0) {
        await delay(backoff);
      }
      if (this.automaticRecoveryCancelled || this.shutdownExpected) {
        return;
      }
      try {
        await this.ensureWorker(true);
        if (this.runtimeDesiredRunning) {
          await this.sendRequest("start", null);
        }
        this.automaticRecoveryCircuitOpen = false;
        this.lastFailure = "Agent Harness worker is unavailable.";
        return;
      } catch (error) {
        this.markFailed(`Agent Harness automatic worker recovery attempt ${this.automaticRecoveryAttempts} failed: ${boundedMessage(error)}`);
      }
    }
  }

  private openAutomaticRecoveryCircuit(failure: string): void {
    this.automaticRecoveryCircuitOpen = true;
    this.markFailed(
      `Agent Harness automatic worker recovery circuit opened after ${this.automaticRecoveryAttempts} attempts: ${boundedMessage(failure)}`,
    );
  }

  private async prepareExplicitRecovery(): Promise<void> {
    if (this.automaticRecoveryPromise) {
      await this.automaticRecoveryPromise.catch(() => undefined);
    }
    if (this.lifecycle === "failed" || this.automaticRecoveryCircuitOpen) {
      this.automaticRecoveryAttempts = 0;
      this.automaticRecoveryCircuitOpen = false;
      this.automaticRecoveryCancelled = false;
    }
  }

  private projectRecoveryStatus(message: string): void {
    this.lastFailure = boundedMessage(message);
    if (this.cachedStatus) {
      this.cachedStatus = {
        ...this.cachedStatus,
        state: "starting",
        port: null,
        healthEndpoint: null,
        readinessEndpoint: null,
        mcpEndpoint: null,
        operationalDiagnostics: {
          ...this.cachedStatus.operationalDiagnostics,
          readiness: { state: "degraded", reasonCode: "service-failed" },
        },
        activeWorkspaceId: null,
        expectedWorkspaceId: null,
        selectedProjectRootSummary: null,
        routingState: "unavailable",
        lastError: this.lastFailure,
        recentActivity: [
          `${new Date().toISOString()} ${this.lastFailure}`,
          ...this.cachedStatus.recentActivity,
        ].slice(0, 8),
      };
    }
  }

  private markFailed(message: string): void {
    this.lastFailure = boundedMessage(message);
    this.lifecycle = "failed";
    if (this.cachedStatus) {
      this.cachedStatus = {
        ...this.cachedStatus,
        state: "failed",
        port: null,
        healthEndpoint: null,
        readinessEndpoint: null,
        mcpEndpoint: null,
        operationalDiagnostics: {
          ...this.cachedStatus.operationalDiagnostics,
          readiness: { state: "degraded", reasonCode: "service-failed" },
        },
        activeWorkspaceId: null,
        expectedWorkspaceId: null,
        selectedProjectRootSummary: null,
        routingState: "unavailable",
        lastError: this.lastFailure,
        recentActivity: [
          `${new Date().toISOString()} ${this.lastFailure}`,
          ...this.cachedStatus.recentActivity,
        ].slice(0, 8),
      };
    }
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private unavailableError(): AgentHarnessControllerError {
    return new AgentHarnessControllerError("AGENT_HARNESS_WORKER_UNAVAILABLE", this.lastFailure);
  }

  private waitForSpawn(worker: UtilityProcess): Promise<void> {
    if (worker.pid) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.off("spawn", onSpawn);
        reject(new AgentHarnessControllerError(
          "AGENT_HARNESS_WORKER_SPAWN_TIMEOUT",
          "Agent Harness utility process did not spawn within the bounded timeout.",
        ));
      }, this.spawnTimeoutMs);
      const onSpawn = (): void => {
        clearTimeout(timeout);
        resolve();
      };
      worker.once("spawn", onSpawn);
    });
  }

  private waitForExit(worker: UtilityProcess, timeoutMs: number): Promise<boolean> {
    if (worker.pid === undefined) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        worker.off("exit", onExit);
        resolve(false);
      }, timeoutMs);
      const onExit = (): void => {
        clearTimeout(timeout);
        resolve(true);
      };
      worker.once("exit", onExit);
    });
  }
}

function boundedMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Agent Harness worker is unavailable.";
}

function safeReasonCode(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return normalized || "worker-restart";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
