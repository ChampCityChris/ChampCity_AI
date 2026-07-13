# Phase 03 Observation Register

Status: Active
Project: ChampCity A/I
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Created: 2026-07-13
Purpose: Durable register for non-blocking Operator observations, carry-forward items, deferred UI issues, and product-scope notes discovered during Phase 03 validation.

## Governance Rule

Every Operator validation observation must receive an Architect disposition. Observations must not remain only inside validation-report prose if they represent a possible repair, carry-forward, later Work Card requirement, post-phase cleanup item, or future product backlog item.

Allowed dispositions:

- Repair now
- Carry into current Work Card
- Carry into next Work Card
- Defer to later Phase 03 Work Card
- Defer to post-Phase-03 UI cleanup
- Transfer to product backlog / future phase
- No action required

Each future Work Card creation pass must review this register before writing the Work Card. If an open observation belongs in the new Work Card scope, the Work Card must list it under `Carried-Forward Observations Included`. If no observations are in scope, the Work Card must explicitly say the register was reviewed and none were included.

## Entry Fields

Each observation uses this structure:

- Observation ID
- Source artifact
- Source Work Card
- Date captured
- Operator observation
- Architect disposition
- Disposition rationale
- Assigned target
- Status
- Resolution artifact

## Open / Assigned Observations

### PH03-OBS-001 — Validation checklist should become editable / structured

- Source artifact: WC04/WC05/WC06 validation observations
- Source Work Card: Multiple validation reports
- Date captured: 2026-07-13
- Operator observation: The manual validation checklist should move to the top of the Operator validation record, become editable, or become pass/fail/skipped questions so the validation record does not duplicate “What was tested” and checklist content.
- Architect disposition: Defer to later validation-record workflow work.
- Disposition rationale: This is real validation UX debt, but it is not blocking WC07 Artifact Review Workspace. It is more directly related to validation record authoring and the later validation/repair route work.
- Assigned target: WC12 — Operator Validation Record and REPAIR Sub-Card Route, or post-Phase-03 validation UX cleanup if WC12 scope is kept narrower.
- Status: Deferred
- Resolution artifact: Pending

### PH03-OBS-002 — Screenshot paste and evidence UI needs cleanup

- Source artifact: WC04 repair validation observations
- Source Work Card: WC04-REPAIR01 / WC04-REPAIR03
- Date captured: 2026-07-13
- Operator observation: Screenshot paste should be the primary input method, the attach button should be fallback, repo-relative paths should clear after image creation, and screenshot evidence should be shown more like an image/card rather than long path text.
- Architect disposition: Defer to later validation-record workflow work.
- Disposition rationale: Screenshot input improved enough for prior repair validation to pass, but the remaining issue is broader validation-evidence UX rather than WC07 artifact review.
- Assigned target: WC12 — Operator Validation Record and REPAIR Sub-Card Route, or post-Phase-03 UI cleanup.
- Status: Deferred
- Resolution artifact: Pending

### PH03-OBS-003 — Source Evidence should not show full raw paths

- Source artifact: VALIDATION_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md
- Source Work Card: WC05
- Date captured: 2026-07-13
- Operator observation: Source Evidence section of the left context menu needs significant UI improvement. The full path should not be used as the primary display. A clickable link that opens the document is ideal.
- Architect disposition: Carry into current Work Card.
- Disposition rationale: WC07 is specifically about the artifact review workspace and should make source artifacts readable, grouped, and openable where safe.
- Assigned target: WC07 — Artifact Review Workspace
- Status: Assigned
- Resolution artifact: Pending WC07 validation

### PH03-OBS-004 — Supporting screens are reachable but not populated

- Source artifact: VALIDATION_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md
- Source Work Card: WC05
- Date captured: 2026-07-13
- Operator observation: Supporting screens do not pull in any information; they remain blank.
- Architect disposition: Carry into current Work Card where relevant; otherwise defer remaining screen-specific population.
- Disposition rationale: WC07 should prevent a blank central workspace when current-action artifact context exists. Full route-specific screen population belongs to later route-correction Work Cards.
- Assigned target: WC07 — Artifact Review Workspace for current-action artifact context; later Phase 03 route-specific cards for remaining screen population.
- Status: Assigned / Partially deferred
- Resolution artifact: Pending WC07 validation

### PH03-OBS-005 — Multi-project / workspace support does not exist

- Source artifact: VALIDATION_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md
- Source Work Card: WC05
- Date captured: 2026-07-13
- Operator observation: There is no way currently to work multiple projects through the application.
- Architect disposition: Transfer to product backlog / future phase.
- Disposition rationale: Multi-project/workspace management is valid product functionality but outside Phase 03 router UI correction.
- Assigned target: Future project/workspace management phase.
- Status: Transferred / Future scope
- Resolution artifact: Pending future phase planning

### PH03-OBS-006 — Work Card Loop needs artifact access during validation

- Source artifact: VALIDATION_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md
- Source Work Card: WC06-REPAIR01
- Date captured: 2026-07-13
- Operator observation: Work Card Loop Action Bar does not allow navigation to see Work Card, Implementer Report, or Architect Review captured information. This does not block WC06 repair validation but is a considerable gap because those are the most likely pieces of information an Operator wants to look back on during validation testing.
- Architect disposition: Carry into current Work Card.
- Disposition rationale: WC07 is directly scoped to artifact review and should expose Work Card, Implementer Report, Architect Review, validation records, repair records, source evidence, missing evidence, and expected output while preserving current-action context.
- Assigned target: WC07 — Artifact Review Workspace
- Status: Assigned
- Resolution artifact: Pending WC07 validation

## Work Card Creation Requirement

Every future just-in-time Work Card creation prompt must include this requirement:

```text
Before creating this Work Card, review:

planning/phases/<phase-id>/Observation_Register.md
planning/phases/<phase-id>/Observation_Register.json

For every open observation, determine whether it is:
- in scope for this Work Card;
- already resolved by prior work;
- still deferred to a later Work Card in this phase;
- deferred to post-phase UI cleanup;
- transferred to product backlog / future phase;
- no action required.

If an observation is in scope, explicitly include it in the Work Card under “Carried-Forward Observations Included.”

If no observation is in scope, state that the Observation Register was reviewed and no open observations are included.

The Architect must not silently drop Operator observations.
```

## Current WC07 Handling Note

WC07 was created before this register existed and was already submitted to the Implementer. Do not retroactively alter WC07 scope solely because this register was added after handoff. Validate WC07 against its existing Work Card and the observations that naturally fall within its stated artifact-review scope.

If WC07 does not address PH03-OBS-003 or PH03-OBS-006, that may be a WC07 repair issue because those observations align with the existing WC07 objective. If WC07 does not address PH03-OBS-001, PH03-OBS-002, or PH03-OBS-005, do not fail WC07 on that basis; those are assigned outside WC07 scope.
