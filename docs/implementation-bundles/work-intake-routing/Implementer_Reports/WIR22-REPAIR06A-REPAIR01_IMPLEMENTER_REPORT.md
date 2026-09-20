# WIR22-REPAIR06A-REPAIR01 Implementer Report

## Outcome

Repair Card: **WIR22-REPAIR06A-REPAIR01 — Anchor Integration Validation to Target Policy and Preserve Failure Evidence**.

**The trust, policy-transition, script-integrity, diagnostic-evidence, and architecture-registration defects are corrected, and every required validation command passes in its valid execution lane.** Stop here for Architect review. REPAIR06B and routed Development orchestration were not opened.

## Repository and source-control evidence

- Verified the current directory and Git top-level as the approved `<PROJECT_REPO>` before changes.
- Starting state: branch `repair/work-intake-routing-wir22`, HEAD `927d1bf5907a66fbcd712cc37ca538ef422d2cb2`, plus the uncommitted parent REPAIR06A implementation named by the card. The branch had no upstream; `origin` was configured. No remote freshness was claimed or fetched.
- During the long final validation run, a concurrent external Git operation checkpointed the visible parent-plus-child work as `50f505946ac0edcaa69e73fcc49ac2cbd9b58ac8` (`Checkpoint visible concurrent work before dev consolidation`), moved the checkout to `dev`, and left both `dev` and `repair/work-intake-routing-wir22` pointing at that commit. This implementation pass did not invoke that commit, checkout, fast-forward, or any other Git mutation.
- No stage, commit, branch, push, merge, rebase, tag, release, reset, clean, restore, or stash command was issued by this pass. Git mutations exercised by tests were confined to disposable fixture repositories and local fixture remotes.

## Confirmed defects and root cause

The parent provider snapshotted `.champcity/integration-policy.json` from the incoming checkout before the integration target was known. Its digest proved only consistency with incoming bytes, allowing incoming work to weaken the checks that judged it. The npm adapter separately trusted the candidate's `package.json` script body, so an incoming branch could replace a required script with an unconditional success.

The runner also counted and discarded all stdout/stderr. Its generic nonzero-exit summary could not identify the failing test or assertion passed into Integration Repair. Finally, the new runtime-governing architecture contract was absent from the architecture corpus register.

## Corrected target-owned trust boundary

- Added a bounded Git blob-read primitive for one validated repository-relative path at an exact 40–64 character commit identity. It uses application-owned `git cat-file blob`, the existing process deadline/output controls, raw byte return for exact hashing/UTF-8 validation, and no checkout/ref switch.
- The production provider is now target-aware. `createIntegrationCandidateService` first resolves the immutable integration target, then asks the provider to resolve the policy from that exact commit. Direct WIR20/WIR21 application hooks remain supported as a mutually exclusive alternative.
- The SHA-256 of the exact target-policy blob is bound into candidate identity and `validationPolicySha256`. Validation, Integration Repair revalidation, service recreation, and advancement resolve the record's exact target commit again and require the same digest and ordered check identities.
- The provider reads the bounded target `package.json` blob at the same commit and captures each required npm script's exact string. The candidate manifest must contain an identical definition before execution. Missing or changed definitions fail closed; execution still uses the isolated candidate checkout as `cwd` so trusted definitions evaluate candidate source.
- Incoming replacement policy bytes never select checks for their own candidate. The merged candidate policy is parsed with the strict supported schema before validation and advancement. A valid future policy may coexist with current target-owned checks; a missing or invalid replacement blocks advancement.

## Bounded failure evidence

- The existing 1 MiB combined process-output ceiling, per-check timeout, fixed timeout/output/non-start summaries, and process-tree termination remain in force.
- Ordinary nonzero exits retain at most 64 KiB transiently. A deterministic reducer strips terminal controls, prioritizes at most six useful test/assertion/error lines, limits each line, and caps durable adapter output at 1200 characters.
- Candidate paths are reduced to repository-relative references where safely derivable. Remaining absolute Windows, user, home, and temp paths are redacted. Credential/token/private-key shapes and key/value forms are redacted before the existing Integration Repair source-text guard accepts the summary.
- Raw stdout/stderr, full logs, environment dumps, and unbounded stack traces are not persisted. If useful safe context cannot be derived, the fixed generic failure summary remains the fallback.

## Files changed by this repair pass

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06A-REPAIR01_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/agentHarness/repository/boundedGit.ts`
- `src/main/agentHarness/repository/integrationGit.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `src/main/planExecution/integrationPolicyProvider.ts`
- `src/main/planExecution/integrationPolicyRunners.ts`
- `src/shared/integrationCandidateContracts.ts`
- `test/agent-harness/git-mutation-boundary.test.cjs`
- `docs/architecture/PROJECT_INTEGRATION_VALIDATION_POLICY.md`
- `docs/architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md`

Deleted: none.

Inspected but intentionally not changed by this child repair: `.champcity/integration-policy.json`, `src/main/planExecution/integrationPolicyFiles.ts`, `src/shared/integrationPolicyContracts.ts`, package dependencies/lockfile, `validation/capability-map.json`, renderer/preload/IPC, UI, REPAIR06B scope policy, and routed Development orchestration. No schema extension or evidence sidecar was introduced.

## Test reuse and coverage

The existing capability map and `test/agent-harness/git-mutation-boundary.test.cjs` ownership were inspected before editing. The existing suite was extended because all new risks occur at its established integration candidate/policy/Git boundary; no new permanent test file was justified.

Added scenarios prove strong target policy against weakened incoming policy, valid future-policy coexistence, invalid replacement rejection, changed and missing current npm script rejection, exact target digest receipt binding, mismatched/no-provider service recreation rejection, stale-target preservation, useful assertion/test identity retention, absolute candidate/home/temp path removal, token-fixture redaction, timeout and output-overflow fixed evidence, process-tree termination, and candidate mutation safety. The original direct-hook WIR20/WIR21 candidate and Integration Repair scenarios remain in the same passing command.

## Validation results

| Exact command | Execution lane | Observed result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows, static | Initial refactor run exited 1 with two TypeScript narrowing errors for the direct-hook/provider union. The return shape was made explicit. Subsequent runs, including the final source, exited 0. |
| `npm run build` | Restricted Windows, static/build | Exited 1 with the documented Vite/esbuild `spawn EPERM`; recorded once as a sandbox restriction, not a source result. |
| `npm run build` | Normal Windows, static/build | Final run exited 0; TypeScript, Vite, and branding copy completed, with 1658 renderer modules transformed. |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Restricted Windows, integration/capability | Exited 1 immediately with the documented test-runner `spawn EPERM`; recorded once as a sandbox restriction. |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Normal Windows, integration/capability, first run | Exited 1; 44/46 reported tests passed. The only failing leaf was the new missing-script fixture, whose setup mistakenly removed the script from the target baseline instead of only the incoming branch; its parent aggregate accounted for the second failure. Production behavior correctly failed before candidate construction. |
| `node --test --test-concurrency=1 --test-name-pattern="target-owned repository policy" test/agent-harness/git-mutation-boundary.test.cjs` | Normal Windows, focused correction | Exited 0; 13/13 reported tests passed, zero failures/skips/cancellations; 207629.8425 ms. |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs` | Normal Windows, final integration/capability | Exited 0; 46/46 reported tests passed, zero failures/skips/cancellations; 673567.3995 ms. |
| `git diff --check` | Restricted Windows, static hygiene | Exit 0 in final review. |

The full repository suite was not run because the card explicitly assigns bundle-wide regression ownership to WIR23. Packaging, launch smoke, visual acceptance, external integration, and routed Development production-path acceptance were outside scope.

## Security, path, and artifact safety

The final bounded scan found no concrete local-machine path, real credential/token/private-key material, or generated artifact in authored durable files. The runner and test intentionally contain credential-detection expressions and a clearly synthetic `fixture-secret-token-value` used to prove redaction; neither is a secret. Documentation uses repository-relative paths or `<PROJECT_REPO>`.

Runtime source remains under `src/`, tests under `test/`, and runtime code does not import `validation/`, planning records, archive material, generated output, or test behavior. No dependency, migration, compatibility path, renderer filesystem access, raw diagnostic persistence, arbitrary command contract, or AI-generated summarization was added.

## Residual limitations and next action

No visual or experiential Operator validation is required for this production policy/security/evidence repair. npm scripts remain trusted repository code rather than an OS sandbox; the repaired boundary ensures their governing policy and named script definitions come from the target, while their execution source is the candidate. Transitive files invoked by a trusted script are candidate source by design and remain subject to the check's semantics and final clean-candidate invariant.

No unresolved implementation blocker remains. Architect review is the required next action. Do not proceed to REPAIR06B or original REPAIR06 orchestration in this task.
