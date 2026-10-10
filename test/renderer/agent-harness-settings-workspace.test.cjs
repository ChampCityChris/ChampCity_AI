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
  ServiceHostRemediation,
  agentHarnessSettingsFormFromStatus,
  backgroundAgentLifecycleLabel,
  buildAgentHarnessSettingsInput,
} = require(path.join(root, "src", "renderer", "app", "ApplicationSettingsWorkspace.tsx"));
const { App } = require(path.join(root, "src", "renderer", "app", "App.tsx"));
const { ApplicationSettingsController } = require(path.join(root, "src", "renderer", "app", "ApplicationSettingsController.tsx"));
const {
  FigmaSidebar,
} = require(path.join(root, "src", "renderer", "app", "figma", "FigmaSidebar.tsx"));
const {
  shouldPollDevelopmentCodexExecution,
  shouldPollIssueCodexExecution,
  startAgentHarnessSettingsPolling,
} = require(path.join(root, "src", "renderer", "app", "rendererPollingPolicy.ts"));

test("renderer polling is limited to Settings and active Codex execution surfaces", () => {
  let refreshes = 0;
  let scheduledCallback;
  let clearedHandle;
  const stop = startAgentHarnessSettingsPolling({
    refresh: () => { refreshes += 1; },
    setInterval: (callback, milliseconds) => {
      assert.equal(milliseconds, 5_000);
      scheduledCallback = callback;
      return 41;
    },
    clearInterval: (handle) => { clearedHandle = handle; },
  });

  assert.equal(refreshes, 1);
  scheduledCallback();
  assert.equal(refreshes, 2);
  stop();
  assert.equal(clearedHandle, 41);
  scheduledCallback();
  assert.equal(refreshes, 2);
  assert.equal(shouldPollDevelopmentCodexExecution({
    isDevelopmentForeground: true,
    workspaceAvailable: true,
    activeWorkspaceId: "architect-interview",
  }), false);
  assert.equal(shouldPollDevelopmentCodexExecution({
    isDevelopmentForeground: true,
    workspaceAvailable: true,
    activeWorkspaceId: "work-card-building-review",
  }), true);
  assert.equal(shouldPollIssueCodexExecution({
    isIssueCodexExecutionForeground: false,
    workspaceAvailable: true,
    hasCurrentIssue: true,
    hasSelectedFixCard: true,
    hasExecutionContext: true,
  }), false);
  assert.equal(shouldPollIssueCodexExecution({
    isIssueCodexExecutionForeground: true,
    workspaceAvailable: true,
    hasCurrentIssue: true,
    hasSelectedFixCard: true,
    hasExecutionContext: true,
  }), true);
});

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

// Run the App's real callbacks with persistent React hook storage; effects are
// suppressed so this bounded navigation proof does not start runtime polling.
function navigationHarness(seed, getWorkflow) {
  const source = fs.readFileSync(path.join(root, "src/renderer/app/App.tsx"), "utf8");
  const names = [...source.matchAll(/const \[([^,]+),[^\]]+\] = useState/g)].map(match => match[1]);
  const values = [], refs = [];
  const original = Object.fromEntries(["useState", "useRef", "useEffect", "useMemo", "useCallback", "useReducer"].map(key => [key, React[key]]));
  global.window = { localStorage: { getItem: () => null }, champcity: { getWorkflow, selectStructuredWorkflowAuthority: async () => undefined } };
  function render() {
    let stateIndex = 0, refIndex = 0;
    React.useState = initial => {
      const index = stateIndex++, name = names[index];
      if (!(index in values)) values[index] = name in seed ? seed[name] : typeof initial === "function" ? initial() : initial;
      return [values[index], value => { values[index] = typeof value === "function" ? value(values[index]) : value; }];
    };
    React.useRef = initial => refs[refIndex++] ??= { current: initial };
    React.useEffect = () => {};
    React.useMemo = callback => callback();
    React.useCallback = callback => callback;
    React.useReducer = (_reducer, initial) => [initial, () => {}];
    try { return App(); } finally { Object.assign(React, original); }
  }
  function find(node, type) {
    if (!node || typeof node !== "object") return null;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = find(child, type); if (found) return found;
    }
    return null;
  }
  return { render, find, state: name => values[names.indexOf(name)], set: (name, value) => { values[names.indexOf(name)] = value; } };
}

for (const foreground of ["workflow-instance", "work-intake", "workflow-hub", "workflow-type", "source-control"]) {
  test(`App Settings restores exact ${foreground} foreground without reopening Project`, async () => {
    const workflow = { workflowId: "exact-workflow", workflowType: "feature-capability" };
    const seed = {
      view: foreground,
      workflowId: workflow.workflowId, workflowType: workflow.workflowType,
      workIntakeId: "intake-exact", workflow,
      workspace: { ok: true, workspaceRoot: "fixture" },
      project: { projectId: "project-exact" },
    };
    const calls = [];
    const harness = navigationHarness(seed, async id => { calls.push(id); return { workflow }; });
    let tree = harness.render();
    tree = harness.render();
    harness.find(tree, FigmaSidebar).props.onOpenSettings();
    tree = harness.render();
    assert.equal(harness.state("workflow"), workflow);
    assert.equal(harness.state("workflowId"), workflow.workflowId);
    // Clicking Settings again must not replace the saved target.
    harness.find(tree, FigmaSidebar).props.onOpenSettings();
    await harness.find(tree, ApplicationSettingsController).props.onReturn();
    harness.render();
    for (const name of ["view", "workflowId", "workflowType", "workIntakeId", "workflow", "project", "workspace"])
      assert.equal(harness.state(name), seed[name], name);
    assert.deepEqual(calls, seed.workflowId ? [workflow.workflowId] : []);
    delete global.window;
  });
}

test("App Settings Workflows escape preserves Project and cancels stale Return", async () => {
  let resolve;
  const workflow = { workflowId: "exact", workflowType: "feature" };
  const workspace = { ok: true, workspaceRoot: "fixture" };
  const harness = navigationHarness({ view: "workflow-instance", workspace, workflowId: "exact", workflow },
    () => new Promise(done => { resolve = done; }));
  harness.find(harness.render(), FigmaSidebar).props.onOpenSettings();
  const tree = harness.render();
  const sidebar = harness.find(tree, FigmaSidebar);
  assert.match(renderToStaticMarkup(sidebar), />Workflows<\/button>/);
  const returning = harness.find(tree, ApplicationSettingsController).props.onReturn();
  sidebar.props.onReturnToWorkflowHub();
  resolve({ workflow }); await returning;
  harness.render();
  assert.equal(harness.state("view"), "workflow-hub");
  assert.equal(harness.state("workspace"), workspace);
  delete global.window;
});

test("App Settings unavailable exact Workflow falls back with bounded error", async () => {
  const harness = navigationHarness({ view: "workflow-instance", workspace: { ok: true, workspaceRoot: "fixture" }, workflowId: "deleted" },
    async () => { throw Error("unavailable"); });
  harness.find(harness.render(), FigmaSidebar).props.onOpenSettings();
  await harness.find(harness.render(), ApplicationSettingsController).props.onReturn();
  harness.render();
  assert.equal(harness.state("view"), "workflow-hub");
  assert.match(harness.state("workflowError"), /previous Workflow is no longer available/);
  delete global.window;
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
    lifecycleSavePending: false,
    lifecycleStatus: {
      state: "restart-required",
      reason: "build-generation-mismatch",
      stateChangedAt: new Date(0).toISOString(),
      powerEpoch: 4,
      serviceHostProcessId: 4100,
      workerProcessId: 4200,
      workerRecoveryState: "idle",
      consecutiveHeartbeatMisses: 0,
      runtimeBuildIdentity: `sha256:${"a".repeat(64)}`,
      expectedBuildIdentity: `sha256:${"b".repeat(64)}`,
      restartRequired: true,
      lastControlledRestart: null,
      launchAtLogin: true,
      loginItemRegistered: true,
      executableWillLaunchAtLogin: true,
      startupRegistrationSupported: true,
      startupRegistrationScope: "machine",
      trayPresent: true,
      explicitlyStopped: false,
      explicitStopState: "none",
      lastError: null,
    },
    onExitBackgroundAgent: () => undefined,
    onImportLegacyOAuthClients: () => undefined,
    onRegisterWorkspace: () => undefined,
    onRefresh: () => undefined,
    onRestart: () => undefined,
    onRestartServiceHost: () => undefined,
    onReturn: () => undefined,
    onSaveConfiguration: () => undefined,
    onSaveServiceHostLifecycleSettings: () => undefined,
    onStartBackgroundAgent: () => undefined,
    onStart: () => undefined,
    onStop: () => undefined,
    onUnregisterWorkspace: () => undefined,
    savePending: false,
    selectedProjectName: "Settings Project",
    status,
    workspaceRegistry: {
      schemaVersion: 1,
      state: "ready",
      error: null,
      workspaces: [{
        workspaceId: "settings_project",
        repositoryName: "Settings Project",
        gitBacked: true,
        availability: "available",
        validationError: null,
      }],
    },
  }));

  assert.match(markup, /Agent Harness configuration/);
  assert.match(markup, /Start Background Agent for my Windows user at sign-in/);
  assert.match(markup, /Start MCP Runtime when Background Agent starts/);
  assert.match(markup, /Service Host PID/);
  assert.match(markup, /4100/);
  assert.match(markup, /Worker PID/);
  assert.match(markup, /4200/);
  assert.match(markup, /Power Epoch/);
  assert.match(markup, />4</);
  assert.match(markup, /build-generation-mismatch/);
  assert.match(markup, /class="service-host-remediation-message"/);
  assert.match(markup, /class="service-host-remediation-actions"><button[^>]*>Restart Background Agent<\/button>/);
  assert.match(markup, />Exit Background Agent<\/button>/);
  for (const action of ["Start", "Stop", "Restart"]) assert.match(markup, new RegExp(`${action} MCP Runtime`));
  assert.match(markup, /Login Registration/);
  assert.match(markup, /Machine managed for everyone/);
  assert.match(markup, /Exact trigger detected/);
  assert.doesNotMatch(markup, /Start Agent Harness automatically/);
  assert.match(markup, /value="127.0.0.1"/);
  assert.match(markup, /value="6173"/);
  assert.match(markup, /https:\/\/connector\.example\.test\/champcity/);
  assert.match(markup, />OAuth required<\/option>/);
  assert.match(markup, />Start MCP Runtime<\/button>/);
  assert.match(markup, />Stop MCP Runtime<\/button>/);
  assert.match(markup, />Restart MCP Runtime<\/button>/);
  assert.match(markup, /Port 6173 is unavailable/);
  assert.match(markup, /Registered Clients/);
  assert.match(markup, /Import Legacy OAuth Clients/);
  assert.match(markup, /Registered MCP Projects/);
  assert.match(markup, /Add Project/);
  assert.match(markup, /settings_project/);
  assert.match(markup, />Remove<\/button>/);
  assert.doesNotMatch(markup, /Active Project Routing/);
  assert.match(markup, /files\.read Transport/);
  assert.match(markup, /files\.write Transport/);
  assert.match(markup, /repo_toolbox/);
  assert.doesNotMatch(markup, /allowed[-_ ]roots|allowedRoots|Choose Harness Project|Server Dashboard|ChampCity_GPT/i);
});

test("Settings presents intentional absence as Stopped by user with an explicit Background Agent start", () => {
  const lifecycleStatus = {
    state: "stopped-by-user",
    explicitlyStopped: true,
    explicitStopState: "requested",
    launchAtLogin: true,
    startupRegistrationSupported: true,
    serviceHostProcessId: null,
  };
  const markup = renderToStaticMarkup(React.createElement(AgentHarnessSettingsWorkspace, {
    actionError: "",
    actionFeedback: "",
    actionPending: null,
    lifecycleSavePending: false,
    lifecycleStatus,
    onExitBackgroundAgent: () => undefined,
    onImportLegacyOAuthClients: () => undefined,
    onRegisterWorkspace: () => undefined,
    onRefresh: () => undefined,
    onRestart: () => undefined,
    onRestartServiceHost: () => undefined,
    onReturn: () => undefined,
    onSaveConfiguration: () => undefined,
    onSaveServiceHostLifecycleSettings: () => undefined,
    onStart: () => undefined,
    onStartBackgroundAgent: () => undefined,
    onStop: () => undefined,
    onUnregisterWorkspace: () => undefined,
    savePending: false,
    selectedProjectName: "Settings Project",
    status: null,
    workspaceRegistry: null,
  }));
  assert.equal(backgroundAgentLifecycleLabel(lifecycleStatus), "Stopped by user");
  assert.match(markup, />Stopped by user</);
  assert.match(markup, />Start Background Agent<\/button>/);
  assert.doesNotMatch(markup, />Exit Background Agent<\/button>/);
  assert.doesNotMatch(markup, /SERVICE_HOST_RECOVERY_FAILED/);
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
    trustedLocalGitRoots: "",
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
    trustedLocalGitRoots: [],
    enabled: false,
    host: "127.0.0.1",
    port: "0",
    publicBaseUrl: null,
    localAuthenticationMode: "oauth-required",
  });
  assert.deepEqual(buildAgentHarnessSettingsInput({ ...form, trustedLocalGitRoots: " root-one \n\n root-two " }).trustedLocalGitRoots, ["root-one", "root-two"]);
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
    workspaceRegistryState: "ready",
    workspaceRegistryError: null,
    registeredWorkspaceCount: 1,
    registeredWorkspaceIds: ["settings_project"],
    activeWorkspaceId: null,
    expectedWorkspaceId: null,
    selectedProjectRootSummary: null,
    routingState: "unavailable",
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


test("stale Service Host remediation separates explanation and controlled action, including busy and current states", () => {
  let restarts = 0;
  const props = { lifecycleStatus: { restartRequired: true }, isBusy: false, onRestartServiceHost: () => restarts++ };
  const element = ServiceHostRemediation(props);
  const [message, actions] = element.props.children;
  assert.equal(message.props.className, "service-host-remediation-message");
  assert.equal(actions.props.className, "service-host-remediation-actions");
  assert.equal(actions.props.children.type, "button");
  actions.props.children.props.onClick();
  assert.equal(restarts, 1);
  const busy = renderToStaticMarkup(React.createElement(ServiceHostRemediation, { ...props, isBusy: true }));
  assert.match(busy, /<button disabled="" type="button">Restart Background Agent/);
  assert.equal(ServiceHostRemediation({ ...props, lifecycleStatus: { restartRequired: false } }), null);
});

test("Settings preload methods invoke constrained channels and preserve bounded inputs", async () => {
  const vm = require("node:vm");
  const calls = [];
  let api;
  vm.runInNewContext(fs.readFileSync(path.join(root, "dist/preload/index.js"), "utf8"), {
    exports: {}, require: (id) => {
      assert.equal(id, "electron");
      return { contextBridge: { exposeInMainWorld: (_key, value) => { api = value; } }, ipcRenderer: { invoke: async (...args) => { calls.push(args); return "receipt"; } } };
    },
  });
  const entries = [
    ["refreshCodexConnections", "codexRuntime:refreshConnections", []],
    ["setCodexConnectionEnabled", "codexRuntime:setConnectionEnabled", ["approved", false]],
    ["saveAgentHarnessSettings", "agentHarness:saveSettings", [{ enabled: true }]],
    ["getAgentHarnessServiceHostLifecycleStatus", "agentHarness:serviceHostLifecycleStatus", []],
    ["startBackgroundAgent", "agentHarness:startBackgroundAgent", []],
    ["exitBackgroundAgent", "agentHarness:exitBackgroundAgent", []],
    ["restartAgentHarnessServiceHost", "agentHarness:restartServiceHost", []],
    ["saveAgentHarnessServiceHostLifecycleSettings", "agentHarness:saveServiceHostLifecycleSettings", [{ launchAtLogin: false }]],
    ["importLegacyOAuthClients", "agentHarness:importLegacyOAuthClients", []],
    ["listAgentHarnessRegisteredWorkspaces", "agentHarness:listRegisteredWorkspaces", []],
    ["chooseAndRegisterAgentHarnessWorkspace", "agentHarness:chooseAndRegisterWorkspace", []],
    ["unregisterAgentHarnessWorkspace", "agentHarness:unregisterWorkspace", ["fixture-project"]],
  ];
  for (const [method, channel, args] of entries) {
    assert.equal(await api[method](...args), "receipt");
    assert.deepEqual(calls.at(-1), [channel, ...args]);
  }
  assert.equal(calls.length, entries.length);
  for (const name of ["fs", "writeFile", "showOpenDialog", "readFile", "ipcRenderer"]) assert.equal(Object.hasOwn(api, name), false);
});

test("Codex Connections is a separate bounded outbound Settings panel", () => {
  const { CodexConnectionsView } = require(path.join(root, "src", "renderer", "app", "CodexConnectionsPanel.tsx"));
  const html = renderToStaticMarkup(React.createElement(CodexConnectionsView, {
    status: { connections: [{ name: "approved", enabled: true, requirement: "optional", status: "authentication-required", diagnostic: "Authentication required." }], blocker: null, requiredReady: true, optionalWarnings: 1 },
    busy: false, error: "", onRefresh() {}, onToggle() {},
  }));
  assert.match(html, /Codex Connections/);
  assert.match(html, /Refresh Status/);
  assert.match(html, /Disable/);
  assert.match(html, /authentication-required/);
  assert.match(html, /credentials are managed separately/);
  assert.doesNotMatch(html, /textarea|bearer_token|refresh_token|client_secret/);
});
