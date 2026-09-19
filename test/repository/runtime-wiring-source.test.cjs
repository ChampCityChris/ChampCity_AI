const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const test = require("node:test");
const repoRoot = path.resolve(__dirname, "../..");

function wiring(scope) {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/main.ts"), "utf8");
  const ast = ts.createSourceFile("main.ts", source, ts.ScriptTarget.Latest, true);
  const registrations = ast.statements.filter((node) => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    ts.isPropertyAccessExpression(node.expression.expression) && node.expression.expression.expression.getText(ast) === "ipcMain" && node.expression.expression.name.text === "handle");
  const handlers = new Map();
  vm.runInNewContext(ts.transpileModule(registrations.map((node) => node.getText(ast)).join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ...scope, ipcMain: { handle: (channel, handler) => { assert.equal(handlers.has(channel), false); handlers.set(channel, handler); } },
  });
  let api;
  const invocations = [];
  vm.runInNewContext(fs.readFileSync(path.join(repoRoot, "dist/preload/index.js"), "utf8"), {
    exports: {}, require: (id) => {
      assert.equal(id, "electron");
      return { contextBridge: { exposeInMainWorld: (key, value) => { assert.equal(key, "champcity"); api = value; } },
        ipcRenderer: { invoke: async (channel, ...args) => { invocations.push(channel); assert.ok(handlers.has(channel), channel); return handlers.get(channel)({}, ...args); } } };
    },
  });
  return { api, handlers, invocations };
}

const routes = [
  ["getCurrentWorkspaceModel", "getCurrentWorkspaceModel", []],
  ["generateCurrentHandoff", "generateCurrentHandoff", []],
  ["getWorkCardMapProjection", "getCurrentWorkCardMapProjection", ["phase-01", {}]],
  ["beginWorkCardPlanning", "beginWorkCardPlanning", ["phase-01", "WC02", {}]],
  ["getCurrentCloseProjection", "getCurrentCloseProjection", []],
  ["getCurrentRepairWorkspaceProjection", "getCurrentRepairWorkspaceProjection", []],
  ["applyCurrentDisposition", "applyCurrentDisposition", ["Approved", "notes", "work-card-planning"]],
  ["applyOperatorValidationDecisionForCurrentWorkCard", "applyOperatorValidationDecisionForCurrentWorkCard", [{ decision: "Approve" }, "document-id"]],
  ["createRepairForCurrentFailure", "createRepairForCurrentFailure", ["defect"]],
  ["createValidationAttemptForCurrentWorkCard", "createValidationAttemptForCurrentWorkCard", []],
  ["createPhaseCloseoutForCurrentPhase", "createPhaseCloseoutForCurrentPhase", ["Close", "rationale"]],
  ["createProjectCloseoutForCurrentProject", "createProjectCloseoutForCurrentProject", ["Close", "rationale"]],
  ["generateCloseReturnNextIntakeHandoff", "generateCloseReturnNextIntakeHandoff", ["WC02"]],
  ["getArchitectOutputWorkspaceModel", "getArchitectOutputWorkspaceModel", ["work-card-planning"]],
  ["prepareArchitectOutputHandoff", "prepareArchitectOutputHandoff", ["work-card-planning"]],
  ["prepareArchitectInterviewFinalDraftHandoff", "prepareArchitectInterviewFinalDraftHandoffWorkspace", []],
  ["preparePhaseInterviewFinalDraftHandoff", "preparePhaseInterviewFinalDraftHandoffWorkspace", []],
  ["applyIssueFixCardValidationDecision", "applyIssueFixCardValidationDecision", ["ISSUE_001", { decision: "Approve" }, "validation"]],
  ["prepareIssueFixCardRepairHandoff", "prepareIssueFixCardRepairHandoff", ["ISSUE_001", "validation"]],
  ["closeIssueFixCard", "closeIssueFixCard", ["ISSUE_001", "close-next"]],
  ["getIssueValidationProjection", "getIssueValidationProjection", ["ISSUE_001"]],
  ["applyIssueValidationDecision", "applyIssueValidationDecision", ["ISSUE_001", { decision: "ValidateResolved" }]],
  ["getIssueCloseProjection", "getIssueCloseProjection", ["ISSUE_001"]],
  ["closeIssue", "closeIssue", ["ISSUE_001", { rationale: "resolved" }]],
];

test("preload actions invoke the actual main handlers with selected-root and input preservation", async (t) => {
  for (const [method, service, args] of routes) {
    await t.test(method, async () => {
      const calls = [];
      const result = { fixture: method };
      const { api, invocations } = wiring({ getRequiredWorkspaceRoot: () => "selected-root", [service]: (...input) => { calls.push(input); return result; } });
      assert.equal(await api[method](...args), result);
      assert.deepEqual(calls, [["selected-root", ...args]]);
      assert.equal(invocations.length, 1);
    });
  }
});

test("Codex preload start cannot forward renderer-supplied permission arguments", async () => {
  const calls = [];
  const selection = { model: "fixture-model", reasoningEffort: "high" };
  const service = Object.fromEntries(["getStatus", "start", "cancel", "respondToUserInput", "respondToMcpElicitation"].map((name) => [name, (...args) => { calls.push([name, ...args]); return name; }]));
  const { api } = wiring({ getRequiredWorkspaceRoot: () => "selected-root", codexImplementerExecutionService: service });
  assert.equal(await api.startCodexImplementerExecution(selection, { networkAccessEnabled: true }), "start");
  await api.getCodexImplementerExecutionStatus();
  await api.cancelCodexImplementerExecution();
  await api.respondToCodexUserInput({ requestId: "request", answers: { answer: "value" } });
  await api.respondToCodexMcpElicitation({ requestId: "request", action: "accept", content: { value: true } });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["start", "selected-root", null, selection], ["getStatus", "selected-root"], ["cancel", "selected-root"],
    ["respondToUserInput", "selected-root", "request", { answer: "value" }],
    ["respondToMcpElicitation", "selected-root", "request", { action: "accept", content: { value: true } }],
  ]);
});

test("handoff preload calls copy one resolved instruction and return the corresponding receipt", async () => {
  for (const [method, resolver, args] of [
    ["copyCurrentWorkCardAdvisoryReviewPrompt", "resolveCurrentAdvisoryReviewPrompt", []],
    ["copyArchitectOutputHandoff", "resolveArchitectOutputCopyHandoff", ["work-card-planning"]],
    ["copyArchitectInterviewFinalDraftHandoff", "resolveArchitectInterviewCopyFinalDraftHandoff", []],
    ["copyPhaseInterviewFinalDraftHandoff", "resolvePhaseInterviewCopyFinalDraftHandoff", []],
    ["copyIssueFixCardAdvisoryReviewPrompt", "resolveIssueFixCardAdvisoryReviewPrompt", ["ISSUE_001", "validation"]],
    ["copyIssueFixCardRepairHandoff", "resolveIssueFixCardRepairCopyHandoff", ["ISSUE_001", "validation"]],
  ]) {
    const calls = [];
    const result = { ok: true };
    const { api } = wiring({ getRequiredWorkspaceRoot: () => "selected-root",
      [resolver]: (...input) => { calls.push(input); return { instruction: "prepared", result }; },
      clipboard: { writeText: (text) => { calls.push([text]); } },
    });
    assert.equal(await api[method](...args), result);
    assert.deepEqual(calls, [["selected-root", ...args], ["prepared"]]);
  }
});

test("registered API surface excludes retired mutation routes and unrestricted native access", async () => {
  let calls = 0;
  const { api, handlers } = wiring({ getRequiredWorkspaceRoot: () => { throw new Error("No workspace selected."); },
    getCurrentWorkspaceModel: () => { calls += 1; },
  });
  await assert.rejects(api.getCurrentWorkspaceModel(), /No workspace selected/);
  assert.equal(calls, 0);
  for (const channel of ["architectInterview:save", "architectInterview:submit", "projectPlanning:save", "projectPlanning:submit", "phaseInterview:saveOutput", "workCardPlanning:saveOutput", "workCardRepair:saveOutput"]) assert.equal(handlers.has(channel), false);
  for (const method of ["saveFormalWorkCardOutput", "saveRepairWorkCardOutput", "prepareIssueFixCardArchitectReviewHandoff", "copyIssueFixCardArchitectReviewHandoff", "promoteIssueFixCardArchitectReviewDraft", "fs", "shell", "process", "require", "ipcRenderer"]) assert.equal(Object.hasOwn(api, method), false);
});

test("production catalog resolves seven active definitions with nine output slots", () => {
  const catalog = require("../../dist/main/architectOutputs/productionArchitectOutputCatalog.js");
  const expected = [
    ["project-architect-interview", "architect-interview"], ["project-planning", "project-planning-review"],
    ["phase-map", "project-phase-map"], ["phase-interview", "phase-interview"],
    ["phase-planning-bundle", "phase-planning-bundle"], ["formal-work-card", "work-card-planning"], ["repair-work-card", "work-card-repair"],
  ];
  const definitions = catalog.activeProductionArchitectOutputDefinitions();
  assert.deepEqual(definitions.map((entry) => [entry.outputKind, entry.owningWorkspaceId]), expected);
  assert.equal(definitions.reduce((count, entry) => count + entry.slots.length, 0), 9);
  for (const entry of definitions) assert.equal(catalog.resolveProductionArchitectOutputDefinition(entry.outputKind, entry.owningWorkspaceId), entry);
  assert.throws(() => catalog.resolveProductionArchitectOutputDefinition("unknown", "work-card-planning"), /Unknown/);
});
