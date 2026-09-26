# WRB04-02D — Exact Workflow Checkout and Structured Implementation Checkpoint

**Depends on:** completed WRB04-02C

## Objective

Extend the exact `workflow-work-item` runtime to source-backed WorkItems using the registered Workflow checkout and existing structured checkpoint machinery.

## Architecture and constraints

Before execution, call the WRB04-01 lazy source preparation boundary and resolve the exact RepositoryCheckout from the exact SourceBinding. Verify checkout identity, branch/source line, and HEAD revision against `currentRevisionId`. Use that checkout as Codex working directory; keep the Current Project container as the SPS/evidence root.

Attribute only App Server file-change events rooted inside the exact checkout. On successful validated report, finish the typed attempt, create an exact Workflow/WorkItem SourceCheckpoint using application-owned Git mechanics, advance SourceBinding to the exact resulting revision, and preserve ImplementationRecord ↔ SourceCheckpoint evidence. If attribution/checkpoint outcome is uncertain, retain report/attempt evidence and return blocked or inspection-required state. The Implementer must not issue Git mutations itself.

Do not route exact mode through legacy WorkItem checkpoint capture, routed-development, Issue Fix Card, or Markdown state.

## Acceptance

1. Source-backed execution materializes at most once and starts in the registered exact Workflow checkout at the exact bound revision.
2. Project container and execution root remain distinct; unrelated checkout paths are rejected.
3. Exact attributable changes produce a structured SourceCheckpoint and exact SourceBinding revision advance.
4. Attribution failure, checkpoint failure, or uncertain outcomes cannot present a clean implementation checkpoint.
5. ImplementationRecord and checkpoint are linked to the exact WorkItem and Workflow; same-title WorkItems do not collide.
6. Non-source behavior from WRB04-02C remains not-required and creates no Git evidence.

## Validation and report

Run build, focused exact Codex context/finalization tests, structured checkpoint/source materialization regressions, exact changed-path validation-plan preview, work-item profile, and `git diff --check`. Use fake App Server and synthetic checkouts. Report implementation-local proof separately from permanent Tester proof. Write the card-specific report and commit before proceeding to WRB04-03.
