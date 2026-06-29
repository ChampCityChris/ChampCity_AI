import type { PhaseArtifactFolderSummary, PhaseWorkCardArtifactPair } from "./phaseCloseout";
import type { PhaseCloseoutRecord } from "./phaseCloseoutRecord";
import { validatePhaseCloseoutRecord } from "./phaseCloseoutRecord";

export const phaseCloseoutNonMutatingNote =
  "This Phase Closeout record does not mutate Work Cards, change Work Card status or risk level, create release tags, push to GitHub, package the app, deploy anything, or start the next phase by itself.";

export function renderPhaseCloseoutMarkdown(
  record: PhaseCloseoutRecord,
): string {
  const validation = validatePhaseCloseoutRecord(record);

  if (!validation.valid) {
    throw new Error(
      `Cannot render invalid Phase Closeout record: ${validation.errors.join("; ")}`,
    );
  }

  return [
    `# Phase Closeout Report - ${record.phase}`,
    "",
    "## Phase",
    "",
    record.phase,
    "",
    "## Closeout Decision",
    "",
    record.decision,
    "",
    "## Deterministic Recommendation",
    "",
    record.deterministicRecommendation,
    "",
    "## Artifact Summary",
    "",
    renderArtifactSummary(record.artifactSummary.folders),
    "",
    "## Work Card Pairing Status",
    "",
    renderWorkCardPairingStatus(record.artifactSummary.workCardsWithBothJsonAndMarkdown),
    "",
    "## Missing Or Warning Observations",
    "",
    formatList(record.artifactSummary.missingExpectedArtifactObservations),
    "",
    "## Completed Items",
    "",
    formatText(record.completedItems),
    "",
    "## Remaining Items",
    "",
    formatText(record.remainingItems),
    "",
    "## Known Risks",
    "",
    formatText(record.knownRisks),
    "",
    "## Operator Notes",
    "",
    formatText(record.operatorNotes),
    "",
    "## Recommended Next Action",
    "",
    formatText(record.recommendedNextAction),
    "",
    "## Generated Timestamp",
    "",
    record.createdAt,
    "",
    "## Non-Mutating Note",
    "",
    phaseCloseoutNonMutatingNote,
    "",
  ].join("\n");
}

function renderArtifactSummary(folders: PhaseArtifactFolderSummary[]): string {
  return folders
    .map((folder) => `- ${folder.folder}: ${folder.count}`)
    .join("\n");
}

function renderWorkCardPairingStatus(
  pairs: PhaseWorkCardArtifactPair[],
): string {
  if (pairs.length === 0) {
    return "- No Work Card JSON/Markdown pairs were found.";
  }

  return pairs
    .map(
      (pair) =>
        `- ${pair.workCardId}: ${pair.jsonFileName ?? "missing JSON"} + ${
          pair.markdownFileName ?? "missing Markdown"
        }`,
    )
    .join("\n");
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- No missing or warning observations detected.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function formatText(value: string): string {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : "None recorded.";
}
