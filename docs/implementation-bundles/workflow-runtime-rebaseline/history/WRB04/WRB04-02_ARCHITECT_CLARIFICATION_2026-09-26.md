# WRB04-02 Architect Clarification — 2026-09-26

**Observed checkpoint:** `ae6eb789f829e2c7320827eb24767709cc458bcd`
**Disposition:** IMPLEMENTER STOP ACCEPTED / WRB04-02 REVISED AND SPLIT

## Evidence

WRB04-01 established an exact Workflow execution projection and lazy source boundary. The original WRB04-02 asked the existing Codex/App Server runtime to adopt exact Workflow/WorkItem identity without specifying a concrete runtime adapter.

The existing runtime resolves legacy Development Work Cards, routed WorkIntake plans, Issue Fix Cards, or Integration Repair. It lacks an exact Current Project → Workflow → canonical WorkItem → Workflow checkout → ImplementationRecord → structured checkpoint path. Reusing a legacy selector would restore the authority model WRB04 is replacing.

The Implementer correctly stopped before changing files. This is an Architect miss, not an Implementer defect.

## Correction

The original broad card was revised into a sequential four-card implementation boundary:

1. WRB04-02: exact execution-contract projection and typed attempt lifecycle;
2. WRB04-02B: atomic typed same-Workflow decomposition;
3. WRB04-02C: source-neutral exact Codex selector/context/report/finalization;
4. WRB04-02D: source-backed exact checkout and structured checkpoint.

Each card has its own observable acceptance and focused validation. The WRB04 README orders them before WRB04-03. Preserve the architecture rules in those cards: exact canonical IDs, no legacy identity resolution in the new path, no automatic promotion of implementation-local proof, no Implementer-owned Git state transitions, and no source fabrication for source-neutral work.

No Operator decision or extra approval is inferred from this clarification. The user's explicit instruction to revise the card authorizes this bounded documentation change.
