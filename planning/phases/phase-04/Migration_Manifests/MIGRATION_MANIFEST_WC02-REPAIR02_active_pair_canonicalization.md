<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/migration_manifest/WC02-REPAIR02-active-pair-canonicalization",
  "artifactType": "migration_manifest",
  "createdAt": "2026-07-16T19:10:00.000Z",
  "jsonPath": "planning/phases/phase-04/Migration_Manifests/MIGRATION_MANIFEST_WC02-REPAIR02_active_pair_canonicalization.json",
  "markdownPath": "planning/phases/phase-04/Migration_Manifests/MIGRATION_MANIFEST_WC02-REPAIR02_active_pair_canonicalization.md",
  "parentArtifactId": "champcity-ai/phase-04/work_card/WC02-REPAIR02",
  "payload": {
    "kind": "migration_manifest",
    "title": "Migration Manifest: WC02-REPAIR02 Active Pair Canonicalization"
  },
  "payloadHash": "sha256:6e9323e98ba3e7a6b5d0fb9b3b96001fa599562e524614475b3f54673fa88d4b",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [
      "champcity-ai/phase-04/architect_review/WC02-REPAIR01",
      "champcity-ai/phase-04/architect_review/WC02",
      "champcity-ai/phase-04/reconciliation_review/PHASE_04_RECONCILIATION_AND_CLOSEOUT_READINESS_REVIEW",
      "champcity-ai/phase-04/work_card/WC02-REPAIR02"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T19:10:00.000Z",
  "workCardId": "WC02-REPAIR02"
}
-->

# Migration Manifest: WC02-REPAIR02 Active Pair Canonicalization

This manifest records active canonical pair corrections required before the executable transition engine can treat repository evidence as authority. No runtime fallback reader was added.

## Corrections

- architect-review-wc02-repair01-envelope: Markdown envelope was not canonical two-space JSON. Operation: Re-render Markdown envelope from the canonical JSON artifact and preserve payload content. Destination: champcity-ai/phase-04/architect_review/WC02-REPAIR01.
- architect-review-wc02-payload-hash: JSON payloadHash did not match the canonical payload hash. Operation: Rebuild canonical JSON and Markdown from the existing payload, relationships, identity, and paths. Destination: champcity-ai/phase-04/architect_review/WC02.
- phase04-reconciliation-envelope: Markdown envelope was not canonical two-space JSON. Operation: Re-render Markdown envelope from the canonical JSON artifact and preserve payload content. Destination: champcity-ai/phase-04/reconciliation_review/PHASE_04_RECONCILIATION_AND_CLOSEOUT_READINESS_REVIEW.
- work-card-wc02-repair02-payload-hash: JSON payloadHash did not match the canonical payload hash. Operation: Rebuild canonical JSON and Markdown from the existing payload, relationships, identity, and paths. Destination: champcity-ai/phase-04/work_card/WC02-REPAIR02.

## Rollback

Restore the listed source paths from git history using the recorded beforeHashes, then rerun canonical pair verification and repository gates.
