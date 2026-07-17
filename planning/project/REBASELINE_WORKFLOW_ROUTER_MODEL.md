<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/REBASELINE_WORKFLOW_ROUTER_MODEL",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.json",
  "markdownPath": "planning/project/REBASELINE_WORKFLOW_ROUTER_MODEL.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Project Mapping Rebaseline: Workflow Router Model"
  },
  "payloadHash": "sha256:a1537844cf395df6539a9add786a3d2e512642f6f3f535d089bf8fcff08c145f",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC09",
      "champcity-ai/phase-03/implementer_report/WC01"
    ],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/phase_closeout/PHASE_04",
      "champcity-ai/phase-05/operator_approval/WC03-roadmap-rebaseline",
      "champcity-ai/phase-05/project_roadmap/WC03",
      "champcity-ai/phase-05/reconciliation_review/WC01",
      "champcity-ai/phase-05/reconciliation_review/WC02",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "superseded",
  "updatedAt": "2026-07-17T01:35:00.000Z"
}
-->

# Project Mapping Rebaseline: Workflow Router Model

Status: Superseded as current roadmap authority by `champcity-ai/phase-05/project_roadmap/WC03`

## Disposition

This document remains historical context for the Phase 03 workflow-router correction. It is no longer the current source context for active implementation and must not be used to claim Phase 03 is current.

## Current Authority

The current approved roadmap authority is `champcity-ai/phase-05/project_roadmap/WC03`, approved by `champcity-ai/phase-05/operator_approval/WC03-roadmap-rebaseline`.

Phase 04 is closed as a stabilization bridge. Phase 05 roadmap rebaseline is approved. The next implementation phase is Phase 06: Workflow Kernel and Artifact Protocol Replacement.

## Historical Value

The durable product correction from this document remains useful: ChampCity A/I should route the Operator through a governed workflow rather than act as a screen picker. Phase 05 changes the implementation path: the old projector and artifact protocol boundary must be replaced through the Phase 06 kernel work before application-led dogfooding resumes in Phase 08.

## Superseded Statements

Any statement in this artifact that identifies Phase 03 as the approved current implementation phase is superseded. Any statement that treats Artifact Registry or Workflow State as current runtime authority before the Phase 06 kernel rebuild is superseded.
