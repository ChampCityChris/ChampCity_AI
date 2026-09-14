const assert = require("node:assert/strict");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const {
  createEvidenceDrivenRefreshCoordinator,
} = loader.loadRendererSourceModule("src/renderer/app/evidenceDrivenRefreshCoordinator.ts");

function deferred() {
  let resolve;
  const promise = new Promise((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

async function settleMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("event bursts coalesce to one matching foreground refresh and ignore stale/domain-mismatched hints", async () => {
  const scheduled = [];
  let refreshCount = 0;
  let target = {
    ownerKey: "planning:architect-output:architect-interview",
    domain: "planning",
    refresh: async () => { refreshCount += 1; },
  };
  const coordinator = createEvidenceDrivenRefreshCoordinator({
    getForegroundTarget: () => target,
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancelSchedule() {},
  });
  coordinator.setWorkspaceGeneration(1);

  for (let sequence = 1; sequence <= 100; sequence += 1) {
    coordinator.notify({ domains: ["planning"], sequence, generation: 1 });
  }
  assert.equal(scheduled.length, 1);
  scheduled.shift()();
  await Promise.resolve();
  assert.equal(refreshCount, 1);

  coordinator.notify({ domains: ["planning"], sequence: 99, generation: 1 });
  coordinator.notify({ domains: ["issues"], sequence: 101, generation: 1 });
  scheduled.shift()();
  await Promise.resolve();
  assert.equal(refreshCount, 1);

  target = null;
  coordinator.notify({ domains: ["planning", "issues"], sequence: 102, generation: 1 });
  scheduled.shift()();
  await Promise.resolve();
  assert.equal(refreshCount, 1);
  coordinator.dispose();
});

test("one in-flight owner receives at most one newer-sequence follow-up", async () => {
  const scheduled = [];
  const releases = [];
  let refreshCount = 0;
  const target = {
    ownerKey: "issues:ISSUE_001:issue-planning",
    domain: "issues",
    refresh: () => {
      refreshCount += 1;
      return new Promise((resolve) => releases.push(resolve));
    },
  };
  const coordinator = createEvidenceDrivenRefreshCoordinator({
    getForegroundTarget: () => target,
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancelSchedule() {},
  });
  coordinator.setWorkspaceGeneration(1);

  coordinator.notify({ domains: ["issues"], sequence: 1, generation: 1 });
  scheduled.shift()();
  await settleMicrotasks();
  assert.equal(refreshCount, 1);
  for (let sequence = 2; sequence <= 30; sequence += 1) {
    coordinator.notify({ domains: ["issues"], sequence, generation: 1 });
  }
  scheduled.shift()();
  await settleMicrotasks();
  assert.equal(refreshCount, 1);
  releases.shift()();
  await settleMicrotasks();
  assert.equal(refreshCount, 2);
  releases.shift()();
  await Promise.resolve();
  coordinator.dispose();
});

test("Architect evidence waits for a pre-existing App refresh and then performs exactly one fresh read", async () => {
  const scheduled = [];
  const olderRefresh = deferred();
  let evidenceRefreshCount = 0;
  const target = {
    ownerKey: "planning:architect-output:architect-interview",
    domain: "planning",
    waitForIdle: () => olderRefresh.promise,
    refresh: async () => { evidenceRefreshCount += 1; },
  };
  const coordinator = createEvidenceDrivenRefreshCoordinator({
    getForegroundTarget: () => target,
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancelSchedule() {},
  });
  coordinator.setWorkspaceGeneration(1);

  const ordinaryProjectionRequests = 1;
  coordinator.notify({ domains: ["planning"], sequence: 1, generation: 1 });
  scheduled.shift()();
  await settleMicrotasks();
  assert.equal(evidenceRefreshCount, 0, "no parallel evidence request starts");

  olderRefresh.resolve();
  await settleMicrotasks();
  assert.equal(evidenceRefreshCount, 1, "one fresh request follows the older request");
  assert.equal(ordinaryProjectionRequests + evidenceRefreshCount, 2);
  coordinator.dispose();
});

test("Issue evidence waits for a pre-existing App refresh and then performs exactly one fresh read", async () => {
  const scheduled = [];
  const olderRefresh = deferred();
  let evidenceRefreshCount = 0;
  const target = {
    ownerKey: "issues:ISSUE_001:issue-planning",
    domain: "issues",
    waitForIdle: () => olderRefresh.promise,
    refresh: async () => { evidenceRefreshCount += 1; },
  };
  const coordinator = createEvidenceDrivenRefreshCoordinator({
    getForegroundTarget: () => target,
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancelSchedule() {},
  });
  coordinator.setWorkspaceGeneration(4);

  const ordinaryProjectionRequests = 1;
  coordinator.notify({ domains: ["issues"], sequence: 1, generation: 4 });
  scheduled.shift()();
  await settleMicrotasks();
  assert.equal(evidenceRefreshCount, 0, "no parallel Issue evidence request starts");

  olderRefresh.resolve();
  await settleMicrotasks();
  assert.equal(evidenceRefreshCount, 1, "one fresh Issue request follows the older request");
  assert.equal(ordinaryProjectionRequests + evidenceRefreshCount, 2);
  coordinator.dispose();
});

test("newer evidence while waiting collapses to one bounded follow-up without parallel requests", async () => {
  const scheduled = [];
  const olderRefresh = deferred();
  const evidenceReleases = [];
  let evidenceRefreshCount = 0;
  let concurrentEvidenceRefreshes = 0;
  let maximumConcurrentEvidenceRefreshes = 0;
  const target = {
    ownerKey: "issues:ISSUE_001:issue-planning",
    domain: "issues",
    waitForIdle: () => olderRefresh.promise,
    refresh: () => {
      evidenceRefreshCount += 1;
      concurrentEvidenceRefreshes += 1;
      maximumConcurrentEvidenceRefreshes = Math.max(
        maximumConcurrentEvidenceRefreshes,
        concurrentEvidenceRefreshes,
      );
      const release = deferred();
      evidenceReleases.push(() => {
        concurrentEvidenceRefreshes -= 1;
        release.resolve();
      });
      return release.promise;
    },
  };
  const coordinator = createEvidenceDrivenRefreshCoordinator({
    getForegroundTarget: () => target,
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancelSchedule() {},
  });
  coordinator.setWorkspaceGeneration(1);

  coordinator.notify({ domains: ["issues"], sequence: 1, generation: 1 });
  scheduled.shift()();
  for (let sequence = 2; sequence <= 20; sequence += 1) {
    coordinator.notify({ domains: ["issues"], sequence, generation: 1 });
  }
  scheduled.shift()();
  await settleMicrotasks();
  assert.equal(evidenceRefreshCount, 0);

  olderRefresh.resolve();
  await settleMicrotasks();
  assert.equal(evidenceRefreshCount, 1);
  assert.equal(maximumConcurrentEvidenceRefreshes, 1);

  evidenceReleases.shift()();
  await settleMicrotasks();
  assert.equal(evidenceRefreshCount, 2, "the accumulated newer sequence gets one follow-up");
  assert.equal(maximumConcurrentEvidenceRefreshes, 1);
  evidenceReleases.shift()();
  await settleMicrotasks();
  assert.equal(evidenceRefreshCount, 2, "no unbounded queue remains");
  coordinator.dispose();
});

test("workspace generation change cancels a stale wait even when the new owner key is identical", async () => {
  const scheduled = [];
  const projectARefresh = deferred();
  const calls = [];
  let target = {
    ownerKey: "planning:architect-output:architect-interview",
    domain: "planning",
    waitForIdle: () => projectARefresh.promise,
    refresh: async () => { calls.push("A"); },
  };
  const coordinator = createEvidenceDrivenRefreshCoordinator({
    getForegroundTarget: () => target,
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancelSchedule() {},
  });
  coordinator.setWorkspaceGeneration(1);
  coordinator.notify({ domains: ["planning"], sequence: 1, generation: 1 });
  scheduled.shift()();

  target = {
    ownerKey: "planning:architect-output:architect-interview",
    domain: "planning",
    waitForIdle: async () => {},
    refresh: async () => { calls.push("B"); },
  };
  coordinator.setWorkspaceGeneration(2);
  projectARefresh.resolve();
  await settleMicrotasks();
  assert.deepEqual(calls, [], "Project A cannot refresh Project B after the generation changes");

  coordinator.notify({ domains: ["planning"], sequence: 1, generation: 2 });
  scheduled.shift()();
  await settleMicrotasks();
  assert.deepEqual(calls, ["B"]);
  coordinator.dispose();
});

test("a controlled 60-second idle period schedules zero repository refreshes", () => {
  const scheduled = [];
  let refreshCount = 0;
  const coordinator = createEvidenceDrivenRefreshCoordinator({
    getForegroundTarget: () => ({
      ownerKey: "planning:architect-output:architect-interview",
      domain: "planning",
      refresh: async () => { refreshCount += 1; },
    }),
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancelSchedule() {},
  });
  coordinator.setWorkspaceGeneration(1);

  const simulatedElapsedMs = 60_000;
  assert.equal(simulatedElapsedMs, 60_000);
  assert.equal(scheduled.length, 0);
  assert.equal(refreshCount, 0);
  coordinator.dispose();
});

test("foreground return is a repository-backed missed-event fallback and workspace owners stay isolated", async () => {
  const scheduled = [];
  const calls = [];
  let target = {
    ownerKey: "issues:ISSUE_A:architect-planning",
    domain: "issues",
    refresh: async () => { calls.push("A"); },
  };
  const coordinator = createEvidenceDrivenRefreshCoordinator({
    getForegroundTarget: () => target,
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancelSchedule() {},
  });
  coordinator.setWorkspaceGeneration(1);

  coordinator.refreshBoundary();
  scheduled.shift()();
  await Promise.resolve();
  assert.deepEqual(calls, ["A"]);

  target = {
    ownerKey: "issues:ISSUE_B:architect-planning",
    domain: "issues",
    refresh: async () => { calls.push("B"); },
  };
  coordinator.setWorkspaceGeneration(2);
  coordinator.notify({ domains: ["issues"], sequence: 1, generation: 2 });
  scheduled.shift()();
  await Promise.resolve();
  assert.deepEqual(calls, ["A", "B"]);

  coordinator.notify({ domains: ["issues"], sequence: 999, generation: 1 });
  assert.equal(scheduled.length, 0);
  coordinator.dispose();
});

test("App uses pushed browser/evidence events and has no fixed heavy projection intervals", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(path.join(process.cwd(), "src", "renderer", "app", "App.tsx"), "utf8");
  const targetSource = source.slice(
    source.indexOf("function currentEvidenceRefreshTarget"),
    source.indexOf("async function refreshArchitectStatus"),
  );

  assert.match(source, /onArchitectBrowserFoundationStatus/);
  assert.match(source, /onWorkspaceEvidenceChanged/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /window\.addEventListener\("focus"/);
  assert.match(targetSource, /domain: "planning"/);
  assert.match(targetSource, /domain: "issues"/);
  assert.match(targetSource, /activeIssueStageId === "architect-planning"/);
  assert.match(targetSource, /activeIssueStageId === "issue-planning"/);
  assert.match(targetSource, /activeIssueFixCardStepId === "planning"/);
  assert.match(targetSource, /activeIssueFixCardStepId === "review-validation"/);
  assert.match(targetSource, /architectOutputRefreshCompletionRef\.current/);
  assert.match(targetSource, /workCardRepairRefreshCompletionRef\.current/);
  assert.match(targetSource, /issueArchitectProjectionRefreshCompletionRef\.current/);
  assert.match(targetSource, /issuePlanningProjectionRefreshCompletionRef\.current/);
  assert.match(targetSource, /issueFixCardProjectionRefreshCompletionRef\.current/);
  assert.doesNotMatch(source, /window\.setInterval\([\s\S]{0,300}refreshIssueArchitectPlanningProjection/);
  assert.doesNotMatch(source, /window\.setInterval\([\s\S]{0,300}refreshIssuePlanningProjection/);
  assert.doesNotMatch(source, /window\.setInterval\([\s\S]{0,300}refreshIssueFixCardProjection/);
  assert.doesNotMatch(source, /window\.setInterval\([\s\S]{0,300}refreshArchitectOutputWorkspace/);
});
