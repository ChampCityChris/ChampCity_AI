<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/architect_review/WC01",
  "artifactType": "architect_review",
  "createdAt": "2026-07-15T20:00:00.000Z",
  "jsonPath": "planning/phases/phase-04/Architect_Reviews/ARCHITECT_REVIEW_WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.json",
  "markdownPath": "planning/phases/phase-04/Architect_Reviews/ARCHITECT_REVIEW_WC01_canonical_routed_screen_cutover_and_legacy_projection_retirement.md",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: Phase 04 WC01 Canonical Routed-Screen Cutover and Legacy Projection Retirement"
  },
  "payloadHash": "sha256:6300a5009c95d4c72cb635b5b24241e9c122fd4ff525345b449356eaf4d0818f",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/work_card/WC01-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-04/implementer_report/WC01",
      "champcity-ai/phase-04/work_card/WC01"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T20:00:00.000Z",
  "workCardId": "WC01"
}
-->

# Architect Review: Phase 04 WC01 Canonical Routed-Screen Cutover and Legacy Projection Retirement

## Decision

Repair required before Operator validation.

## Confirmed implementation

- Canonical routed-screen adapter exists and resolves target, source, and expected output from RoutedActionContract plus Artifact Registry.
- Phase 04 authority and WC01 report are registered and synchronized.
- The feature branch is clean.
- Legacy Architect Review binding reconstruction was substantially retired.

## Blocking finding

The canonical WC01 Implementer Report is authoritative and synchronized in the Artifact Registry, but production Workflow State remains at `implementer_execution_required` for `champcity-ai/phase-04/work_card/WC01` and still expects `champcity-ai/phase-04/implementer_report/WC01`.

The governed transition from Implementer Report registration to `architect_review_of_implementer_report_required` did not occur.

This violates WC01 acceptance because the application cannot route the registered report to Architect Review.

## Required repair

Create the single permitted repair, WC01-REPAIR01.

The repair must make Implementer Report creation/registration and Workflow State transition one governed operation, reconcile the existing registered WC01 report into Architect Review without duplicating it, and prove restart persistence.

## Operator validation

Not authorized.
