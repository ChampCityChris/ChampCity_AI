const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const repositoryRoot = path.resolve(__dirname, "../..");
const { establishManagedProjectSource } = require("../../dist/main/sourceControl/managedProjectSourceService.js");
const { loadIntegrationPolicyAtCommit, createIntegrationPolicyProvider } = require("../../dist/main/planExecution/integrationPolicyProvider.js");
const { VALIDATION_PROFILE_TOOLKIT_FILES } = require("../../dist/main/planExecution/integrationValidationProfileRunner.js");
const { createManagedRepositoryIntegrationPolicy, supportsManagedRepositoryValidationProfile } = require("../../dist/main/sourceControl/managedRepositoryIntegrationPolicy.js");
const {
  applyExistingProjectGitAdoption,
  EXISTING_PROJECT_GIT_ADOPTION_JOURNAL,
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

async function applyPlan(root, repositoryId, plan) {
  const result = await applyExistingProjectGitAdoption({
    projectRoot: root,
    repositoryId,
    planId: plan.planId,
    consent: true,
  });
  return result;
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

function installCurrentValidationAuthority(root, omitToolkitFile) {
  fs.copyFileSync(path.join(repositoryRoot, "package.json"), path.join(root, "package.json"));
  fs.mkdirSync(path.join(root, "validation"), { recursive: true });
  fs.copyFileSync(path.join(repositoryRoot, "validation", "capability-map.json"), path.join(root, "validation", "capability-map.json"));
  fs.copyFileSync(path.join(repositoryRoot, "validation", "profiles.json"), path.join(root, "validation", "profiles.json"));
  fs.mkdirSync(path.join(root, "scripts", "validation"), { recursive: true });
  for (const name of VALIDATION_PROFILE_TOOLKIT_FILES) {
    if (name !== omitToolkitFile) fs.copyFileSync(path.join(repositoryRoot, "scripts", "validation", name), path.join(root, "scripts", "validation", name));
  }
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

test("Source Control modules do not import Agent Harness runtime, MCP runtime, or toolbox implementations", () => {
  const sourceRoot = path.join(repositoryRoot, "src", "main", "sourceControl");
  const files = fs.readdirSync(sourceRoot).filter(name => name.endsWith(".ts"));
  const forbidden = /(?:agentHarness\/(?:runtime|tools)|mcpServer|mcpRuntime|toolRegistry|toolbox)/;
  for (const name of files) {
    const text = fs.readFileSync(path.join(sourceRoot, name), "utf8");
    const imports = [...text.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1]);
    assert.deepEqual(imports.filter(specifier => forbidden.test(specifier)), [], name);
  }
});

test("ChampCity-style dev repository with accumulated history normalizes and reopens idempotently", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-champcity-style-" });
  installCurrentValidationAuthority(root);
  fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
  const legacyPolicy = "{\"legacy\":true,\"repair\":\"must-not-survive\"}\n";
  fs.writeFileSync(path.join(root, ".champcity", "integration-policy.json"), legacyPolicy);
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
  const result = await applyPlan(root, "champcity-style", plan);
  const baseline = assertManaged(root);
  assert.equal(result.plan.state, "managed-ready");
  assert.deepEqual([result.source.mainCheckout.role, result.source.devCheckout.role].sort(), ["dev", "main"]);
  assert.equal(git(path.join(root, "Dev"), "merge-base", "--is-ancestor", oldDev, baseline), "");
  assert.match(git(path.join(root, "Dev"), "show-ref"), /refs\/heads\/historical\/release/);
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "refs/remotes/origin/dev"), oldDev);
  const generatedText = git(path.join(root, "Dev"), "show", `${baseline}:.champcity/integration-policy.json`);
  assert.notEqual(`${generatedText}\n`, legacyPolicy);
  const generated = JSON.parse(generatedText);
  assert.equal(generated.checks[0].runner.kind, "validation-profile");
  assert.equal(generated.checks[0].runner.profile, "integration-gate");
  assert.equal("repair" in generated, false);
  assert.equal((await loadIntegrationPolicyAtCommit(path.join(root, "Dev"), baseline)).policy.checks[0].runner.kind, "validation-profile");
  const resolved = await createIntegrationPolicyProvider(path.join(root, "Dev")).validationPolicy.resolve(baseline);
  assert.deepEqual(resolved.checks.map(check => check.checkId), ["champcity-integration-gate"]);
  const reopenedPlan = await inspectExistingProjectGitAdoption(root, "champcity-style");
  assert.equal(reopenedPlan.state, "managed-ready");
  const source = await establishManagedProjectSource({ projectRoot: root, repositoryId: "champcity-style" });
  assert.equal(source.materialized, false);
  assert.deepEqual([source.mainCheckout.repositoryCheckoutId, source.devCheckout.repositoryCheckoutId].sort(),
    [result.source.mainCheckout.repositoryCheckoutId, result.source.devCheckout.repositoryCheckoutId].sort());
});

test("managed policy provisioning ignores container state and incomplete validation authority falls back safely", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-policy-provisioning-" });
  fs.mkdirSync(path.join(root, ".champcity", "repository.git"), { recursive: true });
  fs.mkdirSync(path.join(root, ".champcity", "checkouts", "foreign"), { recursive: true });
  fs.mkdirSync(path.join(root, ".champcity", "migrations", "foreign"), { recursive: true });
  fs.writeFileSync(path.join(root, ".champcity", "project-state.sqlite"), "runtime-state");
  fs.writeFileSync(path.join(root, ".champcity", "arbitrary.json"), "{\"foreign\":true}\n");
  fs.writeFileSync(path.join(root, ".champcity", "integration-policy.json"), "{\"schemaVersion\":999}\n");
  const plan = await inspectExistingProjectGitAdoption(root, "generic-policy-project");
  await applyPlan(root, "generic-policy-project", plan);
  const baseline = assertManaged(root);
  const dev = path.join(root, "Dev");
  const tree = git(dev, "ls-tree", "-r", "--name-only", baseline).split(/\r?\n/);
  assert.deepEqual(tree.filter(name => name.startsWith(".champcity/")), [".champcity/integration-policy.json"]);
  const policy = (await loadIntegrationPolicyAtCommit(dev, baseline)).policy;
  assert.deepEqual(policy, {
    schemaVersion: 1,
    checks: [{ checkId: "champcity-source-integrity", lane: "static", runner: { kind: "source-integrity", timeoutMs: 60000 } }],
    requiredIntegrationChecks: ["champcity-source-integrity"],
  });

  const incomplete = tempRoot(context, "incomplete-validation-authority-").root;
  installCurrentValidationAuthority(incomplete, VALIDATION_PROFILE_TOOLKIT_FILES[0]);
  assert.equal(supportsManagedRepositoryValidationProfile(incomplete), false);
  assert.equal(createManagedRepositoryIntegrationPolicy(incomplete).checks[0].runner.kind, "source-integrity");
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

test("bounded Git source staging excludes a large ignored tree and relocates its junction without traversal", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-working-state-" });
  fs.writeFileSync(path.join(root, ".gitignore"), "local.log\nignored-cache/\n");
  git(root, "add", ".gitignore");
  git(root, "commit", "-m", "ignore local logs");
  fs.writeFileSync(path.join(root, "README.md"), "dirty accepted source\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "accepted untracked source\n");
  fs.writeFileSync(path.join(root, "local.log"), "ignored local bytes\n");
  const ignoredCache = path.join(root, "ignored-cache");
  fs.mkdirSync(path.join(ignoredCache, "packages"), { recursive: true });
  for (let index = 0; index < 256; index += 1) {
    fs.writeFileSync(path.join(ignoredCache, "packages", `generated-${index}.js`), `generated ${index}\n`);
  }
  const external = path.join(path.dirname(root), "external-local-target");
  fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, "sentinel.txt"), "must remain external\n");
  fs.symlinkSync(external, path.join(ignoredCache, "external-link"), process.platform === "win32" ? "junction" : "dir");
  const inspected = await inspectExistingProjectGitAdoption(root, "working-state");
  await applyPlan(root, "working-state", inspected);
  const baseline = assertManaged(root);
  assert.equal(git(path.join(root, "Main"), "show", `${baseline}:README.md`), "dirty accepted source");
  assert.equal(git(path.join(root, "Main"), "show", `${baseline}:untracked.txt`), "accepted untracked source");
  assert.throws(() => git(path.join(root, "Main"), "show", `${baseline}:local.log`));
  assert.throws(() => git(path.join(root, "Main"), "show", `${baseline}:ignored-cache/packages/generated-0.js`));
  assert.equal(fs.readFileSync(path.join(root, "Dev", "local.log"), "utf8"), "ignored local bytes\n");
  assert.equal(fs.readFileSync(path.join(root, "Dev", "ignored-cache", "packages", "generated-255.js"), "utf8"), "generated 255\n");
  assert.equal(fs.lstatSync(path.join(root, "Dev", "ignored-cache", "external-link")).isSymbolicLink(), true);
  assert.equal(fs.readFileSync(path.join(external, "sentinel.txt"), "utf8"), "must remain external\n");
  assert.equal(git(path.join(root, "Dev"), "status", "--porcelain"), "");
});

test("tracked symbolic-link source is preserved as an entry without following its external target", async context => {
  const { temp, root } = conventionalFixture(context, { prefix: "forced-tracked-link-" });
  const external = path.join(temp, "external-source-target");
  fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, "sentinel.txt"), "external bytes must not be copied\n");
  const linkName = "tracked-link";
  const link = path.join(root, linkName);
  fs.symlinkSync(external, link, process.platform === "win32" ? "junction" : "dir");
  if (process.platform === "win32") {
    const descriptor = path.join(temp, "tracked-link-target.txt");
    fs.writeFileSync(descriptor, fs.readlinkSync(link));
    const object = git(root, "hash-object", "-w", descriptor);
    git(root, "update-index", "--add", "--cacheinfo", "120000", object, linkName);
  } else {
    git(root, "add", linkName);
  }
  git(root, "commit", "-m", "track source link");
  const inspected = await inspectExistingProjectGitAdoption(root, "tracked-link-source");
  await applyPlan(root, "tracked-link-source", inspected);
  const baseline = assertManaged(root);
  assert.equal(git(path.join(root, "Main"), "ls-tree", baseline, linkName).startsWith("120000 blob "), true);
  assert.equal(git(path.join(root, "Main"), "ls-tree", "-r", "--name-only", baseline).includes(`${linkName}/sentinel.txt`), false);
  assert.equal(fs.lstatSync(path.join(root, "Dev", linkName)).isSymbolicLink(), true);
  assert.equal(fs.readlinkSync(path.join(root, "Dev", linkName)), external);
  assert.equal(fs.readFileSync(path.join(external, "sentinel.txt"), "utf8"), "external bytes must not be copied\n");
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
    const { temp, root } = conventionalFixture(context, { prefix: `forced-unreadable-${mode}-` });
    fs.writeFileSync(path.join(root, "CURRENT.txt"), `${mode} current bytes\n`);
    if (mode === "partial") {
      fs.mkdirSync(path.join(root, ".git", "refs", "heads"), { recursive: true });
      fs.writeFileSync(path.join(root, ".git", "refs", "heads", "broken"), "not-a-revision\n");
    } else {
      fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
      fs.mkdirSync(path.join(root, ".git"));
      fs.writeFileSync(path.join(root, ".git", "HEAD"), "foreign administration\n");
      const external = path.join(temp, "external-fallback-target");
      fs.mkdirSync(external);
      fs.writeFileSync(path.join(external, "outside.txt"), "outside fallback bytes\n");
      fs.symlinkSync(external, path.join(root, "source-link"), process.platform === "win32" ? "junction" : "dir");
    }
    const inspected = await inspectExistingProjectGitAdoption(root, `unreadable-${mode}`);
    assert.equal(inspected.state, "conversion-required", mode);
    await applyPlan(root, `unreadable-${mode}`, inspected);
    const baseline = assertManaged(root);
    assert.equal(fs.readFileSync(path.join(root, "Dev", "CURRENT.txt"), "utf8"), `${mode} current bytes\n`);
    if (mode === "foreign") {
      assert.equal(git(path.join(root, "Main"), "ls-tree", baseline, "source-link").startsWith("120000 blob "), true);
      assert.equal(git(path.join(root, "Main"), "ls-tree", "-r", "--name-only", baseline).includes("source-link/outside.txt"), false);
      assert.equal(fs.lstatSync(path.join(root, "Dev", "source-link")).isSymbolicLink(), true);
      assert.equal(fs.readFileSync(path.join(temp, "external-fallback-target", "outside.txt"), "utf8"), "outside fallback bytes\n");
    }
  }
});

test("known normalizing journal plus partial managed metadata residue is recoverable without manual deletion", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-partial-residue-" });
  fs.mkdirSync(path.join(root, ".champcity", "repository.git"), { recursive: true });
  fs.writeFileSync(path.join(root, ".champcity", "repository.git", "residue.txt"), "old metadata\n");
  const oldMigration = path.join(root, ".champcity", "migrations", "existing-project-normalization-old-attempt");
  fs.mkdirSync(path.join(oldMigration, "source-snapshot"), { recursive: true });
  fs.mkdirSync(path.join(oldMigration, "candidate-repository.git"), { recursive: true });
  fs.writeFileSync(path.join(oldMigration, "candidate-repository.git", "retained-candidate.txt"), "retained failed candidate\n");
  fs.writeFileSync(path.join(root, ".champcity", "migrations", "existing-project-git-adoption-v1.json"), JSON.stringify({
    schemaVersion: 3, migrationId: "old-attempt", repositoryId: "partial-residue", planId: "old-plan", stage: "failed",
    migrationRelativePath: ".champcity/migrations/existing-project-normalization-old-attempt",
    sourceSnapshotRelativePath: ".champcity/migrations/existing-project-normalization-old-attempt/source-snapshot",
    baselineRevision: "1111111111111111111111111111111111111111", importedRefCount: 13, baselineParentCount: 1,
    failureReason: "Service Host control connection closed.", failurePhase: "conventional checkout retirement",
    originalRootGitAuthoritative: true, cleanupWarnings: [],
    retainedRecoveryPaths: [".champcity/migrations/existing-project-normalization-old-attempt/candidate-repository.git"],
    conventionalCheckoutRestored: null, completedAt: null,
  }, null, 2));
  fs.mkdirSync(path.join(root, "Main"));
  fs.writeFileSync(path.join(root, "Main", "old-main.txt"), "old main bytes\n");
  fs.mkdirSync(path.join(root, "Dev"));
  fs.writeFileSync(path.join(root, "Dev", "old-dev.txt"), "old dev bytes\n");
  fs.writeFileSync(path.join(root, "CURRENT.txt"), "selected source\n");
  const inspected = await inspectExistingProjectGitAdoption(root, "partial-residue");
  assert.equal(inspected.state, "conversion-required");
  assert.notEqual(inspected.planId, "old-plan");
  await applyPlan(root, "partial-residue", inspected);
  assertManaged(root);
  assert.equal(fs.readFileSync(path.join(root, "Dev", "CURRENT.txt"), "utf8"), "selected source\n");
  const migration = fs.readdirSync(path.join(root, ".champcity", "migrations"))
    .find(name => name.startsWith("existing-project-normalization-") && name !== "existing-project-normalization-old-attempt");
  assert.ok(migration);
  assert.equal(fs.readFileSync(path.join(root, ".champcity", "migrations", migration, "preexisting-Main", "old-main.txt"), "utf8"), "old main bytes\n");
  assert.equal(fs.readFileSync(path.join(root, ".champcity", "migrations", migration, "preexisting-Dev", "old-dev.txt"), "utf8"), "old dev bytes\n");
});

test("managed metadata cutover retries transient Windows sharing failures within a bounded budget", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-metadata-retry-" });
  const metadata = path.join(root, ".champcity", "repository.git");
  fs.mkdirSync(metadata, { recursive: true });
  fs.writeFileSync(path.join(metadata, "residue.txt"), "pre-existing metadata\n");
  const inspected = await inspectExistingProjectGitAdoption(root, "metadata-retry");
  const originalRename = fs.renameSync;
  let attempts = 0;
  fs.renameSync = (source, destination, ...args) => {
    if (path.resolve(source) === path.resolve(metadata) && path.basename(destination) === "preexisting-repository.git" && attempts++ < 2) {
      const error = new Error("synthetic sharing violation"); error.code = "EPERM"; throw error;
    }
    return originalRename(source, destination, ...args);
  };
  try { await applyPlan(root, "metadata-retry", inspected); }
  finally { fs.renameSync = originalRename; }
  assert.equal(attempts, 3);
  assertManaged(root);
});

test("exhausted metadata relocation preserves the primary failure, root Git, and pre-existing metadata", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-metadata-failure-" });
  const metadata = path.join(root, ".champcity", "repository.git");
  fs.mkdirSync(metadata, { recursive: true });
  fs.writeFileSync(path.join(metadata, "residue.txt"), "must survive\n");
  const beforeHead = git(root, "rev-parse", "HEAD");
  const inspected = await inspectExistingProjectGitAdoption(root, "metadata-failure");
  const originalRename = fs.renameSync;
  let attempts = 0;
  fs.renameSync = (source, destination, ...args) => {
    if (path.resolve(source) === path.resolve(metadata) && path.basename(destination) === "preexisting-repository.git") {
      attempts += 1; const error = new Error("synthetic locked metadata"); error.code = "EACCES"; throw error;
    }
    return originalRename(source, destination, ...args);
  };
  try {
    await assert.rejects(applyPlan(root, "metadata-failure", inspected), /managed metadata cutover failed: pre-existing managed metadata/);
  } finally { fs.renameSync = originalRename; }
  assert.equal(attempts, 5);
  assert.equal(git(root, "rev-parse", "HEAD"), beforeHead);
  assert.equal(fs.readFileSync(path.join(metadata, "residue.txt"), "utf8"), "must survive\n");
  assert.equal(fs.existsSync(path.join(root, "Main")), false);
  assert.equal(fs.existsSync(path.join(root, "Dev")), false);
  const journal = JSON.parse(fs.readFileSync(path.join(root, ".champcity", "migrations", "existing-project-git-adoption-v1.json"), "utf8"));
  assert.equal(journal.stage, "failed");
  assert.equal(journal.failurePhase, "managed metadata cutover");
  assert.match(journal.failureReason, /synthetic locked metadata/);
  assert.equal(journal.originalRootGitAuthoritative, true);
  assert.equal(journal.retainedRecoveryPaths.some(value => value.endsWith("candidate-repository.git")), true);
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

test("manifest materialization failure removes only its partial migration staging and leaves a fresh plan", async context => {
  const { root } = conventionalFixture(context, { prefix: "forced-manifest-failure-" });
  const beforeHead = git(root, "rev-parse", "HEAD");
  const beforeSource = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const inspected = await inspectExistingProjectGitAdoption(root, "manifest-failure");
  const originalCopyFile = fs.copyFileSync;
  fs.copyFileSync = (source, destination, ...args) => {
    if (path.resolve(source) === path.resolve(root, "README.md")) {
      const error = new Error("synthetic unreadable source");
      error.code = "EACCES";
      throw error;
    }
    return originalCopyFile(source, destination, ...args);
  };
  try {
    await assert.rejects(applyPlan(root, "manifest-failure", inspected),
      /canonical source manifest\/materialization failed at 'README\.md'/);
  } finally {
    fs.copyFileSync = originalCopyFile;
  }
  assert.equal(git(root, "rev-parse", "HEAD"), beforeHead);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), beforeSource);
  assert.equal(fs.existsSync(path.join(root, ".git")), true);
  assert.equal(fs.existsSync(path.join(root, "Main")), false);
  assert.equal(fs.existsSync(path.join(root, "Dev")), false);
  const migrations = path.join(root, ".champcity", "migrations");
  assert.deepEqual(fs.readdirSync(migrations).filter(name => name.startsWith("existing-project-normalization-")), []);
  const reinspected = await inspectExistingProjectGitAdoption(root, "manifest-failure");
  assert.equal(reinspected.state, "conversion-required");
  assert.equal(reinspected.topology.recoveryStaging, false);
  assert.equal(reinspected.planId, inspected.planId);
});
