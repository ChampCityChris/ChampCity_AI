const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const {
  WorkCardPlanDocumentPreview,
  workCardPlanProjectionFromDocument,
} = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/workCardPlanPresentation.tsx");

function workCardPlanDocument(overrides = {}) {
  return {
    logicalDocumentId: "work-card-plan-doc",
    markdownPath: "planning/phases/phase-01/Work_Card_Plan.md",
    displayFilename: "Work_Card_Plan.md",
    metadata: {
      artifactType: "work-card-plan",
      artifactRevision: 1,
      participationRole: "compoundGatingReview",
      canonical: {
        workflowData: {
          candidates: overrides.candidates ?? [
            {
              candidateId: "WC02",
              order: 2,
              title: "Second Candidate",
              purpose: "Follow the first implementation pass.",
              dependsOn: ["WC01"],
              resolutionStatus: "carriedForward",
              resolutionReason: "Deferred into the next phase.",
              evidencePaths: ["planning/phases/phase-01/Phase_Planning.md"],
              carriedForwardToPhaseId: "phase-02",
            },
            {
              candidateId: "WC01",
              order: 1,
              title: "Foundation Candidate",
              purpose: "Create the first bounded implementation pass.",
              dependsOn: [],
              resolutionStatus: "planned",
              resolutionReason: "",
              evidencePaths: [],
            },
          ],
        },
      },
    },
    effectiveDisposition: "Pending",
    documentReadState: "readable",
    initializationNeeded: false,
    bodyMarkdown: "# Work Card Plan\n\n```champcity-work-card-plan\n[{\"candidateId\":\"WC01\"}]\n```\n",
    preview: "# Work Card Plan",
    previewTruncated: false,
  };
}

test("Work Card Plan projection renders ordered operator-readable candidates from canonical metadata", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardPlanDocumentPreview, { document: workCardPlanDocument() }),
  );

  assert.match(markup, /Work Card Plan Projection/);
  assert.ok(markup.indexOf("WC01") < markup.indexOf("WC02"));
  assert.match(markup, /Foundation Candidate/);
  assert.match(markup, /Create the first bounded implementation pass/);
  assert.match(markup, /Dependencies/);
  assert.match(markup, /None/);
  assert.match(markup, /Resolution Status/);
  assert.match(markup, /carriedForward/);
  assert.match(markup, /Deferred into the next phase/);
  assert.match(markup, /planning\/phases\/phase-01\/Phase_Planning\.md/);
  assert.match(markup, /phase-02/);
  assert.doesNotMatch(markup, /```champcity-work-card-plan/);
  assert.match(markup, /View Source/);
});

test("Work Card Plan source view renders canonical Markdown body behind Hide Source", () => {
  const document = workCardPlanDocument();
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardPlanDocumentPreview, {
      document,
      defaultShowSource: true,
    }),
  );

  assert.match(markup, /Hide Source/);
  assert.match(markup, /# Work Card Plan/);
  assert.match(markup, /```champcity-work-card-plan/);
  assert.match(markup, /\{\&quot;candidateId\&quot;:\&quot;WC01\&quot;\}/);
});

test("Work Card Plan malformed metadata renders Needs Attention without fabricated candidates", () => {
  const malformed = workCardPlanDocument({ candidates: undefined });
  malformed.metadata.canonical.workflowData = {};
  const projection = workCardPlanProjectionFromDocument(malformed);
  const markup = renderToStaticMarkup(
    React.createElement(WorkCardPlanDocumentPreview, { document: malformed }),
  );

  assert.equal(projection.state, "needs-attention");
  assert.match(markup, /Needs Attention/);
  assert.doesNotMatch(markup, /WC01/);
  assert.doesNotMatch(markup, /Second Candidate/);
});
