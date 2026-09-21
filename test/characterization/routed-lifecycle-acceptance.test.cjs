const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("routed application checkpoints source and integrates only after real Plan completion, including Integration Repair", async (t) => {
  const metrics = require("../support/execution-metrics.cjs").measureExecution(t, "routed-lifecycle-acceptance");
  let stageStarted = performance.now();
  const stage = name => { t.diagnostic(JSON.stringify({ stage: name, durationMs: Math.round(performance.now() - stageStarted), ...metrics })); stageStarted = performance.now(); };
  const { seedApprovedRoutedWorkPlan } = require("../support/work-intake-fixtures.cjs");
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const { CodexImplementerExecutionService } = require("../../dist/main/workCardBuilding/codexImplementerExecutionService.js");
  const { createRoutedDevelopmentApplicationService } = require("../../dist/main/planExecution/routedDevelopmentApplicationService.js");
  const { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
  const { readCheckpointReceipt } = require("../../dist/main/planExecution/workItemCheckpointReceipt.js");
  const { readLifecycleCheckpointReceipt } = require("../../dist/main/planExecution/lifecycleEvidenceCheckpointReceipt.js");
  const { createWorkIntakeBranchService } = require("../../dist/main/workIntake/workIntakeBranchService.js");
  for (const conflicted of [true]) await t.test(conflicted ? "conflicted target" : "clean target", async (t) => {
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
    stage("routing-and-planning");
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
    stage("formal-contract");
    const started = await app.implement({ ...await request(), selection });
    assert.equal(started.state, "running", started.failureReason);
    let completed;
    for (let attempt = 0; attempt < 1000; attempt++) {
      completed = await worker.getStatus(root);
      if (completed.state !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(completed.state, "completed", completed.failureReason);
    stage("implementation-and-checkpoint");
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
    stage("validation-close-and-plan-acceptance");
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
    stage("integration-and-repair");
  });
});
