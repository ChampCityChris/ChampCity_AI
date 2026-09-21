const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  resolveWorkspaceRootContext: resolveSelectedProjectContext,
  createRegisteredWorkspaceAccessProvider,
} = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");

function createSelectedProjectAccessProvider(options) {
  return createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveSelectedProjectContext(options.getSelectedProjectRoot());
      if (workspaceId !== context.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => {
      const context = resolveSelectedProjectContext(options.getSelectedProjectRoot());
      return [{
        workspaceId: context.workspaceId,
        repositoryName: context.repositoryName,
        gitBacked: context.gitBacked,
        availability: "available",
      }];
    },
  });
}
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
const {
  inspectControlledMarkdownDraft,
} = require("../../dist/main/agentHarness/repository/controlledMarkdownDrafts.js");
const {
  readIssueScreenshotEvidence,
} = require("../../dist/main/agentHarness/repository/issueScreenshotEvidence.js");
const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");

test("Agent Harness core uses an exact registered project root for bounded repository operations", async () => {
  const { root } = createWorkspace("ChampCity_PDL");
  const context = resolveSelectedProjectContext(root);

  assert.equal(context.workspaceId, "champcity_pdl");
  assert.equal(context.capabilities.filesystemRead, true);
  assert.equal(context.capabilities.patchWorkflow, true);
  assert.equal("gitMutation" in context.capabilities, false);

  const listed = await listRepositoryFiles(root);
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

  const matches = await searchRepositoryFiles(root, "needle");
  assert.ok(matches.matches.some((match) => match.relativePath === "README.md"));
  assert.throws(() => readRepositoryFile(root, context.workspaceId, "../outside.txt"), /Path traversal/);
  fs.writeFileSync(path.join(root, "binary.bin"), Buffer.from([0, 1, 2, 3]));
  assert.throws(() => readRepositoryFile(root, context.workspaceId, "binary.bin"), /Binary files are denied/);
});

test("Agent Harness repository listing does not follow out-of-root symlink directories", async (t) => {
  const { root } = createWorkspace("Symlink_List_Project");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-outside-"));
  fs.writeFileSync(path.join(outside, "outside.txt"), "outside data\n", "utf8");
  const linkPath = path.join(root, "docs", "outside-link");
  if (!createDirectoryLink(outside, linkPath)) {
    t.skip("directory symlink or junction creation is unavailable in this environment");
    return;
  }

  const listed = await listRepositoryFiles(root);

  assert.ok(listed.files.includes("README.md"));
  assert.ok(listed.files.includes("docs/guide.md"));
  assert.equal(listed.files.some((entry) => entry.includes("outside.txt")), false);
  assert.equal(listed.files.some((entry) => entry.includes("outside-link")), false);
});

test("Issue screenshot evidence reads valid PNG, JPEG, and WEBP bytes with bounded metadata", () => {
  const { root } = createWorkspace("Issue_Screenshot_Project");
  const cases = [
    ["issues/ISSUE_005/evidence/screenshot-001.png", onePixelPng(), "image/png", 1, 1],
    ["issues/ISSUE_005/evidence/screenshot-002.jpg", jpegWithDimensions(2, 3), "image/jpeg", 2, 3],
    ["issues/ISSUE_005/evidence/screenshot-003.webp", webpWithDimensions(4, 5), "image/webp", 4, 5],
  ];

  for (const [relativePath, bytes, mimeType, width, height] of cases) {
    writeWorkspaceFile(root, relativePath, bytes);
    const result = readIssueScreenshotEvidence(root, relativePath);
    assert.deepEqual({
      relativePath: result.relativePath,
      mimeType: result.mimeType,
      bytes: result.bytes,
      sha256: result.sha256,
      width: result.width,
      height: result.height,
      pixels: result.pixels,
    }, {
      relativePath,
      mimeType,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width,
      height,
      pixels: width * height,
    });
    assert.deepEqual(Buffer.from(result.imageBase64, "base64"), bytes);
    assert.equal(JSON.stringify(result).includes(root), false);
  }
});

test("Issue screenshot evidence rejects ineligible paths, invalid bytes, mismatched formats, and bounds", () => {
  const { root } = createWorkspace("Issue_Screenshot_Denials");
  const validPng = onePixelPng();
  for (const relativePath of [
    "images/screenshot-001.png",
    "issues/ISSUE_X/evidence/screenshot-001.png",
    "issues/ISSUE_005/evidence/screenshot-01.png",
    "issues/ISSUE_005/evidence/arbitrary-001.png",
  ]) {
    writeWorkspaceFile(root, relativePath, validPng);
    assert.throws(
      () => readIssueScreenshotEvidence(root, relativePath),
      /Only persisted Issue screenshot evidence/,
      relativePath,
    );
  }

  assert.throws(
    () => readIssueScreenshotEvidence(root, "../outside.png"),
    /Path traversal is not allowed/,
  );
  assert.throws(
    () => readIssueScreenshotEvidence(root, path.resolve(root, "issues/ISSUE_005/evidence/screenshot-001.png")),
    /repository-relative path/,
  );

  const directoryPath = "issues/ISSUE_006/evidence/screenshot-001.png";
  fs.mkdirSync(path.join(root, directoryPath), { recursive: true });
  assert.throws(() => readIssueScreenshotEvidence(root, directoryPath), /regular file/);

  const invalidCases = [
    ["issues/ISSUE_007/evidence/screenshot-001.png", Buffer.alloc(0), /empty/],
    ["issues/ISSUE_007/evidence/screenshot-002.png", Buffer.alloc(5_000_001), /5,000,000-byte limit/],
    ["issues/ISSUE_007/evidence/screenshot-003.png", Buffer.from("GIF89a", "ascii"), /not a supported PNG/],
    ["issues/ISSUE_007/evidence/screenshot-004.png", onePixelPng().subarray(0, 16), /not a supported PNG/],
    ["issues/ISSUE_007/evidence/screenshot-005.jpg", validPng, /extension does not match/],
    ["issues/ISSUE_007/evidence/screenshot-006.png", pngWithDimensions(4097, 1), /dimensions exceed/],
    ["issues/ISSUE_007/evidence/screenshot-007.png", pngWithDimensions(1, 4097), /dimensions exceed/],
    ["issues/ISSUE_007/evidence/screenshot-008.png", pngWithDimensions(4096, 3000), /12,000,000-pixel limits/],
  ];
  for (const [relativePath, bytes, expectedError] of invalidCases) {
    writeWorkspaceFile(root, relativePath, bytes);
    assert.throws(() => readIssueScreenshotEvidence(root, relativePath), expectedError, relativePath);
  }
});

test("Issue screenshot evidence canonical-path enforcement rejects an out-of-repository link", (t) => {
  const { root } = createWorkspace("Issue_Screenshot_Link_Project");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-issue-screenshot-outside-"));
  fs.writeFileSync(path.join(outside, "screenshot-001.png"), onePixelPng());
  const evidenceLink = path.join(root, "issues", "ISSUE_008", "evidence");
  fs.mkdirSync(path.dirname(evidenceLink), { recursive: true });
  if (!createDirectoryLink(outside, evidenceLink)) {
    t.skip("directory symlink or junction creation is unavailable in this environment");
    return;
  }

  assert.throws(
    () => readIssueScreenshotEvidence(root, "issues/ISSUE_008/evidence/screenshot-001.png"),
    /escapes the selected repository root/,
  );
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

test("Agent Harness attached image writes enforce containment, image validation, and no overwrite", async (t) => {
  const { root, userDataRoot } = createWorkspace("Attachment_Project");
  const workspaceAccess = createSelectedProjectAccessProvider({
    getSelectedProjectRoot: () => root,
  });
  const registry = createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot });
  const validPng = onePixelPng();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-agent-attachment-outside-"));
  const linkPath = path.join(root, "linked-output");
  if (!createDirectoryLink(outside, linkPath)) {
    t.skip("directory symlink or junction creation is unavailable in this environment");
    return;
  }

  const escaped = await callAttachedImage(registry, "attachment_project", {
    relativePath: "linked-output/escape.png",
    base64: validPng.toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(escaped.ok, false);
  assert.equal(escaped.error.code, "PATH_DENIED");
  assert.equal(fs.existsSync(path.join(outside, "escape.png")), false);

  const invalidBytes = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/not-image.png",
    base64: Buffer.from("not an image").toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(invalidBytes.ok, false);
  assert.equal(invalidBytes.error.code, "FILE_DENIED");

  const mimeMismatch = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/mismatch.png",
    base64: validPng.toString("base64"),
    mimeType: "image/jpeg",
  });
  assert.equal(mimeMismatch.ok, false);
  assert.equal(mimeMismatch.error.code, "FILE_DENIED");

  const extensionMismatch = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/mismatch.jpg",
    base64: validPng.toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(extensionMismatch.ok, false);
  assert.equal(extensionMismatch.error.code, "FILE_DENIED");

  const tooLarge = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/too-large.png",
    base64: Buffer.alloc(5_000_001).toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.error.code, "FILE_DENIED");

  const tooWide = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/too-wide.png",
    base64: pngWithDimensions(4097, 1).toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(tooWide.ok, false);
  assert.equal(tooWide.error.code, "FILE_DENIED");

  const tooTall = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/too-tall.png",
    base64: pngWithDimensions(1, 4097).toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(tooTall.ok, false);
  assert.equal(tooTall.error.code, "FILE_DENIED");

  const tooManyPixels = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/too-many-pixels.png",
    base64: pngWithDimensions(4000, 4000).toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(tooManyPixels.ok, false);
  assert.equal(tooManyPixels.error.code, "FILE_DENIED");

  const createdPng = await callAttachedImage(registry, "attachment_project", {
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

  const overwrite = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/created.png",
    base64: validPng.toString("base64"),
    mimeType: "image/png",
  });
  assert.equal(overwrite.ok, false);
  assert.equal(overwrite.error.code, "FILE_DENIED");

  const createdJpeg = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/created.jpg",
    base64: jpegWithDimensions(2, 3).toString("base64"),
    mimeType: "image/jpeg",
  });
  assert.equal(createdJpeg.ok, true);
  assert.equal(createdJpeg.payload.mimeType, "image/jpeg");
  assert.equal(createdJpeg.payload.width, 2);
  assert.equal(createdJpeg.payload.height, 3);

  const createdWebp = await callAttachedImage(registry, "attachment_project", {
    relativePath: "images/created.webp",
    base64: webpWithDimensions(4, 5).toString("base64"),
    mimeType: "image/webp",
  });
  assert.equal(createdWebp.ok, true);
  assert.equal(createdWebp.payload.mimeType, "image/webp");
  assert.equal(createdWebp.payload.width, 4);
  assert.equal(createdWebp.payload.height, 5);
});

test("Agent Harness public registry rejects foreign workspace IDs and unavailable Git capability", async () => {
  const { root, userDataRoot } = createWorkspace("FO76_Collector");
  const workspaceAccess = createSelectedProjectAccessProvider({
    getSelectedProjectRoot: () => root,
  });
  const registry = createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot });
  const toolNames = registry.listTools().map((tool) => tool.name);

  assert.ok(toolNames.includes("repo_toolbox"));
  assert.ok(toolNames.includes("diagnostics_toolbox"));
  assert.equal(toolNames.includes("execution_toolbox"), false);

  const status = await registry.callTool({
    name: "repo_toolbox",
    arguments: { workspaceId: "fo76_collector", action: "status" },
    scope: "files.read",
  });
  assert.equal(status.ok, true);

  const artifactStatus = await registry.callTool({
    name: "artifact_toolbox",
    arguments: { workspaceId: "fo76_collector", action: "status" },
    scope: "files.read",
  });
  assert.equal(artifactStatus.ok, true);
  assert.equal(artifactStatus.payload.canonicalSource, "ChampCity A/I planning document services");
  assert.deepEqual(Object.keys(artifactStatus.payload).sort(), ["canonicalSource", "genericPersistenceOnly"]);

  const foreign = await registry.callTool({
    name: "repo_toolbox",
    arguments: { workspaceId: "champcity_ai", action: "status" },
    scope: "files.read",
  });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.error.code, "WORKSPACE_ACCESS_DENIED");

  const mutation = await registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId: "fo76_collector", action: "commit", params: { message: "bounded test" } },
    scope: "files.write",
  });
  assert.equal(mutation.ok, false);
  assert.equal(mutation.error.code, "GIT_CAPABILITY_UNAVAILABLE");
});

test("Agent Harness public registry exposes only action-scoped read contracts under files.read", () => {
  const { root, userDataRoot } = createWorkspace("Read_Scoped_Project");
  const workspaceAccess = createSelectedProjectAccessProvider({
    getSelectedProjectRoot: () => root,
  });
  const registry = createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot });
  const readTools = registry.listTools("files.read");
  const byName = new Map(readTools.map((tool) => [tool.name, tool]));

  assert.ok(byName.has("repo_toolbox"));
  const repoTool = byName.get("repo_toolbox");
  assert.ok(repoTool.actions.includes("read_file"));
  assert.ok(repoTool.actions.includes("read_issue_screenshot"));
  assert.equal(repoTool.actions.includes("write_markdown_artifact"), false);
  assert.equal(repoTool.readOnly, true);
  assert.equal(schemaHasEnumValue(repoTool.inputSchema.properties.action, "read_file"), true);
  assert.equal(schemaHasEnumValue(repoTool.inputSchema.properties.action, "read_issue_screenshot"), true);
  assert.equal(schemaHasUnconstrainedStringBranch(repoTool.inputSchema.properties.action), false);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "read_file",
    params: { relativePath: "README.md" },
  }), true);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "read_issue_screenshot",
    params: { relativePath: "issues/ISSUE_005/evidence/screenshot-001.png" },
  }), true);
  assert.equal(schemaAccepts(repoTool.inputSchema, {
    workspaceId: "read_scoped_project",
    action: "read_issue_screenshot",
    params: { relativePath: "issues/ISSUE_005/evidence/screenshot-001.png", ignored: true },
  }), false);
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

test("Issue screenshot action uses existing workspace binding and files.read scope", async () => {
  const { root, userDataRoot } = createWorkspace("Screenshot_Access_Project");
  const relativePath = "issues/ISSUE_009/evidence/screenshot-001.png";
  writeWorkspaceFile(root, relativePath, onePixelPng());
  const workspaceAccess = createSelectedProjectAccessProvider({
    getSelectedProjectRoot: () => root,
  });
  const registry = createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot });
  const arguments = {
    workspaceId: "screenshot_access_project",
    action: "read_issue_screenshot",
    params: { relativePath },
  };

  const allowed = await registry.callTool({ name: "repo_toolbox", arguments, scope: "files.read" });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.payload.relativePath, relativePath);

  const foreign = await registry.callTool({
    name: "repo_toolbox",
    arguments: { ...arguments, workspaceId: "foreign_workspace" },
    scope: "files.read",
  });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.error.code, "WORKSPACE_ACCESS_DENIED");

  const missingReadScope = await registry.callTool({ name: "repo_toolbox", arguments, scope: "files.write" });
  assert.equal(missingReadScope.ok, false);
  assert.equal(missingReadScope.error.code, "OAUTH_SCOPE_DENIED");
});

for (const draftType of ["fix-card-draft", "repair-work-card-draft"]) {
test(`artifact_toolbox replace_markdown_body preserves ${draftType} metadata and rejects stale or unsafe writes`, async () => {
  const { root, userDataRoot } = createWorkspace("Controlled_Draft_Project");
  const workspaceAccess = createSelectedProjectAccessProvider({
    getSelectedProjectRoot: () => root,
  });
  const registry = createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot });
  const relativePath = "issues/Architect_Drafts/submission-001/fix-card-contract.md";
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const metadata = controlledFixCardDraftMetadata(relativePath, "submission-001");
  if (draftType === "repair-work-card-draft") {
    metadata.artifactType = draftType;
    metadata.identity.repairId = "ISSUE_200-FC01-REPAIR01";
    metadata.identity.parentImplementationId = "ISSUE_200-FC01";
    metadata.workflowData.parentImplementationPath = metadata.workflowData.finalFixCardTarget;
    metadata.workflowData.finalRepairTarget = "issues/ISSUE_200/Repairs/ISSUE_200-FC01-REPAIR01_test.md";
    metadata.workflowData.validationRecordPath = "issues/ISSUE_200/Validation_Records/VALIDATION_RECORD_ISSUE_200-FC01_ATTEMPT01.md";
    metadata.workflowData.boundedDefect = "Exact bounded defect";
    metadata.workflowData.returnTarget = "review-validation";
    delete metadata.workflowData.finalFixCardTarget;
  }
  fs.writeFileSync(absolutePath, serializeCanonicalMarkdownDocument(metadata, ""), "utf8");
  const before = inspectControlledMarkdownDraft(root, relativePath);

  const bodyMarkdown = "# ISSUE_200-FC01\n\nThe current Development Phase uses phaseId and Current Phase wording.\n";
  const written = await registry.callTool({
    name: "artifact_toolbox",
    arguments: {
      workspaceId: "controlled_draft_project",
      action: "replace_markdown_body",
      params: {
        relativePath,
        submissionId: "submission-001",
        expectedMetadataSha256: before.metadataSha256,
        expectedBodySha256: before.bodySha256,
        bodyMarkdown,
      },
    },
    scope: "files.write",
  });
  assert.equal(written.ok, true);
  assert.equal(written.payload.submissionId, "submission-001");
  const after = inspectControlledMarkdownDraft(root, relativePath);
  assert.equal(after.metadataSha256, before.metadataSha256);
  assert.deepEqual(after.metadata, metadata);
  assert.equal(parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8")).bodyMarkdown, bodyMarkdown);

  const staleWriter = await registry.callTool({
    name: "artifact_toolbox",
    arguments: {
      workspaceId: "controlled_draft_project",
      action: "replace_markdown_body",
      params: {
        relativePath,
        submissionId: "submission-001",
        expectedMetadataSha256: before.metadataSha256,
        expectedBodySha256: before.bodySha256,
        bodyMarkdown: "# Stale body must not win\n",
      },
    },
    scope: "files.write",
  });
  assert.equal(staleWriter.ok, false);
  assert.equal(staleWriter.error.code, "STALE_SOURCE");
  assert.equal(inspectControlledMarkdownDraft(root, relativePath).bodySha256, after.bodySha256);

  const freshWriter = await registry.callTool({
    name: "artifact_toolbox",
    arguments: {
      workspaceId: "controlled_draft_project",
      action: "replace_markdown_body",
      params: {
        relativePath,
        submissionId: "submission-001",
        expectedMetadataSha256: after.metadataSha256,
        expectedBodySha256: after.bodySha256,
        bodyMarkdown: "# Fresh follow-up body\n",
      },
    },
    scope: "files.write",
  });
  assert.equal(freshWriter.ok, true);
  const current = inspectControlledMarkdownDraft(root, relativePath);
  assert.equal(freshWriter.payload.bodySha256, current.bodySha256);
  assert.equal(freshWriter.payload.fileSha256, current.fileSha256);

  for (const [label, overrides, expectedCode] of [
    ["wrong submission", { submissionId: "submission-999" }, "CONTROLLED_DRAFT_DENIED"],
    ["stale metadata", { expectedMetadataSha256: "0".repeat(64) }, "STALE_SOURCE"],
    ["path escape", { relativePath: "../outside.md" }, "PATH_DENIED"],
    ["oversize body", { bodyMarkdown: "x".repeat(500_001) }, "FILE_DENIED"],
  ]) {
    const result = await registry.callTool({
      name: "artifact_toolbox",
      arguments: {
        workspaceId: "controlled_draft_project",
        action: "replace_markdown_body",
        params: {
          relativePath,
          submissionId: "submission-001",
          expectedMetadataSha256: before.metadataSha256,
          expectedBodySha256: current.bodySha256,
          bodyMarkdown: "# Safe body\n",
          ...overrides,
        },
      },
      scope: "files.write",
    });
    assert.equal(result.ok, false, label);
    assert.equal(result.error.code, expectedCode, label);
  }

  const symlinkPath = path.join(root, "issues", "Architect_Drafts", "submission-link", "fix-card-contract.md");
  fs.mkdirSync(path.dirname(symlinkPath), { recursive: true });
  try {
    fs.symlinkSync(absolutePath, symlinkPath, "file");
    const symlinkResult = await registry.callTool({
      name: "artifact_toolbox",
      arguments: {
        workspaceId: "controlled_draft_project",
        action: "replace_markdown_body",
        params: {
          relativePath: "issues/Architect_Drafts/submission-link/fix-card-contract.md",
          submissionId: "submission-001",
          expectedMetadataSha256: before.metadataSha256,
          expectedBodySha256: current.bodySha256,
          bodyMarkdown: "# Must be denied\n",
        },
      },
      scope: "files.write",
    });
    assert.equal(symlinkResult.ok, false);
    assert.equal(symlinkResult.error.code, "FILE_DENIED");
  } catch (error) {
    if (error?.code !== "EPERM") {
      throw error;
    }
  }

  const beforeDeniedWholeFileWrite = fs.readFileSync(absolutePath, "utf8");
  const deniedWholeFileWrite = await registry.callTool({
    name: "artifact_toolbox",
    arguments: {
      workspaceId: "controlled_draft_project",
      action: "write_markdown_artifact",
      params: { relativePath, content: "# Whole-file bypass\n", overwrite: true },
    },
    scope: "files.write",
  });
  assert.equal(deniedWholeFileWrite.ok, false);
  assert.equal(deniedWholeFileWrite.error.code, "CONTROLLED_DRAFT_DENIED");
  assert.equal(fs.readFileSync(absolutePath, "utf8"), beforeDeniedWholeFileWrite);

  const ordinaryCreate = await registry.callTool({
    name: "artifact_toolbox",
    arguments: {
      workspaceId: "controlled_draft_project",
      action: "write_markdown_artifact",
      params: { relativePath: "planning/ordinary-output.md", content: "# Ordinary output\n", overwrite: false },
    },
    scope: "files.write",
  });
  assert.equal(ordinaryCreate.ok, true);

  const patch = [
    "*** Begin Patch",
    `*** Update File: ${relativePath}`,
    "@@",
    "-# Fresh follow-up body",
    "+# Patch bypass",
    "*** End Patch",
  ].join("\n");
  const proposal = await registry.callTool({
    name: "repo_toolbox",
    arguments: { workspaceId: "controlled_draft_project", action: "propose_patch", params: { patch } },
    scope: "files.write",
  });
  assert.equal(proposal.ok, true);
  const deniedPatch = await registry.callTool({
    name: "repo_toolbox",
    arguments: {
      workspaceId: "controlled_draft_project",
      action: "apply_approved_patch",
      params: { patch, proposalId: proposal.payload.id, patchHash: proposal.payload.patchHash },
    },
    scope: "files.write",
  });
  assert.equal(deniedPatch.ok, false);
  assert.equal(deniedPatch.error.code, "CONTROLLED_DRAFT_DENIED");
  assert.equal(fs.readFileSync(absolutePath, "utf8"), beforeDeniedWholeFileWrite);
});
}

test("Agent Harness direct write calls require files.write before provider dispatch", async () => {
  const { root, userDataRoot } = createWorkspace("Write_Denied_Project");
  const workspaceAccess = createSelectedProjectAccessProvider({
    getSelectedProjectRoot: () => root,
  });
  const registry = createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot });
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
    ...[
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
    ].map((action) => ({
      name: "git_toolbox",
      arguments: { workspaceId: "write_denied_project", action },
    })),
  ];

  for (const call of writeCalls) {
    const result = await registry.callTool({ ...call, scope: "files.read" });
    assert.equal(result.ok, false, call.arguments.action);
    assert.equal(result.error.code, "OAUTH_SCOPE_DENIED", call.arguments.action);
    if (call.expectedPath) {
      assert.equal(fs.existsSync(path.join(root, call.expectedPath)), false, call.expectedPath);
    }
  }
  assert.match(fs.readFileSync(path.join(root, "README.md"), "utf8"), /needle alpha/);
  assert.equal(fs.existsSync(path.join(userDataRoot, "agent-harness", "generated", "pending-patches.local.json")), false);
});

test("Agent Harness action contracts reject unsupported actions and unknown or malformed params", async () => {
  const { root, userDataRoot } = createWorkspace("Param_Project");
  const workspaceAccess = createSelectedProjectAccessProvider({
    getSelectedProjectRoot: () => root,
  });
  const registry = createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot });
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
    const result = await registry.callTool({ name: "repo_toolbox", arguments: call.arguments, scope: "files.read files.write" });
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

function controlledFixCardDraftMetadata(relativePath, submissionId) {
  return {
    schemaVersion: 1,
    artifactType: "fix-card-draft",
    artifactRevision: 1,
    participationRole: "gatingReview",
    identity: {
      issueId: "ISSUE_200",
      fixCardId: "ISSUE_200-FC01",
      candidateId: "ISSUE_200-FC01",
      submissionId,
      currentImplementationId: "ISSUE_200-FC01",
    },
    sourceRevisions: [
      { path: "issues/ISSUE_200/ISSUE_RESOLUTION_PLAN.md", revision: 1 },
      { path: "issues/ISSUE_200/FIX_CARD_PLAN.md", revision: 1 },
    ],
    workflowData: {
      ownerKind: "issue",
      issueId: "ISSUE_200",
      fixCardId: "ISSUE_200-FC01",
      draftPath: relativePath,
      finalFixCardTarget: "issues/ISSUE_200/Fix_Cards/ISSUE_200-FC01_test.md",
      implementerReportTarget: "issues/ISSUE_200/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_200-FC01_test.md",
      draftRevision: 1,
      returnTarget: "planning",
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
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

function writeWorkspaceFile(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
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
