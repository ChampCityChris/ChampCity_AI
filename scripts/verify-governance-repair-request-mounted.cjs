const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const {
  buildArtifactRegistry,
  buildArtifactRegistryEntry,
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
  renderArtifactRegistryContentMarkdown,
} = require("../dist/shared/artifacts");

const repositoryRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(repositoryRoot, "tmp", "governance-repair-request-mounted-project");
const mountedRuntimeRoot = path.join(repositoryRoot, "tmp", "mounted-electron-runtime", "governance-repair-request");
process.env.CHAMPCITY_ELECTRON_RUNTIME_ROOT = mountedRuntimeRoot;
process.env.CHAMPCITY_ALLOW_REPOSITORY_TMP_PROJECTS = "1";

const userDataRoot = path.join(mountedRuntimeRoot, "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const projectId = "champcity-ai";
const activePhaseId = "phase-07";
const fixedTime = "2026-07-20T14:00:00.000Z";
const prepare = process.argv.includes("--prepare");
const cleanup = process.argv.includes("--cleanup");
const seededRegistryArtifacts = [];

if (prepare) prepareFixture();

require("../dist/main/main.js");

app.whenReady().then(async () => {
  try {
    const window = await waitForWindow();
    await window.webContents.executeJavaScript(visibleButtonsExpression(), true);
    await waitFor(
      window,
      `document.body.innerText.includes("governance-repair-request-mounted-project") && document.body.innerText.includes("Refresh project state")`,
      "selected governance repair request fixture workspace",
    );
    await waitFor(
      window,
      `window.champCity.getCurrentGovernanceMaintenance().then((result) => result.ok && result.currentRequiredAction?.currentAction?.id === "governance_integrity_repair_required" && result.currentRequiredAction?.currentAction?.routedAction?.screenId === "governance-repair")`,
      "startup governance repair route",
    );

    const snapshot = await getMaintenanceSnapshot(window);
    assert.equal(snapshot.maintenance.repair.candidates.length, 6);
    assert.equal(snapshot.maintenance.repair.repairableCount, 0);
    assert.equal(snapshot.scanResult.blockers.length > 0, true);
    assert.equal(
      snapshot.scanResult.blockers.some((blocker) => blocker.code === "branch_mismatch"),
      true,
    );
    assert.equal(
      snapshot.maintenance.repair.candidates.every(
        (candidate) =>
          candidate.operationLabel === "Create repair request" &&
          candidate.safelyRepairable === false,
      ),
      true,
    );
    assert.equal(
      snapshot.currentRequiredAction.currentAction.routedAction.targetArtifactId,
      snapshot.maintenance.repair.candidates[0].artifactId,
    );
    assert.equal(
      fs.existsSync(path.join(fixtureRoot, "planning", "system", "Route_Review_Requests")),
      false,
    );

    await waitFor(
      window,
      `document.body.innerText.includes("Governance Integrity Repair") && visibleButtons().some((button) => button.textContent.includes("Review repair request") && !button.disabled)`,
      "repair request review button visible",
    );
    await clickButton(window, "Review repair request");
    await waitFor(
      window,
      `document.body.innerText.includes("Governance Repair Request Preview") && document.body.innerText.includes("REQUEST ARTIFACT ID") && document.body.innerText.includes("/phase-07/work_card/GOV-REPAIR-") && !document.body.innerText.includes("requires one exact")`,
      "repair request preview visible after first click",
    );
    assert.equal(
      fs.existsSync(path.join(fixtureRoot, "planning", "system", "Route_Review_Requests")),
      false,
      "preview click must not create route review request files",
    );

    console.log(JSON.stringify({
      governanceRepairRequestMounted: "passed",
      mode: "first-review-click",
      candidates: snapshot.maintenance.repair.candidates.length,
      blockers: snapshot.scanResult.blockers.length,
      expectedPhase: activePhaseId,
    }));
    await shutdown(cleanup);
  } catch (error) {
    try {
      const [window] = BrowserWindow.getAllWindows();
      if (window) console.error((await bodyText(window)).slice(0, 15000));
    } catch {}
    console.error(error);
    await shutdown(false, 1);
  }
});

function prepareFixture() {
  cleanupPath(fixtureRoot);
  cleanupPath(mountedRuntimeRoot);
  fs.mkdirSync(path.join(fixtureRoot, "planning"), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, ".git"), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRoot, ".git", "HEAD"),
    "ref: refs/heads/feature/governance-request-mounted\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "package.json"),
    JSON.stringify({ name: "governance-repair-request-mounted-project" }),
    "utf8",
  );

  writeArtifact({
    artifactId: `${projectId}/${activePhaseId}/phase_activation/${activePhaseId}`,
    artifactType: "phase_activation",
    phaseId: activePhaseId,
    stem: `planning/phases/${activePhaseId}/PHASE_ACTIVATION_${activePhaseId}`,
    data: { phaseId: activePhaseId, phaseSequence: 7 },
  });

  for (let index = 1; index <= 6; index += 1) {
    writeArtifact({
      artifactId: `${projectId}/supporting_document/CLOSEOUT_REPORT_phase_0${index}_closeout`,
      artifactType: "supporting_document",
      status: "active",
      stem: `planning/phases/phase-0${index}/Closeout_Reports/CLOSEOUT_REPORT_phase_0${index}_closeout`,
      title: `Unsupported Governance Candidate ${index}`,
      contentMarkdown: `# Unsupported Governance Candidate ${index}\n`,
      data: { fixture: "unsupported-governance-repair-request", index },
    });
  }

  writeRegistry();
  writeWorkspace();
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
      contentMarkdown:
        input.contentMarkdown ??
        `# ${input.title ?? input.artifactType}\n\nMounted governance repair request evidence.\n`,
      data: input.data ?? {},
    },
  });
  writePair(artifact, `${canonicalPrettyStringify(artifact)}\n`, renderArtifactMarkdown(artifact));
  seededRegistryArtifacts.push(artifact);
  return artifact;
}

function writePair(artifact, jsonContent, markdownContent) {
  const jsonPath = path.join(fixtureRoot, ...artifact.jsonPath.split("/"));
  const markdownPath = path.join(fixtureRoot, ...artifact.markdownPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(jsonPath, jsonContent, "utf8");
  fs.writeFileSync(markdownPath, markdownContent, "utf8");
}

function writeRegistry() {
  const registry = buildArtifactRegistry({
    updatedAt: fixedTime,
    entries: seededRegistryArtifacts.map((artifact) => buildArtifactRegistryEntry(artifact)),
  });
  const registryArtifact = buildCanonicalArtifact({
    artifactId: `${projectId}/system/artifact_registry`,
    artifactType: "artifact_registry",
    revision: 1,
    status: "active",
    projectId,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    markdownPath: "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md",
    jsonPath: "planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json",
    relationships: {
      sources: registry.entries.map((entry) => entry.artifactId),
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: "artifact_registry",
      title: "Canonical Artifact Registry",
      contentMarkdown: renderArtifactRegistryContentMarkdown(registry),
      data: registry,
    },
  });
  writePair(registryArtifact, `${canonicalPrettyStringify(registryArtifact)}\n`, renderArtifactMarkdown(registryArtifact));
}

function writeWorkspace() {
  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(
    workspacePath,
    `${JSON.stringify({
      schemaVersion: "champcity.project-workspaces.v1",
      selectedProjectId: projectId,
      projects: [{
        projectId,
        displayName: path.basename(fixtureRoot),
        repositoryRoot: fixtureRoot,
        planningRoot: path.join(fixtureRoot, "planning"),
        branchBehavior: { mode: "require", branch: "dev" },
        enabled: true,
        createdAt: fixedTime,
        updatedAt: fixedTime,
        lastOpenedAt: null,
        lastScanAt: null,
        lastScanResult: null,
        observerStatus: "stopped",
      }],
    }, null, 2)}\n`,
    "utf8",
  );
}

async function getMaintenanceSnapshot(window) {
  const snapshot = await window.webContents.executeJavaScript(
    `window.champCity.getCurrentGovernanceMaintenance()`,
    true,
  );
  assert.equal(snapshot.ok, true, snapshot.errorMessages?.join(" "));
  assert.ok(snapshot.currentRequiredAction?.currentAction, "maintenance snapshot must include current action projection");
  return snapshot;
}

async function clickButton(window, label) {
  await waitFor(
    window,
    `visibleButtons().some((button) => button.textContent.includes(${JSON.stringify(label)}) && !button.disabled)`,
    `enabled button ${label}`,
  );
  const clicked = await window.webContents.executeJavaScript(
    `(() => {
      const button = visibleButtons().find((candidate) => candidate.textContent.includes(${JSON.stringify(label)}) && !candidate.disabled);
      button?.click();
      return Boolean(button);
    })()`,
    true,
  );
  assert.equal(clicked, true, `Button not found: ${label}`);
}

async function bodyText(window) {
  return window.webContents.executeJavaScript("document.body.innerText", true);
}

async function waitForWindow() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const [window] = BrowserWindow.getAllWindows();
    if (window && !window.isDestroyed()) return window;
    await sleep(100);
  }
  throw new Error("Timed out waiting for BrowserWindow.");
}

async function waitFor(window, expression, description, timeoutMs = 25000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const ok = await window.webContents.executeJavaScript(expression, true);
      if (ok) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ""}`);
}

function visibleButtonsExpression() {
  return `
    window.visibleButtons = () => [...document.querySelectorAll("button")]
      .filter((button) => {
        const style = window.getComputedStyle(button);
        return style.display !== "none" && style.visibility !== "hidden" && button.offsetParent !== null;
      });
    true;
  `;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shutdown(removeFixture, code = 0) {
  try {
    await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
  } catch {}
  for (const candidate of BrowserWindow.getAllWindows()) candidate.destroy();
  if (removeFixture) {
    cleanupPath(fixtureRoot);
    cleanupPath(workspacePath);
  }
  app.exit(code);
}

function cleanupPath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
