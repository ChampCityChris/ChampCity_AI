const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const { ArtifactPairService } = require("../../dist/main/artifacts/index.js");
const { GovernanceApprovalService } = require("../../dist/main/artifacts/governanceApprovalService.js");
const { scanVerifiedArtifactGraph } = require("../../dist/main/repository/index.js");
const { RelationshipDrivenWorkflowResolver } = require("../../dist/main/workflow/relationshipDrivenWorkflowResolver.js");

const projectId = "champcity-ai";
const phaseId = "phase-07";
const fixedTime = "2026-07-20T17:00:00.000Z";

test("Operator decision routing uses production persistence, scan, approval, and resolver authority", async () => {
  await assertRoutingScenario({
    workCardId: "WC10",
    requiresImplementer: true,
    extraData: {},
    expectImplementer: true,
  });
  await assertRoutingScenario({
    workCardId: "WC11",
    requiresImplementer: true,
    extraData: { codeChangesAuthorized: false },
    expectImplementer: true,
  });
  await assertRoutingScenario({
    workCardId: "WC12",
    requiresImplementer: false,
    extraData: { codeChangesAuthorized: true },
    expectImplementer: false,
  });
});

async function assertRoutingScenario(input) {
  const repo = await createTempRepo(input.workCardId);
  try {
    const artifactPairs = pairService(repo);
    const service = approvalService(configuredProject(repo), artifactPairs);

    await commitPhaseActivation(artifactPairs);
    await commitPhasePlanning(artifactPairs);
    await commitWorkCardPlan(artifactPairs, input.workCardId);

    const phaseQueue = await service.listQueue();
    assert.equal(phaseQueue.ok, true, phaseQueue.errorMessages?.join("\n"));
    const phaseItem = phaseQueue.items.find((item) => item.targetArtifactId === `${projectId}/${phaseId}/phase_planning/Phase_Planning`);
    const planItem = phaseQueue.items.find((item) => item.targetArtifactId === `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`);
    assert.ok(phaseItem);
    assert.ok(planItem);
    assert.equal(phaseItem.approvalArtifactId, planItem.approvalArtifactId);
    assert.equal(phaseItem.targetSetHash, planItem.targetSetHash);

    const phaseDecision = await service.decide({
      stage: "phase_planning",
      targets: phaseItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(phaseDecision.ok, true, phaseDecision.errorMessages?.join("\n"));

    const workCard = await commitWorkCard(artifactPairs, input);
    const workQueue = await service.listQueue();
    assert.equal(workQueue.ok, true, workQueue.errorMessages?.join("\n"));
    const workItem = workQueue.items.find((item) => item.targetArtifactId === workCard.artifact.artifactId);
    assert.ok(workItem);
    assert.equal(workItem.implementationAuthorizationAvailable, input.requiresImplementer);
    assert.equal(workItem.decisionWorkspaceScreenId, "operator-work-card-approval");

    const workDecision = await service.decide({
      stage: "work_card",
      targets: workItem.targetBindings,
      outcome: { kind: "stage_decision", decision: "approved" },
    });
    assert.equal(workDecision.ok, true, workDecision.errorMessages?.join("\n"));

    const graph = await scanVerifiedArtifactGraph(configuredProject(repo), () => fixedTime);
    assert.deepEqual(graph.blockers, []);
    const projection = new RelationshipDrivenWorkflowResolver().resolve(configuredProject(repo), graph, 1);

    if (input.expectImplementer) {
      assert.equal(projection.resolverResult.kind, "current_action");
      assert.equal(projection.resolverResult.actionId, "implementer_execution_required");
      assert.equal(projection.resolverResult.role, "implementer");
      assert.equal(projection.resolverResult.targetArtifactId, workCard.artifact.artifactId);
      assert.ok(projection.implementerAssignment);
      assert.equal(projection.implementerAssignment.operatorApprovalArtifactId, workDecision.decisionArtifactId);
      assert.equal(projection.implementerAssignment.expectedImplementerReportArtifactId, expectedReportId(input.workCardId));
      assert.equal(projection.implementerAssignment.targetWorkCardArtifactId, workCard.artifact.artifactId);
    } else {
      assert.notEqual(projection.resolverResult.actionId, "implementer_execution_required");
      assert.equal(projection.implementerAssignment, null);
    }
  } finally {
    cleanup(repo);
  }
}

async function createTempRepo(name) {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), `champcity-routing-${name}-`));
  await fs.promises.mkdir(path.join(root, "planning"), { recursive: true });
  await fs.promises.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture" }), "utf8");
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

function pairService(root) {
  return new ArtifactPairService({
    projectRoot: root,
    clock: () => fixedTime,
    transactionIdFactory: () => `txn-${Math.random().toString(16).slice(2)}`,
  });
}

function configuredProject(root) {
  return {
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
  };
}

function approvalService(project, artifactPairs) {
  return new GovernanceApprovalService(project, artifactPairs);
}

async function commitPhaseActivation(artifactPairs) {
  return artifactPairs.commitArtifact({
    artifactId: `${projectId}/${phaseId}/phase_activation/${phaseId}`,
    artifactType: "phase_activation",
    status: "active",
    projectId,
    phaseId,
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload: {
      title: "Phase 07 Activation",
      contentMarkdown: "# Phase 07 Activation\n",
      data: { phaseId, phaseSequence: 7 },
    },
    location: {
      directoryPath: `planning/phases/${phaseId}`,
      fileStem: "Phase_Activation",
    },
    expectedRevision: null,
  });
}

async function commitPhasePlanning(artifactPairs) {
  return artifactPairs.commitArtifact({
    artifactId: `${projectId}/${phaseId}/phase_planning/Phase_Planning`,
    artifactType: "phase_planning",
    status: "active",
    projectId,
    phaseId,
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload: {
      title: "Phase 07 Planning",
      contentMarkdown: "# Phase 07 Planning\n",
      data: { phaseId },
    },
    location: {
      directoryPath: `planning/phases/${phaseId}`,
      fileStem: "Phase_Planning",
    },
    expectedRevision: null,
  });
}

async function commitWorkCardPlan(artifactPairs, workCardId) {
  return artifactPairs.commitArtifact({
    artifactId: `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`,
    artifactType: "work_card_plan",
    status: "active",
    projectId,
    phaseId,
    relationships: {
      sources: [`${projectId}/${phaseId}/phase_planning/Phase_Planning`],
      expectedOutputs: [
        `${projectId}/${phaseId}/operator_approval/Operator_Phase_Approval`,
        `${projectId}/${phaseId}/phase_closeout/Phase_Closeout`,
      ],
      supersedes: [],
      children: [],
    },
    payload: {
      title: "Phase 07 Work Card Plan",
      contentMarkdown: "# Phase 07 Work Card Plan\n",
      data: {
        phaseId,
        candidates: [{
          id: workCardId,
          order: 1,
          artifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
          kind: "planned_candidate",
          status: "unresolved",
        }],
      },
    },
    location: {
      directoryPath: `planning/phases/${phaseId}`,
      fileStem: "Work_Card_Plan",
    },
    expectedRevision: null,
  });
}

async function commitWorkCard(artifactPairs, input) {
  const workCardId = input.workCardId;
  return artifactPairs.commitArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    artifactType: "work_card",
    status: "active",
    projectId,
    phaseId,
    workCardId,
    parentArtifactId: `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`,
    relationships: {
      sources: [`${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`],
      expectedOutputs: [expectedReportId(workCardId)],
      supersedes: [],
      children: [],
    },
    payload: {
      title: `Work Card ${workCardId}`,
      contentMarkdown: `# Work Card ${workCardId}\n`,
      data: {
        requiresImplementer: input.requiresImplementer,
        planCandidateId: workCardId,
        workCardKind: "planned_candidate",
        expectedImplementerReportArtifactId: expectedReportId(workCardId),
        ...(input.extraData ?? {}),
      },
    },
    location: {
      directoryPath: `planning/phases/${phaseId}/Work_Cards`,
      fileStem: `${workCardId}_operator_decision_routing_fixture`,
    },
    expectedRevision: null,
  });
}

function expectedReportId(workCardId) {
  return `${projectId}/${phaseId}/implementer_report/${workCardId}`;
}
