import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  canonicalStringify,
  verifyArtifactPair,
  type ArtifactRegistry,
  type ArtifactRegistryEntry,
  type CanonicalArtifact,
  type JsonValue,
} from "../../shared/artifacts";
import type {
  ConfiguredProject,
  GovernanceRepairCandidate,
  GovernanceRepairSpecificationCreateInput,
  GovernanceRepairSpecificationRequestCreateResult,
  GovernanceRepairSpecificationRequestPreview,
  GovernanceRepairSpecificationTargetSnapshot,
  GovernanceRepairSpecificationPreviewInput,
  GovernanceRepairPreviewResult,
  GovernanceRepairSpecificationRequestSummary,
} from "../../shared/projects";
import {
  renderRouteReviewRequestMarkdown,
  type RouteReviewEvidenceSnapshot,
  type RouteReviewRequestRecord,
} from "../../shared/workCards/routeReviewRequest";
import type { RoutedActionContract } from "../../shared/workflow";
import { ArtifactPairService } from "./artifactPairService";
import {
  ARTIFACT_REGISTRY_ARTIFACT_ID,
  ARTIFACT_REGISTRY_JSON_PATH,
  ARTIFACT_REGISTRY_MARKDOWN_PATH,
  ArtifactPairServiceError,
} from "./artifactPairContracts";
import {
  analyzeGovernancePairRepair,
  type GovernancePairRepairAnalysis,
} from "./governanceRepairAnalysis";
import {
  buildTypedSemanticRepairProposal,
  isCompletedTypedSemanticMigrationDisposition,
} from "./governanceSemanticIdentity";
import {
  bindRoutedArtifactWrite,
  recordRoutedArtifactCommit,
} from "../workflow/routedWriteScope";

interface RepairScanPair {
  jsonPath: string;
  markdownPath: string;
  jsonContent: string | null;
  markdownContent: string | null;
}

export interface GovernanceRepairSpecificationContext {
  projectionRevision: number;
  maintenancePhaseId: string | null;
  currentAction: RoutedActionContract | null;
  registryRevision: number;
}

const GOVERNANCE_REPAIR_OPERATOR_CONCERN =
  "The selected governance integrity candidate cannot be resolved by an existing bounded in-app repair operation. Create an Architect-owned repair specification without mutating the target or inferring governance authority.";

const GOVERNANCE_REPAIR_EXPECTED_ROUTE =
  "Architect repair specification -> exact repair Work Card -> separate Operator approval -> Implementer execution -> Architect review -> Operator validation -> Governance Maintenance rescan.";

export class GovernanceRepairStaleSelectionError extends Error {
  readonly code = "stale_governance_repair_selection";

  constructor(message = "Selected governance repair item is stale; refresh governance state.") {
    super(message);
    this.name = "GovernanceRepairStaleSelectionError";
  }
}

export class GovernanceRepairService {
  constructor(
    private readonly project: ConfiguredProject,
    private readonly artifactPairs: ArtifactPairService,
  ) {}

  async preview(): Promise<GovernanceRepairPreviewResult> {
    try {
      const registryContext = await this.loadRegistryContext();
      const candidates = await this.scanCandidates(
        registryContext.registry,
        registryContext.registryRevision,
      );
      return buildPreview(candidates);
    } catch (error) {
      return {
        ok: false,
        blockedMessage: "Governance records require canonical repair.",
        candidates: [],
        repairableCount: 0,
        payloadContentSummary:
          "Payload impact could not be determined because governance analysis failed.",
        errorMessages: [plainError(error)],
      };
    }
  }

  async repairAll(): Promise<{
    preview: GovernanceRepairPreviewResult;
    repairedArtifactIds: string[];
    registryRevision?: number;
  }> {
    const before = await this.preview();
    const repairable = before.candidates.filter((candidate) => candidate.safelyRepairable);
    if (repairable.length === 0) {
      return { preview: before, repairedArtifactIds: [] };
    }
    const result = await this.artifactPairs.repairExistingArtifactPairsByPaths(
      repairable.map((candidate) => ({
        jsonPath: candidate.jsonPath,
        markdownPath: candidate.markdownPath,
      })),
    );
    const after = await this.preview();
    return {
      preview: after,
      repairedArtifactIds: result.commits.map((commit) => commit.artifact.artifactId),
      registryRevision: result.registryRevision,
    };
  }

  async previewSpecificationRequest(
    input: GovernanceRepairSpecificationPreviewInput,
    context: GovernanceRepairSpecificationContext,
  ): Promise<GovernanceRepairSpecificationRequestPreview> {
    try {
      const prepared = await this.prepareSpecificationRequest(input, context);
      return {
        ok: true,
        ...prepared.preview,
        wouldMutate: false,
      };
    } catch (error) {
      return {
        ok: false,
        wouldMutate: false,
        errorMessages: [plainError(error)],
      };
    }
  }

  async createSpecificationRequest(
    input: GovernanceRepairSpecificationCreateInput,
    context: GovernanceRepairSpecificationContext,
  ): Promise<GovernanceRepairSpecificationRequestCreateResult> {
    try {
      if (input.operatorConfirmed !== true) {
        throw new Error(
          "Operator confirmation is required before creating a governance repair specification request.",
        );
      }
      const prepared = await this.prepareSpecificationRequest(input, context);
      const existing = prepared.existingRequestArtifact;
      if (existing) {
        const existingData = existing.artifact.payload.data as unknown as RouteReviewRequestRecord;
        const existingNote = operatorNoteFromConcern(existingData.operatorConcern);
        if (existingNote === normalizeOperatorNote(input.operatorNote)) {
          return {
            ok: true,
            ...prepared.preview,
            existingRequest: prepared.preview.existingRequest ?? summaryFromArtifact(existing.artifact),
            created: false,
            idempotent: true,
            updated: false,
            revision: existing.artifact.revision,
            registryRevision: context.registryRevision,
            wouldMutate: false,
          };
        }
      }

      const routedWrite = bindRoutedArtifactWrite({
        artifactId: prepared.recordArtifactId,
        artifactType: "route_review_request",
        relationships: prepared.relationships,
        data: toJsonValue(prepared.record),
      });
      const result = await this.artifactPairs.commitArtifact({
        artifactId: routedWrite.artifactId,
        artifactType: "route_review_request",
        status: "active",
        projectId: this.project.projectId,
        relationships: routedWrite.relationships,
        payload: {
          title: `Governance Repair Specification Request ${prepared.requestId}`,
          contentMarkdown: prepared.markdown,
          data: routedWrite.data,
        },
        location: {
          directoryPath: "planning/system/Route_Review_Requests",
          fileStem: prepared.requestId,
        },
        expectedRevision: existing?.artifact.revision ?? null,
      });
      recordRoutedArtifactCommit(result.artifact);
      const summary = summaryFromArtifact(result.artifact);
      return {
        ok: true,
        ...prepared.preview,
        existingRequest: summary,
        created: !existing,
        idempotent: false,
        updated: Boolean(existing),
        revision: result.artifact.revision,
        registryRevision: result.registryRevision,
        wouldMutate: false,
      };
    } catch (error) {
      return {
        ok: false,
        created: false,
        idempotent: false,
        updated: false,
        wouldMutate: false,
        errorMessages: [plainError(error)],
      };
    }
  }

  async repairOne(input: {
    artifactId: string;
    jsonPath: string;
    markdownPath: string;
    repairKind: GovernanceRepairCandidate["repairKind"];
    expectedRevision: number;
    numberedLegacyDisposition?: import("../../shared/projects").NumberedLegacyPathDisposition;
    duplicateDisposition?: import("../../shared/projects").DuplicateOperatorValidationDisposition;
    semanticProposal?: import("../../shared/projects").GovernanceSemanticRepairProposal;
  }): Promise<{
    preview: GovernanceRepairPreviewResult;
    repairedArtifactIds: string[];
    registryRevision?: number;
    cleanupWarnings?: string[];
  }> {
    const before = await this.preview();
    const candidate = before.candidates.find(
      (item) =>
        item.artifactId === input.artifactId &&
        item.jsonPath === input.jsonPath &&
        item.markdownPath === input.markdownPath &&
        item.revision === input.expectedRevision &&
        item.repairKind === input.repairKind,
    );
    if (!candidate) {
      throw new GovernanceRepairStaleSelectionError(
        "Selected governance repair item is no longer unresolved with the requested artifact ID, paths, revision, and repair kind. Refresh governance state before retrying.",
      );
    }
    if (!candidate.safelyRepairable && candidate.repairKind !== "semantic_identity_repair") {
      throw new Error(candidate.blockReason ?? "Selected governance record is not repairable.");
    }
    const result =
      candidate.repairKind === "missing_registry_registration"
        ? await this.artifactPairs.registerExistingArtifactPairByPaths(
            candidate.jsonPath,
            candidate.markdownPath,
          )
        : candidate.repairKind === "stale_registry_entry_refresh"
          ? await this.artifactPairs.refreshStaleRegistryEntryByPaths(
              candidate.jsonPath,
              candidate.markdownPath,
            )
        : candidate.repairKind === "explicit_superseded_path_cleanup" &&
            candidate.deterministicRepairPlan
          ? await this.artifactPairs.deleteExplicitSupersededPair({
              supersededJsonPath: candidate.jsonPath,
              supersededMarkdownPath: candidate.markdownPath,
              activeJsonPath: candidate.deterministicRepairPlan.activeJsonPath ?? "",
              activeMarkdownPath: candidate.deterministicRepairPlan.activeMarkdownPath ?? "",
              expectedRevision: candidate.revision,
            })
        : candidate.repairKind === "legacy_closeout_normalization"
          ? await this.artifactPairs.normalizeLegacyCloseoutRecord({
              jsonPath: candidate.jsonPath,
              markdownPath: candidate.markdownPath,
              expectedRevision: candidate.revision,
              duplicateDisposition: input.duplicateDisposition,
            })
        : candidate.repairKind === "semantic_identity_repair" && candidate.semanticProposal
          ? await this.artifactPairs.repairSemanticArtifactIdentity({
              currentArtifactId: candidate.artifactId,
              currentJsonPath: candidate.jsonPath,
              currentMarkdownPath: candidate.markdownPath,
              expectedRevision: candidate.revision,
              proposal: input.semanticProposal ?? candidate.semanticProposal,
              numberedLegacyDisposition: input.numberedLegacyDisposition,
              duplicateDisposition: input.duplicateDisposition,
            })
        : await this.artifactPairs.repairExistingArtifactPairByPaths(
            candidate.jsonPath,
            candidate.markdownPath,
          );
    if (
      ![
        "semantic_identity_repair",
        "explicit_superseded_path_cleanup",
        "legacy_closeout_normalization",
      ].includes(candidate.repairKind) &&
      result.artifact.artifactId !== candidate.artifactId
    ) {
      throw new GovernanceRepairStaleSelectionError(
        "Selected governance repair item resolved to a different artifact after repair. Refresh governance state before retrying.",
      );
    }
    const after = await this.preview();
    return {
      preview: after,
      repairedArtifactIds:
        candidate.repairKind === "semantic_identity_repair" ||
        candidate.repairKind === "legacy_closeout_normalization"
          ? [candidate.artifactId, result.artifact.artifactId]
          : [result.artifact.artifactId],
      registryRevision: result.registryRevision,
      ...(result.cleanupWarnings?.length ? { cleanupWarnings: result.cleanupWarnings } : {}),
    };
  }

  private async scanCandidates(
    registry: ArtifactRegistry | null,
    registryRevision = 0,
  ): Promise<GovernanceRepairCandidate[]> {
    const pairs = await collectGovernancePairs(this.project);
    const candidates: GovernanceRepairCandidate[] = [];
    for (const pair of pairs) {
      const canonicalLike =
        pair.jsonContent?.includes('"schemaVersion"') === true ||
        pair.markdownContent?.includes("champcity-artifact-envelope") === true;
      if (!canonicalLike) continue;
      if (!isApprovedGovernancePath(pair.jsonPath, pair.markdownPath)) continue;

      const analysis = analyzeGovernancePairRepair({
        ...pair,
        projectId: this.project.projectId,
      });
      if (analysis.artifact?.artifactType === "artifact_registry") continue;
      if (analysis.artifact) {
        const completedDisposition = await isCompletedTypedSemanticMigrationDisposition({
          artifact: analysis.artifact,
          registry,
          jsonPath: analysis.jsonPath,
          markdownPath: analysis.markdownPath,
          projectRoot: this.project.repositoryRoot,
        });
        if (completedDisposition) continue;
      }
      const registryStatus = analysis.artifact
        ? registryStatusFor(registry, analysis.artifact)
        : "registry_unavailable";
      const strict =
        pair.jsonContent !== null && pair.markdownContent !== null
          ? verifyArtifactPair({
              jsonArtifact: pair.jsonContent,
              markdown: pair.markdownContent,
              jsonPath: pair.jsonPath,
              markdownPath: pair.markdownPath,
            })
          : null;

      const deterministic = await deterministicCandidateFromPair({
        analysis,
        pairs,
        registry,
        registryStatus,
        strictErrors: strict?.errors ?? [],
        registryRevision,
      });
      if (deterministic) {
        candidates.push(deterministic);
        continue;
      }

      if (
        analysis.repairKind === "none" &&
        registryStatus === "registered" &&
        strict?.valid === true &&
        !hasSemanticIdentityRepairNeed(analysis)
      ) {
        continue;
      }
      candidates.push(
        await candidateFromAnalysis(
          analysis,
          registryStatus,
          strict?.errors ?? [],
          registry,
          this.project.repositoryRoot,
          this.project.projectId,
          registryRevision,
          this.artifactPairs,
        ),
      );
    }
    return filterFixedHalvesOfDuplicateCleanup(candidates).sort(compareRepairCandidates);
  }

  private async loadRegistryContext(): Promise<{
    registry: ArtifactRegistry | null;
    registryRevision: number;
  }> {
    try {
      const registryPair = await this.artifactPairs.readArtifactByPaths(
        ARTIFACT_REGISTRY_JSON_PATH,
        ARTIFACT_REGISTRY_MARKDOWN_PATH,
      );
      return {
        registry: registryPair.artifact.payload.data as unknown as ArtifactRegistry,
        registryRevision: registryPair.artifact.revision,
      };
    } catch {
      return {
        registry: await this.artifactPairs.loadRegistry().catch(() => null),
        registryRevision: 0,
      };
    }
  }

  private async prepareSpecificationRequest(
    input: GovernanceRepairSpecificationPreviewInput,
    context: GovernanceRepairSpecificationContext,
  ): Promise<{
    requestId: string;
    recordArtifactId: string;
    markdown: string;
    record: RouteReviewRequestRecord;
    relationships: { sources: string[]; expectedOutputs: string[]; supersedes: string[]; children: string[] };
    existingRequestArtifact?: Awaited<ReturnType<ArtifactPairService["readArtifactByPaths"]>>;
    preview: Omit<GovernanceRepairSpecificationRequestPreview, "ok" | "wouldMutate">;
  }> {
    if (context.currentAction?.actionId !== "governance_integrity_repair_required") {
      throw new Error(
        "Governance repair specification requests can only be previewed or created while governance integrity repair is the current routed action.",
      );
    }
    if (context.projectionRevision !== input.expectedProjectionRevision) {
      throw new GovernanceRepairStaleSelectionError(
        "Selected governance repair projection is stale. Refresh governance state before creating a request.",
      );
    }

    const registryContext = await this.loadRegistryContext();
    const candidates = await this.scanCandidates(
      registryContext.registry,
      registryContext.registryRevision,
    );
    const candidate = candidates.find(
      (item) =>
        item.artifactId === input.artifactId &&
        item.jsonPath === input.jsonPath &&
        item.markdownPath === input.markdownPath,
    );
    if (!candidate) {
      throw new GovernanceRepairStaleSelectionError(
        "Selected governance repair candidate no longer exists in the current repository snapshot.",
      );
    }
    if (context.currentAction.targetArtifactId !== candidate.artifactId) {
      throw new GovernanceRepairStaleSelectionError(
        "Selected governance repair candidate is not the routed maintenance target.",
      );
    }
    if (candidate.revision !== input.expectedCandidateRevision) {
      throw new GovernanceRepairStaleSelectionError(
        "Selected governance repair candidate revision changed before request creation.",
      );
    }
    if (candidate.candidateFingerprint !== input.expectedCandidateFingerprint) {
      throw new GovernanceRepairStaleSelectionError(
        "Selected governance repair candidate fingerprint changed before request creation.",
      );
    }
    if (candidate.safelyRepairable) {
      throw new Error(
        "Selected governance repair candidate now has a deterministic in-app repair available.",
      );
    }
    if (!["blocked", "review_available"].includes(candidate.repairStatus)) {
      throw new Error("Selected governance repair candidate is no longer unresolved.");
    }
    if (!context.maintenancePhaseId) {
      throw new Error(
        "Governance repair specification request requires one exact phase lifecycle selection from the current repository snapshot.",
      );
    }

    const identity = buildGovernanceRepairSpecificationIdentity({
      projectId: this.project.projectId,
      targetArtifactId: candidate.artifactId,
      targetJsonPath: candidate.jsonPath,
      targetMarkdownPath: candidate.markdownPath,
      phaseId: context.maintenancePhaseId,
    });
    const targetSnapshot = buildGovernanceTargetSnapshot({
      projectId: this.project.projectId,
      candidate,
      projectionRevision: context.projectionRevision,
      registryRevision: registryContext.registryRevision,
    });
    const evidenceSnapshot = buildGovernanceEvidenceSnapshot(candidate, targetSnapshot);
    const note = normalizeOperatorNote(input.operatorNote);
    const operatorConcern = note
      ? `${GOVERNANCE_REPAIR_OPERATOR_CONCERN}\n\nAdditional Operator note:\n${note}`
      : GOVERNANCE_REPAIR_OPERATOR_CONCERN;
    const record: RouteReviewRequestRecord = {
      artifactType: "route_review_request",
      requestPurpose: "governance_repair_specification",
      requestId: identity.requestId,
      status: "pending_architect_specification",
      phase: context.maintenancePhaseId,
      createdAt: new Date().toISOString(),
      currentRoute: {
        actionId: "governance_repair_specification_required",
        title: "Architect repair specification",
        reason:
          candidate.blockReason ??
          candidate.verificationError ??
          "Governance candidate requires Architect repair specification.",
        expectedOutput: identity.expectedRepairWorkCardArtifactId,
      },
      operatorConcern,
      operatorExpectedRoute: GOVERNANCE_REPAIR_EXPECTED_ROUTE,
      evidenceSnapshot,
      governanceTargetSnapshot: targetSnapshot,
      expectedRepairWorkCard: {
        workCardId: identity.expectedRepairWorkCardId,
        artifactId: identity.expectedRepairWorkCardArtifactId,
      },
      ownership: {
        reportedBy: "Operator",
        dispositionOwner: "Architect",
        evaluatorRepairOwner: "Implementer",
      },
      governance: {
        changesCurrentRoute: false,
        approvesEvidence: false,
        completesWork: false,
        skipsValidation: false,
        advancesWorkflow: false,
      },
      governanceRepairFlags: governanceRepairFalseFlags(),
    };
    const existingRequestArtifact = await readExistingRequest(
      this.artifactPairs,
      identity.fixedJsonPath,
      identity.fixedMarkdownPath,
      identity.requestArtifactId,
    );
    if (existingRequestArtifact) {
      const existingData = existingRequestArtifact.artifact.payload.data as unknown as RouteReviewRequestRecord;
      record.createdAt = existingData.createdAt;
    }
    const markdown = renderRouteReviewRequestMarkdown(record);
    const sources = uniqueSorted([
      candidate.artifactId,
      ...targetSnapshot.sourceArtifactIds,
      ARTIFACT_REGISTRY_ARTIFACT_ID,
    ]);
    const relationships = {
      sources,
      expectedOutputs: [identity.expectedRepairWorkCardArtifactId],
      supersedes: [],
      children: [],
    };
    return {
      requestId: identity.requestId,
      recordArtifactId: identity.requestArtifactId,
      record,
      markdown,
      relationships,
      ...(existingRequestArtifact ? { existingRequestArtifact } : {}),
      preview: {
        ...(existingRequestArtifact ? { existingRequest: summaryFromArtifact(existingRequestArtifact.artifact) } : {}),
        requestArtifactId: identity.requestArtifactId,
        requestId: identity.requestId,
        candidateKey: identity.candidateKey,
        fixedJsonPath: identity.fixedJsonPath,
        fixedMarkdownPath: identity.fixedMarkdownPath,
        expectedRepairWorkCardId: identity.expectedRepairWorkCardId,
        expectedRepairWorkCardArtifactId: identity.expectedRepairWorkCardArtifactId,
        targetSnapshot,
        governanceFlags: governanceRepairFalseFlags(),
        operatorConcern,
        operatorExpectedRoute: GOVERNANCE_REPAIR_EXPECTED_ROUTE,
        evidenceSnapshot,
      },
    };
  }
}

async function collectGovernancePairs(project: ConfiguredProject): Promise<RepairScanPair[]> {
  const files = await collectFiles(project.planningRoot);
  const stems = new Map<string, { json?: string; markdown?: string }>();
  for (const absolutePath of files) {
    const extension = path.extname(absolutePath).toLowerCase();
    if (extension !== ".json" && extension !== ".md") continue;
    const repoPath = toRepoPath(project.repositoryRoot, absolutePath);
    if (!isApprovedGovernanceSinglePath(repoPath)) continue;
    const stem = absolutePath.slice(0, -extension.length);
    const pair = stems.get(stem) ?? {};
    if (extension === ".json") pair.json = absolutePath;
    else pair.markdown = absolutePath;
    stems.set(stem, pair);
  }
  const pairs: RepairScanPair[] = [];
  for (const [stem, pair] of stems) {
    const jsonPath = toRepoPath(project.repositoryRoot, pair.json ?? `${stem}.json`);
    const markdownPath = toRepoPath(project.repositoryRoot, pair.markdown ?? `${stem}.md`);
    pairs.push({
      jsonPath,
      markdownPath,
      jsonContent: pair.json ? await readFile(pair.json, "utf8") : null,
      markdownContent: pair.markdown ? await readFile(pair.markdown, "utf8") : null,
    });
  }
  return pairs;
}

async function collectFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  };
  await visit(root);
  return files;
}

async function candidateFromAnalysis(
  analysis: GovernancePairRepairAnalysis,
  registryStatus: GovernanceRepairCandidate["registryStatus"],
  strictErrors: readonly string[],
  registry: ArtifactRegistry | null,
  projectRoot: string,
  projectId: string,
  registryRevision: number,
  artifactPairs: ArtifactPairService,
): Promise<GovernanceRepairCandidate> {
  const registeredMissing =
    analysis.repairKind === "none" &&
    analysis.artifact !== undefined &&
    analysis.payloadImpact === "unchanged" &&
    registryStatus === "missing_registration";
  const semanticProposal =
    analysis.artifact && !analysis.safelyRepairable
      ? await buildSemanticRepairProposal(analysis.artifact, analysis, registry, registryStatus, projectRoot)
      : undefined;
  const semanticResolvable =
    Boolean(semanticProposal) &&
    semanticProposal?.safeToApplyAutomaticallyAfterOperatorConfirmation === true;
  const semanticReviewable =
    Boolean(semanticProposal) &&
    !semanticProposal?.collision &&
    semanticProposal?.conflictingCandidates.length === 0 &&
    !semanticProposal?.unresolvedReferenceMigration;
  const automaticRepairable =
    analysis.safelyRepairable ||
    (registeredMissing && repairableFixedPath(analysis.jsonPath));
  const safelyRepairable = automaticRepairable || semanticResolvable;
  const repairKind = analysis.safelyRepairable
    ? analysis.repairKind
    : registeredMissing && repairableFixedPath(analysis.jsonPath)
      ? "missing_registry_registration"
      : semanticProposal
        ? semanticProposal.safeToApplyAutomaticallyAfterOperatorConfirmation
          ? "semantic_identity_repair"
          : "semantic_identity_repair"
      : "none";
  const duplicateDiagnostic = semanticProposal?.duplicateReconciliation
    ? "An earlier application save created a numbered duplicate instead of revising the fixed canonical validation record. Two records now compete for one canonical artifact identity."
    : undefined;
  const blockReason = safelyRepairable
    ? duplicateDiagnostic
    : semanticReviewable
      ? semanticProposal?.duplicateReconciliation
        ? duplicateDiagnostic
        : semanticProposal?.requiredDisposition === "numbered_legacy_path"
          ? "Operator review required before migrating this numbered record to the canonical fixed path."
          : "Operator review required before applying this semantic identity repair."
    : duplicateDiagnostic ??
      analysis.blockReason ??
      (registryStatus === "registry_disagreement"
        ? "Registry metadata disagrees with the artifact."
        : "The defect is not safely repairable by canonical serialization.");
  const irreconcilable = !semanticProposal && repairKind === "none" && !automaticRepairable;
  const issueClassification =
    repairKind === "missing_registry_registration"
      ? "missing_registry_registration"
      : repairKind === "canonical_serialization_repair"
        ? "noncanonical_serialization"
        : semanticProposal
          ? "semantic_identity_mismatch"
          : irreconcilable
            ? "irreconcilable_semantic_conflict"
        : "incomplete_or_semantic_mismatch";
  const itemStatus: GovernanceRepairCandidate["itemStatus"] =
    automaticRepairable
      ? "automatic_repair_available"
      : semanticProposal
        ? "operator_semantic_decision_required"
        : "irreconcilable_conflict";
  const baseCandidate: GovernanceRepairCandidate = {
    artifactId: analysis.artifactId,
    artifactType: analysis.artifactType,
    ...(analysis.artifact?.phaseId === undefined ? {} : { phaseId: analysis.artifact.phaseId }),
    ...(analysis.artifact?.workCardId === undefined ? {} : { workCardId: analysis.artifact.workCardId }),
    revision: analysis.revision,
    status: analysis.artifact?.status ?? "unknown",
    payloadHash: analysis.artifact?.payloadHash ?? "unknown",
    jsonPath: analysis.jsonPath,
    markdownPath: analysis.markdownPath,
    verificationError:
      strictErrors.join(" ") ||
      (registeredMissing
        ? "Canonical pair is missing from the Artifact Registry."
        : analysis.verificationError),
    registryStatus,
    safelyRepairable,
    payloadContentWouldChange: analysis.payloadImpact === "would_change",
    payloadImpact: analysis.payloadImpact,
    repairKind,
    issueClassification,
    repairStatus: safelyRepairable ? "repairable" : semanticReviewable ? "review_available" : "blocked",
    itemStatus,
    routeStatus: "governance_maintenance_required",
    operationLabel:
      repairKind === "canonical_serialization_repair"
        ? "Canonicalize pair"
        : repairKind === "missing_registry_registration"
          ? "Register canonical pair"
          : semanticProposal?.duplicateReconciliation
            ? "Duplicate Artifact Cleanup"
          : semanticProposal
            ? "Review semantic repair"
            : "Create repair request",
    canAffectCurrentRouting: canAffectCurrentRouting(
      analysis.artifactType,
      analysis.artifact?.status ?? "unknown",
    ),
    candidateFingerprint: "",
    ...(semanticProposal ? { semanticProposal } : {}),
    ...(blockReason ? { blockReason } : {}),
  };
  baseCandidate.candidateFingerprint = candidateFingerprint(baseCandidate);
  const existingSpecificationRequest = await findExistingSpecificationRequest(
    artifactPairs,
    projectId,
    baseCandidate,
    registryRevision,
  );
  return {
    ...baseCandidate,
    ...(existingSpecificationRequest ? { existingSpecificationRequest } : {}),
  };
}

function buildSemanticRepairProposal(
  artifact: CanonicalArtifact,
  analysis: GovernancePairRepairAnalysis,
  registry: ArtifactRegistry | null,
  registryStatus: GovernanceRepairCandidate["registryStatus"],
  projectRoot: string,
): Promise<GovernanceRepairCandidate["semanticProposal"] | undefined> {
  return buildTypedSemanticRepairProposal({
    artifact,
    jsonPath: analysis.jsonPath,
    markdownPath: analysis.markdownPath,
    registry,
    registryStatus,
    projectRoot,
  });
}

async function deterministicCandidateFromPair(input: {
  analysis: GovernancePairRepairAnalysis;
  pairs: readonly RepairScanPair[];
  registry: ArtifactRegistry | null;
  registryStatus: GovernanceRepairCandidate["registryStatus"];
  strictErrors: readonly string[];
  registryRevision: number;
}): Promise<GovernanceRepairCandidate | null> {
  const artifact = input.analysis.artifact;
  if (!artifact) return null;

  const superseded = explicitSupersededPathPlan({
    artifact,
    pair: input.analysis,
    pairs: input.pairs,
    registry: input.registry,
  });
  if (superseded) {
    return deterministicCandidate({
      analysis: input.analysis,
      strictErrors: input.strictErrors,
      registryStatus: input.registryStatus,
      repairKind: "explicit_superseded_path_cleanup",
      operationLabel: "Delete explicit superseded path",
      verificationError: "Superseded pair explicitly names the authoritative synchronized active pair.",
      blockReason: "The superseded JSON/Markdown pair is not Registry authority and can be deleted.",
      payloadImpact: "unchanged",
      plan: superseded,
    });
  }

  const stale = staleRegistryRefreshPlan({
    artifact,
    analysis: input.analysis,
    registry: input.registry,
    registryStatus: input.registryStatus,
  });
  if (stale) {
    return deterministicCandidate({
      analysis: input.analysis,
      strictErrors: input.strictErrors,
      registryStatus: input.registryStatus,
      repairKind: "stale_registry_entry_refresh",
      operationLabel: "Refresh stale Registry entry",
      verificationError: "Canonical pair is synchronized; Registry metadata is stale.",
      blockReason: "Only the Artifact Registry entry and Registry pair will be refreshed.",
      payloadImpact: "unchanged",
      plan: stale,
    });
  }

  const closeout = legacyCloseoutPlan({
    artifact,
    pairs: input.pairs,
    registry: input.registry,
  });
  if (closeout) {
    return deterministicCandidate({
      analysis: input.analysis,
      strictErrors: input.strictErrors,
      registryStatus: input.registryStatus,
      repairKind: "legacy_closeout_normalization",
      operationLabel: "Normalize legacy closeout record",
      verificationError: "Legacy closeout supporting document needs historical phase-scoped identity.",
      blockReason: closeout.previewSummary,
      payloadImpact: "unchanged",
      plan: closeout,
    });
  }

  return null;
}

function deterministicCandidate(input: {
  analysis: GovernancePairRepairAnalysis;
  strictErrors: readonly string[];
  registryStatus: GovernanceRepairCandidate["registryStatus"];
  repairKind: GovernanceRepairCandidate["repairKind"];
  operationLabel: GovernanceRepairCandidate["operationLabel"];
  verificationError: string;
  blockReason: string;
  payloadImpact: GovernanceRepairCandidate["payloadImpact"];
  plan: NonNullable<GovernanceRepairCandidate["deterministicRepairPlan"]>;
}): GovernanceRepairCandidate {
  const artifact = input.analysis.artifact!;
  const candidate: GovernanceRepairCandidate = {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    ...(artifact.phaseId === undefined ? {} : { phaseId: artifact.phaseId }),
    ...(artifact.workCardId === undefined ? {} : { workCardId: artifact.workCardId }),
    revision: artifact.revision,
    status: artifact.status,
    payloadHash: artifact.payloadHash,
    jsonPath: input.analysis.jsonPath,
    markdownPath: input.analysis.markdownPath,
    verificationError: input.strictErrors.join(" ") || input.verificationError,
    registryStatus: input.registryStatus,
    safelyRepairable: true,
    payloadContentWouldChange: false,
    payloadImpact: input.payloadImpact,
    repairKind: input.repairKind,
    issueClassification:
      input.repairKind === "stale_registry_entry_refresh"
        ? "missing_registry_registration"
        : "semantic_identity_mismatch",
    repairStatus: "repairable",
    itemStatus: "automatic_repair_available",
    routeStatus: "governance_maintenance_required",
    operationLabel: input.operationLabel,
    canAffectCurrentRouting: false,
    candidateFingerprint: "",
    deterministicRepairPlan: input.plan,
    blockReason: input.blockReason,
  };
  candidate.candidateFingerprint = candidateFingerprint(candidate);
  return candidate;
}

function explicitSupersededPathPlan(input: {
  artifact: CanonicalArtifact;
  pair: GovernancePairRepairAnalysis;
  pairs: readonly RepairScanPair[];
  registry: ArtifactRegistry | null;
}): GovernanceRepairCandidate["deterministicRepairPlan"] | null {
  if (input.artifact.status !== "superseded") return null;
  const data = input.artifact.payload.data;
  if (!isPlainRecord(data) || data.status !== "superseded_path") return null;
  const activeJsonPath = stringField(data, "activeJsonPath") ??
    stringField(data, "authoritativeJsonPath") ??
    stringField(data, "supersededByJsonPath") ??
    stringField(data, "activePairJsonPath");
  const activeMarkdownPath = stringField(data, "activeMarkdownPath") ??
    stringField(data, "authoritativeMarkdownPath") ??
    stringField(data, "supersededByMarkdownPath") ??
    stringField(data, "activePairMarkdownPath");
  if (!activeJsonPath || !activeMarkdownPath) return null;
  const activePair = input.pairs.find(
    (pair) => pair.jsonPath === activeJsonPath && pair.markdownPath === activeMarkdownPath,
  );
  if (!activePair?.jsonContent || !activePair.markdownContent) return null;
  const activeVerification = verifyArtifactPair({
    jsonArtifact: activePair.jsonContent,
    markdown: activePair.markdownContent,
    jsonPath: activeJsonPath,
    markdownPath: activeMarkdownPath,
  });
  const active = activeVerification.artifact;
  if (!activeVerification.valid || !activeVerification.synchronized || !active) return null;
  if (active.artifactId !== input.artifact.artifactId || active.status === "superseded") return null;
  const activeEntry = input.registry?.entries.find(
    (entry) =>
      entry.artifactId === active.artifactId &&
      entry.jsonPath === activeJsonPath &&
      entry.markdownPath === activeMarkdownPath &&
      entry.revision === active.revision &&
      entry.payloadHash === active.payloadHash &&
      entry.authoritative &&
      entry.synchronized,
  );
  const supersededEntry = input.registry?.entries.find(
    (entry) => entry.jsonPath === input.pair.jsonPath || entry.markdownPath === input.pair.markdownPath,
  );
  if (!activeEntry || supersededEntry) return null;
  return {
    title: "Delete explicit superseded path",
    affectedFiles: [input.pair.jsonPath, input.pair.markdownPath],
    affectedRegistryEntries: [activeEntry.artifactId],
    activeJsonPath,
    activeMarkdownPath,
    previewSummary: "Deletes only the explicit superseded JSON/Markdown pair; active pair and Registry remain unchanged.",
  };
}

function staleRegistryRefreshPlan(input: {
  artifact: CanonicalArtifact;
  analysis: GovernancePairRepairAnalysis;
  registry: ArtifactRegistry | null;
  registryStatus: GovernanceRepairCandidate["registryStatus"];
}): GovernanceRepairCandidate["deterministicRepairPlan"] | null {
  if (input.registryStatus !== "registry_disagreement") return null;
  if (hasSemanticIdentityRepairNeed(input.analysis)) return null;
  const entries = input.registry?.entries.filter(
    (entry) =>
      entry.artifactId === input.artifact.artifactId ||
      entry.jsonPath === input.artifact.jsonPath ||
      entry.markdownPath === input.artifact.markdownPath,
  ) ?? [];
  if (entries.length !== 1) return null;
  const entry = entries[0];
  if (
    entry.artifactId !== input.artifact.artifactId ||
    entry.artifactType !== input.artifact.artifactType ||
    entry.projectId !== input.artifact.projectId ||
    entry.jsonPath !== input.artifact.jsonPath ||
    entry.markdownPath !== input.artifact.markdownPath ||
    entry.status !== input.artifact.status
  ) {
    return null;
  }
  if (entry.revision === input.artifact.revision && entry.payloadHash === input.artifact.payloadHash) {
    return null;
  }
  return {
    title: "Refresh stale Registry entry",
    affectedFiles: [ARTIFACT_REGISTRY_JSON_PATH, ARTIFACT_REGISTRY_MARKDOWN_PATH],
    affectedRegistryEntries: [entry.artifactId],
    previewSummary: "Updates only stale Registry metadata for the verified pair; the artifact pair is not rewritten.",
  };
}

function legacyCloseoutPlan(input: {
  artifact: CanonicalArtifact;
  pairs: readonly RepairScanPair[];
  registry: ArtifactRegistry | null;
}): GovernanceRepairCandidate["deterministicRepairPlan"] | null {
  const target = legacyCloseoutTarget(input.artifact);
  if (!target) return null;
  const alreadyNormalized =
    input.artifact.artifactId === target.artifactId &&
    input.artifact.status === "historical" &&
    input.artifact.phaseId === target.phaseId &&
    input.artifact.jsonPath === target.jsonPath &&
    input.artifact.markdownPath === target.markdownPath &&
    input.registry?.entries.some(
      (entry) =>
        entry.artifactId === target.artifactId &&
        entry.jsonPath === target.jsonPath &&
        entry.markdownPath === target.markdownPath &&
        entry.revision === input.artifact.revision &&
        entry.payloadHash === input.artifact.payloadHash,
    );
  if (alreadyNormalized) return null;
  const fixedPairExists = input.pairs.some(
    (pair) =>
      pair.jsonPath === target.jsonPath &&
      pair.markdownPath === target.markdownPath &&
      pair.jsonPath !== input.artifact.jsonPath,
  );
  return {
    title: "Normalize legacy closeout record",
    affectedFiles: uniqueSorted([
      input.artifact.jsonPath,
      input.artifact.markdownPath,
      target.jsonPath,
      target.markdownPath,
      ARTIFACT_REGISTRY_JSON_PATH,
      ARTIFACT_REGISTRY_MARKDOWN_PATH,
    ]),
    affectedRegistryEntries: uniqueSorted([
      input.artifact.artifactId,
      target.artifactId,
      ...(fixedPairExists ? [`${target.artifactId} duplicate at fixed path`] : []),
    ]),
    requiresDuplicateDisposition: fixedPairExists,
    fixedRecordLabel: "Keep fixed closeout and delete numbered duplicate",
    numberedRecordLabel: "Keep numbered closeout as fixed revision and delete duplicate",
    previewSummary: fixedPairExists
      ? "Requires one whole-record Operator selection, then writes one historical phase-scoped supporting document and deletes the duplicate pair."
      : "Writes one historical phase-scoped supporting document at the fixed closeout path without creating phase_closeout authority.",
  };
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
  if (!match || artifact.markdownPath !== artifact.jsonPath.replace(/\.json$/, ".md")) return null;
  return {
    phaseId: match[1],
    artifactId: `${artifact.projectId}/${match[1]}/supporting_document/${match[2]}`,
    jsonPath: `planning/phases/${match[1]}/Closeout_Reports/${match[2]}.json`,
    markdownPath: `planning/phases/${match[1]}/Closeout_Reports/${match[2]}.md`,
  };
}

function hasSemanticIdentityRepairNeed(analysis: GovernancePairRepairAnalysis): boolean {
  if (!analysis.artifact) return false;
  const phase = phaseFromSynchronizedPaths(analysis.jsonPath, analysis.markdownPath);
  if (!phase) return false;
  if (analysis.artifact.phaseId && analysis.artifact.phaseId !== phase.phaseId) return true;
  const proposed = proposedArtifactIdFor(analysis.artifact, phase.phaseId);
  return Boolean(proposed && proposed !== analysis.artifact.artifactId);
}

function registryStatusFor(
  registry: ArtifactRegistry | null,
  artifact: CanonicalArtifact,
): GovernanceRepairCandidate["registryStatus"] {
  if (!registry) return "registry_unavailable";
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

function buildPreview(candidates: GovernanceRepairCandidate[]): GovernanceRepairPreviewResult {
  const repairableCount = candidates.filter((candidate) => candidate.safelyRepairable).length;
  const payloadContentSummary =
    candidates.some((candidate) => candidate.payloadImpact === "unknown")
      ? "Payload impact could not be determined for one or more records."
      : candidates.some((candidate) => candidate.payloadImpact === "would_change")
        ? "One or more candidates would change payload content."
        : "Payload content unchanged.";
  return {
    ok: candidates.length === 0 || candidates.every((candidate) => candidate.safelyRepairable),
    blockedMessage: "Governance records require canonical repair.",
    candidates,
    repairableCount,
    payloadContentSummary,
  };
}

function isApprovedGovernancePath(jsonPath: string, markdownPath: string): boolean {
  return jsonPath.replace(/\.json$/i, ".md") === markdownPath &&
    isApprovedGovernanceSinglePath(jsonPath) &&
    isApprovedGovernanceSinglePath(markdownPath);
}

function isApprovedGovernanceSinglePath(repoPath: string): boolean {
  if (repoPath.includes("/archive/")) return false;
  if (repoPath === ARTIFACT_REGISTRY_JSON_PATH || repoPath === ARTIFACT_REGISTRY_MARKDOWN_PATH) {
    return true;
  }
  return repoPath.startsWith("planning/phases/") ||
    repoPath.startsWith("planning/project/") ||
    repoPath.startsWith("planning/system/");
}

function repairableFixedPath(jsonPath: string): boolean {
  const stem = path.posix.basename(jsonPath, ".json");
  return !/_\d+$/.test(stem);
}

function phaseFromSynchronizedPaths(
  jsonPath: string,
  markdownPath: string,
): { phaseId: string } | null {
  const json = jsonPath.match(/^planning\/phases\/([^/]+)\//);
  const markdown = markdownPath.match(/^planning\/phases\/([^/]+)\//);
  if (!json || !markdown || json[1] !== markdown[1]) return null;
  const phaseId = json[1];
  return /^phase-\d{2,}$/.test(phaseId) ? { phaseId } : null;
}

function proposedArtifactIdFor(
  artifact: CanonicalArtifact,
  proposedPhaseId: string,
): string | null {
  const segments = artifact.artifactId.split("/");
  if (segments.length < 3 || segments[0] !== artifact.projectId) return null;
  if (segments[1] === proposedPhaseId) return artifact.artifactId;
  if (/^phase-\d{2,}$/.test(segments[1] ?? "")) return null;
  if (segments[1] !== artifact.artifactType) return null;
  const logicalId = segments.slice(2).join("/");
  if (!logicalId) return null;
  return `${artifact.projectId}/${proposedPhaseId}/${artifact.artifactType}/${logicalId}`;
}

function proposedCanonicalPaths(jsonPath: string, markdownPath: string): {
  jsonPath: string;
  markdownPath: string;
} {
  const jsonStem = jsonPath.slice(0, -".json".length).replace(/_\d+$/, "");
  const markdownStem = markdownPath.slice(0, -".md".length).replace(/_\d+$/, "");
  return {
    jsonPath: `${jsonStem}.json`,
    markdownPath: `${markdownStem}.md`,
  };
}

function logicalIdentityWithoutPhase(artifact: CanonicalArtifact): string {
  const segments = artifact.artifactId.split("/");
  const logicalSegments = /^phase-\d{2,}$/.test(segments[1] ?? "")
    ? [segments[0], segments[2], ...segments.slice(3)]
    : [segments[0], segments[1], ...segments.slice(2)];
  return logicalSegments.join("/");
}

function findSameLogicalRegisteredPhaseConflict(
  registry: ArtifactRegistry | null,
  artifact: CanonicalArtifact,
  proposedPhaseId: string,
): ArtifactRegistryEntry | null {
  if (!registry) return null;
  const logical = logicalIdentityWithoutPhase(artifact);
  return (
    registry.entries.find((entry) => {
      if (entry.artifactId === artifact.artifactId) return false;
      if (entry.artifactType !== artifact.artifactType) return false;
      const entryLogical = logicalIdentityWithoutPhase({
        ...artifact,
        artifactId: entry.artifactId,
        artifactType: entry.artifactType,
      });
      return entryLogical === logical && entry.phaseId !== proposedPhaseId;
    }) ?? null
  );
}

function collisionFor(
  registry: ArtifactRegistry | null,
  proposedArtifactId: string,
  proposedJsonPath: string,
  proposedMarkdownPath: string,
): string | undefined {
  const collision = registry?.entries.find(
    (entry) =>
      entry.artifactId === proposedArtifactId ||
      entry.jsonPath === proposedJsonPath ||
      entry.markdownPath === proposedMarkdownPath,
  );
  if (!collision) return undefined;
  return `Registry collision with ${collision.artifactId}`;
}

function inboundReferencesFor(
  registry: ArtifactRegistry | null,
  artifactId: string,
): string[] {
  if (!registry) return [];
  return registry.entries
    .filter((entry) =>
      [
        ...entry.relationships.sources,
        ...entry.relationships.expectedOutputs,
        ...entry.relationships.supersedes,
        ...entry.relationships.children,
        entry.parentArtifactId ?? "",
      ].includes(artifactId),
    )
    .map((entry) => entry.artifactId);
}

function registryEntrySummary(entry: ArtifactRegistryEntry): string {
  return `${entry.artifactId} / rev ${entry.revision} / ${entry.jsonPath}`;
}

function compareRepairCandidates(
  left: GovernanceRepairCandidate,
  right: GovernanceRepairCandidate,
): number {
  return issueRank(left.issueClassification) - issueRank(right.issueClassification) ||
    left.artifactId.localeCompare(right.artifactId) ||
    left.jsonPath.localeCompare(right.jsonPath);
}

function filterFixedHalvesOfDuplicateCleanup(
  candidates: GovernanceRepairCandidate[],
): GovernanceRepairCandidate[] {
  const fixedDuplicateIds = new Set(
    candidates
      .map((candidate) => candidate.semanticProposal?.duplicateReconciliation?.fixedPathRecord.artifactId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  if (fixedDuplicateIds.size === 0) return candidates;
  return candidates.filter((candidate) => !fixedDuplicateIds.has(candidate.artifactId));
}

function issueRank(issue: GovernanceRepairCandidate["issueClassification"]): number {
  if (issue === "semantic_identity_mismatch") return 1;
  if (issue === "incomplete_or_semantic_mismatch") return 1;
  if (issue === "noncanonical_serialization") return 2;
  if (issue === "irreconcilable_semantic_conflict") return 3;
  return 3;
}

function canAffectCurrentRouting(artifactType: string, status: string): boolean {
  return (
    ["active", "pending", "blocked"].includes(status) &&
    [
      "phase_planning",
      "work_card_plan",
      "work_card",
      "operator_approval",
      "implementer_report",
      "architect_review",
      "operator_validation",
      "candidate_disposition",
      "phase_closeout",
      "phase_activation",
      "project_roadmap",
    ].includes(artifactType)
  );
}

export function buildGovernanceRepairSpecificationIdentity(input: {
  projectId: string;
  targetArtifactId: string;
  targetJsonPath: string;
  targetMarkdownPath: string;
  phaseId: string;
}): {
  candidateKey: string;
  requestId: string;
  requestArtifactId: string;
  fixedJsonPath: string;
  fixedMarkdownPath: string;
  expectedRepairWorkCardId: string;
  expectedRepairWorkCardArtifactId: string;
} {
  const hashInput = [
    input.projectId,
    input.targetArtifactId,
    input.targetJsonPath,
    input.targetMarkdownPath,
  ].join("\n");
  const candidateKey = createHash("sha256").update(hashInput, "utf8").digest("hex").slice(0, 16);
  const requestId = `GOVERNANCE_REPAIR_${candidateKey}`;
  const workCardSuffix = candidateKey.slice(0, 8).toUpperCase();
  const expectedRepairWorkCardId = `GOV-REPAIR-${workCardSuffix}`;
  return {
    candidateKey,
    requestId,
    requestArtifactId: `${input.projectId}/system/route_review_request/${requestId}`,
    fixedJsonPath: `planning/system/Route_Review_Requests/${requestId}.json`,
    fixedMarkdownPath: `planning/system/Route_Review_Requests/${requestId}.md`,
    expectedRepairWorkCardId,
    expectedRepairWorkCardArtifactId:
      `${input.projectId}/${input.phaseId}/work_card/${expectedRepairWorkCardId}`,
  };
}

function candidateFingerprint(candidate: GovernanceRepairCandidate): string {
  return `sha256:${createHash("sha256")
    .update(
      canonicalStringify({
        artifactId: candidate.artifactId,
        artifactType: candidate.artifactType,
        revision: candidate.revision,
        status: candidate.status,
        jsonPath: candidate.jsonPath,
        markdownPath: candidate.markdownPath,
        repairKind: candidate.repairKind,
        issueClassification: candidate.issueClassification,
        itemStatus: candidate.itemStatus,
        repairStatus: candidate.repairStatus,
        registryStatus: candidate.registryStatus,
        blockReason: candidate.blockReason ?? null,
        verificationError: candidate.verificationError,
        semanticProposal: candidate.semanticProposal
          ? {
              proposedArtifactId: candidate.semanticProposal.proposedArtifactId,
              proposedJsonPath: candidate.semanticProposal.proposedJsonPath,
              proposedMarkdownPath: candidate.semanticProposal.proposedMarkdownPath,
              collision: candidate.semanticProposal.collision ?? null,
              conflictingCandidates: [...candidate.semanticProposal.conflictingCandidates].sort(),
              unresolvedReferenceMigration:
                candidate.semanticProposal.unresolvedReferenceMigration ?? null,
              duplicateReconciliation:
                candidate.semanticProposal.duplicateReconciliation
                  ? {
                      numberedRecord:
                        candidate.semanticProposal.duplicateReconciliation.numberedRecord.artifactId,
                      fixedPathRecord:
                        candidate.semanticProposal.duplicateReconciliation.fixedPathRecord.artifactId,
                    }
                  : null,
            }
          : null,
      }),
      "utf8",
    )
    .digest("hex")}`;
}

function buildGovernanceTargetSnapshot(input: {
  projectId: string;
  candidate: GovernanceRepairCandidate;
  projectionRevision: number;
  registryRevision: number;
}): GovernanceRepairSpecificationTargetSnapshot {
  const proposal = input.candidate.semanticProposal;
  return {
    projectId: input.projectId,
    targetArtifactId: input.candidate.artifactId,
    artifactType: input.candidate.artifactType,
    status: input.candidate.status,
    revision: input.candidate.revision,
    jsonPath: input.candidate.jsonPath,
    markdownPath: input.candidate.markdownPath,
    ...(input.candidate.phaseId ? { phaseId: input.candidate.phaseId } : {}),
    ...(input.candidate.workCardId ? { workCardId: input.candidate.workCardId } : {}),
    ...(proposal?.currentParentArtifactId ? { parentArtifactId: proposal.currentParentArtifactId } : {}),
    repairKind: input.candidate.repairKind,
    issueType: input.candidate.issueClassification,
    itemStatus: input.candidate.itemStatus,
    repairStatus: input.candidate.repairStatus,
    operationLabel: input.candidate.operationLabel,
    ...(input.candidate.blockReason ? { blockReason: input.candidate.blockReason } : {}),
    verificationError: input.candidate.verificationError,
    registryStatus: input.candidate.registryStatus,
    ...(proposal?.collision ? { collision: proposal.collision } : {}),
    conflictingCandidateDescriptions: uniqueSorted([
      ...(proposal?.conflictingCandidates ?? []),
      ...(proposal?.duplicateReconciliation
        ? [
            proposal.duplicateReconciliation.numberedRecord.artifactId,
            proposal.duplicateReconciliation.fixedPathRecord.artifactId,
          ]
        : []),
    ]),
    ...(proposal?.unresolvedReferenceMigration
      ? { unresolvedReferenceMigration: proposal.unresolvedReferenceMigration }
      : {}),
    ...(proposal?.proposedArtifactId ? { proposedCanonicalArtifactId: proposal.proposedArtifactId } : {}),
    ...(proposal?.proposedPhaseId ? { proposedPhaseId: proposal.proposedPhaseId } : {}),
    ...(proposal?.proposedWorkCardId ? { proposedWorkCardId: proposal.proposedWorkCardId } : {}),
    ...(proposal?.proposedJsonPath ? { proposedJsonPath: proposal.proposedJsonPath } : {}),
    ...(proposal?.proposedMarkdownPath ? { proposedMarkdownPath: proposal.proposedMarkdownPath } : {}),
    sourceArtifactIds: uniqueSorted([
      ...(proposal?.conflictingCandidates ?? []),
      ...(proposal?.duplicateReconciliation
        ? [
            proposal.duplicateReconciliation.numberedRecord.artifactId,
            proposal.duplicateReconciliation.fixedPathRecord.artifactId,
          ]
        : []),
      ...(proposal?.inboundReferences.map((reference) => reference.artifactId) ?? []),
      ...(proposal?.outboundReferences ?? []),
    ]),
    canAffectRouting: input.candidate.canAffectCurrentRouting,
    projectionRevision: input.projectionRevision,
    candidateFingerprint: input.candidate.candidateFingerprint,
    registryRevision: input.registryRevision,
  };
}

function buildGovernanceEvidenceSnapshot(
  candidate: GovernanceRepairCandidate,
  target: GovernanceRepairSpecificationTargetSnapshot,
): RouteReviewEvidenceSnapshot {
  const proposal = candidate.semanticProposal;
  return {
    acceptedOrControlling: [
      `Selected pair: ${candidate.artifactId} / ${candidate.jsonPath} / ${candidate.markdownPath}`,
      `Registry status: ${candidate.registryStatus}`,
      ...(candidate.phaseId ? [`Phase evidence: ${candidate.phaseId}`] : []),
      ...(candidate.workCardId ? [`Work Card evidence: ${candidate.workCardId}`] : []),
      `Current projection revision: ${target.projectionRevision}`,
    ],
    presentPendingDisposition: [
      ...target.conflictingCandidateDescriptions.map((value) => `Conflicting artifact identity: ${value}`),
      ...(proposal?.proposedJsonPath ? [`Proposed JSON path: ${proposal.proposedJsonPath}`] : []),
      ...(proposal?.proposedMarkdownPath ? [`Proposed Markdown path: ${proposal.proposedMarkdownPath}`] : []),
      ...(proposal?.basisSummary ? [`Semantic alternative: ${proposal.basisSummary}`] : []),
    ],
    missingRequired: [
      "Bounded Architect repair specification",
      "Exact repair Work Card authority",
    ],
    nonControlling: [
      ...(proposal?.duplicateReconciliation
        ? proposal.duplicateReconciliation.actualPayloadDifferences.map(
            (value) => `Duplicate payload distinction pending disposition: ${value}`,
          )
        : []),
    ],
    ambiguityWarnings: [
      ...(proposal?.collision ? [`Collision: ${proposal.collision}`] : []),
      ...target.conflictingCandidateDescriptions.map((value) => `Conflicting candidate: ${value}`),
      ...(proposal?.unresolvedReferenceMigration
        ? [`Unsafe reference migration: ${proposal.unresolvedReferenceMigration}`]
        : []),
      candidate.blockReason ?? candidate.verificationError,
    ].filter(Boolean),
  };
}

function governanceRepairFalseFlags() {
  return {
    changesTargetArtifact: false,
    approvesTargetArtifact: false,
    resolvesCandidate: false,
    createsWorkCard: false,
    authorizesImplementation: false,
    advancesWorkflow: false,
    changesNormalWorkflowAuthority: false,
  } as const;
}

async function findExistingSpecificationRequest(
  artifactPairs: ArtifactPairService,
  projectId: string,
  candidate: GovernanceRepairCandidate,
  registryRevision: number,
): Promise<GovernanceRepairSpecificationRequestSummary | undefined> {
  const phaseId = candidate.phaseId ?? "phase-unmapped";
  const identity = buildGovernanceRepairSpecificationIdentity({
    projectId,
    targetArtifactId: candidate.artifactId,
    targetJsonPath: candidate.jsonPath,
    targetMarkdownPath: candidate.markdownPath,
    phaseId,
  });
  const existing = await readExistingRequest(
    artifactPairs,
    identity.fixedJsonPath,
    identity.fixedMarkdownPath,
    identity.requestArtifactId,
  );
  if (!existing) return undefined;
  const data = existing.artifact.payload.data as unknown as RouteReviewRequestRecord;
  if (
    data.requestPurpose !== "governance_repair_specification" ||
    data.status !== "pending_architect_specification" ||
    data.governanceTargetSnapshot?.targetArtifactId !== candidate.artifactId ||
    data.governanceTargetSnapshot?.jsonPath !== candidate.jsonPath ||
    data.governanceTargetSnapshot?.markdownPath !== candidate.markdownPath
  ) {
    return undefined;
  }
  if (registryRevision > 0 && data.governanceTargetSnapshot.registryRevision > registryRevision) {
    return undefined;
  }
  return summaryFromArtifact(existing.artifact);
}

async function readExistingRequest(
  artifactPairs: ArtifactPairService,
  jsonPath: string,
  markdownPath: string,
  artifactId: string,
): Promise<Awaited<ReturnType<ArtifactPairService["readArtifactByPaths"]>> | undefined> {
  try {
    const existing = await artifactPairs.readArtifactByPaths(jsonPath, markdownPath);
    if (
      existing.artifact.artifactId !== artifactId ||
      existing.artifact.artifactType !== "route_review_request"
    ) {
      throw new Error("Fixed governance repair request path contains a different artifact.");
    }
    return existing;
  } catch (error) {
    if (error instanceof ArtifactPairServiceError && error.code === "not_found") return undefined;
    throw error;
  }
}

function summaryFromArtifact(artifact: CanonicalArtifact): GovernanceRepairSpecificationRequestSummary {
  const data = artifact.payload.data as unknown as Partial<RouteReviewRequestRecord>;
  const target = data.governanceTargetSnapshot;
  const identity = buildGovernanceRepairSpecificationIdentity({
    projectId: artifact.projectId,
    targetArtifactId: target?.targetArtifactId ?? "",
    targetJsonPath: target?.jsonPath ?? "",
    targetMarkdownPath: target?.markdownPath ?? "",
    phaseId: data.phase ?? artifact.phaseId ?? "phase-unmapped",
  });
  return {
    artifactId: artifact.artifactId,
    requestId: data.requestId ?? path.posix.basename(artifact.jsonPath, ".json"),
    status: data.status ?? artifact.status,
    revision: artifact.revision,
    jsonPath: artifact.jsonPath,
    markdownPath: artifact.markdownPath,
    candidateKey: identity.candidateKey,
    expectedRepairWorkCardId:
      data.expectedRepairWorkCard?.workCardId ?? identity.expectedRepairWorkCardId,
    expectedRepairWorkCardArtifactId:
      data.expectedRepairWorkCard?.artifactId ?? identity.expectedRepairWorkCardArtifactId,
  };
}

function operatorNoteFromConcern(concern: string): string {
  const marker = "\n\nAdditional Operator note:\n";
  const index = concern.indexOf(marker);
  return index === -1 ? "" : concern.slice(index + marker.length).trim();
}

function normalizeOperatorNote(note: string | undefined): string {
  return note?.trim().replace(/\r\n?/g, "\n") ?? "";
}

function stringField(value: unknown, key: string): string | undefined {
  return isPlainRecord(value) && typeof value[key] === "string" && value[key].trim()
    ? value[key].trim()
    : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort();
}

function toRepoPath(repositoryRoot: string, absolutePath: string): string {
  const relative = path.relative(repositoryRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Governance repair scan attempted to leave the selected project.");
  }
  return relative.replaceAll("\\", "/");
}

function plainError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
