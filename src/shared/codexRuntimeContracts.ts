export interface CodexModelSelection {
  model: string;
  reasoningEffort: string;
}

export interface CodexModelCatalogEntry {
  id: string;
  model: string;
  displayName: string;
  description: string;
  supportedReasoningEfforts: string[];
  defaultReasoningEffort: string;
  isDefault: boolean;
}

export interface CodexManagedRuntimeStatus {
  version: string | null;
  updateState: "initializing" | "checking" | "current" | "updated" | "degraded" | "unavailable";
  catalog: CodexModelCatalogEntry[];
  selection: CodexModelSelection | null;
  selectionBlocker: string | null;
  message: string;
  busy: boolean;
}

export function selectionBlocker(catalog: CodexModelCatalogEntry[], selection: unknown): string | null {
  if (!selection || typeof selection !== "object") return "Choose a model and reasoning effort before running Codex Implementer.";
  const value = selection as CodexModelSelection;
  const model = catalog.find((entry) => entry.model === value.model);
  if (!model) return "The selected model is unavailable. Choose an advertised model.";
  if (!model.supportedReasoningEfforts.includes(value.reasoningEffort)) return "The selected reasoning effort is unavailable. Choose an advertised effort.";
  return null;
}

export function normalizeModelCatalog(value: unknown): CodexModelCatalogEntry[] {
  if (!Array.isArray(value)) throw new Error("Codex returned an invalid model catalog.");
  return value.filter((entry) => entry?.hidden !== true).map((entry) => {
    if (!entry || ["id", "model", "displayName", "description", "defaultReasoningEffort"].some((key) => typeof entry[key] !== "string") ||
      !entry.id || !entry.model || typeof entry.isDefault !== "boolean" || !Array.isArray(entry.supportedReasoningEfforts) ||
      entry.supportedReasoningEfforts.some((effort: { reasoningEffort?: unknown }) => !effort || typeof effort.reasoningEffort !== "string" || !effort.reasoningEffort)) {
      throw new Error("Codex returned an invalid model catalog entry.");
    }
    return { id: entry.id, model: entry.model, displayName: entry.displayName, description: entry.description,
      supportedReasoningEfforts: entry.supportedReasoningEfforts.map((effort: { reasoningEffort: string }) => effort.reasoningEffort),
      defaultReasoningEffort: entry.defaultReasoningEffort, isDefault: entry.isDefault };
  });
}
