const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  __setPlanningDocumentServiceTestHooks,
  listPlanningDocuments,
  setGenericDocumentDispositionWithPlanningContext,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  __setPlanningProjectionContextTestHooks,
} = require("../../dist/main/documents/planningProjectionContext.js");
const {
  __setDevelopmentPostMutationStabilizationTestHooks,
  buildDevelopmentPostMutationProjection,
  buildStableDevelopmentPostMutationResult,
  createFinalDevelopmentPlanningContext,
} = require("../../dist/main/documents/developmentPostMutationProjection.js");
const {
  __advanceArchitectOutputRuntimePromotionEpochForTest,
  getArchitectOutputRuntimePromotionEpoch,
} = require("../../dist/main/architectOutputs/architectOutputRuntimeService.js");
const {
  getCurrentWorkspaceModelFromContext,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  getArchitectOutputWorkspaceModel,
  mutateArchitectOutputReviewWithPlanningContext,
  prepareArchitectOutputHandoff,
  reviewArchitectOutputWithPlanningContext,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const {
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

const repoRoot = path.join(__dirname, "..", "..");

test("successful renderer dispositions consume the returned transaction with one IPC call", async (t) => {
  const ts = require("typescript");
  const vm = require("node:vm");
  const file = path.join(repoRoot, "src/renderer/app/App.tsx");
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  const cases = [
    ["applyDisposition", "setDocumentDisposition", []],
    ["applyArchitectOutputReview", "reviewArchitectOutput", []],
    ["applyOperatorValidationDecision", "applyOperatorValidationDecisionForCurrentWorkCard", ["Approve"]],
    ["runIssueArchitectReview", "applyIssueArchitectReview", [{ disposition: "Approved" }]],
    ["runIssueValidationDecision", "applyIssueValidationDecision", [{ decision: "ValidateResolved" }]],
    ["runIssuePlanningReview", "applyIssuePlanningReview", [{ disposition: "Approved" }]],
    ["runIssueFixCardContractReview", "applyIssueFixCardContractReview", [{ disposition: "Approved" }]],
    ["runIssueFixCardValidationDecision", "applyIssueFixCardValidationDecision", [{ decision: "Approve" }]],
    ["runIssueFixCardClose", "closeIssueFixCard", []],
  ];
  for (const [action, mutation, args] of cases) await t.test(mutation, async () => {
    const ipcCalls = [];
    const state = new Map();
    const development = {
      documents: [], projectPlanningModel: { generation: "final" },
      currentModel: { activeWorkspaceId: "work-card-planning" },
      resolverResult: { status: "all-approved", message: "Applied" },
      selectedDocument: { logicalDocumentId: "document", effectiveDisposition: "Approved" },
    };
    const postMutation = {
      navigation: { currentStageId: "issue-close" },
      planning: { generation: "final" }, validation: { generation: "final" }, close: { generation: "final" },
    };
    const result = { development, postMutation, projection: { currentStep: "close-next" }, architectOutput: {}, message: "Applied" };
    const scope = {
      Error,
      window: { champcity: new Proxy({}, { get: (_target, method) => async (...input) => {
        ipcCalls.push({ method, input });
        assert.equal(method, mutation, "success must not reconstruct state with another IPC");
        return result;
      } }) },
      selectedDocumentId: "document", selectedStatus: "Approved", selectedDocumentHasLocalError: false,
      activeWorkspaceId: "work-card-planning", architectOutputReviewStatus: "Approved",
      architectOutputReviewNotes: "reviewed", architectOutputModel: {}, workspace: { ok: false },
      architectOutputPollRequestRef: { current: 0 },
      presentedRevisionsForArchitectOutputModel: () => [],
      operatorValidationNotes: "reviewed", advisorySummary: "reviewed", repairDefectText: "",
      currentIssue: { issueId: "ISSUE_001" }, activeIssueFixCardStepId: "contract",
      getResolverFeedback: () => "Applied",
    };
    for (const setter of [
      "setIsApplying", "setDocumentError", "setFeedback", "setArchitectOutputModel",
      "setViewedArchitectOutputRevisionKeys", "setArchitectOutputReviewStatus", "setArchitectOutputReviewNotes",
      "setOperatorValidationNotes", "setAdvisorySummary", "setRepairDefectText", "applyDocumentInventory",
      "setProjectPlanningModel", "setCurrentModel", "setResolverResult", "setSelectedDocumentId",
      "setSelectedDocument", "setSelectedStatus", "transitionToWorkflowStep", "setIssueNavigationProjection",
      "setIssuePlanningProjection", "setIssueValidationProjection", "setIssueCloseProjection", "setActiveIssueStageId",
      "setIsIssueArchitectActionPending", "setIssueArchitectActionError", "setIssueArchitectActionFeedback",
      "setIssueArchitectProjection", "setIsIssuePlanningActionPending", "setIssuePlanningActionError",
      "setIssuePlanningActionFeedback", "setActiveIssueFixCardStepId", "setIssueFixCardProjection",
    ]) scope[setter] = (...values) => state.set(setter, values);
    const names = ["applyDevelopmentPostMutationProjection", "applyIssuePostMutationProjection", action];
    const program = names.map((name) => functions.get(name).getText(source)).join("\n") + `\n${action};`;
    const execute = vm.runInNewContext(ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
    await execute(...args);
    assert.equal(ipcCalls.length, 1);
    for (const key of ["setDocumentError", "setIssueArchitectActionError", "setIssuePlanningActionError"]) {
      if (state.has(key)) assert.deepEqual(state.get(key), [""]);
    }
    if (action.startsWith("runIssue")) {
      assert.equal(state.get("setIssueNavigationProjection")[0], postMutation.navigation);
      assert.equal(state.get("setIssuePlanningProjection")[0], postMutation.planning);
      assert.equal(state.get("setIssueValidationProjection")[0], postMutation.validation);
      assert.equal(state.get("setIssueCloseProjection")[0], postMutation.close);
      assert.deepEqual(state.get("setIsIssuePlanningActionPending") ?? state.get("setIsIssueArchitectActionPending"), [false]);
    } else {
      assert.equal(state.get("applyDocumentInventory")[0], development.documents);
      assert.equal(state.get("setCurrentModel")[0], development.currentModel);
      assert.equal(state.get("setSelectedDocument")[0], development.selectedDocument);
      assert.deepEqual(state.get("setIsApplying"), [false]);
    }
  });
});

test("generic Development disposition uses one pre-write and one final post-write planning acquisition", () => {
  const root = tempWorkspace("champcity-disposition-transaction-");
  writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Pending", {
    identity: { "Project.ArtifactKey": "demo" },
  });
  const document = listPlanningDocuments(root)[0];
  let phase = "pre";
  const acquisitions = { pre: 0, post: 0 };
  const inventoryScans = { pre: 0, post: 0 };
  let finalContexts = 0;
  __setPlanningDocumentServiceTestHooks({
    onSnapshotAcquisition: () => { acquisitions[phase] += 1; },
    onInventoryScan: () => { inventoryScans[phase] += 1; },
  });
  __setPlanningProjectionContextTestHooks({
    onContextCreated: () => { finalContexts += 1; },
  });

  try {
    const mutation = setGenericDocumentDispositionWithPlanningContext(
      root,
      document.logicalDocumentId,
      "Approved",
      {},
      () => {
        phase = "post";
        return createFinalDevelopmentPlanningContext(root);
      },
    );
    const transaction = buildStableDevelopmentPostMutationResult(
      root,
      mutation.planningContext,
      (planningContext) => {
        const currentModel = getCurrentWorkspaceModelFromContext(root, planningContext);
        return {
          document: planningContext.documents.find((entry) => entry.logicalDocumentId === document.logicalDocumentId),
          development: buildDevelopmentPostMutationProjection(
            root,
            planningContext,
            currentModel,
            document.logicalDocumentId,
          ),
        };
      },
    );
    assert.equal(transaction.document.effectiveDisposition, "Approved");
    assert.equal(transaction.development.planningGeneration, mutation.planningContext.generation);
    assert.equal(transaction.development.documents.find((entry) => entry.logicalDocumentId === document.logicalDocumentId).effectiveDisposition, "Approved");
    assert.equal(transaction.development.selectedDocument.logicalDocumentId, document.logicalDocumentId);
    assert.deepEqual(acquisitions, { pre: 1, post: 1 });
    assert.deepEqual(inventoryScans, { pre: 1, post: 1 });
    assert.equal(finalContexts, 1);
  } finally {
    __setPlanningDocumentServiceTestHooks();
    __setPlanningProjectionContextTestHooks();
  }
});

test("Development assembly discards a candidate when reachable Phase Map promotion advances durable state", () => {
  const root = tempWorkspace("champcity-development-stabilization-phase-map-");
  seedApprovedProjectPlanning(root, "demo");
  const prepared = prepareArchitectOutputHandoff(root, "project-phase-map");
  const draftPath = prepared.submission.draftSlots[0].draftRelativePath;
  const initialContext = createFinalDevelopmentPlanningContext(root);
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), validPhaseMapBody(), "utf8");

  const attempts = [];
  const discarded = [];
  const startEpoch = getArchitectOutputRuntimePromotionEpoch(root);
  __setDevelopmentPostMutationStabilizationTestHooks({
    beforeAssembly: (attempt, context) => attempts.push({ attempt, generation: context.generation }),
    onCandidateDiscarded: (attempt, context) => discarded.push({ attempt, generation: context.generation }),
  });
  try {
    const result = buildStableDevelopmentPostMutationResult(root, initialContext, (planningContext) => {
      const currentModel = getCurrentWorkspaceModelFromContext(root, planningContext);
      return buildDevelopmentPostMutationProjection(root, planningContext, currentModel, null);
    });
    const promoted = result.documents.find((entry) => entry.metadata.artifactType === "phase-map");
    assert.equal(getArchitectOutputRuntimePromotionEpoch(root), startEpoch + 1);
    assert.equal(attempts.length, 2);
    assert.equal(discarded.length, 1);
    assert.equal(discarded[0].generation, initialContext.generation);
    assert.notEqual(result.planningGeneration, initialContext.generation);
    assert.ok(promoted, "fresh retry must contain promoted Phase Map evidence");
    assert.equal(promoted.effectiveDisposition, "Pending");
    assert.equal(result.currentModel.activeWorkspaceId, "project-intake-capture");
    assert.equal(fs.existsSync(path.join(root, draftPath)), false);
  } finally {
    __setDevelopmentPostMutationStabilizationTestHooks();
  }
});

test("stable assembly observes a promotion epoch change at the deepest returned projection boundary", () => {
  const root = tempWorkspace("champcity-development-stabilization-deep-boundary-");
  writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Pending");
  const initialContext = createFinalDevelopmentPlanningContext(root);
  let assemblies = 0;
  const contexts = [];
  const result = buildStableDevelopmentPostMutationResult(root, initialContext, (planningContext) => {
    assemblies += 1;
    contexts.push(planningContext);
    const currentModel = getCurrentWorkspaceModelFromContext(root, planningContext);
    const development = buildDevelopmentPostMutationProjection(root, planningContext, currentModel, null);
    if (assemblies === 1) {
      __advanceArchitectOutputRuntimePromotionEpochForTest(root);
    }
    return development;
  });
  assert.equal(assemblies, 2);
  assert.notEqual(contexts[1], initialContext);
  assert.equal(result.planningGeneration, contexts[1].generation);
});

test("stabilizer does not inspect or promote an Architect submission outside supplied assembly", () => {
  const root = tempWorkspace("champcity-development-stabilization-unrelated-");
  seedApprovedProjectPlanning(root, "demo");
  const prepared = prepareArchitectOutputHandoff(root, "project-phase-map");
  const draftPath = prepared.submission.draftSlots[0].draftRelativePath;
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), validPhaseMapBody(), "utf8");
  const initialEpoch = getArchitectOutputRuntimePromotionEpoch(root);
  const initialContext = createFinalDevelopmentPlanningContext(root);

  const result = buildStableDevelopmentPostMutationResult(
    root,
    initialContext,
    (planningContext) => ({ generation: planningContext.generation, documents: planningContext.documents }),
  );

  assert.equal(result.generation, initialContext.generation);
  assert.equal(getArchitectOutputRuntimePromotionEpoch(root), initialEpoch);
  assert.equal(fs.existsSync(path.join(root, draftPath)), true);
  assert.equal(result.documents.some((entry) => entry.metadata.artifactType === "phase-map"), false);
});

test("failed Architect promotion does not advance the durable promotion epoch", () => {
  const root = tempWorkspace("champcity-development-stabilization-failed-promotion-");
  seedApprovedProjectPlanning(root, "demo");
  const prepared = prepareArchitectOutputHandoff(root, "project-phase-map");
  const draftPath = prepared.submission.draftSlots[0].draftRelativePath;
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), "# Invalid Phase Map\n\nMissing the required domain block.\n", "utf8");
  const initialEpoch = getArchitectOutputRuntimePromotionEpoch(root);
  const initialContext = createFinalDevelopmentPlanningContext(root);
  let attempts = 0;

  const result = buildStableDevelopmentPostMutationResult(root, initialContext, (planningContext) => {
    attempts += 1;
    const currentModel = getCurrentWorkspaceModelFromContext(root, planningContext);
    return buildDevelopmentPostMutationProjection(root, planningContext, currentModel, null);
  });

  assert.equal(attempts, 1);
  assert.equal(getArchitectOutputRuntimePromotionEpoch(root), initialEpoch);
  assert.equal(result.currentModel.activeWorkspaceId, "project-phase-map");
  assert.equal(result.documents.some((entry) => entry.metadata.artifactType === "phase-map"), false);
  assert.equal(fs.existsSync(path.join(root, draftPath)), true);
});

test("pathological promotion epoch changes exhaust the bounded retry budget and publish no success bundle", () => {
  const root = tempWorkspace("champcity-development-stabilization-bounded-");
  writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Pending");
  const initialContext = createFinalDevelopmentPlanningContext(root);
  let attempts = 0;
  let successBundle = null;
  __setDevelopmentPostMutationStabilizationTestHooks({
    afterAssembly: () => {
      __advanceArchitectOutputRuntimePromotionEpochForTest(root);
    },
  });
  try {
    assert.throws(
      () => {
        successBundle = buildStableDevelopmentPostMutationResult(root, initialContext, (planningContext) => {
          attempts += 1;
          const currentModel = getCurrentWorkspaceModelFromContext(root, planningContext);
          return buildDevelopmentPostMutationProjection(root, planningContext, currentModel, null);
        });
      },
      /could not establish stable Architect promotion state/,
    );
    assert.equal(attempts, 8);
    assert.equal(successBundle, null);
  } finally {
    __setDevelopmentPostMutationStabilizationTestHooks();
  }
});

test("Architect review returns a model and Development projection from the same final planning generation", () => {
  const root = tempWorkspace("champcity-architect-review-transaction-");
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Pending", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  const presented = getArchitectOutputWorkspaceModel(root, "architect-interview").documentSlots.map((slot) => ({
    slotId: slot.slotId,
    targetPath: slot.targetPath,
    artifactRevision: slot.artifactRevision,
  }));
  const generations = [];
  __setPlanningProjectionContextTestHooks({
    onContextCreated: (context) => { generations.push(context.generation); },
  });

  try {
    const review = reviewArchitectOutputWithPlanningContext(
      root,
      "architect-interview",
      "Approved",
      "Approved for the next lifecycle stage.",
      presented,
    );
    const currentModel = getCurrentWorkspaceModelFromContext(root, review.planningContext);
    const development = buildDevelopmentPostMutationProjection(
      root,
      review.planningContext,
      currentModel,
      review.architectOutput.documentSlots[0].logicalDocumentId,
    );
    assert.equal(generations.at(-1), review.planningContext.generation);
    assert.equal(development.planningGeneration, review.planningContext.generation);
    assert.equal(review.architectOutput.documentSlots[0].disposition, "Approved");
    assert.equal(
      development.documents.find((entry) => entry.markdownPath === interview).effectiveDisposition,
      "Approved",
    );
  } finally {
    __setPlanningProjectionContextTestHooks();
  }
});

test("Architect review rebuilds its model and Development projection together after a reachable promotion", () => {
  const root = tempWorkspace("champcity-architect-review-stabilization-");
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Pending", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  seedApprovedProjectPlanning(root, "demo");
  const presented = getArchitectOutputWorkspaceModel(root, "architect-interview").documentSlots.map((slot) => ({
    slotId: slot.slotId,
    targetPath: slot.targetPath,
    artifactRevision: slot.artifactRevision,
  }));
  const phaseMap = prepareArchitectOutputHandoff(root, "project-phase-map");
  const draftPath = phaseMap.submission.draftSlots[0].draftRelativePath;
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), validPhaseMapBody(), "utf8");

  const initialContext = mutateArchitectOutputReviewWithPlanningContext(
    root,
    "architect-interview",
    "Approved",
    "Approved for stabilized review evidence.",
    presented,
  );
  let attempts = 0;
  const result = buildStableDevelopmentPostMutationResult(root, initialContext, (planningContext) => {
    attempts += 1;
    const currentModel = getCurrentWorkspaceModelFromContext(root, planningContext);
    return {
      architectOutput: getArchitectOutputWorkspaceModel(root, "architect-interview", planningContext),
      development: buildDevelopmentPostMutationProjection(root, planningContext, currentModel, interview),
    };
  });

  assert.equal(attempts, 2);
  assert.equal(result.architectOutput.documentSlots[0].disposition, "Approved");
  assert.equal(
    result.development.documents.find((entry) => entry.markdownPath === interview).effectiveDisposition,
    "Approved",
  );
  assert.ok(result.development.documents.some((entry) => entry.metadata.artifactType === "phase-map"));
  assert.equal(result.architectOutput.documentSlots[0].artifactRevision, 1);
});

function percentile(sorted, percentage) {
  return sorted[Math.max(0, Math.ceil(sorted.length * percentage / 100) - 1)];
}

function validPhaseMapBody() {
  return [
    "# Phase Map",
    "",
    "```champcity-phase-map",
    JSON.stringify({
      phases: [{
        phaseId: "phase-build",
        title: "Build Phase",
        order: 1,
        purpose: "Build from the approved roadmap.",
        dependsOn: [],
        sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
      }],
    }, null, 2),
    "```",
  ].join("\n");
}
