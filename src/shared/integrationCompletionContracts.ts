export type IntegrationCompletionKind = "plan" | "research" | "workflow";

export interface IntegrationCompletionEvidence {
  kind: IntegrationCompletionKind;
  routeDecisionId?: string;
  completionId: string;
  revision: number;
  fingerprint: string;
  sourcePath?: string;
  workflowId?: string;
}
