<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR01",
  "artifactType": "work_card",
  "createdAt": "2026-07-17T14:58:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02-REPAIR01 — Living Work Card Plan Closeout and Active Phase Resolution"
  },
  "payloadHash": "sha256:73c9bff5fb03918a05fc4ac08fd69b47fea78c566d3c6ccd42f498aa1832c2b9",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/approval/WC02-REPAIR01",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/approval/WC02",
      "champcity-ai/phase-06/implementer_report/WC02",
      "champcity-ai/phase-06/architect_review/WC02",
      "champcity-ai/phase-06/validation_report/WC02",
      "champcity-ai/phase-04/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-06/phase_activation/phase-06"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "draft_for_operator_review",
  "updatedAt": "2026-07-17T14:58:00.000Z",
  "workCardId": "WC02-REPAIR01"
}
-->

# Work Card: Phase 06 WC02-REPAIR01 — Living Work Card Plan Closeout and Active Phase Resolution

Status: draft_for_operator_review
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR01
Parent Work Card: WC02
Owner: Implementer
Risk: critical
Change strategy: repair implementation and governance-document correction

## Purpose

Repair the WC02 operator-validation failure where the application still routes to `phase-04` `work_card_authoring_required` and presents Ad Hoc Work Card Capture for a stale planned `WC04`.

The repair must make living Work Card Plan governance explicit and ensure closed or historic phase plans do not drive current-action selection.

## Failure Being Repaired

Operator validation for WC02 failed because the application showed `phase-04`, `work_card_authoring_required`, missing expected output `work_card`, Ad Hoc Work Card Capture, and Work Card ID `WC04`.

This is not a valid non-technical Operator validation path. The Operator should not be asked to create JSON/Markdown pairs or manually author a stale phase Work Card to validate WC02.

## Required Design Rule

Work Card Plans are living documents during phase execution.

A Work Card Plan must continue to be updated as the phase changes, including repairs, carried-forward work, deferred work, cancelled candidates, and completed work. At phase closeout, the Work Card Plan becomes a historic artifact describing what occurred during the phase. After phase closeout, that phase’s Work Card Plan must not govern current-action routing.

## Required Implementation

Implement or repair the relationship resolver and related phase-state evidence handling so that closed or historic phase Work Card Plans cannot drive current-action selection, later active phase evidence supersedes older closed-phase planning evidence, stale candidates from a closed phase do not route to ad hoc Work Card authoring, and ambiguous living-plan status blocks with an operator-safe explanation.

## Required Tests

Add or update tests proving that a closed phase Work Card Plan does not drive current-action selection after a later phase is active; stale Phase 04 WC04 does not become the current required action after Phase 04 closeout; ambiguous phase/living-plan status blocks instead of guessing; and the UI/current-action explanation does not require manual JSON/Markdown artifact creation.

## Required Implementer Report

Create a synchronized Implementer Report pair:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-06/implementer_report/WC02-REPAIR01`

## Acceptance Criteria

- Operator validation no longer lands on stale Phase 04 Work Card authoring after Phase 04/05 closeout and Phase 06 activation.
- Closed phase Work Card Plans are treated as historical planning records, not live current-action authority.
- Current-action blockers are understandable to a non-technical Operator.
- The app does not require the Operator to create JSON/Markdown pairs to validate this repair.
- Tests cover closed-phase plan retirement and active-phase selection.
- Implementer Report documents validation.

## Manual Validation After Implementer

Operator validation should be limited to app-level checks:

1. Launch or refresh ChampCity_AI.
2. Confirm the current action no longer routes to stale `phase-04` WC04 ad hoc Work Card authoring.
3. Confirm the current phase/current action reflects the latest valid phase evidence or clearly blocks with an operator-safe explanation.
4. Confirm reference navigation does not retarget current action.
5. Confirm no manual JSON/Markdown artifact editing is required.

## Remaining Passes After Repair

- Architect Review of WC02-REPAIR01.
- Operator validation of WC02-REPAIR01.
- Candidate disposition for WC02.
- WC03 creation only after WC02 is accepted.
