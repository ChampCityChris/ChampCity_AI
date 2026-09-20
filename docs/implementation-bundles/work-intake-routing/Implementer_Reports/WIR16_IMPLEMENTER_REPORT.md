# WIR16 Implementer Report

## Baseline and scope

Work Card **WIR16 — Establish Generic Direct / Phased Plan Execution** passes focused automated acceptance. Checkpoint hash is pending the single harness commit containing this report and will be reported after verification.

- Verified approved repository/Git root as `<PROJECT_REPO>`; branch `codex/work-intake-routing`, no upstream, `origin` configured. No remote operation.
- Starting checkpoint `88ec77dd75da2daa0fa322e257194ef49bbd304a` (WIR15), exact thirteen-file set and clean tree/index. Required WIR07 and WIR15 reports/contracts verified.
- Revisited governing sections 11–14 covering topology, shared lifecycle, decomposition and current persistence. Architecture SHA-256 remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. No contradiction or unrelated changes. No future card loaded.
- Inspected current Work Card loop, effective original/repair completion, durable close-return, Phase close/validation, shared lifecycle contracts, required suites, and capability-map entries.

## Attributable files

Created:

- `src/shared/planExecutionContracts.ts`
- `src/main/planExecution/planExecutor.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR16_IMPLEMENTER_REPORT.md`

Modified:

- `test/work-card-loop/work-card-loop-state-service.test.cjs`
- `test/phase-close/phase-validation-state.test.cjs`

Deleted: none. Intentionally not created: persistence database, canonical execution writer, renderer/main/preload cutover, Development/Issue caller migration, duplicated lifecycle implementation, or Git checkpointing behavior.

## Implementation and acceptance evidence

- Added route-independent Plan execution/query contracts. Inputs are the approved Plan structure/revision/freshness and adapter-derived Work Item, optional Phase, and Plan evidence. The executor never reads route identity. Existing strict Plan topology/combined dependency validation is reused.
- Direct execution derives ready/active/blocked/complete Work Items from dependency completion, evidence freshness, criteria proof, blockers, and single-active-item conflict detection. Array order is a tie-breaker among eligible items; a later prerequisite correctly precedes an earlier dependent.
- Phased execution additionally requires predecessor Phase acceptance before advancing child Work Items. Phase completion requires its child items, declared acceptance criteria, prerequisite Phases, and current unblocked evidence. Missing Phase acceptance cannot be substituted by child completion. A pending successor does not block an eligible predecessor.
- Work Item, Phase, and Plan completion are separate results. Current declared criteria require explicit passing evidence; missing/failed/duplicate/unknown criteria, stale revisions, non-approved/stale Plans, unresolved blockers, and conflicting identities fail closed. Validation alone does not imply durable Work Item close; the adapter must supply the completion stage after its existing close boundary.
- The generic executor dispatches only eligible implementation/review/validation/repair/close actions supplied by an adapter. It re-queries current evidence and checks the exact presented fingerprint before invoking a hook, serializes actions per executor instance, and rejects missing adapters. Concrete artifact/repair mechanics remain with WIR17/WIR18.
- Decomposed Plans use the same eligibility function. Retired identities in current execution evidence are rejected; replacement candidates resume by prerequisites without a new Intake or route. Adapters are responsible for binding evidence to the current Plan revision and mapping their established lifecycle evidence to these contracts.
- Existing production completion/repair/Phase suites remain unchanged and passing. New focused proof exercises direct hook dispatch, stale tokens, concurrent dispatch rejection, abstract missing-hook failure, dependency release only after close, final Plan criteria, all route contexts yielding identical progression, decomposition, and separate phased acceptance/freshness/cycle boundaries.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0; rebuilt after final progression adjustment |
| `node --test --test-concurrency=1 test/work-card-loop/work-card-loop-state-service.test.cjs test/phase-close/phase-close-service.test.cjs test/phase-close/phase-validation-state.test.cjs` | Approved normal Windows | Exit 0; 25 passed, none failed/skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

No required validation failure. Normal child-process execution follows the WIR01 restricted `spawn EPERM`; no repeated restricted attempt. Full regression remains WIR23. No external integration, launch, renderer acceptance, or packaging claimed; no card-local manual validation required.

Test categories: existing Work Card loop, repair close-return, Phase Close and Phase Validation proof reused unchanged. Two new permanent cases in existing owning suites cover the previously absent direct executor/hook boundary and phased hierarchy/criteria boundary. No consolidation or retirement; capability map unchanged.

## Checkpoint and safety

Intended message: `WIR16: Establish Generic Direct / Phased Plan Execution`. Exactly the five files above are attributable. Harness owns staging/commit; shell Git is read-only. No amendment, merge, push, tag, release, or publication.

Exact staged diff inspected; `git diff --cached --check` and bounded credential/private-key/home-path scan passed. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG warnings, none attributable to this card. Final report edit re-inspected after staging. Durable references are relative; no secrets, concrete local paths, generated/dependency artifacts, archive runtime imports, or new integration introduced.

## Next action

After passing focused validation and verifying the checkpoint, read WIR17 and required dependency reports. No scope deviation or material Operator decision identified.
