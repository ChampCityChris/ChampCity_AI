<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC04",
  "artifactType": "work_card",
  "createdAt": "2026-07-18T18:35:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC04 — Artifact Registry Schema Repair and Recovery Candidate Registration"
  },
  "payloadHash": "sha256:ce05ad2569cf5c12788280e557709bbf22a06a6b3988df06c9e6cd7bfe28c1c7",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC04"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
      "champcity-ai/phase-06/work_card/WC03",
      "champcity-ai/system/artifact_registry",
      "champcity-ai/project/design_document/ARTIFACT_AUTHORITY_MODEL",
      "champcity-ai/phase-06/operator_approval/WC04"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T18:55:00.000Z",
  "workCardId": "WC04"
}
-->

# Work Card: Phase 06 WC04 — Artifact Registry Schema Repair and Recovery Candidate Registration

Status: approved_for_implementer_execution
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC04
Kind: planned_candidate
Plan order: 4
Owner: Implementer
Risk: critical
Source-code execution authorized: yes — `champcity-ai/phase-06/operator_approval/WC04`
Approved Work Card revision: 3
Push authorized: no

## Purpose

Restore the production Canonical Artifact Registry to the current strict schema and re-establish canonical artifact writes without changing workflow meaning.

WC04 is the bootstrap recovery card. After repairing the Registry, it must register the verified WC04 and WC05 Work Card and approval pairs.

## Current Blocking Condition

The production Registry payload contains a legacy string `registryVersion` and unsupported `synchronizationFailures`. The current runtime requires exactly `registryVersion: 1`, `updatedAt`, and `entries`.

This blocks real-repository canonical writes even though temporary-repository tests pass.

## Required Implementation

1. Inventory the current Registry pair, schema, entries, pair references, duplicates, missing files, and unsynchronized files.
2. Add or use a deterministic, idempotent, rollback-capable offline migration.
3. Convert Registry payload data to the exact current schema.
4. Preserve valid entry identities, revisions, statuses, paths, hashes, relationships, authority flags, and synchronization flags.
5. Remove only fields prohibited by the current schema.
6. Verify the Registry JSON and Markdown remain synchronized.
7. Verify `ArtifactPairService.loadRegistry()` succeeds.
8. Register the verified WC04 and WC05 Work Card and Operator Approval pairs.
9. Verify one controlled canonical write and reread in the real repository.
10. Create a synchronized WC04 Implementer Report pair.

## Bootstrap Constraint

The migration may directly rewrite only the Registry JSON and Markdown pair because that pair is the broken write boundary. It must use the repository canonical serializer, payload hash, Markdown envelope renderer, and Registry validator.

Do not weaken the validator or add a legacy runtime reader.

## Prohibited Changes

Do not:

- change workflow, phase, candidate, repair, replacement, or routing semantics;
- mark missing or invalid pairs synchronized;
- rewrite valid artifact identities;
- add compatibility Registry readers or fallback authority;
- modify WC03 workflow implementation;
- modify the frozen Execution Pass prototype except focused Registry fixtures;
- launch Codex or implement runner transport;
- perform Operator acceptance;
- push or merge.

## Authorized Surface

- Canonical Artifact Registry pair;
- bounded Registry migration module or script;
- Registry and artifact-pair tests;
- minimum package-script wiring;
- WC04/WC05 Work Card and approval registration evidence;
- WC04 Implementer Report pair.

## Required Tests

Prove:

1. The exact legacy production-shaped Registry is rejected before migration.
2. Migration emits `registryVersion: 1`.
3. `synchronizationFailures` is removed.
4. Valid existing entries are preserved.
5. Invalid, duplicate, missing, and unsynchronized references block or are reported deterministically.
6. WC04 and WC05 Work Cards and approvals are registered only after pair verification.
7. Migration is idempotent.
8. Rollback restores the prior pair.
9. A real-repository canonical write succeeds.
10. Workflow current-action output is unchanged.
11. No compatibility reader was introduced.

## Validation

Use the approved normal Windows lane:

- `npm run typecheck`;
- focused Registry migration and artifact-authority tests;
- `npm test`;
- real Registry load and controlled write probe;
- pair synchronization verification;
- final `git status --short`.

## Required Implementer Report

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC04`

## Acceptance Criteria

WC04 is complete only when the real Registry validates under the strict current schema; synchronized canonical writes work; valid data is preserved; invalid evidence is not promoted; WC04 and WC05 Work Card and approval pairs are registered; migration and rollback are deterministic; all tests pass; the synchronized Implementer Report exists; no push occurred; and Operator acceptance was not performed.

## Manual Validation After Implementer

Architect review should verify Registry loading, controlled canonical writes, unchanged routing, no unrelated rewrites, and no compatibility fallback.

## Dependency and Sequence

WC05 is approved but may not begin until WC04 receives an accepting Architect Review.

## Document Disposition
Document.Status=Pending
