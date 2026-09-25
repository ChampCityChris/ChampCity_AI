import { createHash } from "node:crypto";
import path from "node:path";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { SourceGraph, SourceGraphOptions } from "../../shared/sourceLifecycleContracts";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import { inspectGitCommit } from "../agentHarness/repository/gitMutations";
import { createSQLiteProjectStateReader } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { readWorkProjectIdentity } from "../workIntake/workIntakeService";
import type { WorkflowType } from "../../shared/projectState/workflowTypeRegistry";
import type { SourceGraphRevisionDetail } from "../../shared/sourceLifecycleContracts";

const MAX_LINES = 128;
const MAX_REVISIONS = 500;
const MAX_BINDINGS = 128;
const revisionPattern = /^[a-f0-9]{40,64}$/;

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

type Metadata = Pick<SourceGraph, "workflowBindings"> & {
  checkpoints: Array<ProjectStateRecord<"SourceCheckpoint">>;
  integrations: Array<ProjectStateRecord<"IntegrationRecord">>;
  targets: string[];
  truncated: boolean;
  status: SourceGraph["providerDiagnostics"]["metadata"];
};

function emptyMetadata(status: Metadata["status"]): Metadata {
  return { workflowBindings: [], checkpoints: [], integrations: [], targets: [], truncated: false, status };
}

async function structuredMetadata(root: string, repositoryId: string, projectId: string,
  names: Set<string>, includeCompleted: boolean): Promise<Metadata> {
  const reader = createSQLiteProjectStateReader(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const baselineRows = (await reader.listEntities(projectId, "SourceBaseline"))
      .filter((row): row is ProjectStateRecord<"SourceBaseline"> => row.entityType === "SourceBaseline");
    const baselines = new Map(baselineRows.map(row => [row.id, row]));
    const workflows = new Map((await reader.listEntities(projectId, "Workflow"))
      .filter((row): row is ProjectStateRecord<"Workflow"> => row.entityType === "Workflow").map(row => [row.id, row]));
    const allBindings = (await reader.listEntities(projectId, "SourceBinding"))
      .filter((row): row is ProjectStateRecord<"SourceBinding"> => row.entityType === "SourceBinding");
    const bindings = allBindings.filter(row => baselines.get(row.body.sourceBaselineId)?.body.repositoryId === repositoryId);
    for (const binding of bindings) {
      const baseline = baselines.get(binding.body.sourceBaselineId);
      const owner = workflows.get(binding.body.workflowId);
      const baselineOwner = baseline ? workflows.get(baseline.body.workflowId) : undefined;
      if (!baseline || !owner || !baselineOwner || owner.lineageId !== baselineOwner.lineageId) throw Error("SourceBinding baseline and Workflow lineage mismatch.");
    }
    const allCheckpoints = (await reader.listEntities(projectId, "SourceCheckpoint"))
      .filter((row): row is ProjectStateRecord<"SourceCheckpoint"> => row.entityType === "SourceCheckpoint");
    const allIntegrations = (await reader.listEntities(projectId, "IntegrationRecord"))
      .filter((row): row is ProjectStateRecord<"IntegrationRecord"> => row.entityType === "IntegrationRecord");
    const workflowLineages = new Map([...workflows].map(([id, row]) => [id, row.lineageId]));
    const selected = bindings.map(binding => {
      const baseline = baselines.get(binding.body.sourceBaselineId)!;
      const lineage = workflowLineages.get(binding.body.workflowId);
      const baselineLineage = workflowLineages.get(baseline.body.workflowId);
      if (!lineage || lineage !== baselineLineage) throw Error("SourceBinding baseline and Workflow lineage mismatch.");
      const current = [...workflows.values()].filter(wf => wf.lineageId === lineage &&
        wf.lifecycleState !== "superseded" && wf.lifecycleState !== "voided" &&
        wf.body.workflowType !== "work-intake-routing");
      if (current.length !== 1) throw Error("SourceBinding lineage does not have one current substantive Workflow.");
      return { binding, baseline, currentWorkflow: current[0], lineage };
    })
      .filter(row => includeCompleted || !["closed", "cancelled"].includes(row.currentWorkflow.body.workflowState)
        && !["closed", "archived", "voided"].includes(row.currentWorkflow.lifecycleState))
      .sort((a, b) => a.binding.id.localeCompare(b.binding.id));
    const limited = selected.slice(0, MAX_BINDINGS);
    const selectedLineages = new Set(limited.map(row => row.lineage));
    const lineageWorkflowIds = new Set([...workflows].filter(([, wf]) => selectedLineages.has(wf.lineageId)).map(([id]) => id));
    const checkpoints = allCheckpoints.filter(row => lineageWorkflowIds.has(row.body.workflowId));
    const integrations = allIntegrations.filter(row => lineageWorkflowIds.has(row.body.workflowId));
    const workflowBindings = limited.map(({ binding, baseline, currentWorkflow, lineage }) => {
      const branch = binding.body.workSourceLineId;
      const ownIntegrations = integrations.filter(row => lineage === workflowLineages.get(row.body.workflowId))
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id));
      return { workflowId: currentWorkflow.id, sourceAnchorWorkflowId: baseline.body.workflowId,
        lineId: branch && names.has(branch) ? lineId(repositoryId, branch) : null,
        title: currentWorkflow.body.title, workflowType: currentWorkflow.body.workflowType as WorkflowType,
        lifecycleState: currentWorkflow.lifecycleState, workflowState: currentWorkflow.body.workflowState,
        baseRevisionId: baseline.body.baseRevisionId, currentRevisionId: binding.body.currentRevisionId ?? null,
        checkpointKinds: [...new Set(checkpoints.filter(row => lineage === workflowLineages.get(row.body.workflowId)).map(row => row.body.checkpointKind))].sort(),
        integrationState: ownIntegrations.at(-1)?.body.integrationState ?? null };
    });
    return { workflowBindings, checkpoints, integrations,
      targets: [...new Set(limited.map(row => row.baseline.body.integrationTargetSourceLineId))],
      truncated: selected.length > MAX_BINDINGS, status: "available" };
  } finally { reader.close(); }
}

/** Resolve the selected app identity without deriving it from a display branch label. */
export async function selectedSourceGraphRepositoryId(root: string): Promise<string> {
  try {
    const projectId = selectedCurrentProjectId(root);
    if (projectId) {
      const reader = createSQLiteProjectStateReader(path.join(root, ".champcity", "project-state.sqlite"));
      try {
        const resources = await reader.listEntities(projectId, "ProjectResource");
        const resource = resources.find(row => row.entityType === "ProjectResource" && row.body.resourceType === "source-repository");
        if (resource?.entityType === "ProjectResource") return resource.body.logicalName;
        const bindings = await reader.listEntities(projectId, "SourceBinding");
        const binding = bindings.find(row => row.entityType === "SourceBinding");
        if (binding?.entityType === "SourceBinding") {
          const baseline = await reader.getEntity(projectId, binding.body.sourceBaselineId);
          if (baseline?.entityType === "SourceBaseline") return baseline.body.repositoryId;
        }
      } finally { reader.close(); }
    } else {
      return readWorkProjectIdentity(root)?.repositoryId ?? "selected-repository";
    }
  } catch { /* Mechanical topology remains available without workflow metadata. */ }
  return "selected-repository";
}

export async function getSourceGraphRevisionDetail(root: string, revisionId: string): Promise<SourceGraphRevisionDetail> {
  if (!revisionPattern.test(revisionId)) throw new AgentHarnessError("INVALID_INPUT", "An exact source revision is required.");
  const commit = await inspectGitCommit(root, { ref: revisionId });
  const changedFiles = commit.changedFiles.slice(0, 24).map(row => ({ path: row.path, status: row.status }));
  return { revisionId: commit.commit, parents: commit.parents, timestamp: commit.authoredAt, changedFiles,
    totalChangedFiles: commit.changedFiles.length, changedFilesTruncated: commit.changedFiles.length > changedFiles.length };
}

/** Backend-owned, read-only projection of local branch topology and available workflow semantics. */
export async function getSourceGraph(root: string, repositoryId: string, options: SourceGraphOptions = {},
  projectContainerRoot: string = root): Promise<SourceGraph> {
  const maxRevisions = bound(options.maxRevisions, 200, MAX_REVISIONS, "maxRevisions");
  const maxLines = bound(options.maxLines, 64, MAX_LINES, "maxLines");
  if (options.includeCompleted !== undefined && typeof options.includeCompleted !== "boolean")
    throw new AgentHarnessError("INVALID_INPUT", "includeCompleted must be boolean.");
  const branchOutput = (await runBoundedGit({ cwd: root, args: ["for-each-ref", "--sort=refname",
    "--exclude=refs/heads/champcity-integration/*", "--exclude=refs/heads/champcity-mcp/*", `--count=${maxLines + 1}`,
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
    const projectId = selectedCurrentProjectId(projectContainerRoot);
    metadata = projectId ? await structuredMetadata(projectContainerRoot, repositoryId, projectId, names, options.includeCompleted !== false)
      : emptyMetadata("missing");
  } catch { metadata = emptyMetadata("unavailable"); }
  const sourceLines: SourceGraph["sourceLines"] = branches.map(row => ({ id: lineId(repositoryId, row.name),
    headRevisionId: row.commit, providerBranchName: row.name, role: row.name === "main" ? "main" : row.name === "dev" ? "dev" : "work",
    workflowIds: [...new Set(metadata.workflowBindings.filter(binding => binding.lineId === lineId(repositoryId, row.name))
      .map(binding => binding.workflowId))].sort() }));
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
  return { repositoryId, integrationTargets, sourceLines, revisions, workflowBindings: metadata.workflowBindings,
    truncation: { maxRevisions, maxLines, revisionsTruncated: records.length > maxRevisions,
      linesTruncated: allBranches.length > maxLines,
      omittedParentLinks: selected.reduce((count, row) => count + row.parents.filter(parent => !included.has(parent)).length, 0),
      workflowBindingsTruncated: metadata.truncated },
    providerDiagnostics: { provider: "git", ...(current.exitCode === 0 ? { currentBranch: current.stdout.trim() } : {}), metadata: metadata.status } };
}
