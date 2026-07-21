const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

if (!process.versions.electron) {
  const { spawnSync } = require("node:child_process");
  const { test } = require("node:test");
  const electron = require("electron");

  test("mounted Operator approval workspace executes through Electron", () => {
    const result = spawnSync(electron, [__filename], {
      env: { ...process.env },
      stdio: "inherit",
    });
    assert.equal(result.status, 0);
  });
} else {

const { app, BrowserWindow } = require("electron");

const { ArtifactPairService } = require("../../dist/main/artifacts/index.js");

const projectId = "champcity-ai";
const fixedTime = "2026-07-20T19:00:00.000Z";
const fixtureRoot = path.join(os.tmpdir(), "champcity-operator-approval-mounted-project");
const runtimeRoot = path.join(os.tmpdir(), "champcity-operator-approval-mounted-runtime");
const userDataRoot = path.join(runtimeRoot, "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const heartbeatPath = path.join(os.tmpdir(), "champcity-operator-approval-mounted-heartbeat.log");

process.env.CHAMPCITY_ELECTRON_RUNTIME_ROOT = runtimeRoot;
delete process.env.CHAMPCITY_ALLOW_REPOSITORY_TMP_PROJECTS;

const watchdog = setTimeout(() => {
  mark("watchdog-timeout");
  console.error("operator approval mounted renderer test timed out");
  void shutdown(1);
}, 90000);
mark("script-start");

prepareFixture()
  .then(() => {
    mark("fixture-ready");
    require("../../dist/main/main.js");
    mark("main-required");
    return app.whenReady();
  })
  .then(run)
  .catch(async (error) => {
    console.error(error);
    await shutdown(1);
  });

async function run() {
  try {
    mark("app-ready");
    const window = await waitForWindow();
    mark("window-ready");
    await window.webContents.executeJavaScript(visibleButtonsExpression(), true);
    await waitFor(
      window,
      `window.champCity.listProjects().then((result) => result.ok && result.selectedProjectId === ${JSON.stringify(projectId)})`,
      "selected mounted fixture project",
    );
    await waitFor(
      window,
      `window.champCity.listGovernanceApprovalQueue().then((result) => result.ok && result.items.some((item) => item.targetArtifactId.endsWith("/work_card/WC_HISTORY") && item.legacyEvidence.length === 1 && item.approvalStatus === "pending_operator_disposition"))`,
      "historical Work Card pending with legacy evidence",
    );
    const queue = await window.webContents.executeJavaScript(`window.champCity.listGovernanceApprovalQueue()`, true);
    assert.equal(queue.ok, true, queue.errorMessages?.join("\n"));
    assert.equal(queue.items.some((item) => item.decisionWorkspaceScreenId === "historical-operator-review"), false);
    assert.equal(queue.items.some((item) => item.approvalClassification === "historical_record"), false);

    const historicalWork = queue.items.find((item) => item.targetArtifactId.endsWith("/work_card/WC_HISTORY"));
    assert.equal(historicalWork.decisionWorkspaceScreenId, "operator-work-card-approval");
    assert.equal(historicalWork.decisionWorkspaceLabel, "Work Card Approval");
    assert.equal(historicalWork.status, "historical");
    assert.equal(historicalWork.legacyEvidence.length, 1);

    const historicalPhase = queue.items.find((item) => item.targetArtifactId.endsWith("/phase_planning/Phase_Planning"));
    const historicalPlan = queue.items.find((item) => item.targetArtifactId.endsWith("/work_card_plan/Work_Card_Plan"));
    assert.equal(historicalPhase.decisionWorkspaceScreenId, "operator-phase-approval");
    assert.equal(historicalPlan.decisionWorkspaceScreenId, "operator-phase-approval");
    assert.equal(historicalPhase.decisionWorkspaceLabel, "Operator Phase Approval");
    assert.equal(historicalPhase.targetSetHash, historicalPlan.targetSetHash);
    assert.equal(historicalPhase.targetBindings.length, 2);

    await openGovernanceApproval(window);
    await selectApprovalItem(window, historicalWork.targetArtifactId);
    await clickButton(window, "Open Work Card Approval");
    await waitFor(
      window,
      `(() => { const text = document.body.innerText.toLowerCase(); return text.includes("work card approval") && text.includes("historical") && text.includes("legacy evidence") && text.includes("legacy approval artifact retained"); })()`,
      "historical Work Card stage-owned approval workspace",
    );

    await openGovernanceApproval(window);
    await selectApprovalItem(window, historicalPhase.targetArtifactId);
    await clickButton(window, "Open Operator Phase Approval");
    await waitFor(
      window,
      `document.body.innerText.includes("Operator Phase Approval") && document.body.innerText.includes(${JSON.stringify(historicalPhase.targetBindings[0].artifactId)}) && document.body.innerText.includes(${JSON.stringify(historicalPhase.targetBindings[1].artifactId)}) && !document.body.innerText.includes("Historical Review")`,
      "historical Phase Planning stage-owned approval workspace",
    );

    console.log(JSON.stringify({
      operatorApprovalWorkspaceMounted: "passed",
      pendingItems: queue.items.length,
      historicalWorkScreen: historicalWork.decisionWorkspaceScreenId,
      historicalPhaseScreen: historicalPhase.decisionWorkspaceScreenId,
      legacyEvidenceVisible: true,
      historicalReviewDestinationAbsent: true,
    }));
    clearTimeout(watchdog);
    await shutdown(0);
  } catch (error) {
    try {
      const [window] = BrowserWindow.getAllWindows();
      if (window) console.error((await bodyText(window)).slice(0, 12000));
    } catch {}
    console.error(error);
    clearTimeout(watchdog);
    await shutdown(1);
  }
}

async function prepareFixture() {
  fs.rmSync(heartbeatPath, { force: true });
  mark("prepare-start");
  cleanupPath(fixtureRoot);
  cleanupPath(runtimeRoot);
  await fs.promises.mkdir(path.join(fixtureRoot, "planning"), { recursive: true });
  await fs.promises.writeFile(path.join(fixtureRoot, "package.json"), JSON.stringify({ name: "fixture" }), "utf8");

  const artifactPairs = new ArtifactPairService({
    projectRoot: fixtureRoot,
    clock: () => fixedTime,
    transactionIdFactory: () => `txn-${Math.random().toString(16).slice(2)}`,
  });
  const workCard = await artifactPairs.commitArtifact({
    artifactId: `${projectId}/phase-10/work_card/WC_HISTORY`,
    artifactType: "work_card",
    status: "historical",
    projectId,
    phaseId: "phase-10",
    workCardId: "WC_HISTORY",
    relationships: {
      sources: [],
      expectedOutputs: [`${projectId}/phase-10/implementer_report/WC_HISTORY`],
      supersedes: [],
      children: [],
    },
    payload: {
      title: "Historical Work Card",
      contentMarkdown: "# Historical Work Card\n\nStatus: historical\n",
      data: {
        requiresImplementer: true,
        expectedImplementerReportArtifactId: `${projectId}/phase-10/implementer_report/WC_HISTORY`,
      },
    },
    location: {
      directoryPath: "planning/phases/phase-10/Work_Cards",
      fileStem: "WC_HISTORY_operator_approval_workspace_fixture",
    },
    expectedRevision: null,
  });
  await artifactPairs.commitArtifact({
    artifactId: `${projectId}/phase-10/operator_approval/legacy_WC_HISTORY`,
    artifactType: "operator_approval",
    status: "active",
    projectId,
    phaseId: "phase-10",
    workCardId: "WC_HISTORY",
    parentArtifactId: workCard.artifact.artifactId,
    relationships: {
      sources: [workCard.artifact.artifactId],
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      title: "Legacy Historical Approval Evidence",
      contentMarkdown: "# Legacy Historical Approval Evidence\n",
      data: { decision: "approved" },
    },
    location: {
      directoryPath: "planning/phases/phase-10/Operator_Approvals",
      fileStem: "LEGACY_APPROVAL_WC_HISTORY",
    },
    expectedRevision: null,
  });
  await artifactPairs.commitArtifact({
    artifactId: `${projectId}/phase-10/phase_planning/Phase_Planning`,
    artifactType: "phase_planning",
    status: "historical",
    projectId,
    phaseId: "phase-10",
    payload: {
      title: "Historical Phase Planning",
      contentMarkdown: "# Historical Phase Planning\n",
      data: { phaseId: "phase-10" },
    },
    location: {
      directoryPath: "planning/phases/phase-10",
      fileStem: "Phase_Planning_historical",
    },
    expectedRevision: null,
  });
  await artifactPairs.commitArtifact({
    artifactId: `${projectId}/phase-10/work_card_plan/Work_Card_Plan`,
    artifactType: "work_card_plan",
    status: "historical",
    projectId,
    phaseId: "phase-10",
    payload: {
      title: "Historical Work Card Plan",
      contentMarkdown: "# Historical Work Card Plan\n",
      data: { phaseId: "phase-10", candidates: [] },
    },
    location: {
      directoryPath: "planning/phases/phase-10",
      fileStem: "Work_Card_Plan_historical",
    },
    expectedRevision: null,
  });

  await fs.promises.mkdir(userDataRoot, { recursive: true });
  await fs.promises.writeFile(
    workspacePath,
    `${JSON.stringify({
      schemaVersion: "champcity.project-workspaces.v1",
      selectedProjectId: projectId,
      projects: [configuredProject()],
    }, null, 2)}\n`,
    "utf8",
  );
  mark("prepare-complete");
}

function configuredProject() {
  return {
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
}

async function openGovernanceApproval(window) {
  await clickButton(window, "Supporting tools");
  await waitFor(window, `document.body.innerText.includes("Governance Approval")`, "Governance Approval menu item");
  await clickButton(window, "Governance Approval");
  await waitFor(window, `document.body.innerText.includes("Approval queue")`, "Governance Approval workspace");
}

async function selectApprovalItem(window, artifactId) {
  const selected = await window.webContents.executeJavaScript(
    `(() => {
      const target = ${JSON.stringify(artifactId)};
      const buttons = visibleButtons();
      const button = buttons.find((candidate) => (candidate.textContent || "").includes(target));
      if (!button) return false;
      button.click();
      return true;
    })()`,
    true,
  );
  assert.equal(selected, true, artifactId);
}

async function clickButton(window, label) {
  const clicked = await window.webContents.executeJavaScript(
    `(() => {
      const label = ${JSON.stringify(label)};
      const button = visibleButtons().find((candidate) => (candidate.textContent || "").includes(label));
      if (!button) return false;
      button.click();
      return true;
    })()`,
    true,
  );
  assert.equal(clicked, true, `Button not found: ${label}`);
}

function visibleButtonsExpression() {
  return `window.visibleButtons = () => [...document.querySelectorAll("button")].filter((button) => button.getClientRects().length > 0); true`;
}

async function waitForWindow(timeoutMs = 25000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const window = BrowserWindow.getAllWindows()[0];
    if (window && !window.webContents.isLoading()) return window;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for the application window.");
}

async function waitFor(window, expression, description, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(expression, true)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${description}. Renderer text: ${(await bodyText(window)).slice(0, 1600)}`);
}

async function bodyText(window) {
  return window.webContents.executeJavaScript(`document.body?.innerText ?? ""`, true);
}

function cleanupPath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

async function shutdown(code) {
  mark(`shutdown-${code}`);
  try {
    void require("../../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
  } catch {}
  mark("runtime-shutdown-requested");
  for (const window of BrowserWindow.getAllWindows()) window.destroy();
  mark("windows-destroyed");
  cleanupPath(fixtureRoot);
  mark("fixture-cleaned");
  app.exit(code);
  mark("app-exit-called");
  process.exit(code);
}

function mark(label) {
  fs.appendFileSync(heartbeatPath, `${new Date().toISOString()} ${label}\n`, "utf8");
}
}
