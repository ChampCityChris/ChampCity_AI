export type AgentHarnessErrorCode =
  | "CONTROLLED_DRAFT_DENIED"
  | "FILE_DENIED"
  | "GIT_CAPABILITY_UNAVAILABLE"
  | "GIT_EXECUTION_FAILED"
  | "GIT_OUTPUT_LIMIT"
  | "GIT_TIMEOUT"
  | "INVALID_INPUT"
  | "MCP_PROTOCOL_ERROR"
  | "OAUTH_SCOPE_DENIED"
  | "PATCH_DENIED"
  | "PATH_DENIED"
  | "REPOSITORY_TRAVERSAL_INCOMPLETE"
  | "RELEASE_ALREADY_EXISTS"
  | "RELEASE_ARTIFACT_INVALID"
  | "RELEASE_ARTIFACT_MISSING"
  | "RELEASE_CANDIDATE_CLEANUP_FAILED"
  | "RELEASE_CANDIDATE_SNAPSHOT_FAILED"
  | "RELEASE_COMMAND_FAILED"
  | "RELEASE_INVARIANT_FAILED"
  | "RELEASE_PREREQUISITE_UNAVAILABLE"
  | "RELEASE_PROVIDER_FAILED"
  | "RELEASE_TIMEOUT"
  | "RELEASE_VERIFICATION_FAILED"
  | "RUNTIME_ERROR"
  | "STALE_SOURCE"
  | "WORKSPACE_ACCESS_DENIED"
  | "WORKSPACE_UNAVAILABLE"
  | "WORKSPACE_REGISTRY_CONFLICT"
  | "WORKSPACE_REGISTRY_INVALID";

export class AgentHarnessError extends Error {
  readonly code: AgentHarnessErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: AgentHarnessErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AgentHarnessError";
    this.code = code;
    this.details = details;
  }
}

export function toBoundedError(error: unknown): {
  code: AgentHarnessErrorCode;
  message: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof AgentHarnessError) {
    return {
      code: error.code,
      message: boundedErrorText(error.message),
      ...(error.details ? { details: redactSecretValues(error.details) } : {}),
    };
  }
  return {
    code: "RUNTIME_ERROR",
    message: boundedErrorText(error instanceof Error ? error.message : String(error)),
  };
}

export function redactSecretValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSecretValues(entry)) as T;
  }
  if (typeof value === "string") {
    return boundedErrorText(value) as T;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (/token|secret|password|verifier|cookie|authorization/i.test(key)) {
      output[key] = "[redacted]";
    } else {
      output[key] = redactSecretValues(entry);
    }
  }
  return output as T;
}

function boundedErrorText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, 1_000);
}
