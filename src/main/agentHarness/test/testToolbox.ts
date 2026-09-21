import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import * as z from "zod/v4";
import { AgentHarnessError } from "../core/errors";
import { resolveRepositoryPath } from "../repository/pathPolicy";
import { resolveWindowsNpmInvocation, terminateProcessTree } from "../release/releaseCommandAdapter";
import type { AgentHarnessWorkspaceContext } from "../workspace/workspaceAccess";
import { INTEGRATION_VALIDATION_LANES } from "../../../shared/integrationPolicyContracts";

export const TEST_TOOLBOX_ACTIONS = ["run_test_file", "run_test_pattern", "run_validation_profile", "run_validation_lane", "audit_test_corpus"] as const;
export type TestToolboxAction = typeof TEST_TOOLBOX_ACTIONS[number];
const MAX_FILES = 512;
const MAX_OUTPUT_BYTES = 2_000_000;
const STEP_WATCHDOG_MS = 930_000; // Shared executor's 15-minute step timeout plus cleanup/provenance allowance.
const activeRoots = new Set<string>();
const toolkit = ["toolbox-runner.cjs", "affected.cjs", "build.cjs", "catalog-schema.cjs", "catalog.cjs", "child-cleanup.cjs",
  "environment.cjs", "executor.cjs", "planner.cjs", "process.cjs", "scheduler.cjs", "telemetry.cjs"];
const testPath = z.string().min(1).max(4096).refine(value => /^test\/.+\.test\.cjs$/.test(value)
  && !value.includes("\\") && !value.includes(":") && !/[\x00-\x1f]/.test(value)
  && value.split("/").every(part => part && part !== "." && part !== ".."));
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const selectedSchema = z.object({ testPath, lane: z.enum(INTEGRATION_VALIDATION_LANES),
  capabilities: z.array(z.string().min(1).max(160)).max(256) }).strict();
const countsSchema = z.object({ tests: count.nullable(), pass: count.nullable(), fail: count.nullable(),
  skipped: count.nullable(), cancelled: count.nullable() }).strict();
const rowSchema = selectedSchema.extend({ durationMs: count.nullable(), testCount: count.nullable(), counts: countsSchema.nullable(),
  status: z.enum(["pass", "fail", "incomplete", "timeout"]), executorStatus: z.string().max(40),
  timedOut: z.boolean(), executionFailed: z.boolean(), exitCode: z.number().int().nullable(), failureReason: z.string().max(1200).nullable() });
const sourceSchema = z.union([
  z.object({ kind: z.literal("unversioned"), revision: z.null() }).strict(),
  z.object({ kind: z.literal("git-worktree"), revision: z.string().regex(/^[a-f0-9]{40,64}$/), dirty: z.boolean(),
    changedFileCount: count, contentSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
]);
const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("plan"), sourceContext: sourceSchema, selected: z.array(selectedSchema).max(MAX_FILES) }).strict(),
  z.object({ type: z.literal("file"), result: rowSchema }).strict(),
  z.object({ type: z.literal("complete"), status: z.enum(["passed", "failed", "incomplete"]),
    records: z.array(rowSchema).max(MAX_FILES), receipt: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ type: z.literal("error"), message: z.string().max(1200) }).strict(),
]);
type Selected = z.infer<typeof selectedSchema>;
type Row = z.infer<typeof rowSchema>;

/** Only the bound workspace and a fixed validation adapter cross the process boundary. */
export async function executeTestToolbox(context: AgentHarnessWorkspaceContext, action: TestToolboxAction,
  params: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  const started = performance.now();
  const root = fs.realpathSync.native(context.root);
  const key = process.platform === "win32" ? root.toLowerCase() : root;
  if (activeRoots.has(key)) throw new AgentHarnessError("INVALID_INPUT", "Validation is already running for this bound repository.");
  const request = JSON.stringify({ action, params });
  if (Buffer.byteLength(request) > 1_200_000) throw new AgentHarnessError("INVALID_INPUT", "Validation request exceeds its bound.");
  activeRoots.add(key);
  try {
    // Resolve the fixed toolkit before launch. Never load workspace code in the harness process.
    for (const name of toolkit) {
      const relative = `scripts/validation/${name}`;
      const resolved = resolveRepositoryPath(root, relative);
      if (resolved.relativePath !== relative || !fs.lstatSync(resolved.resolvedPath).isFile()
        || fs.statSync(resolved.resolvedPath).size > 128_000) throw new AgentHarnessError("FILE_DENIED", "Bound validation toolkit is unavailable.");
    }
    const executable = process.platform === "win32" ? resolveWindowsNpmInvocation().executable : process.execPath;
    if (process.platform !== "win32" && process.versions.electron) {
      throw new AgentHarnessError("INVALID_INPUT", "A standalone Node runtime is required for validation.");
    }
    const env = { ...process.env };
    for (const name of Object.keys(env)) if (/^(npm_|node_options$|node_path$|node_test_context$|electron_run_as_node$)/i.test(name)) delete env[name];
    return await new Promise<unknown>((resolve) => {
      let selected: Selected[] = [], sourceContext: z.infer<typeof sourceSchema> | null = null;
      const rows = new Map<string, Row>();
      let complete: Extract<z.infer<typeof eventSchema>, { type: "complete" }> | undefined;
      let failureReason: string | null = null, timedOut = false, settled = false, stopping = false;
      let buffer = "", outputBytes = 0, watchdog: NodeJS.Timeout | undefined, fallback: NodeJS.Timeout | undefined;
      let child: ReturnType<typeof spawn> | undefined;
      const finish = (exitCode: number | null) => {
        if (settled) return;
        settled = true; clearTimeout(watchdog); clearTimeout(fallback); clearTimeout(deadline);
        signal?.removeEventListener("abort", cancel);
        if (!complete && !failureReason) failureReason = "Validation adapter ended without a complete receipt.";
        const response = complete && !failureReason && exitCode === 0 ? complete : undefined;
        const steps = response && Array.isArray(response.receipt.steps) ? response.receipt.steps as Array<Record<string, unknown>> : [];
        const receiptFailure = response?.receipt.failureReason;
        const reportedFailure = failureReason ?? (typeof receiptFailure === "string" ? receiptFailure : response?.records.find(row => row.status !== "pass")?.failureReason) ?? null;
        resolve({ workspace: { workspaceId: context.workspaceId, repositoryName: context.repositoryName, gitBacked: context.gitBacked },
          request: { action, params }, selectedFiles: selected.map(file => file.testPath), sourceContext,
          durationMs: Math.round(performance.now() - started), status: response?.status ?? "incomplete",
          timedOut: timedOut || steps.some(step => step.timedOut === true) || Boolean(response?.records.some(row => row.timedOut)),
          executionFailed: !response || steps.some(step => step.status === "execution-failed") || response.records.some(row => row.executionFailed), failureReason: reportedFailure,
          records: response?.records ?? selected.map(file => rows.get(file.testPath) ?? {
            ...file, durationMs: null, testCount: null, counts: null, status: "incomplete", executorStatus: "not-observed",
            timedOut: false, executionFailed: true, exitCode: null, failureReason: failureReason ?? "No completed file evidence.",
          }), receipt: response?.receipt ?? null,
        });
      };
      const stop = (reason: string, timeout = false) => {
        if (settled || stopping) return;
        stopping = true; failureReason = reason; timedOut = timeout;
        if (!child) { finish(null); return; }
        try { terminateProcessTree(child); } catch { child.kill("SIGKILL"); }
        fallback = setTimeout(() => {
          if (child && process.platform !== "win32" && child.pid) {
            try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
          } else child?.kill("SIGKILL");
          child?.stdout?.destroy(); child?.stderr?.destroy(); child?.unref(); finish(null);
        }, 3500);
      };
      const cancel = () => stop("Validation request was cancelled; retained rows are partial evidence.");
      const resetWatchdog = () => {
        clearTimeout(watchdog);
        // Before the first file there may be a full owned build followed by a full test timeout.
        watchdog = setTimeout(() => stop("Validation adapter timed out.", true), (rows.size === 0 ? 2 : 1) * STEP_WATCHDOG_MS);
      };
      const deadline = setTimeout(() => stop("Validation run exceeded its total duration bound.", true), (MAX_FILES + 2) * STEP_WATCHDOG_MS);
      if (signal?.aborted) { cancel(); return; }
      signal?.addEventListener("abort", cancel, { once: true });
      try {
        child = spawn(executable, ["--require", path.join(root, "scripts/validation/child-cleanup.cjs"),
          path.join(root, "scripts/validation/toolbox-runner.cjs")],
        { cwd: root, env, shell: false, windowsHide: true, detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"] });
      } catch { failureReason = "Validation adapter could not be started."; finish(null); return; }
      resetWatchdog();
      child.stdout!.setEncoding("utf8");
      child.stdout!.on("data", (chunk: string) => {
        if (stopping || settled) return;
        outputBytes += Buffer.byteLength(chunk);
        if (outputBytes > MAX_OUTPUT_BYTES) { stop("Validation evidence exceeded its output bound."); return; }
        buffer += chunk;
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          try {
            const event = eventSchema.parse(JSON.parse(line));
            if (complete) throw Error("Output after receipt");
            if (event.type === "plan") {
              if (sourceContext || event.selected.some((file, index) => index > 0 && event.selected[index - 1].testPath >= file.testPath)
                || context.gitBacked && event.sourceContext.kind !== "git-worktree") throw Error("Invalid source or ordered inventory");
              selected = event.selected; sourceContext = event.sourceContext;
            } else if (event.type === "file") {
              const file = selected.find(file => file.testPath === event.result.testPath);
              if (!file || rows.has(file.testPath) || file.lane !== event.result.lane) throw Error("Unselected file evidence");
              rows.set(file.testPath, event.result);
            } else if (event.type === "complete") {
              if (!sourceContext || event.records.length !== selected.length
                || event.records.some((row, index) => row.testPath !== selected[index].testPath || row.lane !== selected[index].lane)) throw Error("Incomplete receipt inventory");
              complete = event;
            } else { failureReason = event.message; }
            resetWatchdog();
          } catch { stop("Validation adapter returned invalid structured evidence."); return; }
        }
      });
      child.stderr!.on("data", (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_OUTPUT_BYTES) stop("Validation adapter exceeded its output bound.");
      });
      child.once("error", () => { failureReason = "Validation adapter could not be started or executed."; finish(null); });
      child.once("close", finish);
      child.stdin!.on("error", () => stop("Validation request could not be delivered."));
      child.stdin!.end(request);
    });
  } finally { activeRoots.delete(key); }
}
