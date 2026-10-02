# RWS06J-REPAIR02 — Retire Greenfield Work Card Compatibility State and Dead Surfaces

**Status:** IMPLEMENTER_READY
**Parent:** RWS06J-REPAIR01 / RWS06J-C
**Sequence:** immediately after RWS06J-REPAIR01
**Execution mode:** CONTINUOUS_BUNDLE_REPAIR — complete this repair and checkpoint, then immediately execute RWS06J-E-REPAIR01 and RWS06J-E. Do not hand back.

## Objective

Delete the transitional Greenfield-only Work Card preparation machinery made obsolete by convergence on the shared WorkItem pipeline.

This is a reachability-based cleanup card. It must remove dead current-product surfaces without reviving Markdown authority or building a compatibility migration system.

## Verified transitional surfaces

Current source still contains Greenfield-specific execution-preparation concepts that the shared pipeline does not use:

- `planningPreparedAt`;
- `preparePhaseWorkItem()`;
- `workflow:phaseWorkPrepare`;
- `prepareStructuredPhaseWorkItem`;
- `workflow:phaseWorkIntakeGet`;
- `getStructuredPhaseWorkIntake`;
- `DerivedPhaseWorkIntakeWorkspace`;
- `structuredWorkCardMap()`;
- `structuredWorkCardIntake()`;
- `structuredWorkItemContractEligibility()`;
- legacy `work-card-intake` / Work Card Map lifecycle branches.

The shared execution service does not consult `planningPreparedAt`. It derives eligibility from SQL WorkItem state, dependencies, Phase state, Decisions, contract review, repairs, implementation and validation records.

## Required implementation

### 1. Remove active preparation APIs

After RWS06J-REPAIR01 no current renderer should need Phase WorkItem preparation/intake APIs.

Remove the current public surface when no legitimate consumer remains:

- `workflow:phaseWorkPrepare`;
- `workflow:phaseWorkIntakeGet`;
- preload methods;
- shared API contracts;
- `DerivedPhaseWorkIntakeWorkspace`;
- service wrappers used only by those APIs.

Do not replace these with another Greenfield-specific API.

### 2. Remove planningPreparedAt from live semantics

Remove all current reads and writes of `WorkItem.body.planningPreparedAt`.

Remove:

- eligibility/selection logic based on it;
- `preparePhaseWorkItem()` if unreachable;
- Greenfield repair creation code that writes it;
- tests asserting it as lifecycle authority.

Do **not** build a data migration.

Because existing Structured Project State records created during this refactor may already contain this optional field, the schema may temporarily continue to tolerate it as an inert deprecated field if removing it would make existing SQL records unreadable. If retained for that sole compatibility reason:

- it must have no reader/writer in active workflow logic;
- it must not affect routing, eligibility, planning, execution, or repair;
- document that it is tolerated serialized residue, not a supported lifecycle concept.

Do not increment schema versions or create a migration solely to erase this field.

### 3. Delete dead structured Work Card compatibility projections

After shared pipeline convergence, remove `structuredWorkCardMap`, `structuredWorkCardIntake`, and `structuredWorkItemContractEligibility` if reachability shows no current product consumer.

Then follow imports outward and delete dead branches/modules that exist only for the retired Greenfield Work Card loop.

Do not indiscriminately delete old utility modules that remain genuinely reachable from unrelated current functionality. Prove reachability from active main/IPC/preload/application entry points.

### 4. Remove obsolete workspace/presentation residue when safe

Remove now-dead current UI/workspace registrations, CSS blocks, tests, and validation ownership whose only subject is the retired Greenfield Work Card Intake/Map/legacy execution loop.

Historical document classification may remain only where needed to recognize old files as historical/evidence. It must not create an active workspace route.

### 5. Re-run legacy reachability

Search current production entry points for:

- Work Card Intake canonical writers;
- old Work Card Loop state;
- old routed Development execution;
- legacy Architect output catalog/workspaces;
- Work Card validation/repair services.

Delete only those portions proven unreachable from the current structured application after RWS06J-REPAIR01. Report remaining reachable uses and why they are unrelated/current.

The goal is not a blind filename purge; the goal is no dead migrated workflow subsystem retained merely because it existed before.

## Preserve

- shared `WorkflowExecutionWorkspace`;
- `workflowExecutionApplicationService`;
- `structuredWorkItemPlanningService`;
- current Codex Implementer/Tester structured WorkItem path;
- Phase authoring services;
- generated Markdown projections/export;
- historical files in user repositories;
- Project-wide structured authority and strict fence;
- Source Control and Agent Harness.

## Required proof

1. no active product source reads `planningPreparedAt`;
2. no active product source writes `planningPreparedAt`;
3. Phase WorkItem prepare/intake IPC/preload APIs are absent if no consumer remains;
4. Greenfield no longer has Work Card Intake/Map lifecycle routing;
5. shared execution still performs WorkItem planning, execution, validation, repair and close for Project Creation;
6. existing-project workflows remain unchanged;
7. dead tests/catalog entries for removed surfaces are deleted;
8. remaining legacy Work Card-related modules are classified by actual reachable current use;
9. historical Markdown remains inert;
10. build and focused affected proof pass;
11. `git diff --check` passes.

## Expected production scope

Likely:

- `src/main/phasePlanning/structuredPhaseLoopReadProjection.ts`
- `src/main/phasePlanning/structuredPhaseLoopService.ts`
- `src/shared/projectState/projectStateService.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/StructuredPhaseLoopWorkspace.tsx`
- obsolete Work Card compatibility modules proven unreachable
- `src/renderer/styles.css` only for dead presentation cleanup
- corresponding tests / `validation/capability-map.json`.

## Forbidden changes

- no migration framework;
- no new WorkItem-selection persistence field;
- no restoration of Markdown authority;
- no changes to unrelated current subsystems;
- no deletion based only on naming without reachability proof.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J-REPAIR02_IMPLEMENTER_REPORT.md`

Include:

- removed APIs/modules;
- `planningPreparedAt` disposition;
- retained old-looking modules, if any, with exact current consumer;
- validation receipts.

## Checkpoint / continuation

Commit:

`RWS06J-R02 retire Greenfield Work Card compatibility state`

After the checkpoint, **do not stop**. Immediately execute RWS06J-E-REPAIR01, then RWS06J-E.
