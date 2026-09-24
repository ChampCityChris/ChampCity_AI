# WTR01C — Establish WIR-to-Target Workflow Provenance

**Milestone:** WTR01 — Workflow domain contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR01B at `d93b472662f90016064e51c08e1ed2758173271c`  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01C_IMPLEMENTER_REPORT.md`

## 1. Objective

Establish the canonical provenance relationship between a Work Intake Routing Workflow and the independent substantive Workflow it routed to.

The canonical relationship is:

```text
WIR Workflow
    routes_to
Target Workflow
```

This is immutable provenance only.

It is **not**:

- parent/child Workflow ownership;
- execution membership;
- Work Item/Phase containment;
- source-control ownership;
- permission/authority;
- a reason for queries or authoritative context to merge the two Workflow graphs.

This card also removes the obsolete `owns_workflow` predicate and renames Work Intake summary/projection fields so the Work Intake's own Workflow is unambiguously the **routing Workflow**, not the routed substantive Workflow.

WTR01C does **not** create a target Workflow when a route is selected. WTR06 owns the routing handoff/application-service behavior.

## 2. Verified current state

The current Structured Project State implementation has:

- `initiates: WorkIntake -> Workflow`, which correctly identifies the WIR Workflow created when a Work Intake is captured;
- an unused `owns_workflow: WorkIntake -> Workflow` relationship definition;
- Workflow-scoped query logic that still recognizes `owns_workflow` as membership;
- `WorkIntakeSummary.workflowId` and `CurrentProjectStateView.workIntakes[].workflowId`, whose name is ambiguous about whether it is the routing Workflow or routed target;
- no `routes_to` relationship;
- no typed command for linking a WIR Workflow to an independently created target Workflow;
- graph/context traversal that would currently treat any new Workflow-to-Workflow edge as contextual membership unless explicitly bounded.

Repository search confirms there are no current production or test creators of `owns_workflow`.

## 3. Canonical relationship contract

Update `src/shared/projectState/relationshipRegistry.ts`.

### Add

```text
routes_to
from: Workflow
to: Workflow
immutableProvenance: true
```

Additional domain invariants for `routes_to`:

1. the source Workflow must have `workflowType === "work-intake-routing"`;
2. the target Workflow must have `workflowType !== "work-intake-routing"`;
3. the existing generic self-edge prohibition remains;
4. both endpoints must belong to the same Project;
5. the relationship cannot be ended.

Do not encode WorkRoute-to-WorkflowType compatibility here. WTR06 owns route handoff mapping.

A non-WIR target such as Feature, Issue, Migration, Research, Infrastructure, Integration, or Project Creation may satisfy the relationship-level type rule. Later workflow policy decides whether that target is valid for a particular route decision.

### Remove

Delete the obsolete `owns_workflow` predicate from `RELATIONSHIP_REGISTRY`.

Do not create an alias from `owns_workflow` to `routes_to`.

No legacy relationship migration is required.

## 4. Typed provenance command

Add one typed Project State service command:

```ts
linkWorkflowRouteTarget(
  projectId: ProjectId,
  routingWorkflowId: EntityId,
  targetWorkflowId: EntityId,
  context?: MutationContext
): Promise<ProjectStateRelationship>
```

Required behavior:

1. both identities must exist in the Project;
2. both records must be Workflows;
3. the source must be `work-intake-routing`;
4. the target must not be `work-intake-routing`;
5. both Workflow records must be current/nonterminal for link creation;
6. one WIR Workflow may have at most one `routes_to` target;
7. one target Workflow may have at most one incoming `routes_to` provenance edge;
8. create exactly one immutable `routes_to` relationship;
9. record the normal relationship-create state-change/outbox receipt against the routing Workflow;
10. do not mutate either Workflow body or lifecycle state.

This is deterministic provenance bookkeeping. It does not require the human Operator principal.

Generic `createRelationship(..., "routes_to", ...)` must reject with the same typed-command pattern used by other protected semantic relationships.

Do not modify `recordRouteDecision()` to call this command in WTR01C.

## 5. Preserve the Work Intake → WIR relationship

Keep:

```text
WorkIntake
    initiates
WIR Workflow
```

`initiates` means exactly: this Work Intake record created/initiated this routing Workflow.

It does **not** mean the Work Intake owns every Workflow later involved in the routed work.

Do not remove, rename, or broaden `initiates` in this card.

## 6. Remove ambiguous Work Intake Workflow naming

Change the Structured Project State interfaces from:

```text
WorkIntakeSummary.workflowId
CurrentProjectStateView.workIntakes[].workflowId
```

to:

```text
routingWorkflowId
targetWorkflowId
```

Required shapes:

```ts
WorkIntakeSummary {
  ...
  routingWorkflowId: EntityId;
  targetWorkflowId: EntityId | null;
  ...
}
```

and:

```ts
CurrentProjectStateView.workIntakes[] {
  id: EntityId;
  state: WorkIntakeState;
  routingWorkflowId: EntityId | null;
  targetWorkflowId: EntityId | null;
  route: CurrentWorkRoute | null;
}
```

Semantics:

- `routingWorkflowId` comes only from the Work Intake's `initiates` edge;
- `targetWorkflowId` comes only from the routing Workflow's `routes_to` edge;
- before handoff/provenance linking, `targetWorkflowId === null`;
- no compatibility `workflowId` property remains.

`getWorkIntakeSummary()` must still require exactly one active `initiates` relationship.

If persisted state somehow contains more than one outgoing `routes_to` edge from that WIR Workflow, treat it as invalid/ambiguous state rather than choosing one.

## 7. Provenance must not become Workflow membership

### 7.1 Workflow-scoped record queries

Update `queryRecordsPage(... { workflowId })` behavior so:

- `initiates` may continue to associate the Work Intake record with its own WIR Workflow context;
- `part_of` continues to define Phase/Work Item membership;
- `owns_workflow` is removed entirely;
- `routes_to` is **not** a membership edge;
- a WIR Workflow query must not include the target Workflow or the target's descendants merely because `routes_to` exists;
- a target Workflow query must not include the WIR Workflow or Work Intake merely because `routes_to` exists.

The provenance relationship may still be retrieved directly through relationship queries.

Do not redesign all Workflow query semantics in this card. Make only the bounded change necessary so `routes_to` cannot bridge two independent Workflow graphs.

### 7.2 Authoritative context

For non-Project authoritative context scopes, `routes_to` must not be traversed as a graph-expansion edge.

Required behavior:

- Workflow context for the WIR does not absorb target Workflow records;
- Workflow context for the target does not absorb WIR records;
- Work Intake context does not absorb target Workflow execution state through `initiates -> routes_to`;
- the `routes_to` edge itself may still appear in returned relationship evidence when one included endpoint is in the context;
- Project-scoped context remains free to include all Project records.

This preserves provenance visibility without converting provenance into ownership.

## 8. Work Intake route decision remains unchanged

WTR01C must preserve the current semantics of `recordRouteDecision()`:

```text
RouteAssessment
→ Operator Decision
→ Work Intake marked routed
```

It must **not** yet:

- create Feature/Issue/Migration/etc. Workflows;
- call `linkWorkflowRouteTarget()`;
- close the WIR Workflow;
- seed target Workflow intake;
- map `WorkRoute` to `WorkflowType`.

Those are WTR06 responsibilities.

A routed Work Intake can therefore temporarily have:

```text
currentRoute != null
targetWorkflowId == null
```

until later handoff logic is implemented.

## 9. Existing proof to modify

Do not add a new permanent test file unless a specific uncovered proof boundary cannot be expressed in the existing owners.

Prefer extending:

- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/work-intake-routing.test.cjs`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/authoritative-context-event-feed.test.cjs`

Required proof:

### Relationship contract

1. `RELATIONSHIP_REGISTRY` contains `routes_to`;
2. `RELATIONSHIP_REGISTRY` no longer contains `owns_workflow`;
3. WIR Workflow → non-WIR Workflow `routes_to` validates;
4. non-WIR Workflow → Workflow `routes_to` is rejected;
5. WIR Workflow → WIR Workflow `routes_to` is rejected;
6. `routes_to` cannot be ended.

### Typed command

7. generic `createRelationship(..., "routes_to", ...)` is rejected;
8. `linkWorkflowRouteTarget()` creates the relationship;
9. a second outgoing target from the same WIR is rejected;
10. a second WIR provenance source for the same target is rejected.

### Summary/projection semantics

11. a newly captured Work Intake reports `routingWorkflowId` and `targetWorkflowId === null`;
12. after explicit typed linking, the same summary reports the target Workflow ID;
13. `workflowId` is no longer present in the Work Intake summary/current-state projection;
14. an Operator route decision alone leaves `targetWorkflowId === null`.

### Isolation

15. WIR Workflow-scoped query results exclude the target Workflow and its Work Items;
16. target Workflow-scoped query results exclude the WIR Workflow and Work Intake;
17. WIR authoritative context excludes target records;
18. target authoritative context excludes WIR records;
19. Project-scoped context can still contain both;
20. provenance remains inspectable as a `routes_to` relationship.

Use synthetic canonical Workflow instances through the existing Project State service. Do not invoke legacy routed execution services.

## 10. Expected owned files

Expected production scope:

- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`

Expected focused test scope:

- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/work-intake-routing.test.cjs`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/authoritative-context-event-feed.test.cjs`

`validation/capability-map.json` may change only if existing test metadata becomes inaccurate.

Any additional production file requires a concrete compile/runtime dependency caused by the renamed summary/view fields and must be explained in the Implementer Report.

## 11. Explicit non-scope

Do **not** in WTR01C:

- create target Workflows from route decisions;
- add direct-start Workflow application services;
- map WorkRoute values to WorkflowType values;
- close WIR automatically after linking;
- change WIR navigation/stages;
- seed or copy Work Intake evidence into target Workflow intake;
- add Workflow repeatability enforcement;
- implement Project Creation singleton enforcement;
- add SourceBaseline, SourceBinding, SourceLine, RepositoryCheckout, checkpoint, or integration changes;
- change Source Graph;
- change renderer/UI/Workflow Hub behavior;
- change planning profiles;
- change WorkRoute identifiers;
- add SQLite schema/migrations;
- migrate old Structured Project State;
- preserve `owns_workflow` as a compatibility alias;
- broaden `routes_to` into generic Workflow hierarchy;
- begin WTR01D or any later WTR card.

## 12. Acceptance criteria

WTR01C is complete only when:

1. `routes_to` is canonical immutable WIR→target Workflow provenance;
2. `owns_workflow` is absent from the relationship registry and production query semantics;
3. only a WIR Workflow can be the `routes_to` source;
4. a WIR Workflow has at most one target;
5. a target Workflow has at most one WIR provenance source;
6. generic relationship creation cannot bypass the typed provenance command;
7. Work Intake summaries distinguish `routingWorkflowId` from nullable `targetWorkflowId`;
8. route selection alone does not create or imply a target Workflow;
9. `routes_to` does not merge independent Workflow query membership;
10. `routes_to` does not bridge non-Project authoritative context traversal;
11. no source-control, UI, handoff, repeatability, or later-WTR behavior is implemented.

## 13. Validation

Run bounded validation attributable to this card.

Required:

1. `npm run build`;
2. run the four focused Project State tests listed in §9;
3. if `validation/capability-map.json` changes, run `node --test test/validation/capability-map.test.cjs`;
4. run validation planner preview for the exact final changed paths using the work-item profile;
5. run `npm run test:affected -- --changes <exact-changed-path manifest>`;
6. `git diff --check`.

Do not run the broad historical full suite unless selected by the exact changed-path validation plan.

Follow the repository's one-time restricted-lane `spawn EPERM` handling in `AGENTS.md`.

## 14. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01C_IMPLEMENTER_REPORT.md`

The report must include:

- starting `dev` SHA;
- files created/modified;
- final `routes_to` relationship semantics;
- removal of `owns_workflow`;
- final Work Intake summary/current-state field names;
- exact Workflow-query/context isolation behavior implemented;
- existing tests reused/modified and whether permanent test count changed;
- exact validation commands/results;
- any card-local failure corrected during implementation;
- explicit confirmation that target creation/handoff, WIR closure, source control, repeatability, UI, and WTR01D+ were not implemented.

## 15. Git checkpoint authority and stop boundary

The Operator has already authorized the routine card-local Git mechanics required by this WTR package.

After implementation, bounded validation, and the Implementer Report are complete:

1. inspect the exact attributable staged diff;
2. run the repository safety scan;
3. create exactly one card-local checkpoint commit containing only WTR01C changes and its report.

No additional Operator Git approval is required.

Suggested subject:

`WTR01C establish WIR target Workflow provenance`

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card's bounded checkpoint scope.

Then **STOP**.

Do not begin WTR01D.

The Architect will review WTR01C before the next bounded card is authored or released.
