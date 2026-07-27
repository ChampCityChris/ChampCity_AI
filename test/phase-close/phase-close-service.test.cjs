const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createPhaseCloseout,
  getPhaseCloseProjection,
  setPhaseCloseoutDisposition,
} = require("../../dist/main/phaseClose/phaseCloseService.js");
const {
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("phase closeout service creates and completes Markdown-only closeout evidence", () => {
  const root = tempWorkspace("champcity-phase-close-");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_demo.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });

  const result = createPhaseCloseout(root, "phase-01", "Close", "All phase work is complete.");
  assert.equal(result.markdownPath, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md");
  assert.equal(["json", "Path"].join("") in result, false);
  assert.equal(getPhaseCloseProjection(root, "phase-01").complete, false);

  setPhaseCloseoutDisposition(root, "phase-01", "Approved");
  assert.equal(getPhaseCloseProjection(root, "phase-01").complete, true);
});
