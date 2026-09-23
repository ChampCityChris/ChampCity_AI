import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { SourceGraph, SourceGraphOptions } from "../../shared/sourceLifecycleContracts";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { createSQLiteProjectStateReader } from "../projectState/sqliteProjectStateStore";
import { selectedStructuredProjectId } from "../workIntake/structuredWorkIntakeService";
import { readWorkIntake } from "../workIntake/workIntakeService";

const MAX_LINES = 128;
const MAX_REVISIONS = 500;
const MAX_BINDINGS = 128;
const revisionPattern = /^[a-f0-9]{40,64}$/;
const routeNames = new Set(["greenfield", "feature-change", "refactor-migration", "integration-composition",
  "infrastructure-platform", "research-prototype", "issue-resolution"]);

function bound(value: number | undefined, fallback: number, maximum: number, name: string): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new AgentHarnessError("INVALID_INPUT", `${name} must be between 1 and ${maximum}.`);
  }
  return value;
}

function lineId(repositoryId: string, branchName: string): string {
  return `line-${createHash("sha256").update(repositoryId).update("\0").update(branchName).digest("hex")}`;
}

type Metadata = Pick<SourceGraph, "workBindings"> & {
  checkpoints: Array<ProjectStateRecord<"SourceCheckpoint">>;
  integrations: Array<ProjectStateRecord<"IntegrationRecord">>;
  targets: string[];
  truncated: boolean;
  status: SourceGraph["providerDiagnostics"]["metadata"];
};

function emptyMetadata(status: Metadata["status"]): Metadata {
  return { workBindings: [], checkpoints: [], integrations: [], targets: [], truncated: false, status };
}

async function structuredMetadata(root: string, repositoryId: string, projectId: string,
  names: Set<string>, includeCompleted: boolean): Promise<Metadata> {
  const reader = createSQLiteProjectStateReader(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const bindings = (await reader.listEntities(projectId, "SourceBinding"))
      .filter((row): row is ProjectStateRecord<"SourceBinding"> => row.entityType === "SourceBinding" && row.body.repositoryId === repositoryId)
      .sort((a, b) => a.id.localeCompare(b.id));
    const intakes = new Map((await reader.listEntities(projectId, "WorkIntake"))
      .filter((row): row is ProjectStateRecord<"WorkIntake"> => row.entityType === "WorkIntake").map(row => [row.id, row]));
    const relationships = (await reader.listRelationships(projectId)).filter(row => !row.endedAt);
    const workflows = new Map((await reader.listEntities(projectId, "Workflow"))
      .filter((row): row is ProjectStateRecord<"Workflow"> => row.entityType === "Workflow").map(row => [row.id, row]));
    const assessments = new Set(relationships.filter(row => row.relationshipType === "assesses_route").map(row => row.fromEntityId));
    const decisions = (await reader.listEntities(projectId, "Decision"))
      .filter((row): row is ProjectStateRecord<"Decision"> => row.entityType === "Decision" && row.lifecycleState === "active"
        && row.body.decidedBy.principalType === "human" && row.body.decisionRole === "Operator"
        && row.body.effectiveAt <= new Date().toISOString() && routeNames.has(row.body.outcome));
    const decisionById = new Map(decisions.map(row => [row.id, row]));
    const derived = relationships.filter(row => row.relationshipType === "derived_from" && assessments.has(row.toEntityId));
    const routes = new Map<string, string>();
    for (const intake of intakes.values()) {
      const ownAssessments = new Set(relationships.filter(row => row.relationshipType === "assesses_route" && row.toEntityId === intake.id)
        .map(row => row.fromEntityId));
      const current = derived.filter(row => ownAssessments.has(row.toEntityId)).map(row => decisionById.get(row.fromEntityId))
        .filter((row): row is ProjectStateRecord<"Decision"> => !!row)
        .sort((a, b) => a.body.effectiveAt.localeCompare(b.body.effectiveAt) || a.id.localeCompare(b.id)).at(-1);
      if (current) routes.set(intake.id, current.body.outcome);
    }
    const allCheckpoints = (await reader.listEntities(projectId, "SourceCheckpoint"))
      .filter((row): row is ProjectStateRecord<"SourceCheckpoint"> => row.entityType === "SourceCheckpoint");
    const allIntegrations = (await reader.listEntities(projectId, "IntegrationRecord"))
      .filter((row): row is ProjectStateRecord<"IntegrationRecord"> => row.entityType === "IntegrationRecord");
    const selected = bindings.filter(row => {
      const intake = intakes.get(row.body.workIntakeId);
      return intake && (includeCompleted || !["closed", "cancelled"].includes(intake.body.intakeState));
    });
    const limited = selected.slice(0, MAX_BINDINGS);
    const ids = new Set(limited.map(row => row.body.workIntakeId));
    const checkpoints = allCheckpoints.filter(row => ids.has(row.body.workIntakeId));
    const integrations = allIntegrations.filter(row => ids.has(row.body.workIntakeId));
    const workBindings = limited.map(binding => {
      const intake = intakes.get(binding.body.workIntakeId)!;
      const branch = binding.body.workSourceLineId;
      const workflowId = relationships.find(row => row.relationshipType === "initiates" && row.fromEntityId === intake.id)?.toEntityId;
      const workflow = workflowId ? workflows.get(workflowId) : undefined;
      const ownIntegrations = integrations.filter(row => row.body.workIntakeId === intake.id)
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id));
      return { workIntakeId: intake.id, lineId: branch && names.has(branch) ? lineId(repositoryId, branch) : null,
        title: intake.body.request, route: routes.get(intake.id) ?? null, workType: workflow?.body.workflowType ?? null,
        lifecycleState: intake.body.intakeState, workflowState: workflow?.body.workflowState ?? null,
        checkpointKinds: [...new Set(checkpoints.filter(row => row.body.workIntakeId === intake.id).map(row => row.body.checkpointKind))].sort(),
        integrationState: ownIntegrations.at(-1)?.body.integrationState ?? null };
    });
    return { workBindings, checkpoints, integrations,
      targets: [...new Set(limited.map(row => row.body.integrationTargetSourceLineId))],
      truncated: selected.length > MAX_BINDINGS, status: "available" };
  } finally { reader.close(); }
}

function legacyMetadata(root: string, repositoryId: string, names: Set<string>): Metadata {
  const directory = resolveRepositoryPath(root, "planning/work-intake/intakes", { allowMissingLeaf: true }).resolvedPath;
  if (!fs.existsSync(directory)) return emptyMetadata("missing");
  const entries = fs.readdirSync(directory, { withFileTypes: true }).filter(row => row.isFile() && row.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selected = entries.slice(0, MAX_BINDINGS + 1).map(row => readWorkIntake(root, row.name.slice(0, -3)))
    .filter(row => row.branchBinding.repositoryId === repositoryId);
  const limited = selected.slice(0, MAX_BINDINGS);
  return { workBindings: limited.map(row => ({ workIntakeId: row.intakeId,
      lineId: names.has(row.branchBinding.workBranch) ? lineId(repositoryId, row.branchBinding.workBranch) : null,
      title: row.workRequest, route: null, workType: null, lifecycleState: "active", workflowState: null,
      checkpointKinds: [], integrationState: null })), checkpoints: [], integrations: [],
    targets: [...new Set(limited.map(row => row.branchBinding.baseBranch))],
    truncated: entries.length > MAX_BINDINGS || selected.length > MAX_BINDINGS, status: limited.length ? "available" : "missing" };
}

/** Backend-owned, read-only projection of local branch topology and available workflow semantics. */
export async function getSourceGraph(root: string, repositoryId: string, options: SourceGraphOptions = {}): Promise<SourceGraph> {
  const maxRevisions = bound(options.maxRevisions, 200, MAX_REVISIONS, "maxRevisions");
  const maxLines = bound(options.maxLines, 64, MAX_LINES, "maxLines");
  if (options.includeCompleted !== undefined && typeof options.includeCompleted !== "boolean")
    throw new AgentHarnessError("INVALID_INPUT", "includeCompleted must be boolean.");
  const branchOutput = (await runBoundedGit({ cwd: root, args: ["for-each-ref", "--sort=refname", `--count=${maxLines + 1}`,
    "--format=%(refname:short)%00%(objectname)", "refs/heads"] })).stdout;
  const allBranches = branchOutput.split(/\r?\n/).filter(Boolean).map(record => {
    const [name, commit] = record.split("\0");
    if (!name || !commit || !revisionPattern.test(commit)) throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Invalid Git branch inventory.");
    return { name, commit };
  });
  const branches = allBranches.slice(0, maxLines);
  const names = new Set(branches.map(row => row.name));
  let metadata: Metadata;
  try {
    const projectId = selectedStructuredProjectId(root);
    metadata = projectId ? await structuredMetadata(root, repositoryId, projectId, names, options.includeCompleted !== false)
      : legacyMetadata(root, repositoryId, names);
  } catch { metadata = emptyMetadata("unavailable"); }
  const sourceLines: SourceGraph["sourceLines"] = branches.map(row => ({ id: lineId(repositoryId, row.name),
    headRevisionId: row.commit, providerBranchName: row.name, role: row.name === "main" ? "main" : row.name === "dev" ? "dev" : "work",
    workIntakeIds: metadata.workBindings.filter(binding => binding.lineId === lineId(repositoryId, row.name))
      .map(binding => binding.workIntakeId) }));
  const targetNames = new Set(["main", "dev", ...metadata.targets]);
  const integrationTargets = sourceLines.filter(row => row.providerBranchName && targetNames.has(row.providerBranchName))
    .map(row => ({ id: `target-${row.id}`, lineId: row.id, headRevisionId: row.headRevisionId }));
  const tips = [...new Set(branches.map(row => row.commit))];
  const log = tips.length ? (await runBoundedGit({ cwd: root, args: ["rev-list", "--topo-order", "--timestamp", "--parents",
    `--max-count=${maxRevisions + 1}`, ...tips] })).stdout : "";
  const records = log.split(/\r?\n/).filter(Boolean).map(record => {
    const [seconds, id, ...parents] = record.split(" ");
    if (!seconds || !/^\d+$/.test(seconds) || !id || !revisionPattern.test(id) || parents.some(parent => !revisionPattern.test(parent)))
      throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Invalid Git revision ancestry.");
    return { id, parents, timestamp: new Date(Number(seconds) * 1000).toISOString() };
  });
  const selected = records.slice(0, maxRevisions);
  const included = new Set(selected.map(row => row.id));
  const revisions = selected.map(row => ({ ...row,
    headOfLineIds: sourceLines.filter(line => line.headRevisionId === row.id).map(line => line.id),
    checkpointKinds: [...new Set(metadata.checkpoints.filter(checkpoint => checkpoint.body.resultingRevisionId === row.id)
      .map(checkpoint => checkpoint.body.checkpointKind))].sort(),
    integrationStates: [...new Set(metadata.integrations.filter(integration =>
      integration.body.resultRevisionId === row.id || integration.body.incomingRevisionId === row.id)
      .map(integration => integration.body.integrationState))].sort() }));
  const current = await runBoundedGit({ cwd: root, args: ["symbolic-ref", "--quiet", "--short", "HEAD"], rejectNonZero: false });
  if (current.exitCode !== 0 && current.exitCode !== 1) throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Current branch cannot be inspected.");
  return { repositoryId, integrationTargets, sourceLines, revisions, workBindings: metadata.workBindings,
    truncation: { maxRevisions, maxLines, revisionsTruncated: records.length > maxRevisions,
      linesTruncated: allBranches.length > maxLines,
      omittedParentLinks: selected.reduce((count, row) => count + row.parents.filter(parent => !included.has(parent)).length, 0),
      workBindingsTruncated: metadata.truncated },
    providerDiagnostics: { provider: "git", ...(current.exitCode === 0 ? { currentBranch: current.stdout.trim() } : {}), metadata: metadata.status } };
}
