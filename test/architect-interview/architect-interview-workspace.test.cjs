const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  getArchitectInterviewWorkspaceModel,
  prepareArchitectInterviewHandoff,
  regenerateArchitectInterviewPrompt,
  reviewArchitectInterview,
} = require("../../dist/main/architectInterview/architectInterviewService.js");
const {
  getArchitectOutputWorkspaceModel,
  prepareArchitectOutputHandoff,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
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
  approve,
  seedApprovedProjectIntake,
  tempWorkspace,
  tempWorkspaceWithoutBinding,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");
const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  buildArchitectHandoffManifest,
} = require("../../dist/main/integrations/architectMcpHandoffService.js");

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

function expectedWorkspaceIdFromRepository(projectRepository) {
  return path.basename(projectRepository)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
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
    workspaceId: "alpha",
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

test("Architect Interview handoff uses projectRepository route when repository authority has no binding", () => {
  const root = tempWorkspaceWithoutBinding("champcity-architect-interview-unbound-");
  const result = submitProjectIntake({
    projectName: "Unbound Interview",
    projectPurpose: "Keep Architect Interview projection usable without MCP binding.",
    desiredOutcome: "Handoff setup routes from Project Intake repository authority.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });
  approve(root, result.projectIntakeMarkdownPath);

  const model = getArchitectInterviewWorkspaceModel(root);
  assert.equal(model.state, "waiting-for-output");
  assert.equal(model.promptDocument.markdownPath, result.architectPromptMarkdownPath);
  assert.equal(model.interviewTargets.markdownPath, result.architectInterviewTargetMarkdownPath);

  const expectedWorkspaceId = expectedWorkspaceIdFromRepository(root);
  const prepared = prepareArchitectInterviewHandoff(root);
  const invocation = invocationFrom(prepared.handoffInstruction);

  assert.equal(fs.existsSync(path.join(root, ".champcity", "mcp-workspace-binding.json")), false);
  assert.equal(prepared.canCopyHandoff, true);
  assert.equal(invocation.workspaceId, expectedWorkspaceId);
  assert.match(prepared.handoffInstruction, new RegExp(`Use ChampCity MCP workspaceId "${expectedWorkspaceId}" only\\.`));
  assert.doesNotMatch(prepared.handoffInstruction, /BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED/);
  assert.doesNotMatch(prepared.handoffInstruction, /resolve the configured workspace ID|search other workspaces|infer/i);

  const manifest = buildArchitectHandoffManifest(root);
  assert.equal(manifest.state, "handoff-ready");
  assert.equal(manifest.mcpWorkspaceBinding.mcpWorkspaceId, expectedWorkspaceId);
});

test("Architect Interview regenerates a deleted prompt from Approved Project Intake", () => {
  const outerRoot = tempWorkspaceWithoutBinding("champcity-architect-regenerate-prompt-");
  const root = path.join(outerRoot, "ChampCity_PDL");
  fs.mkdirSync(root, { recursive: true });
  const result = submitProjectIntake({
    projectName: "Pocket Decision Log",
    projectPurpose: "Recover a deleted Architect Interview prompt.",
    desiredOutcome: "The Operator can continue without resubmitting Project Intake.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });
  approve(root, result.projectIntakeMarkdownPath);
  const intakeBefore = fs.readFileSync(path.join(root, result.projectIntakeMarkdownPath), "utf8");
  fs.unlinkSync(path.join(root, result.architectPromptMarkdownPath));

  const missing = getArchitectInterviewWorkspaceModel(root);
  assert.equal(missing.state, "prompt-missing");
  assert.equal(missing.selectedReviewDocumentRole, "project-intake");
  assert.equal(missing.projectIntakeDocument.markdownPath, result.projectIntakeMarkdownPath);
  assert.deepEqual(missing.evidencePaths, [result.projectIntakeMarkdownPath]);
  assert.equal(missing.markdownPath, result.projectIntakeMarkdownPath);
  assert.equal(missing.canRegeneratePrompt, true);
  assert.equal(missing.canPrepareHandoff, false);
  assert.equal(missing.canCopyHandoff, false);

  const genericMissing = getArchitectOutputWorkspaceModel(root, "architect-interview");
  assert.equal(genericMissing.state, "not-ready");
  assert.equal(genericMissing.canRegeneratePrompt, true);
  assert.equal(genericMissing.canPrepareHandoff, false);

  const regenerated = regenerateArchitectInterviewPrompt(root);
  assert.equal(regenerated.state, "waiting-for-output");
  assert.equal(regenerated.promptDocument.markdownPath, result.architectPromptMarkdownPath);
  assert.equal(regenerated.interviewTargets.markdownPath, result.architectInterviewTargetMarkdownPath);
  assert.equal(fs.readFileSync(path.join(root, result.projectIntakeMarkdownPath), "utf8"), intakeBefore);

  const prompt = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, result.architectPromptMarkdownPath), "utf8"),
  );
  assert.equal(prompt.metadata.artifactType, "project-architect-interview-prompt");
  assert.equal(prompt.metadata.participationRole, "nonReviewHandoff");
  assert.equal(prompt.metadata.documentDisposition.status, "Approved");
  assert.deepEqual(prompt.metadata.sourceRevisions, [
    { path: result.projectIntakeMarkdownPath, revision: 1 },
  ]);
  assert.equal(prompt.metadata.workflowData.projectRepository, path.resolve(root));
  assert.equal(prompt.metadata.workflowData.repositoryAuthority.projectRepository, path.resolve(root));
  assert.equal(prompt.metadata.workflowData.projectSlug, "pocket_decision_log");
  assert.equal(prompt.metadata.workflowData.architectOutputTargets.markdown, result.architectInterviewTargetMarkdownPath);
  const regeneratedPromptBytes = fs.readFileSync(path.join(root, result.architectPromptMarkdownPath), "utf8");

  const genericReady = getArchitectOutputWorkspaceModel(root, "architect-interview");
  assert.equal(genericReady.canRegeneratePrompt, false);
  assert.equal(genericReady.canPrepareHandoff, true);
  assert.equal(genericReady.canCopyHandoff, false);

  const prepared = prepareArchitectOutputHandoff(root, "architect-interview");
  assert.equal(prepared.canCopyHandoff, true);
  assert.match(prepared.preparedInstruction, /Use ChampCity MCP workspaceId "champcity_pdl" only\./);
  assert.doesNotMatch(prepared.preparedInstruction, /resolve the configured workspace ID|search other workspaces|infer/i);
  const invocation = invocationFrom(prepared.preparedInstruction);
  const active = getActiveArchitectInterviewDraftSubmission(root);
  assert.equal(fs.readFileSync(path.join(root, result.architectPromptMarkdownPath), "utf8"), regeneratedPromptBytes);
  assert.equal(invocation.workspaceId, "champcity_pdl");
  assert.match(active.submission.submissionId, /^ad-architect-interview-project-architect-interview-request-1-src-[a-f0-9]{20}-r1$/);
  assert.equal(active.submission.sourceHandoff.path, result.architectPromptMarkdownPath);
  assert.ok(active.submission.submissionId.length <= 240);
});

test("Architect Interview regeneration does not overwrite a conflicting prompt target", () => {
  const root = tempWorkspace("champcity-architect-regenerate-conflict-");
  const result = submitProjectIntake({
    projectName: "Conflict Target",
    projectPurpose: "Keep regeneration bounded.",
    desiredOutcome: "Existing nonmatching prompt target requires Operator attention.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });
  approve(root, result.projectIntakeMarkdownPath);
  fs.unlinkSync(path.join(root, result.architectPromptMarkdownPath));
  const conflictBody = "# Nonmatching prompt target\n\nDo not overwrite.\n";
  fs.writeFileSync(path.join(root, result.architectPromptMarkdownPath), conflictBody, "utf8");

  const model = getArchitectInterviewWorkspaceModel(root);
  assert.equal(model.state, "needs-attention");
  assert.match(model.reason, /target exists but is not the current Approved associated prompt/);
  assert.equal(model.canRegeneratePrompt, false);
  assert.throws(
    () => regenerateArchitectInterviewPrompt(root),
    /target exists but is not the current Approved associated prompt/,
  );
  assert.equal(fs.readFileSync(path.join(root, result.architectPromptMarkdownPath), "utf8"), conflictBody);
});

test("Architect Interview handoff prepares compact draft ID for real long prompt path", () => {
  const root = tempWorkspace("champcity-architect-interview-long-path-");
  const targets = seedApprovedProjectIntake(root, "pocket_decision_log");
  assert.equal(
    targets.prompt,
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_pocket_decision_log.md",
  );

  const prepared = prepareArchitectInterviewHandoff(root);
  const invocation = invocationFrom(prepared.handoffInstruction);
  const active = getActiveArchitectInterviewDraftSubmission(root);

  assert.match(active.submission.submissionId, /^ad-architect-interview-project-architect-interview-request-1-src-[a-f0-9]{20}-r1$/);
  assert.equal(active.submission.sourceHandoff.path, targets.prompt);
  assert.equal(active.submission.sourceHandoff.revision, 1);
  assert.equal(invocation.params.relativePath, `planning/Architect_Drafts/${active.submission.submissionId}/interview.md`);
  assert.ok(active.submission.submissionId.length <= 240);
  assert.doesNotMatch(active.submission.submissionId, /project-architect-interview-prompts/);
});
