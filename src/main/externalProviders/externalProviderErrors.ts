import {
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ExternalProviderFailureKind } from "../../shared/externalProviderContracts";

const diagnosticLimit = 500;

export class ExternalProviderError extends Error {
  constructor(
    readonly kind: ExternalProviderFailureKind,
    readonly providerId: string,
    message: string,
    readonly capabilityId?: string,
    readonly toolName?: string,
  ) {
    super(boundedProviderDiagnostic(message));
    this.name = "ExternalProviderError";
  }
}

export function classifyExternalProviderError(
  providerId: string,
  error: unknown,
  phase: "connect" | "discovery" | "invocation" | "close",
  capabilityId?: string,
  toolName?: string,
): ExternalProviderError {
  if (error instanceof ExternalProviderError) {
    return error;
  }
  if (
    error instanceof UnauthorizedError ||
    (error instanceof StreamableHTTPError && (error.code === 401 || error.code === 403)) ||
    /\b(?:401|403)\b|unauthori[sz]ed|authentication required|insufficient scope/i.test(errorMessage(error))
  ) {
    return new ExternalProviderError(
      "authentication-required",
      providerId,
      "The external provider requires authentication or additional provider scope.",
      capabilityId,
      toolName,
    );
  }
  if (error instanceof McpError && error.code === ErrorCode.RequestTimeout) {
    return new ExternalProviderError(
      "timeout",
      providerId,
      "The external provider exceeded its application-owned timeout.",
      capabilityId,
      toolName,
    );
  }
  if (isAbortError(error)) {
    return new ExternalProviderError(
      "cancelled",
      providerId,
      "The external provider operation was cancelled.",
      capabilityId,
      toolName,
    );
  }
  return new ExternalProviderError(
    phase === "invocation" ? "provider-error" : "transport-failure",
    providerId,
    errorMessage(error),
    capabilityId,
    toolName,
  );
}

export function boundedProviderDiagnostic(value: unknown): string {
  const message = errorMessage(value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(authorization|proxy-authorization|cookie|set-cookie|x-api-key)\s*[:=]\s*[^\s,;]+/gi, "$1: [REDACTED]")
    .replace(/(["']?(?:password|secret|token|access_token|refresh_token|api[-_]?key|private[-_]?key)["']?\s*[:=]\s*)["']?[^\s,;&"']+["']?/gi, "$1[REDACTED]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (message || "External provider operation failed.").slice(0, diagnosticLimit);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || /aborted|cancelled/i.test(error.message));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
