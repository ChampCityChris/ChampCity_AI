# WSF20-REPAIR16 Implementer Report

## Scope and repository verification

- Operator-approved Repair Card: WSF20-REPAIR16; parent WSF20; defects D39, D40, D41.
- Verified the primary `Dev` Git repository with `git rev-parse --show-toplevel` before edits. The enclosing Project container is not the Git repository; `Main` was not used for development.
- Branch: `dev`. Starting HEAD exactly matched the card: `a9c885e685f97b8beda3f94c7d7739a82e29b2a6`.
- Remote: configured GitHub `origin`; `dev` has no tracking upstream. Before this checkpoint, cached `origin/dev` was 326 commits behind local `dev`, with no incoming commits. No fetch, push, merge, amend, reset, stash, or live-project SQL edit was performed.
- Preserved pre-existing `toolRegistry.ts` dirtiness, Forgejo/bootstrap documents, and other untracked bundle/card documents. They are excluded from the R16 checkpoint.

## Delivered behavior

The Implement adapter now has a dedicated Start action. It installs the returned execution model immediately, retains unavailable/failed preflight evidence, and starts polling only for a running result. Immediate completion refreshes durable report/navigation context while preserving the returned completed model. Explicit Refresh may reread status; thrown IPC failures retain bounded error presentation and stale-context responses are discarded.

Every source-backed streamed attempt reconciles the final tracked and untracked Git paths before final evidence and checkpoint decisions. Reconciliation verifies the immutable managed checkout anchor, canonical root, shared Git common directory, Workflow branch, reserved HEAD, and current SourceBinding identity/revision. Paths are unique, normalized, bounded to 256 entries and 512 characters each, and checked against approved affected paths. Missing attributable entries or invalid path records in mutation-required file-change telemetry become diagnostic evidence; verified final Git paths supply packet attribution. Unsafe event paths and other attribution errors still reject the attempt; no-mutation runs preserve strict rejection of telemetry errors. Actual unauthorized edits use the existing exact restore path; identity drift fails closed. Successful mutation-required runs checkpoint real changes, advance SourceBinding, and leave the checkout clean. Truly empty final changes remain checkpoint-blocked. R13 no-mutation behavior remains checkpoint-not-required for unchanged source and rejects actual unauthorized edits.

Legacy recovery reconstructs attribution only for the current successful immutable ImplementationRecord/completed ImplementationAttempt pair, current exact approved planning, unchanged reserved planning/source evidence, and nonempty approved dirty Git paths at the reserved revision. It rejects newer/ambiguous owners, unrelated checkpoint ownership, redirected evidence packets, unapproved planning, and source drift. It acquires the existing shared Implementer/Tester mutation lease and rechecks proof under that lease before invoking structured checkpoint creation. It can resume its own exact pending/blocked checkpoint; committed or conflicting checkpoint evidence is not fabricated or replaced. The historical packet, parent record, and parent attempt remain unchanged.

Start preparation detects a dirty managed checkout with exactly one implementation checkpoint gap, recovers that boundary, and then runs normal exact materialization. Generic materialization does not clean arbitrary source. Start calls the typed idempotent preparation command before and after preparation so a stale Repair reservation is abandoned and replaced against the advanced revision, while a matching reservation is reused.

## Files

Created:

- `src/main/sourceControl/workflowSourceReconciliation.ts`
- `docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR16_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/sourceControl/structuredWorkflowCheckpointService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`
- `src/renderer/app/WorkCardImplementWorkspace.tsx`
- `test/renderer/work-card-implement-workspace.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`
- `test/source-control/semantic-checkpoint-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `validation/capability-map.json` (registers the reconciliation helper with its existing checkpoint capability owner)

Deleted: none. Intentionally not created: schema migrations, JSON workflow sidecars, replacement parent records/attempts, dependencies, new permanent test files, or Forgejo/bootstrap changes. Existing stable owners were extended for the previously uncovered Start-result loss, Git-attribution gap, and legacy recovery boundary cases.

## Live-equivalent and preserved proof

`Greenfield stranded parent checkpoint recovers before a stale prepared Repair starts` builds a real Git/SQLite Greenfield lifecycle at R0, with approved mutation-required scope `conformance/phase-1/work-card-01.txt`, one completed successful parent record/attempt, no checkpoint, and a semantic packet without attribution. It creates RequestRepair and an approved Repair with a prepared R0 reservation. Repair Start creates exactly one committed parent checkpoint, links the existing record, advances binding to R1, and reaches a running Codex adapter session on clean source. The stale Repair attempt becomes abandoned and exactly one live replacement reserves R1. Parent record/attempt counts and historical packet bytes stay unchanged. The Repair then changes its approved file without a file-change event, checkpoints it, and leaves source clean.

Additional existing-owner proof covers:

- Start invoked once with a prepared report; returned unavailable failure/retry blocker retained; no immediate Ready status refresh; explicit Refresh rereads status.
- Allowed tracked changes with absent or malformed telemetry produce reconciled packet attribution and committed checkpoints.
- Unreported out-of-scope edits are rejected/restored; changed source identity prevents unsafe restore.
- Implemented with genuinely empty final changes remains blocked for mutation-required work; normal attributed checkpoints retain their behavior.
- R13 unchanged Implementer/Tester completion, restart recovery, and unauthorized edit rejection remain protected.
- Legacy packet with missing attributable paths, exact own pending checkpoint reuse, unrelated checkpoint refusal, newer record/attempt refusal, stale HEAD refusal, and missing current planning approval.
- Immutable baseline checkout reconciliation survives current Workflow succession; semantic checkpoint owner still rejects historical Workflow authority.
- Full SQL Greenfield navigation/Repair lifecycle and workflow execution application owner remain required proof.

## Validation receipts

All commands ran from the primary repository except the explicitly identified read-only baseline export. Normal Windows means the approved nonsandboxed child-process lane. Receipts and exported baseline output are ignored caller artifacts under `tmp/`, not committed runtime or workflow artifacts.

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Restricted Windows | Exit 1: Vite/esbuild `spawn EPERM`, recorded once; not a source failure or pass. |
| `npm run build` | Normal Windows | Exit 0 after the equivalent rerun and subsequent production corrections. Final TypeScript, Vite renderer and asset build passed; existing chunk-size warning remains advisory. |
| `node --test test/renderer/work-card-implement-workspace.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/source-control/structured-workflow-checkpoint.test.cjs` | Normal Windows | Final diagnostic exit 0, 22/22 tests before the final two boundary additions. Intermediate diagnostics exposed an obsolete restore-refusal fixture and generic WorkItem fixture patches; corrected with identity drift and typed/minimal planning/lifecycle commands. |
| `node --test --test-name-pattern='stranded parent' test/phase-planning/phase-planning-service.test.cjs` | Normal Windows | Exit 0, 1/1 live-equivalent Greenfield regression after correcting the fixture's current planning version. |
| `node scripts/validation/cli.cjs preview --profile repair --changes tmp/r16-changes.json` | Restricted Windows/read-only | Exit 0: selected 115 files for R16-attributable changes; unrelated dirty Forgejo work omitted from the change set. |
| `node scripts/validation/cli.cjs run --profile repair --changes tmp/r16-changes.json > tmp/r16-repair-receipt.json` | Normal Windows/composed | Exit 1, source stable, run `79f27829-995d-40b7-b09d-1fcc45e15727`, 689,104 ms. Production build and both static owners passed. All six required R16 owners passed. Across the broader selected scope: 884 tests, 860 passes, 23 failures and 1 skip; zero unavailable/blocked files. Advisory budget: review-required. This receipt precedes the final pending-checkpoint/immutable-anchor refinements and is not represented as a final broad-gate pass. |
| Final eight-owner command below | Normal Windows/final built source | Exit 0: 86 tests, 86 passes, zero failures/skips, 137,615.5562 ms. All required R16 owners and both static owners passed after the final boundary corrections. |
| Baseline direct comparison command below | Normal Windows/read-only exported starting HEAD | Exit 1: 133 tests, 122 passes, 10 failures, 1 skip, 190,215.1065 ms. Thirteen broader failures depend on the composed executor environment. |
| Baseline same-executor comparison below | Normal Windows/read-only exported starting HEAD | Exit 1: source stable; run `a0041d42-d06e-483f-b4f8-1c29d408cbe8`, 127,835 ms; 133 tests, 109 passes, 23 failures, 1 skip. All broader failures and the skip reproduce with identical per-owner counts; zero unavailable/blocked files. |
| `git diff --check`, `git diff --cached --check` and bounded staged safety scan | Primary repository/read-only | Exit 0. Exact 12-file R16 staging allowlist matched; zero whitespace, secret-literal, concrete-local-path or generated-artifact findings. Reviewed the exact staged implementation, test, capability-map and report diffs before committing. |

Final exact owner/static command:

```text
node --test --test-concurrency=2 --test-reporter=tap test/renderer/work-card-implement-workspace.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/source-control/structured-workflow-checkpoint.test.cjs test/source-control/semantic-checkpoint-service.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/phase-planning/phase-planning-service.test.cjs test/app-shell/native-product-identity.test.cjs test/validation/capability-map.test.cjs > tmp/r16-final-focused.tap
```

Baseline comparison: exported the exact starting HEAD with read-only `git archive --format=zip --output=tmp/r16-baseline.zip HEAD`, expanded into ignored scratch output, and built there with the installed toolchain. No Git checkout, branch, worktree, or live SQL state was changed. From that export:

```text
node --test --test-concurrency=2 --test-reporter=tap test/agent-harness/release-toolbox-boundary.test.cjs test/agent-harness/repository-io-hardening.test.cjs test/project-state/execution-completion.test.cjs test/source-control/managed-project-source.test.cjs test/source-control/source-lifecycle-package.test.cjs test/source-control/workflow-integration-service.test.cjs test/work-card-building/codex-runtime-manager.test.cjs > ../r16-baseline-focused.tap
```

The same-executor comparison copied the exact exported/built baseline into an unversioned temporary root, used a junction to the existing installed dependencies, and invoked the repository's `planValidation`/`executePlan` for the seven owners above. The executor ran its own baseline build and isolated temporary directories, matching the composed repair environment. No dependencies were installed. The caller proof script ran as `node tmp/r16-baseline-proof.cjs <BASELINE_EXPORT_ROOT> > tmp/r16-baseline-composed.json`; the concrete scratch root is excluded from this report and source control.

The broader failing owners are release toolbox (2), repository IO hardening (1), execution completion (6), managed project source (7), source lifecycle package (1), and workflow integration (6). The skipped test belongs to Codex runtime manager. Every failure count and the skip reproduce on the exact starting baseline through the same executor. These existing failures are outside R16; the owners were not modified to hide them. The composed broad profile remains failing and is not claimed as a pass.

## Git and security

- Checkpoint message: `WSF20-R16 surface Start failures and recover stranded source checkpoint`.
- Commit hash: pending creation of this report's checkpoint; the actual hash will be returned in the handoff. No amend solely to insert that hash into this committed report.
- Exact staged-diff review and bounded secret, concrete-local-path, generated-artifact, and scope scan passed with zero findings; unrelated dirty work remains excluded.
- Source reconciliation and legacy recovery stay in main-process services. No renderer filesystem access, renderer-authored source identity, arbitrary reset/clean, credential access, or manual product SQL operation was introduced.

## Operator audit and limitations

Automated proof uses real synthetic Git/SQLite workspaces and deterministic Codex adapters. It does not claim a live external Codex session or acceptance of the Operator's current project.

Remaining acceptance: reopen/rebuild the current Repair Implement workspace, press Implement without manually deleting the stranded file, and verify exact parent checkpoint recovery, clean source, advanced binding, refreshed Repair reservation, Running status, and persistent presentation of any Start failure. Ambiguous, out-of-scope, redirected, or drifted legacy evidence remains inspection-required without deletion.

Release/packaging, visual acceptance, live project mutation, and unrelated Forgejo/bootstrap remediation are outside this implementation pass. Recommended next task: Operator audit of this checkpoint and the card's live Repair sequence. Stop after the checkpoint.
