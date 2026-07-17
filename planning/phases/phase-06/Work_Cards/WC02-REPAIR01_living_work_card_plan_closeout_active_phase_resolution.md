<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR01",
  "artifactType": "work_card",
  "schemaVersion": "champcity.artifact.v1",
  "revision": 3,
  "status": "draft_for_operator_review",
  "projectId": "champcity-ai",
  "phaseId": "phase-06",
  "workCardId": "WC02-REPAIR01",
  "createdAt": "2026-07-17T17:15:00.000Z",
  "updatedAt": "2026-07-17T17:55:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR01_living_work_card_plan_closeout_active_phase_resolution.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payloadHash": "sha256:23c62153b0d8b7e24fbb3802b4758ce7746db294e4ff89571697a0b6cc1f5009",
  "relationships": {
    "sources": [
      "champcity-ai/phase-06/validation_report/WC02",
      "champcity-ai/phase-06/architect_review/WC02",
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/approval/WC02",
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
    "title": "Work Card: Phase 06 WC02-REPAIR01 — Active Phase Lifecycle Resolution and Closed-Phase Plan Demotion"
  }
}
-->

# Work Card: Phase 06 WC02-REPAIR01 — Active Phase Lifecycle Resolution and Closed-Phase Plan Demotion

Status: draft_for_operator_review
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR01
Parent Work Card: WC02
Owner: Implementer
Risk: critical
Change strategy: targeted repair based on Architect RCA; no open-ended RCA handoff

## Purpose

Repair the WC02 Operator validation failure where the application displayed `phase-04`, `work_card_authoring_required`, and routed the Operator to Ad Hoc Work Card Capture for a stale planned `WC04` after Phase 04 and Phase 05 had already been closed and Phase 06 had been activated.

This repair replaces the prior incorrectly framed repair target. The failure is not that the Operator declined to create Markdown/JSON artifact pairs. The failure is that the application presented a live current-action route from a closed phase and exposed an operator-hostile recovery path.

## Architect RCA

The Architect has reviewed the relevant repository artifacts and resolver code before authoring this repair.

### Visible defect

The user-visible application state showed:

- `phase-04` as the live current-action phase;
- `work_card_authoring_required` as the next action;
- a missing expected output of artifact type `work_card`;
- Ad Hoc Work Card Capture as the continuation path;
- Work Card ID `WC04` coming from stale Phase 04 plan/candidate evidence.

This is invalid because Phase 04 was already closed, Phase 05 was already closed, and Phase 06 was active and approved for current implementation work.

### Confirmed code-level cause

The active-phase resolver in `src/main/workflow/relationshipDrivenWorkflowResolver.ts` selects active phase candidates from controlling `phase_activation` artifacts.

The relevant function filters activation artifacts using sidecar status and payload-data status. It only accepts a payload-data status when that status is absent or exactly `active`.

The Phase 06 activation artifact has sidecar status `active`, but its payload data status is `active_for_planning`. Because the resolver does not treat `active_for_planning` as a valid active lifecycle state, Phase 06 can be excluded from live phase selection even though Phase 06 has controlling activation, planning, Work Card Plan, Operator Phase Approval, WC01/WC02 approvals, and WC02 implementation evidence.

Phase 04 and Phase 05 activation artifacts still have sidecar status `active`. The resolver does not use controlling `phase_closeout` artifacts to retire earlier phases from live routing. Therefore, closed phases can remain eligible for live current-action selection.

### Confirmed artifact lifecycle issue

Phase 04 has a controlling closeout artifact:

`champcity-ai/phase-04/phase_closeout/PHASE_04`

Phase 05 has a controlling closeout artifact:

`champcity-ai/phase-05/phase_closeout/PHASE_05`

Phase 06 has a controlling activation artifact:

`champcity-ai/phase-06/phase_activation/phase-06`

The resolver must treat closeout/activation succession as lifecycle authority. A closed phase’s Work Card Plan may remain readable historical evidence, but it must not drive live current-action routing after a later phase has been activated.

### Status of the Phase 04 Work Card Plan hypothesis

The Phase 04 Work Card Plan is visible stale evidence and is likely the source of the displayed `WC04` candidate. It is not the sole root cause. The root cause is the resolver’s incomplete phase lifecycle model: it can exclude the current active planning phase while failing to retire closed phases.

## Required Repair

Repair active-phase lifecycle resolution in the relationship-driven resolver and any directly related current-action projection path so that:

1. `active_for_planning` is handled intentionally as a valid active phase state for planning/current-action purposes, or is converted into an explicit Operator-readable blocker. It must not be silently excluded.
2. A phase with a controlling `phase_closeout` artifact cannot be selected as the live current-action phase when a later phase activation exists.
3. Phase succession must be derived from explicit lifecycle evidence, including closeout `expectedOutputs`, activation `sources`, and phase IDs.
4. Closed-phase Work Card Plans remain readable as historical artifacts, but cannot produce live `work_card_authoring_required`.
5. Stale planned candidates from closed phases, including Phase 04 `WC04`, cannot become the live required action after Phase 04 closeout.
6. If multiple phase activations or closeout/activation chains conflict, the app must block with a plain-language explanation rather than guessing or routing to ad hoc Work Card capture.
7. Reference phase/card controls must remain reference navigation only; they must not retarget live current-action routing.
8. The Operator must not be asked to hand-author Markdown/JSON artifact pairs as validation or recovery.

## Required Code Review Scope

Before editing, inspect these paths and document the specific findings in the Implementer Report:

- `src/main/workflow/relationshipDrivenWorkflowResolver.ts`
- `src/main/repository/repositoryRefreshService.ts`
- `src/main/repository/verifiedArtifactGraph.ts`
- `src/main/projects/projectWorkspaceRegistry.ts`
- current-action main/preload/renderer display paths that can show or route the selected action
- relevant tests under `test/wc01-repair01`, `test/wc02`, and `test/wc02-repair02`

## Required Tests

Add or update automated tests proving:

- a repository containing Phase 04 closeout, Phase 05 closeout, and Phase 06 activation does not route to Phase 04 Work Card authoring;
- `active_for_planning` Phase 06 activation does not silently lose to older active activation artifacts;
- a closed phase Work Card Plan cannot produce live current action;
- stale Phase 04 planned `WC04` remains historical/reference evidence only;
- contradictory phase lifecycle evidence blocks with an Operator-readable explanation;
- reference phase/card controls do not retarget the live current action;
- workspace registry uses the intended repository planning root rather than a stale or narrowed planning root.

## Required Implementer Report

Create a synchronized Implementer Report pair:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR01_active_phase_lifecycle_resolution_closed_phase_plan_demotion.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-06/implementer_report/WC02-REPAIR01`

The report must include:

- repo, branch, and remote verification;
- Work Card and approval artifacts read;
- code-review findings;
- implementation summary;
- exact root cause confirmed or amended with evidence;
- files changed;
- tests added or updated;
- validation commands and results;
- skipped validation and reasons;
- final git status;
- commit hash.

If implementation proves the Architect RCA materially wrong, stop and report the contradiction before coding beyond minimal diagnostics.

## Acceptance Criteria

- The app no longer routes to Phase 04 Work Card authoring when Phase 04 is closed and Phase 06 is active.
- `active_for_planning` does not cause Phase 06 to be silently excluded from active phase selection.
- Closed phase Work Card Plans cannot drive live current-action routing.
- The current-action panel displays the correct active phase/current action or a clear blocker.
- Ad Hoc Work Card Capture is not presented as the normal continuation path for stale closed-phase evidence.
- The Operator is not asked to create Markdown/JSON pairs as validation or recovery.
- Tests cover closed-phase plan demotion and active-phase lifecycle resolution.
- Implementer Report explains the root cause in plain language.

## Manual Validation After Implementer

Operator validation must be limited to visible app behavior:

1. Launch or refresh ChampCity_AI.
2. Confirm the current action no longer shows `phase-04 work_card_authoring_required`.
3. Confirm the app shows the correct current phase/current action or a clear blocker.
4. Confirm reference phase/card controls do not retarget live current action.
5. Confirm no Ad Hoc Work Card Capture screen is presented as the normal continuation path for stale Phase 04 evidence.
6. Confirm no manual Markdown/JSON artifact editing is required.
7. Confirm the Implementer Report explains the root cause in plain language.

## Remaining Phase 06 Passes

- Operator approval of WC02-REPAIR01.
- Implementer execution of WC02-REPAIR01.
- Architect Review of WC02-REPAIR01.
- Operator validation of WC02-REPAIR01.
- Re-run or disposition WC02 validation after repair.
- WC03 through WC06 after WC02 is accepted.
