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
const targetImplementerReportFileName =
  "IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";
const targetImplementerReportPath =
  `planning/phases/${phase}/Implementer_Reports/${targetImplementerReportFileName}`;
const referenceId = "WC08-REPAIR05";
const referenceTitle =
  "Architect Review Route and Repair Work Card Association";
const referenceWorkCardFileName =
  "WC08-REPAIR05_architect_review_route_and_repair_work_card_association.json";
const referenceImplementerReportFileName =
  "IMPLEMENTER_REPORT_WC08-REPAIR05_architect_review_route_and_repair_work_card_association.md";
const expectedOutputFileName =
  "ARCHITECT_REVIEW_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";
const expectedOutputPath =
  `planning/phases/${phase}/Architect_Reviews/${expectedOutputFileName}`;
const routedArchitectReviewBinding = {
  bindingSource: "routed_action_and_artifact_registry",
  currentActionId: "architect_review_of_implementer_report_required",
  workflowStateRevision: 1,
  targetArtifactId: "champcity-ai/phase-03/work_card/WC08-REPAIR04",
  sourceArtifactId:
    "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
  expectedOutputArtifactId:
    "champcity-ai/phase-03/architect_review/WC08-REPAIR04",
  phaseId: phase,
  workCardId: targetId,
  workCardTitle: targetTitle,
  implementerReportPath: targetImplementerReportPath,
  implementerReportFileName: targetImplementerReportFileName,
  expectedOutputPath,
  expectedOutputFileName,
  blockingState: { blocked: false, issues: [] },
};

let latestPreviewPayload;
let latestSavePayload;
let workflowAdvanced = false;
let productionProjection = true;

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
    fileName:
      "WC09-REPAIR01_canonical_lifecycle_alignment_and_multi_work_card_loop_completion.json",
    workCardId: "WC09-REPAIR01",
    title: "Canonical Lifecycle Alignment and Multi-Work-Card Loop Completion",
    status: "ready_for_implementer",
    phase,
    riskLevel: "high",
    parentWorkCardId: "WC09",
    kind: "repair",
  },
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
      path: `planning/phases/${phase}/Implementer_Reports/${referenceImplementerReportFileName}`,
      role: "Reference repair Implementer Report",
      exists: true,
    },
    {
      path: targetImplementerReportPath,
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
  routedAction: {
    schemaVersion: "champcity.routed-action.v1",
    actionId: "architect_review_of_implementer_report_required",
    stage: "prove",
    role: "architect",
    screenId: "architect-review",
    targetArtifactId: "champcity-ai/phase-03/work_card/WC08-REPAIR04",
    sourceArtifactIds: [
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
    ],
    expectedOutput: {
      artifactId: "champcity-ai/phase-03/architect_review/WC08-REPAIR04",
      artifactType: "architect_review",
    },
    routes: {
      success: "operator_validation_required",
      failure: "architect_review_of_implementer_report_required",
      repair: "architect_disposition_required",
    },
    bindingSource: {
      kind: "workflow_state_index",
      workflowStateArtifactId: "champcity-ai/system/workflow_state",
      stateRevision: 1,
    },
    authorityStatus: "ready",
    blockers: [],
    stateRevision: 1,
  },
};

const operatorValidationAction = {
  ...currentAction,
  id: "operator_validation_required",
  title: "Operator Validation required",
  summary: "Validate the routed WC08-REPAIR04 Architect Review.",
  responsibleRole: "operator",
  status: "needs_validation",
  sourceArtifacts: [
    { path: expectedOutputPath, role: "Architect Review", exists: true },
  ],
  routedAction: {
    ...currentAction.routedAction,
    actionId: "operator_validation_required",
    role: "operator",
    screenId: "operator-validation",
    sourceArtifactIds: [
      "champcity-ai/phase-03/architect_review/WC08-REPAIR04",
    ],
    expectedOutput: {
      artifactId: "champcity-ai/phase-03/operator_validation/WC08-REPAIR04",
      artifactType: "operator_validation",
    },
    stateRevision: 2,
    bindingSource: {
      kind: "workflow_state_index",
      workflowStateArtifactId: "champcity-ai/system/workflow_state",
      stateRevision: 2,
    },
  },
};

const productionCurrentAction = {
  id: "implementer_execution_required",
  workflowStep: "Work Card Loop",
  title: "Execute WC09-REPAIR01 and create the Implementer Report",
  summary: "The canonical active repair is the current implementation obligation.",
  responsibleRole: "implementer",
  phaseId: phase,
  phaseTitle: "Workflow Router Screen Correction",
  workCardId: "WC09-REPAIR01",
  workCardTitle: "Canonical Lifecycle Alignment and Multi-Work-Card Loop Completion",
  status: "implementer_active",
  reason: "The synchronized Architect Review requires this controlling repair.",
  sourceArtifacts: [
    {
      path:
        "planning/phases/phase-03/Work_Cards/WC09-REPAIR01_canonical_lifecycle_alignment_and_multi_work_card_loop_completion.md",
      role: "Controlling repair Work Card",
      exists: true,
    },
  ],
  missingArtifacts: [],
  expectedOutput: {
    path:
      "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09-REPAIR01_canonical_lifecycle_alignment_and_multi_work_card_loop_completion.md",
    artifactType: "Implementer Report",
    description: "Implementation evidence for the controlling repair.",
  },
  successRoute: "Architect Review",
  manualFallback: {
    available: true,
    instructions: "Create the exact routed Implementer Report pair.",
    artifactPath:
      "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09-REPAIR01_canonical_lifecycle_alignment_and_multi_work_card_loop_completion.md",
  },
  warnings: [],
  routedAction: {
    schemaVersion: "champcity.routed-action.v1",
    actionId: "implementer_execution_required",
    stage: "build",
    role: "implementer",
    screenId: "implementer-execution",
    targetArtifactId: "champcity-ai/phase-03/work_card/WC09-REPAIR01",
    sourceArtifactIds: ["champcity-ai/phase-03/work_card/WC09-REPAIR01"],
    expectedOutput: {
      artifactId: "champcity-ai/phase-03/implementer_report/WC09-REPAIR01",
      artifactType: "implementer_report",
    },
    routes: {
      success: "architect_review_of_implementer_report_required",
      failure: "implementer_execution_required",
      repair: "architect_disposition_required",
    },
    bindingSource: {
      kind: "workflow_state_index",
      workflowStateArtifactId: "champcity-ai/system/workflow_state",
      stateRevision: 2,
    },
    authorityStatus: "ready",
    blockers: [],
    stateRevision: 2,
  },
};

function architectReviewResult(input) {
  return {
    ok: true,
    reviewMarkdown: [
      `# Architect Review of Repair Implementer Report - ${targetId} ${targetTitle}`,
      "",
      `- Source Work Card JSON: ${input.workCardFileName}`,
      `- Associated Implementer Report: ${input.implementerReportFileName}`,
    ].join("\n"),
    savedFileName: expectedOutputFileName,
    workCardId: targetId,
    workCardTitle: targetTitle,
    workCardFileName: input.workCardFileName,
    implementerReportFileName: input.implementerReportFileName,
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
    [
      ...preloadSource.matchAll(
        /(?:ipcRenderer\.invoke|invokeProcess)\(\s*"([^"]+)"/g,
      ),
    ].map((match) => match[1]),
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
          currentAction: productionProjection
            ? productionCurrentAction
            : workflowAdvanced
              ? operatorValidationAction
              : currentAction,
          ...(!productionProjection && !workflowAdvanced
            ? { routedArchitectReviewBinding }
            : {}),
          workflowSteps: [],
        };
      },
    ],
    [
      "workCards:listHumanValidationImplementerReports",
      () => ({
        ok: true,
        options: [
          {
            fileName: targetImplementerReportFileName,
            label: targetImplementerReportFileName,
            isDefaultMatch: true,
            modifiedAt: "2026-07-14T00:00:00.000Z",
          },
          {
            fileName: referenceImplementerReportFileName,
            label: referenceImplementerReportFileName,
            isDefaultMatch: false,
            modifiedAt: "2026-07-14T00:00:00.000Z",
          },
        ],
        invalidFiles: [],
        defaultFileName: targetImplementerReportFileName,
      }),
    ],
    [
      "workCards:loadImplementerReportFile",
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
        workflowAdvanced = true;
        return {
          ...architectReviewResult(input),
          markdownPath: expectedOutputPath,
          jsonPath: expectedOutputPath.replace(/\.md$/, ".json"),
          workflowTransition: {
            fromActionId: "architect_review_of_implementer_report_required",
            toActionId: "operator_validation_required",
            workflowStateRevision: 2,
            nextScreenId: "operator-validation",
          },
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
  assert.equal(payload.implementerReportFileName, targetImplementerReportFileName);
  assert.deepEqual(payload.routedReviewBinding, routedArchitectReviewBinding);
}

async function run() {
  registerIpcHandlers();

  const createWindow = () => new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "dist", "preload", "index.js"),
    },
  });

  const productionWindow = createWindow();
  await productionWindow.loadFile(
    path.join(__dirname, "..", "dist", "renderer", "index.html"),
  );
  await waitFor(
    productionWindow,
    `document.body.innerText.includes("WC09-REPAIR01") && document.body.innerText.includes("Implementer Report Capture") && document.body.innerText.includes("Implementer")`,
    "derived WC09-REPAIR01 Implementer workspace",
  );
  productionProjection = false;
  const window = createWindow();

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
    `${readSelectValueExpression("Routed current-action Work Card", true)} === ${JSON.stringify(targetWorkCardFileName)} && ${readSelectValueExpression("Associated Implementer Report", true)} === ${JSON.stringify(targetImplementerReportFileName)}`,
    "routed Work Card and report selection",
  );
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(expectedOutputFileName)}) && document.body.innerText.includes("Binding source: routed_action_and_artifact_registry")`,
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
    targetImplementerReportFileName,
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
    `document.body.innerText.includes("Human Validation") || document.body.innerText.includes("Operator Validation")`,
    "workflow transition to Operator Validation",
  );
  assertRoutedPayload(latestSavePayload, "Save payload after state updates");

  window.destroy();
  productionWindow.destroy();
  console.log(
    "WC09 mounted renderer fixture passed: the derived WC09-REPAIR01 Implementer workspace mounted, WC08-REPAIR05 reference context could not retarget the WC08-REPAIR04 regression fixture, save succeeded, and the fixture advanced to Operator Validation.",
  );
}

app.whenReady().then(run).then(
  () => app.exit(0),
  (error) => {
    console.error(error);
    app.exit(1);
  },
);
