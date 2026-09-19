const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { ProjectPlanningBlockerBanner } = loadRendererSourceModule("src/renderer/app/App.tsx");

function blockedModel(overrides = {}) {
  return {
    state: "needs-attention",
    railStatus: "Needs Attention",
    requiredAction: "Correct the Project Planning source mismatch.",
    reason: "Project Planning source revisions do not match the approved Architect Interview.",
    evidencePaths: [
      "planning/project/PROJECT_PROFILE.md",
      "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
      "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md",
      "planning/project/Project_Architect_Interviews/INTERVIEW_demo.md",
      "planning/project/Project_Intake/PROJECT_INTAKE_demo.md",
    ],
    handoffState: "not-prepared",
    canPrepareHandoff: false,
    canCopyHandoff: false,
    canApplyBundleDisposition: false,
    selectedPlanningDocumentRole: "profile",
    bundleSynchronizationState: "invalid",
    ...overrides,
  };
}

function renderBanner(props) {
  return renderToStaticMarkup(
    React.createElement(ProjectPlanningBlockerBanner, {
      activeWorkspaceId: "project-planning-review",
      projectPlanningModel: blockedModel(),
      ...props,
    }),
  );
}

test("Project Planning blocker banner renders exact reason and distinct required action", () => {
  const reason = "Exact current blocker reason from Project Planning.";
  const requiredAction = "Regenerate the Project Planning draft bundle from the approved interview.";
  const markup = renderBanner({
    projectPlanningModel: blockedModel({
      reason,
      requiredAction,
      evidencePaths: [],
    }),
  });

  assert.match(markup, /role="status"/);
  assert.match(markup, /Project Planning Needs Attention/);
  assert.match(markup, new RegExp(reason));
  assert.match(markup, new RegExp(`Required action:</strong> ${requiredAction}`));
});

test("Project Planning blocker banner suppresses duplicate required action text", () => {
  const reason = "The Project Planning blocker is already explained.";
  const markup = renderBanner({
    projectPlanningModel: blockedModel({
      reason,
      requiredAction: ` ${reason} `,
      evidencePaths: [],
    }),
  });

  assert.equal(markup.match(new RegExp(reason, "g"))?.length, 1);
  assert.doesNotMatch(markup, /Required action:/);
});

test("Project Planning blocker banner caps initial evidence and exposes disclosure", () => {
  const markup = renderBanner();

  assert.match(markup, /Evidence/);
  assert.match(markup, /planning\/project\/PROJECT_PROFILE\.md/);
  assert.match(markup, /planning\/project\/Project_Roadmap\/PROJECT_ROADMAP_demo\.md/);
  assert.match(markup, /planning\/project\/Project_Planning_Documents\/PROJECT_PLANNING_DOCUMENTS_demo\.md/);
  assert.doesNotMatch(markup, /planning\/project\/Project_Architect_Interviews\/INTERVIEW_demo\.md/);
  assert.doesNotMatch(markup, /planning\/project\/Project_Intake\/PROJECT_INTAKE_demo\.md/);
  assert.match(markup, /Show 2 more/);
});

test("Project Planning blocker banner renders no layout in non-blocked states or other workspaces", () => {
  assert.equal(
    renderBanner({
      projectPlanningModel: blockedModel({ state: "ready-for-handoff", railStatus: "Ready" }),
    }),
    "",
  );
  assert.equal(renderBanner({ activeWorkspaceId: "architect-interview" }), "");
  assert.equal(renderBanner({ projectPlanningModel: null }), "");
  assert.match(renderBanner({ projectPlanningModel: blockedModel({ state: "not-ready" }) }), /Project Planning Needs Attention/);
});

test("Project Planning evidence disclosure expands and collapses without changing model evidence", () => {
  const model = blockedModel();
  const snapshot = structuredClone(model);
  let expanded;
  const render = () => {
    const original = React.useState;
    React.useState = (initial) => {
      expanded ??= initial;
      return [expanded, (value) => { expanded = typeof value === "function" ? value(expanded) : value; }];
    };
    try { return ProjectPlanningBlockerBanner({ activeWorkspaceId: "project-planning-review", projectPlanningModel: model }); }
    finally { React.useState = original; }
  };
  function nodes(element) {
    if (!element || typeof element !== "object") return [];
    return [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
  }
  const initial = render();
  assert.equal(nodes(initial).filter((node) => node.type === "li").length, 3);
  const expand = nodes(initial).find((node) => node.type === "button");
  assert.equal(expand.props.children, "Show 2 more");
  expand.props.onClick();
  const opened = render();
  assert.deepEqual(nodes(opened).filter((node) => node.type === "li").map((node) => node.props.children), model.evidencePaths);
  const collapse = nodes(opened).find((node) => node.type === "button");
  assert.equal(collapse.props.children, "Show less");
  collapse.props.onClick();
  assert.equal(nodes(render()).filter((node) => node.type === "li").length, 3);
  assert.deepEqual(model, snapshot);
});

test("Project Planning rail uses the supplied current planning status", () => {
  const { deriveProjectLifecycleRailStatuses } = require("../../dist/shared/workspaces/projectLifecycleRailStatus.js");
  for (const projectPlanningStatus of ["Not Ready", "Needs Attention", "Ready", "Awaiting Approval", "Completed"]) {
    const statuses = deriveProjectLifecycleRailStatuses([], {
      projectIntakeStatus: "Completed", architectInterviewStatus: "Completed", projectPlanningStatus,
    });
    assert.equal(statuses["project-planning-review"], projectPlanningStatus);
    assert.equal(statuses["project-phase-map"], projectPlanningStatus === "Completed" ? "Ready" :
      projectPlanningStatus === "Needs Attention" ? "Needs Attention" : "Not Ready");
  }
});
