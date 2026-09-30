# WRB02-03 Implementer Report

## Scope and repository

- Repository root: verified as the approved repository for this card; durable paths below are repository-relative.
- Card: Work Card WRB02-03, Move WIR Architect Routing and Operator Handoff onto Structured Project State.
- Branch: `dev`; remote status before checkpoint: `origin/dev`, ahead by 113 commits.
- Worktree: began clean after the WRB02-02 checkpoint.

## Files changed

- Modified: `src/main/main.ts`, `src/main/projectState/projectWorkflowStateFacade.ts`, `src/main/sourceControl/structuredWorkflowCheckpointService.ts`, `src/main/workIntake/structuredWorkIntakeService.ts`, `src/preload/index.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/WorkIntakeWorkspace.tsx`, `src/shared/projectState/projectStateService.ts`, `src/shared/workspaceContracts.ts`, `test/project-state/work-intake-routing.test.cjs`, `test/renderer/work-intake-routed-workspaces.test.cjs`, `test/renderer/workflow-hub-shell.test.cjs`, `test/workflow/workflow-application-service.test.cjs`, and `validation/capability-map.json`.
- Created: `src/main/workflow/structuredWorkRoutingIpc.ts`, `src/main/workflow/structuredWorkRoutingService.ts`, `src/renderer/app/StructuredWorkRoutingWorkspace.tsx`, and `src/shared/structuredWorkRoutingContracts.ts`.
- Deleted: none.
- Intentionally not created: WIR Markdown/branch authority, WIR SourceBaseline/SourceBinding/SourceLine, a Greenfield WIR route, target-specific planning, or target source materialization.

## Implementation and evidence

Added a Current Project routing service bound to the selected Project ID and exact Work Intake/WIR identities. Architect drafts use the established output runtime and embedded browser handoff. SPS renders a bounded non-authoritative intake projection; promoted Markdown remains projection evidence. RouteAssessment promotion carries the Architect submission ID for idempotency and records Work Intake version plus optional managed Dev HEAD freshness.

The Operator can accept, override to a different supported route, or request a revision. Revision decisions keep the Work Intake and WIR open, create no target, and flow into the next prepared Architect instruction. Final accept/override resolves optional Dev HEAD before entering the SPS transaction, then records the route Decision, creates one independent substantive Workflow (and source baseline/binding when applicable), writes `routes_to`, and closes the exact Work Intake and WIR atomically. The renderer refreshes inventory and opens the returned exact Workflow ID. Structured Work Intake no longer offers branch ownership or source preparation controls.

Focused proof covers both in-memory and SQLite Project State, assessment correlation deduplication, revision requests, idempotent handoff retry, independent accepted/overridden targets, source and non-source Projects, intake and Dev staleness, unavailable-source assessment and failed preflight atomicity, lazy target source shape, exact Hub navigation, six route choices, and structured intake presentation.

## Validation

- `npm run build` — normal Windows lane, exit 0. TypeScript, Vite renderer bundle, and branding asset copy passed; Vite emitted the existing >500 kB chunk advisory. A restricted attempt returned documented `spawn EPERM` during esbuild startup and was rerun in the normal Windows lane.
- `node --test --test-force-exit --test-reporter=spec test/project-state/work-intake-routing.test.cjs` — normal Windows lane, exit 0; 8/8 passed.
- `node --test --test-force-exit --test-reporter=spec test/workflow/workflow-application-service.test.cjs` — normal Windows lane, exit 0; 6/6 passed.
- `node --test --test-force-exit --test-reporter=spec test/work-intake/structured-work-intake-capture.test.cjs` — normal Windows lane, exit 0; 7/7 passed.
- `node --test --test-force-exit --test-name-pattern="structured Work Intake|structured WIR workspace" --test-reporter=spec test/renderer/work-intake-routed-workspaces.test.cjs` — normal Windows lane, exit 0; 2/2 card-specific renderer assertions passed. The broader file was started but interrupted after its first 11 cases because it retained a background handle; its completion result is not claimed.
- `node --test --test-force-exit --test-reporter=spec test/renderer/workflow-hub-shell.test.cjs` — normal Windows lane, exit 0; 12/12 passed after updating the exact WIR identity assertion.
- `npm run validate:plan -- --profile work-item --changes tmp/wrb02-03-validation-changes.json` — preview passed; selected 104 tests and a production build, estimated 834803 ms.
- `npm run test:affected -- --changes tmp/wrb02-03-validation-changes.json` — normal Windows lane run `e5941cd7-37c9-4c4e-b50b-a8b732108822`, duration 511642 ms, failed. The build step passed. Failure evidence included source-control fixtures that create Project records without the required Current Project registration, a workflow materialization assertion, and the Hub assertion that was subsequently corrected and passed in the focused rerun. These broader failures are not claimed as passes; the focused card suites above pass.
- `git diff --check` — passed before checkpoint.
- No launch smoke, external integration, or Operator experiential acceptance was performed or claimed.

## Git, safety, and remaining work

- Required card checkpoint commit: pending at report authoring; this report is included in the WRB02-03 checkpoint.
- Secret, local-path, and generated-artifact scan: intended changes contain no secrets, concrete local paths, temporary validation input, or generated output. The ignored validation change set and preview remain under `tmp/`; renderer test temporary directories were removed.
- Production code does not import tests, planning records, archive history, or generated output. Main owns the projection write; preload exposes bounded exact-ID calls.
- Remaining Operator manual validation: visual review of the two-column routing surface and the accept/override transition into a routed Workflow instance.
- Residual validation risk: the broad affected receipt remains failed for the fixture/assertion issues listed above; the focused routing, intake, service, and Hub proof is green.
- Recommended next task: proceed to WRB02-04 after this checkpoint.