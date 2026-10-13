import { createHash } from "node:crypto";
import { AgentHarnessError } from "../core/applicationErrors";
import type { ForgejoHostingConfiguration, HostedRepository, HostedRepositoryCreateRequest, HostedRepositoryLocator, HostedRepositorySettingsChanges, RepositoryHostingStatus } from "../../shared/repositoryHostingContracts";
import { createProviderOwnedRemote, remoteDestinationIdentity } from "../repository/providerOwnedRemote";
import type { RepositoryHostingAdapter } from "./repositoryHostingAdapter";
import type { GitHttpAuthentication } from "../core/gitExecution";
import type { HostedPage, HostedRef, HostedFile, HostedFileWrite, HostedPullRequest, HostedPullCreate, HostedPullUpdate, HostedReview } from "../../shared/repositoryHostingContracts";

type JsonRecord = Record<string, unknown>;
const fail = (message: string) => new AgentHarnessError("REPOSITORY_PROVIDER_FAILED", message);
const segment = (value: unknown): string => {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_.-]{0,99}$/i.test(value) || value === "." || value === ".." || /\.git$/i.test(value)) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded hosted owner and repository name.");
  return value;
};
const record = (value: unknown): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw fail("Provider returned malformed metadata.");
  return value as JsonRecord;
};
const description = (value: unknown): string => {
  if (typeof value !== "string" || value.length > 2000 || /\0/.test(value)) throw new AgentHarnessError("INVALID_INPUT", "Repository description exceeds its bounds.");
  return value;
};
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function validateForgejoHostingConfiguration(input: unknown): ForgejoHostingConfiguration {
  const cfg = record(input);
  const fields = ["providerId", "kind", "apiBaseUrl", "namespace", "namespaceType", "preferredTransport", "expectedSshHost", "expectedSshPort", "credentialReference", "allowInsecureHttp", "allowInsecureGitHttp"];
  if (Object.keys(cfg).some(field => !fields.includes(field)) || typeof cfg.providerId !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(cfg.providerId) || cfg.providerId === "github" || cfg.kind !== "forgejo" || !["user", "organization"].includes(String(cfg.namespaceType)) || !["https", "ssh"].includes(String(cfg.preferredTransport)) || typeof cfg.allowInsecureHttp !== "boolean" || typeof cfg.allowInsecureGitHttp !== "boolean") throw fail("Forgejo connection configuration is invalid.");
  let url: URL;
  try { url = new URL(String(cfg.apiBaseUrl)); } catch { throw fail("Forgejo API base URL is invalid."); }
  if (typeof cfg.apiBaseUrl !== "string" || cfg.apiBaseUrl.length > 2048 || url.username || url.password || url.search || url.hash || !["https:", "http:"].includes(url.protocol) || url.protocol === "http:" && !cfg.allowInsecureHttp || !/^\/(?:[a-z0-9_.-]+\/)*api\/v1\/?$/i.test(url.pathname) || url.pathname.split("/").includes("..")) throw fail("Forgejo requires a configured credential-free API base URL and explicit HTTP policy.");
  if (cfg.expectedSshHost !== undefined && (typeof cfg.expectedSshHost !== "string" || !/^[a-z0-9.-]{1,253}$/i.test(cfg.expectedSshHost)) || cfg.expectedSshPort !== undefined && (typeof cfg.expectedSshPort !== "number" || !Number.isInteger(cfg.expectedSshPort) || cfg.expectedSshPort < 1 || cfg.expectedSshPort > 65535)) throw fail("Forgejo SSH host policy is invalid.");
  const apiBaseUrl = url.toString().replace(/\/$/, ""), namespace = segment(cfg.namespace);
  const credentialReference = `repository-hosting:${cfg.providerId}:${digest({ apiBaseUrl, namespace: namespace.toLowerCase(), namespaceType: cfg.namespaceType })}`;
  if (cfg.credentialReference !== undefined && cfg.credentialReference !== credentialReference) throw fail("Credential reference does not belong to this configured connection.");
  return { ...cfg, apiBaseUrl, namespace, credentialReference } as unknown as ForgejoHostingConfiguration;
}

export interface ForgejoHostingAdapterOptions {
  configuration: ForgejoHostingConfiguration;
  resolveCredential(reference: string): Promise<string | null>;
  configurationStillCurrent?: () => boolean;
  fetch?: typeof fetch;
}

/** Narrow compatibility adapter for the explicitly approved Forgejo repository API surface. */
export class ForgejoHostingAdapter implements RepositoryHostingAdapter {
  readonly providerId: string;
  private readonly cfg: ForgejoHostingConfiguration;
  private readonly locks = new Map<string, Promise<void>>();
  constructor(private readonly options: ForgejoHostingAdapterOptions) {
    this.cfg = validateForgejoHostingConfiguration(options.configuration);
    this.providerId = this.cfg.providerId;
  }

  private current() {
    if (this.options.configurationStillCurrent?.() === false) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Provider configuration changed; inspect its current status before retrying.");
  }
  private locator(input: HostedRepositoryLocator) {
    if (!input || typeof input !== "object" || Object.keys(input).some(field => !["owner", "repository"].includes(field))) throw new AgentHarnessError("INVALID_INPUT", "Select an exact hosted repository identity.");
    const owner = segment(input.owner ?? this.cfg.namespace), repository = segment(input.repository);
    if (owner.toLowerCase() !== this.cfg.namespace.toLowerCase()) throw fail("Hosted repository is outside the configured namespace policy.");
    return { owner, repository, route: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}` };
  }
  private async credential() {
    let token: string | null;
    try { token = await this.options.resolveCredential(this.cfg.credentialReference); } catch { throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Provider authentication is unavailable."); }
    if (!token || token.length > 4096 || /[\x00-\x20\x7f]/.test(token)) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Provider authentication is required.");
    return token;
  }
  private async request(route: string, token: string, method = "GET", body?: JsonRecord, signal?: AbortSignal, missing = false): Promise<unknown> {
    this.current();
    try {
      const response = await (this.options.fetch ?? fetch)(`${this.cfg.apiBaseUrl}${route}`, {
        method, redirect: "error", signal: AbortSignal.any([AbortSignal.timeout(15000), ...(signal ? [signal] : [])]),
        headers: { Accept: "application/json", Authorization: `token ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401 || response.status === 403) { await response.body?.cancel(); throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Provider authentication or required permission failed."); }
      if (missing && response.status === 404) { await response.body?.cancel(); return null; }
      if (!response.ok) { await response.body?.cancel(); throw fail("Provider operation was rejected; inspect repository state before retrying."); }
      if (response.status === 204) { await response.body?.cancel(); this.current(); return null; }
      if (Number(response.headers.get("content-length")) > 262144) { await response.body?.cancel(); throw fail("Provider response exceeded its bounds."); }
      const reader = response.body?.getReader();
      if (!reader) throw fail("Provider returned no metadata.");
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        for (;;) {
          const next = await reader.read(); if (next.done) break;
          size += next.value.length;
          if (size > 262144) { await reader.cancel(); throw fail("Provider response exceeded its bounds."); }
          chunks.push(next.value);
        }
      } finally { reader.releaseLock(); }
      const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      this.current();
      const scrub = (value: unknown, depth = 0): unknown => {
        if (depth > 32) throw fail("Provider response nesting exceeds its bounds.");
        if (typeof value === "string") return value.replaceAll(token, "<REDACTED>");
        if (Array.isArray(value)) return value.map(item => scrub(item, depth + 1));
        if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replaceAll(token, "<REDACTED>"), scrub(item, depth + 1)]));
        return value;
      };
      return scrub(parsed);
    } catch (error) {
      if (error instanceof AgentHarnessError) throw error;
      throw fail("Provider is unreachable or returned invalid metadata.");
    }
  }
  private async authenticate(token: string, signal?: AbortSignal) {
    const user = record(await this.request("/user", token, "GET", undefined, signal));
    const login = segment(user.login);
    if (login.includes(token) || this.cfg.namespaceType === "user" && login.toLowerCase() !== this.cfg.namespace.toLowerCase()) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Authenticated identity does not match the configured namespace policy.");
    return { login };
  }
  private project(raw: unknown, locator: HostedRepositoryLocator, token: string): HostedRepository {
    const data = record(raw), owner = segment(record(data.owner).login), repository = segment(data.name), requested = this.locator(locator);
    if (owner.toLowerCase() !== requested.owner.toLowerCase() || repository.toLowerCase() !== requested.repository.toLowerCase() || data.full_name !== `${owner}/${repository}` || typeof data.id !== "number" || !Number.isSafeInteger(data.id) || data.id < 1 || typeof data.private !== "boolean" || typeof data.empty !== "boolean" || typeof data.archived !== "boolean" || typeof data.fork !== "boolean" || typeof data.mirror !== "boolean" || typeof data.default_branch !== "string" || data.default_branch.length > 240 || /[\0\r\n]/.test(data.default_branch)) throw fail("Provider repository identity or metadata could not be verified.");
    const text = description(data.description ?? "");
    if (data.updated_at !== undefined && data.updated_at !== null && (typeof data.updated_at !== "string" || !/^\d{4}-\d\d-\d\dT[0-9:.+-]+Z?$/.test(data.updated_at) || data.updated_at.length > 64)) throw fail("Provider repository timestamp is invalid.");
    const value = { providerId: this.providerId, repositoryId: String(data.id), owner, repository,
      visibility: data.private ? "private" as const : "public" as const, description: text.replaceAll(token, "<REDACTED>"),
      defaultBranch: data.default_branch.replaceAll(token, "<REDACTED>"), empty: data.empty, archived: data.archived, fork: data.fork, mirror: data.mirror, updatedAt: data.updated_at as string | null ?? null };
    return { ...value, state: digest({ ...value, description: text }) };
  }
  private async inspect(input: HostedRepositoryLocator, token: string, signal?: AbortSignal, missing = false) {
    const raw = await this.request(this.locator(input).route, token, "GET", undefined, signal, missing);
    return raw === null ? null : { raw: record(raw), repository: this.project(raw, input, token) };
  }
  private async locked<T>(identity: string, operation: () => Promise<T>) {
    const previous = this.locks.get(identity) ?? Promise.resolve(); let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; }), tail = previous.then(() => pending);
    this.locks.set(identity, tail); await previous;
    try { return await operation(); } finally { release(); if (this.locks.get(identity) === tail) this.locks.delete(identity); }
  }
  async providerStatus(signal?: AbortSignal): Promise<RepositoryHostingStatus> {
    const base = { providerId: this.providerId, configuration: "configured" as const, implementation: "forgejo-api-compatibility" as const, settingsConcurrency: "application-expected-state" as const, capabilityEvidence: "adapter-contract" as const,
      mutationConcurrency: { file: "server-blob-sha" as const, pullRequestMerge: "server-head-sha" as const, ref: "application-expected-state" as const, pullRequestEdit: "application-expected-state" as const, review: "explicit-commit" as const }, identity: null, capabilities: [] as string[] };
    let token: string;
    try { token = await this.credential(); } catch { return { ...base, readiness: "authentication-required", diagnostic: "Provider authentication is required." }; }
    try {
      const identity = await this.authenticate(token, signal);
      return { ...base, identity, readiness: "ready", diagnostic: null, capabilities: ["repository.list", "repository.inspect", "repository.create", "repository.update-settings", "repository.resolve-remote", "repository.verify", "branch.list", "branch.inspect", "branch.create", "branch.delete", "tag.list", "tag.inspect", "tag.create", "tag.delete", "file.read", "file.write", "file.delete", "pull_request.list", "pull_request.read", "pull_request.create", "pull_request.update", "pull_request.merge", "review.list", "review.create"] };
    } catch (error) {
      return { ...base, readiness: error instanceof AgentHarnessError && error.code === "REPOSITORY_PROVIDER_NOT_READY" ? "authentication-failed" : "unreachable", diagnostic: "Provider identity could not be authenticated and verified." };
    }
  }
  async inspectRepository(locator: HostedRepositoryLocator, signal?: AbortSignal) {
    const token = await this.credential(); await this.authenticate(token, signal);
    const inspected = await this.inspect(locator, token, signal);
    if (!inspected) throw fail("Hosted repository is unavailable.");
    return inspected.repository;
  }
  async verifyRepository(locator: HostedRepositoryLocator, signal?: AbortSignal) { return this.inspectRepository(locator, signal); }
  async createRepository(input: HostedRepositoryCreateRequest, signal?: AbortSignal) {
    if (!input || Object.keys(input).some(field => !["owner", "repository", "visibility", "description", "initialize"].includes(field)) || input.initialize !== false || !["private", "public"].includes(input.visibility)) throw new AgentHarnessError("INVALID_INPUT", "Create an exact hosted repository without initialization.");
    const locator = { repository: input.repository, ...(input.owner !== undefined ? { owner: input.owner } : {}) }, selected = this.locator(locator), text = description(input.description ?? "");
    return this.locked(selected.route.toLowerCase(), async () => {
      const token = await this.credential(); await this.authenticate(token, signal);
      const existing = await this.inspect(locator, token, signal, true);
      const matches = (repository: HostedRepository) => repository.visibility === input.visibility && repository.description === text && !repository.archived && !repository.fork && !repository.mirror;
      if (existing) {
        if (!matches(existing.repository)) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Existing repository differs from the requested identity or policy; no change was attempted.");
        return { ...existing.repository, created: false };
      }
      const route = this.cfg.namespaceType === "organization" ? `/orgs/${encodeURIComponent(selected.owner)}/repos` : "/user/repos";
      await this.request(route, token, "POST", { name: selected.repository, private: input.visibility === "private", description: text, auto_init: false }, signal);
      const verified = await this.inspect(locator, token, signal);
      if (!verified || !matches(verified.repository) || !verified.repository.empty) throw fail("Created repository did not verify as empty with the requested policy.");
      return { ...verified.repository, created: true };
    });
  }
  async updateRepositorySettings(locator: HostedRepositoryLocator, expectedState: string, changes: HostedRepositorySettingsChanges, signal?: AbortSignal) {
    const selected = this.locator(locator);
    if (!/^[a-f0-9]{64}$/.test(expectedState) || !changes || Object.keys(changes).length === 0 || Object.keys(changes).some(field => !["visibility", "description"].includes(field)) || changes.visibility !== undefined && !["private", "public"].includes(changes.visibility)) throw new AgentHarnessError("INVALID_INPUT", "Select bounded repository settings and an exact expected state.");
    if (changes.description !== undefined) description(changes.description);
    return this.locked(selected.route.toLowerCase(), async () => {
      const token = await this.credential(); await this.authenticate(token, signal);
      const before = await this.inspect(locator, token, signal);
      if (!before || before.repository.state !== expectedState) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Hosted repository changed; inspect current state before retrying. No mutation was attempted.");
      // This adapter uses a serialized application expected-state guard; it makes no server-atomic CAS claim.
      await this.request(selected.route, token, "PATCH", { ...(changes.visibility ? { private: changes.visibility === "private" } : {}), ...(changes.description !== undefined ? { description: changes.description } : {}) }, signal);
      const after = await this.inspect(locator, token, signal);
      if (!after || after.repository.repositoryId !== before.repository.repositoryId || changes.visibility !== undefined && after.repository.visibility !== changes.visibility || changes.description !== undefined && after.repository.description !== changes.description) throw fail("Updated repository state did not verify; inspect before retrying.");
      return after.repository;
    });
  }
  async resolveGitRemote(locator: HostedRepositoryLocator, transport = this.cfg.preferredTransport, signal?: AbortSignal) {
    if (!["https", "ssh"].includes(transport)) throw new AgentHarnessError("INVALID_INPUT", "Select a configured Git transport.");
    const token = await this.credential(); await this.authenticate(token, signal);
    const inspected = await this.inspect(locator, token, signal);
    if (!inspected) throw fail("Hosted repository is unavailable.");
    const destination = inspected.raw[transport === "ssh" ? "ssh_url" : "clone_url"];
    if (typeof destination !== "string" || destination.includes(token)) throw fail("Provider Git transport could not be verified.");
    const identity = remoteDestinationIdentity(destination), api = new URL(this.cfg.apiBaseUrl), selected = inspected.repository;
    const apiPrefix = api.pathname.slice(0, -7).replace(/^\//, "");
    if (transport === "ssh") {
      if (identity.transport !== "ssh" || identity.host !== (this.cfg.expectedSshHost ?? api.hostname).toLowerCase() || (identity.port ?? 22) !== (this.cfg.expectedSshPort ?? 22) || identity.repository !== `${selected.owner}/${selected.repository}`) throw fail("Provider SSH destination differs from configured host or repository policy.");
    } else if (!["https", ...(this.cfg.allowInsecureGitHttp ? ["http"] : [])].includes(identity.transport) || identity.host !== api.hostname.toLowerCase() || (identity.port ?? (identity.transport === "https" ? 443 : 80)) !== Number(api.port || (api.protocol === "https:" ? 443 : 80)) || identity.repository !== `${apiPrefix ? `${apiPrefix}/` : ""}${selected.owner}/${selected.repository}`) throw fail("Provider HTTPS destination differs from configured host or repository policy.");
    this.current();
    return createProviderOwnedRemote({ providerId: this.providerId, destination, allowInsecureHttp: this.cfg.allowInsecureGitHttp, hostedRepositoryId: selected.repositoryId, hostedRepositoryState: selected.state });
  }

  private page(input: HostedPage) {
    const page = input.page ?? 1, limit = input.limit ?? 30;
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new AgentHarnessError("INVALID_INPUT", "Select a page of at most 50 hosted records.");
    return { page, limit, query: `page=${page}&limit=${limit}` };
  }
  private list(raw: unknown, maximum: number): unknown[] {
    if (!Array.isArray(raw) || raw.length > maximum) throw fail("Provider list is malformed or exceeds its requested bounds.");
    return raw;
  }
  private refName(value: string) {
    if (typeof value !== "string" || value.length > 240 || !/^[a-zA-Z0-9][a-zA-Z0-9_./+-]*$/.test(value) || /\.\.|\/\/|@\{|\.lock(?:\/|$)/i.test(value) || /[/.]$/.test(value)) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded hosted ref name.");
    return value;
  }
  private sha(value: unknown): string {
    if (typeof value !== "string" || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)) throw fail("Provider object identity is invalid.");
    return value;
  }
  private text(value: unknown, maximum: number, token: string) {
    if (typeof value !== "string" || value.length > maximum || value.includes("\0")) throw fail("Provider text exceeds its bounds.");
    return value.replaceAll(token, "<REDACTED>");
  }
  private pullNumber(value: number) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) throw new AgentHarnessError("INVALID_INPUT", "Select an exact pull request number.");
    return value;
  }
  private projectRef(raw: unknown, kind: "branches" | "tags", expectedName?: string): HostedRef {
    const data = record(raw), name = this.refName(String(data.name)), commit = this.sha(record(data.commit)[kind === "branches" ? "id" : "sha"]);
    if (expectedName !== undefined && name !== expectedName) throw fail("Provider returned another ref.");
    if (kind === "branches" && typeof data.protected !== "boolean") throw fail("Provider branch protection metadata is invalid.");
    return { name, commit, protected: kind === "branches" ? data.protected as boolean : false };
  }
  private async hostedCredential(locator: HostedRepositoryLocator, signal?: AbortSignal) {
    const selected = this.locator(locator), token = await this.credential();
    await this.authenticate(token, signal);
    // Every hosting operation independently verifies namespace/repository identity.
    if (!await this.inspect(locator, token, signal)) throw fail("Hosted repository is unavailable.");
    return { selected, token };
  }
  async listRepositories(input: HostedPage = {}, signal?: AbortSignal) {
    const page = this.page(input), token = await this.credential(); await this.authenticate(token, signal);
    const route = this.cfg.namespaceType === "organization" ? `/orgs/${encodeURIComponent(this.cfg.namespace)}/repos` : `/users/${encodeURIComponent(this.cfg.namespace)}/repos`;
    const rows = this.list(await this.request(`${route}?${page.query}`, token, "GET", undefined, signal), page.limit);
    const repositories = rows.map(raw => this.project(raw, { repository: String(record(raw).name) }, token));
    return { repositories, nextPage: rows.length === page.limit ? page.page + 1 : null };
  }
  async listRefs(locator: HostedRepositoryLocator, kind: "branches" | "tags", input: HostedPage = {}, signal?: AbortSignal) {
    const page = this.page(input), { selected, token } = await this.hostedCredential(locator, signal);
    const rows = this.list(await this.request(`${selected.route}/${kind}?${page.query}`, token, "GET", undefined, signal), page.limit);
    return { refs: rows.map(raw => this.projectRef(raw, kind)), nextPage: rows.length === page.limit ? page.page + 1 : null };
  }
  async inspectRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, signal?: AbortSignal) {
    const { selected, token } = await this.hostedCredential(locator, signal); this.refName(name);
    return this.projectRef(await this.request(`${selected.route}/${kind}/${encodeURIComponent(name)}`, token, "GET", undefined, signal), kind, name);
  }
  async createRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, sourceCommit: string, signal?: AbortSignal) {
    this.refName(name); this.sha(sourceCommit);
    return this.locked(this.locator(locator).route.toLowerCase(), async () => {
      const { selected, token } = await this.hostedCredential(locator, signal);
      const route = `${selected.route}/${kind}`;
      if (await this.request(`${route}/${encodeURIComponent(name)}`, token, "GET", undefined, signal, true)) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Ref creation requires an absent ref.");
      await this.request(route, token, "POST", kind === "branches" ? { new_branch_name: name, old_ref_name: sourceCommit } : { tag_name: name, target: sourceCommit }, signal);
      const after = await this.inspectRef(locator, kind, name, signal);
      if (after.commit !== sourceCommit) throw fail("Created ref differs from the requested commit; inspect before retrying.");
      return after;
    });
  }
  async deleteRef(locator: HostedRepositoryLocator, kind: "branches" | "tags", name: string, expectedCommit: string, signal?: AbortSignal) {
    this.refName(name); this.sha(expectedCommit);
    return this.locked(this.locator(locator).route.toLowerCase(), async () => {
      const before = await this.inspectRef(locator, kind, name, signal);
      if (before.commit !== expectedCommit || before.protected) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Ref changed or is protected; no deletion was attempted.");
      const { selected, token } = await this.hostedCredential(locator, signal);
      await this.request(`${selected.route}/${kind}/${encodeURIComponent(name)}`, token, "DELETE", undefined, signal);
      if (await this.request(`${selected.route}/${kind}/${encodeURIComponent(name)}`, token, "GET", undefined, signal, true) !== null) throw fail("Deleted ref remains visible; inspect before retrying.");
      return { deleted: true as const, name };
    });
  }
  private contentPath(value: string) {
    if (typeof value !== "string" || value.length > 4096 || !value || value.split("/").some(part => !/^[a-zA-Z0-9_ .+-]+$/.test(part) || part === "." || part === ".." || /^\.git$/i.test(part) || /[. ]$/.test(part))) throw new AgentHarnessError("INVALID_INPUT", "Select a contained hosted file path.");
    return value.split("/").map(encodeURIComponent).join("/");
  }
  async inspectFile(locator: HostedRepositoryLocator, filePath: string, ref: string, signal?: AbortSignal): Promise<HostedFile> {
    const encodedPath = this.contentPath(filePath); this.refName(ref);
    const { selected, token } = await this.hostedCredential(locator, signal);
    const raw = await this.request(`${selected.route}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`, token, "GET", undefined, signal, true);
    if (raw === null) return { filePath, ref, sha: null, content: null, exists: false };
    const data = record(raw);
    if (data.path !== filePath || data.type !== "file" || data.encoding !== "base64" || typeof data.content !== "string" || data.content.length > 180000 || !Number.isSafeInteger(data.size) || Number(data.size) > 131072 || Number(data.size) < 0) throw fail("Hosted file identity, type or content is outside its bounds.");
    const encoded = data.content.replace(/\r?\n/g, "");
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw fail("Hosted content encoding is invalid.");
    const bytes = Buffer.from(encoded, "base64"), text = bytes.toString("utf8");
    if (bytes.length !== data.size || bytes.includes(0) || !Buffer.from(text, "utf8").equals(bytes)) throw fail("Hosted contents must be bounded UTF-8 text.");
    return { filePath, ref, sha: this.sha(data.sha), content: this.text(text, 131072, token), exists: true };
  }
  private async mutateFile(locator: HostedRepositoryLocator, input: Omit<HostedFileWrite, "content"> & { content?: string }, deleting: boolean, signal?: AbortSignal) {
    const encodedPath = this.contentPath(input.filePath); this.refName(input.branch);
    if (!input.message || input.message.length > 2000 || input.message.includes("\0") || input.expectedSha !== "absent" && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(input.expectedSha) || deleting && input.expectedSha === "absent" || !deleting && (typeof input.content !== "string" || Buffer.byteLength(input.content) > 131072 || input.content.includes("\0"))) throw new AgentHarnessError("INVALID_INPUT", "Supply a bounded file mutation with an exact expected blob or absent identity.");
    return this.locked(this.locator(locator).route.toLowerCase(), async () => {
      const before = await this.inspectFile(locator, input.filePath, input.branch, signal);
      if ((before.sha ?? "absent") !== input.expectedSha) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Hosted file changed; no mutation was attempted.");
      const { selected, token } = await this.hostedCredential(locator, signal);
      await this.request(`${selected.route}/contents/${encodedPath}`, token, deleting ? "DELETE" : before.exists ? "PUT" : "POST", { branch: input.branch, message: input.message, ...(before.sha ? { sha: before.sha } : {}), ...(!deleting ? { content: Buffer.from(input.content!, "utf8").toString("base64") } : {}) }, signal);
      const after = await this.inspectFile(locator, input.filePath, input.branch, signal);
      if (deleting ? after.exists : !after.exists || after.content !== input.content!.replaceAll(token, "<REDACTED>")) throw fail("Hosted file mutation did not verify; inspect before retrying.");
      return after;
    });
  }
  async writeFile(locator: HostedRepositoryLocator, input: HostedFileWrite, signal?: AbortSignal) { return this.mutateFile(locator, input, false, signal); }
  async deleteFile(locator: HostedRepositoryLocator, input: Omit<HostedFileWrite, "content">, signal?: AbortSignal) { return this.mutateFile(locator, input, true, signal); }
  private projectPull(raw: unknown, number: number | undefined, token: string): HostedPullRequest {
    const data = record(raw), actual = this.pullNumber(Number(data.number));
    if (number !== undefined && number !== actual || !["open", "closed"].includes(String(data.state)) || typeof data.merged !== "boolean") throw fail("Provider returned invalid pull request metadata.");
    const ref = (rawRef: unknown): HostedRef => { const value = record(rawRef); return { name: this.refName(String(value.ref)), commit: this.sha(value.sha), protected: false }; };
    const projected = { number: actual, title: this.text(data.title, 2000, token), body: this.text(data.body ?? "", 65536, token), state: data.state as "open" | "closed", merged: data.merged, head: ref(data.head), base: ref(data.base), mergeCommit: data.merge_commit_sha ? this.sha(data.merge_commit_sha) : null };
    return { ...projected, stateId: digest(projected) };
  }
  async listPullRequests(locator: HostedRepositoryLocator, input: HostedPage & { state?: "open" | "closed" | "all" } = {}, signal?: AbortSignal) {
    const page = this.page(input), state = input.state ?? "open";
    if (!["open", "closed", "all"].includes(state)) throw new AgentHarnessError("INVALID_INPUT", "Select a supported pull request state.");
    const { selected, token } = await this.hostedCredential(locator, signal);
    const rows = this.list(await this.request(`${selected.route}/pulls?${page.query}&state=${state}`, token, "GET", undefined, signal), page.limit);
    return { pullRequests: rows.map(raw => this.projectPull(raw, undefined, token)), nextPage: rows.length === page.limit ? page.page + 1 : null };
  }
  async inspectPullRequest(locator: HostedRepositoryLocator, number: number, signal?: AbortSignal) {
    this.pullNumber(number); const { selected, token } = await this.hostedCredential(locator, signal);
    return this.projectPull(await this.request(`${selected.route}/pulls/${number}`, token, "GET", undefined, signal), number, token);
  }
  async createPullRequest(locator: HostedRepositoryLocator, input: HostedPullCreate, signal?: AbortSignal) {
    this.refName(input.head); this.refName(input.base);
    if (!input.title || input.title.length > 2000 || input.title.includes("\0") || input.body !== undefined && (input.body.length > 65536 || input.body.includes("\0"))) throw new AgentHarnessError("INVALID_INPUT", "Supply bounded pull request text.");
    const { selected, token } = await this.hostedCredential(locator, signal);
    const created = this.projectPull(await this.request(`${selected.route}/pulls`, token, "POST", { title: input.title, body: input.body ?? "", head: input.head, base: input.base }, signal), undefined, token);
    if (created.head.name !== input.head || created.base.name !== input.base) throw fail("Created pull request refs differ; inspect before retrying.");
    return this.inspectPullRequest(locator, created.number, signal);
  }
  async updatePullRequest(locator: HostedRepositoryLocator, number: number, expectedState: string, input: HostedPullUpdate, signal?: AbortSignal) {
    this.pullNumber(number);
    if (!/^[a-f0-9]{64}$/.test(expectedState) || !Object.keys(input).length || Object.keys(input).some(key => !["title", "body", "state", "base"].includes(key)) || input.title !== undefined && (!input.title || input.title.length > 2000 || input.title.includes("\0")) || input.body !== undefined && (input.body.length > 65536 || input.body.includes("\0")) || input.state !== undefined && !["open", "closed"].includes(input.state)) throw new AgentHarnessError("INVALID_INPUT", "Select bounded pull request changes and expected state.");
    if (input.base) this.refName(input.base);
    return this.locked(this.locator(locator).route.toLowerCase(), async () => {
      const before = await this.inspectPullRequest(locator, number, signal);
      if (before.stateId !== expectedState || before.merged) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Pull request changed or was merged; no mutation was attempted.");
      const { selected, token } = await this.hostedCredential(locator, signal);
      await this.request(`${selected.route}/pulls/${number}`, token, "PATCH", { ...input }, signal);
      const after = await this.inspectPullRequest(locator, number, signal);
      if (input.state !== undefined && after.state !== input.state || input.base !== undefined && after.base.name !== input.base || input.title !== undefined && after.title !== input.title.replaceAll(token, "<REDACTED>") || input.body !== undefined && after.body !== input.body.replaceAll(token, "<REDACTED>")) throw fail("Pull request changes did not verify; inspect before retrying.");
      return after;
    });
  }
  async mergePullRequest(locator: HostedRepositoryLocator, number: number, expectedHead: string, method: "merge" | "rebase" | "squash", signal?: AbortSignal) {
    this.sha(expectedHead); this.pullNumber(number);
    if (!["merge", "rebase", "squash"].includes(method)) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded merge method.");
    return this.locked(this.locator(locator).route.toLowerCase(), async () => {
      const before = await this.inspectPullRequest(locator, number, signal);
      if (before.head.commit !== expectedHead || before.state !== "open" || before.merged) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Pull request HEAD changed or is not open; no merge was attempted.");
      const { selected, token } = await this.hostedCredential(locator, signal);
      await this.request(`${selected.route}/pulls/${number}/merge`, token, "POST", { Do: method, head_commit_id: expectedHead, force_merge: false, delete_branch_after_merge: false, merge_when_checks_succeed: false }, signal);
      const after = await this.inspectPullRequest(locator, number, signal);
      if (!after.merged || after.state !== "closed") throw fail("Pull request merge did not verify; inspect before retrying.");
      return after;
    });
  }
  private projectReview(raw: unknown, token: string): HostedReview {
    const data = record(raw), id = this.pullNumber(Number(data.id));
    if (!["PENDING", "APPROVED", "REQUEST_CHANGES", "COMMENT", "DISMISSED"].includes(String(data.state))) throw fail("Provider review state is invalid.");
    return { id, state: String(data.state), body: this.text(data.body ?? "", 65536, token), commit: this.sha(data.commit_id) };
  }
  async listReviews(locator: HostedRepositoryLocator, number: number, input: HostedPage = {}, signal?: AbortSignal) {
    this.pullNumber(number); const page = this.page(input), { selected, token } = await this.hostedCredential(locator, signal);
    const rows = this.list(await this.request(`${selected.route}/pulls/${number}/reviews?${page.query}`, token, "GET", undefined, signal), page.limit);
    return { reviews: rows.map(raw => this.projectReview(raw, token)), nextPage: rows.length === page.limit ? page.page + 1 : null };
  }
  async createReview(locator: HostedRepositoryLocator, number: number, expectedHead: string, event: "APPROVED" | "REQUEST_CHANGES" | "COMMENT", body: string, signal?: AbortSignal) {
    this.sha(expectedHead); this.pullNumber(number);
    if (!["APPROVED", "REQUEST_CHANGES", "COMMENT"].includes(event) || typeof body !== "string" || body.length > 65536 || body.includes("\0")) throw new AgentHarnessError("INVALID_INPUT", "Supply a bounded review event and text.");
    const before = await this.inspectPullRequest(locator, number, signal);
    if (before.head.commit !== expectedHead) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Review target HEAD changed; no review was attempted.");
    const { selected, token } = await this.hostedCredential(locator, signal);
    const review = this.projectReview(await this.request(`${selected.route}/pulls/${number}/reviews`, token, "POST", { event, body, commit_id: expectedHead }, signal), token);
    if (review.commit !== expectedHead || review.state !== event) throw fail("Created review target did not verify; inspect before retrying.");
    return review;
  }

  /** Private application route, absent from normalized hosting contracts and MCP arguments/results. */
  async gitHttpAuthentication(destination: string): Promise<GitHttpAuthentication | null> {
    let identity: ReturnType<typeof remoteDestinationIdentity>;
    try { identity = remoteDestinationIdentity(destination); } catch { return null; }
    const api = new URL(this.cfg.apiBaseUrl);
    if (!["https", ...(this.cfg.allowInsecureGitHttp ? ["http"] : [])].includes(identity.transport) || identity.host !== api.hostname.toLowerCase() || (identity.port ?? (identity.transport === "https" ? 443 : 80)) !== Number(api.port || (api.protocol === "https:" ? 443 : 80))) return null;
    const prefix = api.pathname.slice(0, -7).replace(/^\//, ""), parts = identity.repository?.split("/") ?? [];
    const namespaceIndex = prefix ? prefix.split("/").length : 0;
    if (parts.length !== namespaceIndex + 2 || parts.slice(0, namespaceIndex).join("/") !== prefix || parts[namespaceIndex]?.toLowerCase() !== this.cfg.namespace.toLowerCase()) return null;
    segment(parts[namespaceIndex + 1]);
    const token = await this.credential(), identityUser = await this.authenticate(token);
    this.current();
    return { destination, username: identityUser.login, password: token };
  }
}
