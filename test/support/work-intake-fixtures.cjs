const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { tempWorkspace } = require("./canonical-markdown-fixtures.cjs");

async function seedRoutedWorkIntake(t, selectedRouteId = "refactor-migration") {
  const root = tempWorkspace("champcity-routed-work-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main"); git("config", "user.name", "Fixture"); git("config", "user.email", "fixture@example.invalid");
  git("add", "--all"); git("commit", "--allow-empty", "-m", "baseline");
  const initialHead = git("rev-parse", "HEAD");
  const intakeService = require("../../dist/main/workIntake/workIntakeService.js");
  const routing = require("../../dist/main/workIntake/workRoutingAssessmentService.js");
  const decisions = require("../../dist/main/workIntake/workRouteDecisionService.js");
  const created = await intakeService.submitWorkIntake(root, { projectId: null, projectName: "Product", workRequest: "A bounded architecture change", desiredOutcome: "Preserve behavior",
    knownConstraints: "Preserve current product", hasExistingSourceOrPlanning: true, repositoryReviewContext: "", baseBranch: "main", baseCommit: initialHead });
  if (!created.ok) throw Error(JSON.stringify(created));
  const intake = created.value;
  const draft = await routing.prepareWorkRoutingAssessment(root, intake.intakeId);
  const draftPath = path.join(root, draft.submission.expectedDraftSlots[0].draftRelativePath);
  fs.mkdirSync(path.dirname(draftPath), { recursive: true });
  fs.writeFileSync(draftPath, `# Work Intake Routing Assessment\n## Recommended Route\nfeature-change\n## Traits\n- existing-source\n## Evidence\n- ${intake.relativePath}\n## Rationale\nA bounded change.\n## Alternate Route\nNone\n`);
  await routing.getWorkRoutingAssessment(root, intake.intakeId);
  const pending = await decisions.getWorkRouteDecision(root, intake.intakeId);
  const route = await decisions.decideWorkRoute(root, intake.intakeId, { expectedDecisionRevision: 0, sourceAssessment: pending.sourceAssessment,
    disposition: "override", selectedRouteId, rationale: "Operator selects the intended planning focus." });
  return { root, intake, route, git, initialHead };
}
module.exports = { seedRoutedWorkIntake };
