const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  getCurrentCloseProjection,
  getCurrentWorkspaceModel,
  getCurrentWorkspaceModelFromContext,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  getPhaseCloseProjection,
} = require("../../dist/main/phaseClose/phaseCloseService.js");
const {
  getProjectCloseProjection,
} = require("../../dist/main/projectClose/projectCloseService.js");
const {
  getWorkCardCloseProjection,
} = require("../../dist/main/workCardValidation/workCardValidationService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  __setPlanningDocumentServiceTestHooks,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  __setPlanningProjectionContextTestHooks,
  createPlanningProjectionContext,
} = require("../../dist/main/documents/planningProjectionContext.js");
const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  listPlanningDocuments,
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test.afterEach(() => {
  __setPlanningDocumentServiceTestHooks();
  __setPlanningProjectionContextTestHooks();
});

test("Current Close reuses one planning acquisition for Work Card, Phase, and Project routes", () => {
  const cases = [
    {
      label: "Work Card Close",
      seed: seedCurrentWorkCardClose,
      action: "currentWorkflow:getWorkCardCloseProjection",
      assertPayload(payload) {
        assert.equal(payload.closed, true);
        assert.equal(payload.returnTarget, "phase-work-card-selection");
      },
    },
    {
      label: "Phase Close",
      seed: seedCurrentPhaseClose,
      action: "currentWorkflow:getPhaseCloseProjection",
      assertPayload(payload) {
        assert.equal(payload.complete, false);
        assert.equal(payload.workspaceId, "phase-validation");
      },
    },
    {
      label: "Project Close",
      seed: seedCurrentProjectClose,
      action: "currentWorkflow:getProjectCloseProjection",
      assertPayload(payload) {
        assert.equal(payload.complete, false);
        assert.equal(payload.workspaceId, "project-validation");
      },
    },
  ];

  for (const entry of cases) {
    const root = tempWorkspace(`champcity-current-${entry.label.toLowerCase().replaceAll(" ", "-")}-`);
    entry.seed(root);
    let acquisitions = 0;
    let inventoryScans = 0;
    __setPlanningDocumentServiceTestHooks({
      onSnapshotAcquisition: () => { acquisitions += 1; },
      onInventoryScan: () => { inventoryScans += 1; },
    });

    const result = getCurrentCloseProjection(root);

    assert.equal(result.action, entry.action, entry.label);
    entry.assertPayload(result.payload);
    assert.equal(acquisitions, 1, `${entry.label} snapshot acquisitions`);
    assert.equal(inventoryScans, 1, `${entry.label} inventory scans`);
    __setPlanningDocumentServiceTestHooks();
  }
});

test("standalone close projections acquire once and caller-owned projections acquire zero additional snapshots", () => {
  const workCardRoot = tempWorkspace("champcity-standalone-work-card-close-context-");
  seedCurrentWorkCardClose(workCardRoot);
  assertStandaloneAndContextOwnedEquivalent(
    workCardRoot,
    (root, context) => getWorkCardCloseProjection(root, "phase-01", "WC01", context),
  );

  const phaseRoot = tempWorkspace("champcity-standalone-phase-close-context-");
  seedCurrentPhaseClose(phaseRoot);
  assertStandaloneAndContextOwnedEquivalent(
    phaseRoot,
    (root, context) => getPhaseCloseProjection(root, "phase-01", context),
  );

  const projectRoot = tempWorkspace("champcity-standalone-project-close-context-");
  seedCurrentProjectClose(projectRoot);
  assertStandaloneAndContextOwnedEquivalent(
    projectRoot,
    (root, context) => getProjectCloseProjection(root, context),
  );
});

test("Current Close stays on its captured generation and the next call observes an external closeout edit", () => {
  const root = tempWorkspace("champcity-current-close-generation-");
  const closeoutPath = seedCurrentProjectClose(root);
  let acquisitions = 0;
  let inventoryScans = 0;
  let injected = false;
  __setPlanningDocumentServiceTestHooks({
    onSnapshotAcquisition: () => { acquisitions += 1; },
    onInventoryScan: () => { inventoryScans += 1; },
  });
  __setPlanningProjectionContextTestHooks({
    onContextCreated: () => {
      if (injected) return;
      injected = true;
      replaceDispositionExternally(root, closeoutPath, "Approved");
    },
  });

  const capturedGeneration = getCurrentCloseProjection(root);
  assert.equal(capturedGeneration.action, "currentWorkflow:getProjectCloseProjection");
  assert.equal(capturedGeneration.payload.complete, false);
  assert.equal(capturedGeneration.payload.workspaceId, "project-validation");
  assert.equal(acquisitions, 1);
  assert.equal(inventoryScans, 1);

  __setPlanningProjectionContextTestHooks();
  acquisitions = 0;
  inventoryScans = 0;
  const nextGeneration = getCurrentCloseProjection(root);
  assert.equal(nextGeneration.action, "currentWorkflow:getProjectCloseProjection");
  assert.equal(nextGeneration.payload.complete, true);
  assert.equal(nextGeneration.payload.workspaceId, "project-close");
  assert.equal(acquisitions, 1);
  assert.equal(inventoryScans, 1);
});

test("close projections reject a Planning Projection Context from another workspace", () => {
  const firstRoot = tempWorkspace("champcity-close-context-first-");
  const secondRoot = tempWorkspace("champcity-close-context-second-");
  const context = createPlanningProjectionContext(firstRoot);

  assert.throws(
    () => getCurrentWorkspaceModelFromContext(secondRoot, context),
    /different workspace root/,
  );
  assert.throws(
    () => getPhaseCloseProjection(secondRoot, "phase-01", context),
    /different workspace root/,
  );
  assert.throws(
    () => getProjectCloseProjection(secondRoot, context),
    /different workspace root/,
  );
});

test("Phase Close freshness still blocks a stale Approved Closeout", () => {
  const root = tempWorkspace("champcity-phase-close-stale-");
  const sourcePath = writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_demo.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md", "phase-closeout", "Approved", {
    identity: { phaseId: "phase-01", closureDecision: "Close" },
    sourceRevisions: [{ path: sourcePath, revision: 1 }],
    workflowData: { phaseId: "phase-01", closureDecision: "Close" },
  });
  assert.equal(getPhaseCloseProjection(root, "phase-01").complete, true);

  writeDoc(root, sourcePath, "formal-work-card", "Approved", {
    artifactRevision: 2,
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  const stale = getPhaseCloseProjection(root, "phase-01");
  assert.equal(stale.complete, false);
  assert.equal(stale.workspaceId, "phase-validation");
});

test("Project Close preserves Profile, Roadmap, Phase Map, and Closeout freshness blockers", async (t) => {
  for (const staleTarget of ["profile", "roadmap", "phase-map", "closeout"]) {
    await t.test(staleTarget, () => {
      const root = tempWorkspace(`champcity-project-close-stale-${staleTarget}-`);
      const fixture = seedFreshProjectClose(root);
      assert.equal(getProjectCloseProjection(root).complete, true);

      if (staleTarget === "closeout") {
        writeDoc(root, fixture.profilePath, "project-profile", "Approved", {
          artifactRevision: 2,
          sourceRevisions: [{ path: fixture.profileSourcePath, revision: 1 }],
        });
      } else {
        const sourcePath = fixture[`${staleTarget.replace("-", "")}SourcePath`];
        writeDoc(root, sourcePath, "context-record", "Approved", {
          artifactRevision: 2,
          participationRole: "contextOnly",
        });
      }

      const stale = getProjectCloseProjection(root);
      assert.equal(stale.complete, false);
      assert.equal(stale.workspaceId, "project-validation");
      if (staleTarget !== "closeout") {
        assert.equal(stale.blockers.some((blocker) => blocker.startsWith("Stale ")), true);
      }
    });
  }
});

function assertStandaloneAndContextOwnedEquivalent(root, project) {
  let acquisitions = 0;
  let inventoryScans = 0;
  __setPlanningDocumentServiceTestHooks({
    onSnapshotAcquisition: () => { acquisitions += 1; },
    onInventoryScan: () => { inventoryScans += 1; },
  });
  const standalone = project(root);
  assert.equal(acquisitions, 1);
  assert.equal(inventoryScans, 1);

  acquisitions = 0;
  inventoryScans = 0;
  const context = createPlanningProjectionContext(root);
  assert.equal(acquisitions, 1);
  assert.equal(inventoryScans, 1);
  acquisitions = 0;
  inventoryScans = 0;
  const contextOwned = project(root, context);
  assert.equal(acquisitions, 0);
  assert.equal(inventoryScans, 0);
  assert.deepEqual(contextOwned, standalone);
  __setPlanningDocumentServiceTestHooks();
}

function seedCurrentProjectThroughPhaseMap(root) {
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  seedApprovedProjectPlanning(root, "demo");
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Approved", {
    workflowData: {
      phases: [{
        phaseId: "phase-01",
        title: "Foundation",
        order: 1,
        purpose: "Create the first usable workflow.",
        dependsOn: [],
        sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
      }],
    },
  });
}

function seedCurrentWorkCardClose(root) {
  seedCurrentProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  const handoff = generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  const formalPath = handoff.formalWorkCardMarkdownPath;
  writeDoc(root, formalPath, "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    sourceRevisions: [{ path: handoff.handoffMarkdownPath, revision: 1 }],
  });
  const reportPath = "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md";
  writeDoc(root, reportPath, "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    sourceRevisions: [{ path: formalPath, revision: 1 }],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/currentWorkflow/currentWorkflowService.ts"],
      implementationSummary: "Implemented the current Work Card.",
      validationResults: ["focused validation passed"],
      acceptanceEvidence: ["current close evidence"],
    },
    bodyMarkdown: [
      "# Implementer Report - WC01",
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented the current Work Card.",
      "## Validation Performed",
      "focused validation passed",
      "",
    ].join("\n"),
  });
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01", attemptNumber: 1 },
    sourceRevisions: [{ path: reportPath, revision: 1 }],
    workflowData: { decision: "ValidatePassed", validationStatus: "Approved" },
  });
  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "work-card-close");
}

function seedCurrentPhaseClose(root) {
  seedCurrentProjectThroughPhaseMap(root);
  const closeoutPath = "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md";
  writeDoc(root, closeoutPath, "phase-closeout", "Pending", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: "phase-01", closureDecision: "Close" },
    workflowData: { phaseId: "phase-01", closureDecision: "Close" },
  });
  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "phase-validation");
  return closeoutPath;
}

function seedCurrentProjectClose(root) {
  seedCurrentProjectThroughPhaseMap(root);
  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md", "phase-closeout", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: "phase-01", closureDecision: "Close" },
    workflowData: { phaseId: "phase-01", closureDecision: "Close" },
  });
  const closeoutPath = "planning/project/Project_Closeouts/PROJECT_CLOSEOUT_demo.md";
  const documents = listPlanningDocuments(root);
  writeDoc(root, closeoutPath, "project-closeout", "Pending", {
    participationRole: "compoundGatingReview",
    identity: { closureDecision: "Close" },
    sourceRevisions: documents
      .filter((document) => !document.markdownPath.includes("/Project_Closeouts/"))
      .map((document) => ({ path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 })),
    workflowData: { closureDecision: "Close" },
  });
  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "project-close");
  return closeoutPath;
}

function seedFreshProjectClose(root) {
  const profileSourcePath = writeDoc(root, "planning/project/context/profile-source.md", "context-record", "Approved", {
    participationRole: "contextOnly",
  });
  const roadmapSourcePath = writeDoc(root, "planning/project/context/roadmap-source.md", "context-record", "Approved", {
    participationRole: "contextOnly",
  });
  const phasemapSourcePath = writeDoc(root, "planning/project/context/phase-map-source.md", "context-record", "Approved", {
    participationRole: "contextOnly",
  });
  const profilePath = writeDoc(root, "planning/project/PROJECT_PROFILE.md", "project-profile", "Approved", {
    sourceRevisions: [{ path: profileSourcePath, revision: 1 }],
  });
  const roadmapPath = writeDoc(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", "project-roadmap", "Approved", {
    sourceRevisions: [{ path: roadmapSourcePath, revision: 1 }],
  });
  const phaseMapPath = writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Approved", {
    sourceRevisions: [{ path: phasemapSourcePath, revision: 1 }],
    workflowData: {
      phases: [{
        phaseId: "phase-01",
        title: "Foundation",
        order: 1,
        purpose: "Complete the project.",
        dependsOn: [],
        sourceReferences: [profilePath, roadmapPath],
      }],
    },
  });
  const phaseCloseoutPath = writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md", "phase-closeout", "Approved", {
    identity: { phaseId: "phase-01", closureDecision: "Close" },
    workflowData: { phaseId: "phase-01", closureDecision: "Close" },
  });
  writeDoc(root, "planning/project/Project_Closeouts/PROJECT_CLOSEOUT_demo.md", "project-closeout", "Approved", {
    identity: { closureDecision: "Close" },
    sourceRevisions: [profilePath, roadmapPath, phaseMapPath, phaseCloseoutPath]
      .map((relativePath) => ({ path: relativePath, revision: 1 })),
    workflowData: { closureDecision: "Close" },
  });
  return {
    profilePath,
    profileSourcePath,
    roadmapSourcePath,
    phasemapSourcePath,
  };
}

function replaceDispositionExternally(root, relativePath, status) {
  const absolutePath = path.join(root, relativePath);
  const current = parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
  fs.writeFileSync(
    absolutePath,
    serializeCanonicalMarkdownDocument({
      ...current.metadata,
      artifactRevision: current.metadata.artifactRevision + 1,
      documentDisposition: {
        ...current.metadata.documentDisposition,
        status,
      },
    }, current.bodyMarkdown),
    "utf8",
  );
}
