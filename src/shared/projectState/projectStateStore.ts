import type { EntityId, EntityType, PrincipalRef, ProjectId, ProjectStateEntity, ProjectStateRecord } from "./domainContracts";
import type { ProjectStateRelationship, RelationshipType } from "./relationshipRegistry";

export interface StateChange {
  id: string;
  projectId: ProjectId;
  entityId: EntityId;
  fromRecordVersion: number | null;
  toRecordVersion: number;
  operation: "create" | "revise" | "supersede" | "relationship-create" | "relationship-end";
  principal: PrincipalRef;
  occurredAt: string;
  changedFields: string[];
  reason: string;
  causationId?: string;
  correlationId?: string;
}

export interface ProjectStateOutboxEvent {
  id: string;
  projectId: ProjectId;
  sequence: number;
  eventType: string;
  entityId?: EntityId;
  occurredAt: string;
  payload: Record<string, string | number | boolean | null>;
}

export interface StateProviderGeneration {
  projectId: ProjectId;
  generation: number;
  authority: "legacy" | "structured";
  updatedAt: string;
}

export interface ProjectStateReadPort {
  getProject(projectId: ProjectId): Promise<ProjectStateRecord<"Project"> | null>;
  getEntity(projectId: ProjectId, entityId: EntityId): Promise<ProjectStateEntity | null>;
  getEntityVersion(projectId: ProjectId, entityId: EntityId, version: number): Promise<ProjectStateEntity | null>;
  listEntities(projectId: ProjectId, type?: EntityType): Promise<ProjectStateEntity[]>;
  listRelationships(projectId: ProjectId, type?: RelationshipType): Promise<ProjectStateRelationship[]>;
  listStateChanges(projectId: ProjectId): Promise<StateChange[]>;
  listOutbox(projectId: ProjectId, afterSequence?: number): Promise<ProjectStateOutboxEvent[]>;
  getProviderGeneration(projectId: ProjectId): Promise<StateProviderGeneration | null>;
}

/** A unit of work exists only inside a serialized transaction for one Project. */
export interface ProjectStateUnitOfWork extends ProjectStateReadPort {
  saveEntity(entity: ProjectStateEntity, expectedVersion: number | null, policy?: { evidenceReliedUpon?: boolean; terminalSupersession?: boolean }): Promise<void>;
  saveRelationship(relationship: ProjectStateRelationship): Promise<void>;
  endRelationship(relationshipId: string, endedAt: string): Promise<void>;
  appendStateChange(change: StateChange): Promise<void>;
  appendOutbox(event: Omit<ProjectStateOutboxEvent, "sequence">): Promise<ProjectStateOutboxEvent>;
  advanceProviderGeneration(next: StateProviderGeneration, expectedGeneration: number | null): Promise<void>;
}

export interface ProjectStateStore extends ProjectStateReadPort {
  transaction<T>(projectId: ProjectId, work: (unit: ProjectStateUnitOfWork) => Promise<T>): Promise<T>;
}

export class ProjectStateStoreError extends Error {
  constructor(readonly code: "STALE_STATE" | "PROJECT_MISMATCH" | "ENTITY_NOT_FOUND" | "DUPLICATE_ID" | "INVALID_STATE" | "STORE_BUSY" | "STORE_CORRUPT" | "PERSISTENCE_FAILURE", message: string) {
    super(message);
    this.name = "ProjectStateStoreError";
  }
}
