import type {
  FirstNonApprovedResult,
} from "./documents/documentOrder";
import type {
  InitializationPreview,
  InitializationResult,
  PlanningDocumentDetail,
  PlanningDocumentSummary,
} from "./documents/planningDocument";
import type { DocumentDispositionStatus } from "./documents/documentDisposition";
import {
  createWorkspaceRegistry,
  type WorkspaceDefinition,
  type WorkspaceId,
  type WorkspaceLabel,
} from "./workspaces/workspaceRegistry";

export type { WorkspaceDefinition, WorkspaceId, WorkspaceLabel };

export type WorkspaceSelection =
  | {
      ok: true;
      workspaceRoot: string;
      mcpWorkspaceBinding?: McpWorkspaceBinding;
    }
  | {
      ok: false;
      workspaceRoot: null;
      reason: string;
    };

export interface McpWorkspaceBinding {
  mcpWorkspaceId: string;
  label?: string;
  repositoryName?: string;
  branch?: string;
  gitBacked: boolean;
}

export interface AppInfo {
  name: "ChampCity A/I";
  version: string;
}

export const projectTypeOptions = [
  "Desktop application",
  "Web application",
  "Mobile application",
  "CLI or tool",
  "Library or service",
  "Documentation or process",
  "Other",
] as const;

export type ProjectType = (typeof projectTypeOptions)[number];

export interface ProjectIntakeSubmission {
  projectName: string;
  projectPurpose: string;
  desiredOutcome: string;
  projectType: ProjectType;
  projectRepository: string;
  hasExistingSourceOrPlanning: boolean;
  knownConstraints?: string;
  repositoryReviewContext?: string;
}

export interface ProjectIntakeSubmissionResult {
  ok: true;
  projectSlug: string;
  projectRoot: string;
  projectIntakeMarkdownPath: string;
  architectPromptMarkdownPath: string;
  architectInterviewTargetMarkdownPath: string;
  artifactRevision: number;
  promptRevision: number;
  invalidatedPaths: string[];
}

export const architectBrowserLoadStates = [
  "detached",
  "loading",
  "loaded-auth-state-unknown",
  "operator-confirmed-signed-in",
  "load-failed",
] as const;

export type ArchitectBrowserLoadState = (typeof architectBrowserLoadStates)[number];

export type ArchitectOutputWorkspaceState =
  | "not-ready"
  | "ready-for-handoff"
  | "waiting-for-drafts"
  | "partial-draft-set"
  | "promotion-failed"
  | "ready-for-review"
  | "revision-requested"
  | "rejected"
  | "completed"
  | "needs-attention";

export type ArchitectOutputReviewMode = "single" | "compound";

export interface ArchitectOutputDocumentSlotModel {
  slotId: string;
  displayLabel: string;
  targetPath: string;
  logicalDocumentId?: string;
  artifactRevision?: number;
  disposition?: DocumentDispositionStatus;
  documentReadState: string;
  freshnessState?: "fresh" | "stale";
  readError?: string;
}

export interface ArchitectOutputPresentedSlotRevision {
  slotId: string;
  targetPath: string;
  artifactRevision: number;
}

export interface ArchitectOutputWorkspaceModel {
  workspaceId: WorkspaceId;
  outputKind: string;
  bundleMode: "single-output" | "atomic-bundle";
  state: ArchitectOutputWorkspaceState;
  railStatus: ProjectLifecycleRailStatus;
  requiredAction: string;
  reason: string;
  evidencePaths: string[];
  handoff?: {
    path: string;
    revision: number;
  };
  preparedInstruction?: string;
  submission?: {
    submissionId: string;
    state: "waiting-for-drafts" | "partial-draft-set" | "ready-for-promotion" | "promotion-failed" | "promoted" | "superseded";
    draftSlots: Array<{
      slotId: string;
      displayLabel: string;
      draftRelativePath: string;
    }>;
  };
  promotionError?: string;
  cleanupStatus?: string;
  cleanupError?: string;
  canPrepareHandoff: boolean;
  canCopyHandoff: boolean;
  canRegeneratePrompt?: boolean;
  reviewMode: ArchitectOutputReviewMode;
  documentSlots: ArchitectOutputDocumentSlotModel[];
  canApplyDisposition: boolean;
  currentOperatorReviewNotes?: string;
  domain?: unknown;
  canPrepareFinalDraftHandoff?: boolean;
  canCopyFinalDraftHandoff?: boolean;
  finalDraftPreparedInstruction?: string;
}

export type ArchitectHandoffState =
  | "handoff-unavailable"
  | "handoff-ready"
  | "handoff-failed";

export const architectBrowserAttachmentStates = [
  "detached",
  "attaching",
  "attached-zero-bounds",
  "attached-visible",
  "attach-failed",
] as const;

export type ArchitectBrowserAttachmentState =
  (typeof architectBrowserAttachmentStates)[number];

export interface ArchitectHandoffManifest {
  state: ArchitectHandoffState;
  promptMarkdownPath?: string;
  projectIntakeMarkdownPath?: string;
  interviewMarkdownTargetPath?: string;
  handoffInstruction?: string;
  mcpWorkspaceBinding?: McpWorkspaceBinding;
  reason?: string;
}

export interface ArchitectBrowserAttachmentStatus {
  state: ArchitectBrowserAttachmentState;
  isViewCreated: boolean;
  isAttachedToWindow: boolean;
  isVisible: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    sequence: number;
  };
  lastError?: string;
}

export type ArchitectBrowserNavigationDisposition =
  | "allow"
  | "deny"
  | "internal-auth-surface"
  | "external";

export type ArchitectBrowserNavigationFrame = "main-frame" | "popup";

export interface ArchitectBrowserNavigationDiagnostic {
  timestamp: string;
  eventType: string;
  sourceHost: string | null;
  destinationHost: string | null;
  frame: ArchitectBrowserNavigationFrame;
  disposition: ArchitectBrowserNavigationDisposition;
  webContentsId: number;
  sessionPartition: "persist:champcity-architect";
  loadResult?: {
    success: boolean;
    code?: number;
  };
}

export interface ArchitectBrowserFoundationStatus {
  surfaceUrl: string;
  sessionPartition: "persist:champcity-architect";
  browserState: ArchitectBrowserLoadState;
  boundsSequence?: number;
  attachment: ArchitectBrowserAttachmentStatus;
  navigationDiagnostics: ArchitectBrowserNavigationDiagnostic[];
  handoff: ArchitectHandoffManifest;
  security: {
    nodeIntegration: false;
    contextIsolation: true;
    sandbox: true;
    preload: null;
  };
}

export type ClosureDecision = "Close" | "DoNotClose";

export interface BrowserViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  sequence?: number;
  attachmentGeneration?: number;
}

export interface RuntimeActionResult {
  ok: true;
  action: string;
  message: string;
  payload?: unknown;
}

export type OperatorValidationDecision = "ValidatePassed" | "RequestRepair";

export interface OperatorValidationDecisionInput {
  decision: OperatorValidationDecision;
  operatorNotes: string;
  advisorySummary?: string;
  repairDefectText?: string;
}

export type ArchitectInterviewWorkspaceState =
  | "prerequisites-unavailable"
  | "prompt-missing"
  | "ready-for-handoff"
  | "waiting-for-output"
  | "ready-for-review"
  | "revision-requested"
  | "rejected"
  | "completed"
  | "needs-attention";

export type ArchitectInterviewRailStatus =
  | "Open"
  | "Waiting for Output"
  | "Awaiting Approval"
  | "Completed"
  | "Needs Attention";

export type ProjectLifecycleRailStatus =
  | "Not Ready"
  | "Open"
  | "Ready"
  | "Waiting for Output"
  | "Awaiting Approval"
  | "In Progress"
  | "Completed"
  | "Needs Attention"
  | "Conflict";

export type ArchitectInterviewSelectedDocumentRole = "project-intake" | "prompt" | "interview";

export interface ArchitectInterviewDocumentIdentity {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  disposition: DocumentDispositionStatus;
  documentReadState: string;
  freshnessState?: "fresh" | "stale";
  participationRole?: string;
  artifactType?: string;
  readError?: string;
  operatorReviewNotes?: string;
}

export interface ArchitectInterviewWorkspaceModel {
  state: ArchitectInterviewWorkspaceState;
  railStatus: ArchitectInterviewRailStatus;
  handoffState: ArchitectHandoffState;
  handoffInstruction?: string;
  draftSubmissionState?: "waiting-for-drafts" | "partial-draft-set" | "ready-for-promotion" | "promotion-failed" | "promoted" | "superseded";
  draftPromotionError?: string;
  projectIntakeDocument?: ArchitectInterviewDocumentIdentity;
  promptDocument?: ArchitectInterviewDocumentIdentity & { outputMarkdownPath?: string };
  interviewTargets?: {
    markdownPath: string;
  };
  interviewDocument?: ArchitectInterviewDocumentIdentity;
  selectedReviewDocumentRole: ArchitectInterviewSelectedDocumentRole;
  interviewDisposition?: DocumentDispositionStatus;
  documentReadState?: string;
  freshnessState?: "fresh" | "stale";
  canRegeneratePrompt?: boolean;
  canPrepareHandoff?: boolean;
  canCopyHandoff: boolean;
  canPrepareFinalDraftHandoff?: boolean;
  canCopyFinalDraftHandoff?: boolean;
  finalDraftHandoffInstruction?: string;
  canApplyDisposition: boolean;
  currentOperatorReviewNotes?: string;
  projectIntakeComplete: boolean;
  requiredAction: string;
  reason: string;
  evidencePaths: string[];
  markdownPath?: string;
  preview?: string;
}

export type ProjectPlanningWorkspaceState =
  | "not-ready"
  | "ready-for-handoff"
  | "waiting-for-output"
  | "partial-output"
  | "ready-for-review"
  | "revision-requested"
  | "rejected"
  | "completed"
  | "needs-attention";

export type ProjectPlanningSelectedDocumentRole = "profile" | "roadmap";
export type PhasePlanningSelectedDocumentRole = "phase-planning" | "work-card-plan";

export type ProjectPlanningReconciliationMode =
  | "greenfield"
  | "reconciliation-required"
  | "needs-attention";

export interface ProjectPlanningDocumentIdentity {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  disposition: DocumentDispositionStatus;
  documentReadState: string;
  freshnessState?: "fresh" | "stale";
  participationRole?: string;
  artifactType?: string;
  readError?: string;
  operatorReviewNotes?: string;
}

export interface ProjectPlanningWorkspaceModel {
  state: ProjectPlanningWorkspaceState;
  railStatus: ProjectLifecycleRailStatus;
  requiredAction: string;
  reason: string;
  evidencePaths: string[];
  handoffState: ArchitectHandoffState;
  handoffMarkdownPath?: string;
  handoffInstruction?: string;
  handoffArtifactRevision?: number;
  handoffPreparationMessage?: string;
  draftSubmissionState?: "waiting-for-drafts" | "partial-draft-set" | "ready-for-promotion" | "promotion-failed" | "promoted" | "superseded";
  draftPromotionError?: string;
  canPrepareHandoff: boolean;
  canCopyHandoff: boolean;
  canApplyBundleDisposition: boolean;
  reconciliationMode?: ProjectPlanningReconciliationMode;
  repositoryReviewRequired?: boolean;
  repositoryReviewContext?: string;
  legacyPlanningPaths?: string[];
  sourceEvidencePaths?: string[];
  projectProfileTarget?: string;
  projectRoadmapTarget?: string;
  profileDocument?: ProjectPlanningDocumentIdentity;
  roadmapDocument?: ProjectPlanningDocumentIdentity;
  selectedPlanningDocumentRole: ProjectPlanningSelectedDocumentRole;
  bundleSynchronizationState: "missing" | "partial" | "synchronized" | "mixed-disposition" | "invalid";
  currentOperatorReviewNotes?: string;
}

export type PhasePlanningWorkspaceState =
  | "not-ready"
  | "ready-for-handoff"
  | "waiting-for-output"
  | "partial-output"
  | "ready-for-review"
  | "revision-requested"
  | "rejected"
  | "completed"
  | "needs-attention";

export interface PhasePlanningPhaseContext {
  phaseId: string;
  title: string;
  order: number;
  purpose: string;
  dependsOn: string[];
  sourceReferences: string[];
}

export interface PhasePlanningDocumentIdentity {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  disposition: DocumentDispositionStatus;
  documentReadState: string;
  freshnessState?: "fresh" | "stale";
  participationRole?: string;
  artifactType?: string;
  readError?: string;
  operatorReviewNotes?: string;
}

export interface PhasePlanningWorkspaceModel {
  state: PhasePlanningWorkspaceState;
  railStatus: ProjectLifecycleRailStatus;
  requiredAction: string;
  reason: string;
  evidencePaths: string[];
  handoffState: ArchitectHandoffState;
  handoffMarkdownPath?: string;
  handoffInstruction?: string;
  handoffArtifactRevision?: number;
  handoffPreparationMessage?: string;
  draftSubmissionState?: "waiting-for-drafts" | "partial-draft-set" | "ready-for-promotion" | "promotion-failed" | "promoted" | "superseded";
  draftPromotionError?: string;
  canPrepareHandoff: boolean;
  canCopyHandoff: boolean;
  canApplyBundleDisposition: boolean;
  phase: PhasePlanningPhaseContext | null;
  phasePlanningTarget: string;
  workCardPlanTarget: string;
  phasePlanningDocument?: PhasePlanningDocumentIdentity;
  workCardPlanDocument?: PhasePlanningDocumentIdentity;
  selectedPlanningDocumentRole: PhasePlanningSelectedDocumentRole;
  bundleSynchronizationState: "missing" | "partial" | "synchronized" | "mixed-disposition" | "mixed-notes" | "invalid";
  currentOperatorReviewNotes?: string;
}

export type PhaseInterviewWorkspaceState =
  | "not-ready"
  | "ready-for-handoff"
  | "waiting-for-output"
  | "ready-for-review"
  | "revision-requested"
  | "rejected"
  | "completed"
  | "needs-attention";

export type PhaseInterviewSelectedDocumentRole = "phase-interview";

export interface PhaseInterviewDocumentIdentity {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  disposition: DocumentDispositionStatus;
  documentReadState: string;
  freshnessState?: "fresh" | "stale";
  participationRole?: string;
  artifactType?: string;
  readError?: string;
  operatorReviewNotes?: string;
}

export interface PhaseInterviewPhaseContext {
  phaseId: string;
  title: string;
  order: number;
  purpose: string;
  dependsOn: string[];
  sourceReferences: string[];
  dependencyCloseoutPaths: string[];
}

export interface PhaseInterviewWorkspaceModel {
  state: PhaseInterviewWorkspaceState;
  railStatus: ProjectLifecycleRailStatus;
  requiredAction: string;
  reason: string;
  evidencePaths: string[];
  handoffState: ArchitectHandoffState;
  handoffMarkdownPath?: string;
  handoffInstruction?: string;
  handoffArtifactRevision?: number;
  handoffPreparationMessage?: string;
  draftSubmissionState?: "waiting-for-drafts" | "partial-draft-set" | "ready-for-promotion" | "promotion-failed" | "promoted" | "superseded";
  draftPromotionError?: string;
  canPrepareHandoff: boolean;
  canCopyHandoff: boolean;
  canApplyDisposition: boolean;
  phase?: PhaseInterviewPhaseContext;
  phaseInterviewTarget: string;
  interviewDocument?: PhaseInterviewDocumentIdentity;
  selectedReviewDocumentRole: PhaseInterviewSelectedDocumentRole;
  currentOperatorReviewNotes?: string;
}

export interface WorkCardIntakeCandidateProjection {
  candidateId: string;
  order: number;
  title: string;
  purpose: string;
  dependsOn: string[];
  resolutionStatus: string;
  resolutionReason: string;
  evidencePaths: string[];
  carriedForwardToPhaseId?: string;
}

export interface WorkCardIntakeProjection {
  phaseId: string;
  sourceWorkCardPlanPath: string;
  selectionReason: string;
  candidate: WorkCardIntakeCandidateProjection;
  handoffMarkdownPath: string;
  formalWorkCardMarkdownPath: string;
}

export type WorkCardMapCandidateStatus = "Complete" | "Eligible" | "Ineligible";

export interface WorkCardMapCandidateProjection {
  candidateId: string;
  order: number;
  title: string;
  purpose: string;
  dependsOn: string[];
  status?: WorkCardMapCandidateStatus;
  reason: string;
  evidencePaths: string[];
  handoffMarkdownPath: string;
  formalWorkCardMarkdownPath: string;
  isActive?: boolean;
  formalWorkCardDocument?: {
    displayFilename: string;
    disposition: DocumentDispositionStatus;
    documentReadState: string;
    readError?: string;
    bodyMarkdown?: string;
  };
}

export type WorkCardMapProjection =
  | {
      state: "ready" | "all-complete";
      phaseId: string;
      sourceWorkCardPlanPath: string;
      candidates: WorkCardMapCandidateProjection[];
      phaseValidationWorkspaceId: "phase-validation";
      reason: string;
    }
  | {
      state: "needs-attention";
      phaseId?: string;
      sourceWorkCardPlanPath?: string;
      candidates: WorkCardMapCandidateProjection[];
      phaseValidationWorkspaceId: "phase-validation";
      reason: string;
    };

export interface WorkCardMapProjectionOptions {
  closeReturnCompleted?: boolean;
}

export interface BeginWorkCardPlanningOptions {
  closeReturnCompleted?: boolean;
}

export interface WorkCardBuildingReviewProjection {
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  formalWorkCardPath: string;
  formalWorkCardRevision: number;
  implementationContractType?: "formal-work-card" | "repair-work-card";
  implementationContractLabel?: string;
  parentWorkCardId?: string;
  repairId?: string;
  implementerReportPath: string;
  report?: {
    logicalDocumentId: string;
    artifactRevision?: number;
    disposition: DocumentDispositionStatus;
  };
  reportDocumentReadState: string;
  reportFreshnessState?: "fresh" | "stale";
  reportReadError?: string;
  reportMissing: boolean;
  reportReadiness: "missing" | "reserved-skeleton" | "ready-for-review" | "invalid" | "conflict";
  reportReadinessReason: string;
}

export interface WorkCardCloseProjection {
  closed: boolean;
  returnTarget: WorkspaceId;
  reason: string;
}

export type WorkCardRepairWorkspaceState =
  | "handoff-needed"
  | "handoff-ready"
  | "draft-pending"
  | "repair-card-reviewable"
  | "needs-attention";

export type WorkCardRepairEvidenceRole =
  | "primary-validation-record"
  | "primary-implementer-report"
  | "supporting-implementer-report"
  | "supporting-formal-work-card";

export interface WorkCardRepairEvidenceDocument {
  role: WorkCardRepairEvidenceRole;
  label: string;
  markdownPath: string;
  logicalDocumentId?: string;
  artifactRevision?: number;
  disposition?: DocumentDispositionStatus;
  documentReadState: "readable" | "missing" | "invalid" | "read-error";
  readError?: string;
  bodyMarkdown?: string;
}

export interface WorkCardRepairProjection {
  state: WorkCardRepairWorkspaceState;
  phaseId?: string;
  parentWorkCardId?: string;
  repairId?: string;
  evidencePath?: string;
  evidenceRevision?: number;
  primaryEvidenceDocument?: WorkCardRepairEvidenceDocument;
  supportingEvidenceDocuments?: WorkCardRepairEvidenceDocument[];
  operatorValidationNotes?: string;
  advisorySummary?: string;
  repairDefectText?: string;
  repairOrigin?: "preValidationReportReview" | "postValidationRecord";
  repairWorkCardTarget?: string;
  returnTarget?: WorkspaceId;
  handoffPath?: string;
  handoffRevision?: number;
  canCreateRepairHandoff: boolean;
  canPrepareArchitectHandoff: boolean;
  canCopyArchitectHandoff: boolean;
  reason: string;
}

export interface WorkCardCandidateSelectionExplanation {
  candidateId: string;
  state:
    | "eligible"
    | "complete"
    | "dependency-blocked"
    | "deferred"
    | "superseded"
    | "already-satisfied"
    | "carried-forward";
  reason: string;
  evidencePaths: string[];
}

export type CloseReturnSelectionProjection =
  | {
      state: "selected";
      phaseId: string;
      closedWorkCardId: string;
      close: WorkCardCloseProjection;
      selectionReason: string;
      workCardIntake: WorkCardIntakeProjection;
      explanations: WorkCardCandidateSelectionExplanation[];
    }
  | {
      state: "invalid-plan" | "all-complete" | "dependency-blocked" | "explicitly-resolved";
      phaseId?: string;
      closedWorkCardId: string;
      close: WorkCardCloseProjection;
      reason: string;
      explanations: WorkCardCandidateSelectionExplanation[];
    };

export type CodexImplementerExecutionState =
  | "unavailable"
  | "ready"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type CodexImplementerIntegrationMode = "sdk" | "app-server-stdio-fallback";

export interface CodexImplementerExecutionModel {
  state: CodexImplementerExecutionState;
  lastRunState: Exclude<CodexImplementerExecutionState, "unavailable" | "ready" | "running"> | null;
  canRunAgain: boolean;
  retryBlocker: string | null;
  integrationMode: CodexImplementerIntegrationMode;
  phaseId: string | null;
  workCardId: string | null;
  workCardTitle: string | null;
  projectRoot: string | null;
  formalWorkCardPath: string | null;
  formalWorkCardRevision: number | null;
  formalWorkCardSha256: string | null;
  implementerReportPath: string | null;
  implementerReportRevision: number | null;
  implementerReportSha256: string | null;
  startedAt: string | null;
  completedAt: string | null;
  elapsedMs: number | null;
  eventTail: string[];
  stderrTail: string[];
  finalResponseTail: string[];
  failureReason: string | null;
  reportUpdated: boolean;
  reportSha256After: string | null;
}

export interface CurrentWorkspaceModel {
  activeWorkspaceId: WorkspaceId;
  level: string;
  stage: string;
  architectOutputState?: ArchitectOutputWorkspaceState;
  railStatus?: ProjectLifecycleRailStatus;
  canPrepareHandoff?: boolean;
  currentPhaseId?: string;
  currentWorkCardId?: string;
  executionContext: ExecutionContextProjection;
  currentTarget: string;
  workCardIntake?: WorkCardIntakeProjection;
  sourceEvidence: string[];
  requiredAction: string;
  expectedOutput: string;
  eligibility: string;
  blocker?: string;
  workCardBuildingReview?: WorkCardBuildingReviewProjection;
  draftSubmissionState?: "waiting-for-drafts" | "partial-draft-set" | "ready-for-promotion" | "promotion-failed" | "promoted" | "superseded";
  draftPromotionError?: string;
  expectedNextState: string;
}

export type PhaseLoopStep =
  | "Phase Intake"
  | "Phase Planning"
  | "Work Cards"
  | "Phase Validation"
  | "Phase Close";

export type WorkCardLoopStep =
  | "Work Card Intake"
  | "Planning"
  | "Implement"
  | "Review & Validation"
  | "Close"
  | "Repair";

export interface ExecutionContextPhaseProjection {
  state: "none" | "active";
  phaseId?: string;
  title?: string;
  order?: number;
  totalPhaseCount?: number;
  purpose?: string;
  dependsOn: string[];
  loopStep?: PhaseLoopStep;
  projectStep?: string;
  reason: string;
}

export interface ExecutionContextWorkCardProjection {
  state: "none" | "active";
  workCardId?: string;
  title?: string;
  loopStep?: WorkCardLoopStep;
  dispositionOrState: string;
  repairId?: string;
  parentWorkCardId?: string;
  reason: string;
}

export interface ExecutionContextProjection {
  phase: ExecutionContextPhaseProjection;
  workCard: ExecutionContextWorkCardProjection;
}

export interface WorkspaceMigrationPreviewItem {
  markdownPath: string;
  legacyDataPath: string;
  targetMarkdownPath: string;
  filesToDelete: string[];
  status: "ready" | "blocked";
  findings: string[];
}

export interface WorkspaceMigrationPreview {
  migrationId: "paired-artifacts-to-canonical-markdown-v1";
  state: "not-required" | "required" | "blocked";
  items: WorkspaceMigrationPreviewItem[];
  readyCount: number;
  blockedCount: number;
}

export interface WorkspaceMigrationResult {
  preview: WorkspaceMigrationPreview;
  migratedPaths: string[];
  deletedPaths: string[];
}

export interface ChampCityApi {
  getSelectedWorkspace: () => Promise<WorkspaceSelection>;
  chooseWorkspaceFolder: () => Promise<WorkspaceSelection>;
  clearSelectedWorkspace: () => Promise<WorkspaceSelection>;
  getAppInfo: () => Promise<AppInfo>;
  listDocuments: () => Promise<PlanningDocumentSummary[]>;
  readDocument: (logicalDocumentId: string) => Promise<PlanningDocumentDetail>;
  setDocumentDisposition: (
    logicalDocumentId: string,
    status: DocumentDispositionStatus,
  ) => Promise<PlanningDocumentSummary>;
  previewDispositionInitialization: () => Promise<InitializationPreview>;
  applyDispositionInitialization: () => Promise<InitializationResult>;
  previewWorkspaceMigration: () => Promise<WorkspaceMigrationPreview>;
  applyWorkspaceMigration: () => Promise<WorkspaceMigrationResult>;
  resolveCurrentDocument: () => Promise<FirstNonApprovedResult>;
  submitProjectIntake: (
    submission: ProjectIntakeSubmission,
  ) => Promise<ProjectIntakeSubmissionResult>;
  getArchitectBrowserFoundationStatus: () => Promise<ArchitectBrowserFoundationStatus>;
  setArchitectBrowserBounds: (
    bounds: BrowserViewBounds,
  ) => Promise<ArchitectBrowserFoundationStatus>;
  showArchitectBrowser: (
    attachmentGeneration?: number,
  ) => Promise<ArchitectBrowserFoundationStatus>;
  hideArchitectBrowser: (
    attachmentGeneration?: number,
  ) => Promise<ArchitectBrowserFoundationStatus>;
  confirmArchitectSignedIn: () => Promise<ArchitectBrowserFoundationStatus>;
  reloadArchitectBrowser: () => Promise<ArchitectBrowserFoundationStatus>;
  getArchitectOutputWorkspaceModel: (workspaceId: WorkspaceId) => Promise<ArchitectOutputWorkspaceModel>;
  prepareArchitectOutputHandoff: (workspaceId: WorkspaceId) => Promise<ArchitectOutputWorkspaceModel>;
  regenerateArchitectInterviewPrompt: () => Promise<ArchitectOutputWorkspaceModel>;
  copyArchitectOutputHandoff: (workspaceId: WorkspaceId) => Promise<RuntimeActionResult>;
  prepareArchitectInterviewFinalDraftHandoff: () => Promise<ArchitectOutputWorkspaceModel>;
  copyArchitectInterviewFinalDraftHandoff: () => Promise<RuntimeActionResult>;
  reviewArchitectOutput: (
    workspaceId: WorkspaceId,
    status: DocumentDispositionStatus,
    operatorReviewNotes: string,
    presentedRevisions: ArchitectOutputPresentedSlotRevision[],
  ) => Promise<ArchitectOutputWorkspaceModel>;
  getCurrentWorkspaceModel: () => Promise<CurrentWorkspaceModel>;
  getCodexImplementerExecutionStatus: () => Promise<CodexImplementerExecutionModel>;
  startCodexImplementerExecution: () => Promise<CodexImplementerExecutionModel>;
  cancelCodexImplementerExecution: () => Promise<CodexImplementerExecutionModel>;
  generateCurrentHandoff: () => Promise<RuntimeActionResult>;
  getWorkCardMapProjection: (
    phaseId: string,
    options?: WorkCardMapProjectionOptions,
  ) => Promise<RuntimeActionResult>;
  beginWorkCardPlanning: (
    phaseId: string,
    candidateId: string,
    options?: BeginWorkCardPlanningOptions,
  ) => Promise<RuntimeActionResult>;
  getCurrentCloseProjection: () => Promise<RuntimeActionResult>;
  getCurrentRepairWorkspaceProjection: () => Promise<RuntimeActionResult>;
  getCloseReturnSelectionProjection: () => Promise<RuntimeActionResult>;
  generateCloseReturnNextIntakeHandoff: () => Promise<RuntimeActionResult>;
  copyCurrentWorkCardAdvisoryReviewPrompt: () => Promise<RuntimeActionResult>;
  applyOperatorValidationDecisionForCurrentWorkCard: (
    input: OperatorValidationDecisionInput,
  ) => Promise<RuntimeActionResult>;
  applyCurrentDisposition: (
    status: DocumentDispositionStatus,
    operatorReviewNotes?: string,
    targetWorkspaceId?: WorkspaceId,
  ) => Promise<RuntimeActionResult>;
  createRepairForCurrentFailure: (defect?: string) => Promise<RuntimeActionResult>;
  createValidationAttemptForCurrentWorkCard: () => Promise<RuntimeActionResult>;
  createPhaseCloseoutForCurrentPhase: (
    closureDecision: ClosureDecision,
    rationale: string,
  ) => Promise<RuntimeActionResult>;
  createProjectCloseoutForCurrentProject: (
    closureDecision: ClosureDecision,
    rationale: string,
  ) => Promise<RuntimeActionResult>;
}

export const visibleWorkspaceDefinitions: readonly WorkspaceDefinition[] = createWorkspaceRegistry([
  {
    id: "project-intake-capture",
    label: "Project Intake Capture",
    location: { level: "project", stage: "intake" },
    order: 10,
  },
  {
    id: "architect-interview",
    label: "Architect Interview",
    location: { level: "project", stage: "intake" },
    order: 20,
  },
  {
    id: "project-planning-review",
    label: "Project Plan and Roadmap Review",
    location: { level: "project", stage: "planning" },
    order: 10,
  },
  {
    id: "project-phase-map",
    label: "Phase Map",
    location: { level: "project", stage: "building" },
    order: 10,
  },
  {
    id: "project-validation",
    label: "Project Validation",
    location: { level: "project", stage: "validation" },
    order: 10,
  },
  {
    id: "project-close",
    label: "Project Close",
    location: { level: "project", stage: "close" },
    order: 10,
  },
  {
    id: "phase-interview",
    label: "Phase Interview",
    location: { level: "phase", stage: "intake" },
    order: 10,
  },
  {
    id: "phase-planning-bundle",
    label: "Phase Planning",
    location: { level: "phase", stage: "planning" },
    order: 10,
  },
  {
    id: "phase-work-card-selection",
    label: "Work Card Map",
    location: { level: "phase", stage: "building" },
    order: 10,
  },
  {
    id: "work-card-intake",
    label: "Work Card Intake",
    location: { level: "workCard", stage: "intake" },
    order: 10,
  },
  {
    id: "work-card-planning",
    label: "Work Card Planning",
    location: { level: "workCard", stage: "planning" },
    order: 10,
  },
  {
    id: "work-card-building-review",
    label: "Implement",
    location: { level: "workCard", stage: "building" },
    order: 10,
  },
  {
    id: "work-card-report-review",
    label: "Review & Validation",
    location: { level: "workCard", stage: "building" },
    order: 15,
  },
  {
    id: "work-card-repair",
    label: "Work Card Repair",
    location: { level: "workCard", stage: "building" },
    order: 20,
  },
  {
    id: "work-card-validation",
    label: "Work Card Validation",
    location: { level: "workCard", stage: "validation" },
    order: 10,
  },
  {
    id: "work-card-close",
    label: "Work Card Close",
    location: { level: "workCard", stage: "close" },
    order: 10,
  },
  {
    id: "phase-validation",
    label: "Phase Validation",
    location: { level: "phase", stage: "validation" },
    order: 10,
  },
  {
    id: "phase-close",
    label: "Phase Close",
    location: { level: "phase", stage: "close" },
    order: 10,
  },
]);

export const phase08WorkspaceDefinitions: readonly WorkspaceDefinition[] = createWorkspaceRegistry([
  {
    id: "project-intake-capture",
    label: "Project Intake Capture",
    location: { level: "project", stage: "intake" },
    order: 10,
  },
  {
    id: "architect-interview",
    label: "Architect Interview",
    location: { level: "project", stage: "intake" },
    order: 20,
  },
  {
    id: "project-planning-review",
    label: "Project Plan and Roadmap Review",
    location: { level: "project", stage: "planning" },
    order: 10,
  },
  {
    id: "project-phase-map",
    label: "Phase Map",
    location: { level: "project", stage: "building" },
    order: 10,
  },
  {
    id: "project-validation",
    label: "Project Validation",
    location: { level: "project", stage: "validation" },
    order: 10,
  },
  {
    id: "project-close",
    label: "Project Close",
    location: { level: "project", stage: "close" },
    order: 10,
  },
  {
    id: "phase-interview",
    label: "Phase Interview",
    location: { level: "phase", stage: "intake" },
    order: 10,
  },
  {
    id: "phase-planning-bundle",
    label: "Phase Planning",
    location: { level: "phase", stage: "planning" },
    order: 10,
  },
  {
    id: "phase-work-card-selection",
    label: "Work Card Map",
    location: { level: "phase", stage: "building" },
    order: 10,
  },
  {
    id: "phase-validation",
    label: "Phase Validation",
    location: { level: "phase", stage: "validation" },
    order: 10,
  },
  {
    id: "phase-close",
    label: "Phase Close",
    location: { level: "phase", stage: "close" },
    order: 10,
  },
  {
    id: "work-card-intake",
    label: "Work Card Intake",
    location: { level: "workCard", stage: "intake" },
    order: 10,
  },
  {
    id: "work-card-planning",
    label: "Work Card Planning",
    location: { level: "workCard", stage: "planning" },
    order: 10,
  },
  {
    id: "work-card-building-review",
    label: "Implement",
    location: { level: "workCard", stage: "building" },
    order: 10,
  },
  {
    id: "work-card-report-review",
    label: "Review & Validation",
    location: { level: "workCard", stage: "building" },
    order: 15,
  },
  {
    id: "work-card-repair",
    label: "Work Card Repair",
    location: { level: "workCard", stage: "building" },
    order: 20,
  },
  {
    id: "work-card-validation",
    label: "Operator Validation",
    location: { level: "workCard", stage: "validation" },
    order: 10,
  },
  {
    id: "work-card-close",
    label: "Work Card Close",
    location: { level: "workCard", stage: "close" },
    order: 10,
  },
]);

export const workspaceDefinitions = visibleWorkspaceDefinitions;
export const resolverWorkspaceDefinitions = phase08WorkspaceDefinitions;

export const workspaceLabels: WorkspaceLabel[] = workspaceDefinitions.map(
  (definition) => definition.label,
);

export const workspaceIds: WorkspaceId[] = workspaceDefinitions.map(
  (definition) => definition.id,
);
