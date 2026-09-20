import fs from "node:fs";
import { createHash } from "node:crypto";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";

export function sourceDigestsCurrent(root: string, document: PlanningDocumentSummary): boolean {
  const digests = document.metadata.canonical?.workflowData.sourceDigests;
  if (!digests || typeof digests !== "object" || Array.isArray(digests)) return false;
  try {
    return (document.metadata.sourceRevisions ?? []).every((source) => {
      const resolved = resolveRepositoryPath(root, source.path);
      return resolved.relativePath === source.path && (digests as Record<string, unknown>)[source.path] === createHash("sha256").update(fs.readFileSync(resolved.resolvedPath)).digest("hex");
    });
  } catch { return false; }
}
