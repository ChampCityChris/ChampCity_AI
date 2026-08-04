import { useEffect, useState } from "react";
import { Clipboard, ExternalLink, FileText } from "lucide-react";
import type {
  PlanningDocumentDetail,
  PlanningDocumentSummary,
} from "../../shared/documents/planningDocument";

export interface PhaseMapPhaseProjection {
  phaseId: string;
  title: string;
  order: number;
  purpose: string;
  dependsOn: string[];
  sourceReferences: string[];
}

export type PhaseMapProjection =
  | {
      state: "readable";
      phases: PhaseMapPhaseProjection[];
    }
  | {
      state: "needs-attention";
      reason: string;
    };

export function shouldRenderPhaseMapDocumentPreview(
  document: PlanningDocumentDetail | null,
): boolean {
  return Boolean(
    document &&
    document.metadata.artifactType === "phase-map" &&
    document.metadata.participationRole !== "nonReviewHandoff" &&
    !document.readError &&
    (!document.documentReadState || document.documentReadState === "readable"),
  );
}

export function phaseMapProjectionFromDocument(
  document: PlanningDocumentDetail,
): PhaseMapProjection {
  const phases = document.metadata.canonical?.workflowData.phases;
  if (!Array.isArray(phases)) {
    return {
      state: "needs-attention",
      reason: "Phase Map metadata.workflowData.phases is missing or malformed.",
    };
  }

  const projected: PhaseMapPhaseProjection[] = [];
  for (const phase of phases) {
    if (!isPhaseProjection(phase)) {
      return {
        state: "needs-attention",
        reason: "Phase Map metadata.workflowData.phases is missing required phase fields.",
      };
    }
    projected.push({
      phaseId: phase.phaseId,
      title: phase.title,
      order: phase.order,
      purpose: phase.purpose,
      dependsOn: [...phase.dependsOn],
      sourceReferences: [...phase.sourceReferences],
    });
  }

  return {
    state: "readable",
    phases: projected.sort((left, right) => left.order - right.order),
  };
}

export function PhaseMapDocumentPreview({
  defaultShowSource = false,
  document,
}: {
  defaultShowSource?: boolean;
  document: PlanningDocumentDetail;
}): JSX.Element {
  const [showSource, setShowSource] = useState(defaultShowSource);
  const projection = phaseMapProjectionFromDocument(document);

  return (
    <section className="phase-map-preview" aria-label="Phase Map Projection">
      <div className="phase-map-preview-toolbar">
        <div>
          <span>Phase Map</span>
          <strong>{projection.state === "readable" ? `${projection.phases.length} phases` : "Needs Attention"}</strong>
        </div>
        <button
          className="icon-button text-button"
          onClick={() => setShowSource((current) => !current)}
          type="button"
        >
          {showSource ? "Hide Source" : "View Source"}
        </button>
      </div>

      {showSource ? (
        <pre className="preview-body phase-map-source">
          {document.bodyMarkdown}
        </pre>
      ) : projection.state === "readable" ? (
        <ol className="phase-map-phase-list">
          {projection.phases.map((phase) => (
            <li className="phase-map-phase" key={`${phase.order}-${phase.phaseId}`}>
              <div className="phase-map-phase-heading">
                <span>{phase.order}</span>
                <div>
                  <strong>{phase.phaseId}</strong>
                  <h3>{phase.title}</h3>
                </div>
              </div>
              <p>{phase.purpose}</p>
              <dl>
                <div>
                  <dt>Dependencies</dt>
                  <dd>{phase.dependsOn.length > 0 ? phase.dependsOn.join(", ") : "None"}</dd>
                </div>
                <div>
                  <dt>Source References</dt>
                  <dd>
                    {phase.sourceReferences.map((reference) => (
                      <span key={reference}>{reference}</span>
                    ))}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      ) : (
        <div className="document-error phase-map-needs-attention" role="status">
          <strong>Needs Attention</strong>
          <span>{projection.reason}</span>
        </div>
      )}
    </section>
  );
}

export function FigmaPhaseMapWorkspace({
  currentPhaseId,
  documentError,
  documents,
  feedback,
  onCopy,
  selectedDocument,
}: {
  currentPhaseId?: string | null;
  documentError: string;
  documents: PlanningDocumentSummary[];
  feedback: string;
  onCopy: () => void;
  selectedDocument: PlanningDocumentDetail | null;
}): JSX.Element {
  const projection = selectedDocument && shouldRenderPhaseMapDocumentPreview(selectedDocument)
    ? phaseMapProjectionFromDocument(selectedDocument)
    : null;
  const phases = projection?.state === "readable" ? projection.phases : [];
  const initialExpandedPhaseId = currentPhaseId && phases.some((phase) => phase.phaseId === currentPhaseId)
    ? currentPhaseId
    : phases[0]?.phaseId ?? null;
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(initialExpandedPhaseId);
  const workCardCounts = workCardCountByPhaseId(documents);

  useEffect(() => {
    setExpandedPhaseId(initialExpandedPhaseId);
  }, [
    initialExpandedPhaseId,
    selectedDocument?.logicalDocumentId,
    selectedDocument?.metadata.artifactRevision,
  ]);

  return (
    <article className="figma-phase-map-card" aria-label="Phase Map">
      <header className="figma-phase-map-card-header">
        <div className="figma-phase-map-title-row">
          <FileText aria-hidden="true" size={14} />
          <strong>{selectedDocument?.displayFilename ?? "PHASE_MAP"}</strong>
          <span>{phases.length > 0 ? `- ${phases.length} phases` : ""}</span>
        </div>
        <div className="figma-phase-map-actions">
          <button disabled={!selectedDocument} onClick={onCopy} type="button">
            <Clipboard aria-hidden="true" size={13} />
            Copy
          </button>
          <button disabled title="Open document is not exposed through the current renderer API" type="button">
            <ExternalLink aria-hidden="true" size={13} />
            Open
          </button>
        </div>
      </header>

      {documentError || selectedDocument?.readError ? (
        <div className="document-error" role="status">
          {documentError || selectedDocument?.readError}
        </div>
      ) : null}
      {feedback ? <div className="document-feedback" role="status">{feedback}</div> : null}

      {projection?.state === "needs-attention" ? (
        <div className="document-error phase-map-needs-attention" role="status">
          <strong>Needs Attention</strong>
          <span>{projection.reason}</span>
        </div>
      ) : phases.length > 0 ? (
        <ol className="figma-phase-map-list">
          {phases.map((phase) => {
            const isActive = phase.phaseId === expandedPhaseId;
            const workCardCount = workCardCounts.get(phase.phaseId) ?? 0;
            return (
              <li key={`${phase.order}-${phase.phaseId}`}>
                <button
                  aria-expanded={isActive}
                  className={isActive ? "figma-phase-map-item active" : "figma-phase-map-item"}
                  onClick={() => setExpandedPhaseId(phase.phaseId)}
                  type="button"
                >
                  <div className="figma-phase-map-item-main">
                    <span className="figma-phase-map-index">{String(phase.order).padStart(2, "0")}</span>
                    <div className="figma-phase-map-copy">
                      <div className="figma-phase-map-meta-row">
                        <span>{phase.phaseId}</span>
                        {isActive ? <strong>Active</strong> : null}
                      </div>
                      <h2>{phase.title}</h2>
                      {isActive ? (
                        <>
                          <p>{phase.purpose}</p>
                          {phase.sourceReferences[0] ? (
                            <small>{phase.sourceReferences[0]}</small>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                  {workCardCount > 0 ? (
                    <span className="figma-phase-map-work-card-count">
                      {workCardCount} {workCardCount === 1 ? "card" : "cards"}
                      <i aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="figma-empty-document">
          <strong>No Phase Map selected</strong>
          <span>Open a readable Phase Map document to review the project phases.</span>
        </div>
      )}
    </article>
  );
}

export function workCardCountByPhaseId(
  documents: PlanningDocumentSummary[],
): Map<string, number> {
  const workCardsByPhase = new Map<string, Set<string>>();
  for (const document of documents) {
    if (document.metadata.artifactType !== "formal-work-card") {
      continue;
    }
    const identity = document.metadata.canonical?.identity as
      | { phaseId?: unknown; workCardId?: unknown }
      | undefined;
    const phaseId = document.metadata.phaseId ??
      (typeof identity?.phaseId === "string" ? identity.phaseId : undefined);
    const workCardId = document.metadata.workCardId ??
      (typeof identity?.workCardId === "string" ? identity.workCardId : undefined);
    if (!phaseId || !workCardId) {
      continue;
    }
    const phaseWorkCards = workCardsByPhase.get(phaseId) ?? new Set<string>();
    phaseWorkCards.add(workCardId);
    workCardsByPhase.set(phaseId, phaseWorkCards);
  }

  return new Map(
    [...workCardsByPhase.entries()].map(([phaseId, workCards]) => [phaseId, workCards.size]),
  );
}

function isPhaseProjection(value: unknown): value is PhaseMapPhaseProjection {
  if (!value || typeof value !== "object") {
    return false;
  }
  const phase = value as Partial<PhaseMapPhaseProjection>;
  return (
    typeof phase.phaseId === "string" &&
    typeof phase.title === "string" &&
    typeof phase.order === "number" &&
    Number.isFinite(phase.order) &&
    typeof phase.purpose === "string" &&
    Array.isArray(phase.dependsOn) &&
    phase.dependsOn.every((dependency) => typeof dependency === "string") &&
    Array.isArray(phase.sourceReferences) &&
    phase.sourceReferences.every((reference) => typeof reference === "string")
  );
}
