const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  CodexImplementerExecutionService,
  CODEX_AUTH_UNAVAILABLE_MESSAGE,
  CODEX_RUNTIME_UNAVAILABLE_MESSAGE,
} = require("../../dist/main/workCardBuilding/codexImplementerExecutionService.js");
const { isEligibleTesterPath, parseTesterResult } = require("../../dist/main/workCardBuilding/codexTesterExecutionService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  replaceControlledMarkdownBody,
} = require("../../dist/main/repository/controlledMarkdownDrafts.js");
const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  listPlanningDocuments,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Tester result contract accepts only the bounded permanent proof package and application-owned capability attribution", () => {
  assert.equal(isEligibleTesterPath("test/work-card-building/example.test.cjs"), true);
  for (const path of ["test/fixtures/sample.test.ts", "test/support/helper.js", "test/snapshots/view.snap", "test/data/expected.json", "test/a.test.json", "validation/capability-map.json"]) {
    assert.equal(isEligibleTesterPath(path), true, path);
  }
  for (const path of ["src/main/index.test.ts", "validation/catalog.json", "test/../src/main/a.test.ts", "C:/repo/test/a.test.ts", "test/.env", "test/node_modules/pkg/index.js", ".champcity/state.json", "package.json"]) {
    assert.equal(isEligibleTesterPath(path), false, path);
  }
  const result = parseTesterResult(JSON.stringify({ recommendation: "permanent-proof-change-warranted", permanentTestPaths: [],
    determinationEvidence: ["bounded evidence"], unknowns: [], rationale: "Permanent regression proof is warranted." }));
  assert.deepEqual(result.permanentTestPaths, []);
  assert.throws(() => parseTesterResult(JSON.stringify({ recommendation: "no-permanent-test-required", affectedCapabilityIds: ["invented"],
    permanentTestPaths: [], determinationEvidence: ["bounded evidence"], unknowns: [], rationale: "Unsupported capability attribution." })));
});

test("exact Implementer and Tester mutation leases serialize one checkout, isolate neutral workers, and recover stale owners", () => {
  const { acquireWorkflowExecutionLease, workflowExecutionLeaseKey } = require("../../dist/main/workCardBuilding/workflowExecutionLease.js");
  const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "champcity-wrb04-lease-"));
  try {
    const checkoutA = path.join(root, "workflow-a"), checkoutB = path.join(root, "workflow-b");
    fs.mkdirSync(checkoutA); fs.mkdirSync(checkoutB);
    const implementer = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkoutA), "Implementer");
    assert.ok(implementer);
    assert.equal(acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkoutA), "Tester"), null);
    const independent = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkoutB), "Implementer");
    const neutralOne = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-neutral", path.join(root, "worker-one")), "Tester");
    const neutralTwo = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-neutral", path.join(root, "worker-two")), "Tester");
    assert.ok(independent); assert.ok(neutralOne); assert.ok(neutralTwo);
    implementer.release();
    const afterRelease = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkoutA), "Tester");
    assert.ok(afterRelease);
    independent.release();
    const stale = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkoutB), "Tester", 1);
    assert.ok(stale);
    const recovered = acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkoutB), "Implementer", 1 + 30 * 60 * 1000 + 1);
    assert.ok(recovered);
    stale.release();
    assert.equal(acquireWorkflowExecutionLease(workflowExecutionLeaseKey("source-backed", checkoutB), "Tester", 1 + 30 * 60 * 1000 + 2), null);
    neutralOne.release(); neutralTwo.release(); recovered.release(); afterRelease.release();
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

async function waitForSelectorState(service, root, selector, expectedState, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await service.getStatus(root, selector);
    if (status.state === expectedState) return status;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const status = await service.getStatus(root, selector);
  assert.equal(status.state, expectedState);
  return status;
}

test("exact Workflow Implementer input request resumes only through its Workflow and WorkItem selector", async t => {
 for (const prepared of [false, true]) await t.test(prepared ? "reuse prepared attempt" : "auto-prepare one attempt", async t => {
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const { createWorkflowExecutionApplicationService } = require("../../dist/main/workflow/workflowExecutionApplicationService.js");
  const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
  const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
  const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
  const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "champcity-exact-pending-interaction-"));
  const registration = await registerCurrentProject(root, "existing", { projectName: "Exact pending interaction" });
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  t.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const state = createProjectStateService(store, { principalId: "interaction-operator", principalType: "human", role: "Operator" });
  const workflow = await state.createSubstantiveWorkflow(registration.project.id, { workflowType: "feature-capability", title: "Pending exact", entryWorkspace: "feature-intake" });
  const plan = await state.acceptWorkflowPlanningGraph(registration.project.id, { workflowId: workflow.workflow.id, topology: "direct",
    solution: { title: "Accepted", objective: "Continue exact execution", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], phases: [], workItems: [{ key: "work", kind: "feature", title: "Wait for input", objective: "Resume exact session", dependencyKeys: [], criteria: [] }] });
  const item = plan.directWorkItems[0], selector = { ownerKind: "workflow-work-item", workflowId: workflow.workflow.id, workItemId: item.id };
  const execution = createWorkflowExecutionApplicationService();
  await execution.acceptWorkItemExecutionPlan(root, { workflowId: workflow.workflow.id, workItemId: item.id, expectedVersion: item.recordVersion,
    plan: { implementationBoundaries: ["Resume exact session"], affectedPaths: [], proofIntent: ["Confirm resumed output"] } });
  const reserved = prepared ? await execution.prepareImplementationAttempt(root, workflow.workflow.id, item.id) : null;
  let starts = 0;
  let answerSession;
  const inputAnswered = new Promise(resolve => { answerSession = resolve; });
  let capturedResponse;
  const fixture = runtimeFixture(); await fixture.ready;
  const service = new CodexImplementerExecutionService(async () => ({ startThread() { starts++; return { id: "exact-pending-thread",
    async runStreamed() { return { events: (async function* () {
      yield { type: "user_input.requested", request: { requestId: "input-1", threadId: "exact-pending-thread", turnId: "exact-turn", itemId: "exact-input",
        questions: [{ id: "next_step", header: "Next Step", question: "How should execution continue?", options: [{ label: "Continue", description: "Resume this exact run." }] }] } };
      await inputAnswered;
      yield { type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ summary: "Resumed exact WorkItem", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" }) } };
      yield { type: "turn.completed" };
    })() }; },
    async respondToUserInput(requestId, answers) { capturedResponse = { requestId, answers }; answerSession(); } }; } }),
    undefined, () => ({ sandboxMode: "workspace-write", approvalPolicy: "on-request", approvalsReviewer: "user", networkAccessEnabled: false }),
    undefined, fixture.manager, () => createWorkflowExecutionApplicationService());
  const beforeStatus = await store.listEntities(registration.project.id, "ImplementationAttempt");
  assert.equal((await service.getStatus(root, selector)).state, "ready");
  assert.deepEqual(await store.listEntities(registration.project.id, "ImplementationAttempt"), beforeStatus);
  await service.start(root, selector, selection);
  await service.start(root, selector, selection);
  const attempts = (await store.listEntities(registration.project.id, "ImplementationAttempt")).filter(a => a.body.workItemId === item.id);
  assert.equal(attempts.length, 1);
  assert.equal(starts, 1);
  if (reserved) assert.equal(attempts[0].id, reserved.id);
  assert.equal(attempts[0].body.attemptState, "running");
  const restarted = new CodexImplementerExecutionService(undefined, undefined, undefined, undefined, fixture.manager);
  const recovery = await restarted.getStatus(root, selector);
  assert.equal(recovery.state, "unavailable");
  assert.match(recovery.failureReason, /recovery\/inspection/);
  let pending;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    pending = await service.getStatus(root, selector);
    if (pending.pendingUserInput) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(pending.pendingUserInput.requestId, "input-1");
  assert.equal(pending.workflowId, workflow.workflow.id); assert.equal(pending.workItemId, item.id);
  const answered = await service.respondToUserInput(root, "input-1", { next_step: ["Continue"] }, selector);
  assert.equal(answered.pendingUserInput, null);
  assert.deepEqual(capturedResponse, { requestId: "input-1", answers: { next_step: ["Continue"] } });
  assert.equal((await waitForSelectorState(service, root, selector, "completed")).workflowId, workflow.workflow.id);
  const report = await execution.getImplementationAttempt(root, workflow.workflow.id, item.id);
  assert.equal(report.attempt.id, attempts[0].id);
  assert.equal(report.attempt.body.attemptState, "completed");
  assert.equal((await store.getEntity(registration.project.id, report.attempt.body.implementationRecordId)).body.executionRef, attempts[0].id);
  assert.match(report.markdown, /Resumed exact WorkItem/);
 });
});

test("exact Workflow Tester input response resumes only its Workflow, WorkItem, and ImplementationRecord session", async t => {
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const { createWorkflowExecutionApplicationService } = require("../../dist/main/workflow/workflowExecutionApplicationService.js");
  const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
  const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
  const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
  const { CodexTesterExecutionService } = require("../../dist/main/workCardBuilding/codexTesterExecutionService.js");
  const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "champcity-exact-tester-input-"));
  const registration = await registerCurrentProject(root, "existing", { projectName: "Exact Tester input" });
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  t.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const state = createProjectStateService(store, { principalId: "tester-input-operator", principalType: "human", role: "Operator" });
  const workflow = await state.createSubstantiveWorkflow(registration.project.id, { workflowType: "feature-capability", title: "Tester input", entryWorkspace: "feature-intake" });
  const plan = await state.acceptWorkflowPlanningGraph(registration.project.id, { workflowId: workflow.workflow.id, topology: "direct",
    solution: { title: "Accepted", objective: "Verify exact output", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], phases: [], workItems: [{ key: "work", kind: "feature", title: "Tester target", objective: "Tester waits for input", dependencyKeys: [], criteria: [] }] });
  const item = plan.directWorkItems[0], execution = createWorkflowExecutionApplicationService();
  const accepted = await execution.acceptWorkItemExecutionPlan(root, { workflowId: workflow.workflow.id, workItemId: item.id, expectedVersion: item.recordVersion,
    plan: { implementationBoundaries: ["Implement output"], affectedPaths: [], proofIntent: ["Review exact output"] } });
  const attempt = await execution.beginWorkItemAttempt(root, workflow.workflow.id, item.id, accepted.recordVersion, "tester-input-implementation");
  const implementation = await execution.finishWorkItemAttempt(root, workflow.workflow.id, item.id, attempt.executionRef,
    { summary: "Implemented", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  const ids = { workflowId: workflow.workflow.id, workItemId: item.id, implementationRecordId: implementation.id };
  let releaseInput, capturedResponse;
  const inputAnswered = new Promise(resolve => { releaseInput = resolve; });
  const fixture = runtimeFixture(); await fixture.ready;
  const tester = new CodexTesterExecutionService(async () => ({ startThread() { return { id: "exact-tester-input",
    async runStreamed() { return { events: (async function* () {
      yield { type: "user_input.requested", request: { requestId: "tester-input-1", threadId: "exact-tester-input", turnId: "turn-1", itemId: "input-1",
        questions: [{ id: "test_scope", header: "Scope", question: "Which scope should be checked?", options: [{ label: "Accepted", description: "Use accepted scope." }] }] } };
      await inputAnswered;
      yield { type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ recommendation: "reuse-existing-proof", permanentTestPaths: [],
        determinationEvidence: ["Reviewed the exact implemented attempt."], unknowns: [], rationale: "No additional permanent test is required." }) } };
      yield { type: "turn.completed" };
    })() }; },
    async respondToUserInput(requestId, answers) { capturedResponse = { requestId, answers }; releaseInput(); } }; } }), undefined);
  await tester.start(root, ids, selection);
  let pending;
  for (let attemptIndex = 0; attemptIndex < 80; attemptIndex += 1) {
    pending = await tester.getStatus(root, ids);
    if (pending.pendingUserInput) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(pending.pendingUserInput.requestId, "tester-input-1");
  assert.deepEqual([pending.workflowId, pending.workItemId, pending.implementationRecordId], [ids.workflowId, ids.workItemId, ids.implementationRecordId]);
  const answered = await tester.respondToUserInput(root, ids, "tester-input-1", { test_scope: ["Accepted"] });
  assert.equal(answered.pendingUserInput, null);
  assert.deepEqual(capturedResponse, { requestId: "tester-input-1", answers: { test_scope: ["Accepted"] } });
  let completed;
  for (let attemptIndex = 0; attemptIndex < 80; attemptIndex += 1) {
    completed = await tester.getStatus(root, ids);
    if (completed.state === "completed" || completed.state === "failed") break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(completed.state, "completed", completed.failureReason);
  assert.equal(completed.workflowId, ids.workflowId);
});

// Existing lifecycle tests explicitly supply the new runtime identity through a per-test fixture.
function createService(...args) {
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const fixture = runtimeFixture();
  while (args.length < 4) args.push(undefined);
  const service = new CodexImplementerExecutionService(...args, fixture.manager);
  const start = service.start.bind(service);
  service.start = async (root, selector, chosen = selection) => { await fixture.ready; return start(root, selector, chosen); };
  return service;
}



test("exact source-backed and source-neutral WorkItems use the bounded Tester lifecycle", async t => {
  const { CodexTesterExecutionService } = require("../../dist/main/workCardBuilding/codexTesterExecutionService.js");
  const { execFileSync } = require("node:child_process");
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const { createWorkflowExecutionApplicationService } = require("../../dist/main/workflow/workflowExecutionApplicationService.js");
  const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
  const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
  const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
  const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "champcity-wrb04-02d-source-execution-"));
  const project = await registerCurrentProject(root, "existing", { projectName: "Source execution fixture" });
  const dev = path.join(root, "Dev"); fs.mkdirSync(dev);
  const git = (...args) => execFileSync("git", args, { cwd: dev, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "dev"); git("config", "user.name", "Test Operator"); git("config", "user.email", "operator@example.invalid");
  fs.mkdirSync(path.join(dev, "test"), { recursive: true });
  fs.writeFileSync(path.join(dev, "test", "seed.test.cjs"), "// Existing permanent test proof\n");
  fs.mkdirSync(path.join(dev, "validation"), { recursive: true });
  fs.writeFileSync(path.join(dev, "validation", "capability-map.json"), JSON.stringify({ schemaVersion: 4,
    capabilities: [{ capabilityId: "feature-behavior", sourcePatterns: ["feature.txt"] }],
    tests: [{ testPath: "test/seed.test.cjs", proposedValidationLane: "fast", duration: { kind: "estimated", milliseconds: 100 },
      execution: { ownedResources: ["temp-filesystem-isolated"] }, behaviorCoverage: [{ capabilityId: "feature-behavior", behaviorId: "feature-behavior-is-protected", proofRole: "primary" }] }] }));
  fs.writeFileSync(path.join(dev, "feature.txt"), "baseline\n"); git("add", "--all"); git("commit", "-m", "baseline");
  const revision = git("rev-parse", "HEAD");
  fs.writeFileSync(path.join(root, ".champcity", "mcp-workspace-binding.json"), JSON.stringify({ mcpWorkspaceId: "source-execution-fixture", gitBacked: true }));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, { principalId: "test-operator", principalType: "human", role: "Operator" });
  t.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const created = await state.createSubstantiveWorkflow(project.project.id, { workflowType: "feature-capability", title: "Source exact", entryWorkspace: "feature-intake" });
  const baseline = await state.createWorkflowSourceBaseline(project.project.id, created.workflow.id, { repositoryId: "source-execution-repository", integrationTargetSourceLineId: "dev", baseRevisionId: revision });
  await state.createWorkflowSourceBinding(project.project.id, created.workflow.id, baseline.id);
  const plan = await state.acceptWorkflowPlanningGraph(project.project.id, { workflowId: created.workflow.id, topology: "direct",
    solution: { title: "Accepted", objective: "Implement the source change", scopeIn: ["feature.txt"], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], phases: [], workItems: [
      { key: "source-item", kind: "feature", title: "Same title", objective: "Change feature.txt", dependencyKeys: [], criteria: [] },
      { key: "unsafe-item", kind: "feature", title: "Unsafe attribution", objective: "Change a source file", dependencyKeys: [], criteria: [] },
      { key: "unsafe-restore-item", kind: "feature", title: "Unsafe restore", objective: "Exercise bounded restore refusal", dependencyKeys: [], criteria: [] },
    ] });
  const item = plan.directWorkItems.find(candidate => candidate.body.title === "Same title");
  const unsafeItem = plan.directWorkItems.find(candidate => candidate.body.title === "Unsafe attribution");
  const unsafeRestoreItem = plan.directWorkItems.find(candidate => candidate.body.title === "Unsafe restore");
  const planning = createWorkflowExecutionApplicationService();
  for (const candidate of [item, unsafeItem, unsafeRestoreItem]) await planning.acceptWorkItemExecutionPlan(root, { workflowId: created.workflow.id, workItemId: candidate.id, expectedVersion: candidate.recordVersion,
    plan: { implementationBoundaries: ["Change only accepted source files"], affectedPaths: ["feature.txt"], proofIntent: ["Run focused source proof"] } });
  const unrelated = await state.createSubstantiveWorkflow(project.project.id, { workflowType: "issue-resolution", title: "Unrelated source", entryWorkspace: "issue-intake",
    sourceSeed: { repositoryId: "source-execution-repository", integrationTargetSourceLineId: "dev", baseRevisionId: revision } });
  const unrelatedPlan = await state.acceptWorkflowPlanningGraph(project.project.id, { workflowId: unrelated.workflow.id, topology: "direct",
    solution: { title: "Other", objective: "Other", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [], phases: [],
    workItems: [{ key: "unrelated-item", kind: "fix", title: "Same title", objective: "Not this checkout", dependencyKeys: [], criteria: [] }] });
  const fixture = runtimeFixture(); await fixture.ready;
  let appServerCalls = 0; let checkoutRegistrations = 0; const captured = [];
  const service = new CodexImplementerExecutionService(async () => {
    appServerCalls++;
    return { startThread(options) { captured.push(options); return { id: "source-thread", async runStreamed() {
      const relative = appServerCalls === 1 ? "feature.txt" : appServerCalls === 2 ? "unreported.txt" : "unreported-dir";
      if (appServerCalls > 2) { fs.mkdirSync(path.join(options.workingDirectory, relative), { recursive: true }); fs.writeFileSync(path.join(options.workingDirectory, relative, "nested.txt"), "unsafe\n"); }
      else fs.writeFileSync(path.join(options.workingDirectory, relative), "implemented\n");
      return { events: (async function* () {
        yield { type: "item.completed", item: { type: "file_change", changes: [{ path: relative }], status: "completed" } };
        yield { type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ summary: "Implemented the exact source WorkItem", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" }) } };
        yield { type: "turn.completed" };
      })() };
    } }; } };
  }, undefined, () => ({ sandboxMode: "workspace-write", approvalPolicy: "on-request", approvalsReviewer: "user", networkAccessEnabled: false }),
  undefined, fixture.manager, dependencies => createWorkflowExecutionApplicationService(dependencies));
  service.configureSourceCheckoutProjection(async () => ({ workspaceId: "source-execution", projection: { registerRepositoryCheckout: async (_workspaceId, checkout) => {
    checkoutRegistrations++;
    return { ...checkout, ...(checkout.workflowId === unrelated.workflow.id ? { projectRelativePath: `.champcity/checkouts/${created.workflow.id}` } : {}),
      availability: "available", validationError: null };
  } } }));
  const unrelatedStart = await service.start(root, { ownerKind: "workflow-work-item", workflowId: unrelated.workflow.id, workItemId: unrelatedPlan.directWorkItems[0].id }, selection);
  assert.equal(unrelatedStart.state, "unavailable");
  assert.equal(appServerCalls, 0);
  assert.equal((await store.listEntities(project.project.id, "ImplementationRecord")).length, 0);
  const selector = { ownerKind: "workflow-work-item", workflowId: created.workflow.id, workItemId: item.id };
  const started = await service.start(root, selector, selection);
  assert.equal(started.state, "running", started.failureReason);
  assert.equal(started.workflowId, created.workflow.id);
  assert.equal(started.workItemId, item.id);
  assert.equal(started.sourceMode, "source-backed");
  assert.equal(started.formalWorkCardPath, null);
  assert.equal(started.implementerReportPath, null);
  const completed = await waitForSelectorState(service, root, selector, "completed", 300);
  assert.equal(completed.failureReason, null);
  assert.equal(completed.checkpoint.status, "committed", completed.checkpoint.message);
  assert.notEqual(captured[0].workingDirectory, root);
  assert.equal(captured[0].workingDirectory, path.join(root, ".champcity", "checkouts", created.workflow.id));
  assert.deepEqual(captured[0].writableRoots, [captured[0].workingDirectory]);
  assert.match(captured[0].workingDirectory, /checkouts/);
  const records = await store.listEntities(project.project.id, "ImplementationRecord");
  const checkpoints = await store.listEntities(project.project.id, "SourceCheckpoint");
  const bindings = await store.listEntities(project.project.id, "SourceBinding");
  assert.equal(records.length, 1, "one exact implementation record after the first source run");
  assert.equal(checkpoints.length, 1, "one structured checkpoint after the first source run");
  assert.equal(bindings.length, 2, "one source binding for each source-backed Workflow");
  assert.equal(records[0].body.workItemId, item.id); assert.equal(records[0].body.outcome, "implemented");
  const packet = JSON.parse(fs.readFileSync(path.join(root, ".champcity", "runtime", "work-item-attempts", `${records[0].body.executionRef}.json`), "utf8"));
  assert.equal(packet.result.summary, "Implemented the exact source WorkItem");
  assert.equal(checkpoints[0].body.workflowId, created.workflow.id);
  assert.equal(checkpoints[0].body.checkpointState, "committed");
  const checkpointLinks = await store.listRelationships(project.project.id, "checkpoints");
  assert.ok(checkpointLinks.some(edge => edge.fromEntityId === checkpoints[0].id && edge.toEntityId === records[0].id));
  const exactBinding = bindings.find(binding => binding.body.workflowId === created.workflow.id);
  assert.equal(exactBinding.body.currentRevisionId, checkpoints[0].body.resultingRevisionId);
  assert.deepEqual(packet.sourceCheckpointAttempt, { repositoryCheckoutId: exactBinding.body.repositoryCheckoutId,
    sourceLineId: exactBinding.body.workSourceLineId, expectedRevisionId: checkpoints[0].body.expectedRevisionId, attributablePaths: ["feature.txt"] });
  const testerOptions = [];
  let testerAppServerCalls = 0;
  const tester = new CodexTesterExecutionService(async () => { testerAppServerCalls++; return ({
    startThread(options) { testerOptions.push(options); return { id: "tester-thread", async runStreamed(prompt) {
      assert.match(prompt, /Bounded lifecycle determination/);
      if (prompt.includes("Source mode: source-neutral")) {
        assert.match(prompt, /Do not write files/);
        assert.doesNotMatch(prompt, /Implementer revision:/);
        return { events: (async function* () {
          yield { type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ recommendation: "lifecycle-review-candidate",
            permanentTestPaths: [], determinationEvidence: ["Reviewed the source-neutral implementation attempt."], unknowns: ["No repository-backed permanent proof surface exists."], rationale: "No source revision or repository proof is available in source-neutral mode." }) } };
          yield { type: "turn.completed" };
        })() };
      }
      assert.match(prompt, /ValidationCatalog proof covers affected capabilities: test\/seed\.test\.cjs/);
      fs.writeFileSync(path.join(options.workingDirectory, "test", "feature.test.cjs"), "// Tester-owned permanent proof\n");
      fs.mkdirSync(path.join(options.workingDirectory, "test", "fixtures"), { recursive: true });
      fs.writeFileSync(path.join(options.workingDirectory, "test", "fixtures", "feature-data.json"), "{\"covered\":true}\n");
      fs.appendFileSync(path.join(options.workingDirectory, "validation", "capability-map.json"), "\n");
      return { events: (async function* () {
        yield { type: "item.completed", item: { type: "file_change", changes: [{ path: "test/feature.test.cjs" }, { path: "test/fixtures/feature-data.json" }, { path: "validation/capability-map.json" }], status: "completed" } };
        yield { type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ recommendation: "permanent-proof-change-warranted",
          permanentTestPaths: ["test/feature.test.cjs", "test/fixtures/feature-data.json", "validation/capability-map.json"], determinationEvidence: ["Tester reviewed the exact implementation revision."], unknowns: [], rationale: "The behavior needs permanent regression proof." }) } };
        yield { type: "turn.completed" };
      })() };
    } }; }
  }); });
  const testerIds = { workflowId: created.workflow.id, workItemId: item.id, implementationRecordId: records[0].id };
  const sourceNeutral = await state.createSubstantiveWorkflow(project.project.id, { workflowType: "feature-capability", title: "Source neutral Tester", entryWorkspace: "feature-intake" });
  const neutralPlan = await state.acceptWorkflowPlanningGraph(project.project.id, { workflowId: sourceNeutral.workflow.id, topology: "direct",
    solution: { title: "Neutral accepted solution", objective: "Complete without repository source", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], phases: [], workItems: [{ key: "neutral-item", kind: "feature", title: "Same title", objective: "No source anchor", dependencyKeys: [], criteria: [] }] });
  const neutralWork = neutralPlan.directWorkItems[0];
  const neutralExecutionPlan = await createWorkflowExecutionApplicationService().acceptWorkItemExecutionPlan(root, { workflowId: sourceNeutral.workflow.id, workItemId: neutralWork.id,
    expectedVersion: neutralWork.recordVersion, plan: { implementationBoundaries: ["Keep the WorkItem source-neutral"], affectedPaths: [], proofIntent: ["Review source-neutral semantic completion"] } });
  const neutralImplementer = createProjectStateService(store, { principalId: "neutral-implementer", principalType: "agent", role: "Implementer" });
  const neutralRef = (await state.prepareImplementationAttempt(project.project.id, sourceNeutral.workflow.id, neutralWork.id)).id;
  await neutralImplementer.beginWorkItemAttempt(project.project.id, sourceNeutral.workflow.id, neutralWork.id, neutralExecutionPlan.recordVersion, neutralRef);
  const neutralImplementation = await neutralImplementer.finishWorkItemAttempt(project.project.id, sourceNeutral.workflow.id, neutralWork.id, neutralRef,
    { summary: "Implementation complete", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  const neutralStatus = await tester.getStatus(root, { workflowId: sourceNeutral.workflow.id, workItemId: neutralWork.id, implementationRecordId: neutralImplementation.id });
  assert.equal(neutralStatus.state, "ready", neutralStatus.failureReason);
  assert.equal(neutralStatus.sourceMode, "source-neutral");
  const neutralIds = { workflowId: sourceNeutral.workflow.id, workItemId: neutralWork.id, implementationRecordId: neutralImplementation.id };
  const neutralStarted = await tester.start(root, neutralIds, selection);
  assert.equal(neutralStarted.state, "running");
  let neutralCompleted;
  for (let attempt = 0; attempt < 1200; attempt += 1) { neutralCompleted = await tester.getStatus(root, neutralIds); if (neutralCompleted.state !== "running") break; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.equal(neutralCompleted.state, "completed", neutralCompleted.failureReason);
  const neutralResult = await state.getRecord(project.project.id, neutralCompleted.testerResultId);
  assert.equal(neutralResult.body.sourceMode, "source-neutral");
  assert.equal(neutralResult.body.implementerRevisionId, undefined);
  assert.equal(neutralResult.body.candidateRevisionId, undefined);
  assert.equal(neutralResult.body.sourceCheckpointId, undefined);
  assert.deepEqual(neutralResult.body.permanentTestPaths, []);
  assert.equal((await store.listEntities(project.project.id, "SourceCheckpoint")).filter(record => record.entityType === "SourceCheckpoint" && record.body.workflowId === sourceNeutral.workflow.id).length, 0);
  assert.equal(testerOptions[0].networkAccessEnabled, false);
  assert.equal(testerOptions[0].writableRoots.length, 1);
  assert.match(testerOptions[0].writableRoots[0], /tester-workers/);
  const exactCheckout = path.join(root, ".champcity", "checkouts", created.workflow.id);
  const dirtyFile = path.join(exactCheckout, "pre-existing-dirty.txt");
  fs.writeFileSync(dirtyFile, "dirty before Tester\n");
  const dirtyStatus = await tester.getStatus(root, testerIds);
  assert.equal(dirtyStatus.state, "unavailable");
  assert.match(dirtyStatus.failureReason, /dirty/i);
  assert.equal(testerAppServerCalls, 1);
  fs.unlinkSync(dirtyFile);
  const testerReady = await tester.getStatus(root, testerIds);
  assert.equal(testerReady.state, "ready", testerReady.failureReason);
  const testerStarted = await tester.start(root, testerIds, selection);
  assert.equal(testerStarted.state, "running");
  let testerCompleted;
  for (let attempt = 0; attempt < 1200; attempt += 1) {
    testerCompleted = await tester.getStatus(root, testerIds);
    if (testerCompleted.state !== "running") break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(testerCompleted.state, "completed", testerCompleted.failureReason);
  assert.equal(testerCompleted.failureReason, null);
  assert.equal(testerCompleted.checkpointState, "committed");
  assert.equal(testerCompleted.sourceMode, "source-backed");
  assert.ok(testerCompleted.testerResultId);
  assert.ok(testerCompleted.candidateRevisionId);
  assert.equal(testerOptions[0].sandboxMode, "workspace-write");
  assert.equal(testerOptions[0].networkAccessEnabled, false);
  assert.deepEqual(testerOptions[1].writableRoots, [path.join(testerOptions[1].workingDirectory, "test"), path.join(testerOptions[1].workingDirectory, "validation")]);
  const testerResult = await state.getRecord(project.project.id, testerCompleted.testerResultId);
  assert.equal(testerResult.body.implementationRecordId, records[0].id);
  assert.deepEqual(testerResult.body.affectedCapabilityIds, ["feature-behavior"]);
  assert.equal(testerResult.body.checkpointState, "committed");
  assert.deepEqual(testerResult.body.permanentTestPaths, ["test/feature.test.cjs", "test/fixtures/feature-data.json", "validation/capability-map.json"]);
  const testerCheckpoints = (await store.listEntities(project.project.id, "SourceCheckpoint")).filter(row => row.entityType === "SourceCheckpoint" && row.body.checkpointKind === "tester");
  assert.equal(testerCheckpoints.length, 1);
  assert.equal(testerCheckpoints[0].body.checkpointState, "committed");
  assert.equal(testerCheckpoints[0].body.resultingRevisionId, testerCompleted.candidateRevisionId);
  assert.deepEqual(execFileSync("git", ["show", "--format=", "--name-only", "HEAD"], { cwd: exactCheckout, encoding: "utf8" }).split(/\r?\n/).filter(Boolean).sort(), testerResult.body.permanentTestPaths);
  assert.equal(testerResult.body.sourceCheckpointId, testerCheckpoints[0].id);
  assert.ok((await store.listRelationships(project.project.id, "checkpoints")).some(edge => edge.fromEntityId === testerCheckpoints[0].id && edge.toEntityId === testerResult.id));
  const bindingAfterTester = await state.getRecord(project.project.id, exactBinding.id);
  assert.equal(bindingAfterTester.body.currentRevisionId, testerCompleted.candidateRevisionId);
  assert.equal(exactBinding.body.currentRevisionId, checkpoints[0].body.resultingRevisionId, "pre-tester binding snapshot remains on the implementation revision");
  assert.equal(git("branch", "--show-current"), "dev");
  assert.equal(appServerCalls, 1);
  const unsafeSelector = { ownerKind: "workflow-work-item", workflowId: created.workflow.id, workItemId: unsafeItem.id };
  const unsafeStart = await service.start(root, unsafeSelector, selection);
  assert.equal(unsafeStart.state, "running");
  const unsafeCompleted = await waitForSelectorState(service, root, unsafeSelector, "failed", 300);
  assert.equal(unsafeCompleted.checkpoint.status, "not-required");
  assert.match(unsafeCompleted.checkpoint.message, /restored/i);
  const finalRecords = await store.listEntities(project.project.id, "ImplementationRecord");
  const finalCheckpoints = await store.listEntities(project.project.id, "SourceCheckpoint");
  assert.equal(finalRecords.length, 3); assert.equal(finalCheckpoints.length, 2);
  const unsafeAttempt = finalRecords.find(record => record.body.workItemId === unsafeItem.id);
  assert.equal(unsafeAttempt.body.outcome, "failed");
  assert.equal((await state.getRecord(project.project.id, unsafeItem.id)).body.workState, "ready");
  assert.equal(fs.readFileSync(path.join(root, ".champcity", "checkouts", created.workflow.id, "feature.txt"), "utf8"), "implemented\n",
    "the earlier successful checkpoint remains untouched while rejected paths are restored");
  assert.equal(fs.existsSync(path.join(root, ".champcity", "checkouts", created.workflow.id, "unreported.txt")), false);
  assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: path.join(root, ".champcity", "checkouts", created.workflow.id), encoding: "utf8" }).trim(), bindingAfterTester.body.currentRevisionId);
  assert.equal(execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: path.join(root, ".champcity", "checkouts", created.workflow.id), encoding: "utf8" }).trim(), "");
  assert.equal((await store.listEntities(project.project.id, "SourceCheckpoint")).filter(record => record.entityType === "SourceCheckpoint" && record.body.boundaryId === unsafeAttempt.body.executionRef).length, 0);
  const oldPlanVersion = (await state.getRecord(project.project.id, unsafeItem.id)).recordVersion;
  const revised = await planning.acceptWorkItemExecutionPlan(root, { workflowId: created.workflow.id, workItemId: unsafeItem.id, expectedVersion: oldPlanVersion,
    plan: { implementationBoundaries: ["Make the broader change under reviewed scope"], affectedPaths: ["feature.txt"], proofIntent: ["Retry in the accepted expanded scope"] } });
  assert.equal(revised.recordVersion, oldPlanVersion + 1);
  const restoreFailureStart = await service.start(root, { ownerKind: "workflow-work-item", workflowId: created.workflow.id, workItemId: unsafeRestoreItem.id }, selection);
  assert.equal(restoreFailureStart.state, "running");
  const restoreFailure = await waitForSelectorState(service, root, { ownerKind: "workflow-work-item", workflowId: created.workflow.id, workItemId: unsafeRestoreItem.id }, "failed", 300);
  assert.equal(restoreFailure.checkpoint.status, "blocked");
  assert.match(restoreFailure.checkpoint.message, /recovery|restore|outside/i);
  assert.equal((await state.getRecord(project.project.id, unsafeRestoreItem.id)).body.workState, "blocked");
  assert.equal(checkoutRegistrations, 3, "Only actual Runs materialize source; durable report/status reads do not prepare another checkout");
  assert.equal(appServerCalls, 3);
});


test("source-backed no-mutation WorkItems complete, recover unchanged attempts, and keep strict mutation checkpoint boundaries", async t => {
 const {execFileSync}=require('node:child_process');
 const {runtimeFixture,selection}=require('../support/codex-runtime.cjs');
 const {createWorkflowExecutionApplicationService}=require('../../dist/main/workflow/workflowExecutionApplicationService.js');
 const {createSQLiteProjectStateStore}=require('../../dist/main/projectState/sqliteProjectStateStore.js');
 const {registerCurrentProject}=require('../../dist/main/projectState/currentProjectRegistrationService.js');
 const {createProjectStateService}=require('../../dist/shared/projectState/projectStateService.js');
 const {CodexTesterExecutionService}=require('../../dist/main/workCardBuilding/codexTesterExecutionService.js');
 const root=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'source-no-mutation-'));
 const registration=await registerCurrentProject(root,'existing',{projectName:'No mutation'}),projectId=registration.project.id;
 const dev=path.join(root,'Dev');fs.mkdirSync(dev);const git=(...args)=>execFileSync('git',args,{cwd:dev,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-b','dev');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
 fs.mkdirSync(path.join(dev,'test'));fs.mkdirSync(path.join(dev,'validation'));fs.writeFileSync(path.join(dev,'feature.txt'),'baseline');
 fs.writeFileSync(path.join(dev,'test','seed.test.cjs'),'// seed');fs.writeFileSync(path.join(dev,'validation','capability-map.json'),JSON.stringify({schemaVersion:4,capabilities:[],tests:[]}));
 git('add','--all');git('commit','-m','baseline');const revision=git('rev-parse','HEAD');
 fs.writeFileSync(path.join(root,'.champcity','mcp-workspace-binding.json'),JSON.stringify({mcpWorkspaceId:'no-mutation',gitBacked:true}));
 const store=createSQLiteProjectStateStore(path.join(root,'.champcity','project-state.sqlite'));
 const state=createProjectStateService(store,{principalId:'operator',principalType:'human',role:'Operator'});
 t.after(()=>{store.close();fs.rmSync(root,{recursive:true,force:true});});
 const workflow=(await state.createSubstantiveWorkflow(projectId,{workflowType:'feature-capability',title:'Read source',entryWorkspace:'feature-intake',sourceSeed:{repositoryId:'repo',integrationTargetSourceLineId:'dev',baseRevisionId:revision}})).workflow;
 const plan=await state.acceptWorkflowPlanningGraph(projectId,{workflowId:workflow.id,topology:'direct',solution:{title:'Read source',objective:'Complete without edits',scopeIn:[],scopeOut:[],constraints:[],assumptions:[],risks:[]},solutionCriteria:[],phases:[],workItems:['fresh','recovered','mutation-required','unexpected','unreported'].map(key=>({key,kind:'feature',title:key,objective:'Assess source context',dependencyKeys:[],criteria:[]}))});
 const kernel=createWorkflowExecutionApplicationService();
 for(const item of plan.directWorkItems)await kernel.acceptWorkItemExecutionPlan(root,{workflowId:workflow.id,workItemId:item.id,expectedVersion:item.recordVersion,plan:{implementationBoundaries:['Exact approved scope'],affectedPaths:item.body.title==='mutation-required'?['feature.txt']:[],proofIntent:['Assess exact source context']}});
 const runtime=runtimeFixture();await runtime.ready;const captures=[];
 const factory=async()=>({startThread(options){captures.push(options);return {id:'read-thread',async runStreamed(prompt){
  assert.match(prompt,/source-backed/);const unexpected=prompt.includes('"objective": "Assess source context"')&&prompt.includes('"workItemId": "'+plan.directWorkItems.find(i=>i.body.title==='unexpected').id+'"');
  const unreported=prompt.includes('"workItemId": "'+plan.directWorkItems.find(i=>i.body.title==='unreported').id+'"');
  if(unexpected||unreported)fs.writeFileSync(path.join(options.workingDirectory,'feature.txt'),'unauthorized');
  return {events:(async function*(){if(unexpected)yield {type:'item.completed',item:{type:'file_change',changes:[{path:'feature.txt'}],status:'completed'}};yield {type:'item.completed',item:{type:'agent_message',text:JSON.stringify({summary:'Assessed context',deviations:[],blockers:[],residualRisks:[],outcome:'implemented'})}};yield {type:'turn.completed'};})()};
 }};}});
 const service=new CodexImplementerExecutionService(factory,undefined,undefined,undefined,runtime.manager);
 service.configureSourceCheckoutProjection(async()=>({workspaceId:'no-mutation',projection:{registerRepositoryCheckout:async(_id,checkout)=>({...checkout,availability:'available',validationError:null})}}));
 const fresh=plan.directWorkItems.find(i=>i.body.title==='fresh'),selector={ownerKind:'workflow-work-item',workflowId:workflow.id,workItemId:fresh.id};
 const freshProjection=await kernel.getExecutionProjection(root,workflow.id);
 for(const sourceState of ['unprepared','ready','blocked']) {
  const view=structuredClone(freshProjection);view.source.state=sourceState;
  const statusService=new CodexImplementerExecutionService(undefined,undefined,undefined,undefined,runtime.manager,()=>({
   getImplementationAttempt:async()=>null,getExecutionProjection:async()=>view,
   prepareExecution:async()=>{throw Error('Status must not materialize');},prepareImplementationAttempt:async()=>{throw Error('Status must not reserve');}
  }));
  const status=await statusService.getStatus(root,selector);assert.equal(status.state,sourceState==='blocked'?'unavailable':'ready');assert.equal(status.canRunAgain,sourceState!=='blocked');
 }
 for(const invalidate of [view=>view.workflowId='peer',view=>view.plan.workflow.id='peer',view=>view.items=[],view=>view.items.push(view.items.find(i=>i.record.id===fresh.id)),
  view=>view.items.find(i=>i.record.id===fresh.id).record.lifecycleState='archived',view=>view.items.find(i=>i.record.id===fresh.id).record.body.workState='validation_pending',
  view=>view.items.find(i=>i.record.id===fresh.id).eligibility.eligible=false,view=>view.items.find(i=>i.record.id===fresh.id).eligibility.blockers=['work-item-contract-review-required'],
  view=>view.items.find(i=>i.record.id===fresh.id).record.body.proofIntent=[]]) {
  const view=structuredClone(freshProjection);invalidate(view);
  const blocked=new CodexImplementerExecutionService(undefined,undefined,undefined,undefined,runtime.manager,()=>({getImplementationAttempt:async()=>null,getExecutionProjection:async()=>view}));
  assert.equal((await blocked.getStatus(root,selector)).state,'unavailable');
 }
 for(const kind of ['ambiguous','stale']) {
  const blocked=new CodexImplementerExecutionService(undefined,undefined,undefined,undefined,runtime.manager,()=>({
   getImplementationAttempt:async()=>{if(kind==='ambiguous')throw Error('Ambiguous current ImplementationAttempt.');return {attempt:{id:'stale',body:{attemptState:'prepared'}}};},
   assertImplementationAttemptCurrent:async()=>{throw Error('Prepared ImplementationAttempt is stale.');}
  }));
  const status=await blocked.getStatus(root,selector);assert.equal(status.state,'unavailable');assert.match(status.failureReason,new RegExp(kind,'i'));
 }
 const beforeStatus=await store.listStateChanges(projectId),ready=await service.getStatus(root,selector);
 assert.equal(ready.state,'ready');assert.equal(ready.executionContractDigest,null);assert.equal(ready.sourceMode,'source-backed');
 assert.deepEqual(await store.listStateChanges(projectId),beforeStatus);assert.equal(fs.existsSync(path.join(root,'.champcity','checkouts',workflow.id)),false);
 assert.equal((await service.start(root,selector,selection)).state,'running');const completed=await waitForSelectorState(service,root,selector,'completed',300);
 assert.equal(completed.checkpoint.status,'not-required');assert.equal(completed.failureReason,null);assert.equal(completed.sourceMode,'source-backed');
 assert.equal(captures[0].readOnly,true);assert.deepEqual(captures[0].writableRoots,[]);
 const contract=await kernel.createTesterWorkItemExecutionContract(root,workflow.id,fresh.id,{sourceMutation:'not-required',affectedPaths:[],proofIntent:['Assess']});
 assert.equal(contract.sourceRevisionId,revision);assert.equal(contract.sourceMutation,'not-required');
 const freshImpl=(await state.getImplementationAttempts(projectId,fresh.id)).at(-1);
 const projection=await kernel.getCheckpointRecoveryProjection(root,workflow.id,fresh.id);assert.equal(projection.implementation.state,'not-required');assert.equal(projection.implementation.retryable,false);assert.equal(projection.implementation.reason,null);
 assert.equal((await store.listEntities(projectId,'SourceCheckpoint')).length,0);
 const restart=new CodexImplementerExecutionService(async()=>{throw Error('Recovery must not start runtime');},undefined,undefined,undefined,runtime.manager);
 const recoveredStatus=await restart.getStatus(root,selector);assert.equal(recoveredStatus.state,'completed');assert.equal(recoveredStatus.checkpoint.status,'not-required');assert.equal(recoveredStatus.retryBlocker,null);
 const tester=new CodexTesterExecutionService(async()=>({startThread(){return {id:'tester',async runStreamed(){return {events:(async function*(){yield {type:'item.completed',item:{type:'agent_message',text:JSON.stringify({recommendation:'no-permanent-test-required',permanentTestPaths:[],determinationEvidence:['Read exact unchanged source'],unknowns:[],rationale:'No permanent test change required'})}};yield {type:'turn.completed'};})()};}};}}));
 const ids={workflowId:workflow.id,workItemId:fresh.id,implementationRecordId:freshImpl.id};assert.equal((await tester.getStatus(root,ids)).state,'ready');await tester.start(root,ids,selection);
 let done;for(let i=0;i<300;i++){done=await tester.getStatus(root,ids);if(done.state!=='running')break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(done.state,'completed',done.failureReason);const result=await state.getRecord(projectId,done.testerResultId);assert.equal(result.body.sourceMode,'source-backed');assert.equal(result.body.checkpointState,'not-required');assert.equal(result.body.candidateRevisionId,revision);
 assert.equal((await kernel.getWorkItemValidationProjection(root,workflow.id,fresh.id)).completion.eligible,true);
 const freshCurrent=await state.getRecord(projectId,fresh.id);await kernel.completeWorkItem(root,workflow.id,fresh.id,freshCurrent.recordVersion);assert.equal((await state.getRecord(projectId,fresh.id)).body.workState,'closed');
 const recovered=plan.directWorkItems.find(i=>i.body.title==='recovered');const reserved=await kernel.prepareImplementationAttempt(root,workflow.id,recovered.id);await kernel.beginWorkItemAttempt(root,workflow.id,recovered.id,reserved.body.workItemVersion,reserved.id);
 const record=await kernel.finishWorkItemAttempt(root,workflow.id,recovered.id,reserved.id,{summary:'Existing semantic success',deviations:[],blockers:[],residualRisks:[],outcome:'implemented'});const before=record;
 const reopening=new CodexImplementerExecutionService(factory,undefined,undefined,undefined,runtime.manager);
 assert.equal((await reopening.getStatus(root,{ownerKind:'workflow-work-item',workflowId:workflow.id,workItemId:recovered.id})).checkpoint.status,'not-required');
 assert.deepEqual(await state.getRecord(projectId,record.id),before);assert.equal((await state.getImplementationAttempt(projectId,workflow.id,recovered.id)).id,reserved.id);
 const proofTester=new CodexTesterExecutionService(async()=>({startThread(options){return {id:'proof-tester',async runStreamed(){fs.writeFileSync(path.join(options.workingDirectory,'test','new.test.cjs'),'// independent proof');return {events:(async function*(){yield {type:'item.completed',item:{type:'file_change',changes:[{path:'test/new.test.cjs'}],status:'completed'}};yield {type:'item.completed',item:{type:'agent_message',text:JSON.stringify({recommendation:'permanent-proof-change-warranted',permanentTestPaths:['test/new.test.cjs'],determinationEvidence:['New independent test proof'],unknowns:[],rationale:'Permanent regression proof warranted'})}};yield {type:'turn.completed'};})()};}};}}));
 const proofIds={workflowId:workflow.id,workItemId:recovered.id,implementationRecordId:record.id};await proofTester.start(root,proofIds,selection);
 let proof;for(const deadline=Date.now()+30000;Date.now()<deadline;){proof=await proofTester.getStatus(root,proofIds);if(proof.state!=='running')break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(proof.state,'completed',proof.failureReason);assert.equal(proof.checkpointState,'committed');assert.notEqual(proof.candidateRevisionId,revision);
 assert.equal((await kernel.getCheckpointRecoveryProjection(root,workflow.id,recovered.id)).implementation.state,'not-required');
 assert.equal((await kernel.getCheckpointRecoveryProjection(root,workflow.id,recovered.id)).tester.state,'committed');
 const candidate=proof.candidateRevisionId;
 const mutation=plan.directWorkItems.find(i=>i.body.title==='mutation-required'),mutSelector={ownerKind:'workflow-work-item',workflowId:workflow.id,workItemId:mutation.id};
 const mutContract=await kernel.createWorkItemExecutionContract(root,workflow.id,mutation.id,{sourceMutation:'not-required',affectedPaths:[],proofIntent:['Caller cannot remove source authority']});assert.equal(mutContract.sourceMutation,'required');assert.deepEqual(mutContract.affectedPaths,['feature.txt']);
 await service.start(root,mutSelector,selection);const failed=await waitForSelectorState(service,root,mutSelector,'failed',300);assert.equal(failed.checkpoint.status,'blocked');assert.match(failed.failureReason,/No attributable source changes/);
 const mutImpl=(await state.getImplementationAttempts(projectId,mutation.id)).at(-1);assert.equal((await tester.getStatus(root,{workflowId:workflow.id,workItemId:mutation.id,implementationRecordId:mutImpl.id})).state,'unavailable');
 const mutRecovery=await kernel.getCheckpointRecoveryProjection(root,workflow.id,mutation.id);assert.equal(mutRecovery.implementation.state,'pending');assert.equal(mutRecovery.implementation.retryable,false);
 for(const title of ['unexpected','unreported']) {const item=plan.directWorkItems.find(i=>i.body.title===title),sel={ownerKind:'workflow-work-item',workflowId:workflow.id,workItemId:item.id};await service.start(root,sel,selection);const rejected=await waitForSelectorState(service,root,sel,'failed',300);assert.equal(rejected.checkpoint.status,'not-required');assert.equal((await state.getImplementationAttempts(projectId,item.id)).at(-1).body.outcome,'failed');assert.notEqual((await restart.getStatus(root,sel)).state,'completed');assert.equal(fs.readFileSync(path.join(captures.at(-1).workingDirectory,'feature.txt'),'utf8'),'baseline');}
 assert.equal((await store.listEntities(projectId,'SourceCheckpoint')).length,1);assert.equal((await store.listEntities(projectId,'SourceCheckpoint'))[0].body.checkpointKind,'tester');const binding=(await store.listEntities(projectId,'SourceBinding')).find(b=>b.body.workflowId===workflow.id);assert.equal(binding.body.currentRevisionId,candidate);
 assert.equal((await kernel.getCheckpointRecoveryProjection(root,workflow.id,recovered.id)).implementation.state,'not-required');
 // Binding drift must invalidate the otherwise successful historical no-mutation attempt.
 await state.updateSourceBinding(projectId,binding.id,{currentRevisionId:'f'.repeat(40)},binding.recordVersion);
 assert.equal((await kernel.getCheckpointRecoveryProjection(root,workflow.id,recovered.id)).implementation.state,'inspection-required');
 assert.equal((await tester.getStatus(root,{workflowId:workflow.id,workItemId:recovered.id,implementationRecordId:record.id})).state,'unavailable');
});
