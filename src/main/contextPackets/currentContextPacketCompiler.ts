import {
  type ArchitectContextPacketScenario,
  compileArchitectContextPacket,
  compileImplementerExecutionPacket,
  type ContextPacket,
  type ContextPacketArtifactInput,
  type ContextPacketObservationInput,
  type ContextPacketWorkflowState,
  type CurrentContextPacketPreviewRequest,
  type CurrentContextPacketPreviewResult,
} from "../../shared/contextPackets/contextPacket";
import type { ArtifactRegistryEntry, JsonValue } from "../../shared/artifacts";
import type { RoutedActionContract } from "../../shared/workflow";
import type { CanonicalWorkflowAuthority } from "../workCards/canonicalWorkflowAuthority";

const stableProjectContractSummary = [
  "ChampCity A/I uses Capture → Frame → Plan → Build → Prove.",
  "The canonical workflow-state index controls the routed action; reference navigation is non-authoritative.",
  "Durable artifacts are synchronized Markdown/JSON pairs committed through the canonical registry.",
  "Operator, Architect, Implementer, and application role gates govern decisions and transitions.",
].join(" ");

export class CurrentContextPacketCompiler {
  constructor(private readonly authority: CanonicalWorkflowAuthority) {}

  async preview(
    request: CurrentContextPacketPreviewRequest,
  ): Promise<CurrentContextPacketPreviewResult> {
    try {
      const snapshot = await this.authority.routedActions.getAuthoritySnapshot();
      const action = snapshot.routedAction;
      if (!action) throw new Error("No current routed action is available for a packet.");
      const registry = await this.authority.artifactPairs.loadRegistry();
      if (!registry) throw new Error("The canonical artifact registry is unavailable.");
      const routedTargetEntry = action.targetArtifactId
        ? registry.entries.find(
            (entry) =>
              entry.artifactId === action.targetArtifactId &&
              entry.authoritative &&
              entry.synchronized,
          )
        : undefined;
      const routedSourceEntries = action.sourceArtifactIds
        .map((artifactId) =>
          registry.entries.find(
            (entry) =>
              entry.artifactId === artifactId &&
              entry.authoritative &&
              entry.synchronized,
          ),
        )
        .filter((entry): entry is ArtifactRegistryEntry => Boolean(entry));
      const workCardEntry =
        routedTargetEntry?.artifactType === "work_card"
          ? routedTargetEntry
          : routedSourceEntries.find((entry) => entry.artifactType === "work_card");
      const targetPair = workCardEntry
        ? await this.authority.artifactPairs.readArtifactByPaths(
            workCardEntry.jsonPath,
            workCardEntry.markdownPath,
          )
        : undefined;
      const targetData = asRecord(targetPair?.artifact.payload.data);
      const phaseId = snapshot.state.activePhaseId ?? undefined;
      const workCardId =
        textValue(targetData?.workCardId) ??
        workCardEntry?.workCardId ??
        routedSourceEntries.find((entry) => entry.workCardId)?.workCardId;
      const scenario = request.architectScenario ?? "implementer_report_review";
      const decisionPlan = buildDecisionAuthorityPlan({
        packetKind: request.packetKind,
        scenario,
        action,
        entries: registry.entries,
        routedTargetEntry,
        workCardEntry,
        phaseId,
        workCardId,
      });
      const artifacts: ContextPacketArtifactInput[] = [];
      for (const entry of registry.entries) {
        const controlling = decisionPlan.controllingArtifactIds.has(entry.artifactId);
        let title = entry.artifactId;
        let content: string | undefined;
        if (controlling) {
          const pair = await this.authority.artifactPairs.readArtifactByPaths(
            entry.jsonPath,
            entry.markdownPath,
          );
          title = pair.artifact.payload.title;
          content = usesBoundedDecisionSummary(entry, request.packetKind, scenario)
            ? toBoundedDecisionSummary(pair.artifact.payload.contentMarkdown)
            : pair.artifact.payload.contentMarkdown;
        }
        artifacts.push({
          artifactId: entry.artifactId,
          artifactType: entry.artifactType,
          title,
          status: entry.status,
          summary: `${entry.artifactType} revision ${entry.revision}`,
          ...(content ? { content } : {}),
          ...(entry.phaseId ? { phaseId: entry.phaseId } : {}),
          ...(entry.workCardId ? { workCardId: entry.workCardId } : {}),
          relationshipTags: isCrossCuttingContract(entry.jsonPath)
            ? ["cross_cutting_contract"]
            : [],
          changedSincePriorDecision:
            decisionPlan.changedEvidenceArtifactIds.has(entry.artifactId),
          decisionRelevant: controlling,
        });
      }
      const observations = await this.readObservations(registry.entries);
      const workflowState = toPacketWorkflowState(snapshot.state);

      let packet: ContextPacket;
      if (request.packetKind === "architect") {
        packet = compileArchitectContextPacket({
          scenario,
          projectId: snapshot.state.projectId,
          stableProjectContractSummary,
          workflowState,
          artifacts,
          observations,
          controllingArtifactIds: [...decisionPlan.controllingArtifactIds],
          changedEvidenceArtifactIds: [...decisionPlan.changedEvidenceArtifactIds],
          relevantPhaseId: phaseId,
          relevantWorkCardId: decisionPlan.relevantWorkCardId,
          exactDecisionRequested: decisionRequestFor(
            scenario,
            action.actionId,
            workCardId,
          ),
          ...(request.budgetTokens === undefined
            ? {}
            : { budgetTokens: request.budgetTokens }),
        });
      } else {
        if (!workCardId || !targetData || !workCardEntry) {
          throw new Error("The current route does not identify a Work Card for Implementer execution.");
        }
        const workCardTitle = textValue(targetData.title) ?? workCardId;
        packet = compileImplementerExecutionPacket({
          projectId: snapshot.state.projectId,
          stableProjectContractSummary,
          workflowState,
          artifacts,
          observations,
          controllingArtifactIds: [...decisionPlan.controllingArtifactIds],
          changedEvidenceArtifactIds: [...decisionPlan.changedEvidenceArtifactIds],
          relevantPhaseId: phaseId,
          workCardId,
          workCardTitle,
          workCardDelta:
            textValue(targetData.goal) ??
            "Execute only the current canonical Work Card acceptance delta.",
          architectureAndUiContractReferences: [
            "docs/architecture/WORKFLOW_AUTHORITY_CONTRACT.md",
            "docs/architecture/ARTIFACT_PAIR_AND_REVISION_STANDARD.md",
            "docs/architecture/ROUTED_ACTION_CONTRACT.md",
            "docs/architecture/ROLE_GATE_CONTRACT.md",
          ],
          acceptanceCriteria: stringArray(targetData.acceptanceCriteria),
          repositoryFacts: {
            repository: "<PROJECT_REPO>",
            baseBranch: textValue(targetData.implementerBaseBranch) ?? "approved base branch",
            targetBranch:
              textValue(targetData.implementerTargetBranch) ?? "approved feature branch",
            remote: "ChampCityChris/ChampCity_AI",
          },
          validationLaneReferences: ["docs/dev/VALIDATION_COMMAND_LANES.md"],
          expectedImplementerReportPath: `planning/phases/${phaseId ?? "<phase-folder>"}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_<slug>.md`,
          ...(request.budgetTokens === undefined
            ? {}
            : { budgetTokens: request.budgetTokens }),
        });
      }
      return { ok: true, packet };
    } catch (error) {
      return {
        ok: false,
        errorMessages: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private async readObservations(
    entries: Array<{
      artifactId: string;
      artifactType: string;
      authoritative: boolean;
      synchronized: boolean;
      jsonPath: string;
      markdownPath: string;
      phaseId?: string;
    }>,
  ): Promise<ContextPacketObservationInput[]> {
    const observations: ContextPacketObservationInput[] = [];
    for (const entry of entries.filter(
      (candidate) =>
        candidate.artifactType === "observation_register" &&
        candidate.authoritative &&
        candidate.synchronized,
    )) {
      const pair = await this.authority.artifactPairs.readArtifactByPaths(
        entry.jsonPath,
        entry.markdownPath,
      );
      const data = asRecord(pair.artifact.payload.data);
      for (const value of [
        ...arrayValue(data?.observations),
        ...arrayValue(data?.openObservations),
      ]) {
        const observation = asRecord(value);
        const observationId = textValue(observation?.id);
        if (!observationId || !observation) continue;
        const summary =
          textValue(observation.latestValidationObservation) ??
          textValue(observation.operatorObservation) ??
          textValue(observation.summary) ??
          "Open observation.";
        observations.push({
          observationId,
          title: textValue(observation.title) ?? observationId,
          status: textValue(observation.status) ?? "open",
          summary,
          ...(textValue(observation.assignedTarget)
            ? { assignedTarget: textValue(observation.assignedTarget) }
            : {}),
          ...(entry.phaseId ? { phaseId: entry.phaseId } : {}),
          ...(extractWorkCardId(textValue(observation.assignedTarget))
            ? { workCardId: extractWorkCardId(textValue(observation.assignedTarget)) }
            : {}),
        });
      }
    }
    return observations;
  }
}

interface DecisionAuthorityPlanInput {
  packetKind: "architect" | "implementer";
  scenario: ArchitectContextPacketScenario;
  action: RoutedActionContract;
  entries: ArtifactRegistryEntry[];
  routedTargetEntry?: ArtifactRegistryEntry;
  workCardEntry?: ArtifactRegistryEntry;
  phaseId?: string;
  workCardId?: string;
}

interface DecisionAuthorityPlan {
  controllingArtifactIds: Set<string>;
  changedEvidenceArtifactIds: Set<string>;
  relevantWorkCardId?: string;
}

const reviewEvidenceTypes = new Set([
  "implementer_report",
  "architect_review",
  "validation_report",
]);

const workCardCreationAuthorityTypes = new Set([
  "phase_map",
  "phase_planning",
  "work_card_plan",
  "backlog",
  "roadmap",
]);

const phaseCloseoutAuthorityTypes = new Set([
  "phase_map",
  "phase_planning",
  "work_card_plan",
  "approval",
  "phase_closeout",
  "phase_closeout_approval",
  "roadmap",
]);

const implementerAntecedentTypes = new Set([
  "architect_review",
  "validation_report",
  "repair_record",
]);

function buildDecisionAuthorityPlan(
  input: DecisionAuthorityPlanInput,
): DecisionAuthorityPlan {
  const synchronizedEntries = input.entries.filter((entry) => entry.synchronized);
  const synchronizedEntriesById = new Map(
    synchronizedEntries.map((entry) => [entry.artifactId, entry]),
  );
  const eligibleEntries = input.entries.filter(
    (entry) => entry.authoritative && entry.synchronized,
  );
  const entriesById = new Map(
    eligibleEntries.map((entry) => [entry.artifactId, entry]),
  );
  const controllingArtifactIds = new Set<string>();
  const changedEvidenceArtifactIds = new Set<string>();
  const add = (entry: ArtifactRegistryEntry | undefined, changed = false): void => {
    if (!entry) return;
    controllingArtifactIds.add(entry.artifactId);
    if (changed) changedEvidenceArtifactIds.add(entry.artifactId);
  };
  const addById = (artifactId: string, changed = false): void =>
    add(entriesById.get(artifactId), changed);
  const routedSources = input.action.sourceArtifactIds
    .map((artifactId) => entriesById.get(artifactId))
    .filter((entry): entry is ArtifactRegistryEntry => Boolean(entry));
  const exactWorkCardEvidence = eligibleEntries.filter(
    (entry) =>
      Boolean(input.workCardId) &&
      entry.workCardId === input.workCardId &&
      reviewEvidenceTypes.has(entry.artifactType),
  );
  const activeExactWorkCardEvidence = exactWorkCardEvidence.filter((entry) =>
    isActiveAuthorityStatus(entry.status),
  );

  if (input.packetKind === "implementer") {
    add(input.workCardEntry);
    if (input.workCardEntry?.parentArtifactId) {
      addById(input.workCardEntry.parentArtifactId);
    }
    for (const sourceId of input.workCardEntry?.relationships.sources ?? []) {
      const source = synchronizedEntriesById.get(sourceId);
      if (source && implementerAntecedentTypes.has(source.artifactType)) add(source);
    }
    return {
      controllingArtifactIds,
      changedEvidenceArtifactIds,
      ...(input.workCardId ? { relevantWorkCardId: input.workCardId } : {}),
    };
  }

  switch (input.scenario) {
    case "implementer_report_review": {
      add(input.workCardEntry ?? input.routedTargetEntry);
      const routedReports = routedSources.filter(
        (entry) => entry.artifactType === "implementer_report",
      );
      const reports =
        routedReports.length > 0
          ? routedReports
          : activeExactWorkCardEvidence.filter(
              (entry) => entry.artifactType === "implementer_report",
            );
      for (const report of reports) add(report, true);
      break;
    }
    case "validation_disposition_and_repair": {
      add(input.workCardEntry ?? input.routedTargetEntry);
      for (const source of routedSources) {
        if (reviewEvidenceTypes.has(source.artifactType)) add(source, true);
      }
      for (const evidence of activeExactWorkCardEvidence) add(evidence, true);
      for (const sourceId of input.workCardEntry?.relationships.sources ?? []) {
        const source = synchronizedEntriesById.get(sourceId);
        if (source && reviewEvidenceTypes.has(source.artifactType)) add(source);
      }
      break;
    }
    case "work_card_creation": {
      add(input.workCardEntry ?? input.routedTargetEntry);
      for (const entry of eligibleEntries) {
        const phaseAuthority =
          entry.phaseId === input.phaseId &&
          workCardCreationAuthorityTypes.has(entry.artifactType) &&
          isActiveAuthorityStatus(entry.status);
        const projectAuthority =
          !entry.phaseId &&
          ["phase_map", "roadmap"].includes(entry.artifactType) &&
          isActiveAuthorityStatus(entry.status);
        if (phaseAuthority || projectAuthority) add(entry);
      }
      for (const source of routedSources) {
        if (reviewEvidenceTypes.has(source.artifactType)) add(source, true);
      }
      for (const sourceId of input.workCardEntry?.relationships.sources ?? []) {
        const source = synchronizedEntriesById.get(sourceId);
        if (source && reviewEvidenceTypes.has(source.artifactType)) {
          add(source, isActiveAuthorityStatus(source.status));
        }
      }
      break;
    }
    case "phase_closeout": {
      add(input.workCardEntry ?? input.routedTargetEntry);
      for (const entry of eligibleEntries) {
        const phaseAuthority =
          entry.phaseId === input.phaseId &&
          phaseCloseoutAuthorityTypes.has(entry.artifactType) &&
          isActiveAuthorityStatus(entry.status);
        const projectAuthority =
          !entry.phaseId &&
          ["phase_map", "roadmap"].includes(entry.artifactType) &&
          isActiveAuthorityStatus(entry.status);
        if (phaseAuthority || projectAuthority) add(entry);
      }
      for (const source of routedSources) {
        if (reviewEvidenceTypes.has(source.artifactType)) add(source, true);
      }
      for (const evidence of activeExactWorkCardEvidence) add(evidence, true);
      break;
    }
  }

  return {
    controllingArtifactIds,
    changedEvidenceArtifactIds,
    ...(input.scenario === "phase_closeout" || !input.workCardId
      ? {}
      : { relevantWorkCardId: input.workCardId }),
  };
}

function isActiveAuthorityStatus(status: ArtifactRegistryEntry["status"]): boolean {
  return status === "active" || status === "pending" || status === "blocked";
}

function usesBoundedDecisionSummary(
  entry: ArtifactRegistryEntry,
  packetKind: "architect" | "implementer",
  scenario: ArchitectContextPacketScenario,
): boolean {
  if (packetKind !== "architect") return false;
  const broadAuthorityTypes =
    scenario === "phase_closeout"
      ? phaseCloseoutAuthorityTypes
      : scenario === "work_card_creation"
        ? workCardCreationAuthorityTypes
        : undefined;
  return broadAuthorityTypes?.has(entry.artifactType) === true;
}

function toBoundedDecisionSummary(content: string, maximumCharacters = 1_200): string {
  const normalized = content.trim();
  if (normalized.length <= maximumCharacters) return normalized;
  const candidate = normalized.slice(0, maximumCharacters);
  const lastParagraph = candidate.lastIndexOf("\n\n");
  const boundary = lastParagraph >= maximumCharacters / 2
    ? lastParagraph
    : maximumCharacters;
  const excerpt = candidate.slice(0, boundary).trimEnd();
  return `${excerpt}\n\n[Bounded authority excerpt; ${normalized.length - boundary} characters omitted.]`;
}

function toPacketWorkflowState(
  state: Awaited<ReturnType<CanonicalWorkflowAuthority["routedActions"]["getAuthoritySnapshot"]>>["state"],
): ContextPacketWorkflowState {
  const action = state.currentAction;
  if (!action) throw new Error("No current routed action is available.");
  return {
    revision: state.stateRevision,
    currentProjectStage: state.currentStage,
    ...(state.activePhaseId ? { activePhaseId: state.activePhaseId } : {}),
    currentActionId: action.actionId,
    responsibleRole: action.role,
    ...(action.targetArtifactId
      ? { authoritativeTargetArtifactId: action.targetArtifactId }
      : {}),
    requiredSourceArtifactIds: [...action.sourceArtifactIds],
    expectedOutputArtifactId: action.expectedOutput.artifactId,
    expectedOutputArtifactType: action.expectedOutput.artifactType,
    successRoute: action.routes.success ?? undefined,
    failureRoute: action.routes.failure ?? undefined,
    repairRoute: action.routes.repair ?? undefined,
    blockingConditions: state.blockingConditions.map((blocker) => blocker.message),
    openRepairChain: [
      ...(state.openRepairChain.rootWorkCardArtifactId
        ? [state.openRepairChain.rootWorkCardArtifactId]
        : []),
      ...state.openRepairChain.activeRepairArtifactIds,
    ],
  };
}

function decisionRequestFor(
  scenario: NonNullable<CurrentContextPacketPreviewRequest["architectScenario"]>,
  actionId: string,
  workCardId?: string,
): string {
  const target = workCardId ?? "the current authoritative target";
  const decisions = {
    work_card_creation: `Create the smallest just-in-time Work Card required after ${actionId}.`,
    implementer_report_review: `Review the authoritative Implementer Report for ${target} and decide its validation disposition.`,
    validation_disposition_and_repair: `Classify validation evidence for ${target} and decide whether a repair Work Card is required.`,
    phase_closeout: "Decide whether the active phase is ready for Operator closeout approval.",
  };
  return decisions[scenario];
}

function asRecord(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : undefined;
}

function arrayValue(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: JsonValue | undefined): string[] {
  return arrayValue(value).filter((item): item is string => typeof item === "string");
}

function textValue(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function extractWorkCardId(value?: string): string | undefined {
  return value?.match(/\bWC\d+(?:-REPAIR\d+)?\b/i)?.[0].toUpperCase();
}

function isCrossCuttingContract(jsonPath: string): boolean {
  return (
    jsonPath.startsWith("planning/project/Design_Documents/") ||
    jsonPath.startsWith("docs/architecture/")
  );
}
