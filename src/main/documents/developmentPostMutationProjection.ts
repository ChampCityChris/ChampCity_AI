import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";
import type {
  CurrentWorkspaceModel,
  DevelopmentPostMutationProjection,
} from "../../shared/workspaceContracts";
import { getArchitectOutputRuntimePromotionEpoch } from "../architectOutputs/architectOutputRuntimeService";
import { getProjectPlanningWorkspaceModel } from "../projectPlanning/projectPlanningService";
import { resolveFirstNonApprovedDocumentFromContext } from "./firstNonApprovedResolver";
import { readPlanningDocumentFromContext } from "./planningDocumentService";
import {
  assertPlanningProjectionContextRoot,
  createPlanningProjectionContext,
  type PlanningProjectionContext,
} from "./planningProjectionContext";

export function createFinalDevelopmentPlanningContext(
  workspaceRoot: string,
): PlanningProjectionContext {
  const capturedPromotionEpoch = getArchitectOutputRuntimePromotionEpoch(workspaceRoot);
  const context = createPlanningProjectionContext(workspaceRoot);
  promotionEpochAtContextCapture.set(context, capturedPromotionEpoch);
  return context;
}

const maximumStableAssemblyAttempts = 8;
const promotionEpochAtContextCapture = new WeakMap<PlanningProjectionContext, number>();

interface DevelopmentPostMutationStabilizationTestHooks {
  beforeAssembly?: (attempt: number, context: PlanningProjectionContext) => void;
  afterAssembly?: (attempt: number, context: PlanningProjectionContext) => void;
  onCandidateDiscarded?: (attempt: number, context: PlanningProjectionContext) => void;
}

let stabilizationTestHooks: DevelopmentPostMutationStabilizationTestHooks = {};

export function __setDevelopmentPostMutationStabilizationTestHooks(
  hooks: DevelopmentPostMutationStabilizationTestHooks = {},
): void {
  stabilizationTestHooks = hooks;
}

export function buildStableDevelopmentPostMutationResult<T>(
  workspaceRoot: string,
  initialPlanningContext: PlanningProjectionContext,
  assemble: (planningContext: PlanningProjectionContext) => T,
): T {
  let planningContext = assertPlanningProjectionContextRoot(initialPlanningContext, workspaceRoot);
  for (let attempt = 1; attempt <= maximumStableAssemblyAttempts; attempt += 1) {
    const startPromotionEpoch = promotionEpochAtContextCapture.get(planningContext) ??
      getArchitectOutputRuntimePromotionEpoch(workspaceRoot);
    stabilizationTestHooks.beforeAssembly?.(attempt, planningContext);
    const candidate = assemble(planningContext);
    stabilizationTestHooks.afterAssembly?.(attempt, planningContext);
    if (getArchitectOutputRuntimePromotionEpoch(workspaceRoot) === startPromotionEpoch) {
      return candidate;
    }
    stabilizationTestHooks.onCandidateDiscarded?.(attempt, planningContext);
    if (attempt < maximumStableAssemblyAttempts) {
      planningContext = createFinalDevelopmentPlanningContext(workspaceRoot);
    }
  }
  throw new Error(
    "Development post-mutation projection could not establish stable Architect promotion state.",
  );
}

export function buildDevelopmentPostMutationProjection(
  workspaceRoot: string,
  planningContext: PlanningProjectionContext,
  currentModel: CurrentWorkspaceModel,
  selectedDocumentId?: string | null,
): DevelopmentPostMutationProjection {
  const context = assertPlanningProjectionContextRoot(planningContext, workspaceRoot);
  const documents = [...context.documents];
  const resolverResult = resolveFirstNonApprovedDocumentFromContext(context);
  const selectedId = resolvePostMutationSelectedDocumentId(
    documents,
    resolverResult,
    currentModel,
    selectedDocumentId,
  );
  let selectedDocument: PlanningDocumentDetail | null = null;
  if (selectedId) {
    try {
      selectedDocument = readPlanningDocumentFromContext(context, selectedId);
    } catch {
      selectedDocument = null;
    }
  }
  return {
    planningGeneration: context.generation,
    documents,
    resolverResult,
    currentModel,
    projectPlanningModel: getProjectPlanningWorkspaceModel(workspaceRoot, context),
    selectedDocument,
  };
}

function resolvePostMutationSelectedDocumentId(
  documents: DevelopmentPostMutationProjection["documents"],
  resolverResult: DevelopmentPostMutationProjection["resolverResult"],
  currentModel: CurrentWorkspaceModel,
  selectedDocumentId?: string | null,
): string | null {
  const resolverDocumentId = resolverResult.status === "current"
    ? resolverResult.document.logicalDocumentId
    : resolverResult.status === "waiting-for-architect-interview"
      ? resolverResult.promptLogicalDocumentId
      : null;
  const currentTargetDocumentId = documents.find((document) =>
    document.logicalDocumentId === currentModel.currentTarget ||
    document.markdownPath === currentModel.currentTarget
  )?.logicalDocumentId ?? null;
  for (const candidate of [resolverDocumentId, currentTargetDocumentId, selectedDocumentId ?? null]) {
    if (candidate && documents.some((document) => document.logicalDocumentId === candidate)) {
      return candidate;
    }
  }
  return null;
}
