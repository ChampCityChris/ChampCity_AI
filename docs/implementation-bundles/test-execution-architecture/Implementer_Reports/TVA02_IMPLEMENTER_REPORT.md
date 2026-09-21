# TVA02 Implementer Report

## Scope and repository

Work Card TVA02. Verified the approved repository/worktree using its Git root. Branch codex/test-execution-architecture derives from local dev at 05eef38; origin/dev was 45 commits behind local dev at initialization. No remote refresh or push. Operator-authorized worktree/branch creation only to date; no commit/merge yet. Commit hash pending final staged review. No edits to the original checkout.

## File and proof disposition

The following complete test bodies moved; original behavior identifiers and primary/supporting references follow their new files. All assertions, limits and functional scenarios remain. Added shared fixture modules test/support/mcp-diagnostics-fixture.cjs and test/support/mcp-session-fixture.cjs. Modified the four original executable files, created the four destination executables, modified validation/capability-map.json, and created this report. No files deleted. No production, dependency, integration-policy, scheduling or command-default changes. No generated artifact intentionally created for commit.

| Test case | Old file | New file | Lane |
| --- | --- | --- | --- |
| two-batch abrupt reconnect soak plateaus at the cap without linear RSS growth | `test/agent-harness/mcp-operational-diagnostics.test.cjs` | `test/performance/mcp-operational-soak.test.cjs` | performance-soak |
| settled sixty-second idle sample stays within CPU and event-loop lag limits | `test/agent-harness/mcp-operational-diagnostics.test.cjs` | `test/performance/mcp-operational-soak.test.cjs` | performance-soak |
| abrupt MCP clients remain globally bounded and one runtime reaper expires retained session state | `test/agent-harness/mcp-session-lifecycle.test.cjs` | `test/performance/mcp-session-volume.test.cjs` | performance-soak |
| successful renderer dispositions consume the returned transaction with one IPC call | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| generic Development disposition uses one pre-write and one final post-write planning acquisition | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| Development assembly discards a candidate when reachable Phase Map promotion advances durable state | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| stable assembly observes a promotion epoch change at the deepest returned projection boundary | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| stabilizer does not inspect or promote an Architect submission outside supplied assembly | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| failed Architect promotion does not advance the durable promotion epoch | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| pathological promotion epoch changes exhaust the bounded retry budget and publish no success bundle | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| Architect review returns a model and Development projection from the same final planning generation | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| Architect review rebuilds its model and Development projection together after a reachable promotion | `test/performance/disposition-transaction-collapse.test.cjs` | `test/documents/disposition-transaction.test.cjs` | integration |
| Desktop and Service Host controllers do not import worker-owned runtime implementations | `test/agent-harness/agent-harness-process-boundary.test.cjs` | `test/agent-harness/agent-harness-process-contract.test.cjs` | integration |
| compiled bootstrap routes maintenance, Service Host, and Desktop modes with appropriate switches | `test/agent-harness/agent-harness-process-boundary.test.cjs` | `test/agent-harness/agent-harness-process-contract.test.cjs` | integration |
| worker and host protocol validators accept registered-workspace controls and reject obsolete selected-project controls | `test/agent-harness/agent-harness-process-boundary.test.cjs` | `test/agent-harness/agent-harness-process-contract.test.cjs` | integration |
| worker unhandled rejection exits with failure for controller recovery | `test/agent-harness/agent-harness-process-boundary.test.cjs` | `test/agent-harness/agent-harness-process-contract.test.cjs` | integration |

The 24-session ChatGPT-style churn case is an admission/lifecycle regression, not a high-volume performance qualification, and remains in integration. SSE principal pressure, true executing-work saturation, idle expiration, restart draining, overload cleanup, and resume reconciliation remain there unchanged. Existing injected clocks still drive functional TTL proof. Real sixty-second CPU/event-loop qualification remains in performance.

Other mixed inventory records were reviewed: renderer/static wiring, filesystem/contract files, and the remaining workflow files do not contain an isolated long-running qualification forcing an unrelated lane. Their source-proxy/consolidation disposition belongs to TVA08. The real Electron file remains desktop-platform; its four process-free contracts now run independently in integration. Transaction correctness no longer requires the 200-document latency qualification file.

## Validation and correction

All process tests ran in the normal Windows lane with existing dependencies; no installs. No whole-repository/full-supported profile or legacy git boundary aggregate ran.

- Capability map: node --test test/validation/capability-map.test.cjs, exit 0, 5/5, 108.03 ms.
- Exact selected-file command: node --test --test-concurrency=1 test/agent-harness/mcp-operational-diagnostics.test.cjs test/agent-harness/mcp-session-lifecycle.test.cjs test/agent-harness/agent-harness-process-contract.test.cjs test/documents/disposition-transaction.test.cjs test/performance/mcp-operational-soak.test.cjs test/performance/mcp-session-volume.test.cjs test/performance/disposition-transaction-collapse.test.cjs. Exit 1, 43/44, 118648.69 ms. Sole failure: reconnect RSS grew 70.55 MiB against the unchanged 64 MiB limit. All other moved/retained owners passed. Idle sample: 60008 ms, CPU 0.182%, lag p95 32.44 ms. Volume test: 15077.74 ms. Controlled disposition gate: 12899.56 ms, p95/max 118.56 ms below 500/1000 ms.
- node --test --test-name-pattern='actual Electron utility-process boundary preserves MCP routing' test/agent-harness/agent-harness-process-boundary.test.cjs: exit 0, 1/1, 6045.31 ms. Observed distinct/recovered worker identities, routing, concurrency and graceful shutdown; no visual acceptance claim.
- node --test --test-name-pattern='two-batch abrupt reconnect soak' test/performance/mcp-operational-soak.test.cjs: isolated unchanged case also failed, 71.45 MiB, 15014.11 ms. The first failure was not dismissed as contention.
- Baseline comparison materialized HEAD's original diagnostics under ignored tmp with adjusted imports. node --test --test-name-pattern='^(?!settled sixty-second)' tmp/tva02-baseline-diagnostics.cjs: exit 0, 7/7, 81645.55 ms. The negative pattern did not exclude the idle case, so the whole seven-case diagnostics owner ran; no repository-wide or git aggregate ran. Baseline RSS delta 28.11 MiB established predecessor-test warm-up dependence.
- Replaced that implicit dependence with a bounded separate-runtime HTTP/tool warm-up (100 readiness/health/read/list iterations) before measured reconnect batches. Measured runtime still creates exactly 1000 sessions and retains/disposes exactly the same counts. No RSS threshold, timeout, elapsed sample, or assertion removed. Final isolated soak command above: exit 0, 1/1, 20996.63 ms; RSS delta 56.04 MiB. Other tests were unchanged after their passing run.
- AST comparison through a Node stdin script compared complete source bodies from git show HEAD against original+destination: all 7 diagnostics, 14 lifecycle, 10 disposition and 22 process test bodies were byte-preserved before adding the explicit warm-up call. First restricted comparison hit spawnSync git EPERM (Node failure; trailing diff command returned 0); equivalent normal-Windows comparison passed. No repeated restricted retry.
- planValidation lane previews select exactly three performance files, keep Electron in desktop-platform, and exclude both lanes from implementation-fast/work-item profiles. Exit 0; plan only.
- git diff --check: exit 0.

Duration metadata now records measured case sums with an explicit basis. The remaining Desktop file estimate is 60 seconds; only its representative real case was run. Catalog exact coverage and unique behavior ownership remain intact.

## Safety and outcome

No secrets or concrete local paths added to durable artifacts; fixtures remain synthetic and test-owned. Baseline capture stays ignored under tmp. No Git mutation beyond authorized branch/worktree initialization; no commit hash yet. No platform, external-provider, packaging or visual acceptance is claimed beyond the observed real Electron case. RSS qualification remains environment-sensitive and should be recorded as such by TVA08; explicit warm-up removes the observed ordering dependency without changing its contract.

TVA02 is complete. Next card TVA03.
