const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { AgentHarnessService } = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const { establishManagedProjectSource } = require("../../dist/main/sourceControl/managedProjectSourceService.js");

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
