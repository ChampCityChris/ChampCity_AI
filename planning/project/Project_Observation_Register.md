<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/observation_register/Project_Observation_Register",
  "artifactType": "observation_register",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/Project_Observation_Register.json",
  "markdownPath": "planning/project/Project_Observation_Register.md",
  "payload": {
    "kind": "observation_register",
    "title": "Project Observation Register"
  },
  "payloadHash": "sha256:e2876563d5e9f0bc1a343f29697a3f850f9984888da408b65fee550d10be4d0c",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC08",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T16:45:50.582Z"
}
-->

# Project Observation Register

Status: Active
Project: ChampCity A/I
Created: 2026-07-14
Last updated: 2026-07-15
Purpose: Cross-phase register for unresolved, deferred, future-scope, or product-level observations discovered during phase execution and Operator validation.

## Governance Rule

Phase Observation Registers record where an observation was discovered and triaged. This Project Observation Register records observations that must remain visible across phase boundaries.

Every just-in-time Work Card creation pass must review both:

- `planning/project/Project_Observation_Register.md`
- `planning/project/Project_Observation_Register.json`
- `planning/phases/<active-phase>/Observation_Register.md`
- `planning/phases/<active-phase>/Observation_Register.json`

Before creating a Work Card, the Architect must decide whether each open observation is in scope for the new Work Card, still deferred to later work, transferred to backlog/future phase, already resolved, or no action required. If an observation is in scope, the Work Card must include it under `Carried-Forward Observations Included`.

At phase closeout, every phase observation not marked `Resolved` or `No action required` must be copied, linked, or already represented in this project-level register.

## Open / Deferred / Future-Scope Observations

### PROJ-OBS-001 — Validation checklist should become editable / structured

- Source Observation ID: PH03-OBS-001
- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: Phase 03 Observation Register; WC04/WC05/WC06 validation observations
- Source Work Card: Multiple validation reports
- Date captured: 2026-07-13
- Operator observation: The manual validation checklist should move to the top of the Operator validation record, become editable, or become pass/fail/skipped questions so the validation record does not duplicate `What was tested` and checklist content. Later WC08-REPAIR01 validation also identified that Architect-provided Operator validation steps should focus on item-level acceptance criteria and observable validation assertions rather than broad navigation/setup steps such as opening the app or navigating to a screen.
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

### PROJ-OBS-006 — Controlled route recovery is needed when current-action routing is wrong or blocks validation

- Source Observation ID: PH03-OBS-009
- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: Operator discussion after WC08-REPAIR02 validation was blocked by incorrect routing to WC09 Ad Hoc Work Card Capture.
- Source Work Card: WC08-REPAIR02 / WC08-REPAIR03
- Date captured: 2026-07-14
- Operator observation: The Operator needs a controlled recovery path when current-action routing is wrong, has advanced too far, is stuck on stale state, or prevents access to the validation/review screen needed to continue. The app should not trap the Operator behind a broken route, but it also should not let the Operator casually mark work complete, skip validation, or advance phases without evidence.
- Architect disposition: Assigned to immediate repair after WC08-REPAIR01 validation confirmed the non-mutating prompt-style route guidance is insufficient for an end-user product workflow.
- Disposition rationale: The app must provide a controlled in-application recovery path when routing is wrong, stale, or blocks validation. The recovery path must be governed by durable evidence and Architect disposition, not an unrestricted Operator override and not a copy/paste prompt to an Architect or LLM.
- Assigned target: WC08-REPAIR04 — Controlled Route Recovery and Accurate Route Evidence Authority
- Status: Assigned
- Resolution artifact: Pending WC08-REPAIR04 validation

### PROJ-OBS-008 — Existing implementation must not create automatic compatibility debt

- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: Architect/Operator discussion during WC09 stabilization and repeated process-regression repairs.
- Source Work Card: WC09 / WC09-REPAIR01 / WC09-REPAIR02
- Date captured: 2026-07-15
- Operator observation: LLM Implementers preserve historical code, schemas, screens, and behaviors merely because they exist, layering fallbacks and compatibility paths over implementations already determined to be wrong. This produces spaghetti code and inherited debt instead of commercial-quality replacement architecture.
- Architect disposition: Add formal target-state and modernization governance to ChampCity A/I.
- Disposition rationale: Existing repository behavior is evidence to inspect, not an automatic product requirement. Supported contracts should be preserved; incorrect, prototype, superseded, or dead implementations should be replaced and removed. Compatibility must require a named consumer and explicit approval.
- Required product capability: Every foundational Work Card must declare a Change Strategy of Preserve, Migrate, or Replace; identify target-state authority; classify the existing implementation; list compatibility requirements and named consumers; define required data migration; define obsolete code/artifact removal; distinguish archive evidence from runtime support; and prohibit new and old authority paths from remaining active together.
- Required engineering controls: Compatibility budget, deletion plan, debt-retirement checklist, one-runtime-path invariant, migration sunset/removal criteria, automated anti-spaghetti repository gates, and an escalation rule that asks which failed abstraction must be removed after repeated repairs.
- Default for unreleased Alpha product work: Replace with migration; preserve required durable data; prohibit runtime legacy fallback after migration unless explicitly approved.
- Assigned target: Future product-engineering governance / Work Card contract phase. Must be reviewed during the next project or phase mapping pass and before additional repository-wide modernization work.
- Status: Open / Product architecture required
- Resolution artifact: Pending

### PROJ-OBS-007 — Artifact authority and revision governance is undefined

- Source Observation ID: PH03-OBS-010
- Source phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Source artifact: Architect review of amended WC08-REPAIR02 Human Validation Reports and duplicate `_2` validation artifacts created by the application.
- Source Work Card: WC08-REPAIR02 / WC08-REPAIR03
- Date captured: 2026-07-14
- Architect observation: The application currently creates a new suffixed artifact when an existing validation report is amended instead of updating, superseding, or explicitly identifying one authoritative revision. This creates multiple durable artifacts for the same workflow event and makes authority ambiguous.
- Architect disposition: Establish a project-wide artifact authority and revision governance rule before implementing a storage fix.
- Disposition rationale: Artifact identity and artifact revision are separate concepts. At any point in time, every workflow artifact must have exactly one authoritative revision. Historical revisions may exist, but routing, review, and automation must never infer authority from filename suffixes, filesystem ordering, creation timestamps, or directory enumeration.
- Architectural determination: One artifact represents one durable workflow event; revisions represent edits to that artifact. ChampCity A/I must explicitly resolve one authoritative revision for Work Cards, Implementer Reports, Validation Reports, Architect Reviews, Phase Planning Documents, and future durable workflow artifacts.
- Candidate implementation models: Single authoritative artifact with overwrite semantics and Git history; explicitly versioned artifacts with superseded metadata; or immutable artifacts with a separate authoritative index. Filename suffixes alone are not an authority model.
- Assigned target: Future artifact authority and revision governance Work Card, to be planned before workflow automation depends on duplicate or revised artifacts.
- Status: Open / Architectural design required
- Resolution artifact: Pending

### PROJ-OBS-009 — Repaired-parent validation needs routed evidence-bundle association

- Source phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
- Source artifact: `planning/phases/phase-04/Validation_Reports/VALIDATION_REPORT_WC01_work_card_wc01_canonical_routed_screen_cutover_and_legacy_projection_retirement.md`
- Source Work Card: WC01 / WC01-REPAIR01
- Date captured: 2026-07-16
- Operator observation: During WC01 validation after WC01-REPAIR01, the validation screen allowed the parent WC01 Validation Report to be saved, but did not allow clean association to the relevant Implementer Report evidence because the UI still expects a single Implementer Report association. In repaired-parent validation, the correct evidence is a routed bundle: parent Work Card, accepted Architect Review, original Implementer Report, repair Work Card, and final repair Implementer Report.
- Architect disposition: Non-blocking observation. WC01 validation remains valid because the accepted Architect Review carries the combined repair evidence chain. Future validation UI should replace the single Implementer Report selector with a routed evidence-bundle association when validating a repaired parent Work Card.
- Disposition rationale: The issue affects evidence-association clarity and validation UX, but it did not prevent the parent WC01 Validation Report from being saved and does not invalidate WC01 validation.
- Assigned target: Future validation-record / routed evidence-bundle UI cleanup. Review before additional validation workflow automation.
- Status: Deferred / validation UX and evidence-model cleanup
- Resolution artifact: Pending

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
