const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { captureStructuredWorkIntake } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");
const { selectStructuredWorkRoute, recordStructuredImplementation, recordStructuredWorkDisposition } =
  require("../../dist/main/sourceControl/structuredWorkflowCheckpointService.js");
const { createStructuredIntegrationService } = require("../../dist/main/sourceControl/structuredIntegrationService.js");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
function openState(root) {
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  return { store, state: createProjectStateService(store, operator) };
}
async function closeIntake(root, projectId, intakeId) {
  const { store, state } = openState(root);
  try {
    let intake = await store.getEntity(projectId, intakeId);
    intake = await state.advanceWorkIntake(projectId, intakeId, "active", intake.recordVersion);
    await state.advanceWorkIntake(projectId, intakeId, "closed", intake.recordVersion);
  } finally { store.close(); }
}
async function routeAndWork(root, captured, title, route) {
  const { store, state } = openState(root);
  let assessment;
  try { assessment = await state.recordRouteAssessment(captured.projectId, captured.intakeId,
    { recommendation: route, traits: [], rationale: title, evidenceIds: [] }); }
  finally { store.close(); }
  const selected = await selectStructuredWorkRoute(root, captured.projectId, captured.intakeId,
    { route, assessmentId: assessment.id, rationale: `Operator selects ${route}` });
  assert.equal(selected.checkpoint.state, "committed", JSON.stringify(selected.checkpoint));
  const next = openState(root);
  try {
    const summary = await next.state.getWorkIntakeSummary(captured.projectId, captured.intakeId);
    const workflowType = route === "feature-change" ? "feature-capability" : "issue-resolution";
    const currentWorkspace = route === "feature-change" ? "development" : "issue";
    const target = await next.state.createWorkflow(captured.projectId, { workflowType,
      title: `${title} ${route} execution`, currentWorkspace });
    await next.state.linkWorkflowRouteTarget(captured.projectId, summary.routingWorkflowId, target.id);
    assert.equal((await next.state.getWorkIntakeSummary(captured.projectId, captured.intakeId)).targetWorkflowId, target.id);
    const work = await next.state.createRecord(captured.projectId, "WorkItem",
      { workItemKind: "feature", title, objective: title, workState: "implemented" });
    await next.state.createRelationship(captured.projectId, work.id, "part_of", target.id);
    return work.id;
  } finally { next.store.close(); }
}
function submission(projectId, title) {
  return { projectId, projectName: "Lifecycle qualification", workRequest: title, desiredOutcome: `${title} accepted`,
    knownConstraints: "Preserve exact source", repositoryReviewContext: "Synthetic qualification", hasExistingSourceOrPlanning: true,
    baseBranch: "dev", baseCommit: "" };
}

test("package lifecycle carries dirty intake, three lines, review loop, clean and repaired integration into the graph", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-source-lifecycle-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "config", "user.name", "Synthetic Test");
  fs.writeFileSync(path.join(root, "tracked.txt"), "baseline\n");
  fs.writeFileSync(path.join(root, "shared.txt"), "baseline\n");
  git(root, "add", "tracked.txt", "shared.txt");
  git(root, "commit", "-m", "baseline");
  git(root, "switch", "-c", "dev");
  const initialDev = git(root, "rev-parse", "dev");
  fs.mkdirSync(path.join(root, ".champcity"));
  const setup = openState(root);
  let projectId;
  try {
    const project = await setup.state.createRecord(null, "Project",
      { name: "Lifecycle qualification", description: "Package end-to-end" });
    projectId = project.id;
    await setup.state.createRecord(projectId, "ProjectResource", { resourceType: "source-repository", provider: "git",
      logicalName: "repository-lifecycle", locator: "selected-repository", role: "project-source" });
    await setup.store.transaction(projectId, unit => unit.advanceProviderGeneration({ projectId, generation: 1,
      authority: "structured", updatedAt: new Date().toISOString() }, null));
  } finally { setup.store.close(); }

  fs.writeFileSync(path.join(root, "tracked.txt"), "dirty primary\n");
  const feature = await captureStructuredWorkIntake(root, projectId, submission(projectId, "Feature"));
  const hotfixOne = await captureStructuredWorkIntake(root, projectId, submission(projectId, "Hotfix one"));
  const hotfixTwo = await captureStructuredWorkIntake(root, projectId, submission(projectId, "Hotfix two"));
  for (const item of [feature, hotfixOne, hotfixTwo]) {
    assert.equal(item.source.state, "ready", JSON.stringify(item.source));
    assert.equal(item.source.binding.baseRevision.revisionId, initialDev);
  }
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(git(root, "rev-parse", "HEAD"), initialDev);
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "dirty primary\n");
  fs.writeFileSync(path.join(root, "tracked.txt"), "baseline\n");
  const featureLine = feature.source.binding.sourceLine.sourceLineId;
  const hotfixLine = hotfixOne.source.binding.sourceLine.sourceLineId;
  const activeLine = hotfixTwo.source.binding.sourceLine.sourceLineId;
  assert.equal(new Set([featureLine, hotfixLine, activeLine]).size, 3);

  git(root, "switch", featureLine);
  const featureWork = await routeAndWork(root, feature, "Feature", "feature-change");
  fs.writeFileSync(path.join(root, "feature.txt"), "first implementation\n");
  const first = await recordStructuredImplementation(root, projectId, feature.intakeId, featureWork,
    { summary: "First implementation", deviations: [], blockers: [], residualRisks: [], outcome: "implemented", executionRef: "feature-1" },
    "feature-implementation-1", ["feature.txt"]);
  assert.equal(first.checkpoint.state, "committed", JSON.stringify(first.checkpoint));
  const firstRevision = first.checkpoint.revision.revisionId;
  const requested = await recordStructuredWorkDisposition(root, projectId, feature.intakeId, featureWork,
    { decisionType: "review", outcome: "revision_requested", rationale: "Revise the feature", decisionScope: "feature-review-1" },
    "feature-disposition-1");
  assert.equal(requested.checkpoint.state, "committed");
  fs.writeFileSync(path.join(root, "feature.txt"), "revised implementation\n");
  const revised = await recordStructuredImplementation(root, projectId, feature.intakeId, featureWork,
    { summary: "Revised implementation", deviations: [], blockers: [], residualRisks: [], outcome: "implemented", executionRef: "feature-2" },
    "feature-implementation-2", ["feature.txt"]);
  assert.equal(revised.checkpoint.state, "committed", JSON.stringify(revised.checkpoint));
  const accepted = await recordStructuredWorkDisposition(root, projectId, feature.intakeId, featureWork,
    { decisionType: "review", outcome: "accepted", rationale: "Feature accepted", decisionScope: "feature-review-2" },
    "feature-disposition-2");
  assert.equal(accepted.checkpoint.state, "committed");
  assert.notEqual(firstRevision, revised.checkpoint.revision.revisionId);
  assert.equal(git(root, "branch", "--show-current"), featureLine);
  await closeIntake(root, projectId, feature.intakeId);
  const source = createSourceControlService({ repositoryId: "repository-lifecycle", repositoryRoot: root });
  const featureHead = git(root, "rev-parse", featureLine);
  const clean = await createStructuredIntegrationService(root, projectId, feature.intakeId,
    { checks: [{ checkId: "feature-check", run: async () => ({ exitCode: 0, summary: "Feature accepted" }) }] }).integrate();
  assert.equal(clean.candidate.status, "integrated", clean.candidate.message);
  assert.equal(clean.candidate.targetBranch, "dev");
  assert.equal(clean.candidate.candidateCommit, featureHead, "clean integration fast-forwards to the exact work head");
  assert.equal(git(root, "rev-parse", "dev"), featureHead);

  git(root, "switch", hotfixLine);
  const hotfixWork = await routeAndWork(root, hotfixOne, "Hotfix one", "issue-resolution");
  fs.writeFileSync(path.join(root, "shared.txt"), "incoming hotfix\n");
  const hotfixImplementation = await recordStructuredImplementation(root, projectId, hotfixOne.intakeId, hotfixWork,
    { summary: "Hotfix implementation", deviations: [], blockers: [], residualRisks: [], outcome: "implemented", executionRef: "hotfix-1" },
    "hotfix-implementation-1", ["shared.txt"]);
  assert.equal(hotfixImplementation.checkpoint.state, "committed", JSON.stringify(hotfixImplementation.checkpoint));
  await closeIntake(root, projectId, hotfixOne.intakeId);
  git(root, "switch", "dev");
  fs.writeFileSync(path.join(root, "shared.txt"), "target hotfix\n");
  fs.writeFileSync(path.join(root, ".champcity", "integration-policy.json"), JSON.stringify({ schemaVersion: 1,
    checks: [{ checkId: "both-hotfixes", lane: "integration", runner: { kind: "npm-script", script: "verify", timeoutMs: 15000 } }],
    requiredIntegrationChecks: ["both-hotfixes"], repair: { allowedEditableRoots: ["shared.txt"], sources: [] } }));
  git(root, "add", "shared.txt", ".champcity/integration-policy.json");
  git(root, "commit", "-m", "independent target hotfix");
  git(root, "switch", hotfixLine);
  const conflict = createStructuredIntegrationService(root, projectId, hotfixOne.intakeId,
    { checks: [{ checkId: "both-hotfixes", run: async candidateRoot => {
      const body = fs.readFileSync(path.join(candidateRoot, "shared.txt"), "utf8");
      return { exitCode: body.includes("incoming hotfix") && body.includes("target hotfix") ? 0 : 1,
        summary: "Both hotfix histories survive" };
    } }] });
  const conflicted = await conflict.integrate();
  assert.equal(conflicted.candidate.status, "conflicted", conflicted.candidate.message);
  assert.equal(conflicted.integration.body.integrationState, "repairing");
  const repair = await conflict.prepareRepair(conflicted.candidate.candidateId);
  await conflict.applyRepair(conflicted.candidate.candidateId, repair.repairId,
    [{ path: "shared.txt", beforeSha256: repair.snapshot.editable["shared.txt"], content: "incoming hotfix\ntarget hotfix\n" }]);
  const integrated = await conflict.completeRepair(conflicted.candidate.candidateId, repair.repairId);
  assert.equal(integrated.candidate.status, "integrated", integrated.candidate.message);

  const graph = await source.getSourceGraph({ maxRevisions: 80, maxLines: 16 });
  assert.equal(graph.ok, true, JSON.stringify(graph));
  assert.equal(graph.result.sourceLines.length, 5);
  assert.deepEqual(new Set(graph.result.workBindings.map(row => row.workIntakeId)),
    new Set([feature.intakeId, hotfixOne.intakeId, hotfixTwo.intakeId]));
  assert.ok(graph.result.sourceLines.every(line => !line.providerBranchName.startsWith("champcity-")));
  assert.equal(graph.result.workBindings.find(row => row.workIntakeId === feature.intakeId).route, "feature-change");
  assert.equal(graph.result.workBindings.find(row => row.workIntakeId === hotfixOne.intakeId).route, "issue-resolution");
  assert.equal(graph.result.workBindings.find(row => row.workIntakeId === feature.intakeId).integrationState, "integrated");
  assert.equal(graph.result.workBindings.find(row => row.workIntakeId === hotfixOne.intakeId).integrationState, "integrated");
  assert.equal(graph.result.workBindings.find(row => row.workIntakeId === hotfixTwo.intakeId).integrationState, null);
  assert.ok(graph.result.revisions.some(row => row.id === featureHead && row.integrationStates.includes("integrated")));
  assert.ok(graph.result.revisions.some(row => row.id === integrated.candidate.candidateCommit && row.parents.includes(git(root, "rev-parse", hotfixLine))),
    JSON.stringify({ hotfixHead: git(root, "rev-parse", hotfixLine), candidate: integrated.candidate.candidateCommit,
      revision: graph.result.revisions.find(row => row.id === integrated.candidate.candidateCommit) }));
  assert.equal(git(root, "branch", "--show-current"), hotfixLine);
  assert.equal(git(root, "rev-parse", activeLine), initialDev);
});
