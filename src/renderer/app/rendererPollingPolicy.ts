export interface AgentHarnessSettingsPollingRuntime {
  refresh: () => void | Promise<void>;
  setInterval: (callback: () => void, milliseconds: number) => number;
  clearInterval: (handle: number) => void;
  cadenceMs?: number;
}

export interface DevelopmentCodexPollingState {
  isDevelopmentForeground: boolean;
  workspaceAvailable: boolean;
  activeWorkspaceId: string;
}

export interface IssueCodexPollingState {
  isIssueCodexExecutionForeground: boolean;
  workspaceAvailable: boolean;
  hasCurrentIssue: boolean;
  hasSelectedFixCard: boolean;
  hasExecutionContext: boolean;
}

export function startAgentHarnessSettingsPolling(
  runtime: AgentHarnessSettingsPollingRuntime,
): () => void {
  let active = true;
  const refresh = (): void => {
    if (active) {
      void runtime.refresh();
    }
  };
  refresh();
  const interval = runtime.setInterval(refresh, runtime.cadenceMs ?? 5_000);
  return () => {
    active = false;
    runtime.clearInterval(interval);
  };
}

export function shouldPollDevelopmentCodexExecution(
  state: DevelopmentCodexPollingState,
): boolean {
  return state.isDevelopmentForeground &&
    state.workspaceAvailable &&
    state.activeWorkspaceId === "work-card-building-review";
}

export function shouldPollIssueCodexExecution(
  state: IssueCodexPollingState,
): boolean {
  return state.isIssueCodexExecutionForeground &&
    state.workspaceAvailable &&
    state.hasCurrentIssue &&
    state.hasSelectedFixCard &&
    state.hasExecutionContext;
}
