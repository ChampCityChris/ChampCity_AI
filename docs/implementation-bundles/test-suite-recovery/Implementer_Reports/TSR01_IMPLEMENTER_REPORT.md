# TSR01 Implementer Report

Status: complete; focused proof passes and the Project Planning owner is below the Work Card budget.

## Scope and repository verification

- Card: Work Card TSR01, Decompose Project Planning Mega-Scenarios.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>` before implementation.
- Branch: `dev`, tracking `origin/dev`. The Operator-requested pre-work checkpoint is commit `8cf6127` (`chore: checkpoint test suite recovery baseline`). Remote freshness was not independently fetched.
- No production source, dependency, migration, schema, renderer filesystem access, or archived workflow behavior changed.

## Files changed

Modified:

- `test/project-planning/project-planning-service.test.cjs`
- `test/support/work-intake-fixtures.cjs`
- `validation/capability-map.json`

Created:

- This report.

Deleted: none.

Intentionally not created: replacement production behavior, Session 2 Tester/determination-engine work, JSON workflow sidecars, generated output, branches, worktrees, or additional permanent test files.

## Implementation and proof ownership

The five slow routed/profile scenarios now start from a prepared canonical Project, Work Intake, selected route, and real bound Git branch. The fixture uses the production canonical document writer and the production Work Intake branch-name contract. It removes repeated Work Intake submission, routing-draft promotion, and Operator route-decision replay, which are upstream capabilities and provide no unique Project Planning proof here.

Project Planning profile/kernel scenarios scope a branch-verification mock around calls that do not own Git correctness. The routed Development binding scenario restores the real verifier for its current-checkout rejection. This retains behavioral proof through the production planning kernel, canonical promotion/review, plan parser, and execution binding while avoiding repeated process-heavy Git inspection already owned by source-control tests.

Preserved invariants:

- Research: bounded outcome grammar, no automatic prototype promotion, approved no-implementation closure, explicit new-Intake requirement for later production work, revision instructions, and no manufactured execution binding.
- Infrastructure: operational topology, provisioning/update/rollback, observability, recovery proof, compatibility, excluded product features, and direct/phased choice from evidence.
- Composition: characterize-first behavior, material capability dispositions, bounded adapter/custom-code gaps, all non-code disposition outcomes, and shared Plan structure.
- Shared Plan kernel: direct and phased structures, Operator review, revision freshness, stable Plan identity across revision, stale-source rejection, and invalid topology/dependency rejection.
- Routed Development: exact approved Plan/binding identity, byte idempotence, direct/phased semantics, incompatible legacy/current artifacts, route supersession, current-checkout enforcement, and Issue-route rejection.

The redundant stored-binding `currentHead` mutation replay was removed from this file. Exact checkpoint/head lineage remains owned by the source-control/Work Intake branch proof; this scenario retains the current-checkout rejection relevant to routed Development activation.

## Timing before and after

Before values are from `TEST_SUITE_TIMING_AUDIT_2026-09-21.md`. After values are from the final normal-Windows focused TAP run.

| Scenario | Before | After |
| --- | ---: | ---: |
| Whole file, 28 tests | 476.3 s | 14.807 s |
| Research closure | ~41 s | 0.944 s |
| Infrastructure planning | ~40 s | 0.779 s |
| Composition planning | ~44 s | 0.858 s |
| Shared direct/phased planning kernel | ~77 s | 1.799 s |
| Routed Development direct/phased + Issue incompatibility | ~274 s combined audit attribution | 9.513 s parent; 3.457 s direct, 3.475 s phased, 2.580 s Issue |

No remaining scenario exceeds 30 seconds. The complete owner is below the 60-second acceptance limit.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run build` | Restricted Windows lane | Exit 1: Vite/esbuild `spawn EPERM`; recorded once and not treated as a source failure. |
| `npm run build` | Approved normal Windows lane | Exit 0; TypeScript, Vite production build, and branding copy passed. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="Issue route cannot use Development binding" test/project-planning/project-planning-service.test.cjs` | Restricted Windows lane | Exit 1: Node test worker `spawn EPERM`; rerun in normal lane. |
| Same focused name-pattern command | Approved normal Windows lane | Exit 0, but the nested name did not select a top-level test (`0` selected); diagnostic only. |
| `node --test --test-reporter=tap --test-concurrency=1 test/project-planning/project-planning-service.test.cjs` | Approved normal Windows lane | First diagnostic interrupted after Research 35.613 s and Infrastructure 29.106 s exposed repeated Git verification as the remaining cost. |
| Same whole-file command | Approved normal Windows lane | Intermediate exit 1: 25 passed and 3 failed because mocked verification made stored-head conflict expectations non-operative; corrected by retaining real verification only for the owned checkout boundary. |
| Same whole-file command | Approved normal Windows lane | Intermediate exit 0: 28/28 passed in 36.525 s; routed Development parent was 31.250 s, prompting removal of redundant stored-head replay. |
| Same whole-file command | Approved normal Windows lane | Final exit 0: 28/28 passed in 14,806.8895 ms; slowest parent 9,512.7769 ms. |
| `node -e "const { loadCatalog } = require('./scripts/validation/catalog.cjs'); ..."` | Restricted source/schema lane | Exit 1 on the pre-existing catalog reference to deleted `test/agent-harness/git-mutation-boundary.test.cjs`; TSR05 owns that disposition. No TSR01 metadata error was reported before the exact-inventory failure. |
| `node -e "const fs = require('node:fs'); const { validateInventoryFields } = require('./scripts/validation/catalog-schema.cjs'); ..."` | Restricted source/schema lane | Exit 0; changed record validated with 28 tests, 14,807 ms, and `git: true`. |
| `node --check test/project-planning/project-planning-service.test.cjs` | Restricted syntax lane | Exit 0. |
| `node --check test/support/work-intake-fixtures.cjs` | Restricted syntax lane | Exit 0. |
| `git diff --check` | Read-only Git lane | Exit 0. |

Skipped by card: `npm test`, `test:full`, full-supported-platform, and unrelated suites. Full catalog validation remains intentionally deferred to TSR05 because changing the deleted Git monolith disposition in TSR01 would violate sequential card scope.

## Git, security, and residual risk

- The Operator authorized a commit after this card. Its hash is pending at report creation and is reported in the task handoff; the report will not be amended solely to add its own commit hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed.
- Focused staged-diff secret, concrete local-path, and generated-artifact scans are required immediately before commit. No secret, credential, token, private key, `.env` content, generated output, or concrete local-machine path is intentionally persisted.
- Operator manual validation: none required for this non-visual test-recovery card.
- Residual risk: full catalog integrity remains red until TSR05 dispositions the baseline-deleted Git mutation monolith. The next task should be TSR02, preserving sequential execution.
