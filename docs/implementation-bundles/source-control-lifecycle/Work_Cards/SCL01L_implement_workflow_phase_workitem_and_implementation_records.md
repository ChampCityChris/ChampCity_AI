# SCL01L — Implement Workflow, Phase, WorkItem, and Implementation Records

**Depends on:** SCL01K  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01L_IMPLEMENTER_REPORT.md`

## Objective

Implement durable generic execution semantics required by routed and legacy workflows.

## Required Changes

1. Implement Workflow lifecycle/state records.
2. Implement Phase membership/milestone semantics.
3. Implement WorkItem kinds, state, dependencies, part-of, repairs and criterion relationships.
4. Implement ImplementationRecord attempts with semantic result/deviation/blocker/residual-risk/outcome and optional runtime reference.
5. Implement deterministic Work Item/Repair/Phase completion eligibility using current validations/Decisions/dependencies.
6. Preserve direct plans as derived views rather than creating a generic Plan entity.

## Acceptance Criteria

Direct and phased execution can be represented without Markdown card ancestry or filename inference.

## Validation

Workflow/phase/work-item/completion tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01M.
