# Implementer Report - RMCP-REPAIR03A

Status: repair implemented; returned for Architect review. Live Operator authentication acceptance remains outstanding.

## Authorized scope and repository

The Operator selected Repair Card RMCP-REPAIR03A, Forgejo application Settings configuration/authentication only. Verified `<PROJECT_REPO>` is the primary Dev source checkout: its AGENTS.md, card, package manifest and Git root agree. Branch: `dev`. Origin is the existing ChampCityChris/ChampCity_AI GitHub remote. No remote fetch, push, merge, tag, branch or worktree change was performed. Starting HEAD: `0d242f1c` (RMCP-REPAIR02). Other RMCP-REPAIR03 edits were already present. An independent run committed them as `789af2ea8e560467ba38157279682341737458ff` during this validation. They are outside this checkpoint; the final unstaged diff contained only this repair, including its three capability-map hunks.

## Exact RCA and repair

1. Bare Forgejo form/label controls missed Agent Harness-scoped CSS. Added an independently scoped repository-hosting form and field layout, structured span labels, bordered/background/padded controls, focus/disabled states, ordinary Settings-style buttons and wrapping authentication actions. Desktop uses two columns; the <=700px fallback uses one. The password field remains visibly present before connection persistence.
2. Settings allowed mixed-case IDs while the validator required the existing lowercase grammar. The main-process save boundary trims/lowercases IDs before validation; the renderer sends the same canonical ID and adopts returned canonical metadata. Namespace casing remains unchanged. The identifier grammar and reserved GitHub ID remain enforced.
3. API-route and HTTP-policy failures were hidden. Added API endpoint helper text and field-associated invalid state; validation distinguishes identifier, API endpoint, explicit HTTP API permission, namespace and SSH policy failures. No `/api/v1` or installation subpath is guessed.
4. Renderer catches destroyed error meaning. Main Settings IPC now catches errors and returns a small typed success/error-code envelope. Error codes select a fixed message/field catalog; exception messages, stacks, details, paths and credentials never cross this error boundary. Preload forwards the envelope and renderer unwraps locally. A real Electron smoke exposed that rejected Error custom properties were lost through contextBridge; the final envelope crosses as data and passes that production check.
5. Authentication becomes enabled only for an unchanged saved connection. Successful save replaces settings, editing ID and draft and reports `Connection saved - authentication required.` Credential save clears the password state immediately, preserves expectedConfigurationId, then requests provider status. All action completion/failure paths clear token state. Readiness diagnostics distinguish authentication/namespace failure, unreachable provider and changed settings. Refresh settings provides an actual CAS recovery action.

Before: labels/values merged, token control lacked visible chrome, mixed-case IDs failed, and every save error collapsed to a generic message. After: separated visible controls, explicit endpoint guidance, canonical saved ID, password enable/disable guidance, specific bounded errors, and ready/authenticated identity after verified fixture authentication.

## Files

Modified:

- `src/main/externalProviders/forgejoHostingAdapter.ts`
- `src/main/externalProviders/repositoryHostingSettings.ts`
- `src/main/externalProviders/repositoryHostingIpc.ts`
- `src/preload/index.ts`
- `src/shared/repositoryHostingContracts.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/ForgejoProviderSettings.tsx`
- `src/renderer/styles.css`
- `test/external-providers/forgejo-hosting.test.cjs`
- `test/renderer/github-provider-settings.test.cjs`
- `validation/capability-map.json` (only this repair's three hunks staged)

Created: this report. The Operator-provided previously untracked Repair Card is included as the governing artifact. No files were deleted. No dependencies, plaintext credential store, project registration, migrations, MCP token arguments, remote-ownership changes or release orchestration were created. Temporary logs, screenshots, scope JSON, Electron profile and smoke driver remain ignored under `tmp/`.

## Validation and evidence

All executable changes were final before the following successful focused build/receipt. Commands ran from `<PROJECT_REPO>`.

| Command | Execution lane | Actual result |
| --- | --- | --- |
| `npm run test:repair -- --changes tmp/rmcp-repair03a-changes.json --preview` | restricted Windows | Exit 0 after correcting sorted capability metadata; 117 selected files. Initial preview attempts rejected the new metadata ordering before correction. |
| `npm run test:repair -- --changes tmp/rmcp-repair03a-changes.json` | restricted Windows | Exit 1, receipt `926fabbc-bae6-4ad8-84d0-d7d3dc87a1b7`: production-build launch failed with `spawn EPERM`. Recorded once, then moved to normal Windows. |
| Same composed command | normal Windows | First run interrupted for the contextBridge result-contract correction; no pass claimed. |
| Same composed command, final executable sources | normal Windows | Exit 1, receipt `30eff849-6d0f-486c-8b27-e4f50fe2164a`: build exit 0; 115/117 files passed, 880 passing cases and one pre-existing opt-in skip. Two Git owners exited 1 because the Implementer interrupted them at approximately five minutes before reading the earlier report documenting their 10-12 minute runtime. Those interruptions were execution mistakes, not observed assertion/source failures. Both owners were subsequently rerun successfully. The independent RMCP-REPAIR03 commit also changed HEAD during the run; the receipt correctly reports `sourceStable:false`, `source-changed-during-validation`. This receipt is not a clean composed candidate qualification pass. Duration approximately 1,316 seconds; advisory budget `review-required`. |
| `node --test test/renderer/github-provider-settings.test.cjs test/external-providers/forgejo-hosting.test.cjs test/external-providers/github-provider.test.cjs` | normal Windows | Final focused diagnostic exit 0: 30/30 cases passed, zero skips/failures, approximately 132 seconds. An earlier attempt caught recursion in the new renderer test walker; corrected its handling of undefined children. |
| `node --test test/renderer/github-provider-settings.test.cjs` | normal Windows | Exit 0: 3/3 after walker and result-envelope corrections. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-reporter=tap test/agent-harness/git-toolbox-extended-operations.test.cjs test/agent-harness/git-toolbox-local-operations.test.cjs` | normal Windows | Exit 0: all 13 preserved Git cases passed, zero skips/failures/cancellations, approximately 783 seconds. No premature runtime bound on this rerun. |
| `node tmp/rmcp-repair03a-stable-focused.cjs` | normal Windows, repository ValidationExecutor with explicit catalog owners | Exit 0. Fresh production build exit 0 (approximately 13 seconds). Receipt `ba40efb3-4a4f-4473-8cd1-2dc6d86febf0`, revision `789af2ea`, `sourceStable:true`: all four relevant owners and 45/45 cases passed, zero failures/skips/unavailable proof, approximately 128 seconds. Owners: Forgejo hosting (8), GitHub provider (19), provider Settings/preload (3), Agent Harness Settings (15). The Vite >500kB chunk advisory did not fail the build. |
| `node tmp/rmcp-repair03a-desktop-smoke.cjs` | normal Windows, isolated real Electron app | Functional/visual smoke completed successfully. Early smoke-driver selector/window-minimum assumptions were corrected. The driver initially revealed the real contextBridge loss of custom rejected-error properties; production correction was verified on rerun. Completed smoke exited its Electron app; its remaining driver session was closed after the success marker. No token was entered. |
| `git diff --check`; `git diff --cached --check`; `git -c core.whitespace=-blank-at-eol diff --cached --check` | restricted Windows read-only Git checks | Working diff exit 0. Default staged check exit 2 only for the Operator-provided card's intentional two-space Markdown line breaks; preserved that original formatting. Staged check permitting those line breaks exit 0; exact staged diff reviewed. |

The one broad-run skip was `Windows qualification probes bundled and normal managed current/latest without ambient MCP` in `test/work-card-building/codex-runtime-manager.test.cjs`, gated by `CHAMPCITY_IRR_RUNTIME_QUALIFICATION`. That unrelated opt-in external runtime qualification was not enabled. No packaging, release/full regression or live-token acceptance was attempted. The explicit focused receipt is bounded repair evidence, not a substitute claim that the broad composed receipt passed.

The existing renderer provider owner was extended with the previously uncovered visible Forgejo controls and connection/authentication state regression. It asserts the scoped styling/one-column fallback, canonical ID/draft, action enable/disable states, bounded field/CAS messages, expected credential IPC, immediate token clearing, post-auth status and refresh. Existing GitHub proofs remain intact. The provider owner tests main-boundary normalization, valid endpoint persistence, safe invalid-ID/API/namespace/HTTP codes, bad/mismatched auth status, CAS and absence of synthetic credentials from metadata/status.

Desktop smoke launched the repaired Electron build with an isolated temporary profile. An empty profile lands on project selection; the test-only driver routed the actual App hook to Settings without registering any Project/workspace. Actual main/preload/renderer persistence verified the card's non-secret URL/namespace/HTTPS values, mixed-case `Forgejo` -> `forgejo`, a field-specific error for the server root, a valid save, password enablement, disabled empty authentication button, and a connection-status check. Computed text/select/password/button borders and nonzero dimensions were verified, and screenshots were visually inspected. Desktop grid: two 421.5px columns. At an explicitly resized 650px window (test-only minimum size override), the grid became one 498px column. The driver entered no token and performed no repository mutation. This is a non-acceptance smoke; live authenticated readiness is not claimed.

## Credential and artifact safety

The existing WindowsRepositoryHostingCredentialStore remains the production default. Tokens travel only through the Settings credential method and are not added to connection-save inputs, provider metadata, Git URLs or MCP arguments. Synthetic provider tests verify stored credentials by bounded fixture-store calls and assert absence from providers.json, Settings reads, provider status, Git arguments/config/results and MCP results. The password value is cleared before awaiting credential storage and also in finally after failures. Fixed error messages contain no raw provider/IPC/OS exception text. No real token was requested, entered, captured or included in this report or screenshots.

Bounded scans of repair additions found no private-key blocks, recognized credential literals or concrete home/machine paths; all attributable source/fixture/doc files decoded as valid UTF-8. Final staged artifacts were reviewed separately. Temporary generated artifacts are ignored and not staged. The real desktop providers.json contained only approved metadata keys (including the opaque credential reference), with no token/password property. No secure credential architecture changes were made.

## Git checkpoint

Only repair-attributable files and three repair-only capability-map hunks are staged after exact diff review. Checkpoint hash: pending at report creation; the actual hash will be returned after the required checkpoint, without amending this report solely to insert its own commit hash. No push is part of this repair.

## Remaining review and acceptance

The Operator must perform visual/experiential acceptance in the normal desktop profile, enter their real token manually, confirm Check connection identifies the expected login with readiness ready and an empty password field, and independently verify `integration_toolbox.provider_status({providerId:"forgejo"})` reports configured/ready. Fixture MCP readiness is automated evidence, not evidence of the live Atomic Forge account. Do not mutate a repository during that acceptance.

Residual validation limitation: the broad composed receipt remains failed/source-unstable for the documented execution interruptions and independent concurrent commit. Its two interrupted owners passed on rerun, and a fresh source-stable focused receipt proves the repaired Settings/provider path plus unchanged GitHub/Agent Harness Settings. Architect review may require a later uninterrupted whole repair profile on a frozen checkout before wider candidate integration. Do not reinterpret the current broad receipt as passed. There is no unresolved failing assertion in the observed focused or preserved-Git evidence. No live Atomic Forge authentication success is claimed.

Recommended next task: Architect review of this bounded checkpoint, followed by Operator live-token acceptance. Any wider Git-toolbox qualification defect requires its own scoped disposition rather than expansion of this Settings repair.
