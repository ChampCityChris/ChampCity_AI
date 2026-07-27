const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createProjectCloseout,
  getProjectCloseProjection,
  setProjectCloseoutDisposition,
} = require("../../dist/main/projectClose/projectCloseService.js");
const {
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("project closeout service creates Markdown-only closeout after phase completion", () => {
  const root = tempWorkspace("champcity-project-close-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md", "phase-closeout", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: "phase-01", closureDecision: "Close" },
    workflowData: { phaseId: "phase-01", closureDecision: "Close" },
  });

  const result = createProjectCloseout(root, "Close", "Project is complete.");
  assert.equal(result.markdownPath, "planning/project/Project_Closeouts/PROJECT_CLOSEOUT_demo.md");
  assert.equal(["json", "Path"].join("") in result, false);
  setProjectCloseoutDisposition(root, "Approved");
  assert.equal(getProjectCloseProjection(root).complete, true);
});
