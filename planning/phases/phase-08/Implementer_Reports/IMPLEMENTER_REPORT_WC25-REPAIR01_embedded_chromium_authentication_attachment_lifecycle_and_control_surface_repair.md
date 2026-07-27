# Implementer Report - WC25-REPAIR01 Embedded Chromium Authentication, Attachment Lifecycle, and Control Surface Repair

Pass type: numbered repair Work Card  
Work Card: `planning/phases/phase-08/Work_Cards/WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.md`  
Parent Work Card: `planning/phases/phase-08/Work_Cards/WC25_architect_interview_visible_embedded_surface_attachment_repair.md`  
Reviewed WC25 report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25_architect_interview_visible_embedded_surface_attachment_repair.md`  
Reviewed report authority: repository path plus explicit document disposition. Content hashes are non-authoritative diagnostics and are not workflow gates.

## Repository And Git State

Repository path inspected: verified approved repo root.  
Remote: `origin` -> `https://github.com/ChampCityChris/ChampCity_AI.git`.  
Branch at start and finish: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.  
HEAD at implementation time: `f723bbf3eff6c65b2e5d168ddfbfa1b1199a72f1`.

Starting dirty-tree inventory was recorded before edits. It already contained modified Phase 08 Work Cards, production files, renderer files, shared contracts, tests, untracked Phase 08 Work Cards, untracked Implementer Reports, untracked Validation Records, untracked `src/shared/architectInterview/`, untracked `src/shared/workspaces/projectRailPresentation.ts`, and untracked `test/renderer/`.

Git mutation was not authorized. No checkout, switch, stash, reset, stage, commit, tag, rebase, merge, or push was performed.

## Historical Recovery

Read-only history inspected:

- `git log --oneline --decorate --all -- src/main/browser/architectBrowserService.ts src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts src/renderer/app/App.tsx test/browser/architect-browser-handoff.test.cjs`
- `git grep -n "setWindowOpenHandler|openExternal|partition|WebContentsView|accounts.google" 7708682 -- src`
- `git grep -n "setWindowOpenHandler|openExternal|partition|WebContentsView|accounts.google" ce19abe -- src`
- `git grep -n "setWindowOpenHandler|openExternal|partition|WebContentsView|accounts.google" f723bbf -- src`
- `git show 7708682:src/main/main.ts`
- `git show ce19abe:src/main/main.ts`

Recovered prior approach: earlier embedded work used an application-owned Electron browser surface with a persistent Architect partition, loaded `https://chatgpt.com`, and did not install the later narrow OpenAI-only `shell.openExternal()` policy on ChatGPT authentication navigation. The earlier partition was `persist:champcity-architect-bridge`; the current clean-room authority requires and now preserves `persist:champcity-architect`.

## Files Created

- `src/shared/architectInterview/architectBrowserNavigationPolicy.ts`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.md`

## Files Modified

- `src/main/browser/architectBrowserService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`
- `test/browser/architect-browser-handoff.test.cjs`
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`

## Files Intentionally Not Created

No validation record, external-browser product mode, API-based Architect path, dependency, Playwright test, cookie/session migration, credential helper, browser-profile reuse, user-agent spoofing, or general browser-inspection subsystem was created.

## Implementation Summary

Authentication navigation now uses a shared testable policy:

- ChatGPT/OpenAI application destinations: OpenAI-owned HTTPS hosts, including `chatgpt.com`, `chat.openai.com`, and OpenAI subdomains.
- Observed authentication-provider destination: `accounts.google.com`.
- Ordinary unrelated destinations: external.

`setWindowOpenHandler` and `will-navigate` no longer send classified authentication navigation to `shell.openExternal()`. Authentication popups are application-owned Electron windows with the same `persist:champcity-architect` partition and the same secure web preferences as the main embedded surface. Callback navigation to a ChatGPT/OpenAI destination closes the auth window, loads the callback in the main embedded surface, and focuses the main app window.

The browser service now keeps a bounded in-memory redacted diagnostic trace. It records timestamp, event type, source host, destination host, frame/popup type, disposition, webContents id, partition, and load result code. It does not store full URLs, query strings, codes, cookies, tokens, credentials, form values, DOM contents, or account identity.

Attachment lifecycle now carries one generation through show, positive bounds, zero bounds, detach, retry, workspace exit, and stale cleanup. A stale detach or stale zero-bounds request is ignored after a newer generation has attached. Detach and zeroing failures are preserved and reported as `attach-failed` rather than being erased as successful `detached` state.

Window ownership was split into transient resize listeners and a permanent owning-window close hook. Ordinary detach removes resize listeners without destroying the persistent browser session. Closing the owning app window releases the native webContents once, including after ordinary workspace detach.

The Architect Interview control surface is now one compact non-scrolling toolbar containing lifecycle state, embedded browser state, Prompt/Interview selector, Copy Architect Handoff, Refresh Output, and conditional Retry Embedded Browser. The separate Selected Artifact block, repeated path/status blocks, and toolbar review controls were removed. Interview disposition controls now live on the document preview and appear only for a valid Interview output; Prompt selection shows no disposition controls.

## Tests Added Or Changed

Browser tests now cover:

- ChatGPT/OpenAI embedded destinations.
- `accounts.google.com` internal authentication classification.
- unrelated external destinations.
- auth popup creation with `persist:champcity-architect` and secure preferences.
- callback return to the main embedded surface.
- redacted diagnostics without query/code/token leakage.
- provider load failure without invented success.
- stale detach generation protection.
- zeroing and removeChildView failure reporting.
- close-after-detach release and bounded listeners.

Renderer/coordinator tests now cover:

- generation-carrying detach.
- Strict Mode/stale completion behavior.
- retry generation behavior.
- compact source layout assertions for the dual-pane workspace.

## Validation Performed

- `npm run typecheck` in sandbox lane: passed.
- `npm run build` in sandbox lane: failed with documented Vite/esbuild `spawn EPERM`.
- `npm run build` in normal Windows lane: passed.
- `npm test` in sandbox lane: failed with documented Vite/esbuild `spawn EPERM` during nested build.
- `npm test` in normal Windows lane: passed, 308 tests passed.

Safety scans:

- local path scan across touched repair files: no concrete local machine paths found.
- secret/token scan across touched repair files: no obvious secrets, API keys, credentials, access tokens, refresh tokens, or private keys found.

## Live Electron Smoke

Lane: normal Windows live app smoke using the freshly built Electron app. This was non-acceptance Implementer validation only.

Observed:

- Fresh app launched from the rebuilt Electron output.
- Default/restored window snapshot: `1147 x 774`.
- Maximized window snapshot: `2048 x 1072`.
- The compact toolbar had no visible toolbar scrollbar.
- Document preview and embedded ChatGPT pane remained visible together at restored and maximized sizes.
- The embedded surface reported `attached-visible`.
- Prompt/Interview segmented selector, Copy Architect Handoff, and Refresh Output were visible in the compact toolbar.
- Selected Artifact block was absent in the fresh repaired app.
- Prompt selection showed no disposition controls; the preview showed the prompt non-review message.
- Clicking `Continue with Google` kept Google sign-in inside the embedded ChampCity pane.
- Workstation browser window count stayed unchanged during that Google step.
- Redacted live host sequence observed visually: `chatgpt.com` to `accounts.google.com`.
- Repeated leave/re-enter of Architect Interview three times preserved `attached-visible`.
- Closing the application after leaving Architect Interview removed the Electron window.

Provider errors actually observed: none. No `disallowed_useragent`, unsupported-browser, or equivalent provider rejection was observed during the non-credentialed smoke.

## Validation Skipped Or Limited

Credentialed completion was not performed. The Implementer did not enter account credentials, OTPs, passwords, or account identity and did not claim authenticated ChatGPT acceptance.

The Google flow was stopped at the Google email entry page. The second credentialed page, final callback after credentials, authenticated ChatGPT usability, and restart persistence remain Operator validation.

Minimum-size and intermediate drag resizing could not be truthfully completed through the available Windows automation; the attempted drag left the window at the restored `1147 x 774` size. Restored and maximized layouts were validated.

Retry Embedded Browser was not clicked in the live app because the surface was healthy and the conditional retry button was not visible. Retry behavior is covered by automated coordinator tests.

Clear and reselect repository was not performed in the live app to avoid changing the selected workspace through a file dialog during this no-Git-mutation repair pass. Repository clear/switch detach behavior is covered by the generation-aware renderer/main path and existing workspace controls remain present.

## Manual Validation Required

The Operator must complete Google sign-in inside ChampCity A/I, confirm the workstation browser never opens, confirm authenticated ChatGPT is visible and usable inside the embedded pane, restart the app and confirm session persistence, test Copy Architect Handoff with ordinary ChatGPT interaction, and complete the remaining visual/usability checks at the required supported sizes.

## Residual Risks

The provider may still reject embedded authentication after credentials are entered. That was not observed in this pass and must be treated as a concrete Operator/provider validation result, not an assumed blocker.

Because the repository had extensive pre-existing dirty and untracked Phase 08 work, this report identifies the repair-intended files but cannot convert the whole dirty tree into a clean attribution boundary without prohibited Git mutation.

## Final Repository Status

Final status remained dirty with the pre-existing Phase 08 work plus the repair files listed above. No Git mutation occurred.

Recommended next Implementer task: execute the approved and implicitly bound `WC25-REPAIR02` correction before Operator validation resumes.

## Architect Review — Operator Visual Findings

Review.Result=RevisionRequested
Review.Date=2026-07-26

### Finding 1 — Raw attachment diagnostic is exposed as browser status

The repaired UI displays `attached-visible` in both the compact Architect toolbar and embedded-browser pane header. That value is an internal native-view attachment and positive-bounds diagnostic. It does not describe ChatGPT loading, readiness, authentication, or usability. Exposing the enum as product language is misleading even though the internal attachment result is technically correct.

The same screen displays `Loading ChatGPT...` while the Operator confirms the embedded page is already authenticated and usable. Source review shows the browser service enters `loading` on `did-start-loading` but does not use `did-stop-loading` to derive a stable main-surface ready presentation. The load state can therefore remain stale during ChatGPT single-page application activity.

### Finding 2 — Successful copy confirmation is styled as an error

The successful message `Architect handoff copied. Paste and send it manually in the embedded Architect chat.` is rendered through the same `.architect-action-message` region used for attachment and polling errors. The region has fixed red error styling. The implementation has no explicit success, informational, or error presentation type.

### Finding 3 — Right-click Paste is missing from embedded ChatGPT

The application registers a native context menu only on the local ChampCity renderer `webContents`. The main embedded ChatGPT `WebContentsView` and application-owned authentication windows have no constrained `context-menu` handler. Keyboard paste works because Chromium handles `Ctrl+V`, but right-click editing actions are absent.

### Finding 4 — Embedded ChatGPT has no reload recovery action

`Refresh Output` refreshes repository-backed Architect output and does not reload `chatgpt.com`. No browser-service, IPC, preload, or renderer operation reloads the existing embedded ChatGPT `webContents`. This omits a necessary recovery path for a remote single-page application that can become visually stuck while preserving the current authenticated session.

### Root Cause Analysis

The common root cause is incomplete separation between internal diagnostics, product presentation, and browser-operability controls:

- attachment state was reused as user-facing browser status;
- browser loading was modeled from partial Electron lifecycle events rather than a stable main-surface presentation state;
- action feedback was modeled as one untyped string and one error-colored container;
- browser-native editing behavior was configured only for the local renderer;
- repository refresh was implemented, but browser reload was omitted as a distinct responsibility.

The REPAIR01 authentication and attachment work is materially successful: the Operator has an authenticated ChatGPT session inside the application-owned Chromium surface. These new findings do not reopen that architecture. They require a bounded browser usability and presentation correction.

### Required Follow-On Repair

The approved pair is:

- `planning/phases/phase-08/Work_Cards/WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.md`
- `planning/phases/phase-08/Work_Cards/WC25-REPAIR02_embedded_browser_status_context_menu_reload_and_feedback_semantics_repair.json`

The pair is implicitly bound to this report and approved for immediate Implementer execution. No separate approval or activation artifact is required.

Operator validation remains suspended until REPAIR02 is implemented and reviewed.

### Additional Operator Finding — Interview output source-revision dead end

After the Architect Interview Markdown and JSON documents were created, the application displayed:

```text
Needs Attention
Architect Interview output must reference the current Project Intake JSON source revision.
```

The workflow did not advance to Interview review or Project Planning.

Source review confirms that the canonical resolver requires the exact current Project Intake JSON and Architect Interview Prompt JSON path/revision entries in `document.metadata.sourceRevisions`. That validation is appropriate. The defect is upstream: the copied Architect handoff names the source and target paths but does not provide the exact source-revision entries that it later requires the Architect-authored output to contain.

The exact Revisionary output pair confirms the failure mechanism. Both current source artifacts are revision 3. The Interview JSON records each source reference with `artifactRevision: 3`, but `planningDocumentService.sourceRevisionsValue()` accepts only `revision: 3`; it therefore discards all four JSON source entries. The Interview Markdown likewise uses descriptive labels and `artifactRevision=3`, while the Markdown parser accepts only canonical `- path: <path> revision: <number>` lines. The resolver receives an empty usable `sourceRevisions` collection and correctly rejects the output.

This is a confirmed producer/consumer schema mismatch, not an unknown missing-path or stale-revision condition. The copied handoff failed to provide the exact canonical syntax, and the Architect output used the wrong field name.

`WC25-REPAIR02` Revision 4 now includes this defect and the controlling application-owned document-construction architecture. It requires exact current source-revision handling, explicit recovery of the existing Revisionary pair, and proof that approval advances to Project Planning without weakening strict validation.

The durable correction is no longer a prompt-only contract. The Operator approved the rule `LLMs create content; the application creates canonical documents` as the default for every document type. REPAIR02 must implement one shared definition registry and construction service, migrate every active creator, introduce a content-only ChampCity MCP submission action, and remove direct LLM authorship of governed Markdown/JSON envelopes.

## Document Disposition

Document.Status=RevisionRequested
