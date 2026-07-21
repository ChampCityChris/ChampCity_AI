const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");
const srcRoot = path.join(repoRoot, "src");

function collectFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("old implementation and rejected manifest paths are absent", () => {
  const absentPaths = [
    "src/shared/workflow",
    "src/main/workflow",
    "src/main/artifacts",
    "src/main/contextPackets",
    "scripts/migration/historical-corpus-v1",
    "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json",
    "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md",
  ];

  for (const relativePath of absentPaths) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false, relativePath);
  }
});

test("production source does not contain prohibited identifiers", () => {
  const productionText = collectFiles(srcRoot)
    .filter((filePath) => /\.(ts|tsx|js|jsx|css|html)$/.test(filePath))
    .map(readText)
    .join("\n");

  const prohibited = [
    "workflow authority",
    "current action",
    "workflow state index",
    "workflow action catalog",
    "Governance Maintenance",
    "Governance Repair",
    "Governance Approval",
    "approval queue",
    "approval artifact",
    "Operator approval screen",
    "routed IPC",
    "renderer binding",
    "role gate",
    "screen gate",
    "target-set hash",
    "decision timeline",
    "Execution Run",
    "context packet",
    "Independent Verifier",
    "validator agent",
    "workflow resolver",
  ];

  for (const term of prohibited) {
    assert.equal(productionText.includes(term), false, term);
  }
});

test("workspace settings require a planning directory", () => {
  const {
    validateWorkspaceRoot,
  } = require("../../dist/main/workspaceSettings.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const validWorkspace = path.join(tempRoot, "valid");
  fs.mkdirSync(path.join(validWorkspace, "planning"), { recursive: true });

  assert.deepEqual(validateWorkspaceRoot(validWorkspace), {
    ok: true,
    workspaceRoot: path.resolve(validWorkspace),
  });
});

test("invalid workspace selection is rejected", () => {
  const {
    validateWorkspaceRoot,
  } = require("../../dist/main/workspaceSettings.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const invalidWorkspace = path.join(tempRoot, "invalid");
  fs.mkdirSync(invalidWorkspace, { recursive: true });

  const result = validateWorkspaceRoot(invalidWorkspace);
  assert.equal(result.ok, false);
  assert.equal(result.workspaceRoot, null);
});

test("workspace settings persist and reload from user data", () => {
  const {
    readSelectedWorkspace,
    saveSelectedWorkspace,
  } = require("../../dist/main/workspaceSettings.js");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-shell-"));
  const userDataRoot = path.join(tempRoot, "user-data");
  const workspaceRoot = path.join(tempRoot, "workspace");
  fs.mkdirSync(path.join(workspaceRoot, "planning"), { recursive: true });

  assert.equal(saveSelectedWorkspace(userDataRoot, workspaceRoot).ok, true);
  assert.deepEqual(readSelectedWorkspace(userDataRoot), {
    ok: true,
    workspaceRoot: path.resolve(workspaceRoot),
  });
});

test("preload exposes only approved methods", () => {
  const preloadSource = readText(path.join(repoRoot, "dist/preload/index.js"));
  const approvedMethods = [
    "getSelectedWorkspace",
    "chooseWorkspaceFolder",
    "clearSelectedWorkspace",
    "getAppInfo",
  ];

  for (const method of approvedMethods) {
    assert.match(preloadSource, new RegExp(`${method}:`));
  }

  assert.equal(preloadSource.includes("exposeInMainWorld(\"champcity\""), true);
  assert.equal(preloadSource.includes("shell"), false);
  assert.equal(preloadSource.includes("process:"), false);
});

test("renderer contains all five workspace labels", () => {
  const rendererSource = readText(path.join(repoRoot, "src/shared/workspaceContracts.ts"));
  const labels = [
    "Project Planning",
    "Phase Planning",
    "Work Card",
    "Operator Validation",
    "Phase Closeout",
  ];

  for (const label of labels) {
    assert.equal(rendererSource.includes(label), true, label);
  }
});

test("renderer contains the exact neutral message", () => {
  const appSource = readText(path.join(repoRoot, "src/renderer/app/App.tsx"));
  assert.equal(appSource.includes("Document workflow not yet implemented"), true);
});
