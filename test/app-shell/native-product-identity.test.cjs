const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.join(__dirname, "..", "..");
const {
  applyElectronProductIdentity,
  productIdentity,
} = require("../../dist/shared/productIdentity.js");

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

test("desktop window uses the built native icon and introduces no process or tray deception", () => {
  const mainSource = fs.readFileSync(path.join(repositoryRoot, "src/main/main.ts"), "utf8");
  const bootstrapSource = fs.readFileSync(path.join(repositoryRoot, "src/main/bootstrap.ts"), "utf8");

  assert.match(
    mainSource,
    /path\.join\(__dirname, "\.\.\/branding\/ChampCity-AI\.ico"\)/,
  );
  assert.match(mainSource, /icon: nativeWindowIconPath/);
  assert.doesNotMatch(`${mainSource}\n${bootstrapSource}`, /process\.title|new Tray/);
});
