const assert = require("node:assert/strict");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
} = require("../../dist/shared/artifacts");
const {
  ProjectWorkspaceRegistry,
} = require("../../dist/main/projects");
const {
  RepositoryObserver,
  RepositoryRefreshService,
  scanVerifiedArtifactGraph,
} = require("../../dist/main/repository");
const {
  EvidenceDerivedWorkflowProjector,
} = require("../../dist/main/workflow/evidenceDerivedWorkflowProjector");
const {
  configureWorkCardRepositoryRoot,
  listHumanValidationTargets,
  listSavedWorkCards,
} = require("../../dist/main/workCards/workCardFileStore");

const FIXED_TIME = "2026-07-15T21:00:00.000Z";

async function temporaryRoot(prefix, run) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    await mkdir(path.join(root, "planning"), { recursive: true });
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: path.basename(root).toLowerCase() }),
      "utf8",
    );
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function project(root, projectId = "project-alpha") {
  return {
    projectId,
    displayName: projectId,
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

async function writeArtifact(root, input) {
  const jsonPath = `${input.stem}.json`;
  const markdownPath = `${input.stem}.md`;
  const artifact = buildCanonicalArtifact({
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    revision: input.revision ?? 1,
    status: input.status ?? "active",
    projectId: input.projectId,
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    ...(input.workCardId ? { workCardId: input.workCardId } : {}),
    ...(input.parentArtifactId ? { parentArtifactId: input.parentArtifactId } : {}),
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    jsonPath,
    markdownPath,
    relationships: {
      sources: input.sources ?? [],
      expectedOutputs: input.expectedOutputs ?? [],
      supersedes: input.supersedes ?? [],
      children: input.children ?? [],
    },
    payload: {
      kind: input.artifactType,
      title: input.title ?? `${input.artifactType} ${input.workCardId ?? ""}`.trim(),
      contentMarkdown: input.contentMarkdown ?? `# ${input.title ?? input.artifactType}\n`,
      data: input.data ?? {},
    },
  });
  const absoluteJson = path.join(root, ...jsonPath.split("/"));
  const absoluteMarkdown = path.join(root, ...markdownPath.split("/"));
  await mkdir(path.dirname(absoluteJson), { recursive: true });
  await writeFile(absoluteJson, canonicalPrettyStringify(artifact), "utf8");
  await writeFile(absoluteMarkdown, renderArtifactMarkdown(artifact), "utf8");
  return artifact;
}

async function seedWorkCardLoop(root, projectId, phaseId, workCardId, options = {}) {
  await writeArtifact(root, {
    projectId,
    phaseId,
    artifactId: `${projectId}/${phaseId}/phase_activation/${phaseId}`,
    artifactType: "phase_activation",
    stem: `planning/phases/${phaseId}/Phase_Activation`,
    data: { status: "active", phaseId },
  });
  await writeArtifact(root, {
    projectId,
    phaseId,
    artifactId: `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`,
    artifactType: "work_card_plan",
    stem: `planning/phases/${phaseId}/Work_Card_Plan`,
    data: {
      status: "approved",
      candidates: [{ id: options.candidateId ?? workCardId.replace(/-REPAIR\d+$/i, ""), title: "Authority cutover", order: 1 }],
    },
  });
  await writeArtifact(root, {
    projectId,
    phaseId,
    artifactId: `${projectId}/${phaseId}/approval/Operator_Phase_Approval`,
    artifactType: "phase_approval",
    stem: `planning/phases/${phaseId}/Operator_Phase_Approval`,
    data: { decision: "approved" },
  });
  return writeArtifact(root, {
    projectId,
    phaseId,
    workCardId,
      artifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
      artifactType: "work_card",
      stem: `planning/phases/${phaseId}/Work_Cards/${workCardId}_authority_cutover`,
      expectedOutputs: [
        options.expectedImplementerReportId ??
          `${projectId}/${phaseId}/implementer_report/${workCardId}`,
      ],
      data: { workCardId, status: "ready_for_implementer", ...options.workCardData },
    });
}

async function projectGraph(root, projectId = "project-alpha", revision = 1) {
  const configured = project(root, projectId);
  const graph = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
  const projection = new EvidenceDerivedWorkflowProjector().project(configured, graph, revision);
  return { graph, projection };
}

test("configured repositories persist selection and remain isolated", async () => {
  await temporaryRoot("champcity-projects-a-", async (rootA) => {
    await temporaryRoot("champcity-projects-b-", async (rootB) => {
      const storage = path.join(os.tmpdir(), `champcity-workspaces-${process.pid}-${Date.now()}.json`);
      try {
        const registry = new ProjectWorkspaceRegistry({ storagePath: storage, clock: () => FIXED_TIME });
        const first = await registry.addProject({ repositoryRoot: rootA, projectId: "alpha" });
        const second = await registry.addProject({ repositoryRoot: rootB, projectId: "beta" });
        assert.notEqual(first.repositoryRoot, second.repositoryRoot);
        await registry.selectProject("beta");
        const reloaded = new ProjectWorkspaceRegistry({ storagePath: storage });
        assert.equal((await reloaded.getSelected()).projectId, "beta");
        assert.equal((await reloaded.getSelected()).repositoryRoot, path.resolve(rootB));
        assert.equal((await reloaded.list()).length, 2);
      } finally {
        await rm(storage, { force: true });
      }
    });
  });
});

test("project registration rejects duplicate roots, duplicate IDs, and invalid folders clearly", async () => {
  await temporaryRoot("champcity-projects-duplicates-a-", async (rootA) => {
    await temporaryRoot("champcity-projects-duplicates-b-", async (rootB) => {
      const storage = path.join(os.tmpdir(), `champcity-workspaces-duplicates-${process.pid}-${Date.now()}.json`);
      const invalidRoot = path.join(os.tmpdir(), `champcity-invalid-${process.pid}-${Date.now()}`);
      await mkdir(invalidRoot, { recursive: true });
      try {
        const registry = new ProjectWorkspaceRegistry({ storagePath: storage, clock: () => FIXED_TIME });
        await registry.addProject({ repositoryRoot: rootA, projectId: "alpha" });
        await assert.rejects(
          () => registry.addProject({ repositoryRoot: rootA, projectId: "alpha-copy" }),
          /already registered/i,
        );
        await assert.rejects(
          () => registry.addProject({ repositoryRoot: rootB, projectId: "alpha" }),
          /already belongs to another repository/i,
        );
        await assert.rejects(
          () => registry.addProject({ repositoryRoot: invalidRoot, projectId: "invalid" }),
          /supported ChampCity workspace/i,
        );
      } finally {
        await rm(storage, { force: true });
        await rm(invalidRoot, { recursive: true, force: true });
      }
    });
  });
});

test("invalid selected project is not listed or returned as active route authority", async () => {
  await temporaryRoot("champcity-projects-moved-", async (root) => {
    const storage = path.join(os.tmpdir(), `champcity-workspaces-moved-${process.pid}-${Date.now()}.json`);
    try {
      const registry = new ProjectWorkspaceRegistry({ storagePath: storage, clock: () => FIXED_TIME });
      await registry.addProject({ repositoryRoot: root, projectId: "moved-project" });
      await registry.selectProject("moved-project");
      await rm(root, { recursive: true, force: true });

      assert.equal(await registry.getSelected(), null);
      assert.deepEqual(await registry.list(), []);
    } finally {
      await rm(storage, { force: true });
    }
  });
});

test("external Implementer Report advances WC01 to exact Architect Review route without registry import", async () => {
  await temporaryRoot("champcity-wc01-external-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-04";
    const workCardId = "WC01";
    await seedWorkCardLoop(root, projectId, phaseId, workCardId);
    let result = await projectGraph(root, projectId);
    assert.equal(result.projection.state.currentAction.actionId, "implementer_execution_required");

    await writeArtifact(root, {
      projectId,
      phaseId,
      workCardId,
      artifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}`,
      artifactType: "implementer_report",
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_authority_cutover`,
      sources: [`${projectId}/${phaseId}/work_card/${workCardId}`],
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
      data: { workCardId, status: "implemented_awaiting_architect_review" },
    });
    result = await projectGraph(root, projectId, 2);
    const action = result.projection.state.currentAction;
    assert.equal(action.actionId, "architect_review_of_implementer_report_required");
    assert.equal(action.targetArtifactId, `${projectId}/${phaseId}/work_card/${workCardId}`);
    assert.deepEqual(action.sourceArtifactIds, [`${projectId}/${phaseId}/implementer_report/${workCardId}`]);
    assert.deepEqual(action.expectedOutput, {
      artifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
      artifactType: "architect_review",
    });
    assert.equal(action.bindingSource.kind, "evidence_projection");
    assert.equal(result.graph.nodes.some((node) => node.artifact.artifactType === "artifact_registry"), false);
  });
});

test("external Architect Review, Validation Report, and explicit repair decision project governed routes", async () => {
  await temporaryRoot("champcity-review-validation-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-04";
    const workCardId = "WC01";
    await seedWorkCardLoop(root, projectId, phaseId, workCardId);
    await writeArtifact(root, {
      projectId, phaseId, workCardId,
      artifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}`,
      artifactType: "implementer_report",
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_authority_cutover`,
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId,
      artifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
      artifactType: "architect_review",
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_${workCardId}_authority_cutover`,
      expectedOutputs: [`${projectId}/${phaseId}/validation_report/${workCardId}`],
      data: { decision: "Ready for Operator validation", operatorValidationAuthorized: true },
    });
    let result = await projectGraph(root, projectId);
    assert.equal(result.projection.state.currentAction.actionId, "operator_validation_required");

    await writeArtifact(root, {
      projectId, phaseId, workCardId,
      artifactId: `${projectId}/${phaseId}/validation_report/${workCardId}`,
      artifactType: "validation_report",
      status: "blocked",
      stem: `planning/phases/${phaseId}/Validation_Reports/VALIDATION_REPORT_${workCardId}_authority_cutover`,
      data: { result: "Fail" },
    });
    result = await projectGraph(root, projectId, 2);
    assert.equal(result.projection.state.currentAction.actionId, "architect_disposition_required");
  });
});

test("canonical Work Card artifacts never require retired Saved Work Card fields or block WC01 validation routing", async () => {
  await temporaryRoot("champcity-canonical-work-card-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-04";
    const workCardId = "WC01";
    await seedWorkCardLoop(root, projectId, phaseId, workCardId, {
      workCardData: {
        phaseId,
        status: "ready_for_implementer",
      },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId,
      artifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}`,
      artifactType: "implementer_report",
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_authority_cutover`,
      sources: [`${projectId}/${phaseId}/work_card/${workCardId}`],
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
      data: { workCardId, status: "implemented_awaiting_architect_review" },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId,
      artifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
      artifactType: "architect_review",
      revision: 2,
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_${workCardId}_authority_cutover`,
      sources: [`${projectId}/${phaseId}/implementer_report/${workCardId}`],
      expectedOutputs: [`${projectId}/${phaseId}/validation_report/${workCardId}`],
      data: {
        decision: "Ready for Operator validation",
        operatorValidationAuthorized: true,
        expectedOutputs: [`${projectId}/${phaseId}/validation_report/${workCardId}`],
      },
    });

    configureWorkCardRepositoryRoot(root, projectId);
    const listed = await listSavedWorkCards(phaseId);
    assert.equal(listed.ok, true);
    assert.equal(listed.invalidFiles?.length ?? 0, 0);
    assert.equal(listed.workCards?.[0]?.workCardId, workCardId);
    assert.equal(
      JSON.stringify(listed).includes("Saved Work Card JSON is not valid"),
      false,
    );

    const targets = await listHumanValidationTargets(phaseId);
    assert.equal(targets.ok, true);
    assert.equal(targets.invalidFiles?.length ?? 0, 0);
    assert.equal(targets.targets?.some((target) => target.id === workCardId), true);

    const storage = path.join(os.tmpdir(), `champcity-canonical-wc-${process.pid}-${Date.now()}.json`);
    try {
      const registry = new ProjectWorkspaceRegistry({ storagePath: storage, clock: () => FIXED_TIME });
      await registry.addProject({ repositoryRoot: root, projectId });
      const configured = await registry.selectProject(projectId);
      const service = new RepositoryRefreshService(configured, registry, undefined, () => FIXED_TIME);
      const snapshot = await service.refresh("manual");
      const action = snapshot.projection.state.currentAction;

      assert.equal(snapshot.scanResult.blockers.length, 0);
      assert.equal(action.actionId, "operator_validation_required");
      assert.equal(action.targetArtifactId, `${projectId}/${phaseId}/work_card/${workCardId}`);
      assert.equal(action.expectedOutput.artifactId, `${projectId}/${phaseId}/validation_report/${workCardId}`);
      assert.equal(
        snapshot.projection.state.blockingConditions.some((blocker) =>
          blocker.message.includes("Saved Work Card JSON is not valid"),
        ),
        false,
      );
      assert.equal(
        snapshot.projection.state.blockingConditions.some((blocker) =>
          blocker.message.includes("Implementer Report association needs attention"),
        ),
        false,
      );
    } finally {
      await rm(storage, { force: true });
    }
  });
});

test("final repair routes combined parent review, parent validation, and completed_via_repair before the next candidate", async () => {
  await temporaryRoot("champcity-repair-limit-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-04";
    await seedWorkCardLoop(root, projectId, phaseId, "WC01", {
      workCardData: { maxRepairCount: 1 },
    });
    await writeArtifact(root, {
      projectId, phaseId,
      artifactId: `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`,
      artifactType: "work_card_plan",
      revision: 2,
      stem: `planning/phases/${phaseId}/Work_Card_Plan`,
      data: {
        status: "approved",
        candidates: [
          { id: "WC01", title: "Authority cutover", order: 1 },
          { id: "WC02", title: "Next approved candidate", order: 2 },
        ],
      },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC02",
      artifactId: `${projectId}/${phaseId}/work_card/WC02`,
      artifactType: "work_card",
      stem: `planning/phases/${phaseId}/Work_Cards/WC02_next_candidate`,
      expectedOutputs: [`${projectId}/${phaseId}/implementer_report/WC02`],
      data: { workCardId: "WC02", status: "ready_for_implementer" },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/implementer_report/WC01`,
      artifactType: "implementer_report",
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01_authority_cutover`,
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/WC01`],
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/architect_review/WC01`,
      artifactType: "architect_review",
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01_authority_cutover`,
      expectedOutputs: [`${projectId}/${phaseId}/work_card/WC01-REPAIR01`],
      data: { decision: "Repair required before Operator validation", requiredRepairId: "WC01-REPAIR01" },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01-REPAIR01",
      parentArtifactId: `${projectId}/${phaseId}/work_card/WC01`,
      artifactId: `${projectId}/${phaseId}/work_card/WC01-REPAIR01`,
      artifactType: "work_card",
      stem: `planning/phases/${phaseId}/Work_Cards/WC01-REPAIR01_authority_cutover`,
      expectedOutputs: [`${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`],
      sources: [
        `${projectId}/${phaseId}/work_card/WC01`,
        `${projectId}/${phaseId}/architect_review/WC01`,
      ],
      data: {
        workCardId: "WC01-REPAIR01",
        finalNumberedRepair: true,
        authorizingArchitectReviewRevision: 1,
        logicalRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`,
        controllingRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`,
      },
    });
    let result = await projectGraph(root, projectId);
    assert.equal(result.projection.state.currentAction.actionId, "implementer_execution_required");
    assert.equal(result.projection.state.currentAction.targetArtifactId, `${projectId}/${phaseId}/work_card/WC01-REPAIR01`);

    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01-REPAIR01",
      artifactId: `${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`,
      artifactType: "implementer_report",
      parentArtifactId: `${projectId}/${phaseId}/work_card/WC01`,
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_authority_cutover`,
      sources: [`${projectId}/${phaseId}/work_card/WC01-REPAIR01`],
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/WC01`],
    });
    result = await projectGraph(root, projectId, 2);
    let action = result.projection.state.currentAction;
    assert.equal(action.actionId, "architect_review_of_implementer_report_required");
    assert.equal(action.targetArtifactId, `${projectId}/${phaseId}/work_card/WC01`);
    assert.deepEqual(action.sourceArtifactIds, [
      `${projectId}/${phaseId}/implementer_report/WC01`,
      `${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`,
      `${projectId}/${phaseId}/architect_review/WC01`,
      `${projectId}/${phaseId}/work_card/WC01-REPAIR01`,
    ]);
    assert.equal(action.expectedOutput.artifactId, `${projectId}/${phaseId}/architect_review/WC01`);
    assert.equal(result.projection.repairLineage.finalNumberedRepair, true);

    // Repair-specific review/validation evidence cannot independently complete the parent.
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01-REPAIR01",
      artifactId: `${projectId}/${phaseId}/architect_review/WC01-REPAIR01`,
      artifactType: "architect_review",
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01-REPAIR01_authority_cutover`,
      expectedOutputs: [`${projectId}/${phaseId}/validation_report/WC01-REPAIR01`],
      data: { decision: "Ready for Operator validation", operatorValidationAuthorized: true },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01-REPAIR01",
      artifactId: `${projectId}/${phaseId}/validation_report/WC01-REPAIR01`,
      artifactType: "validation_report",
      stem: `planning/phases/${phaseId}/Validation_Reports/VALIDATION_REPORT_WC01-REPAIR01`,
      data: { result: "Pass" },
    });
    result = await projectGraph(root, projectId, 3);
    assert.equal(result.projection.state.currentAction.actionId, "architect_review_of_implementer_report_required");
    assert.equal(result.projection.state.currentAction.targetArtifactId, `${projectId}/${phaseId}/work_card/WC01`);

    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/architect_review/WC01`,
      artifactType: "architect_review",
      revision: 2,
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01_authority_cutover`,
      sources: [
        `${projectId}/${phaseId}/implementer_report/WC01`,
        `${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`,
        `${projectId}/${phaseId}/work_card/WC01-REPAIR01`,
      ],
      expectedOutputs: [`${projectId}/${phaseId}/validation_report/WC01`],
      data: {
        decision: "Ready for Operator validation",
        operatorValidationAuthorized: true,
        reviewScope: "combined_parent_and_final_repair",
        combinedParentReview: true,
        repairedParentWorkCardArtifactId: `${projectId}/${phaseId}/work_card/WC01`,
        repairWorkCardArtifactId: `${projectId}/${phaseId}/work_card/WC01-REPAIR01`,
        authorizingArchitectReviewArtifactId: `${projectId}/${phaseId}/architect_review/WC01`,
        authorizingArchitectReviewRevision: 1,
      },
    });
    result = await projectGraph(root, projectId, 4);
    action = result.projection.state.currentAction;
    assert.equal(action.actionId, "operator_validation_required");
    assert.equal(action.targetArtifactId, `${projectId}/${phaseId}/work_card/WC01`);
    assert.equal(action.expectedOutput.artifactId, `${projectId}/${phaseId}/validation_report/WC01`);

    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/validation_report/WC01`,
      artifactType: "validation_report",
      stem: `planning/phases/${phaseId}/Validation_Reports/VALIDATION_REPORT_WC01`,
      sources: [`${projectId}/${phaseId}/architect_review/WC01`],
      data: { validationResult: "Pass", workCardId: "WC01" },
    });
    result = await projectGraph(root, projectId, 5);
    action = result.projection.state.currentAction;
    assert.equal(action.actionId, "architect_disposition_required");
    assert.equal(action.screenId, "architect-bridge");
    assert.equal(action.targetArtifactId, `${projectId}/${phaseId}/work_card/WC01`);
    assert.equal(action.expectedOutput.artifactId, `${projectId}/${phaseId}/candidate_disposition/WC01`);
    assert.equal(action.expectedOutput.artifactType, "candidate_disposition");
    assert.deepEqual(action.sourceArtifactIds, [
      `${projectId}/${phaseId}/validation_report/WC01`,
      `${projectId}/${phaseId}/architect_review/WC01`,
      `${projectId}/${phaseId}/work_card/WC01`,
      `${projectId}/${phaseId}/implementer_report/WC01`,
      `${projectId}/${phaseId}/work_card/WC01-REPAIR01`,
      `${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`,
    ]);

    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/candidate_disposition/WC01`,
      artifactType: "candidate_disposition",
      stem: `planning/phases/${phaseId}/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC01`,
      sources: [
        `${projectId}/${phaseId}/work_card/WC01`,
        `${projectId}/${phaseId}/implementer_report/WC01`,
        `${projectId}/${phaseId}/architect_review/WC01`,
        `${projectId}/${phaseId}/work_card/WC01-REPAIR01`,
        `${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`,
        `${projectId}/${phaseId}/validation_report/WC01`,
      ],
      data: { status: "completed_via_repair", workCardId: "WC01" },
    });
    result = await projectGraph(root, projectId, 6);
    action = result.projection.state.currentAction;
    assert.equal(result.projection.state.phaseExecution.approvedCandidates[0].resolutionStatus, "completed_via_repair");
    assert.equal(action.actionId, "implementer_execution_required");
    assert.equal(action.targetArtifactId, `${projectId}/${phaseId}/work_card/WC02`);
    assert.equal(result.graph.byType("work_card", phaseId).some((node) => node.artifact.workCardId === "WC01-REPAIR02"), false);
  });
});

test("incomplete, invalid, and duplicate canonical authority block visibly", async () => {
  await temporaryRoot("champcity-graph-blockers-", async (root) => {
    const projectId = "project-alpha";
    const artifact = await writeArtifact(root, {
      projectId,
      artifactId: `${projectId}/project/supporting_document/duplicate`,
      artifactType: "supporting_document",
      stem: "planning/project/duplicate_one",
    });
    await writeArtifact(root, {
      projectId,
      artifactId: artifact.artifactId,
      artifactType: artifact.artifactType,
      stem: "planning/project/duplicate_two",
    });
    await writeArtifact(root, {
      projectId,
      artifactId: artifact.artifactId,
      artifactType: artifact.artifactType,
      stem: "planning/project/duplicate_three",
    });
    const incompleteJson = path.join(root, "planning", "project", "incomplete.json");
    await writeFile(incompleteJson, canonicalPrettyStringify(artifact), "utf8");
    const invalidMarkdown = path.join(root, "planning", "project", "duplicate_one.md");
    await writeFile(invalidMarkdown, `${await readFile(invalidMarkdown, "utf8")}tamper`, "utf8");
    const graph = await scanVerifiedArtifactGraph(project(root, projectId), () => FIXED_TIME);
    assert.ok(graph.blockers.some((blocker) => blocker.code === "duplicate_authority"));
    assert.ok(graph.blockers.some((blocker) => blocker.code === "incomplete_pair"));
    assert.ok(graph.blockers.some((blocker) => blocker.code === "invalid_pair"));
  });
});

test("ambiguous repaired-parent lineage blocks visibly and never invents WC01-REPAIR02", async () => {
  await temporaryRoot("champcity-repair-lineage-block-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-04";
    const parentArtifactId = `${projectId}/${phaseId}/work_card/WC01`;
    await seedWorkCardLoop(root, projectId, phaseId, "WC01", {
      workCardData: { maxRepairCount: 1 },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/implementer_report/WC01`,
      artifactType: "implementer_report",
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01`,
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/WC01`],
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/architect_review/WC01`,
      artifactType: "architect_review",
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01`,
      expectedOutputs: [`${projectId}/${phaseId}/work_card/WC01-REPAIR01`],
      data: { decision: "Repair required before Operator validation", requiredRepairId: "WC01-REPAIR01" },
    });
    for (const repairId of ["WC01-REPAIR01", "WC01-REPAIR03"]) {
      await writeArtifact(root, {
        projectId, phaseId, workCardId: repairId,
        parentArtifactId,
        artifactId: `${projectId}/${phaseId}/work_card/${repairId}`,
        artifactType: "work_card",
        stem: `planning/phases/${phaseId}/Work_Cards/${repairId}`,
        sources: [`${projectId}/${phaseId}/architect_review/WC01`],
        expectedOutputs: [`${projectId}/${phaseId}/implementer_report/${repairId}`],
        data: { workCardId: repairId, finalNumberedRepair: true },
      });
    }
    const result = await projectGraph(root, projectId);
    assert.equal(result.projection.state.currentAction.authorityStatus, "blocked");
    assert.ok(result.projection.state.blockingConditions.some((blocker) => blocker.code === "repair_lineage_ambiguous"));
    assert.equal(result.graph.byType("work_card", phaseId).some((node) => node.artifact.workCardId === "WC01-REPAIR02"), false);
  });
});

test("refresh is a no-op on identical evidence, recomputes after restart, and ignores stale Workflow State cache", async () => {
  await temporaryRoot("champcity-refresh-restart-", async (root) => {
    const projectId = "project-alpha";
    await seedWorkCardLoop(root, projectId, "phase-04", "WC01");
    await writeArtifact(root, {
      projectId,
      artifactId: `${projectId}/system/workflow_state`,
      artifactType: "workflow_state",
      stem: "planning/system/Workflow_State/WORKFLOW_STATE_INDEX",
      data: { currentActionId: "project_intake_required", stateRevision: 999 },
    });
    const storage = path.join(os.tmpdir(), `champcity-refresh-${process.pid}-${Date.now()}.json`);
    try {
      const registry = new ProjectWorkspaceRegistry({ storagePath: storage, clock: () => FIXED_TIME });
      await registry.addProject({ repositoryRoot: root, projectId });
      const configured = await registry.selectProject(projectId);
      const firstService = new RepositoryRefreshService(configured, registry, undefined, () => FIXED_TIME);
      const first = await firstService.refresh("manual");
      const repeated = await firstService.refresh("manual");
      assert.equal(repeated.scanResult.noOp, true);
      assert.equal(repeated.scanResult.projectionRevision, first.scanResult.projectionRevision);
      assert.equal(first.projection.state.currentAction.actionId, "implementer_execution_required");

      const restarted = new RepositoryRefreshService(configured, registry, undefined, () => FIXED_TIME);
      const afterRestart = await restarted.refresh("application-start");
      assert.equal(afterRestart.projection.state.currentAction.actionId, first.projection.state.currentAction.actionId);
      assert.equal(afterRestart.projection.state.currentAction.bindingSource.kind, "evidence_projection");
    } finally {
      await rm(storage, { force: true });
    }
  });
});

test("manual refresh and cold start produce the same route after committed disposition evidence", async () => {
  await temporaryRoot("champcity-refresh-cold-start-parity-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-04";
    await seedWorkCardLoop(root, projectId, phaseId, "WC01");
    await writeArtifact(root, {
      projectId,
      phaseId,
      artifactId: `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`,
      artifactType: "work_card_plan",
      revision: 2,
      stem: `planning/phases/${phaseId}/Work_Card_Plan`,
      data: {
        status: "approved",
        candidates: [
          { id: "WC01", title: "Completed candidate", order: 1 },
          { id: "WC02", title: "Next candidate", order: 2 },
        ],
      },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC02",
      artifactId: `${projectId}/${phaseId}/work_card/WC02`,
      artifactType: "work_card",
      stem: `planning/phases/${phaseId}/Work_Cards/WC02_next_candidate`,
      expectedOutputs: [`${projectId}/${phaseId}/implementer_report/WC02`],
      data: { workCardId: "WC02", status: "ready_for_implementer" },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/implementer_report/WC01`,
      artifactType: "implementer_report",
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01`,
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/WC01`],
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/architect_review/WC01`,
      artifactType: "architect_review",
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01`,
      expectedOutputs: [`${projectId}/${phaseId}/validation_report/WC01`],
      data: { decision: "Ready for Operator validation", operatorValidationAuthorized: true },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01",
      artifactId: `${projectId}/${phaseId}/validation_report/WC01`,
      artifactType: "validation_report",
      stem: `planning/phases/${phaseId}/Validation_Reports/VALIDATION_REPORT_WC01`,
      data: { validationResult: "Pass" },
    });

    const storage = path.join(os.tmpdir(), `champcity-parity-${process.pid}-${Date.now()}.json`);
    try {
      const registry = new ProjectWorkspaceRegistry({ storagePath: storage, clock: () => FIXED_TIME });
      await registry.addProject({ repositoryRoot: root, projectId });
      const configured = await registry.selectProject(projectId);
      const manual = new RepositoryRefreshService(configured, registry, undefined, () => FIXED_TIME);
      const beforeDisposition = await manual.refresh("manual");
      assert.equal(beforeDisposition.projection.state.currentAction.actionId, "implementer_execution_required");
      assert.equal(beforeDisposition.projection.state.currentAction.targetArtifactId, `${projectId}/${phaseId}/work_card/WC02`);

      await writeArtifact(root, {
        projectId, phaseId, workCardId: "WC01",
        artifactId: `${projectId}/${phaseId}/candidate_disposition/WC01`,
        artifactType: "candidate_disposition",
        stem: `planning/phases/${phaseId}/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC01`,
        sources: [`${projectId}/${phaseId}/validation_report/WC01`],
        data: { status: "completed", workCardId: "WC01" },
      });

      const afterManual = await manual.refresh("manual");
      const coldStart = await new RepositoryRefreshService(configured, registry, undefined, () => FIXED_TIME)
        .refresh("application-start");
      assert.equal(afterManual.projection.state.currentAction.actionId, coldStart.projection.state.currentAction.actionId);
      assert.equal(afterManual.projection.state.currentAction.targetArtifactId, coldStart.projection.state.currentAction.targetArtifactId);
      assert.equal(afterManual.scanResult.currentAction.actionId, coldStart.scanResult.currentAction.actionId);
      assert.equal((await registry.getSelected()).projectId, projectId);
    } finally {
      await rm(storage, { force: true });
    }
  });
});

test("multiple configured projects refresh independently without route bleed", async () => {
  await temporaryRoot("champcity-route-isolation-a-", async (rootA) => {
    await temporaryRoot("champcity-route-isolation-b-", async (rootB) => {
      const storage = path.join(os.tmpdir(), `champcity-route-isolation-${process.pid}-${Date.now()}.json`);
      try {
        await seedWorkCardLoop(rootA, "project-alpha", "phase-04", "WC01");
        await seedWorkCardLoop(rootB, "project-beta", "phase-04", "WC09");
        const registry = new ProjectWorkspaceRegistry({ storagePath: storage, clock: () => FIXED_TIME });
        await registry.addProject({ repositoryRoot: rootA, projectId: "project-alpha" });
        await registry.addProject({ repositoryRoot: rootB, projectId: "project-beta" });

        const alpha = await registry.selectProject("project-alpha");
        const alphaSnapshot = await new RepositoryRefreshService(alpha, registry, undefined, () => FIXED_TIME)
          .refresh("manual");
        await registry.selectProject("project-beta");
        const beta = await registry.getSelected();
        const betaSnapshot = await new RepositoryRefreshService(beta, registry, undefined, () => FIXED_TIME)
          .refresh("manual");

        assert.equal(alphaSnapshot.projection.state.projectId, "project-alpha");
        assert.equal(alphaSnapshot.projection.state.currentAction.targetArtifactId, "project-alpha/phase-04/work_card/WC01");
        assert.equal(betaSnapshot.projection.state.projectId, "project-beta");
        assert.equal(betaSnapshot.projection.state.currentAction.targetArtifactId, "project-beta/phase-04/work_card/WC09");
        assert.equal(betaSnapshot.projection.state.currentAction.targetArtifactId.includes("project-alpha"), false);
      } finally {
        await rm(storage, { force: true });
      }
    });
  });
});

test("WC09-REPAIR02 regression binds exact report/review and routes validation without reference retargeting", async () => {
  await temporaryRoot("champcity-wc09-regression-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-03";
    const repairId = "WC09-REPAIR02";
    await seedWorkCardLoop(root, projectId, phaseId, repairId, {
      candidateId: repairId,
      workCardData: { finalNumberedRepair: true },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: repairId,
      artifactId: `${projectId}/${phaseId}/implementer_report/${repairId}`,
      artifactType: "implementer_report",
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}_locked_contract`,
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/${repairId}`],
    });
    let result = await projectGraph(root, projectId);
    assert.equal(result.projection.state.currentAction.targetArtifactId, `${projectId}/${phaseId}/work_card/${repairId}`);
    assert.deepEqual(result.projection.state.currentAction.sourceArtifactIds, [`${projectId}/${phaseId}/implementer_report/${repairId}`]);
    await writeArtifact(root, {
      projectId, phaseId, workCardId: repairId,
      artifactId: `${projectId}/${phaseId}/architect_review/${repairId}`,
      artifactType: "architect_review",
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_${repairId}_locked_contract`,
      expectedOutputs: [`${projectId}/${phaseId}/validation_report/${repairId}`],
      data: { decision: "Ready for Operator validation", operatorValidationAuthorized: true },
    });
    result = await projectGraph(root, projectId, 2);
    assert.equal(result.projection.state.currentAction.actionId, "operator_validation_required");
    assert.equal(result.projection.state.currentAction.targetArtifactId, `${projectId}/${phaseId}/work_card/${repairId}`);
  });
});

test("live WC02 evidence routes to parent Operator Validation despite later repair Work Card", async () => {
  await temporaryRoot("champcity-wc02-repair02-regression-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-04";
    const parentId = "WC02";
    const parentReportId = `${projectId}/${phaseId}/implementer_report/WC02-architect-bridge-current-action-surface-audit`;
    const repairId = "WC02-REPAIR01";
    const repairReportId = `${projectId}/${phaseId}/implementer_report/WC02-REPAIR01-architect-bridge-contract-alignment-task-packet-generation-repair`;
    await seedWorkCardLoop(root, projectId, phaseId, parentId, {
      expectedImplementerReportId: parentReportId,
      workCardData: { maxRepairCount: 1 },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: parentId,
      artifactId: parentReportId,
      artifactType: "implementer_report",
      parentArtifactId: `${projectId}/${phaseId}/work_card/${parentId}`,
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC02_architect_bridge_current_action_surface_audit`,
      sources: [`${projectId}/${phaseId}/work_card/${parentId}`],
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/${parentId}`],
      data: { workCardId: parentId, status: "implemented_awaiting_architect_review" },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: repairId,
      artifactId: `${projectId}/${phaseId}/work_card/${repairId}`,
      artifactType: "work_card",
      parentArtifactId: `${projectId}/${phaseId}/work_card/${parentId}`,
      stem: `planning/phases/${phaseId}/Work_Cards/WC02-REPAIR01_architect_bridge_contract_alignment_task_packet_generation_repair`,
      sources: [
        `${projectId}/${phaseId}/architect_review/${parentId}`,
        parentReportId,
        `${projectId}/${phaseId}/work_card/${parentId}`,
      ],
      expectedOutputs: [repairReportId],
      data: {
        workCardId: repairId,
        finalNumberedRepair: true,
        maximumRepairCount: 1,
        authorizingArchitectReviewRevision: 1,
        controllingRepairReportArtifactId: repairReportId,
        logicalRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/${repairId}`,
      },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: repairId,
      artifactId: repairReportId,
      artifactType: "implementer_report",
      parentArtifactId: `${projectId}/${phaseId}/work_card/${parentId}`,
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR01_architect_bridge_contract_alignment_task_packet_generation_repair`,
      sources: [`${projectId}/${phaseId}/work_card/${repairId}`],
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/${parentId}`],
      data: { workCardId: repairId, status: "implemented_awaiting_architect_review" },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: parentId,
      artifactId: `${projectId}/${phaseId}/architect_review/${parentId}`,
      artifactType: "architect_review",
      revision: 3,
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC02_architect_bridge_current_action_surface_audit_and_embedded_chatgpt_browser`,
      sources: [
        repairReportId,
        parentReportId,
        `${projectId}/${phaseId}/work_card/${parentId}`,
        `${projectId}/${phaseId}/work_card/${repairId}`,
      ],
      expectedOutputs: [`${projectId}/${phaseId}/validation_report/${parentId}`],
      data: {
        workCardId: parentId,
        decision: "Ready for Operator validation",
        operatorValidationAuthorized: true,
        reviewScope: "combined_parent_and_final_repair",
        combinedParentReview: true,
        repairedParentWorkCardArtifactId: `${projectId}/${phaseId}/work_card/${parentId}`,
        repairWorkCardArtifactId: `${projectId}/${phaseId}/work_card/${repairId}`,
        authorizingArchitectReviewArtifactId: `${projectId}/${phaseId}/architect_review/${parentId}`,
        authorizingArchitectReviewRevision: 1,
      },
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC02-REPAIR02",
      artifactId: `${projectId}/${phaseId}/work_card/WC02-REPAIR02`,
      artifactType: "work_card",
      parentArtifactId: `${projectId}/${phaseId}/work_card/${parentId}`,
      stem: `planning/phases/${phaseId}/Work_Cards/WC02-REPAIR02_executable_transition_engine_and_refresh_authority_rebuild`,
      sources: [
        `${projectId}/${phaseId}/work_card/${parentId}`,
        parentReportId,
        `${projectId}/${phaseId}/architect_review/${parentId}`,
        `${projectId}/${phaseId}/work_card/${repairId}`,
        repairReportId,
      ],
      expectedOutputs: [
        `${projectId}/${phaseId}/implementer_report/WC02-REPAIR02-executable-transition-engine-and-refresh-authority-rebuild`,
      ],
      data: {
        workCardId: "WC02-REPAIR02",
        status: "ready_for_implementer",
        repairClassification: "systemic_transition_authority_rebuild",
      },
    });

    const result = await projectGraph(root, projectId);
    const action = result.projection.state.currentAction;
    assert.equal(action.actionId, "operator_validation_required");
    assert.equal(action.workCardId, undefined);
    assert.equal(action.targetArtifactId, `${projectId}/${phaseId}/work_card/${parentId}`);
    assert.deepEqual(action.expectedOutput, {
      artifactId: `${projectId}/${phaseId}/validation_report/${parentId}`,
      artifactType: "validation_report",
    });
    assert.equal(
      result.projection.state.blockingConditions.some((blocker) =>
        blocker.code === "repair_lineage_ambiguous"
      ),
      false,
    );
  });
});

test("repository observer debounces related pair writes into one stable refresh", async () => {
  const calls = [];
  const statuses = [];
  const fakeRegistry = { updateObserverStatus: async (_id, status) => statuses.push(status) };
  const fakeRefresh = {
    refresh: async (reason) => {
      calls.push(reason);
      return { scanResult: { blockers: [] } };
    },
    getProjectionSnapshot: async () => ({ scanResult: { blockers: [] } }),
  };
  const configured = project(path.resolve(os.tmpdir()), "debounce-project");
  const observer = new RepositoryObserver(configured, fakeRegistry, fakeRefresh, { debounceMs: 25 });
  observer.stopped = false;
  observer.schedule("markdown-write");
  observer.schedule("json-write");
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.deepEqual(calls, ["json-write"]);
  await observer.stop();
  assert.ok(statuses.includes("stopped"));
});

test("branch observation changes the scan result and required-branch mismatch blocks", async () => {
  await temporaryRoot("champcity-branch-refresh-", async (root) => {
    await mkdir(path.join(root, ".git"), { recursive: true });
    await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/dev\n", "utf8");
    const configured = {
      ...project(root, "project-alpha"),
      branchBehavior: { mode: "require", branch: "dev" },
    };
    const first = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
    assert.equal(first.branch, "dev");
    assert.equal(first.blockers.some((blocker) => blocker.code === "branch_mismatch"), false);
    await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/feature/other\n", "utf8");
    const changed = await scanVerifiedArtifactGraph(configured, () => FIXED_TIME);
    assert.equal(changed.branch, "feature/other");
    assert.ok(changed.blockers.some((blocker) => blocker.code === "branch_mismatch"));
    assert.notEqual(first.fingerprint, changed.fingerprint);
  });
});
