import { createHash } from "node:crypto";
import { AgentHarnessError } from "../core/applicationErrors";

export function workIntakeBranchName(intakeId: string): string {
  if (typeof intakeId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(intakeId)) {
    throw new AgentHarnessError("INVALID_INPUT", "Work Intake identity must be a bounded identifier.");
  }
  const slug = intakeId.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48).replace(/-+$/, "");
  const digest = createHash("sha256").update(intakeId).digest("hex").slice(0, 24);
  return `work-intake/${slug}-${digest}`;
}

export function workflowSourceLineName(workflowId: string): string {
  if (typeof workflowId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(workflowId)) {
    throw new AgentHarnessError("INVALID_INPUT", "Workflow identity must be a canonical lowercase UUID.");
  }
  return `workflow/${workflowId}`;
}
