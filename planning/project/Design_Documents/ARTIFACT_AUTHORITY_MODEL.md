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
  "payloadHash": "sha256:2c322c0034db96d07bd30566ca1386d4fa5583b8a6749ce791f5d2d51ab55f4e",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-05/approval/WC03-roadmap-rebaseline",
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/reconciliation_review/WC02",
      "champcity-ai/phase-05/roadmap_rebaseline/WC03",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-17T01:35:00.000Z"
}
-->

# Artifact Authority Model

Status: Updated for Phase 05 approved roadmap baseline
Project: ChampCity A/I
Current approved roadmap authority: `champcity-ai/phase-05/roadmap_rebaseline/WC03`

## Purpose

This document defines how artifacts propose, select, approve, execute, report, validate, and activate work after the Phase 05 roadmap rebaseline. It prevents draft planning artifacts, historical authority models, and old Implementer Execution Packet concepts from overriding the approved current baseline.

## Current Baseline

Phase 04 is closed as a stabilization bridge. Phase 05 roadmap rebaseline is approved. Phase 06 is the next implementation phase and must replace the old evidence projector and artifact protocol boundary.

Artifact Registry and Workflow State are diagnostic/cache until the workflow kernel is rebuilt. They may assist inspection and audit, but they do not independently override the approved roadmap or the future Phase 06 kernel.

## Authority Chain

```text
Project Roadmap
-> Phase Mapping / Phase Planning
-> Operator Phase Approval
-> Work Card Plan
-> Just-in-time Work Card
-> Implementer handoff through the Work Card contract
-> Implementer Report
-> Architect Review
-> Operator Validation
-> Candidate Disposition or Repair Work Card
-> Phase Closeout
-> Operator Closeout Approval
-> Roadmap Update / Next Phase Activation
```

## Artifact Authority

- Project Roadmap = living master phase sequence and release-candidate scope.
- Phase Mapping / Phase Planning = phase-level planning for the first incomplete approved phase.
- Work Card Plan = proposed Work Card count, order, names, dependencies, and purpose.
- Just-in-time Work Card = approved executable unit and Implementer handoff authority.
- Implementer Execution Packet is not a separate primary artifact that overrides the Work Card. If packet-shaped content is needed, it must be derived from or embedded in the approved Work Card contract.
- Implementer Report = Implementer result and changed-work evidence.
- Architect Review = Architect disposition of Implementer work and validation readiness.
- Operator Validation = Operator evidence and acceptance/rejection record.
- Candidate Disposition or Repair Work Card = governed route after validation or review.
- Closeout Report and Operator Closeout Approval = phase-level acceptance and transition authority.

## Status Rules

- Historical Phase 03 and Phase 04 artifacts remain evidence, not current implementation authority.
- Phase 06 kernel work is the next implementation priority.
- A Work Card may be mutable until it is passed to the Implementer; after handoff it becomes an artifact of record.
- Every workflow artifact must resolve to one authoritative revision. Filename suffixes, filesystem order, timestamps, or report-status strings are not authority.
- Wrong old foundations must be replaced or migrated rather than kept alive through unapproved runtime compatibility fallbacks.
- Compatibility requires a named supported consumer, explicit approval, and a sunset/removal plan.

## Non-Goals

- This model does not authorize source-code implementation by itself.
- This model does not claim the current application already satisfies the Phase 06 workflow kernel.
- This model does not preserve separate Implementer Execution Packet authority from older documents.
- This model does not replace Operator manual validation or acceptance.
