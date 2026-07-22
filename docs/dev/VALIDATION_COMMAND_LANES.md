# Validation Command Lanes

Status: current clean-room authority
Project: ChampCity A/I
Applies to: Windows development and Phase 07/08 implementation

## Purpose

This document defines how automated and manual validation must be run and reported. It prevents sandbox limitations, stale helper scripts, service-only tests, and unperformed manual checks from being reported as product acceptance.

## Current Repository Note

The clean-room repository currently has no `scripts/` directory. `package.json` still contains stale references to:

```text
scripts/copy-renderer-assets.mjs
scripts/codex-validate.ps1
```

Those deleted legacy scripts are not available validation lanes and must not be restored from repository history merely to satisfy the old package entries.

A current Work Card that touches production integration may:

- remove stale package-script references;
- replace them with direct current commands; or
- create a new minimal helper only when the current build genuinely requires one.

A stale package entry is a repository defect to repair. It is not a reason to restore deleted governance or compatibility tooling.

## Lane 1 — Direct Clean-Room Automated Validation

Until `package.json` is corrected, use the installed local toolchain directly from the repository root:

```text
npx tsc --noEmit
npx tsc
npx vite build
node --test --test-concurrency=1
```

Interpretation:

- `npx tsc --noEmit` is typecheck.
- `npx tsc` builds Electron main, preload, shared, and TypeScript renderer outputs under `dist/`.
- `npx vite build` creates the renderer bundle under `dist/renderer/` using `vite.config.ts`.
- `node --test --test-concurrency=1` runs the compiled Node test suite after the build outputs exist.

Use the locally installed package binaries. Do not authorize a package download or dependency change merely to run validation.

## Lane 2 — Canonical Package Validation After Repair

After the active Work Card corrects `package.json`, the canonical lane should again be:

```text
npm run typecheck
npm run build
npm test
```

The package scripts must resolve only to files and commands that actually exist in the current clean-room repository.

Do not report this lane as passed while it still invokes a deleted helper script.

## Sandbox `spawn EPERM` Rule

This project has a known environment failure where sandboxed execution may produce `spawn EPERM` when Vite, esbuild, Electron, or another tool attempts to start a child process.

When that exact failure occurs:

1. record the sandbox command and the exact `spawn EPERM` result;
2. do not repeatedly retry the same command in the sandbox;
3. rerun the equivalent command in the approved normal Windows execution lane;
4. report the normal Windows result separately.

A sandbox `spawn EPERM` result is not evidence that the source failed. It is also not evidence that validation passed. Only the successful approved-lane rerun resolves the check.

Other failures are not presumed to be sandbox failures. Type errors, assertion failures, missing files, module-resolution errors, and application crashes must be investigated as repository defects.

## Validation Layers

### Static and build validation

Required for implementation passes:

- TypeScript typecheck;
- Electron/main/preload compilation;
- Vite renderer build;
- confirmation that required runtime files exist.

### Capability tests

Direct unit tests should verify bounded domain and failure behavior, including:

- artifact parsing and disposition;
- staged transaction rollback;
- source freshness and invalidation;
- lifecycle classification;
- repository containment;
- service error handling.

These tests are supporting evidence. They are not sufficient for a renderer-visible workflow.

### Production-path tests

User-facing workflow acceptance requires tests that exercise the actual product path where practical:

```text
main handler
→ preload method
→ renderer-visible action or mounted component
→ production service
→ durable artifact result
```

Production-path tests must verify at least:

- main IPC registration and invocation;
- only approved preload methods are exposed;
- renderer actions call the approved preload contract;
- coordinated bundle decisions cannot be bypassed through a generic single-document action;
- canonical artifact classification and workspace ownership;
- main-owned repository selection;
- transaction rollback through the production path;
- representative nested lifecycle progression using a curated clean-room fixture.

Source-string presence checks are not product-path acceptance by themselves.

### Non-acceptance launch smoke

When the Work Card changes runtime integration or UI reachability, launch the Electron application after a successful build and confirm only that:

- the application starts;
- the expected workspace can be reached;
- the changed action is visible and callable;
- no immediate renderer or main-process crash occurs.

A launch smoke is diagnostic evidence. It does not replace Operator usability or workflow acceptance.

Do not use Playwright unless the active Work Card explicitly authorizes it.

## Curated Fixture Rule

Use a current clean-room fixture under `test/fixtures/` for workflow tests.

Do not use the ChampCity_AI development repository’s live `planning/` corpus as the primary test project. Do not restore or emulate deleted pre–Phase 07 planning formats to keep an old corpus test passing.

## Embedded Architect and MCP Lane

Automated tests may verify:

- secure Electron web preferences;
- session partition configuration;
- allowed navigation policy;
- constrained handoff inputs;
- local error states.

They cannot prove:

- that an actual remote-content view is attached and visible;
- normal ChatGPT sign-in;
- successful artifact attachment or supported handoff;
- ChatGPT access to ChampCity MCP;
- MCP repository write-back.

The active Work Card’s Operator-observed lane must use the actual Electron application and actual integration. Record the result exactly as:

```text
Passed
Failed
Blocked
Not performed
```

Do not infer success from a configuration object, filename manifest, mock response, copied transcript, or placeholder pane.

## Operator Validation Boundary

The Implementer may perform automated validation and explicitly authorized non-acceptance smoke checks.

The Implementer must not claim:

- Operator approval;
- final usability acceptance;
- Work Card completion;
- Phase closeout;
- real external integration success when the Operator-observed lane was not completed.

Remaining Operator steps must be listed distinctly in the Implementer Report.

## Required Reporting

For each validation command, record:

- exact command;
- execution lane used;
- exit result;
- test count when applicable;
- failures and corrections;
- skipped checks and exact reason.

The final report must distinguish:

- static/build checks;
- direct service tests;
- production-path tests;
- launch smoke;
- embedded Architect/MCP result;
- remaining Operator validation.

Do not use a high test count as a substitute for explaining which production paths were actually exercised.

## Git Boundary

Validation does not authorize Git mutation.

Do not stage, commit, push, merge, rebase, tag, reset, clean, restore, or stash unless the active handoff explicitly authorizes that action. `git status --short` may be used as a read-only final check.

## Missing Legacy Protocols

Deleted execution-pass and independent-verification protocol documents referenced by the legacy final section of `AGENTS.md` are not part of the current clean-room validation lane. Do not stop solely because those deleted files are absent, and do not restore them unless a future Operator-approved Work Card explicitly requires them.
