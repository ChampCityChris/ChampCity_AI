import path from "node:path";
import type { CodexRuntimeInitializationResult } from "./codexRuntimeInitialization";

export const codexRuntimeInitializerProtocolVersion = 1;

export interface CodexRuntimeInitializeRequest {
  protocolVersion: typeof codexRuntimeInitializerProtocolVersion;
  kind: "initialize";
  userDataRoot: string;
}

export interface CodexRuntimeShutdownRequest {
  protocolVersion: typeof codexRuntimeInitializerProtocolVersion;
  kind: "shutdown";
}

export type CodexRuntimeInitializerRequest =
  | CodexRuntimeInitializeRequest
  | CodexRuntimeShutdownRequest;

export interface CodexRuntimeInitializationSuccess {
  protocolVersion: typeof codexRuntimeInitializerProtocolVersion;
  kind: "success";
  workerProcessId: number;
  result: CodexRuntimeInitializationResult;
}

export interface CodexRuntimeInitializationFailure {
  protocolVersion: typeof codexRuntimeInitializerProtocolVersion;
  kind: "failure";
  workerProcessId: number;
  error: {
    code: "CODEX_RUNTIME_INITIALIZER_FAILED";
    message: string;
  };
}

export type CodexRuntimeInitializerResponse =
  | CodexRuntimeInitializationSuccess
  | CodexRuntimeInitializationFailure;

export function isCodexRuntimeInitializerRequest(
  value: unknown,
): value is CodexRuntimeInitializerRequest {
  if (!isRecord(value) || value.protocolVersion !== codexRuntimeInitializerProtocolVersion) {
    return false;
  }
  if (value.kind === "shutdown") {
    return Object.keys(value).every((key) => ["protocolVersion", "kind"].includes(key));
  }
  return value.kind === "initialize" && isBoundedAbsolutePath(value.userDataRoot);
}

export function isCodexRuntimeInitializerResponse(
  value: unknown,
): value is CodexRuntimeInitializerResponse {
  if (!isRecord(value) || value.protocolVersion !== codexRuntimeInitializerProtocolVersion ||
    !isDistinctWorkerProcessId(value.workerProcessId)) {
    return false;
  }
  if (value.kind === "failure") {
    return isRecord(value.error) && value.error.code === "CODEX_RUNTIME_INITIALIZER_FAILED" &&
      isBoundedText(value.error.message, 500);
  }
  return value.kind === "success" && isInitializationResult(value.result);
}

function isInitializationResult(value: unknown): value is CodexRuntimeInitializationResult {
  if (!isRecord(value) || !(value.runtime === null || isManagedRuntime(value.runtime)) ||
    !isRecord(value.status)) {
    return false;
  }
  const status = value.status;
  const updateStates = ["initializing", "checking", "current", "updated", "degraded", "unavailable"];
  if (!(status.version === null || isSemanticVersion(status.version)) ||
    !updateStates.includes(String(status.updateState)) ||
    !Array.isArray(status.catalog) || status.catalog.length > 128 ||
    !status.catalog.every(isCatalogEntry) ||
    !(status.selection === null || isSelection(status.selection)) ||
    !(status.selectionBlocker === null || isBoundedText(status.selectionBlocker, 1_000)) ||
    !isBoundedText(status.message, 1_000) || typeof status.busy !== "boolean") {
    return false;
  }
  if (value.runtime) {
    return status.version === value.runtime.version &&
      ["current", "updated", "degraded"].includes(String(status.updateState));
  }
  return status.version === null && status.updateState === "unavailable";
}

function isManagedRuntime(value: unknown): boolean {
  return isRecord(value) && isSemanticVersion(value.version) &&
    isBoundedAbsolutePath(value.executable) && isBoundedAbsolutePath(value.directory);
}

function isCatalogEntry(value: unknown): boolean {
  return isRecord(value) &&
    isBoundedText(value.id, 500) &&
    isBoundedText(value.model, 500) &&
    isBoundedText(value.displayName, 500, true) &&
    isBoundedText(value.description, 4_000, true) &&
    Array.isArray(value.supportedReasoningEfforts) &&
    value.supportedReasoningEfforts.length <= 32 &&
    value.supportedReasoningEfforts.every((effort) => isBoundedText(effort, 100)) &&
    isBoundedText(value.defaultReasoningEffort, 100) &&
    typeof value.isDefault === "boolean";
}

function isSelection(value: unknown): boolean {
  return isRecord(value) && isBoundedText(value.model, 500) &&
    isBoundedText(value.reasoningEffort, 100);
}

function isDistinctWorkerProcessId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0 && value !== process.pid;
}

function isSemanticVersion(value: unknown): value is string {
  return typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value);
}

function isBoundedAbsolutePath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 32_767 && path.isAbsolute(value);
}

function isBoundedText(value: unknown, limit: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= limit && (allowEmpty || value.length > 0);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
