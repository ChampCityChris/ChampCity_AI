import type { RoutedActionContract } from "../workflow";
import type { CurrentRequiredActionResult } from "../workCards/currentActionProjection";
import type {
  OperatorDecisionEvent,
  OperatorDecisionIntent,
  OperatorDecisionResult,
  OperatorDecisionStage,
  OperatorDecisionTargetBinding,
  OperatorDispositionReviewState,
  OperatorLegacyDecisionEvidence,
} from "../operatorDecisionContract";

export type ProjectObserverStatus =
  | "stopped"
  | "starting"
  | "watching"
  | "scanning"
  | "blocked"
  | "error";

export type ConfiguredBranchBehavior =
  | { mode: "observe-current" }
  | { mode: "require"; branch: string };

export interface RepositoryScanChangeSummary {
  addedArtifactIds: string[];
  changedArtifactIds: string[];
  removedArtifactIds: string[];
}
export interface RepositoryScanBlocker {
  code:
    | "unsupported_repository"
    | "incomplete_pair"
    | "invalid_pair"
    | "project_mismatch"
    | "duplicate_authority"
    | "relationship_conflict"
    | "branch_mismatch"
    | "scan_failed";
  message: string;
  artifactIds: string[];
  paths: string[];
}

export interface ProjectScanResult {
  scanId: string;
  scannedAt: string;
  branch: string | null;
  graphFingerprint: string;
  artifactCount: number;
  controllingArtifactCount: number;
  historicalArtifactCount: number;
  changes: RepositoryScanChangeSummary;
  blockers: RepositoryScanBlocker[];
  projectionRevision: number;
  currentAction: RoutedActionContract | null;
  noOp: boolean;
}

export interface ConfiguredProject {
  projectId: string;
  displayName: string;
  repositoryRoot: string;
  planningRoot: string;
  branchBehavior: ConfiguredBranchBehavior;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  lastScanAt: string | null;
  lastScanResult: ProjectScanResult | null;
  observerStatus: ProjectObserverStatus;
}

export interface ProjectWorkspaceRegistryDocument {
  schemaVersion: "champcity.project-workspaces.v1";
  selectedProjectId: string | null;
  projects: ConfiguredProject[];
}

export interface ProjectWorkspaceSummary {
  projectId: string;
  displayName: string;
  repositoryRoot: string;
  planningRoot: string;
  branchBehavior: ConfiguredBranchBehavior;
  enabled: boolean;
  selected: boolean;
  observerStatus: ProjectObserverStatus;
  lastScanAt: string | null;
  lastScanResult: ProjectScanResult | null;
}

export interface ProjectWorkspaceListResult {
  ok: boolean;
  selectedProjectId: string | null;
  projects: ProjectWorkspaceSummary[];
  errorMessages?: string[];
}

export interface AddProjectWorkspaceRequest {
  repositoryRoot: string;
  displayName?: string;
  projectId?: string;
  planningRoot?: string;
  branchBehavior?: ConfiguredBranchBehavior;
}

export interface ProjectWorkspaceMutationResult extends ProjectWorkspaceListResult {
  project?: ProjectWorkspaceSummary;
}

export interface ProjectFolderSelectionResult {
  ok: boolean;
  repositoryRoot?: string;
  cancelled?: boolean;
  errorMessages?: string[];
}

export interface RefreshRepositoryStateResult {
  ok: boolean;
  selectedProjectId: string | null;
  scanResult?: ProjectScanResult;
  errorMessages?: string[];
}

export type GovernanceRepairRegistryStatus =
  | "registered"
  | "missing_registration"
  | "registry_unavailable"
  | "registry_disagreement";

export type GovernanceRepairKind =
  | "canonical_serialization_repair"
  | "missing_registry_registration"
  | "semantic_identity_repair"
  | "explicit_superseded_path_cleanup"
  | "stale_registry_entry_refresh"
  | "legacy_closeout_normalization"
  | "irreconcilable_semantic_conflict"
  | "none";

export type GovernanceRepairItemStatus =
  | "automatic_repair_available"
  | "operator_semantic_decision_required"
  | "irreconcilable_conflict";

export type NumberedLegacyPathDisposition =
  | "migrate_to_canonical_fixed_path"
  | "conflict_requires_manual_field_selection";

export type DuplicateOperatorValidationDisposition =
  | "use_numbered_record_as_next_canonical_revision"
  | "keep_fixed_record_and_delete_duplicate";

export interface GovernanceDeterministicRepairPlan {
  title:
    | "Delete explicit superseded path"
    | "Refresh stale Registry entry"
    | "Normalize legacy closeout record";
  affectedFiles: string[];
  affectedRegistryEntries: string[];
  previewSummary: string;
  activeJsonPath?: string;
  activeMarkdownPath?: string;
  requiresDuplicateDisposition?: boolean;
  fixedRecordLabel?: string;
  numberedRecordLabel?: string;
}

export interface GovernanceSemanticRepairFieldDecision {
  field: string;
  currentValue?: string;
  proposedValue?: string;
  decisionState: "preserve" | "proposed" | "operator_required" | "conflict";
  confidence: "high" | "blocked";
  evidence: string[];
}

export interface GovernanceSemanticInboundReference {
  artifactId: string;
  artifactType: string;
  relationshipField:
    | "relationships.sources"
    | "relationships.expectedOutputs"
    | "relationships.supersedes"
    | "relationships.children"
    | "parentArtifactId";
  revision: number;
  canonical: boolean;
  synchronized: boolean;
  safelyRewritable: boolean;
  proposedReplacementValue: string;
}

export interface GovernanceSemanticDuplicateRecordSummary {
  artifactId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  payloadHash: string;
  validationResult?: string;
  validationDecision?: string;
  title: string;
  contentMarkdownHash: string;
  contentMarkdownEqualToOther: boolean;
  payloadDifferenceSummary: string;
  structuredPayloadFieldsAdded: string[];
  structuredPayloadFieldsRemoved: string[];
  structuredPayloadFieldsChanged: string[];
  titleDifferences: string[];
  recognizedValidationSectionDifferences: string[];
  jsonPath: string;
  markdownPath: string;
  registryStatus: GovernanceRepairRegistryStatus;
  inboundReferences: GovernanceSemanticInboundReference[];
  outboundReferences: string[];
}

export interface GovernanceSemanticDuplicateReconciliation {
  title: "Duplicate Artifact Cleanup";
  canonicalArtifactId: string;
  canonicalJsonPath: string;
  canonicalMarkdownPath: string;
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  workCardTitleEvidence: string;
  numberedRecord: GovernanceSemanticDuplicateRecordSummary;
  fixedPathRecord: GovernanceSemanticDuplicateRecordSummary;
  fixedPathAlreadyOccupied: true;
  numberedRecordAppearsLater: boolean;
  allowedDispositions: DuplicateOperatorValidationDisposition[];
  requiredDisposition: "duplicate_operator_validation_fixed_path";
  actualPayloadDifferences: string[];
  proposedCanonicalRevision: number;
  selectedContentSource?: "fixed_path_record" | "numbered_duplicate_record";
  duplicateJsonPathToDelete: string;
  duplicateMarkdownPathToDelete: string;
  affectedFiles: string[];
  affectedRegistryEntries: string[];
  safeToApply: boolean;
  basisSummary: string;
}

export interface GovernanceSemanticRepairProposal {
  currentArtifactId: string;
  proposedArtifactId: string;
  currentProjectId?: string;
  proposedProjectId?: string;
  currentPhaseId?: string;
  proposedPhaseId?: string;
  currentWorkCardId?: string;
  proposedWorkCardId?: string;
  currentParentArtifactId?: string;
  proposedParentArtifactId?: string;
  currentJsonPath: string;
  currentMarkdownPath: string;
  proposedJsonPath: string;
  proposedMarkdownPath: string;
  currentStatus: string;
  proposedStatus: string;
  fieldDecisions: GovernanceSemanticRepairFieldDecision[];
  conflictingCandidates: string[];
  affectedRegistryEntry?: string;
  inboundReferences: GovernanceSemanticInboundReference[];
  outboundReferences: string[];
  safeToApplyAutomaticallyAfterOperatorConfirmation: boolean;
  numberedLegacyPath: boolean;
  allowedNumberedLegacyDispositions: NumberedLegacyPathDisposition[];
  requiredDisposition?: "numbered_legacy_path";
  collision?: string;
  unresolvedReferenceMigration?: string;
  canonicalIdentityContractSource?: string;
  canonicalPathContractSource?: string;
  workCardTitleEvidence?: string;
  duplicateReconciliation?: GovernanceSemanticDuplicateReconciliation;
  basisSummary: string;
  canAlterCurrentRouting: boolean;
}

export interface GovernanceRepairCandidate {
  artifactId: string;
  artifactType: string;
  phaseId?: string;
  workCardId?: string;
  revision: number;
  status: string;
  payloadHash: string;
  jsonPath: string;
  markdownPath: string;
  verificationError: string;
  registryStatus: GovernanceRepairRegistryStatus;
  safelyRepairable: boolean;
  payloadContentWouldChange: boolean;
  payloadImpact: "unchanged" | "would_change" | "unknown";
  repairKind: GovernanceRepairKind;
  issueClassification:
    | "incomplete_or_semantic_mismatch"
    | "noncanonical_serialization"
    | "semantic_identity_mismatch"
    | "irreconcilable_semantic_conflict"
    | "missing_registry_registration";
  repairStatus: "repairable" | "review_available" | "blocked";
  itemStatus: GovernanceRepairItemStatus;
  routeStatus: "governance_maintenance_required";
  operationLabel:
    | "Canonicalize pair"
    | "Register canonical pair"
    | "Duplicate Artifact Cleanup"
    | "Delete explicit superseded path"
    | "Refresh stale Registry entry"
    | "Normalize legacy closeout record"
    | "Review semantic repair"
    | "Create repair request";
  canAffectCurrentRouting: boolean;
  candidateFingerprint: string;
  projectionRevision?: number;
  existingSpecificationRequest?: GovernanceRepairSpecificationRequestSummary;
  semanticProposal?: GovernanceSemanticRepairProposal;
  deterministicRepairPlan?: GovernanceDeterministicRepairPlan;
  blockReason?: string;
}

export interface GovernanceRepairSpecificationRequestSummary {
  artifactId: string;
  requestId: string;
  status: string;
  revision: number;
  jsonPath: string;
  markdownPath: string;
  candidateKey: string;
  expectedRepairWorkCardId: string;
  expectedRepairWorkCardArtifactId: string;
}

export interface GovernanceRepairPreviewResult {
  ok: boolean;
  blockedMessage: "Governance records require canonical repair.";
  candidates: GovernanceRepairCandidate[];
  repairableCount: number;
  payloadContentSummary: string;
  currentAction?: RoutedActionContract | null;
  errorMessages?: string[];
}

export interface GovernanceRepairOperationResult extends GovernanceRepairPreviewResult {
  repairedArtifactIds: string[];
  registryRevision?: number;
  cleanupWarnings?: string[];
  maintenanceActionLabel?: string;
  maintenance?: GovernanceMaintenanceSummary;
  currentRequiredAction?: CurrentRequiredActionResult;
  scanResult?: ProjectScanResult;
  projectionRevision?: number;
}

export interface GovernanceRepairIntent {
  artifactId: string;
  jsonPath: string;
  markdownPath: string;
  repairKind: GovernanceRepairCandidate["repairKind"];
  expectedRevision: number;
  numberedLegacyDisposition?: NumberedLegacyPathDisposition;
  duplicateDisposition?: DuplicateOperatorValidationDisposition;
  semanticProposal?: GovernanceSemanticRepairProposal;
}

export interface GovernanceRepairSpecificationSelection {
  artifactId: string;
  jsonPath: string;
  markdownPath: string;
  expectedCandidateRevision: number;
  expectedProjectionRevision: number;
  expectedCandidateFingerprint: string;
}

export interface GovernanceRepairSpecificationPreviewInput
  extends GovernanceRepairSpecificationSelection {
  operatorNote?: string;
}

export interface GovernanceRepairSpecificationCreateInput
  extends GovernanceRepairSpecificationSelection {
  operatorNote?: string;
  operatorConfirmed: boolean;
}

export interface GovernanceRepairSpecificationTargetSnapshot {
  projectId: string;
  targetArtifactId: string;
  artifactType: string;
  status: string;
  revision: number;
  jsonPath: string;
  markdownPath: string;
  phaseId?: string;
  workCardId?: string;
  parentArtifactId?: string;
  repairKind: GovernanceRepairKind;
  issueType: GovernanceRepairCandidate["issueClassification"];
  itemStatus: GovernanceRepairItemStatus;
  repairStatus: GovernanceRepairCandidate["repairStatus"];
  operationLabel: GovernanceRepairCandidate["operationLabel"];
  blockReason?: string;
  verificationError: string;
  registryStatus: GovernanceRepairRegistryStatus;
  collision?: string;
  conflictingCandidateDescriptions: string[];
  unresolvedReferenceMigration?: string;
  proposedCanonicalArtifactId?: string;
  proposedPhaseId?: string;
  proposedWorkCardId?: string;
  proposedJsonPath?: string;
  proposedMarkdownPath?: string;
  sourceArtifactIds: string[];
  canAffectRouting: boolean;
  projectionRevision: number;
  candidateFingerprint: string;
  registryRevision: number;
}

export interface GovernanceRepairSpecificationGovernanceFlags {
  changesTargetArtifact: false;
  approvesTargetArtifact: false;
  resolvesCandidate: false;
  createsWorkCard: false;
  authorizesImplementation: false;
  advancesWorkflow: false;
  changesNormalWorkflowAuthority: false;
}

export interface GovernanceRepairSpecificationRequestPreview {
  ok: boolean;
  existingRequest?: GovernanceRepairSpecificationRequestSummary;
  requestArtifactId?: string;
  requestId?: string;
  candidateKey?: string;
  fixedJsonPath?: string;
  fixedMarkdownPath?: string;
  expectedRepairWorkCardId?: string;
  expectedRepairWorkCardArtifactId?: string;
  targetSnapshot?: GovernanceRepairSpecificationTargetSnapshot;
  governanceFlags?: GovernanceRepairSpecificationGovernanceFlags;
  operatorConcern?: string;
  operatorExpectedRoute?: string;
  evidenceSnapshot?: {
    acceptedOrControlling: string[];
    presentPendingDisposition: string[];
    missingRequired: string[];
    nonControlling: string[];
    ambiguityWarnings: string[];
  };
  wouldMutate: false;
  errorMessages?: string[];
}

export interface GovernanceRepairSpecificationRequestCreateResult
  extends GovernanceRepairSpecificationRequestPreview {
  created: boolean;
  idempotent: boolean;
  updated: boolean;
  revision?: number;
  registryRevision?: number;
  currentAction?: RoutedActionContract | null;
  maintenanceActionLabel?: string;
  maintenance?: GovernanceMaintenanceSummary;
  currentRequiredAction?: CurrentRequiredActionResult;
  scanResult?: ProjectScanResult;
  projectionRevision?: number;
}

export type GovernanceApprovalTargetKind = "phase" | "work_card";
export type GovernanceApprovalDecisionAction =
  | "approved"
  | "revision_requested"
  | "rejected"
  | "accepted_as_current"
  | "accepted_as_historical_evidence"
  | "superseded"
  | "merged"
  | "deferred"
  | "cancelled"
  | "invalid"
  | "revision_required";

export type GovernanceApprovalDecisionEvent = OperatorDecisionEvent;

export interface GovernanceApprovalDecisionIntent extends OperatorDecisionIntent {}

export interface GovernanceApprovalDecisionResult extends GovernanceMaintenanceSnapshotResult {
  decisionArtifactId?: OperatorDecisionResult["decisionArtifactId"];
  decisionRevision?: OperatorDecisionResult["decisionRevision"];
  decisionEvent?: OperatorDecisionResult["decisionEvent"];
  lookupState?: OperatorDecisionResult["lookupState"];
  idempotent?: OperatorDecisionResult["idempotent"];
  registryRevision?: OperatorDecisionResult["registryRevision"];
}

export interface GovernanceApprovalQueueItem {
  targetArtifactId: string;
  artifactType: string;
  phaseId?: string;
  workCardId?: string;
  title: string;
  contentMarkdown: string;
  revision: number;
  payloadHash: string;
  jsonPath: string;
  markdownPath: string;
  registryStatus: "registered";
  status: string;
  approvalStatus:
    | OperatorDispositionReviewState
    | "invalid"
    | "stale"
    | "mismatched"
    | "exact";
  approvalArtifactId: string;
  existingApprovalArtifactId?: string;
  reason: string;
  targetKind: GovernanceApprovalTargetKind;
  decisionStage: OperatorDecisionStage;
  targetBindings: OperatorDecisionTargetBinding[];
  targetSetHash: string;
  legacyEvidence: OperatorLegacyDecisionEvidence[];
  approvalClassification: "phase_planning" | "work_card";
  authorizationBoundary: string;
  decisionWorkspaceScreenId:
    | "operator-phase-approval"
    | "operator-work-card-approval";
  decisionWorkspaceLabel: string;
  decisionEffect: string;
  implementationAuthorizationAvailable: boolean;
  decisionTimeline: GovernanceApprovalDecisionEvent[];
  canonicalPhasePlanningArtifactId?: string;
  canonicalPhasePlanningRevision?: number;
  canonicalPhasePlanningPayloadHash?: string;
  canonicalWorkCardPlanArtifactId?: string;
  canonicalWorkCardPlanRevision?: number;
  canonicalWorkCardPlanPayloadHash?: string;
}

export interface GovernanceApprovalQueueResult {
  ok: boolean;
  items: GovernanceApprovalQueueItem[];
  errorMessages?: string[];
}

export interface GovernanceMaintenanceSummary {
  repair: GovernanceRepairPreviewResult;
  approval: GovernanceApprovalQueueResult;
}

export interface GovernanceMaintenanceSnapshotResult {
  ok: boolean;
  maintenance: GovernanceMaintenanceSummary;
  currentAction: RoutedActionContract | null;
  maintenanceActionLabel?: string;
  currentRequiredAction?: CurrentRequiredActionResult;
  selectedProjectId: string | null;
  scanResult?: ProjectScanResult;
  projectionRevision?: number;
  errorMessages?: string[];
}
