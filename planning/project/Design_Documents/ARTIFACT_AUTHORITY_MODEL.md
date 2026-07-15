<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/design_document/ARTIFACT_AUTHORITY_MODEL",
  "artifactType": "design_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/Design_Documents/ARTIFACT_AUTHORITY_MODEL.json",
  "markdownPath": "planning/project/Design_Documents/ARTIFACT_AUTHORITY_MODEL.md",
  "payload": {
    "kind": "design_document",
    "title": "Artifact Authority Model"
  },
  "payloadHash": "sha256:02824df5fe818ba66ec6ecfc60865c9b6549a7398735a76a60c8f29145e221b5",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Artifact Authority Model

Status: Accepted for Phase 02 WC08
Prepared: 2026-07-02
Project: ChampCity A/I

## Purpose

This document defines which artifacts propose, select, approve, execute, report, validate, and activate work. It prevents draft planning artifacts from being mistaken for approved executable work.

## Authority Chain

```text
Project Plan / Roadmap
-> Phase Map
-> Phase Planning Documents
-> Work Card Plan
-> Work Card Plan Review
-> Formal Work Cards
-> Implementer Execution Packet
-> Implementer Report
-> Human Validation Report
-> Closeout Report
-> Next Phase Activation decision
```

## Artifact Authority

- Project Plan / Roadmap = proposed end-to-end project progression.
- Phase Map = structured phase status and phase-selection authority.
- Phase Planning Documents = draft or approved plan for a selected phase.
- Work Card Plan = proposed Work Card count, order, names, and rough intent.
- Work Card Plan Review = Operator review surface for proposed Work Card entries; it does not create executable work until a separate approved materialization step exists.
- Formal Work Cards = approved executable units saved under `Work_Cards/`.
- Implementer Execution Packet = build instruction generated from an approved Formal Work Card.
- Implementer Report = Implementer result.
- Human Validation Report = Operator evidence and decision.
- Closeout Report = phase-level acceptance and transition authority.

## Status Rules

- Until a roadmap phase is mapped, it is Proposed.
- Once a roadmap phase is mapped, it becomes a mapped phase record, but it is still not active.
- Phase Planning Documents created before prior-phase closeout are Pending Review.
- Work Card Plans remain proposals until selected items are approved as Formal Work Cards.
- Planned Work Card entries may be Proposed, Deferred, Superseded, Already Satisfied, Implemented But Not Validated, or Validated But Not Closed without becoming executable Formal Work Cards.
- Formal Work Cards require a separate Operator approval step.
- Implementer Execution Packets are generated only after a Formal Work Card exists.
- Phase Closeout must record a Next Phase Activation decision.
- Next Phase Activation decisions include Activate next phase, Defer next phase, Revise roadmap first, Carry unresolved current-phase items forward, and Close current phase without activation.

## Normal Planned Workflow

```text
Project Intake
-> Project Plan / Roadmap
-> Phase Map
-> Phase Planning Documents
-> Work Card Plan
-> Work Card Plan Review
-> Architect drafts Formal Work Card
-> Operator approves Formal Work Card
-> Implementer Execution Packet
-> Build
-> Implementer Report
-> Human Validation
-> Repair or Accept
-> Phase Closeout
-> Next Phase Activation
```

## Phase 03 Draft Rule

Phase 03 draft artifacts may live under `planning/phases/phase-03/`, but they must be labeled Draft / Pending Review / Not Active until closeout or activation. They are not executable Formal Work Cards and must not trigger Implementer Execution Packet generation.

## Ad Hoc Work Rule

Ad Hoc Work Card Capture is not the normal next step after phase planning. It is for out-of-cycle, one-off, repair, emergency, or operator-discovered work.

The Ad Hoc Work Card Capture screen uses manual/ad hoc mode: its local Work Card ID, title, and phase fields are authoritative for the new draft. It must not imply linkage to an existing planned card unless a future Operator-approved linking workflow is added.

## Non-Goals

- This model does not close Phase 02.
- This model does not activate Phase 03.
- This model does not create Phase 03 Formal Work Cards.
- This model does not replace Operator manual validation or acceptance.
