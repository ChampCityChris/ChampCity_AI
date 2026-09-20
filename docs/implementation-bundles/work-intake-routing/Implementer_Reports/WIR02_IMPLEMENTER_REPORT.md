# WIR02 Implementer Report

## Outcome and baseline

Work Card **WIR02 — Promote Deterministic Git Mechanics into Application Source-Control Service** passes its focused acceptance. Checkpoint hash is pending the single harness commit containing this report; the execution response records the actual hash.

- Verified the working directory and Git top-level identify the approved `ChampCity_AI` repository (`<PROJECT_REPO>`).
- Branch: `codex/work-intake-routing`, no upstream. `origin` remains configured; no remote synchronization of the implementation branch occurred.
- Starting head: `361774c6e4c1d8aaf83f902a69c02ac04b5f54a3`, the verified WIR01 checkpoint. Its exact message, three attributable files, report, and single-commit ancestry from the bundle baseline were inspected. The working tree was clean before WIR02.
- WIR01 produced the required route contracts and passed its reported validation. No dependency mismatch was found.
- Architecture remains at SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`; the governing application-owned Git requirements agree with this extraction. Current bounded Git, repository inspection, MCP adapter, source mapping, focused tests, and capability-map entries were inspected.

## Files and implementation

Created:

- `src/shared/sourceControlContracts.ts`
- `src/main/sourceControl/sourceControlService.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR02_IMPLEMENTER_REPORT.md`

Modified:

- `test/agent-harness/git-mutation-boundary.test.cjs`

Deleted: none.

The main-process service binds a repository identity/root and exposes status, branch inspection, history/ancestry, staged/unstaged diff, changed files, readiness, branch prepare/switch/delete, staging, commit, fetch, push, and fast-forward. Existing bounded functions perform mutations and existing repository functions provide inspection; the unchanged MCP adapter shares those same mechanics. Fixed bounded Git calls add staged diff and null-delimited changed-file evidence without an arbitrary command interface.

Receipts carry repository identity, operation, timestamps, before/after branch and commit, and typed operation results. Failures identify precondition/operation/receipt phase and possible mutation, with completed results retained if subsequent receipt inspection fails. Runtime filesystem roots are omitted from the receipt. The service rejects non-Git directories and subdirectories that could otherwise fall through to a parent repository.

Existing path/ref/message/clean-tree/non-interactive checks remain in the reused mechanics. No construction-time Git hook, Work Intake binding, automatic commit/push/integration, provider dependency, semantic merge resolution, persistence, IPC, or renderer feature was created. The service requires an inspectable committed Git baseline. Workflow lifecycle orchestration remains future-card work.

## Validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows, installed toolchain | Exit 0 |
| `npm run build` | Approved normal Windows | Exit 0 |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs test/agent-harness/repository-file-operations.test.cjs` | Approved normal Windows | Exit 0; 37 passed, 0 failed, 0 skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

WIR01 established that the restricted lane cannot spawn esbuild; WIR02 used the documented normal Windows lane for build/process-heavy tests without repeating that environmental failure.

Static/build checks passed separately from capability/service proof. All product Git mutations and remote operations in tests used disposable repositories and local bare remotes. No external Git-hosting proof, launch smoke, or visual acceptance is claimed. Full regression is reserved for WIR23; packaging is out of scope.

Test categories:

- Reused unchanged: existing MCP Git behavioral tests and repository file-operation suite.
- Extended: AST dependency-boundary proof now includes the application service, preserving the prohibition on workflow decision-service imports.
- New permanent test: `application source control returns attributable receipts and preserves Git safety without MCP`, in the existing Git boundary suite. Coverage gap: existing proof could call only the MCP transport/low-level boundaries and could not establish application-callable receipts, exact-root rejection, or a no-MCP call path. The test exercises actual disposable Git operations, including renamed filenames, bounded staging, local remote synchronization, and failures.
- Consolidated/retired: none. Capability-map metadata and unrelated WC02 work were preserved.

## Checkpoint and safety

Intended message: `WIR02: Promote Deterministic Git Mechanics into Application Source-Control Service`.

The checkpoint contains exactly the four listed files. It uses the supplied ChampCity harness `git_toolbox` for bounded staging and committing. No branch rewrite, bundle merge, push, tag, release, or publication is performed. Shell Git commands are read-only.

Authored-file and exact staged-diff inspection found no secrets, concrete local-machine paths, generated files, dependency state, or archive imports. `git diff --cached --check` passed. Durable references are repository-relative or use `<PROJECT_REPO>`. Build output stays ignored. The successful harness `pre_commit_scan` reported only eight existing branding PNGs, all unchanged and unstaged; no finding applies to this card. The final staged report is re-inspected before committing.

## Remaining work

No WIR02 blocker or Operator manual validation remains. Receipts conservatively require inspection after a failed mutation; they do not promise rollback. Existing remote hosting remains optional. No later lifecycle behavior is claimed.

After verifying this single checkpoint and clean repository state, read WIR03 and its dependency reports. The Electron-to-service/browser refactor remains out of scope.
