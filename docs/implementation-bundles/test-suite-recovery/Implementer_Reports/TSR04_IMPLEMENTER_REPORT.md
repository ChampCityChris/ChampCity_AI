# TSR04 Implementer Report

Status: complete; every named routed Architect/Issue/integration owner passes below 60 seconds.

## Scope and repository verification

- Card: Work Card TSR04, Replace Remaining Routed Architect/Issue Mega-Scenarios.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev`; TSR03 starting point was commit `385c9bd`. Remote freshness was not fetched.
- No production workflow, dependency, migration, schema, or compatibility behavior changed.

## Files changed

Modified:

- `test/issue-resolution/issue-architect-planning-service.test.cjs`
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`
- `test/characterization/routed-integration-focus.test.cjs`
- `test/support/integration-semantics.cjs`
- `validation/capability-map.json`

Created: this report.

Deleted: none.

Intentionally not created: new lifecycle stories, production fallbacks, JSON workflow sidecars, dependencies, branches, worktrees, generated output, or replacement proof files.

## Unique invariant ownership and bounded setup

### Issue Architect and planning

The routed defect scenario now begins at the prepared selected-route boundary and isolates repeated branch verification. It still exercises production Issue actions and preserves:

- the existing Intake and work branch across Issue investigation and planning;
- Architect RCA recommendation and Operator disposition behavior;
- phased correction planning and revision lineage;
- rejection of stale Issue evidence;
- general reroute behavior and downstream supersession.

The removed setup was repeated repository submission, routing assessment, and branch-verification acquisition that only reconstructed the already selected Issue route. No Issue or reroute assertion was removed.

### Architect output routing authority

The route-authority scenario retains a real initial Intake submission and real branch establishment. After that stable boundary it isolates repeated branch verification while continuing to exercise production route decisions, revision requests, same-route retention, and reroutes. It preserves:

- Operator authority over direct, phased, and Issue route selection;
- route-decision revision and reroute lineage;
- retained-route byte preservation and freshness;
- explicit downstream invalidation only when the route changes;
- stable Intake and branch identity throughout the scenario.

The superseded proof was only repeated verification of the same unchanged fixture branch. Branch creation and Git binding remain covered by their dedicated service proofs.

### Routed integration focus

The primary integration owner continues to begin at the curated completed durable boundary. It retains real isolated Git candidate worktrees and proves:

- discovery of the completed source checkpoint and current Plan lineage;
- stale Plan fingerprint rejection before integration;
- clean-target merge, validation, and atomic target ref advancement;
- conflicting-target preservation without premature target movement;
- rejection of an out-of-scope repair patch;
- bounded `source.js` repair, committed candidate validation, and completion;
- work-branch preservation, clean source checkout, retained completion receipt, and absence of legacy Phase artifacts.

The fixture now reuses immutable branch-head, checkpoint-history, commit-message, and clean-status observations during one scenario. It also supplies the deterministic source-preservation validation check directly, because target-policy schema/profile acquisition is independently owned by the integration-policy tests. Real candidate creation, merge conflict, repair diff/snapshot/commit operations, checkout inspection, and target ref advancement remain in place. The final run used two real candidate checkouts, 92 bounded Git operations, and 92 fixture Git operations.

No semantic assertion was retired. Repeated full lifecycle acquisition and repeated immutable-policy/checkpoint acquisition were superseded by their nearest stable fixtures and dedicated proof owners.

## Timings

| Owner | Audit baseline | Final focused result |
| --- | ---: | ---: |
| `issue-architect-planning-service.test.cjs` | 67.9 s | 2.030 s, 12/12 passed |
| `architect-output-workspace-repair.test.cjs` | 67.8 s | 19.210 s, 27/27 passed |
| `routed-integration-focus.test.cjs` | 59.9 s audit; 99.885 s TSR03 | 23.903 s, 3/3 passed |
| Integration clean target | included above | 5.012 s |
| Integration conflicted target | included above | 18.740 s |

## Validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-concurrency=1 test/issue-resolution/issue-architect-planning-service.test.cjs` | Normal Windows focused lane | Exit 0; 12/12 passed in 2,029.7258 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/architect-outputs/architect-output-workspace-repair.test.cjs` | Normal Windows focused lane | Exit 0; 27/27 passed in 19,209.3148 ms. |
| `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs` | Normal Windows diagnostic integration lane | Intermediate exit 0; 3/3 passed in 79,975.3486 ms, above the card ceiling. This identified repeated immutable evidence and policy acquisition as the remaining cost. |
| Same routed-integration command after fixture bounding | Normal Windows integration lane | Exit 0; 3/3 passed in 23,903.1083 ms; clean target 5.012 s and conflicted target 18.740 s. |
| Direct `validateInventoryFields` checks for the three TSR04 catalog records | Restricted schema lane | Exit 0; counts, measured durations, dependencies, and record vocabulary validated. |
| `node --check test/issue-resolution/issue-architect-planning-service.test.cjs` | Restricted syntax lane | Exit 0. |
| `node --check test/architect-outputs/architect-output-workspace-repair.test.cjs` | Restricted syntax lane | Exit 0. |
| `node --check test/characterization/routed-integration-focus.test.cjs` | Restricted syntax lane | Exit 0. |
| `node --check test/support/integration-semantics.cjs` | Restricted syntax lane | Exit 0. |

No full suite/profile was run, as prohibited by the card. Full catalog validation remains blocked by the baseline-deleted Git mutation monolith assigned to TSR05.

## Git, security, and residual risk

- The Operator authorized a completion commit. Its hash is pending in this artifact and is reported after commit without amending solely for its own hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed.
- A focused staged secret/local-path/generated-artifact scan is required before commit. No sensitive or machine-specific material is intentionally persisted.
- Operator manual validation: none; all acceptance is deterministic and non-visual.
- Residual risk: focused timings vary with workstation Git/process performance, but the slowest final owner completed in 23.903 seconds, leaving substantial margin below the 60-second ceiling.
- Recommended next task: TSR05.
