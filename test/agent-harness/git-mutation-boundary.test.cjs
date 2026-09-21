const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const repositoryRoot = path.resolve(__dirname, "../..");

test("generic source completion checkpoints only attributed files on the Intake branch and keeps remote failure separate", async (t) => {
  const { submitWorkIntake, getWorkIntakeProjection } = require("../../dist/main/workIntake/workIntakeService.js");
  const { captureWorkItemCheckpoint, observeCheckpointChanges } = require("../../dist/main/planExecution/workItemCheckpointService.js");
  const { completePlanWorkItemSource } = require("../../dist/main/planExecution/planExecutor.js");
  const { readCheckpointReceipt } = require("../../dist/main/planExecution/workItemCheckpointReceipt.js");
  const root = createBoundWorkspace("champcity-source-checkpoint-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, ".gitignore"), "/planning/\n");
  commitAllFixtureState(root, "fixture baseline");
  const before = git(root, ["rev-parse", "HEAD"]);
  const created = await submitWorkIntake(root, { projectId: null, projectName: "Checkpoint product", workRequest: "Correct bounded behavior", desiredOutcome: "Preserve accepted behavior", knownConstraints: "", hasExistingSourceOrPlanning: true, repositoryReviewContext: "", baseBranch: git(root, ["branch", "--show-current"]), baseCommit: before });
  assert.equal(created.ok, true);
  const intake = created.value;
  const routeDecisionId = "decision-00000000-0000-4000-8000-000000000001";
  const planId = "PLAN01";
  const artifactScope = { kind: "routed-direct-plan", intakeId: intake.intakeId, routeDecisionId, planId };
  const routedIdentity = (workCardId) => ({ intakeId: intake.intakeId, routeDecisionId, planId, workCardId, artifactScope });
  const contractPath = "planning/work-intake/work/WI01.md";
  const reportPath = "planning/work-intake/work/IMPLEMENTER_REPORT_WI01.md";
  writeDoc(root, contractPath, "formal-work-card", "Approved", { identity: routedIdentity("WI01"), sourceRevisions: [{ path: intake.relativePath, revision: 1 }], bodyMarkdown: "# WI01\n\nImplement the bounded correction." });
  writeDoc(root, reportPath, "implementer-report", "Pending", { identity: routedIdentity("WI01"), sourceRevisions: [{ path: contractPath, revision: 1 }], bodyMarkdown: "# Report\n\nReserved." });
  const reportBefore = fs.readFileSync(path.join(root, reportPath), "utf8");
  const intakeBefore = fs.readFileSync(path.join(root, intake.relativePath), "utf8");
  const capture = await captureWorkItemCheckpoint(root, { formalWorkCardPath: contractPath, implementerReportPath: reportPath, workCardId: "WI01" });
  const noCompletion = await completePlanWorkItemSource(root, { capture, implementationSucceeded: false, reportReady: false });
  assert.equal(noCompletion.status, "blocked");
  assert.equal(git(root, ["rev-parse", "HEAD"]), before);
  fs.writeFileSync(path.join(root, reportPath), reportBefore.replace("Reserved.", "Implemented correction. Focused validation passed; Operator review remains pending."));
  fs.writeFileSync(path.join(root, "correction.txt"), "bounded source change\n");
  observeCheckpointChanges(root, capture, [{ path: "correction.txt" }]);
  fs.writeFileSync(path.join(root, "unrelated.txt"), "unrelated concurrent change\n");
  let result = await completePlanWorkItemSource(root, { capture, implementationSucceeded: true, reportReady: true });
  assert.equal(result.status, "blocked"); assert.match(result.message, /Unattributed/);
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
  fs.unlinkSync(path.join(root, "unrelated.txt"));
  git(root, ["switch", "-c", "wrong-checkpoint-branch"]);
  result = await completePlanWorkItemSource(root, { capture, implementationSucceeded: true, reportReady: true });
  assert.equal(result.status, "blocked"); assert.match(result.message, /branch|checkout/);
  git(root, ["switch", intake.branchBinding.workBranch]);
  git(root, ["remote", "add", "unavailable", path.join(path.dirname(root), "missing-remote.git")]);
  capture.binding.remote = { name: "unavailable", syncState: "not-synced" };
  result = await completePlanWorkItemSource(root, { capture, implementationSucceeded: true, reportReady: true, synchronize: true });
  assert.equal(result.status, "committed", result.message);
  assert.equal(result.remote, "failed");
  assert.equal(git(root, ["rev-parse", "HEAD"]), result.commit);
  assert.equal(git(root, ["status", "--porcelain"]), "", "Receipt lives in the same commit without post-commit dirt");
  assert.equal(git(root, ["rev-list", "--count", `${before}..HEAD`]), "1");
  const receipt = readCheckpointReceipt(git(root, ["show", "--no-patch", "--format=%B", result.commit]), result.checkpointId);
  assert.equal(receipt.beforeHead, before); assert.equal(receipt.workItemId, "WI01");
  assert.equal(receipt.reportPath, reportPath);
  assert.equal(receipt.reportSha256, require("node:crypto").createHash("sha256").update(fs.readFileSync(path.join(root, reportPath))).digest("hex"));
  assert.equal(readCanonical(root, reportPath).metadata.documentDisposition.status, "Pending", "Checkpoint does not approve implementation");
  assert.equal(fs.readFileSync(path.join(root, intake.relativePath), "utf8"), intakeBefore, "Bookkeeping does not stale planning intent sources");
  assert.equal((await getWorkIntakeProjection(root)).currentIntake.branchBinding.currentHead, result.commit);
  assert.equal((await createWorkIntakeBranchService({ repositoryId: intake.branchBinding.repositoryId, repositoryRoot: root }).verify(intake.branchBinding)).currentHead, result.commit);
  const retry = await completePlanWorkItemSource(root, { capture, implementationSucceeded: true, reportReady: true });
  assert.equal(retry.status, "blocked"); assert.equal(git(root, ["rev-parse", "HEAD"]), result.commit);

  const { checkpointLifecycleEvidence } = require("../../dist/main/planExecution/lifecycleEvidenceCheckpointService.js");
  const { readLifecycleCheckpointReceipt } = require("../../dist/main/planExecution/lifecycleEvidenceCheckpointReceipt.js");
  const validationPath = "planning/work-intake/work/VALIDATION_RECORD_WI01_ATTEMPT01.md";
  const closePath = "planning/work-intake/work/WORK_CARD_CLOSE_RETURN_WI01.md";
  writeDoc(root, reportPath, "implementer-report", "Approved", { identity: routedIdentity("WI01"), sourceRevisions: [{ path: contractPath, revision: 1 }], bodyMarkdown: "# Report\n\nImplemented correction. Operator review completed." });
  writeDoc(root, validationPath, "validation-record", "Approved", { identity: { ...routedIdentity("WI01"), attemptNumber: 1 }, sourceRevisions: [{ path: contractPath, revision: 1 }, { path: reportPath, revision: 1 }] });
  writeDoc(root, closePath, "work-card-close-return-record", "Approved", { participationRole: "contextOnly",
    identity: { ...routedIdentity("WI01"), parentWorkCardId: "WI01", executionWorkCardId: "WI01", executionKind: "parent" },
    sourceRevisions: [{ path: validationPath, revision: 1 }], workflowData: { transition: "close-return-consumed" } });
  const lifecycleInput = { binding: intake.branchBinding,
    boundary: { kind: "work-item", routeDecisionId, planId, planRevision: 1, workItemId: "WI01", implementationId: "WI01" },
    artifacts: { contractPath, reportPath, validationPath, closePath } };
  fs.writeFileSync(path.join(root, "unrelated.txt"), "unrelated lifecycle change\n");
  let lifecycle = await checkpointLifecycleEvidence(root, lifecycleInput);
  assert.equal(lifecycle.status, "blocked"); assert.match(lifecycle.message, /Unrelated/);
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
  fs.unlinkSync(path.join(root, "unrelated.txt"));
  writeDoc(root, validationPath, "validation-record", "Approved", { identity: { ...routedIdentity("WI01"), intakeId: "intake-00000000-0000-4000-8000-000000000099", attemptNumber: 1 }, sourceRevisions: [{ path: contractPath, revision: 1 }, { path: reportPath, revision: 1 }] });
  lifecycle = await checkpointLifecycleEvidence(root, lifecycleInput);
  assert.equal(lifecycle.status, "blocked"); assert.match(lifecycle.message, /different Intake|cross-Intake/);
  writeDoc(root, validationPath, "validation-record", "Approved", { identity: { ...routedIdentity("WI01"), attemptNumber: 1 }, sourceRevisions: [{ path: contractPath, revision: 1 }, { path: reportPath, revision: 1 }] });
  lifecycle = await checkpointLifecycleEvidence(root, lifecycleInput);
  assert.equal(lifecycle.status, "committed", lifecycle.message);
  assert.equal(git(root, ["status", "--porcelain"]), "");
  assert.equal(git(root, ["rev-list", "--count", `${before}..HEAD`]), "2");
  const lifecycleReceipt = readLifecycleCheckpointReceipt(git(root, ["show", "--no-patch", "--format=%B", lifecycle.commit]), lifecycle.checkpointId);
  assert.equal(lifecycleReceipt.beforeHead, result.commit);
  assert.deepEqual(lifecycleReceipt.boundary, lifecycleInput.boundary);
  assert.deepEqual(lifecycleReceipt.files.map((entry) => entry.path), [contractPath, reportPath, validationPath, closePath].sort());
  assert.equal((await createWorkIntakeBranchService({ repositoryId: intake.branchBinding.repositoryId, repositoryRoot: root }).verify(intake.branchBinding)).currentHead, lifecycle.commit);
  git(root, ["commit", "--allow-empty", "-m", "unexpected external commit"]);
  await assert.rejects(createWorkIntakeBranchService({ repositoryId: intake.branchBinding.repositoryId, repositoryRoot: root }).verify(intake.branchBinding), /outside its recorded checkpoint chain/);
});
const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");
const {
  createWorkIntakeBranchService, workIntakeBranchName,
} = require("../../dist/main/workIntake/workIntakeBranchService.js");
const {
  createAgentHarnessToolRegistry,
} = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const {
  approveFormalWorkCardAndRegisterReport,
  buildApprovedRepairWorkCardAndReportDocuments,
} = require("../../dist/main/workCardBuilding/workCardBuildingReviewService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  writeCanonicalMarkdownDocuments,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const {
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Git dispatch and mutation modules do not import workflow decision services", () => {
  const forbiddenDirectories = [
    "src/main/workCardLoop",
    "src/main/currentWorkflow",
    "src/main/issueResolution",
  ].map((relativePath) => path.resolve(repositoryRoot, relativePath));
  const forbiddenModules = [
    "src/main/documents/planningDocumentService",
    "src/main/documents/gitMutationAuthorization",
  ].map((relativePath) => path.resolve(repositoryRoot, relativePath));

  for (const relativePath of [
    "src/main/agentHarness/tools/toolRegistry.ts",
    "src/main/agentHarness/repository/gitMutations.ts",
    "src/main/sourceControl/sourceControlService.ts",
  ]) {
    const filePath = path.join(repositoryRoot, relativePath);
    const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        specifier = node.moduleSpecifier;
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        specifier = node.moduleReference.expression;
      } else if (ts.isCallExpression(node) && (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")
      )) {
        specifier = node.arguments[0];
      }
      if (specifier && ts.isStringLiteralLike(specifier) && specifier.text.startsWith(".")) {
        const target = path.resolve(path.dirname(filePath), specifier.text);
        const forbidden = forbiddenDirectories.some((directory) => target === directory || target.startsWith(`${directory}${path.sep}`)) ||
          forbiddenModules.some((modulePath) => [modulePath, `${modulePath}.ts`, `${modulePath}.js`].includes(target));
        assert.equal(forbidden, false, `${relativePath} imports workflow decision service ${specifier.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test("Work Card and Repair approval ignore Git wording and do not stamp Git-tool metadata", () => {
  const gitSections = [
    "",
    "## Authorized Git Mutations\n\nThis is ordinary prose, not a machine grant.\n",
    "## Authorized Git Mutations\n\n- `stage_everything`\n- duplicate prose\n\n## Authorized Git Mutations\n\nNothing to parse.\n",
  ];

  for (const [index, section] of gitSections.entries()) {
    const root = tempWorkspace(`champcity-git-approval-scope-${index}-`);
    const formalPath = "planning/phases/phase-01/Work_Cards/WC01_scope_test.md";
    writeDoc(root, formalPath, "formal-work-card", "Pending", {
      identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
      bodyMarkdown: `# WC01 - Scope Test\n\nOrdinary bounded instructions.\n\n${section}`,
    });

    assert.doesNotThrow(() => approveFormalWorkCardAndRegisterReport({
      workspaceRoot: root,
      formalWorkCardPath: formalPath,
      reviewedAt: "2026-09-14T12:00:00.000Z",
    }));
    const formal = readCanonical(root, formalPath);
    assert.equal(formal.metadata.documentDisposition.status, "Approved");
    assert.equal(Object.hasOwn(formal.metadata.workflowData, "gitMutationAuthorization"), false);
    assert.equal(
      fs.existsSync(path.join(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_scope_test.md")),
      true,
    );
  }

  const repairRoot = tempWorkspace("champcity-git-repair-approval-scope-");
  const repairPath = "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md";
  writeDoc(repairRoot, repairPath, "repair-work-card", "Pending", {
    identity: {
      phaseId: "phase-01",
      workCardId: "WC01-REPAIR01",
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
    },
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
    },
    bodyMarkdown: "# Repair\n\n## Authorized Git Mutations\n\nMalformed prose remains ordinary task wording.\n",
  });
  const documents = buildApprovedRepairWorkCardAndReportDocuments({
    workspaceRoot: repairRoot,
    repairWorkCardPath: repairPath,
    approvedStatus: "Approved",
    notes: "",
    reviewedAt: "2026-09-14T12:00:00.000Z",
  });
  writeCanonicalMarkdownDocuments(documents);
  const repair = readCanonical(repairRoot, repairPath);
  assert.equal(repair.metadata.documentDisposition.status, "Approved");
  assert.equal(Object.hasOwn(repair.metadata.workflowData, "gitMutationAuthorization"), false);
});

test("all five bounded git_toolbox mutations execute in a registered Git repository without a planning corpus", async () => {
  const root = createBoundWorkspace("champcity-git-mutations-success-", true);
  fs.writeFileSync(path.join(root, "delete-me.txt"), "delete me\n", "utf8");
  commitAllFixtureState(root, "fixture baseline");
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
  const registry = registryFor(root);

  const beforeStatus = await callGit(registry, root, "status", undefined, "files.read");
  assert.equal(beforeStatus.ok, true);
  assert.equal(beforeStatus.payload.gitBacked, true);

  const prepared = await callGit(registry, root, "prepare_branch", { branchName: "feature/bounded" });
  assert.equal(prepared.ok, true);
  assert.equal(git(root, ["branch", "--show-current"]), "feature/bounded");

  fs.writeFileSync(path.join(root, "requested.txt"), "requested\n", "utf8");
  fs.writeFileSync(path.join(root, "unrelated.txt"), "unrelated\n", "utf8");
  fs.unlinkSync(path.join(root, "delete-me.txt"));
  const staged = await callGit(registry, root, "stage_changes", { paths: ["requested.txt", "delete-me.txt"] });
  assert.equal(staged.ok, true);
  assert.deepEqual(staged.payload.stagedPaths, ["requested.txt", "delete-me.txt"]);
  assert.deepEqual(gitLines(root, ["diff", "--cached", "--name-only"]), ["delete-me.txt", "requested.txt"]);
  assert.match(git(root, ["status", "--short"]), /\?\? unrelated\.txt/);

  const committed = await callGit(registry, root, "commit", { message: "Commit only explicit staged state" });
  assert.equal(committed.ok, true);
  assert.equal(git(root, ["log", "-1", "--pretty=%s"]), "Commit only explicit staged state");
  assert.deepEqual(gitLines(root, ["show", "--pretty=", "--name-only", "HEAD"]), ["delete-me.txt", "requested.txt"]);
  assert.equal(fs.existsSync(path.join(root, "unrelated.txt")), true);
  fs.unlinkSync(path.join(root, "unrelated.txt"));

  const remote = path.join(path.dirname(root), "remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root, stdio: "ignore" });
  const pushed = await callGit(registry, root, "push");
  assert.equal(pushed.ok, true);
  assert.equal(git(remote, ["rev-parse", "refs/heads/feature/bounded"]), committed.payload.commit);

  const integrated = await callGit(registry, root, "integrate_to_dev");
  assert.equal(integrated.ok, true);
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  assert.equal(git(root, ["rev-parse", "dev"]), committed.payload.commit);
  assert.equal(fs.existsSync(path.join(root, "planning")), false);

  const emptyCommit = await callGit(registry, root, "commit", { message: "must fail" });
  assert.equal(emptyCommit.ok, false);
  assert.equal(emptyCommit.error.code, "GIT_EXECUTION_FAILED");
  const existingBranch = await callGit(registry, root, "prepare_branch", { branchName: "feature/bounded" });
  assert.equal(existingBranch.ok, false);
  const invalidBranch = await callGit(registry, root, "prepare_branch", { branchName: "../invalid" });
  assert.equal(invalidBranch.ok, false);
  assert.equal(invalidBranch.error.code, "INVALID_INPUT");
  fs.writeFileSync(path.join(root, "dirty.txt"), "dirty\n", "utf8");
  const dirtyBranch = await callGit(registry, root, "prepare_branch", { branchName: "feature/dirty" });
  assert.equal(dirtyBranch.ok, false);
  assert.equal(dirtyBranch.error.code, "GIT_EXECUTION_FAILED");
});

test("branch state, existing-branch switching, and bounded history expose real repository evidence", async () => {
  const root = createBoundWorkspace("champcity-git-branch-state-", true);
  commitAllFixtureState(root, "fixture baseline");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  execFileSync("git", ["branch", "main"], { cwd: root, stdio: "ignore" });
  const registry = registryFor(root);

  const state = await requireSuccess(callGit(registry, root, "inspect_branch_state", undefined, "files.read"));
  assert.equal(state.payload.currentBranch, "dev");
  assert.equal(state.payload.head, baseline);
  assert.deepEqual(state.payload.branches.map((branch) => branch.name), ["dev", "main"]);
  assert.deepEqual(state.payload.remotes, []);
  assert.deepEqual(state.payload.selectedBranch, {
    name: "dev",
    commit: baseline,
    upstream: null,
    ahead: null,
    behind: null,
  });

  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "main" }));
  assert.equal(git(root, ["branch", "--show-current"]), "main");
  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "dev" }));
  assert.equal(git(root, ["branch", "--show-current"]), "dev");

  fs.writeFileSync(path.join(root, "dirty.txt"), "dirty\n", "utf8");
  const dirtySwitch = await callGit(registry, root, "switch_branch", { branchName: "main" });
  assert.equal(dirtySwitch.ok, false);
  assert.equal(dirtySwitch.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  fs.unlinkSync(path.join(root, "dirty.txt"));

  execFileSync("git", ["checkout", "--detach", baseline], { cwd: root, stdio: "ignore" });
  const detachedSwitch = await callGit(registry, root, "switch_branch", { branchName: "main" });
  assert.equal(detachedSwitch.ok, false);
  assert.equal(detachedSwitch.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(git(root, ["branch", "--show-current"]), "");
  execFileSync("git", ["switch", "dev"], { cwd: root, stdio: "ignore" });

  fs.writeFileSync(path.join(root, "history.txt"), "history\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["history.txt"] }));
  const latest = await requireSuccess(callGit(registry, root, "commit", { message: "history evidence" }));
  const history = await requireSuccess(callGit(registry, root, "inspect_history", {
    ref: "dev",
    maxCount: 2,
    ancestor: baseline,
    descendant: "dev",
  }, "files.read"));
  assert.equal(history.payload.resolvedCommit, latest.payload.commit);
  assert.deepEqual(history.payload.commits.map((commit) => commit.subject), ["history evidence", "fixture baseline"]);
  assert.equal(history.payload.ancestry.ancestorCommit, baseline);
  assert.equal(history.payload.ancestry.descendantCommit, latest.payload.commit);
  assert.equal(history.payload.ancestry.isAncestor, true);
});

test("fetch_remote and fast_forward_branch update from configured upstream without a merge commit", async () => {
  const root = createBoundWorkspace("champcity-git-fast-forward-", true);
  commitAllFixtureState(root, "fixture baseline");
  const remote = path.join(path.dirname(root), "upstream.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["push", "--set-upstream", "origin", "dev"], { cwd: root, stdio: "ignore" });

  const competitor = path.join(path.dirname(root), "upstream-writer");
  execFileSync("git", ["clone", remote, competitor], { stdio: "ignore" });
  configureGitIdentity(competitor);
  execFileSync("git", ["switch", "dev"], { cwd: competitor, stdio: "ignore" });
  fs.writeFileSync(path.join(competitor, "remote-update.txt"), "remote update\n", "utf8");
  execFileSync("git", ["add", "--", "remote-update.txt"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "remote update"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "dev"], { cwd: competitor, stdio: "ignore" });
  const remoteCommit = git(competitor, ["rev-parse", "HEAD"]);

  const registry = registryFor(root);
  const fetched = await requireSuccess(callGit(registry, root, "fetch_remote", { remote: "origin" }));
  assert.equal(fetched.payload.remote, "origin");
  assert.ok(fetched.payload.remoteTrackingRefs.some((ref) => ref.name === "origin/dev" && ref.commit === remoteCommit));
  const before = git(root, ["rev-parse", "HEAD"]);
  const state = await requireSuccess(callGit(registry, root, "inspect_branch_state", { branchName: "dev" }, "files.read"));
  assert.equal(state.payload.selectedBranch.upstream, "origin/dev");
  assert.equal(state.payload.selectedBranch.ahead, 0);
  assert.equal(state.payload.selectedBranch.behind, 1);

  const updated = await requireSuccess(callGit(registry, root, "fast_forward_branch"));
  assert.equal(updated.payload.previousCommit, before);
  assert.equal(updated.payload.commit, remoteCommit);
  assert.equal(updated.payload.behind, 1);
  assert.equal(git(root, ["rev-list", "--count", `${before}..${remoteCommit}`]), "1");
  assert.equal(git(root, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(" ").length, 2);

  fs.writeFileSync(path.join(root, "local-divergence.txt"), "local divergence\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["local-divergence.txt"] }));
  const localAdvance = await requireSuccess(callGit(registry, root, "commit", { message: "local divergence" }));
  fs.writeFileSync(path.join(competitor, "remote-divergence.txt"), "remote divergence\n", "utf8");
  execFileSync("git", ["add", "--", "remote-divergence.txt"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "remote divergence"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "dev"], { cwd: competitor, stdio: "ignore" });
  await requireSuccess(callGit(registry, root, "fetch_remote", { remote: "origin" }));
  const divergence = await callGit(registry, root, "fast_forward_branch");
  assert.equal(divergence.ok, false);
  assert.equal(divergence.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(divergence.error.details.ahead, 1);
  assert.equal(divergence.error.details.behind, 1);
  assert.equal(git(root, ["rev-parse", "HEAD"]), localAdvance.payload.commit);
});

test("merge_branch carries a hotfix into main and forward into diverged dev, then deletes merged branches safely", async () => {
  const root = createBoundWorkspace("champcity-git-merge-lifecycle-", true);
  commitAllFixtureState(root, "fixture baseline");
  execFileSync("git", ["branch", "main"], { cwd: root, stdio: "ignore" });
  const registry = registryFor(root);

  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "main" }));
  await requireSuccess(callGit(registry, root, "prepare_branch", { branchName: "hotfix/release" }));
  fs.writeFileSync(path.join(root, "hotfix.txt"), "hotfix\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["hotfix.txt"] }));
  const hotfix = await requireSuccess(callGit(registry, root, "commit", { message: "release hotfix" }));

  const mergedMain = await requireSuccess(callGit(registry, root, "merge_branch", {
    sourceBranch: "hotfix/release",
    targetBranch: "main",
    mode: "ff-only",
  }));
  assert.equal(mergedMain.payload.commit, hotfix.payload.commit);
  assert.equal(git(root, ["branch", "--show-current"]), "main");

  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "dev" }));
  fs.writeFileSync(path.join(root, "dev-only.txt"), "dev line\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["dev-only.txt"] }));
  const devAdvance = await requireSuccess(callGit(registry, root, "commit", { message: "dev advance" }));
  const mergedDev = await requireSuccess(callGit(registry, root, "merge_branch", {
    sourceBranch: "main",
    targetBranch: "dev",
    mode: "merge",
  }));
  assert.notEqual(mergedDev.payload.commit, hotfix.payload.commit);
  assert.notEqual(mergedDev.payload.commit, devAdvance.payload.commit);
  assert.equal(git(root, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(" ").length, 3);

  const deleted = await requireSuccess(callGit(registry, root, "delete_branch", { branchName: "hotfix/release" }));
  assert.equal(deleted.payload.deletedCommit, hotfix.payload.commit);
  assert.equal(gitLines(root, ["branch", "--list", "hotfix/release"]).length, 0);
  const currentDelete = await callGit(registry, root, "delete_branch", { branchName: "dev" });
  assert.equal(currentDelete.ok, false);

  await requireSuccess(callGit(registry, root, "prepare_branch", { branchName: "unmerged/work" }));
  fs.writeFileSync(path.join(root, "unmerged.txt"), "unmerged\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["unmerged.txt"] }));
  await requireSuccess(callGit(registry, root, "commit", { message: "unmerged work" }));
  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "dev" }));
  const unmergedDelete = await callGit(registry, root, "delete_branch", { branchName: "unmerged/work" });
  assert.equal(unmergedDelete.ok, false);
  assert.equal(gitLines(root, ["branch", "--list", "unmerged/work"]).length, 1);
});

test("merge_branch reports conflicts and aborts the merge without resolving or rewriting history", async () => {
  const root = createBoundWorkspace("champcity-git-merge-conflict-", true);
  fs.writeFileSync(path.join(root, "shared.txt"), "baseline\n", "utf8");
  commitAllFixtureState(root, "fixture baseline");
  const registry = registryFor(root);
  await requireSuccess(callGit(registry, root, "prepare_branch", { branchName: "hotfix/conflict" }));
  fs.writeFileSync(path.join(root, "shared.txt"), "hotfix\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["shared.txt"] }));
  await requireSuccess(callGit(registry, root, "commit", { message: "hotfix conflict side" }));
  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "dev" }));
  fs.writeFileSync(path.join(root, "shared.txt"), "development\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["shared.txt"] }));
  const dev = await requireSuccess(callGit(registry, root, "commit", { message: "dev conflict side" }));

  const conflict = await callGit(registry, root, "merge_branch", {
    sourceBranch: "hotfix/conflict",
    targetBranch: "dev",
    mode: "merge",
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.error.code, "GIT_EXECUTION_FAILED");
  assert.deepEqual(conflict.error.details.conflictingPaths, ["shared.txt"]);
  assert.equal(conflict.error.details.mergeAborted, true);
  assert.equal(conflict.error.details.mergeInProgress, false);
  assert.equal(git(root, ["rev-parse", "HEAD"]), dev.payload.commit);
  assert.equal(git(root, ["status", "--porcelain=v1"]), "");
});

test("release tag actions create, verify, and push tags without overwriting local or remote tags", async () => {
  const root = createBoundWorkspace("champcity-git-tags-", true);
  commitAllFixtureState(root, "fixture baseline");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  const remote = path.join(path.dirname(root), "tag-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root, stdio: "ignore" });
  const registry = registryFor(root);

  const created = await requireSuccess(callGit(registry, root, "create_tag", {
    tagName: "v1.2.3",
    tagType: "annotated",
    target: "HEAD",
    message: "Release v1.2.3",
  }));
  assert.equal(created.payload.targetCommit, baseline);
  const verified = await requireSuccess(callGit(registry, root, "verify_tag", { tagName: "v1.2.3" }, "files.read"));
  assert.equal(verified.payload.tagType, "annotated");
  assert.equal(verified.payload.targetCommit, baseline);
  await requireSuccess(callGit(registry, root, "push_tag", { tagName: "v1.2.3", remote: "origin" }));
  assert.equal(git(remote, ["rev-parse", "refs/tags/v1.2.3^{}"]), baseline);

  const duplicate = await callGit(registry, root, "create_tag", {
    tagName: "v1.2.3",
    tagType: "lightweight",
  });
  assert.equal(duplicate.ok, false);
  fs.writeFileSync(path.join(root, "advance.txt"), "advance\n", "utf8");
  commitAllFixtureState(root, "advance after release");
  execFileSync("git", ["tag", "--force", "v1.2.3", "HEAD"], { cwd: root, stdio: "ignore" });
  const remoteOverwrite = await callGit(registry, root, "push_tag", { tagName: "v1.2.3", remote: "origin" });
  assert.equal(remoteOverwrite.ok, false);
  assert.equal(git(remote, ["rev-parse", "refs/tags/v1.2.3^{}"]), baseline);
});

test("delete_tag removes exact annotated and lightweight remote refs first and preserves history and other tags", async (t) => {
  for (const tagType of ["annotated", "lightweight"]) {
    await t.test(tagType, async () => {
      const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
      await requireSuccess(callGit(registry, root, "create_tag", { tagName, tagType, ...tagType === "annotated" ? { message: "candidate" } : {} }));
      await requireSuccess(callGit(registry, root, "push_tag", { tagName }));
      git(root, ["tag", "--annotate", "--no-sign", "--message", "keep", "keep-local"]);
      git(root, ["config", "push.followTags", "true"]);
      const result = await requireSuccess(callGit(registry, root, "delete_tag", { tagName }));
      assert.deepEqual(result.payload, {
        remote: "origin", tagName, deletedCommit: baseline,
        localDeleted: true, remoteDeleted: true, localState: "absent", remoteState: "absent",
      });
      assert.equal(git(root, ["tag", "--list", tagName]), "");
      assert.equal(git(remote, ["tag", "--list", tagName]), "");
      assert.equal(git(remote, ["tag", "--list", "keep-local"]), "");
      assert.equal(git(root, ["rev-parse", "keep-local^{commit}"]), baseline);
      assert.equal(git(root, ["rev-parse", "HEAD"]), baseline);
      assert.equal(git(remote, ["rev-parse", "refs/heads/dev"]), baseline);
      assert.equal(git(root, ["status", "--porcelain"]), "");
    });
  }
});

test("delete_tag preserves local evidence on remote rejection and supports explicit retry", async () => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(root, ["tag", tagName]);
  await requireSuccess(callGit(registry, root, "push_tag", { tagName }));
  fs.writeFileSync(path.join(remote, "hooks", "pre-receive"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  const result = await callGit(registry, root, "delete_tag", { tagName });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(git(root, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  assert.equal(git(remote, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  fs.unlinkSync(path.join(remote, "hooks", "pre-receive"));
  assert.equal((await requireSuccess(callGit(registry, root, "delete_tag", { tagName }))).payload.remoteDeleted, true);
});

test("delete_tag cleans local-only tags and both-absent retries without touching remote history", async () => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(root, ["tag", tagName]);
  const localOnly = await requireSuccess(callGit(registry, root, "delete_tag", { tagName, remote: "origin" }));
  assert.equal(localOnly.payload.deletedCommit, baseline);
  assert.equal(localOnly.payload.localDeleted, true);
  assert.equal(localOnly.payload.remoteDeleted, false);
  const absent = await requireSuccess(callGit(registry, root, "delete_tag", { tagName }));
  assert.equal(absent.payload.deletedCommit, null);
  assert.equal(absent.payload.localDeleted, false);
  assert.equal(absent.payload.remoteDeleted, false);
  assert.equal(git(remote, ["rev-parse", "refs/heads/dev"]), baseline);
});

test("delete_tag recovers after remote success followed by local deletion failure", async (t) => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(root, ["tag", tagName]);
  await requireSuccess(callGit(registry, root, "push_tag", { tagName }));
  const boundedGit = require(path.join(repositoryRoot, "dist/main/agentHarness/repository/boundedGit.js"));
  const realRun = boundedGit.runBoundedGit;
  const calls = [];
  const mocked = t.mock.method(boundedGit, "runBoundedGit", async (options) => {
    calls.push(options.args);
    if (options.args[0] === "update-ref") throw new AgentHarnessError("GIT_EXECUTION_FAILED", "synthetic local ref lock failure");
    return realRun(options);
  });
  assert.equal((await callGit(registry, root, "delete_tag", { tagName })).ok, false);
  assert.equal(git(root, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  assert.equal(git(remote, ["tag", "--list", tagName]), "");
  assert.deepEqual(calls.find((args) => args[0] === "push"), ["push", "--no-follow-tags", "--delete", "--", "origin", `refs/tags/${tagName}`]);
  assert.ok(calls.findIndex((args) => args[0] === "push") < calls.findIndex((args) => args[0] === "update-ref"));
  assert.equal(calls.flat().some((arg) => /^(?:--force|--force-with-lease|--mirror|reset|rebase)$/.test(arg)), false);
  mocked.mock.restore();
  const retry = await requireSuccess(callGit(registry, root, "delete_tag", { tagName }));
  assert.equal(retry.payload.localDeleted, true);
  assert.equal(retry.payload.remoteDeleted, false);
});

test("delete_tag refuses uncorroborated or mismatched remote tags", async () => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(remote, ["tag", tagName, baseline]);
  const uncorroborated = await callGit(registry, root, "delete_tag", { tagName });
  assert.equal(uncorroborated.ok, false);
  assert.match(uncorroborated.error.message, /corroborating local/);
  fs.writeFileSync(path.join(root, "new.txt"), "new source\n");
  commitAllFixtureState(root, "later candidate");
  git(root, ["tag", tagName]);
  const mismatched = await callGit(registry, root, "delete_tag", { tagName });
  assert.equal(mismatched.ok, false);
  assert.match(mismatched.error.message, /targets do not match/);
  assert.equal(git(remote, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  assert.equal(git(root, ["rev-parse", `refs/tags/${tagName}`]), git(root, ["rev-parse", "HEAD"]));
});

test("delete_tag rejects dirty state, invalid tag names, and unsafe configured destinations", async () => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(root, ["tag", tagName]);
  await requireSuccess(callGit(registry, root, "push_tag", { tagName }));
  fs.writeFileSync(path.join(root, "untracked.txt"), "dirty\n");
  assert.match((await callGit(registry, root, "delete_tag", { tagName })).error.message, /clean/);
  git(root, ["add", "--", "untracked.txt"]);
  assert.match((await callGit(registry, root, "delete_tag", { tagName })).error.message, /clean/);
  commitAllFixtureState(root, "unrelated later source");
  for (const invalid of ["*", "v*", "refs/tags/*", "--all", "v1:v2", "../bad", "v1\nother"]) {
    assert.equal((await callGit(registry, root, "delete_tag", { tagName: invalid })).error.code, "INVALID_INPUT");
  }
  assert.equal((await callGit(registry, root, "delete_tag", { tagName, remote: "missing" })).ok, false);
  git(root, ["config", "remote.origin.pushurl", path.join(path.dirname(root), "different.git")]);
  assert.match((await callGit(registry, root, "delete_tag", { tagName })).error.message, /destination/);
  git(root, ["config", "--unset", "remote.origin.pushurl"]);
  git(root, ["config", "remote.origin.mirror", "true"]);
  assert.match((await callGit(registry, root, "delete_tag", { tagName })).error.message, /non-mirroring/);
  assert.equal(git(root, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  assert.equal(git(remote, ["rev-parse", `refs/tags/${tagName}`]), baseline);
});

test("delete_tag retains OAuth, registered-workspace, Git-backed, and exact parameter gates", async () => {
  const { root, registry, tagName } = createTagDeletionFixture();
  const tool = registry.listTools("files.read files.write").find((entry) => entry.name === "git_toolbox");
  const input = { workspaceId: "alpha", action: "delete_tag", params: { tagName } };
  assert.equal(tool.inputZodSchema.safeParse(input).success, true);
  assert.equal(tool.inputZodSchema.safeParse({ ...input, params: {} }).success, false);
  for (const key of ["force", "pattern", "branch", "args", "command", "cwd", "environment", "timeout"]) {
    assert.equal(tool.inputZodSchema.safeParse({ ...input, params: { tagName, [key]: "forbidden" } }).success, false);
  }
  assert.equal(registry.listTools("files.read").find((entry) => entry.name === "git_toolbox").actions.includes("delete_tag"), false);
  assert.equal((await callGit(registry, root, "delete_tag", { tagName }, "files.read")).error.code, "OAUTH_SCOPE_DENIED");
  const foreign = await registry.callTool({ name: "git_toolbox", arguments: { ...input, workspaceId: "foreign" }, scope: "files.write" });
  assert.equal(foreign.error.code, "WORKSPACE_ACCESS_DENIED");
  const nonGit = createBoundWorkspace("champcity-delete-tag-non-git-", false);
  assert.equal((await callGit(registryFor(nonGit), nonGit, "delete_tag", { tagName })).error.code, "GIT_CAPABILITY_UNAVAILABLE");
});

function createTagDeletionFixture() {
  const root = createBoundWorkspace("champcity-delete-tag-", true);
  commitAllFixtureState(root, "candidate source remains history");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  const remote = path.join(path.dirname(root), "tag-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  git(root, ["remote", "add", "origin", remote]);
  git(root, ["push", "--", "origin", "refs/heads/dev:refs/heads/dev"]);
  return { root, remote, baseline, registry: registryFor(root), tagName: "v1.2.3-beta.1" };
}

test("push and integrate_to_dev reject divergence without force, merge commits, rebase, or reset", async () => {
  const pushRoot = createBoundWorkspace("champcity-git-push-reject-", true);
  commitAllFixtureState(pushRoot, "fixture baseline");
  const pushRegistry = registryFor(pushRoot);
  await requireSuccess(callGit(pushRegistry, pushRoot, "prepare_branch", { branchName: "feature/diverged" }));
  fs.writeFileSync(path.join(pushRoot, "first.txt"), "first\n", "utf8");
  await requireSuccess(callGit(pushRegistry, pushRoot, "stage_changes", { paths: ["first.txt"] }));
  await requireSuccess(callGit(pushRegistry, pushRoot, "commit", { message: "first" }));
  const remote = path.join(path.dirname(pushRoot), "reject-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: pushRoot, stdio: "ignore" });
  await requireSuccess(callGit(pushRegistry, pushRoot, "push"));

  const competitor = path.join(path.dirname(pushRoot), "competitor");
  execFileSync("git", ["clone", remote, competitor], { stdio: "ignore" });
  configureGitIdentity(competitor);
  execFileSync("git", ["switch", "feature/diverged"], { cwd: competitor, stdio: "ignore" });
  fs.writeFileSync(path.join(competitor, "remote.txt"), "remote\n", "utf8");
  execFileSync("git", ["add", "--", "remote.txt"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "remote advance"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "feature/diverged"], { cwd: competitor, stdio: "ignore" });
  fs.writeFileSync(path.join(pushRoot, "local.txt"), "local\n", "utf8");
  await requireSuccess(callGit(pushRegistry, pushRoot, "stage_changes", { paths: ["local.txt"] }));
  await requireSuccess(callGit(pushRegistry, pushRoot, "commit", { message: "local advance" }));
  const rejectedPush = await callGit(pushRegistry, pushRoot, "push");
  assert.equal(rejectedPush.ok, false);
  assert.equal(rejectedPush.error.code, "GIT_EXECUTION_FAILED");

  const integrateRoot = createBoundWorkspace("champcity-git-integrate-reject-", true);
  commitAllFixtureState(integrateRoot, "fixture baseline");
  const integrateRegistry = registryFor(integrateRoot);
  await requireSuccess(callGit(integrateRegistry, integrateRoot, "prepare_branch", { branchName: "feature/non-ff" }));
  fs.writeFileSync(path.join(integrateRoot, "feature.txt"), "feature\n", "utf8");
  await requireSuccess(callGit(integrateRegistry, integrateRoot, "stage_changes", { paths: ["feature.txt"] }));
  await requireSuccess(callGit(integrateRegistry, integrateRoot, "commit", { message: "feature" }));
  execFileSync("git", ["switch", "dev"], { cwd: integrateRoot, stdio: "ignore" });
  fs.writeFileSync(path.join(integrateRoot, "dev.txt"), "dev\n", "utf8");
  execFileSync("git", ["add", "--", "dev.txt"], { cwd: integrateRoot, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "dev diverged"], { cwd: integrateRoot, stdio: "ignore" });
  const devBefore = git(integrateRoot, ["rev-parse", "dev"]);
  execFileSync("git", ["switch", "feature/non-ff"], { cwd: integrateRoot, stdio: "ignore" });
  const rejectedIntegration = await callGit(integrateRegistry, integrateRoot, "integrate_to_dev");
  assert.equal(rejectedIntegration.ok, false);
  assert.equal(rejectedIntegration.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(git(integrateRoot, ["branch", "--show-current"]), "feature/non-ff");
  assert.equal(git(integrateRoot, ["rev-parse", "dev"]), devBefore);
});

test("OAuth, workspace registration, Git-backed state, action, and parameter gates remain enforced", async () => {
  const root = createBoundWorkspace("champcity-git-security-boundary-", true);
  const registry = registryFor(root);
  const tool = registry.listTools("files.read files.write").find((entry) => entry.name === "git_toolbox");
  assert.ok(tool);
  assert.equal(tool.inputZodSchema.safeParse({
    workspaceId: "alpha",
    action: "stage_changes",
    params: { paths: ["one.txt", "two/*.ts"] },
  }).success, true);
  assert.equal(tool.inputZodSchema.safeParse({
    workspaceId: "alpha",
    action: "merge_branch",
    params: { sourceBranch: "hotfix/one", targetBranch: "dev", mode: "merge" },
  }).success, true);
  for (const input of [
    { workspaceId: "alpha", action: "stage_changes", params: { paths: [] } },
    { workspaceId: "alpha", action: "stage_changes", params: { paths: "one.txt" } },
    { workspaceId: "alpha", action: "commit", params: {} },
    { workspaceId: "alpha", action: "push", params: { force: true } },
    { workspaceId: "alpha", action: "integrate_to_dev", params: { branch: "main" } },
    { workspaceId: "alpha", action: "merge_branch", params: { targetBranch: "dev" } },
    { workspaceId: "alpha", action: "merge_branch", params: { sourceBranch: "hotfix/one", mode: "force" } },
    { workspaceId: "alpha", action: "create_tag", params: { tagName: "v1" } },
    { workspaceId: "alpha", action: "create_tag", params: { tagName: "v1", tagType: "signed" } },
    { workspaceId: "alpha", action: "delete_branch", params: { branchName: "old", force: true } },
    { workspaceId: "alpha", action: "raw_git", params: { args: ["reset", "--hard"] } },
  ]) {
    assert.equal(tool.inputZodSchema.safeParse(input).success, false);
  }

  const deniedByScope = await callGit(registry, root, "stage_changes", { paths: ["README.md"] }, "files.read");
  assert.equal(deniedByScope.ok, false);
  assert.equal(deniedByScope.error.code, "OAUTH_SCOPE_DENIED");

  const foreign = await registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId: "foreign", action: "stage_changes", params: { paths: ["README.md"] } },
    scope: "files.write",
  });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.error.code, "WORKSPACE_ACCESS_DENIED");

  const unknownAction = await registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId: "alpha", action: "raw_git", params: { args: ["status"] } },
    scope: "files.write",
  });
  assert.equal(unknownAction.ok, false);
  assert.equal(unknownAction.error.code, "INVALID_INPUT");

  const malformedParams = await registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId: "alpha", action: "stage_changes", params: { paths: [] } },
    scope: "files.write",
  });
  assert.equal(malformedParams.ok, false);
  assert.equal(malformedParams.error.code, "INVALID_INPUT");
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");

  const nonGitRoot = createBoundWorkspace("champcity-git-non-git-boundary-", false);
  const nonGitResult = await callGit(registryFor(nonGitRoot), nonGitRoot, "stage_changes", { paths: ["README.md"] });
  assert.equal(nonGitResult.ok, false);
  assert.equal(nonGitResult.error.code, "GIT_CAPABILITY_UNAVAILABLE");
});

test("application source control returns attributable receipts and preserves Git safety without MCP", async (t) => {
  const root = createBoundWorkspace("champcity-application-source-control-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  commitAllFixtureState(root, "service baseline");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  const service = createSourceControlService({ repositoryId: "repository-alpha", repositoryRoot: root });
  // Constructing the service has no side effects or workflow hooks.
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  async function success(promise, operation) {
    const value = await requireSuccess(promise);
    assert.equal(value.receipt.repositoryId, "repository-alpha");
    assert.equal(value.receipt.operation, operation);
    assert.ok(value.receipt.before.commit);
    assert.ok(value.receipt.after.commit);
    assert.ok(Date.parse(value.receipt.completedAt) >= Date.parse(value.receipt.startedAt));
    assert.equal(JSON.stringify(value).includes(root), false);
    assert.equal("workspaceId" in value, false);
    return value;
  }
  assert.equal((await success(service.status(), "status")).result.clean, true);
  assert.equal((await success(service.readiness(), "readiness")).result.clean, true);
  assert.deepEqual((await success(service.branches(), "branches")).result.remotes, []);
  const createdRef = await success(service.createBranchFromRef({ branchName: "non-checkout", sourceRef: "dev" }), "create-branch-from-ref");
  assert.equal(createdRef.result.sourceCommit, baseline);
  assert.deepEqual(createdRef.receipt.before, createdRef.receipt.after);
  await success(service.renameBranch({ branchName: "non-checkout", newBranchName: "non-checkout-renamed" }), "rename-branch");
  await success(service.advanceBranchRef({ branchName: "non-checkout-renamed", sourceRef: baseline, expectedCurrentCommit: baseline }), "advance-branch-ref");
  const prepared = await success(service.prepareBranch("work/service"), "prepare-branch");
  assert.deepEqual(prepared.receipt.before, { branch: "dev", commit: baseline });
  assert.deepEqual(prepared.receipt.after, { branch: "work/service", commit: baseline });

  const dirtyPath = 'file with spaces.txt';
  fs.writeFileSync(path.join(root, dirtyPath), "service content\n");
  const dirty = await service.switchBranch("dev");
  assert.equal(dirty.ok, false);
  assert.equal(dirty.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(dirty.error.phase, "operation");
  assert.equal(git(root, ["branch", "--show-current"]), "work/service");
  assert.deepEqual((await success(service.changedFiles(), "changed-files")).result, [
    { path: dirtyPath, indexStatus: "?", worktreeStatus: "?" },
  ]);
  const traversal = await service.stage(["../outside.txt"]);
  assert.equal(traversal.ok, false);
  assert.equal(traversal.error.code, "PATH_DENIED");
  await success(service.stage([dirtyPath]), "stage");
  assert.match((await success(service.diff(), "diff")).result.staged, /service content/);
  const committed = await success(service.commit("application checkpoint"), "commit");
  assert.equal(committed.result.commit, committed.receipt.after.commit);
  assert.notEqual(committed.result.commit, baseline);
  const history = await success(service.history({ ancestor: baseline, descendant: "work/service", maxCount: 2 }), "history");
  assert.equal(history.result.ancestry.isAncestor, true);
  assert.deepEqual(history.result.commits.map(({ subject }) => subject), ["application checkpoint", "service baseline"]);
  const invalidRef = await service.history({ ref: "--all" });
  assert.equal(invalidRef.ok, false);
  assert.equal(invalidRef.error.code, "INVALID_INPUT");
  const emptyCommit = await service.commit("empty must fail");
  assert.equal(emptyCommit.ok, false);
  assert.equal(emptyCommit.error.code, "GIT_EXECUTION_FAILED");

  // Porcelain -z must preserve rename paths rather than parsing quoted display text.
  fs.renameSync(path.join(root, dirtyPath), path.join(root, "renamed file.txt"));
  await success(service.stage([dirtyPath, "renamed file.txt"]), "stage");
  assert.deepEqual((await success(service.changedFiles(), "changed-files")).result, [
    { path: "renamed file.txt", originalPath: dirtyPath, indexStatus: "R", worktreeStatus: " " },
  ]);
  await success(service.commit("rename checkpoint"), "commit");

  const missingRemote = await service.push();
  assert.equal(missingRemote.ok, false);
  assert.equal(missingRemote.error.code, "GIT_EXECUTION_FAILED");
  const remote = path.join(path.dirname(root), "local-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root, stdio: "ignore" });
  await success(service.push(), "push");
  await success(service.fetch(), "fetch");
  await success(service.switchBranch("dev"), "switch-branch");
  const advanced = await success(service.fastForward({ remote: "origin", remoteBranch: "work/service" }), "fast-forward");
  assert.equal(advanced.receipt.before.commit, baseline);
  assert.equal(advanced.receipt.after.commit, git(remote, ["rev-parse", "refs/heads/work/service"]));
  await success(service.deleteBranch("work/service"), "delete-branch");
  const deleteCurrent = await service.deleteBranch("dev");
  assert.equal(deleteCurrent.ok, false);

  fs.mkdirSync(path.join(root, "nested"));
  const nested = createSourceControlService({ repositoryId: "nested", repositoryRoot: path.join(root, "nested") });
  const denied = await nested.prepareBranch("must-not-exist");
  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, "WORKSPACE_ACCESS_DENIED");
  assert.equal(denied.error.phase, "precondition");
  assert.equal(denied.error.mutationMayHaveOccurred, false);
  assert.equal(git(root, ["branch", "--list", "must-not-exist"]), "");
  const nonGitRoot = path.join(path.dirname(root), "not-a-repository");
  fs.mkdirSync(nonGitRoot);
  const nonGit = await createSourceControlService({ repositoryId: "non-git", repositoryRoot: nonGitRoot }).status();
  assert.equal(nonGit.ok, false);
  assert.equal(nonGit.error.code, "GIT_CAPABILITY_UNAVAILABLE");
});

test("Work Intake branch binding selects an exact base and fails closed before persistence", async (t) => {
  const root = createBoundWorkspace("champcity-intake-branch-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  commitAllFixtureState(root, "base baseline");
  const baseCommit = git(root, ["rev-parse", "HEAD"]);
  execFileSync("git", ["branch", "integration-target"], { cwd: root, stdio: "ignore" });
  fs.writeFileSync(path.join(root, "later.txt"), "prior checkout has later work\n");
  commitAllFixtureState(root, "later original checkout");
  const originalCommit = git(root, ["rev-parse", "HEAD"]);
  const service = createWorkIntakeBranchService({ repositoryId: "repository-alpha", repositoryRoot: root });
  const input = { intakeId: "WI.01", baseBranch: "integration-target", baseCommit };
  assert.equal(workIntakeBranchName(input.intakeId), workIntakeBranchName(input.intakeId));
  assert.notEqual(workIntakeBranchName("WI.01"), workIntakeBranchName("wi-01"));
  assert.throws(() => workIntakeBranchName("../bad"));
  let persistenceCalls = 0;
  const persist = () => { persistenceCalls++; };

  fs.writeFileSync(path.join(root, "dirty.txt"), "pre-existing\n");
  const dirty = await service.establish(input, persist);
  assert.equal(dirty.ok, false);
  assert.equal(dirty.recovery, "unchanged");
  assert.equal(persistenceCalls, 0);
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  fs.unlinkSync(path.join(root, "dirty.txt"));
  const stale = await service.establish({ ...input, baseCommit: originalCommit }, persist);
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, "STALE_SOURCE");
  assert.equal(persistenceCalls, 0);

  const established = await service.establish(input, async (binding) => {
    persistenceCalls++;
    assert.equal(git(root, ["branch", "--show-current"]), binding.workBranch);
    assert.equal(git(root, ["rev-parse", "HEAD"]), baseCommit);
    assert.equal(fs.existsSync(path.join(root, "later.txt")), false);
    await service.verify(binding);
    fs.writeFileSync(path.join(root, "intake.md"), "intake fixture\n");
    return "persisted";
  });
  assert.equal(established.ok, true, JSON.stringify(established));
  assert.equal(established.value, "persisted");
  assert.equal(established.binding.repositoryId, "repository-alpha");
  assert.equal(established.binding.currentHead, baseCommit);
  assert.equal(established.binding.baseBranch, "integration-target");
  assert.equal(established.binding.remote, undefined);
  assert.equal(git(root, ["rev-parse", "dev"]), originalCommit);
  assert.equal(persistenceCalls, 1);
  await assert.rejects(service.verify({ ...established.binding, repositoryId: "other" }), /binding does not match/);
  commitAllFixtureState(root, "fixture persistence checkpoint");
  await assert.rejects(service.verify(established.binding), /recorded head/);
  execFileSync("git", ["switch", "dev"], { cwd: root, stdio: "ignore" });
  await assert.rejects(service.verify(established.binding), /current checkout/);
  const collision = await service.establish(input, persist);
  assert.equal(collision.ok, false);
  assert.match(collision.error.message, /already exists/);
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  assert.equal(persistenceCalls, 1);

  const failureInput = { intakeId: "WI02", baseBranch: "dev", baseCommit: originalCommit };
  const failed = await service.establish(failureInput, () => { throw Error("synthetic persistence failure"); });
  assert.equal(failed.ok, false);
  assert.equal(failed.recovery, "restored");
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  assert.equal(git(root, ["branch", "--list", workIntakeBranchName("WI02")]), "");
  assert.equal(git(root, ["rev-parse", "HEAD"]), originalCommit);

  const partial = await service.establish({ ...failureInput, intakeId: "WI03" }, () => {
    fs.writeFileSync(path.join(root, "partial.md"), "retain this evidence\n");
    throw Error("partial persistence failure");
  });
  assert.equal(partial.ok, false);
  assert.equal(partial.recovery, "inspection-required");
  assert.equal(fs.readFileSync(path.join(root, "partial.md"), "utf8"), "retain this evidence\n");
  assert.equal(git(root, ["branch", "--show-current"]), partial.binding.workBranch);
  assert.equal(git(root, ["rev-parse", "dev"]), originalCommit);

  const nonGitRoot = path.join(path.dirname(root), "non-git");
  fs.mkdirSync(nonGitRoot);
  const nonGit = await createWorkIntakeBranchService({ repositoryId: "non-git", repositoryRoot: nonGitRoot })
    .establish(input, persist);
  assert.equal(nonGit.ok, false);
  assert.equal(persistenceCalls, 1);
});


test("independent branch refs preserve dirty checkout state and enforce exact fast-forward ownership", async (t) => {
  const root = createBoundWorkspace("champcity-ref-primitives-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  commitAllFixtureState(root, "base");
  const base = git(root, ["rev-parse", "HEAD"]);
  git(root, ["config", "branch.autoSetupMerge", "always"]);
  git(root, ["branch", "old-endpoint"]); git(root, ["tag", "base-tag"]);
  fs.writeFileSync(path.join(root, "later.txt"), "later\n"); commitAllFixtureState(root, "later");
  const later = git(root, ["rev-parse", "HEAD"]);
  git(root, ["update-ref", "refs/remotes/origin/fetched", later]);
  fs.writeFileSync(path.join(root, "README.md"), "staged\n"); git(root, ["add", "README.md"]);
  fs.appendFileSync(path.join(root, "README.md"), "unstaged\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "untracked\n");
  const snapshot = () => ({
    head: git(root, ["rev-parse", "HEAD"]), branch: git(root, ["symbolic-ref", "HEAD"]),
    index: fs.readFileSync(path.join(root, ".git", "index")).toString("base64"),
    status: git(root, ["status", "--porcelain=v1", "-z"]),
    staged: git(root, ["diff", "--cached", "--binary"]), unstaged: git(root, ["diff", "--binary"]),
    untracked: fs.readFileSync(path.join(root, "untracked.txt"), "utf8"),
  });
  const before = snapshot(); const registry = registryFor(root);
  for (const [branchName, sourceRef, sourceCommit] of [
    ["copy/local", "old-endpoint", base], ["copy/tag", "base-tag", base],
    ["copy/sha", later, later], ["copy/remote", "origin/fetched", later], ["copy/dev", "dev", later],
  ]) {
    const created = await requireSuccess(callGit(registry, root, "create_branch_from_ref", { branchName, sourceRef }));
    assert.deepEqual(created.payload, { branchName, sourceRef, sourceCommit });
    assert.equal(git(root, ["rev-parse", branchName]), sourceCommit);
    assert.equal(git(root, ["for-each-ref", "--format=%(upstream)", `refs/heads/${branchName}`]), "");
    assert.deepEqual(snapshot(), before);
  }
  assert.equal((await callGit(registry, root, "create_branch_from_ref", { branchName: "copy/local", sourceRef: later })).ok, false);
  assert.equal(git(root, ["rev-parse", "copy/local"]), base);
  const advance = { branchName: "copy/local", sourceRef: later, expectedCurrentCommit: base };
  const advanced = await requireSuccess(callGit(registry, root, "advance_branch_ref", advance));
  assert.equal(advanced.payload.previousCommit, base); assert.equal(advanced.payload.commit, later);
  assert.equal((await callGit(registry, root, "advance_branch_ref", advance)).ok, false, "stale expected commit");
  assert.equal((await callGit(registry, root, "advance_branch_ref", { ...advance, sourceRef: base, expectedCurrentCommit: later })).ok, false, "non-fast-forward");
  assert.equal((await callGit(registry, root, "advance_branch_ref", { ...advance, branchName: "dev", expectedCurrentCommit: later })).ok, false, "current checkout");
  const peer = path.join(path.dirname(root), "peer"); git(root, ["worktree", "add", peer, "copy/tag"]);
  assert.equal((await callGit(registry, root, "advance_branch_ref", { ...advance, branchName: "copy/tag" })).ok, false, "other checkout");
  assert.equal((await callGit(registry, root, "rename_branch", { branchName: "copy/tag", newBranchName: "must-not-rename" })).ok, false);
  await requireSuccess(callGit(registry, root, "rename_branch", { branchName: "copy/sha", newBranchName: "renamed" }));
  assert.equal(git(root, ["rev-parse", "renamed"]), later);
  assert.equal((await callGit(registry, root, "rename_branch", { branchName: "renamed", newBranchName: "copy/dev" })).ok, false);
  assert.deepEqual(snapshot(), before);
  await requireSuccess(callGit(registry, root, "rename_branch", { branchName: "dev", newBranchName: "dirty-renamed" }));
  assert.deepEqual(snapshot(), { ...before, branch: "refs/heads/dirty-renamed" });
  for (const sourceRef of ["--all", "missing", "HEAD\nother", "x".repeat(1025)]) {
    assert.equal((await callGit(registry, root, "create_branch_from_ref", { branchName: "invalid-source", sourceRef })).ok, false);
  }
  git(root, ["symbolic-ref", "refs/heads/symbolic", "refs/heads/renamed"]);
  assert.equal((await callGit(registry, root, "advance_branch_ref", { ...advance, branchName: "symbolic", expectedCurrentCommit: later })).ok, false);
  git(root, ["symbolic-ref", "refs/heads/dangling", "refs/heads/missing"]);
  assert.equal((await callGit(registry, root, "create_branch_from_ref", { branchName: "dangling", sourceRef: base })).ok, false);
  assert.equal(git(root, ["symbolic-ref", "refs/heads/dangling"]), "refs/heads/missing");
});

test("mapped branch push upstream and exact remote deletion preserve local refs and sanitize failures", async (t) => {
  const root = createBoundWorkspace("champcity-remote-branches-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  commitAllFixtureState(root, "base"); const base = git(root, ["rev-parse", "HEAD"]);
  const remote = path.join(path.dirname(root), "remote.git"); git(path.dirname(root), ["init", "--bare", remote]);
  git(root, ["remote", "add", "origin", remote]);
  const registry = registryFor(root);
  const pushed = await requireSuccess(callGit(registry, root, "push", { branch: "dev", remoteBranch: "published/other", expectedCommit: base, setUpstream: true }));
  assert.equal(pushed.payload.upstream, "origin/published/other");
  assert.equal(git(remote, ["rev-parse", "refs/heads/published/other"]), base);
  const inspect = async () => (await requireSuccess(callGit(registry, root, "inspect_branch_state", { branchName: "dev" }, "files.read"))).payload.selectedBranch;
  assert.equal((await inspect()).upstream, "origin/published/other");
  await requireSuccess(callGit(registry, root, "unset_branch_upstream", { branchName: "dev" }));
  assert.equal((await inspect()).upstream, null);
  for (const params of [{ branchName: "missing", remote: "origin", remoteBranch: "published/other" }, { branchName: "dev", remote: "missing", remoteBranch: "published/other" }, { branchName: "dev", remote: "origin", remoteBranch: "missing" }]) {
    assert.equal((await callGit(registry, root, "set_branch_upstream", params)).ok, false);
  }
  await requireSuccess(callGit(registry, root, "set_branch_upstream", { branchName: "dev", remote: "origin", remoteBranch: "published/other" }));
  assert.equal((await inspect()).upstream, "origin/published/other");
  fs.writeFileSync(path.join(root, "later.txt"), "later\n"); commitAllFixtureState(root, "later");
  const later = git(root, ["rev-parse", "HEAD"]);
  assert.equal((await callGit(registry, root, "push", { expectedCommit: base })).ok, false);
  const oldPush = await requireSuccess(callGit(registry, root, "push"));
  assert.deepEqual(oldPush.payload, { remote: "origin", branch: "dev", commit: later });
  assert.equal(git(remote, ["rev-parse", "refs/heads/dev"]), later);
  const localRefs = git(root, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/tags"]);
  const params = { remote: "origin", remoteBranch: "published/other", expectedRemoteCommit: later };
  assert.equal((await callGit(registry, root, "delete_remote_branch", params)).ok, false);
  const rejectedHook = path.join(remote, "hooks", "pre-receive");
  fs.writeFileSync(rejectedHook, '#!/bin/sh\necho "private-diagnostic-marker" >&2\nexit 1\n'); fs.chmodSync(rejectedHook, 0o755);
  const rejected = await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base });
  assert.equal(rejected.ok, false); assert.equal(JSON.stringify(rejected).includes("private-diagnostic-marker"), false);
  assert.equal(JSON.stringify(rejected).includes(remote), false); fs.unlinkSync(rejectedHook);
  git(root, ["config", "remote.origin.mirror", "true"]);
  assert.equal((await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base })).ok, false);
  git(root, ["config", "--unset", "remote.origin.mirror"]);
  git(root, ["config", "remote.origin.pushurl", root]);
  assert.equal((await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base })).ok, false);
  git(root, ["config", "--unset", "remote.origin.pushurl"]);
  const raceHook = path.join(root, ".git", "hooks", "pre-push");
  fs.writeFileSync(raceHook, `#!/bin/sh
git --git-dir="$2" update-ref refs/heads/published/other ${later} ${base}
`); fs.chmodSync(raceHook, 0o755);
  assert.equal((await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base })).ok, false, "Remote movement between inspection and receive-pack is preserved");
  assert.equal(git(remote, ["rev-parse", "refs/heads/published/other"]), later);
  fs.unlinkSync(raceHook); git(remote, ["update-ref", "refs/heads/published/other", base, later]);
  const deleted = await requireSuccess(callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base }));
  assert.deepEqual(deleted.payload, { remote: "origin", remoteBranch: "published/other", deletedCommit: base, remoteState: "absent" });
  assert.equal(git(remote, ["for-each-ref", "--format=%(objectname)", "refs/heads/published/other"]), "");
  assert.equal(git(root, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/tags"]), localRefs);
  assert.equal(git(remote, ["rev-parse", "refs/heads/dev"]), later);
  assert.equal((await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base })).ok, false);
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

function registryFor(root) {
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveWorkspaceRootContext(root);
      if (workspaceId !== context.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => [],
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: path.join(path.dirname(root), "user-data") });
}

function callGit(registry, root, action, params, scope = "files.read files.write") {
  const workspaceId = resolveWorkspaceRootContext(root).workspaceId;
  return registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId, action, ...(params === undefined ? {} : { params }) },
    scope,
  });
}

async function requireSuccess(promise) {
  const result = await promise;
  assert.equal(result.ok, true, JSON.stringify(result.error));
  return result;
}

function commitAllFixtureState(root, message) {
  execFileSync("git", ["add", "--all", "--", "."], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", message], { cwd: root, stdio: "ignore" });
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function gitLines(root, args) {
  const value = git(root, args);
  return value ? value.split(/\r?\n/).sort() : [];
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}
