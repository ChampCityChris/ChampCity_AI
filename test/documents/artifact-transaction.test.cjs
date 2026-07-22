const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  writeArtifactTransaction,
} = require("../../dist/main/documents/artifactTransaction.js");

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-artifact-transaction-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

test("artifact transaction creates synchronized artifact pairs", () => {
  const root = createWorkspace();

  const result = writeArtifactTransaction(root, [
    { relativePath: "planning/project/Example.md", content: "# Example\n" },
    { relativePath: "planning/project/Example.json", content: "{}\n" },
  ]);

  assert.deepEqual(result, {
    writtenPaths: ["planning/project/Example.md", "planning/project/Example.json"],
    rollbackGuaranteed: true,
    rollbackErrors: [],
  });
  assert.equal(fs.readFileSync(path.join(root, "planning/project/Example.md"), "utf8"), "# Example\n");
  assert.equal(fs.readFileSync(path.join(root, "planning/project/Example.json"), "utf8"), "{}\n");
});

test("artifact transaction rejects escaping and duplicate targets before writing", () => {
  const root = createWorkspace();

  assert.throws(
    () => writeArtifactTransaction(root, [{ relativePath: "../escape.md", content: "no\n" }]),
    /repository-relative/,
  );
  assert.throws(
    () => writeArtifactTransaction(root, [
      { relativePath: "planning/project/Dupe.md", content: "one\n" },
      { relativePath: "planning/project/Dupe.md", content: "two\n" },
    ]),
    /duplicated/,
  );
  assert.equal(fs.existsSync(path.join(root, "planning/project/Dupe.md")), false);
});
