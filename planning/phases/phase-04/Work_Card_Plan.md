<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/work_card_plan/Work_Card_Plan",
  "artifactType": "work_card_plan",
  "createdAt": "2026-07-15T18:00:00.000Z",
  "jsonPath": "planning/phases/phase-04/Work_Card_Plan.json",
  "markdownPath": "planning/phases/phase-04/Work_Card_Plan.md",
  "payload": {
    "kind": "work_card_plan",
    "title": "Work Card Plan: phase-04"
  },
  "payloadHash": "sha256:1e781dc01671f76cec45de482531c6db2ec8057cd06fa110aad6be40ef88e9f1",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/phase_planning/Phase_Planning"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T18:00:00.000Z"
}
-->

# Work Card Plan: phase-04

Status: Approved candidate plan
Phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
Created: 2026-07-15

This plan contains candidates only. Full Work Cards are created just in time by the Architect.

## Ordered Candidates

### WC01 — Canonical Routed-Screen Cutover and Legacy Projection Retirement

Eliminate the split-brain path that caused the WC09-REPAIR02 Architect Review screen to lose canonical target, source, title, and expected-output authority. Routed screens must consume `RoutedActionContract` directly; canonical IDs resolve through the Artifact Registry; `CurrentRequiredAction` becomes presentation-only or is removed from routed writes; and the failed Architect Review scenario must work end to end.

Dependencies: none. Priority: critical.

### WC02 — Governed Operator Recovery and Override

Implement safe access recovery without state mutation, a canonical route correction request, and a gated emergency Operator override. Overrides require reason, evidence, before/after authority, confirmation, rollback, and Architect reconciliation. They cannot mark work complete, skip validation, close a phase, or activate a phase without required evidence.

Dependencies: WC01. Priority: critical.

### WC03 — Repair-Chain Limit and Stabilization Escalation Enforcement

Implement a configurable repair maximum, deterministic repair count, block creation beyond the limit, and create a stabilization escalation record. The Operator chooses whether to activate stabilization, defer, carry forward, cancel, or stop. No automatic repair may be created after the threshold.

Dependencies: WC01. Priority: high.

### WC04 — Immutable Correction, Override, and Reconciliation Evidence

Implement append-only correction and override records, explicit supersession/reconciliation links, canonical revision/audit views, and rollback based on Git/canonical revisions rather than duplicate runtime fallbacks.

Dependencies: WC01, WC02, WC03. Priority: high.

### WC05 — Integrated Stabilization Validation and Phase Transition Proof

Exercise the real production adapters in mounted Electron tests; prove the WC09-REPAIR02 Architect Review opens, previews, saves, and transitions; test recovery and repair-limit escalation; perform Operator validation through the application; and prove Phase 04 closeout/transition can occur without background artifact surgery.

Dependencies: WC01–WC04. Priority: critical.

## Candidate Resolution Rule

Phase Closeout is blocked until each candidate is completed, completed via repair within its configured limit, carried forward, deferred, or cancelled. A candidate that exhausts its repair limit remains blocked until a stabilization disposition is recorded. No additional numbered repair is permitted by inference.

## Document Disposition
Document.Status=Pending
