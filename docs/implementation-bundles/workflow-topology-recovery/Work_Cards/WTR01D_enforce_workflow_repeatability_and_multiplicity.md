# WTR01D — Enforce Workflow Repeatability and Multiplicity

**Milestone:** WTR01 — Workflow domain contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR01C production implementation at `dbcc1e6fdaa0677b1de1ee650a40c5efe42e1162`; WTR01C Repair01 fixture alignment at `bda5a5812310860adb1e2ef599c25ed7271314db`  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01D_IMPLEMENTER_REPORT.md`

## 1. Objective

Close the WTR01 Workflow-domain milestone by enforcing the repeatability metadata established in WTR01A.

Required domain behavior:

```text
project-creation
→ one Workflow instance per Project lifetime

all seven other canonical Workflow types
→ repeatable
→ multiple concurrent instances allowed
→ no same-type admission gate
```

This card also makes `workflowType` stable across Workflow revision/supersession so the repeatability rule cannot be bypassed by changing an existing Workflow's type.

This is a Project State domain/service rule only.

It does **not** implement the WTR04 Workflow application service, Workflow Hub, direct-start UI, source-control ownership, SourceBaseline capture, or Workflow lifecycle commands.

## 2. Governing repeatability policy

Consume repeatability from the WTR01A registry:

`src/shared/projectState/workflowTypeRegistry.ts`

Do not hardcode a second independent list of repeatable/non-repeatable types.

The canonical policy remains:

| Workflow type | Repeatable |
| --- | --- |
| `project-creation` | No |
| `feature-capability` | Yes |
| `refactor-migration` | Yes |
| `integration-composition` | Yes |
| `infrastructure-platform` | Yes |
| `research-prototype` | Yes |
| `issue-resolution` | Yes |
| `work-intake-routing` | Yes |

## 3. Project Creation is one-time

Update `ProjectStateService.createWorkflow()`.

Before creating a Workflow:

1. obtain the canonical Workflow type definition from the WTR01A registry;
2. if the type is repeatable, do not impose a same-type count/admission restriction;
3. if the type is non-repeatable, inspect existing Workflow records in the Project;
4. if any Workflow record already exists for that non-repeatable type, reject creation.

For the initial registry this means a Project may create `project-creation` only once.

The one-time rule is a Project-lifetime semantic rule, not an active-instance rule.

Therefore a prior `project-creation` record still counts even if it is:

- planned;
- active;
- blocked;
- closed;
- cancelled/voided;
- superseded with a same-type successor.

Do not permit a second Project Creation Workflow merely because the first is no longer active.

Use a clear domain error such as:

```text
Project already has its non-repeatable project-creation Workflow.
```

Exact wording may differ, but the failure must identify the non-repeatable Workflow rule rather than masquerading as a generic database error.

## 4. Repeatable Workflow multiplicity

For every registry entry with `repeatable === true`:

- multiple Workflow records of that type may coexist in one Project;
- multiple active instances are valid;
- titles need not be unique;
- current Workspaces need not be unique;
- creating one type must not block creation of another type;
- the existence of WIR provenance, Work Items, Phases, or another active Workflow must not be an admission gate.

Do not add:

- a global active-Workflow limit;
- a per-type active-Workflow limit;
- a one-active-Workflow-per-Project rule;
- title uniqueness;
- Workspace uniqueness;
- serial workflow admission.

Capacity limits for future RepositoryCheckouts/agents are execution-resource concerns and must not become Workflow-creation semantics.

## 5. Workflow type is immutable

Repeatability cannot be reliable if a Workflow can change type after creation.

Update the generic Project State mutation boundaries so an existing Workflow cannot change `workflowType`.

### Revision

`reviseRecord()` must reject a Workflow patch when:

```text
patch.workflowType exists
AND
patch.workflowType !== current.body.workflowType
```

A no-op patch containing the same `workflowType` may either be accepted under the existing generic revision rules or rejected as unnecessary; do not build new no-op policy for this card.

Do not prohibit title/currentWorkspace changes merely because the entity is a Workflow.

### Supersession

If `supersedeRecord()` is used on a Workflow, the successor must retain the predecessor's `workflowType`.

Reject a replacement that changes the type.

A same-type supersession remains a correction within one Workflow lineage; it is not creation of another Workflow instance for repeatability purposes.

Do not otherwise redesign Workflow supersession in this card.

## 6. Existing creation paths

### Work Intake Routing

`createWorkIntake()` currently creates its WIR Workflow internally rather than calling `createWorkflow()`.

Do not route that implementation through `createWorkflow()` merely for cleanup.

WIR is repeatable, so multiple Work Intakes may continue creating independent `work-intake-routing` Workflow instances.

Add/retain proof that two Work Intakes in one Project result in two distinct routing Workflow IDs.

### Project Planning transitional façade

`projectWorkflowStateFacade.createProjectPlan()` currently creates a `project-creation` Workflow through `createWorkflow()`.

It should naturally receive the one-time rule.

Do not redesign the façade or Greenfield lifecycle here.

A second project plan that attempts another `project-creation` Workflow in the same Project should fail through the service invariant.

## 7. Current-state/query behavior

No new inventory API is required.

Use existing Project State queries/current-state views only for proof that multiple repeatable Workflow instances:

- retain distinct opaque IDs;
- are all queryable;
- are all visible in current Project state subject to existing pagination;
- do not overwrite each other.

Do not implement grouping, display numbering, Workflow Hub cards, or final Workflow inventory projection. WTR04/WTR21 own those concerns.

## 8. Focused permanent proof

Do not create a new permanent test file unless an unavoidable coverage gap is demonstrated.

Prefer extending:

- `test/project-state/execution-completion.test.cjs`
- `test/project-state/work-intake-routing.test.cjs`
- `test/project-state/project-workflow-facade.test.cjs`

The existing `test/project-state/workflow-type-registry.test.cjs` already proves registry metadata and should normally remain unchanged.

Required proof:

### Repeatable multiplicity

1. for each of the seven repeatable canonical Workflow types, create at least two Workflow instances in the same Project;
2. both instances remain independently queryable;
3. IDs are distinct;
4. two instances may use the same title/currentWorkspace without collision;
5. multiple different repeatable types coexist simultaneously;
6. no prior active Workflow blocks another creation;
7. two Work Intakes create two distinct `work-intake-routing` Workflow instances.

The test may use a loop driven by `WORKFLOW_TYPE_REGISTRY` so future metadata drift fails visibly.

### Non-repeatable Project Creation

8. first `project-creation` Workflow creation succeeds;
9. second `project-creation` creation in the same Project is rejected;
10. another Project may independently create its own `project-creation` Workflow;
11. the rejection is atomic: no second Workflow record or create event is persisted.

### Type stability

12. generic Workflow revision cannot change `workflowType`;
13. Workflow supersession cannot change `workflowType`;
14. same-type Workflow supersession, if exercised, does not permit a new independent `project-creation` via `createWorkflow()`.

### Transitional façade

15. a second `createProjectPlan(... workflowType: "project-creation")` for the same Project is rejected by the same service rule rather than creating another Greenfield Workflow.

Do not turn this into WTR25's full multi-workflow qualification scenario.

## 9. Known inherited test dependency

WTR01C Repair01 correctly updated three old fixtures to use independent target Workflows.

Two source-control tests currently fail because `structuredWorkflowCheckpointService.assertWorkOwner()` still assumes substantive Work Items terminate at the WIR Workflow:

- `test/source-control/source-lifecycle-package.test.cjs`
- `test/source-control/structured-workflow-checkpoint.test.cjs`

That production ownership defect is already transferred to WTR02.

For WTR01D:

- do not modify those tests;
- do not modify source-control production code;
- do not restore WIR-owned execution;
- if affected validation selects those tests and they fail **only** with the already-recorded `Work Item is not owned by the selected Work Intake workflow.` assertion, report them as inherited WTR02 blockers rather than WTR01D failures;
- any new/different failure remains attributable until investigated.

Focused WTR01D proof must pass before checkpoint.

## 10. Expected owned files

Expected production scope:

- `src/shared/projectState/projectStateService.ts`

Expected test scope:

- `test/project-state/execution-completion.test.cjs`
- `test/project-state/work-intake-routing.test.cjs`
- `test/project-state/project-workflow-facade.test.cjs`

Only modify `src/shared/projectState/workflowTypeRegistry.ts` if a concrete implementation defect in its existing accessor surface prevents consuming the already-established metadata. Do not change registry values.

`validation/capability-map.json` may change only if existing test metadata becomes inaccurate.

Any additional production file requires a direct compile/runtime necessity documented in the Implementer Report.

## 11. Explicit non-scope

Do **not** in WTR01D:

- implement Workflow list/create/open application services from WTR04;
- add Workflow lifecycle transition commands;
- close/cancel Workflows as part of this card;
- create Workflow Hub UI;
- add direct-start renderer actions;
- create WIR target Workflows automatically;
- change `routes_to` semantics;
- change WorkRoute mapping/handoff;
- change SourceBinding/SourceCheckpoint/IntegrationRecord ownership;
- modify `structuredWorkflowCheckpointService.assertWorkOwner()`;
- modify source-control/checkpoint/integration behavior;
- add SourceBaseline or RepositoryCheckout behavior;
- add branch/worktree mechanics;
- change Project creation/bootstrap;
- change SQLite schema/migrations;
- migrate old Workflow records;
- add compatibility aliases;
- begin WTR02 or WTR04 behavior.

## 12. Acceptance criteria

WTR01D is complete only when:

1. repeatability policy is consumed from the canonical Workflow type registry;
2. all seven repeatable types allow multiple concurrent instances;
3. `project-creation` is limited to one Workflow lineage/instance per Project lifetime;
4. separate Projects may each have their own Project Creation Workflow;
5. duplicate non-repeatable creation fails atomically;
6. Workflow type cannot change by generic revision;
7. Workflow type cannot change through supersession;
8. multiple Work Intakes still produce independent WIR Workflow instances;
9. no serial/global Workflow admission gate is introduced;
10. no WTR02/WTR04/UI/source-control behavior is implemented;
11. focused card-local tests pass.

## 13. Validation

Run bounded validation attributable to this card.

Required:

1. `npm run build`;
2. run:
   - `node --test test/project-state/execution-completion.test.cjs test/project-state/work-intake-routing.test.cjs test/project-state/project-workflow-facade.test.cjs`;
3. run validation planner preview for the exact final changed paths using the work-item profile;
4. run `npm run test:affected -- --changes <exact-changed-path manifest>`;
5. `git diff --check`.

If affected validation reports only the two exact inherited source-control ownership failures identified in §9, record them without widening WTR01D.

Do not run the broad historical full suite unless the exact changed-path plan selects it.

## 14. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01D_IMPLEMENTER_REPORT.md`

The report must include:

- starting `dev` SHA;
- files created/modified;
- how repeatability metadata is consumed;
- exact non-repeatable enforcement semantics;
- proof of multiplicity for repeatable types;
- Workflow type revision/supersession invariant;
- tests reused/modified and permanent test-count change;
- exact validation results;
- inherited WTR02 failures separately identified from card-local results;
- explicit confirmation that no Workflow application-service/UI/source-control/source-baseline behavior was implemented.

## 15. Git checkpoint authority and stop boundary

The Operator has already authorized the routine card-local Git mechanics required by this WTR package.

After implementation, focused validation, and the Implementer Report are complete:

1. inspect the exact attributable staged diff;
2. run the repository safety scan;
3. create exactly one WTR01D checkpoint commit.

Affected validation containing only the two explicitly inherited WTR02 failures in §9 does not prohibit this checkpoint when all WTR01D-focused acceptance proof passes.

Suggested subject:

`WTR01D enforce Workflow repeatability and multiplicity`

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this bounded checkpoint scope.

Then **STOP**.

Do not begin WTR02.

The Architect will review WTR01D before the source-ownership milestone is released.
