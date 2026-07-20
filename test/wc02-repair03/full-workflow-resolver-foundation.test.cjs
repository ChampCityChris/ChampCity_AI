const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { mkdtemp, mkdir, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  scanVerifiedArtifactGraph,
} = require("../../dist/main/repository");
const {
  ArtifactPairService,
  GovernanceRepairService,
} = require("../../dist/main/artifacts");
const {
  buildMarkdownArtifactEnvelope,
  canonicalStringify,
} = require("../../dist/shared/artifacts");
const {
  RelationshipDrivenWorkflowResolver,
} = require("../../dist/main/workflow/relationshipDrivenWorkflowResolver");
const {
  workflowActionCatalog,
} = require("../../dist/shared/workflow");

const FIXED_TIME = "2026-07-18T04:00:00.000Z";

function project(root) {
  return {
    projectId: "champcity-ai",
    displayName: "ChampCity_AI",
    repositoryRoot: root,
    planningRoot: path.join(root, "planning"),
    branchBehavior: { mode: "observe-current" },
    enabled: true,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    lastOpenedAt: null,
    lastScanAt: null,
    lastScanResult: null,
    observerStatus: "stopped",
  };
}

async function liveProjection() {
  const configured = project(process.cwd());
  const graph = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
  return new RelationshipDrivenWorkflowResolver().resolve(configured, graph, 1);
}

test("isolated malformed lifecycle repairs to newest active phase and approved WC01 route", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-lifecycle-repair-"));
  try {
    const configured = project(root);
    await seedPhase07RepairFixture(root);
    let graph = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
    let projection = new RelationshipDrivenWorkflowResolver().resolve(configured, graph, 1);
    const derivedActivePhase = projection.domain.phases.find(
      (phase) => phase.phaseStatus === "active",
    );
    assert.equal(derivedActivePhase?.phaseId, "phase-07");
    assert.equal(projection.state.activePhaseId, null);
    assert.equal(projection.state.currentActionId, "route_review_request_required");
    assert.equal(
      projection.state.blockingConditions.every(
        (blocker) => blocker.code === "unsynchronized_artifact_pair",
      ),
      true,
    );

    const repair = new GovernanceRepairService(
      configured,
      new ArtifactPairService({ projectRoot: root, clock: () => FIXED_TIME }),
    );
    const preview = await repair.preview();
    assert.equal(preview.repairableCount, 2);
    assert.equal(preview.payloadContentSummary, "Payload content unchanged.");
    assert.deepEqual(
      preview.candidates.map((candidate) => candidate.artifactId).sort(),
      [
        "champcity-ai/phase-07/operator_approval/Operator_Phase_Approval",
        "champcity-ai/phase-07/work_card/WC01",
      ],
    );

    const applied = await repair.repairAll();
    assert.deepEqual(
      applied.repairedArtifactIds.sort(),
      [
        "champcity-ai/phase-07/operator_approval/Operator_Phase_Approval",
        "champcity-ai/phase-07/work_card/WC01",
      ],
    );

    graph = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
    projection = new RelationshipDrivenWorkflowResolver().resolve(configured, graph, 2);
    assert.deepEqual(graph.blockers, []);
    assert.equal(projection.state.activePhaseId, derivedActivePhase?.phaseId);
    assert.equal(projection.state.phaseExecution.activeCandidateId, "WC01");
    assert.equal(projection.state.currentActionId, "implementer_execution_required");
    assert.equal(projection.state.currentAction?.screenId, "implementer-execution");
    assert.equal(
      projection.state.expectedOutput?.artifactId,
      "champcity-ai/phase-07/implementer_report/WC01",
    );
    assert.equal(
      projection.implementerAssignment.operatorApprovalArtifactId,
      "champcity-ai/phase-07/operator_approval/WC01",
    );

    const restartGraph = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
    const restartProjection = new RelationshipDrivenWorkflowResolver().resolve(configured, restartGraph, 1);
    assert.equal(restartProjection.state.activePhaseId, projection.state.activePhaseId);
    assert.equal(restartProjection.state.currentActionId, projection.state.currentActionId);
    assert.equal(
      restartProjection.state.expectedOutput?.artifactId,
      projection.state.expectedOutput?.artifactId,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("isolated malformed governance authority blocks instead of falling back to stale Phase 06", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-lifecycle-block-"));
  try {
    const configured = project(root);
    await seedPhase07RepairFixture(root);
    const graph = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
    const projection = new RelationshipDrivenWorkflowResolver().resolve(configured, graph, 1);
    const derivedActivePhase = projection.domain.phases.find(
      (phase) => phase.phaseStatus === "active",
    );
    assert.equal(derivedActivePhase?.phaseId, "phase-07");
    assert.equal(projection.state.activePhaseId, null);
    assert.equal(projection.state.currentActionId, "route_review_request_required");
    assert.equal(
      projection.state.blockingConditions.every(
        (blocker) => blocker.code === "unsynchronized_artifact_pair",
      ),
      true,
    );
    assert.equal(projection.domain.project.projectId, "champcity-ai");
    assert.equal(projection.domain.project.repositoryBindingId, "champcity-ai");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("repairs remain explicit sequential lineage and WC03 is the only replacement candidate", async () => {
  const projection = await liveProjection();
  const plan = projection.graph.controlling("champcity-ai/phase-06/work_card_plan/Work_Card_Plan");
  const planCandidates = plan.artifact.payload.data.candidates.map((candidate) => candidate.id);
  assert.deepEqual(planCandidates, ["WC01", "WC02", "WC03"]);

  const repair = projection.graph.controlling("champcity-ai/phase-06/work_card/WC02-REPAIR03");
  assert.equal(repair.artifact.parentArtifactId, "champcity-ai/phase-06/work_card/WC02");
  assert.equal(repair.artifact.payload.data.repairSequence, 3);
  assert.equal(
    repair.artifact.payload.data.priorRepairWorkCardArtifactId,
    "champcity-ai/phase-06/work_card/WC02-REPAIR02",
  );
  assert.equal(
    repair.artifact.payload.data.authorizingDispositionArtifactId,
    "champcity-ai/phase-06/candidate_disposition/WC02",
  );
  assert.equal(
    projection.domain.repairs.some((item) => item.repairWorkCardArtifactId === repair.artifact.artifactId),
    true,
  );
  assert.equal(
    projection.domain.candidates.some((candidate) => candidate.workCardArtifactId === repair.artifact.artifactId),
    false,
  );
  const repair04Matches = projection.graph.nodes.filter(
    (node) => node.artifact.artifactId === "champcity-ai/phase-06/work_card/WC02-REPAIR04",
  );
  assert.equal(repair04Matches.length, 1);
  assert.equal(repair04Matches[0].classification, "historical");
});

test("catalog contains no routed Ad Hoc Work Card Capture action", () => {
  const normalActions = workflowActionCatalog.filter((entry) => entry.advancesWorkflowState);
  assert.equal(
    normalActions.some((entry) => entry.manualScreenId === "new-work-card" || entry.screenId === "new-work-card"),
    false,
  );
  assert.equal(
    normalActions.some((entry) => entry.actionId.includes("ad_hoc")),
    false,
  );
});

async function seedPhase07RepairFixture(root) {
  await mkdir(path.join(root, ".git"), { recursive: true });
  await writeFile(
    path.join(root, ".git", "HEAD"),
    "ref: refs/heads/feature/phase-04-wc01-repair01-evidence-derived-workflow\n",
    "utf8",
  );
  const service = new ArtifactPairService({ projectRoot: root, clock: () => FIXED_TIME });
  const reportId = "champcity-ai/phase-07/implementer_report/WC01";
  await commit(service, {
    artifactId: "champcity-ai/phase-06/phase_activation/phase-06",
    artifactType: "phase_activation",
    phaseId: "phase-06",
    title: "Phase 06 Activation",
    markdown: "# Phase 06 Activation\n",
    data: { phaseId: "phase-06", phaseSequence: 6 },
    location: { directoryPath: "planning/phases/phase-06", fileStem: "Phase_Activation" },
  });
  await commit(service, {
    artifactId: "champcity-ai/phase-06/phase_closeout/PHASE_06",
    artifactType: "phase_closeout",
    phaseId: "phase-06",
    title: "Phase 06 Closeout",
    markdown: "# Phase 06 Closeout\n",
    data: { phaseId: "phase-06", successorPhaseId: "phase-07" },
    location: { directoryPath: "planning/phases/phase-06", fileStem: "Phase_Closeout" },
  });
  await commit(service, {
    artifactId: "champcity-ai/phase-07/phase_activation/phase-07",
    artifactType: "phase_activation",
    phaseId: "phase-07",
    title: "Phase 07 Activation",
    markdown: "# Phase 07 Activation\n",
    data: { phaseId: "phase-07", phaseSequence: 7, predecessorPhaseId: "phase-06" },
    location: { directoryPath: "planning/phases/phase-07", fileStem: "Phase_Activation" },
  });
  const plan = await commit(service, {
    artifactId: "champcity-ai/phase-07/work_card_plan/Work_Card_Plan",
    artifactType: "work_card_plan",
    phaseId: "phase-07",
    title: "Phase 07 Work Card Plan",
    markdown: "# Phase 07 Work Card Plan\n",
    data: {
      phaseId: "phase-07",
      candidates: [
        {
          id: "WC01",
          title: "ChampCity GPT portability review shared core architecture contract",
          order: 1,
          artifactId: "champcity-ai/phase-07/work_card/WC01",
        },
      ],
    },
    relationships: {
      expectedOutputs: ["champcity-ai/phase-07/operator_approval/Operator_Phase_Approval"],
    },
    location: { directoryPath: "planning/phases/phase-07", fileStem: "Work_Card_Plan" },
  });
  const phaseApproval = await commit(service, {
    artifactId: "champcity-ai/phase-07/operator_approval/Operator_Phase_Approval",
    artifactType: "operator_approval",
    phaseId: "phase-07",
    parentArtifactId: plan.artifact.artifactId,
    title: "Operator Phase Approval",
    markdown: "# Operator Phase Approval\n",
    data: operatorDecisionRecord("phase_planning", [plan.artifact], { kind: "stage_decision", decision: "approved" }),
    relationships: { sources: [plan.artifact.artifactId] },
    location: { directoryPath: "planning/phases/phase-07", fileStem: "Operator_Phase_Approval" },
  });
  const workCard = await commit(service, {
    artifactId: "champcity-ai/phase-07/work_card/WC01",
    artifactType: "work_card",
    phaseId: "phase-07",
    workCardId: "WC01",
    parentArtifactId: plan.artifact.artifactId,
    title: "WC01 Portability Review",
    markdown: "# WC01 Portability Review\n",
    data: {
      workCardId: "WC01",
      planCandidateId: "WC01",
      workCardKind: "planned_candidate",
      expectedImplementerReportArtifactId: reportId,
    },
    relationships: {
      sources: [plan.artifact.artifactId, phaseApproval.artifact.artifactId],
      expectedOutputs: [reportId],
    },
    location: {
      directoryPath: "planning/phases/phase-07/Work_Cards",
      fileStem: "WC01_champcity_gpt_portability_review_shared_core_architecture_contract",
    },
  });
  await commit(service, {
    artifactId: "champcity-ai/phase-07/operator_approval/WC01",
    artifactType: "operator_approval",
    phaseId: "phase-07",
    workCardId: "WC01",
    parentArtifactId: workCard.artifact.artifactId,
    title: "Operator Approval WC01",
    markdown: "# Operator Approval WC01\n",
    data: operatorDecisionRecord("work_card", [workCard.artifact], { kind: "stage_decision", decision: "approved" }),
    relationships: {
      sources: [workCard.artifact.artifactId, phaseApproval.artifact.artifactId, plan.artifact.artifactId],
      expectedOutputs: [reportId],
    },
    location: {
      directoryPath: "planning/phases/phase-07/Operator_Approvals",
      fileStem: "OPERATOR_APPROVAL_WC01_champcity_gpt_portability_review_shared_core_architecture_contract",
    },
  });
  await writeMalformedMarkdown(root, phaseApproval.artifact);
  await writeMalformedMarkdown(root, workCard.artifact);
}

function operatorDecisionRecord(stage, artifacts, outcome, operatorReason) {
  const targets = artifacts.map((artifact) => ({
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    revision: artifact.revision,
    payloadHash: artifact.payloadHash,
  })).sort((left, right) => left.artifactId.localeCompare(right.artifactId));
  const targetSetHash = createHash("sha256")
    .update(JSON.stringify({ stage, targets }), "utf8")
    .digest("hex");
  const event = {
    schemaVersion: "operator-decision-event.v1",
    stage,
    targets,
    targetSetHash,
    outcome,
    ...(operatorReason ? { operatorReason } : {}),
    decidedAt: FIXED_TIME,
  };
  return {
    schemaVersion: "operator-decision-record.v1",
    stage,
    targets,
    targetSetHash,
    outcome,
    ...(operatorReason ? { operatorReason } : {}),
    decidedAt: FIXED_TIME,
    decisionTimeline: [event],
  };
}

async function commit(service, input) {
  return service.commitArtifact({
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    status: "active",
    projectId: "champcity-ai",
    phaseId: input.phaseId,
    workCardId: input.workCardId,
    parentArtifactId: input.parentArtifactId,
    relationships: input.relationships ?? {},
    payload: {
      title: input.title,
      contentMarkdown: input.markdown,
      data: input.data,
    },
    location: input.location,
    expectedRevision: null,
  });
}

async function writeMalformedMarkdown(root, artifact) {
  const markdownPath = path.join(root, ...artifact.markdownPath.split("/"));
  await writeFile(
    markdownPath,
    `<!-- champcity-artifact-envelope\n${canonicalStringify(buildMarkdownArtifactEnvelope(artifact))}\n-->\n\n${artifact.payload.contentMarkdown}`,
    "utf8",
  );
  const written = await readFile(markdownPath, "utf8");
  assert.match(written, /"artifactId":"champcity-ai/);
}
