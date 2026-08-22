const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

function phaseMapCssRule(selector) {
  const css = fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "renderer", "styles.css"),
    "utf8",
  );
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `Expected ${selector} CSS rule to exist.`);
  return { css, rule: match[1] };
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

test("Figma Phase Map rows are clickable accordion controls", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "renderer", "app", "phaseMapPresentation.tsx"),
    "utf8",
  );

  assert.match(source, /const \[expandedPhaseId, setExpandedPhaseId\] = useState/);
  assert.match(source, /aria-expanded=\{isActive\}/);
  assert.match(source, /onClick=\{\(\) => setExpandedPhaseId\(phase\.phaseId\)\}/);
  assert.match(source, /type="button"/);
});

test("Figma Phase Map workspace uses a bounded internal phase-list scroll region", () => {
  const column = phaseMapCssRule(".figma-phase-map-column");
  assert.match(column.rule, /display:\s*flex;/);
  assert.match(column.rule, /flex-direction:\s*column;/);
  assert.match(column.rule, /min-width:\s*0;/);
  assert.match(column.rule, /min-height:\s*0;/);
  assert.match(column.rule, /overflow:\s*hidden;/);
  assert.doesNotMatch(column.rule, /overflow:\s*auto;/);

  const card = phaseMapCssRule(".figma-phase-map-card");
  assert.match(card.rule, /display:\s*flex;/);
  assert.match(card.rule, /flex-direction:\s*column;/);
  assert.match(card.rule, /flex:\s*1 1 auto;/);
  assert.match(card.rule, /min-height:\s*0;/);
  assert.match(card.rule, /overflow:\s*hidden;/);

  const header = phaseMapCssRule(".figma-phase-map-card-header");
  assert.match(header.rule, /flex:\s*0 0 auto;/);

  const list = phaseMapCssRule(".figma-phase-map-list");
  assert.match(list.rule, /display:\s*grid;/);
  assert.match(list.rule, /flex:\s*1 1 auto;/);
  assert.match(list.rule, /min-height:\s*0;/);
  assert.match(list.rule, /overflow-y:\s*auto;/);
  assert.match(list.rule, /scrollbar-width:\s*thin;/);
  assert.doesNotMatch(list.rule, /scrollbar-width:\s*none;/);
  assert.doesNotMatch(
    list.css,
    /\.figma-phase-map-list::-webkit-scrollbar[^{]*\{[^}]*display:\s*none;/,
  );
});

test("Figma Phase Map preserves metadata mapping and review-panel sibling layout", () => {
  const phaseMapSource = fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "renderer", "app", "phaseMapPresentation.tsx"),
    "utf8",
  );
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "renderer", "app", "App.tsx"),
    "utf8",
  );
  const columnIndex = appSource.indexOf('<div className="figma-phase-map-column">');
  const workspaceIndex = appSource.indexOf("<FigmaPhaseMapWorkspace", columnIndex);
  const reviewPanelIndex = appSource.indexOf("<FigmaArchitectReviewPanel", workspaceIndex);

  assert.notEqual(columnIndex, -1);
  assert.ok(workspaceIndex > columnIndex);
  assert.ok(reviewPanelIndex > workspaceIndex);
  assert.match(phaseMapSource, /const phases = projection\?\.state === "readable" \? projection\.phases : \[\];/);
  assert.match(phaseMapSource, /phases\.map\(\(phase\) =>/);
  assert.doesNotMatch(phaseMapSource, /phases\s*\.\s*slice|projection\.phases\s*\.\s*slice/);
  assert.doesNotMatch(phaseMapSource, /figma-phase-map-list[\s\S]*FigmaArchitectReviewPanel/);
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
