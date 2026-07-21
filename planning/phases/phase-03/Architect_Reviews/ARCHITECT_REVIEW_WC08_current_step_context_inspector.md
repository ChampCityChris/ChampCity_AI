<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/architect_review/WC08",
  "artifactType": "architect_review",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC08_current_step_context_inspector.json",
  "markdownPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC08_current_step_context_inspector.md",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: WC08 Current Step Context Inspector"
  },
  "payloadHash": "sha256:f1d17815044d3b6bbf72b13a98ce071f4248431894a78eb412190bc35a1a5c7d",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/operator_validation/WC08"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/operator_validation/WC08"
    ],
    "sources": [
      "champcity-ai/phase-03/implementer_report/WC08",
      "champcity-ai/phase-03/observation_register/Observation_Register",
      "champcity-ai/phase-03/work_card/WC08_current_step_context_inspector",
      "champcity-ai/project/observation_register/Project_Observation_Register"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC08"
}
-->

# Architect Review: WC08 Current Step Context Inspector

Status: Ready for Operator validation
Project: ChampCity A/I
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Work Card: WC08 — Current Step Context Inspector
Implementer Report: `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md`
Review date: 2026-07-14

## Review Decision

Ready for Operator validation.

No repair is required before Operator validation.

## Scope Reviewed

This review evaluated WC08 against the executable Work Card, the Implementer Report, the project-level Observation Register, and the phase-level Observation Register.

The key architectural question was not whether the Implementer could display more context. The key question was whether WC08 could expose current-step reasoning without reintroducing the layout clutter that WC07 and WC07-REPAIR01 just corrected.

## Sources Reviewed

- `planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md`
- `planning/project/Project_Observation_Register.md`
- `planning/phases/phase-03/Observation_Register.md`
- `src/shared/workCards/currentStepContextInspector.ts`
- `scripts/verify-wc08-current-step-context-inspector.mjs`
- `src/renderer/app/WorkflowRouterShell.tsx`

## Observation Register Handling

WC08 explicitly reviewed the project and phase observation registers.

The relevant carried-forward observation was:

- `PROJ-OBS-004 / PH03-OBS-007` — Top workflow/action bars and Supporting Tools are duplicative and consume workspace real estate.

WC08 did not fully resolve that observation, and that is acceptable. The Work Card did not authorize a global workflow/action-bar redesign. However, WC08 did correctly use that observation as a constraint: it did not add another always-visible inspector pane, it did not add a new permanent rail, and it did not duplicate the WC07 artifact browser.

Disposition for WC08:

- `PROJ-OBS-004 / PH03-OBS-007`: Still deferred after WC08. Must remain open for later navigation/layout cleanup or UI consolidation. WC08 satisfies only the anti-clutter constraint within its own scope.

## Implementation Assessment

The implementation adds a `Route context` tab beside the existing WC07 tabs:

- `Artifacts`
- `Route context`
- `Complete current action`

This is the correct ownership model for WC08. The inspector is demand-selected within the center workspace, not a new permanent side panel. The left panel remains compact. Supporting/reference screen mode suppresses the inspector.

The new shared model `currentStepContextInspector.ts` builds a read-only summary of:

- route identity and route reason;
- responsible role, workflow step, status, phase, and Work Card;
- success, failure, and repair outcomes;
- durable state categories;
- missing records;
- warning/evidence health;
- stale, superseded, historical, malformed, and unreadable records;
- available or unreported capability state.

The implementation correctly avoids exposing raw durable state JSON to the renderer as the primary interface.

## Important Positive Findings

The implementation preserves WC07 layout ownership. `Artifacts` remains the only document list and preview surface. WC08 does not create a second artifact browser.

The inspector is read-only. It provides no save, approve, validate, repair, advance, edit, filesystem, or new IPC action.

The capability section avoids guessing. Durable-state write and MCP/direct-write state are shown as `Not reported by current app state` unless the existing app state actually supplies that information.

Supporting-screen mode is suppressed correctly. The inspector is available only when the current routed workspace is active.

The Implementer removed obsolete unused right-inspector and legacy stack helpers. That is appropriate because those components represented the earlier failed permanent-pane model and could otherwise be reused by mistake.

## Code / Fixture Review

The new shared model includes `shouldShowCurrentStepContextInspector`, which correctly requires:

- current action exists;
- routed screen is active;
- supporting-screen mode is false.

The WC08 focused fixture verifies the important preservation conditions:

- all required durable state categories exist;
- repair and prior-validation authority are distinguished;
- missing record impact is classified;
- stale, superseded, historical, and malformed warnings are classified;
- stale/superseded/historical evidence is not controlling authority;
- capability state does not infer unreported write or MCP state;
- support mode suppresses the inspector;
- exactly one WC07 artifact list remains;
- the compact left panel does not regain evidence, missing, route, warning, or inspector stacks;
- the obsolete always-visible right inspector is absent;
- the inspector does not call preview or mutation functions.

That fixture is aligned with the actual risk created by WC08.

## Non-Blocking Residual Risk

Visual acceptance remains Operator-owned. The fixture can verify ownership and suppression rules, but it cannot confirm that the `Route context` tab is readable and useful at the Operator's normal window size.

The broader top workflow/action bar and Supporting Tools duplication remains open as `PROJ-OBS-004 / PH03-OBS-007`. This should not block WC08 unless the new Route context tab materially worsens the duplication or consumes persistent workspace space.

The inspector intentionally does not deep-link category cards into the artifact list. That is acceptable for WC08 because the Artifacts tab remains the artifact owner. Adding deep links later should be treated carefully to avoid rebuilding the duplicate artifact browser that WC07 repaired.

## Operator Validation Focus

Operator validation should determine whether WC08 is actually useful to a human and does not reintroduce clutter.

Validate that:

1. `Route context` is easy to find beside `Artifacts` and `Complete current action`.
2. `Route context` does not consume permanent workspace area while not selected.
3. The left panel remains a compact current-action summary.
4. The inspector is not shown while viewing supporting/reference screens.
5. The inspector explains why the current action was selected.
6. State categories, missing records, warnings, and evidence authority are readable.
7. Raw paths, technical route IDs, warning codes, and fallback paths remain secondary or collapsed.
8. Stale, superseded, and historical records are visibly non-controlling.
9. Capability state does not falsely claim write/MCP availability.
10. The Artifacts tab remains the only artifact list/preview surface.
11. `Complete current action` remains easy to reach.
12. Reading the inspector does not save, approve, validate, repair, or advance state.
13. WC04/WC05/WC06/WC07 behavior remains usable.
14. WC09-WC15 behavior does not appear.

## Pass / Fail Guidance

Pass WC08 if the inspector is a readable, subordinate, read-only context tab and the prior WC07 layout ownership remains intact.

Fail WC08 if any of the following are true:

- WC08 adds another always-visible pane or rail.
- WC08 restores source-evidence, missing-record, route-outcome, or warning stacks to the left panel.
- WC08 creates a second artifact list or second preview surface.
- WC08 appears inside supporting/reference screens.
- The inspector buries the current action form or makes `Complete current action` hard to reach.
- The inspector claims unreported MCP/direct-write capability as available.
- The inspector mutates durable workflow state.

Do not fail WC08 solely because the top workflow/action bars and Supporting Tools are still duplicative. That is already tracked as `PROJ-OBS-004 / PH03-OBS-007`, remains open, and is outside WC08’s implementation authority unless WC08 worsened it.

## Conclusion

WC08 is ready for Operator validation.

The implementation addresses the Work Card without violating the WC07 repair boundary. It gives the Operator a route-context explanation in a selectable, read-only center-workspace tab while preserving the artifact owner, left-panel compactness, support-screen suppression, and current-action route authority.

## Document Disposition
Document.Status=Pending
