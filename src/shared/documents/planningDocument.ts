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
  pairStatus: DocumentPairStatus;
  effectiveDisposition: DocumentDispositionStatus;
  storedMarkdownDisposition?: DocumentDispositionStatus;
  storedJsonDisposition?: DocumentDispositionStatus;
  synchronizationState: DispositionSyncState;
  initializationNeeded: boolean;
  readError?: string;
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
