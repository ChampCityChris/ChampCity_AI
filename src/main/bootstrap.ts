import { app } from "electron";
import path from "node:path";
import {
  applyElectronProductIdentity,
  resolveChampCityUserDataRoot,
} from "../shared/productIdentity";
import {
  ChampCityMaintenanceError,
  champCityMaintenanceExitCode,
  cleanupBackgroundAgentForUninstall,
  configureInstalledBackgroundAgent,
  parseChampCityInstallLifecycleMode,
} from "./agentHarness/runtime/agentHarnessInstallLifecycle";

const agentHarnessServiceHostModeArgument = "--agent-harness-service-host";
const userDataRootOverride = process.env.CHAMPCITY_USER_DATA_ROOT;
if (userDataRootOverride) {
  app.setPath("userData", path.resolve(userDataRootOverride));
} else {
  app.setPath("userData", resolveChampCityUserDataRoot(app.getPath("appData")));
}
applyElectronProductIdentity(app);

let installLifecycleMode;
try {
  installLifecycleMode = parseChampCityInstallLifecycleMode(process.argv);
} catch (error) {
  failMaintenanceMode(error);
}

if (installLifecycleMode!.kind !== "none") {
  app.commandLine.appendSwitch("headless");
  app.commandLine.appendSwitch("disable-gpu");
  void app.whenReady()
    .then(async () => {
      if (installLifecycleMode!.kind === "install-configure") {
        await configureInstalledBackgroundAgent(app, installLifecycleMode!.launchAtLogin);
      } else {
        await cleanupBackgroundAgentForUninstall(app);
      }
      app.exit(0);
    })
    .catch(failMaintenanceMode);
} else if (process.argv.includes(agentHarnessServiceHostModeArgument)) {
  app.commandLine.appendSwitch("disable-gpu");
  void import("./agentHarness/runtime/agentHarnessServiceHost")
    .then(({ runAgentHarnessServiceHost }) => app.whenReady().then(() => runAgentHarnessServiceHost(app)))
    .catch((error) => {
      console.error("Agent Harness Service Host failed to start.", error);
      app.exit(1);
    });
} else {
  void import("./main");
}

function failMaintenanceMode(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error("ChampCity install lifecycle maintenance failed.", message);
  app.exit(error instanceof ChampCityMaintenanceError
    ? error.exitCode
    : champCityMaintenanceExitCode.failure);
  throw error;
}
