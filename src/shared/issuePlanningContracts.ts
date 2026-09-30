import type { WorkflowExecutionPlanView, WorkflowPlanningGraph } from "./projectState/projectStateService";
import type { ProjectStateRecord } from "./projectState/domainContracts";
import type { WorkflowInstanceSummary } from "./workflowApplicationContracts";

export interface IssueIntakeInput { title: string; observed: string; expected: string; reproduction: string; environment: string; impact: string; constraints: string }
export interface IssueEvidenceInput { name: string; mediaType: string; base64: string; description: string }
export interface IssuePlanningProjection {
  project: { projectId: string; name: string }; workflow: WorkflowInstanceSummary; provenance: "direct" | "routed";
  source: { baselineId: string; revisionId: string; bindingPrepared: boolean } | null;
  intake: IssueIntakeInput | null; findings: ProjectStateRecord<"Finding">[]; evidence: ProjectStateRecord<"Evidence">[];
  acceptedArchitecture: Array<ProjectStateRecord<"Decision"> | ProjectStateRecord<"BoundedSolution">>;
  rootCauses: ProjectStateRecord<"RootCause">[]; rcaState: "not-reviewed" | "accepted" | "revision-requested" | "rejected";
  stage: "intake" | "rca" | "plan" | "work-item-map"; draft: { stage: "rca" | "plan"; instruction: string; content: string } | null; acceptedPlan: WorkflowExecutionPlanView | null;
}
export type IssuePlanningAction = { type: "save-draft"; content: string } | { type: "decide-rca"; outcome: "accept" | "revision" | "reject"; rationale: string; rootCauses?: Array<{ title: string; statement: string; rationale: string; confidence?: number; findingIds: string[]; evidenceIds: string[] }> } |
  { type: "decide-plan"; outcome: "accept" | "revision" | "reject"; rationale: string; graph?: WorkflowPlanningGraph };
