const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");
const { ForgejoHostingAdapter, validateForgejoHostingConfiguration } = require("../../dist/main/externalProviders/forgejoHostingAdapter.js");
const { RepositoryHostingFacade } = require("../../dist/main/externalProviders/repositoryHostingFacade.js");
const { readRepositoryHostingSettings, saveRepositoryHostingSettings } = require("../../dist/main/externalProviders/repositoryHostingSettings.js");
const { registerRepositoryHostingIpc } = require("../../dist/main/externalProviders/repositoryHostingIpc.js");
const { WindowsRepositoryHostingCredentialStore } = require("../../dist/main/externalProviders/repositoryHostingCredentials.js");

const credential = "forgejo-synthetic-fixture-credential";
const git = (root, args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function forgejo(t) {
  const requests = [], repos = new Map(), branches = new Map(), tags = new Map(), files = new Map(), pulls = new Map(), reviews = [];
  let mode = "ready", nextId = 1, advertised = null, gitHandler = null;
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const wire = Buffer.concat(chunks), gitTraffic = !req.url.startsWith("/api/v1/");
    const body = chunks.length && !gitTraffic ? JSON.parse(wire.toString("utf8")) : null;
    requests.push({ method: req.method, route: req.url, body });
    const reply = (status, value) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(value)); };
    if (gitTraffic && gitHandler) return gitHandler(req, res, wire);
    if (req.headers.authorization !== `token ${credential}` || mode === "authentication-failed") return reply(401, { message: credential });
    if (mode === "unreachable") return reply(503, { message: credential });
    if (mode === "oversized") return reply(200, { padding: "a".repeat(262145), message: credential });
    if (mode === "redirect") { res.writeHead(302, { location: "http://127.0.0.1:1/credential-trap" }); res.end(); return; }
    if (req.url === "/api/v1/user") return reply(200, { login: mode === "wrong-identity" ? "another-user" : "fixture-user", hidden_token: credential });
    const url = new URL(req.url, origin);
    if (req.method === "GET" && /^\/api\/v1\/(users|orgs)\/[^/]+\/repos$/.test(url.pathname)) {
      const owner = url.pathname.split("/")[4], page = Number(url.searchParams.get("page")), limit = Number(url.searchParams.get("limit"));
      return reply(200, [...repos.values()].filter(repo => repo.owner.login === owner).slice((page - 1) * limit, page * limit));
    }
    const resource = /^\/api\/v1\/repos\/([^/]+)\/([^/]+)\/(branches|tags|contents|pulls)(?:\/(.*))?$/.exec(url.pathname);
    if (resource) {
      const [, owner, name, kind, suffix] = resource, repository = repos.get(`${owner}/${name}`);
      if (!repository) return reply(404, {});
      const key = `${owner}/${name}`, item = suffix === undefined ? undefined : decodeURIComponent(suffix);
      const sha = value => crypto.createHash("sha1").update(value).digest("hex");
      if (kind === "branches" || kind === "tags") {
        const map = kind === "branches" ? branches : tags;
        if (req.method === "POST") {
          const ref = kind === "branches" ? body.new_branch_name : body.tag_name, commit = kind === "branches" ? body.old_ref_name : body.target;
          const value = { name: ref, commit: kind === "branches" ? { id: commit } : { sha: commit }, protected: false };
          map.set(`${key}/${ref}`, value); return reply(201, value);
        }
        if (!item) return reply(200, [...map.entries()].filter(([id]) => id.startsWith(`${key}/`)).map(([, value]) => value));
        const value = map.get(`${key}/${item}`);
        if (!value) return reply(404, {});
        if (req.method === "DELETE") { map.delete(`${key}/${item}`); res.writeHead(204); return res.end(); }
        return reply(200, value);
      }
      if (kind === "contents") {
        const ref = req.method === "GET" ? url.searchParams.get("ref") : body.branch, id = `${key}/${ref}/${item}`, value = files.get(id);
        if (req.method === "GET") return reply(value ? 200 : 404, value ?? {});
        if ((req.method === "PUT" || req.method === "DELETE") && body.sha !== value?.sha || req.method === "POST" && value) return reply(409, {});
        if (req.method === "DELETE") { files.delete(id); return reply(200, { content: null }); }
        const content = Buffer.from(body.content, "base64"), result = { path: item, type: "file", encoding: "base64", content: body.content, size: content.length, sha: sha(content) };
        files.set(id, result); return reply(200, { content: result });
      }
      if (kind === "pulls") {
        if (!item && req.method === "POST") {
          const number = pulls.size + 1, value = { number, title: body.title, body: body.body, state: "open", merged: false, head: { ref: body.head, sha: branches.get(`${key}/${body.head}`)?.commit.id }, base: { ref: body.base, sha: branches.get(`${key}/${body.base}`)?.commit.id }, merge_commit_sha: null };
          pulls.set(`${key}/${number}`, value); return reply(201, value);
        }
        if (!item) return reply(200, [...pulls.values()]);
        const [number, action] = item.split("/"), value = pulls.get(`${key}/${number}`);
        if (!value) return reply(404, {});
        if (action === "merge") {
          assert.equal(body.head_commit_id, value.head.sha); assert.equal(body.force_merge, false); assert.equal(body.delete_branch_after_merge, false);
          Object.assign(value, { state: "closed", merged: true, merge_commit_sha: sha("merged") }); res.writeHead(204); return res.end();
        }
        if (action === "reviews") {
          if (req.method === "POST") { const result = { id: reviews.length + 1, state: body.event, body: body.body, commit_id: body.commit_id }; reviews.push(result); return reply(200, result); }
          return reply(200, reviews);
        }
        if (req.method === "PATCH") { for (const field of ["title", "body", "state"]) if (body[field] !== undefined) value[field] = body[field]; if (body.base) value.base = { ref: body.base, sha: branches.get(`${key}/${body.base}`)?.commit.id }; }
        return reply(200, value);
      }
    }
    if (req.method === "POST" && (req.url === "/api/v1/user/repos" || /^\/api\/v1\/orgs\/fixture-org\/repos$/.test(req.url))) {
      const owner = req.url.includes("/orgs/") ? "fixture-org" : "fixture-user";
      assert.equal(body.auto_init, false); assert.equal(body.gitignores, undefined); assert.equal(body.license, undefined);
      const value = { id: nextId++, owner: { login: owner }, name: body.name, full_name: `${owner}/${body.name}`, private: body.private,
        description: body.description, default_branch: "main", empty: true, archived: false, fork: false, mirror: false, updated_at: "2026-01-01T00:00:00Z",
        ssh_url: `git@127.0.0.1:${owner}/${body.name}.git`, clone_url: `${origin}/${owner}/${body.name}.git`, hidden_token: credential };
      repos.set(`${owner}/${body.name}`, value); return reply(201, value);
    }
    const match = /^\/api\/v1\/repos\/([^/]+)\/([^/]+)$/.exec(req.url);
    if (match) {
      const key = `${match[1]}/${match[2]}`, value = repos.get(key);
      if (!value) return reply(404, { message: credential });
      if (req.method === "PATCH") { Object.assign(value, body); value.updated_at = "2026-01-02T00:00:00Z"; }
      return reply(200, { ...value, ...(advertised ? { ssh_url: advertised } : {}) });
    }
    reply(404, { message: credential });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const input = { providerId: "forgejo-fixture", kind: "forgejo", apiBaseUrl: `${origin}/api/v1`, namespace: "fixture-user", namespaceType: "user", preferredTransport: "ssh", allowInsecureHttp: true, allowInsecureGitHttp: false };
  const configuration = validateForgejoHostingConfiguration(input);
  const adapter = changes => new ForgejoHostingAdapter({ configuration: validateForgejoHostingConfiguration({ ...input, ...changes }), resolveCredential: async () => credential });
  return { input, configuration, adapter, origin, requests, repos, branches, tags, files, pulls, mode: value => { mode = value; }, advertise: value => { advertised = value; }, gitHandler: value => { gitHandler = value; } };
}

test("Forgejo API authenticates exact namespaces, bounds responses and never projects provider secrets", async t => {
  const f = await forgejo(t), adapter = f.adapter();
  const status = await adapter.providerStatus();
  assert.equal(status.readiness, "ready"); assert.deepEqual(status.identity, { login: "fixture-user" });
  assert.equal(status.settingsConcurrency, "application-expected-state"); assert.equal(JSON.stringify(status).includes(credential), false);
  assert.equal(status.capabilityEvidence, "adapter-contract"); assert.equal(status.mutationConcurrency.file, "server-blob-sha"); assert.equal(status.mutationConcurrency.ref, "application-expected-state");
  const unauthenticated = new ForgejoHostingAdapter({ configuration: f.configuration, resolveCredential: async () => null });
  assert.equal((await unauthenticated.providerStatus()).readiness, "authentication-required");
  f.mode("authentication-failed"); assert.equal((await adapter.providerStatus()).readiness, "authentication-failed");
  await assert.rejects(adapter.inspectRepository({ repository: "missing" }), error => !error.message.includes(credential));
  f.mode("wrong-identity"); assert.equal((await adapter.providerStatus()).readiness, "authentication-failed");
  for (const mode of ["unreachable", "oversized", "redirect"]) { f.mode(mode); assert.equal((await adapter.providerStatus()).readiness, "unreachable"); }
  f.mode("ready");
  assert.throws(() => validateForgejoHostingConfiguration({ ...f.input, allowInsecureHttp: false }));
  assert.throws(() => validateForgejoHostingConfiguration({ ...f.input, apiBaseUrl: "https://user:secret@example.invalid/api/v1" }));
  assert.throws(() => validateForgejoHostingConfiguration({ ...f.input, token: credential }));
  const elsewhere = validateForgejoHostingConfiguration({ ...f.input, apiBaseUrl: "https://another.example.invalid/api/v1" });
  assert.notEqual(elsewhere.credentialReference, f.configuration.credentialReference);
  assert.throws(() => validateForgejoHostingConfiguration({ ...elsewhere, credentialReference: f.configuration.credentialReference }));
  assert.equal((await new RepositoryHostingFacade({ configurations: () => [], resolveCredential: async () => { throw Error("must not resolve"); } }).providerStatus("not-configured")).readiness, "not-configured");
});

test("Forgejo creates empty user and organization repositories idempotently and guards settings state", async t => {
  const f = await forgejo(t);
  for (const namespaceType of ["user", "organization"]) {
    const namespace = namespaceType === "user" ? "fixture-user" : "fixture-org", adapter = f.adapter({ namespaceType, namespace });
    const request = { repository: `empty-${namespaceType}`, visibility: "private", description: "bounded fixture", initialize: false };
    const [created, repeated] = await Promise.all([adapter.createRepository(request), adapter.createRepository(request)]);
    assert.equal(created.created, true); assert.equal(repeated.created, false); assert.equal(created.empty, true);
    assert.equal(created.repositoryId, repeated.repositoryId); assert.equal(created.owner, namespace);
    assert.equal(f.requests.filter(item => item.method === "POST" && item.body.name === request.repository).length, 1);
    await assert.rejects(adapter.createRepository({ ...request, visibility: "public" }), { code: "REPOSITORY_PROVIDER_STATE_CHANGED" });
    const settings = await adapter.updateRepositorySettings({ repository: request.repository }, created.state, { visibility: "public", description: "updated" });
    assert.equal(settings.visibility, "public"); assert.equal(settings.description, "updated"); assert.notEqual(settings.state, created.state);
    const before = f.requests.filter(item => item.method === "PATCH").length;
    await assert.rejects(adapter.updateRepositorySettings({ repository: request.repository }, created.state, { visibility: "private" }), { code: "REPOSITORY_PROVIDER_STATE_CHANGED" });
    assert.equal(f.requests.filter(item => item.method === "PATCH").length, before);
    const competing = await Promise.allSettled([
      adapter.updateRepositorySettings({ repository: request.repository }, settings.state, { description: "first writer" }),
      adapter.updateRepositorySettings({ repository: request.repository }, settings.state, { description: "second writer" }),
    ]);
    assert.equal(competing[0].status, "fulfilled"); assert.equal(competing[1].status, "rejected"); assert.equal(competing[1].reason.code, "REPOSITORY_PROVIDER_STATE_CHANGED");
    const cleared = await adapter.updateRepositorySettings({ repository: request.repository }, competing[0].value.state, { description: "" });
    assert.equal(cleared.description, "");
    await assert.rejects(adapter.inspectRepository({ owner: "unrelated", repository: request.repository }));
    await assert.rejects(adapter.createRepository({ ...request, initialize: true }));
  }
});

test("Forgejo provider-owned Git destinations bind exact host, namespace, repository and metadata identity", async t => {
  const f = await forgejo(t), adapter = f.adapter();
  const created = await adapter.createRepository({ repository: "source", visibility: "private", initialize: false });
  const remote = await adapter.resolveGitRemote({ repository: "source" });
  assert.equal(remote.identity.host, "127.0.0.1"); assert.equal(remote.identity.repository, "fixture-user/source");
  assert.equal(remote.hostedRepositoryId, created.repositoryId); assert.equal(remote.hostedRepositoryState, created.state);
  for (const destination of ["git@unrelated.example.invalid:fixture-user/source.git", "git@127.0.0.1:unrelated/source.git", "ssh://git@127.0.0.1:2222/fixture-user/source.git", "https://user:synthetic-secret@127.0.0.1/fixture-user/source.git"]) {
    f.advertise(destination); await assert.rejects(adapter.resolveGitRemote({ repository: "source" }));
  }
  f.advertise(null);
  await assert.rejects(adapter.resolveGitRemote({ repository: "source" }, "https"));
  const httpRemote = await f.adapter({ allowInsecureGitHttp: true }).resolveGitRemote({ repository: "source" }, "https");
  assert.equal(httpRemote.identity.transport, "http");
  const { createProviderOwnedRemote, remoteDestinationIdentity } = require("../../dist/main/repository/providerOwnedRemote.js");
  assert.equal(remoteDestinationIdentity("https://forge.example.invalid/fixture-user/source.git").transport, "https");
  assert.equal(remoteDestinationIdentity("ssh://git@forge.example.invalid/fixture-user/source.git").transport, "ssh");
  for (const prefix of ["", "/forge"]) {
    const origin = "https://forge.example.invalid", base = `${origin}${prefix}/fixture-user/source`;
    let advertisedHttp = `${base}.git`;
    const configured = validateForgejoHostingConfiguration({ ...f.input, apiBaseUrl: `${origin}${prefix}/api/v1`, preferredTransport: "https", allowInsecureHttp: false });
    const provider = new ForgejoHostingAdapter({ configuration: configured, resolveCredential: async () => credential,
      fetch: async (url, options) => {
        assert.equal(options.headers.Authorization, `token ${credential}`);
        if (!url.endsWith("/user") && !url.endsWith("/repos/fixture-user/source")) return new Response("{}", { status: 404 });
        const data = url.endsWith("/user") ? { login: "fixture-user" } : { ...f.repos.get("fixture-user/source"), clone_url: advertisedHttp };
        return new Response(JSON.stringify(data), { status: 200 });
      } });
    const canonical = await provider.resolveGitRemote({ repository: "source" });
    for (const value of [`${base}.git`, base, `${base}.git/`, `${base}/`, `${base}.git`.replace("https://", "HTTPS://").replace("forge.example.invalid", "FORGE.EXAMPLE.INVALID:443"), `${base}.git`.replace("https://", "https://fixture-user@")]) {
      advertisedHttp = value;
      const resolved = await provider.resolveGitRemote({ repository: "source" });
      assert.equal(resolved.destination, `${base}.git`); assert.deepEqual(resolved.identity, canonical.identity);
      const auth = await provider.gitHttpAuthentication(value);
      assert.equal(auth.username, "fixture-user"); assert.equal(new URL(auth.destination).username, "");
      assert.equal(JSON.stringify(resolved).includes(credential), false);
    }
    const rejected = [
      [`${base}.git`.replace("https://", "https://fixture-user:secret@"), "unsupported-userinfo"],
      [`${base}.git`.replace("https://", `https://${credential}@`), "unsupported-userinfo"],
      [`${base}.git`.replace("https://", "https://unrelated@"), "unsupported-userinfo"],
      [`${base}.git?token=secret`, "query-or-fragment"], [`${base}.git#secret`, "query-or-fragment"],
      [`${base}.git`.replace("forge.example.invalid", "other.example.invalid"), "unexpected-host"],
      [`${base}.git`.replace("forge.example.invalid", "forge.example.invalid:444"), "unexpected-port"],
      [`${base}.git`.replace("fixture-user", "other"), "unexpected-repository-path"],
      [`${base}-other.git`, "unexpected-repository-path"],
      [`${base}.git`.replace("/source", "/%2fsource"), "unsafe-path-encoding"],
      [`${base}.git`.replace("/source", "/%5csource"), "unsafe-path-encoding"],
      [`${base}.git`.replace("/source", "/../fixture-user/source"), "unsafe-path-encoding"],
      [`${base}.git`.replace("/source", "/%2e%2e/fixture-user/source"), "unsafe-path-encoding"],
      [`${base}.git`.replace("/source", "//source"), "unsafe-path-encoding"],
      ["ext::git something", "unsafe-path-encoding"], ["helper::destination", "unsupported-transport"],
      [`${base}.git`.replace("https:", "http:"), "unsupported-transport"],
    ];
    for (const [value, reason] of rejected) {
      advertisedHttp = value;
      await assert.rejects(provider.resolveGitRemote({ repository: "source" }), error => error.details?.transportReason === reason && !error.message.includes(value));
      assert.equal(await provider.gitHttpAuthentication(value), null);
    }
    for (const value of [`${base}.git`.replace("https://", "https://fixture-user@"), `${base}.git/`]) assert.throws(() => createProviderOwnedRemote({ providerId: "fixture", destination: value }));
  }
  const raw = f.repos.get("fixture-user/source"); raw.description = `provider echoed ${credential}`;
  assert.equal(JSON.stringify(await adapter.inspectRepository({ repository: "source" })).includes(credential), false);
  let current = true;
  const guarded = new ForgejoHostingAdapter({ configuration: f.configuration, resolveCredential: async () => { current = false; return credential; }, configurationStillCurrent: () => current });
  const writes = f.requests.filter(item => item.method !== "GET").length;
  await assert.rejects(guarded.createRepository({ repository: "must-not-create", visibility: "private", initialize: false }), { code: "REPOSITORY_PROVIDER_STATE_CHANGED" });
  assert.equal(f.requests.filter(item => item.method !== "GET").length, writes);
});

test("Forgejo global MCP publishes paged refs, file CAS, PR lifecycle and reviews without workspace registration", async t => {
  const f = await forgejo(t), adapter = f.adapter(), locator = { repository: "operations" };
  const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
  const registry = createAgentHarnessToolRegistry({ userDataRoot: os.tmpdir(), repositoryHosting: new RepositoryHostingFacade({ configurations: () => [], resolveCredential: async () => null, adapters: [adapter] }), workspaceAccess: {
    resolveWorkspaceContext: () => { throw Error("must not resolve a Project"); }, listWorkspaceSummaries: () => [], listRepositoryCheckoutSummaries: () => [],
  } });
  const providerId = f.configuration.providerId;
  const invoke = (action, params = {}, scope = "files.read files.write") => registry.callTool({ name: "integration_toolbox", scope, arguments: { action, params: { providerId, ...locator, ...params } } });
  const success = async (action, params) => { const result = await invoke(action, params); assert.equal(result.ok, true, JSON.stringify(result.error)); assert.equal(JSON.stringify(result).includes(credential), false); return result.payload; };
  await success("create_hosted_repository", { visibility: "private" });
  const listed = await registry.callTool({ name: "integration_toolbox", scope: "files.read", arguments: { action: "list_hosted_repositories", params: { providerId, limit: 1 } } });
  assert.equal(listed.ok, true, JSON.stringify(listed.error)); assert.equal(listed.payload.repositories.length, 1); assert.equal(listed.payload.nextPage, 2);
  const base = "a".repeat(40), head = "b".repeat(40);
  await success("create_hosted_branch", { name: "main", sourceCommit: base });
  await success("create_hosted_branch", { name: "feature/one", sourceCommit: head });
  assert.equal((await success("inspect_hosted_branch", { name: "feature/one" })).commit, head);
  assert.equal((await success("list_hosted_branches")).refs.length, 2);
  await success("create_hosted_tag", { name: "v1.0.0", sourceCommit: base });
  assert.equal((await success("list_hosted_tags")).refs[0].name, "v1.0.0");
  assert.equal((await success("inspect_hosted_tag", { name: "v1.0.0" })).commit, base);
  const writesBefore = () => f.requests.filter(request => request.method !== "GET").length;
  let before = writesBefore();
  assert.equal((await invoke("delete_hosted_tag", { name: "v1.0.0", expectedCommit: head })).ok, false); assert.equal(writesBefore(), before);
  await success("delete_hosted_tag", { name: "v1.0.0", expectedCommit: base });
  const absent = await success("inspect_hosted_file", { filePath: "src/read me.txt", ref: "main" }); assert.equal(absent.exists, false);
  const written = await success("write_hosted_file_cas", { filePath: absent.filePath, branch: "main", expectedSha: "absent", content: "first\n", message: "add" });
  before = writesBefore();
  assert.equal((await invoke("write_hosted_file_cas", { filePath: absent.filePath, branch: "main", expectedSha: "absent", content: "stale\n", message: "stale" })).ok, false); assert.equal(writesBefore(), before);
  const updated = await success("write_hosted_file_cas", { filePath: absent.filePath, branch: "main", expectedSha: written.sha, content: "second\n", message: "update" }); assert.notEqual(updated.sha, written.sha);
  assert.equal((await success("delete_hosted_file_cas", { filePath: absent.filePath, branch: "main", expectedSha: updated.sha, message: "delete" })).exists, false);
  const pr = await success("create_pull_request", { title: "bounded change", body: "review this", head: "feature/one", base: "main" });
  assert.equal((await success("list_pull_requests")).pullRequests.length, 1);
  assert.equal((await success("inspect_pull_request", { pullNumber: pr.number })).head.commit, head);
  const edited = await success("update_pull_request", { pullNumber: pr.number, expectedState: pr.stateId, title: "edited", body: "" });
  before = writesBefore();
  assert.equal((await invoke("update_pull_request", { pullNumber: pr.number, expectedState: pr.stateId, title: "stale" })).ok, false); assert.equal(writesBefore(), before);
  const closed = await success("update_pull_request", { pullNumber: pr.number, expectedState: edited.stateId, state: "closed" });
  await success("update_pull_request", { pullNumber: pr.number, expectedState: closed.stateId, state: "open" });
  assert.equal((await success("create_pull_request_review", { pullNumber: pr.number, expectedHead: head, event: "APPROVED", body: "reviewed" })).commit, head);
  assert.equal((await success("list_pull_request_reviews", { pullNumber: pr.number })).reviews.length, 1);
  before = writesBefore();
  assert.equal((await invoke("merge_pull_request", { pullNumber: pr.number, expectedHead: base, method: "merge" })).ok, false); assert.equal(writesBefore(), before);
  assert.equal((await success("merge_pull_request", { pullNumber: pr.number, expectedHead: head, method: "squash" })).merged, true);
  await success("delete_hosted_branch", { name: "feature/one", expectedCommit: head });
  for (const [action, params] of [["inspect_hosted_file", { filePath: "../escape", ref: "main" }], ["create_hosted_branch", { name: "-unsafe", sourceCommit: head }], ["inspect_pull_request", { pullNumber: 0 }], ["list_hosted_branches", { limit: 51 }], ["create_pull_request", { title: "bad", head: "feature", base: "main", token: credential }]]) assert.equal((await invoke(action, params)).ok, false);
  assert.equal((await invoke("create_hosted_branch", { name: "scope-denied", sourceCommit: head }, "files.read")).error.code, "OAUTH_SCOPE_DENIED");
  f.mode("authentication-failed"); assert.equal((await invoke("inspect_hosted_branch", { name: "main" })).ok, false);
});

test("application hosting settings persist metadata with CAS while credentials remain in the bounded secret store", async t => {
  const f = await forgejo(t), root = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-hosting-settings-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const handlers = new Map(), secrets = new Map(), credentialCalls = [];
  const store = { get: async reference => secrets.get(reference) ?? null, set: async (reference, token) => { secrets.set(reference, token); credentialCalls.push(reference); }, remove: async reference => { secrets.delete(reference); } };
  registerRepositoryHostingIpc({ handle: (name, handler) => handlers.set(name, handler) }, () => root, store);
  const call = async (name, input) => {
    const result = await handlers.get(`repositoryHosting:${name}`)(null, input);
    if (!result.ok) throw Object.assign(new Error("Bounded Settings failure"), { settingsCode: result.error.code });
    return result.value;
  };
  const initial = await call("settings");
  const saved = await call("saveSettings", { configurationId: initial.configurationId, providers: [{ ...f.input, providerId: `  ${f.input.providerId.toUpperCase()}  ` }] });
  assert.equal(saved.providers[0].providerId, f.input.providerId);
  for (const [changes, settingsCode] of [[{ providerId: "bad id" }, "invalid-provider-id"], [{ apiBaseUrl: "https://example.invalid" }, "invalid-api-url"], [{ allowInsecureHttp: false }, "http-api-policy"], [{ namespace: "bad/name" }, "invalid-namespace"]]) {
    const result = await handlers.get("repositoryHosting:saveSettings")(null, { configurationId: saved.configurationId, providers: [{ ...f.input, ...changes }] });
    assert.deepEqual(result, { ok: false, error: { code: settingsCode } });
    assert.equal(JSON.stringify(result).includes(credential), false);
  }
  assert.notEqual(saved.configurationId, initial.configurationId);
  assert.deepEqual(readRepositoryHostingSettings(root), saved);
  assert.throws(() => saveRepositoryHostingSettings(root, { configurationId: initial.configurationId, providers: [] }), { code: "REPOSITORY_PROVIDER_STATE_CHANGED" });
  assert.equal((await call("providerStatus", f.input.providerId)).readiness, "authentication-required");
  await call("saveCredential", { providerId: f.input.providerId, expectedConfigurationId: saved.configurationId, token: credential });
  assert.equal((await call("providerStatus", f.input.providerId)).readiness, "ready");
  const identity = await call("providerStatus", f.input.providerId); assert.equal(identity.identity.login, "fixture-user");
  f.mode("authentication-failed"); const rejected = await call("providerStatus", f.input.providerId); assert.equal(rejected.readiness, "authentication-failed"); assert.match(rejected.diagnostic, /Authentication failed/); assert.equal(JSON.stringify(rejected).includes(credential), false);
  f.mode("wrong-identity"); assert.match((await call("providerStatus", f.input.providerId)).diagnostic, /configured namespace/); f.mode("ready");
  await assert.rejects(call("saveCredential", { providerId: f.input.providerId, expectedConfigurationId: saved.configurationId, token: "" }), { settingsCode: "invalid-token" });
  const persisted = fs.readFileSync(path.join(root, "repository-hosting", "providers.json"), "utf8");
  assert.equal(persisted.includes(credential), false); assert.equal(JSON.stringify(await call("settings")).includes(credential), false);
  assert.equal(credentialCalls[0], saved.providers[0].credentialReference);
  await assert.rejects(call("saveCredential", { providerId: f.input.providerId, expectedConfigurationId: initial.configurationId, token: credential }), { settingsCode: "stale-configuration" });
  await assert.rejects(call("saveCredential", { providerId: f.input.providerId, expectedConfigurationId: saved.configurationId, token: credential, reference: "unrelated-credential" }));
  const changed = await call("saveSettings", { configurationId: saved.configurationId, providers: [{ ...f.input, apiBaseUrl: "https://other.example.invalid/api/v1", allowInsecureHttp: false }] });
  assert.notEqual(changed.providers[0].credentialReference, saved.providers[0].credentialReference);
  assert.equal((await call("providerStatus", f.input.providerId)).readiness, "authentication-required");
  assert.equal(fs.existsSync(path.join(root, ".champcity")), false);
});

test("bounded Windows credential bridge compiles and reads only an absent synthetic fixture reference", { skip: process.platform !== "win32", timeout: 30000 }, async () => {
  const store = new WindowsRepositoryHostingCredentialStore();
  const reference = `repository-hosting:fixture-${crypto.randomBytes(8).toString("hex")}:${crypto.randomBytes(32).toString("hex")}`;
  assert.equal(await store.get(reference), null);
  await assert.rejects(store.get("arbitrary-os-secret"), { code: "REPOSITORY_PROVIDER_NOT_READY" });
  await assert.rejects(store.set(reference, "invalid\nvalue"), { code: "REPOSITORY_PROVIDER_NOT_READY" });
});

test("private HTTP Git authentication stays scoped to the configured destination and outside arguments, config and results", { timeout: 360000 }, async t => {
  const f = await forgejo(t), trusted = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-private-git-"));
  t.after(() => fs.rmSync(trusted, { recursive: true, force: true }));
  const hostedRoot = path.join(trusted, "hosted"), namespace = path.join(hostedRoot, "fixture-user"); fs.mkdirSync(namespace, { recursive: true });
  const bare = path.join(namespace, "private.git"); git(trusted, ["init", "--bare", "--initial-branch=dev", bare]); git(bare, ["config", "http.receivepack", "true"]);
  let authenticatedRequests = 0, redirect = false;
  let delayNextGitRequest = 0, requestObserved;
  const encoded = Buffer.from(`fixture-user:${credential}`).toString("base64");
  const childProcess = require("node:child_process"), originalSpawn = childProcess.spawn;
  let authenticatedSpawns = 0;
  childProcess.spawn = (command, args, options) => {
    if (command === "git" && options?.env?.GIT_CONFIG_KEY_2) {
      authenticatedSpawns++;
      assert.equal(JSON.stringify(args).includes(credential), false);
      assert.equal(JSON.stringify(args).includes(encoded), false);
      assert.match(options.env.GIT_CONFIG_KEY_2, /^http\.http:\/\/127\.0\.0\.1:\d+\/fixture-user\/private\.git\/?\.extraHeader$/);
      assert.equal(options.env.GIT_CONFIG_VALUE_3, "false");
    }
    return originalSpawn(command, args, options);
  };
  t.after(() => { childProcess.spawn = originalSpawn; });
  f.gitHandler(async (req, res, body) => {
    if (redirect) { res.writeHead(302, { location: "http://127.0.0.1:1/credential-trap" }); res.end(); return; }
    if (req.headers.authorization !== `Basic ${encoded}`) { res.writeHead(401, { "www-authenticate": 'Basic realm="synthetic fixture"' }); res.end(); return; }
    authenticatedRequests++;
    if (delayNextGitRequest) {
      const delay = delayNextGitRequest; delayNextGitRequest = 0;
      requestObserved?.(); requestObserved = undefined;
      await new Promise(resolve => {
        const timer = setTimeout(resolve, delay);
        res.once("close", () => { clearTimeout(timer); resolve(); });
      });
      if (res.destroyed) return;
    }
    const uri = new URL(req.url, f.origin);
    await new Promise((resolve, reject) => {
      const child = spawn("git", ["http-backend"], { cwd: hostedRoot, windowsHide: true, shell: false, stdio: ["pipe", "pipe", "pipe"], env: {
        ...process.env, GIT_PROJECT_ROOT: hostedRoot, GIT_HTTP_EXPORT_ALL: "1", PATH_INFO: uri.pathname, QUERY_STRING: uri.search.slice(1),
        REQUEST_METHOD: req.method, CONTENT_TYPE: req.headers["content-type"] ?? "", CONTENT_LENGTH: String(body.length), REMOTE_USER: "fixture-user",
      } });
      const output = [], errors = []; child.stdout.on("data", chunk => output.push(chunk)); child.stderr.on("data", chunk => errors.push(chunk));
      child.on("error", reject); child.on("close", code => {
        if (code !== 0) { res.writeHead(500); res.end("bounded Git fixture failed"); reject(Error("Git HTTP fixture failed")); return; }
        const bytes = Buffer.concat(output), separator = bytes.indexOf("\r\n\r\n");
        if (separator < 0) { res.writeHead(500); res.end(); reject(Error("Git CGI header missing")); return; }
        let status = 200; const headers = {};
        for (const line of bytes.subarray(0, separator).toString("utf8").split("\r\n")) {
          const colon = line.indexOf(":"); if (colon < 0) continue;
          if (line.slice(0, colon).toLowerCase() === "status") status = Number(line.slice(colon + 1).trim().split(" ")[0]);
          else headers[line.slice(0, colon)] = line.slice(colon + 1).trim();
        }
        res.writeHead(status, headers); res.end(bytes.subarray(separator + 4)); resolve();
      }); child.stdin.on("error", () => undefined); child.stdin.end(body);
    });
  });
  const configuration = validateForgejoHostingConfiguration({ ...f.input, preferredTransport: "https", allowInsecureGitHttp: true });
  const hosting = new RepositoryHostingFacade({ configurations: () => [configuration], resolveCredential: async () => credential });
  const provider = hosting.adapter(configuration.providerId);
  await provider.createRepository({ repository: "private", visibility: "private", initialize: false });
  f.repos.get("fixture-user/private").default_branch = "dev";
  const { withGitHttpAuthentication, runBoundedGit, GIT_EXECUTION_BUDGETS } = require("../../dist/main/core/gitExecution.js");
  const { LocalGitRepositoryAccessService } = require("../../dist/main/agentHarness/workspace/localGitRepositoryAccessService.js");
  const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
  const { createRegisteredWorkspaceAccessProvider } = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
  const localGitAccess = new LocalGitRepositoryAccessService(() => [trusted]), session = Object.freeze({});
  const registry = createAgentHarnessToolRegistry({ userDataRoot: path.join(trusted, "harness"), localGitAccess, repositoryHosting: hosting,
    workspaceAccess: createRegisteredWorkspaceAccessProvider({ resolveWorkspaceContext: () => { throw Error("no workflow registration"); }, listWorkspaceSummaries: () => [] }) });
  const call = async (name, action, params, error, signal) => {
    const result = await registry.callTool({ name, session, signal, scope: "files.read files.write", arguments: { action, params } });
    assert.equal(result.ok, !error, JSON.stringify(result)); if (error) assert.equal(result.error.code, error);
    assert.equal(JSON.stringify(result).includes(credential), false); assert.equal(JSON.stringify(result).includes(encoded), false);
    return result;
  };
  // Extend this existing authenticated smart-HTTP owner with actual >15s transfers.
  const delayedCall = async (name, action, params, executionClass) => {
    delayNextGitRequest = 16000;
    const started = Date.now(), result = await call(name, action, params), duration = Date.now() - started;
    assert.equal(delayNextGitRequest, 0, "operation must contact the delayed authenticated server");
    assert.ok(duration > 15000 && duration < GIT_EXECUTION_BUDGETS[executionClass]);
    t.diagnostic(`${action} delayed authenticated fixture completed in ${duration} ms (${executionClass})`);
    return result;
  };
  for (const tool of registry.listTools().filter(tool => ["git_toolbox", "integration_toolbox"].includes(tool.name))) {
    assert.doesNotMatch(JSON.stringify(tool.inputSchema), /"(?:timeoutMs|executionClass|deadline|processDeadline)"/);
  }
  const source = path.join(trusted, "source"); fs.mkdirSync(source); fs.writeFileSync(path.join(source, "source.txt"), "private source\n");
  const initialized = (await call("git_toolbox", "init_local_repository", { directory: source, initialBranch: "dev" })).payload;
  await call("git_toolbox", "select_repository_context", { repositoryHandle: initialized.repositoryHandle });
  git(source, ["config", "user.name", "Private Transport Fixture"]); git(source, ["config", "user.email", "fixture@example.invalid"]);
  const target = { providerId: configuration.providerId, repository: "private", remoteName: "forgejo", localCheckoutHandle: initialized.localCheckoutHandle };
  await call("integration_toolbox", "bind_repository_remote", target);
  await call("git_toolbox", "stage_changes", { localCheckoutHandle: initialized.localCheckoutHandle, paths: ["source.txt"] });
  const commit = (await call("git_toolbox", "commit", { localCheckoutHandle: initialized.localCheckoutHandle, message: "private transport fixture" })).payload.commit;
  await delayedCall("git_toolbox", "push", { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo", branch: "dev", remoteBranch: "dev", expectedCommit: commit }, "network-write");
  f.repos.get("fixture-user/private").empty = false;
  await call("integration_toolbox", "verify_hosted_repository", { ...target, expectedRefs: [`refs/heads/dev=${commit}`] });
  const canonicalUrl = `${f.origin}/fixture-user/private.git`;
  const legacyUrl = `${canonicalUrl}/`.replace("http://", "http://fixture-user@");
  git(source, ["remote", "set-url", "forgejo", legacyUrl]);
  git(source, ["config", "remote.forgejo.custom", "preserved"]);
  const inspectParams = { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo" };
  const legacy = (await call("git_toolbox", "inspect_remote", inspectParams)).payload;
  assert.equal(legacy.fetchDestinations[0].repository, "fixture-user/private");
  assert.equal(legacy.fetchDestinations[0].identity, (await provider.resolveGitRemote({ repository: "private" })).identity.identity);
  assert.equal(JSON.stringify(legacy).includes(legacyUrl), false);
  assert.equal((await call("git_toolbox", "inspect_remote", inspectParams)).payload.binding, legacy.binding);
  assert.equal(git(source, ["config", "remote.forgejo.url"]), legacyUrl);
  await delayedCall("git_toolbox", "inspect_remote_refs", inspectParams, "network-read");
  await delayedCall("git_toolbox", "fetch_remote", inspectParams, "network-read");
  await call("git_toolbox", "push", { ...inspectParams, branch: "dev", remoteBranch: "dev", expectedCommit: commit });
  await call("git_toolbox", "create_tag", { localCheckoutHandle: initialized.localCheckoutHandle, tagName: "legacy-auth", tagType: "lightweight", target: commit });
  await delayedCall("git_toolbox", "push_tag", { ...inspectParams, tagName: "legacy-auth" }, "network-write");
  await call("integration_toolbox", "bind_repository_remote", { ...target, expectedCurrentBinding: "0".repeat(64) }, "GIT_EXECUTION_FAILED");
  assert.equal(git(source, ["config", "remote.forgejo.url"]), legacyUrl);
  await call("integration_toolbox", "bind_repository_remote", { ...target, expectedCurrentBinding: legacy.binding });
  assert.equal(git(source, ["config", "remote.forgejo.url"]), canonicalUrl);
  assert.equal(git(source, ["config", "remote.forgejo.custom"]), "preserved");
  const replaced = (await call("git_toolbox", "inspect_remote", inspectParams)).payload;
  assert.notEqual(replaced.binding, legacy.binding); assert.equal(replaced.fetchDestinations[0].identity, legacy.fetchDestinations[0].identity);
  for (const bad of [`${canonicalUrl}?token=secret`, canonicalUrl.replace("http://", "http://fixture-user:secret@"), canonicalUrl.replace("http://", "http://unrelated@"), "ext::git something"]) {
    git(source, ["remote", "set-url", "forgejo", bad]); await call("git_toolbox", "inspect_remote", inspectParams, "INVALID_INPUT");
  }
  git(source, ["remote", "set-url", "forgejo", canonicalUrl]);
  git(source, ["config", "--add", "remote.forgejo.url", canonicalUrl]);
  await call("git_toolbox", "inspect_remote", inspectParams, "GIT_EXECUTION_FAILED");
  git(source, ["config", "--unset-all", "remote.forgejo.url"]); git(source, ["config", "remote.forgejo.url", canonicalUrl]);
  git(source, ["config", `url.${f.origin}/rewritten/.insteadOf`, `${f.origin}/fixture-user/`]);
  await call("git_toolbox", "inspect_remote", inspectParams, "GIT_EXECUTION_FAILED");
  await assert.rejects(hosting.gitHttpAuthentication(source, ["ls-remote", "--", "forgejo"]), { code: "REPOSITORY_PROVIDER_NOT_READY" });
  git(source, ["config", "--remove-section", `url.${f.origin}/rewritten/`]);
  const prune = (await call("git_toolbox", "inspect_prune", { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo" })).payload;
  await call("git_toolbox", "prune_remote", { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo", expectedBinding: prune.binding, expectedTrackingState: "0".repeat(64) }, "GIT_EXECUTION_FAILED");
  await call("git_toolbox", "prune_remote", { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo", expectedBinding: prune.binding, expectedTrackingState: prune.trackingState });
  f.repos.get("fixture-user/private").clone_url = legacyUrl;
  assert.equal((await call("integration_toolbox", "provider_status", { providerId: configuration.providerId })).payload.readiness, "ready");
  await call("integration_toolbox", "inspect_hosted_repository", { providerId: configuration.providerId, repository: "private" });
  const cloned = (await delayedCall("integration_toolbox", "clone_hosted_repository", { providerId: configuration.providerId, repository: "private", destinationDirectory: path.join(trusted, "cloned"), branch: "dev" }, "network-clone")).payload;
  assert.equal(cloned.headCommit, commit); assert.ok(authenticatedRequests >= 4); assert.ok(authenticatedSpawns >= 3);
  assert.equal(git(path.join(trusted, "cloned"), ["config", "remote.origin.url"]), canonicalUrl);
  assert.equal(git(path.join(trusted, "cloned"), ["branch", "--show-current"]), "dev");
  f.mode("authentication-failed");
  await call("integration_toolbox", "clone_hosted_repository", { providerId: configuration.providerId, repository: "private", destinationDirectory: path.join(trusted, "failed"), branch: "dev" }, "REPOSITORY_PROVIDER_NOT_READY");
  assert.equal(fs.existsSync(path.join(trusted, "failed")), false); f.mode("ready");
  for (const root of [source, path.join(trusted, "cloned")]) {
    const config = fs.readFileSync(path.join(root, ".git", "config"), "utf8"); assert.equal(config.includes(credential), false); assert.equal(config.includes(encoded), false);
  }
  assert.equal(await hosting.gitHttpAuthentication(source, ["clone", "--", "http://unrelated.example.invalid/fixture-user/private.git", "unused"]), null);
  const duplicateConfiguration = validateForgejoHostingConfiguration({ ...f.input, providerId: "forgejo-duplicate", preferredTransport: "https", allowInsecureGitHttp: true });
  const ambiguous = new RepositoryHostingFacade({ configurations: () => [configuration, duplicateConfiguration], resolveCredential: async () => credential });
  await assert.rejects(ambiguous.gitHttpAuthentication(source, ["ls-remote", "--", "forgejo"]), { code: "REPOSITORY_PROVIDER_NOT_READY" });
  const args = ["ls-remote", "--", "forgejo"]; assert.equal(args.join(" ").includes(credential), false);
  for (const extra of [{ timeoutMs: 999999 }, { executionClass: "network-clone" }, { deadline: Date.now() + 999999 }]) {
    await call("git_toolbox", "inspect_remote_refs", { ...inspectParams, ...extra }, "INVALID_INPUT");
  }
  delayNextGitRequest = 16000;
  const shortStarted = Date.now();
  await assert.rejects(withGitHttpAuthentication(() => runBoundedGit({ cwd: source, args, executionClass: "local-default" }),
    (cwd, argv) => hosting.gitHttpAuthentication(cwd, argv)), { code: "GIT_TIMEOUT" });
  assert.ok(Date.now() - shortStarted >= 15000); assert.equal(delayNextGitRequest, 0);
  const controller = new AbortController(); delayNextGitRequest = 30000;
  const observed = new Promise(resolve => { requestObserved = resolve; });
  const cancelled = call("git_toolbox", "inspect_remote_refs", inspectParams, "GIT_EXECUTION_FAILED", controller.signal);
  await observed; const cancelledAt = Date.now(); controller.abort();
  const cancellationResult = await cancelled;
  assert.equal(cancellationResult.error.details.terminationReason, "cancelled");
  assert.ok(Date.now() - cancelledAt < 15000, "MCP cancellation beats the network-read budget");
  const result = await withGitHttpAuthentication(() => runBoundedGit({ cwd: source, args }), (cwd, argv) => hosting.gitHttpAuthentication(cwd, argv));
  assert.ok(result.stdout.includes(commit)); assert.equal(JSON.stringify(result).includes(credential), false);
  const binding = (await call("git_toolbox", "inspect_remote", { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo" })).payload;
  await call("integration_toolbox", "remove_repository_remote", { ...target, expectedCurrentBinding: "0".repeat(64) }, "GIT_EXECUTION_FAILED");
  await call("integration_toolbox", "remove_repository_remote", { ...target, expectedCurrentBinding: binding.binding });
  await call("integration_toolbox", "bind_repository_remote", target);
  redirect = true;
  await call("git_toolbox", "inspect_remote_refs", { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo" }, "GIT_EXECUTION_FAILED");
  assert.equal(git(source, ["rev-parse", "HEAD"]), commit); assert.equal(fs.existsSync(path.join(source, ".champcity")), false);
});

test("global hosting MCP binds, pushes exact refs and clones within selected repository context without workflow registration", { timeout: 180000 }, async t => {
  const { createProviderOwnedRemote } = require("../../dist/main/repository/providerOwnedRemote.js");
  const { LocalGitRepositoryAccessService } = require("../../dist/main/agentHarness/workspace/localGitRepositoryAccessService.js");
  const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
  const { createRegisteredWorkspaceAccessProvider } = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
  const { startAgentHarnessHttpRuntime } = require("../../dist/main/agentHarness/runtime/httpRuntime.js");
  const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
  const trusted = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-hosting-mcp-"));
  t.after(() => fs.rmSync(trusted, { recursive: true, force: true }));
  const bare = path.join(trusted, "hosted.git"); git(trusted, ["init", "--bare", "--initial-branch=dev", bare]);
  let empty = true, resolutions = 0;
  const metadata = () => {
    const value = { providerId: "fixture", repositoryId: "1", owner: "fixture-user", repository: "hosted", visibility: "private", description: "", defaultBranch: "dev", empty, archived: false, fork: false, mirror: false, updatedAt: null };
    return { ...value, state: crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex") };
  };
  const fixtureProvider = {
    providerId: "fixture", providerStatus: async () => ({ providerId: "fixture", readiness: "ready", configuration: "configured", implementation: "bounded-compatibility", settingsConcurrency: "application-expected-state", identity: { login: "fixture-user" }, capabilities: ["repository.inspect"], diagnostic: null }),
    inspectRepository: async () => metadata(), verifyRepository: async () => metadata(),
    resolveGitRemote: async () => { resolutions++; return createProviderOwnedRemote({ providerId: "fixture", destination: bare, allowLocalTransport: true, hostedRepositoryId: "1", hostedRepositoryState: metadata().state }); },
    createRepository: async () => ({ ...metadata(), created: false }), updateRepositorySettings: async () => metadata(),
  };
  const hosting = new RepositoryHostingFacade({ configurations: () => [], resolveCredential: async () => { throw Error("fixture must not access real credentials"); }, adapters: [fixtureProvider] });
  const localGitAccess = new LocalGitRepositoryAccessService(() => [trusted]);
  const registry = createAgentHarnessToolRegistry({ userDataRoot: path.join(trusted, "harness"), localGitAccess, repositoryHosting: hosting,
    workspaceAccess: createRegisteredWorkspaceAccessProvider({ resolveWorkspaceContext: () => { throw Error("workflow/workspace lookup forbidden"); }, listWorkspaceSummaries: () => [] }) });
  const runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot: path.join(trusted, "harness"), registry, allowUnauthenticatedLocal: true });
  const client = new Client({ name: "hosting-architect", version: "1" });
  t.after(async () => { await client.close(); await runtime.close(); });
  await client.connect(new StreamableHTTPClientTransport(new URL(runtime.url)));
  const invoke = async (name, action, params, error) => {
    const response = await client.callTool({ name, arguments: { action, params } }), result = response.structuredContent;
    assert.equal(result?.ok, !error, JSON.stringify(response)); if (error) assert.equal(result.error.code, error);
    assert.equal(JSON.stringify(result).includes(trusted), false); assert.equal(JSON.stringify(result).includes(credential), false);
    return result;
  };
  const integration = registry.listTools().find(tool => tool.name === "integration_toolbox");
  assert.equal(integration.inputZodSchema.safeParse({ action: "provider_status", params: { providerId: "fixture" } }).success, true);
  assert.equal(integration.inputZodSchema.safeParse({ action: "create_hosted_repository", params: { providerId: "fixture", repository: "hosted", visibility: "private", initialize: true } }).success, false);
  for (const field of ["token", "hostname", "remoteUrl", "command", "gitConfigKey"]) assert.equal(integration.inputZodSchema.safeParse({ action: "provider_status", params: { providerId: "fixture", [field]: credential } }).success, false);
  assert.equal((await invoke("integration_toolbox", "provider_status", { providerId: "fixture" })).payload.readiness, "ready");
  const source = path.join(trusted, "source"); fs.mkdirSync(source); fs.writeFileSync(path.join(source, "source.txt"), "source\n");
  const initialized = (await invoke("git_toolbox", "init_local_repository", { directory: source, initialBranch: "dev" })).payload;
  await invoke("git_toolbox", "select_repository_context", { repositoryHandle: initialized.repositoryHandle });
  git(source, ["config", "user.name", "Hosting Fixture"]); git(source, ["config", "user.email", "fixture@example.invalid"]);
  git(source, ["config", "protocol.file.allow", "always"]);
  const target = { providerId: "fixture", repository: "hosted", remoteName: "forgejo", localCheckoutHandle: initialized.localCheckoutHandle };
  const bound = (await invoke("integration_toolbox", "bind_repository_remote", target)).payload;
  assert.equal(bound.hostedRepository.repositoryId, "1"); assert.equal(bound.binding.destinationsEqual, true);
  const configBefore = fs.readFileSync(path.join(source, ".git", "config"));
  await invoke("integration_toolbox", "bind_repository_remote", { ...target, expectedCurrentBinding: "0".repeat(64) }, "GIT_EXECUTION_FAILED");
  assert.deepEqual(fs.readFileSync(path.join(source, ".git", "config")), configBefore);
  await invoke("git_toolbox", "stage_changes", { localCheckoutHandle: initialized.localCheckoutHandle, paths: ["source.txt"] });
  const commit = (await invoke("git_toolbox", "commit", { localCheckoutHandle: initialized.localCheckoutHandle, message: "hosting fixture" })).payload.commit;
  await invoke("git_toolbox", "push", { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo", branch: "dev", remoteBranch: "dev", expectedCommit: commit }); empty = false;
  await invoke("git_toolbox", "create_tag", { localCheckoutHandle: initialized.localCheckoutHandle, tagName: "v1", tagType: "annotated", target: commit, message: "fixture tag" });
  await invoke("git_toolbox", "push_tag", { localCheckoutHandle: initialized.localCheckoutHandle, remote: "forgejo", tagName: "v1" });
  const verified = (await invoke("integration_toolbox", "verify_hosted_repository", { ...target, expectedRefs: [`refs/heads/dev=${commit}`, `refs/tags/v1^{}=${commit}`] })).payload;
  assert.equal(verified.verified, true);
  await invoke("integration_toolbox", "verify_hosted_repository", { ...target, expectedRefs: [`refs/heads/dev=${"0".repeat(40)}`] }, "REPOSITORY_PROVIDER_STATE_CHANGED");
  const cloned = (await invoke("integration_toolbox", "clone_hosted_repository", { providerId: "fixture", repository: "hosted", destinationDirectory: path.join(trusted, "cloned"), branch: "dev" })).payload;
  assert.equal(cloned.headCommit, commit); assert.equal(cloned.requiresRepositorySelection, true);
  const before = resolutions;
  await invoke("integration_toolbox", "bind_repository_remote", { ...target, localCheckoutHandle: cloned.localCheckoutHandle, remoteName: "other" }, "REPOSITORY_CONTEXT_MISMATCH");
  assert.equal(resolutions, before);
  assert.equal((await invoke("git_toolbox", "status", { localCheckoutHandle: initialized.localCheckoutHandle })).repositoryContext.repositoryHandle, initialized.repositoryHandle);
  await invoke("git_toolbox", "select_repository_context", { repositoryHandle: cloned.repositoryHandle });
  assert.equal((await invoke("git_toolbox", "status", { localCheckoutHandle: cloned.localCheckoutHandle })).payload.headCommit, commit);
  assert.equal(fs.existsSync(path.join(source, ".champcity")), false); assert.equal(fs.existsSync(path.join(source, "planning")), false);
  let checkoutReleases = 0;
  const registered = createAgentHarnessToolRegistry({ userDataRoot: path.join(trusted, "registered-harness"), repositoryHosting: hosting,
    workspaceAccess: createRegisteredWorkspaceAccessProvider({
      resolveWorkspaceContext: workspaceId => { assert.equal(workspaceId, "registered-fixture"); return { workspaceId, root: source, repositoryName: "registered-fixture", gitBacked: true, capabilities: { filesystemRead: true, artifactWrite: true, patchWorkflow: true, gitInspection: true } }; },
      listWorkspaceSummaries: () => [], listRepositoryCheckoutSummaries: () => [],
      resolveRepositoryCheckoutContext: async (workspaceId, repositoryCheckoutId) => { assert.equal(workspaceId, "registered-fixture"); assert.equal(repositoryCheckoutId, "exact-checkout"); return { workspaceId, root: source, checkout: { repositoryId: "registered-source", repositoryCheckoutId }, release: () => { checkoutReleases++; } }; },
    }) });
  const registeredBinding = await registered.callTool({ name: "integration_toolbox", scope: "files.write", arguments: { workspaceId: "registered-fixture", action: "bind_repository_remote", params: { providerId: "fixture", repository: "hosted", remoteName: "registered", repositoryCheckoutId: "exact-checkout" } } });
  assert.equal(registeredBinding.ok, true, JSON.stringify(registeredBinding)); assert.equal(checkoutReleases, 1);
  assert.equal(git(source, ["rev-parse", "HEAD"]), commit);
  const denied = await registry.callTool({ name: "integration_toolbox", scope: "files.read", arguments: { action: "clone_hosted_repository", params: { providerId: "fixture", repository: "hosted", destinationDirectory: path.join(trusted, "denied") } } });
  assert.equal(denied.error.code, "OAUTH_SCOPE_DENIED"); assert.equal(fs.existsSync(path.join(trusted, "denied")), false);
});
