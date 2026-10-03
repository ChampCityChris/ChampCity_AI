# TVA10-HF01 Implementer Report

Status: bounded implementation complete; Architect review and clean repair-profile acceptance remain outstanding.

## Repository and checkpoint

- Verified `<PROJECT_REPO>` using `git rev-parse --show-toplevel`: the Dev checkout containing the approved card, source, package and validation catalog.
- Card: blocking hotfix TVA10-HF01.
- Starting checkpoint: `1523491c67d122f9b32de206051e5a6fbe8f1d6a` on `dev`.
- Remote `origin` exists; `dev` has no configured upstream. No fetch, push, merge, branch or worktree mutation performed.
- Required checkpoint message: `TVA10-HF01 repair test_toolbox checkout routing boundary`. Hash pending at report creation; actual hash returned after commit. Only attributable hotfix changes are staged, including isolated capability-map hunks. Concurrent RWS06-REPAIR01 changes remain unstaged.

## Root cause and implementation

The public registry correctly required and resolved an exact RepositoryCheckout, then forwarded the consumed selector into the fixed runner's action-specific protocol. That runner correctly rejected the unexpected field before planning.

`testExecutionAction()` now removes `repositoryCheckoutId` after central dispatch resolution and passes only execution parameters. Other action kinds retain their existing dispatch. Public schemas, checkout resolution, containment, source-operation and checkout leases, scope enforcement and fixed child working directory remain intact.

Before child input: `{"action":"run_test_file","params":{"repositoryCheckoutId":"routing-dev","testPath":"test/checkout-routing.test.cjs"}}`.

After child input: `{"action":"run_test_file","params":{"testPath":"test/checkout-routing.test.cjs"}}`.

Modified:

- `src/main/agentHarness/tools/toolRegistry.ts` (only production change).
- `test/agent-harness/reserved-toolbox-namespace.test.cjs` (all five execution schemas require the selector; status does not; each shape rejects arbitrary extra fields).
- `test/agent-harness/mcp-tool-contract-generation.test.cjs` (extends existing HTTP MCP owner with real registry-to-child regression).
- `validation/capability-map.json` (one new MCP behavior, proof locator and test count of four; other concurrent changes excluded from checkpoint).

Created this report. Included the supplied hotfix Work Card in the checkpoint, normalizing its five trailing Markdown hard-break spaces for the diff check. No new permanent test file, dependencies, runtime artifact, sidecar, migration or compatibility path created. `src/main/agentHarness/test/testToolbox.ts` and `scripts/validation/toolbox-runner.cjs` are unchanged, as are planner, executor, checkout resolver, Git and release production behavior.

## Behavioral proof

The new regression creates a synthetic Project with a committed Dev checkout, registers its exact descriptor with the production RegisteredWorkspaceRegistry, starts the production HTTP MCP runtime, and invokes it with an MCP SDK client.

- Missing selector: MCP schema rejects input; direct registry call returns `REPOSITORY_CHECKOUT_REQUIRED`; resolver never runs.
- Unknown selector: production registry returns `REPOSITORY_CHECKOUT_REQUIRED`; no validation child starts.
- Arbitrary command field: MCP schema and direct registry both reject input before checkout resolution/execution.
- Valid selector: production resolver returns the exact Dev root; actual executed test asserts its cwd basename is Dev; returned Git revision matches that checkout.
- Test-only preload observation captures the actual adapter stdin and cwd. The captured request exactly equals the action-specific object and contains no checkout selector. Observation is outside the checkout and enabled only for the runner process.
- Both `run_test_file` and `run_test_pattern` select the synthetic catalogued test, pass one test, return normal receipts with source stability, and release both checkout leases.
- Direct execution of the unchanged runner rejects both a checkout field and an arbitrary command field with `Unsupported toolbox request fields`.
- Existing published MCP checkout assertions remain intact. All four MCP contract tests pass.
- All corrected test-toolbox schema assertions execute successfully in the reserved namespace owner before its unrelated final lease-directory snapshot assertion fails.

## Validation commands and lanes

Temporary caller scope: `tmp/tva10-hf01-changes.json`, listing the production file, both test owners, catalog, hotfix card and report; preserved capability IDs `agent-harness-mcp-runtime` and `agent-harness-repository-operations`. Scope and raw receipts are ignored local artifacts, not committed sidecars.

| Command | Lane / result |
| --- | --- |
| `npm run validate:plan -- --profile repair --changes tmp/tva10-hf01-changes.json` | Restricted Windows, exit 0. Exact-path repair preview selects one production build and 26 files across static, fast, affected-capability and integration. |
| `npm run test:repair -- --changes tmp/tva10-hf01-changes.json` | Restricted Windows, exit 1: `spawn EPERM` on build launch; downstream proof blocked. Recorded once, then switched lanes. |
| Same repair command, first normal run | Normal Windows, exit 1; build passed; 203/208 tests passed. New regression initially expected dispatcher-shaped responses where SDK schema rejection comes first; corrected those expectations and the unknown-checkout code. |
| `node --test --test-name-pattern='public MCP test execution' test/agent-harness/mcp-tool-contract-generation.test.cjs` | Normal Windows diagnostics after current build. First exit 1 corrected unknown error expectation; subsequent test-only observer stalled because inherited preload observed test-child stdin. Stopped its identified process tree and limited observation to runner argv. Final exit 0: one test, both execution shapes passed, 3226 ms. |
| Same exact-path repair command, final normal run | Normal Windows, exit 1. Run `ef2e22ee-f246-4dfe-a942-070ee9167d60`: one successful production build, 26 files, 208 tests, 204 passed / four failed, 36017 ms. MCP owner passed 4/4. Receipt also marks source unstable because concurrent RWS06 changes occurred during validation. This receipt is not acceptance. |
| `node tmp/tva10-hf01-acceptance.cjs` | Normal Windows, exit 0. Fresh production HTTP MCP runtime, isolated registration state, actual Project/Dev checkout, exact registered ID `hf01-exact-dev`, workspace `champcity_ai`, selected `test/project-state/domain-contracts.test.cjs`. Run `cceee770-790d-4091-9d7c-1a4ad901f4c9`: owned build passed, all eight selected tests passed, `executionFailed=false`, `failureReason=null`, `sourceStable=true`. Child request contains only testPath. |
| `git diff --check` | Restricted Windows, exit 0; only Git line-ending notices. |

The acceptance runtime is freshly built and exercises real MCP HTTP/tool dispatch against the actual Dev checkout. It does not claim that an already-running desktop/connector service was restarted. A post-checkpoint repetition is returned with the actual commit result.

## Unrelated failures and acceptance limits

The four remaining failures belong to existing assertions outside the card's test-toolbox routing repair:

1. `agent-harness-runtime.test.cjs`: workspace discovery expects no conventional checkout, but the current service provisions one.
2. `repository-io-hardening.test.cjs`: a workspace-only Git status call expects success without the currently mandatory checkout selector.
3. `reserved-toolbox-namespace.test.cjs`, first test: existing Git schema loop expects missing checkout identity to parse successfully.
4. Same file, second test: exact userData snapshot expects no source-operation lease directories after read calls; current coordinator leaves empty directory scaffolding.

No unrelated Git schema/lease/suite cleanup performed; the card forbids broadening this hotfix. Therefore the routing repair has positive runtime evidence, but the required entirely passing focused profile and reserved namespace owner are not achieved. Architect disposition or a separately scoped repair is required for those existing assertions. Concurrent source edits additionally invalidate the final composed receipt's source stability.

No genuinely visual or experiential Operator validation is required by this bounded routing change. Remaining work: Architect review, refresh the intended live Agent Harness instance, repeat the previously blocked focused request there, and obtain a stable passing scoped receipt after existing assertion failures are dispositioned.

## Safety and Git scope

No secrets, credentials, concrete local-machine paths, generated output or raw process logs added to committed artifacts. Documentation uses repository-relative paths or `<PROJECT_REPO>`. Fixture identities and email addresses are synthetic. Runner allowlists remain strict. Temporary process evidence stays outside fixture checkouts; temporary fixtures are cleaned by the existing test helper. No test classifications/profiles were changed. Exact staged diff reviewed: six attributable files, no concurrent RWS06 source/tests/map hunks. Bounded added-line scan found zero credential/private-key patterns and zero concrete local-machine paths; no generated artifacts are staged. Both working and staged `git diff --check` passed after card whitespace normalization. No release acceptance or push claimed.
