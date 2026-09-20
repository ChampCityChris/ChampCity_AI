import type { WorkItemDecompositionProposal } from "../../shared/workItemDecompositionContracts";
import type { WorkPlanStructure } from "../../shared/workPlanningContracts";
import { validateWorkPlanStructure } from "../workPlanning/workPlanStructure";

export const decompositionGuidance = "Boundedness safety valve: if detailed inspection reveals independently useful outcomes, separable acceptance groups, different ownership, sequential prerequisites, excessive unrelated context, or genuine milestone/cutover boundaries, stop drafting the Formal Work Card and propose decomposition with evidence and rationale. Do not split by length alone. The Operator may accept or revise ordered sibling Work Items or a justified direct-to-phased Plan correction. Use the approved Work Plan's optional decomposition handoff; a bounded candidate follows the normal Formal Work Card path without another gate.";

export function decompositionFromBody(body: string): WorkItemDecompositionProposal {
  const blocks = [...body.replace(/\r\n?/g, "\n").matchAll(/^```champcity-work-item-decomposition[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm)];
  if (blocks.length !== 1) throw Error("Decomposition requires exactly one champcity-work-item-decomposition block.");
  const value = JSON.parse(blocks[0][1]) as WorkItemDecompositionProposal;
  const text = (item: unknown): item is string => typeof item === "string" && !!item.trim() && item.length <= 4000;
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !["kind", "rationale", "evidence", "replacements", "phases", "phaseAssignments", "topologyRationale"].includes(key)) ||
    !["siblings", "direct-to-phased"].includes(value.kind) || !text(value.rationale) || !Array.isArray(value.evidence) || !value.evidence.length || value.evidence.length > 100 || !value.evidence.every(text) ||
    !Array.isArray(value.replacements) || value.replacements.length < 2 || value.replacements.length > 100) throw Error("Decomposition requires bounded evidence, rationale and at least two replacement outcomes.");
  if (value.kind === "siblings" && (value.phases !== undefined || value.phaseAssignments !== undefined || value.topologyRationale !== undefined)) throw Error("Sibling decomposition cannot change Plan topology.");
  if (value.kind === "direct-to-phased" && (!Array.isArray(value.phases) || !value.phaseAssignments || typeof value.phaseAssignments !== "object" || Array.isArray(value.phaseAssignments) || !text(value.topologyRationale))) throw Error("Topology correction requires explicit Phases, assignments and rationale.");
  return value;
}

export function applyWorkItemDecomposition(plan: WorkPlanStructure, workItemId: string, proposal: WorkItemDecompositionProposal): { structure: WorkPlanStructure; resumeWorkItemId: string } {
  const original = plan.workItems.find((item) => item.workItemId === workItemId);
  if (!original) throw Error("The original Work Item is missing or already superseded.");
  if (proposal.replacements.some((item) => !item || typeof item !== "object" || Array.isArray(item))) throw Error("Replacement candidates must be structured Work Items.");
  const ids = proposal.replacements.map((item) => item.workItemId);
  if (ids.some((id) => plan.workItems.some((item) => item.workItemId === id)) || new Set(ids).size !== ids.length) throw Error("Replacement identities must be new and unique.");
  const replacements = proposal.replacements.map((item) => {
    if (!Array.isArray(item.dependsOn) || item.dependsOn.some((id) => !ids.includes(id) && !original.dependsOn.includes(id))) throw Error("Replacement dependencies may reference siblings and the original prerequisites only.");
    if (proposal.kind === "siblings" && item.phaseId !== undefined && item.phaseId !== original.phaseId) throw Error("Sibling decomposition must preserve Phase membership.");
    return { ...item, dependsOn: [...new Set([...original.dependsOn, ...item.dependsOn])], ...(proposal.kind === "siblings" && original.phaseId ? { phaseId: original.phaseId } : {}) };
  });
  const leaves = ids.filter((id) => !replacements.some((item) => item.dependsOn.includes(id)));
  let workItems = plan.workItems.flatMap((item) => item.workItemId === workItemId ? replacements : [{ ...item, dependsOn: [...new Set(item.dependsOn.flatMap((id) => id === workItemId ? leaves : [id]))] }]);
  let structure: WorkPlanStructure;
  if (proposal.kind === "direct-to-phased") {
    if (plan.topology !== "direct") throw Error("Only a direct Plan can receive direct-to-phased correction.");
    const unchangedIds = plan.workItems.filter((item) => item.workItemId !== workItemId).map((item) => item.workItemId);
    if (Object.keys(proposal.phaseAssignments!).length !== unchangedIds.length || unchangedIds.some((id) => typeof proposal.phaseAssignments![id] !== "string")) throw Error("Assign every unchanged Work Item to exactly one proposed Phase.");
    workItems = workItems.map((item) => ids.includes(item.workItemId) ? item : { ...item, phaseId: proposal.phaseAssignments![item.workItemId] });
    structure = validateWorkPlanStructure({ ...plan, topology: "phased", topologyRationale: proposal.topologyRationale, phases: proposal.phases, workItems });
  } else structure = validateWorkPlanStructure({ ...plan, workItems });
  const earlierPhases = (phaseId: string, found = new Set<string>()): string[] => {
    if (structure.topology === "phased") for (const id of structure.phases.find((phase) => phase.phaseId === phaseId)!.dependsOn) {
      if (!found.has(id)) { found.add(id); earlierPhases(id, found); }
    }
    return [...found];
  };
  const resume = replacements.find((item) => !item.dependsOn.some((id) => ids.includes(id)) &&
    (structure.topology !== "phased" || !earlierPhases(item.phaseId!).some((phaseId) => replacements.some((other) => other.phaseId === phaseId))));
  if (!resume) throw Error("Decomposition has no eligible replacement after the original prerequisites.");
  return { structure, resumeWorkItemId: resume.workItemId };
}
