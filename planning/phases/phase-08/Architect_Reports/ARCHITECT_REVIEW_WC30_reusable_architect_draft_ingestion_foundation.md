<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC30"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30_reusable_architect_draft_ingestion_and_canonical_promotion.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC30 Reusable Architect Draft Ingestion Foundation",
    "reviewResult": "RepairRequired",
    "repairWorkCardId": "WC30-REPAIR01",
    "productionAdoptionAuthorized": false,
    "reviewedHead": "30cf9b0c224459d73bc0eb0d0cab5107754558fd"
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "The foundation is directionally correct and did not migrate production workflows, but deterministic submission IDs are collision-prone, cleanup failure can report promotion failure after canonical outputs were successfully installed, and the Implementer Report is not a canonical governed document.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC30 Reusable Architect Draft Ingestion Foundation

Disposition: `RepairRequired`  
Repair Work Card: `WC30-REPAIR01`  
Production pilot authorization: no  
Reviewed HEAD: `30cf9b0c224459d73bc0eb0d0cab5107754558fd`

## Review Boundary

WC30 was reviewed as a foundation-only implementation. No current Architect-output workflow was expected to adopt the new subsystem.

The Operator committed the current repository state after the Implementer Report was written. That Operator commit is not treated as an Implementer Git violation. The repository is clean at the reviewed HEAD.

## Accepted Implementation

The following work is accepted and should be preserved:

- one shared typed Architect-output definition contract exists;
- one central draft root is defined at `planning/Architect_Drafts/`;
- planning-document discovery excludes that root before classifying Markdown;
- one generic draft inspection service reads only declared draft slots;
- one generic promotion service supports a single output and an atomic bundle;
- final canonical documents are written through the existing application-owned canonical writer;
- generic body checks and definition-specific structural validation remain application-side;
- failed canonical writes retain drafts;
- successful writes verify canonical metadata and body before draft cleanup;
- no current production Architect workflow uses the subsystem;
- no migration, dual write, compatibility path, fallback, MCP schema authority, renderer integration, or production registry definition was added;
- independent typecheck, build, and the full 148-test lane pass.

Independent validation:

```text
npm run typecheck → passed
npm run build     → passed
npm test          → 148/148 passed
```

## Blocking Defect 1 — Submission IDs Use Lossy Path Slugification

`buildDeterministicArchitectDraftSubmissionId()` converts the complete source handoff path into one hyphenated segment by replacing every non-alphanumeric run with `-`.

Different repository paths can therefore produce the same submission ID. For example, paths shaped like:

```text
planning/a-b/c.md
planning/a/b-c.md
```

collapse to the same path component.

When the remaining fields and revision are the same, both submissions resolve to the same temporary draft directory. That can mix or overwrite draft identity between unrelated handoffs.

This is a correctness defect in the shared foundation, not a need for a hash or hidden token.

Required correction:

- use a deterministic collision-free representation of the source handoff path;
- do not use a hash, digest, checksum, secret, route token, approval token, or random identifier;
- preserve a bounded repository-relative path representation or another reversible encoding;
- enforce a clear maximum generated path length and fail before draft creation when the bound cannot be met;
- add tests proving formerly colliding source paths produce different submission directories.

## Blocking Defect 2 — Cleanup Failure Produces a False Promotion Failure

The promotion service performs these steps:

```text
write final canonical output(s)
→ verify final canonical output(s)
→ delete consumed drafts
```

All final canonical writes and verification complete before `cleanupArchitectDraftSubmission()` runs.

If draft cleanup throws, the outer catch returns:

```text
status=promotion-failed
finalRelativePaths=[]
```

but the final canonical outputs remain installed and valid. The result therefore says the promotion failed even though it succeeded. A caller can then retry, revise again, or present a false error while the repository has already advanced.

Required correction:

- once final canonical installation and verification succeed, the promotion result must remain `promoted`;
- a draft-cleanup failure must be reported separately as a cleanup warning or cleanup-pending condition;
- valid final canonical outputs must not be rolled back solely because temporary draft deletion failed;
- the exact draft files must remain available for a later bounded cleanup retry;
- add a deterministic cleanup-failure test proving the result reports promoted output paths, preserves final files, and exposes cleanup failure accurately.

## Blocking Defect 3 — The Implementer Report Is Not Canonical Workflow Evidence

The submitted file:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC30_reusable_architect_draft_ingestion_foundation.md
```

begins directly with a Markdown heading and has no `CHAMPCITY-METADATA` block.

The application therefore classifies it as unmanaged historical Markdown rather than an `implementer-report`. WC30 cannot be reviewed or tracked correctly through the canonical planning-document system using that report.

Required correction:

- replace the report at the same path with one canonical Implementer Report;
- use `artifactType=implementer-report`;
- associate it with `phase-08` and `WC30-REPAIR01` while clearly identifying WC30 as the repaired implementation;
- report the corrected validation evidence without claiming a new production adoption;
- state that the Operator, not the Implementer, created the current Git commit after the original report was written.

## Additional Review Observation — Idempotency Proof Is Session-Object Dependent

The current idempotency test calls promotion a second time using the returned in-memory submission object whose state is already `promoted` and whose promotion record contains final paths.

That proves session-object idempotency. It does not prove repository-derived recovery after the submission object is reconstructed or the application restarts.

WC30-REPAIR01 must add an explicit test and contract decision:

- either prove that a reconstructed current submission can identify its already-promoted final output from application-owned canonical evidence without rewriting;
- or narrow and document the foundation contract as session-scoped and require every production adoption card to resolve completed output from the existing workflow documents before invoking promotion.

Do not add hidden persisted state, hashes, marker files, or a second authority record merely to satisfy this item.

## Git and Scope Finding

The current commit contains the WC30 implementation together with prior Phase 08 work. The Operator stated that they created this commit because the review was taking too long. This review does not reinterpret that Operator action as Implementer misconduct.

No Git operation was performed by this review.

## Disposition

WC30 is not approved for production pilot adoption yet.

Correct the three blocking defects through `WC30-REPAIR01`. Preserve the accepted foundation and keep all current Architect workflows unchanged. WC31 remains planned and unauthorized until the repair is approved.
