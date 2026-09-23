import type { RoutedDevelopmentExecutionProjection, RoutedAcceptanceInput, RoutedAcceptanceRequest } from "./routedDevelopmentExecutionContracts";
import type { RoutedIntegrationProjection } from "./routedIntegrationContracts";
import type { IntegrationRepairAttempt } from "./integrationRepairContracts";
import type { CodexImplementerExecutionModel, CodexApprovalResponse, CodexUserInputResponse, CodexMcpElicitationResponse } from "./workspaceContracts";
import type { CodexModelSelection } from "./codexRuntimeContracts";
import type { DocumentDispositionStatus } from "./documents/documentDisposition";

export type RoutedWorkflowAction = "status" | "activate" | "begin" | "prepare" | "copy" | "check-draft" | "review-contract" | "implement" | "resolve-environment" | "cancel"
  | "respond-approval" | "respond-input" | "respond-elicitation" | "review-report" | "advisory-review" | "validate" | "create-repair" | "close"
  | "save-acceptance" | "review-acceptance" | "integrate" | "prepare-integration-repair" | "run-integration-repair"
  | "cancel-integration-repair" | "respond-integration-repair-approval" | "respond-integration-repair-input" | "respond-integration-repair-elicitation"
  | "integration-decision" | "retry-integration-validation" | "abort-integration";
export interface RoutedWorkflowInput {
  expectedFingerprint?: string;
  workItemId?: string;
  expectedRevision?: number;
  disposition?: DocumentDispositionStatus;
  notes?: string;
  repairDefectText?: string;
  selection?: CodexModelSelection;
  validation?: "ValidatePassed" | "RequestRepair";
  acceptance?: RoutedAcceptanceInput;
  acceptanceReview?: RoutedAcceptanceRequest & { expectedRevision: number; disposition: "Approved" | "RevisionRequested" | "Rejected"; notes?: string };
  candidateId?: string;
  repairId?: string;
  approval?: CodexApprovalResponse;
  userInput?: CodexUserInputResponse;
  elicitation?: CodexMcpElicitationResponse;
}
export interface RoutedWorkflowDocument { path: string; body: string; revision: number; disposition: DocumentDispositionStatus }
export interface RoutedWorkflowModel {
  intakeId: string;
  route: string;
  workBranch: string;
  targetBranch: string;
  planPath?: string;
  actions: RoutedWorkflowAction[];
  reasons: string[];
  execution?: RoutedDevelopmentExecutionProjection;
  integration?: RoutedIntegrationProjection;
  repair?: IntegrationRepairAttempt;
  integrationRepairImplementer?: CodexImplementerExecutionModel;
  current?: { workItemId: string; implementationId: string; phaseId?: string; repairId?: string; contractTargetPath?: string; contract?: RoutedWorkflowDocument; report?: RoutedWorkflowDocument; reportTargetPath?: string };
  implementer?: CodexImplementerExecutionModel;
  feedback?: string;
}
