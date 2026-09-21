const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const {
  captureAgentHarnessPublicToolContract,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/runtime/mcpServer.js"));
const {
  createAgentHarnessToolRegistry,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/tools/toolRegistry.js"));
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/workspace/workspaceAccess.js"));
const {
  AgentHarnessError,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/core/errors.js"));

const RESERVED_TOOLBOX_NAMES = [
  "workspace_toolbox",
  "project_toolbox",
  "intake_toolbox",
  "planning_toolbox",
  "workflow_toolbox",
  "issue_toolbox",
  "agent_toolbox",
  "model_toolbox",
  "skill_toolbox",
  "memory_toolbox",
  "validation_toolbox",
  "test_toolbox",
  "development_toolbox",
  "system_toolbox",
  "network_toolbox",
  "data_toolbox",
  "security_toolbox",
  "observability_toolbox",
  "ui_toolbox",
  "deployment_toolbox",
  "automation_toolbox",
  "document_toolbox",
  "media_asset_toolbox",
  "model_asset_toolbox",
  "archive_toolbox",
];

const EXISTING_TOOL_ACTIONS = {
  repo_toolbox: [
    "status",
    "list_files",
    "read_file",
    "read_issue_screenshot",
    "inspect_text_file",
    "read_text_chunk",
    "read_text_lines",
    "read_markdown_section",
    "search_files",
    "copy_file",
    "move_file",
    "write_markdown_artifact",
    "write_json_artifact",
    "propose_patch",
    "apply_approved_patch",
  ],
  visual_asset_toolbox: ["read_image", "inspect_image", "compare_images", "create_image_preview"],
  git_toolbox: [
    "status",
    "diff",
    "changed_files",
    "inspect_commit",
    "compare_refs",
    "inspect_reflog",
    "inspect_isolated_operation",
    "list_worktrees",
    "inspect_worktree",
    "list_tags",
    "inspect_remotes",
    "pre_commit_scan",
    "readiness_summary",
    "inspect_branch_state",
    "inspect_history",
    "verify_tag",
    "create_branch_from_ref",
    "advance_branch_ref",
    "rename_branch",
    "set_branch_upstream",
    "unset_branch_upstream",
    "delete_remote_branch",
    "prepare_branch",
    "switch_branch",
    "fetch_remote",
    "fast_forward_branch",
    "merge_branch",
    "create_tag",
    "push_tag",
    "delete_tag",
    "delete_branch",
    "replace_branch_ref",
    "push_with_lease",
    "delete_untracked_paths",
    "discard_managed_worktree",
    "skip_isolated_operation_step",
    "begin_isolated_operation",
    "continue_isolated_operation",
    "abort_isolated_operation",
    "advance_isolated_operation",
    "create_worktree_from_ref",
    "create_worktree_for_branch",
    "remove_worktree",
    "unstage_changes",
    "restore_files",
    "stage_changes",
    "amend_commit",
    "revert_commit",
    "cherry_pick_commit",
    "commit",
    "push",
    "integrate_to_dev",
  ],
  artifact_toolbox: ["status", "replace_markdown_body", "write_markdown_artifact", "write_json_artifact"],
  diagnostics_toolbox: ["status", "list_workspaces", "tool_inventory"],
  release_toolbox: [
    "status",
    "set_version",
    "validate_candidate",
    "build_windows_release",
    "inspect_release_artifact",
    "publish_github_release",
    "abandon_github_draft_release",
    "verify_github_release",
  ],
  integration_toolbox: ["status"],
  browser_toolbox: ["status"],
  knowledge_toolbox: ["status"],
  workspace_write_attached_image: ["write_attached_image"],
};

const EXPECTED_TOOL_NAMES = [
  ...Object.keys(EXISTING_TOOL_ACTIONS),
  ...RESERVED_TOOLBOX_NAMES,
].sort();

test("HOTFIX10 publishes the exact stable top-level namespace and preserves existing actions", () => {
  const fixture = createWorkspace("Namespace_Project");
  const registry = createRegistry(fixture);
  const fullTools = registry.listTools("files.read files.write");
  const toolsByName = new Map(fullTools.map((tool) => [tool.name, tool]));

  assert.equal(fullTools.length, 35);
  assert.deepEqual([...toolsByName.keys()].sort(), EXPECTED_TOOL_NAMES);
  assert.equal(RESERVED_TOOLBOX_NAMES.length, 25);
  for (const [name, actions] of Object.entries(EXISTING_TOOL_ACTIONS)) {
    assert.deepEqual(toolsByName.get(name)?.actions, actions, name);
  }
  for (const name of RESERVED_TOOLBOX_NAMES) {
    assert.deepEqual(toolsByName.get(name)?.actions, ["status"], name);
  }

  const gitSchema = toolsByName.get("git_toolbox").inputZodSchema;
  for (const [action, params] of [
    ["create_branch_from_ref", { branchName: "feature", sourceRef: "dev" }],
    ["advance_branch_ref", { branchName: "feature", sourceRef: "dev", expectedCurrentCommit: "a".repeat(40) }],
    ["rename_branch", { branchName: "feature", newBranchName: "renamed" }],
    ["set_branch_upstream", { branchName: "feature", remote: "origin", remoteBranch: "dev" }],
    ["unset_branch_upstream", { branchName: "feature" }],
    ["delete_remote_branch", { remote: "origin", remoteBranch: "dev", expectedRemoteCommit: "a".repeat(40) }],
  ]) {
    const input = { workspaceId: fixture.workspaceId, action, params };
    assert.equal(gitSchema.safeParse(input).success, true, action);
    assert.equal(gitSchema.safeParse({ ...input, params: { ...params, force: true } }).success, false, action);
    for (const key of Object.keys(params)) {
      const missing = { ...params }; delete missing[key];
      assert.equal(gitSchema.safeParse({ ...input, params: missing }).success, false, action + ":" + key);
    }
  }
  const push = { workspaceId: fixture.workspaceId, action: "push", params: { remoteBranch: "other", setUpstream: true, expectedCommit: "a".repeat(40) } };
  assert.equal(gitSchema.safeParse(push).success, true);
  assert.equal(gitSchema.safeParse({ ...push, params: { setUpstream: "true" } }).success, false);
  assert.equal(gitSchema.safeParse({ ...push, params: {} }).success, true);
  const firstCapture = captureAgentHarnessPublicToolContract(registry, "files.read files.write");
  const secondCapture = captureAgentHarnessPublicToolContract(registry, "files.write files.read files.write");
  assert.equal(firstCapture.toolCount, 35);
  assert.equal(secondCapture.toolCount, 35);
  assert.equal(firstCapture.fingerprint, secondCapture.fingerprint);
  assert.deepEqual(firstCapture.tools, secondCapture.tools);
  assert.deepEqual(firstCapture.tools.map((tool) => tool.name).sort(), EXPECTED_TOOL_NAMES);
});

test("HOTFIX10 placeholders are strict read-only registered-Workspace status actions without side effects", async () => {
  const fixture = createWorkspace("Reserved_Status_Project");
  const registry = createRegistry(fixture);
  const readTools = new Map(registry.listTools("files.read").map((tool) => [tool.name, tool]));
  const writeToolNames = new Set(registry.listTools("files.write").map((tool) => tool.name));
  const beforeWorkspace = snapshotDirectory(fixture.root);
  const beforeUserData = snapshotDirectory(fixture.userDataRoot);

  for (const name of RESERVED_TOOLBOX_NAMES) {
    const tool = readTools.get(name);
    assert.ok(tool, name);
    assert.deepEqual(tool.actions, ["status"], name);
    assert.equal(tool.readOnly, true, name);
    assert.equal(writeToolNames.has(name), false, name);
    assert.equal(tool.inputZodSchema.safeParse({
      workspaceId: fixture.workspaceId,
      action: "status",
      params: {},
    }).success, true, name);
    assert.equal(tool.inputZodSchema.safeParse({
      workspaceId: fixture.workspaceId,
      action: "status",
      params: { unexpected: true },
    }).success, false, name);

    const result = await registry.callTool({
      name,
      arguments: { workspaceId: fixture.workspaceId, action: "status", params: {} },
      scope: "files.read",
    });
    assert.equal(result.ok, true, name);
    assert.deepEqual(result.payload, {
      toolbox: name,
      state: "reserved",
      implemented: false,
    }, name);

    const rejected = await registry.callTool({
      name,
      arguments: {
        workspaceId: fixture.workspaceId,
        action: "status",
        params: { unexpected: true },
      },
      scope: "files.read",
    });
    assert.equal(rejected.ok, false, name);
    assert.equal(rejected.error.code, "INVALID_INPUT", name);
  }

  const deniedScope = await registry.callTool({
    name: RESERVED_TOOLBOX_NAMES[0],
    arguments: { workspaceId: fixture.workspaceId, action: "status", params: {} },
    scope: "files.write",
  });
  assert.equal(deniedScope.ok, false);
  assert.equal(deniedScope.error.code, "OAUTH_SCOPE_DENIED");

  const foreignWorkspace = await registry.callTool({
    name: RESERVED_TOOLBOX_NAMES[0],
    arguments: { workspaceId: "foreign_workspace", action: "status", params: {} },
    scope: "files.read",
  });
  assert.equal(foreignWorkspace.ok, false);
  assert.equal(foreignWorkspace.error.code, "WORKSPACE_ACCESS_DENIED");
  assert.deepEqual(snapshotDirectory(fixture.root), beforeWorkspace);
  assert.deepEqual(snapshotDirectory(fixture.userDataRoot), beforeUserData);
});

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-reserved-toolboxes-"));
  const root = path.join(container, name);
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.mkdirSync(userDataRoot, { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "# Namespace fixture\n", "utf8");
  const workspaceId = name.toLowerCase();
  return { root, userDataRoot, workspaceId };
}

function createRegistry(fixture) {
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveWorkspaceRootContext(fixture.root);
      if (workspaceId !== fixture.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => [],
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: fixture.userDataRoot });
}

function snapshotDirectory(root) {
  const entries = [];
  function visit(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        entries.push({ relativePath, type: "directory" });
        visit(absolutePath, relativePath);
      } else {
        const bytes = fs.readFileSync(absolutePath);
        entries.push({
          relativePath,
          type: "file",
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      }
    }
  }
  visit(root);
  return entries;
}
