# WSF20-REPAIR19-R01 Implementer Report

Repair Card: WSF20-REPAIR19-R01, follow-up to R19 findings F01/F02.

## Repository and scope

Verified the approved Dev repository root (`<PROJECT_REPO>`), branch `dev`, starting HEAD `fe0c69d28749079f2713aebdd16f83083b4e29a5`. Origin is the repository-configured GitHub remote; remote freshness is unverified. Before checkpoint, locally recorded `origin/dev` is 331 commits behind and zero ahead of this branch. No fetch, push, release, branch/worktree change or live `greenfield_test` SQL, attempt, packet or source mutation was performed. Unrelated untracked Forgejo, MPSI and WSF material remains preserved.

## Confirmed regressions and correction

The existing durable reservation test was extended to invoke the real typed `revision_requested` review before Run. Against the existing R19 build it failed with `Planning revision requires the exact completed unsuccessful ready WorkItem.` The real generated source-backed planning handoff failed the new empty-path guidance assertion against that same build. Source inspection confirms the Repair adapter embeds this handoff directly in its Copy Handoff content; final regression proof reads the adapter's composed `get(...).handoff`.

The handoff now describes `affectedPaths` as authorized mutation intent. Source-neutral work requires empty paths and no source mutation. Source-backed inspection permits empty paths, a verified read-only checkout and R13 checkpoint-not-required. Nonempty approved paths require attributable mutation and a committed checkpoint. The Architect candidate and Operator review own intent; Repair prose, already-correct source or failed results do not imply an automatic change.

The existing revision guard recognizes a current approved prepared reservation with no execution start/result or incompatible evidence. It reuses durable reservation verification and checks the unchanged ready checkout through existing read-only source reconciliation. Unprepared source may remain unprepared when no checkout exists; eligibility never materializes source. Running, stale, successful and checkpoint/evidence-owning cases remain blocked. The completed-unsuccessful R19 branch is retained.

Canonical Implement exposes the existing reason-gated typed review command for eligible prepared attempts. Start exceptions trigger an authoritative refresh before any prepared revision action remains available. Continue to Review stays disabled. SQL navigation resumes the existing Planning/Repair workspace. Replacement ingress and Operator approval remain necessary. Normal typed reprepare abandons the old stale reservation and creates/reuses the current one, preserving historical identity.

The real prepared Refresh regression additionally exposed contention: status and planning eligibility both reuse the existing reservation assertion, whose SQLite transaction acquires the writer lock. Parallel calls from separate connections returned `Project State database is busy`, silently removing the action. Refresh now awaits status before reading planning eligibility. This stays within the existing renderer/main owners and adds no transaction or authority bypass.

## Attributable files

Modified production:

- `src/main/workCardPlanning/structuredWorkItemPlanningService.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`
- `src/renderer/app/WorkCardImplementWorkspace.tsx`

Extended existing test owners:

- `test/workflow/workflow-execution-application-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/renderer/work-card-implement-workspace.test.cjs`

Created this report: `docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR19_R01_IMPLEMENTER_REPORT.md`. Deleted no files. Created no schema, dependency, migration, alternate planning service, authority gate, workflow sidecar or live recovery artifact. Diagnostics and validation scope/receipts remain ignored in `tmp/`.

## Validation

The canonical command `node scripts/validation/cli.cjs preview --profile repair --changes tmp/wsf20-r19-r01-changes.json` exited 0 in the restricted lane. Scope lists all seven attributable paths and explicit preservation capabilities `codex-implementation-runtime` and `semantic-source-checkpoints`. The ignored execution adapter calls the repository's repair planner/executor and restricts scheduling to the nine card/preservation owners. This is bounded proof under the card, not whole-profile acceptance.

`node tmp/wsf20-r19-r01-focused.cjs`, normal Windows lane, exited 1: receipt `287c3a8c-6078-48e4-a615-9d7bd94b0996`, 322624 ms, source stable, production build passed, 126 tests / 123 pass / 3 fail / 0 skip. Failures were the new fixture's blank-reason error matcher, missing model selection, and `ready` assumption for a prepared `planned` Repair. Fixed those test assumptions. Subsequent prepared-source diagnostics corrected the reserved digest expectation and exposed the actual Refresh contention above.

Preservation passed in that receipt: Work Card Planning 3/3, Repair 6/6, validation catalog 5/5, R13 Implementer/Tester 8/8, semantic checkpoints 6/6, structured checkpoints 36/36. Workflow execution had 34 existing passes; Phase Planning had 18 passes, including the completed-partial revision loop, mutation-required committed path, and all five R16-R18 recovery subcases. The phase owner passed actual composed Repair handoff assertions. No unrelated baseline failure was counted as fixed.

Focused diagnostics after the first build:

- `node --test --test-name-pattern='failed Implement refresh' test/renderer/work-card-implement-workspace.test.cjs`: normal Windows / exit 1; missing fixture model prevented Start.
- `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap --test-name-pattern='durable report preparation|failed Implement refresh|no-mutation Review through prepared' test/workflow/workflow-execution-application-service.test.cjs test/renderer/work-card-implement-workspace.test.cjs test/phase-planning/phase-planning-service.test.cjs`: normal Windows / exit 1, 2 pass / 3 fail; renderer and durable typed review now passed, new unprepared-source fixture still expected a null reserved digest.
- `node --require ./scripts/validation/child-cleanup.cjs --test --test-reporter=tap --test-name-pattern='no-mutation Review through prepared' test/phase-planning/phase-planning-service.test.cjs`: normal Windows / exit 1, 2 pass / 1 fail; checkpoint/Validation negatives passed, actual Refresh hid the prepared action.
- `node --require ./scripts/validation/child-cleanup.cjs --test --test-reporter=tap --test-name-pattern='no-mutation Review through prepared$' test/phase-planning/phase-planning-service.test.cjs`: normal Windows / exit 1 with the specific SQLite busy eligibility reason, then exit 0 after sequencing reads (1/1, 21978 ms). This diagnostic uses source-loaded renderer code; final production output requires rebuilding after this source correction.

Final results:

| Exact command | Lane / exit | Receipt / evidence |
| --- | --- | --- |
| `node tmp/wsf20-r19-r01-final.cjs` | normal Windows / 0 | Canonical repair planner/executor, narrowed to the changed renderer owner; final production TypeScript/Vite/assets build passes. Receipt `a80c8728-107e-42cb-8fbc-aa5441078ba5`, source stable, 14998 ms, 8/8 pass, no skips. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap --test-name-pattern='durable report preparation\|no-mutation Review through' test/workflow/workflow-execution-application-service.test.cjs test/phase-planning/phase-planning-service.test.cjs` | normal Windows / 0 | Final built workflow delta plus source-loaded real renderer path: 6/6 pass, no skips, 75619 ms; ignored output `tmp/wsf20-r19-r01-final-delta.tap`. |
| `git diff --check` | restricted / 0 | No whitespace defects. |

Final changed scenarios pass 14/14. These final delta checks supersede the corrected repair-local failures above; unchanged preservation proof remains the initial focused receipt. The initial receipt is still a failed receipt and is not relabeled. The first build was necessary for regression/preservation proof; the final build was necessary because the real prepared-refresh test exposed a production correction afterward. No redundant standalone typecheck or broader profile rerun was performed. The initial 322624 ms run exceeded the advisory repair budget; final bounded checks reduced repeated proof. Existing Vite bundle-size and renderer test-loader listener warnings are advisory.

The restricted diagnostic `node --test --test-name-pattern='durable report preparation' test/workflow/workflow-execution-application-service.test.cjs` exited 1 with `spawn EPERM`; no source assertion ran. The equivalent normal Windows command exited 1 with the confirmed R19 guard regression above. The normal Windows handoff diagnostic `node --test --test-name-pattern='no-mutation Review through mutation' test/phase-planning/phase-planning-service.test.cjs` exited 1 on the expected missing empty-path guidance.

Use the canonical repair planner with every attributable changed path and explicit preservation capabilities; execute a bounded selection of the card's existing owners plus R13/checkpoint preservation. The wider R19 receipt (772 pass / 21 fail / 1 skip) is prior evidence, not this correction's result. Do not rerun or claim the broader profile as green.

## Current behavior proof

The real source-backed WorkItem and Repair Copy Handoff describe both empty-path inspection and nonempty-path mutation. The source-neutral durable reservation test checks the real handoff and typed revision before Run. The source-backed fixture additionally reserves an unprepared WorkItem and reads eligibility without source materialization or SQL state changes.

For the exact approved prepared Repair, canonical Implement's reason-gated action calls the real typed review API and resumes SQL Repair Planning. Reads/Refresh create no attempts or results. The attempt remains unchanged at disposition; semantic candidate ingress submits empty paths and Operator review approves them. Typed reprepare abandons the stale original attempt, whose version-one reservation remains historically readable. The new attempt executes source-backed/read-only, leaves HEAD and checkout unchanged, returns implemented with checkpoint-not-required, reaches canonical Review, and permits the normal independent Tester contract/result.

Negative proofs include blank reason, stale version, wrong WorkItem, renderer read-only inspection, stale reservation, running attempt, successful implementation, mutation-success checkpoint ownership, prepared checkpoint and incompatible Validation evidence. Dirty and redirected checkouts remain unchanged and revision is rejected with a bounded reason. The existing R13 owner proves zero-change mutation-required execution stays blocked and exact attributable mutation requires a committed checkpoint.

## Checkpoint and remaining acceptance

Safety: `node tmp/wsf20-r19-r01-staged-safety.cjs`, normal Windows / exit 0, verified exact seven-file staged attribution, bounded credential/private-key patterns, concrete local paths, generated-artifact exclusion, whitespace and staged/working byte agreement. Exact staged diff inspected before commit. Restage this report's safety result and repeat the scan before checkpoint. Ignored builds, diagnostic scope/receipts, temporary execution adapters and unrelated untracked material remain outside the checkpoint.

Required checkpoint: `WSF20-R19-R01 correct Architect handoff and prepared revision`. Hash pending creation; report actual hash in the chat handoff without amending this report solely to insert it.

Stop for Architect review. Remaining live acceptance belongs to the Operator on the existing failed Repair after Architect code review: inspect Copy Handoff, submit and approve the appropriate contract normally, execute, and confirm R13 Review/Tester behavior. No live-project recovery, push, release, visual acceptance or external integration qualification is claimed.
