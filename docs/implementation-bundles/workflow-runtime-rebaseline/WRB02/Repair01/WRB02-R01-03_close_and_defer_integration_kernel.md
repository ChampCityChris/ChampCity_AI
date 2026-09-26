# WRB02-R01-03 — Close WRB02 and Route Integration-Kernel Defect to WRB04

**Starting checkpoint:** `bc7be408e8ca54ac0805b87815566fd293acf22c`  
**Current worktree:** contains uncommitted R01-02 fixture modernization and blocked qualification report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Close WRB02 at its actual architectural boundary.

R01-02 successfully proved the WRB02 → WTR02F source-materialization seam. Its attempt to modernize the old structured-integration proof exposed a production integration-kernel defect that belongs to WRB04, not WRB02.

Do not repair the integration kernel in this card.

## 1. Preserve the passing materialization modernization

Keep the current changes to:

`test/source-control/workflow-source-materialization.test.cjs`

They must retain the 5/5 passing proof reported by R01-02, including:

- canonical Current Project registration;
- managed source topology;
- substantive Workflow creation through the current WRB02 primitive;
- SourceBaseline + unprepared SourceBinding at Workflow creation;
- exact-ID lazy materialization;
- exact baseline across Dev advance;
- supersession ownership;
- concurrent Workflow checkouts;
- ready retry;
- blocked/conflicting checkout behavior;
- WIR/terminal/no-baseline rejection.

Do not weaken these assertions.

## 2. Remove the structured-integration experiment from this WRB02 diff

The current uncommitted changes to:

`test/source-control/structured-integration.test.cjs`

were diagnostic work performed under R01-02's explicit stop condition. They correctly exposed the linked-worktree production defect, but committing an intentionally-red permanent integration test is not WRB02 closure.

Restore this file to the exact `bc7be408e8ca54ac0805b87815566fd293acf22c` version.

Do not modify production integration code.

Do not rewrite the fixture to conceal the defect.

The existing historical structured-integration fixture remains WRB04-owned test debt and is not part of WRB02 acceptance.

## 3. Record the defect as a WRB04 entry condition

Update the rebaseline documentation's WRB04 section with a concise deferred defect:

> Integration candidate storage/ownership still assumes a conventional primary checkout with a directory `.git`. Current Project managed Dev is a linked worktree. WRB04 must normalize the candidate engine on exact Git common-directory identity and prove managed Dev → candidate → Dev integration without changing the non-Git Project-container boundary.

Reference:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Repair01/ARCHITECT_REVIEW_2026-09-26.md`

Do not author the WRB04 implementation card yet. WRB03 still precedes WRB04.

## 4. Replace the blocked R01-02 report with final scoped disposition

Update the existing uncommitted:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Repair01/Reports/WRB02-R01-02_FINAL_QUALIFICATION_REPORT.md`

It must clearly distinguish:

### Passed WRB02 evidence

- R01-01 checkpoint and focused proof;
- source-materialization test 5/5;
- WRB02 substantive Workflow → SourceBaseline/SourceBinding → lazy materialization seam;
- no production source-lifecycle incompatibility.

### Deferred WRB04 evidence

- modernized structured-integration diagnostic reached the production candidate engine;
- failure was the stale `root/.git directory` / primary-checkout assumption;
- fixture experiment was not committed as permanent WRB02 proof;
- no claim that integration passed.

## 5. Update parent WRB02 qualification

Update:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Reports/WRB02-05_BUNDLE_QUALIFICATION_REPORT.md`

Add Repair01 closure evidence and change final disposition to reflect:

- WRB02 application/routing architecture accepted;
- R01-01 product-semantics defects repaired;
- WRB02 → WTR02F materialization seam proven;
- post-plan integration-kernel linked-worktree defect deferred to WRB04 by architecture ownership;
- WRB03 may proceed after this checkpoint.

Do not state or imply that structured integration passed.

## 6. Bounded validation

Run:

- build;
- R01-01 focused lane:
  - Current Project entry;
  - Work Intake routed-workspaces;
  - Workflow Hub shell;
  - structured Work Intake capture;
  - Workflow application service;
- `test/source-control/workflow-source-materialization.test.cjs`;
- Workflow type registry;
- capability-map integrity only if metadata changed;
- exact validation-plan preview;
- `git diff --check`.

Do not run or repair the broad historical structured-integration lane in this card.

Do not run a broad multi-minute affected sweep merely because shared contracts select it. Record the preview honestly.

## 7. Checkpoint and stop

The final committed diff for this card should contain:

- passing materialization fixture modernization;
- R01-02 final scoped qualification report;
- updated WRB02-05 qualification report;
- WRB04 deferred-defect/rebaseline documentation;
- this card/report as appropriate.

It must not contain:

- production integration changes;
- the diagnostic structured-integration fixture modernization;
- WRB03 implementation.

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Repair01/Reports/WRB02-R01-03_CLOSURE_REPORT.md`

Suggested commit:

`WRB02-R01-03 close Workflow application and route integration defect`

Then STOP for final Architect closure.
