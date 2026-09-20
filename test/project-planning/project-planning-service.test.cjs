const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("infrastructure planning requires operational recovery evidence and excludes unrelated product features", async (t) => {
  const { seedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
  const { root, intake, git, initialHead } = await seedRoutedWorkIntake(t, "infrastructure-platform", {
    workRequest: "Move the staging host to a supported runtime", desiredOutcome: "Recoverable runtime update with unchanged product behavior", knownConstraints: "Sharing features remain a separate Intake",
  });
  const { workPlanningKernel: kernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  let model = await kernel.prepare(root, intake.intakeId, "assessment");
  for (const rule of [/environment ownership/, /install\/provision\/update\/rollback/, /networking\/access/, /observability\/health/, /recovery conditions/, /Keep product features outside this Plan/, /do not force Phases/]) assert.match(model.preparedInstruction, rule);
  const sections = {
    "Evidence": "The synthetic staging host uses runtime v1; target v2 meets the existing application contract.",
    "Decisions": "Update only the staging runtime; retain a recoverable v1 snapshot.",
    "Risks and Unresolved Questions": "Health checks must prove unchanged scheduling after rollout.",
    "Operational Outcome and Platform Delta": "Replace the staging runtime while preserving all product behavior.",
    "Current and Target Operational Topology": "One staging host remains one staging host; only runtime v1 changes to v2.",
    "Environment Ownership and Constraints": "The platform team owns staging and rollback; production is excluded.",
    "Install Provision Update and Rollback": "Preflight v2, snapshot v1, update staging, restore snapshot on failure.",
    "Networking and Access": "Existing private access and recovery controls remain available.",
    "Observability Health and Recovery": "Observe health and schedule writes; restore v1 on failed readiness or data proof.",
    "Compatibility and Preservation": "Scheduling contracts and stored state remain unchanged.",
    "Operational Acceptance and Recovery Conditions": "Accept only with health, scheduling, and state checks passing; prove snapshot restoration before rollout.",
    "Excluded Product Features": "Sharing and new schedule views remain separate Intakes.",
  };
  const body = "# Route Architect Assessment\n\n" + Object.entries(sections).map(([heading, value]) => `## ${heading}\n${value}`).join("\n\n");
  writeDraft(root, model.submission.expectedDraftSlots[0].draftRelativePath, body.replace("## Operational Acceptance and Recovery Conditions", "## Missing Recovery Conditions"));
  model = await kernel.get(root, intake.intakeId, "assessment");
  assert.equal(model.submission.state, "promotion-failed");
  assert.match(model.error, /Operational Acceptance and Recovery Conditions/);
  model = await kernel.prepare(root, intake.intakeId, "assessment");
  writeDraft(root, model.submission.expectedDraftSlots[0].draftRelativePath, body);
  model = await kernel.get(root, intake.intakeId, "assessment");
  await kernel.review(root, intake.intakeId, "assessment", { expectedRevision: model.artifact.artifactRevision, disposition: "Approved", notes: "Operational boundary accepted" });
  model = await kernel.prepare(root, intake.intakeId, "plan");
  assert.match(model.preparedInstruction, /## Rollback and Recovery Proof/);
  assert.match(model.preparedInstruction, /## Operational Acceptance Conditions/);
  assert.match(model.preparedInstruction, /## Compatibility and Excluded Features/);
  assert.match(model.preparedInstruction, /Choose direct topology/);
  assert.match(model.preparedInstruction, /Choose phased only/);
  assert.equal(git("rev-parse", "HEAD"), initialHead);
});

test("composition planning requires capability dispositions and carries non-code outcomes through the shared kernel", async (t) => {
  const { seedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
  const { root, intake, git, initialHead } = await seedRoutedWorkIntake(t, "integration-composition", {
    workRequest: "Compose a bounded document export from existing provider components", desiredOutcome: "Export through verified component contracts",
  });
  const { workPlanningKernel: kernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  const { resolveWorkPlanningProfile } = require("../../dist/main/workPlanning/workPlanningProfiles.js");
  const profile = resolveWorkPlanningProfile("integration-composition");
  let model = await kernel.prepare(root, intake.intakeId, "assessment");
  const instruction = await kernel.copy(root, intake.intakeId, "assessment");
  for (const rule of [/build-versus-integrate disposition for every material capability/, /Characterize existing components first/, /Custom code is justified only by demonstrated gaps/, /authentication\/access/, /lifecycle\/health/, /upgrade\/version risk/, /Do not substitute a Greenfield/]) assert.match(instruction, rule);
  const evidence = {
    "Evidence": "The export component has a characterized CSV contract; the preview component is uncharacterized.",
    "Decisions": "Integrate CSV export; characterize preview before deciding whether to integrate or reject it.",
    "Risks and Unresolved Questions": "Preview access behavior requires characterization before commitment.",
    "Components and Characterization Evidence": "Synthetic export v1 accepts document rows and returns CSV; preview is uncharacterized.",
    "Capability Build-versus-Integrate Dispositions": "CSV export: integrate existing exporter, owner export team, round-trip contract proof. Preview: characterize, owner UI team. Filenames: adapt only the demonstrated incompatible naming format. Legacy preview: reject after failed format proof.",
    "Ownership and External Contracts": "The export team owns the CSV contract; the application owns a bounded filename adapter.",
    "Authentication and Access": "Use the existing secure access strategy; do not copy credentials into artifacts.",
    "Data and Control Flow": "Application rows flow to exporter and CSV returns to the caller; no provider owns application state.",
    "Failure Lifecycle and Health": "Close sessions; report unavailable providers; prove timeout and retry behavior without duplicate exports.",
    "Version and Upgrade Risk": "Pin the characterized major contract and repeat contract proof before upgrade.",
    "Demonstrated Gaps and Adapter Boundaries": "Only filename normalization is a demonstrated gap; no custom CSV generator is authorized.",
  };
  const body = "# Route Architect Assessment\n\n" + Object.entries(evidence).map(([heading, value]) => `## ${heading}\n${value}`).join("\n\n");
  writeDraft(root, model.submission.expectedDraftSlots[0].draftRelativePath, body.replace("## Capability Build-versus-Integrate Dispositions", "## Missing Capability Decisions"));
  model = await kernel.get(root, intake.intakeId, "assessment");
  assert.equal(model.submission.state, "promotion-failed");
  assert.match(model.error, /Capability Build-versus-Integrate Dispositions/);
  model = await kernel.prepare(root, intake.intakeId, "assessment");
  writeDraft(root, model.submission.expectedDraftSlots[0].draftRelativePath, body);
  model = await kernel.get(root, intake.intakeId, "assessment");
  await kernel.review(root, intake.intakeId, "assessment", { expectedRevision: model.artifact.artifactRevision, disposition: "Approved", notes: "Characterized contract and bounded adapter accepted" });
  model = await kernel.prepare(root, intake.intakeId, "plan");
  const outcomes = ["characterize", "configure", "integrate", "adapt", "validate", "replace", "reject"];
  const structure = { topology: "direct", topologyRationale: "Bounded composition fits ordered Work Items", acceptanceCriteria: ["Export follows characterized component contract"],
    workItems: outcomes.map((outcome, index) => ({ workItemId: `WI${index + 1}`, title: `${outcome} component`, purpose: `${outcome} the evidenced contract boundary`, dependsOn: index ? [`WI${index}`] : [], acceptanceCriteria: [`Prove ${outcome} disposition against the characterized contract`] })) };
  const planBody = "# Work Plan\n\n" + profile.planSections.map((heading) => `## ${heading}\n${heading === "Gap-driven Custom Code" ? evidence["Demonstrated Gaps and Adapter Boundaries"] : evidence["Capability Build-versus-Integrate Dispositions"]}`).join("\n\n") + "\n\n```champcity-work-plan\n" + JSON.stringify(structure) + "\n```\n";
  writeDraft(root, model.submission.expectedDraftSlots[0].draftRelativePath, planBody);
  model = await kernel.get(root, intake.intakeId, "plan");
  assert.equal(model.artifact.identity.routeId, "integration-composition");
  assert.deepEqual(model.artifact.structure.workItems.map((item) => item.title.split(" ")[0]), outcomes);
  assert.match(model.artifact.bodyMarkdown, /no custom CSV generator is authorized/);
  assert.equal(git("rev-parse", "HEAD"), initialHead);
});

test("shared planning kernel reviews direct and phased Plans under the Operator-selected profile with freshness-safe revision", async (t) => {
  const { seedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
  const { root, intake, route, git, initialHead } = await seedRoutedWorkIntake(t, "refactor-migration", {
    workRequest: "Move schedule storage from an embedded adapter to a service adapter", desiredOutcome: "A narrow storage cutover with scheduling behavior preserved",
    knownConstraints: "Later sharing features and governance refactors remain separate Intakes",
  });
  const { createWorkPlanningKernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  const { resolveWorkPlanningProfile, workPlanningProfiles } = require("../../dist/main/workPlanning/workPlanningProfiles.js");
  const { validateWorkPlanStructure } = require("../../dist/main/workPlanning/workPlanStructure.js");
  const { mainPreloadHarness } = require("../support/production-execution.cjs");
  const refactor = resolveWorkPlanningProfile("refactor-migration");
  const profile = { ...refactor, requiredEvidence: [...refactor.requiredEvidence, "Fixture current baseline"], discoveryQuestions: [...refactor.discoveryQuestions, "Fixture preservation question"] };
  const kernel = createWorkPlanningKernel(workPlanningProfiles.map((entry) => entry.routeId === profile.routeId ? profile : entry));
  let copied = "";
  const { api } = mainPreloadHarness(["workPlanning:status", "workPlanning:prepare", "workPlanning:copy", "workPlanning:review"], {
    workPlanningKernel: kernel, getRequiredWorkspaceRoot: () => root, clipboard: { writeText: (value) => { copied = value; } },
  });
  await assert.rejects(api.getWorkPlanning(intake.intakeId, "plan"), /approved route-specific assessment/);
  let assessment = await api.prepareWorkPlanning(intake.intakeId, "assessment");
  assert.equal(assessment.routeId, "refactor-migration", "Operator override, not primary AI advice, resolves the profile");
  await api.copyWorkPlanning(intake.intakeId, "assessment");
  assert.match(copied, /Fixture current baseline/); assert.match(copied, /Fixture preservation question/);
  assert.match(copied, /route identity does not select topology/);
  for (const rule of [/current architecture/, /target architecture/, /ownership boundaries that move/, /migration seams/, /data\/state\/code transition/, /rollback\/recovery/, /cutover criteria/, /retirement conditions/, /reduces dual-architecture duration/, /separate Work Intakes/, /Do not substitute a generic Greenfield or MVP roadmap/]) assert.match(copied, rule);
  const transformationAssessment = "# Route Architect Assessment\n\n## Evidence\nThe Intake limits this work to the schedule storage adapter.\n\n## Decisions\nMove storage ownership while preserving scheduling.\n\n## Risks and Unresolved Questions\nRecover safely if the new adapter fails.\n\n## Current Architecture and Baseline\nAn embedded adapter owns schedule persistence.\n\n## Target Architecture\nA service adapter owns persistence behind the same scheduling contract.\n\n## Architectural Delta and Behavior Classification\nPreserve scheduling behavior; replace storage ownership; add only the required service boundary.\n\n## Ownership Movement\nPersistence moves from embedded runtime to the service.\n\n## Migration Seams and Transition Slices\nExercise one real schedule through the service before moving remaining consumers.\n\n## Temporary Compatibility\nRetain the old adapter only until cutover proof passes.\n\n## Data State and Code Transition\nTransfer schedule state with verified counts and values.\n\n## Rollback and Recovery\nRestore the prior adapter and verified state snapshot.\n\n## Cutover Criteria\nAll schedule operations pass against the service with preserved data.\n\n## Retirement Conditions\nRemove the old adapter after cutover validation and recovery proof.\n\n## Separate Future Intakes\nSharing features and governance refactors remain excluded.\n";
  writeDraft(root, assessment.submission.expectedDraftSlots[0].draftRelativePath, transformationAssessment.replace("## Target Architecture", "## Missing Target"));
  const invalidAssessment = await api.getWorkPlanning(intake.intakeId, "assessment");
  assert.equal(invalidAssessment.submission.state, "promotion-failed");
  assert.match(invalidAssessment.error, /Target Architecture/);
  assessment = await api.prepareWorkPlanning(intake.intakeId, "assessment");
  writeDraft(root, assessment.submission.expectedDraftSlots[0].draftRelativePath, transformationAssessment);
  await api.copyWorkPlanning(intake.intakeId, "assessment");
  assert.equal(fs.existsSync(path.join(root, assessment.submission.expectedDraftSlots[0].draftRelativePath)), true, "copy does not promote");
  assessment = await api.getWorkPlanning(intake.intakeId, "assessment");
  assert.equal(assessment.artifact.disposition, "Pending");
  assert.equal(assessment.artifact.identity.routeDecisionId, route.selection.decisionId);
  await assert.rejects(api.prepareWorkPlanning(intake.intakeId, "assessment"), /Request revision/);
  await assert.rejects(api.reviewWorkPlanning(intake.intakeId, "assessment", { expectedRevision: 99, disposition: "Approved", notes: "" }), /stale/);
  assessment = await api.reviewWorkPlanning(intake.intakeId, "assessment", { expectedRevision: 1, disposition: "Approved", notes: "Evidence accepted" });
  assert.equal(assessment.artifact.disposition, "Approved");

  const item = { workItemId: "WI01", title: "Preserve and transform", purpose: "One bounded outcome", dependsOn: [], acceptanceCriteria: ["Preserved behavior verified"] };
  const direct = { topology: "direct", topologyRationale: "One bounded slice needs no Phase layer.", acceptanceCriteria: ["Complete the scoped change"], workItems: [item] };
  const planBody = (structure) => "# Work Plan\n\n## Scope\nThe narrow storage cutover.\n\n## Preserved Behavior\nScheduling operations.\n\n## Acceptance\nPreserved data and schedule behavior.\n\n## Execution Structure\n```champcity-work-plan\n" + JSON.stringify(structure) + "\n```\n## Current and Target Architecture\nMove embedded storage behind a service adapter.\n## Transformation Delta and Preservation\nPreserve scheduling; replace storage ownership.\n## Ownership and Migration Seams\nMove persistence ownership through the existing adapter boundary.\n## Transition Slice Sequencing\nProve a real schedule first, then cut over remaining consumers.\n## Compatibility and State Transition\nVerify transferred state and retire temporary dual access.\n## Rollback and Recovery Plan\nRestore the prior adapter and verified snapshot.\n## Cutover Proof\nProve all schedule operations and retained state.\n## Retirement Plan\nRemove the embedded path only after accepted cutover and recovery proof.\n## Excluded Governance and Feature Work\nSharing and governance changes are separate Intakes.\n";
  let plan = await api.prepareWorkPlanning(intake.intakeId, "plan");
  assert.match(plan.preparedInstruction, /## Cutover Proof/);
  assert.match(plan.preparedInstruction, /## Retirement Plan/);
  assert.match(plan.preparedInstruction, /## Compatibility and State Transition/);
  writeDraft(root, plan.submission.expectedDraftSlots[0].draftRelativePath, planBody(direct));
  plan = await api.getWorkPlanning(intake.intakeId, "plan");
  assert.equal(plan.artifact.structure.topology, "direct"); assert.equal(plan.artifact.structure.phases, undefined);
  assert.equal(plan.artifact.disposition, "Pending", "AI topology recommendation is not approval");
  plan = await api.reviewWorkPlanning(intake.intakeId, "plan", { expectedRevision: 1, disposition: "Approved", notes: "Direct topology approved" });
  const planId = plan.artifact.identity.planId;
  assert.equal(plan.artifact.disposition, "Approved");
  plan = await api.reviewWorkPlanning(intake.intakeId, "plan", { expectedRevision: 1, disposition: "RevisionRequested", notes: "Separate foundation and cutover." });
  plan = await api.prepareWorkPlanning(intake.intakeId, "plan");
  assert.match(plan.preparedInstruction, /Separate foundation and cutover/);
  const phased = { ...direct, topology: "phased", topologyRationale: "Two meaningful ordered boundaries.",
    phases: [{ phaseId: "P1", title: "Foundation", purpose: "Prepare", dependsOn: [], acceptanceCriteria: ["Ready"] },
      { phaseId: "P2", title: "Cutover", purpose: "Transition", dependsOn: ["P1"], acceptanceCriteria: ["Transition verified"] }],
    workItems: [{ ...item, phaseId: "P1" }, { ...item, workItemId: "WI02", phaseId: "P2", dependsOn: ["WI01"] }] };
  assert.throws(() => validateWorkPlanStructure({ ...direct, topology: "hybrid" }), /direct or phased/);
  assert.throws(() => validateWorkPlanStructure({ ...direct, phases: [] }), /no Phase layer/);
  assert.throws(() => validateWorkPlanStructure({ ...phased, workItems: [{ ...item, phaseId: "missing" }] }), /declared nonempty/);
  assert.throws(() => validateWorkPlanStructure({ ...direct, workItems: [{ ...item, dependsOn: ["unknown"] }] }), /unknown/);
  assert.throws(() => validateWorkPlanStructure({ ...phased, workItems: [{ ...phased.workItems[0], dependsOn: ["WI02"] }, phased.workItems[1]] }), /cycle/);
  writeDraft(root, plan.submission.expectedDraftSlots[0].draftRelativePath, planBody(phased));
  plan = await api.getWorkPlanning(intake.intakeId, "plan");
  assert.equal(plan.artifact.artifactRevision, 2); assert.equal(plan.artifact.identity.planId, planId);
  assert.equal(plan.artifact.structure.phases.length, 2); assert.equal(plan.artifact.disposition, "Pending");
  await assert.rejects(api.reviewWorkPlanning(intake.intakeId, "plan", { expectedRevision: 1, disposition: "Approved", notes: "Old review" }), /stale/);
  plan = await api.reviewWorkPlanning(intake.intakeId, "plan", { expectedRevision: 2, disposition: "Approved", notes: "Phased topology approved" });
  assert.equal(plan.artifact.disposition, "Approved");
  assert.equal(git("rev-parse", "HEAD"), initialHead, "kernel performs no Git mutation");
  assert.equal(fs.existsSync(path.join(root, "planning/phases")), false, "kernel does not run or migrate legacy execution");

  // Review metadata on a source changes the prepared/source fingerprint even without a substantive revision.
  await api.reviewWorkPlanning(intake.intakeId, "assessment", { expectedRevision: 1, disposition: "Approved", notes: "Changed source review evidence" });
  assert.equal((await api.getWorkPlanning(intake.intakeId, "plan")).artifact.stale, true);
  await assert.rejects(api.reviewWorkPlanning(intake.intakeId, "plan", { expectedRevision: 2, disposition: "Approved", notes: "" }), /stale/);
  assert.throws(() => resolveWorkPlanningProfile("unknown"), /Unknown/);
});

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
  const { repositoryBinding, ...handoffWorkflowData } = handoff.metadata.workflowData;
  assert.equal(repositoryBinding.mcpWorkspaceBinding.mcpWorkspaceId, "alpha");
  assert.equal(repositoryBinding.projectRepository, path.resolve(root));
  assert.deepEqual(handoffWorkflowData, {
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
  assert.match(handoff.bodyMarkdown, /Do not assume greenfield means the development machine is ready/);
  assert.match(handoff.bodyMarkdown, /selected project repository plus the local development machine/);
  assert.match(handoff.bodyMarkdown, /Missing development capabilities required by planned implementation must be sequenced as project work/);
  assert.match(handoff.bodyMarkdown, /architecture or migration requirements and product or Operator capability requirements as simultaneous axes/);
  assert.match(handoff.bodyMarkdown, /Silent omission is prohibited/);
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

  const prepared = prepareProjectPlanningHandoff(root);
  assert.match(prepared.handoffInstruction, /Repository review context: Inspect the existing TypeScript entry point\./);
  assert.match(prepared.handoffInstruction, /use it to identify and inspect the materially relevant evidence before drafting/);
  assert.doesNotMatch(prepared.handoffInstruction, /Source evidence paths:/i);
  assert.doesNotMatch(prepared.handoffInstruction, /src\/index\.ts/);
  assert.match(prepared.handoffInstruction, /verified current implementation, established planning or architecture intent, historical or legacy evidence, and unresolved assumptions/);
  assert.match(prepared.handoffInstruction, /controlling constraint on both the Project Profile and Project Roadmap unless the Operator explicitly revises it/);
  assert.match(prepared.handoffInstruction, /Do not invent a second architecture or reinterpret established architecture into incompatible subsystem ownership/);
  const handoff = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, prepared.handoffMarkdownPath), "utf8"),
  );
  assert.deepEqual(handoff.metadata.workflowData.sourceEvidencePaths, ["src/index.ts"]);
  assert.match(handoff.bodyMarkdown, /Source evidence paths:\n- src\/index\.ts/);
});

test("project planning intake and source mismatch resolves reconciliation-required without blocking handoff", () => {
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
  assert.equal(model.state, "ready-for-handoff");
  assert.equal(model.railStatus, "Ready");
  assert.equal(model.canPrepareHandoff, true);
  assert.equal(model.reconciliationMode, "reconciliation-required");
  assert.equal(model.repositoryReviewRequired, true);
  assert.deepEqual(model.sourceEvidencePaths, ["src/index.ts"]);
  assert.equal(model.evidencePaths.includes("src/index.ts"), false);

  const result = generateProjectPlanningHandoff(root);
  assert.equal(fs.existsSync(path.join(root, result.handoffMarkdownPath)), true);
});

test("project planning malformed planning evidence blocks with planning-only evidence", () => {
  const root = tempWorkspace("champcity-project-planning-malformed-planning-");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "index.ts"), "export const existing = true;\n");
  fs.writeFileSync(path.join(root, "package.json"), "{\"scripts\":{\"build\":\"tsc\"}}\n", "utf8");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  const malformedPath = "planning/project/Design_Documents/MALFORMED_CONTEXT.md";
  fs.mkdirSync(path.dirname(path.join(root, malformedPath)), { recursive: true });
  fs.writeFileSync(
    path.join(root, malformedPath),
    "<!-- CHAMPCITY-METADATA\n{ broken\nCHAMPCITY-METADATA -->\n\n# Broken\n",
    "utf8",
  );

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.state, "needs-attention");
  assert.equal(model.railStatus, "Needs Attention");
  assert.equal(model.canPrepareHandoff, false);
  assert.match(model.reason, /Malformed canonical planning evidence/);
  assert.match(model.reason, new RegExp(malformedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(model.evidencePaths.includes(malformedPath));
  assert.equal(model.evidencePaths.every((evidencePath) => evidencePath.startsWith("planning/")), true);
  assert.equal(model.evidencePaths.includes("src/index.ts"), false);
  assert.equal(model.evidencePaths.includes("package.json"), false);
  assert.deepEqual(model.sourceEvidencePaths, undefined);
  assert.throws(() => generateProjectPlanningHandoff(root), /Malformed canonical planning evidence/);
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
  assert.match(getProjectPlanningHandoffInstruction(root), /artifact_toolbox\.write_markdown_artifact/);
  assert.doesNotMatch(getProjectPlanningHandoffInstruction(root), /create_markdown_artifact/);
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
  assert.equal(readyAgain.canPrepareHandoff, true);
  assert.equal(readyAgain.canCopyHandoff, false);
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
  assert.equal(model.canPrepareHandoff, true);
  assert.equal(model.canCopyHandoff, false);
  assert.equal(model.handoffState, "handoff-unavailable");
  assert.equal(model.projectProfileTarget, "planning/project/PROJECT_PROFILE.md");
  assert.equal(model.projectRoadmapTarget, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md");
});

test("project planning prepares the first handoff and exposes a copyable draft instruction", () => {
  const root = tempWorkspace("champcity-project-planning-first-handoff-");
  const seeded = seedReadyProjectPlanning(root);
  writeDoc(root, seeded.intake, "project-intake", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    workflowData: {
      projectRepository: "ChampCity_PDL",
      repositoryBinding: {
        projectRepository: "ChampCity_PDL",
      },
    },
  });

  const firstModel = getProjectPlanningWorkspaceModel(root);
  assert.equal(firstModel.state, "ready-for-handoff");
  assert.equal(firstModel.canPrepareHandoff, true);
  assert.equal(firstModel.canCopyHandoff, false);
  assert.equal(fs.existsSync(path.join(root, firstModel.handoffMarkdownPath)), false);

  const prepared = prepareProjectPlanningHandoff(root);
  const handoffPath = prepared.handoffMarkdownPath;
  assert.equal(handoffPath, "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md");
  assert.equal(fs.existsSync(path.join(root, handoffPath)), true);
  assert.equal(prepared.state, "waiting-for-output");
  assert.equal(prepared.canPrepareHandoff, true);
  assert.equal(prepared.canCopyHandoff, true);
  assert.equal(prepared.draftSubmissionState, "waiting-for-drafts");
  assert.match(prepared.handoffInstruction, /Bound workspaceId: alpha/);
  assert.doesNotMatch(prepared.handoffInstruction, /Bound workspaceId: champcity_pdl/);
  assert.match(prepared.handoffInstruction, /Temporary Project Profile draft path: planning\/Architect_Drafts\//);
  assert.match(prepared.handoffInstruction, /Temporary Project Roadmap draft path: planning\/Architect_Drafts\//);
  assert.doesNotMatch(prepared.handoffInstruction, /<resolved workspace ID>|workspace inference|workspace search|<PROJECT_REPO>/i);

  const handoff = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, handoffPath), "utf8"));
  assert.equal(handoff.metadata.artifactType, "generated-handoff");
  assert.equal(handoff.metadata.participationRole, "nonReviewHandoff");
  assert.equal(handoff.metadata.documentDisposition.status, "Approved");
  assert.equal(handoff.metadata.workflowData.handoffKind, "project-planning");
  assert.equal(handoff.metadata.workflowData.contractId, "project-planning-output-submission-v2");
  assert.equal(handoff.metadata.workflowData.repositoryBinding.projectRepository, "ChampCity_PDL");
  assert.deepEqual(handoff.metadata.sourceRevisions, [
    { path: seeded.intake, revision: 1 },
    { path: seeded.prompt, revision: 1 },
    { path: seeded.interview, revision: 1 },
  ]);
});

test("project planning handoff instruction includes exact targets and MCP constraints", () => {
  const root = tempWorkspace("champcity-project-planning-copy-");
  const seeded = seedReadyProjectPlanning(root);
  const prepared = prepareProjectPlanningHandoff(root);

  const instruction = getProjectPlanningHandoffInstruction(root);
  assert.match(instruction, /Bound workspaceId: alpha/);
  assert.match(instruction, /Use ChampCity MCP workspaceId "alpha" only\./);
  assert.doesNotMatch(instruction, /<PROJECT_REPO>/);
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
  assert.match(instruction, /Do not assume an MVP\. Use MVP framing only when the approved project evidence explicitly establishes/);
  assert.match(instruction, /existing system, treat current implemented behavior as the functional baseline unless the approved project evidence explicitly deprecates or changes it/);
  assert.match(instruction, /existing-product refactor, migration, platform-transition, feature-expansion, or capability-extraction work/);
  assert.match(instruction, /behavior preservation, compatibility boundaries, dependencies, and cutover criteria/);
  assert.match(instruction, /approved Architect Interview is the primary semantic synthesis/);
  assert.match(instruction, /prior Interview Prompt is provenance and contract evidence.*only when needed to resolve a contradiction or ambiguity/);
  assert.match(instruction, /two simultaneous axes: architecture or migration requirements, and product or Operator capability requirements/);
  assert.match(instruction, /Neither axis may silently erase the other/);
  assert.match(instruction, /For every material product capability or workflow.*must do exactly one of the following/);
  assert.match(instruction, /sequence it into a specific roadmap phase or outcome; explicitly defer it with rationale; explicitly supersede it with the governing replacement decision; or mark it conditional and state the condition/);
  assert.match(instruction, /Silent omission is prohibited/);
  assert.match(instruction, /Creating a MemoryService, RepositoryService, runtime adapter, or equivalent internal boundary does not by itself prove delivery/);
  assert.match(instruction, /both the architecture or migration boundary established or changed and the meaningful product or Operator capability/);
  assert.match(instruction, /real consuming vertical slice as early as architecture dependencies safely permit/);
  assert.match(instruction, /Do not build every hypothetical portability abstraction first/);
  assert.doesNotMatch(instruction, /Source evidence paths:/i);
  assert.match(instruction, /legacy V1 structural labels and do not establish MVP semantics/);
  assert.match(instruction, /use MVP Scope for the primary bounded delivery, migration, or refactor scope/);
  assert.match(instruction, /use Post-MVP Roadmap for subsequent lifecycle work after that primary scope/);
  assert.doesNotMatch(instruction, /MVP phases must remain clearly identified/);
  assert.doesNotMatch(instruction, /Post-MVP phases or roadmap stages must be separately sequenced/);
  assert.doesNotMatch(instruction, /not only the MVP boundary/);
  assert.match(instruction, /local development machine/);
  assert.match(instruction, /verified installed development capabilities/);
  assert.match(instruction, /verified missing development capabilities/);
  assert.match(instruction, /unverified development capabilities/);
  assert.match(instruction, /greenfield repository.*separately classify local development machine readiness/);
  assert.match(instruction, /Missing development capabilities required by planned implementation must be sequenced as project work before dependent work/);
  assert.match(instruction, /shortest dependency-complete path to the next coherent usable or productive milestone/);
  assert.match(instruction, /Organize phases around independently meaningful outcomes, not around architectural components/);
  assert.match(instruction, /at or immediately before the first outcome that consumes it/);
  assert.match(instruction, /Avoid standalone horizontal foundation phases/);
  assert.match(instruction, /Create a separate foundation phase only when the prerequisite is independently substantial/);
  assert.match(instruction, /Avoid speculative prework for future capabilities that are not required by the current milestone/);
  assert.match(instruction, /Preserve explicit architecture-defined dependency or extraction order/);
  assert.match(instruction, /Use Phase Planning and Work Card dependencies for fine-grained sequencing/);
  assert.match(instruction, /"action": "write_markdown_artifact"/);
  assert.doesNotMatch(instruction, /create_markdown_artifact/);
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
  assert.match(instruction, /Use ChampCity MCP workspaceId "alpha" only/);
  assert.match(instruction, /Do not write placeholders/);
  assert.match(instruction, /workflow remains incomplete until both temporary drafts are created and ChampCity A\/I promotes the bundle/);
  assert.doesNotMatch(instruction, /save_project_planning_outputs/);

  const invocations = invocationBlocks(instruction);
  assert.equal(invocations.length, 2);
  assert.deepEqual(invocations, [
    {
      action: "write_markdown_artifact",
      workspaceId: "alpha",
      params: {
        relativePath: `planning/Architect_Drafts/${expectedSubmissionId(prepared.handoffMarkdownPath)}/project-profile.md`,
        content: "<complete body-only Project Profile Markdown>",
        overwrite: false,
      },
    },
    {
      action: "write_markdown_artifact",
      workspaceId: "alpha",
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
    bodyMarkdown: profileBody("Out-of-scope partial existing profile."),
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

test("project planning invalid existing handoff blocks first-handoff preparation and copy", () => {
  const root = tempWorkspace("champcity-project-planning-invalid-handoff-");
  seedReadyProjectPlanning(root);
  writeDoc(root, "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md", "generated-handoff", "Approved", {
    participationRole: "gatingReview",
    workflowData: {
      handoffKind: "project-planning",
    },
  });

  const model = getProjectPlanningWorkspaceModel(root);
  assert.equal(model.state, "needs-attention");
  assert.equal(model.canPrepareHandoff, false);
  assert.equal(model.canCopyHandoff, false);
  assert.match(model.reason, /non-review handoff/);
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
  assert.equal(model.state, "revision-requested");
  assert.equal(model.canPrepareHandoff, true);
  assert.equal(model.canCopyHandoff, false);
  assert.match(model.requiredAction, /Prepare Revision Request/);
  const revisionPrepared = prepareProjectPlanningHandoff(root);
  assert.equal(revisionPrepared.canCopyHandoff, true);
  assert.equal(revisionPrepared.handoffPreparationMessage, "Revision Request Ready.");
  assert.match(revisionPrepared.requiredAction, /Revision Request Ready/);
  assert.match(revisionPrepared.handoffInstruction, /Do not assume an MVP\. Use MVP framing only when the approved project evidence explicitly establishes/);
  assert.match(revisionPrepared.handoffInstruction, /existing-product refactor, migration, platform-transition/);
  assert.match(revisionPrepared.handoffInstruction, /## MVP Scope/);
  assert.match(revisionPrepared.handoffInstruction, /## Post-MVP Roadmap/);
  assert.doesNotMatch(revisionPrepared.handoffInstruction, /MVP phases must remain clearly identified/);
  assert.match(revisionPrepared.handoffInstruction, /Current Operator revision instructions:\nTighten the roadmap milestones\./);
});
