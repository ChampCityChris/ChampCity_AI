const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  generateProjectPlanningHandoff,
  getProjectPlanningHandoffInstruction,
  getProjectPlanningWorkspaceModel,
  prepareProjectPlanningHandoff,
  reviewProjectPlanningBundle,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  buildDeterministicArchitectDraftSubmissionId,
} = require("../../dist/main/architectOutputs/architectDraftPaths.js");
const {
  getActiveProjectPlanningDraftBundleSubmission,
} = require("../../dist/main/projectPlanning/projectPlanningDraftBundle.js");
const {
  seedApprovedProjectIntake,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

function invocationBlocks(handoffInstruction) {
  return [...handoffInstruction.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]));
}

function writeDraft(root, relativePath, bodyMarkdown) {
  fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
  fs.writeFileSync(path.join(root, relativePath), bodyMarkdown, "utf8");
}

function profileBody(extra = "Profile body.") {
  return [
    "# Project Profile",
    "",
    "## Current-State Baseline",
    extra,
    "",
    "## Existing Implementation",
    "Implementation state.",
    "",
    "## Legacy Planning Reconciliation",
    "Reconciliation state.",
    "",
    "## Risks and Unknowns",
    "Known risks.",
    "",
  ].join("\n");
}

function roadmapBody(extra = "Roadmap body.") {
  return [
    "# Project Roadmap",
    "",
    "## Baseline Summary",
    extra,
    "",
    "## Work-State Classification",
    "Work states.",
    "",
    "## MVP Scope",
    "MVP scope.",
    "",
    "## Sequenced Roadmap",
    "Sequence.",
    "",
    "## Post-MVP Roadmap",
    "Later work.",
    "",
    "## Deferred and Conditional Work",
    "Deferred work.",
    "",
    "## Dependencies and Constraints",
    "Dependencies.",
    "",
  ].join("\n");
}

function seedReadyProjectPlanning(root) {
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  return seeded;
}

function sourceRevisionsFor(seeded, handoffPath, handoffRevision = 1) {
  return [
    { path: seeded.intake, revision: 1 },
    { path: seeded.prompt, revision: 1 },
    { path: seeded.interview, revision: 1 },
    { path: handoffPath, revision: handoffRevision },
  ];
}

function expectedSubmissionId(handoffPath, submissionKey = "request-1") {
  return buildDeterministicArchitectDraftSubmissionId({
    outputKind: "project-planning",
    owningWorkspaceId: "project-planning-review",
    sourceHandoff: { path: handoffPath, revision: 1 },
    submissionKey,
  });
}

test("project planning service generates Markdown-only handoff targets", () => {
  const root = tempWorkspace("champcity-project-planning-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const result = generateProjectPlanningHandoff(root);
  assert.equal(result.handoffMarkdownPath, "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md");
  assert.equal(result.profileMarkdownPath, "planning/project/PROJECT_PROFILE.md");
  assert.equal(["handoff", "Json", "Path"].join("") in result, false);
});

test("project planning greenfield preflight emits the approved submission contract", () => {
  const root = tempWorkspace("champcity-project-planning-greenfield-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.reconciliationMode, "greenfield");
  assert.equal(model.repositoryReviewRequired, false);
  assert.deepEqual(model.legacyPlanningPaths, []);
  assert.deepEqual(model.sourceEvidencePaths, []);

  const result = generateProjectPlanningHandoff(root);
  const handoff = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, result.handoffMarkdownPath), "utf8"),
  );
  assert.deepEqual(handoff.metadata.workflowData, {
    handoffKind: "project-planning",
    contractId: "project-planning-output-submission-v2",
    projectProfileTarget: "planning/project/PROJECT_PROFILE.md",
    projectRoadmapTarget: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
    reconciliationMode: "greenfield",
    repositoryReviewRequired: false,
    repositoryReviewContext: "",
    legacyPlanningPaths: [],
    sourceEvidencePaths: [],
    requiredProfileSections: [
      "Current-State Baseline",
      "Existing Implementation",
      "Legacy Planning Reconciliation",
      "Risks and Unknowns",
    ],
    requiredRoadmapSections: [
      "Baseline Summary",
      "Work-State Classification",
      "MVP Scope",
      "Sequenced Roadmap",
      "Post-MVP Roadmap",
      "Deferred and Conditional Work",
      "Dependencies and Constraints",
    ],
  });
  assert.match(handoff.bodyMarkdown, /no prior implementation baseline|Reconciliation Mode: greenfield/i);
});

test("project planning existing-source fixture resolves reconciliation-required without Git", () => {
  const root = tempWorkspace("champcity-project-planning-existing-source-");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "index.ts"), "export const implemented = true;\n");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.intake, "project-intake", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    workflowData: {
      hasExistingSourceOrPlanning: true,
      repositoryReviewContext: "Inspect the existing TypeScript entry point.",
    },
  });
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.reconciliationMode, "reconciliation-required");
  assert.equal(model.repositoryReviewRequired, true);
  assert.equal(model.repositoryReviewContext, "Inspect the existing TypeScript entry point.");
  assert.deepEqual(model.sourceEvidencePaths, ["src/index.ts"]);
});

test("project planning intake and source mismatch resolves needs-attention and blocks handoff creation", () => {
  const root = tempWorkspace("champcity-project-planning-mismatch-source-");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "index.ts"), "export const existing = true;\n");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.state, "needs-attention");
  assert.match(model.reason, /greenfield repository.*substantive source/i);
  assert.ok(model.evidencePaths.includes("src/index.ts"));
  assert.throws(() => generateProjectPlanningHandoff(root), /greenfield repository.*substantive source/i);
});

test("project planning legacy evidence is exposed in handoff and preserved byte-for-byte", () => {
  const root = tempWorkspace("champcity-project-planning-legacy-");
  const legacyPath = "planning/project/LEGACY_PLAN.md";
  const legacyBody = "# Old Plan\n\nKeep this unchanged.\n";
  fs.mkdirSync(path.join(root, "planning", "project"), { recursive: true });
  fs.writeFileSync(path.join(root, legacyPath), legacyBody);
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.intake, "project-intake", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    workflowData: { hasExistingSourceOrPlanning: true },
  });
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const before = fs.readFileSync(path.join(root, legacyPath), "utf8");
  const result = generateProjectPlanningHandoff(root);
  const after = fs.readFileSync(path.join(root, legacyPath), "utf8");
  const handoff = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, result.handoffMarkdownPath), "utf8"),
  );

  assert.equal(after, before);
  assert.deepEqual(handoff.metadata.workflowData.legacyPlanningPaths, [legacyPath]);
  assert.match(getProjectPlanningHandoffInstruction(root), /artifact_toolbox\.create_markdown_artifact/);
  assert.doesNotMatch(getProjectPlanningHandoffInstruction(root), /submit_handoff_outputs/);
});

test("project planning exact unmanaged target collision blocks without modifying file", () => {
  const root = tempWorkspace("champcity-project-planning-target-collision-");
  const profileTarget = "planning/project/PROJECT_PROFILE.md";
  const profileBody = "# Unmanaged Project Profile\n\nLegacy content.\n";
  fs.mkdirSync(path.join(root, "planning", "project"), { recursive: true });
  fs.writeFileSync(path.join(root, profileTarget), profileBody);
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.intake, "project-intake", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    workflowData: { hasExistingSourceOrPlanning: true },
  });
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.state, "needs-attention");
  assert.match(model.reason, /Exact Project Planning output target collision/);
  assert.ok(model.evidencePaths.includes(profileTarget));
  assert.throws(() => generateProjectPlanningHandoff(root), /target collision/);
  assert.equal(fs.readFileSync(path.join(root, profileTarget), "utf8"), profileBody);
});

test("project planning handoff preparation is byte-idempotent for unchanged evidence", () => {
  const root = tempWorkspace("champcity-project-planning-idempotent-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const first = generateProjectPlanningHandoff(root);
  const handoffPath = path.join(root, first.handoffMarkdownPath);
  const firstBytes = fs.readFileSync(handoffPath, "utf8");
  const firstModel = getProjectPlanningWorkspaceModel(root);

  const second = generateProjectPlanningHandoff(root);
  const secondBytes = fs.readFileSync(handoffPath, "utf8");
  const secondModel = getProjectPlanningWorkspaceModel(root);

  assert.equal(first.alreadyPrepared, false);
  assert.equal(second.alreadyPrepared, true);
  assert.equal(secondBytes, firstBytes);
  assert.equal(firstModel.handoffArtifactRevision, 1);
  assert.equal(secondModel.handoffArtifactRevision, 1);
  assert.equal(secondModel.canPrepareHandoff, true);
  assert.equal(secondModel.canCopyHandoff, true);
});

test("project planning handoff creates one new revision after a genuine source revision", () => {
  const root = tempWorkspace("champcity-project-planning-source-change-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  const first = generateProjectPlanningHandoff(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    artifactRevision: 2,
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const readyAgain = getProjectPlanningWorkspaceModel(root);
  const second = generateProjectPlanningHandoff(root);
  const third = generateProjectPlanningHandoff(root);
  const finalModel = getProjectPlanningWorkspaceModel(root);

  assert.equal(readyAgain.state, "ready-for-handoff");
  assert.equal(readyAgain.canPrepareHandoff, false);
  assert.equal(second.alreadyPrepared, false);
  assert.equal(third.alreadyPrepared, true);
  assert.equal(first.handoffMarkdownPath, second.handoffMarkdownPath);
  assert.equal(finalModel.handoffArtifactRevision, 2);
  assert.equal(finalModel.canPrepareHandoff, true);
  assert.equal(finalModel.canCopyHandoff, true);
});

test("project planning source revision invalidates prior handoff and outputs", () => {
  const root = tempWorkspace("champcity-project-planning-output-stale-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  const handoff = generateProjectPlanningHandoff(root);
  const sources = [
    { path: seeded.intake, revision: 1 },
    { path: seeded.prompt, revision: 1 },
    { path: seeded.interview, revision: 1 },
    { path: handoff.handoffMarkdownPath, revision: 1 },
  ];
  writeDoc(root, handoff.profileMarkdownPath, "project-profile", "Pending", {
    identity: { projectSlug: "demo" },
    participationRole: "compoundGatingReview",
    sourceRevisions: sources,
  });
  writeDoc(root, handoff.roadmapMarkdownPath, "project-roadmap", "Pending", {
    identity: { projectSlug: "demo" },
    participationRole: "compoundGatingReview",
    sourceRevisions: sources,
  });

  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    artifactRevision: 2,
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.state, "needs-attention");
  assert.match(model.reason, /does not reference current source revision/);
  assert.equal(model.canCopyHandoff, false);
});

test("project planning model resolves ready from exact approved intake prompt and interview", () => {
  const root = tempWorkspace("champcity-project-planning-ready-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.state, "ready-for-handoff");
  assert.equal(model.railStatus, "Ready");
  assert.equal(model.projectProfileTarget, "planning/project/PROJECT_PROFILE.md");
  assert.equal(model.projectRoadmapTarget, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md");
});

test("project planning handoff instruction includes exact targets and MCP constraints", () => {
  const root = tempWorkspace("champcity-project-planning-copy-");
  const seeded = seedReadyProjectPlanning(root);
  const prepared = prepareProjectPlanningHandoff(root);

  const instruction = getProjectPlanningHandoffInstruction(root);
  assert.match(instruction, /<PROJECT_REPO>/);
  assert.match(instruction, new RegExp(seeded.intake.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, new RegExp(seeded.prompt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, new RegExp(seeded.interview.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, new RegExp(prepared.handoffMarkdownPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, /project-planning-output-submission-v2/);
  assert.match(instruction, /# Project Profile/);
  assert.match(instruction, /## Current-State Baseline/);
  assert.match(instruction, /# Project Roadmap/);
  assert.match(instruction, /## Work-State Classification/);
  assert.match(instruction, /## MVP Scope/);
  assert.match(instruction, /## Post-MVP Roadmap/);
  assert.match(instruction, /## Deferred and Conditional Work/);
  assert.match(instruction, /complete currently intended development lifecycle/);
  assert.match(instruction, /"action": "create_markdown_artifact"/);
  assert.match(instruction, /"relativePath": "planning\/Architect_Drafts\//);
  assert.match(instruction, /"content": "<complete body-only Project Profile Markdown>"/);
  assert.match(instruction, /"content": "<complete body-only Project Roadmap Markdown>"/);
  assert.match(instruction, /"overwrite": false/);
  assert.match(instruction, /one atomic Project Planning draft bundle/);
  assert.match(instruction, /MCP creates only these temporary body-only drafts/);
  assert.match(instruction, /ChampCity A\/I owns final targets, canonical metadata, validation, revisions, atomic promotion, cleanup, and review state/);
  assert.doesNotMatch(instruction, /submit_handoff_outputs/);
  assert.doesNotMatch(instruction, /"handoffKind"/);
  assert.doesNotMatch(instruction, /"projectProfileMarkdown"/);
  assert.doesNotMatch(instruction, /"projectRoadmapMarkdown"/);
  assert.match(instruction, /Use ChampCity MCP/);
  assert.match(instruction, /Do not write placeholders/);
  assert.match(instruction, /workflow remains incomplete until both temporary drafts are created and ChampCity A\/I promotes the bundle/);
  assert.doesNotMatch(instruction, /save_project_planning_outputs/);

  const invocations = invocationBlocks(instruction);
  assert.equal(invocations.length, 2);
  assert.deepEqual(invocations, [
    {
      action: "create_markdown_artifact",
      workspaceId: "<resolved workspace ID>",
      params: {
        relativePath: `planning/Architect_Drafts/${expectedSubmissionId(prepared.handoffMarkdownPath)}/project-profile.md`,
        content: "<complete body-only Project Profile Markdown>",
        overwrite: false,
      },
    },
    {
      action: "create_markdown_artifact",
      workspaceId: "<resolved workspace ID>",
      params: {
        relativePath: `planning/Architect_Drafts/${expectedSubmissionId(prepared.handoffMarkdownPath)}/project-roadmap.md`,
        content: "<complete body-only Project Roadmap Markdown>",
        overwrite: false,
      },
    },
  ]);
});

test("project planning context rejects unrelated archived or mismatched input combinations", () => {
  const root = tempWorkspace("champcity-project-planning-mismatch-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, "planning/archive/project/Project_Intake/PROJECT_INTAKE_old.md", "project-intake", "Approved");
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: "planning/project/Project_Architect_Interview_Prompts/OTHER.md", revision: 1 },
    ],
  });

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.state, "needs-attention");
  assert.match(model.reason, /Prompt revision/);
});

test("project planning draft bundle waits for both drafts and promotes an absent final bundle atomically", () => {
  const root = tempWorkspace("champcity-project-planning-drafts-");
  const seeded = seedReadyProjectPlanning(root);
  const prepared = prepareProjectPlanningHandoff(root);
  const active = getActiveProjectPlanningDraftBundleSubmission(root).submission;

  assert.equal(active.submissionId, expectedSubmissionId(prepared.handoffMarkdownPath));
  assert.deepEqual(
    active.expectedDraftSlots.map((slot) => slot.draftRelativePath),
    [
      `planning/Architect_Drafts/${active.submissionId}/project-profile.md`,
      `planning/Architect_Drafts/${active.submissionId}/project-roadmap.md`,
    ],
  );
  assert.equal(prepared.draftSubmissionState, "waiting-for-drafts");
  assert.match(prepared.handoffInstruction, new RegExp(active.expectedDraftSlots[0].draftRelativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prepared.handoffInstruction, new RegExp(active.expectedDraftSlots[1].draftRelativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  writeDraft(root, active.expectedDraftSlots[0].draftRelativePath, profileBody("Only profile is present."));
  const partial = getProjectPlanningWorkspaceModel(root);
  assert.equal(partial.draftSubmissionState, "partial-draft-set");
  assert.equal(fs.existsSync(path.join(root, prepared.projectProfileTarget)), false);
  assert.equal(fs.existsSync(path.join(root, prepared.projectRoadmapTarget)), false);

  writeDraft(root, active.expectedDraftSlots[1].draftRelativePath, roadmapBody("Roadmap completes the pair."));
  const promoted = getProjectPlanningWorkspaceModel(root);
  assert.equal(promoted.state, "ready-for-review");
  assert.equal(promoted.draftSubmissionState, "promoted");
  assert.equal(promoted.profileDocument.disposition, "Pending");
  assert.equal(promoted.roadmapDocument.disposition, "Pending");
  assert.equal(fs.existsSync(path.join(root, active.expectedDraftSlots[0].draftRelativePath)), false);
  assert.equal(fs.existsSync(path.join(root, active.expectedDraftSlots[1].draftRelativePath)), false);

  const profile = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, prepared.projectProfileTarget), "utf8"));
  const roadmap = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, prepared.projectRoadmapTarget), "utf8"));
  assert.equal(profile.metadata.artifactType, "project-profile");
  assert.equal(roadmap.metadata.artifactType, "project-roadmap");
  assert.equal(profile.metadata.participationRole, "compoundGatingReview");
  assert.equal(roadmap.metadata.participationRole, "compoundGatingReview");
  assert.equal(profile.metadata.artifactRevision, 1);
  assert.equal(roadmap.metadata.artifactRevision, 1);
  assert.equal(profile.metadata.documentDisposition.status, "Pending");
  assert.equal(roadmap.metadata.documentDisposition.status, "Pending");
  assert.deepEqual(profile.metadata.sourceRevisions, sourceRevisionsFor(seeded, prepared.handoffMarkdownPath));
  assert.deepEqual(roadmap.metadata.sourceRevisions, sourceRevisionsFor(seeded, prepared.handoffMarkdownPath));
});

test("project planning malformed draft bundle retains drafts and explicit retry uses new draft paths", () => {
  const root = tempWorkspace("champcity-project-planning-draft-retry-");
  seedReadyProjectPlanning(root);
  const prepared = prepareProjectPlanningHandoff(root);
  const first = getActiveProjectPlanningDraftBundleSubmission(root).submission;
  writeDraft(root, first.expectedDraftSlots[0].draftRelativePath, profileBody("Valid profile."));
  writeDraft(root, first.expectedDraftSlots[1].draftRelativePath, "# Project Roadmap\n\nMissing sections.\n");

  const failed = getProjectPlanningWorkspaceModel(root);
  assert.equal(failed.draftSubmissionState, "promotion-failed");
  assert.match(failed.draftPromotionError, /Baseline Summary/);
  assert.equal(fs.existsSync(path.join(root, prepared.projectProfileTarget)), false);
  assert.equal(fs.existsSync(path.join(root, prepared.projectRoadmapTarget)), false);
  assert.equal(fs.existsSync(path.join(root, first.expectedDraftSlots[0].draftRelativePath)), true);
  assert.equal(fs.existsSync(path.join(root, first.expectedDraftSlots[1].draftRelativePath)), true);

  const retried = prepareProjectPlanningHandoff(root);
  const second = getActiveProjectPlanningDraftBundleSubmission(root).submission;
  assert.equal(second.submissionId, expectedSubmissionId(retried.handoffMarkdownPath, "request-2"));
  assert.notEqual(second.expectedDraftSlots[0].draftRelativePath, first.expectedDraftSlots[0].draftRelativePath);
  assert.equal(fs.existsSync(path.join(root, first.expectedDraftSlots[0].draftRelativePath)), true);
  assert.equal(fs.existsSync(path.join(root, first.expectedDraftSlots[1].draftRelativePath)), true);
});

test("project planning revision requested bundle revises both final documents atomically", () => {
  const root = tempWorkspace("champcity-project-planning-draft-revision-");
  const seeded = seedReadyProjectPlanning(root);
  const initial = prepareProjectPlanningHandoff(root);
  let active = getActiveProjectPlanningDraftBundleSubmission(root).submission;
  writeDraft(root, active.expectedDraftSlots[0].draftRelativePath, profileBody("Initial profile."));
  writeDraft(root, active.expectedDraftSlots[1].draftRelativePath, roadmapBody("Initial roadmap."));
  getProjectPlanningWorkspaceModel(root);

  reviewProjectPlanningBundle(root, "RevisionRequested", "Tighten planning sequence.");
  const beforeProfile = fs.readFileSync(path.join(root, initial.projectProfileTarget), "utf8");
  const beforeRoadmap = fs.readFileSync(path.join(root, initial.projectRoadmapTarget), "utf8");

  prepareProjectPlanningHandoff(root);
  active = getActiveProjectPlanningDraftBundleSubmission(root).submission;
  writeDraft(root, active.expectedDraftSlots[0].draftRelativePath, profileBody("Revised profile."));
  writeDraft(root, active.expectedDraftSlots[1].draftRelativePath, roadmapBody("Revised roadmap."));
  const revisedModel = getProjectPlanningWorkspaceModel(root);

  assert.equal(revisedModel.state, "ready-for-review");
  const profile = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, initial.projectProfileTarget), "utf8"));
  const roadmap = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, initial.projectRoadmapTarget), "utf8"));
  assert.notEqual(fs.readFileSync(path.join(root, initial.projectProfileTarget), "utf8"), beforeProfile);
  assert.notEqual(fs.readFileSync(path.join(root, initial.projectRoadmapTarget), "utf8"), beforeRoadmap);
  assert.equal(profile.metadata.artifactRevision, 2);
  assert.equal(roadmap.metadata.artifactRevision, 2);
  assert.equal(profile.metadata.documentDisposition.status, "Pending");
  assert.equal(roadmap.metadata.documentDisposition.status, "Pending");
  assert.equal(profile.metadata.documentDisposition.notes, "");
  assert.equal(roadmap.metadata.documentDisposition.notes, "");
  assert.equal(profile.metadata.documentDisposition.reviewedAt, null);
  assert.equal(roadmap.metadata.documentDisposition.reviewedAt, null);
  assert.deepEqual(profile.metadata.sourceRevisions, sourceRevisionsFor(seeded, initial.handoffMarkdownPath));
  assert.deepEqual(roadmap.metadata.sourceRevisions, sourceRevisionsFor(seeded, initial.handoffMarkdownPath));
  assert.match(profile.bodyMarkdown, /Revised profile/);
  assert.match(roadmap.bodyMarkdown, /Revised roadmap/);
});

test("project planning ineligible existing output state blocks promotion and preserves final bytes", () => {
  const root = tempWorkspace("champcity-project-planning-ineligible-");
  const seeded = seedReadyProjectPlanning(root);
  const prepared = prepareProjectPlanningHandoff(root);
  const active = getActiveProjectPlanningDraftBundleSubmission(root).submission;
  writeDoc(root, prepared.projectProfileTarget, "project-profile", "Pending", {
    identity: { projectSlug: "demo" },
    participationRole: "compoundGatingReview",
    sourceRevisions: sourceRevisionsFor(seeded, prepared.handoffMarkdownPath),
    bodyMarkdown: profileBody("Unauthorized partial existing profile."),
  });
  const beforeProfile = fs.readFileSync(path.join(root, prepared.projectProfileTarget), "utf8");
  writeDraft(root, active.expectedDraftSlots[0].draftRelativePath, profileBody("New profile draft."));
  writeDraft(root, active.expectedDraftSlots[1].draftRelativePath, roadmapBody("New roadmap draft."));

  const failed = getProjectPlanningWorkspaceModel(root);

  assert.equal(failed.draftSubmissionState, "promotion-failed");
  assert.match(failed.draftPromotionError, /partial existing output set/);
  assert.equal(fs.readFileSync(path.join(root, prepared.projectProfileTarget), "utf8"), beforeProfile);
  assert.equal(fs.existsSync(path.join(root, prepared.projectRoadmapTarget)), false);
  assert.equal(fs.existsSync(path.join(root, active.expectedDraftSlots[0].draftRelativePath)), true);
  assert.equal(fs.existsSync(path.join(root, active.expectedDraftSlots[1].draftRelativePath)), true);
});

test("project planning bundle disposition writes the same notes and status to both outputs", () => {
  const root = tempWorkspace("champcity-project-planning-review-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  const handoff = generateProjectPlanningHandoff(root);
  const sources = [
    { path: seeded.intake, revision: 1 },
    { path: seeded.prompt, revision: 1 },
    { path: seeded.interview, revision: 1 },
    { path: handoff.handoffMarkdownPath, revision: 1 },
  ];
  writeDoc(root, handoff.profileMarkdownPath, "project-profile", "Pending", {
    identity: { projectSlug: "demo" },
    participationRole: "compoundGatingReview",
    sourceRevisions: sources,
  });
  writeDoc(root, handoff.roadmapMarkdownPath, "project-roadmap", "Pending", {
    identity: { projectSlug: "demo" },
    participationRole: "compoundGatingReview",
    sourceRevisions: sources,
  });

  const detected = getProjectPlanningWorkspaceModel(root);
  assert.equal(detected.state, "ready-for-review");
  assert.equal(detected.canPrepareHandoff, false);
  assert.equal(detected.canApplyBundleDisposition, true);

  assert.throws(() => reviewProjectPlanningBundle(root, "RevisionRequested", ""), /requires Operator revision instructions/);
  const model = reviewProjectPlanningBundle(root, "RevisionRequested", "Tighten the roadmap milestones.");
  assert.equal(model.profileDocument.disposition, "RevisionRequested");
  assert.equal(model.roadmapDocument.disposition, "RevisionRequested");
  assert.equal(model.profileDocument.operatorReviewNotes, "Tighten the roadmap milestones.");
  assert.equal(model.roadmapDocument.operatorReviewNotes, "Tighten the roadmap milestones.");
});
