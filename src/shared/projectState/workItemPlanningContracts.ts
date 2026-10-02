import type {WorkItemDecompositionInput, WorkflowPlanningGraph} from "./projectStateService";
export interface WorkItemPlanningContract {
  workflowId: string; workItemId: string; expectedVersion: number;
  implementationBoundaries: string[]; affectedPaths: string[]; proofIntent: string[];
  criteria?: WorkflowPlanningGraph["solutionCriteria"];
  decomposition?: Omit<WorkItemDecompositionInput, "workflowId" | "workItemId" | "expectedWorkItemVersion">;
}
export function validateWorkItemPlanningContract(value: unknown): WorkItemPlanningContract {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Typed WorkItem planning contract required.");
  const input = value as WorkItemPlanningContract;
  if (Object.keys(input).some(key => !["workflowId", "workItemId", "expectedVersion", "implementationBoundaries", "affectedPaths", "proofIntent", "criteria", "decomposition"].includes(key)) || typeof input.workflowId !== "string" || !input.workflowId.trim() || input.workflowId.length > 128 || typeof input.workItemId !== "string" || !input.workItemId.trim() || input.workItemId.length > 128 || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw Error("Exact Workflow, WorkItem and expected version required.");
  const list = (values: unknown, min: number, max: number, label: string): string[] => {
    if (!Array.isArray(values) || values.length < min || values.length > max || values.some(value => typeof value !== "string" || !value.trim() || value.length > 512)) throw Error(`${label} must contain ${min}..${max} bounded text entries.`);
    return values.map(value => value.trim());
  };
  const implementationBoundaries = list(input.implementationBoundaries, 1, 32, "Implementation boundaries"), proofIntent = list(input.proofIntent, 1, 32, "Proof intent"), affectedPaths = list(input.affectedPaths, 0, 128, "Affected paths");
  if (new Set(affectedPaths).size !== affectedPaths.length || affectedPaths.some(value => value.startsWith("/") || /^[A-Za-z]:/.test(value) || value.includes("\\") || value.split("/").some(part => !part || part === "." || part === "..") || /(^|\/)(\.git|\.champcity|\.codex|node_modules|dist|build|out|coverage|\.env[^/]*|secrets?|credentials?)(\/|$)/i.test(value) || /(^|\/)(id_rsa|[^/]+\.(pem|key|p12|pfx)|[^/]*token[^/]*|[^/]*secret[^/]*)(\/|$)/i.test(value))) throw Error("Affected paths must be unique normalized repository-relative source paths without runtime, output or secret paths.");
  if (input.criteria !== undefined && (!Array.isArray(input.criteria) || input.criteria.length > 64)) throw Error("Bounded typed WorkItem Criteria required.");
  if (input.decomposition !== undefined && (!input.decomposition || typeof input.decomposition !== "object" || Array.isArray(input.decomposition) || !Array.isArray(input.decomposition.replacements) || input.decomposition.replacements.length < 2 || input.decomposition.replacements.length > 32 || !Array.isArray(input.decomposition.criterionDispositions) || !Array.isArray(input.decomposition.incomingDependentMappings))) throw Error("Optional decomposition must use the typed replacement, Criterion and dependency mapping contract.");
  return {...input, implementationBoundaries, affectedPaths, proofIntent};
}
export function parseWorkItemPlanningJson(json: string): WorkItemPlanningContract {
  if (typeof json !== "string" || new TextEncoder().encode(json).length > 200000) throw Error("Bounded Architect WorkItem JSON required.");
  return validateWorkItemPlanningContract(JSON.parse(json));
}
