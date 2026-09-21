# TSR02 Implementer Report

Status: complete; both focused owners pass below their 60-second budgets.

## Scope and repository verification

- Card: Work Card TSR02, Decompose Work Card Planning and Intake Mega-Scenarios.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>` before implementation.
- Branch: `dev`, tracking `origin/dev`; TSR01 starting point was commit `c31597c`. Remote freshness was not fetched.
- Production workflow behavior, dependencies, migrations, schemas, and large-inventory logic were not changed.

## Files changed

Modified:

- `test/support/work-intake-fixtures.cjs`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/work-card-intake/work-card-intake-service.test.cjs`
- `validation/capability-map.json`

Created: this report. Deleted: none.

Intentionally not created: new permanent test owners, production compatibility paths, JSON workflow sidecars, generated output, branches, or worktrees.

## Implementation and slow-scenario disposition

Added `seedPreparedApprovedRoutedWorkPlan`, which starts at the nearest valid downstream boundary: canonical Project/Intake/selected-route state, a real bound branch, reviewed assessment and Plan, and the routed execution binding. It uses the production canonical writer, planning kernel, Plan validation, review, and binding implementation. It omits replay of Work Intake submission, advisory routing, and Operator route-decision persistence, which these Work Card owners do not own.

The fixture scopes a branch-verification mock around downstream semantic assertions. Git correctness remains independently owned; these scenarios continue to prove canonical lineage, Plan/binding identity, source revisions, and stale evidence behavior.

| Former slow scenario | Disposition | Durable proof retained |
| --- | --- | --- |
| Routed Work Items reuse Formal planning/report review (~160 s) | Rewritten on prepared approved routed Plan/binding fixture. | Candidate eligibility, dependency barrier, Formal Work Card promotion/review, reserved report lifecycle, Approved report return without false completion, conflicting active candidate, direct ownership, no legacy Phase artifacts, stale Plan rejection. |
| Work Item decomposition/topology correction (~94 s) | Rewritten on prepared selected-route fixture with branch verification isolated. | Explicit Operator review, revision request/staleness, transactional failure rollback, lineage-preserving sibling replacement, dependency validation, direct-to-phased correction atomicity, Plan history, stable Intake/route identity, no legacy execution. |
| Routed phased eligibility/lineage barriers (~76 s) | Rewritten on prepared phased Plan/binding fixture. | Genuine Phase barrier, ineligible dependent Work Item, Phase-owned artifact paths, missing/wrong lineage rejection, no premature Formal Work Card, no legacy Phase artifacts. |
| Work Card Intake direct/phased artifact scope (~56–60 s each) | Both subcases rewritten on prepared approved routed Plan/binding fixture. | Legacy path compatibility, direct versus genuine-Phase ownership, exact routed roots/identities, invalid Phase/Plan rejection, revision invalidation, addressing without workflow writes. |

No scenario was removed. Unique assertions remain behavioral and continue through production modules.

The dedicated `routed projection shares one fresh inventory across large Work Item and document sets` test was not modified or merged. It remains an isolated 4.908-second performance contract.

## Timings

Before values are from the recovery Work Card/audit; after values are from the final normal-Windows focused runs.

| Owner/scenario | Before | After |
| --- | ---: | ---: |
| Whole Work Card Planning owner | ~337 s | 14.053 s |
| Routed Formal planning/report review | ~160 s | 3.342 s |
| Work Item decomposition/topology correction | ~94 s | 2.551 s |
| Routed phased eligibility/lineage | ~76 s | 1.595 s |
| Isolated large-inventory projection | ~4.9 s | 4.908 s |
| Whole Work Card Intake owner | ~117 s | 3.449 s |
| Direct artifact-scope subcase | ~56–60 s | 1.361 s |
| Phased artifact-scope subcase | ~56–60 s | 1.363 s |

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-concurrency=1 test/work-card-planning/work-card-planning-service.test.cjs` | Approved normal Windows focused lane | Exit 0; 17/17 passed in 14,052.5979 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/work-card-intake/work-card-intake-service.test.cjs` | Approved normal Windows focused lane | Exit 0; 9/9 passed in 3,448.134 ms. |
| `node -e "const fs = require('node:fs'); const { validateInventoryFields } = require('./scripts/validation/catalog-schema.cjs'); ..."` | Restricted source/schema lane | Exit 0; both changed records validated with current counts, measured durations, and Git dependency. |
| `node --check test/support/work-intake-fixtures.cjs` | Restricted syntax lane | Exit 0. |
| `node --check test/work-card-planning/work-card-planning-service.test.cjs` | Restricted syntax lane | Exit 0. |
| `node --check test/work-card-intake/work-card-intake-service.test.cjs` | Restricted syntax lane | Exit 0. |
| `git diff --check` | Read-only Git lane | Exit 0. |

The two focused owners were launched concurrently because they use independent temporary workspaces. No full repository suite/profile was run, per card. Full catalog validation remains blocked by the baseline-deleted Git mutation monolith assigned to TSR05; TSR02 validated its changed records directly and did not broaden scope.

## Git, security, and residual risk

- The Operator authorized a commit after this card. Its hash is pending in this artifact and is reported after commit without amending the commit solely for its own hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed.
- A focused staged-diff secret, concrete local-path, generated-artifact, and whitespace scan is required before commit. No sensitive or machine-specific material is intentionally persisted.
- Operator manual validation: none; this is deterministic non-visual test recovery.
- Residual risk: full catalog integrity remains red until TSR05 dispositions the already deleted Git mutation owner. Recommended next task: TSR03.
