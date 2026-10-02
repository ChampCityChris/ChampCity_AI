import type {EntityId} from "./projectState/domainContracts";
export type CloseAdvanceScope = "work-item" | "phase" | "workflow";
export interface CloseAdvanceProjection {
  workflowId: EntityId; entityId: EntityId; expectedVersion: number; scope: CloseAdvanceScope;
  label: string; closed: boolean; advanceReady?: boolean; eligible: boolean; blockers: string[];
  sourceMode: "source-neutral" | "source-backed"; next: {workspaceId: string; entityId?: EntityId; label: string};
  criteria: {id: EntityId; recordVersion: number; statement: string; policy: string; satisfied: boolean}[];
}
export interface CloseAdvanceRequest {workflowId: EntityId; entityId: EntityId; scope: CloseAdvanceScope; expectedVersion: number; outcome: "Close" | "DoNotClose"; rationale: string}
