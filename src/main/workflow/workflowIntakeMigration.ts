import { validateWorkflowIntakePayload, WORKFLOW_INTAKE_DEFINITIONS, type WorkflowIntakePayload } from "../../shared/workflowIntakeContracts";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { ProjectStateStore } from "../../shared/projectState/projectStateStore";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import { isCanonicalProjectIntakePath } from "../../shared/projectIntake/projectIntakeCorpus";
import { listPlanningDocuments } from "../documents/planningDocumentService";

export const intakeOperator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const featureTitles = ["Requested Capability Delta", "Current Product Baseline", "Scope In", "Scope Out", "Constraints", "Behavior and Contracts to Preserve", "Affected Architecture and Integration Points", "Evidence and Regression Boundary", "Compatibility and Rollout"];
const issueTitles = ["Issue title", "Observed behavior", "Expected behavior", "Reproduction steps", "Environment", "Known impact", "Constraints"];
export type IntakeMigrationPreview = { status: "ready"; payload: WorkflowIntakePayload; sourceRef: string; review?: { outcome: "approved" | "revision_requested" | "rejected"; notes: string; legacyReviewedAt?: string } } | { status: "not-needed"; reason: string } | { status: "blocked"; reason: string };

export async function currentIntake(store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">) {
  const edges = (await store.listRelationships(projectId, "intake_for")).filter(e => !e.endedAt && e.toEntityId === workflow.id);
  const records = (await store.listEntities(projectId, "WorkflowIntake")).filter((r): r is ProjectStateRecord<"WorkflowIntake"> => r.entityType === "WorkflowIntake" && r.lifecycleState === "active" && (r.body.workflowId === workflow.id || edges.some(e => e.fromEntityId === r.id)));
  if (records.length > 1) throw Error("Migration blocked: ambiguous active WorkflowIntake records.");
  const record = records[0];
  if (record) {
    if (record.body.workflowType !== workflow.body.workflowType) throw Error("Migration blocked: structured Intake type mismatch.");
    validateWorkflowIntakePayload({workflowType: record.body.workflowType, values: record.body.values});
    await createProjectStateService(store, intakeOperator).getWorkflowIntakeDisposition(projectId, record.id);
  }
  return record ?? null;
}

export async function previewIntakeMigration(root: string, store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">): Promise<IntakeMigrationPreview> {
  try {
    if (await currentIntake(store, projectId, workflow)) return { status: "not-needed", reason: "Validated structured Intake already exists." };
    const type = workflow.body.workflowType;
    const fields = WORKFLOW_INTAKE_DEFINITIONS[type as keyof typeof WORKFLOW_INTAKE_DEFINITIONS]?.fields;
    if (!fields) throw Error("Unsupported Intake Workflow type.");
    let values: Record<string, string | boolean> = {}, sourceRef: string, review: Extract<IntakeMigrationPreview, {status: "ready"}>["review"];
    if (type === "project-creation") {
      const owners = (await store.listEntities(projectId, "Workflow")).filter(r => r.entityType === "Workflow" && r.lifecycleState === "active" && r.body.workflowType === type && r.body.workflowState === "active");
      if (owners.length !== 1 || owners[0].id !== workflow.id) throw Error("Ambiguous current Project Creation Workflow identity.");
      // Newly registered Projects can have pre-registration Markdown without SQL IDs.
      // Its only safe association is the unique current Project Creation Workflow.
      const documents = listPlanningDocuments(root).filter(d => (d.metadata.artifactType === "project-intake" || isCanonicalProjectIntakePath(d.markdownPath)) && d.metadata.participationRole !== "historical" && !d.markdownPath.toLowerCase().startsWith("planning/archive/"));
      if (!documents.length) return {status: "not-needed", reason: "No legacy Intake data."};
      if (documents.length !== 1) throw Error("Ambiguous canonical Greenfield Intake documents.");
      const doc = documents[0], canonical = doc.metadata.canonical;
      if (!canonical || doc.readError || doc.documentReadState !== "readable") throw Error("Unreadable canonical Greenfield Intake.");
      if (doc.metadata.artifactType !== "project-intake") throw Error("Conflicting canonical Greenfield Intake artifact type.");
      const identity = canonical.identity;
      if (typeof identity["Project.ArtifactKey"] !== "string" || !identity["Project.ArtifactKey"].trim()) throw Error("Missing canonical Greenfield Intake identity.");
      for (const slug of [identity.projectSlug, canonical.workflowData.projectSlug]) if (slug !== undefined && slug !== identity["Project.ArtifactKey"]) throw Error("Conflicting canonical Greenfield artifact identity.");
      for (const key of ["workflowId", "Workflow.Id"]) if (identity[key] !== undefined && identity[key] !== workflow.id) throw Error("Conflicting canonical Intake Workflow identity.");
      for (const key of ["projectId", "Project.Id"]) if (identity[key] !== undefined && identity[key] !== projectId) throw Error("Conflicting canonical Intake Project identity.");
      values = Object.fromEntries(fields.filter(f => canonical.workflowData[f.key] !== undefined).map(f => [f.key, canonical.workflowData[f.key]])) as typeof values;
      sourceRef = doc.markdownPath;
      const disposition = canonical.documentDisposition;
      const outcome = {Pending: undefined, Approved: "approved", RevisionRequested: "revision_requested", Rejected: "rejected"}[disposition.status];
      if (outcome) {
        if (outcome === "revision_requested" && !disposition.notes?.trim()) throw Error("Legacy RevisionRequested review has no notes.");
        if (disposition.reviewedAt && !Number.isFinite(Date.parse(disposition.reviewedAt))) throw Error("Invalid legacy review timestamp.");
        review = {outcome: outcome as NonNullable<typeof review>["outcome"], notes: disposition.notes ?? "", ...(disposition.reviewedAt ? {legacyReviewedAt: new Date(disposition.reviewedAt).toISOString()} : {})};
      }
    } else {
      const links = await store.listRelationships(projectId, "workflow_member");
      const category = type === "feature-capability" ? "feature-intake" : type === "issue-resolution" ? "issue-intake" : `workflow-intake:${type}:`;
      const records = (await store.listEntities(projectId, "Finding")).filter((r): r is ProjectStateRecord<"Finding"> => r.entityType === "Finding" && r.lifecycleState === "active" && (category.endsWith(":") ? r.body.category.startsWith(category) : r.body.category === category) && links.some(e => !e.endedAt && e.fromEntityId === r.id && e.toEntityId === workflow.id));
      if (!records.length) return {status: "not-needed", reason: "No legacy Intake data."};
      for (const record of records) if (links.filter(e => !e.endedAt && e.fromEntityId === record.id).length !== 1) throw Error("Conflicting legacy Intake Finding ownership.");
      const consumed = new Set<string>();
      for (const [index, field] of fields.entries()) {
        const title = type === "feature-capability" ? featureTitles[index] : issueTitles[index];
        const matches = records.filter(r => category.endsWith(":") ? r.body.category === category + field.key : r.body.title === title);
        if (matches.length > 1) throw Error(`Duplicate legacy Intake field: ${field.key}.`);
        const record = matches[0]; if (!record) continue;
        consumed.add(record.id);
        if (record.body.findingState === "current") values[field.key] = record.body.statement;
        else if (record.body.findingState !== "omitted" || field.required) throw Error(`Invalid legacy Intake field state: ${field.key}.`);
      }
      if (consumed.size !== records.length) throw Error("Unknown legacy Intake field sources.");
      sourceRef = `findings:${records.map(r => r.id).sort().join(",")}`;
    }
    values = Object.fromEntries(Object.entries(values).filter(([, value]) => typeof value !== "string" || value.trim()).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    const payload = {workflowType: type, values}; validateWorkflowIntakePayload(payload);
    if (review && new TextEncoder().encode(review.notes).length > 4096) throw Error("Legacy Intake review notes exceed their bounds.");
    return {status: "ready", payload, sourceRef, ...(review ? {review} : {})};
  } catch (error) { return {status: "blocked", reason: error instanceof Error ? error.message : String(error)}; }
}

export async function ensureIntake(root: string, store: ProjectStateStore, projectId: string, workflow: ProjectStateRecord<"Workflow">) {
  // Serialize preview and import together, including the exact-version legacy review.
  return store.transaction(projectId, async unit => {
    const scoped = Object.assign(Object.create(store), unit, { transaction: async <T>(_id: string, work: (u: typeof unit) => Promise<T>) => work(unit) }) as ProjectStateStore;
    const current = await currentIntake(scoped, projectId, workflow); if (current) return current;
    const preview = await previewIntakeMigration(root, scoped, projectId, workflow);
    if (preview.status === "blocked") throw Error(`Migration blocked: ${preview.reason}`);
    if (preview.status === "not-needed") return null;
    const state = createProjectStateService(scoped, intakeOperator);
    const record = await state.saveWorkflowIntake(projectId, {workflowId: workflow.id, workflowType: preview.payload.workflowType, values: {...preview.payload.values}, legacySourceRef: preview.sourceRef});
    if (preview.review) await state.recordWorkflowIntakeDecision(projectId, record.id, {expectedIntakeRecordVersion: record.recordVersion, ...preview.review});
    return record;
  });
}
