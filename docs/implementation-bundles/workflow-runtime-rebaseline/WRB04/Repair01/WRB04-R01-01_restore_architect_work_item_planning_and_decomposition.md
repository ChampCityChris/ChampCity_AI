# WRB04-R01-01 — Restore Architect WorkItem Planning and Typed Decomposition

**Parent:** WRB04 Repair01  
**Depends on:** Repair01 package baseline  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Restore the missing Architect boundary between the accepted Work Item Map and Implementer execution.

The exact shared path must become:

```text
accepted WorkItem Map
→ Architect WorkItem execution planning
→ optional typed decomposition
→ exact execution contract
→ Implementer
```

Do not create a second Plan engine.

The accepted WRB03 WorkItem remains the planning owner. This repair adds only the bounded execution elaboration required by the WRB04 baseline.

## 1. Add one canonical structured WorkItem execution-plan value

The current exact Implementer adapter synthesizes:

- `affectedPaths: []`;
- one generic proof intent.

That is not an Architect plan.

Add a backward-compatible optional structured execution-plan value to the exact WorkItem record.

Use a bounded shape equivalent to:

```ts
executionPlan?: {
  implementationBoundaries: string[];
  affectedPaths: string[];
  proofIntent: string[];
}
```

Requirements:

- `implementationBoundaries` is non-empty and bounded;
- `proofIntent` is non-empty and bounded;
- `affectedPaths` is a bounded unique repository-relative list and may be empty when source-neutral or when the Architect explicitly establishes a non-path implementation boundary;
- no absolute path;
- no `..`;
- no concrete machine-local path;
- no raw prompt or full Architect transcript stored in SPS.

Use the WorkItem's normal record version as the concurrency/freshness boundary.

Do not put this structured state into:
- Decision rationale;
- Markdown;
- a renderer-only map;
- a JSON sidecar.

If extending the WorkItem body is materially incompatible with the generic Project State persistence/validation contract, stop for Architect review rather than inventing a second authority entity.

## 2. Add one typed acceptance command

Add an application/Project State command equivalent to:

`acceptWorkItemExecutionPlan(projectId, workflowId, workItemId, expectedVersion, plan)`

Preflight:

- exact current Feature/Issue Workflow;
- exact current WorkItem owned by that Workflow;
- WorkItem is `planned|ready`;
- no ImplementationRecord;
- no TesterResult/Validation;
- no SourceCheckpoint tied to the WorkItem/attempt;
- no active Repair child;
- expected WorkItem version current;
- plan bounded and valid.

Success:

- revise only the exact WorkItem;
- preserve objective/kind/ownership/dependencies/Criteria;
- persist the structured execution plan;
- increment the WorkItem record version;
- retain `planned|ready` semantics;
- return the current exact execution projection.

The Operator applying the reviewed Architect result is sufficient authority for this mutation. Do not add a second approval Decision merely to accept WorkItem execution elaboration.

## 3. Restore the Architect-facing WorkItem planning surface

The normal shared Workspace must not make the Operator manually invent raw domain JSON as the primary UX.

Add a bounded **WorkItem Planning** section before Run Implementer.

Reuse the existing embedded Architect/browser/handoff interaction pattern where practical.

The Architect handoff must contain:

- exact Workflow ID;
- exact WorkItem ID/version;
- WorkItem objective;
- accepted BoundedSolution;
- WorkItem Criteria;
- accepted-solution Criteria that completion will enforce;
- phase context when present;
- dependencies;
- solution scope/constraints;
- SourceBaseline/source-neutral context;
- current repository evidence available to Architect;
- request for:
  - implementation boundaries;
  - affected paths/services/contracts;
  - focused proof intent;
  - whether decomposition is required.

The accepted result must be bounded structured data.

A raw JSON import/debug fallback is acceptable, but a JSON textarea cannot be the only normal Architect UX.

No Markdown Work Card becomes execution authority.

## 4. Wire typed decomposition through the exact application boundary

Expose the existing canonical `ProjectStateService.decomposeWorkItem()` command through:

- exact Workflow application service;
- IPC;
- preload;
- shared Workspace.

Do not duplicate its graph algorithm.

The application command accepts the existing typed decomposition semantics:

- exact Workflow/WorkItem/version;
- 2..N replacement candidates;
- Criterion dispositions:
  - transfer;
  - elevate to existing Phase/solution;
  - split;
- incoming dependent mappings;
- replacement dependency mapping.

The renderer must present/review the proposed replacement WorkItems, Criterion mapping, and dependency remapping before Apply.

No generic `createRelationship` writes from the renderer.

On success:

- original becomes historical `voided/cancelled`;
- replacements become the current WorkItems;
- `decomposed_into` history remains visible;
- current exact execution projection refreshes from SPS;
- no implementation session starts automatically.

## 5. Exact Implementer must consume the persisted Architect plan

Remove the hard-coded exact-mode values:

- `affectedPaths: []`;
- generic-only proof intent.

Exact Implementer context creation must:

- require a current accepted WorkItem execution plan;
- pass its exact affected paths and proof intent into `WorkItemExecutionContract`;
- include its implementation boundaries in the exact Implementer prompt/context;
- bind the contract digest to the persisted WorkItem version/plan;
- reject a stale plan after WorkItem revision/decomposition.

The exact contract must expose every completion-relevant required Criterion governed by:

- the WorkItem; and
- its one accepted BoundedSolution.

Do not let accepted-solution Criteria become a later Validator surprise.

Tester/Validator may continue selecting their own policy-specific evidence, but the Implementer must see the obligations it is expected to satisfy.

## 6. Reopen/recovery

Close/reopen the Project after WorkItem execution planning and prove:

- exact WorkItem execution plan returns from SPS;
- no renderer-memory reconstruction;
- no Markdown dependency;
- Run Implementer uses the same persisted plan/version;
- decomposition history/current replacements recover correctly.

## Permanent proof

At minimum prove:

1. source-backed WorkItem cannot start exact Implementer before execution planning is accepted;
2. source-neutral WorkItem cannot start exact Implementer before execution planning is accepted;
3. accepted execution plan survives SQLite reopen;
4. exact Implementer contract contains persisted affected paths and proof intent rather than hard-coded defaults;
5. exact Implementer contract includes WorkItem + accepted-solution required Criteria;
6. stale WorkItem version rejects plan acceptance;
7. WorkItem with implementation evidence rejects decomposition;
8. valid 2+ replacement decomposition uses the existing atomic domain command;
9. transferred/elevated/split Criteria remain complete;
10. incoming/outgoing dependencies are remapped exactly;
11. source WorkItem is excluded from current execution after successful decomposition;
12. replacements appear in exact Workflow execution projection;
13. same-title peer Workflow cannot plan/decompose this WorkItem;
14. direct and WIR-routed target Workflows use the same WorkItem planning service;
15. the normal renderer exposes Architect WorkItem planning before Run Implementer.

## Non-scope

Do not implement:

- human visual/Operator Criterion evidence actions;
- Phase validation;
- pending Implementer/Tester approvals/input controls;
- new Workflow families;
- web-client migration;
- integration changes.

Those belong to later Repair01 cards.

## Validation

Run:

- build;
- Project State WorkItem/decomposition focused tests;
- exact Workflow execution application tests;
- exact Implementer contract tests;
- shared renderer WorkItem planning/decomposition tests;
- direct/WIR target convergence proof needed for this boundary;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

Do not run the historical full workflow suite.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair01/Reports/WRB04-R01-01_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R01-01 restore Architect WorkItem planning`

Then read WRB04-R01-02 only.
