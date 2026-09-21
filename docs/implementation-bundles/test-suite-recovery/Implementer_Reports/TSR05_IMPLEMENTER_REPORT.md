# TSR05 Implementer Report

Status: complete; the deleted Git mutation monolith remains retired, every current obligation has a focused permanent owner, and the ValidationCatalog exactly covers the executable tests.

## Scope and repository verification

- Card: Work Card TSR05, Disposition the Deleted Git Mutation Monolith.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev`; TSR04 starting point was commit `8821fc8`. Remote freshness was not fetched.
- The deleted aggregate was inspected from Git history at the parent of the baseline checkpoint. It was not restored.
- No production source, dependency, migration, schema, or compatibility behavior changed.

## Files changed

Created:

- `test/agent-harness/git-toolbox-local-operations.test.cjs`
- `test/agent-harness/git-toolbox-remote-operations.test.cjs`
- `test/agent-harness/git-toolbox-tag-operations.test.cjs`
- `test/agent-harness/source-checkpoint-boundary.test.cjs`
- `test/agent-harness/source-control-service-boundary.test.cjs`
- `test/agent-harness/work-intake-branch-boundary.test.cjs`
- `test/support/git-mutation-fixtures.cjs`
- this report

Modified:

- `validation/capability-map.json`

Deleted in this card: none. `test/agent-harness/git-mutation-boundary.test.cjs` was already deleted in the Operator-approved baseline checkpoint and intentionally remains absent.

Intentionally not created: a replacement aggregate, Session 2 Tester machinery, production compatibility behavior, JSON workflow sidecars, dependencies, branches, worktrees, or generated output.

## Behavior-to-owner disposition

| Historical behavior | Permanent owner | Disposition |
| --- | --- | --- |
| Generic source completion checkpoints include only attributed files, require the Intake branch, separate remote failure, and retain exact receipts | `source-checkpoint-boundary.test.cjs` | Preserved with current source and lifecycle checkpoint semantics. |
| Git dispatch and mutation modules do not import workflow decision services | `git-toolbox-local-operations.test.cjs` | Preserved as static architecture proof. |
| Work Card/Repair approval ignores an obsolete `Authorized Git Mutations` prose section | none | Retired as history-only acceptance for the removed Git-authorization-document mechanism; current Operator authority is repository policy, not parsed Work Card prose. |
| All five bounded Git toolbox mutations work without a planning corpus | `git-toolbox-local-operations.test.cjs` | Preserved. |
| Branch inspection, switching, dirty/detached rejection, and bounded history expose real evidence | `git-toolbox-local-operations.test.cjs` | Preserved. |
| Fetch plus fast-forward follows the configured upstream without merge commits and rejects divergence | `git-toolbox-remote-operations.test.cjs` | Preserved. |
| Hotfix merge into main, forward merge into diverged dev, and safe merged-branch deletion | `git-toolbox-local-operations.test.cjs` | Preserved. |
| Merge conflicts are reported and aborted without resolution or history rewrite | `git-toolbox-local-operations.test.cjs` | Preserved. |
| Annotated release tag creation, verification, push, and overwrite rejection | `git-toolbox-tag-operations.test.cjs` | Preserved. |
| Exact annotated/lightweight remote tag deletion occurs remote-first and preserves other refs/history | `git-toolbox-tag-operations.test.cjs` | Preserved. |
| Remote tag deletion rejection preserves local evidence and supports retry | `git-toolbox-tag-operations.test.cjs` | Preserved. |
| Local-only and both-absent tag deletion are safe and idempotent | `git-toolbox-tag-operations.test.cjs` | Preserved. |
| Remote-success/local-failure tag deletion recovers without force | `git-toolbox-tag-operations.test.cjs` | Preserved. |
| Uncorroborated and mismatched remote tags cannot be deleted | `git-toolbox-tag-operations.test.cjs` | Preserved. |
| Dirty state, malformed tag names, unsafe push destinations, and mirror remotes block deletion | `git-toolbox-tag-operations.test.cjs` | Preserved. |
| Tag deletion retains exact schema, OAuth, workspace, and Git-backed gates | `git-toolbox-tag-operations.test.cjs` | Preserved. |
| Push and `integrate_to_dev` reject divergence without force, merge, rebase, or reset | `git-toolbox-remote-operations.test.cjs` | Preserved. |
| Git toolbox OAuth, workspace registration, Git-backed, action, and parameter gates | `git-toolbox-local-operations.test.cjs` | Preserved. |
| Application source-control operations return attributable sanitized receipts and enforce containment/ref safety | `source-control-service-boundary.test.cjs` | Preserved as an explicit new catalog behavior. |
| Work Intake branch binding selects an exact base and fails closed before persistence | `work-intake-branch-boundary.test.cjs` | Preserved as an explicit new catalog behavior. |
| Independent branch refs preserve dirty checkout state and enforce exact fast-forward/check-out ownership | `git-toolbox-remote-operations.test.cjs` | Preserved. |
| Mapped branch push/upstream and exact remote deletion preserve local refs and sanitize failures | `git-toolbox-remote-operations.test.cjs` | Preserved. |

The shared fixture contains only temporary-repository construction, registered-workspace routing, bounded tool dispatch, Git observation, and cleanup helpers. Behavior assertions remain in the six owning tests.

## Catalog reconciliation

- Removed the deleted `git-mutation-boundary.test.cjs` record.
- Reassigned its 18 still-current catalog behaviors to the local, remote/ref, and tag owners.
- Removed the obsolete Work Card Git-wording capability behavior.
- Added explicit primary behaviors for application source control, source/lifecycle checkpoints, and Work Intake branch binding, which existed in the historical file but were absent from its stale catalog record.
- Added the current source-control, Work Intake branch, and shared fixture source patterns.
- Full catalog validation now reports exact coverage of 147 executable tests and one primary owner for every behavior.

## Focused timings

| Owner | Result |
| --- | ---: |
| `git-toolbox-local-operations.test.cjs` | 6/6 passed in 14.744 s |
| `git-toolbox-remote-operations.test.cjs` | 4/4 passed in 30.787 s |
| `git-toolbox-tag-operations.test.cjs` | 10/10 passed in 27.447 s |
| `source-control-service-boundary.test.cjs` | 1/1 passed in 24.843 s |
| `work-intake-branch-boundary.test.cjs` | 1/1 passed in 39.264 s |
| `source-checkpoint-boundary.test.cjs` | 1/1 passed in 68.145 s |

Every owner is within the ordinary integration target of 180 seconds. Splitting application source control from Work Intake branch binding also keeps each independently attributable; their initial combined owner passed in 64.495 seconds before the final split.

## Validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/git-toolbox-local-operations.test.cjs` | Normal Windows focused integration | Initial exit 1 because the extracted shared helper lacked its local `assert` import; corrected final exit 0, 6/6 passed in 14,743.8704 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/git-toolbox-remote-operations.test.cjs` | Normal Windows focused integration | Exit 0; 4/4 passed in 30,786.3355 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/git-toolbox-tag-operations.test.cjs` | Normal Windows focused integration | Exit 0; 10/10 passed in 27,446.5038 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/source-control-service-boundary.test.cjs` | Normal Windows focused integration | Exit 0; 1/1 passed in 24,842.5478 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/work-intake-branch-boundary.test.cjs` | Normal Windows focused integration | Exit 0; 1/1 passed in 39,263.2724 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/source-checkpoint-boundary.test.cjs` | Normal Windows focused integration | Exit 0; 1/1 passed in 68,144.8168 ms. |
| `node -e "const {loadCatalog}=require('./scripts/validation/catalog.cjs');const c=loadCatalog();console.log('validated catalog',c.tests.length,'tests')"` | Restricted catalog/schema lane | Exit 0; exact coverage and ownership validated for 147 tests. |
| `node --check` for all six owner files and `test/support/git-mutation-fixtures.cjs` | Restricted syntax lane | Exit 0 for every file. |

No full test suite/profile was run, as prohibited by the card.

## Git, security, and residual risk

- The Operator authorized a completion commit. Its hash is pending in this artifact and is reported after commit without amending solely for its own hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed in the project repository. Test-owned Git operations were confined to temporary repositories.
- A focused staged secret/local-path/generated-artifact scan is required before commit. Test diagnostics may display ephemeral OS temporary paths, but no concrete local path is persisted in durable artifacts.
- Operator manual validation: none; all acceptance is deterministic and non-visual.
- Residual risk: real Git timings vary by workstation, but every owner has substantial margin below the integration review threshold of 300 seconds.
- Recommended next task: TSR06.
