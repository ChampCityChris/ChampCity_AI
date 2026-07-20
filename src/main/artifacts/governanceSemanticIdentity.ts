import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  verifyArtifactPair,
  type ArtifactRegistry,
  type ArtifactRegistryEntry,
  type CanonicalArtifact,
} from "../../shared/artifacts";
import {
  buildValidationReportJsonFileName,
  buildValidationReportMarkdownFileName,
} from "../../shared/workCards/validationRecord";
import { toValidationTargetRecord } from "../../shared/workCards/validationTarget";
import type {
  GovernanceRepairRegistryStatus,
  GovernanceSemanticDuplicateRecordSummary,
  GovernanceSemanticInboundReference,
  GovernanceSemanticRepairProposal,
} from "../../shared/projects";

export const OPERATOR_VALIDATION_IDENTITY_CONTRACT_SOURCE =
  "src/shared/workflow/workflowKernel.ts exact operator_validation expected output identity";
export const OPERATOR_VALIDATION_PATH_CONTRACT_SOURCE =
  "src/shared/workCards/validationRecord.ts buildValidationReportJsonFileName/buildValidationReportMarkdownFileName";

interface WorkCardTitleEvidence {
  title: string;
  evidence: string;
}

interface ExistingPathPair {
  jsonExists: boolean;
  markdownExists: boolean;
  synchronizedArtifact?: CanonicalArtifact;
  registryStatus: GovernanceRepairRegistryStatus;
  collision?: string;
}

export async function buildTypedSemanticRepairProposal(input: {
  artifact: CanonicalArtifact;
  jsonPath: string;
  markdownPath: string;
  registry: ArtifactRegistry | null;
  registryStatus: GovernanceRepairRegistryStatus;
  projectRoot: string;
}): Promise<GovernanceSemanticRepairProposal | undefined> {
  const { artifact, jsonPath, markdownPath, registry, registryStatus, projectRoot } = input;
  const pathPhase = phaseFromSynchronizedPaths(jsonPath, markdownPath);
  if (!pathPhase) return undefined;

  const titleEvidence = await resolveWorkCardTitleEvidence({
    artifact,
    phaseId: pathPhase.phaseId,
    registry,
    projectRoot,
  });
  if (!titleEvidence) return undefined;
  const typed = typedCanonicalTarget(artifact, pathPhase.phaseId, titleEvidence);
  if (!typed.ok) return undefined;

  const fieldDecisions: GovernanceSemanticRepairProposal["fieldDecisions"] = [];
  const conflicts: string[] = [];
  const affectedRegistryEntry = registry?.entries.find(
    (entry) => entry.artifactId === artifact.artifactId,
  );

  if (artifact.phaseId && artifact.phaseId !== pathPhase.phaseId) {
    conflicts.push(
      `artifact phaseId ${artifact.phaseId} conflicts with synchronized path phase ${pathPhase.phaseId}`,
    );
  }

  const pathPair = await inspectExistingPathPair({
    projectRoot,
    registry,
    currentArtifactId: artifact.artifactId,
    jsonPath: typed.jsonPath,
    markdownPath: typed.markdownPath,
  });
  if (pathPair.collision) conflicts.push(pathPair.collision);

  fieldDecisions.push({
    field: "phaseId",
    ...(artifact.phaseId === undefined ? {} : { currentValue: artifact.phaseId }),
    proposedValue: pathPhase.phaseId,
    decisionState: artifact.phaseId === pathPhase.phaseId ? "preserve" : "proposed",
    confidence: conflicts.length > 0 ? "blocked" : "high",
    evidence: [
      `Proposed phase: ${pathPhase.phaseId}`,
      `Basis: both synchronized files are located under planning/phases/${pathPhase.phaseId}`,
    ],
  });
  fieldDecisions.push({
    field: "artifactId",
    currentValue: artifact.artifactId,
    proposedValue: typed.artifactId,
    decisionState: typed.artifactId === artifact.artifactId ? "preserve" : "proposed",
    confidence: conflicts.length > 0 ? "blocked" : "high",
    evidence:
      typed.artifactId === artifact.artifactId
        ? ["Current artifact ID already matches the typed canonical identity."]
        : [
            `Canonical ${artifact.artifactType} identity is ${typed.identityEvidence}.`,
            "The existing artifact-ID suffix is legacy report naming and is not preserved as canonical authority.",
          ],
  });
  fieldDecisions.push({
    field: "projectId",
    currentValue: artifact.projectId,
    proposedValue: artifact.projectId,
    decisionState: "preserve",
    confidence: "high",
    evidence: ["Project ID is preserved from the canonical JSON artifact."],
  });
  fieldDecisions.push({
    field: "workCardId",
    currentValue: artifact.workCardId,
    proposedValue: artifact.workCardId,
    decisionState: "preserve",
    confidence: "high",
    evidence: [
      `Structured workCardId is ${artifact.workCardId}.`,
      "Canonical Operator Validation identity uses the exact Work Card ID.",
      titleEvidence.evidence,
    ],
  });
  fieldDecisions.push({
    field: "parentArtifactId",
    ...(artifact.parentArtifactId === undefined ? {} : { currentValue: artifact.parentArtifactId }),
    ...(artifact.parentArtifactId === undefined ? {} : { proposedValue: artifact.parentArtifactId }),
    decisionState: "preserve",
    confidence: "high",
    evidence: [
      artifact.parentArtifactId
        ? "Parent identity is preserved unless a parent reference migration is required on inbound artifacts."
        : "No deterministic parent identity evidence is present; no parent identity will be added.",
    ],
  });

  const numberedLegacyPath =
    typed.jsonPath !== jsonPath || typed.markdownPath !== markdownPath;
  if (
    typed.artifactId === artifact.artifactId &&
    pathPhase.phaseId === artifact.phaseId &&
    !numberedLegacyPath
  ) {
    return undefined;
  }

  const registryCollision = registryCollisionFor(
    registry,
    artifact.artifactId,
    typed.artifactId,
    typed.jsonPath,
    typed.markdownPath,
  );
  const outboundReferences = outboundReferencesFor(artifact);
  const duplicateReconciliation =
    pathPair.synchronizedArtifact &&
    isPositiveDuplicateCandidate({
      numberedArtifact: artifact,
      numberedJsonPath: jsonPath,
      numberedMarkdownPath: markdownPath,
      fixedArtifact: pathPair.synchronizedArtifact,
      fixedJsonPath: typed.jsonPath,
      fixedMarkdownPath: typed.markdownPath,
      phaseId: pathPhase.phaseId,
      canonicalArtifactId: typed.artifactId,
    })
      ? buildDuplicateReconciliation({
          numberedArtifact: artifact,
          fixedArtifact: pathPair.synchronizedArtifact,
          registry,
          replacementArtifactId: typed.artifactId,
          canonicalJsonPath: typed.jsonPath,
          canonicalMarkdownPath: typed.markdownPath,
          phaseId: pathPhase.phaseId,
          workCardTitle: titleEvidence.title,
          workCardTitleEvidence: titleEvidence.evidence,
        })
      : undefined;
  const exactCanonicalFixedSurvivor = Boolean(
    duplicateReconciliation &&
      pathPair.synchronizedArtifact &&
      pathPair.registryStatus === "registered" &&
      isExactCanonicalFixedSurvivor({
        numberedArtifact: artifact,
        numberedJsonPath: jsonPath,
        numberedMarkdownPath: markdownPath,
        fixedArtifact: pathPair.synchronizedArtifact,
        fixedJsonPath: typed.jsonPath,
        fixedMarkdownPath: typed.markdownPath,
        phaseId: pathPhase.phaseId,
        canonicalArtifactId: typed.artifactId,
      }),
  );
  const sameLogicalConflict = findSameWorkCardRegisteredPhaseConflict(
    registry,
    artifact,
    pathPhase.phaseId,
  );
  if (
    sameLogicalConflict &&
    !(
      exactCanonicalFixedSurvivor &&
      sameLogicalConflict.artifactId === typed.artifactId &&
      sameLogicalConflict.jsonPath === typed.jsonPath &&
      sameLogicalConflict.markdownPath === typed.markdownPath
    )
  ) {
    conflicts.push(
      `registered artifact ${sameLogicalConflict.artifactId} already claims ${pathPhase.phaseId} for the same ${artifact.artifactType} Work Card identity at ${sameLogicalConflict.jsonPath}`,
    );
  }
  const inboundReferences = duplicateReconciliation
    ? uniqueReferences([
        ...duplicateReconciliation.numberedRecord.inboundReferences,
        ...duplicateReconciliation.fixedPathRecord.inboundReferences,
      ])
    : inboundReferencesFor(registry, artifact.artifactId, typed.artifactId);
  const unsafeReference = inboundReferences.find((reference) => !reference.safelyRewritable);

  const expectedDuplicateCounterpartId =
    duplicateReconciliation?.fixedPathRecord.artifactId;
  const collision =
    registryCollision === `Registry collision with ${expectedDuplicateCounterpartId}`
      ? undefined
      : registryCollision ?? pathPair.collision;
  const requiredDisposition = numberedLegacyPath ? "numbered_legacy_path" : undefined;
  const unresolvedRequiredDecision = Boolean(requiredDisposition) || Boolean(duplicateReconciliation);
  const safe =
    conflicts.length === 0 &&
    !collision &&
    !unsafeReference &&
    !duplicateReconciliation &&
    registryStatus !== "registry_disagreement" &&
    typed.artifactId !== artifact.artifactId &&
    !unresolvedRequiredDecision;

  return {
    currentArtifactId: artifact.artifactId,
    proposedArtifactId: typed.artifactId,
    currentProjectId: artifact.projectId,
    proposedProjectId: artifact.projectId,
    ...(artifact.phaseId === undefined ? {} : { currentPhaseId: artifact.phaseId }),
    proposedPhaseId: pathPhase.phaseId,
    currentWorkCardId: artifact.workCardId,
    proposedWorkCardId: artifact.workCardId,
    ...(artifact.parentArtifactId === undefined
      ? {}
      : { currentParentArtifactId: artifact.parentArtifactId, proposedParentArtifactId: artifact.parentArtifactId }),
    currentJsonPath: jsonPath,
    currentMarkdownPath: markdownPath,
    proposedJsonPath: typed.jsonPath,
    proposedMarkdownPath: typed.markdownPath,
    currentStatus: artifact.status,
    proposedStatus: artifact.status,
    fieldDecisions,
    conflictingCandidates: conflicts,
    ...(affectedRegistryEntry ? { affectedRegistryEntry: registryEntrySummary(affectedRegistryEntry) } : {}),
    inboundReferences,
    outboundReferences,
    safeToApplyAutomaticallyAfterOperatorConfirmation: safe,
    numberedLegacyPath,
    allowedNumberedLegacyDispositions: numberedLegacyPath
      ? ["migrate_to_canonical_fixed_path"]
      : [],
    ...(requiredDisposition ? { requiredDisposition } : {}),
    ...(collision ? { collision } : {}),
    ...(unsafeReference
      ? { unresolvedReferenceMigration: `${unsafeReference.artifactId} ${unsafeReference.relationshipField}` }
      : {}),
    canonicalIdentityContractSource: typed.identityContractSource,
    canonicalPathContractSource: typed.pathContractSource,
    workCardTitleEvidence: titleEvidence.evidence,
    ...(duplicateReconciliation ? { duplicateReconciliation } : {}),
    basisSummary: [
      duplicateReconciliation
        ? "Canonical identity migration and duplicate reconciliation."
        : `Proposed phase: ${pathPhase.phaseId}.`,
      `Basis: both synchronized files are located under planning/phases/${pathPhase.phaseId}.`,
      `Structured workCardId is ${artifact.workCardId}.`,
      titleEvidence.evidence,
      "Canonical Operator Validation identity uses the exact Work Card ID.",
      "The fixed writer path is produced by buildValidationReportJsonFileName/buildValidationReportMarkdownFileName.",
      duplicateReconciliation
        ? "The fixed writer path is already occupied; the Operator must choose which record supplies canonical payload authority."
        : "The existing artifact-ID suffix is legacy report naming and is not preserved as canonical authority.",
    ].join(" "),
    canAlterCurrentRouting: canAffectCurrentRouting(artifact.artifactType, artifact.status),
  };
}

export async function isCompletedTypedSemanticMigrationDisposition(input: {
  artifact: CanonicalArtifact;
  registry: ArtifactRegistry | null;
  jsonPath: string;
  markdownPath: string;
  projectRoot: string;
}): Promise<boolean> {
  const phase = phaseFromSynchronizedPaths(input.jsonPath, input.markdownPath);
  if (!phase) return false;
  const titleEvidence = await resolveWorkCardTitleEvidence({
    artifact: input.artifact,
    phaseId: phase.phaseId,
    registry: input.registry,
    projectRoot: input.projectRoot,
  });
  const target = typedCanonicalTarget(input.artifact, phase.phaseId, titleEvidence);
  if (!target.ok || target.artifactId === input.artifact.artifactId) return false;
  return Boolean(
    input.registry?.entries.some(
      (entry) =>
        entry.artifactId === target.artifactId &&
        entry.artifactType === input.artifact.artifactType &&
        entry.phaseId === phase.phaseId &&
        entry.workCardId === input.artifact.workCardId &&
        entry.jsonPath === target.jsonPath &&
        entry.markdownPath === target.markdownPath &&
        entry.synchronized &&
        entry.relationships.supersedes.includes(input.artifact.artifactId),
    ),
  );
}

export function semanticProposalsEquivalent(
  left: GovernanceSemanticRepairProposal,
  right: GovernanceSemanticRepairProposal,
): boolean {
  return JSON.stringify(normalizeProposalForComparison(left)) ===
    JSON.stringify(normalizeProposalForComparison(right));
}

function normalizeProposalForComparison(
  proposal: GovernanceSemanticRepairProposal,
): Record<string, unknown> {
  return {
    currentArtifactId: proposal.currentArtifactId,
    proposedArtifactId: proposal.proposedArtifactId,
    currentProjectId: proposal.currentProjectId,
    proposedProjectId: proposal.proposedProjectId,
    currentPhaseId: proposal.currentPhaseId,
    proposedPhaseId: proposal.proposedPhaseId,
    currentWorkCardId: proposal.currentWorkCardId,
    proposedWorkCardId: proposal.proposedWorkCardId,
    currentParentArtifactId: proposal.currentParentArtifactId,
    proposedParentArtifactId: proposal.proposedParentArtifactId,
    currentJsonPath: proposal.currentJsonPath,
    currentMarkdownPath: proposal.currentMarkdownPath,
    proposedJsonPath: proposal.proposedJsonPath,
    proposedMarkdownPath: proposal.proposedMarkdownPath,
    currentStatus: proposal.currentStatus,
    proposedStatus: proposal.proposedStatus,
    fieldDecisions: proposal.fieldDecisions,
    conflictingCandidates: proposal.conflictingCandidates,
    inboundReferences: proposal.inboundReferences,
    safeToApplyAutomaticallyAfterOperatorConfirmation:
      proposal.safeToApplyAutomaticallyAfterOperatorConfirmation,
    numberedLegacyPath: proposal.numberedLegacyPath,
    allowedNumberedLegacyDispositions: proposal.allowedNumberedLegacyDispositions,
    requiredDisposition: proposal.requiredDisposition,
    collision: proposal.collision,
    unresolvedReferenceMigration: proposal.unresolvedReferenceMigration,
    canonicalIdentityContractSource: proposal.canonicalIdentityContractSource,
    canonicalPathContractSource: proposal.canonicalPathContractSource,
    workCardTitleEvidence: proposal.workCardTitleEvidence,
    duplicateReconciliation: proposal.duplicateReconciliation,
    basisSummary: proposal.basisSummary,
  };
}

async function resolveWorkCardTitleEvidence(input: {
  artifact: CanonicalArtifact;
  phaseId: string;
  registry: ArtifactRegistry | null;
  projectRoot: string;
}): Promise<WorkCardTitleEvidence | null> {
  const { artifact, phaseId, registry, projectRoot } = input;
  if (!artifact.workCardId) return null;
  const workCardEntry = registry?.entries.find(
    (entry) =>
      entry.artifactType === "work_card" &&
      entry.projectId === artifact.projectId &&
      entry.phaseId === phaseId &&
      entry.workCardId === artifact.workCardId &&
      entry.synchronized,
  );
  if (workCardEntry) {
    const workCard = await readJsonFile(projectRoot, workCardEntry.jsonPath);
    const title = titleFromCanonicalArtifact(workCard);
    if (title) {
      return {
        title,
        evidence: `Work Card title resolved from exact canonical Work Card authority ${workCardEntry.jsonPath}.`,
      };
    }
  }

  const validationTargetPath = `planning/phases/${phaseId}/Validation_Targets/VALIDATION_TARGET_${artifact.workCardId}.json`;
  const validationTarget = await readJsonFile(projectRoot, validationTargetPath).catch(() => null);
  if (validationTarget) {
    const record = toValidationTargetRecord(validationTarget);
    if (record.phase === phaseId && record.id === artifact.workCardId) {
      return {
        title: record.title,
        evidence: `Work Card title resolved from exact Validation Target ${validationTargetPath}.`,
      };
    }
  }

  const payloadTitle = titleFromValidationPayload(artifact);
  if (payloadTitle) {
    return {
      title: payloadTitle,
      evidence: "Work Card title resolved from exact structured validation payload field.",
    };
  }
  return null;
}

function typedCanonicalTarget(
  artifact: CanonicalArtifact,
  phaseId: string,
  titleEvidence: WorkCardTitleEvidence | null,
):
  | {
      ok: true;
      artifactId: string;
      jsonPath: string;
      markdownPath: string;
      identityEvidence: string;
      identityContractSource: string;
      pathContractSource: string;
    }
  | { ok: false } {
  if (artifact.artifactType !== "operator_validation") return { ok: false };
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(artifact.projectId)) return { ok: false };
  if (!/^phase-\d{2,}$/.test(phaseId)) return { ok: false };
  if (!artifact.workCardId || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(artifact.workCardId)) {
    return { ok: false };
  }
  if (!titleEvidence) return { ok: false };
  const artifactId = `${artifact.projectId}/${phaseId}/operator_validation/${artifact.workCardId}`;
  const record = { workCardId: artifact.workCardId, workCardTitle: titleEvidence.title };
  return {
    ok: true,
    artifactId,
    jsonPath: `planning/phases/${phaseId}/Validation_Reports/${buildValidationReportJsonFileName(record)}`,
    markdownPath: `planning/phases/${phaseId}/Validation_Reports/${buildValidationReportMarkdownFileName(record)}`,
    identityEvidence: `<projectId>/<phaseId>/operator_validation/<workCardId>`,
    identityContractSource: OPERATOR_VALIDATION_IDENTITY_CONTRACT_SOURCE,
    pathContractSource: OPERATOR_VALIDATION_PATH_CONTRACT_SOURCE,
  };
}

async function inspectExistingPathPair(input: {
  projectRoot: string;
  registry: ArtifactRegistry | null;
  currentArtifactId: string;
  jsonPath: string;
  markdownPath: string;
}): Promise<ExistingPathPair> {
  const [jsonExists, markdownExists] = await Promise.all([
    exists(path.join(input.projectRoot, ...input.jsonPath.split("/"))),
    exists(path.join(input.projectRoot, ...input.markdownPath.split("/"))),
  ]);
  if (!jsonExists && !markdownExists) {
    return { jsonExists, markdownExists, registryStatus: "missing_registration" };
  }
  if (jsonExists !== markdownExists) {
    return {
      jsonExists,
      markdownExists,
      registryStatus: "registry_disagreement",
      collision: `Incomplete existing pair at proposed fixed path ${input.jsonPath}.`,
    };
  }
  const [jsonContent, markdownContent] = await Promise.all([
    readFile(path.join(input.projectRoot, ...input.jsonPath.split("/")), "utf8"),
    readFile(path.join(input.projectRoot, ...input.markdownPath.split("/")), "utf8"),
  ]);
  const verification = verifyArtifactPair({
    jsonArtifact: jsonContent,
    markdown: markdownContent,
    jsonPath: input.jsonPath,
    markdownPath: input.markdownPath,
  });
  if (!verification.valid || !verification.synchronized || !verification.artifact) {
    return {
      jsonExists,
      markdownExists,
      registryStatus: "registry_disagreement",
      collision: `Existing pair at proposed fixed path is not synchronized: ${verification.errors.join(" ")}`,
    };
  }
  const entry = input.registry?.entries.find(
    (candidate) => candidate.artifactId === verification.artifact!.artifactId,
  );
  const registryStatus =
    entry &&
    entry.jsonPath === input.jsonPath &&
    entry.markdownPath === input.markdownPath &&
    entry.revision === verification.artifact.revision &&
    entry.payloadHash === verification.artifact.payloadHash &&
    entry.synchronized
      ? "registered"
      : "missing_registration";
  return {
    jsonExists,
    markdownExists,
    synchronizedArtifact: verification.artifact,
    registryStatus,
  };
}

function buildDuplicateReconciliation(input: {
  numberedArtifact: CanonicalArtifact;
  fixedArtifact: CanonicalArtifact;
  registry: ArtifactRegistry | null;
  replacementArtifactId: string;
  canonicalJsonPath: string;
  canonicalMarkdownPath: string;
  phaseId: string;
  workCardTitle: string;
  workCardTitleEvidence: string;
}): GovernanceSemanticRepairProposal["duplicateReconciliation"] {
  const numberedTime = Date.parse(input.numberedArtifact.updatedAt);
  const fixedTime = Date.parse(input.fixedArtifact.updatedAt);
  const canonicalRegistryRevision =
    input.registry?.entries.find((entry) => entry.artifactId === input.replacementArtifactId)
      ?.revision ?? 0;
  const proposedCanonicalRevision =
    Math.max(input.fixedArtifact.revision, input.numberedArtifact.revision, canonicalRegistryRevision) + 1;
  const comparison = compareDuplicateRecords(input.fixedArtifact, input.numberedArtifact);
  const fixedInbound = inboundReferencesFor(
    input.registry,
    input.fixedArtifact.artifactId,
    input.replacementArtifactId,
  );
  const numberedInbound = inboundReferencesFor(
    input.registry,
    input.numberedArtifact.artifactId,
    input.replacementArtifactId,
  );
  const safeToApply =
    [...fixedInbound, ...numberedInbound].every(
      (reference) => reference.safelyRewritable && reference.canonical && reference.synchronized,
    ) &&
    input.fixedArtifact.jsonPath === input.canonicalJsonPath &&
    input.fixedArtifact.markdownPath === input.canonicalMarkdownPath;
  return {
    title: "Duplicate Artifact Cleanup",
    canonicalArtifactId: input.replacementArtifactId,
    canonicalJsonPath: input.canonicalJsonPath,
    canonicalMarkdownPath: input.canonicalMarkdownPath,
    phaseId: input.phaseId,
    workCardId: input.numberedArtifact.workCardId ?? "",
    workCardTitle: input.workCardTitle,
    workCardTitleEvidence: input.workCardTitleEvidence,
    numberedRecord: duplicateSummary(
      input.numberedArtifact,
      input.registry,
      input.replacementArtifactId,
      input.fixedArtifact,
      numberedInbound,
      comparison,
    ),
    fixedPathRecord: duplicateSummary(
      input.fixedArtifact,
      input.registry,
      input.replacementArtifactId,
      input.numberedArtifact,
      fixedInbound,
      comparison,
    ),
    fixedPathAlreadyOccupied: true,
    numberedRecordAppearsLater:
      Number.isFinite(numberedTime) && Number.isFinite(fixedTime)
        ? numberedTime > fixedTime
        : input.numberedArtifact.revision >= input.fixedArtifact.revision,
    allowedDispositions: [
      "use_numbered_record_as_next_canonical_revision",
      "keep_fixed_record_and_delete_duplicate",
    ],
    requiredDisposition: "duplicate_operator_validation_fixed_path",
    actualPayloadDifferences: comparison.actualPayloadDifferences,
    proposedCanonicalRevision,
    duplicateJsonPathToDelete: input.numberedArtifact.jsonPath,
    duplicateMarkdownPathToDelete: input.numberedArtifact.markdownPath,
    affectedFiles: uniqueStable([
      input.canonicalJsonPath,
      input.canonicalMarkdownPath,
      input.numberedArtifact.jsonPath,
      input.numberedArtifact.markdownPath,
      ...uniqueReferences([...fixedInbound, ...numberedInbound]).flatMap((reference) => {
        const entry = input.registry?.entries.find((candidate) => candidate.artifactId === reference.artifactId);
        return entry ? [entry.jsonPath, entry.markdownPath] : [];
      }),
    ]),
    affectedRegistryEntries: uniqueStable([
      input.replacementArtifactId,
      input.fixedArtifact.artifactId,
      input.numberedArtifact.artifactId,
      ...uniqueReferences([...fixedInbound, ...numberedInbound]).map((reference) => reference.artifactId),
    ]),
    safeToApply,
    basisSummary:
      "This duplicate was created because an earlier application writer created a new filename instead of revising the existing canonical validation record. Choose which content should survive. The erroneous duplicate JSON/Markdown pair will be deleted only after the canonical revision and Registry authority are verified.",
  };
}

function duplicateSummary(
  artifact: CanonicalArtifact,
  registry: ArtifactRegistry | null,
  replacementArtifactId: string,
  other: CanonicalArtifact,
  inboundReferences: GovernanceSemanticInboundReference[],
  comparison: DuplicateComparison,
): GovernanceSemanticDuplicateRecordSummary {
  const direction = artifact.artifactId === comparison.fixedArtifactId ? "fixed" : "numbered";
  return {
    artifactId: artifact.artifactId,
    revision: artifact.revision,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    status: artifact.status,
    payloadHash: artifact.payloadHash,
    validationResult: stringField(artifact.payload.data, "validationResult"),
    validationDecision:
      stringField(artifact.payload.data, "operatorDecision") ??
      stringField(artifact.payload.data, "architectDisposition"),
    title: artifact.payload.title,
    contentMarkdownHash: sha256(artifact.payload.contentMarkdown),
    contentMarkdownEqualToOther: artifact.payload.contentMarkdown === other.payload.contentMarkdown,
    payloadDifferenceSummary:
      comparison.actualPayloadDifferences.length > 0
        ? comparison.actualPayloadDifferences.join("; ")
        : "No structured payload or contentMarkdown differences were detected.",
    structuredPayloadFieldsAdded:
      direction === "fixed"
        ? comparison.fieldsOnlyInFixed
        : comparison.fieldsOnlyInNumbered,
    structuredPayloadFieldsRemoved:
      direction === "fixed"
        ? comparison.fieldsOnlyInNumbered
        : comparison.fieldsOnlyInFixed,
    structuredPayloadFieldsChanged: comparison.changedFields,
    titleDifferences: comparison.titleDifferences,
    recognizedValidationSectionDifferences: comparison.sectionDifferences,
    jsonPath: artifact.jsonPath,
    markdownPath: artifact.markdownPath,
    registryStatus: registryStatusForArtifact(registry, artifact),
    inboundReferences,
    outboundReferences: outboundReferencesFor(artifact),
  };
}

interface DuplicateComparison {
  fixedArtifactId: string;
  fieldsOnlyInFixed: string[];
  fieldsOnlyInNumbered: string[];
  changedFields: string[];
  titleDifferences: string[];
  sectionDifferences: string[];
  actualPayloadDifferences: string[];
}

function isPositiveDuplicateCandidate(input: {
  numberedArtifact: CanonicalArtifact;
  numberedJsonPath: string;
  numberedMarkdownPath: string;
  fixedArtifact: CanonicalArtifact;
  fixedJsonPath: string;
  fixedMarkdownPath: string;
  phaseId: string;
  canonicalArtifactId: string;
}): boolean {
  const fixedStem = input.fixedJsonPath.slice(0, -".json".length);
  const numberedStem = input.numberedJsonPath.slice(0, -".json".length);
  return (
    input.numberedArtifact.projectId === input.fixedArtifact.projectId &&
    input.numberedArtifact.artifactType === "operator_validation" &&
    input.fixedArtifact.artifactType === "operator_validation" &&
    input.numberedArtifact.workCardId === input.fixedArtifact.workCardId &&
    input.numberedArtifact.workCardId !== undefined &&
    (input.numberedArtifact.phaseId === undefined || input.numberedArtifact.phaseId === input.phaseId) &&
    (input.fixedArtifact.phaseId === undefined || input.fixedArtifact.phaseId === input.phaseId) &&
    input.fixedArtifact.jsonPath === input.fixedJsonPath &&
    input.fixedArtifact.markdownPath === input.fixedMarkdownPath &&
    input.numberedArtifact.jsonPath === input.numberedJsonPath &&
    input.numberedArtifact.markdownPath === input.numberedMarkdownPath &&
    input.canonicalArtifactId ===
      `${input.numberedArtifact.projectId}/${input.phaseId}/operator_validation/${input.numberedArtifact.workCardId}` &&
    new RegExp(`^${escapeRegExp(fixedStem)}(?:_\\d+|_[A-Za-z0-9_-]+_\\d+)$`).test(numberedStem)
  );
}

function isExactCanonicalFixedSurvivor(input: {
  numberedArtifact: CanonicalArtifact;
  numberedJsonPath: string;
  numberedMarkdownPath: string;
  fixedArtifact: CanonicalArtifact;
  fixedJsonPath: string;
  fixedMarkdownPath: string;
  phaseId: string;
  canonicalArtifactId: string;
}): boolean {
  return (
    input.fixedArtifact.artifactId === input.canonicalArtifactId &&
    input.fixedArtifact.jsonPath === input.fixedJsonPath &&
    input.fixedArtifact.markdownPath === input.fixedMarkdownPath &&
    input.fixedArtifact.projectId === input.numberedArtifact.projectId &&
    input.fixedArtifact.artifactType === input.numberedArtifact.artifactType &&
    input.fixedArtifact.phaseId === input.phaseId &&
    input.fixedArtifact.workCardId === input.numberedArtifact.workCardId &&
    isPositiveDuplicateCandidate(input)
  );
}

function compareDuplicateRecords(
  fixed: CanonicalArtifact,
  numbered: CanonicalArtifact,
): DuplicateComparison {
  const fixedData = isPlainObject(fixed.payload.data) ? fixed.payload.data : {};
  const numberedData = isPlainObject(numbered.payload.data) ? numbered.payload.data : {};
  const fixedKeys = Object.keys(flattenObject(fixedData)).sort();
  const numberedKeys = Object.keys(flattenObject(numberedData)).sort();
  const fixedFlat = flattenObject(fixedData);
  const numberedFlat = flattenObject(numberedData);
  const fieldsOnlyInFixed = fixedKeys.filter((key) => !numberedKeys.includes(key));
  const fieldsOnlyInNumbered = numberedKeys.filter((key) => !fixedKeys.includes(key));
  const changedFields = fixedKeys.filter(
    (key) => numberedKeys.includes(key) && JSON.stringify(fixedFlat[key]) !== JSON.stringify(numberedFlat[key]),
  );
  const titleDifferences =
    fixed.payload.title === numbered.payload.title
      ? []
      : [`fixed title "${fixed.payload.title}" differs from numbered title "${numbered.payload.title}"`];
  const sectionDifferences = recognizedValidationSections
    .filter((section) => sectionText(fixed.payload.contentMarkdown, section) !==
      sectionText(numbered.payload.contentMarkdown, section))
    .map((section) => section);
  const actualPayloadDifferences = [
    ...fieldsOnlyInNumbered.map((field) => `structured payload field added in numbered record: ${field}`),
    ...fieldsOnlyInFixed.map((field) => `structured payload field absent from numbered record: ${field}`),
    ...changedFields.map((field) => `structured payload field changed: ${field}`),
    ...titleDifferences,
    ...(fixed.payload.contentMarkdown === numbered.payload.contentMarkdown
      ? ["contentMarkdown is equal"]
      : ["contentMarkdown differs"]),
    ...sectionDifferences.map((section) => `validation section differs: ${section}`),
  ];
  return {
    fixedArtifactId: fixed.artifactId,
    fieldsOnlyInFixed,
    fieldsOnlyInNumbered,
    changedFields,
    titleDifferences,
    sectionDifferences,
    actualPayloadDifferences,
  };
}

const recognizedValidationSections = [
  "Validation Target",
  "Validation Result",
  "What Was Tested",
  "What Passed",
  "What Failed",
  "Evidence References Or Paths",
  "Screenshots Or Files Referenced By Path",
  "Manual Commands Run",
  "Observed Errors",
  "Additional Operator Observations",
  "Operator Decision",
  "Recommended Next Action",
] as const;

function sectionText(markdown: string, heading: string): string {
  const escaped = escapeRegExp(heading);
  const pattern = new RegExp(`^#{1,6}\\s+${escaped}\\s*$([\\s\\S]*?)(?=^#{1,6}\\s+\\S|(?![\\s\\S]))`, "im");
  return pattern.exec(markdown.replace(/\r\n/g, "\n"))?.[1]?.trim() ?? "";
}

function flattenObject(value: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(item)) Object.assign(result, flattenObject(item, pathKey));
    else result[pathKey] = item;
  }
  return result;
}

function uniqueReferences(
  references: readonly GovernanceSemanticInboundReference[],
): GovernanceSemanticInboundReference[] {
  const seen = new Set<string>();
  const unique: GovernanceSemanticInboundReference[] = [];
  for (const reference of references) {
    const key = `${reference.artifactId}|${reference.relationshipField}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(reference);
  }
  return unique;
}

function uniqueStable(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function registryStatusForArtifact(
  registry: ArtifactRegistry | null,
  artifact: CanonicalArtifact,
): GovernanceRepairRegistryStatus {
  if (!registry) return "registry_unavailable";
  const entry = registry.entries.find((candidate) => candidate.artifactId === artifact.artifactId);
  if (!entry) return "missing_registration";
  return entry.jsonPath === artifact.jsonPath &&
    entry.markdownPath === artifact.markdownPath &&
    entry.revision === artifact.revision &&
    entry.payloadHash === artifact.payloadHash &&
    entry.synchronized
    ? "registered"
    : "registry_disagreement";
}

function registryCollisionFor(
  registry: ArtifactRegistry | null,
  currentArtifactId: string,
  proposedArtifactId: string,
  proposedJsonPath: string,
  proposedMarkdownPath: string,
): string | undefined {
  const collision = registry?.entries.find(
    (entry) =>
      entry.artifactId !== currentArtifactId &&
      (entry.artifactId === proposedArtifactId ||
        (entry.jsonPath === proposedJsonPath && entry.artifactId !== currentArtifactId) ||
        (entry.markdownPath === proposedMarkdownPath && entry.artifactId !== currentArtifactId)),
  );
  if (!collision) return undefined;
  return `Registry collision with ${collision.artifactId}`;
}

function inboundReferencesFor(
  registry: ArtifactRegistry | null,
  artifactId: string,
  replacementArtifactId: string,
): GovernanceSemanticInboundReference[] {
  if (!registry) return [];
  const references: GovernanceSemanticInboundReference[] = [];
  for (const entry of registry.entries) {
    const add = (relationshipField: GovernanceSemanticInboundReference["relationshipField"]) => {
      references.push({
        artifactId: entry.artifactId,
        artifactType: entry.artifactType,
        relationshipField,
        revision: entry.revision,
        canonical: entry.authoritative,
        synchronized: entry.synchronized,
        safelyRewritable: entry.authoritative && entry.synchronized,
        proposedReplacementValue: replacementArtifactId,
      });
    };
    if (entry.relationships.sources.includes(artifactId)) add("relationships.sources");
    if (entry.relationships.expectedOutputs.includes(artifactId)) add("relationships.expectedOutputs");
    if (entry.relationships.supersedes.includes(artifactId)) add("relationships.supersedes");
    if (entry.relationships.children.includes(artifactId)) add("relationships.children");
    if (entry.parentArtifactId === artifactId) add("parentArtifactId");
  }
  return references;
}

function outboundReferencesFor(artifact: CanonicalArtifact): string[] {
  return [
    ...artifact.relationships.sources,
    ...artifact.relationships.expectedOutputs,
    ...artifact.relationships.supersedes,
    ...artifact.relationships.children,
  ];
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

function findSameWorkCardRegisteredPhaseConflict(
  registry: ArtifactRegistry | null,
  artifact: CanonicalArtifact,
  proposedPhaseId: string,
): ArtifactRegistryEntry | null {
  if (!registry || !artifact.workCardId) return null;
  return (
    registry.entries.find(
      (entry) =>
        entry.artifactId !== artifact.artifactId &&
        entry.artifactType === artifact.artifactType &&
        entry.projectId === artifact.projectId &&
        entry.phaseId === proposedPhaseId &&
        entry.workCardId === artifact.workCardId,
    ) ?? null
  );
}

function titleFromCanonicalArtifact(value: unknown): string | null {
  if (!isPlainObject(value)) return null;
  const payload = value.payload;
  if (!isPlainObject(payload)) return null;
  const data = payload.data;
  if (isPlainObject(data) && typeof data.title === "string" && data.title.trim()) {
    return data.title.trim();
  }
  return typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim()
    : null;
}

function titleFromValidationPayload(artifact: CanonicalArtifact): string | null {
  const data = artifact.payload.data;
  return (
    stringField(data, "workCardTitle") ??
    stringField(data, "validationTargetTitle") ??
    stringField(data, "title") ??
    null
  );
}

function stringField(value: unknown, key: string): string | undefined {
  return isPlainObject(value) && typeof value[key] === "string" && value[key].trim()
    ? value[key].trim()
    : undefined;
}

async function readJsonFile(projectRoot: string, repoPath: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(projectRoot, ...repoPath.split("/")), "utf8"));
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function registryEntrySummary(entry: ArtifactRegistryEntry): string {
  return `${entry.artifactId} / rev ${entry.revision} / ${entry.jsonPath}`;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
