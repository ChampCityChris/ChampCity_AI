import type { DirectWorkflowStartRequest } from "../../shared/workflowApplicationContracts";
import { createWorkflowApplicationService } from "./workflowApplicationService";

export interface WorkflowApplicationIpcRegistry {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

export function registerWorkflowApplicationIpc(registry: WorkflowApplicationIpcRegistry,
  getCurrentProjectRoot: () => string,
  service = createWorkflowApplicationService()): void {
  registry.handle("workflow:list", async (_event, ...args) => {
    if (args.length) throw Error("Workflow inventory does not accept renderer arguments.");
    return service.listCurrentProjectWorkflows(getCurrentProjectRoot());
  });
  registry.handle("workflow:start", async (_event, ...args) => {
    if (args.length !== 1 || !args[0] || typeof args[0] !== "object" || Array.isArray(args[0]))
      throw Error("A bounded Workflow start request is required.");
    const request = args[0] as Record<string, unknown>;
    if (Object.keys(request).some(key => !["workflowType", "title"].includes(key)) ||
      typeof request.workflowType !== "string" || typeof request.title !== "string")
      throw Error("Workflow start request must contain only Workflow type and title.");
    return service.startDirectWorkflow(getCurrentProjectRoot(), {
      workflowType: request.workflowType as DirectWorkflowStartRequest["workflowType"],
      title: request.title as string,
    });
  });
  registry.handle("workflow:get", async (_event, ...args) => {
    if (args.length !== 1 || typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128)
      throw Error("Exact Workflow ID is required.");
    return service.getCurrentProjectWorkflow(getCurrentProjectRoot(), args[0]);
  });
}
