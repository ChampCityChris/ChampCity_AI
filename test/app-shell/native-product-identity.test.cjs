const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.join(__dirname, "..", "..");
const {
  applyElectronProductIdentity,
  productIdentity,
} = require("../../dist/shared/productIdentity.js");

test("Desktop BrowserWindow construction supplies the generated native icon and isolated preload", () => {
  const ts = require("typescript");
  const vm = require("node:vm");
  const source = fs.readFileSync(path.join(repositoryRoot, "src/main/main.ts"), "utf8");
  const ast = ts.createSourceFile("main.ts", source, ts.ScriptTarget.Latest, true);
  const constructors = ast.statements.filter((node) => {
    if (!ts.isFunctionDeclaration(node)) return false;
    let createsWindow = false;
    function visit(child) {
      if (ts.isNewExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === "BrowserWindow") createsWindow = true;
      ts.forEachChild(child, visit);
    }
    visit(node);
    return createsWindow;
  });
  assert.equal(constructors.length, 1);
  const code = ts.transpileModule(`(${constructors[0].getText(ast)})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let options;
  let loaded;
  vm.runInNewContext(code, {
    path, __dirname: path.join(repositoryRoot, "dist/main"), productIdentity,
    mainWindow: null, registerLocalRendererContextMenu() {},
    BrowserWindow: class {
      constructor(input) { options = input; }
      loadFile(value) { loaded = value; }
      once() {}
    },
  });
  assert.deepEqual(fs.readFileSync(options.icon), fs.readFileSync(path.join(repositoryRoot, "assets/branding/ChampCity-AI.ico")));
  assert.equal(options.title, productIdentity.productName);
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.preload, path.join(repositoryRoot, "dist/preload/index.js"));
  assert.equal(loaded, path.join(repositoryRoot, "dist/renderer/index.html"));
});

test("product identity owns the friendly, AppUserModelID, and future executable contracts", () => {
  assert.deepEqual(productIdentity, {
    productName: "ChampCity A/I",
    windowsAppUserModelId: "ChampCity.AI",
    windowsExecutableName: "ChampCityAI.exe",
  });
  assert.equal(Object.isFrozen(productIdentity), true);
});

test("Electron product identity preserves the effective user-data root", () => {
  const originalUserDataRoot = path.join("existing", "champcity-user-data");
  const calls = [];
  const fakeApplication = {
    getPath(name) {
      calls.push(["getPath", name]);
      return originalUserDataRoot;
    },
    setPath(name, value) {
      calls.push(["setPath", name, value]);
    },
    setName(value) {
      calls.push(["setName", value]);
    },
    setAppUserModelId(value) {
      calls.push(["setAppUserModelId", value]);
    },
  };

  assert.equal(applyElectronProductIdentity(fakeApplication), originalUserDataRoot);
  assert.deepEqual(calls, [
    ["getPath", "userData"],
    ["setName", "ChampCity A/I"],
    ["setPath", "userData", originalUserDataRoot],
    ["setAppUserModelId", "ChampCity.AI"],
  ]);
});

test("canonical build emits the exact approved runtime branding assets", () => {
  const assets = [
    ["assets/branding/ChampCity-AI.ico", "dist/branding/ChampCity-AI.ico"],
    ["assets/branding/svg/champcity-mark.svg", "dist/branding/champcity-mark.svg"],
    ["assets/branding/svg/champcity-app-icon.svg", "dist/branding/champcity-app-icon.svg"],
    ["assets/branding/svg/champcity-mark-monochrome.svg", "dist/branding/champcity-mark-monochrome.svg"],
  ];

  for (const [sourceRelativePath, outputRelativePath] of assets) {
    const source = fs.readFileSync(path.join(repositoryRoot, sourceRelativePath));
    const output = fs.readFileSync(path.join(repositoryRoot, outputRelativePath));
    assert.deepEqual(output, source, `${outputRelativePath} must be an exact generated copy`);
  }
});
