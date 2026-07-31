import type { PlanningDocumentSummary } from "../documents/planningDocument";
import { evaluateFreshnessFromSummaries } from "../documents/sourceFreshness";
import { analyzeProjectIntakeCorpus, type ProjectIntakeRailStatus } from "../projectIntake/projectIntakeCorpus";
import type {
  ArchitectInterviewRailStatus,
  ProjectLifecycleRailStatus,
  WorkspaceId,
} from "../workspaceContracts";

export type ProjectTopRailStatusMap = Record<
  | "project-intake-capture"
  | "architect-interview"
  | "project-planning-review"
  | "project-phase-map"
  | "phase-interview"
  | "project-validation"
  | "project-close",
  ProjectLifecycleRailStatus
>;

export function deriveProjectLifecycleRailStatuses(
  documents: PlanningDocumentSummary[],
  inputs: {
    projectIntakeStatus: ProjectIntakeRailStatus;
    architectInterviewStatus: ArchitectInterviewRailStatus;
  },
): ProjectTopRailStatusMap {
  const projectPlanning = deriveProjectPlanningRailStatus(documents, inputs.architectInterviewStatus);
  const phaseMap = derivePhaseMapRailStatus(documents, projectPlanning);
  const phases = derivePhasesAggregateRailStatus(documents, phaseMap);
  const projectValidation = deriveProjectValidationRailStatus(documents, phases);
  const projectClose = deriveProjectCloseRailStatus(documents, projectValidation);

  return {
    "project-intake-capture": inputs.projectIntakeStatus,
    "architect-interview": inputs.architectInterviewStatus,
    "project-planning-review": projectPlanning,
    "project-phase-map": phaseMap,
    "phase-interview": phases,
    "project-validation": projectValidation,
    "project-close": projectClose,
  };
}

export function projectRailStatusForWorkspace(
  statuses: ProjectTopRailStatusMap,
  workspaceId: WorkspaceId,
): ProjectLifecycleRailStatus | undefined {
  if (workspaceId === "phase-interview") return statuses["phase-interview"];
  return statuses[workspaceId as keyof ProjectTopRailStatusMap];
}

export function deriveProjectPlanningRailStatus(
  documents: PlanningDocumentSummary[],
  architectInterviewStatus: ArchitectInterviewRailStatus,
): ProjectLifecycleRailStatus {
  if (architectInterviewStatus !== "Completed") {
    return architectInterviewStatus === "Needs Attention" ? "Needs Attention" : "Not Ready";
  }
  const context = projectPlanningContextFromSummaries(documents);
  if (context.state === "invalid") return "Needs Attention";
  if (!context.handoff) return "Ready";
  if (!context.profile && !context.roadmap) return "Waiting for Output";
  if (!context.profile || !context.roadmap) return "Awaiting Approval";
  const bundle = bundleState(documents, context.profile, context.roadmap);
  if (bundle === "invalid") return "Needs Attention";
  if (bundle === "completed") return "Completed";
  return "Awaiting Approval";
}

export function derivePhaseMapRailStatus(
  documents: PlanningDocumentSummary[],
  projectPlanningStatus: ProjectLifecycleRailStatus,
): ProjectLifecycleRailStatus {
  if (projectPlanningStatus !== "Completed") {
    return projectPlanningStatus === "Needs Attention" ? "Needs Attention" : "Not Ready";
  }
  const handoff = uniqueCurrentHandoff(documents, "phase-map");
  if (handoff.state === "conflict") return "Needs Attention";
  const phaseMap = uniqueActiveByArtifactType(documents, "phase-map");
  if (phaseMap.state === "conflict") return "Needs Attention";
  if (handoff.state === "none") return "Ready";
  if (phaseMap.state === "none") return "Waiting for Output";
  if (!isReviewable(documents, phaseMap.document)) return "Needs Attention";
  return phaseMap.document.effectiveDisposition === "Approved" ? "Completed" : "Awaiting Approval";
}

export function derivePhasesAggregateRailStatus(
  documents: PlanningDocumentSummary[],
  phaseMapStatus: ProjectLifecycleRailStatus,
): ProjectLifecycleRailStatus {
  if (phaseMapStatus !== "Completed") {
    return phaseMapStatus === "Needs Attention" ? "Needs Attention" : "Not Ready";
  }
  const phaseMap = uniqueActiveByArtifactType(documents, "phase-map");
  if (phaseMap.state !== "one") return "Needs Attention";
  const phases = phasesFromPhaseMap(phaseMap.document);
  if (phases === null) return "Needs Attention";
  if (phases.length === 0) return "Ready";
  const closeouts = activeDocuments(documents).filter((document) => document.metadata.artifactType === "phase-closeout");
  const phaseIds = new Set(phases.map((phase) => phase.phaseId));
  const closeoutIds = new Map<string, number>();
  for (const closeout of closeouts) {
    const phaseId = closeout.metadata.phaseId;
    if (!phaseId || !phaseIds.has(phaseId)) return "Needs Attention";
    closeoutIds.set(phaseId, (closeoutIds.get(phaseId) ?? 0) + 1);
  }
  if ([...closeoutIds.values()].some((count) => count > 1)) return "Needs Attention";
  if (closeouts.some((document) => !isReviewable(documents, document))) return "Needs Attention";
  const closedIds = new Set(
    closeouts
      .filter((document) => document.effectiveDisposition === "Approved" && document.metadata.closureDecision === "Close")
      .map((document) => document.metadata.phaseId)
      .filter((phaseId): phaseId is string => Boolean(phaseId)),
  );
  if (phases.every((phase) => closedIds.has(phase.phaseId))) return "Completed";
  const hasStartedPhaseEvidence = activeDocuments(documents).some((document) =>
    document.markdownPath.startsWith("planning/phases/"),
  );
  return hasStartedPhaseEvidence ? "In Progress" : "Ready";
}

export function deriveProjectValidationRailStatus(
  documents: PlanningDocumentSummary[],
  phasesStatus: ProjectLifecycleRailStatus,
): ProjectLifecycleRailStatus {
  if (phasesStatus !== "Completed") {
    return phasesStatus === "Needs Attention" ? "Needs Attention" : "Not Ready";
  }
  const closeout = uniqueActiveByArtifactType(documents, "project-closeout");
  if (closeout.state === "conflict") return "Needs Attention";
  if (closeout.state === "none") return "Ready";
  if (!isReviewable(documents, closeout.document)) return "Needs Attention";
  return closeout.document.effectiveDisposition === "Approved" ? "Completed" : "Awaiting Approval";
}

export function deriveProjectCloseRailStatus(
  documents: PlanningDocumentSummary[],
  validationStatus: ProjectLifecycleRailStatus,
): ProjectLifecycleRailStatus {
  const closeout = uniqueActiveByArtifactType(documents, "project-closeout");
  if (closeout.state === "conflict") return "Needs Attention";
  if (closeout.state === "none") return "Not Ready";
  if (!isReviewable(documents, closeout.document)) return "Needs Attention";
  if (closeout.document.effectiveDisposition !== "Approved") {
    return validationStatus === "Awaiting Approval" ? "Not Ready" : "Needs Attention";
  }
  return closeout.document.metadata.closureDecision === "Close" ? "Completed" : "Needs Attention";
}

function projectPlanningContextFromSummaries(documents: PlanningDocumentSummary[]): {
  state: "valid" | "invalid";
  handoff?: PlanningDocumentSummary;
  profile?: PlanningDocumentSummary;
  roadmap?: PlanningDocumentSummary;
} {
  const intakeCorpus = analyzeProjectIntakeCorpus(documents);
  if (intakeCorpus.state !== "single") return { state: intakeCorpus.state === "open" ? "valid" : "invalid" };
  const intake = intakeCorpus.documents[0];
  const promptResolution = uniqueDocuments(activeDocuments(documents).filter((document) =>
    document.metadata.artifactType === "project-architect-interview-prompt" &&
    document.effectiveDisposition === "Approved" &&
    hasSourceRevision(document, intake),
  ));
  if (promptResolution.state !== "one") return { state: "invalid" };
  const prompt = promptResolution.document;
  const target = prompt.metadata.architectOutputTargets?.markdown ?? defaultInterviewTarget(prompt);
  const interviewResolution = uniqueDocuments(activeDocuments(documents).filter((document) =>
    document.markdownPath === target &&
    document.metadata.artifactType === "project-architect-interview" &&
    document.effectiveDisposition === "Approved" &&
    hasSourceRevision(document, intake) &&
    hasSourceRevision(document, prompt),
  ));
  const interview = interviewResolution.state === "one" ? interviewResolution.document : undefined;
  if (!interview || !isReviewable(documents, interview)) return { state: "invalid" };
  const handoff = uniqueCurrentHandoff(documents, "project-planning");
  if (handoff.state === "conflict") return { state: "invalid" };
  const currentHandoff = handoff.state === "one" ? handoff.document : undefined;
  const targets = projectPlanningTargets(interview, currentHandoff);
  const profile = uniqueDocuments(activeDocuments(documents).filter((document) => document.markdownPath === targets.profile));
  const roadmap = uniqueDocuments(activeDocuments(documents).filter((document) => document.markdownPath === targets.roadmap));
  if (profile.state === "conflict" || roadmap.state === "conflict") return { state: "invalid" };
  return {
    state: "valid",
    handoff: currentHandoff,
    profile: profile.state === "one" ? profile.document : undefined,
    roadmap: roadmap.state === "one" ? roadmap.document : undefined,
  };
}

function projectPlanningTargets(
  interview: PlanningDocumentSummary,
  handoff: PlanningDocumentSummary | undefined,
): { profile: string; roadmap: string } {
  const workflowData = handoff?.metadata.canonical?.workflowData ?? {};
  const profile = typeof workflowData.projectProfileTarget === "string"
    ? workflowData.projectProfileTarget
    : "planning/project/PROJECT_PROFILE.md";
  const roadmap = typeof workflowData.projectRoadmapTarget === "string"
    ? workflowData.projectRoadmapTarget
    : `planning/project/Project_Roadmap/PROJECT_ROADMAP_${projectSlugFromInterview(interview)}.md`;
  return { profile, roadmap };
}

function bundleState(
  documents: PlanningDocumentSummary[],
  profile: PlanningDocumentSummary,
  roadmap: PlanningDocumentSummary,
): "completed" | "review" | "invalid" {
  if (!isReviewable(documents, profile) || !isReviewable(documents, roadmap)) return "invalid";
  if (
    profile.metadata.artifactType !== "project-profile" ||
    roadmap.metadata.artifactType !== "project-roadmap" ||
    profile.metadata.participationRole !== "compoundGatingReview" ||
    roadmap.metadata.participationRole !== "compoundGatingReview"
  ) {
    return "invalid";
  }
  if (profile.effectiveDisposition !== roadmap.effectiveDisposition) return "invalid";
  return profile.effectiveDisposition === "Approved" ? "completed" : "review";
}

function isReviewable(documents: PlanningDocumentSummary[], document: PlanningDocumentSummary): boolean {
  return (
    document.documentReadState === "readable" &&
    !document.readError &&
    evaluateFreshnessFromSummaries(document, documents).state === "fresh"
  );
}

type UniqueDocumentResolution =
  | { state: "none" }
  | { state: "one"; document: PlanningDocumentSummary }
  | { state: "conflict"; documents: PlanningDocumentSummary[] };

function uniqueCurrentHandoff(
  documents: PlanningDocumentSummary[],
  handoffKind: string,
): UniqueDocumentResolution {
  return uniqueDocuments(activeDocuments(documents)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.participationRole === "nonReviewHandoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === handoffKind)
    .filter((document) => document.effectiveDisposition === "Approved")
    .filter((document) => isReviewable(documents, document)));
}

function uniqueActiveByArtifactType(
  documents: PlanningDocumentSummary[],
  artifactType: string,
): UniqueDocumentResolution {
  return uniqueDocuments(activeDocuments(documents)
    .filter((document) => document.metadata.artifactType === artifactType));
}

function uniqueDocuments(documents: PlanningDocumentSummary[]): UniqueDocumentResolution {
  if (documents.length === 0) return { state: "none" };
  if (documents.length === 1) return { state: "one", document: documents[0] };
  return { state: "conflict", documents };
}

function activeDocuments(documents: PlanningDocumentSummary[]): PlanningDocumentSummary[] {
  return documents.filter((document) =>
    document.metadata.participationRole !== "historical" &&
    !document.markdownPath.replace(/\\/g, "/").toLowerCase().startsWith("planning/archive/"),
  );
}

function hasSourceRevision(document: PlanningDocumentSummary, source: PlanningDocumentSummary): boolean {
  return (document.metadata.sourceRevisions ?? []).some(
    (entry) => entry.path === source.markdownPath && entry.revision === (source.metadata.artifactRevision ?? 1),
  );
}

function defaultInterviewTarget(prompt: PlanningDocumentSummary): string {
  const slug = prompt.markdownPath.match(/PROJECT_ARCHITECT_INTERVIEW_PROMPT_(.+)\.md$/)?.[1] ?? "project";
  return `planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_${slug}.md`;
}

function projectSlugFromInterview(interview: PlanningDocumentSummary): string {
  const identity = interview.metadata.canonical?.identity ?? {};
  const value = identity.projectSlug ?? identity["Project.ArtifactKey"] ?? interview.displayFilename.replace(/^PROJECT_ARCHITECT_INTERVIEW_/, "");
  return typeof value === "string" && value.trim() ? value.trim() : "project";
}

function phasesFromPhaseMap(phaseMap: PlanningDocumentSummary | undefined): Array<{ phaseId: string }> | null {
  if (!phaseMap) return [];
  const phases = phaseMap.metadata.canonical?.workflowData.phases;
  if (!Array.isArray(phases)) return null;
  const result: Array<{ phaseId: string }> = [];
  for (const phase of phases) {
    if (!phase || typeof phase !== "object" || typeof (phase as { phaseId?: unknown }).phaseId !== "string") {
      return null;
    }
    result.push({ phaseId: (phase as { phaseId: string }).phaseId });
  }
  return result;
}
