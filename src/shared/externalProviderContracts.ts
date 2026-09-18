export type ExternalProviderTransportKind = "stdio" | "streamable-http";

export type ExternalProviderCapabilityAvailability = "available" | "unavailable" | "unknown";

export type ExternalProviderReadiness =
  | "ready"
  | "unavailable"
  | "degraded"
  | "authentication-required";

export type ExternalProviderDiscoveryState = "not-attempted" | "succeeded" | "failed";

export type ExternalProviderTransportState = "not-connected" | "connected" | "failed";

export type ExternalProviderFailureKind =
  | "unknown-provider"
  | "not-configured"
  | "authentication-required"
  | "transport-failure"
  | "timeout"
  | "cancelled"
  | "capability-unavailable"
  | "undiscovered-tool"
  | "provider-error"
  | "malformed-result";

export interface ExternalProviderCapabilityStatus {
  capabilityId: string;
  availability: ExternalProviderCapabilityAvailability;
  toolName?: string;
  diagnostic?: string;
}

export interface ExternalProviderStatus {
  providerId: string;
  displayName: string;
  transportKind: ExternalProviderTransportKind | null;
  configuration: "configured" | "not-configured";
  readiness: ExternalProviderReadiness;
  discovery: ExternalProviderDiscoveryState;
  transport: ExternalProviderTransportState;
  lastDiagnostic: string | null;
  capabilityGeneration: number;
  discoveredToolNames: string[];
  discoveredResourceCount: number;
  capabilities: ExternalProviderCapabilityStatus[];
}

export interface ExternalProviderInvocationReceipt {
  providerId: string;
  displayName: string;
  capabilityId: string;
  toolName: string;
  capabilityGeneration: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  result: unknown;
}
