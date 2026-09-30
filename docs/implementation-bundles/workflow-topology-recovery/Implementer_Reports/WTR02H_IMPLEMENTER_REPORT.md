# WTR02H Implementer Report

## Execution record

- Repository root verification: confirmed the current directory is the approved ChampCity_AI repository root.
- Card: Work Card WTR02H, “Move Source Graph Identity from Work Intake to Workflow.”
- Starting SHA: `af3c3237061e561b66ed5a024878ec3a47262126`.
- Branch and remote: `dev`, tracking `origin/dev`; branch was ahead by 93 commits at start. No push performed.
- Git working tree was clean at start.

## Files changed

- Modified `src/shared/sourceLifecycleContracts.ts`.
- Modified `src/main/sourceControl/sourceGraphService.ts`.
- Modified `src/renderer/app/SourceControlWorkspace.tsx`.
- Modified `src/renderer/app/sourceGraphLayout.ts`.
- Modified `test/source-control/source-graph-projection.test.cjs`.
- Modified `test/renderer/source-control-graph-layout.test.cjs`.
- Modified `validation/capability-map.json` for the added focused proof and updated proof locator/duration.
- Created this report.
- No files deleted. No additional production files or compatibility aliases were created.

## Implementation and evidence

SourceGraph now exposes `workflowIds`, `workflowBindings`, and `workflowBindingsTruncated`. Each binding carries current `workflowId`, immutable `sourceAnchorWorkflowId`, deterministic provider `lineId` or null, Workflow title/type/state/lifecycle, baseline/current revisions, lineage checkpoint kinds, and latest lineage integration state. Work Intake IDs, route labels, Work Intake admission, and legacy Markdown identity synthesis were removed from the Source Graph projection. With no structured authority, Git topology remains available with empty Workflow metadata.

For each SourceBinding whose SourceBaseline belongs to the requested repository, projection validates binding and baseline Workflow lineage, then requires exactly one current substantive Workflow in that lineage (excluding superseded and voided records and WIR). Completed current Workflows remain included by default; `includeCompleted: false` removes completed/cancelled Workflow metadata while preserving physical branches. Checkpoints and IntegrationRecords are aggregated across every Workflow ID in the selected lineage and remain associated with revisions only through selected lineages.

The focused fixture proves a routed Workflow and direct-started Workflows share the same graph contract. Three source-backed Workflows appear concurrently on distinct branches. One Workflow is superseded: the graph selects its successor, retains the predecessor as source anchor, associates the physical source line with the successor only, and aggregates predecessor checkpoint/integration history. Serialized graph output contains neither the WorkIntake ID nor the WIR Workflow ID. The missing-authority test proves topology remains valid with no source owner IDs. A completion-filter test proves semantic filtering does not remove provider branch topology.

Renderer selection is keyed by exact current Workflow ID and only survives refresh while that ID remains present. Workflow labels, status, type, identity, state, revisions, checkpoints, and integration are rendered; source anchor identity is shown when it differs. Graph geometry and integrated fast-forward links continue to use the same layout behavior with Workflow bindings.

## Test accounting

- Existing Source Graph projection tests were modified/extended for the new contract and the three-line/supersession/missing-metadata/read-only proofs.
- Existing renderer layout proof was modified for Workflow fixtures and language checks.
- One permanent test was added for `includeCompleted: false`, a distinct acceptance behavior that the prior projection test did not exercise: completed Workflow metadata must disappear while its mechanical provider line remains.
- `validation/capability-map.json` was updated to reflect the new test count and proof scope.
- No tests were consolidated or retired.

## Validation

- `npm run build`: initial restricted run failed at Vite config loading with `spawn EPERM`; reran in the normal Windows lane and passed. TypeScript and Vite production build completed. Vite emitted the existing large-chunk advisory (554.43 kB renderer JS); no build errors.
- `node --test test/source-control/source-graph-projection.test.cjs`: initial restricted run failed with test-runner `spawn EPERM`. Normal Windows run passed: 4 tests, 4 pass, 0 fail. The one intermediate normal-lane run exposed a fixture variable reference error; corrected and reran successfully. Final run also passed after adding an explicit assertion that the predecessor ID is absent from `sourceLine.workflowIds` (14,562 ms).
- `node --test test/renderer/source-control-graph-layout.test.cjs`: initial restricted run failed with test-runner `spawn EPERM`; normal Windows run passed: 4 tests, 4 pass, 0 fail. Final run passed after static source assertions for removed Work Intake language and absence of source mutation controls.
- `node --test test/project-state/source-semantic-references.test.cjs`: initial restricted run failed with test-runner `spawn EPERM`; normal Windows run passed: 8 tests, 8 pass, 0 fail.
- `node --test test/source-control/workflow-source-materialization.test.cjs`: initial restricted run failed with test-runner `spawn EPERM`; normal Windows run passed: 5 tests, 5 pass, 0 fail.
- `npm run validate:plan -- --profile work-item --changes tmp/changes.json`: passed; exit 0. The plan selected the exact eight changed paths and their mapped/dependent capabilities.
- `npm run test:affected -- --changes tmp/changes.json`: both exact-path work-item runs completed with failed status. The final-file run took 354,421 ms. The planner selected a broad dependency set from the shared source lifecycle contract/capability map. Two failures were reported: `test/source-control/source-lifecycle-package.test.cjs` failed earlier on a Work Intake readiness expectation (`unprepared` vs `ready`), and `test/work-intake/greenfield-source-bootstrap.test.cjs` failed two readiness expectations (`unprepared` vs `blocked`). These are the card-deferred post-H bootstrap/topology assumptions; the first suite is explicitly deferred by §31. All H-owned focused suites passed independently.
- `git diff --check`: passed; exit 0.

## Acceptance and boundaries

Acceptance search over the SourceGraph definition, source graph service, Source Control workspace/layout, and focused tests finds no retired Source Graph fields `workIntakeIds`, `workBindings`, or `workBindingsTruncated`. The `workIntakeId` fields elsewhere in `sourceLifecycleContracts.ts` are the explicitly deferred `SourceReadiness` contract and were not changed. No WTR03+ work, Project topology changes, Workflow Hub, execution-kernel work, ownership changes, or Git/provider mutations were started.

Initial Git actions: read-only inspection only. The card authorizes one attributable checkpoint commit after validation and safety review; commit hash will be reported after that commit without amending this report to insert its own hash.

## Security and local-path safety

No secrets were read or written. Durable report paths are repository-relative. The implementation adds no dependency, integration, schema migration, alias, or concrete machine path. Generated build output remains outside the committed source change set.

## Remaining work

Inspect the staged diff and safety scan, then create exactly one card-local checkpoint commit. No manual visual validation is required by the card; no external integration evidence is claimed.
