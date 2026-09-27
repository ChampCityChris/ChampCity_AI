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
const { isEligibleTesterPath, parseTesterResult } = require("../../dist/main/workCardBuilding/codexTesterExecutionService.js");
const {
  generateCurrentHandoff,
  getCurrentWorkspaceModel,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  applyIssueArchitectReview,
  applyIssueFixCardContractReview,
  applyIssueFixCardValidationDecision,
  applyIssuePlanningReview,
  getIssueFixCardProjection,
  prepareIssueFixCardPlanningHandoff,
  prepareIssueFixCardRepairHandoff,
  prepareIssuePlanningHandoff,
  promoteIssueFixCardRepairDraft,
  promoteIssuePlanningDraftBundle,
  selectIssueFixCardCandidate,
} = require("../../dist/main/issueResolution/issueResolutionService.js");
const {
  replaceControlledMarkdownBody,
} = require("../../dist/main/agentHarness/repository/controlledMarkdownDrafts.js");
const {
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  listPlanningDocuments,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Codex Implementer service starts App Server thread from current Implement context and exact prompt", async (t) => {
  const root = seedBuildReviewWorkspace();
  const fixtureGit = (...args) => require("node:child_process").execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, ".gitignore"), "/planning/\n");
  fixtureGit("init", "-b", "main"); fixtureGit("config", "user.name", "Fixture"); fixtureGit("config", "user.email", "fixture@example.invalid");
  fixtureGit("add", "--all"); fixtureGit("commit", "-m", "fixture baseline");
  const { createLegacyWorkIntakeFixture } = require("../support/work-intake-fixtures.cjs");
  const submitted = await createLegacyWorkIntakeFixture(root, { projectId: null, projectName: "Implementation fixture", workRequest: "Bounded implementation", desiredOutcome: "Current behavior passes", knownConstraints: "", hasExistingSourceOrPlanning: true, repositoryReviewContext: "", baseBranch: "main", baseCommit: fixtureGit("rev-parse", "HEAD") });
  assert.equal(submitted.ok, true);
  const formalFile = path.join(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  const formal = parseCanonicalMarkdownDocument(fs.readFileSync(formalFile, "utf8"));
  formal.metadata.sourceRevisions.push({ path: submitted.value.relativePath, revision: 1 });
  fs.writeFileSync(formalFile, serializeCanonicalMarkdownDocument(formal.metadata, formal.bodyMarkdown));
  const captured = {};
  const service = createService(async () => ({
    startThread(options) {
      captured.threadOptions = options;
      return {
        id: null,
        async runStreamed(prompt, turnOptions) {
          captured.prompt = prompt;
          captured.turnOptions = turnOptions;
          return { events: (async function* () {
            fs.writeFileSync(path.join(root, "bounded-correction.txt"), "implemented source\n");
            yield { type: "item.completed", item: { type: "file_change", changes: [{ path: "bounded-correction.txt" }], status: "completed" } };
            yield* successfulEvents(root);
          })() };
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

  const completed = await waitForState(service, root, "completed", 1500);
  assert.equal(completed.checkpoint?.status, "committed", completed.checkpoint?.message);
  assert.equal(completed.checkpoint.remote, "not-requested");
  assert.equal(fixtureGit("rev-parse", "HEAD"), completed.checkpoint.commit);
  assert.equal(fixtureGit("status", "--porcelain"), "");
  assert.equal(completed.reportUpdated, true);
  assert.equal(completed.failureReason, null);
  assert.equal(completed.lastRunState, "completed");
  assert.equal(completed.canRunAgain, true);
  assert.equal(completed.retryBlocker, null);
  assert.match(captured.prompt, /^You are the Implementer for ChampCity A\/I\./);
  assert.match(captured.prompt, /Formal Work Card path: planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md/);
  assert.match(captured.prompt, /Implementer Report path: planning\/phases\/phase-01\/Implementer_Reports\/IMPLEMENTER_REPORT_WC01_first_work_card\.md/);
  assert.match(captured.prompt, /The human Operator is the only authority/);
  assert.match(captured.prompt, /The Approved Formal Work Card is the sole bounded implementation contract/);
  assert.match(captured.prompt, /defines task scope and instructions; it does not grant authority/);
  assert.match(captured.prompt, /If project instructions conflict with the Approved Work Card, follow the Approved Work Card/);
  assert.match(captured.prompt, /Run the validation required by the Approved Work Card when possible/);
  assert.doesNotMatch(captured.prompt, /npm test/);
  assert.doesNotMatch(captured.prompt, /test:full/);
  assert.doesNotMatch(captured.prompt, /full-suite cleanliness/i);
  assert.doesNotMatch(captured.prompt, /complete-corpus/i);
  assert.match(captured.prompt, /ChampCity owns routine source-control checkpoints/);
  assert.match(captured.prompt, /Do not stage, commit, push, merge, tag, switch branches, or script Git mutations/);
  assert.match(captured.prompt, /Follow every explicit Git constraint supplied for this turn/);
  assert.doesNotMatch(captured.prompt, /implementation contract explicitly authorizes/);
  assert.doesNotMatch(captured.prompt, /Do not modify files outside this repository root\./);
  assert.doesNotMatch(captured.prompt, /Do not write absolute local machine paths into repository artifacts\./);
  assert.doesNotMatch(captured.prompt, /production endpoints, screenshots, archives, build outputs/);
  assert.match(captured.prompt, /Do not disclose or commit secrets, credentials, authentication tokens, API\/provider keys, or private environment-file contents/);
  assert.match(captured.prompt, /No generic security scan, safety scan, path-sanitization scan, or secret-like-string scan is required/);
  assert.match(captured.prompt, /The application owns canonical identity, source revisions, repository binding evidence, and disposition metadata/);
  assert.match(captured.prompt, /missing development capability required by the Approved Work Card is not by itself a blocker/);
  assert.match(captured.prompt, /champcity-development-environment contract marks it managed/);
  assert.match(captured.prompt, /Repository-native dependency installation or restoration is implementation work/);
  assert.match(captured.prompt, /Package or dependency absence alone is not a reason to return the task to a nontechnical Operator/);
  assert.match(captured.prompt, /Do not install unrelated tools because they might be useful/);
  assert.match(captured.prompt, /human interaction such as UAC approval.*resumable interaction boundary/);
  assert.doesNotMatch(captured.prompt, /Application-verified development environment:/);
  assert.equal(captured.turnOptions.signal instanceof AbortSignal, true);
});

test("Tester result contract accepts only permanent test paths and application-owned capability attribution", () => {
  assert.equal(isEligibleTesterPath("test/work-card-building/example.test.cjs"), true);
  for (const path of ["src/main/index.test.ts", "test/fixtures/sample.test.ts", "test/a.test.json", "test/../src/main/a.test.ts", "C:/repo/test/a.test.ts"]) {
    assert.equal(isEligibleTesterPath(path), false, path);
  }
  const result = parseTesterResult(JSON.stringify({ recommendation: "permanent-proof-change-warranted", permanentTestPaths: [],
    determinationEvidence: ["bounded evidence"], unknowns: [], rationale: "Permanent regression proof is warranted." }));
  assert.deepEqual(result.permanentTestPaths, []);
  assert.throws(() => parseTesterResult(JSON.stringify({ recommendation: "no-permanent-test-required", affectedCapabilityIds: ["invented"],
    permanentTestPaths: [], determinationEvidence: ["bounded evidence"], unknowns: [], rationale: "Unsupported capability attribution." })));
});

test("Codex Implementer idle status polling is side-effect free and does not provision environment", async () => {
  const root = seedBuildReviewWorkspace();
  let appServerFactoryCalled = 0;
  let preflightCalls = 0;
  const service = createService(
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
  const service = createService(async () => {
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
  const service = createService(
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
  const service = createService(
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
  const service = createService(
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
  const service = createService(
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
  const service = createService(
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

test("Issue Fix Card Codex status isolates running and terminal sessions by exact context", async () => {
  const root = seedIssueFixCardCodexWorkspace("ISSUE_120");
  seedIssueFixCardCodexWorkspace("ISSUE_123", root);
  let releaseExecution;
  const executionMayComplete = new Promise((resolve) => {
    releaseExecution = resolve;
  });
  const service = createService(
    async () => ({
      startThread() {
        return {
          id: "thread-issue-fc01",
          async runStreamed() {
            return { events: controlledIssueFixCardEvents(root, "ISSUE_120", "ISSUE_120-FC01", executionMayComplete) };
          },
        };
      },
    }),
    () => Date.now(),
    defaultExecutionPolicy,
    { async runPreflight() { return notRequiredPreflight(); } },
  );

  const fc01 = { ownerKind: "issue", issueId: "ISSUE_120", fixCardId: "ISSUE_120-FC01" };
  const fc02 = { ownerKind: "issue", issueId: "ISSUE_123", fixCardId: "ISSUE_123-FC01" };
  const started = await service.start(root, fc01);
  assert.equal(started.state, "running");

  const blockedOtherCard = await service.getStatus(root, fc02);
  assert.equal(blockedOtherCard.state, "unavailable");
  assert.match(blockedOtherCard.failureReason, /ISSUE_120 ISSUE_120-FC01/);
  assert.match(blockedOtherCard.failureReason, /ISSUE_123 ISSUE_123-FC01 is blocked/);

  releaseExecution();
  const completed = await waitForIssueState(service, root, fc01, "completed");
  assert.equal(completed.workCardId, "ISSUE_120-FC01");
  const fc02Status = await service.getStatus(root, fc02);
  assert.equal(fc02Status.state, "ready");
  assert.equal(fc02Status.workCardId, "ISSUE_123-FC01");
  assert.notEqual(fc02Status.lastRunState, "completed");
});

test("Issue Repair Codex completion and retry preserve root Fix Card and exact Repair identities", async () => {
  const issueId = "ISSUE_122";
  const rootFixCardId = `${issueId}-FC01`;
  const repairId = `${rootFixCardId}-REPAIR01`;
  const prepared = seedApprovedIssueRepairCodexWorkspace(issueId);
  const root = prepared.root;
  const selector = {
    ownerKind: "issue",
    issueId,
    fixCardId: rootFixCardId,
    currentImplementationId: repairId,
  };
  let releaseExecution;
  const executionMayComplete = new Promise((resolve) => {
    releaseExecution = resolve;
  });
  const service = createService(
    async () => ({
      startThread() {
        return {
          id: "thread-issue-repair01",
          async runStreamed() {
            return {
              events: controlledIssueRepairEvents(root, prepared.implementerReportPath, repairId, executionMayComplete),
            };
          },
        };
      },
    }),
    () => Date.now(),
    defaultExecutionPolicy,
    { async runPreflight() { return notRequiredPreflight(); } },
  );

  const started = await service.start(root, selector);
  assert.equal(started.state, "running");
  assert.equal(started.workCardId, repairId);
  assert.equal(started.implementerReportPath, prepared.implementerReportPath);

  releaseExecution();
  const completed = await waitForIssueState(service, root, selector, "completed");
  assert.equal(completed.workCardId, repairId);
  assert.equal(completed.reportUpdated, true);
  assert.equal(completed.failureReason, null);
  assert.equal(completed.canRunAgain, true);
  assert.equal(completed.retryBlocker, null);

  const nextRepair = advanceIssueRepair(root, issueId, repairId);
  assert.equal(nextRepair.currentImplementationId, `${rootFixCardId}-REPAIR02`);

  const staleStatus = await service.getStatus(root, selector);
  assert.equal(staleStatus.state, "unavailable");
  assert.match(staleStatus.failureReason, /Issue Codex execution context changed/);

  const currentStatus = await service.getStatus(root, {
    ownerKind: "issue",
    issueId,
    fixCardId: rootFixCardId,
    currentImplementationId: nextRepair.currentImplementationId,
  });
  assert.equal(currentStatus.state, "ready");
  assert.equal(currentStatus.workCardId, nextRepair.currentImplementationId);
  assert.equal(currentStatus.implementerReportPath, nextRepair.implementerReportPath);
});

test("Issue Fix Card preflight and Environment Resolution cache are keyed by contract context", async () => {
  const root = seedIssueFixCardCodexWorkspace("ISSUE_121");
  seedIssueFixCardCodexWorkspace("ISSUE_124", root);
  let preflightCalls = 0;
  const captured = {};
  const service = createService(
    async () => ({
      startThread(options) {
        captured.threadOptions = options;
        return {
          id: "thread-issue-env",
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
      async runPreflight({ formalWorkCardPath }) {
        preflightCalls += 1;
        if (/ISSUE_121-FC01/.test(formalWorkCardPath)) {
          return resolutionRequiredPreflight();
        }
        return notRequiredPreflight();
      },
    },
    async () => ({ refreshed: false, summary: "parent environment unchanged", env: {} }),
  );

  const fc01 = { ownerKind: "issue", issueId: "ISSUE_121", fixCardId: "ISSUE_121-FC01" };
  const fc02 = { ownerKind: "issue", issueId: "ISSUE_124", fixCardId: "ISSUE_124-FC01" };
  const fc01Unavailable = await service.start(root, fc01);
  assert.equal(fc01Unavailable.state, "unavailable");
  assert.equal(fc01Unavailable.canResolveEnvironment, true);

  const fc02Status = await service.getStatus(root, fc02);
  assert.equal(fc02Status.state, "ready");
  assert.equal(fc02Status.developmentEnvironmentPreflight, null);

  const resolving = await service.startEnvironmentResolution(root, fc01);
  assert.equal(resolving.state, "running");
  assert.equal(resolving.executionKind, "environment-resolution");
  assert.match(captured.prompt, /Fix Card path: issues\/ISSUE_121\/Fix_Cards\/ISSUE_121-FC01_/);
  assert.equal(preflightCalls, 1);
});

test("Codex Implementer service allows retryable blocked preflight to rerun without using cached evidence as ready", async () => {
  const root = seedBuildReviewWorkspace();
  let appServerFactoryCalled = 0;
  let startThreadCalled = 0;
  let preflightCalls = 0;
  const service = createService(
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
  const service = createService(
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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
  const service = createService(async () => {
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
  const service = createService(async () => ({
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
  const service = createService(
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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
  const service = createService(async () => ({
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

async function waitForState(service, root, expectedState, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
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

async function waitForSelectorState(service, root, selector, expectedState, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await service.getStatus(root, selector);
    if (status.state === expectedState) return status;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const status = await service.getStatus(root, selector);
  assert.equal(status.state, expectedState);
  return status;
}

async function waitForIssueState(service, root, selector, expectedState) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await service.getStatus(root, selector);
    if (status.state === expectedState) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const status = await service.getStatus(root, selector);
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

function seedIssueFixCardCodexWorkspace(issueId, existingRoot) {
  const root = existingRoot ?? tempWorkspace("champcity-issue-codex-");
  const issueRoot = path.join(root, "issues", issueId);
  fs.mkdirSync(issueRoot, { recursive: true });
  fs.writeFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), `# ${issueId} - Codex Issue\n\n## Issue\nNeeds Issue Fix Card Codex execution.`, "utf8");
  fs.writeFileSync(path.join(issueRoot, "ARCHITECT_INVESTIGATION.md"), validIssueInvestigation(issueId), "utf8");
  applyIssueArchitectReview(root, issueId, { disposition: "Approved", operatorNotes: "Proceed." });
  const prepared = prepareIssuePlanningHandoff(root, issueId);
  const issuePlanDraft = path.join(root, prepared.projection.activeSubmission.issueResolutionPlanDraftPath);
  const fixPlanDraft = path.join(root, prepared.projection.activeSubmission.fixCardPlanDraftPath);
  fs.mkdirSync(path.dirname(issuePlanDraft), { recursive: true });
  fs.writeFileSync(issuePlanDraft, validIssueResolutionPlan(issueId), "utf8");
  fs.writeFileSync(fixPlanDraft, validIssueFixCardPlan(issueId), "utf8");
  promoteIssuePlanningDraftBundle(root, issueId);
  applyIssuePlanningReview(root, issueId, { disposition: "Approved", operatorNotes: "Approved." });
  approveIssueFixCard(root, issueId, `${issueId}-FC01`);
  return root;
}

function approveIssueFixCard(root, issueId, fixCardId) {
  selectIssueFixCardCandidate(root, issueId, fixCardId, "fix-card-map");
  const prepared = prepareIssueFixCardPlanningHandoff(root, issueId, "planning");
  const submission = prepared.projection.activePlanningSubmission;
  replaceControlledMarkdownBody(root, {
    relativePath: submission.temporaryDraftPath,
    submissionId: submission.submissionId,
    expectedMetadataSha256: submission.metadataSha256,
    expectedBodySha256: submission.bodySha256,
    bodyMarkdown: validIssueFixCardContract(fixCardId),
  });
  applyIssueFixCardContractReview(root, issueId, {
    disposition: "Approved",
    operatorNotes: "Approved.",
    expectedReviewedBodySha256: getIssueFixCardProjection(root, issueId, "planning").controlledDraftBodySha256,
  }, "implement");
}

function seedApprovedIssueRepairCodexWorkspace(issueId) {
  const root = seedIssueFixCardCodexWorkspace(issueId);
  const rootFixCardId = `${issueId}-FC01`;
  selectIssueFixCardCandidate(root, issueId, rootFixCardId, "implement");
  writeSubstantiveIssueFixCardReport(root, issueId, rootFixCardId);
  const boundedDefect = "The shared executor loses the canonical root Fix Card identity for the current Repair.";
  applyIssueFixCardValidationDecision(root, issueId, {
    decision: "RequestRepair",
    operatorNotes: "Observed in the exact root Fix Card execution evidence.",
    boundedDefect,
  }, "repair");
  const prepared = prepareIssueFixCardRepairHandoff(root, issueId, "repair").projection;
  const repairId = `${rootFixCardId}-REPAIR01`;
  const submission = prepared.activeRepairSubmission;
  replaceControlledMarkdownBody(root, {
    relativePath: submission.temporaryDraftPath,
    submissionId: submission.submissionId,
    expectedMetadataSha256: submission.metadataSha256,
    expectedBodySha256: submission.bodySha256,
    bodyMarkdown: validIssueRepairContract(repairId, rootFixCardId, boundedDefect),
  });
  promoteIssueFixCardRepairDraft(root, issueId, "repair");
  return {
    root,
    ...applyIssueFixCardContractReview(root, issueId, {
      disposition: "Approved",
      operatorNotes: "Bounded Repair approved.",
    }, "implement").projection,
  };
}

function advanceIssueRepair(root, issueId, currentRepairId) {
  const boundedDefect = "The first Repair leaves one exact current-implementation context transition unverified.";
  applyIssueFixCardValidationDecision(root, issueId, {
    decision: "RequestRepair",
    operatorNotes: "Observed after the exact Repair execution.",
    boundedDefect,
  }, "repair");
  const prepared = prepareIssueFixCardRepairHandoff(root, issueId, "repair").projection;
  const repairId = `${issueId}-FC01-REPAIR02`;
  const submission = prepared.activeRepairSubmission;
  replaceControlledMarkdownBody(root, {
    relativePath: submission.temporaryDraftPath,
    submissionId: submission.submissionId,
    expectedMetadataSha256: submission.metadataSha256,
    expectedBodySha256: submission.bodySha256,
    bodyMarkdown: validIssueRepairContract(repairId, currentRepairId, boundedDefect),
  });
  promoteIssueFixCardRepairDraft(root, issueId, "repair");
  return applyIssueFixCardContractReview(root, issueId, {
    disposition: "Approved",
    operatorNotes: "Second bounded Repair approved.",
  }, "implement").projection;
}

function reportPath() {
  return "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md";
}

function workCardPath() {
  return "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md";
}

async function* controlledIssueFixCardEvents(root, issueId, fixCardId, release) {
  yield { type: "thread.started", thread_id: `thread-${fixCardId}` };
  yield { type: "turn.started" };
  await release;
  writeSubstantiveIssueFixCardReport(root, issueId, fixCardId);
  yield {
    type: "item.completed",
    item: { id: "agent-issue", type: "agent_message", text: "Issue Fix Card execution completed." },
  };
  yield { type: "turn.completed" };
}

async function* controlledIssueRepairEvents(root, reportRelativePath, repairId, release) {
  yield { type: "thread.started", thread_id: `thread-${repairId}` };
  yield { type: "turn.started" };
  await release;
  writeSubstantiveIssueRepairReport(root, reportRelativePath);
  yield {
    type: "item.completed",
    item: { id: "agent-issue-repair", type: "agent_message", text: "Issue Repair execution completed." },
  };
  yield { type: "turn.completed" };
}

function writeSubstantiveIssueFixCardReport(root, issueId, fixCardId) {
  const slug = fixCardId.endsWith("FC01") ? "codex_fixture_one" : "codex_fixture_two";
  const reportRelativePath = `issues/${issueId}/Implementer_Reports/IMPLEMENTER_REPORT_${fixCardId}_${slug}.md`;
  const contractRelativePath = `issues/${issueId}/Fix_Cards/${fixCardId}_${slug}.md`;
  return writeDoc(root, reportRelativePath, "implementer-report", "Pending", {
    identity: { issueId, fixCardId },
    sourceRevisions: [{ path: contractRelativePath, revision: 1 }],
    workflowData: {
      ownerKind: "issue",
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardBuilding/codexImplementerExecutionService.ts"],
      implementationSummary: "Implemented the selected Issue Fix Card.",
      validationResults: ["Issue Codex execution test passed"],
    },
    bodyMarkdown: [
      "# Issue Fix Card Implementer Report",
      "",
      "Verified approved repo root.",
      "",
      "## Implementation Summary",
      "Implemented the selected Issue Fix Card.",
      "",
    ].join("\n"),
  });
}

function writeSubstantiveIssueRepairReport(root, reportRelativePath) {
  const absolutePath = path.join(root, reportRelativePath);
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
  const metadata = {
    ...parsed.metadata,
    artifactRevision: parsed.metadata.artifactRevision + 1,
    workflowData: {
      ...parsed.metadata.workflowData,
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardBuilding/codexImplementerExecutionService.ts"],
      implementationSummary: "Preserved the root Fix Card and exact Repair execution identities.",
      validationResults: ["Issue Repair shared-executor regression test passed"],
    },
  };
  fs.writeFileSync(absolutePath, serializeCanonicalMarkdownDocument(metadata, [
    `# Implementer Report - ${metadata.identity.currentImplementationId}`,
    "",
    "Verified approved repo root.",
    "",
    "## Implementation Summary",
    "Preserved the root Fix Card and exact Repair execution identities.",
    "",
    "## Files Modified",
    "src/main/workCardBuilding/codexImplementerExecutionService.ts",
    "",
  ].join("\n")), "utf8");
}

function validIssueRepairContract(repairId, parentImplementationId, boundedDefect) {
  const sections = [
    ["Confirmed Defect", boundedDefect],
    ["Source Evidence", `The exact RevisionRequested validation record for ${parentImplementationId} is the sole validation basis.`],
    ["Objective", `Correct only ${boundedDefect} while retaining the root Fix Card objective.`],
    ["Runtime Sequence", `${parentImplementationId} -> ${repairId} -> shared Implementer -> combined review-validation.`],
    ["Required Changes", `Make the narrow identity correction for ${repairId}; route unrelated observations to separate Issues.`],
    ["Preserved Behavior", "Preserve all already-passed behavior, Issue switching, durable history, shared execution, and Development state."],
    ["In-Scope Surface", "Touch only the Issue lifecycle service and shared Codex executor paths required by the defect."],
    ["Acceptance Criteria", `Prove ${boundedDefect} is corrected with immediate parent ${parentImplementationId} preserved.`],
    ["Negative Constraints", "Do not add Development parentage, overwrite evidence, broaden the Repair, or mutate Git."],
    ["Return Target", "review-validation"],
    ["Implementer Report Requirements", `Reserve and update only the exact Issue-owned Implementer Report for ${repairId}.`],
    ["Manual Validation", "Operator confirms the exact evidence and retains final validation basis."],
  ];
  return [
    `# ${repairId} - Bounded Issue Repair`,
    "",
    `Immediate parent implementation: ${parentImplementationId}`,
    "",
    ...sections.flatMap(([heading, body]) => [
      `## ${heading}`,
      body,
      "",
      `${body} This section remains intentionally bounded and preserves causally prior evidence.`,
      "",
    ]),
  ].join("\n");
}

function validIssueInvestigation(issueId) {
  return [
    `# ${issueId} - Architect Investigation`,
    "## Purpose",
    "Establish evidence for Issue Resolution.",
    "## Issue Assessment",
    "The issue should proceed through Issue Resolution.",
    "## Repository Evidence Inspected",
    "Reviewed repository evidence.",
    "## Confirmed Current Architecture",
    "Issue Resolution is separate from Development.",
    "## Root Cause",
    "The issue needs bounded Fix Card work.",
    "## Required Architecture",
    "Use Issue-owned Fix Cards.",
    "## Preservation Rules",
    "Preserve Development state.",
    "## Risks and Constraints",
    "Avoid FC06 and FC07 scope.",
    "## Architect Recommendation",
    "Proceed in Issue Resolution",
    "## Architect Conclusion",
    "Proceed to Issue Planning.",
    "",
  ].join("\n");
}

function validIssueResolutionPlan(issueId) {
  return [
    `# ${issueId} \u2014 Issue Resolution Plan`,
    "## Accepted Correction Objective",
    "Create bounded Issue Fix Cards.",
    "## Bounded Scope",
    "Use Issue-owned contracts and reports.",
    "## Non-Scope",
    "Do not add validation, repair, or close.",
    "## Architecture Direction",
    "Reuse existing services.",
    "## Preservation Requirements",
    "Preserve Development behavior.",
    "## Dependencies and Sequencing",
    "Planning precedes implementation.",
    "## Risks",
    "Context leakage must be prevented.",
    "## Validation Strategy",
    "Use focused service tests.",
    "## Completion Criteria",
    "Two Fix Cards can be selected independently.",
    "",
  ].join("\n");
}

function validIssueFixCardPlan(issueId) {
  return [
    `# ${issueId} \u2014 Fix Card Plan`,
    "## Planning Basis",
    "Issue Resolution requires two bounded Codex fixture cards.",
    "## Fix Card Decomposition",
    "The cards provide separate contract contexts.",
    "## Fix Card Map",
    "```champcity-fix-card-plan",
    JSON.stringify([{
      fixCardId: `${issueId}-FC01`,
      order: 1,
      title: "Codex fixture one",
      purpose: "Provide the first Issue Fix Card execution context for isolation testing.",
      dependsOn: [],
      evidencePaths: [`issues/${issueId}/ARCHITECT_INVESTIGATION.md`],
    }, {
      fixCardId: `${issueId}-FC02`,
      order: 2,
      title: "Codex fixture two",
      purpose: "Provide the second Issue Fix Card execution context for isolation testing.",
      dependsOn: [],
      evidencePaths: [`issues/${issueId}/ARCHITECT_REVIEW.md`],
    }], null, 2),
    "```",
    "",
  ].join("\n");
}

function validIssueFixCardContract(fixCardId) {
  return [
    `# ${fixCardId} - Fix Card Contract`,
    "## Verified Repository Evidence",
    "The selected candidate belongs to the current Issue Fix Card Map.",
    "## Objective",
    "Implement the selected Issue Fix Card.",
    "## Runtime Sequence",
    "Plan, approve, reserve report, and run Codex.",
    "## Required Changes",
    "Update the Issue-owned Implementer Report.",
    "## Preserved Behavior",
    "Preserve Development behavior.",
    "## In-Scope Surface",
    "Use only Issue Resolution and Codex execution services.",
    "## Risks and Constraints",
    "Do not add validation, repair, close, or Git mutation.",
    "## Acceptance Criteria",
    "The exact Issue/Fix Card context is used.",
    "## Negative Constraints",
    "No cross-card session or preflight reuse.",
    "## Implementer Report Requirements",
    "Record files changed and checks run.",
    "## Manual Validation",
    "Operator validates live workflow later.",
    "",
  ].join("\n");
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


test("exact source-neutral Feature and Issue WorkItem selectors use fake App Server and typed attempt finalization", async (t) => {
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const { createWorkflowExecutionApplicationService } = require("../../dist/main/workflow/workflowExecutionApplicationService.js");
  const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
  const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
  const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
  const { CodexTesterExecutionService } = require("../../dist/main/workCardBuilding/codexTesterExecutionService.js");
  const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "champcity-wrb04-02c-"));
  const registration = await registerCurrentProject(root, "existing", { projectName: "Exact Codex fixture" });
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  t.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const principal = { principalId: "test-operator", principalType: "human", role: "Operator" };
  const state = createProjectStateService(store, principal);
  const createGraph = (workflowId, kind, objective) => ({ workflowId, topology: "direct",
    solution: { title: "Accepted solution", objective: "Deliver accepted result", scopeIn: ["bounded"], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], phases: [], workItems: [{ key: "same-title", kind, title: "Same title", objective, dependencyKeys: [], criteria: [
      { statement: "Required behavior", criticality: "required", verificationIntent: "Verify the accepted behavior", validationPolicy: "deterministic" },
    ] }, { key: "retryable", kind, title: "Retryable", objective: `${objective} retryable`, dependencyKeys: [], criteria: [] }] });
  const feature = await state.createSubstantiveWorkflow(registration.project.id, { workflowType: "feature-capability", title: "Feature", entryWorkspace: "feature-intake" });
  const issue = await state.createSubstantiveWorkflow(registration.project.id, { workflowType: "issue-resolution", title: "Issue", entryWorkspace: "issue-intake" });
  const featurePlan = await state.acceptWorkflowPlanningGraph(registration.project.id, createGraph(feature.workflow.id, "feature", "Feature objective"));
  const issuePlan = await state.acceptWorkflowPlanningGraph(registration.project.id, createGraph(issue.workflow.id, "fix", "Issue objective"));
  const featureItem = featurePlan.directWorkItems.find(item => item.body.title === "Same title");
  const issueItem = issuePlan.directWorkItems.find(item => item.body.title === "Same title");
  const partialItem = featurePlan.directWorkItems.find(item => item.body.title === "Retryable");
  const failedItem = issuePlan.directWorkItems.find(item => item.body.title === "Retryable");
  const legacyCalls = [];
  const currentModule = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
  const routedModule = require("../../dist/main/planExecution/routedImplementerContext.js");
  const issueModule = require("../../dist/main/issueResolution/issueResolutionService.js");
  const docsModule = require("../../dist/main/documents/planningDocumentService.js");
  const originals = [currentModule.getCurrentWorkspaceModel, routedModule.resolveRoutedImplementerContext, issueModule.resolveIssueFixCardCodexExecutionContext, docsModule.listPlanningDocuments, docsModule.evaluateDocumentFreshness];
  currentModule.getCurrentWorkspaceModel = () => { legacyCalls.push("current"); throw Error("legacy current workspace resolver called"); };
  routedModule.resolveRoutedImplementerContext = () => { legacyCalls.push("routed"); throw Error("legacy routed resolver called"); };
  issueModule.resolveIssueFixCardCodexExecutionContext = () => { legacyCalls.push("issue-card"); throw Error("legacy Issue card resolver called"); };
  docsModule.listPlanningDocuments = () => { legacyCalls.push("markdown"); throw Error("legacy Markdown discovery called"); };
  docsModule.evaluateDocumentFreshness = () => { legacyCalls.push("freshness"); throw Error("legacy report freshness called"); };
  t.after(() => {
    currentModule.getCurrentWorkspaceModel = originals[0]; routedModule.resolveRoutedImplementerContext = originals[1];
    issueModule.resolveIssueFixCardCodexExecutionContext = originals[2]; docsModule.listPlanningDocuments = originals[3]; docsModule.evaluateDocumentFreshness = originals[4];
  });
  const captured = [];
  let appServerCalls = 0;
  const fixture = runtimeFixture();
  await fixture.ready;
  const service = new CodexImplementerExecutionService(async () => {
    appServerCalls++;
    return { startThread(options) {
      const call = { options };
      captured.push(call);
      return { id: `fake-${appServerCalls}`, async runStreamed(prompt) {
        call.prompt = prompt;
        return { events: (async function* () {
          if (appServerCalls === 4) {
            yield { type: "item.completed", item: { type: "agent_message", text: "This is not semantic completion JSON." } };
            yield { type: "turn.completed" };
            return;
          }
          yield { type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ summary: appServerCalls === 3 ? "Partial semantic WorkItem" : "Completed semantic WorkItem", deviations: [], blockers: [], residualRisks: [], outcome: appServerCalls === 3 ? "partial" : "implemented" }) } };
          yield { type: "turn.completed" };
        })() };
      } };
    } };
  }, undefined, input => { assert.equal(input.executionKind, "workflow-work-item-implementation"); return { sandboxMode: "workspace-write", approvalPolicy: "on-request", approvalsReviewer: "user", networkAccessEnabled: false }; }, undefined, undefined,
  fixture.manager, () => createWorkflowExecutionApplicationService());
  for (const [workflowId, item] of [[feature.workflow.id, featureItem], [issue.workflow.id, issueItem]]) {
    const selector = { ownerKind: "workflow-work-item", workflowId, workItemId: item.id };
    const ready = await service.getStatus(root, selector);
    assert.equal(ready.state, "ready");
    assert.equal(ready.workCardId, item.id);
    assert.equal(ready.formalWorkCardPath, null);
    const started = await service.start(root, selector, selection);
    assert.equal(started.state, "running");
    const completed = await waitForSelectorState(service, root, selector, "completed");
    assert.equal(completed.failureReason, null);
    assert.equal(completed.checkpoint.status, "not-required");
    assert.equal(completed.reportUpdated, true);
    assert.equal(captured.at(-1).options.workingDirectory, path.join(root, ".champcity", "runtime", "work-item-workers", path.basename(captured.at(-1).options.workingDirectory)));
    assert.notEqual(captured.at(-1).options.workingDirectory, root);
    assert.deepEqual(captured.at(-1).options.writableRoots, [captured.at(-1).options.workingDirectory]);
    assert.equal(captured.at(-1).options.sandboxMode, "workspace-write");
    assert.equal(captured.at(-1).options.approvalPolicy, "on-request");
    assert.equal(captured.at(-1).options.networkAccessEnabled, false);
    assert.match(captured.at(-1).prompt, new RegExp(`Workflow ID: ${workflowId}`));
    assert.match(captured.at(-1).prompt, new RegExp(`WorkItem ID: ${item.id}`));
    assert.match(captured.at(-1).prompt, /source-neutral/);
    assert.match(captured.at(-1).prompt, /exactly one JSON object/);
  }
  assert.deepEqual(legacyCalls, []);
  assert.equal(appServerCalls, 2);
  const records = await store.listEntities(registration.project.id, "ImplementationRecord");
  assert.equal(records.length, 2);
  assert.ok(records.every(record => record.body.outcome === "implemented" && record.body.executionRef));
  const currentItems = await store.listEntities(registration.project.id, "WorkItem");
  assert.ok(currentItems.filter(item => [featureItem.id, issueItem.id].includes(item.id)).every(item => item.body.workState === "validation_pending"));
  assert.equal((await store.listEntities(registration.project.id, "SourceCheckpoint")).length, 0);
  const packets = fs.readdirSync(path.join(root, ".champcity", "runtime", "work-item-attempts"));
  assert.equal(packets.length, 2);
  for (const packetFile of packets) {
    const packet = JSON.parse(fs.readFileSync(path.join(root, ".champcity", "runtime", "work-item-attempts", packetFile), "utf8"));
    assert.equal(packet.schemaVersion, 1);
    assert.equal(packet.contractDigest.length, 64);
    assert.equal(packet.result.outcome, "implemented");
  }

  const partialSelector = { ownerKind: "workflow-work-item", workflowId: feature.workflow.id, workItemId: partialItem.id };
  const partialStarted = await service.start(root, partialSelector, selection);
  assert.equal(partialStarted.state, "running", partialStarted.failureReason);
  const partialCompletion = await waitForSelectorState(service, root, partialSelector, "completed");
  assert.equal(partialCompletion.canRunAgain, true);
  const partialRecord = (await store.listEntities(registration.project.id, "ImplementationRecord")).find(record => record.body.workItemId === partialItem.id);
  assert.equal(partialRecord.body.outcome, "partial");
  assert.equal((await store.getEntity(registration.project.id, partialItem.id)).body.workState, "ready");

  const failedSelector = { ownerKind: "workflow-work-item", workflowId: issue.workflow.id, workItemId: failedItem.id };
  const failedStarted = await service.start(root, failedSelector, selection);
  assert.equal(failedStarted.state, "running", failedStarted.failureReason);
  const failedCompletion = await waitForSelectorState(service, root, failedSelector, "failed");
  assert.equal(failedCompletion.checkpoint.status, "not-required");
  const failedRecord = (await store.listEntities(registration.project.id, "ImplementationRecord")).find(record => record.body.workItemId === failedItem.id);
  assert.equal(failedRecord.body.outcome, "failed");
  assert.equal((await store.getEntity(registration.project.id, failedItem.id)).body.workState, "ready");

  const currentIssueItem = await store.getEntity(registration.project.id, issueItem.id);
  const blocked = await state.reviseRecord(registration.project.id, issueItem.id, { ...currentIssueItem.body, workState: "blocked" }, currentIssueItem.recordVersion);
  const blockedStart = await service.start(root, { ownerKind: "workflow-work-item", workflowId: issue.workflow.id, workItemId: blocked.id }, selection);
  assert.equal(blockedStart.state, "unavailable");
  assert.equal(appServerCalls, 4);
  const sourceWorkflow = await state.createSubstantiveWorkflow(registration.project.id, { workflowType: "feature-capability", title: "Source-backed", entryWorkspace: "feature-intake" });
  const sourceBaseline = await state.createWorkflowSourceBaseline(registration.project.id, sourceWorkflow.workflow.id, { repositoryId: "source-backed", integrationTargetSourceLineId: "dev", baseRevisionId: "base" });
  await state.createWorkflowSourceBinding(registration.project.id, sourceWorkflow.workflow.id, sourceBaseline.id);
  const sourcePlan = await state.acceptWorkflowPlanningGraph(registration.project.id, createGraph(sourceWorkflow.workflow.id, "feature", "Source-backed objective"));
  const sourceRejected = await service.start(root, { ownerKind: "workflow-work-item", workflowId: sourceWorkflow.workflow.id, workItemId: sourcePlan.directWorkItems[0].id }, selection);
  assert.equal(sourceRejected.state, "unavailable");
  assert.match(sourceRejected.failureReason, /SOURCE_CHECKOUT_PREPARATION_UNAVAILABLE/i);
  const sourceMutationRejected = await service.start(root, { ownerKind: "workflow-work-item", workflowId: feature.workflow.id, workItemId: featureItem.id, sourceMutation: "required" }, selection);
  assert.equal(sourceMutationRejected.state, "unavailable");
  assert.match(sourceMutationRejected.failureReason, /source mutation options are not accepted/i);
  assert.equal(appServerCalls, 4);
});

// Existing lifecycle tests explicitly supply the new runtime identity through a per-test fixture.
function createService(...args) {
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const fixture = runtimeFixture();
  while (args.length < 5) args.push(undefined);
  const service = new CodexImplementerExecutionService(...args, fixture.manager);
  const start = service.start.bind(service);
  service.start = async (root, selector, chosen = selection) => { await fixture.ready; return start(root, selector, chosen); };
  const resolve = service.startEnvironmentResolution.bind(service);
  service.startEnvironmentResolution = async (...input) => { await fixture.ready; return resolve(...input); };
  return service;
}


for (const workflow of ["development", "issue"]) {
  test(`${workflow} renderer-facing preload/main start reaches the real transport with exact model and effort`, async () => {
    const { EventEmitter } = require("node:events");
    const { PassThrough } = require("node:stream");
    const { runtimeFixture, catalog } = require("../support/codex-runtime.cjs");
    const { codexIpcHarness } = require("../support/codex-ipc-harness.cjs");
    const { loadCodexAppServerAdapter } = require("../../dist/main/workCardBuilding/codexAppServerTransport.js");
    const chosen = { model: "precise-execution-id", reasoningEffort: "future-effort" };
    const fixture = runtimeFixture({probe: async () => [{...catalog[0], model: chosen.model, supportedReasoningEfforts:[chosen.reasoningEffort]}]});
    await fixture.ready;
    const root = workflow === "issue" ? seedIssueFixCardCodexWorkspace("ISSUE_125") : seedBuildReviewWorkspace();
    const requests = [];
    let factories = 0;
    const factory = async () => {
      factories++;
      const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
      child.kill = () => { child.killed = true; queueMicrotask(() => child.emit("exit", 0)); return true; };
      child.stdin.on("data", (data) => {
        for (const line of data.toString().trim().split("\n")) {
          const req = JSON.parse(line); if (!req.id) continue; requests.push(req);
          let result = {};
          if (req.method === "initialize") result = {userAgent:"fixture",codexHome:"<CODEX_HOME>"};
          if (req.method === "thread/start") result = {thread:{id:"thread-selection"},model:req.params.model};
          if (req.method === "turn/start") result = {turn:{id:"turn-selection",status:"completed"}};
          child.stdout.write(JSON.stringify({id:req.id,result}) + "\n");
        }
      });
      return loadCodexAppServerAdapter(() => child);
    };
    const service = new CodexImplementerExecutionService(factory, undefined, undefined, undefined, undefined, fixture.manager);
    const api = codexIpcHarness(service, fixture.manager, root);
    await api.setCodexModelSelection(chosen);
    const maliciousExtraFields = {...chosen, sandboxMode:"danger-full-access", approvalsReviewer:"auto_review", networkAccessEnabled:false};
    const start = (value) => workflow === "issue"
      ? api.startIssueCodexImplementerExecution("ISSUE_125", "ISSUE_125-FC01", "ISSUE_125-FC01", value)
      : api.startCodexImplementerExecution(value);
    for (const invalid of [undefined, {model:"removed",reasoningEffort:"high"}, {...chosen,reasoningEffort:"removed"}]) {
      const rejected = await start(invalid);
      assert.equal(rejected.state, "unavailable");
      assert.match(rejected.failureReason, /Choose|unavailable/);
    }
    assert.equal(factories, 0);
    const result = await start(maliciousExtraFields);
    assert.equal(result.state, "running");
    for (let i=0; i<100 && !requests.some(req=>req.method==="turn/start"); i++) await new Promise(resolve=>setTimeout(resolve,5));
    const thread = requests.find(req=>req.method==="thread/start").params;
    const turn = requests.find(req=>req.method==="turn/start").params;
    assert.equal(thread.model, chosen.model);
    assert.equal(turn.model, chosen.model);
    assert.equal(turn.effort, chosen.reasoningEffort);
    assert.equal(thread.sandbox, "workspace-write");
    assert.equal(thread.approvalsReviewer, "user");
    assert.equal(turn.sandboxPolicy.type, "workspaceWrite");
    assert.equal(turn.sandboxPolicy.networkAccess, true);
    assert.equal(factories, 1);
    await service.shutdownActiveExecutions();
  });
}

test("source-backed exact Workflow WorkItem uses its registered checkout and checkpoints only attributed changes", async t => {
  const { CodexTesterExecutionService } = require("../../dist/main/workCardBuilding/codexTesterExecutionService.js");
  const { execFileSync } = require("node:child_process");
  const { runtimeFixture, selection } = require("../support/codex-runtime.cjs");
  const { createWorkflowExecutionApplicationService } = require("../../dist/main/workflow/workflowExecutionApplicationService.js");
  const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
  const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
  const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
  const root = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "champcity-wrb04-02d-source-execution-"));
  const project = await registerCurrentProject(root, "existing", { projectName: "Source execution fixture" });
  const dev = path.join(root, "Dev"); fs.mkdirSync(dev);
  const git = (...args) => execFileSync("git", args, { cwd: dev, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "dev"); git("config", "user.name", "Test Operator"); git("config", "user.email", "operator@example.invalid");
  fs.mkdirSync(path.join(dev, "test"), { recursive: true });
  fs.writeFileSync(path.join(dev, "test", "seed.test.cjs"), "// Existing permanent test proof\n");
  fs.mkdirSync(path.join(dev, "validation"), { recursive: true });
  fs.writeFileSync(path.join(dev, "validation", "capability-map.json"), JSON.stringify({ schemaVersion: 4,
    capabilities: [{ capabilityId: "feature-behavior", sourcePatterns: ["feature.txt"] }],
    tests: [{ testPath: "test/seed.test.cjs", proposedValidationLane: "fast", duration: { kind: "estimated", milliseconds: 100 },
      execution: { ownedResources: ["temp-filesystem-isolated"] }, behaviorCoverage: [{ capabilityId: "feature-behavior", behaviorId: "feature-behavior-is-protected", proofRole: "primary" }] }] }));
  fs.writeFileSync(path.join(dev, "feature.txt"), "baseline\n"); git("add", "--all"); git("commit", "-m", "baseline");
  const revision = git("rev-parse", "HEAD");
  fs.writeFileSync(path.join(root, ".champcity", "mcp-workspace-binding.json"), JSON.stringify({ mcpWorkspaceId: "source-execution-fixture", gitBacked: true }));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, { principalId: "test-operator", principalType: "human", role: "Operator" });
  t.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const created = await state.createSubstantiveWorkflow(project.project.id, { workflowType: "feature-capability", title: "Source exact", entryWorkspace: "feature-intake" });
  const baseline = await state.createWorkflowSourceBaseline(project.project.id, created.workflow.id, { repositoryId: "source-execution-repository", integrationTargetSourceLineId: "dev", baseRevisionId: revision });
  await state.createWorkflowSourceBinding(project.project.id, created.workflow.id, baseline.id);
  const plan = await state.acceptWorkflowPlanningGraph(project.project.id, { workflowId: created.workflow.id, topology: "direct",
    solution: { title: "Accepted", objective: "Implement the source change", scopeIn: ["feature.txt"], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], phases: [], workItems: [
      { key: "source-item", kind: "feature", title: "Same title", objective: "Change feature.txt", dependencyKeys: [], criteria: [] },
      { key: "unsafe-item", kind: "feature", title: "Unsafe attribution", objective: "Change a source file", dependencyKeys: [], criteria: [] },
    ] });
  const item = plan.directWorkItems.find(candidate => candidate.body.title === "Same title");
  const unsafeItem = plan.directWorkItems.find(candidate => candidate.body.title === "Unsafe attribution");
  const unrelated = await state.createSubstantiveWorkflow(project.project.id, { workflowType: "issue-resolution", title: "Unrelated source", entryWorkspace: "issue-intake",
    sourceSeed: { repositoryId: "source-execution-repository", integrationTargetSourceLineId: "dev", baseRevisionId: revision } });
  const unrelatedPlan = await state.acceptWorkflowPlanningGraph(project.project.id, { workflowId: unrelated.workflow.id, topology: "direct",
    solution: { title: "Other", objective: "Other", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [], phases: [],
    workItems: [{ key: "unrelated-item", kind: "fix", title: "Same title", objective: "Not this checkout", dependencyKeys: [], criteria: [] }] });
  const fixture = runtimeFixture(); await fixture.ready;
  let appServerCalls = 0; let checkoutRegistrations = 0; const captured = [];
  const service = new CodexImplementerExecutionService(async () => {
    appServerCalls++;
    return { startThread(options) { captured.push(options); return { id: "source-thread", async runStreamed() {
      fs.writeFileSync(path.join(options.workingDirectory, appServerCalls === 1 ? "feature.txt" : "unreported.txt"), "implemented\n");
      return { events: (async function* () {
        yield { type: "item.completed", item: { type: "file_change", changes: [{ path: appServerCalls === 1 ? "feature.txt" : "../outside.txt" }], status: "completed" } };
        yield { type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ summary: "Implemented the exact source WorkItem", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" }) } };
        yield { type: "turn.completed" };
      })() };
    } }; } };
  }, undefined, () => ({ sandboxMode: "workspace-write", approvalPolicy: "on-request", approvalsReviewer: "user", networkAccessEnabled: false }),
  undefined, undefined, fixture.manager, dependencies => createWorkflowExecutionApplicationService(dependencies));
  service.configureSourceCheckoutRegistration(async () => ({ registerRepositoryCheckout: async (_workspaceId, checkout) => {
    checkoutRegistrations++;
    return { ...checkout, ...(checkout.workflowId === unrelated.workflow.id ? { projectRelativePath: `.champcity/checkouts/${created.workflow.id}` } : {}),
      availability: "available", validationError: null };
  } }));
  const unrelatedStart = await service.start(root, { ownerKind: "workflow-work-item", workflowId: unrelated.workflow.id, workItemId: unrelatedPlan.directWorkItems[0].id }, selection);
  assert.equal(unrelatedStart.state, "unavailable");
  assert.equal(appServerCalls, 0);
  assert.equal((await store.listEntities(project.project.id, "ImplementationRecord")).length, 0);
  const selector = { ownerKind: "workflow-work-item", workflowId: created.workflow.id, workItemId: item.id };
  const started = await service.start(root, selector, selection);
  assert.equal(started.state, "running", started.failureReason);
  const completed = await waitForSelectorState(service, root, selector, "completed", 300);
  assert.equal(completed.failureReason, null);
  assert.equal(completed.checkpoint.status, "committed", completed.checkpoint.message);
  assert.notEqual(captured[0].workingDirectory, root);
  assert.equal(captured[0].workingDirectory, path.join(root, ".champcity", "checkouts", created.workflow.id));
  assert.deepEqual(captured[0].writableRoots, [captured[0].workingDirectory]);
  assert.match(captured[0].workingDirectory, /checkouts/);
  const records = await store.listEntities(project.project.id, "ImplementationRecord");
  const checkpoints = await store.listEntities(project.project.id, "SourceCheckpoint");
  const bindings = await store.listEntities(project.project.id, "SourceBinding");
  assert.equal(records.length, 1, "one exact implementation record after the first source run");
  assert.equal(checkpoints.length, 1, "one structured checkpoint after the first source run");
  assert.equal(bindings.length, 2, "one source binding for each source-backed Workflow");
  assert.equal(records[0].body.workItemId, item.id); assert.equal(records[0].body.outcome, "implemented");
  const packet = JSON.parse(fs.readFileSync(path.join(root, ".champcity", "runtime", "work-item-attempts", `${records[0].body.executionRef}.json`), "utf8"));
  assert.equal(packet.result.summary, "Implemented the exact source WorkItem");
  assert.equal(checkpoints[0].body.workflowId, created.workflow.id);
  assert.equal(checkpoints[0].body.checkpointState, "committed");
  const checkpointLinks = await store.listRelationships(project.project.id, "checkpoints");
  assert.ok(checkpointLinks.some(edge => edge.fromEntityId === checkpoints[0].id && edge.toEntityId === records[0].id));
  const exactBinding = bindings.find(binding => binding.body.workflowId === created.workflow.id);
  assert.equal(exactBinding.body.currentRevisionId, checkpoints[0].body.resultingRevisionId);
  const testerOptions = [];
  let testerAppServerCalls = 0;
  const tester = new CodexTesterExecutionService(async () => { testerAppServerCalls++; return ({
    startThread(options) { testerOptions.push(options); return { id: "tester-thread", async runStreamed(prompt) {
      assert.match(prompt, /Bounded lifecycle determination/);
      assert.match(prompt, /ValidationCatalog proof covers affected capabilities: test\/seed\.test\.cjs/);
      fs.writeFileSync(path.join(options.workingDirectory, "test", "feature.test.cjs"), "// Tester-owned permanent proof\n");
      return { events: (async function* () {
        yield { type: "item.completed", item: { type: "file_change", changes: [{ path: "test/feature.test.cjs" }], status: "completed" } };
        yield { type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ recommendation: "permanent-proof-change-warranted",
          permanentTestPaths: ["test/feature.test.cjs"], determinationEvidence: ["Tester reviewed the exact implementation revision."], unknowns: [], rationale: "The behavior needs permanent regression proof." }) } };
        yield { type: "turn.completed" };
      })() };
    } }; }
  }); });
  const testerIds = { workflowId: created.workflow.id, workItemId: item.id, implementationRecordId: records[0].id };
  const sourceNeutral = await state.createSubstantiveWorkflow(project.project.id, { workflowType: "feature-capability", title: "Source neutral Tester", entryWorkspace: "feature-intake" });
  const neutralWork = await state.createRecord(project.project.id, "WorkItem", { workItemKind: "feature", title: "Same title", objective: "No source anchor", workState: "validation_pending" });
  await state.createRelationship(project.project.id, neutralWork.id, "part_of", sourceNeutral.workflow.id);
  const neutralImplementer = createProjectStateService(store, { principalId: "neutral-implementer", principalType: "agent", role: "Implementer" });
  const neutralImplementation = await neutralImplementer.recordImplementation(project.project.id, neutralWork.id,
    { summary: "Implementation complete", deviations: [], blockers: [], residualRisks: [], outcome: "implemented", executionRef: "neutral-execution" });
  const neutralStatus = await tester.getStatus(root, { workflowId: sourceNeutral.workflow.id, workItemId: neutralWork.id, implementationRecordId: neutralImplementation.id });
  assert.equal(neutralStatus.state, "unavailable");
  assert.match(neutralStatus.failureReason, /source-backed|SourceBinding|binding/i);
  const exactCheckout = path.join(root, ".champcity", "checkouts", created.workflow.id);
  const dirtyFile = path.join(exactCheckout, "pre-existing-dirty.txt");
  fs.writeFileSync(dirtyFile, "dirty before Tester\n");
  const dirtyStatus = await tester.getStatus(root, testerIds);
  assert.equal(dirtyStatus.state, "unavailable");
  assert.match(dirtyStatus.failureReason, /dirty/i);
  assert.equal(testerAppServerCalls, 0);
  fs.unlinkSync(dirtyFile);
  const testerReady = await tester.getStatus(root, testerIds);
  assert.equal(testerReady.state, "ready", testerReady.failureReason);
  const testerStarted = await tester.start(root, testerIds, selection);
  assert.equal(testerStarted.state, "running");
  let testerCompleted;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    testerCompleted = await tester.getStatus(root, testerIds);
    if (testerCompleted.state !== "running") break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(testerCompleted.state, "completed", testerCompleted.failureReason);
  assert.equal(testerCompleted.failureReason, null);
  assert.equal(testerCompleted.checkpointState, "committed");
  assert.ok(testerCompleted.testerResultId);
  assert.ok(testerCompleted.candidateRevisionId);
  assert.equal(testerOptions[0].sandboxMode, "workspace-write");
  assert.equal(testerOptions[0].networkAccessEnabled, false);
  assert.deepEqual(testerOptions[0].writableRoots, [path.join(testerOptions[0].workingDirectory, "test")]);
  const testerResult = await state.getRecord(project.project.id, testerCompleted.testerResultId);
  assert.equal(testerResult.body.implementationRecordId, records[0].id);
  assert.deepEqual(testerResult.body.affectedCapabilityIds, ["feature-behavior"]);
  assert.equal(testerResult.body.checkpointState, "committed");
  assert.deepEqual(testerResult.body.permanentTestPaths, ["test/feature.test.cjs"]);
  const testerCheckpoints = (await store.listEntities(project.project.id, "SourceCheckpoint")).filter(row => row.entityType === "SourceCheckpoint" && row.body.checkpointKind === "tester");
  assert.equal(testerCheckpoints.length, 1);
  assert.equal(testerCheckpoints[0].body.checkpointState, "committed");
  assert.equal(testerCheckpoints[0].body.resultingRevisionId, testerCompleted.candidateRevisionId);
  assert.equal(testerResult.body.sourceCheckpointId, testerCheckpoints[0].id);
  assert.ok((await store.listRelationships(project.project.id, "checkpoints")).some(edge => edge.fromEntityId === testerCheckpoints[0].id && edge.toEntityId === testerResult.id));
  const bindingAfterTester = await state.getRecord(project.project.id, exactBinding.id);
  assert.equal(bindingAfterTester.body.currentRevisionId, testerCompleted.candidateRevisionId);
  assert.equal(exactBinding.body.currentRevisionId, checkpoints[0].body.resultingRevisionId, "pre-tester binding snapshot remains on the implementation revision");
  assert.equal(git("branch", "--show-current"), "dev");
  assert.equal(appServerCalls, 1);
  const unsafeSelector = { ownerKind: "workflow-work-item", workflowId: created.workflow.id, workItemId: unsafeItem.id };
  const unsafeStart = await service.start(root, unsafeSelector, selection);
  assert.equal(unsafeStart.state, "running");
  const unsafeCompleted = await waitForSelectorState(service, root, unsafeSelector, "failed", 300);
  assert.equal(unsafeCompleted.checkpoint.status, "blocked");
  assert.match(unsafeCompleted.checkpoint.message, /attribution|path/i);
  const finalRecords = await store.listEntities(project.project.id, "ImplementationRecord");
  const finalCheckpoints = await store.listEntities(project.project.id, "SourceCheckpoint");
  assert.equal(finalRecords.length, 3); assert.equal(finalCheckpoints.length, 2);
  assert.equal(finalRecords.find(record => record.body.workItemId === unsafeItem.id).body.outcome, "implemented");
  assert.ok(fs.existsSync(path.join(root, ".champcity", "runtime", "work-item-attempts", `${finalRecords.find(record => record.body.workItemId === unsafeItem.id).body.executionRef}.json`)));
  assert.equal(checkoutRegistrations, 3);
  assert.equal(appServerCalls, 2);
});
