const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("screenshot-bearing NewIssueInput follows the existing single Issue creation route", () => {
  const workspaceSource = read("src/renderer/app/IssueResolutionWorkspace.tsx");
  const appSource = read("src/renderer/app/App.tsx");
  const preloadSource = read("src/preload/index.ts");
  const mainSource = read("src/main/main.ts");

  assert.match(workspaceSource, /buildNewIssueSubmission\(input, pendingScreenshotsRef\.current\)/);
  assert.match(workspaceSource, /submitIssueAndResetOnSuccess\([\s\S]*?onCreateIssue/);
  assert.match(appSource, /createLightweightIssueRecord\(input\)/);
  assert.match(appSource, /setIssueInventory\(result\.inventory\)/);
  assert.match(appSource, /setSelectedIssueId\(result\.createdIssueId\)/);
  assert.match(appSource, /setActiveIssueStageId\("intake"\)/);
  assert.match(appSource, /setIssueInventoryError\(creationError\.message\);\s*throw creationError;/);
  assert.match(
    preloadSource,
    /createLightweightIssueRecord: \(input\) =>[\s\S]*?ipcRenderer\.invoke\([\s\S]*?"issueResolution:createIssue",[\s\S]*?input/,
  );
  assert.match(
    mainSource,
    /ipcMain\.handle\(\s*"issueResolution:createIssue",\s*\(_event, input: NewIssueInput\) => \{\s*return createLightweightIssueRecord\(getRequiredWorkspaceRoot\(\), input\);/,
  );

  assert.doesNotMatch(preloadSource, /issueResolution:[^"\r\n]*screenshot/i);
  assert.doesNotMatch(mainSource, /issueResolution:[^"\r\n]*screenshot/i);
});
