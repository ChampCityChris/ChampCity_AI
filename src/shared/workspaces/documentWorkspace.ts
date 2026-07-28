import type { PlanningDocumentSummary } from "../documents/planningDocument";
import {
  workspaceDefinitions,
  type WorkspaceId,
  type WorkspaceLabel,
} from "../workspaceContracts";

export interface WorkspaceDocument extends PlanningDocumentSummary {
  workspaceId: WorkspaceId;
  workspace: WorkspaceLabel;
  group: string;
}

export interface WorkspaceGroup {
  group: string;
  documents: WorkspaceDocument[];
}

const workspaceById = new Map(workspaceDefinitions.map((definition) => [definition.id, definition]));

function workspace(id: WorkspaceId): Pick<WorkspaceDocument, "workspaceId" | "workspace"> {
  const definition = workspaceById.get(id);
  if (!definition) {
    throw new Error(`Unknown workspace ID: ${id}`);
  }
  return { workspaceId: definition.id, workspace: definition.label };
}

export function classifyPlanningDocument(
  document: PlanningDocumentSummary,
): Pick<WorkspaceDocument, "workspaceId" | "workspace" | "group"> {
  if (isLegacyUnmanaged(document)) {
    return { ...workspace("project-planning-review"), group: "Historical and unmanaged documents" };
  }

  const searchable = [
    document.markdownPath,
    document.displayFilename,
  ]
    .filter(Boolean)
    .join("/")
    .toLowerCase();

  if (isPhaseCloseout(searchable)) {
    return { ...workspace("phase-validation"), group: "Closeout records" };
  }

  if (isProjectCloseout(searchable)) {
    return { ...workspace("project-validation"), group: "Project closeout records" };
  }

  if (isOperatorValidation(searchable)) {
    return { ...workspace("work-card-validation"), group: "Validation and review evidence" };
  }

  if (isProjectIntake(document)) {
    return { ...workspace("project-intake-capture"), group: "Project Intake" };
  }

  if (isArchitectInterview(document, searchable)) {
    return { ...workspace("architect-interview"), group: "Architect Interview" };
  }

  if (isImplementerReport(searchable)) {
    return { ...workspace("work-card-building-review"), group: "Implementer reports" };
  }

  if (isPhasePlanning(searchable)) {
    return { ...workspace("phase-planning-bundle"), group: "Phase planning records" };
  }

  if (isWorkCardIntake(searchable)) {
    return { ...workspace("work-card-intake"), group: "Work Card intake handoffs" };
  }

  if (isRepairWorkCard(searchable)) {
    return { ...workspace("work-card-repair"), group: "Repair Work Cards" };
  }

  if (isWorkCard(searchable)) {
    return { ...workspace("work-card-planning"), group: "Work Cards" };
  }

  if (isPhaseMap(searchable)) {
    return { ...workspace("project-phase-map"), group: "Phase Map records" };
  }

  if (isProjectPlanning(searchable)) {
    return {
      ...workspace("project-planning-review"),
      group: "Project planning records",
    };
  }

  if (isPhaseInterview(searchable)) {
    return { ...workspace("phase-interview"), group: "Phase interview records" };
  }

  return { ...workspace("project-planning-review"), group: "Context documents" };
}

export function assignDocumentsToWorkspaces(
  documents: PlanningDocumentSummary[],
): WorkspaceDocument[] {
  return documents.map((document) => ({
    ...document,
    ...classifyPlanningDocument(document),
  }));
}

export function getWorkspaceGroups(
  documents: PlanningDocumentSummary[],
  workspaceId: WorkspaceId,
): WorkspaceGroup[] {
  const grouped = new Map<string, WorkspaceDocument[]>();

  for (const document of assignDocumentsToWorkspaces(documents)) {
    if (document.workspaceId !== workspaceId) {
      continue;
    }

    const entries = grouped.get(document.group) ?? [];
    entries.push(document);
    grouped.set(document.group, entries);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => compareGroups(workspaceId, left, right))
    .map(([group, entries]) => ({
      group,
      documents: entries.sort(compareDocuments),
    }));
}

export function getWorkspaceDocumentCounts(
  documents: PlanningDocumentSummary[],
): Record<WorkspaceId, number> {
  const counts = Object.fromEntries(
    workspaceDefinitions.map((definition) => [definition.id, 0]),
  ) as Record<WorkspaceId, number>;

  for (const document of assignDocumentsToWorkspaces(documents)) {
    counts[document.workspaceId] = (counts[document.workspaceId] ?? 0) + 1;
  }

  return counts;
}

function isProjectPlanning(value: string): boolean {
  return (
    value.includes("planning/project/") ||
    value.includes("project_planning") ||
    value.includes("project_roadmap") ||
    value.includes("project_architect")
  );
}

function isProjectIntake(document: PlanningDocumentSummary): boolean {
  return isActiveCanonicalArtifact(document, "project-intake");
}

function isArchitectInterview(document: PlanningDocumentSummary, value: string): boolean {
  return isActiveCanonicalArtifact(document, "project-architect-interview") ||
    isActiveCanonicalArtifact(document, "project-architect-interview-prompt");
}

function isLegacyUnmanaged(document: PlanningDocumentSummary): boolean {
  return document.metadata.artifactType === "legacy-unmanaged" ||
    document.metadata.participationRole === "historical";
}

function isActiveCanonicalArtifact(document: PlanningDocumentSummary, artifactType: string): boolean {
  return (
    document.metadata.artifactType === artifactType &&
    Boolean(document.metadata.canonical) &&
    !document.readError &&
    document.documentReadState === "readable" &&
    document.metadata.participationRole !== "historical"
  );
}

function isPhaseMap(value: string): boolean {
  return (
    value.includes("/phase_map/") ||
    value.includes("phase_map_architect_handoff") ||
    value.includes("phase_map")
  );
}

function isPhasePlanning(value: string): boolean {
  return (
    value.includes("phase_planning") ||
    value.includes("work_card_plan") ||
    value.includes("phase_intake") ||
    value.includes("design_documents")
  );
}

function isPhaseInterview(value: string): boolean {
  return (
    value.includes("phase_interview") ||
    value.includes("phase_interview_architect_handoff") ||
    value.includes("/phase_interviews/")
  );
}

function isWorkCard(value: string): boolean {
  return (
    value.includes("/work_cards/") ||
    value.includes("work_card") ||
    value.includes("/repair_prompts/") ||
    value.includes("repair_prompt") ||
    value.includes("implementer_handoff")
  );
}

function isRepairWorkCard(value: string): boolean {
  return value.includes("repair") && (value.includes("/work_cards/") || value.includes("repair_architect"));
}

function isWorkCardIntake(value: string): boolean {
  return (
    value.includes("work_card_intake") ||
    value.includes("work-card-intake")
  );
}

function isOperatorValidation(value: string): boolean {
  return (
    value.includes("/validation_records/") ||
    value.includes("/architect_reviews/") ||
    value.includes("/validation_reports/") ||
    value.includes("/operator_validation") ||
    value.includes("/candidate_dispositions/") ||
    value.includes("/validation_evidence/")
  );
}

function isImplementerReport(value: string): boolean {
  return value.includes("/implementer_reports/") || value.includes("implementer_report");
}

function isPhaseCloseout(value: string): boolean {
  return (
    value.includes("/phase_closeouts/") ||
    value.includes("/closeout_reports/") ||
    value.includes("phase_closeout") ||
    value.includes("closeout_report") ||
    value.includes("roadmap_rebaseline")
  );
}

function isProjectCloseout(value: string): boolean {
  return value.includes("project_closeout") || value.includes("/project_closeouts/");
}

function compareGroups(workspaceId: WorkspaceId, left: string, right: string): number {
  if (workspaceId === "project-planning-review") {
    if (left === "Project Intake") {
      return -1;
    }
    if (right === "Project Intake") {
      return 1;
    }
  }

  if (left === "Context documents") {
    return 1;
  }
  if (right === "Context documents") {
    return -1;
  }

  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function compareDocuments(left: WorkspaceDocument, right: WorkspaceDocument): number {
  const leftPath = left.markdownPath || left.displayFilename;
  const rightPath = right.markdownPath || right.displayFilename;

  if (isProjectIntake(left) && !isProjectIntake(right)) {
    return -1;
  }
  if (!isProjectIntake(left) && isProjectIntake(right)) {
    return 1;
  }

  return leftPath.localeCompare(rightPath, "en", { sensitivity: "base" });
}
