<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/architect_review/WC06-REPAIR01",
  "artifactType": "architect_review",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC06-REPAIR01_current_action_validation_route_after_architect_review.json",
  "markdownPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC06-REPAIR01_current_action_validation_route_after_architect_review.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC06",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: WC06-REPAIR01 Current Action Validation Route After Architect Review"
  },
  "payloadHash": "sha256:b05d01e675079972578688241b6e1af285f7c22bbfbc73b0fb660636a4e834d9",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/operator_validation/WC06-REPAIR01"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/operator_validation/WC06-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-03/implementer_report/WC06-REPAIR01",
      "champcity-ai/phase-03/work_card/WC06-REPAIR01"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC06-REPAIR01"
}
-->

# Architect Review: WC06-REPAIR01 Current Action Validation Route After Architect Review

## Review Target

- Repair Work Card: WC06-REPAIR01 — Current Action Validation Route After Architect Review
- Parent Work Card: WC06 — Left-to-Right Workflow Visibility
- Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Implementer Report: `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md`
- Review branch: `feature/phase-03-wc06-repair01-validation-route`

## Outcome

Ready for Operator validation.

No further repair is required before Operator validation.

Do not merge to `dev` until Operator validation passes.

## Review Summary

The Implementer correctly identified the defect that caused the failed WC06 validation. WC06 was not failing because the left-to-right workflow guide itself was absent. It was failing because the current-action evaluator did not recognize the WC06 full Work Card JSON identity shape. The WC06 JSON uses `id` and `phaseId`; the prior compatibility reader only recognized older Work Card identity shapes. As a result, the evaluator treated the mapped WC06 candidate as if no full Work Card existed and routed to `full_work_card_creation_required`, which opened Ad Hoc Work Card Capture.

The repair expands Work Card identity compatibility to recognize `id` / `phaseId` while preserving the existing `workCardId`, `work_card_id`, `phase`, and `phase_id` compatibility forms. This directly addresses the root cause.

The repair also correctly handles the failed WC06 operator validation as a route-blocked validation attempt. That report documents that validation could not be reached because the route opened the wrong screen. It should not count as a passing validation, and it also should not force a normal failed-validation repair route against the WC06 implementation itself. The repaired evaluator keeps WC06 current and routes to Operator validation for a new validation attempt.

## Evidence Reviewed

Reviewed the WC06-REPAIR01 Implementer Report. The report states that the baseline route reproduced the defect as `WC06 / full_work_card_creation_required / architect / available`, and the repaired live route returns `WC06 / operator_validation_required / operator / needs_validation`.

Reviewed the focused repair fixture `scripts/verify-wc06-repair01-validation-route.mjs`. The fixture preserves the exact WC06 artifact shape that triggered the defect by asserting `id === "WC06"`, `phaseId === "phase-03"`, and absence of `workCardId`. It then verifies that the current action is WC06, not WC07, that the action ID is `operator_validation_required`, and that the route is not `full_work_card_creation_required`.

Reviewed the current-action evaluator changes in `src/shared/workCards/currentRequiredAction.ts`. The evaluator now treats `validation.routeBlocked === true` as not passing and not a normal failed validation requiring repair. It then returns `operator_validation_required` with a reason explaining that the prior validation attempt was blocked by incorrect routing and that a new Operator validation attempt is required.

Reviewed the routed workspace fixture checks. The repair explicitly verifies that `operator_validation_required` maps to `human-validation`, that the routed screen title is Human Validation, and that Ad Hoc Work Card Capture remains separately tied to `full_work_card_creation_required`. This is the correct separation.

## Acceptance Criteria Assessment

### Recognize existing WC06 Work Card artifacts

Pass. The compatibility reader now recognizes the WC06 JSON identity shape and the focused fixture protects that exact shape.

### Stop routing WC06 to full Work Card creation when artifacts exist

Pass. The focused fixture verifies the current action ID is no longer `full_work_card_creation_required`.

### Route WC06 to Operator validation after ready Architect Review

Pass. The report and fixture verify `WC06 / operator_validation_required / operator / needs_validation`.

### Ensure routed workspace is Human Validation

Pass. The fixture checks `operator_validation_required: "human-validation"` and confirms the routed screen is not Ad Hoc Work Card Capture.

### Prevent premature WC07 advancement

Pass. The focused fixture and current-action fixture assert WC06 remains current and WC07 is not selected.

### Preserve WC06 workflow visibility

Pass. The report states no workflow visibility product code was changed. The WC06 workflow visibility fixture passes and confirms the guide remains on Work Card Loop / Operator Validation.

### Preserve WC05 support navigation

Pass. The report states no support-navigation product code was changed and the WC05 support-navigation fixture passes.

### Preserve WC04 validation and repair behavior

Pass with a note. The WC04-REPAIR01 and WC04-REPAIR03 fixtures pass. The WC04-REPAIR03 fixture expectation was updated because the latest relevant Architect Review source is now WC06 rather than WC05. That is acceptable because the underlying durable guidance-selection rule intentionally chooses the newest relevant review.

### Add fixture coverage for the failed routing scenario

Pass. `scripts/verify-wc06-repair01-validation-route.mjs` directly covers the exact route-blocked failure: WC06 artifact shape, failed route-blocked validation evidence, current-action route, Human Validation workspace mapping, and WC07 prevention.

## Scope Review

The repair remained inside scope. It did not implement WC07-WC15, did not change the workflow guide design, did not add route-specific screens, did not broaden renderer filesystem access, and did not create Operator validation or phase-closeout artifacts.

The implementation changed current-action routing, artifact compatibility parsing, and focused fixtures. That is the correct scope for this failure.

## Residual Risks And Watch Items

The `routeBlocked` classification depends on structured validation fields plus route-blocking evidence. That is acceptable for this repair, but future validation record vocabulary changes may require extending compatibility logic.

Architect Review status parsing now recognizes current durable review decision phrases such as “Ready for Operator validation” and “Repair required before Operator validation.” If future Architect Review formats materially change, routing may need another compatibility update.

Operator visual confirmation is still required. Automated fixture coverage confirms the route and screen mapping, but does not prove the rendered application opens the correct workspace in the human workflow.

## Operator Validation Guidance

Operator validation should confirm:

1. The app starts from `feature/phase-03-wc06-repair01-validation-route`.
2. The current-action panel shows WC06 Operator validation required.
3. The routed workspace opens Human Validation for WC06.
4. The app does not route WC06 to Ad Hoc Work Card Capture.
5. The left-to-right workflow guide highlights Work Card Loop / Operator Validation consistently with the current-action panel.
6. Supporting tools remain subordinate and Return to current action still works.
7. WC04 validation/repair behavior remains usable.
8. WC05 support-navigation behavior remains usable.
9. WC07-WC15 do not appear prematurely.
10. The Operator can create and save a WC06 operator validation from the routed Human Validation screen.

## Decision

WC06-REPAIR01 is ready for Operator validation.

Do not merge to `dev` yet. Proceed to Operator validation from `feature/phase-03-wc06-repair01-validation-route`.

## Document Disposition
Document.Status=Pending
