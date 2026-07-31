const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "App.tsx");

test("Project Planning action bar receives visible polling errors", () => {
  const source = fs.readFileSync(appSourcePath, "utf8");

  assert.match(source, /const \[projectPlanningPollingError, setProjectPlanningPollingError\] = useState\(""\)/);
  assert.match(source, /pollingError=\{projectPlanningPollingError\}/);
  assert.doesNotMatch(source, /ProjectPlanningActionBar[\s\S]{0,900}pollingError=""/);
});

test("Project Planning polling uses request ordering and stale preview protection", () => {
  const source = fs.readFileSync(appSourcePath, "utf8");

  assert.match(source, /projectPlanningPollInFlightRef/);
  assert.match(source, /projectPlanningPollRequestRef/);
  assert.match(source, /options\.quiet && projectPlanningPollInFlightRef\.current !== null/);
  assert.match(source, /requestId !== projectPlanningPollRequestRef\.current/);
  assert.match(source, /loadProjectPlanningDocumentForRequest\(nextDocumentId, requestId\)/);
});

test("Phase Map polling detects MCP output and surfaces ordered polling failures", () => {
  const source = fs.readFileSync(appSourcePath, "utf8");

  assert.match(source, /const \[phaseMapPollingError, setPhaseMapPollingError\] = useState\(""\)/);
  assert.match(source, /phaseMapPollInFlightRef/);
  assert.match(source, /phaseMapPollRequestRef/);
  assert.match(source, /activeWorkspaceId !== "project-phase-map"/);
  assert.match(source, /refreshPhaseMapWorkspace\(\{ autoSelectOutput: true, quiet: true \}\)/);
  assert.match(source, /options\.quiet && phaseMapPollInFlightRef\.current !== null/);
  assert.match(source, /requestId !== phaseMapPollRequestRef\.current/);
  assert.match(source, /buildPhaseMapEvidenceFingerprint\(workspace\.workspaceRoot, nextDocuments\)/);
  assert.match(source, /phaseMapOutputDocument\(nextDocuments\)/);
  assert.match(source, /setPhaseMapPollingError\(message\)/);
  assert.match(source, /pollingError=\{phaseMapPollingError\}/);
});
