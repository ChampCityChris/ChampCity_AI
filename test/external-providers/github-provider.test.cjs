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
    tool("create_pull_request", ["owner", "repo", "title", "head", "base", "body"]),
    tool("actions_list", ["owner", "repo", "method"], ["list_workflow_runs"]),
    tool("get_release_by_tag", ["owner", "repo", "tag"]), tool("list_releases", ["owner", "repo", "perPage", "page"]),
    tool("get_tag", ["owner", "repo", "tag"]),
  ];
}
function tool(name, fields = [], methods) {
  const properties = Object.fromEntries(fields.map((field) => [field, { type: "string" }]));
  if (properties.detail) properties.detail.enum = ["none", "stats", "full_patch"];
  if (methods) properties.method = { type: "string", enum: methods };
  return { name, inputSchema: { type: "object", properties } };
}

test("GitHub public MCP executes official writes and named compatibility gaps without workflow registration", { timeout: 90000 }, async t => {
  const { GithubHostingAdapter } = require("../../dist/main/externalProviders/githubHostingAdapter.js");
  const { RepositoryHostingFacade } = require("../../dist/main/externalProviders/repositoryHostingFacade.js");
  const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
  const { startAgentHarnessHttpRuntime } = require("../../dist/main/agentHarness/runtime/httpRuntime.js");
  const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rmcp-gh-"));
  const { LocalGitRepositoryAccessService } = require("../../dist/main/agentHarness/workspace/localGitRepositoryAccessService.js");
  const { execFileSync } = require("node:child_process");
  const { Readable } = require("node:stream");
  const { pipeline } = require("node:stream/promises");
  let now = Date.now(), denyTransfer = false, corruptDownload = false, nextAssetId = 9;
  const artifactBytes = new Map(), local = path.join(root, "local"), unrelated = path.join(root, "unrelated");
  for (const directory of [local, unrelated]) { await fs.mkdir(directory); execFileSync("git", ["init", "-b", "dev"], { cwd: directory, windowsHide: true, stdio: "pipe" }); }
  const localGitAccess = new LocalGitRepositoryAccessService(() => [root], () => now);
  const bytes = Buffer.alloc(1024 * 1024, 0xa5), digest = createHash("sha256").update(bytes).digest("hex");
  await fs.writeFile(path.join(local, "artifact.bin"), bytes);
  const base = "a".repeat(40), head = "b".repeat(40), compatibilityCalls = [], files = new Map(), branches = new Map(), tags = new Map(), pulls = new Map(), reviews = [], releases = new Map();
  let repository = { id: 2, full_name: "example/operations", private: true, description: "", size: 0, default_branch: "main", archived: false, fork: false, updated_at: "2026-01-01T00:00:00Z" };
  const schemas = () => [...inventory().filter(entry => !["search_repositories", "pull_request_read", "create_pull_request"].includes(entry.name)),
    tool("search_repositories", ["query", "page", "perPage", "minimal_output"]),
    tool("create_repository", ["name", "organization", "private", "autoInit", "description"]),
    tool("list_branches", ["owner", "repo", "page", "perPage"]), tool("create_branch", ["owner", "repo", "branch", "from_branch"]),
    tool("list_tags", ["owner", "repo", "page", "perPage"]), tool("get_file_contents", ["owner", "repo", "path", "ref"]),
    tool("get_commit", ["owner", "repo", "sha", "detail"]),
    tool("create_or_update_file", ["owner", "repo", "path", "content", "message", "branch", "sha"]),
    tool("pull_request_read", ["owner", "repo", "pullNumber", "method", "page", "perPage"], ["get", "get_reviews"]),
    tool("list_pull_requests", ["owner", "repo", "state", "page", "perPage"]), tool("create_pull_request", ["owner", "repo", "title", "body", "head", "base"]),
    tool("update_pull_request", ["owner", "repo", "pullNumber", "title", "body", "state", "base"]),
    tool("merge_pull_request", ["owner", "repo", "pullNumber", "merge_method", "expectedHeadSha"]),
    tool("pull_request_review_write", ["owner", "repo", "pullNumber", "method", "event", "body", "commitID"], ["create", "submit_pending"]),
  ];
  const f = fixture({ inventory: schemas, invoke(name, args) {
    assert.ok(!JSON.stringify(args).includes("synthetic-private-value"));
    if (name === "search_repositories") return result({ items: [repository] });
    if (name === "get_commit") { assert.equal(args.detail, "none"); return result({ sha: args.sha }); }
    if (name === "create_repository") { assert.equal(args.autoInit, false); assert.equal(args.name, "operations"); return result({ id: "2", url: "https://github.com/example/operations" }); }
    if (name === "list_branches" || name === "list_tags") return result([... (name === "list_branches" ? branches : tags)].slice(0, args.perPage).map(([name, sha]) => ({ name, commit: { sha }, protected: false })));
    if (name === "get_tag") return result({ name: args.tag, commit: { sha: tags.get(args.tag) } });
    if (name === "create_branch") { branches.set(args.branch, branches.get(args.from_branch)); return result({ ref: args.branch }); }
    if (name === "create_or_update_file") { const prior = files.get(args.path); assert.equal(args.sha, prior?.sha); if (!branches.has(args.branch)) branches.set(args.branch, base); const bytes = Buffer.from(args.content); files.set(args.path, { sha: createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), content: args.content }); return result({ commit: { sha: branches.get(args.branch) } }); }
    if (name === "get_file_contents") { const file = files.get(args.path); return { content: [{ type: "text", text: `successfully downloaded text file (SHA: ${file.sha})` }, { type: "resource", resource: { uri: `repo://example/operations/${args.ref}/${args.path}`, text: file.content, mimeType: "text/plain" } }] }; }
    if (name === "create_pull_request") { pulls.set(8, { number: 8, title: args.title, body: args.body, state: "open", merged: false, head: { ref: args.head, sha: head }, base: { ref: args.base, sha: base } }); return result({ id: "999", url: "https://github.com/example/operations/pull/8" }); }
    if (name === "pull_request_read") return result(args.method === "get_reviews" ? reviews : pulls.get(args.pullNumber));
    if (name === "list_pull_requests") return result([...pulls.values()]);
    if (name === "update_pull_request") { const pr = pulls.get(args.pullNumber); for (const key of ["title", "body", "state"]) if (args[key] !== undefined) pr[key] = args[key]; return result({ id: "999", url: "https://github.com/example/operations/pull/8" }); }
    if (name === "pull_request_review_write") { assert.equal(args.method, "create"); reviews.push({ id: 4, state: args.event === "APPROVE" ? "APPROVED" : "COMMENTED", body: args.body, commit_id: args.commitID }); return { content: [{ type: "text", text: "pull request review submitted successfully" }] }; }
    if (name === "merge_pull_request") { const pr = pulls.get(args.pullNumber); assert.equal(args.expectedHeadSha, pr.head.sha); pr.merged = true; pr.state = "closed"; return result({ merged: true, sha: head }); }
    if (name === "list_releases") return result([...releases.values()]);
    throw Error(`Unexpected official tool ${name}`);
  }, compatibility: async (operation, input, identity) => {
    assert.equal(identity, "example"); assert.equal(input.owner, "example"); assert.equal(input.repo, "operations"); compatibilityCalls.push({ operation, input });
    if (operation === "repository-settings") { if (input.description !== undefined) repository.description = input.description; if (input.visibility) repository.private = input.visibility === "private"; return repository; }
    if (operation === "ref-read") return { ref: `refs/heads/${input.name}`, object: { sha: branches.get(input.name) } };
    if (operation === "ref-create") { (input.kind === "tags" ? tags : branches).set(input.name, input.sourceCommit); return { ref: input.name }; }
    if (operation === "ref-delete") { (input.kind === "tags" ? tags : branches).delete(input.name); return { deleted: true }; }
    if (operation === "file-metadata") { const file = files.get(input.filePath); return file ? { type: "file", path: input.filePath, sha: file.sha } : { exists: false }; }
    if (operation === "file-delete-cas") { assert.equal(files.get(input.filePath).sha, input.expectedSha); files.delete(input.filePath); return { deleted: true }; }
    if (operation === "release-create" || operation === "release-update") { const value = { id: input.releaseId ?? 3, tag_name: input.tagName, name: input.name, body: input.body, draft: input.draft, prerelease: input.prerelease, assets: releases.get(input.releaseId)?.assets ?? [] }; releases.set(value.id, value); return value; }
    if (operation === "release-read") return releases.get(input.releaseId);
    if (operation === "release-delete") { releases.delete(input.releaseId); return { deleted: true }; }
    if (operation === "asset-upload") {
      if (denyTransfer) throw Error("fixture authentication failure");
      const chunks = []; if (input.source) { assert.equal(input.contentBase64, undefined); for await (const chunk of input.source.open()) chunks.push(chunk); } else chunks.push(Buffer.from(input.contentBase64, "base64"));
      const data = Buffer.concat(chunks), id = nextAssetId++; artifactBytes.set(id, data);
      releases.get(input.releaseId).assets.push({ id, name: input.name, size: data.length, digest: `sha256:${createHash("sha256").update(data).digest("hex")}` }); return releases.get(input.releaseId);
    }
    if (operation === "asset-download") { if (denyTransfer) throw Error("fixture authentication failure"); const data = corruptDownload ? Buffer.alloc(artifactBytes.get(input.assetId).length) : artifactBytes.get(input.assetId); await pipeline(Readable.from([data]), input.destination); return { downloaded: true }; }
    if (operation === "asset-delete") { const release = releases.get(input.releaseId); release.assets = release.assets.filter(asset => asset.id !== input.assetId); return { deleted: true }; }
    throw Error(`Unexpected compatibility method ${operation}`);
  } });
  const adapter = new GithubHostingAdapter(f.service), registry = createAgentHarnessToolRegistry({ userDataRoot: root, localGitAccess, repositoryHosting: new RepositoryHostingFacade({ configurations: () => [], resolveCredential: async () => null, github: adapter }), workspaceAccess: {
    resolveWorkspaceContext: () => { throw Error("must not resolve a workflow Project"); }, listWorkspaceSummaries: () => [], listRepositoryCheckoutSummaries: () => [],
  } });
  const runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot: root, registry, allowUnauthenticatedLocal: true });
  const client = new Client({ name: "github-hosting-fixture", version: "1" });
  t.after(async () => { await client.close(); await runtime.close(); await registry.shutdownProviders(); await fs.rm(root, { recursive: true, force: true }); });
  await client.connect(new StreamableHTTPClientTransport(new URL(runtime.url)));
  const published = (await client.listTools()).tools, definition = registry.listTools().find(tool => tool.name === "integration_toolbox");
  assert.match(published.find(tool => tool.name === "release_toolbox").description, /legacy.*registered.*integration_toolbox/);
  assert.match(definition.description, /Project-independent Forgejo and GitHub.*releases.*release assets/);
  const uploadForms = definition.inputSchema.oneOf.filter(action => action.title === "upload_hosted_release_asset");
  assert.equal(uploadForms.length, 2); assert.equal(uploadForms[0].properties.params.properties.localCheckoutHandle, undefined);
  assert.equal(uploadForms[1].properties.params.properties.contentBase64, undefined); assert.equal(uploadForms[1].properties.params.properties.expectedSize.maximum, 2147483648);
  const parse = params => definition.inputZodSchema.safeParse({ action: "upload_hosted_release_asset", params: { providerId: "github", owner: "example", repository: "operations", releaseId: 3, expectedState: "a".repeat(64), name: "artifact.bin", ...params } }).success;
  assert.equal(parse({ contentBase64: "YQ==" }), true); assert.equal(parse({ localCheckoutHandle: "opaque", relativePath: "artifact.bin", expectedSize: bytes.length, expectedSha256: digest }), true);
  assert.equal(parse({}), false); assert.equal(parse({ contentBase64: "YQ==", localCheckoutHandle: "opaque" }), false);
  const global = new Set(["provider_status", "connect_hosted_provider", "disconnect_hosted_provider", "list_hosted_repositories"]);
  const invoke = async (action, params = {}) => { const response = await client.callTool({ name: "integration_toolbox", arguments: { action, params: { providerId: "github", ...(global.has(action) ? {} : { owner: "example", repository: "operations" }), ...params } } }); return response.structuredContent ?? response; };
  const success = async (action, params) => { const response = await invoke(action, params); assert.equal(response.ok, true, JSON.stringify(response)); assert.doesNotMatch(JSON.stringify(response), /synthetic-private-value/); return response.payload; };
  assert.equal((await success("provider_status")).readiness, "authentication-required");
  assert.equal((await success("connect_hosted_provider")).readiness, "ready");
  assert.equal((await success("create_hosted_repository", { visibility: "private" })).created, true);
  const initialized = await success("write_hosted_file_cas", { filePath: "bootstrap.txt", branch: "main", expectedSha: "absent", message: "explicit first file", content: "bootstrap\n" }); assert.equal(initialized.content, "bootstrap\n");
  assert.equal((await success("inspect_hosted_repository")).empty, false, "rounded zero size does not hide an actual branch");
  assert.equal((await success("list_hosted_repositories")).repositories.length, 1);
  const observed = await success("inspect_hosted_repository");
  await success("update_hosted_repository_settings", { expectedState: observed.state, description: "changed" });
  assert.equal((await invoke("update_hosted_repository_settings", { expectedState: observed.state, description: "stale" })).ok, false);
  await success("create_hosted_branch", { name: "feature", sourceCommit: base });
  await success("create_hosted_tag", { name: "v1", sourceCommit: base });
  assert.equal((await success("list_hosted_tags")).refs.length, 1);
  assert.equal((await success("inspect_hosted_file", { filePath: "read me.txt", ref: "main" })).exists, false);
  let file = await success("write_hosted_file_cas", { filePath: "read me.txt", branch: "main", expectedSha: "absent", message: "add", content: "first\n" });
  assert.equal((await invoke("write_hosted_file_cas", { filePath: file.filePath, branch: "main", expectedSha: "absent", message: "stale", content: "stale" })).ok, false);
  file = await success("write_hosted_file_cas", { filePath: file.filePath, branch: "main", expectedSha: file.sha, message: "update", content: "second\n" });
  const resourceContent = '"\\\n\u0001'.repeat(20000);
  file = await success("write_hosted_file_cas", { filePath: file.filePath, branch: "main", expectedSha: file.sha, message: "bounded escaped resource", content: resourceContent }); assert.equal(file.content, resourceContent);
  await success("delete_hosted_file_cas", { filePath: file.filePath, branch: "main", expectedSha: file.sha, message: "delete" });
  let pr = await success("create_pull_request", { title: "change", head: "feature", base: "main", body: "review" });
  pr = await success("update_pull_request", { pullNumber: pr.number, expectedState: pr.stateId, title: "edited", body: "" });
  assert.equal((await success("list_pull_requests")).pullRequests.length, 1);
  assert.equal((await success("create_pull_request_review", { pullNumber: pr.number, expectedHead: head, event: "APPROVED", body: "reviewed" })).commit, head);
  assert.equal((await invoke("merge_pull_request", { pullNumber: pr.number, expectedHead: base, method: "merge" })).ok, false);
  assert.equal((await success("merge_pull_request", { pullNumber: pr.number, expectedHead: head, method: "squash" })).merged, true);
  let release = await success("create_hosted_release", { tagName: "v1", name: "first", body: "notes", draft: true, prerelease: false });
  assert.equal((await success("list_hosted_releases")).length, 1);
  const oldState = release.stateId;
  release = await success("update_hosted_release", { releaseId: release.id, expectedState: release.stateId, tagName: "v1", name: "updated", body: "", draft: true, prerelease: true });
  assert.equal((await invoke("delete_hosted_release", { releaseId: release.id, expectedState: oldState })).ok, false);
  release = await success("upload_hosted_release_asset", { releaseId: release.id, expectedState: release.stateId, name: "proof.txt", contentBase64: Buffer.from("fixture").toString("base64") });
  const gitCall = async (action, params) => { const response = await client.callTool({ name: "git_toolbox", arguments: { action, params } }); const result = response.structuredContent ?? response; assert.equal(result.ok, true, JSON.stringify(result)); return result.payload; };
  const group = (await gitCall("discover_local_repositories", { directory: local })).repositories[0], checkout = group.checkouts[0];
  const other = (await gitCall("discover_local_repositories", { directory: unrelated })).repositories[0].checkouts[0];
  await gitCall("select_repository_context", { repositoryHandle: group.repositoryHandle });
  const source = { localCheckoutHandle: checkout.localCheckoutHandle, relativePath: "artifact.bin", expectedSize: bytes.length, expectedSha256: digest };
  const upload = extra => invoke("upload_hosted_release_asset", { releaseId: release.id, expectedState: release.stateId, name: "artifact.bin", ...source, ...extra });
  for (const invalid of [{ expectedSize: bytes.length + 1 }, { expectedSha256: "0".repeat(64) }, { relativePath: "../artifact.bin" }, { relativePath: path.join(local, "artifact.bin") }, { relativePath: "NUL" }, { relativePath: "artifact.bin:stream" }, { relativePath: ".git/config" }, { relativePath: ".git" }, { relativePath: "directory" }, { localCheckoutHandle: other.localCheckoutHandle }, { contentBase64: "YQ==" }]) {
    await fs.mkdir(path.join(local, "directory"), { recursive: true });
    const mutations = compatibilityCalls.filter(call => call.operation === "asset-upload").length;
    const response = await upload(invalid); assert.ok(response.isError || response.ok === false, JSON.stringify(invalid));
    assert.equal(compatibilityCalls.filter(call => call.operation === "asset-upload").length, mutations, "invalid source must fail before mutation");
  }
  await fs.symlink(local, path.join(local, "redirect"), process.platform === "win32" ? "junction" : "dir");
  assert.equal((await upload({ relativePath: "redirect/artifact.bin" })).ok, false);
  await fs.rm(path.join(local, "redirect"), { recursive: true });
  await fs.link(path.join(local, "artifact.bin"), path.join(local, "hardlinked.bin")); assert.equal((await upload({ relativePath: "hardlinked.bin" })).ok, false); await fs.unlink(path.join(local, "hardlinked.bin"));
  const control = path.join(local, "unusual-control"); await fs.mkdir(control); await fs.mkdir(path.join(control, "objects")); await fs.mkdir(path.join(control, "refs")); await fs.writeFile(path.join(control, "HEAD"), "ref: refs/heads/dev\n"); await fs.writeFile(path.join(control, "artifact.bin"), bytes);
  assert.equal((await upload({ relativePath: "unusual-control/artifact.bin" })).ok, false);
  denyTransfer = true; assert.equal((await upload({})).error.code, "REPOSITORY_PROVIDER_NOT_READY"); denyTransfer = false;
  release = (await upload({})).payload; assert.ok(release); assert.equal(release.assets.find(asset => asset.name === "artifact.bin").size, bytes.length);
  const asset = release.assets.find(asset => asset.name === "artifact.bin"); assert.equal(asset.digest, `sha256:${digest}`);
  assert.equal((await success("inspect_hosted_release", { releaseId: release.id })).assets.find(value => value.id === asset.id).digest, asset.digest);
  assert.equal((await upload({ expectedState: oldState, name: "stale.bin" })).ok, false);
  const download = () => invoke("download_hosted_release_asset", { releaseId: release.id, expectedState: release.stateId, assetId: asset.id });
  corruptDownload = true; assert.equal((await download()).ok, false); corruptDownload = false;
  denyTransfer = true; assert.equal((await download()).ok, false); denyTransfer = false;
  const downloaded = (await download()).payload; assert.equal(downloaded.sha256, digest); assert.equal(downloaded.size, bytes.length); assert.match(downloaded.artifactHandle, /^release_artifact_/); assert.equal(downloaded.filename, "artifact.bin");
  assert.equal(downloaded.providerDigest, `sha256:${digest}`); assert.equal(JSON.stringify(downloaded).includes(root), false);
  assert.ok((await invoke("download_hosted_release_asset", { releaseId: release.id, expectedState: release.stateId, assetId: asset.id, outputPath: path.join(root, "forbidden.bin") })).isError);
  releases.get(release.id).assets.find(value => value.id === asset.id).digest = null;
  release = await success("inspect_hosted_release", { releaseId: release.id });
  const withoutDigest = (await download()).payload; assert.equal(withoutDigest.sha256, digest); assert.equal(withoutDigest.providerDigest, null);
  assert.equal((await download()).ok, false, "retained temporary artifacts enforce bounded capacity");
  assert.equal((await invoke("download_hosted_release_asset", { releaseId: release.id, expectedState: oldState, assetId: asset.id })).ok, false);
  now += 31 * 60_000; assert.equal((await upload({ name: "expired.bin" })).error.code, "REPOSITORY_CONTEXT_STALE");
  release = await success("delete_hosted_release_asset", { releaseId: release.id, expectedState: release.stateId, assetId: asset.id });
  release = await success("delete_hosted_release_asset", { releaseId: release.id, expectedState: release.stateId, assetId: 9 });
  await success("delete_hosted_release", { releaseId: release.id, expectedState: release.stateId });
  await success("delete_hosted_tag", { name: "v1", expectedCommit: base });
  await success("delete_hosted_branch", { name: "feature", expectedCommit: base });
  assert.ok(f.calls.some(call => call.name === "create_or_update_file")); assert.ok(compatibilityCalls.some(call => call.operation === "file-delete-cas"));
  assert.equal((await invoke("inspect_hosted_repository", { owner: "../escape" })).ok, false);
  const invalidResponse = await invoke("create_hosted_repository", { visibility: "private", token: "synthetic-not-accepted" }); assert.ok(invalidResponse.isError || invalidResponse.ok === false);
  assert.equal((await success("provider_status")).capabilities.includes("github.release.create"), false);
  await success("disconnect_hosted_provider"); assert.equal((await invoke("inspect_hosted_repository")).ok, false);
  assert.equal(f.calls.some(call => "root" in call), false); assert.equal(await fs.stat(path.join(root, ".champcity")).then(() => true, () => false), false);
});
function result(value) { return { content: [{ type: "text", text: JSON.stringify(value) }] }; }

test("GitHub named compatibility fixes account host SHA routes and exact binary release asset identity", async () => {
  const { createGithubCompatibilityRunner } = require("../../dist/main/externalProviders/githubHostingCompatibility.js");
  const calls = [];
  const execute = async (args, _signal, input, allowAbsent) => {
    calls.push({ args, input, allowAbsent }); assert.equal(args[0], "api"); assert.deepEqual(args.slice(1, 3), ["--hostname", "github.com"]);
    if (args[5] === "user") return JSON.stringify({ login: "example" });
    if (allowAbsent) return JSON.stringify({ exists: false });
    return JSON.stringify({ id: 3, assets: [] });
  };
  const run = createGithubCompatibilityRunner(execute), locator = { owner: "example", repo: "operations" }, expected = "a".repeat(40);
  await run("repository-settings", { ...locator, visibility: "private", description: "plain text" }, "example");
  assert.deepEqual(JSON.parse(calls.at(-1).input), { private: true, description: "plain text" });
  await run("file-delete-cas", { ...locator, filePath: "src/read me.txt", branch: "dev", expectedSha: expected, message: "delete" }, "example");
  assert.equal(calls.at(-1).args[5], "repos/example/operations/contents/src/read%20me.txt"); assert.equal(JSON.parse(calls.at(-1).input).sha, expected);
  assert.deepEqual(await run("file-metadata", { ...locator, filePath: "missing.txt", commit: expected }, "example"), { exists: false });
  assert.equal(calls.at(-1).allowAbsent, true); assert.match(calls.at(-1).args[5], /\?ref=a{40}$/);
  await run("ref-create", { ...locator, kind: "tags", name: "v1", sourceCommit: expected }, "example"); assert.deepEqual(JSON.parse(calls.at(-1).input), { ref: "refs/tags/v1", sha: expected });
  await run("release-update", { ...locator, releaseId: 3, tagName: "v1", name: "release", body: "", draft: true, prerelease: false }, "example"); assert.equal(calls.at(-1).args[5], "repos/example/operations/releases/3");
  const bytes = Buffer.from([0, 255, 128, 13, 10]);
  await run("asset-upload", { ...locator, releaseId: 3, name: "proof.bin", contentBase64: bytes.toString("base64") }, "example");
  const upload = calls.find(call => call.args[5]?.startsWith("https://uploads.github.com/"));
  assert.equal(upload.args[5], "https://uploads.github.com/repos/example/operations/releases/3/assets?name=proof.bin"); assert.deepEqual(upload.input, bytes); assert.ok(upload.args.includes(`Content-Length: ${bytes.length}`));
  assert.equal(calls.some(call => call.args.includes("release") || call.args.includes("upload")), false);
  let count = calls.length; await assert.rejects(run("repository-settings", { ...locator, visibility: "public" }, "different"), /accounts differ/); assert.equal(calls.length, count + 1);
  count = calls.length; await assert.rejects(run("file-delete-cas", { ...locator, filePath: "../escape", branch: "dev", expectedSha: expected, message: "delete" }, "example")); assert.equal(calls.length, count + 1);
  count = calls.length; await assert.rejects(run("asset-upload", { ...locator, releaseId: 3, name: "proof.bin", contentBase64: Buffer.alloc(524289).toString("base64") }, "example")); assert.equal(calls.length, count + 1);
  const { Readable, Writable } = require("node:stream");
  const large = Buffer.alloc(1024 * 1024, 0xe2), digest = createHash("sha256").update(large).digest("hex");
  let uploaded = 0, downloaded = 0;
  const transfer = createGithubCompatibilityRunner(async (args, _signal, source, _absent, destination) => {
    if (args[5] === "user") return JSON.stringify({ login: "example" });
    if (args[3] === "--method" && args[4] === "POST") {
      assert.ok(source instanceof Readable); assert.ok(args.includes(`Content-Length: ${large.length}`));
      for await (const chunk of source) uploaded += chunk.length;
    } else if (destination) { assert.equal(args[5], "repos/example/operations/releases/assets/10"); assert.ok(args.includes("Accept: application/octet-stream")); destination.end(large); }
    return JSON.stringify({ id: 3, assets: [] });
  });
  const source = { size: large.length, sha256: digest, open: () => Readable.from([large]) };
  await transfer("asset-upload", { ...locator, releaseId: 3, name: "large.bin", source }, "example"); assert.equal(uploaded, large.length);
  const destination = new Writable({ write(chunk, _encoding, done) { downloaded += chunk.length; done(); } });
  await transfer("asset-download", { ...locator, assetId: 10, destination }, "example"); assert.equal(downloaded, large.length);
  await assert.rejects(transfer("asset-upload", { ...locator, releaseId: 3, name: "large.bin", source, contentBase64: "YQ==" }, "example"));
});

test("GitHub private Git credential verifies the resolved token user and never accepts another host or session identity", async () => {
  const { createGithubGitCredentialResolver } = require("../../dist/main/externalProviders/githubHostingCompatibility.js");
  const { GithubHostingAdapter } = require("../../dist/main/externalProviders/githubHostingAdapter.js");
  const secret = "synthetic-private-git-value", commands = [];
  const execute = async args => { commands.push(args); return secret; };
  let login = "example";
  const request = async (url, options) => { assert.equal(url, "https://api.github.com/user"); assert.equal(options.redirect, "error"); assert.equal(options.headers.Authorization, `Bearer ${secret}`); return new Response(JSON.stringify({ login })); };
  const resolve = createGithubGitCredentialResolver(execute, request);
  assert.equal(await resolve("example"), secret); assert.deepEqual(commands[0], ["auth", "token", "--hostname", "github.com"]); assert.equal(JSON.stringify(commands).includes(secret), false);
  login = "other"; await assert.rejects(resolve("example"), /identity differs/); login = "example";
  const f = fixture({ resolveGitCredential: resolve }), adapter = new GithubHostingAdapter(f.service); await f.service.connect();
  assert.equal(await adapter.gitHttpAuthentication("https://other.example.invalid/example/operations.git"), null);
  const authentication = await adapter.gitHttpAuthentication("https://github.com/example/operations.git"); assert.equal(authentication.password, secret); assert.equal(authentication.username, "example");
  assert.equal(JSON.stringify(await adapter.providerStatus()).includes(secret), false);
  await f.service.disconnect(); assert.equal(await adapter.gitHttpAuthentication("https://github.com/example/operations.git"), null);
});

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
    compatibility: overrides.compatibility,
    resolveGitCredential: overrides.resolveGitCredential,
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
            if (overrides.invoke) return overrides.invoke(name, args);
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

test("incomplete discovered release write schemas cannot enable a mutation route", async () => {
  const f = fixture({ inventory: () => [...inventory(), tool("create_release", ["owner", "repo", "tag_name"])] });
  await f.service.connect();
  assert.equal(f.service.getStatus().capabilities.find((x) => x.capabilityId === "github.release.create").availability, "unavailable");
  await assert.rejects(f.gateways[0].invokeCapability("github", "github.release.create", { owner: "bound", repo: "project" }), /unavailable/);
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
