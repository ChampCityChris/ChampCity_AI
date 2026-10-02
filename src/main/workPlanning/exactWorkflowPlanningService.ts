import fs from "node:fs";
import path from "node:path";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { ARCHITECT_STAGE_BY_WORKFLOW, type ArchitectReviewDecisionInput } from "../../shared/projectState/architectReviewContracts";
import { PLAN_BOUNDARY_REASONS, type PlanCandidate } from "../../shared/projectState/planReviewContracts";
import { resolveWorkPlanningProfile } from "./workPlanningProfiles";
import { selectProjectArchitectureContext } from "../../shared/projectState/projectArchitectureContext";
import { currentIntake, intakeOperator } from "../workflow/workflowIntakeMigration";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";

export function createExactWorkflowPlanningService(dependencies: {openStore?: (databasePath: string) => ProjectStateStore & {close(): void}} = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore;
  async function withWorkflow<T>(root: string, workflowId: string, action: (store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">) => Promise<T>) {
    if (typeof workflowId !== "string" || !workflowId.trim() || workflowId.length > 128) throw Error("Exact bounded Planning Workflow ID required.");
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected Current Project is not registered.");
    const store = openStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {
      const workflow = await store.getEntity(projectId, workflowId);
      if (!workflow || workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || ["work-intake-routing", "project-creation"].includes(workflow.body.workflowType)) throw Error("Planning requires the exact active existing-project substantive Workflow.");
      return await action(store, projectId, workflow);
    } finally { store.close(); }
  }
  async function context(store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">) {
    const state = createProjectStateService(store, intakeOperator), intake = await currentIntake(store, projectId, workflow);
    if (!intake || (await state.getWorkflowIntakeDisposition(projectId, intake.id)).state !== "approved") throw Error("Approve the current exact SQL Intake before Planning.");
    const architect = await state.getCurrentArchitectReviewCycle(projectId, workflow.id, ARCHITECT_STAGE_BY_WORKFLOW[workflow.body.workflowType]!);
    if (!architect) throw Error("Approve the current Architect Assessment/RCA before Planning.");
    const review = await state.getArchitectReviewProjection(projectId, architect.id);
    if (review.disposition.state !== "approved") throw Error("Approve the current Architect Assessment/RCA revision before Planning.");
    const records = await store.listEntities(projectId), relationships = await store.listRelationships(projectId);
    const memberIds = new Set(review.sources.map(source => source.entityId));
    const baseline = records.filter((record): record is ProjectStateRecord<"SourceBaseline"> => record.entityType === "SourceBaseline" && record.lifecycleState === "active" && record.body.workflowId === workflow.id);
    const baselineEdges = relationships.filter(edge => !edge.endedAt && edge.relationshipType === "baselines_source" && edge.toEntityId === workflow.id);
    if (baseline.length > 1 || baselineEdges.length !== baseline.length || baseline.length === 1 && baselineEdges[0].fromEntityId !== baseline[0].id) throw Error("Planning SourceBaseline identity is ambiguous or incomplete.");
    const research = records.filter((record): record is ProjectStateRecord<"ResearchOutcome"> => record.entityType === "ResearchOutcome" && memberIds.has(record.id));
    if (workflow.body.workflowType === "research-prototype" && research.length !== 1) throw Error("Research requires an explicit typed outcome in a fresh Architect review; prose or ambiguous legacy Markdown cannot authorize Planning or closure.");
    const architecture = selectProjectArchitectureContext(projectId, records, relationships);
    const sources = [workflow, intake, architect, ...baseline, ...records.filter(record => memberIds.has(record.id)), ...architecture].map(record => ({entityId: record.id, recordVersion: record.recordVersion}));
    return {intake, architect, review, baseline: baseline[0] ?? null, researchOutcome: research[0] ?? null, architecture, sources: [...new Map(sources.map(source => [source.entityId, source])).values()], semanticRecords: records.filter(record => memberIds.has(record.id)), project: await store.getProject(projectId)};
  }
  const get = (root: string, workflowId: string) => withWorkflow(root, workflowId, async (store, projectId, workflow) => {
    const state = createProjectStateService(store, intakeOperator), accepted = await state.getWorkflowExecutionPlan(projectId, workflowId);
    // Existing accepted SQL graphs are read in place; no candidate or semantic recreation.
    if (accepted.decisions.length) return {workflowId, workflowType: workflow.body.workflowType, acceptedPlan: accepted, review: null, handoff: null, researchOutcome: null};
    const current = await context(store, projectId, workflow);
    const cycles = (await store.listEntities(projectId, "PlanReviewCycle")).filter((record): record is ProjectStateRecord<"PlanReviewCycle"> => record.entityType === "PlanReviewCycle" && record.body.workflowId === workflowId && record.lifecycleState === "active");
    if (cycles.length > 1) throw Error("Current Plan review identity is ambiguous.");
    let review: Awaited<ReturnType<typeof state.getPlanReview>> | null = null;
    let staleReview: {cycleId: string; recordVersion: number; reason: string} | undefined;
    if (cycles.length) try {review = await state.getPlanReview(projectId, cycles[0].id);} catch (error) {staleReview = {cycleId: cycles[0].id, recordVersion: cycles[0].recordVersion, reason: error instanceof Error ? error.message : String(error)};}
    const route = workflow.body.workflowType === "feature-capability" ? "feature-change" : workflow.body.workflowType;
    const profile = resolveWorkPlanningProfile(route);
    const noPlan = current.researchOutcome?.body.outcome === "no-implementation-plan-required";
    const handoff = noPlan ? null : [
      `# ${profile.routeId} Planning`, `Exact Project ${current.project?.body.name} (${projectId}); Workflow ${workflow.id} (${workflow.body.workflowType})`,
      `Approved Intake ${current.intake.id}@${current.intake.recordVersion}; approved Architect review ${current.architect.id}@${current.architect.recordVersion}`,
      `Exact SourceBaseline: ${JSON.stringify(current.baseline)}`, !current.baseline ? "Source-neutral: required deterministic validation is unavailable; use semantic_ai, visual_human or operator_decision where applicable." : "",
      ...profile.requiredEvidence, ...profile.discoveryQuestions, `Required Plan sections: ${profile.planSections.join("; ")}`, ...profile.topologyCriteria,
      `Accepted semantic records: ${JSON.stringify(current.semanticRecords)}`, `Accepted Project architecture: ${JSON.stringify(current.architecture)}`,
      "Return only one typed JSON PlanCandidate. Canonical Markdown is generated by the application. Do not supply topology; application code derives it from optional semantic grouping. Do not include execution, Git, or runtime mechanics.",
      "Contract: {workflowId, workflowType, solution:{title,objective,scopeIn:[],scopeOut:[],constraints:[],assumptions:[],risks:[]}, solutionCriteria:[{statement,criticality,verificationIntent,validationPolicy}], workItems:[{key,kind,title,objective,dependencyKeys:[],criteria:[],phaseKey?:string}], phases?:[{key,title,objective,sequence,criteria:[]}], phaseDependencies?:[{phaseKey,dependencyKeys:[]}], boundaries?:[{phaseKey,reason,rationale,evidenceRefs:[]}], sources:[{entityId,recordVersion}]}. Direct default has no Phase fields. Phased requires >=2 nonempty groups, one assignment per WorkItem, required Phase acceptance, acyclic dependencies respecting Phase order, and a boundary before each Phase after the first.",
      `Boundary reasons: ${PLAN_BOUNDARY_REASONS.join(", ")}. Each requires bounded rationale and evidence references. Counts, effort, model preference and route cannot force grouping.`,
      `Use exact workflowId ${workflow.id} and workflowType ${workflow.body.workflowType}; ${workflow.body.workflowType === "issue-resolution" ? "every WorkItem kind must be fix and address accepted RootCauses/Findings" : workflow.body.workflowType === "refactor-migration" ? "WorkItem kind migration or maintenance" : "WorkItem kind feature or maintenance"}.`,
      `Required exact sources: ${JSON.stringify(current.sources)}`,
    ].filter(Boolean).join("\n\n");
    return {workflowId, workflowType: workflow.body.workflowType, acceptedPlan: null, review, staleReview, handoff, researchOutcome: current.researchOutcome?.body ?? null};
  });
  const save = async (root: string, workflowId: string, candidate: PlanCandidate & {expectedRecordVersion?: number}) => {
    await withWorkflow(root, workflowId, async (store, projectId, workflow) => {
      const current = await context(store, projectId, workflow);
      if (current.researchOutcome?.body.outcome === "no-implementation-plan-required") throw Error("Approved Research outcome requires no implementation Plan.");
      if (candidate.workflowId !== workflowId || candidate.workflowType !== workflow.body.workflowType) throw Error("Plan candidate must name the exact Workflow ID/type.");
      if (workflow.body.workflowType === "issue-resolution" && candidate.workItems.some(work => work.kind !== "fix")) throw Error("Issue correction WorkItems must use kind fix.");
      for (const source of current.sources) if (!candidate.sources.some(item => item.entityId === source.entityId && item.recordVersion === source.recordVersion)) throw Error("Plan candidate is missing current approved source revisions.");
      const solutionAddresses = workflow.body.workflowType === "issue-resolution" ? [...new Set([...(candidate.solutionAddresses ?? []), ...current.semanticRecords.filter(record => record.entityType === "RootCause" || record.entityType === "Finding").map(record => record.id)])] : candidate.solutionAddresses;
      await createProjectStateService(store, intakeOperator).savePlanCandidate(projectId, {...candidate, ...(solutionAddresses ? {solutionAddresses} : {})});
    });
    return get(root, workflowId);
  };
  const review = async (root: string, workflowId: string, cycleId: string, input: ArchitectReviewDecisionInput) => {
    await withWorkflow(root, workflowId, async (store, projectId, workflow) => {
      await context(store, projectId, workflow);
      const cycle = await store.getEntity(projectId, cycleId);
      if (cycle?.entityType !== "PlanReviewCycle" || cycle.body.workflowId !== workflowId) throw Error("Plan review belongs to another Workflow.");
      await createProjectStateService(store, intakeOperator).recordPlanReview(projectId, cycleId, input);
    });
    return get(root, workflowId);
  };
  const closeResearch = (root: string, workflowId: string) => withWorkflow(root, workflowId, async (store, projectId, workflow) => {
    const current = await context(store, projectId, workflow);
    if (workflow.body.workflowType !== "research-prototype" || current.researchOutcome?.body.outcome !== "no-implementation-plan-required") throw Error("Research closure requires the exact approved typed no-Plan outcome.");
    return createProjectStateService(store, intakeOperator).closeResearchAfterAssessment(projectId, workflowId, current.architect.id, current.architect.recordVersion);
  });
  return {get, prepare: get, save, review, closeResearch};
}
