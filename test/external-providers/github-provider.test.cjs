const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { ExternalProviderGateway } = require("../../dist/main/externalProviders/externalProviderGateway.js");
const { githubProviderAdapter, githubProviderDefinition } = require("../../dist/main/externalProviders/githubProviderAdapter.js");
const { GithubProviderService, parseGithubBinding } = require("../../dist/main/externalProviders/githubProviderService.js");
const { createGithubRuntimeOperations, githubProviderEnvironment } = require("../../dist/main/externalProviders/githubRuntime.js");
const { registerGithubProviderIpc } = require("../../dist/main/externalProviders/githubProviderIpc.js");

// Curated subset of the official 1.12.2 input contract; unrelated schemas omitted.
function inventory() {
  return [
    tool("get_me"), tool("search_repositories", ["query", "perPage", "minimal_output"]),
    tool("issue_read", ["owner", "repo", "issue_number", "method"], ["get", "get_comments"]),
    tool("issue_write", ["owner", "repo", "method"], ["create", "update"]),
    tool("pull_request_read", ["owner", "repo", "pullNumber", "method"], ["get", "get_diff"]),
    tool("create_pull_request", ["owner", "repo", "title", "head", "base"]),
    tool("actions_list", ["owner", "repo", "method"], ["list_workflow_runs"]),
    tool("get_release_by_tag", ["owner", "repo", "tag"]), tool("list_releases", ["owner", "repo", "perPage", "page"]),
    tool("get_tag", ["owner", "repo", "tag"]),
  ];
}
function tool(name, fields = [], methods) {
  const properties = Object.fromEntries(fields.map((field) => [field, { type: "string" }]));
  if (methods) properties.method = { type: "string", enum: methods };
  return { name, inputSchema: { type: "object", properties } };
}
function result(value) { return { content: [{ type: "text", text: JSON.stringify(value) }] }; }
function fixture(overrides = {}) {
  const calls = [], gateways = [], events = [];
  let current = overrides.current ?? null;
  const runtime = {
    version: "1.12.2", loadCurrent: async () => current,
    stage: async () => { events.push("stage"); if (overrides.stageFails) throw new Error("synthetic acquisition failure"); return { version: "1.12.2", directory: "candidate", executable: "managed.exe", executableSha256: "a".repeat(64) }; },
    probe: async (candidate) => { events.push(`probe:${candidate.version}`); if (overrides.probeFails) throw new Error("probe failed"); },
    promote: async (candidate) => { events.push("promote"); if (overrides.promoteFails) throw new Error("promotion failed"); current = candidate; },
  };
  let connected = true;
  const service = new GithubProviderService({
    runtime, authenticationTimeoutMs: 70, authenticationRetryMs: 1,
    readOrigin: async (root) => { calls.push({ root }); return overrides.origin ?? "git@github.com:bound/project.git"; },
    createGateway(candidate) {
      const gateway = new ExternalProviderGateway({ sessionFactory: { async createSession() {
        return {
          connect: async () => { events.push("connect"); connected = true; },
          isConnected: () => connected,
          discover: async () => ({ tools: overrides.inventory?.() ?? inventory(), resourceCount: 0 }),
          invokeTool: async (name, args) => {
            calls.push({ name, args });
            if (name === "get_me") {
              if (overrides.pending?.()) return { isError: true, content: [{ type: "text", text: "OAuth code SYNTHETIC-ONLY https://github.com/login/oauth/authorize?code=do-not-display" }] };
              return result({ login: "example", id: 1, token: "synthetic-private-value with spaces and \"quotes\"" });
            }
            if (overrides.readFailure) throw new Error(overrides.readFailure === "auth" ? "401 authentication required token=synthetic-private-value" : "404 not found token=synthetic-private-value");
            if (name === "search_repositories") return result({ items: [{ full_name: "bound/project", id: 2, private: true, html_url: "https://github.com/bound/project", authorization: "synthetic-private-value" }] });
            if (name === "issue_read" || name === "pull_request_read") return result({ number: args.issue_number ?? args.pullNumber, title: "Example", state: "open" });
            if (name === "get_release_by_tag") return result({ tag_name: args.tag, id: 3, draft: false, assets: [{ name: "installer.exe", size: 123, token: "synthetic-private-value" }] });
            if (name === "list_releases") return result([{ tag_name: "v1", draft: false }]);
            if (name === "get_tag") return result({ name: args.tag, commit: { sha: "a".repeat(40) } });
            throw new Error("Unexpected tool");
          },
          close: async () => { events.push("close"); },
        };
      } } });
      gateway.register(githubProviderDefinition(candidate.executable, candidate.directory));
      gateways.push(gateway);
      return gateway;
    },
  });
  return { service, runtime, calls, events, gateways, closeTransport: () => { connected = false; } };
}

test("GitHub registration fixes official stdio toolsets and OAuth environment", () => {
  const definition = githubProviderDefinition("managed.exe", "managed");
  assert.equal(definition.providerId, "github");
  assert.deepEqual(definition.nativeToolFilter.toolsets, ["context", "repos", "issues", "pull_requests", "actions"]);
  assert.equal(definition.transport.args[2], "context,repos,issues,pull_requests,actions");
  assert.doesNotMatch(JSON.stringify(definition.transport), /insiders|--tools"|\ball\b/);
  const original = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  process.env.GITHUB_PERSONAL_ACCESS_TOKEN = "synthetic-ambient-secret";
  try { assert.equal(githubProviderEnvironment().GITHUB_PERSONAL_ACCESS_TOKEN, undefined); }
  finally { if (original === undefined) delete process.env.GITHUB_PERSONAL_ACCESS_TOKEN; else process.env.GITHUB_PERSONAL_ACCESS_TOKEN = original; }
});

test("capability mapping uses exact discovered schemas and leaves missing writes unavailable", () => {
  const caps = githubProviderAdapter.mapCapabilities({ tools: inventory(), resourceCount: 0 });
  assert.equal(caps.find((x) => x.capabilityId === "github.release.read").availability, "available");
  for (const id of ["create", "update", "delete", "asset.upload"]) assert.equal(caps.find((x) => x.capabilityId === `github.release.${id}`).availability, "unavailable");
  assert.equal(caps.find((x) => x.capabilityId === "github.actions.write").availability, "unavailable");
  const missingMethod = inventory().map((x) => x.name === "issue_read" ? tool("issue_read", ["method", "owner", "repo", "issue_number"], ["get_comments"]) : x);
  assert.equal(githubProviderAdapter.mapCapabilities({ tools: missingMethod, resourceCount: 0 }).find((x) => x.capabilityId === "github.issue.read").availability, "unavailable");
});

test("future discovered release write evidence cannot enable a mutation route", async () => {
  const f = fixture({ inventory: () => [...inventory(), tool("create_release", ["owner", "repo", "tag_name"])] });
  await f.service.connect();
  assert.equal(f.service.getStatus().capabilities.find((x) => x.capabilityId === "github.release.create").availability, "available");
  await assert.rejects(f.gateways[0].invokeCapability("github", "github.release.create", { owner: "bound", repo: "project" }), /no application invocation route/);
  assert.ok(!f.calls.some((x) => x.name === "create_release"));
  assert.equal(f.service.getStatus().releaseWrites, "gh-compatibility");
});

test("Actions write evidence requires the discovered workflow trigger method", () => {
  const trigger = tool("actions_run_trigger", ["owner", "repo", "workflow_id", "ref", "method"], ["run_workflow", "cancel_workflow_run"]);
  const map = (entry) => githubProviderAdapter.mapCapabilities({ tools: [...inventory(), entry], resourceCount: 0 }).find((x) => x.capabilityId === "github.actions.write");
  assert.equal(map(trigger).availability, "available");
  trigger.inputSchema.properties.method.enum = ["cancel_workflow_run"];
  assert.equal(map(trigger).availability, "unavailable");
});

test("OAuth pending state exposes no codes and promotes only after authenticated discovery", async () => {
  let pending = true;
  const f = fixture({ pending: () => pending });
  const connecting = f.service.connect();
  await new Promise((resolve) => setTimeout(resolve, 10));
  const status = f.service.getStatus();
  assert.equal(status.authentication, "pending");
  assert.ok(status.capabilities.every((x) => x.availability === "unknown"));
  assert.doesNotMatch(JSON.stringify(status), /SYNTHETIC|do-not-display/);
  assert.ok(!f.events.includes("promote"));
  pending = false;
  await connecting;
  assert.equal(f.service.getStatus().runtime, "ready");
  assert.equal(f.service.getStatus().authentication, "authenticated");
  assert.equal(f.events.at(-1), "promote");
});

test("OAuth failure remains unavailable and redacts diagnostics", async () => {
  const f = fixture({ pending: () => true });
  await f.service.connect();
  const status = f.service.getStatus();
  assert.equal(status.runtime, "unavailable");
  assert.equal(status.authentication, "authentication-required");
  assert.doesNotMatch(JSON.stringify(status), /do-not-display|SYNTHETIC/);
  assert.ok(!f.events.includes("promote"));
});

test("bound read routes context, repository, Issue, PR, release and tag through the gateway", async () => {
  const f = fixture();
  await f.service.connect();
  for (const request of [{ kind: "context" }, { kind: "repository" }, { kind: "issue", number: 17 }, { kind: "pull-request", number: 23 }, { kind: "release", tag: "v1" }, { kind: "releases" }, { kind: "tag", tag: "v1" }]) {
    const evidence = await f.service.read("selected-root", request);
    assert.equal(evidence.providerId, "github");
    assert.equal(evidence.repository, request.kind === "context" ? null : "bound/project");
    assert.doesNotMatch(JSON.stringify(evidence), /synthetic-private-value|authorization|token/);
  }
  assert.deepEqual(f.calls.find((x) => x.name === "issue_read").args, { owner: "bound", repo: "project", method: "get", issue_number: 17 });
  assert.ok(f.calls.filter((x) => x.root).every((x) => x.root === "selected-root"));
  await assert.rejects(f.service.read("selected-root", { kind: "repository", owner: "escape" }), /Unsupported/);
  await assert.rejects(f.service.read("selected-root", { kind: "call", tool: "delete_release" }), /Unsupported/);
});

test("repository binding rejects hosts, credentials, traversal and ambiguous remotes", () => {
  for (const remote of ["https://github.com/bound/project.git", "ssh://git@github.com/bound/project.git", "git@github.com:bound/project.git"]) assert.deepEqual(parseGithubBinding(remote), { owner: "bound", repo: "project" });
  for (const remote of ["https://evil.test/bound/project", "https://user:secret@github.com/bound/project", "https://github.com/bound/project?token=synthetic", "git@github.com:../project", "git@github.com:bound/project/extra"]) assert.throws(() => parseGithubBinding(remote));
});

test("reconnect refreshes capability generation; disconnect cancels pending login", async () => {
  let tools = inventory();
  const f = fixture({ inventory: () => tools });
  await f.service.connect();
  const generation = f.service.getStatus().capabilityGeneration;
  tools = tools.filter((x) => x.name !== "issue_write");
  await f.service.restart();
  assert.ok(f.service.getStatus().capabilityGeneration > generation);
  assert.equal(f.service.getStatus().capabilities.find((x) => x.capabilityId === "github.issue.write").availability, "unavailable");
  await f.service.disconnect();
  assert.equal(f.service.getStatus().runtime, "disconnected");
  assert.ok(f.service.getStatus().capabilities.every((x) => x.availability === "unknown"));
  const pending = fixture({ pending: () => true });
  void pending.service.connect();
  await new Promise((resolve) => setTimeout(resolve, 5));
  await pending.service.disconnect();
  assert.ok(!pending.events.includes("promote"));
  assert.equal(pending.service.getStatus().runtime, "disconnected");
});

test("provider exit and authentication loss invalidate evidence; missing records preserve authentication", async () => {
  const f = fixture();
  await f.service.connect();
  f.closeTransport();
  assert.equal(f.service.getStatus().runtime, "unavailable");
  const failed = fixture({ readFailure: "auth" });
  await failed.service.connect();
  await assert.rejects(failed.service.read("selected-root", { kind: "issue", number: 1 }), /evidence is unavailable/);
  assert.equal(failed.service.getStatus().authentication, "authentication-required");
  assert.doesNotMatch(JSON.stringify(failed.service.getStatus()), /synthetic-private-value/);
  const absent = fixture({ readFailure: true });
  await absent.service.connect();
  await assert.rejects(absent.service.read("selected-root", { kind: "release", tag: "v1" }), /evidence is unavailable/);
  assert.equal(absent.service.getStatus().authentication, "authenticated");
  assert.equal(absent.service.getStatus().runtime, "ready");
});

test("candidate probe or promotion failures retain the working session and generation", async () => {
  const config = {};
  const f = fixture(config);
  await f.service.connect();
  const before = f.service.getStatus();
  config.promoteFails = true;
  await f.service.connect();
  assert.equal(f.service.getStatus().runtime, "ready");
  assert.equal(f.service.getStatus().recovery, "last-known-good");
  assert.equal(f.service.getStatus().capabilityGeneration, before.capabilityGeneration);
  assert.ok(await f.service.read(null, { kind: "context" }));
});

test("cold update acquisition failure falls back to verified prior runtime", async () => {
  const f = fixture({ current: { version: "1.12.1", directory: "prior", executable: "managed.exe" }, stageFails: true });
  await f.service.connect();
  assert.equal(f.service.getStatus().runtime, "ready");
  assert.equal(f.service.getStatus().version, "1.12.1");
  assert.equal(f.service.getStatus().recovery, "last-known-good");
  assert.ok(!f.events.includes("promote"));
});

test("missing minimum capabilities prevent promotion; desktop restore never invents login", async () => {
  const f = fixture({ inventory: () => inventory().filter((x) => x.name !== "get_release_by_tag") });
  await f.service.connect();
  assert.equal(f.service.getStatus().runtime, "unavailable");
  assert.ok(!f.events.includes("promote"));
  const restored = fixture({ current: { version: "1.12.2", directory: "prior", executable: "managed.exe" } });
  await restored.service.restore();
  assert.equal(restored.service.getStatus().version, "1.12.2");
  assert.equal(restored.service.getStatus().authentication, "authentication-required");
  assert.ok(restored.service.getStatus().capabilities.every((x) => x.availability === "unknown"));
});

test("Settings IPC binds reads to selected repository and exposes no generic invocation", async () => {
  const f = fixture();
  await f.service.connect();
  const handlers = new Map();
  registerGithubProviderIpc({ handle: (channel, handler) => handlers.set(channel, handler) }, f.service, () => "selected-by-main");
  assert.equal(handlers.size, 5);
  assert.ok(![...handlers.keys()].some((name) => /tool|invoke|register/i.test(name)));
  await handlers.get("githubProvider:read")({}, { kind: "repository" });
  assert.ok(f.calls.some((x) => x.root === "selected-by-main"));
  assert.throws(() => handlers.get("githubProvider:read")({}, { kind: "repository", root: "escape", owner: "escape" }));
});

test("managed runtime verifies saved identity and bytes before reuse", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-github-runtime-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const operations = createGithubRuntimeOperations(directory);
  assert.equal(await operations.loadCurrent(), null);
  const root = path.join(directory, "external-providers", "github");
  const id = "11111111-1111-1111-1111-111111111111";
  const versionRoot = path.join(root, "versions", id);
  await fs.mkdir(versionRoot, { recursive: true });
  const executable = path.join(versionRoot, "github-mcp-server.exe");
  await fs.writeFile(executable, "synthetic-not-executable");
  const digest = createHash("sha256").update("synthetic-not-executable").digest("hex");
  await operations.promote({ version: "1.12.2", directory: versionRoot, executable, executableSha256: digest });
  assert.equal((await operations.loadCurrent()).executable, executable);
  await fs.writeFile(executable, "tampered");
  await assert.rejects(operations.loadCurrent(), /integrity/);
  await fs.writeFile(path.join(root, "current.json"), JSON.stringify({ version: "1.12.2", directory: "../../escape", executableSha256: digest }));
  await assert.rejects(operations.loadCurrent(), /identity/);
});

test("untrusted artifact bytes fail visibly before any runtime promotion", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-github-acquire-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    assert.match(String(url), /^https:\/\/github.com\/github\/github-mcp-server\/releases\/download\/v1\.12\.2\//);
    return new Response("synthetic-wrong-archive", { status: 200 });
  };
  try { await assert.rejects(createGithubRuntimeOperations(directory).stage(new AbortController().signal), /integrity|platform/); }
  finally { global.fetch = originalFetch; }
  assert.equal(await createGithubRuntimeOperations(directory).loadCurrent(), null);
});
