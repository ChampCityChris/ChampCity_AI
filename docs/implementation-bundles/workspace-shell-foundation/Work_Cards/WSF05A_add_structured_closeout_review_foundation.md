# WSF05A — Add structured Closeout review-cycle foundation

**Type:** Architecture Foundation Work Card
**Bundle:** WSF — Workspace Shell Foundation Recovery
**Depends on:** WSF05 checkpoint `97717e2`
**Unblocks:** WSF06 Project Validation, WSF07 Project Close, WSF11/12 Phase Validation/Close.

## Objective

Restore the historical reviewed Closeout boundary in Structured Project State without restoring Markdown authority.

Read and follow `../WSF05A_SQL_CLOSEOUT_REVIEW_BOUNDARY_AUDIT.md`.

## Domain model

Add typed entity `CloseoutReviewCycle` with:

- exact Workflow ID;
- exact target entity ID;
- scope `project | phase`;
- closure decision `Close | DoNotClose`;
- bounded rationale;
- semantic digest;
- review layout containing exact member IDs and source entity/version references.

Use the same exact-version review-cycle principles as Architect/Planning review cycles.

No SQLite schema migration.

## Typed commands

Add typed Project State/application commands for:

1. save/revise current Closeout candidate;
2. get exact current Closeout review projection/disposition;
3. record exact Operator disposition.

Candidate creation requires current close prerequisites/evidence but does not close anything.

Review:

- `approved + Close` → verify freshness and atomically close the exact target;
- `approved + DoNotClose` → record disposition; target stays open;
- `revision_requested | rejected` → target stays open.

For Project scope, lifecycle completion closes the Project Creation Workflow only. Preserve the active owning Project behavior from RWS06I-REPAIR02.

For Phase scope, lifecycle completion closes the exact Phase.

## Application boundary

Refactor `structuredCloseAdvanceService` so Project/Phase closure cannot bypass the reviewed Closeout boundary.

- WorkItem close semantics remain unchanged.
- Project/Phase direct `close()` must not provide an alternate path around the review cycle.
- Final lifecycle mutation should occur through the exact approved Closeout review command or a private primitive called only by it.

## Projection

Create a deterministic human-readable Closeout review projection from SQL.

It must include decision/rationale, target identity/version, current evidence/criteria summary, source revisions, and effective disposition.

Expose it as a document-view model compatible with `FigmaDocumentCard` / standard Markdown export.

Generated projection is non-authoritative and rematerializable.

## Preserve

- current Project/Phase validation policies and Criteria;
- Project remains active after Project Creation Workflow closes;
- exact Workflow/Phase ownership;
- SQL authority;
- WSF03A candidate ingress;
- WSF01–WSF05 recovered shells;
- WorkItem closure behavior.

## Forbidden

- no Markdown parsing into authority;
- no Project-specific and Phase-specific duplicate candidate models;
- no mapping Closeout disposition to individual Criterion decisions;
- no closing target when candidate is created;
- no automatic Operator approval;
- no generic Decision-as-candidate hack;
- no SQLite schema migration;
- no Work Card validation redesign;
- no other workflow-family renderer work.

## Focused proof

Prove:

1. Project candidate can be created while Project Creation Workflow remains open;
2. candidate projection is SQL-derived and exportable Markdown;
3. candidate revision invalidates prior disposition;
4. stale target/evidence prevents approval;
5. Approved Close candidate atomically closes Project Creation Workflow but leaves Project active;
6. Approved DoNotClose leaves workflow open;
7. Revision Requested / Rejected leave workflow open;
8. Phase candidate uses same entity/commands;
9. Approved current Phase Close candidate closes exact Phase;
10. peer Phase/Workflow cannot be affected;
11. direct Project/Phase `structuredCloseAdvanceService.close` cannot bypass review;
12. WorkItem close path is unchanged;
13. no Closeout Markdown file is required for authority.

## Tests and validation

Extend existing Project State/close/Phase close owners when possible. Restore historical behavior characterization where useful. Run focused build/static, domain/store conformance, Project close, Phase close, structured close, projection/export, and exact affected-plan validation.

Any new permanent test requires explicit coverage-gap justification in the report.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF05A_IMPLEMENTER_REPORT.md`.

Include entity/relationship contract, command semantics, freshness proof, Project/Phase fixtures, projection/export proof, bypass rejection proof, tests reused/extended/new, and remaining Operator validation.

## Checkpoint

`WSF05A add structured closeout review foundation`

Then resume WSF06 and continue sequentially.
