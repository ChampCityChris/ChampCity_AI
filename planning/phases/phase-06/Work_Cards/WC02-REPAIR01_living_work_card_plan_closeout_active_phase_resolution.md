<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR01",
  "artifactType": "work_card",
  "schemaVersion": "champcity.artifact.v1",
  "revision": 2,
  "status": "draft_for_operator_review",
  "projectId": "champcity-ai",
  "phaseId": "phase-06",
  "workCardId": "WC02-REPAIR01",
  "createdAt": "2026-07-17T17:15:00.000Z",
  "updatedAt": "2026-07-17T17:35:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payloadHash": "sha256:3e8b2635877177a321cfd8636cda81a1b4115cef5f3e1a0a83af7d194600a357",
  "relationships": {
    "sources": [
      "champcity-ai/phase-06/validation_report/WC02",
      "champcity-ai/phase-06/architect_review/WC02",
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-05/phase_closeout/PHASE_05",
      "champcity-ai/phase-06/phase_activation/phase-06",
      "champcity-ai/phase-04/work_card_plan/Work_Card_Plan"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-06/approval/WC02-REPAIR01",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01"
    ],
    "supersedes": [],
    "children": []
  },
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02-REPAIR01 — Active Phase Resolution and Operator-Visible Current Action RCA"
  }
}
-->

# Work Card: Phase 06 WC02-REPAIR01 — Active Phase Resolution and Operator-Visible Current Action RCA

Status: draft_for_operator_review
Phase: phase-06
Work Card: WC02-REPAIR01
Parent Work Card: WC02
Owner: Implementer
Risk: critical
Change strategy: RCA first; then targeted implementation and/or governed artifact correction

## Purpose

Repair the WC02 validation failure where the application displayed `phase-04` `work_card_authoring_required` and routed the Operator to Ad Hoc Work Card Capture for a suggested `WC04`.

This Work Card replaces the earlier incorrectly framed repair target. The failure is not that the Operator declined to create Markdown/JSON pairs. The failure is that the visible current-action route was wrong or not explainable to a nontechnical Operator.

## RCA First

Before editing source code, reproduce the current-action decision path from the current repository evidence.

The Implementer Report must answer:

1. Which phase did the resolver select before repair?
2. Which artifact caused that phase selection?
3. Which Work Card Plan was read before repair?
4. Why did the UI show `phase-04` and `work_card_authoring_required`?
5. Did the selected project/workspace use the repository `planning/` root or a stale/narrow planning root?
6. Did the scan include Phase 05 and Phase 06 artifacts?
7. Did any graph blockers prevent Phase 05 or Phase 06 evidence from being authoritative?
8. Did the running app use stale built code?
9. Was the Phase 04 Work Card Plan root cause, a contributing factor, or only visible evidence?
10. What code path made the final current-action decision?

Do not claim a root cause without this reproduction.

## Required Evidence To Inspect

Artifacts:

- Phase 04 Work Card Plan;
- Phase 04 closeout;
- Phase 05 activation and closeout;
- Phase 06 activation, planning, Work Card Plan, and Operator approval;
- WC02 Implementer Report and WC02 Architect Review.

Code:

- `src/main/workflow/relationshipDrivenWorkflowResolver.ts`;
- `src/main/repository/repositoryRefreshService.ts`;
- `src/main/repository/verifiedArtifactGraph.ts`;
- `src/main/projects/projectWorkspaceRegistry.ts`;
- current-action main/preload/renderer display paths.

## Required Repair Behavior

After repair, a closed phase must not drive live current-action routing merely because its Work Card Plan remains a controlling artifact.

The application must distinguish:

- living Work Card Plan during an active phase;
- historical Work Card Plan after phase closeout;
- active phase/current-action evidence for the current phase.

A closed phase plan may remain readable as historical evidence, but it must not produce live `work_card_authoring_required`.

## Possible Repair Paths

The actual implementation path must follow the RCA. Acceptable directions may include:

- exclude phases with controlling closeout artifacts from live current-action routing once a later phase is activated;
- use phase closeout `expectedOutputs` and later phase activation `sources` to establish phase succession;
- block with an understandable message when multiple active phase candidates conflict;
- repair workspace scan/configuration if it is using a stale planning root;
- repair UI display if reference-phase selection is being mistaken for live current action;
- update living-document governance so Work Card Plans are updated during execution and treated as historical at closeout.

Do not require manual Operator JSON/Markdown editing as the fix.

## Required Tests

Add or update tests proving:

- a repo with Phase 04 closeout, Phase 05 closeout, and Phase 06 activation does not route to Phase 04 Work Card authoring;
- a closed phase Work Card Plan cannot produce live current action;
- stale Work Card Plans remain readable but non-authoritative for live routing;
- contradictory phase evidence blocks with an understandable explanation;
- reference phase/card controls do not retarget live current action;
- workspace registry uses the intended planning root.

## Required Implementer Report

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR01_active_phase_resolution_operator_visible_current_action_rca.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC02-REPAIR01`

The report must include RCA reproduction steps, exact root cause, evidence proving whether the Phase 04 Work Card Plan was root cause or only visible evidence, files changed, tests, validation, residual risks, final git status, and commit hash.

## Acceptance Criteria

- The app no longer routes to Phase 04 Work Card authoring when Phase 04 is closed and Phase 06 is active.
- Closed phase Work Card Plans cannot drive live current action.
- The current-action panel displays the correct active phase or a clear blocker.
- The Operator is not asked to create Markdown/JSON pairs as validation or recovery.
- The repair includes a documented RCA, not an assumed root cause.
- Tests cover closed-phase plan behavior and active-phase resolution.

## Manual Validation After Implementer

1. Launch or refresh ChampCity_AI.
2. Confirm the current action no longer shows `phase-04 work_card_authoring_required`.
3. Confirm the app shows the correct current phase or a clear blocker.
4. Confirm reference phase/card controls do not retarget live current action.
5. Confirm no Ad Hoc Work Card Capture screen is presented as the normal continuation path for stale Phase 04 evidence.
6. Confirm the Implementer Report explains the root cause in plain language.

## Remaining Phase 06 Passes

- Architect Review of WC02-REPAIR01.
- Operator validation of WC02-REPAIR01.
- Re-run or disposition WC02 validation after repair.
- WC03 through WC06 after WC02 is accepted.
