export const architectContextPacketScenarios = [
  "work_card_creation",
  "implementer_report_review",
  "validation_disposition_and_repair",
  "phase_closeout",
] as const;

export type ArchitectContextPacketScenario =
  (typeof architectContextPacketScenarios)[number];

export type ContextPacketKind = "architect" | "implementer";

export interface ContextPacketBudgetConfiguration {
  architectTokens: number;
  implementerTokens: number;
  largestContributorCount: number;
}

export const defaultContextPacketBudgets: Readonly<ContextPacketBudgetConfiguration> =
  Object.freeze({
    architectTokens: 12_000,
    implementerTokens: 16_000,
    largestContributorCount: 5,
  });

export interface ContextPacketWorkflowState {
  revision: number;
  currentProjectStage: string;
  activePhaseId?: string;
  currentActionId: string;
  responsibleRole: "operator" | "architect" | "implementer" | "application";
  authoritativeTargetArtifactId?: string;
  requiredSourceArtifactIds: string[];
  expectedOutputArtifactId?: string;
  expectedOutputArtifactType?: string;
  successRoute?: string;
  failureRoute?: string;
  repairRoute?: string;
  blockingConditions: string[];
  openRepairChain: string[];
}

export interface ContextPacketArtifactInput {
  artifactId: string;
  artifactType: string;
  title: string;
  status: string;
  summary: string;
  content?: string;
  phaseId?: string;
  workCardId?: string;
  relationshipTags?: string[];
  changedSincePriorDecision?: boolean;
  /**
   * Live compilers set this to false when an active artifact is outside the
   * current decision. Omitted preserves the public compiler's default
   * phase/target relevance behavior for callers that supply bounded inputs.
   */
  decisionRelevant?: boolean;
}

export interface ContextPacketObservationInput {
  observationId: string;
  title: string;
  status: string;
  summary: string;
  assignedTarget?: string;
  phaseId?: string;
  workCardId?: string;
}

export interface ContextPacketManifestEntry {
  id: string;
  title: string;
  category: "artifact" | "observation" | "rule_reference" | "contract";
  estimatedTokens: number;
  reason: string;
}

export interface ContextPacketContributor {
  id: string;
  title: string;
  estimatedTokens: number;
}

export interface ContextPacketManifest {
  packetId: string;
  packetKind: ContextPacketKind;
  scenario: ArchitectContextPacketScenario | "work_card_execution";
  included: ContextPacketManifestEntry[];
  excluded: ContextPacketManifestEntry[];
  estimatedTokens: number;
  budgetTokens: number;
  overBudget: boolean;
  requiresOperatorAcknowledgment: boolean;
  largestContributors: ContextPacketContributor[];
  estimationMethod: "utf8_bytes_divided_by_four_rounded_up";
}

export interface ContextPacket {
  packetId: string;
  packetKind: ContextPacketKind;
  scenario: ArchitectContextPacketScenario | "work_card_execution";
  title: string;
  markdown: string;
  manifest: ContextPacketManifest;
  suggestedPacketPath: string;
  suggestedManifestPath: string;
}

export interface CurrentContextPacketPreviewRequest {
  packetKind: ContextPacketKind;
  architectScenario?: ArchitectContextPacketScenario;
  budgetTokens?: number;
}

export interface CurrentContextPacketPreviewResult {
  ok: boolean;
  packet?: ContextPacket;
  errorMessages?: string[];
}

export interface CurrentContextPacketExportRequest
  extends CurrentContextPacketPreviewRequest {
  operatorAcknowledgedOverBudget: boolean;
}

export interface ContextPacketExportResult {
  ok: boolean;
  blocked: boolean;
  acknowledgementRequired: boolean;
  packetMarkdownPath?: string;
  packetJsonPath?: string;
  manifestMarkdownPath?: string;
  manifestJsonPath?: string;
  errorMessages?: string[];
}

interface SharedPacketInput {
  projectId: string;
  stableProjectContractSummary: string;
  workflowState: ContextPacketWorkflowState;
  artifacts: ContextPacketArtifactInput[];
  observations: ContextPacketObservationInput[];
  controllingArtifactIds: string[];
  relevantPhaseId?: string;
  relevantWorkCardId?: string;
  changedEvidenceArtifactIds?: string[];
  budgetTokens?: number;
  largestContributorCount?: number;
}

export interface ArchitectContextPacketInput extends SharedPacketInput {
  scenario: ArchitectContextPacketScenario;
  exactDecisionRequested: string;
  priorDecisionSummary?: string;
}

export interface ImplementerExecutionPacketInput extends SharedPacketInput {
  workCardId: string;
  workCardTitle: string;
  workCardDelta: string;
  architectureAndUiContractReferences: string[];
  acceptanceCriteria: string[];
  repositoryFacts: {
    repository: "<PROJECT_REPO>";
    baseBranch: string;
    targetBranch: string;
    remote: string;
  };
  validationLaneReferences: string[];
  expectedImplementerReportPath: string;
}

export interface ContextPacketExportAuthorization {
  allowed: boolean;
  acknowledgementRequired: boolean;
  errorMessage?: string;
}

const resolvedStatuses = new Set([
  "resolved",
  "closed",
  "complete",
  "completed",
  "superseded",
  "archived",
  "historical",
  "no action required",
]);

const scenarioDecisionLabels: Record<ArchitectContextPacketScenario, string> = {
  work_card_creation: "Just-in-time Work Card creation",
  implementer_report_review: "Implementer Report review",
  validation_disposition_and_repair: "Validation disposition and repair decision",
  phase_closeout: "Phase closeout decision",
};

export function estimateContextTokens(value: string): number {
  return Math.ceil(new TextEncoder().encode(value).byteLength / 4);
}

export function compileArchitectContextPacket(
  input: ArchitectContextPacketInput,
): ContextPacket {
  const packetId = buildPacketId(
    "architect",
    input.scenario,
    input.relevantPhaseId,
    input.relevantWorkCardId,
  );
  const selection = selectContext(input);
  const scenarioLabel = scenarioDecisionLabels[input.scenario];
  const sections = [
    `# Architect Context Packet — ${scenarioLabel}`,
    "",
    "## Stable Project Contract",
    "",
    input.stableProjectContractSummary.trim(),
    "",
    "## Current Authoritative Workflow State",
    "",
    renderWorkflowState(input.workflowState),
    "",
    "## Exact Decision Requested",
    "",
    input.exactDecisionRequested.trim(),
    "",
    "## Controlling Sources",
    "",
    renderArtifactSelection(selection.includedArtifacts),
    "",
    "## Relevant Open Observations",
    "",
    renderObservationSelection(selection.includedObservations),
    "",
    "## Changed Evidence Since Prior Decision",
    "",
    renderChangedEvidence(selection.includedArtifacts),
    ...(input.priorDecisionSummary?.trim()
      ? ["", "## Prior Decision Summary", "", input.priorDecisionSummary.trim()]
      : []),
  ];

  return finalizePacket({
    packetId,
    packetKind: "architect",
    scenario: input.scenario,
    title: `Architect Context Packet — ${scenarioLabel}`,
    sections,
    input,
    selection,
  });
}

export function compileImplementerExecutionPacket(
  input: ImplementerExecutionPacketInput,
): ContextPacket {
  const packetId = buildPacketId(
    "implementer",
    "work_card_execution",
    input.relevantPhaseId,
    input.workCardId,
  );
  const selection = selectContext({
    ...input,
    relevantWorkCardId: input.workCardId,
  });
  const sections = [
    `# Implementer Execution Packet — ${input.workCardId} ${input.workCardTitle}`,
    "",
    "## Work Card Delta",
    "",
    input.workCardDelta.trim(),
    "",
    "## Architecture And UI Contract References",
    "",
    renderList(input.architectureAndUiContractReferences),
    "",
    "## Exact Acceptance Criteria",
    "",
    renderList(input.acceptanceCriteria),
    "",
    "## Current Authoritative Workflow State",
    "",
    renderWorkflowState(input.workflowState),
    "",
    "## Controlling Sources",
    "",
    renderArtifactSelection(selection.includedArtifacts),
    "",
    "## Relevant Open Observations",
    "",
    renderObservationSelection(selection.includedObservations),
    "",
    "## Repository And Branch Facts",
    "",
    `- Repository: ${input.repositoryFacts.repository}`,
    `- Remote: ${input.repositoryFacts.remote}`,
    `- Base branch: ${input.repositoryFacts.baseBranch}`,
    `- Target branch: ${input.repositoryFacts.targetBranch}`,
    "",
    "## Permanent Rule References",
    "",
    "- `AGENTS.md` (referenced; content intentionally not repeated)",
    ...input.validationLaneReferences.map(
      (reference) => `- \`${reference}\` (referenced; content intentionally not repeated)`,
    ),
    "",
    "## Expected Implementer Report",
    "",
    `- ${input.expectedImplementerReportPath}`,
  ];

  return finalizePacket({
    packetId,
    packetKind: "implementer",
    scenario: "work_card_execution",
    title: `Implementer Execution Packet — ${input.workCardId}`,
    sections,
    input,
    selection,
  });
}

export function authorizeContextPacketExport(
  packet: ContextPacket,
  operatorAcknowledgedOverBudget: boolean,
): ContextPacketExportAuthorization {
  if (packet.manifest.overBudget && !operatorAcknowledgedOverBudget) {
    return {
      allowed: false,
      acknowledgementRequired: true,
      errorMessage: `Packet estimate ${packet.manifest.estimatedTokens} exceeds budget ${packet.manifest.budgetTokens}. Explicit Operator acknowledgment is required before export.`,
    };
  }

  return {
    allowed: true,
    acknowledgementRequired: false,
  };
}

interface ContextSelection {
  includedArtifacts: ContextPacketArtifactInput[];
  excludedArtifacts: Array<{
    artifact: ContextPacketArtifactInput;
    reason: string;
  }>;
  includedObservations: ContextPacketObservationInput[];
  excludedObservations: Array<{
    observation: ContextPacketObservationInput;
    reason: string;
  }>;
}

function selectContext(input: SharedPacketInput): ContextSelection {
  const controlling = new Set([
    ...input.controllingArtifactIds,
    ...(input.changedEvidenceArtifactIds ?? []),
  ]);
  const includedArtifacts: ContextPacketArtifactInput[] = [];
  const excludedArtifacts: ContextSelection["excludedArtifacts"] = [];

  for (const artifact of [...input.artifacts].sort(compareById)) {
    const isControlling = controlling.has(artifact.artifactId);
    const phaseRelevant =
      !input.relevantPhaseId || artifact.phaseId === input.relevantPhaseId;
    const workCardRelevant =
      !input.relevantWorkCardId ||
      artifact.workCardId === input.relevantWorkCardId ||
      artifact.relationshipTags?.includes("cross_cutting_contract") === true;
    const active = !resolvedStatuses.has(normalizeStatus(artifact.status));
    const decisionRelevant = artifact.decisionRelevant !== false;

    if (
      isControlling ||
      (decisionRelevant && active && phaseRelevant && workCardRelevant)
    ) {
      includedArtifacts.push(artifact);
    } else {
      excludedArtifacts.push({
        artifact,
        reason: !active
          ? "Resolved, superseded, archived, or historical evidence is excluded by default."
          : !phaseRelevant
            ? "Artifact belongs to an unrelated phase."
            : "Artifact is unrelated to the current target or decision.",
      });
    }
  }

  const includedObservations: ContextPacketObservationInput[] = [];
  const excludedObservations: ContextSelection["excludedObservations"] = [];
  for (const observation of [...input.observations].sort(compareObservationById)) {
    const open = !resolvedStatuses.has(normalizeStatus(observation.status));
    const phaseRelevant =
      !input.relevantPhaseId ||
      !observation.phaseId ||
      observation.phaseId === input.relevantPhaseId;
    const targetRelevant =
      !input.relevantWorkCardId ||
      observation.workCardId === input.relevantWorkCardId ||
      observation.assignedTarget?.includes(input.relevantWorkCardId) === true;

    if (open && phaseRelevant && targetRelevant) {
      includedObservations.push(observation);
    } else {
      excludedObservations.push({
        observation,
        reason: !open
          ? "Resolved observation is excluded by default."
          : !phaseRelevant
            ? "Observation belongs to an unrelated phase."
            : "Observation is assigned outside the current decision or execution target.",
      });
    }
  }

  return {
    includedArtifacts,
    excludedArtifacts,
    includedObservations,
    excludedObservations,
  };
}

function finalizePacket(input: {
  packetId: string;
  packetKind: ContextPacketKind;
  scenario: ArchitectContextPacketScenario | "work_card_execution";
  title: string;
  sections: string[];
  input: SharedPacketInput;
  selection: ContextSelection;
}): ContextPacket {
  const included = buildIncludedManifest(input.input, input.selection);
  const excluded = buildExcludedManifest(input.selection);
  const budgetTokens =
    input.input.budgetTokens ??
    (input.packetKind === "architect"
      ? defaultContextPacketBudgets.architectTokens
      : defaultContextPacketBudgets.implementerTokens);
  const manifestHeading = [
    "",
    "## Context Manifest Summary",
    "",
    `- Included items: ${included.length}`,
    `- Excluded items: ${excluded.length}`,
  ];
  const markdownWithoutBudget = [...input.sections, ...manifestHeading].join("\n");
  const estimatedTokens = estimateContextTokens(markdownWithoutBudget);
  const overBudget = estimatedTokens > budgetTokens;
  const contributorLimit =
    input.input.largestContributorCount ??
    defaultContextPacketBudgets.largestContributorCount;
  const largestContributors = included
    .map(({ id, title, estimatedTokens: tokens }) => ({
      id,
      title,
      estimatedTokens: tokens,
    }))
    .sort(
      (left, right) =>
        right.estimatedTokens - left.estimatedTokens ||
        left.id.localeCompare(right.id),
    )
    .slice(0, contributorLimit);
  const budgetSection = [
    "",
    "## Token Budget",
    "",
    `- Estimated tokens: ${estimatedTokens}`,
    `- Configured budget: ${budgetTokens}`,
    `- Status: ${overBudget ? "Over budget — explicit Operator acknowledgment required before export" : "Within budget"}`,
    "- Estimate method: UTF-8 bytes divided by four, rounded up",
    "- Largest contributors:",
    ...largestContributors.map(
      (contributor) =>
        `  - ${contributor.title}: ${contributor.estimatedTokens} tokens`,
    ),
  ];
  const markdown = `${markdownWithoutBudget}${budgetSection.join("\n")}\n`;
  const phaseSegment = input.input.relevantPhaseId ?? "project";
  const fileStem = input.packetId.toUpperCase().replace(/[^A-Z0-9-]+/g, "_");
  const folder = `planning/${phaseSegment === "project" ? "project" : `phases/${phaseSegment}`}/Context_Packets`;

  return {
    packetId: input.packetId,
    packetKind: input.packetKind,
    scenario: input.scenario,
    title: input.title,
    markdown,
    manifest: {
      packetId: input.packetId,
      packetKind: input.packetKind,
      scenario: input.scenario,
      included,
      excluded,
      estimatedTokens,
      budgetTokens,
      overBudget,
      requiresOperatorAcknowledgment: overBudget,
      largestContributors,
      estimationMethod: "utf8_bytes_divided_by_four_rounded_up",
    },
    suggestedPacketPath: `${folder}/${fileStem}.md`,
    suggestedManifestPath: `${folder}/${fileStem}_MANIFEST.md`,
  };
}

function buildIncludedManifest(
  input: SharedPacketInput,
  selection: ContextSelection,
): ContextPacketManifestEntry[] {
  const entries: ContextPacketManifestEntry[] = [
    {
      id: "project-contract",
      title: "Stable project contract summary",
      category: "contract",
      estimatedTokens: estimateContextTokens(input.stableProjectContractSummary),
      reason: "Stable decisions constrain the requested decision or execution.",
    },
    {
      id: "workflow-state",
      title: "Current authoritative workflow state",
      category: "contract",
      estimatedTokens: estimateContextTokens(renderWorkflowState(input.workflowState)),
      reason: "The current action and routed authority control the packet.",
    },
    ...selection.includedArtifacts.map((artifact) => ({
      id: artifact.artifactId,
      title: artifact.title,
      category: "artifact" as const,
      estimatedTokens: estimateContextTokens(artifact.content || artifact.summary),
      reason: input.controllingArtifactIds.includes(artifact.artifactId)
        ? "Explicit controlling source."
        : artifact.changedSincePriorDecision
          ? "Changed evidence since the prior decision."
          : "Relevant active source for the current phase and target.",
    })),
    ...selection.includedObservations.map((observation) => ({
      id: observation.observationId,
      title: observation.title,
      category: "observation" as const,
      estimatedTokens: estimateContextTokens(observation.summary),
      reason: "Open observation relevant to the current phase and target.",
    })),
    {
      id: "AGENTS.md",
      title: "Repository operating rules",
      category: "rule_reference",
      estimatedTokens: estimateContextTokens("AGENTS.md"),
      reason: "Referenced rather than repeated to avoid stable-context duplication.",
    },
    {
      id: "docs/dev/VALIDATION_COMMAND_LANES.md",
      title: "Validation command lanes",
      category: "rule_reference",
      estimatedTokens: estimateContextTokens(
        "docs/dev/VALIDATION_COMMAND_LANES.md",
      ),
      reason: "Referenced rather than repeated to avoid stable-context duplication.",
    },
  ];

  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

function buildExcludedManifest(
  selection: ContextSelection,
): ContextPacketManifestEntry[] {
  return [
    ...selection.excludedArtifacts.map(({ artifact, reason }) => ({
      id: artifact.artifactId,
      title: artifact.title,
      category: "artifact" as const,
      estimatedTokens: estimateContextTokens(artifact.content || artifact.summary),
      reason,
    })),
    ...selection.excludedObservations.map(({ observation, reason }) => ({
      id: observation.observationId,
      title: observation.title,
      category: "observation" as const,
      estimatedTokens: estimateContextTokens(observation.summary),
      reason,
    })),
  ].sort((left, right) => left.id.localeCompare(right.id));
}

function renderWorkflowState(state: ContextPacketWorkflowState): string {
  return [
    `- Revision: ${state.revision}`,
    `- Stage: ${state.currentProjectStage}`,
    `- Active phase: ${state.activePhaseId ?? "not applicable"}`,
    `- Current action: ${state.currentActionId}`,
    `- Responsible role: ${state.responsibleRole}`,
    `- Authoritative target: ${state.authoritativeTargetArtifactId ?? "none"}`,
    `- Required sources: ${state.requiredSourceArtifactIds.join(", ") || "none"}`,
    `- Expected output: ${state.expectedOutputArtifactId ?? "none"}${state.expectedOutputArtifactType ? ` (${state.expectedOutputArtifactType})` : ""}`,
    `- Success route: ${state.successRoute ?? "none"}`,
    `- Failure route: ${state.failureRoute ?? "none"}`,
    `- Repair route: ${state.repairRoute ?? "none"}`,
    `- Blocking conditions: ${state.blockingConditions.join("; ") || "none"}`,
    `- Open repair chain: ${state.openRepairChain.join(" → ") || "none"}`,
  ].join("\n");
}

function renderArtifactSelection(artifacts: ContextPacketArtifactInput[]): string {
  if (artifacts.length === 0) {
    return "No controlling artifact content was included.";
  }
  return artifacts
    .map(
      (artifact) =>
        `### ${artifact.title}\n\n- Artifact ID: ${artifact.artifactId}\n- Type: ${artifact.artifactType}\n- Status: ${artifact.status}\n\n${(artifact.content || artifact.summary).trim()}`,
    )
    .join("\n\n");
}

function renderObservationSelection(
  observations: ContextPacketObservationInput[],
): string {
  return observations.length === 0
    ? "No open observation is relevant to this decision."
    : observations
        .map(
          (observation) =>
            `- ${observation.observationId} — ${observation.title}: ${observation.summary}`,
        )
        .join("\n");
}

function renderChangedEvidence(artifacts: ContextPacketArtifactInput[]): string {
  const changed = artifacts.filter((artifact) => artifact.changedSincePriorDecision);
  return changed.length === 0
    ? "No changed evidence was identified."
    : changed
        .map((artifact) => `- ${artifact.artifactId}: ${artifact.summary}`)
        .join("\n");
}

function renderList(items: string[]): string {
  return items.length === 0 ? "- None identified." : items.map((item) => `- ${item}`).join("\n");
}

function buildPacketId(
  kind: ContextPacketKind,
  scenario: string,
  phaseId?: string,
  workCardId?: string,
): string {
  return ["champcity-ai", phaseId ?? "project", kind, scenario, workCardId]
    .filter(Boolean)
    .join("/");
}

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

function compareById(
  left: ContextPacketArtifactInput,
  right: ContextPacketArtifactInput,
): number {
  return left.artifactId.localeCompare(right.artifactId);
}

function compareObservationById(
  left: ContextPacketObservationInput,
  right: ContextPacketObservationInput,
): number {
  return left.observationId.localeCompare(right.observationId);
}
