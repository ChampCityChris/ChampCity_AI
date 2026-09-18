// Runs the real packaged Background Agent/utility worker with isolated settings.
// Only synthetic test sources are written; the user's running agent is untouched.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createHash, randomFillSync } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { AgentHarnessServiceHostClient } = require("../../dist/main/agentHarness/runtime/agentHarnessServiceHostClient.js");
const { computeAgentHarnessRuntimeBuildIdentity } = require("../../dist/main/agentHarness/runtime/agentHarnessBuildIdentity.js");

async function main() {
  assert.equal(process.platform, "win32");
  const builtExecutable = path.resolve(process.argv[2] ?? "release/win-unpacked/ChampCityAI.exe");
  assert.ok(fs.existsSync(builtExecutable));
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-packaged-preview-"));
  // Module resolution must not climb from release/ to the checkout's node_modules.
  // Also prove a deployment directory containing spaces works without repackaging.
  const deployedRoot = path.join(tempRoot, "packaged app");
  fs.cpSync(path.dirname(builtExecutable), deployedRoot, { recursive: true });
  const executable = path.join(deployedRoot, "ChampCityAI.exe");
  const unpacked = path.join(deployedRoot, "resources/app.asar.unpacked/node_modules");
  assert.ok(fs.existsSync(path.join(unpacked, "sharp/package.json")));
  const nativeFiles = fs.readdirSync(path.join(unpacked, "@img/sharp-win32-x64/lib"));
  assert.ok(nativeFiles.some((name) => /^sharp-win32-x64.*\.node$/.test(name)));
  assert.ok(nativeFiles.some((name) => /^libvips.*\.dll$/.test(name)));
  const root = path.join(tempRoot, "preview_project");
  const userDataRoot = path.join(tempRoot, "user-data");
  fs.mkdirSync(root);
  const source = await sharp(randomFillSync(Buffer.alloc(3000 * 3000 * 4)), {
    raw: { width: 3000, height: 3000, channels: 4 },
  }).png({ compressionLevel: 0 }).toBuffer();
  assert.ok(source.length > 24_000_000);
  fs.writeFileSync(path.join(root, "large.png"), source);
  for (const format of ["jpeg", "webp"]) {
    const image = await sharp({ create: {
      width: 800, height: 400, channels: format === "jpeg" ? 3 : 4,
      background: { r: 30, g: 90, b: 160, alpha: 0.5 },
    } })[format]().toBuffer();
    fs.writeFileSync(path.join(root, `small.${format}`), image);
  }
  const before = fs.readdirSync(root).map((name) => [name, hash(fs.readFileSync(path.join(root, name)))]);
  const env = {
    ...process.env,
    CHAMPCITY_USER_DATA_ROOT: userDataRoot,
    CHAMPCITY_AGENT_HARNESS_ENABLED: "true",
    CHAMPCITY_AGENT_HARNESS_HOST: "127.0.0.1",
    CHAMPCITY_AGENT_HARNESS_PORT: "0",
    CHAMPCITY_AGENT_HARNESS_PUBLIC_BASE_URL: "",
    CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH: "development-unauthenticated",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  // Prevent a developer NODE_PATH from masking a missing packaged dependency.
  delete env.NODE_PATH;
  const child = spawn(executable, ["--agent-harness-service-host"], {
    cwd: tempRoot, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-8000); });
  const host = new AgentHarnessServiceHostClient({
    userDataRoot, launchServiceHost: () => undefined,
    requestTimeoutMs: 5000, discoveryTimeoutMs: 30_000, discoveryPollIntervalMs: 100,
  });
  let client;
  let identity;
  try {
    identity = await host.connect();
    assert.ok(identity.workerProcessId > 0);
    assert.equal(identity.runtimeBuildIdentity, computeAgentHarnessRuntimeBuildIdentity(path.resolve("dist/main")));
    const { workspace } = await host.registerWorkspace(root);
    const status = await host.status();
    assert.equal(status.state, "running");
    client = new Client({ name: "packaged-preview-proof", version: "1.0.0" }, { capabilities: {} });
    await client.connect(new StreamableHTTPClientTransport(new URL(status.mcpEndpoint)));
    assert.equal((await client.listTools()).tools.length, 35);
    const evidence = [];
    for (const params of [
      { relativePath: "large.png" },
      { relativePath: "large.png", cropX: 2900, cropY: 2900, cropWidth: 100, cropHeight: 100 },
      { relativePath: "small.jpeg" }, { relativePath: "small.webp" },
    ]) {
      const result = await client.callTool({ name: "visual_asset_toolbox", arguments: {
        workspaceId: workspace.workspaceId, action: "create_image_preview", params,
      } });
      assert.equal(result.isError, false, JSON.stringify(result.structuredContent));
      const images = result.content.filter((item) => item.type === "image");
      assert.equal(images.length, 1);
      const bytes = Buffer.from(images[0].data, "base64");
      const metadata = result.structuredContent.payload;
      assert.equal(metadata.preview.sha256, hash(bytes));
      assert.equal(metadata.source.sha256, before.find(([name]) => name === params.relativePath)[1]);
      assert.equal(metadata.derivedFromSourceSha256, metadata.source.sha256);
      assert.equal(metadata.preview.bytes, bytes.length);
      assert.ok(bytes.length <= 12_000_000);
      assert.ok(metadata.preview.width <= 4096 && metadata.preview.height <= 4096);
      assert.equal((await sharp(bytes).metadata()).hasAlpha, params.relativePath !== "small.jpeg");
      assert.equal(JSON.stringify(result.structuredContent).includes(images[0].data), false);
      assert.equal(result.content.some((item) => item.type === "text" && item.text.includes(images[0].data)), false);
      evidence.push(metadata);
    }
    assert.deepEqual(fs.readdirSync(root).map((name) => [name, hash(fs.readFileSync(path.join(root, name)))]), before);
    console.log(JSON.stringify({
      packagedWindowsUtilityWorker: true, packagedNativeModulePresent: true,
      deployedOutsideCheckout: true,
      runtimeBuildIdentity: identity.runtimeBuildIdentity,
      sourceUnchanged: true, noRepositoryDerivative: true, evidence,
    }, null, 2));
  } catch (error) {
    // Do not dump the service descriptor, environment, credentials, or filesystem paths.
    throw new Error(`Packaged preview smoke failed: ${error.message}; nativeLoadFailure=${/sharp|libvips|MODULE_NOT_FOUND/.test(stderr)}`);
  } finally {
    await client?.close().catch(() => undefined);
    await host.shutdownServiceHost().catch(() => undefined);
    try { await waitForExit(child, 10_000); }
    catch { child.kill(); await waitForExit(child, 5000); }
    if (identity?.workerProcessId) {
      assert.throws(() => process.kill(identity.workerProcessId, 0), { code: "ESRCH" });
    }
    assert.equal(path.dirname(tempRoot), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(tempRoot).startsWith("champcity-packaged-preview-"));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
function hash(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Packaged process exit timed out")), timeoutMs);
    child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
