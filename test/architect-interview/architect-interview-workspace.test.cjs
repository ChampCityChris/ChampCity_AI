const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  getArchitectInterviewWorkspaceModel,
  saveCurrentArchitectInterviewOutput,
  reviewArchitectInterview,
} = require("../../dist/main/architectInterview/architectInterviewService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  seedApprovedProjectIntake,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Architect Interview workspace saves direct Markdown output without creation contracts", () => {
  const root = tempWorkspace("champcity-architect-interview-");
  const targets = seedApprovedProjectIntake(root);

  const waiting = getArchitectInterviewWorkspaceModel(root);
  assert.equal(waiting.railStatus, "Waiting for Output");
  const retiredContractField = ["architectOutput", "Creation", "ContractId"].join("");
  assert.equal(waiting[retiredContractField], undefined);
  assert.equal(waiting.interviewTargets.markdownPath, targets.interview);
  assert.match(waiting.requiredAction, /MCP saved confirmation/);
  assert.match(waiting.handoffInstruction, /diagnostics_toolbox\.list_workspaces/);
  assert.match(waiting.handoffInstruction, /"action": "submit_handoff_outputs"/);
  assert.match(waiting.handoffInstruction, /"workspaceId": "<resolved workspace ID>"/);
  assert.match(waiting.handoffInstruction, /"handoffKind": "architect-interview"/);
  assert.match(waiting.handoffInstruction, /"architectInterviewMarkdown": "<complete substantive Interview Markdown>"/);
  assert.match(waiting.handoffInstruction, /Do not return a snippet as completion/);
  assert.match(waiting.handoffInstruction, /Report completion only after the tool returns saved or already_saved/);
  assert.match(waiting.handoffInstruction, /handoff kind is a selector, not authority/);
  assert.doesNotMatch(waiting.handoffInstruction, /save_architect_interview_output/);
  assert.doesNotMatch(waiting.handoffInstruction, /paste .*Interview output/i);
  assert.doesNotMatch(waiting.handoffInstruction, /Architect Output import surface/);

  const saved = saveCurrentArchitectInterviewOutput(root, "# Architect Interview\n\nDirect output body.\n");
  assert.equal(saved.interviewDocument.markdownPath, targets.interview);
  assert.equal(fs.existsSync(path.join(root, targets.interview.replace(/\.md$/, ".json"))), false);

  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, targets.interview), "utf8"));
  assert.equal(parsed.metadata.artifactType, "project-architect-interview");
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.match(parsed.bodyMarkdown, /Direct output body/);

  const reviewed = reviewArchitectInterview(root, "Approved", "", undefined);
  assert.equal(reviewed.railStatus, "Completed");
});

test("Architect Interview revision handoff preserves full body and saves through MCP", () => {
  const root = tempWorkspace("champcity-architect-revision-");
  seedApprovedProjectIntake(root);
  saveCurrentArchitectInterviewOutput(root, "# Architect Interview\n\nInitial full body.\n");
  const revision = reviewArchitectInterview(root, "RevisionRequested", "Clarify project risks.", undefined);

  assert.equal(revision.railStatus, "Awaiting Approval");
  assert.match(revision.requiredAction, /save through MCP/);
  assert.match(revision.handoffInstruction, /Read and address current Operator revision notes/);
  assert.match(revision.handoffInstruction, /Clarify project risks/);
  assert.match(revision.handoffInstruction, /synthesize one complete substantive Project Architect Interview Markdown document/);
  assert.match(revision.handoffInstruction, /"action": "submit_handoff_outputs"/);
  assert.match(revision.handoffInstruction, /Do not supply target path, artifact metadata, identity, source revisions, participation role, disposition/);
  assert.doesNotMatch(revision.handoffInstruction, /save_architect_interview_output/);
  assert.doesNotMatch(revision.handoffInstruction, /paste .*Interview output/i);
  assert.doesNotMatch(revision.handoffInstruction, /Architect Output import surface/);
});

test("Architect Interview model does not carry a truncated authoritative preview body", () => {
  const root = tempWorkspace("champcity-architect-no-preview-");
  seedApprovedProjectIntake(root);
  saveCurrentArchitectInterviewOutput(
    root,
    `# Architect Interview\n\n${"Complete interview section.\n".repeat(700)}\nSECTION_44_FINAL_PRINCIPLE\n`,
  );

  const model = getArchitectInterviewWorkspaceModel(root);

  assert.equal(model.interviewDocument.documentReadState, "readable");
  assert.equal(model.preview, undefined);
});
