const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  elevatedWrapperScript,
  NodeCommandRunner,
  WindowsDevelopmentEnvironmentProvisioner,
  windowsCommandLineFromArguments,
} = require("../../dist/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.js");

test("elevated command transport preserves target identity, ordered args, output streams, exit code, and cleanup", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-elevated-transport-"));
  const cwd = path.join(tempRoot, "work dir");
  fs.mkdirSync(cwd, { recursive: true });
  const observed = {};
  const runner = new NodeCommandRunner({
    tempRoot,
    executionIdFactory: () => "fixed-transport",
    processRunner: async (command, args) => {
      observed.command = command;
      observed.args = args;
      const requestPath = path.join(tempRoot, "elevated", "fixed-transport", "request.json");
      const request = JSON.parse(fs.readFileSync(requestPath, "utf8"));
      observed.request = request;
      fs.writeFileSync(request.resultPath, JSON.stringify({
        exitCode: 23,
        stdout: "target stdout",
        stderr: "target stderr",
      }), "utf8");
      return result(command, args, 23, "outer stdout must not win", "outer stderr must not win");
    },
  });

  const transported = await runner.runElevated("fake-tool.exe", [
    "alpha",
    "value with spaces",
    "quote ' mark",
  ], { cwd });

  assert.equal(transported.command, "fake-tool.exe");
  assert.deepEqual(transported.args, ["alpha", "value with spaces", "quote ' mark"]);
  assert.equal(transported.exitCode, 23);
  assert.equal(transported.stdout, "target stdout");
  assert.equal(transported.stderr, "target stderr");
  assert.equal(observed.request.command, "fake-tool.exe");
  assert.deepEqual(observed.request.args, ["alpha", "value with spaces", "quote ' mark"]);
  assert.equal(observed.request.arguments, "alpha \"value with spaces\" \"quote ' mark\"");
  assert.equal(observed.request.cwd, cwd);
  assert.match(observed.args.join(" "), /-EncodedCommand/);
  assert.doesNotMatch(observed.args.join(" "), /value with spaces/);
  assert.doesNotMatch(observed.args.join(" "), /fake-tool\.exe/);
  assert.equal(fs.existsSync(path.join(tempRoot, "elevated", "fixed-transport")), false);
});

test("Windows PowerShell target wrapper executes with ordered args, separated streams, and exact exit code without UAC", {
  skip: process.platform !== "win32",
}, async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-ps-wrapper-"));
  const cwd = path.join(tempRoot, "cwd");
  fs.mkdirSync(cwd, { recursive: true });
  const targetPath = path.join(tempRoot, "target.js");
  fs.writeFileSync(targetPath, [
    "const args = process.argv.slice(2);",
    "process.stdout.write(JSON.stringify(args));",
    "process.stderr.write('target stderr');",
    "process.exit(37);",
  ].join("\n"), "utf8");
  const targetArgs = [
    targetPath,
    "normal",
    "value with spaces",
    "",
    "embedded \" quote",
    "space trailing\\",
    "slash before quote \\\" end",
  ];
  const resultPath = path.join(tempRoot, "result.json");
  const requestPath = path.join(tempRoot, "request.json");
  fs.writeFileSync(requestPath, JSON.stringify({
    command: process.execPath,
    args: targetArgs,
    arguments: windowsCommandLineFromArguments(targetArgs),
    cwd,
    resultPath,
  }), "utf8");

  const wrapper = elevatedWrapperScript(requestPath);
  assert.doesNotMatch(wrapper, /ArgumentList/);
  assert.doesNotMatch(wrapper, /StandardOutput\.ReadToEnd\(\)[\s\S]*StandardError\.ReadToEnd\(\)[\s\S]*WaitForExit\(\)/);
  const completed = await runProcess("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    encodePowerShellCommand(wrapper),
  ], { cwd });
  const envelope = JSON.parse(fs.readFileSync(resultPath, "utf8"));

  assert.equal(completed.exitCode, 37);
  assert.equal(envelope.exitCode, 37);
  assert.deepEqual(JSON.parse(envelope.stdout), targetArgs.slice(1));
  assert.equal(envelope.stderr, "target stderr");
});

test("Windows PowerShell target wrapper captures high stdout and stderr output without deadlock", {
  skip: process.platform !== "win32",
}, async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-ps-wrapper-output-"));
  const targetPath = path.join(tempRoot, "target-high-output.js");
  fs.writeFileSync(targetPath, [
    "process.stdout.write('O'.repeat(262144));",
    "process.stderr.write('E'.repeat(262144));",
    "process.exit(0);",
  ].join("\n"), "utf8");
  const targetArgs = [targetPath];
  const resultPath = path.join(tempRoot, "result.json");
  const requestPath = path.join(tempRoot, "request.json");
  fs.writeFileSync(requestPath, JSON.stringify({
    command: process.execPath,
    args: targetArgs,
    arguments: windowsCommandLineFromArguments(targetArgs),
    resultPath,
  }), "utf8");

  const completed = await runProcess("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    encodePowerShellCommand(elevatedWrapperScript(requestPath)),
  ], {});
  const envelope = JSON.parse(fs.readFileSync(resultPath, "utf8"));

  assert.equal(completed.exitCode, 0);
  assert.equal(envelope.exitCode, 0);
  assert.equal(envelope.stdout.length, 262144);
  assert.equal(envelope.stderr.length, 262144);
});

test("elevated command transport returns outer UAC cancellation when no target envelope exists", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-elevated-cancel-"));
  const runner = new NodeCommandRunner({
    tempRoot,
    executionIdFactory: () => "fixed-cancel",
    processRunner: async (command, args) => result(command, args, 1223, "", "operation was canceled"),
  });

  const transported = await runner.runElevated("fake-tool.exe", ["install"], {});

  assert.equal(transported.command, "powershell.exe");
  assert.equal(transported.exitCode, 1223);
  assert.match(transported.stderr, /canceled/);
  assert.equal(fs.existsSync(path.join(tempRoot, "elevated", "fixed-cancel")), false);
});

test("elevated command transport treats missing or malformed success envelope as failure", async () => {
  const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-elevated-missing-"));
  const missing = new NodeCommandRunner({
    tempRoot: missingRoot,
    executionIdFactory: () => "fixed-missing",
    processRunner: async (command, args) => result(command, args, 0, "", ""),
  });

  const missingResult = await missing.runElevated("fake-tool.exe", ["install"], {});
  assert.equal(missingResult.command, "fake-tool.exe");
  assert.equal(missingResult.exitCode, 1);
  assert.match(missingResult.stderr, /without a valid ChampCity result envelope/);
  assert.equal(fs.existsSync(path.join(missingRoot, "elevated", "fixed-missing")), false);

  const malformedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-elevated-malformed-"));
  const malformed = new NodeCommandRunner({
    tempRoot: malformedRoot,
    executionIdFactory: () => "fixed-malformed",
    processRunner: async (command, args) => {
      const request = JSON.parse(fs.readFileSync(
        path.join(malformedRoot, "elevated", "fixed-malformed", "request.json"),
        "utf8",
      ));
      fs.writeFileSync(request.resultPath, JSON.stringify({ nope: true }), "utf8");
      return result(command, args, 0, "", "");
    },
  });

  const malformedResult = await malformed.runElevated("fake-tool.exe", ["install"], {});
  assert.equal(malformedResult.command, "fake-tool.exe");
  assert.equal(malformedResult.exitCode, 1);
  assert.match(malformedResult.stderr, /without a valid ChampCity result envelope/);
  assert.equal(fs.existsSync(path.join(malformedRoot, "elevated", "fixed-malformed")), false);
});

test("production elevated transport feeds host-policy and generic target failures into classifier", async () => {
  const policy = await preflightWithElevatedEnvelope({
    exitCode: 1,
    stdout: "",
    stderr: "disabled by your organization",
  });
  assert.equal(policy.state, "blocked");
  assert.equal(policy.retryAllowed, false);
  assert.equal(policy.requirements[0].blockerKind, "host-policy");
  assert.equal(policy.requirements[0].retryAllowed, false);
  assert.match(policy.requirements[0].blocker, /Host policy/);

  const generic = await preflightWithElevatedEnvelope({
    exitCode: 1,
    stdout: "",
    stderr: "network unavailable",
  });
  assert.equal(generic.state, "resolution-required");
  assert.equal(generic.retryAllowed, true);
  assert.equal(generic.requirements[0].blockerKind, "provisioning-failure");
  assert.equal(generic.requirements[0].retryAllowed, true);
  assert.match(generic.requirements[0].blocker, /network unavailable/);
  assert.equal(generic.requirements[0].humanInteractionKind, undefined);
});

test("production elevated transport maps outer cancellation to typed Windows permission interaction", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-elevated-permission-"));
  const runner = nodeRunnerForProvisioner(tempRoot, {
    processRunner: async (command, args) => result(command, args, 1223, "", "operation was canceled"),
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
    tempRoot,
  });

  const resultModel = await provisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());

  assert.equal(resultModel.state, "waiting-for-operator");
  assert.equal(resultModel.retryAllowed, true);
  assert.equal(resultModel.requirements[0].humanInteractionKind, "windows-permission");
  assert.match(resultModel.requirements[0].humanInteractionReason, /permission/i);
});

async function preflightWithElevatedEnvelope(envelope) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-elevated-classifier-"));
  const runner = nodeRunnerForProvisioner(tempRoot, {
    processRunner: async (command, args) => {
      const request = JSON.parse(fs.readFileSync(
        path.join(tempRoot, "elevated", "fixed-provisioner", "request.json"),
        "utf8",
      ));
      assert.equal(request.command, "winget");
      assert.deepEqual(request.args, installArgs());
      fs.writeFileSync(request.resultPath, JSON.stringify(envelope), "utf8");
      return result(command, args, envelope.exitCode, "outer stdout", "outer stderr");
    },
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
    tempRoot,
  });
  return provisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
}

function nodeRunnerForProvisioner(tempRoot, { processRunner }) {
  let gitProbeCount = 0;
  return new NodeCommandRunner({
    tempRoot,
    executionIdFactory: () => "fixed-provisioner",
    processRunner: async (command, args, options) => {
      const key = callString({ command, args });
      if (key === "git --version") {
        gitProbeCount += 1;
        return gitProbeCount === 1
          ? result(command, args, null, "", "ENOENT")
          : result(command, args, 1, "", "still missing");
      }
      if (key === "winget --version") {
        return result(command, args, 0, "v1.11.0", "");
      }
      if (key === "winget configure --help") {
        return result(command, args, 0, "configure help", "");
      }
      if (key === "winget mcp") {
        return result(command, args, 1, "", "mcp unavailable");
      }
      if (key === "winget search --query git --source winget --accept-source-agreements") {
        return result(command, args, 0, "Name  Id  Version  Source\nGit  Git.Git  2.50.0  winget", "");
      }
      if (key === "winget search --query git --source msstore --accept-source-agreements") {
        return result(command, args, 0, "No package found", "");
      }
      if (key === callString({ command: "winget", args: installArgs() })) {
        return result(command, args, 1, "", "requires elevation");
      }
      if (command === "powershell.exe") {
        return processRunner(command, args, options);
      }
      return result(command, args, 1, "", `No fake response for ${key}`);
    },
  });
}

function installArgs() {
  return [
    "install",
    "--id",
    "Git.Git",
    "-e",
    "--source",
    "winget",
    "--accept-source-agreements",
    "--accept-package-agreements",
    "--disable-interactivity",
    "--silent",
  ];
}

function fakeRefresh() {
  return async () => ({ refreshed: true, summary: "refreshed", env: {} });
}

function result(command, args, exitCode, stdout, stderr) {
  return {
    command,
    args,
    exitCode,
    stdout,
    stderr,
  };
}

function callString(call) {
  return [call.command, ...call.args].join(" ");
}

function encodePowerShellCommand(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

function runProcess(command, args, options = {}) {
  const { spawn } = require("node:child_process");
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve(result(command, args, null, stdout.trim(), error.message));
    });
    child.on("close", (exitCode) => {
      resolve(result(command, args, exitCode, stdout.trim(), stderr.trim()));
    });
  });
}
