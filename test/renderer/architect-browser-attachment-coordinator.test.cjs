const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  createArchitectAttachmentCoordinator,
  shouldShowArchitectBrowserRetry,
} = require("../../dist/shared/architectInterview/architectBrowserAttachmentCoordinator.js");

function visibleStatus(sequence = 1) {
  return {
    surfaceUrl: "https://chatgpt.com/",
    sessionPartition: "persist:champcity-architect",
    browserState: "loaded-auth-state-unknown",
    boundsSequence: sequence,
    attachment: {
      state: "attached-visible",
      isViewCreated: true,
      isAttachedToWindow: true,
      isVisible: true,
      bounds: {
        x: 10,
        y: 20,
        width: 600,
        height: 360,
        sequence,
      },
    },
    handoff: {
      state: "handoff-ready",
    },
    security: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: null,
    },
  };
}

function zeroStatus(sequence = 1) {
  return {
    ...visibleStatus(sequence),
    attachment: {
      state: "attached-zero-bounds",
      isViewCreated: true,
      isAttachedToWindow: true,
      isVisible: false,
      bounds: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        sequence,
      },
    },
  };
}

test("zero-size Architect host does not invoke visible-success attachment", async () => {
  const calls = [];
  const errors = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    nextSequence: () => 1,
    onError: (message) => errors.push(message),
    onStatus: (status) => calls.push(status.attachment.state),
    setBounds: async () => visibleStatus(),
    hideBrowser: async () => zeroStatus(),
    showBrowser: async () => {
      calls.push("show");
      return zeroStatus();
    },
    waitForNextFrame: async () => undefined,
    maxLayoutFrames: 1,
  });

  const result = await coordinator.attach();

  assert.equal(result.status, "failed");
  assert.deepEqual(calls, []);
  assert.match(errors.at(-1), /zero layout/i);
});

test("positive Architect host measurement calls show before sequenced bounds", async () => {
  const order = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 11, y: 22, width: 640, height: 400 }),
    nextSequence: () => 7,
    onError: () => undefined,
    onStatus: (status) => order.push(`status:${status.attachment.state}`),
    setBounds: async (bounds) => {
      order.push(`bounds:${bounds.sequence}:${bounds.width}x${bounds.height}`);
      assert.equal(bounds.attachmentGeneration, 1);
      return visibleStatus(bounds.sequence);
    },
    hideBrowser: async () => zeroStatus(),
    showBrowser: async (generation) => {
      order.push(`show:${generation}`);
      return zeroStatus(6);
    },
    waitForNextFrame: async () => undefined,
  });

  const result = await coordinator.attach();

  assert.equal(result.status, "attached-visible");
  assert.deepEqual(order, [
    "show:1",
    "status:attached-zero-bounds",
    "bounds:7:640x400",
    "status:attached-visible",
  ]);
});

test("stale Architect attachment completion is ignored", async () => {
  let resolveShow;
  const statuses = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 2, width: 500, height: 300 }),
    nextSequence: () => 1,
    onError: () => undefined,
    onStatus: (status) => statuses.push(status.attachment.state),
    setBounds: async () => visibleStatus(),
    hideBrowser: async () => zeroStatus(),
    showBrowser: () => new Promise((resolve) => {
      resolveShow = resolve;
    }),
    waitForNextFrame: async () => undefined,
  });

  const pending = coordinator.attach();
  await Promise.resolve();
  coordinator.invalidate();
  resolveShow(zeroStatus());

  assert.equal((await pending).status, "stale");
  assert.deepEqual(statuses, []);
});

test("Strict Mode replay cannot let the first completion override the second attempt", async () => {
  let resolveFirstShow;
  let showCall = 0;
  const statuses = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 4, y: 5, width: 700, height: 420 }),
    nextSequence: () => showCall,
    onError: () => undefined,
    onStatus: (status) => statuses.push(status.attachment.bounds.sequence),
    setBounds: async (bounds) => visibleStatus(bounds.sequence),
    hideBrowser: async () => zeroStatus(),
    showBrowser: () => {
      showCall += 1;
      if (showCall === 1) {
        return new Promise((resolve) => {
          resolveFirstShow = resolve;
        });
      }
      return Promise.resolve(zeroStatus(showCall));
    },
    waitForNextFrame: async () => undefined,
  });

  const first = coordinator.attach();
  await Promise.resolve();
  const second = coordinator.attach();
  await Promise.resolve();
  resolveFirstShow(zeroStatus(1));

  assert.equal((await first).status, "stale");
  assert.equal((await second).status, "attached-visible");
  assert.deepEqual(statuses, [2, 2]);
});

test("Retry uses a new generation and current Architect host measurement", async () => {
  let width = 0;
  let sequence = 0;
  const bounds = [];
  const errors = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 1, width, height: width / 2 }),
    nextSequence: () => {
      sequence += 1;
      return sequence;
    },
    onError: (message) => errors.push(message),
    onStatus: () => undefined,
    setBounds: async (nextBounds) => {
      bounds.push(nextBounds);
      return visibleStatus(nextBounds.sequence);
    },
    hideBrowser: async () => zeroStatus(),
    showBrowser: async () => zeroStatus(sequence),
    waitForNextFrame: async () => undefined,
    maxLayoutFrames: 0,
  });

  assert.equal((await coordinator.attach()).status, "failed");
  width = 800;
  assert.equal((await coordinator.retry()).status, "attached-visible");

  assert.equal(coordinator.getGeneration(), 2);
  assert.equal(bounds.at(-1).width, 800);
  assert.equal(errors.at(-1), "");
});

test("Retry failure preserves a visible error until later success clears it", async () => {
  let measurement = { x: 0, y: 0, width: 0, height: 0 };
  let visibleError = "prior attachment error";
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => measurement,
    nextSequence: () => 3,
    onError: (message) => {
      visibleError = message;
    },
    onStatus: () => undefined,
    setBounds: async (bounds) => visibleStatus(bounds.sequence),
    hideBrowser: async () => zeroStatus(),
    showBrowser: async () => zeroStatus(),
    waitForNextFrame: async () => undefined,
    maxLayoutFrames: 0,
  });

  assert.equal((await coordinator.retry()).status, "failed");
  assert.match(visibleError, /zero layout/i);

  measurement = { x: 3, y: 4, width: 600, height: 340 };
  assert.equal((await coordinator.retry()).status, "attached-visible");
  assert.equal(visibleError, "");
});

test("leaving Architect Interview invalidates pending attachment work", async () => {
  let resolveShow;
  const statuses = [];
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 2, width: 500, height: 300 }),
    nextSequence: () => 1,
    onError: () => undefined,
    onStatus: (status) => statuses.push(status.attachment.state),
    setBounds: async () => visibleStatus(),
    hideBrowser: async () => zeroStatus(),
    showBrowser: () => new Promise((resolve) => {
      resolveShow = resolve;
    }),
    waitForNextFrame: async () => undefined,
  });

  const pending = coordinator.attach();
  await Promise.resolve();
  coordinator.invalidate();
  resolveShow(zeroStatus());

  assert.equal((await pending).status, "stale");
  assert.deepEqual(statuses, []);
});

test("detach carries the current generation through zero bounds and hide", async () => {
  const calls = [];
  let sequence = 0;
  const coordinator = createArchitectAttachmentCoordinator({
    measureHost: () => ({ x: 1, y: 2, width: 500, height: 300 }),
    nextSequence: () => {
      sequence += 1;
      return sequence;
    },
    onError: () => undefined,
    onStatus: (status) => calls.push(`status:${status.attachment.state}`),
    setBounds: async (bounds) => {
      calls.push(`bounds:${bounds.attachmentGeneration}:${bounds.width}x${bounds.height}`);
      return bounds.width === 0 ? zeroStatus(bounds.sequence) : visibleStatus(bounds.sequence);
    },
    hideBrowser: async (generation) => {
      calls.push(`hide:${generation}`);
      return zeroStatus(sequence);
    },
    showBrowser: async (generation) => {
      calls.push(`show:${generation}`);
      return zeroStatus(sequence);
    },
    waitForNextFrame: async () => undefined,
  });

  assert.equal((await coordinator.attach()).status, "attached-visible");
  await coordinator.detach();

  assert.deepEqual(calls, [
    "show:1",
    "status:attached-zero-bounds",
    "bounds:1:500x300",
    "status:attached-visible",
    "bounds:1:0x0",
    "status:attached-zero-bounds",
    "hide:1",
    "status:attached-zero-bounds",
  ]);
});

test("Architect browser retry visibility is derived from attachment failure state", () => {
  assert.equal(shouldShowArchitectBrowserRetry(null), true);
  assert.equal(shouldShowArchitectBrowserRetry(zeroStatus()), true);
  assert.equal(shouldShowArchitectBrowserRetry({
    ...visibleStatus(),
    attachment: {
      ...visibleStatus().attachment,
      state: "attach-failed",
      isVisible: false,
      lastError: "failed",
    },
  }), true);
  assert.equal(shouldShowArchitectBrowserRetry(visibleStatus()), false);
});

test("Architect Interview source layout removes generic panels and preserves dual-pane retry surface", () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), "src", "renderer", "app", "App.tsx"), "utf8");
  const styleSource = fs.readFileSync(path.join(process.cwd(), "src", "renderer", "styles.css"), "utf8");

  assert.match(appSource, /activeWorkspaceId !== "architect-interview" \? \(\s*<div className=\{workspace\.ok \? "workspace-status ready" : "workspace-status"\}>/s);
  assert.match(appSource, /activeWorkspaceId !== "architect-interview" \? \(\s*<CurrentWorkspaceBanner/s);
  assert.match(styleSource, /grid-template-rows:\s*auto auto minmax\(0, 1fr\);/);
  assert.match(appSource, /<article className="document-preview">/);
  assert.match(appSource, /<aside className="architect-surface-pane" aria-label="Architect browser surface">/);
  assert.doesNotMatch(appSource, /External/);
  assert.doesNotMatch(appSource, /surfaceMode/);
  assert.doesNotMatch(styleSource, /surface-mode/);
  assert.match(appSource, /shouldShowArchitectBrowserRetry\(browserStatus\)/);
  assert.match(appSource, /Retry Embedded Browser/);
});
