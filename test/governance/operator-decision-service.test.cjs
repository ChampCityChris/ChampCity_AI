const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const { ArtifactPairService } = require("../../dist/main/artifacts/index.js");
const { GovernanceApprovalService } = require("../../dist/main/artifacts/governanceApprovalService.js");

const projectId = "champcity-ai";
const fixedTime = "2026-07-20T16:00:00.000Z";

test("GovernanceApprovalService persists exact decisions, validates bundles, and keeps pending lookup non-mutating", async () => {
  const repo = await createTempRepo();
  try {
    const artifactPairs = pairService(repo);
    const service = approvalService(repo, artifactPairs);

    const workCard = await commitWorkCard(artifactPairs, {
      workCardId: "WC01",
      requiresImplementer: true,
      extraData: { codeChangesAuthorized: false },
    });
    const queue = await service.listQueue();
    assert.equal(queue.ok, true, queue.errorMessages?.join("\n"));
    const workItem = queue.items.find((item) => item.targetArtifactId === workCard.artifact.artifactId);
    assert.ok(workItem);
    assert.equal(workItem.implementationAuthorizationAvailable, true);
    assert.equal(workItem.decisionWorkspaceScreenId, "operator-work-card-approval");
    assert.equal(workItem.decisionWorkspaceLabel, "Work Card Approval");

    const registryBeforeLookup = await artifactPairs.loadRegistry();
    const countBeforeLookup = fileCount(repo);
    const pending = await service.lookupDecisionState({
      stage: "work_card",
      targets: workItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    const registryAfterLookup = await artifactPairs.loadRegistry();
    assert.equal(pending.state, "pending_operator_disposition");
    assert.equal(registryAfterLookup.revision, registryBeforeLookup.revision);
    assert.equal(fileCount(repo), countBeforeLookup);
    assert.equal(fs.existsSync(path.join(repo, "planning", "phases", "phase-07", "Operator_Approvals")), false);

    const decision = await service.decide({
      stage: "work_card",
      targets: workItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(decision.ok, true, decision.errorMessages?.join("\n"));
    assert.equal(decision.lookupState.state, "decided");
    assert.equal(decision.decisionEvent.outcome.decision, "approved");
    const approval = await readArtifactById(artifactPairs, decision.decisionArtifactId);
    assert.equal(approval.artifactType, "operator_approval");
    assert.equal(approval.payload.data.schemaVersion, "operator-decision-record.v1");
    assert.deepEqual(approval.relationships.expectedOutputs, [`${projectId}/phase-07/implementer_report/WC01`]);
    for (const field of [
      "codeChangesAuthorized",
      "sourceCodeChangesAuthorized",
      "implementationAuthorized",
      "authorizationGranted",
      "executionPassesAuthorized",
      "pushAuthorized",
    ]) {
      assert.equal(Object.hasOwn(approval.payload.data, field), false, field);
    }

    const decided = await service.lookupDecisionState({
      stage: "work_card",
      targets: workItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(decided.state, "decided");
    assert.equal(decided.event.targetSetHash, decision.decisionEvent.targetSetHash);

    const sameDecision = await service.decide({
      stage: "work_card",
      targets: workItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(sameDecision.ok, true, sameDecision.errorMessages?.join("\n"));
    assert.equal(sameDecision.idempotent, true);

    const reasonedWork = await commitWorkCard(artifactPairs, {
      workCardId: "WC04",
      requiresImplementer: true,
    });
    const reasonedQueue = await service.listQueue();
    const reasonedItem = reasonedQueue.items.find((item) => item.targetArtifactId === reasonedWork.artifact.artifactId);
    assert.ok(reasonedItem);
    const reasonedDecision = await service.decide({
      stage: "work_card",
      targets: reasonedItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
      operatorReason: "  same normalized reason  ",
    });
    assert.equal(reasonedDecision.ok, true, reasonedDecision.errorMessages?.join("\n"));
    const reasonedApproval = await readArtifactById(artifactPairs, reasonedDecision.decisionArtifactId);
    assert.equal(reasonedApproval.payload.data.decisionTimeline.length, 1);
    const reasonedRetry = await service.decide({
      stage: "work_card",
      targets: reasonedItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
      operatorReason: "same normalized reason",
    });
    assert.equal(reasonedRetry.ok, true, reasonedRetry.errorMessages?.join("\n"));
    assert.equal(reasonedRetry.idempotent, true);
    const reasonedApprovalAfterRetry = await readArtifactById(artifactPairs, reasonedDecision.decisionArtifactId);
    assert.equal(reasonedApprovalAfterRetry.payload.data.decisionTimeline.length, 1);
    const changedReason = await service.decide({
      stage: "work_card",
      targets: reasonedItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
      operatorReason: "changed reason",
    });
    assert.equal(changedReason.ok, false);
    assert.match(changedReason.errorMessages.join("\n"), /already has a durable Operator decision/i);
    const changedOutcome = await service.decide({
      stage: "work_card",
      targets: reasonedItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "revision_requested" },
      operatorReason: "request revision",
    });
    assert.equal(changedOutcome.ok, false);
    assert.match(changedOutcome.errorMessages.join("\n"), /already has a durable Operator decision/i);

    await commitWorkCard(artifactPairs, {
      workCardId: "WC01",
      requiresImplementer: true,
      extraData: { codeChangesAuthorized: false, changedField: "new revision" },
      expectedRevision: workCard.artifact.revision,
    });
    const revisedQueue = await service.listQueue();
    const revisedItem = revisedQueue.items.find((item) => item.targetArtifactId === workCard.artifact.artifactId);
    assert.equal(revisedItem.approvalStatus, "stale");
    const revisedLookup = await service.lookupDecisionState({
      stage: "work_card",
      targets: revisedItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(revisedLookup.state, "pending_operator_disposition");
    assert.equal(decided.state, "decided");

    const nonImplementer = await commitWorkCard(artifactPairs, {
      workCardId: "WC02",
      requiresImplementer: false,
      extraData: { codeChangesAuthorized: true },
    });
    const nonQueue = await service.listQueue();
    const nonItem = nonQueue.items.find((item) => item.targetArtifactId === nonImplementer.artifact.artifactId);
    assert.equal(nonItem.implementationAuthorizationAvailable, false);
    const nonDecision = await service.decide({
      stage: "work_card",
      targets: nonItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(nonDecision.ok, true);
    const nonApproval = await readArtifactById(artifactPairs, nonDecision.decisionArtifactId);
    assert.deepEqual(nonApproval.relationships.expectedOutputs, []);

    const currentBundle = await commitPhaseBundle(artifactPairs, { phaseId: "phase-08", status: "active" });
    const historicalBundle = await commitPhaseBundle(artifactPairs, { phaseId: "phase-09", status: "historical" });
    const bundleQueue = await service.listQueue();
    assert.equal(bundleQueue.ok, true, bundleQueue.errorMessages?.join("\n"));
    assertBundleItems(bundleQueue, currentBundle.phase.artifact.artifactId, currentBundle.plan.artifact.artifactId, false);
    assertBundleItems(bundleQueue, historicalBundle.phase.artifact.artifactId, historicalBundle.plan.artifact.artifactId, true);

    const historicalPhaseItem = bundleQueue.items.find((item) => item.targetArtifactId === historicalBundle.phase.artifact.artifactId);
    const historicalPlanItem = bundleQueue.items.find((item) => item.targetArtifactId === historicalBundle.plan.artifact.artifactId);
    assert.equal(historicalPhaseItem.approvalArtifactId, historicalPlanItem.approvalArtifactId);
    assert.equal(historicalPhaseItem.targetSetHash, historicalPlanItem.targetSetHash);
    assert.equal(historicalPhaseItem.decisionWorkspaceScreenId, "operator-phase-approval");
    assert.equal(historicalPhaseItem.decisionWorkspaceLabel, "Operator Phase Approval");
    assert.equal(historicalPhaseItem.approvalClassification, "phase_planning");

    const reversedBundleDecision = await service.decide({
      stage: "phase_planning",
      targets: [...historicalPhaseItem.targetBindings].reverse(),
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(reversedBundleDecision.ok, true, reversedBundleDecision.errorMessages?.join("\n"));
    const phaseApproval = await readArtifactById(artifactPairs, reversedBundleDecision.decisionArtifactId);
    assert.equal(phaseApproval.parentArtifactId, historicalBundle.phase.artifact.artifactId);
    assert.equal(phaseApproval.phaseId, "phase-09");
    assert.equal(phaseApproval.artifactId, historicalPhaseItem.approvalArtifactId);
    const afterHistoricalDecision = await service.listQueue();
    assert.equal(afterHistoricalDecision.ok, true, afterHistoricalDecision.errorMessages?.join("\n"));
    const decidedHistoricalPhase = afterHistoricalDecision.items.find((item) => item.targetArtifactId === historicalBundle.phase.artifact.artifactId);
    const decidedHistoricalPlan = afterHistoricalDecision.items.find((item) => item.targetArtifactId === historicalBundle.plan.artifact.artifactId);
    assert.equal(decidedHistoricalPhase.approvalStatus, "exact");
    assert.equal(decidedHistoricalPlan.approvalStatus, "exact");
    assert.equal(decidedHistoricalPhase.approvalArtifactId, historicalPhaseItem.approvalArtifactId);
    assert.equal(decidedHistoricalPlan.approvalArtifactId, historicalPhaseItem.approvalArtifactId);
    assert.equal(decidedHistoricalPhase.existingApprovalArtifactId, phaseApproval.artifactId);
    assert.equal(decidedHistoricalPlan.existingApprovalArtifactId, phaseApproval.artifactId);
    assert.equal(decidedHistoricalPhase.decisionTimeline.length, 1);
    assert.deepEqual(decidedHistoricalPhase.decisionTimeline, decidedHistoricalPlan.decisionTimeline);
    const registryAfterHistoricalDecision = await artifactPairs.loadRegistry();
    assert.equal(
      registryAfterHistoricalDecision.entries.filter((entry) => entry.artifactType === "operator_approval" && entry.artifactId === phaseApproval.artifactId).length,
      1,
    );

    for (const invalid of [
      { name: "incomplete", targets: [historicalPhaseItem.targetBindings[0]] },
      { name: "extra", targets: [...historicalPhaseItem.targetBindings, nonItem.targetBindings[0]] },
      { name: "duplicate-type", targets: [historicalPhaseItem.targetBindings[0], historicalPhaseItem.targetBindings[0]] },
      { name: "mixed-stage", targets: [historicalPhaseItem.targetBindings[0], nonItem.targetBindings[0]] },
      { name: "mixed-current-historical", targets: [historicalPhaseItem.targetBindings[0], currentBundle.itemBindings.plan] },
    ]) {
      const result = await service.decide({
        stage: "phase_planning",
        targets: invalid.targets,
        outcome: { kind: "stage_decision", decision: "approved" },
      });
      assert.equal(result.ok, false, invalid.name);
    }

    const mixedProject = await service.decide({
      stage: "phase_planning",
      targets: [
        {
          ...currentBundle.itemBindings.phase,
          artifactId: "other-project/phase-08/phase_planning/Phase_Planning",
        },
        currentBundle.itemBindings.plan,
      ],
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(mixedProject.ok, false);
    assert.match(mixedProject.errorMessages.join("\n"), /not registered|visible governance corpus|configured project/i);

    const mixedPhase = await service.decide({
      stage: "phase_planning",
      targets: [currentBundle.itemBindings.phase, binding((await commitPhaseBundle(artifactPairs, { phaseId: "phase-12", status: "active" })).plan.artifact)],
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(mixedPhase.ok, false);
    assert.match(mixedPhase.errorMessages.join("\n"), /one non-empty phase/i);

    const staleBundle = await commitPhaseBundle(artifactPairs, { phaseId: "phase-13", status: "active" });
    const staleQueue = await service.listQueue();
    const staleItem = staleQueue.items.find((item) => item.targetArtifactId === staleBundle.phase.artifact.artifactId);
    await commitPhasePlanning(artifactPairs, {
      phaseId: "phase-13",
      status: "active",
      expectedRevision: staleBundle.phase.artifact.revision,
      data: { phaseId: "phase-13", changedField: "new revision" },
    });
    const staleDecision = await service.decide({
      stage: "phase_planning",
      targets: staleItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(staleDecision.ok, false);
    assert.match(staleDecision.errorMessages.join("\n"), /stale/i);

    const duplicatePhaseRepo = await createTempRepo();
    try {
      const duplicatePairs = pairService(duplicatePhaseRepo);
      const duplicateService = approvalService(duplicatePhaseRepo, duplicatePairs);
      await commitPhaseBundle(duplicatePairs, { phaseId: "phase-14", status: "active" });
      await commitPhasePlanning(duplicatePairs, {
        phaseId: "phase-14",
        status: "active",
        artifactId: `${projectId}/phase-14/phase_planning/Phase_Planning_Duplicate`,
        fileStem: "Phase_Planning_Duplicate",
      });
      const duplicatePhasePlanning = await duplicateService.listQueue();
      assert.equal(duplicatePhasePlanning.ok, false);
      assert.match(duplicatePhasePlanning.errorMessages.join("\n"), /exactly one Phase Planning/i);
    } finally {
      cleanup(duplicatePhaseRepo);
    }

    const duplicateRepo = await createTempRepo();
    try {
      const duplicatePairs = pairService(duplicateRepo);
      const duplicateService = approvalService(duplicateRepo, duplicatePairs);
      await commitPhaseBundle(duplicatePairs, { phaseId: "phase-15", status: "active" });
      await commitWorkCardPlan(duplicatePairs, {
        phaseId: "phase-15",
        status: "active",
        artifactId: `${projectId}/phase-15/work_card_plan/Work_Card_Plan_Duplicate`,
        fileStem: "Work_Card_Plan_Duplicate",
      });
      const duplicateWorkCardPlan = await duplicateService.listQueue();
      assert.equal(duplicateWorkCardPlan.ok, false);
      assert.match(duplicateWorkCardPlan.errorMessages.join("\n"), /exactly one Work Card Plan/i);
    } finally {
      cleanup(duplicateRepo);
    }

    await commitLegacyApproval(artifactPairs, nonImplementer.artifact);
    const legacyLookup = await service.lookupDecisionState({
      stage: "work_card",
      targets: nonItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(legacyLookup.state, "decided");
    const legacyWork = await commitWorkCard(artifactPairs, {
      workCardId: "WC03",
      requiresImplementer: true,
    });
    await commitLegacyApproval(artifactPairs, legacyWork.artifact);
    const legacyWorkItemBeforeQueue = (await service.listQueue()).items.find((item) => item.targetArtifactId === legacyWork.artifact.artifactId);
    const legacyPendingLookup = await service.lookupDecisionState({
      stage: "work_card",
      targets: legacyWorkItemBeforeQueue.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(legacyPendingLookup.state, "pending_operator_disposition");
    assert.equal(legacyPendingLookup.evidence.length, 1);
    assert.equal(legacyPendingLookup.evidence[0].artifactId.endsWith("/operator_approval/legacy_WC03"), true);
    const legacyQueue = await service.listQueue();
    const legacyItem = legacyQueue.items.find((item) => item.targetArtifactId === legacyWork.artifact.artifactId);
    assert.equal(legacyItem.approvalStatus, "pending_operator_disposition");
    assert.equal(legacyItem.legacyEvidence.length, 1);
    assert.equal(legacyItem.legacyEvidence[0].reason.includes("evidence"), true);
  } finally {
    cleanup(repo);
  }
});

async function createTempRepo() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "champcity-governance-service-"));
  await fs.promises.mkdir(path.join(root, "planning"), { recursive: true });
  await fs.promises.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture" }), "utf8");
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

function fileCount(root) {
  let count = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) count += fileCount(full);
    if (entry.isFile()) count += 1;
  }
  return count;
}

function pairService(root) {
  return new ArtifactPairService({
    projectRoot: root,
    clock: () => fixedTime,
    transactionIdFactory: () => `txn-${Math.random().toString(16).slice(2)}`,
  });
}

function approvalService(root, artifactPairs) {
  return new GovernanceApprovalService({
    projectId,
    displayName: "Fixture",
    repositoryRoot: root,
    planningRoot: path.join(root, "planning"),
    branchBehavior: { mode: "observe-current" },
    enabled: true,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    lastOpenedAt: null,
    lastScanAt: null,
    lastScanResult: null,
    observerStatus: "stopped",
  }, artifactPairs);
}

async function commitWorkCard(artifactPairs, input) {
  const workCardId = input.workCardId;
  return artifactPairs.commitArtifact({
    artifactId: `${projectId}/phase-07/work_card/${workCardId}`,
    artifactType: "work_card",
    status: "active",
    projectId,
    phaseId: "phase-07",
    workCardId,
    parentArtifactId: `${projectId}/phase-07/work_card_plan/Work_Card_Plan`,
    relationships: {
      sources: [],
      expectedOutputs: [`${projectId}/phase-07/implementer_report/${workCardId}`],
      supersedes: [],
      children: [],
    },
    payload: {
      title: `Work Card ${workCardId}`,
      contentMarkdown: `# Work Card ${workCardId}\n`,
      data: {
        requiresImplementer: input.requiresImplementer,
        expectedImplementerReportArtifactId: `${projectId}/phase-07/implementer_report/${workCardId}`,
        ...(input.extraData ?? {}),
      },
    },
    location: {
      directoryPath: "planning/phases/phase-07/Work_Cards",
      fileStem: `${workCardId}_operator_decision_service_fixture`,
    },
    expectedRevision: input.expectedRevision ?? null,
  });
}

async function commitPhaseBundle(artifactPairs, input) {
  const phase = await commitPhasePlanning(artifactPairs, {
    phaseId: input.phaseId,
    status: input.status,
    projectId: input.phaseProjectId,
  });
  const plan = await commitWorkCardPlan(artifactPairs, {
    phaseId: input.phaseId,
    status: input.status,
    projectId: input.planProjectId,
    sources: [phase.artifact.artifactId],
  });
  return {
    phase,
    plan,
    itemBindings: {
      phase: binding(phase.artifact),
      plan: binding(plan.artifact),
    },
  };
}

async function commitPhasePlanning(artifactPairs, input) {
  const ownerProjectId = input.projectId ?? projectId;
  return artifactPairs.commitArtifact({
    artifactId: input.artifactId ?? `${ownerProjectId}/${input.phaseId}/phase_planning/Phase_Planning`,
    artifactType: "phase_planning",
    status: input.status,
    projectId: ownerProjectId,
    phaseId: input.phaseId,
    payload: {
      title: `Phase Planning ${input.phaseId}`,
      contentMarkdown: `# Phase Planning ${input.phaseId}\n`,
      data: input.data ?? { phaseId: input.phaseId },
    },
    location: {
      directoryPath: `planning/phases/${input.phaseId}`,
      fileStem: input.fileStem ?? `Phase_Planning_${input.status}`,
    },
    expectedRevision: input.expectedRevision ?? null,
  });
}

async function commitWorkCardPlan(artifactPairs, input) {
  const ownerProjectId = input.projectId ?? projectId;
  return artifactPairs.commitArtifact({
    artifactId: input.artifactId ?? `${ownerProjectId}/${input.phaseId}/work_card_plan/Work_Card_Plan`,
    artifactType: "work_card_plan",
    status: input.status,
    projectId: ownerProjectId,
    phaseId: input.phaseId,
    relationships: { sources: input.sources ?? [] },
    payload: {
      title: `Work Card Plan ${input.phaseId}`,
      contentMarkdown: `# Work Card Plan ${input.phaseId}\n`,
      data: input.data ?? { phaseId: input.phaseId, candidates: [] },
    },
    location: {
      directoryPath: `planning/phases/${input.phaseId}`,
      fileStem: input.fileStem ?? `Work_Card_Plan_${input.status}`,
    },
    expectedRevision: input.expectedRevision ?? null,
  });
}

async function commitLegacyApproval(artifactPairs, target) {
  return artifactPairs.commitArtifact({
    artifactId: `${projectId}/phase-07/operator_approval/legacy_${target.workCardId}`,
    artifactType: "operator_approval",
    status: "active",
    projectId,
    phaseId: "phase-07",
    workCardId: target.workCardId,
    parentArtifactId: target.artifactId,
    relationships: { sources: [target.artifactId], expectedOutputs: [] },
    payload: {
      title: `Legacy Approval ${target.workCardId}`,
      contentMarkdown: `# Legacy Approval ${target.workCardId}\n`,
      data: { decision: "approved" },
    },
    location: {
      directoryPath: "planning/phases/phase-07/Operator_Approvals",
      fileStem: `LEGACY_APPROVAL_${target.workCardId}`,
    },
    expectedRevision: null,
  });
}

function binding(artifact) {
  return {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    revision: artifact.revision,
    payloadHash: artifact.payloadHash,
  };
}

async function readArtifactById(artifactPairs, artifactId) {
  const registry = await artifactPairs.loadRegistry();
  const entry = registry.entries.find((candidate) => candidate.artifactId === artifactId);
  assert.ok(entry, artifactId);
  return (await artifactPairs.readArtifactByPaths(entry.jsonPath, entry.markdownPath)).artifact;
}

function assertBundleItems(queue, phaseArtifactId, planArtifactId, historical) {
  const phase = queue.items.find((item) => item.targetArtifactId === phaseArtifactId);
  const plan = queue.items.find((item) => item.targetArtifactId === planArtifactId);
  assert.ok(phase);
  assert.ok(plan);
  assert.equal(phase.status === "historical", historical);
  assert.equal(plan.status === "historical", historical);
  assert.equal(phase.targetBindings.length, 2);
  assert.equal(plan.targetBindings.length, 2);
  assert.equal(phase.targetSetHash, plan.targetSetHash);
}
