const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  writeCanonicalMarkdownDocument,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const {
  setDocumentDisposition,
  listPlanningDocuments,
} = require("../../dist/main/documents/planningDocumentService.js");

function tempWorkspace(prefix = "champcity-canonical-fixture-") {
  return tempWorkspaceWithOptions(prefix, { mcpBinding: true });
}

function tempWorkspaceWithoutBinding(prefix = "champcity-canonical-unbound-fixture-") {
  return tempWorkspaceWithOptions(prefix, { mcpBinding: false });
}

function tempWorkspaceWithOptions(prefix, options) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  if (options.mcpBinding) {
    fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".champcity", "mcp-workspace-binding.json"),
      JSON.stringify({
        mcpWorkspaceId: "alpha",
        label: "Alpha Test Workspace",
        repositoryName: "Test/Alpha",
        gitBacked: true,
      }, null, 2),
      "utf8",
    );
  }
  return root;
}

function metadata(artifactType, status = "Approved", overrides = {}) {
  return {
    schemaVersion: 1,
    artifactType,
    artifactRevision: overrides.artifactRevision ?? 1,
    participationRole: overrides.participationRole ?? "gatingReview",
    identity: overrides.identity ?? {},
    sourceRevisions: overrides.sourceRevisions ?? [],
    workflowData: overrides.workflowData ?? {},
    documentDisposition: {
      status,
      notes: overrides.notes ?? "",
      reviewedAt: overrides.reviewedAt ?? null,
    },
  };
}

function repositoryAuthority(root) {
  return {
    projectRepository: path.resolve(root),
    mcpWorkspaceBinding: {
      mcpWorkspaceId: "alpha",
      label: "Alpha Test Workspace",
      repositoryName: "Test/Alpha",
      gitBacked: true,
    },
  };
}

function writeDoc(root, relativePath, artifactType, status = "Approved", overrides = {}) {
  writeCanonicalMarkdownDocument({
    workspaceRoot: root,
    relativePath,
    metadata: metadata(artifactType, status, overrides),
    bodyMarkdown: overrides.bodyMarkdown ?? `# ${artifactType}\n\n`,
  });
  return relativePath;
}

function approve(root, relativePath) {
  const document = listPlanningDocuments(root).find((candidate) => candidate.markdownPath === relativePath);
  if (!document) {
    throw new Error(`Fixture document missing: ${relativePath}`);
  }
  setDocumentDisposition(root, document.logicalDocumentId, "Approved");
}

function seedApprovedProjectIntake(root, slug = "demo") {
  const intake = writeDoc(root, `planning/project/Project_Intake/PROJECT_INTAKE_${slug}.md`, "project-intake", "Approved", {
    identity: { "Project.ArtifactKey": slug },
    workflowData: {
      projectRepository: path.resolve(root),
      repositoryAuthority: repositoryAuthority(root),
    },
  });
  const prompt = writeDoc(root, `planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_${slug}.md`, "project-architect-interview-prompt", "Approved", {
    participationRole: "nonReviewHandoff",
    sourceRevisions: [{ path: intake, revision: 1 }],
    workflowData: {
      projectRepository: path.resolve(root),
      repositoryAuthority: repositoryAuthority(root),
      architectOutputTargets: {
        markdown: `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${slug}.md`,
      },
    },
  });
  return {
    intake,
    prompt,
    interview: `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${slug}.md`,
  };
}

function seedApprovedProjectPlanning(root, slug = "demo") {
  const profile = writeDoc(root, "planning/project/PROJECT_PROFILE.md", "project-profile", "Approved", {
    participationRole: "compoundGatingReview",
    workflowData: {
      repositoryAuthority: repositoryAuthority(root),
    },
  });
  const roadmap = writeDoc(root, `planning/project/Project_Roadmap/PROJECT_ROADMAP_${slug}.md`, "project-roadmap", "Approved", {
    participationRole: "compoundGatingReview",
    workflowData: {
      repositoryAuthority: repositoryAuthority(root),
    },
  });
  return { profile, roadmap };
}

function seedPhaseMap(root, phaseId = "phase-01") {
  const path = "planning/project/Phase_Map/PHASE_MAP_demo.md";
  const phase = {
    phaseId,
    title: "Phase 01",
    order: 1,
    purpose: "Build the first phase.",
    dependsOn: [],
    sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
  };
  writeDoc(root, path, "phase-map", "Approved", {
    workflowData: {
      phases: [phase],
      repositoryAuthority: repositoryAuthority(root),
    },
  });
  return { path, phase };
}

function seedApprovedPhaseInterview(root, phaseId = "phase-01") {
  return writeDoc(root, `planning/phases/${phaseId}/Phase_Interview.md`, "phase-interview", "Approved", {
    identity: { phaseId },
    workflowData: {
      repositoryAuthority: repositoryAuthority(root),
    },
  });
}

function seedApprovedPhasePlanningBundle(root, phaseId = "phase-01", candidateId = "WC01") {
  const documents = listPlanningDocuments(root);
  const sourceRevisions = [
    "planning/project/PROJECT_PROFILE.md",
    "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
    "planning/project/Phase_Map/PHASE_MAP_demo.md",
    `planning/phases/${phaseId}/Phase_Interview.md`,
  ].map((markdownPath) => {
    const document = documents.find((candidate) => candidate.markdownPath === markdownPath);
    return document
      ? { path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 }
      : null;
  }).filter(Boolean);
  const candidate = {
    candidateId,
    order: 1,
    title: "First Work Card",
    purpose: "Implement the first unit.",
    dependsOn: [],
    resolutionStatus: "planned",
    resolutionReason: "",
    evidencePaths: [],
  };
  const planning = writeDoc(root, `planning/phases/${phaseId}/Phase_Planning.md`, "phase-planning", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
    workflowData: {
      repositoryAuthority: repositoryAuthority(root),
    },
  });
  const plan = writeDoc(root, `planning/phases/${phaseId}/Work_Card_Plan.md`, "work-card-plan", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
    workflowData: {
      candidates: [candidate],
      repositoryAuthority: repositoryAuthority(root),
    },
    bodyMarkdown: `# Work Card Plan\n\n\`\`\`champcity-work-card-plan\n${JSON.stringify([candidate], null, 2)}\n\`\`\`\n`,
  });
  return { planning, plan, candidate };
}

function seedApprovedFormalWorkCard(root, phaseId = "phase-01", workCardId = "WC01") {
  return writeDoc(root, `planning/phases/${phaseId}/Work_Cards/${workCardId}_first_work_card.md`, "formal-work-card", "Approved", {
    identity: { phaseId, workCardId, candidateId: workCardId },
    workflowData: {
      repositoryAuthority: repositoryAuthority(root),
    },
  });
}

module.exports = {
  approve,
  listPlanningDocuments,
  seedApprovedFormalWorkCard,
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  tempWorkspaceWithoutBinding,
  writeDoc,
};
