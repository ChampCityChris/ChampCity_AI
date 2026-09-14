const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "../../src/main/main.ts");
const source = ts.createSourceFile(sourcePath, fs.readFileSync(sourcePath, "utf8"), ts.ScriptTarget.Latest, true);
const routes = new Map([
  ["issueResolution:copyArchitectHandoff", "resolveIssueArchitectPlanningCopyHandoff"],
  ["issueResolution:copyIssuePlanningHandoff", "resolveIssuePlanningCopyHandoff"],
  ["issueResolution:copyIssueFixCardPlanningHandoff", "resolveIssueFixCardPlanningCopyHandoff"],
  ["issueResolution:copyIssueFixCardAdvisoryReviewPrompt", "resolveIssueFixCardAdvisoryReviewPrompt"],
  ["issueResolution:copyIssueFixCardRepairHandoff", "resolveIssueFixCardRepairCopyHandoff"],
  ["architectOutput:copyHandoff", "resolveArchitectOutputCopyHandoff"],
  ["architectInterview:copyFinalDraftHandoff", "resolveArchitectInterviewCopyFinalDraftHandoff"],
  ["phaseInterview:copyFinalDraftHandoff", "resolvePhaseInterviewCopyFinalDraftHandoff"],
  ["currentWorkflow:copyAdvisoryReviewPrompt", "resolveCurrentAdvisoryReviewPrompt"],
]);

function loadHandler(channel, resolver, writeText, resolution) {
  const statement = source.statements.find((node) => ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) && node.expression.expression.getText(source) === "ipcMain.handle" &&
    node.expression.arguments[0]?.text === channel);
  assert.ok(statement, `Production registration missing: ${channel}`);
  let handler;
  const script = ts.transpileModule(statement.getText(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(script, {
    ipcMain: { handle(name, callback) { assert.equal(name, channel); handler = callback; } },
    clipboard: { writeText },
    getRequiredWorkspaceRoot: () => "fixture-workspace",
    [resolver]: resolution,
  });
  return handler;
}

for (const [channel, resolver] of routes) {
  test(`${channel} waits for the clipboard and preserves its result`, async () => {
    let finishWrite;
    const write = new Promise((resolve) => { finishWrite = resolve; });
    const result = { ok: true, message: "Existing handoff result", payload: { retained: true } };
    const writes = [];
    const handler = loadHandler(channel, resolver, (text) => { writes.push(text); return write; },
      () => ({ instruction: "Exact handoff\nUnicode: A/I ✓", result }));
    let settled = false;
    const completion = handler({}, "fixture-id", "fixture-step").then((value) => { settled = true; return value; });
    await new Promise(setImmediate);
    assert.equal(settled, false, "IPC must not claim success while write is pending");
    assert.deepEqual(writes, ["Exact handoff\nUnicode: A/I ✓"]);
    finishWrite();
    assert.equal(await completion, result);
  });

  test(`${channel} propagates clipboard rejection and resolution failure`, async () => {
    const failure = new Error("Clipboard unavailable");
    const handler = loadHandler(channel, resolver, () => Promise.reject(failure),
      () => ({ instruction: "handoff", result: { ok: true } }));
    await assert.rejects(handler({}, "fixture-id"), (error) => error === failure);
    let writes = 0;
    const resolutionFailure = new Error("Handoff is not available");
    const failedResolution = loadHandler(channel, resolver, () => { writes++; }, () => { throw resolutionFailure; });
    await assert.rejects(failedResolution({}, "fixture-id"), (error) => error === resolutionFailure);
    assert.equal(writes, 0);
  });
}
