import path from "node:path";

import { type JsonValue } from "../../shared/artifacts";
import {
  assertWorkflowStateIndex,
  type WorkflowStateIndex,
} from "../../shared/workflow";
import {
  ArtifactPairService,
  ArtifactPairServiceError,
  locationFromPairPaths,
} from "../artifacts";
import {
  WORKFLOW_STATE_ARTIFACT_ID,
  WORKFLOW_STATE_ARTIFACT_TYPE,
  type WorkflowStatePairCommitRequest,
  type WorkflowStatePairCommitResult,
  type WorkflowStatePairPort,
  type WorkflowStatePairReadResult,
} from "./workflowStateStore";

/** Canonical artifact-pair adapter used by WorkflowStateStore. */
export class WorkflowStateArtifactPort implements WorkflowStatePairPort {
  constructor(private readonly artifactPairs: ArtifactPairService) {}

  async readWorkflowStatePair(input: {
    projectRoot: string;
    jsonPath: "planning/system/Workflow_State/WORKFLOW_STATE_INDEX.json";
    markdownPath: "planning/system/Workflow_State/WORKFLOW_STATE_INDEX.md";
  }): Promise<WorkflowStatePairReadResult | null> {
    this.assertRoot(input.projectRoot);
    try {
      const pair = await this.artifactPairs.readArtifactByPaths(
        input.jsonPath,
        input.markdownPath,
      );
      if (
        pair.artifact.artifactId !== WORKFLOW_STATE_ARTIFACT_ID ||
        pair.artifact.artifactType !== WORKFLOW_STATE_ARTIFACT_TYPE
      ) {
        throw new Error("The fixed workflow-state pair contains the wrong artifact identity.");
      }
      assertWorkflowStateIndex(pair.artifact.payload.data);
      return {
        state: pair.artifact.payload.data,
        artifactRevision: pair.artifact.revision,
        pairVerified: true,
      };
    } catch (error) {
      if (error instanceof ArtifactPairServiceError && error.code === "not_found") return null;
      throw error;
    }
  }

  async commitWorkflowStatePair(
    input: WorkflowStatePairCommitRequest,
  ): Promise<WorkflowStatePairCommitResult> {
    this.assertRoot(input.projectRoot);
    assertWorkflowStateIndex(input.state);
    const result = await this.artifactPairs.commitArtifact({
      artifactId: input.artifactId,
      artifactType: input.artifactType,
      status: input.state.blockingConditions.length === 0 ? "active" : "blocked",
      projectId: input.state.projectId,
      relationships: {
        sources: input.state.requiredSourceArtifactIds,
        expectedOutputs: input.state.expectedOutput
          ? [input.state.expectedOutput.artifactId]
          : [],
        children: [],
        supersedes: [],
      },
      payload: {
        title: "Canonical Workflow State Index",
        contentMarkdown: renderWorkflowStateMarkdown(input.state),
        data: input.state as unknown as JsonValue,
      },
      location: locationFromPairPaths(input.jsonPath, input.markdownPath),
      expectedRevision: input.expectedArtifactRevision,
    });
    return {
      artifactId: WORKFLOW_STATE_ARTIFACT_ID,
      artifactType: WORKFLOW_STATE_ARTIFACT_TYPE,
      artifactRevision: result.artifact.revision,
      payloadHash: result.artifact.payloadHash,
      pairVerified: true,
      registryCommitted: true,
    };
  }

  private assertRoot(projectRoot: string): void {
    if (path.resolve(projectRoot) !== this.artifactPairs.projectRoot) {
      throw new Error("Workflow state and artifact authority must use the same project root.");
    }
  }
}

export function renderWorkflowStateMarkdown(state: WorkflowStateIndex): string {
  return [
    "# Canonical Workflow State Index",
    "",
    `- State revision: ${state.stateRevision}`,
    `- Current stage: ${state.currentStage}`,
    `- Active phase: ${state.activePhaseId ?? "none"}`,
    `- Current action: ${state.currentActionId ?? "complete"}`,
    `- Responsible role: ${state.responsibleRole ?? "none"}`,
    `- Authoritative target: ${state.authoritativeTargetArtifactId ?? "none"}`,
    `- Required sources: ${state.requiredSourceArtifactIds.join(", ") || "none"}`,
    `- Expected output: ${state.expectedOutput?.artifactId ?? "none"}`,
    `- Success route: ${state.routes?.success ?? "none"}`,
    `- Approved Work Card candidates: ${state.phaseExecution.approvedCandidates.length}`,
    `- Earliest unresolved candidate: ${state.phaseExecution.earliestUnresolvedCandidateId ?? "none"}`,
    `- Active repair: ${state.phaseExecution.activeRepairArtifactId ?? "none"}`,
    `- Closeout eligible: ${state.phaseExecution.closeoutEligibility.eligible ? "yes" : "no"}`,
    `- Blocking conditions: ${state.blockingConditions.map((item) => item.message).join("; ") || "none"}`,
    "",
    "Reference navigation is excluded from routed authority.",
    "",
  ].join("\n");
}
