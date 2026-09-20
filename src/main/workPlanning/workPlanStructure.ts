import type { PlanPhaseCandidate, PlanWorkItemCandidate, WorkPlanStructure } from "../../shared/workPlanningContracts";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Plan structure requires objects.");
  return value as Record<string, unknown>;
}
function text(value: unknown): value is string { return typeof value === "string" && !!value.trim() && value.length <= 4000; }
function strings(value: unknown, nonempty = false): value is string[] {
  return Array.isArray(value) && value.length <= 100 && (!nonempty || value.length > 0) && value.every(text) && new Set(value).size === value.length;
}
function candidate(value: unknown, phase: boolean): PlanWorkItemCandidate | PlanPhaseCandidate {
  const entry = record(value);
  const id = phase ? "phaseId" : "workItemId";
  const fields = [id, "title", "purpose", "dependsOn", "acceptanceCriteria", ...(!phase ? ["phaseId"] : [])];
  if (Object.keys(entry).some((key) => !fields.includes(key)) || typeof entry[id] !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(entry[id] as string) ||
    !text(entry.title) || !text(entry.purpose) || !strings(entry.dependsOn) || !strings(entry.acceptanceCriteria, true) ||
    (!phase && entry.phaseId !== undefined && !text(entry.phaseId))) throw Error("Plan candidates require bounded identity, purpose, dependencies and acceptance criteria; execution state is not draft content.");
  return entry as unknown as PlanWorkItemCandidate | PlanPhaseCandidate;
}
function assertDag(items: readonly { id: string; dependsOn: readonly string[] }[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  if (byId.size !== items.length) throw Error("Plan candidate identities must be unique.");
  const visiting = new Set<string>(); const visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw Error("Plan dependencies contain a cycle.");
    if (visited.has(id)) return;
    const item = byId.get(id); if (!item) throw Error("Plan dependency references an unknown candidate.");
    visiting.add(id); item.dependsOn.forEach(visit); visiting.delete(id); visited.add(id);
  }
  items.forEach(({ id }) => visit(id));
}
export function validateWorkPlanStructure(value: unknown): WorkPlanStructure {
  const entry = record(value);
  if (Object.keys(entry).some((key) => !["topology", "topologyRationale", "acceptanceCriteria", "workItems", "phases"].includes(key)) ||
    !["direct", "phased"].includes(entry.topology as string) || !text(entry.topologyRationale) || !strings(entry.acceptanceCriteria, true) ||
    !Array.isArray(entry.workItems) || !entry.workItems.length || entry.workItems.length > 100) throw Error("Plan requires direct or phased topology, rationale, criteria and bounded Work Items.");
  const workItems = entry.workItems.map((item) => candidate(item, false) as PlanWorkItemCandidate);
  assertDag(workItems.map((item) => ({ id: item.workItemId, dependsOn: item.dependsOn })));
  if (entry.topology === "direct") {
    if (entry.phases !== undefined || workItems.some((item) => item.phaseId !== undefined)) throw Error("Direct Plans have no Phase layer.");
    return { topology: "direct", topologyRationale: entry.topologyRationale, acceptanceCriteria: entry.acceptanceCriteria, workItems };
  }
  if (!Array.isArray(entry.phases) || !entry.phases.length || entry.phases.length > 100) throw Error("Phased Plans require explicit Phase candidates.");
  const phases = entry.phases.map((item) => candidate(item, true) as PlanPhaseCandidate);
  assertDag(phases.map((phase) => ({ id: phase.phaseId, dependsOn: phase.dependsOn })));
  if (workItems.some((item) => !phases.some((phase) => phase.phaseId === item.phaseId)) || phases.some((phase) => !workItems.some((item) => item.phaseId === phase.phaseId))) throw Error("Each Work Item must belong to one declared nonempty Phase.");
  // Phase barriers and item dependencies together must be executable, not merely separate DAGs.
  const combined = workItems.map((item) => ({ id: item.workItemId, dependsOn: [...new Set([...item.dependsOn,
    ...workItems.filter((other) => phases.find((phase) => phase.phaseId === item.phaseId)!.dependsOn.includes(other.phaseId!)).map((other) => other.workItemId)])] }));
  assertDag(combined);
  return { topology: "phased", topologyRationale: entry.topologyRationale, acceptanceCriteria: entry.acceptanceCriteria, workItems, phases };
}
export function workPlanStructureFromBody(body: string): WorkPlanStructure {
  const matches = [...body.replace(/\r\n?/g, "\n").matchAll(/^```champcity-work-plan[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm)];
  if (matches.length !== 1) throw Error("Plan requires exactly one champcity-work-plan domain block.");
  return validateWorkPlanStructure(JSON.parse(matches[0][1]));
}
