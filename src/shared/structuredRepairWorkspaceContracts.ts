import type {ProjectStateRecord,ProjectStateEntity} from "./projectState/domainContracts";
import type {StructuredWorkItemReview} from "./structuredWorkItemReviewContracts";
export interface StructuredRepairWorkspace {
 workflowId:string;
 repair:ProjectStateRecord<"WorkItem">;
 parent:ProjectStateRecord<"WorkItem">;
 owner:ProjectStateRecord<"Phase">|ProjectStateRecord<"Workflow">;
 criterion:ProjectStateRecord<"Criterion">;
 failure:ProjectStateEntity;
 parentCycle:ProjectStateRecord<"WorkItemValidationCycle">|null;
 planning: {workflowId:string;workItem:ProjectStateRecord<"WorkItem">;markdown:string;handoff:string;review:{disposition:{state:string}}};
 review:StructuredWorkItemReview;
 sourceMode:"source-backed"|"source-neutral";
 markdown:string;
 handoff:string;
}
