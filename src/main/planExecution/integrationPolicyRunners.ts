import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { IntegrationPolicyCheck } from "../../shared/integrationPolicyContracts";
import type { IntegrationValidationEvidence } from "../../shared/integrationCandidateContracts";
import { resolveWindowsNpmInvocation } from "../agentHarness/release/releaseCommandAdapter";
import { readIntegrationPolicyFile } from "./integrationPolicyFiles";

type Evidence = Omit<IntegrationValidationEvidence, "checkId">;
type Runner = (root: string, check: IntegrationPolicyCheck, trustedScriptDefinition: string) => Promise<Evidence>;
export const INTEGRATION_CHECK_OUTPUT_LIMIT_BYTES = 1024 * 1024;
export const INTEGRATION_CHECK_DIAGNOSTIC_LIMIT_BYTES = 64 * 1024;
export const INTEGRATION_CHECK_SUMMARY_LIMIT_CHARS = 1200;
const failure = (summary: string): Evidence => ({ exitCode: null, summary });

function safeFailureSummary(root: string, exitCode: number | null, stdout: Buffer[], stderr: Buffer[]): string {
  const rootPattern = path.resolve(root).split(/[\\/]/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\\\/]");
  const clean = (value: string) => value
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(new RegExp(`${rootPattern}(?:(?:[\\\\/])([^\\s\"'<>|]+))?`, "gi"), (_match, relative: string | undefined) => relative ? relative.replaceAll("\\", "/") : "<candidate>")
    .replace(/\b[A-Za-z]:[\\/][^\s\"'<>|]*/g, "<path>")
    .replace(/\/(?:Users|home|tmp|var\/tmp)\/[^\s\"'<>|]*/gi, "<path>")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[^\r\n]*/gi, "<redacted-credential>")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})\b/g, "<redacted-credential>")
    .replace(/\b(Bearer)\s+[^\s,;]+/gi, "$1 <redacted>")
    .replace(/\b([A-Za-z0-9_-]*(?:token|password|secret|api[_-]?key|private[_-]?key|authorization|credential|cookie)[A-Za-z0-9_-]*)\s*[:=]\s*[^\s,;]+/gi, "$1=<redacted>")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const lines = `${Buffer.concat(stderr).toString("utf8")}\n${Buffer.concat(stdout).toString("utf8")}`
    .split(/\r?\n/).map(clean).filter(Boolean).filter((line) => !/^>\s|^npm (?:warn|notice)/i.test(line));
  const preferred = lines.filter((line) => /\b(?:not ok|fail(?:ed|ure)?|error|assert(?:ion)?|expected|actual|test|spec)\b/i.test(line));
  const selected = [...preferred, ...lines].filter((line, index, all) => all.indexOf(line) === index).slice(0, 6).map((line) => line.slice(0, 240));
  const generic = "Required npm script failed.";
  if (!selected.length) return generic;
  const summary = `Required npm script failed${exitCode === null ? "" : ` (exit code ${exitCode})`}. ${selected.join(" | ")}`;
  return summary.length <= INTEGRATION_CHECK_SUMMARY_LIMIT_CHARS ? summary : summary.slice(0, INTEGRATION_CHECK_SUMMARY_LIMIT_CHARS).trimEnd();
}

function npmInvocation(): { executable: string; args: string[] } {
  if (process.platform === "win32") {
    const invocation = resolveWindowsNpmInvocation();
    return { executable: invocation.executable, args: [invocation.cliPath] };
  }
  // Resolve from the host toolchain, never a candidate-local executable or relative PATH entry.
  for (const directory of (process.env.PATH ?? "").split(path.delimiter).filter(path.isAbsolute)) {
    try {
      const executable = fs.realpathSync(path.join(directory, "npm"));
      if (fs.statSync(executable).isFile()) return { executable, args: [] };
    } catch { /* Try the next host toolchain location. */ }
  }
  throw Error("Standalone npm toolchain is unavailable.");
}

async function runNpmScript(root: string, check: IntegrationPolicyCheck, trustedScriptDefinition: string): Promise<Evidence> {
  if (check.runner.kind !== "npm-script") return failure("Unsupported integration runner adapter.");
  const script = check.runner.script;
  try {
    const bytes = readIntegrationPolicyFile(root, "package.json", 1_000_000);
    const manifest = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const scripts = manifest?.scripts;
    if (!scripts || typeof scripts !== "object" || Array.isArray(scripts) || !Object.hasOwn(scripts, script)
      || typeof scripts[script] !== "string" || scripts[script] !== trustedScriptDefinition) {
      return failure("Required npm script is missing or differs from the target-trusted definition.");
    }
  } catch { return failure("Candidate package manifest is missing, invalid, redirected, or exceeds its file bound."); }
  let invocation: ReturnType<typeof npmInvocation>;
  try { invocation = npmInvocation(); } catch { return failure("Standalone npm toolchain could not be resolved."); }
  return new Promise((resolve) => {
    let settled = false;
    let terminal: Evidence | undefined;
    let outputBytes = 0;
    let diagnosticBytes = 0;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let fallback: NodeJS.Timeout | undefined;
    let timeout: NodeJS.Timeout | undefined;
    let child: ReturnType<typeof spawn>;
    const finish = (proof: Evidence) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout); clearTimeout(fallback);
      resolve(proof);
    };
    const stop = (summary: string) => {
      if (terminal || settled) return;
      terminal = failure(summary);
      // Kill descendants as well as npm: a timed-out compiler/test runner must not keep validating.
      if (typeof child.pid === "number") {
        if (process.platform === "win32") {
          try {
            const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { shell: false, windowsHide: true, stdio: "ignore", timeout: 3000 });
            killer.on("error", () => child.kill("SIGKILL"));
          } catch { child.kill("SIGKILL"); }
        } else {
          try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
        }
      }
      fallback = setTimeout(() => {
        child.kill("SIGKILL"); child.stdout?.destroy(); child.stderr?.destroy(); child.unref();
        finish(terminal!);
      }, 3000);
    };
    try {
      const environment: NodeJS.ProcessEnv = { ...process.env, CI: "true", GIT_TERMINAL_PROMPT: "0" };
      for (const key of Object.keys(environment)) {
        if (/^(?:npm_|node_options$|node_path$|electron_run_as_node$)/i.test(key)) delete environment[key];
      }
      // npm itself executes repository scripts through a shell. Pin that interpreter so .npmrc
      // cannot substitute an unrelated executable while reporting the named check as passing.
      if (process.platform === "win32" && (!process.env.SystemRoot || !path.isAbsolute(process.env.SystemRoot))) throw Error("System shell is unavailable.");
      const scriptShell = process.platform === "win32" ? path.join(process.env.SystemRoot!, "System32", "cmd.exe") : "/bin/sh";
      child = spawn(invocation.executable, [...invocation.args, "--prefix", root, "--workspaces=false", "--if-present=false", "--ignore-scripts", "--script-shell", scriptShell, "run", script], {
        cwd: root, shell: false, windowsHide: true, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"], env: environment,
      });
    } catch { finish(failure("Required npm script could not start.")); return; }
    // Retain only a small transient prefix for deterministic sanitization on ordinary failures.
    const output = (stream: Buffer[]) => (chunk: Buffer) => {
      if (terminal || settled) return;
      outputBytes += chunk.length;
      if (diagnosticBytes < INTEGRATION_CHECK_DIAGNOSTIC_LIMIT_BYTES) {
        const retained = chunk.subarray(0, INTEGRATION_CHECK_DIAGNOSTIC_LIMIT_BYTES - diagnosticBytes);
        stream.push(retained); diagnosticBytes += retained.length;
      }
      if (outputBytes > INTEGRATION_CHECK_OUTPUT_LIMIT_BYTES) stop("Required npm script exceeded the output limit.");
    };
    child.stdout!.on("data", output(stdout)); child.stderr!.on("data", output(stderr));
    child.once("error", () => finish(terminal ?? failure("Required npm script could not start.")));
    child.once("close", (exitCode) => finish(terminal ?? { exitCode, summary: exitCode === 0 ? "Required npm script passed." : safeFailureSummary(root, exitCode, stdout, stderr) }));
    timeout = setTimeout(() => stop("Required npm script exceeded its duration limit."), check.runner.timeoutMs);
  });
}

/** Only application code can extend this registry; repository policy cannot register executables. */
const runners: ReadonlyMap<IntegrationPolicyCheck["runner"]["kind"], Runner> = new Map([["npm-script", runNpmScript]]);
export function runIntegrationPolicyCheck(root: string, check: IntegrationPolicyCheck, trustedScriptDefinition: string): Promise<Evidence> {
  const runner = runners.get(check.runner.kind);
  return runner ? runner(root, check, trustedScriptDefinition) : Promise.resolve(failure("Unsupported integration runner adapter."));
}
