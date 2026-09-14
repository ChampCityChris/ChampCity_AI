const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  applyIssueValidationDecision,
  closeIssue,
  getIssueCloseProjection,
  getIssueResolutionNavigationProjection,
  getIssueValidationProjection,
} = require("../../dist/main/issueResolution/issueResolutionService.js");
const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  preparedIssue,
  writeBootstrapCloseRecord,
  writeNormalCloseRecord,
} = require("../support/issue-close-fixtures.cjs");

/*
 * Characterization boundary:
 * Issue Resolution remains repository-derived. Per-Fix-Card close record is
 * required before aggregate validation; aggregate Operator validation is
 * required before final Issue close; final close is an explicit operation.
 */

test("Desktop Issue lifecycle requires all Fix Cards closed, aggregate Operator validation, then explicit Issue close", () => {
  const issueId = "ISSUE_901";
  const root = preparedIssue(issueId, 2);
  const closePath = issueClosePath(root, issueId);

  writeNormalCloseRecord(root, issueId, `${issueId}-FC01`);
  let validation = getIssueValidationProjection(root, issueId);
  assert.equal(validation.status, "blocked-fix-cards-incomplete");
  assert.equal(validation.eligible, false);
  assert.equal(validation.completedFixCards.length, 1);
  assert.equal(getIssueResolutionNavigationProjection(root, issueId).issueValidationAvailable, false);
  assert.equal(fs.existsSync(closePath), false);

  assert.throws(() => applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "Incomplete Fix Cards cannot establish aggregate basis.",
    expectedEvidenceSha256: validation.evidenceSha256,
  }), /close record for every current Fix Card Plan candidate/);
  assert.equal(fs.existsSync(issueValidationPath(root, issueId)), false);

  writeBootstrapCloseRecord(root, issueId, `${issueId}-FC02`);
  validation = getIssueValidationProjection(root, issueId);
  assert.equal(validation.status, "eligible");
  assert.equal(validation.eligible, true);
  assert.equal(validation.completedFixCards.length, 2);
  assert.equal(getIssueResolutionNavigationProjection(root, issueId).currentStageId, "issue-validation");

  const closeBeforeValidation = getIssueCloseProjection(root, issueId);
  assert.equal(closeBeforeValidation.status, "blocked-validation-not-approved");
  assert.equal(closeBeforeValidation.canCloseIssue, false);
  assert.throws(
    () => closeIssue(root, issueId, { expectedValidationBasisSha256: "0".repeat(64) }),
    /Approved aggregate Issue Validation with decision ValidateResolved/,
  );
  assert.equal(fs.existsSync(closePath), false);

  const decision = applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "Characterization: the current aggregate evidence resolves the Issue.",
    expectedEvidenceSha256: validation.evidenceSha256,
  });
  assert.equal(decision.projection.status, "approved");
  assert.equal(decision.postMutation.navigation.currentStageId, "issue-close");
  assert.equal(fs.existsSync(closePath), false, "aggregate validation must not silently close the parent Issue");
  const validationBytes = fs.readFileSync(path.join(root, decision.projection.currentRecordPath), "utf8");
  const validationRecord = parseCanonicalMarkdownDocument(validationBytes);
  assert.equal(validationRecord.metadata.artifactType, "issue-validation-record");
  assert.equal(validationRecord.metadata.identity.issueId, issueId);
  assert.equal(validationRecord.metadata.identity.fixCardId, undefined);
  assert.equal(validationRecord.metadata.workflowData.decision, "ValidateResolved");
  assert.throws(() => applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "A finalized decision must not be replaced.",
    expectedEvidenceSha256: decision.projection.evidenceSha256,
  }), /finalized Issue Validation decision already exists/);
  assert.equal(fs.readFileSync(path.join(root, decision.projection.currentRecordPath), "utf8"), validationBytes);

  const closeState = getIssueCloseProjection(root, issueId);
  assert.equal(closeState.status, "eligible");
  assert.equal(closeState.canCloseIssue, true);
  assert.equal(closeState.validationBasis.recordPath, decision.projection.currentRecordPath);
  assert.equal(closeState.validationBasis.aggregateEvidenceSha256, decision.projection.evidenceSha256);

  const closed = closeIssue(root, issueId, { expectedValidationBasisSha256: closeState.validationBasisSha256 });
  assert.equal(closed.projection.status, "closed");
  assert.equal(closed.projection.canCloseIssue, false);
  assert.equal(fs.existsSync(closePath), true);

  const closeRecord = parseCanonicalMarkdownDocument(fs.readFileSync(closePath, "utf8"));
  assert.equal(closeRecord.metadata.artifactType, "issue-close-record");
  assert.equal(closeRecord.metadata.identity.issueId, issueId);
  assert.equal(getIssueResolutionNavigationProjection(root, issueId).currentStageId, "issue-close");
  const closeBytes = fs.readFileSync(closePath, "utf8");
  assert.equal(getIssueCloseProjection(root, issueId).status, "closed", "fresh projections reconstruct durable closure");
  assert.throws(() => closeIssue(root, issueId, {
    expectedValidationBasisSha256: closeState.validationBasisSha256,
  }), /already exists and will not be overwritten/);
  assert.equal(fs.readFileSync(closePath, "utf8"), closeBytes);
});

test("Desktop Issue validation and close reject stale reviewed evidence without creating close state", () => {
  const issueId = "ISSUE_903";
  const root = preparedIssue(issueId, 1);
  writeNormalCloseRecord(root, issueId, `${issueId}-FC01`);
  const reviewed = getIssueValidationProjection(root, issueId);
  const planPath = path.join(root, "issues", issueId, "ISSUE_RESOLUTION_PLAN.md");
  fs.appendFileSync(planPath, "\n\nCurrent aggregate evidence clarification.\n", "utf8");
  assert.throws(() => applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "The reviewed evidence is now stale.",
    expectedEvidenceSha256: reviewed.evidenceSha256,
  }), /evidence changed after the workspace was loaded/);
  assert.equal(fs.existsSync(issueValidationPath(root, issueId)), false);

  const refreshed = getIssueValidationProjection(root, issueId);
  assert.notEqual(refreshed.evidenceSha256, reviewed.evidenceSha256);
  const decision = applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "The refreshed evidence resolves the Issue.",
    expectedEvidenceSha256: refreshed.evidenceSha256,
  });
  const close = getIssueCloseProjection(root, issueId);
  assert.equal(close.canCloseIssue, true);
  assert.throws(() => closeIssue(root, issueId, {
    expectedValidationBasisSha256: "0".repeat(64),
  }), /record changed after the workspace was loaded/);
  assert.equal(fs.existsSync(issueClosePath(root, issueId)), false);

  const validationPath = path.join(root, decision.projection.currentRecordPath);
  const validationBytes = fs.readFileSync(validationPath, "utf8");
  fs.appendFileSync(planPath, "\n\nEvidence changed after aggregate approval.\n", "utf8");
  assert.equal(getIssueCloseProjection(root, issueId).canCloseIssue, false);
  assert.throws(() => closeIssue(root, issueId, {
    expectedValidationBasisSha256: close.validationBasisSha256,
  }), /Approved aggregate Issue Validation|record changed/);
  assert.equal(fs.existsSync(issueClosePath(root, issueId)), false);
  assert.equal(fs.readFileSync(validationPath, "utf8"), validationBytes);
});

test("Desktop Issue validation rejects a Fix Card close record with mismatched validation revision", () => {
  const issueId = "ISSUE_904";
  const root = preparedIssue(issueId, 1);
  writeNormalCloseRecord(root, issueId, `${issueId}-FC01`);
  assert.equal(getIssueValidationProjection(root, issueId).eligible, true);
  const closePath = path.join(root, "issues", issueId, "Close_Records", `FIX_CARD_CLOSE_RECORD_${issueId}-FC01.md`);
  const record = parseCanonicalMarkdownDocument(fs.readFileSync(closePath, "utf8"));
  record.metadata.sourceRevisions[0].revision += 1;
  fs.writeFileSync(closePath, serializeCanonicalMarkdownDocument(record.metadata, record.bodyMarkdown), "utf8");

  const invalid = getIssueValidationProjection(root, issueId);
  assert.equal(invalid.eligible, false);
  assert.equal(invalid.completedFixCards.length, 0);
  assert.equal(getIssueResolutionNavigationProjection(root, issueId).issueValidationAvailable, false);
  assert.throws(() => applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "A close filename alone is not a valid close record.",
    expectedEvidenceSha256: invalid.evidenceSha256,
  }), /close record for every current Fix Card Plan candidate/);
  assert.equal(fs.existsSync(issueValidationPath(root, issueId)), false);
});

function issueValidationPath(root, issueId) {
  return path.join(root, "issues", issueId, "Validation_Records", `ISSUE_VALIDATION_RECORD_${issueId}_ATTEMPT01.md`);
}

test("Desktop Issue corrective-work decision returns workflow state to Issue Planning instead of manufacturing close record", () => {
  const issueId = "ISSUE_902";
  const root = preparedIssue(issueId, 1);
  writeNormalCloseRecord(root, issueId, `${issueId}-FC01`);

  const validation = getIssueValidationProjection(root, issueId);
  assert.equal(validation.status, "eligible");

  applyIssueValidationDecision(root, issueId, {
    decision: "RequestCorrectiveWork",
    operatorNotes: "Characterization: one bounded corrective action remains.",
    boundedCorrectiveWork: "Add bounded corrective work without changing Development state.",
    expectedEvidenceSha256: validation.evidenceSha256,
  });

  const close = getIssueCloseProjection(root, issueId);
  assert.equal(close.status, "blocked-validation-not-approved");
  assert.equal(close.canCloseIssue, false);
  assert.equal(getIssueResolutionNavigationProjection(root, issueId).currentStageId, "issue-planning");
  assert.equal(fs.existsSync(issueClosePath(root, issueId)), false);
});

function issueClosePath(root, issueId) {
  return path.join(root, "issues", issueId, "Close_Records", `ISSUE_CLOSE_RECORD_${issueId}.md`);
}
