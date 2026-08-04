const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");
const componentSourcePath = path.join(repoRoot, "src", "renderer", "app", "WorkCardCloseWorkspace.tsx");
const appSourcePath = path.join(repoRoot, "src", "renderer", "app", "App.tsx");
const preloadSourcePath = path.join(repoRoot, "src", "preload", "index.ts");
const workspaceSourcePath = path.join(repoRoot, "src", "shared", "workspaceContracts.ts");
const {
  WorkCardCloseWorkspace,
  workCardCloseProjectionFromResult,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/WorkCardCloseWorkspace.tsx");

function closeModel() {
  return {
    activeWorkspaceId: "work-card-close",
    currentPhaseId: "phase-08",
    currentWorkCardId: "WC44-REPAIR05",
    currentTarget: "Close / Next Work Card",
    sourceEvidence: [
      "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      "planning/phases/phase-08/Validation_Records/VALIDATION_RECORD_WC44-REPAIR05_ATTEMPT01.md",
    ],
    executionContext: {
      workCard: {
        title: "Work Card Close / Next Workspace Completion",
      },
    },
  };
}

function closeDocuments() {
  return [
    {
      logicalDocumentId: "report-doc",
      markdownPath: "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      displayFilename: "IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion.md",
      documentReadState: "readable",
      effectiveDisposition: "Pending",
      metadata: { artifactType: "implementer-report", participationRole: "gatingReview" },
    },
    {
      logicalDocumentId: "validation-doc",
      markdownPath: "planning/phases/phase-08/Validation_Records/VALIDATION_RECORD_WC44-REPAIR05_ATTEMPT01.md",
      displayFilename: "VALIDATION_RECORD_WC44-REPAIR05_ATTEMPT01.md",
      documentReadState: "readable",
      effectiveDisposition: "Approved",
      metadata: { artifactType: "validation-record", participationRole: "gatingReview" },
    },
  ];
}

function renderWorkspace(overrides = {}) {
  return renderToStaticMarkup(
    React.createElement(WorkCardCloseWorkspace, {
      actionError: "",
      actionFeedback: "",
      documents: closeDocuments(),
      isReturning: false,
      model: closeModel(),
      onReturnToSelection: () => undefined,
      projectionResult: {
        ok: true,
        action: "currentWorkflow:getWorkCardCloseProjection",
        message: "Work Card close projection loaded.",
        payload: {
          closed: true,
          returnTarget: "phase-work-card-selection",
          reason: "Current Approved Validation Record closes the Work Card.",
        },
      },
      ...overrides,
    }),
  );
}

test("Work Card Close workspace renders projection, evidence names, and return action", () => {
  const markup = renderWorkspace();

  assert.match(markup, /Work Card Close workspace/);
  assert.match(markup, /WC44-REPAIR05 - Work Card Close \/ Next Workspace Completion/);
  assert.match(markup, /phase-08 \/ WC44-REPAIR05/);
  assert.match(markup, /Closed/);
  assert.match(markup, /phase-work-card-selection/);
  assert.match(markup, /Current Approved Validation Record closes the Work Card\./);
  assert.match(markup, /IMPLEMENTER_REPORT_WC44-REPAIR05_work_card_close_next_workspace_completion\.md/);
  assert.match(markup, /VALIDATION_RECORD_WC44-REPAIR05_ATTEMPT01\.md/);
  assert.match(markup, /Pending \/ readable/);
  assert.match(markup, /Approved \/ readable/);
  assert.match(markup, /Return to Phase Building \/ Next Work Card/);
  assert.doesNotMatch(markup, /Run Current Handoff Action/);
});

test("Work Card Close workspace blocks return when projection is not closed", () => {
  const markup = renderWorkspace({
    projectionResult: {
      ok: true,
      action: "currentWorkflow:getWorkCardCloseProjection",
      message: "Work Card close projection loaded.",
      payload: {
        closed: false,
        returnTarget: "work-card-validation",
        reason: "Work Card close requires a current, readable, Approved Validation Record.",
      },
    },
  });

  assert.match(markup, /Not Closed/);
  assert.match(markup, /Work Card close requires a current, readable, Approved Validation Record\./);
  assert.match(markup, /<button[^>]*disabled=""/);
});

test("Work Card Close parser rejects malformed close projection payloads", () => {
  assert.deepEqual(workCardCloseProjectionFromResult(null), null);
  assert.deepEqual(workCardCloseProjectionFromResult({
    ok: true,
    action: "currentWorkflow:getWorkCardCloseProjection",
    message: "loaded",
    payload: { closed: true, reason: "missing return target" },
  }), null);
  assert.deepEqual(workCardCloseProjectionFromResult({
    ok: true,
    action: "currentWorkflow:getWorkCardCloseProjection",
    message: "loaded",
    payload: {
      closed: true,
      returnTarget: "phase-work-card-selection",
      reason: "closed",
    },
  }), {
    closed: true,
    returnTarget: "phase-work-card-selection",
    reason: "closed",
  });
});

test("App routes work-card-close through close projection instead of generic handoff", () => {
  const componentSource = fs.readFileSync(componentSourcePath, "utf8");
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const preloadSource = fs.readFileSync(preloadSourcePath, "utf8");
  const workspaceSource = fs.readFileSync(workspaceSourcePath, "utf8");
  const closeReturnSource = appSource.slice(
    appSource.indexOf("async function returnFromWorkCardCloseToSelection"),
    appSource.indexOf("async function createImplementerReportFromBuildReview"),
  );

  assert.match(workspaceSource, /getCurrentCloseProjection: \(\) => Promise<RuntimeActionResult>/);
  assert.match(workspaceSource, /getCloseReturnSelectionProjection: \(\) => Promise<RuntimeActionResult>/);
  assert.match(workspaceSource, /generateCloseReturnNextIntakeHandoff: \(\) => Promise<RuntimeActionResult>/);
  assert.match(preloadSource, /getCurrentCloseProjection:[\s\S]*currentWorkflow:getCloseProjection/);
  assert.match(preloadSource, /getCloseReturnSelectionProjection:[\s\S]*currentWorkflow:getCloseReturnSelectionProjection/);
  assert.match(preloadSource, /generateCloseReturnNextIntakeHandoff:[\s\S]*currentWorkflow:generateCloseReturnNextIntakeHandoff/);
  assert.match(appSource, /<WorkCardCloseWorkspace/);
  assert.match(appSource, /activeWorkspaceId === "work-card-close"/);
  assert.match(appSource, /!isVisibleArchitectOutputWorkspace &&\s*!isWorkCardClose/);
  assert.match(closeReturnSource, /window\.champcity\.getCloseReturnSelectionProjection\(\)/);
  assert.match(closeReturnSource, /closeReturnSelectionProjectionFromResult\(selectionResult\)/);
  assert.match(closeReturnSource, /window\.champcity\.listDocuments\(\)/);
  assert.match(closeReturnSource, /refreshCurrentModel\(\)/);
  assert.match(closeReturnSource, /window\.champcity\.resolveCurrentDocument\(\)/);
  assert.match(closeReturnSource, /transitionToWorkflowStep\("phase-work-card-selection"/);
  assert.doesNotMatch(closeReturnSource, /generateCurrentHandoff/);
  assert.doesNotMatch(componentSource, /generateCurrentHandoff/);
  assert.match(appSource, /window\.champcity\.generateCloseReturnNextIntakeHandoff\(\)/);
  assert.match(appSource, /<WorkCardSelectionWorkspace/);
  assert.match(appSource, /!isWorkCardClose &&\s*!isWorkCardSelection/);
});
