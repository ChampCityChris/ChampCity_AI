# WIR23-REPAIR03C-REPAIR02-REPAIR02 — Make Shared Integration Fixtures Authoritative-Runner Safe

**Status:** IMPLEMENTER_READY  
**Type:** Test Harness Repair Work Card — V2 calibration card #1  
**Parent:** WIR23-REPAIR03C-REPAIR02-REPAIR01  
**Supersedes:** prior draft of this same Repair ID  
**Architect standard:** Implementer-Ready Work Card Standard V2  
**Product scope:** Test/support only; no WIR production behavior change

## A. V2 Compilation Gate Receipt

| Gate | Result | Evidence |
| --- | --- | --- |
| Governing invariant defined | PASS | Integration semantic fixtures must behave identically under the repository-owned isolated validation environment and a normal local environment; fixture correctness may not depend on a short system temp path. |
| Ownership/call-path sweep complete | PASS | Inspected test toolbox, toolbox runner, executor temp isolation, shared integration scenario fixture, semantic SourceControl fixture, telemetry fixture, and all four permanent owners that consume integration-scenarios.cjs. |
| State/environment matrix complete | PASS | Direct-temp, authoritative nested-temp, and long-path-safe fixture states are defined below. |
| Historical residue considered | PASS / N/A | All affected repositories/worktrees are disposable test fixtures; there is no persisted product state to migrate. |
| Package closure complete | PASS | This is one shared-fixture repair. All known consumers are included in validation; no downstream production card depends on it. |
| Qualification proof classified | PASS | Authoritative toolbox execution of the four shared-fixture owners is the qualification proof. |
| Permanent regression delta classified | PASS | No new permanent test owner is required; existing owners remain the durable proof. |
| Permanent owner runtime impact checked | PASS | Recovered baselines are roughly 20–38 seconds per owner and below the 60-second ceiling. The repair must not create a new long-running owner. |
| Authoritative validation surface identified | PASS | Repository-owned scripts/validation/toolbox-runner.cjs / ChampCity test_toolbox.run_test_file, not raw node --test. |
| Material unresolved Architect decision | NONE | Shared fixture path/long-path ownership and required validation surface are resolved. |

## B. Objective

Make every permanent integration test that uses test/support/integration-scenarios.cjs pass under ChampCity's authoritative validation runner by making the disposable fixture Git layer independent of runner-provided temporary-directory depth.

Do not change IntegrationCandidate, Integration Repair, validation-policy, source-control, or WIR production semantics.

The card is complete only when the shared fixture owners pass through the repository-owned toolbox execution path.

## C. Governing Invariant

A disposable integration fixture must produce the same semantic repository/candidate state regardless of the valid temporary root supplied by the authoritative validation executor. Fixture behavior must not depend on Windows path depth or on an unconfigured Git long-path mode.

Corollaries:

1. The authoritative executor is allowed to isolate a test by setting TMP, TEMP, and TMPDIR to a per-file directory.
2. A fixture that calls os.tmpdir() must remain valid under that nested root.
3. Every Git invocation owned by the shared fixture must use the same Windows long-path-safe policy.
4. Scenario names are diagnostic labels, not repository identity; they must not unnecessarily lengthen the disposable repository path.
5. The repository runner, scheduler, temp isolation, child cleanup, and production integration code are not to be weakened to accommodate a fragile fixture.

## D. Verified Repository Ownership Map

### Authoritative validation owners — unchanged

#### src/main/agentHarness/test/testToolbox.ts

The MCP/toolbox transport:

- launches the repository-owned toolbox runner;
- sanitizes inherited npm/Node/Electron environment variables;
- binds execution to the selected repository.

This is intentional and must not change.

#### scripts/validation/toolbox-runner.cjs

The repository validation authority:

- loads ValidationCatalog;
- selects the exact test;
- owns production build/typecheck selection;
- schedules through the repository executor;
- emits the authoritative receipt.

This is intentional and must not change.

#### scripts/validation/executor.cjs::runFile()

For every executable test it creates a per-file temporary root under os.tmpdir() and launches the test child with:

- TMP = temporaryRoot
- TEMP = temporaryRoot
- TMPDIR = temporaryRoot

Therefore the test child's os.tmpdir() is intentionally one level deeper than the normal system temp directory.

This is the material environmental difference that the previous direct-run repair did not preserve.

### Shared fixture owner — change required

#### test/support/integration-scenarios.cjs

All affected integration semantic owners call registerIntegrationScenarios(...).

For every scenario it currently creates a disposable repository with a prefix equivalent to:

champcity-integration-{scenario}-

under os.tmpdir().

The resulting path therefore combines:

- authoritative per-file temp root;
- long scenario-specific prefix;
- random mkdtemp suffix;
- Alpha;
- later .git/champcity-integration/<64-hex-candidate-id>/checkout.

The same helper performs fixture-owned Git calls through plain childProcess.execFileSync("git", args, ...) with no core.longpaths=true policy.

The helper's createBoundWorkspace(), configureGitIdentity(), commitAllFixtureState(), and git() functions all participate in that plain-Git seam.

### Existing long-path-safe fixture pattern — reuse

#### test/support/integration-semantics.cjs

Its fixture Git helper already executes Git with:

-c core.longpaths=true

and REPAIR05's Research semantic owner passes through the authoritative runner using this seam.

Use this as the established test-fixture policy. Do not invent a second Windows Git strategy.

### Telemetry owner — no semantic change expected

#### test/support/execution-metrics.cjs

The prior repair correctly made fixture-shell Git observable by avoiding an early destructured execFileSync in integration-scenarios.cjs.

Do not undo that.

### Permanent consumers of integration-scenarios.cjs

The ownership sweep found exactly these current permanent owners:

1. test/agent-harness/integration-candidate-semantics.test.cjs
2. test/agent-harness/integration-policy-semantics.test.cjs
3. test/agent-harness/integration-profile-gate.test.cjs
4. test/agent-harness/integration-repair-source-semantics.test.cjs

All four currently fail under test_toolbox.run_test_file on the same shared fixture boundary:

- candidate semantics: 8 discovered, 4 pass / 4 fail;
- policy semantics: 10 discovered, 3 pass / 7 fail; candidate expected validated, actual failed;
- profile gate: 7 discovered, 1 pass / 6 fail; failures route through the shared scenario helper;
- repair source semantics: 4 discovered, 1 pass / 3 fail; shared candidate state fails before expected repair semantics.

This is not a candidate-only owner problem.

## E. State / Environment Matrix

There is no persistent product state. The relevant state is the test execution environment.

| Execution state | Temp-root behavior | Shared fixture Git behavior | Expected result |
| --- | --- | --- | --- |
| Direct/manual framework run | os.tmpdir() is ordinary system temp | Current plain fixture Git | May pass; diagnostic only |
| Authoritative toolbox run — current | executor creates champcity-validation-file-*; child os.tmpdir() points there; scenario fixture nests again | Current plain fixture Git and long scenario prefix | Invalid fixture state; multiple shared owners fail |
| Authoritative toolbox run — repaired | same nested runner temp isolation | short neutral fixture prefix + repository/command long-path-safe Git | Must pass |
| Any later runner with a different valid temp path depth | runner-owned temp root may vary | fixture path does not encode scenario name and Git long-path policy is explicit | Must remain semantically equivalent |

### Historical residue

N/A.

Each scenario owns a disposable repository removed by its test cleanup. No production migration, compatibility reader, or retained fixture repository is required.

## F. Verified Repository Preconditions

1. integration-scenarios.cjs already uses the module object childProcess for its shared fixture helper functions, so execution-metrics.cjs can observe fixture Git.
2. integration-semantics.cjs already establishes the repository's accepted fixture long-path pattern: Git with -c core.longpaths=true.
3. The authoritative executor's nested temp root is deliberate isolation, not a bug.
4. The four affected owners share integration-scenarios.cjs; no production src/** owner is common to this runner-only discrepancy.
5. The Plan/Research routed integration owners now pass the authoritative runner and must not be pulled into this repair.
6. Candidate records, repair records, validation policy semantics, and source-control product contracts are not to change.

## G. Exact Implementation Delta

Modify:

test/support/integration-scenarios.cjs

### 1. Centralize fixture-owned Git execution

Add one internal helper, for example fixtureGit(root, args, options = {}), that calls childProcess.execFileSync with:

- executable: git
- arguments: ["-c", "core.longpaths=true", ...args]
- cwd: root
- existing per-call options preserved

Adapt option merging to preserve existing:

- encoding;
- stdio;
- input;
- windowsHide

behavior at each call site.

Do not destructure execFileSync into a permanent module-local function reference. Calls must continue through childProcess.execFileSync so measureExecution() instrumentation remains effective.

### 2. Route every shared-fixture Git invocation through the helper

Use fixtureGit() for the Git operations currently owned by:

- createBoundWorkspace();
- configureGitIdentity();
- commitAllFixtureState();
- git().

This automatically covers callers that use git() for:

- branch operations;
- remote setup;
- bare remote creation;
- clone;
- push;
- ref inspection;
- status;
- candidate cleanup assertions.

Do not change non-Git execFileSync(process.execPath, ...) validation checks.

### 3. Configure the disposable repository itself for long paths

Immediately after git init succeeds in createBoundWorkspace(), set repository-local:

core.longpaths=true

through fixtureGit().

Rationale:

- fixture-owned commands are safe through -c core.longpaths=true;
- repository-local configuration also makes any legitimate Git process operating inside that disposable repository inherit the same path policy, including production helpers used by a scenario.

Do not change the user's global Git configuration.

### 4. Remove scenario text from the filesystem prefix

Change the disposable container prefix from the scenario-specific champcity-integration-{scenario}- form to one fixed short neutral prefix such as:

cc-int-

The scenario remains the TAP subtest name and therefore remains visible in failure output.

The random mkdtemp suffix already guarantees filesystem uniqueness.

Do not encode scenario identity elsewhere in product/candidate state merely to replace the removed path label.

### 5. Keep fixture semantics unchanged

Do not change:

- scenario list;
- candidate statuses expected;
- merge behavior;
- repair behavior;
- remote-target behavior;
- validation policy behavior;
- candidate cleanup assertions;
- telemetry ownership;
- production code.

## H. Expected Change Boundary

### Expected modified

- test/support/integration-scenarios.cjs
- Implementer Report for this Repair Card

### Mechanically allowed only if measured metadata actually changes

- validation/capability-map.json duration fields for the four affected owners

If the catalog already remains valid and current measured durations do not require refresh under governance, leave it unchanged.

### Explicitly unchanged

- all src/**;
- src/main/agentHarness/test/testToolbox.ts;
- scripts/validation/toolbox-runner.cjs;
- scripts/validation/executor.cjs;
- scripts/validation/child-cleanup.cjs;
- test/support/integration-semantics.cjs;
- test/support/execution-metrics.cjs unless a compile-only import adjustment is required;
- individual scenario assertions unless a literal path-prefix assertion exists and must mechanically follow the shorter fixture path.

Any production-code change is CARD_REPOSITORY_MISMATCH.

## I. Architectural Decisions Already Made

1. The authoritative executor's isolated TMP/TEMP/TMPDIR behavior is correct and remains.
2. The shared disposable integration fixture owns path-depth portability.
3. Windows long-path behavior is explicit at the fixture Git seam and repository-local disposable config.
4. Scenario identity belongs in TAP/test semantics, not in a long filesystem prefix.
5. The fix applies to the shared fixture once rather than separately patching four consumers.
6. Direct/manual Node success is not acceptance evidence.
7. No product integration behavior is being repaired by this card.

## J. Package / Dependency Context

Standalone harness repair.

Package end-state invariant:

Every permanent owner consuming integration-scenarios.cjs executes the same scenario semantics under the authoritative validation executor without depending on temp-root depth.

No downstream Work Card needs recompilation after this card.

If the shared fixture fix exposes a genuine assertion-level product failure after candidate setup no longer returns generic failed, stop and return CARD_REPOSITORY_MISMATCH rather than modifying product code.

## K. Qualification Proof

No new qualification-only test file is required.

Qualification is the existing permanent owner set executed through the authoritative repository runner.

Required affected owners:

1. test/agent-harness/integration-candidate-semantics.test.cjs
2. test/agent-harness/integration-policy-semantics.test.cjs
3. test/agent-harness/integration-profile-gate.test.cjs
4. test/agent-harness/integration-repair-source-semantics.test.cjs

The candidate owner must be run twice consecutively because it is the owner that triggered this repair chain.

## L. Permanent Regression Delta

No new permanent test is added.

No existing permanent assertion is deleted.

The durable regression architecture remains the four existing owners above.

This card changes the shared fixture so those existing owners can run under the authoritative isolation contract.

## M. Authoritative Validation Contract

### Authority

The repository-owned validation authority is:

scripts/validation/toolbox-runner.cjs + planner/catalog/executor

as exposed through:

test_toolbox.run_test_file

A raw node --test run is diagnostic only.

### Preferred validation

If the Implementer has access to ChampCity test_toolbox, use run_test_file for each exact path.

### Exact local authoritative-runner reproduction

If the MCP toolbox is unavailable to the Implementer, execute the repository-owned toolbox runner, not the raw test process.

For each file, launch from the repository root:

PowerShell:

$request = '{"action":"run_test_file","params":{"testPath":"TEST_PATH"}}'
$request | node --require ./scripts/validation/child-cleanup.cjs ./scripts/validation/toolbox-runner.cjs

Replace TEST_PATH with the exact repository-relative test path.

The toolbox runner itself will:

- load the catalog;
- perform the repository-owned build/static step;
- create the per-file isolated temp root;
- set the child TMP/TEMP/TMPDIR;
- preload child cleanup;
- execute the test;
- emit the authoritative structured receipt.

Do not manually set a short TMP value. That would defeat this repair's acceptance condition.

### Required results

Candidate owner, twice consecutively:

- 8/8 pass;
- zero skipped/cancelled;
- source stable;
- test-process duration <60 seconds.

Policy owner:

- 10/10 pass;
- zero skipped/cancelled;
- test-process duration <60 seconds.

Profile owner:

- 7/7 pass;
- zero skipped/cancelled;
- test-process duration <60 seconds.

Repair-source owner:

- 4/4 pass;
- zero skipped/cancelled;
- test-process duration <60 seconds.

If validation/capability-map.json changes:

- test/validation/capability-map.test.cjs: 5/5 pass through the same authoritative runner.

## N. Forbidden Changes

Do not:

- modify production src/**;
- remove authoritative temp isolation;
- change TMP/TEMP/TMPDIR in the validation executor;
- bypass child-cleanup.cjs;
- shorten candidate IDs or product-owned candidate paths;
- skip or delete failing scenarios;
- split owners merely to avoid the shared-fixture failure;
- weaken candidate/repair/policy assertions;
- set global Git configuration;
- replace fixture Git with shell strings;
- reintroduce an early destructured execFileSync that bypasses telemetry;
- claim success from direct node --test.

## O. Mismatch Policy

### Implementer-local resolution allowed

- helper naming;
- option-object syntax needed to preserve encoding, stdio, input, and windowsHide;
- a literal test-support path-prefix assertion that must follow the new neutral prefix;
- measured catalog duration refresh if required by current governance.

### Stop and report CARD_REPOSITORY_MISMATCH

Stop if, after the exact shared fixture changes above:

- authoritative candidate setup still returns generic failed because of a production src/** behavior;
- an affected owner now fails a substantive candidate/repair/policy assertion rather than fixture Git setup/path handling;
- fixing the failure requires changing test toolbox isolation;
- fixing the failure requires changing production candidate semantics;
- another shared fixture owner outside the four-file ownership sweep consumes createBoundWorkspace() materially.

Report the exact owner, scenario, first meaningful error, and production/support call path.

## P. Completion Evidence

The Implementer Report must include:

1. exact files changed;
2. confirmation that every fixture-owned Git invocation routes through the long-path-safe helper;
3. confirmation that the disposable repository sets local core.longpaths=true;
4. old and new temp-prefix forms;
5. exact authoritative-runner results for all four permanent owners;
6. two consecutive candidate-owner authoritative passes;
7. test-process durations;
8. final boundedGit / fixtureGit / checkouts telemetry for the candidate owner;
9. cleanup evidence:
   - no candidate worktree remains in each disposable fixture;
   - no candidate branch remains;
   - fixture cleanup completes;
10. any catalog duration refresh;
11. deviations;
12. mismatch/blocker, if any.

Direct/manual node --test results, if used for diagnosis, must be labeled diagnostic only.
