import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import path from "node:path";
import type {
  AgentHarnessServiceHostLaunchTarget,
  AgentHarnessServiceHostLaunchTargetInput,
} from "./agentHarnessServiceHostStartupRegistration";

export interface ChampCitySiblingProcessLaunchOptions {
  target: AgentHarnessServiceHostLaunchTarget;
  launchTargetInput: AgentHarnessServiceHostLaunchTargetInput;
  environment: NodeJS.ProcessEnv;
  windowsHide: boolean;
}

type SpawnSiblingProcess = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess;

export function resolveChampCitySiblingProcessWorkingDirectory(
  input: AgentHarnessServiceHostLaunchTargetInput,
): string {
  return input.isPackaged ? path.dirname(input.executablePath) : input.applicationPath;
}

export async function launchDetachedChampCitySiblingProcess(
  options: ChampCitySiblingProcessLaunchOptions,
  spawnProcess: SpawnSiblingProcess = spawn,
): Promise<number | undefined> {
  const child = spawnProcess(options.target.path, options.target.args, {
    cwd: resolveChampCitySiblingProcessWorkingDirectory(options.launchTargetInput),
    detached: true,
    stdio: "ignore",
    windowsHide: options.windowsHide,
    env: options.environment,
  });

  await waitForAcceptedSpawn(child);
  child.unref();
  return child.pid;
}

function waitForAcceptedSpawn(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSpawn = (): void => {
      child.off("error", onError);
      resolve();
    };
    const onError = (error: Error): void => {
      child.off("spawn", onSpawn);
      reject(error);
    };
    child.once("spawn", onSpawn);
    child.once("error", onError);
  });
}
