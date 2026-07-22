import {
  BrowserWindow,
  WebContentsView,
  shell,
  type BrowserWindowConstructorOptions,
} from "electron";
import type {
  ArchitectBrowserFoundationStatus,
  ArchitectBrowserLoadState,
  BrowserViewBounds,
} from "../../shared/workspaceContracts";
import { buildArchitectHandoffManifest } from "../integrations/architectMcpHandoffService";

export const architectSessionPartition = "persist:champcity-architect" as const;
const defaultArchitectSurfaceUrl = "https://chatgpt.com/";
let architectView: WebContentsView | null = null;
let attachedWindow: BrowserWindow | null = null;
let currentBrowserState: ArchitectBrowserLoadState = "detached";
let didFailLastLoad = false;
let rendererBounds: BrowserViewBounds | null = null;

export function getArchitectSurfaceUrl(): string {
  const configured = process.env.CHAMPCITY_ARCHITECT_SURFACE_URL?.trim();
  return configured && isAllowedArchitectSurfaceUrl(configured)
    ? configured
    : defaultArchitectSurfaceUrl;
}

export function architectBrowserWebPreferences(): NonNullable<BrowserWindowConstructorOptions["webPreferences"]> {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    partition: architectSessionPartition,
    preload: undefined,
  };
}

export function architectBrowserSecuritySummary(): ArchitectBrowserFoundationStatus["security"] {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  };
}

export function isAllowedArchitectSurfaceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["chatgpt.com", "chat.openai.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function shouldOpenExternally(targetUrl: string): boolean {
  try {
    const url = new URL(targetUrl);
    if (url.protocol !== "https:") {
      return true;
    }
    return !["chatgpt.com", "chat.openai.com"].includes(url.hostname);
  } catch {
    return true;
  }
}

export function inferArchitectBrowserLoadState(
  didFailLoad: boolean,
  currentUrl: string,
): ArchitectBrowserLoadState {
  if (didFailLoad || !isAllowedArchitectSurfaceUrl(currentUrl)) {
    return "load-failed";
  }
  return "loaded-auth-state-unknown";
}

export function getArchitectBrowserFoundationStatus(
  workspaceRoot: string,
): ArchitectBrowserFoundationStatus {
  return {
    surfaceUrl: getArchitectSurfaceUrl(),
    sessionPartition: architectSessionPartition,
    browserState: architectView
      ? currentBrowserState
      : "detached",
    handoff: buildArchitectHandoffManifest(workspaceRoot),
    security: architectBrowserSecuritySummary(),
  };
}

export function attachArchitectBrowserSurface(
  mainWindow: BrowserWindow,
  workspaceRoot: string,
): ArchitectBrowserFoundationStatus {
  if (!architectView) {
    architectView = new WebContentsView({
      webPreferences: architectBrowserWebPreferences(),
    });
    architectView.webContents.setWindowOpenHandler(({ url }) => {
      if (shouldOpenExternally(url)) {
        void shell.openExternal(url);
        return { action: "deny" };
      }
      return { action: "allow" };
    });
    architectView.webContents.on("will-navigate", (event, targetUrl) => {
      if (shouldOpenExternally(targetUrl)) {
        event.preventDefault();
        void shell.openExternal(targetUrl);
      }
    });
    architectView.webContents.on("did-start-loading", () => {
      didFailLastLoad = false;
      currentBrowserState = "loading";
    });
    architectView.webContents.on("did-fail-load", () => {
      didFailLastLoad = true;
      currentBrowserState = "load-failed";
    });
    architectView.webContents.on("did-finish-load", () => {
      didFailLastLoad = false;
      currentBrowserState = inferArchitectBrowserLoadState(false, architectView?.webContents.getURL() ?? getArchitectSurfaceUrl());
    });
  }

  if (attachedWindow !== mainWindow) {
    if (attachedWindow && architectView) {
      attachedWindow.contentView.removeChildView(architectView);
    }
    attachedWindow = mainWindow;
    mainWindow.contentView.addChildView(architectView);
    mainWindow.on("resize", layoutArchitectBrowserSurface);
  }

  layoutArchitectBrowserSurface();
  if (architectView.webContents.getURL().length === 0) {
    currentBrowserState = "loading";
    void architectView.webContents.loadURL(getArchitectSurfaceUrl());
  }

  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

export function detachArchitectBrowserSurface(
  workspaceRoot: string,
): ArchitectBrowserFoundationStatus {
  if (attachedWindow && architectView) {
    attachedWindow.contentView.removeChildView(architectView);
  }
  attachedWindow = null;
  currentBrowserState = "detached";
  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

export function setArchitectBrowserBounds(
  workspaceRoot: string,
  bounds: BrowserViewBounds,
): ArchitectBrowserFoundationStatus {
  rendererBounds = normalizeBounds(bounds);
  layoutArchitectBrowserSurface();
  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

export function confirmArchitectSignedIn(
  workspaceRoot: string,
): ArchitectBrowserFoundationStatus {
  if (!architectView) {
    throw new Error("Architect browser surface must be attached before sign-in can be confirmed.");
  }
  currentBrowserState = "operator-confirmed-signed-in";
  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

function layoutArchitectBrowserSurface(): void {
  if (!attachedWindow || !architectView) {
    return;
  }
  architectView.setBounds(rendererBounds ?? { x: 0, y: 0, width: 0, height: 0 });
}

function normalizeBounds(bounds: BrowserViewBounds): BrowserViewBounds {
  return {
    x: Math.max(0, Math.round(bounds.x)),
    y: Math.max(0, Math.round(bounds.y)),
    width: Math.max(0, Math.round(bounds.width)),
    height: Math.max(0, Math.round(bounds.height)),
  };
}
