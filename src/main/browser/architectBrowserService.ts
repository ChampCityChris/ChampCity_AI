import type { BrowserWindowConstructorOptions } from "electron";
import type {
  ArchitectBrowserFoundationStatus,
  ArchitectBrowserLoadState,
} from "../../shared/workspaceContracts";
import { buildArchitectHandoffManifest } from "../integrations/architectMcpHandoffService";

export const architectSessionPartition = "persist:champcity-architect" as const;
const defaultArchitectSurfaceUrl = "https://chatgpt.com/";

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
    return "browser-unavailable";
  }
  return "sign-in-required";
}

export function getArchitectBrowserFoundationStatus(
  workspaceRoot: string,
): ArchitectBrowserFoundationStatus {
  return {
    surfaceUrl: getArchitectSurfaceUrl(),
    sessionPartition: architectSessionPartition,
    browserState: inferArchitectBrowserLoadState(false, getArchitectSurfaceUrl()),
    handoff: buildArchitectHandoffManifest(workspaceRoot),
    security: architectBrowserSecuritySummary(),
  };
}
