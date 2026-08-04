import fs from "node:fs";
import path from "node:path";
import {
  metadataWithDisposition,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import type {
  ArchitectOutputDocumentSlotModel,
  ArchitectOutputPresentedSlotRevision,
  ArchitectOutputWorkspaceModel,
  ArchitectOutputWorkspaceState,
  ProjectLifecycleRailStatus,
  RuntimeActionResult,
  WorkspaceId,
} from "../../shared/workspaceContracts";
import { updateCanonicalMarkdownDisposition, writeCanonicalMarkdownDocuments } from "../documents/canonicalMarkdownDocumentWriter";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import { prepareArchitectInterviewHandoff, getArchitectInterviewWorkspaceModel } from "../architectInterview/architectInterviewService";
import {
  generateProjectPlanningHandoff,
  getProjectPlanningWorkspaceModel,
  prepareProjectPlanningHandoff,
} from "../projectPlanning/projectPlanningService";
import { generatePhaseMapHandoff } from "../phaseMap/phaseMapService";
import {
  getPhaseInterviewWorkspaceModel,
  preparePhaseInterviewHandoff,
} from "../phaseInterview/phaseInterviewService";
import {
  getPhasePlanningWorkspaceModel,
  preparePhasePlanningHandoff,
} from "../phasePlanning/phasePlanningService";
import {
  getActiveArchitectOutputRuntimeSubmission,
  getActivePreparedArchitectOutputInstruction,
  getArchitectOutputRuntimeStatus,
} from "./architectOutputRuntimeService";
import {
  activeProductionArchitectOutputDefinitions,
  productionArchitectOutputCatalog,
  resolveProductionArchitectOutputDefinition,
} from "./productionArchitectOutputCatalog";
import { prepareFormalWorkCardDraftSubmission } from "../workCardPlanning/workCardPlanningService";
import { buildApprovedFormalWorkCardAndReportDocuments } from "../workCardBuilding/workCardBuildingReviewService";
import {
  prepareRepairWorkCardDraftSubmission,
  resolveExactActiveRepairWorkCardContext,
} from "../workCardRepair/workCardRepairService";

export function getArchitectOutputWorkspaceModel(
  workspaceRoot: string,
  workspaceId: WorkspaceId,
): ArchitectOutputWorkspaceModel {
  const definition = resolveDefinitionByWorkspace(workspaceId);
  getArchitectOutputRuntimeStatus(workspaceRoot, definition.outputKind, definition.owningWorkspaceId);
  const documents = listPlanningDocuments(workspaceRoot);
  const slots = documentSlotsForDefinition(workspaceRoot, documents, definition.outputKind, workspaceId);
  const submission = getActiveArchitectOutputRuntimeSubmission(workspaceRoot, workspaceId);
  const classifiedState = deriveState(slots, submission?.submission.state);
  const model = domainOverlay(workspaceRoot, workspaceId, classifiedState);
  const state = model.state ?? classifiedState;
  const handoff = sourceHandoffFromSubmission(submission?.submission.sourceHandoff) ??
    exactHandoffForWorkspace(workspaceRoot, documents, workspaceId);
  const preparedInstruction = submission && canCopySubmission(submission.submission.state)
    ? submission.preparedInstruction
    : undefined;

  return {
    workspaceId,
    outputKind: definition.outputKind,
    bundleMode: definition.bundleMode,
    state,
    railStatus: railStatusForState(state),
    requiredAction: model.requiredAction ?? requiredActionForState(state),
    reason: model.reason ?? reasonForState(state),
    evidencePaths: model.evidencePaths ?? slots.map((slot) => slot.targetPath),
    handoff,
    preparedInstruction,
    submission: submission
      ? {
          submissionId: submission.submission.submissionId,
          state: submission.submission.state,
          draftSlots: submission.submission.expectedDraftSlots.map((slot) => ({
            slotId: slot.slotId,
            displayLabel: slot.displayLabel,
            draftRelativePath: slot.draftRelativePath,
          })),
        }
      : undefined,
    promotionError: submission?.promotionError,
    cleanupStatus: submission?.cleanupStatus,
    cleanupError: submission?.cleanupError,
    canPrepareHandoff: model.canPrepareHandoff ?? canPrepareFromState(state),
    canCopyHandoff: Boolean(preparedInstruction),
    reviewMode: definition.bundleMode === "atomic-bundle" ? "compound" : "single",
    documentSlots: slots,
    canApplyDisposition: slots.length > 0 && slots.every(isReviewableSlot),
    currentOperatorReviewNotes: sharedReviewNotes(slots, documents),
    domain: model.domain,
  };
}

function exactHandoffForWorkspace(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  workspaceId: WorkspaceId,
): { path: string; revision: number } | undefined {
  if (workspaceId !== "work-card-repair") {
    return handoffForWorkspace(documents, workspaceId);
  }
  const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
  const handoff = resolved.context?.handoff;
  return handoff
    ? { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 }
    : undefined;
}

export function prepareArchitectOutputHandoff(
  workspaceRoot: string,
  workspaceId: WorkspaceId,
): ArchitectOutputWorkspaceModel {
  resolveDefinitionByWorkspace(workspaceId);
  switch (workspaceId) {
    case "architect-interview":
      prepareArchitectInterviewHandoff(workspaceRoot);
      break;
    case "project-planning-review":
      prepareProjectPlanningHandoff(workspaceRoot);
      break;
    case "project-phase-map":
      generatePhaseMapHandoff(workspaceRoot);
      break;
    case "phase-interview":
      preparePhaseInterviewHandoff(workspaceRoot);
      break;
    case "phase-planning-bundle":
      preparePhasePlanningHandoff(workspaceRoot);
      break;
    case "work-card-planning":
      prepareFormalWorkCardDraftSubmission(workspaceRoot);
      break;
    case "work-card-repair":
      prepareRepairWorkCardDraftSubmission(workspaceRoot);
      break;
    default:
      throw new Error(`Workspace does not own an Architect output definition: ${workspaceId}`);
  }
  return getArchitectOutputWorkspaceModel(workspaceRoot, workspaceId);
}

export function getPreparedArchitectOutputInstruction(
  workspaceRoot: string,
  workspaceId: WorkspaceId,
): string {
  const definition = resolveDefinitionByWorkspace(workspaceId);
  const instruction = getActivePreparedArchitectOutputInstruction(
    workspaceRoot,
    definition.owningWorkspaceId,
  );
  if (!instruction) {
    throw new Error("Prepare Handoff must be completed before Copy Handoff.");
  }
  return instruction;
}

export function copyArchitectOutputHandoffResult(
  workspaceId: WorkspaceId,
  instruction: string,
): RuntimeActionResult {
  return {
    ok: true,
    action: "architectOutput:copyHandoff",
    message: "Prepared Architect handoff copied. Paste and send it manually in the embedded ChatGPT pane.",
    payload: { bytes: Buffer.byteLength(instruction, "utf8"), workspaceId },
  };
}

export function resolveArchitectOutputCopyHandoff(
  workspaceRoot: string,
  workspaceId: WorkspaceId,
): { instruction: string; result: RuntimeActionResult } {
  const instruction = getPreparedArchitectOutputInstruction(workspaceRoot, workspaceId);
  return {
    instruction,
    result: copyArchitectOutputHandoffResult(workspaceId, instruction),
  };
}

export function reviewArchitectOutput(
  workspaceRoot: string,
  workspaceId: WorkspaceId,
  status: DocumentDispositionStatus,
  operatorReviewNotes = "",
  presentedRevisions: ArchitectOutputPresentedSlotRevision[] = [],
): ArchitectOutputWorkspaceModel {
  const model = getArchitectOutputWorkspaceModel(workspaceRoot, workspaceId);
  const notes = operatorReviewNotes.trim();
  if (status === "RevisionRequested" && !notes) {
    throw new Error("RevisionRequested requires Operator revision instructions.");
  }
  if (!model.canApplyDisposition) {
    throw new Error(model.reason || "Current Architect output is not reviewable.");
  }
  assertPresentedRevisionsMatchCurrentSlots(model, presentedRevisions);
  if (model.bundleMode === "atomic-bundle") {
    assertAtomicBundleReviewable(model);
  }
  const reviewedAt = new Date().toISOString();
  if (model.bundleMode === "single-output") {
    const slot = model.documentSlots[0];
    if (workspaceId === "work-card-planning" && status === "Approved") {
      writeCanonicalMarkdownDocuments(buildApprovedFormalWorkCardAndReportDocuments({
        workspaceRoot,
        formalWorkCardPath: slot.targetPath,
        approvedStatus: status,
        notes,
        reviewedAt,
      }));
    } else {
      updateCanonicalMarkdownDisposition({
        workspaceRoot,
        relativePath: slot.targetPath,
        status,
        notes,
        reviewedAt,
      });
    }
  } else {
    writeCanonicalMarkdownDocuments(model.documentSlots.map((slot) => {
      const existing = parseCanonicalMarkdownDocument(
        fs.readFileSync(path.join(path.resolve(workspaceRoot), slot.targetPath), "utf8"),
      );
      return {
        workspaceRoot,
        relativePath: slot.targetPath,
        metadata: metadataWithDisposition(existing.metadata, status, notes, reviewedAt),
        bodyMarkdown: existing.bodyMarkdown,
      };
    }));
  }
  return getArchitectOutputWorkspaceModel(workspaceRoot, workspaceId);
}

function resolveDefinitionByWorkspace(workspaceId: WorkspaceId) {
  const entry = productionArchitectOutputCatalog.find((candidate) =>
    candidate.owningWorkspaceId === workspaceId
  );
  if (!entry?.definition || !activeProductionArchitectOutputDefinitions().includes(entry.definition)) {
    throw new Error(`Workspace does not own an active Architect output definition: ${workspaceId}`);
  }
  return resolveProductionArchitectOutputDefinition(entry.outputKind, workspaceId);
}

function documentSlotsForDefinition(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  outputKind: string,
  workspaceId: WorkspaceId,
): ArchitectOutputDocumentSlotModel[] {
  const targets = targetPathsForWorkspace(workspaceRoot, documents, outputKind, workspaceId);
  const definition = resolveProductionArchitectOutputDefinition(outputKind, workspaceId);
  return definition.slots.map((slot) => {
    const targetPath = targets.get(slot.slotId) ?? "";
    const document = targetPath
      ? documents.find((candidate) => candidate.markdownPath === targetPath)
      : undefined;
    const freshness = document?.documentReadState === "readable"
      ? evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state
      : undefined;
    return {
      slotId: slot.slotId,
      displayLabel: slot.displayLabel,
      targetPath,
      logicalDocumentId: document?.logicalDocumentId,
      artifactRevision: document?.metadata.artifactRevision,
      disposition: document?.effectiveDisposition,
      documentReadState: document?.documentReadState ?? (targetPath ? "missing" : "unresolved"),
      freshnessState: freshness === "fresh" || freshness === "stale" ? freshness : undefined,
      readError: document?.readError,
    };
  });
}

function targetPathsForWorkspace(
  workspaceRoot: string,
  documents: PlanningDocumentSummary[],
  outputKind: string,
  workspaceId: WorkspaceId,
): Map<string, string> {
  const targets = new Map<string, string>();
  if (workspaceId === "architect-interview") {
    const prompt = handoffForWorkspace(documents, workspaceId);
    const target = prompt
      ? documents.find((document) => document.markdownPath === prompt.path)?.metadata.canonical?.workflowData.outputMarkdownPath
      : undefined;
    targets.set("interview", typeof target === "string" ? target : latestPath(documents, outputKind));
  } else if (workspaceId === "project-planning-review") {
    const handoff = handoffForWorkspace(documents, workspaceId);
    const handoffDocument = handoff ? documents.find((document) => document.markdownPath === handoff.path) : undefined;
    targets.set("project-profile", stringValue(handoffDocument?.metadata.canonical?.workflowData.projectProfileTarget) ?? "planning/project/PROJECT_PROFILE.md");
    targets.set("project-roadmap", stringValue(handoffDocument?.metadata.canonical?.workflowData.projectRoadmapTarget) ?? latestPath(documents, "project-roadmap"));
  } else if (workspaceId === "project-phase-map") {
    const handoff = handoffForWorkspace(documents, workspaceId);
    const handoffDocument = handoff ? documents.find((document) => document.markdownPath === handoff.path) : undefined;
    targets.set("phase-map", stringValue(handoffDocument?.metadata.canonical?.workflowData.phaseMapTarget) ?? latestPath(documents, "phase-map"));
  } else if (workspaceId === "phase-interview") {
    const handoff = handoffForWorkspace(documents, workspaceId);
    const handoffDocument = handoff ? documents.find((document) => document.markdownPath === handoff.path) : undefined;
    targets.set("phase-interview", stringValue(handoffDocument?.metadata.canonical?.workflowData.outputTarget) ?? latestPath(documents, "phase-interview"));
  } else if (workspaceId === "phase-planning-bundle") {
    const handoff = handoffForWorkspace(documents, workspaceId);
    const handoffDocument = handoff ? documents.find((document) => document.markdownPath === handoff.path) : undefined;
    targets.set("phase-planning", stringValue(handoffDocument?.metadata.canonical?.workflowData.phasePlanningTarget) ?? latestPath(documents, "phase-planning"));
    targets.set("work-card-plan", stringValue(handoffDocument?.metadata.canonical?.workflowData.workCardPlanTarget) ?? latestPath(documents, "work-card-plan"));
  } else if (workspaceId === "work-card-planning") {
    const handoff = handoffForWorkspace(documents, workspaceId);
    const handoffDocument = handoff ? documents.find((document) => document.markdownPath === handoff.path) : undefined;
    targets.set("formal-work-card", stringValue(handoffDocument?.metadata.canonical?.workflowData.formalWorkCardTarget) ?? latestPath(documents, "formal-work-card"));
  } else if (workspaceId === "work-card-repair") {
    const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
    targets.set("repair-work-card", resolved.context?.targetPath ?? latestPath(documents, "repair-work-card"));
  }
  return targets;
}

function handoffForWorkspace(
  documents: PlanningDocumentSummary[],
  workspaceId: WorkspaceId,
): { path: string; revision: number } | undefined {
  const handoffKindByWorkspace: Partial<Record<WorkspaceId, string>> = {
    "project-planning-review": "project-planning",
    "project-phase-map": "phase-map",
    "phase-interview": "phase-interview",
    "phase-planning-bundle": "phase-planning",
    "work-card-repair": "repair",
  };
  const handoff = workspaceId === "architect-interview"
    ? documents
        .filter((document) => document.metadata.artifactType === "project-architect-interview-prompt")
        .filter((document) => document.effectiveDisposition === "Approved")
        .at(-1)
    : workspaceId === "work-card-planning"
      ? documents
          .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
          .filter((document) => document.effectiveDisposition === "Approved")
          .at(-1)
      : documents
          .filter((document) => document.metadata.artifactType === "generated-handoff")
          .filter((document) => document.metadata.canonical?.workflowData.handoffKind === handoffKindByWorkspace[workspaceId])
          .filter((document) => document.effectiveDisposition === "Approved")
          .at(-1);
  return handoff
    ? { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 }
    : undefined;
}

function domainOverlay(
  workspaceRoot: string,
  workspaceId: WorkspaceId,
  classifiedState: ArchitectOutputWorkspaceState,
): {
  state?: ArchitectOutputWorkspaceState;
  requiredAction?: string;
  reason?: string;
  evidencePaths?: string[];
  canPrepareHandoff?: boolean;
  domain?: unknown;
} {
  try {
    const definition = resolveDefinitionByWorkspace(workspaceId);
    switch (workspaceId) {
      case "architect-interview": {
        const model = getArchitectInterviewWorkspaceModel(workspaceRoot);
        return {
          state: model.state === "prerequisites-unavailable"
            ? "not-ready"
            : model.state === "waiting-for-output"
            ? "waiting-for-drafts"
            : model.state,
          requiredAction: model.requiredAction,
          reason: model.reason,
          evidencePaths: model.evidencePaths,
          canPrepareHandoff: model.canCopyHandoff,
          domain: model,
        };
      }
      case "project-planning-review": {
        const model = getProjectPlanningWorkspaceModel(workspaceRoot);
        return {
          state: architectStateFromDomainState(model.state),
          requiredAction: model.requiredAction,
          reason: model.reason,
          evidencePaths: model.evidencePaths,
          canPrepareHandoff: model.canPrepareHandoff,
          domain: model,
        };
      }
      case "project-phase-map":
        return phaseMapDomainOverlay(workspaceRoot, classifiedState);
      case "phase-interview": {
        const model = getPhaseInterviewWorkspaceModel(workspaceRoot);
        return {
          state: architectStateFromDomainState(model.state),
          requiredAction: model.requiredAction,
          reason: model.reason,
          evidencePaths: model.evidencePaths,
          canPrepareHandoff: model.canPrepareHandoff,
          domain: model,
        };
      }
      case "phase-planning-bundle": {
        const model = getPhasePlanningWorkspaceModel(workspaceRoot);
        return {
          state: architectStateFromDomainState(model.state),
          requiredAction: model.requiredAction,
          reason: model.reason,
          evidencePaths: model.evidencePaths,
          canPrepareHandoff: model.canPrepareHandoff,
          domain: model,
        };
      }
      default:
        if (
          classifiedState !== "ready-for-handoff" &&
          classifiedState !== "revision-requested" &&
          classifiedState !== "promotion-failed"
        ) {
          if (workspaceId === "work-card-repair") {
            const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
            if (resolved.status === "needs-attention") {
              return {
                state: "needs-attention",
                requiredAction: resolved.reason,
                reason: resolved.reason,
                evidencePaths: resolved.evidencePaths,
                canPrepareHandoff: false,
              };
            }
            if (resolved.status === "not-ready") {
              if (classifiedState === "completed") {
                return { canPrepareHandoff: false };
              }
              return {
                state: "not-ready",
                requiredAction: resolved.reason,
                reason: resolved.reason,
                evidencePaths: resolved.evidencePaths,
                canPrepareHandoff: false,
              };
            }
            return {
              evidencePaths: resolved.evidencePaths,
              canPrepareHandoff: false,
              domain: resolved.context,
            };
          }
          return { canPrepareHandoff: false };
        }
        if (workspaceId === "work-card-repair") {
          const resolved = resolveExactActiveRepairWorkCardContext(workspaceRoot);
          if (resolved.status !== "ready") {
            return {
              state: resolved.status === "not-ready" ? "not-ready" : "needs-attention",
              requiredAction: resolved.reason,
              reason: resolved.reason,
              evidencePaths: resolved.evidencePaths,
              canPrepareHandoff: false,
            };
          }
        }
        definition.resolvePreparation(workspaceRoot);
        return { canPrepareHandoff: true };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      state: missingPrerequisiteReason(reason) ? "not-ready" : "needs-attention",
      requiredAction: reason,
      reason,
      canPrepareHandoff: false,
    };
  }
}

function architectStateFromDomainState(state: string): ArchitectOutputWorkspaceState {
  if (state === "waiting-for-output") return "waiting-for-drafts";
  if (state === "partial-output") return "partial-draft-set";
  if (state === "ready-for-handoff") return "ready-for-handoff";
  if (state === "not-ready") return "not-ready";
  if (state === "ready-for-review") return "ready-for-review";
  if (state === "revision-requested") return "revision-requested";
  if (state === "rejected") return "rejected";
  if (state === "completed") return "completed";
  return "needs-attention";
}

function missingPrerequisiteReason(reason: string): boolean {
  return /required|missing|unavailable|No eligible|No current|must be Approved before/i.test(reason);
}

function phaseMapDomainOverlay(workspaceRoot: string, classifiedState: ArchitectOutputWorkspaceState): {
  state?: ArchitectOutputWorkspaceState;
  requiredAction?: string;
  reason?: string;
  evidencePaths?: string[];
  canPrepareHandoff?: boolean;
} {
  const documents = listPlanningDocuments(workspaceRoot);
  const profile = documents
    .filter((document) => document.metadata.artifactType === "project-profile")
    .filter((document) => document.markdownPath === "planning/project/PROJECT_PROFILE.md")
    .at(-1);
  const roadmap = documents
    .filter((document) => document.metadata.artifactType === "project-roadmap")
    .filter((document) => document.markdownPath.startsWith("planning/project/Project_Roadmap/PROJECT_ROADMAP_"))
    .at(-1);
  const evidencePaths = [profile?.markdownPath, roadmap?.markdownPath]
    .filter((value): value is string => Boolean(value));
  if (!profile || !roadmap) {
    return {
      state: "not-ready",
      requiredAction: "Approved Project Profile and Project Roadmap are required before Phase Map handoff.",
      reason: "Approved Project Profile and Project Roadmap are required before Phase Map handoff.",
      evidencePaths,
      canPrepareHandoff: false,
    };
  }
  const profileFresh = profile.documentReadState === "readable" &&
    evaluateDocumentFreshness(workspaceRoot, profile.logicalDocumentId).state === "fresh";
  const roadmapFresh = roadmap.documentReadState === "readable" &&
    evaluateDocumentFreshness(workspaceRoot, roadmap.logicalDocumentId).state === "fresh";
  if (
    profile.effectiveDisposition !== "Approved" ||
    roadmap.effectiveDisposition !== "Approved" ||
    !profileFresh ||
    !roadmapFresh
  ) {
    return {
      state: "not-ready",
      requiredAction: "Current readable, fresh, Approved Project Profile and Project Roadmap are required before Phase Map handoff.",
      reason: "Current readable, fresh, Approved Project Profile and Project Roadmap are required before Phase Map handoff.",
      evidencePaths,
      canPrepareHandoff: false,
    };
  }
  if (
    classifiedState !== "ready-for-handoff" &&
    classifiedState !== "revision-requested" &&
    classifiedState !== "promotion-failed"
  ) {
    return { evidencePaths, canPrepareHandoff: false };
  }
  const handoff = handoffForWorkspace(documents, "project-phase-map");
  if (classifiedState !== "ready-for-handoff") {
    return { evidencePaths, canPrepareHandoff: true };
  }
  return handoff
    ? { evidencePaths, canPrepareHandoff: true }
    : {
        state: "ready-for-handoff",
        requiredAction: "Prepare Handoff, copy it, and send it manually in embedded ChatGPT.",
        reason: "Approved Project Profile and Project Roadmap are available.",
        evidencePaths,
        canPrepareHandoff: true,
      };
}

function deriveState(
  slots: ArchitectOutputDocumentSlotModel[],
  submissionState: string | undefined,
): ArchitectOutputWorkspaceState {
  if (submissionState === "promotion-failed") return "promotion-failed";
  if (submissionState === "partial-draft-set") return "partial-draft-set";
  if (submissionState === "waiting-for-drafts" || submissionState === "ready-for-promotion") return "waiting-for-drafts";
  if (slots.some((slot) => slot.documentReadState === "missing") && slots.some((slot) => slot.logicalDocumentId)) {
    return "needs-attention";
  }
  if (slots.every((slot) => !slot.logicalDocumentId)) return "ready-for-handoff";
  if (slots.some((slot) => !isReviewableSlot(slot) && slot.logicalDocumentId)) return "needs-attention";
  if (slots.every((slot) => slot.disposition === "Approved")) return "completed";
  if (slots.some((slot) => slot.disposition === "Rejected")) return "rejected";
  if (slots.some((slot) => slot.disposition === "RevisionRequested")) return "revision-requested";
  return "ready-for-review";
}

function railStatusForState(state: ArchitectOutputWorkspaceState): ProjectLifecycleRailStatus {
  switch (state) {
    case "not-ready":
      return "Not Ready";
    case "ready-for-handoff":
      return "Ready";
    case "waiting-for-drafts":
    case "partial-draft-set":
      return "Waiting for Output";
    case "ready-for-review":
    case "revision-requested":
      return "Awaiting Approval";
    case "completed":
      return "Completed";
    default:
      return "Needs Attention";
  }
}

function requiredActionForState(state: ArchitectOutputWorkspaceState): string {
  if (state === "ready-for-handoff") return "Prepare Handoff, copy it, and send it manually in embedded ChatGPT.";
  if (state === "waiting-for-drafts") return "Wait for every MCP-written temporary draft, then refresh outputs.";
  if (state === "partial-draft-set") return "One or more temporary drafts are missing; wait for the complete draft set.";
  if (state === "promotion-failed") return "Promotion failed; correct the draft and explicitly prepare a fresh handoff.";
  if (state === "ready-for-review") return "Review every current output revision and apply one disposition.";
  if (state === "revision-requested") return "Prepare a revision handoff with Operator instructions.";
  if (state === "completed") return "Architect output is Approved.";
  return "Resolve current Architect output evidence.";
}

function reasonForState(state: ArchitectOutputWorkspaceState): string {
  return requiredActionForState(state);
}

function canPrepareFromState(state: ArchitectOutputWorkspaceState): boolean {
  return state === "ready-for-handoff" || state === "revision-requested" || state === "promotion-failed";
}

function isReviewableSlot(slot: ArchitectOutputDocumentSlotModel): boolean {
  return Boolean(
    slot.logicalDocumentId &&
    slot.documentReadState === "readable" &&
    slot.freshnessState === "fresh" &&
    !slot.readError,
  );
}

function canCopySubmission(state: string): boolean {
  return state === "waiting-for-drafts" || state === "partial-draft-set";
}

function assertPresentedRevisionsMatchCurrentSlots(
  model: ArchitectOutputWorkspaceModel,
  presentedRevisions: ArchitectOutputPresentedSlotRevision[],
): void {
  const expected = model.documentSlots
    .filter((slot) => slot.logicalDocumentId)
    .map((slot) => ({
      slotId: slot.slotId,
      targetPath: slot.targetPath,
      artifactRevision: slot.artifactRevision,
    }));
  if (presentedRevisions.length !== expected.length) {
    throw new Error("Architect output changed. Refresh the workspace and review the current revision before applying disposition.");
  }
  for (const slot of expected) {
    const presented = presentedRevisions.find((candidate) => candidate.slotId === slot.slotId);
    if (
      !presented ||
      presented.targetPath !== slot.targetPath ||
      presented.artifactRevision !== slot.artifactRevision
    ) {
      throw new Error("Architect output changed. Refresh the workspace and review the current revision before applying disposition.");
    }
  }
}

function assertAtomicBundleReviewable(model: ArchitectOutputWorkspaceModel): void {
  if (!model.documentSlots.every((slot) => slot.logicalDocumentId && slot.targetPath)) {
    throw new Error("Every current bundle slot must be present before review.");
  }
  const dispositions = distinctValues(model.documentSlots.map((slot) => slot.disposition ?? ""));
  if (dispositions.length > 1) {
    throw new Error("Current Architect output bundle needs attention because member dispositions differ.");
  }
  if (model.currentOperatorReviewNotes === undefined) {
    throw new Error("Current Architect output bundle needs attention because member review notes differ.");
  }
}

function distinctValues(values: string[]): string[] {
  return values.filter((value, index, array) => array.indexOf(value) === index);
}

function sourceHandoffFromSubmission(
  sourceHandoff: { path: string; revision: number } | undefined,
): { path: string; revision: number } | undefined {
  return sourceHandoff ? { path: sourceHandoff.path, revision: sourceHandoff.revision } : undefined;
}

function latestPath(documents: PlanningDocumentSummary[], artifactType: string): string {
  return documents.filter((document) => document.metadata.artifactType === artifactType).at(-1)?.markdownPath ?? "";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sharedReviewNotes(
  slots: ArchitectOutputDocumentSlotModel[],
  documents: PlanningDocumentSummary[],
): string | undefined {
  const notes = slots
    .map((slot) => documents.find((document) => document.logicalDocumentId === slot.logicalDocumentId))
    .map((document) => document?.metadata.canonical?.documentDisposition.notes ?? "")
    .filter((value, index, array) => array.indexOf(value) === index);
  return notes.length === 1 ? notes[0] : undefined;
}
