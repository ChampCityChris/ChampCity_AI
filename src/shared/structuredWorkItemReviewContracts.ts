import type {ProjectStateRecord} from "./projectState/domainContracts";
import type {WorkItemValidationProjection} from "./workflowApplicationContracts";
export interface StructuredWorkItemReview {
  workflowId: string;
  workItem: ProjectStateRecord<"WorkItem">;
  implementations: ProjectStateRecord<"ImplementationRecord">[];
  testers: ProjectStateRecord<"TesterResult">[];
  validations: ProjectStateRecord<"Validation">[];
  evidence: ProjectStateRecord<"Evidence">[];
  decisions: ProjectStateRecord<"Decision">[];
  checkpoints: ProjectStateRecord<"SourceCheckpoint">[];
  repairs: Array<{repairId: string; parentId: string}>;
  validation: WorkItemValidationProjection;
  cycle?: {cycle: ProjectStateRecord<"WorkItemValidationCycle">; current: boolean; disposition: import("./projectState/projectStateService").EffectiveDisposition} | null;
  handoff?: string;
  advisoryMarkdown?: string;
  markdown: string;
}

export interface WorkItemReviewAdvisory {
  advisorySummary: string;
  advisoryBlockingFindings: string[];
  advisoryRecommendation: "ValidatePassed" | "RequestRepair" | "Inconclusive";
  advisoryRepairDefectText?: string;
}
export interface WorkItemReviewDecisionInput {
  cycleId: string;
  expectedRecordVersion: number;
  outcome: "ValidatePassed" | "RequestRepair";
  operatorNotes?: string;
  repairDefectText?: string;
}
