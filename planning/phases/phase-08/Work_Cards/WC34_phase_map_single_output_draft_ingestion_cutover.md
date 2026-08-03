<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC34"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30_reusable_architect_draft_ingestion_and_canonical_promotion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC33_project_planning_atomic_bundle_draft_ingestion_cutover.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Map Single-Output Draft-Ingestion Cutover",
    "status": "approved_for_implementation",
    "executionMode": "one bounded production cutover",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC34_phase_map_single_output_draft_ingestion_cutover.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Cut over only Phase Map output creation to the validated WC30 temporary-draft path. Preserve current Phase Map schema, validation, metadata projection, review, and phase-selection authority.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC34 — Phase Map Single-Output Draft-Ingestion Cutover

Status: Approved for Implementer execution  
Git mutation: prohibited

## Finding

The current Phase Map application already owns:

- current Approved Project Profile and Project Roadmap resolution;
- handoff generation, freshness, contract, and exact final target;
- Phase Map title and fenced-domain-block requirements;
- phase field, uniqueness, dependency, cycle, and source-reference validation;
- projection of validated phases into canonical `workflowData.phases`;
- Pending review, approval, completion projection, and downstream phase selection.

The obsolete path is the active `artifact_toolbox.submit_handoff_outputs` instruction. The prompt also uses a substantive `Foundation` example while prohibiting hard-coded default phases, creating avoidable model anchoring.

## Objective

Replace only Phase Map output creation with one WC30 single-output temporary draft:

```text
current Approved Phase Map handoff
→ application prepares one deterministic draft submission
→ handoff supplies one exact temporary Phase Map draft path
→ ChatGPT writes one body-only draft through artifact_toolbox.create_markdown_artifact
→ application validates the body and champcity-phase-map block
→ application projects validated phases into canonical workflowData.phases
→ WC30 promotes the Pending canonical Phase Map
→ successful verification removes the consumed draft
```

## Required Changes

### 1. One production definition

Add exactly one Phase Map production `ArchitectOutputDefinition`:

```text
outputKind: phase-map
owningWorkspaceId: phase-map
bundleMode: single-output
slot: phase-map.md
```

Use the current Approved Phase Map handoff as authority for the final path and source revisions. Use the approved WC30 deterministic identity builder with a process-owned per-workspace request ordinal.

### 2. Preserve and reuse existing validation

The draft validator must require:

- `# Phase Map`;
- exactly one `champcity-phase-map` fenced block;
- an object root containing one non-empty `phases` array;
- entries containing only `phaseId`, `title`, `order`, `purpose`, `dependsOn`, and `sourceReferences`;
- unique phase IDs and order values;
- valid in-map dependencies with no self-dependency or cycles;
- normalized repository-relative source references;
- no persisted completion fields;
- no application metadata delimiters.

Do not create a second Phase Map schema or validation implementation. Extract or expose the current validator narrowly so both promotion and downstream projection use the same rules.

The canonical document must store the validated phase entries in:

```text
metadata.workflowData.phases
```

Downstream phase selection must continue reading canonical metadata rather than treating the Markdown body as authority.

### 3. Replace the active handoff persistence instruction

Replace `submit_handoff_outputs` with one exact generic call:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<exact temporary Phase Map draft path>",
    "content": "<complete body-only Phase Map Markdown>",
    "overwrite": false
  }
}
```

Retain the current input paths, source revisions, schema rules, and completion instructions.

Remove the substantive example phase. Show only a non-authoritative structural placeholder, such as:

```json
{
  "phases": [
    {
      "phaseId": "<roadmap-derived phase ID>",
      "title": "<roadmap-derived title>",
      "order": 1,
      "purpose": "<roadmap-derived purpose>",
      "dependsOn": [],
      "sourceReferences": ["<repository-relative source path>"]
    }
  ]
}
```

State explicitly that placeholder text must not appear in the submitted body and all substantive phases must be derived from the Approved Profile and Roadmap.

The handoff must contain no active `submit_handoff_outputs`, `handoffKind` write selector, caller-supplied final path, caller-supplied metadata, fallback, alias, manual import, or file-copy route.

### 4. Creation, revision, and retry

When no Phase Map exists, promote as revision 1 with `artifactType=phase-map`, `participationRole=gatingReview`, current project identity and source revisions, validated `workflowData.phases`, and Pending disposition.

Allow same-path substantive revision only when the current Phase Map is readable, fresh, identity-matching, and `RevisionRequested`. Increment the revision once, replace the body and `workflowData.phases`, refresh source revisions, and reset disposition to Pending with cleared notes and `reviewedAt`.

Block malformed, unmanaged, stale, conflicting, wrong-type, wrong-role, identity-mismatched, or otherwise ineligible existing targets. Preserve existing final bytes and retain the draft.

Polling must not create submissions. A failed promotion must retain the draft. The next explicit prepare/copy action must create one new absent draft path and leave the failed draft untouched.

## Authorized Surface

Expected changes are limited to:

```text
src/main/phaseMap/phaseMapService.ts
one adjacent Phase Map draft orchestration/definition module
src/shared/workspaceContracts.ts only for existing draft status/error fields
focused Phase Map and runtime-wiring tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC34_phase_map_single_output_draft_ingestion_cutover.md
```

Do not alter WC30 algorithms, Project Planning, Architect Interview, Phase Planning, renderer architecture, preload, IPC, MCP implementation, canonical metadata schema, or phase-completion governance.

## Required Proof

1. Exactly three production definitions exist: Architect Interview, Project Planning, and Phase Map.
2. Phase Map uses one WC30 single-output submission and one exact temporary draft path.
3. The handoff contains one executable action/workspace/params call with `overwrite:false`.
4. The substantive `Foundation` example and active `submit_handoff_outputs` route are absent.
5. The draft body and fenced JSON are validated by the existing Phase Map rules.
6. Validated phases are stored in canonical `workflowData.phases` and used by downstream projection.
7. A valid absent-target draft promotes as revision 1 and is cleaned only after verification.
8. Malformed input creates no final Phase Map and retains the draft.
9. An eligible `RevisionRequested` Phase Map revises at the same path, increments once, updates projected phases, and resets to Pending.
10. Ineligible existing targets remain byte-identical and block promotion.
11. Polling is stable; explicit retry creates a fresh path and preserves the failed draft.
12. Existing handoff freshness, disposition, closeout-derived completion, and phase-selection behavior remain unchanged.
13. Architect Interview, Project Planning, and other output flows remain unchanged.
14. Typecheck, build, and complete tests pass in the normal Windows lane.
15. Operator running-product validation remains pending.

## Operator Validation

```text
Approved Project Profile and Roadmap
→ prepare/copy Phase Map handoff
→ confirm one temporary draft path and generic MCP write
→ create a valid Phase Map draft
→ confirm automatic promotion and draft cleanup
→ confirm Pending review document
→ approve Phase Map
→ confirm first incomplete phase becomes current
```

Also validate one malformed draft and one `RevisionRequested` replacement.

## Non-Scope

Do not redesign Phase Map content, add application-owned default phases, persist completion state, change Phase Planning, migrate existing documents, add cleanup workers, add dependencies, or perform Git operations.

## Completion

Create the Implementer Report only after proof items 1–14 pass. Do not claim Operator running-product validation.
