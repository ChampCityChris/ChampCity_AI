import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {parseWorkItemPlanningJson} from "../../shared/projectState/workItemPlanningContracts";
import {intakeOperator} from "../workflow/workflowIntakeMigration";
import {createWorkflowExecutionApplicationService} from "../workflow/workflowExecutionApplicationService";
import type {ArchitectReviewDecisionInput} from "../../shared/projectState/architectReviewContracts";
import {listPlanningDocuments, evaluateDocumentFreshness} from "../documents/planningDocumentService";
import {createHash} from "node:crypto";

export function createStructuredWorkItemPlanningService() {
  async function withState<T>(root: string, work: (state: ReturnType<typeof createProjectStateService>, projectId: string) => Promise<T>) {
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected SQL Project required.");
    const store = createSQLiteProjectStateStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {return await work(createProjectStateService(store, intakeOperator), projectId);} finally {store.close();}
  }
  const get = (root: string, workflowId: string, workItemId: string) => withState(root, async (state, projectId) => {
    let plan = await state.getWorkflowExecutionPlan(projectId, workflowId);
    let item = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()].find(record => record.id === workItemId);
    if (!item || plan.workflow.lifecycleState !== "active" || plan.workflow.body.workflowState !== "active") throw Error("Exact current accepted Workflow WorkItem required.");
    if (!item.body.contractRevision && !item.body.implementationBoundaries?.length) {
      const documents = listPlanningDocuments(root).filter(document => document.metadata.artifactType === "formal-work-card" && document.metadata.canonical?.identity.workItemId === workItemId && document.documentReadState === "readable" && evaluateDocumentFreshness(root, document.logicalDocumentId).state === "fresh");
      if (documents.length > 1) throw Error("Ambiguous exact Formal Work Card metadata; submit fresh typed output.");
      const document = documents[0], supplied = document?.metadata.canonical?.workflowData.workItemContract;
      if (supplied && typeof supplied === "object") {
        const contract = parseWorkItemPlanningJson(JSON.stringify(supplied));
        if (contract.workflowId !== workflowId || contract.workItemId !== workItemId || contract.expectedVersion !== item.recordVersion || contract.decomposition) throw Error("Legacy structured Formal Work Card identity/version is not exact; submit fresh output.");
        item = await state.saveWorkItemPlanningContract(projectId, contract);
        await state.recordEvidence(projectId, item.id, {evidenceType: "legacy-formal-contract-import", description: "Exact typed Formal Work Card metadata; free-form body retained as history", mediaType: "text/markdown", payloadRef: `repository:${encodeURIComponent(document.markdownPath)}`, digest: createHash("sha256").update(JSON.stringify(document.metadata.canonical)).digest("hex")});
        if (document.effectiveDisposition === "Approved") await state.recordWorkItemPlanningReview(projectId, workflowId, item.id, {expectedRecordVersion: item.recordVersion, outcome: "approved", notes: "Adopt exact previously reviewed structured Formal Work Card contract."});
        plan = await state.getWorkflowExecutionPlan(projectId, workflowId);
      }
    }
    const review = await state.getWorkItemPlanningReview(projectId, workItemId);
    const criteria = plan.criteria.filter(entry => entry.ownerId === workItemId);
    const phase = plan.phases.find(entry => entry.workItemIds.includes(workItemId));
    const sourceBaselines = await state.queryRecords(projectId, {entityType: "SourceBaseline", relatedTo: workflowId, relationshipType: "baselines_source"});
    const contract = {workflowId, workItemId, expectedVersion: item.recordVersion, implementationBoundaries: item.body.implementationBoundaries ?? [], affectedPaths: item.body.affectedPaths ?? [], proofIntent: item.body.proofIntent ?? []};
    const markdown = [`# Formal WorkItem: ${item.body.title}`, `WorkItem ${workItemId}; SQL revision ${item.recordVersion}`, item.body.objective, "## Execution contract", JSON.stringify(contract, null, 2), "## Criteria", ...criteria.map(entry => `${entry.record.id}: ${entry.record.body.statement} (${entry.record.body.validationPolicy})`)].join("\n\n");
    const handoff = [`# Architect WorkItem planning`, "Return bounded JSON matching the exact IDs/version below. implementationBoundaries and proofIntent require 1..32 nonempty entries. affectedPaths allows 0..128 normalized repository-relative source paths, empty for source-neutral work. Preserve all existing Criteria and dependencies. Optional criteria contain statement, criticality, verificationIntent, validationPolicy. Optional decomposition uses replacements, criterionDispositions and incomingDependentMappings; it requires a separate explicit Operator action. Replacements specify key,kind,title,objective,dependencyWorkItemIds,dependencyReplacementKeys. Map every current Criterion with transfer/elevate/split and every incoming dependent to replacement keys. Optional topologyCorrection specifies phases,phaseDependencies,boundaries,assignments, assigning every unchanged WorkItem ID and replacement key to explicit nonempty Phases with required acceptance Criteria. Every later Phase requires an allowed boundary reason, rationale and evidenceRefs under RWS06A. Never infer Phases from size or effort. Markdown is a generated readability projection only.", `Source mode: ${sourceBaselines.length ? "source-backed; accepted affected paths required" : "source-neutral; affected paths empty; required deterministic ValidationCatalog proof unavailable"}`, JSON.stringify(contract), `Accepted context: ${JSON.stringify({workItem: item, solutions: plan.solutions, criteria: plan.criteria, phase, dependencies: plan.dependencyIds, sourceBaselines})}`, review.disposition.state === "revision_requested" ? `Operator revision disposition: ${JSON.stringify(review.disposition)}` : ""].join("\n\n");
    return {workflowId, workflowType: plan.workflow.body.workflowType, workItem: item, review, markdown, handoff};
  });
  const save = async (root: string, workflowId: string, workItemId: string, json: string) => {
    const input = parseWorkItemPlanningJson(json);
    if (input.workflowId !== workflowId || input.workItemId !== workItemId) throw Error("Architect output targets another exact WorkItem.");
    const current = await get(root, workflowId, workItemId);
    if (["feature-capability", "issue-resolution"].includes(current.workflowType)) {
      if (input.decomposition) throw Error("Decomposition requires the separate explicit Operator action.");
      await createWorkflowExecutionApplicationService().acceptWorkItemExecutionPlan(root, {workflowId, workItemId, expectedVersion: input.expectedVersion, plan: input}, false, input.criteria);
    } else await withState(root, (state, projectId) => state.saveWorkItemPlanningContract(projectId, input));
    return get(root, workflowId, workItemId);
  };
  const review = async (root: string, workflowId: string, workItemId: string, input: ArchitectReviewDecisionInput) => {
    await withState(root, (state, projectId) => state.recordWorkItemPlanningReview(projectId, workflowId, workItemId, input));
    return get(root, workflowId, workItemId);
  };
  const decompose = async (root: string, workflowId: string, workItemId: string, json: string) => {
    const input = parseWorkItemPlanningJson(json);
    if (input.workflowId !== workflowId || input.workItemId !== workItemId || !input.decomposition) throw Error("Exact typed decomposition proposal required.");
    const current = await get(root, workflowId, workItemId);
    if (current.workflowType === "project-creation") return withState(root, (state, projectId) => state.decomposeWorkItem(projectId, {...input.decomposition!, workflowId, workItemId, expectedWorkItemVersion: input.expectedVersion}));
    return createWorkflowExecutionApplicationService().decomposeWorkflowWorkItem(root, {...input.decomposition, workflowId, workItemId, expectedWorkItemVersion: input.expectedVersion});
  };
  return {get, save, review, decompose};
}
