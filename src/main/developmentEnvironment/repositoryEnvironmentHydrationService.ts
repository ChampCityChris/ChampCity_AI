import { spawn } from "node:child_process";
import type { RepositoryEnvironmentHydrationResult } from "../../shared/workspaceContracts";
import { resolveWindowsNpmInvocation } from "../core/windowsNpmInvocation";
import { detectRepositoryEcosystemProviders, type RepositoryEcosystemProvider } from "./repositoryEcosystemProvider";

export interface RestoreExecutionResult {
  exitCode: number | null;
  error: string | null;
}

export type RestoreExecutor = (command: string[], cwd: string) => Promise<RestoreExecutionResult>;

/** Execute only the commands selected by the existing top-level ecosystem detector. */
export async function hydrateRepositoryEnvironment(
  devCheckoutRoot: string,
  execute: RestoreExecutor = executeRestoreCommand,
): Promise<RepositoryEnvironmentHydrationResult> {
  let providers: RepositoryEcosystemProvider[];
  try {
    providers = detectRepositoryEcosystemProviders(devCheckoutRoot);
  } catch {
    return { state: "degraded", providers: [], error: "Development environment discovery failed." };
  }
  if (providers.length === 0) return { state: "not-applicable", providers: [], error: null };

  const results: RepositoryEnvironmentHydrationResult["providers"] = [];
  for (const provider of providers) {
    try {
      const result = await execute(provider.restoreCommand, devCheckoutRoot);
      results.push({ ecosystem: provider.ecosystem,
        state: result.exitCode === 0 && result.error === null ? "ready" : "degraded" });
    } catch {
      results.push({ ecosystem: provider.ecosystem, state: "degraded" });
    }
  }
  const failed = results.filter(result => result.state === "degraded").map(result => result.ecosystem);
  return { state: failed.length ? "degraded" : "ready", providers: results,
    error: failed.length ? `Dependency restore needs attention: ${failed.join(", ")}.` : null };
}

/** A bounded, noninteractive runner. Output stays out of the admission response. */
export async function executeRestoreCommand(command: string[], cwd: string): Promise<RestoreExecutionResult> {
  if (command.length === 0) return { exitCode: null, error: "Empty restore command." };
  let executable = command[0];
  let args = command.slice(1);
  try {
    if (process.platform === "win32" && executable === "npm") {
      const invocation = resolveWindowsNpmInvocation();
      executable = invocation.executable;
      args = [invocation.cliPath, ...args];
    }
  } catch {
    return { exitCode: null, error: "Required host command is unavailable." };
  }
  return new Promise(resolve => {
    let settled = false;
    let child;
    const finish = (result: RestoreExecutionResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    try {
      child = spawn(executable, args, { cwd, shell: false, windowsHide: true,
        stdio: "ignore", timeout: 15 * 60_000,
        env: { ...process.env, CI: "true", npm_config_yes: "true" } });
    } catch {
      finish({ exitCode: null, error: "Required host command could not start." });
      return;
    }
    child.once("error", () => finish({ exitCode: null, error: "Required host command could not start or timed out." }));
    child.once("close", code => finish({ exitCode: code, error: code === 0 ? null : "Restore command failed." }));
  });
}
