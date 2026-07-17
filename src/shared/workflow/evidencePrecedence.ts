import type { ArtifactStatus } from "../artifacts/artifactEnvelope";
import type { CandidateResolutionStatus, WorkflowBlocker } from "./workflowContracts";

export const candidateEvidenceKinds = [
  "candidate_validation_pass",
  "candidate_validation_failure",
  "architect_repair_disposition",
  "work_card_repair_active",
  "repair_validation_pass",
  "repair_validation_failure",
  "candidate_disposition",
] as const;
export type CandidateEvidenceKind = (typeof candidateEvidenceKinds)[number];

export interface CandidateEvidenceRecord {
  artifactId: string;
  candidateId: string;
  kind: CandidateEvidenceKind;
  /** Explicit authority-chain order. Filesystem order and timestamps are never used. */
  controllingSequence: number;
  status: ArtifactStatus;
  repairArtifactId?: string | null;
  dispositionStatus?: Extract<
    CandidateResolutionStatus,
    "carried_forward" | "deferred" | "cancelled"
  >;
}

export interface CandidateEvidencePrecedenceResult {
  candidateId: string;
  resolutionStatus: CandidateResolutionStatus;
  resolutionEvidenceArtifactIds: string[];
  controllingEvidenceArtifactIds: string[];
  excludedEvidenceArtifactIds: string[];
  activeRepairArtifactId: string | null;
  reopenedByArtifactId: string | null;
  ambiguous: boolean;
  blockers: WorkflowBlocker[];
}

const controllingArtifactStatuses = new Set<ArtifactStatus>([
  "active",
  "pending",
  "blocked",
]);

export function resolveCandidateEvidencePrecedence(
  candidateId: string,
  evidence: readonly CandidateEvidenceRecord[],
): CandidateEvidencePrecedenceResult {
  const relevant = evidence.filter((item) => item.candidateId === candidateId);
  const excluded = relevant.filter(
    (item) => !controllingArtifactStatuses.has(item.status),
  );
  const controlling = relevant.filter((item) =>
    controllingArtifactStatuses.has(item.status),
  );
  const invalid = controlling.filter(
    (item) =>
      !item.artifactId.trim() ||
      !Number.isInteger(item.controllingSequence) ||
      item.controllingSequence < 1,
  );
  const sequences = new Map<number, CandidateEvidenceRecord[]>();
  for (const item of controlling) {
    const sameSequence = sequences.get(item.controllingSequence) ?? [];
    sameSequence.push(item);
    sequences.set(item.controllingSequence, sameSequence);
  }
  const duplicateSequenceEvidence = [...sequences.values()].filter(
    (items) => items.length > 1,
  );
  const ambiguityArtifactIds = uniqueArtifactIds([
    ...invalid.map((item) => item.artifactId),
    ...duplicateSequenceEvidence.flatMap((items) =>
      items.map((item) => item.artifactId),
    ),
  ]);
  if (ambiguityArtifactIds.length > 0) {
    return {
      candidateId,
      resolutionStatus: "unresolved",
      resolutionEvidenceArtifactIds: [],
      controllingEvidenceArtifactIds: controlling
        .map((item) => item.artifactId)
        .sort(),
      excludedEvidenceArtifactIds: excluded
        .map((item) => item.artifactId)
        .sort(),
      activeRepairArtifactId: null,
      reopenedByArtifactId: null,
      ambiguous: true,
      blockers: [
        {
          code: "candidate_authority_ambiguous",
          message:
            "Candidate evidence has a missing, invalid, or duplicate controlling sequence and cannot be ordered by authority.",
          ownerRole: "architect",
          artifactIds: ambiguityArtifactIds,
          blocking: true,
        },
      ],
    };
  }

  const ordered = [...controlling].sort(
    (left, right) => left.controllingSequence - right.controllingSequence,
  );
  let resolutionStatus: CandidateResolutionStatus = "unresolved";
  let resolutionEvidenceArtifactIds: string[] = [];
  let activeRepairArtifactId: string | null = null;
  let reopenedByArtifactId: string | null = null;

  for (const item of ordered) {
    const wasResolved = resolutionStatus !== "unresolved";
    switch (item.kind) {
      case "candidate_validation_pass":
        resolutionStatus = "completed";
        resolutionEvidenceArtifactIds = [item.artifactId];
        activeRepairArtifactId = null;
        break;
      case "repair_validation_pass":
        resolutionStatus = "completed_via_repair";
        resolutionEvidenceArtifactIds = [item.artifactId];
        activeRepairArtifactId = null;
        break;
      case "candidate_validation_failure":
      case "repair_validation_failure":
        resolutionStatus = "unresolved";
        resolutionEvidenceArtifactIds = [];
        activeRepairArtifactId = item.repairArtifactId ?? activeRepairArtifactId;
        if (wasResolved) reopenedByArtifactId = item.artifactId;
        break;
      case "architect_repair_disposition":
        resolutionStatus = "unresolved";
        resolutionEvidenceArtifactIds = [];
        activeRepairArtifactId = item.repairArtifactId ?? null;
        if (wasResolved) reopenedByArtifactId = item.artifactId;
        break;
      case "work_card_repair_active":
        resolutionStatus = "unresolved";
        resolutionEvidenceArtifactIds = [];
        activeRepairArtifactId = item.repairArtifactId ?? item.artifactId;
        if (wasResolved) reopenedByArtifactId = item.artifactId;
        break;
      case "candidate_disposition":
        if (!item.dispositionStatus) {
          return ambiguityResult(
            candidateId,
            controlling,
            excluded,
            item.artifactId,
            "Candidate disposition evidence is missing its governed disposition status.",
          );
        }
        resolutionStatus = item.dispositionStatus;
        resolutionEvidenceArtifactIds = [item.artifactId];
        activeRepairArtifactId = null;
        break;
    }
  }

  return {
    candidateId,
    resolutionStatus,
    resolutionEvidenceArtifactIds,
    controllingEvidenceArtifactIds: ordered.map((item) => item.artifactId),
    excludedEvidenceArtifactIds: excluded.map((item) => item.artifactId).sort(),
    activeRepairArtifactId,
    reopenedByArtifactId,
    ambiguous: false,
    blockers: [],
  };
}

function ambiguityResult(
  candidateId: string,
  controlling: readonly CandidateEvidenceRecord[],
  excluded: readonly CandidateEvidenceRecord[],
  artifactId: string,
  message: string,
): CandidateEvidencePrecedenceResult {
  return {
    candidateId,
    resolutionStatus: "unresolved",
    resolutionEvidenceArtifactIds: [],
    controllingEvidenceArtifactIds: controlling
      .map((item) => item.artifactId)
      .sort(),
    excludedEvidenceArtifactIds: excluded
      .map((item) => item.artifactId)
      .sort(),
    activeRepairArtifactId: null,
    reopenedByArtifactId: null,
    ambiguous: true,
    blockers: [
      {
        code: "candidate_authority_ambiguous",
        message,
        ownerRole: "architect",
        artifactIds: [artifactId],
        blocking: true,
      },
    ],
  };
}

function uniqueArtifactIds(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((item) => item.trim()))).sort();
}
