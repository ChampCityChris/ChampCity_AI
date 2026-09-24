const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { MANAGED_PROJECT_SOURCE_PATHS } = require("../../dist/shared/sourceLifecycleContracts.js");
const { resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath, validateRepositoryCheckoutContract } = require("../../dist/main/sourceControl/projectSourceTopology.js");

const workflowId = "a1b2c3d4-e5f6-4789-8abc-0123456789ab";
function project(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-topology-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function checkout(overrides = {}) {
  return { repositoryCheckoutId: "checkout-1", repositoryId: "repo-1", sourceLineId: "main", role: "main",
    projectRelativePath: "Main", ...overrides };
}

test("managed Project source paths are exact canonical relative paths", () => {
  assert.deepEqual(MANAGED_PROJECT_SOURCE_PATHS, { repositoryMetadataRelativePath: ".champcity/repository.git",
    mainCheckoutRelativePath: "Main", devCheckoutRelativePath: "Dev", workflowCheckoutRootRelativePath: ".champcity/checkouts" });
  for (const value of Object.values(MANAGED_PROJECT_SOURCE_PATHS)) {
    assert.equal(value.includes("\\"), false);
    assert.equal(path.isAbsolute(value), false);
  }
});

test("ordinary non-Git Project container resolves topology without materializing it", context => {
  const root = project(context);
  const before = fs.readdirSync(root);
  const result = resolveManagedProjectSourceTopology(root);
  assert.equal(result.projectContainerRoot, fs.realpathSync(root));
  assert.equal(fs.existsSync(path.join(root, ".git")), false);
  assert.deepEqual(fs.readdirSync(root), before);
  assert.equal(result.repositoryMetadataRoot, path.join(root, ".champcity", "repository.git"));
  assert.equal(result.mainCheckoutRoot, path.join(root, "Main"));
  assert.equal(result.devCheckoutRoot, path.join(root, "Dev"));
  assert.equal(result.workflowCheckoutRoot, path.join(root, ".champcity", "checkouts"));
  const locations = [result.projectContainerRoot, result.repositoryMetadataRoot, result.mainCheckoutRoot,
    result.devCheckoutRoot, result.workflowCheckoutRoot];
  assert.equal(new Set(locations).size, locations.length);
  for (const location of locations.slice(1)) {
    const relative = path.relative(result.projectContainerRoot, location);
    assert.ok(relative && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  }
});

test("canonical Workflow UUID maps to its exact Project-relative checkout path", context => {
  const root = project(context);
  const result = resolveManagedWorkflowCheckoutPath(root, workflowId);
  assert.equal(result.projectRelativePath, `.champcity/checkouts/${workflowId}`);
  assert.equal(result.checkoutRoot, path.join(root, ".champcity", "checkouts", workflowId));
  assert.equal(result.workflowCheckoutRoot, path.join(root, ".champcity", "checkouts"));
  for (const other of [root, path.join(root, ".champcity", "repository.git"), path.join(root, "Main"), path.join(root, "Dev"), result.workflowCheckoutRoot]) {
    assert.notEqual(result.checkoutRoot, other);
  }
});

test("Workflow identity rejects noncanonical values", context => {
  const root = project(context);
  for (const id of ["bad", workflowId.toUpperCase(), `../${workflowId}`, `x/${workflowId}`, `${workflowId} `,
    "a1b2c3d4-e5f6-4789-8abc-0123456789aG", "C:\\temp\\workflow"]) {
    assert.throws(() => resolveManagedWorkflowCheckoutPath(root, id), /Workflow ID/);
  }
});

test("RepositoryCheckout roles validate identity, path, and workflow relationships", () => {
  assert.deepEqual(validateRepositoryCheckoutContract(checkout()), { valid: true });
  assert.deepEqual(validateRepositoryCheckoutContract(checkout({ sourceLineId: "dev", role: "dev", projectRelativePath: "Dev" })), { valid: true });
  assert.deepEqual(validateRepositoryCheckoutContract(checkout({ sourceLineId: "work-line", role: "workflow",
    projectRelativePath: `.champcity/checkouts/${workflowId}`, workflowId })), { valid: true });

  for (const value of [
    checkout({ workflowId }),
    checkout({ sourceLineId: "wrong" }),
    checkout({ projectRelativePath: "Dev" }),
    checkout({ projectRelativePath: ".champcity/repository.git" }),
    checkout({ projectRelativePath: ".champcity" }),
    checkout({ projectRelativePath: ".champcity/checkouts" }),
    checkout({ projectRelativePath: "." }),
    checkout({ projectRelativePath: "Main/" }),
    checkout({ projectRelativePath: "./Main" }),
    checkout({ projectRelativePath: "a/../Main" }),
    checkout({ projectRelativePath: "C:/Main" }),
    checkout({ projectRelativePath: "Main\\sub" }),
    checkout({ projectRelativePath: "/Main" }),
    checkout({ repositoryId: "bad identity" }),
    checkout({ repositoryCheckoutId: "" }),
    checkout({ sourceLineId: "" }),
  ]) assert.equal(validateRepositoryCheckoutContract(value).valid, false, JSON.stringify(value));

  assert.equal(validateRepositoryCheckoutContract(checkout({ sourceLineId: "dev", role: "dev", projectRelativePath: "Dev", workflowId })).valid, false);
  assert.equal(validateRepositoryCheckoutContract(checkout({ role: "workflow", sourceLineId: "work-line",
    projectRelativePath: `.champcity/checkouts/${workflowId}` })).valid, false);
  assert.equal(validateRepositoryCheckoutContract(checkout({ role: "workflow", sourceLineId: "work-line", workflowId,
    projectRelativePath: `.champcity/checkouts/${workflowId.toUpperCase()}` })).valid, false);
});

test("existing redirect in managed topology is rejected", context => {
  const root = project(context);
  const external = project(context);
  const linkType = "junction";
  try {
    fs.symlinkSync(external, path.join(root, ".champcity"), linkType);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "EINVAL"].includes(error.code)) {
      context.skip(`Platform cannot create a directory redirect fixture (${error.code}).`);
      return;
    }
    throw error;
  }
  assert.throws(() => resolveManagedProjectSourceTopology(root), /redirect|topology/i);
});
