const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { execFileSync, spawn } = require("node:child_process");

const {
  AgentHarnessService,
} = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const {
  getRegisteredWorkspaceRegistryPath,
  RegisteredWorkspaceRegistry,
} = require("../../dist/main/agentHarness/workspace/registeredWorkspaceRegistry.js");
const { bootstrapProjectSource } = require("../../dist/main/sourceControl/projectSourceBootstrap.js");
const {
  conventionalRepositoryCheckout,
  managedRepositoryCheckouts,
  workflowRepositoryCheckout,
} = require("../../dist/main/sourceControl/repositoryCheckoutDescriptors.js");
const {
  publishRepositoryCheckoutAccess,
  revokeRepositoryCheckoutAccess,
} = require("../../dist/main/agentHarness/modelAccess/repositoryCheckoutAccessProjectionService.js");
const {
  createProjectSourceOperationCoordinator,
} = require("../../dist/main/core/projectSourceOperationCoordinator.js");

async function waitFor(predicate, message, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(message);
}

test("Project State MCP rejects redirected and malformed stores without creating registration", async t => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-inspection-path-"));
  const projectRoot = path.join(container, "Project"), peerRoot = path.join(container, "Peer");
  fs.mkdirSync(projectRoot); fs.mkdirSync(peerRoot);
  const {registerCurrentProject} = require("../../dist/main/projectState/currentProjectRegistrationService.js");
  const {inspectRegisteredProjectState} = require("../../dist/main/projectState/projectStateInspectionService.js");
  const service = new AgentHarnessService({userDataRoot: path.join(container, "harness"), allowUnauthenticatedLocal: true});
  t.after(() => fs.rmSync(container, {recursive: true, force: true}));
  const workspaceId = (await service.registerWorkspaceRoot(projectRoot)).workspace.workspaceId;
  const call = async () => {
    const result = await service.toolRegistry().callTool({name: "data_toolbox", scope: "files.read", arguments: {workspaceId, action: "status"}});
    assert.equal(result.ok, true); assert.equal(JSON.stringify(result).includes(container), false); return result.payload;
  };
  assert.equal((await call()).availability, "not-registered"); assert.equal(fs.existsSync(path.join(projectRoot, ".champcity")), false);
  await registerCurrentProject(peerRoot, "greenfield");
  fs.symlinkSync(path.join(peerRoot, ".champcity"), path.join(projectRoot, ".champcity"), "junction");
  assert.equal((await call()).availability, "unavailable");
  fs.unlinkSync(path.join(projectRoot, ".champcity")); fs.mkdirSync(path.join(projectRoot, ".champcity"));
  const databasePath = path.join(projectRoot, ".champcity", "project-state.sqlite");
  fs.mkdirSync(databasePath); assert.equal((await call()).availability, "unavailable"); fs.rmdirSync(databasePath);
  fs.writeFileSync(databasePath, "malformed fixture database");
  const before = fs.readFileSync(databasePath); assert.equal((await call()).availability, "unavailable"); assert.deepEqual(fs.readFileSync(databasePath), before);
  fs.unlinkSync(databasePath);
  // Hard links redirect file authority too, and do not need Windows symlink privileges.
  const peerFile = path.join(peerRoot, ".champcity", "project-state.sqlite");
  const peerBytes = fs.readFileSync(peerFile);
  fs.linkSync(peerFile, databasePath);
  assert.equal((await call()).availability, "unavailable"); assert.deepEqual(fs.readFileSync(peerFile), peerBytes);
  fs.unlinkSync(databasePath);
  // A redirected DB file requires symlink permission on Windows; junctions above are always exercised.
  let linked = false;
  try { fs.symlinkSync(path.join(peerRoot, ".champcity", "project-state.sqlite"), databasePath, "file"); linked = true; }
  catch (error) { if (error.code !== "EPERM") throw error; t.diagnostic("File symlink creation unavailable; directory redirect and malformed file proof passed."); }
  if (linked) { assert.equal((await call()).availability, "unavailable"); fs.unlinkSync(databasePath); }
  const sidecar = path.join(projectRoot, ".champcity", "project-state.sqlite-wal");
  fs.copyFileSync(peerFile, databasePath);
  fs.linkSync(peerFile, sidecar); assert.equal((await call()).availability, "unavailable"); fs.unlinkSync(sidecar); fs.unlinkSync(databasePath);
  assert.equal((await inspectRegisteredProjectState(projectRoot, workspaceId, "status", {})).availability, "not-registered");
});

test("registered workspace registry durably stores two exact projects and re-registration is idempotent", async () => {
  const fixture = createFixture();
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: fixture.userDataRoot });

  assert.equal((await registry.register(fixture.projectA)).workspaceId, "project_a");
  assert.equal((await registry.register(fixture.projectB)).workspaceId, "project_b");
  assert.equal((await registry.register(fixture.projectA)).workspaceId, "project_a");
  assert.deepEqual(registry.snapshot().workspaces.map((entry) => entry.workspaceId), ["project_a", "project_b"]);

  const stored = JSON.parse(fs.readFileSync(getRegisteredWorkspaceRegistryPath(fixture.userDataRoot), "utf8"));
  assert.equal(stored.schemaVersion, 1);
  assert.equal(stored.workspaces.length, 2);
  assert.deepEqual(Object.keys(stored.workspaces[0]).sort(), ["canonicalRoot", "workspaceId"]);
  assert.equal(JSON.stringify(stored).includes("needle"), false);

  const reloaded = new RegisteredWorkspaceRegistry({ userDataRoot: fixture.userDataRoot });
  await reloaded.initialize();
  assert.deepEqual(reloaded.snapshot().workspaces.map((entry) => entry.workspaceId), ["project_a", "project_b"]);
});

test("exact workspaceId selects simultaneous registered workspace access and unknown IDs fail closed", async () => {
  const fixture = createFixture();
  const service = new AgentHarnessService({ userDataRoot: fixture.userDataRoot, allowUnauthenticatedLocal: true });
  await service.registerWorkspaceRoot(fixture.projectA);
  await service.registerWorkspaceRoot(fixture.projectB);
  const tools = service.toolRegistry();

  for (const [workspaceId, expected] of [["project_a", "needle A"], ["project_b", "needle B"], ["project_a", "needle A"]]) {
    const result = await tools.callTool({
      name: "repo_toolbox",
      scope: "files.read",
      arguments: { workspaceId, action: "read_file", params: { relativePath: "README.md" } },
    });
    assert.equal(result.ok, true);
    assert.match(result.payload.content, new RegExp(expected));
  }

  const unknown = await tools.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "project_c", action: "read_file", params: { relativePath: "README.md" } },
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, "WORKSPACE_ACCESS_DENIED");

  const diagnostics = await tools.callTool({
    name: "diagnostics_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "project_a", action: "list_workspaces" },
  });
  assert.equal(diagnostics.ok, true);
  assert.deepEqual(diagnostics.payload.workspaces.map((entry) => entry.workspaceId), ["project_a", "project_b"]);
  assert.equal(diagnostics.payload.workspaces.some((entry) => Object.hasOwn(entry, "root")), false);
});

test("registered non-Git workspace preserves exact read, search, Markdown write, and non-Git status semantics", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-non-git-"));
  const workspace = path.join(container, "Plain Notes");
  fs.mkdirSync(path.join(workspace, "notes"), { recursive: true });
  fs.writeFileSync(path.join(workspace, "README.md"), "plain non-git workspace\n", "utf8");
  fs.writeFileSync(path.join(workspace, "notes", "source.md"), "non-git-search-target\n", "utf8");
  const service = new AgentHarnessService({
    userDataRoot: path.join(container, "user-data"),
    allowUnauthenticatedLocal: true,
  });
  const registration = await service.registerWorkspaceRoot(workspace);
  const tools = service.toolRegistry();

  assert.equal(registration.workspace.workspaceId, "plain_notes");
  assert.equal(registration.workspace.gitBacked, false);
  assert.deepEqual(await service.listRepositoryCheckouts("plain_notes"), []);
  const read = await tools.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "plain_notes", action: "read_file", params: { relativePath: "README.md" } },
  });
  assert.equal(read.ok, true);
  assert.match(read.payload.content, /plain non-git workspace/);

  const searched = await tools.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "plain_notes", action: "search_files", params: { query: "non-git-search-target" } },
  });
  assert.equal(searched.ok, true);
  assert.equal(searched.payload.matches[0].relativePath, "notes/source.md");

  const written = await tools.callTool({
    name: "repo_toolbox",
    scope: "files.write",
    arguments: {
      workspaceId: "plain_notes",
      action: "write_markdown_artifact",
      params: { relativePath: "notes/generated.md", content: "# Generated\n\nNon-Git write.\n" },
    },
  });
  assert.equal(written.ok, true);
  assert.match(fs.readFileSync(path.join(workspace, "notes", "generated.md"), "utf8"), /Non-Git write/);

  const gitStatus = await tools.callTool({
    name: "git_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "plain_notes", action: "status" },
  });
  assert.equal(gitStatus.ok, false);
  assert.equal(gitStatus.error.code, "REPOSITORY_CHECKOUT_REQUIRED");
});

test("non-Git Project routes Git only through a registered Dev checkout and unregister preserves it", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-checkout-"));
  const project = path.join(container, "Routing Project");
  const dev = path.join(project, "Dev");
  fs.mkdirSync(path.join(project, ".champcity"), { recursive: true });
  fs.mkdirSync(dev, { recursive: true });
  fs.writeFileSync(path.join(project, ".champcity", "mcp-workspace-binding.json"), JSON.stringify({ mcpWorkspaceId: "routing_project", gitBacked: false }));
  fs.writeFileSync(path.join(project, "README.md"), "project container root\n");
  execFileSync("git", ["init", "-b", "dev"], { cwd: dev, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: dev, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: dev, stdio: "ignore" });
  fs.writeFileSync(path.join(dev, "initial.txt"), "initial\n");
  execFileSync("git", ["add", "--all"], { cwd: dev, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: dev, stdio: "ignore" });
  fs.writeFileSync(path.join(dev, "checkout-only.txt"), "Dev checkout\n");
  const service = new AgentHarnessService({ userDataRoot: path.join(container, "user-data") });
  await service.registerWorkspaceRoot(project);
  const checkout = { repositoryCheckoutId: "routing-dev", repositoryId: "routing-repo", sourceLineId: "dev", role: "dev", projectRelativePath: "Dev" };
  const summary = await service.registerRepositoryCheckout("routing_project", checkout);
  assert.equal(summary.availability, "available");
  await assert.rejects(service.registerRepositoryCheckout("routing_project", { ...checkout, sourceLineId: "main", role: "main", projectRelativePath: "Main" }), (error) => error.code === "WORKSPACE_REGISTRY_CONFLICT");
  assert.equal(JSON.stringify(summary).includes(dev), false);
  const stored = JSON.parse(fs.readFileSync(getRegisteredWorkspaceRegistryPath(path.join(container, "user-data")), "utf8"));
  assert.deepEqual(stored.workspaces[0].repositoryCheckouts, [checkout]);
  assert.equal(JSON.stringify(stored.workspaces[0].repositoryCheckouts).includes(dev), false);
  const tools = service.toolRegistry();
  const listed = await tools.callTool({ name: "git_toolbox", scope: "files.read", arguments: { workspaceId: "routing_project", action: "list_repository_checkouts" } });
  assert.equal(listed.ok, true);
  assert.equal(listed.payload[0].repositoryCheckoutId, "routing-dev");
  const status = await tools.callTool({ name: "git_toolbox", scope: "files.read", arguments: { workspaceId: "routing_project", action: "status", params: { repositoryCheckoutId: "routing-dev" } } });
  assert.equal(status.ok, true, JSON.stringify(status.error));
  const stage = await tools.callTool({ name: "git_toolbox", scope: "files.write", arguments: { workspaceId: "routing_project", action: "stage_changes", params: { repositoryCheckoutId: "routing-dev", paths: ["checkout-only.txt"] } } });
  assert.equal(stage.ok, true, JSON.stringify(stage.error));
  assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: dev, encoding: "utf8" }).trim(), "A  checkout-only.txt");
  assert.throws(() => execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  await service.unregisterRepositoryCheckout("routing_project", "routing-dev");
  assert.equal(fs.existsSync(path.join(dev, ".git")), true);
  assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: dev, encoding: "utf8" }).trim(), "A  checkout-only.txt");
  const after = await tools.callTool({ name: "git_toolbox", scope: "files.read", arguments: { workspaceId: "routing_project", action: "status", params: { repositoryCheckoutId: "routing-dev" } } });
  assert.equal(after.ok, false);
  assert.equal(after.error.code, "REPOSITORY_CHECKOUT_REQUIRED");
});

test("registered checkout descriptor drift is unavailable and never redirects Git use", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-drift-"));
  const project = path.join(container, "Project");
  const dev = path.join(project, "Dev");
  fs.mkdirSync(dev, { recursive: true });
  execFileSync("git", ["init", "-b", "dev"], { cwd: dev, stdio: "ignore" });
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "user-data") });
  await registry.register(project);
  const descriptor = { repositoryCheckoutId: "drift-dev", repositoryId: "repo", sourceLineId: "dev", role: "dev", projectRelativePath: "Dev" };
  await registry.registerRepositoryCheckout("project", descriptor);
  const stored = registry.entries.get("project");
  stored.repositoryCheckouts[0].projectRelativePath = "../outside";
  const summaries = await registry.listRepositoryCheckoutSummaries("project");
  assert.equal(summaries[0].availability, "unavailable");
  await assert.rejects(registry.resolveRepositoryCheckoutContext("project", "drift-dev"), (error) => error.code === "GIT_CAPABILITY_UNAVAILABLE");
  assert.equal(fs.existsSync(path.join(container, "outside")), false);
});

test("generic registration stays Git-neutral while production activation provisions one deterministic conventional checkout", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-no-fallback-"));
  const project = path.join(container, "Legacy Git Project");
  fs.mkdirSync(path.join(project, ".champcity"), { recursive: true });
  fs.writeFileSync(path.join(project, ".champcity", "mcp-workspace-binding.json"), JSON.stringify({ mcpWorkspaceId: "legacy_git_project", gitBacked: true }));
  execFileSync("git", ["init", "-b", "dev"], { cwd: project, stdio: "ignore" });
  const generic = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "generic-user-data") });
  const genericRegistration = await generic.register(project);
  assert.equal(genericRegistration.gitBacked, false);
  assert.deepEqual(await generic.listRepositoryCheckoutSummaries("legacy_git_project"), []);

  const service = new AgentHarnessService({ userDataRoot: path.join(container, "user-data") });
  const registration = await service.registerWorkspaceRoot(project);
  assert.equal(registration.workspace.gitBacked, false);
  const tools = service.toolRegistry();
  const noTarget = await tools.callTool({ name: "git_toolbox", scope: "files.read", arguments: { workspaceId: "legacy_git_project", action: "status", params: {} } });
  assert.equal(noTarget.ok, false);
  assert.equal(noTarget.error.code, "REPOSITORY_CHECKOUT_REQUIRED");
  const provisioned = await service.listRepositoryCheckouts("legacy_git_project");
  assert.equal(provisioned.length, 1);
  assert.equal(provisioned[0].role, "conventional");
  assert.equal(provisioned[0].sourceLineId, "conventional");
  assert.equal(provisioned[0].projectRelativePath, ".");
  const explicitRoot = await tools.callTool({ name: "git_toolbox", scope: "files.read", arguments: { workspaceId: "legacy_git_project", action: "status", params: { repositoryCheckoutId: provisioned[0].repositoryCheckoutId } } });
  assert.equal(explicitRoot.ok, true, JSON.stringify(explicitRoot.error));
  assert.equal(explicitRoot.payload.gitBacked, true);
  await service.registerWorkspaceRoot(project);
  assert.deepEqual((await service.listRepositoryCheckouts("legacy_git_project")).map(item => item.repositoryCheckoutId), [provisioned[0].repositoryCheckoutId]);

  const dev = path.join(project, "Dev");
  fs.mkdirSync(dev);
  execFileSync("git", ["init", "-b", "dev"], { cwd: dev, stdio: "ignore" });
  const descriptor = { repositoryCheckoutId: "stale-dev", repositoryId: "repo", sourceLineId: "dev", role: "dev", projectRelativePath: "Dev" };
  await service.registerRepositoryCheckout("legacy_git_project", descriptor);
  const explicit = await tools.callTool({ name: "git_toolbox", scope: "files.read", arguments: { workspaceId: "legacy_git_project", action: "status", params: { repositoryCheckoutId: "stale-dev" } } });
  assert.equal(explicit.ok, true, JSON.stringify(explicit.error));
  fs.renameSync(dev, path.join(project, "Dev-moved"));
  const listed = await tools.callTool({ name: "git_toolbox", scope: "files.read", arguments: { workspaceId: "legacy_git_project", action: "list_repository_checkouts" } });
  assert.equal(listed.ok, true);
  assert.equal(listed.payload.find(item => item.repositoryCheckoutId === "stale-dev").availability, "unavailable");
  const stale = await tools.callTool({ name: "git_toolbox", scope: "files.read", arguments: { workspaceId: "legacy_git_project", action: "status", params: { repositoryCheckoutId: "stale-dev" } } });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, "GIT_CAPABILITY_UNAVAILABLE");
  assert.equal(stale.error.message.includes(project), false);
});

test("workspace reconciliation retires stale conventional access and restores it when exact root Git returns", async context => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-topology-reconcile-"));
  context.after(() => fs.rmSync(container, { recursive: true, force: true }));
  const project = path.join(container, "Topology Project");
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(path.join(project, ".champcity"), { recursive: true });
  fs.writeFileSync(path.join(project, ".champcity", "mcp-workspace-binding.json"),
    JSON.stringify({ mcpWorkspaceId: "topology_project", gitBacked: true }));
  execFileSync("git", ["init", "-b", "main"], { cwd: project, stdio: "ignore" });
  const service = new AgentHarnessService({ userDataRoot });

  await service.registerWorkspaceRoot(project);
  const conventional = (await service.listRepositoryCheckouts("topology_project"))[0];
  assert.equal(conventional.role, "conventional");
  const relocatedGit = path.join(project, ".git-relocated");
  fs.renameSync(path.join(project, ".git"), relocatedGit);

  await service.registerWorkspaceRoot(project);
  await service.registerWorkspaceRoot(project);
  assert.deepEqual(await service.listRepositoryCheckouts("topology_project"), []);
  fs.renameSync(relocatedGit, path.join(project, ".git"));

  await service.registerWorkspaceRoot(project);
  const restored = await service.listRepositoryCheckouts("topology_project");
  assert.deepEqual(restored.map(checkout => checkout.role), ["conventional"]);
  assert.equal(restored[0].repositoryCheckoutId, conventional.repositoryCheckoutId);
});

test("cross-process workspace reconciliation waits behind the exclusive source fence and inspects restored topology after failure", async context => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-source-fence-"));
  context.after(() => fs.rmSync(container, { recursive: true, force: true }));
  const project = path.join(container, "Fenced Project");
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(path.join(project, ".champcity"), { recursive: true });
  fs.writeFileSync(path.join(project, ".champcity", "mcp-workspace-binding.json"),
    JSON.stringify({ mcpWorkspaceId: "fenced_project", gitBacked: true }));
  execFileSync("git", ["init", "-b", "main"], { cwd: project, stdio: "ignore" });
  const coordinator = createProjectSourceOperationCoordinator({
    userDataRoot,
    acquisitionTimeoutMs: 2_000,
    staleLeaseMs: 500,
  });
  const modulePath = path.resolve(__dirname, "../../dist/main/agentHarness/runtime/agentHarnessService.js");
  const childScript = `
    const { AgentHarnessService } = require(${JSON.stringify(modulePath)});
    const service = new AgentHarnessService({ userDataRoot: process.argv[1] });
    service.registerWorkspaceRoot(process.argv[2]).then(async () => {
      const initial = await service.listRepositoryCheckouts("fenced_project");
      process.stdout.write("initial:" + JSON.stringify(initial) + "\\n");
      process.stdin.once("data", async () => {
        await service.registerWorkspaceRoot(process.argv[2]);
        const reconciled = await service.listRepositoryCheckouts("fenced_project");
        process.stdout.write("reconciled:" + JSON.stringify(reconciled) + "\\n");
        process.exit(0);
      });
    }).catch(error => { process.stderr.write(String(error)); process.exit(1); });
  `;
  const child = spawn(process.execPath, ["-e", childScript, userDataRoot, project], { stdio: ["pipe", "pipe", "pipe"] });
  context.after(() => { if (child.exitCode === null) child.kill(); });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += chunk.toString(); });
  child.stderr.on("data", chunk => { stderr += chunk.toString(); });
  await waitFor(() => stdout.includes("initial:"), `child Agent Harness registration failed: ${stderr}`);
  const initial = JSON.parse(stdout.split(/\r?\n/).find(line => line.startsWith("initial:")).slice("initial:".length));
  const conventionalId = initial[0].repositoryCheckoutId;
  const exclusive = await coordinator.acquireExclusive(project, "synthetic-desktop-conversion");
  const relocatedGit = path.join(project, ".git-conversion-in-progress");
  fs.renameSync(path.join(project, ".git"), relocatedGit);
  child.stdin.write("reconcile\n");
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(stdout.includes("reconciled:"), false);

  fs.renameSync(relocatedGit, path.join(project, ".git"));
  await exclusive.release();
  await waitFor(() => stdout.includes("reconciled:"), `child reconciliation did not resume: ${stderr}`);
  const afterFailure = JSON.parse(stdout.split(/\r?\n/).find(line => line.startsWith("reconciled:")).slice("reconciled:".length));
  assert.deepEqual(afterFailure.map(checkout => checkout.role), ["conventional"]);
  assert.equal(afterFailure[0].repositoryCheckoutId, conventionalId);
  await waitFor(() => child.exitCode !== null, `child Agent Harness did not exit: ${stderr}`);
  assert.equal(child.exitCode, 0, stderr);
});

test("application projection publishes, discovers, revokes, and fails independently of managed Git", async context => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-model-access-projection-"));
  context.after(() => fs.rmSync(container, { recursive: true, force: true }));
  const project = path.join(container, "Projection Project");
  fs.mkdirSync(project);
  const source = await bootstrapProjectSource(project, "projection-repository");
  const service = new AgentHarnessService({ userDataRoot: path.join(container, "user-data") });
  const registered = await service.registerWorkspaceRoot(project);
  const workspaceId = registered.workspace.workspaceId;
  const projection = {
    registerRepositoryCheckout: (id, checkout) => service.registerRepositoryCheckout(id, checkout),
    unregisterRepositoryCheckout: (id, checkoutId) => service.unregisterRepositoryCheckout(id, checkoutId),
  };
  const expected = managedRepositoryCheckouts("projection-repository");
  assert.deepEqual(source.mainCheckout, expected.mainCheckout);
  assert.deepEqual(source.devCheckout, expected.devCheckout);
  assert.deepEqual(conventionalRepositoryCheckout(workspaceId), conventionalRepositoryCheckout(workspaceId));
  assert.deepEqual(workflowRepositoryCheckout("projection-repository", "11111111-1111-4111-8111-111111111111"),
    workflowRepositoryCheckout("projection-repository", "11111111-1111-4111-8111-111111111111"));

  await publishRepositoryCheckoutAccess(workspaceId, [source.mainCheckout, source.devCheckout], projection);
  await publishRepositoryCheckoutAccess(workspaceId, [source.mainCheckout, source.devCheckout], projection);
  const tools = service.toolRegistry();
  const discovered = await tools.callTool({ name: "git_toolbox", scope: "files.read",
    arguments: { workspaceId, action: "list_repository_checkouts" } });
  assert.equal(discovered.ok, true);
  assert.deepEqual(discovered.payload.map(item => item.role).sort(), ["dev", "main"]);

  const mainRoot = path.join(project, "Main");
  const devRoot = path.join(project, "Dev");
  const before = [execFileSync("git", ["rev-parse", "HEAD"], { cwd: mainRoot, encoding: "utf8" }).trim(),
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: devRoot, encoding: "utf8" }).trim()];
  await revokeRepositoryCheckoutAccess(workspaceId, [source.mainCheckout, source.devCheckout], projection);
  const revoked = await tools.callTool({ name: "git_toolbox", scope: "files.read",
    arguments: { workspaceId, action: "list_repository_checkouts" } });
  assert.deepEqual(revoked.payload, []);
  assert.deepEqual([execFileSync("git", ["rev-parse", "HEAD"], { cwd: mainRoot, encoding: "utf8" }).trim(),
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: devRoot, encoding: "utf8" }).trim()], before);

  await assert.rejects(publishRepositoryCheckoutAccess(workspaceId, [source.mainCheckout], {
    registerRepositoryCheckout: async () => { throw new Error("synthetic Agent Harness outage"); },
  }), /synthetic Agent Harness outage/);
  assert.deepEqual([execFileSync("git", ["rev-parse", "HEAD"], { cwd: mainRoot, encoding: "utf8" }).trim(),
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: devRoot, encoding: "utf8" }).trim()], before);
  assert.equal(fs.existsSync(path.join(project, ".git")), false);
});

test("checkout retirement rejects new repository operations, drains an active lease, and leaves workspace reads available", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-retire-"));
  const project = path.join(container, "Retirement Project");
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, "README.md"), "workspace remains readable\n");
  execFileSync("git", ["init", "-b", "main"], { cwd: project, stdio: "ignore" });
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "user-data") });
  await registry.register(project);
  const checkout = { repositoryCheckoutId: "retire-root", repositoryId: "repo", sourceLineId: "conventional", role: "conventional", projectRelativePath: "." };
  await registry.registerRepositoryCheckout("retirement_project", checkout);
  const lease = await registry.resolveRepositoryCheckoutContext("retirement_project", "retire-root");
  let retired = false;
  const retirement = registry.unregisterRepositoryCheckout("retirement_project", "retire-root", 2_000).then(() => { retired = true; });
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(retired, false);
  await assert.rejects(registry.resolveRepositoryCheckoutContext("retirement_project", "retire-root"), error => error.code === "REPOSITORY_CHECKOUT_RETIRING");
  assert.equal((await registry.resolve("retirement_project")).gitBacked, false);
  lease.release();
  await retirement;
  assert.deepEqual(await registry.listRepositoryCheckoutSummaries("retirement_project"), []);
  assert.equal(fs.readFileSync(path.join(project, "README.md"), "utf8"), "workspace remains readable\n");
});

test("checkout resolution reserves before asynchronous validation and retirement closes the gate", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-overlap-"));
  const project = path.join(container, "Overlap Project");
  fs.mkdirSync(project, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: project, stdio: "ignore" });
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "user-data") });
  await registry.register(project);
  const checkout = { repositoryCheckoutId: "overlap-root", repositoryId: "repo", sourceLineId: "conventional", role: "conventional", projectRelativePath: "." };
  await registry.registerRepositoryCheckout("overlap_project", checkout);

  const originalValidation = registry.validateCheckoutRoot.bind(registry);
  let enterValidation;
  const validationEntered = new Promise(resolve => { enterValidation = resolve; });
  let continueValidation;
  const validationGate = new Promise(resolve => { continueValidation = resolve; });
  registry.validateCheckoutRoot = async root => {
    enterValidation();
    await validationGate;
    return originalValidation(root);
  };
  const resolving = registry.resolveRepositoryCheckoutContext("overlap_project", "overlap-root");
  await validationEntered;
  let retired = false;
  const retirement = registry.unregisterRepositoryCheckout("overlap_project", "overlap-root", 2_000).then(() => { retired = true; });
  await assert.rejects(registry.resolveRepositoryCheckoutContext("overlap_project", "overlap-root"), error => error.code === "REPOSITORY_CHECKOUT_RETIRING");
  continueValidation();
  const lease = await resolving;
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(retired, false);
  lease.release();
  await retirement;
  assert.equal(retired, true);
});

test("validation failure releases its reservation exactly once", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-validation-failure-"));
  const project = path.join(container, "Validation Project");
  fs.mkdirSync(project, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: project, stdio: "ignore" });
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "user-data") });
  await registry.register(project);
  const checkout = { repositoryCheckoutId: "validation-root", repositoryId: "repo", sourceLineId: "conventional", role: "conventional", projectRelativePath: "." };
  await registry.registerRepositoryCheckout("validation_project", checkout);
  const originalValidation = registry.validateCheckoutRoot.bind(registry);
  registry.validateCheckoutRoot = async () => { throw new Error("synthetic validation failure"); };
  await assert.rejects(registry.resolveRepositoryCheckoutContext("validation_project", "validation-root"), error => error.code === "GIT_CAPABILITY_UNAVAILABLE");
  const runtime = registry.checkoutRuntime.get("validation_project\0validation-root");
  assert.equal(runtime.activeOperations, 0);
  assert.equal(runtime.drainWaiters.size, 0);
  registry.validateCheckoutRoot = originalValidation;
  await registry.unregisterRepositoryCheckout("validation_project", "validation-root", 50);
});

test("retirement timeout restores immediate Git use and a later retirement succeeds", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-timeout-"));
  const project = path.join(container, "Timeout Project");
  fs.mkdirSync(project, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: project, stdio: "ignore" });
  const service = new AgentHarnessService({ userDataRoot: path.join(container, "user-data") });
  await service.registerWorkspaceRoot(project);
  const [checkout] = await service.listRepositoryCheckouts("timeout_project");
  const registry = service.workspaceRegistry;
  const held = await registry.resolveRepositoryCheckoutContext("timeout_project", checkout.repositoryCheckoutId);
  await assert.rejects(registry.unregisterRepositoryCheckout("timeout_project", checkout.repositoryCheckoutId, 10), error => error.code === "REPOSITORY_CHECKOUT_RETIRING");
  const runtime = registry.checkoutRuntime.get(`timeout_project\0${checkout.repositoryCheckoutId}`);
  assert.equal(runtime.state, "available");
  assert.equal(runtime.drainWaiters.size, 0);
  const status = await service.toolRegistry().callTool({ name: "git_toolbox", scope: "files.read",
    arguments: { workspaceId: "timeout_project", action: "status", params: { repositoryCheckoutId: checkout.repositoryCheckoutId } } });
  assert.equal(status.ok, true, JSON.stringify(status.error));
  held.release();
  await registry.unregisterRepositoryCheckout("timeout_project", checkout.repositoryCheckoutId, 50);
  assert.deepEqual(await registry.listRepositoryCheckoutSummaries("timeout_project"), []);
});

test("persistent unregister failure restores available registered authority", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-persist-failure-"));
  const project = path.join(container, "Persistence Project");
  fs.mkdirSync(project, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: project, stdio: "ignore" });
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "user-data") });
  await registry.register(project);
  const checkout = { repositoryCheckoutId: "persistence-root", repositoryId: "repo", sourceLineId: "conventional", role: "conventional", projectRelativePath: "." };
  await registry.registerRepositoryCheckout("persistence_project", checkout);
  const originalPersist = registry.persist.bind(registry);
  let failOnce = true;
  registry.persist = entries => {
    if (failOnce) { failOnce = false; throw new Error("synthetic persistence failure"); }
    return originalPersist(entries);
  };
  await assert.rejects(registry.unregisterRepositoryCheckout("persistence_project", "persistence-root", 50), /synthetic persistence failure/);
  const runtime = registry.checkoutRuntime.get("persistence_project\0persistence-root");
  assert.equal(runtime.state, "available");
  const lease = await registry.resolveRepositoryCheckoutContext("persistence_project", "persistence-root");
  lease.release();
  assert.equal((await registry.listRepositoryCheckoutSummaries("persistence_project"))[0].availability, "available");
  await registry.unregisterRepositoryCheckout("persistence_project", "persistence-root", 50);
});

test("service initialization reconciles persisted conventional workspaces idempotently", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-reconcile-"));
  const project = path.join(container, "Persisted Project");
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(project, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: project, stdio: "ignore" });
  const oldRegistry = new RegisteredWorkspaceRegistry({ userDataRoot });
  await oldRegistry.register(project);
  assert.deepEqual(await oldRegistry.listRepositoryCheckoutSummaries("persisted_project"), []);

  const first = new AgentHarnessService({ userDataRoot });
  await first.initialize();
  const firstCheckouts = await first.listRepositoryCheckouts("persisted_project");
  assert.equal(firstCheckouts.length, 1);
  assert.equal(firstCheckouts[0].role, "conventional");
  const second = new AgentHarnessService({ userDataRoot });
  await second.initialize();
  assert.deepEqual((await second.listRepositoryCheckouts("persisted_project")).map(item => item.repositoryCheckoutId),
    [firstCheckouts[0].repositoryCheckoutId]);
});

test("workspace ID collisions are rejected without replacing the original registration", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-collision-"));
  const first = path.join(container, "one", "Same Project");
  const second = path.join(container, "two", "Same Project");
  createProject(first, "first");
  createProject(second, "second");
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "user-data") });

  await registry.register(first);
  await assert.rejects(registry.register(second), (error) => error.code === "WORKSPACE_REGISTRY_CONFLICT");
  assert.match(fs.readFileSync((await registry.resolve("same_project")).root + path.sep + "README.md", "utf8"), /first/);
  assert.equal(registry.snapshot().workspaces.length, 1);
});

test("unavailable roots and malformed registry data fail closed without deleting registration", async () => {
  const fixture = createFixture();
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: fixture.userDataRoot });
  await registry.register(fixture.projectA);
  const moved = `${fixture.projectA}-moved`;
  fs.renameSync(fixture.projectA, moved);

  await assert.rejects(registry.resolve("project_a"), (error) => error.code === "WORKSPACE_UNAVAILABLE");
  assert.equal(registry.snapshot().workspaces[0].availability, "unavailable");
  assert.equal(JSON.parse(fs.readFileSync(getRegisteredWorkspaceRegistryPath(fixture.userDataRoot), "utf8")).workspaces.length, 1);

  const corruptRoot = path.join(fixture.container, "corrupt-user-data");
  const corruptPath = getRegisteredWorkspaceRegistryPath(corruptRoot);
  fs.mkdirSync(path.dirname(corruptPath), { recursive: true });
  fs.writeFileSync(corruptPath, "{not-json", "utf8");
  const corrupt = new RegisteredWorkspaceRegistry({ userDataRoot: corruptRoot });
  assert.equal(corrupt.snapshot().state, "failed");
  await assert.rejects(corrupt.resolve("project_a"), (error) => error.code === "WORKSPACE_REGISTRY_INVALID");
  await assert.rejects(corrupt.register(moved), (error) => error.code === "WORKSPACE_REGISTRY_INVALID");
});

function createFixture() {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-"));
  const projectA = path.join(container, "Project A");
  const projectB = path.join(container, "Project B");
  createProject(projectA, "needle A");
  createProject(projectB, "needle B");
  return { container, projectA, projectB, userDataRoot: path.join(container, "user-data") };
}

function createProject(root, content) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), `${content}\n`, "utf8");
}
