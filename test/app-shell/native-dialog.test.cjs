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
