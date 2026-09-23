# WIR23-REPAIR04 — Preserve Sequential Intake Target Baseline

**Type:** Repair Work Card  
**Parent:** WIR23 Architect Review  
**Experiment:** Implementer Reasoning Reduction  
**Implementer target:** GPT-5.6 Luna Medium

## A. Objective

Prevent a new Work Intake from defaulting to the previous Work Intake's `work-intake/...` branch merely because that branch is the current checkout.

The application service must provide a deterministic suggested base branch/commit. The renderer uses that suggestion as the initial selection.

Explicit Operator selection of another branch, including a prior Work Intake branch, remains legal and is still validated by the existing branch-establishment service.

## B. Verified Repository Preconditions

`src/main/workIntake/workIntakeService.ts::getWorkIntakeProjection()` currently returns:
- branch inventory;
- raw current branch;
- current Work Intake when the current branch matches a Work Intake binding;
- no application-owned suggested base.

`src/renderer/app/WorkIntakeWorkspace.tsx` currently initializes the form from:
`projection.currentBranch` when present, otherwise the first branch.

After the first Intake is started, the current checkout is its Work Intake branch. This makes the next form default to that branch.

`createWorkIntakeBranchService().establish()` already rechecks the exact selected `baseBranch + baseCommit` immediately before branch creation and fails stale if the branch moved. Do not duplicate or weaken that authority.

Existing proof:
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`

## C. Exact Implementation Delta

### 1. Extend `WorkIntakeProjection`

In `src/shared/workIntakeContracts.ts`, add:

`suggestedBase: { name: string; commit: string } | null`

This is a UI/service suggestion, not an authorization or immutable binding.

### 2. Compute the suggestion in `getWorkIntakeProjection()`

In `src/main/workIntake/workIntakeService.ts`:

If the current checkout is **not** a Work Intake branch:
- if `state.result.currentBranch` exists in the current branch inventory, use that exact current branch/commit as `suggestedBase`;
- otherwise return `suggestedBase: null`.

If the current checkout **is** a known Work Intake branch:
- use that Intake's recorded `branchBinding.baseBranch` as the suggested target branch name;
- resolve its commit from the **current branch inventory**;
- do not reuse the historical `branchBinding.baseCommit` as the suggestion;
- if the target branch is absent from current inventory, return `suggestedBase: null` and set/append a bounded `blockedReason` explaining that the recorded integration target is unavailable and projection must be refreshed/resolved.

Do not silently fall back to another branch when the recorded target is missing.

### 3. Use the service suggestion in the renderer

In `src/renderer/app/WorkIntakeWorkspace.tsx`:
- initialize `baseBranch` and `baseCommit` from `projection.suggestedBase`;
- if suggestion is null, initialize both empty and keep submission disabled by the existing required-base behavior;
- keep the branch selector populated from `projection.branches`;
- when the user explicitly selects another branch, continue updating the commit from that current branch record;
- do not derive a new policy from branch-name prefixes in the renderer.

### 4. Extend service regression proof

Modify `test/project-intake/project-intake-service.test.cjs` in the existing production API test.

Prove:
1. before any active Work Intake, `suggestedBase` is the current integration target with its current commit;
2. after the first Intake is created and the checkout is its Work Intake branch, projection still suggests the first Intake's recorded `baseBranch`, not its `workBranch`;
3. advance the integration target branch in the fixture after the first Intake was based; projection must suggest the target's **new current commit**, not the first Intake's historical `baseCommit`;
4. submit a second Intake using the projection suggestion and prove its `branchBinding.baseBranch` is the integration target, not the prior Work Intake branch;
5. keep one explicit service-level assertion that directly supplying the prior Work Intake branch remains allowed when its current exact commit is intentionally supplied;
6. prove stale target movement between projection and submit still fails through the existing branch service rather than being silently accepted.

Do not create another permanent test file.

### 5. Extend renderer proof

Modify `test/project-intake/post-submit-review-state.test.cjs`:
- supply `suggestedBase` in the projection fixture;
- include a current branch that differs from the suggestion;
- prove rendered initial branch selection follows `suggestedBase`, not `currentBranch`;
- preserve the existing evidence that route selection is not part of Work Intake capture.

## D. Expected Change Boundary

Expected:
- `src/shared/workIntakeContracts.ts`
- `src/main/workIntake/workIntakeService.ts`
- `src/renderer/app/WorkIntakeWorkspace.tsx`
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`
- required Implementer Report

Do not modify:
- `workIntakeBranchService.ts`
- source-control provider mechanics
- route/planning code
- integration code
- Git policy/governance

## E. Architectural Decisions Already Made

1. The main-process Work Intake service owns default-base suggestion.
2. The renderer displays/uses the suggestion; it does not infer branch policy.
3. The suggestion uses current target branch state, not historical base commit.
4. Explicit Operator branch selection remains legal.
5. Branch establishment remains the final exact stale-source authority.
6. Missing recorded target fails closed; no silent fallback.

## F. Test and Validation Contract

Run:
1. `npm run typecheck`
2. `node --test --test-reporter=tap --test-concurrency=1 test/project-intake/project-intake-service.test.cjs`
3. `node --test --test-reporter=tap --test-concurrency=1 test/project-intake/post-submit-review-state.test.cjs`

No new permanent test file.

Do not run full suite, full-supported-platform, packaging, Desktop launch, or performance/soak.

## G. Forbidden Changes

Do not:
- prohibit explicit selection of a Work Intake branch;
- hardcode `dev`, `main`, or any branch name;
- infer target from a branch-name prefix in renderer code;
- reuse stored historical base commit when current target commit is available;
- auto-switch Git branches merely to render the form;
- weaken exact base verification at submit time.

## H. Mismatch Policy

Implementer-local:
- exact helper name for resolving the suggested branch record;
- React state initialization syntax;
- test fixture branch ordering.

Stop with `CARD_REPOSITORY_MISMATCH` if:
- projection cannot identify the current Intake binding from existing service data;
- obtaining the current target commit requires a new source-control capability;
- branch establishment does not reject a moved selected branch/commit;
- fixing the default requires changing Git mutation semantics.

## I. Completion Evidence

Report:
- files changed;
- service suggestion algorithm;
- proof that current Work Intake branch is not the sequential default;
- proof target's current commit is used;
- proof explicit alternate branch selection remains legal;
- proof stale target is rejected;
- exact three validation command results;
- deviations/mismatch.
