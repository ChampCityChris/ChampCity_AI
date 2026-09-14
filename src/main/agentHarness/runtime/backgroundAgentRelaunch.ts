import type { App } from "electron";
import type { AgentHarnessServiceHostLaunchTarget } from "./agentHarnessServiceHostStartupRegistration";

interface BackgroundAgentRelaunchApplication extends Pick<App, "relaunch"> {}

export async function relaunchBackgroundAgent(
  application: BackgroundAgentRelaunchApplication,
  target: AgentHarnessServiceHostLaunchTarget,
  prepareControlledRestart: () => Promise<unknown>,
  requestShutdown: () => void,
): Promise<void> {
  await prepareControlledRestart();
  application.relaunch({ execPath: target.path, args: target.args });
  requestShutdown();
}
