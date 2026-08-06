const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { FigmaAppStrip } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaAppStrip.tsx");
const { FigmaBrowserPanel } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaBrowserPanel.tsx");
const { FigmaSidebar } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaSidebar.tsx");
const { NestedWorkflowRail } = loader.loadRendererSourceModule("src/renderer/app/NestedWorkflowRail.tsx");

const repoRoot = path.join(__dirname, "..", "..");

test("Figma application strip renders the bundle titlebar without project or window-light chrome", () => {
  const markup = renderToStaticMarkup(
    React.createElement(FigmaAppStrip, { projectName: "OperatorProject" }),
  );

  assert.match(markup, /figma-app-strip/);
  assert.match(markup, /ChampCity AI/);
  assert.doesNotMatch(markup, /OperatorProject/);
  assert.doesNotMatch(markup, /figma-window-lights/);
  assert.doesNotMatch(markup, /Revisionary/);
  assert.doesNotMatch(markup, /MVP-01/);
});

test("updated Figma navigation renders nested production phase and Work Card rows", () => {
  const markup = renderToStaticMarkup(
    React.createElement(NestedWorkflowRail, {
      activeWorkspaceId: "work-card-report-review",
      architectInterviewStatus: "Completed",
      executionContext: {
        phase: {
          state: "active",
          phaseId: "phase-08",
          title: "Desktop Application",
          order: 8,
          totalPhaseCount: 8,
          purpose: "Complete the governed desktop workflow.",
          dependsOn: ["phase-07"],
          loopStep: "Work Cards",
          reason: "Current phase resolved.",
        },
        workCard: {
          state: "active",
          workCardId: "WC45",
          title: "Literal Figma UI Redesign Integration",
          loopStep: "Review & Validation",
          dispositionOrState: "In Progress",
          reason: "Current Work Card resolved.",
        },
      },
      onWorkspaceChange: () => undefined,
      projectIntakeStatus: "Completed",
      projectRailStatuses: {
        "project-intake-capture": "Completed",
        "architect-interview": "Completed",
        "project-planning-review": "Completed",
        "project-phase-map": "Completed",
        "phase-interview": "In Progress",
        "project-validation": "Not Ready",
        "project-close": "Open",
      },
      requiredWorkspaceId: "work-card-report-review",
    }),
  );

  assert.match(markup, /aria-label="Project pipeline"/);
  assert.match(markup, /aria-label="Phase loop"/);
  assert.match(markup, /aria-label="Work Card loop"/);
  assert.match(markup, /figma-phase-loop-bar/);
  assert.match(markup, /figma-work-card-loop-bar/);
  assert.match(markup, /figma-stage-connector/);
  assert.match(markup, /figma-sub-connector/);
  assert.match(markup, /Project Intake/);
  assert.match(markup, /Architect Interview/);
  assert.match(markup, /Project Planning/);
  assert.match(markup, /Phase Map/);
  assert.match(markup, /Project Validation/);
  assert.match(markup, /Project Close/);
  assert.match(markup, /Work Card Map/);
  assert.match(markup, /Review &amp; Validation/);
  assert.match(markup, /Phase Loop/);
  assert.match(markup, /Repair/);
  assert.match(markup, /phase-08/);
  assert.match(markup, /Phase 8 of 8/);
  assert.match(markup, /WC45/);
  assert.match(markup, /Review &amp; Validation in phase/);
  assert.match(markup, /figma-sub-pill active in-progress/);
  assert.match(markup, /figma-sub-pill repair pending/);
  assert.match(markup, />Completed</);
  assert.match(markup, />In Progress</);
  assert.match(markup, />Not Ready</);
});

test("Figma browser chrome hosts the production attachment surface and contains no fake ChatGPT conversation", () => {
  const markup = renderToStaticMarkup(
    React.createElement(FigmaBrowserPanel, {
      hostRef: { current: null },
      onReload: () => undefined,
      onRetry: () => undefined,
      retryVisible: false,
      statusLabel: "ChatGPT ready",
    }),
  );

  assert.match(markup, /figma-browser-panel/);
  assert.match(markup, /architect-browser-host figma-browser-host/);
  assert.match(markup, /chatgpt\.com/);
  assert.match(markup, /ChatGPT ready/);
  assert.doesNotMatch(markup, /Load context for current work card/);
  assert.doesNotMatch(markup, /Ready when you are/);
  assert.doesNotMatch(markup, /Revisionary/);
});

test("updated Figma side panel renders real project and execution context with persisted theme controls", () => {
  const markup = renderToStaticMarkup(
    React.createElement(FigmaSidebar, {
      currentModel: {
        activeWorkspaceId: "work-card-report-review",
        level: "work-card",
        stage: "Review",
        railStatus: "In Progress",
        currentPhaseId: "phase-08",
        currentWorkCardId: "WC45-REPAIR01",
        executionContext: {
          phase: {
            state: "active",
            phaseId: "phase-08",
            title: "Renderer Integration",
            order: 8,
            totalPhaseCount: 8,
            purpose: "Integrate the updated design.",
            dependsOn: [],
            loopStep: "Work Cards",
            reason: "Current phase resolved.",
          },
          workCard: {
            state: "active",
            workCardId: "WC45-REPAIR01",
            title: "Updated Figma UI Design Source Integration",
            loopStep: "Review & Validation",
            dispositionOrState: "In Progress",
            reason: "Current Work Card resolved.",
          },
        },
        currentTarget: "WC45-REPAIR01",
        sourceEvidence: [],
        requiredAction: "Review implementation.",
        expectedOutput: "Updated renderer.",
        eligibility: "Ready",
        expectedNextState: "Operator validation",
      },
      isChoosing: false,
      onChooseProject: () => undefined,
      onClearProject: () => undefined,
      onThemeChange: () => undefined,
      projectName: "OperatorProject",
      themeMode: "light",
      workspace: {
        ok: true,
        workspaceRoot: "<PROJECT_REPO>",
      },
    }),
  );

  assert.match(markup, /figma-sidebar/);
  assert.match(markup, /Select Project/);
  assert.match(markup, /Choose Project/);
  assert.match(markup, /Clear Project/);
  assert.match(markup, /Current Project/);
  assert.match(markup, /OperatorProject/);
  assert.doesNotMatch(markup, /&lt;PROJECT_REPO&gt;/);
  assert.match(markup, /Current Phase/);
  assert.match(markup, /phase-08/);
  assert.match(markup, /class="figma-sidebar-muted">Renderer Integration/);
  assert.match(markup, /class="figma-sidebar-mono-value">Phase 8 of 8/);
  assert.match(markup, /Renderer Integration/);
  assert.match(markup, /Phase 8 of 8/);
  assert.match(markup, /Work Cards/);
  assert.match(markup, /Current Work Card/);
  assert.match(markup, /WC45-REPAIR01/);
  assert.match(markup, /class="figma-sidebar-muted">Updated Figma UI Design Source Integration/);
  assert.match(markup, /class="figma-sidebar-mono-value">Review &amp; Validation in phase/);
  assert.match(markup, /Updated Figma UI Design Source Integration/);
  assert.match(markup, /Review &amp; Validation in phase/);
  assert.match(markup, /aria-label="Theme"/);
  assert.match(markup, /aria-pressed="true" class="active" type="button">Light/);
  assert.doesNotMatch(markup, /Revisionary/);
  assert.doesNotMatch(markup, /MVP-01/);
  assert.doesNotMatch(markup, /PHASE_LIST/);
});

test("production App binds the Figma shell to existing document, browser, Codex, and validation APIs", () => {
  const appSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  const stylesSource = fs.readFileSync(path.join(repoRoot, "src", "renderer", "styles.css"), "utf8");

  assert.match(appSource, /<FigmaAppStrip \/>/);
  assert.doesNotMatch(appSource, /<FigmaAppStrip projectName=/);
  assert.match(appSource, /<NestedWorkflowRail/);
  assert.match(appSource, /executionContext=\{currentModel\?\.executionContext\}/);
  assert.match(appSource, /<FigmaSidebar/);
  assert.match(appSource, /figmaThemePreferenceKey = "champcity:figma-theme"/);
  assert.match(appSource, /window\.localStorage\.getItem\(figmaThemePreferenceKey\)/);
  assert.match(appSource, /document\.documentElement\.classList\.toggle\("dark", isDark\)/);
  assert.match(appSource, /window\.localStorage\.setItem\(figmaThemePreferenceKey, themeMode\)/);
  assert.match(appSource, /window\.champcity\.listDocuments\(\)/);
  assert.match(appSource, /window\.champcity\.readDocument\(logicalDocumentId\)/);
  assert.match(appSource, /window\.champcity\.startCodexImplementerExecution\(\)/);
  assert.match(appSource, /window\.champcity\.cancelCodexImplementerExecution\(\)/);
  assert.match(appSource, /applyOperatorValidationDecision/);
  assert.match(appSource, /window\.champcity\.showArchitectBrowser/);
  assert.match(appSource, /window\.champcity\.hideArchitectBrowser/);
  assert.match(appSource, /window\.champcity\.setArchitectBrowserBounds/);
  assert.match(appSource, /workspaceHeadingLabel/);
  assert.match(appSource, /Project Intake Questionnaire/);
  assert.match(appSource, /<FigmaProjectIntakeDispositionPanel/);
  assert.match(appSource, /function FigmaProjectIntakeDispositionPanel/);
  assert.match(appSource, /className="figma-intake-full"/);
  assert.match(appSource, /className="figma-intake-project-type"/);
  assert.match(appSource, /Desired Outcome - What should the finished product allow the user or Operator to do\?/);
  assert.match(appSource, /Constraints \/ Non-Negotiables/);
  assert.match(appSource, /source code or project planning documents/);
  assert.doesNotMatch(appSource, /renderDispositionControls\("figma-disposition-controls"\)/);
  assert.match(stylesSource, /grid-template-columns:\s*185px minmax\(0, 1fr\)/);
  assert.match(stylesSource, /@custom-variant dark \(&:is\(\.dark \*\)\);/);
  assert.match(stylesSource, /@theme inline\s*\{[\s\S]*--color-card:\s*var\(--card\)/);
  assert.match(stylesSource, /html\s*\{[\s\S]*font-size:\s*var\(--font-size\)/);
  assert.match(stylesSource, /h1\s*\{[\s\S]*font-size:\s*var\(--text-2xl\)/);
  assert.match(stylesSource, /--figma-shell-muted:\s*#7f93b3/);
  assert.match(stylesSource, /--figma-shell-brand:\s*#8fb2d6/);
  assert.match(stylesSource, /\.figma-app-brand strong\s*\{[\s\S]*color:\s*var\(--figma-shell-brand\)/);
  assert.match(stylesSource, /\.figma-app-brand strong\s*\{[\s\S]*font-size:\s*16px/);
  assert.match(stylesSource, /\.figma-pipeline-step strong\s*\{[\s\S]*font-size:\s*15px/);
  assert.match(stylesSource, /\.figma-sub-pill > span:last-child\s*\{[\s\S]*font-size:\s*13px/);
  assert.match(stylesSource, /\.figma-sidebar-label,[\s\S]*letter-spacing:\s*0\.1em/);
  assert.match(stylesSource, /\.figma-sidebar-label,[\s\S]*font-size:\s*12px/);
  assert.match(stylesSource, /\.figma-sidebar-primary\s*\{[\s\S]*font-size:\s*16px/);
  assert.match(stylesSource, /\.figma-sidebar-muted\s*\{[\s\S]*color:\s*var\(--figma-shell-muted\) !important/);
  assert.match(stylesSource, /\.figma-sidebar-mono-value\s*\{[\s\S]*font-family:\s*"Cascadia Mono"/);
  assert.match(stylesSource, /\.figma-sidebar-mono-value\s*\{[\s\S]*font-size:\s*14px !important/);
  assert.match(stylesSource, /--nav-sidebar:\s*#d9dbe3/);
  assert.match(stylesSource, /\.dark\s*\{[\s\S]*--nav-sidebar:\s*#0d0f16/);
  assert.match(stylesSource, /\.figma-sidebar\s*\{[\s\S]*width:\s*185px/);
  assert.match(stylesSource, /\.figma-theme-toggle/);
  assert.match(stylesSource, /\.figma-pipeline-nav/);
  assert.match(stylesSource, /\.figma-context-loop-bar/);
  assert.match(stylesSource, /\.figma-work-card-loop-bar/);
  assert.match(stylesSource, /\.figma-browser-panel/);
  assert.match(stylesSource, /\.figma-intake-workspace \.figma-intake-full,[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(stylesSource, /\.figma-intake-workspace \.figma-intake-project-type\s*\{[\s\S]*align-content:\s*start/);
  assert.match(stylesSource, /\.figma-intake-workspace \.intake-form \.checkbox-row span\s*\{[\s\S]*text-transform:\s*none/);
  assert.match(stylesSource, /\.figma-disposition-panel dl\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(stylesSource, /\.figma-phase-map-workspace\s*\{[\s\S]*padding:\s*16px/);
  assert.match(stylesSource, /\.figma-phase-map-item\.active\s*\{[\s\S]*border-color:\s*color-mix\(in srgb, var\(--primary\) 52%, var\(--border\)\)/);
  assert.match(stylesSource, /\.figma-phase-map-work-card-count/);
});

test("updated Figma design does not add unused bundle dependencies or assets to production", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const productionSource = [
    "src/renderer/app/App.tsx",
    "src/renderer/app/NestedWorkflowRail.tsx",
    "src/renderer/app/figma/FigmaAppStrip.tsx",
    "src/renderer/app/figma/FigmaBrowserPanel.tsx",
    "src/renderer/app/figma/FigmaSidebar.tsx",
  ].map((relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8")).join("\n");

  for (const dependency of ["@radix-ui/react-dialog", "@mui/material", "react-router-dom"]) {
    assert.equal(packageJson.dependencies?.[dependency], undefined);
    assert.equal(packageJson.devDependencies?.[dependency], undefined);
  }
  assert.doesNotMatch(productionSource, /ChampCityAI\.pdf/);
  assert.doesNotMatch(productionSource, /image-?1?\.png/);
  assert.doesNotMatch(productionSource, /components\/ui/);
  assert.doesNotMatch(productionSource, /DOC_ARCHITECT|DOC_PLANNING|DOC_PHASE_PLANNING|DOC_WC_PLANNING/);
});
