import type { WorkIntakeNavigationProjection, WorkIntakeStageAvailability, WorkIntakeStageId } from "../../shared/workIntakeNavigationContracts";
import { getRoutedWorkflow } from "../planExecution/routedWorkflowService";
import { workPlanningKernel } from "../workPlanning/workPlanningKernel";
import { getWorkRouteDecision } from "./workRouteDecisionService";
import { getWorkIntakeProjection } from "./workIntakeService";

const stageDefinitions: readonly { id: WorkIntakeStageId; label: string; architect: boolean }[] = [
  { id: "intake", label: "Intake", architect: false },
  { id: "routing", label: "Routing", architect: true },
  { id: "assessment", label: "Architect Assessment", architect: true },
  { id: "plan", label: "Plan", architect: true },
  { id: "execution", label: "Execution", architect: false },
  { id: "integration", label: "Integration", architect: false },
];

export async function getWorkIntakeNavigation(root: string, requestedIntakeId?: string): Promise<WorkIntakeNavigationProjection> {
  const intakeProjection = await getWorkIntakeProjection(root);
  const intake = requestedIntakeId
    ? intakeProjection.intakes.find((entry) => entry.intakeId === requestedIntakeId)
    : intakeProjection.currentIntake;
  if (requestedIntakeId && !intake) throw Error("The selected Work Intake is not in this project.");
  const available = new Set<WorkIntakeStageId>(["intake"]);
  const reasons = new Map<WorkIntakeStageId, string>();
  let requiredStageId: WorkIntakeStageId = "intake";
  let selectedRouteId: WorkIntakeNavigationProjection["selectedRouteId"] = null;
  let execution: WorkIntakeNavigationProjection["execution"] = null;
  let issueAssessmentExternallyOwned = false;
  if (intake) {
    available.add("routing");
    requiredStageId = "routing";
    const route = await getWorkRouteDecision(root, intake.intakeId);
    if (route.state === "selected" && route.selection) {
      selectedRouteId = route.selection.selectedRouteId;
      if (selectedRouteId === "issue-resolution") {
        issueAssessmentExternallyOwned = true;
        reasons.set("assessment", "Issue assessment continues in Issue Resolution.");
        reasons.set("plan", "Issue planning continues in Issue Resolution.");
        reasons.set("execution", "Issue correction continues in Issue Resolution.");
        const routed = await getRoutedWorkflow(root, intake.intakeId);
        if (routed.integration) {
          available.add("integration");
          requiredStageId = "integration";
        }
      } else {
        available.add("assessment");
        requiredStageId = "assessment";
        const assessment = await workPlanningKernel.get(root, intake.intakeId, "assessment");
        if (assessment.artifact && !assessment.artifact.stale && assessment.artifact.disposition === "Approved") {
          if (assessment.researchClosed) {
            available.add("integration");
            requiredStageId = "integration";
          } else {
            available.add("plan");
            requiredStageId = "plan";
            const plan = await workPlanningKernel.get(root, intake.intakeId, "plan");
            if (plan.artifact && !plan.artifact.stale && plan.artifact.disposition === "Approved" && plan.artifact.structure) {
              available.add("execution");
              requiredStageId = "execution";
              const routed = await getRoutedWorkflow(root, intake.intakeId);
              if (routed.execution) {
                const current = routed.execution.workItems.find((item) => item.candidate.workItemId === routed.execution?.nextWorkItemId);
                execution = { status: routed.execution.status, nextWorkItemId: routed.execution.nextWorkItemId ?? null,
                  currentStep: current?.stage ?? null };
                if (routed.execution.complete) {
                  available.add("integration");
                  requiredStageId = "integration";
                }
              }
            }
          }
        }
      }
    } else if (route.selection) {
      selectedRouteId = route.selection.selectedRouteId;
    }
  }
  const stages: WorkIntakeStageAvailability[] = stageDefinitions.map((stage) => ({
    stageId: stage.id, label: stage.label, available: available.has(stage.id),
    reason: available.has(stage.id) ? `${stage.label} is available.` : reasons.get(stage.id) ?? {
      routing: "Save a Work Intake to begin routing.",
      assessment: "Select a current route in Routing first.",
      plan: "Approve the current Architect Assessment first.",
      execution: "Approve the current Work Plan first.",
      integration: "Complete the required work before Integration.",
      intake: "",
    }[stage.id],
    requiresArchitect: stage.architect,
  }));
  return { intakeId: intake?.intakeId ?? null, requiredStageId, stages, selectedRouteId, execution, issueAssessmentExternallyOwned };
}
