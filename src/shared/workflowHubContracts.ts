export type WorkflowId = "development";

export interface WorkflowDefinition {
  workflowId: WorkflowId;
  label: string;
  description: string;
  iconKey: "code";
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
] as const;
