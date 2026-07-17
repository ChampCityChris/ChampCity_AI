<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/observation_register/Observation_Register",
  "artifactType": "observation_register",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Observation_Register.json",
  "markdownPath": "planning/phases/phase-03/Observation_Register.md",
  "payload": {
    "kind": "observation_register",
    "title": "Phase 03 Observation Register"
  },
  "payloadHash": "sha256:7faf1d2b1f0b88d02909d86833a8f80ec5c05759d115017956d50400d80eb7d0",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC07-REPAIR01",
      "champcity-ai/phase-03/architect_review/WC08",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

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

Each future Work Card creation pass must review both the project-level and phase-level observation registers before writing the Work Card.

## Open / Assigned Observations

### PH03-OBS-001 — Validation checklist should become editable / structured

- Source artifact: WC04/WC05/WC06 validation observations
- Source Work Card: Multiple validation reports
- Date captured: 2026-07-13
- Operator observation: The manual validation checklist should move to the top of the Operator validation record, become editable, or become pass/fail/skipped questions so the validation record does not duplicate “What was tested” and checklist content. Later WC08-REPAIR01 validation also identified that Architect-provided Operator validation steps should focus on item-level acceptance criteria and observable validation assertions rather than broad navigation/setup steps such as opening the app or navigating to a screen.
- Architect disposition: Defer to later validation-record workflow work.
- Disposition rationale: This is real validation UX debt and is more directly related to validation record authoring and the later validation/repair route work.
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
- Disposition rationale: This is a valid global navigation/readability issue. Collapsing or redesigning the top workflow/action bars would affect WC06 workflow visibility and WC05 support navigation and should be handled as its own scoped Work Card or later UI consolidation pass.
- Assigned target: Later Phase 03 navigation/layout cleanup Work Card or post-Phase-03 UI consolidation pass.
- Status: Deferred
- Resolution artifact: Pending
- Project register link: PROJ-OBS-004

### PH03-OBS-008 — Report review protocol and validation disposition role confusion

- Source artifact: Operator discussion following WC08 operator validation review; VALIDATION_REPORT_WC08_current_step_context_inspector.md
- Source Work Card: WC08
- Date captured: 2026-07-14
- Operator observation: Validation reports and Implementer Reports lack embedded Architect review instructions. The Operator Decision dropdown in validation reports creates role confusion because it asks the Operator to make workflow disposition decisions that should be made by the Architect after analyzing the report and evidence.
- Architect disposition: Immediate repair Work Card.
- Disposition rationale: This is a process defect causing inconsistent Architect review, inconsistent repair creation, and inconsistent validation-step output. It should be repaired before deeper route work continues.
- Assigned target: WC08-REPAIR02 — Report Review Protocol and Validation Disposition Governance
- Status: Assigned
- Resolution artifact: Pending WC08-REPAIR02 validation
- Project register link: PROJ-OBS-005

### PH03-OBS-009 — Controlled route recovery is needed when current-action routing is wrong or blocks validation

- Source artifact: Operator discussion after WC08-REPAIR02 validation was blocked by incorrect routing to WC09 Ad Hoc Work Card Capture.
- Source Work Card: WC08-REPAIR02 / WC08-REPAIR03
- Date captured: 2026-07-14
- Operator observation: The Operator needs a controlled recovery path when current-action routing is wrong, has advanced too far, is stuck on stale state, or prevents access to the validation/review screen needed to continue. The app should not trap the Operator behind a broken route, but it also should not let the Operator casually mark work complete, skip validation, or advance phases without evidence.
- Architect disposition: Assigned to immediate repair after WC08-REPAIR01 validation confirmed the non-mutating prompt-style route guidance is insufficient for an end-user product workflow.
- Disposition rationale: The app must provide a controlled in-application recovery path when routing is wrong, stale, or blocks validation. The recovery path must be governed by durable evidence and Architect disposition, not an unrestricted Operator override and not a copy/paste prompt to an Architect or LLM.
- Assigned target: WC08-REPAIR04 — Controlled Route Recovery and Accurate Route Evidence Authority
- Status: Assigned
- Resolution artifact: Pending WC08-REPAIR04 validation
- Project register link: PROJ-OBS-006

### PH03-OBS-010 — Artifact authority and revision governance is undefined

- Source artifact: Architect review of amended WC08-REPAIR02 Human Validation Reports and the duplicate `_2` validation artifacts created by the application.
- Source Work Card: WC08-REPAIR02 / WC08-REPAIR03
- Date captured: 2026-07-14
- Architect observation: The application currently creates a new suffixed validation artifact when an existing operator validation is amended instead of updating, superseding, or otherwise identifying one authoritative revision. This leaves multiple durable reports for the same workflow event and forces routing or review logic to infer authority from filenames, timestamps, or filesystem order.
- Architect disposition: Promote to project-level architectural governance and require explicit design before implementation.
- Disposition rationale: Artifact identity and artifact revision are separate concepts. At any point in time, every workflow artifact must have exactly one authoritative revision. Historical revisions may exist, but authority must never be inferred from filename suffixes, filesystem ordering, creation timestamps, or directory enumeration. The workflow model must represent authority explicitly.
- Architectural determination: ChampCity A/I shall distinguish artifact identity from artifact revision. One artifact represents one durable workflow event; revisions represent edits to that artifact. The application shall resolve exactly one authoritative revision for Work Cards, Implementer Reports, Validation Reports, Architect Reviews, Phase Planning Documents, and future durable workflow artifacts.
- Candidate implementation models: Single authoritative artifact with overwrite semantics and Git history; explicitly versioned artifacts with superseded metadata; or immutable artifacts with a separate authoritative index. Filename suffixes alone are not an authority model.
- Assigned target: Future artifact authority and revision governance Work Card, to be planned before workflow automation depends on duplicate or revised artifacts.
- Status: Open / Architectural design required
- Resolution artifact: Pending
- Project register link: PROJ-OBS-007

## Resolved Observations

### PH03-OBS-003 — Source Evidence should not show full raw paths

- Status: Resolved
- Resolution artifact: VALIDATION_REPORT_WC07-REPAIR01_artifact_workspace_layout_ownership_and_preview_usability.md
- Project register link: Not promoted; resolved phase-local item.

### PH03-OBS-004 — Supporting screens are reachable but not populated

- Status: Resolved for WC07 scope / residual route-specific screen population deferred by scope
- Resolution artifact: VALIDATION_REPORT_WC07-REPAIR01_artifact_workspace_layout_ownership_and_preview_usability.md
- Project register link: Not promoted as open item; resolved for WC07 scope.

### PH03-OBS-006 — Work Card Loop needs artifact access during validation

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
