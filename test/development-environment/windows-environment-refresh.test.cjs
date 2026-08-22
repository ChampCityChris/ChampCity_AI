const assert = require("node:assert/strict");
const test = require("node:test");

const {
  mergeWindowsEnvironment,
} = require("../../dist/main/developmentEnvironment/windowsEnvironmentRefresh.js");

test("Windows environment merge lets Machine override stale current values", () => {
  const merged = mergeWindowsEnvironment(
    { TOOL_HOME: "old-process" },
    { TOOL_HOME: "new-machine" },
    {},
  );

  assert.equal(merged.TOOL_HOME, "new-machine");
});

test("Windows environment merge lets User override Machine and current values", () => {
  const merged = mergeWindowsEnvironment(
    { TOOL_HOME: "old-process" },
    { TOOL_HOME: "new-machine" },
    { TOOL_HOME: "new-user" },
  );

  assert.equal(merged.TOOL_HOME, "new-user");
});

test("Windows environment merge preserves process-only variables", () => {
  const merged = mergeWindowsEnvironment(
    { CHAMPCITY_PROCESS_ONLY: "kept" },
    {},
    {},
  );

  assert.equal(merged.CHAMPCITY_PROCESS_ONLY, "kept");
});

test("Windows PATH merge uses Machine and User paths plus process-only additions", () => {
  const merged = mergeWindowsEnvironment(
    { Path: "C:\\OldMachine;C:\\ProcessOnly" },
    { Path: "C:\\NewMachine" },
    { Path: "C:\\NewUser" },
  );

  assert.equal(merged.Path, "C:\\NewMachine;C:\\NewUser;C:\\OldMachine;C:\\ProcessOnly");
});

test("Windows PATH merge deduplicates case-insensitively", () => {
  const merged = mergeWindowsEnvironment(
    { PATH: "C:\\Tools;C:\\ProcessOnly" },
    { Path: "c:\\tools;C:\\MachineOnly" },
    { path: "C:\\MACHINEONLY;C:\\UserOnly" },
  );

  assert.equal(merged.PATH, "c:\\tools;C:\\MachineOnly;C:\\UserOnly;C:\\ProcessOnly");
});
