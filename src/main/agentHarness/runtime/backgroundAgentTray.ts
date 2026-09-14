import {
  Menu,
  Tray,
  type MenuItemConstructorOptions,
  type Point,
  type Rectangle,
} from "electron";
import type { AgentHarnessStatus } from "../../../shared/workspaceContracts";
import type { ChampCityStartupRegistrationScope } from "./champCityInstalledScope";
import type { AgentHarnessController } from "./agentHarnessController";
import type {
  AgentHarnessServiceLifecycleCoordinator,
  AgentHarnessServiceLifecycleSnapshot,
} from "./agentHarnessServiceLifecycle";

export type BackgroundAgentTrayState = "Ready" | "Stopped" | "Degraded" | "Recovering";

export interface BackgroundAgentTrayPresentation {
  backgroundAgentState: BackgroundAgentTrayState;
  mcpRuntimeState: string;
  mcpRunning: boolean;
  mcpStartEligible: boolean;
  mcpStopEligible: boolean;
}

export interface BackgroundAgentTrayActions {
  openChampCity: () => unknown | Promise<unknown>;
  startMcpRuntime: () => unknown | Promise<unknown>;
  stopMcpRuntime: () => unknown | Promise<unknown>;
  restartBackgroundAgent: () => unknown | Promise<unknown>;
  setLaunchAtLogin: (enabled: boolean) => unknown | Promise<unknown>;
  exitBackgroundAgent: () => unknown | Promise<unknown>;
}

interface BackgroundAgentTrayControllerOptions {
  iconPath: string;
  controller: AgentHarnessController;
  lifecycle: AgentHarnessServiceLifecycleCoordinator;
  readLaunchAtLogin: () => boolean;
  readStartupRegistrationScope?: () => ChampCityStartupRegistrationScope;
  actions: BackgroundAgentTrayActions;
  platform?: NodeJS.Platform;
  createTray?: (iconPath: string) => Tray;
  buildMenu?: (template: MenuItemConstructorOptions[]) => Menu;
}

export class BackgroundAgentTrayController {
  private readonly options: BackgroundAgentTrayControllerOptions;
  private readonly platform: NodeJS.Platform;
  private readonly createTray: (iconPath: string) => Tray;
  private readonly buildMenu: (template: MenuItemConstructorOptions[]) => Menu;
  private tray: Tray | null = null;
  private currentMenu: Menu | null = null;
  private unsubscribeLifecycle: (() => void) | null = null;
  private lastActionError: string | null = null;
  private lastPresentationError: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(options: BackgroundAgentTrayControllerOptions) {
    this.options = options;
    this.platform = options.platform ?? process.platform;
    this.createTray = options.createTray ?? ((iconPath) => new Tray(iconPath));
    this.buildMenu = options.buildMenu ?? ((template) => Menu.buildFromTemplate(template));
  }

  async create(): Promise<void> {
    if (this.platform !== "win32" || this.tray) {
      return;
    }
    const tray = this.createTray(this.options.iconPath);
    this.tray = tray;
    this.currentMenu = this.buildMenu(buildBackgroundAgentTrayFallbackMenuTemplate(
      wrapTrayActions(this.options.actions, (action) => this.runAction(action)),
    ));
    tray.setToolTip("ChampCity Background Agent — Degraded");
    tray.on("double-click", () => {
      void this.runAction(this.options.actions.openChampCity);
    });
    tray.on("right-click", (_event, bounds) => {
      this.presentCurrentMenu(bounds);
      void this.refresh();
    });
    this.unsubscribeLifecycle = this.options.lifecycle.subscribe(() => {
      void this.refresh();
    });
    await this.refresh();
  }

  isPresent(): boolean {
    return Boolean(this.tray && !this.tray.isDestroyed());
  }

  destroy(): void {
    this.unsubscribeLifecycle?.();
    this.unsubscribeLifecycle = null;
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
    }
    this.tray = null;
    this.currentMenu = null;
  }

  refresh(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = this.refreshNow().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async refreshNow(): Promise<void> {
    const tray = this.tray;
    if (!tray || tray.isDestroyed()) {
      return;
    }
    const lifecycle = this.options.lifecycle.snapshot();
    let status: AgentHarnessStatus | null = null;
    try {
      status = await this.options.controller.status();
    } catch (error) {
      this.lastActionError = boundedTrayError(error);
    }
    let currentError = this.lastPresentationError ?? this.lastActionError;
    const presentation = projectBackgroundAgentTrayPresentation(lifecycle, status, currentError);
    const actions = wrapTrayActions(this.options.actions, (action) => this.runAction(action));
    let launchAtLogin = false;
    let startupRegistrationScope: ChampCityStartupRegistrationScope = "user";
    try {
      launchAtLogin = this.options.readLaunchAtLogin();
      startupRegistrationScope = this.options.readStartupRegistrationScope?.() ?? "user";
    } catch (error) {
      this.lastActionError = boundedTrayError(error);
    }
    currentError = this.lastPresentationError ?? this.lastActionError;
    const template = buildBackgroundAgentTrayMenuTemplate(
      currentError
        ? { ...presentation, backgroundAgentState: "Degraded" }
        : presentation,
      launchAtLogin,
      actions,
      startupRegistrationScope,
    );
    if (tray !== this.tray || tray.isDestroyed()) {
      return;
    }
    this.currentMenu = this.buildMenu(template);
    tray.setToolTip(`ChampCity Background Agent — ${currentError ? "Degraded" : presentation.backgroundAgentState}`);
  }

  private presentCurrentMenu(eventBounds: Rectangle | undefined): void {
    const tray = this.tray;
    if (!tray || tray.isDestroyed()) {
      return;
    }
    let popupPoint = trayPopupPointFromBounds(eventBounds);
    if (!popupPoint) {
      try {
        popupPoint = trayPopupPointFromBounds(tray.getBounds());
      } catch (error) {
        this.lastPresentationError = boundedTrayError(error);
      }
    }
    if (!popupPoint) {
      this.lastPresentationError ??= "Background Agent tray bounds are unavailable.";
      tray.setToolTip("ChampCity Background Agent — Degraded");
      return;
    }
    this.lastPresentationError = null;
    if (!this.currentMenu) {
      this.currentMenu = this.buildMenu(buildBackgroundAgentTrayFallbackMenuTemplate(
        wrapTrayActions(this.options.actions, (action) => this.runAction(action)),
      ));
    }
    tray.popUpContextMenu(this.currentMenu, popupPoint);
  }

  private async runAction(action: () => unknown | Promise<unknown>): Promise<void> {
    try {
      await action();
      this.lastActionError = null;
    } catch (error) {
      this.lastActionError = boundedTrayError(error);
    } finally {
      await this.refresh();
    }
  }
}

export function trayPopupPointFromBounds(bounds: Rectangle | null | undefined): Point | null {
  if (
    !bounds
    || !Number.isFinite(bounds.x)
    || !Number.isFinite(bounds.y)
    || !Number.isFinite(bounds.width)
    || !Number.isFinite(bounds.height)
    || bounds.width <= 0
    || bounds.height <= 0
  ) {
    return null;
  }
  return {
    x: Math.floor(bounds.x + (bounds.width / 2)),
    y: Math.floor(bounds.y + (bounds.height / 2)),
  };
}

export function projectBackgroundAgentTrayPresentation(
  lifecycle: AgentHarnessServiceLifecycleSnapshot,
  status: AgentHarnessStatus | null,
  actionError: string | null = null,
): BackgroundAgentTrayPresentation {
  const backgroundAgentState: BackgroundAgentTrayState = actionError || lifecycle.state === "degraded"
    ? "Degraded"
    : ["starting", "suspending", "suspended", "resuming", "recovering"].includes(lifecycle.state)
    ? "Recovering"
    : lifecycle.state === "stopping"
    ? "Stopped"
    : "Ready";
  const mcpState = status?.state ?? "unavailable";
  return {
    backgroundAgentState,
    mcpRuntimeState: titleCaseState(mcpState),
    mcpRunning: mcpState === "running",
    mcpStartEligible: ["stopped", "failed"].includes(mcpState) && lifecycle.state === "ready",
    mcpStopEligible: mcpState === "running" && lifecycle.state === "ready",
  };
}

export function buildBackgroundAgentTrayMenuTemplate(
  presentation: BackgroundAgentTrayPresentation,
  launchAtLogin: boolean,
  actions: BackgroundAgentTrayActions,
  startupRegistrationScope: ChampCityStartupRegistrationScope = "user",
): MenuItemConstructorOptions[] {
  const runtimeAction: MenuItemConstructorOptions = presentation.mcpRunning
    ? {
        label: "Stop MCP Runtime",
        enabled: presentation.mcpStopEligible,
        click: () => { void actions.stopMcpRuntime(); },
      }
    : {
        label: "Start MCP Runtime",
        enabled: presentation.mcpStartEligible,
        click: () => { void actions.startMcpRuntime(); },
      };
  return [
    { label: "Open ChampCity A/I", click: () => { void actions.openChampCity(); } },
    { type: "separator" },
    { label: `Background Agent: ${presentation.backgroundAgentState}`, enabled: false },
    { label: `MCP Runtime: ${presentation.mcpRuntimeState}`, enabled: false },
    runtimeAction,
    { label: "Restart Background Agent", click: () => { void actions.restartBackgroundAgent(); } },
    { type: "separator" },
    ...(startupRegistrationScope === "machine"
      ? [{ label: "Windows startup trigger: Managed for everyone", enabled: false }]
      : []),
    {
      label: "Start Background Agent for my Windows user at sign-in",
      type: "checkbox",
      checked: launchAtLogin,
      click: (item) => { void actions.setLaunchAtLogin(item.checked); },
    },
    { type: "separator" },
    { label: "Exit Background Agent", click: () => { void actions.exitBackgroundAgent(); } },
  ];
}

export function buildBackgroundAgentTrayFallbackMenuTemplate(
  actions: BackgroundAgentTrayActions,
): MenuItemConstructorOptions[] {
  return [
    { label: "Open ChampCity A/I", click: () => { void actions.openChampCity(); } },
    { type: "separator" },
    { label: "Exit Background Agent", click: () => { void actions.exitBackgroundAgent(); } },
  ];
}

function wrapTrayActions(
  actions: BackgroundAgentTrayActions,
  run: (action: () => unknown | Promise<unknown>) => Promise<void>,
): BackgroundAgentTrayActions {
  return {
    openChampCity: () => run(actions.openChampCity),
    startMcpRuntime: () => run(actions.startMcpRuntime),
    stopMcpRuntime: () => run(actions.stopMcpRuntime),
    restartBackgroundAgent: () => run(actions.restartBackgroundAgent),
    setLaunchAtLogin: (enabled) => run(() => actions.setLaunchAtLogin(enabled)),
    exitBackgroundAgent: () => run(actions.exitBackgroundAgent),
  };
}

function titleCaseState(state: string): string {
  return state.length === 0 ? "Unavailable" : `${state[0].toUpperCase()}${state.slice(1)}`;
}

function boundedTrayError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 500) || "Background Agent tray action failed.";
}
