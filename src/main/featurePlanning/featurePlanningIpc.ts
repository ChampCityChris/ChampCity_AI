import type { FeatureIntakeInput } from "../../shared/featurePlanningContracts";
import { createFeaturePlanningService } from "./featurePlanningService";

export function registerFeaturePlanningIpc(registry: { handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void }, getCurrentProjectRoot: () => string, copyText: (text: string) => void, service = createFeaturePlanningService()): void {
  const exactId = (args: unknown[]) => { if (typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128) throw Error("Exact Feature Workflow ID is required."); return args[0]; };
  const arity = (args: unknown[], count: number) => { if (args.length !== count) throw Error(`Feature planning channel requires exactly ${count} argument${count === 1 ? "" : "s"}.`); };
  const action = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw Error("Feature planning action is required.");
    const candidate = value as Record<string, unknown>;
    if (!["prepare", "save-intake", "save-draft", "copy", "decide"].includes(String(candidate.type))) throw Error("Feature planning action type is invalid.");
    if (candidate.stage !== undefined && candidate.stage !== "assessment" && candidate.stage !== "plan") throw Error("Feature planning stage is invalid.");
    if (candidate.outcome !== undefined && candidate.outcome !== "accept" && candidate.outcome !== "revision" && candidate.outcome !== "reject") throw Error("Feature planning outcome is invalid.");
    return value as Parameters<typeof service.act>[2];
  };
  registry.handle("featurePlanning:get", (_e, ...args) => { arity(args, 1); return service.get(getCurrentProjectRoot(), exactId(args)); });
  registry.handle("featurePlanning:saveIntake", (_e, ...args) => { arity(args, 2); const id = exactId(args); if (!args[1] || typeof args[1] !== "object" || Array.isArray(args[1])) throw Error("Feature Intake fields are required."); return service.saveIntake(getCurrentProjectRoot(), id, args[1] as FeatureIntakeInput); });
  registry.handle("featurePlanning:prepare", (_e, ...args) => { arity(args, 2); const id = exactId(args); if (args[1] !== "assessment" && args[1] !== "plan") throw Error("Feature planning stage is invalid."); return service.prepare(getCurrentProjectRoot(), id, args[1]); });
  registry.handle("featurePlanning:act", (_e, ...args) => { arity(args, 2); const id = exactId(args); return service.act(getCurrentProjectRoot(), id, action(args[1])); });
  registry.handle("featurePlanning:copy", (_e, ...args) => { arity(args, 1); const id = exactId(args); return service.get(getCurrentProjectRoot(), id).then(model => { if (!model.draft?.instruction) throw Error("Prepare the Architect handoff first."); copyText(model.draft.instruction); return { copied: true }; }); });
}
