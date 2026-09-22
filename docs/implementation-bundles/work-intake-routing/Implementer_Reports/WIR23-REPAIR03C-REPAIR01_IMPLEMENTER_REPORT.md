# WIR23-REPAIR03C-REPAIR01 Implementer Report

## Outcome and repository evidence

Repair Work Card **WIR23-REPAIR03C-REPAIR01 — Retain Candidate Until Abort When Completion Changes** is implemented. Routed integration now locates the newest retained candidate by stable logical completion identity, then checks all exact completion fields. A changed revision, fingerprint, or source path therefore leaves a non-aborted candidate visible and blocks fresh candidate construction until explicit abort.

- Verified the approved repository root and Git top-level as `<PROJECT_REPO>`.
- Card type and identifier: Repair Work Card `WIR23-REPAIR03C-REPAIR01`.
- Branch: `dev`, tracking `origin/dev` and starting 14 commits ahead.
- Starting committed head: `435a0be` (`WIR23-REPAIR01-REPAIR02` separation commit).
- `origin` is configured. No fetch or remote-freshness claim was made.
- The starting worktree retained unrelated user changes from earlier Work Intake Routing, validation, and test-suite-recovery work. Neither second-card production nor test owner had a pre-existing worktree edit, and unrelated changes remained untouched.

## Logical discovery and exact freshness

`routedIntegrationService.ts` now applies two deliberately different comparisons:

- logical identity: exact equality of completion `kind`, `routeDecisionId`, and `completionId`;
- exact completion: logical identity plus exact `revision`, `fingerprint`, and `sourcePath`.

Candidate inventory remains owned and ordered by `IntegrationCandidateService.list()`. Routed query filters that existing newest-first inventory by logical identity and selects the first record, preserving deterministic candidate ordering.

For an aborted record, the existing target/source-baseline check now also requires the complete six-field exact completion before retaining the exact-aborted `not-ready` projection. An older aborted completion revision/fingerprint or changed source/target baseline does not block the current state.

For a retained non-aborted record whose exact completion differs, query returns read-only `not-ready` state with the current completion kind, current fingerprint, current checkpoint evidence, the stale retained candidate, and the bounded abort-required reason. It does not invoke `candidate.current(record)`, mutate the candidate, abort it automatically, or construct a second candidate.

## Attributable files

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03C-REPAIR01_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/planExecution/routedIntegrationService.ts`
- `test/characterization/routed-integration-focus.test.cjs`

Deleted: none.

Intentionally not created or changed: new permanent test files, candidate schemas/contracts, `integrationCandidateService.ts`, candidate hashing, Integration Repair policy, target advancement, routed workflow actions, renderer controls, Work Planning behavior, lifecycle checkpoint behavior, dependencies, migrations, validation metadata, packaging, or committed generated output. The Operator-authored Repair Card was used as the governing source and was not modified by this pass.

## Regression evidence

The focused Research scenario creates and approves a no-Plan Assessment, then uses a deterministic failing validation check to retain a `validation-failed` candidate. The target branch remains at its original commit. The candidate records Research completion revision 1 and its SHA-256 fingerprint.

The test rewrites the same canonical Assessment with the same Intake, route decision, Assessment identity, approved disposition, and no-Plan outcome, while increasing the Assessment/completion revision from 1 to 2 and changing the canonical-byte SHA-256 fingerprint. Because fixture identities are intentionally random, the two 64-hex digest values are captured from the retained candidate and current projection rather than hard-coded; the proof asserts they differ and asserts the current fingerprint remains stable through abort.

The changed projection is `not-ready`, exposes the original candidate ID, retains the `validation-failed` candidate, has no current checkpoint commit, and requires abort before constructing a fresh candidate. `integrate()` with the current changed fingerprint rejects while that candidate exists. Explicit abort then produces a `ready` Research projection with the changed fingerprint, no candidate, and no current checkpoint, which is the normal eligibility state for the subsequent Research checkpoint/new-candidate path. The target commit is asserted unchanged after failed validation, after completion mutation, and after abort.

The same test file also passed its existing successful Research integration and clean/conflicted Plan integration cases. The candidate-service semantics suite passed unchanged, preserving immutable candidate identity, exact `current(record)` checks, validation behavior, repair behavior, and target advancement rules.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; TypeScript check passed. |
| `.\\node_modules\\.bin\\tsc.cmd` | Restricted Windows, direct-test prerequisite | Exit 0; refreshed ignored `dist` modules used by direct Node tests. |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs` | Restricted Windows | Exit 1 with the documented Node test-runner `spawn EPERM`; not counted as a source failure or pass. |
| Same routed-integration characterization command | Approved normal Windows | Exit 0; 5 tests passed, 0 failed/skipped, including the new retained-candidate scenario and existing Research/Plan cases. Runtime was 305.0 seconds, above the 300-second review threshold, so the budget result is review-required even though all assertions passed. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-candidate-semantics.test.cjs` | Approved normal Windows | Exit 0; 8 tests passed, 0 failed/skipped. |
| `git diff --check -- src/main/planExecution/routedIntegrationService.ts test/characterization/routed-integration-focus.test.cjs` | Restricted Windows, scoped safety check | Exit 0. |
| Bounded concrete-local-path and credential-pattern scan over both attributable modified files | Restricted Windows, scoped safety check | No matches; `rg` returned its expected no-match exit 1. |

No full suite, packaging, Desktop launch, visual acceptance, performance/soak profile, or external-integration check was run, as prohibited by the card. The focused test's above-threshold duration is a validation-budget observation, not an assertion or product failure.

## Git, safety, deviations, and residual risk

The Operator requested sequential completion with commit separation. The first repair is already isolated in `435a0be`; this repair's exact staged diff will be inspected before its own commit. The second commit hash is pending at report creation and will be reported after commit; the report will not be amended solely to insert its own commit hash. No push, merge, rebase, tag, reset, clean, restore, stash, branch, or worktree action is authorized or performed in the product repository beyond the requested commits. Git operations inside synthetic test repositories were fixture behavior only.

No secrets, credentials, concrete local-machine paths, generated output, dependency state, archive runtime imports, or unrestricted filesystem access were introduced. There was no card/repository mismatch or implementation-scope deviation. No manual visual or experiential validation remains for this deterministic candidate-discovery repair. Residual risk is limited to interactions outside the card's bounded suites and the observed focused-suite runtime variability.

## Return path

Return `WIR23-REPAIR03C-REPAIR01` for Architect review after the second separated commit.
