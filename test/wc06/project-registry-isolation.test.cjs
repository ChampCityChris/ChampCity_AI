const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { ProjectWorkspaceRegistry } = require("../../dist/main/projects");

const fixedTime = "2026-07-18T23:00:00.000Z";

test("normal registry purges host tmp projects, preserves external projects, and selects the real project", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-wc06-registry-"));
  const host = path.join(root, "ChampCity_AI");
  const internal = path.join(host, "tmp", "wc06-mounted-fixture-project");
  const external = path.join(root, "ExternalProject");
  const storagePath = path.join(root, "user-data", "project-workspaces.json");
  for (const folder of [host, internal, external]) {
    await fs.mkdir(path.join(folder, "planning"), { recursive: true });
    await fs.writeFile(path.join(folder, "package.json"), JSON.stringify({ name: path.basename(folder) }), "utf8");
  }
  await fs.mkdir(path.dirname(storagePath), { recursive: true });
  await fs.writeFile(
    storagePath,
    `${JSON.stringify({
      schemaVersion: "champcity.project-workspaces.v1",
      selectedProjectId: "internal-fixture",
      projects: [
        configured("internal-fixture", internal),
        configured("external-user-project", external),
        configured("champcity-ai", host),
      ],
    }, null, 2)}\n`,
    "utf8",
  );

  const registry = new ProjectWorkspaceRegistry({ storagePath, clock: () => fixedTime });
  const document = await registry.initialize(host);
  assert.equal(document.selectedProjectId, "champcity-ai");
  assert.deepEqual(
    document.projects.map((project) => project.projectId).sort(),
    ["champcity-ai", "external-user-project"],
  );
  assert.ok(document.projects.some((project) => project.repositoryRoot === external));
});

test("mounted isolated registries can opt into repository tmp fixtures", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-wc06-mounted-registry-"));
  const host = path.join(root, "ChampCity_AI");
  const internal = path.join(host, "tmp", "wc06-mounted-fixture-project");
  const storagePath = path.join(root, "mounted-user-data", "project-workspaces.json");
  for (const folder of [host, internal]) {
    await fs.mkdir(path.join(folder, "planning"), { recursive: true });
    await fs.writeFile(path.join(folder, "package.json"), JSON.stringify({ name: path.basename(folder) }), "utf8");
  }
  await fs.mkdir(path.dirname(storagePath), { recursive: true });
  await fs.writeFile(
    storagePath,
    `${JSON.stringify({
      schemaVersion: "champcity.project-workspaces.v1",
      selectedProjectId: "internal-fixture",
      projects: [configured("internal-fixture", internal)],
    }, null, 2)}\n`,
    "utf8",
  );

  const registry = new ProjectWorkspaceRegistry({
    storagePath,
    allowRepositoryTmpProjects: true,
    clock: () => fixedTime,
  });
  const document = await registry.initialize(host);
  assert.equal(document.selectedProjectId, "internal-fixture");
  assert.deepEqual(document.projects.map((project) => project.projectId), ["internal-fixture"]);
});

function configured(projectId, repositoryRoot) {
  return {
    projectId,
    displayName: path.basename(repositoryRoot),
    repositoryRoot,
    planningRoot: path.join(repositoryRoot, "planning"),
    branchBehavior: { mode: "observe-current" },
    enabled: true,
    createdAt: fixedTime,
    updatedAt: fixedTime,
    lastOpenedAt: null,
    lastScanAt: null,
    lastScanResult: null,
    observerStatus: "stopped",
  };
}
