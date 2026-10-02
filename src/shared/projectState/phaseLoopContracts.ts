import type {ProjectPlanningCandidate} from "./projectPlanningReviewContracts";
import type {WorkflowPlanningGraph} from "./projectStateService";
import type {ProjectStateEntity, ProjectStateRecord} from "./domainContracts";

export interface PhaseWorkCandidate {
  candidateId: string; order: number; title: string; purpose: string; dependsOn: string[];
  resolutionStatus: "planned" | "deferred" | "superseded" | "alreadySatisfied" | "carriedForward";
  resolutionReason: string; evidencePaths: string[]; carriedForwardToPhaseId?: string;
  criteria?: WorkflowPlanningGraph["solutionCriteria"];
}
export interface PhaseLoopCandidate extends ProjectPlanningCandidate {
  phaseId: string; stageKind: "interview" | "planning"; candidates?: PhaseWorkCandidate[];
}
export function renderPhaseLoop(cycle: ProjectStateRecord<"PhaseReviewCycle">, members: ProjectStateEntity[], edges: {relationshipType: string; fromEntityId: string; toEntityId: string}[] = []) {
  const title = cycle.body.stageKind === "interview" ? "Phase Interview" : "Phase Planning";
  const direction = members.filter((record): record is ProjectStateRecord<"BoundedSolution"> => record.entityType === "BoundedSolution");
  const facts = members.filter((record): record is ProjectStateRecord<"Finding"> => record.entityType === "Finding");
  const works = members.filter((record): record is ProjectStateRecord<"WorkItem"> => record.entityType === "WorkItem");
  const criteria = members.filter((record): record is ProjectStateRecord<"Criterion"> => record.entityType === "Criterion");
  return `<!-- Generated SQL ${title} ${cycle.id}@${cycle.recordVersion}; Phase ${cycle.body.phaseId} -->\n# ${title}\n\n` +
    facts.map(record => `## ${record.body.title}\n${record.body.statement}\nImpact: ${record.body.impact}`).join("\n\n") + "\n\n" +
    direction.map(record => `## ${record.body.title}\n${record.body.objective}\nScope: ${record.body.scopeIn.join("; ")}\nExcluded: ${record.body.scopeOut.join("; ")}\nConstraints: ${record.body.constraints.join("; ")}\nAssumptions: ${record.body.assumptions.join("; ")}\nRisks: ${record.body.risks.join("; ")}`).join("\n\n") +
    `\n\n## Acceptance obligations\n${criteria.map(record => `- ${record.body.statement} (${record.body.validationPolicy}): ${record.body.verificationIntent}`).join("\n")}\n\n` +
    (cycle.body.stageKind === "planning" ? `# Work Card Plan\n\n${works.map(record => `## ${record.body.candidateKey}: ${record.body.title}\n${record.body.objective}\nDependencies: ${edges.filter(edge => edge.relationshipType === "depends_on" && edge.fromEntityId === record.id).map(edge => works.find(work => work.id === edge.toEntityId)?.body.candidateKey ?? edge.toEntityId).join(", ")}\nObligations: ${edges.filter(edge => edge.relationshipType === "defines_criterion" && edge.fromEntityId === record.id).map(edge => criteria.find(criterion => criterion.id === edge.toEntityId)?.body.statement ?? "missing").join("; ")}\nResolution: ${record.body.planningResolution}: ${record.body.resolutionReason ?? ""}\nEvidence: ${(record.body.planningEvidence ?? []).join("; ")}`).join("\n\n")}` : "");
}
