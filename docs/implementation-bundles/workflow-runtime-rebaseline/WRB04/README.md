# WRB04 — Shared Execution Kernel and Workspaces

**Starting checkpoint:** `495c9aca43bd6c90be4abfece01ed9e40fd4c82e`
**Implementer:** GPT 6.0 Luna Medium
**Status:** IN PROGRESS — WRB04-01 complete; WRB04-02 family split into bounded sequential cards.
**Review cadence:** execute released cards sequentially; Architect review after WRB04-05.

## Outcome

Feature/Capability and Issue Resolution leave their bespoke WRB03 planning front halves at the same canonical Work Item Map and execute through one shared post-plan runtime.

WRB04 includes exact Workflow/WorkItem execution ownership, lazy source materialization, Work Item execution-contract planning/decomposition, shared Implementer execution and checkpoints, Tester/Validator/Repair, Phase/Workflow completion, exact-Workflow integration, linked-worktree repair, reusable execution Workspaces, and retirement/fencing of legacy Current Project route-owned/private Issue execution paths.

## Sequence

1. WRB04-01 — Establish exact-Workflow shared execution application kernel and lazy source boundary
   **Complete:** `ae6eb789f829e2c7320827eb24767709cc458bcd`
2. WRB04-02 — Canonical WorkItem execution contract and typed attempt state
3. WRB04-02B — Typed same-Workflow WorkItem decomposition
4. WRB04-02C — Exact source-neutral Codex WorkItem runtime
5. WRB04-02D — Exact Workflow checkout and structured implementation checkpoint
6. WRB04-03 — Implement Tester/Determination, Validator, Repair loop, and typed completion
7. WRB04-04 — Normalize Phase/Workflow completion and exact-Workflow integration, including linked-worktree candidate repair
8. WRB04-05 — Converge shared execution Workspaces, fence legacy execution, and qualify Feature/Issue end-to-end

WRB04-02 through WRB04-02D are sequential. Do not load a later card before the prior card is completed and committed. WRB04-03 is blocked until WRB04-02D completes.

## WRB04-02 rebaseline

The first WRB04-02 specification asked the Implementer to adapt the existing Codex runtime without specifying an exact selector/context/finalization path. The Implementer correctly stopped at the legacy identity boundary. The revised architecture was then split into four bounded cards: canonical contract/attempt state, typed decomposition, source-neutral exact runtime, and source-backed checkpointing. See `WRB04-02_ARCHITECT_CLARIFICATION_2026-09-26.md` for the evidence and correction.

## Execution rules

- Execute cards sequentially; checkpoint each completed card with focused validation and its Implementer Report.
- No intermediate Architect review unless an architectural contradiction cannot be bounded within the owning card.
- Do not preserve obsolete WorkIntake/Markdown execution authority for compatibility.
- Do not wrap the new exact path in `routed-development` or legacy Issue selectors.
- Do not weaken exact current Workflow ownership to satisfy stale repair fixtures.
- Do not turn Tester into an Operator approval gate.
- Use focused tests and exact validation-plan previews under the lean-test policy.

After WRB04-05: STOP for human Architect review. Do not begin WRB05.
