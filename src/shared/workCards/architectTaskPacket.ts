import type { CurrentRequiredAction } from "./currentActionProjection";
import type { RouteReviewRequestRecord } from "./routeReviewRequest";

export const architectTaskArtifactType = "architect_task" as const;

export interface ArchitectTaskExpectedOutput {
  artifactId: string;
  artifactType: string;
}

export interface ArchitectTaskPacketData {
  role: "Architect";
  requestedAction: string;
  currentAction: string;
  targetArtifactId: string;
  sourceArtifactIds: string[];
  expectedOutput: ArchitectTaskExpectedOutput;
  allowedDecisions: string[];
  defaultDecisionRule: string;
  writePolicy: "write_canonical_artifact_pair";
  mcpFetchInstruction: string;
  operatorInstruction: string;
  governanceRepairSpecification?: {
    requestArtifactId: string;
    requestRevision: number;
    requestJsonPath: string;
    requestMarkdownPath: string;
    targetArtifactId: string;
    targetJsonPath: string;
    targetMarkdownPath: string;
    reasonDeterministicRepairUnavailable: string;
    candidateFingerprint: string;
    registryRevision: number;
    expectedRepairWorkCardId: string;
    expectedRepairWorkCardArtifactId: string;
    requiredAcceptanceCriteria: string[];
    requiredRollbackRequirements: string[];
    requiredTests: string[];
    prohibitions: string[];
  };
}

export interface ArchitectTaskPacketPayload {
  kind: typeof architectTaskArtifactType;
  title: string;
  contentMarkdown: string;
  data: ArchitectTaskPacketData;
}

export interface ArchitectTaskPacketBuildResult {
  artifactId: string;
  artifactType: typeof architectTaskArtifactType;
  phaseId: string;
  workCardId: string;
  fileStem: string;
  jsonFileName: string;
  markdownFileName: string;
  directoryPath: string;
  relationships: {
    sources: string[];
    expectedOutputs: string[];
    supersedes: string[];
    children: string[];
  };
  payload: ArchitectTaskPacketPayload;
  chatGptPrompt: string;
}

export interface ArchitectTaskPacketSaveResult {
  ok: boolean;
  packet?: ArchitectTaskPacketBuildResult;
  jsonPath?: string;
  markdownPath?: string;
  markdown?: string;
  chatGptPrompt?: string;
  errorMessages?: string[];
}

export function buildArchitectTaskPacket(
  action: CurrentRequiredAction,
  projectId = "champcity-ai",
  routeReviewRequest?: {
    artifactId: string;
    revision: number;
    jsonPath: string;
    markdownPath: string;
    record: RouteReviewRequestRecord;
  },
): ArchitectTaskPacketBuildResult {
  const routedAction = action.routedAction;
  const phaseId = action.phaseId?.trim() || inferPhaseId(action) || "phase-unmapped";
  const workCardId = action.workCardId?.trim() || inferWorkCardId(action) || "WORK-CARD";
  const currentAction = normalizeActionId(action.id);
  const targetArtifactId =
    routedAction?.targetArtifactId ?? `${projectId}/${phaseId}/work_card/${workCardId}`;
  const sourceArtifactIds = uniqueStrings([
    targetArtifactId,
    ...(routedAction?.sourceArtifactIds ?? []),
    ...action.sourceArtifacts.map((artifact) => artifact.path).filter(isArtifactId),
  ]);
  const requestedAction = requestedActionFor(action, sourceArtifactIds);
  const expectedOutput = expectedOutputFor({
    action,
    projectId,
    phaseId,
    workCardId,
    requestedAction,
  });
  const fileSlug = fileSlugFor(requestedAction, expectedOutput.artifactType);
  const fileStem = `ARCHITECT_TASK_${safeFilePart(workCardId)}_${fileSlug}`;
  const directoryPath = `planning/phases/${phaseId}/Architect_Tasks`;
  const jsonRepoPath = `${directoryPath}/${fileStem}.json`;
  const title = titleFor(requestedAction, workCardId);
  const defaultDecisionRule = defaultDecisionRuleFor(
    requestedAction,
    sourceArtifactIds,
  );
  const mcpFetchInstruction = `Use ChampCity MCP to fetch ${jsonRepoPath}.`;
  const operatorInstruction =
    currentAction === "governance_repair_specification_required"
      ? "Copy this prompt into ChatGPT.com. The Architect must produce the exact repair Work Card for separate Operator approval; do not repair the target in this step."
      : "Copy this prompt into ChatGPT.com, then refresh repository state after the Architect writes the expected canonical output.";
  const governanceRepairSpecification =
    routeReviewRequest &&
    routeReviewRequest.record.requestPurpose === "governance_repair_specification" &&
    routeReviewRequest.record.governanceTargetSnapshot &&
    routeReviewRequest.record.expectedRepairWorkCard
      ? governanceRepairSpecificationData(routeReviewRequest)
      : undefined;
  const data: ArchitectTaskPacketData = {
    role: "Architect",
    requestedAction,
    currentAction,
    targetArtifactId,
    sourceArtifactIds,
    expectedOutput,
    allowedDecisions: allowedDecisionsFor(requestedAction),
    defaultDecisionRule,
    writePolicy: "write_canonical_artifact_pair",
    mcpFetchInstruction,
    operatorInstruction,
    ...(governanceRepairSpecification ? { governanceRepairSpecification } : {}),
  };
  const contentMarkdown = renderArchitectTaskPacketMarkdown(title, data);
  const chatGptPrompt = [
    "Architect task is ready.",
    "",
    "Use ChampCity MCP to fetch:",
    jsonRepoPath,
    "",
    "Perform the requested Architect action.",
    "Write the expected canonical output artifact back to the repo.",
    "Do not rely on chat history.",
  ].join("\n");

  return {
    artifactId: `${projectId}/${phaseId}/architect_task/${workCardId}_${fileSlug}`,
    artifactType: architectTaskArtifactType,
    phaseId,
    workCardId,
    fileStem,
    jsonFileName: `${fileStem}.json`,
    markdownFileName: `${fileStem}.md`,
    directoryPath,
    relationships: {
      sources: sourceArtifactIds,
      expectedOutputs: [expectedOutput.artifactId],
      supersedes: [],
      children: [],
    },
    payload: {
      kind: architectTaskArtifactType,
      title,
      contentMarkdown,
      data,
    },
    chatGptPrompt,
  };
}

export function renderArchitectTaskPacketMarkdown(
  title: string,
  data: ArchitectTaskPacketData,
): string {
  const sources = data.sourceArtifactIds.length > 0
    ? data.sourceArtifactIds.map((source) => `- ${source}`).join("\n")
    : "- No source artifacts were supplied by the current routed action.";
  const decisions = data.allowedDecisions.length > 0
    ? data.allowedDecisions.map((decision) => `- ${decision}`).join("\n")
    : "- Architect must apply the current workflow contract.";
  const governance = data.governanceRepairSpecification
    ? renderGovernanceRepairSpecificationPacket(data.governanceRepairSpecification)
    : "";

  return `# ${title}

## Requested Action

${data.requestedAction}

## Current Action

${data.currentAction}

## Target Artifact

${data.targetArtifactId}

## Source Artifacts

${sources}

## Expected Output

- Artifact ID: ${data.expectedOutput.artifactId}
- Artifact type: ${data.expectedOutput.artifactType}

## Allowed Decisions

${decisions}

## Default Decision Rule

${data.defaultDecisionRule || "No default rule is defined for this task."}

## Write Policy

${data.writePolicy}

## MCP Fetch Instruction

${data.mcpFetchInstruction}

## Operator Instruction

${data.operatorInstruction}

${governance}
`;
}

function renderGovernanceRepairSpecificationPacket(
  data: NonNullable<ArchitectTaskPacketData["governanceRepairSpecification"]>,
): string {
  return `## Governance Repair Specification

- Request artifact ID: ${data.requestArtifactId}
- Request revision: ${data.requestRevision}
- Request JSON path: ${data.requestJsonPath}
- Request Markdown path: ${data.requestMarkdownPath}
- Target artifact ID: ${data.targetArtifactId}
- Target JSON path: ${data.targetJsonPath}
- Target Markdown path: ${data.targetMarkdownPath}
- Reason deterministic repair is unavailable: ${data.reasonDeterministicRepairUnavailable}
- Candidate fingerprint: ${data.candidateFingerprint}
- Registry revision: ${data.registryRevision}
- Expected repair Work Card ID: ${data.expectedRepairWorkCardId}
- Expected repair Work Card artifact ID: ${data.expectedRepairWorkCardArtifactId}

## Required Work Card Relationships

- Parent: none for the request; target remains a source.
- Sources must include the request artifact and selected target evidence.
- Expected output must remain ${data.expectedRepairWorkCardArtifactId}.

## Required Acceptance Criteria

${data.requiredAcceptanceCriteria.map((item) => `- ${item}`).join("\n")}

## Required Rollback Requirements

${data.requiredRollbackRequirements.map((item) => `- ${item}`).join("\n")}

## Required Tests

${data.requiredTests.map((item) => `- ${item}`).join("\n")}

## Prohibitions

${data.prohibitions.map((item) => `- ${item}`).join("\n")}

Produce one exact governance maintenance repair Work Card for the expected artifact ID. Do not repair the target in this Architect step. Do not grant implementation authority. The Work Card must return for separate Operator approval.
`;
}

function requestedActionFor(
  action: CurrentRequiredAction,
  sourceArtifactIds: readonly string[],
): string {
  const actionId = normalizeActionId(action.id);

  if (actionId === "governance_repair_specification_required") {
    return "produce_governance_maintenance_repair_work_card";
  }

  if (actionId === "architect_review_of_implementer_report_required") {
    return "review_implementer_report_and_write_architect_review";
  }

  if (
    actionId === "architect_disposition_required" &&
    hasValidationReport(sourceArtifactIds) &&
    hasRepairEvidence(sourceArtifactIds)
  ) {
    return "review_validation_report_and_write_candidate_disposition";
  }

  if (actionId === "architect_disposition_required") {
    return "review_validation_report_and_write_repair_decision";
  }

  if (actionId === "architect_review_of_validation_report_required") {
    return "review_validation_report_and_write_candidate_disposition";
  }

  return `perform_${actionId}`;
}

function expectedOutputFor(input: {
  action: CurrentRequiredAction;
  projectId: string;
  phaseId: string;
  workCardId: string;
  requestedAction: string;
}): ArchitectTaskExpectedOutput {
  if (
    input.requestedAction ===
    "review_implementer_report_and_write_architect_review"
  ) {
    return {
      artifactId: `${input.projectId}/${input.phaseId}/architect_review/${input.workCardId}`,
      artifactType: "architect_review",
    };
  }

  if (
    input.requestedAction ===
    "review_validation_report_and_write_candidate_disposition"
  ) {
    return {
      artifactId: `${input.projectId}/${input.phaseId}/candidate_disposition/${input.workCardId}`,
      artifactType: "candidate_disposition",
    };
  }

  const routedOutput = input.action.routedAction?.expectedOutput;
  return routedOutput
    ? {
        artifactId: routedOutput.artifactId,
        artifactType: routedOutput.artifactType,
      }
    : {
        artifactId: `${input.projectId}/${input.phaseId}/repair_decision/${input.workCardId}`,
        artifactType: "repair_decision",
      };
}

function defaultDecisionRuleFor(
  requestedAction: string,
  sourceArtifactIds: readonly string[],
): string {
  if (
    requestedAction ===
      "review_validation_report_and_write_candidate_disposition" &&
    hasValidationReport(sourceArtifactIds) &&
    hasRepairEvidence(sourceArtifactIds)
  ) {
    return "Validation Report = Pass plus parent completed after authorized repair chain means write completed_via_repair.";
  }

  if (requestedAction === "review_validation_report_and_write_repair_decision") {
    return "If validation failed and repair capacity remains, write the existing workflow's repair decision or repair Work Card output; do not invent a numbered repair when the repair limit is exhausted.";
  }

  if (requestedAction === "produce_governance_maintenance_repair_work_card") {
    return "Produce one exact governance maintenance repair Work Card for the expected artifact ID. Do not repair the target in this Architect step. Do not grant implementation authority. The Work Card must return for separate Operator approval.";
  }

  return "";
}

function allowedDecisionsFor(requestedAction: string): string[] {
  if (
    requestedAction ===
    "review_validation_report_and_write_candidate_disposition"
  ) {
    return ["completed_via_repair", "completed", "carried_forward", "deferred", "cancelled"];
  }

  if (requestedAction === "review_validation_report_and_write_repair_decision") {
    return ["repair_required", "blocked", "no_additional_repair_permitted"];
  }

  if (
    requestedAction ===
    "review_implementer_report_and_write_architect_review"
  ) {
    return [
      "Ready for Operator validation",
      "Repair required before Operator validation",
      "Blocked / incomplete",
    ];
  }

  if (requestedAction === "produce_governance_maintenance_repair_work_card") {
    return [
      "Write exact governance repair Work Card only",
      "Return for separate Operator approval",
      "Do not mutate target or authorize implementation",
    ];
  }

  return [];
}

function titleFor(requestedAction: string, workCardId: string): string {
  if (
    requestedAction ===
    "review_validation_report_and_write_candidate_disposition"
  ) {
    return `Architect Task: ${workCardId} Candidate Disposition`;
  }

  if (requestedAction === "review_validation_report_and_write_repair_decision") {
    return `Architect Task: ${workCardId} Repair Decision`;
  }

  if (
    requestedAction ===
    "review_implementer_report_and_write_architect_review"
  ) {
    return `Architect Task: ${workCardId} Implementer Report Review`;
  }

  if (requestedAction === "produce_governance_maintenance_repair_work_card") {
    return `Architect Task: ${workCardId} Governance Repair Specification`;
  }

  return `Architect Task: ${workCardId}`;
}

function fileSlugFor(
  requestedAction: string,
  expectedOutputArtifactType: string,
): string {
  if (expectedOutputArtifactType === "candidate_disposition") {
    return "candidate_disposition";
  }

  if (expectedOutputArtifactType === "architect_review") {
    return "architect_review";
  }

  return safeFilePart(requestedAction);
}

function inferPhaseId(action: CurrentRequiredAction): string | undefined {
  return action.routedAction?.expectedOutput.artifactId.split("/")[1];
}

function inferWorkCardId(action: CurrentRequiredAction): string | undefined {
  if (normalizeActionId(action.id) === "governance_repair_specification_required") {
    return action.routedAction?.expectedOutput.artifactId.split("/").pop();
  }
  const fromTarget = action.routedAction?.targetArtifactId?.split("/").pop();
  return fromTarget && /^WC/i.test(fromTarget) ? fromTarget : undefined;
}

function governanceRepairSpecificationData(input: {
  artifactId: string;
  revision: number;
  jsonPath: string;
  markdownPath: string;
  record: RouteReviewRequestRecord;
}): NonNullable<ArchitectTaskPacketData["governanceRepairSpecification"]> {
  const target = input.record.governanceTargetSnapshot!;
  const expected = input.record.expectedRepairWorkCard!;
  return {
    requestArtifactId: input.artifactId,
    requestRevision: input.revision,
    requestJsonPath: input.jsonPath,
    requestMarkdownPath: input.markdownPath,
    targetArtifactId: target.targetArtifactId,
    targetJsonPath: target.jsonPath,
    targetMarkdownPath: target.markdownPath,
    reasonDeterministicRepairUnavailable:
      target.blockReason ?? target.verificationError,
    candidateFingerprint: target.candidateFingerprint,
    registryRevision: target.registryRevision,
    expectedRepairWorkCardId: expected.workCardId,
    expectedRepairWorkCardArtifactId: expected.artifactId,
    requiredAcceptanceCriteria: [
      "The Work Card specifies one bounded deterministic governance repair.",
      "The Work Card preserves the selected target until separately approved.",
      "The Work Card requires Governance Maintenance rescan after implementation.",
    ],
    requiredRollbackRequirements: [
      "Rollback must restore the target pair and Artifact Registry to the pre-repair state.",
      "Rollback must not delete the route review request authority.",
    ],
    requiredTests: [
      "Adversarial stale snapshot test",
      "Registry transaction rollback test",
      "Target pair unchanged before approval test",
      "Governance Maintenance rescan routing test",
    ],
    prohibitions: [
      "Do not repair the target before Operator Work Card approval.",
      "Do not create Operator approval.",
      "Do not infer validation or workflow progression.",
      "Do not authorize Implementer execution.",
    ],
  };
}

function normalizeActionId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function safeFilePart(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function hasValidationReport(sourceArtifactIds: readonly string[]): boolean {
  return sourceArtifactIds.some((artifactId) =>
    artifactId.includes("/operator_validation/"),
  );
}

function hasRepairEvidence(sourceArtifactIds: readonly string[]): boolean {
  return sourceArtifactIds.some((artifactId) => /WC\d+-REPAIR\d+/i.test(artifactId));
}

function isArtifactId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value) && value.includes("/");
}
