const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  resolveSelectedProjectContext,
  createSelectedProjectAuthorityProvider,
} = require("../../dist/main/agentHarness/workspace/workspaceAuthority.js");
const {
  listRepositoryFiles,
  readRepositoryFile,
  inspectRepositoryTextFile,
  readRepositoryTextChunk,
  readRepositoryTextLines,
  readRepositoryMarkdownSection,
  searchRepositoryFiles,
} = require("../../dist/main/agentHarness/repository/repositoryOperations.js");
const {
  applyApprovedPatch,
  registerPatchProposal,
} = require("../../dist/main/agentHarness/repository/patches.js");
const {
  createAgentHarnessToolRegistry,
} = require("../../dist/main/agentHarness/tools/toolRegistry.js");

test("Agent Harness core uses selected A/I project root for bounded repository operations", () => {
  const { root } = createWorkspace("ChampCity_PDL");
  const context = resolveSelectedProjectContext(root);

  assert.equal(context.workspaceId, "champcity_pdl");
  assert.equal(context.capabilities.filesystemRead, true);
  assert.equal(context.capabilities.patchWorkflow, true);
  assert.equal(context.capabilities.gitMutation, false);

  const listed = listRepositoryFiles(root);
  assert.ok(listed.files.includes("README.md"));
  assert.ok(listed.files.includes("docs/guide.md"));

  const inline = readRepositoryFile(root, context.workspaceId, "README.md");
  assert.equal(inline.contentComplete, true);
  assert.match(inline.content, /needle alpha/);

  const inspection = inspectRepositoryTextFile(root, context.workspaceId, "docs/guide.md");
  assert.equal(inspection.markdownDetected, true);
  assert.equal(inspection.headingIndex.length, 2);

  const first = readRepositoryTextChunk(root, context.workspaceId, {
    relativePath: "docs/large.txt",
    maximumBytes: 30,
    maximumLines: 10,
  });
  assert.equal(first.complete, false);
  assert.ok(first.nextCursor);
  const second = readRepositoryTextChunk(root, context.workspaceId, {
    cursor: first.nextCursor,
    maximumBytes: 500,
  });
  assert.equal(second.chunkIndex, 1);

  const lines = readRepositoryTextLines(root, context.workspaceId, {
    relativePath: "docs/guide.md",
    startLine: 2,
    maximumLines: 2,
  });
  assert.match(lines.text, /Intro line/);

  const section = readRepositoryMarkdownSection(root, context.workspaceId, {
    relativePath: "docs/guide.md",
    sectionId: inspection.headingIndex[1].sectionId,
  });
  assert.match(section.text, /Deep content/);

  const matches = searchRepositoryFiles(root, "needle");
  assert.ok(matches.matches.some((match) => match.relativePath === "README.md"));
  assert.throws(() => readRepositoryFile(root, context.workspaceId, "../outside.txt"), /Path traversal/);
  fs.writeFileSync(path.join(root, "binary.bin"), Buffer.from([0, 1, 2, 3]));
  assert.throws(() => readRepositoryFile(root, context.workspaceId, "binary.bin"), /Binary files are denied/);
});

test("Agent Harness repository listing does not follow out-of-root symlink directories", (t) => {
  const { root } = createWorkspace("Symlink_List_Project");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-outside-"));
  fs.writeFileSync(path.join(outside, "outside.txt"), "outside data\n", "utf8");
  const linkPath = path.join(root, "docs", "outside-link");
  if (!createDirectoryLink(outside, linkPath)) {
    t.skip("directory symlink or junction creation is unavailable in this environment");
    return;
  }

  const listed = listRepositoryFiles(root);

  assert.ok(listed.files.includes("README.md"));
  assert.ok(listed.files.includes("docs/guide.md"));
  assert.equal(listed.files.some((entry) => entry.includes("outside.txt")), false);
  assert.equal(listed.files.some((entry) => entry.includes("outside-link")), false);
});

test("Agent Harness patch proposals require exact hash and single-use application", () => {
  const { root, userDataRoot } = createWorkspace("Patch_Project");
  const patch = [
    "*** Begin Patch",
    "*** Update File: README.md",
    "@@",
    "-needle alpha",
    "+needle beta",
    "*** End Patch",
  ].join("\n");
  const proposal = registerPatchProposal(userDataRoot, root, patch);

  assert.throws(
    () => applyApprovedPatch(userDataRoot, root, patch.replace("beta", "gamma"), proposal.id, proposal.patchHash),
    /Patch hash does not match/,
  );
  const applied = applyApprovedPatch(userDataRoot, root, patch, proposal.id, proposal.patchHash);
  assert.deepEqual(applied.affectedFiles, ["README.md"]);
  assert.match(fs.readFileSync(path.join(root, "README.md"), "utf8"), /needle beta/);
  assert.throws(() => applyApprovedPatch(userDataRoot, root, patch, proposal.id, proposal.patchHash), /already been used/);
});

test("Agent Harness attached image writes enforce containment, image validation, and no overwrite", (t) => {
  const { root, userDataRoot } = createWorkspace("Attachment_Project");
  const authority = createSelectedProjectAuthorityProvider({
    getSelectedProjectRoot: () => root,
    isGitMutationAuthorized: () => false,
  });
  const registry = createAgentHarnessToolRegistry({ authority, userDataRoot });
  const validPng = onePixelPng();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-attachment-outside-"));
  const linkPath = path.join(root, "linked-output");
  if (!createDirectoryLink(outside, linkPath)) {
    t.skip("directory symlink or junction creation is unavailable in this environment");
    return;
  }

  const escaped = callAttachedImage(registry, "attachment_project", {
    relativePath: "linked-output/escape.png",
    base64: validPng.toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(escaped.ok, false);
  assert.equal(escaped.error.code, "PATH_DENIED");
  assert.equal(fs.existsSync(path.join(outside, "escape.png")), false);

  const invalidBytes = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/not-image.png",
    base64: Buffer.from("not an image").toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(invalidBytes.ok, false);
  assert.equal(invalidBytes.error.code, "FILE_DENIED");

  const mimeMismatch = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/mismatch.png",
    base64: validPng.toString("base64"),
    mimeType: "image/jpeg",
  });
  assert.equal(mimeMismatch.ok, false);
  assert.equal(mimeMismatch.error.code, "FILE_DENIED");

  const extensionMismatch = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/mismatch.jpg",
    base64: validPng.toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(extensionMismatch.ok, false);
  assert.equal(extensionMismatch.error.code, "FILE_DENIED");

  const tooLarge = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/too-large.png",
    base64: Buffer.alloc(5_000_001).toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.error.code, "FILE_DENIED");

  const tooWide = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/too-wide.png",
    base64: pngWithDimensions(4097, 1).toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(tooWide.ok, false);
  assert.equal(tooWide.error.code, "FILE_DENIED");

  const tooTall = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/too-tall.png",
    base64: pngWithDimensions(1, 4097).toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(tooTall.ok, false);
  assert.equal(tooTall.error.code, "FILE_DENIED");

  const tooManyPixels = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/too-many-pixels.png",
    base64: pngWithDimensions(4000, 4000).toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(tooManyPixels.ok, false);
  assert.equal(tooManyPixels.error.code, "FILE_DENIED");

  const createdPng = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/created.png",
    base64: validPng.toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(createdPng.ok, true);
  assert.equal(createdPng.payload.relativePath, "images/created.png");
  assert.equal(createdPng.payload.mimeType, "image/png");
  assert.equal(createdPng.payload.width, 1);
  assert.equal(createdPng.payload.height, 1);
  assert.equal(fs.existsSync(path.join(root, "images", "created.png")), true);

  const overwrite = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/created.png",
    base64: validPng.toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(overwrite.ok, false);
  assert.equal(overwrite.error.code, "FILE_DENIED");

  const createdJpeg = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/created.jpg",
    base64: jpegWithDimensions(2, 3).toString("base64"),
    mimeType: "image/jpeg",
  });
  assert.equal(createdJpeg.ok, true);
  assert.equal(createdJpeg.payload.mimeType, "image/jpeg");
  assert.equal(createdJpeg.payload.width, 2);
  assert.equal(createdJpeg.payload.height, 3);

  const createdWebp = callAttachedImage(registry, "attachment_project", {
    relativePath: "images/created.webp",
    base64: webpWithDimensions(4, 5).toString("base64"),
    mimeType: "image/webp",
  });
  assert.equal(createdWebp.ok, true);
  assert.equal(createdWebp.payload.mimeType, "image/webp");
  assert.equal(createdWebp.payload.width, 4);
  assert.equal(createdWebp.payload.height, 5);
});

test("Agent Harness public registry rejects foreign workspace IDs and unauthorized Git mutation", () => {
  const { root, userDataRoot } = createWorkspace("FO76_Collector");
  const authority = createSelectedProjectAuthorityProvider({
    getSelectedProjectRoot: () => root,
    isGitMutationAuthorized: () => false,
  });
  const registry = createAgentHarnessToolRegistry({ authority, userDataRoot });
  const toolNames = registry.listTools().map((tool) => tool.name);

  assert.ok(toolNames.includes("repo_toolbox"));
  assert.ok(toolNames.includes("diagnostics_toolbox"));
  assert.equal(toolNames.includes("execution_toolbox"), false);

  const status = registry.callTool({
    name: "repo_toolbox",
    arguments: { workspaceId: "fo76_collector", action: "status" },
    scope: "files.read",
  });
  assert.equal(status.ok, true);

  const foreign = registry.callTool({
    name: "repo_toolbox",
    arguments: { workspaceId: "champcity_ai", action: "status" },
    scope: "files.read",
  });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.error.code, "AUTHORITY_DENIED");

  const mutation = registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId: "fo76_collector", action: "commit" },
    scope: "files.write",
  });
  assert.equal(mutation.ok, false);
  assert.equal(mutation.error.code, "GIT_MUTATION_DENIED");
});

test("Agent Harness public registry exposes only action-scoped read contracts under files.read", () => {
  const { root, userDataRoot } = createWorkspace("Read_Scoped_Project");
  const authority = createSelectedProjectAuthorityProvider({
    getSelectedProjectRoot: () => root,
    isGitMutationAuthorized: () => false,
  });
  const registry = createAgentHarnessToolRegistry({ authority, userDataRoot });
  const readTools = registry.listTools("files.read");
  const byName = new Map(readTools.map((tool) => [tool.name, tool]));

  assert.ok(byName.has("repo_toolbox"));
  const repoTool = byName.get("repo_toolbox");
  assert.ok(repoTool.actions.includes("read_file"));
  assert.equal(repoTool.actions.includes("write_markdown_artifact"), false);
  assert.equal(repoTool.readOnly, true);
  assert.equal(schemaHasEnumValue(repoTool.inputSchema.properties.action, "read_file"), true);
  assert.equal(schemaHasUnconstrainedStringBranch(repoTool.inputSchema.properties.action), false);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "read_file",
    params: { relativePath: "README.md" },
  }), true);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "not_supported",
  }), false);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "read_file",
  }), false);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "read_file",
    params: { relativePath: "README.md", ignored: true },
  }), false);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "search_files",
    params: {},
  }), false);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "list_files",
    params: { directory: "docs", maxFiles: 10 },
  }), true);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "write_markdown_artifact",
    params: { relativePath: "planning/denied.md", content: "# Denied\n" },
  }), false);

  assert.ok(byName.has("git_toolbox"));
  assert.ok(byName.get("git_toolbox").actions.includes("status"));
  assert.equal(byName.get("git_toolbox").actions.includes("commit"), false);
  assert.equal(byName.get("git_toolbox").readOnly, true);

  assert.ok(byName.has("artifact_toolbox"));
  assert.deepEqual(byName.get("artifact_toolbox").actions, ["status"]);
  assert.equal(byName.has("workspace_write_attached_image"), false);
});

test("Agent Harness direct write calls require files.write before provider dispatch", () => {
  const { root, userDataRoot } = createWorkspace("Write_Denied_Project");
  const authority = createSelectedProjectAuthorityProvider({
    getSelectedProjectRoot: () => root,
    isGitMutationAuthorized: () => false,
  });
  const registry = createAgentHarnessToolRegistry({ authority, userDataRoot });
  const patch = [
    "*** Begin Patch",
    "*** Update File: README.md",
    "@@",
    "-needle alpha",
    "+needle denied",
    "*** End Patch",
  ].join("\n");
  const writeCalls = [
    {
      name: "repo_toolbox",
      arguments: { workspaceId: "write_denied_project", action: "write_markdown_artifact", params: { relativePath: "planning/denied.md", content: "# Denied\n" } },
      expectedPath: "planning/denied.md",
    },
    {
      name: "repo_toolbox",
      arguments: { workspaceId: "write_denied_project", action: "write_json_artifact", params: { relativePath: "planning/denied.json", content: "{\"denied\":true}" } },
      expectedPath: "planning/denied.json",
    },
    {
      name: "repo_toolbox",
      arguments: { workspaceId: "write_denied_project", action: "propose_patch", params: { patch } },
    },
    {
      name: "repo_toolbox",
      arguments: { workspaceId: "write_denied_project", action: "apply_approved_patch", params: { patch, proposalId: "proposal", patchHash: "hash" } },
    },
    {
      name: "artifact_toolbox",
      arguments: { workspaceId: "write_denied_project", action: "write_markdown_artifact", params: { relativePath: "planning/artifact-denied.md", content: "# Denied\n" } },
      expectedPath: "planning/artifact-denied.md",
    },
    {
      name: "workspace_write_attached_image",
      arguments: { workspaceId: "write_denied_project", action: "write_attached_image", params: { relativePath: "planning/denied.png", base64: Buffer.from("png").toString("base64"), mimeType: "image/png" } },
      expectedPath: "planning/denied.png",
    },
    ...["prepare_branch", "stage_changes", "commit", "push", "integrate_to_dev"].map((action) => ({
      name: "git_toolbox",
      arguments: { workspaceId: "write_denied_project", action },
    })),
  ];

  for (const call of writeCalls) {
    const result = registry.callTool({ ...call, scope: "files.read" });
    assert.equal(result.ok, false, call.arguments.action);
    assert.equal(result.error.code, "OAUTH_SCOPE_DENIED", call.arguments.action);
    if (call.expectedPath) {
      assert.equal(fs.existsSync(path.join(root, call.expectedPath)), false, call.expectedPath);
    }
  }
  assert.match(fs.readFileSync(path.join(root, "README.md"), "utf8"), /needle alpha/);
  assert.equal(fs.existsSync(path.join(userDataRoot, "agent-harness", "generated", "pending-patches.local.json")), false);
});

test("Agent Harness action contracts reject unsupported actions and unknown or malformed params", () => {
  const { root, userDataRoot } = createWorkspace("Param_Project");
  const authority = createSelectedProjectAuthorityProvider({
    getSelectedProjectRoot: () => root,
    isGitMutationAuthorized: () => false,
  });
  const registry = createAgentHarnessToolRegistry({ authority, userDataRoot });
  const invalidCalls = [
    {
      arguments: { workspaceId: "param_project", action: "not_supported" },
      message: "unsupported action",
    },
    {
      arguments: { workspaceId: "param_project", action: "read_file", params: { relativePath: "README.md", ignored: true } },
      message: "unknown param",
    },
    {
      arguments: { workspaceId: "param_project", action: "list_files", params: { maxFiles: "100" } },
      message: "malformed param",
    },
    {
      arguments: { workspaceId: "param_project", action: "search_files", params: {} },
      message: "missing required param",
    },
    {
      arguments: { workspaceId: "param_project", action: "status", params: [] },
      message: "params object",
    },
  ];

  for (const call of invalidCalls) {
    const result = registry.callTool({ name: "repo_toolbox", arguments: call.arguments, scope: "files.read files.write" });
    assert.equal(result.ok, false, call.message);
    assert.equal(result.error.code, "INVALID_INPUT", call.message);
  }
});

function schemaHasEnumValue(schema, value) {
  if (!schema || typeof schema !== "object") {
    return false;
  }
  if (schema.const === value) {
    return true;
  }
  if (Array.isArray(schema.enum) && schema.enum.includes(value)) {
    return true;
  }
  for (const key of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(schema[key]) && schema[key].some((entry) => schemaHasEnumValue(entry, value))) {
      return true;
    }
  }
  return false;
}

function schemaHasUnconstrainedStringBranch(schema) {
  if (!schema || typeof schema !== "object") {
    return false;
  }
  if (schema.type === "string" && !schema.const && !Array.isArray(schema.enum)) {
    return true;
  }
  for (const key of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(schema[key]) && schema[key].some((entry) => schemaHasUnconstrainedStringBranch(entry))) {
      return true;
    }
  }
  return false;
}

function schemaAccepts(schema, value) {
  return schemaErrors(schema, value).length === 0;
}

function schemaErrors(schema, value) {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  const errors = [];
  if (schema.const !== undefined && value !== schema.const) {
    errors.push("const");
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push("enum");
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push("object");
    } else {
      for (const required of schema.required ?? []) {
        if (value[required] === undefined) {
          errors.push(`required:${required}`);
        }
      }
      const properties = schema.properties ?? {};
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.hasOwn(properties, key)) {
            errors.push(`unknown:${key}`);
          }
        }
      }
      for (const [key, propertySchema] of Object.entries(properties)) {
        if (value[key] !== undefined) {
          errors.push(...schemaErrors(propertySchema, value[key]).map((error) => `${key}.${error}`));
        }
      }
    }
  } else if (schema.type === "string" && typeof value !== "string") {
    errors.push("string");
  } else if (schema.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    errors.push("number");
  } else if (schema.type === "boolean" && typeof value !== "boolean") {
    errors.push("boolean");
  }
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((entry) => schemaErrors(entry, value).length === 0).length;
    if (matches !== 1) {
      errors.push("oneOf");
    }
  }
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((entry) => schemaErrors(entry, value).length === 0)) {
    errors.push("anyOf");
  }
  if (Array.isArray(schema.allOf)) {
    for (const entry of schema.allOf) {
      errors.push(...schemaErrors(entry, value));
    }
  }
  return errors;
}

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-harness-"));
  const root = path.join(container, name);
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "needle alpha\n", "utf8");
  fs.writeFileSync(path.join(root, "docs", "guide.md"), "# Intro\nIntro line\n## Deep\nDeep content\n", "utf8");
  fs.writeFileSync(path.join(root, "docs", "large.txt"), Array.from({ length: 40 }, (_, index) => `line ${index}`).join("\n"), "utf8");
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  return { root, userDataRoot };
}

function callAttachedImage(registry, workspaceId, params) {
  return registry.callTool({
    name: "workspace_write_attached_image",
    arguments: { workspaceId, action: "write_attached_image", params },
    scope: "files.read files.write",
  });
}

function createDirectoryLink(target, linkPath) {
  try {
    fs.symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch {
    return false;
  }
}

function onePixelPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
}

function pngWithDimensions(width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  return buffer;
}

function jpegWithDimensions(width, height) {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

function webpWithDimensions(width, height) {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  writeUInt24LE(buffer, 24, width - 1);
  writeUInt24LE(buffer, 27, height - 1);
  return buffer;
}

function writeUInt24LE(buffer, offset, value) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
}
