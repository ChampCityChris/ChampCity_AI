<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/phase_planning/Phase_Planning",
  "artifactType": "phase_planning",
  "createdAt": "2026-07-15T18:00:00.000Z",
  "jsonPath": "planning/phases/phase-04/Phase_Planning.json",
  "markdownPath": "planning/phases/phase-04/Phase_Planning.md",
  "payload": {
    "kind": "phase_planning",
    "title": "Phase Planning: phase-04"
  },
  "payloadHash": "sha256:b87ee990357f1a038086e1740ee442c1e5a7676544ba56e7884a933f3489edd7",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-04/approval/Operator_Phase_Approval"
    ],
    "sources": [
      "champcity-ai/phase-03/validation_report/WC09-REPAIR02"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T18:00:00.000Z"
}
-->

# Phase Planning: phase-04

Status: Approved / manually activated stabilization authority
Project: ChampCity A/I
Phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
Phase type: Architecture stabilization and operational recovery
Date activated: 2026-07-15

## Activation Decision

Phase 03 is blocked after WC09-REPAIR02 Operator validation exposed a split-brain runtime authority defect. The canonical Workflow State identifies the correct action, target, source, and expected output, while the older `CurrentRequiredAction` projection reconstructs conflicting data and prevents the routed Architect Review screen from initializing.

The Operator has directed the project to begin Phase 04 immediately. Manual activation is required because the application cannot yet process this transition safely. These durable Phase 04 records are the controlling transition evidence. They do not mark Phase 03 successful or erase its failed validation.

## Phase Purpose

Stabilize ChampCity A/I so the application can govern its own development workflow without trapping the Operator, mutating authority through background corrections, or permitting endless local repair chains.

## Primary Outcomes

1. Complete runtime cutover to one canonical workflow authority.
2. Remove or reduce `CurrentRequiredAction` to presentation-only projection.
3. Make routed screens resolve target, sources, and expected output directly from `RoutedActionContract` and the Artifact Registry.
4. Implement a governed Operator recovery and override system.
5. Encode repair-chain limits and escalation into application state.
6. Prevent hidden mutable corrections from silently changing source-of-truth records.
7. Prove the current WC09-REPAIR02 Architect Review scenario end to end through the real application.

## Operator Recovery Model

### Level 1 — Safe access recovery

Allows the Operator to open the exact canonical target screen or artifact when navigation is broken. It does not mutate workflow state.

### Level 2 — Route correction request

Creates a canonical correction record describing the current route, expected route, evidence, and requested correction. Architect disposition is required before workflow authority changes.

### Level 3 — Emergency Operator override

Available only when the application prevents governed work from continuing and ordinary correction cannot be completed. It must require an explicit reason, show current and proposed authority, prohibit marking work complete or skipping validation, create append-only canonical evidence, preserve the prior state, and require later Architect reconciliation.

## Repair-Chain Governance

Every Work Card must carry a repair policy containing maximum repair count, current count, escalation threshold, and permitted escalation action. When the limit is reached, the application blocks another numbered repair, marks the parent blocked pending stabilization, and requires an Operator stabilization disposition.

## Source-of-Truth Rules

- Canonical Workflow State and Artifact Registry are the only runtime authority.
- Presentation projections may not independently infer or override workflow authority.
- Historical existence is not a compatibility requirement.
- Corrections must create canonical evidence; background edits must not silently rewrite controlling history.
- Incorrect runtime paths should be replaced and removed rather than retained as fallback debt.
- Rollback uses Git and canonical revision history, not permanent duplicate runtime paths.

## In Scope

- Routed-screen authority cutover.
- Architect Review binding correction.
- Retirement of legacy workflow reconstruction.
- Governed Operator access recovery, route correction, and emergency override.
- Repair-limit enforcement and stabilization escalation records.
- Immutable correction and override evidence.
- Production end-to-end validation using the WC09-REPAIR02 failure scenario.

## Out of Scope

- Broad visual redesign.
- Provider API integration.
- Multi-project support.
- Release packaging.
- General UI polish unrelated to recovery and authority.
- Reopening the locked process baseline.
- Treating Phase 03 as successfully completed.

## Acceptance Goals

Phase 04 succeeds when the Architect Review screen initializes from canonical authority; preview, save, and transition work through the real application; no routed screen uses independent inference; Operator recovery is gated and auditable; repair limits are enforced; immutable evidence is retained; and Phase 04 can be validated without background artifact surgery.

## Implementation Strategy

Use bounded Work Cards with architecture checkpoints. First establish authority cutover, then Operator recovery, then repair-limit governance, then immutable evidence, then integrated validation.

## Phase Boundary

This Phase Planning document and the associated Work Card Plan are Phase Mapping outputs. Full Work Cards are created just in time, one candidate at a time.
