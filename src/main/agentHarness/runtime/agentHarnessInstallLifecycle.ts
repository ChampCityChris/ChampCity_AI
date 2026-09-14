import type { App } from "electron";
import {
  applyAgentHarnessServiceHostStartupRegistration,
  serviceHostLaunchTargetFromApp,
} from "./agentHarnessServiceHostStartupRegistration";
import {
  initializeAgentHarnessServiceHostLifecycleSettings,
  writeAgentHarnessServiceHostLifecycleSettings,
} from "./agentHarnessServiceHostLifecycleSettings";
import {
  readChampCityInstalledScopeMetadata,
  type ChampCityInstalledScopeMetadata,
} from "./champCityInstalledScope";
import {
  clearBackgroundAgentExplicitStopIntent,
  writeBackgroundAgentExplicitStopIntent,
} from "./backgroundAgentIntent";
import {
  AgentHarnessServiceHostClient,
  probeAgentHarnessServiceHostEndpoint,
  type AgentHarnessServiceHostEndpointProbe,
} from "./agentHarnessServiceHostClient";
import {
  readAgentHarnessServiceHostDescriptor,
  removeAgentHarnessServiceHostDescriptorAfterEndpointAbsence,
  type AgentHarnessServiceHostDescriptor,
} from "./agentHarnessServiceHostDescriptor";
import type { AgentHarnessServiceHostIdentity } from "./agentHarnessServiceHostProtocol";
import {
  acquireDesktopLifecycleLease,
  isLocalProcessRunningWithoutTermination,
  releaseDesktopLifecycleLease,
} from "./desktopLifecycleLease";

export const champCityInstallConfigureArgumentPrefix =
  "--champcity-install-configure-background-agent=";
export const champCityUninstallCleanupArgument = "--champcity-uninstall-cleanup";

export const champCityMaintenanceExitCode = Object.freeze({
  failure: 1,
  malformedArgument: 10,
  foregroundDesktopOpen: 20,
  startupRegistrationFailed: 21,
  endpointOwnershipIndeterminate: 22,
  serviceHostShutdownFailed: 23,
});

export type ChampCityInstallLifecycleMode =
  | { kind: "install-configure"; launchAtLogin: boolean }
  | { kind: "uninstall-cleanup" }
  | { kind: "none" };

interface InstallLifecycleApplication extends Pick<App,
  "getPath" | "setLoginItemSettings" | "getLoginItemSettings" | "isPackaged" | "getAppPath"> {}

export class ChampCityMaintenanceError extends Error {
  constructor(
    readonly exitCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ChampCityMaintenanceError";
  }
}

export function parseChampCityInstallLifecycleMode(argv: readonly string[]): ChampCityInstallLifecycleMode {
  const installArguments = argv.filter((argument) =>
    argument.startsWith("--champcity-install-configure-background-agent"));
  const uninstallArguments = argv.filter((argument) => argument === champCityUninstallCleanupArgument);
  if (installArguments.length === 0 && uninstallArguments.length === 0) {
    return { kind: "none" };
  }
  if (installArguments.length === 0 && uninstallArguments.length === 1) {
    return { kind: "uninstall-cleanup" };
  }
  if (installArguments.length !== 1 || uninstallArguments.length !== 0) {
    throw new ChampCityMaintenanceError(
      champCityMaintenanceExitCode.malformedArgument,
      "ChampCity install maintenance accepts exactly one install configuration mode.",
    );
  }
  const value = installArguments[0].slice(champCityInstallConfigureArgumentPrefix.length);
  if (!installArguments[0].startsWith(champCityInstallConfigureArgumentPrefix) ||
    (value !== "enabled" && value !== "disabled")) {
    throw new ChampCityMaintenanceError(
      champCityMaintenanceExitCode.malformedArgument,
      "Background Agent install configuration must be exactly enabled or disabled.",
    );
  }
  return { kind: "install-configure", launchAtLogin: value === "enabled" };
}

export async function configureInstalledBackgroundAgent(
  application: InstallLifecycleApplication,
  launchAtLogin: boolean,
  platform: NodeJS.Platform = process.platform,
  installedScope: ChampCityInstalledScopeMetadata = readChampCityInstalledScopeMetadata(),
): Promise<void> {
  if (!application.isPackaged || platform !== "win32") {
    throw new ChampCityMaintenanceError(
      champCityMaintenanceExitCode.startupRegistrationFailed,
      "Install configuration is available only to a packaged Windows application.",
    );
  }
  const userDataRoot = application.getPath("userData");
  const settings = installedScope.installScope === "all-users"
    ? initializeAgentHarnessServiceHostLifecycleSettings(
        userDataRoot,
        installedScope.backgroundAgentLaunchAtLoginDefault,
      )
    : { launchAtLogin };
  const registration = applyAgentHarnessServiceHostStartupRegistration(
    application,
    serviceHostLaunchTargetFromApp(application as App),
    settings,
    platform,
    installedScope,
  );
  const registrationMatches = registration.startupRegistrationSupported &&
    registration.windowsVerification?.confirmed === true;
  if (!registrationMatches) {
    throw new ChampCityMaintenanceError(
      champCityMaintenanceExitCode.startupRegistrationFailed,
      "Windows sign-in registration did not confirm the selected Background Agent startup setting: " +
        (registration.windowsVerification?.diagnostic ?? "Windows observation unavailable."),
    );
  }
  if (installedScope.installScope === "current-user") {
    writeAgentHarnessServiceHostLifecycleSettings(userDataRoot, settings);
  }
  if (installedScope.installScope === "current-user" && launchAtLogin) {
    clearBackgroundAgentExplicitStopIntent(userDataRoot);
  }
}

interface UninstallCleanupDependencies {
  probe: (userDataRoot: string, timeoutMs?: number) => Promise<AgentHarnessServiceHostEndpointProbe>;
  shutdownLiveHost: (
    userDataRoot: string,
    admittedIdentity: AgentHarnessServiceHostIdentity,
  ) => Promise<void>;
  readDescriptor: (userDataRoot: string) => AgentHarnessServiceHostDescriptor | null;
  isProcessRunning: (processId: number) => boolean;
  wait: (milliseconds: number) => Promise<void>;
  now: () => number;
  shutdownTimeoutMs: number;
  pollIntervalMs: number;
}

const defaultUninstallCleanupDependencies: UninstallCleanupDependencies = {
  probe: probeAgentHarnessServiceHostEndpoint,
  shutdownLiveHost: async (userDataRoot, admittedIdentity) => {
    const client = new AgentHarnessServiceHostClient({
      userDataRoot,
      launchServiceHost: () => {
        throw new Error("Uninstall cleanup must never launch a Background Agent.");
      },
      requestTimeoutMs: 2_000,
      discoveryTimeoutMs: 5_000,
      discoveryPollIntervalMs: 50,
    });
    const connectedIdentity = await client.connect();
    if (!sameShutdownIdentity(connectedIdentity, admittedIdentity)) {
      throw new Error("The Background Agent identity changed before graceful shutdown could be requested.");
    }
    await client.shutdownServiceHost();
  },
  readDescriptor: readAgentHarnessServiceHostDescriptor,
  isProcessRunning: isLocalProcessRunningWithoutTermination,
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now: () => Date.now(),
  shutdownTimeoutMs: 10_000,
  pollIntervalMs: 100,
};

export async function cleanupBackgroundAgentForUninstall(
  application: InstallLifecycleApplication,
  platform: NodeJS.Platform = process.platform,
  dependencyOverrides: Partial<UninstallCleanupDependencies> = {},
  installedScope: ChampCityInstalledScopeMetadata = readChampCityInstalledScopeMetadata(),
): Promise<void> {
  if (!application.isPackaged || platform !== "win32") {
    throw new ChampCityMaintenanceError(
      champCityMaintenanceExitCode.failure,
      "Uninstall cleanup is available only to a packaged Windows application.",
    );
  }
  const userDataRoot = application.getPath("userData");
  const maintenanceLeaseAcquisition = await acquireDesktopLifecycleLease(
    userDataRoot,
    "uninstall-maintenance",
  );
  if (!maintenanceLeaseAcquisition.acquired) {
    const foregroundDesktopOwnsExclusion = maintenanceLeaseAcquisition.reason === "live-owner" &&
      maintenanceLeaseAcquisition.existingLease?.owner === "desktop";
    throw new ChampCityMaintenanceError(
      foregroundDesktopOwnsExclusion
        ? champCityMaintenanceExitCode.foregroundDesktopOpen
        : champCityMaintenanceExitCode.failure,
      foregroundDesktopOwnsExclusion
        ? "Close the ChampCity A/I desktop before uninstalling."
        : maintenanceLeaseAcquisition.existingLease?.owner === "uninstall-maintenance"
          ? "Another ChampCity uninstall maintenance operation is already running."
          : "ChampCity desktop lifecycle ownership could not be established safely.",
    );
  }
  const dependencies = { ...defaultUninstallCleanupDependencies, ...dependencyOverrides };
  try {
    const initialProbe = await dependencies.probe(userDataRoot, 2_000);
    if (initialProbe.state === "indeterminate") {
      throw new ChampCityMaintenanceError(
        champCityMaintenanceExitCode.endpointOwnershipIndeterminate,
        initialProbe.error,
      );
    }

    const disabledSettings = { launchAtLogin: false };
    if (installedScope.installScope === "current-user") {
      const registration = applyAgentHarnessServiceHostStartupRegistration(
        application,
        serviceHostLaunchTargetFromApp(application as App),
        disabledSettings,
        platform,
        installedScope,
      );
      if (!registration.startupRegistrationSupported ||
        registration.loginItemRegistered || registration.executableWillLaunchAtLogin) {
        throw new ChampCityMaintenanceError(
          champCityMaintenanceExitCode.startupRegistrationFailed,
          "Windows sign-in registration could not be disabled before uninstall.",
        );
      }
      writeAgentHarnessServiceHostLifecycleSettings(userDataRoot, disabledSettings);
      writeBackgroundAgentExplicitStopIntent(userDataRoot);
    }

    if (initialProbe.state === "absent") {
      removeAgentHarnessServiceHostDescriptorAfterEndpointAbsence(userDataRoot);
      return;
    }

    const admittedIdentity = initialProbe.identity;
    try {
      await dependencies.shutdownLiveHost(userDataRoot, admittedIdentity);
    } catch (error) {
      throw new ChampCityMaintenanceError(
        champCityMaintenanceExitCode.serviceHostShutdownFailed,
        `The bounded Background Agent did not accept graceful shutdown: ${boundedMaintenanceMessage(error)}`,
      );
    }

    const deadline = dependencies.now() + dependencies.shutdownTimeoutMs;
    let lastIncompleteEvidence = "the canonical endpoint remained live";
    while (dependencies.now() < deadline) {
      const probe = await dependencies.probe(userDataRoot, 500);
      if (probe.state === "absent") {
        try {
          const descriptor = dependencies.readDescriptor(userDataRoot);
          const admittedDescriptorAbsent = descriptor?.instanceId !== admittedIdentity.instanceId;
          const serviceHostRunning = dependencies.isProcessRunning(admittedIdentity.serviceHostProcessId);
          const workerRunning = admittedIdentity.workerProcessId === null
            ? false
            : dependencies.isProcessRunning(admittedIdentity.workerProcessId);
          if (admittedDescriptorAbsent && !serviceHostRunning && !workerRunning) {
            return;
          }
          lastIncompleteEvidence = describeIncompleteQuiescence(
            admittedDescriptorAbsent,
            serviceHostRunning,
            workerRunning,
          );
        } catch (error) {
          lastIncompleteEvidence = `terminal process evidence could not be confirmed: ${boundedMaintenanceMessage(error)}`;
        }
      }
      if (probe.state === "indeterminate") {
        lastIncompleteEvidence = probe.error;
      }
      await dependencies.wait(dependencies.pollIntervalMs);
    }
    throw new ChampCityMaintenanceError(
      champCityMaintenanceExitCode.serviceHostShutdownFailed,
      `The Background Agent did not reach full quiescence before the bounded graceful-shutdown deadline: ${lastIncompleteEvidence}.`,
    );
  } finally {
    await releaseDesktopLifecycleLease(userDataRoot, maintenanceLeaseAcquisition.lease);
  }
}

function sameShutdownIdentity(
  connectedIdentity: AgentHarnessServiceHostIdentity,
  admittedIdentity: AgentHarnessServiceHostIdentity,
): boolean {
  return connectedIdentity.instanceId === admittedIdentity.instanceId &&
    connectedIdentity.serviceHostProcessId === admittedIdentity.serviceHostProcessId &&
    connectedIdentity.workerProcessId === admittedIdentity.workerProcessId;
}

function describeIncompleteQuiescence(
  admittedDescriptorAbsent: boolean,
  serviceHostRunning: boolean,
  workerRunning: boolean,
): string {
  const incomplete = [];
  if (!admittedDescriptorAbsent) {
    incomplete.push("the admitted instance descriptor remains present");
  }
  if (workerRunning) {
    incomplete.push("the admitted utility worker is still running");
  }
  if (serviceHostRunning) {
    incomplete.push("the admitted Service Host is still running");
  }
  return incomplete.join(", ") || "terminal shutdown evidence is incomplete";
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === expectedCode;
}

function boundedMaintenanceMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Unknown maintenance failure.";
}
