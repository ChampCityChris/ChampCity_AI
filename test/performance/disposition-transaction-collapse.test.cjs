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

test("renderer success actions contain one mutation IPC and no immediate reconstruction IPC waterfall", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  const cases = [
    {
      name: "generic disposition",
      source: functionSource(source, "async function applyDisposition", "function renderDispositionControls"),
      mutation: "window.champcity.setDocumentDisposition(",
      forbidden: ["listDocuments(", "getProjectPlanningWorkspaceModel(", "resolveCurrentDocument(", "getCurrentWorkspaceModel(", "readDocument("],
    },
    {
      name: "Architect review",
      source: functionSource(source, "async function applyArchitectOutputReview", "async function refreshCurrentModel"),
      mutation: "window.champcity.reviewArchitectOutput(",
      forbidden: ["refreshDocuments(", "refreshArchitectOutputWorkspace("],
    },
    {
      name: "Work Card validation",
      source: functionSource(source, "async function applyOperatorValidationDecision", "async function generateWorkCardIntakeAndTransition"),
      mutation: "window.champcity.applyOperatorValidationDecisionForCurrentWorkCard(",
      forbidden: ["listDocuments(", "getProjectPlanningWorkspaceModel(", "resolveCurrentDocument(", "getCurrentWorkspaceModel(", "readDocument("],
    },
    {
      name: "Issue Architect review",
      source: functionSource(source, "async function runIssueArchitectReview", "async function refreshIssuePlanningProjection"),
      mutation: "window.champcity.applyIssueArchitectReview(",
      forbidden: ["window.champcity.getIssueResolutionNavigationProjection(", "window.champcity.getIssuePlanningProjection("],
    },
    {
      name: "aggregate Issue validation",
      source: functionSource(source, "async function runIssueValidationDecision", "async function refreshIssueCloseProjection"),
      mutation: "window.champcity.applyIssueValidationDecision(",
      forbidden: ["window.champcity.getIssueResolutionNavigationProjection(", "window.champcity.getIssuePlanningProjection(", "window.champcity.getIssueCloseProjection("],
    },
    {
      name: "Issue Planning review",
      source: functionSource(source, "async function runIssuePlanningReview", "async function refreshIssueFixCardProjection"),
      mutation: "window.champcity.applyIssuePlanningReview(",
      forbidden: ["window.champcity.getIssueResolutionNavigationProjection(", "window.champcity.getIssuePlanningProjection("],
    },
    {
      name: "Fix Card contract review",
      source: functionSource(source, "async function runIssueFixCardContractReview", "async function runIssueFixCardValidationDecision"),
      mutation: "window.champcity.applyIssueFixCardContractReview(",
      forbidden: ["window.champcity.getIssueResolutionNavigationProjection(", "window.champcity.getIssuePlanningProjection("],
    },
    {
      name: "Fix Card validation",
      source: functionSource(source, "async function runIssueFixCardValidationDecision", "async function runIssueFixCardClose"),
      mutation: "window.champcity.applyIssueFixCardValidationDecision(",
      forbidden: ["window.champcity.getIssueResolutionNavigationProjection(", "window.champcity.getIssueValidationProjection("],
    },
    {
      name: "Fix Card Close / Next",
      source: functionSource(source, "async function runIssueFixCardClose", "async function startIssueCodexImplementerExecution"),
      mutation: "window.champcity.closeIssueFixCard(",
      forbidden: ["window.champcity.getIssueResolutionNavigationProjection(", "window.champcity.getIssuePlanningProjection(", "window.champcity.getIssueValidationProjection("],
    },
  ];

  for (const entry of cases) {
    assert.equal(count(entry.source, entry.mutation), 1, `${entry.name} mutation IPC count`);
    for (const forbidden of entry.forbidden) {
      assert.equal(count(entry.source, forbidden), 0, `${entry.name} must not call ${forbidden}`);
    }
  }
  const developmentApplication = functionSource(
    source,
    "function applyDevelopmentPostMutationProjection",
    "function applyIssuePostMutationProjection",
  );
  const issueApplication = functionSource(
    source,
    "function applyIssuePostMutationProjection",
    "function focusProjectIntakeReviewSurface",
  );
  assert.doesNotMatch(developmentApplication, /window\.champcity\./);
  assert.doesNotMatch(issueApplication, /window\.champcity\./);

  const mainSource = fs.readFileSync(path.join(repoRoot, "src", "main", "main.ts"), "utf8");
  const currentWorkflowSource = fs.readFileSync(
    path.join(repoRoot, "src", "main", "currentWorkflow", "currentWorkflowService.ts"),
    "utf8",
  );
  const genericHandler = functionSource(mainSource, '"documents:setDisposition"', 'ipcMain.handle("documents:previewInitialization"');
  const architectHandler = functionSource(mainSource, '"architectOutput:review"', 'ipcMain.handle("currentWorkflow:getModel"');
  const workCardValidation = functionSource(
    currentWorkflowSource,
    "export function applyOperatorValidationDecisionForCurrentWorkCard",
    "export function createValidationAttemptForCurrentWorkCard",
  );
  assert.equal(count(genericHandler, "buildStableDevelopmentPostMutationResult("), 1);
  assert.equal(count(architectHandler, "buildStableDevelopmentPostMutationResult("), 1);
  assert.equal(count(workCardValidation, "buildStableDevelopmentPostMutationResult("), 1);
});

test("Development disposition meets the controlled 200-document latency gate", (context) => {
  const fixtureCount = 11;
  const roots = [];
  const samples = [];
  const structural = {
    preAcquisitions: 0,
    preInventoryScans: 0,
    postAcquisitions: 0,
    postInventoryScans: 0,
    finalContexts: 0,
  };

  try {
    for (let fixtureIndex = 0; fixtureIndex < fixtureCount; fixtureIndex += 1) {
      const root = tempWorkspace(`champcity-disposition-performance-${fixtureIndex}-`);
      roots.push(root);
      writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_performance.md", "project-intake", "Pending", {
        identity: { "Project.ArtifactKey": `performance-${fixtureIndex}` },
      });
      for (let documentIndex = 0; documentIndex < 200; documentIndex += 1) {
        writeDoc(
          root,
          `planning/performance/context-${String(documentIndex).padStart(3, "0")}.md`,
          "performance-context",
          "Approved",
          {
            participationRole: "contextOnly",
            identity: { fixtureIndex, documentIndex },
          },
        );
      }
    }

    for (let fixtureIndex = 0; fixtureIndex < roots.length; fixtureIndex += 1) {
      const root = roots[fixtureIndex];
      const documents = listPlanningDocuments(root);
      assert.equal(documents.length, 201);
      const target = documents.find((entry) => entry.metadata.artifactType === "project-intake");
      assert.ok(target);
      let phase = "pre";
      __setPlanningDocumentServiceTestHooks({
        onSnapshotAcquisition: () => { structural[`${phase}Acquisitions`] += 1; },
        onInventoryScan: () => { structural[`${phase}InventoryScans`] += 1; },
      });
      __setPlanningProjectionContextTestHooks({
        onContextCreated: () => { structural.finalContexts += 1; },
      });

      const startedAt = process.hrtime.bigint();
      const mutation = setGenericDocumentDispositionWithPlanningContext(
        root,
        target.logicalDocumentId,
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
          return buildDevelopmentPostMutationProjection(
            root,
            planningContext,
            currentModel,
            target.logicalDocumentId,
          );
        },
      );
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      assert.equal(transaction.documents.length, 201);
      assert.equal(transaction.planningGeneration, mutation.planningContext.generation);
      if (fixtureIndex > 0) {
        samples.push(durationMs);
      }
      __setPlanningDocumentServiceTestHooks();
      __setPlanningProjectionContextTestHooks();
    }

    const sorted = samples.slice().sort((left, right) => left - right);
    const median = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const maximum = sorted.at(-1);
    assert.equal(samples.length, 10);
    assert.ok(p95 <= 500, `p95 ${p95.toFixed(2)}ms exceeded 500ms`);
    assert.ok(maximum <= 1_000, `maximum ${maximum.toFixed(2)}ms exceeded 1000ms`);
    assert.deepEqual(structural, {
      preAcquisitions: fixtureCount,
      preInventoryScans: fixtureCount,
      postAcquisitions: fixtureCount,
      postInventoryScans: fixtureCount,
      finalContexts: fixtureCount,
    });
    context.diagnostic(
      `Development disposition evidence: 201 canonical planning documents; 1 warm-up + 10 measured iterations; median ${median.toFixed(2)}ms; p95 ${p95.toFixed(2)}ms; max ${maximum.toFixed(2)}ms; one pre-write and one post-write scan per iteration`,
    );
  } finally {
    __setPlanningDocumentServiceTestHooks();
    __setPlanningProjectionContextTestHooks();
    for (const root of roots) {
      fs.rmSync(path.dirname(root), { recursive: true, force: true });
    }
  }
});

function functionSource(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} missing`);
  assert.notEqual(end, -1, `${endMarker} missing`);
  return source.slice(start, end);
}

function count(source, token) {
  return source.split(token).length - 1;
}

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
