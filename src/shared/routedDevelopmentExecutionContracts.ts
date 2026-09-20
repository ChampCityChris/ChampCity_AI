import type { WorkIntakeBranchBinding } from "./workIntakeBranchContracts";
import type { WorkPlanningIdentity, WorkPlanStructure } from "./workPlanningContracts";

/** V1 persistence binding, not another execution engine or product entity. */
export interface RoutedDevelopmentExecutionBinding {
  identity: WorkPlanningIdentity & { planId: string };
  relativePath: string;
  artifactRevision: number;
  planPath: string;
  planRevision: number;
  planDigest: string;
  branchBinding: WorkIntakeBranchBinding;
  structure: WorkPlanStructure;
  planBody: string;
}
