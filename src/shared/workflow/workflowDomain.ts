import type {
  WorkflowActionId,
  WorkflowActionCatalogEntry,
} from "./workflowActionCatalog";
import type {
  WorkflowBlocker,
  WorkflowRole,
  WorkflowScreenId,
} from "./workflowContracts";

export const workflowWorkCardKinds = [
  "planned_candidate",
  "repair",
  "replacement_candidate",
] as const;

export type WorkflowWorkCardKind = (typeof workflowWorkCardKinds)[number];

export const workflowTypedRelationshipKinds = [
  "belongs_to_project",
  "belongs_to_phase",
  "declared_by_plan",
  "implements_candidate",
  "repairs_work_card",
  "follows_repair",
  "triggered_by_validation",
  "authorized_by_review",
  "authorized_by_disposition",
  "replaces_work_card",
  "produces_implementer_report",
  "produces_architect_review",
  "produces_operator_validation",
  "supersedes_artifact",
] as const;

export type WorkflowTypedRelationshipKind =
  (typeof workflowTypedRelationshipKinds)[number];

export interface WorkflowTypedRelationship {
  kind: WorkflowTypedRelationshipKind;
  fromArtifactId: string;
  toArtifactId: string;
}

export interface WorkflowProjectIdentity {
  projectId: string;
  repositoryBindingId: string;
  repositoryRootIdentity: string;
  projectStatus: "active" | "blocked";
}

export interface WorkflowPhaseIdentity {
  phaseId: string;
  projectId: string;
  phaseSequence: number;
  predecessorPhaseId: string | null;
  successorPhaseId: string | null;
  phaseStatus: "active" | "closed" | "planned";
  activationArtifactId: string;
  closeoutArtifactId: string | null;
}

export interface WorkflowCandidateIdentity {
  planCandidateId: string;
  workCardArtifactId: string | null;
  workCardId: string;
  workCardKind: WorkflowWorkCardKind;
  projectId: string;
  phaseId: string;
  planArtifactId: string;
  planOrder: number;
  rootCandidateArtifactId: string;
  parentWorkCardArtifactId: string | null;
  workCardStatus: string;
  expectedImplementerReportArtifactId: string | null;
  resolutionStatus:
    | "unresolved"
    | "completed"
    | "completed_via_repair"
    | "superseded_by_replacement_candidate"
    | "carried_forward"
    | "deferred"
    | "cancelled";
}

export interface WorkflowRepairIdentity {
  rootCandidateArtifactId: string;
  parentWorkCardArtifactId: string;
  repairSequence: number;
  priorRepairArtifactId: string | null;
  triggerArtifactId: string;
  authorizingArtifactId: string;
  repairWorkCardArtifactId: string;
  expectedImplementerReportArtifactId: string;
}

export interface WorkflowReplacementIdentity {
  replacementWorkCardArtifactId: string;
  replacesWorkCardArtifactId: string;
  authorizingDispositionArtifactId: string;
  replacementReasonArtifactId: string;
  planArtifactId: string;
  planOrder: number;
  expectedImplementerReportArtifactId: string;
}

export interface WorkflowArtifactState {
  artifactId: string;
  artifactType: string;
  projectId: string;
  phaseId: string | null;
  workCardId: string | null;
  parentArtifactId: string | null;
  status: string;
  revision: number;
  title: string;
  jsonPath: string;
  markdownPath: string;
  sourceArtifactIds: string[];
  expectedOutputArtifactIds: string[];
  supersededArtifactIds: string[];
  data: Record<string, unknown>;
}

export interface WorkflowApprovalState {
  artifactId: string;
  approvedArtifactId: string;
  approvalScope: string;
  phaseId: string | null;
  approvedRevision: number | null;
  sourceArtifactIds: string[];
  expectedOutputArtifactIds: string[];
  implementationAuthorized: boolean;
}

export interface WorkflowCurrentActionIdentity {
  actionId: WorkflowActionId;
  projectId: string;
  phaseId: string | null;
  targetArtifactId: string | null;
  targetWorkCardArtifactId: string | null;
  responsibleRole: WorkflowRole;
  screenId: WorkflowScreenId;
  sourceArtifactIds: string[];
  expectedOutputArtifactId: string;
  expectedOutputArtifactType: string;
  authorizedOperations: readonly string[];
  stateRevision: number;
}

export interface WorkflowImplementerAssignment {
  repositoryBindingId: string;
  projectId: string;
  phaseId: string;
  actionId: "implementer_execution_required";
  targetWorkCardArtifactId: string;
  workCardKind: WorkflowWorkCardKind;
  planOrder: number;
  replacedCandidateArtifactId: string | null;
  parentWorkCardArtifactId: string | null;
  priorRepairArtifactId: string | null;
  operatorApprovalArtifactId: string;
  sourceArtifactIds: string[];
  expectedImplementerReportArtifactId: string;
  authorizedProductionSurface: readonly string[];
  stateRevision: number;
}

export interface WorkflowDomain {
  project: WorkflowProjectIdentity;
  phases: WorkflowPhaseIdentity[];
  activePhaseId: string | null;
  planArtifactId: string | null;
  candidates: WorkflowCandidateIdentity[];
  repairs: WorkflowRepairIdentity[];
  replacements: WorkflowReplacementIdentity[];
  approvals: WorkflowApprovalState[];
  artifacts: ReadonlyMap<string, WorkflowArtifactState>;
  relationships: WorkflowTypedRelationship[];
  blockers: WorkflowBlocker[];
  scannedAt: string;
}

export type WorkflowKernelResult =
  | {
      kind: "current_action";
      action: WorkflowCurrentActionIdentity;
      assignment: WorkflowImplementerAssignment | null;
      blockers: [];
    }
  | {
      kind: "blocked";
      action: WorkflowCurrentActionIdentity | null;
      assignment: null;
      blockers: WorkflowBlocker[];
    };

export function isWorkflowWorkCardKind(value: unknown): value is WorkflowWorkCardKind {
  return typeof value === "string" && workflowWorkCardKinds.includes(value as WorkflowWorkCardKind);
}

export function workflowBlocker(
  code: WorkflowBlocker["code"],
  message: string,
  ownerRole: WorkflowBlocker["ownerRole"],
  artifactIds: readonly string[],
): WorkflowBlocker {
  return {
    code,
    message,
    ownerRole,
    artifactIds: uniqueNonEmpty(artifactIds),
    blocking: true,
  };
}

export function actionIdentityFromCatalog(
  catalogEntry: WorkflowActionCatalogEntry,
  input: {
    projectId: string;
    phaseId: string | null;
    targetArtifactId: string | null;
    targetWorkCardArtifactId?: string | null;
    sourceArtifactIds: readonly string[];
    expectedOutputArtifactId: string;
    stateRevision: number;
  },
): WorkflowCurrentActionIdentity {
  return {
    actionId: catalogEntry.actionId,
    projectId: input.projectId,
    phaseId: input.phaseId,
    targetArtifactId: input.targetArtifactId,
    targetWorkCardArtifactId: input.targetWorkCardArtifactId ?? null,
    responsibleRole: catalogEntry.role,
    screenId: catalogEntry.screenId,
    sourceArtifactIds: uniqueNonEmpty(input.sourceArtifactIds),
    expectedOutputArtifactId: input.expectedOutputArtifactId,
    expectedOutputArtifactType: catalogEntry.expectedOutputArtifactType,
    authorizedOperations: catalogEntry.authorizedOperations,
    stateRevision: input.stateRevision,
  };
}

export function uniqueNonEmpty(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}
