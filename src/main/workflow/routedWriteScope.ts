import { AsyncLocalStorage } from "node:async_hooks";

import type {
  ArtifactRelationships,
  CanonicalArtifact,
  JsonValue,
} from "../../shared/artifacts";
import type { RoutedActionContract } from "../../shared/workflow";

export interface RoutedWriteAuthority {
  action: RoutedActionContract;
  targetPhaseId?: string;
  targetWorkCardId?: string;
  allowedAuxiliaryArtifactTypes: readonly string[];
}

interface RoutedWriteState extends RoutedWriteAuthority {
  expectedOutputAttempted: boolean;
  expectedOutputCommitted: CanonicalArtifact | null;
}

export interface RoutedArtifactWriteInput {
  artifactId: string;
  artifactType: string;
  phaseId?: string;
  workCardId?: string;
  relationships: ArtifactRelationships;
  data: JsonValue;
}

export interface BoundRoutedArtifactWrite extends RoutedArtifactWriteInput {
  isExpectedOutput: boolean;
}

const routedWriteStorage = new AsyncLocalStorage<RoutedWriteState>();

export async function runInRoutedWriteScope<T>(
  authority: RoutedWriteAuthority,
  operation: () => Promise<T>,
): Promise<{ result: T; expectedOutputCommit: CanonicalArtifact | null }> {
  const state: RoutedWriteState = {
    ...authority,
    allowedAuxiliaryArtifactTypes: [...authority.allowedAuxiliaryArtifactTypes],
    expectedOutputAttempted: false,
    expectedOutputCommitted: null,
  };
  const result = await routedWriteStorage.run(state, operation);
  return { result, expectedOutputCommit: state.expectedOutputCommitted };
}

/**
 * Binds the process writer to the exact output identity persisted in workflow
 * state. A writer cannot substitute a renderer-selected identity or type.
 */
export function bindRoutedArtifactWrite(
  input: RoutedArtifactWriteInput,
): BoundRoutedArtifactWrite {
  const state = routedWriteStorage.getStore();
  if (!state) return { ...input, isExpectedOutput: false };

  const expected = state.action.expectedOutput;
  if (input.artifactType !== expected.artifactType) {
    if (!state.allowedAuxiliaryArtifactTypes.includes(input.artifactType)) {
      throw new Error(
        `Routed action ${state.action.actionId} cannot write ${input.artifactType}; expected ${expected.artifactType}.`,
      );
    }
    return { ...input, isExpectedOutput: false };
  }
  if (state.expectedOutputAttempted) {
    throw new Error(
      `Routed action ${state.action.actionId} attempted more than one primary output write.`,
    );
  }
  state.expectedOutputAttempted = true;

  if (
    state.targetPhaseId &&
    input.phaseId &&
    state.targetPhaseId !== input.phaseId
  ) {
    throw new Error("The proposed output phase does not match routed authority.");
  }
  if (
    state.targetWorkCardId &&
    input.workCardId &&
    state.targetWorkCardId !== input.workCardId
  ) {
    throw new Error("The proposed output Work Card does not match routed authority.");
  }

  return {
    ...input,
    artifactId: expected.artifactId,
    relationships: {
      ...input.relationships,
      sources: unique([
        ...input.relationships.sources,
        ...(state.action.targetArtifactId
          ? [state.action.targetArtifactId]
          : []),
        ...state.action.sourceArtifactIds,
      ]),
    },
    isExpectedOutput: true,
  };
}

export function recordRoutedArtifactCommit(artifact: CanonicalArtifact): void {
  const state = routedWriteStorage.getStore();
  if (!state) return;
  if (
    artifact.artifactId === state.action.expectedOutput.artifactId &&
    artifact.artifactType === state.action.expectedOutput.artifactType
  ) {
    state.expectedOutputCommitted = artifact;
  }
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}
