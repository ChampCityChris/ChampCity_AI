<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC39-REPAIR01",
    "repairId": "WC39-REPAIR01",
    "parentWorkCardId": "WC39"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC39_unified_embedded_architect_output_catalog_and_runtime_cutover.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC39_unified_architect_output_catalog_and_main_process_runtime_consolidation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC39_unified_architect_output_catalog_and_main_process_runtime_consolidation.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Active Runtime Context Ownership Repair",
    "status": "approved_for_implementation",
    "executionMode": "one surgical WC39 repair pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC39-REPAIR01_active_runtime_context_ownership.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Remove the historical prepared-context map and bind the current typed domain context directly to the single active runtime submission record without changing any accepted WC39 behavior.",
    "reviewedAt": "2026-08-01"
  }
}
CHAMPCITY-METADATA -->

# WC39-REPAIR01 — Active Runtime Context Ownership Repair

Status: Approved for Implementer execution  
Parent: `WC39`  
Git mutation: prohibited

## Confirmed Defect

`src/main/architectOutputs/architectOutputRuntimeService.ts` currently stores runtime state in:

```text
activeSubmissionByRuntimeKey
preparedContextBySubmission
requestOrdinalByRuntimeKey
```

Each new submission adds a `preparedContextBySubmission` entry. No path removes prior entries after replacement, retry, promotion, or failure. Historical domain-context snapshots therefore remain reachable for the process lifetime.

WC39 requires one resolved domain-context snapshot for the one active submission, not a historical context store.

## Source Evidence

Controlling evidence:

```text
planning/phases/phase-08/Work_Cards/WC39_unified_embedded_architect_output_catalog_and_runtime_cutover.md
planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC39_unified_architect_output_catalog_and_main_process_runtime_consolidation.md
src/main/architectOutputs/architectOutputRuntimeService.ts
```

The accepted catalog, registry, coordinator boundary, and five adapter delegations are not defective.

## Objective

Make the active runtime record own its current typed preparation context.

```text
resolve current preparation
→ create or reuse one submission
→ store submission and prepared context in one active record
→ inspect and promote from that record
→ replacement installs one new active record
→ prior submission and context become unreachable together
```

## Runtime Sequence

### Reuse

A matching `waiting-for-drafts` or `partial-draft-set` submission returns the existing active record and preserves its submission ID, context, ordinal, and draft paths.

### Replacement or retry

When reuse is not allowed, create one new submission and replace the runtime-key entry with one new active record containing the new submission and its current preparation context. Do not retain the prior context in another collection.

### Promotion

Pass the active record's preparation context directly to `promoteArchitectDraftSubmission()`. Preserve current promotion, failure, final verification, and cleanup-result behavior.

## Required Changes

1. Add a domain-context generic to `ActiveArchitectOutputRuntimeSubmission`, or use an equivalent strongly typed active-record structure.
2. Add `preparedContext` to that active record.
3. Store `preparation.domainContext` on the record created by `prepareArchitectOutputRuntimeSubmission()`.
4. Pass `active.preparedContext` to `promoteArchitectDraftSubmission()`.
5. Delete:

```text
preparedContextBySubmission
runtimeSubmissionContextKey()
```

6. Do not add another context map, cache, lookup key, cleanup worker, or persisted runtime store.

## Preserved Behavior

Preserve exactly:

- the seven-flow catalog and five active WC39 definitions;
- the single production registry;
- one active submission and one request ordinal per repository root plus owning workspace;
- deterministic submission IDs and draft paths;
- repeated Prepare reuse for waiting and partial submissions;
- polling with no submission or ordinal side effect;
- explicit retry with one fresh ordinal and fresh absent draft path;
- failed draft retention;
- current single-output and atomic-bundle promotion behavior;
- domain context revalidation immediately before promotion;
- canonical metadata, revision, freshness, disposition, target, and downstream rules;
- cleanup failure reported as promoted plus cleanup failure;
- all existing IPC, preload, renderer, review, and current-workflow surfaces;
- Formal Work Card and Repair Work Card deferral to WC40.

## Authorized Surface

Expected production change:

```text
src/main/architectOutputs/architectOutputRuntimeService.ts
```

Focused changes are authorized only in:

```text
test/architect-interview/architect-interview-workspace.test.cjs
test/architect-outputs/architect-draft-ingestion.test.cjs
test/repository/runtime-wiring-source.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC39-REPAIR01_active_runtime_context_ownership.md
```

An additional production file requires a concrete compilation necessity explanation and must not broaden the repair.

## Acceptance Criteria

1. `preparedContextBySubmission` is absent from source and compiled production output.
2. `runtimeSubmissionContextKey` is absent from source and compiled production output.
3. The single active runtime record contains the current typed preparation context.
4. Promotion receives context from that active record without a second lookup store.
5. Repeated preparation reuses the same waiting or partial submission, ordinal, and draft paths.
6. Explicit retry replaces the active record, creates one fresh submission/path, and preserves failed drafts.
7. One real single-output flow and one real atomic-bundle flow still promote through the shared coordinator.
8. Promotion failure, ineligible-target blocking, cleanup outcome, metadata, revision, and downstream behavior remain unchanged.
9. No catalog, adapter, IPC, preload, renderer, current-workflow, Formal Work Card, or Repair Work Card behavior changes.
10. Typecheck, TypeScript build, Vite build, and the complete Node test lane pass in the approved normal Windows environment.
11. No Git operation occurs.

## Negative Constraints

Do not:

- redesign the coordinator or catalog;
- add historical context retention with deletion branches;
- add weakly typed callback bags or caller-supplied context authority;
- alter submission identity, ordinal rules, retry semantics, or draft cleanup;
- alter any domain adapter's evidence or metadata rules;
- begin WC40 product-surface work;
- add dependencies, migration, compatibility behavior, hidden state, hashes, tokens, sidecars, or background workers;
- perform Git operations.

## Return Target

Return to Architect review of parent `WC39`.

Do not advance directly to WC40. WC40 becomes eligible only after this repair passes and WC39 receives an Approved Architect disposition.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC39-REPAIR01_active_runtime_context_ownership.md
```

The report must:

- list every changed file;
- show the final active-record shape;
- confirm removal of both historical-context identifiers;
- map each acceptance criterion to source or production-path evidence;
- record the exact validation commands, execution lanes, and results;
- distinguish the known sandbox `spawn EPERM` from the approved Windows rerun;
- disclose any scope expansion or residual risk;
- state that no product-surface, WC40, dependency, fallback, migration, or Git change occurred.

## Manual Validation

No Operator running-product validation is required. This repair changes internal context ownership only and must preserve visible behavior.
