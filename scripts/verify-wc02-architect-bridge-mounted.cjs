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
const fixtureRoot = path.join(repositoryRoot, "tmp", "wc02-architect-bridge-project");
const userDataRoot = path.join(repositoryRoot, "tmp", "electron-runtime", "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const projectId = "architect-bridge-project";
const phaseId = "phase-04";
const workCardId = "WC01";
const fixedTime = "2026-07-16T12:00:00.000Z";
const prepare = process.argv.includes("--prepare");
const cleanup = process.argv.includes("--cleanup");

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
      `document.body.innerText.includes("ARCHITECT_TASK_WC01") && document.querySelector("[data-testid='architect-browser-surface']") !== null`,
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
          "ARCHITECT_TASK_WC01_review_validation_report_and_write_repair_decision.json",
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
          "ARCHITECT_TASK_WC01_review_validation_report_and_write_repair_decision.md",
        ),
      ),
      "Architect Task Packet Markdown pair must be written.",
    );

    console.log(JSON.stringify({ architectBridgeMounted: "passed", projectId }));
    await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
    for (const candidate of BrowserWindow.getAllWindows()) candidate.destroy();
    if (cleanup) {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
      fs.rmSync(workspacePath, { force: true });
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
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
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
    stem: `planning/phases/${phaseId}/Work_Cards/WC01_architect_bridge_regression`,
    expectedOutputs: [`${projectId}/${phaseId}/implementer_report/${workCardId}`],
    data: { workCardId, status: "ready_for_implementer" },
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
    stem: `planning/phases/${phaseId}/Architect_Reviews/ARCHITECT_REVIEW_WC01_architect_bridge_regression`,
    sources: [`${projectId}/${phaseId}/implementer_report/${workCardId}`],
    expectedOutputs: [`${projectId}/${phaseId}/validation_report/${workCardId}`],
    data: { decision: "Ready for Operator validation", operatorValidationAuthorized: true },
  });
  writeArtifact({
    artifactId: `${projectId}/${phaseId}/validation_report/${workCardId}`,
    artifactType: "validation_report",
    phaseId,
    workCardId,
    status: "blocked",
    stem: `planning/phases/${phaseId}/Validation_Reports/VALIDATION_REPORT_WC01_architect_bridge_regression`,
    sources: [`${projectId}/${phaseId}/architect_review/${workCardId}`],
    data: { workCardId, result: "Fail" },
  });

  fs.mkdirSync(userDataRoot, { recursive: true });
  const configured = {
    projectId,
    displayName: "Architect Bridge Project",
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
    status: input.status ?? "active",
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
      contentMarkdown: `# ${input.title ?? input.artifactType}\n\nMounted Architect Bridge regression evidence.\n`,
      data: input.data ?? {},
    },
  });
  const jsonPath = path.join(fixtureRoot, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(fixtureRoot, ...artifact.markdownPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, canonicalPrettyStringify(artifact), "utf8");
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
