import { canonicalPrettyStringify } from "../artifacts";

export const historicalCorpusInventorySchemaVersion =
  "champcity.historical-corpus-inventory.v1" as const;

export const historicalCorpusInventoryOutputJsonPath =
  "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json" as const;
export const historicalCorpusInventoryOutputMarkdownPath =
  "planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md" as const;
export const historicalCorpusInventoryImplementerReportPath =
  "planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC02_historical_corpus_inventory_and_duplicate_resolution_manifest.md" as const;

export const historicalCorpusInventoryGeneratedExclusions = [
  historicalCorpusInventoryOutputJsonPath,
  historicalCorpusInventoryOutputMarkdownPath,
  historicalCorpusInventoryImplementerReportPath,
] as const;

export const historicalCorpusInventoryDefectCodes = [
  "incomplete_pair",
  "malformed_json",
  "malformed_markdown_envelope",
  "invalid_canonical_artifact",
  "invalid_canonical_pair",
  "payload_hash_mismatch",
  "markdown_body_mismatch",
  "declared_path_mismatch",
  "project_mismatch",
  "phase_mismatch",
  "work_card_mismatch",
  "artifact_type_mismatch",
  "revision_invalid",
  "status_unrecognized",
  "relationship_shape_invalid",
  "registry_missing_entry",
  "registry_stale_entry",
  "registry_path_disagreement",
  "registry_hash_disagreement",
  "duplicate_artifact_id",
  "duplicate_declared_json_path",
  "duplicate_declared_markdown_path",
  "exact_file_content_duplicate",
  "exact_record_content_duplicate",
  "semantic_duplicate_candidate",
  "identity_conflict",
  "inbound_reference_to_missing_record",
  "unsupported_entry",
  "stale_schema",
] as const;

export type HistoricalCorpusInventoryDefectCode =
  (typeof historicalCorpusInventoryDefectCodes)[number];

export const historicalCorpusInventorySchemaClasses = [
  "valid_synchronized_canonical_pair",
  "invalid_canonical_pair",
  "incomplete_canonical_pair",
  "valid_canonical_json_with_noncanonical_or_absent_markdown",
  "canonical_markdown_envelope_with_absent_or_invalid_json",
  "parseable_legacy_json_markdown_pair",
  "parseable_legacy_json_only",
  "plain_markdown_only",
  "malformed_json",
  "malformed_markdown_envelope",
  "mixed_canonical_legacy_pair",
  "system_index_record",
  "generated_bootstrap_control_record",
] as const;

export type HistoricalCorpusInventorySchemaClass =
  (typeof historicalCorpusInventorySchemaClasses)[number];

export const historicalCorpusInventoryMigrationScopeClasses = [
  "historical_migration_candidate",
  "current_phase_control",
  "system_index_or_diagnostic",
  "archive_provenance",
  "unsupported_or_unresolved",
] as const;

export type HistoricalCorpusInventoryMigrationScopeClass =
  (typeof historicalCorpusInventoryMigrationScopeClasses)[number];

export const historicalCorpusInventoryDuplicateGroupKinds = [
  "duplicate_artifact_id",
  "duplicate_declared_path",
  "exact_file_content_duplicate",
  "exact_record_content_duplicate",
  "semantic_duplicate_candidate",
] as const;

export type HistoricalCorpusInventoryDuplicateGroupKind =
  (typeof historicalCorpusInventoryDuplicateGroupKinds)[number];

export const historicalCorpusInventoryResolutionSafetyValues = [
  "safe_exact_consolidation",
  "ambiguous_operator_review",
  "not_a_merge_candidate",
] as const;

export type HistoricalCorpusInventoryResolutionSafety =
  (typeof historicalCorpusInventoryResolutionSafetyValues)[number];

export const historicalCorpusInventoryDirectoryArtifactTypeMappings = [
  ["Project_Intake", "project_intake"],
  ["Project_Architect_Interview_Prompts", "architect_interview"],
  ["Project_Planning_Documents", "project_planning"],
  ["Project_Roadmap", "project_roadmap"],
  ["Phase_Map", "phase_map"],
  ["Design_Documents", "design_document"],
  ["Project_Observations", "project_observation"],
  ["Workflow_State", "workflow_state"],
  ["Artifact_Registry", "artifact_registry"],
  ["Migration_Manifests", "migration_manifest"],
  ["Phase_Planning", "phase_planning"],
  ["Work_Card_Plans", "work_card_plan"],
  ["Work_Cards", "work_card"],
  ["Implementer_Reports", "implementer_report"],
  ["Builder_Reports", "implementer_report"],
  ["Architect_Reviews", "architect_review"],
  ["Validation_Reports", "operator_validation"],
  ["Operator_Approvals", "operator_approval"],
  ["Closeout_Reports", "phase_closeout"],
  ["Phase_Closeouts", "phase_closeout"],
  ["Reconciliation_Reviews", "reconciliation_review"],
  ["Candidate_Dispositions", "candidate_disposition"],
  ["Diagnostic_Reports", "diagnostic_report"],
  ["Architecture_Decisions", "architecture_decision"],
  ["Repair_Prompts", "repair_prompt"],
  ["UI_Design_Handoff", "supporting_document"],
  ["Roadmap_Rebaseline", "project_roadmap"],
] as const;

export type HistoricalCorpusInventoryPairStatus =
  | "complete_pair"
  | "json_only"
  | "markdown_only"
  | "unsupported_entry";

export interface HistoricalCorpusInventoryInputFile {
  path: string;
  extension: ".json" | ".md" | "unsupported";
  byteLength: number;
  rawSha256: string | null;
  normalizedTextSha256: string | null;
  utf8: boolean;
  jsonParseStatus: "parsed" | "malformed" | "not_json";
  markdownEnvelopeParseStatus: "parsed" | "malformed" | "not_markdown";
  underArchive: boolean;
  partOfSameStemPair: boolean;
  pairedPath: string | null;
  defectCodes: HistoricalCorpusInventoryDefectCode[];
}

export interface HistoricalCorpusInventoryIdentityEvidence {
  field:
    | "artifactId"
    | "artifactType"
    | "projectId"
    | "phaseId"
    | "workCardId"
    | "revision"
    | "status"
    | "parentArtifactId";
  value: string;
  sourceKind:
    | "canonical_pair"
    | "canonical_json"
    | "markdown_envelope"
    | "legacy_json"
    | "path_candidate"
    | "filename_candidate";
  sourcePath: string;
  jsonPointer: string | null;
  confidence: "authority" | "structured" | "candidate";
}

export interface HistoricalCorpusInventoryRegistryEvidence {
  exists: boolean;
  agreement: "agrees" | "disagrees" | "missing" | "not_resolvable";
  entry: {
    revision: number;
    payloadHash: string;
    status: string;
    jsonPath: string;
    markdownPath: string;
  } | null;
  disagreements: HistoricalCorpusInventoryDefectCode[];
}

export interface HistoricalCorpusInventoryCanonicalPairVerification {
  checked: boolean;
  valid: boolean;
  synchronized: boolean;
  errors: string[];
}

export interface HistoricalCorpusInventoryUniqueEvidenceLocation {
  sourceRecordId: string;
  sourcePath: string;
  kind: "structured" | "markdown";
  jsonPointer: string | null;
  headingPath: string | null;
  lineRange: [number, number] | null;
  valueHash: string;
  preview: string | null;
}

export interface HistoricalCorpusInventoryLogicalRecord {
  recordId: string;
  sourcePaths: string[];
  pairStatus: HistoricalCorpusInventoryPairStatus;
  schemaClass: HistoricalCorpusInventorySchemaClass;
  rawFileHashes: Record<string, string | null>;
  normalizedContentHashes: Record<string, string | null>;
  canonicalPairVerification: HistoricalCorpusInventoryCanonicalPairVerification;
  observedArtifactId: string | null;
  observedArtifactType: string | null;
  observedProjectId: string | null;
  observedPhaseId: string | null;
  observedWorkCardId: string | null;
  observedRevision: number | null;
  observedStatus: string | null;
  observedParentArtifactId: string | null;
  observedRelationships: Record<string, string[]> | null;
  declaredJsonPath: string | null;
  declaredMarkdownPath: string | null;
  registry: HistoricalCorpusInventoryRegistryEvidence;
  archiveLocationStatus: "archive" | "non_archive" | "mixed";
  identityEvidence: HistoricalCorpusInventoryIdentityEvidence[];
  identityConfidence: "high" | "conflict" | "candidate" | "unknown";
  metadataConflicts: string[];
  defectCodes: HistoricalCorpusInventoryDefectCode[];
  migrationScope: HistoricalCorpusInventoryMigrationScopeClass;
  inboundReferenceCount: number;
  duplicateGroupIds: string[];
  uniqueEvidenceLocations: HistoricalCorpusInventoryUniqueEvidenceLocation[];
  provenanceLocations: string[];
  semanticKey: string | null;
}

export interface HistoricalCorpusInventoryDefectOccurrence {
  code: HistoricalCorpusInventoryDefectCode;
  recordIds: string[];
  paths: string[];
  message: string;
}

export interface HistoricalCorpusInventoryInboundReference {
  sourceRecordId: string;
  sourcePath: string;
  referencedArtifactId: string | null;
  referencedPath: string | null;
  referenceKind: "structured" | "text";
  jsonPointer: string | null;
  lineNumber: number | null;
  targetExists: boolean;
  duplicateGroupId: string | null;
}

export interface HistoricalCorpusInventoryDuplicateGroup {
  duplicateGroupId: string;
  kind: HistoricalCorpusInventoryDuplicateGroupKind;
  semanticKey: string | null;
  memberRecordIds: string[];
  memberPaths: string[];
  resolutionSafety: HistoricalCorpusInventoryResolutionSafety;
  proposedCanonicalSurvivorRecordId: string | null;
  candidateSurvivorRecordIds: string[];
  survivorBasis: string[];
  uniqueEvidenceLocations: HistoricalCorpusInventoryUniqueEvidenceLocation[];
  inboundReferences: HistoricalCorpusInventoryInboundReference[];
  requiredReferenceUpdates: string[];
  unresolvedReasons: string[];
}

export interface HistoricalCorpusInventoryCounts {
  totalFiles: number;
  totalLogicalRecords: number;
  completePairs: number;
  jsonOnlyRecords: number;
  markdownOnlyRecords: number;
  malformedJsonFiles: number;
  invalidCanonicalPairs: number;
  byExtension: Record<string, number>;
  byArtifactType: Record<string, number>;
  byPhase: Record<string, number>;
  byStatus: Record<string, number>;
  bySchemaClass: Record<string, number>;
  byMigrationScope: Record<string, number>;
  byDefectCode: Record<string, number>;
  duplicateGroupsByKind: Record<string, number>;
  safeExactGroups: number;
  ambiguousGroups: number;
  recordsWithUniqueEvidence: number;
  inboundReferences: number;
  missingReferenceDefects: number;
}

export interface HistoricalCorpusInventoryManifestV1 {
  schemaVersion: typeof historicalCorpusInventorySchemaVersion;
  projectId: "champcity-ai";
  planningRoot: "planning";
  sourceFingerprintBefore: string;
  sourceFingerprintAfter: string;
  sourceSnapshotStable: true;
  excludedGeneratedPaths: string[];
  excludedTemporaryPaths: Array<{ path: string; reason: string }>;
  files: HistoricalCorpusInventoryInputFile[];
  records: HistoricalCorpusInventoryLogicalRecord[];
  duplicateGroups: HistoricalCorpusInventoryDuplicateGroup[];
  inboundReferences: HistoricalCorpusInventoryInboundReference[];
  defects: HistoricalCorpusInventoryDefectOccurrence[];
  counts: HistoricalCorpusInventoryCounts;
  safeExactConsolidationGroupIds: string[];
  ambiguousOperatorReviewGroupIds: string[];
  unresolvedRecordIds: string[];
}

export function compareHistoricalCorpusPaths(left: string, right: string): number {
  return left.localeCompare(right);
}

export function stableHistoricalCorpusInventoryJson(
  manifest: HistoricalCorpusInventoryManifestV1,
): string {
  return `${canonicalPrettyStringify(manifest)}\n`;
}

export function isHistoricalCorpusInventoryDefectCode(
  value: string,
): value is HistoricalCorpusInventoryDefectCode {
  return (historicalCorpusInventoryDefectCodes as readonly string[]).includes(value);
}

export function validateHistoricalCorpusInventoryManifestV1(
  manifest: HistoricalCorpusInventoryManifestV1,
): void {
  if (manifest.schemaVersion !== historicalCorpusInventorySchemaVersion) {
    throw new Error("Historical corpus inventory manifest has an unsupported schema version.");
  }
  if (manifest.projectId !== "champcity-ai" || manifest.planningRoot !== "planning") {
    throw new Error("Historical corpus inventory manifest is not scoped to ChampCity planning.");
  }
  if (!manifest.sourceSnapshotStable || manifest.sourceFingerprintBefore !== manifest.sourceFingerprintAfter) {
    throw new Error("Historical corpus inventory manifest source snapshot is not stable.");
  }
  const filePaths = new Set<string>();
  for (const file of manifest.files) {
    if (filePaths.has(file.path)) {
      throw new Error(`File inventory contains duplicate path ${file.path}.`);
    }
    filePaths.add(file.path);
  }
  const recordIds = new Set<string>();
  for (const record of manifest.records) {
    if (recordIds.has(record.recordId)) {
      throw new Error(`Logical record inventory contains duplicate record ID ${record.recordId}.`);
    }
    recordIds.add(record.recordId);
    for (const defect of record.defectCodes) {
      if (!isHistoricalCorpusInventoryDefectCode(defect)) {
        throw new Error(`Unsupported defect code ${defect}.`);
      }
    }
  }
  if (manifest.counts.totalFiles !== manifest.files.length) {
    throw new Error("File count does not match file inventory.");
  }
  if (manifest.counts.totalLogicalRecords !== manifest.records.length) {
    throw new Error("Logical record count does not match record inventory.");
  }
  if (manifest.counts.inboundReferences !== manifest.inboundReferences.length) {
    throw new Error("Inbound reference count does not match reference inventory.");
  }
  if (manifest.counts.safeExactGroups !== manifest.safeExactConsolidationGroupIds.length) {
    throw new Error("Safe exact duplicate group count does not match group IDs.");
  }
  if (manifest.counts.ambiguousGroups !== manifest.ambiguousOperatorReviewGroupIds.length) {
    throw new Error("Ambiguous duplicate group count does not match group IDs.");
  }
}
