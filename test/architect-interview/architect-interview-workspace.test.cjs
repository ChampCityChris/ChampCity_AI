const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  getArchitectInterviewWorkspaceModel,
  prepareArchitectInterviewHandoff,
  reviewArchitectInterview,
} = require("../../dist/main/architectInterview/architectInterviewService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  buildDeterministicArchitectDraftSubmissionId,
} = require("../../dist/main/architectOutputs/architectDraftPaths.js");
const {
  getActiveArchitectInterviewDraftSubmission,
} = require("../../dist/main/architectInterview/architectInterviewDraftPilot.js");
const {
  seedApprovedProjectIntake,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

function submitDraft(root, body) {
  const prepared = prepareArchitectInterviewHandoff(root);
  const draftPath = prepared.handoffInstruction.match(/Temporary draft Markdown: ([^\n]+)/)[1];
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), body, "utf8");
  return getArchitectInterviewWorkspaceModel(root);
}

function invocationFrom(handoffInstruction) {
  const json = handoffInstruction.match(/```json\n([\s\S]*?)\n```/)[1];
  return JSON.parse(json);
}

function expectedSubmissionId(targets, submissionKey = "request-1") {
  return buildDeterministicArchitectDraftSubmissionId({
    outputKind: "project-architect-interview",
    owningWorkspaceId: "architect-interview",
    sourceHandoff: { path: targets.prompt, revision: 1 },
    submissionKey,
  });
}

function expectedPromotionGroupId(targets, submissionKey = "request-1") {
  return buildDeterministicArchitectDraftSubmissionId({
    outputKind: "project-architect-interview",
    owningWorkspaceId: "architect-interview",
    sourceHandoff: { path: targets.prompt, revision: 1 },
    submissionKey,
  });
}

test("Architect Interview workspace promotes an application-owned temporary draft", () => {
  const root = tempWorkspace("champcity-architect-interview-");
  const targets = seedApprovedProjectIntake(root);

  const waiting = prepareArchitectInterviewHandoff(root);
  assert.equal(waiting.railStatus, "Waiting for Output");
  const retiredContractField = ["architectOutput", "Creation", "ContractId"].join("");
  assert.equal(waiting[retiredContractField], undefined);
  assert.equal(waiting.interviewTargets.markdownPath, targets.interview);
  assert.match(waiting.handoffInstruction, /artifact_toolbox\.create_markdown_artifact/);
  assert.match(waiting.handoffInstruction, /Temporary draft Markdown: planning\/Architect_Drafts\//);
  assert.match(waiting.handoffInstruction, /Do not return a snippet as completion/);
  assert.match(waiting.handoffInstruction, /remains incomplete until this temporary draft is created and ChampCity A\/I promotes it/);
  assert.doesNotMatch(waiting.handoffInstruction, /submit_handoff_outputs/);
  assert.doesNotMatch(waiting.handoffInstruction, /paste .*Interview output/i);
  assert.doesNotMatch(waiting.handoffInstruction, /Architect Output import surface/);
  assert.doesNotMatch(waiting.handoffInstruction, /"path":/);

  const invocation = invocationFrom(waiting.handoffInstruction);
  const expectedId = expectedSubmissionId(targets);
  assert.deepEqual(invocation, {
    action: "create_markdown_artifact",
    workspaceId: "<resolved workspace ID>",
    params: {
      relativePath: `planning/Architect_Drafts/${expectedId}/interview.md`,
      content: "<complete body-only Interview Markdown>",
      overwrite: false,
    },
  });
  const active = getActiveArchitectInterviewDraftSubmission(root);
  assert.equal(active.submission.submissionId, expectedId);
  assert.equal(active.submission.promotionGroupId, expectedPromotionGroupId(targets));

  const saved = submitDraft(root, "# Architect Interview\n\nDraft output body.\n");
  assert.equal(saved.interviewDocument.markdownPath, targets.interview);
  assert.equal(fs.existsSync(path.join(root, targets.interview.replace(/\.md$/, ".json"))), false);

  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, targets.interview), "utf8"));
  assert.equal(parsed.metadata.artifactType, "project-architect-interview");
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.match(parsed.bodyMarkdown, /Draft output body/);

  const reviewed = reviewArchitectInterview(root, "Approved", "", undefined);
  assert.equal(reviewed.railStatus, "Completed");
});

test("Architect Interview polling and repeated preparation reuse the active waiting draft", () => {
  const root = tempWorkspace("champcity-architect-ordinal-");
  const targets = seedApprovedProjectIntake(root);
  const first = prepareArchitectInterviewHandoff(root);
  const firstActive = getActiveArchitectInterviewDraftSubmission(root).submission;
  assert.equal(firstActive.submissionId, expectedSubmissionId(targets, "request-1"));

  getArchitectInterviewWorkspaceModel(root);
  getArchitectInterviewWorkspaceModel(root);
  assert.equal(getActiveArchitectInterviewDraftSubmission(root).submission.submissionId, firstActive.submissionId);

  const second = prepareArchitectInterviewHandoff(root);
  const secondActive = getActiveArchitectInterviewDraftSubmission(root).submission;
  assert.equal(secondActive.submissionId, firstActive.submissionId);
  assert.equal(secondActive.submissionId, expectedSubmissionId(targets, "request-1"));
  assert.equal(
    invocationFrom(second.handoffInstruction).params.relativePath,
    invocationFrom(first.handoffInstruction).params.relativePath,
  );
});

test("Architect Interview revision handoff uses a fresh draft and promotes as a substantive revision", () => {
  const root = tempWorkspace("champcity-architect-revision-");
  const targets = seedApprovedProjectIntake(root);
  submitDraft(root, "# Architect Interview\n\nInitial full body.\n");
  const revision = reviewArchitectInterview(root, "RevisionRequested", "Clarify project risks.", undefined);

  assert.equal(revision.railStatus, "Awaiting Approval");
  const prepared = prepareArchitectInterviewHandoff(root);
  assert.match(prepared.handoffInstruction, /Read and address current Operator revision notes/);
  assert.match(prepared.handoffInstruction, /Clarify project risks/);
  assert.match(prepared.handoffInstruction, /create_markdown_artifact/);
  assert.doesNotMatch(prepared.handoffInstruction, /submit_handoff_outputs/);
  assert.doesNotMatch(prepared.handoffInstruction, /paste .*Interview output/i);
  assert.doesNotMatch(prepared.handoffInstruction, /Architect Output import surface/);

  const draftPath = invocationFrom(prepared.handoffInstruction).params.relativePath;
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), "# Architect Interview\n\nRevised full body.\n", "utf8");
  getArchitectInterviewWorkspaceModel(root);

  const revised = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, targets.interview), "utf8"));
  assert.equal(revised.metadata.artifactRevision, 2);
  assert.equal(revised.metadata.documentDisposition.status, "Pending");
  assert.equal(revised.metadata.documentDisposition.notes, "");
  assert.equal(revised.metadata.documentDisposition.reviewedAt, null);
  assert.match(revised.bodyMarkdown, /Revised full body/);
});

test("malformed Interview drafts remain visible and require a fresh retry", () => {
  const root = tempWorkspace("champcity-architect-malformed-");
  const targets = seedApprovedProjectIntake(root);
  const prepared = prepareArchitectInterviewHandoff(root);
  const failedDraftPath = prepared.handoffInstruction.match(/Temporary draft Markdown: ([^\n]+)/)[1];
  fs.mkdirSync(path.dirname(path.join(root, failedDraftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, failedDraftPath), "<!-- CHAMPCITY-METADATA\n{}\nCHAMPCITY-METADATA -->\n# Bad", "utf8");

  const failed = getArchitectInterviewWorkspaceModel(root);
  assert.equal(failed.draftSubmissionState, "promotion-failed");
  assert.equal(failed.handoffInstruction, undefined);
  assert.equal(fs.existsSync(path.join(root, failedDraftPath)), true);
  assert.equal(fs.existsSync(path.join(root, targets.interview)), false);

  const retried = prepareArchitectInterviewHandoff(root);
  const retryInvocation = invocationFrom(retried.handoffInstruction);
  const retryDraftPath = retryInvocation.params.relativePath;
  assert.notEqual(retryDraftPath, failedDraftPath);
  assert.equal(retryInvocation.params.overwrite, false);
  assert.equal(fs.existsSync(path.join(root, failedDraftPath)), true);
});

test("ineligible existing Interview target remains byte-identical and blocks draft promotion", () => {
  const root = tempWorkspace("champcity-architect-ineligible-");
  const targets = seedApprovedProjectIntake(root);
  const prepared = prepareArchitectInterviewHandoff(root);
  const draftPath = invocationFrom(prepared.handoffInstruction).params.relativePath;
  writeDoc(root, targets.interview, "project-architect-interview", "Pending", {
    identity: { "Project.ArtifactKey": "demo", projectSlug: "demo" },
    sourceRevisions: [
      { path: targets.intake, revision: 1 },
      { path: targets.prompt, revision: 1 },
    ],
    bodyMarkdown: "# Architect Interview\n\nExisting Pending body.\n",
  });
  const before = fs.readFileSync(path.join(root, targets.interview), "utf8");
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), "# Architect Interview\n\nUnauthorized replacement.\n", "utf8");

  const model = getArchitectInterviewWorkspaceModel(root);

  assert.equal(model.draftSubmissionState, "promotion-failed");
  assert.match(model.draftPromotionError, /not eligible for substantive replacement/);
  assert.equal(fs.readFileSync(path.join(root, targets.interview), "utf8"), before);
  assert.equal(fs.existsSync(path.join(root, draftPath)), true);
});

test("Architect Interview model does not carry a truncated authoritative preview body", () => {
  const root = tempWorkspace("champcity-architect-no-preview-");
  seedApprovedProjectIntake(root);
  submitDraft(
    root,
    `# Architect Interview\n\n${"Complete interview section.\n".repeat(700)}\nSECTION_44_FINAL_PRINCIPLE\n`,
  );

  const model = getArchitectInterviewWorkspaceModel(root);

  assert.equal(model.interviewDocument.documentReadState, "readable");
  assert.equal(model.preview, undefined);
});
