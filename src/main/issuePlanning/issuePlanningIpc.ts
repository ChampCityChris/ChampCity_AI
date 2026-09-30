import type { IssueEvidenceInput, IssueIntakeInput } from "../../shared/issuePlanningContracts";
import { createIssuePlanningService } from "./issuePlanningService";

export function registerIssuePlanningIpc(registry: { handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void }, getCurrentProjectRoot: () => string, copyText: (text: string) => void, service = createIssuePlanningService()): void {
  const exact = (args: unknown[]) => { if (typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128) throw Error("Exact Issue Workflow ID is required."); return args[0]; };
  const arity = (args: unknown[], count: number) => { if (args.length !== count) throw Error(`Issue planning channel requires exactly ${count} argument${count === 1 ? "" : "s"}.`); };
  const action = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw Error("Issue planning action is required.");
    const candidate = value as Record<string, unknown>;
    if (!["save-draft", "decide-rca", "decide-plan"].includes(String(candidate.type))) throw Error("Issue planning action type is invalid.");
    if (candidate.outcome !== undefined && candidate.outcome !== "accept" && candidate.outcome !== "revision" && candidate.outcome !== "reject") throw Error("Issue planning outcome is invalid.");
    return value as Parameters<typeof service.act>[2];
  };
  registry.handle("issuePlanning:get", (_e, ...args) => { arity(args, 1); return service.get(getCurrentProjectRoot(), exact(args)); });
  registry.handle("issuePlanning:saveIntake", (_e, ...args) => { arity(args, 2); const id = exact(args); if (!args[1] || typeof args[1] !== "object" || Array.isArray(args[1])) throw Error("Issue Intake is required."); return service.saveIntake(getCurrentProjectRoot(), id, args[1] as IssueIntakeInput); });
  registry.handle("issuePlanning:addEvidence", (_e, ...args) => { arity(args, 2); const id = exact(args); if (!Array.isArray(args[1])) throw Error("Issue Evidence files are required."); return service.addEvidence(getCurrentProjectRoot(), id, args[1] as IssueEvidenceInput[]); });
  registry.handle("issuePlanning:prepare", (_e, ...args) => { arity(args, 2); const id = exact(args); if (args[1] !== "rca" && args[1] !== "plan") throw Error("Issue planning stage is invalid."); return service.prepare(getCurrentProjectRoot(), id, args[1]); });
  registry.handle("issuePlanning:act", (_e, ...args) => { arity(args, 2); const id = exact(args); return service.act(getCurrentProjectRoot(), id, action(args[1])); });
  registry.handle("issuePlanning:copy", (_e, ...args) => { arity(args, 1); return service.get(getCurrentProjectRoot(), exact(args)).then(model => { if (!model.draft?.instruction) throw Error("Prepare the Architect handoff first."); copyText(model.draft.instruction); return { copied: true }; }); });
}
