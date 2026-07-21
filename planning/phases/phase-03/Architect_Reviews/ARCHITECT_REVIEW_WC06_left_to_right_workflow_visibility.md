<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/architect_review/WC06",
  "artifactType": "architect_review",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC06_left_to_right_workflow_visibility.json",
  "markdownPath": "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC06_left_to_right_workflow_visibility.md",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: WC06 Left-to-Right Workflow Visibility"
  },
  "payloadHash": "sha256:862d9b13a7d36143dbca9d022c9c1aa552d17e5c249073f213ec695947a7a1b4",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/operator_validation/WC06"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/operator_validation/WC06"
    ],
    "sources": [
      "champcity-ai/phase-03/implementer_report/WC06",
      "champcity-ai/phase-03/work_card/WC06_left_to_right_workflow_visibility"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC06"
}
-->

# Architect Review: WC06 Left-to-Right Workflow Visibility

## Review Target

- Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
- Work Card: WC06 — Left-to-Right Workflow Visibility
- Implementer Report: `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC06_left_to_right_workflow_visibility.md`
- Implementation Branch: `feature/phase-03-wc06-left-to-right-workflow-visibility`
- Review Date: 2026-07-13

## Outcome

Ready for Operator validation.

No repair is required before Operator validation.

## Architect Review Summary

WC06 appears aligned with the Work Card objective. The implementation creates a true left-to-right workflow guide rather than another generic navigation bar. The visible sequence is derived from the locked workflow model and preserves the full ordered process:

`Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop`

The implementation also preserves the core Phase 03 authority model: the current-action router and WC04 current-action panel remain primary. The new workflow guide explains position and loops; it does not become a second workflow authority.

## What Was Reviewed

Reviewed the WC06 Implementer Report and inspected the shared workflow visibility model and focused fixture:

- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC06_left_to_right_workflow_visibility.md`
- `src/shared/workCards/workflowVisibility.ts`
- `scripts/verify-wc06-workflow-visibility.mjs`

The repository was on the expected feature branch and clean at the start of Architect review.

## Findings

### 1. Locked left-to-right workflow is represented correctly

The shared workflow model defines the visible guide from `lockedWorkflowSteps` and the focused fixture asserts that the rendered guide sequence matches the locked workflow sequence exactly. This is important because WC06 is not merely a visual polish task; it is about making the process model legible without drifting from the authoritative workflow.

### 2. Capture / Frame / Plan / Build / Prove are subordinate labels

The implementation uses Capture, Frame, Plan, Build, and Prove as grouping aids above the exact locked workflow steps. That matches the intended human model. These labels do not replace, rename, or reorder the locked workflow.

### 3. Current state is derived conservatively

The model distinguishes completed, current, upcoming, blocked, repair, and unknown states. Unknown or generic blocked state does not invent progress. This is the correct behavior. The app should not imply prior steps are complete unless durable current-action evidence supports that conclusion.

### 4. Repair and Work Card loop states are handled

The Work Card loop lane includes Work Card, Implementer, Architect Review, Operator Validation, Repair if needed, Validation again, and Next Work Card. The fixture covers repair validation and confirms that repair state is reflected in the Work Card loop rather than flattening repair into a generic current step.

### 5. WC04 current-action authority is preserved

The report states, and the model supports, that WC06 consumes current-action data read-only. It does not create a second evaluator, does not mutate durable workflow state, and does not replace the WC04 current-action panel.

### 6. WC05 support-navigation authority is preserved

Process-step clicks remain support-only navigation through the existing guarded support-navigation path. That is correct for WC06. The guide may help the Operator understand where they are, but clicking a step must not approve, validate, save, repair, or advance state.

### 7. WC07-WC15 were not implemented

The Implementer Report states no artifact review workspace, current-step context inspector, route-specific screen correction, closeout handling, or later Work Card behavior was added. That is within WC06 scope.

## Validation Evidence Considered

The Implementer reports these validation results:

- `npm run validate:codex:unit` passed.
- `npm run validate:codex:build` passed.
- `npm run validate:codex` passed.
- `node scripts/verify-wc06-workflow-visibility.mjs` passed.
- `node scripts/verify-wc05-support-navigation.mjs` passed.
- `node scripts/verify-wc04-repair01.mjs` passed.
- `node scripts/verify-wc04-repair03.mjs` passed.
- `node scripts/verify-work-card-fixture.mjs --current-action-only` passed.

The focused WC06 fixture checks exact locked order, group labels, loop definitions, current/completed/upcoming/blocked/repair/unknown/complete states, Work Card loop substages, and live WC06-not-WC07 routing.

## Non-Blocking Watch Items For Operator Validation

The Operator should pay close attention to visual usability rather than code-level correctness:

1. Whether the workflow truly reads left to right on the intended widescreen layout.
2. Whether the horizontal scroll fallback is understandable at narrower widths.
3. Whether the current step is visually obvious without competing with the WC04 current-action panel.
4. Whether completed/current/upcoming/blocked/repair/unknown states are distinguishable enough for a non-technical Operator.
5. Whether the approval/revision, Work Card repair, and phase-repeat loops are understandable.
6. Whether step clicks feel like support/reference navigation rather than workflow advancement.
7. Whether long step names remain readable.
8. Whether WC04 current-action and WC05 support-navigation behavior remains intact.

These are validation focus areas, not pre-validation repair blockers.

## Operator Validation Guidance

Validate WC06 visually and behaviorally from:

`feature/phase-03-wc06-left-to-right-workflow-visibility`

Operator validation should confirm:

1. The exact workflow reads left to right.
2. The current step agrees with the current-action panel.
3. Completed, current, upcoming, blocked, repair, and unconfirmed states are visually distinguishable.
4. Work Card, validation/repair, approval/revision, and phase loops are understandable.
5. The guide does not become the primary workflow authority.
6. Clicking a non-current step opens a supporting/reference screen only.
7. Clicking a step does not save, approve, validate, repair, or advance durable state.
8. WC04 current-action panel behavior remains usable.
9. WC05 supporting tools and return-to-current-action behavior remain usable.
10. WC07-WC15 behavior does not appear prematurely.

## Decision

WC06 is ready for Operator validation.

Do not merge to `dev` until Operator validation passes.

Do not begin WC07 until WC06 is validated and merged.

## Document Disposition
Document.Status=Pending
