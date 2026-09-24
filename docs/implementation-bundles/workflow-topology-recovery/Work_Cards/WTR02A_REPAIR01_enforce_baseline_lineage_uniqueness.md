# WTR02A Repair01 — Enforce SourceBaseline Uniqueness Across Workflow Lineage

**Parent card:** WTR02A — Establish Workflow SourceBaseline Semantic Contract  
**Implementer:** GPT 6.0 Luna Medium  
**Architect finding:** SourceBaseline creation is keyed to exact Workflow entity ID, allowing a same-Workflow supersession successor to capture a second baseline  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02A_REPAIR01_IMPLEMENTER_REPORT.md`

## 1. Finding

WTR02A requires:

> a Workflow may have at most one SourceBaseline record for its lifetime.

WTR01D already established:

> A same-type supersession remains a correction within one Workflow lineage; it is not creation of another Workflow instance.

Current `createWorkflowSourceBaseline()` rejects a duplicate only when:

```ts
record.body.workflowId === workflowId
```

Because Workflow supersession creates a successor entity ID with the same `lineageId`, the current implementation permits:

```text
Workflow A (lineage L)
→ SourceBaseline 1
→ superseded by Workflow A' (same lineage L)
→ SourceBaseline 2   // currently allowed, architecturally invalid
```

That accidentally creates a baseline-refresh mechanism, which WTR02A explicitly deferred.

## 2. Required correction

Update only the SourceBaseline duplicate guard in:

`src/shared/projectState/projectStateService.ts`

Before creating a SourceBaseline, determine whether any existing SourceBaseline in the Project belongs to **any Workflow record in the same Workflow lineage** as the requested target Workflow.

If one exists, reject creation.

The invariant is:

```text
one Workflow lineage
→ at most one SourceBaseline
```

not:

```text
one Workflow entity ID
→ at most one SourceBaseline
```

Use canonical application-owned Workflow `lineageId`. Do not infer lineage from title, Workflow type, route provenance, Git identity, or any display value.

## 3. Historical baseline relationship remains unchanged

Do not move or recreate the existing:

```text
SourceBaseline
  baselines_source
original Workflow record
```

when that Workflow is superseded.

The baseline remains historical evidence of the exact source state captured for that Workflow lineage.

Existing supersession relationships provide lineage/history context.

Do not add a second `baselines_source` edge to the successor.

## 4. No refresh/rebase policy

Do not introduce:

- baseline revision;
- baseline supersession;
- baseline replacement;
- baseline refresh;
- rebasing;
- a second baseline record;
- active/current baseline selection.

Those require an explicit later architecture decision/card.

WTR02A continues to mean one immutable original baseline per Workflow lineage.

## 5. Focused proof

Modify only:

`test/project-state/source-semantic-references.test.cjs`

Extend the existing SourceBaseline test to prove:

1. create substantive Workflow;
2. capture SourceBaseline;
3. supersede that Workflow with a same-type successor;
4. attempt `createWorkflowSourceBaseline()` using the successor ID;
5. creation is rejected as already having a baseline for that Workflow;
6. no second SourceBaseline record is persisted;
7. no extra state-change/outbox event is persisted by the rejected attempt;
8. a genuinely independent Workflow with a different lineage can still capture its own baseline.

Do not add a new permanent test file.

## 6. Expected owned files

Production:

- `src/shared/projectState/projectStateService.ts`

Test:

- `test/project-state/source-semantic-references.test.cjs`

Report:

- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02A_REPAIR01_IMPLEMENTER_REPORT.md`

No other production file should change.

## 7. Explicit non-scope

Do not:

- change SourceBaseline body shape;
- change `baselines_source`;
- change Workflow supersession semantics;
- modify SourceBinding;
- modify SourceCheckpoint or IntegrationRecord;
- change source-control services;
- repair inherited WTR02 source-control failures;
- add baseline refresh behavior;
- change Git/MCP/worktree behavior;
- change Source Graph;
- begin WTR02B.

## 8. Validation

Required:

1. `npm run build`;
2. `node --test test/project-state/source-semantic-references.test.cjs`;
3. validation planner preview for exact final changed paths;
4. `npm run test:affected -- --changes <exact-changed-path manifest>`;
5. `git diff --check`.

The known inherited source-control ownership failure remains out of scope if selected by affected validation.

## 9. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02A_REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- starting SHA;
- exact production/test files changed;
- lineage-aware duplicate algorithm;
- focused validation results;
- affected-validation result and any inherited WTR02 failure;
- explicit confirmation that no SourceBinding/later-WTR02 behavior was changed.

## 10. Checkpoint and stop

After implementation and validation, create exactly one attributable checkpoint commit.

Suggested subject:

`WTR02A Repair01 enforce baseline lineage uniqueness`

No additional Operator Git approval is required.

Then stop. Do not begin WTR02B.
