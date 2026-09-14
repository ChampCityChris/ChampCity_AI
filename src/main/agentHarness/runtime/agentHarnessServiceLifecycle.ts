import type {
  AgentHarnessControlledRestartDisposition,
  AgentHarnessServiceLifecycleState,
  AgentHarnessServiceRecoveryReason,
  AgentHarnessStatus,
} from "../../../shared/workspaceContracts";
import type { AgentHarnessWorkerHeartbeat } from "./agentHarnessProcessProtocol";

export interface AgentHarnessLifecycleController {
  workerProcessId(): number | null;
  isRuntimeDesiredRunning?(): boolean;
  start(): Promise<AgentHarnessStatus>;
  restart(): Promise<AgentHarnessStatus>;
  heartbeat(deadlineMs?: number): Promise<AgentHarnessWorkerHeartbeat>;
  prepareSuspend(powerEpoch: number, deadlineMs?: number): Promise<void>;
  reconcileAfterResume(powerEpoch: number, deadlineMs?: number): Promise<AgentHarnessWorkerHeartbeat>;
  replaceWorker(reason: string): Promise<AgentHarnessWorkerHeartbeat>;
  prepareControlledRestart(drainDeadlineMs: number): Promise<AgentHarnessControlledRestartDisposition>;
}

export interface AgentHarnessServiceLifecyclePolicy {
  heartbeatIntervalMs: number;
  heartbeatDeadlineMs: number;
  heartbeatMissThreshold: number;
  resumeReadinessTargetMs: number;
  resumeGraceMs: number;
  recoveryAttemptLimit: number;
  recoveryBackoffMs: number[];
  controlledRestartDrainMs: number;
}

export const defaultAgentHarnessServiceLifecyclePolicy: AgentHarnessServiceLifecyclePolicy = {
  heartbeatIntervalMs: 30_000,
  heartbeatDeadlineMs: 2_000,
  heartbeatMissThreshold: 3,
  resumeReadinessTargetMs: 10_000,
  resumeGraceMs: 2_000,
  recoveryAttemptLimit: 3,
  recoveryBackoffMs: [250, 1_000, 3_000],
  controlledRestartDrainMs: 2_000,
};

export interface AgentHarnessServiceLifecycleSnapshot {
  state: AgentHarnessServiceLifecycleState;
  reason: AgentHarnessServiceRecoveryReason | null;
  stateChangedAt: string;
  powerEpoch: number;
  consecutiveHeartbeatMisses: number;
  workerRecoveryState: "idle" | "recovering" | "circuit-open";
  lastError: string | null;
  lastControlledRestart: AgentHarnessControlledRestartDisposition | null;
  lastSuspendAt: string | null;
  lastResumeAt: string | null;
  lastRecoveryStartedAt: string | null;
  lastReadyAt: string | null;
}

interface AgentHarnessServiceLifecycleOptions {
  controller: AgentHarnessLifecycleController;
  policy?: Partial<AgentHarnessServiceLifecyclePolicy>;
  now?: () => number;
  delay?: (milliseconds: number) => Promise<void>;
}

export class AgentHarnessServiceLifecycleCoordinator {
  private readonly controller: AgentHarnessLifecycleController;
  private readonly policy: AgentHarnessServiceLifecyclePolicy;
  private readonly now: () => number;
  private readonly wait: (milliseconds: number) => Promise<void>;
  private state: AgentHarnessServiceLifecycleState = "starting";
  private reason: AgentHarnessServiceRecoveryReason | null = "startup";
  private stateChangedAt: string;
  private powerEpoch = 0;
  private consecutiveHeartbeatMisses = 0;
  private recoveryState: "idle" | "recovering" | "circuit-open" = "idle";
  private lastError: string | null = null;
  private lastControlledRestart: AgentHarnessControlledRestartDisposition | null = null;
  private lastSuspendAt: string | null = null;
  private lastResumeAt: string | null = null;
  private lastRecoveryStartedAt: string | null = null;
  private lastReadyAt: string | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private resumePromise: Promise<AgentHarnessServiceLifecycleSnapshot> | null = null;
  private suspendPromise: Promise<AgentHarnessServiceLifecycleSnapshot> | null = null;
  private recoveryPromise: Promise<AgentHarnessWorkerHeartbeat> | null = null;
  private resumeGraceUntil = 0;
  private transitionRevision = 0;
  private nextExplicitRecoveryId = 0;
  private activeExplicitRecoveryId: number | null = null;
  private readonly listeners = new Set<(snapshot: AgentHarnessServiceLifecycleSnapshot) => void>();

  constructor(options: AgentHarnessServiceLifecycleOptions) {
    this.controller = options.controller;
    this.policy = validatePolicy({ ...defaultAgentHarnessServiceLifecyclePolicy, ...options.policy });
    this.now = options.now ?? Date.now;
    this.wait = options.delay ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.stateChangedAt = new Date(this.now()).toISOString();
  }

  markReady(reason: AgentHarnessServiceRecoveryReason = "startup"): void {
    this.consecutiveHeartbeatMisses = 0;
    this.recoveryState = "idle";
    this.lastError = null;
    this.transition("ready", reason);
  }

  startSupervision(): void {
    if (this.heartbeatTimer) {
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      void this.superviseNow();
    }, this.policy.heartbeatIntervalMs);
    this.heartbeatTimer.unref();
  }

  stopSupervision(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  subscribe(listener: (snapshot: AgentHarnessServiceLifecycleSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  handleSuspend(): Promise<AgentHarnessServiceLifecycleSnapshot> {
    if (this.suspendPromise) {
      return this.suspendPromise;
    }
    if (["suspending", "suspended", "stopping"].includes(this.state)) {
      return Promise.resolve(this.snapshot());
    }
    this.suspendPromise = this.suspendExclusive().finally(() => {
      this.suspendPromise = null;
    });
    return this.suspendPromise;
  }

  markDegraded(reason: AgentHarnessServiceRecoveryReason, error: unknown): void {
    this.degrade(reason, error);
  }

  observeControllerRecovery(
    state: "idle" | "recovering" | "circuit-open",
    error: string | null,
  ): void {
    if (this.activeExplicitRecoveryId !== null) {
      return;
    }
    if (["suspending", "suspended", "resuming", "stopping"].includes(this.state)) {
      return;
    }
    if (state === "circuit-open") {
      this.recoveryState = "circuit-open";
      this.degrade("worker-recovery-exhausted", error ?? "Worker recovery circuit opened.");
      return;
    }
    if (state === "recovering" && this.state === "ready") {
      this.recoveryState = "recovering";
      this.lastError = error;
      this.transition("recovering", "worker-exited");
      return;
    }
    if (state === "idle" && this.state === "recovering" && this.reason === "worker-exited") {
      this.markReady("worker-exited");
    }
  }

  private async suspendExclusive(): Promise<AgentHarnessServiceLifecycleSnapshot> {
    this.transition("suspending", "power-suspend");
    try {
      await this.controller.prepareSuspend(this.powerEpoch, this.policy.heartbeatDeadlineMs);
    } catch (error) {
      this.lastError = boundedMessage(error);
    }
    this.transition("suspended", "power-suspend");
    return this.snapshot();
  }

  handleResume(): Promise<AgentHarnessServiceLifecycleSnapshot> {
    if (this.resumePromise) {
      return this.resumePromise;
    }
    this.resumePromise = this.reconcileResumeExclusive()
      .finally(() => {
        this.resumePromise = null;
      });
    return this.resumePromise;
  }

  start(): Promise<AgentHarnessStatus> {
    return this.runExplicitRecovery("agent-harness-start", () => this.controller.start());
  }

  restart(): Promise<AgentHarnessStatus> {
    return this.runExplicitRecovery("agent-harness-restart", () => this.controller.restart());
  }

  async superviseNow(): Promise<AgentHarnessServiceLifecycleSnapshot> {
    if (["suspending", "suspended", "resuming", "recovering", "stopping"].includes(this.state) ||
      this.now() < this.resumeGraceUntil) {
      return this.snapshot();
    }
    try {
      const heartbeat = await this.controller.heartbeat(this.policy.heartbeatDeadlineMs);
      if (!this.heartbeatConfirmsDesiredReadiness(heartbeat)) {
        throw new Error("Worker heartbeat did not satisfy desired MCP runtime and workspace-registry readiness.");
      }
      this.consecutiveHeartbeatMisses = 0;
      this.lastError = null;
      if (this.state === "degraded") {
        this.markReady("heartbeat-timeout");
      }
    } catch (error) {
      this.consecutiveHeartbeatMisses += 1;
      this.reason = "heartbeat-timeout";
      this.lastError = boundedMessage(error);
      if (this.consecutiveHeartbeatMisses >= this.policy.heartbeatMissThreshold) {
        this.transition("recovering", "heartbeat-miss-threshold");
        try {
          await this.recoverWorker("heartbeat-miss-threshold");
          this.markReady("heartbeat-miss-threshold");
        } catch (recoveryError) {
          this.degrade("worker-recovery-exhausted", recoveryError);
        }
      }
    }
    return this.snapshot();
  }

  async prepareControlledRestart(): Promise<AgentHarnessControlledRestartDisposition> {
    this.transition("stopping", "controlled-restart");
    const disposition = await this.controller.prepareControlledRestart(this.policy.controlledRestartDrainMs);
    this.lastControlledRestart = disposition;
    if (disposition.outcome === "deadline-exceeded") {
      this.reason = "controlled-restart-drain-timeout";
    }
    return disposition;
  }

  markStopping(): void {
    this.stopSupervision();
    this.transition("stopping", "host-stopping");
  }

  admitsControlWork(): boolean {
    return this.state === "ready";
  }

  snapshot(): AgentHarnessServiceLifecycleSnapshot {
    return {
      state: this.state,
      reason: this.reason,
      stateChangedAt: this.stateChangedAt,
      powerEpoch: this.powerEpoch,
      consecutiveHeartbeatMisses: this.consecutiveHeartbeatMisses,
      workerRecoveryState: this.recoveryState,
      lastError: this.lastError,
      lastControlledRestart: this.lastControlledRestart,
      lastSuspendAt: this.lastSuspendAt,
      lastResumeAt: this.lastResumeAt,
      lastRecoveryStartedAt: this.lastRecoveryStartedAt,
      lastReadyAt: this.lastReadyAt,
    };
  }

  private async reconcileResumeExclusive(): Promise<AgentHarnessServiceLifecycleSnapshot> {
    if (this.suspendPromise) {
      await this.suspendPromise;
    }
    this.powerEpoch += 1;
    this.transition("resuming", "resume-reset");
    const startedAt = this.now();
    try {
      const heartbeat = await withDeadline(
        this.controller.reconcileAfterResume(this.powerEpoch, this.policy.heartbeatDeadlineMs),
        this.policy.heartbeatDeadlineMs,
        "Resume reconciliation heartbeat exceeded its strict deadline.",
      );
      if (!this.heartbeatConfirmsDesiredReadiness(heartbeat) || heartbeat.powerEpoch !== this.powerEpoch) {
        throw new Error("Resume reconciliation did not confirm current-epoch desired runtime and workspace-registry readiness.");
      }
      this.resumeGraceUntil = this.now() + this.policy.resumeGraceMs;
      this.markReady("resume-reset");
    } catch (error) {
      this.reason = isDeadlineError(error) ? "resume-liveness-timeout" : "resume-readiness-failed";
      this.lastError = boundedMessage(error);
      this.transition("recovering", this.reason);
      try {
        const remainingTargetMs = Math.max(1, this.policy.resumeReadinessTargetMs - (this.now() - startedAt));
        const heartbeat = await withDeadline(
          this.recoverWorker(this.reason),
          remainingTargetMs,
          "Worker recovery exceeded the post-resume readiness target.",
        );
        if (!this.heartbeatConfirmsDesiredReadiness(heartbeat)) {
          throw new Error("Replacement worker did not report desired runtime and workspace-registry readiness.");
        }
        this.resumeGraceUntil = this.now() + this.policy.resumeGraceMs;
        this.markReady(this.reason);
      } catch (recoveryError) {
        this.degrade("worker-recovery-exhausted", recoveryError);
      }
    }
    if (this.state !== "ready" || this.now() - startedAt > this.policy.resumeReadinessTargetMs) {
      if (this.state !== "degraded") {
        this.degrade("resume-readiness-failed", "MCP readiness exceeded the 10-second post-resume target.");
      }
    }
    return this.snapshot();
  }

  private async runExplicitRecovery(
    operation: "agent-harness-start" | "agent-harness-restart",
    execute: () => Promise<AgentHarnessStatus>,
  ): Promise<AgentHarnessStatus> {
    if (!["ready", "degraded"].includes(this.state) || this.activeExplicitRecoveryId !== null) {
      throw Object.assign(
        new Error("Service Host lifecycle recovery is already in progress."),
        { code: "SERVICE_HOST_RECOVERY_IN_PROGRESS" },
      );
    }

    const recoveryId = ++this.nextExplicitRecoveryId;
    const admittedPowerEpoch = this.powerEpoch;
    this.activeExplicitRecoveryId = recoveryId;
    this.recoveryState = "recovering";
    this.transition("recovering", "worker-exited");
    const admittedTransitionRevision = this.transitionRevision;

    try {
      const status = await execute();
      if (this.isCurrentExplicitRecovery(recoveryId, admittedPowerEpoch, admittedTransitionRevision)) {
        if (status.state === "running") {
          this.markReady(operation === "agent-harness-start" ? "startup" : "worker-exited");
        } else {
          this.recoveryState = "idle";
          this.degrade(
            "worker-recovery-exhausted",
            status.lastError ?? "Explicit Agent Harness recovery did not establish a running runtime.",
          );
        }
      }
      return status;
    } catch (error) {
      if (this.isCurrentExplicitRecovery(recoveryId, admittedPowerEpoch, admittedTransitionRevision)) {
        this.recoveryState = "idle";
        this.degrade("worker-recovery-exhausted", error);
      }
      throw error;
    } finally {
      if (this.activeExplicitRecoveryId === recoveryId) {
        this.activeExplicitRecoveryId = null;
      }
    }
  }

  private heartbeatConfirmsDesiredReadiness(heartbeat: AgentHarnessWorkerHeartbeat): boolean {
    const runtimeDesiredRunning = this.controller.isRuntimeDesiredRunning?.() ?? true;
    return heartbeat.workspaceRegistryReady && (!runtimeDesiredRunning || heartbeat.runtimeReady);
  }

  private isCurrentExplicitRecovery(
    recoveryId: number,
    admittedPowerEpoch: number,
    admittedTransitionRevision: number,
  ): boolean {
    return this.activeExplicitRecoveryId === recoveryId &&
      this.powerEpoch === admittedPowerEpoch &&
      this.transitionRevision === admittedTransitionRevision &&
      this.state === "recovering";
  }

  private recoverWorker(reason: AgentHarnessServiceRecoveryReason): Promise<AgentHarnessWorkerHeartbeat> {
    if (this.recoveryPromise) {
      return this.recoveryPromise;
    }
    this.recoveryState = "recovering";
    this.recoveryPromise = this.recoverWorkerExclusive(reason)
      .finally(() => {
        this.recoveryPromise = null;
      });
    return this.recoveryPromise;
  }

  private async recoverWorkerExclusive(reason: AgentHarnessServiceRecoveryReason): Promise<AgentHarnessWorkerHeartbeat> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.policy.recoveryAttemptLimit; attempt += 1) {
      const backoff = this.policy.recoveryBackoffMs[
        Math.min(attempt, this.policy.recoveryBackoffMs.length - 1)
      ] ?? 0;
      if (backoff > 0) {
        this.reason = "worker-restart-backoff";
        await this.wait(backoff);
      }
      try {
        const heartbeat = await this.controller.replaceWorker(reason);
        this.recoveryState = "idle";
        this.consecutiveHeartbeatMisses = 0;
        return heartbeat;
      } catch (error) {
        lastError = error;
        this.lastError = boundedMessage(error);
      }
    }
    this.recoveryState = "circuit-open";
    throw lastError ?? new Error("Worker recovery circuit opened.");
  }

  private degrade(reason: AgentHarnessServiceRecoveryReason, error: unknown): void {
    this.lastError = boundedMessage(error);
    this.transition("degraded", reason);
  }

  private transition(state: AgentHarnessServiceLifecycleState, reason: AgentHarnessServiceRecoveryReason | null): void {
    this.transitionRevision += 1;
    this.state = state;
    this.reason = reason;
    this.stateChangedAt = new Date(this.now()).toISOString();
    if (state === "suspended") {
      this.lastSuspendAt = this.stateChangedAt;
    }
    if (state === "resuming") {
      this.lastResumeAt = this.stateChangedAt;
      this.lastRecoveryStartedAt = this.stateChangedAt;
    } else if (state === "recovering") {
      this.lastRecoveryStartedAt = this.stateChangedAt;
    }
    if (state === "ready") {
      this.lastReadyAt = this.stateChangedAt;
    }
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function validatePolicy(policy: AgentHarnessServiceLifecyclePolicy): AgentHarnessServiceLifecyclePolicy {
  const numeric = [
    policy.heartbeatIntervalMs,
    policy.heartbeatDeadlineMs,
    policy.heartbeatMissThreshold,
    policy.resumeReadinessTargetMs,
    policy.resumeGraceMs,
    policy.recoveryAttemptLimit,
    policy.controlledRestartDrainMs,
    ...policy.recoveryBackoffMs,
  ];
  if (numeric.some((value) => !Number.isSafeInteger(value) || value < 0) ||
    policy.heartbeatMissThreshold < 1 ||
    policy.recoveryAttemptLimit < 1) {
    throw new Error("Agent Harness lifecycle supervision policy is invalid.");
  }
  return policy;
}

class LifecycleDeadlineError extends Error {}

function withDeadline<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new LifecycleDeadlineError(message)), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isDeadlineError(error: unknown): boolean {
  return error instanceof LifecycleDeadlineError ||
    (error instanceof Error && /timeout|deadline/i.test(error.message));
}

function boundedMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Agent Harness lifecycle recovery failed.";
}
