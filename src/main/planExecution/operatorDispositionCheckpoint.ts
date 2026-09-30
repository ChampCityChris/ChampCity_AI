import type { LifecycleEvidenceCheckpointResult } from "../../shared/lifecycleEvidenceCheckpointContracts";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { getWorkRouteDecision } from "../workIntake/workRouteDecisionService";
import { checkpointLifecycleEvidence } from "./lifecycleEvidenceCheckpointService";

/** Compatibility path for still-supported canonical workflows under legacy authority. */
export async function checkpointOperatorDisposition(root: string, intakeId: string, decisionId: string,
  paths: string[], issueId?: string): Promise<LifecycleEvidenceCheckpointResult> {
  const intake = readWorkIntake(root, intakeId);
  const route = await getWorkRouteDecision(root, intakeId);
  const governingPaths = ["planning/work-intake/PROJECT.md", intake.relativePath, route.relativePath,
    ...(route.sourceAssessment ? [route.sourceAssessment.path] : [])];
  return checkpointLifecycleEvidence(root, { binding: intake.branchBinding,
    boundary: { kind: "operator-disposition", decisionId, ...(issueId ? { issueId } : {}) },
    artifacts: { paths: [...new Set([...governingPaths, ...paths])].sort() } });
}
