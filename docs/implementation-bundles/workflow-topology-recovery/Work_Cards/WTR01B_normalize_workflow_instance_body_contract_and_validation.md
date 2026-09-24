# WTR01B — Normalize Workflow Instance Body Contract and Validation

**Milestone:** WTR01 — Workflow domain contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR01A at `3f50a2de8270be2ebcf0fdcc4c0e4dfb053afba7`; governance clarification at `ac67f474943ea1f5adb5daa04c0566f0dde5a69f`  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01B_IMPLEMENTER_REPORT.md`

## 1. Objective

Replace the old Workflow record body:

```text
workflowType: string
workspace: string
governingEntityId: EntityId
workflowState: WorkflowState
```

with the canonical Workflow-instance body:

```text
workflowType: WorkflowType
title: string
currentWorkspace: string
workflowState: WorkflowState
```

and make Project State validation enforce that contract.

This card establishes the persisted Workflow instance identity/display/current-task contract. It also updates the existing typed Workflow creation seam and only the directly coupled transitional callers required to keep the repository compiling and focused Project State proofs green.

It does **not** implement Workflow provenance, repeatability enforcement, Workflow Hub inventory, source ownership, routing handoff, or the shared execution kernel.

## 2. Architectural reason

The old `governingEntityId` field encodes the topology error discovered in the SCL review: a Workflow is treated as though one semantic entity owns or governs it.

The adopted architecture instead defines a Workflow as a first-class Project-owned instance. Semantic records relate to a Workflow through typed relationships. The Project is already carried by the record envelope as `projectId`.

Therefore the Workflow body must not contain a mandatory single governing semantic owner.

Likewise, `workspace` is ambiguous. The body represents the **current task station**, so the canonical field is `currentWorkspace`.

A durable `title` is required because Workflow identity is not a Git branch, Work Intake ID, route name, or Workspace name.

## 3. Required canonical body

Update `EntityBodyMap["Workflow"]` to exactly:

```ts
{
  workflowType: WorkflowType;
  title: string;
  currentWorkspace: string;
  workflowState: WorkflowState;
}
```

Requirements:

1. `workflowType` uses the `WorkflowType` exported by WTR01A.
2. `title` is required bounded text.
3. `currentWorkspace` is required bounded text.
4. `workflowState` remains:
   - `planned`
   - `active`
   - `blocked`
   - `closed`
   - `cancelled`
5. `workspace` is no longer a supported Workflow body field.
6. `governingEntityId` is no longer a supported Workflow body field.
7. Do not add optional legacy aliases for either removed field.
8. Do not add source fields in this card. SourceBaseline/SourceBinding belongs to WTR02.

## 4. Required validation changes

Update `src/shared/projectState/entityTypeRegistry.ts` so Workflow validation:

- accepts only the eight canonical WTR01A Workflow type IDs;
- requires `title`;
- requires `currentWorkspace`;
- requires `workflowState`;
- rejects legacy/noncanonical types such as:
  - `development`;
  - `work-intake`;
  - `project-planning`;
  - `greenfield`;
- rejects old `workspace`;
- rejects old `governingEntityId`;
- retains ordinary record/text bounds and exact-field rejection.

Reuse `WORKFLOW_TYPE_IDS` from `workflowTypeRegistry.ts`; do not duplicate the eight identifiers as another independently maintained list.

## 5. Typed Workflow creation seam

Update `ProjectStateService.createWorkflow()` to accept exactly:

```ts
{
  workflowType: WorkflowType;
  title: string;
  currentWorkspace: string;
  workflowState?: WorkflowState;
}
```

Required behavior:

- owning Project must still exist;
- default `workflowState` remains `active`;
- no `governingEntityId` argument or lookup remains;
- creation persists only the canonical Workflow body;
- no repeatability/singleton policy is added here;
- no WIR provenance relationship is added here;
- no SourceBaseline is added here.

Do not create a compatibility overload accepting the old body.

## 6. Current Project State Workflow projection

Update the existing `CurrentProjectStateView.workflows` projection only as required to reflect the canonical body.

It should expose:

```text
id
type
title
state
currentWorkspace
```

where:

- `type` comes from `body.workflowType`;
- `title` comes from `body.title`;
- `state` comes from `body.workflowState`;
- `currentWorkspace` comes from `body.currentWorkspace`.

Do not build the final Workflow Hub inventory/projection in this card. WTR04/WTR21 own that work.

## 7. Required coupled caller adaptations

The following old callers are directly coupled to the Workflow body and must be minimally adapted so the new contract compiles and focused proof remains coherent.

### 7.1 Work Intake-created WIR Workflow

`ProjectStateService.createWorkIntake()` may continue, temporarily, to create the Work Intake's own WIR Workflow and `initiates` relationship.

Its Workflow body must become:

```text
workflowType = work-intake-routing
title = the captured Work Intake request
currentWorkspace = work-intake
workflowState = active
```

Do not change WIR routing stages or create the routed substantive target Workflow in WTR01B. WTR01C/WTR06 own those corrections.

### 7.2 Engineering structured façade

`src/main/projectState/engineeringWorkflowStateFacade.ts` is a transitional structured-state seam with no production caller.

For its existing `startDevelopment` path:

- use canonical `feature-capability` as the temporary fixture Workflow type;
- use title `Feature / Capability`;
- use current workspace `development`;
- do not persist or recreate `governingEntityId`.

The existing public parameter may remain temporarily if removing it would create unrelated façade churn, but it must not affect persisted Workflow ownership.

Do not redesign or rename the façade in this card.

### 7.3 Project structured façade

Update `ProjectPlanInput.workflowType` from unrestricted `string` to `WorkflowType`.

When `createProjectPlan()` creates a Workflow:

- derive the display title from the WTR01A Workflow type definition;
- set `currentWorkspace = "project-planning"`;
- do not set `governingEntityId`.

The existing Project Planning fixture/test should use canonical `project-creation` instead of `project-planning`.

Do not treat this as final Greenfield runtime wiring; WTR07 owns that work.

### 7.4 Staged legacy importer compile seam

`src/main/migrations/stagedLegacyImporter.ts` is scheduled for retirement under WTR24 because legacy Workflow migration is no longer product architecture.

If the new `EntityBodyMap["Workflow"]` contract makes this file fail compilation, make only the minimum mechanical body-shape adaptation:

- `workflowType = "work-intake-routing"`;
- `title` from the imported Work Intake request/heading already available in that local scope;
- `currentWorkspace = "work-intake"`;
- preserve its existing `workflowState`;
- remove the old body fields.

Do not add new importer behavior, compatibility mapping, migration semantics, or new tests for this importer. This is compile continuity only until WTR24 deletes the legacy migration stack.

## 8. Existing proof to modify

Do **not** add a new permanent test file for WTR01B unless an unavoidable coverage gap is demonstrated in the Implementer Report.

Prefer extending the existing focused owners:

- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/execution-completion.test.cjs`
- `test/project-state/work-intake-routing.test.cjs`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/engineering-workflow-facade.test.cjs`
- `test/project-state/project-workflow-facade.test.cjs`

Required proof:

1. a canonical Workflow body validates;
2. each representative legacy Workflow type is rejected;
3. old `workspace` and `governingEntityId` fields are rejected as unsupported;
4. missing `title` or `currentWorkspace` is rejected;
5. typed `createWorkflow` creates the canonical body;
6. Current Project State projects type/title/state/currentWorkspace;
7. Work Intake still creates its own WIR Workflow using `work-intake-routing` and preserves the existing Intake→WIR `initiates` relationship for now;
8. the transitional structured façades compile/use canonical Workflow types without introducing aliases.

Modify existing test cases where possible rather than increasing permanent test count.

Update `validation/capability-map.json` only if the existing test catalog metadata actually becomes inaccurate.

## 9. Explicit non-scope

Do **not** in WTR01B:

- add `routes_to` or any other new relationship type;
- change WIR route selection/handoff behavior;
- instantiate Feature/Migration/etc. Workflows from a WIR route decision;
- enforce the `repeatable` registry metadata;
- enforce the one-time Project Creation rule;
- implement same-type multiplicity tests beyond incidental existing behavior;
- add SourceBaseline, SourceBinding, SourceLine, RepositoryCheckout, checkpoint, or integration ownership;
- change WorkRoute identifiers or planning profiles;
- change renderer/UI/Workflow Hub behavior;
- add or change SQLite schema/migrations;
- migrate old Structured Project State records;
- preserve old Workflow body compatibility;
- expand or restore legacy Workflow migration architecture;
- redesign `engineeringWorkflowStateFacade` or `projectWorkflowStateFacade`;
- begin WTR01C or any later card.

Pre-repair Workflow records with the old body are not a migration target. Do not add compatibility code to make them current.

## 10. Expected owned files

Expected production scope:

- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/main/projectState/engineeringWorkflowStateFacade.ts`
- `src/main/projectState/projectWorkflowStateFacade.ts`
- `src/main/migrations/stagedLegacyImporter.ts` only if required for compilation

Expected focused test scope:

- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/execution-completion.test.cjs`
- `test/project-state/work-intake-routing.test.cjs`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/engineering-workflow-facade.test.cjs`
- `test/project-state/project-workflow-facade.test.cjs`

`validation/capability-map.json` may change only if required to keep existing catalog metadata truthful.

Any additional production file requires a concrete compile/runtime necessity documented in the Implementer Report.

## 11. Acceptance criteria

WTR01B is complete only when:

1. `EntityBodyMap["Workflow"]` exactly matches the canonical body in §3;
2. entity validation accepts only WTR01A canonical Workflow types;
3. old Workflow body fields are rejected rather than tolerated;
4. `ProjectStateService.createWorkflow()` accepts/persists only the canonical body;
5. no single governing semantic entity is stored in Workflow body state;
6. the Work Intake-created WIR Workflow uses canonical `work-intake-routing`;
7. the current-state Workflow projection reflects canonical type/title/currentWorkspace;
8. directly coupled transitional callers compile without legacy type aliases;
9. existing focused proof is updated rather than creating redundant new permanent tests;
10. no WTR01C+ behavior is implemented.

## 12. Validation

Run bounded validation attributable to this card.

Required:

1. `npm run build`;
2. run the six focused Project State test files listed in §8;
3. if `validation/capability-map.json` changes, run `node --test test/validation/capability-map.test.cjs`;
4. run validation planner preview for the exact final changed paths using the work-item profile;
5. run `npm run test:affected -- --changes <exact-changed-path manifest>`;
6. `git diff --check`.

Do not run the broad historical full suite unless the validation planner selects it from the exact changed-path set.

A restricted-lane `spawn EPERM` is recorded once and rerun through the repository's normal Windows lane per `AGENTS.md`.

## 13. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01B_IMPLEMENTER_REPORT.md`

The report must include:

- starting `dev` SHA;
- files created/modified;
- final Workflow body contract;
- every directly coupled caller adapted;
- existing tests reused/modified and whether permanent test count changed;
- exact validation commands/results;
- any card-local failure corrected during implementation;
- explicit confirmation that no relationship/provenance, repeatability, source-control, UI, or later-WTR behavior was implemented.

## 14. Git checkpoint authority and stop boundary

The Operator has already authorized the routine card-local Git mechanics required by this WTR package.

After implementation, bounded validation, and the Implementer Report are complete:

1. inspect the exact attributable staged diff;
2. run the repository safety scan;
3. create exactly one card-local checkpoint commit containing only WTR01B changes and its report.

No additional Operator Git approval is required for that checkpoint.

Suggested subject:

`WTR01B normalize Workflow instance contract`

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform any Git action outside this card's bounded checkpoint scope.

Then **STOP**.

Do not begin WTR01C.

The Architect will review WTR01B before the next bounded card is authored or released.
