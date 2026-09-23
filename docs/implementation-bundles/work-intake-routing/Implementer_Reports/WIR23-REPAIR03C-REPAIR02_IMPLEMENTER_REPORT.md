# WIR23-REPAIR03C-REPAIR02 Implementer Report

## Outcome and repository evidence

Repair Work Card **WIR23-REPAIR03C-REPAIR02 — Select Active Candidate Across Terminal History** is implemented. Routed discovery now searches the existing newest-first logical-completion inventory for active retained state before considering terminal history. A newer terminal receipt can no longer hide an older active candidate, while stale terminal history no longer blocks changed completion evidence.

- Verified the approved repository root and Git top-level as `<PROJECT_REPO>`.
- Card type and identifier: Repair Work Card `WIR23-REPAIR03C-REPAIR02`.
- Branch: `dev`, tracking `origin/dev`, 15 commits ahead at validation time.
- Starting/current committed head: `7722874`.
- `origin` is configured. No fetch or remote-freshness claim was made.
- The starting worktree contained unrelated user changes. The requested production and characterization files were initially untouched; all unrelated changes were preserved.

## Selection and projection behavior

The active retained status set is exactly:

- `constructing`
- `conflicted`
- `validation-failed`
- `validated`
- `failed`
- `operator-decision`

Terminal history is exactly `aborted` and `integrated`.

After filtering by logical completion identity (`kind`, `routeDecisionId`, and `completionId`), query preserves `IntegrationCandidateService.list()` ordering and selects:

1. the newest active retained record, if one exists;
2. otherwise the newest terminal record that exactly matches all six current completion fields (`kind`, `routeDecisionId`, `completionId`, `revision`, `fingerprint`, and `sourcePath`);
3. otherwise no candidate record.

The existing projection rules then apply unchanged. A selected active record with changed exact completion remains visible as read-only `not-ready` and requires explicit abort. An exact integrated terminal record remains `integration-complete`. An exact aborted terminal record still compares source/target baselines and blocks recreation only while both completion and baseline are unchanged. Stale aborted or integrated records are not selected, and integrated history never emits an abort-required reason.

## Attributable files

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03C-REPAIR02_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/planExecution/routedIntegrationService.ts`
- `test/characterization/routed-integration-focus.test.cjs`

Deleted: none.

Intentionally not created or changed: additional permanent test files, IntegrationCandidate contracts/service, candidate hashing, Integration Repair, target advancement, renderer behavior, Work Planning behavior, lifecycle checkpoint production code, dependencies, migrations, validation metadata, packaging, or committed generated output. The Operator-provided Repair Card was read as the governing source and not modified.

## Legacy-residue and terminal evidence

The characterization uses real `IntegrationCandidateService` state in a synthetic repository. The evidence run generated logical Research completion `assessment-39969e31-4df5-429a-8bc8-5b052424f540` and observed:

- Candidate A: `04a424bef0c5580288cd709da05675907f82db0aabf24cd21fe8f3dc012d01cf`, revision 1, `validation-failed` before routed abort;
- Candidate B: `afe55ddb88d829030213ae6192dfcb52fbdb8195a67d5391f0dac71f7d7333ec`, revision 2, `aborted`;
- current completion: revision 3, fingerprint `97c0aefb57410ba93bf0a7220051c46e4af3043360c2b11f8413ab41920c1e30`.

The inventory assertion proved B sorted newer than A. Query after aborting B exposed A, proving terminal B did not hide active A and that legacy active records are exposed sequentially after the newer record is explicitly resolved. At revision 3 query again exposed A as `not-ready`, retained the current revision-3 fingerprint and checkpoint evidence, required explicit abort, and left the target unchanged. Routed abort of A then left no active record; stale terminal A/B history did not block revision 3, whose projection returned normal Research `ready` eligibility with no candidate.

Bounded controls also proved that an exact current integrated candidate still returns `integration-complete`, an exact current aborted candidate with unchanged source/target baseline remains `not-ready`, and stale integrated history after a Research revision change returns `ready` without an abort-required reason.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; TypeScript check passed. |
| `.\\node_modules\\.bin\\tsc.cmd` | Restricted Windows, direct-test prerequisite | Exit 0; refreshed ignored `dist` modules consumed by direct Node tests. |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs` | Restricted Windows | Exit 1 with documented test-runner `spawn EPERM`; not counted as a source failure or pass. |
| Same routed-integration characterization command | Approved normal Windows | Exit 0; 6 tests passed, 0 failed/skipped. Runtime 511.893 seconds, above the 300-second review threshold; assertions passed but the budget result is review-required evidence for REPAIR03. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="active legacy residue" test/characterization/routed-integration-focus.test.cjs` | Approved normal Windows, bounded evidence rerun | Exit 0; 1 test passed, 0 failed/skipped. Runtime 221.652 seconds. This run captured the generated A/B/completion identities reported above; the temporary diagnostic was removed afterward, restoring the exact test file already exercised by the full required command. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-candidate-semantics.test.cjs` | Restricted Windows | Exit 1 with documented test-runner `spawn EPERM`; not counted as a source failure or pass. |
| Same candidate-semantics command | Approved normal Windows | Exit 0; 8 tests passed, 0 failed/skipped; runtime 21.992 seconds. |
| `git diff --check -- src/main/planExecution/routedIntegrationService.ts test/characterization/routed-integration-focus.test.cjs` | Restricted Windows, scoped safety check | Exit 0. |
| Bounded concrete-local-path and credential-pattern scan over both attributable modified files | Restricted Windows, scoped safety check | No matches; `rg` returned its expected no-match exit 1. |

No full suite, packaging, Desktop launch, visual acceptance, performance/soak profile, or external-integration validation was run because those surfaces are outside this Repair Card. The routed characterization runtime is deliberately reported rather than repaired here, as required by this card.

## Git, safety, and residual risk

No Git mutation was authorized or performed: no branch, stage, commit, push, merge, rebase, tag, reset, clean, restore, stash, or worktree operation occurred in the product repository. Git operations inside temporary synthetic test repositories were fixture behavior only.

No secrets, credentials, concrete local-machine paths, generated output, dependency state, archive runtime imports, or unrestricted filesystem access were introduced. There was no card/repository mismatch or implementation-scope deviation. No manual visual or experiential validation remains for this deterministic discovery repair. Residual risk is limited to behavior outside the two bounded suites and the already-observed routed characterization runtime budget breach owned by REPAIR03.

## Return path

Return `WIR23-REPAIR03C-REPAIR02` for Architect review. Recommended next task: `WIR23-REPAIR03C-REPAIR03` to restore the routed integration test budget without changing this repair's semantics.
