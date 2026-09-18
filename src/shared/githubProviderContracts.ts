import type { ExternalProviderCapabilityStatus } from "./externalProviderContracts";

export interface GithubProviderStatus {
  providerId: "github";
  displayName: "GitHub";
  runtime: "disconnected" | "acquiring" | "connecting" | "ready" | "unavailable";
  authentication: "authentication-required" | "pending" | "authenticated";
  version: string | null;
  enabledToolsets: string[];
  capabilityGeneration: number;
  capabilities: ExternalProviderCapabilityStatus[];
  lastDiagnostic: string | null;
  recovery: "none" | "last-known-good";
  busy: boolean;
  releaseWrites: "gh-compatibility";
}

export type GithubEvidenceRequest =
  | { kind: "context" | "repository" | "releases" }
  | { kind: "release" | "tag"; tag: string }
  | { kind: "issue" | "pull-request"; number: number };

export interface GithubEvidence {
  providerId: "github";
  capabilityId: string;
  toolName: string;
  capabilityGeneration: number;
  repository: string | null;
  data: unknown;
}
