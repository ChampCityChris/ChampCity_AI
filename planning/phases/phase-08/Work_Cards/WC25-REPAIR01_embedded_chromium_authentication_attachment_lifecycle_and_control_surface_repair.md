<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR01",
    "repairId": "WC25-REPAIR01"
  },
  "sourceRevisions": [],
  "workflowData": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR01",
    "repairId": "WC25-REPAIR01",
    "originalParentWorkCardId": "WC25",
    "title": "Embedded Chromium Authentication, Attachment Lifecycle, and Control Surface Repair",
    "status": "approved",
    "owner": "Implementer",
    "risk": "high",
    "origin": "preValidationReportReview",
    "executionAuthorized": true,
    "executionAuthorizedBy": "Operator instruction through ChatGPT on 2026-07-26",
    "separateApprovalRequired": false,
    "gitMutationAuthorized": false,
    "binding": {
      "parentWorkCardPath": "planning/phases/phase-08/Work_Cards/WC25_architect_interview_visible_embedded_surface_attachment_repair.md",
      "evidencePath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25_architect_interview_visible_embedded_surface_attachment_repair.md",
      "reviewResult": "RevisionRequested",
      "authorityRule": "Repository path and explicit document disposition control. Content hashes are non-authoritative diagnostics and cannot gate execution or review.",
      "operatorValidationDate": "2026-07-26"
    },
    "controllingOperatorFacts": [
      "Before the clean-room repair sequence, ChampCity A/I had a working authenticated embedded ChatGPT session.",
      "Current visual evidence shows Google sign-in rendering and advancing inside Electron before ChampCity invokes the workstation browser.",
      "The immediate authentication failure is caused by ChampCity navigation and popup policy, not an observed provider rejection.",
      "The required product remains embedded ChatGPT inside ChampCity A/I.",
      "No API or external-browser product substitution is authorized."
    ],
    "purpose": "Restore end-to-end ChatGPT authentication inside application-owned Chromium, correct WC25 attachment lifecycle defects, and simplify the Architect Interview control surface in one bounded repair pass.",
    "requiredRepairs": [
      {
        "id": "historical-recovery",
        "requirements": [
          "Inspect Git history and prior Phase 08 evidence read-only to recover the prior working embedded-session approach.",
          "Record inspected commits/files and recovered navigation, popup, partition, and lifecycle behavior.",
          "Do not dismiss prior working product behavior as irrelevant."
        ]
      },
      {
        "id": "embedded-authentication-chain",
        "requirements": [
          "Keep ChatGPT authentication redirects and popups inside application-owned Chromium.",
          "Use the same persist:champcity-architect partition for main and authentication surfaces.",
          "Handle window.open through an application-owned BrowserWindow, WebContentsView, or equivalent secure Electron surface.",
          "Do not call shell.openExternal for destinations classified as part of the active authentication chain.",
          "Use a constrained host classification based on the observed redirect chain.",
          "Return to and focus the main embedded ChatGPT surface after callback.",
          "Preserve the authenticated session through the persistent partition.",
          "Do not add an API path or external-browser mode."
        ]
      },
      {
        "id": "redacted-navigation-diagnostics",
        "requirements": [
          "Capture timestamp, event type, source host, destination host, frame/popup type, disposition, webContents identity, partition, and load result.",
          "Do not capture full URLs, query strings, codes, cookies, tokens, credentials, form values, DOM contents, or account identity.",
          "Use a bounded in-memory or existing redacted diagnostic mechanism."
        ]
      },
      {
        "id": "attachment-generation-authority",
        "requirements": [
          "Govern show, positive bounds, zero bounds, detach, retry, workspace exit, repository clear, and repository switch through one monotonic generation authority.",
          "Make stale destructive operations no-ops after a newer successful attachment.",
          "Prevent React Strict Mode replay and rapid leave/re-enter from detaching the current surface."
        ]
      },
      {
        "id": "truthful-detach-status",
        "requirements": [
          "Preserve zeroing and removeChildView errors.",
          "Do not report detached unless non-attachment is verified.",
          "Do not clear failures unconditionally.",
          "Allow later successful retry to clear the error."
        ]
      },
      {
        "id": "persistent-view-ownership",
        "requirements": [
          "Separate transient resize listeners from permanent view ownership cleanup.",
          "Release webContents exactly once on permanent window close even after ordinary workspace detach.",
          "Do not destroy the persistent browser session during ordinary navigation."
        ]
      },
      {
        "id": "compact-control-surface",
        "requirements": [
          "Remove scrolling from the Architect control region.",
          "Use one compact toolbar for lifecycle/browser status, Prompt/Interview selection, Copy Handoff, Refresh, and conditional Retry.",
          "Remove Selected Artifact and repeated path/status blocks.",
          "Attach Interview disposition controls to the document preview and show them only for a valid Interview selection.",
          "Show revision instructions only for RevisionRequested.",
          "Keep one concise actionable error banner.",
          "Keep document preview and embedded ChatGPT as the only normal scroll regions."
        ]
      }
    ],
    "authorizedProductionFiles": [
      "src/main/browser/architectBrowserService.ts",
      "src/main/main.ts",
      "src/preload/index.ts",
      "src/shared/workspaceContracts.ts",
      "src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts",
      "src/renderer/app/App.tsx",
      "src/renderer/styles.css",
      "One narrow shared authentication/navigation policy helper under src/shared/architectInterview/ if required",
      "One narrow browser diagnostic helper under src/main/browser/ if required"
    ],
    "authorizedTests": [
      "test/browser/architect-browser-handoff.test.cjs",
      "test/renderer/architect-browser-attachment-coordinator.test.cjs",
      "One narrow browser authentication/navigation policy test if required",
      "One narrow renderer presentation-state test if required"
    ],
    "requiredValidation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Live Electron validation at default, maximized, intermediate, and minimum supported desktop sizes",
      "Internal sign-in navigation validation without workstation browser",
      "Repeated entry, resize, repository switch, retry, and close-after-detach validation"
    ],
    "operatorValidation": [
      "Complete Google sign-in entirely inside ChampCity A/I.",
      "Confirm the workstation browser never opens during authentication.",
      "Confirm authenticated ChatGPT is visible and usable inside the embedded pane.",
      "Restart and confirm the persistent authenticated session.",
      "Confirm the control toolbar is compact and non-scrolling.",
      "Confirm dual-pane stability across required interactions and sizes."
    ],
    "prohibited": [
      "API product substitution",
      "External-browser product mode or fallback",
      "Generic impossibility claim without observed provider rejection",
      "Electron security weakening",
      "Cookie, token, credential, code, DOM, or account inspection",
      "Workstation browser-profile reuse",
      "User-agent spoofing",
      "Browser automation",
      "New dependencies",
      "Unrelated lifecycle or workspace changes",
      "Git mutation"
    ],
    "stopConditions": [
      "An actual provider page or network load returns an explicit embedded-browser or user-agent rejection after the complete authentication chain is kept inside application-owned Chromium.",
      "Internal authentication requires weakening approved Electron security settings.",
      "The repair requires protected lifecycle/evidence changes outside scope.",
      "A new dependency is demonstrably required."
    ],
    "acceptanceCriteria": [
      "The complete observed authentication chain remains inside application-owned Chromium.",
      "No workstation browser opens for classified authentication navigation.",
      "All authentication surfaces share persist:champcity-architect.",
      "Callback returns to the embedded ChatGPT surface.",
      "Prior authenticated session behavior is recovered or an actual provider rejection is documented.",
      "No API or external-browser product path is introduced.",
      "All destructive attachment operations are generation-protected.",
      "Stale cleanup cannot detach a newer attachment.",
      "Detach and zeroing failures are truthful.",
      "Close-after-detach releases the native view.",
      "Listener counts remain bounded.",
      "The Architect toolbar is compact and non-scrolling.",
      "Duplicated state/path blocks are removed.",
      "Disposition controls are preview-attached and conditional.",
      "Only preview and ChatGPT normally scroll.",
      "Both panes remain visible at required sizes.",
      "Typecheck, build, and tests pass.",
      "Live evidence records dimensions and redacted host transitions.",
      "The report distinguishes Implementer observations from Operator credentialed acceptance.",
      "No unrelated change, dependency, security weakening, prohibited inspection, Git mutation, or product-direction substitution occurs."
    ],
    "returnTarget": "work-card-building-review",
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC25-REPAIR01 Embedded Chromium Authentication, Attachment Lifecycle, and Control Surface Repair

Status: approved by Operator for immediate Implementer execution
Owner: Implementer
Phase: phase-08
Parent Work Card: WC25 — Architect Interview Visible Embedded Surface Attachment Repair
Repair sequence: 1
Origin: pre-validation Architect review and blocked Operator validation
Risk: high
Execution authorization: granted by Operator through ChatGPT on 2026-07-26
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.md`

This repair is durably and implicitly bound to:

- parent Work Card `WC25`;
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25_architect_interview_visible_embedded_surface_attachment_repair.md`;
- the WC25 Architect review with `Review.Result=RevisionRequested`;
- the Operator validation addendum and attached visual evidence from 2026-07-26;
- the referenced repository report and its explicit `RevisionRequested` disposition.

Content hashes are non-authoritative diagnostics only. A hash value or mismatch must never authorize, block, invalidate, supersede, or require reconciliation of this repair.

The Operator’s current instruction is the execution approval. Do not request another approval, activation artifact, handoff artifact, feasibility decision, product-direction decision, or API decision before implementing this card.

## Controlling Operator Direction

The following facts and directions are controlling:

1. Before the clean-room repair sequence, ChampCity A/I had a working authenticated embedded ChatGPT session.
2. The current screenshot proves Google sign-in renders and advances inside the application-owned Chromium surface.
3. The current failure occurs when ChampCity classifies the next authentication destination as external and explicitly invokes `shell.openExternal()`.
4. The required product remains an embedded ChatGPT experience inside ChampCity A/I.
5. This repair must restore the working embedded authentication path. It must not redirect the product toward an API integration or external browser because of a generic architectural preference.
6. A generic concern about embedded OAuth is not a stop condition. Only an actual observed provider rejection in the repaired application may be reported as a provider blocker.

## Purpose

Complete one bounded repair pass that:

```text
restores end-to-end ChatGPT authentication inside application-owned Chromium
+ corrects WC25 attachment lifecycle races and false-success reporting
+ replaces the overbuilt scrolling Architect control region with a compact usable surface
```

WC25 remains open. This repair returns to Work Card Building review. No Validation Record is created before Architect approval of the repair report.

## Evidence and Root Cause

### Authentication regression

Current production code treats only OpenAI- and ChatGPT-owned hosts as embedded navigation. Both `setWindowOpenHandler` and `will-navigate` call `shell.openExternal()` when a destination is outside that narrow set.

The Operator observed:

```text
ChatGPT sign-in inside embedded pane
→ Google sign-in first screen inside embedded pane
→ Google sign-in second screen inside embedded pane
→ subsequent navigation opened workstation default browser
```

This proves the immediate failure is application policy and popup/navigation handling, not an observed Google rejection.

### Attachment lifecycle defects

The WC25 Architect review identified:

1. stale React effect cleanup can submit zero bounds and detach after a newer attachment succeeds;
2. detach failures can be erased while status reports `detached`;
3. the permanent window-close release listener can be removed during ordinary workspace detach.

### Control surface defect

The Architect action region is overbuilt and scrollable. It duplicates lifecycle status, browser status, handoff status, selected document identity, repository paths, review identity, and message state. Nested scrolling was added to contain the excessive controls rather than simplifying them.

## Required Repair 1 — Recover the Prior Working Embedded Session Design

Before changing behavior, perform a read-only historical recovery pass.

Required actions:

1. Inspect Git history, prior Phase 08 reports/reviews, and surviving source for the implementation that previously produced a working authenticated embedded ChatGPT session.
2. Identify the exact prior navigation, popup, session-partition, and window/view behavior that allowed authentication to complete.
3. Reuse or restore the prior proven approach where compatible with the current clean-room architecture.
4. Record the inspected commits/files and the recovered behavior in the Implementer Report.
5. Do not dismiss the Operator’s prior working session as anecdotal or technically irrelevant.

No checkout, reset, restore, revert, stash, branch switch, or other Git mutation is authorized. Historical inspection is read-only.

## Required Repair 2 — Keep the Complete Authentication Chain Inside ChampCity

The application must not invoke the workstation default browser for the ChatGPT authentication chain.

### Required architecture

Use Electron’s application-owned Chromium surfaces:

```text
main embedded ChatGPT WebContentsView
→ application-owned authentication popup/window/view when required
→ same persistent session partition
→ authentication callback returns to ChatGPT/OpenAI
→ authentication surface closes or yields focus
→ main embedded ChatGPT surface is authenticated and usable
```

Requirements:

1. Preserve `persist:champcity-architect` as the sole Architect browser session partition.
2. Main-frame authentication redirects required by ChatGPT sign-in must remain inside application-owned Chromium.
3. `window.open()` or popup authentication requests must open in an application-owned Electron `BrowserWindow`, `WebContentsView`, or equivalent Chromium surface—not through `shell.openExternal()`.
4. Every authentication surface must use the same persistent partition and the same secure web preferences as the main Architect surface.
5. The application must preserve cookies and browser storage naturally through the shared partition. Do not copy cookies or session data manually.
6. When the flow returns to an allowed ChatGPT/OpenAI destination, close the temporary authentication surface when appropriate and focus the main embedded ChatGPT pane.
7. Re-entering Architect Interview must reuse the authenticated persistent session.
8. Restarting the application must preserve the authenticated session to the extent provided by the persistent partition.
9. Do not add an external-browser fallback button or product mode.
10. Do not introduce an API-based Architect path.

### Navigation policy

Replace the current binary OpenAI-versus-external rule with a constrained classification appropriate to this product:

- ChatGPT/OpenAI application destinations;
- authentication-provider destinations required by the observed sign-in chain;
- ordinary unrelated external destinations.

Requirements:

1. Allow the exact authentication hosts actually observed in the sign-in redirect and popup chain.
2. Do not use a universal `https` allow rule.
3. Do not permit arbitrary unrelated sites inside the Architect surface.
4. Do not invoke `shell.openExternal()` for a destination classified as part of the active authentication chain.
5. Ordinary unrelated external links may continue to use the workstation browser.
6. Host classification must be testable independently from Electron event wiring.
7. Preserve URL query strings for browser navigation, but do not log or expose them.

### Diagnostic trace

Add a bounded redacted browser-navigation diagnostic trace sufficient to debug the flow.

Permitted diagnostic fields:

```text
timestamp
event type
source host
destination host
main-frame versus popup/new-window
allow / deny / internal-auth-surface / external
webContents identifier
session partition
load success/failure code
```

Prohibited diagnostic data:

```text
full URLs
query strings
authorization codes
cookies
tokens
credentials
form values
DOM contents
account identity
```

The diagnostic trace may be an in-memory bounded ring buffer or an existing redacted application diagnostic mechanism. Do not create a general browser inspection or arbitrary logging subsystem.

### Provider rejection handling

Use the existing Electron user agent first.

If the provider returns an actual explicit rejection such as `disallowed_useragent`, unsupported-browser, or equivalent:

1. capture the exact redacted error and navigation diagnostics;
2. stop that validation attempt;
3. report the observed provider error as a concrete blocker;
4. do not convert a policy concern into a blocker before such an error occurs.

Do not implement user-agent spoofing, credential extraction, cookie copying, workstation browser-profile reuse, or DOM automation under this card.

## Required Repair 3 — Version All Attachment Lifecycle Mutations

The attachment lifecycle must have one monotonic request/generation authority covering both constructive and destructive operations.

Requirements:

1. `show`, positive bounds, zero bounds, detach, retry, workspace exit, repository clear, and repository switch must carry or resolve against the current attachment generation.
2. A detach or zero request from an older generation must be a no-op after a newer generation has attached successfully.
3. React Strict Mode effect replay must not let the first cleanup detach the second attachment.
4. Rapid leave/re-enter must not leave the view detached or zero-sized.
5. Renderer status callbacks and main-process mutations must be governed by the same current-generation rule.
6. Do not retain separate unversioned cleanup IPC calls outside the lifecycle coordinator.

## Required Repair 4 — Truthful Detach and Failure Reporting

Requirements:

1. Preserve errors from zeroing bounds.
2. Preserve errors from `removeChildView()`.
3. Do not clear attachment errors unconditionally after a failed operation.
4. Do not report `detached` unless removal succeeded or non-attachment is otherwise verified.
5. When removal fails, return `attach-failed` or an equivalent truthful failure state with `isAttachedToWindow` reflecting the best verified state.
6. A later successful retry may clear the prior error.
7. Error text must remain redacted and must not expose local absolute paths or sensitive browser state.

## Required Repair 5 — Separate Transient Attachment Listeners from Permanent Ownership

Requirements:

1. Maintain only one transient resize/layout listener for the currently attached window.
2. Remove transient listeners on ordinary detach and window replacement.
3. Preserve a permanent owning-window close hook for the lifetime of the persistent native view.
4. Closing the owning application window must release `webContents` even when Architect Interview was previously left and the view is currently detached.
5. Ordinary workspace navigation must not destroy the persistent browser session.
6. Application shutdown and permanent window close must release the native view exactly once.

## Required Repair 6 — Replace the Scrolling Control Region with a Compact UI

The Architect Interview control area must not scroll.

### Required final composition

Use one compact non-scrolling toolbar containing only:

```text
compact lifecycle state
compact embedded-browser state
Prompt / Interview segmented selector
Copy Architect Handoff
Refresh Output
conditional Retry Embedded Browser
```

Requirements:

1. Remove `overflow: auto` from the Architect action/control region.
2. Remove the separate Selected Artifact block.
3. Remove repeated repository paths and artifact paths from the toolbar.
4. Remove duplicated Browser, Surface, Handoff, and lifecycle cards.
5. Keep one concise actionable error banner only when an error exists.
6. Attach Interview disposition controls directly to the document preview header or footer.
7. Show disposition controls only when a valid Interview output is selected.
8. Show revision instructions only when `RevisionRequested` is selected.
9. Prompt selection must show no disposition controls.
10. Invalid Interview output must show one concise Needs Attention state and no disposition action.
11. The document preview and embedded ChatGPT pane are the only normally scrollable regions.
12. Preserve simultaneous visibility of document preview and embedded ChatGPT.
13. Do not add cards, dashboards, explanatory panels, or another scroll container.

## Authorized Production Files

Changes are limited to the files required for this repair:

```text
src/main/browser/architectBrowserService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/architectInterview/architectBrowserAttachmentCoordinator.ts
src/renderer/app/App.tsx
src/renderer/styles.css
```

One narrowly scoped shared authentication/navigation policy helper under `src/shared/architectInterview/` is authorized if required.

One narrowly scoped main-process browser diagnostic helper under `src/main/browser/` is authorized if required.

Do not modify Architect Interview evidence resolution, polling, review persistence, Project Intake, workflow rail, Project Planning, Phase, Work Card lifecycle services, or unrelated application behavior.

## Authorized Tests

Modify or add only narrowly relevant tests under:

```text
test/browser/architect-browser-handoff.test.cjs
test/renderer/architect-browser-attachment-coordinator.test.cjs
one new browser authentication/navigation policy test if required
one new renderer presentation-state test if required
```

Do not create Playwright tests or add dependencies.

## Required Automated Tests

### Authentication and navigation

Prove:

1. ChatGPT/OpenAI destinations remain in the main embedded surface.
2. observed authentication-provider destinations are classified as internal authentication navigation;
3. unrelated external destinations remain external;
4. an authentication popup is created application-owned rather than passed to `shell.openExternal()`;
5. the popup/auth surface uses `persist:champcity-architect` and secure preferences;
6. callback navigation to ChatGPT/OpenAI is accepted and returns focus to the main surface;
7. the external browser is not invoked for the classified authentication chain;
8. redacted diagnostics omit query strings, codes, cookies, tokens, and credentials;
9. a provider load failure is reported without inventing a success state.

### Attachment lifecycle

Prove:

1. stale cleanup after a newer attach is ignored;
2. Strict Mode replay cannot detach the current generation;
3. rapid leave/re-enter remains `attached-visible` after the current positive bounds;
4. zeroing failure is preserved;
5. `removeChildView()` failure is preserved and not reported as detached success;
6. close-after-ordinary-detach releases `webContents`;
7. repeated attach/detach does not accumulate listeners;
8. permanent close releases the view exactly once.

### UI presentation

Prove through pure presentation state and focused source assertions where appropriate:

1. the Architect control region is non-scrolling;
2. the separate Selected Artifact block is absent;
3. Prompt/Interview selection remains available;
4. disposition controls are attached to the preview and conditional on valid Interview selection;
5. revision instructions are conditional;
6. only one actionable error banner exists;
7. document preview and embedded ChatGPT remain the dual-pane workspace.

## Mandatory Validation

Run in the documented normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

When the sandbox produces the documented `spawn EPERM`, record it and rerun in the normal Windows lane.

## Mandatory Live Electron Validation by Implementer

The Implementer must launch the application and perform all non-credential steps possible without claiming final Operator authentication acceptance.

Required checks:

1. open Architect Interview at default, maximized, intermediate, and minimum supported desktop sizes;
2. confirm document preview and embedded ChatGPT remain visible together;
3. start ChatGPT sign-in;
4. confirm Google authentication remains inside application-owned Chromium through every observed page before credential submission or Operator-only interaction is required;
5. confirm no workstation browser opens during the classified authentication chain;
6. record the redacted navigation host sequence and surface type;
7. leave and re-enter Architect Interview three times;
8. resize repeatedly;
9. clear and reselect the repository;
10. test Retry Embedded Browser;
11. close the application after leaving Architect Interview and confirm clean native-view release;
12. confirm the compact toolbar has no scrollbar and the disposition controls are usable.

Do not claim authenticated ChatGPT completion unless the complete signed-in ChatGPT interface is actually visible and usable inside the application.

## Operator Validation After Architect Review

The Operator will perform the controlling authenticated validation:

1. begin from the embedded ChatGPT sign-in surface;
2. complete Google sign-in entirely inside ChampCity A/I;
3. confirm the workstation default browser never opens;
4. confirm the final authenticated ChatGPT interface is visible and usable inside the embedded pane;
5. restart ChampCity A/I and confirm the authenticated session persists;
6. confirm Copy Architect Handoff and ordinary ChatGPT interaction work;
7. confirm the toolbar is compact, non-scrolling, readable, and not visually overbuilt;
8. confirm document preview and embedded ChatGPT remain visible together at required sizes;
9. repeat workspace entry, resize, repository switch, retry, and preview scrolling without drift, clipping, overlap, or detachment.

## Explicit Non-Goals and Prohibitions

Do not:

- replace the embedded ChatGPT product with an API integration;
- add an external-browser product mode or fallback;
- claim the implementation is impossible based only on generic provider policy;
- weaken Electron sandbox, context isolation, or Node-integration protections;
- inspect or copy cookies, tokens, credentials, authorization codes, DOM contents, or account identity;
- reuse the workstation browser profile;
- spoof the user agent;
- add browser automation;
- add dependencies;
- redesign other workspaces;
- alter Architect Interview evidence or disposition semantics;
- perform Git operations.

## Stop Conditions

Stop only when one of these concrete conditions occurs:

1. an actual provider page or network load returns an explicit browser/user-agent rejection after the complete authentication chain has been kept inside application-owned Chromium;
2. preserving internal authentication requires weakening the approved Electron security settings;
3. implementation requires modifying protected lifecycle or evidence semantics outside this card;
4. a new dependency is demonstrably required.

A generic statement that embedded authentication is a bad idea, unsupported in theory, or commercially undesirable is not a stop condition.

## Acceptance Criteria

WC25-REPAIR01 is ready for Architect review only when:

1. the complete observed ChatGPT/Google authentication chain remains inside application-owned Chromium;
2. no workstation browser is opened for the classified authentication chain;
3. all authentication surfaces share `persist:champcity-architect`;
4. the final callback can return to the embedded ChatGPT surface;
5. prior authenticated session behavior is recovered or a concrete observed provider rejection is documented;
6. no API or external-browser product path is introduced;
7. destructive attachment operations are generation-protected;
8. stale cleanup cannot detach a newer attachment;
9. detach and zeroing failures are reported truthfully;
10. close-after-detach releases the native view;
11. listener counts remain bounded;
12. the Architect toolbar is compact and non-scrolling;
13. duplicated identity/status blocks and repeated paths are removed;
14. disposition controls are preview-attached and conditional;
15. only the preview and embedded ChatGPT panes normally scroll;
16. both panes remain visible together at all required sizes;
17. typecheck, build, and all tests pass;
18. live Electron validation records actual attachment dimensions and redacted authentication host transitions;
19. the Implementer Report distinguishes Implementer-observed behavior from Operator-authenticated acceptance;
20. no unrelated changes, dependency additions, security weakening, prohibited data inspection, Git mutation, or product-direction substitution occurs.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR01_embedded_chromium_authentication_attachment_lifecycle_and_control_surface_repair.md`

The report must include:

- repository, remote, branch, HEAD, and exact starting dirty-tree path inventory;
- parent WC25 path and reviewed report path/hash;
- historical recovery evidence and prior working-session approach identified;
- exact files created, modified, and deleted;
- final authentication navigation classification;
- popup/auth-surface architecture and shared partition proof;
- redacted navigation trace examples;
- confirmation that no auth destination used `shell.openExternal()` during the tested chain;
- provider errors actually observed, if any;
- attachment generation and stale-cleanup behavior;
- detach failure and permanent-close behavior;
- final compact toolbar structure;
- controls and duplicate regions removed;
- tests added or changed;
- typecheck, build, and full test results;
- live Electron results at every required size;
- repeated entry, resize, repository switch, retry, close-after-detach, and sign-in navigation results;
- exact limitations left for Operator credentialed validation;
- final repository status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Return Target

After implementation:

```text
WC25-REPAIR01 Implementer Report
→ Architect review
→ parent WC25 Work Card Building review
→ Operator validation only after Architect approval
```

## Document Disposition

Document.Status=Approved
