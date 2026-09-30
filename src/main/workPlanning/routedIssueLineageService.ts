import fs from "node:fs";
import type { RoutedIssueLineage } from "../../shared/routedIssueLineageContracts";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { resolveRepositoryPath } from "../repository/pathPolicy";
import { issueEvidenceBytes, workIssueHandoffPath } from "./workIssueContext";

const intakePattern = /^intake-[a-f0-9-]{36}$/;
const decisionPattern = /^decision-[a-f0-9-]{36}$/;

function directories(root: string, relativePath: string): string[] {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath || !fs.existsSync(resolved.resolvedPath)) return [];
  const entries = fs.readdirSync(resolved.resolvedPath, { withFileTypes: true });
  if (entries.length > 1000) throw Error("Routed Issue lineage inventory exceeds its bounded limit.");
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

/** Read the canonical routed Issue handoff, including after renderer state is lost. */
export function getRoutedIssueLineage(root: string, issueId: string): RoutedIssueLineage | null {
  if (!/^ISSUE_\d+$/.test(issueId)) throw Error("Invalid Issue identity.");
  let match: RoutedIssueLineage | null = null;
  for (const intakeId of directories(root, "planning/work-intake/issues")) {
    if (!intakePattern.test(intakeId)) continue;
    for (const routeDecisionId of directories(root, `planning/work-intake/issues/${intakeId}`)) {
      if (!decisionPattern.test(routeDecisionId)) continue;
      const handoffPath = workIssueHandoffPath(intakeId, routeDecisionId);
      const content = issueEvidenceBytes(root, handoffPath);
      if (!content) continue;
      const document = parseCanonicalMarkdownDocument(content);
      if (document.metadata.artifactType !== "work-intake-issue-handoff" ||
        document.metadata.identity.intakeId !== intakeId || document.metadata.identity.routeDecisionId !== routeDecisionId ||
        document.metadata.identity.routeId !== "issue-resolution") throw Error("Routed Issue handoff identity is invalid.");
      if (document.metadata.identity.issueId !== issueId) continue;
      if (match) throw Error("Issue has conflicting routed Work Intake lineage.");
      match = { issueId, intakeId, routeDecisionId, handoffPath };
    }
  }
  return match;
}
