# RCO-HF01 Implementer Report

## Scope and checkpoint

- Card: `RCO-HF01`, Blocking Hotfix, `Work_Cards/RCO-HF01_restore_client_agnostic_mcp_git_targeting.md`.
- Approved repository root: verified the shell working directory and `git rev-parse --show-toplevel` both identify `<PROJECT_REPO>`, the approved primary checkout.
- Branch: `dev`; starting HEAD `ff4c4a35a3d8b7196745e98062ad5ed0427b3355`. Local tracking status was 143 commits ahead of `origin/dev`; `origin` is `https://github.com/ChampCityChris/ChampCity_AI.git`. No fetch or remote update was performed, so tracking status is local evidence.
- Implementation and focused validation complete; checkpoint hash pending at report creation. The actual hash is reported after commit, without amending this artifact solely to insert its own hash.
- Checkpoint scope: only the two production files, six existing test files, capability metadata, and this report listed below. Existing Operator-authored card, bundle-index changes, and WRB04 edits/untracked documents remain untouched and unstaged. No push, merge, release action, live MCP restart, or WRB04 implementation.

## Implementation

`gitInspectionAction` and `gitMutationAction` continue using the same central `withRepositoryCheckoutId` helper. Its bounded string selector is now optional. The dispatcher resolves the workspace and validates parameters first; it calls the registered checkout resolver only when the selector is supplied. Otherwise it preserves the workspace context and proceeds through the existing Git capability check and dispatch.

The explicit selection path retains descriptor validation, exact Git-root validation, registered-workspace ownership, and existing failure classes. No arbitrary path targeting, filesystem discovery, or fallback from an invalid explicit selector was added. Read and mutation actions use the same rule.

The contract audit also identified discovery's `requireProjectEntry` restriction on already registered managed workspaces. Discovery now uses exact registered-workspace lookup and returns an empty inventory for a managed workspace with no alternate checkout descriptors. Registration and explicit descriptor resolution retain their existing Project-entry constraints. Managed worktree operation IDs remain bound to the selected Git repository through their existing common-directory checks.

## Root cause and public-surface audit

Local history identifies `cd9383b9dd7949685e6d6fd20f52546695c9c89b` (`WTR02D route MCP Git through RepositoryCheckout targets`, September 24, 2026) as the introducing change. Both `git log -S 'withRepositoryCheckoutId'` and `git log -S 'resolveRepositoryCheckoutContext(args.workspaceId'` point to it. Its parent dispatched ordinary Git directly from the resolved workspace; this change added required selector injection and unconditional checkout resolution. The regression entered in WTR02D, after the RCO03 architecture/card was introduced by `bd771d3e`, rather than in a locally identified RCO03 implementation commit. No RCO03 Implementer Report or commit named RCO03 was found; earlier RCO03 execution is not inferred.

The same WTR02D change replaced the non-Git workspace expectation `GIT_CAPABILITY_UNAVAILABLE` with `INVALID_INPUT`, added an assertion rejecting a Git-backed workspace without a selector, and changed the shared Git fixture to inject `fixture-checkout` into every call. These changes removed the compatibility proof and encoded the regression as intended behavior. Existing MCP contract-generation tests checked session/scoping stability rather than executing old workspace-only Git requests. RCO03 acceptance criterion 5 therefore lacked independent protection.

Published JSON Schema (`buildInputSchema`), SDK Zod input schemas (`buildInputZodSchema`), and runtime parameter validation (`validateParams`) all derive from the same `ToolActionContract.params`. `mcpServer.ts` captures and publishes the JSON definitions and registers the corresponding Zod schemas. The observed old-schema/new-runtime incident is consistent with earlier captured client schemas encountering the changed server contract; this pass did not inspect a live external client's cache. Making the selector additive repairs old request shapes without forcing sessions to reconnect.

The bounded audit covered every public action in `toolRegistry.ts`, `workspaceAccess.ts`, `registeredWorkspaceRegistry.ts`, `mcpServer.ts`, the validation toolbox and release implementation, and managed-worktree repository checks. No other toolbox acquired a required Project/Workflow/WorkIntake/SourceBaseline/SourceBinding/SourceLine/WorkItem field. Repository/file calls retain workspace routing; test/build/validation/release/provider surfaces retain their existing workspace contracts and action-specific inputs. Explicit operation/worktree IDs and controlled-document subject identifiers are unchanged. No Project State, Current Project, Workflow, or source-lifecycle service is queried to choose a generic Git target.

## Files

Modified:

- `src/main/agentHarness/tools/toolRegistry.ts`: optional central selector and conditional target resolution.
- `src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts`: workspace-only discovery for every registered workspace, retaining explicit-checkout restrictions.
- `test/agent-harness/mcp-tool-contract-generation.test.cjs`: one additional synthetic HTTP MCP scenario in the existing contract owner.
- `test/agent-harness/registered-workspace-registry.test.cjs`: restore default workspace and non-Git capability expectations; preserve stale/invalid descriptor checks.
- `test/agent-harness/agent-harness-core.test.cjs`: non-Git mutation fails at capability access.
- `test/agent-harness/agent-harness-runtime.test.cjs`: assert non-Git HTTP failure's exact capability class.
- `test/agent-harness/repository-io-hardening.test.cjs`: workspace-only status remains bounded to the registered root, including nested roots.
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`: optional-selector schema expectations while required operation inputs remain required.
- `validation/capability-map.json`: map the new compatibility behavior to the existing MCP test owner and declare its Git/process resources.

Created: this report. Deleted: none. Intentionally not created: new permanent test files, dependencies, migrations, workflow sidecars, alternate toolboxes, application-state fixtures, or runtime topology changes. Ignored `tmp/rco-hf01-*` files hold caller-scoped validation plans, wrapper, safety scan, and receipts; `dist/` contains normal build output. Neither is committed.

## Permanent proof

The new scenario uses the production registered-workspace registry, HTTP runtime, SDK client, published tools, Zod validation, runtime validation, and real synthetic Git repositories/worktrees. Its helper preserves literal old-client request shapes and never injects a selector.

It proves workspace-only status, branch/history inspection, stage and commit; distinct primary/alternate HEAD and dirty state; explicit alternate stage/commit leaving primary HEAD intact; non-Git inspection and mutation returning `GIT_CAPABILITY_UNAVAILABLE`; discovery and selected Git inspection from a non-Git workspace; unknown, absolute-path, and wrong-workspace selectors failing `WORKSPACE_ACCESS_DENIED`; malformed selector rejection; published JSON matching registry schemas with no required selector on any Git action; repo and diagnostics calls retaining ordinary workspace semantics; no selector-resolution call when omitted; and success without `.champcity`, Current Project, planning, or workflow fixtures. Discovery returns empty before alternate registration and for a registered managed worktree. Managed worktree creation/inspection works from the default workspace, while an operation ID owned by another repository is rejected.

Existing owners additionally cover checkout descriptor drift, stale targets, unregister-without-delete, scope boundaries, file containment, and Git local/remote/tag operations. The new contract assertions and resolver-call assertion would detect either original regression independently; mutation proof prevents an inspection-only repair.

## Validation commands, lanes, and results

1. `npm run validate:plan -- --profile repair --changes tmp/rco-hf01-changes.json` — restricted Windows, exit 0. Preview only; selected 68 files, including historical issue/workflow suites. Per this card's explicit exclusion, that broad profile was not executed. The temporary change set names all hotfix paths and preserved MCP runtime, workspace registry, repository operation, and Git capabilities.
2. `node tmp/rco-hf01-validate.cjs --preview` — restricted Windows, exit 0. Exact 11-file plan from the existing `planValidation({ testPaths })` API; production build, owners, lanes, reasons, resource scheduling, and requirements retained in `tmp/rco-hf01-focused-plan.json`.
3. `node tmp/rco-hf01-validate.cjs` — restricted Windows, exit 1. Build process creation failed once with `spawn EPERM`; all tests blocked, no source failure or pass inferred. Receipt: `tmp/rco-hf01-sandbox-receipt.json`.
4. Same command — normal Windows lane, exit 0. Initial implementation: one production build and 99 tests passed, 76.251 seconds. Receipt retained as `tmp/rco-hf01-initial-pass-receipt.json`.
5. Same exact preview and execution repeated after the bounded managed-workspace discovery correction — preview exit 0; normal Windows execution exit 0, 99 passed, 0 failed/skipped/cancelled, 70.784 seconds. Final receipt: `tmp/rco-hf01-receipt.json`; run ID `c30b9986-e8a3-4d8a-87ff-856ebff364f1`; source remained stable during execution.
6. `git diff --check` — restricted Windows, exit 1 solely for pre-existing trailing spaces in `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/README.md` lines 3–6 and `WRB04_RECOVERY_2026-09-27.md` line 3. Those unrelated changes were preserved. Hotfix-scoped `git diff --check -- src/main/agentHarness/tools/toolRegistry.ts src/main/agentHarness/workspace/registeredWorkspaceRegistry.ts test/agent-harness validation/capability-map.json` and `git diff --cached --check` passed, exit 0, in the restricted Windows lane.
7. `node tmp/rco-hf01-safety.cjs` — normal Windows, exit 0. Exact ten-file staged allowlist, added-content secret patterns, concrete local paths, generated-artifact exclusion, and staged whitespace all passed. The exact staged diff was reviewed. Explicit-path staging succeeded in the normal Windows lane; the required next Git action is `git commit -m "RCO-HF01 restore client-agnostic MCP Git targeting"`.

The wrapper calls the repository's existing `executePlan` with the exact catalog test list; it does not bypass catalog/build checks or alter runner code. Each test uses `node --require scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap <testPath>`. The owned build command was `npm run build` (`tsc && vite build && node scripts/copy-branding-assets.mjs`), exit 0 in 13.175 seconds on the final run. This includes TypeScript validation; no redundant separate typecheck. Vite reported its existing >500 kB chunk advisory.

| Test path under `test/` | Lane | Passed |
| --- | --- | ---: |
| `agent-harness/agent-harness-core.test.cjs` | integration | 14 |
| `agent-harness/agent-harness-runtime.test.cjs` | integration | 19 |
| `agent-harness/git-toolbox-local-operations.test.cjs` | integration | 6 |
| `agent-harness/git-toolbox-remote-operations.test.cjs` | integration | 4 |
| `agent-harness/git-toolbox-tag-operations.test.cjs` | integration | 10 |
| `agent-harness/mcp-tool-contract-generation.test.cjs` | integration | 3 |
| `agent-harness/registered-workspace-registry.test.cjs` | integration | 8 |
| `agent-harness/repository-file-operations.test.cjs` | integration | 17 |
| `agent-harness/repository-io-hardening.test.cjs` | integration | 11 |
| `agent-harness/reserved-toolbox-namespace.test.cjs` | integration | 2 |
| `validation/capability-map.test.cjs` | static | 5 |

The exact-list receipt is not labeled a full repair-profile receipt. Its elapsed time exceeds the ordinary 60-second affected target; the explicit-list receipt is not budgeted. Slowest files were remote Git (35.581 seconds), tags (32.252), and local Git (17.663), running under repository-owned resource scheduling. No proof was dropped. Static/build, capability/direct-service, and synthetic HTTP production-path evidence are distinguished from desktop or deployed-service acceptance.

## Safety and remaining work

All source changes stay inside `<PROJECT_REPO>`; test mutations stay inside newly created synthetic temporary workspaces. Production containment and exact-checkout validators remain enforced. The staged safety scan and manual diff review found no secrets, credentials, environment contents, concrete machine paths, generated artifacts, or unsupported external integration claims in the authored changes. Only the ten attributable files are staged for the checkpoint.

No historical workflow aggregate, desktop visual acceptance, packaging/release qualification, live external provider call, or deployed MCP refresh was run. These are outside this hotfix's focused implementation proof. Local remote-operation tests use synthetic remotes and do not establish external integration evidence.

After the checkpoint, **STOP for Architect review**, as directed by the active card. No implementation blocker remains in the focused proof. Architect acceptance and a normal live MCP refresh/restart followed by workspace-only and explicit-checkout verification from an external client remain outstanding. WRB04 remains blocked until those requirements are met; the next task is that review/deployment verification, not WRB04 implementation.
