import { spawn } from "node:child_process";
import { AgentHarnessError } from "../core/errors";

export const GIT_COMMAND_TIMEOUT_MS = 15_000;
export const GIT_STDOUT_LIMIT_BYTES = 1_000_000;
export const GIT_STDERR_LIMIT_BYTES = 65_536;

interface GitExecutionOptions {
  cwd: string;
  args: string[];
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
  stderr: string;
  exitCode: number | null;
  stoppedEarly: boolean;
}

export type GitCandidateTruncationReason = "candidate-limit" | "deadline" | "output-limit" | null;

export function runBoundedGit(options: GitExecutionOptions): Promise<GitExecutionResult> {
  const timeoutMs = Math.min(Math.max(1, options.timeoutMs ?? GIT_COMMAND_TIMEOUT_MS), GIT_COMMAND_TIMEOUT_MS);
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
      child = spawn("git", options.args, {
        cwd: options.cwd,
        detached: process.platform !== "win32",
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GIT_OPTIONAL_LOCKS: "0",
          GIT_TERMINAL_PROMPT: "0",
        },
      });
    } catch {
      reject(new AgentHarnessError("GIT_EXECUTION_FAILED", "Git could not be started."));
      return;
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

    child.stdout.on("data", (value: Buffer | string) => {
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

    child.stderr.on("data", (value: Buffer | string) => {
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
      const stderrText = Buffer.concat(stderr).toString("utf8");
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
      resolve({
        stdout: Buffer.concat(stdout).toString("utf8"),
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
