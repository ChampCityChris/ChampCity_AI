const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  generatePhaseInterviewHandoff,
  getPhaseInterviewWorkspaceModel,
  preparePhaseInterviewHandoff,
  reviewPhaseInterview,
} = require("../../dist/main/phaseInterview/phaseInterviewService.js");
const {
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");

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

test("phase interview handoff uses one generic temporary draft invocation", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");

  const model = preparePhaseInterviewHandoff(root);
  assert.equal(model.phase.phaseId, "phase-01");
  assert.match(model.handoffInstruction, /"action": "create_markdown_artifact"/);
  assert.match(model.handoffInstruction, /"workspaceId": "alpha"/);
  assert.match(model.handoffInstruction, /Bound workspaceId: alpha/);
  assert.doesNotMatch(model.handoffInstruction, /<resolved workspace ID>/);
  assert.match(model.handoffInstruction, /"params": \{/);
  assert.match(model.handoffInstruction, /"overwrite": false/);
  assert.match(model.handoffInstruction, /Phase Understanding/);
  assert.match(model.handoffInstruction, /Inputs Required for Phase Planning/);
  assert.doesNotMatch(model.handoffInstruction, /savePhaseInterviewOutput|phaseInterview:saveOutput/i);
});

test("phase interview valid temporary draft promotes automatically to Pending canonical output", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  const prepared = preparePhaseInterviewHandoff(root);
  const draftPath = extractDraftPath(prepared.handoffInstruction);

  writeRaw(root, draftPath, completePhaseInterviewBody("Initial"));
  const promoted = getPhaseInterviewWorkspaceModel(root);

  assert.equal(promoted.draftSubmissionState, "promoted");
  assert.equal(promoted.interviewDocument.markdownPath, "planning/phases/phase-01/Phase_Interview.md");
  assert.equal(promoted.interviewDocument.disposition, "Pending");
  const parsed = readCanonical(root, promoted.interviewDocument.markdownPath);
  assert.equal(parsed.metadata.artifactType, "phase-interview");
  assert.equal(parsed.metadata.artifactRevision, 1);
  assert.deepEqual(parsed.metadata.identity, { phaseId: "phase-01" });
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.equal(fs.existsSync(path.join(root, draftPath)), false);
});

test("phase interview malformed draft fails promotion and preserves the temporary draft", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  const prepared = preparePhaseInterviewHandoff(root);
  const draftPath = extractDraftPath(prepared.handoffInstruction);

  writeRaw(root, draftPath, "# Phase Interview\n\nMissing required sections.\n");
  const failed = getPhaseInterviewWorkspaceModel(root);

  assert.equal(failed.draftSubmissionState, "promotion-failed");
  assert.match(failed.draftPromotionError, /Phase Understanding/);
  assert.equal(fs.existsSync(path.join(root, "planning/phases/phase-01/Phase_Interview.md")), false);
  assert.equal(fs.existsSync(path.join(root, draftPath)), true);
});

test("phase interview RevisionRequested output revises once and resets to Pending", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  generatePhaseInterviewHandoff(root);
  writeDoc(root, "planning/phases/phase-01/Phase_Interview.md", "phase-interview", "Pending", {
    identity: { phaseId: "phase-01" },
    bodyMarkdown: completePhaseInterviewBody("Original"),
  });
  reviewPhaseInterview(root, "RevisionRequested", "Tighten the risks.");
  const prepared = preparePhaseInterviewHandoff(root);
  const draftPath = extractDraftPath(prepared.handoffInstruction);

  writeRaw(root, draftPath, completePhaseInterviewBody("Revised"));
  const promoted = getPhaseInterviewWorkspaceModel(root);
  const parsed = readCanonical(root, promoted.interviewDocument.markdownPath);

  assert.equal(parsed.metadata.artifactRevision, 2);
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.equal(parsed.metadata.documentDisposition.notes, "");
  assert.equal(parsed.metadata.documentDisposition.reviewedAt, null);
  assert.match(parsed.bodyMarkdown, /Revised/);
});

test("phase interview ineligible existing target remains byte-identical and draft is retained", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  const prepared = preparePhaseInterviewHandoff(root);
  const draftPath = extractDraftPath(prepared.handoffInstruction);
  writeRaw(root, draftPath, completePhaseInterviewBody("Blocked"));
  const finalPath = "planning/phases/phase-01/Phase_Interview.md";
  writeDoc(root, finalPath, "wrong-artifact", "Pending", {
    identity: { phaseId: "phase-01" },
    bodyMarkdown: "# Wrong\n",
  });
  const before = fs.readFileSync(path.join(root, finalPath), "utf8");

  const failed = getPhaseInterviewWorkspaceModel(root);
  const after = fs.readFileSync(path.join(root, finalPath), "utf8");

  assert.equal(failed.draftSubmissionState, "promotion-failed");
  assert.match(failed.draftPromotionError, /wrong artifact type/);
  assert.equal(after, before);
  assert.equal(fs.existsSync(path.join(root, draftPath)), true);
});

function extractDraftPath(instruction) {
  const match = instruction.match(/"relativePath": "([^"]+Phase[^"]*phase-interview\.md)"/i) ??
    instruction.match(/"relativePath": "([^"]+phase-interview\.md)"/i);
  assert.ok(match, "expected temporary Phase Interview draft path");
  return match[1];
}

function completePhaseInterviewBody(marker) {
  return [
    "# Phase Interview",
    "",
    `## Phase Understanding\n${marker} understanding.`,
    "## Phase Objective\nDeliver the selected phase.",
    "## Scope\nIncluded scope.",
    "## Non-Scope\nExcluded scope.",
    "## Inherited Constraints\nInherited constraints.",
    "## Dependencies and Prior-Phase Evidence\nDependency evidence.",
    "## Material Decisions\nMaterial decisions.",
    "## Architect Recommendations\nRecommended approach.",
    "## Risks and Unknowns\nRisks and unknowns.",
    "## Assumptions\nAssumptions.",
    "## Acceptance Direction\nAcceptance direction.",
    "## Inputs Required for Phase Planning\nPlanning inputs.",
    "## Deferred Items\nDeferred items.",
    "## Unresolved Questions\nUnresolved questions.",
    "",
  ].join("\n");
}

function writeRaw(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}
