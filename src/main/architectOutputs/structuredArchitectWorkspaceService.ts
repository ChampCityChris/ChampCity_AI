import fs from "node:fs";
import path from "node:path";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { GREENFIELD_ARCHITECT_SECTIONS, type GreenfieldArchitectOutput, type StructuredArchitectWorkspaceModel } from "../../shared/architectWorkspaceContracts";
import type { ArchitectReviewDecisionInput } from "../../shared/projectState/architectReviewContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { currentIntake, intakeOperator } from "../workflow/workflowIntakeMigration";
import { selectProjectArchitectureContext } from "../../shared/projectState/projectArchitectureContext";
import { architectReviewDocument, writeArchitectReviewProjection } from "./architectReviewProjectionWriter";

export function createStructuredArchitectWorkspaceService() {
  async function withWorkflow<T>(root: string, id: string, work: (store: ReturnType<typeof createSQLiteProjectStateStore>, projectId: string, workflow: import("../../shared/projectState/domainContracts").ProjectStateRecord<"Workflow">) => Promise<T>) {
    if (typeof id !== "string" || !id.trim() || id.length > 128) throw Error("Exact bounded Architect Workflow ID is required.");
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical);
    if (!projectId) throw Error("Selected Project is not registered.");
    const store = createSQLiteProjectStateStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {
      const workflow = await store.getEntity(projectId, id);
      if (!workflow || workflow.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowState !== "active" || workflow.body.workflowType !== "project-creation") throw Error("Exact active Project Creation Workflow is required.");
      return await work(store, projectId, workflow);
    } finally { store.close(); }
  }
  const get = (root: string, workflowId: string) => withWorkflow(root, workflowId, async (store, projectId, workflow): Promise<StructuredArchitectWorkspaceModel> => {
    const state = createProjectStateService(store, intakeOperator), intake = await currentIntake(store, projectId, workflow);
    if (!intake || (await state.getWorkflowIntakeDisposition(projectId, intake.id)).state !== "approved") return {workflowId, ready: false, railStatus: "Not Ready", reason: "Approve current SQL Intake before Architect Interview."};
    const model: StructuredArchitectWorkspaceModel = {workflowId, ready: true, railStatus: "Open", intakeId: intake.id, intakeVersion: intake.recordVersion,
      handoff: ["Architect Interview — typed structured output", `Workflow ${workflowId}; approved Intake ${intake.id}@${intake.recordVersion}`,
        "Use the approved Intake below. Return only a JSON object whose exact keys each contain 1–32 nonempty text items (maximum 200 total items and 100 KB). Proposed decisions are recommendations, never Operator Decisions.",
        JSON.stringify(Object.fromEntries(Object.keys(GREENFIELD_ARCHITECT_SECTIONS).map(key => [key, ["Replace with substantive direction or an explicit unresolved item."]]))),
        "Inspect materially relevant repository evidence before questions or recommendations. Distinguish verified implementation, approved architecture, historical evidence, and unresolved assumptions. Preserve governing architecture unless the Operator explicitly revises it. Cover both architecture boundaries and consuming product capabilities.",
        "Project ground zero is the selected repository plus the local development machine. Distinguish verified installed, verified missing and unverified capabilities, repository bootstrap mechanisms and explicitly externally managed capabilities. Missing required capabilities are Project work unless approved evidence establishes external ownership.",
        "Approved SQL Intake:", JSON.stringify(intake.body.values, null, 2),
        "Approved Project architecture:", JSON.stringify(selectProjectArchitectureContext(projectId, await store.listEntities(projectId), await store.listRelationships(projectId))),
        "Exact SourceBaseline evidence:", JSON.stringify((await store.listEntities(projectId, "SourceBaseline")).filter(record => record.entityType === "SourceBaseline" && record.body.workflowId === workflowId && record.lifecycleState === "active"))].join("\n\n")};
    const cycle = await state.getCurrentArchitectReviewCycle(projectId, workflowId, "project-interview");
    if (cycle) {
      model.cycleVersion = cycle.recordVersion;
      try {
        const review = await state.getArchitectReviewProjection(projectId, cycle.id);
        model.review = review; model.reviewDocument = architectReviewDocument(review);
        model.railStatus = review.disposition.state === "approved" ? "Completed" : "Awaiting Approval";
        try { writeArchitectReviewProjection(root, review); } catch (error) { model.materializationError = `SQL is authoritative; projection write failed: ${error instanceof Error ? error.message : String(error)}`; }
      } catch (error) { model.reason = `Fresh Architect output required: ${error instanceof Error ? error.message : String(error)}`; }
    }
    return model;
  });
  const save = async (root: string, workflowId: string, input: {intakeId: string; intakeVersion: number; expectedCycleVersion?: number; output: GreenfieldArchitectOutput}) => {
    await withWorkflow(root, workflowId, async (store, projectId) => {
      await createProjectStateService(store, intakeOperator).saveGreenfieldArchitectOutput(projectId, {...input, workflowId});
    });
    return get(root, workflowId);
  };
  const prepare = async (root: string, workflowId: string) => {
    const model = await get(root, workflowId);
    if (!model.ready) throw Error(model.reason ?? "Approve current Intake before Architect preparation.");
    await withWorkflow(root, workflowId, async (store, projectId, workflow) => {
      if (workflow.body.currentWorkspace !== "architect-interview") await createProjectStateService(store, intakeOperator).reviseRecord(projectId, workflowId, {currentWorkspace: "architect-interview"}, workflow.recordVersion);
    });
    return get(root, workflowId);
  };
  const review = async (root: string, workflowId: string, cycleId: string, input: ArchitectReviewDecisionInput) => {
    await withWorkflow(root, workflowId, async (store, projectId) => {
      const state = createProjectStateService(store, intakeOperator), cycle = await state.getCurrentArchitectReviewCycle(projectId, workflowId, "project-interview");
      if (cycle?.id !== cycleId) throw Error("Exact current Workflow review cycle is required.");
      await state.recordArchitectReview(projectId, cycleId, input);
    });
    return get(root, workflowId);
  };
  return {get, prepare, save, review};
}
