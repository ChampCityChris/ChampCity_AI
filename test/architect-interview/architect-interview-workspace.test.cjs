const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), test = require("node:test");
const {structuredArchitectFixture} = require("../support/structured-architect-fixture.cjs");
const approve = env => env.architect.review(env.root, env.workflow.id, env.candidate.review.cycleId, {expectedRecordVersion: env.candidate.review.recordVersion, outcome: "approved"});

test("Greenfield typed handoff uses evidence-first discovery and full adopted Project scope", async context => {
  const env = await structuredArchitectFixture(context, {save: false});
  assert.match(env.prepared.handoff, /repository evidence/); assert.match(env.prepared.handoff, /ground zero/); assert.match(env.prepared.handoff, /full adopted Project scope/);
  for (const key of Object.keys(env.output)) assert.ok(env.prepared.handoff.includes(key));
  assert.ok(env.prepared.handoff.includes(env.projectId)); assert.ok(env.prepared.handoff.includes(env.workflow.id));
});
test("Architect Interview persists proposed SQL candidates before disposition", async context => {
  const env = await structuredArchitectFixture(context);
  assert.equal(env.candidate.intakeRailStatus, "Completed");
  assert.equal(env.candidate.review.disposition.state, "none");
  assert.equal(env.candidate.review.sources.length, 11); assert.ok((await env.store.listEntities(env.projectId, "BoundedSolution")).length);
  assert.equal((await env.store.listEntities(env.projectId, "Decision")).filter(record => record.body.decisionType === "architect-review").length, 0);
});
test("Architect Interview refresh reuses exact SQL cycle without canonical prompt files", async context => {
  const env = await structuredArchitectFixture(context);
  const first = env.candidate.review;
  assert.equal((await env.architect.prepare(env.root, env.workflow.id)).review.cycleId, first.cycleId);
  assert.equal((await env.architect.get(env.root, env.workflow.id)).review.recordVersion, first.recordVersion);
  assert.equal(fs.existsSync(path.join(env.root, "planning/project/Project_Architect_Interview_Prompts")), false);
});
test("Architect Interview material revision invalidates the prior exact SQL review", async context => {
  const env = await structuredArchitectFixture(context); await approve(env);
  const revised = await env.architect.save(env.root, env.workflow.id, {...env.input, expectedCycleVersion: 1, output: {...env.output, projectUnderstanding: ["Revised understanding"]}});
  assert.equal(revised.review.recordVersion, 2); assert.equal(revised.review.disposition.state, "none"); assert.equal(revised.nextStageReady, false);
  await assert.rejects(env.architect.review(env.root, env.workflow.id, revised.review.cycleId, {expectedRecordVersion: 1, outcome: "approved"}));
});
test("malformed Interview transport cannot partially persist semantic records", async context => {
  const env = await structuredArchitectFixture(context, {save: false}), before = (await env.store.listEntities(env.projectId)).length;
  await assert.rejects(env.architect.save(env.root, env.workflow.id, {...env.input, output: {...env.output, scope: []}}));
  await assert.rejects(env.architect.save(env.root, env.workflow.id, {...env.input, output: {...env.output, extra: "unknown"}}));
  assert.equal((await env.store.listEntities(env.projectId)).length, before);
});
test("historical Interview prose remains byte-identical and never creates semantic authority", async context => {
  const env = await structuredArchitectFixture(context, {save: false});
  const historical = path.join(env.root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_old.md"); fs.mkdirSync(path.dirname(historical), {recursive: true}); fs.writeFileSync(historical, "# Historical approval fiction");
  const model = await env.architect.get(env.root, env.workflow.id); assert.equal(model.review, undefined);
  assert.equal(fs.readFileSync(historical, "utf8"), "# Historical approval fiction");
});
test("Architect Interview review projection includes full SQL semantic content", async context => {
  const env = await structuredArchitectFixture(context);
  for (const values of Object.values(env.output)) assert.ok(env.candidate.reviewDocument.bodyMarkdown.includes(values[0]));
  assert.match(env.candidate.reviewDocument.bodyMarkdown, /GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE/);
});
test("Architect Interview browser handoff manifest uses SQL identity and no Markdown input contract", async context => {
  const env = await structuredArchitectFixture(context, {save: false});
  const manifest = await require("../../dist/main/integrations/architectMcpHandoffService.js").buildArchitectHandoffManifest(env.root);
  assert.equal(manifest.state, "handoff-ready"); assert.equal(manifest.workflowId, env.workflow.id); assert.equal(manifest.intakeId, env.intake.intakeId);
  assert.equal(manifest.promptMarkdownPath, undefined); assert.equal(manifest.interviewMarkdownTargetPath, undefined);
});
test("Architect Interview proposed guidance does not mutate governing Project architecture", async context => {
  const env = await structuredArchitectFixture(context);
  const decisions = (await env.store.listEntities(env.projectId, "Decision")).filter(record => record.body.decisionType === "architect-review"); assert.equal(decisions.length, 0);
  const solution = (await env.store.listEntities(env.projectId, "BoundedSolution"))[0]; assert.equal(solution.body.solutionState, "proposed");
});
test("greenfield Architect Interview transport enforces bounded text and all fifteen dimensions", async context => {
  const env = await structuredArchitectFixture(context, {save: false});
  await assert.rejects(env.architect.save(env.root, env.workflow.id, {...env.input, output: {...env.output, constraints: ["x".repeat(4001)]}}));
  await assert.rejects(env.architect.save(env.root, env.workflow.id, {...env.input, output: {...env.output, assumptions: ["bad\u0000text"]}}));
});
test("Architect Interview regenerates deleted projection from SQL without losing approval", async context => {
  const env = await structuredArchitectFixture(context); await approve(env);
  fs.unlinkSync(path.join(env.root, env.candidate.review.relativePath));
  const model = await env.architect.get(env.root, env.workflow.id); assert.equal(model.review.disposition.state, "approved"); assert.equal(model.nextStageReady, true);
  assert.ok(fs.existsSync(path.join(env.root, model.review.relativePath)));
});
test("Architect Interview generated file edits cannot authorize or revise SQL review", async context => {
  const env = await structuredArchitectFixture(context);
  fs.writeFileSync(path.join(env.root, env.candidate.review.relativePath), "Approved alternative prose");
  const model = await env.architect.get(env.root, env.workflow.id); assert.equal(model.review.disposition.state, "none"); assert.equal(model.review.recordVersion, 1);
  assert.doesNotMatch(model.review.markdown, /Approved alternative prose/);
});
test("Architect Interview Intake revision invalidates current cycle eligibility", async context => {
  const env = await structuredArchitectFixture(context); await approve(env);
  await env.intakeService.saveProjectCreationIntake(env.root, env.workflow.id, {...env.intake.values, projectPurpose: "Materially revised purpose"}, env.intake.recordVersion);
  const model = await env.architect.get(env.root, env.workflow.id); assert.equal(model.ready, false); assert.equal(model.intakeRailStatus, "Awaiting Approval"); assert.equal(model.nextStageReady, false); assert.equal(model.review, undefined);
  await assert.rejects(env.architect.review(env.root, env.workflow.id, env.candidate.review.cycleId, {expectedRecordVersion: 1, outcome: "approved"}));
});

test("Planning bridge rejects extra Intake-source relationships and cross-Workflow semantic ownership", async context => {
  const env = await structuredArchitectFixture(context); await approve(env);
  const {readApprovedGreenfieldArchitectProjection} = require("../../dist/main/architectOutputs/structuredArchitectReadProjection.js");
  assert.ok(readApprovedGreenfieldArchitectProjection(env.root));
  const source = (await env.store.listEntities(env.projectId, "Evidence")).find(record => record.body.evidenceType === "architect-intake-source");
  const edge = (await env.store.listRelationships(env.projectId, "supports")).find(edge => !edge.endedAt && edge.fromEntityId === source.id);
  await assert.rejects(env.state.endRelationship(env.projectId, edge.id), /Immutable/);
  await env.state.createRelationship(env.projectId, source.id, "supports", env.workflow.id);
  assert.equal(readApprovedGreenfieldArchitectProjection(env.root), null);
  assert.equal((await env.architect.get(env.root, env.workflow.id)).nextStageReady, false);
  env.candidate = await env.architect.save(env.root, env.workflow.id, {...env.input, expectedCycleVersion: 1});
  await approve(env);
  assert.ok(readApprovedGreenfieldArchitectProjection(env.root));
  const {workflow} = await require("../../dist/main/workflow/workflowApplicationService.js").createWorkflowApplicationService().startDirectWorkflow(env.root, {workflowType: "feature-capability", title: "Foreign owner"});
  const finding = (await env.store.listEntities(env.projectId, "Finding")).find(record => env.candidate.review.sources.some(source => source.entityId === record.id));
  await assert.rejects(env.state.createRelationship(env.projectId, finding.id, "workflow_member", workflow.workflowId), /cross Workflows/);
  const records = await env.store.listEntities(env.projectId);
  const foreignEdge = require("../../dist/shared/projectState/relationshipRegistry.js").createRelationship({projectId: env.projectId, fromEntityId: finding.id, relationshipType: "workflow_member", toEntityId: workflow.workflowId, createdBy: {principalId: "legacy-fixture", principalType: "human", role: "Operator"}}, id => records.find(record => record.id === id));
  await env.store.transaction(env.projectId, unit => unit.saveRelationship(foreignEdge));
  assert.equal(readApprovedGreenfieldArchitectProjection(env.root), null);
  assert.equal((await env.architect.get(env.root, env.workflow.id)).nextStageReady, false);
});
