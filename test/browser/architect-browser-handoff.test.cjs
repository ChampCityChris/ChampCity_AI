const assert = require("node:assert/strict");
const test = require("node:test");

const {
  architectBrowserSecuritySummary,
  getArchitectBrowserFoundationStatus,
  getArchitectSurfaceUrl,
} = require("../../dist/main/browser/architectBrowserService.js");
const {
  seedApprovedProjectIntake,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Architect browser status exposes secure web preferences and Markdown-only handoff targets", () => {
  const root = tempWorkspace("champcity-browser-handoff-");
  const seeded = seedApprovedProjectIntake(root);
  const status = getArchitectBrowserFoundationStatus(root);

  assert.equal(getArchitectSurfaceUrl(), "https://chatgpt.com/");
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
  assert.equal(status.handoff.interviewMarkdownTargetPath, seeded.interview);
  assert.equal("interviewJsonTargetPath" in status.handoff, false);
});
