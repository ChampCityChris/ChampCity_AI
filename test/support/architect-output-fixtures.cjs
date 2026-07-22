const fs = require("node:fs");
const path = require("node:path");

function writeText(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function markdown(title, lines = []) {
  return [
    `# ${title}`,
    "Artifact.Revision=1",
    ...lines,
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function writeJson(root, relativePath, value) {
  writeText(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function seedProjectPlanningOutputs(root, result) {
  const handoff = readJson(root, result.handoffJsonPath);
  writeText(root, result.profileMarkdownPath, markdown("Project Profile", ["participationRole=compoundGatingReview"]));
  writeJson(root, result.profileJsonPath, {
    artifactType: "project-profile",
    artifactRevision: 1,
    participationRole: "compoundGatingReview",
    sourceRevisions: handoff.sourceRevisions,
    documentDisposition: { status: "Pending" },
  });
  writeText(root, result.roadmapMarkdownPath, markdown("Project Roadmap", ["participationRole=compoundGatingReview"]));
  writeJson(root, result.roadmapJsonPath, {
    artifactType: "project-roadmap",
    artifactRevision: 1,
    participationRole: "compoundGatingReview",
    sourceRevisions: handoff.sourceRevisions,
    documentDisposition: { status: "Pending" },
  });
}

function seedPhaseMapOutput(root, result, phases) {
  const handoff = readJson(root, result.handoffJsonPath);
  writeText(root, result.phaseMapMarkdownPath, markdown("Phase Map", ["participationRole=gatingReview"]));
  writeJson(root, result.phaseMapJsonPath, {
    artifactType: "phase-map",
    artifactRevision: 1,
    participationRole: "gatingReview",
    sourceRevisions: handoff.sourceRevisions,
    phases,
    documentDisposition: { status: "Pending" },
  });
}

function seedPhaseInterviewOutput(root, result) {
  const handoff = readJson(root, result.handoffJsonPath);
  writeText(root, result.interviewMarkdownPath, markdown("Phase Interview", [
    "participationRole=gatingReview",
    `phaseId=${result.phaseId}`,
  ]));
  writeJson(root, result.interviewJsonPath, {
    artifactType: "phase-interview",
    artifactRevision: 1,
    participationRole: "gatingReview",
    phaseId: result.phaseId,
    selectedPhase: handoff.selectedPhase,
    sourceRevisions: handoff.sourceRevisions,
    documentDisposition: { status: "Pending" },
  });
}

function seedPhasePlanningOutputs(root, result, candidates) {
  const handoff = readJson(root, result.handoffJsonPath);
  writeText(root, result.phasePlanningMarkdownPath, markdown("Phase Planning", [
    "participationRole=compoundGatingReview",
    `phaseId=${result.phaseId}`,
  ]));
  writeJson(root, result.phasePlanningJsonPath, {
    artifactType: "phase-planning",
    artifactRevision: 1,
    participationRole: "compoundGatingReview",
    phaseId: result.phaseId,
    selectedPhase: handoff.selectedPhase,
    sourceRevisions: handoff.sourceRevisions,
    candidateIds: candidates.map((candidate) => candidate.candidateId),
    documentDisposition: { status: "Pending" },
  });
  writeText(root, result.workCardPlanMarkdownPath, markdown("Work Card Plan", [
    "participationRole=compoundGatingReview",
    `phaseId=${result.phaseId}`,
  ]));
  writeJson(root, result.workCardPlanJsonPath, {
    artifactType: "work-card-plan",
    artifactRevision: 1,
    participationRole: "compoundGatingReview",
    phaseId: result.phaseId,
    selectedPhase: handoff.selectedPhase,
    sourceRevisions: handoff.sourceRevisions,
    candidates,
    documentDisposition: { status: "Pending" },
  });
}

module.exports = {
  seedPhaseInterviewOutput,
  seedPhaseMapOutput,
  seedPhasePlanningOutputs,
  seedProjectPlanningOutputs,
};
