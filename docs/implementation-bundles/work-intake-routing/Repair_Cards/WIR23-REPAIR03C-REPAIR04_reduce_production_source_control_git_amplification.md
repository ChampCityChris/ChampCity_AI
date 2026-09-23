# WIR23-REPAIR03C-REPAIR04 — Reduce Production Source-Control Git Amplification

**Type:** Architecture / Performance Repair Work Card  
**Parent:** WIR23-REPAIR03C  
**Finding:** Production source-control amplification exposed by REPAIR03

## A. Objective

Reduce redundant Git subprocess amplification in the production SourceControlService / Work Intake checkpoint / routed-integration path without weakening repository identity, exact-ref, checkpoint-lineage, receipt, merge, or target-advance safety.

The measured Research qualification path executed 9,766 `runBoundedGit()` calls across four IntegrationCandidate checkouts. The goal is to remove repeated observation of the same repository state, not to bypass safety checks.

## B. Verified Repository Preconditions

### SourceControlService receipt amplification

`src/main/sourceControl/sourceControlService.ts::run()` executes:

- `verifyRepository()`;
- `position()` before;
- operation;
- `position()` after.

`SourceControlPosition` contains only:
- `branch`;
- `commit`.

But `position()` currently calls `inspectGitBranchState()`, whose normal path additionally enumerates:
- all local branches;
- upstream;
- ahead/behind when applicable;
- remotes.

Those values are not part of the receipt position.

`verifyRepository()` also re-runs exact root/worktree verification for every SourceControlService operation.

### Checkpoint lineage amplification

`workIntakeBranchService.verify()` currently:
- calls SourceControlService branch inspection;
- calls history;
- calls `readCommitMessage()` separately for every checkpoint commit;
- performs an ancestry history query.

Each `readCommitMessage()` is itself a SourceControlService operation with full receipt pre/post overhead.

`routedIntegrationService.researchCheckpoints()` then verifies the Work Intake branch again and independently scans/reads the checkpoint lineage again.

### Existing lower-level safety

`integrationGit.ts` independently verifies:
- candidate worktree registration/ownership;
- exact checkout root/common Git directory;
- clean/conflict state;
- exact target/incoming refs;
- ancestry/merge base;
- candidate commit before target advancement.

These checks must remain.

## C. Exact Implementation Delta

### 1. Add a lightweight Git position primitive

In `gitMutations.ts`, add an exported read-only helper:

`inspectGitPosition(root): Promise<SourceControlPosition>`

It must return exactly:
- current branch or null;
- exact HEAD commit.

It must not enumerate:
- all branches;
- upstream;
- ahead/behind;
- remotes.

Use bounded Git commands and existing revision validation.

### 2. Use lightweight positions for SourceControl receipts

In `sourceControlService.ts`:

- replace receipt `position()` use of `inspectGitBranchState()` with `inspectGitPosition()`;
- do not change receipt shape or before/after semantics.

### 3. Cache successful repository-root verification per service instance

Repository binding is immutable for one SourceControlService instance.

After the first successful exact worktree/top-level verification:
- subsequent operations on the same service instance may reuse that verified root identity;
- actual operation-specific Git checks still run normally;
- a failed initial verification is not converted into success;
- no cross-service/global repository cache is introduced.

The service remains bound to one canonical repository root and repositoryId.

### 4. Batch checkpoint history with commit messages

Add one bounded read-only source-control operation capable of returning, for at most 100 commits:

- commit;
- parents;
- subject;
- full bounded commit message.

Use one bounded Git history/log read rather than one SourceControlService `readCommitMessage()` operation per commit.

Requirements:
- total output bounded;
- each message bounded;
- exact commit IDs validated;
- no mutation;
- add the operation to `SourceControlOperation`.

### 5. Reuse the batched lineage in Work Intake branch verification

Modify `workIntakeBranchService.verify()` so checkpoint-chain validation does not call `readCommitMessage()` once per commit.

Preserve exactly:
- single-parent requirement;
- checkpoint receipt parsing;
- intake/repository/workBranch ownership;
- beforeHead chain continuity;
- 100-commit bound;
- base ancestry requirement;
- external/unrecognized commit rejection.

### 6. Remove duplicate immediate Research branch verification

`resolveResearchCompletion()` already returns a branch binding produced by `createWorkIntakeBranchService(...).verify()`.

Within one `routedIntegrationService.query()` evaluation:

- `researchCheckpoints()` must consume that already-verified binding;
- it must not immediately call `verify()` a second time before reading the same head;
- after a checkpoint mutation, the existing refreshed `query()` performs a new verification, preserving post-mutation safety.

### 7. Use the same batched checkpoint lineage for routed integration

Plan/Research checkpoint scanning should consume the bounded history-with-messages operation rather than per-commit SourceControlService calls.

Do not merge Plan and Research semantic validation; share only the mechanical lineage read.

## D. Expected Change Boundary

Expected production:
- `src/main/agentHarness/repository/gitMutations.ts`
- `src/main/sourceControl/sourceControlService.ts`
- `src/shared/sourceControlContracts.ts`
- `src/main/workIntake/workIntakeBranchService.ts`
- `src/main/planExecution/routedIntegrationService.ts`

Expected tests:
- `test/agent-harness/source-control-service-boundary.test.cjs`
- existing Work Intake checkpoint boundary owner
- one focused production source-control operation-count proof
- existing Plan integration sentinel

Do not change:
- IntegrationCandidate identity/status semantics;
- Research completion semantics;
- target-advance policy;
- Integration Repair semantics;
- validation budgets to accommodate current amplification.

## E. Architectural Decisions Already Made

1. Safety checks remain exact; duplicate observations are removed.
2. Receipt position is branch+commit, not full branch inventory.
3. Repository identity is stable for one service instance after exact successful verification.
4. Checkpoint history is one bounded immutable observation, not N nested SourceControlService operations.
5. A state-changing operation requires a subsequent fresh query/verification.
6. Lower-level integration Git conformance remains unchanged.

## F. Test and Validation Contract

### Source-control receipt proof

Extend `source-control-service-boundary.test.cjs` to prove:
- before/after receipt branch and commit are unchanged in meaning;
- full `branches()` still returns branch/upstream/remote detail when explicitly requested;
- nested repository denial still fails closed.

### Operation-count proof

Add a focused test around one normal successful SourceControlService operation sequence and `measureExecution()`.

Structural acceptance:
- one simple `status()` call must not invoke full branch inventory for receipt creation;
- checkpoint verification must not issue one SourceControlService commit-message operation per checkpoint.

### Integration proof

Run one normal Plan routed-integration sentinel with existing semantic fixture.

Do **not** use the 4-candidate Research characterization as the performance benchmark for this card.

### Required commands

1. `npm run typecheck`
2. authoritative source-control boundary owner
3. authoritative Work Intake/source-checkpoint boundary owner
4. `routed-integration-focus.test.cjs`
5. operation-count proof

Record before/after bounded-Git counts for the focused production operation path.

## G. Forbidden Changes

Do not:
- bypass exact repository root verification entirely;
- remove before/after receipts;
- trust caller-supplied branch/head;
- weaken checkpoint receipt parsing;
- skip lower-level worktree/merge/target checks;
- add process-global mutable Git caches;
- solve the Research test runtime only by mocking production in this card.

## H. Mismatch Policy

Stop if:
- SourceControl receipts materially require branch inventory/upstream/remotes rather than branch+commit;
- batching commit messages cannot remain bounded;
- checkpoint lineage semantics differ between Work Intake verification and routed integration in a way that prevents mechanical history sharing.

## I. Completion Evidence

Report:
- files changed;
- exact old/new receipt-position Git observations;
- repository verification cache lifetime;
- old/new checkpoint message acquisition;
- focused bounded-Git count before/after;
- source-control/checkpoint/integration test results;
- any remaining production amplification.
