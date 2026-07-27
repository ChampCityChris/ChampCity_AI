import type { CanonicalDocumentMetadata } from "./canonicalMarkdown";
import type { DocumentDispositionStatus } from "./documentDisposition";

export interface SourceRevision {
  path: string;
  revision: number;
}

export interface PlanningDocumentMetadata {
  artifactType?: string;
  participationRole?: string;
  artifactRevision?: number;
  sourceRevisions?: SourceRevision[];
  architectOutputTargets?: {
    markdown: string;
  };
  closureDecision?: string;
  phaseId?: string;
  workCardId?: string;
  candidateId?: string;
  canonical?: CanonicalDocumentMetadata;
}

export interface PlanningDocumentSummary {
  logicalDocumentId: string;
  markdownPath: string;
  displayFilename: string;
  metadata: PlanningDocumentMetadata;
  effectiveDisposition: DocumentDispositionStatus;
  documentReadState?: "readable" | "missing" | "invalid" | "read-error";
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
  affectedPaths: string[];
}

export interface InitializationResult {
  previewBeforeApply: InitializationPreview;
  previewAfterApply: InitializationPreview;
  documents: PlanningDocumentSummary[];
}
