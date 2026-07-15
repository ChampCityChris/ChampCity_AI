<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/validation_report/WC09-REPAIR02",
  "artifactType": "validation_report",
  "createdAt": "2026-07-15T18:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC09-REPAIR02_locked_process_contract_and_evidence_precedence_correction.json",
  "markdownPath": "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC09-REPAIR02_locked_process_contract_and_evidence_precedence_correction.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC09",
  "payload": {
    "kind": "validation_report",
    "title": "Validation Report: WC09-REPAIR02 Locked Process Contract and Evidence Precedence Correction"
  },
  "payloadHash": "sha256:e4c1d2ced9794156beb570dcbe8c21566fd9b89014467180ab386872b7690146",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-03/work_card/WC09-REPAIR02",
      "champcity-ai/phase-03/implementer_report/WC09-REPAIR02",
      "champcity-ai/phase-03/architect_review/WC09-REPAIR02"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "blocked",
  "updatedAt": "2026-07-15T18:00:00.000Z",
  "workCardId": "WC09-REPAIR02"
}
-->

# Validation Report: WC09-REPAIR02 — Locked Process Contract and Evidence Precedence Correction

Status: Failed / WC09 blocked
Phase: phase-03
Work Card: WC09-REPAIR02
Date: 2026-07-15

## Validation Result

Result: Fail

Operator validation confirmed that the canonical Workflow State correctly routes to Architect Review of WC09-REPAIR02, but the Architect Review workspace remains unusable.

## Observed Behavior

The application shows:

- Current action: Architect review of repair Implementer Report required.
- Work Card: WC09-REPAIR02.
- Bound source path: the exact WC09-REPAIR02 Implementer Report.

The review workspace then blocks with:

- Expected output not identified.
- Current action does not identify its Work Card or repair title.
- Associated Implementer Report: none.
- No Architect Review preview can be generated.
- Save Architect Review remains unavailable.

## Root Cause

WC09-REPAIR02 corrected the canonical workflow engine, but the Architect Review screen still depends on the older `CurrentRequiredAction` projection and `resolveCurrentActionArchitectReviewBinding()` path.

The canonical routed-action contract contains the correct:

- target artifact ID;
- source Implementer Report artifact ID;
- expected Architect Review artifact ID;
- responsible role;
- current action ID.

The legacy projection fails to populate the separate fields expected by the Architect Review binding resolver:

- `workCardTitle`;
- authoritative Implementer Report source status;
- `expectedOutput.path`;
- expected output filename/path projection.

The resolver therefore blocks despite valid canonical authority.

This is a split-brain authority defect: canonical state controls routing, while a legacy independently reconstructed view controls whether the routed screen can initialize and save.

The legacy `CurrentRequiredAction` code also still contains obsolete process behavior, including legacy Implementer handoff states and unconditional Phase Interview assumptions, proving that runtime cutover was incomplete.

## Architect Disposition

WC09 is blocked.

WC09-REPAIR02 was the final numbered repair. Do not create WC09-REPAIR03.

The next correction must be planned as a new Operator-approved stabilization phase or parent architecture Work Card. Its objective must be complete removal of `CurrentRequiredAction` as independent workflow authority and direct projection of routed screens from canonical Workflow State and Artifact Registry authority.

## Required Stabilization Scope

- Remove independent workflow reconstruction from `CurrentRequiredAction` for routed screens.
- Make canonical `RoutedActionContract` the only source for target, sources, expected output, role, and transition.
- Resolve display title and paths from Artifact Registry entries by canonical artifact ID.
- Remove status-string inference and legacy handoff routing from active runtime authority.
- Make Architect Review initialize directly from the canonical target Work Card, exact Implementer Report, and expected Architect Review identity.
- Add mounted Electron tests using the real production projection path, not manually constructed `CurrentRequiredAction` fixtures.
- Prove preview, save, and transition to Operator Validation in the mounted application.

## Operator Evidence

Screenshot supplied by Operator shows the blocked WC09-REPAIR02 Architect Review workspace and exact error messages.

## Final Decision

Operator validation failed. WC09 is blocked pending Operator-approved stabilization planning.
