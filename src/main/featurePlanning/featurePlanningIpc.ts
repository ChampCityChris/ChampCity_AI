import type { FeatureIntakeInput } from "../../shared/featurePlanningContracts";
import { createFeaturePlanningService } from "./featurePlanningService";

export function registerFeaturePlanningIpc(registry: { handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void }, getCurrentProjectRoot: () => string, copyText: (text: string) => void, service = createFeaturePlanningService()): void {
  const exactId = (args: unknown[]) => { if (args.length !== 1 || typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128) throw Error("Exact Feature Workflow ID is required."); return args[0]; };
  registry.handle("featurePlanning:get", (_e, ...args) => service.get(getCurrentProjectRoot(), exactId(args)));
  registry.handle("featurePlanning:saveIntake", (_e, ...args) => { const id = exactId(args); if (!args[1] || typeof args[1] !== "object" || Array.isArray(args[1])) throw Error("Feature Intake fields are required."); return service.saveIntake(getCurrentProjectRoot(), id, args[1] as FeatureIntakeInput); });
  registry.handle("featurePlanning:prepare", (_e, ...args) => { const id = exactId(args); if (args[1] !== "assessment" && args[1] !== "plan") throw Error("Feature planning stage is invalid."); return service.prepare(getCurrentProjectRoot(), id, args[1]); });
  registry.handle("featurePlanning:act", (_e, ...args) => { const id = exactId(args); if (!args[1] || typeof args[1] !== "object" || Array.isArray(args[1])) throw Error("Feature planning action is required."); return service.act(getCurrentProjectRoot(), id, args[1] as any); });
  registry.handle("featurePlanning:copy", (_e, ...args) => { const id = exactId(args); return service.get(getCurrentProjectRoot(), id).then(model => { if (!model.draft?.instruction) throw Error("Prepare the Architect handoff first."); copyText(model.draft.instruction); return { copied: true }; }); });
}
