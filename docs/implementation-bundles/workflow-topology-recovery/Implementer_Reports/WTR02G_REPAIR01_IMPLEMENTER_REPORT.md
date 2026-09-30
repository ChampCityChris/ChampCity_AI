# WTR02G Repair01 Implementer Report

## Execution context

- Card: WTR02G Repair01 — Require Current Workflow Ownership for Source Lifecycle Records.
- Verified repository root: the requested ChampCity_AI repository root, confirmed from its `dev` checkout.
- Starting checkout HEAD: `3bc511f0308af3199def22d92922d99f41faf4d8`; the card's implementation checkpoint `f327f87b91879b46a26468cf3f7d025603c1b505` is an ancestor. Branch: `dev`, 91 commits ahead of `origin/dev` at start; remote was present. No unrelated working-tree changes were present.
- Checkpoint commit: pending until the exact staged diff, safety scan, and final checks complete. The report will not be amended solely to add its own commit hash.

## Implementation

The current source owner is the unique Workflow in the requested lineage with `lifecycleState = active`, a substantive workflow type, and a workflow state other than `closed` or `cancelled`. Missing, ambiguous, historical, WIR, or terminal owner IDs fail closed. Project State does not rewrite a caller's supplied ID.

`createSourceCheckpoint()` and `createIntegrationRecord()` now require that exact current ID. The semantic checkpoint API returns `blocked` for an historical or terminal ID before Git mutation or SourceCheckpoint creation. Structured implementation and disposition reject historical IDs before writing their records. Structured integration resolves the historical Work Intake target to its lineage's unique current Workflow and uses that Workflow ID for new canonical IntegrationRecords, existing-record lineage matching, and the owner projection.

The physical source remains anchored by `SourceBaseline.workflowId`: the direct checkpoint proof keeps the baseline owner at Workflow A while the new checkpoint is owned by A'. The source line and checkout stay on A's baseline-derived identity. Work Intake `routes_to` provenance remains pointed at A. No persisted historical lifecycle records were rewritten.

## Files changed

- `src/shared/projectState/projectStateService.ts`
- `src/main/sourceControl/semanticCheckpointService.ts`
- `src/main/sourceControl/structuredWorkflowCheckpointService.ts`
- `src/main/sourceControl/structuredIntegrationService.ts`
- `test/project-state/source-semantic-references.test.cjs`
- `test/source-control/semantic-checkpoint-service.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`
- `test/source-control/structured-integration.test.cjs`
- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02G_REPAIR01_IMPLEMENTER_REPORT.md`

The card's existing suites were extended, including one focused historical-ID test case in the semantic checkpoint suite; no new test files were created. Source Graph identity and IntegrationCandidateRecord intake compatibility were not redesigned.

## Evidence and validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Restricted sandbox | Exit 1 at Vite/esbuild with `spawn EPERM`; recorded once and rerun in the normal Windows lane per repository guidance. |
| `npm run build` | Normal Windows | Exit 0; TypeScript, Vite, and branding asset copy passed. Vite emitted its existing large-chunk advisory. |
| `node --test test/project-state/source-semantic-references.test.cjs` | Normal Windows | Exit 0; 8 passed, 0 failed across in-memory and SQLite Project State. Includes historical/terminal SourceCheckpoint and IntegrationRecord rejection and current successor success. |
| `node --test test/source-control/semantic-checkpoint-service.test.cjs` | Normal Windows | Exit 0; 5 passed, 0 failed. Historical ID blocked before Git mutation; successor committed to the existing baseline-anchored checkout. |
| `node --test test/source-control/structured-workflow-checkpoint.test.cjs` | Normal Windows | Exit 0; 1 passed, 0 failed. Historical implementation and disposition calls rejected; successor accepted; WIR route remains `not-required`. |
| `node --test test/source-control/structured-integration.test.cjs` | Normal Windows | Exit 0; 1 passed, 0 failed. WIR provenance points to A while canonical IntegrationRecord ownership resolves to A'; baseline and source checkout remain anchored at A. |
| `node --test test/source-control/workflow-source-materialization.test.cjs` | Normal Windows | Exit 0; 5 passed, 0 failed. |
| `npm run validate:plan -- --profile work-item --changes tmp/wtr02g-repair01-changes.json` | Normal Windows planner preview | Exit 0; preview selected the exact nine changed paths, including this report, and enumerated the work-item build and affected capabilities. |
| `npm run test:affected -- --changes tmp/wtr02g-repair01-changes.json` | Normal Windows | Final stable run exit 1 after 306,178 ms; owned production build passed. Failures are deferred WTR03C bootstrap/topology behaviors listed below. |
| `git diff --check` | Repository checkout | Exit 0; no whitespace errors. Git reported only its line-ending conversion notice for the extended Project State test. |

An initial affected run overlapped an edit to the structured integration test and therefore also reported a temporary assertion that expected an unsupported materializer rebinding behavior. That assertion was removed, and the focused structured integration suite passed afterward. The final stable affected run no longer reports that failure.

Deferred failures from the final affected receipt:

- `test/source-control/source-lifecycle-package.test.cjs`: legacy fixture expected a ready Work Intake source binding but observed `unprepared`; routed to WTR03C Project topology/bootstrap ownership.
- `test/work-intake/greenfield-source-bootstrap.test.cjs`: two assertions in the incompatible partial Dev recovery case expected `blocked` but observed `unprepared`; routed to WTR03C bootstrap ownership.

These failures do not occur in WTR02G Repair01's focused proofs. No WTR02H behavior was changed.

## Git and safety

- Git status was clean before implementation; only the eight expected production/test files and this required report are in scope.
- No dependency, schema, migration, SourceBaseline, Source Graph, topology, or candidate-record changes were made.
- No secrets, credentials, concrete machine paths, or generated build outputs are intentionally included in the report or source diff.
- Exact staged diff was reviewed; staged whitespace, local-path, credential-pattern, and generated-artifact scans passed. The required checkpoint commit is the remaining Git action.
- Remaining Operator manual validation: none for the card's deterministic acceptance criteria. Return to the Repair Card workflow for Architect review; stop before WTR02H.
