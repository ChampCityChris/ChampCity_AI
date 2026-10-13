# RMCP-REPAIR03 Implementer Report

Status: implementation, focused proof, composed qualification and real non-publishing SDK build complete; repair-only checkpoint prepared for Architect review. Stop at this repair for Architect review. The installed app connector retains a status-only cached schema and requires refresh before live connector execution can be accepted.

## Repository and scope

Verified `<PROJECT_REPO>` is the approved primary Dev checkout, on `dev`, at starting HEAD `0d242f1c82ff1cf0e39ecfffb93b2a94fa9fc8dd`. The initial index/worktree were clean. `origin` remains configured; no fetch, push, branch switch, tag mutation, release publication or Project/workflow registration is included. The active user-supplied RMCP-REPAIR03 Repair Card authorizes implementation, fixture proof, one real non-publishing build and a repair-only checkpoint. Checkpoint hash is pending; return the actual hash separately without amending solely to insert it here.

Concurrent RMCP-REPAIR03A Forgejo work appeared after this repair began. Its card, provider/IPC/preload/renderer changes and unrelated capability-map edits are preserved and excluded from this repair's checkpoint. Qualification therefore freezes the original HEAD plus only the eight repair source/proof/documentation files in an ignored temporary validation fixture. This fixture is not a managed checkout, registered Project or production dependency. Its own fixture Git revision is `3017f5aa61b4b8a44dd4dace61b5f7f31ff5c53e`; the eight repair file SHA-256 values are recorded in the ignored provenance receipt and were preserved in the private checkpoint index. Production and test implementation edits remain in the approved primary Dev checkout.

## Exact source-level gap and implementation

`HOTFIX10_RESERVED_TOOLBOX_NAMES` generated `development_toolbox` as a registered-workspace, read-only `status` placeholder. `test_toolbox` used registered checkout routing and `release_toolbox` remained Desktop legacy functionality. No existing action could execute repository-owned code using portable context/checkout handles.

Promoted only `development_toolbox`, preserving all 35 public names and its status action. Its new `run_repository_process` action requires `files.write` and both portable handles. The existing `RepositoryTargetResolver.withTarget` and `LocalGitRepositoryAccessService.inContext/withContext` resolve the principal-bound portable context and exact checkout, verify the selected repository and common-directory fingerprint, enforce configured trust and freshness, and hold the existing common-repository lock. The process adapter reads starting HEAD through the guarded Git runner and rejects an exact expected-HEAD mismatch with `STALE_SOURCE` before process creation. Neither branch nor checkout is switched.

The development global dispatch deliberately omits provider-aware Git credential injection. All other global provider dispatches retain their prior authentication path. Registered test/release action schemas, routing and execution remain unchanged. No new dependency, migration, planner, build recipe, automatic validation/publication sequence or release state machine is introduced.

## Final MCP action schema

Tool name: `development_toolbox`. Execution variant (all objects reject additional properties):

```json
{
  "title": "run_repository_process",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "action",
    "params"
  ],
  "properties": {
    "action": {
      "type": "string",
      "const": "run_repository_process"
    },
    "params": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "repositoryContextHandle",
        "localCheckoutHandle",
        "program",
        "arguments"
      ],
      "properties": {
        "repositoryContextHandle": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128
        },
        "localCheckoutHandle": {
          "type": "string",
          "minLength": 1,
          "maxLength": 128
        },
        "program": {
          "type": "string",
          "enum": [
            "python",
            "node",
            "npm",
            "dotnet"
          ]
        },
        "arguments": {
          "type": "array",
          "minItems": 0,
          "maxItems": 128,
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 4096
          }
        },
        "expectedHead": {
          "type": "string",
          "minLength": 40,
          "maxLength": 64
        },
        "timeoutMs": {
          "type": "integer",
          "minimum": 100,
          "maximum": 600000
        }
      }
    }
  }
}
```

The existing central contract generates JSON Schema, strict Zod input validation, current-scope discovery and public SDK inventory. Runtime additionally enforces 4,096 UTF-8 bytes per argument, 32,768 bytes total, no NUL/CR/LF characters, and exact lowercase 40- or 64-hex-digit commit IDs. Default timeout is 60,000 ms. No workspace, registered checkout, executable path, environment or working-directory parameter is accepted. `status` retains its existing registered-workspace read form, now reporting implemented state and program identities.

## Executable, path and process policy

Application policy approves only `python`, `node`, `npm` and `dotnet`. Native runtime executables are resolved through canonical absolute application-environment PATH entries outside the selected checkout; relative entries, checkout binaries, caller paths and PATHEXT are not used. npm resolves the installed `npm-cli.js` beside Node (including the standard POSIX library layout) and runs directly under Node. There is no npm.cmd or shell fallback. Shell program names, executable command strings and inline Python/Node code reject.

Arguments remain owned by the repository process. Recognized repository paths (separators, drive/stream syntax, source/project/artifact suffixes or existing entries) and option values after `=` use the existing relative-path resolver. Traversal, absolute paths, Git metadata, redirects, hardlinks and device names reject. Combined path-bearing option forms must use a separate value or `=`. Missing output leaves may resolve only through contained ordinary parents.

`spawn` uses `shell: false`, the fixed verified checkout CWD, hidden Windows execution, ignored stdin and pipe output. Application/provider credential and application-control environment names are removed, as are Git, npm, Node/Python and native-loader/.NET injection variables. PATH excludes relative and checkout-contained entries. No application credential-store value is read or injected. Removed named secrets and substantial removed environment values are redacted, along with credential formats and public local-path redaction. Numeric runtime flags are not treated as secrets; real qualification exposed and fixed that over-redaction. Output capture drains both streams while retaining at most 65,536 bytes each. The final byte cap also follows redaction to prevent replacement expansion and drops partial trailing UTF-8 code points.

Timeout and the current MCP AbortSignal terminate the process tree: awaited fixed Windows system taskkill `/t /f`, or a detached POSIX process group with SIGKILL. Cleanup failure or failure to close is a bounded error, with cleanup/close watchdogs; successful cancellation/timeout receipts wait for child closure and cleanup completion. The Windows parent/child cleanup path is qualified, including a real SDK cancellation notification. POSIX behavior is implemented but was not exercised on this Windows host. This is intentional trusted repository-code execution, not an OS filesystem sandbox.

Results contain `program`, redacted `arguments`, `startingHead` (null for unborn HEAD), `exitCode`, `terminationReason` (`exited`, `timeout`, `cancelled`, `spawn-error`), `elapsedMs`, bounded `stdout`/`stderr` and truncation flags. A nonzero script exit is execution evidence rather than a toolbox precondition failure. Local checkout paths are not returned.

## Focused proof and commands

Extended the existing Git qualification owner with the previously uncovered process boundary: separate real SDK transports for discovery/selection/execution; exact and stale HEAD; repository mismatch and replaced metadata; read-scope rejection; shell identities and absolute executable paths; argument count/size/control characters; traversal/absolute/option paths, control metadata, device names, junctions and hardlinks; fixed CWD and closed stdin; nonzero exits; ordinary, path-heavy and Unicode output bounds; application/provider secret removal and full/partial-capture redaction; timeout; direct/pre-aborted cancellation; SDK cancellation and parent/child death. Existing context lifetime/principal/trust regressions remain in the same owner.

Extended existing contract proof with required portable targeting, program identities and input bounds in JSON/Zod/published inventory; updated the reserved namespace expectation to 21 remaining placeholders with 35 total public names. The existing GitHub lifecycle now runs a repository-contained build fixture through the new action, generates a 1 MiB binary, verifies it and uploads it through the existing portable local-file asset source to a curated provider. No real release is created or uploaded.

Commands and execution lanes:

- `npm run typecheck`: restricted repository lane, exit 0.
- `npm run build`: restricted lane, exit 1 with esbuild `spawn EPERM`; not a source failure or pass. Equivalent normal Windows build: exit 0, with the existing renderer chunk-size advisory.
- `node --test --test-name-pattern='RMCP repository process' test/agent-harness/git-toolbox-qualification.test.cjs`: normal Windows, initial process proof passed (one case).
- `node --test test/agent-harness/mcp-tool-contract-generation.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/external-providers/github-provider.test.cjs`: normal Windows, 29 passed/one failed. The new test used the summary API instead of the published-schema API; corrected. Generated artifact handoff and preserved existing contracts passed.
- A restricted attempt to inspect that one assertion hit Node test-runner `spawn EPERM`; equivalent focused normal Windows invocation exposed the fixture assertion above. Subsequent child-process checks use the normal Windows lane.
- `npm run build` followed by the two repair-specific name patterns: normal Windows, corrected schema and SDK cancellation passed, two cases. Repeated after the numeric runtime-flag redaction correction, two passed.
- `node --test --test-name-pattern='RMCP repository process|repository process JSON' test/agent-harness/git-toolbox-qualification.test.cjs test/agent-harness/mcp-tool-contract-generation.test.cjs`: final primary-source built-output proof, normal Windows, exit 0; two passed, zero failures/skips/cancellations, approximately 47.3 seconds.
- `npm run test:repair -- --changes tmp/rmcp-repair03-changes.json --preview`: exit 0; the existing repair planner selected 50 files and an owned production build, including preserved Git/security/test/release/provider proofs. No full/release profile was requested.
- Primary-checkout `node tmp/rmcp-repair03-run.cjs` observer runs the unchanged CLI repair profile. The first run was terminated to fix real output redaction; the second was terminated after concurrent source changes. Neither is acceptance evidence.
- Frozen repair-only snapshot `node tmp/rmcp-repair03-run.cjs`: normal Windows lane, exit 0; receipt `ab13f270-b7b3-46dc-8735-20bbed83c9e0`, source stable throughout, owned production build passed (12,894 ms), all 50 files and 423 cases passed, zero failures/skips/cancellations/unavailable/blocked files, 1,497,441 ms total (about 25 minutes). The advisory budget is `review-required`; the slowest preserved Git owners were extended operations (803,756 ms), local operations (721,326 ms) and qualification (321,662 ms). The observer preserves the repository's CLI/planner/executor and writes an ignored receipt. Snapshot extraction initially required Git long-path support; fixed fixture setup without changing source or validation policy.
- Frozen-fixture direct production-registry runtime smoke: normal Windows, exit 0 for Node 24.18.1, npm 11.16.0, Python 3.14.3 and .NET 10.0.302 using `--version`. npm succeeds with direct Node CLI execution.

## Real non-publishing qualification

The actual connected app discovered Sosaria Reforged beneath its existing configured trust and explicitly selected the clean `main` checkout at `45c88bc996b2b5bdaa9f96109a2229c98d2aee9b`. `development_toolbox` execution is rejected before harness dispatch by its cached connector contract: `action` must be `status`, `workspaceId` is required and the new process parameters are forbidden. Loaded the built host with the existing controlled build-identity client; readiness was observed. No schema refresh operation is available through this toolbox.

Qualified the real repository with separate SDK invocations against an isolated loopback endpoint using the unchanged production registry/resolver/service and the application's existing configured trusted roots. Registration is unavailable in this fixture; no trust setting is added. The exact clean main checkout is explicitly discovered/selected, then its already-existing repository build script is invoked with:

```json
{
  "program": "python",
  "arguments": [
    "scripts/release_pipeline.py", "launcher",
    "--version", "0.1.0-alpha.4", "--tag", "v0.1.0-alpha.4",
    "--feed-config", "Doc/Release/RemoteFeed.private-alpha.json",
    "--output", "build/RMCP-REPAIR03"
  ],
  "expectedHead": "45c88bc996b2b5bdaa9f96109a2229c98d2aee9b",
  "timeoutMs": 600000
}
```

The script owns its accepted tag/version and build behavior; the primitive supplies none. First execution exited 0 but its receipt could not parse due to the numeric redaction defect, which was corrected and covered. Final execution exited 0 with `terminationReason: exited`, empty stderr and elapsed 8,682 ms. Generated artifact:

- Repository-relative path: `build/RMCP-REPAIR03/SRLauncher-0.1.0-alpha.4-win-x86.zip`.
- Size: **18,607,806 bytes**.
- SHA-256: `99a08476cf1b336f7e557f5765256cec698af82cb554d653bf9016f7b74ac3ad`.

The existing `ReleaseArtifactStore.withCheckoutSource` re-resolved the portable source and independently verified ordinary-file containment, actual size/hash and a private snapshot. Subsequent `git_toolbox.status` reported the same HEAD and clean checkout. No provider publication was called. The SDK real build and curated provider upload pass; actual app-connector execution remains unqualified until its cached schema is refreshed.

## Files and handoff

Created production: `src/main/agentHarness/development/repositoryProcess.ts`.

Modified: `src/main/agentHarness/tools/toolRegistry.ts`; `test/agent-harness/git-toolbox-qualification.test.cjs`, `mcp-tool-contract-generation.test.cjs`, `reserved-toolbox-namespace.test.cjs`; `test/external-providers/github-provider.test.cjs`; `validation/capability-map.json`; `docs/user/BACKGROUND_AGENT_AND_MCP.md`.

Created report: `docs/implementation-bundles/repository-release-management-mcp/Implementer_Reports/IMPLEMENTER_REPORT_RMCP-REPAIR03.md`. Deleted no tracked file. Ignored scripts, receipts, source fixture, dependency junction and generated output are excluded from the checkpoint. The external artifact remains in the selected checkout's existing ignored build directory. Concurrent Repair03A files/hunks are intentionally excluded.

Inspected the exact repair-only private staged diff and checked its frozen source/proof bytes. `git diff --cached --check` passed; bounded private-key/token/machine-path/generated-artifact checks found zero findings and all nine source/report files decode as UTF-8. The private index excludes concurrent Repair03A changes and does not alter the shared index before checkpoint creation. One authorized checkpoint is prepared; its hash remains pending creation and is returned separately. Remaining review: refresh the app connector schema and repeat its separate real execution invocation. POSIX cleanup is not platform-qualified here. Architect review is the next task; do not continue into provider Settings repair or publish a release.
