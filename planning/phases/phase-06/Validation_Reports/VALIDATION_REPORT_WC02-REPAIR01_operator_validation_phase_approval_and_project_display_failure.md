<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/operator_validation/WC02-REPAIR01",
  "artifactType": "operator_validation",
  "createdAt": "2026-07-17T20:00:00.000Z",
  "jsonPath": "planning/phases/phase-06/Validation_Reports/VALIDATION_REPORT_WC02-REPAIR01_operator_validation_phase_approval_and_project_display_failure.json",
  "markdownPath": "planning/phases/phase-06/Validation_Reports/VALIDATION_REPORT_WC02-REPAIR01_operator_validation_phase_approval_and_project_display_failure.md",
  "parentArtifactId": "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
  "payload": {
    "kind": "operator_validation",
    "title": "Validation Report: Phase 06 WC02-REPAIR01 — Operator Validation Failure"
  },
  "payloadHash": "sha256:906ae05c47c996f03c93a8365aa20856c71f834d4fc75bbc94c8c8f637500cac",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/work_card/WC02-REPAIR02"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card/WC02-REPAIR01",
      "champcity-ai/phase-06/operator_approval/WC02-REPAIR01",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01",
      "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
      "champcity-ai/phase-06/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/project/supporting_document/PROJECT_PROFILE"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "blocked",
  "updatedAt": "2026-07-17T20:20:00.000Z",
  "workCardId": "WC02-REPAIR01"
}
-->

# Validation Report: Phase 06 WC02-REPAIR01 — Operator Validation Failure

Status: failed
Phase: phase-06
Work Card: WC02-REPAIR01
Result: failed with partial pass

## Result

The original stale Phase 04 route appears repaired. The app no longer shows `phase-04`, no longer shows Phase 04 `work_card_authoring_required`, and does not route to Ad Hoc Work Card Capture for stale Phase 04 `WC04`.

Operator validation still fails because the app now shows `phase-06` with `operator_phase_approval_required` even though Phase 06 Operator Phase Approval already exists at `champcity-ai/phase-06/operator_approval/Operator_Phase_Approval`.

The active project dropdown also displays `Project Profile` instead of a usable workspace/project name.

## Corrected Architect RCA

The failure is not merely that the resolver should recognize an existing `approval` artifact as if it were a `phase_approval`.

WC01 defined the Phase 06 target artifact protocol and listed `operator_approval` as the supported operator approval evidence type. The current system is inconsistent across three surfaces:

- `processContract.ts` still expects `phase_approval` for `operator_phase_approval_required`;
- the existing Phase 06 Operator Phase Approval artifact is typed as generic `approval`;
- WC01 target protocol lists `operator_approval`.

This is an incomplete migration from old/process-contract artifact language and existing generic approval artifacts into the Phase 06 target resolver protocol. The correct repair is to align the process contract, resolver, and governing approval artifacts to the WC01 target artifact protocol, not to preserve `phase_approval` or blindly treat generic `approval` as the final target model.

The project dropdown issue is separate. `projectWorkspaceRegistry.ts` uses `PROJECT_PROFILE.payload.title`; in this repo that field is the document title `Project Profile`, not the workspace/project display name. The registry must derive a human-usable project display name from explicit metadata or safe fallbacks, not from generic document titles.

## Required Repair Direction

Create WC02-REPAIR02 to complete the target artifact-protocol migration for phase/operator approvals and to repair project display-name derivation.

The repair must not create a duplicate `phase_approval` artifact as a workaround. It must not preserve old artifact language in the resolver. It must resolve the target artifact type and migrate the code/artifacts/tests accordingly.
