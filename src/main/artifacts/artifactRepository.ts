import {
  getArtifactAuthority,
  type ArtifactAuthorityQuery,
  type ArtifactRegistryEntry,
  type ArtifactSynchronizationFailure,
  type CanonicalArtifact,
} from "../../shared/artifacts";
import { ArtifactPairService } from "./artifactPairService";

export class ArtifactAuthorityError extends Error {
  constructor(
    readonly code:
      | "registry_not_initialized"
      | "authority_not_found"
      | "registry_pair_mismatch",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ArtifactAuthorityError";
  }
}

/** Registry-backed reads only; this repository never scans directories or mtimes. */
export class ArtifactRepository {
  constructor(private readonly artifactPairs: ArtifactPairService) {}

  async listEntries(): Promise<ArtifactRegistryEntry[]> {
    const registry = await this.artifactPairs.loadRegistry();
    if (!registry) return [];
    return registry.entries.map(cloneEntry);
  }

  async getAuthority(
    query: string | ArtifactAuthorityQuery,
  ): Promise<ArtifactRegistryEntry> {
    const registry = await this.artifactPairs.loadRegistry();
    if (!registry) {
      throw new ArtifactAuthorityError(
        "registry_not_initialized",
        "The canonical artifact registry is not initialized.",
      );
    }
    try {
      return cloneEntry(getArtifactAuthority(registry, query));
    } catch (error) {
      throw new ArtifactAuthorityError(
        "authority_not_found",
        "No canonical active authority matches the requested artifact identity.",
        { cause: error },
      );
    }
  }

  async readAuthority(
    query: string | ArtifactAuthorityQuery,
  ): Promise<CanonicalArtifact> {
    const entry = await this.getAuthority(query);
    const pair = await this.artifactPairs.readArtifactByPaths(
      entry.jsonPath,
      entry.markdownPath,
    );
    assertRegistryEntryMatchesArtifact(entry, pair.artifact);
    return pair.artifact;
  }

  async auditRegisteredPairs(detectedAt: string): Promise<ArtifactSynchronizationFailure[]> {
    const registry = await this.artifactPairs.loadRegistry();
    if (!registry) return [];
    const failures: ArtifactSynchronizationFailure[] = [];
    for (const entry of registry.entries) {
      try {
        const pair = await this.artifactPairs.readArtifactByPaths(
          entry.jsonPath,
          entry.markdownPath,
        );
        assertRegistryEntryMatchesArtifact(entry, pair.artifact);
      } catch (error) {
        failures.push({
          artifactId: entry.artifactId,
          code: "registered_pair_unsynchronized",
          message: error instanceof Error ? error.message : String(error),
          jsonPath: entry.jsonPath,
          markdownPath: entry.markdownPath,
          detectedAt: new Date(detectedAt).toISOString(),
        });
      }
    }
    return failures;
  }
}

export function assertRegistryEntryMatchesArtifact(
  entry: ArtifactRegistryEntry,
  artifact: CanonicalArtifact,
): void {
  if (
    entry.artifactId !== artifact.artifactId ||
    entry.artifactType !== artifact.artifactType ||
    entry.projectId !== artifact.projectId ||
    entry.revision !== artifact.revision ||
    entry.status !== artifact.status ||
    entry.payloadHash !== artifact.payloadHash ||
    entry.jsonPath !== artifact.jsonPath ||
    entry.markdownPath !== artifact.markdownPath
  ) {
    throw new ArtifactAuthorityError(
      "registry_pair_mismatch",
      `Registry authority for ${entry.artifactId} does not match its canonical pair.`,
    );
  }
}

function cloneEntry(entry: ArtifactRegistryEntry): ArtifactRegistryEntry {
  return {
    ...entry,
    relationships: {
      sources: [...entry.relationships.sources],
      expectedOutputs: [...entry.relationships.expectedOutputs],
      supersedes: [...entry.relationships.supersedes],
      children: [...entry.relationships.children],
    },
  };
}
