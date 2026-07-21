import type { PlanningDocumentSummary } from "../documents/planningDocument";
import { workspaceLabels, type WorkspaceLabel } from "../workspaceContracts";

export interface WorkspaceDocument extends PlanningDocumentSummary {
  workspace: WorkspaceLabel;
  group: string;
}

export interface WorkspaceGroup {
  group: string;
  documents: WorkspaceDocument[];
}

const projectIntakePattern = /project[_ -]?intake/i;

export function classifyPlanningDocument(
  document: PlanningDocumentSummary,
): Pick<WorkspaceDocument, "workspace" | "group"> {
  const searchable = [
    document.markdownPath,
    document.jsonPath,
    document.displayFilename,
  ]
    .filter(Boolean)
    .join("/")
    .toLowerCase();

  if (isPhaseCloseout(searchable)) {
    return { workspace: "Phase Closeout", group: "Closeout records" };
  }

  if (isOperatorValidation(searchable)) {
    return { workspace: "Operator Validation", group: "Validation and review evidence" };
  }

  if (isPhasePlanning(searchable)) {
    return { workspace: "Phase Planning", group: "Phase planning records" };
  }

  if (isWorkCard(searchable)) {
    return { workspace: "Work Card", group: "Work Cards" };
  }

  if (isProjectPlanning(searchable)) {
    return {
      workspace: "Project Planning",
      group: projectIntakePattern.test(searchable)
        ? "Project Intake"
        : "Project planning records",
    };
  }

  return { workspace: "Project Planning", group: "Other planning documents" };
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
  workspace: WorkspaceLabel,
): WorkspaceGroup[] {
  const grouped = new Map<string, WorkspaceDocument[]>();

  for (const document of assignDocumentsToWorkspaces(documents)) {
    if (document.workspace !== workspace) {
      continue;
    }

    const entries = grouped.get(document.group) ?? [];
    entries.push(document);
    grouped.set(document.group, entries);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => compareGroups(workspace, left, right))
    .map(([group, entries]) => ({
      group,
      documents: entries.sort(compareDocuments),
    }));
}

export function getWorkspaceDocumentCounts(
  documents: PlanningDocumentSummary[],
): Record<WorkspaceLabel, number> {
  const counts = Object.fromEntries(
    workspaceLabels.map((label) => [label, 0]),
  ) as Record<WorkspaceLabel, number>;

  for (const document of assignDocumentsToWorkspaces(documents)) {
    counts[document.workspace] += 1;
  }

  return counts;
}

function isProjectPlanning(value: string): boolean {
  return (
    value.includes("planning/project/") ||
    value.includes("project_planning") ||
    value.includes("project_roadmap") ||
    value.includes("phase_map") ||
    value.includes("project_architect") ||
    projectIntakePattern.test(value)
  );
}

function isPhasePlanning(value: string): boolean {
  return (
    value.includes("phase_planning") ||
    value.includes("work_card_plan") ||
    value.includes("phase_intake") ||
    value.includes("phase_architect") ||
    value.includes("design_documents")
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

function isOperatorValidation(value: string): boolean {
  return (
    value.includes("/implementer_reports/") ||
    value.includes("/architect_reviews/") ||
    value.includes("/validation_reports/") ||
    value.includes("/operator_validation") ||
    value.includes("/candidate_dispositions/") ||
    value.includes("/validation_evidence/")
  );
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

function compareGroups(workspace: WorkspaceLabel, left: string, right: string): number {
  if (workspace === "Project Planning") {
    if (left === "Project Intake") {
      return -1;
    }
    if (right === "Project Intake") {
      return 1;
    }
  }

  if (left === "Other planning documents") {
    return 1;
  }
  if (right === "Other planning documents") {
    return -1;
  }

  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function compareDocuments(left: WorkspaceDocument, right: WorkspaceDocument): number {
  const leftPath = left.markdownPath ?? left.jsonPath ?? left.displayFilename;
  const rightPath = right.markdownPath ?? right.jsonPath ?? right.displayFilename;

  if (projectIntakePattern.test(leftPath) && !projectIntakePattern.test(rightPath)) {
    return -1;
  }
  if (!projectIntakePattern.test(leftPath) && projectIntakePattern.test(rightPath)) {
    return 1;
  }

  return leftPath.localeCompare(rightPath, "en", { sensitivity: "base" });
}
