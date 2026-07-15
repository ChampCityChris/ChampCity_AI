const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const {
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
} = require("../dist/shared/artifacts");

const repositoryRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(repositoryRoot, "tmp", "wc01-repair01-electron-project");
const userDataRoot = path.join(repositoryRoot, "tmp", "electron-runtime", "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const projectId = "mounted-project";
const phaseId = "phase-04";
const workCardId = "WC01";
const fixedTime = "2026-07-15T21:30:00.000Z";
const prepare = process.argv.includes("--prepare");
const restart = process.argv.includes("--restart");
const cleanup = process.argv.includes("--cleanup");

if (prepare) prepareFixture();

require("../dist/main/main.js");

app.whenReady().then(async () => {
  try {
    const window = await waitForWindow();
    await waitFor(
      window,
      `document.body.innerText.includes("Mounted Evidence Project") && document.body.innerText.includes("Refresh Repository State")`,
      "selected project workspace bar",
    );
    await waitFor(
      window,
      restart
        ? `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "operator_validation_required")`
        : `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "architect_review_of_implementer_report_required")`,
      restart ? "restart Operator Validation projection" : "Architect Review evidence projection",
    );

    const initial = await window.webContents.executeJavaScript(
      `window.champCity.getCurrentRequiredAction()`,
      true,
    );
    assert.equal(initial.ok, true);
    assert.equal(initial.currentAction.routedAction.bindingSource.kind, "evidence_projection");
    assert.equal(initial.currentAction.workCardId, workCardId);

    if (!restart) {
      assert.equal(initial.currentAction.id, "architect_review_of_implementer_report_required");
      assert.equal(initial.currentAction.routedAction.targetArtifactId, `${projectId}/${phaseId}/work_card/${workCardId}`);
      assert.deepEqual(initial.currentAction.routedAction.sourceArtifactIds, [
        `${projectId}/${phaseId}/implementer_report/${workCardId}`,
      ]);
      assert.equal(
        initial.currentAction.routedAction.expectedOutput.artifactId,
        `${projectId}/${phaseId}/architect_review/${workCardId}`,
      );

      await window.webContents.executeJavaScript(
        `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Refresh Repository State"))?.click(), true)`,
        true,
      );
      await waitFor(
        window,
        `document.body.innerText.includes("Blockers: 0")`,
        "manual refresh result",
      );

      const reviewResult = await window.webContents.executeJavaScript(
        `(async () => {
          const current = await window.champCity.getCurrentRequiredAction();
          const binding = current.routedArchitectReviewBinding;
          const input = {
            phase: binding.phaseId,
            workCardFileName: current.routedScreen.target.jsonPath.split("/").at(-1),
            implementerReportFileName: binding.implementerReportFileName,
            routedReviewBinding: binding,
            decision: "Ready for Operator validation",
            workCardCompliance: "The exact routed Work Card was implemented.",
            changedFilesReviewed: "Reviewed the evidence-derived workflow implementation.",
            acceptanceCriteriaAssessment: "The mounted production path meets the criteria.",
            validationClaimsAssessment: "Canonical pair and projector evidence were verified.",
            skippedChecksAssessment: "Operator acceptance remains intentionally pending.",
            observationRegisterImpact: "No observation status changed.",
            operatorValidationSteps: "Confirm the routed Operator Validation workspace.",
            requiredRepair: "None identified."
          };
          const preview = await window.champCity.previewArchitectReviewRecord(input);
          const saved = preview.ok && preview.validation?.valid
            ? await window.champCity.saveArchitectReviewRecord(input)
            : null;
          return { preview, saved };
        })()`,
        true,
      );
      assert.equal(reviewResult.preview.ok, true, JSON.stringify(reviewResult.preview.errorMessages));
      assert.equal(reviewResult.preview.validation.valid, true, JSON.stringify(reviewResult.preview.validation.errors));
      assert.equal(reviewResult.saved.ok, true, JSON.stringify(reviewResult.saved?.errorMessages));
      await waitFor(
        window,
        `window.champCity.getCurrentRequiredAction().then((result) => result.currentAction?.id === "operator_validation_required")`,
        "post-save Operator Validation refresh",
        20000,
      );
      const advanced = await window.webContents.executeJavaScript(
        `window.champCity.getCurrentRequiredAction()`,
        true,
      );
      assert.equal(advanced.currentAction.id, "operator_validation_required");
    } else {
      assert.equal(initial.currentAction.id, "operator_validation_required");
      assert.equal(initial.currentAction.routedAction.targetArtifactId, `${projectId}/${phaseId}/work_card/${workCardId}`);
    }

    console.log(JSON.stringify({
      mountedEvidenceWorkflow: "passed",
      mode: restart ? "restart" : "initial-save",
      actionId: restart ? initial.currentAction.id : "operator_validation_required",
      projectId,
    }));
    await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
    for (const candidate of BrowserWindow.getAllWindows()) candidate.destroy();
    if (cleanup) {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
      fs.rmSync(workspacePath, { force: true });
    }
    app.exit(0);
  } catch (error) {
    console.error(error);
    try {
      await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
    } catch {}
    app.exit(1);
  }
});

function prepareFixture() {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(fixtureRoot, "planning"), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRoot, "package.json"),
    JSON.stringify({ name: projectId, productName: "Mounted Evidence Project" }),
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
    data: { status: "approved", candidates: [{ id: workCardId, title: "Mounted authority cutover", order: 1 }] },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/approval/Operator_Phase_Approval`,
    artifactType: "phase_approval",
    phaseId,
    stem: `planning/phases/${phaseId}/Operator_Phase_Approval`,
    data: { decision: "approved" },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
    artifactType: "work_card",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Work_Cards/WC01_mounted_authority_cutover`,
    expectedOutputs: [`${projectId}/${phaseId}/implementer_report/${workCardId}`],
    data: { workCardId, status: "ready_for_implementer" },
    title: "Work Card: WC01 Mounted Authority Cutover",
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/implementer_report/${workCardId}`,
    artifactType: "implementer_report",
    phaseId,
    workCardId,
    stem: `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_WC01_mounted_authority_cutover`,
    sources: [`${projectId}/${phaseId}/work_card/${workCardId}`],
    expectedOutputs: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
    data: { workCardId, status: "implemented_awaiting_architect_review" },
    title: "Implementer Report: WC01 Mounted Authority Cutover",
  });
  fs.mkdirSync(userDataRoot, { recursive: true });
  const configured = {
    projectId,
    displayName: "Mounted Evidence Project",
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

function writeArtifact(input) {
  const artifact = buildCanonicalArtifact({
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    revision: 1,
    status: "active",
    projectId,
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    ...(input.workCardId ? { workCardId: input.workCardId } : {}),
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
      contentMarkdown: `# ${input.title ?? input.artifactType}\n\nMounted production-path evidence.\n`,
      data: input.data ?? {},
    },
  });
  const jsonPath = path.join(fixtureRoot, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(fixtureRoot, ...artifact.markdownPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, canonicalPrettyStringify(artifact), "utf8");
  fs.writeFileSync(markdownPath, renderArtifactMarkdown(artifact), "utf8");
}

async function waitForWindow(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const window = BrowserWindow.getAllWindows()[0];
    if (window && !window.webContents.isLoading()) return window;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for the real application window.");
}

async function waitFor(window, expression, description, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(expression, true)) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  const bodyText = await window.webContents.executeJavaScript(
    `document.body?.innerText ?? ""`,
    true,
  ).catch(() => "<renderer unavailable>");
  throw new Error(`Timed out waiting for ${description}. Renderer text: ${bodyText.slice(0, 1200)}`);
}
