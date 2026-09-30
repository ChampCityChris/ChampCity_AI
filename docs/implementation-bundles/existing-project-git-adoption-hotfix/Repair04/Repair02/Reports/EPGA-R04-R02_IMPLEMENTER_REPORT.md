# EPGA-R04-R02 Implementer Report

## Outcome

Repair Card: **EPGA-R04-R02 — Restore Control Contract Parity and Fence Build Generation**.

The Service Host and worker control contracts now accept the checkout-list operation through one authoritative operation inventory per protocol. Desktop discovery fences ordinary control work on the expected runtime build, automatically replaces a compatible stale Service Host, and fails closed with typed incompatibility errors when safe reconciliation is unavailable. Focused validation passed. The real ChampCity_AI conversion was not retried and remains blocked pending Architect review.

## Repository and baseline evidence

- Verified the current directory as the approved `<PROJECT_REPO>` before changes.
- Starting HEAD: `adc868daeb81d2199dd403ea9289b18216f6fffa`, the card-required qualification baseline.
- Branch: `dev`, tracking `origin/dev`; it began 190 commits ahead of the configured upstream.
- `origin` is configured for the ChampCity repository. No fetch, pull, push, merge, rebase, tag, reset, clean, restore, or stash was performed; remote freshness is not claimed.
- Pre-existing qualification-review edits to the two hotfix README files and the untracked Repair02 package were preserved as Operator/Architect inputs. They are not attributed to this implementation and are not included in its checkpoint staging, except for this required report path.

## Implementation

### Exact operation-set parity

`agentHarnessServiceHostOperations` and `agentHarnessControlOperations` are exported `as const` inventories. Each corresponding operation union is derived from that inventory and each runtime membership set is constructed from the same value. This removes the duplicated union/allowlist surface that allowed a typed and dispatched operation to remain runtime-invalid.

Both inventories include `list-repository-checkouts`. Both request validators accept its semantic payload only when the payload is an object, `workspaceId` is non-empty and at most 160 characters, and no host filesystem-path field is present. Permanent proof asserts both exact inventories and rejects null, array, missing, blank, oversized, and path-bearing payloads.

### Full Service Host and worker transport

The real Windows Electron process-boundary owner now proves:

`AgentHarnessServiceHostClient → framed named-pipe request → AgentHarnessServiceHostServer validator → AgentHarnessController → Electron utility worker validator → AgentHarnessService → RegisteredWorkspaceRegistry`.

The proof registers a real Git workspace, observes application-owned conventional checkout reconciliation, lists the checkout, unregisters it, lists the empty post-unregister result, re-registers idempotently, and confirms the same deterministic conventional identity. The same owner also corrected one obsolete expectation that predated accepted Repair01 conventional-authority provisioning; production behavior was not changed for that correction.

### Build-generation reconciliation

When the client has an expected build identity, discovery compares it with the live handshake before descriptor reconciliation or any ordinary control operation. A same-protocol mismatch uses a private restart path over the already-discovered descriptor, preventing `ensureDescriptor → controlledRestartServiceHost → ensureDescriptor` recursion. It requires the old endpoint to become absent, launches exactly one current host, requires a different instance ID, requires the replacement digest to equal the expected digest, and only then admits normal control work.

The public `controlledRestartServiceHost()` delegates to the same internal primitive and remains covered by the real lifecycle owner. A stale-generation compatibility test proves the old host receives only `handshake` and `service-host-controlled-restart`; no descriptor reconciliation or newly supported normal operation is sent to it.

A live incompatible protocol response surfaces `SERVICE_HOST_PROTOCOL_INCOMPATIBLE` without launching a replacement or sending ordinary controls. A same-protocol stale host unable to accept controlled replacement surfaces `SERVICE_HOST_BUILD_GENERATION_INCOMPATIBLE`; an incorrect replacement digest surfaces `SERVICE_HOST_BUILD_GENERATION_MISMATCH`. Expected digest input is validated at construction.

Protocol v1 semantics are documented: additive same-wire controls may retain the version only because generation fencing prevents a newer client from using them on an older build; incompatible wire changes require a version bump and explicit strategy. Permanent tests pin both protocol versions and the generation-fence behavior.

### Current failed-state recovery

The managed-source recovery fixture now represents the preserved qualification shape: a failed schema-3 journal in `conventional checkout retirement`, root conventional Git authoritative, retained candidate repository, and no accepted final managed state. Fresh inspection creates a new plan and completes conversion without manual deletion of the old journal/candidate evidence. Existing focused proof also retains atomic checkout retirement, non-Git zero-checkout behavior, exact managed Main/Dev registration, ignored-tree/junction preservation, and managed integration-policy loading.

## Attributable files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair02/Reports/EPGA-R04-R02_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/agentHarness/runtime/agentHarnessInstallLifecycle.ts`
- `src/main/agentHarness/runtime/agentHarnessProcessProtocol.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostClient.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostDescriptor.ts`
- `src/main/agentHarness/runtime/agentHarnessServiceHostProtocol.ts`
- `test/agent-harness/agent-harness-process-boundary.test.cjs`
- `test/agent-harness/agent-harness-process-contract.test.cjs`
- `test/agent-harness/agent-harness-service-host-protocol-compatibility.test.cjs`
- `test/source-control/managed-project-source.test.cjs`

Deleted: none.

Intentionally not created or changed: dependencies, preload/API surface, renderer filesystem access, persistence schema or migration readers, public workspace-root Git fallback, conversion cutover ordering, managed integration policy, ignored/local-state handling, packaging, release state, and real-project migration evidence.

## Focused validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run build` | Restricted Windows | Initial exit 1 from a TypeScript exhaustiveness error after adding the typed incompatible-probe state; corrected in the uninstall lifecycle owner. Second restricted attempt completed TypeScript and hit the documented Vite/esbuild child `spawn EPERM`; not counted as a pass or source failure. |
| `npm run build` | Normal Windows | Exit 0. Production TypeScript, Vite renderer, and branding build passed; 1,666 modules transformed. Existing non-failing chunk-size advisory only. |
| `node --test --test-concurrency=1 test/agent-harness/agent-harness-process-contract.test.cjs test/agent-harness/agent-harness-service-host-protocol-compatibility.test.cjs` | Restricted Windows | Exit 1 because the Node test runner child spawn returned `EPERM`; rerun once normally. |
| Same two-file protocol command | Normal Windows | Exit 0; 6/6 passed. Exact host/worker inventories, bounded malformed list payloads, protocol-version rule, automatic generation replacement, no ordinary stale-host work, and typed protocol incompatibility passed. |
| `node --test --test-concurrency=1 test/agent-harness/agent-harness-process-boundary.test.cjs` | Normal Windows desktop-platform owner | Initial exit 1 at 17/18 solely because a stale assertion expected zero conventional checkouts after production Git-workspace registration. The assertion was aligned with accepted Repair01 semantics. Final exit 0; 18/18 passed, including the full list/unregister/list transport round-trip and public controlled restart. |
| `node --test --test-concurrency=1 test/agent-harness/agent-harness-service-host-lifecycle.test.cjs test/agent-harness/registered-workspace-registry.test.cjs test/source-control/managed-project-source.test.cjs test/project-state/current-project-entry.test.cjs test/validation/capability-map.test.cjs` | Normal Windows focused owners | Exit 0; 60/60 passed: Service Host lifecycle 11, registry 14, managed-source adoption 17, Current Project entry 13, capability-map integrity 5. |
| `node --test --test-concurrency=1 test/source-control/managed-project-source.test.cjs` | Normal Windows focused rerun | Exit 0; 17/17 passed after the recovery fixture was tightened to the current failed schema-3 qualification shape. |
| `npm run validate:plan -- --profile repair --changes tmp/epga-r04-r02-changes.json` | Restricted Windows preview | Exit 0. The exact ten-path implementation/report manifest was classified under Background Agent lifecycle, Agent Harness runtime/repository operations, workspace registry, managed-source topology, and capability-map ownership. Preview only; the broad selected repair profile was not executed. |
| `git diff --check -- <ten attributable paths>` and `git diff --cached --check` | Read-only Git validation | Exit 0; attributable and exact staged changes are whitespace-clean. Unscoped `git diff --check` exits 1 only for pre-existing Markdown hard-break trailing spaces in the two unstaged hotfix README inputs; those unrelated edits were preserved unchanged. |

Broad unrelated regression, packaging, release qualification, visual acceptance, external integration, and real-project conversion were intentionally not run because the Repair Card requires focused validation and explicitly prohibits retrying the real conversion before Architect acceptance.

## Security and durable-artifact safety

- No secret, credential, token, cookie, key, or `.env` content was requested, printed, persisted, or added.
- Runtime responses remain semantic; the repaired list payload and checkout summaries reject host-path fields.
- Production code imports no behavior from tests, planning, archive, validation output, generated output, or temporary fixtures.
- Durable documentation uses repository-relative paths or `<PROJECT_REPO>` and contains no concrete local-machine path.
- Inspected the exact staged ten-file change set: one created report, nine modified source/test files, 409 insertions, and 131 deletions.
- Fixed-string scan for the concrete local user path returned no matches in attributable files.
- Staged filename scan returned no secret/credential/key or generated dependency/build artifact paths.
- Attributable and staged diff checks passed. The only full-working-tree diff-check findings belong to the two preserved, unstaged qualification README inputs.

## Git checkpoint

The active Repair Card requires checkpoint commit:

`EPGA-R04-R02 restore control contract parity and fence build generation`

The commit hash is intentionally pending in this same committed artifact. The actual hash will be reported to the Operator after commit rather than amending the commit solely to insert its own identity.

## Remaining review and risk

- Required next action: Architect review of this checkpoint.
- The real ChampCity_AI conversion must not be retried before that review and acceptance.
- No external integration evidence or real-project mutation is claimed.
- Residual risk is limited to review of the compatibility classification for hosts too old to return a parseable handshake; such ownership remains fail-closed as indeterminate and never receives normal control work.
