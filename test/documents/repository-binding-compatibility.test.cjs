const assert = require("node:assert/strict");
const test = require("node:test");

const {
  mergeRepositoryBindingIntoWorkflowData,
  repositoryBindingFromWorkflowData,
} = require("../../dist/main/documents/repositoryBinding.js");

test("legacy V1 repository binding field is normalized at read and removed from projected writes", () => {
  const legacyWorkflowData = {
    repositoryAuthority: {
      projectRepository: "Project_Alpha",
      mcpWorkspaceBinding: {
        mcpWorkspaceId: "project_alpha",
        repositoryName: "Example/Project_Alpha",
        gitBacked: true,
      },
    },
    stageId: "project-planning",
  };

  const binding = repositoryBindingFromWorkflowData(legacyWorkflowData);
  assert.deepEqual(binding, {
    projectRepository: "Project_Alpha",
    mcpWorkspaceBinding: {
      mcpWorkspaceId: "project_alpha",
      repositoryName: "Example/Project_Alpha",
      gitBacked: true,
    },
  });
  assert.equal("repositoryAuthority" in binding, false);

  const projected = mergeRepositoryBindingIntoWorkflowData(legacyWorkflowData, binding);
  assert.deepEqual(projected.repositoryBinding, binding);
  assert.equal("repositoryAuthority" in projected, false);
  assert.equal(projected.stageId, "project-planning");
});
