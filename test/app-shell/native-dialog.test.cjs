const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

test("native Windows file pickers preserve OS folder choice without application persistence", () => {
  const sourcePath = path.resolve(__dirname, "../../src/main/main.ts");
  const source = ts.createSourceFile(sourcePath, fs.readFileSync(sourcePath, "utf8"), ts.ScriptTarget.Latest, true);
  const calls = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "dialog.showOpenDialog") calls.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(calls.length, 3);
  for (const call of calls) {
    for (const platform of ["win32", "darwin", "linux"]) {
      const options = vm.runInNewContext(`(${call.arguments[0].getText(source)})`, { process: { platform } });
      assert.equal(options.defaultPath, platform === "win32" ? "." : undefined);
      assert.ok(options.properties.includes("openDirectory") || options.properties.includes("openFile"));
      // In pinned Electron 44's Windows ApplySettings, a nonempty relative
      // directory bypasses both the Downloads fallback and IFileDialog.SetFolder.
      if (platform === "win32") {
        assert.equal(path.win32.isAbsolute(options.defaultPath), false);
        assert.equal(fs.statSync(options.defaultPath).isDirectory(), true);
      }
    }
  }
});

test("Markdown Save As exports exact UTF-8 text, handles cancellation, and bounds IPC input", async () => {
  const sourcePath = path.resolve(__dirname, "../../src/main/main.ts"), source = ts.createSourceFile(sourcePath, fs.readFileSync(sourcePath, "utf8"), ts.ScriptTarget.Latest, true);
  let handler;
  function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(source) === "ipcMain.handle" && node.arguments[0]?.getText(source).includes("documents:exportMarkdown")) handler = node.arguments[1]; ts.forEachChild(node, visit); }
  visit(source); assert.ok(handler);
  const context = {Buffer, Error, path, fs, mainWindow: null, ipcMain: {handle() {}}, dialog: {async showSaveDialog(...args) { context.dialogArgs = args; if (context.dialogFailure) throw context.dialogFailure; return context.dialogResult; }}};
  const callbackSource = ts.transpileModule(`(${handler.getText(source)})`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  const callback = vm.runInNewContext(callbackSource, context);
  const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "champcity-md-export-")), destination = path.join(root, "chosen.md");
  try {
    context.dialogResult = {canceled: true};
    assert.equal((await callback({}, {suggestedFilename: "Review.md", markdown: "projection"})).status, "cancelled");
    assert.equal(context.dialogArgs[0].defaultPath, "Review.md"); assert.equal(fs.existsSync(destination), false);
    context.dialogFailure = new Error("save dialog failed");
    await assert.rejects(callback({}, {suggestedFilename: "Review.md", markdown: "projection"}), /save dialog failed/);
    context.dialogFailure = null;
    context.dialogResult = {canceled: false, filePath: destination};
    const result = await callback({}, {suggestedFilename: "../Review.md", markdown: "# SQL projection\n\n✓"});
    assert.equal(result.status, "saved"); assert.equal(result.path, destination); assert.equal(context.dialogArgs[0].defaultPath, "Review.md"); assert.equal(fs.readFileSync(destination, "utf8"), "# SQL projection\n\n✓");
    await assert.rejects(callback({}, {suggestedFilename: "x.md", markdown: "x".repeat(1_000_001)}), /1 MB/);
    await assert.rejects(callback({}, {suggestedFilename: "x.md", markdown: "ok", unexpected: true}), /fields are invalid/);
    await assert.rejects(callback({}, {suggestedFilename: "x".repeat(241), markdown: "ok"}), /filename is invalid/);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
