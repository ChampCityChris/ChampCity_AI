import { spawn } from "node:child_process";
import { AsyncLocalStorage } from "node:async_hooks";
import { AgentHarnessError } from "./applicationErrors";

export const GIT_COMMAND_TIMEOUT_MS = 15_000;
export const GIT_STDOUT_LIMIT_BYTES = 1_000_000;
export const GIT_STDERR_LIMIT_BYTES = 65_536;

interface GitExecutionOptions {
  cwd: string;
  args: string[];
  stdin?: string | Buffer;
  /** Only bootstrap uses fixed commit dates to make an interrupted initial revision reproducible. */
  commitDates?: { author: string; committer: string };
  timeoutMs?: number;
  stdoutLimitBytes?: number;
  stderrLimitBytes?: number;
  rejectNonZero?: boolean;
  collectStdout?: boolean;
  onStdout?: (chunk: Buffer, stop: () => void) => void;
  onSpawn?: (processId: number) => void;
}

export interface GitExecutionResult {
  stdout: string;
  stdoutBuffer: Buffer;
  stderr: string;
  exitCode: number | null;
  stoppedEarly: boolean;
}

export type GitCandidateTruncationReason = "candidate-limit" | "deadline" | "output-limit" | null;

// Call-scoped policy: external checkout hardening never changes registered-mode Git.
const localPolicy = new AsyncLocalStorage<{ config: string[]; verify?: (cwd: string, args: string[]) => void; deadline?: number }>();
export interface GitHttpAuthentication { destination: string; username: string; password: string }
export type GitHttpAuthenticationResolver = (cwd: string, args: string[]) => Promise<GitHttpAuthentication | null>;
const httpAuthentication = new AsyncLocalStorage<GitHttpAuthenticationResolver>();
/** Internal provider proof for username-only legacy inspection; never a public credential result. */
export async function verifiedGitHttpUsername(cwd: string, remote: string, push = false): Promise<string | undefined> {
  return (await httpAuthentication.getStore()?.(cwd, [push ? "push" : "ls-remote", "--", remote]))?.username;
}
/** Application-owned credentials never become Git arguments or repository configuration. */
export function withGitHttpAuthentication<T>(operation: () => Promise<T>, resolver: GitHttpAuthenticationResolver): Promise<T> {
  return httpAuthentication.run(resolver, operation);
}
export function withLocalGitExecution<T>(operation: () => Promise<T>, policy: { config?: string[]; verify?: (cwd: string, args: string[]) => void; deadline?: number } = {}): Promise<T> {
  return localPolicy.run({ ...policy, config: policy.config ?? [] }, operation);
}

/** Locate the command, never confuse a branch/path/message operand with it. */
export function gitCommandIndex(args: string[]): number {
  for (let index = 0; index < args.length; index++) {
    if (["-c", "-C", "--git-dir", "--work-tree", "--namespace", "--config-env"].includes(args[index])) { index++; continue; }
    if (!args[index].startsWith("-")) return index;
  }
  return -1;
}
function localGitArguments(args: string[], config: string[]): string[] {
  const position = gitCommandIndex(args), command = args[position];
  const separator = args.indexOf("--", position + 1);
  const flags = args.slice(position + 1, separator < 0 ? undefined : separator);
  if (command === "clean" || command === "reset" && flags.includes("--hard") || command === "worktree" && flags.includes("--force")) {
    throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Destructive force, reset and clean execution is unavailable for local Git targets.");
  }
  const settings = ["core.hooksPath=/dev/null", "core.fsmonitor=false", "core.pager=", "commit.gpgSign=false",
    "tag.gpgSign=false", "credential.helper=", "credential.interactive=false", "core.askPass=",
    "protocol.allow=never", "protocol.https.allow=always", "protocol.http.allow=always", "protocol.ssh.allow=always", "core.sshCommand=ssh", "ssh.variant=ssh", "diff.external=",
    "interactive.diffFilter=", "core.editor=", "sequence.editor=", "init.templateDir=", "maintenance.auto=false",
    "gc.auto=0", "submodule.recurse=false", "fetch.recurseSubmodules=false", "diff.ignoreSubmodules=all",
    "core.protectNTFS=true", "core.protectHFS=true", "core.attributesFile=/dev/null", ...config];
  const safeArgs = !["diff", "show", "log"].includes(command) ? args : [...args.slice(0, position + 1), "--no-ext-diff", "--no-textconv", ...args.slice(position + 1)];
  return ["--no-pager", ...settings.flatMap(value => ["-c", value]), ...safeArgs];
}

export async function runBoundedGit(options: GitExecutionOptions): Promise<GitExecutionResult> {
  const policy = localPolicy.getStore();
  policy?.verify?.(options.cwd, options.args);
  const resolver = httpAuthentication.getStore();
  const command = options.args[gitCommandIndex(options.args)];
  const authentication = resolver && (["clone", "fetch", "push", "ls-remote"].includes(command) || command === "remote" && options.args[gitCommandIndex(options.args) + 1] === "prune") ? await resolver(options.cwd, options.args) : null;
  policy?.verify?.(options.cwd, options.args);
  let authenticationEnvironment: Record<string, string> = {};
  const confidential: string[] = [];
  if (authentication) {
    let destination: URL;
    try { destination = new URL(authentication.destination); } catch { throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Git authentication destination is invalid."); }
    if (!["https:", "http:"].includes(destination.protocol) || destination.username || destination.password || destination.search || destination.hash || !/^[a-z0-9][a-z0-9_.-]{0,99}$/i.test(authentication.username) || !/^[\x21-\x7e]{1,2048}$/.test(authentication.password) || options.onStdout) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Git authentication cannot be applied to this bounded operation.");
    const encoded = Buffer.from(`${authentication.username}:${authentication.password}`, "utf8").toString("base64");
    confidential.push(authentication.password, encoded);
    authenticationEnvironment = { GIT_CONFIG_COUNT: "4", GIT_CONFIG_KEY_0: "http.extraHeader", GIT_CONFIG_VALUE_0: "",
      GIT_CONFIG_KEY_1: `http.${destination.toString()}.extraHeader`, GIT_CONFIG_VALUE_1: "",
      GIT_CONFIG_KEY_2: `http.${destination.toString()}.extraHeader`, GIT_CONFIG_VALUE_2: `Authorization: Basic ${encoded}`,
      GIT_CONFIG_KEY_3: "http.followRedirects", GIT_CONFIG_VALUE_3: "false" };
  }
  const scrub = (value: string) => confidential.reduce((result, secret) => result.replaceAll(secret, "<REDACTED>"), value);
  if (policy?.deadline && Date.now() >= policy.deadline) return Promise.reject(new AgentHarnessError("GIT_TIMEOUT", "Local Git discovery deadline reached."));
  const timeoutMs = Math.min(Math.max(1, options.timeoutMs ?? GIT_COMMAND_TIMEOUT_MS), GIT_COMMAND_TIMEOUT_MS,
    policy?.deadline ? Math.max(1, policy.deadline - Date.now()) : GIT_COMMAND_TIMEOUT_MS);
  const stdoutLimitBytes = Math.min(
    Math.max(1, options.stdoutLimitBytes ?? GIT_STDOUT_LIMIT_BYTES),
    GIT_STDOUT_LIMIT_BYTES,
  );
  const stderrLimitBytes = Math.min(
    Math.max(1, options.stderrLimitBytes ?? GIT_STDERR_LIMIT_BYTES),
    GIT_STDERR_LIMIT_BYTES,
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    let stoppedEarly = false;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let terminalError: AgentHarnessError | null = null;
    let child;

    try {
      const requestedArgs = policy ? localGitArguments(options.args, policy.config) : options.args;
      const args = process.platform === "win32" ? ["-c", "core.longpaths=true", ...requestedArgs] : requestedArgs;
      const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !(policy && /^(GIT_|GCM_|SSH_)/i.test(key)) && !(authentication && /^(GIT_CONFIG_|GIT_TRACE|GIT_CURL_VERBOSE)/i.test(key))));
      child = spawn("git", args, {
        cwd: options.cwd,
        detached: process.platform !== "win32",
        shell: false,
        windowsHide: true,
        stdio: [options.stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
        env: {
          ...environment,
          ...(policy ? { GIT_CONFIG_NOSYSTEM: "1", GIT_ATTR_NOSYSTEM: "1", GIT_ASKPASS: "", SSH_ASKPASS: "", GIT_NO_REPLACE_OBJECTS: "1" } : {}),
          ...(options.commitDates ? { GIT_AUTHOR_DATE: options.commitDates.author, GIT_COMMITTER_DATE: options.commitDates.committer } : {}),
          GIT_OPTIONAL_LOCKS: "0",
          GIT_TERMINAL_PROMPT: "0",
          GIT_MERGE_AUTOEDIT: "no",
          GCM_INTERACTIVE: "Never",
          ...authenticationEnvironment,
        },
      });
    } catch {
      reject(new AgentHarnessError("GIT_EXECUTION_FAILED", "Git could not be started."));
      return;
    }
    if (child.stdin) {
      child.stdin.on("error", () => undefined);
      child.stdin.end(options.stdin);
    }
    if (typeof child.pid === "number") {
      options.onSpawn?.(child.pid);
    }

    const terminate = (): void => {
      if (child.exitCode !== null) {
        return;
      }
      if (process.platform === "win32" && typeof child.pid === "number") {
        const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
          shell: false,
          windowsHide: true,
          stdio: "ignore",
        });
        killer.unref();
      } else if (typeof child.pid === "number") {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill();
        }
      } else {
        child.kill();
      }
      const forceTimer = setTimeout(() => {
        if (child.exitCode === null) {
          if (process.platform !== "win32" && typeof child.pid === "number") {
            try {
              process.kill(-child.pid, "SIGKILL");
            } catch {
              child.kill("SIGKILL");
            }
          } else {
            child.kill("SIGKILL");
          }
        }
      }, 250);
      forceTimer.unref();
    };

    const stop = (): void => {
      if (stoppedEarly) {
        return;
      }
      stoppedEarly = true;
      terminate();
    };

    const timeout = setTimeout(() => {
      terminalError = new AgentHarnessError("GIT_TIMEOUT", `Git exceeded the ${timeoutMs} ms command deadline.`);
      terminate();
    }, timeoutMs);
    timeout.unref();

    child.stdout!.on("data", (value: Buffer | string) => {
      if (stoppedEarly || terminalError) {
        return;
      }
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      stdoutBytes += chunk.length;
      if (stdoutBytes > stdoutLimitBytes) {
        terminalError = new AgentHarnessError(
          "GIT_OUTPUT_LIMIT",
          `Git stdout exceeded the ${stdoutLimitBytes} byte limit.`,
        );
        terminate();
        return;
      }
      if (options.collectStdout !== false) {
        stdout.push(chunk);
      }
      options.onStdout?.(chunk, stop);
    });

    child.stderr!.on("data", (value: Buffer | string) => {
      if (terminalError) {
        return;
      }
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      stderrBytes += chunk.length;
      if (stderrBytes > stderrLimitBytes) {
        terminalError = new AgentHarnessError(
          "GIT_OUTPUT_LIMIT",
          `Git stderr exceeded the ${stderrLimitBytes} byte limit.`,
        );
        terminate();
        return;
      }
      stderr.push(chunk);
    });

    child.once("error", () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(new AgentHarnessError("GIT_EXECUTION_FAILED", "Git could not be started or executed."));
    });

    child.once("close", (exitCode) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (terminalError) {
        reject(terminalError);
        return;
      }
      const stderrText = scrub(Buffer.concat(stderr).toString("utf8"));
      if (!stoppedEarly && options.rejectNonZero !== false && exitCode !== 0) {
        reject(new AgentHarnessError(
          "GIT_EXECUTION_FAILED",
          "Git exited unsuccessfully.",
          {
            exitCode,
            stderr: boundedDiagnostic(stderrText),
          },
        ));
        return;
      }
      const collected = Buffer.concat(stdout);
      const stdoutBuffer = authentication ? Buffer.from(scrub(collected.toString("utf8")), "utf8") : collected;
      resolve({
        stdout: stdoutBuffer.toString("utf8"),
        stdoutBuffer,
        stderr: stderrText,
        exitCode,
        stoppedEarly,
      });
    });
  });
}

export async function isGitWorkTree(root: string): Promise<boolean> {
  const result = await runBoundedGit({
    cwd: root,
    args: ["rev-parse", "--is-inside-work-tree"],
    rejectNonZero: false,
  });
  return result.exitCode === 0 && result.stdout.trim() === "true";
}

export async function enumerateGitCandidates(input: {
  root: string;
  pathspec?: string;
  maxCandidates: number;
}): Promise<{ files: string[]; truncated: boolean; truncationReason: GitCandidateTruncationReason }> {
  const files: string[] = [];
  let pending = Buffer.alloc(0);
  let truncated = false;

  const args = ["--no-pager", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--"];
  if (input.pathspec && input.pathspec !== ".") {
    args.push(input.pathspec.replaceAll("\\", "/"));
  }

  let result: GitExecutionResult;
  try {
    result = await runBoundedGit({
      cwd: input.root,
      args,
      collectStdout: false,
      onStdout: (chunk, stop) => {
        pending = Buffer.concat([pending, chunk]);
        let separator = pending.indexOf(0);
        while (separator >= 0) {
          const relativePath = pending.subarray(0, separator).toString("utf8");
          pending = pending.subarray(separator + 1);
          if (relativePath) {
            files.push(relativePath);
            if (files.length > input.maxCandidates) {
              truncated = true;
              stop();
              return;
            }
          }
          separator = pending.indexOf(0);
        }
      },
    });
  } catch (error) {
    if (error instanceof AgentHarnessError && error.code === "GIT_TIMEOUT") {
      return { files: files.slice(0, input.maxCandidates), truncated: true, truncationReason: "deadline" };
    }
    if (error instanceof AgentHarnessError && error.code === "GIT_OUTPUT_LIMIT") {
      return { files: files.slice(0, input.maxCandidates), truncated: true, truncationReason: "output-limit" };
    }
    throw error;
  }

  return {
    files: files.slice(0, input.maxCandidates),
    truncated: truncated || result.stoppedEarly,
    truncationReason: truncated || result.stoppedEarly ? "candidate-limit" : null,
  };
}

function boundedDiagnostic(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 1_000);
}
