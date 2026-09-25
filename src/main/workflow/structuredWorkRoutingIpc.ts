import type { StructuredWorkRoutingDecisionInput } from "../../shared/structuredWorkRoutingContracts";
import { createStructuredWorkRoutingService } from "./structuredWorkRoutingService";

export interface StructuredWorkRoutingIpcRegistry {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

export function registerStructuredWorkRoutingIpc(registry: StructuredWorkRoutingIpcRegistry,
  getCurrentProjectRoot: () => string, copyText: (text: string) => void,
  service = createStructuredWorkRoutingService()): void {
  const exactPair = (args: unknown[], label: string): [string, string] => {
    if (args.length !== 2 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error(`${label} requires exact Work Intake and WIR Workflow IDs.`);
    return [args[0] as string, args[1] as string];
  };
  registry.handle("structuredWIR:get", async (_event, ...args) => {
    const [intakeId, workflowId] = exactPair(args, "WIR status");
    return service.get(getCurrentProjectRoot(), intakeId, workflowId);
  });
  registry.handle("structuredWIR:prepare", async (_event, ...args) => {
    const [intakeId, workflowId] = exactPair(args, "WIR prepare");
    return service.prepare(getCurrentProjectRoot(), intakeId, workflowId);
  });
  registry.handle("structuredWIR:decide", async (_event, ...args) => {
    const [intakeId, workflowId] = exactPair(args.slice(0, 2), "WIR decision");
    if (args.length !== 3 || !args[2] || typeof args[2] !== "object" || Array.isArray(args[2])) throw Error("A bounded WIR Operator decision is required.");
    return service.decide(getCurrentProjectRoot(), intakeId, workflowId, args[2] as StructuredWorkRoutingDecisionInput);
  });
  registry.handle("structuredWIR:copy", async (_event, ...args) => {
    const [intakeId, workflowId] = exactPair(args, "WIR copy");
    const model = await service.get(getCurrentProjectRoot(), intakeId, workflowId);
    if (!model.preparedInstruction) throw Error("Prepare a current routing assessment before copying its handoff.");
    copyText(model.preparedInstruction);
    return { copied: true };
  });
}
