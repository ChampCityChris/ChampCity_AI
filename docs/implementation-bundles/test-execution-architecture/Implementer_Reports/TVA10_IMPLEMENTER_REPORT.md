# TVA10 Implementer Report

Status: implemented in source on `dev`; ready for Architect code review. No tests were executed.

## Scope and repository verification

- Work Card: TVA10, Add Bounded Test Execution Capabilities to test_toolbox.
- Verified the working directory and Git top level identify the approved `<PROJECT_REPO>` before changes. The Operator directed implementation in this checkout on `dev`.
- This report supersedes the initial deferred inspection. The earlier repository consolidation is recorded separately in `docs/dev/DEV_CONSOLIDATION_REPORT_2026-09-21.md`.
- Implementation started from a clean `dev` at `ff8acce6fcfc6b7077d90f148ce985b66d3f93c3`, tracking `origin/dev` with no locally reported divergence. No fetch was performed during this implementation pass; remote freshness is not independently asserted.
- No branch, worktree, staging, commit, push, or other Git mutation occurred during this implementation pass. No implementation commit exists.

## Files changed

Created:

- `src/main/agentHarness/test/testToolbox.ts`
- `scripts/validation/toolbox-runner.cjs`

Modified:

- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/agentHarness/workspace/workspaceAccess.ts`
- `src/main/agentHarness/runtime/mcpServer.ts`
- `src/main/agentHarness/release/releaseCommandAdapter.ts`
- `scripts/validation/planner.cjs`
- `scripts/validation/executor.cjs`
- `scripts/validation/cli.cjs`
- This report.

Deleted: none. Intentionally unchanged/not created: tests and fixtures, classifications and capability ownership, validation profiles, dependencies, package scripts, generated builds, additional worktrees, IntegrationCandidate policy, and release behavior.

## Actions and request schemas

The existing registry now registers `test_toolbox` as implemented. Its provider feeds MCP tool discovery and `diagnostics_toolbox.tool_inventory`; status reports implementation and execution bounds. JSON Schema, Zod validation, and direct-call parameter validation carry the new string bounds. Execution requires the bound workspace and `files.write` scope. The common envelope uses the existing action/params contract; execution workspaceId is required, nonempty, and at most 160 characters. Unknown actions and parameter fields fail closed.

| Action | Accepted params |
| --- | --- |
| `run_test_file` | Required `testPath`: string, 1-4096 characters; exact repository-relative catalogued executable `.test.cjs` path. |
| `run_test_pattern` | Required `testPath` as above and `testNamePattern`: string, 1-256 characters, nonblank, no control characters, valid regular expression. Only one exact catalogued file. |
| `run_validation_profile` | Required `profile`: registered enum, 1-80 characters. Optional `changedPaths`: array of 0-256 exact relative paths, each 1-4096 characters. Optional `capabilityIds`: array of 0-256 strings, each 1-160 characters. Planner validates scope and ownership. Capability scope requires changed paths. |
| `run_validation_lane` | Required `lane`: registered enum, 1-80 characters. |
| `audit_test_corpus` | No caller selection or execution parameters; omitted or empty params. Inventory comes entirely from the catalog. |

Profiles: `implementation-fast`, `work-item`, `repair`, `integration-gate`, `phase-close`, `release-qualification`, `full-supported-platform`.

Lanes: `static`, `fast`, `affected-capability`, `integration`, `desktop-platform`, `packaging`, `migration`, `performance-soak`, `full-regression`.

The existing CLI execution-scope rules now reside in one shared planner helper used by CLI and MCP. Work-item, repair, integration-gate, and phase-close execution require an explicit changed-path set; release-qualification and full-supported-platform reject narrowing. Existing planner selection and profile configuration remain authoritative.

## Execution boundaries and returned evidence

The workspace provider supplies the repository root. The main-process adapter checks the fixed validation toolkit through existing repository containment policy, selects the existing standalone Node resolver, and launches only the fixed adapter with cleanup preload, a fixed working directory, shell disabled, and bounded JSON on stdin. It strips inherited Node/npm override variables. MCP cancellation reaches the adapter; termination reuses existing process-tree cleanup. Only one toolbox execution per bound repository is admitted at a time.

The child adapter reuses the catalog loader, ValidationPlanner, ValidationExecutor, scheduler, owned build, process timeouts, source-context capture, receipts, and existing redaction. File and lane selections are planner inputs; there is no second selection system. Unknown catalog paths, lanes, profiles, capabilities, and invalid scope are rejected before execution. The executor's optional pattern parameter adds exactly one fixed Node test-name argument for one file; existing callers retain their defaults. Its optional completion callback streams bounded per-file evidence.

Corpus audit derives every file from the catalog and requests concurrency one. The shared scheduler retains cohort policy; each executable file runs individually, with a separate timing/result record. Returned inventories and records retain deterministic test-path order. Shared build work occurs once where required rather than being attributed to an individual test. Source context is checked before planning against execution provenance, in addition to the executor's existing source-stability checks.

Every action returns workspace/repository identity, its exact request, selected file paths, source context, observed adapter duration, overall status, timeout and execution-failure flags, bounded failure evidence, per-file records, and the shared ValidationReceipt when completed. Each file record includes path, lane, capability ownership, observed duration, reported test count, detailed counts, pass/fail/incomplete/timeout status, executor status, exit code, and bounded failure reason. Missing, zero, skipped, cancelled, or unmatched counts cannot silently become a complete pass. Unobserved fields remain null. Cancellation or adapter failure retains completed rows and marks remaining rows incomplete without inventing a receipt.

The toolbox accepts no command, executable, shell text, extra Node/npm arguments, caller cwd, or environment overrides. Arbitrary command execution cannot be requested through this API. Catalogued repository tests and their owned build remain executable repository code; this is not an operating-system sandbox for that code.

## Bounds and audit limitations

- Maximum catalog inventory: 512 files. Source-only JSON inspection observed 143 files and 27 capabilities in the current catalog; no file was executed.
- Metadata bounds: catalog 2,000,000 bytes; profiles and each fixed toolkit module 128,000 bytes; each selected test file 4,000,000 bytes. Inputs must be ordinary contained files.
- Request transport: 1,200,000 bytes. Combined adapter output: 2,000,000 bytes. Failure text: 1,200 characters; receipt string leaves: at most 4,096 characters, using shared redaction. Raw stdout/stderr is not returned unbounded.
- Shared executor timeout: 900,000 ms per step. Adapter watchdog allows build plus first test, then per-file progress, with cleanup allowance and a finite total bound derived from the inventory cap.
- A later complete audit requires compatible standalone Node/npm, successful owned build, required platform/external capabilities, stable source, and a client connection that remains active. There is no durable background job or resume protocol. Unavailable files, timeout, cancellation, or output bounds can yield incomplete evidence rather than a falsely complete audit. Windows process cleanup is reused; no runtime cleanup proof is claimed in this pass.

## Static validation and safety

All following commands used the restricted Windows PowerShell lane. No spawn-EPERM lane fallback was needed.

| Exact command | Exit/result |
| --- | --- |
| `npm run typecheck` | Initial exit 2: three TS18048 errors in the new adapter's optional completed response handling. Corrected the narrowing; subsequent and final execution exited 0. This is `tsc --noEmit`, not test execution. |
| `node --check scripts/validation/toolbox-runner.cjs` | Exit 0; syntax parse only. |
| `node --check scripts/validation/executor.cjs` | Exit 0; syntax parse only. |
| `node --check scripts/validation/planner.cjs` | Exit 0; syntax parse only. |
| `node --check scripts/validation/cli.cjs` | Exit 0; syntax parse only. |
| `git diff --check` | Exit 0. |
| `git diff --name-only -- test validation package.json` | Exit 0; no changes. |

Additional source/schema inspection covered repository boundaries, validation lanes, current catalog/profile data, planner/executor/scheduler/process behavior, MCP registration and cancellation, OAuth scopes, request schemas, and existing capability tests without loading or executing those tests.

Skipped by the card: all tests, `npm test`, `test:full`, `node --test`, individual files, named patterns, profiles, lanes, and corpus audit. Also not performed: build, packaging, launch smoke, runtime adapter invocation, service restart, and live ChatGPT connector discovery. There is no runtime or external-integration pass claim.

A bounded scan of all 10 changed/new artifacts found zero matches for secret-like credential patterns, concrete user-machine paths, or generated/dependency artifact paths. Matching values were not printed. This is a bounded pattern scan, not a claim of exhaustive secret detection. No credentials or secret-bearing configuration were requested or persisted. Durable report paths are repository-relative. Final `git diff --check` exited 0; test, validation configuration, and package inputs remained unchanged.

## Completion and next step

Implementation and source schema are ready for Architect code review. The running Agent Harness and ChatGPT plugin have not been rebuilt or reloaded, so this report does not claim their currently cached/live schema has changed. Loading the updated harness and verifying discovery and bounded execution follow Architect review under the governing authorization. No corpus audit has begun.

No visual acceptance is needed for this source implementation. Residual risk is the deliberately unexercised runtime path, including actual client timeouts, process cleanup, build outcomes, and platform capabilities. Recommended next task: Architect review, followed by authorized runtime discovery and bounded execution validation. Do not interpret the source checks as test or release acceptance.
