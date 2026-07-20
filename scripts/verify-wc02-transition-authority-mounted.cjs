const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const {
  buildArtifactRegistry,
  buildArtifactRegistryEntry,
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
} = require("../dist/shared/artifacts");

const repositoryRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(repositoryRoot, "tmp", "wc02-transition-authority-project");
const mountedRuntimeRoot = path.join(repositoryRoot, "tmp", "mounted-electron-runtime", "wc02-transition-authority");
process.env.CHAMPCITY_ELECTRON_RUNTIME_ROOT = mountedRuntimeRoot;
process.env.CHAMPCITY_ALLOW_REPOSITORY_TMP_PROJECTS = "1";
const userDataRoot = path.join(mountedRuntimeRoot, "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const projectId = "wc02-transition-project";
const phaseId = "phase-04";
const workCardId = "WC02";
const repairId = "WC02-REPAIR01";
const repair02Id = "WC02-REPAIR02";
const parentReportId = `${projectId}/${phaseId}/implementer_report/WC02-architect-bridge-current-action-surface-audit`;
const repairReportId = `${projectId}/${phaseId}/implementer_report/WC02-REPAIR01-architect-bridge-contract-alignment-task-packet-generation-repair`;
const fixedTime = "2026-07-16T18:45:00.000Z";
const prepare = process.argv.includes("--prepare");
const cleanup = process.argv.includes("--cleanup");
const seededArtifacts = [];

if (prepare) prepareFixture();

require("../dist/main/main.js");

app.whenReady().then(async () => {
  try {
    const window = await waitForWindow();
    await waitFor(
      window,
      `document.body.innerText.includes("wc02-transition-authority-project") && document.body.innerText.includes("Refresh project state") && document.body.innerText.includes("Add local project") && !document.body.innerText.includes("Repository directory")`,
      "selected WC02 transition fixture",
    );
    await waitFor(
      window,
      `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "operator_validation_required" && result.currentAction?.workCardId === "${workCardId}")`,
      "WC02 Operator Validation route",
    );
    const initial = await window.webContents.executeJavaScript(
      `window.champCity.getCurrentRequiredAction()`,
      true,
    );
    assert.equal(initial.ok, true);
    assert.equal(initial.currentAction.id, "operator_validation_required");
    assert.equal(initial.currentAction.workCardId, workCardId);
    assert.equal(
      initial.currentAction.routedAction.expectedOutput.artifactId,
      `${projectId}/${phaseId}/operator_validation/${workCardId}`,
    );
    assert.equal(initial.currentAction.routedAction.bindingSource.kind, "relationship_resolver");

    await window.webContents.executeJavaScript(
      `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Refresh project state"))?.click(), true)`,
      true,
    );
    await waitFor(
      window,
      `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "operator_validation_required" && result.currentAction?.workCardId === "${workCardId}")`,
      "stable WC02 Operator Validation route after manual refresh",
    );
    const workspaceState = await window.webContents.executeJavaScript(
      `window.champCity.listProjects()`,
      true,
    );
    assert.equal(workspaceState.ok, true);
    assert.equal(workspaceState.selectedProjectId, projectId);
    const selected = workspaceState.projects.find((project) => project.selected);
    assert.equal(selected.projectId, projectId);
    assert.equal(selected.lastScanResult.branch, "feature/wc02-transition-mounted");
    assert.equal(selected.lastScanResult.currentAction.actionId, "operator_validation_required");

    const bodyText = await window.webContents.executeJavaScript(
      `document.body.innerText`,
      true,
    );
    assert.ok(bodyText.includes("Branch: feature/wc02-transition-mounted"));
    assert.equal(bodyText.includes("Configured project"), false);
    assert.equal(bodyText.includes("Active project is not available"), false);

    console.log(JSON.stringify({ wc02TransitionAuthorityMounted: "passed", projectId }));
    await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
    for (const candidate of BrowserWindow.getAllWindows()) candidate.destroy();
    if (cleanup) {
      cleanupPath(fixtureRoot);
      cleanupPath(workspacePath);
    }
    app.exit(0);
  } catch (error) {
    try {
      const [window] = BrowserWindow.getAllWindows();
      if (window) {
        console.error(
          await window.webContents.executeJavaScript(
            `document.body.innerText.slice(0, 4000)`,
            true,
          ),
        );
      }
    } catch {}
    console.error(error);
    try {
      await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
    } catch {}
    app.exit(1);
  }
});

function prepareFixture() {
  fs.rmSync(fixtureRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  seededArtifacts.length = 0;
  fs.mkdirSync(path.join(fixtureRoot, "planning"), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, ".git"), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRoot, ".git", "HEAD"),
    "ref: refs/heads/feature/wc02-transition-mounted\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "package.json"),
    JSON.stringify({ name: projectId, productName: "WC02 Transition Authority Project" }),
    "utf8",
  );
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/phase_activation/${phaseId}`,
    artifactType: "phase_activation",
    phaseId,
    stem: `planning/phases/${phaseId}/Phase_Activation`,
    data: { status: "active", phaseId },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card_plan/Work_Card_Plan`,
    artifactType: "work_card_plan",
    phaseId,
    stem: `planning/phases/${phaseId}/Work_Card_Plan`,
    data: {
      status: "approved",
      candidates: [{ id: workCardId, title: "WC02 transition authority", order: 1 }],
    },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    artifactType: "work_card",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Work_Cards/WC02_architect_bridge_current_action_surface_audit_and_embedded_chatgpt_browser`,
    expectedOutputs: [parentReportId],
    data: { workCardId, status: "ready_for_implementer", maxRepairCount: 1 },
  });
  writeArtifact({
    artifactId: parentReportId,
    artifactType: "implementer_report",
    phaseId,
    workCardId,
    parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC02_architect_bridge_current_action_surface_audit`,
    sources: [`${projectId}/${phaseId}/work_card/${workCardId}`],
    expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
    data: { workCardId, status: "implemented_awaiting_architect_review" },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${repairId}`,
    artifactType: "work_card",
    phaseId,
    workCardId: repairId,
    parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    stem: `planning/phases/${phaseId}/Work_Cards/WC02-REPAIR01_architect_bridge_contract_alignment_task_packet_generation_repair`,
    sources: [
      `${projectId}/${phaseId}/architect_review/${workCardId}`,
      parentReportId,
      `${projectId}/${phaseId}/work_card/${workCardId}`,
    ],
    expectedOutputs: [repairReportId],
    data: {
      workCardId: repairId,
      finalNumberedRepair: true,
      maximumRepairCount: 1,
      authorizingArchitectReviewRevision: 1,
      logicalRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/${repairId}`,
      controllingRepairReportArtifactId: repairReportId,
    },
  });
  writeArtifact({
    artifactId: repairReportId,
    artifactType: "implementer_report",
    phaseId,
    workCardId: repairId,
    parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR01_architect_bridge_contract_alignment_task_packet_generation_repair`,
    sources: [`${projectId}/${phaseId}/work_card/${repairId}`],
    expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
    data: { workCardId: repairId, status: "implemented_awaiting_architect_review" },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/architect_review/${repairId}`,
    artifactType: "architect_review",
    phaseId,
    workCardId: repairId,
    stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC02-REPAIR01_architect_bridge_contract_alignment_task_packet_generation_repair`,
    sources: [repairReportId],
    expectedOutputs: [`${projectId}/${phaseId}/operator_validation/${repairId}`],
    data: { decision: "Ready for Operator validation", operatorValidationAuthorized: true },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
    artifactType: "architect_review",
    phaseId,
    workCardId,
    revision: 3,
    stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC02_architect_bridge_current_action_surface_audit_and_embedded_chatgpt_browser`,
    sources: [
      repairReportId,
      parentReportId,
      `${projectId}/${phaseId}/work_card/${workCardId}`,
      `${projectId}/${phaseId}/work_card/${repairId}`,
    ],
    expectedOutputs: [`${projectId}/${phaseId}/operator_validation/${workCardId}`],
    data: {
      workCardId,
      decision: "Ready for Operator validation",
      operatorValidationAuthorized: true,
      reviewScope: "combined_parent_and_final_repair",
      combinedParentReview: true,
      repairedParentWorkCardArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
      repairWorkCardArtifactId: `${projectId}/${phaseId}/work_card/${repairId}`,
      authorizingArchitectReviewArtifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
      authorizingArchitectReviewRevision: 1,
    },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${repair02Id}`,
    artifactType: "work_card",
    phaseId,
    workCardId: repair02Id,
    parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    stem: `planning/phases/${phaseId}/Work_Cards/WC02-REPAIR02_executable_transition_engine_and_refresh_authority_rebuild`,
    sources: [
      `${projectId}/${phaseId}/work_card/${workCardId}`,
      parentReportId,
      `${projectId}/${phaseId}/architect_review/${workCardId}`,
      `${projectId}/${phaseId}/work_card/${repairId}`,
      repairReportId,
    ],
    expectedOutputs: [
      `${projectId}/${phaseId}/implementer_report/WC02-REPAIR02-executable-transition-engine-and-refresh-authority-rebuild`,
    ],
    data: { workCardId: repair02Id, status: "ready_for_implementer" },
  });
  writeExactGovernanceApprovals();
  writeRegistry();

  fs.mkdirSync(userDataRoot, { recursive: true });
  const configured = {
    projectId,
    displayName: path.basename(fixtureRoot),
    repositoryRoot: fixtureRoot,
    planningRoot: path.join(fixtureRoot, "planning"),
    branchBehavior: { mode: "observe-current" },
    enabled: true,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    lastOpenedAt: null,
    lastScanAt: null,
    lastScanResult: null,
    observerStatus: "stopped",
  };
  fs.writeFileSync(
    workspacePath,
    `${JSON.stringify({ schemaVersion: "champcity.project-workspaces.v1", selectedProjectId: projectId, projects: [configured] }, null, 2)}\n`,
    "utf8",
  );
}

function cleanupPath(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch (error) {
    console.warn(`Deferred cleanup for ${path.basename(targetPath)}: ${error.code || error.message}`);
  }
}

function writeArtifact(input) {
  const artifact = buildCanonicalArtifact({
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    revision: input.revision ?? 1,
    status: "active",
    projectId,
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    ...(input.workCardId ? { workCardId: input.workCardId } : {}),
    ...(input.parentArtifactId ? { parentArtifactId: input.parentArtifactId } : {}),
    createdAt: fixedTime,
    updatedAt: fixedTime,
    jsonPath: `${input.stem}.json`,
    markdownPath: `${input.stem}.md`,
    relationships: {
      sources: input.sources ?? [],
      expectedOutputs: input.expectedOutputs ?? [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: input.artifactType,
      title: input.title ?? input.artifactType,
      contentMarkdown: `# ${input.title ?? input.artifactType}\n\nMounted WC02 transition-authority evidence.\n`,
      data: input.data ?? {},
    },
  });
  const jsonPath = path.join(fixtureRoot, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(fixtureRoot, ...artifact.markdownPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${canonicalPrettyStringify(artifact)}\n`, "utf8");
  fs.writeFileSync(markdownPath, renderArtifactMarkdown(artifact), "utf8");
  seededArtifacts.push(artifact);
}

function writeExactGovernanceApprovals() {
  const targets = seededArtifacts.filter((artifact) =>
    artifact.artifactType === "work_card_plan" || artifact.artifactType === "work_card",
  );
  for (const target of targets) {
    const isWorkCard = target.artifactType === "work_card";
    writeArtifact({
      artifactId: isWorkCard
        ? `${projectId}/${target.phaseId}/operator_approval/${target.workCardId}`
        : `${projectId}/${target.phaseId}/operator_approval/Operator_Phase_Approval`,
      artifactType: "operator_approval",
      phaseId: target.phaseId,
      ...(isWorkCard ? { workCardId: target.workCardId } : {}),
      parentArtifactId: target.artifactId,
      stem: isWorkCard
        ? `planning/phases/${target.phaseId}/Operator_Approvals/OPERATOR_APPROVAL_${target.workCardId}`
        : `planning/phases/${target.phaseId}/Operator_Phase_Approval`,
      sources: [target.artifactId],
      expectedOutputs: isWorkCard ? target.relationships.expectedOutputs : [],
      data: operatorDecisionRecord(isWorkCard ? "work_card" : "phase_planning", [target], {
        kind: "stage_decision",
        decision: "approved",
      }),
    });
  }
}

function operatorDecisionRecord(stage, artifacts, outcome) {
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
    decidedAt: fixedTime,
  };
  return {
    schemaVersion: "operator-decision-record.v1",
    stage,
    targets,
    targetSetHash,
    outcome,
    decidedAt: fixedTime,
    decisionTimeline: [event],
  };
}

function writeRegistry() {
  const registry = buildArtifactRegistry({
    updatedAt: fixedTime,
    entries: seededArtifacts
      .map((artifact) => buildArtifactRegistryEntry(artifact))
      .sort((left, right) => left.artifactId.localeCompare(right.artifactId)),
  });
  const artifact = buildCanonicalArtifact({
    artifactId: `${projectId}/system/artifact_registry`,
    artifactType: "artifact_registry",
    revision: 1,
    status: "active",
    projectId,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    jsonPath: "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json",
    markdownPath: "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md",
    relationships: {
      sources: registry.entries.map((entry) => entry.artifactId),
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: "artifact_registry",
      title: "Canonical Artifact Registry",
      contentMarkdown: `# Canonical Artifact Registry\n\nMounted WC02 transition registry with ${registry.entries.length} entries.\n`,
      data: registry,
    },
  });
  const jsonPath = path.join(fixtureRoot, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(fixtureRoot, ...artifact.markdownPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${canonicalPrettyStringify(artifact)}\n`, "utf8");
  fs.writeFileSync(markdownPath, renderArtifactMarkdown(artifact), "utf8");
}

async function waitForWindow(timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const [window] = BrowserWindow.getAllWindows();
    if (window) return window;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for BrowserWindow.");
}

async function waitFor(window, expression, description, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await window.webContents.executeJavaScript(expression, true);
    if (ok) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}
