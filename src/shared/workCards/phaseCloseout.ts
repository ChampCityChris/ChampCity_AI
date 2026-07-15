import { validateSafePhaseFolder } from "./workCardFileNames";

export const phaseArtifactFolderNames = [
  "Work_Cards",
  "Architect_Prompts",
  "Risk_Reviews",
  "Implementer_Execution_Packets",
  "Implementer_Reports",
  "Validation_Reports",
  "Repair_Prompts",
  "Closeout_Reports",
] as const;

export type PhaseArtifactFolderName =
  (typeof phaseArtifactFolderNames)[number];

export interface PhaseArtifactFolderSummary {
  folder: PhaseArtifactFolderName;
  count: number;
  fileNames: string[];
}

export interface PhaseWorkCardArtifactPair {
  workCardId: string;
  stem: string;
  jsonFileName?: string;
  markdownFileName?: string;
}

export type PhaseArtifactFilesByFolder = Record<
  PhaseArtifactFolderName,
  string[]
>;

export interface PhaseArtifactSummary {
  phase: string;
  folders: PhaseArtifactFolderSummary[];
  artifactCounts: Record<PhaseArtifactFolderName, number>;
  workCardCount: number;
  workCardsWithBothJsonAndMarkdown: PhaseWorkCardArtifactPair[];
  workCardsMissingJson: PhaseWorkCardArtifactPair[];
  workCardsMissingMarkdown: PhaseWorkCardArtifactPair[];
  implementerReportCount: number;
  implementerExecutionPacketCount: number;
  architectPromptCount: number;
  riskReviewCount: number;
  validationReportCount: number;
  repairPromptCount: number;
  closeoutReportCount: number;
  latestCloseoutReportFileName?: string;
  missingExpectedArtifactObservations: string[];
  deterministicRecommendation: string;
}

export interface PhaseArtifactInventory {
  phase: string;
  filesByFolder: PhaseArtifactFilesByFolder;
}

export const phaseCloseoutReadyRecommendation =
  "Phase appears ready for closeout review.";

export function createEmptyPhaseArtifactFiles(): PhaseArtifactFilesByFolder {
  return phaseArtifactFolderNames.reduce((folders, folder) => {
    folders[folder] = [];
    return folders;
  }, {} as PhaseArtifactFilesByFolder);
}

export function summarizePhaseArtifacts(
  inventory: PhaseArtifactInventory,
): PhaseArtifactSummary {
  const phase = inventory.phase.trim();
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const filesByFolder = normalizeFilesByFolder(inventory.filesByFolder);
  const folders = phaseArtifactFolderNames.map((folder) => ({
    folder,
    count: filesByFolder[folder].length,
    fileNames: filesByFolder[folder],
  }));
  const artifactCounts = folders.reduce((counts, folder) => {
    counts[folder.folder] = folder.count;
    return counts;
  }, {} as Record<PhaseArtifactFolderName, number>);
  const workCardPairs = pairWorkCardArtifacts(filesByFolder.Work_Cards);
  const workCardsWithBothJsonAndMarkdown = workCardPairs.filter(
    (pair) => pair.jsonFileName && pair.markdownFileName,
  );
  const workCardsMissingJson = workCardPairs.filter(
    (pair) => !pair.jsonFileName,
  );
  const workCardsMissingMarkdown = workCardPairs.filter(
    (pair) => !pair.markdownFileName,
  );
  const missingExpectedArtifactObservations =
    buildMissingExpectedArtifactObservations({
      phase,
      workCardPairs,
      implementerReportFileNames: filesByFolder.Implementer_Reports,
      validationReportCount: filesByFolder.Validation_Reports.length,
      repairPromptCount: filesByFolder.Repair_Prompts.length,
      closeoutReportFileNames: filesByFolder.Closeout_Reports,
    });

  const summaryWithoutRecommendation: Omit<
    PhaseArtifactSummary,
    "deterministicRecommendation"
  > = {
    phase,
    folders,
    artifactCounts,
    workCardCount: workCardPairs.length,
    workCardsWithBothJsonAndMarkdown,
    workCardsMissingJson,
    workCardsMissingMarkdown,
    implementerReportCount: filesByFolder.Implementer_Reports.length,
    implementerExecutionPacketCount: filesByFolder.Implementer_Execution_Packets.length,
    architectPromptCount: filesByFolder.Architect_Prompts.length,
    riskReviewCount: filesByFolder.Risk_Reviews.length,
    validationReportCount: filesByFolder.Validation_Reports.length,
    repairPromptCount: filesByFolder.Repair_Prompts.length,
    closeoutReportCount: filesByFolder.Closeout_Reports.length,
    latestCloseoutReportFileName:
      filesByFolder.Closeout_Reports[filesByFolder.Closeout_Reports.length - 1],
    missingExpectedArtifactObservations,
  };

  return {
    ...summaryWithoutRecommendation,
    deterministicRecommendation: buildPhaseCloseoutRecommendation(
      summaryWithoutRecommendation,
    ),
  };
}

export function buildPhaseCloseoutRecommendation(
  summary: Omit<PhaseArtifactSummary, "deterministicRecommendation">,
  decision?: string,
): string {
  const recommendations: string[] = [];
  const hasMissingWorkCardPairs =
    summary.workCardsMissingJson.length > 0 ||
    summary.workCardsMissingMarkdown.length > 0 ||
    summary.missingExpectedArtifactObservations.some((observation) =>
      /Work Card .*missing/i.test(observation),
    );

  if (hasMissingWorkCardPairs) {
    recommendations.push(
      "Phase has missing Work Card JSON/Markdown pairs. Repair before closeout.",
    );
  } else {
    recommendations.push(phaseCloseoutReadyRecommendation);
  }

  if (summary.repairPromptCount > 0) {
    recommendations.push(
      "Phase has repair prompts. Review repairs before closing.",
    );
  }

  if (summary.validationReportCount === 0) {
    recommendations.push(
      "Phase lacks validation reports. Confirm manual validation evidence before closing.",
    );
  }

  if (decision === "Needs UI cleanup") {
    recommendations.push("Phase may be ready for UI cleanup.");
  }

  if (decision === "Ready for release/package pass") {
    recommendations.push(
      "Phase may be ready for release/package readiness pass.",
    );
  }

  if (decision === "Ready for next phase") {
    recommendations.push(
      "Phase may be ready for next phase planning after human closeout review.",
    );
  }

  if (decision === "Close phase") {
    recommendations.push(
      "Closeout decision is recorded for human review; this record does not close Work Cards automatically.",
    );
  }

  return recommendations.join(" ");
}

export function getExpectedWorkCardIdsForPhase(phase: string): string[] {
  if (phase.trim() !== "phase-01") {
    return [];
  }

  return Array.from({ length: 10 }, (_value, index) =>
    `WC${String(index + 1).padStart(2, "0")}`,
  );
}

export function getAllowedPhaseArtifactExtensions(
  folder: PhaseArtifactFolderName,
): string[] {
  if (
    folder === "Work_Cards" ||
    folder === "Validation_Reports" ||
    folder === "Closeout_Reports"
  ) {
    return [".json", ".md"];
  }

  return [".md"];
}

export function validatePhaseArtifactFileName(
  fileName: string,
  allowedExtensions: string[],
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Artifact filename must not be blank."];
  }

  if (/[\\/]/.test(value) || value.includes("..")) {
    return ["Artifact filenames must not include folders."];
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\.[A-Za-z0-9]+$/.test(value)) {
    return [
      "Artifact filenames must use only letters, numbers, hyphens, underscores, and a file extension.",
    ];
  }

  if (
    !allowedExtensions.some((extension) =>
      value.toLowerCase().endsWith(extension),
    )
  ) {
    return [
      `Artifact filename must use one of these extensions: ${allowedExtensions.join(", ")}.`,
    ];
  }

  return [];
}

function normalizeFilesByFolder(
  filesByFolder: PhaseArtifactFilesByFolder,
): PhaseArtifactFilesByFolder {
  const normalized = createEmptyPhaseArtifactFiles();

  for (const folder of phaseArtifactFolderNames) {
    normalized[folder] = [...(filesByFolder[folder] ?? [])].sort((left, right) =>
      left.localeCompare(right),
    );
  }

  return normalized;
}

function pairWorkCardArtifacts(
  fileNames: string[],
): PhaseWorkCardArtifactPair[] {
  const pairs = new Map<string, PhaseWorkCardArtifactPair>();

  for (const fileName of fileNames) {
    const extension = fileName.toLowerCase().endsWith(".json")
      ? ".json"
      : fileName.toLowerCase().endsWith(".md")
        ? ".md"
        : undefined;

    if (!extension) {
      continue;
    }

    const stem = fileName.slice(0, -extension.length);
    const workCardId = extractWorkCardId(stem);
    const pair = pairs.get(stem) ?? { workCardId, stem };

    if (extension === ".json") {
      pair.jsonFileName = fileName;
    } else {
      pair.markdownFileName = fileName;
    }

    pairs.set(stem, pair);
  }

  return [...pairs.values()].sort((left, right) =>
    `${left.workCardId} ${left.stem}`.localeCompare(
      `${right.workCardId} ${right.stem}`,
    ),
  );
}

function buildMissingExpectedArtifactObservations(input: {
  phase: string;
  workCardPairs: PhaseWorkCardArtifactPair[];
  implementerReportFileNames: string[];
  validationReportCount: number;
  repairPromptCount: number;
  closeoutReportFileNames: string[];
}): string[] {
  const observations: string[] = [];
  const expectedWorkCardIds = getExpectedWorkCardIdsForPhase(input.phase);
  const pairsByWorkCardId = new Map<string, PhaseWorkCardArtifactPair[]>();

  for (const pair of input.workCardPairs) {
    const existing = pairsByWorkCardId.get(pair.workCardId) ?? [];
    existing.push(pair);
    pairsByWorkCardId.set(pair.workCardId, existing);
  }

  for (const expectedWorkCardId of expectedWorkCardIds) {
    const pairs = pairsByWorkCardId.get(expectedWorkCardId) ?? [];
    const hasJson = pairs.some((pair) => pair.jsonFileName);
    const hasMarkdown = pairs.some((pair) => pair.markdownFileName);

    if (!hasJson) {
      observations.push(
        `Expected Work Card ${expectedWorkCardId} is missing a JSON artifact.`,
      );
    }

    if (!hasMarkdown) {
      observations.push(
        `Expected Work Card ${expectedWorkCardId} is missing a Markdown artifact.`,
      );
    }

    if (!hasMatchingImplementerReport(input.implementerReportFileNames, expectedWorkCardId)) {
      observations.push(
        `Expected Work Card ${expectedWorkCardId} does not have a matching Implementer Report filename in the canonical Implementer_Reports folder.`,
      );
    }
  }

  for (const pair of input.workCardPairs) {
    if (!pair.jsonFileName) {
      observations.push(
        `Work Card artifact ${pair.stem} has Markdown but is missing JSON.`,
      );
    }

    if (!pair.markdownFileName) {
      observations.push(
        `Work Card artifact ${pair.stem} has JSON but is missing Markdown.`,
      );
    }
  }

  if (input.validationReportCount === 0) {
    observations.push("No Validation Report artifacts were found.");
  }

  if (input.repairPromptCount > 0) {
    observations.push(
      "Repair Prompt artifacts exist and should be reviewed before closeout.",
    );
  }

  if (input.closeoutReportFileNames.length > 0) {
    observations.push(
      `Existing Closeout Report artifacts found. Latest filename: ${
        input.closeoutReportFileNames[input.closeoutReportFileNames.length - 1]
      }.`,
    );
  }

  return observations;
}

function hasMatchingImplementerReport(
  fileNames: string[],
  workCardId: string,
): boolean {
  const normalizedWorkCardId = workCardId.toLowerCase();

  return fileNames.some((fileName) => {
    const normalizedFileName = fileName.toLowerCase();

    return (
      normalizedFileName.startsWith(
        `implementer_report_${normalizedWorkCardId}_`,
      ) || normalizedFileName.includes(`_${normalizedWorkCardId}_`)
    );
  });
}

function extractWorkCardId(stem: string): string {
  const match = /^WC\d+/i.exec(stem);

  return match ? match[0].toUpperCase() : stem;
}
