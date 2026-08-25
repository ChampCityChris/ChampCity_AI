export type WorkflowId = "development" | "issue-resolution";

export interface WorkflowDefinition {
  workflowId: WorkflowId;
  label: string;
  description: string;
  iconKey: "bug" | "code";
  entryLabel: string;
  order: number;
  tags: readonly string[];
}

export const workflowDefinitions: readonly WorkflowDefinition[] = [
  {
    workflowId: "development",
    label: "Development",
    description: "Plan, implement, review, and validate planned software development.",
    iconKey: "code",
    entryLabel: "Continue Development",
    order: 10,
    tags: ["Plan", "Build", "Prove"],
  },
  {
    workflowId: "issue-resolution",
    label: "Issue Resolution",
    description: "Investigate and resolve problems in the current project baseline.",
    iconKey: "bug",
    entryLabel: "Open Issue Resolution",
    order: 20,
    tags: ["Investigate", "Fix", "Verify"],
  },
] as const;
