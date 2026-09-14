# ChampCity A/I Desktop Development Guide

## Prerequisites

Current development and packaging target Windows x64. Use:

- Git;
- Node.js 24.x;
- npm 11.x (the preferred npm version is declared by `packageManager` in `package.json`);
- the Windows facilities required by Electron and Electron Builder;
- PowerShell for the documented command examples.

`package.json` defines the supported Node/npm major-version range. The current validated reference toolchain is Node `24.18.1` with npm `11.16.0`. Do not change dependencies or download alternative tooling merely to satisfy a validation run.

## Restore dependencies

From the verified repository root, use the lockfile for a clean restore:

```powershell
npm ci
```

For an existing local development checkout where lockfile-compatible incremental installation is intended:

```powershell
npm install
```

Dependency changes must be in the active Work Card's scope. Do not regenerate the lockfile as incidental cleanup.

## Launch in development

```powershell
npm start
```

`npm start` runs the production build and then starts Electron from `dist/main/bootstrap.js`. The bootstrap preserves the `ChampCity A/I` identity, initializes per-user state, launches/connects the detached development Service Host, and opens the foreground window.

The current baseline uses Electron `44.3.0`, TypeScript, React 18, Vite, Tailwind's Vite plugin, the MCP SDK, and the managed Codex package. React is the current renderer framework, not a future direction.

## Canonical validation commands

Read [Validation Command Lanes](../dev/VALIDATION_COMMAND_LANES.md) before running these commands.

```powershell
npm run typecheck
npm run build
npm test
```

- `npm run typecheck` runs TypeScript without emitting output.
- `npm run build` compiles main/preload/shared TypeScript, creates the Vite renderer bundle, and copies required branding assets into `dist/branding/`.
- `npm test` runs the full package lane: it rebuilds and then executes Node's test runner serially.
- `npm run test:unit` rebuilds and runs the same compiled Node test lane.
- `npm run test:unit:built` runs tests against the already-built output and is appropriate only when that output is known to match the current source.

The validation hierarchy is:

1. required focused checks for the active card;
2. static typecheck and build;
3. capability and production-path tests relevant to the changed behavior;
4. a non-acceptance Electron launch smoke only when explicitly needed;
5. Operator-observed validation and acceptance, which the Implementer cannot claim.

Vite, esbuild, Electron, Electron Builder, and tests can fail in restricted execution with `spawn EPERM`. Record one restricted-lane failure, then run the equivalent command in the approved normal Windows lane. Other errors remain source or environment failures to investigate.

## Windows packaging

Packaging writes generated output under `release/`:

```powershell
npm run package:win:dir
npm run package:win
npm run validate:package:win
```

- `package:win:dir` creates `release/win-unpacked/ChampCityAI.exe` for bounded package inspection.
- `package:win` creates the NSIS installer `release/ChampCityAI-Setup-<version>.exe`.
- `validate:package:win` requires both artifacts and verifies their filenames and Windows product metadata.

Packaging is not ordinary validation and must be included in the active task scope. The current installer is interactive, targets Windows x64, and is not configured for code signing. Follow the [Release Process](../release/RELEASE_PROCESS.md) before treating an installer as publishable.

## Repository structure

```text
assets/branding/    canonical product artwork
docs/               current product, user, architecture, governance, and release docs
packaging/windows/  NSIS installer custom behavior
scripts/            repeatable build/package validation helpers
src/main/           Electron main process and workstation services
src/preload/        constrained renderer bridge
src/renderer/       React application and presentation
src/shared/         cross-boundary types and pure contracts
test/               current capability and production-path tests

dist/               generated build output
release/            generated Windows package output
```

Local development history may be retained under ignored `archive/` storage, but it is not part of the published source tree. Workflow directories such as `planning/` and `issues/` are created and governed inside user-selected project repositories when those workflows are used.

Production code, test fixtures, local historical material, generated output, and selected user-project data have different roles and precedence. The exact rules are in [Repository Code, Test, and Migration Boundary](../architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md).

## Background Agent development topology

One executable supports foreground, Service Host, and install-maintenance modes:

```text
dist/main/bootstrap.js
  -> foreground main.js
  -> --agent-harness-service-host -> detached Service Host
       -> Electron utilityProcess worker
            -> Agent Harness and MCP HTTP runtime
```

Development launches the Service Host as a detached sibling Electron process and points it at the same per-user `userData` root. Closing the foreground app does not terminate a healthy Service Host. Use the product's **Exit Background Agent** or **Restart Background Agent** controls during development; do not kill arbitrary Electron processes or delete descriptors as routine cleanup.

The main process compares build identities. Rebuilding while a Service Host is running can produce the expected **Background Agent update required** state. Restart the agent through Settings so the new compiled generation becomes current.

## Repository and worktree safety

- Read [AGENTS.md](../../AGENTS.md) and the active Operator-approved card before editing.
- Verify the repository root, current branch, remote, and dirty state.
- Operator direction and explicit task constraints define branch changes and Git mutation scope. A Work Card or Repair Card may record that scope but does not itself grant Git authority. Do not infer a default branch workflow.
- Preserve unrelated user changes and generated evidence; do not use blanket reset, clean, restore, or stash operations.
- Keep production behavior in `src/`, tests in `test/`, and temporary/historical material out of runtime imports.
- Use curated temporary project roots for tests. Do not make current tests depend on the repository's archived workflow corpus.
- Keep secrets and concrete local machine paths out of committed documentation, Work Cards, reports, fixtures, and logs.

## Governance references

- [Agent and Contributor Contract](../../AGENTS.md)
- [Work Card and Repair Card Creation Standard](../governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md)
- [Repository Code, Test, and Migration Boundary](../architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md)
- [Validation Command Lanes](../dev/VALIDATION_COMMAND_LANES.md)
- [Release Process](../release/RELEASE_PROCESS.md)
