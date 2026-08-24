const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  CodexImplementerExecutionService,
  CODEX_AUTH_UNAVAILABLE_MESSAGE,
  CODEX_RUNTIME_UNAVAILABLE_MESSAGE,
} = require("../../dist/main/workCardBuilding/codexImplementerExecutionService.js");
const {
  generateCurrentHandoff,
  getCurrentWorkspaceModel,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  listPlanningDocuments,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Codex Implementer service starts App Server thread from current Implement context and exact prompt", async () => {
  const root = seedBuildReviewWorkspace();
  const captured = {};
  const service = new CodexImplementerExecutionService(async () => ({
    startThread(options) {
      captured.threadOptions = options;
      return {
        id: null,
        async runStreamed(prompt, turnOptions) {
          captured.prompt = prompt;
          captured.turnOptions = turnOptions;
          return { events: successfulEvents(root) };
        },
      };
    },
  }));

  const started = await service.start(root);
  assert.equal(started.state, "running");
  assert.equal(started.integrationMode, "app-server-stdio");
  assert.equal(captured.threadOptions.workingDirectory, path.resolve(root));
  assert.equal(captured.threadOptions.skipGitRepoCheck, true);
  assert.equal(captured.threadOptions.sandboxMode, "workspace-write");
  assert.deepEqual(captured.threadOptions.writableRoots, [path.resolve(root)]);
  assert.equal(captured.threadOptions.approvalPolicy, "on-request");
  assert.equal(captured.threadOptions.approvalsReviewer, "user");
  assert.equal(captured.threadOptions.networkAccessEnabled, true);

  const completed = await waitForState(service, root, "completed");
  assert.equal(completed.reportUpdated, true);
  assert.equal(completed.failureReason, null);
  assert.equal(completed.lastRunState, "completed");
  assert.equal(completed.canRunAgain, true);
  assert.equal(completed.retryBlocker, null);
  assert.match(captured.prompt, /^You are the Implementer for ChampCity A\/I\./);
  assert.match(captured.prompt, /Formal Work Card path: planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md/);
  assert.match(captured.prompt, /Implementer Report path: planning\/phases\/phase-01\/Implementer_Reports\/IMPLEMENTER_REPORT_WC01_first_work_card\.md/);
  assert.match(captured.prompt, /Do not stage, commit, push, tag, reset, clean, stash, or perform Git mutation/);
  assert.doesNotMatch(captured.prompt, /Do not modify files outside this repository root\./);
  assert.doesNotMatch(captured.prompt, /Do not write absolute local machine paths into repository artifacts\./);
  assert.doesNotMatch(captured.prompt, /production endpoints, screenshots, archives, build outputs/);
  assert.match(captured.prompt, /Do not disclose or commit secrets, credentials, authentication tokens, API\/provider keys, or private environment-file contents/);
  assert.match(captured.prompt, /No generic security scan, safety scan, path-sanitization scan, or secret-like-string scan is required/);
  assert.match(captured.prompt, /The application owns canonical identity, source revisions, repository authority, and disposition authority/);
  assert.match(captured.prompt, /missing development capability required by the Approved Work Card is not by itself a blocker/);
  assert.match(captured.prompt, /champcity-development-environment contract marks it managed/);
  assert.match(captured.prompt, /Repository-native dependency installation or restoration is implementation work/);
  assert.match(captured.prompt, /Package or dependency absence alone is not a reason to return the task to a nontechnical Operator/);
  assert.match(captured.prompt, /Do not install unrelated tools because they might be useful/);
  assert.match(captured.prompt, /human interaction such as UAC approval.*resumable interaction boundary/);
  assert.doesNotMatch(captured.prompt, /Application-verified development environment:/);
  assert.equal(captured.turnOptions.signal instanceof AbortSignal, true);
});

test("Codex Implementer idle status polling is side-effect free and does not provision environment", async () => {
  const root = seedBuildReviewWorkspace();
  let appServerFactoryCalled = 0;
  let preflightCalls = 0;
  const service = new CodexImplementerExecutionService(
    async () => {
      appServerFactoryCalled += 1;
      return {
        startThread() {
          throw new Error("Status polling must not start an App Server thread.");
        },
      };
    },
    () => Date.now(),
    defaultExecutionPolicy,
    {
      async runPreflight() {
        preflightCalls += 1;
        return notRequiredPreflight();
      },
    },
  );

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const status = await service.getStatus(root);

    assert.equal(status.state, "ready");
    assert.equal(status.canRunAgain, true);
    assert.equal(status.implementerReportPath, reportPath());
  }

  assert.equal(appServerFactoryCalled, 0);
  assert.equal(preflightCalls, 0);
});

test("Codex Implementer explicit start owns one App Server adapter across status reads and terminal cleanup", async () => {
  const root = seedBuildReviewWorkspace();
  let appServerFactoryCalled = 0;
  let startThreadCalled = 0;
  let appServerDisposeCount = 0;
  let threadDisposeCount = 0;
  let releaseExecution;
  const executionMayComplete = new Promise((resolve) => {
    releaseExecution = resolve;
  });
  const service = new CodexImplementerExecutionService(async () => {
    appServerFactoryCalled += 1;
    return {
      startThread() {
        startThreadCalled += 1;
        return {
          id: "thread-single-adapter",
          async runStreamed() {
            return { events: controlledSuccessfulEvents(root, executionMayComplete) };
          },
          async dispose() {
            threadDisposeCount += 1;
          },
        };
      },
      getRuntimeState: fakeRuntimeState,
      async dispose() {
        appServerDisposeCount += 1;
      },
    };
  });

  const started = await service.start(root);
  assert.equal(started.state, "running");
  assert.equal(appServerFactoryCalled, 1);
  assert.equal(startThreadCalled, 1);

  const secondStart = await service.start(root);
  assert.equal(secondStart.state, "running");
  assert.equal(secondStart.failureReason, "Codex execution is already running for this workspace.");
  assert.equal(secondStart.canRunAgain, false);
  assert.equal(appServerFactoryCalled, 1);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const runningStatus = await service.getStatus(root);
    assert.equal(runningStatus.state, "running");
    assert.equal(appServerFactoryCalled, 1);
  }

  releaseExecution();
  const completed = await waitForState(service, root, "completed");
  assert.equal(completed.reportUpdated, true);
  assert.equal(completed.canRunAgain, true);
  assert.equal(appServerFactoryCalled, 1);
  assert.equal(startThreadCalled, 1);
  assert.equal(threadDisposeCount, 1);
  assert.equal(appServerDisposeCount, 1);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const terminalStatus = await service.getStatus(root);
    assert.equal(terminalStatus.state, "completed");
    assert.equal(appServerFactoryCalled, 1);
  }
});

test("Codex Implementer service injects ready development environment evidence into prompt", async () => {
  const root = seedBuildReviewWorkspace();
  const captured = {};
  const service = new CodexImplementerExecutionService(
    async () => ({
      startThread(options) {
        captured.threadOptions = options;
        return {
          id: null,
          async runStreamed(prompt) {
            captured.prompt = prompt;
            return { events: noMutationEvents() };
          },
        };
      },
    }),
    () => Date.now(),
    defaultExecutionPolicy,
    {
      async runPreflight() {
        return {
          state: "ready",
          summary: "Development environment ready; 1 capability requirement(s) already satisfied.",
          retryAllowed: false,
          requirements: [{
            capabilityId: "git",
            provisioning: "managed",
            beforeState: "satisfied",
            actionTaken: "none",
            afterState: "satisfied",
            detectedVersion: "2.50.0",
            commandSummaries: [],
            retryAllowed: false,
          }],
          evidenceMarkdown: [
            "Development environment preflight evidence:",
            "- Final state: ready",
            "- git: satisfied -> satisfied; action=none; provisioning=managed; version=2.50.0",
          ].join("\n"),
        };
      },
    },
  );

  const started = await service.start(root);

  assert.equal(started.state, "running");
  assert.equal(started.developmentEnvironmentPreflight.state, "ready");
  assert.match(captured.prompt, /Application-verified development environment:/);
  assert.match(captured.prompt, /git: satisfied -> satisfied/);
  assert.match(captured.prompt, /Do not rewrite application-owned capability identity/);
});

test("Codex Implementer service constructs App Server transport only after successful preflight observes refreshed environment", async () => {
  const root = seedBuildReviewWorkspace();
  const markerKey = "CHAMPCITY_REPAIR01_ENV_MARKER";
  const previousMarker = process.env[markerKey];
  delete process.env[markerKey];
  const observedMarkers = [];
  const eventOrder = [];
  const service = new CodexImplementerExecutionService(
    async () => {
      eventOrder.push("appServerFactory");
      observedMarkers.push(process.env[markerKey]);
      return {
        startThread() {
          eventOrder.push("startThread");
          return {
            id: null,
            async runStreamed() {
              return { events: noMutationEvents() };
            },
          };
        },
      };
    },
    () => Date.now(),
    defaultExecutionPolicy,
    {
      async runPreflight() {
        eventOrder.push("preflight");
        process.env[markerKey] = "after-preflight";
        return notRequiredPreflight();
      },
    },
  );

  try {
    const started = await service.start(root);

    assert.equal(started.state, "running");
    assert.deepEqual(eventOrder.slice(0, 3), ["preflight", "appServerFactory", "startThread"]);
    assert.deepEqual(observedMarkers, ["after-preflight"]);
  } finally {
    if (previousMarker === undefined) {
      delete process.env[markerKey];
    } else {
      process.env[markerKey] = previousMarker;
    }
  }
});

test("Codex Implementer service blocks App Server start when development environment preflight is not ready", async () => {
  const root = seedBuildReviewWorkspace();
  let appServerFactoryCalled = false;
  let startThreadCalled = false;
  const service = new CodexImplementerExecutionService(
    async () => {
      appServerFactoryCalled = true;
      return {
        startThread() {
          startThreadCalled = true;
          return {
            id: null,
            async runStreamed() {
              return { events: noMutationEvents() };
            },
          };
        },
      };
    },
    () => Date.now(),
    defaultExecutionPolicy,
    {
      async runPreflight() {
        return {
          state: "blocked",
          summary: "Development environment preflight is blocked by unsatisfied requirements.",
          retryAllowed: false,
          requirements: [{
            capabilityId: "vendor-license",
            provisioning: "external",
            beforeState: "unknown",
            actionTaken: "external-block",
            afterState: "unknown",
            commandSummaries: [],
            blocker: "Capability vendor-license is externally owned and must be provided outside ChampCity.",
            blockerKind: "external",
            retryAllowed: false,
          }],
          evidenceMarkdown: "Development environment preflight evidence:\n- Final state: blocked",
        };
      },
    },
  );

  const blocked = await service.start(root);

  assert.equal(blocked.state, "unavailable");
  assert.equal(blocked.canRunAgain, false);
  assert.equal(blocked.developmentEnvironmentPreflight.state, "blocked");
  assert.match(blocked.retryBlocker, /blocked by unsatisfied requirements/);
  assert.equal(appServerFactoryCalled, false);
  assert.equal(startThreadCalled, false);
});

test("Codex Implementer service runs bounded environment resolution and reruns preflight before implementation", async () => {
  const root = seedBuildReviewWorkspace();
  const captured = {};
  let preflightCalls = 0;
  let refreshCalls = 0;
  const eventOrder = [];
  const service = new CodexImplementerExecutionService(
    async () => ({
      startThread(options) {
        captured.threadOptions = options;
        return {
          id: null,
          async runStreamed(prompt) {
            captured.prompt = prompt;
            return { events: environmentResolutionEvents() };
          },
        };
      },
    }),
    () => Date.now(),
    defaultExecutionPolicy,
    {
      async runPreflight() {
        preflightCalls += 1;
        eventOrder.push(`preflight-${preflightCalls}`);
        if (preflightCalls === 1) {
          return resolutionRequiredPreflight();
        }
        assert.equal(refreshCalls, 1);
        return {
          state: "ready",
          summary: "Development environment ready; 1 capability requirement(s) already satisfied.",
          retryAllowed: false,
          requirements: [{
            capabilityId: "made-up-build-tool",
            provisioning: "managed",
            beforeState: "satisfied",
            actionTaken: "none",
            afterState: "satisfied",
            commandSummaries: [],
            retryAllowed: false,
          }],
          evidenceMarkdown: "Development environment preflight evidence:\n- Final state: ready",
        };
      },
    },
    async () => {
      refreshCalls += 1;
      eventOrder.push("parent-refresh");
      return { refreshed: true, summary: "parent environment refreshed", env: {} };
    },
  );

  const unavailable = await service.start(root);
  assert.equal(unavailable.state, "unavailable");
  assert.equal(unavailable.canRunAgain, false);
  assert.equal(unavailable.canResolveEnvironment, true);
  assert.equal(unavailable.developmentEnvironmentPreflight.state, "resolution-required");

  const resolving = await service.startEnvironmentResolution(root);
  assert.equal(resolving.state, "running");
  assert.equal(resolving.executionKind, "environment-resolution");
  assert.equal(captured.threadOptions.workingDirectory, path.resolve(root));
  assert.equal(captured.threadOptions.sandboxMode, "danger-full-access");
  assert.match(captured.prompt, /Environment Resolution/);
  assert.match(captured.prompt, /not normal Work Card implementation/);
  assert.match(captured.prompt, /Approved Work Card path: planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md/);
  assert.match(captured.prompt, /Approved Work Card artifact revision: 1/);
  assert.match(captured.prompt, new RegExp(`Approved Work Card SHA-256: ${sha256(root, workCardPath())}`));
  assert.match(captured.prompt, /capabilityId: made-up-build-tool/);
  assert.match(captured.prompt, /versionConstraint: >=7\.2/);
  assert.match(captured.prompt, /profile: cli/);
  assert.match(captured.prompt, /provider: winget-mcp/);
  assert.match(captured.prompt, /provider: winget-search/);
  assert.match(captured.prompt, /packageId: Vendor\.MadeUpBuildTool/);
  assert.match(captured.prompt, /packageId: Community\.MadeUpBuildTool/);
  assert.match(captured.prompt, /command: winget mcp/);
  assert.match(captured.prompt, /exitCode: 1/);
  assert.match(captured.prompt, /stderr\/error: MCP server launch failed/);
  assert.match(captured.prompt, /Do not substitute project architecture, platform, compiler family, target architecture, package ecosystem, or approved capability identity/);

  const completed = await waitForState(service, root, "completed");
  assert.equal(completed.executionKind, "environment-resolution");
  assert.equal(completed.canResolveEnvironment, false);
  assert.equal(completed.canRunAgain, true);
  assert.equal(completed.developmentEnvironmentPreflight.state, "ready");
  assert.equal(completed.finalResponseTail.at(-1), "Environment Resolution completed.");
  assert.deepEqual(eventOrder, ["preflight-1", "parent-refresh", "preflight-2"]);
  assert.equal(completed.eventTail.some((event) => event.includes("environment-resolution.parent-environment-refresh.succeeded")), true);
  assert.equal(completed.eventTail.some((event) => event.includes("environment-resolution.preflight.ready")), true);
  assert.equal(preflightCalls, 2);
});

test("Codex Implementer service surfaces parent environment refresh failure before post-resolution preflight", async () => {
  const root = seedBuildReviewWorkspace();
  let preflightCalls = 0;
  const service = new CodexImplementerExecutionService(
    async () => ({
      startThread() {
        return {
          id: null,
          async runStreamed() {
            return { events: environmentResolutionEvents() };
          },
        };
      },
    }),
    () => Date.now(),
    defaultExecutionPolicy,
    {
      async runPreflight() {
        preflightCalls += 1;
        return resolutionRequiredPreflight();
      },
    },
    async () => {
      throw new Error("parent PATH refresh failed");
    },
  );

  await service.start(root);
  await service.startEnvironmentResolution(root);
  const failed = await waitForState(service, root, "failed");

  assert.equal(preflightCalls, 1);
  assert.equal(failed.executionKind, "environment-resolution");
  assert.equal(failed.failureReason, "Parent process environment refresh failed before deterministic preflight rerun: parent PATH refresh failed");
  assert.equal(failed.developmentEnvironmentPreflight.state, "resolution-required");
  assert.equal(failed.developmentEnvironmentPreflight.retryAllowed, true);
  assert.match(failed.developmentEnvironmentPreflight.summary, /Parent process environment refresh failed/);
  assert.equal(failed.eventTail.some((event) => event.includes("environment-resolution.parent-environment-refresh.failed")), true);
  assert.equal(failed.stderrTail.some((entry) => /parent PATH refresh failed/.test(entry)), true);
});

test("Codex Implementer service allows retryable blocked preflight to rerun without using cached evidence as ready", async () => {
  const root = seedBuildReviewWorkspace();
  let appServerFactoryCalled = 0;
  let startThreadCalled = 0;
  let preflightCalls = 0;
  const service = new CodexImplementerExecutionService(
    async () => {
      appServerFactoryCalled += 1;
      return {
        startThread() {
          startThreadCalled += 1;
          return {
            id: null,
            async runStreamed() {
              return { events: noMutationEvents() };
            },
          };
        },
      };
    },
    () => Date.now(),
    defaultExecutionPolicy,
    {
      async runPreflight() {
        preflightCalls += 1;
        if (preflightCalls === 1) {
          return {
            state: "blocked",
            summary: "Development environment preflight is blocked by unsatisfied requirements.",
            retryAllowed: true,
            requirements: [{
              capabilityId: "git",
              provisioning: "managed",
              beforeState: "missing",
              actionTaken: "install",
              afterState: "missing",
              commandSummaries: [],
              blocker: "network unavailable",
              blockerKind: "provisioning-failure",
              retryAllowed: true,
            }],
            evidenceMarkdown: "Development environment preflight evidence:\n- Final state: blocked\n- Retry allowed: yes",
          };
        }
        return notRequiredPreflight();
      },
    },
  );

  const blocked = await service.start(root);
  const cachedStatus = await service.getStatus(root);
  const rerun = await service.start(root);

  assert.equal(blocked.state, "unavailable");
  assert.equal(blocked.canRunAgain, true);
  assert.equal(blocked.retryBlocker, null);
  assert.equal(cachedStatus.state, "unavailable");
  assert.equal(cachedStatus.canRunAgain, true);
  assert.equal(cachedStatus.developmentEnvironmentPreflight.state, "blocked");
  assert.equal(rerun.state, "running");
  assert.equal(preflightCalls, 2);
  assert.equal(appServerFactoryCalled, 1);
  assert.equal(startThreadCalled, 1);
});

test("Codex Implementer status keeps cached waiting preflight unavailable but retryable", async () => {
  const root = seedBuildReviewWorkspace();
  let appServerFactoryCalled = false;
  const service = new CodexImplementerExecutionService(
    async () => {
      appServerFactoryCalled = true;
      return {
        startThread() {
          throw new Error("App Server thread should not start while preflight is waiting.");
        },
      };
    },
    () => Date.now(),
    defaultExecutionPolicy,
    {
      async runPreflight() {
        return {
          state: "waiting-for-operator",
          summary: "Windows permission is required before the development environment can be verified.",
          retryAllowed: true,
          requirements: [{
            capabilityId: "git",
            provisioning: "managed",
            beforeState: "missing",
            actionTaken: "install",
            afterState: "missing",
            commandSummaries: [],
            humanInteractionKind: "windows-permission",
            humanInteractionReason: "Windows permission is required to install the selected development capability.",
            retryAllowed: true,
          }],
          evidenceMarkdown: "Development environment preflight evidence:\n- Final state: waiting-for-operator",
        };
      },
    },
  );

  const started = await service.start(root);
  const status = await service.getStatus(root);

  assert.equal(started.state, "unavailable");
  assert.equal(started.canRunAgain, true);
  assert.equal(status.state, "unavailable");
  assert.equal(status.canRunAgain, true);
  assert.equal(status.retryBlocker, null);
  assert.equal(status.developmentEnvironmentPreflight.state, "waiting-for-operator");
  assert.equal(appServerFactoryCalled, false);
});

test("Codex Implementer service uses full local development policy without renderer options", async () => {
  const root = seedBuildReviewWorkspace();
  const captured = {};
  const service = new CodexImplementerExecutionService(async () => ({
    startThread(options) {
      captured.threadOptions = options;
      return {
        id: null,
        async runStreamed() {
          return { events: noMutationEvents() };
        },
      };
    },
  }));

  const started = await service.start(root);

  assert.equal(started.state, "running");
  assert.equal(captured.threadOptions.workingDirectory, path.resolve(root));
  assert.equal(captured.threadOptions.skipGitRepoCheck, true);
  assert.equal(captured.threadOptions.sandboxMode, "workspace-write");
  assert.deepEqual(captured.threadOptions.writableRoots, [path.resolve(root)]);
  assert.equal(captured.threadOptions.approvalPolicy, "on-request");
  assert.equal(captured.threadOptions.approvalsReviewer, "user");
  assert.equal(captured.threadOptions.networkAccessEnabled, true);
});

test("Codex Implementer service reports App Server success without report changes as incomplete for review", async () => {
  const root = seedBuildReviewWorkspace();
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: null,
        async runStreamed() {
          return { events: noMutationEvents() };
        },
      };
    },
  }));

  await service.start(root);
  const completed = await waitForState(service, root, "completed");

  assert.equal(completed.reportUpdated, false);
  assert.equal(completed.failureReason, "Codex completed, but the Implementer Report was not updated.");
  assert.equal(completed.lastRunState, "completed");
  assert.equal(completed.canRunAgain, true);
});

test("Codex Implementer service clears transient duplicate metadata after final canonical report refresh", async () => {
  const root = seedBuildReviewWorkspace();
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: null,
        async runStreamed() {
          return { events: transientDuplicateThenCanonicalEvents(root) };
        },
      };
    },
  }));

  await service.start(root);
  const completed = await waitForState(service, root, "completed");
  const current = getCurrentWorkspaceModel(root);

  assert.equal(completed.reportUpdated, true);
  assert.equal(completed.failureReason, null);
  assert.equal(completed.retryBlocker, null);
  assert.equal(current.activeWorkspaceId, "work-card-report-review");
  assert.equal(current.workCardBuildingReview.reportReadiness, "ready-for-review");
  assert.doesNotMatch(current.workCardBuildingReview.reportReadinessReason, /duplicate metadata/i);
});

test("Codex Implementer service blocks final duplicate metadata report from Review & Validation", async () => {
  const root = seedBuildReviewWorkspace();
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: null,
        async runStreamed() {
          return { events: finalDuplicateMetadataEvents(root) };
        },
      };
    },
  }));

  await service.start(root);
  const completed = await waitForState(service, root, "completed");
  const current = getCurrentWorkspaceModel(root);

  assert.equal(completed.reportUpdated, true);
  assert.match(completed.failureReason, /duplicate metadata block/);
  assert.match(completed.retryBlocker, /duplicate metadata block/);
  assert.equal(current.activeWorkspaceId, "work-card-building-review");
  assert.equal(current.workCardBuildingReview.reportReadiness, "invalid");
  assert.match(current.workCardBuildingReview.reportReadinessReason, /duplicate metadata block/);
});

test("Codex Implementer service treats canonical blocked report as reviewable evidence", async () => {
  const root = seedBuildReviewWorkspace();
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: null,
        async runStreamed() {
          return { events: blockedCanonicalReportEvents(root) };
        },
      };
    },
  }));

  await service.start(root);
  const completed = await waitForState(service, root, "completed");
  const current = getCurrentWorkspaceModel(root);

  assert.equal(completed.reportUpdated, true);
  assert.equal(completed.failureReason, null);
  assert.equal(current.activeWorkspaceId, "work-card-report-review");
  assert.equal(current.workCardBuildingReview.reportReadiness, "ready-for-review");
});

test("Codex Implementer service rejects a second in-flight launch and cancels only the tracked App Server run", async () => {
  const root = seedBuildReviewWorkspace();
  let observedSignal;
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: null,
        async runStreamed(_prompt, turnOptions) {
          observedSignal = turnOptions.signal;
          return { events: cancellableEvents(turnOptions.signal) };
        },
      };
    },
  }));

  const first = await service.start(root);
  assert.equal(first.state, "running");
  const second = await service.start(root);
  assert.equal(second.state, "running");
  assert.equal(second.failureReason, "Codex execution is already running for this workspace.");
  assert.equal(second.canRunAgain, false);
  assert.equal(second.retryBlocker, "Codex execution is already running for this workspace.");

  const cancelling = await service.cancel(root);
  assert.equal(cancelling.state, "running");
  assert.equal(observedSignal.aborted, true);
  const cancelled = await waitForState(service, root, "cancelled");
  assert.equal(cancelled.failureReason, "Codex execution was cancelled.");
  assert.equal(cancelled.lastRunState, "cancelled");
  assert.equal(cancelled.canRunAgain, true);
});

test("Codex Implementer service shutdown cancels and disposes the active App Server run", async () => {
  const root = seedBuildReviewWorkspace();
  let observedSignal;
  let interruptCount = 0;
  let disposeCount = 0;
  let disposed = false;
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: "thread-shutdown",
        async runStreamed(_prompt, turnOptions) {
          observedSignal = turnOptions.signal;
          return { events: cancellableEvents(turnOptions.signal) };
        },
        async interrupt() {
          interruptCount += 1;
        },
      };
    },
    async dispose() {
      if (!disposed) {
        disposed = true;
        disposeCount += 1;
      }
    },
  }));

  const started = await service.start(root);
  assert.equal(started.state, "running");

  await service.shutdownActiveExecutions();
  await service.shutdownActiveExecutions();

  assert.equal(observedSignal.aborted, true);
  assert.equal(interruptCount, 1);
  assert.equal(disposeCount, 1);

  const cancelled = await waitForState(service, root, "cancelled");
  assert.equal(cancelled.failureReason, "Codex execution was cancelled.");
  assert.equal(cancelled.eventTail.some((event) => event.includes("app-server.shutdown requested")), true);
});

test("Codex Implementer start maps missing App Server/runtime to targeted unavailable message", async () => {
  const root = seedBuildReviewWorkspace();
  const service = new CodexImplementerExecutionService(async () => {
    throw new Error("Unable to locate Codex CLI binaries for x86_64-pc-windows-msvc.");
  });

  const status = await service.start(root);

  assert.equal(status.state, "unavailable");
  assert.equal(status.integrationMode, "app-server-stdio");
  assert.equal(status.failureReason, CODEX_RUNTIME_UNAVAILABLE_MESSAGE);
  assert.equal(status.canRunAgain, false);
  assert.equal(status.retryBlocker, CODEX_RUNTIME_UNAVAILABLE_MESSAGE);
  assert.equal(status.implementerReportPath, reportPath());
});

test("Codex Implementer service maps auth-like App Server failure and preserves retry evidence", async () => {
  const root = seedBuildReviewWorkspace();
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: null,
        async runStreamed() {
          return { events: authFailureEvents() };
        },
      };
    },
  }));

  await service.start(root);
  const failed = await waitForState(service, root, "failed");

  assert.equal(failed.failureReason, CODEX_AUTH_UNAVAILABLE_MESSAGE);
  assert.equal(failed.stderrTail.at(-1), CODEX_AUTH_UNAVAILABLE_MESSAGE);
  assert.equal(failed.lastRunState, "failed");
  assert.equal(failed.canRunAgain, true);
  assert.equal(failed.reportUpdated, false);
  const report = listPlanningDocuments(root)
    .find((document) => document.markdownPath === reportPath());
  assert.equal(report.effectiveDisposition, "Pending");
});

test("Codex Implementer service resolves thread policy through injectable seam", async () => {
  const root = seedBuildReviewWorkspace();
  const captured = {};
  let resolverCalled = false;
  let resolverArgument = null;
  const service = new CodexImplementerExecutionService(
    async () => ({
      startThread(options) {
        captured.threadOptions = options;
        return {
          id: null,
          async runStreamed() {
            return { events: noMutationEvents() };
          },
        };
      },
    }),
    () => Date.now(),
    (input) => {
      resolverCalled = true;
      resolverArgument = input;
      return {
        sandboxMode: input.executionKind === "environment-resolution" ? "danger-full-access" : "workspace-write",
        approvalPolicy: "on-request",
        approvalsReviewer: "user",
        networkAccessEnabled: true,
      };
    },
  );

  await service.start(root);

  assert.equal(resolverCalled, true);
  assert.deepEqual(resolverArgument, {
    executionKind: "work-card-implementation",
    workspaceRoot: path.resolve(root),
  });
  assert.equal(captured.threadOptions.workingDirectory, path.resolve(root));
  assert.equal(captured.threadOptions.skipGitRepoCheck, true);
  assert.equal(captured.threadOptions.sandboxMode, "workspace-write");
  assert.deepEqual(captured.threadOptions.writableRoots, [path.resolve(root)]);
  assert.equal(captured.threadOptions.approvalPolicy, "on-request");
  assert.equal(captured.threadOptions.approvalsReviewer, "user");
  assert.equal(captured.threadOptions.networkAccessEnabled, true);
});

test("Codex Implementer service exposes App Server runtime diagnostics, approvals, and runtime denials", async () => {
  const root = seedBuildReviewWorkspace();
  const runtimeState = fakeRuntimeState();
  const service = new CodexImplementerExecutionService(async () => ({
    getRuntimeState() {
      return runtimeState;
    },
    startThread() {
      return {
        id: "thread-telemetry",
        async runStreamed() {
          return { events: approvalAndDenialEvents() };
        },
      };
    },
  }));

  await service.start(root);
  const completed = await waitForState(service, root, "completed");

  assert.equal(completed.integrationMode, "app-server-stdio");
  assert.equal(completed.runtimeState.userAgent, "codex-app-server-test");
  assert.equal(completed.runtimeState.approvalPolicy, "on-request");
  assert.equal(completed.runtimeState.approvalsReviewer, "user");
  assert.equal(completed.runtimeState.sandbox, "danger-full-access");
  assert.equal(completed.runtimeState.capabilitySummary.mcpServers.state, "read");
  assert.equal(completed.approvalTail.length, 1);
  assert.deepEqual(completed.approvalTail[0], {
    requestId: "approval-1",
    type: "command",
    threadId: "thread-telemetry",
    turnId: "turn-telemetry",
    itemId: "command-1",
    decision: "accept",
    completed: true,
  });
  assert.deepEqual(completed.runtimeDenialTail, ["Unsupported App Server request was denied."]);
  assert.equal(completed.stderrTail.some((entry) => entry.includes("Benign App Server warning.")), true);
  assert.equal(completed.eventTail.some((event) => event.includes("approval.command.accept.completed")), true);
  assert.equal(completed.eventTail.some((event) => event.includes("runtime.denial Unsupported App Server request was denied.")), true);
  assert.equal(completed.eventTail.some((event) => event.includes("app-server.stderr Benign App Server warning.")), true);
});

test("Codex Implementer service holds and answers App Server approval requests", async () => {
  const root = seedBuildReviewWorkspace();
  let capturedResponse = null;
  let releaseApproval;
  const approvalAnswered = new Promise((resolve) => {
    releaseApproval = resolve;
  });
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: "thread-approval",
        async runStreamed() {
          return { events: pendingApprovalEvents(approvalAnswered) };
        },
        async respondToApproval(requestId, response) {
          capturedResponse = { requestId, response };
          releaseApproval();
        },
      };
    },
  }));

  await service.start(root);
  const pending = await waitForPendingApproval(service, root);

  assert.equal(pending.pendingApproval.requestId, "approval-command-1");
  assert.equal(pending.pendingApproval.type, "command");
  assert.equal(pending.pendingApproval.commandDisplay, "npm test");
  assert.match(pending.pendingApproval.impactSummary, /Review the exact command below/);
  assert.equal(pending.approvalTail.length, 0);

  const answered = await service.respondToApproval(root, "approval-command-1", "deny");

  assert.equal(answered.pendingApproval, null);
  assert.deepEqual(capturedResponse, {
    requestId: "approval-command-1",
    response: { decision: "deny" },
  });

  const completed = await waitForState(service, root, "completed");
  assert.equal(completed.pendingApproval, null);
  assert.equal(completed.eventTail.some((event) => event.includes("approval.command.pending approval-command-1")), true);
  assert.equal(completed.eventTail.some((event) => event.includes("approval.deny.answered approval-command-1")), true);
  assert.equal(completed.finalResponseTail.at(-1), "Continuing after approval response.");
});

test("Codex Implementer service holds and answers App Server request_user_input prompts", async () => {
  const root = seedBuildReviewWorkspace();
  let capturedResponse = null;
  let releaseInput;
  const inputAnswered = new Promise((resolve) => {
    releaseInput = resolve;
  });
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: "thread-input",
        async runStreamed() {
          return { events: userInputEvents(inputAnswered) };
        },
        async respondToUserInput(requestId, answers) {
          capturedResponse = { requestId, answers };
          releaseInput();
        },
      };
    },
  }));

  await service.start(root);
  const pending = await waitForPendingUserInput(service, root);

  assert.equal(pending.pendingUserInput.requestId, "input-1");
  assert.equal(pending.pendingUserInput.questions[0].id, "next_step");
  assert.equal(pending.pendingUserInput.questions[0].options[0].label, "Continue");

  const answered = await service.respondToUserInput(root, "input-1", {
    next_step: ["Continue"],
  });

  assert.equal(answered.pendingUserInput, null);
  assert.deepEqual(capturedResponse, {
    requestId: "input-1",
    answers: { next_step: ["Continue"] },
  });

  const completed = await waitForState(service, root, "completed");
  assert.equal(completed.pendingUserInput, null);
  assert.equal(completed.eventTail.some((event) => event.includes("request_user_input.answered input-1")), true);
  assert.equal(completed.finalResponseTail.at(-1), "Continuing after operator input.");
});

test("Codex Implementer service holds and answers App Server MCP elicitation prompts distinctly", async () => {
  const root = seedBuildReviewWorkspace();
  let capturedResponse = null;
  let releaseMcpInput;
  const mcpInputAnswered = new Promise((resolve) => {
    releaseMcpInput = resolve;
  });
  const service = new CodexImplementerExecutionService(async () => ({
    startThread() {
      return {
        id: "thread-mcp-input",
        async runStreamed() {
          return { events: mcpElicitationEvents(mcpInputAnswered) };
        },
        async respondToMcpElicitation(requestId, response) {
          capturedResponse = { requestId, response };
          releaseMcpInput();
        },
      };
    },
  }));

  await service.start(root);
  const pending = await waitForPendingMcpElicitation(service, root);

  assert.equal(pending.pendingUserInput, null);
  assert.equal(pending.pendingMcpElicitation.requestId, "mcp-input-1");
  assert.equal(pending.pendingMcpElicitation.threadId, "thread-mcp-input");
  assert.equal(pending.pendingMcpElicitation.turnId, "turn-mcp-input");
  assert.equal(pending.pendingMcpElicitation.serverName, "github");
  assert.equal(pending.pendingMcpElicitation.responseSupported, true);
  assert.equal(pending.runtimeDenialTail.length, 0);

  const answered = await service.respondToMcpElicitation(root, "mcp-input-1", {
    action: "accept",
    content: { repository: "ChampCityChris/ChampCity_AI" },
  });

  assert.equal(answered.pendingMcpElicitation, null);
  assert.deepEqual(capturedResponse, {
    requestId: "mcp-input-1",
    response: {
      action: "accept",
      content: { repository: "ChampCityChris/ChampCity_AI" },
    },
  });

  const completed = await waitForState(service, root, "completed");
  assert.equal(completed.pendingMcpElicitation, null);
  assert.equal(completed.runtimeDenialTail.length, 0);
  assert.equal(completed.eventTail.some((event) => event.includes("mcp_elicitation.pending mcp-input-1")), true);
  assert.equal(completed.eventTail.some((event) => event.includes("mcp_elicitation.answered mcp-input-1")), true);
  assert.equal(completed.finalResponseTail.at(-1), "Continuing after MCP elicitation input.");
});

async function* successfulEvents(root) {
  yield { type: "thread.started", thread_id: "thread-test" };
  yield { type: "turn.started" };
  writeSubstantiveImplementerReport(root, {
    implementationSummary: "Implemented the requested repair.",
    acceptanceEvidence: ["final canonical report is ready for review"],
  });
  yield {
    type: "item.completed",
    item: { id: "agent-1", type: "agent_message", text: "Updated the report." },
  };
  yield {
    type: "turn.completed",
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 1,
      reasoning_output_tokens: 0,
    },
  };
}

async function* controlledSuccessfulEvents(root, release) {
  yield { type: "thread.started", thread_id: "thread-single-adapter" };
  yield { type: "turn.started" };
  await release;
  writeSubstantiveImplementerReport(root, {
    implementationSummary: "Implemented the requested side-effect-free status repair.",
    acceptanceEvidence: ["explicit start owns the only App Server adapter"],
  });
  yield {
    type: "item.completed",
    item: { id: "agent-controlled", type: "agent_message", text: "Controlled execution completed." },
  };
  yield { type: "turn.completed" };
}

async function* approvalAndDenialEvents() {
  yield { type: "thread.started", thread_id: "thread-telemetry" };
  yield { type: "turn.started" };
  yield {
    type: "approval.completed",
    approval: {
      requestId: "approval-1",
      type: "command",
      threadId: "thread-telemetry",
      turnId: "turn-telemetry",
      itemId: "command-1",
      decision: "accept",
      completed: true,
    },
  };
  yield { type: "runtime.denial", message: "Unsupported App Server request was denied." };
  yield { type: "runtime.stderr", message: "Benign App Server warning." };
  yield {
    type: "item.completed",
    item: { id: "agent-1", type: "agent_message", text: "Telemetry observed." },
  };
  yield { type: "turn.completed" };
}

async function* userInputEvents(inputAnswered) {
  yield { type: "thread.started", thread_id: "thread-input" };
  yield { type: "turn.started" };
  yield {
    type: "user_input.requested",
    request: {
      requestId: "input-1",
      threadId: "thread-input",
      turnId: "turn-input",
      itemId: "tool-input-1",
      questions: [{
        id: "next_step",
        header: "Next Step",
        question: "How should Codex continue?",
        options: [{ label: "Continue", description: "Continue the run." }],
      }],
    },
  };
  await inputAnswered;
  yield {
    type: "item.completed",
    item: { id: "agent-1", type: "agent_message", text: "Continuing after operator input." },
  };
  yield { type: "turn.completed" };
}

async function* mcpElicitationEvents(inputAnswered) {
  yield { type: "thread.started", thread_id: "thread-mcp-input" };
  yield { type: "turn.started" };
  yield {
    type: "mcp_elicitation.requested",
    request: {
      requestId: "mcp-input-1",
      threadId: "thread-mcp-input",
      turnId: "turn-mcp-input",
      serverName: "github",
      mode: "form",
      message: "Select repository.",
      responseSupported: true,
      unsupportedReason: null,
      elicitationId: null,
      url: null,
      requestedSchemaSummary: "Fields: repository",
      fields: [{
        id: "repository",
        title: "Repository",
        description: "Repository name.",
        type: "string",
        required: true,
        options: [],
      }],
    },
  };
  await inputAnswered;
  yield {
    type: "item.completed",
    item: { id: "agent-1", type: "agent_message", text: "Continuing after MCP elicitation input." },
  };
  yield { type: "turn.completed" };
}

async function* pendingApprovalEvents(approvalAnswered) {
  yield { type: "thread.started", thread_id: "thread-approval" };
  yield { type: "turn.started" };
  yield {
    type: "approval.requested",
    approval: {
      requestId: "approval-command-1",
      type: "command",
      threadId: "thread-approval",
      turnId: "turn-approval",
      itemId: "command-1",
      commandDisplay: "npm test",
      fileChangeSummary: null,
      permissionSummary: null,
      impactSummary: "Codex wants permission to run a command in the selected project workspace. Review the exact command below before deciding.",
    },
  };
  await approvalAnswered;
  yield {
    type: "item.completed",
    item: { id: "agent-1", type: "agent_message", text: "Continuing after approval response." },
  };
  yield { type: "turn.completed" };
}

async function* noMutationEvents() {
  yield { type: "thread.started", thread_id: "thread-test" };
  yield { type: "turn.started" };
  yield {
    type: "item.completed",
    item: { id: "agent-1", type: "agent_message", text: "Done." },
  };
  yield {
    type: "turn.completed",
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 1,
      reasoning_output_tokens: 0,
    },
  };
}

async function* environmentResolutionEvents() {
  yield { type: "thread.started", thread_id: "thread-environment-resolution" };
  yield { type: "turn.started" };
  yield {
    type: "item.completed",
    item: { id: "agent-env-1", type: "agent_message", text: "Environment Resolution completed." },
  };
  yield {
    type: "turn.completed",
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 1,
      reasoning_output_tokens: 0,
    },
  };
}

async function* transientDuplicateThenCanonicalEvents(root) {
  yield { type: "thread.started", thread_id: "thread-test" };
  yield { type: "turn.started" };
  writeDuplicateMetadataReport(root);
  yield {
    type: "item.completed",
    item: { id: "agent-1", type: "agent_message", text: "Intermediate report write." },
  };
  writeSubstantiveImplementerReport(root, {
    implementationSummary: "Implemented the requested repair after a transient editor state.",
    acceptanceEvidence: ["final canonical report bytes control readiness"],
  });
  yield {
    type: "turn.completed",
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 1,
      reasoning_output_tokens: 0,
    },
  };
}

async function* finalDuplicateMetadataEvents(root) {
  yield { type: "thread.started", thread_id: "thread-test" };
  yield { type: "turn.started" };
  writeDuplicateMetadataReport(root);
  yield {
    type: "turn.completed",
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 1,
      reasoning_output_tokens: 0,
    },
  };
}

async function* blockedCanonicalReportEvents(root) {
  yield { type: "thread.started", thread_id: "thread-test" };
  yield { type: "turn.started" };
  writeSubstantiveImplementerReport(root, {
    implementationSummary: "Implementation is blocked by a missing approved local Codex runtime.",
    blockers: ["The approved local Codex runtime is not installed in the environment."],
    acceptanceEvidence: ["blocked report remains substantive Implementer evidence"],
  });
  yield {
    type: "turn.completed",
    usage: {
      input_tokens: 1,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 1,
      reasoning_output_tokens: 0,
    },
  };
}

async function* cancellableEvents(signal) {
  yield { type: "thread.started", thread_id: "thread-test" };
  yield { type: "turn.started" };
  await new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener("abort", resolve, { once: true });
  });
  throw new Error("AbortError");
}

async function* authFailureEvents() {
  yield { type: "thread.started", thread_id: "thread-test" };
  yield { type: "turn.started" };
  yield {
    type: "error",
    message: "not authenticated; run codex login",
  };
}

function defaultExecutionPolicy(input) {
  return {
    sandboxMode: input.executionKind === "environment-resolution" ? "danger-full-access" : "workspace-write",
    approvalPolicy: "on-request",
    approvalsReviewer: "user",
    networkAccessEnabled: true,
  };
}

function notRequiredPreflight() {
  return {
    state: "not-required",
    summary: "No development environment requirements were declared.",
    retryAllowed: false,
    requirements: [],
    evidenceMarkdown: "Development environment preflight evidence:\n- Final state: not-required",
  };
}

function resolutionRequiredPreflight() {
  return {
    state: "resolution-required",
    summary: "Development environment resolution is required before Work Card implementation can start.",
    retryAllowed: true,
    requirements: [{
      capabilityId: "made-up-build-tool",
      requestedVersionConstraint: ">=7.2",
      requestedProfile: "cli",
      provisioning: "managed",
      beforeState: "missing",
      actionTaken: "provider-resolution",
      afterState: "missing",
      commandSummaries: [{
        command: "winget mcp",
        exitCode: 1,
        stdout: "",
        stderr: "MCP server launch failed: named pipe unavailable.",
      }, {
        command: "winget search --query made-up-build-tool --source winget --accept-source-agreements",
        exitCode: 0,
        stdout: "Name  Id  Version  Source\nMade Up Build Tool  Vendor.MadeUpBuildTool  7.2.4  winget",
        stderr: "",
      }],
      providerAttempts: [{
        provider: "winget-mcp",
        stage: "discovery",
        query: "made-up-build-tool",
        outcome: "failed",
        summary: "WinGet MCP discovery failed before tool lookup.",
      }, {
        provider: "winget-search",
        stage: "resolution",
        query: "made-up-build-tool",
        outcome: "ambiguous",
        summary: "Direct WinGet search returned two plausible candidates.",
        candidates: [{
          packageId: "Vendor.MadeUpBuildTool",
          packageName: "Made Up Build Tool",
          source: "winget",
          version: "7.2.4",
        }, {
          packageId: "Community.MadeUpBuildTool",
          packageName: "Made Up Build Tool Community",
          source: "winget",
          version: "7.3.0",
        }],
      }],
      blocker: "Windows Package Manager did not resolve an exact package candidate for the approved managed capability.",
      blockerKind: "provider-resolution-required",
      retryAllowed: true,
    }],
    evidenceMarkdown: "Development environment preflight evidence:\n- Final state: resolution-required",
  };
}

function fakeRuntimeState() {
  return {
    userAgent: "codex-app-server-test",
    codexHome: "<CODEX_HOME>",
    cwd: "<PROJECT_REPO>",
    model: "gpt-5-codex",
    reasoningEffort: "high",
    approvalPolicy: "on-request",
    approvalsReviewer: "user",
    sandbox: "danger-full-access",
    capabilitySummary: {
      configRead: { state: "read", count: 1, summary: "config read", details: ["webSearch: enabled"] },
      mcpServers: { state: "read", count: 2, summary: "mcp servers read", details: ["github (running)"] },
      skills: { state: "read", count: 3, summary: "skills read", details: ["webapp-testing"] },
      apps: { state: "read", count: 4, summary: "apps read", details: ["Google Drive (enabled)"] },
      plugins: { state: "read", count: 5, summary: "plugins read", details: ["Sites (installed)"] },
    },
  };
}

async function waitForState(service, root, expectedState) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await service.getStatus(root);
    if (status.state === expectedState) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const status = await service.getStatus(root);
  assert.equal(status.state, expectedState);
  return status;
}

async function waitForPendingUserInput(service, root) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await service.getStatus(root);
    if (status.pendingUserInput) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const status = await service.getStatus(root);
  assert.ok(status.pendingUserInput);
  return status;
}

async function waitForPendingMcpElicitation(service, root) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await service.getStatus(root);
    if (status.pendingMcpElicitation) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const status = await service.getStatus(root);
  assert.ok(status.pendingMcpElicitation);
  return status;
}

async function waitForPendingApproval(service, root) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await service.getStatus(root);
    if (status.pendingApproval) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const status = await service.getStatus(root);
  assert.ok(status.pendingApproval);
  return status;
}

function seedBuildReviewWorkspace() {
  const root = tempWorkspace("champcity-codex-execution-");
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  seedApprovedProjectPlanning(root, "demo");
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Approved", {
    workflowData: {
      phases: [{
        phaseId: "phase-01",
        title: "Foundation",
        order: 1,
        purpose: "Create the first usable workflow.",
        dependsOn: [],
        sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
      }],
    },
  });
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    bodyMarkdown: "# WC01 First Work Card\n\nApproved implementation contract.\n",
  });
  const model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-building-review");
  assert.equal(model.workCardBuildingReview.reportMissing, true);
  generateCurrentHandoff(root);
  const reportModel = getCurrentWorkspaceModel(root);
  assert.equal(reportModel.workCardBuildingReview.report.disposition, "Pending");
  return root;
}

function reportPath() {
  return "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md";
}

function workCardPath() {
  return "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md";
}

function sha256(root, relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest("hex");
}

function writeDuplicateMetadataReport(root) {
  const absolutePath = path.join(root, reportPath());
  const content = fs.readFileSync(absolutePath, "utf8");
  fs.writeFileSync(
    absolutePath,
    `${content}\n<!-- CHAMPCITY-METADATA\n{}\nCHAMPCITY-METADATA -->\n`,
    "utf8",
  );
}

function writeSubstantiveImplementerReport(root, {
  implementationSummary,
  blockers = [],
  acceptanceEvidence,
}) {
  return writeDoc(root, reportPath(), "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardBuilding/codexImplementerExecutionService.ts"],
      implementationSummary,
      validationResults: ["focused Codex execution tests passed"],
      acceptanceEvidence,
      blockers,
    },
    bodyMarkdown: [
      "# Implementer Report - WC01",
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      implementationSummary,
      "## Acceptance Evidence",
      ...acceptanceEvidence,
      ...(blockers.length ? ["## Blockers", ...blockers] : []),
      "",
    ].join("\n"),
  });
}
