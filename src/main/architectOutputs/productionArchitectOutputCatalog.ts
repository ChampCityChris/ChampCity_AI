import type {
  ArchitectOutputBundleMode,
  ArchitectOutputDefinition,
} from "../../shared/architectOutputs/architectOutputContracts";
import { projectArchitectInterviewOutputDefinition } from "../architectInterview/architectInterviewDraftPilot";
import { phaseInterviewArchitectOutputDefinition } from "../phaseInterview/phaseInterviewDraftOutput";
import { phaseMapArchitectOutputDefinition } from "../phaseMap/phaseMapDraftOutput";
import { phasePlanningArchitectOutputDefinition } from "../phasePlanning/phasePlanningDraftBundle";
import { projectPlanningArchitectOutputDefinition } from "../projectPlanning/projectPlanningDraftBundle";
import { formalWorkCardArchitectOutputDefinition } from "../workCardPlanning/workCardPlanningService";
import { repairWorkCardArchitectOutputDefinition } from "../workCardRepair/workCardRepairService";
import { createArchitectOutputRegistry } from "./architectOutputRegistry";

type AnyProductionArchitectOutputDefinition = ArchitectOutputDefinition<any, any, any>;

export interface ProductionArchitectOutputCatalogEntry {
  outputKind: string;
  owningWorkspaceId: string;
  bundleMode: ArchitectOutputBundleMode;
  finalMarkdownOutputs: readonly string[];
  activeInWc39: boolean;
  definition?: AnyProductionArchitectOutputDefinition;
}

const activeDefinitions = [
  projectArchitectInterviewOutputDefinition,
  projectPlanningArchitectOutputDefinition,
  phaseMapArchitectOutputDefinition,
  phaseInterviewArchitectOutputDefinition,
  phasePlanningArchitectOutputDefinition,
  formalWorkCardArchitectOutputDefinition,
  repairWorkCardArchitectOutputDefinition,
] as const satisfies readonly AnyProductionArchitectOutputDefinition[];

export const productionArchitectOutputCatalog = validateCatalog([
  {
    outputKind: "project-architect-interview",
    owningWorkspaceId: "architect-interview",
    bundleMode: "single-output",
    finalMarkdownOutputs: ["Project Architect Interview"],
    activeInWc39: true,
    definition: projectArchitectInterviewOutputDefinition,
  },
  {
    outputKind: "project-planning",
    owningWorkspaceId: "project-planning-review",
    bundleMode: "atomic-bundle",
    finalMarkdownOutputs: ["Project Profile", "Project Roadmap"],
    activeInWc39: true,
    definition: projectPlanningArchitectOutputDefinition,
  },
  {
    outputKind: "phase-map",
    owningWorkspaceId: "project-phase-map",
    bundleMode: "single-output",
    finalMarkdownOutputs: ["Phase Map"],
    activeInWc39: true,
    definition: phaseMapArchitectOutputDefinition,
  },
  {
    outputKind: "phase-interview",
    owningWorkspaceId: "phase-interview",
    bundleMode: "single-output",
    finalMarkdownOutputs: ["Phase Interview"],
    activeInWc39: true,
    definition: phaseInterviewArchitectOutputDefinition,
  },
  {
    outputKind: "phase-planning-bundle",
    owningWorkspaceId: "phase-planning-bundle",
    bundleMode: "atomic-bundle",
    finalMarkdownOutputs: ["Phase Planning", "Work Card Plan"],
    activeInWc39: true,
    definition: phasePlanningArchitectOutputDefinition,
  },
  {
    outputKind: "formal-work-card",
    owningWorkspaceId: "work-card-planning",
    bundleMode: "single-output",
    finalMarkdownOutputs: ["Formal Work Card"],
    activeInWc39: true,
    definition: formalWorkCardArchitectOutputDefinition,
  },
  {
    outputKind: "repair-work-card",
    owningWorkspaceId: "work-card-repair",
    bundleMode: "single-output",
    finalMarkdownOutputs: ["Repair Work Card"],
    activeInWc39: true,
    definition: repairWorkCardArchitectOutputDefinition,
  },
] as const);

export const productionArchitectOutputRegistry = createArchitectOutputRegistry(activeDefinitions);

export function resolveProductionArchitectOutputDefinition(
  outputKind: string,
  owningWorkspaceId: string,
): AnyProductionArchitectOutputDefinition {
  return productionArchitectOutputRegistry.resolve(outputKind, owningWorkspaceId);
}

export function activeProductionArchitectOutputDefinitions(): readonly AnyProductionArchitectOutputDefinition[] {
  return [...activeDefinitions];
}

function validateCatalog<TCatalog extends readonly ProductionArchitectOutputCatalogEntry[]>(
  catalog: TCatalog,
): TCatalog {
  const outputKinds = new Set<string>();
  const owningWorkspaceIds = new Set<string>();
  const slotIds = new Set<string>();
  for (const entry of catalog) {
    rejectDuplicate(outputKinds, entry.outputKind, "Architect output kind");
    rejectDuplicate(owningWorkspaceIds, entry.owningWorkspaceId, "Architect output owning workspace");
    if (entry.activeInWc39 && !entry.definition) {
      throw new Error("Active Architect output catalog entry requires a definition.");
    }
    if (!entry.activeInWc39 && entry.definition) {
      throw new Error("Inactive Architect output catalog entry must not register a definition.");
    }
    if (!entry.definition) continue;
    if (!entry.definition.buildPreparedInstruction) {
      throw new Error("Active Architect output definition requires a prepared-instruction builder.");
    }
    if (
      entry.definition.outputKind !== entry.outputKind ||
      entry.definition.owningWorkspaceId !== entry.owningWorkspaceId ||
      entry.definition.bundleMode !== entry.bundleMode
    ) {
      throw new Error("Architect output catalog metadata does not match its active definition.");
    }
    for (const slot of entry.definition.slots) {
      rejectDuplicate(slotIds, slot.slotId, "Architect output slot ID");
    }
  }
  return catalog;
}

function rejectDuplicate(values: Set<string>, value: string, label: string): void {
  if (values.has(value)) {
    throw new Error(`${label} is duplicated in the production catalog.`);
  }
  values.add(value);
}
