import { ArrowRight, CheckCircle2, FileText } from "lucide-react";
import type {
  CurrentWorkspaceModel,
  RuntimeActionResult,
  WorkCardCloseProjection,
} from "../../shared/workspaceContracts";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";

export function WorkCardCloseWorkspace({
  actionError,
  actionFeedback,
  documents,
  isReturning,
  model,
  onReturnToSelection,
  projectionResult,
}: {
  actionError: string;
  actionFeedback: string;
  documents: PlanningDocumentSummary[];
  isReturning: boolean;
  model: CurrentWorkspaceModel | null;
  onReturnToSelection: () => void;
  projectionResult: RuntimeActionResult | null;
}): JSX.Element {
  const projection = workCardCloseProjectionFromResult(projectionResult);
  const sourceEvidence = model?.sourceEvidence ?? [];
  const matchedEvidence = sourceEvidence.map((evidencePath) => {
    const document = documents.find((candidate) => candidate.markdownPath === evidencePath);
    return {
      path: evidencePath,
      displayName: document?.displayFilename ?? evidencePath.split("/").at(-1) ?? evidencePath,
      disposition: document?.effectiveDisposition ?? "Unavailable",
      readState: document?.documentReadState ?? "missing",
    };
  });
  const canReturn =
    Boolean(projection?.closed) &&
    projection?.returnTarget === "phase-work-card-selection" &&
    !isReturning;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" aria-label="Work Card Close workspace">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl space-y-3">
          <section className="rounded-lg border border-border bg-card p-3.5 text-card-foreground" aria-label="Close projection">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
              <div className="min-w-0">
                <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Close / Next</p>
                <h2 className="m-0 break-words text-[18px] font-semibold text-foreground">
                  {model?.currentWorkCardId ?? "Work Card"} - {model?.executionContext.workCard.title ?? model?.currentTarget ?? "Close / Next Work Card"}
                </h2>
                <p className="mt-1 break-all font-mono text-[12px] text-muted-foreground">
                  {model?.currentPhaseId ?? "phase unresolved"} / {model?.currentWorkCardId ?? "work card unresolved"}
                </p>
              </div>
              <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-500">
                {projection?.closed ? "Closed" : "Not Closed"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              <CloseField label="Phase ID" value={model?.currentPhaseId ?? "Waiting"} />
              <CloseField label="Work Card ID" value={model?.currentWorkCardId ?? "Waiting"} />
              <CloseField label="Return Target" value={projection?.returnTarget ?? "Waiting for close projection"} />
              <CloseField label="Projection Action" value={projectionResult?.action ?? "Waiting"} />
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reason</p>
              <p className="break-words text-[13px] text-foreground">
                {projection?.reason ?? "Close projection is loading."}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-3.5 text-card-foreground" aria-label="Close evidence">
            <div className="mb-3 flex items-center gap-2">
              <FileText aria-hidden="true" size={16} />
              <h3 className="m-0 text-[14px] font-semibold text-foreground">Close Evidence</h3>
            </div>
            {matchedEvidence.length > 0 ? (
              <div className="space-y-2">
                {matchedEvidence.map((entry) => (
                  <div className="rounded border border-border bg-muted px-3 py-2" key={entry.path}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="break-words font-mono text-[12px] text-foreground">{entry.displayName}</strong>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        {entry.disposition} / {entry.readState}
                      </span>
                    </div>
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{entry.path}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">No source evidence is available for the current close projection.</p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-3.5 text-card-foreground" aria-label="Close return action">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Next Workspace</p>
                <p className="break-words text-[13px] text-foreground">
                  {canReturn
                    ? "Phase Work Card Selection"
                    : projection?.reason ?? "Current close evidence is not ready."}
                </p>
              </div>
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 text-[13px] font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canReturn}
                onClick={onReturnToSelection}
                type="button"
              >
                {isReturning ? (
                  <CheckCircle2 aria-hidden="true" size={16} />
                ) : (
                  <ArrowRight aria-hidden="true" size={16} />
                )}
                {isReturning ? "Returning..." : "Return to Phase Building / Next Work Card"}
              </button>
            </div>
          </section>

          {actionFeedback ? <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-500" role="status">{actionFeedback}</div> : null}
          {actionError ? <div className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400" role="status">{actionError}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function workCardCloseProjectionFromResult(
  result: RuntimeActionResult | null,
): WorkCardCloseProjection | null {
  if (!result || !isRecord(result.payload)) {
    return null;
  }
  const { closed, returnTarget, reason } = result.payload;
  if (
    typeof closed !== "boolean" ||
    typeof returnTarget !== "string" ||
    typeof reason !== "string"
  ) {
    return null;
  }
  return { closed, returnTarget: returnTarget as WorkCardCloseProjection["returnTarget"], reason };
}

function CloseField({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="break-words font-mono text-[12px] text-foreground">{value}</p>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
