const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const {
  createReleaseToolbox,
  isValidSemver,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/release/releaseToolbox.js"));
const {
  createAgentHarnessToolRegistry,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/tools/toolRegistry.js"));

test("production command adapter fixes executables, arguments, deadlines, and safe receipt paths", async (t) => {
  const { EventEmitter } = require("node:events");
  const { PassThrough } = require("node:stream");
  const { createRequire } = require("node:module");
  const vm = require("node:vm");
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-command-adapter-"));
  t.after(() => fs.rmSync(container, { recursive: true, force: true }));
  const toolchain = path.join(container, "toolchain");
  const npmRoot = path.join(toolchain, "node_modules/npm");
  fs.mkdirSync(path.join(npmRoot, "bin"), { recursive: true });
  fs.writeFileSync(path.join(toolchain, "node.exe"), "synthetic executable; never launched");
  fs.writeFileSync(path.join(npmRoot, "package.json"), JSON.stringify({ name: "npm", bin: { npm: "bin/npm-cli.js" } }));
  fs.writeFileSync(path.join(npmRoot, "bin/npm-cli.js"), "// synthetic CLI; never launched\n");
  const root = path.join(container, "repository");
  const temporaryDirectory = path.join(container, "download");
  const spawns = [];
  const timers = [];
  let currentChild;
  const entry = path.join(repositoryRoot, "dist/main/agentHarness/release/releaseCommandAdapter.js");
  const nativeRequire = createRequire(entry);
  const exports = {};
  vm.runInNewContext(fs.readFileSync(entry, "utf8"), {
    exports, Buffer,
    process: { platform: "win32", execPath: path.join(toolchain, "node.exe"), env: { PATH: toolchain } },
    setTimeout: (callback, milliseconds) => {
      const timer = { callback, milliseconds, cleared: false, unref() {} };
      timers.push(timer);
      return timer;
    },
    clearTimeout: (timer) => { timer.cleared = true; },
    require: (id) => id === "node:child_process" ? {
      spawnSync: (executable, args, options) => {
        assert.equal(executable, path.join(toolchain, "node.exe"));
        assert.equal(options.shell, false);
        assert.equal(options.env.ELECTRON_RUN_AS_NODE, undefined);
        return { status: 0, stdout: JSON.stringify({ releaseName: "node", electron: false }) };
      },
      spawn: (executable, args, options) => {
        spawns.push({ executable, args: Array.from(args), options });
        if (executable === "taskkill") {
          const killer = new EventEmitter();
          killer.unref = () => {};
          currentChild.exitCode = 1;
          queueMicrotask(() => currentChild.emit("close", 1));
          return killer;
        }
        const child = new EventEmitter();
        child.stdout = new PassThrough();
        child.stderr = new PassThrough();
        child.exitCode = null;
        child.pid = 4321;
        currentChild = child;
        return child;
      },
    } : nativeRequire(id),
  });

  const common = { root, repository: "Example/Fixture", tagName: "v1.2.3" };
  for (const [request, executable, args, publicArgs] of [
    [{ id: "npm-test-release" }, path.join(toolchain, "node.exe"), [path.join(npmRoot, "bin/npm-cli.js"), "run", "test:release"], ["run", "test:release"]],
    [{ id: "npm-run-build" }, path.join(toolchain, "node.exe"), [path.join(npmRoot, "bin/npm-cli.js"), "run", "build"], ["run", "build"]],
    [{ id: "git-diff-check" }, "git", ["diff", "--check"]],
    [{ id: "gh-release-upload", installerPath: path.join(root, "release/setup.exe"), installerRelativePath: "release/setup.exe" }, "gh", ["release", "upload", "v1.2.3", path.join(root, "release/setup.exe"), "--repo", "Example/Fixture"], ["release", "upload", "v1.2.3", "release/setup.exe", "--repo", "Example/Fixture"]],
    [{ id: "gh-release-download", assetName: "setup.exe", temporaryDirectory }, "gh", ["release", "download", "v1.2.3", "--repo", "Example/Fixture", "--pattern", "setup.exe", "--dir", temporaryDirectory], ["release", "download", "v1.2.3", "--repo", "Example/Fixture", "--pattern", "setup.exe", "--dir", "<OS_TEMP>"]],
  ]) {
    const pending = exports.runFixedReleaseCommand({ ...common, ...request });
    const invocation = spawns.at(-1);
    assert.equal(invocation.executable, executable);
    assert.deepEqual(invocation.args, args);
    assert.equal(invocation.options.shell, false);
    assert.equal(invocation.options.windowsHide, true);
    assert.equal(invocation.options.cwd, root);
    assert.equal(invocation.args.some((arg) => ["--clobber", "--cleanup-tag", "delete-asset"].includes(arg)), false);
    currentChild.stdout.write(`output ${root} ${root.replace(/\\/g, "/")}`);
    currentChild.stderr.write(`error ${root}`);
    currentChild.exitCode = 0;
    currentChild.emit("close", 0);
    const receipt = await pending;
    assert.equal(receipt.status, "succeeded");
    assert.deepEqual(Array.from(receipt.command.args), publicArgs ?? args);
    assert.equal(receipt.command.executable, request.id.startsWith("npm-") ? "npm" : executable);
    assert.equal(receipt.stdout, "output <COMMAND_CWD> <COMMAND_CWD>");
    assert.equal(receipt.stderr, "error <COMMAND_CWD>");
    assert.equal(timers.at(-1).cleared, true);
    assert.equal(JSON.stringify(receipt).includes(container), false);
  }
  const timedOut = exports.runFixedReleaseCommand({ ...common, id: "gh-release-upload", installerPath: path.join(root, "setup.exe"), installerRelativePath: "setup.exe" });
  const deadline = timers.at(-1);
  assert.equal(deadline.milliseconds, 30 * 60_000);
  deadline.callback();
  assert.equal((await timedOut).status, "timeout");
  assert.deepEqual(spawns.at(-1).args, ["/pid", "4321", "/t", "/f"]);
  assert.equal(spawns.at(-1).executable, "taskkill");
  assert.equal(spawns.at(-1).options.shell, false);
});

test("release_toolbox publishes exact read/write-scoped actions with no raw command surface", async () => {
  const root = createReleaseWorkspace("0.1.0-beta.2");
  const calls = [];
  const releaseToolbox = Object.fromEntries([
    ["status", async (...args) => recordCall(calls, "status", args)],
    ["setVersion", async (...args) => recordCall(calls, "setVersion", args)],
    ["validateCandidate", async (...args) => recordCall(calls, "validateCandidate", args)],
    ["buildWindowsRelease", async (...args) => recordCall(calls, "buildWindowsRelease", args)],
    ["inspectReleaseArtifact", async (...args) => recordCall(calls, "inspectReleaseArtifact", args)],
    ["publishGithubRelease", async (...args) => recordCall(calls, "publishGithubRelease", args)],
    ["abandonGithubDraftRelease", async (...args) => recordCall(calls, "abandonGithubDraftRelease", args)],
    ["verifyGithubRelease", async (...args) => recordCall(calls, "verifyGithubRelease", args)],
  ]);
  const context = {
    workspaceId: "release-fixture",
    root,
    repositoryName: "Fixture/Release",
    gitBacked: true,
    capabilities: {
      filesystemRead: true,
      artifactWrite: true,
      patchWorkflow: true,
      gitInspection: true,
    },
  };
  const registry = createAgentHarnessToolRegistry({
    workspaceAccess: {
      resolveWorkspaceContext(workspaceId) {
        if (workspaceId !== context.workspaceId) {
          throw new Error("foreign workspace");
        }
        return context;
      },
      listWorkspaceSummaries: () => [],
    },
    userDataRoot: path.join(root, "user-data"),
    releaseToolbox,
  });

  const readTool = registry.listTools("files.read").find((entry) => entry.name === "release_toolbox");
  const writeTool = registry.listTools("files.write").find((entry) => entry.name === "release_toolbox");
  const fullTool = registry.listTools("files.read files.write").find((entry) => entry.name === "release_toolbox");
  assert.deepEqual(readTool.actions, ["status", "inspect_release_artifact", "verify_github_release"]);
  assert.deepEqual(writeTool.actions, ["set_version", "validate_candidate", "build_windows_release", "publish_github_release", "abandon_github_draft_release"]);
  assert.deepEqual(fullTool.actions, [
    "status",
    "set_version",
    "validate_candidate",
    "build_windows_release",
    "inspect_release_artifact",
    "publish_github_release",
    "abandon_github_draft_release",
    "verify_github_release",
  ]);
  assert.equal(readTool.readOnly, true);
  assert.equal(fullTool.readOnly, false);
  assert.equal(fullTool.inputZodSchema.safeParse({
    workspaceId: context.workspaceId,
    action: "set_version",
    params: { version: "0.1.0-beta.3" },
  }).success, true);
  for (const rejected of [
    { workspaceId: context.workspaceId, action: "set_version", params: { version: "0.1.0", command: "whoami" } },
    { workspaceId: context.workspaceId, action: "validate_candidate", params: { args: ["run", "anything"] } },
    { workspaceId: context.workspaceId, action: "build_windows_release", params: { cwd: "C:/" } },
    { workspaceId: context.workspaceId, action: "publish_github_release", params: { tagName: "v0.1.0", token: "x" } },
    { workspaceId: context.workspaceId, action: "raw_command", params: { executable: "cmd.exe" } },
    { workspaceId: context.workspaceId, action: "inspect_release_artifact", params: { relativePath: "README.md" } },
  ]) {
    assert.equal(fullTool.inputZodSchema.safeParse(rejected).success, false);
  }

  const denied = await registry.callTool({
    name: "release_toolbox",
    arguments: { workspaceId: context.workspaceId, action: "set_version", params: { version: "0.1.0-beta.3" } },
    scope: "files.read",
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, "OAUTH_SCOPE_DENIED");
  const dispatched = await registry.callTool({
    name: "release_toolbox",
    arguments: { workspaceId: context.workspaceId, action: "publish_github_release", params: { tagName: "v0.1.0-beta.2" } },
    scope: "files.write",
  });
  assert.equal(dispatched.ok, true);
  assert.deepEqual(calls.at(-1), {
    action: "publishGithubRelease",
    args: [root, true, "v0.1.0-beta.2"],
  });
  const abandonment = { workspaceId: context.workspaceId, action: "abandon_github_draft_release", params: { tagName: "v0.1.0-beta.2" } };
  assert.equal(fullTool.inputZodSchema.safeParse(abandonment).success, true);
  for (const extra of ["repository", "command", "args", "token", "executable", "timeout", "cwd", "environment", "assetPath", "cleanupTag"]) {
    assert.equal(fullTool.inputZodSchema.safeParse({ ...abandonment, params: { ...abandonment.params, [extra]: "forbidden" } }).success, false);
  }
  assert.equal(fullTool.inputZodSchema.safeParse({ ...abandonment, params: {} }).success, false);
  const abandoned = await registry.callTool({ name: "release_toolbox", arguments: abandonment, scope: "files.write" });
  assert.equal(abandoned.ok, true);
  assert.deepEqual(calls.at(-1), { action: "abandonGithubDraftRelease", args: [root, true, "v0.1.0-beta.2"] });
  const beforeDeniedCalls = calls.length;
  assert.equal((await registry.callTool({ name: "release_toolbox", arguments: abandonment, scope: "files.read" })).error.code, "OAUTH_SCOPE_DENIED");
  assert.equal((await registry.callTool({ name: "release_toolbox", arguments: { ...abandonment, workspaceId: "foreign" }, scope: "files.write" })).ok, false);
  context.gitBacked = false;
  releaseToolbox.abandonGithubDraftRelease = createReleaseToolbox().abandonGithubDraftRelease;
  assert.equal((await registry.callTool({ name: "release_toolbox", arguments: abandonment, scope: "files.write" })).error.code, "GIT_CAPABILITY_UNAVAILABLE");
  assert.equal(calls.length, beforeDeniedCalls);
});

test("SemVer and set_version are bounded to a validated version and npm-owned version files", async () => {
  for (const value of ["0.1.0-beta.3", "1.2.3", "1.2.3-rc.1", "1.2.3+build.7"]) {
    assert.equal(isValidSemver(value), true, value);
  }
  for (const value of ["01.2.3", "1.02.3", "1.2.03", "1.2", "v1.2.3", "1.2.3-01", "1.2.3 beta"]) {
    assert.equal(isValidSemver(value), false, value);
  }

  const root = createReleaseWorkspace("0.1.0-beta.2");
  const requests = [];
  const service = createReleaseToolbox({
    commandRunner: async (request) => {
      requests.push(request);
      assert.equal(request.id, "npm-set-version");
      const packageJson = readJson(path.join(root, "package.json"));
      packageJson.version = request.version;
      fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
      const lock = readJson(path.join(root, "package-lock.json"));
      lock.version = request.version;
      lock.packages[""].version = request.version;
      fs.writeFileSync(path.join(root, "package-lock.json"), `${JSON.stringify(lock, null, 2)}\n`);
      return receipt(request.id);
    },
  });
  const result = await service.setVersion(root, "0.1.0-beta.3");
  assert.equal(result.requestedVersion, "0.1.0-beta.3");
  assert.equal(result.effectiveVersion, "0.1.0-beta.3");
  assert.deepEqual(result.changedVersionFiles, ["package.json", "package-lock.json"]);
  assert.deepEqual(requests.map((entry) => entry.id), ["npm-set-version"]);
  await assert.rejects(() => service.setVersion(root, "0.1.0-beta.03"), (error) => error.code === "INVALID_INPUT");
  assert.equal(requests.length, 1);
});

test("status reports bounded prerequisites without returning raw GitHub authentication output", async () => {
  const version = "0.1.0-beta.3";
  const root = createReleaseWorkspace(version);
  writeCanonicalArtifacts(root, version, Buffer.from("installer"));
  const service = createReleaseToolbox({
    commandRunner: async (request) => {
      switch (request.id) {
        case "git-origin-url": return receipt(request.id, { stdout: "https://github.com/ChampCityChris/ChampCity_AI.git\n" });
        case "gh-version": return receipt(request.id, { stdout: "gh version 2.test\n" });
        case "gh-auth-status": return receipt(request.id, { stderr: "sensitive raw authentication status must not escape\n" });
        default: throw new Error(`Unexpected command ${request.id}`);
      }
    },
  });
  const status = await service.status(root, true);
  assert.equal(status.packageVersion, version);
  assert.equal(status.expectedInstallerPath, `release/ChampCityAI-Setup-${version}.exe`);
  assert.equal(status.installerExists, true);
  assert.deepEqual(status.githubRemote, { resolvesToGithub: true, repository: "ChampCityChris/ChampCity_AI" });
  assert.deepEqual(status.githubCli, { installed: true, authenticated: true });
  assert.equal(status.latestCandidateValidation, null);
  assert.deepEqual(status.supportedActions, [
    "status",
    "set_version",
    "validate_candidate",
    "build_windows_release",
    "inspect_release_artifact",
    "publish_github_release",
    "abandon_github_draft_release",
    "verify_github_release",
  ]);
  assert.doesNotMatch(JSON.stringify(status), /sensitive raw authentication/i);
});

test("status recovers the latest completed candidate validation and its safe receipts", async () => {
  const root = createReleaseWorkspace("0.1.0-beta.3");
  const otherRoot = createReleaseWorkspace("0.1.0-beta.3");
  const validationRequests = [];
  const service = createReleaseToolbox({
    commandRunner: async (request) => {
      validationRequests.push(request);
      switch (request.id) {
        case "git-origin-url":
          return receipt(request.id, { stdout: "https://github.com/ChampCityChris/ChampCity_AI.git\n" });
        case "gh-version":
          return receipt(request.id, { stdout: "gh version 2.test\n" });
        case "gh-auth-status":
          return receipt(request.id);
        default:
          return receipt(request.id, { stdout: `safe receipt for ${request.id}\n` });
      }
    },
  });

  const completed = await service.validateCandidate(root);
  assert.match(completed.validationId, /^validation_[0-9a-f-]{36}$/i);
  assert.equal(completed.passed, true);
  assert.equal(completed.commandReceipts.length, 4);
  assert.match(completed.candidateSnapshot.sourceHead, /^[0-9a-f]{40,64}$/);
  assert.match(completed.candidateSnapshot.candidateDigest, /^[0-9a-f]{64}$/);
  assert.equal(completed.candidateSnapshot.cleanupStatus, "succeeded");
  assert.ok(Date.parse(completed.startedAt));
  assert.ok(Date.parse(completed.completedAt));
  const npmRequests = validationRequests.filter((entry) => entry.id.startsWith("npm"));
  const gitRequests = validationRequests.filter((entry) => entry.id === "git-diff-check" || entry.id === "git-status-short");
  assert.equal(npmRequests.length, 2);
  assert.ok(npmRequests.every((entry) => normalize(entry.root) === normalize(npmRequests[0].root)));
  assert.notEqual(normalize(npmRequests[0].root), normalize(root));
  assert.equal(fs.existsSync(npmRequests[0].root), false);
  assert.deepEqual(gitRequests.map((entry) => normalize(entry.root)), [normalize(root), normalize(root)]);

  const status = await service.status(root, true);
  assert.deepEqual(status.latestCandidateValidation, completed);
  assert.deepEqual(
    status.latestCandidateValidation.commandReceipts.map((entry) => entry.commandId),
    ["npm-ci", "npm-test-release", "git-diff-check", "git-status-short"],
  );
  const otherStatus = await service.status(otherRoot, true);
  assert.equal(otherStatus.latestCandidateValidation, null);
});

test("validation and Windows packaging execute only fixed ordered sequences and stop on failure", async () => {
  const root = createReleaseWorkspace("0.1.0-beta.3");
  const sourceSentinel = path.join(root, "node_modules", "electron", "dist", "resources", "default_app.asar");
  fs.mkdirSync(path.dirname(sourceSentinel), { recursive: true });
  fs.writeFileSync(sourceSentinel, "source dependency sentinel");
  const validationRequests = [];
  let candidateRoot;
  const validationService = createReleaseToolbox({
    commandRunner: async (request) => {
      validationRequests.push({ id: request.id, root: request.root });
      if (request.id.startsWith("npm")) {
        candidateRoot = request.root;
        assert.notEqual(normalize(request.root), normalize(root));
        assert.equal(fs.existsSync(path.join(request.root, "node_modules")), false);
      }
      return receipt(request.id, request.id === "npm-test-release" ? { status: "nonzero", exitCode: 2 } : {});
    },
  });
  const validation = await validationService.validateCandidate(root);
  assert.equal(validation.passed, false);
  assert.equal(validation.failedCommand, "npm-test-release");
  assert.equal(validation.failedPhase, "npm-validation");
  assert.deepEqual(validationRequests.map((entry) => entry.id), ["npm-ci", "npm-test-release"]);
  assert.ok(validationRequests.every((entry) => normalize(entry.root) === normalize(candidateRoot)));
  assert.equal(validation.commandReceipts.length, 2);
  assert.equal(validation.candidateSnapshot.cleanupStatus, "succeeded");
  assert.equal(fs.existsSync(candidateRoot), false);
  assert.equal(fs.readFileSync(sourceSentinel, "utf8"), "source dependency sentinel");

  writeCanonicalArtifacts(root, "0.1.0-beta.3", Buffer.from("installer bytes"));
  const packageRequests = [];
  const packageService = createReleaseToolbox({
    commandRunner: async (request) => {
      packageRequests.push(request.id);
      return receipt(request.id);
    },
  });
  const packaged = await packageService.buildWindowsRelease(root);
  assert.equal(packaged.passed, true);
  assert.deepEqual(packageRequests, ["npm-package-win-dir", "npm-package-win", "npm-validate-package-win"]);
  assert.equal(packaged.installerPath, "release/ChampCityAI-Setup-0.1.0-beta.3.exe");
  assert.equal(packaged.installerSizeBytes, Buffer.byteLength("installer bytes"));
  assert.equal(packaged.installerSha256, sha256(Buffer.from("installer bytes")));

  const inspected = await packageService.inspectReleaseArtifact(root);
  assert.deepEqual(inspected, {
    packageVersion: "0.1.0-beta.3",
    exists: true,
    relativePath: "release/ChampCityAI-Setup-0.1.0-beta.3.exe",
    sizeBytes: Buffer.byteLength("installer bytes"),
    sha256: sha256(Buffer.from("installer bytes")),
  });
});

test("validation cleans its isolated workspace on timeout and thrown command error", async () => {
  const timeoutRoot = createReleaseWorkspace("0.1.0-beta.3");
  let timedOutCandidateRoot;
  const timeoutService = createReleaseToolbox({
    commandRunner: async (request) => {
      timedOutCandidateRoot = request.root;
      return receipt(request.id, { status: "timeout", exitCode: null });
    },
  });
  const timedOut = await timeoutService.validateCandidate(timeoutRoot);
  assert.equal(timedOut.passed, false);
  assert.equal(timedOut.failedCommand, "npm-ci");
  assert.equal(timedOut.candidateSnapshot.cleanupStatus, "succeeded");
  assert.equal(fs.existsSync(timedOutCandidateRoot), false);

  const errorRoot = createReleaseWorkspace("0.1.0-beta.3");
  let errorCandidateRoot;
  const errorService = createReleaseToolbox({
    commandRunner: async (request) => {
      errorCandidateRoot = request.root;
      throw new Error("simulated runner failure");
    },
  });
  const failed = await errorService.validateCandidate(errorRoot);
  assert.equal(failed.passed, false);
  assert.equal(failed.failedPhase, "npm-validation");
  assert.equal(failed.failure.code, "RUNTIME_ERROR");
  assert.equal(fs.existsSync(errorCandidateRoot), false);
  assert.doesNotMatch(JSON.stringify(failed), new RegExp(escapeRegex(errorRoot), "i"));
  assert.doesNotMatch(JSON.stringify(failed), /champcity-candidate-validation-/i);
});

test("absent publication creates metadata, re-inspects, uploads the canonical asset, and confirms completion", async () => {
  const context = createPublicationContext();
  const requests = [];
  const incomplete = publicationView(context, { assets: [] });
  const complete = publicationView(context);
  const service = createReleaseToolbox({
    commandRunner: publicationRunner({
      ...context,
      requests,
      releaseViews: ["absent", incomplete, complete],
    }),
  });

  await assert.rejects(
    () => service.publishGithubRelease(context.root, true, "v9.9.9"),
    (error) => error.code === "INVALID_INPUT",
  );
  const published = await service.publishGithubRelease(context.root, true, context.tagName);
  assert.equal(published.tag, context.tagName);
  assert.equal(published.sourceCommit, context.commit);
  assert.equal(published.installerFilename, context.assetFilename);
  assert.equal(published.localInstallerSha256, sha256(context.installerBytes));
  assert.equal(published.publicationState, "complete");
  assert.equal(published.releaseCreated, true);
  assert.equal(published.assetUploaded, true);
  assert.equal(published.assetAlreadyPresent, false);
  assert.equal(published.verificationRequired, true);
  assert.deepEqual(
    requests.filter((request) => request.id.startsWith("gh-release-")).map((request) => request.id),
    ["gh-release-view", "gh-release-create", "gh-release-view", "gh-release-upload", "gh-release-view"],
  );
  const createRequest = requests.find((request) => request.id === "gh-release-create");
  assert.equal(createRequest.repository, "ChampCityChris/ChampCity_AI");
  assert.equal(createRequest.notesRelativePath, `docs/release/RELEASE_NOTES_${context.version}.md`);
  assert.equal(createRequest.title, `ChampCity A/I Desktop ${context.version}`);
  assert.equal(createRequest.prerelease, true);
  assert.equal(Object.hasOwn(createRequest, "installerPath"), false);
  assert.equal(Object.hasOwn(createRequest, "installerRelativePath"), false);
  const uploadRequest = requests.find((request) => request.id === "gh-release-upload");
  assert.equal(uploadRequest.installerRelativePath, `release/${context.assetFilename}`);
  assert.equal(path.normalize(uploadRequest.installerPath), path.join(context.root, "release", context.assetFilename));
  assert.deepEqual(published.providerReceipt.command.args, [
    "release",
    "upload",
    context.tagName,
    `release/${context.assetFilename}`,
    "--repo",
    "ChampCityChris/ChampCity_AI",
  ]);
  assert.doesNotMatch(JSON.stringify(published.providerReceipts), new RegExp(escapeRegex(context.root), "i"));
  assert.doesNotMatch(JSON.stringify(published.providerReceipts), /--clobber/i);
});

test("exact incomplete publication resumes with upload only and exact complete publication is idempotent", async () => {
  const incompleteContext = createPublicationContext();
  const incompleteRequests = [];
  const incompleteService = createReleaseToolbox({
    commandRunner: publicationRunner({
      ...incompleteContext,
      requests: incompleteRequests,
      releaseViews: [
        publicationView(incompleteContext, { body: "# Release notes\r\n", assets: [] }),
        publicationView(incompleteContext),
      ],
    }),
  });
  const recovered = await incompleteService.publishGithubRelease(
    incompleteContext.root,
    true,
    incompleteContext.tagName,
  );
  assert.equal(recovered.releaseCreated, false);
  assert.equal(recovered.assetUploaded, true);
  assert.deepEqual(
    incompleteRequests.filter((request) => request.id === "gh-release-create" || request.id === "gh-release-upload")
      .map((request) => request.id),
    ["gh-release-upload"],
  );

  const completeContext = createPublicationContext();
  const completeRequests = [];
  const completeService = createReleaseToolbox({
    commandRunner: publicationRunner({
      ...completeContext,
      requests: completeRequests,
      releaseViews: [publicationView(completeContext)],
    }),
  });
  const idempotent = await completeService.publishGithubRelease(completeContext.root, true, completeContext.tagName);
  assert.equal(idempotent.releaseCreated, false);
  assert.equal(idempotent.assetUploaded, false);
  assert.equal(idempotent.assetAlreadyPresent, true);
  assert.equal(idempotent.providerReceipt, null);
  assert.deepEqual(idempotent.providerReceipts, []);
  assert.equal(
    completeRequests.some((request) => request.id === "gh-release-create" || request.id === "gh-release-upload"),
    false,
  );
});

test("ineligible existing release metadata and asset states fail closed without mutation", async () => {
  const cases = [
    ["wrong tag", (context) => publicationView(context, { tagName: "v0.1.0-wrong" })],
    ["wrong title", (context) => publicationView(context, { name: "Wrong title" })],
    ["wrong prerelease state", (context) => publicationView(context, { isPrerelease: false })],
    ["wrong notes", (context) => publicationView(context, { body: "different notes\n" })],
    ["unexpected asset", (context) => publicationView(context, { assets: [{ name: "unexpected.exe" }] })],
    ["canonical plus unexpected asset", (context) => publicationView(context, {
      assets: [{ name: context.assetFilename }, { name: "unexpected.exe" }],
    })],
    ["duplicate canonical assets", (context) => publicationView(context, {
      assets: [{ name: context.assetFilename }, { name: context.assetFilename }],
    })],
    ["malformed asset metadata", (context) => publicationView(context, { assets: [{}] })],
    ["unparsable release", () => "{not-json"],
  ];

  for (const [label, makeView] of cases) {
    const context = createPublicationContext();
    const requests = [];
    const service = createReleaseToolbox({
      commandRunner: publicationRunner({ ...context, requests, releaseViews: [makeView(context)] }),
    });
    await assert.rejects(
      () => service.publishGithubRelease(context.root, true, context.tagName),
      (error) => error.code === "RELEASE_ALREADY_EXISTS" && /ineligible/i.test(error.message),
      label,
    );
    assert.equal(
      requests.some((request) => request.id === "gh-release-create" || request.id === "gh-release-upload"),
      false,
      label,
    );
  }
});

test("explicit retries recover safely after ambiguous create and upload timeouts", async () => {
  const createContext = createPublicationContext();
  const createRequests = [];
  const createService = createReleaseToolbox({
    commandRunner: publicationRunner({
      ...createContext,
      requests: createRequests,
      releaseViews: [
        "absent",
        publicationView(createContext, { assets: [] }),
        publicationView(createContext),
      ],
      createResults: [{ status: "timeout", exitCode: null }],
    }),
  });
  await assert.rejects(
    () => createService.publishGithubRelease(createContext.root, true, createContext.tagName),
    (error) => error.code === "RELEASE_TIMEOUT",
  );
  const createRecovered = await createService.publishGithubRelease(createContext.root, true, createContext.tagName);
  assert.equal(createRecovered.releaseCreated, false);
  assert.equal(createRecovered.assetUploaded, true);
  assert.equal(createRequests.filter((request) => request.id === "gh-release-create").length, 1);

  const incompleteContext = createPublicationContext();
  const incompleteRequests = [];
  const incompleteService = createReleaseToolbox({
    commandRunner: publicationRunner({
      ...incompleteContext,
      requests: incompleteRequests,
      releaseViews: [
        publicationView(incompleteContext, { assets: [] }),
        publicationView(incompleteContext, { assets: [] }),
        publicationView(incompleteContext),
      ],
      uploadResults: [{ status: "timeout", exitCode: null }, {}],
    }),
  });
  await assert.rejects(
    () => incompleteService.publishGithubRelease(incompleteContext.root, true, incompleteContext.tagName),
    (error) => error.code === "RELEASE_TIMEOUT",
  );
  const uploadRecovered = await incompleteService.publishGithubRelease(
    incompleteContext.root,
    true,
    incompleteContext.tagName,
  );
  assert.equal(uploadRecovered.assetUploaded, true);
  assert.equal(incompleteRequests.filter((request) => request.id === "gh-release-upload").length, 2);

  const completeContext = createPublicationContext();
  const completeRequests = [];
  const completeService = createReleaseToolbox({
    commandRunner: publicationRunner({
      ...completeContext,
      requests: completeRequests,
      releaseViews: [publicationView(completeContext, { assets: [] }), publicationView(completeContext)],
      uploadResults: [{ status: "timeout", exitCode: null }],
    }),
  });
  await assert.rejects(
    () => completeService.publishGithubRelease(completeContext.root, true, completeContext.tagName),
    (error) => error.code === "RELEASE_TIMEOUT",
  );
  const completeRecovered = await completeService.publishGithubRelease(
    completeContext.root,
    true,
    completeContext.tagName,
  );
  assert.equal(completeRecovered.assetUploaded, false);
  assert.equal(completeRecovered.assetAlreadyPresent, true);
  assert.equal(completeRequests.filter((request) => request.id === "gh-release-upload").length, 1);
});

test("publication success requires complete post-upload re-inspection", async () => {
  const context = createPublicationContext();
  const requests = [];
  const service = createReleaseToolbox({
    commandRunner: publicationRunner({
      ...context,
      requests,
      releaseViews: [publicationView(context, { assets: [] }), publicationView(context, { assets: [] })],
    }),
  });
  await assert.rejects(
    () => service.publishGithubRelease(context.root, true, context.tagName),
    (error) => error.code === "RELEASE_PROVIDER_FAILED" && /after upload/i.test(error.message),
  );
  assert.equal(requests.filter((request) => request.id === "gh-release-view").length, 2);
});

test("publication preserves Git, source, artifact, and provider prerequisites", async () => {
  const { root, version, tagName, commit, notesPath } = createPublicationContext();

  const dirtyService = createReleaseToolbox({
    commandRunner: publicationRunner({ root, version, tagName, commit, status: " M package.json\n" }),
  });
  await assert.rejects(
    () => dirtyService.publishGithubRelease(root, true, tagName),
    (error) => error.code === "RELEASE_INVARIANT_FAILED" && /clean/i.test(error.message),
  );
  const localMismatchService = createReleaseToolbox({
    commandRunner: publicationRunner({ root, version, tagName, commit, localCommit: "b".repeat(40) }),
  });
  await assert.rejects(
    () => localMismatchService.publishGithubRelease(root, true, tagName),
    (error) => error.code === "RELEASE_INVARIANT_FAILED" && /local release tag/i.test(error.message),
  );
  const remoteMismatchService = createReleaseToolbox({
    commandRunner: publicationRunner({ root, version, tagName, commit, remoteCommit: "c".repeat(40) }),
  });
  await assert.rejects(
    () => remoteMismatchService.publishGithubRelease(root, true, tagName),
    (error) => error.code === "RELEASE_INVARIANT_FAILED" && /origin release tag/i.test(error.message),
  );
  const missingCliService = createReleaseToolbox({
    commandRunner: publicationRunner({ root, version, tagName, commit, ghMissing: true }),
  });
  await assert.rejects(
    () => missingCliService.publishGithubRelease(root, true, tagName),
    (error) => error.code === "RELEASE_PREREQUISITE_UNAVAILABLE",
  );

  fs.unlinkSync(notesPath);
  const missingNotesService = createReleaseToolbox({
    commandRunner: publicationRunner({ root, version, tagName, commit }),
  });
  await assert.rejects(
    () => missingNotesService.publishGithubRelease(root, true, tagName),
    (error) => error.code === "RELEASE_ARTIFACT_MISSING" && /notes/i.test(error.message),
  );
  fs.writeFileSync(notesPath, "# Release notes\n");
  fs.unlinkSync(path.join(root, "release", `ChampCityAI-Setup-${version}.exe`));
  fs.writeFileSync(path.join(root, "docs", "release", `RELEASE_NOTES_${version}.md`), "# Release notes\n");
  const missingInstallerService = createReleaseToolbox({
    commandRunner: publicationRunner({ root, version, tagName, commit }),
  });
  await assert.rejects(
    () => missingInstallerService.publishGithubRelease(root, true, tagName),
    (error) => error.code === "RELEASE_ARTIFACT_MISSING" && /installer/i.test(error.message),
  );
});

test("verification downloads only the canonical asset to OS temp, compares SHA-256, and always cleans up", async () => {
  const version = "0.1.0-beta.3";
  const tagName = `v${version}`;
  const root = createReleaseWorkspace(version);
  const bytes = Buffer.from("published installer bytes");
  writeCanonicalArtifacts(root, version, bytes);
  let downloadDirectory;
  const verificationRunner = (downloadBytes) => async (request) => {
    switch (request.id) {
      case "git-origin-url": return receipt(request.id, { stdout: "https://github.com/ChampCityChris/ChampCity_AI.git\n" });
      case "gh-version": return receipt(request.id, { stdout: "gh version 2.test\n" });
      case "gh-auth-status": return receipt(request.id);
      case "gh-release-view": return receipt(request.id, {
        stdout: JSON.stringify({
          url: `https://github.com/ChampCityChris/ChampCity_AI/releases/tag/${tagName}`,
          tagName,
          assets: [{ name: `ChampCityAI-Setup-${version}.exe` }],
        }),
      });
      case "gh-release-download":
        downloadDirectory = request.temporaryDirectory;
        fs.writeFileSync(path.join(downloadDirectory, request.assetName), downloadBytes);
        return receipt(request.id);
      default: throw new Error(`Unexpected command ${request.id}`);
    }
  };
  const service = createReleaseToolbox({ commandRunner: verificationRunner(bytes) });
  const verified = await service.verifyGithubRelease(root, true, tagName);
  assert.equal(verified.match, true);
  assert.equal(verified.localHash, sha256(bytes));
  assert.equal(verified.downloadedHash, sha256(bytes));
  assert.equal(fs.existsSync(downloadDirectory), false);

  const mismatchService = createReleaseToolbox({ commandRunner: verificationRunner(Buffer.from("different")) });
  await assert.rejects(
    () => mismatchService.verifyGithubRelease(root, true, tagName),
    (error) => error.code === "RELEASE_VERIFICATION_FAILED" && error.details.match === false,
  );
  assert.equal(fs.existsSync(downloadDirectory), false);
});

test("exact drafts complete only their missing upload and publication steps", async (t) => {
  for (const complete of [false, true]) {
    await t.test(complete ? "draft-complete" : "draft-incomplete", async () => {
      const context = createPublicationContext();
      const requests = [];
      const draftComplete = publicationView(context, { isDraft: true, body: context.notes.replace(/\n/g, "\r\n") });
      const releaseViews = complete ? [draftComplete] : [publicationView(context, { isDraft: true, assets: [] }), draftComplete];
      releaseViews.push(publicationView(context));
      const service = createReleaseToolbox({ commandRunner: publicationRunner({ ...context, requests, releaseViews }) });
      const result = await service.publishGithubRelease(context.root, true, context.tagName);
      assert.equal(result.publicationState, "complete");
      assert.equal(result.assetUploaded, !complete);
      assert.equal(result.assetAlreadyPresent, complete);
      assert.equal(result.draftPublished, true);
      assert.equal(result.verificationRequired, true);
      assert.deepEqual(providerCommands(requests), [
        "gh-release-view",
        ...complete ? [] : ["gh-release-upload", "gh-release-view"],
        "gh-release-publish-draft", "gh-release-view",
      ]);
    });
  }
});

test("draft recovery resumes from fresh state after ambiguous upload and publish failures", async (t) => {
  for (const step of ["upload", "publish"]) {
    for (const status of ["timeout", "nonzero"]) {
      for (const completedRemotely of [false, true]) {
        await t.test(`${step} ${status}, remote completed: ${completedRemotely}`, async () => {
          const context = createPublicationContext();
          const requests = [];
          const incomplete = publicationView(context, { isDraft: true, assets: [] });
          const complete = publicationView(context, { isDraft: true });
          const published = publicationView(context);
          const releaseViews = step === "upload"
            ? [incomplete, ...completedRemotely ? [] : [incomplete], complete, published]
            : [complete, ...completedRemotely ? [] : [complete], published];
          const service = createReleaseToolbox({ commandRunner: publicationRunner({
            ...context, requests, releaseViews,
            [step === "upload" ? "uploadResults" : "publishResults"]: [{ status, exitCode: status === "timeout" ? null : 1 }, {}],
          }) });
          await assert.rejects(() => service.publishGithubRelease(context.root, true, context.tagName),
            (error) => error.code === (status === "timeout" ? "RELEASE_TIMEOUT" : "RELEASE_COMMAND_FAILED"));
          const beforeRetry = providerCommands(requests);
          assert.deepEqual(beforeRetry, ["gh-release-view", step === "upload" ? "gh-release-upload" : "gh-release-publish-draft"]);
          const result = await service.publishGithubRelease(context.root, true, context.tagName);
          assert.equal(result.publicationState, "complete");
          assert.equal(providerCommands(requests)[beforeRetry.length], "gh-release-view");
          assert.equal(requests.filter((entry) => entry.id === (step === "upload" ? "gh-release-upload" : "gh-release-publish-draft")).length,
            completedRemotely ? 1 : 2);
        });
      }
    }
  }
});

test("draft recovery requires exact state after upload and after draft publication", async () => {
  const context = createPublicationContext();
  for (const releaseViews of [
    [publicationView(context, { isDraft: true, assets: [] }), publicationView(context)],
    [publicationView(context, { isDraft: true }), publicationView(context, { isDraft: true })],
    [publicationView(context, { isDraft: true }), "absent"],
  ]) {
    const requests = [];
    const service = createReleaseToolbox({ commandRunner: publicationRunner({ ...context, requests, releaseViews }) });
    await assert.rejects(() => service.publishGithubRelease(context.root, true, context.tagName),
      (error) => error.code === "RELEASE_PROVIDER_FAILED");
    assert.equal(providerCommands(requests).length, 3);
  }
});

test("draft metadata and asset mismatches block both recovery and abandonment", async (t) => {
  const context = createPublicationContext();
  for (const [label, overrides] of [
    ["tag", { tagName: "v9.9.9" }], ["title", { name: "Wrong" }],
    ["prerelease", { isPrerelease: false }], ["notes", { body: `${context.notes} ` }],
    ["extra asset", { assets: [{ name: context.assetFilename }, { name: "unexpected.exe" }] }],
    ["wrong asset", { assets: [{ name: "unexpected.exe" }] }],
    ["duplicate", { assets: [{ name: context.assetFilename }, { name: context.assetFilename }] }],
    ["malformed assets", { assets: [{}] }], ["missing assets", { assets: null }],
    ["malformed draft state", { isDraft: "true" }],
  ]) {
    await t.test(label, async () => {
      for (const method of ["publishGithubRelease", "abandonGithubDraftRelease"]) {
        const requests = [];
        const service = createReleaseToolbox({ commandRunner: publicationRunner({
          ...context, requests, releaseViews: [publicationView(context, { isDraft: true, ...overrides })],
        }) });
        await assert.rejects(() => service[method](context.root, true, context.tagName),
          (error) => error.code === "RELEASE_ALREADY_EXISTS");
        assert.deepEqual(providerCommands(requests), ["gh-release-view"]);
      }
    });
  }
});

test("abandonment deletes only exact drafts and confirms absence, without requiring installer bytes", async (t) => {
  const context = createPublicationContext();
  fs.unlinkSync(path.join(context.root, "release", context.assetFilename));
  for (const assets of [[], [{ name: context.assetFilename }]]) {
    await t.test(`draft with ${assets.length} assets`, async () => {
      const requests = [];
      const service = createReleaseToolbox({ commandRunner: publicationRunner({
        ...context, requests, releaseViews: [publicationView(context, { isDraft: true, assets }), "absent"],
      }) });
      const result = await service.abandonGithubDraftRelease(context.root, true, context.tagName);
      assert.equal(result.releaseState, "absent");
      assert.equal(result.releaseDeleted, true);
      assert.equal(result.sourceCommit, context.commit);
      assert.deepEqual(providerCommands(requests), ["gh-release-view", "gh-release-delete-draft", "gh-release-view"]);
      assert.equal(requests.some((request) => /delete.*tag|publish|upload|create/.test(request.id)), false);
    });
  }
});

test("abandonment refuses all published states and unconfirmed deletion", async () => {
  const context = createPublicationContext();
  for (const assets of [[], [{ name: context.assetFilename }]]) {
    const requests = [];
    const service = createReleaseToolbox({ commandRunner: publicationRunner({ ...context, requests, releaseViews: [publicationView(context, { assets })] }) });
    await assert.rejects(() => service.abandonGithubDraftRelease(context.root, true, context.tagName),
      (error) => error.code === "RELEASE_ALREADY_EXISTS" && /published/.test(error.details.reason));
    assert.deepEqual(providerCommands(requests), ["gh-release-view"]);
  }
  const requests = [];
  const draft = publicationView(context, { isDraft: true });
  const service = createReleaseToolbox({ commandRunner: publicationRunner({ ...context, requests, releaseViews: [draft, draft] }) });
  await assert.rejects(() => service.abandonGithubDraftRelease(context.root, true, context.tagName),
    (error) => error.code === "RELEASE_PROVIDER_FAILED");
  assert.deepEqual(providerCommands(requests), ["gh-release-view", "gh-release-delete-draft", "gh-release-view"]);
});

test("abandonment is idempotent and explicit retries inspect ambiguous deletion outcomes", async (t) => {
  const context = createPublicationContext();
  const absentRequests = [];
  const absent = createReleaseToolbox({ commandRunner: publicationRunner({ ...context, requests: absentRequests, releaseViews: ["absent"] }) });
  assert.equal((await absent.abandonGithubDraftRelease(context.root, true, context.tagName)).releaseAlreadyAbsent, true);
  assert.deepEqual(providerCommands(absentRequests), ["gh-release-view"]);
  for (const status of ["timeout", "nonzero"]) {
    for (const completedRemotely of [false, true]) {
      await t.test(`${status}, remote completed: ${completedRemotely}`, async () => {
        const requests = [];
        const draft = publicationView(context, { isDraft: true });
        const service = createReleaseToolbox({ commandRunner: publicationRunner({
          ...context, requests, releaseViews: [draft, ...completedRemotely ? [] : [draft], "absent"],
          deleteResults: [{ status, exitCode: status === "timeout" ? null : 1 }, {}],
        }) });
        await assert.rejects(() => service.abandonGithubDraftRelease(context.root, true, context.tagName),
          (error) => error.code === (status === "timeout" ? "RELEASE_TIMEOUT" : "RELEASE_COMMAND_FAILED"));
        assert.deepEqual(providerCommands(requests), ["gh-release-view", "gh-release-delete-draft"]);
        const result = await service.abandonGithubDraftRelease(context.root, true, context.tagName);
        assert.equal(result.releaseAlreadyAbsent, completedRemotely);
        assert.deepEqual(providerCommands(requests), ["gh-release-view", "gh-release-delete-draft", "gh-release-view",
          ...completedRemotely ? [] : ["gh-release-delete-draft", "gh-release-view"]]);
      });
    }
  }
});

test("release mutation rejects malformed, truncated, and failed provider inspection including ambiguous absence", async () => {
  const context = createPublicationContext();
  for (const override of [
    { stdout: "{broken" },
    { stdout: JSON.stringify(publicationView(context, { isDraft: true })), stdoutTruncated: true },
    { stdout: JSON.stringify(publicationView(context, { isDraft: true })), stderrTruncated: true },
    { status: "nonzero", exitCode: 1, stderr: "release not found", stderrTruncated: true },
    { status: "nonzero", exitCode: 1, stderr: "provider unavailable" },
    { status: "timeout", exitCode: null },
  ]) {
    for (const method of ["publishGithubRelease", "abandonGithubDraftRelease"]) {
      const requests = [];
      const service = createReleaseToolbox({ commandRunner: publicationRunner({ ...context, requests, commandOverrides: { "gh-release-view": override } }) });
      await assert.rejects(() => service[method](context.root, true, context.tagName));
      assert.deepEqual(providerCommands(requests), ["gh-release-view"]);
    }
  }
});

test("abandonment preserves source, tag, provider, and Git-backed prerequisites", async () => {
  const context = createPublicationContext();
  const failures = [
    ["git-origin-url", { stdout: "https://example.invalid/owner/repo.git" }],
    ["gh-version", { status: "spawn-error", exitCode: null }],
    ["gh-auth-status", { status: "nonzero", exitCode: 1 }],
    ["git-local-tag-target", { status: "nonzero", exitCode: 1 }],
    ["git-local-tag-target", { stdout: "b".repeat(40) }],
    ["git-remote-tag-target", { stdout: "" }],
    ["git-remote-tag-target", { stdout: `${"b".repeat(40)}\trefs/tags/${context.tagName}\n` }],
    ["git-remote-tag-target", { stdout: `${context.commit}\trefs/tags/${context.tagName}\n`, stdoutTruncated: true }],
    ["git-status-porcelain", { stdout: " M package.json\n" }],
  ];
  for (const [id, override] of failures) {
    const requests = [];
    const service = createReleaseToolbox({ commandRunner: publicationRunner({ ...context, requests, commandOverrides: { [id]: override } }) });
    await assert.rejects(() => service.abandonGithubDraftRelease(context.root, true, context.tagName));
    assert.deepEqual(providerCommands(requests), []);
  }
  const requests = [];
  const service = createReleaseToolbox({ commandRunner: publicationRunner({ ...context, requests }) });
  await assert.rejects(() => service.abandonGithubDraftRelease(context.root, false, context.tagName), (error) => error.code === "GIT_CAPABILITY_UNAVAILABLE");
  await assert.rejects(() => service.abandonGithubDraftRelease(context.root, true, "v9.9.9"), (error) => error.code === "INVALID_INPUT");
  fs.writeFileSync(path.join(context.root, "package.json"), JSON.stringify({ version: "invalid" }));
  await assert.rejects(() => service.abandonGithubDraftRelease(context.root, true, context.tagName), (error) => error.code === "RELEASE_INVARIANT_FAILED");
  assert.deepEqual(requests, []);
});

test("production adapter fixes draft edit and delete arguments with shell false", async (t) => {
  const childProcess = require("node:child_process");
  const { EventEmitter } = require("node:events");
  const { PassThrough } = require("node:stream");
  const { runFixedReleaseCommand } = require(path.join(repositoryRoot, "dist/main/agentHarness/release/releaseCommandAdapter.js"));
  const spawns = [];
  t.mock.method(childProcess, "spawn", (executable, args, options) => {
    spawns.push({ executable, args, options });
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    queueMicrotask(() => child.emit("close", 0));
    return child;
  });
  for (const [id, verb, flags] of [
    ["gh-release-publish-draft", "edit", ["--draft=false", "--verify-tag"]],
    ["gh-release-delete-draft", "delete", ["--yes"]],
  ]) {
    const result = await runFixedReleaseCommand({ root: repositoryRoot, id, repository: "Example/Fixture", tagName: "v1.2.3" });
    assert.equal(result.status, "succeeded");
    assert.equal(spawns.at(-1).executable, "gh");
    assert.deepEqual(spawns.at(-1).args, ["release", verb, "v1.2.3", "--repo", "Example/Fixture", ...flags]);
    assert.equal(spawns.at(-1).options.shell, false);
    assert.deepEqual(result.command.args, spawns.at(-1).args);
  }
  for (const { args } of spawns) {
    assert.equal(args.some((arg) => ["--cleanup-tag", "--clobber", "delete-asset"].includes(arg)), false);
  }
});

function providerCommands(requests) {
  return requests.filter((request) => request.id.startsWith("gh-release-")).map((request) => request.id);
}

function publicationRunner(options) {
  let releaseViewIndex = 0;
  let createResultIndex = 0;
  let uploadResultIndex = 0;
  let publishResultIndex = 0;
  let deleteResultIndex = 0;
  const releaseViews = options.releaseViews ?? [
    "absent",
    publicationView(options, { assets: [] }),
    publicationView(options),
  ];
  return async (request) => {
    options.requests?.push(request);
    if (options.commandOverrides?.[request.id]) {
      return receipt(request.id, options.commandOverrides[request.id]);
    }
    switch (request.id) {
      case "git-origin-url": return receipt(request.id, { stdout: "https://github.com/ChampCityChris/ChampCity_AI.git\n" });
      case "gh-version": return receipt(request.id, options.ghMissing ? { status: "spawn-error", exitCode: null } : {});
      case "gh-auth-status": return receipt(request.id);
      case "git-head": return receipt(request.id, { stdout: `${options.commit}\n` });
      case "git-local-tag-target": return receipt(request.id, { stdout: `${options.localCommit ?? options.commit}\n` });
      case "git-remote-tag-target": return receipt(request.id, { stdout: `${options.remoteCommit ?? options.commit}\trefs/tags/${options.tagName}\n` });
      case "git-status-porcelain": return receipt(request.id, { stdout: options.status ?? "" });
      case "gh-release-view": {
        const view = releaseViews[releaseViewIndex++];
        if (view === undefined) {
          throw new Error("Unexpected extra GitHub Release inspection");
        }
        return view === "absent"
          ? receipt(request.id, { status: "nonzero", exitCode: 1, stderr: "release not found\n" })
          : receipt(request.id, { stdout: typeof view === "string" ? view : JSON.stringify(view) });
      }
      case "gh-release-create": {
        const overrides = options.createResults?.[createResultIndex++] ?? {};
        return receipt(request.id, {
          command: {
            executable: "gh",
            args: [
              "release", "create", options.tagName, "--repo", "ChampCityChris/ChampCity_AI",
              "--title", `ChampCity A/I Desktop ${options.version}`,
              "--notes-file", `docs/release/RELEASE_NOTES_${options.version}.md`, "--verify-tag", "--prerelease",
            ],
          },
          ...overrides,
        });
      }
      case "gh-release-upload": {
        const overrides = options.uploadResults?.[uploadResultIndex++] ?? {};
        return receipt(request.id, {
          command: {
            executable: "gh",
            args: [
              "release", "upload", options.tagName, request.installerRelativePath,
              "--repo", "ChampCityChris/ChampCity_AI",
            ],
          },
          ...overrides,
        });
      }
      case "gh-release-publish-draft":
        return receipt(request.id, options.publishResults?.[publishResultIndex++] ?? {});
      case "gh-release-delete-draft":
        return receipt(request.id, options.deleteResults?.[deleteResultIndex++] ?? {});
      default: throw new Error(`Unexpected command ${request.id}`);
    }
  };
}

function createPublicationContext(version = "0.1.0-beta.3") {
  const tagName = `v${version}`;
  const commit = "a".repeat(40);
  const root = createReleaseWorkspace(version);
  const installerBytes = Buffer.from("release candidate");
  const assetFilename = `ChampCityAI-Setup-${version}.exe`;
  const notes = "# Release notes\n";
  const notesPath = path.join(root, "docs", "release", `RELEASE_NOTES_${version}.md`);
  writeCanonicalArtifacts(root, version, installerBytes);
  fs.mkdirSync(path.dirname(notesPath), { recursive: true });
  fs.writeFileSync(notesPath, notes);
  return { root, version, tagName, commit, installerBytes, assetFilename, notes, notesPath };
}

function publicationView(context, overrides = {}) {
  const version = context.version;
  const tagName = context.tagName ?? `v${version}`;
  const assetFilename = context.assetFilename ?? `ChampCityAI-Setup-${version}.exe`;
  return {
    url: `https://github.com/ChampCityChris/ChampCity_AI/releases/tag/${tagName}`,
    tagName,
    name: `ChampCity A/I Desktop ${version}`,
    isPrerelease: version.includes("-"),
    isDraft: false,
    body: context.notes ?? "# Release notes\n",
    assets: [{ name: assetFilename }],
    ...overrides,
  };
}

function receipt(commandId, overrides = {}) {
  return {
    commandId,
    command: { executable: commandId.startsWith("npm") ? "npm" : commandId.startsWith("git") ? "git" : "gh", args: [] },
    startedAt: "2026-09-17T12:00:00.000Z",
    endedAt: "2026-09-17T12:00:00.001Z",
    durationMs: 1,
    exitCode: 0,
    status: "succeeded",
    stdout: "",
    stderr: "",
    stdoutTruncated: false,
    stderrTruncated: false,
    ...overrides,
  };
}

function createReleaseWorkspace(version) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-release-toolbox-"));
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({ name: "champcity-ai", version }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "package-lock.json"), `${JSON.stringify({
    name: "champcity-ai",
    version,
    lockfileVersion: 3,
    packages: { "": { name: "champcity-ai", version } },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, ".gitignore"), "node_modules/\ndist/\nbuild/\nout/\nrelease/\ncoverage/\n");
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "ChampCity Test"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "champcity-test@example.invalid"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["add", "--", "package.json", "package-lock.json", ".gitignore"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: root, stdio: "ignore" });
  return root;
}

function writeCanonicalArtifacts(root, version, installerBytes) {
  const releaseRoot = path.join(root, "release");
  fs.mkdirSync(path.join(releaseRoot, "win-unpacked"), { recursive: true });
  fs.writeFileSync(path.join(releaseRoot, "win-unpacked", "ChampCityAI.exe"), "unpacked executable");
  fs.writeFileSync(path.join(releaseRoot, `ChampCityAI-Setup-${version}.exe`), installerBytes);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function normalize(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function recordCall(calls, action, args) {
  const value = { action, args };
  calls.push(value);
  return value;
}
