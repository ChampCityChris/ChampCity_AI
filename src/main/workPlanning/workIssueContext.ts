import { createHash } from "node:crypto";
import fs from "node:fs";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";

export function workIssueHandoffPath(intakeId: string, decisionId: string): string {
  if (!/^intake-[a-f0-9-]{36}$/.test(intakeId) || !/^decision-[a-f0-9-]{36}$/.test(decisionId)) throw Error("Invalid routed Issue identity.");
  return `planning/work-intake/issues/${intakeId}/${decisionId}/HANDOFF.md`;
}
export function issueEvidenceBytes(root: string, relativePath: string): string | null {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath) throw Error("Issue evidence must not be redirected.");
  if (!fs.existsSync(resolved.resolvedPath)) return null;
  if (!fs.statSync(resolved.resolvedPath).isFile() || fs.statSync(resolved.resolvedPath).size > 1_000_000) throw Error("Issue evidence must be bounded Markdown.");
  return fs.readFileSync(resolved.resolvedPath, "utf8");
}
export const issueEvidenceDigest = (content: string | null) => content === null ? "missing" : createHash("sha256").update(content).digest("hex");
export function workIssueContext(root: string, intakeId: string, decisionId: string) {
  const relativePath = workIssueHandoffPath(intakeId, decisionId);
  const content = issueEvidenceBytes(root, relativePath);
  if (!content) return null;
  const document = parseCanonicalMarkdownDocument(content);
  const issueId = document.metadata.identity.issueId;
  if (document.metadata.artifactType !== "work-intake-issue-handoff" || document.metadata.identity.intakeId !== intakeId ||
    document.metadata.identity.routeDecisionId !== decisionId || document.metadata.identity.routeId !== "issue-resolution" || document.metadata.participationRole === "historical" || typeof issueId !== "string" || !/^ISSUE_\d+$/.test(issueId)) throw Error("Issue handoff is superseded or conflicts with the selected Intake.");
  const paths = [`issues/${issueId}/ISSUE_RECORD.md`, `issues/${issueId}/ARCHITECT_INVESTIGATION.md`, `issues/${issueId}/ARCHITECT_REVIEW.md`];
  return { issueId, relativePath, document, source: { path: relativePath, revision: document.metadata.artifactRevision }, paths,
    evidenceDigests: Object.fromEntries(paths.map((item) => [item, issueEvidenceDigest(issueEvidenceBytes(root, item))])) };
}
