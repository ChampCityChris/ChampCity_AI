const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { FigmaDocumentCard } = require("./renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/FigmaDocumentCard.tsx");

function document(overrides = {}) {
  return { logicalDocumentId: "doc-1", displayFilename: "PROJECT_INTAKE_demo.md", markdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo.md",
    metadata: { artifactType: "project-intake", artifactRevision: 1, participationRole: "gatingReview" },
    effectiveDisposition: "Pending", documentReadState: "readable", preview: "Truncated preview", bodyMarkdown: "# Complete document\n\nFinal evidence beyond preview.", ...overrides };
}
function props(overrides = {}) {
  return { documentError: "", feedback: "", onCopy() {}, selectedDocument: document(), ...overrides };
}
function descendants(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(descendants)];
}
function invokeWithMockHooks(component, componentProps) {
  const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, previous = internals.ReactCurrentDispatcher.current;
  internals.ReactCurrentDispatcher.current = {useState: initial => [initial, () => {}]};
  try { return component(componentProps); } finally { internals.ReactCurrentDispatcher.current = previous; }
}

test("document viewer displays full body and falls back to preview only when body is unavailable", () => {
  const full = renderToStaticMarkup(React.createElement(FigmaDocumentCard, props()));
  assert.doesNotMatch(full, />Open<\/button>/);
  assert.match(full, /Export Markdown…/);
  assert.match(full, /Complete document/);
  assert.match(full, /Final evidence beyond preview/);
  assert.doesNotMatch(full, /Truncated preview/);
  const fallback = renderToStaticMarkup(React.createElement(FigmaDocumentCard, props({ selectedDocument: document({ bodyMarkdown: undefined }) })));
  assert.match(fallback, /Truncated preview/);
  const emptyBody = renderToStaticMarkup(React.createElement(FigmaDocumentCard, props({ selectedDocument: document({ bodyMarkdown: "" }) })));
  assert.doesNotMatch(emptyBody, /Truncated preview/);
});

test("document viewer selects readable slots and copies through supplied callbacks", () => {
  const selections = [];
  let copies = 0;
  const tree = invokeWithMockHooks(FigmaDocumentCard, props({ onCopy: () => { copies += 1; }, onSelectSlot: (...args) => selections.push(args), selectedSlotId: "profile",
    slots: [{ slotId: "profile", logicalDocumentId: "doc-1", displayLabel: "Profile" }, { slotId: "roadmap", logicalDocumentId: "doc-2", displayLabel: "Roadmap" }, { slotId: "missing", displayLabel: "Missing" }] }));
  const buttons = descendants(tree).filter((node) => node.type === "button");
  const tabs = buttons.filter((node) => Object.hasOwn(node.props, "aria-selected"));
  assert.deepEqual(tabs.map((node) => node.props.disabled), [false, false, true]);
  assert.deepEqual(tabs.map((node) => node.props["aria-selected"]), [true, false, false]);
  tabs[1].props.onClick();
  buttons.find((node) => React.Children.toArray(node.props.children).includes("Copy")).props.onClick();
  assert.deepEqual(selections, [["roadmap", "doc-2"]]);
  assert.equal(copies, 1);
});

test("document viewer exports the exact selected display Markdown through the shared action", () => {
  let request;
  const tree = invokeWithMockHooks(FigmaDocumentCard, props({selectedDocument: document({displayFilename: "..\\Draft:Review.md", bodyMarkdown: "SQL-derived review projection"}), onExport: value => {request = value;}}));
  const buttons = descendants(tree).filter(node => node.type === "button");
  const exportButton = buttons.find(node => React.Children.toArray(node.props.children).join("").includes("Export Markdown"));
  assert.ok(exportButton); exportButton.props.onClick();
  assert.deepEqual(request, {suggestedFilename: "Draft_Review.md", markdown: "SQL-derived review projection"});
  const absent = invokeWithMockHooks(FigmaDocumentCard, props({selectedDocument: null}));
  assert.equal(descendants(absent).some(node => node.type === "button" && React.Children.toArray(node.props.children).join("").includes("Export Markdown")), false);
});

test("document viewer exposes read errors and a bounded empty state", () => {
  const failed = renderToStaticMarkup(React.createElement(FigmaDocumentCard, props({ documentError: "Cannot read selected revision", feedback: "Refresh complete" })));
  assert.match(failed, /role="status"/);
  assert.match(failed, /Cannot read selected revision/);
  assert.match(failed, /Refresh complete/);
  const empty = renderToStaticMarkup(React.createElement(FigmaDocumentCard, props({ selectedDocument: null, neutralMessage: "Prepare the current handoff." })));
  assert.match(empty, /No document yet/);
  assert.match(empty, /Prepare the current handoff/);
  const copy = descendants(invokeWithMockHooks(FigmaDocumentCard, props({ selectedDocument: null }))).find((node) => node.type === "button");
  assert.equal(copy.props.disabled, true);
});
