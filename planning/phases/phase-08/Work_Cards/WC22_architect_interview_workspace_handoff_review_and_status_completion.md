<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC22"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC22",
    "phaseId": "phase-08",
    "title": "Architect Interview Workspace Handoff, Review, and Status Completion",
    "status": "draft_for_operator_review",
    "owner": "Implementer upon Operator approval",
    "risk": "high",
    "dependsOn": [
      "WC21"
    ],
    "executionInstruction": "Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.",
    "gitMutationAuthorized": false,
    "purpose": "Complete the Architect Interview workspace through honest sign-in presentation, canonical associated artifact resolution, explicit Operator-controlled MCP handoff, dual-pane layout, prompt-versus-output review authority, durable revision notes, evidence-derived rail status, and bounded repository output detection.",
    "controllingDesigns": [
      "planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md",
      "planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md",
      "planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md",
      "planning/phases/phase-08/Work_Cards/WC03_embedded_architect_browser_and_mcp_handoff_validation.md",
      "planning/phases/phase-08/Work_Cards/WC04_architect_interview_workspace.md",
      "Approved WC20 and WC21 artifacts and validation evidence"
    ],
    "confirmedArtifactSemantics": {
      "prompt": {
        "participationRole": "nonReviewHandoff",
        "disposition": "Approved",
        "reviewTarget": false
      },
      "interviewOutput": {
        "participationRole": "gatingReview",
        "initialAndRevisedDisposition": "Pending",
        "supportedReviewDispositions": [
          "Approved",
          "Rejected",
          "RevisionRequested"
        ],
        "completionRule": "Current Interview pair must be synchronized, fresh, and Approved."
      }
    },
    "rootCauseAnalysis": [
      {
        "defectId": "misleading-sign-in-confirmation",
        "primaryRootCause": "The renderer always shows Confirm Signed In and the main process treats a click as proof without distinguishing an Operator assertion from detected authentication."
      },
      {
        "defectId": "unusable-three-pane-layout",
        "primaryRootCause": "The generic full-height document selector was retained alongside preview and Architect Surface, violating the confirmed dual-pane design and exceeding normal usable width."
      },
      {
        "defectId": "prompt-output-role-conflation",
        "primaryRootCause": "Disposition authority is derived from workspace identity rather than whether the selected artifact is the Approved prompt or the substantive Interview output."
      },
      {
        "defectId": "revision-request-without-instructions",
        "primaryRootCause": "The existing disposition action writes status only and collects no durable Operator revision notes."
      },
      {
        "defectId": "generic-architect-interview-rail-label",
        "primaryRootCause": "Only Project Intake receives an evidence-derived rail status; Architect Interview falls back to OPEN for every lifecycle state."
      },
      {
        "defectId": "manifest-without-operator-handoff",
        "primaryRootCause": "WC03 discovers paths but provides no concrete Operator-controlled instruction to transfer into the embedded ChatGPT conversation."
      },
      {
        "defectId": "lexicographic-artifact-mixing",
        "primaryRootCause": "Intake and prompt paths are selected independently by lexicographic latest-path behavior rather than one associated synchronized logical-document family."
      },
      {
        "defectId": "dedicated-workspace-model-disconnected",
        "primaryRootCause": "The Architect Interview service model is not exposed through IPC/preload and the renderer uses generic documents and generic actions."
      },
      {
        "defectId": "no-active-output-detection",
        "primaryRootCause": "No bounded refresh loop watches the exact Interview output targets while the workspace is active."
      },
      {
        "defectId": "dead-browser-workflow-states",
        "primaryRootCause": "Browser load/auth state and handoff/output workflow state are conflated in one type, with values that are never assigned."
      }
    ],
    "requiredRepairs": [
      {
        "id": "canonical-architect-interview-context",
        "requirements": [
          "Resolve one active canonical Project Intake using WC20 corpus rules",
          "Resolve one synchronized readable Approved nonReviewHandoff prompt associated to the exact Intake paths and current source revision",
          "Reject archived historical stale mismatched wrong-role unrelated or ambiguous prompt evidence",
          "Support alternate WC20 canonical Intake paths",
          "Use one logical document for each Markdown/JSON pair",
          "Recognize Interview output only at exact prompt targets",
          "Do not choose by filename or lexicographic latest path"
        ]
      },
      {
        "id": "operator-controlled-mcp-handoff",
        "requirements": [
          "Generate one deterministic instruction containing exact Intake prompt and output paths",
          "Require substantive synchronized Pending Interview output through ChampCity MCP",
          "Include current RevisionRequested notes when applicable",
          "Provide Copy Architect Handoff through bounded clipboard write",
          "Never read clipboard contents",
          "Do not automate DOM interaction or remote message submission",
          "Do not persist hidden submitted consumed or execution state"
        ]
      },
      {
        "id": "honest-browser-auth-presentation",
        "requirements": [
          "Keep WC03 partition and security settings unchanged",
          "Show I Have Signed In only for loaded-auth-state-unknown",
          "Describe confirmation as Operator-supplied rather than detected",
          "Show noninteractive confirmed state after assertion",
          "Reset confirmation on normal loading navigation lifecycle",
          "Remove or relocate dead handoff/output values from browser load state",
          "Do not inspect credentials cookies DOM session storage or account identity"
        ]
      },
      {
        "id": "dedicated-workspace-model-and-ipc",
        "requirements": [
          "Expose a canonical repository-derived Architect Interview workspace model through main IPC preload and shared contracts",
          "Include state rail status handoff prompt Interview targets selected artifact role disposition synchronization freshness review eligibility errors and current review notes",
          "Use no hidden route queue consumed or active-document store"
        ]
      },
      {
        "id": "architect-interview-rail-status",
        "statusMap": {
          "prerequisitesUnavailable": "Open",
          "approvedPromptNoOutput": "Waiting for Output",
          "pendingRevisionRequestedOrRejectedOutput": "Awaiting Approval",
          "approvedFreshSynchronizedOutput": "Completed",
          "conflictReadErrorMismatchOrStale": "Needs Attention"
        },
        "requirements": [
          "Pass status from App to NestedWorkflowRail",
          "Preserve WC21 selected and required states",
          "Do not restore CURRENT",
          "Do not alter Project Intake or lower-loop semantics"
        ]
      },
      {
        "id": "dedicated-action-bar-and-dual-pane-layout",
        "requirements": [
          "Replace generic Architect Interview action panel with dedicated controls",
          "Move prompt and Interview document selector into the control bar",
          "Show browser auth handoff role path status refresh review and revision controls in the bar",
          "Render only preview and Architect Surface as main panes",
          "Avoid horizontal workspace overflow at supported widths",
          "Stack vertically at narrow breakpoint",
          "Preserve other workspace layouts"
        ]
      },
      {
        "id": "prompt-versus-output-review-authority",
        "requirements": [
          "Prompt remains viewable read-only Approved handoff input",
          "Prompt selection never shows Interview disposition controls",
          "No Interview output means review unavailable",
          "Only exact readable synchronized Interview output can be reviewed",
          "Stale mismatched unreadable or conflicting output shows Needs Attention and cannot be Approved",
          "Remove misleading generic specialized-authority message"
        ]
      },
      {
        "id": "durable-interview-review-notes",
        "requirements": [
          "Implement dedicated Interview review action writing status and notes to both siblings atomically",
          "Require nonblank notes for RevisionRequested",
          "Write Markdown Operator Review Notes section",
          "Write structured JSON operatorReview object",
          "Create no separate revision artifact",
          "Preserve Pending plus revision increment for later substantive Interview revisions",
          "Preserve viewed workspace and refresh rail and current model after review"
        ]
      },
      {
        "id": "active-output-detection",
        "requirements": [
          "Refresh exact canonical workspace model every 2 to 5 seconds only while Architect Interview is viewed",
          "Stop refresh when workspace changes or component unmounts",
          "Retain manual Refresh Output action",
          "Detect and select exact Interview output when it first appears",
          "Refresh on higher artifact revision",
          "Preserve last readable preview during transient failure",
          "Treat repository evidence rather than chat text as authoritative"
        ]
      }
    ],
    "authorizedFiles": [
      "src/main/architectInterview/architectInterviewService.ts",
      "src/main/architectInterview/one bounded canonical-context helper",
      "src/main/browser/architectBrowserService.ts",
      "src/main/integrations/architectMcpHandoffService.ts",
      "src/main/main.ts",
      "src/preload/index.ts",
      "src/shared/workspaceContracts.ts",
      "src/shared/architectInterview/one bounded presentation or model helper if needed",
      "src/renderer/app/App.tsx",
      "src/renderer/app/NestedWorkflowRail.tsx",
      "src/renderer/styles.css",
      "src/shared/workspaces/documentWorkspace.ts only if existing metadata cannot supply role labels",
      "Focused Architect Interview browser renderer and resolver regression tests"
    ],
    "productionFilesExpectedUnchanged": [
      "src/main/projectIntake/projectIntakeService.ts",
      "src/shared/projectIntake/projectIntakeCorpus.ts except import use only",
      "Project Planning and later lifecycle services",
      "Generic disposition behavior outside Architect Interview",
      "Project Intake renderer and rail semantics",
      "Lower Phase and Work Card loop rails"
    ],
    "nonGoals": [
      "Provider API or SDK integration",
      "Remote ChatGPT DOM automation",
      "Automatic remote-message submission",
      "Credential cookie session-storage DOM-text or account-identity inspection",
      "Browser extension",
      "Raw transcript persistence",
      "Hidden handoff submitted consumed queue route-token execution-run or active-chat state",
      "Placeholder or auto-approved Interview output",
      "Project Intake semantic changes",
      "Project Planning or later lifecycle changes",
      "Global rail redesign",
      "New dependencies",
      "Git mutation"
    ],
    "requiredTests": [
      "Canonical associated Intake prompt and Interview target resolution",
      "Alternate canonical Intake path support",
      "Archive historical stale mismatch wrong-role and ambiguity rejection",
      "No independent sibling path mixing",
      "Deterministic handoff instruction and clipboard-write safety",
      "Explicit browser auth assertion lifecycle and unchanged security",
      "Prompt read-only and Interview-only review authority",
      "RevisionRequested notes required and synchronized in both siblings",
      "New and revised Interview output Pending semantics",
      "Rail Open Waiting for Output Awaiting Approval Completed and Needs Attention mapping",
      "Selection required and lifecycle status independence",
      "Bounded active refresh start stop output detection revision refresh and last-readable preview behavior",
      "Other workspace layout and disposition regression"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Non-acceptance Electron launch smoke",
      "Operator-controlled live sign-in handoff interview revision approval and responsive-layout validation"
    ],
    "acceptanceCriteria": [
      "Sign-in confirmation is explicitly Operator-supplied and not presented as detected",
      "WC03 browser security remains unchanged",
      "Canonical context does not mix unrelated or archived artifacts",
      "Alternate WC20 Intake paths work",
      "Copy Architect Handoff provides exact deterministic MCP instruction without automatic submission",
      "Dedicated workspace model is exposed through IPC/preload",
      "Architect Interview rail status is evidence-derived and independent from selection and required ring",
      "Main workspace is dual-pane and selector is in the action bar",
      "Prompt and Interview output roles are distinct",
      "Prompt cannot be dispositioned",
      "Interview output is Pending and requires explicit review",
      "RevisionRequested requires durable notes in both siblings",
      "Stale mismatched unreadable or conflicting output cannot be approved",
      "Active workspace detects exact output and revised artifact revisions",
      "Approved fresh synchronized Interview completes the stage and advances required context without forced navigation",
      "Other workspaces remain unchanged",
      "Typecheck build and all tests pass",
      "No dependency hidden authority or Git mutation is introduced"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC22_architect_interview_workspace_handoff_review_and_status_completion.md"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC22 Architect Interview Workspace Handoff, Review, and Status Completion

Status: draft for Operator review
Owner: Implementer upon Operator approval
Phase: phase-08
Risk: high
Depends on: completed and Operator-validated WC21 Project Intake Required-Step Highlight and Inline Disposition Repair
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC22_architect_interview_workspace_handoff_review_and_status_completion.md`

Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.

## Purpose

Complete the Architect Interview workspace within the confirmed browser, MCP, artifact, and authority boundaries.

WC22 repairs the following confirmed defects:

1. the browser header always presents `Confirm Signed In`, even while the embedded surface visibly shows the ChatGPT sign-in page, and the control changes browser state without detecting authentication;
2. the workspace uses three persistent side-by-side panes—document selector, document preview, and Architect Surface—making the preview and embedded ChatGPT surface too narrow for practical use;
3. the generated Project Architect Interview Prompt and the substantive Project Architect Interview output are presented as though they have the same role, allowing disposition controls to appear while only the Approved prompt exists;
4. revision requests can change the Interview disposition to `RevisionRequested`, but the Operator cannot enter durable revision instructions;
5. the Architect Interview top-rail card retains a generic `OPEN` label instead of an evidence-derived lifecycle status like the Project Intake card;
6. the current handoff manifest discovers repository paths but provides no concrete Operator-controlled instruction to transfer into the embedded ChatGPT conversation;
7. prompt, Intake, and Interview context is selected through independent lexicographic “latest path” behavior rather than one canonical associated artifact family;
8. the dedicated Architect Interview workspace model and output-state service exist but are not integrated into the renderer;
9. Interview output created through ChampCity MCP is not detected automatically while the workspace is open;
10. several browser-state type values describe handoff/output states that the browser service never sets.

This card is bounded to the Project / Intake / Architect Interview workspace. It does not implement provider APIs, browser DOM automation, automatic remote-message submission, raw transcript storage, Project Planning, later lifecycle workspaces, or Git operations.

## Controlling Designs

Read and follow:

- `planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`
- `planning/phases/phase-08/Work_Cards/WC03_embedded_architect_browser_and_mcp_handoff_validation.md`
- `planning/phases/phase-08/Work_Cards/WC04_architect_interview_workspace.md`
- the Approved WC20 and WC21 Work Cards and their Approved validation evidence

The Generated Architect Handoff Contract explicitly prohibits automatic remote-message submission. WC22 must implement an explicit Operator-controlled handoff rather than DOM injection or automated submission.

## Verified Current Code Ownership

### Browser attachment and sign-in confirmation

Owned by:

- `src/main/browser/architectBrowserService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`

Current `confirmArchitectSignedIn()` only performs:

```ts
currentBrowserState = "operator-confirmed-signed-in";
```

It does not and must not inspect credentials, cookies, DOM content, or session storage.

### Handoff manifest

Owned by:

`src/main/integrations/architectMcpHandoffService.ts`

The service currently finds the lexicographically latest prompt Markdown, prompt JSON, Intake Markdown, and Intake JSON independently. It does not prove that the four paths belong to synchronized, Approved, associated logical document pairs.

### Architect Interview artifact model and review

Owned by:

`src/main/architectInterview/architectInterviewService.ts`

The service already establishes the correct substantive-output disposition rule:

```text
new or substantively revised Project Architect Interview
→ participationRole=gatingReview
→ Document.Status=Pending
```

It supports synchronized disposition writes, but the renderer does not consume `getArchitectInterviewWorkspaceModel()`, and revision rationale is not written.

### Renderer, action controls, document selection, and layout

Owned by:

- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`

The current Architect layout is:

```text
Document selector | Document preview | Architect Surface
```

The generic `CurrentActionPanel` exposes disposition actions for the Architect Interview workspace even when the visible document is the Approved prompt and the substantive Interview output does not exist.

### Rail presentation

Owned by:

- `src/renderer/app/NestedWorkflowRail.tsx`
- the WC21 presentation helper under `src/shared/workspaces/`

Only Project Intake currently receives an evidence-derived lifecycle label.

## Confirmed Artifact Semantics

### Generated Project Architect Interview Prompt

The generated prompt remains:

```text
Document.Status=Approved
```

This is correct. It is an instruction artifact generated from reviewed Project Intake evidence and is not an independent approval target.

### Substantive Project Architect Interview

The Architect-authored Interview output must be created and revised as:

```text
Document.Status=Pending
```

The Interview output must support:

```text
Approved
Rejected
RevisionRequested
```

Project Intake completes only when the current Interview pair is synchronized, fresh, and Approved.

WC22 must not change these semantics.

## Root Cause Analysis

### Defect 1 — Misleading sign-in control

```text
Browser loads allowed ChatGPT URL
→ browser state becomes loaded-auth-state-unknown
→ renderer always shows Confirm Signed In
→ click unconditionally changes state to operator-confirmed-signed-in
→ application can claim confirmation while sign-in page remains visible
```

Primary cause: the UI does not distinguish an Operator assertion from application-detected authentication.

Correct model:

```text
loading
→ show loading status, no confirmation button

loaded-auth-state-unknown
→ instruct Operator to sign in in the embedded surface
→ show “I Have Signed In” as an explicit manual assertion

operator-confirmed-signed-in
→ show noninteractive confirmation state

navigation/reload
→ reset to loading, then auth-state-unknown
```

The application must not claim automatic authentication detection.

### Defect 2 — Three-pane workspace violates the confirmed dual-pane design

```text
generic document selector column retained
+ document preview column
+ Architect Surface column
→ minimum widths exceed normal usable workspace width
→ horizontal scroll and truncated content
→ ChatGPT and preview are not practically usable together
```

Primary cause: the generic document-list layout was reused instead of integrating document selection into Architect Interview controls.

Correct layout:

```text
Architect Interview action/control bar
├── browser/auth status
├── canonical handoff status and Copy Handoff control
├── document selector
├── document role/status
├── review disposition
└── revision instructions when required

Main workspace
├── Interview/prompt preview
└── Architect Surface
```

### Defect 3 — Prompt and Interview roles are conflated

```text
Prompt and Interview classified into one workspace group
→ prompt is visible while waiting for output
→ generic Architect Interview disposition controls are enabled
→ action path targets missing Interview output
→ applying disposition fails because Interview document does not exist
```

Primary cause: the renderer uses workspace identity instead of artifact role to determine review authority.

Correct model:

```text
Prompt
→ Approved non-review handoff input
→ viewable, copyable, never dispositioned in this workspace

Interview output
→ Pending gating-review output
→ disposition controls available only when exact canonical output exists and is readable
```

### Defect 4 — RevisionRequested contains no durable revision instructions

```text
Operator selects Request Revision
→ status changes on both siblings
→ no notes field is collected
→ Architect cannot determine what must change from repository evidence
```

Primary cause: generic disposition persistence stores only status.

Correct model:

```text
RevisionRequested
→ nonblank Operator revision instructions required
→ instructions written into both Interview siblings
→ same Interview pair remains the durable review record
→ no separate revision artifact
```

### Defect 5 — Architect Interview rail status is generic navigation text

```text
rail receives Project Intake lifecycle status only
→ Architect Interview falls back to OPEN
→ missing output, pending output, stale output, and approved output look identical
```

Primary cause: no evidence-derived Architect Interview presentation model is supplied to the rail.

### Defect 6 — Handoff manifest is not an executable Operator handoff

```text
manifest locates paths
→ renderer displays paths
→ embedded ChatGPT receives no instruction
→ Operator has no bounded transfer action
```

Primary cause: WC03 implemented only the local foundation and deferred real Operator-observed transfer.

The controlling handoff contract prohibits automatic remote submission. The compliant repair is an explicit, copyable MCP handoff instruction.

### Defect 7 — Canonical context is selected independently and lexicographically

```text
latest Intake Markdown selected independently
latest Intake JSON selected independently
latest prompt Markdown selected independently
latest prompt JSON selected independently
→ manifest can combine unrelated siblings
→ archived, stale, mismatched, or unrelated artifacts can be selected
```

`architectInterviewService.latestPrompt()` also chooses a lexicographically last prompt without proving association to the active canonical Intake.

Primary cause: no single canonical Architect Interview context resolver exists.

### Defect 8 — Dedicated workspace service is disconnected from renderer

```text
architectInterviewService exposes waiting/ready/error/completion model
→ no IPC/preload API exposes that model
→ App uses generic documents and generic current action panel
→ dedicated state rules do not control the workspace
```

### Defect 9 — No automatic output detection

```text
Architect writes canonical Interview pair through ChampCity MCP
→ application does not watch or poll the target
→ prompt remains selected until manual global Refresh
```

Primary cause: no bounded active-workspace refresh loop exists.

### Defect 10 — Dead browser workflow states

`ArchitectBrowserLoadState` declares:

```text
handoff-ready
handoff-submitted
output-detected
```

The browser service never assigns those values. Browser loading/auth state and workflow handoff/output state are conflated in one type.

## Required Outcome

```text
Approved Project Intake + Approved associated prompt
→ Architect Interview rail: Waiting for Output
→ dedicated action bar identifies exact prompt and output targets
→ Operator signs in through embedded browser
→ Operator explicitly confirms “I Have Signed In”
→ Operator copies deterministic MCP handoff instruction
→ Operator pastes/sends it in embedded ChatGPT
→ ChatGPT uses ChampCity MCP and writes Pending Interview pair to exact targets
→ active workspace detects output and selects Interview
→ rail: Awaiting Approval
→ Operator reviews and may Approve, Reject, or Request Revision with instructions
→ Approved synchronized fresh Interview
→ rail: Completed
→ current required workspace advances to Project Planning
```

## Required Repair 1 — Canonical Architect Interview Context Resolver

Implement one bounded canonical-context resolver used by both the handoff service and Architect Interview service.

A new file is authorized under:

```text
src/main/architectInterview/
```

The resolver must return one of:

```text
prerequisites-unavailable
ready
conflict
local-error
```

For a ready context it must provide:

- the one active canonical Project Intake logical document;
- exact Intake Markdown and JSON paths;
- Intake artifact revision and disposition;
- the one associated Project Architect Interview Prompt logical document;
- exact prompt Markdown and JSON paths;
- prompt artifact revision, synchronization, freshness, role, and disposition;
- exact Architect Interview output Markdown and JSON targets;
- the current Interview logical document when it exists at either exact target;
- repository-relative evidence paths.

### Intake selection

Use the WC20 active Project Intake corpus rules.

Required behavior:

- zero active canonical Intakes → prerequisites unavailable;
- more than one active canonical Intake → conflict;
- archived/historical Intakes do not participate;
- alternate canonical Intake paths accepted by WC20 remain supported.

### Prompt association

The prompt must:

- be one logical Markdown/JSON pair, not independently selected paths;
- have `artifactType=project-architect-interview-prompt` or the exact canonical prompt classification;
- have `participationRole=nonReviewHandoff`;
- be synchronized and readable;
- be Approved;
- be nonhistorical and outside `planning/archive/`;
- reference the active Intake through its exact canonical paths and current source revision;
- contain exact Architect Interview output targets.

If more than one current associated prompt qualifies, return conflict. Do not silently choose by filename or sort order.

### Interview output selection

The substantive Interview is recognized only when a logical document exists at one or both exact prompt output targets.

Do not select another Interview by filename, latest path, or project name.

## Required Repair 2 — Canonical Handoff Manifest and Operator-Controlled Transfer

Refactor `architectMcpHandoffService.ts` to consume the canonical context resolver.

The manifest must never combine independently selected sibling paths.

It must report unavailable/conflict/failure when canonical context is not valid.

### Deterministic handoff instruction

Generate one exact Operator-controlled instruction containing:

- the exact prompt Markdown and JSON paths;
- the exact Project Intake Markdown and JSON paths;
- the exact Interview output Markdown and JSON targets;
- the repository reference `<PROJECT_REPO>`;
- instruction to conduct the Architect Interview conversationally;
- instruction that chat text is not the durable record;
- instruction to write synchronized substantive Markdown/JSON Interview siblings through ChampCity MCP;
- instruction that the new or revised Interview output must be `participationRole=gatingReview` and `Document.Status=Pending`;
- instruction to read and address current Operator revision notes when the Interview is `RevisionRequested`;
- instruction not to create placeholder output before the interview is substantively complete.

### Copy action

Provide an explicit action:

```text
Copy Architect Handoff
```

A bounded clipboard-write IPC/preload method is authorized.

Requirements:

- write only the generated handoff instruction;
- do not read clipboard contents;
- do not inspect or automate the remote ChatGPT DOM;
- return clear local success/failure feedback;
- copying does not create a hidden submitted/consumed state;
- copying does not authorize progression;
- the Operator manually pastes and sends the instruction in the embedded chat.

Automatic remote-message submission remains prohibited.

## Required Repair 3 — Honest Browser Sign-In Presentation

Keep the existing dedicated partition and browser security configuration unchanged.

### Browser state boundary

`ArchitectBrowserLoadState` must describe browser loading/auth-confirmation state only.

Remove unused handoff/output values from that type or move them into the dedicated Architect Interview workspace model.

Do not claim auth detection.

### Renderer behavior

For browser states:

```text
loading
→ show Loading ChatGPT…
→ no confirmation action

loaded-auth-state-unknown
→ show “Sign in using the embedded ChatGPT surface. After the normal ChatGPT interface is visible, confirm below.”
→ button label: “I Have Signed In”

operator-confirmed-signed-in
→ show “Sign-in confirmed by Operator”
→ no active confirmation button

load-failed
→ show actionable failure and Refresh
```

Navigation or reload must reset confirmation through the existing loading lifecycle.

Do not inspect cookies, credentials, session storage, DOM text, or account identity.

## Required Repair 4 — Dedicated Architect Interview Workspace Model API

Extend `getArchitectInterviewWorkspaceModel()` or replace it with one bounded equivalent driven by the canonical context resolver.

Expose it through:

- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`

The renderer model must include at minimum:

```text
state
railStatus
browser confirmation state or existing browser status reference
handoff state
handoff instruction
prompt document identity and exact paths
interview target paths
interview document identity when present
selected review document role
interview disposition
synchronization state
freshness state
canCopyHandoff
canApplyDisposition
requiredAction
reason/error
current Operator review notes when present
```

Authorized workspace states:

```text
prerequisites-unavailable
ready-for-handoff
waiting-for-output
ready-for-review
revision-requested
rejected
completed
needs-attention
```

Do not add persisted route, queue, consumed, execution-run, or hidden active-document state.

## Required Repair 5 — Evidence-Derived Architect Interview Rail Status

Add an explicit Architect Interview lifecycle status to the top rail.

Required mapping:

| Canonical evidence | Rail label |
|---|---|
| Intake or prompt prerequisites unavailable | `Open` |
| Approved Intake and associated Approved prompt exist; no Interview output | `Waiting for Output` |
| Interview exists and is Pending, RevisionRequested, or Rejected | `Awaiting Approval` |
| Interview exists, synchronized, fresh, and Approved | `Completed` |
| Context conflict, read error, pair mismatch, or stale Interview | `Needs Attention` |

Requirements:

- pass status from `App.tsx` into `NestedWorkflowRail`;
- preserve WC21 selection highlight and required-step ring;
- a card may be selected, required, and display a lifecycle label simultaneously;
- do not restore `CURRENT`;
- do not change Project Intake rail semantics;
- do not change lower Phase or Work Card loop rails.

## Required Repair 6 — Dedicated Action Bar and Dual-Pane Workspace

Replace the Architect Interview use of the generic `CurrentActionPanel` and persistent full-height document-list column with a dedicated Architect Interview control bar.

### Control bar contents

The control bar must contain:

1. current workspace/action context;
2. browser state and honest sign-in confirmation presentation;
3. handoff state and `Copy Architect Handoff` action;
4. compact document selector containing only relevant prompt and Interview documents;
5. clear artifact-role labels:
   - `Prompt — Approved handoff input`
   - `Interview — Operator review output`;
6. selected document path and current disposition;
7. manual `Refresh Output` action;
8. disposition controls only when the exact Interview output exists and is valid;
9. revision-instructions textarea when `RevisionRequested` is selected;
10. clear waiting, conflict, stale, mismatched, and read-error messaging.

### Main content layout

For `activeWorkspaceId === "architect-interview"`, render exactly two main panes:

```text
Document preview | Architect Surface
```

Requirements:

- remove the persistent document-list column from the main Architect Interview workspace;
- move document selection into the control bar;
- preview and Architect Surface must each remain usable at normal desktop widths;
- no horizontal workspace scrollbar at supported widths;
- stack panes vertically at the existing narrow responsive breakpoint;
- other workspaces retain their current document layouts.

The exact percentage split is an implementation choice, but both panes must use `minmax(0, …)` and avoid fixed minimum totals that exceed the available workspace.

## Required Repair 7 — Prompt Versus Interview Review Authority

The selected prompt remains viewable but read-only.

When the prompt is selected:

- show its Approved non-review role;
- show output targets and handoff action;
- do not show Interview disposition controls;
- do not call `setArchitectInterviewDisposition()`.

When the exact Interview output exists and is selected:

- show its current disposition, synchronization, and freshness;
- enable review controls only when the pair is readable and synchronized;
- stale or mismatched output displays `Needs Attention` and cannot be Approved until corrected;
- use the dedicated Architect Interview review action rather than generic current-workspace disposition.

Remove the misleading generic message:

```text
This workspace uses its specialized action authority instead of generic single-document disposition.
```

Replace it with specific prompt/output state messaging.

## Required Repair 8 — Durable Revision Instructions

Implement one Architect Interview review function that writes status and review notes to the same synchronized Interview pair.

A suitable API is:

```ts
reviewArchitectInterview(
  workspaceRoot,
  status,
  operatorReviewNotes,
)
```

Requirements:

- `RevisionRequested` requires nonblank notes;
- `Rejected` may require or allow notes, but the behavior must be explicit and tested;
- `Approved` may accept optional notes;
- write current review notes into both siblings atomically;
- Markdown must contain a clear `## Operator Review Notes` section;
- JSON must contain a structured `operatorReview` object with status and notes;
- write `Document.Status` consistently to both siblings;
- no separate revision artifact;
- do not change the Interview artifact revision solely for a disposition/review-note write unless the existing artifact contract already requires it;
- a substantively revised Interview written afterward remains Pending and increments artifact revision;
- the copied handoff instruction must include current RevisionRequested notes when requesting correction.

After review:

- reload the canonical workspace model;
- reload documents;
- preserve the viewed Architect Interview workspace;
- update rail status and current required workspace;
- Approved current Interview advances the required workspace toward Project Planning without forced navigation.

## Required Repair 9 — Active Output Detection and Refresh

While Architect Interview is the viewed workspace, implement bounded repository-output refresh.

Requirements:

- poll or refresh the canonical Architect Interview workspace model at an interval between 2 and 5 seconds;
- stop the interval when the workspace is no longer viewed or the component unmounts;
- do not create a global background watcher;
- retain a manual `Refresh Output` action;
- when the exact Interview output first appears, refresh documents and select the Interview output automatically unless the Operator has explicitly selected another Interview output document;
- preserve the last readable preview during a transient read failure and display the error separately;
- when a revised artifact revision appears, refresh the preview;
- do not infer completion from browser content or chat text;
- repository evidence remains authoritative.

## Required Repair 10 — Focused Behavioral Tests

Retain all existing WC20/WC21 tests.

### Canonical context tests

Cover:

1. one active Intake and one associated prompt resolves ready context;
2. alternate WC20 canonical Intake directory resolves correctly;
3. archived Intake and archived prompt are ignored;
4. multiple active Intakes return conflict;
5. multiple current associated prompts return conflict;
6. unrelated prompt is not selected;
7. prompt Markdown and JSON come from the same logical document;
8. unsynchronized, unreadable, non-Approved, stale, or wrong-role prompt is rejected;
9. Interview output is recognized only at exact prompt targets;
10. handoff manifest contains exact associated paths and no independent lexicographic mixing.

### Handoff instruction tests

Cover:

- exact Intake, prompt, and output paths;
- Pending output requirement;
- MCP write instruction;
- no concrete local absolute path;
- no automatic submission or DOM automation claim;
- current RevisionRequested notes included when applicable;
- clipboard write action writes only the generated instruction and never reads clipboard contents.

### Browser-state tests

Cover:

- allowed URL load remains auth-state-unknown;
- Operator confirmation is explicit and in-memory;
- reload/navigation resets the confirmation lifecycle;
- dead handoff/output states are removed from browser-state handling;
- security settings remain unchanged.

### Interview review tests

Cover:

1. new Interview draft is Pending;
2. RevisionRequested without notes fails before writes;
3. RevisionRequested with notes writes synchronized status and notes to both siblings;
4. prompt cannot be dispositioned as Interview output;
5. no output means review action unavailable;
6. Approved synchronized fresh Interview produces Completed status;
7. Pending, RevisionRequested, and Rejected produce Awaiting Approval;
8. stale, mismatched, unreadable, or conflicting evidence produces Needs Attention;
9. upstream Intake/prompt revision invalidates completion;
10. substantive revised Interview returns to Pending and increments artifact revision.

### Renderer/presentation tests

Use pure helpers where necessary without adding a renderer-testing dependency.

Cover:

- rail status mapping;
- selected/required/lifecycle states remain independent;
- prompt selection hides disposition controls;
- Interview selection enables controls only when valid;
- revision notes required when RevisionRequested selected;
- Architect Interview workspace uses dual-pane mode;
- other workspaces retain their existing layouts;
- active-workspace refresh interval starts and stops through a testable bounded helper if extracted.

No Playwright or new dependency is authorized.

## Authorized Production Files

Expected production changes are limited to:

```text
src/main/architectInterview/architectInterviewService.ts
src/main/architectInterview/<one bounded canonical-context helper>.ts
src/main/browser/architectBrowserService.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/architectInterview/<one bounded presentation/model helper>.ts   [optional]
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/styles.css
```

`src/shared/workspaces/documentWorkspace.ts` is authorized only if a narrowly necessary role-label/classification correction cannot be implemented from existing metadata in `App.tsx`.

Expected tests may include:

```text
test/architect-interview/architect-interview-workspace.test.cjs
test/browser/architect-browser-handoff.test.cjs
test/renderer/architect-interview-presentation.test.cjs
test/resolver/first-non-approved-resolver.test.cjs   [only for regression if needed]
```

A production change outside this list requires a concrete explanation in the Implementer Report and must be directly necessary to this workspace.

## Explicit Non-Goals

Do not:

- automate remote ChatGPT DOM interaction;
- submit messages automatically;
- inspect ChatGPT credentials, cookies, session storage, DOM text, or account identity;
- add a provider API or SDK;
- add a browser extension;
- persist raw chat transcripts;
- create hidden handoff-submitted, consumed, active-chat, queue, route-token, or execution-run state;
- create placeholder Interview output before substantive interview completion;
- auto-approve the Interview output;
- change Project Intake artifact identity, approval, archive, or rail-status rules;
- change Project Planning or later lifecycle workspaces;
- redesign the global top rail or lower loop rails;
- change generic disposition behavior outside Architect Interview;
- add dependencies;
- perform Git operations.

## Validation

Run the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

When the sandbox produces the documented `spawn EPERM` condition, rerun the affected command in the normal Windows lane and report both results accurately.

Perform a non-acceptance Electron launch smoke confirming only that:

- the application launches;
- the dedicated Architect Interview control bar renders;
- the main workspace is dual-pane;
- the browser surface attaches;
- copying the handoff does not crash;
- polling starts and stops without an immediate error;
- no invalid nested interactive markup or immediate layout failure occurs.

Launch smoke does not establish sign-in, handoff, ChatGPT behavior, MCP write-back, visual acceptance, or live interview acceptance.

## Acceptance Criteria

WC22 is acceptable for Operator validation only when:

1. browser sign-in presentation clearly states that confirmation is Operator-supplied, not detected;
2. `I Have Signed In` appears only in auth-state-unknown and is replaced by noninteractive confirmed state afterward;
3. browser reload/navigation resets confirmation appropriately;
4. WC03 browser security settings remain unchanged;
5. one canonical associated Intake/prompt/output-target context is resolved without lexicographic path mixing;
6. archived, stale, mismatched, wrong-role, unrelated, or ambiguous prompt evidence is not reported handoff-ready;
7. alternate WC20 canonical Intake paths remain supported;
8. the manifest uses exact siblings from the same associated logical documents;
9. a deterministic handoff instruction is displayed and can be copied;
10. the copied instruction contains exact input/output paths and Pending output requirements;
11. no automatic remote submission, DOM automation, or hidden consumed state is introduced;
12. the Architect Interview workspace exposes a dedicated repository-derived model through IPC/preload;
13. the Architect Interview card reads Open, Waiting for Output, Awaiting Approval, Completed, or Needs Attention from evidence;
14. rail lifecycle label remains independent from selection and required-step ring;
15. the Architect Interview main workspace contains only preview and Architect Surface panes;
16. document selection is moved into the dedicated control bar;
17. prompt and Interview output roles are visibly distinct;
18. prompt selection never exposes Interview disposition controls;
19. no Interview output means disposition controls are unavailable;
20. new and substantively revised Interview output remains Pending;
21. RevisionRequested requires durable Operator revision instructions;
22. review status and notes are written atomically to both Interview siblings;
23. no separate revision artifact is created;
24. stale, mismatched, unreadable, or conflicting Interview evidence cannot be Approved through the UI;
25. Approved synchronized fresh Interview changes rail status to Completed and advances current required context toward Project Planning;
26. the viewed Architect Interview workspace is preserved after disposition;
27. repository output written at exact targets is detected while the workspace remains open;
28. revised artifact revisions refresh the preview;
29. the last readable preview survives transient refresh failure;
30. other workspaces retain their existing layout and disposition behavior;
31. typecheck, build, and all tests pass;
32. the Implementer Report distinguishes automated evidence, launch smoke, and remaining Operator live validation;
33. no unrelated subsystem, dependency, hidden authority, or Git mutation is introduced.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC22_architect_interview_workspace_handoff_review_and_status_completion.md`

The report must include:

- repository, remote, branch, and starting dirty-tree inventory;
- exact files created, modified, and deleted;
- canonical context resolver algorithm;
- active Intake selection and alternate-path behavior;
- prompt association and conflict behavior;
- exact handoff manifest and instruction contract;
- clipboard-write implementation and safety boundary;
- final browser-state model and removed dead states;
- sign-in presentation behavior;
- final dedicated workspace model contract;
- rail-status derivation;
- final action-bar structure;
- final dual-pane CSS structure;
- prompt versus Interview role behavior;
- exact condition enabling disposition controls;
- revision-instruction persistence format in Markdown and JSON;
- output refresh interval and cleanup behavior;
- last-readable-preview behavior;
- tests added or changed;
- typecheck, build, and full test results;
- Electron launch-smoke result and limitations;
- remaining Operator validation;
- final repository status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Manual Validation After Architect Review

The Operator will perform controlling validation after Architect review.

Required checks:

1. Open Architect Interview while visibly signed out.
2. Confirm the UI instructs the Operator to sign in and does not claim detected authentication.
3. Confirm the action reads `I Have Signed In`, not `Confirm Signed In`.
4. Sign in through the normal embedded ChatGPT interface and confirm the Operator assertion.
5. Reload or navigate and confirm the assertion resets appropriately.
6. Confirm the control bar shows the exact associated prompt and output targets.
7. Confirm the main workspace contains only preview and Architect Surface panes.
8. Confirm neither pane has an unnecessary horizontal workspace scrollbar at normal width.
9. Select the Prompt and confirm it is labeled Approved handoff input and has no disposition controls.
10. Use `Copy Architect Handoff` and paste it into the embedded ChatGPT conversation.
11. Confirm the copied instruction names exact prompt, Intake, and Interview output paths.
12. Conduct a real Architect Interview.
13. Confirm ChatGPT uses ChampCity MCP and writes a synchronized Pending Interview pair at the exact targets.
14. Confirm the app detects the output without global manual Refresh and selects the Interview.
15. Confirm the rail changes from `Waiting for Output` to `Awaiting Approval`.
16. Review the Interview and select `RevisionRequested` without notes; confirm application blocks the action.
17. Enter revision instructions and apply RevisionRequested.
18. Confirm both Interview siblings contain the notes and RevisionRequested disposition.
19. Copy the revised handoff and confirm the current revision notes are included.
20. Have the Architect revise the same Interview pair.
21. Confirm the revised Interview returns to Pending with a higher artifact revision.
22. Approve the final Interview.
23. Confirm both siblings become Approved.
24. Confirm the rail changes to `Completed`.
25. Confirm current required context advances to Project Planning without forcing workspace navigation.
26. Revise Project Intake in a disposable fixture and confirm the older Interview becomes stale or incomplete.
27. Test a mismatched or unreadable Interview fixture and confirm `Needs Attention` with disabled approval.
28. Test a duplicate/unrelated prompt fixture and confirm the workspace reports conflict rather than selecting lexicographically.
29. Repeat at maximized, intermediate, and minimum supported window sizes.
30. Confirm no credential, cookie, token, DOM automation, automatic submission, or raw transcript behavior is exposed.
