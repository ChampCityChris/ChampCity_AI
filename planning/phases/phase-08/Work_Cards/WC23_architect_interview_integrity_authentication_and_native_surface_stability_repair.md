<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC23"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC23",
    "phaseId": "phase-08",
    "title": "Architect Interview Integrity, Authentication, and Native Surface Stability Repair",
    "status": "draft_for_operator_review",
    "owner": "Implementer upon Operator approval",
    "risk": "high",
    "dependsOn": [
      "WC22"
    ],
    "executionInstruction": "Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.",
    "gitMutationAuthorized": false,
    "purpose": "Correct seven bounded Architect Interview defects involving Interview evidence identity, evidence reconciliation polling, repository-scoped lifecycle state, review-control hydration, ChatGPT authentication compatibility, prompt-versus-Interview review composition, and native WebContentsView containment.",
    "operatorEvidence": [
      "ChatGPT sign-in opened the system browser and ended at chatgpt.com/auth/error?error=OAuthCallback.",
      "Prompt was selected while disabled Interview disposition controls remained visible.",
      "The embedded ChatGPT native surface drifted with outer application scrolling and snapped back into its pane."
    ],
    "confirmedArtifactSemantics": {
      "prompt": {
        "artifactRole": "Approved non-review handoff input",
        "participationRole": "nonReviewHandoff",
        "documentStatus": "Approved",
        "operatorReviewTarget": false
      },
      "interview": {
        "artifactType": "project-architect-interview",
        "participationRole": "gatingReview",
        "newAndSubstantiveRevisionStatus": "Pending",
        "operatorReviewTarget": true
      }
    },
    "rootCauseAnalysis": [
      {
        "defectId": "insufficient-interview-output-identity",
        "primaryRootCause": "The canonical context resolver validates target location but does not require the exact current Project Architect Interview artifact type, gating role, canonical sibling structure, and current Intake and prompt source revisions.",
        "requiredInvariant": "Exact canonical targets plus paired same-stem siblings plus project-architect-interview type plus gatingReview role plus exact current Intake and prompt source revisions plus readable synchronized fresh state are required before review or completion."
      },
      {
        "defectId": "partial-polling-refresh",
        "primaryRootCause": "Polling retrieves only the dedicated workspace model and tracks logical ID rather than artifact revision and repository lifecycle evidence, leaving revised preview, counts, resolver, and current model stale.",
        "requiredInvariant": "Evidence fingerprint changes must reconcile documents, selected preview, resolver, current model, rail, and counts while transient failures preserve the last successful state."
      },
      {
        "defectId": "view-scoped-lifecycle-state",
        "primaryRootCause": "Architect Interview lifecycle state is loaded only when its workspace is viewed and is not cleared completely on repository change.",
        "requiredInvariant": "Lifecycle status is repository-scoped; continuous polling is viewed-workspace-scoped."
      },
      {
        "defectId": "review-control-hydration-gap",
        "primaryRootCause": "Repository-backed Interview disposition and Operator notes are disconnected from local editable review controls.",
        "requiredInvariant": "Controls hydrate from repository on repository, Interview identity, or revision change, preserve dirty same-revision edits, and reset when no Interview or Prompt is selected."
      },
      {
        "defectId": "oauth-session-splitting",
        "primaryRootCause": "The navigation policy externalizes every host except chatgpt.com and chat.openai.com, splitting a multi-origin authentication transaction across the embedded partition and system browser.",
        "requiredInvariant": "Provide explicit Embedded ChatGPT and External ChatGPT modes; preserve OpenAI-owned authentication navigation in the embedded partition where supported and use a normal-browser fallback without fabricating embedded authentication."
      },
      {
        "defectId": "prompt-review-ui-conflation",
        "primaryRootCause": "The renderer represents absent Interview review authority with disabled controls instead of conditionally omitting the Interview review region for the Prompt.",
        "requiredInvariant": "Prompt or missing output shows a read-only statement and no Interview disposition controls; valid Interview selection shows one clearly labeled Interview Review region."
      },
      {
        "defectId": "native-view-scroll-bounds-chasing",
        "primaryRootCause": "A native window-relative WebContentsView is repositioned asynchronously from DOM scroll events as though it were a clipped DOM child, allowing lagging or out-of-order bounds updates and listener accumulation.",
        "requiredInvariant": "Outer workspace does not scroll the native host; internal panes scroll; bounds update only for stable layout events through a latest-update coordinator with correct listener and view cleanup."
      }
    ],
    "requiredRepairs": [
      {
        "id": "strict-interview-output-identity",
        "requirements": [
          "Require repository-relative canonical Project_Architect_Interviews Markdown and JSON targets with matching stems",
          "Require one paired logical document at exact targets",
          "Require artifactType project-architect-interview",
          "Require participationRole gatingReview",
          "Require exact current Project Intake JSON source path and revision",
          "Require exact current prompt JSON source path and revision",
          "Require readable synchronized fresh evidence",
          "Map all invalid output to Needs Attention and disable review"
        ]
      },
      {
        "id": "evidence-reconciliation-refresh",
        "requirements": [
          "Track repository, logical ID, artifact revision, disposition, synchronization, freshness, and read-error fingerprint",
          "Refresh documents, counts, exact preview, resolver, current model, and rail on evidence change",
          "Recognize same-ID higher-revision content",
          "Allow only one poll in flight and ignore stale completions",
          "Preserve last model and preview on transient failure",
          "Display and later clear a separate polling error",
          "Stop polling on workspace exit, repository switch, unload, or unmount"
        ]
      },
      {
        "id": "repository-scoped-lifecycle-state",
        "requirements": [
          "Load Architect Interview model on initial repository activation and restart",
          "Recompute on repository switch, general refresh, Intake changes, and Interview review changes",
          "Keep polling view-scoped",
          "Clear model, notes, dirty state, copy feedback, polling error, fingerprint, and selection on repository clear or switch",
          "Do not clear the persistent browser session partition during repository change"
        ]
      },
      {
        "id": "review-control-hydration",
        "requirements": [
          "Bind local edit state to repository identity plus Interview logical ID plus artifact revision",
          "Hydrate disposition and notes for a new source key",
          "Preserve dirty edits during unchanged polling",
          "Reset on new revision, Prompt selection, no Interview, or repository switch",
          "Rehydrate after successful review",
          "Reject submission when evidence changes after editing"
        ]
      },
      {
        "id": "embedded-and-external-chatgpt-modes",
        "requirements": [
          "Add typed embedded and external surface modes",
          "Preserve secure embedded WebContentsView settings and persistent partition",
          "Allow required OpenAI-owned ChatGPT authentication navigation in embedded mode",
          "Keep unrelated destinations external or denied",
          "Do not force social OAuth through a prohibited embedded user agent",
          "External mode opens only allowlisted ChatGPT URL and uses the same clipboard handoff",
          "External mode hides or detaches the embedded native view",
          "Do not claim external authentication transfers into embedded state"
        ]
      },
      {
        "id": "conditional-review-composition",
        "requirements": [
          "Split controls into workspace/handoff row and document/review row",
          "Do not render Interview disposition controls for Prompt or missing output",
          "Show read-only Prompt statement",
          "Render one Interview Review region only for valid Interview selection",
          "Show Needs Attention diagnostics for invalid Interview without enabled review",
          "Preserve the two-pane main workspace"
        ]
      },
      {
        "id": "stable-native-surface-containment",
        "requirements": [
          "Prevent outer Architect Interview workspace scrolling around the native host",
          "Use internal preview and remote-page scrolling",
          "Fit action bar and dual-pane region to available viewport with min-height zero chains",
          "Update bounds on entry, resize, host resize, and explicit mode transitions only",
          "Coalesce renderer bounds updates through requestAnimationFrame and latest-sequence logic",
          "Zero or hide native view during detach, host disappearance, and mode changes",
          "Add and remove main-window resize listener exactly once",
          "Close WebContentsView webContents when the owning application window permanently closes"
        ]
      }
    ],
    "authorizedFiles": [
      "src/main/architectInterview/architectInterviewContextResolver.ts",
      "src/main/architectInterview/architectInterviewService.ts",
      "src/main/browser/architectBrowserService.ts",
      "src/main/integrations/architectMcpHandoffService.ts",
      "src/main/main.ts",
      "src/preload/index.ts",
      "src/shared/workspaceContracts.ts",
      "src/shared/workspaces/projectRailPresentation.ts",
      "src/shared/architectInterview/one or two bounded refresh or presentation helpers",
      "src/renderer/app/App.tsx",
      "src/renderer/styles.css",
      "src/renderer/app/NestedWorkflowRail.tsx only if required for status typing or presentation",
      "Focused Architect Interview renderer and browser tests"
    ],
    "productionFilesExpectedUnchanged": [
      "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC22_architect_interview_workspace_handoff_review_and_status_completion.md",
      "src/main/projectIntake/projectIntakeService.ts",
      "src/shared/projectIntake/projectIntakeCorpus.ts except existing imports",
      "Project Planning and later lifecycle services",
      "Generic disposition behavior outside Architect Interview",
      "Project Intake workspace and rail semantics",
      "Lower Phase and Work Card loop rails"
    ],
    "requiredTests": [
      "Wrong Interview artifact type role source path source revision directory stem or sibling structure produces Needs Attention",
      "Valid current Interview is reviewable and can complete the stage",
      "First output and same-ID higher revision refresh visible preview and repository workflow state",
      "Transient poll failure preserves last model and preview and later success clears error",
      "Overlapping polls cannot apply out of order and polling cleans up",
      "Completed Pending and Needs Attention rail states load before visiting Architect Interview",
      "Repository switching clears model notes feedback fingerprint and selection",
      "Persisted RevisionRequested status and notes hydrate controls",
      "Dirty same-revision edits survive polling and new revision resets controls",
      "OpenAI-owned authentication hosts remain within embedded mode while unrelated hosts remain constrained",
      "External mode opens allowlisted ChatGPT only and does not alter embedded sign-in state",
      "Prompt and missing output return no Interview review region",
      "Native bounds latest sequence wins and resize listeners do not accumulate"
    ],
    "nonGoals": [
      "Modifying the WC22 Implementer Report",
      "Changing Project Intake semantics",
      "Changing Project Planning or later lifecycle workspaces",
      "Automatic remote ChatGPT message submission",
      "ChatGPT DOM injection or inspection",
      "Credential cookie token account-identity or session-storage inspection",
      "Forcing Google OAuth through the embedded user agent",
      "Creating a custom OpenAI OAuth client",
      "Provider APIs or SDKs",
      "Raw transcript persistence",
      "Hidden handoff consumed submitted route-token execution-run or approval-queue state",
      "Third main workspace pane",
      "Automatic malformed-output migration",
      "New dependencies",
      "Git mutation"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Non-acceptance Electron launch smoke",
      "Operator-controlled evidence integrity authentication mode review hydration refresh and native-containment validation"
    ],
    "acceptanceCriteria": [
      "Only valid current Project Architect Interview evidence can be reviewed or complete the stage",
      "Wrong type role sources paths siblings synchronization freshness or read state produces Needs Attention",
      "Polling recognizes revision and state changes and refreshes complete repository workflow state",
      "Same-ID revised Interview content reloads visibly",
      "Transient polling failure preserves last good state",
      "Architect Interview lifecycle status loads before workspace visit",
      "Repository switch cannot leak prior Interview state or notes",
      "Persisted review state hydrates and dirty same-revision edits survive polling",
      "Stale local review submission is blocked",
      "Embedded mode preserves browser security and required OpenAI-owned authentication navigation",
      "External mode provides normal-browser fallback without fabricating embedded authentication",
      "Prompt selection contains no Interview review controls",
      "Valid Interview review controls are grouped in one region",
      "Outer scrolling does not move the native browser surface",
      "Bounds updates are coalesced and stale updates cannot win",
      "Native-view listeners and webContents are cleaned up",
      "Typecheck build and all tests pass",
      "No unrelated subsystem dependency hidden authority or Git mutation is introduced"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC23_architect_interview_integrity_authentication_and_native_surface_stability_repair.md"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC23 Architect Interview Integrity, Authentication, and Native Surface Stability Repair

Status: draft for Operator review
Owner: Implementer upon Operator approval
Phase: phase-08
Risk: high
Depends on: WC22 Architect Interview Workspace Handoff, Review, and Status Completion implementation
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC23_architect_interview_integrity_authentication_and_native_surface_stability_repair.md`

Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.

## Purpose

Correct exactly seven defects identified through Architect source review and Operator observation of the WC22 Architect Interview workspace:

1. invalid or incomplete repository output can qualify as the substantive Project Architect Interview;
2. active output polling does not reliably refresh revised preview content, document counts, resolver state, or current-workspace projection;
3. Architect Interview lifecycle state is not initialized and cleared as repository-derived application state;
4. persisted Interview disposition and Operator review notes are not hydrated into review controls;
5. ChatGPT authentication navigation is split between the embedded Electron partition and the system browser, causing OAuth callback failure;
6. Prompt selection still displays disabled Interview disposition controls and the control bar is visually compressed;
7. the native Electron `WebContentsView` chases a scrolling DOM host and visibly drifts or snaps during application scrolling.

WC23 is a bounded Architect Interview repair. It does not reopen Project Intake behavior, change Project Planning, implement browser DOM automation, add provider APIs, create hidden workflow authority, or modify the WC22 Implementer Report.

## Source Evidence

### Operator evidence

Observed during live use:

- ChatGPT social sign-in opened the system browser and ended at `chatgpt.com/auth/error?error=OAuthCallback`.
- Prompt was selected as an Approved handoff input while disabled Interview disposition controls remained visible.
- The embedded ChatGPT surface moved with outer application scrolling and then snapped back into its pane.

### Architect source evidence

The seven failure chains were confirmed in:

```text
src/main/architectInterview/architectInterviewContextResolver.ts
src/main/architectInterview/architectInterviewService.ts
src/main/browser/architectBrowserService.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/projectRailPresentation.ts
src/renderer/app/App.tsx
src/renderer/styles.css
```

### External platform constraints

The repair must account for these current platform constraints:

- ChatGPT authentication requires the account’s original authentication method and may require cookies and JavaScript across OpenAI-owned authentication domains including `auth.openai.com`.
- Google OAuth policy prohibits directing authorization requests through a developer-controlled embedded user agent.
- Electron `WebContentsView` is a native view attached to a window content view; its bounds are not ordinary DOM layout and must be managed through main-process native-view APIs.

These constraints do not authorize credential inspection, cookie extraction, DOM automation, or security weakening.

## Confirmed Architecture Boundaries

Preserve:

```text
Prompt
→ participationRole=nonReviewHandoff
→ Document.Status=Approved
→ viewable and copyable
→ never an Operator review target

Interview output
→ artifactType=project-architect-interview
→ participationRole=gatingReview
→ new and substantive revisions begin Pending
→ explicit Operator review required
```

Repository evidence remains authoritative. Chat text, browser state, handoff-copy state, and authentication state do not independently authorize lifecycle progression.

## Root Cause Analysis

### Defect 1 — Exact target presence is treated as sufficient Interview identity

#### Current failure chain

```text
Prompt supplies output Markdown/JSON paths
→ context resolver searches for any document touching either target
→ same logical ID is accepted without validating substantive Interview metadata
→ generic freshness treats missing sourceRevisions as fresh
→ wrong-type or wrong-role pair can become reviewable
→ Approved disposition can produce rail Completed and Project Intake completion
```

#### Primary root cause

The canonical context resolver validates location more strongly than identity and provenance. It does not require that output at the target is the exact current Project Architect Interview artifact derived from the active Project Intake and associated prompt.

#### Required invariant

```text
Exact target paths
+ paired same-stem siblings
+ artifactType=project-architect-interview
+ participationRole=gatingReview
+ exact current Intake source revision
+ exact current prompt source revision
+ readable synchronized fresh pair
→ reviewable Interview output
```

Anything else is `Needs Attention` and cannot be approved.

### Defect 2 — Polling refreshes only a partial model

#### Current failure chain

```text
3-second poll calls getArchitectInterviewWorkspaceModel
→ logical ID is compared
→ first output may be selected
→ substantive revision keeps same logical ID
→ preview is not re-read
→ documents, counts, resolver, and current model remain stale
```

On quiet polling failure, the current implementation can clear the last successful Architect Interview model without preserving a visible polling error.

#### Primary root cause

Polling is implemented as a model fetch rather than an evidence-change reconciliation operation. It tracks only logical identity, not artifact revision, synchronization, freshness, or repository lifecycle projection.

#### Required invariant

```text
No evidence change
→ preserve current visible state and unsaved Operator edits

First output or changed artifact revision/disposition/synchronization/freshness
→ reload documents
→ reload exact preview
→ reload resolver
→ reload current workspace model
→ update rail and counts

Transient polling failure
→ preserve last good model and preview
→ display separate non-destructive error
```

### Defect 3 — Architect Interview status is view-scoped instead of repository-scoped

#### Current failure chain

```text
App starts or repository changes
→ generic documents/resolver load
→ Architect Interview model is not loaded unless its workspace is viewed
→ top rail defaults to Open
→ existing Pending, Completed, conflict, or stale evidence is misrepresented
```

Repository clear/switch also leaves Architect Interview model, local notes, copy feedback, and tracking references uncleared.

#### Primary root cause

The implementation conflates two scopes:

```text
Lifecycle status
→ repository-scoped

Continuous polling
→ viewed-workspace-scoped
```

#### Required invariant

The Architect Interview lifecycle model must load with repository state regardless of the viewed workspace. Polling remains limited to the viewed Architect Interview workspace.

### Defect 4 — Repository review state is disconnected from local controls

#### Current failure chain

```text
Repository contains RevisionRequested Interview with durable notes
→ model exposes disposition and notes
→ renderer retains generic actionInputs.status and local notes state
→ controls default to Approve or stale notes
→ visible review state disagrees with repository
```

#### Primary root cause

The renderer has no synchronization contract between canonical Interview identity/revision and local editable review controls.

#### Required invariant

```text
New repository, Interview identity, or artifact revision
→ hydrate status and notes from repository

Same unchanged revision during polling
→ preserve unsaved Operator edits

Prompt selection or no Interview
→ clear Interview review controls

Successful review
→ hydrate controls from returned canonical model
```

### Defect 5 — OAuth transaction is split across browser sessions

#### Current failure chain

```text
ChatGPT login starts in persist:champcity-architect
→ any non-chatgpt.com/chat.openai.com host is externalized
→ OpenAI authentication or identity-provider navigation opens in system browser
→ callback state/cookies no longer match the initiating Electron session
→ OAuthCallback error
```

#### Primary root cause

The navigation policy treats every non-primary ChatGPT host as unrelated external content. Authentication is a multi-origin transaction, and social authentication may not be permitted in an embedded user agent at all.

#### Required architecture

WC23 must support two explicit modes:

```text
Embedded ChatGPT mode
→ OpenAI-owned ChatGPT/authentication navigation remains in the dedicated persistent partition
→ no credential or DOM inspection
→ intended for authentication methods that function in the embedded surface

External ChatGPT mode
→ opens ChatGPT in the normal system browser
→ provides the same Copy Architect Handoff action
→ repository output remains authoritative
→ does not claim external authentication transfers into the embedded partition
```

Social-provider authentication must not be forced into a prohibited embedded user agent.

### Defect 6 — Prompt view still shows Interview review controls

#### Current failure chain

```text
Prompt selected
→ canApplyReview=false
→ Interview disposition region still renders disabled controls
→ UI implies the Prompt has a disposition decision
→ Prompt and Interview roles remain visually conflated
```

The current six-column control bar also compresses browser state, handoff, document selection, review controls, and refresh into one crowded row.

#### Primary root cause

The renderer uses disabled state to represent absence of authority instead of conditional composition based on artifact role.

#### Required invariant

```text
Prompt selected or Interview missing
→ no Interview disposition controls in DOM
→ read-only prompt statement only

Valid Interview selected
→ one clearly labeled Interview Review region
→ current status, notes, disposition, and Apply action grouped together
```

### Defect 7 — Native browser bounds chase outer DOM scrolling

#### Current failure chain

```text
Outer workspace scrolls DOM immediately
→ native WebContentsView remains at old window-relative bounds
→ renderer sends asynchronous setBounds IPC
→ repeated scroll events create overlapping updates
→ native view drifts over other UI and later snaps back
```

The main process also adds a window resize listener during attachment without a corresponding removal during detach or reattachment.

#### Primary root cause

A native child view is being treated like a clipped DOM descendant. Outer scrolling and asynchronous bounds chasing cannot guarantee stable containment.

#### Required invariant

```text
Architect Interview workspace outer shell
→ fixed to available viewport
→ does not scroll around native browser host

Document preview
→ internal scroll

Embedded ChatGPT page
→ internal scroll

Native bounds
→ updated only for stable layout changes
→ latest update wins
→ hidden/zeroed during transitions or when not visible
```

## Required Repair 1 — Strict Interview Output Identity and Provenance

Update the canonical Architect Interview context resolver.

### Target validation

Require output targets to:

- be repository-relative;
- use `.md` and `.json` siblings;
- share one exact filename stem;
- be under `planning/project/Project_Architect_Interviews/` using case-insensitive normalized comparison;
- not be archived or historical.

### Output document validation

When either target exists:

1. require one logical document containing both exact siblings;
2. reject a single sibling as local error;
3. require `artifactType=project-architect-interview`;
4. require `participationRole=gatingReview`;
5. require synchronized readable siblings;
6. require `sourceRevisions` containing:
   - exact active Project Intake JSON path and current revision;
   - exact associated prompt JSON path and current revision;
7. require freshness against both sources;
8. expose explicit diagnostics when any requirement fails;
9. set rail status `Needs Attention` and `canApplyDisposition=false` for invalid output.

Do not repair or migrate malformed output automatically.

## Required Repair 2 — Evidence-Reconciliation Refresh Pipeline

Replace ID-only polling logic with a bounded refresh coordinator.

A narrowly scoped helper is authorized under:

```text
src/shared/architectInterview/
```

or another existing bounded shared location.

### Evidence fingerprint

Track at minimum:

```text
repository identity
Interview logical document ID
artifact revision
disposition
synchronization state
freshness state
read-error state
```

### Poll behavior

While Architect Interview is viewed:

- poll every 2–5 seconds;
- allow only one poll in flight;
- ignore stale completions from superseded requests;
- compare the returned evidence fingerprint;
- when changed:
  - refresh the document list;
  - refresh workspace counts;
  - refresh the exact selected preview;
  - refresh resolver result;
  - refresh current workspace model;
  - refresh the repository-scoped Architect Interview model;
- when unchanged, do not overwrite local unsaved review edits;
- stop polling on workspace exit, repository switch, window unload, or component unmount.

### Failure behavior

- retain the last successful Architect Interview model;
- retain the last readable preview;
- store a separate polling error message;
- clear the polling error after a later successful poll;
- do not set the model to `null` solely because one poll failed.

### First output and revised output

- first valid output automatically selects the Interview;
- higher revision of the same logical document reloads the preview;
- malformed first output produces `Needs Attention` and does not become reviewable.

## Required Repair 3 — Repository-Scoped Lifecycle Initialization and Cleanup

Architect Interview lifecycle status must load during:

- initial selected-repository activation;
- application restart with an existing selected repository;
- repository switch;
- general document refresh;
- Project Intake submission or revision;
- Project Intake disposition changes;
- Architect Interview review changes.

### Cleanup

`clearRepositoryDerivedState()` or its bounded equivalent must clear:

```text
architectInterviewModel
architectReviewNotes
architect review dirty state
architectCopyFeedback
architect polling error
tracked Interview fingerprint
selected Architect Interview role/document
browser mode state that is repository-specific
```

Do not clear the persistent Electron session partition merely because the repository changes.

### Rail behavior

The top rail must display the correct evidence-derived status before the Architect Interview workspace is opened:

```text
Open
Waiting for Output
Awaiting Approval
Completed
Needs Attention
```

## Required Repair 4 — Review-Control Hydration Contract

Implement explicit local review-edit state.

Recommended shape:

```ts
{
  sourceKey: string | null;
  status: DocumentDispositionStatus;
  notes: string;
  isDirty: boolean;
}
```

The source key must include repository identity, Interview logical ID, and artifact revision.

### Hydration rules

- new source key → hydrate status and notes from the canonical model and set `isDirty=false`;
- same source key and `isDirty=true` → preserve local edits during polling;
- same source key after successful review → hydrate from returned model and clear dirty state;
- Prompt selection, no Interview, repository switch, or invalid output → clear review edit state;
- a new substantive revision resets controls to repository `Pending` and current review notes state;
- durable `RevisionRequested` notes must appear when reopening the application.

Review submission must use only the currently bound source key. Refuse submission if repository evidence changes between edit and Apply.

## Required Repair 5 — Explicit Embedded and External ChatGPT Modes

### Shared contract

Add a typed surface mode:

```text
embedded
external
```

The selected mode may be application-session state. Do not create repository workflow authority or a hidden consumed state.

### Embedded mode

- preserve `persist:champcity-architect`;
- preserve `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`, and no remote preload;
- allow OpenAI-owned ChatGPT authentication hosts required for login, including normalized subdomains of:
  - `chatgpt.com`;
  - `openai.com`;
- keep unrelated destinations external or denied;
- constrain allowed child windows with inherited secure web preferences;
- do not inspect credentials, cookies, DOM text, session storage, or account identity;
- do not claim social-provider compatibility unless Operator validation proves the actual provider works.

### External mode

Provide:

```text
Open ChatGPT in Browser
Copy Architect Handoff
```

Requirements:

- open only the allowlisted ChatGPT URL using `shell.openExternal`;
- do not pass tokens, cookies, or repository paths in the URL;
- use the same deterministic clipboard handoff;
- display that authentication occurs in the normal browser;
- hide or detach the embedded native view while external mode is active;
- retain the document preview pane and repository output polling;
- do not claim that external sign-in changes embedded sign-in state.

### Mode presentation

The action bar must clearly display:

```text
Architect Surface: Embedded ChatGPT
```

or:

```text
Architect Surface: External ChatGPT
```

The Operator must be able to switch modes explicitly.

## Required Repair 6 — Conditional Prompt and Interview Review UI

Recompose the dedicated Architect Interview controls into two rows.

### Row 1 — Workspace and handoff

Contain:

- Architect Interview lifecycle status;
- selected surface mode;
- browser status or external-browser status;
- sign-in guidance when applicable;
- Copy Architect Handoff;
- Open ChatGPT in Browser when external mode is selected;
- Refresh Output.

### Row 2 — Documents and review

Contain:

- Prompt selector;
- Interview selector;
- selected artifact role and path;
- conditional content.

#### Prompt selected or no Interview

Render:

```text
Prompt is an Approved handoff input; no Operator disposition is required.
```

Do not render the Interview disposition select, notes textarea, or Apply button.

#### Valid Interview selected

Render one region labeled:

```text
Interview Review
```

containing:

- current repository disposition;
- synchronization and freshness status;
- disposition selector;
- revision instructions when `RevisionRequested` is selected;
- Apply Interview Review.

#### Invalid Interview selected

Render `Needs Attention` diagnostics. Do not render an enabled review action.

Preserve the two-pane main workspace. Do not restore a third document-list pane.

## Required Repair 7 — Stable Native Surface Containment

### Renderer layout

When Architect Interview is viewed in embedded mode:

- apply an Architect Interview-specific workspace class;
- prevent outer `.workspace-surface` vertical scrolling;
- size the control region and two-pane workspace within the available viewport using `minmax(0, 1fr)` and `min-height:0` chains;
- scroll only the document preview body and the remote ChatGPT page;
- avoid horizontal workspace overflow at supported widths.

At narrow supported widths, choose one explicit behavior:

- stack preview and embedded surface without outer scrolling around the native host; or
- switch to external mode with clear Operator messaging.

Do not allow the native view to overlap the header, rail, sidebar, or control bar.

### Bounds coordinator

Replace direct scroll-event IPC calls with a bounded coordinator:

- calculate bounds on workspace entry;
- recalculate on window resize, host `ResizeObserver`, and explicit layout/mode changes;
- coalesce updates with one `requestAnimationFrame` callback;
- do not issue bounds updates for outer scroll events after outer scrolling is disabled;
- attach a monotonically increasing sequence number or latest-request guard;
- ignore stale bounds responses;
- zero or hide the native view before mode changes, detach, or host disappearance;
- restore bounds only after stable layout measurement.

### Main-process listener lifecycle

- add the resize listener only once per attached window;
- remove it on detach, window close, or window replacement;
- close the `WebContentsView.webContents` when the owning application window is permanently closed;
- do not accumulate listeners over repeated workspace navigation.

## Authorized Production Files

Expected production changes are limited to:

```text
src/main/architectInterview/architectInterviewContextResolver.ts
src/main/architectInterview/architectInterviewService.ts
src/main/browser/architectBrowserService.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/projectRailPresentation.ts
src/shared/architectInterview/<one or two bounded refresh/presentation helpers>.ts
src/renderer/app/App.tsx
src/renderer/styles.css
```

`src/renderer/app/NestedWorkflowRail.tsx` is authorized only if required to preserve status typing or presentation after model initialization changes.

No production change outside this list is authorized without a concrete, direct explanation in the Implementer Report.

## Expected Test Files

```text
test/architect-interview/architect-interview-workspace.test.cjs
test/browser/architect-browser-handoff.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/renderer/architect-interview-refresh-state.test.cjs
test/browser/architect-browser-bounds.test.cjs
```

Exact filenames may differ, but tests must remain narrowly scoped.

## Required Tests

### Interview identity and provenance

Test:

1. valid exact current Interview output is reviewable;
2. wrong artifact type is `Needs Attention`;
3. wrong participation role is `Needs Attention`;
4. missing source revisions are `Needs Attention`;
5. wrong Intake source path or revision is `Needs Attention`;
6. wrong prompt source path or revision is `Needs Attention`;
7. noncanonical target directory is rejected;
8. mismatched stems are rejected;
9. one missing sibling is not reviewable;
10. stale current source revision cannot complete the stage.

### Refresh reconciliation

Test:

1. first output detection selects Interview;
2. same logical ID with higher revision reloads preview;
3. disposition-only evidence change refreshes lifecycle status;
4. synchronization/freshness change refreshes `Needs Attention`;
5. resolver and current model refresh after evidence change;
6. transient polling failure preserves last model and preview;
7. later success clears polling error;
8. overlapping poll calls cannot apply out of order;
9. interval stops on workspace exit and unmount.

### Repository lifecycle initialization

Test:

1. completed Interview displays `Completed` immediately after application/repository load;
2. Pending displays `Awaiting Approval` without visiting the workspace first;
3. invalid evidence displays `Needs Attention` without visiting first;
4. repository switch clears prior model and notes;
5. repository clear removes prior Architect Interview state;
6. switching back recomputes from that repository’s evidence.

### Review hydration

Test:

1. persisted RevisionRequested status and notes hydrate controls;
2. same-revision polling preserves dirty local edits;
3. new artifact revision resets controls from repository;
4. Prompt selection clears Interview review edits;
5. repository switch clears review edits;
6. successful review rehydrates returned status and notes;
7. source-key mismatch blocks stale review submission.

### Authentication and surface modes

Test:

1. OpenAI-owned ChatGPT/auth hosts are classified for embedded mode;
2. unrelated hosts remain external or denied;
3. child windows inherit secure preferences;
4. Google/social provider compatibility is not fabricated;
5. external mode opens only the allowlisted ChatGPT URL;
6. external mode does not alter embedded sign-in state;
7. mode switch hides or detaches the native view appropriately;
8. clipboard handoff is identical in both modes;
9. no credential, cookie, token, DOM, or session-storage read is introduced.

### Conditional review UI

Test through pure presentation helpers:

1. Prompt selection returns no Interview review region;
2. missing Interview returns no review region;
3. invalid Interview returns diagnostics and no enabled review action;
4. valid Interview returns the Interview Review region;
5. RevisionRequested selection requires nonblank notes;
6. Prompt statement is visible and unambiguous;
7. two-row action-bar presentation is selected only for Architect Interview.

Source-string assertions may support regression checks but cannot be the sole proof of behavior.

### Native bounds and listener lifecycle

Test:

1. normalized bounds never use negative dimensions;
2. latest bounds sequence wins;
3. stale asynchronous update is ignored;
4. hidden/zero bounds are applied during detach or mode change;
5. repeated attach does not add duplicate resize listeners;
6. detach removes the listener;
7. owning-window close releases the native view webContents;
8. outer scroll is not used as the bounds-update driver.

## Validation

Run the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

When the sandbox produces the documented `spawn EPERM` condition, rerun the affected command in the normal Windows lane and report both results accurately.

Perform a non-acceptance Electron launch smoke confirming only:

- application starts;
- Architect Interview workspace renders;
- embedded and external surface modes can be selected;
- the native view attaches and detaches without immediate failure;
- no immediate layout overflow or crash occurs;
- polling starts and stops;
- Prompt view contains no disposition controls.

The launch smoke does not prove authentication, OAuth completion, live ChatGPT behavior, MCP write-back, visual containment, or Operator acceptance.

## Acceptance Criteria

WC23 is acceptable for Architect review only when:

1. only valid current Project Architect Interview evidence can be reviewed or complete the stage;
2. wrong type, role, sources, paths, sibling structure, synchronization, freshness, or read state produces `Needs Attention`;
3. polling recognizes artifact revision and state changes, not only logical ID;
4. revised same-ID Interview content reloads visibly;
5. evidence change refreshes documents, counts, resolver, current model, and rail;
6. transient polling failure preserves last good model and preview;
7. polling errors are separate and recoverable;
8. Architect Interview status loads before the workspace is visited;
9. repository switch or clear cannot leak prior Interview state or notes;
10. persisted review disposition and notes hydrate correctly;
11. unsaved same-revision edits survive polling;
12. stale local review submission is blocked after evidence change;
13. embedded mode preserves secure browser preferences and required OpenAI-owned auth navigation;
14. external mode provides a supported normal-browser path without fabricating embedded authentication;
15. social-provider compatibility is not claimed without real Operator evidence;
16. Prompt selection renders no Interview disposition controls;
17. valid Interview review controls are grouped in one clearly labeled region;
18. control bar uses separate workspace/handoff and document/review rows;
19. the main Architect Interview workspace remains dual-pane;
20. outer application scrolling does not move the native browser surface;
21. preview and remote page scroll internally;
22. bounds updates are coalesced and stale updates cannot win;
23. native-view resize listeners do not accumulate;
24. native view is hidden or zeroed during detach and mode transitions;
25. all existing Project Intake, rail, resolver, and Architect Interview tests remain green;
26. typecheck, build, and all tests pass;
27. no unrelated subsystem, new dependency, provider API, DOM automation, credential inspection, hidden workflow authority, or Git mutation is introduced.

## Explicit Non-Goals

Do not:

- modify the WC22 Implementer Report;
- change Project Intake artifact identity, disposition, archive, or rail rules;
- change Project Planning or later lifecycle workspaces;
- implement automatic remote ChatGPT message submission;
- inject scripts into ChatGPT;
- inspect ChatGPT DOM content, credentials, cookies, tokens, account identity, or session storage;
- force Google OAuth through the embedded user agent;
- create a custom OAuth client or custom OpenAI authentication flow;
- add provider APIs or SDKs;
- persist raw chat transcripts;
- create handoff-consumed, submitted, route-token, execution-run, or approval-queue state;
- create a third main workspace pane;
- migrate malformed Interview output automatically;
- add dependencies;
- perform Git operations.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC23_architect_interview_integrity_authentication_and_native_surface_stability_repair.md`

The report must include:

- repository, remote, branch, and starting dirty-tree inventory;
- exact files created, modified, and deleted;
- final strict Interview identity/provenance rules;
- malformed-output diagnostics and tests;
- evidence fingerprint and refresh coordinator behavior;
- poll overlap prevention and failure preservation;
- initial-load and repository-switch lifecycle behavior;
- review-control source key and hydration rules;
- embedded versus external surface-mode contract;
- final host allowlist and external-navigation policy;
- child-window security behavior;
- final two-row control-bar structure;
- exact conditions under which Interview review UI is absent or present;
- Architect Interview workspace overflow and scroll model;
- bounds coalescing and latest-update behavior;
- resize-listener and native-view lifecycle cleanup;
- tests added or changed;
- typecheck, build, and complete test results;
- Electron launch-smoke result and limitations;
- remaining Operator validation;
- final repository status;
- confirmation that the WC22 Implementer Report was not changed;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Manual Validation After Architect Review

The Operator will perform controlling validation after Architect review.

### Evidence integrity

1. Open a valid Pending Interview and confirm `Awaiting Approval`.
2. Test wrong artifact type at exact targets and confirm `Needs Attention`.
3. Test wrong role, missing sources, wrong revisions, mismatched siblings, and stale sources.
4. Confirm none can be approved or complete the stage.

### Refresh and repository isolation

5. Write the first valid Interview through ChampCity MCP and confirm automatic selection.
6. Revise the same Interview pair with a higher artifact revision and confirm preview refresh.
7. Confirm rail, counts, resolver, and required workspace update.
8. Simulate a transient read failure and confirm the last good preview remains visible with a separate error.
9. Switch repositories and confirm no prior status, notes, feedback, or selection leaks.
10. Restart with an existing Approved Interview and confirm the rail immediately reads `Completed`.

### Review hydration

11. Open a RevisionRequested Interview and confirm its status and durable notes populate the controls.
12. Type unsaved notes, wait through several polls, and confirm they remain.
13. Create a new substantive revision and confirm controls reset to the new Pending evidence.
14. Select Prompt and confirm all Interview review controls disappear.

### Authentication modes

15. In Embedded ChatGPT mode, test the account’s actual authentication method.
16. Confirm OpenAI-owned authentication navigation stays in the intended embedded session where supported.
17. Confirm unrelated links remain externally constrained.
18. For social authentication that cannot operate embedded, switch to External ChatGPT mode.
19. Confirm normal-browser ChatGPT opens and Copy Architect Handoff remains available.
20. Confirm the app does not claim external authentication signed in the embedded surface.

### UI and native view

21. Confirm the control bar has a workspace/handoff row and a document/review row.
22. Confirm Prompt view shows only the read-only prompt statement.
23. Confirm valid Interview view shows one clearly labeled Interview Review region.
24. Scroll the document preview extensively and confirm the native browser remains fixed in its pane.
25. Confirm the outer workspace does not scroll the native browser host.
26. Resize the window repeatedly and confirm no drift, snap-back, overlap, or stale bounds.
27. Switch embedded/external modes repeatedly and confirm the native surface hides and restores cleanly.
28. Navigate away and back repeatedly and confirm no duplicate resize behavior or view leakage.
29. Repeat at maximized, intermediate, and minimum supported sizes.
30. Confirm no credentials, cookies, tokens, DOM automation, automatic submission, or raw transcript behavior is exposed.
