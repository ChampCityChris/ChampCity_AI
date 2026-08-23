const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  generatePhaseInterviewHandoff,
  getPhaseInterviewActiveDraftPath,
  getPhaseInterviewWorkspaceModel,
  getPreparedPhaseInterviewFinalDraftInstruction,
  preparePhaseInterviewHandoff,
  preparePhaseInterviewFinalDraftHandoff,
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
const {
  getActivePhaseInterviewDraftSubmission,
} = require("../../dist/main/phaseInterview/phaseInterviewDraftOutput.js");

test("phase interview service generates Markdown-only handoff and target path", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");

  const result = generatePhaseInterviewHandoff(root);
  assert.equal(result.phaseId, "phase-01");
  assert.equal(result.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_phase-01.md");
  assert.equal(result.interviewMarkdownPath, "planning/phases/phase-01/Phase_Interview.md");
  assert.equal(["interview", "Json", "Path"].join("") in result, false);
  assert.equal(getPhaseInterviewActiveDraftPath(root), undefined);
});

test("phase interview handoff is conversation-only and final draft handoff owns write-back", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");

  const model = preparePhaseInterviewHandoff(root);
  assert.equal(model.phase.phaseId, "phase-01");
  assert.equal(model.state, "waiting-for-output");
  assertPhaseInterviewWaitingForFinalDraftAction(model.requiredAction);
  assert.equal(model.canCopyHandoff, true);
  assert.equal(model.canPrepareFinalDraftHandoff, true);
  assert.equal(model.canCopyFinalDraftHandoff, false);
  assertInitialPhaseInterviewHandoffIsNoWrite(model.handoffInstruction);
  assert.equal(getActivePhaseInterviewDraftSubmission(root), undefined);

  const finalizing = preparePhaseInterviewFinalDraftHandoff(root);
  assert.equal(finalizing.canCopyHandoff, true);
  assert.equal(finalizing.canCopyFinalDraftHandoff, true);
  assertInitialPhaseInterviewHandoffIsNoWrite(finalizing.handoffInstruction);
  assert.match(finalizing.finalDraftHandoffInstruction, /"action": "write_markdown_artifact"/);
  assert.doesNotMatch(finalizing.finalDraftHandoffInstruction, /create_markdown_artifact/);
  assert.match(finalizing.finalDraftHandoffInstruction, /"workspaceId": "alpha"/);
  assert.match(finalizing.finalDraftHandoffInstruction, /Temporary body-only draft path: planning\/Architect_Drafts\//);
  assert.match(finalizing.finalDraftHandoffInstruction, /Clarification Required/);
  assert.match(finalizing.finalDraftHandoffInstruction, /Material Questions and Answers/);
  assert.doesNotMatch(finalizing.finalDraftHandoffInstruction, /diagnostics_toolbox\.list_workspaces/);
  assert.equal(getPreparedPhaseInterviewFinalDraftInstruction(root), finalizing.finalDraftHandoffInstruction);

  const invocation = invocationFrom(finalizing.finalDraftHandoffInstruction);
  assert.deepEqual(invocation, {
    action: "write_markdown_artifact",
    workspaceId: "alpha",
    params: {
      relativePath: getActivePhaseInterviewDraftSubmission(root).submission.expectedDraftSlots[0].draftRelativePath,
      content: "<complete body-only Phase Interview Markdown>",
      overwrite: false,
    },
  });
});

test("phase interview chat handoff uses bound MCP workspace without draft instructions", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");

  const model = preparePhaseInterviewHandoff(root);

  assert.match(model.handoffInstruction, /Bound workspaceId: alpha/);
  assert.doesNotMatch(model.handoffInstruction, /<resolved workspace ID>/);
  assert.match(model.handoffInstruction, /Phase Understanding/);
  assert.match(model.handoffInstruction, /Inputs Required for Phase Planning/);
  assert.doesNotMatch(model.handoffInstruction, /savePhaseInterviewOutput|phaseInterview:saveOutput|phaseInterview:copyFinalDraftHandoff/i);
});

test("phase interview valid temporary draft promotes automatically to Pending canonical output", () => {
  const root = tempWorkspace("champcity-phase-interview-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  preparePhaseInterviewHandoff(root);
  const finalized = preparePhaseInterviewFinalDraftHandoff(root);
  const draftPath = extractDraftPath(finalized.finalDraftHandoffInstruction);

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
  preparePhaseInterviewHandoff(root);
  const finalized = preparePhaseInterviewFinalDraftHandoff(root);
  const draftPath = extractDraftPath(finalized.finalDraftHandoffInstruction);

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
  const revisionRequested = reviewPhaseInterview(root, "RevisionRequested", "Tighten the risks.");
  assert.equal(revisionRequested.state, "revision-requested");
  assertPhaseInterviewRevisionRequiresFinalDraftAction(revisionRequested.requiredAction);
  const prepared = preparePhaseInterviewHandoff(root);
  assert.equal(prepared.state, "revision-requested");
  assertPhaseInterviewRevisionRequiresFinalDraftAction(prepared.requiredAction);
  assertInitialPhaseInterviewHandoffIsNoWrite(prepared.handoffInstruction);
  assert.match(prepared.handoffInstruction, /Current Operator revision instructions:/);
  assert.match(prepared.handoffInstruction, /Tighten the risks/);
  assert.equal(prepared.canCopyFinalDraftHandoff, false);

  const finalized = preparePhaseInterviewFinalDraftHandoff(root);
  assert.match(finalized.finalDraftHandoffInstruction, /Current Operator revision instructions:/);
  assert.match(finalized.finalDraftHandoffInstruction, /Tighten the risks/);
  const draftPath = extractDraftPath(finalized.finalDraftHandoffInstruction);

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
  preparePhaseInterviewHandoff(root);
  const finalized = preparePhaseInterviewFinalDraftHandoff(root);
  const draftPath = extractDraftPath(finalized.finalDraftHandoffInstruction);
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

function invocationFrom(handoffInstruction) {
  const json = handoffInstruction.match(/```json\n([\s\S]*?)\n```/)[1];
  return JSON.parse(json);
}

function assertInitialPhaseInterviewHandoffIsNoWrite(instruction) {
  assert.match(instruction, /Conduct the Phase Interview conversationally/);
  assert.match(instruction, /Use approved evidence before asking questions/);
  assert.match(instruction, /Ask one primary question at a time/);
  assert.match(instruction, /Distinguish Operator-owned decisions from Architect-owned technical decisions/);
  assert.match(instruction, /Make Architect-owned technical recommendations/);
  assert.match(instruction, /ask zero clarification questions/);
  assert.match(instruction, /concise phase-understanding summary/);
  assert.match(instruction, /Stop and wait for Operator confirmation before finalization, draft creation, or write-back/);
  assert.doesNotMatch(instruction, /artifact_toolbox\.write_markdown_artifact/);
  assert.doesNotMatch(instruction, /create_markdown_artifact/);
  assert.doesNotMatch(instruction, /planning\/Architect_Drafts/);
  assert.doesNotMatch(instruction, /Temporary draft/i);
  assert.doesNotMatch(instruction, /```json/);
  assert.doesNotMatch(instruction, /approximately 5-10/i);
}

function assertPhaseInterviewWaitingForFinalDraftAction(requiredAction) {
  assert.match(requiredAction, /conversational handoff/);
  assert.match(requiredAction, /interview or zero-question confirmation path/);
  assert.match(requiredAction, /confirm or correct the phase-understanding summary/);
  assert.match(requiredAction, /Final Draft handoff action/);
  assert.doesNotMatch(requiredAction, /wait for the MCP-written output/i);
}

function assertPhaseInterviewRevisionRequiresFinalDraftAction(requiredAction) {
  assert.match(requiredAction, /revised Phase Interview conversational handoff/);
  assert.match(requiredAction, /resolve the revision direction/);
  assert.match(requiredAction, /confirm or correct the phase-understanding summary/);
  assert.match(requiredAction, /prepare and copy the Final Draft handoff/);
  assert.match(requiredAction, /write the revised Phase Interview/);
  assert.doesNotMatch(requiredAction, /Copy the revised Phase Interview instruction and send it/i);
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
    "## Clarification Required\nClarification required: No.",
    "## Material Questions and Answers\nNo Operator clarification questions were required.",
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
