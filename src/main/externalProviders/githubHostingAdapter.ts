import { createHash } from "node:crypto";
import { ReleaseArtifactStore, MAX_RELEASE_ARTIFACT_SIZE, type ReleaseAssetSource } from "./releaseAssetTransport";
import { AgentHarnessError } from "../core/applicationErrors";
import { createProviderOwnedRemote } from "../repository/providerOwnedRemote";
import type { GitHttpAuthentication } from "../core/gitExecution";
import type { RepositoryHostingAdapter } from "./repositoryHostingAdapter";
import type { GithubProviderService } from "./githubProviderService";
import type { GithubCompatibilityOperation } from "./githubHostingCompatibility";
import type { HostedRepositoryLocator, HostedRepository, HostedRepositoryCreateRequest, HostedRepositorySettingsChanges, HostedPage, HostedRef, HostedFileWrite, HostedPullCreate, HostedPullUpdate, HostedPullRequest, RepositoryHostingStatus } from "../../shared/repositoryHostingContracts";

const invalid = () => new AgentHarnessError("INVALID_INPUT", "Select bounded GitHub repository coordinates and arguments.");
const stale = () => new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "GitHub state changed or could not be verified; inspect before retrying.");
const record = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== "object" || Array.isArray(value)) throw stale(); return value as Record<string, unknown>; };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const coordinate = (value: unknown) => { if (typeof value !== "string" || !/^[a-z0-9_-][a-z0-9_.-]{0,99}$/i.test(value) || value === "..") throw invalid(); return value; };
const sha = (value: unknown) => { if (typeof value !== "string" || !/^[a-f0-9]{40}$/.test(value)) throw stale(); return value; };
const text = (value: unknown, max = 65536) => { if (typeof value !== "string" || value.includes("\0") || Buffer.byteLength(value) > max) throw invalid(); return value.replace(/\b(?:gh[pousr]_[a-z0-9_]+|github_pat_[a-z0-9_]+)\b/gi, "[REDACTED]"); };
const inputText = (value: unknown, max = 65536) => { const checked = text(value, max); if (checked !== value) throw invalid(); return checked; };
const refName = (value: unknown) => { const name = text(value, 240); if (!name || name.startsWith("-") || /[\s~^:?*\[\\]|\.\.|@\{|\/\/|\/$|\.$/.test(name)) throw invalid(); return name; };
const positive = (value: unknown) => { if (!Number.isSafeInteger(value) || Number(value) < 1) throw invalid(); return Number(value); };
const filePath = (value: unknown) => { const file = text(value, 4096); if (!file || /[\\:\r\n]/.test(file) || file.split("/").some(part => !part || part === "." || part === ".." || /^\.git(?:$|[. ])/i.test(part))) throw invalid(); return file; };
const page = (input: HostedPage) => { const current = positive(input.page ?? 1), limit = positive(input.limit ?? 20); if (current > 10000 || limit > 50) throw invalid(); return { page: current, perPage: limit }; };
const rows = (raw: unknown, limit: number) => { if (!Array.isArray(raw) || raw.length > limit) throw stale(); return raw; };
export interface HostedGithubRelease { id: number; tagName: string; name: string; body: string; draft: boolean; prerelease: boolean; assets: { id: number; name: string; size: number; digest: string | null }[]; stateId: string }
export interface HostedGithubReleaseWrite { tagName: string; name: string; body: string; draft: boolean; prerelease: boolean }

/** Provider-neutral hosting via exact official tools, with individually named proven compatibility gaps. */
export class GithubHostingAdapter implements RepositoryHostingAdapter {
  readonly providerId = "github";
  readonly artifacts = new ReleaseArtifactStore();
  private readonly mutations = new Map<string, Promise<unknown>>();
  constructor(readonly service: GithubProviderService) {}
  async connect() { await this.service.connect(); return this.providerStatus(); }
  async disconnect() { await this.service.disconnect(); await this.artifacts.close(); return this.providerStatus(); }
  async gitHttpAuthentication(destination: string): Promise<GitHttpAuthentication | null> {
    let url: URL; try { url = new URL(destination); } catch { return null; }
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash) return null;
    const match = /^\/([a-z0-9_-][a-z0-9_.-]{0,99})\/([a-z0-9_-][a-z0-9_.-]{0,99})\.git$/i.exec(url.pathname); if (!match) return null;
    if (this.service.getStatus().runtime !== "ready") return null;
    const credential = await this.service.gitCredential();
    return { destination, username: credential.login, password: credential.token };
  }
  private locator(locator: HostedRepositoryLocator) { return { owner: coordinate(locator.owner), repo: coordinate(locator.repository) }; }
  private invoke(capability: string, locator: HostedRepositoryLocator, input: Record<string, unknown> = {}, signal?: AbortSignal) { return this.service.invokeHosted(capability, { ...this.locator(locator), ...input }, signal); }
  private compat(operation: GithubCompatibilityOperation, locator: HostedRepositoryLocator, input: Record<string, unknown> = {}, signal?: AbortSignal) { return this.service.invokeCompatibility(operation, { ...this.locator(locator), ...input }, signal); }
  private async locked<T>(locator: HostedRepositoryLocator, work: () => Promise<T>): Promise<T> {
    const key = JSON.stringify(this.locator(locator)).toLowerCase(), prior = this.mutations.get(key) ?? Promise.resolve();
    const next = prior.catch(() => undefined).then(work); this.mutations.set(key, next);
    try { return await next; } finally { if (this.mutations.get(key) === next) this.mutations.delete(key); }
  }
  async providerStatus(signal?: AbortSignal): Promise<RepositoryHostingStatus> {
    const status = this.service.getStatus();
    const identity = status.runtime === "ready" && !status.busy ? record(await this.service.invokeHosted("github.context.read", {}, signal)) : null;
    return { providerId: "github", readiness: identity ? "ready" : "authentication-required", configuration: "configured", implementation: "official-mcp", settingsConcurrency: "application-expected-state", identity: identity ? { login: coordinate(identity.login) } : null,
      capabilities: status.capabilities.filter(cap => cap.availability === "available").map(cap => cap.capabilityId), capabilityEvidence: "discovered-official-tools", diagnostic: status.lastDiagnostic ?? (identity ? "Official MCP is connected. Named compatibility operations require gh authenticated to github.com as the same account, with repository Contents access." : "Connect the official GitHub MCP provider and authenticate. Named compatibility operations also require gh authenticated to github.com as the same account."),
      compatibilityCapabilities: ["repository-settings", "ref-read", "ref-create", "ref-delete", "file-metadata", "file-delete-cas", "release-read", "release-create", "release-update", "release-delete", "asset-upload", "asset-delete", "asset-download"].map(operation => ({ operation, readiness: "requires-matching-cli-account" as const })),
      mutationConcurrency: { file: "server-blob-sha", pullRequestMerge: "server-head-sha", ref: "application-expected-state", pullRequestEdit: "application-expected-state", review: "explicit-commit" } };
  }
  private repository(raw: unknown, locator?: HostedRepositoryLocator): HostedRepository {
    const data = record(raw), full = String(data.full_name ?? "").split("/");
    const owner = coordinate(full[0]), repository = coordinate(full[1]);
    if (full.length !== 2 || locator && `${owner}/${repository}`.toLowerCase() !== `${this.locator(locator).owner}/${locator.repository}`.toLowerCase() || typeof data.private !== "boolean" || !/^[a-z0-9_:-]{1,128}$/i.test(String(data.id))) throw stale();
    const projected = { providerId: "github", repositoryId: String(data.id), owner, repository, visibility: data.private ? "private" as const : "public" as const, description: text(data.description ?? "", 2000), defaultBranch: data.default_branch ? refName(data.default_branch) : "", empty: data.size === 0, archived: data.archived === true, fork: data.fork === true, mirror: false, updatedAt: typeof data.updated_at === "string" ? text(data.updated_at, 100) : null };
    return { ...projected, state: hash(projected) };
  }
  async inspectRepository(locator: HostedRepositoryLocator, signal?: AbortSignal) {
    const raw = record(await this.invoke("github.repository.read", locator, {}, signal));
    const found = rows(raw.items, 1); if (found.length !== 1) throw stale(); return this.repositoryMetadata(found[0], locator, signal);
  }
  private async repositoryMetadata(raw: unknown, locator?: HostedRepositoryLocator, signal?: AbortSignal) {
    const hosted = this.repository(raw, locator);
    if (!hosted.empty) return hosted;
    // GitHub's size is rounded storage metadata, not proof that HEAD is absent.
    const branches = await this.listRefs({ owner: hosted.owner, repository: hosted.repository }, "branches", { limit: 1 }, signal);
    const { state: _state, ...projected } = hosted, verified = { ...projected, empty: branches.refs.length === 0 };
    return { ...verified, state: hash(verified) };
  }
  async listRepositories(input: HostedPage, signal?: AbortSignal) {
    const identity = record(await this.service.invokeHosted("github.context.read", {}, signal)), paging = page(input);
    const raw = record(await this.service.invokeHosted("github.repository.list", { owner: coordinate(identity.login), ...paging }, signal));
    const found = rows(raw.items, paging.perPage); return { repositories: await Promise.all(found.map(row => this.repositoryMetadata(row, undefined, signal))), nextPage: found.length === paging.perPage ? paging.page + 1 : null };
  }
  async createRepository(input: HostedRepositoryCreateRequest, signal?: AbortSignal) {
    const selected = this.locator(input); if (input.initialize !== false || !["private", "public"].includes(input.visibility)) throw invalid();
    const identity = record(await this.service.invokeHosted("github.context.read", {}, signal));
    const created = record(await this.service.invokeHosted("github.repository.create", { name: selected.repo, ...(selected.owner.toLowerCase() === coordinate(identity.login).toLowerCase() ? {} : { organization: selected.owner }), private: input.visibility === "private", description: inputText(input.description ?? "", 2000), autoInit: false }, signal));
    if (String(created.url).toLowerCase() !== `https://github.com/${selected.owner}/${selected.repo}`.toLowerCase()) throw stale();
    const after = await this.inspectRepository(input, signal); if (after.repositoryId !== String(created.id) || after.visibility !== input.visibility || !after.empty) throw stale(); return { ...after, created: true };
  }
  async updateRepositorySettings(locator: HostedRepositoryLocator, expectedState: string, changes: HostedRepositorySettingsChanges, signal?: AbortSignal) {
    return this.locked(locator, async () => {
      const before = await this.inspectRepository(locator, signal); if (before.state !== expectedState) throw stale();
      if (changes.description !== undefined) inputText(changes.description, 2000);
      await this.compat("repository-settings", locator, { ...changes }, signal);
      const after = await this.inspectRepository(locator, signal); if (changes.visibility !== undefined && after.visibility !== changes.visibility || changes.description !== undefined && after.description !== changes.description) throw stale(); return after;
    });
  }
  async verifyRepository(locator: HostedRepositoryLocator, signal?: AbortSignal) { return this.inspectRepository(locator, signal); }
  async resolveGitRemote(locator: HostedRepositoryLocator, transport: "https" | "ssh" = "https", signal?: AbortSignal) {
    if (!["https", "ssh"].includes(transport)) throw invalid(); const hosted = await this.inspectRepository(locator, signal);
    return createProviderOwnedRemote({ providerId: "github", destination: transport === "https" ? `https://github.com/${hosted.owner}/${hosted.repository}.git` : `git@github.com:${hosted.owner}/${hosted.repository}.git`, hostedRepositoryId: hosted.repositoryId, hostedRepositoryState: hosted.state });
  }
  async listRefs(locator: HostedRepositoryLocator, kind: "branches" | "tags", input: HostedPage, signal?: AbortSignal) {
    const paging = page(input), found = rows(await this.invoke(kind === "branches" ? "github.branch.list" : "github.tag.list", locator, paging, signal), paging.perPage);
    return { refs: found.map(raw => { const data = record(raw); return { name: refName(data.name), commit: sha(record(data.commit).sha), protected: data.protected === true }; }), nextPage: found.length === paging.perPage ? paging.page + 1 : null };
  }
  async inspectRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, signal?: AbortSignal): Promise<HostedRef> {
    refName(name);
    if (kind === "tags") { const raw = record(await this.invoke("github.tag.read", locator, { tag: name }, signal)); if (raw.name !== name) throw stale(); return { name, commit: sha(record(raw.commit).sha), protected: false }; }
    const raw = record(await this.compat("ref-read", locator, { kind, name }, signal)); if (raw.ref !== `refs/heads/${name}`) throw stale(); return { name, commit: sha(record(raw.object).sha), protected: false };
  }
  async createRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, sourceCommit: string, signal?: AbortSignal) {
    refName(name); sha(sourceCommit);
    return this.locked(locator, async () => {
      const commit = record(await this.invoke("github.commit.read", locator, { sha: sourceCommit }, signal)); if (commit.sha !== sourceCommit) throw stale();
      const source = kind === "branches" ? (await this.listRefs(locator, "branches", { limit: 50 }, signal)).refs.find(branch => branch.commit === sourceCommit) : null;
      if (source) await this.invoke("github.branch.create", locator, { branch: name, from_branch: source.name }, signal);
      else await this.compat("ref-create", locator, { kind, name, sourceCommit }, signal);
      const after = await this.inspectRef(locator, kind, name, signal); if (after.commit !== sourceCommit) throw stale(); return after;
    });
  }
  async deleteRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, expectedCommit: string, signal?: AbortSignal): Promise<{ deleted: true; name: string }> {
    sha(expectedCommit); refName(name);
    return this.locked(locator, async () => { if ((await this.inspectRef(locator, kind, name, signal)).commit !== expectedCommit) throw stale(); await this.compat("ref-delete", locator, { kind, name }, signal); return { deleted: true, name }; });
  }
  async inspectFile(locator: HostedRepositoryLocator, inputPath: string, ref: string, signal?: AbortSignal) {
    const file = filePath(inputPath), commit = /^[a-f0-9]{40}$/.test(ref) ? ref : (await this.inspectRef(locator, "branches", refName(ref), signal)).commit;
    const metadata = record(await this.compat("file-metadata", locator, { filePath: file, commit }, signal));
    if (metadata.exists === false) return { filePath: file, ref, sha: null, content: null, exists: false };
    if (metadata.path !== file || metadata.type !== "file") throw stale(); const expected = sha(metadata.sha);
    const data = record(await this.invoke("github.file.read", locator, { path: file, ref: commit }, signal));
    const selected = this.locator(locator), content = text(data.content, 131072), bytes = Buffer.from(content, "utf8");
    const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if (data.sha !== expected || actual !== expected || typeof data.uri !== "string" || !data.uri.toLowerCase().startsWith(`repo://${selected.owner}/${selected.repo}/`.toLowerCase()) || !data.uri.includes(commit)) throw stale();
    return { filePath: file, ref, sha: expected, content, exists: true };
  }
  async writeFile(locator: HostedRepositoryLocator, input: HostedFileWrite, signal?: AbortSignal) {
    return this.locked(locator, async () => {
      const hosted = await this.inspectRepository(locator, signal);
      const before = hosted.empty ? { sha: null } : await this.inspectFile(locator, input.filePath, input.branch, signal); if ((before.sha ?? "absent") !== input.expectedSha) throw stale();
      await this.invoke("github.file.write", locator, { path: filePath(input.filePath), branch: refName(input.branch), content: inputText(input.content, 131072), message: inputText(input.message, 2000), ...(before.sha ? { sha: before.sha } : {}) }, signal);
      const after = await this.inspectFile(locator, input.filePath, input.branch, signal); if (after.content !== input.content) throw stale(); return after;
    });
  }
  async deleteFile(locator: HostedRepositoryLocator, input: Omit<HostedFileWrite, "content">, signal?: AbortSignal) {
    return this.locked(locator, async () => {
      const before = await this.inspectFile(locator, input.filePath, input.branch, signal); if (!before.sha || before.sha !== input.expectedSha) throw stale();
      // Official delete_file has no blob SHA parameter; this named route keeps server CAS.
      await this.compat("file-delete-cas", locator, { ...input }, signal);
      const after = await this.inspectFile(locator, input.filePath, input.branch, signal); if (after.exists) throw stale(); return after;
    });
  }
  private pull(raw: unknown, number?: number): HostedPullRequest {
    const data = record(raw), actual = positive(data.number); if (number !== undefined && number !== actual || !["open", "closed"].includes(String(data.state))) throw stale();
    const branch = (value: unknown) => { const data = record(value); return { name: refName(data.ref), commit: sha(data.sha), protected: false }; };
    const projected = { number: actual, title: text(data.title, 2000), body: text(data.body ?? ""), state: data.state as "open" | "closed", merged: data.merged === true, head: branch(data.head), base: branch(data.base), mergeCommit: data.merge_commit_sha ? sha(data.merge_commit_sha) : null };
    return { ...projected, stateId: hash(projected) };
  }
  async listPullRequests(locator: HostedRepositoryLocator, input: HostedPage & { state?: "open" | "closed" | "all" }, signal?: AbortSignal) {
    const paging = page(input); if (input.state && !["open", "closed", "all"].includes(input.state)) throw invalid();
    const found = rows(await this.invoke("github.pull_request.list", locator, { ...paging, state: input.state ?? "open" }, signal), paging.perPage);
    return { pullRequests: found.map(raw => this.pull(raw)), nextPage: found.length === paging.perPage ? paging.page + 1 : null };
  }
  async inspectPullRequest(locator: HostedRepositoryLocator, number: number, signal?: AbortSignal) { return this.pull(await this.invoke("github.pull_request.read", locator, { number: positive(number) }, signal), number); }
  async createPullRequest(locator: HostedRepositoryLocator, input: HostedPullCreate, signal?: AbortSignal) {
    const data = record(await this.invoke("github.pull_request.write", locator, { title: inputText(input.title, 2000), body: inputText(input.body ?? ""), head: refName(input.head), base: refName(input.base) }, signal));
    const selected = this.locator(locator), match = new RegExp(`^https://github\\.com/${selected.owner.replace(/[.]/g, "\\.")}/${selected.repo.replace(/[.]/g, "\\.")}/pull/(\\d+)$`, "i").exec(String(data.url));
    if (!match) throw stale(); const after = await this.inspectPullRequest(locator, Number(match[1]), signal); if (after.head.name !== input.head || after.base.name !== input.base) throw stale(); return after;
  }
  async updatePullRequest(locator: HostedRepositoryLocator, number: number, expectedState: string, input: HostedPullUpdate, signal?: AbortSignal) {
    return this.locked(locator, async () => { const before = await this.inspectPullRequest(locator, number, signal); if (before.stateId !== expectedState || before.merged || !Object.keys(input).length) throw stale();
      await this.invoke("github.pull_request.update", locator, { pullNumber: positive(number), ...(input.title === undefined ? {} : { title: inputText(input.title, 2000) }), ...(input.body === undefined ? {} : { body: inputText(input.body) }), ...(input.base === undefined ? {} : { base: refName(input.base) }), ...(input.state === undefined ? {} : { state: input.state }) }, signal);
      const after = await this.inspectPullRequest(locator, number, signal); if (input.title !== undefined && after.title !== input.title || input.body !== undefined && after.body !== input.body || input.base !== undefined && after.base.name !== input.base || input.state !== undefined && after.state !== input.state) throw stale(); return after;
    });
  }
  async mergePullRequest(locator: HostedRepositoryLocator, number: number, expectedHead: string, method: "merge" | "rebase" | "squash", signal?: AbortSignal) {
    sha(expectedHead); if (!["merge", "rebase", "squash"].includes(method)) throw invalid();
    return this.locked(locator, async () => { const before = await this.inspectPullRequest(locator, number, signal); if (before.head.commit !== expectedHead || before.state !== "open" || before.merged) throw stale();
      await this.invoke("github.pull_request.merge", locator, { pullNumber: positive(number), expectedHeadSha: expectedHead, merge_method: method }, signal); const after = await this.inspectPullRequest(locator, number, signal); if (!after.merged || after.state !== "closed") throw stale(); return after;
    });
  }
  private review(raw: unknown) { const data = record(raw); return { id: positive(data.id), state: text(data.state, 32), body: text(data.body ?? ""), commit: sha(data.commit_id) }; }
  async listReviews(locator: HostedRepositoryLocator, number: number, input: HostedPage, signal?: AbortSignal) { const paging = page(input), found = rows(await this.invoke("github.review.list", locator, { pullNumber: positive(number), ...paging }, signal), paging.perPage); return { reviews: found.map(raw => this.review(raw)), nextPage: found.length === paging.perPage ? paging.page + 1 : null }; }
  async createReview(locator: HostedRepositoryLocator, number: number, expectedHead: string, event: "APPROVED" | "REQUEST_CHANGES" | "COMMENT", body: string, signal?: AbortSignal) {
    sha(expectedHead); if ((await this.inspectPullRequest(locator, number, signal)).head.commit !== expectedHead) throw stale(); if (!["APPROVED", "REQUEST_CHANGES", "COMMENT"].includes(event)) throw invalid();
    return this.locked(locator, async () => {
      const before = await this.listReviews(locator, number, { limit: 50 }, signal); if (before.nextPage) throw stale();
      await this.invoke("github.review.create", locator, { pullNumber: positive(number), commitID: expectedHead, event: event === "APPROVED" ? "APPROVE" : event, body: inputText(body) }, signal);
      const after = await this.listReviews(locator, number, { limit: 50 }, signal); if (after.nextPage) throw stale();
      const created = after.reviews.filter(review => !before.reviews.some(prior => prior.id === review.id) && review.commit === expectedHead && review.state === (event === "COMMENT" ? "COMMENTED" : event) && review.body === body);
      if (created.length !== 1) throw stale(); return created[0];
    });
  }
  private release(raw: unknown): HostedGithubRelease {
    const data = record(raw), assets = rows(data.assets ?? [], 100).map(raw => { const asset = record(raw); if (!Number.isSafeInteger(asset.size) || Number(asset.size) < 0) throw stale(); return { id: positive(asset.id), name: text(asset.name, 160), size: Number(asset.size), digest: asset.digest ? text(asset.digest, 100) : null }; });
    const projected = { id: positive(data.id), tagName: refName(data.tag_name), name: text(data.name ?? "", 2000), body: text(data.body ?? ""), draft: data.draft === true, prerelease: data.prerelease === true, assets }; return { ...projected, stateId: hash(projected) };
  }
  async listReleases(locator: HostedRepositoryLocator, signal?: AbortSignal) { return rows(await this.invoke("github.release.list", locator, {}, signal), 20).map(raw => this.release(raw)); }
  async inspectRelease(locator: HostedRepositoryLocator, releaseId: number, signal?: AbortSignal) { const result = this.release(await this.compat("release-read", locator, { releaseId: positive(releaseId) }, signal)); if (result.id !== releaseId) throw stale(); return result; }
  async writeRelease(locator: HostedRepositoryLocator, input: HostedGithubReleaseWrite, releaseId?: number, expectedState?: string, signal?: AbortSignal) {
    refName(input.tagName); inputText(input.name, 2000); inputText(input.body); if (typeof input.draft !== "boolean" || typeof input.prerelease !== "boolean") throw invalid();
    return this.locked(locator, async () => { if (releaseId !== undefined && (await this.inspectRelease(locator, releaseId, signal)).stateId !== expectedState) throw stale();
      const operation = releaseId === undefined ? "release-create" : "release-update", capability = `github.release.${releaseId === undefined ? "create" : "update"}`;
      const data = this.service.getStatus().capabilities.some(cap => cap.capabilityId === capability && cap.availability === "available")
        ? await this.invoke(capability, locator, { tag_name: input.tagName, release_id: releaseId, ...input }, signal)
        : await this.compat(operation, locator, { ...input, releaseId }, signal);
      const written = this.release(data), after = await this.inspectRelease(locator, written.id, signal); if (after.tagName !== input.tagName || after.draft !== input.draft || after.prerelease !== input.prerelease || after.body !== input.body || after.name !== input.name) throw stale(); return after;
    });
  }
  async deleteRelease(locator: HostedRepositoryLocator, releaseId: number, expectedState: string, signal?: AbortSignal) { return this.locked(locator, async () => { if ((await this.inspectRelease(locator, releaseId, signal)).stateId !== expectedState) throw stale(); await this.compat("release-delete", locator, { releaseId }, signal); return { deleted: true, releaseId }; }); }
  async mutateAsset(locator: HostedRepositoryLocator, releaseId: number, expectedState: string, input: { name: string; contentBase64: string } | { name: string; source: ReleaseAssetSource } | { assetId: number }, signal?: AbortSignal) {
    return this.locked(locator, async () => { const before = await this.inspectRelease(locator, releaseId, signal); if (before.stateId !== expectedState) throw stale();
      if ("assetId" in input && !before.assets.some(asset => asset.id === input.assetId) || "name" in input && before.assets.some(asset => asset.name === input.name)) throw stale();
      await this.compat("assetId" in input ? "asset-delete" : "asset-upload", locator, { ...input, releaseId, tagName: before.tagName }, signal);
      const after = await this.inspectRelease(locator, releaseId, signal); if ("assetId" in input ? after.assets.some(asset => asset.id === input.assetId) : !after.assets.some(asset => asset.name === input.name)) throw stale();
      if ("source" in input) { const asset = after.assets.find(asset => asset.name === input.name)!; if (asset.size !== input.source.size || asset.digest?.startsWith("sha256:") && asset.digest !== `sha256:${input.source.sha256}`) throw stale(); }
      return after;
    });
  }
  async downloadAsset(locator: HostedRepositoryLocator, releaseId: number, expectedState: string, assetId: number, signal?: AbortSignal) {
    return this.locked(locator, async () => {
      const before = await this.inspectRelease(locator, releaseId, signal), asset = before.assets.find(asset => asset.id === positive(assetId));
      if (before.stateId !== expectedState || !asset || asset.size < 1 || asset.size > MAX_RELEASE_ARTIFACT_SIZE) throw stale();
      return this.artifacts.download({ filename: asset.name, size: asset.size, providerDigest: asset.digest }, async destination => {
        await this.compat("asset-download", locator, { assetId, destination }, signal);
        if ((await this.inspectRelease(locator, releaseId, signal)).stateId !== expectedState) throw stale();
      }, signal);
    });
  }
}
