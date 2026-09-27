# WRB04 Runtime Convergence Recovery — 2026-09-27

**Authority:** This document is the controlling WRB04 execution instruction after WRB04-03D.<br>
**Current accepted implementation boundary:** WRB04-01 through WRB04-03D.<br>
**Next and only active card:** `WRB04-03R_runtime_convergence.md`.

## Why this recovery exists

WRB04 implementation was repeatedly decomposed and revised while architectural gaps were discovered. Luna correctly stopped at those contradictions instead of preserving obsolete authority.

The implemented code is useful and is NOT to be discarded. The problem is that the split sequence left several seams between individually correct child cards.

This recovery freezes the accepted work, identifies exactly what must converge, and removes all ambiguity about what comes next.

## Precedence

For WRB04 continuation:

1. this recovery document;
2. `WRB04-03R_runtime_convergence.md`;
3. the WRB04 Architect baseline where it does not conflict with this recovery;
4. completed-card reports as implementation evidence.

The unimplemented WRB04-03E draft is superseded and must not be implemented.

Do not open or implement:
- WRB04-03E;
- WRB04-03F;
- WRB04-04;
- WRB04-05;

until WRB04-03R is complete, committed, and reviewed by the Architect.

## Freeze: preserve these implemented boundaries

Do not rewrite these systems from scratch.

Accepted implementation already exists for:

- WRB04-01 exact Workflow execution projection and lazy source preparation;
- WRB04-02 exact WorkItem execution contract and typed attempt lifecycle;
- WRB04-02B typed `decomposed_into` WorkItem decomposition;
- WRB04-02C source-neutral exact Implementer execution;
- WRB04-02D source-backed exact Workflow checkout execution and implementation checkpoint;
- WRB04-03A bounded Test Lifecycle Determination;
- WRB04-03B typed TesterResult persistence;
- WRB04-03C application-owned Tester source checkpoint;
- WRB04-03D distinct restricted Tester runtime.

WRB04-03R is a convergence repair around those implementations, not a replacement architecture.

## Exact seams to repair

### 1. Exact Implementer context still carries legacy Work Card shape

The `workflow-work-item` path correctly bypasses legacy authority, but its context is currently packed into `WorkCardExecutionContext` using placeholder legacy fields such as empty Work Card/report paths and legacy Work Card labels.

This is compatibility scaffolding, not the target contract.

WRB04-03R must introduce a proper discriminated exact Workflow/WorkItem execution context while leaving legacy selectors operational for their remaining callers until WRB04-05.

### 2. Execution sessions are keyed too broadly

The exact Implementer and Tester runtimes currently key sessions primarily by Current Project root.

That accidentally serializes independent Workflow instances even when they have separate managed checkouts.

The target concurrency rule is:

- source-backed mutation: one writer per exact Workflow checkout;
- different Workflow checkouts may execute concurrently;
- source-neutral WorkItems use isolated runtime worker directories and may execute independently;
- Implementer and Tester may never mutate the same Workflow checkout concurrently.

A shared application-owned execution lease must enforce this across roles.

### 3. Source-neutral lifecycle stops before Tester

Source-neutral Implementer execution is supported and correctly transitions the WorkItem to `validation_pending`.

The current Tester contract/runtime requires a source revision and ready SourceBinding, so the same WorkItem cannot continue through the shared lifecycle.

This is invalid.

Source-neutral WorkItems must produce a canonical TesterResult without fabricated Git/source revision identity.

### 4. Tester writable scope is narrower than the adopted Tester architecture

Current 03D permits only `test/**.test|spec.*` files and excludes fixtures/support and ValidationCatalog metadata.

The bounded permanent-proof package must support:

- permanent test files under `test/`;
- test fixtures/support under `test/`;
- `validation/capability-map.json` when durable proof ownership changes.

Do not grant general production source access.

Additional runner/tool source changes are NOT required in this recovery card. If the Tester concludes such a change is required, return a bounded lifecycle-review/blocked result for later maintenance rather than expanding its write authority.

### 5. New exact lifecycle has one post-Implementer state

The exact shared runtime sequence is:

```text
planned/ready
→ in_progress
→ validation_pending
→ Tester
→ Validator
→ Repair or complete
```

Current exact TesterResult/runtime must require `validation_pending`.

The retained `implemented` compatibility path is not part of the new Current Project execution lifecycle and should not remain an alternate exact-runtime state.

### 6. Local .champcity runtime state pollutes the source repository

The local Current Project runtime creates `.champcity/` state, including managed repository objects.

ChampCity_AI's own source repository does not currently ignore that runtime directory, causing status output to be dominated by application-owned local state.

Add `.champcity/` to the repository root `.gitignore`.

Do not delete, reset, clean, or commit the existing runtime tree.

## Explicit non-goals

WRB04-03R does NOT implement:

- Validator;
- canonical Repair creation/re-entry;
- WorkItem completion;
- Phase/Workflow completion;
- integration;
- shared execution UI;
- legacy module deletion.

Those remain after convergence.

## After WRB04-03R

STOP.

Do not infer the old 03E card is next.

The Architect will review the converged runtime once, then issue a fresh continuation for Validator → Repair/completion → integration → UI qualification based on the actual code state.
