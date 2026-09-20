import type { CodexManagedRuntimeStatus, CodexModelSelection } from "./codexRuntimeContracts";
import type { GithubEvidence, GithubEvidenceRequest, GithubProviderStatus } from "./githubProviderContracts";
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
import type {
  DevelopmentEnvironmentPreflightResult,
} from "./developmentEnvironmentContracts";
import type {
  CreateIssueResult,
  IssueArchitectPlanningActionResult,
  IssueArchitectPlanningMutationResult,
  IssueArchitectPlanningProjection,
  IssueArchitectReviewInput,
  IssueFixCardActionResult,
  IssueFixCardMutationResult,
  IssueFixCardLoopStepId,
  IssueFixCardProjection,
  IssueFixCardValidationDecisionInput,
  IssueInventoryProjection,
  IssueCloseActionInput,
  IssueCloseActionResult,
  IssueCloseProjection,
  IssuePlanningActionResult,
  IssuePlanningMutationResult,
  IssuePlanningProjection,
  IssueValidationActionResult,
  IssueValidationMutationResult,
  IssueValidationDecisionInput,
  IssueValidationProjection,
  IssueResolutionNavigationProjection,
  NewIssueInput,
} from "./issueResolutionContracts";
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
      evidenceGeneration?: number;
      mcpWorkspaceBinding?: McpWorkspaceBinding;
      mcpRegistrationError?: string;
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

export type AgentHarnessAuthenticationMode = "local-unauthenticated" | "oauth-required";

export interface AgentHarnessSettings {
  enabled: boolean;
  host: string;
  port: number;
  publicBaseUrl: string | null;
  localAuthenticationMode: AgentHarnessAuthenticationMode;
}

export interface AgentHarnessSettingsInput {
  enabled?: boolean | string;
  host?: string;
  port?: number | string;
  publicBaseUrl?: string | null;
  localAuthenticationMode?: AgentHarnessAuthenticationMode;
}

export interface AgentHarnessServiceHostLifecycleSettings {
  launchAtLogin: boolean;
}

export interface AgentHarnessServiceHostLifecycleSettingsInput {
  launchAtLogin: boolean;
}

export type AgentHarnessServiceLifecycleState =
  | "starting"
  | "ready"
  | "suspending"
  | "suspended"
  | "resuming"
  | "recovering"
  | "degraded"
  | "stopping";

export type AgentHarnessServiceRecoveryReason =
  | "startup"
  | "power-suspend"
  | "resume-reset"
  | "resume-liveness-timeout"
  | "resume-readiness-failed"
  | "heartbeat-timeout"
  | "heartbeat-miss-threshold"
  | "worker-exited"
  | "worker-restart-backoff"
  | "worker-recovery-exhausted"
  | "build-generation-mismatch"
  | "controlled-restart"
  | "controlled-restart-drain-timeout"
  | "host-stopping";

export interface AgentHarnessControlledRestartDisposition {
  outcome: "drained" | "deadline-exceeded" | "no-runtime";
  activeRequestsAtStart: number;
  activeRequestsAtEnd: number;
  requestedAt: string;
  completedAt: string;
}

export interface AgentHarnessServiceHostLifecycleStatus {
  state: AgentHarnessServiceLifecycleState | "unavailable" | "restart-required" | "stopped-by-user";
  reason: AgentHarnessServiceRecoveryReason | null;
  stateChangedAt: string | null;
  powerEpoch: number;
  serviceHostProcessId: number | null;
  workerProcessId: number | null;
  workerRecoveryState: "idle" | "recovering" | "circuit-open";
  consecutiveHeartbeatMisses: number;
  runtimeBuildIdentity: string | null;
  expectedBuildIdentity: string | null;
  restartRequired: boolean;
  lastControlledRestart: AgentHarnessControlledRestartDisposition | null;
  launchAtLogin: boolean;
  loginItemRegistered: boolean;
  executableWillLaunchAtLogin: boolean;
  startupRegistrationSupported: boolean;
  startupRegistrationScope: "user" | "machine" | null;
  trayPresent: boolean;
  explicitlyStopped: boolean;
  explicitStopState: "none" | "requested" | "invalid";
  lastError: string | null;
}

export interface AgentHarnessToolContractToolSummary {
  name: string;
  actions: string[];
}

export interface AgentHarnessToolContractSnapshot {
  scope: string;
  fingerprint: string;
  toolCount: number;
  tools: AgentHarnessToolContractToolSummary[];
}

export interface AgentHarnessPublishedToolContractSnapshot extends AgentHarnessToolContractSnapshot {
  current: boolean;
  sessionCount: number;
}

export interface AgentHarnessMcpSessionDiagnostics {
  retainedSessionCount: number;
  busySessionCount: number;
  idleSessionCount: number;
  streamingSessionCount: number;
  inFlightSessionCount: number;
  currentInFlightRequestCount: number;
  liveStreamCount: number;
  totalCreated: number;
  totalDisposed: {
    cleanClose: number;
    idleTtl: number;
    capEviction: number;
    runtimeClose: number;
    resumeReset: number;
    initializationFailure: number;
  };
  rejectedInitializationCount: number;
  reaperTimerCount: number;
  reaperRunCount: number;
  lastSuccessfulReaperAt: string | null;
  limits: {
    globalCap: number;
    perPrincipalCap: number;
    idleTtlMs: number;
  };
}

export type AgentHarnessRequestOutcome =
  | "in-flight"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed-out";

export type AgentHarnessReadinessReasonCode =
  | "ready"
  | "suspend-admission-paused"
  | "resume-reconciliation"
  | "controlled-restart-draining"
  | "runtime-closing"
  | "runtime-not-running"
  | "workspace-registry-unavailable"
  | "service-failed";

export interface AgentHarnessRecentRequestSummary {
  attemptId: string;
  toolbox: string;
  action: string;
  workspaceId: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  outcome: AgentHarnessRequestOutcome;
  reasonCode: string | null;
}

export interface AgentHarnessOperationalDiagnostics {
  schemaVersion: 1;
  workerGeneration: string;
  capturedAt: string;
  readiness: {
    state: "ready" | "degraded";
    reasonCode: AgentHarnessReadinessReasonCode;
  };
  sessions: AgentHarnessMcpSessionDiagnostics;
  requests: {
    currentInFlight: number;
    totalBegun: number;
    totalCompleted: number;
    totalFailed: number;
    totalCancelled: number;
    totalTimedOut: number;
    latencyMs: {
      sampleCount: number;
      p50: number;
      p95: number;
      maximum: number;
      histogram: Array<{ upperBoundMs: number | null; count: number }>;
    };
  };
  toolContract: {
    currentGeneration: string;
    captureCount: number;
    publicationGenerationCount: number;
    periodicRecaptureTimerCount: number;
  };
  eventLoopLagMs: {
    p95: number;
    maximum: number;
  };
  lifecycle: {
    lastSuspendAt: string | null;
    lastResumeAt: string | null;
    lastRecoveryStartedAt: string | null;
    lastReadyAt: string | null;
    workerRestartCount: number;
    lastWorkerRestartReason: string | null;
  };
  repositoryIncompleteByReason: Record<string, number>;
  recentRequests: AgentHarnessRecentRequestSummary[];
  limits: {
    recentRequestCapacity: number;
    latencySampleCapacity: number;
  };
}

export interface AgentHarnessToolContractDiagnostics {
  registry: AgentHarnessToolContractSnapshot;
  published: {
    state: "none" | "all-current" | "stale";
    runtimeGeneration: string | null;
    capturedScopeCount: number;
    contractCaptureCount: number;
    explicitGenerationChangeCount: number;
    lastControlledPublicationAt: string | null;
    periodicContractTimerCount: number;
    activeSessionCount: number;
    staleSessionCount: number;
    contracts: AgentHarnessPublishedToolContractSnapshot[];
    sessionLifecycle: AgentHarnessMcpSessionDiagnostics;
  };
}

export interface AgentHarnessRegisteredWorkspaceSummary {
  workspaceId: string;
  repositoryName: string;
  gitBacked: boolean;
  availability: "available" | "unavailable";
  validationError: string | null;
}

export interface AgentHarnessWorkspaceRegistrySnapshot {
  schemaVersion: 1;
  state: "ready" | "failed";
  workspaces: AgentHarnessRegisteredWorkspaceSummary[];
  error: string | null;
}

export type AgentHarnessWorkspaceRegistrationResult =
  | { canceled: true; registry: AgentHarnessWorkspaceRegistrySnapshot }
  | {
      canceled: false;
      workspace: AgentHarnessRegisteredWorkspaceSummary;
      registry: AgentHarnessWorkspaceRegistrySnapshot;
    };

export interface AgentHarnessStatus {
  state: "stopped" | "starting" | "running" | "stopping" | "failed";
  enabled: boolean;
  host: string;
  configuredPort: number;
  port: number | null;
  healthEndpoint: string | null;
  readinessEndpoint: string | null;
  mcpEndpoint: string | null;
  publicBaseUrl: string | null;
  publicBaseUrlConfigured: boolean;
  oauthConfigured: boolean;
  localAuthenticationMode: "local-unauthenticated" | "oauth-required";
  filesReadTransportAuthorized: boolean;
  filesWriteTransportAuthorized: boolean;
  registeredClientCount: number;
  activeOAuthTokenCount: number;
  activeFilesReadAuthorizationCount: number;
  activeFilesWriteAuthorizationCount: number;
  publicToolCount: number;
  publicToolNames: string[];
  toolContractDiagnostics: AgentHarnessToolContractDiagnostics;
  operationalDiagnostics: AgentHarnessOperationalDiagnostics;
  workspaceRegistryState: "ready" | "failed";
  workspaceRegistryError: string | null;
  registeredWorkspaceCount: number;
  registeredWorkspaceIds: string[];
  activeWorkspaceId: string | null;
  expectedWorkspaceId: string | null;
  selectedProjectRootSummary: string | null;
  routingState: "matched" | "mismatched" | "unavailable";
  lastError: string | null;
  recentActivity: string[];
}

export type LegacyOAuthClientImportResult =
  | {
      canceled: true;
    }
  | {
      canceled: false;
      importedCount: number;
      alreadyPresentCount: number;
      totalAcceptedCount: number;
      registeredClientCount: number;
    };

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
  attachmentGeneration: number;
  attachment: ArchitectBrowserAttachmentStatus;
  navigationDiagnostics: ArchitectBrowserNavigationDiagnostic[];
  security: {
    nodeIntegration: false;
    contextIsolation: true;
    sandbox: true;
    preload: null;
  };
}

export type ArchitectBrowserBoundsDisposition =
  | "accepted"
  | "stale-generation"
  | "stale-sequence"
  | "failed";

export interface ArchitectBrowserBoundsAck {
  attachmentGeneration: number;
  boundsSequence: number;
  attachmentState: ArchitectBrowserAttachmentState;
  disposition: ArchitectBrowserBoundsDisposition;
  lastError?: string;
}

export type WorkspaceEvidenceDomain = "planning" | "issues";

export interface WorkspaceEvidenceChangeNotification {
  domains: WorkspaceEvidenceDomain[];
  sequence: number;
  generation: number;
}

export type ClosureDecision = "Close" | "DoNotClose";

export interface PhaseValidationCloseoutProjection {
  logicalDocumentId: string;
  markdownPath: string;
  artifactRevision: number;
  effectiveDisposition: DocumentDispositionStatus;
  closureDecision?: string;
  freshnessState: "fresh" | "stale";
}

export interface PhaseValidationActionProjection {
  eligible: true;
  phaseId: string;
  workspaceId: "phase-validation" | "phase-close";
  requiredAction: "create-closeout" | "dispose-closeout" | "phase-close-complete";
  sourceEvidence: string[];
  reason: string;
  closeout?: PhaseValidationCloseoutProjection;
}

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

export interface DevelopmentPostMutationProjection {
  planningGeneration: number;
  documents: PlanningDocumentSummary[];
  resolverResult: FirstNonApprovedResult;
  currentModel: CurrentWorkspaceModel;
  projectPlanningModel: ProjectPlanningWorkspaceModel;
  selectedDocument: PlanningDocumentDetail | null;
}

export interface DocumentDispositionTransactionResult {
  document: PlanningDocumentSummary;
  development: DevelopmentPostMutationProjection;
}

export interface ArchitectOutputReviewResult {
  architectOutput: ArchitectOutputWorkspaceModel;
  development: DevelopmentPostMutationProjection;
}

export interface CurrentWorkflowMutationResult extends RuntimeActionResult {
  development: DevelopmentPostMutationProjection;
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
  canPrepareFinalDraftHandoff?: boolean;
  canCopyFinalDraftHandoff?: boolean;
  finalDraftHandoffInstruction?: string;
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
      state: "selection-required";
      phaseId: string;
      closedWorkCardId: string;
      close: WorkCardCloseProjection;
      closeReturnRecordPath: string;
      closeReturnRecordRevision: number;
      closeReturnRecordReused: boolean;
      sourceWorkCardPlanPath: string;
      candidates: WorkCardMapCandidateProjection[];
      eligibleCandidates: WorkCardMapCandidateProjection[];
      explanations: WorkCardCandidateSelectionExplanation[];
    }
  | {
      state: "all-complete";
      phaseId: string;
      closedWorkCardId: string;
      close: WorkCardCloseProjection;
      closeReturnRecordPath: string;
      closeReturnRecordRevision: number;
      closeReturnRecordReused: boolean;
      continuationTarget: "phase-validation";
      candidates: WorkCardMapCandidateProjection[];
      reason: string;
      explanations: WorkCardCandidateSelectionExplanation[];
    }
  | {
      state: "needs-attention";
      blockerState: "invalid-plan" | "dependency-blocked" | "explicitly-resolved" | "workflow-state-conflict";
      phaseId: string;
      closedWorkCardId: string;
      close: WorkCardCloseProjection;
      closeReturnRecordPath: string;
      closeReturnRecordRevision: number;
      closeReturnRecordReused: boolean;
      candidates: WorkCardMapCandidateProjection[];
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

export type CodexImplementerIntegrationMode = "app-server-stdio";
export type CodexImplementerExecutionKind =
  | "work-card-implementation"
  | "environment-resolution";

export interface CodexRuntimeCapabilityStatus {
  state: "not-read" | "read" | "unavailable";
  count: number | null;
  summary: string;
  details: string[];
}

export interface CodexRuntimeCapabilitySummary {
  configRead: CodexRuntimeCapabilityStatus;
  mcpServers: CodexRuntimeCapabilityStatus;
  skills: CodexRuntimeCapabilityStatus;
  apps: CodexRuntimeCapabilityStatus;
  plugins: CodexRuntimeCapabilityStatus;
}

export interface CodexRuntimeStateModel {
  userAgent: string | null;
  codexHome: string | null;
  cwd: string | null;
  model: string | null;
  reasoningEffort: string | null;
  approvalPolicy: string | null;
  approvalsReviewer: string | null;
  sandbox: string | null;
  capabilitySummary: CodexRuntimeCapabilitySummary;
}

export interface CodexApprovalTelemetryModel {
  requestId: string;
  type: "command" | "file-change" | "permission";
  threadId: string | null;
  turnId: string | null;
  itemId: string | null;
  decision: string;
  completed: boolean;
}

export interface CodexPendingApprovalModel {
  requestId: string;
  type: "command" | "file-change" | "permission";
  threadId: string | null;
  turnId: string | null;
  itemId: string | null;
  commandDisplay: string | null;
  fileChangeSummary: string | null;
  permissionSummary: string | null;
  impactSummary: string;
}

export interface CodexPendingUserInputModel {
  requestId: string;
  threadId: string;
  turnId: string;
  itemId: string;
  questions: Array<{
    id: string;
    header: string;
    question: string;
    options: Array<{
      label: string;
      description: string;
    }>;
  }>;
}

export interface CodexMcpElicitationFieldModel {
  id: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  options: Array<{
    value: string;
    label: string;
  }>;
}

export interface CodexPendingMcpElicitationModel {
  requestId: string;
  threadId: string;
  turnId: string | null;
  serverName: string;
  mode: string;
  message: string;
  responseSupported: boolean;
  unsupportedReason: string | null;
  elicitationId: string | null;
  url: string | null;
  requestedSchemaSummary: string;
  fields: CodexMcpElicitationFieldModel[];
}

export interface CodexUserInputResponse {
  requestId: string;
  answers: Record<string, string[]>;
}

export interface CodexMcpElicitationResponse {
  requestId: string;
  action: "accept" | "decline" | "cancel";
  content: unknown | null;
}

export interface CodexApprovalResponse {
  requestId: string;
  decision: "approve" | "deny";
}

export interface CodexImplementerExecutionModel {
  state: CodexImplementerExecutionState;
  executionKind: CodexImplementerExecutionKind | null;
  lastRunState: Exclude<CodexImplementerExecutionState, "unavailable" | "ready" | "running"> | null;
  canRunAgain: boolean;
  canResolveEnvironment: boolean;
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
  approvalTail: CodexApprovalTelemetryModel[];
  runtimeDenialTail: string[];
  runtimeState: CodexRuntimeStateModel | null;
  pendingApproval: CodexPendingApprovalModel | null;
  pendingUserInput: CodexPendingUserInputModel | null;
  pendingMcpElicitation: CodexPendingMcpElicitationModel | null;
  failureReason: string | null;
  reportUpdated: boolean;
  reportSha256After: string | null;
  developmentEnvironmentPreflight: DevelopmentEnvironmentPreflightResult | null;
}

export function codexImplementerAvailabilityLabel(
  execution: Pick<CodexImplementerExecutionModel, "state" | "canRunAgain"> | null,
): "Ready" | "Unavailable" {
  const state = execution?.state ?? "unavailable";
  if (state === "unavailable") {
    return "Unavailable";
  }
  return execution?.canRunAgain || state === "running" || state === "ready"
    ? "Ready"
    : "Unavailable";
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
  getWorkIntakeProjection: () => Promise<import("./workIntakeContracts").WorkIntakeProjection>;
  prepareWorkRoutingAssessment: (intakeId: string) => Promise<import("./workRoutingAssessmentContracts").WorkRoutingAssessmentModel>;
  getWorkRoutingAssessment: (intakeId: string) => Promise<import("./workRoutingAssessmentContracts").WorkRoutingAssessmentModel>;
  copyWorkRoutingAssessment: (intakeId: string) => Promise<void>;
  getWorkRouteDecision: (intakeId: string) => Promise<import("./workRouteDecisionContracts").WorkRouteDecisionModel>;
  decideWorkRoute: (intakeId: string, input: import("./workRouteDecisionContracts").WorkRouteDecisionInput) => Promise<import("./workRouteDecisionContracts").WorkRouteDecisionModel>;
  readWorkIntake: (intakeId: string) => Promise<import("./workIntakeContracts").WorkIntakeRecord>;
  submitWorkIntake: (submission: import("./workIntakeContracts").WorkIntakeSubmission) => Promise<import("./workIntakeContracts").WorkIntakeSubmissionResult>;
  getGithubProviderStatus: () => Promise<GithubProviderStatus>;
  connectGithubProvider: () => Promise<GithubProviderStatus>;
  restartGithubProvider: () => Promise<GithubProviderStatus>;
  disconnectGithubProvider: () => Promise<GithubProviderStatus>;
  readGithubEvidence: (request: GithubEvidenceRequest) => Promise<GithubEvidence>;
  getSelectedWorkspace: () => Promise<WorkspaceSelection>;
  chooseWorkspaceFolder: () => Promise<WorkspaceSelection>;
  clearSelectedWorkspace: () => Promise<WorkspaceSelection>;
  getAppInfo: () => Promise<AppInfo>;
  getAgentHarnessStatus: () => Promise<AgentHarnessStatus>;
  getAgentHarnessServiceHostLifecycleStatus: () => Promise<AgentHarnessServiceHostLifecycleStatus>;
  startBackgroundAgent: () => Promise<AgentHarnessServiceHostLifecycleStatus>;
  exitBackgroundAgent: () => Promise<AgentHarnessServiceHostLifecycleStatus>;
  restartAgentHarnessServiceHost: () => Promise<AgentHarnessServiceHostLifecycleStatus>;
  saveAgentHarnessSettings: (
    settings: AgentHarnessSettingsInput,
  ) => Promise<AgentHarnessStatus>;
  saveAgentHarnessServiceHostLifecycleSettings: (
    settings: AgentHarnessServiceHostLifecycleSettingsInput,
  ) => Promise<AgentHarnessServiceHostLifecycleStatus>;
  importLegacyOAuthClients: () => Promise<LegacyOAuthClientImportResult>;
  startAgentHarness: () => Promise<AgentHarnessStatus>;
  stopAgentHarness: () => Promise<AgentHarnessStatus>;
  restartAgentHarness: () => Promise<AgentHarnessStatus>;
  listAgentHarnessRegisteredWorkspaces: () => Promise<AgentHarnessWorkspaceRegistrySnapshot>;
  chooseAndRegisterAgentHarnessWorkspace: () => Promise<AgentHarnessWorkspaceRegistrationResult>;
  unregisterAgentHarnessWorkspace: (workspaceId: string) => Promise<AgentHarnessWorkspaceRegistrySnapshot>;
  listDocuments: () => Promise<PlanningDocumentSummary[]>;
  readDocument: (logicalDocumentId: string) => Promise<PlanningDocumentDetail>;
  setDocumentDisposition: (
    logicalDocumentId: string,
    status: DocumentDispositionStatus,
  ) => Promise<DocumentDispositionTransactionResult>;
  previewDispositionInitialization: () => Promise<InitializationPreview>;
  applyDispositionInitialization: () => Promise<InitializationResult>;
  previewWorkspaceMigration: () => Promise<WorkspaceMigrationPreview>;
  applyWorkspaceMigration: () => Promise<WorkspaceMigrationResult>;
  resolveCurrentDocument: () => Promise<FirstNonApprovedResult>;
  discoverIssueInventory: () => Promise<IssueInventoryProjection>;
  createLightweightIssueRecord: (input: NewIssueInput) => Promise<CreateIssueResult>;
  getIssueArchitectPlanningProjection: (issueId: string | null) => Promise<IssueArchitectPlanningProjection>;
  prepareIssueArchitectPlanningHandoff: (issueId: string) => Promise<IssueArchitectPlanningActionResult>;
  copyIssueArchitectPlanningHandoff: (issueId: string) => Promise<IssueArchitectPlanningActionResult>;
  promoteIssueArchitectPlanningDraft: (issueId: string) => Promise<IssueArchitectPlanningActionResult>;
  applyIssueArchitectReview: (issueId: string, input: IssueArchitectReviewInput) => Promise<IssueArchitectPlanningMutationResult>;
  getIssuePlanningProjection: (issueId: string | null) => Promise<IssuePlanningProjection>;
  getIssueResolutionNavigationProjection: (issueId: string | null) => Promise<IssueResolutionNavigationProjection>;
  getIssueValidationProjection: (issueId: string | null) => Promise<IssueValidationProjection>;
  applyIssueValidationDecision: (
    issueId: string,
    input: IssueValidationDecisionInput,
  ) => Promise<IssueValidationMutationResult>;
  getIssueCloseProjection: (issueId: string | null) => Promise<IssueCloseProjection>;
  closeIssue: (
    issueId: string,
    input: IssueCloseActionInput,
  ) => Promise<IssueCloseActionResult>;
  prepareIssuePlanningHandoff: (issueId: string) => Promise<IssuePlanningActionResult>;
  copyIssuePlanningHandoff: (issueId: string) => Promise<IssuePlanningActionResult>;
  applyIssuePlanningReview: (issueId: string, input: IssueArchitectReviewInput) => Promise<IssuePlanningMutationResult>;
  getIssueFixCardProjection: (
    issueId: string | null,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardProjection>;
  selectIssueFixCardCandidate: (
    issueId: string,
    fixCardId: string,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardActionResult>;
  prepareIssueFixCardPlanningHandoff: (
    issueId: string,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardActionResult>;
  copyIssueFixCardPlanningHandoff: (
    issueId: string,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardActionResult>;
  applyIssueFixCardContractReview: (
    issueId: string,
    input: IssueArchitectReviewInput,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardMutationResult>;
  reserveIssueFixCardImplementerReport: (
    issueId: string,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardActionResult>;
  copyIssueFixCardAdvisoryReviewPrompt: (
    issueId: string,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardActionResult>;
  applyIssueFixCardValidationDecision: (
    issueId: string,
    input: IssueFixCardValidationDecisionInput,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardMutationResult>;
  prepareIssueFixCardRepairHandoff: (
    issueId: string,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardActionResult>;
  copyIssueFixCardRepairHandoff: (
    issueId: string,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardActionResult>;
  closeIssueFixCard: (
    issueId: string,
    currentStep?: IssueFixCardLoopStepId,
  ) => Promise<IssueFixCardMutationResult>;
  getIssueCodexImplementerExecutionStatus: (
    issueId: string,
    fixCardId: string,
    currentImplementationId?: string,
  ) => Promise<CodexImplementerExecutionModel>;
  startIssueCodexImplementerExecution: (
    issueId: string,
    fixCardId: string,
    currentImplementationId: string | undefined,
    selection: CodexModelSelection,
  ) => Promise<CodexImplementerExecutionModel>;
  startIssueCodexEnvironmentResolution: (
    issueId: string,
    fixCardId: string,
    currentImplementationId?: string,
  ) => Promise<CodexImplementerExecutionModel>;
  submitProjectIntake: (
    submission: ProjectIntakeSubmission,
  ) => Promise<ProjectIntakeSubmissionResult>;
  getArchitectBrowserFoundationStatus: () => Promise<ArchitectBrowserFoundationStatus>;
  onArchitectBrowserFoundationStatus: (
    listener: (status: ArchitectBrowserFoundationStatus) => void,
  ) => () => void;
  onWorkspaceEvidenceChanged: (
    listener: (notification: WorkspaceEvidenceChangeNotification) => void,
  ) => () => void;
  setArchitectBrowserBounds: (
    bounds: BrowserViewBounds,
  ) => Promise<ArchitectBrowserBoundsAck>;
  showArchitectBrowser: (
    attachmentGeneration?: number,
  ) => Promise<ArchitectBrowserFoundationStatus>;
  hideArchitectBrowser: (
    attachmentGeneration?: number,
  ) => Promise<ArchitectBrowserFoundationStatus>;
  confirmArchitectSignedIn: () => Promise<ArchitectBrowserFoundationStatus>;
  reloadArchitectBrowser: () => Promise<ArchitectBrowserFoundationStatus>;
  getProjectPlanningWorkspaceModel: () => Promise<ProjectPlanningWorkspaceModel>;
  getArchitectOutputWorkspaceModel: (workspaceId: WorkspaceId) => Promise<ArchitectOutputWorkspaceModel>;
  prepareArchitectOutputHandoff: (workspaceId: WorkspaceId) => Promise<ArchitectOutputWorkspaceModel>;
  regenerateArchitectInterviewPrompt: () => Promise<ArchitectOutputWorkspaceModel>;
  copyArchitectOutputHandoff: (workspaceId: WorkspaceId) => Promise<RuntimeActionResult>;
  prepareArchitectInterviewFinalDraftHandoff: () => Promise<ArchitectOutputWorkspaceModel>;
  copyArchitectInterviewFinalDraftHandoff: () => Promise<RuntimeActionResult>;
  preparePhaseInterviewFinalDraftHandoff: () => Promise<ArchitectOutputWorkspaceModel>;
  copyPhaseInterviewFinalDraftHandoff: () => Promise<RuntimeActionResult>;
  reviewArchitectOutput: (
    workspaceId: WorkspaceId,
    status: DocumentDispositionStatus,
    operatorReviewNotes: string,
    presentedRevisions: ArchitectOutputPresentedSlotRevision[],
    selectedDocumentId?: string | null,
  ) => Promise<ArchitectOutputReviewResult>;
  getCurrentWorkspaceModel: () => Promise<CurrentWorkspaceModel>;
  getPhaseValidationActionProjection: () => Promise<PhaseValidationActionProjection>;
  getCodexImplementerExecutionStatus: () => Promise<CodexImplementerExecutionModel>;
  getCodexManagedRuntimeStatus: () => Promise<CodexManagedRuntimeStatus>;
  setCodexModelSelection: (selection: CodexModelSelection) => Promise<CodexManagedRuntimeStatus>;
  startCodexImplementerExecution: (selection: CodexModelSelection) => Promise<CodexImplementerExecutionModel>;
  startCodexEnvironmentResolution: () => Promise<CodexImplementerExecutionModel>;
  respondToCodexApproval: (response: CodexApprovalResponse) => Promise<CodexImplementerExecutionModel>;
  respondToCodexUserInput: (response: CodexUserInputResponse) => Promise<CodexImplementerExecutionModel>;
  respondToCodexMcpElicitation: (response: CodexMcpElicitationResponse) => Promise<CodexImplementerExecutionModel>;
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
  generateCloseReturnNextIntakeHandoff: (candidateId: string) => Promise<RuntimeActionResult>;
  copyCurrentWorkCardAdvisoryReviewPrompt: () => Promise<RuntimeActionResult>;
  applyOperatorValidationDecisionForCurrentWorkCard: (
    input: OperatorValidationDecisionInput,
    selectedDocumentId?: string | null,
  ) => Promise<CurrentWorkflowMutationResult>;
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
