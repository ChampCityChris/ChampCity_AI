# Implementer Report - WC25 Architect Interview Visible Embedded Surface Attachment Repair

Pass type: numbered Work Card implementation
Work Card: `planning/phases/phase-08/Work_Cards/WC25_architect_interview_visible_embedded_surface_attachment_repair.md`
Repository path inspected: verified approved repo root
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
Remote status at start and finish: tracking `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`
Git mutation authorized: no
Git mutation performed: no
Commit created: no
Commit hash: not applicable because no commit was authorized or created

## Starting Dirty Tree Inventory

The repository was already dirty before WC25 edits. Starting inventory included modified production, renderer, shared, planning, and test files, plus untracked Phase 08 Work Cards, Implementer Reports, validation records, shared helper directories, and renderer tests.

Pre-existing dirty/protected paths were treated as user/prior-pass work and were not reverted. WC25 changes were kept to the Work Card allowlist plus the single authorized shared helper.

## Files Created

- `src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts`
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25_architect_interview_visible_embedded_surface_attachment_repair.md`

## Files Modified

- `src/main/browser/architectBrowserService.ts`
- `src/main/main.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`
- `src/shared/workspaceContracts.ts`
- `test/browser/architect-browser-handoff.test.cjs`

## Files Deleted

None.

## Files Intentionally Not Created

- No dependency files.
- No migrations.
- No provider SDKs.
- No external-browser mode.
- No permanent screenshot or build-output evidence inside the repo.
- No Markdown-only Work Card artifact.

## Protected Files

WC25-protected files were not edited by this pass:

- `src/main/architectInterview/architectInterviewContextResolver.ts`
- `src/main/architectInterview/architectInterviewService.ts`
- `src/main/integrations/architectMcpHandoffService.ts`
- `src/shared/architectInterview/architectInterviewRefreshState.ts`
- `src/shared/workspaces/projectRailPresentation.ts`
- `src/renderer/app/NestedWorkflowRail.tsx`
- WC22, WC23, and WC24 Implementer Reports

Some protected files appeared in the starting dirty tree from earlier work. This WC25 pass did not modify or revert them.

## Implementation Summary

Architect Interview now uses a workspace-specific viewport grid:

```text
row 1: compact workspace heading/actions
row 2: compact bounded Architect action area
row 3: minmax(0, 1fr) document preview + embedded ChatGPT workspace
```

The generic selected-workspace panel and generic `CurrentWorkspaceBanner` are no longer rendered in Architect Interview. The remaining Architect action area contains lifecycle status, browser attachment/load status, Copy Architect Handoff, Refresh Output, Prompt/Interview selector, and the conditional prompt/review/needs-attention region.

The dual-pane document/browser region receives the remaining viewport height. The document preview scrolls internally, the ChatGPT native surface scrolls internally, and the Architect outer surface does not vertically scroll around the native host.

The action bar is bounded with internal scrolling at constrained viewport heights so compact controls cannot collapse the main workspace at the minimum desktop size.

## Attachment Diagnostic Contract

`ArchitectBrowserFoundationStatus` now includes:

```ts
attachment: {
  state:
    | "detached"
    | "attaching"
    | "attached-zero-bounds"
    | "attached-visible"
    | "attach-failed";
  isViewCreated: boolean;
  isAttachedToWindow: boolean;
  isVisible: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    sequence: number;
  };
  lastError?: string;
}
```

`attached-visible` means the native view is attached to the current main window and its latest accepted bounds have width and height greater than zero.

`surfaceMode` was removed from production contracts, status construction, renderer use, and tests. The product surface is embedded ChatGPT only.

## Renderer Attachment Sequence

The renderer now uses a deterministic attachment coordinator:

1. Wait for the Architect browser host DOM element.
2. Measure the host.
3. Require positive width and height, retrying bounded `requestAnimationFrame` layout-settle attempts.
4. Call `showArchitectBrowser()`.
5. Send measured bounds with a fresh sequence number.
6. Verify the returned status is `attached-visible`.
7. Preserve a generation token so stale completions cannot overwrite newer attempts.

Returned status now advances the renderer sequence floor, so a retry after a newer zero-bounds diagnostic cannot be rejected as stale.

React Strict Mode replay is handled by invalidating the prior generation during cleanup. Leaving Architect Interview invalidates pending work, zeroes bounds, and hides/detaches the native view.

## Retry Behavior

`Retry Embedded Browser` appears only when Architect Interview is active and attachment state is `detached`, `attached-zero-bounds`, or `attach-failed`.

Retry remeasures the current host, rejects zero-size layout with a clear error, calls `showArchitectBrowser()`, applies current positive bounds, and clears the prior attachment error only after `attached-visible` is verified.

`Refresh Output` remains a repository-output refresh and was not repurposed as browser retry.

## Main-Process Attachment Lifecycle

The browser service now tracks:

- whether a `WebContentsView` exists;
- whether it is attached to the current main window;
- latest accepted bounds sequence;
- zero-bounds transition state;
- attachment errors;
- one resize listener for the attached window.

Repeated attach is idempotent. Window replacement removes listeners from the prior window. Ordinary workspace navigation detaches and zeroes the view without closing `webContents`. Permanent window close releases the native view.

Repository clear and workspace selection now detach the existing Architect browser surface before changing the selected workspace.

## Tests Added Or Changed

Updated `test/browser/architect-browser-handoff.test.cjs` for attachment diagnostics and native lifecycle behavior:

- detached status with no view;
- created but unattached view not visible;
- attached zero bounds;
- attached positive bounds;
- latest sequence wins;
- positive after zero restores visible;
- detach zeroes bounds;
- no duplicate listeners;
- window replacement listener cleanup;
- permanent window close releases the native view.

Added `test/renderer/architect-browser-attachment-coordinator.test.cjs` for:

- zero-size host rejection;
- show-before-bounds ordering;
- stale generation ignored;
- Strict Mode replay protection;
- retry generation and current measurement;
- retry failure preserving error;
- retry success clearing error;
- leaving workspace invalidating pending work;
- source assertions for Architect-only layout, no generic banners, no external mode, and conditional retry.

## Commands Run And Results

- `pwd`
  - Result: confirmed approved repo root.
- `git status --short --branch`
  - Result: repository dirty before and after; no git mutation performed.
- `npm run typecheck`
  - Lane: sandbox.
  - Result: passed.
- `npm run build`
  - Lane: sandbox.
  - Result: failed with documented Vite/esbuild `spawn EPERM`.
- `npm run build`
  - Lane: normal Windows.
  - Result: passed.
- `npm test`
  - Lane: sandbox.
  - Result: failed with documented Vite/esbuild `spawn EPERM`.
- `npm test`
  - Lane: normal Windows.
  - First post-test-addition run: failed 3 new async harness tests; fixed test harness microtask timing.
  - Final result: passed, 300 tests, 0 failures.
- Temporary live Electron validation script outside repo.
  - Lane: normal Windows.
  - Result: passed final run.

## Live Electron Validation

Live validation used a temporary user-data root and selected the verified approved repo root. Evidence JSON and screenshots were saved outside the repo under a visualization scratch location and were not committed.

Visual inspection note: renderer `BrowserWindow.capturePage()` does not reliably include native child-view pixels, so OS-level captures were also taken. OS capture showed the native ChatGPT sign-in surface rendered inside the embedded pane.

| Size | attachment.state | attached | visible | bounds.width | bounds.height | Document preview visible | Embedded ChatGPT visible | Overlap/clipping |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| default 1160 x 780 | `attached-visible` | true | true | 424 | 230 | true | true | none |
| maximized | `attached-visible` | true | true | 897 | 503 | true | true | none |
| intermediate 1280 x 860 | `attached-visible` | true | true | 487 | 292 | true | true | none |
| minimum 900 x 620 | `attached-visible` | true | true | 288 | 105 | true | true | none |

Additional live exercises:

- Entered and left Architect Interview 3 times: final state remained `attached-visible`; minimum-size bounds stayed 288 x 105.
- Resized repeatedly:
  - 1000 x 700: 340 x 167.
  - 1340 x 840: 518 x 276.
  - 1160 x 780: 424 x 229.
- Preview scroll drift check: host moved 0 pixels.
- Retry Embedded Browser:
  - Retry became available from `attached-zero-bounds` with 0 x 0 bounds.
  - Collapsed-host retry preserved zero-bounds failure.
  - Restored-host retry recovered to `attached-visible` with 424 x 229 bounds.
- Clear and reselect repository:
  - Re-entry recovered to `attached-visible` with 424 x 229 bounds.

## Validation Performed

- TypeScript typecheck.
- Production build.
- Full Node test suite.
- Live Electron validation across default, maximized, intermediate, and minimum desktop sizes.
- Repeated entry/exit.
- Repeated resize.
- Repository clear and reselect.
- Retry Embedded Browser failure and recovery.
- Preview scroll no-drift check.
- OS-level visual inspection of native ChatGPT surface inside the pane.

## Validation Skipped

No mandatory automated validation was skipped.

Operator acceptance validation was not performed by the Implementer because final product acceptance remains Operator authority.

## Security And Secret-Safety Notes

- No secrets, tokens, cookies, credentials, DOM content, account identity, or session storage were inspected or persisted.
- Attachment diagnostics contain only state booleans, sanitized errors, and bounds.
- Error sanitization redacts concrete local path-shaped text to `<PROJECT_REPO>`.
- No dependencies were added.
- No secure Electron web preferences were weakened.
- Live validation artifacts were saved outside the repo and not staged or committed.

## Final Repository Status

The repository remains dirty. WC25-intended dirty files are listed in this report. Pre-existing unrelated dirty files remain present and were not reverted.

No staging, commit, push, merge, rebase, tag, reset, clean, restore, or stash was performed.

## Blocking Questions

None.

## Manual Validation Required

The Operator should perform final acceptance by confirming the Architect Interview workspace opens with repository document preview and embedded ChatGPT visible together, retry appears only on attachment failure, and repeated workspace entry, resizing, preview scrolling, and repository switching remain usable.

## Residual Risks

- At the minimum desktop size, the action area uses internal scrolling to preserve usable pane height. This satisfies the viewport allocation repair but should be reviewed by the Operator for comfort.
- OS-level capture showed the native ChatGPT sign-in page inside the pane; final usability still depends on the Operator's ChatGPT session state.

## Recommended Next Implementer Task

After Architect review, the next task should be Operator manual validation or any Architect-requested adjustment to compact control ergonomics at minimum desktop size.

## Architect Review

Review.Result=RevisionRequested
Review.Date=2026-07-26

### Findings

1. **High — stale cleanup can detach a newer attachment.** `src/renderer/app/App.tsx` invalidates the coordinator during effect cleanup, but then separately sends zero bounds and asynchronously calls `hideArchitectBrowser()`. That destructive hide operation is not generation-token guarded and carries no attachment request identity. Under React Strict Mode replay or a rapid leave/re-enter sequence, the prior cleanup can complete after the replacement effect has successfully attached the view, detaching the current native surface. The existing Strict Mode test exercises stale `showBrowser()` completion inside one coordinator; it does not exercise the actual App cleanup zero-and-hide sequence across coordinator instances.

2. **High — detach failures are erased and reported as success.** `detachArchitectBrowserSurface()` calls `zeroArchitectBrowserSurface()` and `detachFromWindow()`, then unconditionally clears `lastAttachmentError` and returns `detached`. `detachFromWindow()` also clears the internal attached-window flags even when `removeChildView()` throws. The service can therefore report `isAttachedToWindow=false`, zero bounds, and no error while the native child view may still be attached or visible. No test injects a zeroing failure or `removeChildView()` failure.

3. **Medium — permanent close release is not guaranteed after ordinary workspace detach.** The `closed` listener that owns `releaseArchitectBrowserSurface()` is removed by `detachFromWindow()`. If the Operator leaves Architect Interview and then closes the application window, the retained persistent `WebContentsView` no longer has a window-close release hook. The current permanent-close test closes the window only while the view is still attached, so it does not cover the detached-but-retained lifecycle.

4. **Governance blocker — WC25 lacks durable approval authority.** Both WC25 siblings still identify the Formal Work Card as draft for Operator review with `Document.Status=Pending`. The repository lifecycle contract and passing lifecycle tests require an Approved Formal Work Card before Implementer execution. Chat approval may explain execution, but the repository currently has no durable Approved authority for this pass. `artifact_toolbox.review_queue` also reports `review_authority_not_configured`, and `current_action_context` reports no structured current-action authority.

5. **Evidence limitation — report attribution is not independently reproducible.** The Implementer Report describes the starting dirty tree generically rather than recording the exact starting path inventory or hashes. Because protected and unrelated prior-pass files are currently dirty, the statement that WC25 did not modify them cannot be independently proven from the present working tree alone. The live screenshots were also stored outside the repository, so MCP review can verify the reported numeric dimensions but not inspect the visual evidence.

### Root Cause Analysis

The principal architectural defect is that attachment sequencing is only partially versioned. Positive measurement, show, and bounds operations are coordinated through a generation token, but destructive lifecycle operations—zeroing and detaching—remain independent IPC calls outside that coordinator. The renderer can therefore reject stale status callbacks while still allowing stale main-process mutation.

The main-process defect is a conflation of requested state and verified state. Internal booleans are cleared after a detach attempt without proving that the child view was removed, and the public detach method erases the error generated by the failed operation. This defeats the attachment-observability contract that WC25 was intended to establish.

The resource-lifecycle defect comes from using one window-listener registration for two different responsibilities: transient resize/attachment management and permanent native-view ownership. Ordinary detach correctly removes resize behavior but incorrectly removes the only permanent-close release path.

The test gap follows the implementation boundaries. The renderer tests validate the pure coordinator rather than the actual React effect/IPC cleanup interleaving. The main-process tests validate successful detach and close-while-attached but do not inject detach failures or close-after-detach. The 300-test pass is therefore valid but not dispositive for these uncovered paths.

### Required Repair Scope

Create `WC25-REPAIR01` as a bounded pre-validation repair. It must:

1. Move zero-and-hide cleanup under a versioned attachment lifecycle authority, or add a main-process attachment generation/request token that makes stale detach requests no-ops.
2. Prove React Strict Mode replay and rapid leave/re-enter cannot let an earlier cleanup detach a newer successful attachment.
3. Preserve and return zeroing/removal errors. Do not report `detached` unless native child removal succeeded or the service can otherwise verify non-attachment.
4. Separate the persistent view-owner close listener from the transient attached-window resize listener, so window close releases `webContents` even after ordinary workspace detach.
5. Add failure-injection tests for `setBounds()` during zeroing, `removeChildView()`, close-after-detach, and stale cleanup after a newer attach.
6. Repeat the full typecheck, build, test, and live Electron interaction lane after repair.
7. Correct the WC25 authority record before the repair is treated as an authorized implementation pass, and provide exact starting dirty-tree evidence for the repair report.

### Re-Review Result

The viewport grid, attachment diagnostic schema, conditional retry, removal of `surfaceMode`, and reported live dimensions are materially aligned with WC25. However, the uncovered lifecycle races and false-success detach reporting violate core acceptance criteria 6, 8, 11, and 12. WC25 is not ready for Operator validation.

## Operator Validation Addendum — 2026-07-26

Operator validation produced direct visual evidence that the native `WebContentsView` now occupies the embedded pane and reports `attached-visible`. The visible page is the Google identity flow opened from ChatGPT sign-in. This confirms the WC25 viewport and positive-bounds repair at the observed size, but it does not establish a usable authenticated ChatGPT surface.

### Validation failure 1 — third-party sign-in leaves the embedded surface

Observed sequence:

1. ChatGPT sign-in begins inside the embedded pane.
2. Google sign-in advances to its second screen inside the pane.
3. The next navigation leaves the embedded surface and opens the workstation default browser.
4. The external browser session does not establish an authenticated session in the Electron `persist:champcity-architect` partition.
5. Architect Interview therefore remains unusable for the required ChatGPT workflow.

The immediate source cause is confirmed in `src/main/browser/architectBrowserService.ts`: embedded navigation is allowed only for OpenAI- or ChatGPT-owned hosts. `accounts.google.com` is therefore classified as external. Both the `setWindowOpenHandler` and `will-navigate` paths invoke `shell.openExternal()` for that destination.

This is not safely resolved by adding Google hosts to the embedded allowlist. Google's OAuth 2.0 policy prohibits authorization requests in embedded user-agents controlled by the application and documents `disallowed_useragent` as the expected failure mode. A `WebContentsView` or child `BrowserWindow` remains an application-controlled embedded user-agent. Allowing Google OAuth to remain inside Electron would therefore be unsupported and unreliable even if one intermediate page currently renders.

No supported mechanism has been identified for transferring the completed system-browser ChatGPT/Google session back into the isolated Electron partition without provider-supported callback integration or unsafe cookie/session copying. Cookie, credential, DOM, and session extraction remain prohibited.

Disposition: embedded-only ChatGPT plus Google SSO is currently an architectural incompatibility, not a narrow host-allowlist defect. Further Operator acceptance testing is blocked until the product chooses and proves a supported authentication path.

### Architect correction — authentication conclusion withdrawn

The preceding conclusion that embedded-only ChatGPT plus Google SSO was already proven architecturally incompatible is withdrawn. The Operator evidence does not show a Google rejection. It shows Google authentication rendering and advancing inside Electron until ChampCity's OpenAI-only navigation policy invokes `shell.openExternal()`.

Electron already hosts Chromium through `WebContentsView`. The next repair must keep the complete authentication redirect and popup chain inside the application using the same `persist:champcity-architect` partition, handle both main-frame navigation and `window.open()` without the workstation browser, and use a constrained identity-host allowlist derived from the observed redirect chain. Add redacted navigation tracing for event type, origin/host, disposition, webContents identity, and partition while excluding query strings, authorization codes, cookies, credentials, and tokens.

Test the existing Electron user agent first. Do not assume that Google's embedded-user-agent policy has blocked the flow unless an actual provider error such as `disallowed_useragent` occurs. Do not implement cookie copying, browser-profile reuse, credential extraction, DOM automation, or user-agent spoofing.

Authentication is therefore an unresolved implementation and validation defect, not a proven requirement to abandon embedded Chromium or move to an API architecture.

### Validation failure 2 — Architect control and disposition region is not acceptably compact

The Operator reports that the document disposition/control region remains visually complicated and unattractive and now introduces additional scrolling.

Source review confirms that `.architect-action-bar` uses `max-height: clamp(118px, 22vh, 190px)` with `overflow: auto`, while nested prompt/invalid-output and message regions also use bounded internal scrolling. The workspace therefore contains scrollable control surfaces in addition to the document preview and ChatGPT pane. This contradicts the intended compact toolbar behavior and the acceptance requirement that upper controls not displace or complicate the main workspace.

The current UI duplicates state and identity through lifecycle context, browser state, handoff state, Prompt/Interview choices, a separate Selected Artifact region, a conditional statement/review region, and a persistent message strip. The additional scroll is a design workaround for excessive control density rather than a satisfactory compact layout.

Required UI correction:

1. Remove scrolling from the Architect control region entirely.
2. Use one single-line toolbar containing only compact lifecycle/browser status, Prompt/Interview segmented selection, Copy Handoff, Refresh, and conditional Retry.
3. Remove the separate Selected Artifact block and repeated repository paths from the toolbar.
4. Place Interview disposition controls in a compact inline footer or header attached to the document preview only when the Interview output is selected.
5. Show revision instructions only when `RevisionRequested` is selected.
6. Show one non-scrolling error banner only when an actionable error exists.
7. Keep the document preview and embedded ChatGPT as the only normally scrollable workspace regions.

### Revised repair gate

`WC25-REPAIR01` must include the attachment-lifecycle corrections already identified and the compact-control repair above. Authentication work must begin with a feasibility gate rather than an assumption that third-party OAuth can be embedded.

The repair must determine and record one of these outcomes:

- a supported ChatGPT-native authentication path completes entirely within the persistent embedded partition without third-party OAuth; or
- the Operator approves a product change allowing an external ChatGPT surface; or
- the product replaces ChatGPT web embedding with a provider/API integration under a separately approved architecture; or
- the embedded Architect browser feature is declared blocked because no supported authentication path satisfies the embedded-only requirement.

Do not implement cookie copying, credential extraction, browser-profile reuse, DOM automation, user-agent spoofing, or a broader third-party identity-host allowlist as a workaround.

Operator validation is suspended. WC25 remains `RevisionRequested` and must not enter validation or close until authentication feasibility, attachment lifecycle integrity, and control-pane usability are resolved.

## Operator Binding Correction — 2026-07-26

The prior feasibility-gate alternatives are superseded by the Operator’s controlling direction and the approved repair pair:

- `planning/phases/phase-08/Work_Cards/WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.md`
- `planning/phases/phase-08/Work_Cards/WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.json`

The repair is approved for immediate Implementer execution and is implicitly bound to this RevisionRequested report. It must restore authentication inside application-owned Chromium, correct attachment lifecycle defects, and simplify the control surface. No separate approval, activation artifact, API direction, external-browser product decision, or preliminary feasibility pass is required.

The Operator’s prior working authenticated embedded ChatGPT session is controlling product evidence. A generic concern about embedded authentication is not a blocker. Only an actual provider rejection observed after the repaired authentication chain remains inside ChampCity may be reported as a provider blocker.

## Document Disposition

Document.Status=RevisionRequested
