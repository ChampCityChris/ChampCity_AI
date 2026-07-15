const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");

const { CanonicalWorkflowAuthority } = require("../dist/main/workCards/canonicalWorkflowAuthority");
const { RoutedProcessInvocationService } = require("../dist/main/workflow");
const {
  createPhaseExecutionState,
  createWorkflowStateIndex,
  defaultLifecycleActionTemplates,
  materializeActionCatalog,
} = require("../dist/shared/workflow");
const {
  renderArchitectReviewRecord,
  validateArchitectReviewAssociation,
  validateArchitectReviewForm,
} = require("../dist/shared/workCards/architectReviewRecord");

const phase = "phase-03";
const targetId = "WC09-REPAIR02";
const targetTitle = "Locked Process Contract and Evidence Precedence Correction";
const slug = "locked_process_contract_and_evidence_precedence_correction";
const targetArtifactId = `champcity-ai/${phase}/work_card/${targetId}`;
const reportArtifactId = `champcity-ai/${phase}/implementer_report/${targetId}`;
const outputArtifactId = `champcity-ai/${phase}/architect_review/${targetId}`;
const validationArtifactId = `champcity-ai/${phase}/validation_report/${targetId}`;
const targetWorkCardFileName = `${targetId}_${slug}.json`;
const reportFileName = `IMPLEMENTER_REPORT_${targetId}_${slug}.md`;
const outputFileName = `ARCHITECT_REVIEW_${targetId}_${slug}.md`;
const outputPath = `planning/phases/${phase}/Architect_Reviews/${outputFileName}`;
const referenceFileName = "WC09-REPAIR01_reference_only.json";

let projectRoot;
let authority;
let routedInvocations;
let latestPreviewPayload;
let latestSavePayload;
let latestSaveResult;

app.disableHardwareAcceleration();

function actionBindings() {
  const bindings = Object.fromEntries(
    defaultLifecycleActionTemplates.map((template) => [
      template.actionId,
      {
        targetArtifactId: `champcity-ai/test/target/${template.actionId}`,
        sourceArtifactIds: [`champcity-ai/test/source/${template.actionId}`],
        expectedOutputArtifactId: `champcity-ai/test/output/${template.actionId}`,
      },
    ]),
  );
  bindings.architect_review_of_implementer_report_required = {
    targetArtifactId,
    sourceArtifactIds: [reportArtifactId],
    expectedOutputArtifactId: outputArtifactId,
  };
  bindings.operator_validation_required = {
    targetArtifactId,
    sourceArtifactIds: [outputArtifactId],
    expectedOutputArtifactId: validationArtifactId,
  };
  return bindings;
}

async function seedCanonicalRepository() {
  projectRoot = await mkdtemp(path.join(os.tmpdir(), "champcity-wc01-mounted-"));
  const runtimeRoot = path.join(projectRoot, ".electron");
  app.setPath("userData", path.join(runtimeRoot, "user-data"));
  app.setPath("sessionData", path.join(runtimeRoot, "session-data"));
  app.setPath("logs", path.join(runtimeRoot, "logs"));
  app.setPath("crashDumps", path.join(runtimeRoot, "crash-dumps"));

  let tick = 0;
  authority = new CanonicalWorkflowAuthority(projectRoot, () =>
    new Date(Date.parse("2026-07-15T17:00:00.000Z") + tick++ * 1000).toISOString(),
  );
  await authority.artifactPairs.commitArtifact({
    artifactId: targetArtifactId,
    artifactType: "work_card",
    status: "active",
    projectId: "champcity-ai",
    phaseId: phase,
    workCardId: targetId,
    parentArtifactId: `champcity-ai/${phase}/work_card/WC09`,
    relationships: { sources: [], expectedOutputs: [outputArtifactId], supersedes: [], children: [] },
    payload: {
      title: `Repair Work Card: ${targetId} ${targetTitle}`,
      contentMarkdown: `# Repair Work Card: ${targetId} - ${targetTitle}\n`,
      data: { workCardId: targetId, parentWorkCardId: "WC09" },
    },
    location: {
      directoryPath: `planning/phases/${phase}/Work_Cards`,
      fileStem: `${targetId}_${slug}`,
    },
    expectedRevision: null,
  });
  await authority.artifactPairs.commitArtifact({
    artifactId: reportArtifactId,
    artifactType: "implementer_report",
    status: "active",
    projectId: "champcity-ai",
    phaseId: phase,
    workCardId: targetId,
    relationships: { sources: [targetArtifactId], expectedOutputs: [outputArtifactId], supersedes: [], children: [] },
    payload: {
      title: `Implementer Report: ${targetId}`,
      contentMarkdown: `# Implementer Report: ${targetId}\n\nMounted production-path evidence.\n`,
      data: {},
    },
    location: {
      directoryPath: `planning/phases/${phase}/Implementer_Reports`,
      fileStem: `IMPLEMENTER_REPORT_${targetId}_${slug}`,
    },
    expectedRevision: null,
  });

  const phaseExecution = createPhaseExecutionState({
    workCardPlanArtifactId: `champcity-ai/${phase}/work_card_plan/Work_Card_Plan`,
    workCardPlanAuthority: "authoritative",
    approvedCandidates: [{
      candidateId: targetId,
      order: 1,
      title: targetTitle,
      fullWorkCardArtifactId: targetArtifactId,
      fullWorkCardStatus: "active",
      resolutionStatus: "unresolved",
      resolutionEvidenceArtifactIds: [],
    }],
    activeCandidateId: targetId,
    activeRepairArtifactId: targetArtifactId,
  });
  const state = createWorkflowStateIndex({
    projectId: "champcity-ai",
    activePhaseId: phase,
    createdAt: "2026-07-15T17:10:00.000Z",
    initialActionId: "architect_review_of_implementer_report_required",
    actions: materializeActionCatalog(defaultLifecycleActionTemplates, actionBindings()),
    phaseExecution,
  });
  await authority.workflowStateStore.initialize(state);
  routedInvocations = new RoutedProcessInvocationService(
    authority.routedActions,
    authority.workflowStateStore,
    authority.artifactPairs,
  );
}

async function previewReview(input) {
  const authorized = await authority.authorizeArchitectReview(input.routedReviewBinding);
  const target = {
    workCardId: authorized.workCardId,
    title: authorized.workCardTitle,
    parentWorkCardId: "WC09",
  };
  const canonicalInput = {
    ...input,
    phase: authorized.phaseId,
    workCardFileName: authorized.workCardFileName,
    implementerReportFileName: authorized.implementerReportFileName,
    routedReviewBinding: authorized.binding,
  };
  const associationErrors = validateArchitectReviewAssociation(canonicalInput, target);
  if (associationErrors.length > 0) throw new Error(associationErrors.join(" "));
  const reviewMarkdown = renderArchitectReviewRecord(canonicalInput, target);
  return {
    ok: true,
    reviewMarkdown,
    savedFileName: authorized.expectedOutputFileName,
    workCardId: authorized.workCardId,
    workCardTitle: authorized.workCardTitle,
    workCardFileName: authorized.workCardFileName,
    implementerReportFileName: authorized.implementerReportFileName,
    reviewMode: "repair",
    validation: validateArchitectReviewForm(canonicalInput, reviewMarkdown),
  };
}

async function saveReview(input) {
  const preview = await previewReview(input);
  if (!preview.validation.valid) throw new Error(preview.validation.errors.join(" "));
  if (!input.decision) throw new Error("Choose an Architect Review decision before saving.");
  const authorized = await authority.authorizeArchitectReview(input.routedReviewBinding);
  const committed = await authority.commitArchitectReview({
    authority: authorized,
    reviewMarkdown: `${preview.reviewMarkdown.trimEnd()}\n`,
    decision: input.decision,
    reviewData: {
      phase: authorized.phaseId,
      workCardId: authorized.workCardId,
      workCardTitle: authorized.workCardTitle,
      workCardArtifactId: authorized.target.artifactId,
      implementerReportArtifactId: authorized.source.artifactId,
      decision: input.decision,
      workCardCompliance: input.workCardCompliance,
      changedFilesReviewed: input.changedFilesReviewed,
      acceptanceCriteriaAssessment: input.acceptanceCriteriaAssessment,
      validationClaimsAssessment: input.validationClaimsAssessment,
      skippedChecksAssessment: input.skippedChecksAssessment,
      observationRegisterImpact: input.observationRegisterImpact,
      operatorValidationSteps: input.operatorValidationSteps,
      requiredRepair: input.requiredRepair,
    },
  });
  return {
    ...preview,
    markdownPath: committed.pairCommit.artifact.markdownPath,
    jsonPath: committed.pairCommit.artifact.jsonPath,
    workflowTransition: {
      fromActionId: authorized.routedAction.actionId,
      toActionId: committed.transition.state.currentActionId,
      workflowStateRevision: committed.transition.state.stateRevision,
      nextScreenId: committed.transition.state.currentAction?.screenId,
    },
  };
}

function registerIpcHandlers() {
  const preloadSource = readFileSync(path.join(__dirname, "..", "src", "preload", "index.ts"), "utf8");
  const channels = new Set(
    [...preloadSource.matchAll(/(?:ipcRenderer\.invoke|invokeProcess)\(\s*"([^"]+)"/g)].map((match) => match[1]),
  );
  const workCards = [
    {
      fileName: targetWorkCardFileName,
      workCardId: targetId,
      title: targetTitle,
      status: "implemented_awaiting_architect_review",
      phase,
      riskLevel: "critical",
      parentWorkCardId: "WC09",
      kind: "repair",
    },
    {
      fileName: referenceFileName,
      workCardId: "WC09-REPAIR01",
      title: "Reference only",
      status: "complete",
      phase,
      riskLevel: "high",
      parentWorkCardId: "WC09",
      kind: "repair",
    },
  ];
  const handlers = new Map([
    ["workCards:listAvailablePhases", () => ({ ok: true, phases: [phase] })],
    ["workCards:listSaved", () => ({ ok: true, workCards, invalidFiles: [] })],
    ["workCards:getCurrentRequiredAction", () => authority.projectCurrentRequiredAction()],
    ["workCards:listHumanValidationImplementerReports", () => ({
      ok: true,
      options: [{ fileName: reportFileName, label: reportFileName, isDefaultMatch: true, modifiedAt: "2026-07-15T17:00:00.000Z" }],
      invalidFiles: [],
      defaultFileName: reportFileName,
    })],
    ["workCards:loadImplementerReportFile", () => ({
      ok: true,
      fileName: reportFileName,
      content: `# Implementer Report: ${targetId}\n\nMounted production-path evidence.`,
    })],
    ["workCards:previewArchitectReviewRecord", (_event, input, rendererBinding) => {
      latestPreviewPayload = structuredClone(input);
      return routedInvocations.invoke({
        channel: "workCards:previewArchitectReviewRecord",
        rendererBinding,
        payload: input,
        operation: () => previewReview(input),
      });
    }],
    ["workCards:saveArchitectReviewRecord", async (_event, input, rendererBinding) => {
      latestSavePayload = structuredClone(input);
      latestSaveResult = await routedInvocations.invoke({
        channel: "workCards:saveArchitectReviewRecord",
        rendererBinding,
        payload: input,
        operation: () => saveReview(input),
      });
      return latestSaveResult;
    }],
  ]);
  for (const channel of channels) {
    ipcMain.handle(channel, handlers.get(channel) ?? (() => ({ ok: true })));
  }
}

async function waitFor(window, expression, description, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await window.webContents.executeJavaScript(expression, true)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function waitForValue(read, description, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function selectScript(label, value) {
  return `(() => {
    const label = [...document.querySelectorAll("label")].find((item) => item.textContent.includes(${JSON.stringify(label)}));
    const control = label?.querySelector("select") ?? label?.parentElement?.querySelector("select");
    if (!control) return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(control, ${JSON.stringify(value)});
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`;
}

function fillReviewScript() {
  return `(() => {
    const values = ${JSON.stringify({
      "Work Card Compliance": "The exact routed Work Card was implemented.",
      "Changed Files Reviewed": "Reviewed the canonical routed-screen cutover.",
      "Acceptance Criteria Assessment": "The mounted production path meets the criteria.",
      "Validation Claims Assessment": "Canonical pair and workflow evidence were verified.",
      "Skipped Checks Assessment": "Operator acceptance remains intentionally pending.",
      "Observation Register Impact": "No observation status changed.",
      "Operator Validation Steps": "Confirm the saved review and routed Operator screen.",
      "Required Repair, if any": "None identified.",
    })};
    for (const [text, value] of Object.entries(values)) {
      const label = [...document.querySelectorAll("label")].find((item) => item.textContent.includes(text));
      const control = label?.querySelector("textarea") ?? label?.parentElement?.querySelector("textarea");
      if (!control) return false;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(control, value);
      control.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  })()`;
}

function createWindow() {
  return new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "dist", "preload", "index.js"),
    },
  });
}

async function run() {
  await seedCanonicalRepository();
  registerIpcHandlers();
  const window = createWindow();
  await window.loadFile(path.join(__dirname, "..", "dist", "renderer", "index.html"));
  await waitFor(
    window,
    `document.body.innerText.includes(${JSON.stringify(targetTitle)}) && document.body.innerText.includes(${JSON.stringify(reportFileName)}) && document.body.innerText.includes(${JSON.stringify(outputFileName)})`,
    "exact canonical WC09-REPAIR02 binding",
  );
  assert.equal(await window.webContents.executeJavaScript(selectScript("Reference card", referenceFileName), true), true);
  await waitFor(window, `document.body.innerText.includes(${JSON.stringify(targetTitle)})`, "stable target after reference navigation");
  assert.equal(await window.webContents.executeJavaScript(selectScript("Decision", "Ready for Operator validation"), true), true);
  assert.equal(await window.webContents.executeJavaScript(fillReviewScript(), true), true);
  await waitFor(
    window,
    `[...document.querySelectorAll("button")].some((button) => button.textContent.trim() === "Save Architect Review" && !button.disabled)`,
    "valid Architect Review preview",
  );
  assert.equal(
    await window.webContents.executeJavaScript(`(() => {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent.trim() === "Save Architect Review" && !item.disabled);
      button?.click();
      return Boolean(button);
    })()`, true),
    true,
  );
  await waitForValue(() => latestSaveResult, "save IPC result");
  assert.equal(latestSaveResult.ok, true, latestSaveResult.errorMessages?.join(" "));
  await waitFor(
    window,
    `document.body.innerText.includes("Record what the Operator tested")`,
    "mounted Operator Validation screen",
  );
  assert.equal(latestPreviewPayload.workCardFileName, targetWorkCardFileName);
  assert.equal(latestPreviewPayload.implementerReportFileName, reportFileName);
  assert.equal(latestSavePayload.routedReviewBinding.expectedOutputPath, outputPath);

  const registry = await authority.artifactPairs.loadRegistry();
  assert.equal(registry.entries.filter((entry) => entry.artifactId === outputArtifactId).length, 1);
  const snapshot = await authority.routedActions.getAuthoritySnapshot();
  assert.equal(snapshot.state.currentActionId, "operator_validation_required");
  assert.equal(snapshot.state.currentAction.sourceArtifactIds[0], outputArtifactId);

  const reloaded = createWindow();
  await reloaded.loadFile(path.join(__dirname, "..", "dist", "renderer", "index.html"));
  await waitFor(
    reloaded,
    `document.body.innerText.includes("Record what the Operator tested")`,
    "reloaded Operator Validation route",
  );
  reloaded.destroy();
  window.destroy();
  await rm(projectRoot, { recursive: true, force: true });
  console.log("WC01 mounted canonical path passed: WC09-REPAIR02 opened from verified authority, ignored reference navigation, previewed, saved a synchronized Architect Review pair, advanced, and reloaded on Operator Validation.");
}

app.whenReady().then(run).then(
  () => app.exit(0),
  (error) => {
    console.error(error);
    app.exit(1);
  },
);
