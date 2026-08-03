const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const {
  PhaseMapDocumentPreview,
  phaseMapProjectionFromDocument,
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
