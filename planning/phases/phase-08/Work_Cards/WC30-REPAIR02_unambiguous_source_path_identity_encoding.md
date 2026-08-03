<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC30-REPAIR02",
    "repairId": "WC30-REPAIR02",
    "parentWorkCardId": "WC30-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30-REPAIR01_submission_identity_cleanup_and_report_integrity.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC30-REPAIR01_submission_identity_and_cleanup_outcome_integrity.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Unambiguous Source Path Identity Encoding",
    "status": "approved_for_implementation",
    "parentWorkCardId": "WC30-REPAIR01",
    "rootWorkCardId": "WC30",
    "executionMode": "one minimal identity-encoding correction",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30-REPAIR02_unambiguous_source_path_identity_encoding.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Correct only the remaining non-injective source-path encoding defect. Preserve the accepted cleanup-outcome implementation and the foundation-only boundary.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC30-REPAIR02 — Unambiguous Source Path Identity Encoding

Status: Approved for Implementer execution  
Parent: `WC30-REPAIR01`  
Production adoption: prohibited  
Git mutation: prohibited

## Objective

Correct the remaining source-path identity collision in the WC30 draft-ingestion foundation.

The current encoder preserves literal lowercase letters and digits while encoding other characters as `x<hex-codepoint>`. That representation is not injective because literal text can equal escaped text:

```text
-   -> x2d
x2d -> x2d
```

Distinct source paths can therefore still resolve to the same submission identity and draft directory.

## Required Correction

Replace the current mixed literal/escape representation with a deterministic encoding that is provably injective for every permitted normalized repository-relative source path.

Use a representation equivalent to:

```text
normalize repository-relative path
-> split into original path segments
-> encode every UTF-8 byte of every segment as exactly two lowercase hexadecimal characters
-> prefix each encoded segment with its original UTF-8 byte length
-> join segments with an unambiguous fixed separator
```

Equivalent implementations are acceptable only when distinct permitted normalized paths cannot produce the same encoded identity.

Requirements:

- encode all characters, including literal `x` and hexadecimal-looking text; do not mix unescaped literal characters with escape sequences;
- preserve segment boundaries explicitly;
- preserve deterministic output for identical inputs;
- preserve source revision as part of the submission identity;
- continue rejecting absolute, traversal, empty-segment, malformed, and unsupported paths before filesystem mutation;
- preserve the existing submission-ID and complete-draft-path bounds;
- fail before draft or final-output mutation when the encoded identity exceeds those bounds;
- do not use hashes, digests, checksums, random values, timestamps, counters, secrets, tokens, sidecars, marker files, or persistent identity stores.

## Required Adversarial Tests

Add focused tests proving distinct identities and draft directories for at least:

```text
planning/-/handoff.md
planning/x2d/handoff.md
```

```text
planning/x/handoff.md
planning/x78/handoff.md
```

```text
planning/a-b/c.md
planning/a/b-c.md
```

Also preserve tests proving:

- identical input produces identical identity;
- a new source revision produces a different identity;
- near-bound input succeeds;
- over-bound input fails before mutation;
- absolute and traversal paths fail before mutation.

## Preserve Accepted WC30-REPAIR01 Work

Do not modify the accepted cleanup-outcome correction:

- successful canonical promotion remains `promoted` even when temporary cleanup fails;
- cleanup failure remains separately visible;
- bounded cleanup retry remains available;
- unrelated files remain untouched;
- canonical write failure still rolls back final output or bundle and retains drafts.

Do not reopen idempotency, registry architecture, canonical writing, cleanup semantics, planning discovery, or current workflow behavior unless a focused test directly exposes a regression caused by the encoding change.

## Authorized Surface

Expected changes are limited to:

```text
src/main/architectOutputs/architectDraftPaths.ts
test/architect-outputs/architect-draft-ingestion.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30-REPAIR02_unambiguous_source_path_identity_encoding.md
```

A narrow type-only change is allowed only when mechanically required by the encoding correction.

## Prohibited Scope

Do not:

- adopt any production Architect-output flow;
- implement or authorize WC31;
- modify renderer, preload, IPC, action rails, prompts, or current workflow resolution;
- add migration, fallback, compatibility, dual-write, schema-quality, or report-governance behavior;
- modify ChampCity_GPT;
- add dependencies;
- perform Git operations.

## Required Proof

Record each item as `Proven` or `NotProven`.

1. The literal escape-looking path cases above produce distinct submission identities and directories.
2. The encoder is injective for all permitted normalized path bytes by construction.
3. Segment boundaries remain unambiguous.
4. Identical inputs remain deterministic.
5. Source revision remains part of identity.
6. Existing bounds and pre-mutation failures remain enforced.
7. No hash, digest, checksum, random value, timestamp, counter, token, sidecar, marker, or persistent identity store is introduced.
8. Accepted WC30-REPAIR01 cleanup behavior remains passing.
9. No production Architect-output flow uses the subsystem.
10. Typecheck, build, and complete tests pass in the normal Windows lane.

## Completion

Create the Implementer Report only after proof items 1–10 pass.

Do not package, promote, restart, reconnect, stage, commit, push, reset, clean, stash, merge, tag, or publish in this repair.
