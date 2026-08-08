const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  generatePhaseMapHandoff,
  getPhaseMapDraftSubmissionStatus,
  getPhaseMapHandoffInstruction,
  getPhaseMapProjection,
  setPhaseMapDisposition,
} = require("../../dist/main/phaseMap/phaseMapService.js");
const {
  getCurrentWorkspaceModel,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  generateProjectPlanningHandoff,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

function invocationFrom(instruction) {
  const blocks = [...instruction.matchAll(/```json\n([\s\S]*?)\n```/g)];
  const block = blocks
    .map((candidate) => candidate[1])
    .find((candidate) => candidate.includes('"action": "create_markdown_artifact"'));
  assert.ok(block, "expected a create_markdown_artifact invocation block");
  return JSON.parse(block);
}

function writeRaw(root, relativePath, content) {
  fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
  fs.writeFileSync(path.join(root, relativePath), content, "utf8");
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function validPhaseMapBody(phaseId = "phase-build") {
  return [
    "# Phase Map",
    "",
    "```champcity-phase-map",
    JSON.stringify({
      phases: [{
        phaseId,
        title: "Build Phase",
        order: 1,
        purpose: "Build from the approved roadmap.",
        dependsOn: [],
        sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
      }],
    }, null, 2),
    "```",
  ].join("\n");
}

test("phase map service generates Markdown-only handoff and derives completion from closeouts", () => {
  const root = tempWorkspace("champcity-phase-map-");
  seedApprovedProjectPlanning(root);

  const result = generatePhaseMapHandoff(root);
  assert.equal(["phaseMap", "Json", "Path"].join("") in result, false);
  const instruction = getPhaseMapHandoffInstruction(root);
  assert.match(instruction, /Current Approved Project Profile: planning\/project\/PROJECT_PROFILE\.md/);
  assert.match(instruction, /Current Approved Project Roadmap: planning\/project\/Project_Roadmap\/PROJECT_ROADMAP_/);
  assert.match(instruction, new RegExp(`Generated Phase Map handoff: ${result.handoffMarkdownPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(instruction, new RegExp(`Exact Phase Map output target: ${result.phaseMapMarkdownPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(instruction, /phase-map-output-submission-v1/);
  assert.match(instruction, /"action": "create_markdown_artifact"/);
  assert.match(instruction, /"overwrite": false/);
  assert.match(instruction, /Temporary draft Markdown: planning\/Architect_Drafts\//);
  assert.doesNotMatch(instruction, /submit_handoff_outputs/);
  assert.doesNotMatch(instruction, /"handoffKind": "phase-map"/);
  assert.doesNotMatch(instruction, /"phaseMapMarkdown"/);
  assert.match(instruction, /"phases"/);
  assert.match(instruction, /Derive the substantive phase list from the approved full Project Roadmap and Project Profile/);
  assert.doesNotMatch(instruction, /Foundation/);
  assert.doesNotMatch(instruction, /top-level JSON value is an array/);
  assert.doesNotMatch(instruction, /save_project_planning_outputs|save_architect_interview_output|write_markdown_artifact/);
  const invocation = invocationFrom(instruction);
  assert.equal(invocation.action, "create_markdown_artifact");
  assert.equal(invocation.params.overwrite, false);
  assert.match(invocation.params.relativePath, /^planning\/Architect_Drafts\/.+\/phase-map\.md$/);
  writeDoc(root, result.phaseMapMarkdownPath, "phase-map", "Pending", {
    workflowData: {
      phases: [{
        phaseId: "phase-01",
        title: "Phase 01",
        order: 1,
        purpose: "Build.",
        dependsOn: [],
        sourceReferences: [],
      }],
    },
  });
  setPhaseMapDisposition(root, "Approved");
  assert.equal(getPhaseMapProjection(root).state, "first-incomplete");
});

test("phase map handoff contains contract authority without fabricated default phases", () => {
  const root = tempWorkspace("champcity-phase-map-contract-");
  seedApprovedProjectPlanning(root);

  const result = generatePhaseMapHandoff(root);
  const parsed = require("../../dist/shared/documents/canonicalMarkdown.js").parseCanonicalMarkdownDocument(
    require("node:fs").readFileSync(require("node:path").join(root, result.handoffMarkdownPath), "utf8"),
  );

  assert.equal(parsed.metadata.workflowData.handoffKind, "phase-map");
  assert.equal(parsed.metadata.workflowData.contractId, "phase-map-output-submission-v1");
  const { repositoryAuthority, ...workflowData } = parsed.metadata.workflowData;
  assert.equal(repositoryAuthority.mcpWorkspaceBinding.mcpWorkspaceId, "alpha");
  assert.equal(repositoryAuthority.projectRepository, require("node:path").resolve(root));
  assert.deepEqual(workflowData, {
    handoffKind: "phase-map",
    contractId: "phase-map-output-submission-v1",
    phaseMapTarget: result.phaseMapMarkdownPath,
    requiredTitle: "Phase Map",
    requiredDomainBlocks: ["champcity-phase-map"],
  });
  assert.equal(parsed.metadata.workflowData.phases, undefined);
  assert.deepEqual(Object.keys(workflowData), [
    "handoffKind",
    "contractId",
    "phaseMapTarget",
    "requiredTitle",
    "requiredDomainBlocks",
  ]);
  assert.doesNotMatch(parsed.bodyMarkdown, /phase-01|Initial project building phase|Work Card|repair|manual fallback/i);
  assert.doesNotMatch(parsed.bodyMarkdown, /submit_handoff_outputs/);
});

test("phase map draft promotes as revision 1 and removes only the consumed temporary draft", () => {
  const root = tempWorkspace("champcity-phase-map-draft-promote-");
  seedApprovedProjectPlanning(root);
  const result = generatePhaseMapHandoff(root);
  const invocation = invocationFrom(getPhaseMapHandoffInstruction(root));

  writeRaw(root, invocation.params.relativePath, validPhaseMapBody("phase-build"));
  const status = getPhaseMapDraftSubmissionStatus(root);
  const parsed = readCanonical(root, result.phaseMapMarkdownPath);

  assert.equal(status.submission.state, "promoted");
  assert.equal(status.promotionError, undefined);
  assert.equal(fs.existsSync(path.join(root, invocation.params.relativePath)), false);
  assert.equal(parsed.metadata.artifactType, "phase-map");
  assert.equal(parsed.metadata.artifactRevision, 1);
  assert.equal(parsed.metadata.participationRole, "gatingReview");
  assert.deepEqual(parsed.metadata.identity, {
    projectSlug: "demo",
    "Project.ArtifactKey": "demo",
  });
  assert.deepEqual(parsed.metadata.sourceRevisions, [
    { path: "planning/project/PROJECT_PROFILE.md", revision: 1 },
    { path: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", revision: 1 },
    { path: result.handoffMarkdownPath, revision: 1 },
  ]);
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.equal(parsed.metadata.documentDisposition.notes, "");
  assert.equal(parsed.metadata.documentDisposition.reviewedAt, null);
  assert.equal(parsed.metadata.workflowData.phases[0].phaseId, "phase-build");
});

test("malformed phase map draft creates no final output, retains draft, and explicit retry uses a fresh path", () => {
  const root = tempWorkspace("champcity-phase-map-draft-malformed-");
  seedApprovedProjectPlanning(root);
  const result = generatePhaseMapHandoff(root);
  const firstInvocation = invocationFrom(getPhaseMapHandoffInstruction(root));

  writeRaw(root, firstInvocation.params.relativePath, "# Phase Map\n\nNo domain block.\n");
  const failed = getPhaseMapDraftSubmissionStatus(root);
  const retryInvocation = invocationFrom(getPhaseMapHandoffInstruction(root));

  assert.equal(failed.submission.state, "promotion-failed");
  assert.match(failed.promotionError, /champcity-phase-map fenced block/);
  assert.equal(fs.existsSync(path.join(root, result.phaseMapMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(root, firstInvocation.params.relativePath)), true);
  assert.notEqual(retryInvocation.params.relativePath, firstInvocation.params.relativePath);
  assert.equal(fs.existsSync(path.join(root, firstInvocation.params.relativePath)), true);
});

test("phase map RevisionRequested target revises same path, increments once, and resets review state", () => {
  const root = tempWorkspace("champcity-phase-map-draft-revision-");
  seedApprovedProjectPlanning(root);
  const result = generatePhaseMapHandoff(root);
  const firstInvocation = invocationFrom(getPhaseMapHandoffInstruction(root));
  writeRaw(root, firstInvocation.params.relativePath, validPhaseMapBody("phase-initial"));
  getPhaseMapDraftSubmissionStatus(root);

  setPhaseMapDisposition(root, "RevisionRequested");
  generatePhaseMapHandoff(root);
  const secondInvocation = invocationFrom(getPhaseMapHandoffInstruction(root));
  writeRaw(root, secondInvocation.params.relativePath, validPhaseMapBody("phase-revised"));
  const revised = getPhaseMapDraftSubmissionStatus(root);
  const parsed = readCanonical(root, result.phaseMapMarkdownPath);

  assert.equal(revised.submission.state, "promoted");
  assert.equal(parsed.metadata.artifactRevision, 2);
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.equal(parsed.metadata.documentDisposition.notes, "");
  assert.equal(parsed.metadata.documentDisposition.reviewedAt, null);
  assert.equal(parsed.metadata.workflowData.phases[0].phaseId, "phase-revised");
  assert.equal(fs.existsSync(path.join(root, secondInvocation.params.relativePath)), false);
});

test("ineligible phase map target remains byte-identical and blocks promotion", () => {
  const root = tempWorkspace("champcity-phase-map-draft-ineligible-");
  seedApprovedProjectPlanning(root);
  const result = generatePhaseMapHandoff(root);
  const invocation = invocationFrom(getPhaseMapHandoffInstruction(root));
  writeDoc(root, result.phaseMapMarkdownPath, "project-roadmap", "RevisionRequested", {
    participationRole: "compoundGatingReview",
    bodyMarkdown: "# Wrong Target\n\nDo not replace.\n",
  });
  const before = fs.readFileSync(path.join(root, result.phaseMapMarkdownPath), "utf8");

  writeRaw(root, invocation.params.relativePath, validPhaseMapBody("phase-blocked"));
  const failed = getPhaseMapDraftSubmissionStatus(root);
  const after = fs.readFileSync(path.join(root, result.phaseMapMarkdownPath), "utf8");

  assert.equal(failed.submission.state, "promotion-failed");
  assert.match(failed.promotionError, /wrong artifact type/);
  assert.equal(after, before);
  assert.equal(fs.existsSync(path.join(root, invocation.params.relativePath)), true);
});

test("phase map polling does not create submissions and promotes only an active ready draft", () => {
  const root = tempWorkspace("champcity-phase-map-draft-polling-");
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  const planning = generateProjectPlanningHandoff(root);
  const planningSources = [
    { path: intake, revision: 1 },
    { path: prompt, revision: 1 },
    { path: interview, revision: 1 },
    { path: planning.handoffMarkdownPath, revision: 1 },
  ];
  writeDoc(root, planning.profileMarkdownPath, "project-profile", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: planningSources,
  });
  writeDoc(root, planning.roadmapMarkdownPath, "project-roadmap", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: planningSources,
  });

  let model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "project-phase-map");
  assert.equal(model.draftSubmissionState, undefined);

  const result = generatePhaseMapHandoff(root);
  const invocation = invocationFrom(getPhaseMapHandoffInstruction(root));
  model = getCurrentWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "waiting-for-drafts");

  writeRaw(root, invocation.params.relativePath, validPhaseMapBody("phase-polled"));
  model = getCurrentWorkspaceModel(root);
  const parsed = readCanonical(root, result.phaseMapMarkdownPath);

  assert.equal(model.activeWorkspaceId, "project-phase-map");
  assert.equal(model.draftSubmissionState, "promoted");
  assert.equal(parsed.metadata.workflowData.phases[0].phaseId, "phase-polled");
  assert.equal(fs.existsSync(path.join(root, invocation.params.relativePath)), false);
});

test("phase map handoff preparation is byte-idempotent for unchanged evidence", () => {
  const root = tempWorkspace("champcity-phase-map-idempotent-");
  seedApprovedProjectPlanning(root);

  const first = generatePhaseMapHandoff(root);
  const handoffPath = require("node:path").join(root, first.handoffMarkdownPath);
  const firstBytes = require("node:fs").readFileSync(handoffPath, "utf8");
  const second = generatePhaseMapHandoff(root);
  const secondBytes = require("node:fs").readFileSync(handoffPath, "utf8");

  assert.equal(first.alreadyPrepared, false);
  assert.equal(second.alreadyPrepared, true);
  assert.equal(secondBytes, firstBytes);
});

test("phase map handoff creates one new revision after genuine planning input revision", () => {
  const root = tempWorkspace("champcity-phase-map-source-revision-");
  seedApprovedProjectPlanning(root);
  const first = generatePhaseMapHandoff(root);
  writeDoc(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", "project-roadmap", "Approved", {
    artifactRevision: 2,
    participationRole: "compoundGatingReview",
  });

  const second = generatePhaseMapHandoff(root);
  const third = generatePhaseMapHandoff(root);
  const parsed = require("../../dist/shared/documents/canonicalMarkdown.js").parseCanonicalMarkdownDocument(
    require("node:fs").readFileSync(require("node:path").join(root, second.handoffMarkdownPath), "utf8"),
  );

  assert.equal(second.alreadyPrepared, false);
  assert.equal(third.alreadyPrepared, true);
  assert.equal(first.handoffMarkdownPath, second.handoffMarkdownPath);
  assert.equal(parsed.metadata.artifactRevision, 2);
  assert.deepEqual(parsed.metadata.sourceRevisions, [
    { path: "planning/project/PROJECT_PROFILE.md", revision: 1 },
    { path: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", revision: 2 },
  ]);
});

test("phase map projection requires canonical metadata phases and rejects body-only fallback", () => {
  const root = tempWorkspace("champcity-phase-map-domain-block-");
  seedApprovedProjectPlanning(root);
  const result = generatePhaseMapHandoff(root);
  const handoffSources = [
    { path: "planning/project/PROJECT_PROFILE.md", revision: 1 },
    { path: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", revision: 1 },
    { path: result.handoffMarkdownPath, revision: 1 },
  ];
  writeDoc(root, result.phaseMapMarkdownPath, "phase-map", "Approved", {
    sourceRevisions: handoffSources,
    bodyMarkdown: [
      "# Phase Map",
      "",
      "```champcity-phase-map",
      JSON.stringify({
        phases: [{
        phaseId: "phase-lifecycle",
        title: "Lifecycle Buildout",
        order: 1,
        purpose: "Sequence roadmap-derived buildout.",
        dependsOn: [],
        sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
        }],
      }),
      "```",
    ].join("\n"),
  });

  const projection = getPhaseMapProjection(root);
  assert.equal(projection.state, "malformed");
  assert.match(projection.reason, /metadata\.workflowData\.phases is required/);
});

test("phase map projection enforces metadata phase domain rules", () => {
  const root = tempWorkspace("champcity-phase-map-metadata-rules-");
  seedApprovedProjectPlanning(root);
  const result = generatePhaseMapHandoff(root);
  const handoffSources = [
    { path: "planning/project/PROJECT_PROFILE.md", revision: 1 },
    { path: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", revision: 1 },
    { path: result.handoffMarkdownPath, revision: 1 },
  ];
  writeDoc(root, result.phaseMapMarkdownPath, "phase-map", "Approved", {
    sourceRevisions: handoffSources,
    workflowData: {
      phases: [
        {
          phaseId: "phase-foundation",
          title: "Foundation",
          order: 1,
          purpose: "Establish the foundation.",
          dependsOn: [],
          sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
        },
        {
          phaseId: "phase-build",
          title: "Build",
          order: 2,
          purpose: "Build from the roadmap.",
          dependsOn: ["phase-foundation"],
          sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
        },
      ],
    },
  });

  const projection = getPhaseMapProjection(root);
  assert.equal(projection.state, "first-incomplete");
  assert.equal(projection.phase.phaseId, "phase-foundation");
});
