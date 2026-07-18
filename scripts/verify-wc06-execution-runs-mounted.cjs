const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const repositoryRoot = path.resolve(__dirname, "..");
const runtimeRoot = path.join(repositoryRoot, "tmp", "mounted-electron-runtime", "wc06-execution-runs-normal");
const userDataRoot = path.join(runtimeRoot, "user-data");
const workspacePath = path.join(userDataRoot, "project-workspaces.json");
const internalFixtureRoot = path.join(repositoryRoot, "tmp", "wc06-mounted-contamination-project");
const externalFixtureRoot = path.join(os.tmpdir(), "champcity-wc06-external-user-project");
const fixedTime = "2026-07-18T23:30:00.000Z";
const prepare = process.argv.includes("--prepare");
const restart = process.argv.includes("--restart");
const cleanup = process.argv.includes("--cleanup");

process.env.CHAMPCITY_ELECTRON_RUNTIME_ROOT = runtimeRoot;
delete process.env.CHAMPCITY_ALLOW_REPOSITORY_TMP_PROJECTS;

if (prepare) prepareContaminatedRegistry();

require("../dist/main/main.js");

app.whenReady().then(async () => {
  try {
    const window = await waitForWindow();
    await window.webContents.executeJavaScript(visibleButtonsExpression(), true);
    await waitFor(
      window,
      `window.champCity.listProjects().then((result) => result.ok && result.selectedProjectId === "champcity-ai" && result.projects.some((project) => project.projectId === "external-user-project") && result.projects.every((project) => !project.repositoryRoot.replaceAll("\\\\", "/").includes("/tmp/wc06-mounted-contamination-project")))`,
      "normal startup contamination repair",
    );
    const projects = await window.webContents.executeJavaScript(`window.champCity.listProjects()`, true);
    assert.equal(projects.selectedProjectId, "champcity-ai");
    assert.ok(projects.projects.some((project) => project.projectId === "external-user-project"));
    assert.equal(
      projects.projects.some((project) => project.projectId === "internal-tmp-fixture"),
      false,
    );

    await openExecutionRunsWorkspace(window);
    await waitFor(
      window,
      `document.body.innerText.includes("Execution Runs") && document.body.innerText.includes("WC06")`,
      "Execution Runs supporting workspace with WC06",
    );
    await waitFor(
      window,
      `visibleButtons().some((button) => (button.textContent.includes("Start Execution Run") || button.textContent.includes("Open Execution Run")) && !button.disabled)`,
      "enabled Execution Run start or open control",
    );

    const startedOrOpened = await window.webContents.executeJavaScript(
      `(async () => {
        const text = document.body.innerText;
        const buttons = visibleButtons().reverse();
        const start = buttons.find((button) => button.textContent.includes("Start Execution Run") && !button.disabled);
        const open = buttons.find((button) => button.textContent.includes("Open Execution Run") && !button.disabled);
        if (start) {
          start.click();
          return "started";
        }
        if (open) {
          open.click();
          return "opened";
        }
        return text;
      })()`,
      true,
    );
    assert.ok(["started", "opened"].includes(startedOrOpened), String(startedOrOpened));
    await waitFor(
      window,
      `(() => { const text = document.body.innerText.toLowerCase(); return text.includes("run status") && document.body.innerText.includes("P01") && text.includes("runner transport") && text.includes("deferred"); })()`,
      "Execution Run visible status",
    );
    await waitFor(
      window,
      `visibleButtons().some((button) => button.textContent.includes("Preview next packet") && !button.disabled)`,
      "enabled bounded packet preview control",
    );

    await window.webContents.executeJavaScript(
      `(visibleButtons().reverse().find((button) => button.textContent.includes("Preview next packet") && !button.disabled)?.click(), true)`,
      true,
    );
    await waitFor(
      window,
      `document.body.innerText.includes("Execution Pass Packet") && document.body.innerText.includes("R01-DEFINITION-SCHEMA")`,
      "bounded next packet preview",
    );
    const uiEvidence = await window.webContents.executeJavaScript(
      `({
        text: document.body.innerText,
        buttonText: [...document.querySelectorAll("button")].map((button) => button.textContent || ""),
        inputText: [...document.querySelectorAll("input, select, textarea")].map((field) => field.getAttribute("aria-label") || field.getAttribute("name") || field.textContent || "")
      })`,
      true,
    );
    const controlText = [...uiEvidence.buttonText, ...uiEvidence.inputText].join(" ");
    assert.equal(/Queue|Process Execution Run|Complete Execution Run|Verifier decision|Operator acceptance/i.test(controlText), false);

    console.log(JSON.stringify({
      wc06ExecutionRunsMounted: "passed",
      mode: restart ? "restart" : "initial",
      selectedProjectId: projects.selectedProjectId,
      projectCount: projects.projects.length,
      internalTmpFixturePresent: false,
      externalProjectPreserved: true,
      visibleWorkflowEvidence: {
        workspace: "Execution Runs",
        workCard: "WC06",
        currentPass: "P01",
        runnerTransport: "deferred",
        boundedPacketPreview: true,
      },
    }));
    await require("../dist/main/canonicalRuntime.js").shutdownCanonicalRuntime();
    for (const candidate of BrowserWindow.getAllWindows()) candidate.destroy();
    if (cleanup) {
      cleanupPath(internalFixtureRoot);
      cleanupPath(workspacePath);
      cleanupPath(externalFixtureRoot);
    }
    app.exit(0);
  } catch (error) {
    try {
      const [window] = BrowserWindow.getAllWindows();
      if (window) {
        console.error(
          await window.webContents.executeJavaScript(
            `document.body.innerText.slice(0, 5000)`,
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

function prepareContaminatedRegistry() {
  fs.rmSync(runtimeRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.rmSync(internalFixtureRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  for (const folder of [internalFixtureRoot, externalFixtureRoot]) {
    fs.mkdirSync(path.join(folder, "planning"), { recursive: true });
    fs.writeFileSync(
      path.join(folder, "package.json"),
      JSON.stringify({ name: path.basename(folder) }),
      "utf8",
    );
  }
  fs.mkdirSync(userDataRoot, { recursive: true });
  const real = configured("champcity-ai", repositoryRoot);
  const internal = configured("internal-tmp-fixture", internalFixtureRoot);
  const external = configured("external-user-project", externalFixtureRoot);
  fs.writeFileSync(
    workspacePath,
    `${JSON.stringify({
      schemaVersion: "champcity.project-workspaces.v1",
      selectedProjectId: internal.projectId,
      projects: [internal, external, real],
    }, null, 2)}\n`,
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

function configured(projectId, repositoryRootValue) {
  return {
    projectId,
    displayName: path.basename(repositoryRootValue),
    repositoryRoot: repositoryRootValue,
    planningRoot: path.join(repositoryRootValue, "planning"),
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

async function openExecutionRunsWorkspace(window) {
  await window.webContents.executeJavaScript(
    `([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Supporting tools"))?.click(), true)`,
    true,
  );
  await waitFor(
    window,
    `document.body.innerText.includes("Execution Runs")`,
    "Supporting tools menu contains Execution Runs",
  );
  await window.webContents.executeJavaScript(
    `([...document.querySelectorAll("button")].find((button) => button.textContent.trim().includes("Execution Runs"))?.click(), true)`,
    true,
  );
}

function visibleButtonsExpression() {
  return `window.visibleButtons = () => [...document.querySelectorAll("button")].filter((button) => button.getClientRects().length > 0); true`;
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

async function waitFor(window, expression, description, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(expression, true)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const bodyText = await window.webContents.executeJavaScript(
    `document.body?.innerText ?? ""`,
    true,
  ).catch(() => "<renderer unavailable>");
  throw new Error(`Timed out waiting for ${description}. Renderer text: ${bodyText.slice(0, 1600)}`);
}
