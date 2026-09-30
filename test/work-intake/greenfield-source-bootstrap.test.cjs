const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");
const { parseIntegrationPolicy } = require("../../dist/shared/integrationPolicyContracts.js");

const genericPolicy = {
  schemaVersion: 1,
  checks: [{ checkId: "champcity-source-integrity", lane: "static", runner: { kind: "source-integrity", timeoutMs: 60000 } }],
  requiredIntegrationChecks: ["champcity-source-integrity"],
};

function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
function root(context) {
  const selected = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-greenfield-"));
  context.after(() => fs.rmSync(selected, { recursive: true, force: true }));
  return selected;
}
test("semantic greenfield bootstrap creates deterministic managed Main/Dev with tracked ignore baseline", async context => {
  const selected = root(context);
  const source = createSourceControlService({ repositoryId: "repository-greenfield", repositoryRoot: selected });
  const first = await source.bootstrapProjectSource();
  assert.equal(first.ok, true, JSON.stringify(first));
  const initial = first.result.initialRevision.revisionId;
  assert.equal(first.result.stableLine.headRevisionId, initial);
  assert.equal(first.result.integrationTarget.headRevisionId, initial);
  assert.equal(first.result.mainCheckout.role, "main");
  assert.equal(first.result.devCheckout.role, "dev");
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  const main = path.join(selected, "Main");
  const dev = path.join(selected, "Dev");
  assert.equal(git(main, "branch", "--show-current"), "main");
  assert.equal(git(dev, "branch", "--show-current"), "dev");
  assert.equal(git(main, "rev-parse", "HEAD"), initial);
  assert.equal(git(dev, "rev-parse", "HEAD"), initial);
  assert.deepEqual(git(main, "ls-files").split(/\r?\n/), [".champcity/integration-policy.json", ".gitignore"]);
  assert.deepEqual(parseIntegrationPolicy(JSON.parse(fs.readFileSync(path.join(main, ".champcity", "integration-policy.json"), "utf8"))), genericPolicy);
  assert.deepEqual(parseIntegrationPolicy(JSON.parse(fs.readFileSync(path.join(dev, ".champcity", "integration-policy.json"), "utf8"))), genericPolicy);
  fs.mkdirSync(path.join(main, "node_modules"));
  fs.writeFileSync(path.join(main, "node_modules", "ignored.txt"), "ignored\n");
  fs.writeFileSync(path.join(main, "visible.txt"), "visible\n");
  assert.match(git(main, "status", "--short"), /visible\.txt/);
  assert.doesNotMatch(git(main, "status", "--short"), /node_modules/);
  assert.equal(git(main, "rev-list", "--parents", "-n", "1", initial).split(" ").length, 1);
  const managedPolicy = { ...genericPolicy, checks: [{ ...genericPolicy.checks[0], runner: { ...genericPolicy.checks[0].runner, timeoutMs: 61000 } }] };
  fs.writeFileSync(path.join(dev, ".champcity", "integration-policy.json"), `${JSON.stringify(managedPolicy, null, 2)}\n`);
  const recovered = await source.bootstrapProjectSource();
  assert.equal(recovered.ok, true, JSON.stringify(recovered));
  assert.equal(recovered.result.initialRevision.revisionId, initial);
  assert.equal(git(dev, "rev-parse", "HEAD"), initial);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dev, ".champcity", "integration-policy.json"), "utf8")), managedPolicy,
    "managed reopen does not regenerate or overwrite repository policy");
  assert.deepEqual(recovered.result.mainCheckout, first.result.mainCheckout);
  assert.deepEqual(recovered.result.devCheckout, first.result.devCheckout);
  const another = root(context);
  const same = await createSourceControlService({ repositoryId: "repository-second", repositoryRoot: another }).bootstrapProjectSource();
  assert.equal(same.ok, true, JSON.stringify(same));
  assert.equal(same.result.initialRevision.revisionId, initial, "empty baseline commit metadata is deterministic");
});
