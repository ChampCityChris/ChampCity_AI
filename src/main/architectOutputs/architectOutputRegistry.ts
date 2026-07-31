import type {
  ArchitectOutputBundleMode,
  ArchitectOutputDefinition,
} from "../../shared/architectOutputs/architectOutputContracts";

export class ArchitectOutputRegistry {
  private readonly definitions = new Map<string, ArchitectOutputDefinition>();

  register(definition: ArchitectOutputDefinition): void {
    validateDefinition(definition);
    const key = registryKey(definition.outputKind, definition.owningWorkspaceId);
    if (this.definitions.has(key)) {
      throw new Error("Architect output definition is already registered.");
    }
    this.definitions.set(key, definition);
  }

  resolve(outputKind: string, owningWorkspaceId: string): ArchitectOutputDefinition {
    const definition = this.definitions.get(registryKey(outputKind, owningWorkspaceId));
    if (!definition) {
      throw new Error("Unknown Architect output definition.");
    }
    return definition;
  }
}

export function createArchitectOutputRegistry(
  definitions: readonly ArchitectOutputDefinition[] = [],
): ArchitectOutputRegistry {
  const registry = new ArchitectOutputRegistry();
  for (const definition of definitions) {
    registry.register(definition);
  }
  return registry;
}

function validateDefinition(definition: ArchitectOutputDefinition): void {
  requireText(definition.outputKind, "outputKind");
  requireText(definition.owningWorkspaceId, "owningWorkspaceId");
  validateBundleMode(definition.bundleMode);
  if (!Array.isArray(definition.slots) || definition.slots.length === 0) {
    throw new Error("Architect output definition requires at least one slot.");
  }
  if (definition.bundleMode === "single-output" && definition.slots.length !== 1) {
    throw new Error("Single-output Architect definitions must register exactly one slot.");
  }
  if (definition.bundleMode === "atomic-bundle" && definition.slots.length < 2) {
    throw new Error("Atomic Architect bundle definitions must register at least two slots.");
  }
  const slotIds = new Set<string>();
  for (const slot of definition.slots) {
    requireText(slot.slotId, "slotId");
    requireText(slot.displayLabel, "displayLabel");
    requireText(slot.draftPathComponent, "draftPathComponent");
    if (slotIds.has(slot.slotId)) {
      throw new Error("Architect output definition contains duplicate slot IDs.");
    }
    slotIds.add(slot.slotId);
  }
}

function registryKey(outputKind: string, owningWorkspaceId: string): string {
  return `${outputKind}\u0000${owningWorkspaceId}`;
}

function validateBundleMode(mode: ArchitectOutputBundleMode): void {
  if (mode !== "single-output" && mode !== "atomic-bundle") {
    throw new Error("Architect output definition has unsupported bundle mode.");
  }
}

function requireText(value: string, field: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Architect output definition requires ${field}.`);
  }
}
