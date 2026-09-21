# TSR07 Repair Implementer Report

Status: complete; remote-target IntegrationCandidate semantics and release command-adapter proof pass, and the candidate semantic owner is below 60 seconds.

## Scope and repository verification

- Card: Repair Work Card TSR07, Repair IntegrationCandidate and Release-Toolbox Failures.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev`; TSR06 starting point was commit `dbfc77c`. Remote freshness was not fetched.
- No production behavior, dependency, migration, schema, or compatibility path changed.

## Files changed

Modified:

- `test/agent-harness/integration-candidate-semantics.test.cjs`
- `test/support/integration-scenarios.cjs`
- `test/support/integration-semantics.cjs`
- `test/agent-harness/release-toolbox-boundary.test.cjs`
- `validation/capability-map.json`

Created: this report.

Deleted: none.

Intentionally not created: replacement mega-scenarios, weakened target/ref checks, production fallbacks, dependencies, branches, worktrees, JSON sidecars, or generated output.

## Root-cause classification and correction

### Remote target

Production source-control correctly fetched the configured remote and constructed the candidate against the remote target commit while retaining the older local target as `localTargetCommit`. The direct semantic validation callback incorrectly asserted that `context.targetCommit` must equal the stale local target SHA. That assertion threw, was correctly converted into failed validation evidence, and produced the observed `validation-failed` status.

This was a stale test expectation, not a production integrity defect. The correction:

- expects the fetched remote target commit in validation context;
- preserves the distinct local target SHA and exact compare-and-swap advancement boundary;
- makes the semantic source-control fixture resolve `remote/targetBranch` as the candidate target while retaining the local branch as `localTargetCommit`;
- retains real isolated candidate worktrees, merge commits, validation mutation detection, stale-target rejection, remote synchronization, repair bounds, and canonical receipts.

The seven semantic scenarios now use the existing semantic source-control fixture instead of replaying the separately owned bounded-Git provider stack. Final execution used seven real candidate checkouts, 12 bounded Git operations, and 157 fixture Git operations, versus 2,111 bounded Git operations in the failing run.

### Release process-tree termination

The production `terminateProcessTree` adapter uses the supported Node `ChildProcess` contract: the `taskkill` child is an event emitter with error handling and `unref()`. The test mock returned only `{ unref() {} }`, so the mock—not the adapter—violated that contract and caused `killer.on is not a function`.

The correction makes the `taskkill` stub an `EventEmitter` with `unref()`, preserving the real adapter contract and the timeout/process-tree proof. No production exception swallowing or weakened termination behavior was added.

## Preserved safety

- A fetched remote target, not a stale local target, governs candidate construction and validation context.
- Local target advancement remains compare-and-swap against the recorded `localTargetCommit`.
- Stale target movement remains rejected without force, reset, rebase, or history rewrite.
- Validation mutation still blocks advancement.
- Remote synchronization occurs only after a validated candidate advances locally.
- Repair path count, editable scope, governing evidence, and candidate cleanliness remain fail closed.
- Release commands retain fixed executables/arguments, shell-disabled spawning, bounded output, deadlines, root redaction, and process-tree termination.

## Timings and validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern=remote-target test/agent-harness/integration-candidate-semantics.test.cjs` | Normal Windows diagnostic lane | Exit 0 but selected no nested cases; Node's pattern filtered the dynamically registered parent, so this was not counted as proof. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-candidate-semantics.test.cjs` | Normal Windows diagnostic integration | Initial exit 1; remote-target reported `validation-failed`; owner took 149,825.7955 ms with 2,111 bounded Git operations. |
| Same IntegrationCandidate command after correction/bounding | Normal Windows focused integration | Exit 0; 8/8 passed in 25,905.7528 ms; remote-target passed in 5.431 s. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/release-toolbox-boundary.test.cjs` | Normal Windows focused integration | Exit 0; 50/50 passed in 16,319.3949 ms; command-adapter timeout case passed. |
| `node --test --test-reporter=tap --test-concurrency=1 test/agent-harness/integration-profile-gate.test.cjs` | Normal Windows directly affected provider lane | Exit 0; 7/7 passed in 37,873.8083 ms; immutable target toolkit and target-eligibility proof retained. |
| `node --check` for the changed IntegrationCandidate/release/support CJS files | Restricted syntax lane | Exit 0 for every file. |
| Direct ValidationCatalog load/schema check | Restricted catalog/schema lane | Exit 0; exact coverage and ownership validated for 147 tests. |

No full suite/profile or corpus audit was run.

## Git, security, and residual risk

- The Operator authorized a completion commit. Its hash is pending in this artifact and is reported after commit without amending solely for its own hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed in the project repository. Test-owned Git operations were confined to temporary repositories.
- A focused staged secret/local-path/generated-artifact scan is required before commit. Diagnostics may display ephemeral temporary paths, but no concrete local path is persisted.
- Operator manual validation: none; all acceptance is deterministic and non-visual.
- Residual risk: the semantic owner intentionally delegates low-level bounded-Git mechanics to their dedicated owners; this card retains composition semantics and real candidate bytes/worktrees.
- Recommended next task: TSR08.
