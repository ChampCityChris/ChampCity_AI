import type { ExistingProjectGitAdoptionPlan } from "../../shared/sourceControlContracts";
import type { ChampCityApi, CurrentProjectRuntimeContext, WorkspaceSelection } from "../../shared/workspaceContracts";

type ExistingProjectEntryApi = Pick<ChampCityApi,
  "applyExistingProjectGitAdoption" | "chooseWorkspaceFolder" | "inspectExistingProjectGitAdoption" | "registerCurrentProject">;
type SelectedWorkspace = Extract<WorkspaceSelection, { ok: true }>;

export type ExistingProjectEntryResult =
  | { kind: "ready"; project: CurrentProjectRuntimeContext }
  | { kind: "consent-required"; plan: ExistingProjectGitAdoptionPlan }
  | { kind: "conversion-failed"; reason: string };

export type ExistingProjectAdmissionResult =
  | { kind: "selection-failed"; reason: string }
  | ({ selection: SelectedWorkspace } & ExistingProjectEntryResult);

/** Every Open/Change Existing Project action enters through this chooser, inspection, and admission path. */
export async function admitExistingProject(api: ExistingProjectEntryApi): Promise<ExistingProjectAdmissionResult> {
  const selection = await api.chooseWorkspaceFolder();
  if (!selection.ok) return { kind: "selection-failed", reason: selection.reason };
  const plan = await api.inspectExistingProjectGitAdoption();
  return { selection, ...await openInspectedExistingProject(api, plan) };
}

/** Product controller for an already-inspected selection; registration always follows successful source adoption. */
export async function openInspectedExistingProject(api: ExistingProjectEntryApi,
  plan: ExistingProjectGitAdoptionPlan): Promise<ExistingProjectEntryResult> {
  if (plan.state === "conversion-failed") {
    return { kind: "conversion-failed", reason: plan.failureReason ?? "Project source could not be safely converted." };
  }
  if (plan.state === "conversion-required") return { kind: "consent-required", plan };
  const adoption = plan.state !== "source-neutral"
    ? await api.applyExistingProjectGitAdoption(plan.planId) : null;
  const project = await api.registerCurrentProject("existing");
  return { kind: "ready", project: adoption?.sourceApplied
    ? { ...project, environmentHydration: adoption.environmentHydration } : project };
}

/** Accept is one exact-plan application followed by one Current Project registration. */
export async function acceptExistingProjectAdoption(api: ExistingProjectEntryApi,
  plan: ExistingProjectGitAdoptionPlan): Promise<CurrentProjectRuntimeContext> {
  const adoption = await api.applyExistingProjectGitAdoption(plan.planId);
  const project = await api.registerCurrentProject("existing");
  return adoption.sourceApplied
    ? { ...project, environmentHydration: adoption.environmentHydration } : project;
}
