<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/architect_review/WC07-REPAIR01",
  "artifactType": "architect_review",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.json",
  "markdownPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC07",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: WC07-REPAIR01 Artifact Workspace UI Simplification and Preview Usability"
  },
  "payloadHash": "sha256:4d439a9b08ca663c696fd258d0699f3ed54408ddb2eb8adf36fcfcfec77222d6",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/operator_validation/WC07-REPAIR01"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/operator_validation/WC07-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-03/implementer_report/WC07-REPAIR01",
      "champcity-ai/phase-03/observation_register/Observation_Register",
      "champcity-ai/phase-03/operator_validation/WC07",
      "champcity-ai/phase-03/work_card/WC07_artifact_review_workspace",
      "champcity-ai/phase-03/work_card/WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC07-REPAIR01"
}
-->

# Architect Review: WC07-REPAIR01 Artifact Workspace UI Simplification and Preview Usability

Status: Ready for Operator validation
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Repair Work Card: WC07-REPAIR01 — Artifact Workspace Layout Ownership and Preview Usability
Parent Work Card: WC07 — Artifact Review Workspace
Reviewed: 2026-07-14

## Review Decision

Ready for Operator validation.

No further Implementer repair is required before Operator validation.

## Review Scope

This Architect Review evaluates the WC07-REPAIR01 Implementer Report and the changed artifact-workspace code against the rewritten repair card. The review focuses on the specific human UI failure recorded during WC07 validation:

- too many panes;
- duplicate artifact/source-evidence displays;
- duplicate current-action summaries;
- left-panel evidence overload;
- current-action artifacts being shown inside supporting/reference screens;
- artifact cards that appeared inert or unclear;
- Markdown preview being hard to discover or too small;
- the actual validation form being visually buried.

This review does not perform Operator validation and does not accept the repair visually. Operator validation remains required.

## Sources Reviewed

- `planning/phases/phase-03/Work_Cards/WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC07_artifact_review_workspace.md`
- `planning/phases/phase-03/Observation_Register.md`
- `src/shared/workCards/artifactReviewWorkspace.ts`
- `src/renderer/app/WorkflowRouterShell.tsx`
- `scripts/verify-wc07-artifact-workspace.mjs`

## Implementer Report Assessment

The Implementer Report addresses the rewritten repair card directly. It states that WC07-REPAIR01 now enforces strict layout ownership:

- left panel owns compact current-action orientation only;
- center workspace owns artifact review and current action work;
- supporting-screen mode suppresses the current-action artifact workspace;
- artifact review uses one grouped artifact list and one large preview pane;
- routed current-action form is available through an explicit `Complete current action` tab;
- artifact rows present exactly one interaction state: `Preview`, `Open support screen`, `Not previewable`, or `Missing`.

This is the correct response to the failed WC07 validation. The prior implementation tried to provide artifact context by adding more display surfaces. The repair now attempts to remove/consolidate display surfaces instead.

## Code Review Findings

### 1. Artifact workspace visibility is now mode-gated

`src/shared/workCards/artifactReviewWorkspace.ts` adds `shouldShowCurrentActionArtifactWorkspace`, which returns true only when context exists, the user is viewing the routed current-action screen, and the user is not viewing a supporting screen.

This directly addresses the screenshot failure where the WC07 artifact workspace appeared while the Operator was viewing a supporting `Project Intake` screen.

### 2. Artifact rows now have explicit interaction states

The artifact model now assigns one of these states:

- `preview`
- `open_support_screen`
- `not_previewable`
- `missing`

This addresses the failed validation observation that artifacts appeared useless, inert, or unclear. Buttons are only rendered for real preview/support actions; otherwise the UI should display a static state label.

### 3. Center workspace owns artifact review

`WorkflowRouterShell.tsx` now routes artifact review through `ArtifactWorkspace` and `CurrentActionArtifactReview`, with:

- one artifact list;
- one preview pane;
- `Artifacts` / `Complete current action` tabs;
- support-mode banner and `Return to current action` behavior.

This matches the approved layout ownership model.

### 4. Left panel no longer renders the old evidence stacks

The focused fixture checks the `CurrentRequiredActionPanel` source and asserts it does not render:

- `<EvidenceList`
- `<MissingEvidenceList`
- `<RouteOutcomes`
- `<WarningGroups`

The left panel now retains compact counts instead of a long source-evidence browser. This addresses the long-scroll left-panel evidence overload shown in the screenshots.

### 5. Preview is now structurally larger and clearer

The preview pane is rendered as the main right side of the current-action artifact workspace, rather than a small embedded pane. It includes:

- selected artifact label;
- read-only notice;
- large scrollable text area;
- empty state when no artifact is selected;
- failure state if preview fails;
- path details collapsed under details.

Operator validation must still decide whether the visual size and readability are sufficient, but the implementation is aligned with the repair card.

## Fixture Review

`scripts/verify-wc07-artifact-workspace.mjs` now covers the right risks. It verifies:

- Operator validation exposes Work Card, Implementer Report, and Architect Review evidence;
- Architect review exposes Work Card and Implementer Report;
- repair validation exposes parent Work Card, failed validation, repair artifacts, and evidence;
- existing planning Markdown gets `preview`;
- image evidence gets `not_previewable`;
- known project planning JSON can route to `open_support_screen`;
- missing expected output gets `missing`;
- supporting-screen mode suppresses current-action artifact workspace;
- exactly one current-action artifact list exists in the renderer;
- the left panel does not render evidence/missing/route/warning stacks;
- `Complete current action` remains available.

That fixture is now meaningfully aligned to the failed Operator screenshots, not merely to the earlier data-model claims.

## Residual Concern

`WorkflowRouterShell.tsx` still contains some legacy helper components that appear to be unused after this repair, including prior evidence/missing/route/inspector helper code. Because the Implementer reports typecheck/build validation passed and the fixture confirms those components are not rendered by the current left panel, this is not a blocker before Operator validation.

However, it is a code hygiene risk. If later changes accidentally reuse those helpers, the duplicate-panel failure could reappear. This should be tracked as a carry-forward cleanup observation unless Operator validation reveals the old UI is still visible.

## Observation Register Disposition

WC07-REPAIR01 continues to address the relevant Phase 03 observations:

- `PH03-OBS-003` — Source Evidence should not show full raw paths.
- `PH03-OBS-004` — Supporting screens are reachable but not populated.
- `PH03-OBS-006` — Work Card Loop needs artifact access during validation.

The repair should not be failed for unrelated observations already deferred outside WC07 scope:

- `PH03-OBS-001` — validation checklist structure;
- `PH03-OBS-002` — screenshot paste/evidence UX;
- `PH03-OBS-005` — multi-project/workspace support.

## Operator Validation Guidance

Validate the repair visually and behaviorally. Do not rely on the Implementer fixture alone.

Confirm:

1. The left panel is now a compact summary and no longer acts as a source-evidence browser.
2. The center workspace has one artifact list and one preview/details pane.
3. The `Artifacts` tab and `Complete current action` tab are obvious.
4. The Operator Validation form is easy to reach and not buried under artifact scaffolding.
5. Supporting-screen mode does not show the full WC07 artifact workspace.
6. Supporting-screen mode clearly says it is reference/recovery only and provides `Return to current action`.
7. Every artifact row clearly shows `Preview`, `Open support screen`, `Not previewable`, or `Missing`.
8. Markdown preview visibly loads content and is readable at normal desktop size.
9. Non-previewable artifacts clearly say they are not previewable.
10. Missing artifacts clearly say they are missing.
11. The repair visibly reduces the number of competing panels compared with the failed WC07 screenshots.
12. Previewing or opening support screens does not save, approve, validate, repair, or advance workflow state.
13. WC04 current-action behavior remains usable.
14. WC05 support navigation remains subordinate.
15. WC06 left-to-right workflow guide remains intact.
16. WC08-WC15 behavior does not appear.

## Pass / Repair Boundary

Pass is appropriate only if the Operator can now understand and use the artifact workspace without hunting through multiple duplicate artifact surfaces.

Create another repair if any of these are still true:

- the left panel still contains long source-evidence card stacks;
- current-action artifact review still appears inside supporting/reference screens;
- there are multiple visible artifact lists competing with each other;
- preview buttons appear but do not load content;
- artifacts look clickable but do nothing;
- the validation form remains buried or hard to reach;
- the screen still feels like added panels rather than fewer clearer panels.

## Architect Conclusion

The repair is sufficiently aligned with the rewritten WC07-REPAIR01 card to proceed to Operator validation.

Do not merge to `dev` until Operator validation passes.

## Document Disposition
Document.Status=Pending
