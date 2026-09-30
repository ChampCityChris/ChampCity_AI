"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { runDeterministicWorkItemProfile } = require("../../dist/main/workflow/deterministicWorkItemValidator.js");

test("deterministic Validator reuses the ValidationCatalog work-item profile and removes its scoped input", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-validator-profile-"));
  try {
    fs.mkdirSync(path.join(root, "scripts", "validation"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "validation", "cli.cjs"), "// fixture executor marker");
    let invocation;
    const result = await runDeterministicWorkItemProfile(root, ["src/example.ts", "src/example.ts"], ["workflow-runtime"],
      async (executable, args, cwd) => {
        invocation = { executable, args, cwd };
        const relativeChangeFile = args[args.indexOf("--changes") + 1];
        const changePath = path.join(root, ...relativeChangeFile.split("/"));
        const input = JSON.parse(fs.readFileSync(changePath, "utf8"));
        assert.deepEqual(input, { changedPaths: ["src/example.ts"], capabilityIds: ["workflow-runtime"] });
        assert.equal(args[args.indexOf("--profile") + 1], "work-item");
        return { exitCode: 0, stdout: JSON.stringify({ status: "passed", profile: "work-item", totals: { passed: 1 } }), stderr: "" };
      });
    assert.equal(result.status, "passed");
    assert.match(result.summary, /ValidationCatalog work-item profile/);
    assert.equal(invocation.cwd, root);
    assert.equal(fs.readdirSync(path.join(root, "tmp")).length, 0);
    await assert.rejects(runDeterministicWorkItemProfile(root, ["../escape"], [], async () => {
      throw new Error("invalid scope must not execute");
    }), /scope is invalid/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
