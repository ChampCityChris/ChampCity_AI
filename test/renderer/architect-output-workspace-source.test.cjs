const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { FigmaBrowserActionsPanel } = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/App.tsx");
const {
  buildArchitectOutputEvidenceFingerprint, selectArchitectOutputSlot,
  markSingleDisplayedArchitectOutputRevisionViewed, presentedRevisionsForArchitectOutputModel,
} = require("./renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/architectOutputWorkspaceRefresh.ts");

const slot = { slotId: "formal-work-card", targetPath: "planning/phases/phase-01/Work_Cards/WC01_demo.md", logicalDocumentId: "wc01", artifactRevision: 2, disposition: "Pending", documentReadState: "readable", freshnessState: "fresh" };
const model = { workspaceId: "work-card-planning", outputKind: "formal-work-card", state: "awaiting-review", documentSlots: [slot] };

test("Architect refresh fingerprints distinguish repository, revision, and disposition changes", () => {
  const baseline = buildArchitectOutputEvidenceFingerprint("project-a", model);
  assert.equal(buildArchitectOutputEvidenceFingerprint("project-a", { ...model, documentSlots: [{ ...slot }] }), baseline);
  assert.notEqual(buildArchitectOutputEvidenceFingerprint("project-b", model), baseline);
  for (const changed of [{ artifactRevision: 3 }, { disposition: "Approved" }, { documentReadState: "missing" }]) {
    assert.notEqual(buildArchitectOutputEvidenceFingerprint("project-a", { ...model, documentSlots: [{ ...slot, ...changed }] }), baseline);
  }
});

test("Architect review marks only the displayed readable current revision as viewed", () => {
  const detail = { logicalDocumentId: slot.logicalDocumentId, markdownPath: slot.targetPath, documentReadState: "readable", metadata: { artifactRevision: 2 } };
  for (const changed of [{ metadata: { artifactRevision: 1 } }, { logicalDocumentId: "other" }, { readError: "unreadable" }, { markdownPath: "other.md" }]) {
    assert.deepEqual(markSingleDisplayedArchitectOutputRevisionViewed(model, { ...detail, ...changed }, []), []);
  }
  const viewed = markSingleDisplayedArchitectOutputRevisionViewed(model, detail, []);
  assert.equal(viewed.length, 1);
  assert.equal(markSingleDisplayedArchitectOutputRevisionViewed(model, detail, viewed), viewed);
  assert.deepEqual(presentedRevisionsForArchitectOutputModel(model), [{ slotId: slot.slotId, targetPath: slot.targetPath, artifactRevision: 2 }]);
  const missing = { slotId: "missing", targetPath: "pending.md" };
  const bundle = { ...model, documentSlots: [missing, slot] };
  assert.equal(selectArchitectOutputSlot(bundle, null), slot);
  assert.equal(selectArchitectOutputSlot(bundle, "missing"), missing);
  assert.deepEqual(presentedRevisionsForArchitectOutputModel(bundle), presentedRevisionsForArchitectOutputModel(model));
  assert.deepEqual(markSingleDisplayedArchitectOutputRevisionViewed(bundle, detail, []), []);
});

function browserActions(model, overrides = {}) {
  return FigmaBrowserActionsPanel({
    model, actionFeedback: null, attachmentError: "", browserStatus: null, pollingError: "",
    onCopyHandoff() {}, onPrepareHandoff() {}, onRefresh() {}, onReloadBrowser() {}, onRetryBrowser() {},
    ...overrides,
  });
}

function nodes(element) {
  if (!element || typeof element !== "object") return [];
  return [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
}

function actionButton(element, label) {
  const button = nodes(element).find((node) => node.type === "button" &&
    React.Children.toArray(node.props.children).includes(label));
  assert.ok(button, `Missing visible action: ${label}`);
  return button;
}

test("Work Card Planning Browser Actions prepare and copy a Formal Work Card revision request", () => {
  const revision = {
    ...model, state: "revision-requested", canPrepareHandoff: true, canCopyHandoff: false,
    documentSlots: [{ ...slot, disposition: "RevisionRequested" }],
  };
  const calls = [];
  const handlers = {
    onPrepareHandoff: () => calls.push("prepare"),
    onCopyHandoff: () => calls.push("copy"),
  };
  const before = browserActions(revision, handlers);
  const prepare = actionButton(before, "Prepare Revision Request");
  assert.equal(prepare.props.disabled, false);
  assert.equal(actionButton(before, "Copy Revision Request").props.disabled, true);
  assert.doesNotMatch(renderToStaticMarkup(before), /ready to copy/);
  prepare.props.onClick();

  // The target remains RevisionRequested while the draft submission waits for output.
  const prepared = {
    ...revision, state: "waiting-for-drafts", canPrepareHandoff: false,
    canCopyHandoff: true, preparedInstruction: "Canonical revision instruction.",
  };
  const after = browserActions(prepared, handlers);
  const copy = actionButton(after, "Copy Revision Request");
  assert.equal(copy.props.disabled, false);
  assert.match(renderToStaticMarkup(after), /Revision request ready to copy\. Select Copy Revision Request/);
  copy.props.onClick();
  assert.deepEqual(calls, ["prepare", "copy"]);

  const failed = browserActions({ ...prepared, state: "promotion-failed", promotionError: "Draft body is empty." });
  assert.match(renderToStaticMarkup(failed), /Draft body is empty\./);
  assert.doesNotMatch(renderToStaticMarkup(failed), /ready to copy/);
});

test("Browser Actions preserve initial Work Card and other planning presentation", () => {
  for (const disposition of [undefined, "Pending", "Approved", "Rejected"]) {
    const initial = browserActions({ ...model, documentSlots: [{ ...slot, disposition }] });
    actionButton(initial, "Prepare Handoff");
    actionButton(initial, "Copy Handoff");
    assert.doesNotMatch(renderToStaticMarkup(initial), /Revision Request|ready to copy/);
  }
  const wrongSlot = browserActions({ ...model, documentSlots: [{ ...slot, slotId: "repair-work-card", disposition: "RevisionRequested" }] });
  actionButton(wrongSlot, "Prepare Handoff");

  const project = {
    workspaceId: "project-planning-review", canPrepareHandoff: true, canCopyHandoff: true,
    preparedInstruction: "Project revision instruction.",
    documentSlots: ["project-profile", "project-roadmap"].map((slotId) => ({ slotId, disposition: "RevisionRequested" })),
  };
  const projectLabels = { prepareHandoffLabel: "Prepare Project Planning Handoff", copyHandoffLabel: "Copy Project Planning Handoff" };
  const projectRevision = browserActions(project, projectLabels);
  actionButton(projectRevision, "Prepare Revision Request");
  actionButton(projectRevision, "Copy Revision Request");
  assert.match(renderToStaticMarkup(projectRevision), /Revision Request Ready\. Copy Handoff and send it manually in embedded ChatGPT\./);
  const projectInitial = browserActions({ ...project, documentSlots: [] }, projectLabels);
  actionButton(projectInitial, "Prepare Project Planning Handoff");
  actionButton(projectInitial, "Copy Project Planning Handoff");
  const phase = browserActions({ ...project, workspaceId: "phase-planning-bundle" });
  actionButton(phase, "Prepare Handoff");
  actionButton(phase, "Copy Handoff");
  assert.doesNotMatch(renderToStaticMarkup(phase), /Revision Request Ready/);
});
