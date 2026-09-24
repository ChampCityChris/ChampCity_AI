export const WORKFLOW_TYPE_IDS = Object.freeze([
  "project-creation",
  "feature-capability",
  "refactor-migration",
  "integration-composition",
  "infrastructure-platform",
  "research-prototype",
  "issue-resolution",
  "work-intake-routing",
] as const);

export type WorkflowType = (typeof WORKFLOW_TYPE_IDS)[number];

export interface WorkflowTypeDefinition {
  readonly workflowType: WorkflowType;
  readonly label: string;
  readonly repeatable: boolean;
}

const definitions = {
  "project-creation": { workflowType: "project-creation", label: "Project Creation / Greenfield", repeatable: false },
  "feature-capability": { workflowType: "feature-capability", label: "Feature / Capability", repeatable: true },
  "refactor-migration": { workflowType: "refactor-migration", label: "Refactor / Migration", repeatable: true },
  "integration-composition": { workflowType: "integration-composition", label: "Integration / Composition", repeatable: true },
  "infrastructure-platform": { workflowType: "infrastructure-platform", label: "Infrastructure / Platform", repeatable: true },
  "research-prototype": { workflowType: "research-prototype", label: "Research / Prototype", repeatable: true },
  "issue-resolution": { workflowType: "issue-resolution", label: "Issue Resolution", repeatable: true },
  "work-intake-routing": { workflowType: "work-intake-routing", label: "Work Intake Routing", repeatable: true },
} satisfies Record<WorkflowType, WorkflowTypeDefinition>;

export const WORKFLOW_TYPE_REGISTRY: Readonly<Record<WorkflowType, WorkflowTypeDefinition>> = Object.freeze(
  Object.fromEntries(
    WORKFLOW_TYPE_IDS.map(workflowType => [workflowType, Object.freeze(definitions[workflowType])]),
  ) as Record<WorkflowType, WorkflowTypeDefinition>,
);

const workflowTypeSet: ReadonlySet<string> = new Set(WORKFLOW_TYPE_IDS);

export function isWorkflowType(value: unknown): value is WorkflowType {
  return typeof value === "string" && workflowTypeSet.has(value);
}

export function getWorkflowTypeDefinition(value: unknown): WorkflowTypeDefinition | undefined {
  return isWorkflowType(value) ? WORKFLOW_TYPE_REGISTRY[value] : undefined;
}
