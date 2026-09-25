import type { EntityBodyMap, PrincipalRef, ProjectId, WorkRoute } from "../../shared/projectState/domainContracts";
import type { WorkflowType } from "../../shared/projectState/workflowTypeRegistry";
import { WORKFLOW_TYPE_REGISTRY } from "../../shared/projectState/workflowTypeRegistry";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";

export interface ArchitectPlanningInput {
  findings: Array<Pick<EntityBodyMap["Finding"], "title" | "statement" | "category" | "impact">>;
  rootCauses: Array<Pick<EntityBodyMap["RootCause"], "title" | "statement" | "rationale"> & { findingIndex: number }>;
  solutions: Array<EntityBodyMap["BoundedSolution"] & { rootCauseIndex: number }>;
}
export interface ProjectPlanInput {
  workflowType: WorkflowType;
  phases: Array<{ title: string; objective: string; workItems: Array<Pick<EntityBodyMap["WorkItem"], "workItemKind" | "title" | "objective">> }>;
}

/** Typed semantic seam for the first migrated workflow family. It never reads or writes V1 Markdown. */
export function createProjectWorkflowStateFacade(store: ProjectStateStore, principal: PrincipalRef) {
  const state = createProjectStateService(store, principal);
  return {
    async createProject(input: { name: string; purpose: string; repository?: { provider: string; repositoryId: string; locator: string; role?: string } }) {
      const project = await state.createRecord(null, "Project", { name: input.name, description: input.purpose });
      const repository = input.repository ? await state.createRecord(project.id, "ProjectResource", { resourceType: "source-repository",
        provider: input.repository.provider, logicalName: input.repository.repositoryId, locator: input.repository.locator,
        role: input.repository.role ?? "project-source" }) : null;
      if (repository) await state.createRelationship(project.id, repository.id, "relates_to", project.id);
      return { project, repository };
    },
    async getProject(projectId: ProjectId) {
      const project = await state.getRecord(projectId, projectId);
      if (!project || project.entityType !== "Project") return null;
      const resources = await state.queryRecords(projectId, { entityType: "ProjectResource", limit: 100 });
      return { project, resources };
    },
    async recordArchitectPlanning(projectId: ProjectId, input: ArchitectPlanningInput) {
      if (input.findings.length > 50 || input.rootCauses.length > 50 || input.solutions.length > 50) throw Error("Architect Planning input exceeds its bound.");
      if (input.rootCauses.some(cause => !Number.isInteger(cause.findingIndex) || cause.findingIndex < 0 || cause.findingIndex >= input.findings.length) ||
        input.solutions.some(solution => !Number.isInteger(solution.rootCauseIndex) || solution.rootCauseIndex < 0 || solution.rootCauseIndex >= input.rootCauses.length)) {
        throw Error("Architect Planning references an unknown Finding or Root Cause.");
      }
      const findings = [];
      for (const finding of input.findings) findings.push(await state.createRecord(projectId, "Finding", {
        ...finding, observedAt: new Date().toISOString(), findingState: "open" }));
      const roots = [];
      for (const cause of input.rootCauses) {
        const target = findings[cause.findingIndex];
        if (!target) throw Error("Architect Root Cause references an unknown Finding.");
        const root = await state.createRecord(projectId, "RootCause", { title: cause.title, statement: cause.statement,
          rationale: cause.rationale, rootCauseState: "active" });
        await state.createRelationship(projectId, root.id, "explains", target.id);
        roots.push(root);
      }
      const solutions = [];
      for (const proposal of input.solutions) {
        const target = roots[proposal.rootCauseIndex];
        if (!target) throw Error("Architect Solution references an unknown Root Cause.");
        const { rootCauseIndex: _rootCauseIndex, ...body } = proposal;
        const solution = await state.createRecord(projectId, "BoundedSolution", body);
        await state.createRelationship(projectId, solution.id, "addresses", target.id);
        solutions.push(solution);
      }
      return { findings, rootCauses: roots, solutions };
    },
    async getArchitectPlanning(projectId: ProjectId) {
      const [findings, rootCauses, solutions] = await Promise.all([
        state.queryRecords(projectId, { entityType: "Finding", limit: 100 }),
        state.queryRecords(projectId, { entityType: "RootCause", limit: 100 }),
        state.queryRecords(projectId, { entityType: "BoundedSolution", limit: 100 }),
      ]);
      return { findings, rootCauses, solutions, current: await state.getCurrentProjectStateView(projectId, { limitPerSection: 100 }) };
    },
    async createProjectPlan(projectId: ProjectId, input: ProjectPlanInput) {
      if (input.phases.length > 50 || input.phases.some(phase => phase.workItems.length > 50)) throw Error("Project Plan exceeds its bound.");
      const workflow = await state.createWorkflow(projectId, { workflowType: input.workflowType,
        title: WORKFLOW_TYPE_REGISTRY[input.workflowType].label, currentWorkspace: "project-planning" });
      const phases = [];
      for (const [index, phase] of input.phases.entries()) {
        const record = await state.createRecord(projectId, "Phase", { title: phase.title, objective: phase.objective,
          phaseState: "planned", sequence: index + 1 });
        await state.createRelationship(projectId, record.id, "part_of", workflow.id);
        const workItems = [];
        for (const item of phase.workItems) {
          const work = await state.createRecord(projectId, "WorkItem", { ...item, workState: "planned" });
          await state.createRelationship(projectId, work.id, "part_of", record.id);
          workItems.push(work);
        }
        phases.push({ phase: record, workItems });
      }
      return { workflow, phases };
    },
    async getProjectPlan(projectId: ProjectId) { return state.getExecutionPlan(projectId); },
    async captureWorkIntake(projectId: ProjectId, input: Omit<EntityBodyMap["WorkIntake"], "intakeState">) {
      return (await state.createWorkIntake(projectId, input)).intake;
    },
    async assessWorkIntakeRoute(projectId: ProjectId, intakeId: string, input: Omit<EntityBodyMap["RouteAssessment"], "workIntakeId">) {
      return state.recordRouteAssessment(projectId, intakeId, input);
    },
    async selectWorkIntakeRoute(projectId: ProjectId, intakeId: string, input: { route: WorkRoute; assessmentId: string; rationale: string }) {
      return state.recordRouteDecision(projectId, intakeId, input);
    },
    async getWorkIntake(projectId: ProjectId, intakeId: string) {
      return { summary: await state.getWorkIntakeSummary(projectId, intakeId), route: await state.getCurrentWorkRoute(projectId, intakeId),
        history: await state.getWorkRouteHistory(projectId, intakeId), projection: await state.renderView(projectId, { projectionType: "work-intake", sourceEntityId: intakeId }) };
    },
    async getProjectView(projectId: ProjectId) { return state.getCurrentProjectStateView(projectId, { limitPerSection: 100 }); },
  };
}
