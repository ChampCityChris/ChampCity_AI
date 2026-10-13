import type { HostedRepository, HostedRepositoryCreateRequest, HostedRepositoryLocator, HostedRepositorySettingsChanges, RepositoryHostingStatus } from "../../shared/repositoryHostingContracts";
import type { ProviderOwnedRemote } from "../repository/providerOwnedRemote";
import type { HostedPage, HostedRef, HostedFile, HostedFileWrite, HostedPullRequest, HostedPullCreate, HostedPullUpdate, HostedReview } from "../../shared/repositoryHostingContracts";

/** Provider metadata and transport ownership only. Git and workflow lifecycle stay with their existing owners. */
export interface RepositoryHostingAdapter {
  readonly providerId: string;
  providerStatus(signal?: AbortSignal): Promise<RepositoryHostingStatus>;
  inspectRepository(locator: HostedRepositoryLocator, signal?: AbortSignal): Promise<HostedRepository>;
  createRepository(request: HostedRepositoryCreateRequest, signal?: AbortSignal): Promise<HostedRepository & { created: boolean }>;
  updateRepositorySettings(locator: HostedRepositoryLocator, expectedState: string, changes: HostedRepositorySettingsChanges, signal?: AbortSignal): Promise<HostedRepository>;
  resolveGitRemote(locator: HostedRepositoryLocator, transport?: "https" | "ssh", signal?: AbortSignal): Promise<ProviderOwnedRemote>;
  verifyRepository(locator: HostedRepositoryLocator, signal?: AbortSignal): Promise<HostedRepository>;
  listRepositories(input: HostedPage, signal?: AbortSignal): Promise<{ repositories: HostedRepository[]; nextPage: number | null }>;
  listRefs(locator: HostedRepositoryLocator, kind: "branches" | "tags", input: HostedPage, signal?: AbortSignal): Promise<{ refs: HostedRef[]; nextPage: number | null }>;
  inspectRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, signal?: AbortSignal): Promise<HostedRef>;
  createRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, sourceCommit: string, signal?: AbortSignal): Promise<HostedRef>;
  deleteRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, expectedCommit: string, signal?: AbortSignal): Promise<{ deleted: true; name: string }>;
  inspectFile(locator: HostedRepositoryLocator, filePath: string, ref: string, signal?: AbortSignal): Promise<HostedFile>;
  writeFile(locator: HostedRepositoryLocator, input: HostedFileWrite, signal?: AbortSignal): Promise<HostedFile>;
  deleteFile(locator: HostedRepositoryLocator, input: Omit<HostedFileWrite, "content">, signal?: AbortSignal): Promise<HostedFile>;
  listPullRequests(locator: HostedRepositoryLocator, input: HostedPage & { state?: "open" | "closed" | "all" }, signal?: AbortSignal): Promise<{ pullRequests: HostedPullRequest[]; nextPage: number | null }>;
  inspectPullRequest(locator: HostedRepositoryLocator, number: number, signal?: AbortSignal): Promise<HostedPullRequest>;
  createPullRequest(locator: HostedRepositoryLocator, input: HostedPullCreate, signal?: AbortSignal): Promise<HostedPullRequest>;
  updatePullRequest(locator: HostedRepositoryLocator, number: number, expectedState: string, input: HostedPullUpdate, signal?: AbortSignal): Promise<HostedPullRequest>;
  mergePullRequest(locator: HostedRepositoryLocator, number: number, expectedHead: string, method: "merge" | "rebase" | "squash", signal?: AbortSignal): Promise<HostedPullRequest>;
  listReviews(locator: HostedRepositoryLocator, number: number, input: HostedPage, signal?: AbortSignal): Promise<{ reviews: HostedReview[]; nextPage: number | null }>;
  createReview(locator: HostedRepositoryLocator, number: number, expectedHead: string, event: "APPROVED" | "REQUEST_CHANGES" | "COMMENT", body: string, signal?: AbortSignal): Promise<HostedReview>;
}
