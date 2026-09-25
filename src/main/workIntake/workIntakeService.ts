import fs from "node:fs";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { WorkIntakeRecord, WorkProjectIdentity } from "../../shared/workIntakeContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { assertLegacyCanonicalReadAllowed } from "../documents/legacyCanonicalWriteFence";
import { workIntakeBranchName } from "./workIntakeBranchService";

const projectPath = "planning/work-intake/PROJECT.md";
const intakeDirectory = "planning/work-intake/intakes";
const identityPattern = /^(project|repository|intake)-[a-f0-9-]{36}$/;

function containedPath(root: string, relativePath: string): string {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath) throw Error("Work Intake canonical path must not be redirected.");
  return resolved.resolvedPath;
}

function readCanonical(root: string, relativePath: string) {
  assertLegacyCanonicalReadAllowed(root);
  const file = containedPath(root, relativePath);
  if (!fs.existsSync(file)) return null;
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 1_000_000) throw Error("Work Intake document is not a bounded Markdown file.");
  return parseCanonicalMarkdownDocument(fs.readFileSync(file, "utf8"));
}

export function readWorkProjectIdentity(root: string): WorkProjectIdentity | null {
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
  const project = readWorkProjectIdentity(root);
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
