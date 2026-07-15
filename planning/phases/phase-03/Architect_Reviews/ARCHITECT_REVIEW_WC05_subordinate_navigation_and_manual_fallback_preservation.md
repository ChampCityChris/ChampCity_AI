<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/architect_review/WC05",
  "artifactType": "architect_review",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC05_subordinate_navigation_and_manual_fallback_preservation.json",
  "markdownPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC05_subordinate_navigation_and_manual_fallback_preservation.md",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: WC05 Subordinate Navigation and Manual Fallback Preservation"
  },
  "payloadHash": "sha256:0aa99676b4cb995d8f89cb744093185a5d8dde1cd74885cd04fbca015936f167",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/validation_report/WC05"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/validation_report/WC05"
    ],
    "sources": [
      "champcity-ai/phase-03/implementer_report/WC05",
      "champcity-ai/phase-03/work_card/WC05"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC05"
}
-->

# Architect Review: WC05 Subordinate Navigation and Manual Fallback Preservation

## Review Target

- Work Card: WC05 — Subordinate Navigation and Manual Fallback Preservation
- Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Implementer Report: `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md`
- Implementation Branch: `feature/phase-03-wc05-subordinate-navigation-fallback`

## Architect Decision

Ready for Operator validation.

No repair is required before Operator validation.

## Review Summary

WC05 is scoped to the boundary between routed workflow authority and manual/support navigation. The implemented changes appear aligned with that scope. The current-action panel remains the primary workflow surface, and subordinate navigation is explicitly described as support/reference/recovery tooling rather than workflow authority.

The Implementer Report was read in full. I also inspected the new shared support-navigation helper, the focused WC05 fixture, and the updated `WorkflowRouterShell.tsx` behavior. The implementation uses a pure `resolveSupportNavigationState` helper that distinguishes routed screen, active screen, routed-screen resolution, active-screen resolution, routed view, and support view. This is a good fit for the WC05 requirement because it separates view selection from durable workflow progression.

## Scope Assessment

WC05 required the app to preserve manual access to supporting screens without letting those screens become the workflow model. The implementation addresses this by:

- renaming the broad navigation directory to `Supporting tools`;
- labeling directory groups as Architect support and Implementer support;
- changing phase and Work Card selectors to `Reference phase` and `Reference card`;
- adding microcopy that screen changes do not complete or advance the current action;
- making the route-specific button read `Continue current action`;
- showing a center-workspace banner when the Operator is viewing a supporting screen;
- providing a `Return to current action` button from support view;
- guarding screen changes through known manual navigation IDs;
- preserving the WC04 current-action panel as the dominant left-side guided surface.

This is consistent with the intended human model: the router is the process authority; screens are tools.

## Source Inspection Notes

`src/shared/workCards/supportNavigation.ts` defines a focused, pure navigation-state resolver. It does not write files, call IPC, mutate durable workflow state, or infer workflow completion. It reports whether the routed screen and active screen are known, whether the Operator is viewing the routed screen, and whether the Operator is viewing a support screen.

`src/renderer/app/WorkflowRouterShell.tsx` now derives support-navigation state from the current action’s suggested route and the active screen. Manual support screen changes are guarded against unknown IDs. The primary current-action panel retains the routed-action button, and the central workspace now changes its explanatory banner depending on whether the routed screen, supporting screen, loading/error state, or unresolved routed screen is active.

The code also preserves process-rail reachability while adding copy that rail clicks open support only. This is acceptable for WC05. Removing the process rail or rebuilding it into a full left-to-right workflow map belongs to WC06, not WC05.

## Validation Review

The Implementer reports the following validation as passed:

- `npm run validate:codex:unit`
- `npm run validate:codex:build`
- `npm run validate:codex`
- `node scripts/verify-wc04-repair01.mjs`
- `node scripts/verify-wc04-repair03.mjs`
- `node scripts/verify-wc05-support-navigation.mjs`
- `node --check scripts/verify-wc04-repair03.mjs`
- `node --check scripts/verify-wc05-support-navigation.mjs`
- isolated `getCurrentRequiredAction()` probe returning WC05 and not WC06
- safety scans

The broad `node scripts/verify-work-card-fixture.mjs` did not complete because of pre-existing Phase 01 WC01 Markdown-render drift. That is not a WC05 blocker because WC05 did not change the Phase 01 WC01 fixture, Work Card renderer, or those historical files. The Implementer ran focused WC05 and live-router checks separately, which is the correct mitigation for this pass.

## Non-Blocking Concerns For Operator Validation

The following should be watched during Operator validation, but they do not require repair before validation:

1. The top status strip still contains static-looking `feature/wc03` and `Saved` text. This predates WC05 and remains a UI trust issue. It is not a WC05 navigation blocker unless it misleads the Operator during this validation pass.
2. `ContextInspector` code still exists in `WorkflowRouterShell.tsx` even though the right-side context panel is not currently rendered. Dead code cleanup can be handled later unless it is accidentally surfaced in the UI.
3. The support-navigation wording may still feel dense in narrow window sizes. Operator should judge whether the support-screen banner and `Supporting tools` copy are plain enough.
4. The unavailable-route state is fixture-covered, but it still needs visual/manual judgment if the Operator can trigger or simulate that condition.

## Operator Validation Guidance

Validate WC05 from branch:

`feature/phase-03-wc05-subordinate-navigation-fallback`

Focus validation on observable behavior, not report existence.

Confirm:

1. The current-action panel remains the dominant workflow surface.
2. The primary action button reads as the preferred next action, not generic screen navigation.
3. The broad directory is labeled as supporting/reference/recovery tooling.
4. Opening a supporting screen does not make that screen look like the active workflow step.
5. The supporting-screen banner clearly says the current action is unchanged.
6. `Return to current action` restores the routed current-action screen.
7. Process-rail clicks remain available but are understandable as support-only navigation.
8. `Reference phase` and `Reference card` selectors do not imply workflow advancement.
9. Opening supporting screens does not save validation records, create artifacts, advance the current action, or mutate durable workflow state.
10. WC04 validation/repair behaviors still work: validation target selection, draft preservation, status/report context, and Architect guidance source behavior.
11. Current-action routing remains on WC05 during validation and does not advance to WC06 prematurely.
12. No WC06-WC15 behavior appears prematurely.

## Expected Operator Decision Outcomes

If the support-navigation model is understandable and the route remains primary, pass WC05.

If supporting screens still look like competing workflow authority, fail WC05 and create WC05-REPAIR01.

If the only issues are static top-strip text, dense microcopy, or general layout polish, record them as observations and defer them to later Phase 03 UI cleanup unless they materially confuse the WC05 validation.

## Final Architect Determination

WC05 is ready for Operator validation.

No repair is required before Operator validation.
