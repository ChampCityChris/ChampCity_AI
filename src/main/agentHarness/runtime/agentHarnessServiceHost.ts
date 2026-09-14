import { powerMonitor, type App } from "electron";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessController } from "./agentHarnessController";
import { agentHarnessEnvironmentOverrides } from "./agentHarnessEnvironment";
import {
  createAgentHarnessServiceHostDescriptor,
  removeCurrentAgentHarnessServiceHostDescriptor,
  writeAgentHarnessServiceHostDescriptor,
} from "./agentHarnessServiceHostDescriptor";
import { AgentHarnessServiceHostServer } from "./agentHarnessServiceHostServer";
import { probeAgentHarnessServiceHostEndpoint } from "./agentHarnessServiceHostClient";
import { computeAgentHarnessRuntimeBuildIdentity } from "./agentHarnessBuildIdentity";
import { AgentHarnessServiceLifecycleCoordinator } from "./agentHarnessServiceLifecycle";
import { BackgroundAgentTrayController } from "./backgroundAgentTray";
import { relaunchBackgroundAgent } from "./backgroundAgentRelaunch";
import {
  prepareBackgroundAgentStartupIntent,
  writeBackgroundAgentExplicitStopIntent,
} from "./backgroundAgentIntent";
import {
  initializeAgentHarnessServiceHostLifecycleSettings,
  readAgentHarnessServiceHostLifecycleSettings,
  writeAgentHarnessServiceHostLifecycleSettings,
} from "./agentHarnessServiceHostLifecycleSettings";
import {
  readChampCityInstalledScopeMetadata,
  startupRegistrationScopeForInstallScope,
} from "./champCityInstalledScope";
import {
  agentHarnessServiceHostStartupOriginArgument,
  applyAgentHarnessServiceHostStartupRegistration,
  computeAgentHarnessServiceHostDesktopLaunchTarget,
  computeChampCityDesktopLaunchTarget,
  serviceHostLaunchTargetFromApp,
} from "./agentHarnessServiceHostStartupRegistration";
import { launchDetachedChampCitySiblingProcess } from "./champCitySiblingProcessLaunch";

export async function runAgentHarnessServiceHost(application: App): Promise<void> {
  const userDataRoot = application.getPath("userData");
  const installedScope = readChampCityInstalledScopeMetadata();
  const lifecycleSettings = initializeAgentHarnessServiceHostLifecycleSettings(
    userDataRoot,
    installedScope.backgroundAgentLaunchAtLoginDefault,
  );
  if (process.argv.includes(agentHarnessServiceHostStartupOriginArgument)) {
    if (!prepareBackgroundAgentStartupIntent(userDataRoot, {
      startupOrigin: true,
      launchAtLogin: lifecycleSettings.launchAtLogin,
    })) {
      application.exit(0);
      return;
    }
  }
  const runtimeBuildIdentity = computeAgentHarnessRuntimeBuildIdentity(path.resolve(__dirname, "../.."));
  const descriptor = createAgentHarnessServiceHostDescriptor(userDataRoot, runtimeBuildIdentity);
  const controller = new AgentHarnessController({
    workerEntryPath: path.join(__dirname, "agentHarnessWorker.js"),
    userDataRoot,
    environmentOverrides: agentHarnessEnvironmentOverrides(),
  });
  const lifecycle = new AgentHarnessServiceLifecycleCoordinator({ controller });
  const onSuspend = (): void => {
    void lifecycle.handleSuspend();
  };
  const onResume = (): void => {
    void lifecycle.handleResume();
  };
  let shutdownPromise: Promise<void> | null = null;
  let descriptorWritten = false;
  let trayController: BackgroundAgentTrayController | null = null;
  const shutdown = (): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise;
    }
    shutdownPromise = (async () => {
      lifecycle.markStopping();
      powerMonitor.off("suspend", onSuspend);
      powerMonitor.off("resume", onResume);
      try {
        await server.close();
      } finally {
        try {
          await controller.shutdown();
        } finally {
          if (descriptorWritten) {
            removeCurrentAgentHarnessServiceHostDescriptor(userDataRoot, descriptor.instanceId);
          }
          trayController?.destroy();
          trayController = null;
        }
      }
    })();
    return shutdownPromise;
  };
  const requestShutdown = (): void => {
    void shutdown().finally(() => application.exit(0));
  };
  const requestTrayRestart = async (): Promise<void> => {
    const target = computeAgentHarnessServiceHostDesktopLaunchTarget(serviceHostLaunchTargetFromApp(application));
    await relaunchBackgroundAgent(
      application,
      target,
      () => lifecycle.prepareControlledRestart(),
      requestShutdown,
    );
  };
  const server = new AgentHarnessServiceHostServer({
    descriptor,
    controller,
    onDescriptorReconciliation: () => {
      writeAgentHarnessServiceHostDescriptor(userDataRoot, descriptor);
      descriptorWritten = true;
    },
    onShutdownRequested: requestShutdown,
    onUserExitRequested: async () => {
      writeBackgroundAgentExplicitStopIntent(userDataRoot);
    },
    isTrayPresent: () => trayController?.isPresent() ?? false,
    lifecycle,
  });

  const terminateSignal = (): void => requestShutdown();
  process.once("SIGINT", terminateSignal);
  process.once("SIGTERM", terminateSignal);

  try {
    try {
      await server.listen();
    } catch (error) {
      if (!isAddressInUseError(error)) {
        throw error;
      }
      const competingHost = await probeAgentHarnessServiceHostEndpoint(userDataRoot, 2_000);
      if (competingHost.state === "live") {
        await shutdown().catch(() => undefined);
        application.exit(0);
        return;
      }
      if (process.platform !== "win32" && competingHost.state === "absent") {
        removeStaleLocalSocket(descriptor.controlAddress);
        await server.listen();
      } else {
        throw new Error(
          competingHost.state === "indeterminate"
            ? competingHost.error
            : "Canonical Agent Harness Service Host endpoint could not be acquired safely.",
        );
      }
    }
    writeAgentHarnessServiceHostDescriptor(userDataRoot, descriptor);
    descriptorWritten = true;
    const status = await controller.start().catch(() => null);
    if (process.platform === "win32") {
      trayController = new BackgroundAgentTrayController({
        iconPath: path.resolve(__dirname, "../../../branding/ChampCity-AI.ico"),
        controller,
        lifecycle,
        readLaunchAtLogin: () => readAgentHarnessServiceHostLifecycleSettings(userDataRoot).launchAtLogin,
        readStartupRegistrationScope: () => startupRegistrationScopeForInstallScope(installedScope.installScope),
        actions: {
          openChampCity: () => launchChampCityDesktop(application, userDataRoot),
          startMcpRuntime: () => lifecycle.start(),
          stopMcpRuntime: () => controller.stop(),
          restartBackgroundAgent: requestTrayRestart,
          setLaunchAtLogin: (enabled) => {
            const settings = { launchAtLogin: enabled };
            writeAgentHarnessServiceHostLifecycleSettings(userDataRoot, settings);
            applyAgentHarnessServiceHostStartupRegistration(
              application,
              serviceHostLaunchTargetFromApp(application),
              settings,
              process.platform,
              installedScope,
            );
          },
          exitBackgroundAgent: async () => {
            writeBackgroundAgentExplicitStopIntent(userDataRoot);
            requestShutdown();
          },
        },
      });
      await trayController.create();
    }
    if (status?.state === "running") {
      lifecycle.markReady("startup");
    } else {
      lifecycle.markDegraded("resume-readiness-failed", status?.lastError ?? "Agent Harness runtime was not ready at host startup.");
    }
    powerMonitor.on("suspend", onSuspend);
    powerMonitor.on("resume", onResume);
    lifecycle.startSupervision();
  } catch (error) {
    await shutdown().catch(() => undefined);
    throw error;
  }
}

export async function launchChampCityDesktop(application: App, userDataRoot: string): Promise<number | undefined> {
  const launchTargetInput = serviceHostLaunchTargetFromApp(application);
  const target = computeChampCityDesktopLaunchTarget(launchTargetInput);
  const desktopEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    CHAMPCITY_USER_DATA_ROOT: userDataRoot,
  };
  delete desktopEnvironment.ELECTRON_RUN_AS_NODE;
  return launchDetachedChampCitySiblingProcess({
    target,
    launchTargetInput,
    environment: desktopEnvironment,
    windowsHide: false,
  });
}

function isAddressInUseError(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === "EADDRINUSE";
}

function removeStaleLocalSocket(controlAddress: string): void {
  try {
    fs.unlinkSync(controlAddress);
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}
