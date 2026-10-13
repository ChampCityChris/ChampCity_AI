# RMCP05 Generic MCP Qualification Report

Date: 2026-10-12. **Complete for controlled MCP qualification.** RMCP03–RMCP05 were executed under the Operator's bundle request and explicit continuation. Testing stayed limited to MCP after the Operator's direction; no full or composed suite was restarted.

## Repository and scope

Verified `<PROJECT_REPO>` remains the primary `dev` checkout at `e5f564b4d001954e450abcbbd80d172acbe712cf`, with its existing GitHub origin and no upstream. RMCP01 baseline, RMCP02 working implementation and unrelated planning work were preserved. No source-checkout staging, commit, push, merge, tag, reset, stash, cleanup or branch change occurred.

RMCP03 completes the existing official GitHub bridge and individually named proven compatibility gaps. RMCP04 closes confirmed ordinary-Git gaps and updates the source-backed matrix. This card qualifies those implemented contracts against disposable repositories and controlled provider schemas/auth/API fixtures. No named consumer, Project registration, release publication, build pipeline or update feed is involved.

## Observed qualification

**41 distinct focused MCP cases have passing evidence across the final boundary checks and corrected qualification runs.** No qualifying case was skipped or cancelled. This is controlled capability evidence, not a whole-repository green-suite receipt or live-account acceptance.

| Boundary | Observed evidence |
| --- | --- |
| Two unrelated repositories | Actual external MCP clients initialize two independent repositories, configure identity, write/stage/commit their first files, discover/select independently, reject same-client wrong-repository handles, explicitly switch and reject expired selected context. No Git CLI is used to create either baseline. |
| Ordinary Git gaps | Public MCP performs trusted local clone, explicit post-clone selection checks, detached-to-branch checkout, stale target denial, index-only and working-file restoration, annotated tag-object CAS, linked-worktree lock/unlock/removal, rediscovery after selected checkout removal, local remote add/tracking/rename/remove and stale binding denial. |
| Direct conflict operations | Real Git rebase, cherry-pick and revert conflicts remain observable through typed MCP; abort preserves the prior target, staged file resolution allows cherry-pick continuation, invalid merge mainline is denied and exact mainline revert succeeds. Fixture CLI only arranges divergent history/merge objects. |
| Preserved Git families | RMCP01's eleven original local-Git cases and RMCP02's file/stash/search/notes/reset/merge lifecycle already have passing evidence. The latter was not repeated after the testing direction. The matrix identifies preserved branches/refs/history/diff/staging/amend/worktrees/isolated recovery/fetch/pull/push/tags/notes/prune/diagnostics and exact proof ownership. |
| Forgejo | Three selected provider cases pass paged refs, file SHA CAS, PR/review lifecycle, stale mutation denial, private authenticated HTTP Git, exact push/ref/prune, provider-owned bind/remove/clone/verify and no-registration behavior. Earlier RMCP02 also passed all eight Forgejo cases. |
| GitHub | Nineteen provider cases pass actual external MCP hosted writes through controlled official schemas/auth plus named compatibility fixtures, explicit first-file bootstrap, empty-repository and native ID/URL verification, exact resource/blob verification, escaped large-resource bounds, PR/reviews and release/assets. Missing or incomplete official schemas remain unavailable. Existing OAuth, runtime integrity, recovery and session loss proofs are preserved. |
| Compatibility and credentials | Fixed command construction is exercised with a controlled executor: only github.com/API and the fixed exact-ID uploads endpoint, binary stdin, SHA-guarded deletion, path/size denial and mismatched CLI account rejection. Credential resolution verifies the resolved token's user with redirects refused; another host/session identity is denied and no secret enters command arguments or provider status. No real token/CLI account is accessed. |
| External MCP gateway | Twelve existing stdio/HTTP transport, secure strategy, exact discovery, tool attribution, unavailable/malformed/error, cancellation/reconnect and redaction cases pass. Default capture limits remain; only verified GitHub file read has a bounded application-owned expanded budget. |
| Published contracts | Five selected cases pass the exact stable namespace, JSON/Zod contracts, single cached generation across 32 sessions, normalized OAuth read/write filtering, registered checkout targeting and local mutation gates. No new top-level toolbox is added. |

## Commands and results

All child-process-heavy commands used the normal Windows lane. Runtime output was freshly built before each changed implementation's proofs. Builds are recorded separately from capability tests.

- `npm run build` — normal Windows, exit 0 after final source changes; production TypeScript/renderer/assets only. Existing renderer chunk-size advisory remains.
- First focused selection below — exit 1, 12 selected cases: 11 passed, one fixture failure, no skips/cancellations; 231,941 ms. The failure was stale context reuse after removing the selected worktree. The fixture was corrected to rediscover before reselection, preserving the existing policy. The other cases, including direct transforms and all selected providers/contracts, passed.

  ```powershell
  node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=2 --test-name-pattern='RMCP generic public MCP|RMCP direct rebase|exact stable top-level namespace|one runtime contract generation|normalized OAuth scopes|public MCP Git contract|LOCALGIT01 built OAuth contracts|GitHub public MCP|incomplete discovered release|Forgejo global MCP|private HTTP Git|global hosting MCP' test/agent-harness/git-toolbox-qualification.test.cjs test/agent-harness/git-toolbox-extended-operations.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs test/external-providers/github-provider.test.cjs test/external-providers/forgejo-hosting.test.cjs
  ```

- `node --require ./scripts/validation/child-cleanup.cjs --test test/agent-harness/git-toolbox-qualification.test.cjs` — exit 0; corrected case passed, no skips/cancellations, 142,976 ms. All final two-repository/gap assertions passed.
- `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=2 test/external-providers/github-provider.test.cjs test/external-providers/external-mcp-provider-gateway.test.cjs` — exit 0; 31 cases passed, zero failures/skips/cancellations, 1,249 ms.
- `node --test test/external-providers/github-provider.test.cjs` after the final native creation/bootstrap correction — exit 0; 19 cases passed, zero failures/skips/cancellations, 1,290 ms. The correction changed only GitHub hosting metadata/bootstrap and its fixture; other qualified behavior was unchanged.
- Final contract selection below — exit 0; 5 cases passed, zero failures/skips/cancellations, 12,440 ms.

  ```powershell
  node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=2 --test-name-pattern='exact stable top-level namespace|one runtime contract generation|normalized OAuth scopes|public MCP Git contract|LOCALGIT01 built OAuth contracts' test/agent-harness/reserved-toolbox-namespace.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs
  ```

- Direct `loadCatalog()` static metadata validation — exit 0 after deterministic owner/coverage ordering correction. This checks MCP proof ownership and inventory declarations; it runs no capability suite.
- Attributable secret/local-path/generated-artifact scan — passed across 50 attributable files; no findings or generated paths. `git diff --check` — exit 0. Final read-only Git inspection confirmed `dev` and unchanged HEAD `e5f564b4d001954e450abcbbd80d172acbe712cf`.

## Artifact disposition and limits

Created for RMCP03–RMCP05: GitHub hosting adapter and named compatibility module; public Git qualification proof; and each card's implementer report. Existing provider/Git/namespace proofs were extended for materially new write, conflict, command and credential boundaries. The exact per-card inventories are in the RMCP03/04 reports. Shared user documentation, capability matrix and ownership metadata now describe the final implemented surface. The package plan and RMCP02–RMCP05 card status lines link their completed evidence; objectives and acceptance remain intact. RMCP02's report links the subsequent bundle continuation. Deleted: none. No dependencies or tracked generated output were added.

Provider qualification uses controlled API/schema/auth fixtures, as permitted by the card. No expressly configured live test repository/account was available or invoked. GitHub compatibility/private HTTPS Git requires an authenticated CLI account/token matching the official provider; status reports this separately from discovered official tools. Releases/assets have application expected-state guards, and uploads are bounded to 512 KiB of binary content. File/merge writes have server SHA guards; no external-writer exclusion is claimed for application guards. Interrupted or unverifiable outcomes require reinspection rather than an automatic retry.

Hard reset, blanket cleanup, forced worktree removal, arbitrary configuration/shell/API passthrough, worktree relocation/dangling-metadata repair, and other enumerated nonordinary plumbing remain intentionally unexposed in the matrix. No live release, installer, consumer-project or visual acceptance is claimed. Operator review can use the three reports and matrix; implementing or qualifying a consumer release pipeline is outside this completed bundle.
