const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");

function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
function root(context) {
  const selected = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-greenfield-"));
  context.after(() => fs.rmSync(selected, { recursive: true, force: true }));
  return selected;
}
test("semantic greenfield bootstrap creates deterministic managed Main/Dev with tracked ignore baseline", async context => {
  const selected = root(context);
  const registrationCalls = [];
  const source = createSourceControlService({ repositoryId: "repository-greenfield", repositoryRoot: selected,
    checkoutRegistration: { workspaceId: "project-workspace", registerRepositoryCheckout: async (_workspaceId, checkout) => {
      registrationCalls.push(checkout); return { ...checkout, availability: "available", validationError: null };
    } } });
  const first = await source.bootstrapProjectSource();
  assert.equal(first.ok, true, JSON.stringify(first));
  const initial = first.result.initialRevision.revisionId;
  assert.equal(first.result.stableLine.headRevisionId, initial);
  assert.equal(first.result.integrationTarget.headRevisionId, initial);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  const main = path.join(selected, "Main");
  const dev = path.join(selected, "Dev");
  assert.equal(git(main, "branch", "--show-current"), "main");
  assert.equal(git(dev, "branch", "--show-current"), "dev");
  assert.equal(git(main, "rev-parse", "HEAD"), initial);
  assert.equal(git(dev, "rev-parse", "HEAD"), initial);
  assert.equal(git(main, "ls-files"), ".gitignore");
  fs.mkdirSync(path.join(main, "node_modules"));
  fs.writeFileSync(path.join(main, "node_modules", "ignored.txt"), "ignored\n");
  fs.writeFileSync(path.join(main, "visible.txt"), "visible\n");
  assert.match(git(main, "status", "--short"), /visible\.txt/);
  assert.doesNotMatch(git(main, "status", "--short"), /node_modules/);
  assert.equal(git(main, "rev-list", "--parents", "-n", "1", initial).split(" ").length, 1);
  const recovered = await source.bootstrapProjectSource();
  assert.equal(recovered.ok, true, JSON.stringify(recovered));
  assert.equal(recovered.result.initialRevision.revisionId, initial);
  assert.equal(git(dev, "rev-parse", "HEAD"), initial);
  assert.equal(registrationCalls.length, 4);
  assert.deepEqual(registrationCalls.slice(0, 2).map(checkout => checkout.role), ["main", "dev"]);
  const another = root(context);
  const same = await createSourceControlService({ repositoryId: "repository-second", repositoryRoot: another }).bootstrapProjectSource();
  assert.equal(same.ok, true, JSON.stringify(same));
  assert.equal(same.result.initialRevision.revisionId, initial, "empty baseline commit metadata is deterministic");
});
