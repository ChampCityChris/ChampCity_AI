import fs from "node:fs";
import path from "node:path";
import type {
  AgentHarnessAuthenticationMode,
  AgentHarnessSettings,
  AgentHarnessSettingsInput,
} from "../../../shared/workspaceContracts";
import { normalizeAgentHarnessBindHost } from "./bindingPolicy";

const settingsDirectoryName = "agent-harness";
const settingsFileName = "settings.json";

export const defaultAgentHarnessSettings: AgentHarnessSettings = {
  enabled: true,
  host: "127.0.0.1",
  port: 0,
  publicBaseUrl: null,
  localAuthenticationMode: "oauth-required",
};

interface StoredAgentHarnessSettings {
  schemaVersion: 1;
  settings: AgentHarnessSettings;
}

export function getAgentHarnessSettingsDirectory(userDataRoot: string): string {
  return path.join(userDataRoot, settingsDirectoryName);
}

export function getAgentHarnessSettingsPath(userDataRoot: string): string {
  return path.join(getAgentHarnessSettingsDirectory(userDataRoot), settingsFileName);
}

export function readAgentHarnessSettings(
  userDataRoot: string,
  overrides: AgentHarnessSettingsInput = {},
): AgentHarnessSettings {
  const stored = readStoredSettings(userDataRoot);
  return normalizeAgentHarnessSettings({
    ...defaultAgentHarnessSettings,
    ...stored,
    ...overrides,
  });
}

export function validateAgentHarnessSettingsInput(
  input: AgentHarnessSettingsInput,
  current: AgentHarnessSettings = defaultAgentHarnessSettings,
): AgentHarnessSettings {
  return normalizeAgentHarnessSettings({
    ...current,
    ...input,
  });
}

export function writeAgentHarnessSettings(
  userDataRoot: string,
  settings: AgentHarnessSettings,
): void {
  const normalized = normalizeAgentHarnessSettings(settings);
  const directory = getAgentHarnessSettingsDirectory(userDataRoot);
  fs.mkdirSync(directory, { recursive: true });
  const targetPath = getAgentHarnessSettingsPath(userDataRoot);
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(
    tempPath,
    JSON.stringify({
      schemaVersion: 1,
      settings: normalized,
    } satisfies StoredAgentHarnessSettings, null, 2),
    "utf8",
  );
  fs.renameSync(tempPath, targetPath);
}

function readStoredSettings(userDataRoot: string): Partial<AgentHarnessSettings> {
  const settingsPath = getAgentHarnessSettingsPath(userDataRoot);
  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Partial<StoredAgentHarnessSettings>;
    if (parsed.schemaVersion !== 1 || !parsed.settings || typeof parsed.settings !== "object") {
      return {};
    }
    return parsed.settings;
  } catch {
    return {};
  }
}

function normalizeAgentHarnessSettings(input: AgentHarnessSettingsInput): AgentHarnessSettings {
  const enabled = parseBoolean(input.enabled, "Agent Harness enabled setting");
  const host = normalizeHost(input.host);
  const port = normalizePort(input.port);
  const publicBaseUrl = normalizePublicBaseUrl(input.publicBaseUrl);
  const localAuthenticationMode = normalizeAuthenticationMode(input.localAuthenticationMode);

  if (publicBaseUrl && localAuthenticationMode === "local-unauthenticated") {
    throw new Error("Public Agent Harness connectors require OAuth; local unauthenticated mode is only allowed without a public base URL.");
  }

  return {
    enabled,
    host,
    port,
    publicBaseUrl,
    localAuthenticationMode,
  };
}

function parseBoolean(value: unknown, label: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${label} must be true or false.`);
}

function normalizeHost(value: unknown): string {
  return normalizeAgentHarnessBindHost(value);
}

function normalizePort(value: unknown): number {
  const port = typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : value;
  if (!Number.isInteger(port) || typeof port !== "number" || port < 0 || port > 65_535) {
    throw new Error("Agent Harness port must be an integer from 0 to 65535.");
  }
  return port;
}

function normalizePublicBaseUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("Agent Harness public base URL must be a string.");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Agent Harness public base URL must be a valid HTTPS URL.");
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Agent Harness public base URL must be an HTTPS URL without credentials, query, or fragment.");
  }

  return parsed.toString().replace(/\/$/, "");
}

function normalizeAuthenticationMode(value: unknown): AgentHarnessAuthenticationMode {
  if (value === "oauth-required" || value === "local-unauthenticated") {
    return value;
  }
  throw new Error("Agent Harness authentication mode must be oauth-required or local-unauthenticated.");
}
