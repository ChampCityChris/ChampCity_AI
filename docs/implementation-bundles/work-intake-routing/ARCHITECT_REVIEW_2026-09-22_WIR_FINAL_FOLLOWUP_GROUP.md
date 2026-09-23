# WIR Final Follow-up Group — Architect Review

**Review date:** 2026-09-22  
**Reviewed:** WIR23-REPAIR03C-REPAIR02-REPAIR01, WIR23-REPAIR03C-REPAIR04, WIR23-REPAIR03C-REPAIR05

## Overall Result

Two repairs are conforming:

- WIR23-REPAIR03C-REPAIR04 — production source-control Git amplification reduction;
- WIR23-REPAIR03C-REPAIR05 — distilled Research integration semantic regression owner.

One repair is not closed:

- WIR23-REPAIR03C-REPAIR02-REPAIR01 — candidate semantic owner still fails under ChampCity's actual authoritative validation executor.

No new WIR production-state defect was identified in the reviewed group.

## REPAIR04 — Source-control amplification

### Result: conforming

The implementation makes the intended architectural changes without weakening integration safety.

Verified source changes:

- `inspectGitPosition()` returns only branch + exact HEAD for receipt positions;
- SourceControlService receipts no longer invoke full branch inventory for before/after positions;
- exact repository-root verification is cached only within one SourceControlService instance after successful verification;
- failures clear that instance cache;
- `history-with-messages` provides a bounded one-read checkpoint history/message observation;
- Work Intake branch checkpoint validation consumes the batched history;
- routed Plan/Research checkpoint scans consume the batched history;
- Research checkpoint scan reuses the binding already verified by `resolveResearchCompletion()` during the same query;
- lower-level candidate worktree, exact ref, merge, ancestry and target-advance checks remain intact.

Independent authoritative results:

- `source-control-service-boundary.test.cjs`: 1/1 passed; 8.708 s test process.
- `source-checkpoint-boundary.test.cjs`: 2/2 passed; 44.097 s.
- `work-intake-branch-boundary.test.cjs`: 1/1 passed; 12.494 s.
- `routed-integration-focus.test.cjs`: 3/3 passed; 11.898 s.

The focused operation-count assertions also remain present:
- first same-instance status operation: 6 bounded Git calls;
- later same-instance status operation: 5 bounded Git calls;
- explicit branch inventory remains independently available.

No additional repair is required for REPAIR04.

## REPAIR05 — Research integration regression distillation

### Result: conforming

The permanent Research integration owner now uses the semantic SourceControl fixture rather than replaying the full production source-control receipt stack.

It retains the Research-specific behavior that matters:

- no-Plan Research resolves as Research completion;
- pre-integration query is read-only;
- stale completion fingerprint is rejected before checkpoint/candidate creation;
- Research checkpoint precedes candidate creation;
- no Plan/Work Item/Phase/routed-development binding is fabricated;
- changed completion observes active retained candidate state;
- newer terminal history does not hide active state;
- abort restores eligibility;
- successful shared integration reaches integration-complete;
- stale aborted/integrated history does not block later changed Research completion.

Independent authoritative results:

- `routed-research-integration-focus.test.cjs`: 1/1 passed; 5.919 s test process.
- `routed-integration-focus.test.cjs`: 3/3 passed; 11.898 s.
- `project-planning-service.test.cjs`: 28/28 passed; 35.747 s.
- `capability-map.test.cjs`: 5/5 passed; 0.157 s.

The old 560.985-second Research owner is no longer the routine regression architecture. This resolves the test-suite concern that triggered REPAIR05.

No additional repair is required for REPAIR05.

## REPAIR02-REPAIR01 — Candidate semantic authoritative runner

### Result: not closed

The Implementer Report states that the candidate owner passed repeatedly with a manually launched runner-equivalent command.

Architect review used ChampCity's actual `test_toolbox.run_test_file`, whose implementation:

- starts `scripts/validation/toolbox-runner.cjs`;
- preloads `child-cleanup.cjs` by absolute path;
- sanitizes npm/Node/Electron-related environment variables;
- plans through the ValidationCatalog;
- performs the repository-owned production build;
- executes the selected test through the validation executor.

Current authoritative result:

`test/agent-harness/integration-candidate-semantics.test.cjs`

- production build: passed;
- 8 tests discovered;
- 4 passed;
- 4 failed;
- outer owner reports 3 failed nested scenarios;
- source context stable;
- observed telemetry: 12 bounded production Git calls, 281 fixture Git calls, 7 candidate checkouts.

This reproduces the same 4/8 failure seen before REPAIR02-REPAIR01.

The telemetry lifetime issue identified by the Implementer was real and is improved: fixture Git is now visible. But that was not the root cause of the authoritative-runner failure.

The direct/manual invocation is therefore not equivalent enough to the actual validation executor to close this repair.

## Why the Implementer's manual command was insufficient

ChampCity's authoritative path is not simply:

`node --require child-cleanup --test ...`

It launches:

`toolbox-runner.cjs`

under a sanitized environment. The toolbox runner then performs:

- catalog selection;
- production build;
- scheduler/executor planning;
- child-cleanup preload;
- final test process execution.

The harness explicitly removes inherited variables matching:
- `npm_*`;
- `NODE_OPTIONS`;
- `NODE_PATH`;
- `NODE_TEST_CONTEXT`;
- `ELECTRON_RUN_AS_NODE`.

A direct shell command that passes does not establish that this full execution contract passes.

## Remaining Repair

`WIR23-REPAIR03C-REPAIR02-REPAIR02_restore_candidate_owner_through_actual_toolbox_runner.md`

This is a test-harness repair only unless the exact authoritative failure proves a production defect.

## WIR closure status

The WIR product architecture reviewed in the current repair sequence is conforming.

Final WIR closure is blocked only on the permanent IntegrationCandidate owner's authoritative execution contract. Once that owner passes through the real test toolbox twice consecutively, no further WIR product repair is currently identified.
