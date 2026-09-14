import { utilityProcess, type UtilityProcess } from "electron";
import type { CodexRuntimeInitializer } from "./codexRuntimeManager";
import type { CodexRuntimeInitializationResult } from "./codexRuntimeInitialization";
import {
  codexRuntimeInitializerProtocolVersion,
  isCodexRuntimeInitializerResponse,
  type CodexRuntimeInitializeRequest,
  type CodexRuntimeShutdownRequest,
} from "./codexRuntimeInitializerProtocol";

interface UtilityProcessBoundary {
  readonly pid: number | undefined;
  on(event: "message", listener: (message: unknown) => void): this;
  once(event: "spawn", listener: () => void): this;
  once(event: "exit", listener: (code: number) => void): this;
  off(event: "spawn", listener: () => void): this;
  off(event: "exit", listener: (code: number) => void): this;
  postMessage(message: unknown): void;
  kill(): boolean;
}

interface CodexRuntimeInitializerClientOptions {
  workerEntryPath: string;
  userDataRoot: string;
  initializationTimeoutMs?: number;
  spawnTimeoutMs?: number;
  shutdownTimeoutMs?: number;
  forkWorker?: () => UtilityProcessBoundary;
}

export interface CodexRuntimeInitializerDiagnostics {
  requestCount: number;
  workerProcessId: number | null;
  lastWorkerProcessId: number | null;
  lifecycle: "new" | "spawning" | "running" | "succeeded" | "failed" | "shutting-down" | "closed";
  workerSpawnedAt: number | null;
  responseReceivedAt: number | null;
  workerExitedAt: number | null;
}

export class CodexRuntimeInitializerClient implements CodexRuntimeInitializer {
  private readonly workerEntryPath: string;
  private readonly userDataRoot: string;
  private readonly initializationTimeoutMs: number;
  private readonly spawnTimeoutMs: number;
  private readonly shutdownTimeoutMs: number;
  private readonly forkWorker: () => UtilityProcessBoundary;
  private worker: UtilityProcessBoundary | null = null;
  private initialization: Promise<CodexRuntimeInitializationResult> | null = null;
  private requestCount = 0;
  private lastWorkerProcessId: number | null = null;
  private lifecycle: CodexRuntimeInitializerDiagnostics["lifecycle"] = "new";
  private workerSpawnedAt: number | null = null;
  private responseReceivedAt: number | null = null;
  private workerExitedAt: number | null = null;
  private shutdownRequested = false;

  constructor(options: CodexRuntimeInitializerClientOptions) {
    this.workerEntryPath = options.workerEntryPath;
    this.userDataRoot = options.userDataRoot;
    this.initializationTimeoutMs = options.initializationTimeoutMs ?? 360_000;
    this.spawnTimeoutMs = options.spawnTimeoutMs ?? 10_000;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? 5_000;
    this.forkWorker = options.forkWorker ?? (() => utilityProcess.fork(this.workerEntryPath, [], {
      serviceName: "ChampCity A/I Managed Codex Initializer",
      stdio: "ignore",
    }) as UtilityProcess);
  }

  initialize(): Promise<CodexRuntimeInitializationResult> {
    if (!this.initialization) {
      this.initialization = this.initializeOnce();
    }
    return this.initialization;
  }

  diagnostics(): CodexRuntimeInitializerDiagnostics {
    return {
      requestCount: this.requestCount,
      workerProcessId: this.worker?.pid ?? null,
      lastWorkerProcessId: this.lastWorkerProcessId,
      lifecycle: this.lifecycle,
      workerSpawnedAt: this.workerSpawnedAt,
      responseReceivedAt: this.responseReceivedAt,
      workerExitedAt: this.workerExitedAt,
    };
  }

  async shutdown(): Promise<void> {
    this.shutdownRequested = true;
    const worker = this.worker;
    if (!worker) {
      this.lifecycle = "closed";
      return;
    }
    this.lifecycle = "shutting-down";
    const exit = this.waitForExit(worker, this.shutdownTimeoutMs);
    const request: CodexRuntimeShutdownRequest = {
      protocolVersion: codexRuntimeInitializerProtocolVersion,
      kind: "shutdown",
    };
    try {
      worker.postMessage(request);
    } catch {
      // Bounded termination below remains required when graceful cancellation cannot be sent.
    }
    if (!(await exit)) {
      try {
        worker.kill();
      } catch {
        // Exit confirmation below determines the bounded shutdown result.
      }
      if (!(await this.waitForExit(worker, this.shutdownTimeoutMs))) {
        throw new Error("Managed Codex initializer utility worker did not exit during bounded shutdown.");
      }
    }
    if (this.worker === worker) {
      this.worker = null;
    }
    this.lifecycle = "closed";
  }

  private async initializeOnce(): Promise<CodexRuntimeInitializationResult> {
    this.lifecycle = "spawning";
    const worker = this.forkWorker();
    this.worker = worker;
    const response = this.waitForResponse(worker);
    void response.catch(() => undefined);
    try {
      await this.waitForSpawn(worker);
      if (this.shutdownRequested) {
        throw new Error("Managed Codex initializer is shutting down.");
      }
      if (!worker.pid || worker.pid === process.pid) {
        throw new Error("Managed Codex initializer did not establish a distinct utility-process identity.");
      }
      this.lastWorkerProcessId = worker.pid;
      this.workerSpawnedAt = Date.now();
      this.lifecycle = "running";
      const request: CodexRuntimeInitializeRequest = {
        protocolVersion: codexRuntimeInitializerProtocolVersion,
        kind: "initialize",
        userDataRoot: this.userDataRoot,
      };
      this.requestCount += 1;
      worker.postMessage(request);
      const result = await response;
      this.lifecycle = "succeeded";
      return result;
    } catch (error) {
      if (!this.shutdownRequested) {
        this.lifecycle = "failed";
      }
      try {
        worker.kill();
      } catch {
        // The worker may already have exited.
      }
      throw error;
    }
  }

  private waitForResponse(worker: UtilityProcessBoundary): Promise<CodexRuntimeInitializationResult> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (
        action: () => void,
      ): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        action();
      };
      const timeout = setTimeout(() => finish(() => reject(
        new Error("Managed Codex initializer exceeded its bounded initialization deadline."),
      )), this.initializationTimeoutMs);

      worker.on("message", (message: unknown) => {
        if (!isCodexRuntimeInitializerResponse(message) || message.workerProcessId !== worker.pid) {
          finish(() => reject(new Error("Managed Codex initializer returned an invalid response.")));
          return;
        }
        this.responseReceivedAt = Date.now();
        if (message.kind === "failure") {
          finish(() => reject(new Error(message.error.message)));
          return;
        }
        finish(() => resolve(structuredClone(message.result)));
      });
      worker.once("exit", (code) => {
        this.workerExitedAt = Date.now();
        if (this.worker === worker) {
          this.worker = null;
        }
        finish(() => reject(new Error(
          `Managed Codex initializer exited before producing a result (exit code ${code}).`,
        )));
      });
    });
  }

  private waitForSpawn(worker: UtilityProcessBoundary): Promise<void> {
    if (worker.pid) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.off("spawn", onSpawn);
        reject(new Error("Managed Codex initializer utility worker did not spawn within the bounded deadline."));
      }, this.spawnTimeoutMs);
      const onSpawn = (): void => {
        clearTimeout(timeout);
        resolve();
      };
      worker.once("spawn", onSpawn);
    });
  }

  private waitForExit(worker: UtilityProcessBoundary, timeoutMs: number): Promise<boolean> {
    if (worker.pid === undefined) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
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
