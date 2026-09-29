const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { AgentHarnessService } = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const { establishManagedProjectSource } = require("../../dist/main/sourceControl/managedProjectSourceService.js");
const {
  applyExistingProjectGitAdoption,
  createExistingProjectGitAdoptionJournal,
  inspectExistingProjectGitAdoption,
  inspectExistingProjectGitAdoptionEvidence,
  loadExistingProjectGitAdoptionJournal,
  newExistingProjectGitAdoptionJournal,
} = require("../../dist/main/sourceControl/existingProjectGitAdoptionService.js");

function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
function fixture(context, name = "managed-project-") {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), name));
  context.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, "Project");
  fs.mkdirSync(root);
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Synthetic Test");
  git(root, "config", "user.email", "test@example.invalid");
  fs.writeFileSync(path.join(root, "README.md"), "baseline\n");
  git(root, "add", "README.md");
  git(root, "commit", "-m", "baseline");
  git(root, "branch", "dev");
  git(root, "remote", "add", "origin", "https://example.invalid/team/project.git");
  return { temp, root };
}

async function applyPlan(context, root, repositoryId, plan, consent) {
  const harness = new AgentHarnessService({ userDataRoot: path.join(path.dirname(root), `userdata-${repositoryId}`) });
  context.after(() => harness.stop().catch(() => undefined));
  const workspace = await harness.registerWorkspaceRoot(root);
  return applyExistingProjectGitAdoption({
    projectRoot: root,
    repositoryId,
    workspaceId: workspace.workspace.workspaceId,
    checkoutRegistration: {
      registerRepositoryCheckout: (workspaceId, checkout) => harness.registerRepositoryCheckout(workspaceId, checkout),
    },
    planId: plan.planId,
    consent,
  });
}

test("Existing Project inspection distinguishes source-neutral and clean conventional source without mutation", async context => {
  const neutral = fs.mkdtempSync(path.join(os.tmpdir(), "managed-project-neutral-"));
  context.after(() => fs.rmSync(neutral, { recursive: true, force: true }));
  fs.writeFileSync(path.join(neutral, "NOTES.md"), "source neutral\n");
  const neutralBefore = fs.readdirSync(neutral).sort();
  const neutralPlan = await inspectExistingProjectGitAdoption(neutral, "project-source-inspection");
  assert.equal(neutralPlan.state, "source-neutral");
  assert.equal(neutralPlan.repositoryId, null);
  assert.deepEqual(fs.readdirSync(neutral).sort(), neutralBefore);

  const { root } = fixture(context, "managed-project-inspection-clean-");
  const beforeRefs = git(root, "show-ref");
  const beforeStatus = git(root, "status", "--porcelain=v1", "--untracked-files=all");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-inspection");
  assert.equal(plan.state, "conventional-auto");
  assert.equal(plan.requiresConsent, false);
  assert.equal(plan.mainAction, "none");
  assert.equal(plan.devAction, "none");
  assert.equal(git(root, "show-ref"), beforeRefs);
  assert.equal(git(root, "status", "--porcelain=v1", "--untracked-files=all"), beforeStatus);
});

test("inspection plans semantic normalization and binds planId to refs and working state", async context => {
  const { root } = fixture(context, "managed-project-inspection-semantic-");
  git(root, "switch", "-c", "feature/current");
  fs.writeFileSync(path.join(root, "feature.txt"), "feature commit\n");
  git(root, "add", "feature.txt");
  git(root, "commit", "-m", "feature work");
  const branchPlan = await inspectExistingProjectGitAdoption(root, "project-source-semantic");
  assert.equal(branchPlan.state, "migration-consent-required");
  assert.equal(branchPlan.activeBranchAction, "fast-forward-dev");
  assert.equal(branchPlan.requiresConsent, true);
  git(root, "tag", "inspection-digest-change");
  const tagPlan = await inspectExistingProjectGitAdoption(root, "project-source-semantic");
  assert.notEqual(tagPlan.planId, branchPlan.planId);
  fs.writeFileSync(path.join(root, "dirty.txt"), "working bytes\n");
  const dirtyPlan = await inspectExistingProjectGitAdoption(root, "project-source-semantic");
  assert.notEqual(dirtyPlan.planId, tagPlan.planId);
  assert.equal(dirtyPlan.workingState.captureSnapshotRequired, true);
  assert.equal(dirtyPlan.workingState.untrackedCount, 1);
});

test("missing main derives the attached baseline while unsupported topology fails closed", async context => {
  const { root } = fixture(context, "managed-project-inspection-baseline-");
  git(root, "branch", "-m", "master");
  git(root, "branch", "-D", "dev");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-baseline");
  assert.equal(plan.state, "migration-consent-required");
  assert.equal(plan.baselineSourceRef, "master");
  assert.equal(plan.mainAction, "create-from-source");
  assert.equal(plan.devAction, "create-from-main");

  fs.writeFileSync(path.join(root, ".gitmodules"), "[submodule \"foreign\"]\n");
  const unsupported = await inspectExistingProjectGitAdoption(root, "project-source-baseline");
  assert.equal(unsupported.state, "manual-intervention-required");
  assert.match(unsupported.manualReason, /Submodules|alternates/);
});

test("adoption journal is atomic, bounded, and rejects foreign or stale identity", async context => {
  const { root } = fixture(context, "managed-project-inspection-journal-");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-journal");
  const evidence = await inspectExistingProjectGitAdoptionEvidence(root);
  const journal = newExistingProjectGitAdoptionJournal({ repositoryId: "project-source-journal", plan, ...evidence });
  createExistingProjectGitAdoptionJournal(root, journal);
  assert.equal(loadExistingProjectGitAdoptionJournal(root, "project-source-journal", plan.planId).stage, "planned");
  assert.throws(() => loadExistingProjectGitAdoptionJournal(root, "foreign-repository"), /different Repository identity/);
  assert.throws(() => loadExistingProjectGitAdoptionJournal(root, "project-source-journal", "stale-plan"), /stale inspection plan/);
  assert.equal(fs.readdirSync(path.join(root, ".champcity", "migrations")).some(name => name.endsWith(".tmp")), false);
});

test("apply revalidates clean automatic adoption and managed reopen idempotently", async context => {
  const { root } = fixture(context, "managed-project-apply-clean-");
  git(root, "tag", "preserved-tag");
  git(root, "branch", "preserved-branch");
  const refs = git(root, "for-each-ref", "--sort=refname", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-apply-clean");
  const applied = await applyPlan(context, root, "project-source-apply-clean", plan, false);
  assert.equal(applied.applied, true);
  assert.equal(applied.plan.state, "managed-ready");
  assert.equal(fs.existsSync(path.join(root, ".git")), false);
  assert.equal(git(path.join(root, "Dev"), "for-each-ref", "--sort=refname", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"), refs);
  assert.equal(loadExistingProjectGitAdoptionJournal(root, "project-source-apply-clean").stage, "completed");
  assert.equal(fs.existsSync(path.join(root, ".champcity", "migrations", "existing-project-git-adoption-v1.receipt.json")), true);
  const reopenPlan = await inspectExistingProjectGitAdoption(root, "project-source-apply-clean");
  const reopened = await applyPlan(context, root, "project-source-apply-clean", reopenPlan, false);
  assert.equal(reopened.applied, false);
  assert.equal(reopened.plan.state, "managed-ready");
});

test("apply creates missing main/dev from the exact attached baseline without deleting the source branch", async context => {
  const { root } = fixture(context, "managed-project-apply-baseline-");
  git(root, "branch", "-m", "master");
  git(root, "branch", "-D", "dev");
  const baseline = git(root, "rev-parse", "HEAD");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-apply-baseline");
  const applied = await applyPlan(context, root, "project-source-apply-baseline", plan, true);
  assert.equal(applied.applied, true);
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "refs/heads/main"), baseline);
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "refs/heads/dev"), baseline);
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "refs/heads/master"), baseline);
});

test("apply integrates an active feature into dev while preserving the feature ref and main", async context => {
  const { root } = fixture(context, "managed-project-apply-feature-");
  const main = git(root, "rev-parse", "refs/heads/main");
  git(root, "switch", "-c", "feature/current");
  fs.writeFileSync(path.join(root, "feature.txt"), "feature source\n");
  git(root, "add", "feature.txt");
  git(root, "commit", "-m", "feature source");
  const feature = git(root, "rev-parse", "HEAD");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-apply-feature");
  assert.equal(plan.activeBranchAction, "fast-forward-dev");
  await applyPlan(context, root, "project-source-apply-feature", plan, true);
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "refs/heads/main"), main);
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "refs/heads/dev"), feature);
  assert.equal(git(path.join(root, "Dev"), "rev-parse", "refs/heads/feature/current"), feature);
});

test("accepted dirty adoption commits non-ignored bytes to dev and preserves ignored files locally", async context => {
  const { root } = fixture(context, "managed-project-apply-dirty-");
  fs.writeFileSync(path.join(root, ".gitignore"), "ignored.log\n");
  git(root, "add", ".gitignore");
  git(root, "commit", "-m", "ignore local log");
  const main = git(root, "rev-parse", "refs/heads/main");
  fs.writeFileSync(path.join(root, "README.md"), "dirty tracked bytes\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "untracked bytes\n");
  fs.writeFileSync(path.join(root, "ignored.log"), "ignored bytes\n");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-apply-dirty");
  assert.equal(plan.workingState.captureSnapshotRequired, true);
  const applied = await applyPlan(context, root, "project-source-apply-dirty", plan, true);
  assert.equal(applied.applied, true);
  assert.equal(git(path.join(root, "Main"), "rev-parse", "HEAD"), main);
  assert.equal(fs.readFileSync(path.join(root, "Dev", "README.md"), "utf8").replace(/\r\n/g, "\n"), "dirty tracked bytes\n");
  assert.equal(fs.readFileSync(path.join(root, "Dev", "untracked.txt"), "utf8").replace(/\r\n/g, "\n"), "untracked bytes\n");
  assert.equal(fs.readFileSync(path.join(root, "Dev", "ignored.log"), "utf8"), "ignored bytes\n");
  assert.match(git(path.join(root, "Dev"), "log", "-1", "--format=%s"), /adoption snapshot/);
  assert.equal(git(path.join(root, "Dev"), "status", "--porcelain", "--untracked-files=all"), "");
});

test("stale or unconsented apply performs no migration mutation", async context => {
  const { root } = fixture(context, "managed-project-apply-stale-");
  fs.writeFileSync(path.join(root, "dirty.txt"), "requires consent\n");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-apply-stale");
  const refs = git(root, "show-ref");
  await assert.rejects(applyPlan(context, root, "project-source-apply-stale", plan, false), /explicit consent/);
  assert.equal(git(root, "show-ref"), refs);
  assert.equal(fs.existsSync(path.join(root, ".champcity")), false);
  fs.writeFileSync(path.join(root, "later.txt"), "stale plan\n");
  await assert.rejects(applyPlan(context, root, "project-source-apply-stale", plan, true), /stale/);
  assert.equal(git(root, "show-ref"), refs);
  assert.equal(fs.existsSync(path.join(root, ".champcity")), false);
});

test("divergent active-branch conflict leaves dev unchanged and returns a manual inspection state", async context => {
  const { root } = fixture(context, "managed-project-apply-conflict-");
  fs.writeFileSync(path.join(root, "conflict.txt"), "base\n");
  git(root, "add", "conflict.txt");
  git(root, "commit", "-m", "conflict base");
  git(root, "branch", "-f", "dev", "HEAD");
  git(root, "switch", "dev");
  fs.writeFileSync(path.join(root, "conflict.txt"), "dev\n");
  git(root, "commit", "-am", "dev conflict");
  const dev = git(root, "rev-parse", "HEAD");
  git(root, "switch", "-c", "feature/conflict", "main");
  fs.writeFileSync(path.join(root, "conflict.txt"), "feature\n");
  git(root, "commit", "-am", "feature conflict");
  const plan = await inspectExistingProjectGitAdoption(root, "project-source-apply-conflict");
  assert.equal(plan.activeBranchAction, "merge-into-dev");
  await assert.rejects(applyPlan(context, root, "project-source-apply-conflict", plan, true), /conflicts with dev/);
  assert.equal(git(root, "rev-parse", "refs/heads/dev"), dev);
  assert.equal(fs.existsSync(path.join(root, ".git")), true);
  assert.equal(fs.existsSync(path.join(root, ".champcity", "repository.git")), false);
  const manual = await inspectExistingProjectGitAdoption(root, "project-source-apply-conflict");
  assert.equal(manual.state, "manual-intervention-required");
  assert.match(manual.manualReason, /conflict/);
});

test("metadata-only interrupted migration is journal-proven, rolled back, and resumed to completion", async context => {
  const { root } = fixture(context, "managed-project-apply-resume-");
  const repositoryId = "project-source-apply-resume";
  const original = await inspectExistingProjectGitAdoption(root, repositoryId);
  const evidence = await inspectExistingProjectGitAdoptionEvidence(root);
  const journal = newExistingProjectGitAdoptionJournal({ repositoryId, plan: original, ...evidence });
  journal.resources = [".champcity/repository.git", "Dev", "Main"];
  createExistingProjectGitAdoptionJournal(root, journal);
  const managed = path.join(root, ".champcity", "repository.git");
  fs.cpSync(path.join(root, ".git"), managed, { recursive: true });
  git(root, "--git-dir", managed, "config", "core.bare", "true");
  const partial = await inspectExistingProjectGitAdoption(root, repositoryId);
  assert.equal(partial.state, "resumable-partial");
  const resumed = await applyPlan(context, root, repositoryId, partial, false);
  assert.equal(resumed.applied, true);
  assert.equal(resumed.plan.state, "managed-ready");
  assert.equal(fs.existsSync(path.join(root, ".git")), false);
  assert.equal(loadExistingProjectGitAdoptionJournal(root, repositoryId).stage, "completed");
});

test("conventional Project adoption preserves source, Git history, remotes, and registers exact Main/Dev checkouts", async context => {
  const { temp, root } = fixture(context);
  fs.mkdirSync(path.join(root, ".champcity"));
  fs.writeFileSync(path.join(root, ".champcity", "project-state.sqlite"), "preserve project state\n");
  fs.writeFileSync(path.join(root, "README.md"), "dirty tracked content\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "keep untracked content\n");
  const beforeRefs = git(root, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags");
  const beforeRemotes = git(root, "remote", "-v");
  const harness = new AgentHarnessService({ userDataRoot: path.join(temp, "userdata") });
  try {
    const workspace = await harness.registerWorkspaceRoot(root);
    const registration = {
      registerRepositoryCheckout: (workspaceId, checkout) => harness.registerRepositoryCheckout(workspaceId, checkout),
      unregisterRepositoryCheckout: (workspaceId, checkoutId) => harness.unregisterRepositoryCheckout(workspaceId, checkoutId),
    };
    const adopted = await establishManagedProjectSource({ projectRoot: root, repositoryId: "project-source-1",
      workspaceId: workspace.workspace.workspaceId, checkoutRegistration: registration });
    assert.equal(adopted.materialized, true);
    assert.equal(adopted.main.availability, "available");
    assert.equal(adopted.dev.availability, "available");
    assert.deepEqual([adopted.main.projectRelativePath, adopted.dev.projectRelativePath], ["Main", "Dev"]);
    assert.equal(fs.existsSync(path.join(root, ".git")), false);
    assert.throws(() => execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }));
    assert.equal(path.resolve(git(adopted.mainCheckoutRoot, "rev-parse", "--show-toplevel")), path.resolve(adopted.mainCheckoutRoot));
    assert.equal(path.resolve(git(adopted.devCheckoutRoot, "rev-parse", "--show-toplevel")), path.resolve(adopted.devCheckoutRoot));
    assert.equal(git(adopted.mainCheckoutRoot, "branch", "--show-current"), "main");
    assert.equal(git(adopted.devCheckoutRoot, "branch", "--show-current"), "dev");
    assert.equal(git(adopted.repositoryMetadataRoot, "rev-parse", "--is-bare-repository"), "true");
    assert.equal(git(adopted.mainCheckoutRoot, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"), beforeRefs);
    assert.equal(git(adopted.mainCheckoutRoot, "remote", "-v"), beforeRemotes);
    assert.equal(fs.readFileSync(path.join(adopted.mainCheckoutRoot, "README.md"), "utf8"), "dirty tracked content\n");
    assert.equal(fs.readFileSync(path.join(adopted.mainCheckoutRoot, "untracked.txt"), "utf8"), "keep untracked content\n");
    assert.match(git(adopted.mainCheckoutRoot, "status", "--porcelain"), /README\.md/);
    assert.match(git(adopted.mainCheckoutRoot, "status", "--porcelain"), /untracked\.txt/);
    assert.equal(git(adopted.devCheckoutRoot, "status", "--porcelain"), "");
    assert.equal(fs.readFileSync(path.join(root, ".champcity", "project-state.sqlite"), "utf8"), "preserve project state\n");
    assert.equal(fs.existsSync(path.join(root, ".champcity", "checkouts")), false);
    const reopened = await establishManagedProjectSource({ projectRoot: root, repositoryId: "project-source-1",
      workspaceId: workspace.workspace.workspaceId, checkoutRegistration: registration });
    assert.equal(reopened.materialized, false);
    assert.equal(reopened.main.repositoryCheckoutId, adopted.main.repositoryCheckoutId);
  } finally { await harness.stop().catch(() => undefined); }
});

test("main-only conventional Project adoption creates Dev at the exact Main revision", async context => {
  const { root } = fixture(context, "managed-project-main-only-");
  git(root, "branch", "-D", "dev");
  const mainRevision = git(root, "rev-parse", "refs/heads/main");
  const beforeRefs = git(root, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags");
  const beforeRemotes = git(root, "remote", "-v");
  const source = path.join(root, "README.md");
  fs.writeFileSync(path.join(root, "untracked.txt"), "main working state\n");
  const before = fs.readFileSync(source, "utf8");
  fs.writeFileSync(source, "dirty main content\n");
  const harness = new AgentHarnessService({ userDataRoot: path.join(path.dirname(root), "userdata") });
  try {
    const workspace = await harness.registerWorkspaceRoot(root);
    const adopted = await establishManagedProjectSource({ projectRoot: root, repositoryId: "project-source-main-only",
      workspaceId: workspace.workspace.workspaceId, checkoutRegistration: {
        registerRepositoryCheckout: (workspaceId, checkout) => harness.registerRepositoryCheckout(workspaceId, checkout),
      } });
    assert.equal(adopted.materialized, true);
    const expectedRefs = [...beforeRefs.split(/\r?\n/), `refs/heads/dev\0${mainRevision}`].sort().join("\n");
    assert.equal(git(adopted.repositoryMetadataRoot, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"), expectedRefs);
    assert.equal(git(adopted.mainCheckoutRoot, "rev-parse", "HEAD"), mainRevision);
    assert.equal(git(adopted.devCheckoutRoot, "rev-parse", "HEAD"), mainRevision);
    assert.equal(git(adopted.mainCheckoutRoot, "status", "--porcelain").includes("README.md"), true);
    assert.equal(git(adopted.mainCheckoutRoot, "status", "--porcelain").includes("untracked.txt"), true);
    assert.equal(git(adopted.devCheckoutRoot, "status", "--porcelain"), "");
    assert.equal(git(adopted.mainCheckoutRoot, "remote", "-v"), beforeRemotes);
    assert.equal(fs.readFileSync(path.join(adopted.mainCheckoutRoot, "README.md"), "utf8"), "dirty main content\n");
    assert.equal(fs.readFileSync(path.join(adopted.mainCheckoutRoot, "untracked.txt"), "utf8"), "main working state\n");
    assert.equal(fs.readFileSync(path.join(adopted.devCheckoutRoot, "README.md"), "utf8").replace(/\r?\n/g, "\n"), before);
  } finally { await harness.stop().catch(() => undefined); }
});

test("conventional local Project adoption preserves an empty remote set", async context => {
  const { temp, root } = fixture(context, "managed-project-local-only-");
  git(root, "remote", "remove", "origin");
  assert.equal(git(root, "remote", "-v"), "");
  const harness = new AgentHarnessService({ userDataRoot: path.join(temp, "userdata") });
  try {
    const workspace = await harness.registerWorkspaceRoot(root);
    const adopted = await establishManagedProjectSource({ projectRoot: root, repositoryId: "local-only-project",
      workspaceId: workspace.workspace.workspaceId, checkoutRegistration: {
        registerRepositoryCheckout: (workspaceId, checkout) => harness.registerRepositoryCheckout(workspaceId, checkout),
      } });
    assert.equal(adopted.materialized, true);
    assert.equal(git(adopted.mainCheckoutRoot, "remote", "-v"), "");
    assert.equal(git(adopted.devCheckoutRoot, "remote", "-v"), "");
  } finally { await harness.stop().catch(() => undefined); }
});

test("dev-current conventional adoption keeps dirty and untracked bytes on Dev and leaves Main clean", async context => {
  const { temp, root } = fixture(context, "managed-project-dev-current-");
  fs.writeFileSync(path.join(root, "main-only.txt"), "main revision\n");
  git(root, "add", "main-only.txt");
  git(root, "commit", "-m", "main-specific");
  const mainRevision = git(root, "rev-parse", "refs/heads/main");
  const devRevision = git(root, "rev-parse", "refs/heads/dev");
  git(root, "checkout", "dev");
  fs.writeFileSync(path.join(root, "README.md"), "dirty dev content\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "dev working state\n");
  const beforeRefs = git(root, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags");
  const harness = new AgentHarnessService({ userDataRoot: path.join(temp, "userdata") });
  try {
    const workspace = await harness.registerWorkspaceRoot(root);
    const adopted = await establishManagedProjectSource({ projectRoot: root, repositoryId: "project-source-dev-current",
      workspaceId: workspace.workspace.workspaceId, checkoutRegistration: {
        registerRepositoryCheckout: (workspaceId, checkout) => harness.registerRepositoryCheckout(workspaceId, checkout),
      } });
    assert.equal(git(adopted.repositoryMetadataRoot, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"), beforeRefs);
    assert.equal(git(adopted.devCheckoutRoot, "rev-parse", "HEAD"), devRevision);
    assert.equal(git(adopted.mainCheckoutRoot, "rev-parse", "HEAD"), mainRevision);
    assert.equal(git(adopted.devCheckoutRoot, "status", "--porcelain").includes("README.md"), true);
    assert.equal(git(adopted.devCheckoutRoot, "status", "--porcelain").includes("untracked.txt"), true);
    assert.equal(git(adopted.mainCheckoutRoot, "status", "--porcelain"), "");
    assert.equal(fs.readFileSync(path.join(adopted.devCheckoutRoot, "README.md"), "utf8"), "dirty dev content\n");
    assert.equal(fs.readFileSync(path.join(adopted.devCheckoutRoot, "untracked.txt"), "utf8"), "dev working state\n");
    assert.equal(fs.readFileSync(path.join(adopted.mainCheckoutRoot, "README.md"), "utf8").replace(/\r?\n/g, "\n"), "baseline\n");
    assert.equal(fs.readFileSync(path.join(adopted.mainCheckoutRoot, "main-only.txt"), "utf8").replace(/\r?\n/g, "\n"), "main revision\n");
  } finally { await harness.stop().catch(() => undefined); }
});

test("unsupported conventional branch fails before changing branch refs or source bytes", async context => {
  const { root } = fixture(context, "managed-project-feature-");
  git(root, "checkout", "-b", "feature/task");
  fs.writeFileSync(path.join(root, "README.md"), "dirty feature content\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "feature working state\n");
  const beforeRefs = git(root, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags");
  const beforeStatus = git(root, "status", "--porcelain");
  await assert.rejects(establishManagedProjectSource({ projectRoot: root, repositoryId: "project-source-feature", workspaceId: "project",
    checkoutRegistration: { registerRepositoryCheckout: async () => { throw new Error("must not register"); } } }), /currently on 'feature\/task'.*only main or dev/);
  assert.equal(git(root, "branch", "--show-current"), "feature/task");
  assert.equal(git(root, "for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"), beforeRefs);
  assert.equal(git(root, "status", "--porcelain"), beforeStatus);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "dirty feature content\n");
  assert.equal(fs.readFileSync(path.join(root, "untracked.txt"), "utf8"), "feature working state\n");
  assert.equal(fs.existsSync(path.join(root, ".git")), true);
  assert.equal(fs.existsSync(path.join(root, "Main")), false);
  assert.equal(fs.existsSync(path.join(root, "Dev")), false);
  assert.equal(fs.existsSync(path.join(root, ".champcity", "repository.git")), false);
});

test("a conflicting Main source entry is preserved and blocks adoption", async context => {
  const { root } = fixture(context, "managed-project-main-conflict-");
  fs.mkdirSync(path.join(root, "Main"));
  fs.writeFileSync(path.join(root, "Main", "user.txt"), "user content\n");
  await assert.rejects(establishManagedProjectSource({ projectRoot: root, repositoryId: "project-source-3", workspaceId: "project",
    checkoutRegistration: { registerRepositoryCheckout: async () => { throw new Error("must not register"); } } }), /conflict/);
  assert.equal(fs.readFileSync(path.join(root, "Main", "user.txt"), "utf8"), "user content\n");
  assert.equal(fs.existsSync(path.join(root, ".champcity", "repository.git")), false);
  assert.equal(fs.existsSync(path.join(root, ".git")), true);
});

test("redirected Project State storage blocks adoption before moving source", async context => {
  const { temp, root } = fixture(context, "managed-project-redirect-");
  const outside = path.join(temp, "redirect-target");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "keep outside content\n");
  try { fs.symlinkSync(outside, path.join(root, ".champcity"), "junction"); }
  catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) { context.skip(`Windows did not permit a junction fixture (${error.code}).`); return; }
    throw error;
  }
  await assert.rejects(establishManagedProjectSource({ projectRoot: root, repositoryId: "project-source-4", workspaceId: "project",
    checkoutRegistration: { registerRepositoryCheckout: async () => { throw new Error("must not register"); } } }), /redirect/);
  assert.equal(fs.readFileSync(path.join(outside, "sentinel.txt"), "utf8"), "keep outside content\n");
  assert.equal(fs.existsSync(path.join(root, ".git")), true);
  assert.equal(fs.existsSync(path.join(root, "Main")), false);
});
