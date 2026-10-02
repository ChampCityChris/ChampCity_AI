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
  markdown: string;
}
