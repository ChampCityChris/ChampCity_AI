export const architectAuthenticationProviderHosts = [
  "accounts.google.com",
] as const;

export type ArchitectBrowserNavigationClassification =
  | "architect-app"
  | "authentication-provider"
  | "external"
  | "invalid";

export function classifyArchitectBrowserNavigation(
  value: string,
): ArchitectBrowserNavigationClassification {
  const url = parseHttpsUrl(value);
  if (!url) {
    return "invalid";
  }

  if (isOpenAiOwnedHost(url.hostname)) {
    return "architect-app";
  }

  if (isArchitectAuthenticationProviderHost(url.hostname)) {
    return "authentication-provider";
  }

  return "external";
}

export function isAllowedArchitectSurfaceUrl(value: string): boolean {
  const url = parseHttpsUrl(value);
  return Boolean(url && isChatGptHost(url.hostname));
}

export function isAllowedEmbeddedArchitectNavigationUrl(value: string): boolean {
  const classification = classifyArchitectBrowserNavigation(value);
  return classification === "architect-app" || classification === "authentication-provider";
}

export function isArchitectApplicationUrl(value: string): boolean {
  return classifyArchitectBrowserNavigation(value) === "architect-app";
}

export function redactedHostFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isChatGptHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "chatgpt.com" || host.endsWith(".chatgpt.com") || host === "chat.openai.com";
}

export function isOpenAiOwnedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "openai.com" ||
    host.endsWith(".openai.com") ||
    host === "chatgpt.com" ||
    host.endsWith(".chatgpt.com");
}

function isArchitectAuthenticationProviderHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return architectAuthenticationProviderHosts.includes(
    host as (typeof architectAuthenticationProviderHosts)[number],
  );
}

function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
