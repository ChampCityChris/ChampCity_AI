import { createHash } from "node:crypto";
import { AgentHarnessError } from "../agentHarness/core/errors";

export function workIntakeBranchName(intakeId: string): string {
  if (typeof intakeId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(intakeId)) {
    throw new AgentHarnessError("INVALID_INPUT", "Work Intake identity must be a bounded identifier.");
  }
  const slug = intakeId.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48).replace(/-+$/, "");
  const digest = createHash("sha256").update(intakeId).digest("hex").slice(0, 24);
  return `work-intake/${slug}-${digest}`;
}
