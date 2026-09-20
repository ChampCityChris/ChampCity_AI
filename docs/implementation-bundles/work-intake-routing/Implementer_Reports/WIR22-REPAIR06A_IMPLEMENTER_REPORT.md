# WIR22-REPAIR06A Implementer Report

## Outcome

Repair Card: **WIR22-REPAIR06A — Establish Project Integration Validation Policy**.

**Implementation and required validation passed.** No repository Git mutation has occurred. The card's checkpoint instruction remains pending direct Operator direction under `AGENTS.md`'s Git authority rule.

## Repository and baseline evidence

- Verified the current directory and Git top-level as the approved `<PROJECT_REPO>` before changes.
- Branch: `repair/work-intake-routing-wir22`; no upstream configured.
- Starting HEAD: `927d1bf5907a66fbcd712cc37ca538ef422d2cb2` (`Document REPAIR06 policy split`). Starting working tree and index were clean.
- Verified required REPAIR05 checkpoint `89744cb2704596aeb9acda6f254c845b7775c1af` is an ancestor of HEAD. The intervening commit documents the policy split.
- `origin` is configured for the ChampCity repository. No fetch or other remote operation was performed on `<PROJECT_REPO>`; remote freshness is not claimed.
- Read the card, failed REPAIR06 report, repository boundary, validation lanes, validation-governance standard, card-creation standard, affected source, current package scripts, `.champcity` namespace owner, and the boundary suite's capability-map entry.

## Confirmed defect and root cause

`createIntegrationCandidateService` required a bounded nonempty set of trusted validation callbacks, but the production tree had no provider that resolved checks for the selected Repository. Existing fixtures injected callbacks directly. The governance standard named semantic lanes without defining project-specific executable policy.

Preserved fail-before evidence is the failed REPAIR06 report and the inspected starting source. Read-only `git cat-file -e HEAD:src/main/planExecution/integrationPolicyProvider.ts` failed because that production module does not exist at the starting checkpoint. The old callback fixtures cannot prove repository policy resolution; the new provider tests would have no baseline module to load. No working-tree rollback or fabricated baseline pass was used.

## Implementation and policy schema

- Added the strict version 1 shared policy contract: exact root/check/runner fields, 1–32 unique declared checks, nonempty ordered required check references, bounded identities, semantic lanes, and registered runner parameters.
- Added a 64 KiB UTF-8 JSON loader with ordinary-file checks, repository containment, no symlink/junction redirection, bounded descriptor reads, and file identity verification. Required policy errors fail closed with controlled diagnostics.
- Added an application-owned runner registry with the initial `npm-script` adapter. It checks the candidate's bounded `package.json`, selects only an existing exact script, and launches the installed host npm toolchain through a non-shell process adapter in the registered isolated candidate checkout.
- Fixed npm flags prevent workspace expansion, implicit pre/post scripts, silent missing-script success, and interpreter replacement through `.npmrc`. Policy supplies neither arbitrary command text nor extra arguments. No toolchain/dependency installation was added.
- Check duration is bounded to at most 900000 ms; combined stdout/stderr is capped at 1 MiB. Timeout/output overflow terminates the process tree. Raw diagnostics are discarded; durable results retain only existing `IntegrationValidationEvidence` fields and fixed semantic summaries.
- The provider supplies both `checks` and a policy identity guard. The policy SHA-256 is bound into candidate identity and retained in the canonical Markdown receipt. Source/candidate policy changes, including changes across service recreation, prevent stale target advancement. Existing direct application hooks remain supported.
- Documented the contract in `docs/architecture/PROJECT_INTEGRATION_VALIDATION_POLICY.md`. Existing Plan/Intake freshness, Git isolation, repair mechanics, Work Card validation selection, and product authority remain in place.

Current ChampCity policy, in execution order:

| Check ID | Lane | Existing script | Timeout |
| --- | --- | --- | --- |
| `champcity-typecheck` | `static` | `typecheck` | 120000 ms |
| `champcity-build` | `static` | `build` | 120000 ms |
| `champcity-regression-built` | `full-regression` | `test:unit:built` | 900000 ms |

The build runs once. The regression script consumes existing compiled output rather than invoking the build-containing aggregate scripts. This integration policy does not expand this repair's validation scope.

## Files

Created:

- `.champcity/integration-policy.json`
- `src/shared/integrationPolicyContracts.ts`
- `src/main/planExecution/integrationPolicyFiles.ts`
- `src/main/planExecution/integrationPolicyRunners.ts`
- `src/main/planExecution/integrationPolicyProvider.ts`
- `docs/architecture/PROJECT_INTEGRATION_VALIDATION_POLICY.md`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06A_IMPLEMENTER_REPORT.md`

Modified:

- `src/shared/integrationCandidateContracts.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `test/agent-harness/git-mutation-boundary.test.cjs`

Deleted: none.

Intentionally not created/changed: routed Development orchestration, Integration Repair editable-scope policy, UI/preload/IPC, package scripts/dependencies/lockfile, runtime behavior under `validation/`, capability-map schema, evidence sidecars, migrations, or a new permanent test file. REPAIR06B was not opened.

## Validation and test changes

Existing proof was inspected first. The original WIR20/WIR21 candidate scenarios and unrelated boundary tests remain. The same boundary suite now owns additional policy schema/containment checks and production-provider candidate scenarios. These address previously uncovered configuration authority, policy identity, isolated npm execution, and resource/failure boundaries; they are not source-shape assertions. No tests were consolidated or retired, and no separate suite was introduced.

The current-policy composition probe verifies the real ChampCity policy's IDs against existing package scripts, then executes those identities with controlled fixture script bodies in a disposable registered candidate. It proves provider selection, ordering, and isolation; it does not claim execution of ChampCity's full regression suite. The fixture also tests implicit lifecycle suppression and `.npmrc` overrides.

| Exact command | Execution lane | Observed result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows, static | Exit 0 on all three runs, including the final provider/runner source. |
| `npm run build` | Restricted Windows, static/build | Exit 1: Vite/esbuild `spawn EPERM`. Recorded once as infrastructure restriction; not a source failure or pass. |
| `npm run build` | Normal Windows, static/build | Exit 0 on both normal-lane runs, including the final provider/runner source. Final renderer build transformed 1658 modules. |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Normal Windows, integration/capability, first run | Exit 1; 42 reported tests, 32 passed, 10 failed (nine new fixture setup failures and their parent), zero skipped/cancelled; 471920.6627 ms. All existing candidate/repair scenarios passed. |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Normal Windows, integration/capability, corrected run | Exit 0; all 43 reported tests passed, zero failures/skips/cancellations; 638921.9706 ms. |
| `git diff --check` | Restricted Windows, static hygiene | Exit 0 during implementation and final safety review. |

The first test run's nine policy failures were `EEXIST` during fixture setup: the shared workspace helper already created `.champcity`. The fixture now uses idempotent directory creation, and policy scenarios run before the preserved candidate scenarios. This was a test setup defect, not a policy runner result. The npm interpreter is pinned explicitly and tested against a conflicting `.npmrc` setting. The corrected passing run uses the final rebuilt source and fixtures.

Observed passing policy evidence covers malformed/oversized/redirected configuration, exact-schema rejection, missing/duplicate identities, required ordering, unsupported adapters, script and argument injection rejection, source-checkout execution rejection, current-policy composition in an isolated checkout, missing npm scripts, nonzero execution with discarded diagnostics, timeout with script/descendant termination, output overflow, policy mutation during execution, stale source/candidate policy, service recreation, and attempted omission of the policy guard. Failed cases preserve the target. All original WIR20/WIR21 scenarios also passed, including conflict repair, retry, target isolation, Operator decision, and worker Git-state rejection.

Skipped deliberately: full repository suite (explicitly prohibited by this card), launch smoke, packaging, desktop visual acceptance, external integration, and routed Development production-path acceptance. The changed provider/service path is exercised by direct production-service tests with real local Git/npm processes, not a renderer/UI workflow.

## Git, security, and remaining work

No stage, commit, branch change, push, merge, rebase, tag, release, publication, reset, clean, restore, or stash on `<PROJECT_REPO>`. Git mutations in tests are confined to disposable fixture repositories and local fixture remotes. No external publication is involved.

A bounded PowerShell scan of the exact 10 changed/new files passed with zero credential-pattern, concrete user/temp-path, or generated-artifact findings. An initial inventory expression incorrectly grouped filenames and produced read errors; its apparent success line was discarded, and the corrected flattened inventory ran with terminating errors enabled. Runtime modules remain under `src/`; tests remain under `test/`. The provider does not import `validation/`, planning records, archived material, or test behavior. Durable authored documentation uses repository-relative paths or `<PROJECT_REPO>`; process diagnostics are not persisted by the new adapter. Final post-validation checks confirmed the listed file scope, empty staged diff, unchanged branch, and retained starting HEAD.

No visual or experiential Operator validation is required for this provider-only scope. Actual full-regression integration execution and routed Development acceptance remain future evidence. npm scripts are trusted repository code, not OS-sandboxed code; the application supplies bounded selection/process handling. Missing prerequisites fail closed. Exact-byte policy identity intentionally treats formatting changes as stale policy.

Remaining checkpoint: after successful validation and Operator-directed Git scope, create exactly one commit with the card's specified message: `WIR22-REPAIR06A: Establish Project Integration Validation Policy`. No commit hash exists for this pass yet. The present request authorizes implementing the card; `AGENTS.md` explicitly states that a card itself is not a Git permission source.

Recommended next task after checkpoint: the independent REPAIR06B task specified by the card. Stop in this task; do not proceed into REPAIR06B or routed orchestration.
