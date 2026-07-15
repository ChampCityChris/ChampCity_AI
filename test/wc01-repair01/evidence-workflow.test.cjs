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
    expectedOutputs: [`${projectId}/${phaseId}/implementer_report/${workCardId}`],
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

test("explicit repair decision selects its exact repair and enforces the final numbered repair limit", async () => {
  await temporaryRoot("champcity-repair-limit-", async (root) => {
    const projectId = "project-alpha";
    const phaseId = "phase-04";
    await seedWorkCardLoop(root, projectId, phaseId, "WC01");
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
      data: { workCardId: "WC01-REPAIR01", finalNumberedRepair: true },
    });
    let result = await projectGraph(root, projectId);
    assert.equal(result.projection.state.currentAction.actionId, "implementer_execution_required");
    assert.equal(result.projection.state.currentAction.targetArtifactId, `${projectId}/${phaseId}/work_card/WC01-REPAIR01`);

    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01-REPAIR01",
      artifactId: `${projectId}/${phaseId}/implementer_report/WC01-REPAIR01`,
      artifactType: "implementer_report",
      stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_authority_cutover`,
      expectedOutputs: [`${projectId}/${phaseId}/architect_review/WC01-REPAIR01`],
    });
    await writeArtifact(root, {
      projectId, phaseId, workCardId: "WC01-REPAIR01",
      artifactId: `${projectId}/${phaseId}/architect_review/WC01-REPAIR01`,
      artifactType: "architect_review",
      stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01-REPAIR01_authority_cutover`,
      data: { decision: "Repair required before Operator validation", requiredRepairId: "WC01-REPAIR02" },
    });
    result = await projectGraph(root, projectId, 2);
    assert.equal(result.projection.state.currentAction.actionId, "architect_disposition_required");
    assert.notEqual(result.projection.state.currentAction.expectedOutput.artifactId, `${projectId}/${phaseId}/work_card/WC01-REPAIR02`);
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
