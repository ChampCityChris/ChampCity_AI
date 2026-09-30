# WRB02-05 — Qualify Workflow Application/Inventory/Routing and Fence the Legacy WIR Pipeline

**Depends on:** WRB02-04 checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective

Qualify WRB02 as one vertical product outcome, remove the now-replaced Current Project WIR pipeline, and leave WRB03 a clean exact-Workflow handoff boundary.

## 1. Current Project runtime hard fence

For a registered Current Project, the only supported new-work paths are:
- New Project's one-time Project Creation Workflow;
- direct-start repeatable substantive Workflow;
- optional Work Intake Routing Workflow.

WIR ends at target creation/handoff. It must not own or navigate into route-specific assessment/planning/execution/integration after handoff.

Search the Current Project renderer/main/preload path and remove/fence calls into:
- legacy Work Intake branch ownership;
- legacy Markdown route Decision as authority;
- `workIntakeNavigationService` continuation beyond structured WIR;
- routed Work Intake assessment/plan/execution/integration stages;
- `RoutedIssueBridge` as the ownership bridge for new routed Issues;
- legacy Development/Issue type IDs as new-runtime Workflow identity.

## 2. Remove replaced legacy WIR implementation rather than preserve a parallel runtime

After caller migration, inspect these families:
- `workRoutingAssessmentService.ts`;
- `workRouteDecisionService.ts`;
- legacy WIR navigation/routed-workflow services;
- old WIR planning/decomposition/integration services and renderer components whose only production entry was the replaced WIR pipeline.

Delete zero-production-caller modules and their tests when the new structured path fully replaces their capability. Do not keep them solely for compatibility with abandoned in-progress workflows.

If a module still has a genuine reachable non-WIR product caller, retain only that bounded caller and document it in the bundle report. Do not create adapters to keep old WIR behavior alive.

Do not delete the existing Greenfield Project Intake body or other planning surfaces that WRB03/05 still need as temporary UI.

## 3. No-current-project behavior

The project-neutral Landing remains the only entry before Current Project registration.

Do not preserve a hidden generic legacy Work Intake runtime merely because `workIntake:submit` once had a no-Current-Project fallback. If no Current Project is selected, new-runtime Work Intake/Workflow APIs must fail with a bounded 'select/open a Project' result rather than instantiate legacy Markdown state.

Retire fallback tests that exist only to prove abandoned no-Current-Project Work Intake behavior.

## 4. Architecture documentation

Update `CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md` and the WRB02 bundle report with the implemented boundary:
- exact Workflow ID is application navigation identity;
- Hub is grouped instance inventory, not one pipeline;
- Project Creation one-time via New Project;
- repeatable direct starts for Feature, Migration, Integration, Infrastructure, Research, Issue;
- WIR optional and source-neutral;
- WIR Architect recommendation + Operator decision are SPS authority;
- accepted/overridden WIR creates one new target, links provenance, closes immediately;
- direct and routed target creation share source-baseline semantics;
- target-specific planning begins in WRB03.

## 5. Bundle qualification scenarios

Use disposable Current Projects and focused renderer/service tests to prove:

### Non-source Current Project
1. Hub loads with seven actionable/current groups and no Source Control action.
2. Start two Features, two Issues, one Migration; all five exact instances coexist.
3. Open each exact row without entering legacy Development/Issue identity.
4. Start WIR, save intake, prepare/promote Architect assessment without source.
5. Request revision: no target, WIR remains active.
6. Promote revised assessment, accept/override route, create exact target, close WIR, open target.
7. Target has no SourceBaseline/SourceBinding because Project has no Repository.

### Source-backed Current Project
8. Direct Feature captures exact Dev SourceBaseline + unprepared SourceBinding without materializing source.
9. Dirty Dev does not block direct start.
10. WIR remains source-not-applicable and owns no source records.
11. Routed target captures the same exact Dev baseline/binding shape as direct start.
12. Dev unavailable at target-creation preflight leaves WIR open with no partial route Decision/target.

### Greenfield
13. Start New Project owns exactly one Project Creation Workflow.
14. Project Creation is visible but has no Hub start action.
15. Existing Project open creates no automatic substantive/WIR Workflow.

### History/inventory
16. Closed WIR remains visible and points to target.
17. completed substantive Workflow remains visible as history.
18. superseded/voided records do not appear as independent current instances.

### Authority/fence
19. Current Project WIR state is recoverable entirely from SPS plus non-authoritative generated Architect projection/drafts; no Markdown parse is required to discover selected route/target.
20. Current Project routing does not invoke legacy Work Intake branch, routed planning, routed Issue bridge, or old integration pipeline.

## 6. Test strategy

Run the focused WRB02 vertical suite plus WRB01 Current Project foundation regressions and capability-map integrity.

Preview the exact changed-path validation plan. Run bounded selected lanes that fit the lean-test policy. Do not repeatedly execute an 8–10 minute historical dependency sweep merely because shared contracts select it; report preview and focused evidence accurately.

Delete/rewrite tests whose only obligation is abandoned parallel WIR/legacy Workflow behavior. Preserve tests for still-reachable Greenfield or other temporary surfaces.

## 7. Bundle report

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Reports/WRB02-05_BUNDLE_QUALIFICATION_REPORT.md` containing:
- all five card checkpoint SHAs;
- final production services/contracts/UI paths;
- focused qualification evidence;
- legacy modules/tests deleted or intentionally retained with exact remaining caller;
- known deferred WRB03 planning surfaces;
- explicit confirmation that no WRB03/04 shared planning/execution implementation was started.

## Checkpoint and STOP

Create one checkpoint commit: `WRB02-05 qualify Workflow application inventory and routing`.

Then STOP. Do not begin WRB03. Human Architect reviews the complete WRB02 bundle.