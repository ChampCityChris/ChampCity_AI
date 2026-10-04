import {useEffect,useState,type ReactNode,type Ref,type ComponentProps} from "react";
import {Clipboard, ExternalLink, FileText} from "lucide-react";
import type {PlanningDocumentDetail} from "../../shared/documents/planningDocument";
import {FigmaDocumentDispositionPanel} from "./FigmaDocumentDispositionPanel";
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


export interface ProjectPhaseMapCardsProps {
  currentPhaseId?: string|null; documentError: string; feedback: string; onCopy:()=>void;
  selectedDocument: PlanningDocumentDetail|null; projection:PhaseMapProjection|null; workCardCounts:Readonly<Record<string,number>>;
}
/** Presentation only; projections and counts are supplied by the adapter. */
export function ProjectPhaseMapCards({currentPhaseId,documentError,feedback,onCopy,selectedDocument,projection,workCardCounts}:ProjectPhaseMapCardsProps):JSX.Element {
  const phases = projection?.state === "readable" ? projection.phases : [];
  const initialExpandedPhaseId = currentPhaseId && phases.some((phase) => phase.phaseId === currentPhaseId)
    ? currentPhaseId
    : phases[0]?.phaseId ?? null;
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(initialExpandedPhaseId);

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
            const workCardCount = workCardCounts[phase.phaseId] ?? 0;
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


export function ProjectPhaseMapShell(props:{cards:ProjectPhaseMapCardsProps;review:ComponentProps<typeof FigmaDocumentDispositionPanel>|null;browserCompanion:ReactNode;browserVisible:boolean;surfaceRef?:Ref<HTMLElement>}):JSX.Element {
  return <section className={["figma-phase-map-workspace",!props.browserVisible?"chat-hidden":""].filter(Boolean).join(" ")} aria-label="Phase Map Figma workspace" ref={props.surfaceRef} tabIndex={-1}>
    <div className="figma-phase-map-column"><ProjectPhaseMapCards {...props.cards} />{props.review?<FigmaDocumentDispositionPanel {...props.review}/>:null}</div>{props.browserCompanion}
  </section>;
}

export {WorkflowCandidateBrowserActions as ProjectPhaseMapBrowserActions} from "./WorkflowCandidateBrowserActions";
export type {WorkflowCandidateBrowserActionsProps as ProjectPhaseMapActionsProps} from "./WorkflowCandidateBrowserActions";
