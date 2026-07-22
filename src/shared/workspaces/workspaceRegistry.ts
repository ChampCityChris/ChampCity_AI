import type { LifecycleLocation } from "../lifecycle/nestedLifecycle";
import { sameLifecycleLocation } from "../lifecycle/nestedLifecycle";

export type WorkspaceId = string;
export type WorkspaceLabel = string;

export interface WorkspaceDefinition {
  id: WorkspaceId;
  label: WorkspaceLabel;
  location: LifecycleLocation;
  order: number;
}

export function createWorkspaceRegistry(
  definitions: readonly WorkspaceDefinition[],
): readonly WorkspaceDefinition[] {
  const seenIds = new Set<WorkspaceId>();

  for (const definition of definitions) {
    if (seenIds.has(definition.id)) {
      throw new Error(`Duplicate workspace ID: ${definition.id}`);
    }
    seenIds.add(definition.id);
  }

  return Object.freeze(
    [...definitions]
      .map((definition) =>
        Object.freeze({
          ...definition,
          location: Object.freeze({ ...definition.location }),
        }),
      ),
  );
}

export function getWorkspaceById(
  registry: readonly WorkspaceDefinition[],
  id: WorkspaceId,
): WorkspaceDefinition | undefined {
  return registry.find((definition) => definition.id === id);
}

export function getWorkspacesForLocation(
  registry: readonly WorkspaceDefinition[],
  location: LifecycleLocation,
): readonly WorkspaceDefinition[] {
  return registry
    .filter((definition) => sameLifecycleLocation(definition.location, location))
    .sort(compareWorkspaceDefinitions);
}

export function compareWorkspaceDefinitions(
  left: WorkspaceDefinition,
  right: WorkspaceDefinition,
): number {
  return (
    compareLocation(left.location, right.location) ||
    compareNumber(left.order, right.order) ||
    left.id.localeCompare(right.id, "en", { sensitivity: "base" })
  );
}

function compareLocation(left: LifecycleLocation, right: LifecycleLocation): number {
  return (
    left.level.localeCompare(right.level, "en", { sensitivity: "base" }) ||
    left.stage.localeCompare(right.stage, "en", { sensitivity: "base" })
  );
}

function compareNumber(left: number, right: number): number {
  return left === right ? 0 : left < right ? -1 : 1;
}
