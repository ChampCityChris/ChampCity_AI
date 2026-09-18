const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const {
  assertSafeCandidateRelativePath,
  withCandidateValidationSnapshot,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/release/candidateValidationSnapshot.js"));
const {
  runFixedReleaseCommand,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/release/releaseCommandAdapter.js"));

test("candidate snapshot preserves exact current Git-visible bytes and excludes ignored local state", async (t) => {
  const root = createCandidateRepository(t);
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({
    name: "candidate-snapshot-test",
    version: "0.1.0-beta.3",
    private: true,
  }, null, 2)}\n`);
  fs.rmSync(path.join(root, "obsolete.txt"));
  fs.rmSync(path.join(root, "legacy"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "release"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "release", "RELEASE_NOTES_0.1.0-beta.3.md"), "# Current release notes\n");
  writeIgnoredState(root);

  let snapshotRoot;
  const result = await withCandidateValidationSnapshot(root, async (snapshot) => {
    snapshotRoot = snapshot.root;
    assert.notEqual(normalize(snapshot.root), normalize(root));
    assert.equal(readJson(path.join(snapshot.root, "package.json")).version, "0.1.0-beta.3");
    assert.equal(fs.existsSync(path.join(snapshot.root, "obsolete.txt")), false);
    assert.equal(
      fs.readFileSync(path.join(snapshot.root, "docs", "release", "RELEASE_NOTES_0.1.0-beta.3.md"), "utf8"),
      "# Current release notes\n",
    );
    for (const ignored of ["node_modules", "dist", "planning", "work_cards", ".env", ".git"]) {
      assert.equal(fs.existsSync(path.join(snapshot.root, ignored)), false, ignored);
    }
    return "inspected";
  });

  assert.equal(result.value, "inspected");
  assert.match(result.receipt.sourceHead, /^[0-9a-f]{40,64}$/);
  assert.match(result.receipt.candidateDigest, /^[0-9a-f]{64}$/);
  assert.equal(result.receipt.trackedDeletionCount, 2);
  assert.equal(result.receipt.materializationStatus, "succeeded");
  assert.equal(result.receipt.cleanupStatus, "succeeded");
  assert.equal(fs.existsSync(snapshotRoot), false);
});

test("isolated npm ci leaves a held source node_modules/electron sentinel intact", async (t) => {
  const root = createCandidateRepository(t);
  const sentinel = path.join(root, "node_modules", "electron", "dist", "resources", "default_app.asar");
  fs.mkdirSync(path.dirname(sentinel), { recursive: true });
  fs.writeFileSync(sentinel, "source dependency sentinel");
  const heldDescriptor = fs.openSync(sentinel, "r");
  t.after(() => fs.closeSync(heldDescriptor));

  let isolatedRoot;
  const result = await withCandidateValidationSnapshot(root, async (snapshot) => {
    isolatedRoot = snapshot.root;
    assert.equal(fs.existsSync(path.join(snapshot.root, "node_modules")), false);
    const receipt = await runFixedReleaseCommand({ root: snapshot.root, id: "npm-ci" });
    assert.equal(receipt.status, "succeeded", receipt.stderr);
    assert.equal(receipt.exitCode, 0);
    const pathReceipt = await runFixedReleaseCommand({ root: snapshot.root, id: "npm-run-typecheck" });
    assert.equal(pathReceipt.status, "succeeded", pathReceipt.stderr);
    assert.doesNotMatch(pathReceipt.stdout, new RegExp(escapeRegex(snapshot.root), "i"));
    assert.match(pathReceipt.stdout, /<COMMAND_CWD>/);
    return { receipt, pathReceipt };
  });

  assert.equal(result.value.receipt.commandId, "npm-ci");
  assert.equal(fs.readFileSync(sentinel, "utf8"), "source dependency sentinel");
  assert.equal(fs.existsSync(isolatedRoot), false);
});

test("unsafe candidate entries and non-root repository paths fail closed without path disclosure", async (t) => {
  for (const unsafe of ["../escape.txt", "/absolute.txt", "C:/absolute.txt", "nested\\escape.txt", ".git/config", "a//b.txt"]) {
    assert.throws(
      () => assertSafeCandidateRelativePath(unsafe),
      (error) => error.code === "RELEASE_CANDIDATE_SNAPSHOT_FAILED" && error.details.phase === "containment",
      unsafe,
    );
  }
  assert.doesNotThrow(() => assertSafeCandidateRelativePath("docs/release/RELEASE_NOTES_0.1.0-beta.3.md"));

  const root = createCandidateRepository(t);
  const nested = path.join(root, "nested");
  fs.mkdirSync(nested);
  await assert.rejects(
    () => withCandidateValidationSnapshot(nested, async () => undefined),
    (error) => {
      assert.equal(error.code, "RELEASE_CANDIDATE_SNAPSHOT_FAILED");
      assert.equal(error.details.phase, "source-root");
      assert.doesNotMatch(JSON.stringify(error), new RegExp(escapeRegex(root), "i"));
      assert.doesNotMatch(JSON.stringify(error), /champcity-candidate-validation-/i);
      return true;
    },
  );
});

test("temporary candidate workspace is cleaned when validation throws", async (t) => {
  const root = createCandidateRepository(t);
  let snapshotRoot;
  await assert.rejects(
    () => withCandidateValidationSnapshot(root, async (snapshot) => {
      snapshotRoot = snapshot.root;
      throw new Error("simulated command error");
    }),
    /simulated command error/,
  );
  assert.equal(fs.existsSync(snapshotRoot), false);
});

test("Windows candidate cleanup runs outside the hosting process", { skip: process.platform !== "win32" }, async (t) => {
  const root = createCandidateRepository(t);
  const originalRm = fs.promises.rm;
  let hostingProcessRmCalls = 0;
  fs.promises.rm = async (...args) => {
    hostingProcessRmCalls += 1;
    return originalRm(...args);
  };
  try {
    const result = await withCandidateValidationSnapshot(root, async () => "validated");
    assert.equal(result.value, "validated");
    assert.equal(result.receipt.cleanupStatus, "succeeded");
    assert.equal(hostingProcessRmCalls, 0);
  } finally {
    fs.promises.rm = originalRm;
  }
});

function createCandidateRepository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-candidate-source-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "ChampCity Test"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "champcity-test@example.invalid"], { cwd: root, stdio: "ignore" });
  fs.writeFileSync(path.join(root, ".gitignore"), [
    "node_modules/",
    "dist/",
    "planning/",
    "work_cards/",
    ".env",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({
    name: "candidate-snapshot-test",
    version: "0.1.0-beta.2",
    private: true,
    scripts: {
      typecheck: "node -e \"process.stdout.write(process.cwd())\"",
    },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "package-lock.json"), `${JSON.stringify({
    name: "candidate-snapshot-test",
    version: "0.1.0-beta.2",
    lockfileVersion: 3,
    requires: true,
    packages: { "": { name: "candidate-snapshot-test", version: "0.1.0-beta.2" } },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "obsolete.txt"), "tracked then deleted\n");
  fs.mkdirSync(path.join(root, "legacy"));
  fs.writeFileSync(path.join(root, "legacy", "obsolete.txt"), "nested tracked then deleted\n");
  execFileSync("git", ["add", "--", ".gitignore", "package.json", "package-lock.json", "obsolete.txt"], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["add", "--", "legacy/obsolete.txt"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: root, stdio: "ignore" });
  return root;
}

function writeIgnoredState(root) {
  for (const relativePath of [
    "node_modules/electron/dist/resources/default_app.asar",
    "dist/main.js",
    "planning/private.md",
    "work_cards/local.md",
  ]) {
    const target = path.join(root, ...relativePath.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "ignored local state\n");
  }
  fs.writeFileSync(path.join(root, ".env"), "DO_NOT_COPY=secret\n");
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
