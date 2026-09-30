import { spawn } from "node:child_process";
import path from "node:path";
import { AgentHarnessError } from "../../core/applicationErrors";
import { resolveWindowsNpmInvocation as resolveStandaloneWindowsNpmInvocation } from "../../core/windowsNpmInvocation";

const DEFAULT_STDOUT_LIMIT_BYTES = 512 * 1_024;
const DEFAULT_STDERR_LIMIT_BYTES = 256 * 1_024;

export type ReleaseCommandId =
  | "npm-ci"
  | "npm-run-typecheck"
  | "npm-run-build"
  | "npm-test"
  | "npm-test-release"
  | "git-diff-check"
  | "git-status-short"
  | "npm-package-win-dir"
  | "npm-package-win"
  | "npm-validate-package-win"
  | "npm-set-version"
  | "git-origin-url"
  | "git-head"
  | "git-status-porcelain"
  | "git-local-tag-target"
  | "git-remote-tag-target"
  | "gh-version"
  | "gh-auth-status"
  | "gh-release-view"
  | "gh-release-create"
  | "gh-release-upload"
  | "gh-release-publish-draft"
  | "gh-release-delete-draft"
  | "gh-release-download";

interface BaseReleaseCommandRequest {
  root: string;
  id: ReleaseCommandId;
}

export type ReleaseCommandRequest =
  | (BaseReleaseCommandRequest & {
      id:
        | "npm-ci"
        | "npm-run-typecheck"
        | "npm-run-build"
        | "npm-test"
        | "npm-test-release"
        | "git-diff-check"
        | "git-status-short"
        | "npm-package-win-dir"
        | "npm-package-win"
        | "npm-validate-package-win"
        | "git-origin-url"
        | "git-head"
        | "git-status-porcelain"
        | "gh-version"
        | "gh-auth-status";
    })
  | (BaseReleaseCommandRequest & { id: "npm-set-version"; version: string })
  | (BaseReleaseCommandRequest & { id: "git-local-tag-target" | "git-remote-tag-target"; tagName: string })
  | (BaseReleaseCommandRequest & {
      id: "gh-release-view" | "gh-release-publish-draft" | "gh-release-delete-draft";
      repository: string;
      tagName: string;
    })
  | (BaseReleaseCommandRequest & {
      id: "gh-release-create";
      repository: string;
      tagName: string;
      title: string;
      notesPath: string;
      notesRelativePath: string;
      prerelease: boolean;
    })
  | (BaseReleaseCommandRequest & {
      id: "gh-release-upload";
      repository: string;
      tagName: string;
      installerPath: string;
      installerRelativePath: string;
    })
  | (BaseReleaseCommandRequest & {
      id: "gh-release-download";
      repository: string;
      tagName: string;
      assetName: string;
      temporaryDirectory: string;
    });

export type ReleaseCommandStatus = "succeeded" | "nonzero" | "spawn-error" | "timeout";

export interface ReleaseCommandReceipt {
  commandId: ReleaseCommandId;
  command: {
    executable: "npm" | "git" | "gh";
    args: string[];
  };
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number | null;
  status: ReleaseCommandStatus;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

export type ReleaseCommandRunner = (request: ReleaseCommandRequest) => Promise<ReleaseCommandReceipt>;

interface SpawnSpecification {
  executable: string;
  publicExecutable: "npm" | "git" | "gh";
  args: string[];
  publicArgs: string[];
  timeoutMs: number;
  environment?: Readonly<Record<string, string>>;
}

export interface WindowsNpmInvocation {
  executable: string;
  cliPath: string;
}

export const runFixedReleaseCommand: ReleaseCommandRunner = async (request) => {
  const specification = commandSpecification(request);
  return runBoundedProcess(request, specification);
};

function commandSpecification(request: ReleaseCommandRequest): SpawnSpecification {
  switch (request.id) {
    case "npm-ci":
      return npmSpec(["ci"], 15 * 60_000);
    case "npm-run-typecheck":
      return npmSpec(["run", "typecheck"], 10 * 60_000);
    case "npm-run-build":
      return npmSpec(["run", "build"], 15 * 60_000);
    case "npm-test-release":
      return npmSpec(["run", "test:release"], 60 * 60_000);
    case "npm-test":
      return npmSpec(["test"], 30 * 60_000);
    case "git-diff-check":
      return spec("git", "git", ["diff", "--check"], 2 * 60_000);
    case "git-status-short":
      return spec("git", "git", ["status", "--short"], 2 * 60_000);
    case "npm-package-win-dir":
      return npmSpec(["run", "package:win:dir"], 30 * 60_000);
    case "npm-package-win":
      return npmSpec(["run", "package:win"], 45 * 60_000);
    case "npm-validate-package-win":
      return npmSpec(["run", "validate:package:win"], 5 * 60_000);
    case "npm-set-version":
      return npmSpec(["version", request.version, "--no-git-tag-version"], 5 * 60_000);
    case "git-origin-url":
      return spec("git", "git", ["remote", "get-url", "origin"], 60_000);
    case "git-head":
      return spec("git", "git", ["rev-parse", "HEAD"], 60_000);
    case "git-status-porcelain":
      return spec("git", "git", ["status", "--porcelain=v1", "--untracked-files=all"], 2 * 60_000);
    case "git-local-tag-target":
      return spec("git", "git", ["rev-parse", "--verify", `refs/tags/${request.tagName}^{commit}`], 60_000);
    case "git-remote-tag-target":
      return spec(
        "git",
        "git",
        ["ls-remote", "--tags", "origin", `refs/tags/${request.tagName}`, `refs/tags/${request.tagName}^{}`],
        2 * 60_000,
      );
    case "gh-version":
      return spec("gh", "gh", ["--version"], 30_000);
    case "gh-auth-status":
      return spec("gh", "gh", ["auth", "status", "--hostname", "github.com"], 60_000);
    case "gh-release-view":
      return spec(
        "gh",
        "gh",
        [
          "release",
          "view",
          request.tagName,
          "--repo",
          request.repository,
          "--json",
          "url,tagName,name,isPrerelease,isDraft,body,assets",
        ],
        2 * 60_000,
      );
    case "gh-release-create": {
      const args = [
        "release",
        "create",
        request.tagName,
        "--repo",
        request.repository,
        "--title",
        request.title,
        "--notes-file",
        request.notesPath,
        "--verify-tag",
      ];
      const publicArgs = [
        "release",
        "create",
        request.tagName,
        "--repo",
        request.repository,
        "--title",
        request.title,
        "--notes-file",
        request.notesRelativePath,
        "--verify-tag",
      ];
      if (request.prerelease) {
        args.push("--prerelease");
        publicArgs.push("--prerelease");
      }
      return spec("gh", "gh", args, 5 * 60_000, publicArgs);
    }
    case "gh-release-upload":
      return spec(
        "gh",
        "gh",
        ["release", "upload", request.tagName, request.installerPath, "--repo", request.repository],
        30 * 60_000,
        ["release", "upload", request.tagName, request.installerRelativePath, "--repo", request.repository],
      );
    case "gh-release-publish-draft":
      return spec(
        "gh", "gh",
        ["release", "edit", request.tagName, "--repo", request.repository, "--draft=false", "--verify-tag"],
        2 * 60_000,
      );
    case "gh-release-delete-draft":
      return spec(
        "gh", "gh",
        ["release", "delete", request.tagName, "--repo", request.repository, "--yes"],
        2 * 60_000,
      );
    case "gh-release-download":
      return spec(
        "gh",
        "gh",
        [
          "release",
          "download",
          request.tagName,
          "--repo",
          request.repository,
          "--pattern",
          request.assetName,
          "--dir",
          request.temporaryDirectory,
        ],
        15 * 60_000,
        [
          "release",
          "download",
          request.tagName,
          "--repo",
          request.repository,
          "--pattern",
          request.assetName,
          "--dir",
          "<OS_TEMP>",
        ],
      );
  }
}

function npmSpec(args: string[], timeoutMs: number): SpawnSpecification {
  if (process.platform !== "win32") {
    return spec("npm", "npm", args, timeoutMs);
  }
  const invocation = resolveWindowsNpmInvocation();
  return spec(
    invocation.executable,
    "npm",
    [invocation.cliPath, ...args],
    timeoutMs,
    args,
  );
}

export function resolveWindowsNpmInvocation(options: {
  executablePath?: string;
  pathValue?: string;
} = {}): WindowsNpmInvocation {
  try {
    return resolveStandaloneWindowsNpmInvocation(options);
  } catch {
    throw new AgentHarnessError(
      "RELEASE_PREREQUISITE_UNAVAILABLE",
      "A standalone Node/npm toolchain could not be resolved from the fixed Windows runtime search path.",
    );
  }
}

function spec(
  executable: string,
  publicExecutable: "npm" | "git" | "gh",
  args: string[],
  timeoutMs: number,
  publicArgs = args,
  environment?: Readonly<Record<string, string>>,
): SpawnSpecification {
  return { executable, publicExecutable, args, publicArgs, timeoutMs, environment };
}

function runBoundedProcess(
  request: ReleaseCommandRequest,
  specification: SpawnSpecification,
): Promise<ReleaseCommandReceipt> {
  return new Promise((resolve) => {
    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let settled = false;
    let child;
    let timeout: NodeJS.Timeout | undefined;

    const finish = (status: ReleaseCommandStatus, exitCode: number | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      const ended = Date.now();
      resolve({
        commandId: request.id,
        command: { executable: specification.publicExecutable, args: specification.publicArgs },
        startedAt,
        endedAt: new Date(ended).toISOString(),
        durationMs: ended - started,
        exitCode,
        status,
        stdout: redactCommandRoot(stdout.toString("utf8"), request.root),
        stderr: redactCommandRoot(stderr.toString("utf8"), request.root),
        stdoutTruncated,
        stderrTruncated,
      });
    };

    try {
      child = spawn(specification.executable, specification.args, {
        cwd: request.root,
        shell: false,
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GH_PROMPT_DISABLED: "true",
          GIT_TERMINAL_PROMPT: "0",
          ...specification.environment,
        },
      });
    } catch {
      finish("spawn-error", null);
      return;
    }

    child.stdout.on("data", (value: Buffer | string) => {
      const captured = appendBoundedTail(stdout, value, DEFAULT_STDOUT_LIMIT_BYTES);
      stdout = captured.value;
      stdoutTruncated ||= captured.truncated;
    });
    child.stderr.on("data", (value: Buffer | string) => {
      const captured = appendBoundedTail(stderr, value, DEFAULT_STDERR_LIMIT_BYTES);
      stderr = captured.value;
      stderrTruncated ||= captured.truncated;
    });
    child.once("error", () => finish("spawn-error", null));
    child.once("close", (exitCode) => finish(
      timedOut ? "timeout" : exitCode === 0 ? "succeeded" : "nonzero",
      exitCode,
    ));

    timeout = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child);
      const fallback = setTimeout(() => finish("timeout", child.exitCode), 3_000);
      fallback.unref();
    }, specification.timeoutMs);
    timeout.unref();
  });
}

function redactCommandRoot(value: string, root: string): string {
  const variants = new Set([
    root,
    path.normalize(root),
    root.replace(/\\/g, "/"),
    root.replace(/\//g, "\\"),
  ]);
  let redacted = value;
  for (const variant of [...variants].filter(Boolean).sort((left, right) => right.length - left.length)) {
    redacted = redacted.replace(
      new RegExp(escapeRegExp(variant), process.platform === "win32" ? "gi" : "g"),
      "<COMMAND_CWD>",
    );
  }
  return redacted;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function appendBoundedTail(
  current: Buffer,
  incoming: Buffer | string,
  limit: number,
): { value: Buffer; truncated: boolean } {
  const chunk = Buffer.isBuffer(incoming) ? incoming : Buffer.from(incoming);
  if (current.length + chunk.length <= limit) {
    return { value: Buffer.concat([current, chunk]), truncated: false };
  }
  const combined = Buffer.concat([current, chunk]);
  return { value: combined.subarray(combined.length - limit), truncated: true };
}

export function terminateProcessTree(child: ReturnType<typeof spawn>): void {
  if (child.exitCode !== null) {
    return;
  }
  if (process.platform === "win32" && typeof child.pid === "number") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      shell: false,
      windowsHide: true,
      stdio: "ignore",
    });
    killer.on("error", () => child.kill("SIGKILL"));
    killer.unref();
    return;
  }
  if (typeof child.pid === "number") {
    try {
      process.kill(-child.pid, "SIGTERM");
      return;
    } catch {
      // Fall back to the direct child below.
    }
  }
  child.kill("SIGTERM");
}
