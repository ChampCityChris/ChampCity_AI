const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { selectedCurrentProjectId } = require("../../dist/main/projectState/currentProjectRegistrationService.js");

test("fresh Current Project registration is idempotent, local, and ignores legacy Markdown", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-current-project-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "WORKFLOW.md"), "Historical workflow notes must not become state.\n");
  const first = await registerCurrentProject(root, "existing", { projectName: "Synthetic Project" });
  const second = await registerCurrentProject(root, "existing", { projectName: "Ignored on reopen" });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.project.id, first.project.id);
  assert.equal(selectedCurrentProjectId(root), first.project.id);
  assert.equal(first.projectResource.projectId, first.project.id);
  assert.equal(fs.existsSync(path.join(root, ".git")), false);
  assert.equal(fs.existsSync(path.join(root, "WORKFLOW.md")), true);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await store.listEntities(first.project.id, "Project")).length, 1);
    const resources = (await store.listEntities(first.project.id, "ProjectResource")).filter(record => record.entityType === "ProjectResource");
    assert.deepEqual(first.projectResource.body, { resourceType: "current-project-registration", provider: "champcity", logicalName: "current-project", locator: "selected-project", role: "current-project" });
    assert.equal(resources.filter(record => record.body.resourceType === "source-repository").length, 0);
    assert.equal((await store.listEntities(first.project.id, "WorkIntake")).length, 0);
    assert.equal((await store.listEntities(first.project.id, "Workflow")).length, 0);
    assert.equal(await store.getProviderGeneration(first.project.id), null);
  } finally { store.close(); }
});

test("Current Project registration abandons historical Projects and rejects multiple current registrations", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-historical-project-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let oldProjectId;
  let oldWorkflowId;
  try {
    const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
    const state = createProjectStateService(store, { principalId: "test", principalType: "human", role: "Operator" });
    const oldProject = await state.createRecord(null, "Project", { name: "Abandoned", description: "historical fixture" });
    oldProjectId = oldProject.id;
    const oldResource = await state.createRecord(oldProjectId, "ProjectResource", { resourceType: "source-repository", provider: "git",
      logicalName: "old-source", locator: "selected-repository", role: "project-source" });
    oldWorkflowId = (await state.createWorkflow(oldProjectId, { workflowType: "feature-capability", title: "Historical workflow", currentWorkspace: "old" })).id;
    assert.equal((await store.listEntities(oldProjectId, "ProjectResource")).find(record => record.entityType === "ProjectResource" && record.id === oldResource.id).body.locator, "selected-repository");
  } finally { store.close(); }
  assert.equal(selectedCurrentProjectId(root), null);
  const current = await registerCurrentProject(root, "existing");
  assert.notEqual(current.project.id, oldProjectId);
  assert.equal(selectedCurrentProjectId(root), current.project.id);
  const verify = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await verify.listEntities(oldProjectId, "Workflow")).find(record => record.entityType === "Workflow" && record.id === oldWorkflowId).body.title, "Historical workflow");
    assert.equal((await verify.listEntities(oldProjectId, "ProjectResource")).some(record => record.entityType === "ProjectResource" && record.body.locator === "selected-repository"), true);
    assert.equal((await verify.listEntities(current.project.id, "WorkIntake")).length, 0);
    assert.equal((await verify.listEntities(current.project.id, "Workflow")).length, 0);
    const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
    const state = createProjectStateService(verify, { principalId: "test", principalType: "human", role: "Operator" });
    const duplicate = await state.createRecord(null, "Project", { name: "Duplicate current", description: "ambiguous fixture" });
    await state.createRecord(duplicate.id, "ProjectResource", { resourceType: "current-project-registration", provider: "champcity",
      logicalName: "current-project", locator: "selected-project", role: "current-project" });
  } finally { verify.close(); }
  await assert.rejects(registerCurrentProject(root, "existing"), /ambiguous Project identities/);
  assert.throws(() => selectedCurrentProjectId(root), /ambiguous Project identities/);
});

test("Current Project registration creates a fresh identity beside an interrupted Project-only record", async context => {
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
  assert.equal(result.created, true);
  assert.notEqual(result.project.id, projectId);
  assert.equal(result.projectResource.body.resourceType, "current-project-registration");
});

test("source-backed Current Project keeps registration and Repository identities separate", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-source-backed-project-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = await registerCurrentProject(root, "existing", { sourceRepositoryId: "repo-synthetic" });
  assert.equal(result.projectResource.body.resourceType, "current-project-registration");
  assert.equal(result.repositoryResource.body.resourceType, "source-repository");
  assert.equal(result.repositoryResource.body.logicalName, "repo-synthetic");
  assert.equal(result.repositoryResource.body.locator, "managed-repository");
});

test("inactive and obsolete R01 registration resources do not select a Current Project", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-inactive-project-marker-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
    const state = createProjectStateService(store, { principalId: "test", principalType: "human", role: "Operator" });
    const old = await state.createRecord(null, "Project", { name: "Old R01", description: "abandoned" });
    await state.createRecord(old.id, "ProjectResource", { resourceType: "source-repository", provider: "git",
      logicalName: "selected-project-source", locator: "selected-project", role: "project-source" });
    const inactiveProject = await state.createRecord(null, "Project", { name: "Inactive", description: "fixture" });
    const inactiveMarker = await state.createRecord(inactiveProject.id, "ProjectResource", { resourceType: "current-project-registration",
      provider: "champcity", logicalName: "current-project", locator: "selected-project", role: "current-project" });
    const inactiveAt = new Date().toISOString();
    await store.transaction(inactiveProject.id, async unit => unit.saveEntity({ ...inactiveMarker, recordVersion: inactiveMarker.recordVersion + 1,
      lifecycleState: "archived", closedAt: inactiveAt, updatedAt: inactiveAt }, inactiveMarker.recordVersion));
    const inactiveOwner = await state.createRecord(null, "Project", { name: "Inactive owner", description: "fixture" });
    const activeMarker = await state.createRecord(inactiveOwner.id, "ProjectResource", { resourceType: "current-project-registration",
      provider: "champcity", logicalName: "current-project", locator: "selected-project", role: "current-project" });
    const db = new (require("node:sqlite").DatabaseSync)(path.join(root, ".champcity", "project-state.sqlite"));
    try { db.prepare("UPDATE projects SET lifecycle_state='archived' WHERE project_id=?").run(inactiveOwner.id); }
    finally { db.close(); }
    assert.equal(selectedCurrentProjectId(root), null);
    assert.ok(activeMarker);
  } finally { store.close(); }
  const fresh = await registerCurrentProject(root, "existing");
  assert.notEqual(selectedCurrentProjectId(root), null);
  assert.notEqual(fresh.project.id, undefined);
});

test("duplicate active source Repository resources fail closed", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-duplicate-source-resource-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const current = await registerCurrentProject(root, "existing", { sourceRepositoryId: "repo-one" });
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
    const state = createProjectStateService(store, { principalId: "test", principalType: "human", role: "Operator" });
    await state.createRecord(current.project.id, "ProjectResource", { resourceType: "source-repository", provider: "git",
      logicalName: "repo-two", locator: "managed-repository", role: "project-source" });
  } finally { store.close(); }
  await assert.rejects(registerCurrentProject(root, "existing"), /ambiguous source Repository/);
});

test("Current Project registration leaves legacy source locators historical and creates a fresh Project", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-legacy-locator-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let oldProjectId;
  try {
    const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
    const state = createProjectStateService(store, { principalId: "test", principalType: "human", role: "Operator" });
    const project = await state.createRecord(null, "Project", { name: "Legacy", description: "No implicit import" });
    oldProjectId = project.id;
    await state.createRecord(oldProjectId, "ProjectResource", { resourceType: "source-repository", provider: "git",
      logicalName: "legacy-source", locator: "selected-repository", role: "project-source" });
  } finally { store.close(); }
  const result = await registerCurrentProject(root, "existing");
  assert.notEqual(result.project.id, oldProjectId);
  assert.equal(selectedCurrentProjectId(root), result.project.id);
  const verify = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await verify.listEntities(oldProjectId, "ProjectResource")).some(record => record.entityType === "ProjectResource" && record.body.locator === "selected-repository"), true);
    assert.equal((await verify.listEntities(result.project.id, "ProjectResource")).some(record => record.entityType === "ProjectResource" && record.body.locator === "selected-repository"), false);
  } finally { verify.close(); }
});
