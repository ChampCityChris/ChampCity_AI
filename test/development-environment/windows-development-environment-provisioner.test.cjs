const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  WindowsDevelopmentEnvironmentProvisioner,
} = require("../../dist/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.js");
const {
  developmentEnvironmentCapabilityRegistry,
} = require("../../dist/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.js");
const {
  detectRepositoryEcosystemProviders,
  managedRequirementsForRepositoryEcosystemTools,
} = require("../../dist/main/developmentEnvironment/repositoryEcosystemProvider.js");
const {
  WindowsPackageProviderResolver,
  StdioWindowsPackageMcpClient,
} = require("../../dist/main/developmentEnvironment/windowsPackageProviderResolver.js");

test("Windows provisioner reports not-required without provisioning", async () => {
  const runner = fakeRunner();
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([], process.cwd());

  assert.equal(result.state, "not-required");
  assert.equal(runner.calls.length, 0);
});

test("satisfied managed capability causes no install and allows ready preflight", async () => {
  const runner = fakeRunner({
    "git --version": success("git version 2.50.0"),
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "git", provisioning: "managed", versionConstraint: ">=2" },
  ], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(result.requirements[0].beforeState, "satisfied");
  assert.equal(result.requirements[0].actionTaken, "none");
  assert.equal(runner.calls.some((call) => call.command === "winget"), false);
});

test("missing simple managed capability uses exact WinGet install, refreshes environment, and re-verifies", async () => {
  const runner = sequentialRunner({
    "git --version": [
      failure(null, "", "ENOENT"),
      success("git version 2.50.0"),
    ],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      success("installed"),
    ],
  });
  let refreshCount = 0;
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: async () => {
      refreshCount += 1;
      return { refreshed: true, summary: "refreshed", env: {} };
    },
  });

  const result = await provisioner.preflight([
    { capabilityId: "git", provisioning: "managed" },
  ], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(result.requirements[0].actionTaken, "install");
  assert.equal(result.requirements[0].afterState, "satisfied");
  assert.equal(result.requirements[0].providerAttempts.some((attempt) => attempt.provider === "winget-search"), true);
  assert.equal(refreshCount, 1);
  assert.equal(runner.calls.map(callString).includes("winget mcp"), true);
  assert.equal(runner.calls.some((call) => callString(call).startsWith("winget mcp find")), false);
  assert.equal(runner.calls.map(callString).includes("winget search --query git --source winget --accept-source-agreements"), true);
  assert.equal(runner.calls.map(callString).includes("winget search --query git --source msstore --accept-source-agreements"), true);
  assert.equal(runner.calls.map(callString).includes("winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent"), true);
});

test("already-installed CMake refreshes process environment and verifies from semantic probe", async () => {
  const runner = sequentialRunner({
    "cmake --version": [
      failure(null, "", "ENOENT"),
      success("cmake version 3.31.0"),
    ],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Kitware.CMake -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1, "No applicable update found. The package is already installed.", ""),
    ],
  });
  let refreshCount = 0;
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: async () => {
      refreshCount += 1;
      return { refreshed: true, summary: "parent PATH refreshed", env: {} };
    },
  });

  const result = await provisioner.preflight([
    { capabilityId: "cmake", provisioning: "managed", versionConstraint: ">=3.24" },
  ], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(result.requirements[0].beforeState, "missing");
  assert.equal(result.requirements[0].actionTaken, "install");
  assert.equal(result.requirements[0].afterState, "satisfied");
  assert.equal(result.requirements[0].detectedVersion, "3.31.0");
  assert.equal(refreshCount, 1);
  assert.equal(runner.calls.filter((call) => callString(call) === "cmake --version").length, 2);
  assert.equal(result.requirements[0].commandSummaries.some((command) =>
    command.command === "refresh Windows process environment" &&
    /parent PATH refreshed/.test(command.stdout)
  ), true);
});

test("already-installed CMake remains unresolved when refreshed semantic probe still fails", async () => {
  const runner = sequentialRunner({
    "cmake --version": [
      failure(null, "", "ENOENT"),
      failure(null, "", "ENOENT after refresh"),
    ],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Kitware.CMake -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1, "No available upgrade found. Package is already installed.", ""),
    ],
  });
  let refreshCount = 0;
  const result = await new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: async () => {
      refreshCount += 1;
      return { refreshed: true, summary: "parent PATH refreshed", env: {} };
    },
  }).preflight([
    { capabilityId: "cmake", provisioning: "managed", versionConstraint: ">=3.24" },
  ], process.cwd());

  assert.equal(result.state, "resolution-required");
  assert.equal(result.retryAllowed, true);
  assert.equal(result.requirements[0].beforeState, "missing");
  assert.equal(result.requirements[0].afterState, "missing");
  assert.equal(result.requirements[0].blockerKind, "verification-failure");
  assert.match(result.requirements[0].blocker, /remained missing after provisioning/);
  assert.equal(refreshCount, 1);
  assert.equal(runner.calls.filter((call) => callString(call) === "cmake --version").length, 2);
});

test("incompatible version provisions when registry supports minimum constraints", async () => {
  const runner = sequentialRunner({
    "node --version": [
      success("v18.0.0"),
      success("v20.12.0"),
    ],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      success("installed"),
    ],
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "nodejs-lts", provisioning: "managed", versionConstraint: ">=20" },
  ], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(result.requirements[0].beforeState, "incompatible");
  assert.equal(result.requirements[0].afterState, "satisfied");
});

test("missing external capability blocks without install", async () => {
  const runner = fakeRunner();
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "vendor-license", provisioning: "external" },
  ], process.cwd());

  assert.equal(result.state, "blocked");
  assert.equal(result.retryAllowed, false);
  assert.equal(result.requirements[0].actionTaken, "external-block");
  assert.equal(result.requirements[0].blockerKind, "external");
  assert.equal(result.requirements[0].retryAllowed, false);
  assert.match(result.requirements[0].blocker, /externally owned/);
  assert.equal(runner.calls.length, 0);
});

test("unknown managed capability enters recoverable provider-backed resolution instead of unsupported", async () => {
  const runner = fakeRunner();
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "unknown-tool", provisioning: "managed" },
  ], process.cwd());

  assert.equal(result.state, "resolution-required");
  assert.equal(result.retryAllowed, true);
  assert.equal(result.requirements[0].blockerKind, "provider-resolution-required");
  assert.equal(result.requirements[0].retryAllowed, true);
  assert.match(result.requirements[0].blocker, /did not resolve an exact package candidate/);
  assert.equal(runner.calls.some((call) => callString(call).startsWith("winget search")), true);
});

test("WinGet MCP discovery uses stdio provider client and never invents winget mcp find", async () => {
  const runner = fakeRunner({
    "winget mcp": success(JSON.stringify({
      mcpServers: {
        winget: {
          command: "C:\\Program Files\\WindowsApps\\Microsoft.DesktopAppInstaller\\WindowsPackageManagerMCPServer.exe",
        },
      },
    })),
  });
  const mcpCalls = [];
  const resolver = new WindowsPackageProviderResolver(runner, {
    mcpClient: {
      async find(serverPath, query, workspaceRoot) {
        mcpCalls.push({ serverPath, query, workspaceRoot });
        return {
          summary: "fake stdio MCP find returned one package",
          rawText: JSON.stringify({ packages: [{ id: "Kitware.CMake", name: "CMake", version: "3.31.0", source: "winget" }] }),
          candidates: [{ packageId: "Kitware.CMake", packageName: "CMake", version: "3.31.0", source: "winget" }],
        };
      },
    },
  });

  const result = await resolver.resolvePackage(
    { capabilityId: "cmake", versionConstraint: ">=3.24", provisioning: "managed" },
    process.cwd(),
  );

  assert.equal(result.state, "resolved");
  assert.equal(result.candidate.packageId, "Kitware.CMake");
  assert.deepEqual(mcpCalls.map((call) => call.query), ["cmake"]);
  assert.equal(runner.calls.map(callString).includes("winget mcp"), true);
  assert.equal(runner.calls.some((call) => callString(call).startsWith("winget mcp find")), false);
  assert.equal(runner.calls.some((call) => callString(call).startsWith("winget search")), false);
});

test("WinGet MCP client uses official stdio transport for initialize, find, and close", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-fake-mcp-"));
  const logPath = path.join(tempRoot, "mcp-events.jsonl");
  const result = await new StdioWindowsPackageMcpClient().find(
    process.execPath,
    "cmake",
    process.cwd(),
    [path.join(__dirname, "..", "fixtures", "fake-winget-mcp-server.cjs"), logPath],
  );

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].packageId, "Kitware.CMake");
  assert.equal(result.candidates[0].source, "winget");
  assert.match(result.summary, /WinGet MCP find returned package discovery data/);

  const events = fs.readFileSync(logPath, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  assert.deepEqual(events.map((event) => event.event), [
    "initialized",
    "tools/list",
    "tools/call",
    "close",
  ]);
  assert.equal(events.find((event) => event.event === "tools/call").name, "find");
  assert.equal(events.find((event) => event.event === "tools/call").query, "cmake");
});

test("WinGet MCP call failure preserves direct WinGet fallback", async () => {
  const runner = fakeRunner({
    "winget mcp": success(JSON.stringify({
      mcpServers: {
        winget: {
          command: "C:\\Program Files\\WindowsApps\\Microsoft.DesktopAppInstaller\\WindowsPackageManagerMCPServer.exe",
        },
      },
    })),
  });
  const resolver = new WindowsPackageProviderResolver(runner, {
    mcpClient: {
      async find() {
        throw new Error("official MCP transport failure");
      },
    },
  });

  const result = await resolver.resolvePackage(
    { capabilityId: "cmake", versionConstraint: ">=3.24", provisioning: "managed" },
    process.cwd(),
  );

  assert.equal(result.state, "resolved");
  assert.equal(result.candidate.packageId, "Kitware.CMake");
  assert.equal(runner.calls.map(callString).includes("winget mcp"), true);
  assert.equal(runner.calls.some((call) => callString(call).startsWith("winget search")), true);
  assert.equal(result.attempts.some((attempt) =>
    attempt.provider === "winget-mcp" &&
    attempt.stage === "resolution" &&
    attempt.outcome === "failed" &&
    /official MCP transport failure/.test(attempt.summary)
  ), true);
});

test("missing or broken WinGet follows Microsoft repair path and retries command availability", async () => {
  const runner = sequentialRunner({
    "git --version": [
      failure(null, "", "ENOENT"),
      success("git version 2.50.0"),
    ],
    "winget --version": [
      failure(null, "", "ENOENT"),
      success("v1.11.0"),
    ],
    "winget configure --help": [success("configure help")],
    [`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ${repairScript()}`]: [
      success("repaired"),
    ],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      success("installed"),
    ],
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "git", provisioning: "managed" },
  ], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(runner.calls.some((call) =>
    call.command === "powershell.exe" &&
    call.args.join(" ").includes("Repair-WinGetPackageManager -Force -Latest")
  ), true);
});

test("WinGet below 1.11 follows repair and reverification before v3 provisioning", async () => {
  const runner = sequentialRunner({
    "git --version": [
      failure(null, "", "ENOENT"),
      success("git version 2.50.0"),
    ],
    "winget --version": [
      success("v1.10.0"),
      success("v1.11.0"),
    ],
    "winget configure --help": [success("configure help")],
    [`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ${repairScript()}`]: [
      success("repaired"),
    ],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      success("installed"),
    ],
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(runner.calls.filter((call) => callString(call) === "winget --version").length, 2);
  assert.equal(runner.calls.some((call) => callString(call).includes("Repair-WinGetPackageManager -Force -Latest")), true);
});

test("WinGet repair elevation paths classify elevated results deterministically", async () => {
  const elevatedSuccess = elevatedSequentialRunner({
    normal: {
      "git --version": [failure(null, "", "ENOENT")],
      "winget --version": [failure(null, "", "ENOENT"), success("v1.11.0")],
      "winget configure --help": [success("configure help")],
      [`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ${repairScript()}`]: [
        failure(1, "", "requires elevation"),
      ],
      "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
        failure(1, "", "network unavailable"),
      ],
    },
    elevated: {
      [`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ${repairScript()}`]: [success("repaired elevated")],
    },
  });
  const successProvisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner: elevatedSuccess,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });
  const afterRepair = await successProvisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(elevatedSuccess.elevatedCalls.length, 1);
  assert.equal(afterRepair.state, "resolution-required");
  assert.match(afterRepair.requirements[0].blocker, /network unavailable/);

  const declined = elevatedSequentialRunner({
    normal: {
      "git --version": [failure(null, "", "ENOENT")],
      "winget --version": [failure(null, "", "ENOENT")],
      [`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ${repairScript()}`]: [
        failure(1, "", "requires elevation"),
      ],
    },
    elevated: {
      [`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ${repairScript()}`]: [
        failure(1223, "", "operation was canceled"),
      ],
    },
  });
  const declinedProvisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner: declined,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });
  const declinedResult = await declinedProvisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(declinedResult.state, "waiting-for-operator");
  assert.equal(declinedResult.retryAllowed, true);
  assert.equal(declinedResult.requirements[0].humanInteractionKind, "windows-permission");
  assert.equal(declinedResult.requirements[0].retryAllowed, true);
  assert.match(declinedResult.requirements[0].humanInteractionReason, /permission/i);

  const elevatedFailure = elevatedSequentialRunner({
    normal: {
      "git --version": [failure(null, "", "ENOENT")],
      "winget --version": [failure(null, "", "ENOENT")],
      [`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ${repairScript()}`]: [
        failure(1, "", "requires elevation"),
      ],
    },
    elevated: {
      [`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ${repairScript()}`]: [
        failure(1, "", "repair failed"),
      ],
    },
  });
  const failedProvisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner: elevatedFailure,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });
  const failedResult = await failedProvisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(failedResult.state, "resolution-required");
  assert.equal(failedResult.retryAllowed, true);
  assert.equal(failedResult.requirements[0].blockerKind, "provisioning-failure");
  assert.equal(failedResult.requirements[0].retryAllowed, true);
  assert.match(failedResult.requirements[0].blocker, /repair failed/);
  assert.doesNotMatch(failedResult.requirements[0].blocker ?? "", /permission/i);
});

test("ambiguous WinGet output blocks and cannot become install authority", async () => {
  const runner = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget search --query git --source winget --accept-source-agreements": [
      success("Name  Id  Version  Source\nGit A  Git.A  1.0.0  winget\nGit B  Git.B  1.0.0  winget"),
    ],
    "winget search --query git --source msstore --accept-source-agreements": [success("No package found")],
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "git", provisioning: "managed" },
  ], process.cwd());

  assert.equal(result.state, "resolution-required");
  assert.equal(result.retryAllowed, true);
  assert.equal(result.requirements[0].blockerKind, "ambiguous-package");
  assert.equal(result.requirements[0].retryAllowed, true);
  assert.match(result.requirements[0].blocker, /multiple materially plausible/);
  assert.equal(runner.calls.some((call) => callString(call).startsWith("winget install")), false);
});

test("msvc-x64 desktop-cpp uses WinGet configuration workload path", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-msvc-test-"));
  const runner = sequentialRunner({
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command msvcProbe": [
      failure(1, "", "missing"),
      success("Visual Studio 17.10.1 desktop-cpp profile ready"),
    ],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget configure --file config --accept-configuration-agreements --disable-interactivity": [
      success("configured"),
    ],
    "winget install --id Kitware.CMake -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      success("installed"),
    ],
  }, {
    normalizeCall(call) {
      if (call.command === "powershell.exe" && call.args.at(-1).includes("vswhere")) {
        return "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command msvcProbe";
      }
      if (call.command === "winget" && call.args[0] === "configure" && call.args[1] === "--file") {
        return "winget configure --file config --accept-configuration-agreements --disable-interactivity";
      }
      return callString(call);
    },
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
    tempRoot,
  });

  const result = await provisioner.preflight([
    { capabilityId: "msvc-x64", provisioning: "managed", profile: "desktop-cpp" },
  ], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(result.requirements[0].actionTaken, "configure");
  const configPath = runner.calls.find((call) =>
    call.command === "winget" &&
    call.args[0] === "configure" &&
    call.args[1] === "--file"
  ).args[2];
  const config = fs.readFileSync(configPath, "utf8");
  assert.match(config, /Microsoft\.WinGet\/Package/);
  assert.match(config, /Microsoft\.VisualStudio\.2022\.BuildTools/);
  assert.match(config, /Microsoft\.VisualStudio\.Workload\.VCTools/);
  assert.match(config, /-version '\[17\.0,18\.0\)'/);
  assert.match(config, /-products Microsoft\.VisualStudio\.Product\.BuildTools/);
  assert.doesNotMatch(config, /winget search/);
});

test("FO76 host-readiness shape reaches provider and composite resolution without static aliases", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-fo76-test-"));
  const runner = sequentialRunner({
    "cmake --version": [
      failure(null, "", "ENOENT"),
      success("cmake version 3.31.0"),
    ],
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command msvcProbe": [
      failure(1, "", "missing"),
      success("Visual Studio 17.10.1 desktop-cpp profile ready"),
    ],
    "winget configure --file config --accept-configuration-agreements --disable-interactivity": [
      success("configured"),
    ],
    "winget install --id Kitware.CMake -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      success("installed"),
    ],
  }, {
    normalizeCall(call) {
      if (call.command === "powershell.exe" && call.args.at(-1).includes("vswhere")) {
        return "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command msvcProbe";
      }
      if (call.command === "winget" && call.args[0] === "configure" && call.args[1] === "--file") {
        return "winget configure --file config --accept-configuration-agreements --disable-interactivity";
      }
      return callString(call);
    },
  });
  const result = await new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    arch: "x64",
    refreshEnvironment: fakeRefresh(),
    tempRoot,
  }).preflight([
    { capabilityId: "windows-x64-host", profile: "development-host", provisioning: "external" },
    { capabilityId: "cmake", versionConstraint: ">=3.24", provisioning: "managed" },
    { capabilityId: "visual-studio-2022-msvc-desktop-cpp", profile: "x64-cpp20", provisioning: "managed" },
  ], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(result.requirements[0].afterState, "satisfied");
  assert.equal(runner.calls.some((call) => callString(call).includes("windows-x64-host")), false);
  assert.equal(result.requirements[1].afterState, "satisfied");
  assert.equal(result.requirements[1].providerAttempts.some((attempt) => attempt.provider === "winget-search"), true);
  assert.equal(runner.calls.map(callString).includes("winget search --query cmake --source winget --accept-source-agreements"), true);
  assert.equal(runner.calls.some((call) => call.command === "winget" && call.args.includes(">=3.24")), false);
  assert.equal(result.requirements[2].actionTaken, "configure");
  assert.equal(result.requirements[2].afterState, "satisfied");
});

test("ordinary non-Microsoft WinGet community package resolves without registry package identity", async () => {
  const runner = sequentialRunner({
    "winget install --id MikeFarah.yq -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      success("installed"),
    ],
    "winget list --id MikeFarah.yq -e --source winget --accept-source-agreements": [
      success("Name  Id  Version  Source\nyq  MikeFarah.yq  4.44.0  winget"),
    ],
  });
  const result = await new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([{ capabilityId: "yq", versionConstraint: ">=4.0", provisioning: "managed" }], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(result.requirements[0].actionTaken, "install");
  assert.equal(runner.calls.some((call) => callString(call) === "yq --version"), false);
  assert.equal(runner.calls.some((call) => callString(call) === "winget list --id MikeFarah.yq -e --source winget --accept-source-agreements"), true);
  assert.equal(result.requirements[0].providerAttempts.some((attempt) =>
    attempt.candidates?.some((candidate) => candidate.packageId === "MikeFarah.yq")
  ), true);
});

test("FO76 host requirement structurally blocks on incompatible architecture", async () => {
  const result = await new WindowsDevelopmentEnvironmentProvisioner({
    runner: fakeRunner(),
    platform: "win32",
    arch: "arm64",
    refreshEnvironment: fakeRefresh(),
  }).preflight([
    { capabilityId: "windows-x64-host", profile: "development-host", provisioning: "external" },
  ], process.cwd());

  assert.equal(result.state, "blocked");
  assert.equal(result.requirements[0].actionTaken, "external-block");
  assert.equal(result.requirements[0].blockerKind, "external");
  assert.equal(result.requirements[0].retryAllowed, false);
  assert.match(result.requirements[0].commandSummaries[0].stdout, /win32; arch=arm64/);
});

test("zero-result provider search remains recoverable resolution-required", async () => {
  const runner = fakeRunner();
  const result = await new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([{ capabilityId: "made-up-build-tool", provisioning: "managed" }], process.cwd());

  assert.equal(result.state, "resolution-required");
  assert.equal(result.retryAllowed, true);
  assert.equal(result.requirements[0].blockerKind, "provider-resolution-required");
  assert.equal(result.requirements[0].providerAttempts.some((attempt) => attempt.outcome === "no-results"), true);
});

test("repository ecosystem provider recognizes native dependency authorities without library allowlists", () => {
  const cases = [
    ["package-lock.json", "npm"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["uv.lock", "uv-python"],
    ["requirements.txt", "python-requirements"],
    ["Cargo.toml", "cargo"],
    ["go.mod", "go-modules"],
    ["app.csproj", "dotnet"],
    ["pom.xml", "maven"],
    ["build.gradle.kts", "gradle"],
    ["vcpkg.json", "vcpkg"],
    ["conanfile.txt", "conan"],
    ["Gemfile", "bundler"],
    ["composer.json", "composer"],
  ];

  for (const [filename, ecosystem] of cases) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-ecosystem-"));
    fs.writeFileSync(path.join(root, filename), "", "utf8");
    const providers = detectRepositoryEcosystemProviders(root);
    assert.equal(providers.some((provider) => provider.ecosystem === ecosystem), true, ecosystem);
    assert.equal(providers.some((provider) => /express|requests|serde|react/i.test(provider.restoreCommand.join(" "))), false);
  }
});

test("repository ecosystem provider uses exact restore tool evidence without over-selecting wrappers or uv", () => {
  const mavenRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-maven-"));
  fs.writeFileSync(path.join(mavenRoot, "pom.xml"), "", "utf8");
  assert.deepEqual(
    detectRepositoryEcosystemProviders(mavenRoot).find((provider) => provider.ecosystem === "maven").restoreCommand,
    ["mvn", "dependency:go-offline"],
  );
  fs.writeFileSync(path.join(mavenRoot, "mvnw.cmd"), "", "utf8");
  assert.deepEqual(
    detectRepositoryEcosystemProviders(mavenRoot).find((provider) => provider.ecosystem === "maven").restoreCommand,
    ["mvnw.cmd", "dependency:go-offline"],
  );

  const gradleRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-gradle-"));
  fs.writeFileSync(path.join(gradleRoot, "build.gradle.kts"), "", "utf8");
  assert.deepEqual(
    detectRepositoryEcosystemProviders(gradleRoot).find((provider) => provider.ecosystem === "gradle").restoreCommand,
    ["gradle", "dependencies"],
  );
  fs.writeFileSync(path.join(gradleRoot, "gradlew.bat"), "", "utf8");
  assert.deepEqual(
    detectRepositoryEcosystemProviders(gradleRoot).find((provider) => provider.ecosystem === "gradle").restoreCommand,
    ["gradlew.bat", "dependencies"],
  );

  const pythonRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-python-"));
  fs.writeFileSync(path.join(pythonRoot, "requirements-dev.txt"), "", "utf8");
  const pythonProvider = detectRepositoryEcosystemProviders(pythonRoot)
    .find((provider) => provider.ecosystem === "python-requirements");
  assert.deepEqual(pythonProvider.restoreCommand, ["python", "-m", "pip", "install", "-r", "requirements-dev.txt"]);

  const pyprojectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-pyproject-"));
  fs.writeFileSync(path.join(pyprojectRoot, "pyproject.toml"), "", "utf8");
  assert.equal(detectRepositoryEcosystemProviders(pyprojectRoot).some((provider) => provider.ecosystem === "uv-python"), false);

  assert.deepEqual(
    managedRequirementsForRepositoryEcosystemTools([pythonProvider]),
    [{ capabilityId: "python", provisioning: "managed" }],
  );
});

test("msvc-x64 probe is bounded to Visual Studio 2022 generation", async () => {
  const runner = fakeRunner({
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command msvcProbe": failure(1, "Visual Studio 18 only", ""),
    "winget --version": success("v1.11.0"),
    "winget configure --help": success("configure help"),
    "winget configure --file config --accept-configuration-agreements --disable-interactivity": failure(1, "", "blocked before install"),
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner: {
      calls: runner.calls,
      run(command, args) {
        if (command === "powershell.exe" && args.at(-1).includes("vswhere")) {
          assert.match(args.at(-1), /-version '\[17\.0,18\.0\)'/);
          return runner.run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "msvcProbe"]);
        }
        if (command === "winget" && args[0] === "configure" && args[1] === "--file") {
          return runner.run("winget", ["configure", "--file", "config", "--accept-configuration-agreements", "--disable-interactivity"]);
        }
        return runner.run(command, args);
      },
    },
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "msvc-x64", provisioning: "managed", profile: "desktop-cpp" },
  ], process.cwd());

  assert.equal(result.state, "resolution-required");
  assert.equal(result.requirements[0].beforeState, "missing");
});

test("elevation and reboot map to resumable operator states", async () => {
  const elevationRunner = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1, "", "requires elevation"),
    ],
  });
  const elevationProvisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner: elevationRunner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });
  const elevation = await elevationProvisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(elevation.state, "waiting-for-operator");
  assert.equal(elevation.retryAllowed, true);
  assert.equal(elevation.requirements[0].humanInteractionKind, "windows-permission");
  assert.match(elevation.requirements[0].humanInteractionReason, /Windows permission/);

  const rebootRunner = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(3010, "restart required", ""),
    ],
  });
  const rebootProvisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner: rebootRunner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });
  const reboot = await rebootProvisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(reboot.state, "waiting-for-operator");
  assert.equal(reboot.retryAllowed, true);
  assert.equal(reboot.requirements[0].humanInteractionKind, "restart-required");
  assert.equal(reboot.summary, "Windows restart is required before the development environment can be verified.");
  assert.match(reboot.requirements[0].humanInteractionReason, /restart/);
});

test("permission and restart together remain waiting and retryable when no structural blocker exists", async () => {
  const runner = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "cmake --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0"), success("v1.11.0")],
    "winget configure --help": [success("configure help"), success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1, "", "requires elevation"),
    ],
    "winget install --id Kitware.CMake -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(3010, "restart required", ""),
    ],
  });
  const result = await new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([
    { capabilityId: "git", provisioning: "managed" },
    { capabilityId: "cmake", provisioning: "managed" },
  ], process.cwd());

  assert.equal(result.state, "waiting-for-operator");
  assert.equal(result.retryAllowed, true);
  assert.equal(result.summary, "Windows permission and restart are required before the development environment can be verified.");
  assert.deepEqual(result.requirements.map((requirement) => requirement.humanInteractionKind), [
    "windows-permission",
    "restart-required",
  ]);
});

test("structural blockers and recoverable provider gaps stay distinct in mixed preflight state", async () => {
  const restartAndUnsupportedRunner = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(3010, "restart required", ""),
    ],
  });
  const restartAndUnsupported = await new WindowsDevelopmentEnvironmentProvisioner({
    runner: restartAndUnsupportedRunner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([
    { capabilityId: "git", provisioning: "managed" },
    { capabilityId: "unknown-tool", provisioning: "managed" },
  ], process.cwd());
  assert.equal(restartAndUnsupported.state, "waiting-for-operator");
  assert.equal(restartAndUnsupported.retryAllowed, true);
  assert.match(restartAndUnsupported.summary, /restart/);
  assert.equal(restartAndUnsupported.requirements[0].humanInteractionKind, "restart-required");
  assert.equal(restartAndUnsupported.requirements[1].blockerKind, "provider-resolution-required");

  const permissionAndPolicyRunner = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "cmake --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0"), success("v1.11.0")],
    "winget configure --help": [success("configure help"), success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1, "", "requires elevation"),
    ],
    "winget install --id Kitware.CMake -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1, "", "disabled by your organization"),
    ],
  });
  const permissionAndPolicy = await new WindowsDevelopmentEnvironmentProvisioner({
    runner: permissionAndPolicyRunner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([
    { capabilityId: "git", provisioning: "managed" },
    { capabilityId: "cmake", provisioning: "managed" },
  ], process.cwd());
  assert.equal(permissionAndPolicy.state, "blocked");
  assert.equal(permissionAndPolicy.retryAllowed, false);
  assert.equal(permissionAndPolicy.summary, "Development environment preflight is blocked by unsatisfied requirements.");
  assert.equal(permissionAndPolicy.requirements[0].humanInteractionKind, "windows-permission");
  assert.equal(permissionAndPolicy.requirements[1].blockerKind, "host-policy");

  const retryableAndUnsupportedRunner = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1, "", "network unavailable"),
    ],
  });
  const retryableAndUnsupported = await new WindowsDevelopmentEnvironmentProvisioner({
    runner: retryableAndUnsupportedRunner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([
    { capabilityId: "git", provisioning: "managed" },
    { capabilityId: "unknown-tool", provisioning: "managed" },
  ], process.cwd());
  assert.equal(retryableAndUnsupported.state, "resolution-required");
  assert.equal(retryableAndUnsupported.retryAllowed, true);
  assert.equal(retryableAndUnsupported.summary, "Development environment resolution is required before Work Card implementation can start.");
  assert.equal(retryableAndUnsupported.requirements[0].blockerKind, "provisioning-failure");
  assert.equal(retryableAndUnsupported.requirements[1].blockerKind, "provider-resolution-required");
});

test("package original and elevated results are classified from the command that ran", async () => {
  const originalDecline = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1223, "", "operation was canceled"),
    ],
  });
  const originalDeclineResult = await new WindowsDevelopmentEnvironmentProvisioner({
    runner: originalDecline,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(originalDeclineResult.state, "waiting-for-operator");

  const elevatedSuccess = elevatedSequentialRunner({
    normal: {
      "git --version": [failure(null, "", "ENOENT"), success("git version 2.50.0")],
      "winget --version": [success("v1.11.0")],
      "winget configure --help": [success("configure help")],
      "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
        failure(1, "", "requires elevation"),
      ],
    },
    elevated: {
      "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
        success("installed"),
      ],
    },
  });
  const successResult = await new WindowsDevelopmentEnvironmentProvisioner({
    runner: elevatedSuccess,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(successResult.state, "ready");
  assert.equal(elevatedSuccess.elevatedCalls.length, 1);

  const elevatedReboot = elevatedSequentialRunner({
    normal: {
      "git --version": [failure(null, "", "ENOENT")],
      "winget --version": [success("v1.11.0")],
      "winget configure --help": [success("configure help")],
      "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
        failure(1, "", "requires elevation"),
      ],
    },
    elevated: {
      "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
        failure(3010, "restart required", ""),
      ],
    },
  });
  const rebootResult = await new WindowsDevelopmentEnvironmentProvisioner({
    runner: elevatedReboot,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(rebootResult.state, "waiting-for-operator");
  assert.match(rebootResult.requirements[0].humanInteractionReason, /restart/);

  const elevatedPolicy = elevatedSequentialRunner({
    normal: {
      "git --version": [failure(null, "", "ENOENT")],
      "winget --version": [success("v1.11.0")],
      "winget configure --help": [success("configure help")],
      "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
        failure(1, "", "requires elevation"),
      ],
    },
    elevated: {
      "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
        failure(1, "", "disabled by your organization"),
      ],
    },
  });
  const policyResult = await new WindowsDevelopmentEnvironmentProvisioner({
    runner: elevatedPolicy,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  }).preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());
  assert.equal(policyResult.state, "blocked");
  assert.equal(policyResult.retryAllowed, false);
  assert.equal(policyResult.requirements[0].blockerKind, "host-policy");
  assert.equal(policyResult.requirements[0].retryAllowed, false);
  assert.match(policyResult.requirements[0].blocker, /Host policy/);
});

test("capability-specific version support blocks impossible fixed-major requests before install", async () => {
  const runner = fakeRunner();
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "python", provisioning: "managed", versionConstraint: ">=3.13" },
  ], process.cwd());

  assert.equal(result.state, "resolution-required");
  assert.equal(result.retryAllowed, true);
  assert.equal(result.requirements[0].blockerKind, "provider-resolution-required");
  assert.equal(result.requirements[0].retryAllowed, true);
  assert.equal(runner.calls.some((call) => callString(call).startsWith("winget search")), true);
});

test("bare Ninja version output satisfies constrained requirements", async () => {
  const runner = fakeRunner({
    "ninja --version": success("1.12.1"),
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([
    { capabilityId: "ninja", provisioning: "managed", versionConstraint: ">=1.11" },
  ], process.cwd());

  assert.equal(result.state, "ready");
  assert.equal(result.requirements[0].detectedVersion, "1.12.1");
  assert.equal(runner.calls.length, 1);
});

test("installation failure prevents ready state", async () => {
  const runner = sequentialRunner({
    "git --version": [failure(null, "", "ENOENT")],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      failure(1, "", "network unavailable"),
    ],
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());

  assert.equal(result.state, "resolution-required");
  assert.equal(result.retryAllowed, true);
  assert.equal(result.requirements[0].blockerKind, "provisioning-failure");
  assert.equal(result.requirements[0].retryAllowed, true);
  assert.match(result.requirements[0].blocker, /network unavailable/);
});

test("post-provision verification failure is blocked but retryable", async () => {
  const runner = sequentialRunner({
    "git --version": [
      failure(null, "", "ENOENT"),
      failure(1, "", "still missing"),
    ],
    "winget --version": [success("v1.11.0")],
    "winget configure --help": [success("configure help")],
    "winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity --silent": [
      success("installed"),
    ],
  });
  const provisioner = new WindowsDevelopmentEnvironmentProvisioner({
    runner,
    platform: "win32",
    refreshEnvironment: fakeRefresh(),
  });

  const result = await provisioner.preflight([{ capabilityId: "git", provisioning: "managed" }], process.cwd());

  assert.equal(result.state, "resolution-required");
  assert.equal(result.retryAllowed, true);
  assert.equal(result.requirements[0].blockerKind, "verification-failure");
  assert.equal(result.requirements[0].retryAllowed, true);
  assert.match(result.requirements[0].blocker, /remained unknown after provisioning/);
});

test("registry supports required initial capability IDs", () => {
  for (const capabilityId of ["git", "cmake", "ninja", "nodejs-lts", "python", "dotnet-sdk", "rust", "jdk", "msvc-x64"]) {
    assert.equal(developmentEnvironmentCapabilityRegistry.has(capabilityId), true, capabilityId);
  }
});

function fakeRefresh() {
  return async () => ({ refreshed: true, summary: "refreshed", env: {} });
}

function fakeRunner(responses = {}) {
  const calls = [];
  return {
    calls,
    async run(command, args) {
      const call = { command, args };
      calls.push(call);
      const key = callString(call);
      return responseFor(command, args, responses[key] ?? defaultProviderResponse(call) ?? failure(1, "", `No fake response for ${key}`));
    },
  };
}

function sequentialRunner(responses, options = {}) {
  const calls = [];
  const remaining = new Map(Object.entries(responses));
  const normalizeCall = options.normalizeCall ?? callString;
  return {
    calls,
    async run(command, args) {
      const call = { command, args };
      calls.push(call);
      const key = normalizeCall(call);
      const queue = remaining.get(key);
      if (queue?.length) {
        return responseFor(command, args, queue.shift());
      }
      const fallback = defaultProviderResponse(call);
      assert.ok(fallback, `No fake response for ${key}`);
      return responseFor(command, args, fallback);
    },
  };
}

function elevatedSequentialRunner({ normal, elevated }) {
  const normalRunner = sequentialRunner(normal);
  const elevatedRunner = sequentialRunner(elevated);
  return {
    calls: normalRunner.calls,
    elevatedCalls: elevatedRunner.calls,
    run: normalRunner.run,
    runElevated: elevatedRunner.run,
  };
}

function responseFor(command, args, response) {
  return {
    command,
    args,
    exitCode: response.exitCode,
    stdout: response.stdout,
    stderr: response.stderr,
  };
}

function success(stdout = "") {
  return { exitCode: 0, stdout, stderr: "" };
}

function failure(exitCode = 1, stdout = "", stderr = "") {
  return { exitCode, stdout, stderr };
}

function callString(call) {
  return [call.command, ...call.args].join(" ");
}

function repairScript() {
  return [
    "Install-PackageProvider -Name NuGet -Force | Out-Null",
    "Install-Module -Name Microsoft.WinGet.Client -Force -Repository PSGallery | Out-Null",
    "Repair-WinGetPackageManager -Force -Latest",
  ].join("; ");
}

function defaultProviderResponse(call) {
  const key = callString(call);
  if (key === "winget mcp") {
    return failure(1, "", "mcp unavailable");
  }
  if (key === "winget --version") {
    return success("v1.11.0");
  }
  if (key === "winget configure --help") {
    return success("configure help");
  }
  if (call.command === "winget" && call.args[0] === "search") {
    const query = call.args[call.args.indexOf("--query") + 1];
    const source = call.args[call.args.indexOf("--source") + 1];
    const candidate = providerCandidateForQuery(query, source);
    return candidate
      ? success(`Name  Id  Version  Source\n${candidate.name}  ${candidate.id}  ${candidate.version}  ${source}`)
      : success("No package found");
  }
  if (call.args.length === 1 && call.args[0] === "--version") {
    return failure(null, "", "ENOENT");
  }
  return null;
}

function providerCandidateForQuery(query, source) {
  if (source !== "winget") {
    return null;
  }
  const normalized = query.toLowerCase();
  if (normalized.startsWith("git")) {
    return { name: "Git", id: "Git.Git", version: "2.50.0" };
  }
  if (normalized.startsWith("cmake")) {
    return { name: "CMake", id: "Kitware.CMake", version: "3.31.0" };
  }
  if (normalized.startsWith("nodejs-lts")) {
    return { name: "Node.js LTS", id: "OpenJS.NodeJS.LTS", version: "20.12.0" };
  }
  if (normalized.startsWith("node")) {
    return { name: "Node.js LTS", id: "OpenJS.NodeJS.LTS", version: "20.12.0" };
  }
  if (normalized.startsWith("yq")) {
    return { name: "yq", id: "MikeFarah.yq", version: "4.44.0" };
  }
  return null;
}
