import { randomUUID } from "node:crypto";
import { monitorEventLoopDelay, type IntervalHistogram } from "node:perf_hooks";
import type {
  AgentHarnessMcpSessionDiagnostics,
  AgentHarnessOperationalDiagnostics,
  AgentHarnessReadinessReasonCode,
  AgentHarnessRecentRequestSummary,
  AgentHarnessRequestOutcome,
  AgentHarnessToolContractDiagnostics,
} from "../../../shared/workspaceContracts";
import type { AgentHarnessToolResult } from "../tools/toolRegistry";
import { isRepositoryTruncationReason } from "../repository/repositoryOperations";

const DEFAULT_AUDIT_CAPACITY = 100;
const DEFAULT_LATENCY_CAPACITY = 512;
const LATENCY_BUCKETS_MS = [10, 50, 100, 250, 500, 1_000, 3_000, 10_000] as const;

export interface AgentHarnessOperationalDiagnosticsOptions {
  workerGeneration?: string;
  recentRequestCapacity?: number;
  latencySampleCapacity?: number;
  now?: () => number;
  eventLoopMonitor?: Pick<IntervalHistogram, "enable" | "disable" | "percentile" | "max">;
  workerRestartCount?: number;
  lastWorkerRestartReason?: string | null;
}

export interface AgentHarnessOperationObservation {
  attemptId: string;
  finish: (result: AgentHarnessToolResult, signalAborted?: boolean) => void;
}

export class AgentHarnessOperationalDiagnosticsCollector {
  readonly workerGeneration: string;
  private readonly recentRequestCapacity: number;
  private readonly latencySampleCapacity: number;
  private readonly now: () => number;
  private readonly eventLoopMonitor: Pick<IntervalHistogram, "enable" | "disable" | "percentile" | "max">;
  private readonly recentRequests: AgentHarnessRecentRequestSummary[] = [];
  private readonly latencySamples: number[] = [];
  private readonly incompleteCounts: Record<string, number> = Object.create(null) as Record<string, number>;
  private currentInFlight = 0;
  private totalBegun = 0;
  private totalCompleted = 0;
  private totalFailed = 0;
  private totalCancelled = 0;
  private totalTimedOut = 0;
  private readinessState: "ready" | "degraded" = "ready";
  private readinessReasonCode: AgentHarnessReadinessReasonCode = "ready";
  private lastSuspendAt: string | null = null;
  private lastResumeAt: string | null = null;
  private lastRecoveryStartedAt: string | null = null;
  private lastReadyAt: string | null;
  private readonly workerRestartCount: number;
  private readonly lastWorkerRestartReason: string | null;
  private closed = false;

  constructor(options: AgentHarnessOperationalDiagnosticsOptions = {}) {
    this.workerGeneration = options.workerGeneration ?? randomUUID();
    this.recentRequestCapacity = boundedCapacity(options.recentRequestCapacity, DEFAULT_AUDIT_CAPACITY, 1_000);
    this.latencySampleCapacity = boundedCapacity(options.latencySampleCapacity, DEFAULT_LATENCY_CAPACITY, 10_000);
    this.now = options.now ?? Date.now;
    this.eventLoopMonitor = options.eventLoopMonitor ?? monitorEventLoopDelay({ resolution: 20 });
    this.workerRestartCount = boundedCounter(options.workerRestartCount);
    this.lastWorkerRestartReason = safeReasonCode(options.lastWorkerRestartReason);
    this.lastReadyAt = this.timestamp();
    this.eventLoopMonitor.enable();
  }

  beginOperation(input: { toolbox: unknown; action: unknown; workspaceId?: unknown }): AgentHarnessOperationObservation {
    const startedAtMs = this.now();
    const attemptId = `mcp_${randomUUID()}`;
    const summary: AgentHarnessRecentRequestSummary = {
      attemptId,
      toolbox: safeName(input.toolbox, "unknown"),
      action: safeName(input.action, "unknown"),
      workspaceId: safeWorkspaceId(input.workspaceId),
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt: null,
      durationMs: null,
      outcome: "in-flight",
      reasonCode: null,
    };
    this.totalBegun += 1;
    this.currentInFlight += 1;
    this.recentRequests.push(summary);
    enforceRingCapacity(this.recentRequests, this.recentRequestCapacity);
    let finished = false;
    return {
      attemptId,
      finish: (result, signalAborted = false) => {
        if (finished) {
          return;
        }
        finished = true;
        const completedAtMs = this.now();
        const durationMs = Math.max(0, completedAtMs - startedAtMs);
        const outcome = classifyOutcome(result, signalAborted);
        const reasonCode = boundedResultReason(result, outcome);
        this.currentInFlight = Math.max(0, this.currentInFlight - 1);
        this.recordOutcome(outcome);
        this.latencySamples.push(durationMs);
        enforceRingCapacity(this.latencySamples, this.latencySampleCapacity);
        this.recordRepositoryCompletion(result);
        const retained = this.recentRequests.find((entry) => entry.attemptId === attemptId);
        if (retained) {
          retained.completedAt = new Date(completedAtMs).toISOString();
          retained.durationMs = durationMs;
          retained.outcome = outcome;
          retained.reasonCode = reasonCode;
        }
      },
    };
  }

  setReadiness(state: "ready" | "degraded", reasonCode: AgentHarnessReadinessReasonCode): void {
    this.readinessState = state;
    this.readinessReasonCode = reasonCode;
    if (state === "ready") {
      this.lastReadyAt = this.timestamp();
    }
  }

  markSuspend(): void {
    this.lastSuspendAt = this.timestamp();
    this.setReadiness("degraded", "suspend-admission-paused");
  }

  markResumeStarted(): void {
    const timestamp = this.timestamp();
    this.lastResumeAt = timestamp;
    this.lastRecoveryStartedAt = timestamp;
    this.setReadiness("degraded", "resume-reconciliation");
  }

  snapshot(
    sessions: AgentHarnessMcpSessionDiagnostics,
    contract: AgentHarnessToolContractDiagnostics["published"],
  ): AgentHarnessOperationalDiagnostics {
    const sorted = [...this.latencySamples].sort((left, right) => left - right);
    return {
      schemaVersion: 1,
      workerGeneration: this.workerGeneration,
      capturedAt: this.timestamp(),
      readiness: { state: this.readinessState, reasonCode: this.readinessReasonCode },
      sessions: cloneSessions(sessions),
      requests: {
        currentInFlight: this.currentInFlight,
        totalBegun: this.totalBegun,
        totalCompleted: this.totalCompleted,
        totalFailed: this.totalFailed,
        totalCancelled: this.totalCancelled,
        totalTimedOut: this.totalTimedOut,
        latencyMs: {
          sampleCount: sorted.length,
          p50: percentile(sorted, 50),
          p95: percentile(sorted, 95),
          maximum: sorted.at(-1) ?? 0,
          histogram: histogram(sorted),
        },
      },
      toolContract: {
        currentGeneration: contract.runtimeGeneration ?? this.workerGeneration,
        captureCount: contract.contractCaptureCount,
        publicationGenerationCount: contract.runtimeGeneration ? 1 : 0,
        periodicRecaptureTimerCount: contract.periodicContractTimerCount,
      },
      eventLoopLagMs: {
        p95: nanosecondsToMilliseconds(this.eventLoopMonitor.percentile(95)),
        maximum: nanosecondsToMilliseconds(this.eventLoopMonitor.max),
      },
      lifecycle: {
        lastSuspendAt: this.lastSuspendAt,
        lastResumeAt: this.lastResumeAt,
        lastRecoveryStartedAt: this.lastRecoveryStartedAt,
        lastReadyAt: this.lastReadyAt,
        workerRestartCount: this.workerRestartCount,
        lastWorkerRestartReason: this.lastWorkerRestartReason,
      },
      repositoryIncompleteByReason: { ...this.incompleteCounts },
      recentRequests: this.recentRequests.map((entry) => ({ ...entry })),
      limits: {
        recentRequestCapacity: this.recentRequestCapacity,
        latencySampleCapacity: this.latencySampleCapacity,
      },
    };
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.setReadiness("degraded", "runtime-closing");
    this.eventLoopMonitor.disable();
  }

  private recordOutcome(outcome: Exclude<AgentHarnessRequestOutcome, "in-flight">): void {
    if (outcome === "completed") this.totalCompleted += 1;
    if (outcome === "failed") this.totalFailed += 1;
    if (outcome === "cancelled") this.totalCancelled += 1;
    if (outcome === "timed-out") this.totalTimedOut += 1;
  }

  private recordRepositoryCompletion(result: AgentHarnessToolResult): void {
    const reason = repositoryIncompleteReason(result);
    if (reason) {
      this.incompleteCounts[reason] = (this.incompleteCounts[reason] ?? 0) + 1;
    }
  }

  private timestamp(): string {
    return new Date(this.now()).toISOString();
  }
}

function classifyOutcome(
  result: AgentHarnessToolResult,
  signalAborted: boolean,
): Exclude<AgentHarnessRequestOutcome, "in-flight"> {
  if (signalAborted) {
    return "cancelled";
  }
  if (result.ok) {
    return "completed";
  }
  return /TIMEOUT|DEADLINE/.test(result.error?.code ?? "") ? "timed-out" : "failed";
}

function boundedResultReason(
  result: AgentHarnessToolResult,
  outcome: Exclude<AgentHarnessRequestOutcome, "in-flight">,
): string | null {
  if (outcome === "completed") {
    return repositoryIncompleteReason(result);
  }
  if (outcome === "cancelled") {
    return "request-cancelled";
  }
  return safeReasonCode(result.error?.code) ?? "runtime-error";
}

function repositoryIncompleteReason(result: AgentHarnessToolResult): string | null {
  const candidate = result.ok
    ? completionReason(result.payload)
    : completionReason(result.error?.details);
  return isRepositoryTruncationReason(candidate) ? candidate : null;
}

function completionReason(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.reason === "string") {
    return record.reason;
  }
  return completionReason(record.completion);
}

function safeName(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,99}$/.test(value) ? value : fallback;
}

function safeWorkspaceId(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,99}$/.test(value) ? value : null;
}

function safeReasonCode(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value) ? value : null;
}

function boundedCapacity(value: number | undefined, fallback: number, maximum: number): number {
  return Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= maximum ? Number(value) : fallback;
}

function boundedCounter(value: number | undefined): number {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function enforceRingCapacity<T>(values: T[], capacity: number): void {
  if (values.length > capacity) {
    values.splice(0, values.length - capacity);
  }
}

function percentile(sorted: number[], requestedPercentile: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.max(0, Math.ceil((requestedPercentile / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function histogram(sorted: number[]): Array<{ upperBoundMs: number | null; count: number }> {
  const counts: Array<{ upperBoundMs: number | null; count: number }> = LATENCY_BUCKETS_MS.map((upperBoundMs) => ({
    upperBoundMs,
    count: sorted.filter((sample) => sample <= upperBoundMs).length,
  }));
  counts.push({ upperBoundMs: null, count: sorted.length });
  return counts;
}

function nanosecondsToMilliseconds(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round((value / 1_000_000) * 100) / 100 : 0;
}

function cloneSessions(value: AgentHarnessMcpSessionDiagnostics): AgentHarnessMcpSessionDiagnostics {
  return {
    ...value,
    totalDisposed: { ...value.totalDisposed },
    limits: { ...value.limits },
  };
}
