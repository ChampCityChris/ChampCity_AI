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
const fixtureRoot = path.join(repositoryRoot, "tmp", "wc02-architect-bridge-project");
const mountedRuntimeRoot = path.join(repositoryRoot, "tmp", "mounted-electron-runtime", "wc02-architect-bridge");
process.env.CHAMPCITY_ELECTRON_RUNTIME_ROOT = mountedRuntimeRoot;
process.env.CHAMPCITY_ALLOW_REPOSITORY_TMP_PROJECTS = "1";
const userDataRoot = path.join(mountedRuntimeRoot, "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const projectId = "architect-bridge-project";
const phaseId = "phase-04";
const workCardId = "WC01";
const fixedTime = "2026-07-16T12:00:00.000Z";
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
      `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "architect_disposition_required")`,
      "Architect disposition current action",
    );
    await window.webContents.executeJavaScript(
      `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Architect Bridge"))?.click(), true)`,
      true,
    );
    await waitFor(
      window,
      `document.body.innerText.includes("Architect Bridge") && document.body.innerText.includes("REQUESTED ACTION")`,
      "Architect Bridge workspace",
    );
    await waitFor(
      window,
      `document.body.innerText.includes("ARCHITECT_TASK_WC01_candidate_disposition") && document.querySelector("[data-testid='architect-browser-surface']") !== null`,
      "Architect Task Packet and browser surface",
    );
    const state = await window.webContents.executeJavaScript(
      `({
        text: document.body.innerText,
        textareaValues: [...document.querySelectorAll("textarea")].map((textarea) => textarea.value),
        hasHumanValidationField: document.body.innerText.includes("Validation result") || document.body.innerText.includes("Operator Validation of"),
        hasBrowserSurface: document.querySelector("[data-testid='architect-browser-surface']") !== null
      })`,
      true,
    );
    assert.equal(state.hasHumanValidationField, false, "Architect Bridge must not render Human Validation fields.");
    assert.equal(state.hasBrowserSurface, true, "Architect Browser surface must be available from the Bridge.");
    assert.equal(
      state.text.includes("pending packet generation"),
      false,
      "Architect Bridge must not show pending packet generation after packet generation succeeds.",
    );
    assert.equal(
      state.text.includes("blocked and cannot accept a write"),
      false,
      "Architect Bridge must not show a blocked write error for architect_task generation.",
    );
    assert.ok(
      state.text.includes("candidate_disposition/WC01"),
      "Expected output must show candidate_disposition/WC01.",
    );
    for (const requiredSource of [
      `${projectId}/${phaseId}/operator_validation/${workCardId}`,
      `${projectId}/${phaseId}/architect_review/${workCardId}`,
      `${projectId}/${phaseId}/work_card/${workCardId}`,
      `${projectId}/${phaseId}/implementer_report/${workCardId}`,
      `${projectId}/${phaseId}/work_card/${workCardId}-REPAIR01`,
      `${projectId}/${phaseId}/implementer_report/${workCardId}-REPAIR01-repository-observed-evidence-derived-workflow-authority`,
    ]) {
      assert.ok(
        state.text.includes(requiredSource),
        `Architect Bridge source bundle must include ${requiredSource}.`,
      );
    }
    assert.ok(
      state.textareaValues.some((value) => value.includes("Use ChampCity MCP to fetch:")),
      "Copy-ready MCP fetch prompt must be visible.",
    );
    assert.ok(
      fs.existsSync(
        path.join(
          fixtureRoot,
          "planning",
          "phases",
          phaseId,
          "Architect_Tasks",
          "ARCHITECT_TASK_WC01_candidate_disposition.json",
        ),
      ),
      "Architect Task Packet JSON pair must be written.",
    );
    assert.ok(
      fs.existsSync(
        path.join(
          fixtureRoot,
          "planning",
          "phases",
          phaseId,
          "Architect_Tasks",
          "ARCHITECT_TASK_WC01_candidate_disposition.md",
        ),
      ),
      "Architect Task Packet Markdown pair must be written.",
    );

    console.log(JSON.stringify({ architectBridgeMounted: "passed", projectId }));
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
  fs.writeFileSync(
    path.join(fixtureRoot, "package.json"),
    JSON.stringify({ name: projectId, productName: "Architect Bridge Project" }),
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
      candidates: [{ id: workCardId, title: "Architect bridge regression", order: 1 }],
    },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    artifactType: "work_card",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Work_Cards/WC01_architect_bridge_regression`,
    expectedOutputs: [`${projectId}/${phaseId}/implementer_report/${workCardId}`],
    data: { workCardId, status: "ready_for_implementer", maxRepairCount: 1 },
    title: "Work Card: WC01 Architect Bridge Regression",
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}`,
    artifactType: "implementer_report",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01_architect_bridge_regression`,
    sources: [`${projectId}/${phaseId}/work_card/${workCardId}`],
    expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
    artifactType: "architect_review",
    phaseId,
    workCardId,
    revision: 2,
    stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01_architect_bridge_regression`,
    sources: [
      `${projectId}/${phaseId}/implementer_report/${workCardId}`,
      `${projectId}/${phaseId}/implementer_report/${workCardId}-REPAIR01-repository-observed-evidence-derived-workflow-authority`,
      `${projectId}/${phaseId}/work_card/${workCardId}-REPAIR01`,
    ],
    expectedOutputs: [`${projectId}/${phaseId}/operator_validation/${workCardId}`],
    data: {
      decision: "Ready for Operator validation",
      operatorValidationAuthorized: true,
      reviewScope: "combined_parent_and_final_repair",
      combinedParentReview: true,
      repairedParentWorkCardArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
      repairWorkCardArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}-REPAIR01`,
      authorizingArchitectReviewArtifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
      authorizingArchitectReviewRevision: 1,
    },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${workCardId}-REPAIR01`,
    artifactType: "work_card",
    phaseId,
    workCardId: `${workCardId}-REPAIR01`,
    parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    stem: `planning/phases/${phaseId}/Work_Cards/WC01-REPAIR01_architect_bridge_regression`,
    sources: [
      `${projectId}/${phaseId}/work_card/${workCardId}`,
      `${projectId}/${phaseId}/architect_review/${workCardId}`,
    ],
    expectedOutputs: [
      `${projectId}/${phaseId}/implementer_report/${workCardId}-REPAIR01-repository-observed-evidence-derived-workflow-authority`,
    ],
    data: {
      workCardId: `${workCardId}-REPAIR01`,
      finalNumberedRepair: true,
      authorizingArchitectReviewRevision: 1,
      logicalRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}-REPAIR01`,
      controllingRepairReportArtifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}-REPAIR01-repository-observed-evidence-derived-workflow-authority`,
    },
    title: "Work Card: WC01-REPAIR01 Architect Bridge Regression",
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}-REPAIR01-repository-observed-evidence-derived-workflow-authority`,
    artifactType: "implementer_report",
    phaseId,
    workCardId: `${workCardId}-REPAIR01`,
    parentArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_repository_observed_evidence_derived_workflow_authority`,
    sources: [`${projectId}/${phaseId}/work_card/${workCardId}-REPAIR01`],
    expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
    data: {
      workCardId: `${workCardId}-REPAIR01`,
      status: "implemented_awaiting_architect_review",
    },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/operator_validation/${workCardId}`,
    artifactType: "operator_validation",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Validation_Reports/VALIDATION_REPORT_WC01_architect_bridge_regression`,
    sources: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
    expectedOutputs: [`${projectId}/${phaseId}/candidate_disposition/${workCardId}`],
    data: { workCardId, result: "Pass" },
    title: "Operator Validation: WC01 Architect Bridge Regression",
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
    status: input.status ?? "active",
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
      contentMarkdown: `# ${input.title ?? input.artifactType}\n\nMounted Architect Bridge regression evidence.\n`,
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
      title: isWorkCard
        ? `Operator Approval: ${target.workCardId}`
        : "Operator Phase Approval",
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
      contentMarkdown: `# Canonical Artifact Registry\n\nMounted Architect Bridge registry with ${registry.entries.length} entries.\n`,
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
