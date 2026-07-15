import path from "node:path";

import {
  type ArtifactRegistryEntry,
  type JsonValue,
} from "../../shared/artifacts";
import {
  assertRoleGate,
  type RoutedActionContract,
  type WorkflowStateIndex,
  type WorkflowTransitionRoute,
} from "../../shared/workflow";
import {
  lockedWorkflowSteps,
  type CurrentRequiredAction,
  type CurrentRequiredActionResult,
  type CurrentRequiredActionRole,
  type CurrentRequiredActionStatus,
} from "../../shared/workCards/currentRequiredAction";
import type {
  ArchitectReviewDecision,
  RoutedArchitectReviewBinding,
} from "../../shared/workCards/architectReviewRecord";
import {
  ArtifactPairService,
  locationFromPairPaths,
} from "../artifacts";
import {
  CanonicalRoutedScreenAdapter,
  type CanonicalRoutedScreenResolution,
  RoutedActionService,
  WorkflowStateArtifactPort,
  WorkflowStateStore,
} from "../workflow";

export interface ArchitectReviewAuthority {
  state: WorkflowStateIndex;
  routedAction: RoutedActionContract;
  target: ArtifactRegistryEntry;
  source: ArtifactRegistryEntry;
  workCard: Record<string, JsonValue>;
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  workCardFileName: string;
  implementerReportFileName: string;
  expectedOutputArtifactId: string;
  expectedOutputJsonPath: string;
  expectedOutputMarkdownPath: string;
  expectedOutputFileName: string;
  binding: RoutedArchitectReviewBinding;
}

export interface ArchitectReviewCommitInput {
  authority: ArchitectReviewAuthority;
  reviewMarkdown: string;
  decision: ArchitectReviewDecision;
  reviewData: Record<string, JsonValue>;
}

export class CanonicalWorkflowAuthority {
  readonly artifactPairs: ArtifactPairService;
  readonly workflowStateStore: WorkflowStateStore;
  readonly routedActions: RoutedActionService;
  readonly routedScreens: CanonicalRoutedScreenAdapter;

  constructor(readonly projectRoot: string, clock?: () => string) {
    if (!path.isAbsolute(projectRoot)) {
      throw new TypeError("Canonical workflow authority requires an absolute project root.");
    }
    this.artifactPairs = new ArtifactPairService({ projectRoot, clock });
    this.workflowStateStore = new WorkflowStateStore(
      projectRoot,
      new WorkflowStateArtifactPort(this.artifactPairs),
    );
    this.routedActions = new RoutedActionService(this.workflowStateStore);
    this.routedScreens = new CanonicalRoutedScreenAdapter(this.artifactPairs);
  }

  async projectCurrentRequiredAction(): Promise<CurrentRequiredActionResult> {
    const snapshot = await this.routedActions.getAuthoritySnapshot();
    const action = snapshot.routedAction;
    if (!action) {
      return {
        ok: true,
        currentAction: {
          id: "workflow_complete",
          workflowStep: "Repeat Phase Mapping / Work Card Loop",
          title: "No current action",
          summary: "The canonical workflow-state index records completion.",
          responsibleRole: "app_system",
          status: "complete",
          reason: "No routed action remains in canonical workflow state.",
          sourceArtifacts: [],
          missingArtifacts: [],
          warnings: [],
        },
        workflowSteps: lockedWorkflowSteps,
      };
    }

    const resolution = await this.routedScreens.resolve(snapshot.state, action);
    const routedScreen = resolution.viewModel;
    const target = routedScreen.target;
    const sources = routedScreen.sources;
    const workCardId = target?.workCardId;
    const workCardTitle = target?.displayTitle;
    const expectedPath = routedScreen.expectedOutput.markdownPath ?? undefined;

    const currentAction: CurrentRequiredAction = {
      id: action.actionId,
      workflowStep: workflowStepFor(action.actionId),
      title: titleFor(action.actionId, workCardId),
      summary: summaryFor(action.actionId, workCardId),
      responsibleRole: toCurrentActionRole(action.role),
      ...(snapshot.state.activePhaseId
        ? { phaseId: snapshot.state.activePhaseId }
        : {}),
      ...(workCardId ? { workCardId } : {}),
      ...(workCardTitle ? { workCardTitle } : {}),
      status: statusFor(action),
      reason:
        "The canonical workflow-state index and synchronized artifact registry are the sole routed authority.",
      sourceArtifacts: sources.map((source) => ({
        path: source.markdownPath,
        role: source.artifactType.replaceAll("_", " "),
        exists: true,
      })),
      missingArtifacts: [],
      expectedOutput: {
        ...(expectedPath ? { path: expectedPath } : {}),
        artifactType: action.expectedOutput.artifactType,
        description: `Create ${action.expectedOutput.artifactId} and advance only after its canonical pair and registry entry are verified.`,
      },
      successRoute: action.routes.success ?? undefined,
      failureRoute: action.routes.failure ?? undefined,
      repairRoute: action.routes.repair ?? undefined,
      warnings: [
        ...action.blockers.map((blocker) => ({
          code: blocker.code,
          message: blocker.message,
          severity: "blocking" as const,
        })),
        ...routedScreen.blockers.map((blocker) => ({
          code: blocker.code,
          message: blocker.message,
          severity: "blocking" as const,
        })),
      ],
      routedAction: action,
    };

    return {
      ok: true,
      currentAction,
      routedScreen,
      ...(action.actionId === "architect_review_of_implementer_report_required"
        ? {
            routedArchitectReviewBinding:
              architectReviewBindingFromResolution(snapshot.state, resolution),
          }
        : {}),
      workflowSteps: lockedWorkflowSteps,
    };
  }

  async authorizeArchitectReview(
    rendererBinding?: RoutedArchitectReviewBinding,
  ): Promise<ArchitectReviewAuthority> {
    const { state, routedAction } = await this.routedActions.getAuthoritySnapshot();
    if (!routedAction) throw new Error("The canonical workflow has no routed action.");
    assertRoleGate(state, routedAction, {
      actorRole: "architect",
      actionId: "architect_review_of_implementer_report_required",
      stateRevision: state.stateRevision,
      outputArtifactId: routedAction.expectedOutput.artifactId,
      outputArtifactType: routedAction.expectedOutput.artifactType,
    });
    if (routedAction.screenId !== "architect-review") {
      throw new Error("The current routed action does not authorize Architect Review.");
    }
    if (!routedAction.targetArtifactId) {
      throw new Error("Architect Review authority is missing its target artifact.");
    }
    if (routedAction.sourceArtifactIds.length !== 1) {
      throw new Error("Architect Review requires exactly one authoritative source artifact.");
    }

    const resolution = await this.routedScreens.resolve(state, routedAction);
    if (!resolution.viewModel.ready || resolution.viewModel.blockers.length > 0) {
      throw new Error(
        resolution.viewModel.blockers.map((blocker) => blocker.message).join(" ") ||
          "Architect Review canonical routed-screen authority is blocked.",
      );
    }
    const target = resolution.targetEntry;
    const source = resolution.sourceEntries[0];
    const targetArtifact = resolution.targetArtifact;
    if (!target || !source || !targetArtifact) {
      throw new Error("Architect Review canonical target/source authority is incomplete.");
    }
    if (target.artifactType !== "work_card" || source.artifactType !== "implementer_report") {
      throw new Error("Architect Review target/source artifact types do not match the role gate.");
    }
    const workCard = requireRecord(targetArtifact.payload.data, "Work Card payload");
    const phaseId = target.phaseId ?? state.activePhaseId ?? "";
    const workCardId = textValue(workCard.workCardId) ?? target.workCardId ?? "";
    const workCardTitle = resolution.viewModel.target?.displayTitle ?? "";
    if (!phaseId || !workCardId || !workCardTitle) {
      throw new Error("Architect Review target identity is incomplete.");
    }
    const binding = architectReviewBindingFromResolution(state, resolution);
    if (binding.blockingState.blocked) {
      throw new Error(binding.blockingState.issues.map((issue) => issue.message).join(" "));
    }
    if (rendererBinding) assertSameBinding(rendererBinding, binding);
    return {
      state,
      routedAction,
      target,
      source,
      workCard,
      phaseId,
      workCardId,
      workCardTitle,
      workCardFileName: path.posix.basename(target.jsonPath),
      implementerReportFileName: path.posix.basename(source.markdownPath),
      expectedOutputArtifactId: routedAction.expectedOutput.artifactId,
      expectedOutputJsonPath: binding.expectedOutputPath.replace(/\.md$/i, ".json"),
      expectedOutputMarkdownPath: binding.expectedOutputPath,
      expectedOutputFileName: binding.expectedOutputFileName,
      binding,
    };
  }

  async commitArchitectReview(input: ArchitectReviewCommitInput) {
    const latest = await this.authorizeArchitectReview(input.authority.binding);
    const pairCommit = await this.artifactPairs.commitArtifact({
      artifactId: latest.expectedOutputArtifactId,
      artifactType: "architect_review",
      status: input.decision === "Blocked / incomplete" ? "blocked" : "active",
      projectId: latest.state.projectId,
      phaseId: latest.phaseId,
      workCardId: latest.workCardId,
      parentArtifactId:
        textValue(latest.workCard.parentWorkCardId) ?? latest.target.parentArtifactId,
      relationships: {
        sources: [latest.target.artifactId, latest.source.artifactId],
        expectedOutputs:
          input.decision === "Ready for Operator validation"
            ? [`champcity-ai/${latest.phaseId}/validation_report/${latest.workCardId}`]
            : [],
        supersedes: [],
        children: [],
      },
      payload: {
        title: `Architect Review — ${latest.workCardId} ${latest.workCardTitle}`,
        contentMarkdown: input.reviewMarkdown,
        data: input.reviewData,
      },
      location: locationFromPairPaths(
        latest.expectedOutputJsonPath,
        latest.expectedOutputMarkdownPath,
      ),
    });
    const route = routeForDecision(input.decision);
    const transition = await this.workflowStateStore.advanceAfterArtifactCommit(
      {
        actionId: latest.routedAction.actionId,
        stateRevision: latest.state.stateRevision,
        actorRole: "architect",
        route,
        ...(route === "success"
          ? {
              authorization: {
                decision: "authorized" as const,
                artifactId: pairCommit.artifact.artifactId,
              },
            }
          : {}),
        occurredAt: new Date().toISOString(),
      },
      {
        artifactId: pairCommit.artifact.artifactId,
        artifactType: pairCommit.artifact.artifactType,
        pairVerified: true,
        registryCommitted: true,
      },
    );
    return { pairCommit, transition, route };
  }

}

function architectReviewBindingFromResolution(
  state: WorkflowStateIndex,
  resolution: CanonicalRoutedScreenResolution,
): RoutedArchitectReviewBinding {
  const { viewModel } = resolution;
  const target = viewModel.target;
  const source = viewModel.sources[0];
  const outputPath = viewModel.expectedOutput.markdownPath ?? "";
  const issues = viewModel.blockers.map((blocker) => ({
    kind: blocker.code === "ambiguous_authority" ? "ambiguity" as const : "missing" as const,
    message: blocker.message,
  }));
  if (viewModel.sources.length !== 1) {
    issues.push({
      kind: "ambiguity",
      message: "Architect Review requires exactly one canonical Implementer Report source.",
    });
  }
  return {
    bindingSource: "routed_action_and_artifact_registry",
    currentActionId: "architect_review_of_implementer_report_required",
    workflowStateRevision: state.stateRevision,
    targetArtifactId: target?.artifactId ?? viewModel.action.targetArtifactId ?? "",
    sourceArtifactId: source?.artifactId ?? viewModel.action.sourceArtifactIds[0] ?? "",
    expectedOutputArtifactId: viewModel.expectedOutput.artifactId,
    phaseId: target?.phaseId ?? state.activePhaseId ?? "",
    workCardId: target?.workCardId ?? "",
    workCardTitle: target?.displayTitle ?? "",
    implementerReportPath: source?.markdownPath ?? "",
    implementerReportFileName: source ? path.posix.basename(source.markdownPath) : "",
    expectedOutputPath: outputPath,
    expectedOutputFileName: outputPath ? path.posix.basename(outputPath) : "",
    blockingState: { blocked: issues.length > 0 || !viewModel.ready, issues },
  };
}

function assertSameBinding(
  renderer: RoutedArchitectReviewBinding,
  canonical: RoutedArchitectReviewBinding,
): void {
  for (const key of [
    "bindingSource",
    "currentActionId",
    "workflowStateRevision",
    "targetArtifactId",
    "sourceArtifactId",
    "expectedOutputArtifactId",
    "phaseId",
    "workCardId",
    "implementerReportPath",
    "expectedOutputPath",
  ] as const) {
    if (renderer[key] !== canonical[key]) {
      throw new Error(
        `Renderer binding is stale or mismatched at ${key}; reload canonical workflow authority.`,
      );
    }
  }
}

function routeForDecision(decision: ArchitectReviewDecision): WorkflowTransitionRoute {
  if (decision === "Ready for Operator validation") return "success";
  if (decision === "Repair required before Operator validation") return "repair";
  return "failure";
}

function asRecord(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : undefined;
}

function requireRecord(value: JsonValue, label: string): Record<string, JsonValue> {
  const record = asRecord(value);
  if (!record) throw new Error(`${label} must be a canonical JSON object.`);
  return record;
}

function textValue(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toCurrentActionRole(role: RoutedActionContract["role"]): CurrentRequiredActionRole {
  return role === "application" ? "app_system" : role;
}

function statusFor(action: RoutedActionContract): CurrentRequiredActionStatus {
  if (action.authorityStatus === "blocked") return "blocked";
  if (action.role === "operator") {
    return action.actionId === "operator_validation_required"
      ? "needs_validation"
      : "needs_approval";
  }
  if (action.actionId.includes("architect_review")) return "needs_review";
  if (action.actionId.includes("repair")) return "needs_repair";
  return "available";
}

function workflowStepFor(actionId: string): string {
  if (actionId.startsWith("project_")) return "Project Mapping";
  if (actionId.includes("phase_closeout")) return "Phase Closeout";
  if (actionId.includes("roadmap")) return "Roadmap Update";
  if (actionId.includes("next_phase")) return "Next Phase Activation";
  return "Work Card Loop";
}

function titleFor(actionId: string, workCardId?: string): string {
  const labels: Record<string, string> = {
    architect_review_of_implementer_report_required:
      "Architect review of repair Implementer Report required",
    operator_validation_required: "Operator Validation required",
  };
  return labels[actionId] ?? `${actionId.replaceAll("_", " ")} ${workCardId ?? ""}`.trim();
}

function summaryFor(actionId: string, workCardId?: string): string {
  return actionId === "architect_review_of_implementer_report_required"
    ? `Review the exact authoritative Implementer Report for ${workCardId ?? "the routed Work Card"}.`
    : `Complete ${actionId.replaceAll("_", " ")} using the canonical routed-action contract.`;
}
