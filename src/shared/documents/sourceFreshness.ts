import type { PlanningDocumentSummary } from "./planningDocument";

export interface FreshnessSourceDiagnostic {
  path: string;
  expectedRevision: number;
  currentRevision?: number;
  state: "missing" | "stale";
}

export type FreshnessEvaluation =
  | { state: "fresh"; staleSources: [] }
  | { state: "stale"; staleSources: FreshnessSourceDiagnostic[] };

export function evaluateFreshnessFromSummaries(
  document: PlanningDocumentSummary,
  documents: PlanningDocumentSummary[],
): FreshnessEvaluation {
  const byPath = new Map<string, PlanningDocumentSummary>();
  for (const candidate of documents) {
    if (candidate.markdownPath) {
      byPath.set(candidate.markdownPath, candidate);
    }
    if (candidate.jsonPath) {
      byPath.set(candidate.jsonPath, candidate);
    }
  }

  const staleSources: FreshnessSourceDiagnostic[] = [];
  for (const source of document.metadata.sourceRevisions ?? []) {
    const current = byPath.get(source.path);
    if (!current) {
      staleSources.push({
        path: source.path,
        expectedRevision: source.revision,
        state: "missing",
      });
      continue;
    }

    const currentRevision = current.metadata.artifactRevision;
    if (currentRevision !== source.revision) {
      staleSources.push({
        path: source.path,
        expectedRevision: source.revision,
        currentRevision,
        state: "stale",
      });
    }
  }

  return staleSources.length === 0
    ? { state: "fresh", staleSources: [] }
    : { state: "stale", staleSources };
}
