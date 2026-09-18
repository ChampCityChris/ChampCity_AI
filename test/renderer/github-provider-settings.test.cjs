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
    ipcRenderer: { invoke: async (...args) => { invocations.push(args); return {}; } },
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
  assert.ok(!Object.keys(api).some((name) => /callGithubTool|invokeCapability|registerProvider/.test(name)));
});
