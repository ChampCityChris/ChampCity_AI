# Implementer Report — RMCP-REPAIR03C

Status: network execution budget repair implemented and live disposable clone qualified; checkpoint for Architect review.

## Authorized scope and repository verification

The Operator selected Repair Card RMCP-REPAIR03C. Verified `<PROJECT_REPO>` is the primary Dev checkout using its Git root, AGENTS.md, package manifest and active card. Branch: `dev`; starting HEAD: `63b815436c0a2196297c5d174a7dfeaacfb55df7`. Origin remains the existing ChampCityChris/ChampCity_AI GitHub remote, unchanged. No upstream is displayed by branch status. The only initial untracked file was the governing card; there were no unrelated working-tree changes.

Scope is bounded internal network Git execution. No dependency, authentication authority, public schema, release policy, workflow registration, trusted-root policy or migration was changed.

## Timeout architecture before and after

Previously, every Git process defaulted to 15,000 ms and was clamped to that same universal maximum, even when an internal caller requested longer execution. The new frozen internal policy is:

| Internal class | Maximum | Centrally classified commands |
| --- | ---: | --- |
| `local-default` | 15,000 ms | All other commands, including status, diff, rev-parse, branch/local ref inspection, commit, local tag creation/deletion, staging, reset, worktree metadata, config and remote get-url |
| `network-read` | 120,000 ms | fetch, pull, ls-remote, remote prune/update, and remote show unless `-n` requests local inspection |
| `network-write` | 120,000 ms | push, including tag pushes and remote branch/tag deletion |
| `network-clone` | 300,000 ms | clone |

Classification uses command/subcommand positions after Git global options; branch, path and message operands cannot grant a longer budget. Internal callers may explicitly select a class or request a shorter timeout. LocalGitRepositoryAccessService.clone explicitly selects `network-clone`. Pull's production implementation uses the classified fetch path followed by local steps. Hosted verification and tag verification use the classified ls-remote path.

Effective process timeout is the minimum of the class cap, a finite shorter internal request, and the remaining call-scoped deadline. Nested local execution scopes now inherit the shortest parent deadline, including when the inner scope omits a deadline or requests a later one. Expired deadlines prevent spawning. Local discovery retains its existing 10-second deadline.

Git and integration toolbox calls project the trusted MCP AbortSignal into bounded Git execution through a separate async-local scope. Explicit internal signals also remain authoritative. Aborted commands never spawn or terminate through the existing Windows taskkill process-tree/POSIX process-group mechanism. Listeners are removed on completion or error. Timeout retains GIT_TIMEOUT; cancellation uses GIT_EXECUTION_FAILED with bounded `terminationReason: cancelled` evidence. Other toolboxes retain their own cancellation/cleanup contracts.

The repaired provider credential resolver and private environment projection remain unchanged. No timeout/class/deadline parameters were added to JSON or Zod MCP schemas. Existing noninteractive settings, output bounds, process termination, destination absence/containment, selected-branch validation and post-clone verification remain in force. Partial clone failure retains its explicit failure message and performs no cleanup.

## Files and test ownership

Modified:

- `src/main/core/gitExecution.ts`: frozen execution budgets, central classification, minimum deadlines, nested deadline preservation and internal cancellation support.
- `src/main/agentHarness/tools/toolRegistry.ts`: cancellation propagation restricted to Git/hosting tools, preserving development process cleanup results.
- `src/main/agentHarness/workspace/localGitRepositoryAccessService.ts`: explicit clone class.
- `test/agent-harness/repository-io-hardening.test.cjs`: extended the existing bounded Git owner with command caps, shorter requests, parent/nested deadlines and cancellation scenarios.
- `test/external-providers/forgejo-hosting.test.cjs`: extended the existing authenticated smart-HTTP owner with real delays beyond 15 seconds, forced local-default timeout, MCP cancellation and public parameter rejection. Its scenario limit increased from 180 to 360 seconds to accommodate the deliberate delays; production local limits were not increased.

Created: this report. Included: the initially untracked governing card at `docs/implementation-bundles/repository-release-management-mcp/Work_Cards/RMCP-REPAIR03C_bound_network_git_execution_budgets.md`.

No files deleted. Intentionally not created: new permanent test files, validation catalog owners, JSON workflow sidecars, dependencies, schema fields, registration records, release artifacts or credential/configuration changes. Existing proof owners were extended after inspecting their capability-map ownership; the added scenarios cover previously unproved execution-class boundaries. Temporary scripts, receipts, change sets and the live clone location remain ignored local evidence.

## Automated validation and correction

All source remained stable during both recorded validation runs. No separate typecheck was prepended; each executor owned one fresh production build.

- `npm run test:repair -- --changes tmp/rmcp03c-changes.json`: restricted Windows lane, exit 1. Receipt `cd30cf8b-43c8-4902-8489-ea135d5b7bbf`: build launch failed with spawn EPERM; downstream checks were blocked. Recorded once and rerun normally.
- Same command, normal Windows lane, exit 1. Receipt `5a84608c-86d3-42bc-9f3e-13464ae8dd41`: fresh build passed in 14,070 ms; sourceStable true; total 1,583,727 ms; 50/51 files passed, 433 tests, 432 passed, one failed, zero cancelled/skipped/unavailable. Static, fast, affected-capability and the other integration files passed, including extended/local workflows, provider-owned remote CAS, remote/tag operations, Forgejo, GitHub and portable contexts.
- The sole failure was a repair-introduced cancellation regression: propagation into development_toolbox cancelled its post-process Git verification, replacing its existing successful cancelled-process payload with an error. Restricted the async-local signal projection to git_toolbox/integration_toolbox. No test expectations were relaxed.
- `node tmp/rmcp03c-focused-validation.cjs`: normal Windows lane, exit 0. The existing catalog planner/executor selected the four complete affected proof files and owned a fresh build. Receipt `2e25be87-4b9d-4323-a899-b1fa5f5cbdd4`: build passed in 13,043 ms; sourceStable true; total 617,956 ms; 43/43 tests passed, zero failures/cancellations/skips/unavailable. Full qualification 4/4, bounded repository I/O 12/12, Forgejo 8/8, GitHub 19/19. This verifies the correction, SDK cancellation/process cleanup, final execution budgets and authenticated transfers.
- Supporting diagnostic `node --require ./scripts/validation/child-cleanup.cjs --test --test-name-pattern="Git status and diff are asynchronous" test/agent-harness/repository-io-hardening.test.cjs`: normal lane, exit 0; 2/2 passed, 1,319 ms, before the cancellation scope correction.
- Initial repair preview rejected the nonexistent explicit capability `github-provider` before execution. Corrected it to the catalog owner `external-provider-integration`; no validation metadata was changed.

Final controlled HTTP fixture durations, with one 16-second server delay per operation:

| Operation | Duration | Class |
| --- | ---: | --- |
| push | 20,512 ms | network-write |
| inspect_remote_refs | 22,197 ms | network-read |
| fetch_remote | 18,877 ms | network-read |
| push_tag | 20,633 ms | network-write |
| clone_hosted_repository | 17,183 ms | network-clone |

The same delayed ls-remote command forced through local-default returned GIT_TIMEOUT. MCP cancellation terminated an authenticated delayed read before its longer budget. Synthetic credentials/Basic material were absent from argv, config and results. JSON schema checks and semantic rejection tests protect the absence of public budget controls.

The original composed receipt remains failed; the final fresh-build targeted receipt is independent successful correction evidence, not a rewrite of that receipt. The wider repair profile was not repeated after its sole failure was corrected and the affected complete suites passed. Its advisory budget is review-required against 60,000 ms; slowest files were extended operations 774,431 ms, local operations 725,639 ms, Forgejo 315,316 ms, qualification 303,192 ms and source checkpoint boundary 82,939 ms. No timing limit was raised for these existing workflow suites.

Packaging, installer, full/release qualification and visual desktop acceptance were not run: they are outside this repair. No real hosted branch/tag/release/feed mutation was performed.

## Live qualification — separate from fixture proof

`node tmp/rmcp03c-live-qualification.cjs`: normal Windows lane, exit 0, using the final rebuilt local MCP HTTP runtime and the currently configured Forgejo provider's private OS credential store.

Read-only checks preceded cloning: provider_status ready; hosted repository ID 4 inspected; existing canonical origin matched the provider-owned identity; authenticated inspect_remote_refs matched hosted main. These exercised the production tool registry without workflow Project registration or repositoryCheckoutId.

Exactly one disposable clone_hosted_repository attempt succeeded in **26,826 ms**, exceeding the old 15-second cap and remaining within the new 300,000-ms clone budget. Destination was absent at start in a fresh trusted temporary root, outside existing checkouts. Selected branch main and resulting HEAD `53518394657de1e1e7139f57fd820c50fd3d07df` matched the hosted ref snapshot. Independent rev-parse and branch checks confirmed the checkout. Origin exactly matched the canonical provider destination and contained no username/password.

Private checks confirmed the actual token and Basic-encoded material were absent from every captured MCP result and the clone's Git config. Instrumented 154 Git spawns privately checked argv for both forms; neither appeared. No real credential, raw authentication header or private provider URL was printed or persisted in committed evidence. The completed disposable checkout is retained; its location is recorded only in ignored local evidence. No cleanup, existing-remote mutation or workflow enrollment occurred.

The already-running desktop host was not replaced. Live repaired-code proof comes from the rebuilt local MCP runtime; normal Architect integration/host restart is still needed for that running process to load this source.

## Safety, checkpoint and remaining review

The checkpoint is limited to the five modified source/test files, governing card and report. Generated output, local qualification scripts/receipts, provider settings, credential state and temporary checkout are excluded. Exact staged diff review completed. A bounded scan of the seven staged files found zero recognized credential literals/private-key blocks, concrete home/machine paths, generated/sensitive paths or invalid UTF-8 files. Source/test/report whitespace checks passed; the full staged check flags only the card's four original Markdown hard-break lines, which are retained unchanged.

Checkpoint hash: pending at report creation; actual hash is returned after commit without amending this report merely to insert its own hash. No push is authorized or performed.

Return for Architect review of this repair, the preserved failed wider receipt versus successful final correction evidence, and the advisory validation budget. No visual Operator acceptance or policy exception is required for the observed semantic/live proof. No product or live-clone blocker remains. Recommended next action is Architect review/integration and normal host restart; release orchestration remains outside this card.
