import {
  BrowserWindow,
  Menu,
  WebContentsView,
  shell,
  type BrowserWindowConstructorOptions,
  type WebContents,
} from "electron";
import type {
  ArchitectBrowserAttachmentStatus,
  ArchitectBrowserFoundationStatus,
  ArchitectBrowserLoadState,
  ArchitectBrowserNavigationDiagnostic,
  ArchitectBrowserNavigationDisposition,
  BrowserViewBounds,
} from "../../shared/workspaceContracts";
import {
  classifyArchitectBrowserNavigation,
  isArchitectApplicationUrl,
  isAllowedArchitectSurfaceUrl,
  isAllowedEmbeddedArchitectNavigationUrl,
  redactedHostFromUrl,
} from "../../shared/architectInterview/architectBrowserNavigationPolicy";
import { buildArchitectHandoffManifest } from "../integrations/architectMcpHandoffService";
import { buildRemoteSurfaceContextMenuTemplate } from "../contextMenu/localRendererContextMenu";

export { isAllowedArchitectSurfaceUrl, isAllowedEmbeddedArchitectNavigationUrl };

export const architectSessionPartition = "persist:champcity-architect" as const;
const defaultArchitectSurfaceUrl = "https://chatgpt.com/";
const maxNavigationDiagnostics = 80;

let architectView: WebContentsView | null = null;
let attachedWindow: BrowserWindow | null = null;
let owningWindow: BrowserWindow | null = null;
let isArchitectViewAttachedToWindow = false;
let currentBrowserState: ArchitectBrowserLoadState = "detached";
let didFailLastLoad = false;
let rendererBounds: BrowserViewBounds | null = null;
let latestBoundsSequence = 0;
let currentAttachmentGeneration = 0;
let attachedResizeWindow: BrowserWindow | null = null;
let lastAttachmentError: string | undefined;
let didReleaseArchitectBrowserSurface = false;
let authWindows = new Set<BrowserWindow>();
let navigationDiagnostics: ArchitectBrowserNavigationDiagnostic[] = [];
let createArchitectWebContentsView = (): WebContentsView =>
  new WebContentsView({
    webPreferences: architectBrowserWebPreferences(),
  });

const layoutArchitectBrowserSurface = (): boolean => {
  if (!attachedWindow || !architectView || !isArchitectViewAttachedToWindow) {
    return true;
  }
  try {
    architectView.setBounds(rendererBounds ?? zeroBounds(latestBoundsSequence));
    lastAttachmentError = undefined;
    return true;
  } catch (error) {
    lastAttachmentError = normalizeErrorMessage(error, "Architect browser bounds could not be applied.");
    return false;
  }
};

const attachedWindowResizeListener = (): void => {
  void layoutArchitectBrowserSurface();
};

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

export function shouldOpenExternally(targetUrl: string): boolean {
  const classification = classifyArchitectBrowserNavigation(targetUrl);
  return classification === "external" || classification === "invalid";
}

export function inferArchitectBrowserLoadState(
  didFailLoad: boolean,
  currentUrl: string,
): ArchitectBrowserLoadState {
  if (didFailLoad || !isAllowedEmbeddedArchitectNavigationUrl(currentUrl)) {
    return "load-failed";
  }
  if (!isArchitectApplicationUrl(currentUrl)) {
    return "loading";
  }
  return "loaded-auth-state-unknown";
}

export function reloadArchitectBrowserSurface(
  workspaceRoot: string,
): ArchitectBrowserFoundationStatus {
  if (!architectView || architectView.webContents.isDestroyed()) {
    throw new Error("Embedded ChatGPT browser is not available to reload.");
  }

  didFailLastLoad = false;
  currentBrowserState = "loading";
  architectView.webContents.reload();
  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

export function getArchitectBrowserFoundationStatus(
  workspaceRoot: string,
): ArchitectBrowserFoundationStatus {
  return {
    surfaceUrl: getArchitectSurfaceUrl(),
    sessionPartition: architectSessionPartition,
    browserState: architectView ? currentBrowserState : "detached",
    boundsSequence: latestBoundsSequence,
    attachment: getArchitectBrowserAttachmentStatus(),
    navigationDiagnostics: navigationDiagnostics.slice(),
    handoff: buildArchitectHandoffManifest(workspaceRoot),
    security: architectBrowserSecuritySummary(),
  };
}

export function getArchitectBrowserAttachmentStatus(): ArchitectBrowserAttachmentStatus {
  const bounds = getCurrentAttachmentBounds();
  const isViewCreated = Boolean(architectView);
  const isAttachedToWindow = isViewCreated && Boolean(attachedWindow) && isArchitectViewAttachedToWindow;
  const isVisible = isAttachedToWindow && bounds.width > 0 && bounds.height > 0;

  if (lastAttachmentError) {
    return {
      state: "attach-failed",
      isViewCreated,
      isAttachedToWindow,
      isVisible: false,
      bounds,
      lastError: lastAttachmentError,
    };
  }

  if (isVisible) {
    return {
      state: "attached-visible",
      isViewCreated,
      isAttachedToWindow,
      isVisible: true,
      bounds,
    };
  }

  if (isAttachedToWindow) {
    return {
      state: "attached-zero-bounds",
      isViewCreated,
      isAttachedToWindow,
      isVisible: false,
      bounds,
    };
  }

  return {
    state: "detached",
    isViewCreated,
    isAttachedToWindow: false,
    isVisible: false,
    bounds,
  };
}

export function attachArchitectBrowserSurface(
  mainWindow: BrowserWindow,
  workspaceRoot: string,
  attachmentGeneration?: number,
): ArchitectBrowserFoundationStatus {
  if (isStaleAttachmentGeneration(attachmentGeneration)) {
    return getArchitectBrowserFoundationStatus(workspaceRoot);
  }
  acceptAttachmentGeneration(attachmentGeneration);
  didReleaseArchitectBrowserSurface = false;

  if (!architectView) {
    architectView = createArchitectWebContentsView();
    registerMainArchitectWebContents(architectView.webContents);
  }

  if (attachedWindow !== mainWindow) {
    if (!detachFromWindow()) {
      return getArchitectBrowserFoundationStatus(workspaceRoot);
    }
    attachedWindow = mainWindow;
    try {
      mainWindow.contentView.addChildView(architectView);
      isArchitectViewAttachedToWindow = true;
      lastAttachmentError = undefined;
      attachWindowLifecycle(mainWindow);
    } catch (error) {
      attachedWindow = null;
      isArchitectViewAttachedToWindow = false;
      lastAttachmentError = normalizeErrorMessage(error, "Architect browser surface could not attach to the current window.");
      return getArchitectBrowserFoundationStatus(workspaceRoot);
    }
  } else if (!isArchitectViewAttachedToWindow) {
    try {
      mainWindow.contentView.addChildView(architectView);
      isArchitectViewAttachedToWindow = true;
      lastAttachmentError = undefined;
      attachWindowLifecycle(mainWindow);
    } catch (error) {
      lastAttachmentError = normalizeErrorMessage(error, "Architect browser surface could not reattach to the current window.");
      return getArchitectBrowserFoundationStatus(workspaceRoot);
    }
  } else {
    attachWindowLifecycle(mainWindow);
  }

  layoutArchitectBrowserSurface();
  if (architectView.webContents.getURL().length === 0) {
    currentBrowserState = "loading";
    void architectView.webContents.loadURL(getArchitectSurfaceUrl());
  } else if (currentBrowserState === "detached") {
    currentBrowserState = inferArchitectBrowserLoadState(false, architectView.webContents.getURL());
  }

  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

export function detachArchitectBrowserSurface(
  workspaceRoot: string,
  attachmentGeneration?: number,
): ArchitectBrowserFoundationStatus {
  if (isStaleAttachmentGeneration(attachmentGeneration)) {
    return getArchitectBrowserFoundationStatus(workspaceRoot);
  }
  acceptAttachmentGeneration(attachmentGeneration);
  const zeroed = zeroArchitectBrowserSurface(attachmentGeneration);
  const detached = detachFromWindow();
  if (zeroed && detached) {
    currentBrowserState = "detached";
  }
  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

export function setArchitectBrowserBounds(
  workspaceRoot: string,
  bounds: BrowserViewBounds,
): ArchitectBrowserFoundationStatus {
  if (isStaleAttachmentGeneration(bounds.attachmentGeneration)) {
    return getArchitectBrowserFoundationStatus(workspaceRoot);
  }
  acceptAttachmentGeneration(bounds.attachmentGeneration);
  const normalized = normalizeBounds(bounds);
  if ((normalized.sequence ?? 0) < latestBoundsSequence) {
    return getArchitectBrowserFoundationStatus(workspaceRoot);
  }
  latestBoundsSequence = normalized.sequence ?? latestBoundsSequence + 1;
  rendererBounds = { ...normalized, sequence: latestBoundsSequence };
  layoutArchitectBrowserSurface();
  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

export function confirmArchitectSignedIn(
  workspaceRoot: string,
): ArchitectBrowserFoundationStatus {
  if (!architectView) {
    throw new Error("Architect browser surface must be attached before sign-in can be confirmed.");
  }
  if (currentBrowserState !== "loaded-auth-state-unknown") {
    throw new Error("Sign-in can only be confirmed after the Architect surface has loaded with unknown authentication state.");
  }
  currentBrowserState = "operator-confirmed-signed-in";
  return getArchitectBrowserFoundationStatus(workspaceRoot);
}

function registerMainArchitectWebContents(webContents: WebContents): void {
  registerRemoteSurfaceContextMenu(webContents);

  webContents.setWindowOpenHandler(({ url }) => {
    const classification = classifyArchitectBrowserNavigation(url);
    const disposition = navigationDispositionForClassification(classification, true);
    recordNavigationDiagnostic({
      eventType: "window-open",
      webContents,
      targetUrl: url,
      frame: "popup",
      disposition,
    });

    if (disposition === "external") {
      void shell.openExternal(url);
      return { action: "deny" };
    }

    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        webPreferences: architectBrowserWebPreferences(),
      },
    };
  });

  webContents.on("did-create-window", (window) => {
    registerAuthenticationWindow(window);
  });

  webContents.on("will-navigate", (event, targetUrl) => {
    const classification = classifyArchitectBrowserNavigation(targetUrl);
    const disposition = navigationDispositionForClassification(classification, false);
    recordNavigationDiagnostic({
      eventType: "will-navigate",
      webContents,
      targetUrl,
      frame: "main-frame",
      disposition,
    });
    if (disposition === "external") {
      event.preventDefault();
      void shell.openExternal(targetUrl);
    }
  });

  webContents.on("did-start-loading", () => {
    didFailLastLoad = false;
    currentBrowserState = "loading";
  });
  webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame === false) {
      return;
    }
    const canceled = isCanceledNavigation(errorCode, errorDescription);
    if (!canceled) {
      didFailLastLoad = true;
      currentBrowserState = "load-failed";
    }
    recordNavigationDiagnostic({
      eventType: "did-fail-load",
      webContents,
      targetUrl: typeof validatedURL === "string" ? validatedURL : webContents.getURL(),
      frame: "main-frame",
      disposition: canceled ? "allow" : "deny",
      loadResult: {
        success: canceled,
        code: typeof errorCode === "number" ? errorCode : undefined,
      },
    });
  });
  webContents.on("did-finish-load", () => {
    recordNavigationDiagnostic({
      eventType: "did-finish-load",
      webContents,
      targetUrl: webContents.getURL(),
      frame: "main-frame",
      disposition: "allow",
      loadResult: { success: true },
    });
  });
  webContents.on("did-stop-loading", () => {
    currentBrowserState = didFailLastLoad
      ? "load-failed"
      : inferArchitectBrowserLoadState(false, webContents.getURL());
    if (currentBrowserState !== "load-failed") {
      didFailLastLoad = false;
    }
    recordNavigationDiagnostic({
      eventType: "did-stop-loading",
      webContents,
      targetUrl: webContents.getURL(),
      frame: "main-frame",
      disposition: currentBrowserState === "load-failed" ? "deny" : "allow",
      loadResult: { success: currentBrowserState !== "load-failed" },
    });
  });
}

function registerAuthenticationWindow(window: BrowserWindow): void {
  authWindows.add(window);
  registerRemoteSurfaceContextMenu(window.webContents, window);
  window.once("closed", () => {
    authWindows.delete(window);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    const classification = classifyArchitectBrowserNavigation(url);
    const disposition = navigationDispositionForClassification(classification, true);
    recordNavigationDiagnostic({
      eventType: "auth-window-open",
      webContents: window.webContents,
      targetUrl: url,
      frame: "popup",
      disposition,
    });
    if (disposition === "external") {
      void shell.openExternal(url);
      return { action: "deny" };
    }
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        webPreferences: architectBrowserWebPreferences(),
      },
    };
  });

  window.webContents.on("will-navigate", (event, targetUrl) => {
    const classification = classifyArchitectBrowserNavigation(targetUrl);
    const disposition = navigationDispositionForClassification(classification, false);
    recordNavigationDiagnostic({
      eventType: "auth-will-navigate",
      webContents: window.webContents,
      targetUrl,
      frame: "main-frame",
      disposition,
    });

    if (classification === "architect-app") {
      event.preventDefault();
      closeAuthenticationWindow(window);
      focusMainArchitectSurface(targetUrl);
      return;
    }

    if (disposition === "external") {
      event.preventDefault();
      void shell.openExternal(targetUrl);
    }
  });

  window.webContents.on("did-fail-load", (_event, errorCode, _errorDescription, validatedURL, isMainFrame) => {
    recordNavigationDiagnostic({
      eventType: "auth-did-fail-load",
      webContents: window.webContents,
      targetUrl: typeof validatedURL === "string" ? validatedURL : window.webContents.getURL(),
      frame: isMainFrame === false ? "popup" : "main-frame",
      disposition: "deny",
      loadResult: {
        success: false,
        code: typeof errorCode === "number" ? errorCode : undefined,
      },
    });
  });
}

function registerRemoteSurfaceContextMenu(webContents: WebContents, popupWindow?: BrowserWindow): void {
  webContents.on("context-menu", (_event, params) => {
    const template = buildRemoteSurfaceContextMenuTemplate({
      isEditable: params.isEditable,
      selectionText: params.selectionText,
      editFlags: params.editFlags,
    });

    if (template.length === 0) {
      return;
    }

    Menu.buildFromTemplate(template).popup({
      window: popupWindow ?? attachedWindow ?? undefined,
    });
  });
}

function focusMainArchitectSurface(targetUrl: string): void {
  if (architectView && !architectView.webContents.isDestroyed()) {
    currentBrowserState = "loading";
    void architectView.webContents.loadURL(targetUrl);
    architectView.webContents.focus();
  }
  if (attachedWindow && !attachedWindow.isDestroyed()) {
    attachedWindow.focus();
  }
}

function closeAuthenticationWindow(window: BrowserWindow): void {
  if (!window.isDestroyed()) {
    window.close();
  }
  authWindows.delete(window);
}

function navigationDispositionForClassification(
  classification: ReturnType<typeof classifyArchitectBrowserNavigation>,
  isPopup: boolean,
): ArchitectBrowserNavigationDisposition {
  if (classification === "external" || classification === "invalid") {
    return "external";
  }
  if (classification === "authentication-provider" || isPopup) {
    return "internal-auth-surface";
  }
  return "allow";
}

function recordNavigationDiagnostic(input: {
  eventType: string;
  webContents: Pick<WebContents, "getURL" | "id">;
  targetUrl: string;
  frame: ArchitectBrowserNavigationDiagnostic["frame"];
  disposition: ArchitectBrowserNavigationDisposition;
  loadResult?: ArchitectBrowserNavigationDiagnostic["loadResult"];
}): void {
  const diagnostic: ArchitectBrowserNavigationDiagnostic = {
    timestamp: new Date().toISOString(),
    eventType: input.eventType,
    sourceHost: redactedHostFromUrl(input.webContents.getURL()),
    destinationHost: redactedHostFromUrl(input.targetUrl),
    frame: input.frame,
    disposition: input.disposition,
    webContentsId: input.webContents.id ?? 0,
    sessionPartition: architectSessionPartition,
    loadResult: input.loadResult,
  };
  navigationDiagnostics = [...navigationDiagnostics, diagnostic].slice(-maxNavigationDiagnostics);
}

function isCanceledNavigation(errorCode: unknown, errorDescription: unknown): boolean {
  return errorCode === -3 ||
    (typeof errorDescription === "string" &&
      /ERR_ABORTED|aborted|cancel(?:ed|led)/i.test(errorDescription));
}

function acceptAttachmentGeneration(attachmentGeneration?: number): void {
  if (typeof attachmentGeneration === "number" && Number.isFinite(attachmentGeneration)) {
    currentAttachmentGeneration = Math.max(currentAttachmentGeneration, Math.round(attachmentGeneration));
    return;
  }
  currentAttachmentGeneration += 1;
}

function isStaleAttachmentGeneration(attachmentGeneration?: number): boolean {
  return typeof attachmentGeneration === "number" &&
    Number.isFinite(attachmentGeneration) &&
    Math.round(attachmentGeneration) < currentAttachmentGeneration;
}

function normalizeBounds(bounds: BrowserViewBounds): BrowserViewBounds {
  return {
    x: Math.max(0, Math.round(bounds.x)),
    y: Math.max(0, Math.round(bounds.y)),
    width: Math.max(0, Math.round(bounds.width)),
    height: Math.max(0, Math.round(bounds.height)),
    sequence: bounds.sequence,
    attachmentGeneration: bounds.attachmentGeneration,
  };
}

function zeroBounds(sequence = latestBoundsSequence + 1): Required<Omit<BrowserViewBounds, "attachmentGeneration">> & Pick<BrowserViewBounds, "attachmentGeneration"> {
  return { x: 0, y: 0, width: 0, height: 0, sequence };
}

function getCurrentAttachmentBounds(): ArchitectBrowserAttachmentStatus["bounds"] {
  const bounds = rendererBounds ?? zeroBounds(latestBoundsSequence);
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    sequence: bounds.sequence ?? latestBoundsSequence,
  };
}

function zeroArchitectBrowserSurface(attachmentGeneration?: number): boolean {
  if (isStaleAttachmentGeneration(attachmentGeneration)) {
    return true;
  }
  latestBoundsSequence += 1;
  rendererBounds = zeroBounds(latestBoundsSequence);
  if (architectView) {
    try {
      architectView.setBounds(rendererBounds);
      return true;
    } catch (error) {
      lastAttachmentError = normalizeErrorMessage(error, "Architect browser surface could not be zeroed.");
      return false;
    }
  }
  return true;
}

function detachFromWindow(): boolean {
  let detached = true;
  if (attachedWindow && architectView && isArchitectViewAttachedToWindow) {
    try {
      attachedWindow.contentView.removeChildView(architectView);
      isArchitectViewAttachedToWindow = false;
    } catch (error) {
      lastAttachmentError = normalizeErrorMessage(error, "Architect browser surface could not detach from the prior window.");
      detached = false;
    }
  }
  removeTransientWindowListeners();
  if (detached) {
    attachedWindow = null;
  }
  return detached;
}

function attachWindowLifecycle(mainWindow: BrowserWindow): void {
  if (owningWindow !== mainWindow) {
    if (owningWindow) {
      owningWindow.removeListener("closed", releaseArchitectBrowserSurface);
    }
    owningWindow = mainWindow;
    mainWindow.once("closed", releaseArchitectBrowserSurface);
  }

  if (attachedResizeWindow !== mainWindow) {
    removeTransientWindowListeners();
    attachedResizeWindow = mainWindow;
    mainWindow.on("resize", attachedWindowResizeListener);
  }
}

function removeTransientWindowListeners(): void {
  if (attachedResizeWindow) {
    attachedResizeWindow.removeListener("resize", attachedWindowResizeListener);
  }
  attachedResizeWindow = null;
}

function releaseArchitectBrowserSurface(): void {
  if (didReleaseArchitectBrowserSurface) {
    return;
  }
  didReleaseArchitectBrowserSurface = true;
  removeTransientWindowListeners();
  if (owningWindow) {
    owningWindow.removeListener("closed", releaseArchitectBrowserSurface);
  }
  authWindows.forEach((window) => closeAuthenticationWindow(window));
  authWindows = new Set<BrowserWindow>();
  if (architectView && !architectView.webContents.isDestroyed()) {
    architectView.webContents.close();
  }
  architectView = null;
  attachedWindow = null;
  owningWindow = null;
  isArchitectViewAttachedToWindow = false;
  rendererBounds = null;
  latestBoundsSequence = 0;
  currentAttachmentGeneration = 0;
  lastAttachmentError = undefined;
  currentBrowserState = "detached";
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  return message.replace(/[A-Z]:\\[^\s]+/gi, "<PROJECT_REPO>");
}

export function getArchitectBrowserNavigationDiagnosticsForTest(): ArchitectBrowserNavigationDiagnostic[] {
  return navigationDiagnostics.slice();
}

export function configureArchitectBrowserServiceForTest(options: {
  createView?: () => WebContentsView;
} = {}): void {
  createArchitectWebContentsView = options.createView ?? createArchitectWebContentsView;
}

export function resetArchitectBrowserServiceForTest(): void {
  releaseArchitectBrowserSurface();
  createArchitectWebContentsView = (): WebContentsView =>
    new WebContentsView({
      webPreferences: architectBrowserWebPreferences(),
    });
  didReleaseArchitectBrowserSurface = false;
  navigationDiagnostics = [];
}
