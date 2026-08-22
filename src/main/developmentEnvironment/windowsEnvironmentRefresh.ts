import { spawn } from "node:child_process";

export interface WindowsEnvironmentRefreshResult {
  refreshed: boolean;
  summary: string;
  env: NodeJS.ProcessEnv;
}

type EnvironmentScope = "Machine" | "User";

export type WindowsEnvironmentReader = (
  scope: EnvironmentScope,
) => Promise<Record<string, string>>;

export async function refreshWindowsProcessEnvironment(
  reader: WindowsEnvironmentReader = readWindowsEnvironmentScope,
): Promise<WindowsEnvironmentRefreshResult> {
  if (process.platform !== "win32") {
    return {
      refreshed: false,
      summary: "Environment refresh is not required on non-Windows hosts.",
      env: { ...process.env },
    };
  }

  const [machine, user] = await Promise.all([
    reader("Machine"),
    reader("User"),
  ]);
  const refreshed = mergeWindowsEnvironment(process.env, machine, user);
  for (const [key, value] of Object.entries(refreshed)) {
    process.env[key] = value;
  }
  return {
    refreshed: true,
    summary: "Refreshed process environment from Windows user and machine environment state.",
    env: { ...process.env },
  };
}

export function mergeWindowsEnvironment(
  current: NodeJS.ProcessEnv,
  machine: Record<string, string>,
  user: Record<string, string>,
): NodeJS.ProcessEnv {
  const merged: Record<string, string> = {};
  const casing = new Map<string, string>();
  for (const source of [current, machine, user]) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value !== "string") {
        continue;
      }
      const lower = key.toLowerCase();
      const canonical = casing.get(lower) ?? key;
      if (!casing.has(lower)) {
        casing.set(lower, canonical);
      }
      merged[canonical] = value;
    }
  }

  const machinePath = valueForCaseInsensitiveKey(machine, "path");
  const userPath = valueForCaseInsensitiveKey(user, "path");
  const currentPath = valueForCaseInsensitiveKey(current, "path");
  const pathKey = casing.get("path") ?? "Path";
  const refreshedPath = mergePathSegments(machinePath, userPath, currentPath);
  if (refreshedPath) {
    merged[pathKey] = refreshedPath;
  }
  return merged;
}

function valueForCaseInsensitiveKey(
  source: Record<string, string | undefined>,
  key: string,
): string | undefined {
  const entry = Object.entries(source).find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
  return entry?.[1];
}

function mergePathSegments(
  machinePath: string | undefined,
  userPath: string | undefined,
  currentPath: string | undefined,
): string {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const segment of [
    ...pathSegments(machinePath),
    ...pathSegments(userPath),
    ...pathSegments(currentPath),
  ]) {
    const key = segment.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(segment);
  }
  return merged.join(";");
}

function pathSegments(value: string | undefined): string[] {
  return (value ?? "")
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

async function readWindowsEnvironmentScope(scope: EnvironmentScope): Promise<Record<string, string>> {
  const script = [
    `$envs = [Environment]::GetEnvironmentVariables('${scope}')`,
    "$out = @{}",
    "foreach ($key in $envs.Keys) { $out[$key] = [string]$envs[$key] }",
    "$out | ConvertTo-Json -Compress",
  ].join("; ");
  const result = await runProcess("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`Windows environment refresh failed for ${scope}: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout || "{}") as Record<string, string>;
}

function runProcess(
  command: string,
  args: string[],
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ exitCode: null, stdout, stderr: error.message });
    });
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}
