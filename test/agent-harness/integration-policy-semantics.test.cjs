const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),test=require("node:test"),{execFileSync}=require("node:child_process");
const {writeDoc}=require("../support/canonical-markdown-fixtures.cjs");
const repositoryRoot=path.resolve(__dirname,"../..");
test("integration policy rejects untrusted schemas and redirected or unbounded configuration", async (t) => {
  const { parseIntegrationPolicy, INTEGRATION_POLICY_MAX_BYTES } = require("../../dist/shared/integrationPolicyContracts.js");
  const { loadIntegrationPolicy } = require("../../dist/main/planExecution/integrationPolicyProvider.js");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-policy-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const policy = { schemaVersion: 1, checks: [{ checkId: "source", lane: "integration", runner: { kind: "npm-script", script: "verify:source", timeoutMs: 10000 } }], requiredIntegrationChecks: ["source"] };
  const invalid = [
    ["unsupported version", (p) => { p.schemaVersion = 2; }],
    ["empty checks", (p) => { p.checks = []; }],
    ["too many checks", (p) => { p.checks = Array.from({ length: 33 }, (_, i) => ({ ...p.checks[0], checkId: `check-${i}` })); }],
    ["duplicate check", (p) => { p.checks.push(p.checks[0]); }],
    ["missing required check", (p) => { p.requiredIntegrationChecks = ["missing"]; }],
    ["empty required checks", (p) => { p.requiredIntegrationChecks = []; }],
    ["duplicate required check", (p) => { p.requiredIntegrationChecks.push("source"); }],
    ["unknown lane", (p) => { p.checks[0].lane = "custom"; }],
    ["unsupported runner", (p) => { p.checks[0].runner.kind = "shell"; }],
    ["command field", (p) => { p.checks[0].runner.command = "node verify.cjs"; }],
    ["arguments field", (p) => { p.checks[0].runner.args = ["--extra"]; }],
    ["root field", (p) => { p.cwd = ".."; }],
    ["check field", (p) => { p.checks[0].optional = true; }],
    ["shell script fragment", (p) => { p.checks[0].runner.script = "verify; echo injected"; }],
    ["script option", (p) => { p.checks[0].runner.script = "--help"; }],
    ["script path", (p) => { p.checks[0].runner.script = "../verify"; }],
    ["missing identity", (p) => { delete p.checks[0].checkId; }],
    ...[0, -1, 1.5, 900001, "1000"].map((timeout) => [`timeout ${timeout}`, (p) => { p.checks[0].runner.timeoutMs = timeout; }]),
  ];
  for (const [label, mutate] of invalid) {
    const value = structuredClone(policy); mutate(value);
    assert.throws(() => parseIntegrationPolicy(value), undefined, label);
  }
  assert.deepEqual(parseIntegrationPolicy(policy), policy);
  const sourceIntegrity = { schemaVersion: 1, checks: [{ checkId: "champcity-source-integrity", lane: "static", runner: { kind: "source-integrity", timeoutMs: 60000 } }], requiredIntegrationChecks: ["champcity-source-integrity"] };
  assert.deepEqual(parseIntegrationPolicy(sourceIntegrity), sourceIntegrity);
  for (const extra of [{ command: "git status" }, { script: "test" }, { path: "." }, { args: [] }]) {
    assert.throws(() => parseIntegrationPolicy({ ...sourceIntegrity, checks: [{ ...sourceIntegrity.checks[0], runner: { ...sourceIntegrity.checks[0].runner, ...extra } }] }));
  }
  const repair = { allowedEditableRoots: ["src"], protectedPaths: ["src/protected"], sources: [{ role: "architecture", path: "docs/architecture.md" }] };
  assert.deepEqual(parseIntegrationPolicy({ ...policy, repair }).repair, repair);
  for (const change of [
    { allowedEditableRoots: ["."] }, { allowedEditableRoots: ["src/**"] }, { allowedEditableRoots: ["../src"] },
    { allowedEditableRoots: [] }, { allowedEditableRoots: ["src", "SRC"] }, { protectedPaths: ["src/../policy"] },
    { sources: [{ role: "intake", path: "intake.md" }] }, { sources: [{ role: "contract", path: "docs/data.json" }] },
    { sources: Array(15).fill(repair.sources[0]) }, { command: "expand-scope" },
  ]) assert.throws(() => parseIntegrationPolicy({ ...policy, repair: { ...repair, ...change } }));
  assert.throws(() => loadIntegrationPolicy(root), /missing/);
  const directory = path.join(root, ".champcity"); fs.mkdirSync(directory);
  const config = path.join(directory, "integration-policy.json");
  fs.writeFileSync(config, "{"); assert.throws(() => loadIntegrationPolicy(root), /JSON/);
  fs.writeFileSync(config, Buffer.from([0xff])); assert.throws(() => loadIntegrationPolicy(root), /UTF-8/);
  fs.writeFileSync(config, " ".repeat(INTEGRATION_POLICY_MAX_BYTES + 1)); assert.throws(() => loadIntegrationPolicy(root), /bound/);
  fs.unlinkSync(config); fs.mkdirSync(config); assert.throws(() => loadIntegrationPolicy(root), /ordinary-file/); fs.rmdirSync(config);
  fs.writeFileSync(config, JSON.stringify(policy));
  const loaded = loadIntegrationPolicy(root);
  assert.match(loaded.sha256, /^[a-f0-9]{64}$/);
  const other = path.join(root, "redirect"); fs.renameSync(directory, other);
  fs.symlinkSync(other, directory, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => loadIntegrationPolicy(root), /redirected/);
  fs.unlinkSync(directory); fs.renameSync(other, directory);
  // Required order belongs to the policy, not declaration order or alphabetical script names.
  const ordered = structuredClone(policy);
  ordered.checks.push({ ...ordered.checks[0], checkId: "second" });
  ordered.requiredIntegrationChecks = ["second", "source"];
  assert.deepEqual(parseIntegrationPolicy(ordered).requiredIntegrationChecks, ["second", "source"]);
});

test("application source-integrity policy validates only the registered clean exact candidate", async t => {
  const { createIntegrationPolicyProvider } = require("../../dist/main/planExecution/integrationPolicyProvider.js");
  const { integrationPaths } = require("../../dist/main/agentHarness/repository/integrationGit.js");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-source-integrity-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-b", "dev"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Policy Test"], { cwd: root });
  execFileSync("git", ["config", "user.email", "policy@example.invalid"], { cwd: root });
  fs.mkdirSync(path.join(root, ".champcity"));
  fs.writeFileSync(path.join(root, ".champcity", "integration-policy.json"), JSON.stringify({ schemaVersion: 1,
    checks: [{ checkId: "champcity-source-integrity", lane: "static", runner: { kind: "source-integrity", timeoutMs: 60000 } }],
    requiredIntegrationChecks: ["champcity-source-integrity"] }));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { "champcity-source-integrity": "node -e \"require('node:fs').writeFileSync('executed.txt','bad')\"" } }));
  fs.writeFileSync(path.join(root, "README.md"), "candidate source\n");
  execFileSync("git", ["add", "--all"], { cwd: root });
  execFileSync("git", ["commit", "-m", "source-integrity fixture"], { cwd: root, stdio: "ignore" });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const candidateId = "a".repeat(64);
  const paths = integrationPaths(root, candidateId);
  fs.mkdirSync(paths.base, { recursive: true });
  execFileSync("git", ["worktree", "add", "-b", paths.branch, paths.checkout, commit], { cwd: root, stdio: "ignore" });
  const resolved = await createIntegrationPolicyProvider(root).validationPolicy.resolve(commit);
  const context = Object.freeze({ repositoryId: "source-integrity-fixture", targetCommit: commit, incomingCommit: commit,
    candidateCommit: commit, candidateId, targetBranch: "dev", platform: process.platform });
  const proof = await resolved.checks[0].run(paths.checkout, context);
  assert.equal(proof.exitCode, 0);
  assert.equal(fs.existsSync(path.join(paths.checkout, "executed.txt")), false, "candidate repository code was not executed");
  fs.writeFileSync(path.join(paths.checkout, "README.md"), "dirty candidate\n");
  assert.equal((await resolved.checks[0].run(paths.checkout, context)).exitCode, 1);
});


function createBoundWorkspace(prefix, gitBacked) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const root = path.join(container, "Alpha");
  fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
  fs.writeFileSync(path.join(root, ".champcity", "mcp-workspace-binding.json"), JSON.stringify({
    mcpWorkspaceId: "alpha",
    label: "Alpha Test Workspace",
    repositoryName: "Test/Alpha",
    gitBacked,
  }, null, 2), "utf8");
  if (gitBacked) {
    execFileSync("git", ["init", "-b", "dev"], { cwd: root, stdio: "ignore" });
    configureGitIdentity(root);
  }
  fs.writeFileSync(path.join(root, "README.md"), "temporary repository\n", "utf8");
  return root;
}

function configureGitIdentity(root) {
  execFileSync("git", ["config", "user.name", "ChampCity Test"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "champcity-test@example.invalid"], { cwd: root, stdio: "ignore" });
}

function commitAllFixtureState(root, message) {
  execFileSync("git", ["add", "--all", "--", "."], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", message], { cwd: root, stdio: "ignore" });
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}
require("../support/integration-scenarios.cjs").registerIntegrationScenarios("target-owned repository policy gates isolated integration candidates", ["policy","policy-weakened-incoming","policy-valid-future","policy-invalid-future","policy-changed-script","policy-missing-script","policy-recreated","policy-stale-target"]);
