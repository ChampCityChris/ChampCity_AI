const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const {
  captureAgentHarnessPublicToolContract,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/runtime/mcpServer.js"));
const {
  createAgentHarnessToolRegistry,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/tools/toolRegistry.js"));
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/workspace/workspaceAccess.js"));
const {
  AgentHarnessError,
} = require(path.join(repositoryRoot, "dist/main/core/applicationErrors.js"));

const RESERVED_TOOLBOX_NAMES = [
  "workspace_toolbox",
  "project_toolbox",
  "intake_toolbox",
  "planning_toolbox",
  "issue_toolbox",
  "agent_toolbox",
  "model_toolbox",
  "skill_toolbox",
  "memory_toolbox",
  "validation_toolbox",
  "development_toolbox",
  "system_toolbox",
  "network_toolbox",
  "data_toolbox",
  "security_toolbox",
  "observability_toolbox",
  "ui_toolbox",
  "deployment_toolbox",
  "automation_toolbox",
  "document_toolbox",
  "media_asset_toolbox",
  "model_asset_toolbox",
  "archive_toolbox",
];

const EXISTING_TOOL_ACTIONS = {
  workflow_toolbox: ["status", "submit_stage_candidate"],
  repo_toolbox: [
    "status",
    "list_files",
    "read_file",
    "read_issue_screenshot",
    "inspect_text_file",
    "read_text_chunk",
    "read_text_lines",
    "read_markdown_section",
    "search_files",
    "copy_file",
    "move_file",
    "write_markdown_artifact",
    "write_json_artifact",
    "propose_patch",
    "apply_approved_patch",
  ],
  visual_asset_toolbox: ["read_image", "inspect_image", "compare_images", "create_image_preview"],
  git_toolbox: [
    "list_repository_checkouts",
    "status",
    "diff",
    "changed_files",
    "inspect_commit",
    "compare_refs",
    "inspect_reflog",
    "inspect_isolated_operation",
    "list_worktrees",
    "inspect_worktree",
    "list_tags",
    "inspect_remotes",
    "pre_commit_scan",
    "readiness_summary",
    "inspect_branch_state",
    "inspect_history",
    "verify_tag",
    "create_branch_from_ref",
    "advance_branch_ref",
    "rename_branch",
    "set_branch_upstream",
    "unset_branch_upstream",
    "delete_remote_branch",
    "prepare_branch",
    "switch_branch",
    "fetch_remote",
    "fast_forward_branch",
    "merge_branch",
    "create_tag",
    "push_tag",
    "delete_tag",
    "delete_branch",
    "replace_branch_ref",
    "push_with_lease",
    "delete_untracked_paths",
    "discard_managed_worktree",
    "skip_isolated_operation_step",
    "begin_isolated_operation",
    "continue_isolated_operation",
    "abort_isolated_operation",
    "advance_isolated_operation",
    "create_worktree_from_ref",
    "create_worktree_for_branch",
    "remove_worktree",
    "unstage_changes",
    "restore_files",
    "stage_changes",
    "amend_commit",
    "revert_commit",
    "cherry_pick_commit",
    "commit",
    "push",
    "integrate_to_dev",
  ],
  artifact_toolbox: ["status", "replace_markdown_body", "write_markdown_artifact", "write_json_artifact"],
  diagnostics_toolbox: ["status", "list_workspaces", "tool_inventory"],
  release_toolbox: [
    "status",
    "set_version",
    "validate_candidate",
    "build_windows_release",
    "inspect_release_artifact",
    "publish_github_release",
    "abandon_github_draft_release",
    "verify_github_release",
  ],
  test_toolbox: [
    "status",
    "run_test_file",
    "run_test_pattern",
    "run_validation_profile",
    "run_validation_lane",
    "audit_test_corpus",
  ],
  integration_toolbox: ["status"],
  browser_toolbox: ["status"],
  knowledge_toolbox: ["status"],
  workspace_write_attached_image: ["write_attached_image"],
};

const EXPECTED_TOOL_NAMES = [
  ...Object.keys(EXISTING_TOOL_ACTIONS),
  ...RESERVED_TOOLBOX_NAMES,
].sort();

test("HOTFIX10 publishes the exact stable top-level namespace and preserves existing actions", () => {
  const fixture = createWorkspace("Namespace_Project");
  const registry = createRegistry(fixture);
  const fullTools = registry.listTools("files.read files.write");
  const toolsByName = new Map(fullTools.map((tool) => [tool.name, tool]));

  assert.equal(fullTools.length, 35);
  assert.deepEqual([...toolsByName.keys()].sort(), EXPECTED_TOOL_NAMES);
  assert.equal(RESERVED_TOOLBOX_NAMES.length, 23);
  for (const [name, actions] of Object.entries(EXISTING_TOOL_ACTIONS)) {
    assert.deepEqual(toolsByName.get(name)?.actions, actions, name);
  }
  for (const name of RESERVED_TOOLBOX_NAMES) {
    assert.deepEqual(toolsByName.get(name)?.actions, ["status"], name);
  }

  const gitSchema = toolsByName.get("git_toolbox").inputZodSchema;
  for (const [action, params] of [
    ["create_branch_from_ref", { repositoryCheckoutId: "checkout-1", branchName: "feature", sourceRef: "dev" }],
    ["advance_branch_ref", { repositoryCheckoutId: "checkout-1", branchName: "feature", sourceRef: "dev", expectedCurrentCommit: "a".repeat(40) }],
    ["rename_branch", { repositoryCheckoutId: "checkout-1", branchName: "feature", newBranchName: "renamed" }],
    ["set_branch_upstream", { repositoryCheckoutId: "checkout-1", branchName: "feature", remote: "origin", remoteBranch: "dev" }],
    ["unset_branch_upstream", { repositoryCheckoutId: "checkout-1", branchName: "feature" }],
    ["delete_remote_branch", { repositoryCheckoutId: "checkout-1", remote: "origin", remoteBranch: "dev", expectedRemoteCommit: "a".repeat(40) }],
  ]) {
    const input = { workspaceId: fixture.workspaceId, action, params };
    assert.equal(gitSchema.safeParse(input).success, true, action);
    assert.equal(gitSchema.safeParse({ ...input, params: { ...params, force: true } }).success, false, action);
    for (const key of Object.keys(params)) {
      const missing = { ...params }; delete missing[key];
      assert.equal(gitSchema.safeParse({ ...input, params: missing }).success, false, action + ":" + key);
    }
  }
  const push = { workspaceId: fixture.workspaceId, action: "push", params: { repositoryCheckoutId: "checkout-1", remoteBranch: "other", setUpstream: true, expectedCommit: "a".repeat(40) } };
  assert.equal(gitSchema.safeParse(push).success, true);
  assert.equal(gitSchema.safeParse({ ...push, params: { setUpstream: "true" } }).success, false);
  assert.equal(gitSchema.safeParse({ ...push, params: { repositoryCheckoutId: "checkout-1" } }).success, true);
  assert.equal(gitSchema.safeParse({ ...push, params: { repositoryCheckoutId: "checkout-1", repositoryCheckoutPath: "Dev" } }).success, false);
  assert.equal(gitSchema.safeParse({ workspaceId: fixture.workspaceId, action: "status", params: {repositoryCheckoutId: "checkout-1"} }).success, true);
  assert.equal(gitSchema.safeParse({ workspaceId: fixture.workspaceId, action: "status", params: { repositoryCheckoutId: "checkout-1", checkoutRoot: "Dev" } }).success, false);
  assert.equal(gitSchema.safeParse({ workspaceId: fixture.workspaceId, action: "list_repository_checkouts" }).success, true);
  const firstCapture = captureAgentHarnessPublicToolContract(registry, "files.read files.write");
  const secondCapture = captureAgentHarnessPublicToolContract(registry, "files.write files.read files.write");
  assert.equal(firstCapture.toolCount, 35);
  assert.equal(secondCapture.toolCount, 35);
  assert.equal(firstCapture.fingerprint, secondCapture.fingerprint);
  assert.deepEqual(firstCapture.tools, secondCapture.tools);
  assert.deepEqual(firstCapture.tools.map((tool) => tool.name).sort(), EXPECTED_TOOL_NAMES);
});

test("HOTFIX10 placeholders are strict read-only registered-Workspace status actions without side effects", async () => {
  const fixture = createWorkspace("Reserved_Status_Project");
  const registry = createRegistry(fixture);
  const readTools = new Map(registry.listTools("files.read").map((tool) => [tool.name, tool]));
  const writeTools = new Map(registry.listTools("files.write").map((tool) => [tool.name, tool]));
  const writeToolNames = new Set(writeTools.keys());
  const beforeWorkspace = snapshotDirectory(fixture.root);
  const beforeUserData = snapshotDirectory(fixture.userDataRoot);

  for (const name of RESERVED_TOOLBOX_NAMES) {
    const tool = readTools.get(name);
    assert.ok(tool, name);
    assert.deepEqual(tool.actions, ["status"], name);
    assert.equal(tool.readOnly, true, name);
    assert.equal(writeToolNames.has(name), false, name);
    assert.equal(tool.inputZodSchema.safeParse({
      workspaceId: fixture.workspaceId,
      action: "status",
      params: {},
    }).success, true, name);
    assert.equal(tool.inputZodSchema.safeParse({
      workspaceId: fixture.workspaceId,
      action: "status",
      params: { unexpected: true },
    }).success, false, name);

    const result = await registry.callTool({
      name,
      arguments: { workspaceId: fixture.workspaceId, action: "status", params: {} },
      scope: "files.read",
    });
    assert.equal(result.ok, true, name);
    assert.deepEqual(result.payload, {
      toolbox: name,
      state: "reserved",
      implemented: false,
    }, name);

    const rejected = await registry.callTool({
      name,
      arguments: {
        workspaceId: fixture.workspaceId,
        action: "status",
        params: { unexpected: true },
      },
      scope: "files.read",
    });
    assert.equal(rejected.ok, false, name);
    assert.equal(rejected.error.code, "INVALID_INPUT", name);
  }

  const testRead = readTools.get("test_toolbox");
  const testWrite = writeTools.get("test_toolbox");
  assert.deepEqual(testRead?.actions, ["status"]);
  assert.equal(testRead?.readOnly, true);
  assert.deepEqual(testWrite?.actions, [
    "run_test_file",
    "run_test_pattern",
    "run_validation_profile",
    "run_validation_lane",
    "audit_test_corpus",
  ]);
  assert.equal(testWrite?.readOnly, false);
  const testSchema = registry.listTools("files.read files.write").find((tool) => tool.name === "test_toolbox").inputZodSchema;
  assert.equal(testSchema.safeParse({ workspaceId: fixture.workspaceId, action: "status", params: {} }).success, true);
  for (const [action, executionParams] of [
    ["run_test_file", { testPath: "test/validation/capability-map.test.cjs" }],
    ["run_test_pattern", { testPath: "test/validation/capability-map.test.cjs", testNamePattern: "one owner" }],
    ["run_validation_profile", { profile: "work-item", changedPaths: ["src/main/example.ts"], capabilityIds: ["fixture"] }],
    ["run_validation_lane", { lane: "integration" }],
    ["audit_test_corpus", {}],
  ]) {
    const input = { workspaceId: fixture.workspaceId, action, params: { repositoryCheckoutId: "checkout-1", ...executionParams } };
    assert.equal(testSchema.safeParse(input).success, true, action);
    assert.equal(testSchema.safeParse({ ...input, params: executionParams }).success, false, action);
    assert.equal(testSchema.safeParse({ ...input, params: { ...input.params, command: "node --test" } }).success, false, action);
  }
  for (const invalid of [
    { workspaceId: fixture.workspaceId, action: "run_test_file", params: {} },
    { workspaceId: fixture.workspaceId, action: "run_validation_lane", params: { lane: "unknown" } },
    { workspaceId: fixture.workspaceId, action: "audit_test_corpus", params: { command: "node --test" } },
  ]) assert.equal(testSchema.safeParse(invalid).success, false);

  const testStatus = await registry.callTool({
    name: "test_toolbox",
    arguments: { workspaceId: fixture.workspaceId, action: "status", params: {} },
    scope: "files.read",
  });
  assert.equal(testStatus.ok, true);
  assert.deepEqual(testStatus.payload, {
    toolbox: "test_toolbox",
    state: "implemented",
    implemented: true,
    executionScope: "files.write",
    maximumCatalogFiles: 512,
    perStepTimeoutMs: 900_000,
  });
  const deniedTestExecution = await registry.callTool({
    name: "test_toolbox",
    arguments: { workspaceId: fixture.workspaceId, action: "run_test_file", params: { testPath: "test/validation/capability-map.test.cjs" } },
    scope: "files.read",
  });
  assert.equal(deniedTestExecution.ok, false);
  assert.equal(deniedTestExecution.error.code, "OAUTH_SCOPE_DENIED");

  const deniedScope = await registry.callTool({
    name: RESERVED_TOOLBOX_NAMES[0],
    arguments: { workspaceId: fixture.workspaceId, action: "status", params: {} },
    scope: "files.write",
  });
  assert.equal(deniedScope.ok, false);
  assert.equal(deniedScope.error.code, "OAUTH_SCOPE_DENIED");

  const foreignWorkspace = await registry.callTool({
    name: RESERVED_TOOLBOX_NAMES[0],
    arguments: { workspaceId: "foreign_workspace", action: "status", params: {} },
    scope: "files.read",
  });
  assert.equal(foreignWorkspace.ok, false);
  assert.equal(foreignWorkspace.error.code, "WORKSPACE_ACCESS_DENIED");
  assert.deepEqual(snapshotDirectory(fixture.root), beforeWorkspace);
  // Shared source leases may leave empty coordinator directories, never persisted leases.
  assert.deepEqual(snapshotDirectory(fixture.userDataRoot).filter(entry => entry.type === "file"), beforeUserData.filter(entry => entry.type === "file"));
});

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-reserved-toolboxes-"));
  const root = path.join(container, name);
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "# Namespace fixture\n", "utf8");
  const workspaceId = name.toLowerCase();
  return { root, userDataRoot, workspaceId };
}

function createRegistry(fixture) {
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveWorkspaceRootContext(fixture.root);
      if (workspaceId !== fixture.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => [],
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: fixture.userDataRoot });
}

function snapshotDirectory(root) {
  const entries = [];
  function visit(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        entries.push({ relativePath, type: "directory" });
        visit(absolutePath, relativePath);
      } else {
        const bytes = fs.readFileSync(absolutePath);
        entries.push({
          relativePath,
          type: "file",
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      }
    }
  }
  visit(root);
  return entries;
}

test("workflow candidate ingress routes every Greenfield semantic stage through production SQL without Operator disposition", async t => {
  const f = await require('../support/structured-architect-fixture.cjs').structuredArchitectFixture(t,{save:false});
  const workspaceId=path.basename(f.root).toLowerCase(), registry=createRegistry({...f,workspaceId,userDataRoot:path.join(f.root,'harness-data')});
  const call=(stage,candidate,scopeEntityId,scope='files.read files.write')=>registry.callTool({name:'workflow_toolbox',scope,arguments:{workspaceId,action:'submit_stage_candidate',params:{workflowId:f.workflow.id,stage,candidateJson:JSON.stringify(candidate),...(scopeEntityId?{scopeEntityId}:{})}}});
  const submit=async(stage,candidate,scopeEntityId)=>{
    const decisions=JSON.stringify(await f.store.listEntities(f.projectId,'Decision'));
    const result=await call(stage,candidate,scopeEntityId);assert.equal(result.ok,true,JSON.stringify(result.error));
    assert.equal(result.payload.workflowId,f.workflow.id);assert.ok(result.payload.reviewId);assert.ok(result.payload.recordVersion);
    assert.notEqual(result.payload.disposition,'approved');assert.equal(JSON.stringify(await f.store.listEntities(f.projectId,'Decision')),decisions);
    return result.payload;
  };
  const readTools=registry.listTools('files.read').find(tool=>tool.name==='workflow_toolbox');assert.deepEqual(readTools.actions,['status']);
  assert.deepEqual(registry.listTools().find(tool=>tool.name==='workflow_toolbox').actions,['status','submit_stage_candidate']);
  const denied=await call('architect-interview',f.output,undefined,'files.read');assert.equal(denied.ok,false);assert.equal(denied.error.code,'OAUTH_SCOPE_DENIED');
  const before=JSON.stringify(await f.store.listEntities(f.projectId));
  for(const output of [{...f.output,scope:[]},{...f.output,workflowId:'peer-workflow'}])assert.equal((await call('architect-interview',output)).ok,false);
  assert.equal(JSON.stringify(await f.store.listEntities(f.projectId)),before);
  const first=await submit('architect-interview',f.output);let architect=await f.architect.get(f.root,f.workflow.id);assert.equal(architect.review.cycleId,first.reviewId);assert.ok(architect.reviewDocument.bodyMarkdown.includes('Project Understanding'));
  const assertDelivery=handoff=>{
    assert.match(handoff,/The semantic candidate is not the chat response/);
    assert.match(handoff,/workflow_toolbox.submit_stage_candidate/);
    assert.match(handoff,/JSON.stringify\(candidate\).*candidateJson/);
    assert.match(handoff,/Ask only materially unresolved questions and continue the conversation as needed/);
    assert.match(handoff,/After successful tool submission, respond only with a short confirmation/);
    assert.doesNotMatch(handoff,/Return only one JSON object|return structured|returning structured|Submit semantic candidate JSON|Return advisorySummary/i);
  };
  assertDelivery(architect.handoff);assert.match(architect.handoff,/Bound workspaceId:/);
  const React=require('react'), originals={useState:React.useState,useEffect:React.useEffect,useMemo:React.useMemo},oldWindow=global.window;
  const {GreenfieldArchitectWorkspace}=require('../renderer/renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/GreenfieldArchitectWorkspace.tsx');
  const values=[f.prepared,'','','','',false,'intake'];let index=0,refreshed;
  React.useState=initial=>{const position=index++;return [position<values.length?values[position]:initial,value=>{if(position===0)refreshed=value;}];};React.useEffect=()=>{};React.useMemo=fn=>fn();
  global.window={champcity:{getStructuredArchitectWorkspace:id=>f.architect.get(f.root,id)}};
  try {
    const element=GreenfieldArchitectWorkspace({workflowId:f.workflow.id,browserVisible:true,browserCompanion:null});
    element.props.browserCompanion.props.children[1].props.onRefresh();
    for(let retry=0;retry<100&&!refreshed;retry++)await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(refreshed.review.cycleId,first.reviewId);assert.ok(refreshed.reviewDocument.bodyMarkdown.includes('Project Understanding'));
    values[0]=refreshed;values[6]='architect-review';index=0;
    const next=GreenfieldArchitectWorkspace({workflowId:f.workflow.id,browserVisible:true,browserCompanion:null});
    assert.equal(next.props.document.selectedDocument.logicalDocumentId,refreshed.reviewDocument.logicalDocumentId);
    assert.doesNotMatch(require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../../src/renderer/app/GreenfieldArchitectWorkspace.tsx'),'utf8'),/candidateJson|<textarea/);
  } finally {Object.assign(React,originals);global.window=oldWindow;}
  await f.architect.review(f.root,f.workflow.id,first.reviewId,{expectedRecordVersion:first.recordVersion,outcome:'approved'});
  const direction={title:'Bounded outcome',objective:'Deliver useful first outcome',scopeIn:['First'],scopeOut:['Later'],constraints:[],assumptions:[],risks:[]};
  const semantic={facts:[{title:'Verified scope',statement:'Useful first outcome',impact:'Bounded execution'}],direction,criteria:[{statement:'Outcome is useful',criticality:'required',verificationIntent:'Operator confirms useful scope',validationPolicy:'operator_decision'}]};
  const planning=require('../../dist/main/projectPlanning/structuredProjectPlanningService.js').createStructuredProjectPlanningService();
  const stale=JSON.stringify(await f.store.listEntities(f.projectId));assert.equal((await call('project-planning',{...semantic,expectedRecordVersion:42})).ok,false);assert.equal((await call('project-planning',{...semantic,workflowId:'peer'})).ok,false);assert.equal(JSON.stringify(await f.store.listEntities(f.projectId)),stale);
  const plan=await submit('project-planning',semantic),pm=await planning.get(f.root,f.workflow.id);assert.ok(pm.review.profileMarkdown.includes('Verified scope'));assertDelivery(pm.handoff);
  await planning.review(f.root,f.workflow.id,plan.reviewId,{expectedRecordVersion:plan.recordVersion,outcome:'approved'});
  const map=require('../../dist/main/phaseMap/structuredPhaseMapService.js').createStructuredPhaseMapService();
  const mapped=await submit('phase-map',{phases:[{phaseId:'first',title:'Useful outcome',order:1,purpose:'Deliver useful result',dependsOn:[],sourceReferences:[]}]});let mm=await map.get(f.root,f.workflow.id);assertDelivery(mm.handoff);
  await map.review(f.root,f.workflow.id,mapped.reviewId,{expectedRecordVersion:mapped.recordVersion,outcome:'approved'});
  mm=await map.get(f.root,f.workflow.id);const phaseId=mm.review.livePhases[0].id;
  assert.equal((await call('phase-interview',semantic,'first')).ok,false,'Display Phase alias is not an exact entity ID');
  const loop=require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService();
  const interviewed=await submit('phase-interview',semantic,phaseId);let lm=await loop.get(f.root,f.workflow.id,phaseId,'interview');assert.equal(lm.review.cycle.id,interviewed.reviewId);assertDelivery(lm.handoff);
  await loop.review(f.root,f.workflow.id,phaseId,'interview',interviewed.reviewId,{expectedRecordVersion:interviewed.recordVersion,outcome:'approved'});
  const planned=await submit('phase-planning',{...semantic,candidates:[{candidateId:'first_work',order:1,title:'Implement first outcome',purpose:'Useful semantic result',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[{statement:'Outcome holds',criticality:'required',verificationIntent:'Independent check',validationPolicy:'semantic_ai'}]}]},phaseId);
  lm=await loop.get(f.root,f.workflow.id,phaseId,'planning');assertDelivery(lm.handoff);
  await loop.review(f.root,f.workflow.id,phaseId,'planning',planned.reviewId,{expectedRecordVersion:planned.recordVersion,outcome:'approved'});
  lm=await loop.get(f.root,f.workflow.id,phaseId,'planning');const workId=lm.review.workItems[0].id;
  const contract={implementationBoundaries:['Implement only first outcome'],affectedPaths:[],proofIntent:['Independent semantic proof']};
  const work=await submit('work-item-planning',contract,workId),workService=require('../../dist/main/workCardPlanning/structuredWorkItemPlanningService.js').createStructuredWorkItemPlanningService();
  let wm=await workService.get(f.root,f.workflow.id,workId);assert.equal(wm.workItem.recordVersion,work.recordVersion);assertDelivery(wm.handoff);
  const stable=JSON.stringify(await f.store.listEntities(f.projectId));assert.equal((await call('work-item-planning',{...contract,expectedVersion:1},workId)).ok,false);assert.equal((await call('work-item-planning',{...contract,disposition:'approved'},workId)).ok,false);assert.equal(JSON.stringify(await f.store.listEntities(f.projectId)),stable);
  await workService.review(f.root,f.workflow.id,workId,{expectedRecordVersion:wm.workItem.recordVersion,outcome:'approved'});
  const kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService();
  wm=await workService.get(f.root,f.workflow.id,workId);const attempt=await kernel.beginWorkItemAttempt(f.root,f.workflow.id,workId,wm.workItem.recordVersion,'candidate-repair-proof');
  const implementation=await kernel.finishWorkItemAttempt(f.root,f.workflow.id,workId,attempt.executionRef,{summary:'Implemented result with discovered defect',deviations:[],blockers:[],residualRisks:[],outcome:'implemented'});
  const advisory=await require('../../dist/main/workCardValidation/structuredWorkItemReviewService.js').createStructuredWorkItemReviewService().get(f.root,f.workflow.id,workId);assertDelivery(advisory.handoff);
  const testerState=require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(f.store,{principalId:'fixture-tester',principalType:'agent',role:'Tester'});
  const failure=await testerState.createTesterResult(f.projectId,f.workflow.id,workId,implementation.id,{sourceMode:'source-neutral',recommendation:'production-defect-suspected',affectedCapabilityIds:[],permanentTestPaths:[],determinationEvidence:['Independent defect reproduction'],unknowns:[],rationale:'Current result fails its objective'});
  const repair=await kernel.createWorkflowRepair(f.root,f.workflow.id,workId,failure.id);assert.match(repair.repair.body.title,/Repair/);
  await submit('work-item-planning',contract,repair.repair.id);
  assert.ok((await workService.get(f.root,f.workflow.id,repair.repair.id)).review);
  const invalid=await registry.callTool({name:'workflow_toolbox',scope:'files.read files.write',arguments:{workspaceId,action:'submit_stage_candidate',params:{workflowId:f.workflow.id,stage:'unsupported',candidateJson:'{}'}}});assert.equal(invalid.ok,false);
  const oversized=await registry.callTool({name:'workflow_toolbox',scope:'files.read files.write',arguments:{workspaceId,action:'submit_stage_candidate',params:{workflowId:f.workflow.id,stage:'work-item-planning',scopeEntityId:repair.repair.id,candidateJson:'x'.repeat(200001)}}});assert.equal(oversized.ok,false);
});
