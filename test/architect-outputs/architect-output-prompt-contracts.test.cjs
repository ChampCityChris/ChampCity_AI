const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createArchitectDraftSubmission,
} = require("../../dist/main/architectOutputs/architectDraftSubmissionService.js");
const {
  activeProductionArchitectOutputDefinitions,
  productionArchitectOutputCatalog,
} = require("../../dist/main/architectOutputs/productionArchitectOutputCatalog.js");
const {
  projectPlanningRequiredProfileSections,
  projectPlanningRequiredRoadmapSections,
} = require("../../dist/main/projectPlanning/projectPlanningPreflight.js");
const {
  phaseInterviewRequiredSections,
} = require("../../dist/main/phaseInterview/phaseInterviewDraftOutput.js");
const {
  candidateResolutionStatuses,
  phasePlanningRequiredSections,
} = require("../../dist/main/phasePlanning/phasePlanningDraftBundle.js");

const formalWorkCardHeadings = [
  "Verified Repository Evidence",
  "Objective",
  "Runtime Sequence",
  "Required Changes",
  "Preserved Behavior",
  "Authorized Surface",
  "Risks and Constraints",
  "Acceptance Criteria",
  "Negative Constraints",
  "Implementer Report Requirements",
  "Manual Validation",
];

const repairWorkCardHeadings = [
  "Confirmed Defect",
  "Source Evidence",
  "Objective",
  "Runtime Sequence",
  "Required Changes",
  "Preserved Behavior",
  "Authorized Surface",
  "Acceptance Criteria",
  "Negative Constraints",
  "Return Target",
  "Implementer Report Requirements",
  "Manual Validation",
];

function identity(markdownPath, artifactRevision = 1, disposition = "Pending") {
  return {
    logicalDocumentId: markdownPath.replace(/[^a-z0-9]+/gi, "-"),
    markdownPath,
    artifactRevision,
    disposition,
    documentReadState: "readable",
    freshnessState: "fresh",
    operatorReviewNotes: "",
  };
}

function source(path, revision = 1) {
  return { path, revision };
}

function selectedPhase() {
  return {
    phaseId: "phase-01",
    title: "Product Foundations",
    order: 1,
    purpose: "Establish the product foundation.",
    dependsOn: [],
    sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
  };
}

function sourceHandoffFor(definition) {
  return source(`planning/fixtures/${definition.outputKind}/HANDOFF.md`, 3);
}

function submissionFor(definition) {
  return createArchitectDraftSubmission(definition, {
    sourceHandoff: sourceHandoffFor(definition),
    submissionKey: "contract-matrix",
  });
}

function domainContextFor(definition) {
  const phase = selectedPhase();
  switch (definition.outputKind) {
    case "project-architect-interview":
      return {
        status: "ready",
        projectIntake: identity("planning/project/Project_Intake/PROJECT_INTAKE_demo.md", 1, "Approved"),
        prompt: identity("planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md", 2, "Approved"),
        interviewTargets: {
          markdownPath: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md",
        },
        expectedProjectIdentity: { projectSlug: "demo" },
        evidencePaths: [],
      };
    case "project-planning":
      return {
        status: "ready",
        projectSlug: "demo",
        projectIntake: identity("planning/project/Project_Intake/PROJECT_INTAKE_demo.md", 1, "Approved"),
        prompt: identity("planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md", 1, "Approved"),
        interview: identity("planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md", 1, "Approved"),
        sourceRevisions: [
          source("planning/project/Project_Intake/PROJECT_INTAKE_demo.md"),
          source("planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md"),
          source("planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md"),
        ],
        reconciliationMode: "greenfield",
        repositoryReviewRequired: false,
        repositoryReviewContext: "",
        legacyPlanningPaths: [],
        sourceEvidencePaths: [],
        handoffMarkdownPath: "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md",
        profileMarkdownPath: "planning/project/PROJECT_PROFILE.md",
        roadmapMarkdownPath: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
        handoff: identity("planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md", 3, "Approved"),
        evidencePaths: [],
      };
    case "phase-map":
      return {
        handoff: identity("planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_demo.md", 3, "Approved"),
        phaseMapMarkdownPath: "planning/project/Phase_Map/PHASE_MAP_demo.md",
        projectSlug: "demo",
        expectedProjectIdentity: { projectSlug: "demo" },
        sourceRevisions: [
          source("planning/project/PROJECT_PROFILE.md"),
          source("planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"),
          source("planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_demo.md", 3),
        ],
      };
    case "phase-interview":
      return {
        selectedPhase: phase,
        profile: identity("planning/project/PROJECT_PROFILE.md", 1, "Approved"),
        roadmap: identity("planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", 1, "Approved"),
        phaseMap: identity("planning/project/Phase_Map/PHASE_MAP_demo.md", 1, "Approved"),
        dependencyCloseouts: [],
        handoff: identity("planning/phases/phase-01/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_phase-01.md", 3, "Approved"),
        handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_phase-01.md",
        interviewMarkdownPath: "planning/phases/phase-01/Phase_Interview.md",
        sourceRevisions: [
          source("planning/project/PROJECT_PROFILE.md"),
          source("planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"),
          source("planning/project/Phase_Map/PHASE_MAP_demo.md"),
          source("planning/phases/phase-01/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_phase-01.md", 3),
        ],
        evidencePaths: [],
      };
    case "phase-planning-bundle":
      return {
        selectedPhase: phase,
        profile: identity("planning/project/PROJECT_PROFILE.md", 1, "Approved"),
        roadmap: identity("planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", 1, "Approved"),
        phaseMap: identity("planning/project/Phase_Map/PHASE_MAP_demo.md", 1, "Approved"),
        phaseInterview: identity("planning/phases/phase-01/Phase_Interview.md", 1, "Approved"),
        handoff: identity("planning/phases/phase-01/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_phase-01.md", 3, "Approved"),
        handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_phase-01.md",
        phasePlanningMarkdownPath: "planning/phases/phase-01/Phase_Planning.md",
        workCardPlanMarkdownPath: "planning/phases/phase-01/Work_Card_Plan.md",
        sourceRevisions: [
          source("planning/project/PROJECT_PROFILE.md"),
          source("planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"),
          source("planning/project/Phase_Map/PHASE_MAP_demo.md"),
          source("planning/phases/phase-01/Phase_Interview.md"),
          source("planning/phases/phase-01/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_phase-01.md", 3),
        ],
        evidencePaths: [],
      };
    case "formal-work-card":
      return {
        handoff: identity("planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_HANDOFF_WC41.md", 3, "Approved"),
        phaseId: "phase-01",
        workCardId: "WC41",
        candidateId: "WC41",
        candidate: { candidateId: "WC41", title: "Domain-Specific Architect Handoff Prompt Contracts" },
        targetPath: "planning/phases/phase-01/Work_Cards/WC41_domain_specific_architect_handoff_prompt_contracts.md",
        sourceRevisions: [source("planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_HANDOFF_WC41.md", 3)],
      };
    case "repair-work-card":
      return {
        handoff: identity("planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC41-REPAIR01.md", 3, "Approved"),
        phaseId: "phase-01",
        repairId: "WC41-REPAIR01",
        parentWorkCardId: "WC41",
        workflowData: {
          repairId: "WC41-REPAIR01",
          originalParentWorkCardId: "WC41",
          origin: "preValidationReportReview",
          evidencePath: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC41.md",
          boundedDefect: "Prompt contract mismatch",
          returnTarget: "work-card-building-review",
        },
        targetPath: "planning/phases/phase-01/Work_Cards/WC41-REPAIR01_prompt_contract_mismatch.md",
        sourceRevisions: [source("planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC41-REPAIR01.md", 3)],
      };
    default:
      throw new Error(`Unhandled output kind: ${definition.outputKind}`);
  }
}

function promptFor(definition) {
  const submission = submissionFor(definition);
  const instruction = definition.buildPreparedInstruction({
    workspaceRoot: "<PROJECT_REPO>",
    submission,
    sourceHandoff: submission.sourceHandoff,
    domainContext: domainContextFor(definition),
  });
  return { instruction, submission };
}

function jsonActionBlocks(instruction) {
  return [...instruction.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]))
    .filter((block) => block.action === "create_markdown_artifact");
}

function countLine(instruction, line) {
  const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (instruction.match(new RegExp(`^${escaped}$`, "gm")) ?? []).length;
}

function assertHeadings(instruction, title, sections = []) {
  assert.equal(countLine(instruction, `# ${title}`), 1, `${title} H1 should appear once`);
  for (const section of sections) {
    assert.equal(countLine(instruction, `## ${section}`), 1, `${title} should include ## ${section} once`);
  }
}

test("production catalog requires definition-owned prepared-instruction builders", () => {
  const definitions = activeProductionArchitectOutputDefinitions();
  assert.equal(productionArchitectOutputCatalog.length, 7);
  assert.equal(definitions.length, 7);
  for (const definition of definitions) {
    assert.equal(typeof definition.buildPreparedInstruction, "function", `${definition.outputKind} owns a builder`);
  }
});

test("production prompt matrix states all nine slot contracts before draft writes", () => {
  const prompts = new Map(
    activeProductionArchitectOutputDefinitions().map((definition) => [
      definition.outputKind,
      { definition, ...promptFor(definition) },
    ]),
  );

  const matrix = [
    ["project-architect-interview", "Project Architect Interview", [
      "Project Understanding",
      "Users and Primary Workflows",
      "Scope",
      "Non-Scope",
      "Constraints",
      "Key Decisions",
      "Architect Recommendations",
      "Data and Integration Requirements",
      "Security, Compliance, and Operational Considerations",
      "Risks and Dependencies",
      "Assumptions",
      "Deferred Decisions",
      "Unresolved Questions",
      "Acceptance Direction",
      "Project Planning Direction",
    ]],
    ["project-planning", "Project Profile", projectPlanningRequiredProfileSections()],
    ["project-planning", "Project Roadmap", projectPlanningRequiredRoadmapSections()],
    ["phase-map", "Phase Map", []],
    ["phase-interview", "Phase Interview", phaseInterviewRequiredSections()],
    ["phase-planning-bundle", "Phase Planning", phasePlanningRequiredSections()],
    ["phase-planning-bundle", "Work Card Plan", []],
    ["formal-work-card", "WC41 \u2014 Domain-Specific Architect Handoff Prompt Contracts", formalWorkCardHeadings],
    ["repair-work-card", "WC41-REPAIR01 \u2014 Prompt contract mismatch", repairWorkCardHeadings],
  ];

  for (const [outputKind, title, sections] of matrix) {
    const prompt = prompts.get(outputKind);
    assert.ok(prompt, outputKind);
    assertHeadings(prompt.instruction, title, sections);
  }

  for (const { definition, instruction, submission } of prompts.values()) {
    assert.doesNotMatch(instruction, /prepared Architect output handoff for workspace/);
    assert.doesNotMatch(instruction, /final canonical output paths.*"relativePath"/s);
    const actionBlocks = jsonActionBlocks(instruction);
    assert.equal(actionBlocks.length, definition.slots.length, `${definition.outputKind} call count`);
    assert.equal((instruction.match(/"action": "create_markdown_artifact"/g) ?? []).length, definition.slots.length);
    for (const slot of submission.expectedDraftSlots) {
      const block = actionBlocks.find((candidate) => candidate.params.relativePath === slot.draftRelativePath);
      assert.ok(block, `${definition.outputKind} writes temporary path for ${slot.slotId}`);
      assert.equal(block.params.overwrite, false);
    }
  }

  const phaseMapPrompt = prompts.get("phase-map").instruction;
  assert.match(phaseMapPrompt, /exactly one champcity-phase-map fenced JSON block/);
  assert.match(phaseMapPrompt, /JSON root must be an object with one non-empty phases array/);
  assert.match(phaseMapPrompt, /Each phase entry must contain only phaseId, title, order, purpose, dependsOn, and sourceReferences/);
  assert.match(phaseMapPrompt, /phaseId values and order values must be unique/);
  assert.match(phaseMapPrompt, /Every dependency must resolve to another phase in the same map; self-dependencies and dependency cycles are prohibited/);
  assert.match(phaseMapPrompt, /sourceReferences must contain normalized repository-relative paths/);
  assert.match(phaseMapPrompt, /Do not persist completion state/);
  assert.match(phaseMapPrompt, /Derive the substantive phase list from the approved full Project Roadmap and Project Profile/);
  assert.equal(jsonActionBlocks(phaseMapPrompt).length, 1);
  assert.equal((phaseMapPrompt.match(/```json/g) ?? []).length, 1);
  assert.doesNotMatch(phaseMapPrompt, /Use this structural shape/);
  assert.doesNotMatch(phaseMapPrompt, /roadmap-derived/);
  assert.doesNotMatch(phaseMapPrompt, /"phases"\s*:\s*\[/);

  const phasePlanningPrompt = prompts.get("phase-planning-bundle").instruction;
  assert.match(phasePlanningPrompt, /Require exactly one champcity-work-card-plan fenced JSON array/);
  for (const field of [
    "candidateId",
    "order",
    "title",
    "purpose",
    "dependsOn",
    "resolutionStatus",
    "resolutionReason",
    "evidencePaths",
    "carriedForwardToPhaseId",
  ]) {
    assert.match(phasePlanningPrompt, new RegExp(field));
  }
  assert.match(
    phasePlanningPrompt,
    new RegExp(`Allowed resolution statuses: ${candidateResolutionStatuses.join(", ")}`),
  );
  assert.doesNotMatch(phasePlanningPrompt, /"candidates"\s*:/);
  assert.doesNotMatch(phasePlanningPrompt, /<candidate-id>/);
  assert.doesNotMatch(phasePlanningPrompt, /```champcity-work-card-plan[\s\S]*\[/);

  const firstDraftCall = phasePlanningPrompt.indexOf('"relativePath"');
  assert.ok(phasePlanningPrompt.indexOf("# Phase Planning") < firstDraftCall);
  assert.ok(phasePlanningPrompt.indexOf("# Work Card Plan") < firstDraftCall);

  const formalPrompt = prompts.get("formal-work-card").instruction;
  const formalActionBlocks = jsonActionBlocks(formalPrompt);
  assert.match(formalPrompt, /^This is the Formal Work Card Architect session\.$/m);
  assert.match(formalPrompt, /^Read the exact current Approved Work Card Intake handoff:$/m);
  assert.match(formalPrompt, /Inspect the complete production path relevant to this candidate, including service or domain logic, main-process IPC exposure, preload exposure, shared contracts, renderer wiring, persistence or canonical writers, downstream consumers, and relevant tests/);
  assert.match(formalPrompt, /Distinguish:\n- verified repository behavior;\n- approved planning direction that is not yet implemented;\n- unresolved assumptions or Operator-owned choices\./);
  assert.match(formalPrompt, /Make all Architect-owned decisions needed for this Work Card/);
  assert.match(formalPrompt, /When a material Operator-owned choice remains, ask one primary question at a time in plain language/);
  assert.match(formalPrompt, /When no material Operator-owned choice remains, proceed without asking a question/);
  assert.match(formalPrompt, /existing authoritative evidence\n→ authorized application action\n→ required state transition\n→ persistence or rendering result\n→ Operator-visible outcome/);
  assert.match(formalPrompt, /Acceptance Criteria prove the actual production path/);
  assert.match(formalPrompt, /Require positive and negative proof, state before and after the action, final repository bytes or rendered projection, failure handling, retry behavior when relevant, and downstream readiness/);
  assert.match(formalPrompt, /Manual Validation contains only visual, interactive, timing-sensitive, or embedded-browser checks that require the running product/);
  assert.match(formalPrompt, /call artifact_toolbox\.create_markdown_artifact exactly once/);
  assert.equal(formalActionBlocks.length, 1);
  assert.equal(formalActionBlocks[0].params.overwrite, false);
  assert.match(formalActionBlocks[0].params.relativePath, /formal-work-card\.md$/);
  assert.doesNotMatch(formalPrompt, /"relativePath":\s*"planning\/phases\/phase-01\/Work_Cards/);
  assert.doesNotMatch(formalPrompt, /prepared Formal Work Card Architect output handoff/);
});
