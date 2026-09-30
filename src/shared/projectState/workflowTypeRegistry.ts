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
  readonly purpose: string;
  readonly repeatable: boolean;
  readonly entryWorkspace: string;
  readonly directStart: boolean;
  readonly hubOrder: number;
  readonly startLabel?: string;
}

const definitions = {
  "project-creation": { workflowType: "project-creation", label: "Greenfield Project", purpose: "Use to create and guide a brand-new project from initial intake through first project setup.", repeatable: false, entryWorkspace: "project-intake", directStart: false, hubOrder: 1 },
  "feature-capability": { workflowType: "feature-capability", label: "Feature / Capability", purpose: "Use for adding or improving product functionality in an existing project.", repeatable: true, entryWorkspace: "feature-intake", directStart: true, hubOrder: 2, startLabel: "Start Feature" },
  "refactor-migration": { workflowType: "refactor-migration", label: "Refactor / Migration", purpose: "Use for structural changes, internal redesigns, upgrades, or migrations.", repeatable: true, entryWorkspace: "refactor-intake", directStart: true, hubOrder: 3, startLabel: "Start Migration" },
  "integration-composition": { workflowType: "integration-composition", label: "Integration / Composition", purpose: "Use when combining systems, tools, services, or components into a coordinated solution.", repeatable: true, entryWorkspace: "integration-intake", directStart: true, hubOrder: 4, startLabel: "Start Integration" },
  "infrastructure-platform": { workflowType: "infrastructure-platform", label: "Infrastructure / Platform", purpose: "Use for environment, platform, deployment, hosting, tooling, or operational foundation work.", repeatable: true, entryWorkspace: "infrastructure-intake", directStart: true, hubOrder: 6, startLabel: "Start Infrastructure Work" },
  "research-prototype": { workflowType: "research-prototype", label: "Research / Prototype", purpose: "Use to explore ideas, test feasibility, or develop proofs of concept before committed implementation.", repeatable: true, entryWorkspace: "research-intake", directStart: true, hubOrder: 7, startLabel: "Start Research" },
  "issue-resolution": { workflowType: "issue-resolution", label: "Issue Resolution", purpose: "Use to diagnose, repair, and validate defects, regressions, or broken behavior.", repeatable: true, entryWorkspace: "issue-intake", directStart: true, hubOrder: 5, startLabel: "New Issue" },
  "work-intake-routing": { workflowType: "work-intake-routing", label: "Work Intake Routing", purpose: "Use when you are not yet sure which workflow should handle the work.", repeatable: true, entryWorkspace: "work-intake", directStart: false, hubOrder: 0 },
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
