const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { seedPreparedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
const { checkpointOperatorDisposition } = require("../../dist/main/planExecution/operatorDispositionCheckpoint.js");

test("routed Issue completion commits only its bounded Markdown evidence on the Intake source line", async context => {
  const { root, intake, git } = seedPreparedRoutedWorkIntake(context, "issue-resolution");
  const issueId = "ISSUE_42";
  const closePath = `issues/${issueId}/Close_Records/ISSUE_CLOSE_RECORD_${issueId}.md`;
  fs.mkdirSync(path.dirname(path.join(root, closePath)), { recursive: true });
  fs.writeFileSync(path.join(root, closePath), "# Issue Close\n\nCurrent accepted correction.\n");
  const before = git("rev-parse", "HEAD");
  const result = await checkpointOperatorDisposition(root, intake.intakeId, "issue-completion-ISSUE_42", [closePath], issueId);
  assert.equal(result.status, "committed", result.message);
  assert.notEqual(result.commit, before);
  assert.equal(git("rev-parse", "HEAD"), result.commit);
  assert.match(git("show", "--format=", "--name-only", "HEAD"), /ISSUE_CLOSE_RECORD_ISSUE_42\.md/);
  const retry = await checkpointOperatorDisposition(root, intake.intakeId, "issue-completion-ISSUE_42", [closePath], issueId);
  assert.equal(retry.status, "committed", retry.message);
  assert.equal(retry.commit, result.commit);
  const outside = `issues/ISSUE_43/Close_Records/ISSUE_CLOSE_RECORD_ISSUE_43.md`;
  fs.mkdirSync(path.dirname(path.join(root, outside)), { recursive: true });
  fs.writeFileSync(path.join(root, outside), "# Other issue\n");
  const blocked = await checkpointOperatorDisposition(root, intake.intakeId, "issue-completion-ISSUE_43", [outside], issueId);
  assert.equal(blocked.status, "blocked");
  assert.equal(git("rev-parse", "HEAD"), result.commit);
});
