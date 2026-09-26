# WRB02 Repair01 Architect Review — 2026-09-26

**Reviewed checkpoint:** `bc7be408e8ca54ac0805b87815566fd293acf22c` plus the uncommitted R01-02 fixture modernization  
**Disposition:** R01-01 accepted. R01-02 source-materialization proof accepted. The discovered integration-kernel defect is deferred to WRB04; one closure card is released before WRB02 closes.

## R01-01 disposition

Accepted.

The implementation restores the intended WRB01/WRB02 semantics:

- Start New Project rejects an already-established Project Creation Workflow and directs reopening through Existing Project.
- An incomplete Greenfield Current Project may finish its missing one-time Project Creation Workflow only when its managed source is valid and no Project Creation history exists.
- closed WIR load/refresh remains on the completed routing record;
- only a new live route decision or explicit Open routed Workflow action navigates to the target;
- closed WIR does not render active Architect browser/actions;
- Work Intake retains the complete request while the WIR Workflow display title is deterministically bounded to 200 characters.

Focused proof passed 43/43 in the normal Windows lane and the build passed.

## R01-02 source-materialization disposition

Accepted for WRB02 scope.

The modernized `workflow-source-materialization.test.cjs` now establishes Current Project + managed source topology and creates substantive Workflows through the WRB02 semantic primitive.

The focused materialization lane passed 5/5 and proves:

`WRB02 substantive Workflow creation`
→ exact Dev SourceBaseline + unprepared SourceBinding
→ exact-ID lazy materialization
→ `workflow/<workflow-id>` SourceLine
→ registered RepositoryCheckout
→ ready SourceBinding.

It also retains the exact-baseline, supersession, concurrent checkout, ready-retry, conflict, and invalid-owner protections from WTR02F.

## Discovered production defect — route to WRB04

The modernized structured integration fixture exposed a real production defect:

- Current Project managed Dev is a linked Git worktree.
- `createStructuredIntegrationService` correctly supplies managed Dev as the integration repository root.
- `integrationGit.integrationPaths()` still requires `root/.git` to be a directory and assumes it is the Git common directory.
- managed Dev correctly has an ordinary linked-worktree `.git` file whose common repository is `.champcity/repository.git`.
- candidate construction therefore fails before integration with `Integration requires the primary repository checkout.`

The surrounding integration mechanics are not fundamentally incompatible with managed Dev. Branch inspection, worktree creation, candidate merge, and target advance can operate from a linked checkout; candidate storage/ownership verification is the stale primary-checkout assumption.

This is not a WRB02 routing/source-ownership defect. WRB04 owns the shared post-plan execution kernel through integration/repair. Expanding WRB02 to redesign or repair the integration kernel would cross the rebaseline boundary and recreate the micro-card rabbit hole the vertical bundles were intended to eliminate.

### WRB04 entry condition

Before shared Integration workspace/kernel qualification, repair the integration candidate repository boundary so it:

- accepts either a conventional primary checkout or a verified linked checkout as the repository operation root;
- resolves and validates the exact Git common directory rather than assuming `root/.git` is a directory;
- stores candidate receipts/checkouts under repository-owned machine storage associated with that common directory;
- verifies candidate worktrees belong to that exact common repository;
- preserves all existing conventional-checkout integration semantics;
- proves the managed Current Project Dev → Workflow source → candidate → Dev advance path.

Do not implement this inside WRB02.

## Remaining WRB02 closure work

One bounded closure card remains:

- keep and commit the passing materialization fixture modernization;
- remove the uncommitted structured-integration fixture experiment from the WRB02 repair diff rather than committing an intentionally-red permanent test;
- preserve the production defect in WRB04 planning/rebaseline documentation;
- update WRB02 qualification reports honestly;
- run the bounded WRB02 closure proof;
- commit and stop for final Architect closure.

WRB03 remains blocked only until that bookkeeping/qualification card is complete.
