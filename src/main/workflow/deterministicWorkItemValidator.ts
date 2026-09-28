import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const maxOutputBytes = 1_000_000;
const timeoutMs = 180_000;

/** Reuses the repository ValidationCatalog planner/executor against one exact source checkout. */
export async function runDeterministicWorkItemProfile(repositoryRoot: string, changedPaths: string[], capabilityIds: string[], executeCommand: (executable: string, args: string[], cwd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }> = runNode): Promise<{
  status: "passed" | "failed" | "incomplete";
  summary: string;
}> {
  const root = fs.realpathSync(repositoryRoot);
  const cliPath = path.join(root, "scripts", "validation", "cli.cjs");
  if (!fs.existsSync(cliPath)) throw Error("Exact Workflow checkout does not contain the ValidationCatalog executor.");
  if (!Array.isArray(changedPaths) || changedPaths.length > 4096 || changedPaths.some(value => typeof value !== "string" || !value || value.startsWith("/") || value.includes("\\") || value.includes(":") ||
    value.split("/").includes("..") || value.split("/").includes(".") || path.posix.normalize(value) !== value))
    throw Error("Deterministic Validator change scope is invalid.");
  if (!Array.isArray(capabilityIds) || capabilityIds.length > 128 || capabilityIds.some(value => typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(value)))
    throw Error("Deterministic Validator capability scope is invalid.");
  const temporaryDirectory = path.join(root, "tmp");
  fs.mkdirSync(temporaryDirectory, { recursive: true });
  const changeFile = path.join(temporaryDirectory, `champcity-workitem-validation-${crypto.randomUUID()}.json`);
  const relativeChangeFile = path.relative(root, changeFile).split(path.sep).join("/");
  try {
    fs.writeFileSync(changeFile, JSON.stringify({ changedPaths: [...new Set(changedPaths)].sort(), capabilityIds: [...new Set(capabilityIds)].sort() }), { flag: "wx" });
    const output = await executeCommand(process.execPath, [cliPath, "run", "--profile", "work-item", "--changes", relativeChangeFile], root);
    let receipt: unknown;
    try { receipt = JSON.parse(output.stdout); } catch { receipt = null; }
    const status = receipt && typeof receipt === "object" && "status" in receipt ? (receipt as { status?: unknown }).status : null;
    const outcome = status === "passed" && output.exitCode === 0 ? "passed" : status === "failed" ? "failed" : "incomplete";
    const summary = JSON.stringify({ executor: "ValidationCatalog work-item profile", status: outcome,
      exitCode: output.exitCode, receipt: compactReceipt(receipt), stderr: output.stderr.slice(0, 1200) }).slice(0, 7800);
    return { status: outcome, summary };
  } finally {
    try { fs.unlinkSync(changeFile); } catch { /* exact operation-owned input only */ }
  }
}

function compactReceipt(receipt: unknown): unknown {
  if (!receipt || typeof receipt !== "object") return null;
  const value = receipt as Record<string, unknown>;
  const keys = ["status", "profile", "selection", "totals", "results", "durationMs", "build"];
  const bounded: Record<string, unknown> = {};
  for (const key of keys) if (Object.hasOwn(value, key)) {
    const serialized = JSON.stringify(value[key]);
    bounded[key] = serialized.length > 2400 ? `${serialized.slice(0, 2400)}…` : value[key];
  }
  return bounded;
}

function runNode(executable: string, args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", size = 0, settled = false;
    const finish = (error?: Error, exitCode = 1) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve({ exitCode, stdout, stderr });
    };
    const timer = setTimeout(() => { child.kill(); finish(new Error("Deterministic Validator exceeded its 180-second execution bound.")); }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxOutputBytes) { child.kill(); finish(new Error("Deterministic Validator output exceeded its bound.")); return; }
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => { if (stderr.length < 4000) stderr += chunk.toString("utf8").slice(0, 4000 - stderr.length); });
    child.once("error", error => finish(error));
    child.once("close", code => finish(undefined, code ?? 1));
  });
}
