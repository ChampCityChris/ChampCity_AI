<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR05"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR05_single_canonical_markdown_replacement_pair_protocol_deletion_and_operator_content_ingestion_completion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC25-REPAIR05_single_canonical_markdown_replacement_pair_protocol_deletion_and_operator_content_ingestion_completion.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "RCA — REPAIR05 Incomplete Full-Lifecycle Content Ingestion and Migration Blocking",
    "decision": "REPAIR06 required",
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator requested a full RCA and a concise REPAIR06 that fixes the remaining product defects without test-suite expansion.",
    "reviewedAt": "2026-07-27"
  }
}
CHAMPCITY-METADATA -->

# RCA — WC25-REPAIR05 Incomplete Full-Lifecycle Content Ingestion and Migration Blocking

## Repository State Verified

Repository: `ChampCityChris/ChampCity_AI`
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
HEAD: `f723bbf3eff6c65b2e5d168ddfbfa1b1199a72f1`
Working tree: dirty; no Git mutation authorized or performed by this RCA.

## Executive Finding

REPAIR05 correctly deleted the prohibited generic canonical registry, construction service, content-submission service, creation contracts, context keys, and active `jsonPath` aliases.

It did not complete the replacement.

The deleted content-submission service previously carried two different responsibilities:

1. prohibited generic authority selection through registry entries, contract IDs, context keys, and caller-supplied document identity;
2. necessary transfer of Architect-authored substantive content into application-owned canonical documents.

REPAIR05 removed both responsibilities, then rebuilt only the Architect Interview content path. The rest of the lifecycle can generate handoffs and review files that already exist, but the application cannot receive the Architect-authored outputs that are supposed to create those files.

The application therefore reaches Project Planning and then lacks a complete product mechanism to create Project Profile and Project Roadmap. The same gap repeats for Phase Map, Phase Interview, Phase Planning, Formal Work Card, and Repair Work Card.

## Confirmed Defect Chain

### RCA-01 — Migration conflicts are informational instead of blocking

File: `src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts`

`previewItem()` returns `status: "ready"` whenever legacy JSON parses. `legacyMarkdownFindings()` may append:

- `Revision mismatch.`
- `Disposition mismatch.`
- `Source mismatch.`

Those findings do not change the item to `blocked`. Apply therefore proceeds despite a known authority conflict.

Source comparison is also incomplete. It compares only source-array length, not normalized `(path, revision)` tuples.

### RCA-02 — Duplicate identity detection includes the path

`activeIdentityKey()` includes the target path. Two documents with the same artifact type and canonical identity at different paths therefore receive different keys and are not detected as duplicate active identity.

Canonical identity must be evaluated independently from storage path.

### RCA-03 — Content-ingestion responsibility was restored only for Architect Interview

A complete direct path exists for Architect Interview:

```text
architectInterview:saveOutput
→ saveArchitectInterviewOutput(markdownBody)
→ saveCurrentArchitectInterviewOutput(workspaceRoot, markdownBody)
```

No equivalent application-owned save/import operation exists for:

- Project Profile and Project Roadmap;
- Phase Map;
- Phase Interview;
- Phase Planning and Work Card Plan;
- Formal Work Card;
- Repair Work Card.

Current services generate only handoffs and expected target paths. They later call `requiredAny()` or equivalent and assume the output files already exist.

### RCA-04 — Multi-document output creation is not atomic

Project Planning and Phase Planning use shared bundle disposition, but there is no application operation that creates or revises both bundle documents in one transaction.

The existing `writeArtifactTransaction()` can provide the required atomic installation. `canonicalMarkdownDocumentWriter.ts` currently exposes only a one-document public writer, so workflow services cannot use one verified transaction for a bundle without duplicating transaction code.

### RCA-05 — Architect Interview identity remains path-derived

`saveCurrentArchitectInterviewOutput()` creates new metadata with:

```ts
identity: {}
```

The resolver validates target path, artifact type, role, and source revisions, but not the expected canonical project identity. The application owns identity and must derive it from the current Project Intake and Prompt evidence.

### RCA-06 — Structured Architect outputs need an explicit substantive format

Phase Map and Work Card Plan contain machine-required domain values:

- `PhaseMapPhase[]`;
- `WorkCardCandidate[]`.

The content producer may not provide canonical metadata, but these arrays are substantive planning content rather than workflow authority. They must be carried inside the Markdown body in a bounded application-readable domain block, validated by the owning service, and copied into application-owned `workflowData`.

Without this rule, the application either invents default phases/candidates or cannot construct the structured document.

### RCA-07 — Legacy repair helpers remain outside the migration boundary

`src/main/architectInterview/architectInterviewService.ts` still contains obsolete Markdown/JSON review and legacy-envelope recovery helpers. IPC, preload, renderer, and shared contracts still expose `repairArchitectInterviewCanonicalEnvelope` even though the recognized legacy path always returns false.

Legacy pair reading was approved only inside the versioned migration module and migration fixtures.

### RCA-08 — Validation proved process health, not the product path

The Electron evidence established that the process stayed alive. Source searches and service tests established wiring and isolated behavior.

They did not establish that the running application allowed the Operator to:

1. generate a handoff;
2. paste the Architect output;
3. save the correct canonical document or bundle;
4. visibly refresh the output;
5. apply disposition;
6. advance to the next workspace.

## Root Cause

REPAIR05 was designed around deletion of prohibited abstractions. The Implementer mapped every caller of the old modules but treated many downstream workflow services as complete once they could generate a Markdown handoff and no longer referenced the deleted registry.

That analysis tracked symbols rather than end-to-end responsibility.

The Architect Interview path succeeded because REPAIR05 gave it an explicit replacement function, IPC channel, preload method, renderer call, and visible content input. No equally explicit replacement was defined for later Architect-authored outputs. The Implementer therefore stopped at handoff generation and file review.

The migration failure has the same cause: findings were displayed, but the exact transition from a finding to a blocked migration item was not specified.

## Approved Repair Design

### 1. Keep workflow-owned services

Do not recreate a universal registry, creation contract, target token, context key, or generic document-authority service.

Each owning workflow service receives substantive content only, derives all authority from current repository evidence, and writes through the canonical Markdown writer.

### 2. Add one shared atomic writer operation

In `src/main/documents/canonicalMarkdownDocumentWriter.ts`, add:

```ts
writeCanonicalMarkdownDocuments(
  inputs: WriteCanonicalMarkdownDocumentInput[],
): void
```

It must serialize all documents, call `writeArtifactTransaction()` once, parse and verify every installed document, and roll back the entire set on any failure.

`writeCanonicalMarkdownDocument(input)` becomes a one-item wrapper around this function.

This is a write primitive, not a document registry.

### 3. Add exact output-specific save operations

The required service methods are:

```ts
saveProjectPlanningOutputs(workspaceRoot, {
  projectProfileMarkdown,
  projectRoadmapMarkdown,
})

savePhaseMapOutput(workspaceRoot, markdownBody)

savePhaseInterviewOutput(workspaceRoot, markdownBody)

savePhasePlanningOutputs(workspaceRoot, {
  phasePlanningMarkdown,
  workCardPlanMarkdown,
})

saveFormalWorkCardOutput(workspaceRoot, markdownBody)

saveRepairWorkCardOutput(workspaceRoot, markdownBody)
```

Each operation:

- rejects empty content and `CHAMPCITY-METADATA` delimiters;
- resolves the exact current Approved handoff;
- derives target path, identity, source revisions, role, workflow data, and disposition;
- creates revision 1 Pending when absent;
- increments substantive revision and resets Pending when present;
- returns the exact saved path or paths and refreshed current-workspace model;
- never accepts a path, document type, identity, revision, source, role, or disposition from the renderer.

### 4. Use bounded domain blocks for structured content

Phase Map Markdown must contain exactly one fenced block:

````markdown
```champcity-phase-map
[
  {
    "phaseId": "phase-01",
    "title": "Phase 01",
    "order": 1,
    "purpose": "...",
    "dependsOn": [],
    "sourceReferences": []
  }
]
```
````

Work Card Plan Markdown must contain exactly one fenced block:

````markdown
```champcity-work-card-plan
[
  {
    "candidateId": "WC01",
    "order": 1,
    "title": "...",
    "purpose": "...",
    "dependsOn": [],
    "resolutionStatus": "planned",
    "resolutionReason": "",
    "evidencePaths": []
  }
]
```
````

The owning service parses the JSON inside the block, validates it with the existing domain validator, stores the validated values in metadata `workflowData`, and preserves the complete Markdown body unchanged.

These blocks contain substantive domain data, not canonical metadata or workflow disposition authority.

### 5. Add exact IPC, preload, and renderer operations

Use workflow-specific IPC and preload methods. Do not add target IDs or a universal submission contract.

The renderer provides visible output fields for the active Architect-authored workspace:

- two fields for Project Planning;
- one field for Phase Map;
- one field for Phase Interview;
- two fields for Phase Planning;
- one field for Formal Work Card;
- one field for Repair Work Card.

After save, the renderer clears the fields, refreshes documents and current-workspace evidence, selects the output, and displays disposition controls.

### 6. Make migration conflict classification deterministic

A pair is `ready` only when all required legacy authority agrees.

Compare normalized full values for:

- artifact revision;
- disposition;
- source path and revision tuples;
- canonical artifact type and identity.

Any mismatch or missing required legacy authority produces `status: "blocked"`.

Duplicate identity key:

```ts
JSON.stringify({
  artifactType: metadata.artifactType,
  identity: metadata.identity,
})
```

Do not include target path.

### 7. Remove legacy recovery outside migration

Delete the Architect Interview legacy-envelope repair function, IPC, preload method, renderer control, shared contract field, and unused Markdown/JSON helper functions.

### 8. Validate the running application, not test quantity

Automated checks are supporting diagnostics only. Do not expand or restore a test suite as the objective of REPAIR06.

Acceptance requires a controlled running-application walkthrough through the newly added output paths and visible progression to the next workspace.

## Conclusion

REPAIR06 is required because REPAIR05 deleted the prohibited generic architecture but left the application without a complete replacement for Architect-authored content after the first Interview step.

The correction is not another generic service. It is six explicit workflow-owned save operations, one atomic multi-document writer primitive, deterministic migration blocking, complete identity derivation, removal of legacy recovery code, and actual running-application proof.
