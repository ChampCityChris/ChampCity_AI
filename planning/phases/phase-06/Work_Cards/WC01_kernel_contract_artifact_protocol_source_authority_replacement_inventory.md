<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC01",
  "artifactType": "work_card",
  "createdAt": "2026-07-17T02:20:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC01 — Kernel Contract, Artifact Protocol, and Source Authority Replacement Inventory"
  },
  "payloadHash": "sha256:053fdfe78c55a7a214b1230c87944ddf4ec9b849e7a727b18e71fc5f3adf3874",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/implementer_report/WC01"
    ],
    "sources": [
      "champcity-ai/phase-06/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/operator_approval/WC01",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-06/phase_planning/Phase_Planning",
      "champcity-ai/phase-05/roadmap_rebaseline/WC03",
      "champcity-ai/project/observation_register/Project_Observation_Register"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "approved_for_implementer_execution",
  "updatedAt": "2026-07-17T02:25:00.000Z",
  "workCardId": "WC01"
}
-->

# Work Card: Phase 06 WC01 — Kernel Contract, Artifact Protocol, and Source Authority Replacement Inventory

Status: approved_for_implementer_execution
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC01
Owner: Implementer
Risk: critical
Change strategy: Review and classify only; no source-code changes authorized

## Purpose

Define the target workflow kernel contract and artifact-transition protocol before replacement implementation begins.

WC01 must also complete a source-code authority review and produce a Replacement Inventory so later implementation Work Cards do not preserve wrong old authority paths merely because they exist.

## Scope

WC01 includes:

1. Target workflow kernel contract.
2. Artifact-transition protocol.
3. Supported artifact types and required artifact relationships.
4. Transition inputs and transition outputs.
5. Blocking model and ambiguity handling.
6. No-fallback invariants.
7. Source-code authority review.
8. Replacement Inventory for current workflow-authority code paths.

## Minimum Source Review Scope

Review, at minimum:

- `src/main/workflow/`
- `src/shared/workflow/`
- `src/main/workCards/`
- `src/shared/workCards/`
- `src/main/repository/`
- `src/main/projects/`
- relevant IPC, preload, and renderer current-action bindings
- repository gates and tests under `scripts/` and `test/`

Do not assume this list is exhaustive. If additional workflow-authority files are discovered, include them in the inventory.

## Replacement Inventory Requirements

For each affected module or code path, record:

- existing file/module
- current responsibility
- current authority problem, if any
- classification: Preserve, Migrate, Replace, Delete, or Defer
- named supported consumer, if preserving compatibility
- migration requirement
- deletion/removal requirement
- tests or gates needed to prevent old/new dual authority
- later Work Card that owns the implementation change

## No-Source-Change Boundary

WC01 does not authorize source-code edits, source deletions, runtime fallbacks, compatibility shims, provider integration, UI rewrites, or test rewrites.

Source-code inspection is required. Source-code modification is prohibited.

## Required Output

Create a synchronized design document pair:

`planning/phases/phase-06/Design_Documents/DESIGN_DOCUMENT_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory`

Create a synchronized Implementer Report pair:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.{json,md}`

Canonical artifact ID:

`champcity-ai/phase-06/implementer_report/WC01`

## Required Design Document Contents

The design document must include:

1. Target kernel contract.
2. Artifact-transition protocol.
3. Supported artifact types.
4. Required relationships and authority rules.
5. Transition input and output schema.
6. Blocking and ambiguity model.
7. No-fallback invariants.
8. Replacement Inventory.
9. WC02/WC03/WC04/WC05 implementation ownership mapping.
10. Validation and repository gate recommendations.

## Acceptance Criteria

- Full source-authority inventory is present.
- Every reviewed code path is classified Preserve, Migrate, Replace, Delete, or Defer.
- No source code is changed.
- No runtime fallback is introduced.
- No old/new dual authority is authorized.
- WC02 has enough information to begin replacement without rediscovering the architecture during coding.
- The Implementer Report lists inspected files, findings, validation, and final git status.

## Validation

Run artifact-pair validation if available. Verify no source code changed. Do not run broad implementation validation unless required by repository rules for documentation-only changes.

## Manual Validation After Implementer

Operator/Architect validation should confirm:

1. The source review covered all known workflow-authority surfaces.
2. The Replacement Inventory is specific enough to drive WC02–WC05.
3. No source-code changes were made.
4. Old-foundation replacement rules are reflected in the inventory.
5. The output does not authorize compatibility fallbacks without a named supported consumer and sunset plan.
