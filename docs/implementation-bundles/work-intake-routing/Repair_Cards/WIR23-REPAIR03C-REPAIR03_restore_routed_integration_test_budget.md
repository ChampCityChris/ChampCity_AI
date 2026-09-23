# WIR23-REPAIR03C-REPAIR03 — Restore Routed Integration Test Budget

**Type:** Test Architecture Repair Work Card  
**Parent:** WIR23-REPAIR03C  
**Finding:** AR-WIR-R4  
**Depends on:** WIR23-REPAIR03C-REPAIR02

## A. Objective

Restore bounded ownership and runtime for routed integration proof after Research integration and retained-candidate coverage expanded `routed-integration-focus.test.cjs` from the recovered 23.9-second owner to a reported 305-second file.

Preserve every unique behavior assertion. Remove repeated integration setup and cross-domain replay; do not weaken proof to meet a timing number.

No product behavior change is expected.

## B. Verified Repository Preconditions

Test Suite Recovery established:

- `routed-integration-focus.test.cjs` final focused result: 23.903 seconds, 3/3 passed;
- clean Plan target: ~5 seconds;
- conflicting Plan target: ~18.7 seconds;
- the file as a bounded integration sentinel, not a general lifecycle owner;
- ordinary functional owners below 60 seconds;
- integration target below 180 seconds with review required at 300 seconds.

Current WIR implementation added:
- successful planning-only Research integration;
- changed Research completion retained-candidate recovery;
- REPAIR02 adds legacy multi-record retained-state proof.

The latest Implementer Report observed:
- 5/5 passed;
- 305.0 seconds;
- review-required.

The Research tests currently repeat:
- prepared Research Work Intake setup;
- Research Assessment creation/review;
- checkpoint construction;
- IntegrationCandidate construction;
- target validation;
- source-control cleanup.

Research planning semantics and Research lifecycle checkpoint validity already have dedicated owners:
- `test/project-planning/project-planning-service.test.cjs`;
- `test/agent-harness/source-checkpoint-boundary.test.cjs`.

Routed integration tests should start from the nearest durable Research completion boundary rather than replay those owners.

## C. Exact Implementation Delta

### 1. Restore Plan integration owner to Plan integration behavior

Keep:

`test/characterization/routed-integration-focus.test.cjs`

focused on the recovered Plan integration sentinel:
- clean target integration;
- conflicting target preservation;
- bounded repair;
- validation;
- atomic target advancement;
- Work Intake checkout preservation.

Move Research-specific top-level scenarios out of this file.

Do not retire any Plan assertion.

### 2. Create one Research integration owner

Create:

`test/characterization/routed-research-integration-focus.test.cjs`

This owner contains the unique Research integration/candidate behavior from:
- WIR23-REPAIR03C;
- WIR23-REPAIR03C-REPAIR01;
- WIR23-REPAIR03C-REPAIR02.

Do not copy Research planning lifecycle tests into it.

### 3. Add a prepared Research completion fixture

Create or extend one support module under `test/support/`, preferably:

`test/support/research-integration-scenarios.cjs`

or another clearly named existing support owner.

Provide a fixture that starts from the nearest durable state needed by routed integration:

- real temporary Git repository;
- real target branch;
- real Work Intake branch binding;
- current canonical Work Intake/project/routing evidence;
- current selected Research route;
- current approved no-Plan Research Assessment with stable assessmentId;
- clean worktree;
- no Plan;
- no routed-development binding;
- no IntegrationCandidate unless the scenario requests one.

Use production canonical document writers/serializers and actual source-control/integration services.

Do not execute:
- Architect draft preparation;
- Architect output ingestion;
- Operator Research review workflow

inside this integration fixture. Those semantics are owned by the planning test.

The fixture may expose a bounded helper to advance the same Research Assessment revision/body while preserving stable completion identity for retained-candidate tests.

### 4. Consolidate overlapping Research candidate paths

Minimize repeated real candidate creation.

Prefer a single sequential Research scenario that can prove, in one repository where practical:

- initial Research ready state;
- checkpoint-before-candidate behavior;
- deterministic validation failure retains candidate and leaves target unchanged;
- changed completion remains blocked by active candidate;
- explicit abort recovery;
- legacy multi-record active-vs-terminal selection from REPAIR02;
- subsequent successful validation/target advancement for the current completion;
- final integration-complete state;
- no Plan/Work Item/Phase/execution binding.

Do not combine assertions when doing so would make state ambiguous; correctness is primary. But do not create multiple fresh repositories merely to replay identical setup when one ordered scenario can prove the transitions.

### 5. Register the new owner

Update `validation/capability-map.json`:

- remove Research-specific ownership/count from the Plan integration record;
- add the new Research integration owner;
- use the existing integration lane;
- use the same isolated Git/process resource vocabulary as the nearest routed integration sentinel unless measured behavior proves a different declared resource;
- record actual test count and measured duration after the final run;
- preserve complete capability coverage.

Do not classify the Research owner as performance/soak merely because it is slow.

## D. Expected Change Boundary

Expected:
- `test/characterization/routed-integration-focus.test.cjs`
- new `test/characterization/routed-research-integration-focus.test.cjs`
- one bounded `test/support/*research*integration*.cjs` support fixture
- `validation/capability-map.json`
- Implementer Report

No production `src/**` change is expected.

If production changes appear necessary, stop as mismatch.

## E. Architectural Decisions Already Made

1. Plan integration and Research integration are distinct proof owners sharing production integration mechanics.
2. Research planning and lifecycle-checkpoint correctness remain owned by their dedicated tests.
3. Integration tests start at the nearest durable accepted boundary.
4. Real candidate creation/merge/validation/target advance remain in integration proof.
5. Timing is improved by ownership/fixture correction, not by removing unique assertions.
6. Performance/soak classification is forbidden for ordinary integration semantics.
7. Test metadata follows measured implementation; metadata must not excuse a pathological owner.

## F. Test and Validation Contract

Run after restructuring:

1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-integration-focus.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 test/characterization/routed-research-integration-focus.test.cjs`
4. `node --test --test-reporter=tap --test-concurrency=1 test/validation/capability-map.test.cjs`

Also run the repository timing mechanism for those exact two integration owners if the test toolbox exposes measured file duration.

Acceptance:

### Plan owner

- all existing Plan integration assertions pass;
- measured file runtime <60 seconds on the supported workstation.

### Research owner

Target:
- <60 seconds.

Hard ceiling for this wider integration sentinel:
- <180 seconds.

If Research remains >=180 seconds after eliminating repeated upstream replay, stop and report the measured subcase/process evidence. Do not raise the budget or merely reclassify metadata.

### Catalog

- exact coverage remains complete;
- counts/durations match measured owners;
- no duplicate primary ownership is introduced.

Do not run full regression.

## G. Forbidden Changes

Do not:
- remove unique Research integration assertions;
- mock away candidate creation, merge, validation, or target advancement;
- classify the test as performance/soak;
- increase the five-minute review threshold;
- hide duration by changing only metadata;
- reintroduce full planning lifecycle replay into integration tests;
- modify production source to make tests faster.

## H. Mismatch Policy

Implementer-local:
- support fixture filename;
- exact scenario consolidation structure;
- capability record wording consistent with current schema.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- real Research integration cannot be seeded at an approved completion boundary without exercising unrelated planning runtime;
- unique behavior requires more than one Research repository scenario and the measured owner remains >=180 seconds;
- validation catalog cannot represent the split without a new schema decision;
- product code change is required.

## I. Completion Evidence

Report:
- before/after file ownership;
- every moved/consolidated unique assertion;
- fixture boundary and what upstream behavior it intentionally does not replay;
- actual Plan owner duration;
- actual Research owner duration;
- candidate/Git operations retained as real;
- capability-map changes;
- exact four validation results;
- any residual performance blocker.
