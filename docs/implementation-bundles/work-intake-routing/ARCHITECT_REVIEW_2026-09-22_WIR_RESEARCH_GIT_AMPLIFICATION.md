# WIR Research Integration / Git Amplification — Architect Review

**Review date:** 2026-09-22  
**Reviewed:** WIR23-REPAIR03C-REPAIR02 and WIR23-REPAIR03C-REPAIR03

## Review Result

### WIR23-REPAIR03C-REPAIR02

The production repair is conforming.

`routedIntegrationService.ts` now correctly separates logical completion identity from exact completion state and classifies retained candidates as active or terminal.

Current selection order is:

1. newest active retained candidate for the logical completion;
2. otherwise newest terminal record that exactly matches the current completion;
3. otherwise no current candidate.

Active statuses are:
- constructing;
- conflicted;
- validation-failed;
- validated;
- failed;
- operator-decision.

Terminal statuses are:
- aborted;
- integrated.

This closes the candidate-shadowing defect identified in AR-WIR-R3. Newer terminal history cannot hide an older active candidate, stale terminal history does not block changed completion evidence, exact integrated evidence remains integration-complete, and exact aborted evidence retains the existing no-recreate rule.

No additional production defect was found in REPAIR02.

### WIR23-REPAIR03C-REPAIR03

The ownership split is directionally correct but the card correctly reports itself incomplete.

Plan integration has returned to a bounded owner:

- `routed-integration-focus.test.cjs`
- Implementer: 15.312 seconds
- Architect independent run: 14.396 seconds for the test process, 3/3 passed

Research integration was separated into:

- `routed-research-integration-focus.test.cjs`
- one accepted-Research fixture;
- one ordered Research candidate/integration scenario.

That is the correct ownership boundary.

However the new Research owner still measured:

- 560.985 seconds;
- 9,766 `runBoundedGit()` calls;
- 4 IntegrationCandidate checkouts.

The <180-second hard ceiling therefore failed.

## What “9,766 bounded Git operations” means

It does **not** mean ChampCity has 9,766 Git tools.

A “bounded Git operation” in the report is one invocation of:

`runBoundedGit({ cwd, args, ... })`

That wrapper starts one bounded `git.exe` subprocess with validated arguments, output limits, timeout handling and sanitized failure behavior.

The 9,766 count is therefore approximately 9,766 Git CLI process invocations during the full Research characterization.

They are repetitions of a much smaller vocabulary such as:

- `rev-parse`;
- `symbolic-ref`;
- `for-each-ref`;
- `status`;
- `log`;
- `show`;
- `merge-base`;
- `worktree list/add/remove`;
- `merge`;
- `update-ref`.

This count is unrelated to the number of MCP Git tools exposed to a model.

## Why the production path amplifies Git calls

The primary amplification exists in the application source-control layer.

`createSourceControlService().run()` currently wraps every logical source-control operation with:

1. `verifyRepository()`;
2. a before-position receipt;
3. the requested operation;
4. an after-position receipt.

`verifyRepository()` itself invokes Git to:
- verify that the root is a Git worktree;
- resolve the top-level repository.

Each receipt position currently calls the full `inspectGitBranchState()`, even though `SourceControlPosition` stores only:

- branch;
- commit.

A normal no-upstream branch inspection performs multiple Git subprocesses:
- current symbolic branch;
- full local branch enumeration;
- upstream lookup;
- HEAD resolution;
- remote enumeration.

Therefore even a logically simple SourceControlService operation can invoke roughly a dozen bounded Git subprocesses before its own underlying Git implementation is counted.

The integration path then performs its own exact safety checks inside `integrationGit.ts`, including worktree ownership, checkout identity, merge-base/ancestry, clean/conflict state and target-ref verification.

Research adds another amplification seam:

`resolveResearchCompletion()`
→ Work Intake branch verification
→ checkpoint lineage verification

and:

`researchCheckpoints()`
→ Work Intake branch verification again
→ history scan
→ commit-message receipt parsing.

As lifecycle checkpoints accumulate, repeated queries repeatedly verify and reread the same bounded checkpoint chain.

The 9,766 result is therefore best understood as:

**a modest number of integration state transitions multiplied by repeated repository/receipt/lineage verification at several nested layers.**

It is not a legitimate requirement of the Research route.

## Why Git is involved in Research integration at all

Research itself does not require Git mechanics.

The `research-prototype` route can terminate with an approved no-implementation Research Assessment.

The Git boundary begins only because ChampCity then supports **Integration Complete**: the completed Work Intake branch is integrated into its configured target branch.

At that point Research uses the same generic IntegrationCandidate mechanism as a completed Plan:

Research completion
→ lifecycle checkpoint
→ candidate checkout
→ merge
→ required validation
→ target advancement.

So Git belongs to **shared integration**, not to the semantics of Research.

The current test title describes the route that reaches integration, but most of the expensive work underneath it is generic IntegrationCandidate/source-control behavior.

## Permanent test ownership decision

The 560-second full production-Git Research scenario should **not** remain a normal permanent regression owner.

The Research-specific permanent proof needs to retain:

- approved no-Plan Research resolves as generic completion evidence;
- no Plan/Work Item/Phase is manufactured;
- accepted Research is checkpointed before candidate construction;
- changed Research completion observes retained-candidate state correctly;
- abort/retry semantics are wired correctly;
- successful shared integration projects `integration-complete`.

It does **not** need to independently re-prove thousands of low-level Git safety checks already owned by:

- the Plan routed-integration sentinel;
- IntegrationCandidate semantic owners;
- SourceControlService boundary tests;
- integration Git / repair conformance tests.

The Research regression owner should use the same semantic SourceControl fixture strategy already used by the recovered Plan integration sentinel.

A separate source-control performance/conformance owner should measure the real production source-control stack.

## Telemetry caveat

The report's `fixtureGit: 0` value must not be interpreted as proof that the fixture performed zero direct Git commands.

`execution-metrics.cjs` replaces `child_process.execFileSync` at runtime.

But `work-intake-fixtures.cjs` captures `execFileSync` through destructuring at module load, and `research-integration-scenarios.cjs` imports that fixture before `measureExecution()` installs its mock.

Those already-captured direct fixture calls are therefore not necessarily observed by the later telemetry hook.

This does not invalidate the 9,766 `runBoundedGit` count. It means only that the separate `fixtureGit: 0` counter is incomplete.

## Independent verification finding: candidate owner is not authoritative-runner clean

The Implementer Report states:

`integration-candidate-semantics.test.cjs`: 8/8 passed

using a direct:

`node --test ...`

run.

Architect review ran the same permanent owner through ChampCity's authoritative validation executor, which adds:

`--require scripts/validation/child-cleanup.cjs`

Result, twice:

- 8 tests discovered;
- 4 passed;
- 4 failed;
- outer scenario reports 3 failed subtests;
- production build passed;
- source context remained stable.

The file's individual direct semantics are not yet classified as broken; this is an execution-mode/isolation discrepancy between the direct Implementer command and the repository's authoritative runner.

Until resolved, REPAIR02's production code review is clean, but the overall WIR package is not ready for final closure.

## Required follow-up

Three separate concerns must remain separate:

1. **Production source-control amplification**
   - reduce redundant receipt/repository/checkpoint Git subprocesses without weakening safety.

2. **Research regression ownership**
   - replace the 560-second full source-control replay with bounded Research-specific semantic proof.

3. **Candidate semantic owner / authoritative runner**
   - repair the 4/8 failure under the actual catalog execution contract.

Do not add more behavior to `routed-research-integration-focus.test.cjs` while these are unresolved.
