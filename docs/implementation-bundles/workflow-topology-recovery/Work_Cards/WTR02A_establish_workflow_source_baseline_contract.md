# WTR02A — Establish Workflow SourceBaseline Semantic Contract

**Milestone:** WTR02 — Repository, checkout, MCP, and source ownership contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR01 closed at `fbbe44a5e83499bd6dc50c39879ae6a25a87045f`  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02A_IMPLEMENTER_REPORT.md`

## 1. Objective

Introduce the canonical immutable **SourceBaseline** semantic record owned by a substantive Workflow.

A SourceBaseline records the exact repository revision and integration line against which a Workflow was created/planned:

```text
Workflow
  ← baselines_source —
SourceBaseline

SourceBaseline
  workflowId
  repositoryId
  integrationTargetSourceLineId
  baseRevisionId
```

This card establishes only the semantic baseline contract and typed persistence command.

It does **not** yet:

- convert `SourceBinding` from Work Intake ownership;
- create branches/SourceLines;
- create RepositoryCheckouts;
- materialize worktrees;
- change Work Intake source preparation;
- change SourceCheckpoint or IntegrationRecord ownership;
- change Source Graph;
- change MCP workspace/Git targeting;
- automatically capture a baseline during Workflow creation.

Those are later WTR02 cards.

## 2. Architectural reason for this split

The adopted architecture requires every substantive source-backed Workflow to capture an exact source baseline before mutable source work begins.

The current source model skips that independent concept and stores `baseRevisionId` only inside a Work Intake-owned `SourceBinding`.

Converting `SourceBinding` ownership in this same card would cascade immediately into:

- `SourceCheckpoint.workIntakeId`;
- `IntegrationRecord.workIntakeId`;
- Work Intake source preparation;
- structured checkpoint ownership;
- Source Graph projection.

That is too broad for one Luna Medium card.

WTR02A therefore establishes the immutable baseline primitive first. WTR02B will bind mutable source preparation to Workflow/SourceBaseline.

## 3. Shared provider-neutral contract

Update:

`src/shared/sourceLifecycleContracts.ts`

Add:

```ts
export interface SourceBaseline {
  workflowId: string;
  repositoryId: string;
  integrationTargetSourceLineId: string;
  baseRevisionId: string;
}
```

This interface is semantic/provider-neutral identification only.

Do not change in WTR02A:

- `WorkSourceOwner`;
- `CreateWorkSourceInput`;
- `WorkSourceBinding`;
- `SourceReadiness`;
- checkpoint requests;
- integration candidate requests;
- SourceGraph structures.

Those remain temporarily Work Intake-shaped until their dedicated cards.

## 4. Structured Project State entity

Add `SourceBaseline` to `EntityBodyMap` in:

`src/shared/projectState/domainContracts.ts`

Exact body:

```ts
SourceBaseline: {
  workflowId: EntityId;
  repositoryId: string;
  integrationTargetSourceLineId: string;
  baseRevisionId: string;
};
```

The record envelope already supplies:

- `projectId`;
- immutable identity;
- lineage;
- timestamps;
- attribution.

Do not duplicate Project identity or Workflow type in the body.

## 5. Entity validation

Register `SourceBaseline` in:

`src/shared/projectState/entityTypeRegistry.ts`

Required fields:

- `workflowId` → `id`;
- `repositoryId` → `source-ref`;
- `integrationTargetSourceLineId` → `source-ref`;
- `baseRevisionId` → `source-ref`.

Required policy:

```text
immutableAfterCreation: true
```

No optional fields.

Do not add:

- work SourceLine;
- current revision;
- checkout ID;
- preparation state;
- failure code.

Those belong to mutable SourceBinding/materialization semantics.

## 6. Relationship contract

Update:

`src/shared/projectState/relationshipRegistry.ts`

Add immutable provenance relationship:

```text
baselines_source
from: SourceBaseline
to: Workflow
immutableProvenance: true
```

Also include `SourceBaseline` in the registry's complete EntityType inventory used by generic relationship definitions.

Additional invariant:

- `baselines_source` target must be a substantive Workflow;
- `work-intake-routing` is not a valid target.

The relationship cannot be ended.

Generic `createRelationship(..., "baselines_source", ...)` must be blocked by the Project State service; baseline linkage is created only by the typed baseline command.

## 7. Typed SourceBaseline command

Add to `ProjectStateService`:

```ts
createWorkflowSourceBaseline(
  projectId: ProjectId,
  workflowId: EntityId,
  input: {
    repositoryId: string;
    integrationTargetSourceLineId: string;
    baseRevisionId: string;
  },
  context?: MutationContext
): Promise<ProjectStateRecord<"SourceBaseline">>
```

Required behavior:

1. exact-input validation;
2. owning Project must exist;
3. `workflowId` must identify a Workflow in that Project;
4. Workflow type must not be `work-intake-routing`;
5. Workflow must be current/nonterminal:
   - record lifecycle is `active`;
   - `workflowState` is not `closed` or `cancelled`;
6. all repository/source identifiers must satisfy existing opaque RepositoryService/source-ref validation;
7. a Workflow may have at most one SourceBaseline record for its lifetime;
8. duplicate baseline creation is rejected even if the supplied revision is identical;
9. create one immutable `SourceBaseline` record;
10. create one immutable `baselines_source` relationship from baseline to Workflow;
11. record normal create and relationship-create state/outbox events;
12. no mutation to the Workflow body;
13. no branch, checkout, Git, filesystem, or provider call.

Use the body `workflowId` and relationship endpoint consistently. They must identify the same Workflow.

## 8. Baseline identity is immutable

A SourceBaseline is a historical statement of the exact source state used to establish the Workflow.

Therefore:

- generic `createRecord(..., "SourceBaseline", ...)` must reject and require the typed command;
- `reviseRecord()` must reject SourceBaseline mutation;
- `supersedeRecord()` must reject SourceBaseline supersession;
- generic relationship creation must not create `baselines_source`;
- `endRelationship()` must remain unable to end `baselines_source` because it is immutable provenance.

A changed baseline in the future must be represented by an explicit future baseline-refresh policy, not mutation of this record. That refresh policy is not part of WTR02A.

## 9. WIR explicitly has no SourceBaseline

Prove that:

```text
createWorkflowSourceBaseline(... routingWorkflowId ...)
→ rejected
```

WIR reads Project/repository evidence but does not own implementation source state.

Do not add a SourceBaseline to `createWorkIntake()`.

## 10. Existing SourceBinding remains temporarily unchanged

WTR02A must **not** alter:

```text
SourceBinding.workIntakeId
SourceCheckpoint.workIntakeId
IntegrationRecord.workIntakeId
binds_source: SourceBinding → WorkIntake
```

This is deliberate temporary staging.

Do not add `workflowId` to SourceBinding in this card.

Do not make existing SourceBinding reference SourceBaseline yet.

WTR02B will replace that ownership contract in one bounded step.

## 11. Source-reference projection

Existing authoritative-context source-reference discovery recognizes fields ending in Repository/SourceLine/Revision/Checkout identifiers.

A SourceBaseline included in authoritative context should expose:

- `repositoryId`;
- `integrationTargetSourceLineId`;
- `baseRevisionId`

through the existing source-reference projection mechanism.

If the existing projection already does this automatically, do not add special-case code.

Do not broaden authoritative-context graph traversal merely to pull every SourceBaseline into every Workflow context. The `baselines_source` relationship may make it naturally reachable under existing bounded context traversal; preserve normal relationship semantics.

## 12. Focused permanent proof

Prefer extending existing permanent owners:

- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/source-semantic-references.test.cjs`
- `test/project-state/authoritative-context-event-feed.test.cjs`

Do not add a new permanent test file unless a specific proof cannot be expressed in these owners.

Required proof:

### Domain contract

1. `SourceBaseline` is a registered Project State type;
2. canonical body validates;
3. missing/extra fields are rejected;
4. source-reference bounds are enforced;
5. `baselines_source` is registered;
6. SourceBaseline → substantive Workflow validates;
7. SourceBaseline → WIR Workflow is rejected;
8. `baselines_source` cannot be ended.

### Typed command

9. generic SourceBaseline creation is rejected;
10. generic `baselines_source` creation is rejected;
11. typed creation persists exact repository/target-line/base-revision identifiers;
12. typed creation creates the immutable relationship;
13. second baseline for the same Workflow is rejected atomically;
14. a different substantive Workflow may capture its own independent baseline;
15. WIR baseline creation is rejected;
16. cross-Project Workflow identity is rejected;
17. closed/cancelled Workflow baseline creation is rejected where a suitable current/nonterminal fixture is available without adding lifecycle machinery.

### Immutability

18. generic revision of SourceBaseline is rejected;
19. supersession of SourceBaseline is rejected.

### Context/source references

20. Workflow authoritative context can expose the linked SourceBaseline and its exact source references without Git inspection;
21. baseline creation performs no provider/filesystem work.

## 13. Expected owned files

Expected production scope:

- `src/shared/sourceLifecycleContracts.ts`
- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`

Expected focused test scope:

- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/source-semantic-references.test.cjs`
- `test/project-state/authoritative-context-event-feed.test.cjs`

`validation/capability-map.json` may change only if existing test metadata becomes inaccurate.

Any additional production file requires a direct compile necessity and must be explained in the Implementer Report.

## 14. Explicit non-scope

Do **not** in WTR02A:

- change SourceBinding ownership or fields;
- change `binds_source`;
- change SourceCheckpoint or IntegrationRecord;
- modify `structuredWorkflowCheckpointService.assertWorkOwner()`;
- repair the two inherited source-control test failures;
- change Work Intake capture/source preparation;
- modify `WorkSourceOwner` or work-source branch naming;
- create SourceLines;
- create RepositoryCheckouts/worktrees;
- implement lazy source materialization;
- change Project container/Main/Dev topology;
- change MCP workspace behavior;
- change Source Graph;
- automatically capture baseline inside `createWorkflow()`;
- implement baseline refresh/rebase;
- change renderer/UI;
- add SQLite schema migration code;
- migrate old state;
- begin WTR02B or later work.

SQLite persistence of the new entity must work through the existing generic Project State entity storage. Do not add a dedicated table.

## 15. Known inherited source-control failures

The following tests may still fail when selected because production source control remains Work Intake-owned until later WTR02 cards:

- `test/source-control/source-lifecycle-package.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`

Known exact failure:

`Work Item is not owned by the selected Work Intake workflow.`

Do not repair that in WTR02A.

If affected validation selects these tests and they fail only with that known assertion, record them as inherited WTR02 work rather than widening this card.

All WTR02A-focused Project State proof must pass.

## 16. Acceptance criteria

WTR02A is complete only when:

1. SourceBaseline exists as a first-class immutable Structured Project State entity;
2. its body records Workflow, Repository, integration target SourceLine, and exact base revision identities;
3. only substantive Workflows may own one;
4. one Workflow can capture only one baseline under this contract;
5. different substantive Workflows can capture independent baselines;
6. generic creation/revision/supersession cannot bypass the typed baseline boundary;
7. immutable `baselines_source` provenance exists;
8. authoritative context can expose baseline source references;
9. no SourceBinding/checkpoint/integration ownership changes occur;
10. no Git/MCP/worktree/source-materialization behavior occurs;
11. focused tests pass.

## 17. Validation

Run bounded validation attributable to this card.

Required:

1. `npm run build`;
2. run:
   `node --test test/project-state/domain-contracts.test.cjs test/project-state/source-semantic-references.test.cjs test/project-state/authoritative-context-event-feed.test.cjs`;
3. run validation planner preview for the exact final changed paths using the work-item profile;
4. run `npm run test:affected -- --changes <exact-changed-path manifest>`;
5. `git diff --check`.

If affected validation selects the two inherited WTR02 source-control failures in §15 and they fail only with the recorded ownership assertion, report them separately.

Do not run the broad historical full suite unless selected by the exact changed-path plan.

## 18. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02A_IMPLEMENTER_REPORT.md`

The report must include:

- starting `dev` SHA;
- files created/modified;
- final SourceBaseline body;
- typed creation invariants;
- relationship/immutability behavior;
- focused test changes and permanent test-count impact;
- exact validation results;
- inherited source-control failures separately identified if selected;
- explicit confirmation that SourceBinding, checkpoints, integration, Git, MCP, worktrees, Source Graph, and automatic Workflow baseline capture were not changed.

## 19. Git checkpoint authority and stop boundary

The Operator has already authorized routine card-local Git mechanics for WTR.

After implementation, focused validation, and the Implementer Report:

1. inspect the attributable staged diff;
2. run the repository safety scan;
3. create exactly one WTR02A checkpoint commit.

No additional Operator Git approval is required.

Suggested subject:

`WTR02A establish Workflow SourceBaseline contract`

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card.

Then **STOP**.

Do not begin WTR02B.

The Architect will review WTR02A before the Workflow-owned SourceBinding card is released.
