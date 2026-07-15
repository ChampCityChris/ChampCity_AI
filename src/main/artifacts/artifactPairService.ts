import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  assertArtifactRegistry,
  buildArtifactRegistry,
  buildArtifactRegistryEntry,
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  isAuthorityEligibleStatus,
  renderArtifactMarkdown,
  verifyArtifactPair,
  type ArtifactPairVerificationResult,
  type ArtifactPayload,
  type ArtifactRegistry,
  type ArtifactRelationships,
  type CanonicalArtifact,
  type JsonValue,
} from "../../shared/artifacts";
import {
  ARTIFACT_REGISTRY_ARTIFACT_ID,
  ARTIFACT_REGISTRY_ARTIFACT_TYPE,
  ARTIFACT_REGISTRY_DIRECTORY,
  ARTIFACT_REGISTRY_FILE_STEM,
  ARTIFACT_REGISTRY_JSON_PATH,
  ARTIFACT_REGISTRY_MARKDOWN_PATH,
  ArtifactPairServiceError,
  type ArtifactPairServiceFailureContext,
  type ArtifactPairServiceFailurePoint,
  type ArtifactPairServiceOptions,
  type CanonicalArtifactBatchCommitResult,
  type CanonicalArtifactCommitRequest,
  type CanonicalArtifactCommitResult,
  type CanonicalArtifactLocation,
  type CanonicalArtifactReadResult,
} from "./artifactPairContracts";
import {
  ArtifactPartialWriteError,
  FilePairTransaction,
  type PairCommitHandle,
  type PairFailurePoint,
} from "./filePairTransaction";

interface RegistryReadResult {
  registry: ArtifactRegistry;
  artifact: CanonicalArtifact;
  verification: ArtifactPairVerificationResult;
}

interface PendingRegistryCommit extends RegistryReadResult {
  handle: PairCommitHandle;
}

interface PendingPairWrite<TPayload extends ArtifactPayload> {
  handle: PairCommitHandle;
  verification: ArtifactPairVerificationResult<TPayload> & {
    valid: true;
    synchronized: true;
  };
}

interface PreparedBatchArtifact {
  artifact: CanonicalArtifact;
  paths: { jsonPath: string; markdownPath: string };
}

/**
 * Root-injectable canonical writer. Registry persistence uses an explicit
 * internal path so the registry can be a canonical pair without recursively
 * registering itself in its own payload hash.
 */
export class ArtifactPairService {
  readonly projectRoot: string;
  private readonly clock: () => string;
  private readonly transactionIdFactory?: () => string;
  private readonly failureInjector?: ArtifactPairServiceOptions["failureInjector"];
  private commitTail: Promise<void> = Promise.resolve();

  constructor(options: ArtifactPairServiceOptions) {
    if (!path.isAbsolute(options.projectRoot)) {
      throw new TypeError("ArtifactPairService requires an absolute project root.");
    }
    this.projectRoot = path.resolve(options.projectRoot);
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.transactionIdFactory = options.transactionIdFactory;
    this.failureInjector = options.failureInjector;
  }

  async commitArtifact<
    TArtifactType extends string,
    TData extends JsonValue,
  >(
    request: CanonicalArtifactCommitRequest<TArtifactType, TData>,
  ): Promise<CanonicalArtifactCommitResult<ArtifactPayload<TArtifactType, TData>>> {
    const release = await this.acquireCommitLock();
    try {
      return await this.commitArtifactInternal(request);
    } finally {
      release();
    }
  }

  /**
   * Commit a heterogeneous artifact set and one registry revision as a single
   * transaction. All targets are preflighted before the first staged write.
   */
  async commitArtifactsBatch(
    requests: readonly CanonicalArtifactCommitRequest<string, JsonValue>[],
  ): Promise<CanonicalArtifactBatchCommitResult> {
    const release = await this.acquireCommitLock();
    try {
      return await this.commitArtifactsBatchInternal(requests);
    } finally {
      release();
    }
  }

  private async commitArtifactsBatchInternal(
    requests: readonly CanonicalArtifactCommitRequest<string, JsonValue>[],
  ): Promise<CanonicalArtifactBatchCommitResult> {
    if (requests.length === 0) {
      throw new TypeError("Canonical artifact batch must contain at least one request.");
    }
    const timestamp = canonicalTimestamp(this.clock());
    const registrySnapshot = await this.tryReadRegistry();
    const projectId = requests[0].projectId;
    if (
      registrySnapshot &&
      registrySnapshot.artifact.projectId !== projectId
    ) {
      throw new ArtifactPairServiceError(
        "registry_project_mismatch",
        `Registry project ${registrySnapshot.artifact.projectId} cannot accept ${projectId}.`,
      );
    }

    const artifactIds = new Set<string>();
    const pairStems = new Set<string>();
    const prepared: PreparedBatchArtifact[] = [];
    for (const request of requests) {
      if (request.projectId !== projectId) {
        throw new ArtifactPairServiceError(
          "registry_project_mismatch",
          "Every artifact in one batch must belong to the same project.",
        );
      }
      if (artifactIds.has(request.artifactId)) {
        throw new ArtifactPairServiceError(
          "identity_mismatch",
          `Batch contains duplicate artifact ID ${request.artifactId}.`,
        );
      }
      artifactIds.add(request.artifactId);

      const paths = buildCanonicalPaths(request.location);
      const pairStem = paths.jsonPath.slice(0, -".json".length);
      if (pairStems.has(pairStem)) {
        throw new ArtifactPairServiceError(
          "identity_mismatch",
          `Batch contains duplicate canonical pair path ${pairStem}.`,
        );
      }
      pairStems.add(pairStem);
      this.assertNotRegistryIdentity(request.artifactId, request.artifactType, paths);

      const existing = await this.tryReadPair(paths.jsonPath, paths.markdownPath);
      assertRegistryPreflight(registrySnapshot, request, paths, existing);
      assertExpectedRevision(request.expectedRevision, existing?.artifact.revision ?? null);
      if (existing) assertSameIdentity(existing.artifact, request);
      prepared.push({
        paths,
        artifact: buildArtifactFromRequest(request, paths, existing?.artifact ?? null, timestamp),
      });
    }

    const artifactWrites: Array<{
      prepared: PreparedBatchArtifact;
      write: PendingPairWrite<ArtifactPayload>;
    }> = [];
    let registryWrite: PendingRegistryCommit | undefined;
    const batchIdentity = prepared.map((item) => item.artifact.artifactId).join("|");
    try {
      for (const item of prepared) {
        await this.inject(
          "before_artifact_write",
          "artifact",
          item.artifact.artifactId,
          item.paths,
        );
        const write = await this.writeCanonicalPair(item.artifact, "artifact");
        artifactWrites.push({ prepared: item, write });
        await this.inject(
          "after_artifact_write",
          "artifact",
          item.artifact.artifactId,
          item.paths,
          write.handle.transactionId,
        );
      }

      await this.inject("before_registry_update", "registry", batchIdentity, {
        jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
        markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
      });
      registryWrite = await this.updateRegistryBatchInternal(
        prepared.map((item) => item.artifact),
        timestamp,
        registrySnapshot,
      );
      await this.inject(
        "after_registry_update",
        "registry",
        batchIdentity,
        {
          jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
          markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
        },
        registryWrite.handle.transactionId,
      );

      await registryWrite.handle.finalize();
      for (const { write } of artifactWrites) await write.handle.finalize();
      const commits: CanonicalArtifactCommitResult[] = artifactWrites.map(
        ({ prepared: item, write }) => ({
          artifact: item.artifact,
          verification: write.verification,
          registry: registryWrite!.registry,
          registryRevision: registryWrite!.artifact.revision,
          pairVerified: true,
          registryCommitted: true,
          payloadHash: item.artifact.payloadHash,
          transactionId: write.handle.transactionId,
        }),
      );
      return {
        commits,
        registry: registryWrite.registry,
        registryRevision: registryWrite.artifact.revision,
        pairVerified: true,
        registryCommitted: true,
        transactionIds: [
          ...artifactWrites.map(({ write }) => write.handle.transactionId),
          registryWrite.handle.transactionId,
        ],
      };
    } catch (error) {
      const rollback = await rollbackBatchWrites(
        registryWrite?.handle,
        artifactWrites.map(({ write }) => write.handle),
      );
      if (artifactWrites.length > 0 || registryWrite) {
        throw new ArtifactPartialWriteError(
          `Canonical artifact batch and registry transaction failed: ${errorMessage(error)}`,
          artifactWrites[0]?.write.handle.transactionId ??
            registryWrite?.handle.transactionId ??
            "unknown",
          prepared[0].paths.jsonPath,
          prepared[0].paths.markdownPath,
          rollback,
          { cause: error },
        );
      }
      throw error;
    }
  }

  private async commitArtifactInternal<
    TArtifactType extends string,
    TData extends JsonValue,
  >(
    request: CanonicalArtifactCommitRequest<TArtifactType, TData>,
  ): Promise<CanonicalArtifactCommitResult<ArtifactPayload<TArtifactType, TData>>> {
    const paths = buildCanonicalPaths(request.location);
    this.assertNotRegistryIdentity(request.artifactId, request.artifactType, paths);
    const existing = await this.tryReadPair<ArtifactPayload<TArtifactType, TData>>(
      paths.jsonPath,
      paths.markdownPath,
    );
    const preflightRegistry = await this.tryReadRegistry();
    if (preflightRegistry && preflightRegistry.artifact.projectId !== request.projectId) {
      throw new ArtifactPairServiceError(
        "registry_project_mismatch",
        `Registry project ${preflightRegistry.artifact.projectId} cannot accept ${request.projectId}.`,
      );
    }
    const registered = preflightRegistry?.registry.entries.find(
      (entry) => entry.artifactId === request.artifactId,
    );
    if (
      registered &&
      (registered.artifactType !== request.artifactType ||
        registered.projectId !== request.projectId)
    ) {
      throw new ArtifactPairServiceError(
        "identity_mismatch",
        "A registered artifact ID cannot be reassigned to another type or project.",
      );
    }
    if (
      registered &&
      (registered.jsonPath !== paths.jsonPath || registered.markdownPath !== paths.markdownPath)
    ) {
      throw new ArtifactPairServiceError(
        "identity_mismatch",
        "A registered logical artifact must retain its fixed canonical filenames.",
      );
    }
    if (registered && !registered.synchronized) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "The registry marks the target artifact pair as unsynchronized.",
      );
    }
    if (registered && !existing) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "The registry identifies an artifact pair that is missing from its fixed paths.",
      );
    }
    if (existing && !registered && preflightRegistry) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "An unregistered canonical pair already occupies the requested fixed paths.",
      );
    }
    if (existing && !preflightRegistry) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "A canonical pair exists without the required registry authority.",
      );
    }
    if (
      registered &&
      existing &&
      (registered.revision !== existing.artifact.revision ||
        registered.payloadHash !== existing.artifact.payloadHash)
    ) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "The registered revision does not match the canonical pair on disk.",
      );
    }
    assertExpectedRevision(request.expectedRevision, existing?.artifact.revision ?? null);
    if (existing) assertSameIdentity(existing.artifact, request);

    const timestamp = canonicalTimestamp(this.clock());
    const artifact = buildCanonicalArtifact<ArtifactPayload<TArtifactType, TData>>({
      artifactId: request.artifactId,
      artifactType: request.artifactType,
      revision: (existing?.artifact.revision ?? 0) + 1,
      status: request.status,
      projectId: request.projectId,
      ...(request.phaseId === undefined ? {} : { phaseId: request.phaseId }),
      ...(request.workCardId === undefined ? {} : { workCardId: request.workCardId }),
      ...(request.parentArtifactId === undefined
        ? {}
        : { parentArtifactId: request.parentArtifactId }),
      createdAt: existing?.artifact.createdAt ?? timestamp,
      updatedAt: timestamp,
      markdownPath: paths.markdownPath,
      jsonPath: paths.jsonPath,
      relationships: normalizeRelationships(request.relationships),
      payload: {
        kind: request.artifactType,
        title: request.payload.title,
        contentMarkdown: request.payload.contentMarkdown,
        data: request.payload.data,
      },
    });

    let artifactWrite: PendingPairWrite<ArtifactPayload<TArtifactType, TData>> | undefined;
    let registryWrite: PendingRegistryCommit | undefined;
    try {
      await this.inject("before_artifact_write", "artifact", artifact.artifactId, paths);
      artifactWrite = await this.writeCanonicalPair(artifact, "artifact");
      await this.inject(
        "after_artifact_write",
        "artifact",
        artifact.artifactId,
        paths,
        artifactWrite.handle.transactionId,
      );

      await this.inject("before_registry_update", "registry", artifact.artifactId, {
        jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
        markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
      });
      registryWrite = await this.updateRegistryInternal(artifact, timestamp);
      await this.inject(
        "after_registry_update",
        "registry",
        artifact.artifactId,
        {
          jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
          markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
        },
        registryWrite.handle.transactionId,
      );

      await registryWrite.handle.finalize();
      await artifactWrite.handle.finalize();
      return {
        artifact,
        verification: artifactWrite.verification,
        registry: registryWrite.registry,
        registryRevision: registryWrite.artifact.revision,
        pairVerified: true,
        registryCommitted: true,
        payloadHash: artifact.payloadHash,
        transactionId: artifactWrite.handle.transactionId,
      };
    } catch (error) {
      const rollback = await rollbackPendingWrites(registryWrite?.handle, artifactWrite?.handle);
      if (artifactWrite || registryWrite) {
        throw new ArtifactPartialWriteError(
          `Canonical artifact and registry transaction failed: ${errorMessage(error)}`,
          artifactWrite?.handle.transactionId ?? registryWrite?.handle.transactionId ?? "unknown",
          paths.jsonPath,
          paths.markdownPath,
          rollback,
          { cause: error },
        );
      }
      throw error;
    }
  }

  async readArtifact<TPayload extends ArtifactPayload = ArtifactPayload>(
    location: CanonicalArtifactLocation,
  ): Promise<CanonicalArtifactReadResult<TPayload>> {
    const paths = buildCanonicalPaths(location);
    return this.readPair<TPayload>(paths.jsonPath, paths.markdownPath);
  }

  async readArtifactByPaths<TPayload extends ArtifactPayload = ArtifactPayload>(
    jsonPath: string,
    markdownPath: string,
  ): Promise<CanonicalArtifactReadResult<TPayload>> {
    assertExactPairPaths(jsonPath, markdownPath);
    return this.readPair<TPayload>(jsonPath, markdownPath);
  }

  async loadRegistry(): Promise<ArtifactRegistry | null> {
    return (await this.tryReadRegistry())?.registry ?? null;
  }

  private async updateRegistryInternal(
    artifact: CanonicalArtifact,
    timestamp: string,
  ): Promise<PendingRegistryCommit> {
    const current = await this.tryReadRegistry();
    return this.updateRegistryBatchInternal([artifact], timestamp, current);
  }

  private async updateRegistryBatchInternal(
    artifacts: readonly CanonicalArtifact[],
    timestamp: string,
    current: RegistryReadResult | null,
  ): Promise<PendingRegistryCommit> {
    const projectId = artifacts[0]?.projectId;
    if (!projectId) throw new TypeError("Registry update requires at least one artifact.");
    if (current && current.artifact.projectId !== projectId) {
      throw new ArtifactPairServiceError(
        "registry_project_mismatch",
        `Registry project ${current.artifact.projectId} cannot accept ${projectId}.`,
      );
    }
    if (artifacts.some((artifact) => artifact.projectId !== projectId)) {
      throw new ArtifactPairServiceError(
        "registry_project_mismatch",
        "Every artifact in one registry update must belong to the same project.",
      );
    }

    const replacingIds = new Set(artifacts.map((artifact) => artifact.artifactId));
    const entries = (current?.registry.entries ?? [])
      .filter((entry) => !replacingIds.has(entry.artifactId))
      .map(cloneRegistryEntry);
    for (const artifact of artifacts) {
      entries.push(
        buildArtifactRegistryEntry(artifact, isAuthorityEligibleStatus(artifact.status)),
      );
    }
    entries.sort(compareRegistryEntries);

    const registry = buildArtifactRegistry({
      updatedAt: timestamp,
      entries,
    });
    assertArtifactRegistry(registry);

    const registryArtifact = buildCanonicalArtifact({
      artifactId: ARTIFACT_REGISTRY_ARTIFACT_ID,
      artifactType: ARTIFACT_REGISTRY_ARTIFACT_TYPE,
      revision: (current?.artifact.revision ?? 0) + 1,
      status: "active",
      projectId,
      createdAt: current?.artifact.createdAt ?? timestamp,
      updatedAt: timestamp,
      markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
      jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
      relationships: {
        sources: registry.entries.map((entry) => entry.artifactId),
        expectedOutputs: [],
        supersedes: [],
        children: [],
      },
      payload: {
        kind: ARTIFACT_REGISTRY_ARTIFACT_TYPE,
        title: "Canonical Artifact Registry",
        contentMarkdown: renderRegistryMarkdown(registry),
        data: registry as unknown as JsonValue,
      },
    });
    const write = await this.writeCanonicalPair(registryArtifact, "registry");
    return {
      registry,
      artifact: registryArtifact,
      verification: write.verification,
      handle: write.handle,
    };
  }

  private async tryReadRegistry(): Promise<RegistryReadResult | null> {
    const pair = await this.tryReadPair(
      ARTIFACT_REGISTRY_JSON_PATH,
      ARTIFACT_REGISTRY_MARKDOWN_PATH,
    );
    if (!pair) return null;
    if (
      pair.artifact.artifactId !== ARTIFACT_REGISTRY_ARTIFACT_ID ||
      pair.artifact.artifactType !== ARTIFACT_REGISTRY_ARTIFACT_TYPE
    ) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "The fixed registry pair contains a non-registry artifact.",
      );
    }
    assertArtifactRegistry(pair.artifact.payload.data);
    return {
      registry: pair.artifact.payload.data,
      artifact: pair.artifact,
      verification: pair.verification,
    };
  }

  private async writeCanonicalPair<TPayload extends ArtifactPayload>(
    artifact: CanonicalArtifact<TPayload>,
    operation: "artifact" | "registry",
  ): Promise<PendingPairWrite<TPayload>> {
    const jsonContent = `${canonicalPrettyStringify(artifact)}\n`;
    const markdownContent = renderArtifactMarkdown(artifact);
    const transaction = new FilePairTransaction({
      projectRoot: this.projectRoot,
      transactionIdFactory: this.transactionIdFactory,
      failureInjector: async (point, context) => {
        if (point === "before_finalize") return;
        await this.inject(
          point,
          operation,
          artifact.artifactId,
          { jsonPath: artifact.jsonPath, markdownPath: artifact.markdownPath },
          context.transactionId,
        );
      },
    });
    const handle = await transaction.writeVerifiedPair({
      jsonPath: artifact.jsonPath,
      markdownPath: artifact.markdownPath,
      jsonContent,
      markdownContent,
      verify: (json, markdown) => {
        const verification = verifyArtifactPair<TPayload>({
          jsonArtifact: json,
          markdown,
          jsonPath: artifact.jsonPath,
          markdownPath: artifact.markdownPath,
        });
        if (!verification.valid || !verification.synchronized) {
          throw new Error(`Artifact pair verification failed: ${verification.errors.join(" ")}`);
        }
      },
    });
    const verification = verifyArtifactPair<TPayload>({
      jsonArtifact: jsonContent,
      markdown: markdownContent,
      jsonPath: artifact.jsonPath,
      markdownPath: artifact.markdownPath,
    });
    if (!verification.valid || !verification.synchronized || !verification.artifact) {
      await handle.rollback();
      throw new Error(`Artifact pair verification failed: ${verification.errors.join(" ")}`);
    }
    return {
      handle,
      verification: verification as PendingPairWrite<TPayload>["verification"],
    };
  }

  private async readPair<TPayload extends ArtifactPayload>(
    jsonPath: string,
    markdownPath: string,
  ): Promise<CanonicalArtifactReadResult<TPayload>> {
    const result = await this.tryReadPair<TPayload>(jsonPath, markdownPath);
    if (!result) {
      throw new ArtifactPairServiceError(
        "not_found",
        `Canonical artifact pair does not exist at ${jsonPath} and ${markdownPath}.`,
      );
    }
    return result;
  }

  private async tryReadPair<TPayload extends ArtifactPayload = ArtifactPayload>(
    jsonPath: string,
    markdownPath: string,
  ): Promise<CanonicalArtifactReadResult<TPayload> | null> {
    assertExactPairPaths(jsonPath, markdownPath);
    const transaction = new FilePairTransaction({ projectRoot: this.projectRoot });
    const jsonAbsolute = transaction.resolveInsideRoot(jsonPath);
    const markdownAbsolute = transaction.resolveInsideRoot(markdownPath);
    const [jsonExists, markdownExists] = await Promise.all([
      fileExists(jsonAbsolute),
      fileExists(markdownAbsolute),
    ]);
    if (!jsonExists && !markdownExists) return null;
    if (jsonExists !== markdownExists) {
      throw new ArtifactPartialWriteError(
        "Canonical artifact pair is incomplete.",
        "read",
        jsonPath,
        markdownPath,
        "not_required",
      );
    }

    const [jsonContent, markdownContent] = await Promise.all([
      readFile(jsonAbsolute, "utf8"),
      readFile(markdownAbsolute, "utf8"),
    ]);
    const verification = verifyArtifactPair<TPayload>({
      jsonArtifact: jsonContent,
      markdown: markdownContent,
      jsonPath,
      markdownPath,
    });
    if (!verification.valid || !verification.synchronized || !verification.artifact) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        `Canonical artifact pair is unsynchronized: ${verification.errors.join(" ")}`,
      );
    }
    return {
      artifact: verification.artifact,
      verification: verification as CanonicalArtifactReadResult<TPayload>["verification"],
      jsonContent,
      markdownContent,
    };
  }

  private assertNotRegistryIdentity(
    artifactId: string,
    artifactType: string,
    paths: { jsonPath: string; markdownPath: string },
  ): void {
    if (
      artifactId === ARTIFACT_REGISTRY_ARTIFACT_ID ||
      artifactType === ARTIFACT_REGISTRY_ARTIFACT_TYPE ||
      paths.jsonPath === ARTIFACT_REGISTRY_JSON_PATH ||
      paths.markdownPath === ARTIFACT_REGISTRY_MARKDOWN_PATH
    ) {
      throw new ArtifactPairServiceError(
        "reserved_registry_identity",
        "The registry pair is written only through the internal bootstrap/update boundary.",
      );
    }
  }

  private async inject(
    point: ArtifactPairServiceFailurePoint,
    operation: "artifact" | "registry",
    artifactId: string,
    paths: { jsonPath: string; markdownPath: string },
    transactionId?: string,
  ): Promise<void> {
    const context: ArtifactPairServiceFailureContext = {
      point,
      operation,
      artifactId,
      jsonPath: paths.jsonPath,
      markdownPath: paths.markdownPath,
      ...(transactionId === undefined ? {} : { transactionId }),
    };
    await this.failureInjector?.(point, context);
  }

  private async acquireCommitLock(): Promise<() => void> {
    const prior = this.commitTail;
    let release!: () => void;
    this.commitTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prior;
    return release;
  }
}

export function buildCanonicalPaths(location: CanonicalArtifactLocation): {
  jsonPath: string;
  markdownPath: string;
} {
  const directoryPath = normalizeDirectory(location.directoryPath);
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(location.fileStem) ||
    /_\d+$/.test(location.fileStem)
  ) {
    throw new ArtifactPairServiceError(
      "invalid_location",
      "Canonical fileStem must be fixed, safe, and cannot use a numbered revision suffix.",
    );
  }
  return {
    jsonPath: `${directoryPath}/${location.fileStem}.json`,
    markdownPath: `${directoryPath}/${location.fileStem}.md`,
  };
}

export function locationFromPairPaths(
  jsonPath: string,
  markdownPath: string,
): CanonicalArtifactLocation {
  assertExactPairPaths(jsonPath, markdownPath);
  const stemPath = jsonPath.slice(0, -".json".length);
  return {
    directoryPath: path.posix.dirname(stemPath),
    fileStem: path.posix.basename(stemPath),
  };
}

function assertExactPairPaths(jsonPath: string, markdownPath: string): void {
  const location = locationFromRawPairPaths(jsonPath, markdownPath);
  const rebuilt = buildCanonicalPaths(location);
  if (rebuilt.jsonPath !== jsonPath || rebuilt.markdownPath !== markdownPath) {
    throw new ArtifactPairServiceError(
      "invalid_location",
      "Canonical pair paths must be normalized and share one exact fixed stem.",
    );
  }
}

function locationFromRawPairPaths(
  jsonPath: string,
  markdownPath: string,
): CanonicalArtifactLocation {
  if (!jsonPath.endsWith(".json") || !markdownPath.endsWith(".md")) {
    throw new ArtifactPairServiceError("invalid_location", "Canonical pair extensions are invalid.");
  }
  const jsonStem = jsonPath.slice(0, -".json".length);
  const markdownStem = markdownPath.slice(0, -".md".length);
  if (jsonStem !== markdownStem) {
    throw new ArtifactPairServiceError("invalid_location", "Canonical pair stems do not match.");
  }
  return { directoryPath: path.posix.dirname(jsonStem), fileStem: path.posix.basename(jsonStem) };
}

function normalizeDirectory(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new ArtifactPairServiceError(
      "invalid_location",
      "Canonical artifact directory must be a normalized repository-relative path.",
    );
  }
  return normalized;
}

function assertExpectedRevision(expected: number | null | undefined, actual: number | null): void {
  if (expected === undefined) return;
  if (expected !== actual) {
    throw new ArtifactPairServiceError(
      "stale_revision",
      `Expected artifact revision ${String(expected)}, found ${String(actual)}.`,
    );
  }
}

function assertSameIdentity(
  existing: CanonicalArtifact,
  request: CanonicalArtifactCommitRequest,
): void {
  if (
    existing.artifactId !== request.artifactId ||
    existing.artifactType !== request.artifactType ||
    existing.projectId !== request.projectId
  ) {
    throw new ArtifactPairServiceError(
      "identity_mismatch",
      "A fixed canonical path cannot be reassigned to a different artifact identity.",
    );
  }
}

function assertRegistryPreflight(
  registry: RegistryReadResult | null,
  request: CanonicalArtifactCommitRequest,
  paths: { jsonPath: string; markdownPath: string },
  existing: CanonicalArtifactReadResult | null,
): void {
  if (registry && registry.artifact.projectId !== request.projectId) {
    throw new ArtifactPairServiceError(
      "registry_project_mismatch",
      `Registry project ${registry.artifact.projectId} cannot accept ${request.projectId}.`,
    );
  }
  const registered = registry?.registry.entries.find(
    (entry) => entry.artifactId === request.artifactId,
  );
  if (
    registered &&
    (registered.artifactType !== request.artifactType ||
      registered.projectId !== request.projectId)
  ) {
    throw new ArtifactPairServiceError(
      "identity_mismatch",
      "A registered artifact ID cannot be reassigned to another type or project.",
    );
  }
  if (
    registered &&
    (registered.jsonPath !== paths.jsonPath ||
      registered.markdownPath !== paths.markdownPath)
  ) {
    throw new ArtifactPairServiceError(
      "identity_mismatch",
      "A registered artifact must retain its fixed canonical filenames.",
    );
  }
  if (registered && !registered.synchronized) {
    throw new ArtifactPairServiceError(
      "registry_sync_failure",
      "The registry marks the target artifact pair as unsynchronized.",
    );
  }
  if (registered && !existing) {
    throw new ArtifactPairServiceError(
      "registry_sync_failure",
      "The registry identifies an artifact pair missing from its fixed paths.",
    );
  }
  if (existing && !registered && registry) {
    throw new ArtifactPairServiceError(
      "registry_sync_failure",
      "An unregistered canonical pair already occupies the requested paths.",
    );
  }
  if (existing && !registry) {
    throw new ArtifactPairServiceError(
      "registry_sync_failure",
      "A canonical pair exists without required registry authority.",
    );
  }
  if (
    registered &&
    existing &&
    (registered.revision !== existing.artifact.revision ||
      registered.payloadHash !== existing.artifact.payloadHash)
  ) {
    throw new ArtifactPairServiceError(
      "registry_sync_failure",
      "The registered revision does not match the canonical pair on disk.",
    );
  }
}

function buildArtifactFromRequest(
  request: CanonicalArtifactCommitRequest,
  paths: { jsonPath: string; markdownPath: string },
  existing: CanonicalArtifact | null,
  timestamp: string,
): CanonicalArtifact {
  return buildCanonicalArtifact({
    artifactId: request.artifactId,
    artifactType: request.artifactType,
    revision: (existing?.revision ?? 0) + 1,
    status: request.status,
    projectId: request.projectId,
    ...(request.phaseId === undefined ? {} : { phaseId: request.phaseId }),
    ...(request.workCardId === undefined ? {} : { workCardId: request.workCardId }),
    ...(request.parentArtifactId === undefined
      ? {}
      : { parentArtifactId: request.parentArtifactId }),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    markdownPath: paths.markdownPath,
    jsonPath: paths.jsonPath,
    relationships: normalizeRelationships(request.relationships),
    payload: {
      kind: request.artifactType,
      title: request.payload.title,
      contentMarkdown: request.payload.contentMarkdown,
      data: request.payload.data,
    },
  });
}

function normalizeRelationships(
  relationships: Partial<ArtifactRelationships> | undefined,
): ArtifactRelationships {
  return {
    sources: uniqueStable(relationships?.sources),
    expectedOutputs: uniqueStable(relationships?.expectedOutputs),
    supersedes: uniqueStable(relationships?.supersedes),
    children: uniqueStable(relationships?.children),
  };
}

function emptyRelationships(): ArtifactRelationships {
  return { sources: [], expectedOutputs: [], supersedes: [], children: [] };
}

function uniqueStable(values: readonly string[] | undefined): string[] {
  return Array.from(new Set(values ?? []));
}

function canonicalTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.valueOf())) throw new TypeError("Clock returned an invalid timestamp.");
  return timestamp.toISOString();
}

function renderRegistryMarkdown(registry: ArtifactRegistry): string {
  const rows = registry.entries.map(
    (entry) =>
      `| ${entry.artifactId} | ${entry.artifactType} | ${entry.revision} | ${entry.status} | ${entry.authoritative ? "yes" : "no"} | ${entry.synchronized ? "yes" : "no"} |`,
  );
  return [
    "# Canonical Artifact Registry",
    "",
    `Entries: ${registry.entries.length}`,
    "",
    "| Artifact ID | Type | Revision | Status | Authority | Synchronized |",
    "| --- | --- | ---: | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function cloneRegistryEntry<T extends ArtifactRegistry["entries"][number]>(entry: T): T {
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

function compareRegistryEntries(
  left: ArtifactRegistry["entries"][number],
  right: ArtifactRegistry["entries"][number],
): number {
  return left.artifactId < right.artifactId
    ? -1
    : left.artifactId > right.artifactId
      ? 1
      : left.revision - right.revision;
}

async function rollbackPendingWrites(
  registryHandle?: PairCommitHandle,
  artifactHandle?: PairCommitHandle,
): Promise<ArtifactPartialWriteError["rollbackStatus"]> {
  if (!registryHandle && !artifactHandle) return "not_required";
  try {
    await registryHandle?.rollback();
    await artifactHandle?.rollback();
    return "succeeded";
  } catch {
    return "failed";
  }
}

async function rollbackBatchWrites(
  registryHandle: PairCommitHandle | undefined,
  artifactHandles: readonly PairCommitHandle[],
): Promise<ArtifactPartialWriteError["rollbackStatus"]> {
  if (!registryHandle && artifactHandles.length === 0) return "not_required";
  try {
    await registryHandle?.rollback();
    for (const handle of [...artifactHandles].reverse()) await handle.rollback();
    return "succeeded";
  } catch {
    return "failed";
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
