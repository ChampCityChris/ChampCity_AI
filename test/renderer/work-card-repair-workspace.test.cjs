const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { WorkCardRepairWorkspace, WorkCardRepairPresentation } = require("./renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/WorkCardRepairWorkspace.tsx");

function harness() {
  const values = [];
  const refs = [];
  return (props) => {
    const original = { useState: React.useState, useRef: React.useRef, useEffect: React.useEffect, useMemo: React.useMemo };
    let stateIndex = 0, refIndex = 0;
    const effects = [];
    React.useState = (initial) => { const index = stateIndex++; if (!(index in values)) values[index] = initial; return [values[index], (value) => { values[index] = typeof value === "function" ? value(values[index]) : value; }]; };
    React.useRef = (initial) => refs[refIndex++] ??= { current: initial };
    React.useMemo = (callback) => callback();
    React.useEffect = (callback) => effects.push(callback);
    try { const element = WorkCardRepairWorkspace(props); effects.forEach((callback) => callback()); return element; }
    finally { Object.assign(React, original); }
  };
}
function props(overrides = {}) {
  return { actionError: "", actionFeedback: "", architectOutputModel: null, browserPanel: React.createElement("aside", null, "Embedded Architect"),
    isCreating: false, isPreparing: false, isArchitectPaneVisible: true, model: null,
    onCopyHandoff() {}, onReloadBrowser() {}, onPrepareHandoff() {}, onRefresh() {}, onSelectRepairWorkCard() {}, repairWorkCardDocument: null,
    projection: { state: "handoff-needed", canCreateRepairHandoff: true, canCopyArchitectHandoff: false, repairId: "WC01-REPAIR01", repairDefectText: "Preserve current revision", repairWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md", reason: "Validation requested repair",
      primaryEvidenceDocument: { role: "primary-validation-record", label: "Validation Record", markdownPath: "planning/phases/phase-01/Validation/VALIDATION_WC01.md", documentReadState: "readable", bodyMarkdown: "# Failure evidence\n\nObserved validation failure." }, supportingEvidenceDocuments: [] }, ...overrides };
}
function nodes(element) {
  if (!element || typeof element !== "object") return [];
  return [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
}

test("Repair renders primary evidence, bound repair target, and controlled handoff actions", () => {
  const calls = [];
  const render = harness();
  const input = props({ onPrepareHandoff: () => calls.push("prepare"), onReloadBrowser: () => calls.push("reload"), onRefresh: () => calls.push("refresh") });
  render(input);
  const element = render(input);
  const markup = renderToStaticMarkup(element);
  for (const text of ["Failure evidence", "Observed validation failure", "WC01-REPAIR01", "Preserve current revision", "Prepare Repair Work Card Prompt", "Embedded Architect"]) assert.ok(markup.includes(text), text);
  assert.doesNotMatch(markup, /Stage 1|Stage 2|<input/);
  const buttons = nodes(WorkCardRepairPresentation(element.props)).filter((node) => node.type === "button");
  assert.equal(buttons[0].props.disabled, false);
  assert.equal(buttons[1].props.disabled, true);
  buttons[0].props.onClick(); buttons[2].props.onClick(); buttons[3].props.onClick();
  assert.deepEqual(calls, ["prepare", "reload", "refresh"]);
  const busy = render({ ...input, isPreparing: true });
  assert.equal(nodes(WorkCardRepairPresentation(busy.props)).find((node) => node.type === "button").props.disabled, true);
});

test("Repair selects a pending repair revision for review and hides review on supporting evidence", () => {
  let selections = 0;
  const render = harness();
  const input = props({ onSelectRepairWorkCard: () => { selections += 1; }, repairReviewPanel: React.createElement("div", null, "Review current repair"),
    architectOutputModel: { canCopyHandoff: true, documentSlots: [{ slotId: "repair-work-card", displayLabel: "Repair Work Card", targetPath: "planning/repair.md", logicalDocumentId: "repair", artifactRevision: 2, disposition: "Pending", documentReadState: "readable" }] },
    repairWorkCardDocument: { logicalDocumentId: "repair", displayFilename: "repair.md", markdownPath: "planning/repair.md", metadata: { artifactRevision: 2 }, effectiveDisposition: "Pending", bodyMarkdown: "# Current repair revision" } });
  render(input);
  const current = render(input);
  assert.match(renderToStaticMarkup(current), /Current repair revision/);
  assert.match(renderToStaticMarkup(current), /Review current repair/);
  assert.equal(selections, 1);
  current.props.onSelectDocument(current.props.documentSlots[0].slotId);
  const evidence = render(input);
  assert.match(renderToStaticMarkup(evidence), /Observed validation failure/);
  assert.doesNotMatch(renderToStaticMarkup(evidence), /Review current repair/);
  assert.equal(selections, 1);
});
