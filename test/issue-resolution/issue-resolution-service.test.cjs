const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createLightweightIssueRecord,
  discoverIssueInventory,
} = require("../../dist/main/issueResolution/issueResolutionService.js");

test("discovers only immediate numeric ISSUE directories in deterministic order", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_010", "# ISSUE_010 - Later\n\n## Issue\nLater.");
  writeIssue(root, "ISSUE_002", "# ISSUE_002 - Earlier\n\n## Issue\nEarlier.");
  fs.mkdirSync(path.join(root, "issues", "ISSUE_alpha"), { recursive: true });
  fs.mkdirSync(path.join(root, "issues", "ISSUE_003", "nested", "ISSUE_999"), { recursive: true });
  fs.writeFileSync(path.join(root, "issues", "ISSUE_003", "nested", "ISSUE_999", "ISSUE_RECORD.md"), "# Bad");
  fs.writeFileSync(path.join(root, "issues", "ISSUE_004.md"), "# Not a directory");

  const inventory = discoverIssueInventory(root);

  assert.deepEqual(inventory.issues.map((issue) => issue.issueId), ["ISSUE_002", "ISSUE_003", "ISSUE_010"]);
  assert.deepEqual(inventory.issues.map((issue) => issue.title), ["Earlier", "ISSUE_003", "Later"]);
  assert.equal(inventory.issues[1].recordState, "missing");
  assert.equal(inventory.issues[0].recordPath, "issues/ISSUE_002/ISSUE_RECORD.md");
});

test("discovery reads ISSUE_RECORD.md without rewriting it", () => {
  const root = tempProject();
  const recordPath = writeIssue(root, "ISSUE_001", "# ISSUE_001 - Bootstrap\n\n## Issue\nRead only.");
  const before = fs.readFileSync(recordPath, "utf8");
  const beforeStats = fs.statSync(recordPath);

  const inventory = discoverIssueInventory(root);

  assert.equal(inventory.issues[0].recordState, "readable");
  assert.equal(inventory.issues[0].bodyMarkdown, before);
  assert.equal(fs.readFileSync(recordPath, "utf8"), before);
  assert.equal(fs.statSync(recordPath).mtimeMs, beforeStats.mtimeMs);
});

test("new Issue allocates next ID, writes only ISSUE_RECORD.md, and omits empty optional sections", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_001", "# ISSUE_001 - Existing\n");

  const result = createLightweightIssueRecord(root, {
    title: "Renderer shell does not load",
    issue: "The shell opens blank.",
    currentConsequence: "The Operator cannot select workflows.",
    neededCapability: "",
    discoveryContext: "Found while Development was active.",
  });

  assert.equal(result.createdIssueId, "ISSUE_002");
  assert.equal(result.createdRecordPath, "issues/ISSUE_002/ISSUE_RECORD.md");
  const issueRoot = path.join(root, "issues", "ISSUE_002");
  assert.deepEqual(fs.readdirSync(issueRoot), ["ISSUE_RECORD.md"]);
  const body = fs.readFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), "utf8");
  assert.match(body, /^# ISSUE_002 \u2014 Renderer shell does not load$/m);
  assert.match(body, /^## Issue\nThe shell opens blank\.$/m);
  assert.match(body, /^## Current Consequence\nThe Operator cannot select workflows\.$/m);
  assert.doesNotMatch(body, /Needed Capability/);
  assert.match(body, /^## Discovery Context\nFound while Development was active\.$/m);
  assert.doesNotMatch(body, /phaseId|workCardId|Repair|sidecar|severity|assignee|SLA/i);
});

test("new Issue uses overwrite-disabled creation and required fields", () => {
  const root = tempProject();
  assert.throws(
    () => createLightweightIssueRecord(root, {
      title: "",
      issue: "Problem",
      currentConsequence: "Consequence",
    }),
    /Title is required/,
  );

  const result = createLightweightIssueRecord(root, {
    title: "First",
    issue: "Problem",
    currentConsequence: "Consequence",
    neededCapability: "Expected outcome",
  });
  assert.equal(result.createdIssueId, "ISSUE_001");
  assert.throws(
    () => fs.writeFileSync(path.join(root, result.createdRecordPath), "overwrite", { flag: "wx" }),
    /EEXIST/,
  );
});

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-issue-resolution-"));
}

function writeIssue(root, issueId, body) {
  const issueRoot = path.join(root, "issues", issueId);
  fs.mkdirSync(issueRoot, { recursive: true });
  const recordPath = path.join(issueRoot, "ISSUE_RECORD.md");
  fs.writeFileSync(recordPath, body, "utf8");
  return recordPath;
}
