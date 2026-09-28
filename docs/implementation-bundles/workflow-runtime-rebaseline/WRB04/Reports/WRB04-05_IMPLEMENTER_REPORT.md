# WRB04-05 Implementer Report — Exact Workflow Integration

## Repository and Git context

- Approved repository root was verified from the repository `AGENTS.md`, current Git root, and active `dev` checkout before edits.
- Branch: `dev`; upstream: `origin/dev`. The branch was already ahead by 148 commits before this card. No push was performed.
- Required card checkpoint commit is pending at report creation; the final report will state the actual commit hash after the checkpoint without amending it.

## Implementation

- Added exact Workflow execution-completion projection and typed application/Project State command. Source-backed execution advances the Workflow to `integration-ready`; source-neutral execution closes after exact WorkItem and Phase completion and carries no integration record.
- Added exact Workflow integration service keyed by Current Project root and exact `workflowId`. It derives the accepted plan, lineage SourceBaseline/SourceBinding, incoming ref, source checkpoint chain, target Dev policy, current completion evidence, target validation evidence, and exact IntegrationRecord.
- Routed direct Workflow IPC through the exact service. WIR-routed integration now resolves the route's exact target Workflow and delegates to that same service; WorkIntake remains provenance only.
- Candidate storage now resolves and verifies `git rev-parse --git-common-dir`, stores machine state under common-repository-owned `.git/champcity-integration`, and verifies the candidate worktree shares that repository. Conventional `.git` directories remain supported.
- Generalized candidate ownership and completion evidence to distinguish Workflow IDs from legacy WorkIntake IDs without creating a synthetic intake. Candidate validation, bounded repair, retry, explicit Operator-decision stop, Dev advance, IntegrationRecord persistence, and typed Workflow closure use the exact Workflow candidate owner.
- Added capability proofs for linked Dev candidate advancement and source-neutral typed completion. No dependencies, migrations, schema changes, or JSON sidecars were introduced.

## Files

Created:

- `src/main/sourceControl/workflowIntegrationService.ts`
- `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-05_IMPLEMENTER_REPORT.md` (this report)

Modified:

- `src/main/agentHarness/repository/integrationGit.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `src/main/planExecution/integrationPolicyProvider.ts`
- `src/main/planExecution/integrationRepairPolicyProvider.ts`
- `src/main/planExecution/researchCompletionService.ts`
- `src/main/planExecution/routedDevelopmentApplicationService.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`
- `src/preload/index.ts`
- `src/shared/integrationCandidateContracts.ts`
- `src/shared/integrationCompletionContracts.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/shared/workflowApplicationContracts.ts`
- `src/shared/workspaceContracts.ts`
- `test/agent-harness/integration-candidate-semantics.test.cjs`
- `test/agent-harness/integration-repair-controller.test.cjs`
- `test/workflow/workflow-execution-application-service.test.cjs`
- `validation/capability-map.json`

Deleted: none. The temporary standalone linked-worktree test was folded into the existing integration candidate suite and its temporary file removed.

## Validation and evidence

- `npm run build` — approved normal Windows lane: pass. Vite reported the existing 511.55 kB chunk advisory.
- Restricted `npm run build` first returned `spawn EPERM`; it was recorded once and rerun in the approved normal Windows lane.
- `node --test test/agent-harness/integration-candidate-semantics.test.cjs test/agent-harness/integration-policy-semantics.test.cjs test/agent-harness/integration-repair-controller.test.cjs test/agent-harness/integration-repair-provider.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/validation/capability-map.test.cjs` — approved normal Windows lane: 38/38 passed.
  - Includes exact Workflow candidate creation/validation/advancement from a linked Dev checkout with no `intakeId`.
  - Confirms the local Dev ref equals the candidate's exact post-advance revision.
  - Preserves conventional checkout candidate, policy, and repair behavior; exercises stale target, validation mutation, conflict/repair bounds, and policy revalidation.
  - Exercises typed source-neutral Workflow close after WorkItem and Phase completion, plus blocked completion with an open WorkItem and no IntegrationRecord creation.
- `node --test test/validation/capability-map.test.cjs` — approved normal Windows lane: 5/5 passed after ordering corrections.
- `npm run validate:plan -- --profile work-item --changes tmp/changes.json` — approved normal Windows lane, preview only: exit 0; the preview selected affected capabilities, required builds, and owned tests. The temporary change set and preview output are ignored under `tmp/` and are not committed.
- `git diff --check` — pass before report creation; it will be rerun on the final staged diff.
- Restricted focused Node test launch first returned `spawn EPERM`; the equivalent focused run passed in the approved normal Windows lane.
- No broad historical routed lifecycle suites, package, release, or Electron launch were run. No live selected Project was integrated; final Dev advancement was proven in the isolated synthetic linked-worktree fixture.

## Git, security, and remaining evidence

- No Git mutations beyond the card checkpoint staging/commit are intended. No push, tag, release, or Main promotion was performed.
- Exact staged diff review and bounded secret/local-path/generated-artifact scan are required before the checkpoint commit.
- Durable report paths are repository-relative. No credentials, machine-local paths, or generated build outputs are intentionally included.
- Remaining Operator validation: run the exact Workflow integration UI against a selected source-backed Current Project if experiential acceptance is desired. The linked-worktree and state transitions have deterministic synthetic evidence; no actual user Project Dev ref was advanced in this implementation pass.
- Blockers/residual risks: direct application service and candidate-engine integration are covered; no Electron launch smoke or visual review was performed. The Vite bundle-size advisory remains unchanged.
- Recommended next task: proceed to WRB04-06 shared-workspace qualification after this checkpoint.
