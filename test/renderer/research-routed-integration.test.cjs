const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");

const { RoutedIntegrationWorkspace } = loadRendererSourceModule("src/renderer/app/RoutedIntegrationWorkspace.tsx");
const { seedResearchIntegrationCompletion } = require("../support/research-integration-scenarios.cjs");

function withHooks(values, render) {
  const originalState = React.useState;
  const originalEffect = React.useEffect;
  let index = 0;
  React.useState = (initial) => [index < values.length ? values[index++] : initial, () => undefined];
  React.useEffect = () => undefined;
  try { return render(); }
  finally { React.useState = originalState; React.useEffect = originalEffect; }
}

test("approved Research assessment navigates directly to Integration without Plan or Execution", async (t) => {
  const fixture = seedResearchIntegrationCompletion(t);
  const { getWorkIntakeNavigation } = require("../../dist/main/workIntake/workIntakeNavigationService.js");
  const navigation = await getWorkIntakeNavigation(fixture.root, fixture.intake.intakeId);
  assert.equal(navigation.requiredStageId, "integration");
  assert.deepEqual(navigation.stages.filter((stage) => stage.available).map((stage) => stage.stageId),
    ["intake", "routing", "assessment", "integration"]);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "plan").available, false);
  assert.equal(navigation.stages.find((stage) => stage.stageId === "execution").available, false);
});

test("dedicated Integration workspace presents Research wording without Plan or Work Item controls", () => {
  const research = { intakeId: "intake-fixture", route: "research-prototype", workBranch: "work-intake/research", targetBranch: "main", actions: ["integrate"], reasons: [],
    integration: { status: "ready", reasons: ["Accepted Research will be checkpointed before candidate construction."], completionKind: "research", completionFingerprint: "a".repeat(64), checkpointCommits: [] } };
  const researchMarkup = renderToStaticMarkup(withHooks([research, false, "", ""], () => RoutedIntegrationWorkspace({ intakeId: research.intakeId })));
  assert.match(researchMarkup, /Research Integration/);
  assert.match(researchMarkup, /Integrate completed Research/);
  assert.doesNotMatch(researchMarkup, /Plan execution|Begin approved Plan|Current Work Item|Plan acceptance/);

  const plan = { ...research, route: "feature-change", actions: ["integrate"], planPath: "planning/plan.md",
    execution: { planId: "PLAN01", planRevision: 1, topology: "direct", fingerprint: "b".repeat(64), status: "complete", complete: true,
      workItemsComplete: true, phasesComplete: true, criteriaSatisfied: true, blockers: [], workItems: [], phases: [], acceptance: [] },
    integration: { status: "ready", reasons: [], completionKind: "plan", completionFingerprint: "b".repeat(64), checkpointCommits: [] } };
  const planMarkup = renderToStaticMarkup(withHooks([plan, false, "", ""], () => RoutedIntegrationWorkspace({ intakeId: plan.intakeId })));
  assert.match(planMarkup, /Plan Integration/);
  assert.match(planMarkup, /Integrate completed Plan/);
});

test("repair-required Integration presents Codex execution without JSON patch transfer", () => {
  const candidateId = "a".repeat(64);
  const model = { intakeId: "intake-fixture", route: "feature-change", workBranch: "work-intake/feature", targetBranch: "main",
    actions: ["run-integration-repair", "integration-decision"], reasons: [],
    integration: { status: "repair-required", reasons: ["Candidate validation failed"], completionKind: "plan",
      completionFingerprint: "b".repeat(64), checkpointCommits: [], candidate: { candidateId, targetBranch: "main",
        incomingBranch: "work-intake/feature", validation: [{ checkId: "build", exitCode: 1, summary: "Type error" }], message: "Repair source" } },
    repair: { repairId: "REPAIR01", candidateId, status: "prepared", message: "Bounded source resolution prepared.",
      policy: { editablePaths: ["src/change.ts"] }, prompt: "# Governing intent" },
    integrationRepairImplementer: { state: "ready", executionKind: "integration-repair", canRunAgain: true,
      canResolveEnvironment: false, approvalTail: [], runtimeDenialTail: [], eventTail: [], stderrTail: [],
      finalResponseTail: [], pendingApproval: null, pendingUserInput: null, pendingMcpElicitation: null, runtimeState: null },
  };
  const markup = renderToStaticMarkup(withHooks([model, false, "", ""], () => RoutedIntegrationWorkspace({ intakeId: model.intakeId })));
  assert.match(markup, /Integration Repair required|Run Integration Repair|Codex execution console|Required validation|Failed/);
  assert.doesNotMatch(markup, /Integration Repair patch response|Apply source patch|<dt>Implementer Report<\/dt>|<dt>Work Card Contract<\/dt>/);
});

test("Integration preserves an explicit Operator decision state", () => {
  const model = { intakeId: "intake-fixture", route: "research-prototype", workBranch: "work-intake/research",
    targetBranch: "main", actions: [], reasons: [], integration: { status: "operator-decision-required",
      reasons: [], completionKind: "research", checkpointCommits: [], candidate: { candidateId: "a".repeat(64),
        targetBranch: "main", incomingBranch: "work-intake/research", validation: [], message: "Accepted intent conflicts." } } };
  const markup = renderToStaticMarkup(withHooks([model, false, "", ""], () => RoutedIntegrationWorkspace({ intakeId: model.intakeId })));
  assert.match(markup, /Research Integration/);
  assert.match(markup, /Operator decision required/);
  assert.match(markup, /Accepted intent conflicts\./);
  assert.doesNotMatch(markup, /Run Integration Repair|Apply source patch/);
});
