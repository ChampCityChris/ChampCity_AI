export const documentDispositionStatuses = [
  "Pending",
  "Approved",
  "Rejected",
  "RevisionRequested",
] as const;

export type DocumentDispositionStatus = (typeof documentDispositionStatuses)[number];

export function isDocumentDispositionStatus(
  value: unknown,
): value is DocumentDispositionStatus {
  return (
    typeof value === "string" &&
    documentDispositionStatuses.includes(value as DocumentDispositionStatus)
  );
}

export interface StoredDisposition {
  status: DocumentDispositionStatus;
}
