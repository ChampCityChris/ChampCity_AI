const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  architectBrowserSecuritySummary,
  architectBrowserWebPreferences,
  architectSessionPartition,
  getArchitectBrowserFoundationStatus,
  inferArchitectBrowserLoadState,
  isAllowedArchitectSurfaceUrl,
  shouldOpenExternally,
} = require("../../dist/main/browser/architectBrowserService.js");
const {
  buildArchitectHandoffManifest,
} = require("../../dist/main/integrations/architectMcpHandoffService.js");
const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  workspaceDefinitions,
} = require("../../dist/shared/workspaceContracts.js");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-architect-browser-"));
}

function submission(root) {
  return {
    projectName: "Architect Browser Proof",
    projectPurpose: "Validate browser and handoff foundation.",
    desiredOutcome: "Operator can hand off intake artifacts.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  };
}

test("Architect Interview is visible after Project Intake Capture", () => {
  assert.deepEqual(
    workspaceDefinitions.slice(0, 2).map(({ id, label, location, order }) => ({
      id,
      label,
      location,
      order,
    })),
    [
      {
        id: "project-intake-capture",
        label: "Project Intake Capture",
        location: { level: "project", stage: "intake" },
        order: 10,
      },
      {
        id: "architect-interview",
        label: "Architect Interview",
        location: { level: "project", stage: "intake" },
        order: 20,
      },
    ],
  );
});

test("embedded Architect browser uses isolated persistent safe web preferences", () => {
  const preferences = architectBrowserWebPreferences();

  assert.equal(preferences.partition, architectSessionPartition);
  assert.equal(preferences.nodeIntegration, false);
  assert.equal(preferences.contextIsolation, true);
  assert.equal(preferences.sandbox, true);
  assert.equal(preferences.preload, undefined);
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});

test("Architect surface URL policy allows intended HTTPS surfaces and blocks external destinations", () => {
  assert.equal(isAllowedArchitectSurfaceUrl("https://chatgpt.com/"), true);
  assert.equal(isAllowedArchitectSurfaceUrl("https://chat.openai.com/"), true);
  assert.equal(isAllowedArchitectSurfaceUrl("http://chatgpt.com/"), false);
  assert.equal(shouldOpenExternally("mailto:test@example.com"), true);
  assert.equal(shouldOpenExternally("https://example.com/"), true);
  assert.equal(shouldOpenExternally("https://chatgpt.com/g/g-test"), false);
});

test("browser load state does not imply MCP handoff readiness", () => {
  assert.equal(inferArchitectBrowserLoadState(false, "https://chatgpt.com/"), "sign-in-required");
  assert.equal(inferArchitectBrowserLoadState(true, "https://chatgpt.com/"), "browser-unavailable");
});

test("handoff manifest reports unavailable until WC02 artifacts exist", () => {
  const root = createRepository();
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });

  assert.deepEqual(buildArchitectHandoffManifest(root), {
    state: "handoff-unavailable",
    reason: "Project Intake and Architect Interview Prompt pairs are required before handoff.",
  });
});

test("handoff manifest uses repo-relative WC02 artifact paths", () => {
  const root = createRepository();
  const intake = submitProjectIntake(submission(root));

  assert.deepEqual(buildArchitectHandoffManifest(root), {
    state: "handoff-ready",
    promptMarkdownPath: intake.architectPromptMarkdownPath,
    promptJsonPath: intake.architectPromptJsonPath,
    projectIntakeMarkdownPath: intake.projectIntakeMarkdownPath,
    projectIntakeJsonPath: intake.projectIntakeJsonPath,
    repositoryReference: "<PROJECT_REPO>",
  });
});

test("foundation status separates browser and handoff states", () => {
  const root = createRepository();
  submitProjectIntake(submission(root));

  const status = getArchitectBrowserFoundationStatus(root);

  assert.equal(status.sessionPartition, "persist:champcity-architect");
  assert.equal(status.browserState, "sign-in-required");
  assert.equal(status.handoff.state, "handoff-ready");
  assert.equal(status.security.nodeIntegration, false);
});
