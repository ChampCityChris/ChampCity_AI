#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import {
  scanVerifiedArtifactGraph,
} from "../dist/main/repository/index.js";
import {
  RelationshipDrivenWorkflowResolver,
} from "../dist/main/workflow/relationshipDrivenWorkflowResolver.js";

const root = process.cwd();
const project = {
  projectId: "champcity-ai",
  displayName: "ChampCity_AI",
  repositoryRoot: root,
  planningRoot: path.join(root, "planning"),
  branchBehavior: { mode: "observe-current" },
  enabled: true,
  createdAt: "2026-07-18T04:00:00.000Z",
  updatedAt: "2026-07-18T04:00:00.000Z",
  lastOpenedAt: null,
  lastScanAt: null,
  lastScanResult: null,
  observerStatus: "stopped",
};

const graph = await scanVerifiedArtifactGraph(project, () => "2026-07-18T04:00:00.000Z");
const projection = new RelationshipDrivenWorkflowResolver().resolve(project, graph, 1);
const summary = {
  phase: projection.state.activePhaseId,
  workCard:
    projection.state.currentAction?.targetArtifactId?.split("/").at(-1) ??
    null,
  action: projection.state.currentActionId,
  screen: projection.state.currentAction?.screenId ?? null,
  target: projection.state.authoritativeTargetArtifactId,
  expectedOutput: projection.state.expectedOutput?.artifactId ?? null,
  blockers: projection.state.blockingConditions.map((blocker) => blocker.code),
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

if (process.argv.includes("--expect-final")) {
  const expected = {
    phase: "phase-06",
    workCard: "WC02-REPAIR03",
    action: "architect_review_of_implementer_report_required",
    screen: "architect-review",
    expectedOutput: "champcity-ai/phase-06/architect_review/WC02-REPAIR03",
  };
  const mismatches = Object.entries(expected)
    .filter(([key, value]) => summary[key] !== value)
    .map(([key, value]) => `${key}: expected ${value}, received ${summary[key]}`);
  if (summary.blockers.length > 0) {
    mismatches.push(`blockers: ${summary.blockers.join(", ")}`);
  }
  if (mismatches.length > 0) {
    process.stderr.write(`${mismatches.join("\n")}\n`);
    process.exitCode = 1;
  }
}
