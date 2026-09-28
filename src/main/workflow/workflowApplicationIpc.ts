import type { DirectWorkflowStartRequest } from "../../shared/workflowApplicationContracts";
import { createWorkflowApplicationService } from "./workflowApplicationService";
import { createWorkflowExecutionApplicationService } from "./workflowExecutionApplicationService";

export interface WorkflowApplicationIpcRegistry {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

export function registerWorkflowApplicationIpc(registry: WorkflowApplicationIpcRegistry,
  getCurrentProjectRoot: () => string,
  service = createWorkflowApplicationService()): void {
  const execution = createWorkflowExecutionApplicationService();
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
  registry.handle("workflow:workItemValidation", async (_event, ...args) => {
    if (args.length !== 2 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow and WorkItem IDs are required.");
    return execution.getWorkItemValidationProjection(getCurrentProjectRoot(), args[0] as string, args[1] as string);
  });
  registry.handle("workflow:completeWorkItem", async (_event, ...args) => {
    if (args.length !== 3 || args.slice(0, 2).some(value => typeof value !== "string" || !value.trim() || value.length > 128) || !Number.isSafeInteger(args[2])) throw Error("Exact WorkItem completion input is required.");
    return execution.completeWorkItem(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as number);
  });
  registry.handle("workflow:completePhase", async (_event, ...args) => {
    if (args.length !== 3 || args.slice(0, 2).some(value => typeof value !== "string" || !value.trim() || value.length > 128) || !Number.isSafeInteger(args[2])) throw Error("Exact Phase completion input is required.");
    return execution.completePhase(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as number);
  });
  registry.handle("workflow:createRepair", async (_event, ...args) => {
    if (args.length !== 3 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow, WorkItem, and failure evidence IDs are required.");
    return execution.createWorkflowRepair(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as string);
  });
  registry.handle("workflow:validateSemanticCriterion", async (_event, ...args) => {
    if (args.length !== 4 || args.slice(0, 3).some(value => typeof value !== "string" || !value.trim() || value.length > 128) ||
      !args[3] || typeof args[3] !== "object" || Array.isArray(args[3]) || Object.keys(args[3]).sort().join("|") !== "model|reasoningEffort")
      throw Error("Exact semantic Validator input is required.");
    return execution.validateSemanticWorkItemCriterion(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as string, args[3] as { model: string; reasoningEffort: string });
  });
  registry.handle("workflow:validateDeterministicCriterion", async (_event, ...args) => {
    if (args.length !== 3 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact deterministic Validator input is required.");
    return execution.validateDeterministicWorkItemCriterion(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as string);
  });
}
