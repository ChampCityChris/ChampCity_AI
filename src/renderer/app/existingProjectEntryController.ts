import type { ExistingProjectGitAdoptionPlan } from "../../shared/sourceControlContracts";
import type { ChampCityApi, CurrentProjectRuntimeContext } from "../../shared/workspaceContracts";

type ExistingProjectEntryApi = Pick<ChampCityApi, "applyExistingProjectGitAdoption" | "registerCurrentProject">;

export type ExistingProjectEntryResult =
  | { kind: "ready"; project: CurrentProjectRuntimeContext }
  | { kind: "consent-required"; plan: ExistingProjectGitAdoptionPlan }
  | { kind: "conversion-failed"; reason: string };

/** Product controller for an already-inspected selection; registration always follows successful source adoption. */
export async function openInspectedExistingProject(api: ExistingProjectEntryApi,
  plan: ExistingProjectGitAdoptionPlan): Promise<ExistingProjectEntryResult> {
  if (plan.state === "conversion-failed") {
    return { kind: "conversion-failed", reason: plan.failureReason ?? "Project source could not be safely converted." };
  }
  if (plan.state === "conversion-required") return { kind: "consent-required", plan };
  if (plan.state !== "source-neutral") await api.applyExistingProjectGitAdoption(plan.planId);
  return { kind: "ready", project: await api.registerCurrentProject("existing") };
}

/** Accept is one exact-plan application followed by one Current Project registration. */
export async function acceptExistingProjectAdoption(api: ExistingProjectEntryApi,
  plan: ExistingProjectGitAdoptionPlan): Promise<CurrentProjectRuntimeContext> {
  await api.applyExistingProjectGitAdoption(plan.planId);
  return api.registerCurrentProject("existing");
}
