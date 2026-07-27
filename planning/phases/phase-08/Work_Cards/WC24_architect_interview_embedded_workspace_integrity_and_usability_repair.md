<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC24"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC24",
    "phaseId": "phase-08",
    "title": "Architect Interview Embedded Workspace Integrity and Usability Repair",
    "status": "draft_for_operator_review",
    "owner": "Implementer upon Operator approval",
    "risk": "high",
    "dependsOn": [
      "WC23"
    ],
    "executionInstruction": "Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or handoff is required.",
    "gitMutationAuthorized": false,
    "purpose": "Repair seven confirmed Architect Interview defects while restoring the embedded-only document-preview-plus-ChatGPT workspace and removing the unauthorized External ChatGPT mode.",
    "confirmedProductDecisions": [
      "Architect Interview is embedded-only.",
      "External ChatGPT mode does not exist.",
      "The main workspace visibly contains repository document preview and embedded ChatGPT.",
      "Controls above the panes are compact.",
      "Prompt is viewable but never dispositioned.",
      "Interview disposition controls appear only when a valid Interview exists and is selected."
    ],
    "defects": [
      "Invalid or incomplete Interview output can qualify as the canonical Interview.",
      "Polling does not reliably refresh revised content, resolver state, counts, rail state, and current-workspace projection.",
      "Architect Interview lifecycle state is not initialized and cleared correctly across startup and repository changes.",
      "Repository disposition and review notes are not correctly synchronized with local review controls.",
      "Embedded ChatGPT authentication fails because the OAuth flow is split across browser sessions.",
      "Prompt and Interview review/disposition UI remains visually and functionally conflated.",
      "The native embedded browser drifts or snaps because bounds synchronization is incorrect."
    ],
    "requiredRepairs": [
      {
        "id": "strict-interview-output-validation",
        "requirements": [
          "Require canonical repository-relative Markdown and JSON targets with matching stems.",
          "Require both exact siblings in one logical document.",
          "Require artifactType=project-architect-interview and participationRole=gatingReview.",
          "Require exact current Intake and Prompt JSON source revisions.",
          "Require synchronized readable fresh evidence.",
          "Expose malformed output identity and diagnostics as Needs Attention.",
          "Keep malformed output inspectable but unreviewable."
        ]
      },
      {
        "id": "complete-evidence-reconciliation",
        "requirements": [
          "Fingerprint repository identity, Interview ID, revision, disposition, review notes/status, synchronization, freshness, read error, state, and diagnostics.",
          "Allow only one manual or quiet refresh in flight.",
          "Ignore stale completions.",
          "Refresh documents, counts, preview, resolver, current model, and rail on changed evidence.",
          "Refresh same-ID higher revisions and disposition/note-only changes.",
          "Preserve last good model and preview on transient failure.",
          "Use separate recoverable polling/read errors."
        ]
      },
      {
        "id": "repository-scoped-state",
        "requirements": [
          "Load lifecycle state during initial load, repository switch, general refresh, Intake changes, and Interview review changes.",
          "Clear all Interview-specific state on repository clear or switch.",
          "Keep polling limited to the viewed Architect Interview workspace.",
          "Do not clear the persistent Electron session partition merely because the repository changes."
        ]
      },
      {
        "id": "explicit-review-decision-and-concurrency",
        "requirements": [
          "Repository Pending hydrates to no selected Operator decision.",
          "RevisionRequested hydrates durable status and notes.",
          "Same unchanged evidence preserves dirty edits.",
          "New substantive revision resets to no selected decision.",
          "Prompt, missing output, or invalid output clears review edit state.",
          "Apply requires explicit disposition selection.",
          "RevisionRequested requires nonblank notes.",
          "Concurrency token includes all review-relevant evidence.",
          "Stale review submission fails before writes."
        ]
      },
      {
        "id": "embedded-only-authentication",
        "requirements": [
          "Remove ArchitectSurfaceMode, Embedded/External toggle, external-browser workflow, IPC, API, UI, and tests.",
          "Preserve persist:champcity-architect and secure web preferences.",
          "Keep required OpenAI-owned ChatGPT authentication navigation in the embedded session.",
          "Constrain unrelated destinations.",
          "Preserve secure preferences for allowed child windows.",
          "Do not inspect credentials, cookies, DOM, session storage, tokens, or account identity.",
          "Retain explicit Operator sign-in confirmation only after visible embedded sign-in."
        ]
      },
      {
        "id": "compact-controls-and-dual-pane-workspace",
        "requirements": [
          "Keep a compact status/action row and compact document/review row.",
          "Remove redundant state panels.",
          "Render document preview and embedded ChatGPT together in the remaining viewport.",
          "Prompt selection renders only the read-only Prompt statement.",
          "Valid Interview selection renders one Interview Review region.",
          "Invalid Interview selection renders Needs Attention diagnostics and no enabled review.",
          "Do not render Interview review controls for Prompt or missing output."
        ]
      },
      {
        "id": "stable-browser-attachment-and-bounds",
        "requirements": [
          "Auto-attach the embedded browser whenever Architect Interview is viewed with a selected repository.",
          "Never show Embedded ChatGPT with Browser detached unless attachment failed and Retry is shown.",
          "Use intrinsic-height controls and minmax(0,1fr) dual-pane remaining height.",
          "Prevent outer scrolling around the native host.",
          "Use internal preview and remote-page scrolling.",
          "Coalesce bounds with requestAnimationFrame and monotonically increasing latest-wins sequence.",
          "Zero or hide the view during detach, repository clear, and host disappearance.",
          "Remove duplicate listeners and close native webContents on permanent window close.",
          "Scope WC24 behavior to Architect Interview only."
        ]
      }
    ],
    "authorizedFiles": [
      "src/main/architectInterview/architectInterviewContextResolver.ts",
      "src/main/architectInterview/architectInterviewService.ts",
      "src/main/browser/architectBrowserService.ts",
      "src/main/main.ts",
      "src/preload/index.ts",
      "src/shared/workspaceContracts.ts",
      "src/shared/architectInterview/architectInterviewRefreshState.ts",
      "src/shared/workspaces/projectRailPresentation.ts",
      "src/renderer/app/App.tsx",
      "src/renderer/styles.css",
      "src/renderer/app/NestedWorkflowRail.tsx only if necessary for status typing or presentation",
      "Focused Architect Interview tests"
    ],
    "productionFilesExpectedUnchanged": [
      "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC22_architect_interview_workspace_handoff_review_and_status_completion.md",
      "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC23_architect_interview_integrity_authentication_and_native_surface_stability_repair.md",
      "Project Intake implementation and semantics",
      "Project Planning and later lifecycle workspaces",
      "Generic disposition behavior outside Architect Interview",
      "Lower Phase and Work Card rails"
    ],
    "requiredTests": [
      "Malformed output remains inspectable but unreviewable.",
      "Wrong type, role, sources, revisions, siblings, synchronization, freshness, or read state produces Needs Attention.",
      "Same-ID higher revision refreshes preview.",
      "Disposition-only and note-only changes refresh.",
      "Transient read failure preserves last preview.",
      "One in-flight refresh across manual and quiet paths.",
      "Lifecycle status loads before visiting Architect Interview.",
      "Repository switch clears all Interview-specific state.",
      "Pending hydrates to no selected disposition.",
      "RevisionRequested hydrates durable status and notes.",
      "Dirty edits survive unchanged polling and stale token blocks Apply.",
      "Prompt selection produces no review controls.",
      "Invalid Interview produces diagnostics and no review action.",
      "Valid Interview produces one review region.",
      "All External mode contracts, APIs, UI, and tests are removed.",
      "OpenAI-owned authentication navigation remains embedded and unrelated navigation remains constrained.",
      "Embedded browser auto-attaches in Architect Interview.",
      "Bounds latest sequence wins and listeners do not accumulate.",
      "No outer scroll listener drives native bounds.",
      "Document preview and embedded pane remain structurally visible."
    ],
    "nonGoals": [
      "Modifying WC22 or WC23 Implementer Reports",
      "Adding or retaining External ChatGPT mode",
      "Changing Project Intake semantics",
      "Changing Project Planning or later lifecycle workspaces",
      "Automatic ChatGPT message submission",
      "Credential cookie token DOM session-storage or account-identity inspection",
      "Custom OAuth client",
      "Provider APIs or SDKs",
      "Raw transcript persistence",
      "Hidden handoff route queue or approval state",
      "Third main workspace pane",
      "New dependencies",
      "Git mutation"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Non-acceptance Electron launch smoke",
      "Operator visual and live embedded-authentication validation"
    ],
    "acceptanceCriteria": [
      "Only valid current Interview evidence can be reviewed or complete the stage.",
      "Malformed output is inspectable and Needs Attention but never reviewable.",
      "Polling refreshes complete repository projection on all review-relevant evidence changes.",
      "Same-ID revised content reloads visibly.",
      "Transient polling/read failure preserves last good model and preview.",
      "Lifecycle status is correct before workspace visit.",
      "Repository switching leaks no prior Interview state.",
      "Pending does not preselect Approve.",
      "Stale local review submission is blocked.",
      "External mode is completely removed.",
      "Embedded authentication stays in the persistent embedded session where allowed.",
      "Prompt selection renders no Interview review controls.",
      "Controls are compact and nonredundant.",
      "Document preview and embedded ChatGPT are visible together.",
      "Embedded browser auto-attaches or shows an actionable failure.",
      "Outer scrolling does not move the native browser.",
      "Bounds updates are coalesced and latest-wins.",
      "Listener and native-view cleanup is correct.",
      "Project Intake and later lifecycle workspaces remain unchanged.",
      "Typecheck, build, and all tests pass.",
      "No dependency, provider API, DOM automation, credential inspection, hidden authority, or Git mutation is introduced."
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC24_architect_interview_embedded_workspace_integrity_and_usability_repair.md"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC24 Architect Interview Embedded Workspace Integrity and Usability Repair

Status: draft for Operator review
Owner: Implementer upon Operator approval
Phase: phase-08
Risk: high
Depends on: WC23 implementation and Architect/Operator review findings
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC24_architect_interview_embedded_workspace_integrity_and_usability_repair.md`

Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or handoff is required.

## Purpose

Repair exactly seven confirmed Architect Interview defects while preserving the clarified product decision that ChatGPT remains embedded inside ChampCity A/I.

The seven defects are:

1. invalid or incomplete Interview output can qualify as the canonical Interview;
2. polling does not reliably refresh revised document content, resolver state, counts, rail state, and current-workspace projection;
3. Architect Interview lifecycle state is not initialized and cleared correctly across startup and repository changes;
4. repository disposition and review notes are not correctly synchronized with local review controls;
5. embedded ChatGPT authentication fails because the OAuth flow is split across browser sessions;
6. Prompt and Interview review/disposition UI remains visually and functionally conflated;
7. the native embedded browser drifts or snaps because bounds synchronization is incorrect.

WC24 also repairs the WC23 visual regression where the control area consumes the viewport and the document preview plus embedded ChatGPT panes are no longer visible.

## Confirmed Product Decisions

These decisions are controlling and must not be reinterpreted:

```text
Architect Interview is embedded-only.
External ChatGPT mode does not exist.
The main workspace visibly contains:
- repository document preview;
- embedded ChatGPT pane.
Controls above those panes are compact.
Prompt is viewable but never dispositioned.
Interview disposition controls appear only when a valid Interview output exists and is selected.
```

Remove the `Embedded` / `External` mode toggle, external-browser workflow, and related contracts introduced by WC23.

## Root Cause Analysis

### Defect 1 — Interview identity and provenance are insufficiently enforced

The canonical resolver must not treat target-path presence as sufficient proof of a valid Interview. A valid review target requires exact target siblings, correct artifact type and role, synchronized readable content, and exact current Project Intake and prompt source revisions.

Required invariant:

```text
Exact canonical target pair
+ same stem
+ artifactType=project-architect-interview
+ participationRole=gatingReview
+ exact current Intake JSON revision
+ exact current Prompt JSON revision
+ synchronized, readable, fresh
= reviewable Interview
```

All other output at the targets must be shown as `Needs Attention`, remain inspectable, and never be reviewable or complete the stage.

### Defect 2 — Polling is partial instead of evidence-reconciling

Current polling can update a model without reliably refreshing the document corpus, preview, resolver, current model, rail, and counts. Same-logical-ID revisions are especially vulnerable.

Required invariant:

```text
Evidence fingerprint unchanged
→ preserve current model, preview, selection, and unsaved edits

Evidence fingerprint changed
→ refresh documents
→ refresh exact preview
→ refresh resolver
→ refresh current workspace model
→ refresh rail and counts

Transient failure
→ preserve last good model and preview
→ show a separate recoverable error
```

### Defect 3 — Lifecycle state is view-scoped instead of repository-scoped

Architect Interview lifecycle status must be derived whenever a repository is loaded or changed, not only when the workspace is visited. Repository switch and clear must remove all repository-specific Interview state.

### Defect 4 — Review controls are not reliably bound to repository evidence

The review controls must not silently convert repository `Pending` into `Approved`. No Operator decision exists until the Operator explicitly selects Approve, Reject, or Request Revision.

Review concurrency must bind to all review-relevant evidence, not only repository, logical ID, and artifact revision. Disposition, notes, synchronization, freshness, and read state must also invalidate a stale local review submission.

### Defect 5 — OAuth is split across browser sessions

The current embedded navigation policy externalizes parts of the ChatGPT authentication transaction, breaking session continuity.

WC24 must repair authentication within the embedded persistent partition. OpenAI-owned ChatGPT and authentication navigation required for the flow must remain in the embedded session. Unrelated destinations remain constrained.

Do not add an external-browser fallback, custom OAuth client, credential inspection, cookie extraction, DOM automation, or provider SDK.

### Defect 6 — Prompt and Interview review UI remains conflated

Prompt selection must remove Interview review controls from the DOM. Disabled review controls are not acceptable.

The control area must be compact and must not repeat the same state across multiple large panels.

### Defect 7 — Native WebContentsView containment is unstable

The embedded browser is a native view with window-relative bounds. It cannot be treated as a clipped DOM descendant that chases outer scrolling.

The Architect Interview workspace must fit within the available viewport. The outer Architect Interview surface must not scroll around the native host. The document preview and remote page scroll internally. Bounds updates must be coalesced, latest-wins, and driven only by stable layout changes.

## Required Repair 1 — Strict Interview Output Validation

Update `architectInterviewContextResolver.ts` so malformed output is represented explicitly.

Requirements:

- validate canonical repository-relative `.md` and `.json` targets;
- require matching filename stem;
- require both exact siblings in one logical document;
- require `artifactType=project-architect-interview`;
- require `participationRole=gatingReview`;
- require exact current Intake JSON path/revision;
- require exact current Prompt JSON path/revision;
- require synchronized, readable, fresh evidence;
- return a distinct invalid-output identity containing the actual malformed document paths and diagnostics;
- set `railStatus=Needs Attention` and `canApplyDisposition=false`;
- allow the Operator to select and inspect the malformed output;
- never auto-repair, migrate, approve, or complete malformed output.

## Required Repair 2 — Complete Evidence Reconciliation

Use one bounded refresh coordinator.

The evidence fingerprint must include:

```text
repository identity
Interview logical ID
artifact revision
disposition
operator review status and notes fingerprint
synchronization state
freshness state
read-error state
workspace state
reason/diagnostic state
```

Polling requirements:

- run every 2–5 seconds only while Architect Interview is viewed;
- permit only one request in flight, including manual and quiet refresh paths;
- ignore stale request completions;
- on changed evidence, refresh documents, counts, selected preview, resolver, current model, and rail;
- reload same-ID higher-revision preview content;
- reload disposition-only and note-only changes;
- preserve last good model and preview on failure;
- store a separate polling/read error;
- clear that error after later success;
- stop on workspace exit, repository switch, unload, or unmount.

Document refresh must be non-destructive during polling: do not clear `selectedDocument` until a replacement read succeeds.

## Required Repair 3 — Repository-Scoped Initialization and Cleanup

Load or recompute Architect Interview lifecycle state during:

- initial application load with a selected repository;
- repository switch;
- general Refresh;
- Project Intake submission or revision;
- Project Intake disposition change;
- Architect Interview review change.

Repository clear/switch must clear:

```text
architectInterviewModel
selected Architect Interview document/role
review edit state
copy feedback
polling error
evidence fingerprint
request guards
browser attachment state tied to the old workspace
```

Do not clear the persistent Electron session partition merely because the repository changes.

## Required Repair 4 — Explicit Review Decision and Concurrency

Replace the current review edit state with an explicit optional decision.

Recommended shape:

```ts
{
  sourceToken: string | null;
  selectedDisposition: DocumentDispositionStatus | "";
  notes: string;
  isDirty: boolean;
}
```

Rules:

- repository `Pending` hydrates to `selectedDisposition=""`;
- `RevisionRequested` and durable notes hydrate from repository evidence;
- same unchanged source token preserves unsaved edits;
- a new substantive revision resets to no selected decision;
- Prompt selection or missing/invalid Interview clears review edit state;
- Apply is disabled until a disposition is explicitly selected;
- `RevisionRequested` requires nonblank notes;
- the source token must include all review-relevant evidence or a deterministic fingerprint;
- stale token submission must fail before writes;
- successful review rehydrates from the returned canonical model.

## Required Repair 5 — Embedded-Only ChatGPT Authentication

Remove:

```text
ArchitectSurfaceMode
Embedded/External toggle
External ChatGPT UI
openExternalArchitectSurface IPC/API
external mode state and tests
```

Preserve:

```text
persist:champcity-architect
nodeIntegration=false
contextIsolation=true
sandbox=true
no remote preload
```

Navigation policy requirements:

- keep ChatGPT and OpenAI-owned authentication navigation required for login inside the embedded session;
- constrain unrelated destinations externally or deny them;
- preserve secure preferences for allowed child windows;
- keep session continuity in the same persistent partition;
- do not inspect credentials, cookies, DOM content, session storage, tokens, or account identity;
- do not claim authentication success automatically;
- retain the explicit Operator confirmation only after the embedded surface visibly reaches the signed-in ChatGPT interface.

The UI must not offer an external-browser product path.

## Required Repair 6 — Compact Controls and Visible Dual-Pane Workspace

The Architect Interview screen must visibly show both main panes at normal supported window sizes:

```text
Document Preview | Embedded ChatGPT
```

The control region must not consume the main viewport.

Required compact structure:

```text
Row 1 — status and actions
- lifecycle status
- browser status/sign-in action
- Copy Architect Handoff
- Refresh Output

Row 2 — document selector and conditional review
- Prompt selector
- Interview selector
- compact selected-artifact identity
- Prompt statement OR Interview Review controls OR Needs Attention diagnostics
```

Remove redundant panels and repeated descriptions.

Prompt selected or no Interview:

```text
Prompt is an Approved handoff input; no Operator disposition is required.
```

No disposition select, notes textarea, or Apply button may exist in the DOM.

Valid Interview selected:

- show one region labeled `Interview Review`;
- show current repository disposition, synchronization, and freshness;
- show empty disposition selection until the Operator chooses;
- show revision notes only when Request Revision is selected;
- show Apply Interview Review.

Invalid Interview selected:

- show exact artifact path and `Needs Attention` diagnostics;
- no enabled review action.

## Required Repair 7 — Stable Embedded Browser Attachment and Bounds

The embedded browser must attach automatically whenever Architect Interview is viewed and a repository is selected.

The visible state must never be:

```text
Architect Surface: Embedded ChatGPT
Browser: detached
```

unless attachment is actively failing, in which case a clear error and Retry action must be displayed.

Layout requirements:

- Architect Interview outer surface uses a viewport-constrained grid/flex model;
- header/status/control area occupies only intrinsic height;
- dual-pane workspace occupies `minmax(0, 1fr)` remaining height;
- no outer scroll around the native browser host;
- preview body scrolls internally;
- ChatGPT page scrolls internally;
- no horizontal workspace overflow.

Bounds requirements:

- measure on workspace entry, window resize, host ResizeObserver, and explicit layout changes;
- use one `requestAnimationFrame` coalescer;
- use monotonically increasing sequence/latest-wins behavior;
- zero/hide view during detach, repository clear, and host disappearance;
- remove duplicate resize listeners;
- close native webContents when the owning window permanently closes;
- do not restore scroll-event bounds chasing.

Scope this behavior to Architect Interview. Do not change Project Planning or later Architect workspace behavior under WC24.

## Authorized Production Files

Expected production changes are limited to:

```text
src/main/architectInterview/architectInterviewContextResolver.ts
src/main/architectInterview/architectInterviewService.ts
src/main/browser/architectBrowserService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/architectInterview/architectInterviewRefreshState.ts
src/shared/workspaces/projectRailPresentation.ts
src/renderer/app/App.tsx
src/renderer/styles.css
```

`src/renderer/app/NestedWorkflowRail.tsx` is authorized only for necessary status typing or presentation preservation.

Do not modify the WC22 or WC23 Implementer Reports.

## Required Tests

Add or update focused tests covering:

1. malformed output identity remains inspectable but unreviewable;
2. wrong type, role, source paths, source revisions, sibling structure, synchronization, freshness, and read state produce `Needs Attention`;
3. same-ID higher-revision preview refresh;
4. disposition-only and notes-only refresh;
5. transient read failure preserves last preview;
6. one in-flight refresh across manual and quiet paths;
7. lifecycle status loads before visiting Architect Interview;
8. repository switch clears all Interview-specific state;
9. Pending hydrates to no selected disposition;
10. RevisionRequested hydrates status and notes;
11. dirty edits survive unchanged polling;
12. stale evidence token blocks Apply;
13. Prompt selection produces no review controls;
14. invalid Interview produces diagnostics and no review action;
15. valid Interview produces one review region;
16. external mode contracts, APIs, UI, and tests are removed;
17. OpenAI-owned authentication navigation remains embedded;
18. unrelated navigation remains constrained;
19. embedded browser auto-attaches in Architect Interview;
20. bounds latest sequence wins and listeners do not accumulate;
21. no outer scroll listener drives native bounds;
22. document preview and embedded pane remain structurally visible.

Pure helper tests may support presentation behavior. Source-string assertions cannot be the sole proof.

## Validation

Run the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

When the sandbox produces the documented `spawn EPERM` condition, rerun in the normal Windows lane and report both results accurately.

Perform a non-acceptance Electron launch smoke confirming only:

- application starts;
- Architect Interview opens;
- document preview and embedded browser pane are both visible structurally;
- browser attachment does not remain detached;
- Prompt view has no disposition controls;
- no External option exists;
- no immediate overflow, drift, or crash occurs.

Launch smoke is not Operator visual acceptance and does not prove live authentication or MCP write-back.

## Acceptance Criteria

WC24 is acceptable for Architect review only when:

1. only valid current Interview evidence can be reviewed or complete the stage;
2. malformed output is inspectable and `Needs Attention` but never reviewable;
3. polling refreshes full repository projection on all review-relevant evidence changes;
4. same-ID revised content reloads visibly;
5. transient polling/read failure preserves last good model and preview;
6. lifecycle status is correct before workspace visit;
7. repository switching leaks no prior Interview state;
8. Pending does not preselect Approve;
9. stale local review submission is blocked;
10. External mode is completely removed;
11. embedded authentication remains within the persistent embedded session where allowed;
12. Prompt selection renders no Interview review controls;
13. the control area is compact and nonredundant;
14. document preview and embedded ChatGPT are visibly present together;
15. embedded browser attaches automatically or shows an actionable failure;
16. outer scrolling does not move the native browser;
17. bounds updates are coalesced and latest-wins;
18. listener and native-view lifecycle cleanup is correct;
19. Project Intake and later lifecycle workspaces remain unchanged;
20. typecheck, build, and all tests pass;
21. no new dependency, provider API, DOM automation, credential inspection, hidden authority, or Git mutation is introduced.

## Explicit Non-Goals

Do not:

- modify WC22 or WC23 Implementer Reports;
- add or retain External ChatGPT mode;
- change Project Intake semantics;
- change Project Planning or later lifecycle workspaces;
- automate ChatGPT message submission;
- inspect credentials, cookies, tokens, DOM content, session storage, or account identity;
- create a custom OAuth client;
- add provider APIs or SDKs;
- persist raw transcripts;
- create hidden handoff, route, queue, or approval state;
- add a third main pane;
- add dependencies;
- perform Git operations.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC24_architect_interview_embedded_workspace_integrity_and_usability_repair.md`

The report must include:

- repository, remote, branch, and starting dirty-tree inventory;
- exact files created, modified, and deleted;
- final Interview identity/provenance rules;
- invalid-output inspection model;
- evidence fingerprint and refresh behavior;
- polling concurrency and non-destructive failure behavior;
- repository initialization and cleanup behavior;
- explicit review decision and concurrency token;
- confirmation that Pending does not preselect Approve;
- removal of all external-mode contracts and UI;
- final embedded authentication navigation policy;
- final compact control layout;
- exact Prompt, valid Interview, and invalid Interview presentation;
- final viewport and internal-scroll structure;
- browser attachment and bounds lifecycle;
- tests added or changed;
- typecheck, build, and full test results;
- launch-smoke result and limitations;
- remaining Operator validation;
- confirmation that WC22/WC23 Implementer Reports were not changed;
- final repository status;
- confirmation that no Git operation occurred.

End with:

```markdown
## Manual Validation After Architect Review

Operator validation must confirm:

1. no External option appears anywhere;
2. Architect Interview opens with document preview and embedded ChatGPT visible together;
3. embedded browser attaches and does not remain `detached`;
4. Prompt view contains no disposition controls;
5. valid Interview view contains one compact Interview Review region;
6. Pending Interview has no preselected decision;
7. RevisionRequested restores durable notes;
8. malformed output is selectable and shows Needs Attention;
9. same-ID revised output refreshes visibly;
10. transient read failure preserves the last preview;
11. repository switch clears all prior Interview state;
12. OAuth/login remains within the embedded browser flow where supported;
13. native browser does not drift or snap during preview scrolling or resizing;
14. maximized, intermediate, and minimum supported sizes remain usable;
15. no credentials, cookies, DOM automation, automatic submission, or raw transcript behavior is exposed.
