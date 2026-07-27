<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC25",
    "phaseId": "phase-08",
    "title": "Architect Interview Visible Embedded Surface Attachment Repair",
    "status": "draft_for_operator_review",
    "owner": "Implementer upon Operator approval",
    "risk": "high",
    "dependsOn": [
      "WC24"
    ],
    "executionInstruction": "Upon Operator approval, this Work Card itself is the complete Implementer instruction. Do not wait for or create a separate activation artifact.",
    "gitMutationAuthorized": false,
    "purpose": "Correct the single bounded WC24 failure where the Architect Interview workspace does not visibly provide the repository document preview and embedded ChatGPT surface together.",
    "controllingProductResult": [
      "Architect Interview remains embedded-only.",
      "Repository document preview and embedded ChatGPT must be visible together.",
      "Upper controls remain compact and cannot collapse or displace the main panes.",
      "No external-browser option exists."
    ],
    "rootCauses": [
      {
        "id": "workspace-height-collapse",
        "summary": "Upper panels consume the available Architect Interview viewport while the dual-pane workspace and browser host permit zero-height shrinkage under overflow hidden."
      },
      {
        "id": "zero-bounds-treated-as-success",
        "summary": "Renderer measurements with zero width or height are accepted by the main process, allowing an existing WebContentsView to remain invisible."
      },
      {
        "id": "attachment-not-observable",
        "summary": "Browser load state does not prove the native view is attached to the current window with positive visible bounds."
      },
      {
        "id": "one-shot-attachment",
        "summary": "Workspace entry performs a one-shot attachment attempt with no dedicated retry or deterministic generation handling."
      },
      {
        "id": "validation-gap",
        "summary": "Existing tests and process-alive smoke checks do not prove visible nonzero host dimensions or simultaneous pane visibility."
      }
    ],
    "strictScope": {
      "authorizedProductionFiles": [
        "src/main/browser/architectBrowserService.ts",
        "src/main/main.ts",
        "src/preload/index.ts",
        "src/shared/workspaceContracts.ts",
        "src/renderer/app/App.tsx",
        "src/renderer/styles.css",
        "One small shared Architect attachment presentation/coordinator helper only if required"
      ],
      "authorizedTests": [
        "test/browser/architect-browser-handoff.test.cjs",
        "One narrowly scoped renderer Architect attachment/layout state test file"
      ],
      "protectedFiles": [
        "src/main/architectInterview/architectInterviewContextResolver.ts",
        "src/main/architectInterview/architectInterviewService.ts",
        "src/main/integrations/architectMcpHandoffService.ts",
        "src/shared/architectInterview/architectInterviewRefreshState.ts",
        "src/shared/workspaces/projectRailPresentation.ts",
        "src/renderer/app/NestedWorkflowRail.tsx",
        "Project Intake files",
        "Project Planning and later lifecycle files",
        "WC22-WC24 Implementer Reports"
      ]
    },
    "requiredRepairs": [
      {
        "id": "dedicated-viewport-grid",
        "requirements": [
          "Do not render the generic selected-workspace panel in Architect Interview.",
          "Do not render CurrentWorkspaceBanner in Architect Interview.",
          "Use intrinsic heading and compact control rows followed by minmax(0, 1fr) dual-pane workspace.",
          "Guarantee a nonzero usable browser host at the default 1160x780 window and all supported desktop validation sizes.",
          "Keep document preview and ChatGPT scrolling internal.",
          "Do not change generic layout for other workspaces.",
          "Remove redundant Architect Surface and Browser status duplication."
        ]
      },
      {
        "id": "attachment-diagnostics",
        "requirements": [
          "Add attachment state values detached, attaching, attached-zero-bounds, attached-visible, and attach-failed.",
          "Expose isViewCreated, isAttachedToWindow, isVisible, current bounds, sequence, and optional lastError.",
          "Define attached-visible only as attached to the current main window with positive width and height.",
          "Keep browserState limited to load/auth state.",
          "Return attachment diagnostics from show, hide, bounds, status, and retry paths."
        ]
      },
      {
        "id": "deterministic-attachment-sequence",
        "requirements": [
          "Wait for the DOM host and positive measurement before claiming success.",
          "Use bounded requestAnimationFrame measurement retries.",
          "Use a generation token so stale effect completions cannot overwrite newer attempts.",
          "Handle React Strict Mode replay deterministically.",
          "Keep show/attach idempotent.",
          "Detach and zero on workspace exit and repository clear/switch.",
          "Keep resize updates coalesced and latest-sequence-wins.",
          "Do not restore outer-scroll bounds chasing."
        ]
      },
      {
        "id": "actionable-retry",
        "requirements": [
          "Show Retry Embedded Browser only for detached, attached-zero-bounds, or attach-failed states.",
          "Retry must remeasure, reject zero dimensions, show/attach, apply bounds, verify attached-visible, and clear errors only on success.",
          "Keep Refresh Output separate from browser retry."
        ]
      },
      {
        "id": "main-process-integrity",
        "requirements": [
          "Track actual parent-window attachment rather than architectView existence.",
          "Maintain one resize listener and remove it on detach, replacement, and permanent close.",
          "Preserve secure preferences, persistent partition, and sequence handling.",
          "Report zero bounds as attached-zero-bounds.",
          "Close webContents only on permanent application-window close."
        ]
      },
      {
        "id": "remove-residual-mode-contract",
        "requirements": [
          "Remove surfaceMode from shared contracts, status construction, renderer use, and tests.",
          "Do not replace it with another mode abstraction."
        ]
      }
    ],
    "requiredTests": [
      "No view created returns detached with zero bounds.",
      "Created but unattached view cannot report attached-visible.",
      "Attached zero-bounds view reports attached-zero-bounds.",
      "Positive bounds produce attached-visible.",
      "Stale sequence cannot replace newer bounds.",
      "Positive bounds restore visibility after zero bounds.",
      "Detach returns zero bounds and detached.",
      "Repeated attach does not duplicate listeners.",
      "Window replacement removes old listeners.",
      "Permanent close releases native view.",
      "Zero-size host does not produce visible success.",
      "Show then bounds ordering is deterministic.",
      "Stale generation completion is ignored.",
      "Strict Mode replay cannot override the current attempt.",
      "Retry uses a new generation and current dimensions.",
      "Retry failure preserves an error and later success clears it.",
      "Workspace exit invalidates pending attachment work.",
      "Architect Interview omits generic selected-workspace panel and CurrentWorkspaceBanner.",
      "Architect Interview uses a final minmax(0, 1fr) workspace row.",
      "Dual-pane structure contains document preview and Architect surface pane.",
      "No External or surface-mode control exists.",
      "Retry button is conditional on attachment failure."
    ],
    "mandatoryValidation": {
      "commands": [
        "npm run typecheck",
        "npm run build",
        "npm test"
      ],
      "liveElectronSizes": [
        "default 1160x780",
        "maximized",
        "one intermediate desktop size",
        "minimum currently supported desktop size"
      ],
      "requiredRecordedFields": [
        "attachment.state",
        "attachment.isAttachedToWindow",
        "attachment.isVisible",
        "attachment.bounds.width",
        "attachment.bounds.height",
        "document preview visible",
        "embedded ChatGPT visible",
        "pane overlap or clipping"
      ],
      "requiredInteractionChecks": [
        "Enter and leave Architect Interview three times.",
        "Resize repeatedly.",
        "Clear and reselect repository.",
        "Exercise Retry Embedded Browser when available.",
        "Confirm browser remains inside pane.",
        "Confirm no drift or snap during preview scrolling."
      ],
      "processAliveSmokeInsufficient": true
    },
    "acceptanceCriteria": [
      "Default 1160x780 shows document preview and embedded ChatGPT together.",
      "All required desktop sizes show both panes.",
      "Dual-pane workspace cannot collapse to zero height.",
      "Browser host dimensions are positive during normal use.",
      "Attachment status distinguishes detached, zero-bounds, visible, and failed.",
      "Attached-visible requires current-window attachment and positive bounds.",
      "Workspace entry deterministically attaches and verifies the view.",
      "Strict Mode replay and stale promises cannot hide a newer attachment.",
      "Retry Embedded Browser repairs recoverable failures.",
      "Refresh Output remains separate.",
      "Workspace exit and repository clear/switch detach and zero the view.",
      "Repeated entry and resize do not accumulate listeners.",
      "No External option or surfaceMode remains.",
      "Generic selected-workspace and current-workspace banners are omitted in Architect Interview.",
      "Compact controls do not displace the main workspace.",
      "Preview and ChatGPT scroll internally.",
      "No drift, snap, overlap, or pane escape occurs.",
      "Evidence, polling, review, Project Intake, rail, and later workspace behavior remain unchanged.",
      "Typecheck, build, and all tests pass.",
      "Implementer Report contains actual live dimensions and visual results.",
      "No new dependency, provider integration, DOM automation, credential inspection, hidden authority, or Git mutation is introduced."
    ],
    "stopConditions": [
      "Failure cannot be reproduced in the normal Windows application.",
      "Supported window dimensions cannot show both panes without a product decision.",
      "Repair requires protected evidence, polling, review, Project Intake, rail, or later-workspace changes.",
      "ChatGPT refuses embedding for a reason unrelated to ChampCity layout or attachment.",
      "Secure Electron settings would need weakening.",
      "A new dependency appears necessary."
    ],
    "nonGoals": [
      "General Architect Interview redesign",
      "New cards or dashboards",
      "Canonical Interview changes",
      "Invalid-output changes",
      "Polling or review changes",
      "Project Intake changes",
      "Project Planning or later workspace changes",
      "Workflow rail changes",
      "External ChatGPT mode",
      "ChatGPT automation",
      "Credential, cookie, token, DOM, session, or account inspection",
      "New dependencies",
      "Git operations",
      "WC22-WC24 Implementer Report changes"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25_architect_interview_visible_embedded_surface_attachment_repair.md"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC25 Architect Interview Visible Embedded Surface Attachment Repair

Status: draft for Operator review
Owner: Implementer upon Operator approval
Phase: phase-08
Risk: high
Depends on: WC24 Architect Interview Embedded Workspace Integrity and Usability Repair implementation and failed Operator validation
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25_architect_interview_visible_embedded_surface_attachment_repair.md`

Upon Operator approval, this Work Card itself is the complete Implementer instruction. Do not wait for or create a separate activation artifact.

## Purpose

Correct one bounded WC24 failure:

```text
The Architect Interview workspace does not visibly provide the repository document preview and embedded ChatGPT surface together.
```

Operator validation established that the embedded ChatGPT window remains unavailable. Source review established that the lower dual-pane workspace can collapse to zero height, zero native bounds are accepted as a successful update, browser status does not distinguish an existing native view from a visible attached native view, and the UI provides no deterministic attachment retry.

WC25 is not a third general Architect Interview redesign. It is a constrained viewport-allocation, attachment-observability, and retry repair.

## Controlling Product Result

At the default Electron window size and all supported desktop validation sizes, opening Architect Interview must visibly display:

```text
Repository Document Preview | Embedded ChatGPT
```

Both panes must be present at the same time. The embedded browser must be inside the application. No external-browser option exists.

The upper controls must occupy only the space needed for compact status and actions. They must not displace, collapse, cover, or hide the two main panes.

## Confirmed Root Cause

### Failure chain 1 — Main workspace height collapses

The current Architect Interview surface vertically stacks:

```text
workspace header
selected-workspace panel
current-required-workspace banner
Architect Interview action bar
dual-pane document/browser workspace
```

The surface uses `overflow: hidden`, while the dual-pane workspace and browser host use `min-height: 0`. The upper content can consume the available height and Flexbox is permitted to reduce the dual-pane workspace to zero or near-zero height.

### Failure chain 2 — Zero native bounds are accepted

The renderer sends `getBoundingClientRect()` dimensions directly to the main process. The main process clamps negative values but accepts zero width or height. A created and attached `WebContentsView` can therefore remain invisible at `0 × 0` while the application has no explicit failure state.

### Failure chain 3 — Browser status is not visibility status

`browserState` currently reflects load/auth state and whether a `WebContentsView` object exists. It does not establish that the view:

- is attached to the current main window;
- has nonzero usable bounds;
- is visible in the Architect Interview host;
- completed the latest requested attachment attempt.

### Failure chain 4 — Attachment is effectively one-shot

The renderer calls `showArchitectBrowser()` through a workspace-entry effect. A failed, stale, or zero-sized attachment does not produce a dedicated actionable state. `Refresh Output` is a repository-output refresh, not a browser-attachment retry.

### Failure chain 5 — Automated validation cannot detect an invisible view

Current tests prove URL policy, secure preferences, and bounds sequencing. They do not prove that the default application viewport allocates nonzero space to the host or that the native view is attached and visible.

## Strict Scope

WC25 may modify only:

```text
src/main/browser/architectBrowserService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/styles.css
test/browser/architect-browser-handoff.test.cjs
test/renderer/<one narrowly scoped Architect attachment/layout state test file>
```

A single small shared helper under `src/shared/architectInterview/` is authorized only if needed to model attachment presentation or deterministic retry state.

No other production file is authorized.

## Explicitly Protected Files and Behavior

Do not modify:

```text
src/main/architectInterview/architectInterviewContextResolver.ts
src/main/architectInterview/architectInterviewService.ts
src/main/integrations/architectMcpHandoffService.ts
src/shared/architectInterview/architectInterviewRefreshState.ts
src/shared/workspaces/projectRailPresentation.ts
src/renderer/app/NestedWorkflowRail.tsx
Project Intake services, corpus rules, or UI
Project Planning or later lifecycle workspaces
WC22, WC23, or WC24 Implementer Reports
```

Do not change:

- canonical Interview identity or provenance rules;
- invalid-output inspection behavior;
- evidence fingerprints or polling semantics;
- review source tokens, review hydration, or disposition persistence;
- Prompt versus Interview authority;
- workflow rail status rules;
- repository artifact schemas;
- ChatGPT handoff contents;
- browser authentication host policy, except where a direct defect is proven during implementation and reported as a blocker instead of silently changed.

If implementation appears to require any protected change, stop and report the concrete conflict. Do not broaden scope.

## Required Repair 1 — Dedicated Architect Interview Viewport Grid

Replace the current general vertical flex behavior for Architect Interview with an explicit workspace-specific viewport layout.

The Architect Interview surface must use the equivalent of:

```text
row 1: intrinsic-height workspace heading/actions
row 2: intrinsic-height compact Architect controls
row 3: minmax(0, 1fr) document preview + embedded ChatGPT
```

Requirements:

1. Do not render the generic full selected-workspace panel inside Architect Interview.
2. Do not render the generic full `CurrentWorkspaceBanner` inside Architect Interview.
3. Preserve any essential repository/current-step information in a single compact line inside the existing Architect action area. Do not create another panel.
4. The dual-pane workspace must receive the remaining viewport height through `minmax(0, 1fr)`.
5. Every ancestor from `.workspace-surface.architect-interview-surface` to `.architect-browser-host` must have an explicit `min-height: 0` chain where necessary and a defined grid/flex row that allocates real remaining space.
6. The dual-pane workspace must not depend on content height.
7. The browser host must not be permitted to collapse silently. At the default `1160 × 780` window, its measured width and height must each be greater than zero and its height must be sufficient to use ChatGPT.
8. The document preview body scrolls internally.
9. The embedded ChatGPT page scrolls internally.
10. The Architect Interview outer surface does not vertically scroll around the native host.
11. No horizontal overflow may hide either pane.
12. Do not change generic workspace layout for any other workspace.

### Required compactness

The Architect action area may contain only:

```text
lifecycle status
browser attachment/load status
Copy Architect Handoff
Refresh Output
Prompt / Interview selector
conditional Prompt statement, Interview Review, or Needs Attention region
```

Do not add new informational cards. Remove redundant Architect Surface/Browser duplication if both communicate the same state.

## Required Repair 2 — Explicit Native Attachment Status

Extend `ArchitectBrowserFoundationStatus` with a narrowly scoped attachment diagnostic object.

Required logical fields:

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

Equivalent naming is allowed only if the semantics are exact.

Rules:

1. `attached-visible` requires the view to be attached to the current main window and have width and height greater than zero.
2. A created `WebContentsView` with zero width or height is `attached-zero-bounds`, not success.
3. `browserState` continues to describe loading/auth state. It must not substitute for attachment visibility.
4. Do not include credentials, cookies, tokens, DOM content, account identity, repository contents, or absolute local paths in diagnostics.
5. Return the attachment object from show, hide, set-bounds, status, and retry operations.

## Required Repair 3 — Deterministic Attachment Sequence

Implement one explicit Architect Interview attachment coordinator in the renderer.

Required sequence on Architect Interview entry:

```text
1. wait until the browser host DOM element exists;
2. measure the host;
3. require width > 0 and height > 0;
4. invoke showArchitectBrowser();
5. send the measured bounds with a new sequence number;
6. verify the returned status is attached-visible;
7. display the native surface only after successful verification.
```

Requirements:

1. Do not call the operation successful when the host has zero dimensions.
2. If layout has not settled, retry measurement through bounded `requestAnimationFrame` attempts before showing an error.
3. Use a generation/request token so stale effect completions cannot overwrite a newer attachment attempt.
4. React Strict Mode effect replay must not leave the view detached, zeroed, or governed by a stale completion.
5. `showArchitectBrowser()` and main-process attachment must be idempotent.
6. Re-entering Architect Interview must deterministically attach the existing persistent view to the current main window.
7. Leaving Architect Interview must zero and detach the view.
8. Repository clear or switch must zero and detach the view.
9. Window resize and host `ResizeObserver` updates remain coalesced through one animation-frame update.
10. Do not restore outer-scroll bounds chasing.
11. A zero-size resize during an active layout transition must produce `attached-zero-bounds` until a later positive measurement restores `attached-visible`.

## Required Repair 4 — Actionable Retry

Add one compact browser retry action that appears only when Architect Interview is active and attachment state is:

```text
detached
attached-zero-bounds
attach-failed
```

Button label:

```text
Retry Embedded Browser
```

Retry behavior must:

1. remeasure the current host;
2. reject a zero-size host with a clear layout error;
3. call `showArchitectBrowser()`;
4. apply current positive bounds;
5. verify `attached-visible`;
6. clear the prior attachment error only after success.

`Refresh Output` must remain a repository-output action. Do not repurpose it as browser retry.

## Required Repair 5 — Main-Process Attachment Integrity

In `architectBrowserService.ts`:

1. Track whether the current `architectView` is actually a child of the current main window.
2. Do not infer attachment from `architectView !== null`.
3. Keep only one resize listener for the attached window.
4. Remove listeners on detach, window replacement, and permanent window close.
5. Preserve the existing secure web preferences and persistent partition.
6. Preserve latest-sequence-wins bounds handling.
7. Accept zero bounds as a transition state but report `attached-zero-bounds`.
8. `attachArchitectBrowserSurface()` must return `attaching` or the resulting real attachment state; it must not report visible success before positive bounds exist.
9. `detachArchitectBrowserSurface()` must return `detached` and zero bounds.
10. Close `webContents` only when the owning application window permanently closes, not during ordinary workspace navigation.

## Required Repair 6 — Remove Residual Mode Contract

WC24 removed the external product path, but the shared status still contains:

```ts
surfaceMode: "embedded";
```

Remove this residual mode field from production contracts, status construction, renderer use, and tests. The product has one surface type: embedded ChatGPT. Do not replace it with another mode abstraction.

## Required Tests

### Attachment status tests

Test:

1. no view created returns `detached`, `isViewCreated=false`, and zero bounds;
2. created but unattached view does not return `attached-visible`;
3. attached view with zero bounds returns `attached-zero-bounds`;
4. attached view with positive bounds returns `attached-visible`;
5. stale bounds sequence cannot replace a newer positive bounds state;
6. positive bounds after zero bounds restore `attached-visible`;
7. detach returns zero bounds and `detached`;
8. repeated attach does not add duplicate window listeners;
9. window replacement removes listeners from the prior window;
10. permanent window close releases the native view.

### Renderer attachment coordinator tests

Use a pure helper or similarly testable bounded state coordinator. Test:

1. zero-size host does not invoke visible-success state;
2. positive host measurement produces show then bounds ordering;
3. stale generation completion is ignored;
4. Strict Mode replay cannot let the first stale completion override the second attempt;
5. Retry uses a new generation and current measurement;
6. Retry failure preserves a visible error;
7. later Retry success clears the error;
8. leaving the workspace invalidates pending attachment work.

### Layout regression tests

Automated source assertions alone are insufficient. Add a small pure presentation/layout-state test where possible, and perform the required Electron visual check.

At minimum verify in source/tests that:

1. Architect Interview does not render the generic selected-workspace panel;
2. Architect Interview does not render `CurrentWorkspaceBanner`;
3. the Architect Interview surface uses an explicit final `minmax(0, 1fr)` workspace row;
4. the dual-pane region still contains document preview and Architect surface pane;
5. no External or surface-mode control exists;
6. `Retry Embedded Browser` is conditional on attachment failure state.

## Mandatory Implementer Validation

Run:

```text
npm run typecheck
npm run build
npm test
```

When the sandbox produces the documented `spawn EPERM`, rerun the affected command in the normal Windows lane and report both outcomes.

### Required live Electron validation by Implementer

This is mandatory and cannot be replaced by a process-alive smoke test.

Open the application in the normal Windows environment and inspect Architect Interview at:

```text
default 1160 × 780 window
maximized window
one intermediate desktop size
minimum currently supported desktop size
```

For each size, record in the Implementer Report:

```text
attachment.state
attachment.isAttachedToWindow
attachment.isVisible
attachment.bounds.width
attachment.bounds.height
whether document preview is visible
whether embedded ChatGPT is visible
whether either pane is overlapped or clipped
```

The Implementer must visually confirm both panes are visible together. A running Electron process is not sufficient.

Exercise:

1. enter Architect Interview;
2. leave and re-enter three times;
3. resize repeatedly;
4. clear and reselect the repository;
5. trigger Retry Embedded Browser when available;
6. confirm the browser remains inside the pane;
7. confirm no drift or snap during document-preview scrolling.

Do not claim WC25 complete if any validation size produces zero bounds, a detached state, a missing pane, clipping, overlap, or an unavailable embedded surface.

## Acceptance Criteria

WC25 is ready for Architect review only when all are true:

1. default `1160 × 780` view visibly shows document preview and embedded ChatGPT together;
2. maximized, intermediate, and minimum supported desktop sizes also show both panes;
3. the dual-pane workspace cannot collapse to zero height;
4. browser host width and height are positive during normal Architect Interview use;
5. browser status distinguishes detached, zero-bounds, visible, and failed attachment;
6. attached-visible is reported only when attached to the current main window with positive bounds;
7. workspace entry deterministically attaches and verifies the native view;
8. Strict Mode replay and stale promises cannot detach or hide a newer attachment;
9. Retry Embedded Browser repairs a recoverable attachment failure;
10. Refresh Output remains separate from Retry Embedded Browser;
11. leaving the workspace and repository clear/switch detach and zero the view;
12. repeated entry and resize do not accumulate listeners;
13. no External option or residual surface-mode contract remains;
14. Architect Interview does not render the large generic selected-workspace or current-workspace banners;
15. compact controls do not displace the main workspace;
16. preview scroll and ChatGPT scroll remain internal;
17. native browser does not drift, snap, overlap, or escape its pane;
18. all existing evidence, polling, review, Project Intake, rail, and later-workspace behavior remains unchanged;
19. typecheck, build, and all tests pass;
20. the Implementer Report contains actual live attachment dimensions and visual results, not only automated claims;
21. no new dependency, provider integration, DOM automation, credential inspection, hidden authority, or Git mutation is introduced.

## Stop Conditions

Stop without editing outside WC25 scope if:

- the embedded ChatGPT failure cannot be reproduced in the normal Windows application;
- the current default or minimum window dimensions cannot support both panes without a product decision;
- fixing visibility requires changing Project Intake, Interview evidence semantics, polling, review persistence, later workspaces, or the workflow rail;
- ChatGPT itself refuses embedding for a reason unrelated to ChampCity layout or attachment;
- the secure Electron settings would need to be weakened;
- a new dependency appears necessary.

Report the exact blocker and leave the repository unchanged beyond already completed WC25 edits.

## Explicit Non-Goals

Do not:

- redesign the entire Architect Interview workspace;
- add new cards, dashboards, or explanatory panels;
- alter canonical Interview resolution;
- alter invalid-output handling;
- alter polling or review semantics;
- alter Project Intake;
- alter Project Planning or later workspaces;
- alter workflow rail behavior;
- add external ChatGPT mode;
- automate ChatGPT interaction;
- inspect credentials, cookies, tokens, DOM content, session storage, or account identity;
- add dependencies;
- perform Git operations;
- modify WC22, WC23, or WC24 Implementer Reports.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25_architect_interview_visible_embedded_surface_attachment_repair.md`

The report must include:

- repository, remote, branch, and starting dirty-tree inventory;
- exact files created, modified, and deleted;
- confirmation that protected files were not modified;
- final Architect Interview viewport row structure;
- which generic panels were removed from Architect Interview;
- final attachment diagnostic contract;
- exact definition of `attached-visible`;
- renderer attachment sequence and generation-token behavior;
- Strict Mode replay handling;
- Retry Embedded Browser behavior;
- main-process listener and native-view lifecycle;
- confirmation that `surfaceMode` was removed;
- tests added or changed;
- typecheck, build, and full test results;
- actual live Electron results for every required window size, including numeric bounds;
- repeated entry/exit, resize, repository-switch, and retry results;
- limitations and remaining Operator validation;
- confirmation that WC22-WC24 Implementer Reports were not changed;
- final repository status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Operator Validation After Architect Review

The Operator will confirm:

1. Architect Interview opens with both document preview and embedded ChatGPT visible;
2. the embedded surface is usable inside the application;
3. no External option exists;
4. controls are compact and the main workspace receives most of the available height;
5. Retry Embedded Browser appears only on attachment failure and works;
6. default, maximized, intermediate, and minimum supported desktop sizes remain usable;
7. repeated workspace entry, resizing, preview scrolling, repository switching, and retry produce no drift, snap, clipping, overlap, or missing browser;
8. evidence, polling, review, Project Intake, rail, and later workspaces remain unchanged.
