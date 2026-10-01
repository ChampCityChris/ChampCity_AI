import { createWorkflowIntakeService } from "./workflowIntakeService";
import { validateWorkflowIntakePayload } from "../../shared/workflowIntakeContracts";
import type { DirectWorkflowStartRequest } from "../../shared/workflowApplicationContracts";
import { createWorkflowApplicationService } from "./workflowApplicationService";
import { createWorkflowExecutionApplicationService } from "./workflowExecutionApplicationService";
import { createWorkflowIntegrationService } from "../sourceControl/workflowIntegrationService";

export interface WorkflowApplicationIpcRegistry {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

export function registerWorkflowApplicationIpc(registry: WorkflowApplicationIpcRegistry,
  getCurrentProjectRoot: () => string,
  service = createWorkflowApplicationService()): void {
  const intake = createWorkflowIntakeService();
  const intakeId = (args: unknown[], count: number) => {
    if (args.length !== count || typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128)
      throw Error("Exact bounded Workflow intake arguments are required.");
    return args[0];
  };
  registry.handle("workflow:getIntake", (_event, ...args) => intake.ensureWorkflowIntake(getCurrentProjectRoot(), intakeId(args, 1)));
  registry.handle("workflow:saveIntake", (_event, ...args) => {
    const id = intakeId(args, 2);
    validateWorkflowIntakePayload(args[1]);
    return intake.saveWorkflowIntake(getCurrentProjectRoot(), id, args[1]);
  });
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
  registry.handle("workflow:checkpointRecovery", async (_event, ...args) => {
    if (args.length !== 2 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow and WorkItem IDs are required.");
    return execution.getCheckpointRecoveryProjection(getCurrentProjectRoot(), args[0] as string, args[1] as string);
  });
  registry.handle("workflow:retryImplementationCheckpoint", async (_event, ...args) => {
    if (args.length !== 3 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow, WorkItem, and ImplementationRecord IDs are required.");
    return execution.retryImplementationCheckpoint(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as string);
  });
  registry.handle("workflow:retryTesterCheckpoint", async (_event, ...args) => {
    if (args.length !== 4 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow, WorkItem, ImplementationRecord, and TesterResult IDs are required.");
    return execution.retryTesterCheckpoint(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as string, args[3] as string);
  });
  registry.handle("workflow:executionProjection", async (_event, ...args) => {
    if (args.length !== 1 || typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128) throw Error("Exact Workflow ID is required.");
    return execution.getExecutionProjection(getCurrentProjectRoot(), args[0]);
  });
  registry.handle("workflow:executionCompletion", async (_event, ...args) => {
    if (args.length !== 1 || typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128) throw Error("Exact Workflow ID is required.");
    return execution.getWorkflowExecutionCompletionProjection(getCurrentProjectRoot(), args[0]);
  });
  registry.handle("workflow:completeExecution", async (_event, ...args) => {
    if (args.length !== 2 || typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128 || !Number.isSafeInteger(args[1])) throw Error("Exact Workflow execution completion input is required.");
    return execution.completeWorkflowExecution(getCurrentProjectRoot(), args[0], args[1] as number);
  });
  registry.handle("workflow:integrationQuery", async (_event, ...args) => {
    if (args.length !== 1 || typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128) throw Error("Exact Workflow ID is required.");
    return createWorkflowIntegrationService(getCurrentProjectRoot(), args[0]).query();
  });
  registry.handle("workflow:integrate", async (_event, ...args) => {
    if (args.length !== 1 || typeof args[0] !== "string" || !args[0].trim() || args[0].length > 128) throw Error("Exact Workflow ID is required.");
    return createWorkflowIntegrationService(getCurrentProjectRoot(), args[0]).integrate();
  });
  registry.handle("workflow:integrationPrepareRepair", async (_event, ...args) => {
    if (args.length !== 2 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow and candidate IDs are required.");
    return createWorkflowIntegrationService(getCurrentProjectRoot(), args[0] as string).prepareRepair(args[1] as string);
  });
  registry.handle("workflow:integrationApplyRepair", async (_event, ...args) => {
    if (args.length !== 4 || args.slice(0, 3).some(value => typeof value !== "string" || !value.trim() || value.length > 128) || !Array.isArray(args[3]) || args[3].length < 1 || args[3].length > 32 ||
      args[3].some(patch => !patch || typeof patch !== "object" || Array.isArray(patch) || Object.keys(patch).sort().join("|") !== "beforeSha256|content|path" ||
        typeof patch.path !== "string" || patch.path.length > 512 || typeof patch.beforeSha256 !== "string" || !/^[a-f0-9]{64}$/.test(patch.beforeSha256) ||
        patch.content !== null && (typeof patch.content !== "string" || patch.content.length > 250_000))) throw Error("Bounded exact Workflow Integration Repair input is required.");
    return createWorkflowIntegrationService(getCurrentProjectRoot(), args[0] as string).applyRepair(args[1] as string, args[2] as string, args[3] as never[]);
  });
  registry.handle("workflow:integrationCompleteRepair", async (_event, ...args) => {
    if (args.length !== 3 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow, candidate, and repair IDs are required.");
    return createWorkflowIntegrationService(getCurrentProjectRoot(), args[0] as string).completeRepair(args[1] as string, args[2] as string);
  });
  registry.handle("workflow:integrationOperatorDecision", async (_event, ...args) => {
    if (args.length !== 4 || args.slice(0, 3).some(value => typeof value !== "string" || !value.trim() || value.length > 128) || typeof args[3] !== "string" || !args[3].trim() || args[3].length > 2000) throw Error("Bounded Workflow Integration Operator Decision input is required.");
    return createWorkflowIntegrationService(getCurrentProjectRoot(), args[0] as string).requestOperatorDecision(args[1] as string, args[2] as string, args[3]);
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
  registry.handle("workflow:createPhaseRepair", async (_event, ...args) => {
    if (args.length !== 3 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow, Phase, and failure evidence IDs are required.");
    return execution.createPhaseRepair(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as string);
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
  registry.handle("workflow:decomposeWorkItem", async (_event, ...args) => {
    if (args.length !== 1 || !args[0] || typeof args[0] !== "object" || Array.isArray(args[0]) ||
      Object.keys(args[0]).sort().join("|") !== "criterionDispositions|expectedWorkItemVersion|incomingDependentMappings|replacements|workItemId|workflowId")
      throw Error("Exact typed Workflow WorkItem decomposition input is required.");
    return execution.decomposeWorkflowWorkItem(getCurrentProjectRoot(), args[0] as import("../../shared/workflowApplicationContracts").WorkflowWorkItemDecompositionInput);
  });
  registry.handle("workflow:acceptWorkItemExecutionPlan", async (_event, ...args) => {
    const request = args[0] as Record<string, unknown> | undefined;
    if (args.length !== 1 || !request || typeof request !== "object" || Array.isArray(request) ||
      Object.keys(request).sort().join("|") !== "expectedVersion|plan|workItemId|workflowId" || !request.plan || typeof request.plan !== "object" || Array.isArray(request.plan) ||
      Object.keys(request.plan as object).sort().join("|") !== "affectedPaths|implementationBoundaries|proofIntent") throw Error("Exact bounded WorkItem execution-plan input is required.");
    return execution.acceptWorkItemExecutionPlan(getCurrentProjectRoot(), request as unknown as import("../../shared/workflowApplicationContracts").WorkItemExecutionPlanInput);
  });
  registry.handle("workflow:recordWorkItemVisualCriterion", async (_event, ...args) => {
    if (args.length !== 1 || !args[0] || typeof args[0] !== "object" || Array.isArray(args[0]) ||
      Object.keys(args[0]).sort().join("|") !== "criterionId|expectedCriterionVersion|outcome|summary|workItemId|workflowId")
      throw Error("Exact WorkItem visual Criterion evidence is required.");
    return execution.recordWorkItemVisualCriterion(getCurrentProjectRoot(), args[0] as Parameters<typeof execution.recordWorkItemVisualCriterion>[1]);
  });
  registry.handle("workflow:recordWorkItemCriterionDecision", async (_event, ...args) => {
    if (args.length !== 1 || !args[0] || typeof args[0] !== "object" || Array.isArray(args[0]) ||
      Object.keys(args[0]).sort().join("|") !== "criterionId|expectedCriterionVersion|outcome|rationale|workItemId|workflowId")
      throw Error("Exact WorkItem Operator Criterion Decision is required.");
    return execution.recordWorkItemCriterionDecision(getCurrentProjectRoot(), args[0] as Parameters<typeof execution.recordWorkItemCriterionDecision>[1]);
  });
  registry.handle("workflow:phaseValidation", async (_event, ...args) => {
    if (args.length !== 2 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact Workflow and Phase IDs are required.");
    return execution.getPhaseValidationProjection(getCurrentProjectRoot(), args[0] as string, args[1] as string);
  });
  registry.handle("workflow:validateDeterministicPhaseCriterion", async (_event, ...args) => {
    if (args.length !== 3 || args.some(value => typeof value !== "string" || !value.trim() || value.length > 128)) throw Error("Exact deterministic Phase Criterion input is required.");
    return execution.validateDeterministicPhaseCriterion(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as string);
  });
  registry.handle("workflow:validateSemanticPhaseCriterion", async (_event, ...args) => {
    if (args.length !== 4 || args.slice(0, 3).some(value => typeof value !== "string" || !value.trim() || value.length > 128) ||
      !args[3] || typeof args[3] !== "object" || Array.isArray(args[3]) || Object.keys(args[3]).sort().join("|") !== "model|reasoningEffort")
      throw Error("Exact semantic Phase Criterion input is required.");
    return execution.validateSemanticPhaseCriterion(getCurrentProjectRoot(), args[0] as string, args[1] as string, args[2] as string,
      args[3] as import("../../shared/codexRuntimeContracts").CodexModelSelection);
  });
  registry.handle("workflow:recordPhaseVisualCriterion", async (_event, ...args) => {
    if (args.length !== 1 || !args[0] || typeof args[0] !== "object" || Array.isArray(args[0]) ||
      Object.keys(args[0]).sort().join("|") !== "criterionId|expectedCriterionVersion|expectedPhaseVersion|outcome|phaseId|summary|workflowId")
      throw Error("Exact Phase visual Criterion evidence is required.");
    return execution.recordPhaseVisualCriterion(getCurrentProjectRoot(), args[0] as Parameters<typeof execution.recordPhaseVisualCriterion>[1]);
  });
  registry.handle("workflow:recordPhaseCriterionDecision", async (_event, ...args) => {
    if (args.length !== 1 || !args[0] || typeof args[0] !== "object" || Array.isArray(args[0]) ||
      Object.keys(args[0]).sort().join("|") !== "criterionId|expectedCriterionVersion|expectedPhaseVersion|outcome|phaseId|rationale|workflowId")
      throw Error("Exact Phase Operator Criterion Decision is required.");
    return execution.recordPhaseCriterionDecision(getCurrentProjectRoot(), args[0] as Parameters<typeof execution.recordPhaseCriterionDecision>[1]);
  });
}
