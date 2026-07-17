<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR01",
  "artifactType": "work_card",
  "createdAt": "2026-07-17T17:15:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02-REPAIR01 — Active Phase Lifecycle Resolution and Closed-Phase Plan Demotion"
  },
  "payloadHash": "sha256:6d42538e87cfda4ad088516bcbaa3a942a087e7cddf1671094322fbb5ce4320d",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-04/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-05/phase_closeout/PHASE_05",
      "champcity-ai/phase-06/architect_review/WC02",
      "champcity-ai/phase-06/operator_approval/WC02",
      "champcity-ai/phase-06/operator_approval/WC02-REPAIR01",
      "champcity-ai/phase-06/operator_validation/WC02",
      "champcity-ai/phase-06/phase_activation/phase-06",
      "champcity-ai/phase-06/work_card/WC02"
    ],
    "supersedes": []
  },
  "revision": 4,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T18:10:00.000Z",
  "workCardId": "WC02-REPAIR01"
}
-->

# Work Card: Phase 06 WC02-REPAIR01 — Active Phase Lifecycle Resolution and Closed-Phase Plan Demotion

Status: approved_for_implementer_execution
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR01
Parent Work Card: WC02
Owner: Implementer
Risk: critical
Change strategy: targeted repair based on Architect RCA; no open-ended RCA handoff

## Purpose

Repair the WC02 Operator validation failure where the application displayed `phase-04`, `work_card_authoring_required`, and routed the Operator to Ad Hoc Work Card Capture for stale planned `WC04` after Phase 04 and Phase 05 had already closed and Phase 06 had been activated.

## Architect RCA

The visible defect is that the app selected `phase-04` as live current-action phase and surfaced stale Work Card Plan candidate `WC04`. This is invalid because Phase 04 and Phase 05 have controlling closeout artifacts and Phase 06 has a controlling activation artifact.

The confirmed code-level cause is active-phase lifecycle resolution in `src/main/workflow/relationshipDrivenWorkflowResolver.ts`: phase activation candidates are filtered by sidecar status and payload-data status, but payload status is accepted only when absent or exactly `active`. Phase 06 has sidecar status `active` and payload status `active_for_planning`, so Phase 06 can be silently excluded. Phase 04 and Phase 05 activation artifacts still have sidecar status `active`, and the resolver does not use phase closeout artifacts to retire them from live routing.

The Phase 04 Work Card Plan is visible stale evidence and likely the source of displayed `WC04`, but it is not the sole root cause. The root cause is the incomplete phase lifecycle model: the resolver can exclude the current active planning phase while failing to retire closed phases.

## Required Repair

Repair active-phase lifecycle resolution so that `active_for_planning` is handled intentionally, closed phases with controlling closeout artifacts cannot drive live current-action routing after later activation, and phase succession is derived from explicit lifecycle evidence including closeout expected outputs, activation sources, and phase IDs. Closed-phase Work Card Plans must remain readable as historical artifacts but cannot produce live `work_card_authoring_required`. Contradictory lifecycle evidence must block with a plain-language Operator explanation rather than route to ad hoc Work Card capture.

## Required Code Review Scope

Inspect and document findings for `src/main/workflow/relationshipDrivenWorkflowResolver.ts`, `src/main/repository/repositoryRefreshService.ts`, `src/main/repository/verifiedArtifactGraph.ts`, `src/main/projects/projectWorkspaceRegistry.ts`, current-action main/preload/renderer display paths, and relevant tests under `test/wc01-repair01`, `test/wc02`, and `test/wc02-repair02`.

## Required Tests

Add or update tests proving that Phase 04 closeout plus Phase 05 closeout plus Phase 06 activation does not route to Phase 04 Work Card authoring; `active_for_planning` Phase 06 activation does not silently lose to older active activation artifacts; closed phase Work Card Plans cannot produce live current action; stale Phase 04 planned `WC04` remains historical/reference evidence only; contradictory lifecycle evidence blocks with an Operator-readable explanation; reference controls do not retarget live current action; and workspace registry uses the intended planning root.

## Required Implementer Report

Create `planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR01_active_phase_lifecycle_resolution_closed_phase_plan_demotion.{json,md}` with artifact ID `champcity-ai/phase-06/implementer_report/WC02-REPAIR01`. Include repo/branch/remote verification, Work Card and approval artifacts read, code-review findings, implementation summary, exact root cause confirmed or amended with evidence, files changed, tests, validation, skipped validation, final git status, and commit hash. If implementation proves the Architect RCA materially wrong, stop and report the contradiction before coding beyond minimal diagnostics.

## Acceptance Criteria

The app no longer routes to Phase 04 Work Card authoring when Phase 04 is closed and Phase 06 is active. `active_for_planning` does not silently exclude Phase 06. Closed phase Work Card Plans cannot drive live routing. The current-action panel displays the correct active phase/current action or clear blocker. Ad Hoc Work Card Capture is not the normal continuation path for stale closed-phase evidence. No manual Markdown/JSON editing is required. Tests cover closed-phase plan demotion and active-phase lifecycle resolution.

## Manual Validation After Implementer

1. Launch or refresh ChampCity_AI.
2. Confirm current action no longer shows `phase-04 work_card_authoring_required`.
3. Confirm the app shows the correct current phase/current action or a clear blocker.
4. Confirm reference phase/card controls do not retarget live current action.
5. Confirm no Ad Hoc Work Card Capture is presented as the normal continuation path for stale Phase 04 evidence.
6. Confirm no manual Markdown/JSON artifact editing is required.
7. Confirm the Implementer Report explains the root cause in plain language.

## Remaining Phase 06 Passes

- Implementer execution of WC02-REPAIR01.
- Architect Review of WC02-REPAIR01.
- Operator validation of WC02-REPAIR01.
- Re-run or disposition WC02 validation after repair.
- WC03 through WC06 after WC02 is accepted.
