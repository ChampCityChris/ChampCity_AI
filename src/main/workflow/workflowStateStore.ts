import path from "node:path";

import {
  advanceWorkflowState,
  assertWorkflowStateIndex,
  type AdvanceWorkflowCommand,
  type WorkflowStateIndex,
} from "../../shared/workflow";

export const WORKFLOW_STATE_DIRECTORY = "planning/system/Workflow_State" as const;
export const WORKFLOW_STATE_JSON_PATH =
  `${WORKFLOW_STATE_DIRECTORY}/WORKFLOW_STATE_INDEX.json` as const;
export const WORKFLOW_STATE_MARKDOWN_PATH =
  `${WORKFLOW_STATE_DIRECTORY}/WORKFLOW_STATE_INDEX.md` as const;
export const WORKFLOW_STATE_ARTIFACT_ID = "champcity-ai/system/workflow_state" as const;
export const WORKFLOW_STATE_ARTIFACT_TYPE = "workflow_state" as const;

export interface WorkflowStatePairReadResult {
  state: WorkflowStateIndex;
  artifactRevision: number;
  pairVerified: true;
}

export interface WorkflowStatePairCommitRequest {
  projectRoot: string;
  artifactId: typeof WORKFLOW_STATE_ARTIFACT_ID;
  artifactType: typeof WORKFLOW_STATE_ARTIFACT_TYPE;
  jsonPath: typeof WORKFLOW_STATE_JSON_PATH;
  markdownPath: typeof WORKFLOW_STATE_MARKDOWN_PATH;
  expectedArtifactRevision: number | null;
  state: WorkflowStateIndex;
}

export interface WorkflowStatePairCommitResult {
  artifactId: typeof WORKFLOW_STATE_ARTIFACT_ID;
  artifactType: typeof WORKFLOW_STATE_ARTIFACT_TYPE;
  artifactRevision: number;
  payloadHash: `sha256:${string}`;
  pairVerified: true;
  registryCommitted: true;
}

/** Narrow persistence boundary implemented by the canonical artifact-pair service. */
export interface WorkflowStatePairPort {
  readWorkflowStatePair(input: {
    projectRoot: string;
    jsonPath: typeof WORKFLOW_STATE_JSON_PATH;
    markdownPath: typeof WORKFLOW_STATE_MARKDOWN_PATH;
  }): Promise<WorkflowStatePairReadResult | null>;
  commitWorkflowStatePair(
    input: WorkflowStatePairCommitRequest,
  ): Promise<WorkflowStatePairCommitResult>;
}

export interface VerifiedArtifactRegistryCommit {
  artifactId: string;
  artifactType: string;
  pairVerified: true;
  registryCommitted: true;
}

export class WorkflowStateStoreError extends Error {
  constructor(
    readonly code:
      | "not_initialized"
      | "already_initialized"
      | "stale_state_revision"
      | "unverified_artifact_commit"
      | "state_pair_commit_failed",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "WorkflowStateStoreError";
  }
}

/** Root-injectable store; no repository-global path is captured at module load. */
export class WorkflowStateStore {
  readonly projectRoot: string;

  constructor(projectRoot: string, private readonly pairPort: WorkflowStatePairPort) {
    if (!path.isAbsolute(projectRoot)) {
      throw new TypeError("WorkflowStateStore requires an absolute project root.");
    }
    this.projectRoot = path.resolve(projectRoot);
  }

  async load(): Promise<WorkflowStatePairReadResult | null> {
    const result = await this.pairPort.readWorkflowStatePair({
      projectRoot: this.projectRoot,
      jsonPath: WORKFLOW_STATE_JSON_PATH,
      markdownPath: WORKFLOW_STATE_MARKDOWN_PATH,
    });
    if (result) assertWorkflowStateIndex(result.state);
    return result;
  }

  /** Explicit bootstrap path; later writes must use advanceAfterArtifactCommit. */
  async initialize(state: WorkflowStateIndex): Promise<WorkflowStatePairCommitResult> {
    assertWorkflowStateIndex(state);
    const existing = await this.load();
    if (existing) {
      throw new WorkflowStateStoreError(
        "already_initialized",
        "The canonical workflow-state index already exists.",
      );
    }
    return this.commitStatePair(state, null);
  }

  async advanceAfterArtifactCommit(
    command: Omit<AdvanceWorkflowCommand, "evidence">,
    artifactCommit: VerifiedArtifactRegistryCommit,
  ): Promise<{ state: WorkflowStateIndex; commit: WorkflowStatePairCommitResult }> {
    if (!artifactCommit.pairVerified || !artifactCommit.registryCommitted) {
      throw new WorkflowStateStoreError(
        "unverified_artifact_commit",
        "Workflow state cannot advance before artifact pair and registry success.",
      );
    }

    const existing = await this.load();
    if (!existing) {
      throw new WorkflowStateStoreError(
        "not_initialized",
        "The canonical workflow-state index has not been initialized.",
      );
    }
    if (existing.state.stateRevision !== command.stateRevision) {
      throw new WorkflowStateStoreError(
        "stale_state_revision",
        `Expected workflow-state revision ${command.stateRevision}, found ${existing.state.stateRevision}.`,
      );
    }

    const nextState = advanceWorkflowState(existing.state, {
      ...command,
      evidence: {
        artifactId: artifactCommit.artifactId,
        artifactType: artifactCommit.artifactType,
        pairVerified: true,
        registryCommitted: true,
      },
    });
    const commit = await this.commitStatePair(nextState, existing.artifactRevision);
    return { state: nextState, commit };
  }

  private async commitStatePair(
    state: WorkflowStateIndex,
    expectedArtifactRevision: number | null,
  ): Promise<WorkflowStatePairCommitResult> {
    try {
      return await this.pairPort.commitWorkflowStatePair({
        projectRoot: this.projectRoot,
        artifactId: WORKFLOW_STATE_ARTIFACT_ID,
        artifactType: WORKFLOW_STATE_ARTIFACT_TYPE,
        jsonPath: WORKFLOW_STATE_JSON_PATH,
        markdownPath: WORKFLOW_STATE_MARKDOWN_PATH,
        expectedArtifactRevision,
        state,
      });
    } catch (error) {
      throw new WorkflowStateStoreError(
        "state_pair_commit_failed",
        "The workflow-state pair could not be committed after artifact authority succeeded.",
        { cause: error },
      );
    }
  }
}
