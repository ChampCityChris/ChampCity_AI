import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {intakeOperator} from "../workflow/workflowIntakeMigration";
import {listPlanningDocuments, evaluateDocumentFreshness} from "../documents/planningDocumentService";
import {validateCandidates} from "./phasePlanningDraftBundle";
import type {PhaseLoopCandidate} from "../../shared/projectState/phaseLoopContracts";
import type {ArchitectReviewDecisionInput} from "../../shared/projectState/architectReviewContracts";

export function createStructuredPhaseLoopService() {
  async function withState<T>(root: string, work: (store: ReturnType<typeof createSQLiteProjectStateStore>, projectId: string, state: ReturnType<typeof createProjectStateService>) => Promise<T>) {
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected SQL Project required.");
    const store = createSQLiteProjectStateStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {return await work(store, projectId, createProjectStateService(store, intakeOperator));} finally {store.close();}
  }
  const get = (root: string, workflowId: string, phaseId: string, stageKind: "interview" | "planning") => withState(root, async (store, projectId, state) => {
    if (!["interview", "planning"].includes(stageKind)) throw Error("Exact Phase stage required.");
    const workflow = await store.getEntity(projectId, workflowId);
    if (workflow?.entityType !== "Workflow" || workflow.body.workflowType !== "project-creation" || workflow.body.workflowState !== "active" || workflow.lifecycleState !== "active") throw Error("Exact active Greenfield Workflow required; other Workflows do not acquire Phase stages.");
    const maps = (await store.listEntities(projectId, "PhaseMapReviewCycle")).filter(record => record.entityType === "PhaseMapReviewCycle" && record.body.workflowId === workflowId && record.lifecycleState === "active");
    if (maps.length !== 1) throw Error("Exact SQL Phase Map required.");
    const map = await state.getGreenfieldPhaseMap(projectId, maps[0].id);
    const phase = map.livePhases.find(record => record.id === phaseId || record.body.phaseKey === phaseId);
    if (map.disposition.state !== "approved" || !phase || ["closed", "cancelled", "blocked"].includes(phase.body.phaseState)) throw Error("Exact available approved-map Phase required.");
    const dependencies = (await store.listRelationships(projectId)).filter(edge => !edge.endedAt && edge.relationshipType === "depends_on" && edge.fromEntityId === phase.id);
    if (dependencies.some(edge => !map.livePhases.some(record => record.id === edge.toEntityId && record.body.phaseState === "closed"))) throw Error("Phase dependencies must be complete.");
    const sources = [map.cycle, phase].map(record => ({entityId: record.id, recordVersion: record.recordVersion}));
    let interview: Awaited<ReturnType<typeof state.getPhaseLoopReview>> | undefined;
    const allCycles = (await store.listEntities(projectId, "PhaseReviewCycle")).filter(record => record.entityType === "PhaseReviewCycle" && record.body.workflowId === workflowId && record.body.phaseId === phase.id && record.lifecycleState === "active");
    if (stageKind === "planning") {
      const interviews = allCycles.filter(record => record.entityType === "PhaseReviewCycle" && record.body.stageKind === "interview");
      if (interviews.length !== 1) throw Error("Fresh structured Phase Interview required; historical prose remains evidence only.");
      interview = await state.getPhaseLoopReview(projectId, interviews[0].id);
      if (interview.disposition.state !== "approved") throw Error("Approve exact Phase Interview before Phase Planning.");
      sources.push(...[interview.cycle, ...interview.members].map(record => ({entityId: record.id, recordVersion: record.recordVersion})));
    }
    let cycles = allCycles.filter(record => record.entityType === "PhaseReviewCycle" && record.body.stageKind === stageKind);
    if (cycles.length > 1) throw Error("Ambiguous exact Phase review.");
    if (!cycles.length && stageKind === "planning") {
      const intakes = (await store.listEntities(projectId, "WorkflowIntake")).filter(record => record.entityType === "WorkflowIntake" && record.body.workflowId === workflowId && record.lifecycleState === "active");
      if (intakes.length !== 1 || intakes[0].entityType !== "WorkflowIntake") throw Error("Exact Project Intake identity required.");
      const projectSlug = String(intakes[0].body.values.projectName ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const documents = listPlanningDocuments(root).filter(document => ["phase-planning", "work-card-plan"].includes(document.metadata.artifactType ?? "") && document.metadata.canonical?.identity.phaseId === phase.body.phaseKey && document.effectiveDisposition === "Approved" && document.documentReadState === "readable" && evaluateDocumentFreshness(root, document.logicalDocumentId).state === "fresh");
      const plans = documents.filter(document => document.metadata.artifactType === "phase-planning"), cards = documents.filter(document => document.metadata.artifactType === "work-card-plan");
      if (plans.length > 1 || cards.length > 1) throw Error("Ambiguous exact legacy Phase Planning bundle.");
      if (plans.length && cards.length) {
        // Only explicit typed semantics migrate. Historical narrative is never guessed into direction.
        const plan = plans[0].metadata.canonical!, card = cards[0].metadata.canonical!;
        const sameKeyPhases = (await store.listEntities(projectId, "Phase")).filter(record => record.entityType === "Phase" && record.body.phaseKey === phase.body.phaseKey && record.lifecycleState === "active");
        if (sameKeyPhases.length !== 1 || [plan, card].some(metadata => metadata.identity.projectSlug !== undefined && metadata.identity.projectSlug !== projectSlug)) throw Error("Legacy bundle has no unambiguous exact Project/Phase identity; submit fresh structured output.");
        if (JSON.stringify(plan.sourceRevisions) !== JSON.stringify(card.sourceRevisions)) throw Error("Legacy Phase Planning bundle source revisions disagree.");
        const candidates = validateCandidates(card.workflowData.candidates);
        const supplied = plan.workflowData.direction;
        const direction = supplied && typeof supplied === "object" ? supplied as PhaseLoopCandidate["direction"] : {title: phase.body.title, objective: phase.body.objective, scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: []};
        const criteria = plan.workflowData.criteria ?? [];
        const cycle = await state.savePhaseLoopCandidate(projectId, {workflowId, phaseId: phase.id, stageKind, facts: [], direction, criteria: criteria as PhaseLoopCandidate["criteria"], candidates, sources});
        for (const document of [plans[0], cards[0]]) await state.recordEvidence(projectId, cycle.id, {evidenceType: "legacy-phase-plan-import", description: `Typed approved metadata ${document.markdownPath}`, mediaType: "text/markdown", payloadRef: `repository:${encodeURIComponent(document.markdownPath)}`, digest: createHash("sha256").update(JSON.stringify(document.metadata.canonical)).digest("hex")});
        await state.recordPhaseLoopReview(projectId, cycle.id, {expectedRecordVersion: cycle.recordVersion, outcome: "approved", notes: "Adopt exact typed candidates and supplied direction; retain historical narrative as evidence."}); cycles = [cycle];
      }
    }
    let review: Awaited<ReturnType<typeof state.getPhaseLoopReview>> | null = null, staleReview: {recordVersion: number; reason: string} | undefined;
    if (cycles.length) try {review = await state.getPhaseLoopReview(projectId, cycles[0].id);} catch (reason) {staleReview = {recordVersion: cycles[0].recordVersion, reason: String(reason)};}
    return {workflowId, phase, stageKind, sources, review, staleReview, handoff: [`# Structured Phase ${stageKind}`, `Exact Project ${projectId}; Workflow ${workflowId}; Phase ${phase.id} (${phase.body.phaseKey})`, "Ask only unresolved questions; confirm the Phase understanding before returning structured semantic output. Return JSON {workflowId,phaseId,stageKind,facts:[{title,statement,impact}],direction:{title,objective,scopeIn:[],scopeOut:[],constraints:[],assumptions:[],risks:[]},criteria:[{statement,criticality,verificationIntent,validationPolicy}],sources:[{entityId,recordVersion}]}. Planning adds candidates:[{candidateId,order,title,purpose,dependsOn:[],resolutionStatus,resolutionReason,evidencePaths:[],criteria:[]}]. Interview must not add candidates. Preserve independently verifiable obligations. Do not emit completion state or parse historical prose into authority.", map.markdown, interview?.markdown ?? "", `Required exact sources: ${JSON.stringify(sources)}`].join("\n\n")};
  });
  const save = async (root: string, workflowId: string, phaseId: string, stageKind: "interview" | "planning", input: PhaseLoopCandidate) => {
    const context = await get(root, workflowId, phaseId, stageKind);
    if (input.workflowId !== workflowId || input.phaseId !== context.phase.id || input.stageKind !== stageKind) throw Error("Exact Phase stage candidate mismatch.");
    await withState(root, (_store, projectId, state) => state.savePhaseLoopCandidate(projectId, input)); return get(root, workflowId, phaseId, stageKind);
  };
  const review = async (root: string, workflowId: string, phaseId: string, stageKind: "interview" | "planning", cycleId: string, input: ArchitectReviewDecisionInput) => {
    const context = await get(root, workflowId, phaseId, stageKind);
    await withState(root, async (store, projectId, state) => {const cycle = await store.getEntity(projectId, cycleId); if (cycle?.entityType !== "PhaseReviewCycle" || cycle.body.workflowId !== workflowId || cycle.body.phaseId !== context.phase.id || cycle.body.stageKind !== stageKind) throw Error("Exact Phase review mismatch."); return state.recordPhaseLoopReview(projectId, cycleId, input);}); return get(root, workflowId, phaseId, stageKind);
  };
  const prepareWorkItem = (root: string, cycleId: string, workItemId: string) => withState(root, (_store, projectId, state) => state.preparePhaseWorkItem(projectId, cycleId, workItemId));
  return {get, save, review, prepareWorkItem};
}
