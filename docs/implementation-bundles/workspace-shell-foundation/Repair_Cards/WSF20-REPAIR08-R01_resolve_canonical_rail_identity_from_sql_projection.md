# WSF20-REPAIR08-R01 — Resolve canonical rail return from SQL identity

**Type:** Repair Card  
**Parent:** WSF20-REPAIR08  
**Defect:** WSF20-D25  
**Starting baseline:** `8cf458e5a2cfab1a9ecd1f54c34a6882277a4ead`

## Objective

Complete R08's canonical-return rule for Project, Phase, WorkItem and Repair stages.

When the Operator clicks the current canonical rail destination, the resulting selection must come from the current `GreenfieldNavigationProjection`, not from stale historical identity retained by the inspected workspace.

## Confirmed RCA

`open(stage, workItemId = selection.workItemId ?? undefined)` implicitly carries the inspected WorkItem into every rail navigation call that does not supply an explicit WorkItem ID.

For Phase and WorkItem destinations this can produce a stage that visually matches the canonical stage while retaining a historical Phase/WorkItem identity, so `isCanonicalSelection()` correctly keeps it read-only.

The defect is identity resolution in `open()`, not `isCanonicalSelection()`.

## Required correction

### 1. Canonical stage click resolves directly from SQL

If the requested rail stage equals `navigation.currentWorkspace` and the caller did not explicitly request a different WorkItem/context, set selection from the canonical SQL projection:

`selectionFromSql(navigation)`

and clear inspection.

This must restore the exact current:

- stage;
- Phase ID;
- WorkItem ID;
- Repair ID.

Do not merge historical inspected child identities into that canonical selection.

### 2. Do not use inspected WorkItem as a universal default

Remove the universal default parameter that implicitly turns `selection.workItemId` into the requested WorkItem for unrelated rail destinations.

An inspected WorkItem may be preserved only when the destination semantically belongs to that inspected WorkItem and the Operator is continuing inspection.

Explicit map/context selections that pass an exact WorkItem ID continue to use that exact ID.

### 3. Preserve non-canonical inspection

Required behavior:

- historical Work Card in Phase B → click another historical Work Card/inspection surface in Phase B → remain inspection;
- historical Work Card in Phase B → click canonical Phase Interview for Phase A → return exact Phase A canonical selection, inspection=false;
- historical Work Card → click canonical current Work Card stage → return exact current WorkItem from SQL, inspection=false;
- historical Repair → click canonical Repair → return exact current Repair identity, inspection=false;
- Project-level canonical return remains fixed as in R08.

### 4. No resolver call for rail return

This remains renderer presentation state. Use the already-loaded `navigation` projection; do not add a SQL read merely to click the rail.

Resume current stage continues to reread SQL explicitly.

## Required proof

Extend the existing Greenfield inspection owner with direct transitions that begin from historical WorkItem context, without first changing the selectors:

1. canonical Phase A / Phase Interview; inspect WorkItem in Phase B; click canonical Phase Interview rail; selection becomes Phase A with no historical WorkItem, inspection=false;
2. canonical WorkItem W1 / Report Review; inspect historical W2; click Report Review rail; selection becomes W1, inspection=false;
3. canonical Repair R1; inspect historical R2; click Repair rail; selection becomes exact R1, inspection=false;
4. non-canonical rail navigation still preserves inspection;
5. no `getGreenfieldNavigation` call occurs for rail-only return;
6. R08 Phase Map disposition regression remains green.

Run at minimum:

- `test/renderer/greenfield-shell-composition.test.cjs`;
- `test/renderer/phase-map-presentation.test.cjs`;
- static validation / production build owner selected by the repair profile.

## Forbidden changes

- no SQL/domain/schema change;
- no browser/layout change;
- no disposition-panel change;
- no prompt/MCP change;
- no hard-coded Phase/WorkItem IDs;
- no new persisted renderer navigation state.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR08_R01_IMPLEMENTER_REPORT.md`

## Checkpoint

`WSF20-R08-R01 resolve canonical rail identity from SQL projection`

After checkpoint, stop for Operator audit.
