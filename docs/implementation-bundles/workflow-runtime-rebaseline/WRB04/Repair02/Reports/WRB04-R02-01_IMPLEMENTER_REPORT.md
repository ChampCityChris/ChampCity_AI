# WRB04-R02-01 Implementer Report

**Card:** WRB04-R02-01 — Restore Architect WorkItem Execution-Contract Authority
**Approved repository root:** Verified against the repository worktree before edits.
**Branch / remote:** `dev`, tracking `origin/dev`; ahead by 156 commits before this checkpoint.
**Starting checkpoint:** `3d4399e563665afbd38426416d12a84989a51470`.
**Checkpoint:** Pending at report creation; one attributable commit will contain this report and the bounded repair.

## Implementation summary

- Added backward-compatible optional `implementationBoundaries`, `affectedPaths`, and `proofIntent` fields to the canonical WorkItem body/registry.
- Added typed exact WorkItem execution-plan acceptance through application service, IPC, and preload. It checks current Feature/Issue Workflow and WorkItem identity/version, work state, prior implementation/Tester/Validation/checkpoint evidence, active Repair children, source mode, bounded lists, and normalized safe repository paths. It revises only the selected WorkItem and leaves it pre-execution.
- Added shared Workspace Architect handoff preparation with exact Workflow/WorkItem/version, objective, accepted solution, WorkItem and solution Criteria, Phase, dependencies, scope/constraints, source mode and bounded source identity. The UI collects structured bounded plan fields and requires accepted planning before decomposition or Implementer start.
- Kept the existing atomic typed decomposition path; replacements have no inherited execution plan and therefore require their own planning.
- Exact Implementer contracts now require and include the accepted execution plan, include WorkItem and accepted-solution Criteria, and incorporate plan content into the digest. Source-neutral contracts carry no repository path scope.
- Source-backed App Server file-change attribution now checks every observed path against the accepted exact path or directory prefix. Out-of-plan changes block checkpoint creation and surface inspection evidence.
- Repair WorkItems use the same plan acceptance boundary.

## Files

Modified:

- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`
- `src/preload/index.ts`
- `src/renderer/app/WorkflowExecutionWorkspace.tsx`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/workflowApplicationContracts.ts`
- `src/shared/workspaceContracts.ts`
- `test/renderer/workflow-hub-shell.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/workflow/workflow-execution-application-service.test.cjs`

Created: this report.
Deleted: none.
Intentionally not created: a second Plan engine, a second decomposition algorithm, an approval entity, a migration rewrite, or a JSON sidecar.

## Validation evidence

All executed proof ran in the normal Windows lane unless noted.

| Command | Result |
|---|---|
| `npm run build` | Passed. TypeScript, Vite renderer, and branding asset copy completed. Existing Vite advisory: renderer chunk exceeds 500 kB. Initial sandbox invocation returned `spawn EPERM`; reran once in the normal Windows lane and passed. |
| `node --test test/project-state/execution-completion.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/workflow/workflow-application-service.test.cjs test/project-state/work-intake-routing.test.cjs test/renderer/workflow-hub-shell.test.cjs test/renderer/work-intake-routed-workspaces.test.cjs test/validation/capability-map.test.cjs` | Passed: 92 tests, 0 failed. Includes Project State, exact application/IPC, WIR convergence, renderer, and capability-map proof. |
| `node --test --test-name-pattern='Feature and Issue use the same exact-Workflow|SQLite reopen restores exact ready|shared execution projection IPC|exact source-backed and source-neutral WorkItems|shared execution Workspace binds pending' test/workflow/workflow-execution-application-service.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/renderer/workflow-hub-shell.test.cjs test/validation/capability-map.test.cjs` | Passed: 6 selected tests, 0 failed. Covers exact identity, durable reopen, plan IPC, renderer gate, and source-scope checkpoint behavior. |
| `node --test --test-name-pattern='exact source-backed and source-neutral WorkItems' test/work-card-building/codex-implementer-execution-service.test.cjs` | Passed: 1 selected test, 0 failed. In-scope source changes checkpoint; an observed same-checkout path outside the plan blocks checkpointing. |
| `npm run validate:plan -- --profile work-item --changes tmp/wrb04-r02-01-validation-changes.json --preview` | Passed as preview; resolved the changed paths and produced the work-item validation plan. The temporary manifest was removed. |
| `git diff --check` | Passed. |

A broader initial diagnostic run exposed legacy fixtures that started unplanned WorkItems. Those fixtures were updated to accept plans first; the final focused proof runs above passed. No external integration or interactive visual acceptance was claimed.

## Git, safety, and remaining evidence

- Git mutation is limited to the single card-required checkpoint; no push, merge, rebase, or release action is in scope.
- Exact staged diff review and bounded secret/local-machine-path/generated-artifact scans are required immediately before commit.
- Durable report paths are repository-relative. No secrets or local-machine paths were added.
- No Operator manual validation is required by this bounded card. R02-02 remains unread and unstarted until this checkpoint is verified.
- Remaining risk: Architect handoff preparation copies exact bounded context and the Operator transfers the Architect response into the structured fields; this card does not introduce a separate Architect conversation runtime.
- Recommended next task after the checkpoint: read and execute WRB04-R02-02 only.
