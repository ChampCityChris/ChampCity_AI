const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { FigmaAppStrip } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaAppStrip.tsx");
const { FigmaBrowserPanel } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaBrowserPanel.tsx");
const { FigmaSidebar } = loader.loadRendererSourceModule("src/renderer/app/figma/FigmaSidebar.tsx");
const { NestedWorkflowRail } = loader.loadRendererSourceModule("src/renderer/app/NestedWorkflowRail.tsx");

test("Figma application strip renders the bundle titlebar without project or window-light chrome", () => {
  const markup = renderToStaticMarkup(
    React.createElement(FigmaAppStrip, { projectName: "OperatorProject" }),
  );

  assert.match(markup, /figma-app-strip/);
  assert.match(markup, />ChampCity A\/I</);
  assert.match(markup, /src="\.\.\/branding\/champcity-mark\.svg"/);
  assert.doesNotMatch(markup, /Zap/);
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

test("top Phases rail stays In Progress while phase execution remains active", () => {
  const markup = renderToStaticMarkup(
    React.createElement(NestedWorkflowRail, {
      activeWorkspaceId: "phase-validation",
      architectInterviewStatus: "Completed",
      executionContext: {
        phase: {
          state: "active",
          phaseId: "phase-08",
          title: "Desktop Application",
          order: 8,
          totalPhaseCount: 8,
          purpose: "Complete the governed desktop workflow.",
          dependsOn: [],
          loopStep: "Phase Validation",
          reason: "Current phase resolved.",
        },
        workCard: {
          state: "none",
          reason: "No active Work Card.",
        },
      },
      onWorkspaceChange: () => undefined,
      projectIntakeStatus: "Completed",
      projectRailStatuses: {
        "project-intake-capture": "Completed",
        "architect-interview": "Completed",
        "project-planning-review": "Completed",
        "project-phase-map": "Completed",
        "phase-interview": "Completed",
        "project-validation": "Not Ready",
        "project-close": "Open",
      },
      requiredWorkspaceId: "phase-validation",
    }),
  );

  assert.match(markup, /05 Phases: In Progress\. Current required step\. Open workflow step\./);
  assert.doesNotMatch(markup, /05 Phases: Completed\. Current required step\. Open workflow step\./);
});

test("loop selected pill follows the viewed workspace rather than required state", () => {
  const markup = renderToStaticMarkup(
    React.createElement(NestedWorkflowRail, {
      activeWorkspaceId: "work-card-close",
      architectInterviewStatus: "Completed",
      executionContext: {
        phase: {
          state: "active",
          phaseId: "phase-08",
          title: "Desktop Application",
          order: 8,
          totalPhaseCount: 8,
          purpose: "Complete the governed desktop workflow.",
          dependsOn: [],
          loopStep: "Work Cards",
          reason: "Current phase resolved.",
        },
        workCard: {
          state: "active",
          workCardId: "WC46-REPAIR14",
          title: "Lifecycle Rail UI Polish",
          loopStep: "Review & Validation",
          dispositionOrState: "In Progress",
          reason: "Review is current.",
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

  assert.match(markup, /class="figma-sub-pill in-progress" data-status="in-progress"[^>]*><span[^>]*>[\s\S]*Review &amp; Validation/);
  assert.match(markup, /class="figma-sub-pill active pending" data-status="pending"[^>]*><span[^>]*>[\s\S]*Close \/ Next/);
  assert.doesNotMatch(markup, /class="figma-sub-pill active in-progress" data-status="in-progress"[^>]*><span[^>]*>[\s\S]*Review &amp; Validation/);
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
