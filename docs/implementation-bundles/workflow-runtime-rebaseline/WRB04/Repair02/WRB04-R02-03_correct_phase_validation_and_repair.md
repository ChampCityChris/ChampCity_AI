# WRB04-R02-03 — Correct Phase Validation, Deferred Evidence, and Phase Repair

**Parent:** WRB04 Repair02  
**Depends on:** WRB04-R02-02 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Correct the remaining Phase-boundary semantics so Phase validation cannot produce false positives and every failed Phase Criterion has a canonical path back into the shared execution loop.

Preserve exact Workflow/Phase ownership and the existing WorkItem Repair architecture.

## 1. Do not manufacture source-neutral deterministic Phase proof

Current defect:

source-neutral deterministic Phase validation records pass when all member WorkItems are completion-eligible.

That is not proof of the Phase Criterion.

Required behavior:

- if a declared application-owned source-neutral deterministic verifier exists for the exact Criterion/capability, use it;
- otherwise return/record an explicit blocked or unavailable deterministic result;
- never convert member WorkItem closure into Criterion pass.

Do not fabricate repository/source identity.

If the current product has no source-neutral deterministic verifier registry, use the conservative unavailable/blocked result and add planning/product guidance rather than inventing one in this card.

## 2. Aggregate semantic Phase evidence across the whole current Phase

Replace the current one-member shortcut.

Semantic Phase Validator input must include every current Phase member WorkItem with, where applicable:

- current WorkItem record;
- latest successful ImplementationRecord;
- exact current TesterResult;
- current WorkItem/solution Validation outcomes relevant to that member;
- current source candidate;
- Phase objective;
- exact Phase Criterion.

For Repair WorkItems added to the Phase, include them as current Phase members.

The semantic Validator must review the complete current aggregate evidence set.

Do not pass one arbitrary member ImplementationRecord as if it represented the entire Phase.

Validator remains:

- independent from all current member Implementer principals;
- independent from all current Tester principals;
- read-only;
- no Git mutation;
- network disabled unless an existing declared validation capability specifically requires otherwise.

## 3. Persist aggregate Phase validation provenance

Phase Validation freshness must be reconstructible.

For deterministic, semantic, and human Phase Validation:

- Validation evaluates the exact Criterion;
- preserve target record version;
- source-backed proof binds current source revision;
- add typed provenance to the complete current Phase member evidence set, at minimum current TesterResults (which already anchor ImplementationRecords/source candidates).

Do not encode the aggregate evidence set in summary text.

When current Phase member evidence changes, prior Phase Validation must become stale.

This is mandatory for source-neutral Phase evidence, where no source revision exists to provide freshness by itself.

## 4. Fix WorkItem-owned deferred visual consumption at Phase boundary

Current Phase projection intentionally brings a WorkItem-owned `deferred_visual_phase` Criterion into its owning Phase.

Canonical freshness/status must resolve that WorkItem to the exact owning Phase.

After valid Phase-boundary human visual Validation:

- the deferred WorkItem Criterion must become satisfied for Phase completion;
- WorkItem completion remains allowed to defer it;
- same Criterion must not be consumed by a peer Phase;
- source-backed/source-neutral freshness rules still apply.

Preserve existing final-Phase treatment for accepted-solution deferred Criteria unless code review reveals a direct contradiction.

## 5. Create one typed Phase Repair transition

A failed required Phase-boundary Criterion cannot remain a dead-end.

Add a typed command equivalent to:

`createPhaseRepair(projectId, workflowId, phaseId, failureEvidenceId)`

Accepted failure evidence:

- current failing deterministic Phase Validation;
- current failing semantic Phase Validation;
- current failing visual/deferred visual Phase Validation;
- current rejected Criterion-specific Operator Decision from R02-02.

Preflight:

- exact current Feature/Issue Workflow;
- exact current open Phase;
- exact active required Criterion consumed by that Phase;
- failure evidence current for the exact Criterion/current Phase evidence set;
- no duplicate active Repair for the same failure identity.

Success:

- create one canonical Repair/Fix WorkItem;
- WorkItem is `part_of` the same exact Phase;
- WorkItem implements the accepted BoundedSolution;
- Repair objective and Criterion derive from the exact failure evidence;
- link provenance through `derived_from`;
- do not weaken `repairs` relationship endpoint rules merely to point at a Phase.

Because the Repair is a current Phase member, normal Phase completion remains blocked until it closes.

The Repair then goes through:

```text
Architect WorkItem planning
→ Implementer
→ Tester
→ Validator
→ WorkItem close
→ Phase Criterion revalidation
```

## 6. Phase projection and UI

For a failed current Phase Criterion:

- show exact failure evidence;
- show **Create Phase Repair** when repairable;
- after Repair creation, show the Repair WorkItem in the current Phase;
- do not enable Complete Phase while the Repair is open;
- after Repair close, require fresh Phase validation.

For blocked source-neutral deterministic proof:

- show that no current deterministic proof provider exists;
- do not display pass.

## 7. Planning guard for unsupported deterministic non-source proof

Do not make accepted plans silently impossible.

At planning acceptance or Phase validation preflight, provide a bounded explicit incompatibility when:

- Workflow is source-neutral;
- required deterministic Criterion has no registered source-neutral deterministic proof provider.

Prefer rejecting the unsupported Criterion policy before execution begins if the source-neutral status is already known.

Do not invent a generic non-source runner solely to satisfy this card.

## 8. Phase Operator/visual evidence

Consume the Criterion-specific human semantics from R02-02.

Do not restore Phase owner-wide disposition.

Human visual fail/inconclusive remains truthful.

Rejected Operator Criterion can become Phase Repair evidence through the typed Phase Repair command.

## Permanent proof

At minimum prove:

1. source-neutral deterministic Phase Criterion does not auto-pass from member closure;
2. source-backed deterministic Phase proof still uses exact candidate;
3. semantic Phase Validator receives evidence from 2+ member WorkItems;
4. semantic Validator principal differs from every current Implementer and Tester principal;
5. WorkItem-owned deferred visual Criterion becomes satisfied after exact owning-Phase visual proof;
6. peer Phase cannot consume it;
7. solution deferred visual Criterion remains consumed at its intended Phase boundary;
8. Phase Validation is stale when aggregate member Tester evidence changes;
9. failed deterministic Phase Validation creates one Phase Repair;
10. failed semantic Phase Validation creates one Phase Repair;
11. failed visual Phase Validation creates one Phase Repair;
12. rejected Phase Operator Criterion creates one Phase Repair;
13. duplicate unresolved Phase Repair rejects;
14. Phase Repair appears as a member WorkItem and uses R02-01 planning/execution;
15. Phase remains blocked until Repair closes and Criterion is revalidated;
16. SQLite reopen preserves Phase failure/Repair/revalidation state.

## Non-scope

Do not change:

- WorkItem planning contract from R02-01;
- Criterion-specific human authority from R02-02 except shared helpers;
- runtime interaction/concurrency renderer behavior;
- integration mechanics.

## Validation

Run:

- build;
- Project State Phase/deferred/freshness tests;
- exact Phase application/IPC tests;
- multi-member semantic Phase Validator tests;
- Phase Repair typed-command tests;
- shared renderer Phase-failure/Repair tests;
- reopen tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair02/Reports/WRB04-R02-03_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R02-03 correct Phase validation and Repair`

Then read WRB04-R02-04 only.
