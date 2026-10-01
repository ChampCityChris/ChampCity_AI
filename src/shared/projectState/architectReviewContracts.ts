import type { ArchitectStageKind, EntityId, ProjectStateEntity, ProjectStateRecord } from "./domainContracts";
import type { WorkflowType } from "./workflowTypeRegistry";
import type { EffectiveDisposition } from "./projectStateService";

export const ARCHITECT_STAGE_BY_WORKFLOW: Partial<Record<WorkflowType, ArchitectStageKind>> = {
  "project-creation": "project-interview", "feature-capability": "feature-assessment", "issue-resolution": "issue-rca",
  "refactor-migration": "migration-assessment", "integration-composition": "integration-assessment",
  "infrastructure-platform": "infrastructure-assessment", "research-prototype": "research-assessment",
};
export interface ArchitectReviewSaveInput { workflowId: EntityId; stageKind: ArchitectStageKind; memberIds: EntityId[]; expectedRecordVersion?: number }
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
  const ordered = [...members].sort((a, b) => a.entityType.localeCompare(b.entityType) || a.id.localeCompare(b.id));
  const filename = `ARCHITECT_REVIEW_${cycle.id}.md`;
  const sources = ordered.map(member => ({entityId: member.id, recordVersion: member.recordVersion}));
  const markdown = `<!-- GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE: ARCHITECT REVIEW -->\n<!-- Cycle ${cycle.id}@${cycle.recordVersion}; Workflow ${cycle.body.workflowId}; Sources ${sources.map(s => `${s.entityId}@${s.recordVersion}`).join(", ")} -->\n# ${cycle.body.stageKind}\n\n` + ordered.map(member => `## ${member.entityType} ${member.id}\n\n` + Object.entries(member.body).map(([key, value]) => `**${key}**: ${Array.isArray(value) ? value.join("; ") : typeof value === "object" ? JSON.stringify(value) : String(value)}`).join("\n\n")).join("\n\n");
  return {workflowId: cycle.body.workflowId, workflowType: cycle.body.workflowType, cycleId: cycle.id, recordVersion: cycle.recordVersion,
    stageKind: cycle.body.stageKind, disposition, markdown, filename, relativePath: `planning/architect-reviews/${filename}`, sources};
}
