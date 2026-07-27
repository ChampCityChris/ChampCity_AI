const assert = require("node:assert/strict");
const test = require("node:test");

const {
  generatePhaseInterviewHandoff,
} = require("../../dist/main/phaseInterview/phaseInterviewService.js");
const {
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("phase interview service generates Markdown-only handoff and target path", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");

  const result = generatePhaseInterviewHandoff(root);
  assert.equal(result.phaseId, "phase-01");
  assert.equal(result.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_phase-01.md");
  assert.equal(result.interviewMarkdownPath, "planning/phases/phase-01/Phase_Interview.md");
  assert.equal(["interview", "Json", "Path"].join("") in result, false);
});
