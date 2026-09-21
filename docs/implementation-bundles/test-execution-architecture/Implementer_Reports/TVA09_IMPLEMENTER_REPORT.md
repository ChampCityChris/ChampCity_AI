# TVA09 Implementer Report

## Scope, source and authority

Work Card TVA09, order 10 of 10. Approved repository root verified through Git and current contracts before changes. The task ran in the isolated codex/test-execution-architecture worktree created from dev 05eef38ac77a384a6023fa02be32f67346b43e07. Cards were loaded and completed sequentially, including TVA02A before TVA02; reports TVA01 through TVA08 already record their individual passes.

Operator explicitly directed the worktree and final merge into dev. That direction overrides this card's no-integration completion footer. No push, tag, release, fetch, reset, clean or stash was requested or performed. No stage/commit/merge yet at this report's initial creation; bundle commit hash pending. origin/dev was 45 commits behind at initialization, without a fetch. During the task dev advanced to 1705f3605e448d0f557f1f077b5135a4a4632585 with HOTFIX21; final integration must preserve that work and verify its overlap.

## Implementation and file disposition

Created scripts/validation/telemetry.cjs and this report. Extended executor.cjs, profile-runner.cjs and process.cjs; integrationValidationProfileRunner.ts and shared integrationCandidateContracts.ts; validation-runner.test.cjs, integration-profile-gate.test.cjs and integration-scenarios.cjs; capability-map.json; current-execution-context.test.cjs; completed-routed-plan.cjs and the new routed-completed fixture. Updated test-execution architecture, corpus index, validation governance, development guide and validation command lanes. These extend files established by prior TVA cards; no dependencies, integrations, migrations, JSON workflow sidecars, new permanent test files or production feature changes were added in TVA09.

Receipts now include exact Git revision plus bounded changed-file status/content digest, before/after source stability, profile, selected files with reasons, capabilities and lanes, one build identity/duration, cohorts/concurrency, per-file execution/wait durations and TAP counts, aggregate counts, five slowest files, and bounded failure detail. Candidate execution combines immutable application context with actual checkout provenance. Changed source fails a receipt. Skips, unavailable proof and unknown counts cannot produce passed receipts. Failure output redacts root/home/temp paths, including JSON-escaped Windows paths. Timeout fallback remains bounded when tree termination fails.

Budget outcomes preserve every selected test: static 30000 ms; fast target 30000 and temporary ceiling 60000; affected 60000; integration target 180000 and review threshold 300000. A miss is reported independently of assertion success. Per-lane file times are process-time sums, not parallel wall time. Ordering and field shape are deterministic; timings and run IDs are actual observations.

A real Git fixture exercises changed paths through planning, one actual npm build, scheduled proof and receipt. Real IntegrationCandidate success and failure scenarios execute the target-pinned profile toolkit, preserve policy authority and immutable revisions through repair, exclude unrelated Desktop/packaging/performance proof, and permit target advancement only after passing selected proof. Target eligibility and actual fixture target advancement are asserted; these are synthetic local repositories, not external integration claims.

Catalog measurements refreshed for 56 successfully measured files across these runs. The renderer gate exposed a pre-existing stale test expectation: a Work Card remains selected until Close / Next is consumed. The test now proves selection before that operation and all-complete after it; the production selector was unchanged. The new completed-Plan fixture was flattened to short storage filenames because Git on Windows warned about its original deep untracked paths. All thirteen Markdown documents were verified byte-for-byte; boundary.cjs maps each to its original canonical hydrated path. An initial move stopped at repeated basenames; explicit unique mappings repaired it before validation. Production routed query then returned ready and the exact checkpoint commit. No document was removed from the fixture.

## Before and after

| Area | Prior architecture | Implemented architecture |
| --- | --- | --- |
| Routine developer/integration | Monolithic serial aggregate; historical recorded run about 26 minutes | Explicit catalog-backed profiles with affected ownership and one build |
| Mixed proof | Functional, soak and platform contracts interleaved | Eight explicit execution lanes with conservative scheduling and bounded safe concurrency |
| Routed setup/projection | Repeated whole lifecycle and repeated planning acquisition | Curated completed boundary, focused semantics and one context per stable projection |
| Integration authority | Full-regression npm command | Target-commit-owned toolkit, policy and build scripts; exact candidate diff |
| Evidence | Aggregate pass/time | Source-bound selection, counts, timing, budgets, failures and explicit incomplete proof |

Historical aggregate timings are not a claim that full regression now passes faster. The focused measured profiles below establish routine-work improvement; full qualification was prohibited in this bundle.

## Measured supported-workstation evidence

All execution below used the normal Windows lane with existing local dependencies, Node v24.18.1. No install or provider authentication was needed. Each composed run owned exactly one build and exited zero when passed; no skipped/cancelled/unavailable/unknown counts in these successful runs.

| Profile/run | Files | Passed/tests | Total ms | Build ms | Budget |
| --- | ---: | ---: | ---: | ---: | --- |
| developer | 12 | 88/88 | 15460 | 10486 | within-target |
| affected | 9 | 53/53 | 13030 | 10772 | within-target |
| renderer-final | 26 | 165/165 | 23818 | 10649 | within-target |
| mcp | 19 | 145/145 | 44592 | 10426 | within-target |
| representative-lanes | 8 | 34/34 | 25802 | 10576 | not-budgeted |

Changed-path inputs: affected = src/shared/developmentEnvironment/developmentEnvironmentContract.ts; renderer = src/renderer/app/WorkflowHubWorkspace.tsx; HOTFIX20-shaped MCP = src/main/agentHarness/runtime/httpRuntime.ts. The initial renderer run failed 1 of 165 tests in 23670 ms due to the stale Close / Next assertion above. The named correction passed 1/1 in 688.14 ms; the repeated entire selected renderer profile passed 165/165 in 23818 ms. An attempted command used a nonexistent renderer/components path and failed planning before any build, correctly demonstrating no broad fallback; it was rerun with the checked-in renderer-change fixture.

The final renderer provenance is revision 05eef38ac77a384a6023fa02be32f67346b43e07, dirty changed-file count 126, SHA-256 0b2f4d229f1bb94b59eca46807d8e9d533a017e03630aa8a461452565f2409f7, sourceStable=true. Prior receipts predate the short-name correction; Git's long-path warning made their untracked-file provenance incomplete. Their observed test/timing results remain recorded, but only the final corrected receipt is cited as complete source-stability evidence. Provenance now uses per-command core.longpaths=true, without changing repository configuration.

### Exact HOTFIX20-shaped plan

- test/agent-harness/agent-harness-build-identity.test.cjs
- test/agent-harness/agent-harness-core.test.cjs
- test/agent-harness/agent-harness-process-contract.test.cjs
- test/agent-harness/agent-harness-runtime.test.cjs
- test/agent-harness/agent-harness-service-host-lifecycle.test.cjs
- test/agent-harness/agent-harness-service-host-protocol-compatibility.test.cjs
- test/agent-harness/mcp-operational-diagnostics.test.cjs
- test/agent-harness/mcp-session-lifecycle.test.cjs
- test/agent-harness/mcp-tool-contract-generation.test.cjs
- test/agent-harness/oauth-offline-access.test.cjs
- test/agent-harness/registered-workspace-registry.test.cjs
- test/agent-harness/repository-enumeration-semantics.test.cjs
- test/agent-harness/repository-file-operations.test.cjs
- test/agent-harness/repository-io-hardening.test.cjs
- test/agent-harness/reserved-toolbox-namespace.test.cjs
- test/agent-harness/sibling-process-launch.test.cjs
- test/characterization/desktop-project-repository-binding.test.cjs
- test/renderer/agent-harness-settings-workspace.test.cjs
- test/validation/capability-map.test.cjs

19 selected files, 145 passing tests, 44592 ms total including 10426 ms build. Selected lanes: integration 16, affected-capability 2, static 1. No Desktop/performance/packaging lane. Slowest measured files: mcp-operational-diagnostics 6605 ms, mcp-session-lifecycle 6489 ms, agent-harness-runtime 5456 ms, repository-io-hardening 3454 ms, oauth-offline-access 2035 ms. Core, session, process and functional lifecycle proof are retained.

### Representative lane execution and complete plan

One explicit eight-file plan ran 34 passing tests in 25802 ms including one 10576 ms build, five cohorts and concurrency two. These measurements prove dispatch and receipts, not whole-lane qualification.

| Lane | Executed file | File process ms |
| --- | --- | ---: |
| integration | test/agent-harness/agent-harness-process-contract.test.cjs | 332 |
| desktop-platform | test/agent-harness/background-agent-tray-presentation.test.cjs | 151 |
| fast | test/lifecycle/nested-lifecycle.test.cjs | 145 |
| migration | test/migration/paired-artifacts-to-canonical-markdown-v1.test.cjs | 184 |
| packaging | test/packaging/windows-installer-scope.test.cjs | 142 |
| performance-soak | test/performance/disposition-transaction-collapse.test.cjs | 13253 |
| affected-capability | test/renderer/workflow-hub-shell.test.cjs | 686 |
| static | test/validation/capability-map.test.cjs | 188 |

Full-supported-platform preview contains 143 distinct executable files: integration 81, desktop-platform 10, static 5, affected-capability 34, fast 7, migration 1, packaging 2, performance-soak 3. Every executable is catalogued and reachable. Projected summed file cost is 1500707 ms plus build/probes; this is an estimate mixing catalog measurements and estimates, not elapsed execution or qualification. No test:full or legacy aggregate was run.

## Commands and results

- npm run build: normal Windows, exit 0; TypeScript, Vite and asset output complete.
- node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/validation/validation-runner.test.cjs test/agent-harness/integration-profile-gate.test.cjs: normal Windows, initial 17/17 in 27235.35 ms; final expanded suite exit 0, 20/20 in 48424.80 ms. Includes budget boundaries, source-change failure, unchanged proof selection on misses, skip incompleteness, build ownership, failure/timeout cleanup, unknown-source rejection, target authority and candidate success/failure.
- IntegrationCandidate focused acceptance subset: normal Windows exit 0, 3/3 including subtests in 20512.27 ms; success 12100.57 ms and required-check failure 8306.67 ms. Final three-file run above reran these scenarios.
- Profile measurements use the same exported planner/executor as the CLI, with exact scope objects below. They await executePlan, write only ignored tmp receipts, print compact status and set nonzero exit for nonpassed status. Equivalent public commands are npm test, npm run test:affected -- --changes <scope-file>, and npm run test:integration -- --changes <scope-file>. No wider public command was substituted.

```javascript
const { planValidation } = require('./scripts/validation/planner.cjs');
const { executePlan } = require('./scripts/validation/executor.cjs');
// Each object below was a separate awaited measured run:
{ profile: 'implementation-fast' }
{ profile: 'work-item', changedPaths: ['src/shared/developmentEnvironment/developmentEnvironmentContract.ts'] }
{ profile: 'integration-gate', changedPaths: ['src/renderer/app/WorkflowHubWorkspace.tsx'] }
{ profile: 'integration-gate', changedPaths: ['src/main/agentHarness/runtime/httpRuntime.ts'] }
// Representative run: { testPaths: [the eight exact files in the lane table] }.
// Execution for each: const plan = planValidation(scope); const receipt = await executePlan(plan);
```

- planValidation previews for renderer/MCP/policy/full: exit 0, respectively 26/19/18/143 files. Policy scope is src/main/planExecution/integrationPolicyProvider.ts. Unknown paths throw classification guidance. Full is preview-only.
- Completed-boundary smoke invoked seedCompletedRoutedPlan, production createRoutedIntegrationService(...).query(), strict assertions of status ready and exact checkpointCommits, then owned fixture cleanup: normal Windows exit 0 after flattening. Initial partial-layout smoke failed and was superseded by this complete-layout result.
- git diff --check: exit 0 after correcting one documentation trailing space.
- Bounded safety inventory initially attempted Git spawn under restricted execution and produced spawn EPERM once; rerun in normal Windows succeeded. This is a lane restriction, not a source pass/failure. First scan only matched prose describing home/temp redaction, not a concrete local path. Final staged scan remains required before commit.

Receipts and scratch harnesses live in ignored tmp, never committed generated artifacts. This report summarizes their observed values. All test additions extend existing catalogued files; behavior IDs and exact proof locators remain checked. No test-count target or proof deletion was used to meet a budget.

## Remaining limits and next work

The policy/source-control affected preview selects 18 files with estimated summed cost 484572 ms, above the review threshold. Its largest contributor remains the unsplit remainder of git-mutation-boundary.test.cjs. The card expressly prohibits running that entire pathological file. Focused policy, npm, candidate, repair and target-authority proofs passed in earlier cards and TVA09, but a broad source-control timing pass is not claimed. Concrete follow-up: decompose that remaining file/ownership with retained safety proof, then measure the complete policy profile. No proof was skipped by the planner to manufacture a budget pass.

Whole-repository supported-platform/release qualification, actual installer mutation, real provider authentication and visual/experiential Operator acceptance remain unperformed under the quarantine. Architecture implementation is complete; post-bundle qualification and review of the documented broader-policy performance debt remain recommended. No new scheduling flakiness observed in repeated focused proof; this does not prove all corpus schedules.

Final Operator-directed Git integration and staged security/local-path/generated-artifact results will be added after their actual observation. No same-commit hash amendment will be used.

## Precommit review

Exact staged diff, production changes, command dispatch, fixture inventory and catalog ownership reviewed. Bounded normal-Windows staged scan inspected 127 files / 2200343 bytes and found no credential-token/private-key signatures, concrete machine-home paths, sensitive filenames or generated artifacts. The sole staged whitespace issue was an extra blank line at the new lifecycle fixture test EOF; corrected without changing behavior. git diff --cached --check then passed. Final catalog check after the 56-file timing refresh: node --test --test-concurrency=1 test/validation/capability-map.test.cjs, normal Windows, exit 0, 5/5 in 105.57 ms. The copied manifest/card quarantine amendments are original Operator-supplied task instructions, not new scope added by implementation. No generated output or local dependency junction is staged.

## Integration with current dev

Bundle implementation commit: 2c081e9de9fb9836cbbc4ae1e63298c5765538d1. The requested integration incorporates dev 1705f3605e448d0f557f1f077b5135a4a4632585, preserving the separately delivered HOTFIX21 packet. git merge --no-ff --no-commit dev in the task worktree combined source without conflicts. The imported capability entries needed deterministic sorting: the first merged catalog check failed 2/5 on ordering, then both new behaviors/proof locators were sorted and retained. No HOTFIX21 production behavior was removed. A Git blob comparison confirmed all 18 nonoverlapping HOTFIX21 files equal dev; the three overlaps were inspected: integrationGit adds only TVA's exact changed-path reader to dev's shared primitives, the Git test retains both HOTFIX21 cases while extracting the original integration cases, and the catalog retains both sets of ownership.

Focused combined validation, normal Windows lane:

- npm run build: exit 0, current combined TypeScript/Vite/assets.
- node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/validation/validation-runner.test.cjs test/agent-harness/integration-profile-gate.test.cjs test/agent-harness/agent-harness-core.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs: exit 0, 36/36, 49414.0031 ms; zero skipped/cancelled.
- node --test --test-concurrency=1 --test-name-pattern='independent branch refs preserve dirty checkout' test/agent-harness/git-mutation-boundary.test.cjs: exit 0, 1/1, 10345.6319 ms. Only this named case ran; no whole pathological file.
- node --test --test-concurrency=1 tmp/tva-merge-production.test.cjs: exit 0, 2/2 including its unchanged subcase, 24389.3303 ms. The ignored driver calls registerIntegrationScenarios('merged production candidate advancement', ['unchanged']) without a semantic SourceControl replacement. Real production candidate inspection and shared ref advancement passed; 354 bounded Git calls and one candidate checkout.
- executePlan(planValidation({profile:'integration-gate',changedPaths:['src/main/agentHarness/runtime/httpRuntime.ts']})): exit 0, unchanged 19-file plan, 145/145, total 45066 ms including one 10575 ms build; within 180000 ms target. No skips, cancellation, unavailability or failure evidence. Provenance: revision 2c081e9de9fb9836cbbc4ae1e63298c5765538d1 with 21 staged merge files; SHA-256 a281d055fb7140680eafdd55bdf7f0ead6c841a440a851cc6abd936139bc3fc0; sourceStable=true. This supersedes the pre-long-path-fix MCP receipt for combined-source stability evidence.
- Full-supported-platform preview: exit 0, still all 143 executable files across eight lanes; execution deferred.
- Exact staged merge diff reviewed. git diff --cached --check passed. Bounded staged scan before this addendum inspected 21 files / 1187748 bytes with no secret, local-path or generated-artifact findings; the complete staged merge including this addendum is scanned again before commit.

At final premerge inspection, dev and locally recorded origin/dev both pointed to 1705f36 (0 ahead/0 behind); another task updated that remote-tracking state, and this task did not fetch or push. The dev checkout was clean. The merge commit hash is pending this commit; it will be reported in the final handoff rather than amended into its own artifact. Final authorized step: fast-forward the clean dev checkout to this tested merge commit. No release/tag/push or full qualification is implied. All ten card implementations and reports are complete; residual qualification and broader source-control performance debt above remain explicit.
