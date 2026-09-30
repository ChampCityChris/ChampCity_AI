import fs from "node:fs";
import path from "node:path";
import type { ProjectId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { getWorkflowTypeDefinition, WORKFLOW_TYPE_IDS, type WorkflowType } from "../../shared/projectState/workflowTypeRegistry";
import { createProjectStateService, type WorkflowPlanningGraph } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import type { DirectWorkflowStartRequest, WorkflowInstanceSummary, WorkflowInventory, WorkflowOpenResult } from "../../shared/workflowApplicationContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { currentProjectRepositoryId, selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { resolveManagedDevRepositoryCheckout } from "../sourceControl/managedProjectSourceService";
import { runBoundedGit } from "../core/gitExecution";

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
type WorkflowRecord = ProjectStateRecord<"Workflow">;

function requireWorkflow(record: unknown): WorkflowRecord {
  if (!record || typeof record !== "object" || (record as { entityType?: unknown }).entityType !== "Workflow")
    throw Error("Current Workflow record is unavailable.");
  return record as WorkflowRecord;
}

function currentInstance(record: WorkflowRecord): boolean {
  return record.lifecycleState === "active" || record.lifecycleState === "closed";
}

function workflowSummary(record: WorkflowRecord, provenance: { workIntakeId?: string; routedSourceWorkflowId?: string; routedTargetWorkflowId?: string } = {}): WorkflowInstanceSummary {
  return { workflowId: record.id, lineageId: record.lineageId, workflowType: record.body.workflowType, title: record.body.title,
    workflowState: record.body.workflowState, lifecycleState: record.lifecycleState, currentWorkspace: record.body.currentWorkspace,
    createdAt: record.createdAt, updatedAt: record.updatedAt, ...provenance };
}

async function exactDevRevision(projectRoot: string): Promise<string> {
  const devRoot = await resolveManagedDevRepositoryCheckout(projectRoot);
  const result = await runBoundedGit({ cwd: devRoot, args: ["rev-parse", "--verify", "HEAD^{commit}"] });
  const revision = result.stdout.trim();
  if (result.exitCode !== 0 || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(revision))
    throw Error("Managed Dev checkout does not expose an exact commit revision.");
  return revision;
}

function provenanceFor(records: WorkflowRecord[], relationships: Awaited<ReturnType<ProjectStateStore["listRelationships"]>>) {
  const ids = new Set(records.map(record => record.id));
  const intakesByRoutingWorkflow = new Map<string, string[]>();
  for (const edge of relationships) {
    if (edge.relationshipType !== "initiates" || !ids.has(edge.toEntityId)) continue;
    const prior = intakesByRoutingWorkflow.get(edge.toEntityId) ?? [];
    if (!prior.includes(edge.fromEntityId)) prior.push(edge.fromEntityId);
    intakesByRoutingWorkflow.set(edge.toEntityId, prior);
  }
  const routeTargetsBySource = new Map<string, string[]>();
  const routeSourcesByTarget = new Map<string, string[]>();
  for (const edge of relationships) {
    if (edge.relationshipType !== "routes_to" || !ids.has(edge.fromEntityId) || !ids.has(edge.toEntityId)) continue;
    const targets = routeTargetsBySource.get(edge.fromEntityId) ?? [];
    if (!targets.includes(edge.toEntityId)) targets.push(edge.toEntityId);
    routeTargetsBySource.set(edge.fromEntityId, targets);
    const sources = routeSourcesByTarget.get(edge.toEntityId) ?? [];
    if (!sources.includes(edge.fromEntityId)) sources.push(edge.fromEntityId);
    routeSourcesByTarget.set(edge.toEntityId, sources);
  }
  const oneOrNone = (values: string[] | undefined, label: string) => {
    if ((values?.length ?? 0) > 1) throw Error(`Current Workflow has ambiguous ${label} provenance.`);
    return values?.[0];
  };
  const exactlyOne = (values: string[] | undefined, label: string) => {
    if (values?.length !== 1) throw Error(`Current Workflow has invalid ${label} provenance.`);
    return values[0];
  };
  return (record: WorkflowRecord) => {
    const workIntakeId = record.body.workflowType === "work-intake-routing"
      ? exactlyOne(intakesByRoutingWorkflow.get(record.id), "Work Intake")
      : undefined;
    const routedSourceWorkflowId = record.body.workflowType !== "work-intake-routing"
      ? oneOrNone(routeSourcesByTarget.get(record.id), "routed source Workflow")
      : undefined;
    const routedTargetWorkflowId = record.body.workflowType === "work-intake-routing"
      ? oneOrNone(routeTargetsBySource.get(record.id), "routed target Workflow")
      : undefined;
    const intakeId = workIntakeId ?? (routedSourceWorkflowId
      ? exactlyOne(intakesByRoutingWorkflow.get(routedSourceWorkflowId), "routed Work Intake")
      : undefined);
    return workflowSummary(record, { ...(intakeId ? { workIntakeId: intakeId } : {}),
      ...(routedSourceWorkflowId ? { routedSourceWorkflowId } : {}),
      ...(routedTargetWorkflowId ? { routedTargetWorkflowId } : {}) });
  };
}

/** Main-process application boundary for the registered Current Project's exact Workflow instances. */
export function createWorkflowApplicationService(dependencies: {
  openStore?: (databasePath: string) => ProjectStateStore & { close(): void };
  resolveRepositoryId?: typeof currentProjectRepositoryId;
  readDevRevision?: typeof exactDevRevision;
} = {}) {
  const openStore = dependencies.openStore ?? createSQLiteProjectStateStore;
  const resolveRepositoryId = dependencies.resolveRepositoryId ?? currentProjectRepositoryId;
  const readDevRevision = dependencies.readDevRevision ?? exactDevRevision;

  async function withCurrentProject<T>(projectRoot: string, action: (store: ProjectStateStore, projectId: ProjectId) => Promise<T>): Promise<T> {
    if (typeof projectRoot !== "string" || !projectRoot.trim()) throw Error("Current Project root is required.");
    const canonicalRoot = fs.realpathSync(projectRoot);
    const projectId = selectedCurrentProjectId(canonicalRoot);
    if (!projectId) throw Error("Selected Project is not a registered Current Project.");
    const databasePath = path.join(canonicalRoot, ".champcity", "project-state.sqlite");
    const store = openStore(databasePath);
    try {
      const project = await store.getProject(projectId);
      if (!project || project.id !== projectId || project.lifecycleState !== "active") throw Error("Selected Current Project State is unavailable.");
      return await action(store, projectId);
    } finally { store.close(); }
  }

  async function listCurrentProjectWorkflows(projectRoot: string): Promise<WorkflowInventory> {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const all = (await store.listEntities(projectId, "Workflow"))
        .filter((record): record is WorkflowRecord => record.entityType === "Workflow" && currentInstance(record));
      const summaries = provenanceFor(all, await store.listRelationships(projectId));
      const byType = new Map<WorkflowType, WorkflowInstanceSummary[]>();
      for (const record of all) {
        const group = byType.get(record.body.workflowType) ?? [];
        group.push(summaries(record));
        byType.set(record.body.workflowType, group);
      }
      return { groups: [...WORKFLOW_TYPE_IDS].sort((a, b) => getWorkflowTypeDefinition(a)!.hubOrder - getWorkflowTypeDefinition(b)!.hubOrder)
        .map(workflowType => ({ workflowType, workflows: (byType.get(workflowType) ?? [])
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.workflowId.localeCompare(b.workflowId)) })) };
    });
  }

  async function getCurrentProjectWorkflow(projectRoot: string, workflowId: string): Promise<WorkflowOpenResult> {
    if (typeof workflowId !== "string" || !workflowId.trim()) throw Error("Exact Workflow ID is required.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const record = requireWorkflow(await store.getEntity(projectId, workflowId));
      if (record.projectId !== projectId || !currentInstance(record)) throw Error("Current Workflow is unavailable.");
      const all = (await store.listEntities(projectId, "Workflow"))
        .filter((item): item is WorkflowRecord => item.entityType === "Workflow" && currentInstance(item));
      return { workflow: provenanceFor(all, await store.listRelationships(projectId))(record) };
    });
  }

  async function getWorkflowPlanningContext(projectRoot: string, workflowId: string) {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const workflow = requireWorkflow(await store.getEntity(projectId, workflowId));
      if (workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || ["work-intake-routing", "project-creation"].includes(workflow.body.workflowType)) throw Error("Planning context requires a current implementation Workflow.");
      const relationships = await store.listRelationships(projectId);
      const baselineEdges = relationships.filter(edge => !edge.endedAt && edge.relationshipType === "baselines_source" && edge.toEntityId === workflowId);
      const bindingEdges = relationships.filter(edge => !edge.endedAt && edge.relationshipType === "binds_source" && edge.toEntityId === workflowId);
      if (baselineEdges.length > 1 || bindingEdges.length > 1 || (bindingEdges.length && !baselineEdges.length)) throw Error("Current Workflow has ambiguous or incomplete source planning context.");
      const baselineEdge = baselineEdges[0]; const bindingEdge = bindingEdges[0];
      const [baseline, binding] = await Promise.all([baselineEdge ? store.getEntity(projectId, baselineEdge.fromEntityId) : null, bindingEdge ? store.getEntity(projectId, bindingEdge.fromEntityId) : null]);
      if (baseline && (baseline.entityType !== "SourceBaseline" || baseline.body.workflowId !== workflowId)) throw Error("Current Workflow SourceBaseline identity is inconsistent.");
      if (binding && (binding.entityType !== "SourceBinding" || binding.body.workflowId !== workflowId || binding.body.sourceBaselineId !== baseline?.id)) throw Error("Current Workflow SourceBinding identity is inconsistent.");
      const routed = relationships.some(edge => !edge.endedAt && edge.relationshipType === "routes_to" && edge.toEntityId === workflowId);
      return { workflow: workflowSummary(workflow), provenance: routed ? "routed" as const : "direct" as const,
        source: baseline?.entityType === "SourceBaseline" ? { baseline, binding: binding?.entityType === "SourceBinding" ? binding : null } : null };
    });
  }

  async function getAcceptedWorkflowPlanningGraph(projectRoot: string, workflowId: string) {
    return withCurrentProject(projectRoot, (store, projectId) => createProjectStateService(store, operator).getWorkflowExecutionPlan(projectId, workflowId));
  }

  async function acceptReviewedWorkflowPlanningGraph(projectRoot: string, graph: WorkflowPlanningGraph) {
    return withCurrentProject(projectRoot, (store, projectId) => createProjectStateService(store, operator).acceptWorkflowPlanningGraph(projectId, graph));
  }

  async function startDirectWorkflow(projectRoot: string, input: DirectWorkflowStartRequest): Promise<{ workflow: WorkflowInstanceSummary }> {
    if (!input || typeof input !== "object" || Object.keys(input).some(key => !["workflowType", "title"].includes(key)))
      throw Error("Direct Workflow request has unsupported fields.");
    const definition = getWorkflowTypeDefinition(input.workflowType);
    if (!definition?.directStart) throw Error("Workflow type is not available for direct start.");
    if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 200)
      throw Error("Workflow title must contain 1 to 200 characters.");
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const repositoryId = await resolveRepositoryId(projectRoot);
      const sourceSeed = repositoryId ? { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: await readDevRevision(projectRoot) } : undefined;
      const state = createProjectStateService(store, operator);
      const created = await state.createSubstantiveWorkflow(projectId, { workflowType: input.workflowType, title: input.title.trim(),
        entryWorkspace: definition.entryWorkspace, ...(sourceSeed ? { sourceSeed } : {}) });
      return { workflow: workflowSummary(created.workflow) };
    });
  }

  async function ensureProjectCreationWorkflow(projectRoot: string): Promise<{ workflow: WorkflowInstanceSummary }> {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const project = await store.getProject(projectId);
      if (!project) throw Error("Selected Current Project State is unavailable.");
      const all = (await store.listEntities(projectId, "Workflow"))
        .filter((record): record is WorkflowRecord => record.entityType === "Workflow");
      const existing = all.filter(record => record.body.workflowType === "project-creation" && currentInstance(record));
      if (existing.length > 1) throw Error("Current Project has ambiguous Project Creation Workflows.");
      let workflow: WorkflowRecord;
      if (existing.length === 1) workflow = existing[0];
      else {
        if (all.some(record => record.body.workflowType === "project-creation"))
          throw Error("Project Creation history is retired and cannot be reopened as a new Workflow.");
        const definition = getWorkflowTypeDefinition("project-creation")!;
        const repositoryId = await resolveRepositoryId(projectRoot);
        const sourceSeed = repositoryId ? { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: await readDevRevision(projectRoot) } : undefined;
        const created = await createProjectStateService(store, operator).createProjectCreationWorkflow(projectId,
          { title: project.body.name, ...(sourceSeed ? { sourceSeed } : {}) });
        workflow = created.workflow;
        if (workflow.body.currentWorkspace !== definition.entryWorkspace) throw Error("Project Creation entry workspace does not match its registry.");
      }
      const active = all.filter(record => currentInstance(record));
      return { workflow: provenanceFor(active, await store.listRelationships(projectId))(workflow) };
    });
  }

  async function completeIncompleteGreenfieldInitialization(projectRoot: string): Promise<{ workflow: WorkflowInstanceSummary }> {
    return withCurrentProject(projectRoot, async (store, projectId) => {
      const project = await store.getProject(projectId);
      if (!project || project.body.description !== "Greenfield Project")
        throw Error("Start New Project cannot reopen this Current Project; use Existing Project.");
      const repositoryId = await resolveRepositoryId(projectRoot);
      if (!repositoryId) throw Error("Incomplete Greenfield initialization has no managed source baseline; open Existing Project.");
      const baseRevisionId = await readDevRevision(projectRoot);
      const all = (await store.listEntities(projectId, "Workflow"))
        .filter((record): record is WorkflowRecord => record.entityType === "Workflow");
      if (all.some(record => record.body.workflowType === "project-creation"))
        throw Error("Project Creation is already established; use Existing Project to open its Workflow.");
      const created = await createProjectStateService(store, operator).createProjectCreationWorkflow(projectId,
        { title: project.body.name, sourceSeed: { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId } });
      return { workflow: workflowSummary(created.workflow) };
    });
  }

  return { listCurrentProjectWorkflows, getCurrentProjectWorkflow, getWorkflowPlanningContext, getAcceptedWorkflowPlanningGraph, acceptReviewedWorkflowPlanningGraph, startDirectWorkflow, ensureProjectCreationWorkflow, completeIncompleteGreenfieldInitialization };
}
