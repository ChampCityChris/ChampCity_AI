const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadRendererSourceModule } = require("../renderer/renderer-source-loader.cjs");

const {
  applySuccessfulProjectIntakeSubmission,
  clearProjectIntakePostSubmitReviewState,
  createProjectIntakeConfirmation,
  findCreatedProjectIntakeDocumentId,
} = require("../../dist/shared/projectIntake/postSubmitReviewState.js");

function submissionResult() {
  return {
    ok: true,
    projectSlug: "demo_project",
    projectRoot: "<PROJECT_REPO>",
    projectIntakeMarkdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
    architectPromptMarkdownPath:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.md",
    architectInterviewTargetMarkdownPath:
      "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo_project.md",
    artifactRevision: 1,
    promptRevision: 1,
    invalidatedPaths: [],
  };
}

function documents() {
  return [
    {
      logicalDocumentId: "prompt",
      markdownPath:
        "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.md",
    },
    {
      logicalDocumentId: "created-intake",
      markdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
    },
  ];
}

function pendingIntakeResolverResult() {
  return {
    status: "current",
    totalDocumentCount: 2,
    document: {
      logicalDocumentId: "created-intake",
      owningWorkspaceId: "project-intake-capture",
      owningWorkspace: "Project Intake Capture",
      lifecycleLocation: { level: "project", stage: "intake" },
      participationRole: "gatingReview",
      artifactType: "project-intake",
      reason: "Project Intake is Pending.",
      evidencePaths: [
        "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
      ],
      freshnessState: "fresh",
      staleSources: [],
      markdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
      displayTitle: "PROJECT_INTAKE_demo_project",
      effectiveDisposition: "Pending",
      orderPosition: 1,
      totalDocumentCount: 2,
    },
  };
}

test("created Intake path resolves to the loaded logical document", () => {
  assert.equal(
    findCreatedProjectIntakeDocumentId(documents(), submissionResult()),
    "created-intake",
  );
});

test("Markdown-only confirmation payload is created from successful submission result", () => {
  assert.deepEqual(createProjectIntakeConfirmation(submissionResult()), {
    projectIntakeMarkdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
    architectPromptMarkdownPath:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.md",
  });
});

test("post-submit review preserves Project Intake view while resolver requires Pending Intake review", () => {
  const nextState = applySuccessfulProjectIntakeSubmission(
    {
      confirmation: null,
      viewedWorkspaceId: "project-planning-review",
      selectedDocumentId: null,
      resolverResult: null,
    },
    submissionResult(),
    documents(),
    pendingIntakeResolverResult(),
  );

  assert.equal(nextState.viewedWorkspaceId, "project-intake-capture");
  assert.equal(nextState.selectedDocumentId, "created-intake");
  assert.equal(nextState.resolverResult.document.owningWorkspaceId, "project-intake-capture");
  assert.equal(nextState.confirmation.projectIntakeMarkdownPath, submissionResult().projectIntakeMarkdownPath);
});

test("repository change clears Project Intake confirmation without inventing navigation", () => {
  const state = applySuccessfulProjectIntakeSubmission(
    {
      confirmation: null,
      viewedWorkspaceId: "project-intake-capture",
      selectedDocumentId: null,
      resolverResult: null,
    },
    submissionResult(),
    documents(),
    pendingIntakeResolverResult(),
  );

  assert.deepEqual(clearProjectIntakePostSubmitReviewState(state), {
    ...state,
    confirmation: null,
  });
});

test("Work Intake capture asks for bounded work in the selected Project without route selection", () => {
  const { WorkIntakeWorkspace } = loadRendererSourceModule("src/renderer/app/WorkIntakeWorkspace.tsx");
  const markup = renderToStaticMarkup(React.createElement(WorkIntakeWorkspace, {
    projection: {
      project: {projectId: "selected-project", projectName: "New Product"}, suggestedProjectName: "New Product", branches: [
        { name: "work-intake/current", commit: "a".repeat(40) },
        { name: "integration-target", commit: "b".repeat(40) },
      ],
      currentBranch: "work-intake/current", suggestedBase: { name: "integration-target", commit: "b".repeat(40) },
      currentIntake: null, intakes: [], blockedReason: null,
    },
    onReturn() {}, onSaved: async () => {},
  }));
  assert.match(markup, /Work request, problem, or change/);
  assert.match(markup, /Desired outcome/);
  assert.match(markup, /Non-negotiable constraints/);
  assert.doesNotMatch(markup, /Integrate into branch/);
  assert.match(markup, /Save Work Intake/);
  assert.doesNotMatch(markup, /Project Type|Select.*route|greenfield|refactor-migration|Submit Project Intake/);
});

const {ProjectIntakeShell} = loadRendererSourceModule("src/renderer/app/ProjectIntakeShell.tsx");
const {ProjectIntakeWorkspace} = loadRendererSourceModule("src/renderer/app/ProjectIntakeWorkspace.tsx");
const recoveredIntakeValue = {projectName:"Recovered", projectPurpose:"Create", desiredOutcome:"Use", projectType:"Desktop application", projectRepository:"<PROJECT_REPO>", hasExistingSourceOrPlanning:false, knownConstraints:"", repositoryReviewContext:""};

test("recovered Project Intake preserves question order, conditional context and document geometry", () => {
  const props = {value:recoveredIntakeValue,onChange(){},onChooseProjectRepository(){},onSubmit(){},isChoosingProjectRepository:false,isSubmittingIntake:false,postSubmitConfirmation:null,document:{selectedDocument:null,documentError:"",feedback:"",onCopy(){}},disposition:null};
  const html = renderToStaticMarkup(React.createElement(ProjectIntakeShell,props));
  let last=-1;
  for(const label of ["Project Name","Project Purpose","Desired Outcome","Project Type","Does this repository","Constraints / Non-Negotiables","Project Repository","Submit Project Intake"]) {const position=html.indexOf(label); assert.ok(position>last,label);last=position;}
  assert.match(html,/intake-workspace-shell-intake/); assert.match(html,/intake-workspace-shell-companion/);
  assert.doesNotMatch(html,/What should the Architect know/);
  const existing = renderToStaticMarkup(React.createElement(ProjectIntakeShell,{...props,value:{...props.value,hasExistingSourceOrPlanning:true},isChoosingProjectRepository:true,isSubmittingIntake:true}));
  assert.match(existing,/What should the Architect know/); assert.match(existing,/Choosing\.\.\./); assert.match(existing,/Saving\.\.\./);
});

test("recovered Project Intake confirmation and disposition retain historical placement", () => {
  const html=renderToStaticMarkup(React.createElement(ProjectIntakeShell,{value:recoveredIntakeValue,onChange(){},onChooseProjectRepository(){},onSubmit(){},isChoosingProjectRepository:false,isSubmittingIntake:false,
    postSubmitConfirmation:{summary:"Created supplied artifacts",entries:[{label:"Project Intake Markdown",value:"planning/intake.md"}]},
    document:{selectedDocument:null,documentError:"",feedback:"",onCopy(){}},disposition:{canApply:false,isApplying:false,notes:"",onApply(){},onNotesChange(){},onStatusChange(){},status:"",workflowStep:"Review & Validation"}}));
  assert.ok(html.indexOf("Submit Project Intake")<html.indexOf("Project Intake submission confirmation"));
  assert.ok(html.indexOf("Project Intake submission confirmation")<html.indexOf("Document disposition"));
  assert.match(html,/planning\/intake.md/); assert.match(html,/Apply Review/); assert.match(html,/disabled=""/);
});

test("recovered Greenfield Intake adapter retains current SQL save identity and approved handoff gating", async () => {
  const originalState=React.useState, originalEffect=React.useEffect, originalRef=React.useRef, oldWindow=global.window;
  const calls=[]; const values=[null,false,true,false,"","","",false,""]; let index=0;
  React.useState=initial=>[index<values.length?values[index++]:initial,()=>{}]; React.useEffect=()=>{}; React.useRef=initial=>({current:initial});
  global.window={champcity:{saveWorkflowIntake:async(...args)=>{calls.push(args);return {values:recoveredIntakeValue};}}};
  try {
    const element=ProjectIntakeWorkspace({workflowId:"exact-sql-workflow",value:recoveredIntakeValue,repositoryIdentity:"<PROJECT_REPO>",onChange(){},onChooseProjectRepository(){},onPrepared(){},onRailStatus(){},isChoosingProjectRepository:false});
    assert.equal(element.type.name,"ProjectIntakeShell"); assert.equal(element.props.captureDisabled,false);
    element.props.onSubmit(); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls[0][0],"exact-sql-workflow"); assert.equal(calls[0][1].workflowType,"project-creation"); assert.equal(calls[0][1].values.projectRepository,"<PROJECT_REPO>");
    assert.equal(element.props.supportControls.props.children[1].props.disabled,true);
  } finally {React.useState=originalState;React.useEffect=originalEffect;React.useRef=originalRef;global.window=oldWindow;}
});
