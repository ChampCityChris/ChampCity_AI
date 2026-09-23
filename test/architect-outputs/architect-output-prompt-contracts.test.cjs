const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

test("Feature planning requires baseline delta and preservation while keeping candidates within the current capability boundary", async (t) => {
  const { seedPreparedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
  const { root, intake } = seedPreparedRoutedWorkIntake(t, "feature-change", { workRequest: "Add CSV export to existing schedules", desiredOutcome: "Export current schedules without changing scheduling behavior" });
  const { workPlanningKernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  const { getWorkRouteDecision, decideWorkRoute, recommendWorkRouteReroute } = require("../../dist/main/workIntake/workRouteDecisionService.js");
  const baselinePath = path.join(root, "planning", "existing-roadmap.md");
  fs.writeFileSync(baselinePath, "# Existing roadmap\nExport later; unrelated sharing remains future work.\n");
  const baselineBytes = fs.readFileSync(baselinePath, "utf8");
  let prepared = await workPlanningKernel.prepare(root, intake.intakeId, "assessment");
  for (const rule of [/current baseline/, /requested capability delta/, /affected services/i, /state\/UI\/contracts/, /integration points/, /compatibility, rollout, recovery/, /regression boundary/, /demonstrated hard dependencies/, /Do not regenerate the whole product roadmap/, /Every Work Item and Phase candidate must trace/]) assert.match(prepared.preparedInstruction, rule);
  assert.doesNotMatch(prepared.preparedInstruction, /## Product Outcome and Users/);
  assert.match(prepared.preparedInstruction, /direct Plan/); assert.match(prepared.preparedInstruction, /phased Plan only when/);
  const submit = (model, body) => { const file = path.join(root, model.submission.expectedDraftSlots[0].draftRelativePath); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); };
  submit(prepared, "# Route Architect Assessment\n## Evidence\nExisting product.\n## Decisions\nExport.\n## Risks and Unresolved Questions\nCSV encoding.\n");
  let result = await workPlanningKernel.get(root, intake.intakeId, "assessment");
  assert.equal(result.submission.state, "promotion-failed"); assert.equal(result.artifact, null);
  assert.match(result.error, /Current Product Baseline/);
  prepared = await workPlanningKernel.prepare(root, intake.intakeId, "assessment");
  submit(prepared, "# Route Architect Assessment\n## Evidence\nThe Intake requests export from the existing scheduler.\n## Decisions\nAdd read-only CSV export.\n## Risks and Unresolved Questions\nQuote CSV safely.\n## Current Product Baseline\nSchedules can be created and edited.\n## Requested Capability Delta\nExport the current schedule as CSV.\n## Behavior and Contracts to Preserve\nScheduling and persistence remain unchanged.\n## Affected Architecture and Integration Points\nA read-only export adapter consumes current schedule data.\n## Compatibility and Rollout\nAdd an export action with no storage change.\n## Regression Boundary\nProve scheduling behavior and CSV output.\n## Excluded Future Work\nSharing remains outside this Intake.\n");
  result = await workPlanningKernel.get(root, intake.intakeId, "assessment");
  assert.equal(result.artifact.disposition, "Pending", result.error);
  await workPlanningKernel.review(root, intake.intakeId, "assessment", { expectedRevision: 1, disposition: "Approved", notes: "Feature boundary accepted" });
  const plan = await workPlanningKernel.prepare(root, intake.intakeId, "plan");
  assert.match(plan.preparedInstruction, /## Feature Candidate Traceability/);
  const structure = { topology: "direct", topologyRationale: "One bounded export capability.", acceptanceCriteria: ["CSV export preserves scheduling"],
    workItems: [{ workItemId: "WI_EXPORT", title: "Add schedule CSV export", purpose: "Export existing schedule data", dependsOn: [], acceptanceCriteria: ["CSV values are correct and scheduling regression proof passes"] }] };
  submit(plan, "# Work Plan\n## Scope\nCSV export only.\n## Preserved Behavior\nScheduling and persistence.\n## Acceptance\nExport and scheduling regression proof.\n## Execution Structure\n```champcity-work-plan\n" + JSON.stringify(structure) + "\n```\n## Baseline and Capability Delta\nAdd export to the existing scheduler.\n## Preservation and Regression Proof\nRetain scheduling operations.\n## Affected Services State UI and Contracts\nRead-only exporter and UI action.\n## Rollout and Compatibility\nAdditive action; unchanged data.\n## Hard Dependencies and Excluded Work\nNo hard dependency; sharing excluded.\n## Feature Candidate Traceability\nWI_EXPORT delivers exactly the export delta.\n");
  const promoted = await workPlanningKernel.get(root, intake.intakeId, "plan");
  assert.equal(promoted.artifact.structure.workItems.length, 1, promoted.error);
  assert.equal(promoted.artifact.structure.workItems[0].workItemId, "WI_EXPORT");
  assert.equal(promoted.artifact.structure.phases, undefined);
  assert.equal(fs.readFileSync(baselinePath, "utf8"), baselineBytes, "existing roadmap remains untouched");
  const assessment = await workPlanningKernel.get(root, intake.intakeId, "assessment");
  const assessmentPath = path.join(root, assessment.artifact.relativePath);
  const planPath = path.join(root, promoted.artifact.relativePath);
  const assessmentBytes = fs.readFileSync(assessmentPath);
  const planBytes = fs.readFileSync(planPath);
  const retainedRoute = await getWorkRouteDecision(root, intake.intakeId);
  const retainedSelection = retainedRoute.selection;
  const pendingReroute = await recommendWorkRouteReroute(root, intake.intakeId, {
    priorDecisionId: retainedSelection.decisionId,
    replacementRouteId: "refactor-migration",
    rationale: "Consider whether export should be handled as a migration.",
    sourceEvidence: [{ path: promoted.artifact.relativePath, revision: promoted.artifact.artifactRevision }],
  });
  const resolvedRoute = await decideWorkRoute(root, intake.intakeId, {
    expectedDecisionRevision: pendingReroute.artifactRevision,
    sourceAssessment: pendingReroute.sourceAssessment,
    disposition: "override",
    selectedRouteId: "feature-change",
    rationale: "Retain the bounded feature route and its approved planning.",
  });
  assert.equal(resolvedRoute.selection.decisionId, retainedSelection.decisionId);
  assert.equal(resolvedRoute.selection.selectedRouteId, retainedSelection.selectedRouteId);
  assert.ok(resolvedRoute.artifactRevision > retainedRoute.artifactRevision);
  assert.deepEqual(resolvedRoute.supersessions, retainedRoute.supersessions);
  const retainedAssessment = await workPlanningKernel.get(root, intake.intakeId, "assessment");
  const retainedPlan = await workPlanningKernel.get(root, intake.intakeId, "plan");
  assert.equal(retainedAssessment.artifact.stale, false);
  assert.equal(retainedPlan.artifact.stale, false);
  assert.deepEqual(fs.readFileSync(assessmentPath), assessmentBytes);
  assert.deepEqual(fs.readFileSync(planPath), planBytes);
});

test("routing handoff constrains advisory work and its body rejects route-control or ambiguous primary values", () => {
  const { createRoutingAssessmentDefinition, parseRoutingAssessmentBody } = require("../../dist/main/workIntake/workRoutingAssessmentService.js");
  const definition = createRoutingAssessmentDefinition("intake-00000000-0000-0000-0000-000000000000");
  const submission = createArchitectDraftSubmission(definition, {
    sourceHandoff: { path: "planning/work-intake/intakes/intake-fixture.md", revision: 3 }, submissionKey: "prompt-proof",
  });
  const instruction = definition.buildPreparedInstruction({ workspaceRoot: os.tmpdir(), submission, sourceHandoff: submission.sourceHandoff,
    domainContext: { intake: { workRequest: "Add export", desiredOutcome: "Portable output", knownConstraints: "Preserve architecture", hasExistingSourceOrPlanning: true, repositoryReviewContext: "src/export.ts" }, sourceDigests: {} } });
  assert.match(instruction, /inspect materially relevant/i);
  assert.match(instruction, /Do not conduct the full Greenfield, Feature, Refactor\/Migration/);
  assert.match(instruction, /Do not generate a roadmap, Phase, Plan, Work Card/);
  assert.match(instruction, /Do not activate a route or perform Git mutations/);
  assert.match(instruction, /exactly one primary route/);
  assert.match(instruction, /alternate only when genuine ambiguity/);
  const invocation = JSON.parse(instruction.match(/```json\n([\s\S]+?)\n```/)[1]);
  assert.equal(invocation.action, "write_markdown_artifact");
  assert.equal(invocation.params.relativePath, submission.expectedDraftSlots[0].draftRelativePath);
  assert.deepEqual(Object.keys(invocation.params).sort(), ["content", "overwrite", "relativePath"]);
  const body = "# Work Intake Routing Assessment\n## Recommended Route\nrefactor-migration\n## Traits\nNone\n## Evidence\n- README.md\n## Rationale\nTransform existing architecture with preservation.\n## Alternate Route\nNone\n";
  assert.equal(parseRoutingAssessmentBody(body).recommendedRouteId, "refactor-migration");
  assert.throws(() => parseRoutingAssessmentBody(body.replace("refactor-migration", "unknown")), /exactly one/);
  assert.throws(() => parseRoutingAssessmentBody(body + "## Selected Route\ngreenfield\n"), /Unexpected/);
  assert.throws(() => parseRoutingAssessmentBody(body.replace("## Alternate Route\nNone", "## Alternate Route\ninfrastructure-platform")), /ambiguity/);
  assert.throws(() => parseRoutingAssessmentBody(body.replace("README.md", "../outside.md")), /repository evidence paths/);
});

const {
  createArchitectDraftSubmission,
} = require("../../dist/main/architectOutputs/architectDraftSubmissionService.js");
const {
  createAgentHarnessToolRegistry,
} = require("../../dist/main/agentHarness/tools/toolRegistry.js");
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
const {
  buildImplementationValidationScopeGuidance,
} = require("../../dist/main/validation/implementationValidationScopeGuidance.js");

const formalWorkCardHeadings = [
  "Verified Repository Evidence",
  "Objective",
  "Runtime Sequence",
  "Required Changes",
  "Preserved Behavior",
  "In-Scope Surface",
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
  "In-Scope Surface",
  "Acceptance Criteria",
  "Negative Constraints",
  "Return Target",
  "Implementer Report Requirements",
  "Manual Validation",
];

test("validation-scope guidance preserves shared scope and profile rules and keeps Work Card coverage governance out of Fix Cards", () => {
  const workCardGuidance = buildImplementationValidationScopeGuidance("work-card");
  const fixCardGuidance = buildImplementationValidationScopeGuidance("fix-card");
  const normalizeContractNoun = (lines) => lines.map((line) =>
    line.replaceAll("Work Card", "Contract").replaceAll("Fix Card", "Contract"),
  );
  const workCardRules = workCardGuidance.filter((line) => line.startsWith("- "));
  const fixCardRules = fixCardGuidance.filter((line) => line.startsWith("- "));

  assert.equal(workCardRules.length, 14);
  assert.equal(fixCardRules.length, 9);
  assert.deepEqual(normalizeContractNoun(workCardRules.slice(0, 9)), normalizeContractNoun(fixCardRules));
  for (const phrase of ["work-item profile owns a single build", "failed scenario, affected capabilities, and preserved behavior", "release qualification and explicitly owned full regression"]) {
    assert.ok(workCardGuidance.some(line=>line.includes(phrase)), phrase);
    assert.ok(fixCardGuidance.some(line=>line.includes(phrase)), phrase);
  }
  for (const workCardOnlyPhrase of [
    "validation/capability-map.json",
    "reuse an existing test unchanged",
    "does not by itself require a new test",
    "does not require test-count growth",
    "specific coverage-gap justification",
    "existing tests reused unchanged",
    "existing tests modified or extended",
    "tests consolidated when explicitly authorized",
    "tests retired when explicitly authorized",
    "new permanent tests added",
  ]) {
    assert.ok(workCardGuidance.some((line) => line.includes(workCardOnlyPhrase)), workCardOnlyPhrase);
    assert.equal(fixCardGuidance.some((line) => line.includes(workCardOnlyPhrase)), false, workCardOnlyPhrase);
  }
});

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
        implementerReportPath: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC41_domain_specific_architect_handoff_prompt_contracts.md",
        selectedWorkspaceTarget: {
          mcpWorkspaceId: "alpha",
          workspaceLabel: "Alpha Test Workspace",
          handoffPath: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_HANDOFF_WC41.md",
          formalWorkCardTargetPath: "planning/phases/phase-01/Work_Cards/WC41_domain_specific_architect_handoff_prompt_contracts.md",
          implementerReportTargetPath: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC41_domain_specific_architect_handoff_prompt_contracts.md",
        },
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
  const workspaceRoot = boundPromptWorkspaceRoot();
  const instruction = definition.buildPreparedInstruction({
    workspaceRoot,
    submission,
    sourceHandoff: submission.sourceHandoff,
    domainContext: domainContextFor(definition),
  });
  return { instruction, submission };
}

function boundPromptWorkspaceRoot(workspaceId = "alpha") {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-prompt-contract-"));
  const root = path.join(container, workspaceId);
  fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".champcity", "mcp-workspace-binding.json"),
    JSON.stringify({
      mcpWorkspaceId: workspaceId,
      label: `${workspaceId.toUpperCase()} Test Workspace`,
      repositoryName: `Test/${workspaceId}`,
      gitBacked: true,
    }, null, 2),
    "utf8",
  );
  return root;
}

function gitBackedPromptWorkspaceRootWithoutBinding(repositoryName) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-unbound-git-prompt-"));
  const root = path.join(container, "Alpha");
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".git", "config"),
    [
      "[core]",
      "\trepositoryformatversion = 0",
      "\tfilemode = false",
      "[remote \"origin\"]",
      `\turl = https://github.com/${repositoryName}.git`,
      "\tfetch = +refs/heads/*:refs/remotes/origin/*",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, ".git", "HEAD"),
    "ref: refs/heads/main\n",
    "utf8",
  );
  return root;
}

function boundPromptWorkspaceRootForRepository(workspaceId, repositoryName) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-bound-git-prompt-"));
  const root = path.join(container, workspaceId);
  fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".champcity", "mcp-workspace-binding.json"),
    JSON.stringify({
      mcpWorkspaceId: workspaceId,
      label: "Configured MCP Workspace",
      repositoryName,
      branch: "main",
      gitBacked: true,
    }, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, ".git", "config"),
    [
      "[remote \"origin\"]",
      `\turl = https://github.com/${repositoryName}.git`,
      "",
    ].join("\n"),
    "utf8",
  );
  return root;
}

function jsonActionBlocks(instruction) {
  return [...instruction.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]))
    .filter((block) => block.action === "write_markdown_artifact");
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

test("production Architect-output prompt toolbox references match live Agent Harness registry", () => {
  const registry = createAgentHarnessToolRegistry({
    workspaceAccess: {
      resolveWorkspaceContext: () => {
        throw new Error("parity test should not call tools");
      },
    },
    userDataRoot: os.tmpdir(),
  });
  const inventory = new Map(
    registry.listTools("files.read files.write")
      .map((tool) => [tool.name, new Set(tool.actions)]),
  );

  for (const definition of activeProductionArchitectOutputDefinitions()) {
    const { instruction } = promptFor(definition);
    const toolboxReferences = [...instruction.matchAll(/\b([a-z_]+_toolbox)\.([a-z0-9_]+)\b/g)]
      .map((match) => ({ toolbox: match[1], action: match[2] }));
    assert.ok(toolboxReferences.length > 0, `${definition.outputKind} includes explicit toolbox references`);
    for (const reference of toolboxReferences) {
      assert.ok(inventory.has(reference.toolbox), `${definition.outputKind} references known toolbox ${reference.toolbox}`);
      assert.ok(
        inventory.get(reference.toolbox).has(reference.action),
        `${definition.outputKind} references known action ${reference.toolbox}.${reference.action}`,
      );
    }

    const actionBlocks = jsonActionBlocks(instruction);
    assert.equal(actionBlocks.length, definition.slots.length, `${definition.outputKind} Markdown write call count`);
    for (const block of actionBlocks) {
      assert.equal(block.action, "write_markdown_artifact");
      assert.equal(block.workspaceId, "alpha");
      assert.equal(typeof block.params.relativePath, "string");
      assert.equal(typeof block.params.content, "string");
      assert.equal(block.params.overwrite, false);
    }
    assert.equal(
      (instruction.match(/artifact_toolbox\.write_markdown_artifact/g) ?? []).length,
      definition.slots.length,
      `${definition.outputKind} uses artifact toolbox write action`,
    );
    assert.doesNotMatch(instruction, /artifact_toolbox\.create_markdown_artifact/);
    assert.doesNotMatch(instruction, /create_markdown_artifact/);
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
    assert.equal((instruction.match(/"action": "write_markdown_artifact"/g) ?? []).length, definition.slots.length);
    assert.doesNotMatch(instruction, /create_markdown_artifact/);
    for (const slot of submission.expectedDraftSlots) {
      const block = actionBlocks.find((candidate) => candidate.params.relativePath === slot.draftRelativePath);
      assert.ok(block, `${definition.outputKind} writes temporary path for ${slot.slotId}`);
      assert.equal(block.workspaceId, "alpha", `${definition.outputKind} uses bound workspaceId`);
      assert.equal(block.params.overwrite, false);
    }
    assert.match(instruction, /MCP workspace binding:/);
    assert.match(instruction, /Bound workspaceId: alpha/);
    assert.match(instruction, /Use ChampCity MCP workspaceId "alpha" only\./);
    assert.match(instruction, /BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH/);
    assert.doesNotMatch(instruction, /Resolve the configured workspace ID/);
    assert.doesNotMatch(instruction, /when it is not already known/);
    assert.doesNotMatch(instruction, /workspaceId": "<resolved workspace ID>"/);
    assert.doesNotMatch(instruction, /Use ChampCity MCP with repository reference <PROJECT_REPO>\./);
    assert.doesNotMatch(instruction, /Treat that selected workspace as <PROJECT_REPO>/);
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
  assert.match(phaseMapPrompt, /Preserve the approved Project Roadmap's outcome grouping when defining phase boundaries/);
  assert.match(phaseMapPrompt, /Do not re-expand one Roadmap outcome into separate subsystem, tooling, or foundation phases unless the approved Roadmap requires those as independent milestones/);
  assert.match(phaseMapPrompt, /Keep fine-grained prerequisite sequencing inside Phase Planning and Work Card dependencies/);
  assert.equal(jsonActionBlocks(phaseMapPrompt).length, 1);
  assert.equal((phaseMapPrompt.match(/```json/g) ?? []).length, 1);
  assert.doesNotMatch(phaseMapPrompt, /Use this structural shape/);
  assert.doesNotMatch(phaseMapPrompt, /roadmap-derived/);
  assert.doesNotMatch(phaseMapPrompt, /"phases"\s*:\s*\[/);

  const projectPlanningPrompt = prompts.get("project-planning").instruction;
  assert.match(projectPlanningPrompt, /Repository review context:/);
  assert.match(projectPlanningPrompt, /verified current implementation, established planning or architecture intent, historical or legacy evidence, and unresolved assumptions/);
  assert.match(projectPlanningPrompt, /controlling constraint on both the Project Profile and Project Roadmap unless the Operator explicitly revises it/);
  assert.match(projectPlanningPrompt, /approved Architect Interview is the primary semantic synthesis/);
  assert.match(projectPlanningPrompt, /prior Interview Prompt is provenance and contract evidence.*only when needed to resolve a contradiction or ambiguity/);
  assert.match(projectPlanningPrompt, /two simultaneous axes: architecture or migration requirements, and product or Operator capability requirements/);
  assert.match(projectPlanningPrompt, /Neither axis may silently erase the other/);
  assert.match(projectPlanningPrompt, /For every material product capability or workflow.*must do exactly one of the following/);
  assert.match(projectPlanningPrompt, /explicitly defer it with rationale; explicitly supersede it with the governing replacement decision; or mark it conditional and state the condition/);
  assert.match(projectPlanningPrompt, /Silent omission is prohibited/);
  assert.match(projectPlanningPrompt, /internal service, interface, adapter, or other enabling boundary/);
  assert.match(projectPlanningPrompt, /does not by itself prove delivery of the corresponding capability unless the Roadmap identifies the consuming behavior or outcome/);
  assert.match(projectPlanningPrompt, /both the architecture or migration boundary established or changed and the meaningful product or Operator capability/);
  assert.match(projectPlanningPrompt, /real consuming vertical slice as early as architecture dependencies safely permit/);
  assert.match(projectPlanningPrompt, /Do not build every hypothetical portability abstraction first/);
  assert.doesNotMatch(projectPlanningPrompt, /Source evidence paths:/i);
  assert.match(projectPlanningPrompt, /shortest dependency-complete path to the next coherent usable or productive milestone/);
  assert.match(projectPlanningPrompt, /at or immediately before the first outcome that consumes it/);
  assert.match(projectPlanningPrompt, /Avoid standalone horizontal foundation phases/);
  assert.match(projectPlanningPrompt, /Avoid speculative prework for future capabilities/);
  assert.match(projectPlanningPrompt, /Use Phase Planning and Work Card dependencies for fine-grained sequencing/);
  assert.match(projectPlanningPrompt, /Do not assume an MVP\. Use MVP framing only when the approved project evidence explicitly establishes/);
  assert.match(projectPlanningPrompt, /existing system, treat current implemented behavior as the functional baseline/);
  assert.match(projectPlanningPrompt, /existing-product refactor, migration, platform-transition, feature-expansion, or capability-extraction work/);
  assert.match(projectPlanningPrompt, /legacy V1 structural labels and do not establish MVP semantics/);
  assert.match(projectPlanningPrompt, /use MVP Scope for the primary bounded delivery, migration, or refactor scope/);
  assert.match(projectPlanningPrompt, /use Post-MVP Roadmap for subsequent lifecycle work after that primary scope/);
  assert.doesNotMatch(projectPlanningPrompt, /MVP phases must remain clearly identified/);
  assert.doesNotMatch(projectPlanningPrompt, /Post-MVP phases or roadmap stages must be separately sequenced/);
  assert.doesNotMatch(projectPlanningPrompt, /not only the MVP boundary/);

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
  assert.match(formalPrompt, /existing verified evidence\n→ application-owned action\n→ required state transition\n→ persistence or rendering result\n→ Operator-visible outcome/);
  assert.match(formalPrompt, /## In-Scope Surface/);
  assert.doesNotMatch(formalPrompt, /## Authorized Surface/);
  assert.match(formalPrompt, /Acceptance Criteria prove the actual production path/);
  assert.match(formalPrompt, /Require positive and negative proof, state before and after the action, final repository bytes or rendered projection, failure handling, retry behavior when relevant, and downstream readiness/);
  assert.match(formalPrompt, /Tests are evidence of the Work Card objective, not an independent product decision/);
  assert.match(formalPrompt, /smallest practical boundary relevant to the behavior owned by this Work Card/);
  assert.match(formalPrompt, /Do not make an entire multi-domain test file or broad suite an all-or-nothing acceptance gate/);
  assert.match(formalPrompt, /demonstrated unrelated or pre-existing failure/);
  assert.match(formalPrompt, /inspect the existing tests and validation\/capability-map\.json/);
  assert.match(formalPrompt, /reuse an existing test unchanged/);
  assert.match(formalPrompt, /does not require test-count growth/);
  assert.match(formalPrompt, /specific coverage-gap justification/);
  assert.match(formalPrompt, /existing tests reused unchanged/);
  assert.match(formalPrompt, /existing tests modified or extended/);
  assert.match(formalPrompt, /tests consolidated when explicitly authorized/);
  assert.match(formalPrompt, /tests retired when explicitly authorized/);
  assert.match(formalPrompt, /new permanent tests added/);
  assert.match(formalPrompt, /Manual Validation contains only visual, interactive, timing-sensitive, or embedded-browser checks that require the running product/);
  assert.match(formalPrompt, /call artifact_toolbox\.write_markdown_artifact exactly once/);
  assert.equal(formalActionBlocks.length, 1);
  assert.equal(formalActionBlocks[0].params.overwrite, false);
  assert.match(formalActionBlocks[0].params.relativePath, /formal-work-card\.md$/);
  assert.doesNotMatch(formalPrompt, /"relativePath":\s*"planning\/phases\/phase-01\/Work_Cards/);
  assert.doesNotMatch(formalPrompt, /prepared Formal Work Card Architect output handoff/);

  const repairPrompt = prompts.get("repair-work-card").instruction;
  assert.match(repairPrompt, /^This is the Repair Work Card Architect session\.$/m);
  assert.match(repairPrompt, /Bound workspaceId: alpha/);
  assert.match(repairPrompt, /Do not inspect or write any other repository or workspace/);
  assert.match(repairPrompt, /Phase ID: phase-01/);
  assert.match(repairPrompt, /Repair ID: WC41-REPAIR01/);
  assert.match(repairPrompt, /Parent Work Card: WC41/);
  assert.match(repairPrompt, /Source evidence path: planning\/phases\/phase-01\/Implementer_Reports\/IMPLEMENTER_REPORT_WC41\.md/);
  assert.match(repairPrompt, /Repair handoff path: planning\/phases\/phase-01\/Architect_Handoffs\/REPAIR_ARCHITECT_HANDOFF_WC41-REPAIR01\.md/);
  assert.match(repairPrompt, /Return target: work-card-building-review/);
  assert.match(repairPrompt, /Final Repair Work Card target: planning\/phases\/phase-01\/Work_Cards\/WC41-REPAIR01_prompt_contract_mismatch\.md/);
  assert.match(repairPrompt, /## In-Scope Surface/);
  assert.doesNotMatch(repairPrompt, /validation\/capability-map\.json/);
  assert.doesNotMatch(repairPrompt, /existing tests reused unchanged/);
  assert.doesNotMatch(repairPrompt, /specific coverage-gap justification/);
  assert.doesNotMatch(repairPrompt, /## Authorized Surface/);
  assert.doesNotMatch(repairPrompt, /Use ChampCity MCP with repository reference <PROJECT_REPO>\./);
  assert.doesNotMatch(repairPrompt, /ChampCityChris|champcity_ai/i);
});

test("workspace-bound MCP prompt contract forbids multi-workspace fallback", () => {
  const definition = activeProductionArchitectOutputDefinitions()
    .find((candidate) => candidate.outputKind === "phase-map");
  assert.ok(definition);
  const submission = submissionFor(definition);
  const instruction = definition.buildPreparedInstruction({
    workspaceRoot: boundPromptWorkspaceRoot("alpha"),
    submission,
    sourceHandoff: submission.sourceHandoff,
    domainContext: domainContextFor(definition),
  });

  assert.match(instruction, /Bound workspaceId: alpha/);
  assert.match(instruction, /Do not inspect, search, compare, or fall back to any other configured workspace\./);
  assert.match(instruction, /If the bound workspaceId is absent, inaccessible, or does not contain the exact required artifact path, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH\./);
  assert.doesNotMatch(instruction, /beta/);
});

test("prompt generation routes from selected project root without projectRepository routing state", () => {
  const definition = activeProductionArchitectOutputDefinitions()
    .find((candidate) => candidate.outputKind === "phase-map");
  assert.ok(definition);
  const submission = submissionFor(definition);
  const root = boundPromptWorkspaceRoot("ChampCity_PDL");

  const instruction = definition.buildPreparedInstruction({
    workspaceRoot: root,
    submission,
    sourceHandoff: submission.sourceHandoff,
    domainContext: domainContextFor(definition),
  });

  assert.match(instruction, /Bound workspaceId: champcity_pdl/);
  assert.match(instruction, /Use ChampCity MCP workspaceId "champcity_pdl" only\./);
});

test("Git repository identity does not override selected-root workspaceId", () => {
  const definition = activeProductionArchitectOutputDefinitions()
    .find((candidate) => candidate.outputKind === "phase-map");
  assert.ok(definition);
  const submission = submissionFor(definition);
  const root = gitBackedPromptWorkspaceRootWithoutBinding("ChampCityChris/ChampCity_GPT_MCP");

  const instruction = definition.buildPreparedInstruction({
    workspaceRoot: root,
    submission,
    sourceHandoff: submission.sourceHandoff,
    domainContext: domainContextFor(definition),
  });

  assert.match(instruction, /Bound workspaceId: alpha/);
  assert.doesNotMatch(instruction, /champcity_gpt_mcp/);
});

test("explicit MCP binding does not override selected-root workspaceId", () => {
  const definition = activeProductionArchitectOutputDefinitions()
    .find((candidate) => candidate.outputKind === "phase-map");
  assert.ok(definition);
  const submission = submissionFor(definition);
  const instruction = definition.buildPreparedInstruction({
    workspaceRoot: boundPromptWorkspaceRootForRepository(
      "champcity_gpt",
      "ChampCityChris/ChampCity_GPT_MCP",
    ),
    submission,
    sourceHandoff: submission.sourceHandoff,
    domainContext: domainContextFor(definition),
  });
  const actionBlocks = jsonActionBlocks(instruction);

  assert.match(instruction, /Bound workspaceId: champcity_gpt/);
  assert.match(instruction, /Bound repository: champcity_gpt/);
  assert.match(instruction, /Use ChampCity MCP workspaceId "champcity_gpt" only\./);
  assert.doesNotMatch(instruction, /Bound workspaceId: champcity_gpt_mcp/);
  assert.ok(actionBlocks.length > 0);
  for (const block of actionBlocks) {
    assert.equal(block.workspaceId, "champcity_gpt");
  }
});
