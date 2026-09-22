import fs from "node:fs";
import { createHash } from "node:crypto";
import type { IntegrationCompletionEvidence } from "../../shared/integrationCompletionContracts";
import type { LifecycleEvidenceBoundary } from "../../shared/lifecycleEvidenceCheckpointContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { getWorkRouteDecision } from "../workIntake/workRouteDecisionService";
import { workPlanningKernel } from "../workPlanning/workPlanningKernel";
import { checkpointLifecycleEvidence } from "./lifecycleEvidenceCheckpointService";

export async function resolveResearchCompletion(root: string, intakeId: string) {
  const intake = readWorkIntake(root, intakeId);
  const binding = await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId: intake.branchBinding.repositoryId }).verify(intake.branchBinding);
  const route = await getWorkRouteDecision(root, intakeId);
  const planning = await workPlanningKernel.get(root, intakeId, "assessment");
  const assessment = planning.artifact;
  if (route.state !== "selected" || route.selection?.selectedRouteId !== "research-prototype" || planning.routeId !== "research-prototype" ||
    planning.researchClosed !== true || !assessment || assessment.stale || assessment.disposition !== "Approved" ||
    assessment.identity.intakeId !== intakeId || assessment.identity.routeId !== "research-prototype" ||
    assessment.identity.routeDecisionId !== route.selection.decisionId || typeof assessment.identity.assessmentId !== "string" ||
    assessment.researchOutcome?.outcome !== "no-implementation-plan-required") {
    throw Error("Research completion requires the exact current approved no-Plan Assessment.");
  }
  const resolved = resolveRepositoryPath(root, assessment.relativePath);
  if (resolved.relativePath !== assessment.relativePath) throw Error("Research completion path must be exact repository-relative evidence.");
  const stat = fs.lstatSync(resolved.resolvedPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4_000_000) throw Error("Research completion evidence must be bounded canonical Markdown.");
  const completion: IntegrationCompletionEvidence = {
    kind: "research",
    routeDecisionId: route.selection.decisionId,
    completionId: assessment.identity.assessmentId,
    revision: assessment.artifactRevision,
    fingerprint: createHash("sha256").update(fs.readFileSync(resolved.resolvedPath)).digest("hex"),
    sourcePath: assessment.relativePath,
  };
  const boundary: Extract<LifecycleEvidenceBoundary, { kind: "research" }> = {
    kind: "research", routeDecisionId: completion.routeDecisionId, assessmentId: completion.completionId, assessmentRevision: completion.revision,
  };
  return { binding, completion, boundary, artifacts: { assessmentPath: completion.sourcePath, routeDecisionPath: route.relativePath } };
}

export async function checkpointResearchCompletion(root: string, intakeId: string, synchronize = false) {
  const resolved = await resolveResearchCompletion(root, intakeId);
  const checkpoint = await checkpointLifecycleEvidence(root, { binding: resolved.binding, boundary: resolved.boundary, artifacts: resolved.artifacts, synchronize });
  return { completion: resolved.completion, checkpoint };
}
