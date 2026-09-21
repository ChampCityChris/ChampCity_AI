import fs from "node:fs";
import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel, RoutedWorkflowDocument } from "../../shared/routedWorkflowContracts";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { workPlanningKernel } from "../workPlanning/workPlanningKernel";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { activateRoutedDevelopmentExecutionBinding, readRoutedDevelopmentExecutionBinding } from "./routedDevelopmentExecutionBinding";
import { loadRoutedDevelopmentExecution } from "./routedDevelopmentExecutionService";
import { createRoutedDevelopmentApplicationService } from "./routedDevelopmentApplicationService";
import { codexImplementerExecutionService as worker } from "../workCardBuilding/codexImplementerExecutionService";
import { getWorkCardBuildingReviewProjection } from "../workCardBuilding/workCardBuildingReviewService";
import { workIssueContext } from "../workPlanning/workIssueContext";
import { getIssueCorrectionIntegrationEvidence } from "../issueResolution/issueResolutionService";
import { createRoutedIntegrationService } from "./routedIntegrationService";
import { projectPlanExecution } from "./planExecutor";

function document(root: string, relativePath: string): RoutedWorkflowDocument | undefined {
  const target = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (!fs.existsSync(target.resolvedPath)) return undefined;
  if (target.relativePath !== relativePath || fs.statSync(target.resolvedPath).size > 1_000_000) throw Error("Current workflow document exceeds its exact bounded path.");
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(target.resolvedPath, "utf8"));
  return { path: relativePath, body: parsed.bodyMarkdown, revision: parsed.metadata.artifactRevision, disposition: parsed.metadata.documentDisposition.status };
}
const reason = (error: unknown) => error instanceof Error && !/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\/)/.test(error.message)
  ? error.message.slice(0, 1500) : "Current workflow evidence could not be resolved. Refresh the selected work.";
const runtimeActions: RoutedWorkflowAction[] = ["cancel", "respond-approval", "respond-input", "respond-elicitation"];

async function integrationSummary(root: string, model: RoutedWorkflowModel) {
  const integration = createRoutedIntegrationService(root, model.intakeId);
  model.integration = await integration.query();
  const candidate = model.integration.candidate;
  if (candidate?.activeRepairId) model.repair = integration.readRepair(candidate.candidateId, candidate.activeRepairId);
  if (model.integration.status === "ready") model.actions.push("integrate");
  if (model.integration.status === "repair-required") model.actions.push("prepare-integration-repair");
  if (model.integration.status === "repair-required" && model.repair?.status === "prepared") model.actions.push("apply-integration-repair", "complete-integration-repair", "integration-decision");
  if (["failed", "repair-required"].includes(model.integration.status) && candidate?.status !== "conflicted") model.actions.push("retry-integration-validation");
  if (candidate && candidate.status !== "integrated" && candidate.status !== "aborted") model.actions.push("abort-integration");
}

/** Constrained desktop application adapter. Existing owners decide every transition. */
export async function getRoutedWorkflow(root: string, intakeId: string): Promise<RoutedWorkflowModel> {
  const intake = readWorkIntake(root, intakeId);
  const model: RoutedWorkflowModel = { intakeId, route: "Awaiting route", workBranch: intake.branchBinding.workBranch, targetBranch: intake.branchBinding.baseBranch, actions: [], reasons: [] };
  try {
    const planning = await workPlanningKernel.get(root, intakeId, "plan");
    model.route = planning.routeId;
    model.planPath = planning.artifact?.relativePath;
    if (!planning.artifact?.structure || planning.artifact.stale || planning.artifact.disposition !== "Approved") { model.reasons.push("Approve the current Work Plan before execution."); return model; }
    if (planning.routeId === "issue-resolution") {
      const issue = workIssueContext(root, intakeId, planning.artifact.identity.routeDecisionId);
      if (!issue) throw Error("Current routed Issue identity is required.");
      const state = getIssueCorrectionIntegrationEvidence(root, issue.issueId);
      model.execution = { ...projectPlanExecution(state.input), acceptance: [] };
      model.reasons.push(`Continue Fix Card implementation, validation and close in the Issue workspace for ${issue.issueId}.`);
      await integrationSummary(root, model);
      return model;
    }
    if (!await readRoutedDevelopmentExecutionBinding(root, intakeId)) { model.actions.push("activate"); return model; }
    const state = await loadRoutedDevelopmentExecution(root, intakeId);
    model.execution = state.projection;
    model.reasons.push(...state.projection.blockers);
    const app = createRoutedDevelopmentApplicationService(root, intakeId);
    await integrationSummary(root, model);
    if (state.projection.acceptance.some((entry) => entry.eligible)) model.actions.push("save-acceptance", "review-acceptance");
    const item = state.projection.workItems.find((entry) => entry.candidate.workItemId === state.projection.nextWorkItemId);
    const entry = state.entries.find((entry) => entry.candidate.workItemId === item?.candidate.workItemId);
    if (!entry || !item?.eligible) return model;
    const contract = entry.repairContext ? entry.repairContext.existing : entry.formal;
    model.current = { workItemId: entry.candidate.workItemId, implementationId: entry.executionWorkCardId, phaseId: entry.candidate.phaseId,
      ...(contract ? { contract: document(root, contract.markdownPath) } : {}) };
    if (!entry.handoff) model.actions.push("begin");
    else if (!contract || contract.effectiveDisposition !== "Approved") {
      model.actions.push("prepare", "check-draft");
      if (contract) model.actions.push("review-contract");
    } else {
      const review = getWorkCardBuildingReviewProjection(root, entry.scope, entry.executionWorkCardId);
      model.current.report = document(root, review.implementerReportPath);
      model.implementer = await app.implementationStatus(entry.candidate.workItemId);
      if (model.implementer.state === "running") {
        model.actions = [...runtimeActions];
        return model;
      }
      if (item.stage === "implement") model.actions.push("implement", "resolve-environment");
      if (review.reportReadiness === "ready-for-review") model.actions.push("review-report", "advisory-review", "validate");
      if (item.stage === "repair") model.actions.push("create-repair");
      if (item.stage === "close") model.actions.push("close");
    }
    return model;
  } catch (error) {
    model.actions = []; model.reasons.push(reason(error));
    const running = worker.getRunningRoutedSession(root, intakeId);
    if (running) {
      model.implementer = running.status;
      model.current = { workItemId: running.workItemId, implementationId: running.status.workCardId ?? running.workItemId, ...(running.status.phaseId ? { phaseId: running.status.phaseId } : {}) };
      model.actions = [...runtimeActions];
    }
    return model;
  }
}

export async function runRoutedWorkflow(root: string, intakeId: string, action: RoutedWorkflowAction, input: RoutedWorkflowInput = {}): Promise<{ model: RoutedWorkflowModel; instruction?: string }> {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !["expectedFingerprint", "workItemId", "expectedRevision", "disposition", "notes", "selection", "validation", "acceptance", "acceptanceReview", "candidateId", "repairId", "patches", "approval", "userInput", "elicitation"].includes(key))) throw Error("Invalid routed workflow input.");
  if (input.notes !== undefined && (typeof input.notes !== "string" || input.notes.length > 4000)) throw Error("Workflow notes must be bounded text.");
  // Runtime control remains available even if governing files change during a run.
  if (runtimeActions.includes(action)) {
    const running = worker.getRunningRoutedSession(root, intakeId);
    if (!running || running.workItemId !== input.workItemId) throw Error("The exact running routed Work Item is required.");
    if (action === "cancel") await worker.cancel(root);
    else if (action === "respond-approval" && input.approval) await worker.respondToApproval(root, input.approval.requestId, input.approval.decision);
    else if (action === "respond-input" && input.userInput) await worker.respondToUserInput(root, input.userInput.requestId, input.userInput.answers);
    else if (action === "respond-elicitation" && input.elicitation) await worker.respondToMcpElicitation(root, input.elicitation.requestId, { action: input.elicitation.action, content: input.elicitation.content });
    else throw Error("Current runtime response is required.");
    return { model: await getRoutedWorkflow(root, intakeId) };
  }
  const model = await getRoutedWorkflow(root, intakeId);
  if (action === "status") return { model };
  if (!model.actions.includes(action)) throw Error(model.reasons[0] ?? "This action is not available for the current workflow evidence.");
  if (!["activate", "cancel", "respond-approval", "respond-input", "respond-elicitation"].includes(action) && input.expectedFingerprint !== model.execution?.fingerprint) throw Error("Presented execution evidence changed; refresh before acting.");
  const app = createRoutedDevelopmentApplicationService(root, intakeId);
  const request = { workItemId: input.workItemId ?? "", expectedFingerprint: input.expectedFingerprint ?? "" };
  const notes = input.notes ?? "";
  const integration = { expectedFingerprint: input.expectedFingerprint ?? "", candidateId: input.candidateId };
  const selector = { ownerKind: "routed-development" as const, intakeId, workItemId: request.workItemId };
  let instruction: string | undefined;
  let feedback = "Workflow updated.";
  if (action === "activate") await activateRoutedDevelopmentExecutionBinding(root, intakeId);
  else if (action === "begin") await app.execution.begin(request);
  else if (action === "prepare" || action === "check-draft" || action === "review-contract") {
    const state = await loadRoutedDevelopmentExecution(root, intakeId);
    const entry = state.entries.find((entry) => entry.candidate.workItemId === request.workItemId);
    if (!entry) throw Error("Current Work Item is required.");
    const repair = entry.repairContext;
    if (action === "review-contract") {
      if (!input.disposition || input.expectedRevision === undefined) throw Error("Current contract revision and explicit disposition are required.");
      const review = { ...request, expectedRevision: input.expectedRevision, disposition: input.disposition, notes };
      if (repair) await app.execution.reviewRepair({ ...review, repairId: repair.repairId });
      else await app.execution.reviewFormal(review);
    } else {
      if (action === "prepare") {
        const prepared = await (repair ? app.execution.prepareRepair(request) : app.execution.prepare(request));
        if (!prepared || !("preparedInstruction" in prepared)) throw Error("Prepare the current Work Item handoff first.");
        instruction = prepared.preparedInstruction;
        feedback = "Work Card Architect handoff copied.";
      } else {
        const draft = await (repair ? app.execution.getRepairDraft(request) : app.execution.getDraft(request));
        if (!draft || !("submission" in draft)) throw Error("Prepare the current Work Item handoff first.");
        feedback = draft.promotionError ?? `Draft: ${draft.submission.state}.`;
      }
    }
  } else if (action === "implement") await app.implement({ ...request, selection: input.selection });
  else if (action === "resolve-environment") await worker.startEnvironmentResolution(root, selector);
  else if (action === "review-report") {
    if (!input.disposition || input.expectedRevision === undefined) throw Error("Current report revision and disposition are required.");
    await app.execution.reviewReport({ ...request, expectedRevision: input.expectedRevision, disposition: input.disposition, notes });
  } else if (action === "advisory-review") { instruction = (await app.execution.advisoryReview(request)).instruction; feedback = "Advisory review handoff copied."; }
  else if (action === "validate") {
    if (!input.validation) throw Error("Explicit validation decision is required.");
    await app.execution.validate({ ...request, decision: { decision: input.validation, operatorNotes: notes, ...(input.validation === "RequestRepair" ? { repairDefectText: notes } : {}) } });
  } else if (action === "create-repair") await app.execution.createRepair({ ...request, defect: notes });
  else if (action === "close") await app.execution.close(request);
  else if (action === "save-acceptance" && input.acceptance) await app.execution.saveAcceptance(input.acceptance);
  else if (action === "review-acceptance" && input.acceptanceReview) await app.execution.reviewAcceptance(input.acceptanceReview);
  else if (action === "integrate") await app.integration.integrate(integration);
  else if (action === "prepare-integration-repair") {
    const repair = await app.integration.prepareRepair(integration);
    instruction = `${repair.prompt}\nReturn only a JSON array of {"path":"...","beforeSha256":"...","content":"replacement source or null"} patches for the stated editable files. Paste that response into ChampCity's Integration Repair patch field.\n`;
    feedback = "Integration Repair handoff copied.";
  } else if (action === "apply-integration-repair" && input.repairId && input.patches) await app.integration.applyRepair({ ...integration, repairId: input.repairId, patches: input.patches });
  else if (action === "complete-integration-repair" && input.repairId) await app.integration.completeRepair({ ...integration, repairId: input.repairId });
  else if (action === "integration-decision" && input.repairId) await app.integration.requestOperatorDecision({ ...integration, repairId: input.repairId, reason: notes });
  else if (action === "retry-integration-validation") await app.integration.retryValidation(integration);
  else if (action === "abort-integration") await app.integration.abort(integration);
  else throw Error("The action requires its current bounded input.");
  return { model: { ...await getRoutedWorkflow(root, intakeId), feedback }, ...(instruction ? { instruction } : {}) };
}
