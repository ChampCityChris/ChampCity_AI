import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {intakeOperator} from "../workflow/workflowIntakeMigration";
import {listPlanningDocuments, readPlanningDocument, evaluateDocumentFreshness} from "../documents/planningDocumentService";
import {parsePhaseMapBody, validatePhaseMapData} from "./phaseMapDraftOutput";
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
    if (!cycles.length) {
      const intakes = (await store.listEntities(projectId, "WorkflowIntake")).filter(record => record.entityType === "WorkflowIntake" && record.body.workflowId === workflowId && record.lifecycleState === "active");
      if (intakes.length !== 1 || intakes[0].entityType !== "WorkflowIntake") throw Error("Exact Greenfield Intake identity required for legacy Phase Map import.");
      const slug = String(intakes[0].body.values.projectName ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const documents = listPlanningDocuments(root).filter(document => document.metadata.artifactType === "phase-map" && document.metadata.canonical?.identity.projectSlug === slug && document.effectiveDisposition === "Approved" && document.documentReadState === "readable" && evaluateDocumentFreshness(root, document.logicalDocumentId).state === "fresh");
      if (documents.length > 1) throw Error("Ambiguous deterministic legacy Phase Map identity; preserve history and submit a fresh exact map.");
      if (documents.length) {
        const document = readPlanningDocument(root, documents[0].logicalDocumentId);
        const parsed = parsePhaseMapBody(document.bodyMarkdown ?? document.preview ?? "");
        const metadataPhases = validatePhaseMapData({phases: document.metadata.canonical?.workflowData.phases});
        if (JSON.stringify(metadataPhases) !== JSON.stringify(parsed.phases)) throw Error("Legacy Phase Map typed block contradicts its canonical structured metadata.");
        const cycle = await state.saveGreenfieldPhaseMap(projectId, {workflowId, phases: parsed.phases, sources});
        await state.recordEvidence(projectId, cycle.id, {evidenceType: "legacy-phase-map-import", description: `Deterministic approved Phase Map metadata and block: ${document.markdownPath}@${document.metadata.artifactRevision}`, mediaType: "text/markdown", payloadRef: `repository:${encodeURIComponent(document.markdownPath)}`, digest: createHash("sha256").update(document.bodyMarkdown ?? document.preview ?? "").digest("hex")});
        await state.recordGreenfieldPhaseMapReview(projectId, cycle.id, {expectedRecordVersion: cycle.recordVersion, outcome: "approved", notes: "Adopt exact approved typed legacy Phase Map; historical Markdown is preserved as evidence."});
        cycles = [cycle];
      }
    }
    const review = cycles.length ? await state.getGreenfieldPhaseMap(projectId, cycles[0].id) : null;
    const plan = review?.disposition.state === "approved" ? await state.getWorkflowExecutionPlan(projectId, workflowId) : null;
    return {workflowId, sources, review, plan, handoff: [`# Greenfield Phase Map`, `Exact Workflow ${workflowId}; approved Project Planning ${parent.cycleId}@${parent.recordVersion}`, "Return typed JSON {workflowId,phases:[{phaseId,title,order,purpose,dependsOn:[],sourceReferences:[],criteria?:[{statement,criticality,verificationIntent,validationPolicy}]}],sources:[{entityId,recordVersion}]}. Preserve meaningful Phase outcome boundaries and dependency validation. Do not include completion state or invent WorkItems. Criteria belong here only when explicitly supported by current semantic source. No second topology decision applies to existing substantive Workflows.", parent.markdown, `Required exact sources: ${JSON.stringify(sources)}`].join("\n\n")};
  });
  const save = async (root: string, workflowId: string, input: GreenfieldPhaseMapCandidate) => {if (input.workflowId !== workflowId) throw Error("Phase Map Workflow mismatch."); await withWorkflow(root, workflowId, (store, projectId) => createProjectStateService(store, intakeOperator).saveGreenfieldPhaseMap(projectId, input)); return get(root, workflowId);};
  const review = async (root: string, workflowId: string, cycleId: string, input: ArchitectReviewDecisionInput) => {await withWorkflow(root, workflowId, async (store, projectId) => {const cycle = await store.getEntity(projectId, cycleId); if (cycle?.entityType !== "PhaseMapReviewCycle" || cycle.body.workflowId !== workflowId) throw Error("Exact Phase Map cycle mismatch."); await createProjectStateService(store, intakeOperator).recordGreenfieldPhaseMapReview(projectId, cycleId, input);}); return get(root, workflowId);};
  return {get, prepare: get, save, review};
}
