import type { ProjectStateEntity } from "./domainContracts";
import { ENTITY_TYPE_REGISTRY, ProjectStateDomainError, validateProjectStateEntity } from "./entityTypeRegistry";

export class StateInvariantError extends ProjectStateDomainError {
  override readonly code: string = "STATE_INVARIANT_VIOLATION";
  constructor(message: string) { super(message); this.name = "StateInvariantError"; }
}

function fail(message: string): never { throw new StateInvariantError(message); }

const lifecycleTransitions: Readonly<Record<string, readonly string[]>> = {
  active: ["active", "closed", "archived", "superseded", "voided"],
  closed: ["closed", "archived", "superseded"],
  archived: ["archived"],
  superseded: ["superseded"],
  voided: ["voided"],
};

/** Store/service transactions call this before appending a new immutable version. */
export function assertRevision(previous: ProjectStateEntity, next: ProjectStateEntity, options: { evidenceReliedUpon?: boolean; terminalSupersession?: boolean } = {}): void {
  validateProjectStateEntity(previous);
  validateProjectStateEntity(next);
  if (previous.id !== next.id || previous.projectId !== next.projectId || previous.entityType !== next.entityType || previous.lineageId !== next.lineageId) fail("A revision must retain entity, Project, type and lineage identity.");
  if (next.recordVersion !== previous.recordVersion + 1) fail("A revision must advance exactly one version.");
  if (next.createdAt !== previous.createdAt || JSON.stringify(next.createdBy) !== JSON.stringify(previous.createdBy)) fail("A revision cannot rewrite creation provenance.");
  if (next.updatedAt < previous.updatedAt) fail("A revision cannot move time backward.");
  if (!lifecycleTransitions[previous.lifecycleState]?.includes(next.lifecycleState)) fail("Invalid lifecycle transition.");
  if (previous.dispositionState !== next.dispositionState) fail("Disposition is derived from effective Decisions.");
  if (ENTITY_TYPE_REGISTRY[previous.entityType].immutableAfterCreation || (previous.entityType === "Evidence" && options.evidenceReliedUpon)) {
    if (!options.terminalSupersession || next.lifecycleState !== "superseded" || JSON.stringify(next.body) !== JSON.stringify(previous.body)) fail("Immutable record cannot be revised.");
  }
}

/** A semantic replacement has a new identity and begins a new version chain. */
export function assertSupersession(predecessor: ProjectStateEntity, terminalPredecessor: ProjectStateEntity, successor: ProjectStateEntity): void {
  assertRevision(predecessor, terminalPredecessor, { evidenceReliedUpon: true, terminalSupersession: true });
  validateProjectStateEntity(successor);
  if (terminalPredecessor.lifecycleState !== "superseded" || !terminalPredecessor.supersededAt) fail("The predecessor must be retained as superseded.");
  if (successor.id === predecessor.id || successor.projectId !== predecessor.projectId || successor.entityType !== predecessor.entityType || successor.lineageId !== predecessor.lineageId || successor.recordVersion !== 1) fail("The successor needs a new identity, version one and shared type, Project and lineage.");
  if (successor.lifecycleState !== "active") fail("A new semantic successor must be active.");
}

export function assertNoHardDelete(): never { return fail("Canonical Project State cannot be hard-deleted."); }
