<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC30-REPAIR01",
    "repairId": "WC30-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30-REPAIR01_submission_identity_cleanup_and_report_integrity.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC30-REPAIR01 Submission Identity and Cleanup Outcome Integrity",
    "reviewResult": "RepairRequired",
    "acceptedDefects": [
      "cleanup outcome integrity"
    ],
    "remainingDefect": "source path encoding remains non-injective",
    "nextRepairWorkCardId": "WC30-REPAIR02"
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "Cleanup outcome handling is accepted. Submission identity remains collision-prone because the escape representation does not escape its own marker: a literal x2d segment and a hyphen segment both encode as x2d.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC30-REPAIR01

Disposition: `RepairRequired`  
Accepted correction: cleanup outcome integrity  
Remaining correction: collision-free source-path identity  
Next repair: `WC30-REPAIR02`  
Git mutation: none

## Review Basis

Reviewed:

- WC30-REPAIR01 revision 2;
- the submitted Implementer Report;
- all five modified production/test files;
- focused fixture coverage;
- independent normal-Windows typecheck, build, and complete tests.

Repository state during review:

```text
Repository: ChampCityChris/ChampCity_AI
Branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
HEAD: 30cf9b0c224459d73bc0eb0d0cab5107754558fd
Worktree: dirty with the bounded WC30-REPAIR01 changes and review artifacts
```

Independent validation:

```text
npm run typecheck → passed
npm run build     → passed; 1,610 modules transformed
npm test          → passed; 151/151 tests
```

Passing tests do not override the source-level identity collision described below.

## Accepted Correction — Cleanup Outcome Integrity

The repair correctly separates final canonical promotion from temporary-draft cleanup.

Accepted behavior:

```text
canonical write or verification fails
→ promotion-failed
→ no final paths
→ canonical writer rollback remains controlling
→ drafts retained

canonical write and verification succeed
→ promoted
→ final paths and selection returned
→ cleanup attempted separately
```

When cleanup fails after successful promotion, the service now returns:

```text
status=promoted
cleanupStatus=failed
cleanupError=<bounded error>
finalRelativePaths=<installed outputs>
selection=<definition-derived selection>
```

The final canonical output or atomic bundle remains installed and readable. It is not rolled back merely because temporary cleanup failed.

The exact-submission cleanup retry is also accepted:

- it removes only expected draft files;
- it is safe when expected files are already absent;
- unrelated files remain untouched;
- the submission directory remains when unrelated files are present;
- no background cleanup worker or broad draft scan was added.

Focused single-output and atomic-bundle tests exercise this behavior.

## Blocking Defect — Source-Path Encoding Is Still Collision-Prone

The new encoding preserves lowercase letters and digits unchanged and encodes every other character as:

```text
x<hex-codepoint>
```

The marker `x` is itself preserved unchanged. Therefore the encoding is not injective.

Concrete collision:

```text
source path A segment: -
encoded: x2d

source path B segment: x2d
encoded: x2d
```

Because both encoded segment values are the same and both have encoded length 3, the segment-length framing does not distinguish them.

Accordingly, otherwise identical contexts using source paths such as:

```text
planning/-/handoff.md
planning/x2d/handoff.md
```

can still produce the same submission ID and draft directory.

The existing test covers only the original slash/hyphen-boundary collision:

```text
planning/a-b/c.md
planning/a/b-c.md
```

That test passes but does not prove the encoding is collision-free.

## Required Correction Boundary

Create `WC30-REPAIR02` for only this identity-encoding defect.

Required outcome:

- the source-path representation is injective for every accepted source-path character;
- the escape mechanism cannot collide with literal source text;
- path-segment boundaries remain unambiguous;
- existing path and submission-length bounds remain enforced before mutation;
- no hashes, digests, random values, timestamps, counters, tokens, marker files, or hidden state are introduced.

At minimum add adversarial tests proving distinct identity for:

```text
planning/-/handoff.md
planning/x2d/handoff.md
```

and equivalent cases involving the chosen escape syntax.

The correction may encode every character unambiguously or escape the escape marker through a demonstrably prefix-free representation. Do not merely add one special-case replacement for `x` without proving the representation is injective across all accepted characters.

## Preserved Boundary

Do not reopen:

- cleanup result semantics;
- cleanup retry behavior;
- WC30 idempotency behavior;
- registry design;
- planning discovery exclusion;
- canonical writer behavior;
- production workflow adoption;
- renderer, preload, IPC, polling, or action-rail code;
- report format;
- migration or compatibility behavior.

WC31 remains unauthorized until the identity correction is approved.

## Disposition

WC30-REPAIR01 is not approved because proof item 1—collision-free deterministic identity—remains false.

The cleanup correction is accepted and must not be reimplemented in the next repair. WC30 remains foundation-only. No production Architect-output flow may adopt the subsystem yet.

No Git operation was performed by this review.
