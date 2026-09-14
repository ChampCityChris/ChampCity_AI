import type { CodexImplementerExecutionModel } from "../../shared/workspaceContracts";

export interface IssueCodexExecutionPresentation {
  contextKey: string;
  status: CodexImplementerExecutionModel | null;
}

export interface CodexExecutionPresentationState {
  development: CodexImplementerExecutionModel | null;
  issue: IssueCodexExecutionPresentation | null;
}

export type CodexExecutionPresentationAction =
  | { type: "clear-development" }
  | { type: "set-development"; status: CodexImplementerExecutionModel }
  | { type: "activate-issue-context"; contextKey: string }
  | { type: "clear-issue" }
  | { type: "set-issue"; contextKey: string; status: CodexImplementerExecutionModel };

export const initialCodexExecutionPresentationState: CodexExecutionPresentationState = {
  development: null,
  issue: null,
};

export function issueCodexExecutionContextKey(issueId: string, fixCardId: string): string {
  return `${issueId}\u0000${fixCardId}`;
}

export function codexExecutionPresentationReducer(
  state: CodexExecutionPresentationState,
  action: CodexExecutionPresentationAction,
): CodexExecutionPresentationState {
  switch (action.type) {
    case "clear-development":
      return state.development === null ? state : { ...state, development: null };
    case "set-development":
      return { ...state, development: action.status };
    case "activate-issue-context":
      return state.issue?.contextKey === action.contextKey
        ? state
        : { ...state, issue: { contextKey: action.contextKey, status: null } };
    case "clear-issue":
      return state.issue === null ? state : { ...state, issue: null };
    case "set-issue":
      return state.issue?.contextKey === action.contextKey
        ? { ...state, issue: { contextKey: action.contextKey, status: action.status } }
        : state;
  }
}
