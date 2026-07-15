import {
  canonicalStringify,
  type ArtifactRegistryEntry,
} from "../../shared/artifacts";
import {
  assertRoleGate,
  ROUTED_ACTION_SCHEMA_VERSION,
  type RoutedActionContract,
  type WorkflowStateIndex,
} from "../../shared/workflow";
import type { ArtifactPairService } from "../artifacts";
import {
  requireProcessIpcPolicy,
  resolveTransitionRoute,
  type ProcessIpcPolicy,
  type RoutedProcessIpcPolicy,
  type RoutedProcessVariant,
} from "./processIpcPolicy";
import { RoutedActionService } from "./routedActionService";
import { CanonicalRoutedScreenAdapter } from "./canonicalRoutedScreenAdapter";
import {
  runInRoutedWriteScope,
  type RoutedWriteAuthority,
} from "./routedWriteScope";
import { WorkflowStateStore } from "./workflowStateStore";

export interface RoutedProcessAuthorization {
  state: WorkflowStateIndex;
  action: RoutedActionContract;
  policy: RoutedProcessIpcPolicy;
  variant: RoutedProcessVariant;
  target: ArtifactRegistryEntry | null;
  sources: ArtifactRegistryEntry[];
}

export interface ProcessInvocationBlockedResult {
  ok: false;
  blocked: true;
  errorMessages: string[];
}

export class RoutedProcessInvocationError extends Error {
  constructor(
    readonly code:
      | "missing_renderer_binding"
      | "stale_renderer_binding"
      | "action_not_permitted"
      | "screen_mismatch"
      | "role_mismatch"
      | "output_type_mismatch"
      | "expected_output_not_committed",
    message: string,
  ) {
    super(message);
    this.name = "RoutedProcessInvocationError";
  }
}

export class RoutedProcessInvocationService {
  private readonly routedScreens: CanonicalRoutedScreenAdapter;

  constructor(
    private readonly routedActions: RoutedActionService,
    private readonly workflowStateStore: WorkflowStateStore,
    private readonly artifactPairs: ArtifactPairService,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {
    this.routedScreens = new CanonicalRoutedScreenAdapter(artifactPairs);
  }

  async authorize(
    policy: RoutedProcessIpcPolicy,
    rendererBinding: unknown,
  ): Promise<RoutedProcessAuthorization> {
    const { state, routedAction } = await this.routedActions.getAuthoritySnapshot();
    if (!routedAction) {
      throw new RoutedProcessInvocationError(
        "action_not_permitted",
        "The canonical workflow has no current routed action.",
      );
    }
    assertRendererBinding(rendererBinding, routedAction);

    const variant = policy.variants.find(
      (candidate) => candidate.actionId === routedAction.actionId,
    );
    if (!variant) {
      throw new RoutedProcessInvocationError(
        "action_not_permitted",
        `Current action ${routedAction.actionId} does not authorize ${policy.channel}.`,
      );
    }
    if (variant.screenId !== routedAction.screenId) {
      throw new RoutedProcessInvocationError(
        "screen_mismatch",
        `Current action ${routedAction.actionId} requires ${routedAction.screenId}, not ${variant.screenId}.`,
      );
    }
    if (variant.role !== routedAction.role) {
      throw new RoutedProcessInvocationError(
        "role_mismatch",
        `Current action ${routedAction.actionId} belongs to ${routedAction.role}, not ${variant.role}.`,
      );
    }
    if (
      variant.expectedOutputArtifactType !==
      routedAction.expectedOutput.artifactType
    ) {
      throw new RoutedProcessInvocationError(
        "output_type_mismatch",
        `Current action ${routedAction.actionId} expects ${routedAction.expectedOutput.artifactType}, not ${variant.expectedOutputArtifactType}.`,
      );
    }

    assertRoleGate(state, routedAction, {
      actorRole: variant.role,
      actionId: routedAction.actionId,
      stateRevision: routedAction.stateRevision,
      outputArtifactId: routedAction.expectedOutput.artifactId,
      outputArtifactType: routedAction.expectedOutput.artifactType,
    });

    const resolved = await this.routedScreens.resolve(state, routedAction);
    if (!resolved.viewModel.ready || resolved.viewModel.blockers.length > 0) {
      throw new Error(
        resolved.viewModel.blockers.map((blocker) => blocker.message).join(" ") ||
          "Canonical routed-screen authority is blocked.",
      );
    }
    const target = resolved.targetEntry;
    const sources = resolved.sourceEntries;

    return { state, action: routedAction, policy, variant, target, sources };
  }

  async invoke<T>(input: {
    channel: string;
    rendererBinding: unknown;
    payload: unknown;
    operation: () => T | Promise<T>;
  }): Promise<T | ProcessInvocationBlockedResult> {
    const policy = requireProcessIpcPolicy(input.channel);
    if (policy.kind === "non-routed") {
      return input.operation();
    }

    try {
      const authority = await this.authorize(policy, input.rendererBinding);
      if (
        policy.operation === "preview" ||
        policy.transition.mode === "handled-by-writer"
      ) {
        return await input.operation();
      }

      const writeAuthority: RoutedWriteAuthority = {
        action: authority.action,
        ...(authority.target?.phaseId
          ? { targetPhaseId: authority.target.phaseId }
          : {}),
        ...(authority.target?.workCardId
          ? { targetWorkCardId: authority.target.workCardId }
          : {}),
        allowedAuxiliaryArtifactTypes:
          policy.allowedAuxiliaryArtifactTypes,
      };
      const scoped = await runInRoutedWriteScope(writeAuthority, async () =>
        input.operation(),
      );
      if (!isSuccessfulResult(scoped.result)) return scoped.result;

      const route = resolveTransitionRoute(policy, input.payload);
      if (policy.operation === "supporting-write" || route === null) {
        return scoped.result;
      }
      if (!scoped.expectedOutputCommit) {
        throw new RoutedProcessInvocationError(
          "expected_output_not_committed",
          `Routed action ${authority.action.actionId} did not commit its exact expected output pair.`,
        );
      }

      const transition = await this.workflowStateStore.advanceAfterArtifactCommit(
        {
          actionId: authority.action.actionId,
          stateRevision: authority.state.stateRevision,
          actorRole: authority.action.role,
          route,
          ...(authority.action.actionId === "phase_mapping_required"
            ? { phaseMappingDecision: phaseMappingDecision(input.payload) }
            : {}),
          occurredAt: this.clock(),
        },
        {
          artifactId: scoped.expectedOutputCommit.artifactId,
          artifactType: scoped.expectedOutputCommit.artifactType,
          pairVerified: true,
          registryCommitted: true,
        },
      );
      return attachTransition(scoped.result, transition.state);
    } catch (error) {
      return {
        ok: false,
        blocked: true,
        errorMessages: [plainError(error)],
      };
    }
  }

  policyFor(channel: string): ProcessIpcPolicy {
    return requireProcessIpcPolicy(channel);
  }
}

function assertRendererBinding(
  value: unknown,
  canonical: RoutedActionContract,
): asserts value is RoutedActionContract {
  if (!isRecord(value) || value.schemaVersion !== ROUTED_ACTION_SCHEMA_VERSION) {
    throw new RoutedProcessInvocationError(
      "missing_renderer_binding",
      "Refresh Current Action before previewing or saving this routed process.",
    );
  }
  const renderer = value as unknown as RoutedActionContract;
  const comparable = (action: RoutedActionContract) => ({
    actionId: action.actionId,
    processId: action.processId,
    processClassification: action.processClassification,
    advancesWorkflowState: action.advancesWorkflowState,
    stage: action.stage,
    role: action.role,
    screenId: action.screenId,
    targetArtifactId: action.targetArtifactId,
    sourceArtifactIds: action.sourceArtifactIds,
    expectedOutput: action.expectedOutput,
    routes: action.routes,
    bindingSource: action.bindingSource,
    authorityStatus: action.authorityStatus,
    blockers: action.blockers,
    stateRevision: action.stateRevision,
  });
  if (
    canonicalStringify(comparable(renderer)) !==
    canonicalStringify(comparable(canonical))
  ) {
    throw new RoutedProcessInvocationError(
      "stale_renderer_binding",
      "The renderer routed-action binding is stale or mismatched; refresh Current Action.",
    );
  }
}

function phaseMappingDecision(payload: unknown): {
  phaseInterviewRequired: boolean;
  phaseInterviewArtifactId?: string | null;
} {
  if (!isRecord(payload)) return { phaseInterviewRequired: false };
  return {
    phaseInterviewRequired: payload.phaseInterviewRequired === true,
    ...(typeof payload.phaseInterviewArtifactId === "string" &&
    payload.phaseInterviewArtifactId.trim()
      ? { phaseInterviewArtifactId: payload.phaseInterviewArtifactId }
      : {}),
  };
}

function isSuccessfulResult(value: unknown): boolean {
  return !isRecord(value) || value.ok !== false;
}

function attachTransition<T>(value: T, state: WorkflowStateIndex): T {
  if (!isRecord(value)) return value;
  return {
    ...value,
    workflowTransition: {
      stateRevision: state.stateRevision,
      nextActionId: state.currentActionId,
      nextScreenId: state.currentAction?.screenId ?? null,
    },
  } as T;
}

function plainError(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "The routed process operation was blocked.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
