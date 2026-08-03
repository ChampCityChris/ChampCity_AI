<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC30-REPAIR01",
    "repairId": "WC30-REPAIR01",
    "parentWorkCardId": "WC30"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30_reusable_architect_draft_ingestion_and_canonical_promotion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC30_reusable_architect_draft_ingestion_foundation.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Submission Identity and Cleanup Outcome Integrity",
    "status": "approved_for_implementation",
    "parentWorkCardId": "WC30",
    "executionMode": "one bounded foundation repair pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30-REPAIR01_submission_identity_and_cleanup_outcome.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair only deterministic submission-identity collisions and cleanup outcome handling after successful canonical promotion. The prior Implementer Report format is not a defect and is outside scope.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# WC30-REPAIR01 — Submission Identity and Cleanup Outcome Integrity

Status: Approved for Implementer execution  
Parent: `WC30`  
Production adoption: prohibited  
Git mutation: prohibited

## Operator Direction

Correct only two defects in the WC30 shared foundation:

1. different source handoff paths can collapse to the same temporary draft submission identity because the path is flattened through lossy slugification;
2. temporary-draft cleanup failure can incorrectly return `promotion-failed` after the final canonical output or bundle was already written and verified successfully.

The format of the original WC30 Implementer Report is not a product or development defect because ChampCity A/I is not being used to govern its own development process. Do not revise, replace, canonicalize, or otherwise repair that report under this card.

Do not expand this repair into reconstructed-submission idempotency, additional submission-authority validation, workflow adoption, migration, compatibility behavior, or report-governance work.

## Objective

Preserve the accepted WC30 foundation while making temporary draft identity collision-free and ensuring the promotion result accurately distinguishes final-output success from temporary-draft cleanup failure.

Required outcomes:

```text
different source handoff paths
→ different deterministic submission directories

canonical write or verification failure
→ promotion-failed
→ no partial final output
→ drafts retained

canonical write and verification success
→ promoted
→ cleanup attempted separately
→ cleanup success or cleanup warning reported truthfully
```

## Required Change 1 — Collision-Free Deterministic Submission Identity

The current submission ID converts the complete source handoff path into one normalized slug. Distinct paths can collapse to the same value.

Example collision family:

```text
planning/a-b/c.md
planning/a/b-c.md
```

Replace the lossy path component with a deterministic, structurally unambiguous, path-safe representation.

Acceptable implementation approaches include:

- encoding each original path segment independently with explicit boundaries;
- a reversible escaped representation;
- another deterministic representation that proves distinct normalized repository-relative paths cannot collapse to one submission identity.

Requirements:

- different normalized source handoff paths must produce different submission IDs and different draft directories;
- the same output definition, owning workspace, submission key, source path, and source revision must produce the same submission ID;
- the source revision must remain part of the identity so a later handoff revision receives a different submission directory;
- do not use SHA, another hash, digest, checksum, random value, timestamp, counter, secret, approval token, route token, or hidden authorization value;
- do not silently truncate the source path or generated submission ID;
- use repository-path normalization before identity construction;
- reject absolute, escaping, malformed, or otherwise unsupported source handoff paths before constructing draft paths;
- define and enforce explicit supported bounds for the generated submission ID and complete draft path;
- a bound failure must occur before reading, creating, deleting, or promoting any draft;
- the implementation must remain generic and must not contain ChampCity A/I artifact-type or action-rail knowledge.

Required tests:

1. `planning/a-b/c.md` and `planning/a/b-c.md` produce distinct submission IDs and directories.
2. Two identical contexts produce the same submission ID.
3. The same source path at revision 2 produces a different identity from revision 1.
4. A near-bound valid source path succeeds.
5. An over-bound path fails before any draft directory or final output is created.
6. Absolute and traversal source paths fail before filesystem mutation.

## Required Change 2 — Promotion and Cleanup Outcome Integrity

The final canonical write and verification are the promotion transaction. Temporary draft cleanup happens afterward and must not retroactively convert a successful promotion into a failed one.

Required sequence:

```text
inspect complete expected draft set
→ validate bodies
→ build application-owned canonical documents
→ atomically write final output or bundle
→ verify final canonical documents
→ promotion is successful
→ attempt bounded cleanup of expected temporary drafts
```

### Canonical write or verification failure

Required result:

```text
status=promotion-failed
finalRelativePaths=[]
drafts retained
```

The existing canonical writer rollback behavior must remain controlling. A multi-document failure must leave no partial final bundle.

### Canonical promotion succeeds and cleanup succeeds

Required result:

```text
status=promoted
cleanupStatus=completed
finalRelativePaths=<installed canonical outputs>
selection=<definition-derived selection>
```

### Canonical promotion succeeds and cleanup fails

Required result:

```text
status=promoted
cleanupStatus=failed
cleanupError=<bounded exact cleanup error>
finalRelativePaths=<installed canonical outputs>
selection=<definition-derived selection>
```

Equivalent typed names are acceptable.

Requirements:

- never return `promotion-failed` after the final canonical output or bundle was installed and verified successfully;
- do not roll back valid final outputs solely because temporary draft cleanup failed;
- preserve undeleted expected drafts so cleanup can be retried;
- expose cleanup failure separately from promotion failure;
- provide one bounded exact-submission cleanup retry using the existing cleanup-confinement rules;
- cleanup retry may target only the expected draft files declared by that submission;
- cleanup retry must be safe when some or all expected draft files are already absent;
- unrelated files in the submission directory must remain untouched;
- do not delete the submission directory when unrelated files remain;
- do not add a background cleanup worker, broad draft-root scan, migration, periodic deletion service, or startup cleanup process;
- do not change final document revision, disposition, metadata, or workflow behavior because cleanup failed.

Add a deterministic cleanup-failure test hook and prove:

1. the final single output remains installed and readable after cleanup failure;
2. the result is `promoted`, not `promotion-failed`;
3. final paths and post-promotion selection are returned;
4. cleanup failure is visible in the typed result;
5. remaining expected drafts can be removed through the bounded cleanup retry;
6. cleanup retry is idempotent when expected files are already absent;
7. unrelated files remain untouched;
8. the same behavior holds for a two-document atomic bundle.

## Preserve Accepted WC30 Behavior

Preserve:

- the typed Architect-output definition registry;
- one central temporary draft root;
- central exclusion of that draft root from planning discovery;
- exact expected-slot draft inspection;
- application-owned structural validation;
- application-owned canonical metadata construction;
- single-output and atomic-bundle writes through the existing canonical writer;
- atomic rollback for final-output failures;
- successful cleanup only after final verification;
- superseded-submission rejection;
- the existing WC30 idempotency behavior without broadening it in this repair;
- test-only fixture definitions only;
- no production output definition;
- no renderer, preload, IPC, action-bar, polling, or workflow adoption;
- no MCP schema authority;
- no JSON sidecars;
- no fallback, compatibility, or dual-write behavior.

## Explicit Non-Scope

Do not change or adopt:

```text
Project Architect Interview
Project Profile
Project Roadmap
Phase Map
Phase Interview
Phase Planning
Work Card Plan
Formal Work Card
Repair Work Card
```

Do not authorize or implement WC31.

Do not add:

- a production Architect-output definition;
- reconstructed-submission repository discovery;
- a new idempotency authority record;
- marker files or sidecars;
- stronger workflow eligibility or review-state gates;
- additional submission/definition authority checks beyond what is strictly necessary to repair the path collision;
- legacy-file migration;
- current-file migration;
- dual writes;
- compatibility readers;
- final canonical MCP writes;
- hashes, digests, checksums, hidden tokens, or generated authorization values;
- a background cleanup service;
- a database or persistent run store;
- application content-quality scoring;
- report-format enforcement;
- dependencies;
- Git operations.

## Authorized Production Surface

Expected changes are limited to:

```text
src/shared/architectOutputs/architectOutputContracts.ts
src/main/architectOutputs/architectDraftPaths.ts
src/main/architectOutputs/architectDraftSubmissionService.ts
src/main/architectOutputs/architectDraftPromotionService.ts
test/architect-outputs/architect-draft-ingestion.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30-REPAIR01_submission_identity_and_cleanup_outcome.md
```

`src/main/architectOutputs/architectOutputRegistry.ts` may change only if a narrow type adjustment is mechanically required by the cleanup-result contract.

`src/main/documents/planningDocumentService.ts` and the canonical writer must not change unless a focused repair test proves an existing accepted WC30 dependency is defective. Any such change must be explained in the Implementer Report.

Do not modify current production handoff services, renderer code, preload, main IPC, current-workflow resolution, or action-rail code.

## Required Proof

Record each item as `Proven` or `NotProven`.

1. Formerly colliding source handoff paths produce distinct deterministic submission IDs.
2. Identical submission contexts remain deterministic.
3. A new source handoff revision produces a distinct submission identity.
4. Submission IDs and complete draft paths have explicit supported bounds and fail before mutation when exceeded.
5. Absolute and escaping source handoff paths fail before mutation.
6. No hash, digest, checksum, random value, timestamp, counter, secret, or hidden token is used for submission identity.
7. Canonical write failure returns `promotion-failed`, creates no partial final output or bundle, and retains drafts.
8. Cleanup failure after successful canonical verification returns `promoted`, preserves final outputs, returns final paths and selection, and exposes cleanup failure separately.
9. Bounded cleanup retry removes only expected draft files.
10. Cleanup retry is safe when expected files are already absent.
11. Unrelated files remain untouched during initial cleanup and cleanup retry.
12. Single-output and two-document bundle fixture paths both satisfy the corrected cleanup behavior.
13. Existing WC30 idempotency and superseded-submission tests remain passing.
14. Drafts remain excluded from planning discovery.
15. No current production Architect-output flow uses the subsystem.
16. No migration, fallback, compatibility, dual-write, report-governance, or production adoption behavior was added.
17. Typecheck, build, and complete tests pass in the normal Windows lane.

## Implementer Report

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30-REPAIR01_submission_identity_and_cleanup_outcome.md
```

The report must state:

- exact files changed;
- the collision-free identity representation used;
- the explicit path bounds;
- final-output versus cleanup result semantics;
- test results for single and bundled outputs;
- confirmation that no production workflow was adopted;
- confirmation that no migration, compatibility, fallback, hash, token, or Git operation was added.

No special report schema or canonical metadata requirement is imposed by this repair.

## Completion

Create the Implementer Report only after proof items 1–17 pass.

Do not package, promote, restart, reconnect, stage, commit, push, reset, clean, stash, merge, tag, or publish in this repair.
