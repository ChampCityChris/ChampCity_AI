import fs from "node:fs";
import path from "node:path";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { ProjectStateRecord, ProjectStateRecord as StateRecord } from "../../shared/projectState/domainContracts";
import { MANAGED_PROJECT_SOURCE_PATHS, type RepositoryCheckout } from "../../shared/sourceLifecycleContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { createSourceControlService } from "./sourceControlService";
import { resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath, validateRepositoryCheckoutContract } from "./projectSourceTopology";
import { workflowRepositoryCheckout } from "./repositoryCheckoutDescriptors";
import { isGitWorkTree, runBoundedGit } from "../agentHarness/repository/boundedGit";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";

export interface WorkflowSourceMaterializationResult {
  binding: StateRecord<"SourceBinding">;
  checkout: RepositoryCheckout;
}

const operator = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const canonicalWorkflowId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type Binding = ProjectStateRecord<"SourceBinding">;
type Baseline = ProjectStateRecord<"SourceBaseline">;
function fail(message: string, code = "SOURCE_MATERIALIZATION_STATE_MISMATCH"): never {
  const error = new Error(message);
  (error as Error & { materializationCode?: string }).materializationCode = code;
  throw error;
}
function revision(value: string): boolean { return /^[a-f0-9]{40,64}$/.test(value); }

/** Explicitly materializes source only when a Workflow execution path requests it. */
export function createWorkflowSourceMaterializationService(options: {
  projectContainerRoot: string;
  projectId: string;
}) {
  async function materialize(workflowId: string): Promise<WorkflowSourceMaterializationResult> {
    if (typeof workflowId !== "string" || !canonicalWorkflowId.test(workflowId)) fail("A canonical Workflow ID is required.");
    const projectRoot = fs.realpathSync(options.projectContainerRoot);
    if (await isGitWorkTree(projectRoot)) fail("Project container must not be a Git working tree.");
    if (selectedCurrentProjectId(projectRoot) !== options.projectId) fail("Selected Current Project registration is unavailable.");
    const store = createSQLiteProjectStateStore(path.join(projectRoot, ".champcity", "project-state.sqlite"));
    try {
      const state = createProjectStateService(store, operator);
      const project = await store.getProject(options.projectId);
      if (!project) fail("Selected Project does not exist.");
      const workflow = await store.getEntity(options.projectId, workflowId);
      if (workflow?.entityType !== "Workflow" || workflow.lifecycleState !== "active" || workflow.body.workflowType === "work-intake-routing" || ["closed", "cancelled"].includes(workflow.body.workflowState)) fail("Workflow must be current, substantive and nonterminal.");
      const lineage = (await store.listEntities(options.projectId, "Workflow")).filter((r): r is ProjectStateRecord<"Workflow"> => r.entityType === "Workflow" && r.lineageId === workflow.lineageId);
      const lineageIds = new Set(lineage.map(r => r.id));
      const baselines = (await store.listEntities(options.projectId, "SourceBaseline")).filter((r): r is Baseline => r.entityType === "SourceBaseline" && lineageIds.has(r.body.workflowId));
      if (baselines.length !== 1) fail(baselines.length ? "Workflow lineage has ambiguous SourceBaselines." : "Workflow lineage has no SourceBaseline.");
      const baseline = baselines[0];
      if (!lineageIds.has(baseline.body.workflowId) || !canonicalWorkflowId.test(baseline.body.workflowId) || !baseline.body.baseRevisionId || !revision(baseline.body.baseRevisionId)) fail("SourceBaseline is invalid.");
      if (baseline.body.integrationTargetSourceLineId !== "dev") fail("Only the recorded Dev integration target is supported.", "SOURCE_INTEGRATION_TARGET_UNSUPPORTED");

      const existingBindings = (await store.listEntities(options.projectId, "SourceBinding")).filter((r): r is Binding => r.entityType === "SourceBinding" && r.lifecycleState === "active" && lineageIds.has(r.body.workflowId));
      if (existingBindings.length > 1) fail("Workflow lineage has multiple SourceBindings.");
      let binding = existingBindings[0];
      if (binding && binding.body.sourceBaselineId !== baseline.id) fail("Existing SourceBinding refers to another SourceBaseline.");
      if (!binding) binding = await state.createWorkflowSourceBinding(options.projectId, workflowId, baseline.id);

      const topology = resolveManagedProjectSourceTopology(projectRoot);
      const devRoot = topology.devCheckoutRoot;
      if (!fs.existsSync(devRoot) || fs.lstatSync(devRoot).isSymbolicLink() || !fs.statSync(devRoot).isDirectory() || fs.realpathSync(devRoot) !== path.resolve(devRoot)) fail("Managed Dev checkout is missing or redirected.");
      if (!await isGitWorkTree(devRoot)) fail("Managed Dev checkout is not a Git working tree.");
      const devTop = (await runBoundedGit({ cwd: devRoot, args: ["rev-parse", "--show-toplevel"] })).stdout.trim();
      if (path.resolve(await fs.promises.realpath(devTop)) !== path.resolve(await fs.promises.realpath(devRoot))) fail("Dev must be an exact Git working-tree root.");
      const devBranch = (await runBoundedGit({ cwd: devRoot, args: ["branch", "--show-current"] })).stdout.trim();
      if (devBranch !== "dev") fail("Managed Dev checkout must be on the dev SourceLine.");
      const base = (await runBoundedGit({ cwd: devRoot, args: ["rev-parse", "--verify", baseline.body.baseRevisionId + "^{commit}"] })).stdout.trim();
      if (base !== baseline.body.baseRevisionId) fail("Recorded baseline revision does not resolve exactly in Dev repository.");
      const commonDev = path.resolve(devRoot, (await runBoundedGit({ cwd: devRoot, args: ["rev-parse", "--git-common-dir"] })).stdout.trim());

      const anchorId = baseline.body.workflowId;
      const checkout = workflowRepositoryCheckout(baseline.body.repositoryId, anchorId);
      const sourceLineId = checkout.sourceLineId;
      if (!validateRepositoryCheckoutContract(checkout).valid) fail("Generated RepositoryCheckout contract is invalid.");
      const ready = binding.body.preparationState === "ready";
      const expectedHead = ready ? binding.body.currentRevisionId : baseline.body.baseRevisionId;
      async function blockReadyFailure(error: unknown, code: string): Promise<never> {
        try {
          const latest = await store.getEntity(options.projectId, binding.id) as Binding | null;
          if (latest && ["preparing", "ready"].includes(latest.body.preparationState)) {
            binding = await state.updateSourceBinding(options.projectId, binding.id,
              { preparationState: "blocked", failureCode: code }, latest.recordVersion) as Binding;
          }
        } catch { /* Keep the primary materialization error if state changed concurrently. */ }
        throw error;
      }
      if (ready && (!binding.body.workSourceLineId || binding.body.workSourceLineId !== sourceLineId || binding.body.repositoryCheckoutId !== checkout.repositoryCheckoutId || !expectedHead)) {
        const error = Object.assign(new Error("Ready SourceBinding identity conflicts with its baseline."), { materializationCode: "SOURCE_MATERIALIZATION_STATE_MISMATCH" });
        await blockReadyFailure(error, "SOURCE_MATERIALIZATION_STATE_MISMATCH");
      }

      if (!ready) {
        const latest = await store.getEntity(options.projectId, binding.id) as Binding;
        if (latest.body.preparationState === "unprepared" || latest.body.preparationState === "blocked") binding = await state.updateSourceBinding(options.projectId, binding.id,
          { preparationState: "preparing", failureCode: undefined }, latest.recordVersion) as Binding;
      }
      let checkoutPath;
      try { checkoutPath = resolveManagedWorkflowCheckoutPath(projectRoot, anchorId); }
      catch {
        const latest = await store.getEntity(options.projectId, binding.id) as Binding;
        if (["preparing", "ready"].includes(latest.body.preparationState)) {
          try { binding = await state.updateSourceBinding(options.projectId, binding.id, { preparationState: "blocked", failureCode: "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED" }, latest.recordVersion) as Binding; } catch { /* preserve path failure */ }
        }
        fail("Managed Workflow checkout path is invalid or redirected.", "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
      }

      try {
        const branchRef = (await runBoundedGit({ cwd: devRoot, args: ["show-ref", "--verify", "--hash", "refs/heads/" + sourceLineId], rejectNonZero: false })).stdout.trim();
        if (ready && !branchRef) fail("Ready Workflow SourceLine is missing.", "SOURCE_LINE_MATERIALIZATION_FAILED");
        if (!branchRef) {
          if (ready) fail("Ready Workflow SourceLine is missing.", "SOURCE_LINE_MATERIALIZATION_FAILED");
          const source = await createSourceControlService({ repositoryId: baseline.body.repositoryId, repositoryRoot: devRoot }).createWorkSource({
            baseRevision: { repositoryId: baseline.body.repositoryId, revisionId: baseline.body.baseRevisionId }, owner: { kind: "workflow", workflowId: anchorId },
          });
          if (!source.ok || source.result.sourceLine.sourceLineId !== sourceLineId || source.result.sourceLine.headRevisionId !== baseline.body.baseRevisionId) fail("WTR02E did not create the exact baseline Workflow SourceLine.", "SOURCE_LINE_MATERIALIZATION_FAILED");
        } else {
          const existingHead = (await runBoundedGit({ cwd: devRoot, args: ["rev-parse", "--verify", "refs/heads/" + sourceLineId + "^{commit}"] })).stdout.trim();
          if (!ready && existingHead !== baseline.body.baseRevisionId) fail("Existing Workflow SourceLine differs from its immutable baseline.", "SOURCE_LINE_MATERIALIZATION_FAILED");
        }
      } catch (error) {
        const latest = await store.getEntity(options.projectId, binding.id) as Binding;
        const code = (error as Error & { materializationCode?: string }).materializationCode ?? "SOURCE_LINE_MATERIALIZATION_FAILED";
        if (["preparing", "ready"].includes(latest.body.preparationState)) {
          try { binding = await state.updateSourceBinding(options.projectId, binding.id, { preparationState: "blocked", failureCode: code }, latest.recordVersion) as Binding; } catch { /* preserve primary failure */ }
        }
        throw error;
      }

      if (!ready) {
        if (binding.body.workSourceLineId !== sourceLineId || binding.body.currentRevisionId !== baseline.body.baseRevisionId) binding = await state.updateSourceBinding(options.projectId, binding.id,
          { workSourceLineId: sourceLineId, currentRevisionId: baseline.body.baseRevisionId }, binding.recordVersion) as Binding;
      }

      try {
        if (ready && !fs.existsSync(checkoutPath.checkoutRoot)) fail("Ready Workflow checkout is missing.", "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
        if (!fs.existsSync(checkoutPath.workflowCheckoutRoot)) fs.mkdirSync(checkoutPath.workflowCheckoutRoot);
        if (!fs.existsSync(checkoutPath.checkoutRoot)) {
          await runBoundedGit({ cwd: devRoot, args: ["worktree", "add", checkoutPath.checkoutRoot, sourceLineId] });
        }
        const checkoutRoot = checkoutPath.checkoutRoot;
        if (fs.lstatSync(checkoutRoot).isSymbolicLink() || !fs.statSync(checkoutRoot).isDirectory() || path.resolve(await fs.promises.realpath(checkoutRoot)) !== path.resolve(checkoutRoot)) fail("Workflow checkout path is redirected.", "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
        const root = (await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "--show-toplevel"] })).stdout.trim();
        const actualRoot = await fs.promises.realpath(root);
        if (path.resolve(actualRoot) !== path.resolve(await fs.promises.realpath(checkoutRoot))) fail("Workflow checkout is not an exact Git worktree root.", "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
        if ((await runBoundedGit({ cwd: checkoutRoot, args: ["branch", "--show-current"] })).stdout.trim() !== sourceLineId) fail("Workflow checkout is attached to another SourceLine.", "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
        const head = (await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "HEAD"] })).stdout.trim();
        if (head !== expectedHead) fail("Workflow checkout revision conflicts with its expected state.", "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
        const commonCheckout = path.resolve(checkoutRoot, (await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "--git-common-dir"] })).stdout.trim());
        if (commonCheckout !== commonDev) fail("Workflow checkout belongs to another Git repository.", "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
        const dirty = (await runBoundedGit({ cwd: checkoutRoot, args: ["status", "--porcelain", "--untracked-files=all"] })).stdout;
        if (dirty) fail("Workflow checkout is not clean.", "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED");
        if (ready) return { binding, checkout };
        const latest = await store.getEntity(options.projectId, binding.id) as Binding;
        binding = await state.updateSourceBinding(options.projectId, binding.id,
          { preparationState: "ready", workSourceLineId: sourceLineId, currentRevisionId: head, repositoryCheckoutId: checkout.repositoryCheckoutId, failureCode: undefined }, latest.recordVersion) as Binding;
        return { binding, checkout };
      } catch (error) {
        const current = await store.getEntity(options.projectId, binding.id) as Binding;
        const code = (error as Error & { materializationCode?: string }).materializationCode ?? "REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED";
        if (["preparing", "ready"].includes(current.body.preparationState)) {
          try { binding = await state.updateSourceBinding(options.projectId, binding.id, { preparationState: "blocked", failureCode: code }, current.recordVersion) as Binding; } catch { /* retain original failure */ }
        }
        throw error;
      }
    } finally { store.close(); }
  }
  return { materialize };
}
