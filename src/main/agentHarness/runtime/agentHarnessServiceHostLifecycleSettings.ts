import fs from "node:fs";
import path from "node:path";
import type {
  AgentHarnessServiceHostLifecycleSettings,
  AgentHarnessServiceHostLifecycleSettingsInput,
} from "../../../shared/workspaceContracts";
import { getAgentHarnessSettingsDirectory } from "./agentHarnessSettings";

const lifecycleSettingsFileName = "service-host-lifecycle.json";
const lifecycleSettingsSchemaVersion = 1 as const;

interface StoredServiceHostLifecycleSettings {
  schemaVersion: typeof lifecycleSettingsSchemaVersion;
  launchAtLogin: boolean;
}

export const defaultAgentHarnessServiceHostLifecycleSettings: AgentHarnessServiceHostLifecycleSettings = {
  launchAtLogin: true,
};

export function getAgentHarnessServiceHostLifecycleSettingsPath(userDataRoot: string): string {
  return path.join(getAgentHarnessSettingsDirectory(userDataRoot), lifecycleSettingsFileName);
}

export function readAgentHarnessServiceHostLifecycleSettings(
  userDataRoot: string,
): AgentHarnessServiceHostLifecycleSettings {
  const targetPath = getAgentHarnessServiceHostLifecycleSettingsPath(userDataRoot);
  if (!fs.existsSync(targetPath)) {
    return { ...defaultAgentHarnessServiceHostLifecycleSettings };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(targetPath, "utf8")) as Partial<StoredServiceHostLifecycleSettings>;
    if (parsed.schemaVersion !== lifecycleSettingsSchemaVersion || typeof parsed.launchAtLogin !== "boolean") {
      throw new Error("Agent Harness Service Host lifecycle settings have an unsupported or invalid schema.");
    }
    return { launchAtLogin: parsed.launchAtLogin };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Agent Harness Service Host lifecycle settings are unreadable or malformed.");
    }
    throw error;
  }
}

export function initializeAgentHarnessServiceHostLifecycleSettings(
  userDataRoot: string,
  launchAtLoginDefault: boolean,
): AgentHarnessServiceHostLifecycleSettings {
  const targetPath = getAgentHarnessServiceHostLifecycleSettingsPath(userDataRoot);
  const initialSettings = validateAgentHarnessServiceHostLifecycleSettingsInput({
    launchAtLogin: launchAtLoginDefault,
  });
  const directory = getAgentHarnessSettingsDirectory(userDataRoot);
  fs.mkdirSync(directory, { recursive: true });
  let fileDescriptor: number | null = null;
  try {
    fileDescriptor = fs.openSync(targetPath, "wx", 0o600);
    fs.writeFileSync(fileDescriptor, serializeLifecycleSettings(initialSettings), "utf8");
  } catch (error) {
    if (!hasErrorCode(error, "EEXIST")) {
      throw error;
    }
  } finally {
    if (fileDescriptor !== null) {
      fs.closeSync(fileDescriptor);
    }
  }
  return readAgentHarnessServiceHostLifecycleSettings(userDataRoot);
}

export function validateAgentHarnessServiceHostLifecycleSettingsInput(
  input: AgentHarnessServiceHostLifecycleSettingsInput,
): AgentHarnessServiceHostLifecycleSettings {
  if (!input || typeof input !== "object" || typeof input.launchAtLogin !== "boolean") {
    throw new Error("Service Host launch-at-login setting must be true or false.");
  }
  return { launchAtLogin: input.launchAtLogin };
}

export function writeAgentHarnessServiceHostLifecycleSettings(
  userDataRoot: string,
  settings: AgentHarnessServiceHostLifecycleSettings,
): void {
  const normalized = validateAgentHarnessServiceHostLifecycleSettingsInput(settings);
  const directory = getAgentHarnessSettingsDirectory(userDataRoot);
  fs.mkdirSync(directory, { recursive: true });
  const targetPath = getAgentHarnessServiceHostLifecycleSettingsPath(userDataRoot);
  const temporaryPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporaryPath, serializeLifecycleSettings(normalized), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporaryPath, targetPath);
}

function serializeLifecycleSettings(settings: AgentHarnessServiceHostLifecycleSettings): string {
  return `${JSON.stringify({
    schemaVersion: lifecycleSettingsSchemaVersion,
    launchAtLogin: settings.launchAtLogin,
  } satisfies StoredServiceHostLifecycleSettings, null, 2)}\n`;
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === expectedCode);
}
