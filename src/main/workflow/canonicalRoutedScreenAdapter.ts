import path from "node:path";

import {
  isAuthorityEligibleStatus,
  type ArtifactRegistry,
  type ArtifactRegistryEntry,
  type CanonicalArtifact,
} from "../../shared/artifacts";
import {
  type CanonicalRoutedArtifactView,
  type CanonicalRoutedScreenBlocker,
  type CanonicalRoutedScreenViewModel,
  type RoutedActionContract,
  type WorkflowStateIndex,
} from "../../shared/workflow";
import type { ArtifactPairService } from "../artifacts";

export interface CanonicalRoutedScreenResolution {
  viewModel: CanonicalRoutedScreenViewModel;
  targetEntry: ArtifactRegistryEntry | null;
  targetArtifact: CanonicalArtifact | null;
  sourceEntries: ArtifactRegistryEntry[];
  sourceArtifacts: CanonicalArtifact[];
}

export interface CanonicalRoutedScreenSnapshotNode {
  artifact: CanonicalArtifact;
  jsonPath: string;
  markdownPath: string;
  classification: "controlling" | "historical";
}

export class CanonicalRoutedScreenAdapter {
  constructor(
    private readonly artifactPairs: ArtifactPairService,
    private readonly registryProvider?: () => Promise<ArtifactRegistry>,
  ) {}

  async resolve(
    state: WorkflowStateIndex,
    action: RoutedActionContract,
  ): Promise<CanonicalRoutedScreenResolution> {
    const blockers: CanonicalRoutedScreenBlocker[] = [];
    const registry = this.registryProvider
      ? await this.registryProvider()
      : await this.artifactPairs.loadRegistry();
    if (!registry) {
      blockers.push({
        code: "missing_registry",
        message: "The canonical Artifact Registry is unavailable.",
        artifactIds: [],
      });
      return emptyResolution(action, blockers);
    }

    const targetResolved = action.targetArtifactId
      ? await this.resolveRequiredAuthority(
          registry,
          action.targetArtifactId,
          "target",
          blockers,
        )
      : null;
    const sourceResolved = [];
    for (const artifactId of action.sourceArtifactIds) {
      const resolved = await this.resolveRequiredAuthority(
        registry,
        artifactId,
        "source",
        blockers,
      );
      if (resolved) sourceResolved.push(resolved);
    }

    const targetView = targetResolved
      ? toArtifactView(targetResolved.entry, targetResolved.artifact)
      : null;
    const sourceViews = sourceResolved.map(({ entry, artifact }) =>
      toArtifactView(entry, artifact),
    );
    const expectedOutput = await this.resolveExpectedOutput(
      registry,
      state,
      action,
      targetView,
      blockers,
    );
    const viewModel: CanonicalRoutedScreenViewModel = {
      bindingSource: "routed_action_and_artifact_registry",
      action,
      target: targetView,
      sources: sourceViews,
      expectedOutput,
      blockers,
      ready: blockers.length === 0 && action.authorityStatus === "ready",
    };
    return {
      viewModel,
      targetEntry: targetResolved?.entry ?? null,
      targetArtifact: targetResolved?.artifact ?? null,
      sourceEntries: sourceResolved.map(({ entry }) => entry),
      sourceArtifacts: sourceResolved.map(({ artifact }) => artifact),
    };
  }

  async resolveFromSnapshot(input: {
    state: WorkflowStateIndex;
    action: RoutedActionContract;
    registry: ArtifactRegistry;
    nodes: readonly CanonicalRoutedScreenSnapshotNode[];
  }): Promise<CanonicalRoutedScreenResolution> {
    const { state, action, registry, nodes } = input;
    const blockers: CanonicalRoutedScreenBlocker[] = [];
    const targetResolved = action.targetArtifactId
      ? this.resolveRequiredAuthorityFromSnapshot(
          registry,
          nodes,
          action.targetArtifactId,
          "target",
          blockers,
        )
      : null;
    const sourceResolved = [];
    for (const artifactId of action.sourceArtifactIds) {
      const resolved = this.resolveRequiredAuthorityFromSnapshot(
        registry,
        nodes,
        artifactId,
        "source",
        blockers,
      );
      if (resolved) sourceResolved.push(resolved);
    }

    const targetView = targetResolved
      ? toArtifactView(targetResolved.entry, targetResolved.artifact)
      : null;
    const sourceViews = sourceResolved.map(({ entry, artifact }) =>
      toArtifactView(entry, artifact),
    );
    const expectedOutput = this.resolveExpectedOutputFromSnapshot(
      registry,
      nodes,
      state,
      action,
      targetView,
      blockers,
    );
    const viewModel: CanonicalRoutedScreenViewModel = {
      bindingSource: "routed_action_and_artifact_registry",
      action,
      target: targetView,
      sources: sourceViews,
      expectedOutput,
      blockers,
      ready: blockers.length === 0 && action.authorityStatus === "ready",
    };
    return {
      viewModel,
      targetEntry: targetResolved?.entry ?? null,
      targetArtifact: targetResolved?.artifact ?? null,
      sourceEntries: sourceResolved.map(({ entry }) => entry),
      sourceArtifacts: sourceResolved.map(({ artifact }) => artifact),
    };
  }

  private async resolveRequiredAuthority(
    registry: ArtifactRegistry,
    artifactId: string,
    role: "target" | "source",
    blockers: CanonicalRoutedScreenBlocker[],
  ): Promise<{ entry: ArtifactRegistryEntry; artifact: CanonicalArtifact } | null> {
    const matches = registry.entries.filter(
      (entry) =>
        entry.artifactId === artifactId &&
        entry.authoritative &&
        isAuthorityEligibleStatus(entry.status),
    );
    if (matches.length === 0) {
      blockers.push({
        code: role === "target" ? "missing_target" : "missing_source",
        message: `Canonical ${role} authority ${artifactId} is missing.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    if (matches.length > 1) {
      blockers.push({
        code: "ambiguous_authority",
        message: `Canonical ${role} authority ${artifactId} is ambiguous.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    const entry = onlyValue(matches);
    if (!entry) {
      blockers.push({
        code: "ambiguous_authority",
        message: `Canonical ${role} authority ${artifactId} could not be selected exactly.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    if (!entry.synchronized) {
      blockers.push({
        code: "unsynchronized_pair",
        message: `Canonical ${role} authority ${artifactId} is not synchronized.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    try {
      const pair = await this.artifactPairs.readArtifactByPaths(
        entry.jsonPath,
        entry.markdownPath,
      );
      if (
        pair.artifact.artifactId !== entry.artifactId ||
        pair.artifact.artifactType !== entry.artifactType ||
        pair.artifact.revision !== entry.revision ||
        pair.artifact.payloadHash !== entry.payloadHash
      ) {
        throw new Error("Registry entry and pair metadata differ.");
      }
      return { entry, artifact: pair.artifact };
    } catch (error) {
      blockers.push({
        code: "unsynchronized_pair",
        message: `Canonical ${role} pair ${artifactId} failed verification: ${plainError(error)}`,
        artifactIds: [artifactId],
      });
      return null;
    }
  }

  private async resolveExpectedOutput(
    registry: ArtifactRegistry,
    state: WorkflowStateIndex,
    action: RoutedActionContract,
    target: CanonicalRoutedArtifactView | null,
    blockers: CanonicalRoutedScreenBlocker[],
  ): Promise<CanonicalRoutedScreenViewModel["expectedOutput"]> {
    const matches = registry.entries.filter(
      (entry) =>
        entry.artifactId === action.expectedOutput.artifactId &&
        entry.authoritative &&
        isAuthorityEligibleStatus(entry.status),
    );
    if (matches.length > 1) {
      blockers.push({
        code: "ambiguous_authority",
        message: `Expected output authority ${action.expectedOutput.artifactId} is ambiguous.`,
        artifactIds: [action.expectedOutput.artifactId],
      });
    }
    if (matches.length === 1) {
      const resolved = await this.resolveRequiredAuthority(
        registry,
        action.expectedOutput.artifactId,
        "source",
        blockers,
      );
      if (resolved && resolved.entry.artifactType !== action.expectedOutput.artifactType) {
        blockers.push({
          code: "artifact_type_mismatch",
          message: `Expected output ${action.expectedOutput.artifactId} has type ${resolved.entry.artifactType}, not ${action.expectedOutput.artifactType}.`,
          artifactIds: [action.expectedOutput.artifactId],
        });
      }
      return {
        ...action.expectedOutput,
        jsonPath: resolved?.entry.jsonPath ?? null,
        markdownPath: resolved?.entry.markdownPath ?? null,
        materialization: "existing_authority",
      };
    }

    const location = canonicalNewOutputLocation(state, action, target);
    if (action.screenId === "architect-review" && !location) {
      blockers.push({
        code: "missing_output_location",
        message: `Canonical output location for ${action.expectedOutput.artifactId} cannot be resolved.`,
        artifactIds: [action.expectedOutput.artifactId],
      });
    }
    return {
      ...action.expectedOutput,
      jsonPath: location?.jsonPath ?? null,
      markdownPath: location?.markdownPath ?? null,
      materialization: location ? "canonical_write_location" : "writer_owned",
    };
  }

  private resolveRequiredAuthorityFromSnapshot(
    registry: ArtifactRegistry,
    nodes: readonly CanonicalRoutedScreenSnapshotNode[],
    artifactId: string,
    role: "target" | "source",
    blockers: CanonicalRoutedScreenBlocker[],
  ): { entry: ArtifactRegistryEntry; artifact: CanonicalArtifact } | null {
    const matches = registry.entries.filter(
      (entry) =>
        entry.artifactId === artifactId &&
        entry.authoritative &&
        isAuthorityEligibleStatus(entry.status),
    );
    if (matches.length === 0) {
      blockers.push({
        code: role === "target" ? "missing_target" : "missing_source",
        message: `Canonical ${role} authority ${artifactId} is missing.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    if (matches.length > 1) {
      blockers.push({
        code: "ambiguous_authority",
        message: `Canonical ${role} authority ${artifactId} is ambiguous.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    const entry = onlyValue(matches);
    if (!entry) {
      blockers.push({
        code: "ambiguous_authority",
        message: `Canonical ${role} authority ${artifactId} could not be selected exactly.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    if (!entry.synchronized) {
      blockers.push({
        code: "unsynchronized_pair",
        message: `Canonical ${role} authority ${artifactId} is not synchronized.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    const nodeMatches = nodes.filter(
      (candidate) =>
        candidate.artifact.artifactId === entry.artifactId &&
        candidate.classification === "controlling" &&
        candidate.jsonPath === entry.jsonPath &&
        candidate.markdownPath === entry.markdownPath,
    );
    const node = onlyValue(nodeMatches);
    if (
      !node ||
      node.artifact.artifactType !== entry.artifactType ||
      node.artifact.revision !== entry.revision ||
      node.artifact.payloadHash !== entry.payloadHash
    ) {
      blockers.push({
        code: "unsynchronized_pair",
        message: `Canonical ${role} pair ${artifactId} is not present in the supplied repository snapshot.`,
        artifactIds: [artifactId],
      });
      return null;
    }
    return { entry, artifact: node.artifact };
  }

  private resolveExpectedOutputFromSnapshot(
    registry: ArtifactRegistry,
    nodes: readonly CanonicalRoutedScreenSnapshotNode[],
    state: WorkflowStateIndex,
    action: RoutedActionContract,
    target: CanonicalRoutedArtifactView | null,
    blockers: CanonicalRoutedScreenBlocker[],
  ): CanonicalRoutedScreenViewModel["expectedOutput"] {
    const matches = registry.entries.filter(
      (entry) =>
        entry.artifactId === action.expectedOutput.artifactId &&
        entry.authoritative &&
        isAuthorityEligibleStatus(entry.status),
    );
    if (matches.length > 1) {
      blockers.push({
        code: "ambiguous_authority",
        message: `Expected output authority ${action.expectedOutput.artifactId} is ambiguous.`,
        artifactIds: [action.expectedOutput.artifactId],
      });
    }
    if (matches.length === 1) {
      const resolved = this.resolveRequiredAuthorityFromSnapshot(
        registry,
        nodes,
        action.expectedOutput.artifactId,
        "source",
        blockers,
      );
      if (resolved && resolved.entry.artifactType !== action.expectedOutput.artifactType) {
        blockers.push({
          code: "artifact_type_mismatch",
          message: `Expected output ${action.expectedOutput.artifactId} has type ${resolved.entry.artifactType}, not ${action.expectedOutput.artifactType}.`,
          artifactIds: [action.expectedOutput.artifactId],
        });
      }
      return {
        ...action.expectedOutput,
        jsonPath: resolved?.entry.jsonPath ?? null,
        markdownPath: resolved?.entry.markdownPath ?? null,
        materialization: "existing_authority",
      };
    }

    const location = canonicalNewOutputLocation(state, action, target);
    if (action.screenId === "architect-review" && !location) {
      blockers.push({
        code: "missing_output_location",
        message: `Canonical output location for ${action.expectedOutput.artifactId} cannot be resolved.`,
        artifactIds: [action.expectedOutput.artifactId],
      });
    }
    return {
      ...action.expectedOutput,
      jsonPath: location?.jsonPath ?? null,
      markdownPath: location?.markdownPath ?? null,
      materialization: location ? "canonical_write_location" : "writer_owned",
    };
  }
}

function emptyResolution(
  action: RoutedActionContract,
  blockers: CanonicalRoutedScreenBlocker[],
): CanonicalRoutedScreenResolution {
  return {
    viewModel: {
      bindingSource: "routed_action_and_artifact_registry",
      action,
      target: null,
      sources: [],
      expectedOutput: {
        ...action.expectedOutput,
        jsonPath: null,
        markdownPath: null,
        materialization: "writer_owned",
      },
      blockers,
      ready: false,
    },
    targetEntry: null,
    targetArtifact: null,
    sourceEntries: [],
    sourceArtifacts: [],
  };
}

function toArtifactView(
  entry: ArtifactRegistryEntry,
  artifact: CanonicalArtifact,
): CanonicalRoutedArtifactView {
  return {
    artifactId: entry.artifactId,
    artifactType: entry.artifactType,
    revision: entry.revision,
    status: entry.status,
    title: artifact.payload.title,
    displayTitle: canonicalDisplayTitle(artifact.payload.title, entry.workCardId),
    projectId: entry.projectId,
    ...(entry.phaseId ? { phaseId: entry.phaseId } : {}),
    ...(entry.workCardId ? { workCardId: entry.workCardId } : {}),
    ...(entry.parentArtifactId ? { parentArtifactId: entry.parentArtifactId } : {}),
    jsonPath: entry.jsonPath,
    markdownPath: entry.markdownPath,
    payloadHash: entry.payloadHash,
  };
}

function canonicalDisplayTitle(title: string, workCardId?: string): string {
  if (!workCardId) return title.trim();
  const escapedId = workCardId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title
    .trim()
    .replace(
      new RegExp(`^(?:Repair\\s+)?Work Card:\\s*${escapedId}(?:\\s*[—-]\\s*|\\s+)`, "i"),
      "",
    )
    .trim();
}

function canonicalNewOutputLocation(
  state: WorkflowStateIndex,
  action: RoutedActionContract,
  target: CanonicalRoutedArtifactView | null,
): { jsonPath: string; markdownPath: string } | null {
  if (
    action.expectedOutput.artifactType !== "architect_review" ||
    !target?.workCardId
  ) {
    return null;
  }
  const phaseId = target.phaseId ?? state.activePhaseId;
  if (!phaseId || !target.displayTitle) return null;
  const expectedId = `${target.projectId}/${phaseId}/architect_review/${target.workCardId}`;
  if (action.expectedOutput.artifactId !== expectedId) return null;
  const slug = target.displayTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug) return null;
  const stem = path.posix.join(
    "planning",
    "phases",
    phaseId,
    "Architect_Reviews",
    `ARCHITECT_REVIEW_${target.workCardId}_${slug}`,
  );
  return { jsonPath: `${stem}.json`, markdownPath: `${stem}.md` };
}

function plainError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function onlyValue<T>(values: readonly T[]): T | null {
  if (values.length !== 1) return null;
  let selected: T | null = null;
  for (const value of values) selected = value;
  return selected;
}
