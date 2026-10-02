# RWS06H — Review / Validation / Repair Structured Convergence

**Status:** IMPLEMENTER_READY  
**Sequence:** follows RWS06G checkpoint

## Objective

Unify post-implementation review, Tester/Operator validation and repair around Structured Project State and shared presentation.

## Shared Review / Validation Shell

Create/extract a shell capable of presenting:
- implementation result/evidence;
- TesterResult;
- Validation records and Criterion status;
- visual/operator-required evidence when applicable;
- exact current disposition/actions;
- repair eligibility.

Use adapters for Greenfield and exact Workflows.

## SQL authority

Canonical state is:
- ImplementationRecord;
- TesterResult;
- Validation;
- Evidence;
- Criterion;
- Decision;
- SourceCheckpoint;
- repair WorkItem + `repairs` relationship.

Greenfield `implementer-report`, `validation-record`, and similar review Markdown become generated reports/projections only.

## Repair

Converge Greenfield Repair Work Card and exact Workflow repairs on SQL repair WorkItems.

Reuse existing Greenfield Repair prompt semantics where useful, but ingest the result as a typed repair contract tied to the failed WorkItem/evidence. Generated Repair Card Markdown is projection-only.

A repair must return to the correct original lifecycle boundary after approval/execution.

## Human validation

Do not manufacture Operator validation when deterministic/independent semantic proof is sufficient. Preserve explicit visual/experiential/policy/product validation where it is genuinely required.

## Migration

Deterministically migrate controlled validation/repair metadata when exact identities are unambiguous. Do not infer semantic pass/fail or repair scope from arbitrary prose.

## Focused proof

Prove Greenfield and exact Workflows use SQL validation/repair authority; generated reports do not mutate state; repair lineage is exact; Tester/Validation currentness remains intact; human-only validation remains bounded.

## Report / checkpoint

Report: `.../Implementer_Reports/RWS06H_IMPLEMENTER_REPORT.md`

Commit: `RWS06H converge validation and repair on structured state`

Continue to RWS06I.