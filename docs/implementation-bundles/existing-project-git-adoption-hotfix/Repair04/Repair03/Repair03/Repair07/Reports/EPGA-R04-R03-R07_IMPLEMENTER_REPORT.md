# EPGA-R04-R03-R07 Implementer Report

## Scope and repository

- Repair Card: EPGA-R04-R03-R07, post-migration Dev environment hydration.
- Verified approved repository root: the managed `<PROJECT_REPO>/Dev` checkout on branch `dev`. The card baseline is an ancestor of the starting HEAD. Remote `origin` is configured; no fetch, push, or remote mutation was performed.
- The separate Main checkout and all pre-existing unrelated working-tree changes were left untouched.

## Implementation

- Added `src/main/developmentEnvironment/repositoryEnvironmentHydrationService.ts`. It consumes `detectRepositoryEcosystemProviders` in the existing `repositoryEcosystemProvider.ts` and executes the detected top-level restore commands sequentially from the Dev checkout root. It returns `ready`, `degraded`, or `not-applicable`, with bounded per-ecosystem states. One failure does not prevent later providers from running.
- Moved the proven Windows standalone Node/npm resolver into `src/main/core/windowsNpmInvocation.ts`. The release adapter retains its existing public resolver and release-specific error code through a wrapper. Hydration uses the neutral resolver and invokes the resolved `node.exe` with `npm-cli.js` and `ci`, with `shell: false` and `cwd` equal to Dev. No second npm shim resolver was added.
- The Existing Project application IPC calls hydration only when source conversion reports `applied: true`, after the exclusive source lease releases and before model-access reconciliation. Hydration errors become a degraded environment result. Source conversion remains successful and is never rolled back or automatically retried because hydration failed. Managed-ready reopen and source-neutral admission do not run hydration.
- The admission controller carries the migration-only hydration result into the Current Project context. The existing workspace banner distinguishes successful migration with a ready environment from successful migration requiring environment attention. No new environment-management UI was added.
- For ChampCity_AI, the production path is `Dev/package-lock.json` → existing npm provider → `npm ci` in `Dev` → `Dev/node_modules/.bin/tsc`. A temporary local-package fixture proved the same command creates that executable without registry access. The current Dev checkout also has `package-lock.json` and `node_modules/.bin/tsc`; no claim is made that an actual new Project conversion was performed in this implementation run.

## Files

Created: the hydration service, neutral Windows npm resolver, focused hydration test, and this report.

Modified: `src/main/agentHarness/release/releaseCommandAdapter.ts`, `src/main/main.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/existingProjectEntryController.ts`, `src/shared/workspaceContracts.ts`, `test/project-state/current-project-entry.test.cjs`, and `validation/capability-map.json`.

Intentionally not created or changed: Source Control hydration implementation, Agent Harness/MCP dependency for hydration, host-tool provisioning, package-manager mapping, recursive monorepo discovery, or new environment UI. No dependencies were added.

## Focused validation

All commands ran from the verified Dev repository root. The first `npm run build` in the restricted lane passed TypeScript and failed at Vite with `spawn EPERM`; the equivalent normal Windows lane build passed. A prior TypeScript error caused by an overbroad resolver extraction was corrected before the successful build.

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows | Pass: TypeScript and Vite production build. |
| `node --test test/development-environment/repository-environment-hydration.test.cjs` | Normal Windows focused capability | Pass: 6/6, including real local `npm ci` and `.bin/tsc` creation. |
| `node --test test/project-state/current-project-entry.test.cjs` | Normal Windows focused admission | Pass: 22/22, including lease ordering, degraded result, and managed-ready reopen. |
| `node --test test/agent-harness/windows-npm-execution.test.cjs test/development-environment/windows-development-environment-provisioner.test.cjs` | Normal Windows focused npm/provider owners | Pass: 37/37. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows catalog integrity | Pass: 5/5. |
| `node --test test/source-control/source-lifecycle-package.test.cjs test/source-control/managed-project-source.test.cjs` | Normal Windows focused Source Control | 23/24 pass. The Source Control import boundary passed. The unrelated `WIR is source-not-applicable and routed target Workflows own their source records` case failed with `Work Intake form is invalid` in `captureStructuredWorkIntake`; that service and test were not changed by this repair. |
| `npm run test:repair -- --changes tmp/epga-r04-r03-r07-changes.json --preview` | Normal Windows plan preview | Pass: plan generated without executing the broad selected suite. |
| `git diff --check` | Git static | Pending final staged check. |

The full regression suite, packaging, Electron launch, and a live end-user migration were outside this repair's focused validation scope. The failing Work Intake case remains an unrelated qualification issue for the next owner to investigate.

## Safety and checkpoint

Source Control imports no hydration service; hydration imports no Agent Harness or MCP implementation. The service does not run WinGet or the system-tool provisioner. Restore output is not copied into admission results, and only ecosystem names appear in bounded failure messages. The synthetic npm proof used a temporary local fixture and no registry or credentials.

Task-attributable files will be staged by exact path, inspected for secrets, concrete local paths, and generated artifacts, then committed with the card's checkpoint message. Commit hash pending; do not amend this report solely to add it. No Operator manual validation is required to establish the focused deterministic behavior, but live migration experience and the unrelated Work Intake test remain unverified here.
