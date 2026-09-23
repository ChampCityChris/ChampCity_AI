# WIR23-REPAIR03C-REPAIR03 Implementer Report

## Outcome and repository evidence

Repair Work Card **WIR23-REPAIR03C-REPAIR03 — Restore Routed Integration Test Budget** completed the requested ownership split and eliminated repeated upstream Research planning replay, but the Research integration owner remains above the card's hard runtime ceiling. Assertions pass; timing acceptance does not. This report therefore returns the card with a measured residual performance blocker rather than claiming completion.

- Verified the approved repository root and Git top-level as `<PROJECT_REPO>`.
- Card type and identifier: Test Architecture Repair Work Card `WIR23-REPAIR03C-REPAIR03`.
- Branch: `dev`, tracking `origin/dev`, 15 commits ahead at validation time.
- Starting/current committed head: `7722874`.
- `origin` is configured. No fetch or remote-freshness claim was made.
- The starting worktree contained unrelated and predecessor-card changes. They were preserved.

## Before and after ownership

Before:

- `test/characterization/routed-integration-focus.test.cjs` owned one Plan integration scenario and three Research scenarios.
- Each Research scenario replayed Architect draft preparation, output ingestion, and Operator review before reaching the routed-integration boundary.
- The latest predecessor report measured the combined owner at 511.893 seconds for 6 TAP tests.

After:

- `test/characterization/routed-integration-focus.test.cjs` owns only the recovered Plan integration sentinel: clean target, conflicting target preservation, bounded repair, validation, atomic target advancement, Work Intake checkout preservation, and absence of phase manufacture.
- `test/characterization/routed-research-integration-focus.test.cjs` owns one ordered Research integration scenario.
- `test/support/research-integration-scenarios.cjs` seeds the nearest accepted Research completion boundary with a real temporary Git repository, real target and Work Intake branches, current canonical project/Intake/routing evidence, a stable approved no-Plan Assessment identity, and no Plan, routed-development binding, or IntegrationCandidate.
- The fixture uses the production canonical document writer and production planning path/source-digest helpers. It deliberately does not execute Architect preparation, Architect output ingestion, or Operator Research review; those semantics remain with the planning owner.
- The fixture exposes a bounded revision helper that preserves the stable Assessment identity while advancing canonical revision and body evidence.

The initial fixture has no unrelated workspace changes. Its approved canonical Research evidence is the exact pending evidence that routed integration checkpoints before candidate construction; the first candidate then observes a clean committed incoming checkout.

## Unique Research assertions retained and consolidated

The single ordered Research scenario preserves proof for:

- initial Research `ready` state with no candidate or checkpoint;
- a real Research lifecycle checkpoint before candidate construction;
- deterministic validation failure retaining a real `validation-failed` candidate and leaving the target unchanged;
- an exact aborted candidate remaining blocked while completion and source baseline are unchanged;
- changed completion no longer being blocked by stale aborted history;
- changed completion remaining blocked by an active retained candidate;
- a newer terminal record not hiding the older active candidate;
- explicit abort recovery and absence of remaining active candidate records;
- subsequent real validation, candidate advancement, target advancement, and `integration-complete` projection for the current completion;
- changed completion after integrated history returning normal eligibility without an abort-required reason;
- stable Research completion identity across revisions;
- no Plan, Work Item/Phase tree, or routed-development execution binding.

Candidate construction, merge, validation, abort, and final target advancement remain real. The scenario uses one repository and four candidate checkouts to preserve the exact-abort, active-vs-terminal legacy inventory, validation-failure, and final-success states without ambiguous record mutation.

## Attributable files

Created:

- `test/characterization/routed-research-integration-focus.test.cjs`
- `test/support/research-integration-scenarios.cjs`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03C-REPAIR03_IMPLEMENTER_REPORT.md`

Modified:

- `test/characterization/routed-integration-focus.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created or changed: production `src/**`, dependencies, migrations, validation schema, performance/soak classification, budgets, packaging, generated output, or archived workflow material. The Operator-provided Repair Card was read as the governing source and not modified.

## Capability-map changes

- The Plan owner now records one top-level scenario and the measured 15.312-second file duration.
- The new Research owner records one consolidated top-level scenario, the existing integration lane, and the same `bounded-child-process`, `isolated-git-fixture`, and `temp-filesystem-isolated` resource vocabulary as the Plan sentinel.
- Added one primary behavior, `release-and-git-operations/research-routed-integration-candidate-lifecycle`, for the distinct Research proof boundary.
- The measured 560.985-second Research duration is recorded explicitly with its blocker status. It was not hidden, reclassified, or used to raise any threshold.
- Capability-map validation proves complete executable-test coverage and exactly one primary proof per behavior.

## Required validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; TypeScript check passed. |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs` | Restricted Windows | Exit 1 with documented test-runner `spawn EPERM`; not counted as a source failure or pass. |
| Same Plan characterization command | Approved normal Windows | Exit 0; 3 TAP tests passed, 0 failed/skipped. Runtime 15.312 seconds. Execution telemetry: 92 bounded Git operations and 2 candidate checkouts. Plan acceptance `<60s` passed. |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-research-integration-focus.test.cjs` | Restricted Windows | Exit 1 with documented test-runner `spawn EPERM`; not counted as a source failure or pass. |
| Same Research characterization command | Approved normal Windows | Exit 0; 1 TAP test passed, 0 failed/skipped. Runtime 560.985 seconds. Execution telemetry: 9,766 bounded Git operations, 0 fixture-shell Git operations after instrumentation, and 4 candidate checkouts. Research `<180s` hard-ceiling acceptance failed. |
| `node --test --test-reporter=tap --test-concurrency=1 test/validation/capability-map.test.cjs` | Approved normal Windows | Exit 0; 5 tests passed, 0 failed/skipped. Runtime 0.112 seconds. The restricted lane was not retried because the same Node test runner had already produced the documented `spawn EPERM` condition twice in this validation pass. |

No full regression, packaging, Desktop launch, visual acceptance, performance/soak profile, or external integration validation was run because the card explicitly forbids full regression and those surfaces are outside this test-architecture repair.

## Git, security, and local-path safety

No product-repository Git mutation was authorized or performed: no branch, stage, commit, push, merge, rebase, tag, reset, clean, restore, stash, or worktree operation occurred outside temporary synthetic test repositories. The required real Git mutations were confined to those disposable fixtures.

No secrets, credentials, concrete local-machine paths, generated output, dependency state, archive runtime imports, or unrestricted filesystem access were introduced. No production source changed.

## Blocker and return path

The ownership correction reduced the Plan owner from the reported combined 511.893-second predecessor run to 15.312 seconds and removed all repeated Architect preparation/review replay from Research integration. The consolidated Research owner nevertheless measured 560.985 seconds, well above the 180-second hard ceiling. Its execution telemetry attributes the remaining cost to 9,766 bounded production Git operations across four real candidate checkouts, not to upstream planning lifecycle setup.

Per the card's mismatch/stop policy, no additional proof was removed, mocked, reclassified, or assigned a larger budget. Return `WIR23-REPAIR03C-REPAIR03` for Architect review with the residual production Git-operation amplification as the blocking evidence. A follow-up architecture decision is required before further work because reducing those operations without weakening the mandated real candidate states may require production behavior or a new fixture seam outside this card's allowed boundary.
