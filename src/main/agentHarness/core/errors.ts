export type AgentHarnessErrorCode =
  | "AUTHORITY_DENIED"
  | "FILE_DENIED"
  | "GIT_MUTATION_DENIED"
  | "INVALID_INPUT"
  | "MCP_PROTOCOL_ERROR"
  | "OAUTH_SCOPE_DENIED"
  | "PATCH_DENIED"
  | "PATH_DENIED"
  | "RUNTIME_ERROR"
  | "WORKSPACE_UNAVAILABLE";

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
      message: error.message,
      ...(error.details ? { details: redactSecretValues(error.details) } : {}),
    };
  }
  return {
    code: "RUNTIME_ERROR",
    message: error instanceof Error ? error.message : String(error),
  };
}

export function redactSecretValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSecretValues(entry)) as T;
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
