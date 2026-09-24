# WTR02B — Convert SourceBinding Ownership to Workflow and SourceBaseline

**Milestone:** WTR02 — Repository, checkout, MCP, and source ownership contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR02A closed at `a73f16098346c7038a15d39f07b3ca03b3a096c5`  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02B_IMPLEMENTER_REPORT.md`

## 1. Objective

Move canonical `SourceBinding` ownership from Work Intake to the substantive Workflow and its immutable WTR02A `SourceBaseline`.

The canonical chain after this card is:

```text
SourceBaseline
  → exact immutable Repository / target SourceLine / base revision
  → belongs to one substantive Workflow lineage

SourceBinding
  → belongs to that substantive Workflow lineage
  → references that exact SourceBaseline
  → carries only mutable source-materialization state
```

A Work Intake may explain why a Workflow exists through WIR provenance, but it is not a SourceBinding owner.

This is a **hard semantic cut**. Do not retain `SourceBinding.workIntakeId` as a compatibility field or alias.

WTR02B does not yet convert the persisted `SourceCheckpoint` or `IntegrationRecord` bodies. Their `workIntakeId` fields remain temporarily until WTR02G. The still-intake-keyed main-process checkpoint/integration APIs therefore use an explicitly bounded provenance adapter in this card.

## 2. Canonical SourceBinding body

Replace the current body:

```text
workIntakeId
repositoryId
integrationTargetSourceLineId
baseRevisionId?
workSourceLineId?
currentRevisionId?
repositoryCheckoutId?
preparationState
failureCode?
```

with exactly:

```ts
SourceBinding: {
  workflowId: EntityId;
  sourceBaselineId: EntityId;
  workSourceLineId?: string;
  currentRevisionId?: string;
  repositoryCheckoutId?: string;
  preparationState: "unprepared" | "preparing" | "ready" | "blocked";
  failureCode?: string;
};
```

Rationale:

- `workflowId` is semantic ownership;
- `sourceBaselineId` identifies the immutable source truth;
- Repository identity, integration target SourceLine, and base revision already belong to `SourceBaseline`;
- duplicating those baseline fields in mutable `SourceBinding` would create two canonical sources of truth.

Therefore remove from SourceBinding:

- `workIntakeId`;
- `repositoryId`;
- `integrationTargetSourceLineId`;
- `baseRevisionId`.

Do not add aliases for them.

## 3. Entity validation

Update `src/shared/projectState/entityTypeRegistry.ts`.

Required SourceBinding fields:

- `workflowId` → `id`;
- `sourceBaselineId` → `id`;
- `preparationState` → existing state set.

Optional fields:

- `workSourceLineId` → `source-ref`;
- `currentRevisionId` → `source-ref`;
- `repositoryCheckoutId` → `source-ref`;
- `failureCode` → bounded text.

Keep `immutableAfterCreation: false`.

The old four ownership/baseline fields are unsupported.

## 4. Relationship ownership

Change:

```text
binds_source:
SourceBinding → WorkIntake
```

to:

```text
binds_source:
SourceBinding → Workflow
```

It remains immutable provenance.

Additional `binds_source` invariants:

1. target must be a substantive Workflow;
2. WIR is not a valid target;
3. `SourceBinding.body.workflowId` must equal the relationship target ID;
4. the referenced `SourceBaseline` must belong to the same Workflow lineage as the target Workflow.

Generic `createRelationship(..., "binds_source", ...)` remains blocked by the typed source semantic command.

Do not add a second WorkIntake relationship as compatibility provenance.

## 5. Typed SourceBinding creation

Replace the Work-Intake-owned creation boundary with:

```ts
createWorkflowSourceBinding(
  projectId: ProjectId,
  workflowId: EntityId,
  sourceBaselineId: EntityId,
  context?: MutationContext
): Promise<ProjectStateRecord<"SourceBinding">>
```

The old `createSourceBinding(projectId, intakeId, ...)` API must not remain as a compatibility alias.

Required behavior:

1. owning Project exists;
2. `workflowId` identifies a substantive Workflow;
3. Workflow is current/nonterminal;
4. `sourceBaselineId` identifies a SourceBaseline in the same Project;
5. SourceBaseline belongs to the same Workflow lineage as `workflowId`;
6. one SourceBinding may exist for a Workflow lineage;
7. duplicate creation through a supersession successor is rejected;
8. body is created with:
   - `workflowId`;
   - `sourceBaselineId`;
   - `preparationState: "unprepared"`;
9. create immutable `binds_source` relationship to the supplied Workflow;
10. record normal state/outbox events;
11. do not create a SourceLine, checkout, branch, worktree, commit, or filesystem artifact.

As with SourceBaseline, ownership is by Workflow lineage even though the body stores the exact current Workflow entity ID.

## 6. SourceBinding update semantics

Update `updateSourceBinding()`.

Allowed mutation fields are only:

```text
preparationState
workSourceLineId
currentRevisionId
repositoryCheckoutId
failureCode
```

Remove `baseRevisionId` from the mutable patch surface.

Retain existing preparation-state transitions unless a compile-correctness issue requires a narrower correction.

Required invariants:

- `currentRevisionId` requires `workSourceLineId`;
- `ready` requires:
  - `workSourceLineId`;
  - `currentRevisionId`;
  - no `failureCode`;
- `blocked` requires `failureCode`;
- SourceBinding may never change `workflowId` or `sourceBaselineId`;
- base revision is always resolved from the referenced immutable SourceBaseline.

Do not require `repositoryCheckoutId` for `ready` yet. Checkout materialization belongs to WTR02F.

## 7. SourceBinding baseline resolution

Where current code needs:

- repository ID;
- integration target SourceLine;
- base revision;

resolve those values from the referenced `SourceBaseline`.

Do not copy those values back into SourceBinding.

A mismatch between:

- `binding.workflowId`;
- `binding.sourceBaselineId`;
- baseline Workflow lineage;

is invalid Project State and must fail closed.

## 8. Current Project State and source semantic view

### CurrentProjectStateView

Change:

```ts
sourceBindings: {
  id;
  workIntakeId;
  preparationState;
  repositoryId;
  currentRevisionId;
}[]
```

to:

```ts
sourceBindings: {
  id: EntityId;
  workflowId: EntityId;
  sourceBaselineId: EntityId;
  preparationState: EntityBodyMap["SourceBinding"]["preparationState"];
  currentRevisionId: string | null;
}[];
```

Do not retain `workIntakeId`.

The Project State view does not need to duplicate baseline repository data.

### getSourceSemanticView(projectId, repositoryId)

Retain the existing repository-filtered API for now.

Resolve SourceBinding repository ownership by:

```text
SourceBinding.sourceBaselineId
→ SourceBaseline.repositoryId
```

Then return the matching bindings plus existing checkpoint/integration relationships.

Do not change the public return shape of `SourceSemanticView` in this card.

## 9. Temporary adapter for SourceCheckpoint and IntegrationRecord

WTR02G owns conversion of these persisted records:

```text
SourceCheckpoint.workIntakeId
IntegrationRecord.workIntakeId
```

WTR02B must not rename or remove those fields.

However `createSourceCheckpoint()` and `createIntegrationRecord()` currently derive their Work Intake ID from `SourceBinding.workIntakeId`, which no longer exists.

Until WTR02G, use this bounded adapter:

```text
SourceBinding.workflowId
→ Workflow lineage
→ inbound WIR routes_to provenance, if any
→ WIR Workflow
→ WorkIntake initiates WIR
→ temporary legacy WorkIntake ID for old checkpoint/integration record
```

Rules:

1. consider `routes_to` targets across the bound Workflow's lineage, so Workflow supersession does not lose WIR provenance;
2. if exactly one Work Intake provenance path exists, use that intake ID only to populate the still-legacy SourceCheckpoint/IntegrationRecord body;
3. if none exists, fail with an explicit transitional error indicating that direct Workflow checkpoint/integration ownership awaits WTR02G;
4. if multiple provenance paths exist, fail as ambiguous;
5. do not add WorkIntake ownership back to SourceBinding;
6. do not create new WorkIntake relationships.

This is a temporary adapter, not the new architecture.

## 10. Existing intake-keyed source-control services

The following current main-process APIs are still keyed by Work Intake and are not redesigned until later WTR02 cards:

- `semanticCheckpointService`;
- `structuredWorkflowCheckpointService`;
- `structuredIntegrationService`.

Make only the minimum adapter changes required by the SourceBinding hard cut.

When these services receive `intakeId`:

```text
getWorkIntakeSummary(intakeId)
→ targetWorkflowId
→ Workflow-owned SourceBinding
→ SourceBaseline for repository/target/base revision data
```

Required fail-closed behavior:

- no target Workflow → no source binding is available;
- no unique Workflow SourceBinding → fail;
- mismatched baseline/Workflow lineage → fail.

### Work Item ownership assertion

The old `assertWorkOwner()` must stop using the WIR Workflow as the execution owner.

For an intake-keyed transitional source-control call:

```text
WorkIntake
→ targetWorkflowId
→ Work Item part_of ancestry must terminate at that target Workflow lineage
```

A Work Item under the WIR Workflow is invalid.

This corrects the known inherited assertion:

`Work Item is not owned by the selected Work Intake workflow.`

Do not change the public intake-keyed request contracts yet. WTR02G owns that cut.

## 11. Work Intake capture no longer owns or materializes source

Current `structuredWorkIntakeService` creates SourceBinding and a work SourceLine during Work Intake capture.

That behavior must stop in WTR02B.

### captureStructuredWorkIntake()

After creating the Work Intake/WIR:

- do not create SourceBinding;
- do not create WorkSource;
- do not create a branch;
- do not capture an implementation SourceBaseline for WIR;
- return/persist the Work Intake successfully.

The structured Work Intake projection may continue using the existing `SourceReadiness` shape as a **presentation compatibility type**, but its `workIntakeId` field is not source ownership.

For a WIR with no routed target/source lifecycle yet, project:

```text
state = unprepared
repositoryId = selected Project repository
workIntakeId = intake identity
```

This is UI/read-model compatibility only.

### retryStructuredWorkIntakeSource()

Before WTR06 creates target Workflows and WTR02E/F materialize Workflow source:

- if the Work Intake has no target Workflow, return unprepared without provider mutation;
- if the target has no Workflow SourceBinding, return unprepared without provider mutation;
- do not create a WorkIntake-owned binding/branch as fallback.

Do not implement Workflow-owned SourceLine creation here. WTR02E/F own that.

### getStructuredWorkIntakeProjection()

It must tolerate Work Intakes with no SourceBinding.

If a WIR has a target Workflow and that Workflow has a SourceBinding, it may project readiness from that binding/baseline.

If there is no target/binding, project unprepared rather than treating state as corrupt.

## 12. Provider/runtime contracts remain temporarily WorkIntake-shaped

Do **not** change in WTR02B:

- `WorkSourceOwner`;
- `CreateWorkSourceInput`;
- provider `WorkSourceBinding`;
- checkpoint request DTOs;
- integration candidate request DTOs;
- SourceGraph public contract.

Those are later WTR02E/G/H cuts.

The key rule is that those transitional DTOs must no longer be used as evidence that canonical Project State SourceBinding is WorkIntake-owned.

## 13. Source Graph transitional compile adapter

WTR02H owns the final Source Graph conversion.

For WTR02B, change only what is required to compile and preserve the existing WorkIntake-shaped projection:

- resolve a binding's repository/base information through SourceBaseline;
- when a Workflow binding has exactly one WIR provenance path, it may continue projecting the corresponding `workIntakeId`;
- direct-start Workflow bindings without WIR provenance may be omitted from the legacy `workBindings` projection until WTR02H;
- do not redesign `SourceGraph` types or UI labels;
- do not change Git graph mechanics.

Document this as a transitional projection adapter in the Implementer Report.

## 14. Legacy migration compile seam

The Operator has already rejected legacy Workflow-state migration as target architecture.

The old staged legacy importer currently reconstructs:

```text
WorkIntake
→ SourceBinding
```

That is no longer representable.

For compile continuity only:

- stop creating canonical SourceBinding from legacy Work Intake branch-binding data;
- stop treating that WorkIntake→SourceBinding equivalence as a required verification fact;
- do not create a fake substantive target Workflow merely to carry imported source state;
- do not add compatibility fields or migration aliases;
- do not expand legacy migration behavior.

WTR24 still owns retirement of the legacy migration/equivalence stack.

## 15. Tests to update

Prefer modifying existing permanent proof owners.

### Project State

- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/source-semantic-references.test.cjs`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/authoritative-context-event-feed.test.cjs` only if directly required

Required proof:

1. SourceBinding canonical body contains `workflowId + sourceBaselineId`, not Work Intake/baseline duplicates;
2. old fields are rejected;
3. `binds_source` targets substantive Workflow;
4. WIR SourceBinding is rejected;
5. SourceBinding baseline must belong to same Workflow lineage;
6. one SourceBinding per Workflow lineage;
7. supersession successor cannot acquire a second binding;
8. independent Workflow lineages can have independent bindings;
9. update semantics use baseline-independent mutable fields only;
10. ready/blocked invariants still hold;
11. current Project State exposes Workflow/baseline identities;
12. `getSourceSemanticView(repositoryId)` resolves repository through SourceBaseline.

### Work Intake source capture

Update:

- `test/work-intake/structured-work-intake-capture.test.cjs`

Required new expectations:

13. WIR capture succeeds without creating SourceBinding;
14. WIR capture does not create a work SourceLine/branch;
15. projection reports unprepared source state before target handoff;
16. retry before target handoff performs no provider mutation and remains unprepared;
17. multiple Work Intakes do not create source branches merely by being captured.

Tests whose sole purpose is deterministic WorkIntake branch collision/materialization should be rewritten to assert that WIR capture no longer performs that operation, not preserved as old behavior.

### Transitional source-control ownership proof

Reuse/adapt existing focused proof where practical to show:

18. intake-keyed ownership validation resolves the target Workflow, not WIR;
19. Work Item under target Workflow is accepted by the ownership assertion when the rest of its required source fixture exists;
20. Work Item under WIR is rejected.

Do not manufacture Workflow-owned branch creation to make full source lifecycle integration tests green before WTR02E/F.

## 16. Known temporary failures after WTR02B

Because WTR02B intentionally stops WIR-time branch/materialization and WTR02E/F have not yet replaced it, source-control integration tests that depend on automatic Work Intake SourceLine creation may remain blocked.

Potential inherited examples include:

- `test/source-control/source-lifecycle-package.test.cjs`;
- `test/source-control/structured-workflow-checkpoint.test.cjs`;
- Source Graph tests whose fixtures assume Work Intake-owned SourceBinding/branches.

These are acceptable only when the failure is directly attributable to not-yet-implemented WTR02E/F/G/H behavior documented in the report.

WTR02B-focused domain and Work Intake capture proof must pass.

Do not weaken canonical SourceBinding ownership to preserve obsolete integration fixtures.

## 17. Expected production scope

Expected canonical-domain files:

- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`

Expected transitional caller files as required by compilation:

- `src/main/workIntake/structuredWorkIntakeService.ts`
- `src/main/sourceControl/semanticCheckpointService.ts`
- `src/main/sourceControl/structuredWorkflowCheckpointService.ts`
- `src/main/sourceControl/structuredIntegrationService.ts`
- `src/main/sourceControl/sourceGraphService.ts`
- `src/main/migrations/stagedLegacyImporter.ts`
- `src/main/migrations/legacyEquivalenceVerification.ts`

Do not modify provider Git mechanics or work-source naming in this card.

Expected tests are those listed in §15 plus directly coupled compile/behavior fixtures.

Any additional production file must be justified as a direct compile dependency in the Implementer Report.

## 18. Explicit non-scope

Do **not** in WTR02B:

- modify `WorkSourceOwner`;
- change provider work-source naming;
- create Workflow SourceLines;
- create RepositoryCheckouts/worktrees;
- implement lazy materialization;
- change branch naming;
- change Project container/Main/Dev topology;
- change MCP workspace/Git targeting;
- change SourceCheckpoint body ownership;
- change IntegrationRecord body ownership;
- change checkpoint/integration request DTOs from Work Intake to Workflow;
- finalize Source Graph Workflow identity;
- create target Workflow from route decision;
- automatically capture SourceBaseline during Workflow creation;
- add baseline refresh/rebase;
- preserve SourceBinding WorkIntake compatibility fields;
- migrate old Workflow/source state;
- begin WTR02C+.

## 19. Acceptance criteria

WTR02B is complete only when:

1. SourceBinding body is structurally keyed to Workflow + SourceBaseline and contains no `workIntakeId`;
2. SourceBinding duplicates no repository/target/base baseline truth;
3. `binds_source` points to substantive Workflow;
4. WIR cannot own SourceBinding;
5. SourceBinding and SourceBaseline must belong to the same Workflow lineage;
6. one SourceBinding exists per Workflow lineage;
7. current Project State exposes Workflow/baseline SourceBinding ownership;
8. repository-filtered source semantic view resolves repository through SourceBaseline;
9. old checkpoint/integration records remain unchanged and use only the bounded provenance adapter;
10. old intake-keyed source-control services resolve target Workflow rather than WIR;
11. WIR capture no longer creates SourceBinding or SourceLine;
12. no provider/source materialization replacement is implemented yet;
13. legacy importer does not create fake canonical WorkIntake-owned SourceBinding;
14. focused Project State and Work Intake capture proof passes;
15. no WTR02C+ behavior is implemented.

## 20. Validation

Run bounded validation attributable to this card.

Required:

1. `npm run build`;
2. focused tests:
   - `node --test test/project-state/domain-contracts.test.cjs test/project-state/source-semantic-references.test.cjs test/project-state/current-state-queries.test.cjs test/work-intake/structured-work-intake-capture.test.cjs`;
3. run any directly modified source-control unit/focused test that can execute without WTR02E/F materialization;
4. validation planner preview for exact final changed paths using the work-item profile;
5. `npm run test:affected -- --changes <exact-changed-path manifest>`;
6. `git diff --check`.

Do not run the broad full suite unless selected by the exact changed-path plan.

Affected failures caused solely by explicitly deferred WTR02E/F/G/H behavior may be reported as inherited package blockers. All WTR02B-owned focused proof must pass.

## 21. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02B_IMPLEMENTER_REPORT.md`

The report must include:

- starting `dev` SHA;
- all production/test files changed;
- exact final SourceBinding body;
- SourceBaseline resolution behavior;
- lineage uniqueness behavior;
- `binds_source` endpoint semantics;
- Work Intake capture behavior after removal of source ownership;
- exact transitional mapping used by checkpoint/integration/source-control callers;
- legacy importer/equivalence compile adaptation;
- source graph transitional behavior;
- focused validation results;
- every affected-test failure separated into:
  - WTR02B defect;
  - explicitly deferred WTR02E/F/G/H behavior;
- explicit confirmation that provider work-source ownership, SourceLine materialization, checkout topology, checkpoint/integration body ownership, MCP, and final SourceGraph identity were not implemented.

## 22. Git checkpoint authority and stop boundary

The Operator has already authorized routine card-local Git mechanics for WTR.

After implementation, focused validation, and the Implementer Report:

1. inspect the exact attributable staged diff;
2. run the repository safety scan;
3. create exactly one WTR02B checkpoint commit.

No additional Operator Git approval is required.

Suggested subject:

`WTR02B move SourceBinding ownership to Workflow`

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card.

Then **STOP**.

Do not begin WTR02C.

The Architect will review WTR02B before the Project container/repository-path contract card is released.
