const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.resolve(__dirname, "..", "..");
const expectedTests = [
  "test/governance/operator-decision-contract.test.cjs",
  "test/governance/operator-decision-service.test.cjs",
  "test/workflow/operator-decision-routing.test.cjs",
  "test/execution-runs/execution-run-authority.test.cjs",
  "test/renderer/operator-approval-workspace.mounted.cjs",
  "test/repository/test-suite-integrity.test.cjs",
  "test/repository/validation-runner.test.cjs",
];

test("repository test tree and package lanes use stable capability tests only", () => {
  const testFiles = listFiles(path.join(repoRoot, "test"))
    .map((file) => normalize(path.relative(repoRoot, file)))
    .sort();
  assert.deepEqual(testFiles, [...expectedTests].sort());

  const topLevelTestDirectories = fs.readdirSync(path.join(repoRoot, "test"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.equal(topLevelTestDirectories.some((name) => /^wc/i.test(name)), false);
  assert.equal(testFiles.some((file) => /(?:^|[/_-])WC\d|REPAIR\d|wc\d|repair\d/.test(path.basename(file))), false);

  for (const file of testFiles.filter((candidate) => candidate.endsWith(".test.cjs"))) {
    const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
    assert.equal(/require\(["'][.][/][.][/].*src[/\\]/.test(content), false, `${file} imports from src`);
    assert.equal(/require\(["'][.][/].*src[/\\]/.test(content), false, `${file} imports from src`);
    assert.equal(/from ["'].*src[/\\]/.test(content), false, `${file} imports from src`);
  }

  const productionFiles = listFiles(path.join(repoRoot, "src"));
  for (const file of productionFiles) {
    const content = fs.readFileSync(file, "utf8");
    assert.equal(/(?:from|require\()\s*["'][^"']*test[/\\]/.test(content), false, normalize(path.relative(repoRoot, file)));
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const scripts = packageJson.scripts;
  for (const [name, command] of Object.entries(scripts)) {
    if (!name.startsWith("test")) continue;
    assert.equal(/test[/\\]wc/i.test(command), false, `${name} references test/wc`);
    assert.equal(/scripts[/\\]verify-/i.test(command), false, `${name} references scripts/verify`);
  }
  assert.equal(scripts["test:unit:built"], "node --test --test-concurrency=1");
  assert.equal(
    scripts["test:repository"],
    "node --test --test-concurrency=1 test/repository/test-suite-integrity.test.cjs test/repository/validation-runner.test.cjs",
  );
  assert.equal(scripts["test:renderer:built"], "electron test/renderer/operator-approval-workspace.mounted.cjs");
  assert.equal(scripts["test:full"], "npm run build && npm run test:unit:built && npm run test:renderer:built");
  for (const removed of [
    "test:legacy-migration:wc09",
    "test:wc04",
    "test:wc05",
    "test:wc06",
    "test:governance-mounted",
    "test:semantic-repair",
  ]) {
    assert.equal(Object.hasOwn(scripts, removed), false, removed);
  }

  const defaultDiscoverable = testFiles.filter((file) => file.endsWith(".test.cjs"));
  assert.deepEqual(defaultDiscoverable.sort(), [
    "test/execution-runs/execution-run-authority.test.cjs",
    "test/governance/operator-decision-contract.test.cjs",
    "test/governance/operator-decision-service.test.cjs",
    "test/repository/test-suite-integrity.test.cjs",
    "test/repository/validation-runner.test.cjs",
    "test/workflow/operator-decision-routing.test.cjs",
  ].sort());
  assert.equal(testFiles.includes("test/renderer/operator-approval-workspace.mounted.cjs"), true);

  const contractTest = readRepoFile("test/governance/operator-decision-contract.test.cjs");
  assert.equal(contractTest.includes('require("node:crypto")'), false);
  assert.equal(contractTest.includes("createHash("), false);
  assert.equal(contractTest.includes("computeOperatorDecisionTargetSetHash"), true);

  const routingTest = readRepoFile("test/workflow/operator-decision-routing.test.cjs");
  for (const prohibited of [
    "resolveWorkflowKernel",
    "WorkflowDomain",
    "implementationAuthorized:",
    "phaseProgressionAuthorized:",
    "function routeFor",
    "function artifactState",
  ]) {
    assert.equal(routingTest.includes(prohibited), false, prohibited);
  }
  for (const required of [
    "scanVerifiedArtifactGraph",
    "RelationshipDrivenWorkflowResolver",
    "GovernanceApprovalService",
    "ArtifactPairService",
  ]) {
    assert.equal(routingTest.includes(required), true, required);
  }

  const mountedTest = readRepoFile("test/renderer/operator-approval-workspace.mounted.cjs");
  assert.match(mountedTest, /\btest\(["']mounted Operator approval workspace executes through Electron["']/);
  assert.equal(mountedTest.includes("spawnSync"), true);
  assert.equal(mountedTest.includes('require("electron")') || mountedTest.includes("require('electron')"), true);
  assert.equal(/if\s*\([^)]*!process\.versions\.electron[^)]*\)[\s\S]*process\.exit\(0\)[\s\S]*spawnSync/.test(mountedTest), false);

  const executionRunTest = readRepoFile("test/execution-runs/execution-run-authority.test.cjs");
  const phaseSixJsonReferences = [...executionRunTest.matchAll(/planning\/phases\/phase-06\/[^"']+\.json/g)].map((match) => match[0]);
  assert.deepEqual([...new Set(phaseSixJsonReferences)].sort(), [
    "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC05_execution_pass_independent_verification_foundation_recovery.json",
    "planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json",
    "planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json",
  ].sort());
});

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(full));
    if (entry.isFile()) result.push(full);
  }
  return result;
}

function normalize(value) {
  return value.split(path.sep).join("/");
}

function readRepoFile(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}
