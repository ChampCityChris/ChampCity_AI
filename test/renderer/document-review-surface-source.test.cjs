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

test("document viewer displays full body and falls back to preview only when body is unavailable", () => {
  const full = renderToStaticMarkup(React.createElement(FigmaDocumentCard, props()));
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
  const tree = FigmaDocumentCard(props({ onCopy: () => { copies += 1; }, onSelectSlot: (...args) => selections.push(args), selectedSlotId: "profile",
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

test("document viewer exposes read errors and a bounded empty state", () => {
  const failed = renderToStaticMarkup(React.createElement(FigmaDocumentCard, props({ documentError: "Cannot read selected revision", feedback: "Refresh complete" })));
  assert.match(failed, /role="status"/);
  assert.match(failed, /Cannot read selected revision/);
  assert.match(failed, /Refresh complete/);
  const empty = renderToStaticMarkup(React.createElement(FigmaDocumentCard, props({ selectedDocument: null, neutralMessage: "Prepare the current handoff." })));
  assert.match(empty, /No document yet/);
  assert.match(empty, /Prepare the current handoff/);
  const copy = descendants(FigmaDocumentCard(props({ selectedDocument: null }))).find((node) => node.type === "button");
  assert.equal(copy.props.disabled, true);
});

test("document refresh reloads retained selection and skips a removed document", async () => {
  const fs = require("node:fs"), path = require("node:path"), ts = require("typescript"), vm = require("node:vm");
  const source = ts.createSourceFile("App.tsx", fs.readFileSync(path.join(__dirname, "../../src/renderer/app/App.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === "refreshDocuments") callback = node; ts.forEachChild(node, visit); }
  visit(source);
  const code = ts.transpileModule(`(${callback.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const retained of [true, false]) {
    const calls = [];
    const inventory = retained ? [document()] : [];
    let error, loading;
    const refresh = vm.runInNewContext(code, { Error,
      window: { champcity: { listDocuments: async () => { calls.push("list"); return inventory; } } },
      selectedDocumentId: "doc-1", activeWorkspaceId: "project-intake-capture",
      setIsLoadingDocuments: (value) => { loading = value; }, setDocumentError: (value) => { error = value; },
      applyDocumentInventory: (value) => { assert.equal(value, inventory); },
      refreshProjectPlanningWorkspaceModel: async () => {}, refreshCurrentModel: async () => ({}),
      loadDocument: async (id, options) => { calls.push([id, options.preserveOnFailure]); },
      isArchitectEnabledWorkspace: () => false, transitionToWorkflowStep() {}, setFeedback() {},
    });
    await refresh();
    assert.deepEqual(calls, retained ? ["list", ["doc-1", true]] : ["list"]);
    assert.equal(loading, false);
    assert.equal(error, "");
  }
});
