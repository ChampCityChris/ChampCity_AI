# DER-R03 Implementer Report

Card: DER-R03 — application-led environment setup and Node/npm PATH repair.
Status: IMPLEMENTED — checkpoint pending; stop for Architect review.
Date: 2026-09-30 (Operator timezone).

## Repository and authority

Verified the approved `Dev` checkout and branch `dev`. The card's stated baseline was already behind the working checkout; the observed pre-checkpoint HEAD was `aa80474` (`RWS01 extract intake workspace shell and port Greenfield`). No branch, remote, source-control behavior, selected-project requirements, dependency, or repository hydration changes were made. Existing unrelated modifications and untracked documents were preserved. No push is in scope or was performed.

## Implementation

Removed the production Codex Environment Resolution methods, renderer/preload entrypoints, IPC channels, execution-kind union member, environment prompt, permissive environment execution policy, and terminal-feedback branches. There is no model fallback. Production source search finds no `environment-resolution`, `startEnvironmentResolution`, or former Codex environment API routes.

`DevelopmentEnvironmentRepairService.repairDevelopmentEnvironment` owns the neutral action. `resolveWorkCardApplicationContext` extracts the existing exact approved-contract/report identity rules; both ordinary Work Cards and Issue Fix Cards use this resolver and service. The API returns `DevelopmentEnvironmentPreflightResult`. Main IPC then calls a small `projectDevelopmentEnvironment` compatibility adapter to cache the neutral result for the existing execution screen. The adapter neither acquires a Codex runtime nor creates a session.

Each nonempty supported Windows preflight refreshes Machine/User environment before capability discovery/probing. Refresh failure returns a deterministic retryable blocker before probing. Readiness evidence records the initial refresh. Existing process-only environment preservation is retained.

Node, npm, and nodejs-lts declare one `node-npm` toolchain with Node as provisioning owner. Probes use the canonical standalone Node/npm resolver. Internal npm execution is `<validated node.exe> <validated npm-cli.js> --version`; public command evidence remains `npm --version`. Pair validation continues to reject Electron/ChampCity substitution, invalid npm manifests, and package/CLI escapes. Machine-path command details and absolute pair paths in probe output are bounded.

Recovery order is refresh, resolve from refreshed PATH, bounded trusted installation discovery, User PATH repair, refresh and resolve again, then semantic verification. Discovery adds only ProgramFiles/nodejs, LocalAppData/Programs/nodejs, and explicitly configured version-manager roots; it does not recursively scan or consume repository executable configuration. Environment probing excludes the application host directory. A discovered pair with failed PATH repair/verification blocks without reinstalling.

The fixed application-owned PowerShell writer preserves User PATH, compares roots case-insensitively, and appends only the exact validated installation root. Root data is passed in the child environment, never interpolated into executable script text. It needs no elevation or Machine PATH write. Post-write refresh must contain that root and resolve a valid pair.

If no valid pair exists, the existing trusted WinGet installation machinery installs the fixed `OpenJS.NodeJS.LTS` identity. One provisioning attempt is shared within a preflight. The Node requirement's constraint is selected across the complete requirement set, including when npm occurs first; npm-only contracts provision the same Node owner. Unsupported Node/npm constraints fail deterministically. npm cannot enter generic package resolution, independent installation, `winget search npm`, or an MCP provisioning path. Post-provision refresh and paired execution verification are required before readiness.

FFmpeg/FFprobe retain `-version` semantics and installed-tool provider bypass. Their existing post-provision verification remains intact.

The Development Environment panel owns `Retry Environment Setup`. Its availability derives from current preflight retryability and action progress, independently of Codex availability/model selection. Implementation remains disabled for nonready cached preflight. Historical environment run type no longer governs status, repair controls, labels, or feedback.

## Permanent proof

Extended existing owners rather than creating another permanent test file. Coverage now includes:

- real standalone resolver discovery outside PATH, Electron rejection, and CLI/package containment;
- actual stale Windows process PATH recovery from persistent environment state with no User PATH write or installer;
- persistent PATH recovery, unrelated entry preservation, case-insensitive idempotence, and failed-write no-reinstall behavior;
- absent-toolchain provisioning with npm first and the Node version constraint preserved, one Node install, and no npm search/MCP call;
- semantic Node plus npm-cli launches and bounded public evidence;
- actual main IPC and compiled preload actions for Work Cards and Issue Fix Cards, using an App Server factory that throws if called and an unavailable/null runtime manager in the IPC harness;
- current-state environment controls independently of Codex availability, and existing implementation readiness/transport boundaries.

The capability map retires obsolete model-environment branches and assigns the new permanent proof. Persistent PATH and absent-toolchain scenarios inject bounded machine/install state; they do not mutate the real workstation registry or reinstall its working tools. The acceptance qualification below uses real executables and the actual project contract.

## Full live Signal Forge qualification

Read the unchanged actual approved contract at `<PROJECT_REPO>/planning/phases/phase-1/Work_Cards/phase-1-c01_establish_the_managed_phase_1_development_foundation.md` through `DevelopmentEnvironmentPreflightService.runPreflight`, using `WindowsDevelopmentEnvironmentProvisioner`, the production `NodeCommandRunner`, real Windows Machine/User refresh, and the safe standalone resolver. No synthetic tool responses were used.

| Requirement | Observed version | Result |
| --- | --- | --- |
| node >=22.0.0 | 24.18.1 | satisfied |
| npm | 11.16.0 | satisfied |
| ffmpeg | 9.0.2-full_build-www.gyan.dev | satisfied |
| ffprobe | 9.0.2-full_build-www.gyan.dev | satisfied |

Final state: **ready**. Refresh count: **1**, before first probe. Provider-resolution/WinGet invocation count: **0**. Codex App Server invocation count: **0**. Launch evidence: Node `--version`, paired Node/npm-cli `--version`, FFmpeg `-version`, FFprobe `-version`. The pair's extra npm verification ensures a Node-only requirement cannot conceal an unusable npm executable. No persistent PATH modification or reinstall was needed on this host.

## Focused validation

All commands were run from the approved Dev checkout. Temporary drivers, change sets, logs, preview JSON, and live JSON remain ignored under `tmp/`; no generated artifacts are staged.

| Command | Lane | Exit / result |
| --- | --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | restricted static | 0; production typecheck passed |
| `npm run build` | restricted | 1; Vite/esbuild `spawn EPERM`, recorded once and rerun in normal Windows |
| `npm run build` | normal Windows | 0; final production TypeScript, Vite, branding build passed; existing bundle-size warning |
| `node --test test/development-environment/windows-environment-refresh.test.cjs test/agent-harness/windows-npm-execution.test.cjs test/development-environment/windows-development-environment-provisioner.test.cjs test/development-environment/development-environment-preflight-service.test.cjs test/renderer/work-card-building-review-workspace.test.cjs test/renderer/issue-fix-card-workspaces.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/validation/capability-map.test.cjs` | normal Windows focused | 0; 117 passed, 0 failed/skipped; about 90.65 seconds |
| `node --test test/development-environment/windows-development-environment-provisioner.test.cjs test/agent-harness/windows-npm-execution.test.cjs test/validation/capability-map.test.cjs` | normal Windows final affected recheck | 0; 59 passed, 0 failed/skipped; about 6.31 seconds |
| `node scripts/validation/cli.cjs preview --profile repair --changes tmp/der-r03-changes.json` | restricted preview | 0; exact repair/preserved-capability plan generated, not executed as a broad profile |
| `node tmp/der-r03-live.cjs <PROJECT_REPO> planning/phases/phase-1/Work_Cards/phase-1-c01_establish_the_managed_phase_1_development_foundation.md` | normal Windows live qualification | 0; all four real requirements ready, counts above |
| `git diff --check` | restricted Git read-only | 0 |

An early focused run passed 96/98: two old assertions incorrectly expected implementation eligibility during blocked/waiting preflight. Updated them to require the environment action. A later toolchain diagnostic caught path redaction treating the relative synthetic executable's `.` directory as an absolute installation root; restricted redaction to absolute validated paths and reran the affected owners successfully. Catalog preview caught unsorted coverage/identities and an unclassified existing IPC harness; corrected metadata, then preview and integrity passed. A direct restricted catalog-test launch also hit `spawn EPERM`; the normal Windows focused run supplies the passing result.

Broad/full regression, release/packaging, and visual Operator acceptance were not run: the card explicitly requires focused validation. These are named diagnostics after a current build, not a composed broad-profile receipt. No installer/network/elevation was required by the live acceptance proof.

## Changed files

Created `src/main/developmentEnvironment/developmentEnvironmentRepairService.ts`, `src/main/developmentEnvironment/workCardApplicationContext.ts`, and this report. Modified:

- `src/main/core/windowsNpmInvocation.ts`
- `src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts`
- `src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`
- `src/main/developmentEnvironment/windowsEnvironmentRefresh.ts`
- `src/main/main.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `src/renderer/app/IssueFixCardMapWorkspace.tsx`
- `src/renderer/app/codexTerminalFeedback.ts`
- `test/development-environment/windows-development-environment-provisioner.test.cjs`
- `test/renderer/work-card-building-review-workspace.test.cjs`
- `test/agent-harness/windows-npm-execution.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/support/codex-ipc-harness.cjs`
- `test/renderer/issue-fix-card-workspaces.test.cjs`
- `validation/capability-map.json`

No permanent test files, dependencies, lockfiles, project requirement edits, hydration changes, JSON workflow sidecars, or generated artifacts were created. Existing unrelated changes are excluded from the checkpoint.

## Safety, checkpoint, and next action

Task-local staged diff inspection completed. The staged manifest contains exactly 23 attributable files. The bounded credential-pattern, concrete-home-path, and generated-artifact scans passed; staged `git diff --check` passed. Checkpoint hash is pending in this report to avoid amending solely to insert the hash. Required message: `DER-R03 make environment setup application-led and repair Node/npm PATH`.

No remaining implementation blocker is known. Residual limits: the real workstation did not need registry repair or installation; those failure paths have deterministic injected-state proof. The live qualification proves machine readiness and executable semantics, while renderer tests prove controls; no claim of visual/experiential Operator acceptance is made.

After checkpoint: **STOP for Architect review**. No push, merge, or additional card execution.
