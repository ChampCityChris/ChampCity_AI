const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  __setIssueProjectionReadTestHooks,
  applyIssueValidationDecision,
  closeIssue,
  discoverIssueInventory,
  getIssueCloseProjection,
  getIssueResolutionNavigationProjection,
  getIssueValidationProjection,
} = require("../../dist/main/issueResolution/issueResolutionService.js");
const {
  getCurrentWorkspaceModel,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");
const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  prepareApprovedMixedOriginIssue,
  preparedIssue,
  writeBootstrapCloseRecord,
  writeNormalCloseRecord,
} = require("../support/issue-close-fixtures.cjs");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("deep Issue Close projection reads each selected-Issue Markdown path at most once", () => {
  const issueId = "ISSUE_408";
  const root = approvedIssue(issueId);
  let directoryDiscoveries = 0;
  const readsByPath = new Map();
  __setIssueProjectionReadTestHooks({
    onDirectoryDiscovery: () => { directoryDiscoveries += 1; },
    onMarkdownRead: (relativePath) => {
      readsByPath.set(relativePath, (readsByPath.get(relativePath) ?? 0) + 1);
    },
  });

  try {
    const projection = getIssueCloseProjection(root, issueId);
    assert.equal(projection.status, "eligible");
    assert.equal(projection.completedFixCards.length, 2);
    assert.equal(directoryDiscoveries, 1);
    assert.equal(readsByPath.size, 10);
    assert.deepEqual(
      [...readsByPath.entries()].filter(([, count]) => count !== 1),
      [],
    );
  } finally {
    __setIssueProjectionReadTestHooks();
  }
});

test("current nine-card mixed-origin Approved state makes Issue Close available and current", () => {
  const issueId = "ISSUE_409";
  const root = prepareApprovedMixedOriginIssue(issueId);
  const beforeDecision = getIssueValidationProjection(root, issueId);
  applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "The current nine-card aggregate evidence resolves the original Issue.",
    expectedEvidenceSha256: beforeDecision.evidenceSha256,
  });

  const validation = getIssueValidationProjection(root, issueId);
  const close = getIssueCloseProjection(root, issueId);
  const navigation = getIssueResolutionNavigationProjection(root, issueId);

  assert.equal(validation.status, "approved");
  assert.equal(validation.currentRecordState, "readable");
  assert.equal(validation.currentDisposition, "Approved");
  assert.equal(validation.currentDecision, "ValidateResolved");
  assert.equal(validation.currentAttemptNumber, 1);
  assert.equal(validation.completedFixCards.length, 9);
  assert.deepEqual(
    validation.completedFixCards.map((entry) => entry.closeRecordOrigin),
    [
      "bootstrap-cutover",
      "bootstrap-cutover",
      "bootstrap-cutover",
      "bootstrap-cutover",
      "bootstrap-cutover",
      "fix-card-validation",
      "bootstrap-cutover",
      "fix-card-validation",
      "fix-card-validation",
    ],
  );
  assert.equal(fs.existsSync(issueClosePath(root, issueId)), false);
  assert.equal(close.status, "eligible");
  assert.equal(close.canCloseIssue, true);
  assert.equal(close.validationBasis.recordPath, validation.currentRecordPath);
  assert.equal(close.validationBasis.aggregateEvidenceSha256, validation.evidenceSha256);
  assert.equal(navigation.issueValidationAvailable, true);
  assert.equal(navigation.issueCloseAvailable, true);
  assert.equal(navigation.currentStageId, "issue-close");
  assert.deepEqual(
    navigation.stages.find((stage) => stage.stageId === "issue-close"),
    {
      available: true,
      reason: close.statusMessage,
      stageId: "issue-close",
      stateLabel: "Ready to Close",
    },
  );
});

test("Issue Close remains unavailable before exact current Approved ValidateResolved aggregate basis", () => {
  const root = preparedIssue("ISSUE_401", 2);
  writeNormalCloseRecord(root, "ISSUE_401", "ISSUE_401-FC01");
  writeBootstrapCloseRecord(root, "ISSUE_401", "ISSUE_401-FC02");

  const blocked = getIssueCloseProjection(root, "ISSUE_401");
  assert.equal(blocked.status, "blocked-validation-not-approved");
  assert.equal(blocked.canCloseIssue, false);
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_401").issueCloseAvailable, false);
  assert.throws(
    () => closeIssue(root, "ISSUE_401", { expectedValidationBasisSha256: "a".repeat(64) }),
    /Approved aggregate Issue Validation with decision ValidateResolved/,
  );
  assert.equal(fs.existsSync(issueClosePath(root, "ISSUE_401")), false);

  const validation = getIssueValidationProjection(root, "ISSUE_401");
  applyIssueValidationDecision(root, "ISSUE_401", {
    decision: "RequestCorrectiveWork",
    operatorNotes: "The exact aggregate result still exposes a bounded unresolved outcome.",
    boundedCorrectiveWork: "Add one bounded corrective Fix Card that resolves the remaining exact aggregate outcome without changing Development state.",
    expectedEvidenceSha256: validation.evidenceSha256,
  });
  const revisionRequested = getIssueCloseProjection(root, "ISSUE_401");
  assert.equal(revisionRequested.status, "blocked-validation-not-approved");
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_401").currentStageId, "issue-planning");
  assert.equal(fs.existsSync(issueClosePath(root, "ISSUE_401")), false);
});

test("Issue Close exposes exact FC08 evidence and rejects a stale reviewed basis hash without writing", () => {
  const root = approvedIssue("ISSUE_402");
  const eligible = getIssueCloseProjection(root, "ISSUE_402");

  assert.equal(eligible.status, "eligible");
  assert.equal(eligible.workflowStatus.stateLabel, "Ready to Close");
  assert.equal(eligible.validationBasis.decision, "ValidateResolved");
  assert.equal(eligible.validationBasis.disposition, "Approved");
  assert.deepEqual(eligible.completedFixCards.map((entry) => entry.closeRecordOrigin), ["fix-card-validation", "bootstrap-cutover"]);
  assert.equal(eligible.sourceEvidence.at(-1).label, "Approved Aggregate Issue Validation");
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_402").currentStageId, "issue-close");

  fs.appendFileSync(path.join(root, "issues", "ISSUE_402", "ISSUE_RESOLUTION_PLAN.md"), "\n\nChanged after workspace review.\n", "utf8");
  assert.throws(
    () => closeIssue(root, "ISSUE_402", { expectedValidationBasisSha256: eligible.validationBasisSha256 }),
    /Approved aggregate Issue Validation|record changed/,
  );
  assert.equal(fs.existsSync(issueClosePath(root, "ISSUE_402")), false);
  assert.equal(getIssueCloseProjection(root, "ISSUE_402").canCloseIssue, false);
});

test("Issue Close writes one canonical Issue-owned terminal record and reconstructs Closed without overwrite", () => {
  const root = approvedIssue("ISSUE_403");
  const eligible = getIssueCloseProjection(root, "ISSUE_403");
  const before = repositoryFileFingerprints(path.join(root, "issues", "ISSUE_403"));
  const result = closeIssue(root, "ISSUE_403", { expectedValidationBasisSha256: eligible.validationBasisSha256 });
  const closePath = issueClosePath(root, "ISSUE_403");

  assert.equal(result.projection.status, "closed");
  assert.equal(result.projection.canCloseIssue, false);
  assert.equal(result.projection.closeRecord.state, "readable");
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_403").currentStageId, "issue-close");
  const bytes = fs.readFileSync(closePath);
  const record = parseCanonicalMarkdownDocument(bytes.toString("utf8"));
  assert.equal(record.metadata.artifactType, "issue-close-record");
  assert.deepEqual(record.metadata.identity, { issueId: "ISSUE_403" });
  assert.equal(record.metadata.workflowData.ownerKind, "issue");
  assert.equal(record.metadata.workflowData.stageId, "issue-close");
  assert.equal(record.metadata.workflowData.closureState, "Closed");
  assert.equal(record.metadata.workflowData.returnTarget, "workflow-hub");
  assert.equal(record.metadata.workflowData.validationDecision, "ValidateResolved");
  assert.equal(record.metadata.workflowData.validationBasisSha256, eligible.validationBasisSha256);
  assert.equal("authoritySha256" in record.metadata.workflowData, false);
  assert.equal(record.metadata.documentDisposition.status, "Approved");
  for (const forbidden of ["phaseId", "workCardId", "parentWorkCardId", "fixCardId", "rootFixCardId", "repairId", "parentImplementationId"]) {
    assert.equal(record.metadata.identity[forbidden], undefined);
    assert.equal(record.metadata.workflowData[forbidden], undefined);
  }
  assert.match(record.bodyMarkdown, /the final Issue-level close record only/);
  assert.equal(record.metadata.sourceRevisions.at(-1).path, eligible.validationBasis.recordPath);
  assert.equal(record.metadata.workflowData.sourceFingerprints.at(-1).sha256, eligible.validationBasis.recordSha256);

  const after = repositoryFileFingerprints(path.join(root, "issues", "ISSUE_403"));
  assert.deepEqual(
    [...after.entries()].filter(([relative]) => relative !== "Close_Records/ISSUE_CLOSE_RECORD_ISSUE_403.md"),
    [...before.entries()],
  );
  assert.throws(
    () => closeIssue(root, "ISSUE_403", { expectedValidationBasisSha256: eligible.validationBasisSha256 }),
    /already exists and will not be overwritten/,
  );
  assert.deepEqual(fs.readFileSync(closePath), bytes);
  assert.equal(getIssueCloseProjection(root, "ISSUE_403").status, "closed");

  fs.appendFileSync(path.join(root, "issues", "ISSUE_403", "FIX_CARD_PLAN.md"), "\n\nConflicting post-close change.\n", "utf8");
  const stale = getIssueCloseProjection(root, "ISSUE_403");
  assert.equal(stale.status, "needs-attention");
  assert.equal(stale.closeRecord.state, "read-error");
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_403").currentStageId, "issue-close");
  assert.deepEqual(fs.readFileSync(closePath), bytes);
});

test("legacy V1 Issue close basis fields and headings read into canonical projections without dual-writing", () => {
  const issueId = "ISSUE_410";
  const root = preparedIssue(issueId, 2);
  const normalFixCardId = `${issueId}-FC01`;
  const bootstrapFixCardId = `${issueId}-FC02`;
  writeNormalCloseRecord(root, issueId, normalFixCardId);
  writeBootstrapCloseRecord(root, issueId, bootstrapFixCardId);

  const bootstrapPath = path.join(root, "issues", issueId, "Close_Records", `FIX_CARD_CLOSE_RECORD_${bootstrapFixCardId}.md`);
  const bootstrap = parseCanonicalMarkdownDocument(fs.readFileSync(bootstrapPath, "utf8"));
  bootstrap.metadata.workflowData.completionAuthority = bootstrap.metadata.workflowData.completionBasis;
  delete bootstrap.metadata.workflowData.completionBasis;
  fs.writeFileSync(bootstrapPath, serializeCanonicalMarkdownDocument(bootstrap.metadata, bootstrap.bodyMarkdown), "utf8");

  const validationBefore = getIssueValidationProjection(root, issueId);
  const decision = applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "Legacy V1 bootstrap close input remains readable through the bounded compatibility parser.",
    expectedEvidenceSha256: validationBefore.evidenceSha256,
  });
  const validationPath = path.join(root, decision.projection.currentRecordPath);
  const validation = parseCanonicalMarkdownDocument(fs.readFileSync(validationPath, "utf8"));
  validation.bodyMarkdown = validation.bodyMarkdown.replace(
    "## Completed Fix Card Close Records",
    "## Completed Fix Card Close Authority",
  );
  fs.writeFileSync(validationPath, serializeCanonicalMarkdownDocument(validation.metadata, validation.bodyMarkdown), "utf8");

  const eligible = getIssueCloseProjection(root, issueId);
  assert.equal(eligible.status, "eligible");
  assert.ok(eligible.validationBasisSha256);
  closeIssue(root, issueId, { expectedValidationBasisSha256: eligible.validationBasisSha256 });

  const closePath = issueClosePath(root, issueId);
  const closeRecord = parseCanonicalMarkdownDocument(fs.readFileSync(closePath, "utf8"));
  closeRecord.metadata.workflowData.authoritySha256 = closeRecord.metadata.workflowData.validationBasisSha256;
  delete closeRecord.metadata.workflowData.validationBasisSha256;
  closeRecord.bodyMarkdown = closeRecord.bodyMarkdown.replace(
    "## Exact Closure Source Evidence",
    "## Exact Closure Source Authority",
  );
  fs.writeFileSync(closePath, serializeCanonicalMarkdownDocument(closeRecord.metadata, closeRecord.bodyMarkdown), "utf8");

  const reconstructed = getIssueCloseProjection(root, issueId);
  assert.equal(reconstructed.status, "closed");
  assert.equal(reconstructed.closeRecord.validationBasisSha256, eligible.validationBasisSha256);
  assert.equal("authoritySha256" in reconstructed.closeRecord, false);
});

test("malformed or wrong-Issue terminal record remains visible Needs Attention and is never replaced", () => {
  const root = approvedIssue("ISSUE_404");
  const closePath = issueClosePath(root, "ISSUE_404");
  fs.mkdirSync(path.dirname(closePath), { recursive: true });
  fs.writeFileSync(closePath, "not canonical Issue close record", "utf8");
  const original = fs.readFileSync(closePath);

  const malformed = getIssueCloseProjection(root, "ISSUE_404");
  assert.equal(malformed.status, "needs-attention");
  assert.equal(malformed.canCloseIssue, false);
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_404").currentStageId, "issue-close");
  assert.throws(
    () => closeIssue(root, "ISSUE_404", { expectedValidationBasisSha256: malformed.validationBasisSha256 }),
    /needs attention and will not be replaced/,
  );
  assert.deepEqual(fs.readFileSync(closePath), original);

  const wrongRoot = approvedIssue("ISSUE_407");
  const eligible = getIssueCloseProjection(wrongRoot, "ISSUE_407");
  closeIssue(wrongRoot, "ISSUE_407", { expectedValidationBasisSha256: eligible.validationBasisSha256 });
  const wrongPath = issueClosePath(wrongRoot, "ISSUE_407");
  const wrongRecord = parseCanonicalMarkdownDocument(fs.readFileSync(wrongPath, "utf8"));
  wrongRecord.metadata.identity.issueId = "ISSUE_999";
  fs.writeFileSync(wrongPath, serializeCanonicalMarkdownDocument(wrongRecord.metadata, wrongRecord.bodyMarkdown), "utf8");
  const wrongIssue = getIssueCloseProjection(wrongRoot, "ISSUE_407");
  const wrongBytes = fs.readFileSync(wrongPath);
  assert.equal(wrongIssue.status, "needs-attention");
  assert.match(wrongIssue.closeRecord.readError, /identity.*invalid/i);
  assert.throws(
    () => closeIssue(wrongRoot, "ISSUE_407", { expectedValidationBasisSha256: eligible.validationBasisSha256 }),
    /already exists and will not be overwritten/,
  );
  assert.deepEqual(fs.readFileSync(wrongPath), wrongBytes);
});

test("final Issue closure leaves inventory, another Issue, and repository-derived Development state unchanged", () => {
  const root = tempWorkspace("champcity-issue-close-development-");
  seedDevelopmentState(root);
  approvedIssue("ISSUE_405", root);
  const otherRoot = preparedIssue("ISSUE_406", 1, root);
  assert.equal(otherRoot, root);
  writeNormalCloseRecord(root, "ISSUE_406", "ISSUE_406-FC01");
  const beforeDevelopmentModel = getCurrentWorkspaceModel(root);
  const beforeCurrentDocument = resolveFirstNonApprovedDocument(root);
  const otherBefore = getIssueResolutionNavigationProjection(root, "ISSUE_406");

  const eligible = getIssueCloseProjection(root, "ISSUE_405");
  closeIssue(root, "ISSUE_405", { expectedValidationBasisSha256: eligible.validationBasisSha256 });

  assert.deepEqual(getCurrentWorkspaceModel(root), beforeDevelopmentModel);
  assert.deepEqual(resolveFirstNonApprovedDocument(root), beforeCurrentDocument);
  assert.deepEqual(getIssueResolutionNavigationProjection(root, "ISSUE_406"), otherBefore);
  assert.deepEqual(discoverIssueInventory(root).issues.map((issue) => issue.issueId), ["ISSUE_405", "ISSUE_406"]);
  assert.equal(getIssueCloseProjection(root, "ISSUE_405").status, "closed");
  assert.equal(getIssueCloseProjection(root, "ISSUE_406").status, "blocked-validation-not-approved");
});

function approvedIssue(issueId, existingRoot) {
  const root = preparedIssue(issueId, 2, existingRoot);
  writeNormalCloseRecord(root, issueId, `${issueId}-FC01`);
  writeBootstrapCloseRecord(root, issueId, `${issueId}-FC02`);
  const validation = getIssueValidationProjection(root, issueId);
  applyIssueValidationDecision(root, issueId, {
    decision: "ValidateResolved",
    operatorNotes: "The exact current aggregate evidence resolves the original Issue.",
    expectedEvidenceSha256: validation.evidenceSha256,
  });
  return root;
}

function seedDevelopmentState(root) {
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "issue-close-development");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "issue-close-development" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  seedApprovedProjectPlanning(root, "issue-close-development");
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_issue-close-development.md", "phase-map", "Approved", {
    workflowData: {
      phases: [{
        phaseId: "phase-01",
        title: "Preserved Development Phase",
        order: 1,
        purpose: "Provide stable repository-derived Development state.",
        dependsOn: [],
        sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
      }],
    },
  });
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
}

function issueClosePath(root, issueId) {
  return path.join(root, "issues", issueId, "Close_Records", `ISSUE_CLOSE_RECORD_${issueId}.md`);
}

function repositoryFileFingerprints(directory) {
  const result = new Map();
  for (const absolute of walkFiles(directory)) {
    result.set(path.relative(directory, absolute).split(path.sep).join("/"), crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex"));
  }
  return result;
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : entry.isFile() ? [absolute] : [];
  });
}
