import type { WorkflowPlanningGraph } from "./projectState/projectStateService";
import type { ProjectStateRecord } from "./projectState/domainContracts";
import type { WorkflowInstanceSummary } from "./workflowApplicationContracts";

export interface FeatureIntakeInput {
  requestedCapability: string; baseline: string; scopeIn: string; scopeOut: string; constraints: string;
  preservation: string; affectedSurfaces: string; evidence: string; compatibilityRollout: string;
}
export interface FeaturePlanningProjection {
  workflow: WorkflowInstanceSummary;
  project: { projectId: string; name: string };
  source: { baselineId: string; revisionId: string; bindingPrepared: boolean } | null;
  provenance: "direct" | "routed";
  intake: FeatureIntakeInput | null;
  findings: ProjectStateRecord<"Finding">[];
  acceptedArchitecture: Array<ProjectStateRecord<"Decision"> | ProjectStateRecord<"BoundedSolution">>;
  assessmentState: "not-reviewed" | "accepted" | "revision-requested" | "rejected";
  acceptedPlan: unknown | null;
  stage: "intake" | "assessment" | "plan" | "work-item-map";
  draft: { stage: "assessment" | "plan"; instruction: string; content: string } | null;
}
export type FeaturePlanningAction = { type: "prepare"; stage: "assessment" | "plan" } | { type: "save-intake"; intake: FeatureIntakeInput } |
  { type: "save-draft"; content: string } | { type: "copy" } | { type: "decide"; stage: "assessment" | "plan"; outcome: "accept" | "revision" | "reject"; rationale: string; graph?: WorkflowPlanningGraph };
