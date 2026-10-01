import type { ArchitectReviewProjection } from "./projectState/architectReviewContracts";
import type { PlanningDocumentDetail } from "./documents/planningDocument";

export const GREENFIELD_ARCHITECT_SECTIONS = {
  projectUnderstanding: "Project Understanding", usersAndPrimaryWorkflows: "Users and Primary Workflows",
  scope: "Scope", nonScope: "Non-Scope", constraints: "Constraints", keyDecisions: "Key Decisions",
  architectRecommendations: "Architect Recommendations", dataAndIntegrationRequirements: "Data and Integration Requirements",
  securityComplianceOperational: "Security, Compliance, and Operational Considerations", risksAndDependencies: "Risks and Dependencies",
  assumptions: "Assumptions", deferredDecisions: "Deferred Decisions", unresolvedQuestions: "Unresolved Questions",
  acceptanceDirection: "Acceptance Direction", projectPlanningDirection: "Project Planning Direction",
} as const;
export type GreenfieldArchitectOutput = { [K in keyof typeof GREENFIELD_ARCHITECT_SECTIONS]: string[] };
export function validateGreenfieldArchitectOutput(value: unknown): asserts value is GreenfieldArchitectOutput {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).sort().join("|") !== Object.keys(GREENFIELD_ARCHITECT_SECTIONS).sort().join("|")) throw Error("Exact fifteen-section Architect output is required.");
  let size = 0;
  let count = 0;
  for (const entries of Object.values(value)) {
    if (!Array.isArray(entries) || !entries.length || entries.length > 32 || entries.some(entry => typeof entry !== "string" || !entry.trim() || new TextEncoder().encode(entry).length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(entry)))
      throw Error("Each Architect section requires 1–32 bounded text items.");
    size += new TextEncoder().encode(JSON.stringify(entries)).length;
    count += entries.length;
  }
  if (size > 100_000 || count > 200) throw Error("Architect output exceeds the bounded transport limit.");
  if (new TextEncoder().encode((value as GreenfieldArchitectOutput).projectPlanningDirection.join("\n")).length > 4096) throw Error("Project Planning direction must fit the bounded solution objective.");
}
export interface StructuredArchitectWorkspaceModel {
  workflowId: string;
  ready: boolean;
  reason?: string;
  intakeId?: string;
  intakeVersion?: number;
  cycleVersion?: number;
  handoff?: string;
  review?: ArchitectReviewProjection;
  reviewDocument?: PlanningDocumentDetail;
  materializationError?: string;
  railStatus: "Not Ready" | "Open" | "Awaiting Approval" | "Completed";
}
