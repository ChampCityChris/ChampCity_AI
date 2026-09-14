import fs from "node:fs";
import path from "node:path";

export const champCityInstalledScopeFileName = "champcity-install-scope.json";
export const champCityInstalledScopeSchemaVersion = 1 as const;

export type ChampCityInstallScope = "current-user" | "all-users";
export type ChampCityStartupRegistrationScope = "user" | "machine";

export interface ChampCityInstalledScopeMetadata {
  schemaVersion: typeof champCityInstalledScopeSchemaVersion;
  installScope: ChampCityInstallScope;
  backgroundAgentLaunchAtLoginDefault: boolean;
}

export const defaultChampCityInstalledScopeMetadata: Readonly<ChampCityInstalledScopeMetadata> =
  Object.freeze({
    schemaVersion: champCityInstalledScopeSchemaVersion,
    installScope: "current-user",
    backgroundAgentLaunchAtLoginDefault: true,
  });

export class ChampCityInstalledScopeMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChampCityInstalledScopeMetadataError";
  }
}

export function getChampCityInstalledScopeMetadataPath(resourcesRoot: string): string {
  return path.join(resourcesRoot, champCityInstalledScopeFileName);
}

export function readChampCityInstalledScopeMetadata(
  resourcesRoot: string | undefined = process.resourcesPath,
): ChampCityInstalledScopeMetadata {
  if (!resourcesRoot) {
    return { ...defaultChampCityInstalledScopeMetadata };
  }
  const targetPath = getChampCityInstalledScopeMetadataPath(resourcesRoot);
  let source: string;
  try {
    source = fs.readFileSync(targetPath, "utf8");
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return { ...defaultChampCityInstalledScopeMetadata };
    }
    throw new ChampCityInstalledScopeMetadataError(
      "ChampCity installed-scope metadata could not be read safely.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new ChampCityInstalledScopeMetadataError(
      "ChampCity installed-scope metadata is malformed JSON.",
    );
  }
  if (!isExactInstalledScopeMetadata(parsed)) {
    throw new ChampCityInstalledScopeMetadataError(
      "ChampCity installed-scope metadata has an unsupported or invalid schema.",
    );
  }
  return { ...parsed };
}

export function startupRegistrationScopeForInstallScope(
  installScope: ChampCityInstallScope,
): ChampCityStartupRegistrationScope {
  return installScope === "all-users" ? "machine" : "user";
}

function isExactInstalledScopeMetadata(value: unknown): value is ChampCityInstalledScopeMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return keys.length === 3 &&
    keys[0] === "backgroundAgentLaunchAtLoginDefault" &&
    keys[1] === "installScope" &&
    keys[2] === "schemaVersion" &&
    record.schemaVersion === champCityInstalledScopeSchemaVersion &&
    (record.installScope === "current-user" || record.installScope === "all-users") &&
    typeof record.backgroundAgentLaunchAtLoginDefault === "boolean";
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === expectedCode);
}
