import { useState } from "react";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";

export interface WorkCardPlanCandidateProjection {
  candidateId: string;
  order: number;
  title: string;
  purpose: string;
  dependsOn: string[];
  resolutionStatus: string;
  resolutionReason: string;
  evidencePaths: string[];
  carriedForwardToPhaseId?: string;
}

export type WorkCardPlanProjection =
  | {
      state: "readable";
      candidates: WorkCardPlanCandidateProjection[];
    }
  | {
      state: "needs-attention";
      reason: string;
    };

export function shouldRenderWorkCardPlanDocumentPreview(
  document: PlanningDocumentDetail | null,
): boolean {
  return Boolean(
    document &&
    document.metadata.artifactType === "work-card-plan" &&
    document.metadata.participationRole !== "nonReviewHandoff" &&
    !document.readError &&
    (!document.documentReadState || document.documentReadState === "readable"),
  );
}

export function workCardPlanProjectionFromDocument(
  document: PlanningDocumentDetail,
): WorkCardPlanProjection {
  const candidates = document.metadata.canonical?.workflowData.candidates;
  if (!Array.isArray(candidates)) {
    return {
      state: "needs-attention",
      reason: "Work Card Plan metadata.workflowData.candidates is missing or malformed.",
    };
  }

  const projected: WorkCardPlanCandidateProjection[] = [];
  for (const candidate of candidates) {
    if (!isWorkCardPlanCandidateProjection(candidate)) {
      return {
        state: "needs-attention",
        reason: "Work Card Plan metadata.workflowData.candidates is missing required candidate fields.",
      };
    }
    projected.push({
      candidateId: candidate.candidateId,
      order: candidate.order,
      title: candidate.title,
      purpose: candidate.purpose,
      dependsOn: [...candidate.dependsOn],
      resolutionStatus: candidate.resolutionStatus,
      resolutionReason: candidate.resolutionReason,
      evidencePaths: [...candidate.evidencePaths],
      carriedForwardToPhaseId: candidate.carriedForwardToPhaseId,
    });
  }

  return {
    state: "readable",
    candidates: projected.sort((left, right) => left.order - right.order),
  };
}

export function WorkCardPlanDocumentPreview({
  defaultShowSource = false,
  document,
}: {
  defaultShowSource?: boolean;
  document: PlanningDocumentDetail;
}): JSX.Element {
  const [showSource, setShowSource] = useState(defaultShowSource);
  const projection = workCardPlanProjectionFromDocument(document);

  return (
    <section className="work-card-plan-preview" aria-label="Work Card Plan Projection">
      <div className="work-card-plan-preview-toolbar">
        <div>
          <span>Work Card Plan</span>
          <strong>
            {projection.state === "readable"
              ? `${projection.candidates.length} candidates`
              : "Needs Attention"}
          </strong>
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
        <pre className="preview-body work-card-plan-source">
          {document.bodyMarkdown}
        </pre>
      ) : projection.state === "readable" ? (
        <ol className="work-card-plan-candidate-list">
          {projection.candidates.map((candidate) => (
            <li
              className="work-card-plan-candidate"
              key={`${candidate.order}-${candidate.candidateId}`}
            >
              <div className="work-card-plan-candidate-heading">
                <span>{candidate.order}</span>
                <div>
                  <strong>{candidate.candidateId}</strong>
                  <h3>{candidate.title}</h3>
                </div>
              </div>
              <p>{candidate.purpose}</p>
              <dl>
                <div>
                  <dt>Dependencies</dt>
                  <dd>{candidate.dependsOn.length > 0 ? candidate.dependsOn.join(", ") : "None"}</dd>
                </div>
                <div>
                  <dt>Resolution Status</dt>
                  <dd>{candidate.resolutionStatus}</dd>
                </div>
                <div>
                  <dt>Resolution Reason</dt>
                  <dd>{candidate.resolutionReason || "None"}</dd>
                </div>
                <div>
                  <dt>Evidence Paths</dt>
                  <dd>
                    {candidate.evidencePaths.length > 0
                      ? candidate.evidencePaths.map((evidencePath) => (
                          <span key={evidencePath}>{evidencePath}</span>
                        ))
                      : "None"}
                  </dd>
                </div>
                {candidate.carriedForwardToPhaseId ? (
                  <div>
                    <dt>Carried Forward To Phase</dt>
                    <dd>{candidate.carriedForwardToPhaseId}</dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ol>
      ) : (
        <div className="document-error work-card-plan-needs-attention" role="status">
          <strong>Needs Attention</strong>
          <span>{projection.reason}</span>
        </div>
      )}
    </section>
  );
}

function isWorkCardPlanCandidateProjection(
  value: unknown,
): value is WorkCardPlanCandidateProjection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<WorkCardPlanCandidateProjection>;
  return (
    typeof candidate.candidateId === "string" &&
    typeof candidate.order === "number" &&
    Number.isInteger(candidate.order) &&
    typeof candidate.title === "string" &&
    typeof candidate.purpose === "string" &&
    Array.isArray(candidate.dependsOn) &&
    candidate.dependsOn.every((dependency) => typeof dependency === "string") &&
    typeof candidate.resolutionStatus === "string" &&
    typeof candidate.resolutionReason === "string" &&
    Array.isArray(candidate.evidencePaths) &&
    candidate.evidencePaths.every((evidencePath) => typeof evidencePath === "string") &&
    (
      candidate.carriedForwardToPhaseId === undefined ||
      typeof candidate.carriedForwardToPhaseId === "string"
    )
  );
}
