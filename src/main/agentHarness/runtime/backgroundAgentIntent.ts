import fs from "node:fs";
import path from "node:path";
import { getAgentHarnessSettingsDirectory } from "./agentHarnessSettings";

const backgroundAgentIntentSchemaVersion = 1 as const;
const backgroundAgentIntentFileName = "background-agent-intent.json";

interface StoredBackgroundAgentIntent {
  schemaVersion: typeof backgroundAgentIntentSchemaVersion;
  explicitStopRequested: true;
  requestedAt: string;
}

export type BackgroundAgentIntentState =
  | { state: "clear" }
  | { state: "explicit-stop"; requestedAt: string }
  | { state: "invalid"; error: string };

export function getBackgroundAgentIntentPath(userDataRoot: string): string {
  return path.join(getAgentHarnessSettingsDirectory(userDataRoot), backgroundAgentIntentFileName);
}

export function readBackgroundAgentIntent(userDataRoot: string): BackgroundAgentIntentState {
  const targetPath = getBackgroundAgentIntentPath(userDataRoot);
  if (!fs.existsSync(targetPath)) {
    return { state: "clear" };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(targetPath, "utf8")) as Partial<StoredBackgroundAgentIntent>;
    if (parsed.schemaVersion !== backgroundAgentIntentSchemaVersion ||
      parsed.explicitStopRequested !== true ||
      typeof parsed.requestedAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.requestedAt))) {
      throw new Error("Background Agent stop intent has an unsupported or invalid schema.");
    }
    return { state: "explicit-stop", requestedAt: parsed.requestedAt };
  } catch (error) {
    return {
      state: "invalid",
      error: boundedIntentError(error),
    };
  }
}

export function writeBackgroundAgentExplicitStopIntent(
  userDataRoot: string,
  requestedAt = new Date().toISOString(),
): void {
  if (!Number.isFinite(Date.parse(requestedAt))) {
    throw new Error("Background Agent stop intent requires a valid request timestamp.");
  }
  const directory = getAgentHarnessSettingsDirectory(userDataRoot);
  fs.mkdirSync(directory, { recursive: true });
  const targetPath = getBackgroundAgentIntentPath(userDataRoot);
  const temporaryPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(
      temporaryPath,
      `${JSON.stringify({
        schemaVersion: backgroundAgentIntentSchemaVersion,
        explicitStopRequested: true,
        requestedAt,
      } satisfies StoredBackgroundAgentIntent, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    fs.renameSync(temporaryPath, targetPath);
  } catch (error) {
    removeTemporaryFile(temporaryPath);
    throw error;
  }
}

export function clearBackgroundAgentExplicitStopIntent(userDataRoot: string): void {
  const targetPath = getBackgroundAgentIntentPath(userDataRoot);
  if (!fs.existsSync(targetPath)) {
    return;
  }
  const clearedPath = `${targetPath}.cleared-${process.pid}-${Date.now()}`;
  fs.renameSync(targetPath, clearedPath);
  removeTemporaryFile(clearedPath);
}

export function prepareBackgroundAgentStartupIntent(
  userDataRoot: string,
  input: { startupOrigin: boolean; launchAtLogin: boolean },
): boolean {
  if (!input.startupOrigin) {
    return true;
  }
  if (!input.launchAtLogin) {
    return false;
  }
  clearBackgroundAgentExplicitStopIntent(userDataRoot);
  return true;
}

function removeTemporaryFile(targetPath: string): void {
  try {
    fs.unlinkSync(targetPath);
  } catch (error) {
    if (!isMissingFileError(error)) {
      // Once the canonical file has been atomically replaced/cleared, a private
      // cleanup artifact is non-controlling and must not reverse that result.
    }
  }
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function boundedIntentError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Background Agent stop intent is unreadable.";
}
