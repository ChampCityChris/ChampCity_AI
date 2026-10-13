export type RepositoryHostingReadiness = "not-configured" | "unreachable" | "authentication-required" | "authentication-failed" | "ready";
export type RepositoryVisibility = "private" | "public";
export interface HostedRepositoryLocator { repository: string; owner?: string }
export interface HostedRepository {
  providerId: string; repositoryId: string; owner: string; repository: string;
  visibility: RepositoryVisibility; description: string; defaultBranch: string;
  empty: boolean; archived: boolean; fork: boolean; mirror: boolean; updatedAt: string | null;
  state: string;
}
export interface RepositoryHostingStatus {
  providerId: string; readiness: RepositoryHostingReadiness;
  configuration: "configured" | "not-configured";
  implementation: "forgejo-api-compatibility" | "official-mcp" | "bounded-compatibility";
  settingsConcurrency: "application-expected-state" | "server-atomic" | "unavailable";
  identity: { login: string } | null; capabilities: string[]; diagnostic: string | null;
  capabilityEvidence?: "adapter-contract" | "discovered-official-tools";
  compatibilityCapabilities?: { operation: string; readiness: "requires-matching-cli-account" }[];
  mutationConcurrency?: { file: "server-blob-sha"; pullRequestMerge: "server-head-sha"; ref: "application-expected-state"; pullRequestEdit: "application-expected-state"; review: "explicit-commit" };
}
export interface HostedRepositoryCreateRequest extends HostedRepositoryLocator {
  visibility: RepositoryVisibility; description?: string; initialize: false;
}
export interface HostedRepositorySettingsChanges { visibility?: RepositoryVisibility; description?: string }
export interface ForgejoHostingConfiguration {
  providerId: string; kind: "forgejo"; apiBaseUrl: string;
  namespace: string; namespaceType: "user" | "organization";
  preferredTransport: "https" | "ssh"; expectedSshHost?: string; expectedSshPort?: number;
  credentialReference: string; allowInsecureHttp: boolean; allowInsecureGitHttp: boolean;
}
export interface RepositoryHostingSettings {
  configurationId: string; providers: ForgejoHostingConfiguration[];
}
export type ForgejoHostingConfigurationInput = Omit<ForgejoHostingConfiguration, "credentialReference"> & { credentialReference?: string };
export interface RepositoryHostingSettingsInput { configurationId: string; providers: ForgejoHostingConfigurationInput[] }

// Settings IPC sends only catalogued errors, never exception text or details.
export const repositoryHostingSettingsErrors = {
  "invalid-provider-id": { message: "Provider ID must start with a letter and contain lowercase letters, numbers, _ or -. The ID github is reserved.", field: "providerId" },
  "invalid-api-url": { message: "Forgejo API URL must be a credential-free HTTP(S) URL identifying an /api/v1 endpoint.", field: "apiBaseUrl" },
  "http-api-policy": { message: "HTTP API requires explicit insecure-HTTP permission.", field: "apiBaseUrl" },
  "invalid-namespace": { message: "Namespace is invalid.", field: "namespace" },
  "invalid-ssh-policy": { message: "Expected SSH host or port is invalid.", field: "expectedSshHost" },
  "invalid-configuration": { message: "Connection fields are invalid. Check the connection settings.", field: null },
  "stale-configuration": { message: "Connection settings changed. Refresh before saving and retry.", field: null },
  "authentication-required": { message: "Save the connection and provide an authentication token.", field: null },
  "invalid-token": { message: "Authentication token is required and must contain only printable non-space characters.", field: "token" },
  "settings-unavailable": { message: "Repository hosting settings or secure credential storage are unavailable. Refresh and retry.", field: null },
} as const;
export type RepositoryHostingSettingsErrorCode = keyof typeof repositoryHostingSettingsErrors;
export type RepositoryHostingSettingsResult<T> = { ok: true; value: T } | { ok: false; error: { code: RepositoryHostingSettingsErrorCode } };

export interface HostedPage { page?: number; limit?: number }
export interface HostedRef { name: string; commit: string; protected: boolean }
export interface HostedFile { filePath: string; ref: string; sha: string | null; content: string | null; exists: boolean }
export interface HostedFileWrite { filePath: string; branch: string; expectedSha: string; content: string; message: string }
export interface HostedPullRequest {
  number: number; title: string; body: string; state: "open" | "closed"; merged: boolean;
  head: HostedRef; base: HostedRef; mergeCommit: string | null; stateId: string;
}
export interface HostedPullCreate { title: string; body?: string; head: string; base: string }
export interface HostedPullUpdate { title?: string; body?: string; state?: "open" | "closed"; base?: string }
export interface HostedReview { id: number; state: string; body: string; commit: string }
