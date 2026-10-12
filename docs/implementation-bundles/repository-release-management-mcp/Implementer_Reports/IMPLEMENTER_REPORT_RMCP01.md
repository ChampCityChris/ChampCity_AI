# RMCP01 Implementer Report

Date: 2026-10-12

## Authority and repository verification

- Work Card: RMCP01, first of the repository/release MCP bundle.
- The Operator's execution request authorizes this implementation. The subsequent clarification authorizes general LLM-managed local access setup; see `../OPERATOR_SCOPE_AMENDMENT.md`.
- Verified the approved primary development checkout as `<PROJECT_REPO>` using its Git identity and applicable `AGENTS.md`. Development remains directly on `dev`.
- Starting HEAD: `aff58d3d`. `origin` is configured for the existing ChampCity source repository. No dev upstream is configured; no remote synchronization was performed.
- Unrelated untracked planning/bundle documents were preserved.

## Implementation

- Extracted a callback-based RepositoryTarget resolver shared by registered and local dispatch. It retains registered checkout leases and local Git hardening through each operation; repository paths remain internal.
- Added exact sanitized remote inspection with fetch/push consistency, mirror state, tracking evidence and a binding digest. Credential-bearing network URLs are rejected.
- Added bounded branch/tag remote-ref inventory, including annotated tag objects and peeled commits.
- Added internal branded provider-owned remote add/replace/remove primitives. Mutation holds Git's config lock, compares exact expected state, preserves unrelated configuration, rejects inherited/worktree overrides and destination rewrites, and verifies the final destination.
- Added provider-owned clone into an ordinary absent destination under configured local access roots, with no hardlinks, templates or submodule recursion, no overwrite and no force cleanup.
- Added exact-commit `pull_branch` using one bounded fetch, ancestry checks and the existing isolated merge/rebase lifecycle. Local recovery candidates do not become workflow Projects. Conflict results return operation identities and candidate local handles; clean target advancement and abort preserve source ownership.
- Added typed general `inspect_local_git_access` / `configure_local_git_access` setup. Delegated write scope, expected configuration digest, bounded canonical directories and application-owned settings persistence replace the manual Settings prerequisite. Removal revokes subsequent handle access. Results omit paths and credentials.
- Implemented the Operator's Repository Context Binding amendment in the existing local Git service. `select_repository_context` and `inspect_repository_context` use transport-owned session identities and serialize discovery, selection and routine execution. Selection returns verified repository/worktree identities, the selected checkout, branch and HEAD. Routine calls require an explicit same-repository checkout; failed switching clears the prior selection. Receipts refresh branch/HEAD after mutation and distinguish selected and targeted checkouts.
- Added required/mismatch/stale context errors. Stale contexts require rediscovery in the affected session. Removing its selected linked checkout preserves another session's intact sibling checkout. Movement, metadata replacement, access revocation and expiry cannot cause fallback. No Project, intake, workflow, SQL Project State record or managed repository layout establishes context.
- Retained existing local/registered Git operations. Local SSH transport uses fixed SSH execution; hooks/helpers/environment hardening remains application-owned.
- Updated published action inventories, docs and capability ownership. Existing MCP/runtime fixture contracts were brought forward to explicit checkout selectors, required lease callbacks and fixed runtime resolver ownership.

## Files

Created:

- `src/main/agentHarness/workspace/repositoryTargetResolver.ts`
- `src/main/repository/providerOwnedRemote.ts`
- `src/main/repository/gitRemoteManagement.ts`
- `src/main/repository/pullGitBranch.ts`
- `docs/implementation-bundles/repository-release-management-mcp/OPERATOR_SCOPE_AMENDMENT.md`
- This report.

Modified:

- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/agentHarness/workspace/localGitRepositoryAccessService.ts`
- `src/main/agentHarness/runtime/agentHarnessService.ts`
- `src/main/agentHarness/runtime/mcpServer.ts`
- `src/main/core/applicationErrors.ts`
- `src/main/core/gitExecution.ts`
- `src/main/repository/managedWorktrees.ts`
- `src/main/repository/isolatedGitOperations.ts`
- `test/support/git-mutation-fixtures.cjs`
- `test/agent-harness/git-toolbox-local-operations.test.cjs`
- `test/agent-harness/agent-harness-runtime.test.cjs`
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`
- `test/agent-harness/release-toolbox-boundary.test.cjs`
- `test/agent-harness/repository-io-hardening.test.cjs`
- `test/agent-harness/mcp-tool-contract-generation.test.cjs`
- `test/agent-harness/sibling-process-launch.test.cjs`
- `test/source-control/source-lifecycle-package.test.cjs`
- `validation/capability-map.json`
- `docs/user/BACKGROUND_AGENT_AND_MCP.md`

Deleted: none. No provider API implementation, release engine, repository registration/migration, production Work Intake change, credential file, dependency or generated artifact was added to the source baseline.

Three new cases extend the existing local Git capability owner for previously uncovered provider-owned CAS/clone/ref boundaries, exact pull/conflict/restart recovery, and MCP session selection/isolation/staleness. The session case exercises two clients with identical names, independent repositories, explicit switching, invalid selection, sibling worktrees, removal, movement, replacement, rediscovery and reconnect. Access setup extends existing trust and persisted-settings cases. No parallel test suite was introduced.

## Validation evidence

- `npm run typecheck` — restricted Windows lane, exit 0.
- A subsequent context diagnostic typecheck found the missing backend session property in `AgentHarnessToolCall`; the declaration was corrected and all final owned TypeScript builds passed.
- `npm run build` — restricted lane, exit 1 with `spawn EPERM`; recorded once. Equivalent normal Windows builds succeeded. The usual renderer chunk-size advisory remains.
- `node --test --test-name-pattern=RMCP01 test/agent-harness/git-toolbox-local-operations.test.cjs` — restricted lane, blocked by `spawn EPERM`; normal Windows diagnostic exposed an initial remote preflight defect and excessive duplicated recovery validation. Both were corrected.
- `node --require ./tmp/rmcp-trace.cjs --test --test-name-pattern='RMCP01 local pull' test/agent-harness/git-toolbox-local-operations.test.cjs` — normal Windows lane, exit 0; merge/rebase abort, continuation and advancement were observed. The diagnostic took 287,521 ms before redundant fixture repetition/validation was reduced.
- `npm run test:affected -- --changes tmp/rmcp01-changes.json --preview` — exit 0. Initial scope selected 45 files; clarified setup/fixture scope selects 50.
- `npm run test:affected -- --changes tmp/rmcp01-changes.json` — initial normal Windows composed run, exit 1; owned build passed and source remained stable. 382 tests: 359 passed, 23 failed. New remote/pull cases and LOCALGIT01 local trust/bootstrap cases passed. Failures identified missing lease callbacks in supporting registered mocks, stale action inventory, and five pre-existing fixture/qualification failures.
- `node --require ./tmp/rmcp-baseline-overlay.cjs --test test/agent-harness/agent-harness-runtime.test.cjs test/agent-harness/repository-io-hardening.test.cjs test/agent-harness/release-toolbox-boundary.test.cjs test/source-control/source-lifecycle-package.test.cjs` — normal Windows baseline diagnostic, exit 1; 81 tests, 76 passed, five failed identically using in-memory compilation of exact starting-HEAD sources, without replacing source/build files.
- Supporting MCP/runtime fixture repairs update current contracts. An initial Work Intake fixture trial was reverted after its diagnostic stalled. A later bounded in-memory overlay verified that removing the obsolete `baseBranch` / `baseCommit` form fields preserves the original source-ownership assertions and passes; the final fixture now makes that correction. No production workflow source changed.
- Second composed receipt `076c9098-081d-443d-a4e8-734ef7e13c28` — normal Windows, exit 1, owned build passed, source stable, 50 files / 409 tests, 405 passed and four failed. Current-contract fixtures were then corrected; the unchanged Work Intake failure remained visible until its current-form diagnostic.
- `node --test --test-name-pattern='RMCP repository contexts|provider-owned remote|public MCP Git contract|production Desktop and Service Host|registered workspace Git' test/agent-harness/git-toolbox-local-operations.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/sibling-process-launch.test.cjs test/agent-harness/repository-io-hardening.test.cjs` — normal Windows diagnostic, exit 1: four selected proofs passed, including real two-client MCP isolation and remote lock ownership. The launch fixture required additional mocks for existing IPC/service registrations.
- `node --test test/agent-harness/sibling-process-launch.test.cjs` — normal Windows diagnostic, exit 0, all five proofs passed after fixture updates. Production launch behavior did not change.
- `node tmp/wir-bounded-diagnostic.cjs` — normal Windows in-memory current-form diagnostic, exit 0, one source-ownership proof passed in approximately one second; the 45-second watchdog was not needed.
- `npm run test:affected -- --changes tmp/rmcp01-changes.json` — normal Windows composed receipt `6a1e278f-7e93-47c8-af12-7560b1c024d6`: owned build passed, source stable, 50 files / 410 tests, 408 passed and two failed. Failures confirmed the post-removal receipt refresh and obsolete Work Intake fields. Both were corrected.
- The same composed command then passed in receipt `2190b614-e1d7-477b-b72e-43a2a6125622`: 50 files / 410 tests, no failures, source stable, duration 497,128 ms. Session-specific rediscovery was subsequently strengthened to preserve other sessions' intact sibling checkouts.
- Final composed command passed in receipt `67ee78b9-5110-45c9-a504-15a84fa6fdee`: normal Windows, owned production build passed, source stable, 50 files / 410 tests, 410 passed, zero failures/skips/cancellations/unavailable files, duration 513,780 ms. The local Git capability file passed all 11 cases in 410,371 ms. The measured catalog count/duration was refreshed from this receipt.
- Validation exceeded advisory time budgets; the receipt reports `review-required` for duration. No proof was omitted or budget override treated as an approval gate.
- `node --test test/validation/capability-map.test.cjs` — normal Windows, exit 0 after refreshing measured catalog metadata from the final receipt. Only documentation and measured metadata changed after the composed run.
- `git diff --check` — exit 0. Bounded safety scan of the attributable change set found no secret/private-key patterns, concrete home-directory paths or generated-artifact paths. Diagnostic code and receipts remain ignored under `tmp/`.

No Electron visual acceptance, installer packaging, live provider mutation or release publication was attempted. A live preflight discovery request confirmed the currently running service lacks local access roots; the general typed setup implementation is verified through production services/registry fixtures and must be loaded into the running generation before live qualification.

## Git and safety

Focused acceptance and the required composed validation gate passed. The authorized RMCP01 checkpoint will include only attributable source, tests, catalog metadata, user documentation, amendment and this report; its hash is pending in this artifact and will be reported after commit. No push, merge, tag, reset, stash or source cleanup is part of this checkpoint.

No credentials were requested or inspected. Provider secrets never enter the new contracts. Filesystem paths appear only in internal identities and permitted directory arguments; configuration/remote/local Git results are opaque or redacted. All diagnostic traces, receipts and temporary overlays remain ignored under `tmp/`, outside the source baseline. Attributable-change safety scan passed; the exact staged diff must also pass before checkpoint publication.

## Remaining work and handoff

RMCP01 and the repository-context amendment satisfy focused acceptance and required automated validation. The authorized dependency chain can proceed to RMCP02 after checkpointing. RMCP02–RMCP05 have not started; no implementation evidence for hosting, GitHub writes, generic releases or live Sosaria qualification is claimed. Loading the new running generation and live external-provider qualification remain later-card work.
