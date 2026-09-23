import type { EntityId, EntityType, ProjectId, ProjectStateEntity, ProjectStateRecord } from "./domainContracts";
import { assertRevision } from "./domainInvariants";
import { validateProjectStateEntity } from "./entityTypeRegistry";
import type { ProjectStateRelationship, RelationshipType } from "./relationshipRegistry";
import { assertRelationshipEnd, validateRelationship } from "./relationshipRegistry";
import type { ProjectStateOutboxEvent, ProjectStateReadPort, ProjectStateStore, ProjectStateUnitOfWork, StateChange, StateProviderGeneration } from "./projectStateStore";
import { ProjectStateStoreError } from "./projectStateStore";

interface VersionChain { current: ProjectStateEntity; versions: Map<number, ProjectStateEntity> }
interface MemoryState {
  entities: Map<EntityId, VersionChain>;
  relationships: Map<string, ProjectStateRelationship>;
  changes: Map<string, StateChange>;
  outbox: Map<string, ProjectStateOutboxEvent>;
  generations: Map<ProjectId, StateProviderGeneration>;
}

function initialState(): MemoryState { return { entities: new Map(), relationships: new Map(), changes: new Map(), outbox: new Map(), generations: new Map() }; }
const copy = <T>(value: T): T => structuredClone(value);
function mismatch(): never { throw new ProjectStateStoreError("PROJECT_MISMATCH", "Record belongs to a different Project."); }
function stale(): never { throw new ProjectStateStoreError("STALE_STATE", "Expected Project State version or generation is stale."); }

function readPort(state: () => MemoryState, assertOpen: () => void = () => {}): ProjectStateReadPort {
  return {
    async getProject(projectId) {
      assertOpen();
      const entity = state().entities.get(projectId)?.current;
      return entity?.entityType === "Project" ? copy(entity as ProjectStateRecord<"Project">) : null;
    },
    async getEntity(projectId, entityId) {
      assertOpen();
      const entity = state().entities.get(entityId)?.current;
      return entity?.projectId === projectId ? copy(entity) : null;
    },
    async getEntityVersion(projectId, entityId, version) {
      assertOpen();
      const entity = state().entities.get(entityId)?.versions.get(version);
      return entity?.projectId === projectId ? copy(entity) : null;
    },
    async listEntities(projectId, type?: EntityType) {
      assertOpen();
      return [...state().entities.values()].map(chain => chain.current).filter(entity => entity.projectId === projectId && (!type || entity.entityType === type)).sort((a, b) => a.id.localeCompare(b.id)).map(copy);
    },
    async listRelationships(projectId, type?: RelationshipType) {
      assertOpen();
      return [...state().relationships.values()].filter(edge => edge.projectId === projectId && (!type || edge.relationshipType === type)).sort((a, b) => a.id.localeCompare(b.id)).map(copy);
    },
    async listStateChanges(projectId) {
      assertOpen();
      return [...state().changes.values()].filter(change => change.projectId === projectId).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id)).map(copy);
    },
    async listOutbox(projectId, afterSequence = 0) {
      assertOpen();
      return [...state().outbox.values()].filter(event => event.projectId === projectId && event.sequence > afterSequence).sort((a, b) => a.sequence - b.sequence).map(copy);
    },
    async getProviderGeneration(projectId) { assertOpen(); return copy(state().generations.get(projectId) ?? null); },
  };
}

/** Conformance adapter only. It is not a durable or production authority. */
export function createInMemoryProjectStateStore(): ProjectStateStore {
  let committed = initialState();
  let writerTail: Promise<void> = Promise.resolve();
  return {
    ...readPort(() => committed),
    async transaction<T>(projectId: ProjectId, work: (unit: ProjectStateUnitOfWork) => Promise<T>): Promise<T> {
      let release!: () => void;
      const prior = writerTail;
      writerTail = new Promise<void>(resolve => { release = resolve; });
      await prior;
      const draft = copy(committed);
      let open = true;
      const assertOpen = () => { if (!open) throw new ProjectStateStoreError("INVALID_STATE", "Unit of work is closed."); };
      const unit: ProjectStateUnitOfWork = {
        ...readPort(() => draft, assertOpen),
        async saveEntity(entity, expectedVersion, policy = {}) {
          assertOpen();
          validateProjectStateEntity(entity);
          if (entity.projectId !== projectId) mismatch();
          if (entity.entityType !== "Project" && draft.entities.get(projectId)?.current.entityType !== "Project") throw new ProjectStateStoreError("ENTITY_NOT_FOUND", "Owning Project does not exist.");
          const existing = draft.entities.get(entity.id);
          if (expectedVersion === null) {
            if (existing) stale();
            if (entity.recordVersion !== 1) stale();
            draft.entities.set(entity.id, { current: copy(entity), versions: new Map([[1, copy(entity)]]) });
            return;
          }
          if (!existing || existing.current.projectId !== projectId) stale();
          if (existing.current.recordVersion !== expectedVersion) stale();
          assertRevision(existing.current, entity, policy);
          existing.current = copy(entity);
          existing.versions.set(entity.recordVersion, copy(entity));
        },
        async saveRelationship(relationship) {
          assertOpen();
          if (relationship.projectId !== projectId) mismatch();
          if (draft.relationships.has(relationship.id)) throw new ProjectStateStoreError("DUPLICATE_ID", "Relationship identity already exists.");
          validateRelationship(relationship, id => draft.entities.get(id)?.current);
          draft.relationships.set(relationship.id, copy(relationship));
        },
        async endRelationship(relationshipId, endedAt) {
          assertOpen();
          const edge = draft.relationships.get(relationshipId);
          if (!edge || edge.projectId !== projectId) throw new ProjectStateStoreError("ENTITY_NOT_FOUND", "Relationship does not exist in this Project.");
          assertRelationshipEnd(edge, endedAt);
          if (edge.endedAt) stale();
          draft.relationships.set(relationshipId, { ...edge, endedAt });
        },
        async appendStateChange(change) {
          assertOpen();
          if (change.projectId !== projectId) mismatch();
          if (draft.changes.has(change.id)) throw new ProjectStateStoreError("DUPLICATE_ID", "State Change identity already exists.");
          draft.changes.set(change.id, copy(change));
        },
        async appendOutbox(event) {
          assertOpen();
          if (event.projectId !== projectId) mismatch();
          if (draft.outbox.has(event.id)) throw new ProjectStateStoreError("DUPLICATE_ID", "Outbox event identity already exists.");
          const sequence = [...draft.outbox.values()].filter(row => row.projectId === projectId).reduce((max, row) => Math.max(max, row.sequence), 0) + 1;
          const queued = { ...copy(event), sequence };
          draft.outbox.set(event.id, queued);
          return copy(queued);
        },
        async advanceProviderGeneration(next, expectedGeneration) {
          assertOpen();
          if (next.projectId !== projectId) mismatch();
          const current = draft.generations.get(projectId);
          if ((current?.generation ?? null) !== expectedGeneration || next.generation !== (expectedGeneration ?? 0) + 1) stale();
          draft.generations.set(projectId, copy(next));
        },
      };
      try {
        const result = await work(unit);
        committed = draft;
        return result;
      } finally {
        open = false;
        release();
      }
    },
  };
}
