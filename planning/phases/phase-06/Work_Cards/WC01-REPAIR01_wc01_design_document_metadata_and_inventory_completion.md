<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC01-REPAIR01",
  "artifactType": "work_card",
  "createdAt": "2026-07-17T02:50:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC01-REPAIR01_wc01_design_document_metadata_and_inventory_completion.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC01-REPAIR01_wc01_design_document_metadata_and_inventory_completion.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC01",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC01-REPAIR01 — WC01 Design Document Metadata and Inventory Completion"
  },
  "payloadHash": "sha256:e119abaeb0e6bd679def50b6be4b58cc19e09628716469b0f9e4a04b593175b0",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC01-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card/WC01",
      "champcity-ai/phase-06/operator_approval/WC01",
      "champcity-ai/phase-06/operator_approval/WC01-REPAIR01",
      "champcity-ai/phase-06/implementer_report/WC01",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/architect_review/WC01"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "approved_for_implementer_execution",
  "updatedAt": "2026-07-17T02:55:00.000Z",
  "workCardId": "WC01-REPAIR01"
}
-->

# Work Card: Phase 06 WC01-REPAIR01 — WC01 Design Document Metadata and Inventory Completion

Status: approved_for_implementer_execution
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Parent Work Card: WC01
Repair Work Card: WC01-REPAIR01
Owner: Implementer
Risk: medium
Change strategy: Documentation/artifact repair only; no source-code changes authorized

## Purpose

Repair the WC01 design document and Implementer Report so the WC01 output satisfies the approved Work Card and can proceed to Operator validation.

The prior WC01 pass produced useful kernel-contract direction and changed only allowed documentation artifacts, but it failed specific artifact-quality and inventory-completeness requirements.

## Scope

Revise the existing WC01 artifact pairs in place:

- `planning/phases/phase-06/Design_Documents/DESIGN_DOCUMENT_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.{json,md}`
- `planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.{json,md}`

Do not create suffixed replacement files.

## Required Corrections

1. Add `current responsibility` to every Replacement Inventory entry.
2. Replace generic preserve-consumer wording with named supported consumers for every `Preserve` entry.
3. Correct artifact metadata timestamps so no created/updated timestamp is future-dated relative to the repair pass.
4. Correct relationship source IDs to exact canonical artifact IDs. Use ordinary body text for non-artifact documentation references.
5. Update the Implementer Report to record actual reviewed commit hash `9c06b3f21d15be1b62bb79d6d2daa43696057873`.
6. Preserve the existing canonical artifact IDs and fixed paths.
7. Preserve the documentation-only boundary.

## Forbidden Changes

- No source-code edits.
- No test edits.
- No script edits.
- No package, lockfile, build, or config edits.
- No Workflow State or Artifact Registry edits.
- No new runtime fallback, compatibility shim, provider integration, or UI implementation.

## Required Validation

- Verify only the two WC01 artifact pairs changed.
- Verify JSON/Markdown pairs are synchronized.
- Verify no placeholder hashes.
- Verify no concrete local paths.
- Verify no source-code, tests, scripts, packages, lockfiles, or config files changed.

## Required Implementer Report

Create or update a synchronized repair Implementer Report pair:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_wc01_design_document_metadata_and_inventory_completion.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-06/implementer_report/WC01-REPAIR01`

The report must list the exact corrections made, validation run, changed files, skipped validations and reasons, final git status, and commit hash.

## Acceptance Criteria

- Every inventory entry has current responsibility.
- Every preserve entry has a named supported consumer.
- Artifact relationship sources are canonical or moved to body text.
- No future-dated artifact metadata remains in the revised WC01 artifacts.
- The reviewed commit hash is recorded correctly.
- No source code changed.
