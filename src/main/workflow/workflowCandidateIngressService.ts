import {createStructuredWorkItemReviewService} from "../workCardValidation/structuredWorkItemReviewService";
import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createStructuredArchitectWorkspaceService} from "../architectOutputs/structuredArchitectWorkspaceService";
import {createStructuredProjectPlanningService} from "../projectPlanning/structuredProjectPlanningService";
import {createStructuredPhaseMapService} from "../phaseMap/structuredPhaseMapService";
import {createStructuredPhaseLoopService} from "../phasePlanning/structuredPhaseLoopService";
import {createStructuredWorkItemPlanningService} from "../workCardPlanning/structuredWorkItemPlanningService";
import {createGreenfieldNavigationService} from "./greenfieldNavigationService";
import {WORKFLOW_CANDIDATE_STAGES, WORKFLOW_CANDIDATE_MAX_BYTES, type WorkflowCandidateSubmission, type WorkflowCandidateReceipt} from "../../shared/workflowCandidateContracts";
import type {ArchitectCandidateOutput} from "../../shared/architectWorkspaceContracts";
import type {ProjectPlanningCandidate} from "../../shared/projectState/projectPlanningReviewContracts";
import type {GreenfieldPhaseMapCandidate} from "../../shared/projectState/greenfieldPhaseMapContracts";
import type {PhaseLoopCandidate} from "../../shared/projectState/phaseLoopContracts";

/** No persistence logic here: resolve authoritative mechanics, then use existing transactional saves. */
export function createWorkflowCandidateIngressService() {
  async function submit(root: string, request: WorkflowCandidateSubmission): Promise<WorkflowCandidateReceipt> {
    const boundedId = (id: unknown) => typeof id === "string" && !!id.trim() && id.length <= 128;
    if (!request || Object.keys(request).some(key => !["workflowId", "stage", "scopeEntityId", "candidateJson"].includes(key)) ||
        !boundedId(request.workflowId) || !WORKFLOW_CANDIDATE_STAGES.includes(request.stage) ||
        typeof request.candidateJson !== "string" || Buffer.byteLength(request.candidateJson, "utf8") > WORKFLOW_CANDIDATE_MAX_BYTES) throw Error("Exact bounded stage candidate required.");
    const scoped = ["phase-interview", "phase-planning", "work-item-planning", "work-item-review-advisory"].includes(request.stage);
    if (scoped ? !boundedId(request.scopeEntityId) : request.scopeEntityId !== undefined) throw Error("Exact stage scope required; Project stages do not accept a scope entity.");
    const parsed: unknown = JSON.parse(request.candidateJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("Semantic candidate must be a JSON object.");
    const candidate = parsed as Record<string, unknown>;
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Exact registered SQL Project required.");
    let scopePhaseIds: string[] = [];
    const store = createSQLiteProjectStateStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {
      const workflow = await store.getEntity(projectId, request.workflowId);
      if (workflow?.entityType !== "Workflow" || workflow.body.workflowType !== "project-creation" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active") throw Error("Exact active Greenfield Workflow required.");
      if (scoped) {
        const entity = await store.getEntity(projectId, request.scopeEntityId!);
        if (["work-item-planning", "work-item-review-advisory"].includes(request.stage)) scopePhaseIds = (await store.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt && edge.fromEntityId === entity?.id).map(edge => edge.toEntityId);
        if (!entity || entity.entityType !== (["work-item-planning", "work-item-review-advisory"].includes(request.stage) ? "WorkItem" : "Phase") || entity.lifecycleState !== "active") throw Error("Exact active scope entity required.");
      }
    } finally {store.close();}
    const navigation = await createGreenfieldNavigationService().get(canonical, request.workflowId);
    const workspace = {"architect-interview":"architect-interview", "project-planning":"project-planning-review", "phase-map":"project-phase-map", "phase-interview":"phase-interview", "phase-planning":"phase-planning-bundle", "work-item-planning":"workflow-execution", "work-item-review-advisory":"workflow-execution"} as const;
    if (navigation.closed || navigation.currentWorkspace !== workspace[request.stage] || scoped && !["work-item-planning", "work-item-review-advisory"].includes(request.stage) && navigation.currentPhaseId !== request.scopeEntityId) throw Error("Candidate does not target the current exact Greenfield stage/scope.");
    if (["work-item-planning", "work-item-review-advisory"].includes(request.stage) && (!navigation.currentPhaseId || scopePhaseIds.length !== 1 || scopePhaseIds[0] !== navigation.currentPhaseId)) throw Error("WorkItem belongs to another exact Phase scope.");
    const bind = (semanticKeys: string[], mechanics: Record<string, unknown>) => {
      if (Object.keys(candidate).some(key => !semanticKeys.includes(key) && !Object.hasOwn(mechanics, key))) throw Error("Unsupported semantic candidate field.");
      for (const [key, value] of Object.entries(mechanics)) {
        if (Object.hasOwn(candidate, key) && JSON.stringify(candidate[key]) !== JSON.stringify(value)) throw Error(`Stale or mismatched candidate ${key}.`);
      }
      return {...candidate, ...mechanics};
    };
    const receipt = (reviewId: string, recordVersion: number, disposition: string): WorkflowCandidateReceipt => ({workflowId:request.workflowId, stage:request.stage, ...(scoped ? {scopeEntityId:request.scopeEntityId} : {}), reviewId, recordVersion, disposition});
    if (request.stage === "architect-interview") {
      const service = createStructuredArchitectWorkspaceService(), current = await service.get(canonical, request.workflowId);
      if (!current.ready || !current.intakeId || !current.intakeVersion) throw Error("Fresh approved SQL Intake required.");
      const result = await service.save(canonical, request.workflowId, {intakeId:current.intakeId, intakeVersion:current.intakeVersion, expectedCycleVersion:current.cycleVersion, output:candidate as ArchitectCandidateOutput});
      return receipt(result.review!.cycleId, result.review!.recordVersion, result.review!.disposition.state);
    }
    if (request.stage === "project-planning") {
      const service = createStructuredProjectPlanningService(), current = await service.get(canonical, request.workflowId);
      const input = bind(["facts", "direction", "criteria"], {workflowId:request.workflowId, sources:current.sources, expectedRecordVersion:current.review?.recordVersion ?? current.staleReview?.recordVersion});
      const result = await service.save(canonical, request.workflowId, input as unknown as ProjectPlanningCandidate);
      return receipt(result.review!.cycleId, result.review!.recordVersion, result.review!.disposition.state);
    }
    if (request.stage === "phase-map") {
      const service = createStructuredPhaseMapService(), current = await service.get(canonical, request.workflowId);
      const input = bind(["phases"], {workflowId:request.workflowId, sources:current.sources, expectedRecordVersion:current.review?.cycle.recordVersion});
      const result = await service.save(canonical, request.workflowId, input as unknown as GreenfieldPhaseMapCandidate);
      return receipt(result.review!.cycle.id, result.review!.cycle.recordVersion, result.review!.disposition.state);
    }
    if (request.stage === "phase-interview" || request.stage === "phase-planning") {
      const service = createStructuredPhaseLoopService(), stageKind = request.stage === "phase-interview" ? "interview" : "planning";
      const current = await service.get(canonical, request.workflowId, request.scopeEntityId!, stageKind);
      const input = bind(["facts", "direction", "criteria", ...(stageKind === "planning" ? ["candidates"] : [])], {workflowId:request.workflowId, phaseId:current.phase.id, stageKind, sources:current.sources, expectedRecordVersion:current.review?.cycle.recordVersion ?? current.staleReview?.recordVersion});
      const result = await service.save(canonical, request.workflowId, current.phase.id, stageKind, input as unknown as PhaseLoopCandidate);
      return receipt(result.review!.cycle.id, result.review!.cycle.recordVersion, result.review!.disposition.state);
    }
    if (request.stage === "work-item-review-advisory") {
      const result = await createStructuredWorkItemReviewService().advisory(canonical,request.workflowId,request.scopeEntityId!,candidate as unknown as import("../../shared/structuredWorkItemReviewContracts").WorkItemReviewAdvisory);
      return receipt(result.id,result.recordVersion,"none");
    }
    const service = createStructuredWorkItemPlanningService(), current = await service.get(canonical, request.workflowId, request.scopeEntityId!);
    if (["closed", "cancelled", "in_progress", "implemented", "validation_pending"].includes(current.workItem.body.workState)) throw Error("Current WorkItem cannot accept a planning candidate.");
    const input = bind(["implementationBoundaries", "affectedPaths", "proofIntent", "criteria"], {workflowId:request.workflowId, workItemId:current.workItem.id, expectedVersion:current.workItem.recordVersion});
    const result = await service.save(canonical, request.workflowId, current.workItem.id, JSON.stringify(input));
    return receipt(result.workItem.id, result.workItem.recordVersion, result.review.disposition.state);
  }
  return {submit};
}
