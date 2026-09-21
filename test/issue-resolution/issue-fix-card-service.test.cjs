const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  applyIssueArchitectReview,
  applyIssueFixCardContractReview,
  applyIssueFixCardValidationDecision,
  closeIssueFixCard,
  applyIssuePlanningReview,
  __setIssueProjectionReadTestHooks,
  getIssueFixCardProjection,
  getIssueResolutionNavigationProjection,
  prepareIssueFixCardPlanningHandoff,
  prepareIssueFixCardRepairHandoff,
  promoteIssueFixCardRepairDraft,
  promoteIssuePlanningDraftBundle,
  reserveIssueFixCardImplementerReport,
  resolveIssueFixCardCodexExecutionContext,
  resolveIssueFixCardAdvisoryReviewPrompt,
  resolveIssueFixCardPlanningCopyHandoff,
  resolveIssueFixCardRepairCopyHandoff,
  selectIssueFixCardCandidate,
} = require("../../dist/main/issueResolution/issueResolutionService.js");
const {
  inspectControlledMarkdownDraft,
  replaceControlledMarkdownBody,
} = require("../../dist/main/agentHarness/repository/controlledMarkdownDrafts.js");
const {
  __setCanonicalMarkdownWriterTestHooks,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  buildCodexImplementerPrompt,
} = require("../../dist/main/workCardBuilding/codexImplementerExecutionService.js");
const {
  buildImplementationValidationScopeGuidance,
} = require("../../dist/main/validation/implementationValidationScopeGuidance.js");

test("Fix Card planning handoff applies shared validation scope guidance without disturbing controlled context", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_069");
  selectIssueFixCardCandidate(root, "ISSUE_069", "ISSUE_069-FC01", "planning");

  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_069", "planning");
  const submission = prepared.projection.activePlanningSubmission;
  const instruction = submission.preparedInstruction;
  const expectedValidationGuidance = buildImplementationValidationScopeGuidance("fix-card");
  const validationGuidanceStart = instruction.indexOf(expectedValidationGuidance[0]);
  const requiredSectionsStart = instruction.indexOf("Required body-only Markdown sections:");

  assert.notEqual(validationGuidanceStart, -1);
  assert.ok(requiredSectionsStart > validationGuidanceStart);
  assert.match(instruction, /- ## In-Scope Surface/);
  assert.doesNotMatch(instruction, /- ## Authorized Surface/);
  assert.equal(
    instruction.slice(validationGuidanceStart, requiredSectionsStart),
    `${expectedValidationGuidance.join("\n")}\n`,
  );
  const renderedGuidance = instruction.slice(validationGuidanceStart, requiredSectionsStart);
  assert.doesNotMatch(renderedGuidance, /(?:^|\n)(?:Phase ID|Work Card ID|Parent Work Card ID):/i);
  assert.doesNotMatch(renderedGuidance, /\b(?:phaseId|phaseRevision|workCardId|parentWorkCardId)\s*[:=]/);
  assert.match(instruction, /Selected Issue\/Fix Card context:/);
  assert.match(instruction, /Issue ID: ISSUE_069/);
  assert.match(instruction, /Fix Card ID: ISSUE_069-FC01/);
  assert.match(instruction, new RegExp(`Controlled Fix Card draft path: ${submission.temporaryDraftPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(instruction, /Write only the Markdown body of the existing application-controlled Fix Card draft/);
  assert.match(instruction, /artifact_toolbox\.replace_markdown_body/);
  assert.match(instruction, new RegExp(submission.metadataSha256));
  assert.match(instruction, new RegExp(submission.bodySha256));
});

test("Issue Fix Card selection, draft promotion, approval, report reservation, and Codex context stay Issue-owned", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_070");

  const unselected = getIssueFixCardProjection(root, "ISSUE_070", "fix-card-map");
  assert.equal(unselected.status, "candidate-selection-required");
  assert.equal(unselected.canSelectCandidate, true);
  assert.throws(
    () => selectIssueFixCardCandidate(root, "ISSUE_070", "ISSUE_070-FC99"),
    /not present in the current validated Fix Card Map/,
  );

  const selected = selectIssueFixCardCandidate(root, "ISSUE_070", "ISSUE_070-FC01", "planning").projection;
  assert.equal(selected.selectedCandidate.fixCardId, "ISSUE_070-FC01");
  assert.equal(selected.currentStep, "planning");
  assert.equal(selected.stepAvailability.find((step) => step.stepId === "planning").available, true);

  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_070", "planning");
  assert.equal(fs.existsSync(path.join(root, prepared.projection.controlledDraftPath)), true);
  writeControlledFixCardDraft(root, prepared, validFixCardContract("ISSUE_070-FC01"));

  const reviewable = getIssueFixCardProjection(root, "ISSUE_070", "planning");
  assert.equal(reviewable.status, "planning-draft-ready");
  assert.equal(reviewable.contractState, "readable");
  assert.equal(reviewable.contractDisposition, "Pending");
  assert.match(reviewable.contractPath, /^issues\/Architect_Drafts\/[^/]+\/fix-card-contract\.md$/);
  const controlledDraft = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, reviewable.contractPath), "utf8"),
  );
  assert.equal(controlledDraft.metadata.artifactType, "fix-card-draft");
  assert.equal(controlledDraft.metadata.identity.issueId, "ISSUE_070");
  assert.equal(controlledDraft.metadata.identity.fixCardId, "ISSUE_070-FC01");
  assert.equal(controlledDraft.metadata.workflowData.finalFixCardTarget, reviewable.finalContractPath);
  assert.equal(controlledDraft.metadata.workflowData.implementerReportTarget, reviewable.implementerReportPath);

  const approvalResult = applyIssueFixCardContractReview(root, "ISSUE_070", {
    disposition: "Approved",
    operatorNotes: "Approved for implementation.",
    expectedReviewedBodySha256: reviewable.controlledDraftBodySha256,
  }, "implement");
  const approved = approvalResult.projection;
  assert.equal(approvalResult.postMutation.navigation.currentStageId, "fix-cards");
  assert.equal(approved.contractDisposition, "Approved");
  assert.match(approved.contractPath, /^issues\/ISSUE_070\/Fix_Cards\/ISSUE_070-FC01_/);
  assert.equal(approved.implementerReportState, "readable");
  assert.equal(approved.implementerReportReadiness, "reserved-skeleton");
  const contract = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, approved.contractPath), "utf8"),
  );
  assert.equal(contract.metadata.artifactType, "fix-card");
  assert.equal(contract.metadata.participationRole, "gatingReview");
  assert.equal(contract.metadata.identity.issueId, "ISSUE_070");
  assert.equal(contract.metadata.identity.fixCardId, "ISSUE_070-FC01");
  assert.equal(contract.metadata.identity.phaseId, undefined);
  assert.match(contract.bodyMarkdown, /ISSUE_070-FC01/);
  const report = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, approved.implementerReportPath), "utf8"),
  );
  assert.equal(report.metadata.artifactType, "implementer-report");
  assert.equal(report.metadata.identity.issueId, "ISSUE_070");
  assert.equal(report.metadata.identity.fixCardId, "ISSUE_070-FC01");
  assert.equal(report.metadata.identity.phaseId, undefined);
  assert.deepEqual(report.metadata.sourceRevisions, [
    { path: approved.contractPath, revision: approved.contractRevision },
  ]);

  const codexContext = resolveIssueFixCardCodexExecutionContext(root, "ISSUE_070", "ISSUE_070-FC01");
  assert.equal(codexContext.implementationContractType, "fix-card");
  assert.equal(codexContext.implementationContractLabel, "Approved Fix Card Contract");
  assert.equal(codexContext.phaseId, undefined);
  assert.equal(codexContext.formalWorkCardPath, approved.contractPath);
  assert.equal(codexContext.implementerReportPath, approved.implementerReportPath);
  const prompt = buildCodexImplementerPrompt({ ...codexContext, phaseId: null, developmentEnvironmentPreflight: null });
  assert.match(prompt, /Approved Fix Card Contract/);
  assert.match(prompt, /Fix Card path:/);
  assert.doesNotMatch(prompt, /Formal Work Card path:/);
  assert.match(prompt, /The human Operator is the only authority/);
  assert.match(prompt, /The Approved Fix Card Contract is the sole bounded implementation contract/);
  assert.match(prompt, /defines task scope and instructions; it does not grant authority/);
  assert.match(prompt, /If project instructions conflict with the Approved Fix Card Contract, follow the Approved Fix Card Contract/);
  assert.match(prompt, /Run the validation required by the Approved Fix Card Contract when possible/);
  assert.doesNotMatch(prompt, /npm test/);
  assert.doesNotMatch(prompt, /test:full/);
  assert.doesNotMatch(prompt, /full-suite cleanliness/i);
  assert.doesNotMatch(prompt, /complete-corpus/i);
});

test("controlled Fix Card drafts remain reviewable with Development prose and create application-owned revisions", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_074");
  selectIssueFixCardCandidate(root, "ISSUE_074", "ISSUE_074-FC01", "planning");

  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_074", "planning");
  const firstSubmission = prepared.projection.activePlanningSubmission;
  const firstPath = path.join(root, firstSubmission.temporaryDraftPath);
  const initial = parseCanonicalMarkdownDocument(fs.readFileSync(firstPath, "utf8"));
  assert.equal(initial.metadata.artifactType, "fix-card-draft");
  assert.equal(initial.metadata.workflowData.draftRevision, 1);
  assert.equal(initial.metadata.documentDisposition.status, "Pending");
  assert.equal(initial.bodyMarkdown, "\n");
  assert.match(firstSubmission.preparedInstruction, /artifact_toolbox\.replace_markdown_body/);
  assert.match(firstSubmission.preparedInstruction, new RegExp(firstSubmission.metadataSha256));
  assert.match(firstSubmission.preparedInstruction, new RegExp(firstSubmission.bodySha256));
  assert.equal(initial.metadata.workflowData.sourceFingerprints.length, 2);
  assert.match(initial.metadata.workflowData.sourceFingerprints[0].sha256, /^[a-f0-9]{64}$/);

  const body = `${validFixCardContract("ISSUE_074-FC01")}\n\nThe current Development Phase and Current Phase use phaseId metadata. Preserve Development Work Cards exactly as they are.`;
  writeControlledFixCardDraft(root, prepared, body);
  const reviewable = getIssueFixCardProjection(root, "ISSUE_074", "planning");
  assert.equal(reviewable.status, "planning-draft-ready");
  assert.equal(reviewable.canApplyContractReview, true);
  assert.match(reviewable.contractMarkdown, /Development Phase and Current Phase use phaseId/);

  const revisionRequested = applyIssueFixCardContractReview(root, "ISSUE_074", {
    disposition: "RevisionRequested",
    operatorNotes: "Clarify the preservation statement without deleting it.",
    expectedReviewedBodySha256: reviewable.controlledDraftBodySha256,
  }, "planning").projection;
  assert.equal(revisionRequested.contractDisposition, "RevisionRequested");
  assert.equal(revisionRequested.canPreparePlanningHandoff, true);
  assert.equal(fs.existsSync(firstPath), true);

  const revisedPrepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_074", "planning");
  const secondSubmission = revisedPrepared.projection.activePlanningSubmission;
  assert.equal(secondSubmission.draftRevision, 2);
  assert.notEqual(secondSubmission.temporaryDraftPath, firstSubmission.temporaryDraftPath);
  const second = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, secondSubmission.temporaryDraftPath), "utf8"),
  );
  assert.equal(second.metadata.workflowData.priorDraftPath, firstSubmission.temporaryDraftPath);
  assert.equal(second.metadata.workflowData.priorDraftRevision, 1);
  assert.equal(second.metadata.workflowData.operatorRevisionNotes, "Clarify the preservation statement without deleting it.");
  assert.equal(second.bodyMarkdown, `${body}\n`);

  writeControlledFixCardDraft(root, revisedPrepared, `${body}\n\nRevision addressed.`);
  const rejected = applyIssueFixCardContractReview(root, "ISSUE_074", {
    disposition: "Rejected",
    operatorNotes: "Do not implement this draft.",
    expectedReviewedBodySha256: getIssueFixCardProjection(root, "ISSUE_074", "planning").controlledDraftBodySha256,
  }, "planning").projection;
  assert.equal(rejected.contractDisposition, "Rejected");
  assert.equal(rejected.implementerReportState, "missing");
  assert.equal(fs.existsSync(path.join(root, rejected.finalContractPath)), false);
});

test("controlled Fix Card dispositions are bound to the exact reviewed body", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_075");
  selectIssueFixCardCandidate(root, "ISSUE_075", "ISSUE_075-FC01", "planning");
  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_075", "planning");
  writeControlledFixCardDraft(root, prepared, validFixCardContract("ISSUE_075-FC01"));
  const reviewed = getIssueFixCardProjection(root, "ISSUE_075", "planning");
  const reviewedBodySha256 = reviewed.controlledDraftBodySha256;

  replaceControlledMarkdownBody(root, {
    relativePath: reviewed.controlledDraftPath,
    submissionId: reviewed.activePlanningSubmission.submissionId,
    expectedMetadataSha256: reviewed.controlledDraftMetadataSha256,
    expectedBodySha256: reviewedBodySha256,
    bodyMarkdown: `${reviewed.contractMarkdown}\n\nNewer body B is now current.`,
  });
  const current = getIssueFixCardProjection(root, "ISSUE_075", "planning");
  assert.notEqual(current.controlledDraftBodySha256, reviewedBodySha256);

  for (const disposition of ["Approved", "RevisionRequested", "Rejected"]) {
    assert.throws(
      () => applyIssueFixCardContractReview(root, "ISSUE_075", {
        disposition,
        operatorNotes: disposition === "RevisionRequested" ? "Revise the reviewed body." : "Bound decision.",
        expectedReviewedBodySha256: reviewedBodySha256,
      }, "planning"),
      /STALE_SOURCE/,
    );
  }
  const afterStaleDecisions = getIssueFixCardProjection(root, "ISSUE_075", "planning");
  assert.equal(afterStaleDecisions.contractDisposition, "Pending");
  assert.equal(afterStaleDecisions.controlledDraftBodySha256, current.controlledDraftBodySha256);
  assert.match(afterStaleDecisions.contractMarkdown, /Newer body B is now current/);
  assert.equal(fs.existsSync(path.join(root, afterStaleDecisions.finalContractPath)), false);
  assert.equal(fs.existsSync(path.join(root, afterStaleDecisions.implementerReportPath)), false);

  const approved = applyIssueFixCardContractReview(root, "ISSUE_075", {
    disposition: "Approved",
    operatorNotes: "Approved after reviewing current body B.",
    expectedReviewedBodySha256: current.controlledDraftBodySha256,
  }, "implement").projection;
  assert.equal(approved.contractDisposition, "Approved");
  assert.equal(approved.implementerReportReadiness, "reserved-skeleton");
});

test("controlled Fix Card source fingerprints reject stale planning bytes and require a fresh draft", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_076");
  selectIssueFixCardCandidate(root, "ISSUE_076", "ISSUE_076-FC01", "planning");
  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_076", "planning");
  writeControlledFixCardDraft(root, prepared, validFixCardContract("ISSUE_076-FC01"));
  const current = getIssueFixCardProjection(root, "ISSUE_076", "planning");
  const oldBodySha256 = current.controlledDraftBodySha256;
  const oldDraftPath = current.controlledDraftPath;
  const issuePlanPath = path.join(root, "issues", "ISSUE_076", "ISSUE_RESOLUTION_PLAN.md");
  fs.appendFileSync(issuePlanPath, "\nSubstantive governing planning change without canonical revision metadata.\n", "utf8");

  const stale = getIssueFixCardProjection(root, "ISSUE_076", "planning");
  assert.equal(stale.status, "needs-attention");
  assert.match(stale.statusMessage, /stale against its governing Issue planning sources/);
  assert.equal(stale.canApplyContractReview, false);
  assert.equal(stale.canPreparePlanningHandoff, true);
  assert.throws(
    () => applyIssueFixCardContractReview(root, "ISSUE_076", {
      disposition: "Approved",
      operatorNotes: "Must not apply against stale planning.",
      expectedReviewedBodySha256: oldBodySha256,
    }, "planning"),
    /controlled Fix Card draft is required|stale/i,
  );
  assert.equal(fs.existsSync(path.join(root, stale.finalContractPath)), false);

  const fresh = prepareIssueFixCardPlanningHandoff(root, "ISSUE_076", "planning").projection;
  assert.equal(fresh.activePlanningSubmission.draftRevision, 2);
  assert.notEqual(fresh.controlledDraftPath, oldDraftPath);
  const freshDraft = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, fresh.controlledDraftPath), "utf8"));
  assert.equal(freshDraft.metadata.workflowData.sourceFingerprints.length, 2);
  assert.notEqual(
    freshDraft.metadata.workflowData.sourceFingerprints[0].sha256,
    parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, oldDraftPath), "utf8")).metadata.workflowData.sourceFingerprints[0].sha256,
  );
});

test("repository reconstruction restores the unique Pending controlled Fix Card after service restart", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_077");
  selectIssueFixCardCandidate(root, "ISSUE_077", "ISSUE_077-FC01", "planning");
  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_077", "planning");
  writeControlledFixCardDraft(root, prepared, validFixCardContract("ISSUE_077-FC01"));

  const serviceModulePath = path.join(__dirname, "..", "..", "dist", "main", "issueResolution", "issueResolutionService.js");
  const reconstructed = JSON.parse(execFileSync(process.execPath, [
    "-e",
    `const service = require(${JSON.stringify(serviceModulePath)}); process.stdout.write(JSON.stringify(service.getIssueFixCardProjection(${JSON.stringify(root)}, "ISSUE_077", "fix-card-map")));`,
  ], { encoding: "utf8" }));
  assert.equal(reconstructed.currentStep, "planning");
  assert.equal(reconstructed.status, "planning-draft-ready");
  assert.equal(reconstructed.selectedCandidate.fixCardId, "ISSUE_077-FC01");
  assert.equal(reconstructed.contractDisposition, "Pending");
  assert.equal(reconstructed.canApplyContractReview, true);
  assert.match(reconstructed.contractMarkdown, /ISSUE_077-FC01/);
});

test("Issue Fix Card projection derives the current workspace from repository evidence instead of requested step", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_090");

  const noCandidatePlanning = getIssueFixCardProjection(root, "ISSUE_090", "planning");
  assert.equal(noCandidatePlanning.currentStep, "fix-card-map");
  assert.equal(noCandidatePlanning.selectedCandidate, undefined);
  assert.equal(noCandidatePlanning.stepAvailability.find((step) => step.stepId === "planning").available, false);
  assert.equal(noCandidatePlanning.stepAvailability.find((step) => step.stepId === "planning").stateLabel, "Unavailable");

  const selected = selectIssueFixCardCandidate(root, "ISSUE_090", "ISSUE_090-FC01", "planning").projection;
  assert.equal(selected.currentStep, "planning");
  assert.equal(selected.stepAvailability.find((step) => step.stepId === "planning").available, true);

  const explicitPlanning = getIssueFixCardProjection(root, "ISSUE_090", "planning");
  assert.equal(explicitPlanning.currentStep, "planning");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_090", "repair").currentStep, "planning");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_090", "fix-card-validation").currentStep, "planning");

  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_090", "planning");
  writeControlledFixCardDraft(root, prepared, validFixCardContract("ISSUE_090-FC01"));
  const approved = applyIssueFixCardContractReview(root, "ISSUE_090", {
    disposition: "Approved",
    operatorNotes: "Approved.",
    expectedReviewedBodySha256: getIssueFixCardProjection(root, "ISSUE_090", "planning").controlledDraftBodySha256,
  }, "implement").projection;
  const contractPath = path.join(root, approved.contractPath);
  const contract = parseCanonicalMarkdownDocument(fs.readFileSync(contractPath, "utf8"));
  contract.metadata.identity.currentImplementationId = "ISSUE_090-FC99";
  fs.writeFileSync(contractPath, serializeCanonicalMarkdownDocument(contract.metadata, contract.bodyMarkdown), "utf8");
  const mismatched = getIssueFixCardProjection(root, "ISSUE_090", "implement");
  assert.equal(mismatched.currentStep, "planning");
  assert.equal(mismatched.status, "needs-attention");
  assert.match(mismatched.statusMessage, /metadata or identity is invalid/);

  writeIssue(root, "ISSUE_091");
  fs.writeFileSync(path.join(root, "issues", "ISSUE_091", "ARCHITECT_INVESTIGATION.md"), validInvestigation("ISSUE_091"), "utf8");
  applyIssueArchitectReview(root, "ISSUE_091", { disposition: "Approved", operatorNotes: "Proceed." });
  promoteValidBundle(root, "ISSUE_091");
  applyIssuePlanningReview(root, "ISSUE_091", { disposition: "Approved", operatorNotes: "Approved." });

  const switchedIssueProjection = getIssueFixCardProjection(root, "ISSUE_091", "planning");
  assert.equal(switchedIssueProjection.currentStep, "fix-card-map");
  assert.equal(switchedIssueProjection.selectedCandidate, undefined);
  assert.equal(switchedIssueProjection.stepAvailability.find((step) => step.stepId === "planning").available, false);
});

test("Issue Fix Card Map reports noncanonical lifecycle artifacts as Needs Attention without mutating the plan", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_073");
  const planPath = path.join(root, "issues", "ISSUE_073", "FIX_CARD_PLAN.md");
  const planBefore = fs.readFileSync(planPath, "utf8");
  const legacyPath = path.join(
    root,
    "issues",
    "ISSUE_073",
    "Fix_Cards",
    "ISSUE_073-FC01_fix_card_contract_service.md",
  );
  fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
  fs.writeFileSync(legacyPath, "# ISSUE_073-FC01 — Bootstrap Fix Card\n\nPre-FC05 implementation evidence.", "utf8");

  const projected = getIssueFixCardProjection(root, "ISSUE_073", "fix-card-map");
  const legacy = projected.candidates.find((candidate) => candidate.fixCardId === "ISSUE_073-FC01");
  const unstarted = projected.candidates.find((candidate) => candidate.fixCardId === "ISSUE_073-FC02");

  assert.equal(legacy.lifecycle.label, "Rejected / Needs Attention");
  assert.equal(legacy.lifecycle.selectable, false);
  assert.match(legacy.lifecycle.reason, /Canonical document must begin with CHAMPCITY metadata/);
  assert.equal(unstarted.lifecycle.label, "Blocked by Dependencies");
  assert.equal(unstarted.lifecycle.selectable, false);
  assert.throws(
    () => selectIssueFixCardCandidate(root, "ISSUE_073", "ISSUE_073-FC01"),
    /Canonical document must begin with CHAMPCITY metadata/,
  );
  assert.equal(fs.readFileSync(planPath, "utf8"), planBefore);
});

test("Issue Fix Card review-ready evidence resolves directly to combined Review & Validation with optional advisory context", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_080");
  selectIssueFixCardCandidate(root, "ISSUE_080", "ISSUE_080-FC01", "planning");
  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_080", "planning");
  writeControlledFixCardDraft(root, prepared, validFixCardContract("ISSUE_080-FC01"));
  const approved = applyIssueFixCardContractReview(root, "ISSUE_080", {
    disposition: "Approved",
    operatorNotes: "Approved.",
    expectedReviewedBodySha256: getIssueFixCardProjection(root, "ISSUE_080", "planning").controlledDraftBodySha256,
  }, "implement").projection;
  assert.equal(approved.currentStep, "implement");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_080", "repair").currentStep, "implement");
  const readyToImplement = getIssueFixCardProjection(root, "ISSUE_080", "fix-card-map")
    .candidates.find((candidate) => candidate.fixCardId === "ISSUE_080-FC01").lifecycle;
  assert.equal(readyToImplement.label, "Ready to Implement");
  writeSubstantiveReport(root, approved.implementerReportPath);

  const ready = getIssueFixCardProjection(root, "ISSUE_080", "architect-review");
  assert.equal(ready.currentStep, "review-validation");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_080", "planning").currentStep, "review-validation");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_080", "fix-card-validation").currentStep, "review-validation");
  assert.equal(ready.implementerReportReadiness, "ready-for-review");
  assert.equal(
    ready.candidates.find((candidate) => candidate.fixCardId === "ISSUE_080-FC01").lifecycle.label,
    "Review & Validation",
  );
  assert.deepEqual(ready.stepAvailability.map((step) => step.stepId), [
    "fix-card-map", "planning", "implement", "review-validation", "repair", "close-next",
  ]);
  assert.equal(ready.stepAvailability.find((step) => step.stepId === "review-validation").available, true);
  assert.equal(ready.canApplyValidationDecision, true);
  assert.equal(ready.canCopyAdvisoryPrompt, true);

  const prompt = resolveIssueFixCardAdvisoryReviewPrompt(root, "ISSUE_080", "review-validation").instruction;
  assert.match(prompt, /workspaceId/);
  assert.match(prompt, /Issue ID: ISSUE_080/);
  assert.match(prompt, /Root Fix Card ID: ISSUE_080-FC01/);
  assert.match(prompt, /Current implementation ID: ISSUE_080-FC01/);
  assert.equal(prompt.includes(ready.contractPath), true);
  assert.equal(prompt.includes(ready.implementerReportPath), true);
  assert.match(prompt, /sha256: [a-f0-9]{64}/);
  assert.match(prompt, /Failed-test classification rule/);
  assert.match(prompt, /Blocking Findings section may state None/);
  assert.match(prompt, /Validate Passed[\s\S]*Request Repair[\s\S]*Inconclusive/);
  assert.match(prompt, /Do not write repository files/);
  assert.doesNotMatch(prompt, /write_markdown_artifact/);

  const reviewDraftPath = path.join(root, "issues", "Architect_Drafts", "legacy-submission", "fix-card-advisory-review.md");
  fs.mkdirSync(path.dirname(reviewDraftPath), { recursive: true });
  fs.writeFileSync(reviewDraftPath, [
    `Contract: ${ready.contractPath}`,
    `Report: ${ready.implementerReportPath}`,
    validAdvisoryReview("ISSUE_080-FC01", "Validate Passed"),
  ].join("\n\n"), "utf8");
  const withOptionalContext = getIssueFixCardProjection(root, "ISSUE_080", "review-validation");
  assert.equal(withOptionalContext.architectReviewPath, "issues/Architect_Drafts/legacy-submission/fix-card-advisory-review.md");
  assert.equal(withOptionalContext.architectReviewRecommendation, "Validate Passed");
  assert.equal(withOptionalContext.canApplyValidationDecision, true);

  const malformedLegacyPath = path.join(root, "issues", "ISSUE_080", "Architect_Reviews", "ARCHITECT_REVIEW_ISSUE_080-FC01.md");
  fs.mkdirSync(path.dirname(malformedLegacyPath), { recursive: true });
  fs.writeFileSync(malformedLegacyPath, "malformed legacy advisory context", "utf8");
  const malformedLegacy = getIssueFixCardProjection(root, "ISSUE_080", "review-validation");
  assert.equal(malformedLegacy.architectReviewState, "read-error");
  assert.equal(malformedLegacy.canApplyValidationDecision, true);
});

test("Issue Fix Card approval rolls back contract disposition when report reservation fails", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_071");
  selectIssueFixCardCandidate(root, "ISSUE_071", "ISSUE_071-FC01", "planning");
  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_071", "planning");
  writeControlledFixCardDraft(root, prepared, validFixCardContract("ISSUE_071-FC01"));
  const reviewable = getIssueFixCardProjection(root, "ISSUE_071", "planning");

  __setCanonicalMarkdownWriterTestHooks({
    failInstalledVerification: (relativePath) =>
      relativePath === reviewable.implementerReportPath ? "simulated report reservation failure" : undefined,
  });
  try {
    assert.throws(
      () => applyIssueFixCardContractReview(root, "ISSUE_071", {
        disposition: "Approved",
        operatorNotes: "Approved.",
        expectedReviewedBodySha256: reviewable.controlledDraftBodySha256,
      }, "implement"),
      /simulated report reservation failure/,
    );
  } finally {
    __setCanonicalMarkdownWriterTestHooks();
  }

  const afterFailure = getIssueFixCardProjection(root, "ISSUE_071", "implement");
  assert.equal(afterFailure.contractDisposition, "Pending");
  assert.equal(afterFailure.contractPath, reviewable.contractPath);
  assert.match(afterFailure.contractMarkdown, /ISSUE_071-FC01/);
  assert.equal(afterFailure.implementerReportState, "missing");
  assert.equal(fs.existsSync(path.join(root, reviewable.implementerReportPath)), false);
});

test("Issue Fix Card stranded Approved missing report state recovers at the exact Issue-owned target", () => {
  const root = preparedIssueWithApprovedFixCardMap("ISSUE_072");
  selectIssueFixCardCandidate(root, "ISSUE_072", "ISSUE_072-FC01", "planning");
  const prepared = prepareIssueFixCardPlanningHandoff(root, "ISSUE_072", "planning");
  writeControlledFixCardDraft(root, prepared, validFixCardContract("ISSUE_072-FC01"));
  const approved = applyIssueFixCardContractReview(root, "ISSUE_072", {
    disposition: "Approved",
    operatorNotes: "Approved.",
    expectedReviewedBodySha256: getIssueFixCardProjection(root, "ISSUE_072", "planning").controlledDraftBodySha256,
  }, "implement").projection;
  fs.unlinkSync(path.join(root, approved.implementerReportPath));

  const stranded = getIssueFixCardProjection(root, "ISSUE_072", "implement");
  assert.equal(stranded.contractDisposition, "Approved");
  assert.equal(stranded.implementerReportReadiness, "missing");
  assert.equal(stranded.canReserveImplementerReport, true);

  const recovered = reserveIssueFixCardImplementerReport(root, "ISSUE_072", "implement").projection;
  assert.equal(recovered.implementerReportPath, approved.implementerReportPath);
  assert.equal(recovered.implementerReportState, "readable");
  assert.equal(recovered.implementerReportReadiness, "reserved-skeleton");
  assert.equal(recovered.canRunImplementer, true);
});

test("Issue Fix Card validation binds exact evidence and exposes Close without inferring completion", () => {
  const root = preparedReviewReadyFixCard("ISSUE_092", "Validate Passed");
  const ready = getIssueFixCardProjection(root, "ISSUE_092", "fix-card-validation");
  assert.equal(ready.currentStep, "review-validation");
  assert.equal(ready.currentImplementationId, "ISSUE_092-FC01");
  assert.equal(ready.currentImplementationKind, "root-fix-card");
  assert.equal(ready.canApplyValidationDecision, true);
  assert.equal(ready.stepAvailability.find((step) => step.stepId === "review-validation").available, true);

  const decisionResult = applyIssueFixCardValidationDecision(root, "ISSUE_092", {
    decision: "ValidatePassed",
    operatorNotes: "Exact current evidence passed Operator validation.",
    advisorySummary: "Optional advisory context found no material blocker.",
  });
  const decided = decisionResult.projection;
  assert.equal(decisionResult.postMutation.navigation.currentStageId, "fix-cards");
  assert.equal(decided.validationRecordDisposition, "Approved");
  assert.equal(decided.validationAttemptNumber, 1);
  assert.equal(decided.status, "validated-awaiting-close");
  assert.equal(decided.currentStep, "close-next");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_092", "repair").currentStep, "close-next");
  assert.equal(decided.stepAvailability.find((step) => step.stepId === "close-next").available, true);
  assert.equal(decided.canCloseFixCard, true);
  assert.equal(decided.candidates.find((candidate) => candidate.fixCardId === "ISSUE_092-FC01").lifecycle.label, "Validated / Awaiting Close");
  const record = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, decided.validationRecordPath), "utf8"));
  assert.deepEqual(record.metadata.sourceRevisions, [
    { path: decided.contractPath, revision: decided.contractRevision },
    { path: decided.implementerReportPath, revision: decided.implementerReportRevision },
  ]);
  assert.equal(record.metadata.workflowData.advisorySummary, "Optional advisory context found no material blocker.");
  assert.equal(record.metadata.workflowData.architectReviewRole, "advisory-only");
  assert.equal(record.metadata.sourceRevisions.some((source) => /Architect_Reviews|Architect_Drafts/.test(source.path)), false);
  assert.equal(record.metadata.identity.issueId, "ISSUE_092");
  assert.equal(record.metadata.identity.fixCardId, "ISSUE_092-FC01");
  assert.equal(record.metadata.identity.currentImplementationId, "ISSUE_092-FC01");
  assert.equal(record.metadata.identity.attemptNumber, 1);
  assert.equal(record.metadata.identity.phaseId, undefined);
  assert.throws(
    () => applyIssueFixCardValidationDecision(root, "ISSUE_092", { decision: "ValidatePassed", operatorNotes: "replace" }),
    /finalized validation decision already exists/,
  );
});

test("Issue Fix Card close writes exact validation basis, returns to Map, and unlocks the next dependency", () => {
  const root = preparedReviewReadyFixCard("ISSUE_102", "Validate Passed");
  const validated = applyIssueFixCardValidationDecision(root, "ISSUE_102", {
    decision: "ValidatePassed",
    operatorNotes: "Exact current evidence passed.",
  }, "close-next").projection;
  assert.equal(validated.currentStep, "close-next");
  assert.equal(validated.candidates.find((candidate) => candidate.fixCardId === "ISSUE_102-FC02").lifecycle.label, "Blocked by Dependencies");

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
  let closeResult;
  try {
    closeResult = closeIssueFixCard(root, "ISSUE_102", "close-next");
  } finally {
    __setIssueProjectionReadTestHooks();
  }
  const closed = closeResult.projection;
  assert.equal(closed.currentStep, "fix-card-map");
  assert.equal(closed.selectedCandidate, undefined);
  assert.equal(closed.candidates.find((candidate) => candidate.fixCardId === "ISSUE_102-FC01").lifecycle.label, "Complete");
  assert.equal(closed.candidates.find((candidate) => candidate.fixCardId === "ISSUE_102-FC02").lifecycle.label, "Eligible");
  assert.equal(closed.nextEligibleCandidate.fixCardId, "ISSUE_102-FC02");
  assert.equal(closed.allFixCardsClosed, false);
  assert.equal(closeResult.postMutation.planning.issueId, "ISSUE_102");
  assert.equal(closeResult.postMutation.navigation.currentStageId, "fix-cards");
  assert.equal(closeResult.postMutation.validation, undefined);
  assert.equal(postMutationContexts, 1);
  assert.deepEqual([...postMutationReads.entries()].filter(([, count]) => count !== 1), []);

  const closePath = path.join(root, "issues", "ISSUE_102", "Close_Records", "FIX_CARD_CLOSE_RECORD_ISSUE_102-FC01.md");
  const close = parseCanonicalMarkdownDocument(fs.readFileSync(closePath, "utf8"));
  assert.equal(close.metadata.artifactType, "fix-card-close-record");
  assert.equal(close.metadata.identity.fixCardId, "ISSUE_102-FC01");
  assert.equal(close.metadata.identity.currentImplementationId, "ISSUE_102-FC01");
  assert.equal(close.metadata.workflowData.origin, "fix-card-validation");
  assert.equal(close.metadata.workflowData.returnTarget, "fix-card-map");
  assert.deepEqual(close.metadata.sourceRevisions, [{
    path: validated.validationRecordPath,
    revision: validated.validationRecordRevision,
  }]);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_102", "Fix_Cards", "ISSUE_102-FC02_fix_card_renderer_workspace.md")), false);

  close.metadata.sourceRevisions[0].revision += 1;
  fs.writeFileSync(closePath, serializeCanonicalMarkdownDocument(close.metadata, close.bodyMarkdown), "utf8");
  const stale = getIssueFixCardProjection(root, "ISSUE_102", "fix-card-map");
  assert.notEqual(stale.candidates.find((candidate) => candidate.fixCardId === "ISSUE_102-FC01").lifecycle.label, "Complete");
  selectIssueFixCardCandidate(root, "ISSUE_102", "ISSUE_102-FC01", "close-next");
  assert.throws(() => closeIssueFixCard(root, "ISSUE_102", "close-next"), /stale|conflicting/i);
});

test("all valid close records derive Issue Validation eligibility without implementing that workspace", () => {
  const root = preparedReviewReadyFixCard("ISSUE_103", "Validate Passed");
  applyIssueFixCardValidationDecision(root, "ISSUE_103", {
    decision: "ValidatePassed",
    operatorNotes: "FC01 passed.",
  }, "close-next");
  closeIssueFixCard(root, "ISSUE_103", "close-next");
  writeBootstrapCloseRecord(root, "ISSUE_103", "ISSUE_103-FC02");

  const projection = getIssueFixCardProjection(root, "ISSUE_103", "fix-card-map");
  assert.equal(projection.allFixCardsClosed, true);
  assert.equal(projection.candidates.every((candidate) => candidate.lifecycle.label === "Complete"), true);
  const navigation = getIssueResolutionNavigationProjection(root, "ISSUE_103");
  assert.equal(navigation.allFixCardsClosed, true);
  assert.equal(navigation.issueValidationAvailable, true);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "issue-validation").stateLabel, "Eligible");
});

test("repository-backed ISSUE_001 bootstrap cutover fixture completes FC01-FC07 and resumes normal planning at FC08", () => {
  const fixturePath = path.join(__dirname, "..", "fixtures", "issue-resolution", "issue-001-bootstrap-cutover.json");
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const root = preparedIssueWithApprovedFixCardMap(fixture.issueId);
  const planPath = path.join(root, "issues", fixture.issueId, "FIX_CARD_PLAN.md");
  fs.writeFileSync(planPath, validFixtureFixCardPlan(fixture), "utf8");
  for (const fixCardId of fixture.bodyOnlyContractIds) {
    const candidate = fixture.candidates.find((entry) => entry.fixCardId === fixCardId);
    const slug = candidate.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const contractPath = path.join(root, "issues", fixture.issueId, "Fix_Cards", `${fixCardId}_${slug}.md`);
    fs.mkdirSync(path.dirname(contractPath), { recursive: true });
    fs.writeFileSync(contractPath, `# ${fixCardId} - Historical Bootstrap Contract\n\nBody-only pre-cutover evidence.`, "utf8");
  }
  for (const fixCardId of fixture.closedFixCardIds) {
    writeBootstrapCloseRecord(root, fixture.issueId, fixCardId);
  }
  const planBefore = fs.readFileSync(planPath, "utf8");

  const projection = getIssueFixCardProjection(root, fixture.issueId, "fix-card-map");
  for (const fixCardId of fixture.closedFixCardIds) {
    assert.equal(projection.candidates.find((candidate) => candidate.fixCardId === fixCardId).lifecycle.label, "Complete");
  }
  assert.equal(projection.candidates.find((candidate) => candidate.fixCardId === "ISSUE_001-FC08").lifecycle.label, "Eligible");
  assert.equal(projection.candidates.find((candidate) => candidate.fixCardId === "ISSUE_001-FC08").lifecycle.selectable, true);
  assert.equal(projection.candidates.find((candidate) => candidate.fixCardId === "ISSUE_001-FC09").lifecycle.label, "Blocked by Dependencies");
  assert.equal(projection.candidates.find((candidate) => candidate.fixCardId === "ISSUE_001-FC09").lifecycle.selectable, false);

  const selected = selectIssueFixCardCandidate(root, fixture.issueId, "ISSUE_001-FC08", "fix-card-map").projection;
  assert.equal(selected.currentStep, "planning");
  assert.equal(selected.selectedCandidate.fixCardId, "ISSUE_001-FC08");
  assert.equal(fs.readFileSync(planPath, "utf8"), planBefore);
});

test("Issue Repair derives only from RevisionRequested validation and preserves repeated immediate-parent lineage", () => {
  const root = preparedReviewReadyFixCard("ISSUE_093", "Request Repair");
  assert.throws(
    () => prepareIssueFixCardRepairHandoff(root, "ISSUE_093"),
    /RevisionRequested validation record is required/,
  );
  assert.throws(
    () => applyIssueFixCardValidationDecision(root, "ISSUE_093", { decision: "RequestRepair", operatorNotes: "Observed." }),
    /Bounded defect text is required/,
  );
  const requested = applyIssueFixCardValidationDecision(root, "ISSUE_093", {
    decision: "RequestRepair",
    operatorNotes: "Observed in the exact FC01 implementation.",
    boundedDefect: "The current validation action loses exact evidence identity after Issue switching.",
  }, "repair").projection;
  assert.equal(requested.validationRecordDisposition, "RevisionRequested");
  assert.equal(requested.currentStep, "repair");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_093", "implement").currentStep, "repair");
  assert.equal(requested.canPrepareRepairHandoff, true);
  assert.equal(requested.candidates.find((candidate) => candidate.fixCardId === "ISSUE_093-FC01").lifecycle.label, "Repair Required");

  const repair01Prepared = prepareIssueFixCardRepairHandoff(root, "ISSUE_093", "repair").projection;
  assert.equal(repair01Prepared.activeRepairSubmission.repairId, "ISSUE_093-FC01-REPAIR01");
  const copied = resolveIssueFixCardRepairCopyHandoff(root, "ISSUE_093", "repair").instruction;
  assert.match(copied, /replace_markdown_body/);
  assert.doesNotMatch(copied, /write_markdown_artifact/);
  assert.match(copied, /ISSUE_093-FC01-REPAIR01/);
  assert.match(copied, /Immediate parent implementation ID: ISSUE_093-FC01/);
  assert.match(copied, /- ## In-Scope Surface/);
  assert.doesNotMatch(copied, /- ## Authorized Surface/);
  const repair01Draft = path.join(root, repair01Prepared.activeRepairSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(repair01Draft), { recursive: true });
  writeControlledRepairBody(root, repair01Draft, validRepairContract(
    "ISSUE_093-FC01-REPAIR01",
    "ISSUE_093-FC01",
    "The current validation action loses exact evidence identity after Issue switching.",
  ), "utf8");
  const repair01 = promoteIssueFixCardRepairDraft(root, "ISSUE_093", "repair").projection;
  assert.equal(repair01.currentImplementationId, "ISSUE_093-FC01-REPAIR01");
  assert.equal(repair01.parentImplementationId, "ISSUE_093-FC01");
  assert.equal(repair01.currentImplementationKind, "repair");
  assert.equal(repair01.currentStep, "repair");
  const repair01Contract = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, repair01.contractPath), "utf8"));
  assert.equal(repair01Contract.metadata.artifactType, "repair-work-card");
  assert.equal(repair01Contract.metadata.identity.parentImplementationId, "ISSUE_093-FC01");
  assert.equal(repair01Contract.metadata.identity.phaseId, undefined);
  assert.equal(repair01Contract.metadata.identity.workCardId, undefined);
  assert.equal(repair01Contract.metadata.workflowData.validationRecordPath, requested.validationRecordPath);
  assert.equal(repair01Contract.metadata.workflowData.returnTarget, "review-validation");
  assert.equal(repair01Contract.metadata.workflowData.architectReviewTarget, undefined);

  const repair01Approved = applyIssueFixCardContractReview(root, "ISSUE_093", {
    disposition: "Approved",
    operatorNotes: "Bounded Repair approved.",
  }, "implement").projection;
  assert.equal(repair01Approved.currentStep, "implement");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_093", "repair").currentStep, "implement");
  assert.match(repair01Approved.implementerReportPath, /IMPLEMENTER_REPORT_ISSUE_093-FC01-REPAIR01_/);
  assert.equal(
    repair01Approved.candidates.find((candidate) => candidate.fixCardId === "ISSUE_093-FC01").lifecycle.label,
    "In Repair",
  );
  writeSubstantiveReport(root, repair01Approved.implementerReportPath);
  assert.equal(getIssueFixCardProjection(root, "ISSUE_093", "repair").currentStep, "review-validation");
  const repairContext = resolveIssueFixCardCodexExecutionContext(root, "ISSUE_093", "ISSUE_093-FC01", "ISSUE_093-FC01-REPAIR01");
  assert.equal(repairContext.implementationContractType, "repair-work-card");
  assert.equal(repairContext.implementationContractLabel, "Approved Repair Contract");
  assert.equal(repairContext.currentImplementationId, "ISSUE_093-FC01-REPAIR01");
  assert.equal(repairContext.repairId, "ISSUE_093-FC01-REPAIR01");

  const repair01Reviewed = getIssueFixCardProjection(root, "ISSUE_093", "review-validation");
  assert.equal(repair01Reviewed.currentStep, "review-validation");
  assert.equal(
    repair01Reviewed.candidates.find((candidate) => candidate.fixCardId === "ISSUE_093-FC01").lifecycle.label,
    "Review & Validation",
  );
  const repair01Validation = applyIssueFixCardValidationDecision(root, "ISSUE_093", {
    decision: "RequestRepair",
    operatorNotes: "Repair 01 left one bounded identity defect.",
    boundedDefect: "Repair 01 preserves the root identity but drops its immediate parent path from the projection.",
  }, "repair").projection;
  assert.equal(repair01Validation.validationAttemptNumber, 2);
  assert.equal(repair01Validation.validationRecordDisposition, "RevisionRequested");
  assert.equal(repair01Validation.currentStep, "repair");

  const repair02Prepared = prepareIssueFixCardRepairHandoff(root, "ISSUE_093", "repair").projection;
  assert.equal(repair02Prepared.activeRepairSubmission.repairId, "ISSUE_093-FC01-REPAIR02");
  const repair02Draft = path.join(root, repair02Prepared.activeRepairSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(repair02Draft), { recursive: true });
  writeControlledRepairBody(root, repair02Draft, validRepairContract(
    "ISSUE_093-FC01-REPAIR02",
    "ISSUE_093-FC01-REPAIR01",
    "Repair 01 preserves the root identity but drops its immediate parent path from the projection.",
  ), "utf8");
  const repair02 = promoteIssueFixCardRepairDraft(root, "ISSUE_093", "repair").projection;
  assert.equal(repair02.currentImplementationId, "ISSUE_093-FC01-REPAIR02");
  assert.equal(repair02.parentImplementationId, "ISSUE_093-FC01-REPAIR01");
  assert.equal(repair02.currentStep, "repair");
  assert.equal(fs.existsSync(path.join(root, repair01.contractPath)), true);
  assert.equal(fs.existsSync(path.join(root, requested.validationRecordPath)), true);
  assert.equal(fs.existsSync(path.join(root, repair01Validation.validationRecordPath)), true);

  const repair02Approved = applyIssueFixCardContractReview(root, "ISSUE_093", {
    disposition: "Approved",
    operatorNotes: "Second bounded Repair approved.",
  }, "repair").projection;
  assert.equal(repair02Approved.currentStep, "implement");
  writeSubstantiveReport(root, repair02Approved.implementerReportPath);
  assert.equal(getIssueFixCardProjection(root, "ISSUE_093", "planning").currentStep, "review-validation");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_093", "implement").currentStep, "review-validation");
  const repair02Validation = applyIssueFixCardValidationDecision(root, "ISSUE_093", {
    decision: "ValidatePassed",
    operatorNotes: "The exact second Repair evidence passed.",
  }, "repair").projection;
  assert.equal(repair02Validation.currentStep, "close-next");
  assert.equal(repair02Validation.status, "validated-awaiting-close");
  assert.equal(repair02Validation.validationRecordDisposition, "Approved");
  assert.equal(getIssueFixCardProjection(root, "ISSUE_093", "repair").currentStep, "close-next");
  const repairClose = closeIssueFixCard(root, "ISSUE_093", "close-next").projection;
  assert.equal(repairClose.currentStep, "fix-card-map");
  assert.equal(repairClose.candidates.find((candidate) => candidate.fixCardId === "ISSUE_093-FC01").lifecycle.label, "Complete");
  const closeRecord = parseCanonicalMarkdownDocument(fs.readFileSync(
    path.join(root, "issues", "ISSUE_093", "Close_Records", "FIX_CARD_CLOSE_RECORD_ISSUE_093-FC01.md"),
    "utf8",
  ));
  assert.equal(closeRecord.metadata.identity.fixCardId, "ISSUE_093-FC01");
  assert.equal(closeRecord.metadata.identity.currentImplementationId, "ISSUE_093-FC01-REPAIR02");
  assert.equal(closeRecord.metadata.identity.repairId, "ISSUE_093-FC01-REPAIR02");
});

test("Issue Repair allocation reserves exact orphan and external evidence identities without substring collisions", () => {
  const root = preparedReviewReadyFixCard("ISSUE_097", "Request Repair");
  applyIssueFixCardValidationDecision(root, "ISSUE_097", {
    decision: "RequestRepair",
    operatorNotes: "A bounded correction is required.",
    boundedDefect: "The allocator must reserve exact orphan Repair identities across repository evidence.",
  }, "repair");
  const issueRoot = path.join(root, "issues", "ISSUE_097");
  const evidence = [
    ["Implementer_Reports", "IMPLEMENTER_REPORT_ISSUE_097-FC01-REPAIR01.md"],
    ["Architect_Reviews", "ARCHITECT_REVIEW_ISSUE_097-FC01-REPAIR02.md"],
    ["Validation_Records", "VALIDATION_RECORD_ISSUE_097-FC01-REPAIR03_ATTEMPT01.md"],
  ];
  for (const [directoryName, filename] of evidence) {
    const directory = path.join(issueRoot, directoryName);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, filename), "external collision evidence", "utf8");
  }
  fs.writeFileSync(
    path.join(issueRoot, "IMPLEMENTER_REPAIR_CARD_ISSUE_097-FC01-REPAIR04.md"),
    "out-of-band recovery evidence",
    "utf8",
  );
  fs.writeFileSync(
    path.join(issueRoot, "Implementer_Reports", "notes_ISSUE_097-FC01-REPAIR99.md"),
    "not an exact lifecycle filename",
    "utf8",
  );

  const prepared = prepareIssueFixCardRepairHandoff(root, "ISSUE_097", "repair").projection;
  assert.equal(prepared.currentStep, "repair");
  assert.equal(prepared.activeRepairSubmission.repairId, "ISSUE_097-FC01-REPAIR05");
});

test("Issue Repair contract revision preserves the same Repair identity and original validation basis", () => {
  const root = preparedReviewReadyFixCard("ISSUE_096", "Request Repair");
  const requested = applyIssueFixCardValidationDecision(root, "ISSUE_096", {
    decision: "RequestRepair",
    operatorNotes: "Observed in the exact FC01 implementation.",
    boundedDefect: "The current Repair presentation omits the exact immediate-parent evidence path.",
  }, "repair").projection;
  const prepared = prepareIssueFixCardRepairHandoff(root, "ISSUE_096", "repair").projection;
  const repairDraft = path.join(root, prepared.activeRepairSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(repairDraft), { recursive: true });
  writeControlledRepairBody(root, repairDraft, validRepairContract(
    "ISSUE_096-FC01-REPAIR01",
    "ISSUE_096-FC01",
    "The current Repair presentation omits the exact immediate-parent evidence path.",
  ), "utf8");
  const promoted = promoteIssueFixCardRepairDraft(root, "ISSUE_096", "repair").projection;
  const originalPath = promoted.contractPath;

  const revisionRequested = applyIssueFixCardContractReview(root, "ISSUE_096", {
    disposition: "RevisionRequested",
    operatorNotes: "Name the exact parent evidence path in the acceptance proof.",
  }, "repair").projection;
  assert.equal(revisionRequested.currentImplementationId, "ISSUE_096-FC01-REPAIR01");
  assert.equal(revisionRequested.canPrepareRepairHandoff, true);
  assert.equal(
    revisionRequested.candidates.find((candidate) => candidate.fixCardId === "ISSUE_096-FC01").lifecycle.label,
    "In Repair",
  );

  const revisionPrepared = prepareIssueFixCardRepairHandoff(root, "ISSUE_096", "repair").projection;
  assert.equal(revisionPrepared.activeRepairSubmission.repairId, "ISSUE_096-FC01-REPAIR01");
  assert.equal(revisionPrepared.activeRepairSubmission.validationRecordPath, requested.validationRecordPath);
  const revisionInstruction = resolveIssueFixCardRepairCopyHandoff(root, "ISSUE_096", "repair").instruction;
  assert.match(revisionInstruction, /Revise this same Repair identity/);
  assert.match(revisionInstruction, /Name the exact parent evidence path in the acceptance proof/);
  const revisionDraft = path.join(root, revisionPrepared.activeRepairSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(revisionDraft), { recursive: true });
  writeControlledRepairBody(root, revisionDraft, validRepairContract(
    "ISSUE_096-FC01-REPAIR01",
    "ISSUE_096-FC01",
    "The current Repair presentation omits the exact immediate-parent evidence path.",
  ), "utf8");
  const revised = promoteIssueFixCardRepairDraft(root, "ISSUE_096", "repair").projection;
  assert.equal(revised.contractPath, originalPath);
  assert.equal(revised.currentImplementationId, "ISSUE_096-FC01-REPAIR01");
  assert.equal(revised.contractRevision, 2);
  assert.equal(revised.contractDisposition, "Pending");
  assert.equal(fs.readdirSync(path.join(root, "issues", "ISSUE_096", "Repairs")).length, 1);
});

test("Issue validation rejects stale contract/report binding while malformed advisory context is non-gating", () => {
  const staleRoot = preparedReviewReadyFixCard("ISSUE_094", "Validate Passed");
  const staleProjection = getIssueFixCardProjection(staleRoot, "ISSUE_094", "review-validation");
  const reportPath = path.join(staleRoot, staleProjection.implementerReportPath);
  const report = parseCanonicalMarkdownDocument(fs.readFileSync(reportPath, "utf8"));
  report.metadata.sourceRevisions[0].revision += 1;
  fs.writeFileSync(reportPath, serializeCanonicalMarkdownDocument(report.metadata, report.bodyMarkdown), "utf8");
  const stale = getIssueFixCardProjection(staleRoot, "ISSUE_094", "review-validation");
  assert.equal(stale.canApplyValidationDecision, false);
  assert.equal(stale.stepAvailability.find((step) => step.stepId === "review-validation").available, false);
  assert.throws(
    () => applyIssueFixCardValidationDecision(staleRoot, "ISSUE_094", { decision: "ValidatePassed", operatorNotes: "Should block." }),
    /Implementer Report source revision does not match/,
  );

  const repairRoot = preparedReviewReadyFixCard("ISSUE_095", "Request Repair");
  applyIssueFixCardValidationDecision(repairRoot, "ISSUE_095", {
    decision: "RequestRepair",
    operatorNotes: "Bounded defect observed.",
    boundedDefect: "The current exact implementation identity is not retained.",
  }, "repair");
  const prepared = prepareIssueFixCardRepairHandoff(repairRoot, "ISSUE_095", "repair").projection;
  const draftPath = path.join(repairRoot, prepared.activeRepairSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  writeControlledRepairBody(repairRoot, draftPath, validRepairContract(
    "ISSUE_095-FC01-REPAIR99",
    "UNRELATED-PARENT",
    "An unrelated defect that is not the Operator-bounded defect.",
  ), "utf8");
  assert.throws(
    () => promoteIssueFixCardRepairDraft(repairRoot, "ISSUE_095", "repair"),
    /must preserve the exact Operator-bounded defect text|must identify the Repair and immediate parent implementation/,
  );
  const repairsDirectory = path.join(repairRoot, "issues", "ISSUE_095", "Repairs");
  assert.equal(fs.existsSync(repairsDirectory), false);
});

test("controlled Repair survives process loss, preserves invalid bytes, and promotes the corrected same identity into shared disposition", () => {
  const issueId = "ISSUE_098";
  const root = preparedReviewReadyFixCard(issueId, "Request Repair");
  const defect = "The first exact defect paragraph.\n\nThe second exact defect paragraph must also survive.";
  const requested = applyIssueFixCardValidationDecision(root, issueId, {
    decision: "RequestRepair", operatorNotes: "Observed identity loss.", boundedDefect: defect,
  }, "repair").projection;
  const prepared = prepareIssueFixCardRepairHandoff(root, issueId, "repair").projection;
  const draft = prepared.activeRepairSubmission;
  const absolutePath = path.join(root, draft.temporaryDraftPath);
  const envelope = inspectControlledMarkdownDraft(root, draft.temporaryDraftPath);
  assert.equal(envelope.metadata.artifactType, "repair-work-card-draft");
  assert.equal(envelope.metadata.identity.repairId, "ISSUE_098-FC01-REPAIR01");
  assert.equal(envelope.metadata.identity.currentImplementationId, "ISSUE_098-FC01");
  assert.equal(envelope.metadata.identity.parentImplementationId, "ISSUE_098-FC01");
  assert.equal(envelope.metadata.workflowData.parentImplementationPath, requested.contractPath);
  assert.deepEqual(envelope.metadata.sourceRevisions, [{ path: requested.validationRecordPath, revision: requested.validationRecordRevision }]);
  assert.equal(envelope.metadata.workflowData.boundedDefect, defect);
  assert.equal(envelope.metadata.workflowData.returnTarget, "review-validation");
  assert.equal(envelope.metadata.documentDisposition.status, "Pending");
  assert.equal(prepared.canApplyContractReview, false);

  const recover = () => {
    const modulePath = path.join(__dirname, "../../dist/main/issueResolution/issueResolutionService.js");
    return JSON.parse(execFileSync(process.execPath, ["-e",
      `const s = require(${JSON.stringify(modulePath)}); process.stdout.write(JSON.stringify(s.getIssueFixCardProjection(${JSON.stringify(root)}, ${JSON.stringify(issueId)}, "repair")));`,
    ], { encoding: "utf8" }));
  };
  const recoveredEmpty = recover();
  assert.ok(recoveredEmpty.activeRepairSubmission, JSON.stringify(recoveredEmpty));
  assert.equal(recoveredEmpty.activeRepairSubmission.submissionId, draft.submissionId);
  assert.equal(recoveredEmpty.activeRepairSubmission.temporaryDraftPath, draft.temporaryDraftPath);
  assert.equal(recoveredEmpty.activeRepairSubmission.validationError, undefined);

  writeControlledRepairBody(root, absolutePath,
    validRepairContract(draft.repairId, draft.parentImplementationId, defect).replace("## Acceptance Criteria", "## Other Notes"));
  const missingSectionBytes = fs.readFileSync(absolutePath, "utf8");
  const missingSection = recover();
  assert.equal(missingSection.activeRepairSubmission.submissionId, draft.submissionId);
  assert.match(missingSection.activeRepairSubmission.validationError, /missing required section: Acceptance Criteria/);
  assert.equal(fs.readFileSync(absolutePath, "utf8"), missingSectionBytes);

  const invalidBody = validRepairContract(draft.repairId, draft.parentImplementationId, defect.split("\n\n")[0]);
  writeControlledRepairBody(root, absolutePath, invalidBody);
  const invalidBytes = fs.readFileSync(absolutePath, "utf8");
  const invalid = recover();
  assert.equal(invalid.activeRepairSubmission.submissionId, draft.submissionId);
  assert.equal(invalid.activeRepairSubmission.repairId, draft.repairId);
  assert.match(invalid.activeRepairSubmission.validationError, /preserve the exact Operator-bounded defect text/);
  assert.equal(invalid.activeRepairSubmission.bodyMarkdown, invalidBody);
  assert.equal(invalid.canPrepareRepairHandoff, false);
  assert.equal(invalid.canCopyRepairHandoff, true);
  assert.equal(invalid.canApplyContractReview, false);
  assert.equal(fs.readFileSync(absolutePath, "utf8"), invalidBytes);
  assert.equal(fs.existsSync(path.join(root, draft.finalRepairTarget)), false);
  assert.throws(() => prepareIssueFixCardRepairHandoff(root, issueId), /already active/);

  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const loader = require("../renderer/renderer-source-loader.cjs");
  const { IssueFixCardRepairWorkspace } = loader.loadRendererSourceModule("src/renderer/app/IssueFixCardMapWorkspace.tsx");
  const render = (projection) => renderToStaticMarkup(React.createElement(IssueFixCardRepairWorkspace, {
    actionError: "", actionFeedback: "", actionPending: false,
    currentIssue: { issueId }, fixCardProjection: projection,
    onApplyContractReview: () => undefined, onCopyRepairHandoff: () => undefined,
    onPrepareRepairHandoff: () => undefined, onRefresh: () => undefined,
  }));
  const invalidMarkup = render(invalid);
  assert.match(invalidMarkup, /Repair Draft/);
  assert.match(invalidMarkup, /preserve the exact Operator-bounded defect text/);
  assert.match(invalidMarkup, /The first exact defect paragraph/);
  assert.doesNotMatch(invalidMarkup, /Current Repair Contract|Workflow Step/);

  const copy = resolveIssueFixCardRepairCopyHandoff(root, issueId).instruction;
  const invocation = JSON.parse(copy.match(/```json\n([^]*?)\n```/)[1]);
  assert.equal(invocation.action, "replace_markdown_body");
  assert.equal(invocation.params.submissionId, draft.submissionId);
  assert.equal(invocation.params.expectedMetadataSha256, envelope.metadataSha256);
  assert.equal(invocation.params.expectedBodySha256, invalid.activeRepairSubmission.bodySha256);
  assert.throws(() => replaceControlledMarkdownBody(root, {
    ...invocation.params, expectedBodySha256: envelope.bodySha256, bodyMarkdown: "# Stale write",
  }), /body changed/);

  // Quality checks do not infer lifecycle parentage from prohibitions in prose.
  const validBody = validRepairContract(draft.repairId, draft.parentImplementationId, defect) +
    "\nDo not invent Development phase, Work Card, or Development planning-path parentage. Never invent planning/phases/ or phaseId state.\n";
  replaceControlledMarkdownBody(root, { ...invocation.params, bodyMarkdown: validBody });
  const promoted = recover();
  assert.equal(promoted.currentImplementationId, draft.repairId);
  assert.equal(promoted.currentImplementationKind, "repair");
  assert.equal(promoted.contractPath, draft.finalRepairTarget);
  assert.equal(promoted.contractMarkdown, validBody);
  assert.equal(promoted.contractDisposition, "Pending");
  assert.equal(promoted.canApplyContractReview, true);
  assert.equal(promoted.activeRepairSubmission, undefined);
  const promotedMarkup = render(promoted);
  assert.match(promotedMarkup, /Current Repair Contract/);
  assert.match(promotedMarkup, /Workflow Step/);
  assert.match(promotedMarkup, /The second exact defect paragraph/);
  assert.doesNotMatch(promotedMarkup, />Repair Draft</);
  const approved = applyIssueFixCardContractReview(root, issueId, {
    disposition: "Approved", operatorNotes: "Test fixture disposition only.",
  }, "repair").projection;
  assert.equal(approved.currentStep, "implement");
  assert.equal(approved.currentImplementationId, draft.repairId);
  assert.equal(approved.implementerReportPath, draft.implementerReportTarget);
  assert.equal(fs.existsSync(path.join(root, draft.implementerReportTarget)), true);
});

test("Repair reconstruction excludes orphan, stale and mismatched state and rejects ambiguous revisions", () => {
  const root = preparedReviewReadyFixCard("ISSUE_099", "Request Repair");
  applyIssueFixCardValidationDecision(root, "ISSUE_099", {
    decision: "RequestRepair", operatorNotes: "Observed defect.", boundedDefect: "Exact bounded defect.",
  }, "repair");
  const orphanPath = path.join(root, "issues/Architect_Drafts/orphan/repair-contract.md");
  fs.mkdirSync(path.dirname(orphanPath), { recursive: true });
  const orphanBody = validRepairContract("ISSUE_099-FC01-REPAIR01", "ISSUE_099-FC01", "Exact bounded defect.");
  fs.writeFileSync(orphanPath, orphanBody);
  assert.equal(getIssueFixCardProjection(root, "ISSUE_099", "repair").activeRepairSubmission, undefined);
  const prepared = prepareIssueFixCardRepairHandoff(root, "ISSUE_099").projection;
  const draft = prepared.activeRepairSubmission;
  const absolutePath = path.join(root, draft.temporaryDraftPath);
  const originalBytes = fs.readFileSync(absolutePath, "utf8");
  const original = parseCanonicalMarkdownDocument(originalBytes);
  for (const mutate of [
    (m) => { m.identity.issueId = "ISSUE_OTHER"; },
    (m) => { m.identity.fixCardId = "ISSUE_099-FC02"; },
    (m) => { m.identity.parentImplementationId = "UNRELATED"; },
    (m) => { m.identity.phaseId = "phase-00"; },
    (m) => { m.sourceRevisions[0].revision += 1; },
    (m) => { m.workflowData.finalRepairTarget += ".wrong.md"; },
    (m) => { m.workflowData.implementerReportTarget += ".wrong.md"; },
    (m) => { m.workflowData.returnTarget = "planning"; },
    (m) => { m.workflowData.validationSourceSha256 = "0".repeat(64); },
    (m) => { m.workflowData.boundedDefect = "Altered defect"; },
    (m) => { m.documentDisposition.status = "Approved"; },
  ]) {
    const altered = structuredClone(original);
    mutate(altered.metadata);
    fs.writeFileSync(absolutePath, serializeCanonicalMarkdownDocument(altered.metadata, altered.bodyMarkdown));
    assert.equal(getIssueFixCardProjection(root, "ISSUE_099", "repair").activeRepairSubmission, undefined);
  }
  fs.writeFileSync(absolutePath, originalBytes);
  assert.equal(getIssueFixCardProjection(root, "ISSUE_099", "repair").activeRepairSubmission.submissionId, draft.submissionId);
  const validationPath = path.join(root, draft.validationRecordPath);
  const validationBytes = fs.readFileSync(validationPath, "utf8");
  fs.writeFileSync(validationPath, `${validationBytes}\nA source change without a revision bump.\n`);
  assert.equal(getIssueFixCardProjection(root, "ISSUE_099", "repair").activeRepairSubmission, undefined);
  fs.writeFileSync(validationPath, validationBytes);
  const next = structuredClone(original);
  const nextRelative = "issues/Architect_Drafts/explicit-next-revision/repair-contract.md";
  next.metadata.identity.submissionId = "explicit-next-revision";
  next.metadata.workflowData.draftPath = nextRelative;
  fs.mkdirSync(path.dirname(path.join(root, nextRelative)), { recursive: true });
  fs.writeFileSync(path.join(root, nextRelative), serializeCanonicalMarkdownDocument(next.metadata, ""));
  const ambiguous = getIssueFixCardProjection(root, "ISSUE_099", "repair");
  assert.equal(ambiguous.activeRepairSubmission, undefined);
  assert.equal(ambiguous.canPrepareRepairHandoff, false);
  assert.throws(() => prepareIssueFixCardRepairHandoff(root, "ISSUE_099"), /ambiguous/);
  next.metadata.artifactRevision = 2;
  next.metadata.workflowData.draftRevision = 2;
  fs.writeFileSync(path.join(root, nextRelative), serializeCanonicalMarkdownDocument(next.metadata, ""));
  assert.equal(getIssueFixCardProjection(root, "ISSUE_099", "repair").activeRepairSubmission.submissionId, "explicit-next-revision");
  assert.equal(fs.readFileSync(orphanPath, "utf8"), orphanBody);
});

function preparedReviewReadyFixCard(issueId, _recommendation) {
  const root = preparedIssueWithApprovedFixCardMap(issueId);
  selectIssueFixCardCandidate(root, issueId, `${issueId}-FC01`, "planning");
  const prepared = prepareIssueFixCardPlanningHandoff(root, issueId, "planning");
  writeControlledFixCardDraft(root, prepared, validFixCardContract(`${issueId}-FC01`));
  const approved = applyIssueFixCardContractReview(root, issueId, {
    disposition: "Approved",
    operatorNotes: "Approved.",
    expectedReviewedBodySha256: getIssueFixCardProjection(root, issueId, "planning").controlledDraftBodySha256,
  }, "implement").projection;
  writeSubstantiveReport(root, approved.implementerReportPath);
  return root;
}

function writeControlledFixCardDraft(root, preparedResult, bodyMarkdown) {
  const submission = preparedResult.projection.activePlanningSubmission;
  assert.ok(submission);
  return replaceControlledMarkdownBody(root, {
    relativePath: submission.temporaryDraftPath,
    submissionId: submission.submissionId,
    expectedMetadataSha256: submission.metadataSha256,
    expectedBodySha256: submission.bodySha256,
    bodyMarkdown,
  });
}

function validRepairContract(repairId, parentImplementationId, boundedDefect) {
  const sections = [
    ["Confirmed Defect", boundedDefect],
    ["Source Evidence", `The exact RevisionRequested validation record for ${parentImplementationId} is the sole validation basis.`],
    ["Objective", `Correct only ${boundedDefect} while retaining the root Fix Card objective.`],
    ["Runtime Sequence", `${parentImplementationId} -> ${repairId} -> shared Implementer -> combined review-validation.`],
    ["Required Changes", `Make the narrow identity correction for ${repairId}; route unrelated observations to separate Issues.`],
    ["Preserved Behavior", "Preserve all already-passed behavior, Issue switching, durable history, shared execution, and Development state."],
    ["In-Scope Surface", "Touch only the Issue lifecycle service, typed product path, renderer workspace, and focused tests required by the defect."],
    ["Acceptance Criteria", `Prove ${boundedDefect} is corrected with immediate parent ${parentImplementationId} preserved.`],
    ["Negative Constraints", "Do not add Development parentage, do not overwrite evidence, and do not broaden the Repair."],
    ["Return Target", "review-validation"],
    ["Implementer Report Requirements", `Reserve and update only the exact Issue-owned Implementer Report for ${repairId}.`],
    ["Manual Validation", "Operator confirms the exact evidence and retains final validation basis."],
  ];
  return [`# ${repairId} - Bounded Issue Repair`, "", `Immediate parent implementation: ${parentImplementationId}`, "", ...sections.flatMap(([heading, body]) => [`## ${heading}`, body, "", `${body} This section remains intentionally bounded and preserves causally prior evidence.`, ""])].join("\n");
}

function preparedIssueWithApprovedFixCardMap(issueId) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-issue-fix-card-"));
  writeIssue(root, issueId);
  fs.writeFileSync(path.join(root, "issues", issueId, "ARCHITECT_INVESTIGATION.md"), validInvestigation(issueId), "utf8");
  applyIssueArchitectReview(root, issueId, { disposition: "Approved", operatorNotes: "Proceed." });
  const issuePlanning = promoteValidBundle(root, issueId);
  applyIssuePlanningReview(root, issueId, { disposition: "Approved", operatorNotes: "Approved." });
  assert.equal(issuePlanning.projection.fixCardCandidates.length, 2);
  return root;
}

function promoteValidBundle(root, issueId) {
  const {
    prepareIssuePlanningHandoff,
  } = require("../../dist/main/issueResolution/issueResolutionService.js");
  const prepared = prepareIssuePlanningHandoff(root, issueId);
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan(issueId), "utf8");
  fs.writeFileSync(fixPlanDraft, validFixCardPlan(issueId), "utf8");
  return promoteIssuePlanningDraftBundle(root, issueId);
}

function writeIssue(root, issueId) {
  const issueRoot = path.join(root, "issues", issueId);
  fs.mkdirSync(issueRoot, { recursive: true });
  fs.writeFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), `# ${issueId} - Test Issue\n\n## Issue\nNeeds a bounded correction.`, "utf8");
}

function writeSubstantiveReport(root, reportPath) {
  const absolute = path.join(root, reportPath);
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(absolute, "utf8"));
  const metadata = {
    ...parsed.metadata,
    artifactRevision: parsed.metadata.artifactRevision + 1,
    workflowData: {
      ...parsed.metadata.workflowData,
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/issueResolution/issueResolutionService.ts"],
      implementationSummary: "Implemented the selected Issue Fix Card contract.",
      validationResults: ["node --test passed"],
    },
  };
  fs.writeFileSync(absolute, serializeCanonicalMarkdownDocument(metadata, [
    "# Implementer Report - Updated",
    "",
    "Verified approved repo root.",
    "",
    "## Implementation Summary",
    "Implemented the selected Issue Fix Card contract.",
    "",
    "## Files Modified",
    "src/main/issueResolution/issueResolutionService.ts",
    "",
  ].join("\n")), "utf8");
}

function writeBootstrapCloseRecord(root, issueId, fixCardId) {
  const relativePath = path.join("issues", issueId, "Close_Records", `FIX_CARD_CLOSE_RECORD_${fixCardId}.md`);
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, serializeCanonicalMarkdownDocument({
    schemaVersion: 1,
    artifactType: "fix-card-close-record",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId,
      fixCardId,
      candidateId: fixCardId,
      currentImplementationId: fixCardId,
    },
    sourceRevisions: [],
    workflowData: {
      ownerKind: "issue",
      issueId,
      rootFixCardId: fixCardId,
      currentImplementationId: fixCardId,
      origin: "bootstrap-cutover",
      completionBasis: "operator-bootstrap-cutover",
      returnTarget: "fix-card-map",
    },
    documentDisposition: {
      status: "Approved",
      notes: "Operator accepted one-time bootstrap completion normalization.",
      reviewedAt: "2026-08-31T00:00:00.000Z",
    },
  }, [
    `# ${fixCardId} - Bootstrap Cutover Close Record`,
    "",
    "Operator bootstrap cutover is the completion evidence and does not reconstruct historical validation genealogy.",
    "",
    "Return target: fix-card-map.",
  ].join("\n")), "utf8");
}

function validInvestigation(issueId) {
  return [
    `# ${issueId} — Architect Investigation`,
    "",
    "## Purpose",
    "Establish an evidence-grounded investigation for the selected project issue.",
    "## Issue Assessment",
    "The issue is confirmed by repository evidence and should proceed through Issue Resolution.",
    "## Repository Evidence Inspected",
    "Reviewed the Issue Record, runtime shell contracts, renderer workflow routing, main-process services, and focused tests.",
    "## Confirmed Current Architecture",
    "Issue Resolution is a peer workflow beneath the selected project and must stay separate from Development lifecycle state.",
    "## Root Cause",
    "The missing planning stage lacks an Issue-owned Fix Card implementation loop.",
    "## Required Architecture",
    "Add an Issue-owned Fix Card contract, implementation report, and advisory review path.",
    "## Preservation Rules",
    "Preserve Development workflow state, MCP workspace binding, and overwrite-disabled temporary artifact writes.",
    "## Risks and Constraints",
    "The embedded browser and MCP write-back remain Operator-observed integrations; automated tests cover local contracts only.",
    "## Architect Recommendation",
    "Proceed in Issue Resolution",
    "## Architect Conclusion",
    "Proceed to Issue Planning after this investigation is accepted by the Operator.",
    "",
  ].join("\n");
}

function validIssueResolutionPlan(issueId) {
  return [
    `# ${issueId} — Issue Resolution Plan`,
    "## Accepted Correction Objective",
    "Translate the accepted correction architecture into bounded Fix Card implementation contracts.",
    "## Bounded Scope",
    "Create Issue-owned planning, implementation, and advisory review evidence for selected Fix Cards.",
    "## Non-Scope",
    "Do not create Issue phases, Operator validation, Repair, Close, or Development lifecycle state.",
    "## Architecture Direction",
    "Use Issue Resolution services to own repository paths, validation, and promotion.",
    "## Preservation Requirements",
    "Preserve Issue Intake, Architect Planning, Development state, MCP binding, and approved planning evidence.",
    "## Dependencies and Sequencing",
    "Architect Planning approval comes first, then Issue Planning, then selected Fix Card execution.",
    "## Risks",
    "Invalid Fix Card maps must fail without partial promotion.",
    "## Validation Strategy",
    "Use service and renderer tests for the Issue-owned product path.",
    "## Completion Criteria",
    "Approved planning enables only the Fix Card Map and FC05 nested steps.",
    "",
  ].join("\n");
}

function validFixCardPlan(issueId) {
  return [
    `# ${issueId} — Fix Card Plan`,
    "## Planning Basis",
    "The accepted Architect Investigation is the required basis for bounded Issue-owned Fix Card work.",
    "## Fix Card Decomposition",
    "The correction is decomposed into service and renderer proof so implementation remains bounded.",
    "## Fix Card Map",
    "```champcity-fix-card-plan",
    JSON.stringify([
      {
        fixCardId: `${issueId}-FC01`,
        order: 1,
        title: "Fix Card contract service",
        purpose: "Implement the Issue-owned Fix Card contract, report, Codex context, and advisory review service behavior.",
        dependsOn: [],
        evidencePaths: [`issues/${issueId}/ARCHITECT_INVESTIGATION.md`],
      },
      {
        fixCardId: `${issueId}-FC02`,
        order: 2,
        title: "Fix Card renderer workspace",
        purpose: "Expose the nested Issue Fix Card rail and stage-specific controls without Development phase context.",
        dependsOn: [`${issueId}-FC01`],
        evidencePaths: [`issues/${issueId}/ARCHITECT_REVIEW.md`],
      },
    ], null, 2),
    "```",
    "",
  ].join("\n");
}

function validFixtureFixCardPlan(fixture) {
  return [
    `# ${fixture.issueId} — Fix Card Plan`,
    "## Planning Basis",
    "Repository-backed FC07 regression fixture for dependency and close-record cutover proof.",
    "## Fix Card Decomposition",
    "Nine ordered candidates preserve the ISSUE_001 bootstrap dependency chain.",
    "## Fix Card Map",
    "```champcity-fix-card-plan",
    JSON.stringify(fixture.candidates.map((candidate) => ({
      ...candidate,
      purpose: `Prove bounded lifecycle behavior for ${candidate.fixCardId}.`,
      evidencePaths: [`issues/${fixture.issueId}/ISSUE_RECORD.md`],
    })), null, 2),
    "```",
    "",
  ].join("\n");
}

function validFixCardContract(fixCardId) {
  return [
    `# ${fixCardId} — Fix Card Contract`,
    "## Verified Repository Evidence",
    "The selected Fix Card candidate comes from the current validated Fix Card Map and belongs to the selected Issue.",
    "## Objective",
    "Implement the selected Issue-owned Fix Card through the bounded FC05 runtime sequence.",
    "## Runtime Sequence",
    "Select candidate, plan contract, approve contract, reserve report, run Codex, then prepare advisory review.",
    "## Required Changes",
    "Add Issue-owned contract, Implementer Report, Codex context, and advisory Architect Review behavior.",
    "## Preserved Behavior",
    "Preserve Development workflows, Issue planning eligibility, and map-only behavior for unselected candidates.",
    "## In-Scope Surface",
    "Only Issue Resolution services, typed IPC/preload methods, renderer Fix Card workspaces, and focused tests are in scope.",
    "## Risks and Constraints",
    "Do not add Operator validation, Repair, Close, Issue phases, broad corpus scanning, or fabricated Development parentage.",
    "## Acceptance Criteria",
    "The exact Issue-owned contract and report paths are used, and Architect Review remains advisory.",
    "## Negative Constraints",
    "No fabricated Development parentage, no Development Work Card claims, no validation controls, no repair controls, and no Git mutation.",
    "## Implementer Report Requirements",
    "Update only the exact Issue-owned Implementer Report with files changed, checks, skipped checks, manual validation, and residual risk.",
    "## Manual Validation",
    "Operator later confirms the live nested workflow, embedded Browser GPT handoffs, and unavailable FC06/FC07 controls.",
    "",
  ].join("\n");
}

function validAdvisoryReview(fixCardId, recommendation) {
  return [
    `# Advisory Architect Review — ${fixCardId}`,
    "## Evidence Inspected",
    "Reviewed the exact Fix Card contract, Implementer Report, changed source files, and focused validation evidence.",
    "## Contract Alignment",
    "The implementation evidence aligns with the approved Fix Card contract and preserves Development behavior.",
    "## Blocking Findings",
    "No blocking findings were identified in the inspected FC05 implementation evidence.",
    "## Non-Blocking Concerns",
    "Remaining live Browser GPT behavior belongs to Operator validation.",
    "## Acceptance Criteria Assessment",
    "The Issue-owned contract, report, execution context, and advisory review evidence are materially represented.",
    "## Advisory Recommendation",
    recommendation,
    "## Operator Authority Boundary",
    "This recommendation is advisory only; the Operator retains authority, and FC06 records the validation result.",
    "",
  ].join("\n");
}

function writeControlledRepairBody(root, absolutePath, bodyMarkdown) {
  const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
  const inspection = inspectControlledMarkdownDraft(root, relativePath);
  return replaceControlledMarkdownBody(root, {
    relativePath,
    submissionId: inspection.metadata.identity.submissionId,
    expectedMetadataSha256: inspection.metadataSha256,
    expectedBodySha256: inspection.bodySha256,
    bodyMarkdown,
  });
}
