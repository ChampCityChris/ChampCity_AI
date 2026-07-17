<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/architect_review/WC01",
  "artifactType": "architect_review",
  "createdAt": "2026-07-17T02:50:00.000Z",
  "jsonPath": "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.json",
  "markdownPath": "planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC01",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: Phase 06 WC01 Kernel Contract and Replacement Inventory"
  },
  "payloadHash": "sha256:47f6638e7ac79e5aa4b07e00198962ca862876df822428d6594dbcf3ed85dd27",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/work_card/WC01-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/implementer_report/WC01",
      "champcity-ai/phase-06/operator_approval/WC01",
      "champcity-ai/phase-06/work_card/WC01"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "blocked",
  "updatedAt": "2026-07-17T02:50:00.000Z",
  "workCardId": "WC01"
}
-->

# Architect Review: Phase 06 WC01 Kernel Contract and Replacement Inventory

Status: repair_required
Phase: phase-06
Work Card: WC01
Reviewed Implementer commit: `9c06b3f21d15be1b62bb79d6d2daa43696057873`
Reviewed Implementer Report: `champcity-ai/phase-06/implementer_report/WC01`
Reviewed Design Document: `champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory`

## Decision

The WC01 pass is not ready for Operator validation. It requires a narrow documentation/artifact repair before acceptance.

The Implementer correctly limited changed files to the four allowed WC01 artifact files and produced a useful kernel-contract direction. The design document also includes a broad Replacement Inventory and maps implementation ownership to WC02 through WC05.

However, the submitted design document does not satisfy all WC01 acceptance criteria and has artifact-quality defects that are material in a phase whose purpose is artifact authority and transition correctness.

## Findings

1. The Replacement Inventory omits an explicit `current responsibility` field for the reviewed modules. WC01 required this field so WC02 through WC05 can understand what each existing module currently does before changing or deleting it.

2. Preserve-classified entries do not name concrete supported consumers. Several entries use generic wording equivalent to `listed current or migrated consumer only`. WC01 required a named supported consumer when preserving compatibility.

3. The created artifacts use metadata timestamps later than repository modification time observed during review. Future-dated `createdAt` / `updatedAt` values are not acceptable for authority artifacts.

4. The design document relationship sources include non-canonical or unsupported source identifiers, including a lower-case artifact authority model ID and an architecture-contract reference that is not represented as a canonical artifact ID. Relationship entries should use exact known artifact IDs; ordinary documentation paths should be cited in body/source notes, not inserted as incorrect artifact IDs.

5. The Implementer Report still reports the commit hash as pending, even though the reviewed commit is `9c06b3f21d15be1b62bb79d6d2daa43696057873`.

## Non-Blocking Confirmations

- Changed-file scope is correct: the reviewed commit added only the WC01 design document pair and the WC01 Implementer Report pair.
- No source code, tests, scripts, packages, lockfiles, or build configuration files were changed.
- The broad kernel direction is aligned with Phase 06: one relationship-driven kernel, no synthetic IDs, no filename/timestamp/suffix inference, no UI or cache retargeting, and no old/new dual runtime authority.
- The existing inventory is directionally useful and should be repaired, not discarded.

## Required Repair

Create `WC01-REPAIR01` to revise the existing WC01 design document and Implementer Report in place. The repair must remain documentation-only.

Required corrections:

1. Add `current responsibility` to every Replacement Inventory entry.
2. Replace generic preserve-consumer wording with named supported consumers for every `Preserve` entry.
3. Correct artifact metadata timestamps so no created/updated timestamp is future-dated relative to the repair pass.
4. Correct relationship source IDs to exact canonical artifact IDs. Put ordinary non-artifact documentation references in the body text, not in artifact relationship sources.
5. Update the Implementer Report to record the actual reviewed commit hash.
6. Keep the same canonical artifact IDs and fixed paths; do not create `_2`, `_3`, or suffixed replacement files.
7. Do not edit source code.

## Validation Required After Repair

- Artifact-pair validation for the revised design document and Implementer Report.
- No-placeholder-hash scan.
- No concrete local path scan.
- Changed-file scope check proving only the WC01 design document pair and WC01 Implementer Report pair changed.
- No source-code, tests, scripts, package, lockfile, or config changes.

## Operator Validation

Operator validation is not ready until the repair pass is completed and reviewed.
