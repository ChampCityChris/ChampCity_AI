const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  generatePhaseMapHandoff,
  getPhaseMapDraftSubmissionStatus,
  getPhaseMapHandoffInstruction,
  getPhaseMapProjection,
  selectNextPhaseByDependencies,
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
    .find((candidate) => candidate.includes('"action": "write_markdown_artifact"'));
  assert.ok(block, "expected a write_markdown_artifact invocation block");
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
  assert.match(instruction, /"action": "write_markdown_artifact"/);
  assert.match(instruction, /"overwrite": false/);
  assert.match(instruction, /Temporary draft Markdown: planning\/Architect_Drafts\//);
  assert.doesNotMatch(instruction, /diagnostics_toolbox\.list_workspaces/);
  assert.doesNotMatch(instruction, /submit_handoff_outputs/);
  assert.doesNotMatch(instruction, /"handoffKind": "phase-map"/);
  assert.doesNotMatch(instruction, /"phaseMapMarkdown"/);
  assert.match(instruction, /"phases"/);
  assert.match(instruction, /Derive the substantive phase list from the approved full Project Roadmap and Project Profile/);
  assert.match(instruction, /Preserve the approved Project Roadmap's outcome grouping when defining phase boundaries/);
  assert.match(instruction, /Do not re-expand one Roadmap outcome into separate subsystem, tooling, or foundation phases unless the approved Roadmap requires those as independent milestones/);
  assert.match(instruction, /Keep fine-grained prerequisite sequencing inside Phase Planning and Work Card dependencies/);
  assert.doesNotMatch(instruction, /top-level JSON value is an array/);
  assert.doesNotMatch(instruction, /save_project_planning_outputs|save_architect_interview_output|create_markdown_artifact/);
  const invocation = invocationFrom(instruction);
  assert.equal(invocation.action, "write_markdown_artifact");
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

test("phase map handoff contains contract source without fabricated default phases", () => {
  const root = tempWorkspace("champcity-phase-map-contract-");
  seedApprovedProjectPlanning(root);

  const result = generatePhaseMapHandoff(root);
  const parsed = require("../../dist/shared/documents/canonicalMarkdown.js").parseCanonicalMarkdownDocument(
    require("node:fs").readFileSync(require("node:path").join(root, result.handoffMarkdownPath), "utf8"),
  );

  assert.equal(parsed.metadata.workflowData.handoffKind, "phase-map");
  assert.equal(parsed.metadata.workflowData.contractId, "phase-map-output-submission-v1");
  const { repositoryBinding, ...workflowData } = parsed.metadata.workflowData;
  assert.equal(repositoryBinding.mcpWorkspaceBinding.mcpWorkspaceId, "alpha");
  assert.equal(repositoryBinding.projectRepository, require("node:path").resolve(root));
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
  assert.doesNotMatch(parsed.bodyMarkdown, /phase-01|Initial project building phase|repair|manual fallback/i);
  assert.match(parsed.bodyMarkdown, /Phase boundaries must preserve the approved Project Roadmap's outcome grouping/);
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

test("phase map projection skips a lower-order blocked phase and selects the lowest-order dependency-eligible phase", () => {
  const root = tempWorkspace("champcity-phase-map-dependency-eligible-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  seedApprovedProjectPlanning(root);
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Approved", {
    workflowData: {
      phases: [
        {
          phaseId: "phase-outcome",
          title: "Outcome",
          order: 1,
          purpose: "Deliver the outcome after its prerequisite.",
          dependsOn: ["phase-enabler"],
          sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
        },
        {
          phaseId: "phase-enabler",
          title: "Required Enabler",
          order: 2,
          purpose: "Complete the declared prerequisite.",
          dependsOn: [],
          sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
        },
      ],
    },
  });

  const projection = getPhaseMapProjection(root);
  assert.equal(projection.state, "first-incomplete");
  assert.equal(projection.phase.phaseId, "phase-enabler");
  assert.deepEqual(projection.completedPhaseIds, []);
  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "phase-interview");
  assert.equal(getCurrentWorkspaceModel(root).currentPhaseId, "phase-enabler");
});

test("phase dependency selector reports explicit evidence when no incomplete phase is eligible", () => {
  const phases = [
    {
      phaseId: "phase-a",
      title: "Phase A",
      order: 1,
      purpose: "Wait for B.",
      dependsOn: ["phase-b"],
      sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
    },
    {
      phaseId: "phase-b",
      title: "Phase B",
      order: 2,
      purpose: "Wait for A.",
      dependsOn: ["phase-a"],
      sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
    },
  ];

  const selection = selectNextPhaseByDependencies(phases, []);
  assert.equal(selection.state, "dependency-blocked");
  assert.deepEqual(selection.incompletePhaseIds, ["phase-a", "phase-b"]);
  assert.deepEqual(selection.blockedPhases, [
    { phaseId: "phase-a", waitingOnPhaseIds: ["phase-b"] },
    { phaseId: "phase-b", waitingOnPhaseIds: ["phase-a"] },
  ]);
  assert.match(selection.reason, /none has all declared dependencies complete/);
  assert.match(selection.reason, /phase-a waits on phase-b/);
  assert.match(selection.reason, /phase-b waits on phase-a/);
});

test("phase map projection continues rejecting dependency cycles before phase selection", () => {
  const root = tempWorkspace("champcity-phase-map-cycle-rejected-");
  seedApprovedProjectPlanning(root);
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Approved", {
    workflowData: {
      phases: [
        {
          phaseId: "phase-a",
          title: "Phase A",
          order: 1,
          purpose: "Invalid cyclic phase.",
          dependsOn: ["phase-b"],
          sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
        },
        {
          phaseId: "phase-b",
          title: "Phase B",
          order: 2,
          purpose: "Invalid cyclic phase.",
          dependsOn: ["phase-a"],
          sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
        },
      ],
    },
  });

  const projection = getPhaseMapProjection(root);
  assert.equal(projection.state, "malformed");
  assert.match(projection.reason, /dependency cycles are prohibited/);
});

async function structuredMapFixture(context) {
  const os = require('node:os');
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'champcity-sql-phase-map-'));
  const registration = await require('../../dist/main/projectState/currentProjectRegistrationService.js').registerCurrentProject(root,'existing',{projectName:'Map fixture'});
  const store = require('../../dist/main/projectState/sqliteProjectStateStore.js').createSQLiteProjectStateStore(path.join(root,'.champcity','project-state.sqlite'));
  context.after(()=>{store.close();fs.rmSync(root,{recursive:true,force:true});});
  const state = require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(store,{principalId:'operator',principalType:'human',role:'Operator'}), projectId=registration.project.id;
  const workflow = (await state.createProjectCreationWorkflow(projectId,{title:'Map Greenfield'})).workflow;
  const {WORKFLOW_INTAKE_DEFINITIONS}=require('../../dist/shared/workflowIntakeContracts.js');
  const values=Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS['project-creation'].fields.filter(field=>field.required).map(field=>[field.key,field.key==='hasExistingSourceOrPlanning'?false:field.key==='projectRepository'?root:field.key==='projectName'?'map_fixture':field.key+' scope']));
  const intake=await state.saveWorkflowIntake(projectId,{workflowId:workflow.id,workflowType:'project-creation',values});
  await state.recordWorkflowIntakeDecision(projectId,intake.id,{expectedIntakeRecordVersion:1,outcome:'approved'});
  const {GREENFIELD_ARCHITECT_SECTIONS}=require('../../dist/shared/architectWorkspaceContracts.js');
  const interview=await state.saveArchitectCandidate(projectId,{workflowId:workflow.id,workflowType:'project-creation',intakeId:intake.id,intakeVersion:1,output:Object.fromEntries(Object.keys(GREENFIELD_ARCHITECT_SECTIONS).map(key=>[key,[key+' direction']]))});
  await state.recordArchitectReview(projectId,interview.id,{expectedRecordVersion:1,outcome:'approved'});
  const planning=require('../../dist/main/projectPlanning/structuredProjectPlanningService.js').createStructuredProjectPlanningService(), model=await planning.get(root,workflow.id);
  const candidate=await planning.save(root,workflow.id,{workflowId:workflow.id,facts:[{title:'Verified product',statement:'Observed bounded purpose',impact:'Constrains map'}],direction:{title:'Direction',objective:'Deliver result',scopeIn:['Outcome'],scopeOut:[],constraints:[],assumptions:[],risks:[]},criteria:[{statement:'Verify outcome',criticality:'required',verificationIntent:'Review result',validationPolicy:'operator_decision'}],sources:model.sources});
  await planning.review(root,workflow.id,candidate.review.cycleId,{expectedRecordVersion:1,outcome:'approved'});
  return {root,store,state,projectId,workflow,service:require('../../dist/main/phaseMap/structuredPhaseMapService.js').createStructuredPhaseMapService()};
}
const typedMapPhases=[{phaseId:'phase_one',title:'First outcome',order:1,purpose:'Deliver first independently useful outcome',dependsOn:[],sourceReferences:['planning/project/PROJECT_PROFILE.md']},{phaseId:'phase_two',title:'Second outcome',order:2,purpose:'Consume first accepted outcome',dependsOn:['phase_one'],sourceReferences:['planning/project/PROJECT_PROFILE.md']}];
test('SQL Greenfield Phase Map imports exact typed legacy metadata once, preserves dependencies and rebuilds projection',async context=>{
  const f=await structuredMapFixture(context), relative='planning/project/Phase_Map/PHASE_MAP_map_fixture.md';
  require('../../dist/main/documents/canonicalMarkdownDocumentWriter.js').writeCanonicalMarkdownDocument({workspaceRoot:f.root,relativePath:relative,metadata:{schemaVersion:1,artifactType:'phase-map',artifactRevision:1,participationRole:'gatingReview',identity:{projectSlug:'map_fixture'},sourceRevisions:[],workflowData:{phases:typedMapPhases},documentDisposition:{status:'Approved',notes:'Reviewed',reviewedAt:new Date().toISOString()}},bodyMarkdown:'# Phase Map\n\n```champcity-phase-map\n'+JSON.stringify({phases:typedMapPhases})+'\n```'});
  const bytes=fs.readFileSync(path.join(f.root,relative),'utf8'), imported=await f.service.get(f.root,f.workflow.id);
  assert.equal(imported.review.disposition.state,'approved'); assert.equal(imported.plan.phases.length,2); assert.equal(imported.plan.dependencyIds.length,1);
  assert.equal(fs.readFileSync(path.join(f.root,relative),'utf8'),bytes);
  await assert.rejects(f.state.reviseRecord(f.projectId,imported.plan.phases[0].phaseId,{objective:'Unreviewed change'},1),/typed revision boundary/);
  const second=await f.service.get(f.root,f.workflow.id); assert.equal(second.review.cycle.id,imported.review.cycle.id); assert.equal((await f.store.listEntities(f.projectId,'Phase')).length,2);
  const repeated=await f.service.save(f.root,f.workflow.id,{workflowId:f.workflow.id,phases:typedMapPhases,sources:imported.sources}); assert.equal(repeated.review.cycle.id,imported.review.cycle.id);
  fs.writeFileSync(path.join(f.root,relative),'Manual completion and scope edits'); assert.equal((await f.service.get(f.root,f.workflow.id)).review.markdown,imported.review.markdown);
  fs.unlinkSync(path.join(f.root,relative)); assert.equal((await f.service.get(f.root,f.workflow.id)).review.markdown,imported.review.markdown);
  assert.equal(getPhaseMapProjection(f.root).phase.phaseId,'phase_one');
  const phase=imported.plan.phases[0].record;
  await f.store.transaction(f.projectId,unit => unit.saveEntity({...phase,recordVersion:phase.recordVersion+1,updatedAt:new Date().toISOString(),body:{...phase.body,phaseState:'closed'}},phase.recordVersion));
  assert.equal(getPhaseMapProjection(f.root).phase.phaseId,'phase_two'); assert.equal((await f.service.get(f.root,f.workflow.id)).review.markdown,imported.review.markdown);
  assert.throws(()=>setPhaseMapDisposition(f.root,'Rejected'),/exact SQL/);
});
test('Fresh SQL Greenfield Phase Map reviews exact revisions, preserves supplied criteria and rejects invalid dependencies',async context=>{
  const f=await structuredMapFixture(context), model=await f.service.get(f.root,f.workflow.id), phases=typedMapPhases.map((phase,index)=>({...phase,criteria:index?[]:[{statement:'Explicit Phase obligation',criticality:'required',verificationIntent:'Review first outcome',validationPolicy:'operator_decision'}]}));
  const stalePath='planning/project/Phase_Map/PHASE_MAP_map_fixture.md';
  require('../../dist/main/documents/canonicalMarkdownDocumentWriter.js').writeCanonicalMarkdownDocument({workspaceRoot:f.root,relativePath:stalePath,metadata:{schemaVersion:1,artifactType:'phase-map',artifactRevision:1,participationRole:'gatingReview',identity:{projectSlug:'map_fixture'},sourceRevisions:[{path:'planning/project/missing-current-source.md',revision:1}],workflowData:{phases:typedMapPhases},documentDisposition:{status:'Approved',notes:'Historical approval',reviewedAt:new Date().toISOString()}},bodyMarkdown:'# Phase Map\n\n```champcity-phase-map\n'+JSON.stringify({phases:typedMapPhases})+'\n```'});
  assert.equal((await f.service.get(f.root,f.workflow.id)).review,null); assert.equal((await f.store.listEntities(f.projectId,'Phase')).length,0);
  await assert.rejects(f.service.save(f.root,f.workflow.id,{workflowId:f.workflow.id,phases:[{...phases[0],dependsOn:['phase_two']},phases[1]],sources:model.sources}),/dependency/);
  const saved=await f.service.save(f.root,f.workflow.id,{workflowId:f.workflow.id,phases,sources:model.sources}); assert.equal(saved.plan,null); assert.match(saved.review.markdown,/Explicit Phase obligation/);
  await assert.rejects(f.service.review(f.root,f.workflow.id,saved.review.cycle.id,{expectedRecordVersion:2,outcome:'approved'}),/stale/);
  const listeners=new Map(); require('../../dist/main/workflow/workflowApplicationIpc.js').registerWorkflowApplicationIpc({handle:(channel,listener)=>listeners.set(channel,listener)},()=>f.root);
  assert.throws(()=>listeners.get('workflow:phaseMapGet')({},f.workflow.id,'surplus'),/Exact bounded/);
  const accepted=await listeners.get('workflow:phaseMapReview')({},f.workflow.id,saved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'}); assert.equal(accepted.plan.criteria.length,1); assert.equal(accepted.plan.directWorkItems.length,0);
  const exact=await f.state.createWorkflow(f.projectId,{workflowType:'feature-capability',title:'Exact existing graph',currentWorkspace:'feature-planning'});
  await assert.rejects(f.service.get(f.root,exact.id),/accepted graph/);
  assert.equal((await f.store.listEntities(f.projectId,'PlanReviewCycle')).length,0);
});
