import type { App } from "electron";
import { win32 } from "node:path";
import { observeCurrentUserWindowsRunValue, type WindowsRunObservation } from "./windowsRunObservation";
import type {
  AgentHarnessServiceHostLifecycleSettings,
  AgentHarnessServiceHostLifecycleStatus,
} from "../../../shared/workspaceContracts";
import {
  defaultChampCityInstalledScopeMetadata,
  startupRegistrationScopeForInstallScope,
  type ChampCityInstalledScopeMetadata,
  type ChampCityStartupRegistrationScope,
} from "./champCityInstalledScope";

export const agentHarnessServiceHostModeArgument = "--agent-harness-service-host";
export const agentHarnessServiceHostStartupOriginArgument = "--agent-harness-startup";
export const agentHarnessServiceHostLoginItemName = "ChampCity Background Agent";

export interface AgentHarnessServiceHostLaunchTarget {
  path: string;
  args: string[];
}

export interface AgentHarnessServiceHostLaunchTargetInput {
  isPackaged: boolean;
  executablePath: string;
  applicationPath: string;
}

interface LoginItemApplicationAdapter {
  setLoginItemSettings?(settings: Electron.Settings): void;
  getLoginItemSettings(options?: Electron.LoginItemSettingsOptions): Electron.LoginItemSettings;
}

type StartupRegistrationStatus = Pick<AgentHarnessServiceHostLifecycleStatus,
  "launchAtLogin" | "loginItemRegistered" | "executableWillLaunchAtLogin" |
  "startupRegistrationSupported" | "startupRegistrationScope">;

// Main-process evidence only; raw launch items and executable paths never enter
// the shared lifecycle status contract.
export interface WindowsLoginItemVerification {
  confirmed: boolean;
  registered: boolean;
  enabled: boolean;
  diagnostic: string;
}

interface WindowsLaunchItemEvidence {
  scope: ChampCityStartupRegistrationScope | "unknown";
  enabled: boolean | null;
  pathMatches: boolean;
  argsMatch: boolean;
  argsEmpty: boolean;
}

export function evaluateWindowsLoginItemSettings(
  actual: Electron.LoginItemSettings,
  target: AgentHarnessServiceHostLaunchTarget,
  requestedEnabled: boolean,
  runObservation: WindowsRunObservation,
  expectedName: string = agentHarnessServiceHostLoginItemName,
): WindowsLoginItemVerification {
  const observationAvailable = Array.isArray(actual.launchItems);
  const namedItems = observationAvailable
    ? actual.launchItems.filter((item) => item.name === expectedName)
    : [];
  const evidence = namedItems.map((item) => projectWindowsLaunchItemEvidence(item, target));
  const exact = (item: typeof evidence[number]) =>
    item.scope === "user" && item.pathMatches && (item.argsMatch || item.argsEmpty);
  const commandMatches = runObservation.state === "present" &&
    windowsRunCommandMatchesTarget(runObservation.command, target);
  const registered = commandMatches && evidence.some(exact);
  const enabled = evidence.some((item) => exact(item) && item.enabled === true);
  // Missing launchItems is not proof of absence. Conflicting named entries fail
  // closed; another entry for this executable is never a valid ChampCity startup registration.
  const confirmed = observationAvailable && (requestedEnabled
    ? evidence.length === 1 && registered && enabled
    : runObservation.state === "absent" && evidence.length <= 1 &&
      evidence.every((item) => exact(item) && item.enabled === false));
  return {
    confirmed,
    registered,
    enabled,
    diagnostic: JSON.stringify({
      requestedEnabled,
      observationAvailable,
      namedItemFound: evidence.length > 0,
      namedItemCount: evidence.length,
      runState: runObservation.state,
      runFailureReason: runObservation.state === "unverifiable" ? runObservation.reason : null,
      commandMatches,
      // Limit diagnostics without truncating the evidence used for the decision.
      items: evidence.slice(0, 4),
      openAtLogin: actual.openAtLogin,
      executableWillLaunchAtLogin: actual.executableWillLaunchAtLogin,
    }),
  };
}

export function evaluateWindowsMachineLoginItemSettings(
  actual: Electron.LoginItemSettings,
  target: AgentHarnessServiceHostLaunchTarget,
  expectedName: string = agentHarnessServiceHostLoginItemName,
): WindowsLoginItemVerification {
  const observationAvailable = Array.isArray(actual.launchItems);
  const namedItems = observationAvailable
    ? actual.launchItems.filter((item) => item.name === expectedName)
    : [];
  const evidence = namedItems.map((item) => projectWindowsLaunchItemEvidence(item, target));
  const exact = (item: WindowsLaunchItemEvidence) =>
    item.scope === "machine" && item.pathMatches && item.argsMatch;
  const registered = observationAvailable && evidence.length === 1 && evidence.every(exact);
  const enabled = registered && evidence[0]?.enabled === true;
  return {
    confirmed: registered && enabled,
    registered,
    enabled,
    diagnostic: JSON.stringify({
      expectedScope: "machine",
      observationAvailable,
      namedItemFound: evidence.length > 0,
      namedItemCount: evidence.length,
      items: evidence.slice(0, 4),
      openAtLogin: actual.openAtLogin,
      executableWillLaunchAtLogin: actual.executableWillLaunchAtLogin,
    }),
  };
}

// This is a bounded executable-token and literal-argument comparison, not a
// shell parser. In particular, an unquoted path containing spaces cannot match.
export function windowsRunCommandMatchesTarget(
  command: string,
  target: AgentHarnessServiceHostLaunchTarget,
): boolean {
  if (command.length > 32_767 || /[\x00-\x1f\x7f%]/.test(command)) return false;
  const match = /^ *(?:"([^"\r\n]+)"|([^\s"]+)) +([^"\r\n]+?) *$/.exec(command);
  if (!match) return false;
  const executable = match[1] ?? match[2];
  const args = match[3].split(/ +/);
  return win32.isAbsolute(executable) && win32.isAbsolute(target.path) &&
    win32.normalize(executable).toLowerCase() === win32.normalize(target.path).toLowerCase() &&
    args.length === target.args.length && args.every((argument, index) => argument === target.args[index]);
}

export function computeAgentHarnessServiceHostLoginLaunchTarget(
  input: AgentHarnessServiceHostLaunchTargetInput,
): AgentHarnessServiceHostLaunchTarget {
  const args = input.isPackaged
    ? [agentHarnessServiceHostModeArgument, agentHarnessServiceHostStartupOriginArgument]
    : [input.applicationPath, agentHarnessServiceHostModeArgument, agentHarnessServiceHostStartupOriginArgument];
  return {
    path: input.executablePath,
    args,
  };
}

export function computeAgentHarnessServiceHostDesktopLaunchTarget(
  input: AgentHarnessServiceHostLaunchTargetInput,
): AgentHarnessServiceHostLaunchTarget {
  return {
    path: input.executablePath,
    args: input.isPackaged
      ? [agentHarnessServiceHostModeArgument]
      : [input.applicationPath, agentHarnessServiceHostModeArgument],
  };
}

export function computeChampCityDesktopLaunchTarget(
  input: AgentHarnessServiceHostLaunchTargetInput,
): AgentHarnessServiceHostLaunchTarget {
  return {
    path: input.executablePath,
    args: input.isPackaged ? [] : [input.applicationPath],
  };
}

export function serviceHostLaunchTargetFromApp(application: App): AgentHarnessServiceHostLaunchTargetInput {
  return {
    isPackaged: application.isPackaged,
    executablePath: process.execPath,
    applicationPath: application.getAppPath(),
  };
}

export function applyAgentHarnessServiceHostStartupRegistration(
  application: LoginItemApplicationAdapter,
  launchTargetInput: AgentHarnessServiceHostLaunchTargetInput,
  settings: AgentHarnessServiceHostLifecycleSettings,
  platform: NodeJS.Platform = process.platform,
  installedScope: ChampCityInstalledScopeMetadata = { ...defaultChampCityInstalledScopeMetadata },
): StartupRegistrationStatus & { windowsVerification: WindowsLoginItemVerification | null } {
  const supported = platform === "win32";
  if (!supported) {
    return {
      launchAtLogin: settings.launchAtLogin,
      loginItemRegistered: false,
      executableWillLaunchAtLogin: false,
      startupRegistrationSupported: false,
      startupRegistrationScope: null,
      windowsVerification: null,
    };
  }
  const target = computeAgentHarnessServiceHostLoginLaunchTarget(launchTargetInput);
  const registrationScope = startupRegistrationScopeForInstallScope(installedScope.installScope);
  if (registrationScope === "user") {
    if (!application.setLoginItemSettings) {
      throw new Error("Current-user Windows startup registration is unavailable.");
    }
    application.setLoginItemSettings({
      openAtLogin: settings.launchAtLogin,
      enabled: settings.launchAtLogin,
      name: agentHarnessServiceHostLoginItemName,
      path: target.path,
      args: target.args,
    });
  }
  const actual = application.getLoginItemSettings({ path: target.path, args: target.args });
  const windowsVerification = registrationScope === "machine"
    ? evaluateWindowsMachineLoginItemSettings(actual, target)
    : evaluateWindowsLoginItemSettings(
        actual,
        target,
        settings.launchAtLogin,
        observeCurrentUserWindowsRunValue(agentHarnessServiceHostLoginItemName),
      );
  return {
    ...projectStartupRegistration(settings, registrationScope, windowsVerification),
    windowsVerification,
  };
}

export function readAgentHarnessServiceHostStartupRegistration(
  application: LoginItemApplicationAdapter,
  launchTargetInput: AgentHarnessServiceHostLaunchTargetInput,
  settings: AgentHarnessServiceHostLifecycleSettings,
  platform: NodeJS.Platform = process.platform,
  installedScope: ChampCityInstalledScopeMetadata = { ...defaultChampCityInstalledScopeMetadata },
): StartupRegistrationStatus {
  if (platform !== "win32") {
    return {
      launchAtLogin: settings.launchAtLogin,
      loginItemRegistered: false,
      executableWillLaunchAtLogin: false,
      startupRegistrationSupported: false,
      startupRegistrationScope: null,
    };
  }
  const target = computeAgentHarnessServiceHostLoginLaunchTarget(launchTargetInput);
  const actual = application.getLoginItemSettings({ path: target.path, args: target.args });
  const registrationScope = startupRegistrationScopeForInstallScope(installedScope.installScope);
  const verification = registrationScope === "machine"
    ? evaluateWindowsMachineLoginItemSettings(actual, target)
    : evaluateWindowsLoginItemSettings(
        actual,
        target,
        settings.launchAtLogin,
        observeCurrentUserWindowsRunValue(agentHarnessServiceHostLoginItemName),
      );
  return projectStartupRegistration(settings, registrationScope, verification);
}

function projectStartupRegistration(
  settings: AgentHarnessServiceHostLifecycleSettings,
  registrationScope: ChampCityStartupRegistrationScope,
  verification: WindowsLoginItemVerification,
): StartupRegistrationStatus {
  return {
    launchAtLogin: settings.launchAtLogin,
    loginItemRegistered: verification.registered,
    executableWillLaunchAtLogin: verification.enabled,
    startupRegistrationSupported: true,
    startupRegistrationScope: registrationScope,
  };
}

function projectWindowsLaunchItemEvidence(
  item: Electron.LoginItemSettings["launchItems"] extends Array<infer T> | undefined ? T : never,
  target: AgentHarnessServiceHostLaunchTarget,
): WindowsLaunchItemEvidence {
  return {
    scope: item.scope === "user" || item.scope === "machine" ? item.scope : "unknown",
    enabled: typeof item.enabled === "boolean" ? item.enabled : null,
    pathMatches: typeof item.path === "string" && win32.isAbsolute(item.path) &&
      win32.isAbsolute(target.path) &&
      win32.normalize(item.path).toLowerCase() === win32.normalize(target.path).toLowerCase(),
    argsMatch: Array.isArray(item.args) && item.args.length === target.args.length &&
      item.args.every((argument, index) => argument === target.args[index]),
    argsEmpty: Array.isArray(item.args) && item.args.length === 0,
  };
}
