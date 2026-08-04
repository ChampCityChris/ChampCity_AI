import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";

import type {
  CloseReturnSelectionProjection,
  CurrentWorkspaceModel,
  WorkCardIntakeProjection,
} from "../../shared/workspaceContracts";

export function WorkCardSelectionWorkspace({
  actionError,
  actionFeedback,
  isGenerating,
  model,
  onPreparePlanning,
  projection,
}: {
  actionError: string;
  actionFeedback: string;
  isGenerating: boolean;
  model: CurrentWorkspaceModel | null;
  onPreparePlanning: () => void;
  projection: CloseReturnSelectionProjection | null;
}): JSX.Element {
  const isSelected = projection?.state === "selected";
  const selected = isSelected ? projection.workCardIntake : null;
  const selectionReason = isSelected ? projection.selectionReason : "";
  const terminalReason = projection && !isSelected ? projection.reason : "";
  const phaseId = projection?.phaseId ?? model?.currentPhaseId ?? "phase unresolved";
  const closedWorkCardId = projection?.closedWorkCardId ?? model?.currentWorkCardId ?? "work card unresolved";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden" aria-label="Work Card Selection workspace">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl space-y-3">
          <section className="rounded-lg border border-border bg-card p-3.5 text-card-foreground" aria-label="Selection authority">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
              <div className="min-w-0">
                <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Work Card Selection</p>
                <h2 className="m-0 break-words text-[18px] font-semibold text-foreground">
                  {selected
                    ? `${selected.candidate.candidateId} - ${selected.candidate.title}`
                    : terminalReason || "Close-return candidate selection"}
                </h2>
                <p className="mt-1 break-all font-mono text-[12px] text-muted-foreground">
                  {phaseId} / closed {closedWorkCardId}
                </p>
              </div>
              <span className="rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-sky-400">
                {projection?.state ?? "waiting"}
              </span>
            </div>

            {selected ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                <SelectionField label="Active Phase" value={selected.phaseId} />
                <SelectionField label="Selected Candidate" value={selected.candidate.candidateId} />
                <SelectionField label="Candidate Order" value={String(selected.candidate.order)} />
                <SelectionField label="Resolution" value={selected.candidate.resolutionStatus} />
                <SelectionField label="Selection Reason" muted value={selectionReason} />
                <SelectionField label="Intake Handoff Target" muted value={selected.handoffMarkdownPath} />
                <SelectionField label="Formal Work Card Target" muted value={formalWorkCardTargetPath(selected)} />
                <SelectionField label="Closed Work Card" muted value={closedWorkCardId} />
              </div>
            ) : (
              <div className="rounded border border-border bg-muted px-3 py-2 text-[13px] text-muted-foreground">
                {terminalReason || "Return from Work Card Close / Next to load the repository-derived next candidate."}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-3.5 text-card-foreground" aria-label="Candidate explanations">
            <div className="mb-3 flex items-center gap-2">
              {selected ? <CheckCircle2 aria-hidden="true" size={16} /> : <CircleAlert aria-hidden="true" size={16} />}
              <h3 className="m-0 text-[14px] font-semibold text-foreground">Candidate Explanations</h3>
            </div>
            <div className="space-y-2">
              {projection?.explanations.length ? projection.explanations.map((entry) => (
                <div className="rounded border border-border bg-muted px-3 py-2" key={entry.candidateId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="font-mono text-[12px] text-foreground">{entry.candidateId}</strong>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{entry.state}</span>
                  </div>
                  <p className="mt-1 break-words text-[12px] text-muted-foreground">{entry.reason}</p>
                  {entry.evidencePaths.length > 0 ? (
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{entry.evidencePaths.join("; ")}</p>
                  ) : null}
                </div>
              )) : (
                <p className="text-[13px] text-muted-foreground">Candidate explanations will appear after close-return selection is loaded.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-3.5 text-card-foreground" aria-label="Selection action">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Scoped Action Authority</p>
                <p className="break-words text-[13px] text-muted-foreground">
                  {selected
                    ? "Create the normal Work Card Intake handoff for the selected candidate."
                    : "No Work Card Planning handoff is available for this selection state."}
                </p>
              </div>
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded bg-sky-500 px-3 text-[13px] font-semibold text-[#0c0e14] transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!selected || isGenerating}
                onClick={onPreparePlanning}
                type="button"
              >
                <ArrowRight aria-hidden="true" size={16} />
                {isGenerating ? "Preparing..." : "Prepare Work Card Planning"}
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

function SelectionField({
  label,
  muted = false,
  value,
}: {
  label: string;
  muted?: boolean;
  value: string;
}): JSX.Element {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`break-words text-[13px] ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function formalWorkCardTargetPath(projection: WorkCardIntakeProjection): string {
  const formalTargetKey = ["formal", "WorkCard", "MarkdownPath"].join("") as keyof WorkCardIntakeProjection;
  return String(projection[formalTargetKey]);
}
