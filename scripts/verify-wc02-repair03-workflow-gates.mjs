#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];

function read(repoPath) {
  return readFileSync(path.join(root, repoPath), "utf8");
}

function reject(repoPath, pattern, message) {
  if (pattern.test(read(repoPath))) {
    failures.push(`${repoPath}: ${message}`);
  }
}

function requireIncludes(repoPath, pattern, message) {
  if (!pattern.test(read(repoPath))) {
    failures.push(`${repoPath}: ${message}`);
  }
}

reject(
  "src/shared/workflow/transitionEngine.ts",
  /export\s+function\s+advanceWorkflowState\b/,
  "must not export a parallel mutable transition engine.",
);
reject(
  "src/renderer/app/WorkflowRouterShell.tsx",
  /actionIdToManualScreen|responsibleRole\s*===\s*"operator"|responsibleRole\s*===\s*"implementer"/,
  "must not use action aliases or role-based default screens.",
);
reject(
  "src/shared/workCards/currentActionRouteTable.ts",
  /project_architect_interview_required|full_work_card_creation_required|operator_work_card_review_required|repair_sub_card_creation_required|new-work-card/,
  "must be generated from canonical catalog entries without compatibility aliases or ad hoc routed screens.",
);
reject(
  "src/main/workflow/processIpcPolicy.ts",
  /architect_review_of_validation_report_required|repair_sub_card_creation_required|repair_validation_required/,
  "must reject obsolete routed IPC aliases.",
);
reject(
  "src/main/workflow/relationshipDrivenWorkflowResolver.ts",
  /work_card_authoring_required",\s*\n\s*workCard\.artifact\.artifactId,\s*\n\s*\[validation\.artifact\.artifactId\]/,
  "must not route validation pass directly to Work Card authoring.",
);
reject(
  "src/main/workflow/relationshipDrivenWorkflowResolver.ts",
  /repairLimitReached|must be the final permitted repair|exactly one controlling repair/,
  "must not retain one-repair/final-repair lineage authority.",
);
requireIncludes(
  "src/shared/workflow/workflowActionCatalog.ts",
  /repair_work_card_required[\s\S]*repair-work-card-authoring/,
  "must define repair authoring in the typed action catalog.",
);
requireIncludes(
  "src/shared/workflow/workflowActionCatalog.ts",
  /work_card_authoring_required[\s\S]*work-card-authoring/,
  "must define planned Work Card authoring in the typed action catalog.",
);

const plan = JSON.parse(read("planning/phases/phase-06/Work_Card_Plan.json"));
const candidates = plan.payload.data.candidates.map((candidate) => candidate.id);
if (JSON.stringify(candidates) !== JSON.stringify(["WC01", "WC02"])) {
  failures.push("planning/phases/phase-06/Work_Card_Plan.json: repairs must not be Work Card Plan candidates.");
}

const repair = JSON.parse(read("planning/phases/phase-06/Work_Cards/WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.json"));
if (
  repair.payload.data.repairSequence !== 3 ||
  repair.payload.data.priorRepairWorkCardArtifactId !== "champcity-ai/phase-06/work_card/WC02-REPAIR02" ||
  repair.payload.data.authorizingDispositionArtifactId !== "champcity-ai/phase-06/candidate_disposition/WC02"
) {
  failures.push("planning/phases/phase-06/Work_Cards/WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.json: repair lineage fields are incomplete.");
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("WC02-REPAIR03 workflow gates passed.\n");
}
