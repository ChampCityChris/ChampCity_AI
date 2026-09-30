import type { CodexImplementerExecutionModel } from "../../shared/workspaceContracts";

export interface CodexTerminalFeedback {
  message: string;
  tone: "success" | "warning" | "error";
}

export function codexTerminalFeedback(
  execution: CodexImplementerExecutionModel | null,
): CodexTerminalFeedback | null {
  if (!execution || !["completed", "failed", "cancelled"].includes(execution.state)) {
    return null;
  }
  if (execution.state === "failed") {
    return { message: execution.failureReason ?? "Codex execution failed.", tone: "error" };
  }
  if (execution.state === "cancelled") {
    return { message: execution.failureReason ?? "Codex execution was cancelled.", tone: "warning" };
  }
  if (execution.executionKind === "environment-resolution") {
    const preflight = execution.developmentEnvironmentPreflight;
    if (preflight?.state === "ready" || preflight?.state === "not-required") {
      return {
        message: "Environment Resolution completed. Development environment is ready. Work Card implementation can now start.",
        tone: "success",
      };
    }
    return {
      message: `Environment Resolution completed, but development environment preparation is still incomplete: ${preflight?.summary ?? "Deterministic preflight has not confirmed readiness."}`,
      tone: "warning",
    };
  }
  if (execution.failureReason) {
    return { message: execution.failureReason, tone: "warning" };
  }
  return execution.reportUpdated
    ? { message: "Codex execution finished. Review the existing Implementer Report.", tone: "success" }
    : { message: "Codex completed, but the Implementer Report was not updated.", tone: "warning" };
}
