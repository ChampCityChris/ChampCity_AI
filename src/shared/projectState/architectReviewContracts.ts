import type { ProjectStateRelationship } from "./relationshipRegistry";
import type { ArchitectStageKind, EntityId, ProjectStateEntity, ProjectStateRecord } from "./domainContracts";
import type { WorkflowType } from "./workflowTypeRegistry";
import type { EffectiveDisposition } from "./projectStateService";
import { GREENFIELD_ARCHITECT_SECTIONS, FEATURE_ARCHITECT_SECTIONS, ASSESSMENT_SECTIONS, type AssessmentWorkflowType } from "../architectWorkspaceContracts";

export const ARCHITECT_STAGE_BY_WORKFLOW: Partial<Record<WorkflowType, ArchitectStageKind>> = {
  "project-creation": "project-interview", "feature-capability": "feature-assessment", "issue-resolution": "issue-rca",
  "refactor-migration": "migration-assessment", "integration-composition": "integration-assessment",
  "infrastructure-platform": "infrastructure-assessment", "research-prototype": "research-assessment",
};
export interface ArchitectReviewSaveInput { workflowId: EntityId; stageKind: ArchitectStageKind; memberIds: EntityId[]; expectedRecordVersion?: number }
export const ARCHITECT_WORKSPACE_BY_WORKFLOW: Partial<Record<WorkflowType, string>> = {
  "project-creation": "architect-interview", "feature-capability": "feature-assessment", "issue-resolution": "issue-rca",
  "refactor-migration": "refactor-assessment", "integration-composition": "integration-assessment", "infrastructure-platform": "infrastructure-assessment", "research-prototype": "research-assessment",
};
export interface ArchitectReviewDecisionInput { expectedRecordVersion: number; outcome: "approved" | "revision_requested" | "rejected"; notes?: string }
export interface ArchitectReviewProjection {
  workflowId: EntityId; workflowType: WorkflowType; cycleId: EntityId; recordVersion: number; stageKind: ArchitectStageKind;
  disposition: EffectiveDisposition; markdown: string; filename: string; relativePath: string;
  sources: { entityId: EntityId; recordVersion: number }[];
}
export async function architectSemanticDigest(members: ProjectStateEntity[]): Promise<string> {
  const value = JSON.stringify(members.map(member => [member.id, member.recordVersion]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, "0")).join("");
}
export function renderArchitectReviewProjection(cycle: ProjectStateRecord<"ArchitectReviewCycle">, members: ProjectStateEntity[], disposition: EffectiveDisposition): ArchitectReviewProjection {
  const labels = cycle.body.workflowType === "feature-capability" ? Object.values(FEATURE_ARCHITECT_SECTIONS) : Object.hasOwn(ASSESSMENT_SECTIONS, cycle.body.workflowType) ? Object.values(ASSESSMENT_SECTIONS[cycle.body.workflowType as AssessmentWorkflowType]) : [];
  const rank = (record: ProjectStateEntity) => record.entityType === "Finding" && labels.includes(record.body.title as never) ? labels.indexOf(record.body.title as never) : labels.length + ["RootCause", "BoundedSolution", "Criterion", "Finding", "Evidence"].indexOf(record.entityType);
  const ordered = [...members].sort((a, b) => rank(a) - rank(b) || a.entityType.localeCompare(b.entityType) || a.id.localeCompare(b.id));
  const filename = `ARCHITECT_REVIEW_${cycle.id}.md`;
  const sources = ordered.map(member => ({entityId: member.id, recordVersion: member.recordVersion}));
  const content = cycle.body.stageKind === "project-interview" ? renderGreenfieldSections(ordered) : ordered.map(member => `## ${member.entityType} ${member.id}\n\n` + Object.entries(member.body).map(([key, value]) => `**${key}**: ${Array.isArray(value) ? value.join("; ") : typeof value === "object" ? JSON.stringify(value) : String(value)}`).join("\n\n")).join("\n\n");
  const markdown = `<!-- GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE: ARCHITECT REVIEW -->\n<!-- Cycle ${cycle.id}@${cycle.recordVersion}; Workflow ${cycle.body.workflowId}; Sources ${sources.map(s => `${s.entityId}@${s.recordVersion}`).join(", ")} -->\n# ${cycle.body.stageKind}\n\n${content}`;
  return {workflowId: cycle.body.workflowId, workflowType: cycle.body.workflowType, cycleId: cycle.id, recordVersion: cycle.recordVersion,
    stageKind: cycle.body.stageKind, disposition, markdown, filename, relativePath: `planning/architect-reviews/${filename}`, sources};
}

function renderGreenfieldSections(members: ProjectStateEntity[]): string {
  const solution = members.find((member): member is ProjectStateRecord<"BoundedSolution"> => member.entityType === "BoundedSolution");
  const values: Record<string, string[]> = {};
  if (solution) Object.assign(values, {scope: solution.body.scopeIn, nonScope: solution.body.scopeOut, constraints: solution.body.constraints,
    assumptions: solution.body.assumptions, risksAndDependencies: solution.body.risks, projectPlanningDirection: [solution.body.objective]});
  values.acceptanceDirection = members.filter((member): member is ProjectStateRecord<"Criterion"> => member.entityType === "Criterion").map(member => member.body.statement);
  for (const member of members) if (member.entityType === "Finding" && member.body.category.startsWith("architect:project-interview:")) {
    const key = member.body.category.slice("architect:project-interview:".length);
    (values[key] ??= []).push(member.body.statement);
  }
  for (const member of members) if (member.entityType === "Finding" && !member.body.category.startsWith("architect:project-interview:")) (values.projectUnderstanding ??= []).push(`${member.body.title}: ${member.body.statement}`);
  return Object.entries(GREENFIELD_ARCHITECT_SECTIONS).map(([key, title]) => `## ${title}\n\n${(values[key] ?? []).map(value => `- ${value}`).join("\n") || "Not provided."}`).join("\n\n");
}

/** Same ownership traversal for transactional review and synchronous Planning eligibility. */
export function architectMemberOwnershipIsValid(workflowId: EntityId, members: ProjectStateEntity[], records: ProjectStateEntity[], edges: ProjectStateRelationship[]): boolean {
  const byId = new Map(records.map(record => [record.id, record]));
  for (const member of members) {
    const pending = [member.id], visited = new Set<EntityId>();
    while (pending.length) {
      const id = pending.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const linked = byId.get(id);
      if (!linked || linked.entityType === "Workflow" && id !== workflowId || linked.entityType === "WorkflowIntake" && linked.body.workflowId !== workflowId || linked.entityType === "ArchitectReviewCycle" && linked.body.workflowId !== workflowId) return false;
      for (const edge of edges) {
        if (edge.fromEntityId === id && (["workflow_member", "review_member", "part_of"].includes(edge.relationshipType) || !edge.endedAt && (linked.entityType === "Evidence" && edge.relationshipType === "supports" || linked.entityType === "RootCause" && edge.relationshipType === "explains"))) pending.push(edge.toEntityId);
        if (!edge.endedAt && linked.entityType === "Criterion" && edge.toEntityId === id && edge.relationshipType === "defines_criterion") pending.push(edge.fromEntityId);
      }
    }
  }
  return true;
}
