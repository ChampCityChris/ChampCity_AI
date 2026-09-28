# WRB04-02B — Typed Same-Workflow WorkItem Decomposition

**Revision:** 2 — explicit one-to-many decomposition semantics  
**Depends on:** WRB04-02 checkpoint `b40c8d26ba699a9a02a2861118dc8de2845e495b`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Add one atomic typed Project State command that decomposes an oversized pre-execution canonical WorkItem into bounded same-Workflow replacement WorkItems while preserving every acceptance obligation and dependency.

Decomposition is structural ancestry, not entity-version supersession.

## 1. Do not use `supersedes`

Do not modify the existing `supersedes` model.

`supersedes` remains one-to-one semantic lineage replacement:
- same entity type;
- same lineage;
- one current record in the lineage.

WorkItem decomposition creates multiple new execution concepts and therefore multiple new lineages.

## 2. Add immutable `decomposed_into`

Add a registered relationship:

```text
decomposed_into: WorkItem -> WorkItem
```

Required semantics:
- immutable provenance;
- source may point to 2..N replacement WorkItems;
- each replacement may have at most one direct `decomposed_into` source;
- source/replacements must resolve to the same exact current Workflow;
- source/replacement lineages must differ;
- decomposition ancestry is acyclic;
- generic `createRelationship` cannot create `decomposed_into`; only the typed decomposition command may do so.

A replacement may later itself be decomposed.

## 3. Pre-execution-only decomposition

The source WorkItem must still be a planning/execution-contract candidate.

Allow only `workState = planned|ready`.

Reject if the source has any:
- ImplementationRecord or begun execution attempt;
- completion-relevant Validation;
- SourceCheckpoint tied to the WorkItem/attempt;
- Repair/Fix child;
- prior decomposition targets.

Do not rewrite post-implementation history through decomposition.

## 4. Terminalize the source using existing state vocabulary

On successful decomposition, the original WorkItem becomes:

- `lifecycleState = voided`;
- `workState = cancelled`.

Record a StateChange reason identifying accepted WorkItem decomposition.

Do not add a global `decomposed` WorkState in this card.

The `decomposed_into` provenance explains why the source is terminal. The accepted product obligation continues through replacements.

The original remains durable history and must not appear as a current executable WorkItem.

## 5. Replacement WorkItems

Each replacement:
- receives an application-issued ID;
- starts a new lineage;
- retains the exact current Workflow owner;
- retains the exact original Phase owner if phased;
- starts `planned`;
- uses a kind valid for the Workflow family;
- implements the same accepted BoundedSolution unless the typed input maps another already accepted same-Workflow solution;
- receives immutable `decomposed_into` provenance from the original.

Do not add a parent/container WorkItem and do not manufacture a Phase.

## 6. Criterion disposition is explicit

Every active Criterion defined by the source must have one explicit disposition:

### Transfer
Move the existing Criterion ownership to exactly one replacement.

### Elevate
Move the existing Criterion ownership to the existing owning Phase or accepted BoundedSolution when it is genuinely aggregate/cross-cutting.

### Split
Replace one Criterion with 2+ explicit new Criterion definitions assigned to replacement/aggregate owners.

For split:
- retain original Criterion as historical terminal semantics according to existing Project State policy;
- create replacement Criteria;
- preserve derivation/provenance from each replacement Criterion to the original.

Reject:
- omitted required Criterion;
- one unchanged Criterion assigned to multiple replacement WorkItems;
- foreign owner;
- empty split;
- validation-policy/criticality fields missing on replacement Criteria.

Because decomposition is pre-execution only, do not migrate existing completion Validation.

## 7. Dependency mapping is explicit

Preflight all `depends_on` edges touching the source.

Input must explicitly map:

- source outgoing dependencies to replacement WorkItems;
- external incoming dependents onto replacement WorkItems.

On success:
- old dependency edges touching the voided source no longer participate in the current graph;
- replacement dependency edges represent the complete intended semantics;
- no current WorkItem depends on the voided source.

Reject missing/ambiguous mappings, self-dependency, cross-Workflow dependency, or cycles.

Validate the entire resulting Workflow DAG before mutation.

## 8. Typed atomic command

Add one typed command such as `decomposeWorkItem(projectId, input)`.

Input includes:
- exact workflowId;
- exact source workItemId;
- expected source recordVersion;
- 2..N bounded replacement candidates with temporary keys;
- Criterion transfer/elevate/split mapping;
- incoming/outgoing dependency mapping;
- optional accepted same-Workflow solution mapping where needed.

Preflight everything before mutation.

Atomic success:
1. create replacement WorkItems;
2. link exact Workflow/Phase membership;
3. link accepted BoundedSolution implementation;
4. apply Criterion dispositions;
5. replace dependencies;
6. terminalize original `voided/cancelled`;
7. create immutable `decomposed_into` edges;
8. record mutation/relationship evidence.

Failure leaves the original graph unchanged.

## 9. Projection behavior

`getWorkflowExecutionPlan(projectId, workflowId)` and WRB04 execution projection must:
- exclude the voided decomposition source;
- include replacement WorkItems;
- use replacement dependency graph;
- retain historical decomposition provenance for diagnostic/history queries.

Do not merge replacement lineages.

## Acceptance

1. A valid source WorkItem decomposes atomically into 2+ new-lineage same-Workflow replacement WorkItems.
2. `supersedes` semantics and one-current-record-per-lineage remain unchanged.
3. Original becomes `voided/cancelled` and is no longer executable/current in the Workflow execution projection.
4. Required Criteria are explicitly transferred/elevated/split without obligation loss.
5. Incoming/outgoing dependency semantics are explicitly remapped and acyclic.
6. Cross-Workflow references reject.
7. Post-execution/validation/checkpoint/Repair decomposition rejects.
8. Each replacement has one direct decomposition source at most.
9. Replacement WorkItem may later be decomposed again without lineage ambiguity.
10. Any invalid mapping rolls back the whole mutation.
11. Feature and Issue use the same typed command.

## Validation and report

Run:
- build;
- focused Project State decomposition/relationship tests;
- Workflow execution projection regression;
- Criteria/dependency mapping tests;
- exact transaction rollback proof;
- exact changed-path validation-plan preview;
- work-item profile;
- `git diff --check`.

Do not expand `supersedes` tests except to prove its existing invariants remain intact.

Write the card-specific Implementer Report under the WRB04 `Reports/` directory.

Commit after completion, then proceed to WRB04-02C.
