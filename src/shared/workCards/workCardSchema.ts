export const workCardStatuses = [
  "draft",
  "ready_for_architect",
  "ready_for_builder",
  "in_builder_pass",
  "builder_report_received",
  "needs_repair",
  "validated",
  "closed",
] as const;

export type WorkCardStatus = (typeof workCardStatuses)[number];

export const workCardRiskLevels = ["low", "medium", "high"] as const;

export type WorkCardRiskLevel = (typeof workCardRiskLevels)[number];

export interface WorkCard {
  workCardId: string;
  title: string;
  phase: string;
  status: WorkCardStatus;
  createdAt: string;
  updatedAt: string;
  problem: string;
  goal: string;
  userOutcome: string;
  scope: string[];
  outOfScope: string[];
  requirements: string[];
  acceptanceCriteria: string[];
  validationPlan: string[];
  riskLevel: WorkCardRiskLevel;
  risks: string[];
  builderInstructions: string[];
  operatorNotes: string[];
}
