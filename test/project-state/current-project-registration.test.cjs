const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { selectedStructuredProjectId } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");

test("fresh Current Project registration is idempotent, local, and ignores legacy Markdown", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-current-project-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "WORKFLOW.md"), "Historical workflow notes must not become state.\n");
  const first = await registerCurrentProject(root, "existing", { projectName: "Synthetic Project" });
  const second = await registerCurrentProject(root, "existing", { projectName: "Ignored on reopen" });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.project.id, first.project.id);
  assert.equal(selectedStructuredProjectId(root), first.project.id);
  assert.equal(first.projectResource.projectId, first.project.id);
  assert.equal(fs.existsSync(path.join(root, ".git")), false);
  assert.equal(fs.existsSync(path.join(root, "WORKFLOW.md")), true);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await store.listEntities(first.project.id, "Project")).length, 1);
    assert.equal((await store.listEntities(first.project.id, "ProjectResource")).filter(record => record.entityType === "ProjectResource" && record.body.resourceType === "source-repository").length, 1);
    assert.equal((await store.listEntities(first.project.id, "WorkIntake")).length, 0);
    assert.equal((await store.listEntities(first.project.id, "Workflow")).length, 0);
    assert.equal(await store.getProviderGeneration(first.project.id), null);
  } finally { store.close(); }
});

test("Current Project registration rejects ambiguous Project identities", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-ambiguous-project-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const first = await registerCurrentProject(root, "greenfield");
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
    const state = createProjectStateService(store, { principalId: "test", principalType: "human", role: "Operator" });
    await state.createRecord(null, "Project", { name: "Foreign", description: "ambiguous fixture" });
  } finally { store.close(); }
  await assert.rejects(registerCurrentProject(root, "existing"), /ambiguous Project State/);
  assert.throws(() => selectedStructuredProjectId(root), /ambiguous Project identities/);
  assert.ok(first.project.id);
});

test("Current Project registration repairs an interrupted Project-only registration", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-incomplete-project-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let projectId;
  try {
    const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
    const state = createProjectStateService(store, { principalId: "test", principalType: "human", role: "Operator" });
    projectId = (await state.createRecord(null, "Project", { name: "Interrupted", description: "recovery fixture" })).id;
  } finally { store.close(); }
  const result = await registerCurrentProject(root, "existing");
  assert.equal(result.created, false);
  assert.equal(result.project.id, projectId);
  assert.equal(result.projectResource.body.locator, "selected-project");
});
