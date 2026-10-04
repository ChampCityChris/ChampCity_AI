import {workflowCandidateHandoff} from "../integrations/workflowCandidateHandoff";
import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {intakeOperator} from "../workflow/workflowIntakeState";
import type {ProjectPlanningCandidate} from "../../shared/projectState/projectPlanningReviewContracts";
import type {ArchitectReviewDecisionInput} from "../../shared/projectState/architectReviewContracts";

export function createStructuredProjectPlanningService() {
  async function withWorkflow<T>(root: string, workflowId: string, action: (store: ReturnType<typeof createSQLiteProjectStateStore>, projectId: string) => Promise<T>) {
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected Project required.");
    const store = createSQLiteProjectStateStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {const workflow = await store.getEntity(projectId, workflowId); if (workflow?.entityType !== "Workflow" || workflow.body.workflowType !== "project-creation" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active") throw Error("Exact active Project Creation Workflow required."); return await action(store, projectId);} finally {store.close();}
  }
  const get = (root: string, workflowId: string) => withWorkflow(root, workflowId, async (store, projectId) => {
    const state = createProjectStateService(store, intakeOperator), interview = await state.getCurrentArchitectReviewCycle(projectId, workflowId, "project-interview");
    if (!interview) throw Error("Approve structured Architect Interview before Project Planning.");
    const projection = await state.getArchitectReviewProjection(projectId, interview.id);
    if (projection.disposition.state !== "approved") throw Error("Approve current structured Architect Interview before Project Planning.");
    const workflow = (await store.getEntity(projectId, workflowId))!;
    const sources = [{entityId: workflowId, recordVersion: workflow.recordVersion}, {entityId: interview.id, recordVersion: interview.recordVersion}, ...projection.sources];
    const cycles = (await store.listEntities(projectId, "ProjectPlanningReviewCycle")).filter(record => record.entityType === "ProjectPlanningReviewCycle" && record.body.workflowId === workflowId && record.lifecycleState === "active");
    if (cycles.length > 1) throw Error("Ambiguous Project Planning review identity.");
    let review: Awaited<ReturnType<typeof state.getProjectPlanningReview>> | null = null, staleReview: {recordVersion: number; reason: string} | undefined;
    if (cycles.length) try {review = await state.getProjectPlanningReview(projectId, cycles[0].id);} catch (error) {staleReview = {recordVersion: cycles[0].recordVersion, reason: String(error)};}
    return {workflowId, review, staleReview, sources, handoff: [`# Structured Project Planning`, ...workflowCandidateHandoff(root, workflowId, "project-planning"), `Exact Project ${projectId}; Workflow ${workflowId}`, "Preserve approved Interview semantics. Capture facts (a collection with title, statement, impact), direction (title, objective and collections scopeIn, scopeOut, constraints, assumptions, risks), and criteria (a collection with statement, criticality, verificationIntent, validationPolicy). Facts must distinguish verified understanding from direction and assumptions. Do not supply canonical Markdown, phases or WorkItems; Phase Map and Phase Planning remain separate stages.", "Historical Profile/Roadmap documents are evidence only. Do not broadly parse or import old prose; construct a fresh semantic candidate cycle. Generated projections cannot authorize disposition.", projection.markdown, `Required exact sources: ${JSON.stringify(sources)}`].join("\n\n")};
  });
  const save = async (root: string, workflowId: string, input: ProjectPlanningCandidate) => {if (input.workflowId !== workflowId) throw Error("Exact Project Planning Workflow mismatch."); await withWorkflow(root, workflowId, (store, projectId) => createProjectStateService(store, intakeOperator).saveProjectPlanningCandidate(projectId, input)); return get(root, workflowId);};
  const review = async (root: string, workflowId: string, cycleId: string, input: ArchitectReviewDecisionInput) => {await withWorkflow(root, workflowId, async (store, projectId) => {const cycle = await store.getEntity(projectId, cycleId); if (cycle?.entityType !== "ProjectPlanningReviewCycle" || cycle.body.workflowId !== workflowId) throw Error("Exact Project Planning cycle mismatch."); await createProjectStateService(store, intakeOperator).recordProjectPlanningReview(projectId, cycleId, input);}); return get(root, workflowId);};
  return {get, prepare: get, save, review};
}
