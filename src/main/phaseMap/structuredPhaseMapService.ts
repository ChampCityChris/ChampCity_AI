import {workflowCandidateHandoff} from "../integrations/workflowCandidateHandoff";
import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {intakeOperator} from "../workflow/workflowIntakeState";
import type {GreenfieldPhaseMapCandidate} from "../../shared/projectState/greenfieldPhaseMapContracts";
import type {ArchitectReviewDecisionInput} from "../../shared/projectState/architectReviewContracts";

export function createStructuredPhaseMapService() {
  async function withWorkflow<T>(root: string, workflowId: string, work: (store: ReturnType<typeof createSQLiteProjectStateStore>, projectId: string) => Promise<T>) {
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected Project required.");
    const store = createSQLiteProjectStateStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {const workflow = await store.getEntity(projectId, workflowId); if (workflow?.entityType !== "Workflow" || workflow.body.workflowType !== "project-creation" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active") throw Error("Phase Map planning is only for the exact active Greenfield Workflow; exact substantive Workflows use their accepted graph."); return await work(store, projectId);} finally {store.close();}
  }
  const get = (root: string, workflowId: string) => withWorkflow(root, workflowId, async (store, projectId) => {
    const state = createProjectStateService(store, intakeOperator);
    const parents = (await store.listEntities(projectId, "ProjectPlanningReviewCycle")).filter(record => record.entityType === "ProjectPlanningReviewCycle" && record.body.workflowId === workflowId && record.lifecycleState === "active");
    if (parents.length !== 1) throw Error("Exact structured Project Planning review required before Phase Map.");
    const parent = await state.getProjectPlanningReview(projectId, parents[0].id);
    if (parent.disposition.state !== "approved" || parents[0].entityType !== "ProjectPlanningReviewCycle") throw Error("Approve current structured Project Planning before Phase Map.");
    const sources = [parents[0], ...await Promise.all(parents[0].body.layout.memberIds.map(id => store.getEntity(projectId, id)))].filter(record => !!record).map(record => ({entityId: record.id, recordVersion: record.recordVersion}));
    let cycles = (await store.listEntities(projectId, "PhaseMapReviewCycle")).filter(record => record.entityType === "PhaseMapReviewCycle" && record.body.workflowId === workflowId && record.lifecycleState === "active");
    if (cycles.length > 1) throw Error("Ambiguous current SQL Phase Map.");
    const review = cycles.length ? await state.getGreenfieldPhaseMap(projectId, cycles[0].id) : null;
    const plan = review?.disposition.state === "approved" ? await state.getWorkflowExecutionPlan(projectId, workflowId) : null;
    return {workflowId, sources, review, plan, handoff: [`# Greenfield Phase Map`, ...workflowCandidateHandoff(root, workflowId, "phase-map"), `Exact Workflow ${workflowId}; approved Project Planning ${parent.cycleId}@${parent.recordVersion}`, "Capture phases as a collection with phaseId, title, order, purpose, dependsOn and sourceReferences; dependsOn and sourceReferences are collections. Optional criteria are a collection with statement, criticality, verificationIntent and validationPolicy. Preserve meaningful Phase outcome boundaries and dependency validation. Do not include completion state or invent WorkItems. Criteria belong here only when explicitly supported by current semantic source. No second topology decision applies to existing substantive Workflows.", parent.markdown, `Required exact sources: ${JSON.stringify(sources)}`].join("\n\n")};
  });
  const save = async (root: string, workflowId: string, input: GreenfieldPhaseMapCandidate) => {if (input.workflowId !== workflowId) throw Error("Phase Map Workflow mismatch."); await withWorkflow(root, workflowId, (store, projectId) => createProjectStateService(store, intakeOperator).saveGreenfieldPhaseMap(projectId, input)); return get(root, workflowId);};
  const review = async (root: string, workflowId: string, cycleId: string, input: ArchitectReviewDecisionInput) => {await withWorkflow(root, workflowId, async (store, projectId) => {const cycle = await store.getEntity(projectId, cycleId); if (cycle?.entityType !== "PhaseMapReviewCycle" || cycle.body.workflowId !== workflowId) throw Error("Exact Phase Map cycle mismatch."); await createProjectStateService(store, intakeOperator).recordGreenfieldPhaseMapReview(projectId, cycleId, input);}); return get(root, workflowId);};
  return {get, prepare: get, save, review};
}
