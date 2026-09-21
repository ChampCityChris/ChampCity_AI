import type { IntegrationCandidateRecord } from "./integrationCandidateContracts";

export interface RoutedIntegrationProjection {
  status: "not-ready" | "ready" | "candidate-validating" | "repair-required" | "operator-decision-required" | "integration-complete" | "failed";
  reasons: string[];
  planFingerprint?: string;
  candidate?: IntegrationCandidateRecord;
  checkpointCommits: string[];
}
export interface RoutedIntegrationRequest {
  expectedFingerprint: string;
  candidateId?: string;
}
