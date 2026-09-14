const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  applyIssueArchitectReview,
  applyIssuePlanningReview,
  __setIssueProjectionReadTestHooks,
  getIssueResolutionNavigationProjection,
  getIssuePlanningProjection,
  prepareIssuePlanningHandoff,
  promoteIssuePlanningDraftBundle,
  resolveIssuePlanningCopyHandoff,
} = require("../../dist/main/issueResolution/issueResolutionService.js");

test("Issue navigation reuses one request-scoped inventory and each Markdown read", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_070");
  let directoryDiscoveries = 0;
  const readsByPath = new Map();
  __setIssueProjectionReadTestHooks({
    onDirectoryDiscovery: () => { directoryDiscoveries += 1; },
    onMarkdownRead: (relativePath) => {
      readsByPath.set(relativePath, (readsByPath.get(relativePath) ?? 0) + 1);
    },
  });

  try {
    const projection = getIssueResolutionNavigationProjection(root, "ISSUE_070");
    assert.equal(projection.issuePlanningAvailable, true);
    assert.equal(directoryDiscoveries, 1);
    assert.equal(readsByPath.get("issues/ISSUE_070/ISSUE_RECORD.md"), 1);
    assert.ok([...readsByPath.values()].every((count) => count === 1));
  } finally {
    __setIssueProjectionReadTestHooks();
  }
});

test("Issue Planning reads a complete approved planning evidence set once per path", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_073");
  promoteValidBundle(root, "ISSUE_073");
  applyIssuePlanningReview(root, "ISSUE_073", {
    disposition: "Approved",
    operatorNotes: "Proceed to Fix Cards.",
  });
  let directoryDiscoveries = 0;
  const readsByPath = new Map();
  __setIssueProjectionReadTestHooks({
    onDirectoryDiscovery: () => { directoryDiscoveries += 1; },
    onMarkdownRead: (relativePath) => {
      readsByPath.set(relativePath, (readsByPath.get(relativePath) ?? 0) + 1);
    },
  });

  try {
    const projection = getIssuePlanningProjection(root, "ISSUE_073");
    assert.equal(projection.status, "approved-ready-for-fix-cards");
    assert.equal(projection.fixCardCandidates.length, 2);
    assert.equal(directoryDiscoveries, 1);
    assert.equal(readsByPath.size, 6);
    assert.deepEqual(
      [...readsByPath.entries()].filter(([, count]) => count !== 1),
      [],
    );
  } finally {
    __setIssueProjectionReadTestHooks();
  }
});

test("Issue Planning review mutation returns a fresh post-write projection", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_074");
  promoteValidBundle(root, "ISSUE_074");
  let directoryDiscoveries = 0;
  let postMutationContexts = 0;
  const postMutationReads = new Map();
  __setIssueProjectionReadTestHooks({
    onDirectoryDiscovery: () => { directoryDiscoveries += 1; },
    onContextCreated: (_workspaceRoot, purpose) => {
      if (purpose === "post-mutation") postMutationContexts += 1;
    },
    onMarkdownReadComplete: (relativePath, _bodyMarkdown, purpose) => {
      if (purpose !== "post-mutation") return;
      postMutationReads.set(relativePath, (postMutationReads.get(relativePath) ?? 0) + 1);
    },
  });

  try {
    const result = applyIssuePlanningReview(root, "ISSUE_074", {
      disposition: "Approved",
      operatorNotes: "Persist and immediately re-read the review.",
    });
    assert.equal(result.projection.status, "approved-ready-for-fix-cards");
    assert.equal(result.projection.operatorDisposition, "Approved");
    assert.equal(result.postMutation.navigation.currentStageId, "fix-cards");
    assert.equal(postMutationContexts, 1);
    assert.deepEqual([...postMutationReads.entries()].filter(([, count]) => count !== 1), []);
    assert.equal(directoryDiscoveries, 2);
  } finally {
    __setIssueProjectionReadTestHooks();
  }
});

test("Issue navigation is generation-coherent and observes external edits next call", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_071");
  const recordPath = path.join(root, "issues", "ISSUE_071", "ISSUE_RECORD.md");
  let injected = false;
  __setIssueProjectionReadTestHooks({
    onMarkdownReadComplete: (relativePath) => {
      if (injected || relativePath !== "issues/ISSUE_071/ISSUE_RECORD.md") return;
      injected = true;
      fs.writeFileSync(
        recordPath,
        "# ISSUE_071 - Changed After Snapshot\n\n## Issue\nThe next call should observe this edit.",
        "utf8",
      );
    },
  });

  try {
    const stableProjection = getIssueResolutionNavigationProjection(root, "ISSUE_071");
    assert.equal(stableProjection.title, "Test Issue");
  } finally {
    __setIssueProjectionReadTestHooks();
  }

  const refreshedProjection = getIssueResolutionNavigationProjection(root, "ISSUE_071");
  assert.equal(refreshedProjection.title, "Changed After Snapshot");
});

test("Issue navigation observes externally deleted evidence on the next call", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_072");
  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_072").issuePlanningAvailable, true);

  fs.unlinkSync(path.join(root, "issues", "ISSUE_072", "ARCHITECT_REVIEW.md"));

  assert.equal(getIssueResolutionNavigationProjection(root, "ISSUE_072").issuePlanningAvailable, false);
});

test("Issue Planning eligibility follows approved Proceed Architect Planning only", () => {
  const root = tempProject();
  for (const [issueId, recommendation, disposition, expectedEligible] of [
    ["ISSUE_001", "Proceed in Issue Resolution", "Approved", true],
    ["ISSUE_002", "Reframe to Development/Feature", "Approved", false],
    ["ISSUE_003", "Unsupported / No Action", "Approved", false],
    ["ISSUE_004", "Proceed in Issue Resolution", "Rejected", false],
    ["ISSUE_005", "Proceed in Issue Resolution", "RevisionRequested", false],
  ]) {
    writeIssue(root, issueId);
    writeInvestigation(root, issueId, validInvestigation(issueId, recommendation));
    applyIssueArchitectReview(root, issueId, {
      disposition,
      operatorNotes: disposition === "RevisionRequested" ? "Revise." : "",
    });

    const projection = getIssuePlanningProjection(root, issueId);

    assert.equal(projection.architectPlanningEligible, expectedEligible);
    assert.equal(projection.workflowStatus.stageLabel, "Issue Planning");
    assert.equal(projection.workflowStatus.issuePlanningEligible, expectedEligible);
    assert.equal(
      projection.status,
      expectedEligible ? "ready-for-handoff" : "blocked-architect-planning-not-eligible",
    );
  }
});

test("prepare creates one bound handoff for exactly two temporary planning drafts", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_010");

  assert.throws(
    () => resolveIssuePlanningCopyHandoff(root, "ISSUE_010"),
    /Prepare an Issue Planning handoff/,
  );

  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_010");
  const submission = prepared.projection.activeSubmission;

  assert.ok(submission);
  assert.match(submission.issueResolutionPlanDraftPath, /^issues\/Architect_Drafts\/.+\/issue-resolution-plan\.md$/);
  assert.match(submission.fixCardPlanDraftPath, /^issues\/Architect_Drafts\/.+\/fix-card-plan\.md$/);
  assert.equal(prepared.projection.issueResolutionPlanPath, "issues/ISSUE_010/ISSUE_RESOLUTION_PLAN.md");
  assert.equal(prepared.projection.fixCardPlanPath, "issues/ISSUE_010/FIX_CARD_PLAN.md");

  const { instruction } = resolveIssuePlanningCopyHandoff(root, "ISSUE_010");
  assert.match(instruction, /MCP workspace binding:/);
  assert.match(instruction, /Issue ID: ISSUE_010/);
  assert.match(instruction, /Issue Record path: issues\/ISSUE_010\/ISSUE_RECORD\.md/);
  assert.match(instruction, /Accepted Architect Investigation path: issues\/ISSUE_010\/ARCHITECT_INVESTIGATION\.md/);
  assert.match(instruction, /Architect Review disposition: Approved/);
  assert.match(instruction, /Architect Recommendation: Proceed in Issue Resolution/);
  assert.match(instruction, /Temporary Issue Resolution Plan draft path: issues\/Architect_Drafts\/.+\/issue-resolution-plan\.md/);
  assert.match(instruction, /Temporary Fix Card Plan draft path: issues\/Architect_Drafts\/.+\/fix-card-plan\.md/);
  assert.match(instruction, /artifact_toolbox\.write_markdown_artifact/);
  assert.match(instruction, /"overwrite": false/);
  assert.match(instruction, /"relativePath": "issues\/Architect_Drafts\/.+\/issue-resolution-plan\.md"/);
  assert.match(instruction, /"relativePath": "issues\/Architect_Drafts\/.+\/fix-card-plan\.md"/);
  assert.doesNotMatch(instruction, /"relativePath": "issues\/ISSUE_010\/ISSUE_RESOLUTION_PLAN\.md"/);
  assert.doesNotMatch(instruction, /"relativePath": "issues\/ISSUE_010\/FIX_CARD_PLAN\.md"/);
});

test("partial planning bundle waits and valid exact two-draft submission auto-promotes atomically", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_020");
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_020");
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan("ISSUE_020"), "utf8");

  const waiting = getIssuePlanningProjection(root, "ISSUE_020");
  assert.equal(waiting.status, "waiting-for-drafts");
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_020", "ISSUE_RESOLUTION_PLAN.md")), false);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_020", "FIX_CARD_PLAN.md")), false);

  fs.writeFileSync(fixPlanDraft, validFixCardPlan("ISSUE_020"), "utf8");
  const promoted = getIssuePlanningProjection(root, "ISSUE_020");

  assert.equal(promoted.status, "awaiting-operator-review");
  assert.equal(promoted.fixCardCandidates.length, 2);
  assert.equal(fs.existsSync(issuePlanDraft), false);
  assert.equal(fs.existsSync(fixPlanDraft), false);
  assert.equal(fs.readFileSync(path.join(root, "issues", "ISSUE_020", "ISSUE_RESOLUTION_PLAN.md"), "utf8"), validIssueResolutionPlan("ISSUE_020"));
  assert.equal(fs.readFileSync(path.join(root, "issues", "ISSUE_020", "FIX_CARD_PLAN.md"), "utf8"), validFixCardPlan("ISSUE_020"));
});

test("invalid member promotes neither and does not retry-loop the same submission", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_030");
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_030");
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan("ISSUE_030"), "utf8");
  fs.writeFileSync(fixPlanDraft, "# ISSUE_030 - Wrong\n\n```champcity-fix-card-plan\n[]\n```\n", "utf8");

  const first = getIssuePlanningProjection(root, "ISSUE_030");
  const second = getIssuePlanningProjection(root, "ISSUE_030");

  assert.equal(first.status, "needs-attention");
  assert.match(first.statusMessage, /Issue Planning draft validation failed/);
  assert.equal(second.status, "needs-attention");
  assert.equal(second.statusMessage, first.statusMessage);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_030", "ISSUE_RESOLUTION_PLAN.md")), false);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_030", "FIX_CARD_PLAN.md")), false);
});

test("stale unrelated planning drafts are ignored without active submission identity", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_040");
  const staleRoot = path.join(root, "issues", "Architect_Drafts", "stale-submission");
  fs.mkdirSync(staleRoot, { recursive: true });
  fs.writeFileSync(path.join(staleRoot, "issue-resolution-plan.md"), validIssueResolutionPlan("ISSUE_040"), "utf8");
  fs.writeFileSync(path.join(staleRoot, "fix-card-plan.md"), validFixCardPlan("ISSUE_040"), "utf8");

  const projection = getIssuePlanningProjection(root, "ISSUE_040");

  assert.equal(projection.status, "ready-for-handoff");
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_040", "ISSUE_RESOLUTION_PLAN.md")), false);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_040", "FIX_CARD_PLAN.md")), false);
});

test("legacy bootstrap planning projects adoption state with handoff available without mutating current files", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_045");
  const issuePlanPath = path.join(root, "issues", "ISSUE_045", "ISSUE_RESOLUTION_PLAN.md");
  const fixPlanPath = path.join(root, "issues", "ISSUE_045", "FIX_CARD_PLAN.md");
  fs.writeFileSync(issuePlanPath, bootstrapIssueResolutionPlan("ISSUE_045"), "utf8");
  fs.writeFileSync(fixPlanPath, bootstrapFixCardPlan("ISSUE_045"), "utf8");
  const beforeIssuePlan = fs.readFileSync(issuePlanPath, "utf8");
  const beforeFixPlan = fs.readFileSync(fixPlanPath, "utf8");
  const beforeIssuePlanStats = fs.statSync(issuePlanPath);
  const beforeFixPlanStats = fs.statSync(fixPlanPath);

  const projection = getIssuePlanningProjection(root, "ISSUE_045");

  assert.equal(projection.status, "needs-attention");
  assert.match(projection.statusMessage, /Bootstrap planning requires FC04 adoption/);
  assert.equal(projection.canPrepareHandoff, true);
  assert.equal(projection.canApplyReview, false);
  assert.equal(fs.readFileSync(issuePlanPath, "utf8"), beforeIssuePlan);
  assert.equal(fs.readFileSync(fixPlanPath, "utf8"), beforeFixPlan);
  assert.equal(fs.statSync(issuePlanPath).mtimeMs, beforeIssuePlanStats.mtimeMs);
  assert.equal(fs.statSync(fixPlanPath).mtimeMs, beforeFixPlanStats.mtimeMs);

  prepareIssuePlanningHandoff(root, "ISSUE_045");
  const { instruction } = resolveIssuePlanningCopyHandoff(root, "ISSUE_045");
  assert.match(instruction, /Bootstrap adoption context:/);
  assert.match(instruction, /Prior Issue Resolution Plan context path: issues\/ISSUE_045\/ISSUE_RESOLUTION_PLAN\.md/);
  assert.match(instruction, /Prior Fix Card Plan context path: issues\/ISSUE_045\/FIX_CARD_PLAN\.md/);
  assert.match(instruction, /exactly two fresh FC04-format temporary drafts/);
  assert.match(instruction, /# ISSUE_045 .* Legacy Issue Resolution Plan/);
  assert.match(instruction, /ISSUE_045-FC01/);
});

test("invalid bootstrap adoption drafts preserve both old current planning files", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_046");
  const issuePlanPath = path.join(root, "issues", "ISSUE_046", "ISSUE_RESOLUTION_PLAN.md");
  const fixPlanPath = path.join(root, "issues", "ISSUE_046", "FIX_CARD_PLAN.md");
  fs.writeFileSync(issuePlanPath, bootstrapIssueResolutionPlan("ISSUE_046"), "utf8");
  fs.writeFileSync(fixPlanPath, bootstrapFixCardPlan("ISSUE_046"), "utf8");
  const oldIssuePlan = fs.readFileSync(issuePlanPath, "utf8");
  const oldFixPlan = fs.readFileSync(fixPlanPath, "utf8");
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_046");
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan("ISSUE_046"), "utf8");
  fs.writeFileSync(fixPlanDraft, "# ISSUE_046 - Wrong\n\n```champcity-fix-card-plan\n[]\n```\n", "utf8");

  const projection = getIssuePlanningProjection(root, "ISSUE_046");

  assert.equal(projection.status, "needs-attention");
  assert.match(projection.statusMessage, /Issue Planning draft validation failed/);
  assert.equal(fs.readFileSync(issuePlanPath, "utf8"), oldIssuePlan);
  assert.equal(fs.readFileSync(fixPlanPath, "utf8"), oldFixPlan);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_046", "Issue_Planning_History")), false);
});

test("valid bootstrap adoption archives old finals, creates no fake review, and installs generated bundle", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_047");
  const issuePlanPath = path.join(root, "issues", "ISSUE_047", "ISSUE_RESOLUTION_PLAN.md");
  const fixPlanPath = path.join(root, "issues", "ISSUE_047", "FIX_CARD_PLAN.md");
  fs.writeFileSync(issuePlanPath, bootstrapIssueResolutionPlan("ISSUE_047"), "utf8");
  fs.writeFileSync(fixPlanPath, bootstrapFixCardPlan("ISSUE_047"), "utf8");
  const oldIssuePlan = fs.readFileSync(issuePlanPath, "utf8");
  const oldFixPlan = fs.readFileSync(fixPlanPath, "utf8");
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_047");
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan("ISSUE_047"), "utf8");
  fs.writeFileSync(fixPlanDraft, validFixCardPlan("ISSUE_047"), "utf8");

  const promoted = getIssuePlanningProjection(root, "ISSUE_047");

  assert.equal(promoted.status, "awaiting-operator-review");
  assert.equal(promoted.reviewState, "missing");
  assert.equal(promoted.fixCardCandidates.length, 2);
  assert.equal(fs.readFileSync(issuePlanPath, "utf8"), validIssueResolutionPlan("ISSUE_047"));
  assert.equal(fs.readFileSync(fixPlanPath, "utf8"), validFixCardPlan("ISSUE_047"));
  assert.equal(
    fs.readFileSync(path.join(root, "issues", "ISSUE_047", "Issue_Planning_History", "revision-001", "ISSUE_RESOLUTION_PLAN.md"), "utf8"),
    oldIssuePlan,
  );
  assert.equal(
    fs.readFileSync(path.join(root, "issues", "ISSUE_047", "Issue_Planning_History", "revision-001", "FIX_CARD_PLAN.md"), "utf8"),
    oldFixPlan,
  );
  assert.equal(
    fs.existsSync(path.join(root, "issues", "ISSUE_047", "Issue_Planning_History", "revision-001", "ISSUE_PLANNING_REVIEW.md")),
    false,
  );
});

test("malformed governed generated bundle remains attention-blocked instead of bootstrap adoption", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_048");
  fs.writeFileSync(
    path.join(root, "issues", "ISSUE_048", "ISSUE_RESOLUTION_PLAN.md"),
    validIssueResolutionPlan("ISSUE_048").replace("## Bounded Scope", "## Missing Scope"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, "issues", "ISSUE_048", "FIX_CARD_PLAN.md"),
    [
      "# ISSUE_048 \u2014 Fix Card Plan",
      "",
      "## Planning Basis",
      "Generated but malformed planning evidence.",
      "",
      "## Fix Card Decomposition",
      "Generated but malformed planning evidence.",
      "",
      "## Fix Card Map",
      "```champcity-fix-card-plan",
      "[]",
      "```",
      "",
    ].join("\n"),
    "utf8",
  );

  const projection = getIssuePlanningProjection(root, "ISSUE_048");

  assert.equal(projection.status, "needs-attention");
  assert.match(projection.statusMessage, /Issue Planning bundle validation failed/);
  assert.equal(projection.canPrepareHandoff, false);
});

test("Fix Card Plan parser rejects nonsequential IDs, cycles, absolute evidence, and lifecycle state", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_050");
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_050");
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan("ISSUE_050"), "utf8");
  fs.writeFileSync(fixPlanDraft, invalidFixCardPlan("ISSUE_050"), "utf8");

  assert.throws(
    () => promoteIssuePlanningDraftBundle(root, "ISSUE_050"),
    /ID must be ISSUE_050-FC02|dependency cycle|lifecycle result field|repository-relative/,
  );
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_050", "FIX_CARD_PLAN.md")), false);
});

test("planning review approval enables Fix Cards and revision archives prior bundle before replacement", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_060");
  promoteValidBundle(root, "ISSUE_060");

  const approved = applyIssuePlanningReview(root, "ISSUE_060", {
    disposition: "Approved",
    operatorNotes: "Accepted.",
  });
  assert.equal(approved.projection.status, "approved-ready-for-fix-cards");
  assert.equal(approved.projection.fixCardsEligible, true);

  makeEligibleIssue(root, "ISSUE_061");
  promoteValidBundle(root, "ISSUE_061");
  assert.throws(
    () => applyIssuePlanningReview(root, "ISSUE_061", { disposition: "RevisionRequested" }),
    /requires Operator notes/,
  );
  const revision = applyIssuePlanningReview(root, "ISSUE_061", {
    disposition: "RevisionRequested",
    operatorNotes: "Split the evidence handling card.",
  });
  assert.equal(revision.projection.status, "revision-requested");
  assert.equal(revision.projection.canPrepareHandoff, true);

  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_061");
  const { instruction } = resolveIssuePlanningCopyHandoff(root, "ISSUE_061");
  assert.match(instruction, /Revision context:/);
  assert.match(instruction, /Split the evidence handling card\./);
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan("ISSUE_061").replace("accepted correction", "revised accepted correction"), "utf8");
  fs.writeFileSync(fixPlanDraft, validFixCardPlan("ISSUE_061", "Revised planning bundle service"), "utf8");

  const promoted = getIssuePlanningProjection(root, "ISSUE_061");

  assert.equal(promoted.status, "awaiting-operator-review");
  assert.equal(promoted.operatorDisposition, undefined);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_061", "ISSUE_PLANNING_REVIEW.md")), false);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_061", "Issue_Planning_History", "revision-001", "ISSUE_RESOLUTION_PLAN.md")), true);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_061", "Issue_Planning_History", "revision-001", "FIX_CARD_PLAN.md")), true);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_061", "Issue_Planning_History", "revision-001", "ISSUE_PLANNING_REVIEW.md")), true);
});

test("navigation projection derives stage availability without draft promotion or writes", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_064");
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_064");
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan("ISSUE_064"), "utf8");
  fs.writeFileSync(fixPlanDraft, validFixCardPlan("ISSUE_064"), "utf8");

  const navigation = getIssueResolutionNavigationProjection(root, "ISSUE_064");

  assert.equal(navigation.issuePlanningAvailable, true);
  assert.equal(navigation.fixCardsAvailable, false);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "issue-planning").available, true);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "fix-cards").available, false);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_064", "ISSUE_RESOLUTION_PLAN.md")), false);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_064", "FIX_CARD_PLAN.md")), false);
  assert.equal(fs.existsSync(issuePlanDraft), true);
  assert.equal(fs.existsSync(fixPlanDraft), true);

  promoteIssuePlanningDraftBundle(root, "ISSUE_064");
  applyIssuePlanningReview(root, "ISSUE_064", {
    disposition: "Approved",
    operatorNotes: "Accepted.",
  });
  const approvedNavigation = getIssueResolutionNavigationProjection(root, "ISSUE_064");

  assert.equal(approvedNavigation.fixCardsAvailable, true);
  assert.equal(approvedNavigation.fixCardsWorkflowStatus.stateLabel, "Fix Card Map Ready");
  assert.equal(approvedNavigation.stages.find((stage) => stage.stageId === "fix-cards").available, true);
});

test("revision replacement rollback restores complete current bundle and review after swap failure", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_062");
  promoteValidBundle(root, "ISSUE_062");
  applyIssuePlanningReview(root, "ISSUE_062", {
    disposition: "RevisionRequested",
    operatorNotes: "Revise atomically.",
  });
  const issuePlanPath = path.join(root, "issues", "ISSUE_062", "ISSUE_RESOLUTION_PLAN.md");
  const fixPlanPath = path.join(root, "issues", "ISSUE_062", "FIX_CARD_PLAN.md");
  const reviewPath = path.join(root, "issues", "ISSUE_062", "ISSUE_PLANNING_REVIEW.md");
  const oldIssuePlan = fs.readFileSync(issuePlanPath, "utf8");
  const oldFixPlan = fs.readFileSync(fixPlanPath, "utf8");
  const oldReview = fs.readFileSync(reviewPath, "utf8");
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_062");
  const submission = prepared.projection.activeSubmission;
  const issuePlanDraft = path.join(root, submission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, submission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan("ISSUE_062").replace("accepted correction", "failed revised accepted correction"), "utf8");
  fs.writeFileSync(fixPlanDraft, validFixCardPlan("ISSUE_062", "Failed revised planning bundle service"), "utf8");

  withPatchedFs("renameSync", (original) => (from, to) => {
    if (
      String(from).endsWith(`.FIX_CARD_PLAN.${submission.submissionId}.next.md`) &&
      String(to).endsWith("FIX_CARD_PLAN.md")
    ) {
      throw new Error("simulated final swap failure");
    }
    return original(from, to);
  }, () => {
    assert.throws(
      () => promoteIssuePlanningDraftBundle(root, "ISSUE_062"),
      /simulated final swap failure/,
    );
  });

  assert.equal(fs.readFileSync(issuePlanPath, "utf8"), oldIssuePlan);
  assert.equal(fs.readFileSync(fixPlanPath, "utf8"), oldFixPlan);
  assert.equal(fs.readFileSync(reviewPath, "utf8"), oldReview);
});

test("post-success backup cleanup failure reports warning without rolling back replacement", () => {
  const root = tempProject();
  makeEligibleIssue(root, "ISSUE_063");
  promoteValidBundle(root, "ISSUE_063");
  applyIssuePlanningReview(root, "ISSUE_063", {
    disposition: "RevisionRequested",
    operatorNotes: "Revise and tolerate cleanup failure.",
  });
  const prepared = prepareIssuePlanningHandoff(root, "ISSUE_063");
  const submission = prepared.projection.activeSubmission;
  const issuePlanDraft = path.join(root, submission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, submission.fixCardPlanDraftPath);
  const revisedIssuePlan = validIssueResolutionPlan("ISSUE_063").replace("accepted correction", "cleanup revised accepted correction");
  const revisedFixPlan = validFixCardPlan("ISSUE_063", "Cleanup revised planning bundle service");
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, revisedIssuePlan, "utf8");
  fs.writeFileSync(fixPlanDraft, revisedFixPlan, "utf8");

  let result;
  withPatchedFs("unlinkSync", (original) => (target) => {
    if (String(target).includes(".previous.md")) {
      throw new Error("simulated backup cleanup failure");
    }
    return original(target);
  }, () => {
    result = promoteIssuePlanningDraftBundle(root, "ISSUE_063");
  });

  assert.equal(result.ok, true);
  assert.match(result.message, /Cleanup warning: simulated backup cleanup failure/);
  assert.equal(result.projection.status, "awaiting-operator-review");
  assert.equal(fs.readFileSync(path.join(root, "issues", "ISSUE_063", "ISSUE_RESOLUTION_PLAN.md"), "utf8"), revisedIssuePlan);
  assert.equal(fs.readFileSync(path.join(root, "issues", "ISSUE_063", "FIX_CARD_PLAN.md"), "utf8"), revisedFixPlan);
  assert.equal(fs.existsSync(path.join(root, "issues", "ISSUE_063", "ISSUE_PLANNING_REVIEW.md")), false);
  assert.equal(
    fs.existsSync(path.join(root, "issues", "ISSUE_063", "Issue_Planning_History", "revision-001", "ISSUE_PLANNING_REVIEW.md")),
    true,
  );
});

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-issue-planning-"));
}

function writeIssue(root, issueId) {
  const issueRoot = path.join(root, "issues", issueId);
  fs.mkdirSync(issueRoot, { recursive: true });
  fs.writeFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), `# ${issueId} - Test Issue\n\n## Issue\nNeeds a bounded correction.`, "utf8");
}

function writeInvestigation(root, issueId, body) {
  fs.writeFileSync(path.join(root, "issues", issueId, "ARCHITECT_INVESTIGATION.md"), body, "utf8");
}

function makeEligibleIssue(root, issueId) {
  writeIssue(root, issueId);
  writeInvestigation(root, issueId, validInvestigation(issueId));
  applyIssueArchitectReview(root, issueId, {
    disposition: "Approved",
    operatorNotes: "Proceed.",
  });
}

function promoteValidBundle(root, issueId) {
  const prepared = prepareIssuePlanningHandoff(root, issueId);
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan(issueId), "utf8");
  fs.writeFileSync(fixPlanDraft, validFixCardPlan(issueId), "utf8");
  return promoteIssuePlanningDraftBundle(root, issueId);
}

function withPatchedFs(methodName, factory, callback) {
  const original = fs[methodName];
  fs[methodName] = factory(original);
  try {
    return callback();
  } finally {
    fs[methodName] = original;
  }
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
    "The missing planning stage lacks an Issue-owned two-document planning bundle service.",
    "",
    "## Required Architecture",
    "Add an Issue-owned Issue Planning path that prepares two temporary drafts and promotes both only after validation.",
    "",
    "## Preservation Rules",
    "Preserve Development workflow state, MCP workspace binding, and overwrite-disabled temporary artifact writes.",
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

function validIssueResolutionPlan(issueId) {
  return [
    `# ${issueId} \u2014 Issue Resolution Plan`,
    "",
    "## Accepted Correction Objective",
    "Translate the accepted correction architecture into a bounded implementation plan for this selected Issue.",
    "",
    "## Bounded Scope",
    "Create the Issue-owned planning bundle, validate the two required files, and expose Operator review without adding Fix Card execution.",
    "",
    "## Non-Scope",
    "Do not create Issue phases, Fix Card execution contracts, validation records, close records, or Development workflow state.",
    "",
    "## Architecture Direction",
    "Use the Issue Resolution service to own repository paths, draft submission identity, validation, and atomic promotion.",
    "",
    "## Preservation Requirements",
    "Preserve Issue Intake, Architect Planning, Development state, MCP binding, and existing bootstrap artifacts unless a revised bundle is promoted.",
    "",
    "## Dependencies and Sequencing",
    "Architect Planning approval comes first, then planning handoff, two temporary drafts, automatic promotion, and bundle review.",
    "",
    "## Risks",
    "Invalid Fix Card maps must fail without partial promotion, and Operator live Browser GPT behavior remains manually validated.",
    "",
    "## Validation Strategy",
    "Use service tests for eligibility, draft promotion, parsing, review, and revision history plus renderer tests for the Figma workspace.",
    "",
    "## Completion Criteria",
    "The Issue Planning bundle is promoted atomically, reviewed as one decision, and only Approved planning enables Fix Cards.",
    "",
  ].join("\n");
}

function validFixCardPlan(issueId, firstTitle = "Issue planning bundle service") {
  return [
    `# ${issueId} \u2014 Fix Card Plan`,
    "",
    "## Planning Basis",
    "The accepted Architect Investigation is the required basis for one bounded Issue Planning layer without creating Issue phases.",
    "",
    "## Fix Card Decomposition",
    "The correction is decomposed into service and renderer proof so implementation can remain bounded and evidence-derived.",
    "",
    "## Fix Card Map",
    "```champcity-fix-card-plan",
    JSON.stringify([
      {
        fixCardId: `${issueId}-FC01`,
        order: 1,
        title: firstTitle,
        purpose: "Implement the Issue-owned planning bundle service, two-draft validation, atomic promotion, review, and revision behavior.",
        dependsOn: [],
        evidencePaths: [`issues/${issueId}/ARCHITECT_INVESTIGATION.md`],
      },
      {
        fixCardId: `${issueId}-FC02`,
        order: 2,
        title: "Issue planning renderer surface",
        purpose: "Expose the promoted planning documents, derived Fix Card Map, browser handoff controls, and bundle disposition in the Figma workspace.",
        dependsOn: [`${issueId}-FC01`],
        evidencePaths: [`issues/${issueId}/ARCHITECT_REVIEW.md`],
      },
    ], null, 2),
    "```",
    "",
  ].join("\n");
}

function invalidFixCardPlan(issueId) {
  return [
    `# ${issueId} \u2014 Fix Card Plan`,
    "",
    "## Planning Basis",
    "This plan intentionally violates the domain block constraints for parser coverage.",
    "",
    "## Fix Card Decomposition",
    "The invalid candidates include lifecycle state, bad ordering, absolute paths, and a dependency cycle.",
    "",
    "## Fix Card Map",
    "```champcity-fix-card-plan",
    JSON.stringify([
      {
        fixCardId: `${issueId}-FC01`,
        order: 1,
        title: "Invalid lifecycle card",
        purpose: "This candidate improperly persists lifecycle state and has a cyclic dependency.",
        dependsOn: [`${issueId}-FC03`],
        evidencePaths: ["../outside-evidence.md"],
        completed: false,
      },
      {
        fixCardId: `${issueId}-FC03`,
        order: 2,
        title: "Invalid identity card",
        purpose: "This candidate skips the required sequential identity for the selected Issue.",
        dependsOn: [`${issueId}-FC01`],
        evidencePaths: [`issues/${issueId}/ARCHITECT_REVIEW.md`],
      },
    ], null, 2),
    "```",
    "",
  ].join("\n");
}

function bootstrapIssueResolutionPlan(issueId) {
  return [
    `# ${issueId} \u2014 Legacy Issue Resolution Plan`,
    "",
    "## Resolution Objective",
    "Preserved manual planning evidence describes the bounded correction direction before FC04 generated bundles existed.",
    "",
    "## Governing Architecture",
    "The project-owned Issue workflow remains separate from Development state and retains the accepted Architect evidence.",
    "",
    "## Preservation Requirements",
    "Do not rewrite this bootstrap file merely because the application opened or refreshed the Issue Planning workspace.",
    "",
  ].join("\n");
}

function bootstrapFixCardPlan(issueId) {
  return [
    `# ${issueId} \u2014 Legacy Fix Card Plan`,
    "",
    "## Purpose",
    "Preserved manual decomposition evidence predates the generated champcity-fix-card-plan domain block.",
    "",
    "## Fix Card 01",
    `**ID:** ${issueId}-FC01`,
    "",
    "Implement the bounded service correction after deliberate adoption.",
    "",
  ].join("\n");
}
