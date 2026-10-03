# RWS06I-REPAIR02 Implementer Report

## Scope and repository verification

Repair Card: RWS06I-REPAIR02, lifecycle-boundary defect. Verified the primary repository root as `<PROJECT_REPO>` (the Dev checkout), branch `dev`, remote `origin` targeting ChampCityChris/ChampCity_AI. Initial worktree contained only the Operator-supplied untracked Repair Card. No unrelated changes were present. No branch, remote, push, merge, or release changes are planned.

## Defect and implementation

Both source-neutral completion and source-backed integration called `closeProjectLifecycle()`, retiring the persistent Project when its non-repeatable Project Creation Workflow finished. Normal Current Project resolution then lost its identity, including the authority fence's active-Project lookup.

Modified production paths:

- `src/shared/projectState/projectStateService.ts`: removed both Project-close calls and the now-unreachable helper; exact Workflow closure and all existing eligibility, identity, version, Phase, WorkItem, Validation and integration guards remain.
- `src/main/workflow/structuredCloseAdvanceService.ts`: removed the requirement that terminal Project Creation also have a closed Project.
- `src/main/workflow/structuredCloseReadProjection.ts`: compatibility completion derives from the closed Project Creation Workflow alone. The existing `projectClosed` projection property denotes Project Creation closeout completion; no new Project status was added.

Modified existing test owner `test/phase-planning/phase-planning-service.test.cjs`: extended its lifecycle scenario through both source-neutral completion and real Git source checkpoints, application integration checks, linked Dev advancement and source-backed Workflow closure. The neutral branch retains dependent WorkItems, dependent Phases, human Criterion disposition and Phase Repair coverage. The source-backed branch uses one Phase and one WorkItem to isolate integration closure without unrelated multi-candidate evidence behavior.

The same test proves exact Project record equality before/after (including no closedAt or record-version transition), no Project closedAt state-change event, normal selectedCurrentProjectId identity, structured authority, canonical read/write fence rejection, inventory reload, terminal history reopening, ensureProjectCreationWorkflow retaining the exact identity, duplicate creation rejection, direct Feature start and optional WIR resolution on the same Project.

`validation/capability-map.json` updates this owner's Git/process resource declarations and complementary proof relationships to existing Workflow completion, integration and inventory owners. No permanent test file or dependency was added. Existing Workflow application, execution, registration, routing, canonical fence and integration production consumers are unchanged. No schema, migration, completion status, retirement mechanism, replacement Project or Markdown authority was created.

Created this report. The supplied Repair Card is included in the checkpoint; four Markdown hard breaks were changed to backslash hard breaks to satisfy the staged whitespace check without altering scope. No files deleted except the unreachable helper within its existing source file. Temporary manifests and receipts remain ignored under `tmp/`.

## Validation evidence

All commands run from `<PROJECT_REPO>`. Restricted Node test execution returned spawn EPERM once; equivalent proof was rerun in the approved normal Windows lane. No sandbox failure is counted as proof.

- `npm run build` (normal Windows): exit 0 before fail-before proof and after production repair; TypeScript, Vite renderer and runtime assets passed.
- `node --test --test-name-pattern='SQL Close Advance' test/phase-planning/phase-planning-service.test.cjs` (normal Windows): fail-before exit 1, original implementation produced `closed` where corrected expectation required `active`. Final focused run exit 0, 1 lifecycle scenario covering both modes, approximately 34.6 seconds.
- Intermediate fixture failures exposed missing accepted affected paths, source-backed deterministic Repair policy, candidate-specific evidence freshness, and the expected next boundary for a single WorkItem. These were corrected or bounded within the test fixture; no production scope was broadened. Catalog intermediate formatting/ownership failures were corrected before successful preview.
- `npm run validate:plan -- --profile repair --changes tmp/rws06i-r02-changes.json` (Windows): exit 0, exact seven changed paths, 62 selected files. Preserved capability IDs: workflow-application-service, project-workflow-state-facade, phase-execution-workflow. Preview receipt: `tmp/rws06i-r02-plan.json`.
- `node --test test/workflow/workflow-application-service.test.cjs test/project-state/project-workflow-facade.test.cjs` (normal Windows): exit 0, 29 tests passed, approximately 29.2 seconds; receipt `tmp/rws06i-r02-focused.txt`.
- First `npm run test:repair -- --changes tmp/rws06i-r02-changes.json` (normal Windows): exit 1; run `03c7d909-72fe-46a0-9438-99acc6281a4d`, production build passed, sourceStable true, 56 of 62 files passed, approximately 204 seconds. The lifecycle fixture integration failed only under the executor temporary-root nesting. Shortening its temporary prefix and enabling fixture-local Git core.longpaths resolved that difference; a focused canonical executor run passed (1 scenario, approximately 34.9 seconds). First receipt: `tmp/rws06i-r02-repair-receipt.json`. Final exact-path rerun: exit 1; run `cb2b36cf-3da0-4cc7-a7c3-e5bbf139c6bf`, sourceStable true, production build passed, 57/62 files passed, 446/468 assertions passed (22 failed), approximately 275.1 seconds. The modified lifecycle owner passed all 9 tests, including both completion branches. Five wider owners below remain non-green. Final receipt: `tmp/rws06i-r02-repair-final.json`.
- `git diff --check` and `git diff --cached --check`: final exit 0 after correcting the supplied card hard-break trailing spaces.

No full/release qualification, packaging, Electron launch, external-network integration or visual acceptance was run; none is required by this bounded repair. Source integration proof uses real isolated temporary Git fixtures and a checked local integration policy, not an external repository.

## Broader failures outside this repair

The first profile also found unrelated Toolbox namespace/repository status contract mismatches, six execution-completion fixtures requesting unavailable deterministic ValidationCatalog proof for source-neutral work, managed-source adoption candidate Git failures, and all six existing Workflow integration fixtures failing candidate creation under executor nesting. These paths and mechanisms are outside this card. Do not broaden this repair to fix them. `node --test test/source-control/workflow-integration-service.test.cjs` (normal Windows) passed all 6 existing integration families, exit 0, approximately 229.1 seconds; receipt `tmp/rws06i-r02-integration-focused.txt`. This isolates their profile failure to execution context; it does not turn the failed profile into a pass. The final profile failures remain: `test/agent-harness/repository-io-hardening.test.cjs` (1), `test/agent-harness/reserved-toolbox-namespace.test.cjs` (2), `test/project-state/execution-completion.test.cjs` (6), `test/source-control/managed-project-source.test.cjs` (7), and `test/source-control/workflow-integration-service.test.cjs` (6). No pre-repair baseline execution of those wider failures is claimed.

## Safety, checkpoint and return path

Exact staged diff inspected. Bounded added-line scan found no secret signatures or concrete local-machine paths; staged paths contain no dependency/generated artifacts. No unrestricted filesystem access or canonical fence weakening was introduced. Local `dev` was 279 commits ahead and 0 behind the available `origin/dev` reference before this checkpoint; remote was not fetched or pushed. Task-scope checkpoint authorized by the Repair Card, message `RWS06I-R02 preserve active Project after Project Creation completion`; hash pending at report creation (reported after commit without amendment solely to insert its hash).

Implementation and required checkpoint are complete; hash is pending in this committed report to avoid a self-referential amendment. Return to RWS06 final Architect source review / acceptance. The composed repair profile is incomplete for acceptance because of the five wider failing owners; route those failures to their existing owners. Focused repair, inventory, authority and direct source-integration evidence passed. No new architecture phase or approval gate is introduced. No genuine visual judgment is introduced by this repair; Architect acceptance remains the next workflow step.
