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
