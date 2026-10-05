# WSF20-REPAIR13 Implementer Report

Repair Card: WSF20-REPAIR13, parent WSF20, defect WSF20-D32. Approved repository root verified as `<PROJECT_REPO>/Dev` using Git and `AGENTS.md`. Executed sequentially after REPAIR12 checkpoint `42446d161b53beff67454da3b5d7172cd6470baf` on `dev`. Configured origin is the repository GitHub remote. Local origin/dev comparison before this checkpoint: 0 behind, 323 ahead; no fetch or push performed.

## Implementation and evidence

Exact Implementer mutation intent now comes from the approved WorkItem affected paths: non-empty requires mutation/checkpoint; empty requires neither, while source-backed identity retains its current revision. Source-neutral plans still reject repository paths. Both planning boundaries now permit an approved empty path scope on a source-backed Workflow. Source-backed execution still requires a prepared exact checkout.

No-mutation Implementer runs use the existing App Server read-only sandbox contract and no writable roots. Before finalization, the application checks source HEAD, binding revision, tracked changes and untracked files. Unauthorized edits, including edits without a file-change event, are attributed to the exclusive exact attempt and rejected/restored through existing bounded controls. Successful semantic implemented completion with a clean unchanged revision creates no implementation SourceCheckpoint and reports checkpoint not-required. Mutation-required enforcement and checkpoint creation remain unchanged.

A shared read-only eligibility check validates the latest completed ImplementationAttempt, its immutable successful ImplementationRecord, reserved and current approved empty path plans, contract fields, context versions, revision and absence of checkpoint links. Recovery also verifies the managed checkout, branch, repository common directory, HEAD and clean status. Valid existing semantic attempts project as completed/checkpoint-not-required without a new attempt, result replacement or SQL repair. Running finalization cannot be projected as completed prematurely. Stale or ambiguous source context is inspection-required.

Both runtime Tester preflight and durable TesterResult creation accept the exact successful no-mutation implementation at its unchanged ready SourceBinding revision. Tester stays source-backed; no test changes retain candidateRevisionId at that revision. Permanent Tester changes still use the existing independent test-only checkpoint and revision advance. Recovery recognizes that legitimate Tester checkpoint without inventing an implementation checkpoint. Phase aggregate evidence also accepts the reserved unchanged implementation revision without a required implementation checkpoint.

Extended existing owners with two previously uncovered regression scenarios: source-backed no-mutation execution/reopen/Tester/unauthorized-write/drift boundaries, and completed Greenfield no-mutation navigation to Review & Validation without replacement or read mutations. Existing owners retain mutation-required failure, checkpoint, source-neutral, repair and navigation proof.

## Files and scope

Modified:
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardBuilding/codexTesterExecutionService.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`
- `src/shared/projectState/projectStateService.ts`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`

Created this report. No deletions, schema changes, migrations, fake checkpoints, new dependencies, runtime sidecars or R12 UI changes. Unrelated Forgejo hotfix files and existing untracked bundle documents were intentionally not modified or staged. All execution fixtures use synthetic temporary project containers; no live project database or workflow record was edited.

## Validation

All child-process validation used the normal Windows lane after R12 established the restricted-lane spawn EPERM limitation.

- `npm run typecheck`, restricted lane: exit 1 during implementation; fixed an incorrect new sandbox literal by using existing readOnly support and corrected the read-port type. Final build owns the passing TypeScript proof.
- `npm run build`, normal Windows lane: three diagnostic runs, each exit 0. No additional dependencies installed. Existing bundle-size warning remains non-blocking.
- `node --test test/work-card-building/codex-implementer-execution-service.test.cjs test/workflow/workflow-execution-application-service.test.cjs`, normal Windows: initial exit 1, 42/43 passed; new fixture exposed and led to correction of the two obsolete source-backed empty-scope planning guards.
- `node --test --test-name-pattern="source-backed no-mutation" test/work-card-building/codex-implementer-execution-service.test.cjs`, normal Windows: diagnostic fixture corrections for completion API arguments and order-independent immutable record comparison; final focused run exit 0, 1/1 passed.
- `node --test --test-name-pattern="source-backed no-mutation" test/work-card-building/codex-implementer-execution-service.test.cjs test/phase-planning/phase-planning-service.test.cjs`, normal Windows: exit 0, 2/2 passed before adding the permanent Tester-change extension.
- `node --test test/work-card-building/codex-implementer-execution-service.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/source-control/semantic-checkpoint-service.test.cjs test/source-control/structured-workflow-checkpoint.test.cjs test/project-state/tester-state-mapping.test.cjs test/phase-planning/phase-planning-service.test.cjs test/renderer/greenfield-shell-composition.test.cjs`, normal Windows: exit 1, 78/79 passed. Permanent Tester checkpoint was still running at the new fixture's three-second polling limit under concurrent Git load; expanded the bounded fixture deadline to 30 seconds and bounded final owner execution concurrency.
- `npm run validate:static`, normal Windows: exit 0, one fresh production build and 11/11 static tests passed. Receipt run `cc108e0d-8ca2-4b48-b6c5-6683158fa446`, sourceStable=true.
- `node --test --test-concurrency=2 test/work-card-building/codex-implementer-execution-service.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/source-control/semantic-checkpoint-service.test.cjs test/source-control/structured-workflow-checkpoint.test.cjs test/project-state/tester-state-mapping.test.cjs test/phase-planning/phase-planning-service.test.cjs test/renderer/greenfield-shell-composition.test.cjs`, normal Windows, final required-owner run: exit 0, 79/79 passed, none skipped/cancelled, 118.7 seconds. Coverage includes Implementer, Tester execution, workflow application, source-state/checkpoints and Greenfield navigation/composition. This wider owner run exceeds the ordinary affected advisory budget; no proof was dropped.
- `git diff --check`: exit 0. Exact attributable staged diff reviewed; bounded secret/local-path/generated-artifact safety scan completed before commit.

No release qualification, packaging, live Codex integration or live visual acceptance claimed; those are outside these cards. Tests use deterministic adapters through production services, SQLite reopen and synthetic managed Git checkouts. Existing renderer loader listener and fixture Git line-ending warnings remain non-blocking.

## Checkpoint and Operator audit

Required bounded checkpoint: `WSF20-R13 support source-backed no-mutation WorkItems`. Commit hash pending at report creation and reported after commit; no amend solely for hash insertion. Only attributable source, tests and this report staged; no push, merge, release or unrelated Git mutation.

Remaining Operator acceptance: restart/refresh/reopen the current live no-code WorkItem; verify its existing completed attempt routes to Tester / Review & Validation, no implementation checkpoint recovery is requested, no new attempt is created and the source revision remains unchanged. R12 also awaits live visual inspection of tabs/footer/failure clarity. Automated proof establishes the resolver and recovery behavior on synthetic projects, not the observed state of the live attempt. No implementation blocker remains. Stop for Operator audit of both sequential cards.
