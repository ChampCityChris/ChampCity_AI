const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const repoRoot = path.join(__dirname, "..", "..");
const appSourcePath = path.join(repoRoot, "src", "renderer", "app", "App.tsx");
const stylesSourcePath = path.join(repoRoot, "src", "renderer", "styles.css");
const projectLifecycleRailSourcePath = path.join(
  repoRoot,
  "src",
  "shared",
  "workspaces",
  "projectLifecycleRailStatus.ts",
);

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

test("Project Planning blocker banner is placed between header and document ChatGPT workspace", () => {
  const source = fs.readFileSync(appSourcePath, "utf8");
  const workspaceSurface = source.slice(
    source.indexOf('aria-labelledby="workspace-heading"'),
    source.indexOf('{isWorkCardRepair ? ('),
  );
  const headerIndex = workspaceSurface.indexOf('<header className="workspace-header">');
  const bannerIndex = workspaceSurface.indexOf("<ProjectPlanningBlockerBanner");
  const bodyIndex = workspaceSurface.indexOf('"figma-doc-chat-workspace"');

  assert.ok(headerIndex >= 0, "workspace header must remain in the workspace surface");
  assert.ok(bannerIndex > headerIndex, "blocker banner must render after the workspace header");
  assert.ok(bodyIndex > bannerIndex, "blocker banner must render before the two-column workspace body");
});

test("Project Planning blocker banner consumes direct authoritative model fields and blocked states", () => {
  const source = fs.readFileSync(appSourcePath, "utf8");
  const componentSource = source.slice(
    source.indexOf("export function ProjectPlanningBlockerBanner"),
    source.indexOf("function FigmaBrowserActionsPanel"),
  );

  assert.match(componentSource, /projectPlanningModel:\s*ProjectPlanningWorkspaceModel \| null/);
  assert.match(componentSource, /activeWorkspaceId === "project-planning-review"/);
  assert.match(componentSource, /projectPlanningModel\?\.state === "not-ready"/);
  assert.match(componentSource, /projectPlanningModel\?\.state === "needs-attention"/);
  assert.match(componentSource, /const reason = projectPlanningModel\.reason/);
  assert.match(componentSource, /const requiredAction = projectPlanningModel\.requiredAction/);
  assert.match(componentSource, /projectPlanningModel\.evidencePaths/);
  assert.doesNotMatch(componentSource, /selectedDocument|architectOutputModel|deriveProjectPlanning|resolveProjectPlanning/);
});

test("Project Planning blocker banner renders exact reason and distinct required action", () => {
  const reason = "Exact authoritative blocker reason from Project Planning.";
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
});

test("Project Planning blocker evidence disclosure is presentation-only local state", () => {
  const source = fs.readFileSync(appSourcePath, "utf8");
  const componentSource = source.slice(
    source.indexOf("export function ProjectPlanningBlockerBanner"),
    source.indexOf("function FigmaBrowserActionsPanel"),
  );

  assert.match(componentSource, /const \[evidenceExpanded, setEvidenceExpanded\] = useState\(false\)/);
  assert.match(componentSource, /evidenceExpanded \? evidencePaths : evidencePaths\.slice\(0, 3\)/);
  assert.match(componentSource, /onClick=\{\(\) => setEvidenceExpanded\(\(current\) => !current\)\}/);
  assert.match(componentSource, /Show less/);
});

test("Project Planning blocker reason is not implemented in forbidden lower placements", () => {
  const source = fs.readFileSync(appSourcePath, "utf8");
  const browserActionsSource = source.slice(
    source.indexOf("function FigmaBrowserActionsPanel"),
    source.indexOf("export interface AgentHarnessSettingsForm"),
  );
  const figmaWorkspaceSource = source.slice(
    source.indexOf("{isVisibleArchitectOutputWorkspace && !isPhaseMapFigmaWorkspace ? ("),
    source.indexOf("{isWorkCardRepair ? ("),
  );

  assert.doesNotMatch(browserActionsSource, /ProjectPlanningBlockerBanner|projectPlanningModel\.reason/);
  assert.doesNotMatch(figmaWorkspaceSource, /ProjectPlanningBlockerBanner/);
});

test("Project Planning blocker banner has compact warning styling and rail source keeps single authority", () => {
  const stylesSource = fs.readFileSync(stylesSourcePath, "utf8");
  const railSource = fs.readFileSync(projectLifecycleRailSourcePath, "utf8");

  assert.match(stylesSource, /\.project-planning-blocker-banner\s*\{/);
  assert.match(stylesSource, /background:\s*#fef3c7/);
  assert.match(stylesSource, /border:\s*1px solid #f59e0b/);
  assert.match(stylesSource, /\.project-planning-blocker-evidence li\s*\{[\s\S]*font-family:\s*ui-monospace/);
  assert.match(railSource, /projectPlanningStatus:\s*ProjectLifecycleRailStatus/);
  assert.doesNotMatch(
    railSource,
    /deriveProjectPlanningRailStatus|projectPlanningContextFromSummaries|projectPlanningTargets|function bundleState|function hasSourceRevision|function defaultInterviewTarget|function projectSlugFromInterview|analyzeProjectIntakeCorpus/,
  );
});
