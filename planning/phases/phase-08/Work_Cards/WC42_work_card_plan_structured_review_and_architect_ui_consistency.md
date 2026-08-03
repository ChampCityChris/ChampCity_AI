<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC42"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC34-REPAIR01_phase_map_polling_and_operator_review_presentation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC37_phase_planning_workspace_and_atomic_bundle_cutover.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC41_domain_specific_architect_handoff_prompt_contracts.md",
      "revision": 4
    }
  ],
  "workflowData": {
    "title": "Work Card Plan Structured Review and Architect UI Consistency",
    "status": "approved_for_implementation",
    "executionMode": "one bounded renderer-only product correction",
    "dependsOn": [
      "WC41"
    ],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC42_work_card_plan_structured_review_and_architect_ui_consistency.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Correct four Operator-validated renderer defects: structured Work Card Plan presentation, one bundle selector location, uniform Architect action buttons, and a styled generic disposition panel. Preserve all workflow and review behavior.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC42 — Work Card Plan Structured Review and Architect UI Consistency

Status: Approved for Implementer execution  
Git mutation: prohibited

## Confirmed Defects

Operator validation of the promoted Phase Planning bundle exposed four normal-use renderer defects:

1. `Work_Card_Plan.md` is shown as raw fenced JSON even though canonical `metadata.workflowData.candidates` is available for an Operator-readable projection.
2. Bundle slot controls are duplicated: the action bar renders `Phase Planning` and `Work Card Plan`, and the review panel renders the same controls again. The upper controls are visually unstyled and unnecessary.
3. `Prepare Handoff`, `Copy Handoff`, `Refresh Outputs`, and `Reload ChatGPT` do not share a coherent size, icon, spacing, alignment, or responsive layout.
4. The generic Architect review panel has no dedicated CSS. Its disposition select, notes field, selector, and Apply button render as raw inline controls and are inconsistent with the established application review surfaces.

## Objective

Provide one readable and visually consistent generic Architect-output review experience without changing any disposition, promotion, validation, authority, or workflow behavior.

## Required Changes

### 1. Structured Work Card Plan presentation

Add an Operator-facing Work Card Plan preview equivalent to the existing Phase Map presentation.

Use canonical:

```text
metadata.workflowData.candidates
```

Do not parse the Markdown body as primary presentation authority.

Default view must render candidates in ascending `order` and display:

- order;
- candidate ID;
- title;
- purpose;
- dependencies, or `None`;
- resolution status;
- resolution reason;
- evidence paths;
- `carriedForwardToPhaseId` only when present.

Provide `View Source` / `Hide Source` to expose the canonical Markdown body on demand. Raw fenced JSON must not be the default review view.

Malformed or missing canonical candidate metadata must render `Needs Attention` with an actionable reason and no fabricated candidates.

### 2. One bundle slot selector

Remove the Architect-output slot selector from `ArchitectOutputActionBar`.

The review/document pane is the sole location for selecting current output slots. For atomic bundles it must present the current members as clearly styled selectable tabs or buttons. Single-output workspaces must not render a redundant one-item selector.

Preserve selected-document loading, viewed-revision tracking, approval gating, and current slot state.

### 3. Uniform Architect action buttons

Render the action controls as one responsive shared button group:

```text
Prepare Handoff
Copy Handoff
Refresh Outputs
Reload ChatGPT
```

Requirements:

- equal height and consistent padding, border, radius, typography, and icon spacing;
- consistent enabled, hover, focus, and disabled states;
- no unrelated global `text-button` minimum width forcing irregular sizing;
- one-row layout when space permits and clean wrapping or equal-column layout when constrained;
- icons and labels aligned consistently;
- no workspace-specific button implementation.

Preserve all current action availability and handlers.

### 4. Uniform generic review panel

Style `ArchitectOutputReviewShell` as a deliberate review surface consistent with the rest of the application.

The panel must contain:

- the sole bundle slot selector when more than one slot exists;
- a labeled disposition select;
- a labeled review-notes field;
- one uniform `Apply Review` button;
- the existing viewed-current-revision guidance when required.

Use a structured grid or flex layout with consistent spacing, control heights, borders, typography, and responsive stacking. The controls must not appear as unstyled inline text.

Preserve exactly:

- shared bundle disposition;
- `RevisionRequested` notes requirement;
- viewed-current-revision approval gate;
- `canApplyDisposition` behavior;
- existing status values and review call.

## Preserved Behavior

Preserve unchanged:

- seven Architect-output definitions and nine slots;
- all prepared prompts and H1/H2/domain-block contracts;
- draft promotion and cleanup;
- Pending canonical output creation;
- Phase Planning atomic-bundle behavior;
- generic review semantics and disposition persistence;
- source revisions, identities, paths, metadata, and workflow projection;
- Phase Map structured presentation and source toggle;
- embedded ChatGPT behavior and browser security;
- no backend, IPC, preload, or MCP changes.

## Authorized Surface

```text
src/renderer/app/App.tsx
src/renderer/app/workCardPlanPresentation.tsx
src/renderer/styles.css
test/renderer/work-card-plan-presentation.test.cjs
test/renderer/architect-output-workspace-source.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC42_work_card_plan_structured_review_and_architect_ui_consistency.md
```

A narrow update to `src/renderer/app/phaseMapPresentation.tsx` or its test is authorized only if required to reuse an existing presentation primitive without changing Phase Map behavior.

## Acceptance Criteria

1. Work Card Plan defaults to an ordered Operator-readable candidate presentation derived from canonical metadata.
2. Raw Work Card Plan Markdown is available only through `View Source` and returns through `Hide Source`.
3. Malformed candidate metadata renders `Needs Attention` without fabricated candidates.
4. The action bar no longer renders output-slot selectors.
5. Atomic-bundle slot navigation exists exactly once in the review/document pane and remains functional.
6. Single-output workspaces do not show a redundant one-item slot selector.
7. Selecting a bundle member loads that document and preserves viewed-revision tracking.
8. All four Architect action buttons share one consistent visual system and responsive layout.
9. The generic disposition selector, notes field, and Apply Review button are visually structured and consistent with other review surfaces.
10. Existing approval, rejection, revision-request, notes, viewed-revision, and atomic-disposition behavior remains unchanged.
11. Phase Map structured rendering remains unchanged.
12. Renderer tests use production presentation functions and static rendered markup where practical; source-string assertions alone are insufficient for the Work Card Plan projection.
13. Typecheck, TypeScript build, Vite build, focused tests, and complete Node tests pass in the approved normal Windows environment.
14. No Git operation occurs.

## Negative Constraints

Do not:

- change disposition or promotion sequence;
- add draft-review behavior;
- change validators, prompts, schemas, metadata, paths, or workflow authority;
- add workspace-specific action bars or review panels;
- duplicate candidate parsing in the renderer when canonical metadata is available;
- add dependencies;
- use Playwright;
- perform Git operations.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC42_work_card_plan_structured_review_and_architect_ui_consistency.md
```

Report:

- every changed file;
- Work Card Plan projection fields and malformed-state behavior;
- evidence that slot navigation appears exactly once;
- action-button and review-panel layout changes;
- confirmation that no disposition, promotion, validator, prompt, metadata, path, workflow, backend, IPC, preload, or MCP behavior changed;
- focused and complete validation commands and results;
- any unresolved responsive or accessibility issue.

## Manual Validation

After Architect approval, Operator validation must confirm:

1. Work Card Plan opens as readable candidate cards or rows rather than raw JSON.
2. `View Source` reveals the Markdown and `Hide Source` restores the structured view.
3. Phase Planning and Work Card Plan can be selected only in the document review pane.
4. Prepare, Copy, Refresh, and Reload buttons are uniform at the Operator's normal window size and when narrowed.
5. Disposition, notes, and Apply Review are aligned, readable, and function exactly as before.
