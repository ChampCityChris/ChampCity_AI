<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/validation_report/WC02-REPAIR01",
  "artifactType": "validation_report",
  "createdAt": "2026-07-17T20:00:00.000Z",
  "jsonPath": "planning/phases/phase-06/Validation_Reports/VALIDATION_REPORT_WC02-REPAIR01_operator_validation_phase_approval_and_project_display_failure.json",
  "markdownPath": "planning/phases/phase-06/Validation_Reports/VALIDATION_REPORT_WC02-REPAIR01_operator_validation_phase_approval_and_project_display_failure.md",
  "parentArtifactId": "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
  "payload": {
    "kind": "validation_report",
    "title": "Validation Report: Phase 06 WC02-REPAIR01 — Operator Validation Failure"
  },
  "payloadHash": "sha256:89bdc7f6426598660e574f01ec6f15e9037466c46dcc26774b6b864f34cd00f8",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/work_card/WC02-REPAIR02"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card/WC02-REPAIR01",
      "champcity-ai/phase-06/approval/WC02-REPAIR01",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01",
      "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
      "champcity-ai/phase-06/approval/Operator_Phase_Approval",
      "champcity-ai/project/supporting_document/PROJECT_PROFILE"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "failed",
  "updatedAt": "2026-07-17T20:00:00.000Z",
  "workCardId": "WC02-REPAIR01"
}
-->

# Validation Report: Phase 06 WC02-REPAIR01 — Operator Validation Failure

Status: failed
Phase: phase-06
Work Card: WC02-REPAIR01
Result: failed with partial pass

## Result

The original stale Phase 04 route appears repaired: the app no longer shows `phase-04`, no longer shows Phase 04 `work_card_authoring_required`, and does not route to Ad Hoc Work Card Capture for stale Phase 04 `WC04`.

Operator validation still fails because the app now shows `phase-06` with `operator_phase_approval_required` even though Phase 06 Operator Phase Approval already exists at `champcity-ai/phase-06/approval/Operator_Phase_Approval`.

## Architect RCA

The resolver checks for Phase approval using `graph.byType("phase_approval", phaseId)`. The current Phase 06 Operator Phase Approval artifact is canonical `artifactType: "approval"`, not `phase_approval`. This artifact-type mismatch causes the resolver to treat completed Phase 06 approval as missing.

The active project dropdown also shows `Project Profile` because `projectWorkspaceRegistry.ts` uses `PROJECT_PROFILE.payload.title`. In this repo that title is the generic document title, while the real project name/public brand is in the profile body.

## Required Repair

Create WC02-REPAIR02 to align phase approval recognition with canonical approval artifacts and repair project display-name derivation.
