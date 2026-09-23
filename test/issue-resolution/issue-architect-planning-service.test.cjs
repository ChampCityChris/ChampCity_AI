const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

test("routed defect preserves Intake and branch through RCA, phased correction, stale evidence, and general reroute", async (t) => {
  const { seedPreparedRoutedWorkIntake, bypassWorkIntakeBranchVerification } = require("../support/work-intake-fixtures.cjs");
  const { root, intake, route, git, initialHead } = seedPreparedRoutedWorkIntake(t, "issue-resolution", { workRequest: "Schedule saves fail after reconnect", desiredOutcome: "Existing schedules survive reconnect" });
  bypassWorkIntakeBranchVerification(t);
  const { runWorkIssueAction } = require("../../dist/main/workPlanning/workIssueRoutingService.js");
  const { workPlanningKernel: kernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  const { resolveWorkPlanningProfile } = require("../../dist/main/workPlanning/workPlanningProfiles.js");
  const { getWorkRouteDecision, decideWorkRoute, recommendWorkRouteReroute } = require("../../dist/main/workIntake/workRouteDecisionService.js");
  const { parseCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
  const { __setCanonicalMarkdownWriterTestHooks } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  const { mainPreloadHarness } = require("../support/production-execution.cjs");
  let copied = "";
  const { api } = mainPreloadHarness(["workIssue:action"], { runWorkIssueAction, getRequiredWorkspaceRoot: () => root, clipboard: { writeText: (text) => { copied = text; } } });
  assert.equal((await api.runWorkIssueAction(intake.intakeId, "status")).issueId, null);
  await assert.rejects(kernel.prepare(root, intake.intakeId, "assessment"), /existing RCA workflow/);
  __setCanonicalMarkdownWriterTestHooks({ failInstalledVerification: (target) => target.endsWith("HANDOFF.md") ? Error("Injected handoff failure") : undefined });
  try { await assert.rejects(api.runWorkIssueAction(intake.intakeId, "open"), /Injected handoff failure/); }
  finally { __setCanonicalMarkdownWriterTestHooks({}); }
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_001", "ISSUE_RECORD.md")), false, "Issue creation rolls back when canonical handoff fails");
  let model = await api.runWorkIssueAction(intake.intakeId, "open");
  assert.equal((await api.runWorkIssueAction(intake.intakeId, "open")).issueId, model.issueId);
  const handoff = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, model.handoffPath), "utf8"));
  assert.equal(handoff.metadata.identity.intakeId, intake.intakeId);
  assert.equal(handoff.metadata.identity.routeDecisionId, route.selection.decisionId);
  assert.deepEqual(handoff.metadata.workflowData.branchBinding, intake.branchBinding);
  const handoffPath = path.join(root, model.handoffPath);
  const handoffBytes = fs.readFileSync(handoffPath);
  const retainedSelection = route.selection;
  const pendingRetainedRoute = await recommendWorkRouteReroute(root, intake.intakeId, {
    priorDecisionId: retainedSelection.decisionId,
    replacementRouteId: "feature-change",
    rationale: "Consider whether the defect should instead become feature work.",
    sourceEvidence: [{ path: model.handoffPath, revision: handoff.metadata.artifactRevision }],
  });
  const resolvedRetainedRoute = await decideWorkRoute(root, intake.intakeId, {
    expectedDecisionRevision: pendingRetainedRoute.artifactRevision,
    sourceAssessment: pendingRetainedRoute.sourceAssessment,
    disposition: "override",
    selectedRouteId: "issue-resolution",
    rationale: "Retain Issue Resolution because the defect remains bounded.",
  });
  const retainedIssue = await api.runWorkIssueAction(intake.intakeId, "status");
  assert.equal(resolvedRetainedRoute.selection.decisionId, retainedSelection.decisionId);
  assert.equal(resolvedRetainedRoute.selection.selectedRouteId, retainedSelection.selectedRouteId);
  assert.equal(retainedIssue.issueId, model.issueId);
  assert.equal(retainedIssue.handoffPath, model.handoffPath);
  assert.deepEqual(fs.readFileSync(handoffPath), handoffBytes);
  assert.notEqual(parseCanonicalMarkdownDocument(fs.readFileSync(handoffPath, "utf8")).metadata.participationRole, "historical");
  const recordPath = path.join(root, "issues", model.issueId, "ISSUE_RECORD.md");
  const recordBytes = fs.readFileSync(recordPath, "utf8");
  model = await api.runWorkIssueAction(intake.intakeId, "prepare");
  await api.runWorkIssueAction(intake.intakeId, "copy");
  assert.ok(copied.includes(intake.relativePath)); assert.ok(copied.includes(intake.branchBinding.workBranch));
  assert.match(copied, /direct or phased correction planning/); assert.doesNotMatch(copied, /too broad\/multi-phase/);
  let draftPath = path.join(root, model.architect.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, validInvestigation(model.issueId));
  model = await api.runWorkIssueAction(intake.intakeId, "status");
  assert.equal(model.correctionPlanningReady, false);
  await assert.rejects(kernel.prepare(root, intake.intakeId, "plan"), /approved route-specific assessment/);
  model = await api.runWorkIssueAction(intake.intakeId, "review", { expectedEvidenceDigest: model.reviewEvidenceDigest, review: { disposition: "Approved", operatorNotes: "Root cause requires restore and reconnect proof milestones" } });
  assert.equal(model.correctionPlanningReady, true);
  let plan = await kernel.prepare(root, intake.intakeId, "plan");
  assert.match(plan.preparedInstruction, /phased correction/);
  const item = (id, phaseId, dependsOn) => ({ workItemId: id, phaseId, title: id, purpose: "Correct reconnect lifecycle", dependsOn, acceptanceCriteria: ["Schedule state survives reconnect"] });
  const structure = { topology: "phased", topologyRationale: "Restore state before proving reconnect lifecycle", acceptanceCriteria: ["Schedules survive reconnect"],
    phases: [{ phaseId: "restore", title: "Restore", purpose: "Correct state ownership", dependsOn: [], acceptanceCriteria: ["Restored state matches baseline"] }, { phaseId: "reconnect", title: "Reconnect", purpose: "Prove lifecycle recovery", dependsOn: ["restore"], acceptanceCriteria: ["Repeated reconnect preserves state"] }],
    workItems: [item("WI_RESTORE", "restore", []), item("WI_RECONNECT", "reconnect", ["WI_RESTORE"])] };
  const body = "# Work Plan\n\n" + resolveWorkPlanningProfile("issue-resolution").planSections.map((heading) => `## ${heading}\nPreserve schedules; correct state restoration before reconnect, with regression proof from the approved RCA.`).join("\n\n") + "\n```champcity-work-plan\n" + JSON.stringify(structure) + "\n```\n";
  draftPath = path.join(root, plan.submission.expectedDraftSlots[0].draftRelativePath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true }); fs.writeFileSync(draftPath, body);
  plan = await kernel.get(root, intake.intakeId, "plan");
  assert.equal(plan.artifact.structure.topology, "phased");
  assert.equal(plan.artifact.identity.intakeId, intake.intakeId);
  assert.equal(fs.existsSync(path.join(root, "issues", model.issueId, "ISSUE_RESOLUTION_PLAN.md")), false, "No legacy execution Plan is forced by routed RCA");
  const assessmentBeforeRetainedRoute = await kernel.get(root, intake.intakeId, "assessment");
  const assessmentPath = path.join(root, assessmentBeforeRetainedRoute.artifact.relativePath);
  const planPath = path.join(root, plan.artifact.relativePath);
  const assessmentBytesBeforeRetainedRoute = fs.readFileSync(assessmentPath);
  const planBytesBeforeRetainedRoute = fs.readFileSync(planPath);
  const routeBeforeRetainedRoute = await getWorkRouteDecision(root, intake.intakeId);
  const pendingAssessmentRetainedRoute = await recommendWorkRouteReroute(root, intake.intakeId, {
    priorDecisionId: routeBeforeRetainedRoute.selection.decisionId,
    replacementRouteId: "feature-change",
    rationale: "Reconsider the bounded correction after the phased plan was prepared.",
    sourceEvidence: [{ path: assessmentBeforeRetainedRoute.artifact.relativePath, revision: assessmentBeforeRetainedRoute.artifact.artifactRevision }],
  });
  const resolvedAssessmentRetainedRoute = await decideWorkRoute(root, intake.intakeId, {
    expectedDecisionRevision: pendingAssessmentRetainedRoute.artifactRevision,
    sourceAssessment: pendingAssessmentRetainedRoute.sourceAssessment,
    disposition: "override",
    selectedRouteId: "issue-resolution",
    rationale: "Retain the bounded Issue Resolution route and its phased correction plan.",
  });
  const retainedPlannedIssue = await api.runWorkIssueAction(intake.intakeId, "status");
  const assessmentAfterRetainedRoute = await kernel.get(root, intake.intakeId, "assessment");
  const planAfterRetainedRoute = await kernel.get(root, intake.intakeId, "plan");
  assert.equal(resolvedAssessmentRetainedRoute.selection.decisionId, routeBeforeRetainedRoute.selection.decisionId);
  assert.equal(resolvedAssessmentRetainedRoute.selection.selectedRouteId, routeBeforeRetainedRoute.selection.selectedRouteId);
  assert.equal(retainedPlannedIssue.issueId, model.issueId);
  assert.equal(retainedPlannedIssue.handoffPath, model.handoffPath);
  assert.equal(assessmentAfterRetainedRoute.artifact.artifactRevision, assessmentBeforeRetainedRoute.artifact.artifactRevision);
  assert.equal(planAfterRetainedRoute.artifact.artifactRevision, plan.artifact.artifactRevision);
  assert.deepEqual(fs.readFileSync(assessmentPath), assessmentBytesBeforeRetainedRoute);
  assert.deepEqual(fs.readFileSync(planPath), planBytesBeforeRetainedRoute);
  assert.equal(assessmentAfterRetainedRoute.artifact.stale, false);
  assert.equal(planAfterRetainedRoute.artifact.stale, false);
  fs.appendFileSync(path.join(root, model.architect.finalInvestigationPath), "\nAdditional lifecycle evidence.\n");
  await assert.rejects(api.runWorkIssueAction(intake.intakeId, "review", { expectedEvidenceDigest: model.reviewEvidenceDigest, review: { disposition: "Approved", operatorNotes: "Stale presented evidence" } }), /Presented RCA evidence is stale/);
  await assert.rejects(kernel.get(root, intake.intakeId, "plan"), /approved route-specific assessment/);
  model = await api.runWorkIssueAction(intake.intakeId, "status");
  assert.equal(model.correctionPlanningReady, false, "An old review cannot silently approve changed RCA bytes");
  assert.ok(parseCanonicalMarkdownDocument(fs.readFileSync(assessmentPath, "utf8")).metadata.artifactRevision > assessmentBeforeRetainedRoute.artifact.artifactRevision, "Changed RCA evidence revises the Issue Assessment");
  await api.runWorkIssueAction(intake.intakeId, "review", { expectedEvidenceDigest: model.reviewEvidenceDigest, review: { disposition: "RevisionRequested", operatorNotes: "Investigate whether the request is planned expansion" } });
  model = await api.runWorkIssueAction(intake.intakeId, "prepare");
  draftPath = path.join(root, model.architect.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true }); fs.writeFileSync(draftPath, validInvestigation(model.issueId, "Reframe to Development/Feature"));
  model = await api.runWorkIssueAction(intake.intakeId, "status");
  assert.equal(model.rerouteRecommended, true);
  let pending = await getWorkRouteDecision(root, intake.intakeId);
  assert.equal(pending.state, "reroute-required"); assert.equal(pending.selection.selectedRouteId, "issue-resolution");
  const investigationPath = path.join(root, model.architect.finalInvestigationPath);
  const investigationBytes = fs.readFileSync(investigationPath, "utf8");
  fs.appendFileSync(investigationPath, "\nChanged reroute evidence.\n");
  assert.equal((await getWorkRouteDecision(root, intake.intakeId)).state, "stale");
  await assert.rejects(decideWorkRoute(root, intake.intakeId, { expectedDecisionRevision: pending.artifactRevision, sourceAssessment: pending.sourceAssessment, disposition: "accept", rationale: "Must not accept stale RCA" }), /evidence content changed/);
  fs.writeFileSync(investigationPath, investigationBytes);
  pending = await getWorkRouteDecision(root, intake.intakeId);
  const selected = await decideWorkRoute(root, intake.intakeId, { expectedDecisionRevision: pending.artifactRevision, sourceAssessment: pending.sourceAssessment, disposition: "accept", rationale: "The observed behavior is an explicitly requested capability change" });
  assert.equal(selected.selection.selectedRouteId, "feature-change");
  assert.equal(parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, model.handoffPath), "utf8")).metadata.participationRole, "historical");
  await assert.rejects(api.runWorkIssueAction(intake.intakeId, "status"), /Operator-selected Issue route/);
  assert.equal(fs.readFileSync(recordPath, "utf8"), recordBytes);
  assert.equal(git("rev-parse", "HEAD"), initialHead);
});

const {
  applyIssueArchitectReview,
  getIssueArchitectPlanningProjection,
  prepareIssueArchitectPlanningHandoff,
  promoteIssueArchitectPlanningDraft,
  resolveIssueArchitectPlanningCopyHandoff,
} = require("../../dist/main/issueResolution/issueResolutionService.js");

test("existing ARCHITECT_INVESTIGATION.md awaits Operator review instead of completing", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_001", "# ISSUE_001 - Bootstrap\n\n## Issue\nRead only.");
  const finalPath = writeInvestigation(root, "ISSUE_001", validInvestigation("ISSUE_001"));
  const before = fs.readFileSync(finalPath, "utf8");
  const beforeStats = fs.statSync(finalPath);

  const projection = getIssueArchitectPlanningProjection(root, "ISSUE_001");

  assert.equal(projection.status, "awaiting-operator-review");
  assert.equal(projection.workflowStatus.stateLabel, "Awaiting Operator Review");
  assert.equal(projection.architectRecommendation, "Proceed in Issue Resolution");
  assert.equal(projection.reviewPath, "issues/ISSUE_001/ARCHITECT_REVIEW.md");
  assert.equal(projection.issuePlanningEligible, false);
  assert.equal(projection.finalInvestigationState, "readable");
  assert.equal(projection.canPrepareHandoff, false);
  assert.equal(projection.canPromoteDraft, false);
  assert.equal(fs.readFileSync(finalPath, "utf8"), before);
  assert.equal(fs.statSync(finalPath).mtimeMs, beforeStats.mtimeMs);
});

test("prepare creates an Issue-specific temporary-draft handoff and copy requires it", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_002", "# ISSUE_002 - Blank shell\n\n## Issue\nThe shell is blank.");

  assert.throws(
    () => resolveIssueArchitectPlanningCopyHandoff(root, "ISSUE_002"),
    /Prepare an Issue Architect handoff/,
  );

  const prepared = prepareIssueArchitectPlanningHandoff(root, "ISSUE_002");
  const submission = prepared.projection.activeSubmission;
  assert.ok(submission);
  assert.match(submission.temporaryDraftPath, /^issues\/Architect_Drafts\/.+\/architect-investigation\.md$/);
  assert.equal(prepared.projection.finalInvestigationPath, "issues/ISSUE_002/ARCHITECT_INVESTIGATION.md");

  const { instruction } = resolveIssueArchitectPlanningCopyHandoff(root, "ISSUE_002");
  assert.match(instruction, /MCP workspace binding:/);
  assert.match(instruction, /Issue ID: ISSUE_002/);
  assert.match(instruction, /Issue Record source path: issues\/ISSUE_002\/ISSUE_RECORD\.md/);
  assert.match(instruction, /Final investigation path: issues\/ISSUE_002\/ARCHITECT_INVESTIGATION\.md/);
  assert.match(instruction, /Issue Resolution is broader than software-defect repair/);
  assert.match(instruction, /UX\/design deficiencies/);
  assert.match(instruction, /missing bounded capabilities/);
  assert.match(instruction, /Absence of a pre-existing defective code path is not by itself a reason to reframe/);
  assert.match(instruction, /## Architect Recommendation/);
  assert.match(instruction, /Proceed in Issue Resolution \| Reframe to Development\/Feature \| Unsupported \/ No Action/);
  assert.match(instruction, new RegExp(escapeRegex(`Temporary draft path: ${submission.temporaryDraftPath}`)));
  assert.match(instruction, /artifact_toolbox\.write_markdown_artifact/);
  assert.match(instruction, /"relativePath": "issues\/Architect_Drafts\/.+\/architect-investigation\.md"/);
  assert.match(instruction, /"overwrite": false/);
  assert.doesNotMatch(instruction, /"relativePath": "issues\/ISSUE_002\/ARCHITECT_INVESTIGATION\.md"/);
  assert.match(instruction, /Do not write, overwrite, edit, or create the final investigation path directly/);
  const recordPath = path.join(root, "issues", "ISSUE_002", "ISSUE_RECORD.md");
  fs.appendFileSync(recordPath, "\nChanged reported evidence.\n");
  assert.throws(() => resolveIssueArchitectPlanningCopyHandoff(root, "ISSUE_002"), /Issue evidence changed/);
  const draftPath = path.join(root, submission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, validInvestigation("ISSUE_002"));
  assert.throws(() => promoteIssueArchitectPlanningDraft(root, "ISSUE_002"), /Issue evidence changed/);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_002", "ARCHITECT_INVESTIGATION.md")), false);
});

test("valid active draft promotes to final and cleans the temporary submission", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_003", "# ISSUE_003 - Promote me\n\n## Issue\nNeeds investigation.");
  const prepared = prepareIssueArchitectPlanningHandoff(root, "ISSUE_003");
  const draftPath = path.join(root, prepared.projection.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, validInvestigation("ISSUE_003"), "utf8");

  const promoted = promoteIssueArchitectPlanningDraft(root, "ISSUE_003");

  assert.equal(promoted.projection.status, "awaiting-operator-review");
  const finalPath = path.join(root, "issues", "ISSUE_003", "ARCHITECT_INVESTIGATION.md");
  assert.equal(fs.readFileSync(finalPath, "utf8"), validInvestigation("ISSUE_003"));
  assert.equal(fs.existsSync(draftPath), false);
  assert.doesNotMatch(fs.readFileSync(finalPath, "utf8"), /<!--|canonical|phaseId|workCardId/);
});

test("valid exact active draft auto-promotes from projection refresh", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_006", "# ISSUE_006 - Auto promote\n\n## Issue\nNeeds investigation.");
  const prepared = prepareIssueArchitectPlanningHandoff(root, "ISSUE_006");
  const draftPath = path.join(root, prepared.projection.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, validInvestigation("ISSUE_006"), "utf8");

  const projection = getIssueArchitectPlanningProjection(root, "ISSUE_006");

  assert.equal(projection.status, "awaiting-operator-review");
  assert.equal(projection.workflowStatus.stateLabel, "Awaiting Operator Review");
  assert.equal(projection.finalInvestigationState, "readable");
  assert.equal(projection.architectRecommendation, "Proceed in Issue Resolution");
  assert.equal(projection.canPromoteDraft, false);
  assert.equal(projection.activeSubmission, undefined);
  assert.equal(fs.readFileSync(path.join(root, "issues", "ISSUE_006", "ARCHITECT_INVESTIGATION.md"), "utf8"), validInvestigation("ISSUE_006"));
  assert.equal(fs.existsSync(draftPath), false);
});

test("invalid exact active draft is stable needs-attention and is not retried indefinitely", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_007", "# ISSUE_007 - Invalid auto\n\n## Issue\nNeeds investigation.");
  const prepared = prepareIssueArchitectPlanningHandoff(root, "ISSUE_007");
  const draftPath = path.join(root, prepared.projection.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, "# ISSUE_007 - Wrong\n\n## Purpose\nTBD\n", "utf8");

  const first = getIssueArchitectPlanningProjection(root, "ISSUE_007");
  const second = getIssueArchitectPlanningProjection(root, "ISSUE_007");

  assert.equal(first.status, "needs-attention");
  assert.match(first.statusMessage, /Architect draft validation failed/);
  assert.equal(first.activeSubmission, undefined);
  assert.equal(first.canPrepareHandoff, true);
  assert.equal(first.canCopyHandoff, false);
  assert.equal(first.canPromoteDraft, false);
  assert.equal(second.status, "needs-attention");
  assert.equal(second.statusMessage, first.statusMessage);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_007", "ARCHITECT_INVESTIGATION.md")), false);
  assert.equal(fs.existsSync(draftPath), true);
});

test("unrelated stale Architect draft is ignored without active submission identity", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_008", "# ISSUE_008 - Stale draft\n\n## Issue\nNeeds investigation.");
  const staleDraftPath = path.join(root, "issues", "Architect_Drafts", "stale-submission", "architect-investigation.md");
  fs.mkdirSync(path.dirname(staleDraftPath), { recursive: true });
  fs.writeFileSync(staleDraftPath, validInvestigation("ISSUE_008"), "utf8");

  const projection = getIssueArchitectPlanningProjection(root, "ISSUE_008");

  assert.equal(projection.status, "ready-for-handoff");
  assert.equal(projection.finalInvestigationState, "missing");
  assert.equal(projection.activeSubmission, undefined);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_008", "ARCHITECT_INVESTIGATION.md")), false);
  assert.equal(fs.existsSync(staleDraftPath), true);
});

test("invalid drafts are rejected and retry uses a fresh prepared submission", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_004", "# ISSUE_004 - Retry me\n\n## Issue\nNeeds investigation.");
  const first = prepareIssueArchitectPlanningHandoff(root, "ISSUE_004");
  const firstDraft = path.join(root, first.projection.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(firstDraft), { recursive: true });
  fs.writeFileSync(firstDraft, "# ISSUE_004 - Wrong\n\n## Purpose\nTBD\n", "utf8");

  assert.throws(
    () => promoteIssueArchitectPlanningDraft(root, "ISSUE_004"),
    /Architect draft validation failed/,
  );
  assert.equal(getIssueArchitectPlanningProjection(root, "ISSUE_004").activeSubmission, undefined);

  const second = prepareIssueArchitectPlanningHandoff(root, "ISSUE_004");
  assert.notEqual(
    second.projection.activeSubmission.temporaryDraftPath,
    first.projection.activeSubmission.temporaryDraftPath,
  );
  const secondDraft = path.join(root, second.projection.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(secondDraft), { recursive: true });
  fs.writeFileSync(secondDraft, validInvestigation("ISSUE_004"), "utf8");

  const promoted = promoteIssueArchitectPlanningDraft(root, "ISSUE_004");
  assert.equal(promoted.projection.finalInvestigationState, "readable");
  assert.equal(promoted.projection.status, "awaiting-operator-review");
});

test("promotion never overwrites an existing final investigation", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_005", "# ISSUE_005 - Protect me\n\n## Issue\nNeeds investigation.");
  const prepared = prepareIssueArchitectPlanningHandoff(root, "ISSUE_005");
  const draftPath = path.join(root, prepared.projection.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, validInvestigation("ISSUE_005"), "utf8");
  const finalPath = writeInvestigation(root, "ISSUE_005", "# Existing final\n");

  assert.throws(
    () => promoteIssueArchitectPlanningDraft(root, "ISSUE_005"),
    /already exists and requires Operator disposition before replacement/,
  );
  assert.equal(fs.readFileSync(finalPath, "utf8"), "# Existing final\n");
});

test("draft validation accepts only the three exact Architect Recommendations", () => {
  const root = tempProject();
  for (const [index, recommendation] of [
    "Proceed in Issue Resolution",
    "Reframe to Development/Feature",
    "Unsupported / No Action",
  ].entries()) {
    const issueId = `ISSUE_01${index}`;
    writeIssue(root, issueId, `# ${issueId} - Recommendation\n\n## Issue\nNeeds investigation.`);
    const prepared = prepareIssueArchitectPlanningHandoff(root, issueId);
    const draftPath = path.join(root, prepared.projection.activeSubmission.temporaryDraftPath);
    fs.mkdirSync(path.dirname(draftPath), { recursive: true });
    fs.writeFileSync(draftPath, validInvestigation(issueId, recommendation), "utf8");

    const promoted = promoteIssueArchitectPlanningDraft(root, issueId);

    assert.equal(promoted.projection.architectRecommendation, recommendation);
    assert.equal(promoted.projection.status, "awaiting-operator-review");
  }

  writeIssue(root, "ISSUE_020", "# ISSUE_020 - Invalid\n\n## Issue\nNeeds investigation.");
  const prepared = prepareIssueArchitectPlanningHandoff(root, "ISSUE_020");
  const draftPath = path.join(root, prepared.projection.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, validInvestigation("ISSUE_020").replace(
    "Proceed in Issue Resolution",
    "Proceed eventually",
  ), "utf8");
  assert.throws(
    () => promoteIssueArchitectPlanningDraft(root, "ISSUE_020"),
    /Architect Recommendation/,
  );
});

test("Operator review persists dispositions and only Approved Proceed enables Issue Planning", () => {
  const root = tempProject();
  for (const [issueId, recommendation, expectedStatus, expectedEligible] of [
    ["ISSUE_030", "Proceed in Issue Resolution", "approved-ready-for-issue-planning", true],
    ["ISSUE_031", "Reframe to Development/Feature", "approved-reframe-recommended", false],
    ["ISSUE_032", "Unsupported / No Action", "approved-unsupported-no-action", false],
  ]) {
    writeIssue(root, issueId, `# ${issueId} - Review\n\n## Issue\nNeeds investigation.`);
    writeInvestigation(root, issueId, validInvestigation(issueId, recommendation));

    const reviewed = applyIssueArchitectReview(root, issueId, {
      disposition: "Approved",
      operatorNotes: "Accepted.",
    });

    assert.equal(reviewed.projection.status, expectedStatus);
    assert.equal(reviewed.projection.issuePlanningEligible, expectedEligible);
    assert.equal(reviewed.projection.workflowStatus.issuePlanningEligible, expectedEligible);
    assert.equal(reviewed.projection.operatorDisposition, "Approved");
    assert.equal(reviewed.projection.operatorReviewNotes, "Accepted.");
    assert.equal(reviewed.postMutation.navigation.issueId, issueId);
    assert.equal(reviewed.postMutation.navigation.issuePlanningAvailable, expectedEligible);
    const reviewBody = fs.readFileSync(path.join(root, "issues", issueId, "ARCHITECT_REVIEW.md"), "utf8");
    assert.match(reviewBody, new RegExp(`## Issue ID\\n${issueId}`));
    assert.match(reviewBody, new RegExp(`## Architect Recommendation\\n${escapeRegex(recommendation)}`));
    assert.match(reviewBody, /## Operator Disposition\nApproved/);
  }

  writeIssue(root, "ISSUE_033", "# ISSUE_033 - Reject\n\n## Issue\nNeeds investigation.");
  writeInvestigation(root, "ISSUE_033", validInvestigation("ISSUE_033"));
  const rejected = applyIssueArchitectReview(root, "ISSUE_033", {
    disposition: "Rejected",
  });
  assert.equal(rejected.projection.status, "rejected-needs-attention");
  assert.equal(rejected.projection.issuePlanningEligible, false);
});

test("RevisionRequested requires notes, prepares revision-aware handoff, and archives prior current files", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_040", "# ISSUE_040 - Revise\n\n## Issue\nNeeds revision.");
  writeInvestigation(root, "ISSUE_040", validInvestigation("ISSUE_040"));
  assert.throws(
    () => applyIssueArchitectReview(root, "ISSUE_040", { disposition: "RevisionRequested" }),
    /requires Operator notes/,
  );
  const revision = applyIssueArchitectReview(root, "ISSUE_040", {
    disposition: "RevisionRequested",
    operatorNotes: "Address the bounded UX evidence exactly.",
  });
  assert.equal(revision.projection.status, "revision-requested");
  assert.equal(revision.projection.canPrepareHandoff, true);

  const prepared = prepareIssueArchitectPlanningHandoff(root, "ISSUE_040");
  const { instruction } = resolveIssueArchitectPlanningCopyHandoff(root, "ISSUE_040");
  assert.match(instruction, /Revision context:/);
  assert.match(instruction, /The Operator disposition is RevisionRequested/);
  assert.match(instruction, /Address the bounded UX evidence exactly\./);
  assert.match(instruction, /Current investigation to revise:/);

  const draftPath = path.join(root, prepared.projection.activeSubmission.temporaryDraftPath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  const revisedBody = validInvestigation("ISSUE_040").replace(
    "The issue is confirmed by repository evidence",
    "The revised issue is confirmed by repository evidence",
  );
  fs.writeFileSync(draftPath, revisedBody, "utf8");

  const promoted = getIssueArchitectPlanningProjection(root, "ISSUE_040");

  assert.equal(promoted.status, "awaiting-operator-review");
  assert.equal(promoted.operatorDisposition, undefined);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_040", "ARCHITECT_REVIEW.md")), false);
  assert.equal(
    fs.readFileSync(path.join(root, "issues", "ISSUE_040", "ARCHITECT_INVESTIGATION.md"), "utf8"),
    revisedBody,
  );
  assert.equal(
    fs.existsSync(path.join(root, "issues", "ISSUE_040", "Architect_History", "revision-001", "ARCHITECT_INVESTIGATION.md")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(root, "issues", "ISSUE_040", "Architect_History", "revision-001", "ARCHITECT_REVIEW.md")),
    true,
  );
});

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-issue-architect-"));
}

function writeIssue(root, issueId, body) {
  const issueRoot = path.join(root, "issues", issueId);
  fs.mkdirSync(issueRoot, { recursive: true });
  fs.writeFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), body, "utf8");
}

function writeInvestigation(root, issueId, body) {
  const finalPath = path.join(root, "issues", issueId, "ARCHITECT_INVESTIGATION.md");
  fs.writeFileSync(finalPath, body, "utf8");
  return finalPath;
}

function validInvestigation(issueId, recommendation = "Proceed in Issue Resolution") {
  return [
    `# ${issueId} \u2014 Architect Investigation`,
    "",
    "## Purpose",
    "Establish an evidence-grounded investigation for the selected project issue.",
    "",
    "## Issue Assessment",
    "The issue is confirmed by repository evidence and should proceed through Issue Resolution.",
    "",
    "## Repository Evidence Inspected",
    "Reviewed the Issue Record, runtime shell contracts, renderer workflow routing, main-process services, and focused tests.",
    "",
    "## Confirmed Current Architecture",
    "Issue Resolution is a peer workflow beneath the selected project and must stay separate from Development lifecycle state.",
    "",
    "## Root Cause",
    "The missing stage behavior is caused by Architect Planning not yet having an Issue-owned service and projection.",
    "",
    "## Required Architecture",
    "Add an Issue-owned Architect Planning path that prepares a temporary draft and promotes it only after validation.",
    "",
    "## Preservation Rules",
    "Preserve Development workflow state, Issue Record read-only behavior, MCP workspace binding, and overwrite-disabled artifact writes.",
    "",
    "## Risks and Constraints",
    "The embedded browser and MCP write-back remain Operator-observed integrations; automated tests cover local contracts only.",
    "",
    "## Architect Recommendation",
    recommendation,
    "",
    "## Architect Conclusion",
    "Proceed to Issue Planning after this investigation is accepted by the Operator.",
    "",
  ].join("\n");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
