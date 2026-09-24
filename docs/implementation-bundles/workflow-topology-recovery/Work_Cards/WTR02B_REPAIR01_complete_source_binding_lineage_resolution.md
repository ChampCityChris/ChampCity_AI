# WTR02B Repair01 — Complete Workflow-Lineage SourceBinding Resolution

**Parent card:** WTR02B — Convert SourceBinding Ownership to Workflow and SourceBaseline  
**Implementer:** GPT 6.0 Luna Medium  
**Architect finding:** the canonical SourceBinding cut is correct, but several transitional consumers still resolve ownership by exact Workflow entity ID instead of Workflow lineage; the low-level binds_source relationship validator also omits the required SourceBaseline-lineage invariant  
**Starting implementation checkpoint:** `3273c41a529fd4ec610a6a9e7260eb8d7ced50e0`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02B_REPAIR01_IMPLEMENTER_REPORT.md`

## 1. Objective

Finish the WTR02B ownership cut by applying one invariant consistently:

```text
SourceBinding ownership
= Workflow lineage

not
= one exact Workflow entity ID
```

WTR01 established that Workflow supersession creates a successor entity ID in the same Workflow lineage.

WTR02A established that the immutable SourceBaseline belongs to the Workflow lineage and remains attached to the original Workflow record.

WTR02B explicitly allows this valid sequence:

```text
Workflow A
→ SourceBaseline captured against Workflow A
→ Workflow A superseded by Workflow A'
→ SourceBinding created for current Workflow A'
→ SourceBinding references original SourceBaseline
```

The current WTR02B implementation handles this correctly in the Project State typed binding command, but not consistently in all transitional consumers.

## 2. Finding A — intake-keyed SourceBinding lookup uses exact Workflow ID

Current code in these services filters SourceBinding with exact equality:

```text
binding.workflowId === summary.targetWorkflowId
```

Affected production:

- `src/main/sourceControl/semanticCheckpointService.ts`
- `src/main/sourceControl/structuredWorkflowCheckpointService.ts`
- `src/main/sourceControl/structuredIntegrationService.ts`

This fails when WIR `routes_to` preserves the original target Workflow record but the valid SourceBinding is attached to a current supersession successor in the same lineage.

### Required correction

For every intake-keyed transitional caller:

1. resolve `summary.targetWorkflowId`;
2. load that Workflow;
3. derive its canonical `lineageId`;
4. collect all Workflow entity IDs in that lineage;
5. select active SourceBinding records whose `body.workflowId` belongs to that lineage;
6. require exactly one binding;
7. validate the binding's SourceBaseline owner Workflow belongs to the same lineage.

Do not rewrite or move the immutable `routes_to` edge.

Do not require `SourceBinding.workflowId === summary.targetWorkflowId`.

The target identity is a provenance anchor; lineage is the ownership boundary.

## 3. Finding B — semanticCheckpointService uses exact baseline owner ID

Current `semanticCheckpointService` additionally rejects unless:

```ts
baseline.body.workflowId === binding.body.workflowId
```

That contradicts the valid supersession case defined above.

Replace exact-ID validation with lineage validation:

```text
binding Workflow lineage
==
SourceBaseline owner Workflow lineage
```

Missing Workflow/baseline records or mismatched lineages fail closed.

Do not change checkpoint DTO ownership or persisted SourceCheckpoint schema.

## 4. Finding C — binds_source domain validation omits SourceBaseline lineage

The WTR02B card requires the relationship contract itself to establish:

- `SourceBinding.body.workflowId` matches the `binds_source` target;
- referenced SourceBaseline belongs to the same Workflow lineage as that target.

Current `relationshipRegistry.ts` proves only the first item.

### Required correction

For `binds_source`, domain relationship validation must also:

1. resolve `SourceBinding.body.sourceBaselineId`;
2. require a SourceBaseline;
3. resolve that SourceBaseline's owner Workflow;
4. require that baseline owner Workflow and `binds_source` target Workflow share `lineageId`.

Wrong/missing baseline identity must reject the relationship.

Because `validateRelationship()` uses a synchronous lookup, ensure the typed SourceBinding creation path supplies all required records to that lookup when it creates `binds_source`.

Implementation may either:

- specialize the `binds_source` relationship creation in `createWorkflowSourceBinding()`; or
- extend the existing internal relationship-link helper in a narrowly bounded way.

Do not weaken the domain validator merely because generic Project State relationship creation is blocked.

## 5. Finding D — transitional Source Graph must fail closed on invalid lineage

`src/main/sourceControl/sourceGraphService.ts` resolves SourceBinding repository/base information from SourceBaseline but currently does not validate that:

```text
binding Workflow lineage
==
baseline owner Workflow lineage
```

before using the binding.

WTR02B requires invalid Project State to fail closed.

### Required correction

Before a structured SourceBinding participates in repository filtering/projection:

1. resolve binding Workflow;
2. resolve SourceBaseline;
3. resolve baseline owner Workflow;
4. require equal Workflow lineage;
5. reject/mark structured metadata unavailable through the service's existing fail-closed behavior if invalid.

Do not redesign SourceGraph output types.

Direct-start Workflow bindings without WIR provenance remain omitted from the legacy WorkIntake-shaped projection until WTR02H.

## 6. Source-control ownership proof omitted by WTR02B implementation

WTR02B required focused proof that:

1. an intake-keyed caller resolves the target Workflow lineage, not WIR;
2. Work Item ancestry under the target Workflow is accepted;
3. Work Item ancestry under the WIR Workflow is rejected.

The WTR02B implementation changed `assertWorkOwner()` but did not add a permanent source-control proof owner; all selected source-control tests remained old fixtures blocked earlier by deferred source materialization.

Repair01 must add the missing focused proof without implementing WTR02E/F.

### Preferred proof owner

Use an existing source-control permanent test, preferably:

- `test/source-control/structured-workflow-checkpoint.test.cjs`; or
- `test/source-control/semantic-checkpoint-service.test.cjs`.

Build a **manual bounded fixture** rather than relying on Work Intake capture to materialize source.

The fixture may mechanically create a test Git branch/revision itself. That is test setup, not production WTR02E/F behavior.

Required proof:

1. create Project + Work Intake/WIR;
2. create substantive target Workflow;
3. link WIR `routes_to` target;
4. capture SourceBaseline on target;
5. supersede target Workflow before SourceBinding creation;
6. create SourceBinding on successor using the original baseline;
7. mark binding ready using a mechanically prepared test source line/revision;
8. create Work Item under successor/target lineage;
9. prove intake-keyed implementation/disposition ownership does **not** reject that Work Item as wrong owner;
10. create another Work Item under WIR and prove ownership rejects it with the target-Workflow-lineage error.

The successful target-lineage proof may reach a later deterministic checkpoint/provider outcome such as `blocked` if the fixture intentionally does not satisfy all WTR02E/F materialization conditions; it must specifically prove it passed the ownership/binding-lineage guards.

Prefer a fully successful bounded checkpoint only if it can be constructed without changing production materialization behavior.

## 7. Domain proof for binds_source

Extend:

`test/project-state/domain-contracts.test.cjs`

Required proof:

- valid SourceBinding + SourceBaseline + target Workflow lineage → `binds_source` validates;
- SourceBinding whose `sourceBaselineId` belongs to an unrelated Workflow lineage → `binds_source` rejects;
- WIR target remains rejected.

Use the actual domain relationship helper, not only the Project State typed service.

## 8. Project State proof for successor binding

Extend the existing SourceBinding proof in:

`test/project-state/source-semantic-references.test.cjs`

Add a clean positive case:

```text
Workflow A
→ SourceBaseline A
→ supersede to Workflow A'
→ createWorkflowSourceBinding(A', SourceBaseline A)
→ succeeds
```

Then prove:

- binding body stores successor Workflow ID;
- binding sourceBaselineId remains original baseline;
- `binds_source` targets successor;
- repository semantic view resolves repository from original baseline;
- a second SourceBinding in the same lineage remains rejected.

This is distinct from the existing case where a binding is created before supersession.

## 9. Structured integration lineage resolution

In `structuredIntegrationService.ts`, both:

- completion binding lookup;
- sync binding lookup

must resolve the target Workflow **lineage**, not exact `targetWorkflowId`.

Use the same invariant in both paths.

Do not change IntegrationRecord persisted ownership.

## 10. No duplicate ownership helpers with different semantics

The three intake-keyed services currently perform similar binding lookup independently.

Repair01 may use small local helpers or one narrowly scoped internal helper, but all three must implement identical semantics:

```text
target Workflow
→ lineage
→ unique active SourceBinding in lineage
→ SourceBaseline owner Workflow in same lineage
```

Do not introduce a new public application service or Workflow service. WTR04 owns those concerns.

## 11. Expected production scope

Expected:

- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/main/sourceControl/semanticCheckpointService.ts`
- `src/main/sourceControl/structuredWorkflowCheckpointService.ts`
- `src/main/sourceControl/structuredIntegrationService.ts`
- `src/main/sourceControl/sourceGraphService.ts`

If a small private helper file is introduced solely to prevent the three transitional services from diverging, explain it in the Implementer Report. Do not create a new public contract/module layer.

Expected tests:

- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/source-semantic-references.test.cjs`
- one existing source-control proof owner from §6
- Source Graph test only if needed to prove fail-closed lineage validation without widening obsolete materialization fixtures.

## 12. Explicit non-scope

Do not:

- change canonical SourceBinding body;
- restore any SourceBinding WorkIntake field;
- change SourceBaseline body;
- move/rewrite `routes_to`;
- move/rewrite historical `baselines_source`;
- change SourceCheckpoint body ownership;
- change IntegrationRecord body ownership;
- change checkpoint/integration DTOs;
- implement Workflow SourceLine creation;
- implement RepositoryCheckout/worktree materialization;
- modify provider `WorkSourceOwner`;
- change Project container topology;
- change MCP behavior;
- finalize Source Graph Workflow identity;
- change Work Intake capture semantics established by WTR02B;
- implement WTR02C+.

## 13. Deferred failures remain deferred

Do not repair old tests whose only failure is that WTR02B intentionally removed Work Intake-time source materialization.

Examples may still include:

- source lifecycle package;
- old greenfield source bootstrap;
- structured integration/checkpoint fixtures that still expect `capture*WorkIntake()` to return a ready branch;
- legacy Source Graph fixtures that require WTR02E/F/H.

Repair01 must distinguish those from the new bounded source-control lineage proof.

## 14. Validation

Required:

1. `npm run build`;
2. focused Project State tests:
   - `node --test test/project-state/domain-contracts.test.cjs test/project-state/source-semantic-references.test.cjs`;
3. run the one modified focused source-control proof owner explicitly;
4. run any modified Source Graph test explicitly;
5. validation planner preview for the exact final changed paths;
6. `npm run test:affected -- --changes <exact-changed-path manifest>`;
7. `git diff --check`.

Focused Repair01-owned tests must pass.

Affected-test failures solely attributable to WTR02E/F/G/H remain reportable as deferred package blockers.

## 15. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02B_REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- starting SHA;
- exact files changed;
- lineage-aware binding selection algorithm;
- semantic checkpoint baseline-lineage correction;
- relationship-domain lineage validation;
- Source Graph fail-closed correction;
- source-control ownership proof;
- focused validation;
- affected failures classified as Repair01 defects vs deferred later-WTR02 work;
- explicit confirmation that no WTR02C+ behavior was implemented.

## 16. Git/report discipline

The WTR02B implementation left a post-commit report-hash edit after its checkpoint. Architect review restored the report to the committed checkpoint state before authoring Repair01.

For Repair01:

- write the Implementer Report before staging;
- create one checkpoint commit after the report is final;
- do **not** edit the committed report afterward merely to insert its own commit hash;
- reporting the final checkpoint hash in the chat return is sufficient.

## 17. Checkpoint and stop

After implementation, focused validation, report, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

`WTR02B Repair01 complete SourceBinding lineage resolution`

No additional Operator Git approval is required.

Then stop. Do not begin WTR02C.
