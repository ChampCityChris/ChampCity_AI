import { access, copyFile, readFile, rm } from "node:fs/promises";
import path from "node:path";

import {
  assertArtifactRegistry,
  buildArtifactRegistry,
  buildArtifactRegistryEntry,
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  isAuthorityEligibleStatus,
  renderArtifactRegistryContentMarkdown,
  renderArtifactMarkdown,
  verifyArtifactPair,
  type ArtifactPairVerificationResult,
  type ArtifactPayload,
  type ArtifactRegistry,
  type ArtifactRegistryEntry,
  type ArtifactRelationships,
  type CanonicalArtifact,
  type JsonValue,
} from "../../shared/artifacts";
import {
  ARTIFACT_REGISTRY_ARTIFACT_TYPE,
  artifactRegistryArtifactId,
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
import { analyzeGovernancePairRepair } from "./governanceRepairAnalysis";
import {
  buildTypedSemanticRepairProposal,
  semanticProposalsEquivalent,
} from "./governanceSemanticIdentity";
import type {
  DuplicateOperatorValidationDisposition,
  GovernanceSemanticRepairProposal,
  NumberedLegacyPathDisposition,
} from "../../shared/projects";

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

interface DeletePairHandle {
  transactionId: string;
  rollback(): Promise<void>;
  finalize(): Promise<string[]>;
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

  async registerExistingArtifactPairByPaths<
    TPayload extends ArtifactPayload = ArtifactPayload,
  >(
    jsonPath: string,
    markdownPath: string,
  ): Promise<CanonicalArtifactCommitResult<TPayload>> {
    const release = await this.acquireCommitLock();
    try {
      assertExactPairPaths(jsonPath, markdownPath);
      const existing = await this.readPair<TPayload>(jsonPath, markdownPath);
      this.assertNotRegistryIdentity(
        existing.artifact.artifactId,
        existing.artifact.artifactType,
        { jsonPath, markdownPath },
      );
      const current = await this.tryReadRegistry();
      if (!current) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "An existing canonical pair cannot be registered without Registry authority.",
        );
      }
      if (current.artifact.projectId !== existing.artifact.projectId) {
        throw new ArtifactPairServiceError(
          "registry_project_mismatch",
          `Registry project ${current.artifact.projectId} cannot accept ${existing.artifact.projectId}.`,
        );
      }
      const registered = current.registry.entries.find(
        (entry) => entry.artifactId === existing.artifact.artifactId,
      );
      if (
        registered &&
        (registered.artifactType !== existing.artifact.artifactType ||
          registered.projectId !== existing.artifact.projectId ||
          registered.jsonPath !== jsonPath ||
          registered.markdownPath !== markdownPath ||
          registered.revision !== existing.artifact.revision ||
          registered.payloadHash !== existing.artifact.payloadHash ||
          !registered.synchronized)
      ) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "The existing Registry entry does not match the verified canonical pair.",
        );
      }
      const timestamp = canonicalTimestamp(this.clock());
      await this.inject("before_registry_update", "registry", existing.artifact.artifactId, {
        jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
        markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
      });
      const registryWrite = await this.updateRegistryInternal(existing.artifact, timestamp);
      await this.inject(
        "after_registry_update",
        "registry",
        existing.artifact.artifactId,
        {
          jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
          markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
        },
        registryWrite.handle.transactionId,
      );
      try {
        await registryWrite.handle.finalize();
      } catch (error) {
        const rollback = await rollbackPendingWrites(registryWrite.handle);
        throw new ArtifactPartialWriteError(
          `Canonical Registry registration failed: ${errorMessage(error)}`,
          registryWrite.handle.transactionId,
          ARTIFACT_REGISTRY_JSON_PATH,
          ARTIFACT_REGISTRY_MARKDOWN_PATH,
          rollback,
          { cause: error },
        );
      }
      return {
        artifact: existing.artifact,
        verification: existing.verification,
        registry: registryWrite.registry,
        registryRevision: registryWrite.artifact.revision,
        pairVerified: true,
        registryCommitted: true,
        payloadHash: existing.artifact.payloadHash,
        transactionId: registryWrite.handle.transactionId,
      };
    } finally {
      release();
    }
  }

  async repairExistingArtifactPairByPaths<
    TPayload extends ArtifactPayload = ArtifactPayload,
  >(
    jsonPath: string,
    markdownPath: string,
  ): Promise<CanonicalArtifactCommitResult<TPayload>> {
    const batch = await this.repairExistingArtifactPairsByPaths([{ jsonPath, markdownPath }]);
    const commit = batch.commits[0];
    if (!commit) throw new ArtifactPairServiceError("not_found", "Repair batch returned no commit.");
    return commit as CanonicalArtifactCommitResult<TPayload>;
  }

  async repairExistingArtifactPairsByPaths(
    pairs: readonly { jsonPath: string; markdownPath: string }[],
  ): Promise<CanonicalArtifactBatchCommitResult> {
    const release = await this.acquireCommitLock();
    try {
      if (pairs.length === 0) {
        throw new TypeError("Canonical repair batch must contain at least one pair.");
      }
      const uniquePairs = new Set<string>();
      for (const pair of pairs) {
        assertExactPairPaths(pair.jsonPath, pair.markdownPath);
        const key = `${pair.jsonPath}\n${pair.markdownPath}`;
        if (uniquePairs.has(key)) {
          throw new ArtifactPairServiceError(
            "identity_mismatch",
            `Repair batch contains duplicate pair ${pair.jsonPath}.`,
          );
        }
        uniquePairs.add(key);
      }
      const current = await this.tryReadRegistry();
      if (!current) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Malformed pairs cannot be repaired without Registry authority.",
        );
      }

      const prepared: PreparedBatchArtifact[] = [];
      const needsPairWrite = new Set<string>();
      for (const pair of pairs) {
        const transaction = new FilePairTransaction({ projectRoot: this.projectRoot });
        const [jsonContent, markdownContent] = await Promise.all([
          readFile(transaction.resolveInsideRoot(pair.jsonPath), "utf8"),
          readFile(transaction.resolveInsideRoot(pair.markdownPath), "utf8"),
        ]);
        const analysis = analyzeGovernancePairRepair({
          jsonContent,
          markdownContent,
          jsonPath: pair.jsonPath,
          markdownPath: pair.markdownPath,
        });
        if (!analysis.artifact) {
          throw new ArtifactPairServiceError(
            "unrepairable_pair",
            analysis.blockReason ?? analysis.verificationError,
          );
        }
        const artifact = analysis.artifact;
        this.assertNotRegistryIdentity(artifact.artifactId, artifact.artifactType, pair);
        if (current.artifact.projectId !== artifact.projectId) {
          throw new ArtifactPairServiceError(
            "registry_project_mismatch",
            `Registry project ${current.artifact.projectId} cannot accept ${artifact.projectId}.`,
          );
        }
        const registered = current.registry.entries.find(
          (entry) => entry.artifactId === artifact.artifactId,
        );
        if (
          registered &&
          (registered.artifactType !== artifact.artifactType ||
            registered.projectId !== artifact.projectId ||
            registered.jsonPath !== artifact.jsonPath ||
            registered.markdownPath !== artifact.markdownPath ||
            registered.revision !== artifact.revision ||
            registered.payloadHash !== artifact.payloadHash ||
            !registered.synchronized)
        ) {
          throw new ArtifactPairServiceError(
            "registry_sync_failure",
            "The existing Registry entry semantically disagrees with a selected repair pair.",
          );
        }
        if (analysis.repairKind === "none" && registered) {
          throw new ArtifactPairServiceError(
            "unrepairable_pair",
            "Selected pair is already canonical and registered.",
          );
        }
        if (analysis.repairKind !== "none") {
          if (!analysis.safelyRepairable) {
            throw new ArtifactPairServiceError(
              "unrepairable_pair",
              analysis.blockReason ?? analysis.verificationError,
            );
          }
          needsPairWrite.add(artifact.artifactId);
        }
        prepared.push({ artifact, paths: pair });
      }

      const timestamp = canonicalTimestamp(this.clock());
      const artifactWrites: Array<{
        prepared: PreparedBatchArtifact;
        write: PendingPairWrite<ArtifactPayload>;
      }> = [];
      let registryWrite: PendingRegistryCommit | undefined;
      const batchIdentity = prepared.map((item) => item.artifact.artifactId).join("|");
      try {
        for (const item of prepared) {
          if (!needsPairWrite.has(item.artifact.artifactId)) continue;
          await this.inject("before_artifact_write", "artifact", item.artifact.artifactId, item.paths);
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
          current,
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
        const commits: CanonicalArtifactCommitResult[] = [];
        for (const item of prepared) {
          const reread = await this.readArtifactByPaths(item.paths.jsonPath, item.paths.markdownPath);
          commits.push({
            artifact: reread.artifact,
            verification: reread.verification,
            registry: registryWrite.registry,
            registryRevision: registryWrite.artifact.revision,
            pairVerified: true,
            registryCommitted: true,
            payloadHash: reread.artifact.payloadHash,
            transactionId:
              artifactWrites.find((entry) => entry.prepared.artifact.artifactId === item.artifact.artifactId)
                ?.write.handle.transactionId ?? registryWrite.handle.transactionId,
          });
        }
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
        throw new ArtifactPartialWriteError(
          `Canonical repair batch and registry transaction failed: ${errorMessage(error)}`,
          artifactWrites[0]?.write.handle.transactionId ??
            registryWrite?.handle.transactionId ??
            "unknown",
          pairs[0].jsonPath,
          pairs[0].markdownPath,
          rollback,
          { cause: error },
        );
      }
    } finally {
      release();
    }
  }

  async repairSemanticArtifactIdentity(input: {
    currentArtifactId: string;
    currentJsonPath: string;
    currentMarkdownPath: string;
    expectedRevision: number;
    proposal: GovernanceSemanticRepairProposal;
    numberedLegacyDisposition?: NumberedLegacyPathDisposition;
    duplicateDisposition?: DuplicateOperatorValidationDisposition;
  }): Promise<CanonicalArtifactCommitResult> {
    const release = await this.acquireCommitLock();
    try {
      assertExactPairPaths(input.proposal.proposedJsonPath, input.proposal.proposedMarkdownPath);
      if (input.proposal.collision && !input.proposal.duplicateReconciliation) {
        throw new ArtifactPairServiceError("identity_mismatch", input.proposal.collision);
      }
      if (
        input.proposal.requiredDisposition === "numbered_legacy_path" &&
        !input.proposal.duplicateReconciliation
      ) {
        if (input.numberedLegacyDisposition !== "migrate_to_canonical_fixed_path") {
          throw new ArtifactPairServiceError(
            "unrepairable_pair",
            "Numbered legacy semantic repair requires the explicit migrate-to-canonical-fixed-path disposition before mutation.",
          );
        }
      } else if (
        !input.proposal.safeToApplyAutomaticallyAfterOperatorConfirmation &&
        !input.proposal.duplicateReconciliation
      ) {
        throw new ArtifactPairServiceError(
          "unrepairable_pair",
          "Semantic repair proposal is not safe to apply without an explicit constrained Operator decision.",
        );
      }

      const transaction = new FilePairTransaction({ projectRoot: this.projectRoot });
      const [jsonContent, markdownContent] = await Promise.all([
        readFile(transaction.resolveInsideRoot(input.currentJsonPath), "utf8"),
        readFile(transaction.resolveInsideRoot(input.currentMarkdownPath), "utf8"),
      ]);
      const currentVerification = verifyArtifactPair({
        jsonArtifact: jsonContent,
        markdown: markdownContent,
        jsonPath: input.currentJsonPath,
        markdownPath: input.currentMarkdownPath,
      });
      if (
        !currentVerification.valid ||
        !currentVerification.artifact ||
        currentVerification.artifact.artifactId !== input.currentArtifactId ||
        currentVerification.artifact.revision !== input.expectedRevision
      ) {
        throw new ArtifactPairServiceError(
          "stale_revision",
          "Selected semantic repair pair changed before mutation.",
        );
      }

      const current = await this.tryReadRegistry();
      if (!current) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Semantic repair requires Registry authority.",
        );
      }
      const artifact = currentVerification.artifact;
      if (current.artifact.projectId !== artifact.projectId) {
        throw new ArtifactPairServiceError(
          "registry_project_mismatch",
          `Registry project ${current.artifact.projectId} cannot accept ${artifact.projectId}.`,
        );
      }
      const recomputedProposalResult = buildTypedSemanticRepairProposal({
        artifact,
        jsonPath: input.currentJsonPath,
        markdownPath: input.currentMarkdownPath,
        registry: current.registry,
        registryStatus: registryStatusForSemantic(current.registry, artifact),
        projectRoot: this.projectRoot,
      });
      const awaitedProposal = await recomputedProposalResult;
      if (
        !awaitedProposal ||
        !semanticProposalsEquivalent(awaitedProposal, input.proposal)
      ) {
        throw new ArtifactPairServiceError(
          "identity_mismatch",
          "Semantic repair proposal no longer matches the selected pair and current Registry evidence.",
        );
      }
      const recomputedProposal = awaitedProposal;
      if (recomputedProposal.currentJsonPath !== input.currentJsonPath ||
        recomputedProposal.currentMarkdownPath !== input.currentMarkdownPath ||
        recomputedProposal.currentArtifactId !== input.currentArtifactId ||
        recomputedProposal.proposedPhaseId === undefined ||
        recomputedProposal.proposedWorkCardId === undefined
      ) {
        throw new ArtifactPairServiceError(
          "identity_mismatch",
          "Semantic repair proposal does not contain the required current pair, phase, and Work Card evidence.",
        );
      }
      if (recomputedProposal.conflictingCandidates.length > 0) {
        throw new ArtifactPairServiceError(
          "identity_mismatch",
          "Semantic repair proposal has unresolved conflicting candidates.",
        );
      }
      if (
        recomputedProposal.fieldDecisions.some(
          (decision) =>
            decision.decisionState === "operator_required" ||
            decision.decisionState === "conflict",
        )
      ) {
        throw new ArtifactPairServiceError(
          "unrepairable_pair",
          "Semantic repair proposal has unresolved required field decisions.",
        );
      }
      if (recomputedProposal.unresolvedReferenceMigration) {
        throw new ArtifactPairServiceError(
          "unrepairable_pair",
          `Semantic repair has unresolved reference migration: ${recomputedProposal.unresolvedReferenceMigration}.`,
        );
      }
      if (
        recomputedProposal.requiredDisposition === "numbered_legacy_path" &&
        !recomputedProposal.duplicateReconciliation &&
        !recomputedProposal.allowedNumberedLegacyDispositions.includes(
          input.numberedLegacyDisposition ?? "conflict_requires_manual_field_selection",
        )
      ) {
        throw new ArtifactPairServiceError(
          "unrepairable_pair",
          "Selected numbered legacy disposition is not valid for this semantic repair proposal.",
        );
      }
      if (recomputedProposal.duplicateReconciliation) {
        if (
          input.duplicateDisposition !== "use_numbered_record_as_next_canonical_revision" &&
          input.duplicateDisposition !== "keep_fixed_record_and_delete_duplicate"
        ) {
          throw new ArtifactPairServiceError(
            "unrepairable_pair",
            "Duplicate Operator Validation cleanup requires an explicit whole-record survivor disposition before mutation.",
          );
        }
        if (!recomputedProposal.duplicateReconciliation.safeToApply) {
          throw new ArtifactPairServiceError(
            "unrepairable_pair",
            "Duplicate Operator Validation cleanup is not safe to apply with the current Registry and reference evidence.",
          );
        }
        if (recomputedProposal.collision?.startsWith("Registry collision with ")) {
          const collisionId = recomputedProposal.collision.replace("Registry collision with ", "");
          if (collisionId !== recomputedProposal.duplicateReconciliation.fixedPathRecord.artifactId) {
            throw new ArtifactPairServiceError("identity_mismatch", recomputedProposal.collision);
          }
        } else if (recomputedProposal.collision) {
          throw new ArtifactPairServiceError("identity_mismatch", recomputedProposal.collision);
        }
      }
      const registeredCollision = current.registry.entries.find(
        (entry) => {
          const allowedFixedId =
            recomputedProposal.duplicateReconciliation?.fixedPathRecord.artifactId;
          if (entry.artifactId === allowedFixedId) return false;
          if (
            isExactSemanticRegistrySourceEntry({
              entry,
              artifact,
              currentJsonPath: input.currentJsonPath,
              currentMarkdownPath: input.currentMarkdownPath,
              expectedRevision: input.expectedRevision,
            })
          ) {
            return false;
          }
          return entry.artifactId === recomputedProposal.proposedArtifactId ||
            entry.jsonPath === recomputedProposal.proposedJsonPath ||
            entry.markdownPath === recomputedProposal.proposedMarkdownPath;
        },
      );
      if (registeredCollision) {
        throw new ArtifactPairServiceError(
          "identity_mismatch",
          `Semantic repair target collides with Registry entry ${registeredCollision.artifactId}.`,
        );
      }
      const existingTarget = await this.tryReadPair(
        recomputedProposal.proposedJsonPath,
        recomputedProposal.proposedMarkdownPath,
      );
      const samePathMigrationSource =
        existingTarget &&
        isExactSamePathSemanticSourcePair({
          existingTarget,
          artifact,
          proposal: recomputedProposal,
          currentJsonPath: input.currentJsonPath,
          currentMarkdownPath: input.currentMarkdownPath,
          expectedRevision: input.expectedRevision,
        });
      if (
        existingTarget &&
        !recomputedProposal.duplicateReconciliation &&
        !samePathMigrationSource
      ) {
        throw new ArtifactPairServiceError(
          "identity_mismatch",
          "Semantic repair target paths already contain a canonical pair.",
        );
      }
      if (
        recomputedProposal.duplicateReconciliation &&
        (!existingTarget ||
          existingTarget.artifact.artifactId !==
            recomputedProposal.duplicateReconciliation.fixedPathRecord.artifactId)
      ) {
        throw new ArtifactPairServiceError(
          "stale_revision",
          "Fixed-path duplicate record changed before semantic reconciliation.",
        );
      }
      const timestamp = canonicalTimestamp(this.clock());
      const referenceArtifacts = await this.prepareSemanticReferenceMigrations(
        recomputedProposal,
        current.registry,
        timestamp,
      );
      const duplicateCleanup = recomputedProposal.duplicateReconciliation;
      const selectedSource =
        duplicateCleanup && input.duplicateDisposition === "keep_fixed_record_and_delete_duplicate"
          ? existingTarget?.artifact
          : artifact;
      if (!selectedSource) {
        throw new ArtifactPairServiceError(
          "stale_revision",
          "Selected fixed duplicate survivor disappeared before cleanup.",
        );
      }
      const canonicalRegistryRevision =
        current.registry.entries.find(
          (entry) => entry.artifactId === recomputedProposal.proposedArtifactId,
        )?.revision ?? 0;
      const nextRevision = duplicateCleanup
        ? Math.max(
            existingTarget?.artifact.revision ?? 0,
            artifact.revision,
            canonicalRegistryRevision,
          ) + 1
        : Math.max(existingTarget?.artifact.revision ?? 0, artifact.revision) + 1;
      const createdAt = duplicateCleanup
        ? earliestTimestamp([artifact.createdAt, existingTarget?.artifact.createdAt].filter(isString))
        : artifact.createdAt;
      const relationships = duplicateCleanup
        ? selectedSource.relationships
        : {
            sources: artifact.relationships.sources,
            expectedOutputs: artifact.relationships.expectedOutputs,
            supersedes: uniqueStable([
              ...artifact.relationships.supersedes,
              artifact.artifactId,
              ...(existingTarget ? [existingTarget.artifact.artifactId] : []),
            ]),
            children: artifact.relationships.children,
          };
      const repaired = buildCanonicalArtifact({
        artifactId: recomputedProposal.proposedArtifactId,
        artifactType: selectedSource.artifactType,
        revision: nextRevision,
        status: selectedSource.status,
        projectId: recomputedProposal.proposedProjectId ?? selectedSource.projectId,
        ...(recomputedProposal.proposedPhaseId === undefined
          ? {}
          : { phaseId: recomputedProposal.proposedPhaseId }),
        ...(recomputedProposal.proposedWorkCardId === undefined
          ? {}
          : { workCardId: recomputedProposal.proposedWorkCardId }),
        ...((duplicateCleanup ? selectedSource.parentArtifactId : recomputedProposal.proposedParentArtifactId) === undefined
          ? {}
          : {
              parentArtifactId: duplicateCleanup
                ? selectedSource.parentArtifactId
                : recomputedProposal.proposedParentArtifactId,
            }),
        createdAt,
        updatedAt: timestamp,
        jsonPath: recomputedProposal.proposedJsonPath,
        markdownPath: recomputedProposal.proposedMarkdownPath,
        relationships,
        payload: selectedSource.payload,
      });

      let artifactWrite: PendingPairWrite<ArtifactPayload> | undefined;
      const referenceWrites: Array<{
        artifact: CanonicalArtifact;
        write: PendingPairWrite<ArtifactPayload>;
      }> = [];
      let registryWrite: PendingRegistryCommit | undefined;
      let duplicateDelete: DeletePairHandle | undefined;
      let numberedLegacyDelete: DeletePairHandle | undefined;
      try {
        await this.inject("before_artifact_write", "artifact", repaired.artifactId, {
          jsonPath: repaired.jsonPath,
          markdownPath: repaired.markdownPath,
        });
        artifactWrite = await this.writeCanonicalPair(repaired, "artifact");
        await this.inject(
          "after_artifact_write",
          "artifact",
          repaired.artifactId,
          { jsonPath: repaired.jsonPath, markdownPath: repaired.markdownPath },
          artifactWrite.handle.transactionId,
        );
        for (const referenceArtifact of referenceArtifacts) {
          await this.inject("before_artifact_write", "artifact", referenceArtifact.artifactId, {
            jsonPath: referenceArtifact.jsonPath,
            markdownPath: referenceArtifact.markdownPath,
          });
          const write = await this.writeCanonicalPair(referenceArtifact, "artifact");
          referenceWrites.push({ artifact: referenceArtifact, write });
          await this.inject(
            "after_artifact_write",
            "artifact",
            referenceArtifact.artifactId,
            { jsonPath: referenceArtifact.jsonPath, markdownPath: referenceArtifact.markdownPath },
            write.handle.transactionId,
          );
        }

        await this.inject("before_registry_update", "registry", repaired.artifactId, {
          jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
          markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
        });
        registryWrite = await this.updateRegistryBatchInternal(
          [repaired, ...referenceArtifacts],
          timestamp,
          current,
          uniqueStable([
            artifact.artifactId,
            ...(existingTarget ? [existingTarget.artifact.artifactId] : []),
          ]),
        );
        await this.inject(
          "after_registry_update",
          "registry",
          repaired.artifactId,
          {
            jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
            markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
          },
          registryWrite.handle.transactionId,
        );

        if (duplicateCleanup) {
          await this.assertDuplicateDeletionSafety({
            duplicate: artifact,
            proposal: recomputedProposal,
            registry: registryWrite.registry,
            canonical: repaired,
            expectedDisposition: input.duplicateDisposition,
          });
          duplicateDelete = await this.deleteDuplicatePairWithRollback({
            artifact,
            transactionId: artifactWrite.handle.transactionId,
          });
        } else if (recomputedProposal.requiredDisposition === "numbered_legacy_path") {
          await this.assertNumberedLegacyDeletionSafety({
            legacy: artifact,
            proposal: recomputedProposal,
            registry: registryWrite.registry,
            canonical: repaired,
          });
          numberedLegacyDelete = await this.deleteDuplicatePairWithRollback({
            artifact,
            transactionId: artifactWrite.handle.transactionId,
          });
        }

        await this.inject("before_semantic_finalize", "artifact", repaired.artifactId, {
          jsonPath: repaired.jsonPath,
          markdownPath: repaired.markdownPath,
        }, artifactWrite.handle.transactionId);
        await registryWrite.handle.finalize();
        for (const { write } of referenceWrites) await write.handle.finalize();
        await artifactWrite.handle.finalize();
        const cleanupWarnings = [
          ...((await duplicateDelete?.finalize()) ?? []),
          ...((await numberedLegacyDelete?.finalize()) ?? []),
        ];
        const reread = await this.readArtifactByPaths(
          repaired.jsonPath,
          repaired.markdownPath,
        );
        for (const referenceArtifact of referenceArtifacts) {
          await this.readArtifactByPaths(referenceArtifact.jsonPath, referenceArtifact.markdownPath);
        }
        if (duplicateCleanup) {
          await this.assertDuplicatePathsAbsent(artifact.jsonPath, artifact.markdownPath);
        }
        if (numberedLegacyDelete) {
          await this.assertDuplicatePathsAbsent(artifact.jsonPath, artifact.markdownPath);
        }
        return {
          artifact: reread.artifact,
          verification: reread.verification,
          registry: registryWrite.registry,
          registryRevision: registryWrite.artifact.revision,
          pairVerified: true,
          registryCommitted: true,
          payloadHash: reread.artifact.payloadHash,
          transactionId: artifactWrite.handle.transactionId,
          ...(cleanupWarnings.length > 0 ? { cleanupWarnings } : {}),
        };
      } catch (error) {
        await duplicateDelete?.rollback().catch(() => undefined);
        await numberedLegacyDelete?.rollback().catch(() => undefined);
        const rollback = await rollbackBatchWrites(
          registryWrite?.handle,
          [
            ...referenceWrites.map(({ write }) => write.handle),
            ...(artifactWrite ? [artifactWrite.handle] : []),
          ],
        );
        if (artifactWrite || registryWrite) {
          throw new ArtifactPartialWriteError(
            `Semantic governance repair failed: ${errorMessage(error)}`,
            artifactWrite?.handle.transactionId ?? registryWrite?.handle.transactionId ?? "unknown",
            repaired.jsonPath,
            repaired.markdownPath,
            rollback,
            { cause: error },
          );
        }
        throw error;
      }
    } finally {
      release();
    }
  }

  async refreshStaleRegistryEntryByPaths(
    jsonPath: string,
    markdownPath: string,
  ): Promise<CanonicalArtifactCommitResult> {
    const release = await this.acquireCommitLock();
    try {
      const existing = await this.readArtifactByPaths(jsonPath, markdownPath);
      const current = await this.tryReadRegistry();
      if (!current) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Stale Registry refresh requires Registry authority.",
        );
      }
      const competing = current.registry.entries.filter(
        (entry) =>
          (entry.artifactId === existing.artifact.artifactId ||
            entry.jsonPath === jsonPath ||
            entry.markdownPath === markdownPath) &&
          !(
            entry.artifactId === existing.artifact.artifactId &&
            entry.jsonPath === jsonPath &&
            entry.markdownPath === markdownPath
          ),
      );
      if (competing.length > 0) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          `Registry refresh blocked by competing entry ${competing[0].artifactId}.`,
        );
      }
      const entry = current.registry.entries.find(
        (candidate) =>
          candidate.artifactId === existing.artifact.artifactId &&
          candidate.jsonPath === jsonPath &&
          candidate.markdownPath === markdownPath,
      );
      if (!entry) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Stale Registry refresh requires an existing same-ID same-path Registry entry.",
        );
      }
      if (
        entry.artifactType !== existing.artifact.artifactType ||
        entry.projectId !== existing.artifact.projectId ||
        entry.status !== existing.artifact.status
      ) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Registry refresh is limited to stale metadata for the same artifact identity, type, project, status, and paths.",
        );
      }
      const timestamp = canonicalTimestamp(this.clock());
      await this.inject("before_registry_update", "registry", existing.artifact.artifactId, {
        jsonPath: ARTIFACT_REGISTRY_JSON_PATH,
        markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH,
      });
      const registryWrite = await this.updateRegistryBatchInternal([existing.artifact], timestamp, current);
      await this.inject(
        "after_registry_update",
        "registry",
        existing.artifact.artifactId,
        { jsonPath: ARTIFACT_REGISTRY_JSON_PATH, markdownPath: ARTIFACT_REGISTRY_MARKDOWN_PATH },
        registryWrite.handle.transactionId,
      );
      try {
        await registryWrite.handle.finalize();
      } catch (error) {
        const rollback = await rollbackPendingWrites(registryWrite.handle);
        throw new ArtifactPartialWriteError(
          `Stale Registry refresh failed: ${errorMessage(error)}`,
          registryWrite.handle.transactionId,
          ARTIFACT_REGISTRY_JSON_PATH,
          ARTIFACT_REGISTRY_MARKDOWN_PATH,
          rollback,
          { cause: error },
        );
      }
      return {
        artifact: existing.artifact,
        verification: existing.verification,
        registry: registryWrite.registry,
        registryRevision: registryWrite.artifact.revision,
        pairVerified: true,
        registryCommitted: true,
        payloadHash: existing.artifact.payloadHash,
        transactionId: registryWrite.handle.transactionId,
      };
    } finally {
      release();
    }
  }

  async deleteExplicitSupersededPair(input: {
    supersededJsonPath: string;
    supersededMarkdownPath: string;
    activeJsonPath: string;
    activeMarkdownPath: string;
    expectedRevision: number;
  }): Promise<CanonicalArtifactCommitResult> {
    const release = await this.acquireCommitLock();
    try {
      const active = await this.readArtifactByPaths(input.activeJsonPath, input.activeMarkdownPath);
      const superseded = await this.readArtifactByPaths(
        input.supersededJsonPath,
        input.supersededMarkdownPath,
      );
      if (
        superseded.artifact.artifactId !== active.artifact.artifactId ||
        superseded.artifact.revision !== input.expectedRevision ||
        superseded.artifact.status !== "superseded" ||
        !payloadNamesActivePair(superseded.artifact.payload.data, input.activeJsonPath, input.activeMarkdownPath)
      ) {
        throw new ArtifactPairServiceError(
          "unrepairable_pair",
          "Superseded cleanup requires a synchronized same-ID superseded pair that explicitly names the active pair.",
        );
      }
      const current = await this.tryReadRegistry();
      if (!current) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Superseded cleanup requires Registry authority.",
        );
      }
      const activeEntry = current.registry.entries.find(
        (entry) =>
          entry.artifactId === active.artifact.artifactId &&
          entry.jsonPath === active.artifact.jsonPath &&
          entry.markdownPath === active.artifact.markdownPath &&
          entry.revision === active.artifact.revision &&
          entry.payloadHash === active.artifact.payloadHash &&
          entry.authoritative &&
          entry.synchronized,
      );
      const supersededEntry = current.registry.entries.find(
        (entry) =>
          entry.jsonPath === superseded.artifact.jsonPath ||
          entry.markdownPath === superseded.artifact.markdownPath,
      );
      if (!activeEntry || supersededEntry) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Superseded cleanup requires one authoritative active Registry entry and no superseded path authority.",
        );
      }
      const registryBefore = JSON.stringify(current.registry);
      const deleteHandle = await this.deleteDuplicatePairWithRollback({
        artifact: superseded.artifact,
        transactionId: this.transactionIdFactory?.() ?? `delete-${Date.now()}`,
      });
      try {
        await deleteHandle.finalize();
        await this.assertDuplicatePathsAbsent(input.supersededJsonPath, input.supersededMarkdownPath);
        const rereadActive = await this.readArtifactByPaths(input.activeJsonPath, input.activeMarkdownPath);
        const registryAfter = await this.tryReadRegistry();
        if (
          rereadActive.artifact.payloadHash !== active.artifact.payloadHash ||
          JSON.stringify(registryAfter?.registry) !== registryBefore
        ) {
          throw new ArtifactPairServiceError(
            "registry_sync_failure",
            "Superseded cleanup changed the active pair or Registry unexpectedly.",
          );
        }
        return {
          artifact: rereadActive.artifact,
          verification: rereadActive.verification,
          registry: current.registry,
          registryRevision: current.artifact.revision,
          pairVerified: true,
          registryCommitted: true,
          payloadHash: rereadActive.artifact.payloadHash,
          transactionId: deleteHandle.transactionId,
        };
      } catch (error) {
        await deleteHandle.rollback().catch(() => undefined);
        throw error;
      }
    } finally {
      release();
    }
  }

  async normalizeLegacyCloseoutRecord(input: {
    jsonPath: string;
    markdownPath: string;
    expectedRevision: number;
    duplicateDisposition?: DuplicateOperatorValidationDisposition;
  }): Promise<CanonicalArtifactCommitResult> {
    const release = await this.acquireCommitLock();
    try {
      const currentPair = await this.readLooseVerifiedPair(input.jsonPath, input.markdownPath);
      if (currentPair.artifact.revision !== input.expectedRevision) {
        throw new ArtifactPairServiceError("stale_revision", "Selected closeout record changed before repair.");
      }
      const target = legacyCloseoutTarget(currentPair.artifact);
      if (!target) {
        throw new ArtifactPairServiceError(
          "unrepairable_pair",
          "Legacy closeout normalization applies only to phase Closeout_Reports supporting documents.",
        );
      }
      const fixedPair =
        target.jsonPath === input.jsonPath
          ? currentPair
          : await this.tryReadPair(target.jsonPath, target.markdownPath);
      const hasDuplicate = Boolean(fixedPair && fixedPair.artifact.artifactId !== currentPair.artifact.artifactId);
      if (hasDuplicate &&
        input.duplicateDisposition !== "keep_fixed_record_and_delete_duplicate" &&
        input.duplicateDisposition !== "use_numbered_record_as_next_canonical_revision") {
        throw new ArtifactPairServiceError(
          "unrepairable_pair",
          "Phase 01 duplicate closeout cleanup requires one whole-record Operator selection.",
        );
      }
      const current = await this.tryReadRegistry();
      if (!current) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Legacy closeout normalization requires Registry authority.",
        );
      }
      const selectedSource =
        hasDuplicate && input.duplicateDisposition === "keep_fixed_record_and_delete_duplicate"
          ? fixedPair!.artifact
          : currentPair.artifact;
      const currentIsTarget =
        currentPair.artifact.jsonPath === target.jsonPath &&
        currentPair.artifact.markdownPath === target.markdownPath;
      const duplicateToDelete = hasDuplicate
        ? currentIsTarget
          ? fixedPair!.artifact
          : currentPair.artifact
        : undefined;
      const nextRevision =
        Math.max(currentPair.artifact.revision, fixedPair?.artifact.revision ?? 0) + 1;
      const timestamp = canonicalTimestamp(this.clock());
      const repaired = buildCanonicalArtifact({
        artifactId: target.artifactId,
        artifactType: "supporting_document",
        revision: nextRevision,
        status: "historical",
        projectId: selectedSource.projectId,
        phaseId: target.phaseId,
        createdAt: selectedSource.createdAt,
        updatedAt: timestamp,
        jsonPath: target.jsonPath,
        markdownPath: target.markdownPath,
        relationships: selectedSource.relationships,
        payload: selectedSource.payload,
      });
      let artifactWrite: PendingPairWrite<ArtifactPayload> | undefined;
      let registryWrite: PendingRegistryCommit | undefined;
      let deleteHandle: DeletePairHandle | undefined;
      try {
        artifactWrite = await this.writeCanonicalPair(repaired, "artifact");
        registryWrite = await this.updateRegistryBatchInternal(
          [repaired],
          timestamp,
          current,
          uniqueStable([
            currentPair.artifact.artifactId,
            ...(fixedPair ? [fixedPair.artifact.artifactId] : []),
          ].filter((artifactId) => artifactId !== repaired.artifactId)),
        );
        if (duplicateToDelete) {
          deleteHandle = await this.deleteDuplicatePairWithRollback({
            artifact: duplicateToDelete,
            transactionId: artifactWrite.handle.transactionId,
          });
        }
        await registryWrite.handle.finalize();
        await artifactWrite.handle.finalize();
        await deleteHandle?.finalize();
        const reread = await this.readArtifactByPaths(repaired.jsonPath, repaired.markdownPath);
        return {
          artifact: reread.artifact,
          verification: reread.verification,
          registry: registryWrite.registry,
          registryRevision: registryWrite.artifact.revision,
          pairVerified: true,
          registryCommitted: true,
          payloadHash: reread.artifact.payloadHash,
          transactionId: artifactWrite.handle.transactionId,
        };
      } catch (error) {
        await deleteHandle?.rollback().catch(() => undefined);
        const rollback = await rollbackPendingWrites(registryWrite?.handle, artifactWrite?.handle);
        throw new ArtifactPartialWriteError(
          `Legacy closeout normalization failed: ${errorMessage(error)}`,
          artifactWrite?.handle.transactionId ?? registryWrite?.handle.transactionId ?? "unknown",
          target.jsonPath,
          target.markdownPath,
          rollback,
          { cause: error },
        );
      }
    } finally {
      release();
    }
  }

  private async prepareSemanticReferenceMigrations(
    proposal: GovernanceSemanticRepairProposal,
    registry: ArtifactRegistry,
    timestamp: string,
  ): Promise<CanonicalArtifact[]> {
    const byArtifactId = new Map<string, typeof proposal.inboundReferences>();
    for (const reference of proposal.inboundReferences) {
      if (!reference.safelyRewritable || !reference.canonical || !reference.synchronized) {
        throw new ArtifactPairServiceError(
          "unrepairable_pair",
          `Inbound reference ${reference.artifactId} is not a canonical synchronized rewrite target.`,
        );
      }
      const group = byArtifactId.get(reference.artifactId) ?? [];
      group.push(reference);
      byArtifactId.set(reference.artifactId, group);
    }

    const updated: CanonicalArtifact[] = [];
    for (const [artifactId, references] of byArtifactId) {
      const entry = registry.entries.find((candidate) => candidate.artifactId === artifactId);
      if (!entry) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          `Inbound reference ${artifactId} disappeared from the Registry.`,
        );
      }
      const pair = await this.readArtifactByPaths(entry.jsonPath, entry.markdownPath);
      if (
        pair.artifact.artifactId !== entry.artifactId ||
        pair.artifact.revision !== entry.revision ||
        pair.artifact.payloadHash !== entry.payloadHash ||
        !entry.authoritative ||
        !entry.synchronized
      ) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          `Inbound reference ${artifactId} is not synchronized with Registry authority.`,
        );
      }
      let relationships = cloneRelationships(pair.artifact.relationships);
      let parentArtifactId = pair.artifact.parentArtifactId;
      const oldArtifactIds = uniqueStable([
        proposal.currentArtifactId,
        ...(proposal.duplicateReconciliation
          ? [proposal.duplicateReconciliation.fixedPathRecord.artifactId]
          : []),
      ]);
      for (const reference of references) {
        if (reference.relationshipField === "parentArtifactId") {
          if (!parentArtifactId || !oldArtifactIds.includes(parentArtifactId)) {
            throw new ArtifactPairServiceError(
              "stale_revision",
              `Inbound parent reference ${artifactId} changed before semantic repair.`,
            );
          }
          parentArtifactId = reference.proposedReplacementValue;
          continue;
        }
        const key = reference.relationshipField.replace("relationships.", "") as keyof ArtifactRelationships;
        if (!relationships[key].some((value) => oldArtifactIds.includes(value))) {
          throw new ArtifactPairServiceError(
            "stale_revision",
            `Inbound relationship reference ${artifactId} ${reference.relationshipField} changed before semantic repair.`,
          );
        }
        relationships = {
          ...relationships,
          [key]: uniqueStable(
            relationships[key].map((value) =>
              oldArtifactIds.includes(value) ? reference.proposedReplacementValue : value,
            ),
          ),
        };
      }
      updated.push(
        buildCanonicalArtifact({
          artifactId: pair.artifact.artifactId,
          artifactType: pair.artifact.artifactType,
          revision: pair.artifact.revision + 1,
          status: pair.artifact.status,
          projectId: pair.artifact.projectId,
          ...(pair.artifact.phaseId === undefined ? {} : { phaseId: pair.artifact.phaseId }),
          ...(pair.artifact.workCardId === undefined ? {} : { workCardId: pair.artifact.workCardId }),
          ...(parentArtifactId === undefined ? {} : { parentArtifactId }),
          createdAt: pair.artifact.createdAt,
          updatedAt: timestamp,
          jsonPath: pair.artifact.jsonPath,
          markdownPath: pair.artifact.markdownPath,
          relationships,
          payload: pair.artifact.payload,
        }),
      );
    }
    return updated;
  }

  private async assertDuplicateDeletionSafety(input: {
    duplicate: CanonicalArtifact;
    proposal: GovernanceSemanticRepairProposal;
    registry: ArtifactRegistry;
    canonical: CanonicalArtifact;
    expectedDisposition?: DuplicateOperatorValidationDisposition;
  }): Promise<void> {
    const cleanup = input.proposal.duplicateReconciliation;
    if (!cleanup) return;
    if (
      input.expectedDisposition !== "use_numbered_record_as_next_canonical_revision" &&
      input.expectedDisposition !== "keep_fixed_record_and_delete_duplicate"
    ) {
      throw new ArtifactPairServiceError(
        "unrepairable_pair",
        "Duplicate deletion requires an explicit survivor disposition.",
      );
    }
    if (
      input.duplicate.jsonPath !== cleanup.duplicateJsonPathToDelete ||
      input.duplicate.markdownPath !== cleanup.duplicateMarkdownPathToDelete ||
      input.duplicate.artifactId !== cleanup.numberedRecord.artifactId ||
      input.duplicate.revision !== cleanup.numberedRecord.revision ||
      input.duplicate.payloadHash !== cleanup.numberedRecord.payloadHash
    ) {
      throw new ArtifactPairServiceError(
        "stale_revision",
        "Erroneous duplicate pair changed before deletion.",
      );
    }
    const transaction = new FilePairTransaction({ projectRoot: this.projectRoot });
    const [duplicateJson, duplicateMarkdown] = await Promise.all([
      readFile(transaction.resolveInsideRoot(input.duplicate.jsonPath), "utf8"),
      readFile(transaction.resolveInsideRoot(input.duplicate.markdownPath), "utf8"),
    ]);
    const duplicatePair = verifyArtifactPair({
      jsonArtifact: duplicateJson,
      markdown: duplicateMarkdown,
      jsonPath: input.duplicate.jsonPath,
      markdownPath: input.duplicate.markdownPath,
    });
    if (
      !duplicatePair.valid ||
      !duplicatePair.synchronized ||
      !duplicatePair.artifact ||
      duplicatePair.artifact.artifactId !== input.duplicate.artifactId ||
      duplicatePair.artifact.revision !== input.duplicate.revision ||
      duplicatePair.artifact.payloadHash !== input.duplicate.payloadHash
    ) {
      throw new ArtifactPairServiceError(
        "stale_revision",
        "Erroneous duplicate pair no longer matches the selected cleanup proposal.",
      );
    }
    if (
      input.duplicate.jsonPath === input.proposal.proposedJsonPath ||
      input.duplicate.markdownPath === input.proposal.proposedMarkdownPath
    ) {
      throw new ArtifactPairServiceError(
        "identity_mismatch",
        "Canonical survivor paths cannot be deleted as duplicate paths.",
      );
    }
    if (
      input.canonical.artifactId !== cleanup.canonicalArtifactId ||
      input.canonical.jsonPath !== cleanup.canonicalJsonPath ||
      input.canonical.markdownPath !== cleanup.canonicalMarkdownPath
    ) {
      throw new ArtifactPairServiceError(
        "identity_mismatch",
        "Canonical replacement pair was not prepared at the fixed writer paths.",
      );
    }
    const legacyFixedPathArtifactId =
      cleanup.fixedPathRecord.artifactId === cleanup.canonicalArtifactId
        ? undefined
        : cleanup.fixedPathRecord.artifactId;
    if (
      input.registry.entries.some(
        (entry) =>
          entry.artifactId === input.duplicate.artifactId ||
          entry.artifactId === legacyFixedPathArtifactId,
      )
    ) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "Registry still contains active authority for a legacy duplicate identity.",
      );
    }
    for (const entry of input.registry.entries) {
      const supersedes =
        entry.artifactId === input.canonical.artifactId ? [] : entry.relationships.supersedes;
      const relationships = [
        ...entry.relationships.sources,
        ...entry.relationships.expectedOutputs,
        ...supersedes,
        ...entry.relationships.children,
        entry.parentArtifactId ?? "",
      ];
      if (
        relationships.includes(input.duplicate.artifactId) ||
        (legacyFixedPathArtifactId !== undefined &&
          relationships.includes(legacyFixedPathArtifactId))
      ) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Registry relationships still reference a legacy duplicate identity.",
        );
      }
    }
  }

  private async assertNumberedLegacyDeletionSafety(input: {
    legacy: CanonicalArtifact;
    proposal: GovernanceSemanticRepairProposal;
    registry: ArtifactRegistry;
    canonical: CanonicalArtifact;
  }): Promise<void> {
    if (input.proposal.requiredDisposition !== "numbered_legacy_path") return;
    if (input.proposal.duplicateReconciliation) return;
    if (
      input.legacy.jsonPath === input.proposal.proposedJsonPath ||
      input.legacy.markdownPath === input.proposal.proposedMarkdownPath
    ) {
      throw new ArtifactPairServiceError(
        "identity_mismatch",
        "Canonical survivor paths cannot be deleted as numbered legacy paths.",
      );
    }
    if (
      input.canonical.artifactId !== input.proposal.proposedArtifactId ||
      input.canonical.jsonPath !== input.proposal.proposedJsonPath ||
      input.canonical.markdownPath !== input.proposal.proposedMarkdownPath
    ) {
      throw new ArtifactPairServiceError(
        "identity_mismatch",
        "Canonical migration pair was not prepared at the fixed writer paths.",
      );
    }
    if (input.registry.entries.some((entry) => entry.artifactId === input.legacy.artifactId)) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "Registry still contains active authority for the numbered legacy identity.",
      );
    }
    for (const entry of input.registry.entries) {
      const supersedes =
        entry.artifactId === input.canonical.artifactId ? [] : entry.relationships.supersedes;
      const relationships = [
        ...entry.relationships.sources,
        ...entry.relationships.expectedOutputs,
        ...supersedes,
        ...entry.relationships.children,
        entry.parentArtifactId ?? "",
      ];
      if (relationships.includes(input.legacy.artifactId)) {
        throw new ArtifactPairServiceError(
          "registry_sync_failure",
          "Registry relationships still reference the numbered legacy identity.",
        );
      }
    }
  }

  private async deleteDuplicatePairWithRollback(input: {
    artifact: CanonicalArtifact;
    transactionId: string;
  }): Promise<DeletePairHandle> {
    const transaction = new FilePairTransaction({ projectRoot: this.projectRoot });
    const jsonPath = input.artifact.jsonPath;
    const markdownPath = input.artifact.markdownPath;
    const jsonAbsolute = transaction.resolveInsideRoot(jsonPath);
    const markdownAbsolute = transaction.resolveInsideRoot(markdownPath);
    const jsonBackup = `${jsonAbsolute}.${input.transactionId}.delete-backup`;
    const markdownBackup = `${markdownAbsolute}.${input.transactionId}.delete-backup`;
    await Promise.all([
      copyFile(jsonAbsolute, jsonBackup),
      copyFile(markdownAbsolute, markdownBackup),
    ]);
    let closed = false;
    try {
      await this.inject("before_duplicate_delete", "artifact", input.artifact.artifactId, {
        jsonPath,
        markdownPath,
      }, input.transactionId);
      await rm(jsonAbsolute, { force: true });
      await this.inject("after_duplicate_json_delete", "artifact", input.artifact.artifactId, {
        jsonPath,
        markdownPath,
      }, input.transactionId);
      await rm(markdownAbsolute, { force: true });
      await this.assertDuplicatePathsAbsent(jsonPath, markdownPath);
      await this.inject("after_duplicate_delete", "artifact", input.artifact.artifactId, {
        jsonPath,
        markdownPath,
      }, input.transactionId);
      return {
        transactionId: input.transactionId,
        rollback: async () => {
          if (closed) return;
          closed = true;
          await Promise.all([
            copyFile(jsonBackup, jsonAbsolute),
            copyFile(markdownBackup, markdownAbsolute),
          ]);
          await Promise.all([
            rm(jsonBackup, { force: true }),
            rm(markdownBackup, { force: true }),
          ]);
        },
        finalize: async () => {
          if (closed) return [];
          const cleanupWarnings: string[] = [];
          try {
            await this.inject(
              "before_duplicate_backup_cleanup",
              "artifact",
              input.artifact.artifactId,
              { jsonPath, markdownPath },
              input.transactionId,
            );
            await Promise.all([
              rm(jsonBackup, { force: true }),
              rm(markdownBackup, { force: true }),
            ]);
          } catch (error) {
            const warning =
              `Duplicate deletion backup cleanup was skipped after durable commit: ${errorMessage(error)}`;
            cleanupWarnings.push(warning);
            console.warn(warning);
          } finally {
            closed = true;
          }
          return cleanupWarnings;
        },
      };
    } catch (error) {
      await Promise.allSettled([
        copyFile(jsonBackup, jsonAbsolute),
        copyFile(markdownBackup, markdownAbsolute),
      ]);
      await Promise.allSettled([
        rm(jsonBackup, { force: true }),
        rm(markdownBackup, { force: true }),
      ]);
      throw error;
    }
  }

  private async assertDuplicatePathsAbsent(jsonPath: string, markdownPath: string): Promise<void> {
    const transaction = new FilePairTransaction({ projectRoot: this.projectRoot });
    const [jsonExists, markdownExists] = await Promise.all([
      fileExists(transaction.resolveInsideRoot(jsonPath)),
      fileExists(transaction.resolveInsideRoot(markdownPath)),
    ]);
    if (jsonExists || markdownExists) {
      throw new ArtifactPairServiceError(
        "registry_sync_failure",
        "Erroneous duplicate pair still exists after cleanup.",
      );
    }
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
    removeArtifactIds: readonly string[] = [],
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

    const replacingIds = new Set([
      ...artifacts.map((artifact) => artifact.artifactId),
      ...removeArtifactIds,
    ]);
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
      artifactId: artifactRegistryArtifactId(projectId),
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
        contentMarkdown: renderArtifactRegistryContentMarkdown(registry),
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
      pair.artifact.artifactId !== artifactRegistryArtifactId(pair.artifact.projectId) ||
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

  private async readLooseVerifiedPair<TPayload extends ArtifactPayload = ArtifactPayload>(
    jsonPath: string,
    markdownPath: string,
  ): Promise<CanonicalArtifactReadResult<TPayload>> {
    if (!jsonPath.endsWith(".json") || !markdownPath.endsWith(".md")) {
      throw new ArtifactPairServiceError("invalid_location", "Canonical pair extensions are invalid.");
    }
    if (jsonPath.slice(0, -".json".length) !== markdownPath.slice(0, -".md".length)) {
      throw new ArtifactPairServiceError("invalid_location", "Canonical pair stems do not match.");
    }
    const transaction = new FilePairTransaction({ projectRoot: this.projectRoot });
    const [jsonContent, markdownContent] = await Promise.all([
      readFile(transaction.resolveInsideRoot(jsonPath), "utf8"),
      readFile(transaction.resolveInsideRoot(markdownPath), "utf8"),
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
        `Artifact pair is unsynchronized: ${verification.errors.join(" ")}`,
      );
    }
    return {
      artifact: verification.artifact,
      verification: verification as CanonicalArtifactReadResult<TPayload>["verification"],
      jsonContent,
      markdownContent,
    };
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
      artifactId === artifactRegistryArtifactId(artifactId.split("/")[0] ?? "") ||
      artifactId.endsWith("/system/artifact_registry") ||
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

function cloneRelationships(relationships: ArtifactRelationships): ArtifactRelationships {
  return {
    sources: [...relationships.sources],
    expectedOutputs: [...relationships.expectedOutputs],
    supersedes: [...relationships.supersedes],
    children: [...relationships.children],
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

function earliestTimestamp(values: readonly string[]): string {
  const sorted = values
    .map((value) => canonicalTimestamp(value))
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  if (!sorted[0]) throw new TypeError("At least one timestamp is required.");
  return sorted[0];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
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

function payloadNamesActivePair(
  value: JsonValue,
  activeJsonPath: string,
  activeMarkdownPath: string,
): boolean {
  if (!isPlainRecord(value)) return false;
  const payloadStatus = value.status;
  const jsonPath =
    value.activeJsonPath ??
    value.authoritativeJsonPath ??
    value.supersededByJsonPath ??
    value.activePairJsonPath;
  const markdownPath =
    value.activeMarkdownPath ??
    value.authoritativeMarkdownPath ??
    value.supersededByMarkdownPath ??
    value.activePairMarkdownPath;
  return (
    payloadStatus === "superseded_path" &&
    jsonPath === activeJsonPath &&
    markdownPath === activeMarkdownPath
  );
}

function legacyCloseoutTarget(artifact: CanonicalArtifact): {
  artifactId: string;
  phaseId: string;
  jsonPath: string;
  markdownPath: string;
} | null {
  if (artifact.artifactType !== "supporting_document") return null;
  const match = artifact.jsonPath.match(
    /^planning\/phases\/(phase-\d{2,})\/Closeout_Reports\/(CLOSEOUT_REPORT_phase-\d{2,}_phase_\d+_closeout)(?:_\d+)?\.json$/,
  );
  if (!match) return null;
  const phaseId = match[1];
  const fileStem = match[2];
  if (artifact.markdownPath !== artifact.jsonPath.replace(/\.json$/, ".md")) return null;
  return {
    artifactId: `${artifact.projectId}/${phaseId}/supporting_document/${fileStem}`,
    phaseId,
    jsonPath: `planning/phases/${phaseId}/Closeout_Reports/${fileStem}.json`,
    markdownPath: `planning/phases/${phaseId}/Closeout_Reports/${fileStem}.md`,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function registryStatusForSemantic(
  registry: ArtifactRegistry,
  artifact: CanonicalArtifact,
): "registered" | "missing_registration" | "registry_disagreement" {
  const entry = registry.entries.find((candidate) => candidate.artifactId === artifact.artifactId);
  if (!entry) return "missing_registration";
  return entry.artifactType === artifact.artifactType &&
    entry.projectId === artifact.projectId &&
    entry.jsonPath === artifact.jsonPath &&
    entry.markdownPath === artifact.markdownPath &&
    entry.revision === artifact.revision &&
    entry.payloadHash === artifact.payloadHash &&
    entry.synchronized
    ? "registered"
    : "registry_disagreement";
}

function isExactSemanticRegistrySourceEntry(input: {
  entry: ArtifactRegistryEntry;
  artifact: CanonicalArtifact;
  currentJsonPath: string;
  currentMarkdownPath: string;
  expectedRevision: number;
}): boolean {
  return (
    input.entry.artifactId === input.artifact.artifactId &&
    input.entry.jsonPath === input.currentJsonPath &&
    input.entry.markdownPath === input.currentMarkdownPath &&
    input.entry.revision === input.expectedRevision &&
    input.entry.payloadHash === input.artifact.payloadHash &&
    input.entry.artifactType === input.artifact.artifactType &&
    input.entry.projectId === input.artifact.projectId &&
    input.entry.synchronized
  );
}

function isExactSamePathSemanticSourcePair(input: {
  existingTarget: CanonicalArtifactReadResult;
  artifact: CanonicalArtifact;
  proposal: GovernanceSemanticRepairProposal;
  currentJsonPath: string;
  currentMarkdownPath: string;
  expectedRevision: number;
}): boolean {
  const existing = input.existingTarget.artifact;
  return (
    input.proposal.proposedJsonPath === input.currentJsonPath &&
    input.proposal.proposedMarkdownPath === input.currentMarkdownPath &&
    existing.jsonPath === input.currentJsonPath &&
    existing.markdownPath === input.currentMarkdownPath &&
    existing.artifactId === input.artifact.artifactId &&
    existing.revision === input.expectedRevision &&
    existing.payloadHash === input.artifact.payloadHash &&
    existing.artifactType === input.artifact.artifactType &&
    existing.projectId === input.artifact.projectId &&
    existing.workCardId === input.artifact.workCardId
  );
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
