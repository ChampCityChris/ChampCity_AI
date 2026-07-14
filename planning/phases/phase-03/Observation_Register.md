# Phase 03 Observation Register

Status: Active
Project: ChampCity A/I
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Created: 2026-07-13
Last updated: 2026-07-14
Purpose: Durable phase-local register for Operator observations, carry-forward items, deferred UI issues, and product-scope notes discovered during Phase 03 validation.

Cross-phase register: `planning/project/Project_Observation_Register.md`

## Governance Rule

Every Operator validation observation must receive an Architect disposition. Observations must not remain only inside validation-report prose if they represent a possible repair, carry-forward, later Work Card requirement, post-phase cleanup item, or future product backlog item.

This Phase 03 register records where the observation was discovered and triaged. Any observation not fully resolved inside Phase 03 must also be represented in the project-level register:

- `planning/project/Project_Observation_Register.md`
- `planning/project/Project_Observation_Register.json`

Allowed dispositions:

- Repair now
- Carry into current Work Card
- Carry into next Work Card
- Defer to later Phase 03 Work Card
- Defer to post-Phase-03 UI cleanup
- Transfer to product backlog / future phase
- No action required

Each future Work Card creation pass must review both the project-level and phase-level observation registers before writing the Work Card. If an open observation belongs in the new Work Card scope, the Work Card must list it under `Carried-Forward Observations Included`. If no observations are in scope, the Work Card must explicitly say both registers were reviewed and none were included.

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
- Project register link, if unresolved beyond this phase

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
- Project register link: PROJ-OBS-001

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
- Project register link: PROJ-OBS-002

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
- Project register link: PROJ-OBS-003

### PH03-OBS-007 — Top workflow/action bars and Supporting Tools are duplicative and consume workspace real estate

- Source artifact: VALIDATION_REPORT_WC07-REPAIR01_artifact_workspace_layout_ownership_and_preview_usability.md
- Source Work Card: WC07-REPAIR01
- Date captured: 2026-07-14
- Operator observation: Action bar remains duplicative and cluttered. Supporting Tools menu is duplicative of the action bar. Action bar should be collapsible or minimizable in some way to return real estate to the workspace.
- Architect disposition: Defer to later Phase 03 navigation/layout pass.
- Disposition rationale: This is a valid global navigation/readability issue, but it is not a WC07-REPAIR01 blocker because the repair target was artifact workspace layout ownership, left-panel simplification, preview usability, support/current-action separation, and validation-form accessibility. Collapsing or redesigning the top workflow/action bars would affect WC06 workflow visibility and WC05 support navigation and should be handled as its own scoped Work Card or later UI consolidation pass.
- Assigned target: Later Phase 03 navigation/layout cleanup Work Card or post-Phase-03 UI consolidation pass.
- Status: Deferred
- Resolution artifact: Pending
- Project register link: PROJ-OBS-004

## Resolved Observations

### PH03-OBS-003 — Source Evidence should not show full raw paths

- Source artifact: VALIDATION_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md
- Source Work Card: WC05
- Date captured: 2026-07-13
- Operator observation: Source Evidence section of the left context menu needs significant UI improvement. The full path should not be used as the primary display. A clickable link that opens the document is ideal.
- Architect disposition: Carried into WC07 / WC07-REPAIR01.
- Disposition rationale: WC07 and WC07-REPAIR01 were specifically scoped to artifact review. WC07-REPAIR01 validation confirms the left panel no longer acts as source-evidence browser, artifact rows are previewable/open support/missing/not-previewable, and the workspace contains less duplicative information.
- Assigned target: WC07 — Artifact Review Workspace; repaired by WC07-REPAIR01.
- Status: Resolved
- Resolution artifact: VALIDATION_REPORT_WC07-REPAIR01_artifact_workspace_layout_ownership_and_preview_usability.md
- Project register link: Not promoted; resolved phase-local item.

### PH03-OBS-004 — Supporting screens are reachable but not populated

- Source artifact: VALIDATION_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md
- Source Work Card: WC05
- Date captured: 2026-07-13
- Operator observation: Supporting screens do not pull in any information; they remain blank.
- Architect disposition: Carried into WC07 where relevant; remaining route-specific population deferred.
- Disposition rationale: WC07-REPAIR01 validation confirms the current-action artifact workspace is separated from supporting/reference screens and is usable for artifact review. This resolves the portion of the observation tied to current-action artifact context. Full route-specific supporting screen population remains outside WC07 and should only be reopened if a later screen-specific Work Card requires it.
- Assigned target: WC07 — Artifact Review Workspace for current-action artifact context; later route-specific cards only if needed.
- Status: Resolved for WC07 scope / residual route-specific screen population deferred by scope
- Resolution artifact: VALIDATION_REPORT_WC07-REPAIR01_artifact_workspace_layout_ownership_and_preview_usability.md
- Project register link: Not promoted as open item; resolved for WC07 scope. Reopen as a new project observation only if later route-specific screen work requires it.

### PH03-OBS-006 — Work Card Loop needs artifact access during validation

- Source artifact: VALIDATION_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md
- Source Work Card: WC06-REPAIR01
- Date captured: 2026-07-13
- Operator observation: Work Card Loop Action Bar does not allow navigation to see Work Card, Implementer Report, or Architect Review captured information. This does not block WC06 repair validation but is a considerable gap because those are the most likely pieces of information an Operator wants to look back on during validation testing.
- Architect disposition: Carried into WC07 / WC07-REPAIR01.
- Disposition rationale: WC07-REPAIR01 validation confirms artifact rows are clickable and move to preview or screen, preview buttons load content, and the validation form is reachable through the tabbed workspace.
- Assigned target: WC07 — Artifact Review Workspace; repaired by WC07-REPAIR01.
- Status: Resolved
- Resolution artifact: VALIDATION_REPORT_WC07-REPAIR01_artifact_workspace_layout_ownership_and_preview_usability.md
- Project register link: Not promoted; resolved phase-local item.

## Work Card Creation Requirement

Every future just-in-time Work Card creation prompt must include this requirement:

```text
Before creating this Work Card, review:

planning/project/Project_Observation_Register.md
planning/project/Project_Observation_Register.json
planning/phases/<active-phase>/Observation_Register.md
planning/phases/<active-phase>/Observation_Register.json

For every open observation, determine whether it is:
- in scope for this Work Card;
- already resolved by prior work;
- still deferred to a later Work Card in this phase;
- deferred to a later phase;
- transferred to product backlog / future phase;
- no action required.

If an observation is in scope, explicitly include it in the Work Card under `Carried-Forward Observations Included`.

If no observation is in scope, state that both Observation Registers were reviewed and no open observations are included.

The Architect must not silently drop Operator observations.
```

## Phase Closeout Requirement

Phase closeout must include Observation Register reconciliation:

```text
Observation Register Reconciliation:
- Confirm all phase observations are Resolved, No action required, or represented in the Project Observation Register.
- List any project-level observations created or updated during closeout.
- Identify any observations that must influence next-phase activation or next-phase mapping.
```

## Current WC07 Handling Note

WC07 failed initial validation and was repaired through WC07-REPAIR01. The WC07-REPAIR01 validation report passed and resolves PH03-OBS-003 and PH03-OBS-006, and resolves the WC07-scoped portion of PH03-OBS-004.

PH03-OBS-007 is not a WC07-REPAIR01 blocker. It is represented in the Project Observation Register as PROJ-OBS-004 and must be considered during the next Work Card creation pass.
