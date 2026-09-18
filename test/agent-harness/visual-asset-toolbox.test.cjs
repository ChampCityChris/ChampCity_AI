const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const {
  AgentHarnessService,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/runtime/agentHarnessService.js"));
const {
  readVisualAssetImage,
  inspectVisualAssetImage,
  compareVisualAssetImages,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/repository/visualAssetReview.js"));
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

test("visual asset reader detects PNG, JPEG, and WebP bytes and returns deterministic metadata", () => {
  const fixture = createWorkspace("Visual_Metadata_Project");
  const cases = [
    ["assets/alpha.png", onePixelPng(), "image/png", "png", "png", 1, 1, "present"],
    ["assets/photo.jpeg", jpegWithDimensions(2, 3), "image/jpeg", "jpeg", "jpeg", 2, 3, "absent"],
    ["assets/render.webp", webpWithDimensions(4, 5), "image/webp", "webp", "webp", 4, 5, "absent"],
  ];

  for (const [relativePath, bytes, mimeType, format, extension, width, height, alphaCapability] of cases) {
    writeWorkspaceFile(fixture.root, relativePath, bytes);
    const result = readVisualAssetImage(fixture.root, relativePath);
    assert.deepEqual(result.metadata, {
      relativePath,
      mimeType,
      format,
      extension,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width,
      height,
      pixels: width * height,
      alphaCapability,
      iccProfilePresent: false,
    });
    assert.deepEqual(Buffer.from(result.imageBase64, "base64"), bytes);
    assert.equal(JSON.stringify(result.metadata).includes(fixture.root), false);
    assert.equal(JSON.stringify(result.metadata).includes(result.imageBase64), false);
  }

  writeWorkspaceFile(fixture.root, "dist/generated/known.png", onePixelPng());
  assert.equal(
    inspectVisualAssetImage(fixture.root, "dist/generated/known.png").relativePath,
    "dist/generated/known.png",
  );
});

test("visual_asset_toolbox publishes exactly four strict read-only actions", async () => {
  const fixture = createWorkspace("Visual_Contract_Project");
  writeWorkspaceFile(fixture.root, "assets/a.png", onePixelPng());
  writeWorkspaceFile(fixture.root, "assets/b.jpg", jpegWithDimensions(2, 2));
  const registry = createRegistry(fixture);
  const tool = registry.listTools("files.read").find((entry) => entry.name === "visual_asset_toolbox");

  assert.ok(tool);
  assert.deepEqual(tool.actions, ["read_image", "inspect_image", "compare_images", "create_image_preview"]);
  assert.equal(tool.readOnly, true);
  assert.equal(registry.listTools("files.write").some((entry) => entry.name === "visual_asset_toolbox"), false);
  for (const invocation of [
    { workspaceId: fixture.workspaceId, action: "read_image", params: { relativePath: "assets/a.png" } },
    { workspaceId: fixture.workspaceId, action: "inspect_image", params: { relativePath: "assets/a.png" } },
    {
      workspaceId: fixture.workspaceId,
      action: "compare_images",
      params: { relativePaths: ["assets/a.png", "assets/b.jpg"] },
    },
  ]) {
    assert.equal(tool.inputZodSchema.safeParse(invocation).success, true, invocation.action);
  }
  for (const invocation of [
    { workspaceId: fixture.workspaceId, action: "read_image", params: {} },
    { workspaceId: fixture.workspaceId, action: "read_image", params: { relativePath: "assets/a.png", extra: true } },
    { workspaceId: fixture.workspaceId, action: "inspect_image", params: { relativePath: "assets/a.png", extra: true } },
    { workspaceId: fixture.workspaceId, action: "compare_images", params: { relativePaths: ["assets/a.png"] } },
    {
      workspaceId: fixture.workspaceId,
      action: "compare_images",
      params: { relativePaths: Array.from({ length: 7 }, (_, index) => `assets/${index}.png`) },
    },
    { workspaceId: fixture.workspaceId, action: "write_image", params: { relativePath: "assets/a.png" } },
  ]) {
    assert.equal(tool.inputZodSchema.safeParse(invocation).success, false, invocation.action);
  }

  const read = await callVisual(registry, fixture.workspaceId, "read_image", { relativePath: "assets/a.png" });
  assert.equal(read.ok, true);
  assert.equal(read.imageContent.length, 1);
  assert.equal(Object.hasOwn(read.payload, "imageBase64"), false);
  assert.equal(JSON.stringify(read.payload).includes(read.imageContent[0].data), false);

  const inspected = await callVisual(registry, fixture.workspaceId, "inspect_image", {
    relativePath: "assets/a.png",
  });
  assert.equal(inspected.ok, true);
  assert.equal(Object.hasOwn(inspected, "imageContent"), false);

  const compared = await callVisual(registry, fixture.workspaceId, "compare_images", {
    relativePaths: ["assets/b.jpg", "assets/a.png"],
  });
  assert.equal(compared.ok, true);
  assert.deepEqual(compared.payload.images.map((entry) => entry.relativePath), ["assets/b.jpg", "assets/a.png"]);
  assert.deepEqual(compared.imageContent.map((entry) => entry.mimeType), ["image/jpeg", "image/png"]);
  assert.equal(JSON.stringify(compared.payload).includes(compared.imageContent[0].data), false);

  const deniedScope = await callVisual(
    registry,
    fixture.workspaceId,
    "read_image",
    { relativePath: "assets/a.png" },
    "files.write",
  );
  assert.equal(deniedScope.ok, false);
  assert.equal(deniedScope.error.code, "OAUTH_SCOPE_DENIED");

  const foreign = await callVisual(registry, "foreign_workspace", "read_image", {
    relativePath: "assets/a.png",
  });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.error.code, "WORKSPACE_ACCESS_DENIED");
});

test("visual asset reads fail closed for paths, links, special files, invalid bytes, and fixed per-image bounds", (t) => {
  const fixture = createWorkspace("Visual_Denial_Project");
  const validPng = onePixelPng();
  const invalidCases = [
    ["assets/empty.png", Buffer.alloc(0), /empty/],
    ["assets/too-large.png", Buffer.alloc(24_000_001), /24,000,000-byte limit/],
    ["assets/unsupported.gif", Buffer.from("GIF89a", "ascii"), /not a supported PNG/],
    ["assets/malformed.png", validPng.subarray(0, 16), /not a supported PNG/],
    ["assets/mismatch.jpg", validPng, /extension does not match/],
    ["assets/mismatch.gif", validPng, /extension does not match/],
    ["assets/too-wide.png", pngWithDimensions(8193, 1), /dimensions exceed/],
    ["assets/too-tall.png", pngWithDimensions(1, 8193), /dimensions exceed/],
    ["assets/too-many-pixels.png", pngWithDimensions(7000, 6000), /40,000,000-pixel limits/],
  ];
  for (const [relativePath, bytes, expected] of invalidCases) {
    writeWorkspaceFile(fixture.root, relativePath, bytes);
    assert.throws(() => readVisualAssetImage(fixture.root, relativePath), expected, relativePath);
  }

  assert.throws(() => readVisualAssetImage(fixture.root, "../outside.png"), /Path traversal/);
  assert.throws(
    () => readVisualAssetImage(fixture.root, path.resolve(fixture.root, "assets/valid.png")),
    /repository-relative path/,
  );
  fs.mkdirSync(path.join(fixture.root, "assets", "directory.png"), { recursive: true });
  assert.throws(
    () => readVisualAssetImage(fixture.root, "assets/directory.png"),
    /regular non-link files/,
  );

  writeWorkspaceFile(fixture.root, "assets/source/valid.png", validPng);
  const linkPath = path.join(fixture.root, "assets", "linked");
  if (createDirectoryLink(path.join(fixture.root, "assets", "source"), linkPath)) {
    assert.throws(
      () => readVisualAssetImage(fixture.root, "assets/linked/valid.png"),
      /symbolic links, junctions, or reparse-point links/,
    );
  } else {
    t.diagnostic("directory junction creation unavailable; link-component assertion skipped");
  }

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-visual-outside-"));
  fs.writeFileSync(path.join(outside, "valid.png"), validPng);
  const outsideLink = path.join(fixture.root, "assets", "outside-linked");
  if (createDirectoryLink(outside, outsideLink)) {
    assert.throws(
      () => readVisualAssetImage(fixture.root, "assets/outside-linked/valid.png"),
      /escapes the selected repository root/,
    );
  } else {
    t.diagnostic("out-of-root directory junction creation unavailable; escape assertion skipped");
  }
});

test("compare_images preserves two/four-image order and enforces counts, identity, and aggregate bounds", () => {
  const fixture = createWorkspace("Visual_Comparison_Project");
  const ordered = [
    ["views/front.png", pngWithDimensions(10, 11)],
    ["views/three-quarter.jpg", jpegWithDimensions(12, 13)],
    ["views/profile.webp", webpWithDimensions(14, 15)],
    ["views/rear.png", pngWithDimensions(16, 17)],
  ];
  for (const [relativePath, bytes] of ordered) writeWorkspaceFile(fixture.root, relativePath, bytes);

  assert.deepEqual(
    compareVisualAssetImages(fixture.root, ordered.slice(0, 2).map(([relativePath]) => relativePath))
      .images.map((entry) => entry.relativePath),
    ordered.slice(0, 2).map(([relativePath]) => relativePath),
  );
  const four = compareVisualAssetImages(fixture.root, ordered.map(([relativePath]) => relativePath));
  assert.deepEqual(four.images.map((entry) => entry.relativePath), ordered.map(([relativePath]) => relativePath));
  assert.deepEqual(four.imageContents.map((entry) => entry.mimeType), [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/png",
  ]);
  assert.throws(() => compareVisualAssetImages(fixture.root, [ordered[0][0]]), /between 2 and 6/);
  assert.throws(
    () => compareVisualAssetImages(fixture.root, Array.from({ length: 7 }, () => ordered[0][0])),
    /between 2 and 6/,
  );
  assert.throws(
    () => compareVisualAssetImages(fixture.root, [ordered[0][0], ordered[0][0]]),
    /duplicate canonical file identities/,
  );

  const hardLinkPath = path.join(fixture.root, "views", "front-hardlink.png");
  fs.linkSync(path.join(fixture.root, ordered[0][0]), hardLinkPath);
  assert.throws(
    () => compareVisualAssetImages(fixture.root, [ordered[0][0], "views/front-hardlink.png"]),
    /duplicate canonical file identities/,
  );

  const aggregatePixelPaths = Array.from({ length: 4 }, (_, index) => `large-pixels/${index}.png`);
  for (const relativePath of aggregatePixelPaths) {
    writeWorkspaceFile(fixture.root, relativePath, pngWithDimensions(8000, 4000));
  }
  assert.throws(
    () => compareVisualAssetImages(fixture.root, aggregatePixelPaths),
    /100,000,000-pixel aggregate limit/,
  );

  const aggregateBytePaths = Array.from({ length: 4 }, (_, index) => `large-bytes/${index}.png`);
  for (const relativePath of aggregateBytePaths) {
    writeWorkspaceFile(fixture.root, relativePath, paddedPng(12_000_001));
  }
  assert.throws(
    () => compareVisualAssetImages(fixture.root, aggregateBytePaths),
    /48,000,000-byte aggregate limit/,
  );
});

test("direct transport accepts exactly 24 MB and comparison accepts exactly 48 MB", () => {
  const fixture = createWorkspace("Visual_Transport_Boundary_Project");
  for (const name of ["a.png", "b.png"]) writeWorkspaceFile(fixture.root, name, paddedPng(24_000_000));
  assert.equal(Buffer.from(readVisualAssetImage(fixture.root, "a.png").imageBase64, "base64").length, 24_000_000);
  const compared = compareVisualAssetImages(fixture.root, ["a.png", "b.png"]);
  assert.equal(compared.images.reduce((sum, image) => sum + image.bytes, 0), 48_000_000);
  // A third individually valid image takes the aggregate over the fixed bound.
  writeWorkspaceFile(fixture.root, "c.png", onePixelPng());
  assert.throws(() => compareVisualAssetImages(fixture.root, ["a.png", "b.png", "c.png"]), /48,000,000-byte/);
  fs.appendFileSync(path.join(fixture.root, "a.png"), Buffer.from([0]));
  assert.throws(() => readVisualAssetImage(fixture.root, "a.png"), /24,000,000-byte/);
});

test("visual asset reader rejects an ordinary file change during its bounded read", () => {
  const fixture = createWorkspace("Visual_Mutation_Project");
  const relativePath = "assets/changing.png";
  const target = writeWorkspaceFile(fixture.root, relativePath, paddedPng(1_000_000));
  const originalReadSync = fs.readSync;
  let changed = false;
  fs.readSync = function (...args) {
    const count = originalReadSync.apply(fs, args);
    if (!changed) {
      changed = true;
      fs.appendFileSync(target, Buffer.from([0]));
    }
    return count;
  };
  try {
    assert.throws(() => readVisualAssetImage(fixture.root, relativePath), /changed while it was being read/);
  } finally {
    fs.readSync = originalReadSync;
  }
  assert.equal(changed, true);
});

test("public MCP projects one/many visual images in order without base64 in structured or text content", {
  timeout: 30_000,
}, async () => {
  const fixture = createWorkspace("Visual_Mcp_Project", true);
  const assets = [
    ["assets/front.png", onePixelPng(), "image/png"],
    ["assets/quarter.jpg", jpegWithDimensions(2, 3), "image/jpeg"],
    ["assets/profile.webp", webpWithDimensions(4, 5), "image/webp"],
    ["assets/rear.png", pngWithDimensions(6, 7), "image/png"],
  ];
  for (const [relativePath, bytes] of assets) writeWorkspaceFile(fixture.root, relativePath, bytes);
  const issuePath = "issues/ISSUE_111/evidence/screenshot-001.png";
  writeWorkspaceFile(fixture.root, issuePath, onePixelPng());

  const service = new AgentHarnessService({
    userDataRoot: fixture.userDataRoot,
    port: 0,
    allowUnauthenticatedLocal: true,
  });
  let connected;
  try {
    await service.registerWorkspaceRoot(fixture.root);
    const started = await service.start();
    connected = await connectMcpClient(started.mcpEndpoint);
    const listed = await connected.client.listTools();
    const visualTool = listed.tools.find((entry) => entry.name === "visual_asset_toolbox");
    assert.ok(visualTool);
    assert.equal(visualTool.annotations.readOnlyHint, true);

    const read = await callMcp(connected.client, "visual_asset_toolbox", {
      workspaceId: fixture.workspaceId,
      action: "read_image",
      params: { relativePath: assets[0][0] },
    });
    assertImageProjection(read, [assets[0]]);

    const inspected = await callMcp(connected.client, "visual_asset_toolbox", {
      workspaceId: fixture.workspaceId,
      action: "inspect_image",
      params: { relativePath: assets[0][0] },
    });
    assert.deepEqual(inspected.content.map((entry) => entry.type), ["text"]);
    assert.equal(inspected.structuredContent.payload.relativePath, assets[0][0]);

    const compared = await callMcp(connected.client, "visual_asset_toolbox", {
      workspaceId: fixture.workspaceId,
      action: "compare_images",
      params: { relativePaths: assets.map(([relativePath]) => relativePath) },
    });
    assertImageProjection(compared, assets);
    assert.deepEqual(
      compared.structuredContent.payload.images.map((entry) => entry.relativePath),
      assets.map(([relativePath]) => relativePath),
    );

    const issue = await callMcp(connected.client, "repo_toolbox", {
      workspaceId: fixture.workspaceId,
      action: "read_issue_screenshot",
      params: { relativePath: issuePath },
    });
    assertImageProjection(issue, [[issuePath, onePixelPng(), "image/png"]]);
    assert.equal(Object.hasOwn(issue.structuredContent.payload, "imageBase64"), false);

    const deniedIssue = await callMcp(connected.client, "repo_toolbox", {
      workspaceId: fixture.workspaceId,
      action: "read_issue_screenshot",
      params: { relativePath: assets[0][0] },
    });
    assert.equal(deniedIssue.isError, true);
    assert.equal(deniedIssue.structuredContent.error.code, "FILE_DENIED");
  } finally {
    await connected?.client.close().catch(() => undefined);
    await service.stop();
  }
});

function assertImageProjection(result, expectedAssets) {
  assert.equal(result.isError, false, JSON.stringify(result.structuredContent));
  const text = result.content.find((entry) => entry.type === "text");
  const images = result.content.filter((entry) => entry.type === "image");
  assert.ok(text);
  assert.equal(images.length, expectedAssets.length);
  for (const [index, [, bytes, mimeType]] of expectedAssets.entries()) {
    assert.equal(images[index].mimeType, mimeType);
    assert.deepEqual(Buffer.from(images[index].data, "base64"), bytes);
    assert.equal(text.text.includes(images[index].data), false);
    assert.equal(JSON.stringify(result.structuredContent).includes(images[index].data), false);
  }
  assert.equal(Object.hasOwn(result.structuredContent, "imageContent"), false);
}

function createWorkspace(name, initializeGit = false) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-visual-asset-"));
  const root = path.join(container, name);
  const userDataRoot = path.join(container, "user-data");
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(userDataRoot, { recursive: true });
  if (initializeGit) {
    execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  } else {
    fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "README.md"), "# Visual fixture\n", "utf8");
  return { root, userDataRoot, workspaceId: name.toLowerCase() };
}

function createRegistry(fixture) {
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveWorkspaceRootContext(fixture.root);
      if (workspaceId !== context.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => {
      const context = resolveWorkspaceRootContext(fixture.root);
      return [{
        workspaceId: context.workspaceId,
        repositoryName: context.repositoryName,
        gitBacked: context.gitBacked,
        availability: "available",
      }];
    },
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: fixture.userDataRoot });
}

function callVisual(registry, workspaceId, action, params, scope = "files.read") {
  return registry.callTool({
    name: "visual_asset_toolbox",
    arguments: { workspaceId, action, params },
    scope,
  });
}

async function connectMcpClient(url) {
  const client = new Client({ name: "visual-asset-test", version: "0.1.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(transport);
  return { client, transport };
}

function callMcp(client, name, args) {
  return client.callTool({ name, arguments: args });
}

function writeWorkspaceFile(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
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

function paddedPng(bytes) {
  const buffer = Buffer.alloc(bytes);
  pngWithDimensions(1, 1).copy(buffer);
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
