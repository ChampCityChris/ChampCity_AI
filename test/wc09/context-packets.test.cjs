const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  architectContextPacketScenarios,
  authorizeContextPacketExport,
  compileArchitectContextPacket,
  compileImplementerExecutionPacket,
  estimateContextTokens,
} = require("../../dist/shared/contextPackets/contextPacket.js");
const {
  ArtifactPairContextPacketWriter,
  ContextPacketService,
} = require("../../dist/main/contextPackets/contextPacketService.js");
const {
  CurrentContextPacketCompiler,
} = require("../../dist/main/contextPackets/currentContextPacketCompiler.js");
const { ArtifactPairService } = require("../../dist/main/artifacts");

const workflowState = {
  revision: 9,
  currentProjectStage: "Prove",
  activePhaseId: "phase-03",
  currentActionId: "architect_review_of_implementer_report_required",
  responsibleRole: "architect",
  authoritativeTargetArtifactId: "phase-03/work_card/WC08-REPAIR04",
  requiredSourceArtifactIds: [
    "phase-03/implementer_report/WC08-REPAIR04",
  ],
  expectedOutputArtifactId: "phase-03/architect_review/WC08-REPAIR04",
  expectedOutputArtifactType: "architect_review",
  successRoute: "operator_validation_required",
  failureRoute: "architect_review_required",
  repairRoute: "repair_sub_card_creation_required",
  blockingConditions: [],
  openRepairChain: ["WC08", "WC08-REPAIR04", "WC09"],
};

const artifacts = [
  {
    artifactId: "phase-03/work_card/WC08-REPAIR04",
    artifactType: "work_card",
    title: "WC08-REPAIR04",
    status: "active",
    phaseId: "phase-03",
    workCardId: "WC08-REPAIR04",
    summary: "Exact routed repair target.",
    content: "Acceptance criteria and route authority.",
  },
  {
    artifactId: "phase-03/implementer_report/WC08-REPAIR04",
    artifactType: "implementer_report",
    title: "WC08-REPAIR04 Implementer Report",
    status: "active",
    phaseId: "phase-03",
    workCardId: "WC08-REPAIR04",
    summary: "Exact implementation evidence.",
    content: "Changed files, checks, skipped checks, and residual risks.",
    changedSincePriorDecision: true,
  },
  {
    artifactId: "phase-03/implementer_report/WC08-REPAIR05",
    artifactType: "implementer_report",
    title: "Unrelated reference report",
    status: "historical",
    phaseId: "phase-03",
    workCardId: "WC08-REPAIR05",
    summary: "Reference-only history.",
  },
  {
    artifactId: "phase-02/work_card/WC08",
    artifactType: "work_card",
    title: "Prior-phase card",
    status: "closed",
    phaseId: "phase-02",
    workCardId: "WC08",
    summary: "Resolved prior-phase history.",
  },
];

const observations = [
  {
    observationId: "PROJ-OBS-007",
    title: "Artifact authority",
    status: "Open",
    summary: "One authoritative artifact revision is required.",
    assignedTarget: "WC09",
    phaseId: "phase-03",
  },
  {
    observationId: "PH03-OBS-003",
    title: "Resolved display issue",
    status: "Resolved",
    summary: "This should not consume packet context.",
    phaseId: "phase-03",
  },
];

function baseArchitectInput(scenario) {
  return {
    projectId: "champcity-ai",
    scenario,
    stableProjectContractSummary:
      "Preserve Capture → Frame → Plan → Build → Prove and role-owned decisions.",
    workflowState,
    artifacts,
    observations,
    controllingArtifactIds: [
      "phase-03/work_card/WC08-REPAIR04",
      "phase-03/implementer_report/WC08-REPAIR04",
    ],
    relevantPhaseId: "phase-03",
    relevantWorkCardId: "WC08-REPAIR04",
    changedEvidenceArtifactIds: [
      "phase-03/implementer_report/WC08-REPAIR04",
    ],
    exactDecisionRequested: `Make the ${scenario} decision from canonical authority.`,
  };
}

for (const scenario of architectContextPacketScenarios) {
  test(`Architect packet compiles bounded ${scenario} context`, () => {
    const packet = compileArchitectContextPacket(baseArchitectInput(scenario));

    assert.equal(packet.packetKind, "architect");
    assert.equal(packet.scenario, scenario);
    assert.match(packet.markdown, /Exact Decision Requested/);
    assert.match(packet.markdown, /WC08-REPAIR04 Implementer Report/);
    assert.match(packet.markdown, /Changed Evidence Since Prior Decision/);
    assert.ok(packet.manifest.estimatedTokens > 0);
    assert.ok(packet.manifest.largestContributors.length > 0);
    assert.ok(
      packet.manifest.excluded.some(
        (entry) => entry.id === "phase-03/implementer_report/WC08-REPAIR05",
      ),
    );
    assert.ok(
      packet.manifest.excluded.some(
        (entry) => entry.id === "PH03-OBS-003",
      ),
    );
  });
}

test("Implementer packet references permanent rules and excludes unrelated history", () => {
  const packet = compileImplementerExecutionPacket({
    projectId: "champcity-ai",
    stableProjectContractSummary: "Use canonical authority and preserve the UI contract.",
    workflowState: {
      ...workflowState,
      currentProjectStage: "Build",
      currentActionId: "implementer_handoff_required",
      responsibleRole: "implementer",
      authoritativeTargetArtifactId: "phase-03/work_card/WC09",
      requiredSourceArtifactIds: ["phase-03/work_card/WC09"],
      expectedOutputArtifactId: "phase-03/implementer_report/WC09",
      expectedOutputArtifactType: "implementer_report",
    },
    artifacts: [
      ...artifacts,
      {
        artifactId: "phase-03/work_card/WC09",
        artifactType: "work_card",
        title: "WC09",
        status: "active",
        phaseId: "phase-03",
        workCardId: "WC09",
        summary: "Current Work Card delta.",
      },
    ],
    observations,
    controllingArtifactIds: ["phase-03/work_card/WC09"],
    relevantPhaseId: "phase-03",
    relevantWorkCardId: "WC09",
    workCardId: "WC09",
    workCardTitle: "Cross-Process Workflow Authority",
    workCardDelta: "Replace fragmented authority with canonical services.",
    architectureAndUiContractReferences: [
      "docs/architecture/WORKFLOW_AUTHORITY_CONTRACT.md",
    ],
    acceptanceCriteria: ["One synchronized pair per active artifact."],
    repositoryFacts: {
      repository: "<PROJECT_REPO>",
      baseBranch:
        "feature/phase-03-wc08-repair06-current-action-architect-review-binding",
      targetBranch:
        "feature/phase-03-wc09-cross-process-workflow-stabilization",
      remote: "ChampCityChris/ChampCity_AI",
    },
    validationLaneReferences: ["docs/dev/VALIDATION_COMMAND_LANES.md"],
    expectedImplementerReportPath:
      "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09_cross_process_workflow_authority_artifact_pair_migration_and_context_packet_foundation.md",
  });

  assert.equal(packet.packetKind, "implementer");
  assert.match(packet.markdown, /AGENTS\.md.*referenced; content intentionally not repeated/);
  assert.match(packet.markdown, /IMPLEMENTER_REPORT_WC09/);
  assert.ok(
    packet.manifest.excluded.some(
      (entry) => entry.id === "phase-02/work_card/WC08",
    ),
  );
});

test("Token estimate and budget authorization are deterministic", () => {
  assert.equal(estimateContextTokens("12345678"), 2);
  assert.equal(estimateContextTokens("12345678"), estimateContextTokens("12345678"));

  const packet = compileArchitectContextPacket({
    ...baseArchitectInput("implementer_report_review"),
    budgetTokens: 1,
  });
  assert.equal(packet.manifest.overBudget, true);
  assert.equal(authorizeContextPacketExport(packet, false).allowed, false);
  assert.equal(authorizeContextPacketExport(packet, true).allowed, true);
});

test("Over-budget export writes nothing until explicit acknowledgment", async () => {
  const calls = [];
  const writer = {
    async saveBatch(requests) {
      calls.push(requests);
      return { ok: true };
    },
  };
  const service = new ContextPacketService(
    process.cwd(),
    writer,
    () => "2026-07-14T12:00:00.000Z",
  );
  const packet = compileArchitectContextPacket({
    ...baseArchitectInput("phase_closeout"),
    budgetTokens: 1,
  });
  const blocked = await service.exportPacket({
    packet,
    operatorAcknowledgedOverBudget: false,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.acknowledgementRequired, true);
  assert.equal(calls.length, 0);

  const exported = await service.exportPacket({
    packet,
    operatorAcknowledgedOverBudget: true,
  });
  assert.equal(exported.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 2);
  assert.equal(calls[0][0].artifactType, "context_packet");
  assert.equal(calls[0][1].artifactType, "context_manifest");
  assert.match(exported.manifestMarkdownPath, /_MANIFEST\.md$/);
});

test("authorized export atomically commits packet, adjacent manifest, and registry authority", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-context-export-"));
  try {
    let tick = 0;
    const pairs = new ArtifactPairService({
      projectRoot: root,
      clock: () =>
        new Date(Date.parse("2026-07-14T17:00:00.000Z") + tick++ * 1000).toISOString(),
      transactionIdFactory: () => `context-${tick}`,
    });
    const service = new ContextPacketService(
      root,
      new ArtifactPairContextPacketWriter(pairs),
      () => "2026-07-14T17:00:00.000Z",
    );
    const packet = compileArchitectContextPacket({
      ...baseArchitectInput("implementer_report_review"),
      budgetTokens: 12_000,
    });
    const exported = await service.exportPacket({
      packet,
      operatorAcknowledgedOverBudget: false,
    });
    assert.equal(exported.ok, true);
    const packetPair = await pairs.readArtifactByPaths(
      exported.packetJsonPath,
      exported.packetMarkdownPath,
    );
    const manifestPair = await pairs.readArtifactByPaths(
      exported.manifestJsonPath,
      exported.manifestMarkdownPath,
    );
    assert.equal(packetPair.artifact.artifactType, "context_packet");
    assert.equal(manifestPair.artifact.artifactType, "context_manifest");
    assert.equal(packetPair.verification.synchronized, true);
    assert.equal(manifestPair.verification.synchronized, true);
    const registry = await pairs.loadRegistry();
    assert.equal(
      registry.entries.filter((entry) =>
        [packet.packetId, `${packet.packetId}/manifest`].includes(entry.artifactId),
      ).length,
      2,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const liveIds = {
  target: "champcity-ai/phase-03/work_card/WC08-REPAIR04",
  report: "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
  validation: "champcity-ai/phase-03/validation_report/WC08-REPAIR04",
  expectedReview: "champcity-ai/phase-03/architect_review/WC08-REPAIR04",
  phasePlan: "champcity-ai/phase-03/phase_planning/current",
  workCardPlan: "champcity-ai/phase-03/work_card_plan/current",
  closeout: "champcity-ai/phase-03/phase_closeout/current",
  roadmap: "champcity-ai/project/roadmap/current",
  observations: "champcity-ai/phase-03/observation_register/current",
  unrelatedReport: "champcity-ai/phase-03/implementer_report/WC99",
};

function createLiveCompilerFixture() {
  const entries = [];
  const pairsByJsonPath = new Map();
  const add = ({
    artifactId,
    artifactType,
    title,
    content,
    data = null,
    status = "active",
    phaseId,
    workCardId,
    parentArtifactId,
    sources = [],
  }) => {
    const stem = `planning/fixture/${artifactId.replace(/[^a-zA-Z0-9]+/g, "_")}`;
    const entry = {
      artifactId,
      artifactType,
      revision: artifactId === liveIds.report ? 2 : 1,
      status,
      authoritative: ["active", "pending", "blocked"].includes(status),
      synchronized: true,
      projectId: "champcity-ai",
      ...(phaseId ? { phaseId } : {}),
      ...(workCardId ? { workCardId } : {}),
      ...(parentArtifactId ? { parentArtifactId } : {}),
      jsonPath: `${stem}.json`,
      markdownPath: `${stem}.md`,
      payloadHash: "sha256:fixture",
      relationships: {
        sources,
        expectedOutputs: [],
        supersedes: [],
        children: [],
      },
    };
    entries.push(entry);
    pairsByJsonPath.set(entry.jsonPath, {
      artifact: {
        ...entry,
        schemaVersion: "champcity.artifact.v1",
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
        payload: { kind: artifactType, title, contentMarkdown: content, data },
      },
      verification: { synchronized: true },
    });
  };

  add({
    artifactId: liveIds.target,
    artifactType: "work_card",
    title: "WC08-REPAIR04 Current Work Card",
    content: "Current repair delta and exact acceptance criteria.",
    data: {
      workCardId: "WC08-REPAIR04",
      title: "Controlled Route Recovery",
      goal: "Repair the exact routed workflow defect.",
      acceptanceCriteria: ["Use canonical authority."],
      implementerBaseBranch: "approved-base",
      implementerTargetBranch: "approved-target",
    },
    phaseId: "phase-03",
    workCardId: "WC08-REPAIR04",
    parentArtifactId: "champcity-ai/phase-03/work_card/WC08",
    sources: [liveIds.validation],
  });
  add({
    artifactId: liveIds.report,
    artifactType: "implementer_report",
    title: "WC08-REPAIR04 Current Implementer Report",
    content: "CURRENT REPORT EVIDENCE v1",
    phaseId: "phase-03",
    workCardId: "WC08-REPAIR04",
    sources: [liveIds.target],
  });
  add({
    artifactId: liveIds.validation,
    artifactType: "validation_report",
    title: "WC08-REPAIR04 New Validation Evidence",
    content: "RELEVANT NEW VALIDATION EVIDENCE",
    phaseId: "phase-03",
    workCardId: "WC08-REPAIR04",
    sources: [liveIds.target],
  });
  add({
    artifactId: liveIds.phasePlan,
    artifactType: "phase_planning",
    title: "Current Phase Plan",
    content: "Bounded phase goals and completion conditions.",
    phaseId: "phase-03",
  });
  add({
    artifactId: liveIds.workCardPlan,
    artifactType: "work_card_plan",
    title: "Current Work Card Plan",
    content: "Approved sequence and remaining delivery delta.",
    phaseId: "phase-03",
  });
  add({
    artifactId: liveIds.closeout,
    artifactType: "phase_closeout",
    title: "Current Phase Closeout Draft",
    content: "Closeout readiness, open risks, and approval boundary.",
    phaseId: "phase-03",
  });
  add({
    artifactId: liveIds.roadmap,
    artifactType: "roadmap",
    title: "Current Project Roadmap",
    content: "Next-phase boundary and project sequencing.",
  });
  add({
    artifactId: liveIds.observations,
    artifactType: "observation_register",
    title: "Phase Observation Register",
    content: "Open and resolved observation records.",
    data: {
      openObservations: [
        {
          id: "PH03-LIVE-001",
          title: "Current routed observation",
          status: "open",
          summary: "Observation relevant to WC08-REPAIR04.",
          assignedTarget: "WC08-REPAIR04",
        },
        {
          id: "PH03-LIVE-OTHER",
          title: "Other open phase observation",
          status: "open",
          summary: "Observation relevant only to phase closeout.",
          assignedTarget: "WC99",
        },
      ],
    },
    phaseId: "phase-03",
  });
  add({
    artifactId: liveIds.unrelatedReport,
    artifactType: "implementer_report",
    title: "Unrelated Active Implementer Report",
    content: "This active report belongs to another decision.",
    phaseId: "phase-03",
    workCardId: "WC99",
  });

  const routedAction = {
    schemaVersion: "champcity.routed-action.v1",
    actionId: "architect_review_of_implementer_report_required",
    stage: "prove",
    role: "architect",
    screenId: "architect-review",
    targetArtifactId: liveIds.target,
    sourceArtifactIds: [liveIds.report],
    expectedOutput: {
      artifactId: liveIds.expectedReview,
      artifactType: "architect_review",
    },
    routes: {
      success: "operator_validation_required",
      failure: "architect_review_of_implementer_report_required",
      repair: "architect_disposition_required",
    },
    bindingSource: {
      kind: "workflow_state_index",
      workflowStateArtifactId: "champcity-ai/system/workflow_state",
      stateRevision: 7,
    },
    authorityStatus: "ready",
    blockers: [],
    stateRevision: 7,
  };
  const state = {
    projectId: "champcity-ai",
    stateRevision: 7,
    currentStage: "prove",
    activePhaseId: "phase-03",
    currentAction: routedAction,
    blockingConditions: [],
    openRepairChain: {
      rootWorkCardArtifactId: "champcity-ai/phase-03/work_card/WC08",
      activeRepairArtifactIds: [liveIds.target],
    },
  };
  const authority = {
    routedActions: {
      async getAuthoritySnapshot() {
        return { state, routedAction };
      },
    },
    artifactPairs: {
      async loadRegistry() {
        return { registryVersion: 1, updatedAt: "2026-07-14T00:00:00.000Z", entries };
      },
      async readArtifactByPaths(jsonPath) {
        const pair = pairsByJsonPath.get(jsonPath);
        if (!pair) throw new Error(`Missing fixture pair ${jsonPath}`);
        return pair;
      },
    },
  };
  return {
    compiler: new CurrentContextPacketCompiler(authority),
    updateContent(artifactId, content) {
      const entry = entries.find((candidate) => candidate.artifactId === artifactId);
      pairsByJsonPath.get(entry.jsonPath).artifact.payload.contentMarkdown = content;
    },
  };
}

function includedIds(packet) {
  return new Set(packet.manifest.included.map((entry) => entry.id));
}

function changedEvidenceSection(packet) {
  return packet.markdown
    .split("## Changed Evidence Since Prior Decision")[1]
    .split("## Context Manifest Summary")[0];
}

test("live compiler selects decision-specific authority for all Architect scenarios", async () => {
  const { compiler } = createLiveCompilerFixture();
  const expectations = {
    work_card_creation: {
      included: [
        liveIds.target,
        liveIds.report,
        liveIds.validation,
        liveIds.phasePlan,
        liveIds.workCardPlan,
        liveIds.roadmap,
      ],
      excluded: [liveIds.closeout, liveIds.unrelatedReport],
    },
    implementer_report_review: {
      included: [liveIds.target, liveIds.report],
      excluded: [
        liveIds.validation,
        liveIds.phasePlan,
        liveIds.closeout,
        liveIds.unrelatedReport,
      ],
    },
    validation_disposition_and_repair: {
      included: [liveIds.target, liveIds.report, liveIds.validation],
      excluded: [liveIds.phasePlan, liveIds.closeout, liveIds.unrelatedReport],
    },
    phase_closeout: {
      included: [
        liveIds.target,
        liveIds.report,
        liveIds.validation,
        liveIds.phasePlan,
        liveIds.workCardPlan,
        liveIds.closeout,
        liveIds.roadmap,
      ],
      excluded: [liveIds.unrelatedReport],
    },
  };

  for (const [scenario, expectation] of Object.entries(expectations)) {
    const result = await compiler.preview({
      packetKind: "architect",
      architectScenario: scenario,
      budgetTokens: 777,
    });
    assert.equal(result.ok, true, result.errorMessages?.join("\n"));
    const ids = includedIds(result.packet);
    for (const artifactId of expectation.included) {
      assert.ok(ids.has(artifactId), `${scenario} should include ${artifactId}`);
    }
    for (const artifactId of expectation.excluded) {
      assert.ok(!ids.has(artifactId), `${scenario} should exclude ${artifactId}`);
      assert.ok(
        result.packet.manifest.excluded.some(
          (entry) => entry.id === artifactId && entry.reason.length > 0,
        ),
        `${scenario} should explain exclusion of ${artifactId}`,
      );
    }
    assert.equal(result.packet.manifest.budgetTokens, 777);
  }
});

test("live compiler marks materialized current and new evidence, never a missing expected output", async () => {
  const fixture = createLiveCompilerFixture();
  const review = await fixture.compiler.preview({
    packetKind: "architect",
    architectScenario: "implementer_report_review",
  });
  assert.equal(review.ok, true);
  assert.match(review.packet.markdown, /CURRENT REPORT EVIDENCE v1/);
  const reviewChanged = changedEvidenceSection(review.packet);
  assert.match(reviewChanged, /implementer_report\/WC08-REPAIR04/);
  assert.doesNotMatch(reviewChanged, /architect_review\/WC08-REPAIR04/);

  fixture.updateContent(liveIds.report, "CURRENT REPORT EVIDENCE v2 FROM LIVE AUTHORITY");
  const refreshedReview = await fixture.compiler.preview({
    packetKind: "architect",
    architectScenario: "implementer_report_review",
  });
  assert.equal(refreshedReview.ok, true);
  assert.match(refreshedReview.packet.markdown, /v2 FROM LIVE AUTHORITY/);
  assert.doesNotMatch(refreshedReview.packet.markdown, /CURRENT REPORT EVIDENCE v1/);

  const disposition = await fixture.compiler.preview({
    packetKind: "architect",
    architectScenario: "validation_disposition_and_repair",
  });
  assert.equal(disposition.ok, true);
  assert.match(disposition.packet.markdown, /RELEVANT NEW VALIDATION EVIDENCE/);
  const dispositionChanged = changedEvidenceSection(disposition.packet);
  assert.match(dispositionChanged, /implementer_report\/WC08-REPAIR04/);
  assert.match(dispositionChanged, /validation_report\/WC08-REPAIR04/);
  assert.doesNotMatch(dispositionChanged, /architect_review\/WC08-REPAIR04/);
});

test("live compiler builds Implementer execution context from the Work Card and antecedents", async () => {
  const { compiler } = createLiveCompilerFixture();
  const result = await compiler.preview({
    packetKind: "implementer",
    budgetTokens: 901,
  });
  assert.equal(result.ok, true, result.errorMessages?.join("\n"));
  const ids = includedIds(result.packet);
  assert.ok(ids.has(liveIds.target));
  assert.ok(ids.has(liveIds.validation));
  assert.ok(!ids.has(liveIds.report));
  assert.ok(!ids.has(liveIds.phasePlan));
  assert.match(result.packet.markdown, /Current repair delta and exact acceptance criteria/);
  assert.match(result.packet.markdown, /RELEVANT NEW VALIDATION EVIDENCE/);
  assert.match(result.packet.markdown, /approved-base/);
  assert.match(result.packet.markdown, /approved-target/);
  assert.equal(result.packet.manifest.budgetTokens, 901);
  assert.ok(
    result.packet.manifest.excluded.some(
      (entry) =>
        entry.id === liveIds.report &&
        entry.reason === "Artifact is unrelated to the current target or decision.",
    ),
  );
});
