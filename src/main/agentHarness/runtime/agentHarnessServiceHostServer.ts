import fs from "node:fs";
import net, { type Server, type Socket } from "node:net";
import { AgentHarnessController } from "./agentHarnessController";
import type { AgentHarnessServiceHostDescriptor } from "./agentHarnessServiceHostDescriptor";
import type { AgentHarnessServiceLifecycleCoordinator } from "./agentHarnessServiceLifecycle";
import {
  agentHarnessServiceHostControlProtocolVersion,
  isAgentHarnessServiceHostRequest,
  type AgentHarnessServiceHostOperation,
  type AgentHarnessServiceHostRequest,
  type AgentHarnessServiceHostResponse,
  type AgentHarnessServiceHostResponsePayloads,
} from "./agentHarnessServiceHostProtocol";

const maximumControlFrameBytes = 4 * 1024 * 1024;

interface AgentHarnessServiceHostServerOptions {
  descriptor: AgentHarnessServiceHostDescriptor;
  controller: AgentHarnessController;
  onDescriptorReconciliation: () => void;
  onShutdownRequested: () => void;
  onUserExitRequested: () => Promise<void>;
  isTrayPresent: () => boolean;
  lifecycle: AgentHarnessServiceLifecycleCoordinator;
}

export class AgentHarnessServiceHostServer {
  private readonly descriptor: AgentHarnessServiceHostDescriptor;
  private readonly controller: AgentHarnessController;
  private readonly onShutdownRequested: () => void;
  private readonly onDescriptorReconciliation: () => void;
  private readonly onUserExitRequested: () => Promise<void>;
  private readonly isTrayPresent: () => boolean;
  private readonly lifecycle: AgentHarnessServiceLifecycleCoordinator;
  private readonly sockets = new Set<Socket>();
  private server: Server | null = null;

  constructor(options: AgentHarnessServiceHostServerOptions) {
    this.descriptor = options.descriptor;
    this.controller = options.controller;
    this.onDescriptorReconciliation = options.onDescriptorReconciliation;
    this.onShutdownRequested = options.onShutdownRequested;
    this.onUserExitRequested = options.onUserExitRequested;
    this.isTrayPresent = options.isTrayPresent;
    this.lifecycle = options.lifecycle;
  }

  async listen(): Promise<void> {
    if (this.server) {
      return;
    }
    const server = net.createServer((socket) => this.acceptConnection(socket));
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => {
        server.off("listening", onListening);
        if (this.server === server) {
          this.server = null;
        }
        reject(error);
      };
      const onListening = (): void => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(this.descriptor.controlAddress);
    });
    if (process.platform !== "win32") {
      fs.chmodSync(this.descriptor.controlAddress, 0o600);
    }
  }

  async close(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    const server = this.server;
    this.server = null;
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => {
      try {
        server.close(() => resolve());
      } catch {
        resolve();
      }
    });
  }

  private acceptConnection(socket: Socket): void {
    this.sockets.add(socket);
    socket.setEncoding("utf8");
    let buffered = "";
    let queue = Promise.resolve();
    socket.on("data", (chunk: string) => {
      buffered += chunk;
      if (Buffer.byteLength(buffered, "utf8") > maximumControlFrameBytes) {
        socket.destroy();
        return;
      }
      let newlineIndex = buffered.indexOf("\n");
      while (newlineIndex >= 0) {
        const frame = buffered.slice(0, newlineIndex);
        buffered = buffered.slice(newlineIndex + 1);
        if (frame.trim()) {
          queue = queue.then(() => this.dispatchFrame(socket, frame)).catch(() => undefined);
        }
        newlineIndex = buffered.indexOf("\n");
      }
    });
    socket.on("close", () => {
      this.sockets.delete(socket);
    });
    socket.on("error", () => {
      // Connection failures are projected through request timeouts and identity fencing.
    });
  }

  private async dispatchFrame(socket: Socket, frame: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(frame);
    } catch {
      socket.destroy();
      return;
    }
    if (!isAgentHarnessServiceHostRequest(parsed)) {
      socket.destroy();
      return;
    }
    const request = parsed;
    if (request.operation !== "handshake" && request.expectedInstanceId !== this.descriptor.instanceId) {
      this.writeFailure(socket, request, "SERVICE_HOST_IDENTITY_MISMATCH", "Service Host instance identity did not match.");
      return;
    }
    const lifecycleRecoveryOperation = request.operation === "agent-harness-start" ||
      request.operation === "agent-harness-restart";
    if (!this.lifecycle.admitsControlWork() && !lifecycleRecoveryOperation && ![
      "handshake",
      "reconcile-descriptor",
      "agent-harness-status",
      "list-registered-workspaces",
      "service-host-shutdown",
      "background-agent-user-exit",
      "service-host-controlled-restart",
    ].includes(request.operation)) {
      this.writeFailure(
        socket,
        request,
        "SERVICE_HOST_RECOVERY_IN_PROGRESS",
        "Service Host is not admitting work during suspend or recovery.",
      );
      return;
    }
    try {
      const result = await this.executeRequest(request);
      this.writeSuccess(socket, request, result, request.operation === "service-host-shutdown");
    } catch (error) {
      this.writeFailure(
        socket,
        request,
        boundedErrorCode(error),
        boundedMessage(error),
      );
    }
  }

  private async executeRequest(
    request: AgentHarnessServiceHostRequest,
  ): Promise<AgentHarnessServiceHostResponsePayloads[AgentHarnessServiceHostOperation]> {
    switch (request.operation) {
      case "handshake":
        return this.identity();
      case "reconcile-descriptor":
        this.onDescriptorReconciliation();
        return this.identity();
      case "agent-harness-status":
        return this.diagnosticStatus();
      case "agent-harness-start": {
        return this.lifecycle.start();
      }
      case "agent-harness-stop":
        return this.controller.stop();
      case "agent-harness-restart": {
        return this.lifecycle.restart();
      }
      case "agent-harness-save-configuration":
        return this.controller.saveConfiguration(request.payload);
      case "agent-harness-import-legacy-oauth-clients":
        return this.controller.importLegacyOAuthClientRegistry(request.payload.source);
      case "list-registered-workspaces":
        return this.controller.listRegisteredWorkspaces();
      case "register-workspace":
        return this.controller.registerWorkspace(request.payload.workspaceRoot);
      case "unregister-workspace":
        return this.controller.unregisterWorkspace(request.payload.workspaceId);
      case "service-host-shutdown":
        return null;
      case "background-agent-user-exit":
        await this.onUserExitRequested();
        return null;
      case "service-host-controlled-restart":
        if (!/^sha256:[0-9a-f]{64}$/i.test(request.payload.expectedBuildIdentity)) {
          throw Object.assign(new Error("Controlled restart requires a valid expected build identity."), {
            code: "SERVICE_HOST_BUILD_IDENTITY_INVALID",
          });
        }
        return this.lifecycle.prepareControlledRestart();
    }
  }

  private identity(): AgentHarnessServiceHostResponsePayloads["handshake"] {
    const recovery = this.controller.recoveryStatus();
    this.lifecycle.observeControllerRecovery(recovery.state, recovery.lastError);
    const lifecycle = this.lifecycle.snapshot();
    return {
      descriptorSchemaVersion: this.descriptor.schemaVersion,
      controlProtocolVersion: agentHarnessServiceHostControlProtocolVersion,
      serviceHostProcessId: process.pid,
      workerProcessId: this.controller.workerProcessId(),
      instanceId: this.descriptor.instanceId,
      runtimeBuildIdentity: this.descriptor.runtimeBuildIdentity,
      lifecycleState: lifecycle.state,
      lifecycleReason: lifecycle.reason,
      lifecycleStateChangedAt: lifecycle.stateChangedAt,
      powerEpoch: lifecycle.powerEpoch,
      consecutiveHeartbeatMisses: lifecycle.consecutiveHeartbeatMisses,
      workerRecoveryState: lifecycle.workerRecoveryState === "idle" ? recovery.state : lifecycle.workerRecoveryState,
      workerRecoveryError: lifecycle.lastError ?? recovery.lastError,
      lastControlledRestart: lifecycle.lastControlledRestart,
      lastSuspendAt: lifecycle.lastSuspendAt,
      lastResumeAt: lifecycle.lastResumeAt,
      lastRecoveryStartedAt: lifecycle.lastRecoveryStartedAt,
      lastReadyAt: lifecycle.lastReadyAt,
      workerRestartCount: recovery.workerRestartCount,
      lastWorkerRestartReason: recovery.lastWorkerRestartReason,
      trayPresent: this.isTrayPresent(),
    };
  }

  private async diagnosticStatus(): Promise<AgentHarnessServiceHostResponsePayloads["agent-harness-status"]> {
    const status = await this.controller.status();
    const recovery = this.controller.recoveryStatus();
    const lifecycle = this.lifecycle.snapshot();
    return {
      ...status,
      operationalDiagnostics: {
        ...status.operationalDiagnostics,
        lifecycle: {
          lastSuspendAt: lifecycle.lastSuspendAt,
          lastResumeAt: lifecycle.lastResumeAt,
          lastRecoveryStartedAt: lifecycle.lastRecoveryStartedAt,
          lastReadyAt: lifecycle.lastReadyAt,
          workerRestartCount: recovery.workerRestartCount,
          lastWorkerRestartReason: recovery.lastWorkerRestartReason,
        },
      },
    };
  }

  private writeSuccess(
    socket: Socket,
    request: AgentHarnessServiceHostRequest,
    result: AgentHarnessServiceHostResponsePayloads[AgentHarnessServiceHostOperation],
    shutdownRequested: boolean,
  ): void {
    const response = {
      protocolVersion: agentHarnessServiceHostControlProtocolVersion,
      kind: "response",
      requestId: request.requestId,
      operation: request.operation,
      ok: true,
      serviceHostProcessId: process.pid,
      workerProcessId: this.controller.workerProcessId(),
      instanceId: this.descriptor.instanceId,
      result,
    } as AgentHarnessServiceHostResponse;
    socket.write(`${JSON.stringify(response)}\n`, () => {
      if (shutdownRequested ||
        request.operation === "background-agent-user-exit" ||
        request.operation === "service-host-controlled-restart") {
        this.onShutdownRequested();
      }
    });
  }

  private writeFailure(
    socket: Socket,
    request: AgentHarnessServiceHostRequest,
    code: string,
    message: string,
  ): void {
    const response: AgentHarnessServiceHostResponse = {
      protocolVersion: agentHarnessServiceHostControlProtocolVersion,
      kind: "response",
      requestId: request.requestId,
      operation: request.operation,
      ok: false,
      serviceHostProcessId: process.pid,
      workerProcessId: this.controller.workerProcessId(),
      instanceId: this.descriptor.instanceId,
      error: { code, message: boundedMessage(message) },
    };
    socket.write(`${JSON.stringify(response)}\n`);
  }
}

function boundedErrorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code.slice(0, 100)
    : "SERVICE_HOST_OPERATION_FAILED";
}

function boundedMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Service Host control operation failed.";
}
