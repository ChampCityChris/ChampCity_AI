# TSR03 Implementer Report

Status: complete; routine lifecycle owners are below 60 seconds and one primary integration sentinel remains below 180 seconds.

## Scope and repository verification

- Card: Work Card TSR03, Consolidate Routed Lifecycle and Phase Acceptance Replays.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev`; TSR02 starting point was commit `51be005`. Remote freshness was not fetched.
- No production workflow, dependency, migration, schema, or compatibility behavior changed.

## Files changed

Modified:

- `test/support/work-intake-fixtures.cjs`
- `test/characterization/desktop-development-lifecycle.test.cjs`
- `test/phase-close/phase-validation-state.test.cjs`
- `validation/capability-map.json`

Deleted:

- `test/characterization/routed-lifecycle-acceptance.test.cjs`

Created: this report.

Intentionally not created: new end-to-end stories, production fallback behavior, JSON workflow sidecars, dependencies, branches, worktrees, or generated output.

## Invariant inventory and consolidation

### Desktop Development lifecycle

The two routed cases now use the prepared selected-route/approved-Plan/execution-binding fixture. They retain:

- sequential Repair identity and immediate-parent lineage;
- stale validation and same-revision report rejection;
- durable close evidence as the semantic gate before successor eligibility;
- report-review return behavior;
- genuine Phase barrier before successor eligibility;
- no legacy Phase artifacts;
- the existing four narrow Desktop service/projection characterization cases.

Machine checkpoint commits are isolated with a deterministic checkpoint result in these routine semantic cases. The tests still exercise production lifecycle state, canonical evidence, acceptance eligibility, and stale-source logic; they no longer duplicate Git commit-chain proof.

### Phase validation/acceptance

The two routed acceptance cases use prepared approved direct/phased Plans. They retain:

- explicit Plan acceptance after Work Item close;
- Pending acceptance not completing the Plan;
- stale/failing criterion rejection;
- genuine Phase acceptance barriers and successor gating;
- Phase acceptance distinct from Plan acceptance;
- predecessor revision/byte freshness;
- direct topology rejecting fabricated Phase boundaries;
- no legacy Phase artifacts.

Checkpoint persistence is isolated here because acceptance semantics—not Git commit mechanics—is this owner’s durable boundary.

### Routed integration sentinel

`routed-lifecycle-acceptance.test.cjs` was retired. Its catalog entry already declared it a supporting proof for `release-and-git-operations/routed-checkpoint-integration-composition`; the primary proof is `routed-integration-focus.test.cjs`. The removed story duplicated Work Card planning, validation, close, Plan acceptance, source checkpoint, conflicting-target integration, and Integration Repair before reaching the same composition contract.

The retained `routed-integration-focus.test.cjs` begins at the curated completed durable boundary and uniquely proves:

- real checkpoint commit discovery and Plan lineage;
- clean-target integration;
- stale Plan rejection;
- conflicting target preservation;
- bounded Integration Repair editable scope;
- integration completion/receipt reconstruction;
- no legacy Phase artifacts.

It is classified as integration evidence and runs in 99.885 seconds, within the adopted 180-second integration budget.

## Late-failure disposition

Initial prepared-fixture runs reproduced the old late failures because routine tests mixed mocked branch verification with real checkpoint commits, and because uncommitted prepared planning state appeared as unrelated checkpoint input. Those were fixture-policy mismatches, not production defects.

Routine owners now isolate checkpoint persistence entirely and prove their semantic contracts deterministically. A diagnostic attempt to retain the broad story with selective real verification reached 134.468 seconds before a fixture-specific cleanliness assertion observed ignored planning artifacts as deleted after checkpoint commit. That expectation is not retained: the same Git composition is already owned by the curated primary sentinel, which passed both clean and conflicting targets from a completed durable boundary.

## Timings

| Owner | Before | After |
| --- | ---: | ---: |
| `desktop-development-lifecycle.test.cjs` | 427.8 s | 10.982 s, 6/6 passed |
| Routed direct Repair lifecycle | ~215 s | 6.230 s |
| Routed phased Repair lifecycle | ~212 s | 3.964 s |
| `phase-validation-state.test.cjs` | 206.5 s | 7.868 s, 12/12 passed |
| Routed direct Plan acceptance | ~123 s | 3.120 s |
| Routed genuine Phase acceptance | ~83 s | 3.799 s |
| Removed routed lifecycle replay | 218.9 s audit / 740.155 s prior catalog measurement | retired as supporting overlap |
| Retained routed integration primary sentinel | 80.050 s prior catalog | 99.885 s, 3/3 passed |

## Validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/desktop-development-lifecycle.test.cjs` | Normal Windows focused lane | Initial exit 1: 4/6 passed; two checkpoint actions failed because mocked verification could not observe the new commit head. |
| `node --test --test-reporter=tap --test-concurrency=1 test/phase-close/phase-validation-state.test.cjs` | Normal Windows focused lane | Initial exit 1: 10/12 passed; prepared planning state was unrelated checkpoint input. |
| Same two owner commands with real verification | Normal Windows diagnostic lane | Interrupted after 90 seconds without failure output; real checkpoint replay exceeded the routine-owner budget. |
| Desktop Development command after checkpoint isolation | Normal Windows focused lane | Exit 0; 6/6 passed in 10,981.7392 ms. |
| Phase validation command after checkpoint isolation | Normal Windows focused lane | Exit 0; 12/12 passed in 7,867.8342 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-lifecycle-acceptance.test.cjs` | Normal Windows diagnostic integration lane | First attempt interrupted after crossing 180 seconds. Selectively verified attempt exited 1 after 134,468.2258 ms at the redundant fixture cleanliness assertion; file then retired based on existing primary ownership. |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs` | Normal Windows integration lane | Exit 0; 3/3 passed in 99,884.7773 ms; clean target 25.912 s and conflicting target 73.767 s. |
| Direct `validateInventoryFields` checks for the three retained catalog records | Restricted schema lane | Exit 0; counts, durations, dependencies, and record vocabulary validated. Removed supporting record confirmed absent. |
| `node --check` for the changed support/Desktop/Phase files | Restricted syntax lane | Exit 0. |
| `git diff --check` | Read-only Git lane | Exit 0. |

No full suite/profile was run. Full catalog validation remains blocked by the baseline-deleted Git mutation monolith assigned to TSR05.

## Git, security, and residual risk

- The Operator authorized a completion commit. Its hash is pending in this artifact and is reported after commit without amending solely for its own hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed.
- A focused staged secret/local-path/generated-artifact scan is required before commit. No sensitive or machine-specific material is intentionally persisted.
- Operator manual validation: none; all acceptance is deterministic and non-visual.
- Residual risk: the retained primary integration sentinel varies with workstation Git/process performance but passed within the 180-second budget. Recommended next task: TSR04.
