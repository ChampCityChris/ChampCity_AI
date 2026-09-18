const assert = require("node:assert/strict");
const { createHash, randomFillSync } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const sharp = require("sharp");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { createVisualAssetPreview } = require("../../dist/main/agentHarness/repository/visualAssetPreview.js");
const backend = require("../../dist/main/agentHarness/repository/visualAssetPreviewBackend.js");
const { readVisualAssetPreviewSource, readVisualAssetImage } = require("../../dist/main/agentHarness/repository/visualAssetReview.js");
const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const { createRegisteredWorkspaceAccessProvider, resolveWorkspaceRootContext } = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
const { startAgentHarnessHttpRuntime } = require("../../dist/main/agentHarness/runtime/httpRuntime.js");

function fixture(t) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-preview-test-"));
  const root = path.join(container, "preview_project");
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  t.after(() => {
    assert.equal(path.dirname(container), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(container).startsWith("champcity-preview-test-"));
    fs.rmSync(container, { recursive: true, force: true });
  });
  return { root, userDataRoot: path.join(container, "user-data"), workspaceId: "preview_project" };
}
function write(f, bytes, name = "source.png") {
  fs.writeFileSync(path.join(f.root, name), bytes);
  return name;
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const solid = (width, height, channels = 4) => sharp({ create: {
  width, height, channels, background: { r: 64, g: 128, b: 192, alpha: 0.5 },
} }).png().toBuffer();
function registryFor(f) {
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (id) => {
      if (id !== f.workspaceId) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Workspace is not registered.");
      return resolveWorkspaceRootContext(f.root);
    },
    listWorkspaceSummaries: () => [],
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: f.userDataRoot });
}
function call(registry, f, params, scope = "files.read", workspaceId = f.workspaceId) {
  return registry.callTool({ name: "visual_asset_toolbox", scope,
    arguments: { workspaceId, action: "create_image_preview", params } });
}
function assertEvidence(result, source, crop = null) {
  const bytes = Buffer.from(result.imageBase64, "base64");
  const { metadata } = result;
  assert.equal(metadata.source.sha256, hash(source));
  assert.equal(metadata.source.bytes, source.length);
  assert.equal(metadata.preview.sha256, hash(bytes));
  assert.equal(metadata.preview.bytes, bytes.length);
  assert.equal(metadata.preview.format, "png");
  assert.equal(metadata.preview.mimeType, "image/png");
  assert.equal(metadata.preview.pixels, metadata.preview.width * metadata.preview.height);
  assert.equal(metadata.derivedFromSourceSha256, metadata.source.sha256);
  assert.deepEqual(metadata.crop, crop);
  assert.ok(bytes.length <= 12_000_000);
  assert.ok(metadata.preview.width <= 4096 && metadata.preview.height <= 4096);
  assert.ok(metadata.preview.pixels <= 16_777_216);
  assert.ok(!JSON.stringify(metadata).includes(result.imageBase64));
  return bytes;
}

test("HOTFIX11 preview action is strict, files.read only, and uses exact registered workspace", async (t) => {
  const f = fixture(t);
  write(f, await solid(10, 10));
  const registry = registryFor(f);
  const tools = registry.listTools("files.read files.write");
  assert.equal(tools.length, 35);
  const tool = tools.find((entry) => entry.name === "visual_asset_toolbox");
  assert.deepEqual(tool.actions, ["read_image", "inspect_image", "compare_images", "create_image_preview"]);
  assert.equal((await call(registry, f, { relativePath: "source.png" })).ok, true);
  for (const key of ["outputPath", "format", "quality", "width", "height", "background", "maxBytes"]) {
    const params = { relativePath: "source.png", [key]: "caller-choice" };
    assert.equal(tool.inputZodSchema.safeParse({ workspaceId: f.workspaceId, action: "create_image_preview", params }).success, false);
    assert.equal((await call(registry, f, params)).ok, false);
  }
  assert.equal((await call(registry, f, { relativePath: "source.png" }, "files.write")).error.code, "OAUTH_SCOPE_DENIED");
  assert.equal((await call(registry, f, { relativePath: "source.png" }, "files.read", "foreign")).error.code, "WORKSPACE_ACCESS_DENIED");
});

test("HOTFIX11 full preview fits landscape/portrait composition, retains alpha, never upscales", async (t) => {
  const f = fixture(t);
  for (const [width, height, expectedWidth, expectedHeight] of [
    [8192, 4096, 4096, 2048], [4096, 8192, 2048, 4096], [43, 29, 43, 29],
    [16384, 1, 4096, 1], [1, 16384, 1, 4096],
  ]) {
    const source = await solid(width, height);
    write(f, source);
    const result = await createVisualAssetPreview(f.root, "source.png");
    const bytes = assertEvidence(result, source);
    assert.equal(result.metadata.preview.width, expectedWidth);
    assert.equal(result.metadata.preview.height, expectedHeight);
    assert.equal(result.metadata.source.alphaCapability, "present");
    const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4);
    // Premultiply/unpremultiply during high-quality alpha resizing can round RGB
    // by one 8-bit level; the alpha channel itself must remain unchanged.
    for (const pixel of [data.subarray(0, 4), data.subarray(-4)]) {
      for (const [channel, expected] of [64, 128, 192].entries()) assert.ok(Math.abs(pixel[channel] - expected) <= 1);
      assert.equal(pixel[3], 128);
    }
    assert.deepEqual(fs.readFileSync(path.join(f.root, "source.png")), source);
  }
});

test("HOTFIX11 exact edge crop pixels and composition are preserved before proportional downscale", async (t) => {
  const f = fixture(t);
  const width = 12, height = 8;
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    pixels.set([x * 10, y * 20, 73, (x + y) % 2 ? 128 : 255], (y * width + x) * 4);
  }
  const source = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  write(f, source);
  for (const crop of [
    { cropX: 0, cropY: 0, cropWidth: 12, cropHeight: 8 },
    { cropX: 9, cropY: 6, cropWidth: 3, cropHeight: 2 },
    { cropX: 11, cropY: 7, cropWidth: 1, cropHeight: 1 },
  ]) {
    const result = await createVisualAssetPreview(f.root, "source.png", crop);
    const raw = await sharp(assertEvidence(result, source, crop)).raw().toBuffer();
    const expected = [];
    for (let y = crop.cropY; y < crop.cropY + crop.cropHeight; y++) {
      expected.push(pixels.subarray((y * width + crop.cropX) * 4, (y * width + crop.cropX + crop.cropWidth) * 4));
    }
    assert.deepEqual(raw, Buffer.concat(expected));
  }
  // Four quadrants prove that a full fit does not silently crop-to-fill.
  const large = Buffer.alloc(6000 * 3000 * 3);
  for (let y = 0; y < 3000; y++) for (let x = 0; x < 6000; x++) {
    large.set([x < 3000 ? 255 : 0, y < 1500 ? 255 : 0, 80], (y * 6000 + x) * 3);
  }
  write(f, await sharp(large, { raw: { width: 6000, height: 3000, channels: 3 } }).png().toBuffer());
  const full = await createVisualAssetPreview(f.root, "source.png");
  const raw = await sharp(Buffer.from(full.imageBase64, "base64")).raw().toBuffer();
  assert.deepEqual([full.metadata.preview.width, full.metadata.preview.height], [4096, 2048]);
  for (const [x, y, color] of [[0, 0, [255, 255, 80]], [4095, 0, [0, 255, 80]], [0, 2047, [255, 0, 80]], [4095, 2047, [0, 0, 80]]]) {
    assert.deepEqual([...raw.subarray((y * 4096 + x) * 3, (y * 4096 + x) * 3 + 3)], color);
  }
  const cropped = await createVisualAssetPreview(f.root, "source.png", { cropX: 1000, cropY: 1000, cropWidth: 5000, cropHeight: 2000 });
  assert.deepEqual([cropped.metadata.preview.width, cropped.metadata.preview.height], [4096, 1638]);
  const cropRaw = await sharp(Buffer.from(cropped.imageBase64, "base64")).raw().toBuffer();
  // These pixels lie beyond the cropped quadrant transitions, but before the
  // full-image transitions: fitting first and cropping afterwards would differ.
  for (const [x, y, color] of [[1800, 100, [0, 255, 80]], [100, 500, [255, 0, 80]]]) {
    assert.deepEqual([...cropRaw.subarray((y * 4096 + x) * 3, (y * 4096 + x) * 3 + 3)], color);
  }
});

test("HOTFIX11 rejects partial, fractional, unsafe, negative, zero, and out-of-bounds crops", async (t) => {
  const f = fixture(t);
  write(f, await solid(10, 10));
  const registry = registryFor(f);
  const valid = { cropX: 0, cropY: 0, cropWidth: 10, cropHeight: 10 };
  for (const crop of [
    { cropX: 0 }, { cropWidth: 1, cropHeight: 1 }, { ...valid, cropX: -1 },
    { ...valid, cropY: -1 }, { ...valid, cropWidth: 0 }, { ...valid, cropHeight: -1 },
    { ...valid, cropX: 0.1 }, { ...valid, cropWidth: Number.MAX_SAFE_INTEGER + 1 },
    { ...valid, cropX: Number.MAX_SAFE_INTEGER }, { ...valid, cropWidth: 11 },
    { ...valid, cropY: 1 }, { ...valid, cropHeight: Infinity }, { ...valid, cropX: null },
  ]) {
    const result = await call(registry, f, { relativePath: "source.png", ...crop });
    assert.equal(result.ok, false, JSON.stringify(crop));
    assert.equal(result.error.code, "INVALID_INPUT");
    assert.equal(result.imageContent, undefined);
  }
});

test("HOTFIX11 128 MB source boundary is independent of direct transport and is checked before decode", async (t) => {
  const f = fixture(t);
  const file = path.join(f.root, "source.png");
  write(f, await solid(1, 1));
  fs.truncateSync(file, 128_000_000);
  assert.equal(readVisualAssetPreviewSource(f.root, "source.png").metadata.bytes, 128_000_000);
  fs.truncateSync(file, 128_000_001);
  await assert.rejects(createVisualAssetPreview(f.root, "source.png"), /128,000,000-byte/);
  for (const [width, height] of [[16385, 1], [1, 16385], [10000, 8001]]) {
    const header = await solid(1, 1);
    header.writeUInt32BE(width, 16);
    header.writeUInt32BE(height, 20);
    write(f, header);
    await assert.rejects(createVisualAssetPreview(f.root, "source.png"), /16384 x 16384 or 80,000,000-pixel/);
  }
  const header = await solid(1, 1);
  header.writeUInt32BE(10000, 16);
  header.writeUInt32BE(8000, 20);
  write(f, header);
  assert.equal(readVisualAssetPreviewSource(f.root, "source.png").metadata.pixels, 80_000_000);
});

test("HOTFIX11 PNG/JPEG/WebP decode and malformed/unsupported source rejection", async (t) => {
  const f = fixture(t);
  for (const format of ["png", "jpeg", "webp"]) {
    const source = await sharp(await solid(20, 10))[format]().toBuffer();
    const name = write(f, source, `source.${format}`);
    const result = await createVisualAssetPreview(f.root, name);
    assertEvidence(result, source);
    assert.equal(result.metadata.source.format, format);
    assert.equal((await sharp(Buffer.from(result.imageBase64, "base64")).metadata()).hasAlpha, format !== "jpeg");
  }
  const png = await solid(20, 10);
  for (const [name, source] of [["empty.png", Buffer.alloc(0)], ["bad.png", png.subarray(0, 33)],
    ["bad.jpg", Buffer.from([255, 216, 255])], ["bad.webp", Buffer.from("RIFF____WEBP")],
    ["bad.gif", Buffer.from("GIF89a")], ["wrong.jpg", png]]) {
    write(f, source, name);
    await assert.rejects(createVisualAssetPreview(f.root, name), (e) => e.code === "FILE_DENIED" && !e.message.includes(f.root));
  }
  // A multi-frame file cannot represent a single exact source rectangle.
  const frames = Buffer.alloc(2 * 2 * 4 * 2, 128);
  frames.fill(255, 2 * 2 * 4);
  const animated = await sharp(frames, {
    raw: { width: 2, height: 4, channels: 4, pageHeight: 2 },
  }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(animated).metadata()).pages, 2);
  write(f, animated, "animated.webp");
  await assert.rejects(createVisualAssetPreview(f.root, "animated.webp"), /decoded and previewed safely/);
});

test("HOTFIX11 path containment, regular file, junction, and source mutation safeguards", async (t) => {
  const f = fixture(t);
  write(f, await solid(32, 16));
  const outside = path.join(path.dirname(f.root), "outside");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "source.png"), await solid(2, 2));
  fs.mkdirSync(path.join(f.root, "directory.png"));
  fs.symlinkSync(outside, path.join(f.root, "escape"), process.platform === "win32" ? "junction" : "dir");
  fs.symlinkSync(f.root, path.join(f.root, "inside"), process.platform === "win32" ? "junction" : "dir");
  for (const relativePath of ["../outside/source.png", path.join(f.root, "source.png"), "directory.png", "escape/source.png", "inside/source.png"]) {
    await assert.rejects(createVisualAssetPreview(f.root, relativePath), (e) =>
      ["FILE_DENIED", "PATH_DENIED"].includes(e.code) && !JSON.stringify(e).includes(f.root));
  }
  const original = backend.encodeVisualAssetPreview;
  try {
    backend.encodeVisualAssetPreview = async (...args) => {
      const result = await original(...args);
      fs.appendFileSync(path.join(f.root, "source.png"), Buffer.from([0]));
      return result;
    };
    await assert.rejects(createVisualAssetPreview(f.root, "source.png"), /changed during preview processing/);
  } finally { backend.encodeVisualAssetPreview = original; }
});

test("HOTFIX11 deterministic retries stop at a 1024 longest edge and sanitize decoder failures", async (t) => {
  const f = fixture(t);
  write(f, await solid(4096, 2048));
  const original = sharp.prototype.toBuffer;
  const dimensions = [];
  try {
    sharp.prototype.toBuffer = async function (...args) {
      const result = await original.apply(this, args);
      dimensions.push([result.info.width, result.info.height]);
      return { ...result, data: Buffer.alloc(12_000_001) };
    };
    await assert.rejects(createVisualAssetPreview(f.root, "source.png"), /minimum review dimensions/);
    assert.deepEqual(dimensions, [[4096, 2048], [3072, 1536], [2304, 1152], [1728, 864], [1296, 648], [1024, 512]]);
    sharp.prototype.toBuffer = async () => { throw new Error(`native error ${f.root}`); };
    await assert.rejects(createVisualAssetPreview(f.root, "source.png"), (e) =>
      e.code === "FILE_DENIED" && !JSON.stringify(e).includes(f.root));
  } finally { sharp.prototype.toBuffer = original; }
});

test("HOTFIX11 preview rejects changes during read and same-size file replacement during encode", async (t) => {
  const f = fixture(t);
  const source = await solid(32, 16);
  write(f, source);
  const target = path.join(f.root, "source.png");
  const readSync = fs.readSync;
  let changed = false;
  try {
    fs.readSync = function (...args) {
      const count = readSync.apply(fs, args);
      if (!changed) { changed = true; fs.appendFileSync(target, Buffer.from([0])); }
      return count;
    };
    await assert.rejects(createVisualAssetPreview(f.root, "source.png"), /changed while it was being read/);
  } finally { fs.readSync = readSync; }
  assert.equal(changed, true);
  write(f, source);
  const encode = backend.encodeVisualAssetPreview;
  try {
    backend.encodeVisualAssetPreview = async (...args) => {
      const result = await encode(...args);
      fs.renameSync(target, path.join(f.root, "original.png"));
      fs.writeFileSync(target, source);
      return result;
    };
    const result = await call(registryFor(f), f, { relativePath: "source.png" });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "FILE_DENIED");
    assert.match(result.error.message, /changed during preview processing/);
    assert.equal(result.imageContent, undefined);
    assert.deepEqual(fs.readdirSync(f.root).sort(), [".git", "original.png", "source.png"]);
  } finally { backend.encodeVisualAssetPreview = encode; }
});

test("HOTFIX11 real >24 MB source produces deterministic bounded preview and actual MCP image projection", { timeout: 120_000 }, async (t) => {
  const f = fixture(t);
  const source = await sharp(randomFillSync(Buffer.alloc(3072 * 3072 * 4)), {
    raw: { width: 3072, height: 3072, channels: 4 },
  }).png({ compressionLevel: 0 }).toBuffer();
  assert.ok(source.length > 24_000_000 && source.length <= 128_000_000);
  write(f, source);
  const filesBefore = fs.readdirSync(f.root, { recursive: true });
  assert.throws(() => readVisualAssetImage(f.root, "source.png"), /24,000,000-byte/);
  const result = await createVisualAssetPreview(f.root, "source.png");
  const preview = assertEvidence(result, source);
  assert.ok(result.metadata.preview.width < 3072 && result.metadata.preview.width >= 1024);
  assert.equal((await sharp(preview).metadata()).hasAlpha, true);
  const runtime = await startAgentHarnessHttpRuntime({
    host: "127.0.0.1", port: 0, userDataRoot: f.userDataRoot,
    registry: registryFor(f), allowUnauthenticatedLocal: true,
  });
  const client = new Client({ name: "preview-test", version: "1.0.0" }, { capabilities: {} });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(runtime.url)));
    assert.equal((await client.listTools()).tools.length, 35);
    for (const crop of [null, { cropX: 3000, cropY: 3000, cropWidth: 72, cropHeight: 72 }]) {
      const projected = await client.callTool({ name: "visual_asset_toolbox", arguments: {
        workspaceId: f.workspaceId, action: "create_image_preview", params: { relativePath: "source.png", ...crop },
      } });
      assert.equal(projected.isError, false, JSON.stringify(projected.structuredContent));
      const images = projected.content.filter((item) => item.type === "image");
      assert.equal(images.length, 1);
      const metadata = projected.structuredContent.payload;
      const bytes = assertEvidence({ metadata, imageBase64: images[0].data }, source, crop);
      assert.equal(images[0].mimeType, "image/png");
      if (!crop) assert.deepEqual(bytes, preview);
      assert.ok(bytes.length < source.length);
      assert.equal(JSON.stringify(projected.structuredContent).includes(images[0].data), false);
      assert.equal(projected.content.filter((item) => item.type === "text").some((item) => item.text.includes(images[0].data)), false);
      assert.equal(Object.hasOwn(projected.structuredContent, "imageContent"), false);
    }
  } finally { await client.close(); await runtime.close(); }
  assert.equal(hash(fs.readFileSync(path.join(f.root, "source.png"))), hash(source));
  assert.deepEqual(fs.readdirSync(f.root, { recursive: true }), filesBefore);
});
