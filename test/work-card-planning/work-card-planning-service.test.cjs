const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { buildImplementationValidationScopeGuidance } = require("../../dist/main/validation/implementationValidationScopeGuidance.js");
test("retained Work Card standard maps validation scope to owned behavior", () => {
  const standard = fs.readFileSync(
    path.join(__dirname, "..", "..", "docs", "governance", "WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md"),
    "utf8",
  );

  assert.match(standard, /Validation scope must map to the card's owned behavior/);
  assert.match(standard, /shared test file or suite contains unrelated domains/);
  assert.match(standard, /all-or-nothing acceptance gate unless the card owns those domains/);
  assert.match(standard, /Unrelated or pre-existing failures discovered by broader validation must be recorded and routed/);
});

// The binding owner is outside this inventory regression; real binding conformance remains in routed lifecycle proof.
test("routed projection shares one fresh inventory across large Work Item and document sets", async (t) => {
  const { tempWorkspace, writeDoc } = require("../support/canonical-markdown-fixtures.cjs");
  const bindingOwner = require("../../dist/main/planExecution/routedDevelopmentExecutionBinding.js");
  const { createRoutedDevelopmentExecutionService } = require("../../dist/main/planExecution/routedDevelopmentExecutionService.js");
  const { __setPlanningRepositorySnapshotTestHooks: hooks } = require("../../dist/main/documents/planningRepositorySnapshot.js");
  const root = tempWorkspace("champcity-routed-inventory-");
  t.after(() => { hooks(); fs.rmSync(root, {recursive:true,force:true}); });
  const intakeId = "intake-11111111-1111-4111-8111-111111111111";
  const identity = { intakeId, routeDecisionId:"decision-22222222-2222-4222-8222-222222222222", planId:"PLAN01" };
  const binding = { identity, planPath:"planning/work-plan.md", relativePath:"planning/execution.md", planRevision:1, artifactRevision:1, planDigest:"a".repeat(64),
    structure:{topology:"direct",topologyRationale:"Bounded inventory proof",acceptanceCriteria:["Accepted"],workItems:[]} };
  writeDoc(root,binding.planPath,"work-planning-plan","Approved",{identity});
  writeDoc(root,binding.relativePath,"routed-development-execution-binding","Approved",{identity});
  t.mock.method(bindingOwner,"readRoutedDevelopmentExecutionBinding",async()=>binding);
  const api=createRoutedDevelopmentExecutionService(root,intakeId);
  for(const count of [1,40]) {
    binding.structure.workItems=Array.from({length:count},(_,i)=>({workItemId:"WI"+String(i+1).padStart(2,"0"),title:"Item "+i,purpose:"Bounded behavior",dependsOn:i?["WI01"]:[],acceptanceCriteria:["Accepted"]}));
    for(let i=0;i<count*10;i++)writeDoc(root,"planning/context/"+i+".md","project-overview","Approved");
    let scans=0,acquisitions=0;
    hooks({onInventoryScan:()=>scans++,onSnapshotAcquisition:()=>acquisitions++});
    const first=await api.query(); assert.equal(scans,1);assert.equal(acquisitions,1);
    scans=0; acquisitions=0;
    await api.getDraft({workItemId:"WI01",expectedFingerprint:first.fingerprint});assert.equal(scans,1);assert.equal(acquisitions,1);
    scans=0;
    const handoff=await api.begin({workItemId:"WI01",expectedFingerprint:first.fingerprint});assert.equal(scans,1,"pre-write state is shared");
    scans=0;
    const after=await api.query();assert.equal(scans,1,"post-write projection acquires a fresh generation");
    if(count===1)assert.notEqual(after.fingerprint,first.fingerprint);
    fs.appendFileSync(path.join(root,handoff.handoffMarkdownPath),"\nSame-revision content edit\n");
    scans=0;const edited=await api.query();assert.equal(scans,1);assert.notEqual(edited.fingerprint,after.fingerprint);
    hooks();fs.unlinkSync(path.join(root,handoff.handoffMarkdownPath));
  }
});
test('shared WorkItem planning adapter contains no Architect parsing or prompt authority', () => {
  const source=fs.readFileSync(path.join(__dirname,'../../src/renderer/app/WorkItemPlanningWorkspace.tsx'),'utf8');
  const exact=fs.readFileSync(path.join(__dirname,'../../src/renderer/app/WorkflowExecutionWorkspace.tsx'),'utf8');
  assert.doesNotMatch(source,/JSON\.parse|Return bounded JSON|implementationBoundaries:/); assert.doesNotMatch(exact,/Architect WorkItem execution plan\\n|JSON\.parse\(architectDraft|decompositionDraft/);
  assert.match(source,/PlanReviewShell/); assert.match(exact,/WorkItemPlanningWorkspace/);
});
