const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const repositoryRoot = path.resolve(__dirname, "../..");
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
const {
  createBoundWorkspace,
  configureGitIdentity,
  registryFor,
  callGit,
  requireSuccess,
  commitAllFixtureState,
  git,
  gitLines,
  readCanonical,
  createTagDeletionFixture,
} = require("../support/git-mutation-fixtures.cjs");

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

test("research lifecycle checkpoint commits approved no-plan evidence without manufacturing a Plan", async (t) => {
  const { seedPreparedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
  const { root, intake, route, git: runGit } = seedPreparedRoutedWorkIntake(t, "research-prototype", {
    workRequest: "Compare bounded approaches", desiredOutcome: "Close with evidence only", knownConstraints: "No production implementation",
  });
  const { workPlanningKernel, workPlanningArtifactPath } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  const { resolveWorkPlanningProfile } = require("../../dist/main/workPlanning/workPlanningProfiles.js");
  const { resolveResearchCompletion, checkpointResearchCompletion } = require("../../dist/main/planExecution/researchCompletionService.js");
  const { readLifecycleCheckpointReceipt } = require("../../dist/main/planExecution/lifecycleEvidenceCheckpointReceipt.js");
  const { serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
  const kernel = workPlanningKernel;
  const outcome = { outcome: "no-implementation-plan-required", prototypeDisposition: "disposable", productionFollowUp: "none",
    evidence: ["Bounded comparison completed"], decisionEnabled: "Stop investigation", successFailureResult: "Evidence threshold met", closureCondition: "Comparison complete" };
  const block = `\n\`\`\`champcity-research-outcome\n${JSON.stringify(outcome)}\n\`\`\`\n`;
  const profile = resolveWorkPlanningProfile("research-prototype");
  const evidence = {
    "Evidence": outcome.evidence[0], "Decisions": outcome.decisionEnabled, "Risks and Unresolved Questions": "Prototype remains non-production.",
    "Question Hypothesis and Decision": "Which bounded approach is viable?", "Alternatives": "Compare A and B.",
    "Bounded Prototype and Evidence": "Disposable comparison only.", "Success Failure and Findings": outcome.successFailureResult,
    "Output Classification": "Disposable prototype evidence.", "Expiration and Closure": outcome.closureCondition, "Research Outcome": block,
  };
  assert.deepEqual(Object.keys(evidence), profile.assessmentSections);
  let model = await kernel.prepare(root, intake.intakeId, "assessment");
  const draft = path.join(root, model.submission.expectedDraftSlots[0].draftRelativePath);
  fs.mkdirSync(path.dirname(draft), { recursive: true });
  fs.writeFileSync(draft, "# Route Architect Assessment\n\n" + Object.entries(evidence).map(([heading, value]) => `## ${heading}\n${value}`).join("\n\n"));
  model = await kernel.get(root, intake.intakeId, "assessment");
  model = await kernel.review(root, intake.intakeId, "assessment", { expectedRevision: model.artifact.artifactRevision, disposition: "Approved", notes: "Evidence accepted" });
  const assessmentPath = model.artifact.relativePath;
  const assessmentFile = path.join(root, assessmentPath);
  const original = fs.readFileSync(assessmentFile);
  const completion = await resolveResearchCompletion(root, intake.intakeId);
  assert.equal(completion.completion.kind, "research");
  assert.equal(completion.completion.completionId, model.artifact.identity.assessmentId);

  fs.writeFileSync(path.join(root, "unrelated.txt"), "unrelated change\n");
  let blocked = await checkpointResearchCompletion(root, intake.intakeId);
  assert.equal(blocked.checkpoint.status, "blocked"); assert.match(blocked.checkpoint.message, /Unrelated/);
  fs.unlinkSync(path.join(root, "unrelated.txt"));

  const rewrite = (metadata) => {
    const parsed = parseCanonicalMarkdownDocument(original.toString("utf8"));
    fs.writeFileSync(assessmentFile, serializeCanonicalMarkdownDocument(metadata(parsed.metadata), parsed.bodyMarkdown));
  };
  rewrite((metadata) => ({ ...metadata, participationRole: "historical" }));
  await assert.rejects(checkpointResearchCompletion(root, intake.intakeId), /approved no-Plan Assessment|identity conflicts/);
  rewrite((metadata) => ({ ...metadata, identity: { ...metadata.identity, routeDecisionId: "decision-00000000-0000-4000-8000-000000000099" } }));
  await assert.rejects(checkpointResearchCompletion(root, intake.intakeId), /approved no-Plan Assessment|identity conflicts/);
  fs.writeFileSync(assessmentFile, original.toString("utf8").replaceAll("no-implementation-plan-required", "research-plan-required"));
  await assert.rejects(checkpointResearchCompletion(root, intake.intakeId), /approved no-Plan Assessment/);
  fs.writeFileSync(assessmentFile, original);

  const result = await checkpointResearchCompletion(root, intake.intakeId);
  assert.equal(result.checkpoint.status, "committed", result.checkpoint.message);
  const receipt = readLifecycleCheckpointReceipt(runGit("show", "--no-patch", "--format=%B", result.checkpoint.commit), result.checkpoint.checkpointId);
  assert.equal(receipt.boundary.kind, "research");
  assert.deepEqual(receipt.boundary, completion.boundary);
  const expected = ["planning/work-intake/PROJECT.md", intake.relativePath, route.relativePath, route.selection.sourceAssessment.path, assessmentPath].sort();
  assert.deepEqual(receipt.files.map((entry) => entry.path), expected);
  assert.deepEqual(receipt.files.map((entry) => entry.path), [...receipt.files.map((entry) => entry.path)].sort());
  assert.equal(fs.existsSync(path.join(root, workPlanningArtifactPath(intake.intakeId, route.selection.decisionId, "plan"))), false);
  assert.equal(runGit("status", "--porcelain"), "");
});
