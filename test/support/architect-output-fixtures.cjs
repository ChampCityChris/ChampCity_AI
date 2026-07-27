const {
  writeCanonicalMarkdownDocument,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");

function writeDoc(root, relativePath, artifactType, status, overrides = {}) {
  writeCanonicalMarkdownDocument({
    workspaceRoot: root,
    relativePath,
    metadata: {
      schemaVersion: 1,
      artifactType,
      artifactRevision: overrides.artifactRevision ?? 1,
      participationRole: overrides.participationRole ?? "gatingReview",
      identity: overrides.identity ?? {},
      sourceRevisions: overrides.sourceRevisions ?? [],
      workflowData: overrides.workflowData ?? {},
      documentDisposition: { status, notes: "", reviewedAt: null },
    },
    bodyMarkdown: overrides.bodyMarkdown ?? `# ${artifactType}\n\n`,
  });
}

function seedProjectPlanningOutputs(root, result) {
  writeDoc(root, result.profileMarkdownPath, "project-profile", "Pending", {
    participationRole: "compoundGatingReview",
  });
  writeDoc(root, result.roadmapMarkdownPath, "project-roadmap", "Pending", {
    participationRole: "compoundGatingReview",
  });
}

function seedPhaseMapOutput(root, result, phases) {
  writeDoc(root, result.phaseMapMarkdownPath, "phase-map", "Pending", {
    workflowData: { phases },
  });
}

function seedPhaseInterviewOutput(root, result) {
  writeDoc(root, result.interviewMarkdownPath, "phase-interview", "Pending", {
    identity: { phaseId: result.phaseId },
  });
}

function seedPhasePlanningOutputs(root, result, candidates) {
  writeDoc(root, result.phasePlanningMarkdownPath, "phase-planning", "Pending", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: result.phaseId },
    workflowData: { candidates },
  });
  writeDoc(root, result.workCardPlanMarkdownPath, "work-card-plan", "Pending", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: result.phaseId },
    workflowData: { candidates },
  });
}

module.exports = {
  seedPhaseInterviewOutput,
  seedPhaseMapOutput,
  seedPhasePlanningOutputs,
  seedProjectPlanningOutputs,
};
