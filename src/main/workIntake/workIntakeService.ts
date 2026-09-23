import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseCanonicalMarkdownDocument, type CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import type {
  WorkIntakeProjection, WorkIntakeRecord, WorkIntakeSubmission,
  WorkIntakeSubmissionResult, WorkProjectIdentity,
} from "../../shared/workIntakeContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { writeCanonicalMarkdownDocuments } from "../documents/canonicalMarkdownDocumentWriter";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { createWorkIntakeBranchService, workIntakeBranchName } from "./workIntakeBranchService";

const projectPath = "planning/work-intake/PROJECT.md";
const intakeDirectory = "planning/work-intake/intakes";
const identityPattern = /^(project|repository|intake)-[a-f0-9-]{36}$/;

function containedPath(root: string, relativePath: string): string {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath) throw Error("Work Intake canonical path must not be redirected.");
  return resolved.resolvedPath;
}

function readCanonical(root: string, relativePath: string) {
  const file = containedPath(root, relativePath);
  if (!fs.existsSync(file)) return null;
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 1_000_000) throw Error("Work Intake document is not a bounded Markdown file.");
  return parseCanonicalMarkdownDocument(fs.readFileSync(file, "utf8"));
}

function readProject(root: string): WorkProjectIdentity | null {
  const document = readCanonical(root, projectPath);
  if (!document) return null;
  const data = document.metadata.workflowData;
  if (document.metadata.artifactType !== "work-project" ||
    !validIdentity(data.projectId, "project") || !validIdentity(data.repositoryId, "repository") ||
    typeof data.name !== "string" || !data.name.trim() ||
    document.metadata.identity.projectId !== data.projectId) throw Error("Project identity document is invalid.");
  return { projectId: data.projectId as string, repositoryId: data.repositoryId as string, name: data.name };
}

function validIdentity(value: unknown, kind: string): value is string {
  return typeof value === "string" && identityPattern.test(value) && value.startsWith(`${kind}-`);
}

export function readWorkIntake(root: string, intakeId: string): WorkIntakeRecord {
  if (!validIdentity(intakeId, "intake")) throw Error("Invalid Work Intake identity.");
  const relativePath = `${intakeDirectory}/${intakeId}.md`;
  const document = readCanonical(root, relativePath);
  if (!document || document.metadata.artifactType !== "work-intake") throw Error("Work Intake document is missing or invalid.");
  const data = document.metadata.workflowData;
  const branch = data.branchBinding as WorkIntakeRecord["branchBinding"] | undefined;
  const project = readProject(root);
  if (!project || document.metadata.identity.intakeId !== intakeId || data.intakeId !== intakeId ||
    data.projectId !== project.projectId || document.metadata.identity.projectId !== project.projectId ||
    !branch || branch.intakeId !== intakeId || branch.repositoryId !== project.repositoryId ||
    branch.workBranch !== workIntakeBranchName(intakeId) || typeof branch.baseBranch !== "string" || !branch.baseBranch ||
    !/^[a-f0-9]{40,64}$/.test(branch.baseCommit) || !/^[a-f0-9]{40,64}$/.test(branch.currentHead)) {
    throw Error("Work Intake identity or branch binding is inconsistent.");
  }
  for (const key of ["workRequest", "desiredOutcome", "knownConstraints", "repositoryReviewContext"] as const) {
    if (typeof data[key] !== "string" || (key === "workRequest" || key === "desiredOutcome") && !(data[key] as string).trim()) {
      throw Error("Work Intake content is incomplete.");
    }
  }
  if (typeof data.hasExistingSourceOrPlanning !== "boolean") throw Error("Work Intake evidence indicator is missing.");
  return {
    intakeId, projectId: project.projectId, projectName: project.name,
    workRequest: data.workRequest as string, desiredOutcome: data.desiredOutcome as string,
    knownConstraints: data.knownConstraints as string, repositoryReviewContext: data.repositoryReviewContext as string,
    hasExistingSourceOrPlanning: data.hasExistingSourceOrPlanning, branchBinding: branch,
    relativePath, artifactRevision: document.metadata.artifactRevision, sourceRevisions: document.metadata.sourceRevisions,
  };
}

export async function getWorkIntakeProjection(root: string): Promise<WorkIntakeProjection> {
  const project = readProject(root);
  const sourceControl = createSourceControlService({ repositoryId: project?.repositoryId ?? "selected-repository", repositoryRoot: root });
  const state = await sourceControl.branches();
  const intakes: WorkIntakeRecord[] = [];
  const directory = containedPath(root, intakeDirectory);
  if (fs.existsSync(directory)) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    if (entries.length > 1000) throw Error("Work Intake inventory exceeds its bounded limit.");
    for (const entry of entries) {
      if (entry.name.endsWith(".md")) intakes.push(readWorkIntake(root, entry.name.slice(0, -3)));
    }
  }
  const currentBranch = state.ok ? state.result.currentBranch : null;
  const matching = intakes.filter(({ branchBinding }) => branchBinding.workBranch === currentBranch);
  if (matching.length > 1) throw Error("Multiple Work Intakes claim the selected branch.");
  if (matching[0]) matching[0].branchBinding = await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId: matching[0].branchBinding.repositoryId }).verify(matching[0].branchBinding);
  const status = state.ok ? await sourceControl.status() : null;
  const branches = state.ok ? state.result.branches : [];
  const suggestedBranchName = matching[0]?.branchBinding.baseBranch ?? currentBranch;
  const suggestedBase = branches.find(({ name }) => name === suggestedBranchName) ?? null;
  const baseBlockedReason = !state.ok ? "Work Intake requires a Git repository with a committed baseline."
    : !currentBranch ? "Select a branch before starting Work Intake."
    : !status?.ok || !status.result.clean ? "Commit or resolve existing changes before starting another Work Intake." : null;
  const missingTargetReason = matching[0] && !suggestedBase
    ? "The recorded integration target branch is unavailable. Refresh Work Intake or resolve the missing target before starting another Work Intake."
    : null;
  return {
    project, suggestedProjectName: project?.name ?? path.basename(root),
    branches, currentBranch, suggestedBase,
    intakes, currentIntake: matching[0] ?? null,
    blockedReason: [baseBlockedReason, missingTargetReason].filter(Boolean).join(" ") || null,
  };
}

export async function submitWorkIntake(root: string, input: WorkIntakeSubmission): Promise<WorkIntakeSubmissionResult> {
  validateSubmission(input);
  const existingProject = readProject(root);
  if ((existingProject?.projectId ?? null) !== input.projectId) throw Error("Selected Project identity changed; refresh Work Intake.");
  const project: WorkProjectIdentity = existingProject ?? {
    projectId: `project-${randomUUID()}`, repositoryId: `repository-${randomUUID()}`, name: input.projectName.trim(),
  };
  const intakeId = `intake-${randomUUID()}`;
  const branchService = createWorkIntakeBranchService({ repositoryId: project.repositoryId, repositoryRoot: root });
  return branchService.establish({ intakeId, baseBranch: input.baseBranch, baseCommit: input.baseCommit }, (binding) => {
    // Recheck the selected base's identity after branching: never rewrite a different Project.
    const baseProject = readProject(root);
    if (baseProject && JSON.stringify(baseProject) !== JSON.stringify(project)) throw Error("Selected base belongs to another Project identity.");
    const projectRevision = baseProject ? readCanonical(root, projectPath)!.metadata.artifactRevision : 1;
    const relativePath = `${intakeDirectory}/${intakeId}.md`;
    if (fs.existsSync(containedPath(root, relativePath))) throw Error("Work Intake document already exists.");
    const data = {
      intakeId, projectId: project.projectId, workRequest: input.workRequest.trim(), desiredOutcome: input.desiredOutcome.trim(),
      knownConstraints: input.knownConstraints.trim(), hasExistingSourceOrPlanning: input.hasExistingSourceOrPlanning,
      repositoryReviewContext: input.repositoryReviewContext.trim(), branchBinding: binding,
    };
    const metadata = (artifactType: string, identity: Record<string, unknown>, workflowData: Record<string, unknown>): CanonicalDocumentMetadata => ({
      schemaVersion: 1, artifactType, artifactRevision: 1, participationRole: "contextOnly", identity,
      sourceRevisions: artifactType === "work-intake" ? [{ path: projectPath, revision: projectRevision }] : [],
      workflowData, documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
    });
    // The canonical writer commits these files transactionally after WIR03 establishes the branch.
    containedPath(root, projectPath);
    writeCanonicalMarkdownDocuments([
      ...(!baseProject ? [{
        workspaceRoot: root, relativePath: projectPath,
        metadata: metadata("work-project", { projectId: project.projectId }, { ...project }),
        bodyMarkdown: `# Project: ${project.name}\n\nProject identity: ${project.projectId}\n`,
      }] : []),
      {
        workspaceRoot: root, relativePath, metadata: metadata("work-intake", { intakeId, projectId: project.projectId }, data),
        bodyMarkdown: `# Work Intake: ${project.name}\n\n## Work request\n\n${data.workRequest}\n\n## Desired outcome\n\n${data.desiredOutcome}\n\n## Constraints\n\n${data.knownConstraints || "None specified."}\n\n## Existing evidence\n\nExisting source or planning: ${data.hasExistingSourceOrPlanning ? "Yes" : "No"}\n\n${data.repositoryReviewContext || "None supplied."}\n\n## Source baseline\n\nBase branch: ${binding.baseBranch}\nBase commit: ${binding.baseCommit}\nWork branch: ${binding.workBranch}\n`,
      },
    ]);
    return readWorkIntake(root, intakeId);
  });
}

function validateSubmission(input: WorkIntakeSubmission): void {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Work Intake submission is required.");
  const fields = ["projectId", "projectName", "workRequest", "desiredOutcome", "knownConstraints", "hasExistingSourceOrPlanning", "repositoryReviewContext", "baseBranch", "baseCommit"];
  if (Object.keys(input).some((key) => !fields.includes(key))) throw Error("Work Intake contains unsupported fields.");
  for (const key of ["projectName", "workRequest", "desiredOutcome", "knownConstraints", "repositoryReviewContext", "baseBranch", "baseCommit"] as const) {
    if (typeof input[key] !== "string" || input[key].length > 20000 || input[key].includes("\0")) throw Error("Work Intake fields must contain bounded text.");
  }
  if (!input.projectName.trim() || !input.workRequest.trim() || !input.desiredOutcome.trim() || !input.baseBranch.trim()) throw Error("Project, work request, desired outcome, and base branch are required.");
  if (input.projectId !== null && !validIdentity(input.projectId, "project") || typeof input.hasExistingSourceOrPlanning !== "boolean") throw Error("Work Intake Project or evidence context is invalid.");
}
