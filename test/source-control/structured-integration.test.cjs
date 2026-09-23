const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { captureGreenfieldWorkIntake } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { selectStructuredWorkRoute } = require("../../dist/main/sourceControl/structuredWorkflowCheckpointService.js");
const { createStructuredIntegrationService } = require("../../dist/main/sourceControl/structuredIntegrationService.js");
const { createImplementationCheckpoint } = require("../../dist/main/sourceControl/semanticCheckpointService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }

test("completed structured Work Intake integrates exact validated source into dev without switching the primary checkout", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-structured-integration-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const captured = await captureGreenfieldWorkIntake(root, { projectId: null, projectName: "Structured Integration",
    workRequest: "Deliver one accepted capability", desiredOutcome: "Accepted source on dev", knownConstraints: "Keep the work source",
    repositoryReviewContext: "Greenfield", hasExistingSourceOrPlanning: false, baseBranch: "", baseCommit: "" });
  assert.equal(captured.source.state, "ready");
  const line = captured.source.binding.sourceLine.sourceLineId;
  const targetBefore = git(root, "rev-parse", "dev");
  git(root, "switch", line);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const state = createProjectStateService(store, operator);
    const assessment = await state.recordRouteAssessment(captured.projectId, captured.intakeId,
      { recommendation: "feature-change", traits: [], rationale: "One accepted capability", evidenceIds: [] });
    const route = await selectStructuredWorkRoute(root, captured.projectId, captured.intakeId,
      { route: "feature-change", assessmentId: assessment.id, rationale: "Operator selects feature work" });
    assert.equal(route.checkpoint.state, "committed");
    let intake = await store.getEntity(captured.projectId, captured.intakeId);
    intake = await state.advanceWorkIntake(captured.projectId, captured.intakeId, "active", intake.recordVersion);
    await state.advanceWorkIntake(captured.projectId, captured.intakeId, "closed", intake.recordVersion);
  } finally { store.close(); }
  const service = createStructuredIntegrationService(root, captured.projectId, captured.intakeId,
    { checks: [{ checkId: "accepted-source", run: async () => ({ exitCode: 0, summary: "Accepted source preserved" }) }] });
  const before = await service.query();
  assert.equal(before.candidates.length, 0);
  assert.equal(git(root, "rev-parse", "dev"), targetBefore);
  const pendingState = git(root, "status", "--porcelain", "--untracked-files=all");
  assert.equal(pendingState, "?? .champcity/project-state.sqlite");
  fs.writeFileSync(path.join(root, "pending-source.txt"), "Unrelated work stays pending.\n");
  await assert.rejects(service.integrate(), /pending source changes/);
  assert.equal(fs.readFileSync(path.join(root, "pending-source.txt"), "utf8"), "Unrelated work stays pending.\n");
  assert.equal(git(root, "rev-parse", "dev"), targetBefore);
  fs.unlinkSync(path.join(root, "pending-source.txt"));
  const integrated = await service.integrate();
  assert.equal(integrated.candidate.status, "integrated", integrated.candidate.message);
  assert.equal(integrated.candidate.targetBranch, "dev");
  assert.equal(integrated.candidate.targetAfterRevisionId, integrated.candidate.candidateCommit);
  assert.equal(integrated.integration.body.integrationState, "integrated");
  assert.equal(integrated.integration.body.resultRevisionId, integrated.candidate.candidateCommit);
  assert.equal(integrated.integration.body.validationIds.length, 1);
  assert.equal(git(root, "rev-parse", "dev"), integrated.candidate.candidateCommit);
  assert.equal(git(root, "branch", "--show-current"), line);
  assert.equal(git(root, "status", "--porcelain", "--untracked-files=all"), pendingState,
    "application-owned Project State remains in the primary checkout");
  const retry = await service.integrate();
  assert.equal(retry.integration.id, integrated.integration.id);
  assert.equal(retry.candidate.candidateId, integrated.candidate.candidateId);
  assert.equal(git(root, "rev-parse", "dev"), integrated.candidate.candidateCommit);
});

test("structured conflict retains the candidate and uses bounded application-owned Integration Repair", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-structured-repair-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const captured = await captureGreenfieldWorkIntake(root, { projectId: null, projectName: "Structured Repair",
    workRequest: "Preserve both accepted changes", desiredOutcome: "Both behaviors on dev", knownConstraints: "Bounded source repair",
    repositoryReviewContext: "Greenfield", hasExistingSourceOrPlanning: false, baseBranch: "", baseCommit: "" });
  const line = captured.source.binding.sourceLine.sourceLineId;
  git(root, "switch", line);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const state = createProjectStateService(store, operator);
    const assessment = await state.recordRouteAssessment(captured.projectId, captured.intakeId,
      { recommendation: "feature-change", traits: [], rationale: "Preserve both", evidenceIds: [] });
    const route = await selectStructuredWorkRoute(root, captured.projectId, captured.intakeId,
      { route: "feature-change", assessmentId: assessment.id, rationale: "Operator accepts feature route" });
    assert.equal(route.checkpoint.state, "committed");
    const work = await state.createRecord(captured.projectId, "WorkItem", { workItemKind: "feature", title: "Change source",
      objective: "Preserve both accepted behaviors", workState: "ready" });
    const implementation = await state.recordImplementation(captured.projectId, work.id,
      { summary: "Incoming behavior", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
    fs.writeFileSync(path.join(root, "shared.txt"), "incoming accepted\n");
    const checkpoint = await createImplementationCheckpoint(root, captured.projectId, { boundaryId: "incoming-source",
      workIntakeId: captured.intakeId, targetEntityId: implementation.id, sourceLineId: line,
      expectedRevisionId: route.checkpoint.revision.revisionId, attributablePaths: ["shared.txt"] });
    assert.equal(checkpoint.state, "committed", checkpoint.message);
    git(root, "switch", "dev");
    fs.writeFileSync(path.join(root, "shared.txt"), "target accepted\n");
    fs.writeFileSync(path.join(root, ".champcity", "integration-policy.json"), JSON.stringify({ schemaVersion: 1,
      checks: [{ checkId: "accepted-source", lane: "integration", runner: { kind: "npm-script", script: "verify", timeoutMs: 15000 } }],
      requiredIntegrationChecks: ["accepted-source"], repair: { allowedEditableRoots: ["shared.txt"], sources: [] } }));
    git(root, "add", "shared.txt", ".champcity/integration-policy.json");
    git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "independent target work");
    git(root, "switch", line);
    let intake = await store.getEntity(captured.projectId, captured.intakeId);
    intake = await state.advanceWorkIntake(captured.projectId, captured.intakeId, "active", intake.recordVersion);
    await state.advanceWorkIntake(captured.projectId, captured.intakeId, "closed", intake.recordVersion);
  } finally { store.close(); }
  const targetBefore = git(root, "rev-parse", "dev");
  const service = createStructuredIntegrationService(root, captured.projectId, captured.intakeId,
    { checks: [{ checkId: "accepted-source", run: async candidateRoot => {
      const content = fs.readFileSync(path.join(candidateRoot, "shared.txt"), "utf8");
      return { exitCode: content.includes("incoming accepted") && content.includes("target accepted") ? 0 : 1,
        summary: "Both accepted behaviors survive" };
    } }] });
  const conflicted = await service.integrate();
  assert.equal(conflicted.candidate.status, "conflicted", conflicted.candidate.message);
  assert.equal(conflicted.integration.body.integrationState, "repairing");
  assert.equal(git(root, "rev-parse", "dev"), targetBefore);
  const attempt = await service.prepareRepair(conflicted.candidate.candidateId);
  assert.deepEqual(attempt.policy.editablePaths, ["shared.txt"]);
  await assert.rejects(service.applyRepair(conflicted.candidate.candidateId, attempt.repairId,
    [{ path: "outside.txt", beforeSha256: "deleted", content: "outside" }]), /source scope/);
  await service.applyRepair(conflicted.candidate.candidateId, attempt.repairId,
    [{ path: "shared.txt", beforeSha256: attempt.snapshot.editable["shared.txt"], content: "incoming accepted\ntarget accepted\n" }]);
  const repaired = await service.completeRepair(conflicted.candidate.candidateId, attempt.repairId);
  assert.equal(repaired.candidate.status, "integrated", repaired.candidate.message);
  assert.equal(repaired.integration.body.integrationState, "integrated");
  assert.equal(repaired.integration.body.resultRevisionId, git(root, "rev-parse", "dev"));
  assert.equal(git(root, "branch", "--show-current"), line);
});
