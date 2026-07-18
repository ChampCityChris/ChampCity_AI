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
  /comparePhaseIds|REPAIR\\d|match\(|\.find\(|\[[0-9]+\]|relationship_resolver_blocked|nonAuthoritativeBlockedOutputId/,
  "must remain a thin adapter without parsed IDs, regex repair categorization, or synthetic blocked outputs.",
);
reject(
  "src/main/workflow/canonicalRoutedScreenAdapter.ts",
  /\.find\(|\[[0-9]+\]/,
  "must resolve routed-screen artifacts by exact cardinality, not first-match selection.",
);
reject(
  "src/main/workflow/normalizedWorkflowDomainAdapter.ts",
  /REPAIR\\d|match\(|\.find\(|\[[0-9]+\]/,
  "must normalize explicit identities without regex repair categorization, first-match selection, or order-derived authority.",
);
reject(
  "src/shared/workflow/workflowKernel.ts",
  /REPAIR\\d|match\(|\.find\(|\[[0-9]+\]/,
  "must resolve from typed domain objects without regex repair categorization or first-match selection.",
);
reject(
  "src/main/workflow/routedProcessInvocationService.ts",
  /\.find\(|\[[0-9]+\]/,
  "must authorize routed IPC variants by exact cardinality, not first-match selection.",
);
reject(
  "src/shared/workflow/transitionEngine.ts",
  /\.find\(|\[[0-9]+\]/,
  "must remain a generated/presentation transition adapter without first-match selection.",
);
reject(
  "src/shared/workflow/processContract.ts",
  /function\s+runtimeAction\s*\(/,
  "must generate process-contract runtime action views from the single action catalog.",
);
requireIncludes(
  "src/shared/workflow/workflowDomain.ts",
  /workflowWorkCardKinds[\s\S]*planned_candidate[\s\S]*repair[\s\S]*replacement_candidate/,
  "must define the exact code-owned Work Card taxonomy.",
);
requireIncludes(
  "src/shared/workflow/workflowKernel.ts",
  /export\s+function\s+resolveWorkflowKernel/,
  "must expose a pure workflow kernel.",
);
requireIncludes(
  "src/main/workflow/normalizedWorkflowDomainAdapter.ts",
  /export\s+function\s+normalizeWorkflowDomain/,
  "must normalize verified graph evidence into a typed workflow domain.",
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
if (JSON.stringify(candidates) !== JSON.stringify(["WC01", "WC02", "WC03"])) {
  failures.push("planning/phases/phase-06/Work_Card_Plan.json: WC03 must be the explicit replacement candidate and repairs must not be plan candidates.");
}
function exactCandidate(candidateId) {
  const matches = plan.payload.data.candidates.filter((candidate) => candidate.id === candidateId);
  if (matches.length !== 1) return null;
  let selected = null;
  for (const match of matches) selected = match;
  return selected;
}
const wc02 = exactCandidate("WC02");
const wc03 = exactCandidate("WC03");
if (
  wc02?.status !== "superseded_by_replacement_candidate" ||
  wc02?.replacementArtifactId !== "champcity-ai/phase-06/work_card/WC03" ||
  wc03?.kind !== "replacement_candidate" ||
  wc03?.replacesArtifactId !== "champcity-ai/phase-06/work_card/WC02"
) {
  failures.push("planning/phases/phase-06/Work_Card_Plan.json: WC02/WC03 replacement lineage is not explicit.");
}

const repair = JSON.parse(read("planning/phases/phase-06/Work_Cards/WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.json"));
if (
  repair.payload.data.repairSequence !== 3 ||
  repair.payload.data.priorRepairWorkCardArtifactId !== "champcity-ai/phase-06/work_card/WC02-REPAIR02" ||
  repair.payload.data.authorizingDispositionArtifactId !== "champcity-ai/phase-06/candidate_disposition/WC02"
) {
  failures.push("planning/phases/phase-06/Work_Cards/WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.json: repair lineage fields are incomplete.");
}

const replacement = JSON.parse(read("planning/phases/phase-06/Work_Cards/WC03_deterministic_workflow_domain_and_kernel_replacement.json"));
if (
  replacement.payload.data.workCardKind !== "replacement_candidate" ||
  replacement.payload.data.replacesWorkCardArtifactId !== "champcity-ai/phase-06/work_card/WC02" ||
  replacement.payload.data.authorizingCandidateDispositionArtifactId !== "champcity-ai/phase-06/candidate_disposition/WC02" ||
  replacement.payload.data.expectedImplementerReportArtifactId !== "champcity-ai/phase-06/implementer_report/WC03"
) {
  failures.push("planning/phases/phase-06/Work_Cards/WC03_deterministic_workflow_domain_and_kernel_replacement.json: WC03 replacement identity is incomplete.");
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("WC02-REPAIR03 workflow gates passed.\n");
}
