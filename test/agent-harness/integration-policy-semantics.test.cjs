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
