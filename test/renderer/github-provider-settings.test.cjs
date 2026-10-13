const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");
const { GithubProviderStatusPanel } = loadRendererSourceModule("src/renderer/app/GithubProviderSettings.tsx");

test("GitHub Settings shows bounded auth/runtime/capability state and cancellable login", () => {
  const html = renderToStaticMarkup(React.createElement(GithubProviderStatusPanel, {
    status: { runtime: "connecting", authentication: "pending", version: "1.12.2", enabledToolsets: ["context", "repos", "issues", "pull_requests", "actions"], capabilityGeneration: 2, capabilities: [{ capabilityId: "github.release.create", availability: "unavailable" }], busy: true, recovery: "last-known-good", lastDiagnostic: "Using verified provider." },
    message: "", pending: false, onAction() {},
  }));
  assert.match(html, /Authentication Required/);
  assert.match(html, /Connecting/);
  assert.match(html, /1\.12\.2/);
  assert.match(html, /github\.release\.create: unavailable/);
  assert.match(html, /last verified runtime/);
  assert.match(html, /<button type="button">Disconnect GitHub/);
  assert.doesNotMatch(html, /inputSchema|Authorization:|ghp_|client.secret/);
});

test("typed preload executes only fixed GitHub IPC channels and forwards constrained reads", async () => {
  let api;
  const invocations = [];
  const electron = {
    contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } },
    ipcRenderer: { invoke: async (...args) => { invocations.push(args); return args[0].startsWith("repositoryHosting:") ? { ok: true, value: {} } : {}; } },
  };
  const source = fs.readFileSync(path.join(__dirname, "../../dist/preload/index.js"), "utf8");
  vm.runInNewContext(source, { exports: {}, require: (name) => { assert.equal(name, "electron"); return electron; } });
  await api.getGithubProviderStatus();
  await api.connectGithubProvider();
  await api.restartGithubProvider();
  await api.disconnectGithubProvider();
  await api.readGithubEvidence({ kind: "release", tag: "v1" });
  assert.deepEqual(invocations.map((entry) => entry[0]), ["githubProvider:status", "githubProvider:connect", "githubProvider:restart", "githubProvider:disconnect", "githubProvider:read"]);
  assert.deepEqual(invocations.at(-1)[1], { kind: "release", tag: "v1" });
  await api.getRepositoryHostingSettings();
  await api.saveRepositoryHostingSettings({ configurationId: "a".repeat(64), providers: [] });
  await api.getRepositoryHostingProviderStatus("forgejo-fixture");
  await api.saveRepositoryHostingCredential({ providerId: "forgejo-fixture", expectedConfigurationId: "a".repeat(64), token: "synthetic-fixture" });
  await api.removeRepositoryHostingCredential({ providerId: "forgejo-fixture", expectedConfigurationId: "a".repeat(64) });
  assert.deepEqual(invocations.slice(-5).map(entry => entry[0]), ["repositoryHosting:settings", "repositoryHosting:saveSettings", "repositoryHosting:providerStatus", "repositoryHosting:saveCredential", "repositoryHosting:removeCredential"]);
  electron.ipcRenderer.invoke = async () => ({ ok: false, error: { code: "stale-configuration" } });
  assert.equal((await api.saveRepositoryHostingSettings({})).error.code, "stale-configuration");
  assert.ok(!Object.keys(api).some((name) => /callGithubTool|invokeCapability|registerProvider/.test(name)));
});
const { ForgejoProviderSettings } = loadRendererSourceModule("src/renderer/app/ForgejoProviderSettings.tsx");

test("Forgejo Settings controls, canonical save, authentication and bounded errors", async () => {
  const originalState = React.useState, originalEffect = React.useEffect, originalWindow = global.window;
  const values = []; let index = 0, initialized = false, tree, savedInput, authInput, statusCalls = 0, failure;
  let settings = { configurationId: "a".repeat(64), providers: [] };
  const api = {
    getRepositoryHostingSettings: async () => ({ ok: true, value: settings }),
    saveRepositoryHostingSettings: async input => {
      if (failure) return { ok: false, error: { code: failure } };
      savedInput = input;
      settings = { configurationId: "b".repeat(64), providers: input.providers.map(provider => ({ ...provider, credentialReference: "synthetic-reference" })) };
      return { ok: true, value: settings };
    },
    saveRepositoryHostingCredential: async input => { authInput = input; return failure ? { ok: false, error: { code: failure } } : { ok: true, value: { stored: true } }; },
    getRepositoryHostingProviderStatus: async () => { statusCalls++; return { ok: true, value: { readiness: "ready", diagnostic: null, identity: { login: "fixture-user" } } }; },
  };
  global.window = { champcity: api };
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
  function render() {
    index = 0;
    React.useState = initial => { const slot = index++; if (!(slot in values)) values[slot] = typeof initial === "function" ? initial() : initial; return [values[slot], value => { values[slot] = typeof value === "function" ? value(values[slot]) : value; }]; };
    React.useEffect = callback => { if (!initialized) callback(); };
    try { tree = ForgejoProviderSettings(); initialized = true; } finally { React.useState = originalState; React.useEffect = originalEffect; }
    return tree;
  }
  function nodes(node) { return !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(child => nodes(child))]; }
  const control = label => { const parent = nodes(tree).find(node => node.type === "label" && nodes(node).some(child => child.type === "span" && child.props.children === label)); return nodes(parent).find(node => ["input", "select"].includes(node.type)); };
  const button = text => nodes(tree).find(node => node.type === "button" && node.props.children === text);
  const change = (label, value) => { control(label).props.onChange({ target: { value } }); render(); };
  const submit = async () => { nodes(tree).find(node => node.type === "form").props.onSubmit({ preventDefault() {} }); render(); await settle(); };
  const markup = () => renderToStaticMarkup(tree);
  try {
    render(); await settle();
    assert.equal(control("Forgejo API token").props.type, "password");
    assert.equal(control("Forgejo API token").props.disabled, true);
    assert.match(markup(), /Save the connection before adding authentication/);
    assert.equal(button("Save connection").props.type, "submit");
    for (const label of ["Provider ID", "Forgejo API base URL", "Namespace", "Namespace type", "Preferred Git transport", "Expected SSH host", "Expected SSH port", "HTTP API policy", "HTTP Git policy"]) assert.ok(control(label), label);
    const css = fs.readFileSync(path.join(__dirname, "../../src/renderer/styles.css"), "utf8");
    assert.match(markup(), /repository-hosting-form/);
    assert.match(markup(), /repository-hosting-field/);
    assert.match(css, /\.repository-hosting-settings input,[\s\S]*?background:[\s\S]*?border:/);
    assert.match(css, /@media \(max-width: 700px\)\s*{\s*\.repository-hosting-form { grid-template-columns: minmax\(0, 1fr\);/);
    change("Provider ID", " Forgejo "); change("Forgejo API base URL", "https://example.invalid/api/v1"); change("Namespace", "fixture-user");
    for (const [code, field, text] of [["invalid-api-url", "Forgejo API base URL", /\/api\/v1 endpoint/], ["invalid-provider-id", "Provider ID", /lowercase letters/], ["stale-configuration", null, /Refresh before saving/]]) {
      failure = code; await submit(); assert.match(markup(), text); assert.doesNotMatch(markup(), /unsafe synthetic|private\/path/); if (field) assert.equal(control(field).props["aria-invalid"], true);
    }
    failure = null; await submit();
    assert.equal(savedInput.providers[0].providerId, "forgejo"); assert.equal(savedInput.configurationId, "a".repeat(64));
    assert.equal(control("Provider ID").props.value, "forgejo");
    assert.equal(control("Forgejo API token").props.disabled, false);
    assert.equal(button("Save authentication").props.disabled, true);
    assert.match(markup(), /Connection saved/); assert.match(markup(), /Enter a token/);
    change("Forgejo API token", "synthetic-ui-credential"); assert.equal(button("Save authentication").props.disabled, false);
    button("Save authentication").props.onClick(); render(); assert.equal(control("Forgejo API token").props.value, ""); await settle();
    assert.equal(authInput.providerId, "forgejo"); assert.equal(authInput.expectedConfigurationId, "b".repeat(64)); assert.equal(authInput.token, "synthetic-ui-credential");
    assert.equal(statusCalls, 1); assert.match(markup(), /authenticated as fixture-user/); assert.doesNotMatch(JSON.stringify(settings), /synthetic-ui-credential/);
    button("Check connection").props.onClick(); await settle(); assert.equal(statusCalls, 2);
    change("Forgejo API token", "synthetic-bad-credential"); failure = "stale-configuration";
    button("Save authentication").props.onClick(); await settle(); assert.equal(control("Forgejo API token").props.value, ""); assert.match(markup(), /Refresh before saving/);
    failure = null; button("Refresh settings").props.onClick(); await settle(); assert.equal(control("Forgejo API token").props.disabled, false);
    change("Namespace", "changed"); assert.equal(control("Forgejo API token").props.disabled, true);
  } finally { React.useState = originalState; React.useEffect = originalEffect; global.window = originalWindow; }
});
