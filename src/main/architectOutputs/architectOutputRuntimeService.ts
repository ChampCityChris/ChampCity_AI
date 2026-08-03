import path from "node:path";
import type {
  ArchitectDraftSubmission,
  ArchitectOutputDefinition,
} from "../../shared/architectOutputs/architectOutputContracts";
import type { ArchitectOutputRegistry } from "./architectOutputRegistry";
import { promoteArchitectDraftSubmission } from "./architectDraftPromotionService";
import {
  createArchitectDraftSubmission,
  inspectArchitectDraftSubmission,
} from "./architectDraftSubmissionService";

export interface ActiveArchitectOutputRuntimeSubmission<
  TSlotId extends string = string,
  TSelection = unknown,
  TDomainContext = unknown,
> {
  workspaceRoot: string;
  submission: ArchitectDraftSubmission<TSlotId, TSelection>;
  preparedContext: TDomainContext;
  preparedInstruction: string;
  promotionError?: string;
  cleanupStatus?: string;
  cleanupError?: string;
}

const activeSubmissionByRuntimeKey = new Map<string, ActiveArchitectOutputRuntimeSubmission>();
const requestOrdinalByRuntimeKey = new Map<string, number>();

export function prepareArchitectOutputRuntimeSubmission<
  TSlotId extends string,
  TSelection,
  TDomainContext,
>(
  workspaceRoot: string,
  outputKind: string,
  owningWorkspaceId: string,
): ArchitectDraftSubmission<TSlotId, TSelection> {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const definition = resolveDefinition<TSlotId, TSelection, TDomainContext>(
    outputKind,
    owningWorkspaceId,
  );
  const preparation = definition.resolvePreparation(resolvedWorkspaceRoot);
  const runtimeKey = workspaceRuntimeKey(resolvedWorkspaceRoot, owningWorkspaceId);
  const active = activeSubmissionByRuntimeKey.get(runtimeKey);
  if (active && canReuseActiveSubmission(active.submission, preparation.sourceHandoff)) {
    return active.submission as ArchitectDraftSubmission<TSlotId, TSelection>;
  }

  const submission = createArchitectDraftSubmission(definition, {
    sourceHandoff: preparation.sourceHandoff,
    submissionKey: nextSubmissionKey(runtimeKey),
  });
  const preparedInstruction = buildPreparedInstruction({
    workspaceRoot: resolvedWorkspaceRoot,
    definition,
    submission,
    sourceHandoff: preparation.sourceHandoff,
    domainContext: preparation.domainContext,
  });
  activeSubmissionByRuntimeKey.set(runtimeKey, {
    workspaceRoot: resolvedWorkspaceRoot,
    submission: submission as ArchitectDraftSubmission,
    preparedContext: preparation.domainContext,
    preparedInstruction,
  });
  return submission;
}

export function getArchitectOutputRuntimeStatus<
  TSlotId extends string,
  TSelection,
>(
  workspaceRoot: string,
  outputKind: string,
  owningWorkspaceId: string,
): ActiveArchitectOutputRuntimeSubmission<TSlotId, TSelection> | undefined {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const runtimeKey = workspaceRuntimeKey(resolvedWorkspaceRoot, owningWorkspaceId);
  const active = activeSubmissionByRuntimeKey.get(runtimeKey);
  if (!active) return undefined;

  const inspection = inspectArchitectDraftSubmission(active.workspaceRoot, active.submission);
  if (inspection.state !== "ready-for-promotion") {
    active.submission = { ...active.submission, state: inspection.state };
    return active as ActiveArchitectOutputRuntimeSubmission<TSlotId, TSelection>;
  }

  const result = promoteArchitectDraftSubmission({
    workspaceRoot: active.workspaceRoot,
    registry: productionRegistry(),
    submission: active.submission,
    preparedContext: active.preparedContext,
  });
  active.submission = result.submission;
  active.promotionError = result.error;
  active.cleanupStatus = result.cleanupStatus;
  active.cleanupError = result.cleanupError;
  return active as ActiveArchitectOutputRuntimeSubmission<TSlotId, TSelection>;
}

export function getActiveArchitectOutputRuntimeSubmission<
  TSlotId extends string,
  TSelection,
>(
  workspaceRoot: string,
  owningWorkspaceId: string,
): ActiveArchitectOutputRuntimeSubmission<TSlotId, TSelection> | undefined {
  return activeSubmissionByRuntimeKey.get(
    workspaceRuntimeKey(path.resolve(workspaceRoot), owningWorkspaceId),
  ) as ActiveArchitectOutputRuntimeSubmission<TSlotId, TSelection> | undefined;
}

export function getActivePreparedArchitectOutputInstruction(
  workspaceRoot: string,
  owningWorkspaceId: string,
): string | undefined {
  const active = activeSubmissionByRuntimeKey.get(
    workspaceRuntimeKey(path.resolve(workspaceRoot), owningWorkspaceId),
  );
  return active && canCopyActiveSubmission(active.submission)
    ? active.preparedInstruction
    : undefined;
}

function resolveDefinition<TSlotId extends string, TSelection, TDomainContext>(
  outputKind: string,
  owningWorkspaceId: string,
): ArchitectOutputDefinition<TSlotId, TSelection, TDomainContext> {
  return productionRegistry().resolve(outputKind, owningWorkspaceId) as ArchitectOutputDefinition<
    TSlotId,
    TSelection,
    TDomainContext
  >;
}

function productionRegistry(): ArchitectOutputRegistry {
  return require("./productionArchitectOutputCatalog").productionArchitectOutputRegistry;
}

function canReuseActiveSubmission(
  submission: ArchitectDraftSubmission,
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): boolean {
  return (
    canCopyActiveSubmission(submission) &&
    submission.sourceHandoff.path === sourceHandoff.path &&
    submission.sourceHandoff.revision === sourceHandoff.revision
  );
}

function canCopyActiveSubmission(submission: ArchitectDraftSubmission): boolean {
  return submission.state === "waiting-for-drafts" || submission.state === "partial-draft-set";
}

function buildPreparedInstruction<TSlotId extends string, TSelection, TDomainContext>(input: {
  workspaceRoot: string;
  definition: ArchitectOutputDefinition<TSlotId, TSelection, TDomainContext>;
  submission: ArchitectDraftSubmission<TSlotId>;
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"];
  domainContext: TDomainContext;
}): string {
  if (input.definition.buildPreparedInstruction) {
    return input.definition.buildPreparedInstruction({
      workspaceRoot: input.workspaceRoot,
      submission: input.submission,
      sourceHandoff: input.sourceHandoff,
      domainContext: input.domainContext,
    });
  }
  throw new Error("Production Architect output definition is missing a prepared-instruction builder.");
}

function nextSubmissionKey(runtimeKey: string): string {
  const nextOrdinal = (requestOrdinalByRuntimeKey.get(runtimeKey) ?? 0) + 1;
  requestOrdinalByRuntimeKey.set(runtimeKey, nextOrdinal);
  return `request-${nextOrdinal}`;
}

function workspaceRuntimeKey(workspaceRoot: string, owningWorkspaceId: string): string {
  return `${path.resolve(workspaceRoot)}\u0000${owningWorkspaceId}`;
}
