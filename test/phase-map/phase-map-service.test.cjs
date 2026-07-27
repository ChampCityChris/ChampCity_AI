const assert = require("node:assert/strict");
const test = require("node:test");

const {
  generatePhaseMapHandoff,
  getPhaseMapProjection,
  setPhaseMapDisposition,
} = require("../../dist/main/phaseMap/phaseMapService.js");
const {
  seedApprovedProjectPlanning,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("phase map service generates Markdown-only handoff and derives completion from closeouts", () => {
  const root = tempWorkspace("champcity-phase-map-");
  seedApprovedProjectPlanning(root);

  const result = generatePhaseMapHandoff(root);
  assert.equal(["phaseMap", "Json", "Path"].join("") in result, false);
  writeDoc(root, result.phaseMapMarkdownPath, "phase-map", "Pending", {
    workflowData: {
      phases: [{
        phaseId: "phase-01",
        title: "Phase 01",
        order: 1,
        purpose: "Build.",
        dependsOn: [],
        sourceReferences: [],
      }],
    },
  });
  setPhaseMapDisposition(root, "Approved");
  assert.equal(getPhaseMapProjection(root).state, "first-incomplete");
});
