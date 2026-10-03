const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const {
  FigmaPhaseMapWorkspace,
  PhaseMapDocumentPreview,
  phaseMapProjectionFromDocument,
  workCardCountByPhaseId,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/phaseMapPresentation.tsx");

function phaseMapDocument(overrides = {}) {
  return {
    logicalDocumentId: "phase-map-doc",
    markdownPath: "planning/project/Phase_Map/PHASE_MAP_demo.md",
    displayFilename: "PHASE_MAP_demo.md",
    metadata: {
      artifactType: "phase-map",
      artifactRevision: 1,
      participationRole: "gatingReview",
      canonical: {
        workflowData: {
          phases: overrides.phases ?? [
            {
              phaseId: "phase-02",
              title: "Second Phase",
              order: 2,
              purpose: "Follow the foundation.",
              dependsOn: ["phase-01"],
              sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
            },
            {
              phaseId: "phase-01",
              title: "Foundation",
              order: 1,
              purpose: "Create the first usable workflow.",
              dependsOn: [],
              sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
            },
          ],
        },
      },
    },
    effectiveDisposition: "Pending",
    documentReadState: "readable",
    initializationNeeded: false,
    bodyMarkdown: "# Phase Map\n\n```json\n{\"phases\":[{\"phaseId\":\"phase-01\"}]}\n```\n",
    preview: "# Phase Map",
    previewTruncated: false,
  };
}

function fifteenPhaseFixture() {
  return Array.from({ length: 15 }, (_, index) => {
    const phaseId = `phase-${String(index).padStart(2, "0")}`;
    return {
      phaseId,
      title: `Phase ${String(index).padStart(2, "0")} Title`,
      order: index,
      purpose: `Purpose for ${phaseId}.`,
      dependsOn: index === 0 ? [] : [`phase-${String(index - 1).padStart(2, "0")}`],
      sourceReferences: [`planning/phases/${phaseId}/Phase_Planning.md`],
    };
  });
}

test("Phase Map accordion click moves the expanded phase and exposes its evidence", () => {
  const originalState = React.useState;
  const originalEffect = React.useEffect;
  let selected;
  React.useState = (initial) => [selected ?? initial, (value) => { selected = value; }];
  React.useEffect = () => {};
  const input = { currentPhaseId: "phase-01", documentError: "", documents: [], feedback: "", onCopy() {}, selectedDocument: phaseMapDocument() };
  function controls(node) {
    if (!node || typeof node !== "object") return [];
    return [...(node.type === "button" && Object.hasOwn(node.props, "aria-expanded") ? [node] : []), ...React.Children.toArray(node.props?.children).flatMap(controls)];
  }
  try {
    const before = controls(FigmaPhaseMapWorkspace(input));
    assert.deepEqual(before.map((button) => button.props["aria-expanded"]), [true, false]);
    before[1].props.onClick();
    const after = controls(FigmaPhaseMapWorkspace(input));
    assert.deepEqual(after.map((button) => button.props["aria-expanded"]), [false, true]);
    assert.match(renderToStaticMarkup(after[1]), /Follow the foundation/);
    assert.doesNotMatch(renderToStaticMarkup(after[0]), /Create the first usable workflow/);
  } finally {
    React.useState = originalState;
    React.useEffect = originalEffect;
  }
});

test("Phase Map projection renders ordered operator-readable phases from canonical metadata", () => {
  const markup = renderToStaticMarkup(
    React.createElement(PhaseMapDocumentPreview, { document: phaseMapDocument() }),
  );

  assert.match(markup, /Phase Map Projection/);
  assert.ok(markup.indexOf("phase-01") < markup.indexOf("phase-02"));
  assert.match(markup, /Foundation/);
  assert.match(markup, /Create the first usable workflow/);
  assert.match(markup, /None/);
  assert.match(markup, /planning\/project\/PROJECT_PROFILE\.md/);
  assert.doesNotMatch(markup, /```json/);
  assert.match(markup, /View Source/);
});

test("Phase Map source view renders the canonical Markdown body behind Hide Source", () => {
  const document = phaseMapDocument();
  const markup = renderToStaticMarkup(
    React.createElement(PhaseMapDocumentPreview, {
      document,
      defaultShowSource: true,
    }),
  );

  assert.match(markup, /Hide Source/);
  assert.match(markup, /# Phase Map/);
  assert.match(markup, /```json/);
  assert.match(markup, /\{\&quot;phases\&quot;:\[/);
});

test("Phase Map malformed metadata renders Needs Attention without fabricated phases", () => {
  const malformed = phaseMapDocument({ phases: undefined });
  malformed.metadata.canonical.workflowData = {};
  const projection = phaseMapProjectionFromDocument(malformed);
  const markup = renderToStaticMarkup(
    React.createElement(PhaseMapDocumentPreview, { document: malformed }),
  );

  assert.equal(projection.state, "needs-attention");
  assert.match(markup, /Needs Attention/);
  assert.doesNotMatch(markup, /phase-01/);
  assert.doesNotMatch(markup, /Second Phase/);
});

test("Figma Phase Map workspace renders compact active phase list from real metadata", () => {
  const document = phaseMapDocument();
  const markup = renderToStaticMarkup(
    React.createElement(FigmaPhaseMapWorkspace, {
      currentPhaseId: "phase-01",
      documentError: "",
      documents: [
        {
          logicalDocumentId: "wc-01",
          markdownPath: "planning/phases/phase-01/Work_Cards/WC01_demo.md",
          displayFilename: "WC01_demo.md",
          metadata: {
            artifactType: "formal-work-card",
            phaseId: "phase-01",
            workCardId: "WC01",
          },
          effectiveDisposition: "Approved",
          initializationNeeded: false,
        },
      ],
      feedback: "",
      onCopy: () => undefined,
      selectedDocument: document,
    }),
  );

  assert.match(markup, /figma-phase-map-card/);
  assert.match(markup, /PHASE_MAP_demo\.md/);
  assert.match(markup, /- 2 phases/);
  assert.match(markup, /<button aria-expanded="true" class="figma-phase-map-item active" type="button">/);
  assert.match(markup, /<button aria-expanded="false" class="figma-phase-map-item" type="button">/);
  assert.ok(markup.indexOf("phase-01") < markup.indexOf("phase-02"));
  assert.match(markup, /Active/);
  assert.match(markup, /Foundation/);
  assert.match(markup, /Create the first usable workflow/);
  assert.match(markup, /planning\/project\/PROJECT_PROFILE\.md/);
  assert.match(markup, /1 card/);
  assert.match(markup, /Copy/);
  assert.match(markup, /Open/);
  assert.doesNotMatch(markup, /Dependencies/);
  assert.doesNotMatch(markup, /Source References/);
  assert.doesNotMatch(markup, /View Source/);
});

test("Figma Phase Map workspace renders all phases from a 15-phase metadata fixture", () => {
  const phases = fifteenPhaseFixture();
  const markup = renderToStaticMarkup(
    React.createElement(FigmaPhaseMapWorkspace, {
      currentPhaseId: "phase-14",
      documentError: "",
      documents: [],
      feedback: "",
      onCopy: () => undefined,
      selectedDocument: phaseMapDocument({ phases }),
    }),
  );

  assert.match(markup, /- 15 phases/);
  for (const phase of phases) {
    assert.match(markup, new RegExp(phase.phaseId));
    assert.match(markup, new RegExp(phase.title));
  }
  assert.ok(markup.indexOf("phase-00") < markup.indexOf("phase-14"));
  assert.match(markup, /Purpose for phase-14\./);
  assert.match(markup, /planning\/phases\/phase-14\/Phase_Planning\.md/);
});

test("Phase Map work card counts use real formal Work Card identities only", () => {
  const counts = workCardCountByPhaseId([
    {
      logicalDocumentId: "wc-01-a",
      markdownPath: "planning/phases/phase-01/Work_Cards/WC01_demo.md",
      displayFilename: "WC01_demo.md",
      metadata: {
        artifactType: "formal-work-card",
        phaseId: "phase-01",
        workCardId: "WC01",
      },
      effectiveDisposition: "Approved",
      initializationNeeded: false,
    },
    {
      logicalDocumentId: "wc-01-b",
      markdownPath: "planning/phases/phase-01/Work_Cards/WC01_duplicate.md",
      displayFilename: "WC01_duplicate.md",
      metadata: {
        artifactType: "formal-work-card",
        phaseId: "phase-01",
        workCardId: "WC01",
      },
      effectiveDisposition: "Approved",
      initializationNeeded: false,
    },
    {
      logicalDocumentId: "handoff",
      markdownPath: "planning/phases/phase-01/Architect_Handoffs/hand.md",
      displayFilename: "hand.md",
      metadata: {
        artifactType: "generated-handoff",
        phaseId: "phase-01",
        workCardId: "WC02",
      },
      effectiveDisposition: "Pending",
      initializationNeeded: false,
    },
  ]);

  assert.equal(counts.get("phase-01"), 1);
  assert.equal(counts.has("phase-02"), false);
});

const {ProjectPhaseMapShell,ProjectPhaseMapCards}=require('./renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/ProjectPhaseMapShell.tsx');
test('recovered Project Phase Map cards match surviving historical markup with typed projections',()=>{
 for(const currentPhaseId of [null,'phase-02'])for(const count of [0,3]){
  const document=phaseMapDocument(),projection=phaseMapProjectionFromDocument(document);
  const documents=Array.from({length:count},(_,index)=>({logicalDocumentId:`work-${index}`,markdownPath:`planning/phases/phase-01/Work_Cards/WC${index}.md`,displayFilename:`WC${index}.md`,metadata:{artifactType:'formal-work-card',phaseId:'phase-01',workCardId:`WC${index}`},effectiveDisposition:'Approved',initializationNeeded:false}));
  const common={currentPhaseId,documentError:'',feedback:'Current evidence',selectedDocument:document,onCopy(){}};
  assert.equal(renderToStaticMarkup(React.createElement(ProjectPhaseMapCards,{...common,projection,workCardCounts:{'phase-01':count}})),renderToStaticMarkup(React.createElement(FigmaPhaseMapWorkspace,{...common,documents})));
 }
 const markup=renderToStaticMarkup(React.createElement(ProjectPhaseMapCards,{currentPhaseId:null,documentError:'SQL blocker',feedback:'',selectedDocument:null,projection:{state:'needs-attention',reason:'Exact current map required'},workCardCounts:{},onCopy(){}}));assert.match(markup,/Exact current map required/);assert.match(markup,/SQL blocker/);assert.match(markup,/disabled=""/);
});
test('recovered Project Phase Map shell preserves expansion and browser placement without deriving authority',()=>{
 const original={useState:React.useState,useEffect:React.useEffect};let expanded;
 React.useState=initial=>[expanded??initial,value=>{expanded=value;}];React.useEffect=()=>{};
 const props={selectedDocument:phaseMapDocument(),projection:{state:'readable',phases:phaseMapProjectionFromDocument(phaseMapDocument()).phases},currentPhaseId:'phase-01',documentError:'',feedback:'',workCardCounts:{},onCopy(){}};
 function nodes(element){return !element||typeof element!=='object'?[]:[element,...React.Children.toArray(element.props?.children).flatMap(nodes)];}
 try{let first=ProjectPhaseMapCards(props);nodes(first).find(node=>node.type==='button'&&node.props.className==='figma-phase-map-item').props.onClick();let next=ProjectPhaseMapCards(props);assert.equal(nodes(next).find(node=>node.type==='h2'&&node.props.children==='Second Phase').props.children,'Second Phase');assert.equal(nodes(next).filter(node=>node.type==='button'&&node.props['aria-expanded']===true).length,1);}finally{Object.assign(React,original);}
 for(const browserVisible of [true,false]){const markup=renderToStaticMarkup(React.createElement(ProjectPhaseMapShell,{cards:props,review:null,browserVisible,browserCompanion:React.createElement('div',{className:'figma-browser-column'},'Architect')}));assert.match(markup,/Phase Map Figma workspace/);assert.equal(markup.includes('chat-hidden'),!browserVisible);assert.ok(markup.indexOf('figma-phase-map-column')<markup.indexOf('figma-browser-column'));assert.match(markup,/tabindex="-1"/);}
});
test('recovered Project Phase Map adapter Refresh and exact review are driven by SQL candidates',async t=>{
 const f=await require('../support/structured-architect-fixture.cjs').structuredArchitectFixture(t);await f.architect.review(f.root,f.workflow.id,f.candidate.review.cycleId,{expectedRecordVersion:f.candidate.review.recordVersion,outcome:'approved'});
 const ingress=require('../../dist/main/workflow/workflowCandidateIngressService.js').createWorkflowCandidateIngressService(),planning=require('../../dist/main/projectPlanning/structuredProjectPlanningService.js').createStructuredProjectPlanningService();
 const semantic={facts:[{title:'Verified',statement:'Current understanding',impact:'Bounded outcome'}],direction:{title:'Direction',objective:'Useful outcome',scopeIn:['First'],scopeOut:['Later'],constraints:[],assumptions:[],risks:[]},criteria:[{statement:'Useful',criticality:'required',verificationIntent:'Operator confirms',validationPolicy:'operator_decision'}]};
 const plan=await ingress.submit(f.root,{workflowId:f.workflow.id,stage:'project-planning',candidateJson:JSON.stringify(semantic)});await planning.review(f.root,f.workflow.id,plan.reviewId,{expectedRecordVersion:plan.recordVersion,outcome:'approved'});
 const map=await ingress.submit(f.root,{workflowId:f.workflow.id,stage:'phase-map',candidateJson:JSON.stringify({phases:[{phaseId:'foundation',title:'Foundation',order:1,purpose:'Usable result',dependsOn:[],sourceReferences:[]}]})});
 const service=require('../../dist/main/phaseMap/structuredPhaseMapService.js').createStructuredPhaseMapService(),navigation=require('../../dist/main/workflow/greenfieldNavigationService.js').createGreenfieldNavigationService();const sql=await service.get(f.root,f.workflow.id);
 const {StructuredPhaseMapWorkspace}=require('./renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/StructuredPhaseMapWorkspace.tsx');const originals={useState:React.useState,useEffect:React.useEffect},oldWindow=global.window,values=[sql,'','notes','Approved',false,'',null];let index=0;const calls=[];
 React.useState=initial=>{const position=index++;return[values[position]??initial,value=>{values[position]=typeof value==='function'?value(values[position]):value;}];};React.useEffect=()=>{};
 global.window={champcity:{getStructuredPhaseMap:async id=>{calls.push(['get',id]);return service.get(f.root,id);},getGreenfieldNavigation:id=>navigation.get(f.root,id),reviewStructuredPhaseMap:async(...args)=>{calls.push(['review',...args]);return service.review(f.root,...args);}}};
 const render=()=>{index=0;return StructuredPhaseMapWorkspace({workflowId:f.workflow.id,browserPanel:null,onNext:async()=>{}});};
 try{let element=render();assert.equal(element.type.name,'ProjectPhaseMapShell');assert.equal(element.props.cards.projection.phases[0].phaseId,'foundation');assert.equal(element.props.cards.selectedDocument.metadata.canonical,undefined);assert.equal(element.props.review.canApply,true);
 element.props.review.onApply();for(let n=0;n<500&&values[4];n++)await new Promise(resolve=>setTimeout(resolve,10));assert.deepEqual(calls[0],['review',f.workflow.id,map.reviewId,{expectedRecordVersion:map.recordVersion,outcome:'approved',notes:'notes'}]);
 element=render();element.props.browserCompanion.props.children[1].props.onRefresh();for(let n=0;n<500&&values[4];n++)await new Promise(resolve=>setTimeout(resolve,10));element=render();assert.deepEqual(calls[1],['get',f.workflow.id]);assert.equal(values[1],'',String(values[1]));assert.equal(values[4],false);assert.equal(values[0].review.disposition.state,'approved');assert.equal(element.props.cards.currentPhaseId,'foundation');assert.equal(element.props.cards.workCardCounts.foundation,0);
 values[1]='SQL map source is stale';element=render();assert.equal(element.props.review.canApply,false);assert.equal(element.props.cards.documentError,'SQL map source is stale');
 }finally{Object.assign(React,originals);global.window=oldWindow;}
});
