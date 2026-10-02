# RWS06J-REPAIR01 — Converge Greenfield on the Shared WorkItem Pipeline

**Status:** IMPLEMENTER_READY
**Parent:** RWS06J / RWS06E / RWS06F / RWS06J-A
**Starting checkpoint:** RWS06J-D `057932e5d9d12440c851ed2c5e0e8787271bdba2` plus current E diagnostic-only test/catalog edits
**Execution mode:** CONTINUOUS_BUNDLE_REPAIR — complete this repair, write its report, create its checkpoint, then immediately continue to RWS06J-REPAIR02 in the same run. Do not hand back.

## Defect and architectural finding

Architect source review confirms that Greenfield no longer needs a separate Work Card execution lifecycle after approved Phase Planning.

The repository already implements one shared SQL WorkItem pipeline:

- `isStructuredExecutionWorkflowType()` includes `project-creation`;
- `workflowExecutionApplicationService` explicitly admits `project-creation` alongside all six existing-project execution workflow types;
- the shared execution projection applies dependency, Phase, decision, contract-review, repair, implementation, validation, Tester, checkpoint, and close rules to Greenfield WorkItems;
- `structuredWorkItemPlanningService` uses the same WorkItem contract and `acceptWorkItemExecutionPlan()` path for Greenfield;
- `WorkflowExecutionWorkspace` already owns WorkItem Planning, Implementer, Tester, validation, repair, WorkItem close, Phase close, and integration/Workflow close;
- the only necessary Greenfield execution specialization in `workflowExecutionApplicationService.workItemPlan()` is context selection: bind a Greenfield WorkItem to its one exact accepted Phase direction.

The current defect exists because `GreenfieldWorkspace` and `greenfieldNavigationService` continue a transitional Greenfield-only sequence through:

- `phase-work-card-selection`;
- `work-card-intake`;
- `planningPreparedAt`;
- `work-card-planning`;
- `GreenfieldExecutionWorkspace`.

That duplicate lifecycle is the source of the navigation bug found before RWS06J-E and should be removed rather than repaired as a permanent Greenfield exception.

## Architectural boundary

Greenfield remains intentionally distinct only while it is creating and decomposing the Project:

```text
Project registration/bootstrap
-> Project Intake
-> Architect Interview
-> Project Planning
-> Phase Map
-> Phase Interview
-> Phase Planning
```

Once Phase Planning has produced accepted SQL WorkItems, Greenfield enters the same shared WorkItem pipeline as every other substantive implementation Workflow:

```text
accepted SQL WorkItems
-> shared WorkItem Planning
-> Implementer
-> Tester
-> Validation / Repair
-> WorkItem Close
-> Phase Validation / Close
-> next Phase authoring when required
-> Workflow Integration / Close
```

Phase identity remains context. It is not a separate execution engine.

## Required implementation

### 1. Replace Greenfield WorkItem pseudo-stages with one execution stage

Narrow `GreenfieldNavigationProjection.currentWorkspace` to the Greenfield composition stages actually owned by Greenfield.

The active Greenfield stage set should be equivalent to:

- `project-intake-capture`;
- `architect-interview`;
- `project-planning-review`;
- `project-phase-map`;
- `phase-interview`;
- `phase-planning-bundle`;
- one shared execution destination;
- `workflow-hub` for terminal Workflow state.

Use a dedicated Greenfield stage contract rather than the full legacy `WorkspaceId` universe if that produces a cleaner boundary.

Do not preserve `phase-work-card-selection`, `work-card-intake`, `work-card-planning`, `work-card-building-review`, `work-card-report-review`, `work-card-repair`, or `work-card-close` as Greenfield navigation states.

### 2. Hand approved Phase WorkItems directly to shared execution

After the current Phase Interview and Phase Planning reviews are approved, Greenfield navigation must resolve to the shared execution surface.

`GreenfieldWorkspace` must render `WorkflowExecutionWorkspace` directly for that surface using the exact Project Creation Workflow.

Do not create or preserve a separate Greenfield WorkItem Map/Intake/Planning router.

`WorkItemPlanningWorkspace` is already embedded by the shared execution surface for planned/ready WorkItems and must remain the one typed WorkItem planning UI.

### 3. Preserve Phase authoring between execution segments

The shared execution surface already performs WorkItem and Phase validation/close.

When a Greenfield Phase closes, the outer Greenfield compositor must re-resolve SQL navigation:

- if another accepted Phase requires Interview/Planning, return to the Greenfield Phase authoring surface;
- if another Phase is already ready for execution, remain on shared execution;
- if all Phases are complete, remain on shared execution for final Workflow integration/close;
- if Workflow closes, return to Workflow Hub.

If a callback is needed from `WorkflowExecutionWorkspace`, add one generic optional lifecycle/projection-change callback. It must not contain Greenfield-specific branching inside the shared workspace.

### 4. Keep shared execution selection semantics shared

Do not add a Greenfield-only WorkItem selector.

The shared execution projection remains the authority for:

- dependency blockers;
- prior-Phase blockers;
- active repair ownership;
- contract review requirements;
- WorkItem lifecycle;
- next eligible WorkItems.

If the current shared renderer default selection requires adjustment to avoid selecting an obviously blocked sibling first, make that change generically for all workflows and prove it across existing-workflow and Greenfield projections.

Do not add a Greenfield-only persistent selection field.

### 5. Preserve the one legitimate Greenfield execution adapter

`workflowExecutionApplicationService.workItemPlan()` may retain the narrow `project-creation` adaptation that resolves the WorkItem's exact accepted Phase direction and relevant Phase Criteria.

Do not duplicate implementation, validation, Tester, repair, checkpoint, or close behavior there.

## Preserve

- Project/Greenfield Intake, Architect Interview, Project Planning, Phase Map, Phase Interview, Phase Planning;
- deterministic Phase topology/dependencies;
- exact SQL WorkItem identities generated by Phase Planning;
- shared WorkItem contract semantics;
- RWS06J-B App shell;
- RWS06J-C legacy service retirement;
- RWS06J-D Project-wide structured authority and strict Markdown fence;
- generated Markdown as readability/export only;
- no historical planning-state migration.

## Expected production scope

Primary:

- `src/main/workflow/greenfieldNavigationService.ts`
- `src/shared/greenfieldNavigationContracts.ts`
- `src/renderer/app/GreenfieldWorkspace.tsx`
- `src/renderer/app/WorkflowExecutionWorkspace.tsx` only for a generic parent lifecycle notification or generic selection correction
- `src/renderer/app/StructuredWorkflowWorkspace.tsx` only if routing composition requires it
- focused workflow/phase/renderer tests.

`GreenfieldExecutionWorkspace.tsx` should be deleted if direct shared rendering makes it unreachable.

## Forbidden changes

- no new Greenfield WorkItem state machine;
- no new schema field to replace `planningPreparedAt`;
- no Markdown lifecycle authority;
- no restoration of deleted Work Card UI;
- no project-wide authority change;
- no unrelated Agent Harness or Source Control work;
- no arbitrary historical-document import.

## Regression proof

Prove at minimum:

1. Project Creation remains distinct through approved Phase Planning.
2. Approved Phase Planning hands the same SQL WorkItems to `WorkflowExecutionWorkspace`.
3. Greenfield WorkItem Planning uses `WorkItemPlanningWorkspace` and the same typed contract service as existing-project workflows.
4. Greenfield Implementer/Tester/Validation/Repair/Close uses the same shared IPC/service/UI path.
5. Dependency-blocked WorkItems cannot execute.
6. Phase membership and prior-Phase ordering remain enforced.
7. Closing Phase 1 causes SQL re-resolution to Phase 2 Interview/Planning when required.
8. After Phase 2 Planning, the same shared execution surface resumes.
9. Final Workflow integration/close uses the shared lifecycle.
10. Reopen at each durable boundary derives the same stage from SQL.
11. Historical Markdown edits/deletes do not alter the route.
12. No duplicate WorkItem identity is created.
13. Existing-project execution behavior remains unchanged.
14. `git diff --check` passes.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J-REPAIR01_IMPLEMENTER_REPORT.md`

Include the exact Greenfield/shared boundary before and after, production paths removed, and proof that Project Creation now enters the same execution pipeline after Phase Planning.

## Checkpoint / continuation

Commit:

`RWS06J-R01 converge Greenfield on shared WorkItem pipeline`

After the checkpoint, **do not stop**. Immediately execute RWS06J-REPAIR02.
