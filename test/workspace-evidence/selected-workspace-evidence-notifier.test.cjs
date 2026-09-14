const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  SelectedWorkspaceEvidenceNotifier,
} = require("../../dist/main/workspaceEvidence/selectedWorkspaceEvidenceNotifier.js");

test("selected-workspace notifier coalesces domains and isolates switch and clear generations", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-evidence-notifier-"));
  const rootA = path.join(tempRoot, "a");
  const rootB = path.join(tempRoot, "b");
  for (const root of [rootA, rootB]) {
    fs.mkdirSync(path.join(root, "planning"), { recursive: true });
    fs.mkdirSync(path.join(root, "issues"), { recursive: true });
  }
  const scheduled = [];
  const watches = [];
  const notifications = [];
  const notifier = new SelectedWorkspaceEvidenceNotifier(
    (notification) => notifications.push(notification),
    {
      watch(root, options, listener) {
        const watcher = new EventEmitter();
        watcher.root = root;
        watcher.options = options;
        watcher.listener = listener;
        watcher.closed = false;
        watcher.close = () => { watcher.closed = true; };
        watches.push(watcher);
        return watcher;
      },
      schedule(callback) {
        scheduled.push(callback);
        return scheduled.length;
      },
      cancelSchedule() {},
    },
  );

  assert.equal(notifier.selectWorkspace(rootA), 1);
  const aPlanning = watches.find((watcher) => watcher.root === path.join(rootA, "planning"));
  const aIssues = watches.find((watcher) => watcher.root === path.join(rootA, "issues"));
  for (let index = 0; index < 20; index += 1) {
    aPlanning.listener("change", `draft-${index}.md`);
  }
  aIssues.listener("rename", "ISSUE_RECORD.md");
  assert.equal(scheduled.length, 1);
  scheduled.shift()();
  assert.deepEqual(notifications, [{ domains: ["planning", "issues"], sequence: 1, generation: 1 }]);

  aPlanning.listener("change", "pending-before-switch.md");
  assert.equal(scheduled.length, 1);
  assert.equal(notifier.selectWorkspace(rootB), 2);
  assert.equal(aPlanning.closed, true);
  aPlanning.listener("change", "late-a.md");
  const bIssues = watches.find((watcher) => watcher.root === path.join(rootB, "issues"));
  bIssues.listener("change", "ISSUE_RECORD.md");
  assert.equal(scheduled.length, 2);
  scheduled.shift()();
  assert.equal(notifications.length, 1);
  scheduled.shift()();
  assert.deepEqual(notifications.at(-1), { domains: ["issues"], sequence: 2, generation: 2 });

  notifier.clear();
  assert.equal(bIssues.closed, true);
  bIssues.listener("change", "late-b.md");
  assert.equal(scheduled.length, 0);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("real filesystem planning write emits a bounded path-free hint", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-evidence-real-"));
  const planningRoot = path.join(tempRoot, "planning");
  fs.mkdirSync(planningRoot, { recursive: true });
  let timeout;
  const notificationPromise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("Filesystem evidence notification timed out.")), 3000);
    const notifier = new SelectedWorkspaceEvidenceNotifier((notification) => {
      clearTimeout(timeout);
      notifier.clear();
      resolve(notification);
    }, { debounceMs: 30 });
    notifier.selectWorkspace(tempRoot);
    fs.writeFileSync(path.join(planningRoot, "draft.md"), "# Draft\n", "utf8");
  });

  const notification = await notificationPromise;
  assert.deepEqual(notification.domains, ["planning"]);
  assert.equal(notification.sequence, 1);
  assert.equal(notification.generation, 1);
  assert.deepEqual(Object.keys(notification).sort(), ["domains", "generation", "sequence"]);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});
