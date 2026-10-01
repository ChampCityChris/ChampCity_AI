import fs from "node:fs";
import path from "node:path";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { GREENFIELD_ARCHITECT_SECTIONS, FEATURE_ARCHITECT_SECTIONS, ASSESSMENT_SECTIONS, type AssessmentWorkflowType, type ArchitectCandidateSaveInput, type StructuredArchitectWorkspaceModel } from "../../shared/architectWorkspaceContracts";
import { ARCHITECT_STAGE_BY_WORKFLOW, ARCHITECT_WORKSPACE_BY_WORKFLOW, type ArchitectReviewDecisionInput } from "../../shared/projectState/architectReviewContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { currentIntake, intakeOperator } from "../workflow/workflowIntakeMigration";
import { selectProjectArchitectureContext } from "../../shared/projectState/projectArchitectureContext";
import { architectReviewDocument, writeArchitectReviewProjection } from "./architectReviewProjectionWriter";

export function createStructuredArchitectWorkspaceService() {
  const stages = ARCHITECT_WORKSPACE_BY_WORKFLOW;
  async function withWorkflow<T>(root: string, id: string, work: (store: ReturnType<typeof createSQLiteProjectStateStore>, projectId: string, workflow: import("../../shared/projectState/domainContracts").ProjectStateRecord<"Workflow">) => Promise<T>) {
    if (typeof id !== "string" || !id.trim() || id.length > 128) throw Error("Exact bounded Architect Workflow ID is required.");
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected Project is not registered.");
    const store = createSQLiteProjectStateStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {
      const workflow = await store.getEntity(projectId, id);
      if (!workflow || workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || !Object.hasOwn(stages, workflow.body.workflowType)) throw Error("Exact active Architect Workflow is required.");
      return await work(store, projectId, workflow);
    } finally { store.close(); }
  }
  const get = (root: string, workflowId: string) => withWorkflow(root, workflowId, async (store, projectId, workflow): Promise<StructuredArchitectWorkspaceModel> => {
    const state = createProjectStateService(store, intakeOperator), intake = await currentIntake(store, projectId, workflow);
    const workflowType = workflow.body.workflowType, stageKind = ARCHITECT_STAGE_BY_WORKFLOW[workflowType]!;
    const stageLabel = workflowType === "project-creation" ? "Architect Interview" : workflowType === "issue-resolution" ? "Root Cause Analysis" : `Architect ${workflowType === "feature-capability" ? "Feature" : workflowType === "refactor-migration" ? "Migration" : workflowType === "integration-composition" ? "Integration" : workflowType === "infrastructure-platform" ? "Infrastructure" : "Research"} Assessment`;
    const intakeDisposition = intake ? await state.getWorkflowIntakeDisposition(projectId, intake.id) : null;
    const intakeRailStatus = !intake ? "Open" : intakeDisposition?.state === "approved" ? "Completed" : "Awaiting Approval";
    const identity = {workflowId, workflowType, stageKind, stageLabel, title: workflow.body.title, browserCompanionEligible: true, intakeRailStatus} as const;
    if (!intake || intakeDisposition?.state !== "approved") return {...identity, ready: false, railStatus: "Not Ready", nextStageReady: false, reason: "Approve current SQL Intake before Architect work."};
    const all = await store.listEntities(projectId), edges = await store.listRelationships(projectId);
    const findings = all.filter(record => record.entityType === "Finding" && record.lifecycleState === "active" && edges.some(edge => !edge.endedAt && edge.relationshipType === "workflow_member" && edge.fromEntityId === record.id && edge.toEntityId === workflowId));
    const supportRecords = [...(workflowType === "issue-resolution" ? findings : []), ...all.filter(record => record.entityType === "Evidence" && record.lifecycleState === "active" && record.body.evidenceType !== "architect-intake-source" && edges.some(edge => !edge.endedAt && edge.relationshipType === "supports" && edge.fromEntityId === record.id && (edge.toEntityId === workflowId || edge.toEntityId === intake.id || findings.some(finding => finding.id === edge.toEntityId))))];
    const template = workflowType === "project-creation" ? Object.fromEntries(Object.keys(GREENFIELD_ARCHITECT_SECTIONS).map(key => [key, ["Replace with substantive direction or an explicit unresolved item."]])) :
      workflowType === "feature-capability" ? Object.fromEntries(Object.keys(FEATURE_ARCHITECT_SECTIONS).map(key => [key, "Replace with substantive assessment."])) : Object.hasOwn(ASSESSMENT_SECTIONS, workflowType) ? Object.fromEntries(Object.keys(ASSESSMENT_SECTIONS[workflowType as AssessmentWorkflowType]).map(key => [key, "Replace with substantive assessment or explicitly unresolved direction."])) : {rootCauses: [{title: "Cause title", statement: "Evidenced defect", rationale: "Explanation", confidence: 0.8, findingIds: [], evidenceIds: []}]};
    const model: StructuredArchitectWorkspaceModel = {...identity, ready: true, railStatus: "Open", nextStageReady: false, supportRecords, intakeId: intake.id, intakeVersion: intake.recordVersion,
      handoff: [`${stageLabel} — typed structured output`, `Project ${projectId}; Workflow ${workflowId} (${workflowType}); approved Intake ${intake.id}@${intake.recordVersion}`, `Routed provenance is context only: ${JSON.stringify(edges.filter(edge => !edge.endedAt && edge.relationshipType === "routes_to" && edge.toEntityId === workflowId))}`,
        "Use the approved Intake below. Return only a JSON object whose exact keys each contain 1–32 nonempty text items (maximum 200 total items and 100 KB). Proposed decisions are recommendations, never Operator Decisions.",
        "Return the exact workflow-specific JSON shape below. For RCA cite exact supplied Finding/Evidence IDs; Evidence may support the SQL Intake directly without a Finding. Preserve all seven Feature dimensions. Do not choose a route.", JSON.stringify(template),
        "Supplied SQL context and Evidence:", JSON.stringify(supportRecords),
        "Inspect materially relevant repository evidence before questions or recommendations. Distinguish verified implementation, approved architecture, historical evidence, and unresolved assumptions. Preserve governing architecture unless the Operator explicitly revises it. Cover both architecture boundaries and consuming product capabilities.",
        "Project ground zero is the selected repository plus the local development machine. Distinguish verified installed, verified missing and unverified capabilities, repository bootstrap mechanisms and explicitly externally managed capabilities. Missing required capabilities are Project work unless approved evidence establishes external ownership.",
        "Project Planning Direction must cover the full adopted Project scope, governing architecture, product capabilities, dependencies and acceptance obligations. Identify unresolved Operator decisions explicitly.",
        "Approved SQL Intake:", JSON.stringify(intake.body.values, null, 2),
        "Approved Project architecture:", JSON.stringify(selectProjectArchitectureContext(projectId, await store.listEntities(projectId), await store.listRelationships(projectId))),
        "Exact SourceBaseline evidence:", JSON.stringify((await store.listEntities(projectId, "SourceBaseline")).filter(record => record.entityType === "SourceBaseline" && record.body.workflowId === workflowId && record.lifecycleState === "active"))].join("\n\n")};
    const cycle = await state.getCurrentArchitectReviewCycle(projectId, workflowId, stageKind) ?? await state.adoptLegacyArchitectReview(projectId, workflowId, stageKind);
    if (cycle) {
      model.cycleVersion = cycle.recordVersion;
      try {
        const review = await state.getArchitectReviewProjection(projectId, cycle.id);
        model.review = review; model.reviewDocument = architectReviewDocument(review);
        model.railStatus = review.disposition.state === "approved" ? "Completed" : "Awaiting Approval";
        model.nextStageReady = review.disposition.state === "approved" && ["project-creation", "feature-capability", "issue-resolution"].includes(workflowType);
        try { writeArchitectReviewProjection(root, review); } catch (error) { model.materializationError = `SQL is authoritative; projection write failed: ${error instanceof Error ? error.message : String(error)}`; }
      } catch (error) { model.reason = `Fresh Architect output required: ${error instanceof Error ? error.message : String(error)}`; }
    }
    return model;
  });
  const save = async (root: string, workflowId: string, input: ArchitectCandidateSaveInput) => {
    await withWorkflow(root, workflowId, async (store, projectId, workflow) => {
      if (workflow.body.currentWorkspace === "work-item-map") throw Error("Accepted planning topology is read-only.");
      await createProjectStateService(store, intakeOperator).saveArchitectCandidate(projectId, {...input, workflowId, workflowType: workflow.body.workflowType});
    });
    return get(root, workflowId);
  };
  const prepare = async (root: string, workflowId: string) => {
    const model = await get(root, workflowId);
    if (!model.ready) throw Error(model.reason ?? "Approve current Intake before Architect preparation.");
    await withWorkflow(root, workflowId, async (store, projectId, workflow) => {
      if (workflow.body.currentWorkspace === "work-item-map") throw Error("Accepted planning topology is read-only.");
      await createProjectStateService(store, intakeOperator).prepareArchitectWorkspace(projectId, {workflowId, intakeId: model.intakeId!, intakeVersion: model.intakeVersion!});
    });
    return get(root, workflowId);
  };
  const review = async (root: string, workflowId: string, cycleId: string, input: ArchitectReviewDecisionInput) => {
    await withWorkflow(root, workflowId, async (store, projectId, workflow) => {
      const state = createProjectStateService(store, intakeOperator), cycle = await state.getCurrentArchitectReviewCycle(projectId, workflowId, ARCHITECT_STAGE_BY_WORKFLOW[workflow.body.workflowType]!);
      if (cycle?.id !== cycleId) throw Error("Exact current Workflow review cycle is required.");
      await state.recordArchitectReview(projectId, cycleId, input);
    });
    return get(root, workflowId);
  };
  return {get, prepare, save, review};
}
