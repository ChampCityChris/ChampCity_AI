const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createEngineeringWorkflowStateFacade } = require("../../dist/main/projectState/engineeringWorkflowStateFacade.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-engineering-workflow-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, store, state: createProjectStateService(store, operator), facade: createEngineeringWorkflowStateFacade(store, operator) };
}
const implementation = { summary: "Implemented", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" };

test("Development phases, routed decomposition, review, repair and close derive from structured state", async context => {
  const { root, state, facade } = fixture(context);
  const project = await state.createRecord(null, "Project", { name: "Synthetic", description: "Development" });
  const workflow = await facade.startDevelopment(project.id, project.id);
  assert.deepEqual(workflow.body, { workflowType: "feature-capability", title: "Feature / Capability", currentWorkspace: "development", workflowState: "active" });
  const phase = await facade.addPhase(project.id, workflow.id, { title: "Delivery", objective: "Complete", sequence: 1 });
  const parent = await facade.addWorkItem(project.id, { workItemKind: "feature", title: "Parent", objective: "Build" }, phase.id);
  const [child] = await facade.decomposeWorkItem(project.id, parent.id, [{ workItemKind: "feature", title: "Child", objective: "Build child" }]);
  const criterion = await facade.defineCriterion(project.id, child.id, { statement: "Child works", criticality: "required",
    verificationIntent: "Inspect result", validationPolicy: "deterministic" });
  await facade.recordImplementation(project.id, child.id, implementation);
  assert.ok((await facade.workItemStatus(project.id, child.id)).eligibility.blockers.some(value => value.startsWith("criterion:")));
  await facade.recordValidation(project.id, criterion.id, { validationType: "test", method: "synthetic", outcome: "pass", summary: "Passed" });
  await facade.completeWorkItem(project.id, child.id, 1);
  const repair = await facade.addRepair(project.id, parent.id, { kind: "repair", title: "Repair", objective: "Correct" });
  await facade.recordImplementation(project.id, repair.id, implementation);
  await facade.completeWorkItem(project.id, repair.id, 1);
  await facade.recordImplementation(project.id, parent.id, implementation);
  assert.equal((await facade.workItemStatus(project.id, parent.id)).eligibility.eligible, true);
  await facade.completeWorkItem(project.id, parent.id, 1);
  assert.equal((await facade.phaseStatus(project.id, phase.id)).eligibility.eligible, true);
  await facade.completePhase(project.id, phase.id, 1);
  const current = await facade.getCurrent(project.id);
  assert.equal(current.phases.find(item => item.id === phase.id).state, "closed");
  assert.equal(current.workItems.find(item => item.id === child.id).state, "closed");
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
});

test("Issue analysis, Fix, validation and Tester obligation use typed records without Markdown", async context => {
  const { root, state, facade } = fixture(context);
  const project = await state.createRecord(null, "Project", { name: "Synthetic", description: "Issue" });
  const issue = await facade.recordIssueAnalysis(project.id, {
    finding: { title: "Failure", statement: "Feature fails", category: "defect", impact: "Blocked user" },
    rootCause: { title: "Cause", statement: "State missing", rationale: "Observed" },
    solution: { title: "Repair state", objective: "Restore behavior", scopeIn: ["Fix"], scopeOut: [], constraints: [], assumptions: [], risks: [], solutionState: "proposed" },
  });
  const fix = await facade.addIssueFix(project.id, issue.solution.id, { title: "Fix", objective: "Restore behavior" });
  const criterion = await facade.defineCriterion(project.id, fix.id, { statement: "Fix verified", criticality: "required",
    verificationIntent: "Run test", validationPolicy: "deterministic" });
  const attempt = await facade.recordImplementation(project.id, fix.id, implementation);
  await facade.recordValidation(project.id, criterion.id, { validationType: "test", method: "synthetic", outcome: "pass", summary: "Passed" });
  await facade.completeWorkItem(project.id, fix.id, 1);
  const obligation = await facade.createRegressionObligation(project.id, { title: "Protect fix", statement: "Regression remains covered",
    capabilityId: "issue-resolution", riskCategory: "functional", sourceWorkItemId: fix.id });
  await facade.assessRegressionObligation(project.id, obligation.id, { status: "PRESERVE", summary: "Current coverage", method: "analysis" });
  await facade.recordRegressionProof(project.id, attempt.id, { description: "Synthetic receipt", mediaType: "application/json",
    payloadRef: "evidence:receipt", digest: "a".repeat(64), sourceBaselineRef: "source-revision-a" });
  const issueView = await facade.issueStatus(project.id, issue.finding.id);
  assert.equal(issueView.finding.entityType, "Finding");
  assert.equal(issueView.related.some(record => record.id === issue.rootCause.id), true);
  const obligationView = await facade.regressionStatus(project.id, obligation.id);
  assert.equal(obligationView.assessments.length, 1);
  assert.equal(obligationView.implementationProof.length, 1);
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
});
