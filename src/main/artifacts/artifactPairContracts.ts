import type {
  ArtifactPairVerificationResult,
  ArtifactPayload,
  ArtifactRegistry,
  ArtifactRelationships,
  ArtifactStatus,
  CanonicalArtifact,
  JsonValue,
  PayloadHash,
} from "../../shared/artifacts";
import type { PairFailurePoint } from "./filePairTransaction";

export const ARTIFACT_REGISTRY_DIRECTORY = "planning/system/Artifact_Registry" as const;
export const ARTIFACT_REGISTRY_FILE_STEM = "ARTIFACT_REGISTRY" as const;
export const ARTIFACT_REGISTRY_JSON_PATH =
  `${ARTIFACT_REGISTRY_DIRECTORY}/${ARTIFACT_REGISTRY_FILE_STEM}.json` as const;
export const ARTIFACT_REGISTRY_MARKDOWN_PATH =
  `${ARTIFACT_REGISTRY_DIRECTORY}/${ARTIFACT_REGISTRY_FILE_STEM}.md` as const;
export const ARTIFACT_REGISTRY_ARTIFACT_ID =
  "champcity-ai/system/artifact_registry" as const;
export const ARTIFACT_REGISTRY_ARTIFACT_TYPE = "artifact_registry" as const;

export interface CanonicalArtifactLocation {
  directoryPath: string;
  fileStem: string;
}

export interface CanonicalArtifactCommitRequest<
  TArtifactType extends string = string,
  TData extends JsonValue = JsonValue,
> {
  artifactId: string;
  artifactType: TArtifactType;
  status: ArtifactStatus;
  projectId: string;
  phaseId?: string;
  workCardId?: string;
  parentArtifactId?: string;
  relationships?: Partial<ArtifactRelationships>;
  payload: {
    title: string;
    contentMarkdown: string;
    data: TData;
  };
  location: CanonicalArtifactLocation;
  /** null means create-only; a number is optimistic revision concurrency. */
  expectedRevision?: number | null;
}

export interface CanonicalArtifactReadResult<
  TPayload extends ArtifactPayload = ArtifactPayload,
> {
  artifact: CanonicalArtifact<TPayload>;
  verification: ArtifactPairVerificationResult<TPayload> & {
    valid: true;
    synchronized: true;
  };
  jsonContent: string;
  markdownContent: string;
}

export interface CanonicalArtifactCommitResult<
  TPayload extends ArtifactPayload = ArtifactPayload,
> {
  artifact: CanonicalArtifact<TPayload>;
  verification: ArtifactPairVerificationResult<TPayload> & {
    valid: true;
    synchronized: true;
  };
  registry: ArtifactRegistry;
  registryRevision: number;
  pairVerified: true;
  registryCommitted: true;
  payloadHash: PayloadHash;
  transactionId: string;
}

export interface CanonicalArtifactBatchCommitResult {
  commits: CanonicalArtifactCommitResult[];
  registry: ArtifactRegistry;
  registryRevision: number;
  pairVerified: true;
  registryCommitted: true;
  transactionIds: string[];
}

export type ArtifactPairServiceFailurePoint =
  | PairFailurePoint
  | "before_artifact_write"
  | "after_artifact_write"
  | "before_registry_update"
  | "after_registry_update";

export interface ArtifactPairServiceFailureContext {
  point: ArtifactPairServiceFailurePoint;
  operation: "artifact" | "registry";
  artifactId: string;
  jsonPath: string;
  markdownPath: string;
  transactionId?: string;
}

export type ArtifactPairServiceFailureInjector = (
  point: ArtifactPairServiceFailurePoint,
  context: ArtifactPairServiceFailureContext,
) => void | Promise<void>;

export interface ArtifactPairServiceOptions {
  projectRoot: string;
  clock?: () => string;
  transactionIdFactory?: () => string;
  failureInjector?: ArtifactPairServiceFailureInjector;
}

export class ArtifactPairServiceError extends Error {
  constructor(
    readonly code:
      | "not_found"
      | "stale_revision"
      | "identity_mismatch"
      | "invalid_location"
      | "reserved_registry_identity"
      | "registry_project_mismatch"
      | "registry_sync_failure",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ArtifactPairServiceError";
  }
}
