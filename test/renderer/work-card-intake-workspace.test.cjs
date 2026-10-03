const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const {workCardIntakeFromSql,WorkCardIntakeWorkspace:SqlWorkspace}=require('./renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/WorkCardIntakeWorkspace.tsx');

const {
  WorkCardIntakeShell,
  workCardIntakeProjectionFingerprint,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/WorkCardIntakeShell.tsx");

function WorkCardIntakeWorkspace(props){return React.createElement(WorkCardIntakeShell,{...props,projection:props.model?.workCardIntake??null,phaseTitle:props.model?.executionContext.phase.title??"Untitled phase",canPrepare:true});}
function intakeModel(overrides = {}) {
  const projection = overrides.projection ?? {
    phaseId: "phase-01",
    sourceWorkCardPlanPath: "planning/phases/phase-01/Work_Card_Plan.md",
    selectionReason: "Candidate is planned, incomplete, and all predecessors permit continuation.",
    candidate: {
      candidateId: "WC01",
      order: 1,
      title: "First Work Card",
      purpose: "Implement the first bounded product correction.",
      dependsOn: [],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: ["planning/phases/phase-01/Phase_Planning.md"],
    },
    handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md",
    formalWorkCardMarkdownPath: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md",
  };
  return {
    activeWorkspaceId: "work-card-planning",
    level: "work-card",
    stage: "planning",
    currentPhaseId: "phase-01",
    currentWorkCardId: "WC01",
    executionContext: {
      phase: {
        state: "active",
        phaseId: "phase-01",
        title: "Foundation",
        order: 1,
        totalPhaseCount: 1,
        purpose: "Build the first phase.",
        dependsOn: [],
        loopStep: "Work Cards",
        reason: "Current phase is active.",
      },
      workCard: {
        state: "active",
        workCardId: "WC01",
        title: "First Work Card",
        loopStep: "Planning",
        dispositionOrState: "Candidate is eligible.",
        reason: "Current Work Card comes from the current workflow model.",
      },
    },
    currentTarget: "Work Card Planning",
    workCardIntake: projection,
    sourceEvidence: [projection.sourceWorkCardPlanPath],
    requiredAction: "Prepare Work Card Planning.",
    expectedOutput: "Work Card Planning handoff.",
    eligibility: projection.selectionReason,
    expectedNextState: "Formal Work Card Planning.",
  };
}

test("Work Card Planning preparation renders the selected candidate and exact output paths", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardIntakeWorkspace, {
      actionError: "",
      actionFeedback: "",
      isGenerating: false,
      model: intakeModel(),
      onGenerate: () => undefined,
    }),
  );

  assert.match(markup, /phase-01/);
  assert.match(markup, /Foundation/);
  assert.match(markup, /1\. WC01/);
  assert.match(markup, /First Work Card/);
  assert.match(markup, /Implement the first bounded product correction/);
  assert.match(markup, /Dependencies/);
  assert.match(markup, /None/);
  assert.match(markup, /Resolution Status/);
  assert.match(markup, /planned/);
  assert.match(markup, /Selection Eligibility/);
  assert.match(markup, /planning\/phases\/phase-01\/Work_Card_Plan\.md/);
  assert.match(markup, /WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01\.md/);
  assert.match(markup, /Work_Cards\/WC01_first_work_card\.md/);
  assert.match(markup, /Application-generated non-review handoff/);
  assert.match(markup, /Prepare Work Card Planning/);
  assert.match(markup, /Creates the application-owned Approved non-review intake handoff/);
  assert.doesNotMatch(markup, /Generate Work Card Intake Handoff/);
  assert.doesNotMatch(markup, /Select a document/);
  assert.doesNotMatch(markup, /Canonical Markdown/);
  assert.doesNotMatch(markup, /Document workflow not yet implemented/);
  assert.doesNotMatch(markup, /Apply Current Disposition/);
  assert.doesNotMatch(markup, /Embedded ChatGPT/);
});

test("Work Card Planning preparation disables repeated generation while in flight and shows exact local errors", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardIntakeWorkspace, {
      actionError: "No eligible Work Card candidate is available: dependency-blocked",
      actionFeedback: "",
      isGenerating: true,
      model: intakeModel(),
      onGenerate: () => undefined,
    }),
  );

  assert.match(markup, /disabled=""/);
  assert.match(markup, /Preparing\.\.\./);
  assert.match(markup, /No eligible Work Card candidate is available: dependency-blocked/);
});

test("Work Card Intake projection fingerprint tracks shared path identity", () => {
  const projection = intakeModel().workCardIntake;

  assert.equal(
    workCardIntakeProjectionFingerprint(projection),
    "phase-01|WC01|planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md|planning/phases/phase-01/Work_Cards/WC01_first_work_card.md",
  );
});

test('Work Card Intake adapter prepares a non-review handoff for the exact SQL candidate only',async()=>{
 const item={record:{id:'work',body:{title:'Current candidate',objective:'Bounded work',workState:'planned',candidateKey:'WC02',planningOrder:2}},phaseId:'phase',dependencyIds:['prior'],eligibility:{blockers:['work-item-contract-review-required']}};
 const view={workflowId:'wf',items:[item,{record:{id:'prior',body:{candidateKey:'WC01'}}}],activeWorkItemIds:[],plan:{phases:[{phaseId:'phase',record:{body:{phaseKey:'PH01',title:'Foundation'}}}]}};
 const model=workCardIntakeFromSql(view,'work');assert.equal(model.canPrepare,true);assert.deepEqual(model.projection.candidate.dependsOn,['WC01']);assert.equal(model.phaseTitle,'Foundation');assert.equal(workCardIntakeFromSql({...view,items:[{...item,eligibility:{blockers:['dependency:prior']}}]},'work').canPrepare,false);assert.throws(()=>workCardIntakeFromSql(view,'peer'),/Exact/);
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;let index=0,values=[view,'',false,''],calls=[];
 React.useState=initial=>{const slot=index++;return [values[slot]??initial,value=>values[slot]=value];};React.useEffect=()=>{};React.useRef=()=>({current:0});global.window={champcity:{getStructuredWorkItemPlanning:async(...args)=>{calls.push(args);return {workflowId:'wf',workItem:{id:'work'},handoff:'Exact typed workflow_toolbox handoff'};}}};
 try{const draw=(id='work')=>{index=0;return SqlWorkspace({workflowId:'wf',workItemId:id,onPrepared:text=>calls.push(text)}).props;};let p=draw();assert.equal(p.canPrepare,true);p.onGenerate();await new Promise(setImmediate);assert.deepEqual(calls,[['wf','work'],'Exact typed workflow_toolbox handoff']);p=draw('peer');assert.equal(p.canPrepare,false);p.onGenerate();assert.equal(calls.length,2);}finally{Object.assign(React,original);global.window=oldWindow;}
});
