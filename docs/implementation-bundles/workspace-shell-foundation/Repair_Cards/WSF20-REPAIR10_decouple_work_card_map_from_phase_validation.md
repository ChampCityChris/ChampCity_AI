# WSF20-REPAIR10 — Decouple Work Card Map from Phase Validation

**Type:** Repair Card  
**Parent:** WSF20  
**Defect:** WSF20-D28  
**Starting baseline:** `1f27c8d6ea4d459586e828985f3097e4b20dfb6f`

## Objective

Restore Work Card Map as a projection of the approved Phase Planning contract plus current WorkItem execution state.

Work Card Map must not invoke Phase Validation merely to render candidate status.

Target boundary:

```text
Work Card Map
  = approved Phase Planning
  + Workflow Execution Projection

Phase Validation
  = phase-level criteria/evidence/closeout proof
  only when canonical navigation reaches Phase Validation
```

## Confirmed RCA

`WorkCardMapWorkspace` currently calls `getWorkflowPhaseValidation()` during every map load.

That service evaluates Phase validation criteria, aggregate Tester evidence and source revision provenance. In the live Greenfield test it rejects with:

`Phase aggregate evidence source candidate is not current.`

The call is inside the same `Promise.all()` as the execution projection. Its rejection aborts the entire map load before `setProjection()`, leaving `projection=null`. The recovered shell then presents a false empty state: `No Work Card candidates found`.

The Work Card Map uses only one field from the Phase Validation projection: `workItemsClosed`.

That fact is already derivable directly from the current Phase WorkItems in `WorkflowExecutionProjection`.

## Required correction

### 1. Remove Phase Validation from Work Card Map loading

In `WorkCardMapWorkspace`:

- load exact Phase Planning with `getStructuredPhaseLoop()`;
- load current execution with `getWorkflowExecutionProjection()`;
- do **not** call `getWorkflowPhaseValidation()`;
- build the map from those two projections only.

Remove `PhaseValidationProjection` from the Work Card Map adapter contract/imports.

Do not catch/ignore the Phase Validation exception. Eliminate the invalid dependency.

### 2. Derive completion from exact Phase WorkItems

Refactor `workCardMapFromSql()` so it receives only:

- exact approved Phase Planning projection;
- exact Workflow Execution projection.

Filter execution items to the exact planned Phase as it already does.

Derive:

```text
phaseItems = execution.items where item.phaseId == planning.phase.id
allClosed = phaseItems.length > 0 && every phaseItem.record.body.workState == closed
```

Use `allClosed` to select `state: all-complete` and expose Phase Validation navigation.

While any current Phase WorkItem remains open/planned/ready/in-progress/validation_pending, the map remains `ready` or `needs-attention` according to existing planning-review rules.

Do not use Phase-level Criterion/Tester evidence to decide whether the map is complete.

### 3. Preserve candidate eligibility semantics

Keep the existing candidate behavior:

- candidate list comes from current execution items for the exact Phase;
- dependencies come from execution projection dependency IDs;
- closed WorkItems show Complete;
- currently eligible planned WorkItems show Eligible;
- dependency/active-work blockers show Ineligible;
- one active WorkItem prevents unrelated candidates from beginning;
- active candidate action remains Continue Work Card;
- explicit Begin Planning remains presentation navigation and does not itself mutate SQL.

Do not reconstruct candidates from generated Markdown.

### 4. Distinguish true empty from load failure

A service failure must render as an error, not as `No Work Card candidates found`.

Preserve the current error presentation but ensure the shell can distinguish:

- `projection === null && loading` → loading/current-state message;
- load failed → error message;
- successfully loaded approved Phase with zero projected WorkItems → true empty-state message.

If a loading flag is required, keep it renderer-local and ephemeral.

Do not fabricate candidates.

### 5. Phase Validation remains strict

Do not weaken `getWorkflowPhaseValidation()`, `currentPhaseEvidenceTesterIds()`, source revision checks, or Phase completion eligibility.

The error proves those checks are doing their job at the wrong call site.

Phase Validation should continue to fail closed if its aggregate evidence/source provenance is stale when the workflow actually reaches that stage.

## Focused proof

Extend the existing Work Card Map owner to prove:

1. Work Card Map adapter never calls `getWorkflowPhaseValidation()`;
2. approved Phase Planning + execution items renders all current Phase candidates;
3. peer-Phase WorkItems are excluded;
4. closed / eligible / ineligible candidate statuses remain correct;
5. active WorkItem continuation behavior remains correct;
6. all current Phase WorkItems closed → `all-complete` and Phase Validation action;
7. one non-closed WorkItem → map remains `ready`;
8. stale/unavailable Phase Validation evidence cannot affect Work Card Map rendering because it is never queried;
9. execution-projection failure renders an error rather than false-empty candidates;
10. successfully loaded zero-item projection is the only path to the true empty-state message;
11. exact Phase/workflow identity mismatch still fails closed.

Add an integration regression using a source-backed or source-binding fixture where Phase Validation projection would currently reject for stale aggregate source evidence but Phase Planning/Execution are otherwise readable. Prove Work Card Map still renders its candidates.

Run at minimum:

- `test/renderer/work-card-map-workspace.test.cjs`;
- Greenfield composition/navigation owner;
- Phase Planning service/navigation owner;
- Workflow execution application owner;
- static/build validation selected by the repair profile.

## Operator acceptance

Continue the existing Greenfield project at Work Card Map:

1. no `workflow:phaseValidation` error appears on map load;
2. planned Work Card candidates appear from the approved Phase Planning output;
3. candidate status/eligibility is visible;
4. select the first eligible candidate;
5. Begin Planning becomes actionable;
6. Phase Validation is not queried/opened until all Phase Work Cards are actually complete.

## Forbidden changes

- no weakening Phase Validation evidence/source rules;
- no SQL/domain/schema migration;
- no Markdown reconstruction of WorkItems;
- no fake Work Card candidates;
- no browser/MCP/prompt changes;
- no navigation authority changes;
- no unrelated D05–D08 work.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR10_IMPLEMENTER_REPORT.md`

Report the removed cross-stage dependency, exact completion derivation, false-empty regression proof, and focused test/build receipts.

## Checkpoint

`WSF20-R10 decouple Work Card Map from Phase Validation`

After checkpoint, stop for Operator audit.
