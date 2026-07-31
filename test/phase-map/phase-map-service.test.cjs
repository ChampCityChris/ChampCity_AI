const assert = require("node:assert/strict");
const test = require("node:test");

const {
  generatePhaseMapHandoff,
  getPhaseMapHandoffInstruction,
  getPhaseMapProjection,
  setPhaseMapDisposition,
} = require("../../dist/main/phaseMap/phaseMapService.js");
const {
  seedApprovedProjectPlanning,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

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
  assert.match(instruction, /"action": "submit_handoff_outputs"/);
  assert.match(instruction, /"handoffKind": "phase-map"/);
  assert.match(instruction, /"phaseMapMarkdown"/);
  assert.match(instruction, /"phases"/);
  assert.match(instruction, /Derive the substantive phase list from the approved full Project Roadmap and Project Profile/);
  assert.match(instruction, /handoff kind is a selector, not authority/);
  assert.doesNotMatch(instruction, /top-level JSON value is an array/);
  assert.doesNotMatch(instruction, /save_project_planning_outputs|save_architect_interview_output|write_markdown_artifact/);
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
  assert.deepEqual(parsed.metadata.workflowData, {
    handoffKind: "phase-map",
    contractId: "phase-map-output-submission-v1",
    phaseMapTarget: result.phaseMapMarkdownPath,
    requiredTitle: "Phase Map",
    requiredDomainBlocks: ["champcity-phase-map"],
  });
  assert.equal(parsed.metadata.workflowData.phases, undefined);
  assert.deepEqual(Object.keys(parsed.metadata.workflowData), [
    "handoffKind",
    "contractId",
    "phaseMapTarget",
    "requiredTitle",
    "requiredDomainBlocks",
  ]);
  assert.doesNotMatch(parsed.bodyMarkdown, /phase-01|Initial project building phase|Work Card|repair|manual fallback/i);
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
