import type { DocumentDispositionStatus } from "./documentDisposition";

export type DocumentPairStatus = "paired" | "markdown-only" | "json-only";

export type DispositionSyncState =
  | "synchronized"
  | "single-valid"
  | "missing"
  | "invalid"
  | "mismatched"
  | "read-error";

export interface PlanningDocumentSummary {
  logicalDocumentId: string;
  markdownPath?: string;
  jsonPath?: string;
  displayFilename: string;
  metadata: PlanningDocumentMetadata;
  pairStatus: DocumentPairStatus;
  effectiveDisposition: DocumentDispositionStatus;
  storedMarkdownDisposition?: DocumentDispositionStatus;
  storedJsonDisposition?: DocumentDispositionStatus;
  synchronizationState: DispositionSyncState;
  initializationNeeded: boolean;
  readError?: string;
}

export interface PlanningDocumentMetadata {
  artifactType?: string;
  participationRole?: string;
  artifactRevision?: number;
  sourceRevisions?: SourceRevision[];
  closureDecision?: string;
  phaseId?: string;
  workCardId?: string;
  candidateId?: string;
}

export interface SourceRevision {
  path: string;
  revision: number;
}

export interface PlanningDocumentDetail extends PlanningDocumentSummary {
  preview: string;
  previewTruncated: boolean;
}

export interface InitializationPreview {
  totalLogicalDocuments: number;
  affectedLogicalDocuments: number;
  affectedMarkdownFiles: number;
  affectedJsonFiles: number;
  affectedPaths: string[];
}

export interface InitializationResult {
  previewBeforeApply: InitializationPreview;
  previewAfterApply: InitializationPreview;
  documents: PlanningDocumentSummary[];
}
