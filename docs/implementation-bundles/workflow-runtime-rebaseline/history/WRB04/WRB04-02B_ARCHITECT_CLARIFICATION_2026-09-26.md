# WRB04-02B Architect Clarification — WorkItem Decomposition Semantics

**Date:** 2026-09-26  
**Observed checkpoint:** `b40c8d26ba699a9a02a2861118dc8de2845e495b`  
**Decision:** authorize explicit one-to-many `decomposed_into`; do not expand `supersedes`.

## Decision

WRB04-02B uses a new explicit decomposition relationship:

```text
original WorkItem
    decomposed_into -> replacement WorkItem A
    decomposed_into -> replacement WorkItem B
    ...
```

`supersedes` remains unchanged.

## Why

Project State `supersedes` means semantic version-lineage replacement:

- predecessor and successor share one lineage;
- one lineage has one current record;
- lineage queries answer “what is the current version of this concept?”

One-to-many WorkItem decomposition is not a version correction of one concept. It is a structural split of one execution obligation into multiple new execution units.

Allowing several current successors in one lineage would break the core lineage invariant and would force changes into current-record queries, validation freshness, supersession history, and other entity families that correctly rely on one current member per lineage.

Therefore option 2 is rejected.

## Terminal semantics for the decomposition source

Do not add a new global `decomposed` WorkState in WRB04-02B.

The original WorkItem becomes historical/non-executable using existing terminal vocabulary:

- `lifecycleState = "voided"`;
- `workState = "cancelled"`;
- normal updated timestamp/principal;
- StateChange reason explicitly identifies accepted WorkItem decomposition.

The immutable `decomposed_into` relationships carry the reason/provenance for this terminal state.

This does **not** mean the accepted product obligation was abandoned. The obligation is continued by the replacement WorkItems and explicit Criterion/dependency mapping.

Because `getWorkflowExecutionPlan()` already excludes voided records, the original leaves the current execution graph while remaining durable history.

## Relationship semantics

Add:

```text
decomposed_into: WorkItem -> WorkItem
```

Properties:

- immutable provenance;
- one source may have 2..N replacement targets;
- each replacement may have at most one direct decomposition source;
- source and replacements must belong to the same exact current Workflow;
- source and replacement lineages must be distinct;
- the relationship may be created only by the typed decomposition command, not generic `createRelationship`;
- decomposition ancestry must be acyclic.

A replacement may itself later be decomposed, producing a decomposition tree without changing any lineage into a one-to-many version family.

## Pre-execution-only boundary

WRB04-02B decomposition is allowed only before the source WorkItem has entered execution evidence.

Reject decomposition if the source has any of:

- `workState` other than `planned` or `ready`;
- ImplementationRecord;
- active or historical implementation attempt/executionRef;
- completion-relevant Validation;
- SourceCheckpoint tied to the WorkItem or its ImplementationRecord;
- Repair/Fix child;
- already-existing `decomposed_into` targets.

This restriction makes decomposition a planning/execution-contract refinement rather than post-implementation rewriting.

If work has already begun, later architecture must use Repair/replanning semantics rather than pretending history can be structurally rewritten.

## Replacement semantics

Every replacement WorkItem:

- receives a new application-issued entity ID;
- receives a new lineage;
- has the same exact Workflow owner as the original;
- has the same Phase owner as the original when phased;
- starts `workState = "planned"`;
- uses a WorkItem kind valid for the owning Workflow;
- implements the same accepted BoundedSolution unless the decomposition input explicitly maps an already accepted same-Workflow solution;
- is linked from the original by immutable `decomposed_into`.

Do not make the original a parent/container WorkItem.

## Criterion preservation

No required acceptance obligation may disappear.

For each active Criterion defined by the original, the decomposition input must explicitly choose one of:

1. **transfer** — move ownership to exactly one replacement WorkItem;
2. **elevate** — move ownership to the existing owning Phase or accepted BoundedSolution when the criterion is genuinely aggregate/cross-cutting;
3. **split** — replace the original Criterion with two or more explicitly supplied Criterion definitions, each assigned to a replacement or aggregate owner.

Do not attach one unchanged Criterion to multiple replacement WorkItems. That creates ambiguous completion semantics.

For `split`:
- retain the original Criterion as historical/voided or otherwise terminal according to the existing typed semantic policy;
- create explicit replacement Criteria;
- preserve a durable derivation relationship from replacement Criteria to the original where the existing domain relationship supports it;
- ensure the set of replacement statements/verification intents demonstrably preserves the original obligation.

Since decomposition is pre-execution only, no existing completion Validation should need migration.

## Dependency preservation

All dependency edges touching the original must be explicitly remapped before mutation.

- **outgoing:** if original `depends_on X`, specify which replacement(s) inherit that dependency;
- **incoming:** if Y `depends_on original`, specify which replacement(s) Y must now depend on.

The command must end/replace the old dependency edges atomically and validate the complete resulting same-Workflow DAG before writing.

No dependent may remain pointed at the voided decomposition source.

## Atomic command

Add one typed command such as `decomposeWorkItem`.

Input must include:

- exact workflowId;
- exact source workItemId;
- expected source recordVersion;
- bounded replacement candidates with temporary keys;
- Criterion disposition/mapping;
- incoming/outgoing dependency mapping;
- optional same-Workflow solution mapping only where required.

Preflight the complete resulting graph before mutation.

Atomic success:

1. create replacement WorkItems/new lineages;
2. establish exact Workflow/Phase membership;
3. establish `implements` solution links;
4. apply Criterion transfer/elevation/split;
5. replace dependency edges;
6. terminalize original as `voided/cancelled`;
7. create immutable `decomposed_into` edges;
8. record StateChange evidence.

Any failure leaves the original graph unchanged.

## Query/projection behavior

Current execution projection:
- excludes the voided original;
- includes the replacements;
- computes dependencies/eligibility from replacements.

Historical/diagnostic projection should retain enough relationship data to show:

`original -> decomposed_into -> replacements`.

Do not treat replacements as members of the original lineage.

## Required proof

At minimum prove:

- one source decomposes into 2+ new lineages;
- `supersedes` semantics remain unchanged;
- original becomes voided/cancelled and disappears from current execution projection;
- replacements share exact Workflow/Phase owner;
- replacement WorkItems implement the accepted solution;
- replacement may later be decomposed again without lineage ambiguity;
- second direct decomposition source for one replacement rejects;
- post-attempt/post-validation/post-checkpoint/post-Repair decomposition rejects;
- required Criterion cannot be omitted;
- unchanged Criterion cannot be multiply owned by replacements;
- split Criterion preserves explicit derivation and owners;
- incoming/outgoing dependency mapping produces the expected DAG;
- unmapped dependency rejects;
- cycle/cross-Workflow mapping rejects;
- transaction rollback leaves original graph unchanged on any invalid mapping.
