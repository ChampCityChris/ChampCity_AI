const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("../support/windows-test.cjs");

const repositoryRoot = path.resolve(__dirname, "../..");
const {
  resolveWindowsNpmInvocation,
  runFixedReleaseCommand,
} = require(path.join(repositoryRoot, "dist/main/agentHarness/release/releaseCommandAdapter.js"));

test("a standalone Node-hosted process resolves its installed Node/npm pair", { skip: process.platform !== "win32" }, () => {
  const resolved = resolveWindowsNpmInvocation({ executablePath: process.execPath, pathValue: "" });

  assert.equal(resolved.executable, fs.realpathSync(process.execPath));
  assert.equal(path.basename(resolved.executable).toLowerCase(), "node.exe");
  assert.match(resolved.cliPath, /node_modules[\\/]npm[\\/]bin[\\/]npm-cli\.js$/i);
  assert.equal(Object.hasOwn(resolved, "environment"), false);
});

test("a simulated Electron or ChampCity host is never selected as the npm runtime", { skip: process.platform !== "win32" }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-windows-npm-resolution-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const electronRoot = path.join(root, "electron-runtime");
  const executablePath = path.join(electronRoot, "ChampCityAI.exe");
  const packageRoot = path.join(electronRoot, "node_modules", "npm");
  const cliPath = path.join(packageRoot, "bin", "npm-cli.js");
  fs.mkdirSync(path.dirname(cliPath), { recursive: true });
  fs.writeFileSync(executablePath, "simulated Electron host placeholder");
  fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({
    name: "npm",
    bin: { npm: "bin/npm-cli.js" },
  }));
  fs.writeFileSync(cliPath, "// simulated colocated npm CLI placeholder\n");

  const standaloneRoot = path.dirname(process.execPath);
  const resolved = resolveWindowsNpmInvocation({ executablePath, pathValue: standaloneRoot });

  assert.equal(resolved.executable, fs.realpathSync(process.execPath));
  assert.notEqual(resolved.executable.toLowerCase(), executablePath.toLowerCase());
  assert.notEqual(resolved.cliPath.toLowerCase(), fs.realpathSync(cliPath).toLowerCase());
});

test("Windows npm resolution accepts only a valid paired standalone Node/npm installation", { skip: process.platform !== "win32" }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-windows-node-npm-pair-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const nodePath = path.join(root, "node.exe");
  const packageRoot = path.join(root, "node_modules", "npm");
  const cliPath = path.join(packageRoot, "bin", "npm-cli.js");
  fs.mkdirSync(path.dirname(cliPath), { recursive: true });
  fs.copyFileSync(process.execPath, nodePath, fs.constants.COPYFILE_FICLONE);
  fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({
    name: "npm",
    bin: { npm: "bin/npm-cli.js" },
  }));
  fs.writeFileSync(cliPath, "// fixed npm CLI placeholder\n");

  const resolved = resolveWindowsNpmInvocation({
    executablePath: path.join(root, "ChampCityAI.exe"),
    pathValue: root,
  });
  assert.equal(resolved.executable, fs.realpathSync(nodePath));
  assert.equal(resolved.cliPath, fs.realpathSync(cliPath));

  fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({
    name: "not-npm",
    bin: { npm: "bin/npm-cli.js" },
  }));
  assert.throws(
    () => resolveWindowsNpmInvocation({ executablePath: path.join(root, "ChampCityAI.exe"), pathValue: root }),
    (error) => error.code === "RELEASE_PREREQUISITE_UNAVAILABLE" && /standalone Node\/npm toolchain/i.test(error.message),
  );
});

test("Windows npm resolution fails closed when no standalone Node prerequisite exists", { skip: process.platform !== "win32" }, (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-windows-node-unavailable-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const packageRoot = path.join(root, "node_modules", "npm");
  fs.mkdirSync(path.join(packageRoot, "bin"), { recursive: true });
  fs.writeFileSync(path.join(root, "ChampCityAI.exe"), "simulated host placeholder");
  fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({
    name: "npm",
    bin: { npm: "bin/npm-cli.js" },
  }));
  fs.writeFileSync(path.join(packageRoot, "bin", "npm-cli.js"), "// npm CLI without standalone Node\n");

  assert.throws(
    () => resolveWindowsNpmInvocation({ executablePath: path.join(root, "ChampCityAI.exe"), pathValue: "" }),
    (error) => error.code === "RELEASE_PREREQUISITE_UNAVAILABLE"
      && /standalone Node\/npm toolchain/i.test(error.message),
  );
});

test("the real fixed-command adapter launches every npm-backed release identity without a shell-wrapper spawn", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-windows-npm-execution-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({
    name: "champcity-npm-adapter-smoke",
    version: "1.0.0",
    private: true,
    scripts: {
      typecheck: "node adapter-smoke.cjs typecheck",
      build: "node adapter-smoke.cjs build",
      test: "node adapter-smoke.cjs test",
      "package:win:dir": "node adapter-smoke.cjs package-win-dir",
      "package:win": "node adapter-smoke.cjs package-win",
      "validate:package:win": "node adapter-smoke.cjs validate-package-win",
    },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "package-lock.json"), `${JSON.stringify({
    name: "champcity-npm-adapter-smoke",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: { "": { name: "champcity-npm-adapter-smoke", version: "1.0.0" } },
  }, null, 2)}\n`);
  fs.writeFileSync(
    path.join(root, "adapter-smoke.cjs"),
    "process.stdout.write(`windows-npm-adapter-ok:${process.argv[2]}\\n`);\n",
  );

  const requests = [
    [{ root, id: "npm-ci" }, ["ci"]],
    [{ root, id: "npm-run-typecheck" }, ["run", "typecheck"]],
    [{ root, id: "npm-run-build" }, ["run", "build"]],
    [{ root, id: "npm-test" }, ["test"]],
    [{ root, id: "npm-set-version", version: "1.0.1" }, ["version", "1.0.1", "--no-git-tag-version"]],
    [{ root, id: "npm-package-win-dir" }, ["run", "package:win:dir"]],
    [{ root, id: "npm-package-win" }, ["run", "package:win"]],
    [{ root, id: "npm-validate-package-win" }, ["run", "validate:package:win"]],
  ];
  for (const [request, publicArgs] of requests) {
    const receipt = await runFixedReleaseCommand(request);
    assert.equal(receipt.status, "succeeded", `${request.id}: ${receipt.stderr}`);
    assert.equal(receipt.exitCode, 0, request.id);
    assert.deepEqual(receipt.command, { executable: "npm", args: publicArgs });
    if (request.id !== "npm-ci" && request.id !== "npm-set-version") {
      assert.match(receipt.stdout, /windows-npm-adapter-ok/, request.id);
    }
  }
});
