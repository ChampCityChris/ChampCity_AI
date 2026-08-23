const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..", "..");

require.extensions[".ts"] = transpileTypeScriptModule;
require.extensions[".tsx"] = transpileTypeScriptModule;

const {
  AgentHarnessSettingsWorkspace,
  agentHarnessSettingsFormFromStatus,
  buildAgentHarnessSettingsInput,
  openSettingsNavigationState,
  returnFromSettingsNavigationState,
} = require(path.join(root, "src", "renderer", "app", "App.tsx"));
const {
  FigmaSidebar,
} = require(path.join(root, "src", "renderer", "app", "figma", "FigmaSidebar.tsx"));

test("left rail renders app-level Settings while Theme remains outside Settings", () => {
  const markup = renderToStaticMarkup(React.createElement(FigmaSidebar, {
    activeWorkspaceId: "settings",
    currentModel: {
      executionContext: {
        phase: { state: "none", dependsOn: [], reason: "No active phase." },
        workCard: { state: "none", dispositionOrState: "None", reason: "No active Work Card." },
      },
    },
    isChoosing: false,
    onChooseProject: () => undefined,
    onClearProject: () => undefined,
    onOpenSettings: () => undefined,
    onThemeChange: () => undefined,
    projectName: "Example Project",
    themeMode: "dark",
    workspace: { ok: true, workspaceRoot: "Example" },
  }));

  assert.match(markup, /aria-label="Settings"/);
  assert.match(markup, /aria-current="page"/);
  assert.match(markup, />Settings<\/button>/);
  assert.match(markup, /aria-label="Theme"/);
  assert.doesNotMatch(markup, /allowed[-_ ]roots|allowedRoots|project selector/i);
});

test("Settings navigation preserves workflow position across open and return", () => {
  const opened = openSettingsNavigationState("work-card-building-review", "project-intake-capture");
  assert.equal(opened.activeWorkspaceId, "settings");
  assert.equal(opened.priorWorkflowWorkspaceId, "work-card-building-review");

  const reopened = openSettingsNavigationState("settings", "work-card-building-review");
  assert.equal(reopened.activeWorkspaceId, "settings");
  assert.equal(reopened.priorWorkflowWorkspaceId, "work-card-building-review");
  assert.equal(returnFromSettingsNavigationState(reopened.priorWorkflowWorkspaceId), "work-card-building-review");
});

test("Settings workspace renders persistent controls, lifecycle controls, OAuth status, and failure projection", () => {
  const status = sampleAgentHarnessStatus({
    state: "failed",
    enabled: false,
    host: "127.0.0.1",
    configuredPort: 6173,
    publicBaseUrl: "https://connector.example.test/champcity",
    publicBaseUrlConfigured: true,
    oauthConfigured: true,
    localAuthenticationMode: "oauth-required",
    filesReadTransportAuthorized: false,
    filesWriteTransportAuthorized: false,
    registeredClientCount: 2,
    activeOAuthTokenCount: 0,
    activeFilesReadAuthorizationCount: 0,
    activeFilesWriteAuthorizationCount: 0,
    publicToolNames: ["repo_toolbox", "git_toolbox"],
    lastError: "Port 6173 is unavailable",
  });

  const markup = renderToStaticMarkup(React.createElement(AgentHarnessSettingsWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: null,
    onImportLegacyOAuthClients: () => undefined,
    onRefresh: () => undefined,
    onRestart: () => undefined,
    onReturn: () => undefined,
    onSaveConfiguration: () => undefined,
    onStart: () => undefined,
    onStop: () => undefined,
    savePending: false,
    selectedProjectName: "Settings Project",
    status,
  }));

  assert.match(markup, /Agent Harness configuration/);
  assert.match(markup, /Start Agent Harness automatically/);
  assert.match(markup, /value="127.0.0.1"/);
  assert.match(markup, /value="6173"/);
  assert.match(markup, /https:\/\/connector\.example\.test\/champcity/);
  assert.match(markup, />OAuth required<\/option>/);
  assert.match(markup, />Start<\/button>/);
  assert.match(markup, />Stop<\/button>/);
  assert.match(markup, />Restart<\/button>/);
  assert.match(markup, /Port 6173 is unavailable/);
  assert.match(markup, /Registered Clients/);
  assert.match(markup, /Import Legacy OAuth Clients/);
  assert.match(markup, /files\.read Transport/);
  assert.match(markup, /files\.write Transport/);
  assert.match(markup, /repo_toolbox/);
  assert.doesNotMatch(markup, /allowed[-_ ]roots|allowedRoots|Choose Harness Project|Server Dashboard|ChampCity_GPT/i);
});

test("Settings form model normalizes persisted configuration input", () => {
  const form = agentHarnessSettingsFormFromStatus(sampleAgentHarnessStatus({
    enabled: true,
    host: "127.0.0.1",
    configuredPort: 0,
    publicBaseUrl: null,
    localAuthenticationMode: "local-unauthenticated",
  }));
  assert.deepEqual(form, {
    enabled: true,
    host: "127.0.0.1",
    port: "0",
    publicBaseUrl: "",
    localAuthenticationMode: "local-unauthenticated",
  });

  assert.deepEqual(buildAgentHarnessSettingsInput({
    enabled: false,
    host: " 127.0.0.1 ",
    port: "",
    publicBaseUrl: " ",
    localAuthenticationMode: "oauth-required",
  }), {
    enabled: false,
    host: "127.0.0.1",
    port: "0",
    publicBaseUrl: null,
    localAuthenticationMode: "oauth-required",
  });
});

test("preload exposes Settings writes through the constrained Agent Harness IPC API", () => {
  const preloadSource = fs.readFileSync(path.join(root, "src", "preload", "index.ts"), "utf8");
  const mainSource = fs.readFileSync(path.join(root, "src", "main", "main.ts"), "utf8");

  assert.match(preloadSource, /saveAgentHarnessSettings/);
  assert.match(preloadSource, /agentHarness:saveSettings/);
  assert.match(preloadSource, /importLegacyOAuthClients/);
  assert.match(preloadSource, /agentHarness:importLegacyOAuthClients/);
  assert.match(mainSource, /ipcMain\.handle\("agentHarness:saveSettings"/);
  assert.match(mainSource, /ipcMain\.handle\("agentHarness:importLegacyOAuthClients"/);
  assert.match(mainSource, /dialog\.showOpenDialog/);
  assert.doesNotMatch(preloadSource, /fs\.|writeFile|agent-harness\/settings/i);
  assert.doesNotMatch(preloadSource, /showOpenDialog|readFile|oauth-clients|oauth-tokens|oauth-admin/i);
});

function sampleAgentHarnessStatus(overrides) {
  const publicToolNames = overrides.publicToolNames ?? [];
  return {
    state: "running",
    enabled: true,
    host: "127.0.0.1",
    configuredPort: 0,
    port: null,
    healthEndpoint: null,
    mcpEndpoint: null,
    publicBaseUrl: null,
    publicBaseUrlConfigured: false,
    oauthConfigured: true,
    localAuthenticationMode: "oauth-required",
    filesReadTransportAuthorized: false,
    filesWriteTransportAuthorized: false,
    registeredClientCount: 0,
    activeOAuthTokenCount: 0,
    activeFilesReadAuthorizationCount: 0,
    activeFilesWriteAuthorizationCount: 0,
    publicToolCount: publicToolNames.length,
    publicToolNames,
    activeWorkspaceId: "settings_project",
    expectedWorkspaceId: "settings_project",
    selectedProjectRootSummary: "Settings_Project",
    routingState: "matched",
    lastError: null,
    recentActivity: [],
    ...overrides,
  };
}

function transpileTypeScriptModule(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
}
