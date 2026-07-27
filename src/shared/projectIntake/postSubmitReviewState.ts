import type { FirstNonApprovedResult } from "../documents/documentOrder";
import type { PlanningDocumentSummary } from "../documents/planningDocument";
import type {
  ProjectIntakeSubmissionResult,
  WorkspaceId,
} from "../workspaceContracts";

export interface ProjectIntakePostSubmitConfirmation {
  projectIntakeMarkdownPath: string;
  architectPromptMarkdownPath: string;
}

export interface ProjectIntakePostSubmitReviewState {
  confirmation: ProjectIntakePostSubmitConfirmation | null;
  viewedWorkspaceId: WorkspaceId;
  selectedDocumentId: string | null;
  resolverResult: FirstNonApprovedResult | null;
}

export function createProjectIntakeConfirmation(
  result: ProjectIntakeSubmissionResult,
): ProjectIntakePostSubmitConfirmation {
  return {
    projectIntakeMarkdownPath: result.projectIntakeMarkdownPath,
    architectPromptMarkdownPath: result.architectPromptMarkdownPath,
  };
}

export function findCreatedProjectIntakeDocumentId(
  documents: PlanningDocumentSummary[],
  result: ProjectIntakeSubmissionResult,
): string | null {
  const created = documents.find(
    (document) => document.markdownPath === result.projectIntakeMarkdownPath,
  );

  return created?.logicalDocumentId ?? null;
}

export function applySuccessfulProjectIntakeSubmission(
  state: ProjectIntakePostSubmitReviewState,
  result: ProjectIntakeSubmissionResult,
  documents: PlanningDocumentSummary[],
  resolverResult: FirstNonApprovedResult,
): ProjectIntakePostSubmitReviewState {
  return {
    ...state,
    confirmation: createProjectIntakeConfirmation(result),
    viewedWorkspaceId: "project-intake-capture",
    selectedDocumentId: findCreatedProjectIntakeDocumentId(documents, result),
    resolverResult,
  };
}

export function clearProjectIntakePostSubmitReviewState(
  state: ProjectIntakePostSubmitReviewState,
): ProjectIntakePostSubmitReviewState {
  return {
    ...state,
    confirmation: null,
  };
}
