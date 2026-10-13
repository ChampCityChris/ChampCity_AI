# WSF20-REPAIR08 — Exit inspection when selecting the canonical current stage

**Type:** Repair Card  
**Parent:** WSF20  
**Defect:** WSF20-D24  
**Starting baseline:** `387a6120b32ae48f0ee35b3212955a7cabefda93`

## Objective

Restore the navigation invariant:

- completed/future stage selected → read-only inspection;
- canonical current stage selected → actionable current stage.

The Operator must not need to know that **Resume current stage** is a special escape hatch when clicking the current rail destination already expresses the same intent.

## Confirmed RCA

`GreenfieldWorkspace.open()` currently preserves `selection.inspection` whenever the Operator navigates through the rail.

That means a previously inspected workflow can be navigated back onto the SQL canonical stage while remaining read-only.

For current Phase Map, `readOnly=true` disables the disposition selector through the existing review-panel contract, blocking approval and revision request.

The existing R06 Greenfield composition test explicitly expects this incorrect sticky-canonical behavior and must be corrected.

## Required correction

### 1. Canonical rail selection clears inspection

When a rail destination resolves to the exact current SQL navigation identity, clear ephemeral inspection state.

Use the current `GreenfieldNavigationProjection` as authority.

A selection is canonical only when:

- stage matches `navigation.currentWorkspace`;
- Phase identity matches `navigation.currentPhaseId` where relevant;
- WorkItem identity matches `navigation.currentWorkItemId` where relevant;
- Repair identity matches `navigation.currentRepairId` where relevant.

Do not determine canonicity from rail labels or hard-coded stage ordering.

For Project-level stages with no Phase/WorkItem identity, exact current stage equality is sufficient.

### 2. Preserve inspection while actually inspecting

Do not broadly clear inspection on every rail click.

Required behavior:

- canonical Phase Map → click completed Project Planning → inspection=true;
- while inspecting Project Planning → click completed Architect Interview → inspection=true;
- while inspecting Architect Interview → click canonical Phase Map → inspection=false.

Historical Phase/WorkItem context selection remains read-only until either the Operator chooses the exact canonical SQL identity or presses Resume current stage.

### 3. Resume remains valid but not mandatory

Keep the left-sidebar **Resume current stage** action while inspection is active.

It remains useful for direct return, but clicking the exact canonical rail destination must produce the same canonical result.

### 4. Phase Map disposition regression

On canonical Phase Map after leaving inspection:

- `StructuredPhaseMapWorkspace.readOnly === false`;
- disposition select is enabled when the review is otherwise ready;
- Approve / Request Revision / Reject can be selected;
- Apply Review follows the existing readiness rules;
- approval still persists then invokes canonical progression exactly once.

Do not weaken the disposition panel's read-only enforcement. Fix the navigation state that incorrectly supplies `readOnly=true`.

## Focused proof

Update the existing Greenfield inspection/navigation owner to prove:

1. initial canonical stage has `inspection=false`;
2. clicking a completed prior stage sets `inspection=true`;
3. clicking another non-canonical stage preserves inspection;
4. clicking the exact canonical project-level stage clears inspection;
5. exact canonical Phase identity clears inspection;
6. exact canonical WorkItem identity clears inspection;
7. selecting a same-stage historical Phase/WorkItem does not clear inspection;
8. Resume still clears inspection by rereading SQL;
9. no SQL mutation is performed merely by rail navigation.

Add a Phase Map regression proving:

10. inspect completed Project Planning;
11. rail-select canonical Phase Map;
12. composed Phase Map receives `readOnly=false`;
13. disposition select is enabled when review is ready;
14. Request Revision and Approved can both be selected;
15. approval persists and advances through the existing canonical resolver.

## Live Operator acceptance

Continue the existing test project:

1. inspect completed Project Planning or Architect Interview;
2. click **Phase Map** in the project rail;
3. Resume current stage disappears;
4. Phase Map disposition dropdown opens;
5. choose Request Revision or Approved as appropriate;
6. Apply Review is usable under the existing readiness rules.

## Forbidden changes

- no SQL/domain/schema change;
- no disposition-panel weakening;
- no permanent renderer current-stage state;
- no browser/layout changes;
- no prompt/MCP changes;
- no hard-coded phase/work-card IDs;
- no unrelated D05–D08 work.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR08_IMPLEMENTER_REPORT.md`

Report the exact canonical-selection rule, corrected inspection-navigation test, Phase Map enabled-disposition regression proof, focused test/build/static receipts.

## Checkpoint

`WSF20-R08 exit inspection on canonical rail selection`

After checkpoint, stop for Operator audit.
