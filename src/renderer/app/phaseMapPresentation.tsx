import { useState } from "react";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";

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
