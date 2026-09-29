const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { establishManagedProjectSource } = require("../../dist/main/sourceControl/managedProjectSourceService.js");
const {
  applyExistingProjectGitAdoption,
  inspectExistingProjectGitAdoption,
} = require("../../dist/main/sourceControl/existingProjectGitAdoptionService.js");

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function tempRoot(context, prefix = "forced-normalization-") {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  context.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, "Project");
  fs.mkdirSync(root);
  return { temp, root };
}

function conventionalFixture(context, options = {}) {
  const fixture = tempRoot(context, options.prefix);
  git(fixture.root, "init", "-b", "main");
  git(fixture.root, "config", "user.name", "Synthetic Test");
  git(fixture.root, "config", "user.email", "test@example.invalid");
  fs.writeFileSync(path.join(fixture.root, "README.md"), "baseline\n");
  git(fixture.root, "add", "README.md");
  git(fixture.root, "commit", "-m", "baseline");
  git(fixture.root, "branch", "dev");
  git(fixture.root, "remote", "add", "origin", "https://example.invalid/team/project.git");
  return fixture;
}

function registrationCollector() {
  const checkouts = [];
  return {
    checkouts,
    registration: {
      registerRepositoryCheckout: async (workspaceId, checkout) => {
        const result = { ...checkout, workspaceId };
        checkouts.push(result);
        return result;
      },
    },
  };
}

async function applyPlan(root, repositoryId, plan) {
  const collected = registrationCollector();
  const result = await applyExistingProjectGitAdoption({
    projectRoot: root,
    repositoryId,
    workspaceId: `workspace-${repositoryId}`,
    checkoutRegistration: collected.registration,
    planId: plan.planId,
    consent: true,
  });
  return { result, checkouts: collected.checkouts };
}

function assertManaged(root) {
  assert.equal(fs.existsSync(path.join(root, ".git")), false);
  assert.equal(git(path.join(root, "Main"), "branch", "--show-current"), "main");
  assert.equal(git(path.join(root, "Dev"), "branch", "--show-current"), "dev");
  const main = git(path.join(root, "Main"), "rev-parse", "HEAD");
  const dev = git(path.join(root, "Dev"), "rev-parse", "HEAD");
  assert.equal(main, dev);
  assert.equal(git(path.join(root, ".champcity", "repository.git"), "rev-parse", "--is-bare-repository"), "true");
  return main;
}

test("inspection exposes only source-neutral, conversion-required, managed-ready, and conversion-failed product states", async context => {
  const neutral = tempRoot(context, "forced-neutral-").root;
  fs.writeFileSync(path.join(neutral, "NOTES.md"), "ordinary source-neutral project\n");
  assert.equal((await inspectExistingProjectGitAdoption(neutral, "neutral-project")).state, "source-neutral");

  const { root } = conventionalFixture(context, { prefix: "forced-inspection-" });
  const conversion = await inspectExistingProjectGitAdoption(root, "conversion-project");
  assert.equal(conversion.state, "conversion-required");
  assert.equal(conversion.requiresConsent, true);
  assert.deepEqual(conversion.warnings, [
    "Prior Git was detected.",
    "The current source state will become the ChampCity baseline.",
    "The prior branch and worktree layout may stop functioning.",
    "Readable Git history, refs, and remotes will be retained where practical.",
    "Git metadata may be replaced or relocated.",
    "Source files are preserved before normalization.",
  ]);
  await applyPlan(root, "conversion-project", conversion);
  assert.equal((await inspectExistingProjectGitAdoption(root, "conversion-project")).state, "managed-ready");
});

test("ChampCity-style dev repository with accumulated history normalizes and reopens idempotently", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-champcity-style-" });
  for (let index = 1; index <= 5; index += 1) {
    fs.writeFileSync(path.join(root, `history-${index}.md`), `history ${index}\n`);
    git(root, "add", `history-${index}.md`);
    git(root, "commit", "-m", `history ${index}`);
  }
  git(root, "branch", "historical/release");
  git(root, "checkout", "dev");
  fs.writeFileSync(path.join(root, "DEV.md"), "current dev source\n");
  git(root, "add", "DEV.md");
  git(root, "commit", "-m", "current dev");
  const oldDev = git(root, "rev-parse", "dev");
  git(root, "update-ref", "refs/remotes/origin/dev", oldDev);
  git(root, "branch", "--set-upstream-to=origin/dev", "dev");
  const plan = await inspectExistingProjectGitAdoption(root, "champcity-style");
  assert.equal(plan.state, "conversion-required");
  const { result, checkouts } = await applyPlan(root, "champcity-style", plan);
  const baseline = assertManaged(root);
  assert.equal(result.plan.state, "managed-ready");
  assert.deepEqual(checkouts.map(item => item.role).sort(), ["dev", "main"]);
  assert.equal(git(path.join(root, "Dev"), "merge-base", "--is-ancestor", oldDev, baseline), "");
  assert.match(git(path.join(root, "Dev"), "show-ref"), /refs\/heads\/historical\/release/);
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "refs/remotes/origin/dev"), oldDev);
  const reopenedPlan = await inspectExistingProjectGitAdoption(root, "champcity-style");
  assert.equal(reopenedPlan.state, "managed-ready");
  const reopened = registrationCollector();
  const source = await establishManagedProjectSource({ projectRoot: root, repositoryId: "champcity-style", workspaceId: "workspace-champcity-style",
    checkoutRegistration: reopened.registration });
  assert.equal(source.materialized, false);
  assert.deepEqual(reopened.checkouts.map(item => item.repositoryCheckoutId).sort(), checkouts.map(item => item.repositoryCheckoutId).sort());
});

test("feature, detached, missing-main, and missing-dev repositories all take the same forced conversion path", async context => {
  const variants = [
    ["feature", root => git(root, "checkout", "-b", "feature/arbitrary")],
    ["detached", root => git(root, "checkout", "--detach")],
    ["missing-main", root => { git(root, "checkout", "dev"); git(root, "branch", "-D", "main"); }],
    ["missing-dev", root => git(root, "branch", "-D", "dev")],
  ];
  for (const [name, prepare] of variants) {
    const { root } = conventionalFixture(context, { prefix: `forced-${name}-` });
    prepare(root);
    fs.writeFileSync(path.join(root, `${name}.txt`), `${name} source\n`);
    const inspected = await inspectExistingProjectGitAdoption(root, `variant-${name}`);
    assert.equal(inspected.state, "conversion-required", name);
    await applyPlan(root, `variant-${name}`, inspected);
    assertManaged(root);
    assert.equal(fs.readFileSync(path.join(root, "Dev", `${name}.txt`), "utf8"), `${name} source\n`);
  }
});

test("dirty tracked and non-ignored untracked bytes enter the baseline while ignored local bytes survive only in Dev", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-working-state-" });
  fs.writeFileSync(path.join(root, ".gitignore"), "local.log\n");
  git(root, "add", ".gitignore");
  git(root, "commit", "-m", "ignore local logs");
  fs.writeFileSync(path.join(root, "README.md"), "dirty accepted source\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "accepted untracked source\n");
  fs.writeFileSync(path.join(root, "local.log"), "ignored local bytes\n");
  const inspected = await inspectExistingProjectGitAdoption(root, "working-state");
  await applyPlan(root, "working-state", inspected);
  const baseline = assertManaged(root);
  assert.equal(git(path.join(root, "Main"), "show", `${baseline}:README.md`), "dirty accepted source");
  assert.equal(git(path.join(root, "Main"), "show", `${baseline}:untracked.txt`), "accepted untracked source");
  assert.throws(() => git(path.join(root, "Main"), "show", `${baseline}:local.log`));
  assert.equal(fs.readFileSync(path.join(root, "Dev", "local.log"), "utf8"), "ignored local bytes\n");
  assert.equal(git(path.join(root, "Dev"), "status", "--porcelain"), "");
});

test("divergent readable local tips become bounded baseline parents without merge conflicts", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-divergent-" });
  fs.writeFileSync(path.join(root, "shared.txt"), "main version\n");
  git(root, "add", "shared.txt");
  git(root, "commit", "-m", "main side");
  const mainTip = git(root, "rev-parse", "main");
  git(root, "checkout", "dev");
  fs.writeFileSync(path.join(root, "shared.txt"), "dev version\n");
  git(root, "add", "shared.txt");
  git(root, "commit", "-m", "dev side");
  const devTip = git(root, "rev-parse", "dev");
  git(root, "checkout", "-b", "feature/divergent", "main");
  fs.writeFileSync(path.join(root, "shared.txt"), "accepted working version\n");
  git(root, "add", "shared.txt");
  git(root, "commit", "-m", "feature side");
  const featureTip = git(root, "rev-parse", "HEAD");
  const inspected = await inspectExistingProjectGitAdoption(root, "divergent-project");
  await applyPlan(root, "divergent-project", inspected);
  const baseline = assertManaged(root);
  const parents = new Set(git(path.join(root, "Dev"), "show", "-s", "--format=%P", baseline).split(/\s+/));
  assert.deepEqual(parents, new Set([mainTip, devTip, featureTip]));
  assert.equal(git(path.join(root, "Dev"), "show", `${baseline}:shared.txt`), "accepted working version");
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "feature/divergent"), featureTip);
});

test("extra linked-worktree metadata does not block selected Project conversion", async context => {
  const { temp, root } = conventionalFixture(context, { prefix: "forced-linked-worktree-" });
  const linked = path.join(temp, "Linked");
  git(root, "worktree", "add", "-b", "linked/history", linked);
  fs.writeFileSync(path.join(root, "README.md"), "selected root source\n");
  const inspected = await inspectExistingProjectGitAdoption(root, "linked-project");
  assert.equal(inspected.state, "conversion-required");
  await applyPlan(root, "linked-project", inspected);
  assertManaged(root);
  assert.equal(git(path.join(root, "Dev"), "show", "linked/history:README.md"), "baseline");
});

test("submodule and alternate metadata are import evidence rather than admission blockers", async context => {
  const { temp, root } = conventionalFixture(context, { prefix: "forced-submodule-alternate-" });
  const donor = path.join(temp, "Donor");
  fs.mkdirSync(donor);
  git(donor, "init", "--bare");
  fs.writeFileSync(path.join(root, ".gitmodules"), "[submodule \"vendor/demo\"]\n\tpath = vendor/demo\n\turl = ../demo.git\n");
  fs.mkdirSync(path.join(root, ".git", "objects", "info"), { recursive: true });
  fs.writeFileSync(path.join(root, ".git", "objects", "info", "alternates"), `${path.join(donor, "objects")}\n`);
  const inspected = await inspectExistingProjectGitAdoption(root, "metadata-project");
  assert.equal(inspected.state, "conversion-required");
  await applyPlan(root, "metadata-project", inspected);
  assertManaged(root);
  assert.match(fs.readFileSync(path.join(root, "Main", ".gitmodules"), "utf8"), /vendor\/demo/);
});

test("partly and fully unreadable Git administration fall back to fresh managed history while preserving source", async context => {
  for (const mode of ["partial", "foreign"]) {
    const { root } = conventionalFixture(context, { prefix: `forced-unreadable-${mode}-` });
    fs.writeFileSync(path.join(root, "CURRENT.txt"), `${mode} current bytes\n`);
    if (mode === "partial") {
      fs.mkdirSync(path.join(root, ".git", "refs", "heads"), { recursive: true });
      fs.writeFileSync(path.join(root, ".git", "refs", "heads", "broken"), "not-a-revision\n");
    } else {
      fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
      fs.mkdirSync(path.join(root, ".git"));
      fs.writeFileSync(path.join(root, ".git", "HEAD"), "foreign administration\n");
    }
    const inspected = await inspectExistingProjectGitAdoption(root, `unreadable-${mode}`);
    assert.equal(inspected.state, "conversion-required", mode);
    await applyPlan(root, `unreadable-${mode}`, inspected);
    assertManaged(root);
    assert.equal(fs.readFileSync(path.join(root, "Dev", "CURRENT.txt"), "utf8"), `${mode} current bytes\n`);
  }
});

test("previous partial ChampCity residue is relocated and cannot block normalization", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-partial-residue-" });
  fs.mkdirSync(path.join(root, ".champcity", "repository.git"), { recursive: true });
  fs.writeFileSync(path.join(root, ".champcity", "repository.git", "residue.txt"), "old metadata\n");
  fs.mkdirSync(path.join(root, "Main"));
  fs.writeFileSync(path.join(root, "Main", "old-main.txt"), "old main bytes\n");
  fs.mkdirSync(path.join(root, "Dev"));
  fs.writeFileSync(path.join(root, "Dev", "old-dev.txt"), "old dev bytes\n");
  fs.writeFileSync(path.join(root, "CURRENT.txt"), "selected source\n");
  const inspected = await inspectExistingProjectGitAdoption(root, "partial-residue");
  assert.equal(inspected.state, "conversion-required");
  await applyPlan(root, "partial-residue", inspected);
  assertManaged(root);
  assert.equal(fs.readFileSync(path.join(root, "Dev", "CURRENT.txt"), "utf8"), "selected source\n");
  const migration = fs.readdirSync(path.join(root, ".champcity", "migrations"))
    .find(name => name.startsWith("existing-project-normalization-"));
  assert.ok(migration);
  assert.equal(fs.readFileSync(path.join(root, ".champcity", "migrations", migration, "preexisting-Main", "old-main.txt"), "utf8"), "old main bytes\n");
  assert.equal(fs.readFileSync(path.join(root, ".champcity", "migrations", migration, "preexisting-Dev", "old-dev.txt"), "utf8"), "old dev bytes\n");
});

test("source-preservation staging failure aborts before Git or source mutation", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-preservation-failure-" });
  fs.mkdirSync(path.join(root, ".champcity"));
  fs.writeFileSync(path.join(root, ".champcity", "migrations"), "blocks staging directory\n");
  const beforeHead = git(root, "rev-parse", "HEAD");
  const beforeSource = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const inspected = await inspectExistingProjectGitAdoption(root, "preservation-failure");
  assert.equal(inspected.state, "conversion-required");
  await assert.rejects(applyPlan(root, "preservation-failure", inspected));
  assert.equal(git(root, "rev-parse", "HEAD"), beforeHead);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), beforeSource);
  assert.equal(fs.existsSync(path.join(root, ".git")), true);
  assert.equal(fs.existsSync(path.join(root, "Main")), false);
  assert.equal(fs.existsSync(path.join(root, "Dev")), false);
});
