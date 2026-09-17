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
  assert.deepEqual(writeTool.actions, ["set_version", "validate_candidate", "build_windows_release", "publish_github_release"]);
  assert.deepEqual(fullTool.actions, [
    "status",
    "set_version",
    "validate_candidate",
    "build_windows_release",
    "inspect_release_artifact",
    "publish_github_release",
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
  assert.equal(completed.commandReceipts.length, 6);
  assert.match(completed.candidateSnapshot.sourceHead, /^[0-9a-f]{40,64}$/);
  assert.match(completed.candidateSnapshot.candidateDigest, /^[0-9a-f]{64}$/);
  assert.equal(completed.candidateSnapshot.cleanupStatus, "succeeded");
  assert.ok(Date.parse(completed.startedAt));
  assert.ok(Date.parse(completed.completedAt));
  const npmRequests = validationRequests.filter((entry) => entry.id.startsWith("npm"));
  const gitRequests = validationRequests.filter((entry) => entry.id === "git-diff-check" || entry.id === "git-status-short");
  assert.equal(npmRequests.length, 4);
  assert.ok(npmRequests.every((entry) => normalize(entry.root) === normalize(npmRequests[0].root)));
  assert.notEqual(normalize(npmRequests[0].root), normalize(root));
  assert.equal(fs.existsSync(npmRequests[0].root), false);
  assert.deepEqual(gitRequests.map((entry) => normalize(entry.root)), [normalize(root), normalize(root)]);

  const status = await service.status(root, true);
  assert.deepEqual(status.latestCandidateValidation, completed);
  assert.deepEqual(
    status.latestCandidateValidation.commandReceipts.map((entry) => entry.commandId),
    ["npm-ci", "npm-run-typecheck", "npm-run-build", "npm-test", "git-diff-check", "git-status-short"],
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
      return receipt(request.id, request.id === "npm-run-build" ? { status: "nonzero", exitCode: 2 } : {});
    },
  });
  const validation = await validationService.validateCandidate(root);
  assert.equal(validation.passed, false);
  assert.equal(validation.failedCommand, "npm-run-build");
  assert.equal(validation.failedPhase, "npm-validation");
  assert.deepEqual(validationRequests.map((entry) => entry.id), ["npm-ci", "npm-run-typecheck", "npm-run-build"]);
  assert.ok(validationRequests.every((entry) => normalize(entry.root) === normalize(candidateRoot)));
  assert.equal(validation.commandReceipts.length, 3);
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

test("publication enforces Git/tag/source/artifact/provider invariants and uploads only canonical inputs", async () => {
  const version = "0.1.0-beta.3";
  const tagName = `v${version}`;
  const commit = "a".repeat(40);
  const root = createReleaseWorkspace(version);
  writeCanonicalArtifacts(root, version, Buffer.from("release candidate"));
  const notesPath = path.join(root, "docs", "release", `RELEASE_NOTES_${version}.md`);
  fs.mkdirSync(path.dirname(notesPath), { recursive: true });
  fs.writeFileSync(notesPath, "# Release notes\n");
  const requests = [];
  const service = createReleaseToolbox({
    commandRunner: async (request) => {
      requests.push(request);
      switch (request.id) {
        case "git-origin-url": return receipt(request.id, { stdout: "git@github.com:ChampCityChris/ChampCity_AI.git\n" });
        case "gh-version": return receipt(request.id, { stdout: "gh version 2.test\n" });
        case "gh-auth-status": return receipt(request.id);
        case "git-head": return receipt(request.id, { stdout: `${commit}\n` });
        case "git-local-tag-target": return receipt(request.id, { stdout: `${commit}\n` });
        case "git-remote-tag-target": return receipt(request.id, { stdout: `${commit}\trefs/tags/${tagName}\n` });
        case "git-status-porcelain": return receipt(request.id);
        case "gh-release-view": return receipt(request.id, { status: "nonzero", exitCode: 1, stderr: "release not found\n" });
        case "gh-release-create": return receipt(request.id, { stdout: `https://github.com/ChampCityChris/ChampCity_AI/releases/tag/${tagName}\n` });
        default: throw new Error(`Unexpected command ${request.id}`);
      }
    },
  });

  await assert.rejects(() => service.publishGithubRelease(root, true, "v9.9.9"), (error) => error.code === "INVALID_INPUT");
  const published = await service.publishGithubRelease(root, true, tagName);
  assert.equal(published.tag, tagName);
  assert.equal(published.sourceCommit, commit);
  assert.equal(published.installerFilename, `ChampCityAI-Setup-${version}.exe`);
  assert.equal(published.localInstallerSha256, sha256(Buffer.from("release candidate")));
  const createRequest = requests.find((request) => request.id === "gh-release-create");
  assert.equal(createRequest.repository, "ChampCityChris/ChampCity_AI");
  assert.equal(createRequest.installerRelativePath, `release/ChampCityAI-Setup-${version}.exe`);
  assert.equal(createRequest.notesRelativePath, `docs/release/RELEASE_NOTES_${version}.md`);
  assert.equal(createRequest.title, `ChampCity A/I Desktop ${version}`);
  assert.equal(createRequest.prerelease, true);
  assert.equal(Object.hasOwn(createRequest, "assets"), false);

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
  const existingService = createReleaseToolbox({
    commandRunner: publicationRunner({ root, version, tagName, commit, existing: true }),
  });
  await assert.rejects(
    () => existingService.publishGithubRelease(root, true, tagName),
    (error) => error.code === "RELEASE_ALREADY_EXISTS",
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

test("the production adapter uses shell-false fixed commands and redacts repository/temp paths in receipts", () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, "src/main/agentHarness/release/releaseCommandAdapter.ts"),
    "utf8",
  );
  assert.match(source, /shell:\s*false/);
  assert.doesNotMatch(source, /shell:\s*true/);
  assert.doesNotMatch(source, /cmd\.exe|powershell(?:\.exe)?/i);
  assert.doesNotMatch(source, /npm\.cmd/i);
  assert.match(source, /npm-cli\.js/);
  assert.match(source, /node\.exe/);
  assert.match(source, /process\.release/);
  assert.doesNotMatch(source, /ELECTRON_RUN_AS_NODE:\s*["']1["']/);
  assert.match(source, /"<OS_TEMP>"/);
  assert.match(source, /"<COMMAND_CWD>"/);
});

function publicationRunner(options) {
  return async (request) => {
    switch (request.id) {
      case "git-origin-url": return receipt(request.id, { stdout: "https://github.com/ChampCityChris/ChampCity_AI.git\n" });
      case "gh-version": return receipt(request.id, options.ghMissing ? { status: "spawn-error", exitCode: null } : {});
      case "gh-auth-status": return receipt(request.id);
      case "git-head": return receipt(request.id, { stdout: `${options.commit}\n` });
      case "git-local-tag-target": return receipt(request.id, { stdout: `${options.localCommit ?? options.commit}\n` });
      case "git-remote-tag-target": return receipt(request.id, { stdout: `${options.remoteCommit ?? options.commit}\trefs/tags/${options.tagName}\n` });
      case "git-status-porcelain": return receipt(request.id, { stdout: options.status ?? "" });
      case "gh-release-view": return options.existing
        ? receipt(request.id, { stdout: JSON.stringify({ url: "https://github.com/example/release", tagName: options.tagName, assets: [] }) })
        : receipt(request.id, { status: "nonzero", exitCode: 1, stderr: "release not found\n" });
      case "gh-release-create": return receipt(request.id, { stdout: `https://github.com/ChampCityChris/ChampCity_AI/releases/tag/${options.tagName}\n` });
      default: throw new Error(`Unexpected command ${request.id}`);
    }
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
