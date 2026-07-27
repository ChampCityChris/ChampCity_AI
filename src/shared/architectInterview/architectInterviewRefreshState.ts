import type { DocumentDispositionStatus } from "../documents/documentDisposition";
import type {
  ArchitectInterviewSelectedDocumentRole,
  ArchitectInterviewWorkspaceModel,
} from "../workspaceContracts";

export interface ArchitectInterviewReviewEditState {
  sourceToken: string | null;
  selectedDisposition: DocumentDispositionStatus | "";
  notes: string;
  isDirty: boolean;
}

export function buildArchitectInterviewEvidenceFingerprint(
  repositoryIdentity: string | null,
  model: ArchitectInterviewWorkspaceModel | null,
): string {
  const interview = model?.interviewDocument;
  return JSON.stringify({
    repositoryIdentity,
    logicalDocumentId: interview?.logicalDocumentId ?? null,
    artifactRevision: interview?.artifactRevision ?? null,
    disposition: interview?.disposition ?? null,
    operatorReviewNotesFingerprint: fingerprintText(model?.currentOperatorReviewNotes ?? ""),
    documentReadState: interview?.documentReadState ?? model?.documentReadState ?? null,
    freshnessState: interview?.freshnessState ?? model?.freshnessState ?? null,
    readError: interview?.readError ?? null,
    canApplyDisposition: model?.canApplyDisposition ?? null,
    state: model?.state ?? null,
    railStatus: model?.railStatus ?? null,
    workspaceState: model?.selectedReviewDocumentRole ?? null,
    reason: model?.reason ?? null,
    evidencePaths: model?.evidencePaths ?? [],
    markdownPath: model?.markdownPath ?? null,
  });
}

export function buildArchitectInterviewReviewSourceKey(
  repositoryIdentity: string | null,
  model: ArchitectInterviewWorkspaceModel | null,
): string | null {
  const interview = model?.interviewDocument;
  if (!repositoryIdentity || !interview || !model.canApplyDisposition) {
    return null;
  }
  return [
    repositoryIdentity,
    buildArchitectInterviewEvidenceFingerprint(repositoryIdentity, model),
  ].join("::");
}

export function hydrateArchitectInterviewReviewEditState({
  current,
  model,
  repositoryIdentity,
  selectedRole,
}: {
  current: ArchitectInterviewReviewEditState | null;
  model: ArchitectInterviewWorkspaceModel | null;
  repositoryIdentity: string | null;
  selectedRole: ArchitectInterviewSelectedDocumentRole;
}): ArchitectInterviewReviewEditState | null {
  const sourceToken = buildArchitectInterviewReviewSourceKey(repositoryIdentity, model);
  if (!sourceToken || selectedRole !== "interview") {
    return null;
  }

  if (current?.sourceToken === sourceToken && current.isDirty) {
    return current;
  }

  return reviewEditStateFromModel(repositoryIdentity, model);
}

export function reviewEditStateFromModel(
  repositoryIdentity: string | null,
  model: ArchitectInterviewWorkspaceModel | null,
): ArchitectInterviewReviewEditState | null {
  const sourceToken = buildArchitectInterviewReviewSourceKey(repositoryIdentity, model);
  if (!sourceToken || !model?.interviewDocument) {
    return null;
  }

  const repositoryDisposition = model.interviewDocument.disposition;
  return {
    sourceToken,
    selectedDisposition: repositoryDisposition === "Pending" ? "" : repositoryDisposition,
    notes: model.currentOperatorReviewNotes ?? "",
    isDirty: false,
  };
}

export type ArchitectInterviewReviewRegionState =
  | {
      kind: "prompt-or-missing";
      statement: "Prompt is an Approved handoff input; no Operator disposition is required.";
    }
  | {
      kind: "invalid";
      diagnostics: string;
      canApplyReview: false;
    }
  | {
      kind: "valid";
      label: "Interview Review";
      canApplyReview: true;
    };

export function getArchitectInterviewReviewRegionState({
  model,
  selectedRole,
}: {
  model: ArchitectInterviewWorkspaceModel | null;
  selectedRole: ArchitectInterviewSelectedDocumentRole;
}): ArchitectInterviewReviewRegionState {
  if (selectedRole !== "interview" || !model?.interviewDocument) {
    return {
      kind: "prompt-or-missing",
      statement: "Prompt is an Approved handoff input; no Operator disposition is required.",
    };
  }
  if (!model.canApplyDisposition) {
    return {
      kind: "invalid",
      diagnostics: model.reason,
      canApplyReview: false,
    };
  }
  return {
    kind: "valid",
    label: "Interview Review",
    canApplyReview: true,
  };
}

function fingerprintText(value: string): string {
  return `${value.length}:${value}`;
}
