const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("../support/windows-test.cjs");

const root = path.resolve(__dirname, "../..");

test("Windows tray controller synchronously presents and refreshes its cached menu", async () => {
  const { BackgroundAgentTrayController } = require(path.join(
    root,
    "dist/main/agentHarness/runtime/backgroundAgentTray.js",
  ));
  const handlers = new Map();
  const builtMenus = [];
  const popupCalls = [];
  const actionCalls = [];
  const tooltips = [];
  let lifecycleListener = null;
  let destroyed = false;
  let setContextMenuCalls = 0;
  let statusCallCount = 0;
  let resolveInitialRefresh = null;
  let resolvePendingRefresh = null;
  const tray = {
    destroy() { destroyed = true; },
    isDestroyed() { return destroyed; },
    on(event, handler) { handlers.set(event, handler); },
    popUpContextMenu(menu, position) { popupCalls.push({ menu, position }); },
    setContextMenu() { setContextMenuCalls += 1; },
    setToolTip(value) { tooltips.push(value); },
  };
  const lifecycleSnapshot = {
    state: "ready",
    reason: "startup",
    stateChangedAt: "2026-09-12T12:00:00.000Z",
    powerEpoch: 0,
    consecutiveHeartbeatMisses: 0,
    workerRecoveryState: "idle",
    lastError: null,
    lastControlledRestart: null,
    lastSuspendAt: null,
    lastResumeAt: null,
    lastRecoveryStartedAt: null,
    lastReadyAt: "2026-09-12T12:00:00.000Z",
  };
  const controller = new BackgroundAgentTrayController({
    iconPath: "ChampCity-AI.ico",
    platform: "win32",
    createTray: () => tray,
    buildMenu: (template) => {
      const menu = { id: builtMenus.length + 1, template };
      builtMenus.push(menu);
      return menu;
    },
    controller: {
      status() {
        statusCallCount += 1;
        if (statusCallCount === 1) {
          return new Promise((resolve) => { resolveInitialRefresh = resolve; });
        }
        if (statusCallCount === 2) {
          return new Promise((resolve) => { resolvePendingRefresh = resolve; });
        }
        return Promise.resolve({ state: "stopped" });
      },
    },
    lifecycle: {
      snapshot: () => lifecycleSnapshot,
      subscribe(listener) {
        lifecycleListener = listener;
        return () => { lifecycleListener = null; };
      },
    },
    readLaunchAtLogin: () => true,
    actions: {
      openChampCity: () => actionCalls.push("open"),
      startMcpRuntime: () => actionCalls.push("start-mcp"),
      stopMcpRuntime: () => actionCalls.push("stop-mcp"),
      restartBackgroundAgent: () => actionCalls.push("restart-background"),
      setLaunchAtLogin: (enabled) => actionCalls.push(`login-${enabled}`),
      exitBackgroundAgent: () => actionCalls.push("exit-background"),
    },
  });

  const createPromise = controller.create();

  assert.deepEqual(
    builtMenus[0].template.map((item) => item.type === "separator" ? "---" : item.label),
    ["Open ChampCity A/I", "---", "Exit Background Agent"],
  );
  handlers.get("right-click")({}, { x: 1800, y: 1040, width: 24, height: 24 });
  assert.deepEqual(popupCalls, [{ menu: builtMenus[0], position: { x: 1812, y: 1052 } }]);
  assert.equal(statusCallCount, 1);

  resolveInitialRefresh({ state: "running" });
  await createPromise;
  const initialCurrentMenu = builtMenus.at(-1);
  assert.match(initialCurrentMenu.template[4].label, /Stop MCP Runtime/);
  assert.equal(setContextMenuCalls, 0);
  assert.equal(tooltips.at(-1), "ChampCity Background Agent — Ready");

  handlers.get("right-click")({}, { x: 1800, y: 1040, width: 24, height: 24 });

  assert.deepEqual(popupCalls, [
    { menu: builtMenus[0], position: { x: 1812, y: 1052 } },
    { menu: initialCurrentMenu, position: { x: 1812, y: 1052 } },
  ]);
  assert.equal(statusCallCount, 2);
  assert.equal(builtMenus.at(-1), initialCurrentMenu);

  resolvePendingRefresh({ state: "running" });
  await controller.refresh();
  const rightClickRefreshedMenu = builtMenus.at(-1);
  assert.notEqual(rightClickRefreshedMenu, initialCurrentMenu);

  lifecycleListener();
  await controller.refresh();
  const lifecycleRefreshedMenu = builtMenus.at(-1);
  assert.notEqual(lifecycleRefreshedMenu, rightClickRefreshedMenu);
  assert.match(lifecycleRefreshedMenu.template[4].label, /Start MCP Runtime/);

  handlers.get("right-click")({}, { x: -1920, y: -120, width: 24, height: 24 });

  assert.deepEqual(popupCalls, [
    { menu: builtMenus[0], position: { x: 1812, y: 1052 } },
    { menu: initialCurrentMenu, position: { x: 1812, y: 1052 } },
    { menu: lifecycleRefreshedMenu, position: { x: -1908, y: -108 } },
  ]);
  assert.equal(setContextMenuCalls, 0);

  lifecycleRefreshedMenu.template.find((item) => item.label === "Exit Background Agent").click();
  handlers.get("double-click")();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(actionCalls, ["exit-background", "open"]);

  controller.destroy();
  assert.equal(destroyed, true);
  assert.equal(lifecycleListener, null);
});

test("Windows tray controller bounds fallback never presents at an implicit origin", async () => {
  const { BackgroundAgentTrayController } = require(path.join(
    root,
    "dist/main/agentHarness/runtime/backgroundAgentTray.js",
  ));
  const handlers = new Map();
  const popupCalls = [];
  const tooltips = [];
  let fallbackBounds = { x: -1600, y: 900, width: 20, height: 20 };
  let getBoundsCalls = 0;
  const tray = {
    destroy() {},
    getBounds() {
      getBoundsCalls += 1;
      return fallbackBounds;
    },
    isDestroyed() { return false; },
    on(event, handler) { handlers.set(event, handler); },
    popUpContextMenu(menu, position) { popupCalls.push({ menu, position }); },
    setToolTip(value) { tooltips.push(value); },
  };
  const controller = new BackgroundAgentTrayController({
    iconPath: "ChampCity-AI.ico",
    platform: "win32",
    createTray: () => tray,
    buildMenu: (template) => ({ template }),
    controller: { status: async () => ({ state: "running" }) },
    lifecycle: {
      snapshot: () => ({
        state: "ready",
        reason: "startup",
        stateChangedAt: "2026-09-12T12:00:00.000Z",
        powerEpoch: 0,
        consecutiveHeartbeatMisses: 0,
        workerRecoveryState: "idle",
        lastError: null,
        lastControlledRestart: null,
        lastSuspendAt: null,
        lastResumeAt: null,
        lastRecoveryStartedAt: null,
        lastReadyAt: "2026-09-12T12:00:00.000Z",
      }),
      subscribe: () => () => {},
    },
    readLaunchAtLogin: () => false,
    actions: {
      openChampCity: () => {},
      startMcpRuntime: () => {},
      stopMcpRuntime: () => {},
      restartBackgroundAgent: () => {},
      setLaunchAtLogin: () => {},
      exitBackgroundAgent: () => {},
    },
  });

  await controller.create();
  handlers.get("right-click")({}, undefined);
  assert.equal(getBoundsCalls, 1);
  assert.deepEqual(popupCalls[0].position, { x: -1590, y: 910 });

  fallbackBounds = { x: Number.NaN, y: 0, width: 20, height: 20 };
  handlers.get("right-click")({}, { x: 0, y: 0, width: 0, height: 0 });
  assert.equal(getBoundsCalls, 2);
  assert.equal(popupCalls.length, 1);
  assert.equal(tooltips.at(-1), "ChampCity Background Agent — Degraded");
  assert.equal(popupCalls.some(({ position }) => position.x === 0 && position.y === 0), false);
});
