import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { AgentHarnessError } from "../../core/applicationErrors";
import { runBoundedGit } from "../../core/gitExecution";
import { assertSafeRelativePath, isPathInside, resolveRepositoryPath } from "../../repository/pathPolicy";
import { redactLocalGitResult } from "../workspace/localGitRepositoryAccessService";

export const REPOSITORY_PROCESS_PROGRAMS = ["python", "node", "npm", "dotnet"] as const;
export const MAX_REPOSITORY_PROCESS_TIMEOUT = 600_000;
export const MAX_REPOSITORY_PROCESS_OUTPUT = 65_536;
const MAX_ARGUMENT_BYTES = 32_768;
const secretName = /token|secret|password|passwd|credential|authorization|cookie|api[_-]?key|private[_-]?key|connection[_-]?string/i;
const applicationName = /champcity|forgejo|github|^gh_|^aws_|^azure_|^openai_|^codex_|^gcp_|^google_/i;
const injectionName = /^(node_options|node_path|node_test_context|electron_run_as_node|pythonpath|pythonhome|pythonstartup|ld_.*|dyld_.*|git_.*|npm_.*|dotnet_startup_hooks|dotnet_additional_deps|dotnet_shared_store|msbuild.*)$/i;
const invalid = (message: string) => new AgentHarnessError("INVALID_INPUT", message);

export interface RepositoryProcessInput {
  program: string;
  arguments: string[];
  expectedHead?: string;
  timeoutMs?: number;
}

// Only application-environment toolchain locations are searched. Never use CWD,
// relative PATH entries, repository binaries, PATHEXT, or a caller's executable path.
function executable(root: string, identity: string): string {
  const name = process.platform === "win32" ? `${identity}.exe` : identity;
  const hostPath = Object.entries(process.env).find(([key]) => key.toLowerCase() === "path")?.[1] ?? "";
  for (const directory of hostPath.split(path.delimiter)) {
    if (!path.isAbsolute(directory)) continue;
    const candidate = path.join(directory, name);
    try {
      const real = fs.realpathSync.native(candidate);
      if (isPathInside(real, root) || !fs.statSync(real).isFile()) continue;
      fs.accessSync(real, process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
      return real;
    } catch { /* Try the next application-owned toolchain location. */ }
  }
  throw invalid("Approved toolchain is unavailable in the application environment.");
}

function programSpec(root: string, program: string): { executable: string; prefix: string[] } {
  if (!REPOSITORY_PROCESS_PROGRAMS.includes(program as typeof REPOSITORY_PROCESS_PROGRAMS[number])) throw invalid("Select an approved repository process program identity.");
  if (program !== "npm") return { executable: executable(root, program), prefix: [] };
  // Windows npm.cmd requires a shell. Invoke the installed npm CLI with Node instead.
  const node = executable(root, "node");
  const candidates = [path.join(path.dirname(node), "node_modules/npm/bin/npm-cli.js"),
    path.resolve(path.dirname(node), "../lib/node_modules/npm/bin/npm-cli.js")];
  for (const candidate of candidates) {
    try {
      const real = fs.realpathSync.native(candidate);
      if (!isPathInside(real, root) && fs.statSync(real).isFile()) return { executable: node, prefix: [real] };
    } catch { /* No shell fallback. */ }
  }
  throw invalid("Approved npm CLI is unavailable beside the application Node toolchain.");
}

function validateArguments(root: string, input: RepositoryProcessInput): void {
  const args = input.arguments;
  if (!Array.isArray(args) || args.length > 128 || args.some(arg => typeof arg !== "string" || !arg.trim() || /[\0\r\n]/.test(arg) || Buffer.byteLength(arg) > 4096) ||
      args.reduce((total, arg) => total + Buffer.byteLength(arg), 0) > MAX_ARGUMENT_BYTES) throw invalid("Repository process arguments exceed their bounds.");
  for (const arg of args) {
    if ((input.program === "node" && /^(?:-[ep]|--(?:eval|print)(?:=|$))/.test(arg)) ||
        (input.program === "python" && /^-c/.test(arg))) throw invalid("Inline runtime code is not a repository-contained script.");
    // CLI option values are checked independently; ordinary flags and version text
    // remain opaque. Slash/backslash, drive/stream syntax, known file suffixes and
    // existing entries identify repository paths without selecting build semantics.
    const value = arg.startsWith("-") && arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : arg;
    if (value === arg && arg.startsWith("-") && /[\\/]/.test(arg)) throw invalid("Pass path option values separately or after '='.");
    if (value.startsWith("-") && !value.includes("=") && !/[\\/]/.test(value)) continue;
    const looksLikePath = /[\\/]|:/.test(value) || value === "." || value === ".." ||
      /\.(?:py|[cm]?js|json|csproj|fsproj|vbproj|sln|slnx|dll|exe|bin|zip|tar|gz|txt|yaml|yml|toml|sh|ps1|cmd|bat)$/i.test(value) || fs.existsSync(path.join(root, value));
    if (!looksLikePath) continue;
    const safe = assertSafeRelativePath(value);
    if (safe.split(path.sep).some(segment => segment.toLowerCase() === ".git" || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(segment) || /[. ]$/.test(segment))) throw invalid("Process path arguments must identify ordinary repository source paths.");
    const resolved = resolveRepositoryPath(root, safe, { allowMissingLeaf: true });
    // Reject even contained redirects, hardlinked files and Git control structures.
    let current = resolved.rootRealPath;
    for (const segment of safe.split(path.sep).filter(segment => segment && segment !== ".")) {
      current = path.join(current, segment);
      let stat: fs.Stats;
      try { stat = fs.lstatSync(current); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") break; throw error; }
      if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory()) || (stat.isFile() && stat.nlink !== 1) ||
          (stat.isDirectory() && fs.existsSync(path.join(current, "HEAD")) && fs.existsSync(path.join(current, "objects")) && fs.existsSync(path.join(current, "refs")))) throw invalid("Process path arguments must be free of redirects and control metadata.");
    }
  }
}

function processEnvironment(root: string) {
  const env: NodeJS.ProcessEnv = {};
  const secrets: string[] = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (secretName.test(key) || applicationName.test(key) || injectionName.test(key)) {
      // Removed runtime switches can be '0' or '1'; they are not credentials.
      // Keep exact-value redaction for named secrets and substantial removed values.
      if (value && (secretName.test(key) || value.length >= 8)) secrets.push(value);
    } else env[key] = value;
  }
  for (const key of Object.keys(env)) if (key.toLowerCase() === "path") {
    env[key] = (env[key] ?? "").split(path.delimiter).filter(directory => {
      try { return path.isAbsolute(directory) && !isPathInside(fs.realpathSync.native(directory), root); } catch { return false; }
    }).join(path.delimiter);
  }
  env.CI = "true";
  env.GIT_TERMINAL_PROMPT = "0";
  return { env, secrets };
}

function outputRedactor(root: string, secrets: string[]) {
  return (value: string) => {
    let result = value;
    for (const secret of secrets.sort((a, b) => b.length - a.length)) {
      result = result.split(secret).join("[redacted]");
      // A bounded capture may end partway through a credential.
      for (let length = Math.min(secret.length - 1, result.length); length >= 4; length--) {
        if (result.endsWith(secret.slice(0, length))) { result = result.slice(0, -length) + "[redacted]"; break; }
      }
    }
    for (const spelling of [root, root.replace(/\\/g, "/"), root.replace(/\\/g, "\\\\")]) result = result.split(spelling).join("<checkout>");
    result = result.replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+)\b/g, "[redacted]")
      .replace(/(bearer\s+|(?:token|password|secret|api[_-]?key)\s*[:=]\s*)[^\s,;"']+/gi, "$1[redacted]")
      .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[redacted]@");
    // Apply the public local-path redaction before the byte cap; replacing a
    // short absolute path can expand text and must not grow the final response.
    result = redactLocalGitResult(result) as string;
    const bounded = Buffer.from(result).subarray(0, MAX_REPOSITORY_PROCESS_OUTPUT);
    // Drop a partial UTF-8 code point so replacement bytes cannot exceed the cap.
    return bounded.toString("utf8").replace(/\uFFFD+$/, "");
  };
}

async function killTree(child: ReturnType<typeof spawn>): Promise<void> {
  if (!child.pid) return;
  if (process.platform !== "win32") {
    try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
    return;
  }
  const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
  await new Promise<void>((resolve, reject) => {
    const killer = spawn(path.join(systemRoot, "System32/taskkill.exe"), ["/pid", String(child.pid), "/t", "/f"], { shell: false, windowsHide: true, stdio: "ignore" });
    const timer = setTimeout(() => { killer.kill(); reject(new AgentHarnessError("RUNTIME_ERROR", "Repository process tree cleanup did not complete.")); }, 10_000);
    killer.once("error", () => { clearTimeout(timer); reject(new AgentHarnessError("RUNTIME_ERROR", "Repository process tree cleanup is unavailable.")); });
    killer.once("exit", code => { clearTimeout(timer); if (code === 0 || code === 128) resolve(); else reject(new AgentHarnessError("RUNTIME_ERROR", "Repository process tree cleanup failed.")); });
  });
}

/** Caller already holds the portable context/common-repository lease. */
export async function runRepositoryProcess(root: string, input: RepositoryProcessInput, signal?: AbortSignal) {
  validateArguments(root, input);
  const timeoutMs = input.timeoutMs ?? 60_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > MAX_REPOSITORY_PROCESS_TIMEOUT) throw invalid("Repository process timeout exceeds its bounds.");
  if (input.expectedHead !== undefined && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(input.expectedHead)) throw invalid("expectedHead must be an exact commit object ID.");
  const head = await runBoundedGit({ cwd: root, args: ["rev-parse", "--verify", "HEAD"], rejectNonZero: false });
  const startingHead = head.exitCode === 0 ? head.stdout.trim() : null;
  if (input.expectedHead !== undefined && input.expectedHead !== startingHead) throw new AgentHarnessError("STALE_SOURCE", "Selected checkout HEAD differs from expectedHead; process was not started.");
  const spec = programSpec(root, input.program);
  const { env, secrets } = processEnvironment(root);
  const redact = outputRedactor(root, secrets);
  const started = performance.now();
  type Reason = "exited" | "timeout" | "cancelled" | "spawn-error";
  let reason: Reason = "exited";
  const chunks: Record<"stdout" | "stderr", Buffer[]> = { stdout: [], stderr: [] };
  const sizes = { stdout: 0, stderr: 0 };
  const truncated = { stdout: false, stderr: false };
  const capture = (stream: "stdout" | "stderr", chunk: Buffer) => {
    const remaining = MAX_REPOSITORY_PROCESS_OUTPUT - sizes[stream];
    if (chunk.length > remaining) truncated[stream] = true;
    if (remaining > 0) { const bounded = chunk.subarray(0, remaining); chunks[stream].push(bounded); sizes[stream] += bounded.length; }
  };
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    if (signal?.aborted) { reason = "cancelled"; resolve(null); return; }
    let child: ReturnType<typeof spawn>;
    try { child = spawn(spec.executable, [...spec.prefix, ...input.arguments], { cwd: root, env, shell: false, windowsHide: true, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] }); }
    catch { reason = "spawn-error"; resolve(null); return; }
    let cleanup: Promise<void> | undefined;
    let closeWatchdog: ReturnType<typeof setTimeout> | undefined;
    const stop = (why: "timeout" | "cancelled") => {
      if (reason !== "exited") return;
      reason = why;
      cleanup = killTree(child);
      closeWatchdog = setTimeout(() => {
        signal?.removeEventListener("abort", abort); child.stdout?.destroy(); child.stderr?.destroy();
        reject(new AgentHarnessError("RUNTIME_ERROR", "Repository process did not close after tree cleanup."));
      }, 12_000);
      // Handle failure immediately, even if the child's close event never arrives.
      cleanup.catch(error => { clearTimeout(timer); clearTimeout(closeWatchdog); signal?.removeEventListener("abort", abort); child.stdout?.destroy(); child.stderr?.destroy(); reject(error); });
    };
    const abort = () => stop("cancelled");
    const timer = setTimeout(() => stop("timeout"), timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.stdout?.on("data", chunk => capture("stdout", chunk));
    child.stderr?.on("data", chunk => capture("stderr", chunk));
    child.once("error", () => { if (reason === "exited") reason = "spawn-error"; });
    child.once("close", async code => {
      clearTimeout(timer); clearTimeout(closeWatchdog); signal?.removeEventListener("abort", abort);
      try { await cleanup; resolve(code); } catch (error) { reject(error); }
    });
  });
  return { program: input.program, arguments: input.arguments.map(redact), startingHead, exitCode, terminationReason: reason,
    elapsedMs: Math.round(performance.now() - started), stdout: redact(Buffer.concat(chunks.stdout).toString("utf8")),
    stderr: redact(Buffer.concat(chunks.stderr).toString("utf8")), stdoutTruncated: truncated.stdout, stderrTruncated: truncated.stderr };
}
