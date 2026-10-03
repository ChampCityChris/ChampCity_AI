# WSF15A — Add structured WorkItem validation / report-review foundation

**Type:** Architecture Foundation Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Depends on:** WSF15 checkpoint `4e86704`  
**Unblocks:** WSF16, WSF17 manual Repair ingress, WSF18.

## Objective

Restore the exact durable SQL boundary that replaces the historical Work Card `validation-record` without weakening current Tester/criterion validation policy.

Read `../WSF_REMAINING_BOUNDARY_AUDIT_WSF16_WSF20.md`.

## Entity

Add typed `WorkItemValidationCycle`.

Minimum body:

- `workflowId`
- `workItemId`
- `implementationAttemptId`
- `implementationRecordId`
- `semanticDigest`
- `layout: {memberIds,sources}`
- optional bounded `advisorySummary`
- optional bounded `advisoryBlockingFindings[]`
- optional `advisoryRecommendation: ValidatePassed | RequestRepair | Inconclusive`
- optional bounded `advisoryRepairDefectText`
- optional bounded `operatorNotes`
- optional bounded `repairDefectText`

Disposition remains derived from exact human Operator Decisions; do not add a mutable disposition field.

No SQLite schema migration.

## Exact source snapshot

The cycle snapshot must bind current:

- WorkItem contract revision;
- exact completed `ImplementationAttempt`;
- linked immutable `ImplementationRecord`;
- exact current TesterResult when present;
- current Criterion Validations/Decisions;
- relevant SourceCheckpoint / current source revision;
- open Repair lineage relevant to completion.

Changing any completion-relevant source makes an existing cycle non-current.

## Prepare / get

Add typed commands/read model:

- `prepareWorkItemValidationCycle(workflowId,workItemId)`
- `getWorkItemValidationCycle(workflowId,workItemId)`

Prepare is explicit and idempotent for unchanged evidence. It creates/revises the current cycle but never approves or closes the WorkItem.

This command supplies WSF18 **Create Current Validation Attempt**.

WSF16 may display report/Tester evidence before a cycle exists.

## Advisory Architect

Extend WSF03A `workflow_toolbox.submit_stage_candidate` with stage:

`work-item-review-advisory`

The bounded candidate contract must preserve the substance of the historical advisory review, at minimum:

- concise advisory summary;
- blocking findings;
- suggested Operator decision `ValidatePassed | RequestRepair | Inconclusive`;
- optional suggested repair defect statement.

Submission targets exact Workflow + WorkItem, prepares/revises the current cycle from current evidence, and stores advisory content in SQL.

The handoff must use:

- exact approved WorkItem contract;
- current SQL Implementer Report projection;
- Tester/validation evidence currently available;
- exact source identity.

Architect advice never creates an Operator Decision.

## Operator report review

Add a typed application/domain command for the historical outcomes:

### ValidatePassed

Requires:

- exact current cycle/evidence;
- current completed ImplementationRecord;
- exact current TesterResult required by existing policy;
- `getWorkItemCompletionEligibility` / equivalent current criterion proof is fully eligible.

Then atomically:

1. preserve Operator notes/advisory fields on the exact cycle revision;
2. create `Decision(decisionType="work-item-validation-review", outcome="approved")` governing that exact cycle;
3. complete the exact WorkItem through current completion semantics.

Do not let aggregate review substitute for missing deterministic, semantic, visual, or criterion-specific Operator proof.

### RequestRepair

Requires bounded nonempty `repairDefectText`.

Then:

1. persist Operator/advisory/defect content on exact current cycle revision;
2. create `Decision(decisionType="work-item-validation-review", outcome="revision_requested")` governing the cycle;
3. leave the parent WorkItem open;
4. return exact Decision identity for Repair creation.

RequestRepair may be recorded before all criteria are satisfied because it is an explicit human defect finding against the exact current implementation result.

## Manual Repair provenance

Extend `createWorkflowRepair` to accept the exact current `work-item-validation-review` revision-request Decision when:

- it governs exactly one current `WorkItemValidationCycle`;
- cycle.workflowId/workItemId match the target parent;
- cycle points at the current completed implementation attempt/result;
- cycle is current against its semantic digest;
- `repairDefectText` is nonempty.

Use that Decision as the Repair failure evidence and derive the Repair Criterion from it.

Do not fabricate a TesterResult or generic failing Criterion Validation.

Create/recover behavior for the same unresolved failure must be idempotent at the application boundary: if an active Repair already exists for that exact decision/cycle identity, return it rather than creating a peer duplicate.

## Tester / criterion controls

The structured review model must expose the existing typed Tester and Criterion proof state/actions needed by WSF16/18.

Do not alter existing validation policy classes.

WSF16 will host Tester execution/evidence in its adapter-supplied action area. WSF18 may expose the same criterion actions in the dedicated Validation shell.

## SQL document projection

Produce deterministic **Work Card Validation Record** Markdown from the exact cycle.

Projection includes:

- WorkItem/contract;
- Implementer Report identity/result;
- Tester evidence;
- criterion proof summary;
- advisory Architect output when present;
- Operator notes;
- repair defect text when present;
- effective aggregate disposition;
- Repair lineage.

Projection is non-authoritative and exportable with the standard Markdown export UI.

## Preserve / forbidden

Preserve:

- immutable `ImplementationRecord`;
- WSF14A `ImplementationAttempt`;
- independent Tester provenance;
- exact validation policy;
- Repair lineage;
- SQL authority.

Forbidden:

- no Markdown validation authority;
- no report-level Decision pretending to satisfy individual Criteria;
- no fake TesterResult;
- no renderer-local validation state;
- no generic Decision accepted as Repair evidence without exact cycle checks;
- no schema migration;
- no other workflow-family renderer changes.

## Focused proof

Prove at minimum:

1. prepare creates one durable current cycle; repeated prepare is idempotent;
2. completed implementation identity is exact;
3. stale implementation/source/tester/criterion evidence makes cycle non-current;
4. advisory candidate enters through `workflow_toolbox` and persists in SQL;
5. advisory output creates no Operator Decision;
6. ValidatePassed rejects missing Tester or criterion proof;
7. ValidatePassed with complete proof records exact review and closes WorkItem atomically;
8. RequestRepair requires defect text and leaves parent open;
9. manual review Decision creates/recover exact Repair through current Repair command;
10. another WorkItem/Workflow cannot consume the decision;
11. SQL-generated validation document reconstructs and exports Markdown;
12. Repair WorkItems can use the same cycle/review foundation;
13. current criterion-specific Repair and Tester-defect Repair paths remain valid.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF15A_IMPLEMENTER_REPORT.md`.

## Checkpoint

`WSF15A add structured WorkItem validation review foundation`

Then resume WSF16.
