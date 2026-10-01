const assert = require("node:assert/strict");
const test = require("../support/windows-test.cjs");

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


test("persistent PATH matching normalizes whole entries and append preserves unrelated bytes", () => {
  const {windowsPathContains,appendWindowsUserPath,refreshWindowsProcessEnvironment}=require("../../dist/main/developmentEnvironment/windowsEnvironmentRefresh.js");
  const root="C:\\Program Files\\nodejs";
  assert.equal(windowsPathContains('C:\\Other; "c:/PROGRAM FILES/nodejs/" ;C:\\Last',root),true);
  assert.equal(windowsPathContains(root+"-other",root),false);
  const current='C:\\Other;"c:/PROGRAM FILES/nodejs/";C:\\Last';
  assert.equal(appendWindowsUserPath(current,root),current);
  assert.equal(appendWindowsUserPath("C:\\Other",root),"C:\\Other;"+root);
});

test("refresh returns persistent PATH separately from process-only PATH", async () => {
  const {refreshWindowsProcessEnvironment}=require("../../dist/main/developmentEnvironment/windowsEnvironmentRefresh.js");
  const previous={...process.env};
  try {
    const result=await refreshWindowsProcessEnvironment(async scope => scope === "Machine" ? {Path:"C:\\Machine"} : {PATH:"C:\\User"});
    assert.equal(result.machinePath,"C:\\Machine");assert.equal(result.userPath,"C:\\User");
    const merged=result.env.Path ?? result.env.PATH;
    assert.ok(merged.includes("C:\\Machine"));assert.ok(merged.includes("C:\\User"));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env,previous);
  }
});
