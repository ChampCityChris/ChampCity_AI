const assert = require("node:assert/strict");
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

test("Codex Implementer service starts SDK thread from current Implement context and exact prompt", async () => {
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
  assert.equal(started.integrationMode, "sdk");
  assert.equal(captured.threadOptions.workingDirectory, path.resolve(root));
  assert.equal(captured.threadOptions.skipGitRepoCheck, true);

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
  assert.equal(captured.turnOptions.signal instanceof AbortSignal, true);
});

test("Codex Implementer service reports SDK success without report changes as incomplete for review", async () => {
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

test("Codex Implementer service rejects a second in-flight launch and cancels only the tracked SDK run", async () => {
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

test("Codex Implementer status maps missing SDK/runtime to targeted unavailable message", async () => {
  const root = seedBuildReviewWorkspace();
  const service = new CodexImplementerExecutionService(async () => {
    throw new Error("Unable to locate Codex CLI binaries for x86_64-pc-windows-msvc.");
  });

  const status = await service.getStatus(root);

  assert.equal(status.state, "unavailable");
  assert.equal(status.integrationMode, "sdk");
  assert.equal(status.failureReason, CODEX_RUNTIME_UNAVAILABLE_MESSAGE);
  assert.equal(status.canRunAgain, false);
  assert.equal(status.retryBlocker, CODEX_RUNTIME_UNAVAILABLE_MESSAGE);
  assert.equal(status.implementerReportPath, reportPath());
});

test("Codex Implementer service maps auth-like SDK failure and preserves retry evidence", async () => {
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
    implementationSummary: "Implementation is blocked by a missing approved local SDK.",
    blockers: ["The approved SDK family is not installed in the environment."],
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
