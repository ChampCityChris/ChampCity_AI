# TVA10 — Add Bounded Test Execution Capabilities to test_toolbox

**Type:** Work Card  
**Parent initiative:** Test Execution Architecture  
**Objective:** Give Architect/Validator MCP consumers bounded access to ChampCity's existing validation execution infrastructure through `test_toolbox`.

## Confirmed Gap

`test_toolbox` currently exists only as a reserved namespace and reports `implemented: false`. MCP consumers can inspect repository and Git state but cannot execute repository validation, individual tests, named test subsets, or a per-file timing audit.

This blocks independent Architect verification and the required complete test-corpus timing audit.

## Required Changes

Implement these `test_toolbox` actions:

1. **`run_test_file`**
   - Execute one exact catalogued `*.test.cjs` file.
   - Accept only a repository-relative path present in `validation/capability-map.json`.

2. **`run_test_pattern`**
   - Execute one exact catalogued file with one bounded Node test-name pattern.
   - No arbitrary Node arguments or executable selection.

3. **`run_validation_profile`**
   - Execute one registered ValidationProfile through the existing ValidationPlanner/Executor.
   - Accept changed-path/capability scope only where that profile already permits it.

4. **`run_validation_lane`**
   - Execute one registered validation lane through the existing ValidationPlanner/Executor.

5. **`audit_test_corpus`**
   - Execute every catalogued executable test file individually.
   - Return one record per file containing at minimum:
     - test path;
     - lane;
     - capability ownership;
     - observed wall-clock duration;
     - reported test count;
     - pass/fail/incomplete/timeout status;
     - bounded failure reason.
   - Preserve deterministic test-path ordering and provide enough structured timing data for duration ranking.
   - Do not hide a pathological file inside an aggregate timing.

## Execution Boundary

This is **not** a general shell capability.

The toolbox must not accept:

- arbitrary commands;
- arbitrary executables;
- shell text;
- PowerShell/CMD/Bash input;
- arbitrary Node/npm arguments;
- caller-selected working directories;
- caller-supplied environment variables;
- test paths absent from the ValidationCatalog.

Reuse the existing validation catalog, planner, executor, bounded process handling, timeout/process-tree cleanup, source-context checks, and redaction. Do not create a second test-selection system inside MCP.

## Evidence Contract

Each action must return bounded structured evidence appropriate to the request, including:

- workspace/repository identity;
- exact requested file/pattern/lane/profile;
- selected files where applicable;
- source revision/context;
- observed duration;
- result status;
- test counts where available;
- timeout/execution-failure state;
- bounded failure evidence;
- existing ValidationReceipt/telemetry where produced by the shared executor.

Do not return unbounded raw stdout/stderr.

## Primary Surfaces

Inspect and modify only what is necessary, expected to include:

- `src/main/agentHarness/tools/toolRegistry.ts`
- Agent Harness toolbox/provider wiring
- shared toolbox contracts if required
- existing `scripts/validation/*` execution surfaces only where an MCP adapter is needed

The ValidationCatalog, ValidationProfiles, planner, scheduler, and executor remain authoritative.

## Preservation

Preserve:

- workspace binding and repository containment;
- current Git toolbox behavior;
- current validation profile/lane semantics;
- target-owned IntegrationCandidate validation;
- existing timeout and descendant cleanup;
- bounded/redacted evidence;
- fail-closed handling of unknown files, profiles, lanes, and scope.

## Explicitly Out of Scope

Do not:

- redesign the test architecture;
- change test classifications or capability ownership;
- split or optimize slow tests;
- repair current test failures;
- modify existing test behavior;
- change IntegrationCandidate or release semantics;
- introduce unrestricted command execution.

## NO TEST EXECUTION UNDER THIS CARD

The current test suite is still under performance repair.

**Do not execute `npm test`, `test:full`, `node --test`, any validation profile/lane, individual test file, named test pattern, or corpus audit while implementing this Work Card.**

Implementation proof for this card is limited to source inspection, contract/schema inspection, and non-executing static review. The new execution actions will be exercised only after Architect review of this implementation.

## Acceptance Criteria

1. `diagnostics_toolbox.tool_inventory` exposes all five new `test_toolbox` actions.
2. Every action has a bounded fail-closed schema.
3. File execution accepts only catalogued tests.
4. Lane/profile execution delegates to the existing ValidationPlanner/Executor.
5. Corpus audit derives its inventory from the ValidationCatalog and records individual per-file timing/result evidence.
6. No arbitrary shell/command execution is exposed.
7. Execution remains confined to the bound repository.
8. Existing validation-selection logic is reused rather than duplicated.
9. No existing test files, classifications, profiles, or behavior are changed.
10. No tests are executed during implementation of this card.

## Implementer Report

Create:

`docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA10_IMPLEMENTER_REPORT.md`

Report:

- files changed;
- exact actions and request schemas added;
- execution/provider boundaries reused;
- evidence returned by each action;
- confirmation that arbitrary command execution is impossible through this toolbox;
- confirmation that no tests were executed;
- any limitation that would prevent a later complete per-file timing audit.

## Completion

Stop after implementation and report completion for Architect code review.

Do not begin the test-corpus timing audit under this card.
