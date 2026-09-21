const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { tempWorkspace } = require("./canonical-markdown-fixtures.cjs");

async function seedRoutedWorkIntake(t, selectedRouteId = "refactor-migration", intent = {}, options = {}) {
  const root = tempWorkspace("champcity-routed-work-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main"); git("config", "user.name", "Fixture"); git("config", "user.email", "fixture@example.invalid");
  options.setupRepository?.(root, git);
  git("add", "--all"); git("commit", "--allow-empty", "-m", "baseline");
  const initialHead = git("rev-parse", "HEAD");
  const intakeService = require("../../dist/main/workIntake/workIntakeService.js");
  const routing = require("../../dist/main/workIntake/workRoutingAssessmentService.js");
  const decisions = require("../../dist/main/workIntake/workRouteDecisionService.js");
  const created = await intakeService.submitWorkIntake(root, { projectId: null, projectName: "Product", workRequest: "A bounded architecture change", desiredOutcome: "Preserve behavior",
    knownConstraints: "Preserve current product", hasExistingSourceOrPlanning: true, repositoryReviewContext: "", ...intent, baseBranch: "main", baseCommit: initialHead });
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
async function seedApprovedRoutedWorkPlan(t, structure, routeId = "feature-change", options = {}) {
  const fixture = await seedRoutedWorkIntake(t, routeId, {}, options);
  const { root, intake } = fixture;
  const { workPlanningKernel: kernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  const { resolveWorkPlanningProfile } = require("../../dist/main/workPlanning/workPlanningProfiles.js");
  const profile = resolveWorkPlanningProfile(routeId);
  for (const stage of ["assessment", "plan"]) {
    let model = await kernel.prepare(root, intake.intakeId, stage);
    const body = `# ${stage === "assessment" ? "Route Architect Assessment" : "Work Plan"}\n\n` +
      profile[stage === "assessment" ? "assessmentSections" : "planSections"].map((heading) => `## ${heading}\nDeliver the bounded export contract while preserving existing row operations.`).join("\n\n") +
      (stage === "plan" ? `\n\n\`\`\`champcity-work-plan\n${JSON.stringify(structure)}\n\`\`\`\n` : "\n");
    const target = path.join(root, model.submission.expectedDraftSlots[0].draftRelativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body);
    model = await kernel.get(root, intake.intakeId, stage);
    await kernel.review(root, intake.intakeId, stage, { expectedRevision: model.artifact.artifactRevision, disposition: "Approved", notes: "Bounded export approved" });
  }
  const { activateRoutedDevelopmentExecutionBinding } = require("../../dist/main/planExecution/routedDevelopmentExecutionBinding.js");
  return { ...fixture, binding: await activateRoutedDevelopmentExecutionBinding(root, intake.intakeId) };
}

/**
 * Prepare the narrow canonical state owned by downstream planning tests.
 *
 * These tests do not own Work Intake submission, routing-draft promotion, or
 * Operator route-decision persistence. Keeping those upstream journeys here
 * made every profile assertion replay the same already-owned lifecycle. The
 * prepared fixture still uses production canonical writers, a real repository,
 * and the exact branch binding verified by the planning kernel.
 */
function seedPreparedRoutedWorkIntake(t, selectedRouteId = "refactor-migration", intent = {}) {
  const root = tempWorkspace("champcity-prepared-routed-work-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main"); git("config", "user.name", "Fixture"); git("config", "user.email", "fixture@example.invalid");
  git("add", "--all"); git("commit", "--allow-empty", "-m", "baseline");
  const initialHead = git("rev-parse", "HEAD");

  const { writeCanonicalMarkdownDocuments } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  const { workIntakeBranchName } = require("../../dist/main/workIntake/workIntakeBranchService.js");
  const intakeId = `intake-${randomUUID()}`;
  const projectId = `project-${randomUUID()}`;
  const repositoryId = `repository-${randomUUID()}`;
  const decisionId = `decision-${randomUUID()}`;
  const assessmentId = `assessment-${randomUUID()}`;
  const projectPath = "planning/work-intake/PROJECT.md";
  const intakePath = `planning/work-intake/intakes/${intakeId}.md`;
  const routePath = `planning/work-intake/routes/${intakeId}.md`;
  const workBranch = workIntakeBranchName(intakeId);
  git("switch", "-c", workBranch);

  const branchBinding = { intakeId, repositoryId, baseBranch: "main", baseCommit: initialHead, workBranch, currentHead: initialHead };
  const intakeData = {
    intakeId, projectId,
    workRequest: intent.workRequest ?? "A bounded architecture change",
    desiredOutcome: intent.desiredOutcome ?? "Preserve behavior",
    knownConstraints: intent.knownConstraints ?? "Preserve current product",
    hasExistingSourceOrPlanning: intent.hasExistingSourceOrPlanning ?? true,
    repositoryReviewContext: intent.repositoryReviewContext ?? "",
    branchBinding,
  };
  const sourceIntake = { path: intakePath, revision: 1 };
  const sourceAssessment = { path: `planning/work-intake/routing/${intakeId}.md`, revision: 1 };
  const advice = {
    kind: "architect-route-assessment", assessmentId, intakeId, sourceIntake, sourceEvidence: [sourceIntake],
    recommendedRouteId: selectedRouteId, traits: [], rationale: "Prepared downstream planning fixture.", relativePath: sourceAssessment.path, artifactRevision: 1,
  };
  const selection = {
    kind: "operator-route-decision", decisionId, intakeId, assessmentId, sourceAssessment,
    rationale: "Prepared downstream planning fixture.", disposition: "accept", selectedRouteId, traits: [],
  };
  const disposition = { status: "Pending", notes: "", reviewedAt: null };
  writeCanonicalMarkdownDocuments([
    {
      workspaceRoot: root, relativePath: projectPath,
      metadata: { schemaVersion: 1, artifactType: "work-project", artifactRevision: 1, participationRole: "contextOnly",
        identity: { projectId }, sourceRevisions: [], workflowData: { projectId, repositoryId, name: "Product" }, documentDisposition: disposition },
      bodyMarkdown: "# Project: Product\n",
    },
    {
      workspaceRoot: root, relativePath: intakePath,
      metadata: { schemaVersion: 1, artifactType: "work-intake", artifactRevision: 1, participationRole: "contextOnly",
        identity: { intakeId, projectId }, sourceRevisions: [{ path: projectPath, revision: 1 }], workflowData: intakeData, documentDisposition: disposition },
      bodyMarkdown: `# Work Intake: Product\n\n## Work request\n\n${intakeData.workRequest}\n\n## Desired outcome\n\n${intakeData.desiredOutcome}\n`,
    },
    {
      workspaceRoot: root, relativePath: routePath,
      metadata: { schemaVersion: 1, artifactType: "operator-route-decision", artifactRevision: 1, participationRole: "contextOnly",
        identity: { intakeId }, sourceRevisions: [sourceIntake], workflowData: {
          history: [{ decision: selection, sourceIntake, advice, recordedAt: "2026-01-01T00:00:00.000Z" }], supersessions: [],
        }, documentDisposition: disposition },
      bodyMarkdown: `# Operator Route Decision\n\nRoute: ${selectedRouteId}\n`,
    },
  ]);
  const intake = { ...intakeData, projectName: "Product", relativePath: intakePath, artifactRevision: 1, sourceRevisions: [{ path: projectPath, revision: 1 }] };
  const route = { intakeId, relativePath: routePath, artifactRevision: 1, state: "selected", selection, history: [], supersessions: [], recommendation: null, sourceAssessment: null };
  return { root, intake, route, git, initialHead };
}

module.exports = { seedRoutedWorkIntake, seedApprovedRoutedWorkPlan, seedPreparedRoutedWorkIntake };
