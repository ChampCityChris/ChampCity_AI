import type { DevelopmentEnvironmentRequirement } from "../../shared/developmentEnvironmentContracts";

export type CapabilityKind = "simple" | "composite";
export type VersionConstraintSupport = "none" | "exact" | "minimum";

export interface CapabilityProbe {
  command: string;
  args: string[];
  versionPattern?: RegExp;
}

export interface SimpleCapabilityRegistryEntry {
  kind: "simple";
  capabilityId: string;
  probe: CapabilityProbe;
  supportedVersionConstraints: VersionConstraintSupport[];
  provisionableVersionRange?: {
    minimumInclusive: string;
    maximumExclusive: string;
  };
}

export interface CompositeCapabilityRegistryEntry {
  kind: "composite";
  capabilityId: string;
  supportedProfiles: readonly string[];
  profile: "desktop-cpp";
}

export type DevelopmentEnvironmentCapabilityRegistryEntry =
  | SimpleCapabilityRegistryEntry
  | CompositeCapabilityRegistryEntry;

export const developmentEnvironmentCapabilityRegistry:
  ReadonlyMap<string, DevelopmentEnvironmentCapabilityRegistryEntry> = new Map(registryEntries());

export function resolveCapabilityRegistryEntry(
  requirement: DevelopmentEnvironmentRequirement,
): DevelopmentEnvironmentCapabilityRegistryEntry | null {
  const entry = developmentEnvironmentCapabilityRegistry.get(requirement.capabilityId) ??
    resolveVisualStudioMsvcDesktopCppAdapter(requirement);
  if (!entry) {
    return null;
  }
  if (entry.kind === "composite") {
    const requestedProfile = requirement.profile ?? entry.profile;
    return entry.supportedProfiles.includes(requestedProfile) ? entry : null;
  }
  return entry;
}

export function registrySupportsVersionConstraint(
  entry: DevelopmentEnvironmentCapabilityRegistryEntry,
  versionConstraint: string | undefined,
): boolean {
  if (!versionConstraint) {
    return true;
  }
  if (entry.kind !== "simple") {
    return false;
  }
  const trimmed = versionConstraint.trim();
  if (/^\d+(?:\.\d+){0,3}$/.test(trimmed)) {
    return entry.supportedVersionConstraints.includes("exact") &&
      versionWithinProvisionableRange(trimmed, entry);
  }
  const minimum = /^>=\s*(\d+(?:\.\d+){0,3})$/.exec(trimmed)?.[1];
  if (minimum) {
    return entry.supportedVersionConstraints.includes("minimum") &&
      versionConstraintCanBeProvisioned(minimum, entry);
  }
  return false;
}

function simple(
  capabilityId: string,
  command: string,
  args: string[],
  versionPattern: RegExp,
  provisionableVersionRange?: SimpleCapabilityRegistryEntry["provisionableVersionRange"],
): [string, SimpleCapabilityRegistryEntry] {
  return [
    capabilityId,
    {
      kind: "simple",
      capabilityId,
      probe: { command, args, versionPattern },
      supportedVersionConstraints: ["exact", "minimum"],
      provisionableVersionRange,
    },
  ];
}

function registryEntries(): Array<[string, DevelopmentEnvironmentCapabilityRegistryEntry]> {
  return [
    simple("git", "git", ["--version"], /git version\s+([^\s]+)/i),
    simple("cmake", "cmake", ["--version"], /cmake version\s+([^\s]+)/i),
    simple("ninja", "ninja", ["--version"], /(?:ninja version\s+)?([0-9][^\s]*)/i),
    simple("nodejs-lts", "node", ["--version"], /v?([0-9][^\s]*)/i),
    simple("python", "python", ["--version"], /Python\s+([^\s]+)/i, {
      minimumInclusive: "3.12",
      maximumExclusive: "3.13",
    }),
    simple("dotnet-sdk", "dotnet", ["--version"], /([0-9][^\s]*)/i, {
      minimumInclusive: "8.0",
      maximumExclusive: "9.0",
    }),
    simple("rust", "rustc", ["--version"], /rustc\s+([^\s]+)/i),
    simple("jdk", "java", ["--version"], /(?:openjdk|java)\s+([^\s]+)/i, {
      minimumInclusive: "21.0",
      maximumExclusive: "22.0",
    }),
    [
      "msvc-x64",
      {
        kind: "composite",
        capabilityId: "msvc-x64",
        profile: "desktop-cpp",
        supportedProfiles: ["desktop-cpp", "x64-cpp20"],
      },
    ],
  ];
}

function resolveVisualStudioMsvcDesktopCppAdapter(
  requirement: DevelopmentEnvironmentRequirement,
): CompositeCapabilityRegistryEntry | null {
  const semantic = `${requirement.capabilityId} ${requirement.profile ?? ""}`.toLowerCase();
  if (
    semantic.includes("visual-studio-2022") &&
    semantic.includes("msvc") &&
    semantic.includes("desktop") &&
    semantic.includes("cpp")
  ) {
    return {
      kind: "composite",
      capabilityId: requirement.capabilityId,
      profile: "desktop-cpp",
      supportedProfiles: ["desktop-cpp", "x64-cpp20"],
    };
  }
  return null;
}

function versionWithinProvisionableRange(
  version: string,
  entry: SimpleCapabilityRegistryEntry,
): boolean {
  if (!entry.provisionableVersionRange) {
    return true;
  }
  return compareVersions(version, entry.provisionableVersionRange.minimumInclusive) >= 0 &&
    compareVersions(version, entry.provisionableVersionRange.maximumExclusive) < 0;
}

function versionConstraintCanBeProvisioned(
  minimum: string,
  entry: SimpleCapabilityRegistryEntry,
): boolean {
  if (!entry.provisionableVersionRange) {
    return true;
  }
  return compareVersions(minimum, entry.provisionableVersionRange.maximumExclusive) < 0;
}

function compareVersions(left: string, right: string): number {
  const leftParts = numericVersionParts(left);
  const rightParts = numericVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }
  return 0;
}

function numericVersionParts(version: string): number[] {
  return version
    .replace(/^[^\d]*/, "")
    .split(/[^\d]+/)
    .filter(Boolean)
    .map((part) => Number(part));
}
