const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const rendererLoader = require("../renderer/renderer-source-loader.cjs");
const { IssuePlanningWorkspace } = rendererLoader.loadRendererSourceModule("src/renderer/app/IssuePlanningWorkspace.tsx");

const {
  __setIssueProjectionReadTestHooks,
  applyIssueArchitectReview,
  applyIssuePlanningReview,
  applyIssueValidationDecision,
  getIssueFixCardProjection,
  getIssuePlanningProjection,
  getIssueResolutionNavigationProjection,
  getIssueValidationProjection,
  prepareIssuePlanningHandoff,
  promoteIssuePlanningDraftBundle,
  resolveIssuePlanningCopyHandoff,
} = require("../../dist/main/issueResolution/issueResolutionService.js");
const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");

test("aggregate Issue Validation is unavailable until every current Fix Card has valid close record", () => {
  const root = preparedIssue("ISSUE_201", 2);
  writeNormalCloseRecord(root, "ISSUE_201", "ISSUE_201-FC01");
  const projection = getIssueValidationProjection(root, "ISSUE_201");

  assert.equal(projection.status, "blocked-fix-cards-incomplete");
  assert.equal(projection.eligible, false);
  assert.equal(projection.completedFixCards.length, 1);
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_201").issueValidationAvailable, false);
  assert.throws(
    () => applyIssueValidationDecision(root, "ISSUE_201", {
      decision: "ValidateResolved",
      operatorNotes: "Must not write.",
      expectedEvidenceSha256: "stale",
    }),
    /close record for every current Fix Card Plan candidate/,
  );
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_201", "Validation_Records", "ISSUE_VALIDATION_RECORD_ISSUE_201_ATTEMPT01.md")), false);
});

test("Approved aggregate validation binds the exact current source set, rejects stale renderer evidence, and reconstructs after refresh", () => {
  const root = preparedIssue("ISSUE_202", 2);
  writeNormalCloseRecord(root, "ISSUE_202", "ISSUE_202-FC01");
  writeBootstrapCloseRecord(root, "ISSUE_202", "ISSUE_202-FC02");
  const eligible = getIssueValidationProjection(root, "ISSUE_202");

  assert.equal(eligible.status, "eligible");
  assert.deepEqual(eligible.completedFixCards.map((entry) => entry.closeRecordOrigin), ["fix-card-validation", "bootstrap-cutover"]);
  assert.equal(eligible.sourceEvidence.length, 8);
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_202").currentStageId, "issue-validation");

  fs.appendFileSync(path.join(root, "issues", "ISSUE_202", "ISSUE_RESOLUTION_PLAN.md"), "\n\nFresh aggregate evidence clarification.\n", "utf8");
  assert.throws(
    () => applyIssueValidationDecision(root, "ISSUE_202", {
      decision: "ValidateResolved",
      operatorNotes: "Cached evidence must fail.",
      expectedEvidenceSha256: eligible.evidenceSha256,
    }),
    /evidence changed after the workspace was loaded/,
  );

  const refreshed = getIssueValidationProjection(root, "ISSUE_202");
  let postMutationContexts = 0;
  const postMutationReads = new Map();
  __setIssueProjectionReadTestHooks({
    onContextCreated: (_workspaceRoot, purpose) => {
      if (purpose === "post-mutation") postMutationContexts += 1;
    },
    onMarkdownReadComplete: (relativePath, _bodyMarkdown, purpose) => {
      if (purpose !== "post-mutation") return;
      postMutationReads.set(relativePath, (postMutationReads.get(relativePath) ?? 0) + 1);
    },
  });
  let decisionResult;
  try {
    decisionResult = applyIssueValidationDecision(root, "ISSUE_202", {
      decision: "ValidateResolved",
      operatorNotes: "The combined correction resolves the original Issue.",
      expectedEvidenceSha256: refreshed.evidenceSha256,
    });
  } finally {
    __setIssueProjectionReadTestHooks();
  }
  const decided = decisionResult.projection;

  assert.equal(decided.status, "approved");
  assert.equal(decisionResult.postMutation.navigation.currentStageId, "issue-close");
  assert.equal(decisionResult.postMutation.close.issueId, "ISSUE_202");
  assert.equal(postMutationContexts, 1);
  assert.deepEqual([...postMutationReads.entries()].filter(([, count]) => count !== 1), []);
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_202").currentStageId, "issue-close");
  assert.equal(decided.currentAttemptNumber, 1);
  assert.equal(decided.currentRecordState, "readable");
  assert.match(decided.currentRecordPath, /ISSUE_VALIDATION_RECORD_ISSUE_202_ATTEMPT01\.md$/);
  const record = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, decided.currentRecordPath), "utf8"));
  assert.equal(record.metadata.artifactType, "issue-validation-record");
  assert.equal(record.metadata.identity.issueId, "ISSUE_202");
  assert.equal(record.metadata.identity.validationAttemptNumber, 1);
  assert.equal(record.metadata.identity.fixCardId, undefined);
  assert.equal(record.metadata.workflowData.stageId, "issue-validation");
  assert.equal(record.metadata.workflowData.decision, "ValidateResolved");
  assert.equal(record.metadata.workflowData.returnTarget, "issue-validation");
  assert.equal(record.metadata.sourceRevisions.length, 8);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_202", "Close_Records", "ISSUE_CLOSE_RECORD_ISSUE_202.md")), false);
  assert.throws(
    () => applyIssueValidationDecision(root, "ISSUE_202", {
      decision: "ValidateResolved",
      operatorNotes: "Duplicate.",
      expectedEvidenceSha256: decided.evidenceSha256,
    }),
    /finalized Issue Validation decision already exists/,
  );

  fs.appendFileSync(path.join(root, "issues", "ISSUE_202", "FIX_CARD_PLAN.md"), "\n\nCurrent plan clarification after aggregate validation.\n", "utf8");
  const stale = getIssueValidationProjection(root, "ISSUE_202");
  assert.equal(stale.status, "eligible");
  assert.equal(stale.currentRecordState, "read-error");
  assert.match(stale.currentRecordReadError, /does not match the exact current aggregate source/);
  assert.equal(stale.nextAttemptNumber, 2);
});

test("malformed and conflicting aggregate records are visible needs-attention state, while Fix Card validation records remain distinct", () => {
  const malformedRoot = preparedIssue("ISSUE_203", 1);
  writeNormalCloseRecord(malformedRoot, "ISSUE_203", "ISSUE_203-FC01");
  const validationDirectory = path.join(malformedRoot, "issues", "ISSUE_203", "Validation_Records");
  fs.writeFileSync(path.join(validationDirectory, "ISSUE_VALIDATION_RECORD_ISSUE_203_ATTEMPT01.md"), "not canonical", "utf8");
  const malformed = getIssueValidationProjection(malformedRoot, "ISSUE_203");
  assert.equal(malformed.status, "needs-attention");
  assert.match(malformed.statusMessage, /need[s]? attention/i);
  assert.equal(malformed.canValidateResolved, false);

  const conflictRoot = preparedIssue("ISSUE_204", 1);
  writeNormalCloseRecord(conflictRoot, "ISSUE_204", "ISSUE_204-FC01");
  const eligible = getIssueValidationProjection(conflictRoot, "ISSUE_204");
  const first = applyIssueValidationDecision(conflictRoot, "ISSUE_204", {
    decision: "ValidateResolved",
    operatorNotes: "First current result.",
    expectedEvidenceSha256: eligible.evidenceSha256,
  }).projection;
  const firstDocument = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(conflictRoot, first.currentRecordPath), "utf8"));
  firstDocument.metadata.identity.validationAttemptNumber = 2;
  fs.writeFileSync(
    path.join(conflictRoot, "issues", "ISSUE_204", "Validation_Records", "ISSUE_VALIDATION_RECORD_ISSUE_204_ATTEMPT02.md"),
    serializeCanonicalMarkdownDocument(firstDocument.metadata, firstDocument.bodyMarkdown.replace("Attempt 01", "Attempt 02")),
    "utf8",
  );
  const conflict = getIssueValidationProjection(conflictRoot, "ISSUE_204");
  assert.equal(conflict.status, "needs-attention");
  assert.match(conflict.statusMessage, /same exact current aggregate evidence/);
});

test("Operator RevisionRequested disposition makes additive planning revision eligible without falsifying Approved review or Development state", () => {
  const root = preparedIssue("ISSUE_205", 2);
  const boundedCorrectiveWork = "Add one bounded corrective Fix Card that preserves and restores repository-derived Issue Validation re-entry after refresh.";
  writeNormalCloseRecord(root, "ISSUE_205", "ISSUE_205-FC01");
  writeBootstrapCloseRecord(root, "ISSUE_205", "ISSUE_205-FC02");
  const developmentPath = path.join(root, "planning", "CURRENT_PROJECT_STATE.md");
  fs.mkdirSync(path.dirname(developmentPath), { recursive: true });
  fs.writeFileSync(developmentPath, "development-state-marker", "utf8");
  const approvedReviewPath = path.join(root, "issues", "ISSUE_205", "ISSUE_PLANNING_REVIEW.md");
  const approvedReviewBefore = fs.readFileSync(approvedReviewPath, "utf8");
  const eligible = getIssueValidationProjection(root, "ISSUE_205");

  assert.throws(
    () => applyIssueValidationDecision(root, "ISSUE_205", {
      decision: "RequestCorrectiveWork",
      operatorNotes: "General concern.",
      boundedCorrectiveWork: "   ",
      expectedEvidenceSha256: eligible.evidenceSha256,
    }),
    /bounded unresolved outcome|general dissatisfaction/,
  );
  const requestedResult = applyIssueValidationDecision(root, "ISSUE_205", {
    decision: "RequestCorrectiveWork",
    operatorNotes: "The aggregate workflow still loses repository-derived re-entry state.",
    boundedCorrectiveWork,
    expectedEvidenceSha256: eligible.evidenceSha256,
  });
  const requested = requestedResult.projection;
  assert.equal(requested.status, "revision-requested");
  assert.equal(requestedResult.postMutation.navigation.currentStageId, "issue-planning");
  assert.equal(requestedResult.postMutation.planning.revisionSource, "issue-validation");
  assert.equal(requestedResult.postMutation.planning.fixCardsEligible, false);
  assert.equal(requestedResult.postMutation.planning.canPrepareHandoff, true);
  assert.equal(fs.readFileSync(approvedReviewPath, "utf8"), approvedReviewBefore);
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_205").currentStageId, "issue-planning");

  const planning = getIssuePlanningProjection(root, "ISSUE_205");
  const revisionRecordDocument = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, requested.currentRecordPath), "utf8"),
  );
  assert.equal(planning.status, "revision-requested");
  assert.equal(planning.revisionSource, "issue-validation");
  assert.equal(planning.issueValidationRevisionRecordPath, requested.currentRecordPath);
  assert.equal(planning.issueValidationRevisionRecordMarkdown, revisionRecordDocument.bodyMarkdown);
  assert.equal(planning.issueValidationBoundedCorrectiveWork, boundedCorrectiveWork);
  assert.equal(planning.fixCardsEligible, false);
  assert.equal(planning.canPrepareHandoff, true);
  assert.equal(planning.canCopyHandoff, false);
  assert.equal(planning.operatorDisposition, "Approved");
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_205").projection;
  assert.equal(prepared.status, "handoff-prepared");
  assert.ok(prepared.activeSubmission);
  assert.equal(prepared.canCopyHandoff, true);
  assert.equal(prepared.revisionSource, "issue-validation");
  assert.equal(prepared.issueValidationRevisionRecordPath, requested.currentRecordPath);
  assert.equal(prepared.issueValidationRevisionRecordMarkdown, planning.issueValidationRevisionRecordMarkdown);
  assert.equal(prepared.issueValidationBoundedCorrectiveWork, boundedCorrectiveWork);
  assert.equal(prepared.fixCardsEligible, false);
  assert.equal(prepared.canApplyReview, false);
  const preparedSubmissionId = prepared.activeSubmission.submissionId;
  const copied = resolveIssuePlanningCopyHandoff(root, "ISSUE_205");
  const handoff = copied.instruction;
  assert.equal(copied.result.projection.status, "handoff-prepared");
  assert.equal(copied.result.projection.activeSubmission.submissionId, preparedSubmissionId);
  assert.equal(copied.result.projection.canCopyHandoff, true);
  assert.equal(copied.result.projection.revisionSource, "issue-validation");
  assert.equal(copied.result.projection.issueValidationRevisionRecordPath, requested.currentRecordPath);
  assert.equal(copied.result.projection.issueValidationRevisionRecordMarkdown, planning.issueValidationRevisionRecordMarkdown);
  assert.equal(copied.result.projection.issueValidationBoundedCorrectiveWork, boundedCorrectiveWork);
  assert.match(handoff, /Governing Issue Validation Record/);
  assert.match(handoff, /Add one bounded corrective Fix Card/);
  assert.match(handoff, /Preserve every previously closed Fix Card candidate exactly/);
  assert.doesNotMatch(handoff, /phaseId/);

  const preparedMarkup = renderToStaticMarkup(React.createElement(IssuePlanningWorkspace, {
    actionError: "",
    actionFeedback: "",
    browserPanel: React.createElement("div", null, "Browser"),
    currentIssue: {
      issueId: "ISSUE_205",
      numericId: 205,
      title: "Aggregate Validation Test",
      recordPath: "issues/ISSUE_205/ISSUE_RECORD.md",
      recordState: "readable",
      bodyMarkdown: "# ISSUE_205",
    },
    isActionPending: false,
    onApplyReview: async () => undefined,
    onCopyHandoff: () => undefined,
    onPrepareHandoff: () => undefined,
    onRefresh: () => undefined,
    onReloadBrowser: () => undefined,
    projection: prepared,
    projectName: "ChampCity_AI",
  }));
  assert.match(preparedMarkup, /Corrective Issue Planning Required/);
  assert.match(preparedMarkup, new RegExp(requested.currentRecordPath.replaceAll("/", "\\/")));
  assert.match(preparedMarkup, new RegExp(boundedCorrectiveWork.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const preparedButtons = preparedMarkup.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];
  const correctiveCopyButton = preparedButtons.find((button) => button.includes("Copy Corrective Planning Handoff"));
  assert.ok(correctiveCopyButton, "real prepared production projection renders the corrective copy action");
  assert.doesNotMatch(correctiveCopyButton, /disabled/);
  assert.doesNotMatch(preparedMarkup, />\s*Copy Handoff\s*<\/button>/);

  const issueDraftPath = path.join(root, prepared.activeSubmission.issueResolutionPlanDraftPath);
  const fixDraftPath = path.join(root, prepared.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issueDraftPath), { recursive: true });
  fs.writeFileSync(issueDraftPath, validIssueResolutionPlan("ISSUE_205", "Corrective aggregate planning revision"), "utf8");
  const waiting = getIssuePlanningProjection(root, "ISSUE_205");
  assert.equal(waiting.status, "waiting-for-drafts");
  assert.equal(waiting.activeSubmission.submissionId, preparedSubmissionId);
  assert.equal(waiting.canCopyHandoff, true);
  assert.equal(waiting.revisionSource, "issue-validation");
  assert.equal(waiting.issueValidationRevisionRecordPath, requested.currentRecordPath);
  assert.equal(waiting.issueValidationBoundedCorrectiveWork, boundedCorrectiveWork);
  assert.equal(waiting.fixCardsEligible, false);
  assert.equal(waiting.canApplyReview, false);
  const mutated = candidateList("ISSUE_205", 3);
  mutated[0].title = "Repurposed closed work";
  fs.writeFileSync(fixDraftPath, validFixCardPlan("ISSUE_205", mutated), "utf8");
  assert.throws(
    () => promoteIssuePlanningDraftBundle(root, "ISSUE_205"),
    /cannot remove, renumber, retitle, repurpose/,
  );

  fs.writeFileSync(fixDraftPath, validFixCardPlan("ISSUE_205", candidateList("ISSUE_205", 3)), "utf8");
  const promoted = promoteIssuePlanningDraftBundle(root, "ISSUE_205").projection;
  assert.equal(promoted.status, "awaiting-operator-review");
  assert.equal(fs.existsSync(approvedReviewPath), false);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_205", "Issue_Planning_History", "revision-001", "ISSUE_PLANNING_REVIEW.md")), true);
  assert.equal(fs.existsSync(path.join(root, requested.currentRecordPath)), true);
  assert.equal(fs.readFileSync(developmentPath, "utf8"), "development-state-marker");

  applyIssuePlanningReview(root, "ISSUE_205", { disposition: "Approved", operatorNotes: "Corrective plan accepted." });
  const fixCards = getIssueFixCardProjection(root, "ISSUE_205", "fix-card-map");
  assert.equal(fixCards.candidates[0].lifecycle.state, "complete");
  assert.equal(fixCards.candidates[1].lifecycle.state, "complete");
  assert.equal(fixCards.candidates[2].lifecycle.state, "eligible");
  assert.equal(getIssueValidationProjection(root, "ISSUE_205").status, "blocked-fix-cards-incomplete");

  writeBootstrapCloseRecord(root, "ISSUE_205", "ISSUE_205-FC03");
  const eligibleAgain = getIssueValidationProjection(root, "ISSUE_205");
  assert.equal(eligibleAgain.status, "eligible");
  assert.equal(eligibleAgain.nextAttemptNumber, 2);
  const second = applyIssueValidationDecision(root, "ISSUE_205", {
    decision: "ValidateResolved",
    operatorNotes: "The added bounded correction resolves the remaining aggregate outcome.",
    expectedEvidenceSha256: eligibleAgain.evidenceSha256,
  }).projection;
  assert.equal(second.currentAttemptNumber, 2);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_205", "Validation_Records", "ISSUE_VALIDATION_RECORD_ISSUE_205_ATTEMPT01.md")), true);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_205", "Validation_Records", "ISSUE_VALIDATION_RECORD_ISSUE_205_ATTEMPT02.md")), true);
  assert.equal(fs.readFileSync(developmentPath, "utf8"), "development-state-marker");
});

function preparedIssue(issueId, candidateCount) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-issue-validation-"));
  const issueRoot = path.join(root, "issues", issueId);
  fs.mkdirSync(issueRoot, { recursive: true });
  fs.writeFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), [
    `# ${issueId} - Aggregate Validation Test`,
    "",
    "## Issue",
    "The selected project needs a repository-derived aggregate Issue Validation outcome without Development or Repair parentage.",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(issueRoot, "ARCHITECT_INVESTIGATION.md"), validInvestigation(issueId), "utf8");
  applyIssueArchitectReview(root, issueId, { disposition: "Approved", operatorNotes: "Accepted architecture." });
  fs.writeFileSync(path.join(issueRoot, "ISSUE_RESOLUTION_PLAN.md"), validIssueResolutionPlan(issueId), "utf8");
  fs.writeFileSync(path.join(issueRoot, "FIX_CARD_PLAN.md"), validFixCardPlan(issueId, candidateList(issueId, candidateCount)), "utf8");
  applyIssuePlanningReview(root, issueId, { disposition: "Approved", operatorNotes: "Approved execution plan." });
  return root;
}

function candidateList(issueId, count) {
  return Array.from({ length: count }, (_, index) => ({
    fixCardId: `${issueId}-FC${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    title: index === 0 ? "Aggregate evidence foundation" : index === 1 ? "Repository lifecycle presentation" : "Bounded corrective re-entry",
    purpose: index === 0
      ? "Establish the exact aggregate evidence and current state boundary for the selected Issue."
      : index === 1
      ? "Expose the repository-derived lifecycle state and preserve established Issue Resolution behavior."
      : "Correct the bounded repository-derived re-entry outcome identified by aggregate Issue Validation.",
    dependsOn: index === 0 ? [] : [`${issueId}-FC${String(index).padStart(2, "0")}`],
    evidencePaths: [`issues/${issueId}/ISSUE_RECORD.md`, `issues/${issueId}/FIX_CARD_PLAN.md`],
  }));
}

function validInvestigation(issueId) {
  return [
    `# ${issueId} - Architect Investigation`,
    "",
    "## Purpose", "Confirm the bounded Issue Resolution architecture.",
    "## Issue Assessment", "Repository evidence confirms a bounded project-owned correction.",
    "## Repository Evidence Inspected", "Current Issue, source, and tests were inspected.",
    "## Confirmed Current Architecture", "Issue Resolution is separate from Development state.",
    "## Root Cause", "Aggregate Issue outcome state is absent.",
    "## Required Architecture", "Use exact repository evidence and an Issue-owned aggregate record.",
    "## Preservation Rules", "Preserve Development and Fix Card lifecycle state.",
    "## Risks and Constraints", "Do not create false Repair or Development parentage.",
    "## Architect Recommendation", "Proceed in Issue Resolution",
    "## Architect Conclusion", "Proceed with bounded Issue Planning.",
  ].join("\n\n");
}

function validIssueResolutionPlan(issueId, prefix = "Accepted aggregate correction") {
  const detail = "This section remains bounded to the accepted Issue, preserves Development state and prior close evidence, and uses repository-owned state without unrelated expansion.";
  return [
    `# ${issueId} — Issue Resolution Plan`,
    "",
    "## Accepted Correction Objective", `${prefix}. ${detail}`,
    "## Bounded Scope", `Implement the exact aggregate Issue lifecycle. ${detail}`,
    "## Non-Scope", `Do not implement Issue Close, generic orchestration, or unrelated features. ${detail}`,
    "## Architecture Direction", `Use main-owned repository services, constrained IPC, preload, and React presentation. ${detail}`,
    "## Preservation Requirements", `Keep Fix Card history, bootstrap state, and Development state unchanged. ${detail}`,
    "## Dependencies and Sequencing", `Close current Fix Cards before aggregate validation. ${detail}`,
    "## Risks", `Reject stale evidence and false parentage. ${detail}`,
    "## Validation Strategy", `Exercise service, renderer, wiring, stale-evidence, and isolation behavior. ${detail}`,
    "## Completion Criteria", `The Operator can decide the aggregate Issue outcome from exact current evidence. ${detail}`,
  ].join("\n\n");
}

function validFixCardPlan(issueId, candidates) {
  const detail = "The decomposition is bounded, ordered, evidence-based, preserves closed identities, and leaves lifecycle result state in canonical repository records rather than this plan.";
  return [
    `# ${issueId} — Fix Card Plan`,
    "",
    "## Planning Basis", `${detail} ${detail}`,
    "",
    "## Fix Card Decomposition", `${detail} ${detail}`,
    "",
    "## Fix Card Map",
    "```champcity-fix-card-plan",
    JSON.stringify(candidates, null, 2),
    "```",
    "",
    `${detail} ${detail}`,
  ].join("\n");
}

function writeNormalCloseRecord(root, issueId, fixCardId) {
  const validationRelative = path.join("issues", issueId, "Validation_Records", `VALIDATION_RECORD_${fixCardId}_ATTEMPT01.md`).split(path.sep).join("/");
  const validationAbsolute = path.join(root, validationRelative);
  fs.mkdirSync(path.dirname(validationAbsolute), { recursive: true });
  fs.writeFileSync(validationAbsolute, serializeCanonicalMarkdownDocument({
    schemaVersion: 1,
    artifactType: "validation-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: { issueId, fixCardId, currentImplementationId: fixCardId, attemptNumber: 1 },
    sourceRevisions: [],
    workflowData: { ownerKind: "issue", issueId },
    documentDisposition: { status: "Approved", notes: "Fix Card passed.", reviewedAt: "2026-08-31T00:00:00.000Z" },
  }, `# ${fixCardId} - Fix Card Validation Record\n\nFix Card passed.`), "utf8");
  const closeRelative = path.join("issues", issueId, "Close_Records", `FIX_CARD_CLOSE_RECORD_${fixCardId}.md`).split(path.sep).join("/");
  const closeAbsolute = path.join(root, closeRelative);
  fs.mkdirSync(path.dirname(closeAbsolute), { recursive: true });
  fs.writeFileSync(closeAbsolute, serializeCanonicalMarkdownDocument({
    schemaVersion: 1,
    artifactType: "fix-card-close-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: { issueId, fixCardId, candidateId: fixCardId, currentImplementationId: fixCardId },
    sourceRevisions: [{ path: validationRelative, revision: 1 }],
    workflowData: {
      ownerKind: "issue", issueId, rootFixCardId: fixCardId, currentImplementationId: fixCardId,
      origin: "fix-card-validation", validationRecordPath: validationRelative, returnTarget: "fix-card-map",
    },
    documentDisposition: { status: "Approved", notes: "Closed.", reviewedAt: "2026-08-31T00:00:00.000Z" },
  }, `# ${fixCardId} - Fix Card Close Record\n\nCanonical Fix Card validation close record.`), "utf8");
}

function writeBootstrapCloseRecord(root, issueId, fixCardId) {
  const closeAbsolute = path.join(root, "issues", issueId, "Close_Records", `FIX_CARD_CLOSE_RECORD_${fixCardId}.md`);
  fs.mkdirSync(path.dirname(closeAbsolute), { recursive: true });
  fs.writeFileSync(closeAbsolute, serializeCanonicalMarkdownDocument({
    schemaVersion: 1,
    artifactType: "fix-card-close-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: { issueId, fixCardId, candidateId: fixCardId, currentImplementationId: fixCardId },
    sourceRevisions: [],
    workflowData: {
      ownerKind: "issue", issueId, rootFixCardId: fixCardId, currentImplementationId: fixCardId,
      origin: "bootstrap-cutover", completionBasis: "operator-bootstrap-cutover", returnTarget: "fix-card-map",
    },
    documentDisposition: { status: "Approved", notes: "Bootstrap cutover.", reviewedAt: "2026-08-31T00:00:00.000Z" },
  }, [
    `# ${fixCardId} - Bootstrap Cutover Close Record`,
    "",
    "Operator bootstrap cutover is the completion evidence and does not reconstruct historical validation genealogy.",
  ].join("\n")), "utf8");
}
