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
  readonly entryWorkspace: string;
  readonly directStart: boolean;
  readonly hubOrder: number;
  readonly startLabel?: string;
}

const definitions = {
  "project-creation": { workflowType: "project-creation", label: "Project Creation / Greenfield", repeatable: false, entryWorkspace: "project-intake", directStart: false, hubOrder: 0 },
  "feature-capability": { workflowType: "feature-capability", label: "Feature / Capability", repeatable: true, entryWorkspace: "feature-intake", directStart: true, hubOrder: 1, startLabel: "Start Feature" },
  "refactor-migration": { workflowType: "refactor-migration", label: "Refactor / Migration", repeatable: true, entryWorkspace: "refactor-intake", directStart: true, hubOrder: 2, startLabel: "Start Migration" },
  "integration-composition": { workflowType: "integration-composition", label: "Integration / Composition", repeatable: true, entryWorkspace: "integration-intake", directStart: true, hubOrder: 3, startLabel: "Start Integration" },
  "infrastructure-platform": { workflowType: "infrastructure-platform", label: "Infrastructure / Platform", repeatable: true, entryWorkspace: "infrastructure-intake", directStart: true, hubOrder: 4, startLabel: "Start Infrastructure Work" },
  "research-prototype": { workflowType: "research-prototype", label: "Research / Prototype", repeatable: true, entryWorkspace: "research-intake", directStart: true, hubOrder: 5, startLabel: "Start Research" },
  "issue-resolution": { workflowType: "issue-resolution", label: "Issue Resolution", repeatable: true, entryWorkspace: "issue-intake", directStart: true, hubOrder: 6, startLabel: "New Issue" },
  "work-intake-routing": { workflowType: "work-intake-routing", label: "Work Intake Routing", repeatable: true, entryWorkspace: "work-intake", directStart: false, hubOrder: 7 },
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

const routeToWorkflow = Object.freeze({
  "feature-change": "feature-capability",
  "refactor-migration": "refactor-migration",
  "integration-composition": "integration-composition",
  "infrastructure-platform": "infrastructure-platform",
  "research-prototype": "research-prototype",
  "issue-resolution": "issue-resolution",
} as const satisfies Partial<Record<import("./domainContracts").WorkRoute, WorkflowType>>);

export type ExistingProjectWorkRoute = keyof typeof routeToWorkflow;
export const WIR_ROUTE_TO_WORKFLOW_TYPE: Readonly<typeof routeToWorkflow> = routeToWorkflow;

/** Unknown and greenfield routes have no Existing-Project Workflow mapping. */
export function workflowTypeForWorkRoute(value: unknown): WorkflowType | undefined {
  return typeof value === "string" && Object.hasOwn(routeToWorkflow, value)
    ? routeToWorkflow[value as ExistingProjectWorkRoute]
    : undefined;
}
