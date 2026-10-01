import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GENERATED_INTAKE_MARKER, isGeneratedIntakePath, isGreenfieldIntakeProjectionPath } from "../../shared/documents/generatedIntakeProjection";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";
import { WORKFLOW_INTAKE_DEFINITIONS } from "../../shared/workflowIntakeContracts";
import { WORKFLOW_TYPE_REGISTRY } from "../../shared/projectState/workflowTypeRegistry";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { EffectiveDisposition } from "../../shared/projectState/projectStateService";

export function intakeReviewDocument(workflow: ProjectStateRecord<"Workflow">, intake: ProjectStateRecord<"WorkflowIntake">,
  disposition: EffectiveDisposition, originalIntake: ProjectStateRecord<"WorkflowIntake"> = intake): PlanningDocumentDetail {
  const type = intake.body.workflowType as keyof typeof WORKFLOW_INTAKE_DEFINITIONS;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(workflow.id)) throw Error("Invalid generated Intake Workflow path identity.");
  const source = intake.provenance.sourceRef;
  const greenfieldPath = source && isGreenfieldIntakeProjectionPath(source) ? source :
    `planning/project/Project_Intake/PROJECT_INTAKE_${String(originalIntake.body.values.projectName ?? "project").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "project"}.md`;
  const markdownPath = type === "project-creation" ? greenfieldPath : `planning/workflows/${workflow.id}/Intake/WORKFLOW_INTAKE_${type}.md`;
  const effectiveDisposition = ({ approved: "Approved", revision_requested: "RevisionRequested", rejected: "Rejected" } as const)[disposition.state as "approved" | "revision_requested" | "rejected"] ?? "Pending";
  // Stable generation identity makes rebuilding the same committed state byte-identical.
  const generatedAt = [intake.updatedAt, disposition.effectiveAt ?? ""].sort().at(-1)!;
  const metadata = JSON.stringify({intakeId: intake.id, recordVersion: intake.recordVersion, workflowId: workflow.id,
    workflowType: type, disposition: effectiveDisposition, generatedAt}).replaceAll("--", "\\u002d\\u002d").replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
  const bodyMarkdown = [GENERATED_INTAKE_MARKER, `<!-- INTAKE PROJECTION ${metadata} -->`, "",
    `# ${WORKFLOW_TYPE_REGISTRY[type].label} Intake: ${workflow.body.title}`, "",
    ...WORKFLOW_INTAKE_DEFINITIONS[type].fields.flatMap(field => {
      const value = intake.body.values[field.key];
      return [`## ${field.label}`, typeof value === "boolean" ? value ? "Yes" : "No" : value || "Not provided.", ""];
    })].join("\n");
  return {logicalDocumentId: intake.id, markdownPath, displayFilename: path.posix.basename(markdownPath),
    metadata: {artifactType: "generated-workflow-intake", artifactRevision: intake.recordVersion}, effectiveDisposition,
    initializationNeeded: false, documentReadState: "readable", bodyMarkdown, preview: bodyMarkdown, previewTruncated: false};
}

/** Derived-only writer: deliberately independent of the legacy canonical authority fence. */
export function writeIntakeProjection(root: string, document: PlanningDocumentDetail): void {
  const relative = document.markdownPath;
  if (!isGeneratedIntakePath(relative) && !isGreenfieldIntakeProjectionPath(relative))
    throw Error("Invalid generated Intake projection path.");
  const canonical = fs.realpathSync(root);
  const segments = relative.split("/");
  let parent = canonical;
  for (const segment of segments.slice(0, -1)) {
    parent = path.join(parent, segment);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent);
    const stat = fs.lstatSync(parent);
    if (stat.isSymbolicLink() || !stat.isDirectory() || fs.realpathSync(parent) !== parent)
      throw Error("Generated Intake projection requires contained real directories.");
  }
  const target = path.join(parent, segments.at(-1)!);
  if (fs.existsSync(target) && (!fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink()))
    throw Error("Generated Intake projection target must be a regular file.");
  const temporary = path.join(parent, `.intake-${randomUUID()}.tmp`);
  try {
    const fd = fs.openSync(temporary, "wx");
    try { fs.writeFileSync(fd, document.bodyMarkdown, "utf8"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
