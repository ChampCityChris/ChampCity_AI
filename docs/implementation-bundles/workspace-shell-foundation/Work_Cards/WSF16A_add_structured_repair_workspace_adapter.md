# WSF16A — Add structured Repair workspace application adapter

**Type:** Application Foundation Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Depends on:** WSF15A and WSF16 checkpoints  
**Unblocks:** WSF17.

## Objective

Provide the exact SQL-backed Repair read/action model required by the recovered Work Card Repair shell. Do not add another Repair authority model.

## Required adapter

Add a bounded structured Repair workspace service/read projection keyed by exact:

- Workflow ID;
- Repair WorkItem ID.

It must resolve and return:

- exact Repair WorkItem;
- exact parent WorkItem through `repairs`;
- exact failure provenance through Repair Criterion `derived_from`;
- failure source type/identity (`Validation`, criterion Decision, TesterResult, or WSF15A report-review Decision);
- current Repair Criterion;
- exact Phase/Workflow owner;
- parent `WorkItemValidationCycle` / Operator defect context when applicable;
- current WorkItem Planning projection/review for the Repair;
- current ImplementationAttempt/ImplementationRecord/Tester/validation evidence for the Repair when present;
- current source mode;
- generated human-readable Repair context projection.

## Repair creation/recovery

Expose an application command that receives:

- exact Workflow ID;
- exact parent WorkItem ID;
- exact failure evidence ID.

It calls the existing typed Repair domain command.

If the same unresolved failure already owns an active Repair, return/recover that exact Repair rather than treating refresh/retry as a new Repair request.

Do not weaken domain duplicate protection.

## Architect planning

Repair WorkItem planning uses the existing WSF03A `work-item-planning` candidate ingress and `StructuredWorkItemPlanningService`.

The Repair workspace adapter supplies the exact Repair context to the handoff. No legacy Repair Markdown promotion becomes authority.

## Execution / validation

After Repair planning approval, the same shared building blocks own work:

- WSF15 Implement;
- WSF16 Review & Validation;
- WSF18 when the explicit validation surface is selected.

Do not build a private Repair executor/tester/validator.

## Repair return semantics

Preserve **current SQL proof semantics**:

- successful Repair completion follows current Project State return behavior;
- do not fabricate historical direct parent completion in the renderer;
- if current SQL returns the parent to `ready`, WSF19A must route the parent to its required current shell.

Record this behavioral difference for WSF20 Operator audit.

## Projection/export

Repair context/review documents are SQL-derived and exportable Markdown.

No canonical Repair Markdown file is required.

## Forbidden

- no new Repair entity type;
- no alternate repair lineage;
- no renderer search for “latest Repair” without exact IDs;
- no Markdown parsing;
- no generic execution screen;
- no other workflow family changes.

## Focused proof

Prove exact failure→Repair lineage for all supported evidence types, idempotent recovery, peer isolation, WSF03A planning handoff, repeated/nested Repair chain identity, and correct shared Implement/Review handoff.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF16A_IMPLEMENTER_REPORT.md`.

## Checkpoint

`WSF16A add structured Repair workspace adapter`

Then resume WSF17.
