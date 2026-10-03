# RWS06-REPAIR01 Implementer Report

## Scope and repository

The approved primary Dev checkout was verified against its AGENTS.md and active revised Repair Card. Branch `dev`; remote `origin` is configured. No push or release operation. The revised card establishes the application handoff defect; no production UUID workaround, state reconciliation, or speculative click RCA is part of this repair.

## Implementation

`App.refreshWorkflowStage(id)` awaits the existing exact `getWorkflow(id)` service, verifies the returned ID, replaces the parent Workflow summary, and returns terminal Workflows to their Workflow type/list. It accepts only identity, never a destination. `StructuredWorkflowWorkspace` closes over that identity and forwards the same awaited callback to Intake, exact Architect/Planning, and shared Execution. WIR target opening retains its existing `openWorkflow` path; the opened target then receives this same progression callback.

Intake awaits Architect preparation and the callback. Architect preparation of Planning reloads the parent instead of locally impersonating a persisted stage. Plan approval reloads the parent and mounts shared Execution from SQL `work-item-map`; the Planning component no longer renders an accepted Work Map. Research no-Plan closure reloads the exact terminal Workflow and returns to the list. Execution notifies the parent only for persisted stage/lifecycle changes, including closure; ordinary edits and refreshes remain local. Greenfield retains its existing projection callback and terminal return behavior.

Dispatch uses the shared Architect workspace mapping and explicit execution workspaces. Unknown and mismatched active values fail closed for all six families, including Feature and Issue.

The extended service matrix exposed a distinct production defect: Architect and accepted Plan BoundedSolutions were both included in the Execution projection. Research rejected this as ambiguous, and other families reported an ambiguous accepted Plan. The fail-before Research matrix failed twice at `getExecutionProjection` with `Research requires an accepted implementation Plan before execution; no-Plan outcomes cannot enter execution.` The execution application service now selects only solutions governed by the existing planning-acceptance Decisions for existing-project Workflows and excludes criteria owned by unaccepted Architect solutions. Existing cardinality/acceptance gates remain. Greenfield Phase directions are preserved. No SQL transition service, schema, migration, lifecycle bypass, or durable state rewrite was changed.

## Files

Modified production files:

- `src/renderer/app/App.tsx`
- `src/renderer/app/StructuredWorkflowWorkspace.tsx`
- `src/renderer/app/WorkflowIntakeWorkspace.tsx`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`
- `src/renderer/app/WorkflowExecutionWorkspace.tsx`
- `src/renderer/app/workflowPlanningDispatch.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`

Extended stable owners `test/renderer/workflow-hub-shell.test.cjs` and `test/workflow/workflow-planning-ipc.test.cjs`; updated `validation/capability-map.json`. Created this report. The active revised Repair Card is included with the checkpoint. No new test file, dependency, generated artifact, or migration is committed. Concurrent TVA10-HF01 Agent Harness files are excluded.

## Proof

The service matrix covers all six families in direct and WIR-linked modes: canonical Intake, exact saved/approved Intake, exact Architect workspace, approved Architect review, persisted Planning, accepted `work-item-map`, and shared Execution topology with one accepted solution/Decision. The fixture preserves source-neutral coverage and a focused SQL-native Migration case with an unprepared SourceBinding and unchanged Intake identity/version. Existing typed Research no-Plan proof is retained.

Behavioral renderer proof invokes the actual App component and its callback through all six direct/routed target pipelines. It drives Intake -> Architect -> Planning -> shared Execution, checks exact reloads, and proves local state does not stand in for a persisted transition. Additional proofs reject a mismatched returned ID, exercise terminal Research and Execution closure into the list, and verify within-stage Execution refresh does not reroute the parent. Dispatch proof covers exact front-half stages, known execution stages, unknown values, and mismatched Architect workspaces.

Existing WIR target creation/handoff, Greenfield Phase authoring, and shared Execution tests are reused. Coverage was extended in existing owners because prior tests separately proved services and surfaces without exercising their complete application progression boundary.

## Validation receipts

Final production build/static checks and focused progression/preservation proof passed; wider repair qualification is blocked by the failures below. Validation uses the approved normal Windows lane after the restricted Node test runner returned `spawn EPERM`. The initial exact-path planner passed after correcting catalog ordering. Initial focused proof passed 54/54 before adding accepted Execution topology assertions; those assertions exposed the Research defect above.

The interrupted pre-revision repair run returned receipt `5e97f55f-835d-4d62-8a0f-6844d07fe76f`, failed, 349745 ms, `sourceStable=false` / `source-changed-during-validation`; it is not final qualification. Its failures included Agent Harness, execution completion, project rail, managed source, and workflow integration owners. The final run is recorded below separately.

| Command | Lane | Result |
| --- | --- | --- |
| `node --test test/renderer/workflow-hub-shell.test.cjs` (initial diagnostic) | Restricted | Exit 1, `spawn EPERM`; normal Windows lane used thereafter. |
| `npm run build` | Normal Windows | Exit 0. |
| `node --test test/renderer/workflow-hub-shell.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/renderer/work-intake-routed-workspaces.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/phase-planning/phase-planning-service.test.cjs` | Normal Windows | 85 preservation tests passed; matrix initially failed to parse because its newly added assertion block was duplicated. Corrected and rerun below. |
| `node --test test/workflow/workflow-planning-ipc.test.cjs` | Normal Windows | Exit 0, 20/20 passed after fixing the accepted-Plan projection defect and duplicate test declaration. |
| `npm run validate:plan -- --profile repair --changes tmp/rws06-changes.json` | Normal Windows | Exit 0; exact 12 changed paths, four preserved/affected capabilities, 72 selected files. Receipt/plan retained at `tmp/rws06-plan-final.json`. |
| `npm run test:repair -- --changes tmp/rws06-changes.json` | Normal Windows | Exit 1; receipt `6f0c1466-4234-482a-99cc-bcd53f055e49`, 344166 ms; build passed; 603 tests, 580 passed, 23 failed, none skipped/unavailable. All five focused owners passed. Source stability failed while concurrent TVA10-HF01 work changed source/HEAD. Receipt retained at `tmp/rws06-repair-final.json`. |
| `node --test test/renderer/workflow-hub-shell.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/renderer/work-intake-routed-workspaces.test.cjs` | Normal Windows | Exit 0, final exhaustive dispatch and actual-App progression proof: 66/66 passed, including 20 matrix/service tests. Log `tmp/rws06-progression-final.log`. Together with the 39 Phase/shared-Execution tests above, 105 focused/preservation tests passed. |
| `npm run validate:static` | Normal Windows | Exit 0; receipt `77b30920-7afd-45b3-a557-2d8672d81314`, 12679 ms, fresh production build and 11/11 static tests passed, `sourceStable=true`. Receipt `tmp/rws06-static-final.json`. |
| `git diff --check` | Repository shell | Exit 0. |

All receipts/logs are ignored local validation output, not committed artifacts. One diagnostic change-set generator attempted a restricted child `git` process and returned `spawnSync git EPERM`; it was replaced by direct repository-shell Git reads. Initial catalog preview rejected unsorted behavior identities; metadata was sorted and preview passed. No MCP test-toolbox execution was used; the repository-authoritative CLI was available throughout.

The six wider failing owners were also failing in the pre-projection-fix repair receipt: `test/agent-harness/repository-io-hardening.test.cjs` (1), `test/agent-harness/reserved-toolbox-namespace.test.cjs` (2), `test/project-state/execution-completion.test.cjs` (6), `test/renderer/project-rail-presentation.test.cjs` (1), `test/source-control/managed-project-source.test.cjs` (7), and `test/source-control/workflow-integration-service.test.cjs` (6). Agent Harness work was concurrently repaired under TVA10-HF01; its checkpoint `4fccb92` is separate. Unchanged Project State/Project rail and managed-source/integration failures remain qualification blockers. Existing source-backed vertical integration assertions returned `failed` instead of `integrated` before and after this bounded fix; no passing integration evidence is claimed. The full repair receipt is not acceptance, and no full repository suite was substituted or unrelated tests weakened.

## Safety, checkpoint, and return

Checkpoint pending: `RWS06-R01 converge existing-project workflow progression`. Exact staged diff reviewed. Bounded secret/local-path/generated-artifact scan passed. Initial staged whitespace check found three Markdown hard-break spaces in the untracked Operator card; trimmed them without changing requirements. Final staged `git diff --check` passed. No live-provider or visual acceptance claimed. Implementation is ready for RWS06 Architect source review. Final acceptance criterion 10 remains blocked by wider failures/source instability in the repair profile. Recommended next work is bounded diagnosis/qualification of those existing owners after concurrent changes settle; Operator experiential validation may confirm the repaired active-screen progression. No additional approval gate is introduced.
