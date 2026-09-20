# WIR04-REPAIR01 — Repair Work Intake Workspace Layout and Form UX

**Repair order:** 7 of 7  
**Parent / failed workflow:** WIR04 visual acceptance deferred; Operator visual review 2026-09-20  
**Failed/Operator evidence:** `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR04-REPAIR01_IMPLEMENTER_REPORT.md`

## Verified Evidence

- Failed review evidence: `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`.
- Repair evidence summary: `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`.
- Governing architecture: `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`.
- Repair standard: `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`.
- Last passing implementation checkpoint before repairs is WIR21 at `45c04027705fb9beeffc8f78e5ce2887e63645c2`; WIR22 has no passing checkpoint.

At repair start, re-inspect the named production surfaces and the latest passing repair report. Stop on material mismatch rather than widening scope.

## Confirmed Defect

The running Work Intake screen is visually malformed: title/navigation occupy an empty left grid column, the form is compressed into the right half of a wide Workspace, the checkbox is detached from its label, and the Save action lacks clear primary hierarchy.

## Root Cause

`WorkIntakeWorkspace.tsx` applies the generic two-column `.intake-form` class to the entire Workspace section instead of to the form itself. The checkbox does not use the existing `.checkbox-row` structure, and Work Intake does not consume the governed intake Workspace layout used elsewhere.

## Repair Objective

Repair only the Work Intake Workspace layout and form interaction so it behaves as a coherent bounded intake form across standard and constrained desktop sizes. Preserve WIR22 ownership of the Workflow Hub Start Work redesign.

## Required Correction

1. Separate Workspace layout from form layout: use a dedicated governed Work Intake Workspace wrapper/header/action region and apply form styling only to the actual `<form>`.
2. Reuse the existing ChampCity intake Workspace/layout/tokens where suitable rather than adding a new visual system or a screen-specific CSS override pile.
3. Place title, concise task instruction, and Back navigation in a coherent header/context region; Back is secondary navigation, not a competing primary action.
4. Use purposeful bounded form width. Short fields may share columns when useful; long work-request/outcome/constraints/evidence fields must receive readable working width and reflow to one column when constrained.
5. Render the existing-source/planning checkbox as a real aligned checkbox row with its text attached to the control and an accessible label.
6. Give `Save Work Intake` clear primary-action treatment and keep blocked/error explanation adjacent to the action/task context.
7. Keep integration/base-branch selection visible because it affects the consequential branch action; add concise supporting text only if necessary to distinguish target/base branch from the automatically created work branch.
8. Preserve typed form state across normal resize and error retry; saved confirmation and routing panel must follow the form coherently rather than reintroduce two-column Workspace cells.
9. Do not polish or redesign the transitional Workflow Hub; original WIR22 owns removal of the floating `Capture Work Intake` entry and canonical Start Work presentation.

## Preserved Behavior

- All WIR03/WIR04 branch/persistence behavior and form data fields.
- Routing panel behavior after save/current Intake.
- Dark/light theme tokens and existing ChampCity visual system.
- No workflow legality or route decisions in renderer.

## In-Scope Surface to Inspect

- `src/renderer/app/WorkIntakeWorkspace.tsx`
- `src/renderer/app/App.tsx only if a Workspace wrapper class is required`
- `src/renderer/styles.css existing intake/layout rules`
- `test/project-intake/post-submit-review-state.test.cjs`
- `test/renderer/figma-redesign-shell.test.cjs`
- `UI governance standard`

Only modify files required for this repair.

## Negative Constraints

- Do not redesign Workflow Hub; WIR22 owns it.
- Do not alter Work Intake persistence/branch semantics.
- Do not create decorative filler for unused wide space.
- Do not introduce new component library/palette/typography.
- Do not use absolute positioning or fixed viewport hacks.

## Acceptance Criteria

1. Standard desktop layout presents one coherent Work Intake task surface with no accidental empty left column or half-width form compression.
2. At 1024×768 (or equivalent constrained CSS viewport), all fields and Save/Back actions remain reachable without horizontal page overflow.
3. Checkbox and label are visibly and semantically associated.
4. Save Work Intake is the dominant task action; Back remains clear secondary navigation.
5. Dark and light themes retain readable controls/labels/focus.
6. Error/blocked/saved/current-intake states remain usable and do not destroy draft input.
7. Targeted screenshots/visual evidence show the repaired running Workspace at standard and constrained width; report records viewport/theme/build.

## Regression Proof

Inspect existing tests and `validation/capability-map.json` before adding proof. Prefer reuse/extension; every new permanent test needs a distinct uncovered contract/failure-mode justification.

Required commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/project-intake/post-submit-review-state.test.cjs test/renderer/figma-redesign-shell.test.cjs`

Do not run the full suite; WIR23 owns bundle-wide regression.

## Repair Implementer Report

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR04-REPAIR01_IMPLEMENTER_REPORT.md` with starting checkpoint/dependency reports, confirmed defect/root cause, files changed, exact proof, commands/results, test categories, deviations/blockers, and remaining human validation.

## Source-Control Checkpoint

After this repair and required validation pass, create exactly one harness-managed checkpoint commit:

`WIR04-REPAIR01: Repair Work Intake Workspace Layout and Form UX`

Do not merge, tag, release, or publish.

## Manual Validation

Required evidence capture, but no between-card Operator gate: run the current application and capture/review the Work Intake Workspace in dark theme at a standard viewport and a constrained viewport; sample light theme/control focus as applicable. Record exact viewport/build in the Repair Report. Final Operator visual acceptance remains WIR23.

## Return to Workflow

After the verified repair checkpoint, read the original `WIR22_make_start_work_the_canonical_workflow_hub_entry.md` fresh from the repository and execute WIR22 normally. WIR22 must rerun its own dependency verification and acceptance; do not treat the prior blocked report as a pass.
