import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, Clipboard, ExternalLink, FileText, Play } from "lucide-react";

import type {
  CurrentWorkspaceModel,
  WorkCardMapCandidateProjection,
  WorkCardMapProjection,
} from "../../shared/workspaceContracts";

export function WorkCardMapWorkspace({
  actionError,
  actionFeedback,
  isBeginningPlanning,
  model,
  onBeginPlanning,
  onOpenPhaseValidation,
  projection,
}: {
  actionError: string;
  actionFeedback: string;
  isBeginningPlanning: boolean;
  model: CurrentWorkspaceModel | null;
  onBeginPlanning: (candidateId: string) => void;
  onOpenPhaseValidation: () => void;
  projection: WorkCardMapProjection | null;
}): JSX.Element {
  const candidates = projection?.candidates ?? [];
  const defaultSelectedId =
    candidates[0]?.candidateId ?? null;
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(defaultSelectedId);
  const selectedCandidate =
    candidates.find((candidate) => candidate.candidateId === selectedCandidateId) ??
    candidates[0] ??
    null;
  const activeCandidate = candidates.find((candidate) => candidate.isActive);
  const selectedIsActive = Boolean(selectedCandidate?.isActive);
  const canBeginSelected =
    selectedCandidate?.status === "Eligible" &&
    (!activeCandidate || selectedIsActive);
  const primaryActionLabel = selectedIsActive ? "Continue Work Card" : "Begin Planning";
  const pendingActionLabel = selectedIsActive ? "Continuing..." : "Beginning...";

  useEffect(() => {
    setSelectedCandidateId(defaultSelectedId);
  }, [defaultSelectedId, projection?.phaseId]);

  return (
    <section className="figma-work-card-map-screen" aria-label="Work Card Map workspace">
      <header className="figma-work-card-map-screen-header">
        <h1 id="workspace-heading">Work Card Map</h1>
        {projection?.state === "all-complete" ? (
          <button className="figma-work-card-map-primary-action" onClick={onOpenPhaseValidation} type="button">
            <ArrowRight aria-hidden="true" size={16} />
            Phase Validation
          </button>
        ) : (
          <button
            className="figma-work-card-map-primary-action"
            disabled={!canBeginSelected || isBeginningPlanning}
            onClick={() => {
              if (selectedCandidate) {
                onBeginPlanning(selectedCandidate.candidateId);
              }
            }}
            type="button"
          >
            <Play aria-hidden="true" size={15} />
            {isBeginningPlanning ? pendingActionLabel : primaryActionLabel}
          </button>
        )}
      </header>

      <div className="figma-work-card-map-dual-pane">
        <div className="figma-work-card-map-list-pane">
          <div className="figma-work-card-map-list-header">
            <div>
              <p>Planned Work Card Candidates</p>
              <small>
                {projection?.sourceWorkCardPlanPath ??
                  `${projection?.phaseId ?? model?.currentPhaseId ?? "phase unresolved"} / Work_Card_Plan.md`}
                {candidates.length > 0 ? ` - ${candidates.length} cards` : ""}
              </small>
            </div>
            <span>{projection?.reason ?? "Work Card candidates are proposed from the Current Approved Work Card Plan."}</span>
          </div>

          {projection?.state === "needs-attention" ? (
            <div className="document-error" role="status">
              {projection.reason}
            </div>
          ) : null}

          <ol className="figma-work-card-map-list" aria-label="Work Card candidates">
            {candidates.map((candidate) => {
              const isSelected = candidate.candidateId === selectedCandidate?.candidateId;
              return (
                <li key={candidate.candidateId}>
                  <button
                    aria-pressed={isSelected}
                    className={isSelected ? "figma-work-card-map-list-item selected" : "figma-work-card-map-list-item"}
                    onClick={() => setSelectedCandidateId(candidate.candidateId)}
                    type="button"
                  >
                    <span className="figma-work-card-map-index">{String(candidate.order).padStart(2, "0")}</span>
                    <span className="figma-work-card-map-copy">
                      <span className="figma-work-card-map-meta-row">
                        <span>{candidate.candidateId}</span>
                        {candidate.isActive ? <em>Active Work Card</em> : null}
                      </span>
                      <strong>{candidate.title}</strong>
                      {isSelected ? <p>{candidate.purpose}</p> : null}
                    </span>
                    <StatusBadge candidate={candidate} />
                  </button>
                </li>
              );
            })}
          </ol>

          {projection?.state === "all-complete" ? (
            <div className="figma-work-card-map-complete-callout" role="status">
              <span>Next Phase Step</span>
              <p>All planned Work Cards are complete for this phase. Continue to Phase Validation.</p>
            </div>
          ) : null}

          {candidates.length === 0 && projection?.state !== "needs-attention" ? (
            <div className="figma-empty-document">
              <strong>No Work Card candidates found</strong>
              <span>The current plan has no candidates to display.</span>
            </div>
          ) : null}
          {actionFeedback ? <div className="document-feedback" role="status">{actionFeedback}</div> : null}
          {actionError ? <div className="document-error" role="status">{actionError}</div> : null}
        </div>

        <div className="figma-work-card-map-doc-pane">
          <WorkCardMapDocumentViewer candidate={selectedCandidate} />
        </div>
      </div>
    </section>
  );
}

function WorkCardMapDocumentViewer({
  candidate,
}: {
  candidate: WorkCardMapCandidateProjection | null;
}): JSX.Element {
  const markdown = useMemo(() => candidate ? documentMarkdownForCandidate(candidate) : "", [candidate]);
  const lines = markdown.split("\n");
  const filename = candidate?.formalWorkCardDocument?.displayFilename ??
    filenameFromPath(candidate?.formalWorkCardMarkdownPath ?? "work_card.md");

  async function copyMarkdown(): Promise<void> {
    if (!markdown) {
      return;
    }
    await window.navigator.clipboard.writeText(markdown);
  }

  if (!candidate) {
    return (
      <div className="figma-work-card-map-doc-card">
        <div className="figma-empty-document">
          <strong>No Work Card selected</strong>
          <span>Select a candidate to inspect its Work Card target.</span>
        </div>
      </div>
    );
  }

  return (
    <article className="figma-work-card-map-doc-card" aria-label="Selected Work Card document viewer">
      <header className="figma-work-card-map-doc-header">
        <div className="figma-work-card-map-doc-title">
          <FileText aria-hidden="true" size={14} />
          <strong>{filename}</strong>
        </div>
        <div className="figma-work-card-map-doc-actions">
          <StatusBadge candidate={candidate} />
          <button onClick={() => void copyMarkdown()} type="button">
            <Clipboard aria-hidden="true" size={13} />
            Copy
          </button>
          <button disabled title="Open document is not exposed through the current renderer API" type="button">
            <ExternalLink aria-hidden="true" size={13} />
            Open
          </button>
        </div>
      </header>

      <div className="figma-work-card-map-doc-body">
        {candidate.formalWorkCardDocument?.readError ? (
          <div className="document-error" role="status">{candidate.formalWorkCardDocument.readError}</div>
        ) : null}
        {lines.map((line, index) => renderMarkdownLine(line, index))}
        <div className="figma-work-card-map-doc-meta">
          <MapField label="Focus Area" value={candidate.purpose} />
          <MapField label="File Targets" mono value={candidate.formalWorkCardMarkdownPath} />
          <MapField label="Dependencies" value={candidate.dependsOn.length > 0 ? candidate.dependsOn.join(", ") : "None"} />
        </div>
      </div>

      <footer className="figma-work-card-map-doc-footer">
        <span>{candidate.formalWorkCardMarkdownPath}</span>
      </footer>
    </article>
  );
}

function StatusBadge({
  candidate,
}: {
  candidate: WorkCardMapCandidateProjection;
}): JSX.Element | null {
  if (!candidate.status) {
    return null;
  }
  return (
    <span className={`figma-work-card-map-status ${candidate.status.toLowerCase()}`}>
      {candidate.status === "Complete"
        ? <CheckCircle2 aria-hidden="true" size={13} />
        : <CircleAlert aria-hidden="true" size={13} />}
      {candidate.status}
    </span>
  );
}

function MapField({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}): JSX.Element {
  return (
    <div className="figma-work-card-map-field">
      <span>{label}</span>
      <p className={mono ? "mono" : ""}>{value}</p>
    </div>
  );
}

function documentMarkdownForCandidate(candidate: WorkCardMapCandidateProjection): string {
  const body = candidate.formalWorkCardDocument?.bodyMarkdown?.trim();
  if (body) {
    return body;
  }
  return [
    `# Work Card: ${candidate.candidateId}`,
    `## ${candidate.title}`,
    "",
    "### Objective",
    candidate.purpose,
    "",
    "### Plan Conditions",
    candidate.reason,
  ].join("\n");
}

function renderMarkdownLine(line: string, index: number): JSX.Element {
  if (line.startsWith("# ")) {
    return <h1 key={index}>{line.slice(2)}</h1>;
  }
  if (line.startsWith("## ")) {
    return <h2 key={index}>{line.slice(3)}</h2>;
  }
  if (line.startsWith("### ")) {
    return <h3 key={index}>{line.slice(4)}</h3>;
  }
  if (line.startsWith("- ")) {
    return <li key={index}>{line.slice(2)}</li>;
  }
  if (!line.trim()) {
    return <div className="figma-work-card-map-doc-space" key={index} />;
  }
  return <p key={index}>{line}</p>;
}

function filenameFromPath(value: string): string {
  return value.split("/").pop()?.replace(/\.md$/i, "") ?? value;
}
