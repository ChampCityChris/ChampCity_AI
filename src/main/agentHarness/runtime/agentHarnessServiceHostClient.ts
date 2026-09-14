import { randomUUID } from "node:crypto";
import net, { type Socket } from "node:net";
import type {
  AgentHarnessSettingsInput,
  AgentHarnessRegisteredWorkspaceSummary,
  AgentHarnessServiceHostLifecycleStatus,
  AgentHarnessStatus,
  AgentHarnessWorkspaceRegistrySnapshot,
  LegacyOAuthClientImportResult,
} from "../../../shared/workspaceContracts";
import {
  isAgentHarnessStatus,
  isAgentHarnessWorkspaceRegistrySnapshot,
  isAgentHarnessWorkspaceRegistrationControlResult,
} from "./agentHarnessProcessProtocol";
import {
  createAgentHarnessServiceHostDescriptorFromIdentity,
  getAgentHarnessServiceHostControlAddress,
  removeAgentHarnessServiceHostDescriptorAfterEndpointAbsence,
  type AgentHarnessServiceHostDescriptor,
} from "./agentHarnessServiceHostDescriptor";
import {
  agentHarnessServiceHostControlProtocolVersion,
  isAgentHarnessServiceHostResponse,
  normalizeAgentHarnessServiceHostIdentity,
  type AgentHarnessServiceHostIdentity,
  type AgentHarnessServiceHostOperation,
  type AgentHarnessServiceHostRequest,
  type AgentHarnessServiceHostRequestPayloads,
  type AgentHarnessServiceHostResponse,
  type AgentHarnessServiceHostResponsePayloads,
} from "./agentHarnessServiceHostProtocol";
import {
  clearBackgroundAgentExplicitStopIntent,
  readBackgroundAgentIntent,
} from "./backgroundAgentIntent";

const maximumControlFrameBytes = 4 * 1024 * 1024;

interface AgentHarnessServiceHostClientOptions {
  userDataRoot: string;
  launchServiceHost: () => void | Promise<void>;
  requestTimeoutMs?: number;
  discoveryTimeoutMs?: number;
  discoveryPollIntervalMs?: number;
  expectedBuildIdentity?: string;
}

export type AgentHarnessServiceHostEndpointProbe =
  | { state: "live"; identity: AgentHarnessServiceHostIdentity }
  | { state: "absent" }
  | { state: "indeterminate"; error: string };

export class AgentHarnessServiceHostClientError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "AgentHarnessServiceHostClientError";
  }
}

export class AgentHarnessServiceHostClient {
  private readonly userDataRoot: string;
  private readonly launchServiceHost: () => void | Promise<void>;
  private readonly requestTimeoutMs: number;
  private readonly discoveryTimeoutMs: number;
  private readonly discoveryPollIntervalMs: number;
  private descriptor: AgentHarnessServiceHostDescriptor | null = null;
  private connectPromise: Promise<AgentHarnessServiceHostIdentity> | null = null;
  private cachedStatus: AgentHarnessStatus | null = null;
  private recoveryPromise: Promise<AgentHarnessServiceHostIdentity> | null = null;
  private automaticHostRecoveryState: "available" | "recovering" | "failed" = "available";
  private explicitStopState: "none" | "requested" | "invalid" = "none";
  private lifecycleState: AgentHarnessServiceHostLifecycleStatus["state"] = "unavailable";
  private lifecycleIdentity: AgentHarnessServiceHostIdentity | null = null;
  private lifecycleError: string | null = null;
  private readonly expectedBuildIdentity: string | null;
  private lastControlledRestart: AgentHarnessServiceHostLifecycleStatus["lastControlledRestart"] = null;

  constructor(options: AgentHarnessServiceHostClientOptions) {
    this.userDataRoot = options.userDataRoot;
    this.launchServiceHost = options.launchServiceHost;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 35_000;
    this.discoveryTimeoutMs = options.discoveryTimeoutMs ?? 15_000;
    this.discoveryPollIntervalMs = options.discoveryPollIntervalMs ?? 50;
    this.expectedBuildIdentity = options.expectedBuildIdentity ?? null;
  }

  async connect(): Promise<AgentHarnessServiceHostIdentity> {
    if (this.recoveryPromise) {
      return this.recoveryPromise;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }
    if (this.automaticHostRecoveryState === "failed") {
      throw this.recoveryLatchedError();
    }
    this.lifecycleState = "recovering";
    this.lifecycleError = null;
    this.connectPromise = this.discoverAndHandshake()
      .then((identity) => {
        this.acceptLifecycleIdentity(identity);
        return identity;
      })
      .catch((error) => {
        if (isBackgroundAgentStopSuppressionError(error)) {
          this.acceptExplicitStop(error);
        } else {
          this.lifecycleState = "degraded";
          this.lifecycleError = boundedMessage(error);
        }
        throw error;
      })
      .finally(() => {
        this.connectPromise = null;
      });
    return this.connectPromise;
  }

  async identity(): Promise<AgentHarnessServiceHostIdentity> {
    const descriptor = await this.ensureDescriptor();
    return this.handshake(descriptor);
  }

  async lifecycleStatus(): Promise<Omit<AgentHarnessServiceHostLifecycleStatus,
    "launchAtLogin" | "loginItemRegistered" | "executableWillLaunchAtLogin" |
    "startupRegistrationSupported" | "startupRegistrationScope">> {
    if (this.automaticHostRecoveryState === "failed") {
      return this.lifecycleStatusProjection();
    }
    try {
      const identity = await this.identity();
      this.acceptLifecycleIdentity(identity);
    } catch (error) {
      if (isBackgroundAgentStopSuppressionError(error)) {
        this.acceptExplicitStop(error);
      } else {
        await this.recoverAfterHostLoss(error).catch(() => undefined);
      }
    }
    return this.lifecycleStatusProjection();
  }

  async status(): Promise<AgentHarnessStatus> {
    if (this.automaticHostRecoveryState === "failed") {
      if (this.cachedStatus) {
        return this.cachedStatus;
      }
      throw this.recoveryLatchedError();
    }
    try {
      const status = await this.invoke("agent-harness-status", null);
      return this.acceptStatus(status);
    } catch (error) {
      if (isBackgroundAgentStopSuppressionError(error)) {
        this.acceptExplicitStop(error);
        throw error;
      }
      this.markTransportUnavailable(error);
      if (this.cachedStatus) {
        return this.cachedStatus;
      }
      throw error;
    }
  }

  async start(): Promise<AgentHarnessStatus> {
    return this.acceptStatus(await this.invoke("agent-harness-start", null));
  }

  async stop(): Promise<AgentHarnessStatus> {
    return this.acceptStatus(await this.invoke("agent-harness-stop", null));
  }

  async restart(): Promise<AgentHarnessStatus> {
    return this.acceptStatus(await this.invoke("agent-harness-restart", null));
  }

  async saveConfiguration(input: AgentHarnessSettingsInput): Promise<AgentHarnessStatus> {
    return this.acceptStatus(await this.invoke("agent-harness-save-configuration", input));
  }

  async importLegacyOAuthClientRegistry(source: unknown): Promise<LegacyOAuthClientImportResult> {
    return this.invoke("agent-harness-import-legacy-oauth-clients", { source });
  }

  async listRegisteredWorkspaces(): Promise<AgentHarnessWorkspaceRegistrySnapshot> {
    const registry = await this.invoke("list-registered-workspaces", null);
    if (!isAgentHarnessWorkspaceRegistrySnapshot(registry)) {
      throw this.invalidResponse("Service Host returned an invalid registry snapshot.");
    }
    return registry;
  }

  async registerWorkspace(workspaceRoot: string): Promise<{
    workspace: AgentHarnessRegisteredWorkspaceSummary;
    registry: AgentHarnessWorkspaceRegistrySnapshot;
  }> {
    const result = await this.invoke("register-workspace", { workspaceRoot });
    if (!isAgentHarnessWorkspaceRegistrationControlResult(result)) {
      throw this.invalidResponse("Service Host returned an invalid registration result.");
    }
    return result;
  }

  async unregisterWorkspace(workspaceId: string): Promise<AgentHarnessWorkspaceRegistrySnapshot> {
    const registry = await this.invoke("unregister-workspace", { workspaceId });
    if (!isAgentHarnessWorkspaceRegistrySnapshot(registry)) {
      throw this.invalidResponse("Service Host returned an invalid registry snapshot.");
    }
    return registry;
  }

  async shutdownServiceHost(): Promise<void> {
    await this.invoke("service-host-shutdown", null);
    this.descriptor = null;
    this.lifecycleIdentity = null;
    this.lifecycleState = "unavailable";
  }

  async startBackgroundAgent(): Promise<AgentHarnessServiceHostIdentity> {
    clearBackgroundAgentExplicitStopIntent(this.userDataRoot);
    this.explicitStopState = "none";
    this.automaticHostRecoveryState = "available";
    this.lifecycleState = "recovering";
    this.lifecycleError = null;
    this.descriptor = null;
    this.lifecycleIdentity = null;
    return this.connect();
  }

  async exitBackgroundAgent(): Promise<void> {
    await this.invoke("background-agent-user-exit", null);
    this.descriptor = null;
    this.lifecycleIdentity = null;
    const deadline = Date.now() + this.discoveryTimeoutMs;
    while (Date.now() < deadline) {
      const probe = await probeAgentHarnessServiceHostEndpoint(
        this.userDataRoot,
        Math.min(this.requestTimeoutMs, 500),
      );
      if (probe.state === "absent") {
        this.acceptExplicitStop(new AgentHarnessServiceHostClientError(
          "BACKGROUND_AGENT_STOPPED_BY_USER",
          "Background Agent is stopped by user request. Start Background Agent to resume MCP-dependent work.",
        ));
        return;
      }
      await delay(this.discoveryPollIntervalMs);
    }
    throw new AgentHarnessServiceHostClientError(
      "BACKGROUND_AGENT_EXIT_TIMEOUT",
      "Background Agent did not exit within the bounded deadline.",
    );
  }

  async controlledRestartServiceHost(): Promise<AgentHarnessServiceHostIdentity> {
    const descriptor = await this.ensureDescriptor();
    const expectedBuildIdentity = this.expectedBuildIdentity ?? descriptor.runtimeBuildIdentity;
    const disposition = await this.invokeWithDescriptor(
      descriptor,
      "service-host-controlled-restart",
      { expectedBuildIdentity },
    );
    this.lastControlledRestart = disposition;
    this.descriptor = null;
    this.lifecycleIdentity = null;
    this.lifecycleState = "recovering";
    const absenceDeadline = Date.now() + this.discoveryTimeoutMs;
    while (Date.now() < absenceDeadline) {
      const probe = await probeAgentHarnessServiceHostEndpoint(this.userDataRoot, Math.min(this.requestTimeoutMs, 500));
      if (probe.state === "absent") {
        break;
      }
      await delay(this.discoveryPollIntervalMs);
    }
    await this.launchServiceHost();
    const replacementDeadline = Date.now() + this.discoveryTimeoutMs;
    while (Date.now() < replacementDeadline) {
      const probe = await probeAgentHarnessServiceHostEndpoint(this.userDataRoot, Math.min(this.requestTimeoutMs, 1_000));
      if (probe.state === "live" && probe.identity.instanceId !== descriptor.instanceId) {
        const identity = await this.acceptDiscoveredIdentity(probe.identity);
        if (identity.runtimeBuildIdentity !== expectedBuildIdentity) {
          this.acceptLifecycleIdentity(identity);
          throw new AgentHarnessServiceHostClientError(
            "SERVICE_HOST_BUILD_GENERATION_MISMATCH",
            "Replacement Service Host did not confirm the expected build generation.",
          );
        }
        return identity;
      }
      await delay(this.discoveryPollIntervalMs);
    }
    throw new AgentHarnessServiceHostClientError(
      "SERVICE_HOST_CONTROLLED_RESTART_TIMEOUT",
      "Replacement Service Host did not confirm readiness within the bounded deadline.",
    );
  }

  disconnect(): void {
    // Requests use bounded connection-scoped streams, so normal desktop shutdown
    // has no persistent socket and deliberately leaves the healthy host running.
  }

  private async discoverAndHandshake(): Promise<AgentHarnessServiceHostIdentity> {
    const initialProbe = await probeAgentHarnessServiceHostEndpoint(this.userDataRoot, this.requestTimeoutMs);
    if (initialProbe.state === "live") {
      return this.acceptDiscoveredIdentity(initialProbe.identity);
    }
    if (initialProbe.state === "indeterminate") {
      throw new AgentHarnessServiceHostClientError(
        "SERVICE_HOST_OWNERSHIP_INDETERMINATE",
        initialProbe.error,
      );
    }

    const stopIntent = readBackgroundAgentIntent(this.userDataRoot);
    if (stopIntent.state === "explicit-stop") {
      throw new AgentHarnessServiceHostClientError(
        "BACKGROUND_AGENT_STOPPED_BY_USER",
        "Background Agent is stopped by user request. Start Background Agent to resume MCP-dependent work.",
      );
    }
    if (stopIntent.state === "invalid") {
      throw new AgentHarnessServiceHostClientError(
        "BACKGROUND_AGENT_STOP_INTENT_INVALID",
        `Background Agent remains stopped because its stop-intent record needs attention: ${stopIntent.error} Use Start Background Agent to clear it and continue.`,
      );
    }
    this.explicitStopState = "none";

    removeAgentHarnessServiceHostDescriptorAfterEndpointAbsence(this.userDataRoot);
    await this.launchServiceHost();
    const deadline = Date.now() + this.discoveryTimeoutMs;
    let lastError: unknown = null;
    while (Date.now() < deadline) {
      const probe = await probeAgentHarnessServiceHostEndpoint(this.userDataRoot, this.requestTimeoutMs);
      if (probe.state === "live") {
        return this.acceptDiscoveredIdentity(probe.identity);
      }
      if (probe.state === "indeterminate") {
        lastError = probe.error;
      }
      await delay(this.discoveryPollIntervalMs);
    }
    throw new AgentHarnessServiceHostClientError(
      "SERVICE_HOST_DISCOVERY_TIMEOUT",
      `Agent Harness Service Host did not become available within the bounded discovery deadline${lastError ? `: ${boundedMessage(lastError)}` : "."}`,
    );
  }

  private async acceptDiscoveredIdentity(
    identity: AgentHarnessServiceHostIdentity,
  ): Promise<AgentHarnessServiceHostIdentity> {
    const descriptor = createAgentHarnessServiceHostDescriptorFromIdentity(this.userDataRoot, identity);
    const reconciliationResult = await this.invokeWithDescriptor(descriptor, "reconcile-descriptor", null);
    let reconciled = normalizeAgentHarnessServiceHostIdentity(reconciliationResult);
    if (!reconciled ||
      reconciled.instanceId !== identity.instanceId ||
      reconciled.serviceHostProcessId !== identity.serviceHostProcessId) {
      throw new AgentHarnessServiceHostClientError(
        "SERVICE_HOST_DESCRIPTOR_RECONCILIATION_FAILED",
        "Live Service Host identity changed while discovery metadata was being reconciled.",
      );
    }
    const readinessDeadline = Date.now() + this.discoveryTimeoutMs;
    while (["starting", "resuming", "recovering"].includes(reconciled.lifecycleState) &&
      Date.now() < readinessDeadline) {
      await delay(this.discoveryPollIntervalMs);
      reconciled = await this.handshake(descriptor);
    }
    if (["starting", "resuming", "recovering"].includes(reconciled.lifecycleState)) {
      throw new AgentHarnessServiceHostClientError(
        "SERVICE_HOST_READINESS_TIMEOUT",
        "Service Host did not reach a stable lifecycle state within the bounded readiness deadline.",
      );
    }
    this.descriptor = descriptor;
    this.acceptLifecycleIdentity(reconciled);
    return reconciled;
  }

  private async ensureDescriptor(): Promise<AgentHarnessServiceHostDescriptor> {
    if (!this.descriptor) {
      await this.connect();
    }
    if (!this.descriptor) {
      throw new AgentHarnessServiceHostClientError(
        "SERVICE_HOST_UNAVAILABLE",
        "Agent Harness Service Host is unavailable.",
      );
    }
    return this.descriptor;
  }

  private async handshake(
    descriptor: AgentHarnessServiceHostDescriptor,
  ): Promise<AgentHarnessServiceHostIdentity> {
    const result = await this.invokeWithDescriptor(descriptor, "handshake", null);
    const identity = normalizeAgentHarnessServiceHostIdentity(result);
    if (!identity ||
      identity.instanceId !== descriptor.instanceId ||
      identity.serviceHostProcessId !== descriptor.serviceHostProcessId ||
      identity.runtimeBuildIdentity !== descriptor.runtimeBuildIdentity ||
      identity.controlProtocolVersion !== descriptor.controlProtocolVersion ||
      identity.descriptorSchemaVersion !== descriptor.schemaVersion) {
      throw new AgentHarnessServiceHostClientError(
        "SERVICE_HOST_HANDSHAKE_INVALID",
        "Agent Harness Service Host live handshake did not match its discovery descriptor.",
      );
    }
    return identity;
  }

  private async invoke<Operation extends AgentHarnessServiceHostOperation>(
    operation: Operation,
    payload: AgentHarnessServiceHostRequestPayloads[Operation],
  ): Promise<AgentHarnessServiceHostResponsePayloads[Operation]> {
    const descriptor = await this.ensureDescriptor();
    try {
      return await this.invokeWithDescriptor(descriptor, operation, payload);
    } catch (error) {
      if (!isRecoverableServiceHostTransportError(error)) {
        throw error;
      }
      await this.recoverAfterHostLoss(error);
      const recoveredDescriptor = await this.ensureDescriptor();
      return this.invokeWithDescriptor(recoveredDescriptor, operation, payload);
    }
  }

  private async invokeWithDescriptor<Operation extends AgentHarnessServiceHostOperation>(
    descriptor: AgentHarnessServiceHostDescriptor,
    operation: Operation,
    payload: AgentHarnessServiceHostRequestPayloads[Operation],
  ): Promise<AgentHarnessServiceHostResponsePayloads[Operation]> {
    const connection = await FramedControlConnection.connect(descriptor.controlAddress, this.requestTimeoutMs);
    try {
      const request = this.createRequest(descriptor, operation, payload);
      connection.write(request);
      const response = await connection.read(this.requestTimeoutMs);
      return this.acceptResponse(descriptor, request.requestId, operation, response);
    } finally {
      connection.close();
    }
  }

  private recoverAfterHostLoss(cause: unknown): Promise<AgentHarnessServiceHostIdentity> {
    if (this.recoveryPromise) {
      return this.recoveryPromise;
    }
    if (this.automaticHostRecoveryState === "failed") {
      return Promise.reject(this.recoveryLatchedError());
    }
    this.automaticHostRecoveryState = "recovering";
    this.lifecycleState = "recovering";
    this.lifecycleError = boundedMessage(cause);
    this.lifecycleIdentity = null;
    this.descriptor = null;
    this.recoveryPromise = (async () => {
      const identity = await this.discoverAndHandshake();
      const descriptor = this.descriptor;
      if (!descriptor) {
        throw new AgentHarnessServiceHostClientError(
          "SERVICE_HOST_RECOVERY_FAILED",
          "Recovered Service Host did not establish bounded discovery metadata.",
        );
      }
      this.acceptLifecycleIdentity(identity);
      this.automaticHostRecoveryState = "available";
      return identity;
    })()
      .catch((error) => {
        if (isBackgroundAgentStopSuppressionError(error)) {
          this.automaticHostRecoveryState = "available";
          this.descriptor = null;
          this.acceptExplicitStop(error);
          throw error;
        }
        const recoveryError = new AgentHarnessServiceHostClientError(
          "SERVICE_HOST_RECOVERY_FAILED",
          `Agent Harness Service Host recovery failed closed: ${boundedMessage(error)}`,
        );
        this.automaticHostRecoveryState = "failed";
        this.descriptor = null;
        this.markTransportUnavailable(recoveryError);
        throw recoveryError;
      })
      .finally(() => {
        this.recoveryPromise = null;
      });
    return this.recoveryPromise;
  }

  private lifecycleStatusProjection(): Omit<AgentHarnessServiceHostLifecycleStatus,
    "launchAtLogin" | "loginItemRegistered" | "executableWillLaunchAtLogin" |
    "startupRegistrationSupported" | "startupRegistrationScope"> {
    const identity = this.lifecycleIdentity;
    const restartRequired = Boolean(identity && this.expectedBuildIdentity &&
      identity.runtimeBuildIdentity !== this.expectedBuildIdentity);
    return {
      state: this.explicitStopState !== "none"
        ? "stopped-by-user"
        : restartRequired
        ? "restart-required"
        : this.lifecycleState,
      reason: restartRequired ? "build-generation-mismatch" : identity?.lifecycleReason ?? null,
      stateChangedAt: identity?.lifecycleStateChangedAt ?? null,
      powerEpoch: identity?.powerEpoch ?? 0,
      serviceHostProcessId: identity?.serviceHostProcessId ?? null,
      workerProcessId: identity?.workerProcessId ?? null,
      workerRecoveryState: identity?.workerRecoveryState ?? "idle",
      consecutiveHeartbeatMisses: identity?.consecutiveHeartbeatMisses ?? 0,
      runtimeBuildIdentity: identity?.runtimeBuildIdentity ?? null,
      expectedBuildIdentity: this.expectedBuildIdentity,
      restartRequired,
      lastControlledRestart: this.lastControlledRestart ?? identity?.lastControlledRestart ?? null,
      trayPresent: identity?.trayPresent ?? false,
      explicitlyStopped: this.explicitStopState !== "none",
      explicitStopState: this.explicitStopState,
      lastError: this.lifecycleError,
    };
  }

  private recoveryLatchedError(): AgentHarnessServiceHostClientError {
    return new AgentHarnessServiceHostClientError(
      "SERVICE_HOST_RECOVERY_FAILED",
      this.lifecycleError ?? "Agent Harness Service Host recovery failed closed for this desktop session.",
    );
  }

  private acceptLifecycleIdentity(identity: AgentHarnessServiceHostIdentity): void {
    this.lifecycleIdentity = identity;
    this.lifecycleState = identity.lifecycleState;
    this.lifecycleError = identity.workerRecoveryError;
    this.explicitStopState = "none";
  }

  private acceptExplicitStop(error: AgentHarnessServiceHostClientError): void {
    this.explicitStopState = error.code === "BACKGROUND_AGENT_STOP_INTENT_INVALID" ? "invalid" : "requested";
    this.lifecycleState = "unavailable";
    this.lifecycleIdentity = null;
    this.lifecycleError = this.explicitStopState === "invalid" ? error.message : null;
  }

  private createRequest<Operation extends AgentHarnessServiceHostOperation>(
    descriptor: AgentHarnessServiceHostDescriptor,
    operation: Operation,
    payload: AgentHarnessServiceHostRequestPayloads[Operation],
  ): AgentHarnessServiceHostRequest {
    return {
      protocolVersion: agentHarnessServiceHostControlProtocolVersion,
      kind: "request",
      requestId: randomUUID(),
      expectedInstanceId: descriptor.instanceId,
      operation,
      payload,
    } as Extract<AgentHarnessServiceHostRequest, { operation: Operation }>;
  }

  private acceptResponse<Operation extends AgentHarnessServiceHostOperation>(
    descriptor: AgentHarnessServiceHostDescriptor,
    requestId: string,
    operation: Operation,
    response: unknown,
  ): AgentHarnessServiceHostResponsePayloads[Operation] {
    if (!isAgentHarnessServiceHostResponse(response) ||
      response.requestId !== requestId ||
      response.operation !== operation ||
      response.instanceId !== descriptor.instanceId ||
      response.serviceHostProcessId !== descriptor.serviceHostProcessId) {
      throw this.invalidResponse("Service Host returned a stale, malformed, or mismatched response.");
    }
    if (!response.ok) {
      throw new AgentHarnessServiceHostClientError(response.error.code, response.error.message);
    }
    return response.result as AgentHarnessServiceHostResponsePayloads[Operation];
  }

  private acceptStatus(value: unknown): AgentHarnessStatus {
    if (!isAgentHarnessStatus(value)) {
      throw this.invalidResponse("Service Host returned an invalid Agent Harness status.");
    }
    this.cachedStatus = value;
    return value;
  }

  private invalidResponse(message: string): AgentHarnessServiceHostClientError {
    return new AgentHarnessServiceHostClientError("SERVICE_HOST_RESPONSE_INVALID", message);
  }

  private markTransportUnavailable(error: unknown): void {
    this.lifecycleState = "degraded";
    this.lifecycleIdentity = null;
    this.lifecycleError = boundedMessage(error);
    if (!this.cachedStatus) {
      return;
    }
    const message = boundedMessage(error);
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
      lastError: message,
      recentActivity: [`${new Date().toISOString()} ${message}`, ...this.cachedStatus.recentActivity].slice(0, 8),
    };
  }
}

export async function probeAgentHarnessServiceHostEndpoint(
  userDataRoot: string,
  timeoutMs = 2_000,
): Promise<AgentHarnessServiceHostEndpointProbe> {
  const address = getAgentHarnessServiceHostControlAddress(userDataRoot);
  let connection: FramedControlConnection | null = null;
  try {
    connection = await FramedControlConnection.connect(address, timeoutMs);
    const request: Extract<AgentHarnessServiceHostRequest, { operation: "handshake" }> = {
      protocolVersion: agentHarnessServiceHostControlProtocolVersion,
      kind: "request",
      requestId: randomUUID(),
      expectedInstanceId: null,
      operation: "handshake",
      payload: null,
    };
    connection.write(request);
    const response = await connection.read(timeoutMs);
    const identity = isAgentHarnessServiceHostResponse(response) && response.ok
      ? normalizeAgentHarnessServiceHostIdentity(response.result)
      : null;
    if (!isAgentHarnessServiceHostResponse(response) ||
      response.requestId !== request.requestId ||
      response.operation !== "handshake" ||
      !response.ok ||
      !identity ||
      response.instanceId !== identity.instanceId ||
      response.serviceHostProcessId !== identity.serviceHostProcessId) {
      return {
        state: "indeterminate",
        error: "The canonical Service Host endpoint is owned but did not return a valid ChampCity handshake.",
      };
    }
    return { state: "live", identity };
  } catch (error) {
    if (isEndpointDefinitelyAbsent(error)) {
      return { state: "absent" };
    }
    return {
      state: "indeterminate",
      error: `The canonical Service Host endpoint ownership could not be established: ${boundedMessage(error)}`,
    };
  } finally {
    connection?.close();
  }
}

class FramedControlConnection {
  private readonly queuedFrames: unknown[] = [];
  private readonly readers: Array<{ resolve: (value: unknown) => void; reject: (error: Error) => void }> = [];
  private buffered = "";
  private closedError: Error | null = null;

  private constructor(private readonly socket: Socket) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => this.receive(chunk));
    socket.on("error", (error) => this.fail(error));
    socket.on("close", () => this.fail(new Error("Service Host control connection closed.")));
  }

  static async connect(address: string, timeoutMs: number): Promise<FramedControlConnection> {
    const socket = net.createConnection(address);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("Service Host control connection timed out."));
      }, timeoutMs);
      socket.once("connect", () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    return new FramedControlConnection(socket);
  }

  write(value: AgentHarnessServiceHostRequest): void {
    if (this.closedError || this.socket.destroyed) {
      throw this.closedError ?? new Error("Service Host control connection is closed.");
    }
    this.socket.write(`${JSON.stringify(value)}\n`);
  }

  read(timeoutMs: number): Promise<unknown> {
    if (this.queuedFrames.length > 0) {
      return Promise.resolve(this.queuedFrames.shift());
    }
    if (this.closedError) {
      return Promise.reject(this.closedError);
    }
    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.readers.findIndex((reader) => reader.resolve === onResolve);
        if (index >= 0) {
          this.readers.splice(index, 1);
        }
        reject(new Error("Service Host control response timed out."));
      }, timeoutMs);
      const onResolve = (value: unknown): void => {
        clearTimeout(timeout);
        resolve(value);
      };
      const onReject = (error: Error): void => {
        clearTimeout(timeout);
        reject(error);
      };
      this.readers.push({ resolve: onResolve, reject: onReject });
    });
  }

  close(): void {
    this.socket.end();
    this.socket.destroy();
  }

  private receive(chunk: string): void {
    this.buffered += chunk;
    if (Buffer.byteLength(this.buffered, "utf8") > maximumControlFrameBytes) {
      this.socket.destroy(new Error("Service Host control response exceeded the bounded frame size."));
      return;
    }
    let newlineIndex = this.buffered.indexOf("\n");
    while (newlineIndex >= 0) {
      const frame = this.buffered.slice(0, newlineIndex);
      this.buffered = this.buffered.slice(newlineIndex + 1);
      if (frame.trim()) {
        try {
          this.deliver(JSON.parse(frame));
        } catch {
          this.socket.destroy(new Error("Service Host returned malformed control data."));
          return;
        }
      }
      newlineIndex = this.buffered.indexOf("\n");
    }
  }

  private deliver(value: unknown): void {
    const reader = this.readers.shift();
    if (reader) {
      reader.resolve(value);
    } else {
      this.queuedFrames.push(value);
    }
  }

  private fail(error: Error): void {
    if (this.closedError) {
      return;
    }
    this.closedError = error;
    for (const reader of this.readers.splice(0)) {
      reader.reject(error);
    }
  }
}

function boundedMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Agent Harness Service Host is unavailable.";
}

function isEndpointDefinitelyAbsent(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }
  return ["ENOENT", "ECONNREFUSED"].includes(String(error.code));
}

function isRecoverableServiceHostTransportError(error: unknown): boolean {
  if (!(error instanceof AgentHarnessServiceHostClientError)) {
    return true;
  }
  return [
    "SERVICE_HOST_HANDSHAKE_INVALID",
    "SERVICE_HOST_IDENTITY_MISMATCH",
    "SERVICE_HOST_RESPONSE_INVALID",
  ].includes(error.code);
}

function isBackgroundAgentStopSuppressionError(
  error: unknown,
): error is AgentHarnessServiceHostClientError {
  return error instanceof AgentHarnessServiceHostClientError && [
    "BACKGROUND_AGENT_STOPPED_BY_USER",
    "BACKGROUND_AGENT_STOP_INTENT_INVALID",
  ].includes(error.code);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
