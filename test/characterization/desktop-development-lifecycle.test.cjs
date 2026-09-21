const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("routed application checkpoints source and integrates only after real Plan completion, including Integration Repair", async (t) => {
  const { seedApprovedRoutedWorkPlan } = require("../support/work-intake-fixtures.cjs");
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const { CodexImplementerExecutionService } = require("../../dist/main/workCardBuilding/codexImplementerExecutionService.js");
  const { createRoutedDevelopmentApplicationService } = require("../../dist/main/planExecution/routedDevelopmentApplicationService.js");
  const { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
  const { readCheckpointReceipt } = require("../../dist/main/planExecution/workItemCheckpointReceipt.js");
  const { readLifecycleCheckpointReceipt } = require("../../dist/main/planExecution/lifecycleEvidenceCheckpointReceipt.js");
  const { createWorkIntakeBranchService } = require("../../dist/main/workIntake/workIntakeBranchService.js");
  for (const conflicted of [false, true]) await t.test(conflicted ? "conflicted target" : "clean target", async (t) => {
    const fixture = await seedApprovedRoutedWorkPlan(t, { topology: "direct", topologyRationale: "One bounded source change", acceptanceCriteria: ["Product behavior accepted"],
      workItems: [{ workItemId: "WI01", title: "Preserve accepted source", purpose: "One bounded source change", dependsOn: [], acceptanceCriteria: ["Incoming behavior accepted"] }] }, "feature-change", {
      setupRepository(root) {
        fs.writeFileSync(path.join(root, ".gitignore"), "/planning/\n");
        fs.writeFileSync(path.join(root, "source.js"), "module.exports = ['base'];\n");
        fs.writeFileSync(path.join(root, "verify.cjs"), "const fs=require('node:fs');const values=require('./source.js');if(!values.includes('incoming')||(fs.existsSync('target.accepted')&&!values.includes('target')))process.exit(1);\n");
        fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true, scripts: { verify: "node verify.cjs" } }));
        fs.writeFileSync(path.join(root, ".champcity/integration-policy.json"), JSON.stringify({ schemaVersion: 1, checks: [{ checkId: "accepted-source", lane: "integration", runner: { kind: "npm-script", script: "verify", timeoutMs: 15000 } }], requiredIntegrationChecks: ["accepted-source"], repair: { allowedEditableRoots: ["source.js"], sources: [] } }));
      },
    });
    const { root, intake, git } = fixture;
    const runtime = runtimeFixture(); await runtime.ready;
    let reportPath;
    const worker = new CodexImplementerExecutionService(async () => ({ startThread(options) {
      assert.equal(options.workingDirectory, root);
      return { id: null, async runStreamed(prompt) {
        assert.match(prompt, /planning\/work-intake\/execution\//);
        return { events: (async function* () {
          fs.writeFileSync(path.join(root, "source.js"), "module.exports = ['incoming'];\n");
          yield { type: "item.completed", item: { type: "file_change", changes: [{ path: "source.js" }], status: "completed" } };
          const report = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, reportPath), "utf8"));
          fs.writeFileSync(path.join(root, reportPath), serializeCanonicalMarkdownDocument(report.metadata, "# Implementer Report\n\nImplemented incoming behavior. Source checks passed; review and validation remain separate.\n"));
          yield { type: "turn.completed" };
        })() };
      } };
    } }), undefined, undefined, undefined, undefined, runtime.manager);
    const app = createRoutedDevelopmentApplicationService(root, intake.intakeId, worker);
    const api = app.execution;
    const request = async () => ({ workItemId: "WI01", expectedFingerprint: (await api.query()).fingerprint });
    assert.equal((await app.integration.query()).status, "not-ready");
    await assert.rejects(app.integration.integrate(await request()), /complete Plan|Complete the current Plan/);
    const handoff = await api.begin(await request());
    const planning = await request(); const draft = await api.prepare(planning);
    const draftPath = path.join(root, draft.expectedDraftSlots[0].draftRelativePath);
    fs.mkdirSync(path.dirname(draftPath), { recursive: true }); fs.writeFileSync(draftPath, "# WI01\n\nPreserve incoming behavior and validate accepted source.\n");
    assert.equal((await api.getDraft(planning)).submission.state, "promoted");
    await api.reviewFormal({ ...await request(), expectedRevision: 1, disposition: "Approved" });
    reportPath = handoff.formalWorkCardMarkdownPath.replace("/Work_Cards/WI01_", "/Implementer_Reports/IMPLEMENTER_REPORT_WI01_");
    const started = await app.implement({ ...await request(), selection });
    assert.equal(started.state, "running", started.failureReason);
    let completed;
    for (let attempt = 0; attempt < 1000; attempt++) {
      completed = await worker.getStatus(root);
      if (completed.state !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(completed.state, "completed", completed.failureReason);
    assert.equal(completed.failureReason, null);
    assert.equal(completed.checkpoint?.status, "committed", completed.checkpoint?.message);
    const receipt = readCheckpointReceipt(git("show", "--no-patch", "--format=%B", completed.checkpoint.commit), completed.checkpoint.checkpointId);
    assert.equal(receipt.workItemId, "WI01"); assert.equal(receipt.implementationId, "WI01"); assert.equal(receipt.contractPath, handoff.formalWorkCardMarkdownPath);
    assert.equal((await api.query()).complete, false, "Source checkpoint does not approve or close work");
    assert.equal((await api.query()).workItems[0].stage, "review-validate");
    await api.validate({ ...await request(), decision: { decision: "ValidatePassed", operatorNotes: "Current source behavior checked" } });
    const close = await api.close(await request());
    assert.equal(close.checkpoint.status, "committed", close.checkpoint.message);
    const workItemReceipt = readLifecycleCheckpointReceipt(git("show", "--no-patch", "--format=%B", close.checkpoint.commit), close.checkpoint.checkpointId);
    assert.equal(workItemReceipt.beforeHead, completed.checkpoint.commit);
    assert.deepEqual(workItemReceipt.boundary, { kind: "work-item", routeDecisionId: fixture.binding.identity.routeDecisionId,
      planId: fixture.binding.identity.planId, planRevision: fixture.binding.planRevision, workItemId: "WI01", implementationId: "WI01" });
    assert.deepEqual(workItemReceipt.files.map((entry) => entry.artifactType).sort(), ["formal-work-card", "implementer-report", "validation-record", "work-card-close-return-record"]);
    assert.equal(git("status", "--porcelain"), "", "Work Item lifecycle boundary leaves the incoming checkout clean");
    const boundary = { kind: "plan" };
    const saved = await api.saveAcceptance({ boundary, expectedFingerprint: (await api.query()).fingerprint, closureDecision: "Close", rationale: "Complete product behavior proven", criteria: [{ criterion: "Product behavior accepted", status: "passed", evidencePaths: [close.recordPath] }] });
    const accepted = await api.reviewAcceptance({ boundary, expectedFingerprint: (await api.query()).fingerprint, expectedRevision: saved.artifactRevision, disposition: "Approved" });
    assert.equal(accepted.checkpoint.status, "committed", accepted.checkpoint.message);
    const planReceipt = readLifecycleCheckpointReceipt(git("show", "--no-patch", "--format=%B", accepted.checkpoint.commit), accepted.checkpoint.checkpointId);
    assert.deepEqual(planReceipt.boundary, { kind: "plan", routeDecisionId: fixture.binding.identity.routeDecisionId,
      planId: fixture.binding.identity.planId, planRevision: fixture.binding.planRevision });
    assert.deepEqual(planReceipt.files.map((entry) => entry.artifactType), ["plan-closeout"]);
    assert.equal(git("status", "--porcelain"), "", "Plan acceptance is durable before integration");
    assert.equal((await createWorkIntakeBranchService({ repositoryId: intake.branchBinding.repositoryId, repositoryRoot: root }).verify(intake.branchBinding)).currentHead,
      accepted.checkpoint.commit, "branch verification accepts the exact mixed source/lifecycle chain");
    const ready = await app.integration.query(); assert.equal(ready.status, "ready", ready.reasons.join("\n"));
    assert.deepEqual(ready.checkpointCommits, [completed.checkpoint.commit]);
    const planPath = path.join(root, fixture.binding.planPath); const planBytes = fs.readFileSync(planPath);
    fs.appendFileSync(planPath, "\nChanged accepted intent\n");
    assert.equal((await app.integration.query()).status, "not-ready");
    await assert.rejects(app.integration.integrate({ expectedFingerprint: ready.planFingerprint }), /stale|changed|superseded/i);
    fs.writeFileSync(planPath, planBytes);
    if (conflicted) {
      git("switch", "main"); fs.writeFileSync(path.join(root, "source.js"), "module.exports = ['target'];\n"); fs.writeFileSync(path.join(root, "target.accepted"), "accepted\n");
      git("add", "--", "source.js", "target.accepted"); git("commit", "-m", "independently accepted target"); git("switch", intake.branchBinding.workBranch);
    }
    const targetBefore = git("rev-parse", "main");
    let integrated = await app.integration.integrate({ expectedFingerprint: ready.planFingerprint });
    if (conflicted) {
      assert.equal(integrated.status, "repair-required", integrated.reasons.join("\n"));
      assert.equal(git("rev-parse", "main"), targetBefore);
      const request = { expectedFingerprint: integrated.planFingerprint, candidateId: integrated.candidate.candidateId };
      const repair = await app.integration.prepareRepair(request);
      assert.deepEqual(repair.policy.editablePaths, ["source.js"]);
      await assert.rejects(app.integration.applyRepair({ ...request, repairId: repair.repairId, patches: [{ path: "unapproved.js", beforeSha256: "deleted", content: "invalid" }] }), /source scope/);
      await app.integration.applyRepair({ ...request, repairId: repair.repairId, patches: [{ path: "source.js", beforeSha256: repair.snapshot.editable["source.js"], content: "module.exports = ['incoming', 'target'];\n" }] });
      integrated = await app.integration.completeRepair({ ...request, repairId: repair.repairId });
    }
    assert.equal(integrated.status, "integration-complete", integrated.reasons.join("\n"));
    assert.equal(git("rev-parse", "main"), integrated.candidate.candidateCommit);
    assert.equal(git("branch", "--show-current"), intake.branchBinding.workBranch);
    assert.equal(git("status", "--porcelain"), "");
    assert.equal((await createRoutedDevelopmentApplicationService(root, intake.intakeId, worker).integration.query()).status, "integration-complete", "Receipt-backed state survives service recreation");
    assert.equal(fs.existsSync(path.join(root, "planning/phases")), false);
  });
});

test("routed direct Work Item preserves sequential Repairs and completes only after durable close", async (t) => {
  const run = await routedLifecycleFixture(t, false);
  const { api, request, read, write, root, intake, binding } = run;
  let validation = await api.validate({ ...await request(), decision: { decision: "RequestRepair", operatorNotes: "Export omitted a row", repairDefectText: "Preserve all export rows" } });
  assert.equal((await api.query()).workItems[0].stage, "repair");
  for (let generation = 1; generation <= 2; generation++) {
    const repairId = `WI01-REPAIR0${generation}`;
    const repair = await api.createRepair({ ...await request(), defect: "Preserve all export rows" });
    assert.equal(repair.repairId, repairId);
    const handoff = read(repair.handoffMarkdownPath);
    assert.equal(handoff.metadata.identity.phaseId, undefined);
    assert.equal(handoff.metadata.workflowData.originalParentWorkCardId, "WI01");
    assert.equal(handoff.metadata.workflowData.immediateParentWorkCardId, generation === 1 ? "WI01" : "WI01-REPAIR01");
    assert.equal(handoff.metadata.sourceRevisions[0].path, validation.markdownPath);
    const planning = await request();
    const draft = await api.prepareRepair(planning);
    run.draft(draft, `# ${repairId}\n\nRestore every export row and prove the bounded correction. Return to work-card-validation.\n`);
    const promoted = await api.getRepairDraft(planning);
    assert.equal(promoted.submission.state, "promoted", promoted.promotionError);
    await api.reviewRepair({ ...await request(), repairId, expectedRevision: 1, disposition: "Approved" });
    const reportPath = repair.repairMarkdownPath.replace(`/Work_Cards/${repairId}.md`, `/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}.md`);
    const report = read(reportPath);
    assert.equal(report.metadata.identity.parentWorkCardId, "WI01");
    assert.equal(report.metadata.identity.repairId, repairId);
    write(reportPath, report.metadata, "# Implementer Report\n\nCorrected row preservation; synthetic export checks passed.\n");
    validation = await api.validate({ ...await request(), decision: generation === 1
      ? { decision: "RequestRepair", operatorNotes: "One edge case remains", repairDefectText: "Preserve all export rows" }
      : { decision: "ValidatePassed", operatorNotes: "All export rows now preserved" } });
  }
  const beforeClose = await api.query();
  assert.equal(beforeClose.workItems[0].stage, "close");
  assert.equal(beforeClose.workItems[0].complete, false);
  assert.equal(beforeClose.workItems[1].eligible, false);
  const originalValidation = read(validation.markdownPath);
  write(validation.markdownPath, { ...originalValidation.metadata, sourceRevisions: originalValidation.metadata.sourceRevisions.map((source, index) => ({ ...source, revision: index === 1 ? 99 : source.revision })) }, originalValidation.bodyMarkdown);
  const stale = await api.query();
  assert.equal(stale.workItems[0].complete, false);
  await assert.rejects(api.close({ workItemId: "WI01", expectedFingerprint: stale.fingerprint }), /Approved completion/);
  write(validation.markdownPath, originalValidation.metadata, originalValidation.bodyMarkdown);
  const closed = await api.close(await request());
  assert.equal(closed.checkpoint.status, "committed", closed.checkpoint.message);
  const closedHead = run.git("rev-parse", "HEAD");
  assert.equal(closedHead, closed.checkpoint.commit);
  assert.equal(run.git("status", "--porcelain"), "", "Work Item 1 lifecycle evidence is clean before Work Item 2");
  const complete = await api.query();
  assert.equal(complete.workItems[0].stage, "complete");
  assert.equal(complete.workItems[1].eligible, true);
  assert.equal(complete.complete, false, "Plan acceptance belongs to REPAIR05");
  assert.equal(read(closed.recordPath).metadata.identity.phaseId, undefined);
  assert.equal(read(closed.recordPath).metadata.workflowData.returnTarget, "routed-work-item-selection");
  assert.equal((await api.close({ workItemId: "WI01", expectedFingerprint: complete.fingerprint })).reusedExisting, true);
  const { loadRoutedDevelopmentExecution } = require("../../dist/main/planExecution/routedDevelopmentExecutionService.js");
  const evidence = (await loadRoutedDevelopmentExecution(root, intake.intakeId)).input.workItems[0];
  assert.deepEqual(evidence.criteria.map((criterion) => criterion.status), ["passed"]);
  assert.equal(evidence.criteria[0].evidencePaths.includes(closed.recordPath), true);
  await api.begin({ workItemId: "WI02", expectedFingerprint: (await api.query()).fingerprint });
  assert.equal(await api.getDraft({ workItemId: "WI02", expectedFingerprint: (await api.query()).fingerprint }), undefined, "a successor cannot reuse the previous Work Item's promoted draft status");
  const reportPath = originalValidation.metadata.sourceRevisions[1].path;
  const reportBytes = fs.readFileSync(path.join(root, reportPath), "utf8");
  fs.appendFileSync(path.join(root, reportPath), "\nSame-revision evidence change.\n");
  assert.equal((await api.query()).workItems[0].complete, false, "accepted validation cannot cover changed report bytes");
  fs.writeFileSync(path.join(root, reportPath), reportBytes);
  fs.appendFileSync(path.join(root, run.reportPath), "\nChanged earlier failed-validation evidence.\n");
  assert.equal((await api.query()).status, "blocked", "sequential Repair completion requires its earlier validation basis to remain current");
  assert.equal(run.git("rev-parse", "HEAD"), closedHead, "Work Item 2 begins from Work Item 1's exact lifecycle checkpoint head");
  assert.equal(fs.existsSync(path.join(root, "planning/phases")), false);
  assert.equal(read(binding.relativePath).metadata.identity.planId, binding.identity.planId);
});

test("routed phased Work Item repairs report review and closes within its genuine Phase", async (t) => {
  const run = await routedLifecycleFixture(t, true);
  const { api, request, read, write, git } = run;
  await api.reviewReport({ ...await request(), expectedRevision: 1, disposition: "RevisionRequested", notes: "Add the missing export evidence" });
  const repair = await api.createRepair({ ...await request(), defect: "Add the missing export evidence" });
  assert.match(repair.repairMarkdownPath, /\/phases\/P1\/Work_Cards\/WI01-REPAIR01.md$/);
  assert.equal(read(repair.handoffMarkdownPath).metadata.workflowData.returnTarget, "work-card-building-review");
  const planning = await request();
  const draft = await api.prepareRepair(planning);
  run.draft(draft, "# WI01-REPAIR01\n\nProvide the export evidence. Return to work-card-building-review.\n");
  assert.equal((await api.getRepairDraft(planning)).submission.state, "promoted");
  await api.reviewRepair({ ...await request(), repairId: repair.repairId, expectedRevision: 1, disposition: "Approved" });
  const reportPath = repair.repairMarkdownPath.replace("/Work_Cards/WI01-REPAIR01.md", "/Implementer_Reports/IMPLEMENTER_REPORT_WI01-REPAIR01.md");
  const report = read(reportPath);
  write(reportPath, report.metadata, "# Implementer Report\n\nExport evidence now shows all expected rows.\n");
  const advisory = await api.advisoryReview(await request());
  assert.match(advisory.instruction, /Phase ID: P1/);
  assert.match(advisory.instruction, /Approved Repair Work Card Contract/);
  assert.match(advisory.instruction, /Operator is the final authority/);
  const validation = await api.validate({ ...await request(), decision: { decision: "ValidatePassed", operatorNotes: "Evidence reviewed" } });
  assert.equal(read(validation.markdownPath).metadata.identity.phaseId, "P1");
  const close = await api.close(await request());
  assert.equal(close.checkpoint.status, "committed", close.checkpoint.message);
  assert.match(close.recordPath, /\/phases\/P1\/Close_Return_Records\//);
  let projected = await api.query();
  assert.equal(projected.workItems[0].complete, true);
  assert.equal(projected.workItems[1].eligible, false, "Phase acceptance is not supplied by Work Item close");
  assert.equal(projected.phases[0].complete, false);
  assert.equal(projected.complete, false);
  const boundary = { kind: "phase", phaseId: "P1" };
  const saved = await api.saveAcceptance({ boundary, expectedFingerprint: projected.fingerprint, closureDecision: "Close", rationale: "P1 evidence accepted",
    criteria: [{ criterion: "P1 milestone accepted", status: "passed", evidencePaths: [close.recordPath] }] });
  const accepted = await api.reviewAcceptance({ boundary, expectedFingerprint: (await api.query()).fingerprint, expectedRevision: saved.artifactRevision, disposition: "Approved" });
  assert.equal(accepted.checkpoint.status, "committed", accepted.checkpoint.message);
  assert.equal(git("status", "--porcelain"), "", "Phase acceptance leaves a clean boundary for the next Phase");
  projected = await api.query();
  assert.equal(projected.phases[0].complete, true);
  assert.equal(projected.workItems[1].eligible, true);
  await api.begin({ workItemId: "WI02", expectedFingerprint: projected.fingerprint });
  assert.equal(fs.existsSync(path.join(run.root, "planning/phases")), false);
});

async function routedLifecycleFixture(t, phased) {
  const { seedApprovedRoutedWorkPlan } = require("../support/work-intake-fixtures.cjs");
  const { createRoutedDevelopmentExecutionService } = require("../../dist/main/planExecution/routedDevelopmentExecutionService.js");
  const { parseCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
  const { writeCanonicalMarkdownDocument } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  const item = (id, deps, phaseId) => ({ workItemId: id, title: `Deliver ${id}`, purpose: "Bounded export", dependsOn: deps, acceptanceCriteria: [`${id} export accepted`], ...(phaseId ? { phaseId } : {}) });
  const phase = (id, deps) => ({ phaseId: id, title: id, purpose: "Distinct milestone", dependsOn: deps, acceptanceCriteria: [`${id} milestone accepted`] });
  const structure = { topology: phased ? "phased" : "direct", topologyRationale: phased ? "Distinct milestone gates" : "One bounded delivery", acceptanceCriteria: ["Export accepted"], workItems: [item("WI01", [], phased ? "P1" : undefined), item("WI02", ["WI01"], phased ? "P2" : undefined)], ...(phased ? { phases: [phase("P1", []), phase("P2", ["P1"])] } : {}) };
  const fixture = await seedApprovedRoutedWorkPlan(t, structure, "feature-change", {
    setupRepository(root) { fs.writeFileSync(path.join(root, ".gitignore"), "/planning/\n"); },
  });
  const { root, intake } = fixture;
  const api = createRoutedDevelopmentExecutionService(root, intake.intakeId);
  const request = async () => ({ workItemId: "WI01", expectedFingerprint: (await api.query()).fingerprint });
  const read = (relative) => parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relative), "utf8"));
  const write = (relativePath, metadata, bodyMarkdown) => writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath, metadata, bodyMarkdown });
  const draft = (submission, body) => { const target = path.join(root, submission.expectedDraftSlots[0].draftRelativePath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body); };
  const handoff = await api.begin(await request());
  const planning = await request();
  const submission = await api.prepare(planning);
  draft(submission, "# WI01\n\nImplement the bounded export and prove row preservation.\n");
  assert.equal((await api.getDraft(planning)).submission.state, "promoted");
  await api.reviewFormal({ ...await request(), expectedRevision: 1, disposition: "Approved" });
  const reportPath = handoff.formalWorkCardMarkdownPath.replace("/Work_Cards/WI01_", "/Implementer_Reports/IMPLEMENTER_REPORT_WI01_");
  write(reportPath, read(reportPath).metadata, "# Implementer Report\n\nImplemented the export; synthetic row checks recorded.\n");
  return { ...fixture, api, request, read, write, draft, reportPath };
}

const {
  resolveWorkCardLoopState,
} = require("../../dist/main/workCardLoop/workCardLoopStateService.js");
const {
  resolveEffectiveWorkCardCompletion,
} = require("../../dist/main/workCardLoop/effectiveWorkCardCompletion.js");
const {
  consumeWorkCardCloseReturn,
  resolveWorkCardCloseReturnConsumption,
} = require("../../dist/main/workCardLoop/workCardCloseReturnLifecycle.js");
const {
  beginWorkCardPlanningForCandidate,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  applyOperatorValidationDecision,
  getWorkCardCloseProjection,
} = require("../../dist/main/workCardValidation/workCardValidationService.js");
const {
  createRepairWorkCard,
} = require("../../dist/main/workCardRepair/workCardRepairService.js");
const {
  listPlanningDocuments,
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

/*
 * Characterization boundary:
 * These tests intentionally freeze current Desktop Development behavior at the
 * service/projection boundary. Extraction may change implementation structure,
 * but changing these outcomes requires an explicit product decision.
 */

test("Desktop Work Card lifecycle remains Map -> Planning -> Build -> Review/Validation -> Close -> complete", () => {
  const root = preparedDevelopmentWorkspace("champcity-characterization-work-card-");

  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "map-ready",
    workspaceId: "phase-work-card-selection",
    loopStep: "Map",
  });

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "active",
    workspaceId: "work-card-planning",
    loopStep: "Planning",
    workCardId: "WC01",
  });

  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "active",
    workspaceId: "work-card-building-review",
    loopStep: "Build",
    workCardId: "WC01",
  });

  const reportPath = writeReadyImplementerReport(root, "phase-01", "WC01");
  const reportBeforeValidation = fs.readFileSync(path.join(root, reportPath), "utf8");
  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "active",
    workspaceId: "work-card-report-review",
    loopStep: "ReviewAndValidation",
    workCardId: "WC01",
  });

  const validation = applyOperatorValidationDecision(root, "phase-01", "WC01", {
    decision: "ValidatePassed",
    operatorNotes: "Characterization: current Desktop behavior passed.",
    advisorySummary: "Advisory review is evidence; the Operator is disposition loopState.",
  });
  assert.equal(validation.status, "Approved");
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, true);

  const report = listPlanningDocuments(root).find((document) => document.markdownPath === reportPath);
  assert.equal(report.effectiveDisposition, "Pending", "Operator validation must not rewrite Implementer Report disposition");
  assert.equal(fs.readFileSync(path.join(root, reportPath), "utf8"), reportBeforeValidation);
  const validationRecord = listPlanningDocuments(root).find((document) => document.markdownPath === validation.markdownPath);
  assert.equal(validationRecord.metadata.artifactType, "validation-record");
  assert.ok(validationRecord.metadata.sourceRevisions.some((source) => source.path === reportPath && source.revision === 1));

  const closeState = resolveWorkCardLoopState(root, "phase-01");
  assertState(closeState, {
    status: "active",
    workspaceId: "work-card-close",
    loopStep: "Close",
    workCardId: "WC01",
  });
  assert.ok(closeState.sourceEvidence.includes(validation.markdownPath));

  const completion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(completion.validationRecord.markdownPath, validation.markdownPath);
  const pendingReturn = resolveWorkCardCloseReturnConsumption(root, completion);
  assert.equal(pendingReturn.consumed, false, "passed validation still requires explicit Close Return");
  assert.equal(fs.existsSync(path.join(root, pendingReturn.recordPath)), false);
  const consumed = consumeWorkCardCloseReturn(root, completion);
  assert.equal(consumed.reusedExisting, false);
  assert.equal(consumeWorkCardCloseReturn(root, completion).reusedExisting, true, "close-return consumption remains idempotent");

  const completed = resolveWorkCardLoopState(root, "phase-01");
  assertState(completed, {
    status: "all-complete",
    workspaceId: "phase-work-card-selection",
    loopStep: "Map",
  });
  assert.equal(completed.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Complete");
});

test("Desktop Repair lifecycle preserves parent identity and Repair validation is effective close record", () => {
  const root = preparedDevelopmentWorkspace("champcity-characterization-repair-");
  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReadyImplementerReport(root, "phase-01", "WC01");

  const failedValidation = applyOperatorValidationDecision(root, "phase-01", "WC01", {
    decision: "RequestRepair",
    operatorNotes: "Characterization: bounded defect remains.",
    repairDefectText: "Preserve the current parent completion and close-record semantics.",
  });
  assert.equal(failedValidation.status, "RevisionRequested");
  const failedCompletion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(failedCompletion.complete, false);
  assert.throws(() => consumeWorkCardCloseReturn(root, failedCompletion), /Approved completion evidence/);

  let loopState = resolveWorkCardLoopState(root, "phase-01");
  assertState(loopState, {
    status: "active",
    workspaceId: "work-card-repair",
    loopStep: "Repair",
    workCardId: "WC01",
  });

  const repair = createRepairWorkCard(
    root,
    "phase-01",
    "WC01",
    failedValidation.markdownPath,
    "postValidationRecord",
    "Preserve the current parent completion and close-record semantics.",
  );
  assert.equal(repair.repairId, "WC01-REPAIR01");
  assert.deepEqual(
    createRepairWorkCard(
      root,
      "phase-01",
      "WC01",
      failedValidation.markdownPath,
      "postValidationRecord",
      "Preserve the current parent completion and close-record semantics.",
    ),
    repair,
    "the same Repair evidence must not allocate a second Repair identity",
  );

  writeApprovedRepairContract(root, repair, failedValidation.markdownPath);
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assertState(loopState, {
    status: "active",
    workspaceId: "work-card-building-review",
    loopStep: "Build",
    workCardId: "WC01-REPAIR01",
  });
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");

  const repairReportPath = writeReadyRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");
  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "active",
    workspaceId: "work-card-report-review",
    loopStep: "ReviewAndValidation",
    workCardId: "WC01-REPAIR01",
  });

  const repairValidation = applyOperatorValidationDecision(root, "phase-01", "WC01-REPAIR01", {
    decision: "ValidatePassed",
    operatorNotes: "Characterization: Repair passed.",
  });
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assertState(loopState, {
    status: "active",
    workspaceId: "work-card-close",
    loopStep: "Close",
    workCardId: "WC01",
  });
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");
  assert.equal(loopState.formalWorkCardPath, repair.repairMarkdownPath);
  assert.equal(loopState.implementerReportPath, repairReportPath);
  assert.ok(loopState.sourceEvidence.includes(repairValidation.markdownPath));
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, true);

  const completion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(completion.parentWorkCardId, "WC01");
  assert.equal(completion.executionWorkCardId, repair.repairId);
  assert.equal(completion.validationRecord.markdownPath, repairValidation.markdownPath);
  assert.equal(resolveWorkCardCloseReturnConsumption(root, completion).consumed, false);
  const consumed = consumeWorkCardCloseReturn(root, completion);
  const closeReturn = listPlanningDocuments(root).find((document) => document.markdownPath === consumed.recordPath);
  assert.equal(closeReturn.metadata.artifactType, "work-card-close-return-record");
  assert.equal(closeReturn.metadata.canonical.identity.parentWorkCardId, "WC01");
  assert.equal(closeReturn.metadata.canonical.identity.executionKind, "repair");
  assert.equal(closeReturn.metadata.canonical.identity.executionWorkCardId, "WC01-REPAIR01");
  assert.equal(closeReturn.metadata.canonical.identity.repairId, "WC01-REPAIR01");
  assert.equal(closeReturn.metadata.sourceRevisions[0].path, repairValidation.markdownPath);
  assert.equal(consumeWorkCardCloseReturn(root, completion).reusedExisting, true);

  const completed = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(completed.status, "all-complete");
  assert.equal(completed.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Complete");
});

test("Desktop completion and Close Return reject approval for an older Implementer Report revision", () => {
  const root = preparedDevelopmentWorkspace("champcity-characterization-stale-completion-");
  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReadyImplementerReport(root, "phase-01", "WC01");
  const awaiting = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(awaiting.state, "awaiting-validation");
  assert.throws(() => consumeWorkCardCloseReturn(root, awaiting), /Approved completion evidence/);

  const validation = applyOperatorValidationDecision(root, "phase-01", "WC01", {
    decision: "ValidatePassed",
    operatorNotes: "Only report revision 1 has been validated.",
  });
  const consumed = consumeWorkCardCloseReturn(root, resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01"));
  const closeBytes = fs.readFileSync(path.join(root, consumed.recordPath), "utf8");
  const validationBytes = fs.readFileSync(path.join(root, validation.markdownPath), "utf8");

  writeReadyImplementerReport(root, "phase-01", "WC01", 2);
  const current = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(current.state, "awaiting-validation");
  assert.equal(current.complete, false);
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, false);
  assert.equal(resolveWorkCardCloseReturnConsumption(root, current).consumed, false);
  assert.throws(() => consumeWorkCardCloseReturn(root, current), /Approved completion evidence/);
  assert.equal(fs.readFileSync(path.join(root, consumed.recordPath), "utf8"), closeBytes);
  assert.equal(fs.readFileSync(path.join(root, validation.markdownPath), "utf8"), validationBytes);
});

test("Desktop validation is Operator-owned, final, and cannot validate a reserved Implementer Report scaffold", () => {
  const reservedRoot = preparedDevelopmentWorkspace("champcity-characterization-validation-reserved-");
  beginWorkCardPlanningForCandidate(reservedRoot, "phase-01", "WC01");
  writeDoc(reservedRoot, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReservedImplementerReport(reservedRoot, "phase-01", "WC01");

  assert.throws(
    () => applyOperatorValidationDecision(reservedRoot, "phase-01", "WC01", {
      decision: "ValidatePassed",
      operatorNotes: "A reserved scaffold is not implementation evidence.",
    }),
    /reserved scaffold/,
  );

  const decidedRoot = preparedDevelopmentWorkspace("champcity-characterization-validation-final-");
  beginWorkCardPlanningForCandidate(decidedRoot, "phase-01", "WC01");
  writeDoc(decidedRoot, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReadyImplementerReport(decidedRoot, "phase-01", "WC01");
  const decision = applyOperatorValidationDecision(decidedRoot, "phase-01", "WC01", {
    decision: "ValidatePassed",
    operatorNotes: "Operator establishes final validation loopState.",
  });
  assert.equal(decision.status, "Approved");
  assert.throws(
    () => applyOperatorValidationDecision(decidedRoot, "phase-01", "WC01", {
      decision: "RequestRepair",
      operatorNotes: "A second final decision must not replace the first.",
      repairDefectText: "Should never be written.",
    }),
    /Validation decision already exists/,
  );
});

function preparedDevelopmentWorkspace(prefix) {
  const root = tempWorkspace(prefix);
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  return root;
}

function assertState(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(actual[key], value, `${key} should remain ${value}`);
  }
  if (actual.status !== "conflict") {
    assert.equal(actual.execution.topology, "direct", "the Work Card sequence runs through generic direct progression within its owning scope");
    assert.equal(actual.execution.phases.length, 0, "no artificial Phase is created inside a direct sequence");
    if (actual.status === "all-complete") assert.equal(actual.execution.workItemsComplete, true);
    else if (actual.status === "active") {
      const id = actual.parentWorkCardId ?? actual.candidateId ?? actual.workCardId;
      const item = actual.execution.workItems.find((entry) => entry.candidate.workItemId === id);
      assert.equal(actual.execution.nextWorkItemId, id);
      assert.equal(item.stage, { Planning: "implement", Build: "implement", ReviewAndValidation: "review-validate", Repair: "repair", Close: "close" }[actual.loopStep]);
      assert.equal(item.complete, false);
    }
  }
}

function writeReadyImplementerReport(root, phaseId, workCardId, artifactRevision = 1) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_first_work_card.md`, "implementer-report", "Pending", {
    artifactRevision,
    identity: { phaseId, workCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${workCardId}_first_work_card.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/currentWorkflow/currentWorkflowService.ts"],
      implementationSummary: "Characterization fixture represents a completed implementation.",
      validationResults: ["characterization implementation checks passed"],
      acceptanceEvidence: ["current Desktop lifecycle behavior is observable"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${workCardId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Implementation Summary",
      "Characterization fixture represents a completed implementation.",
      "## Validation Performed",
      "characterization implementation checks passed",
      "",
    ].join("\n"),
  });
}

function writeReservedImplementerReport(root, phaseId, workCardId) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_first_work_card.md`, "implementer-report", "Pending", {
    identity: { phaseId, workCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${workCardId}_first_work_card.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Pending Implementer verification.",
      filesChanged: [],
      implementationSummary: "",
      validationResults: [],
      acceptanceEvidence: [],
    },
    bodyMarkdown: [
      `# Implementer Report - ${workCardId}`,
      "",
      "Status: Pending Implementer completion.",
      "",
      "## Repository Verification",
      "## Implementation Summary",
      "## Files Modified",
      "## Validation Performed",
      "",
    ].join("\n"),
  });
}

function writeApprovedRepairContract(root, repair, validationPath) {
  writeDoc(root, repair.repairMarkdownPath, "repair-work-card", "Approved", {
    identity: {
      phaseId: "phase-01",
      workCardId: repair.repairId,
      repairId: repair.repairId,
      parentWorkCardId: "WC01",
    },
    sourceRevisions: [
      { path: validationPath, revision: 1 },
      { path: repair.handoffMarkdownPath, revision: 1 },
    ],
    workflowData: {
      repairId: repair.repairId,
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "postValidationRecord",
      evidencePath: validationPath,
      boundedDefect: "Preserve the current parent completion and close-record semantics.",
      returnTarget: "work-card-validation",
    },
  });
}

function writeReadyRepairImplementerReport(root, phaseId, parentWorkCardId, repairId) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}.md`, "implementer-report", "Pending", {
    identity: { phaseId, workCardId: repairId, repairId, parentWorkCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${repairId}.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardLoop/workCardLoopStateService.ts"],
      implementationSummary: "Implemented the approved Repair contract.",
      validationResults: ["repair characterization checks passed"],
      acceptanceEvidence: ["Repair retains parent identity through close"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${repairId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented the approved Repair contract.",
      "## Validation Performed",
      "repair characterization checks passed",
      "",
    ].join("\n"),
  });
}
