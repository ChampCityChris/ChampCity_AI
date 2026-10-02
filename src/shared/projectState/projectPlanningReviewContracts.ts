import type {WorkflowPlanningGraph, EffectiveDisposition} from "./projectStateService";
import type {ProjectStateEntity, ProjectStateRecord} from "./domainContracts";

export interface ProjectPlanningCandidate {
  workflowId: string;
  facts: Array<{title: string; statement: string; impact: string}>;
  direction: WorkflowPlanningGraph["solution"];
  criteria: WorkflowPlanningGraph["solutionCriteria"];
  sources: Array<{entityId: string; recordVersion: number}>;
  expectedRecordVersion?: number;
}
export function renderProjectPlanningReview(cycle: ProjectStateRecord<"ProjectPlanningReviewCycle">, members: ProjectStateEntity[], disposition: EffectiveDisposition) {
  const solution = members.find((item): item is ProjectStateRecord<"BoundedSolution"> => item.entityType === "BoundedSolution")!;
  const facts = members.filter((item): item is ProjectStateRecord<"Finding"> => item.entityType === "Finding");
  const criteria = members.filter((item): item is ProjectStateRecord<"Criterion"> => item.entityType === "Criterion");
  const marker = `<!-- Generated SQL Project Planning ${cycle.id}@${cycle.recordVersion}; Workflow ${cycle.body.workflowId} -->`;
  const profileMarkdown = `${marker}\n# Project Profile\n\n${facts.map(fact => `## ${fact.body.title}\n\n${fact.body.statement}\n\nImpact: ${fact.body.impact}`).join("\n\n")}\n\n## Scope\n${solution.body.scopeIn.map(x => `- ${x}`).join("\n")}\n\n## Non-scope\n${solution.body.scopeOut.map(x => `- ${x}`).join("\n")}`;
  const roadmapMarkdown = `${marker}\n# Project Roadmap\n\n## ${solution.body.title}\n\n${solution.body.objective}\n\n` + ["constraints", "assumptions", "risks"].map(key => `## ${key}\n${solution.body[key as "constraints"].map(x => `- ${x}`).join("\n")}`).join("\n\n") + `\n\n## Acceptance direction\n${criteria.map(x => `- ${x.body.statement} (${x.body.validationPolicy})`).join("\n")}`;
  return {cycleId: cycle.id, recordVersion: cycle.recordVersion, workflowId: cycle.body.workflowId, disposition, profileMarkdown, roadmapMarkdown, markdown: `${profileMarkdown}\n\n${roadmapMarkdown}`};
}
