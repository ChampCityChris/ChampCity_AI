const assert = require("node:assert/strict");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { ArtifactPairService } = require("../../dist/main/artifacts");
const {
  processIpcPolicies,
  RoutedActionService,
  RoutedProcessInvocationService,
  WorkflowStateArtifactPort,
  WorkflowStateStore,
  bindRoutedArtifactWrite,
  recordRoutedArtifactCommit,
  updateReferenceNavigation,
} = require("../../dist/main/workflow");
const {
  createWorkflowStateIndex,
  defaultLifecycleActionTemplates,
  materializeActionCatalog,
} = require("../../dist/shared/workflow");

function bindings(overrides = {}) {
  return Object.fromEntries(
    defaultLifecycleActionTemplates.map((template) => [
      template.actionId,
      overrides[template.actionId] ?? {
        targetArtifactId: null,
        sourceArtifactIds: [],
        expectedOutputArtifactId: `champcity-ai/catalog/${template.expectedOutputArtifactType}/${template.actionId}`,
      },
    ]),
  );
}

async function withService(actionId, binding, run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-routed-process-"));
  let tick = 0;
  try {
    const artifactPairs = new ArtifactPairService({
      projectRoot: root,
      clock: () => `2026-07-14T18:00:${String(tick++).padStart(2, "0")}.000Z`,
      transactionIdFactory: () => `routed-${tick}`,
    });
    const store = new WorkflowStateStore(
      root,
      new WorkflowStateArtifactPort(artifactPairs),
    );
    const state = createWorkflowStateIndex({
      projectId: "champcity-ai",
      activePhaseId: "phase-03",
      createdAt: "2026-07-14T17:59:00.000Z",
      initialActionId: actionId,
      actions: materializeActionCatalog(
        defaultLifecycleActionTemplates,
        bindings({ [actionId]: binding }),
      ),
    });
    await store.initialize(state);
    const routedActions = new RoutedActionService(store);
    const service = new RoutedProcessInvocationService(
      routedActions,
      store,
      artifactPairs,
      () => "2026-07-14T18:01:00.000Z",
    );
    await run({ root, artifactPairs, service, state });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const representativeCases = [
  {
    category: "project",
    actionId: "project_intake_required",
    channel: "projectIntake:save",
    artifactType: "project_intake",
    artifactId: "champcity-ai/project/project_intake/PROJECT_INTAKE_test",
  },
  {
    category: "phase",
    actionId: "phase_mapping_required",
    channel: "phaseMap:save",
    artifactType: "phase_map",
    artifactId: "champcity-ai/project/phase_map/PHASE_MAP_test",
  },
  {
    category: "build",
    actionId: "implementer_execution_required",
    channel: "workCards:saveImplementerReportCapture",
    artifactType: "implementer_report",
    artifactId: "champcity-ai/phase-03/implementer_report/WC10",
    phaseId: "phase-03",
    workCardId: "WC10",
  },
  {
    category: "prove",
    actionId: "operator_validation_required",
    channel: "workCards:saveHumanValidationRecord",
    artifactType: "validation_report",
    artifactId: "champcity-ai/phase-03/validation_report/WC10",
    phaseId: "phase-03",
    workCardId: "WC10",
    payload: { validationResult: "Pass" },
  },
];

for (const item of representativeCases) {
  test(`${item.category} save uses real main authority, exact pair identity, registry, and transition`, async () => {
    await withService(
      item.actionId,
      {
        targetArtifactId: null,
        sourceArtifactIds: [],
        expectedOutputArtifactId: item.artifactId,
      },
      async ({ artifactPairs, service, state }) => {
        const result = await service.invoke({
          channel: item.channel,
          rendererBinding: state.currentAction,
          payload: item.payload ?? {},
          operation: async () => {
            const write = bindRoutedArtifactWrite({
              artifactId: "champcity-ai/reference/selection/must-not-win",
              artifactType: item.artifactType,
              ...(item.phaseId ? { phaseId: item.phaseId } : {}),
              ...(item.workCardId ? { workCardId: item.workCardId } : {}),
              relationships: {
                sources: [],
                expectedOutputs: [],
                supersedes: [],
                children: [],
              },
              data: { category: item.category },
            });
            assert.equal(write.artifactId, item.artifactId);
            const commit = await artifactPairs.commitArtifact({
              artifactId: write.artifactId,
              artifactType: write.artifactType,
              status: "active",
              projectId: "champcity-ai",
              ...(item.phaseId ? { phaseId: item.phaseId } : {}),
              ...(item.workCardId ? { workCardId: item.workCardId } : {}),
              relationships: write.relationships,
              payload: {
                title: `${item.category} routed output`,
                contentMarkdown: `# ${item.category} routed output\n`,
                data: write.data,
              },
              location: {
                directoryPath: `planning/test/${item.category}`,
                fileStem: `OUTPUT_${item.category}`,
              },
              expectedRevision: null,
            });
            recordRoutedArtifactCommit(commit.artifact);
            return { ok: true };
          },
        });

        assert.equal(result.ok, true, JSON.stringify(result));
        assert.equal(result.workflowTransition.stateRevision, 2);
        const registry = await artifactPairs.loadRegistry();
        const output = registry.entries.find(
          (entry) => entry.artifactId === item.artifactId,
        );
        assert.ok(output);
        assert.equal(output.synchronized, true);
        assert.equal(output.authoritative, true);
        assert.equal(
          registry.entries.some(
            (entry) => entry.artifactId === "champcity-ai/reference/selection/must-not-win",
          ),
          false,
        );
      },
    );
  });
}

test("reference navigation cannot authorize a lifecycle preview or write", async () => {
  await withService(
    "project_intake_required",
    {
      targetArtifactId: null,
      sourceArtifactIds: [],
      expectedOutputArtifactId:
        "champcity-ai/project/project_intake/PROJECT_INTAKE_test",
    },
    async ({ service }) => {
      const reference = updateReferenceNavigation(null, {
        selectedArtifactIds: ["champcity-ai/project/project_intake/reference"],
        previewArtifactId: "champcity-ai/project/project_intake/reference",
        updatedAt: "2026-07-14T18:00:00.000Z",
      });
      let invoked = false;
      const denied = await service.invoke({
        channel: "projectIntake:preview",
        rendererBinding: reference,
        payload: {},
        operation: () => {
          invoked = true;
          return { ok: true };
        },
      });
      assert.equal(denied.ok, false);
      assert.equal(denied.blocked, true);
      assert.equal(invoked, false);

      const referenceRead = await service.invoke({
        channel: "workCards:previewPlanningArtifact",
        rendererBinding: reference,
        payload: {},
        operation: () => ({ ok: true, content: "reference only" }),
      });
      assert.equal(referenceRead.ok, true);
      assert.equal(referenceRead.content, "reference only");
    },
  );
});

test("stale renderer revision and a different process screen are blocked before the handler runs", async () => {
  await withService(
    "phase_mapping_required",
    {
      targetArtifactId: null,
      sourceArtifactIds: [],
      expectedOutputArtifactId: "champcity-ai/project/phase_map/PHASE_MAP_test",
    },
    async ({ service, state }) => {
      let invoked = false;
      const stale = structuredClone(state.currentAction);
      stale.stateRevision += 1;
      stale.bindingSource.stateRevision += 1;
      const staleResult = await service.invoke({
        channel: "phaseMap:preview",
        rendererBinding: stale,
        payload: {},
        operation: () => {
          invoked = true;
          return { ok: true };
        },
      });
      assert.equal(staleResult.ok, false);
      assert.equal(invoked, false);

      const wrongScreen = await service.invoke({
        channel: "projectIntake:preview",
        rendererBinding: state.currentAction,
        payload: {},
        operation: () => {
          invoked = true;
          return { ok: true };
        },
      });
      assert.equal(wrongScreen.ok, false);
      assert.equal(invoked, false);
    },
  );
});

test("every registered process preview/write handler has one explicit authority policy", async () => {
  const mainSource = await readFile(
    path.resolve(__dirname, "../../src/main/main.ts"),
    "utf8",
  );
  const registered = [
    ...mainSource.matchAll(/registerProcessIpc\(\s*["']([^"']+)["']/g),
  ].map((match) => match[1]).sort();
  const policies = processIpcPolicies.map((policy) => policy.channel).sort();

  assert.deepEqual(registered, policies);
  assert.equal(new Set(policies).size, policies.length);
  assert.deepEqual(
    processIpcPolicies
      .filter((policy) => policy.kind === "non-routed")
      .map((policy) => policy.classification)
      .sort(),
    [
      "context-packet",
      "context-packet",
      "reference-navigation",
      "route-correction",
      "supporting-preparation",
      "supporting-preparation",
      "supporting-preparation",
      "supporting-preparation",
      "supporting-preparation",
      "supporting-preparation",
    ],
  );
});

test("Project Mapping owns planning/roadmap outputs and execution packets are optional context", () => {
  const policy = (channel) =>
    processIpcPolicies.find((item) => item.channel === channel);
  const planning = policy("projectPlanningDocuments:save");
  const roadmap = policy("projectRoadmap:save");
  const packet = policy("workCards:saveImplementerExecutionPacket");

  assert.equal(planning.kind, "routed");
  assert.equal(planning.operation, "supporting-write");
  assert.equal(planning.variants[0].actionId, "project_mapping_required");
  assert.equal(planning.transition.mode, "none");
  assert.ok(planning.allowedAuxiliaryArtifactTypes.includes("project_planning"));

  assert.equal(roadmap.kind, "routed");
  assert.equal(roadmap.operation, "save");
  assert.equal(roadmap.variants[0].actionId, "project_mapping_required");
  assert.equal(roadmap.variants[0].expectedOutputArtifactType, "roadmap");
  assert.equal(roadmap.transition.mode, "success");

  assert.equal(packet.kind, "non-routed");
  assert.equal(packet.classification, "supporting-preparation");
  assert.match(packet.reason, /optional non-authoritative context/i);
});
