const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");

const phase = "phase-03";
const targetId = "WC08-REPAIR04";
const targetTitle =
  "Controlled Route Recovery and Accurate Route Evidence Authority";
const targetWorkCardFileName =
  "WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.json";
const targetBuilderReportFileName =
  "BUILDER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";
const targetBuilderReportPath =
  `planning/phases/${phase}/Builder_Reports/${targetBuilderReportFileName}`;
const referenceId = "WC08-REPAIR05";
const referenceTitle =
  "Architect Review Route and Repair Work Card Association";
const referenceWorkCardFileName =
  "WC08-REPAIR05_architect_review_route_and_repair_work_card_association.json";
const referenceBuilderReportFileName =
  "BUILDER_REPORT_WC08-REPAIR05_architect_review_route_and_repair_work_card_association.md";
const expectedOutputFileName =
  "ARCHITECT_REVIEW_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";
const expectedOutputPath =
  `planning/phases/${phase}/Architect_Reviews/${expectedOutputFileName}`;

let latestPreviewPayload;
let latestSavePayload;

app.disableHardwareAcceleration();

const runtimeRoot = path.join(
  __dirname,
  "..",
  "tmp",
  "electron-runtime",
  "wc08-repair06-mounted-renderer",
);
app.setPath("userData", path.join(runtimeRoot, "user-data"));
app.setPath("sessionData", path.join(runtimeRoot, "session-data"));
app.setPath("logs", path.join(runtimeRoot, "logs"));
app.setPath("crashDumps", path.join(runtimeRoot, "crash-dumps"));

const workCards = [
  {
    fileName: targetWorkCardFileName,
    workCardId: targetId,
    title: targetTitle,
    status: "in_progress",
    phase,
    riskLevel: "medium",
    parentWorkCardId: "WC08",
    kind: "repair",
  },
  {
    fileName: referenceWorkCardFileName,
    workCardId: referenceId,
    title: referenceTitle,
    status: "implemented_awaiting_architect_review",
    phase,
    riskLevel: "medium",
    parentWorkCardId: "WC08",
    kind: "repair",
  },
];

const currentAction = {
  id: "architect_review_of_implementer_report_required",
  workflowStep: "Work Card Loop",
  title: "Architect review of repair Implementer Report required",
  summary: "The routed repair Implementer Report requires Architect review.",
  responsibleRole: "architect",
  phaseId: phase,
  phaseTitle: "Workflow Router Screen Correction",
  workCardId: targetId,
  workCardTitle: targetTitle,
  status: "needs_review",
  reason: "The current action is authoritative for the review target.",
  sourceArtifacts: [
    {
      path: `planning/phases/${phase}/Builder_Reports/${referenceBuilderReportFileName}`,
      role: "Reference repair Implementer Report",
      exists: true,
    },
    {
      path: targetBuilderReportPath,
      role: "Repair Implementer Report",
      status: "authoritative_current_action_implementer_report",
      exists: true,
    },
  ],
  missingArtifacts: [],
  expectedOutput: {
    path: expectedOutputPath,
    artifactType: "Repair Architect Review",
    description: "Architect decision for the routed repair target.",
  },
  successRoute: "Repair Operator validation",
  manualFallback: {
    available: true,
    instructions: "Use the exact routed repair artifacts.",
    artifactPath: expectedOutputPath,
  },
  warnings: [],
};

function architectReviewResult(input) {
  return {
    ok: true,
    reviewMarkdown: [
      `# Architect Review of Repair Implementer Report - ${targetId} ${targetTitle}`,
      "",
      `- Source Work Card JSON: ${input.workCardFileName}`,
      `- Associated Implementer Report: ${input.builderReportFileName}`,
    ].join("\n"),
    savedFileName: expectedOutputFileName,
    workCardId: targetId,
    workCardTitle: targetTitle,
    workCardFileName: input.workCardFileName,
    builderReportFileName: input.builderReportFileName,
    reviewMode: "repair",
    validation: { valid: true, errors: [] },
  };
}

function registerIpcHandlers() {
  const preloadSource = readFileSync(
    path.join(__dirname, "..", "src", "preload", "index.ts"),
    "utf8",
  );
  const channels = new Set(
    [...preloadSource.matchAll(/ipcRenderer\.invoke\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    ),
  );

  const specificHandlers = new Map([
    ["workCards:listAvailablePhases", () => ({ ok: true, phases: [phase] })],
    [
      "workCards:listSaved",
      () => ({ ok: true, workCards, invalidFiles: [] }),
    ],
    [
      "workCards:getCurrentRequiredAction",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return {
          ok: true,
          currentAction,
          workflowSteps: [],
        };
      },
    ],
    [
      "workCards:listHumanValidationBuilderReports",
      () => ({
        ok: true,
        options: [
          {
            fileName: targetBuilderReportFileName,
            label: targetBuilderReportFileName,
            isDefaultMatch: true,
            modifiedAt: "2026-07-14T00:00:00.000Z",
          },
          {
            fileName: referenceBuilderReportFileName,
            label: referenceBuilderReportFileName,
            isDefaultMatch: false,
            modifiedAt: "2026-07-14T00:00:00.000Z",
          },
        ],
        invalidFiles: [],
        defaultFileName: targetBuilderReportFileName,
      }),
    ],
    [
      "workCards:loadBuilderReportFile",
      (_event, input) => ({
        ok: true,
        fileName: input.fileName,
        content: `# Implementer Report - ${targetId}\n\nMounted renderer fixture.`,
      }),
    ],
    [
      "workCards:previewArchitectReviewRecord",
      (_event, input) => {
        latestPreviewPayload = structuredClone(input);
        return architectReviewResult(input);
      },
    ],
    [
      "workCards:saveArchitectReviewRecord",
      (_event, input) => {
        latestSavePayload = structuredClone(input);
        return {
          ...architectReviewResult(input),
          markdownPath: expectedOutputPath,
        };
      },
    ],
  ]);

  for (const channel of channels) {
    const handler = specificHandlers.get(channel) ?? (() => ({ ok: true }));
    ipcMain.handle(channel, handler);
  }
}

async function waitFor(window, expression, description, timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await window.webContents.executeJavaScript(expression, true)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

function setSelectValueScript(labelText, value, exactLabel = false) {
  return `(() => {
    const label = [...document.querySelectorAll("label")].find((candidate) =>
      ${exactLabel ? "candidate.textContent.trim() === " : "candidate.textContent.includes("}${JSON.stringify(labelText)}${exactLabel ? "" : ")"}
    );
    const select = label?.querySelector("select") ?? label?.parentElement?.querySelector("select");
    if (!select) return false;
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`;
}

function readSelectValueExpression(labelText, exactLabel = false) {
  return `(() => {
    const label = [...document.querySelectorAll("label")].find((candidate) =>
      ${exactLabel ? "candidate.textContent.trim() === " : "candidate.textContent.includes("}${JSON.stringify(labelText)}${exactLabel ? "" : ")"}
    );
    return (label?.querySelector("select") ?? label?.parentElement?.querySelector("select"))?.value ?? "";
  })()`;
}

function assertRoutedPayload(payload, label) {
  assert.ok(payload, `${label} must be captured.`);
  assert.equal(payload.phase, phase);
  assert.equal(payload.workCardFileName, targetWorkCardFileName);
  assert.equal(payload.builderReportFileName, targetBuilderReportFileName);
  assert.deepEqual(payload.routedReviewBinding, {
    bindingSource: "current_action",
    currentActionId: "architect_review_of_implementer_report_required",
    phaseId: phase,
    workCardId: targetId,
    workCardTitle: targetTitle,
    builderReportPath: targetBuilderReportPath,
    builderReportFileName: targetBuilderReportFileName,
    expectedOutputPath,
    expectedOutputFileName,
    blockingState: { blocked: false, issues: [] },
  });
}

async function run() {
  registerIpcHandlers();

  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "dist", "preload", "index.js"),
    },
  });

  await window.loadFile(
    path.join(__dirname, "..", "dist", "renderer", "index.html"),
  );

  await waitFor(
    window,
    `${readSelectValueExpression("Reference card")} !== undefined && [...document.querySelectorAll("label")].some((label) => label.textContent.includes("Reference card") && label.querySelectorAll("option").length >= 3)`,
    "reference-card options",
  );
  assert.equal(
    await window.webContents.executeJavaScript(
      setSelectValueScript("Reference card", referenceWorkCardFileName),
      true,
    ),
    true,
  );
  await waitFor(
    window,
    `${readSelectValueExpression("Reference card")} === ${JSON.stringify(referenceWorkCardFileName)}`,
    "WC08-REPAIR05 reference context",
  );

  await waitFor(
    window,
    `document.body.innerText.includes("Architect Review of Repair Implementer Report") && document.body.innerText.includes("Bound from current action:")`,
    "routed Architect Review screen",
  );
  await waitFor(
    window,
    `${readSelectValueExpression("Routed current-action Work Card", true)} === ${JSON.stringify(targetWorkCardFileName)} && ${readSelectValueExpression("Associated Implementer Report", true)} === ${JSON.stringify(targetBuilderReportFileName)}`,
    "routed Work Card and report selection",
  );
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(expectedOutputFileName)}) && document.body.innerText.includes("Binding source: current_action")`,
    "routed preview and visible binding notice",
  );
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(`# Architect Review of Repair Implementer Report - ${targetId}`)})`,
    "WC08-REPAIR04 preview target",
  );

  assert.equal(
    await window.webContents.executeJavaScript(
      readSelectValueExpression("Reference card"),
      true,
    ),
    referenceWorkCardFileName,
  );
  assertRoutedPayload(latestPreviewPayload, "Preview payload after initialization");

  for (const referenceFileName of [
    targetWorkCardFileName,
    referenceWorkCardFileName,
  ]) {
    await window.webContents.executeJavaScript(
      setSelectValueScript("Reference card", referenceFileName),
      true,
    );
    await waitFor(
      window,
      `${readSelectValueExpression("Reference card")} === ${JSON.stringify(referenceFileName)}`,
      `reference-card state update to ${referenceFileName}`,
    );
  }

  assert.equal(
    await window.webContents.executeJavaScript(
      readSelectValueExpression("Routed current-action Work Card", true),
      true,
    ),
    targetWorkCardFileName,
  );
  assert.equal(
    await window.webContents.executeJavaScript(
      readSelectValueExpression("Associated Implementer Report", true),
      true,
    ),
    targetBuilderReportFileName,
  );
  assertRoutedPayload(latestPreviewPayload, "Preview payload after state updates");

  const clickedSave = await window.webContents.executeJavaScript(
    `(() => {
      const button = [...document.querySelectorAll("button")].find(
        (candidate) => candidate.textContent.trim() === "Save Architect Review" && !candidate.disabled,
      );
      button?.click();
      return Boolean(button);
    })()`,
    true,
  );
  assert.equal(clickedSave, true, "The mounted routed review must be saveable.");
  await waitFor(
    window,
    `document.body.innerText.includes("Architect Review saved.")`,
    "Architect Review save completion",
  );
  assertRoutedPayload(latestSavePayload, "Save payload after state updates");

  window.destroy();
  console.log(
    "WC08-REPAIR06 mounted renderer fixture passed: WC08-REPAIR05 reference context could not retarget the rendered form, selected report, preview, or save payload away from WC08-REPAIR04.",
  );
}

app.whenReady().then(run).then(
  () => app.exit(0),
  (error) => {
    console.error(error);
    app.exit(1);
  },
);
