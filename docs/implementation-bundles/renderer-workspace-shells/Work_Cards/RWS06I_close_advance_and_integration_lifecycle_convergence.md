# RWS06I — Close / Advance / Integration Lifecycle Convergence

**Status:** IMPLEMENTER_READY  
**Sequence:** follows RWS06H checkpoint

## Objective

Remove canonical closeout Markdown as live authority and unify WorkItem, Phase, Project and substantive Workflow close/advance behavior around SQL lifecycle state.

## Shared Close / Advance Shell

Provide typed adapters for:
- WorkItem close / next WorkItem;
- Phase close / next Phase;
- Project validation / close;
- exact substantive Workflow integration / close.

The shell presents eligibility, blockers, disposition/rationale where required, and next destination. It does not infer completion from Markdown paths.

## SQL authority

Use existing:
- WorkItem/Phase/Workflow lifecycle state;
- Validation/Criterion completion;
- Decision;
- Evidence;
- StateChange;
- IntegrationRecord;
- SourceCheckpoint/SourceBinding;
- relationships.

Greenfield `work-card-close-return-record`, `phase-closeout`, `project-closeout` and routed acceptance Markdown become projections only.

## Workflow completion

After successful final validation:
- exact source-backed Workflows integrate using existing integration semantics;
- source-neutral Workflows close without fabricated Git state;
- Project Creation closes through its Project lifecycle;
- Research no-plan outcome closes from its approved structured assessment without execution.

Direct-start and WIR-routed Workflows must be indistinguishable at this stage except provenance.

## Preserve

Machine-owned Git/integration safety, exact SourceBaseline/SourceLine identity, no hidden merge approvals, repair-before-close rules, phase dependency rules.

## Focused proof

Prove WorkItem→next, final WorkItem→Phase/Workflow, Phase→next Phase, final Phase→project/workflow boundary, integration/close for all implementation Workflow types, Research no-plan close, and no canonical closeout Markdown dependency.

## Report / checkpoint

Report: `.../Implementer_Reports/RWS06I_IMPLEMENTER_REPORT.md`

Commit: `RWS06I converge close advance and integration lifecycle`

Continue to RWS06J.