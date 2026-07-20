import {
  createPhaseExecutionState,
  createWorkflowStateIndex,
  defaultLifecycleActionTemplates,
  materializeActionCatalog,
  projectRoutedAction,
  resolveWorkflowKernel,
  actionIdentityFromCatalog,
  getWorkflowActionCatalogEntry,
  workflowActionCatalog,
  type WorkflowActionBinding,
  type WorkflowBlocker,
  type WorkflowCurrentActionIdentity,
  type WorkflowDomain,
  type WorkflowKernelResult,
  type WorkflowStateIndex,
} from "../../shared/workflow";
import type { ConfiguredProject } from "../../shared/projects";
import type { GovernanceMaintenanceSummary } from "../../shared/projects";
import type { VerifiedArtifactGraph } from "../repository";
import { normalizeWorkflowDomain } from "./normalizedWorkflowDomainAdapter";

export interface RepairLineageProjection {
  repairWorkCardArtifactId: string;
  repairedParentWorkCardArtifactId: string;
  repairImplementerReportArtifactId: string;
  logicalRepairReportArtifactId: string;
  originalParentImplementerReportArtifactId: string;
  authorizingArchitectReviewArtifactId: string;
  authorizingArchitectReviewRevision: number;
  finalNumberedRepair: boolean;
  maximumRepairCount: number;
  finalParentAcceptanceTargetArtifactId: string;
}

export interface RelationshipResolverExpectedOutput {
  artifactId: string;
  artifactType: string;
  jsonPath: string | null;
  markdownPath: string | null;
}

export type RelationshipWorkflowResolverResult =
  | {
      kind: "current_action";
      actionId: string;
      role: string;
      targetArtifactId: string | null;
      sourceArtifactIds: string[];
      expectedOutput: RelationshipResolverExpectedOutput;
      blockers: [];
      routeHint: string;
      screenHint: string;
    }
  | {
      kind: "blocked";
      actionId: string;
      role: string;
      targetArtifactId: string | null;
      sourceArtifactIds: string[];
      expectedOutput: RelationshipResolverExpectedOutput | null;
      blockers: WorkflowBlocker[];
      routeHint: string;
      screenHint: string;
    };

export interface RelationshipWorkflowProjection {
  state: WorkflowStateIndex;
  graph: VerifiedArtifactGraph;
  evidenceArtifactIds: string[];
  repairLineage: RepairLineageProjection | null;
  resolverResult: RelationshipWorkflowResolverResult;
  domain: WorkflowDomain;
  implementerAssignment: WorkflowKernelResult["assignment"];
}

export class RelationshipDrivenWorkflowResolver {
  resolve(
    project: ConfiguredProject,
    graph: VerifiedArtifactGraph,
    projectionRevision: number,
    maintenance?: GovernanceMaintenanceSummary,
  ): RelationshipWorkflowProjection {
    const revision = Math.max(1, projectionRevision);
    const domain = normalizeWorkflowDomain(project, graph);
    const kernel = resolveWorkflowKernel(domain, revision);
    const governingKernel = maintenanceKernel(project, maintenance, revision) ?? kernel;
    const state = projectKernelState(project, graph, domain, governingKernel, revision);
    const evidenceArtifactIds = routeEvidenceArtifactIds(domain, governingKernel.action);
    return {
      state,
      graph,
      evidenceArtifactIds,
      repairLineage: repairLineageFor(domain, governingKernel.action?.targetWorkCardArtifactId ?? null),
      resolverResult: buildKernelResolverResult(graph, governingKernel, state.blockingConditions),
      domain,
      implementerAssignment: governingKernel.assignment,
    };
  }
}

function maintenanceKernel(
  project: ConfiguredProject,
  maintenance: GovernanceMaintenanceSummary | undefined,
  stateRevision: number,
): WorkflowKernelResult | null {
  const repairItems = maintenance?.repair.candidates ?? [];
  if (repairItems.length > 0) {
    const selected = firstValue(repairItems);
    if (!selected) return null;
    const existingRequest = selected.existingSpecificationRequest;
    const action = existingRequest
      ? maintenanceAction("governance_repair_specification_required", {
          project,
          stateRevision,
          phaseId: selected.phaseId ?? null,
          targetArtifactId: existingRequest.artifactId,
          sourceArtifactIds: [existingRequest.artifactId],
          expectedOutputArtifactId: existingRequest.expectedRepairWorkCardArtifactId,
          expectedOutputArtifactType: "work_card",
          expectedOutputRelationship: "artifact_creation_output",
        })
      : maintenanceAction("governance_integrity_repair_required", {
      project,
      stateRevision,
      phaseId: selected.phaseId ?? null,
      targetArtifactId: selected.artifactId,
      sourceArtifactIds: repairItems.map((item) => item.artifactId),
      expectedOutputArtifactId: selected.artifactId,
      expectedOutputArtifactType: selected.artifactType,
      expectedOutputRelationship: "in_place_mutation_target",
      });
    return {
      kind: "current_action",
      action,
      assignment: null,
      blockers: [],
    } as WorkflowKernelResult;
  }

  const approvalItems = (maintenance?.approval.items ?? []).filter(
    (item) => item.approvalStatus !== "exact",
  );
  if (approvalItems.length > 0) {
    const selected = firstValue(approvalItems);
    if (!selected) return null;
    const action = maintenanceAction("operator_governance_approval_required", {
      project,
      stateRevision,
      phaseId: selected.phaseId ?? null,
      targetArtifactId: selected.targetArtifactId,
      sourceArtifactIds: approvalItems.map((item) => item.targetArtifactId),
      expectedOutputArtifactId: selected.approvalArtifactId,
      expectedOutputArtifactType: "operator_approval",
      expectedOutputRelationship: "artifact_creation_output",
    });
    return {
      kind: "current_action",
      action,
      assignment: null,
      blockers: [],
    };
  }

  return null;
}

function maintenanceAction(
  actionId:
    | "governance_integrity_repair_required"
    | "governance_repair_specification_required"
    | "operator_governance_approval_required",
  input: {
    project: ConfiguredProject;
    stateRevision: number;
    phaseId: string | null;
    targetArtifactId: string;
    sourceArtifactIds: readonly string[];
    expectedOutputArtifactId: string;
    expectedOutputArtifactType?: string;
    expectedOutputRelationship?: "artifact_creation_output" | "in_place_mutation_target";
  },
): WorkflowCurrentActionIdentity {
  const catalogEntry = getWorkflowActionCatalogEntry(actionId);
  if (!catalogEntry) {
    throw new Error(`Workflow action ${actionId} is not present in the executable action catalog.`);
  }
  return actionIdentityFromCatalog(catalogEntry, {
    projectId: input.project.projectId,
    phaseId: input.phaseId,
    targetArtifactId: input.targetArtifactId,
    targetWorkCardArtifactId: null,
    sourceArtifactIds: input.sourceArtifactIds,
    expectedOutputArtifactId: input.expectedOutputArtifactId,
    expectedOutputArtifactType: input.expectedOutputArtifactType,
    expectedOutputRelationship: input.expectedOutputRelationship,
    stateRevision: input.stateRevision,
  });
}

function projectKernelState(
  project: ConfiguredProject,
  graph: VerifiedArtifactGraph,
  domain: WorkflowDomain,
  kernel: WorkflowKernelResult,
  projectionRevision: number,
): WorkflowStateIndex {
  const actionIdentity = kernel.action ?? fallbackBlockedAction(domain, projectionRevision);
  const bindings = Object.fromEntries(
    defaultLifecycleActionTemplates.map((template) => [
      template.actionId,
      {
        targetArtifactId: actionIdentity.targetArtifactId,
        sourceArtifactIds:
          template.actionId === actionIdentity.actionId
            ? [...actionIdentity.sourceArtifactIds]
            : [],
        expectedOutputArtifactId: actionIdentity.expectedOutputArtifactId,
        expectedOutputArtifactType: actionIdentity.expectedOutputArtifactType,
        expectedOutputRelationship: actionIdentity.expectedOutputRelationship,
      },
    ]),
  ) as Readonly<Record<string, WorkflowActionBinding>>;
  const actions = materializeActionCatalog(defaultLifecycleActionTemplates, bindings);
  const state = createWorkflowStateIndex({
    workflowStateArtifactId: `${project.projectId}/system/relationship_resolver`,
    projectId: project.projectId,
    activePhaseId: domain.activePhaseId,
    createdAt: graph.scannedAt,
    initialActionId: actionIdentity.actionId,
    actions,
    phaseExecution: createPhaseExecutionState({
      workCardPlanArtifactId: domain.planArtifactId,
      workCardPlanAuthority: domain.planArtifactId ? "authoritative" : "missing",
      approvedCandidates: domain.candidates.map((candidate) => ({
        candidateId: candidate.planCandidateId,
        title: candidate.workCardId,
        order: candidate.planOrder,
        fullWorkCardArtifactId: candidate.workCardArtifactId,
        fullWorkCardStatus: candidate.resolutionStatus === "unresolved"
          ? candidate.workCardArtifactId ? "active" : "missing"
          : "resolved",
        resolutionStatus:
          candidate.resolutionStatus === "superseded_by_replacement_candidate"
            ? "cancelled"
            : candidate.resolutionStatus,
        resolutionEvidenceArtifactIds: candidate.workCardArtifactId
          ? [candidate.workCardArtifactId]
          : [],
      })),
      activeCandidateId: activeCandidateId(domain),
      activeWorkCardArtifactId: actionIdentity.targetWorkCardArtifactId,
      activeRepairArtifactId: activeRepairArtifactId(domain, actionIdentity.targetWorkCardArtifactId),
    }),
  });
  const blockers = kernel.kind === "blocked" ? kernel.blockers : [];
  const activeRecord = state.actionCatalog[actionIdentity.actionId];
  state.stateRevision = projectionRevision;
  state.updatedAt = graph.scannedAt;
  state.blockingConditions = blockers.map((blocker) => ({ ...blocker, artifactIds: [...blocker.artifactIds] }));
  state.currentAction = projectRoutedAction(
    state.workflowStateArtifactId,
    state.stateRevision,
    activeRecord,
    state.blockingConditions,
  );
  state.currentAction.bindingSource = {
    kind: "relationship_resolver",
    workflowStateArtifactId: state.workflowStateArtifactId,
    stateRevision: state.stateRevision,
    projectId: project.projectId,
    evidenceArtifactIds: routeEvidenceArtifactIds(domain, actionIdentity),
  };
  state.currentActionId = actionIdentity.actionId;
  state.currentStage = activeRecord.stage;
  state.responsibleRole = activeRecord.role;
  state.authoritativeTargetArtifactId = activeRecord.targetArtifactId;
  state.requiredSourceArtifactIds = [...activeRecord.sourceArtifactIds];
  state.expectedOutput = { ...activeRecord.expectedOutput };
  state.routes = { ...activeRecord.routes };
  return state;
}

function fallbackBlockedAction(
  domain: WorkflowDomain,
  stateRevision: number,
): WorkflowCurrentActionIdentity {
  const routeReviewEntries = workflowActionCatalog.filter(
    (candidate) => candidate.actionId === "route_review_request_required",
  );
  const catalogEntry = onlyValue(routeReviewEntries);
  const exactExistingArtifactId =
    domain.planArtifactId ??
    domain.project.projectId;
  return {
    actionId: catalogEntry?.actionId ?? "route_review_request_required",
    projectId: domain.project.projectId,
    phaseId: domain.activePhaseId,
    targetArtifactId: domain.planArtifactId,
    targetWorkCardArtifactId: null,
    responsibleRole: catalogEntry?.role ?? "operator",
    screenId: catalogEntry?.screenId ?? "route-review-request",
    sourceArtifactIds: domain.planArtifactId ? [domain.planArtifactId] : [],
    expectedOutputArtifactId: exactExistingArtifactId,
    expectedOutputArtifactType: catalogEntry?.expectedOutputArtifactType ?? "route_review_request",
    expectedOutputRelationship: "artifact_creation_output",
    authorizedOperations: catalogEntry?.authorizedOperations ?? [],
    stateRevision,
  };
}

function activeCandidateId(domain: WorkflowDomain): string | null {
  let selected: WorkflowDomain["candidates"][number] | null = null;
  let duplicateSelectedOrder = false;
  for (const candidate of domain.candidates) {
    if (candidate.resolutionStatus !== "unresolved") continue;
    if (!selected || candidate.planOrder < selected.planOrder) {
      selected = candidate;
      duplicateSelectedOrder = false;
    } else if (candidate.planOrder === selected.planOrder) {
      duplicateSelectedOrder = true;
    }
  }
  return selected && !duplicateSelectedOrder ? selected.planCandidateId : null;
}

function activeRepairArtifactId(
  domain: WorkflowDomain,
  targetWorkCardArtifactId: string | null,
): string | null {
  if (!targetWorkCardArtifactId) return null;
  const matches = domain.repairs.filter(
    (repair) =>
      repair.repairWorkCardArtifactId === targetWorkCardArtifactId ||
      repair.parentWorkCardArtifactId === targetWorkCardArtifactId,
  );
  return onlyValue(matches)?.repairWorkCardArtifactId ?? null;
}

function repairLineageFor(
  domain: WorkflowDomain,
  targetWorkCardArtifactId: string | null,
): RepairLineageProjection | null {
  if (!targetWorkCardArtifactId) return null;
  const matches = domain.repairs.filter(
    (repair) => repair.repairWorkCardArtifactId === targetWorkCardArtifactId,
  );
  if (matches.length !== 1) return null;
  const repair = onlyValue(matches);
  if (!repair) return null;
  return {
    repairWorkCardArtifactId: repair.repairWorkCardArtifactId,
    repairedParentWorkCardArtifactId: repair.parentWorkCardArtifactId,
    repairImplementerReportArtifactId: repair.expectedImplementerReportArtifactId,
    logicalRepairReportArtifactId: repair.expectedImplementerReportArtifactId,
    originalParentImplementerReportArtifactId: "",
    authorizingArchitectReviewArtifactId: repair.authorizingArtifactId,
    authorizingArchitectReviewRevision: 1,
    finalNumberedRepair: true,
    maximumRepairCount: repair.repairSequence,
    finalParentAcceptanceTargetArtifactId: repair.parentWorkCardArtifactId,
  };
}

function routeEvidenceArtifactIds(
  domain: WorkflowDomain,
  action: WorkflowCurrentActionIdentity | null,
): string[] {
  const activePhase = domain.phases.filter((phase) => phase.phaseId === domain.activePhaseId);
  const activePhaseSources = activePhase.flatMap((phase) =>
    domain.artifacts.get(phase.activationArtifactId)?.sourceArtifactIds ?? [],
  );
  return unique([
    ...activePhase.map((phase) => phase.activationArtifactId),
    ...activePhaseSources,
    ...(domain.planArtifactId ? [domain.planArtifactId] : []),
    ...(action?.targetArtifactId ? [action.targetArtifactId] : []),
    ...(action?.sourceArtifactIds ?? []),
  ]);
}

function buildKernelResolverResult(
  graph: VerifiedArtifactGraph,
  kernel: WorkflowKernelResult,
  blockers: WorkflowBlocker[],
): RelationshipWorkflowResolverResult {
  const action = kernel.action;
  if (!action) {
    return {
      kind: "blocked",
      actionId: "route_review_request_required",
      role: "operator",
      targetArtifactId: null,
      sourceArtifactIds: [],
      expectedOutput: null,
      blockers,
      routeHint: "",
      screenHint: "route-review-request",
    };
  }
  const expected = expectedOutputView(
    graph,
    action.expectedOutputArtifactId,
    action.expectedOutputArtifactType,
  );
  const base = {
    actionId: action.actionId,
    role: action.responsibleRole,
    targetArtifactId: action.targetArtifactId,
    sourceArtifactIds: [...action.sourceArtifactIds],
    expectedOutput: expected,
    routeHint: "",
    screenHint: action.screenId,
  };
  return blockers.length > 0
    ? { ...base, kind: "blocked" as const, blockers }
    : { ...base, kind: "current_action" as const, blockers: [] };
}

function expectedOutputView(
  graph: VerifiedArtifactGraph,
  artifactId: string,
  artifactType: string,
): RelationshipResolverExpectedOutput {
  const existing = graph.controlling(artifactId);
  return {
    artifactId,
    artifactType,
    jsonPath: existing?.jsonPath ?? null,
    markdownPath: existing?.markdownPath ?? null,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function onlyValue<T>(values: readonly T[]): T | null {
  if (values.length !== 1) return null;
  let selected: T | null = null;
  for (const value of values) selected = value;
  return selected;
}

function firstValue<T>(values: readonly T[]): T | null {
  for (const value of values) return value;
  return null;
}
