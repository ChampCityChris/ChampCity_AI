# Work Intake Routing Repair Evidence — 2026-09-20

## Purpose

This document records the evidence that stopped WIR22 and the Operator-observed UI defects that must be repaired before WIR22/WIR23 resume.

## Evidence A — WIR22 dependency verification blocker

Source: `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`

WIR22 stopped before implementation because approved non-Issue routed Work Plans do not have a production bridge into the established Development Work Card lifecycle.

Verified production facts:

- `src/main/workPlanning/workPlanningKernel.ts` persists approved route-scoped Plans under `planning/work-intake/planning/<intake>/<decision>/PLAN.md`.
- `src/main/planExecution/developmentExecutionAdapter.ts` still projects only legacy `planning/phases/<phaseId>/Work_Card_Plan...` state and fails when that Plan is absent.
- `src/main/workCardIntake/workCardIntakeService.ts` requires approved legacy `Phase_Planning` and `Work_Card_Plan` artifacts before it can prepare a Work Card.
- Work Card target paths, Implementer Reports, validation records, and Repair artifacts are currently phase-scoped through `planning/phases/<phaseId>/...`.
- `src/main/planExecution/issueExecutionPlan.ts` proves the architecture can bind an approved routed Plan to a real execution lifecycle for Issue Resolution, but no equivalent non-Issue Development binding exists.
- Repository search finds no production caller constructing `createPlanExecutor(...)`; the generic executor is therefore not yet a complete routed Development path.
- WIR19–WIR21 implement source-control/integration services, but those services have no complete non-Issue routed Work Item lifecycle to consume.

This is a missing implementation dependency between WIR17 and WIR22. A renderer-only WIR22 patch would conceal the defect rather than repair it.

## Evidence B — Work Intake Workspace visual/interaction defect

Source: Operator screenshots supplied 2026-09-20, plus current renderer/CSS inspection.

Observed behavior on the running application:

- The Work Intake screen places the Workspace title and Back action in a large empty left column while the actual form is compressed into the right column.
- The form uses only roughly half of the useful content width on a wide desktop and leaves a large nonfunctional blank region.
- The existing-source/planning checkbox is visually detached from its label.
- The primary Save Work Intake action has weak hierarchy and reads like unstyled inline content at the bottom of the form.
- Field grouping, return navigation, and primary action do not form one coherent intake task surface.

Confirmed source cause:

- `src/renderer/app/WorkIntakeWorkspace.tsx` applies `className="intake-form"` to the entire Workspace section.
- The generic `.intake-form` rule in `src/renderer/styles.css` is a two-column **form** grid, so every top-level Workspace child (title, instruction, Back button, form) becomes a grid cell.
- The checkbox label in `WorkIntakeWorkspace.tsx` does not use the existing `.checkbox-row` structure/style.
- ChampCity already has a governed intake Workspace/layout pattern under `.figma-intake-workspace` and related intake styles; Work Intake does not currently use that Workspace shell.
- WIR04 explicitly deferred final Operator UI judgment to WIR23, so prior automated WIR04 acceptance did not establish visual acceptance.

Relevant UI governance:

- UI-HCD-01/03: the current task and primary action must be obvious; supporting navigation must not compete with the task.
- UI-VIS-04: spacing/proximity should explain grouping; large displays should use space purposefully rather than leave accidental empty structure.
- UI-LAY-03/07: Workspaces own layout; intake forms should use a bounded form with clear compact behavior.
- UI-INT-02: form labels/control relationships must remain clear.
- UI-TEST-01/06: a local/material Workspace repair requires affected states, constrained/standard widths, targeted visual evidence, and human inspection; a screen can pass structural tests and still fail acceptance.

## Evidence C — Workflow Hub screenshot

The current Workflow Hub still shows Development and Issue Resolution as the primary choices and renders a separate `Capture Work Intake` control outside the Hub card composition.

This is **not a separate repair target before WIR22**. WIR22 explicitly owns:

- Start Work as canonical entry;
- removal/demotion of premature Development/Issue entry assumptions;
- route/topology/branch/progression/integration presentation;
- renderer presentation-only ownership.

The screenshot is retained as acceptance evidence for WIR22/WIR23. The repair bundle must not spend effort polishing the transitional Hub and then replace it again in WIR22.
