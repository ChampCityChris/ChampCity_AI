const { mkdir, readdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

const {
  buildCanonicalArtifact,
  canonicalPrettyStringify,
  renderArtifactMarkdown,
} = require("../../dist/shared/artifacts");

const PROJECT_ID = "champcity-ai";
const PHASE_ID = "phase-06";
const WORK_CARD_ID = "WC05";
const WC04_WORK_CARD_ARTIFACT_ID = "champcity-ai/phase-06/work_card/WC04";
const WC04_ARCHITECT_REVIEW_ARTIFACT_ID = "champcity-ai/phase-06/architect_review/WC04";
const WC04_ARCHITECT_REVIEW_JSON_PATH =
  "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.json";
const WC04_ARCHITECT_REVIEW_MARKDOWN_PATH =
  "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.md";

const executionAcceptanceContract = {
  contractId: "champcity-ai/phase-06/acceptance_contract/WC05",
  workCardArtifactId: "champcity-ai/phase-06/work_card/WC05",
  workCardRevision: 3,
  globalInvariants: [
    {
      invariantId: "INV-NO-OPERATOR-ACCEPTANCE",
      statement: "No agent or UI grants Operator acceptance.",
    },
  ],
  requirements: [
    {
      requirementId: "R-DOMAIN",
      type: "required_behavior",
      statement: "Pure Execution Run transitions require independent verification before pass advancement.",
      passIds: ["P01"],
      noncompliantSubstitutions: ["Advancing on Implementer self-report"],
      requiredBehavioralTests: ["Implementer completion alone does not advance"],
    },
    {
      requirementId: "R-PACKETS",
      type: "required_behavior",
      statement: "Pass packets include only current-pass requirements and bounded sources.",
      passIds: ["P01"],
      noncompliantSubstitutions: ["Full Work Card dump"],
      requiredBehavioralTests: ["Unassigned requirements absent from packet"],
    },
    {
      requirementId: "R-PERSISTENCE",
      type: "required_evidence",
      statement: "Contract, Plan, and Run canonical pairs persist and increment revisions.",
      passIds: ["P02"],
      noncompliantSubstitutions: ["Runtime transport log authority"],
      requiredBehavioralTests: ["Run revision increments after trusted result recording"],
    },
  ],
};

const executionPassPlan = {
  planId: "champcity-ai/phase-06/execution_pass_plan/WC05",
  workCardArtifactId: executionAcceptanceContract.workCardArtifactId,
  workCardRevision: 3,
  approvalArtifactId: "champcity-ai/phase-06/operator_approval/WC05",
  acceptanceContractId: executionAcceptanceContract.contractId,
  implementationBranch: "feature/phase-04-wc01-repair01-evidence-derived-workflow",
  passTokenBudget: 5000,
  passes: [
    {
      passId: "P01",
      title: "Domain and packets",
      objective: "Recover pure domain transitions and bounded packets.",
      requirementIds: ["R-DOMAIN", "R-PACKETS"],
      globalInvariantIds: ["INV-NO-OPERATOR-ACCEPTANCE"],
      allowedRepositoryPaths: ["src/shared/executionRuns", "test/wc05/domain-packets.test.cjs"],
      requiredTests: ["domain transition tests", "packet boundary tests"],
      prerequisitePassIds: [],
      expectedOutputs: ["P01 implementer result"],
    },
    {
      passId: "P02",
      title: "Persistence and IPC authority",
      objective: "Persist canonical run pairs and keep renderer read-only.",
      requirementIds: ["R-PERSISTENCE"],
      globalInvariantIds: ["INV-NO-OPERATOR-ACCEPTANCE"],
      allowedRepositoryPaths: ["src/main/executionRuns", "src/preload", "src/renderer"],
      requiredTests: ["canonical persistence tests", "read-only renderer tests"],
      prerequisitePassIds: ["P01"],
      expectedOutputs: ["P02 implementer result"],
    },
  ],
};

const repositoryFacts = {
  repository: "<PROJECT_REPO>",
  remote: "ChampCityChris/ChampCity_AI",
  branch: executionPassPlan.implementationBranch,
  initialStatusSummary: "Approved dirty recovery tree classified before editing.",
};

async function commitAuthorityArtifacts(pairs, options = {}) {
  const workCardRequest = {
    artifactId: executionAcceptanceContract.workCardArtifactId,
    artifactType: "work_card",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: PHASE_ID,
    workCardId: WORK_CARD_ID,
    relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
    payload: {
      title: "WC05 Execution Foundation Recovery",
      contentMarkdown: "# WC05\n\nRecover execution foundation and remove transport.",
      data: { workCardId: WORK_CARD_ID },
    },
    location: { directoryPath: "planning/phases/phase-06/Work_Cards", fileStem: "WC05" },
  };
  await pairs.commitArtifact(workCardRequest);
  await pairs.commitArtifact({
    ...workCardRequest,
    payload: {
      ...workCardRequest.payload,
      contentMarkdown: "# WC05\n\nRecover execution foundation and remove transport. Revision 2.",
    },
  });
  await pairs.commitArtifactsBatch([
    {
      ...workCardRequest,
      payload: {
        ...workCardRequest.payload,
        contentMarkdown: "# WC05\n\nRecover execution foundation and remove transport. Revision 3.",
      },
    },
    operatorApprovalRequest(options.approvalOverrides),
  ]);
}

function operatorApprovalRequest(overrides = {}) {
  const data = {
    authorizationGranted: true,
    sourceCodeChangesAuthorized: true,
    authorizedWorkCardArtifactId: executionAcceptanceContract.workCardArtifactId,
    authorizedRevision: executionAcceptanceContract.workCardRevision,
    executionCondition: `accepting Architect Review of ${WC04_WORK_CARD_ARTIFACT_ID}`,
    pushAuthorized: false,
    ...(overrides.data ?? {}),
  };
  return {
    artifactId: executionPassPlan.approvalArtifactId,
    artifactType: "operator_approval",
    status: "active",
    projectId: PROJECT_ID,
    phaseId: PHASE_ID,
    workCardId: WORK_CARD_ID,
    parentArtifactId: overrides.parentArtifactId ?? executionAcceptanceContract.workCardArtifactId,
    relationships: overrides.relationships ?? {
      sources: [executionAcceptanceContract.workCardArtifactId, WC04_WORK_CARD_ARTIFACT_ID],
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      title: "WC05 Operator Approval",
      contentMarkdown: "# Approval\n\nWC05 revision 3 is explicitly authorized.",
      data,
    },
    location: {
      directoryPath: "planning/phases/phase-06/Operator_Approvals",
      fileStem: "OPERATOR_APPROVAL_WC05",
    },
  };
}

async function writeUnregisteredWc04ReviewPair(root, dataOverrides = {}) {
  const artifact = buildCanonicalArtifact({
    artifactId: WC04_ARCHITECT_REVIEW_ARTIFACT_ID,
    artifactType: "architect_review",
    revision: 1,
    status: "active",
    projectId: PROJECT_ID,
    phaseId: PHASE_ID,
    workCardId: "WC04",
    parentArtifactId: "champcity-ai/phase-06/implementer_report/WC04",
    createdAt: "2026-07-18T22:00:00.000Z",
    updatedAt: "2026-07-18T22:00:00.000Z",
    jsonPath: WC04_ARCHITECT_REVIEW_JSON_PATH,
    markdownPath: WC04_ARCHITECT_REVIEW_MARKDOWN_PATH,
    relationships: {
      sources: [
        WC04_WORK_CARD_ARTIFACT_ID,
        "champcity-ai/phase-06/operator_approval/WC04",
        "champcity-ai/phase-06/implementer_report/WC04",
        "champcity-ai/system/artifact_registry",
      ],
      expectedOutputs: [executionAcceptanceContract.workCardArtifactId],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: "architect_review",
      title: "Architect Review: Phase 06 WC04 - Accepted with Observations",
      contentMarkdown: [
        "# Architect Review: Phase 06 WC04 - Accepted with Observations",
        "",
        "Decision: accepted_for_dependency_completion",
        "WC05 dependency satisfied: yes",
      ].join("\n"),
      data: {
        workCardId: "WC04",
        decision: "accepted_for_dependency_completion",
        acceptanceResult: "accepted_with_observations",
        dependencySatisfiedWorkCardArtifactId: executionAcceptanceContract.workCardArtifactId,
        reviewedWorkCardArtifactId: WC04_WORK_CARD_ARTIFACT_ID,
        reviewedWorkCardRevision: 3,
        ...(dataOverrides ?? {}),
      },
    },
  });
  await writeCanonicalPair(root, artifact);
  return artifact;
}

async function registerWc04ReviewThroughRegistryBoundary(root, pairs, dataOverrides) {
  await writeUnregisteredWc04ReviewPair(root, dataOverrides);
  return pairs.registerExistingArtifactPairByPaths(
    WC04_ARCHITECT_REVIEW_JSON_PATH,
    WC04_ARCHITECT_REVIEW_MARKDOWN_PATH,
  );
}

async function writeCanonicalPair(root, artifact) {
  await mkdir(path.join(root, path.dirname(artifact.jsonPath)), { recursive: true });
  const json = `${canonicalPrettyStringify(artifact)}\n`;
  const markdown = renderArtifactMarkdown(artifact);
  await writeFile(path.join(root, artifact.jsonPath), json, "utf8");
  await writeFile(path.join(root, artifact.markdownPath), markdown, "utf8");
}

async function commitResult(pairs, artifactId, artifactType, data) {
  await pairs.commitArtifact({
    artifactId,
    artifactType,
    status: "active",
    projectId: PROJECT_ID,
    phaseId: PHASE_ID,
    workCardId: WORK_CARD_ID,
    parentArtifactId: executionAcceptanceContract.workCardArtifactId,
    relationships: {
      sources: [executionAcceptanceContract.workCardArtifactId],
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      title: artifactId,
      contentMarkdown: `# ${artifactId}\n\nCanonical result evidence.`,
      data,
    },
    location: {
      directoryPath: "planning/phases/phase-06/Execution_Runs/WC05/Results",
      fileStem: `${artifactId.replace(/[^A-Za-z0-9]+/g, "_")}_RESULT`,
    },
  });
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(full));
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  PROJECT_ID,
  PHASE_ID,
  WORK_CARD_ID,
  WC04_ARCHITECT_REVIEW_ARTIFACT_ID,
  WC04_ARCHITECT_REVIEW_JSON_PATH,
  WC04_ARCHITECT_REVIEW_MARKDOWN_PATH,
  WC04_WORK_CARD_ARTIFACT_ID,
  commitAuthorityArtifacts,
  commitResult,
  escapeRegExp,
  executionAcceptanceContract,
  executionPassPlan,
  registerWc04ReviewThroughRegistryBoundary,
  repositoryFacts,
  sourceFiles,
  writeUnregisteredWc04ReviewPair,
};
