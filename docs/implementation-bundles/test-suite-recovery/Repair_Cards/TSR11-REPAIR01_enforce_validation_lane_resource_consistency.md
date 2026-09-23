# TSR11-REPAIR01 — Enforce Validation Lane / Resource Consistency

**Type:** Repair Work Card  
**Parent:** Test Suite Recovery / TSR11 Architect Review  
**Experiment:** Implementer Reasoning Reduction — first candidate card  
**Reviewed repository revision:** `66c46367ca06dad3de48ea7292476c74b801fa69`

## A. Objective

Make the ValidationCatalog fail closed when a dedicated validation lane disagrees with the exclusive resource and scheduler mode that gives that lane its safety semantics.

After this repair:

- `desktop-platform` records are necessarily Windows Desktop-exclusive records;
- `packaging` records are necessarily packaging-exclusive records;
- `performance-soak` records are necessarily performance-exclusive records;
- the corresponding exclusive resources/modes cannot be hidden inside an ordinary validation lane; and
- the existing valid catalog continues to load without reclassification.

This card hardens metadata consistency only. It does not change scheduler behavior, profile composition, test semantics, resource pool sizes, or current catalog classification unless the verified precondition below is false.

## B. Verified Repository Preconditions

At reviewed revision `66c46367ca06dad3de48ea7292476c74b801fa69`:

### Production surfaces

1. `scripts/validation/catalog-schema.cjs`
   - `validateInventoryFields(record)` owns per-test ValidationCatalog structural validation.
   - `validationLanes` includes `desktop-platform`, `packaging`, and `performance-soak`.
   - `ownedResourceClasses` includes `electron-desktop`, `packaging`, and `performance-soak`.
   - `schedulingResources` currently maps:
     - `exclusive-desktop -> electron-desktop`;
     - `exclusive-packaging -> packaging`;
     - `exclusive-performance -> performance-soak`;
     - `exclusive-process -> shared-global-state-exclusive`.
   - The function enforces exclusive resource <-> scheduler-mode consistency.
   - The function does **not** enforce dedicated lane <-> resource/mode consistency.
   - The function enforces only mutual agreement between `platformDependency` and `execution.platform`; it does not require a Desktop-exclusive record to resolve to `windows`.

2. `scripts/validation/planner.cjs`
   - `planValidation()` selects non-affected profile/lane tests from `record.proposedValidationLane`.
   - Scheduler resource ownership is applied after selection.
   - Therefore lane/resource disagreement can alter which profile executes a test even when the resource scheduler itself behaves correctly.

### Existing proof surface

3. `test/validation/capability-map.test.cjs`
   - `inventory fields and allowed values fail closed, including required negative cases` is the existing primary negative schema test.
   - It already mutates catalog records to prove rejection of invalid lane, platform, owned-resource, scheduling/resource, and other inventory fields.
   - No separate permanent test file is required for this repair.

### Current-catalog precondition

The TSR09 audit and TSR11 final qualification report state that the current catalog contains:

- 10 Desktop-exclusive files;
- 2 packaging-exclusive files;
- 3 performance-exclusive files; and
- no unresolved ownership/classification gap.

The intended implementation therefore expects **no changes to `validation/capability-map.json`**.

If enforcing the exact invariants below causes the existing catalog to fail, stop and report `CARD_REPOSITORY_MISMATCH` with the failing test paths and conflicting fields. Do not silently reclassify the corpus under this card.

## C. Exact Implementation Delta

### 1. Harden `validateInventoryFields(record)`

Modify only `scripts/validation/catalog-schema.cjs::validateInventoryFields()`.

Immediately adjacent to the existing `schedulingResources` / exclusive-resource validation, establish the following dedicated-lane contracts:

| Validation lane | Required resource | Required scheduler mode | Required platform |
| --- | --- | --- | --- |
| `desktop-platform` | `electron-desktop` | `exclusive-desktop` | `windows` |
| `packaging` | `packaging` | `exclusive-packaging` | existing platform declaration remains authoritative |
| `performance-soak` | `performance-soak` | `exclusive-performance` | existing platform declaration remains authoritative |

For each row above, enforce the relationship bidirectionally:

1. If `record.proposedValidationLane` is the dedicated lane:
   - the required resource must be present;
   - `record.execution.scheduling` must be the required scheduler mode.

2. If the required exclusive resource is present:
   - `record.proposedValidationLane` must be that resource's dedicated lane.

3. If the required scheduler mode is selected:
   - `record.proposedValidationLane` must be the corresponding dedicated lane.

4. For the Desktop contract only:
   - `record.platformDependency` must equal `windows`;
   - `record.execution.platform` must equal `windows`.

Do not change the existing `shared-global-state-exclusive` / `exclusive-process` relationship. Shared-global exclusion is a scheduling safety property and is not assigned a dedicated validation lane.

Do not derive scheduling mode inside the planner or scheduler. The catalog remains the declared source; the validator makes contradictory declarations impossible.

### 2. Extend the existing negative schema proof

Modify only the existing negative-validation test in `test/validation/capability-map.test.cjs`.

Add explicit rejection proof for all of the following:

1. a valid Desktop record changed to an ordinary lane while retaining its Desktop resource/mode;
2. a valid packaging record changed to an ordinary lane while retaining its packaging resource/mode;
3. a valid performance/soak record changed to an ordinary lane while retaining its performance resource/mode;
4. a non-Desktop record changed to `desktop-platform` without the Desktop resource/mode;
5. a non-packaging record changed to `packaging` without the packaging resource/mode;
6. a non-performance record changed to `performance-soak` without the performance resource/mode;
7. a valid Desktop record changed coherently to `platformDependency: none` and `execution.platform: any`, proving that Desktop exclusivity independently requires Windows.

Use records already present in `capabilityMap.tests` as the source fixtures. Select records by their current dedicated lane rather than depending on array position.

Do not create a new permanent test file.

## D. Expected Change Boundary

### Expected modified files

- `scripts/validation/catalog-schema.cjs`
- `test/validation/capability-map.test.cjs`

### Expected unchanged files

- `validation/capability-map.json`
- `scripts/validation/planner.cjs`
- `scripts/validation/scheduler.cjs`
- `scripts/validation/executor.cjs`
- `validation/profiles.json`
- production application TypeScript
- all unrelated test files

A required modification to `validation/capability-map.json`, planner/profile behavior, scheduler behavior, or any production TypeScript surface is a stop-class repository mismatch under this card.

The Implementer Report is the only additional expected artifact.

## E. Architectural Decisions Already Made

1. Validation lane remains the profile-selection authority.
2. Owned resources remain the scheduler-safety authority.
3. Dedicated Desktop, packaging, and performance lanes and their exclusive resources are two representations of the same safety classification and must not disagree.
4. Validation rejects contradictory metadata rather than normalizing or repairing it automatically.
5. `shared-global-state-exclusive` remains lane-agnostic.
6. Current resource pool sizes and barrier behavior are unchanged.
7. Current test classifications are presumed correct from TSR09/TSR11 evidence; this repair hardens the contract around them.
8. No compatibility mode for contradictory schema-4 records is permitted.

## F. Test and Validation Contract

### Existing tests reused

Use `test/validation/capability-map.test.cjs` as the primary proof owner.

### Existing tests modified

Extend:

`inventory fields and allowed values fail closed, including required negative cases`

with the seven contradiction cases specified in Section C.

### New permanent tests

None.

The coverage gap is schema-negative coverage inside the existing primary schema owner; a new file would duplicate that ownership.

### Required validation

Run exactly:

1. `node --check scripts/validation/catalog-schema.cjs`
2. `node --check test/validation/capability-map.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 test/validation/capability-map.test.cjs`

Expected result:

- syntax checks exit 0;
- capability-map owner exits 0;
- current catalog still validates exactly;
- all newly added contradictory mutations are rejected.

### Explicitly not required

Do **not** run:

- `npm test`;
- `test:full`;
- `full-supported-platform`;
- the serial timing audit;
- performance/soak;
- Desktop qualification;
- packaging qualification;
- unrelated integration profiles.

No scheduler/runtime behavior changes under this card, so wider execution does not add owned proof.

### Acceptance criterion -> evidence

1. Dedicated lane requires matching exclusive resource/mode -> negative mutation cases reject lane-without-resource/mode.
2. Exclusive resource/mode requires dedicated lane -> negative mutation cases reject resource/mode hidden in an ordinary lane.
3. Desktop classification requires Windows -> coherent `none/any` Desktop mutation is rejected.
4. Existing catalog remains valid -> complete capability-map owner passes with no catalog edits.
5. No unrelated behavior changed -> repository diff remains inside Section D plus the Implementer Report.

## G. Forbidden Changes

Do not:

- edit current catalog classifications to make the new validator pass;
- change resource pool limits;
- change barrier behavior;
- change profile lane composition;
- infer/normalize lanes automatically;
- add a compatibility fallback;
- add a second catalog schema validator;
- add a new permanent test file;
- broaden this card into a general ValidationCatalog cleanup;
- modify application production TypeScript;
- rerun the broad recovery suite merely for completion evidence.

## H. Mismatch Policy

### Implementer-local resolution allowed

The Implementer may locally resolve:

- exact assertion wording;
- local helper extraction inside `capability-map.test.cjs` if it only removes repetition from the seven required negative cases;
- variable naming;
- formatting;
- ordering required by existing style;
- a trivial Node/assert syntax correction that does not change the prescribed invariants.

### Stop and report mismatch

Stop with `CARD_REPOSITORY_MISMATCH` if:

- any current catalog record fails one of the prescribed dedicated-lane invariants;
- a dedicated lane/resource/mode currently has semantics materially different from Section C;
- implementing the invariant requires changing `validation/capability-map.json`;
- profile selection is no longer controlled by `proposedValidationLane`;
- a required exclusive class is intentionally allowed in multiple lanes by another governing contract;
- scheduler/planner changes become necessary;
- the existing primary schema test cannot express the required negative proof without a new architectural decision.

Do not redesign the classification model in response to a mismatch.

## I. Completion Evidence

The Implementer Report must state:

- files changed;
- exact invariant implemented;
- whether the current catalog required any modification;
- existing tests modified;
- confirmation that no new permanent test was added;
- exact three validation commands and exit results;
- any Implementer-local resolution decision;
- any deviation or mismatch;
- final repository diff boundary.

A successful report should show two production/test files changed plus the required report artifact, with `validation/capability-map.json` unchanged.
