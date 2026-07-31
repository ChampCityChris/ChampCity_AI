const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  generateProjectPlanningHandoff,
  getProjectPlanningHandoffInstruction,
  getProjectPlanningWorkspaceModel,
  reviewProjectPlanningBundle,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  seedApprovedProjectIntake,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

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
  assert.match(getProjectPlanningHandoffInstruction(root), /artifact_toolbox\.submit_handoff_outputs/);
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
  assert.equal(secondModel.canPrepareHandoff, false);
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
  assert.equal(readyAgain.canPrepareHandoff, true);
  assert.equal(second.alreadyPrepared, false);
  assert.equal(third.alreadyPrepared, true);
  assert.equal(first.handoffMarkdownPath, second.handoffMarkdownPath);
  assert.equal(finalModel.handoffArtifactRevision, 2);
  assert.equal(finalModel.canPrepareHandoff, false);
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
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  const result = generateProjectPlanningHandoff(root);

  const instruction = getProjectPlanningHandoffInstruction(root);
  assert.match(instruction, /<PROJECT_REPO>/);
  assert.match(instruction, new RegExp(seeded.intake.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, new RegExp(seeded.prompt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, new RegExp(seeded.interview.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, new RegExp(result.handoffMarkdownPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, /project-planning-output-submission-v2/);
  assert.match(instruction, /# Project Profile/);
  assert.match(instruction, /## Current-State Baseline/);
  assert.match(instruction, /# Project Roadmap/);
  assert.match(instruction, /## Work-State Classification/);
  assert.match(instruction, /## MVP Scope/);
  assert.match(instruction, /## Post-MVP Roadmap/);
  assert.match(instruction, /## Deferred and Conditional Work/);
  assert.match(instruction, /complete currently intended development lifecycle/);
  assert.match(instruction, /"action": "submit_handoff_outputs"/);
  assert.match(instruction, /"handoffKind": "project-planning"/);
  assert.match(instruction, /"projectProfileMarkdown"/);
  assert.match(instruction, /"projectRoadmapMarkdown"/);
  assert.match(instruction, /Use ChampCity MCP/);
  assert.match(instruction, /Do not write placeholders/);
  assert.match(instruction, /handoff kind is a selector, not authority/);
  assert.match(instruction, /Remain incomplete until artifact_toolbox\.submit_handoff_outputs returns saved or already_saved/);
  assert.doesNotMatch(instruction, /save_project_planning_outputs/);
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
