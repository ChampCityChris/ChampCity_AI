# WRB04 — Shared Execution Kernel and Workspaces

**Starting checkpoint:** `495c9aca43bd6c90be4abfece01ed9e40fd4c82e`
**Implementer:** GPT 6.0 Luna Medium
**Status:** RECOVERY / CONVERGENCE — WRB04-01 through WRB04-03D are implemented. WRB04-03R is the sole active card.
**Review cadence:** STOP for Architect review after WRB04-03R.

## Current authoritative instruction

Read, in this order:

1. `WRB04_RECOVERY_2026-09-27.md`
2. `WRB04-03R_runtime_convergence.md`

Those documents control all WRB04 continuation.

The prior WRB04-03E draft is superseded and must not be implemented.

## Accepted implemented baseline

Preserve the completed implementation from:

1. WRB04-01 — exact Workflow execution kernel and lazy source boundary
2. WRB04-02 — canonical WorkItem execution contract and typed attempt state
3. WRB04-02B — typed `decomposed_into` WorkItem decomposition
4. WRB04-02C — exact source-neutral Implementer runtime
5. WRB04-02D — exact source-backed Workflow checkout and implementation checkpoint
6. WRB04-03A — bounded Test Lifecycle Determination
7. WRB04-03B — typed durable TesterResult
8. WRB04-03C — application-owned test-only source checkpoint
9. WRB04-03D — distinct restricted Tester runtime

WRB04-03R does not replace those features. It converges the seams between them.

## Sole active work

### WRB04-03R — Converge Exact Implementer/Tester Runtime Before Validator

This one card owns:

- exact runtime context cleanup;
- exact session keying and shared cross-role Workflow checkout lease;
- source-neutral TesterResult/runtime;
- canonical `validation_pending` Tester entry;
- bounded Tester proof scope including fixtures/support and ValidationCatalog metadata;
- Tester checkpoint path-policy convergence;
- local `.champcity/` source-repository containment.

One card. One report. One commit.

**Do not split WRB04-03R into more cards.**

## Frozen future work

These are not released while WRB04-03R is active:

- WRB04-03E — Validator
- WRB04-03F — Repair + WorkItem completion
- WRB04-04 — Phase/Workflow completion + exact Workflow integration
- WRB04-05 — shared execution UI + legacy fence + vertical qualification

After WRB04-03R is committed, STOP. The Architect will review the converged runtime and release a fresh continuation package based on the code that actually exists.

## Execution rules

- Exact Workflow/WorkItem/SPS identity is authoritative.
- Do not restore WorkIntake, route Decision, Markdown Work Card, or Issue Fix Card ownership.
- Do not create another compatibility execution mode.
- Do not invent Git state for source-neutral WorkItems.
- One source-backed Workflow checkout has one source-mutating role at a time.
- Independent Workflow checkouts may execute concurrently.
- Tester is not an Operator gate.
- Application owns Git checkpoints.
- Focused validation only; do not repeatedly run the historical work-item profile.
- The known unrelated Project Intake SSR fixture failure is not a WRB04-03R repair target.
