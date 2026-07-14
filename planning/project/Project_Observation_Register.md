# Project Observation Register

Status: Active
Project: ChampCity A/I
Created: 2026-07-14
Last updated: 2026-07-14
Purpose: Cross-phase register for unresolved, deferred, future-scope, or product-level observations discovered during phase execution and Operator validation.

## Governance Rule

Phase Observation Registers record where an observation was discovered and triaged. This Project Observation Register records observations that must remain visible across phase boundaries.

Every just-in-time Work Card creation pass must review both:

- `planning/project/Project_Observation_Register.md`
- `planning/project/Project_Observation_Register.json`
- `planning/phases/<active-phase>/Observation_Register.md`
- `planning/phases/<active-phase>/Observation_Register.json`

Before creating a Work Card, the Architect must decide whether each open observation is:

- in scope for the new Work Card;
- still deferred to a later Work Card in the current phase;
- deferred to a later phase;
- transferred to product backlog;
- resolved by prior work;
- no action required.

If an observation is in scope, the Work Card must include it under `Carried-Forward Observations Included`. The Architect must not silently drop project-level or phase-level observations.

At phase closeout, every phase observation not marked `Resolved` or `No action required` must be copied, linked, or already represented in this project-level register.

## Open / Deferred / Future-Scope Observations

### PROJ-OBS-001 — Validation checklist should become editable / structured

- Source Observation ID: PH03-OBS-001
- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: Phase 03 Observation Register; WC04/WC05/WC06 validation observations
- Source Work Card: Multiple validation reports
- Date captured: 2026-07-13
- Operator observation: The manual validation checklist should move to the top of the Operator validation record, become editable, or become pass/fail/skipped questions so the validation record does not duplicate `What was tested` and checklist content.
- Architect disposition: Deferred to validation-record workflow work.
- Disposition rationale: This is durable validation UX debt. It is not specific to one Work Card and should remain visible until the validation-record creation flow is repaired or redesigned.
- Assigned target: WC12 — Operator Validation Record and REPAIR Sub-Card Route, or post-Phase-03 validation UX cleanup if WC12 scope is kept narrower.
- Status: Deferred
- Resolution artifact: Pending

### PROJ-OBS-002 — Screenshot paste and evidence UI needs cleanup

- Source Observation ID: PH03-OBS-002
- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: Phase 03 Observation Register; WC04 repair validation observations
- Source Work Card: WC04-REPAIR01 / WC04-REPAIR03
- Date captured: 2026-07-13
- Operator observation: Screenshot paste should be the primary input method, the attach button should be fallback, repo-relative paths should clear after image creation, and screenshot evidence should be shown more like an image/card rather than long path text.
- Architect disposition: Deferred to validation-record workflow work.
- Disposition rationale: This is broader validation evidence UX, not limited to a single Work Card. It should remain visible across phases until addressed.
- Assigned target: WC12 — Operator Validation Record and REPAIR Sub-Card Route, or post-Phase-03 UI cleanup.
- Status: Deferred
- Resolution artifact: Pending

### PROJ-OBS-003 — Multi-project / workspace support does not exist

- Source Observation ID: PH03-OBS-005
- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md`
- Source Work Card: WC05 — Subordinate Navigation and Manual Fallback Preservation
- Date captured: 2026-07-13
- Operator observation: There is no way currently to work multiple projects through the application.
- Architect disposition: Transfer to product backlog / future phase.
- Disposition rationale: Multi-project/workspace management is valid product functionality but outside Phase 03 router UI correction. It must not disappear at Phase 03 closeout.
- Assigned target: Future project/workspace management phase.
- Status: Future scope
- Resolution artifact: Pending future phase planning

### PROJ-OBS-004 — Top workflow/action bars and Supporting Tools are duplicative and consume workspace real estate

- Source Observation ID: PH03-OBS-007
- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC07-REPAIR01_artifact_workspace_layout_ownership_and_preview_usability.md`
- Source Work Card: WC07-REPAIR01 — Artifact Workspace Layout Ownership and Preview Usability
- Date captured: 2026-07-14
- Operator observation: Action bar remains duplicative and cluttered. Supporting Tools menu is duplicative of the action bar. Action bar should be collapsible or minimizable in some way to return real estate to the workspace.
- Architect disposition: Deferred to later navigation/layout cleanup.
- Disposition rationale: This is a valid global navigation/readability issue. It was not a WC07-REPAIR01 blocker because WC07-REPAIR01 repaired artifact workspace layout ownership, not the global workflow/action bar system. It affects workspace real estate and should be considered before creating additional route-specific screens.
- Assigned target: Later Phase 03 navigation/layout cleanup Work Card, or post-Phase-03 UI consolidation pass.
- Status: Deferred
- Resolution artifact: Pending

### PROJ-OBS-005 — Report review protocol and validation disposition role confusion

- Source Observation ID: PH03-OBS-008
- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: Operator discussion following WC08 validation review; `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08_current_step_context_inspector.md`
- Source Work Card: WC08 — Current Step Context Inspector
- Date captured: 2026-07-14
- Operator observation: Validation reports and Implementer Reports lack embedded Architect review instructions. The `Operator Decision` dropdown in validation reports creates role confusion because it asks the Operator to make workflow disposition decisions that should be made by the Architect after analysis.
- Architect disposition: Immediate repair Work Card.
- Disposition rationale: This is a process defect causing inconsistent Architect review, inconsistent repair creation, and inconsistent validation-step output. It should be repaired before deeper route work continues.
- Assigned target: WC08-REPAIR02 — Report Review Protocol and Validation Disposition Governance
- Status: Assigned
- Resolution artifact: Pending WC08-REPAIR02 validation

## Resolved Phase-Local Observations Not Promoted

These Phase 03 observations are intentionally not open project-level work items because they were resolved by WC07/WC07-REPAIR01 or resolved for WC07 scope:

- PH03-OBS-003 — Source Evidence should not show full raw paths. Resolved by WC07-REPAIR01 validation.
- PH03-OBS-004 — Supporting screens are reachable but not populated. Resolved for WC07 current-action artifact context; any future route-specific screen population should be scoped by a later Work Card.
- PH03-OBS-006 — Work Card Loop needs artifact access during validation. Resolved by WC07-REPAIR01 validation.

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

Every phase closeout must include an Observation Register reconciliation section:

```text
Observation Register Reconciliation:
- Confirm all phase observations are Resolved, No action required, or represented in the Project Observation Register.
- List any project-level observations created or updated during closeout.
- Identify any observations that must influence next-phase activation or next-phase mapping.
```
