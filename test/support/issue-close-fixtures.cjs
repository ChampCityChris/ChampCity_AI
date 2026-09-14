const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  applyIssueArchitectReview,
  applyIssuePlanningReview,
} = require("../../dist/main/issueResolution/issueResolutionService.js");
const {
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");

function preparedIssue(issueId, candidateCount = 2, existingRoot) {
  const root = existingRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "champcity-issue-close-"));
  const issueRoot = path.join(root, "issues", issueId);
  fs.mkdirSync(issueRoot, { recursive: true });
  fs.writeFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), [
    `# ${issueId} - Final Issue Close Test`,
    "",
    "## Issue",
    "The selected project needs final repository-owned Issue closure without changing Development lifecycle state.",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(issueRoot, "ARCHITECT_INVESTIGATION.md"), validInvestigation(issueId), "utf8");
  applyIssueArchitectReview(root, issueId, { disposition: "Approved", operatorNotes: "Accepted Issue architecture." });
  fs.writeFileSync(path.join(issueRoot, "ISSUE_RESOLUTION_PLAN.md"), validIssueResolutionPlan(issueId), "utf8");
  fs.writeFileSync(path.join(issueRoot, "FIX_CARD_PLAN.md"), validFixCardPlan(issueId, candidateList(issueId, candidateCount)), "utf8");
  applyIssuePlanningReview(root, issueId, { disposition: "Approved", operatorNotes: "Approved bounded Fix Card plan." });
  return root;
}

function candidateList(issueId, count) {
  return Array.from({ length: count }, (_, index) => ({
    fixCardId: `${issueId}-FC${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    title: index === 0 ? "Repository close foundation" : "Lifecycle preservation proof",
    purpose: index === 0
      ? "Establish exact repository-owned closure evidence for the selected Issue."
      : "Prove final Issue closure preserves established repository-derived lifecycle state.",
    dependsOn: index === 0 ? [] : [`${issueId}-FC${String(index).padStart(2, "0")}`],
    evidencePaths: [`issues/${issueId}/ISSUE_RECORD.md`, `issues/${issueId}/FIX_CARD_PLAN.md`],
  }));
}

function validInvestigation(issueId) {
  return [
    `# ${issueId} - Architect Investigation`,
    "",
    "## Purpose", "Confirm bounded Issue closure architecture.",
    "## Issue Assessment", "Repository evidence confirms a bounded project-owned correction.",
    "## Repository Evidence Inspected", "Current Issue, source, and tests were inspected.",
    "## Confirmed Current Architecture", "Issue Resolution is separate from Development state.",
    "## Root Cause", "Final parent-Issue closure state is absent.",
    "## Required Architecture", "Use exact repository evidence and an Issue-owned terminal record.",
    "## Preservation Rules", "Preserve Development and Fix Card lifecycle state.",
    "## Risks and Constraints", "Do not create false Repair or Development parentage.",
    "## Architect Recommendation", "Proceed in Issue Resolution",
    "## Architect Conclusion", "Proceed with bounded Issue Planning.",
  ].join("\n\n");
}

function validIssueResolutionPlan(issueId) {
  const detail = "This section remains bounded to the accepted Issue, preserves Development state and prior close evidence, and uses repository-owned state without unrelated expansion.";
  return [
    `# ${issueId} \u2014 Issue Resolution Plan`,
    "",
    "## Accepted Correction Objective", `Implement the accepted correction. ${detail}`,
    "## Bounded Scope", `Implement the exact parent-Issue lifecycle. ${detail}`,
    "## Non-Scope", `Do not implement generic orchestration or unrelated features. ${detail}`,
    "## Architecture Direction", `Use main-owned repository services, constrained IPC, preload, and React presentation. ${detail}`,
    "## Preservation Requirements", `Keep Fix Card history and Development state unchanged. ${detail}`,
    "## Dependencies and Sequencing", `Close current Fix Cards before aggregate validation and final Issue closure. ${detail}`,
    "## Risks", `Reject stale evidence, overwrite attempts, and false parentage. ${detail}`,
    "## Validation Strategy", `Exercise service, renderer, wiring, stale-evidence, and isolation behavior. ${detail}`,
    "## Completion Criteria", `The Operator can close the Issue once from exact current Approved validation. ${detail}`,
  ].join("\n\n");
}

function validFixCardPlan(issueId, candidates) {
  const detail = "The decomposition is bounded, ordered, evidence-based, preserves closed identities, and leaves lifecycle state in canonical repository records rather than this plan.";
  return [
    `# ${issueId} \u2014 Fix Card Plan`,
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
  writeFixCardCloseRecord(root, issueId, fixCardId, "fix-card-validation", [{ path: validationRelative, revision: 1 }], validationRelative);
}

function writeBootstrapCloseRecord(root, issueId, fixCardId) {
  writeFixCardCloseRecord(root, issueId, fixCardId, "bootstrap-cutover", [], undefined);
}

function writeFixCardCloseRecord(root, issueId, fixCardId, origin, sourceRevisions, validationRecordPath) {
  const closeRelative = path.join("issues", issueId, "Close_Records", `FIX_CARD_CLOSE_RECORD_${fixCardId}.md`).split(path.sep).join("/");
  const closeAbsolute = path.join(root, closeRelative);
  fs.mkdirSync(path.dirname(closeAbsolute), { recursive: true });
  fs.writeFileSync(closeAbsolute, serializeCanonicalMarkdownDocument({
    schemaVersion: 1,
    artifactType: "fix-card-close-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: { issueId, fixCardId, candidateId: fixCardId, currentImplementationId: fixCardId },
    sourceRevisions,
    workflowData: {
      ownerKind: "issue",
      issueId,
      rootFixCardId: fixCardId,
      currentImplementationId: fixCardId,
      origin,
      ...(origin === "bootstrap-cutover" ? { completionBasis: "operator-bootstrap-cutover" } : {}),
      ...(validationRecordPath ? { validationRecordPath } : {}),
      returnTarget: "fix-card-map",
    },
    documentDisposition: { status: "Approved", notes: "Closed.", reviewedAt: "2026-08-31T00:00:00.000Z" },
  }, origin === "bootstrap-cutover"
    ? `# ${fixCardId} - Bootstrap Cutover Close Record\n\nOperator bootstrap cutover is the completion evidence and does not reconstruct historical validation genealogy.`
    : `# ${fixCardId} - Fix Card Close Record\n\nCanonical Fix Card validation close record.`), "utf8");
}

function prepareApprovedMixedOriginIssue(issueId, existingRoot) {
  const root = preparedIssue(issueId, 9, existingRoot);
  const validationBackedFixCards = new Set([6, 8, 9]);
  for (let index = 1; index <= 9; index += 1) {
    const fixCardId = `${issueId}-FC${String(index).padStart(2, "0")}`;
    if (validationBackedFixCards.has(index)) {
      writeNormalCloseRecord(root, issueId, fixCardId);
    } else {
      writeBootstrapCloseRecord(root, issueId, fixCardId);
    }
  }
  return root;
}

module.exports = {
  prepareApprovedMixedOriginIssue,
  preparedIssue,
  writeBootstrapCloseRecord,
  writeNormalCloseRecord,
};
