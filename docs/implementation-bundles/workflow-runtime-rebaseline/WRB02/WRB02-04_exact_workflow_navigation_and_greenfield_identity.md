# WRB02-04 — Converge Current Project Navigation on Exact Workflow Instances and Bind Greenfield to Project Creation

**Depends on:** WRB02-03 checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective

Finish the Current Project application/navigation cut so every reachable new-runtime workflow surface is anchored to an exact SPS Workflow instance.

This card also gives New Project its one-time Project Creation/Greenfield Workflow identity. It does not normalize Greenfield planning yet; WRB05 owns that front half.

## 1. One-time Project Creation Workflow on New Project

After Greenfield Current Project/source bootstrap succeeds, create exactly one `project-creation` Workflow using the WRB02-01 application/source-baseline semantics.

Required:
- title is the Project name or a bounded deterministic Project-creation title;
- `currentWorkspace = project-intake` from the canonical registry;
- source-backed Greenfield captures exact Dev SourceBaseline + unprepared SourceBinding;
- no Workflow SourceLine/checkout is materialized;
- non-repeatability remains enforced by Project State;
- retries/reopen must return the existing current Project Creation Workflow rather than create another.

`Start New Project` must select this exact Workflow ID and render the existing Project Intake front-half workspace under that Workflow identity.

Do not rewrite Project Intake/Architect Interview/Project Planning in this card. The existing Greenfield UI remains the temporary body owned by the Project Creation Workflow.

## 2. Existing Project entry

Existing Project continues to land at Workflow Hub. It does not auto-create Project Creation, WIR, Feature, Issue, or any other Workflow.

Historical abandoned Workflow records from old Project identities remain invisible to the Current Project inventory.

## 3. Exact Workflow selection is the Current Project navigation key

Renderer state for the new runtime must use exact `selectedWorkflowId`.

Required foreground routing:
- selected `project-creation` → existing Greenfield Project Intake/front-half body;
- selected active `work-intake-routing` → exact WorkIntake/WIR routing body;
- selected substantive repeatable Workflow → WRB02 generic exact-instance shell until WRB03 implements its planning front half;
- no selection → Workflow Hub.

Type is presentation/dispatch metadata after exact instance selection; type is never the identity key.

## 4. WIR save/open lifecycle

After source-neutral Work Intake save:
- refresh Workflow inventory;
- resolve the exact WIR Workflow linked by `initiates`;
- select that Workflow ID;
- open routing assessment directly.

Opening an active WIR row from Hub does the same.

Opening a closed WIR row shows a bounded completed routing summary including its exact target Workflow and an action to open that target; it must not reopen routing controls.

## 5. Routed target transition

After WRB02-03 accept/override returns a target Workflow ID:
- select the exact target;
- refresh inventory;
- show the target instance shell;
- the now-closed WIR remains visible as completed history;
- Back to Workflows returns to Hub without re-entering WIR.

## 6. Fence old Current Project navigation

The Current Project path must no longer use these as authority/navigation:
- `activeWorkflowId` values `development` or `issue-resolution`;
- `workIntakeNavigationService` stages that continue WIR into assessment/plan/execution/integration;
- `RoutedIssueBridge` as WIR target ownership;
- legacy Issue inventory as the identity for a newly started/routed Issue Workflow.

Do not delete a module solely because it still serves an explicitly unreplaced no-Current-Project legacy fallback. But no Current Project Hub/WIR/Project Creation action may enter it.

## 7. Hub Project Creation representation

When Project Creation exists, Hub inventory shows the exact one-time instance and state. It has no `+ Start Project Creation` action.

During an active Greenfield front half, Back to Workflows may show the Hub with that active Project Creation instance; reopening it returns to the same exact Project Creation identity.

## 8. Permanent proof

Add/extend renderer/application proof for:
- New Project creates exactly one Project Creation Workflow and selects its exact ID;
- reopen/retry does not create a second Project Creation Workflow;
- Existing Project creates no automatic Workflow;
- Project Creation inventory has no start action;
- Work Intake save selects exact WIR Workflow ID;
- active WIR row reopens exact intake/routing;
- closed WIR row cannot route again and links to exact target;
- routed target opens exact target Workflow ID;
- direct Issue/Feature instances do not enter legacy Issue/Development identity paths;
- new runtime no longer calls legacy Work Intake navigation to continue WIR beyond routing.

## Non-scope

Do not normalize Greenfield planning into SPS WorkItems/Phases, implement Feature/Issue planning, build shared execution, or delete all legacy backend modules.

## Validation

Run build, Workflow application/Hub tests, Greenfield Current Project entry/bootstrap regressions, structured WIR tests, renderer navigation tests, validation-plan preview, bounded affected lanes if reasonable, and `git diff --check`.

## Report/checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Reports/WRB02-04_IMPLEMENTER_REPORT.md`.

Suggested commit: `WRB02-04 converge navigation on exact Workflow instances`.

Then proceed directly to WRB02-05.