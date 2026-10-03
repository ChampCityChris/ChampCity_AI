# WSF20-REPAIR01 Implementer Report

Status: implementation and focused/live proof complete; broader composed qualification has failures. Stop for Operator audit after the checkpoint.

## Scope and repository

Worked in the approved `Dev` repository: verified `AGENTS.md`, package identity, Git root and branch `dev`. Remote `origin` remains configured; no fetch, push or release action. Starting HEAD is `52c71a28323b55222ea454723603cf72fd7d8da9`. Pre-existing untracked bundle/card documents remain preserved and excluded from this checkpoint.

## Exact files

Modified:

- `src/main/browser/architectBrowserService.ts`
- `src/renderer/app/ApplicationBrowserHost.tsx`
- `src/renderer/app/GreenfieldStageComposition.tsx`
- `src/renderer/app/ProjectIntakeWorkspace.tsx`
- `src/renderer/styles.css`
- `src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts`
- `test/browser/architect-browser-handoff.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`
- `test/renderer/greenfield-shell-composition.test.cjs`
- `validation/capability-map.json`

Created this report at `docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR01_IMPLEMENTER_REPORT.md`. No deletions, dependencies, SQL entities/schema changes, authority changes, or later-stage semantic changes. No screenshots, temporary scripts, runtime profiles, or generated output included in the checkpoint.

## D01: approval progression

`ProjectIntakeWorkspace` now supplies its canonical resume callback to the existing `useWorkflowIntake` approval contract. Review retains the exact Intake record version. Approval invokes progression once; rejection and revision request invoke it zero times. Greenfield resume reloads canonical SQL navigation. Navigation no longer prepares an Architect handoff.

## D02: redundant action

Removed the local prepare function, its state/error handling, and the standalone Prepare Architect Interview button. Focused owner checks that the adapter has no support control and retains SQL Intake save identity. Handoff preparation remains inside the Architect adapter.

## D03: recovered Architect adapter

Greenfield composition uses `GreenfieldArchitectWorkspace` and passes the existing browser companion and resume callback. `StructuredArchitectWorkspace` remains available to its other consumers. Composition regression disallows importing the obsolete Greenfield adapter. Existing adapter behavior is preserved: Project Intake first, Architect Review second once present, exact SQL cycle/version disposition, and typed final candidate ingress through `workflow_toolbox.submit_stage_candidate`. The refresh regression simulates a newly available external review projection and proves Refresh selects Architect Review. Source guard forbids textarea/direct save entry. The existing reserved toolbox owner also passes in composed validation.

## D04: native browser recovery

Load failure now overrides attachment success with Browser unavailable. The latest failed main-frame diagnostic is bounded to 240 characters and displays only redacted host, event, and error code. Retry is visible for both load and attachment failure; it retries attachment and reloads the browser. Main-process recovery uses configured `loadURL` for failed, empty, or disallowed URLs, resets failure state, and preserves ordinary reload for healthy allowed surfaces. Persistent partition and all URL/security/authentication/popup policies remain intact.

Live inspection additionally found a one-pixel host caused by an obsolete four-row grid rule applied to the recovered panel. A Greenfield-scoped three-row rule restores its native content row. No other-family layout changed. Validation ownership now includes the shared attachment coordinator in its existing browser capability.

## Focused and build receipts

- Restricted `npm run build`: exit 1, Vite/esbuild `spawn EPERM`; recorded once and moved to normal Windows execution.
- Normal Windows `npm run build`: exit 0. Production TypeScript, Vite, and asset copy pass; existing bundle-size advisory remains. Repeated after the renderer diagnostic correction; exit 0.
- Normal Windows `node --test test/project-intake/post-submit-review-state.test.cjs test/project-intake/project-intake-service.test.cjs test/architect-interview/architect-interview-workspace.test.cjs test/renderer/greenfield-shell-composition.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs test/browser/architect-browser-handoff.test.cjs`: initial exit 1 because three new assertions rendered an incomplete synthetic document. Corrected those assertions; final exit 0, 61 tests passed, none failed or skipped.
- Composed profile and final production-build receipt: see below.

## Live Electron external-browser proof

Normal Windows `node tmp/wsf20-live.cjs` launched the actual built Electron app with isolated user data and a synthetic SQL project. The native folder chooser returned only that synthetic project; normal UI opened the Workflow Hub and Greenfield Architect Interview. The launched Electron application was closed after each observation.

Observed on October 3, 2026:

1. Greenfield Architect Interview opened with the approved Intake projection.
2. Native bounds: x=686, y=243, width=442, height=299 after the CSS repair.
3. `https://chatgpt.com/` finished main-frame loading. Native capture visibly shows ChatGPT, Log in, and Ask ChatGPT input. Native body text agrees with the capture.
4. Clicking inside the native pane produced `webContents.isFocused() === true`.
5. Reload ChatGPT generated successful finish/stop events and restored `loaded-auth-state-unknown`.
6. Forced unsafe-port navigation produced redacted host `chatgpt.com`, event `did-fail-load`, frame `main-frame`, disposition `deny`, `success=false`, error code `-312` (`ERR_UNSAFE_PORT`). Toolbar visibly read Browser unavailable and exposed Retry.
7. Retry navigated back to configured ChatGPT, retained native contents/session, restored positive bounds and `loaded-auth-state-unknown`, and produced successful main-frame finish/stop events.
8. Diagnostics contained no unexpected denied OpenAI/ChatGPT navigation. The only failed/denied events were the intentionally forced unsafe-port failure.

Local evidence: `tmp/wsf20-live-final-receipt.txt`, `tmp/wsf20-live-native.png`, and failed-state renderer capture. Electron renderer/window captures omit the native child compositor, so visual page evidence uses the native WebContents capture, with measured attachment bounds and focus recorded separately. No signed-in account, prompt submission, or remote MCP authorization was required or claimed.

## Safety and checkpoint

Reviewed exact attributable diff and `git diff --check`; no whitespace errors. Exact staged additions were scanned: zero secret-material or concrete-local-path findings; all 12 staged files are attributable source, tests, validation metadata, and this report; no generated artifacts. SQL authority and browser security are preserved. Required checkpoint: `WSF20-R01 restore Greenfield Architect progression and browser`. Commit hash pending at report creation; actual hash is returned to the Operator after commit. No push.

## Remaining Operator work

Audit the repaired Intake-to-Architect experience and residual broader qualification failures below. No D05-D08 work undertaken. This checkpoint ends the authorized card scope.

## Composed repair receipt and broader limits

- Restricted change-set generation hit Git `spawnSync EPERM`; the following `npm run test:repair -- --changes tmp/wsf20-changes.json --preview` read an older local change set, exited 0, and is not counted as repair proof. Regenerated the correct change set. Subsequent composed execution rejected the unclassified shared coordinator path. Its existing capability source pattern was extended, without changing runtime behavior.
- Normal Windows `npm run test:repair -- --changes tmp/wsf20-changes.json`: interrupted, exit 1; selected broader tests stalled. Stopped only this task's validation process tree.
- Normal Windows `node tmp/wsf20-validate-repair.cjs`: executes repository planner/executor profile `repair` with unchanged selected paths, preserved `architect-browser`, and 60000 ms per-file timeout, matching prior bundle bounds. Exit 1; run `fcfd723b-2268-4ad9-9c60-593ed86a2160`; 151573 ms; 77 files, 70 passed, seven failed/incomplete; known counts 506 tests / 498 passed / eight failed, with four incomplete files lacking final counts. The run-owned production build passed (exit 0).

- `test/agent-harness/repository-io-hardening.test.cjs`: failed; counts {'tests': 11, 'pass': 10, 'fail': 1, 'skipped': 0, 'cancelled': 0}.
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`: execution-failed; timeout; counts {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}.
- `test/project-planning/project-planning-service.test.cjs`: execution-failed; timeout; counts {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}.
- `test/project-state/current-project-entry.test.cjs`: execution-failed; timeout; counts {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}.
- `test/project-state/execution-completion.test.cjs`: failed; counts {'tests': 25, 'pass': 19, 'fail': 6, 'skipped': 0, 'cancelled': 0}.
- `test/renderer/project-rail-presentation.test.cjs`: failed; counts {'tests': 27, 'pass': 26, 'fail': 1, 'skipped': 0, 'cancelled': 0}.
- `test/source-control/managed-project-source.test.cjs`: execution-failed; timeout; temporary-resource-cleanup-failed; counts {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}.

The receipt also reports `sourceStable=false`, `source-changed-during-validation`. No tracked implementation source was edited during execution; a generated renderer test module appeared under `test/renderer/.tmp-renderer-module-H2C5fH/` and remained after interrupted execution. Its exact file and empty directory were boundary-verified and removed without recursive cleanup. Independent final focused proof was rerun after cleanup; all 61 passed, exit 0. Neither that pass nor live browser proof relabels this broader receipt as green. Prior WSF20 reports flag several of these owners; not every failure here has been independently proven pre-existing. No out-of-card fixes were attempted. Local machine receipts remain under ignored `tmp/`.
