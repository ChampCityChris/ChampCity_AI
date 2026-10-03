import type {EntityId, ProjectStateEntity, ProjectStateRecord} from "./domainContracts";
import type {EffectiveDisposition} from "./projectStateService";
import type {PlanningDocumentDetail} from "../documents/planningDocument";

export interface CloseoutCandidateInput {
  workflowId: EntityId;
  targetEntityId: EntityId;
  scope: "project" | "phase";
  expectedTargetVersion: number;
  expectedRecordVersion?: number;
  closureDecision: "Close" | "DoNotClose";
  rationale: string;
}

export interface CloseoutReviewProjection {
  workflowId: EntityId;
  targetEntityId: EntityId;
  scope: "project" | "phase";
  cycleId: EntityId;
  recordVersion: number;
  closureDecision: "Close" | "DoNotClose";
  rationale: string;
  current: boolean;
  closed: boolean;
  disposition: EffectiveDisposition;
  markdown: string;
  document: PlanningDocumentDetail & {authoritative: false};
}

const literal = (value: unknown) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rematerializable SQL projection. Its text is never accepted as a command. */
export function renderCloseoutReview(cycle: ProjectStateRecord<"CloseoutReviewCycle">,
  sources: ProjectStateEntity[], disposition: EffectiveDisposition, current: boolean, closed: boolean): CloseoutReviewProjection {
  const {workflowId, targetEntityId, scope, closureDecision, rationale} = cycle.body;
  const title = `${scope === "project" ? "Project" : "Phase"} Closeout`;
  const markdown = [`# ${title}`, "Generated from SQL; non-authoritative review projection.",
    `Workflow: ${workflowId}`, `Target: ${targetEntityId}`, `Candidate: ${cycle.id}@${cycle.recordVersion}`,
    `Closure Decision: ${closureDecision}`, `Rationale: ${literal(rationale)}`,
    `Operator disposition: ${disposition.state}`, `Evidence: ${current ? "current" : "stale"}`, `Target closed: ${closed}`,
    "## Reviewed source revisions", ...sources.map(record => `- ${record.entityType} ${record.id}@${record.recordVersion}`),
    "## Criteria and validation evidence", ...sources.filter(record => ["Criterion", "Validation", "Decision", "TesterResult", "SourceBinding", "IntegrationRecord"].includes(record.entityType)).map(record => `### ${record.entityType} ${record.id}\n\n${Object.entries(record.body).map(([key,value]) => `- ${key}: ${literal(Array.isArray(value) ? value.join("; ") : typeof value === "object" ? JSON.stringify(value) : value)}`).join("\n")}`),
  ].join("\n\n");
  return {workflowId, targetEntityId, scope, cycleId: cycle.id, recordVersion: cycle.recordVersion, closureDecision, rationale,
    current, closed, disposition, markdown, document: {logicalDocumentId: cycle.id, markdownPath: `project-state:${cycle.id}`, displayFilename: `${scope.toUpperCase()}_CLOSEOUT.md`,
      metadata: {artifactType: "generated-closeout-review", artifactRevision: cycle.recordVersion, participationRole: "gatingReview", closureDecision},
      effectiveDisposition: disposition.state === "approved" ? "Approved" : disposition.state === "revision_requested" ? "RevisionRequested" : disposition.state === "rejected" ? "Rejected" : "Pending",
      documentReadState: "readable", initializationNeeded: false, bodyMarkdown: markdown, preview: markdown, previewTruncated: false, authoritative: false}};
}
