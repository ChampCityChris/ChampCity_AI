const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  __setPlanningDocumentServiceTestHooks,
  listPlanningDocuments,
  setGenericDocumentDispositionWithPlanningContext,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  __setPlanningProjectionContextTestHooks,
} = require("../../dist/main/documents/planningProjectionContext.js");
const {
  __setDevelopmentPostMutationStabilizationTestHooks,
  buildDevelopmentPostMutationProjection,
  buildStableDevelopmentPostMutationResult,
  createFinalDevelopmentPlanningContext,
} = require("../../dist/main/documents/developmentPostMutationProjection.js");
const {
  __advanceArchitectOutputRuntimePromotionEpochForTest,
  getArchitectOutputRuntimePromotionEpoch,
} = require("../../dist/main/architectOutputs/architectOutputRuntimeService.js");
const {
  getCurrentWorkspaceModelFromContext,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  getArchitectOutputWorkspaceModel,
  mutateArchitectOutputReviewWithPlanningContext,
  prepareArchitectOutputHandoff,
  reviewArchitectOutputWithPlanningContext,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const {
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

const repoRoot = path.join(__dirname, "..", "..");

test("Development disposition meets the controlled 200-document latency gate", (context) => {
  const fixtureCount = 11;
  const roots = [];
  const samples = [];
  const structural = {
    preAcquisitions: 0,
    preInventoryScans: 0,
    postAcquisitions: 0,
    postInventoryScans: 0,
    finalContexts: 0,
  };

  try {
    for (let fixtureIndex = 0; fixtureIndex < fixtureCount; fixtureIndex += 1) {
      const root = tempWorkspace(`champcity-disposition-performance-${fixtureIndex}-`);
      roots.push(root);
      writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_performance.md", "project-intake", "Pending", {
        identity: { "Project.ArtifactKey": `performance-${fixtureIndex}` },
      });
      for (let documentIndex = 0; documentIndex < 200; documentIndex += 1) {
        writeDoc(
          root,
          `planning/performance/context-${String(documentIndex).padStart(3, "0")}.md`,
          "performance-context",
          "Approved",
          {
            participationRole: "contextOnly",
            identity: { fixtureIndex, documentIndex },
          },
        );
      }
    }

    for (let fixtureIndex = 0; fixtureIndex < roots.length; fixtureIndex += 1) {
      const root = roots[fixtureIndex];
      const documents = listPlanningDocuments(root);
      assert.equal(documents.length, 201);
      const target = documents.find((entry) => entry.metadata.artifactType === "project-intake");
      assert.ok(target);
      let phase = "pre";
      __setPlanningDocumentServiceTestHooks({
        onSnapshotAcquisition: () => { structural[`${phase}Acquisitions`] += 1; },
        onInventoryScan: () => { structural[`${phase}InventoryScans`] += 1; },
      });
      __setPlanningProjectionContextTestHooks({
        onContextCreated: () => { structural.finalContexts += 1; },
      });

      const startedAt = process.hrtime.bigint();
      const mutation = setGenericDocumentDispositionWithPlanningContext(
        root,
        target.logicalDocumentId,
        "Approved",
        {},
        () => {
          phase = "post";
          return createFinalDevelopmentPlanningContext(root);
        },
      );
      const transaction = buildStableDevelopmentPostMutationResult(
        root,
        mutation.planningContext,
        (planningContext) => {
          const currentModel = getCurrentWorkspaceModelFromContext(root, planningContext);
          return buildDevelopmentPostMutationProjection(
            root,
            planningContext,
            currentModel,
            target.logicalDocumentId,
          );
        },
      );
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      assert.equal(transaction.documents.length, 201);
      assert.equal(transaction.planningGeneration, mutation.planningContext.generation);
      if (fixtureIndex > 0) {
        samples.push(durationMs);
      }
      __setPlanningDocumentServiceTestHooks();
      __setPlanningProjectionContextTestHooks();
    }

    const sorted = samples.slice().sort((left, right) => left - right);
    const median = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const maximum = sorted.at(-1);
    assert.equal(samples.length, 10);
    assert.ok(p95 <= 500, `p95 ${p95.toFixed(2)}ms exceeded 500ms`);
    assert.ok(maximum <= 1_000, `maximum ${maximum.toFixed(2)}ms exceeded 1000ms`);
    assert.deepEqual(structural, {
      preAcquisitions: fixtureCount,
      preInventoryScans: fixtureCount,
      postAcquisitions: fixtureCount,
      postInventoryScans: fixtureCount,
      finalContexts: fixtureCount,
    });
    context.diagnostic(
      `Development disposition evidence: 201 canonical planning documents; 1 warm-up + 10 measured iterations; median ${median.toFixed(2)}ms; p95 ${p95.toFixed(2)}ms; max ${maximum.toFixed(2)}ms; one pre-write and one post-write scan per iteration`,
    );
  } finally {
    __setPlanningDocumentServiceTestHooks();
    __setPlanningProjectionContextTestHooks();
    for (const root of roots) {
      fs.rmSync(path.dirname(root), { recursive: true, force: true });
    }
  }
});

function percentile(sorted, percentage) {
  return sorted[Math.max(0, Math.ceil(sorted.length * percentage / 100) - 1)];
}

function validPhaseMapBody() {
  return [
    "# Phase Map",
    "",
    "```champcity-phase-map",
    JSON.stringify({
      phases: [{
        phaseId: "phase-build",
        title: "Build Phase",
        order: 1,
        purpose: "Build from the approved roadmap.",
        dependsOn: [],
        sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
      }],
    }, null, 2),
    "```",
  ].join("\n");
}
