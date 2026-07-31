<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC26"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Architect_Reports/RCA_WC26_PROJECT_PLANNING_MIGRATION_RAIL_AND_ARCHITECT_WORKSPACE_GAPS.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC05_project_planning_workspace.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Planning Architect Workspace and Project Rail Status Completion",
    "status": "implementation_revision_requested",
    "executionMode": "one continuous active implementation card",
    "recommendedReasoning": "high",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC26_project_planning_architect_workspace_and_project_rail_status_completion.md"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "Architect review requested bounded continuation corrections. Live purpose-built MCP planning-output creation is deferred to WC27/WC-V1-0202C; WC26 must prove workspace behavior with controlled external canonical outputs.",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# WC26 — Project Planning Architect Workspace and Project Rail Status Completion

Status: active implementation — Architect revision requested  
Phase: phase-08  
Execution: one continuous active implementation card  
Git mutation: prohibited  
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC26_project_planning_architect_workspace_and_project_rail_status_completion.md`

Upon Operator approval, this Work Card is the complete Implementer instruction. Do not create a separate repair card for ordinary implementation corrections. Keep WC26 active until all required product evidence is Proven.

## Purpose

Complete the Project Planning workspace as the confirmed embedded ChatGPT Architect workflow, remove the unrelated legacy migration surface from normal lifecycle workspaces, and provide evidence-derived lifecycle status for all seven top project rail cards.

This is not a repair of an accepted Project Planning product. Phase 08 WC05 was a deferred design and the generic integrated implementation was never accepted as a functioning Project Planning workspace.

## Controlling Evidence

Read and follow:

- `planning/phases/phase-08/Architect_Reports/RCA_WC26_PROJECT_PLANNING_MIGRATION_RAIL_AND_ARCHITECT_WORKSPACE_GAPS.md`
- `planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `planning/project/Design_Documents/ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`
- accepted Architect Interview workspace behavior from WC22 through the active WC25 repair chain

## Confirmed Current Defects

1. `Workspace Migration Required` appears in Project Planning and every other non-Architect workspace even though it is a broad legacy repository conversion utility.
2. `refreshDocuments()` automatically runs the migration preview during normal workflow refresh.
3. `Migrate Workspace` can rewrite multiple planning Markdown files and delete legacy JSON siblings; this is not a Project Planning action.
4. Project Planning and later top project rail cards default to `OPEN` because only Project Intake and Architect Interview receive evidence-derived status.
5. Every top rail card also renders a static lower `Open` line, creating duplicate state text.
6. Project Planning has no embedded ChatGPT Architect pane.
7. `Run Current Handoff Action` writes a local handoff artifact but provides no bounded copy/paste instruction for the embedded Architect.
8. Project Planning displays an empty generic document list before outputs exist.
9. The generic Architect Output textareas require manual pasting of Project Profile and Roadmap content instead of MCP repository write-back.
10. Generic disposition controls appear before both planning outputs exist and are valid.
11. No active refresh detects the two Project Planning outputs while the workspace is open.
12. Existing Project Planning input resolution uses broad prefix and final-entry selection rather than one associated canonical context.

## Required Outcome

```text
Approved Project Intake
+ Approved Project Architect Interview Prompt
+ Approved current Project Architect Interview
→ Project Planning rail status: Ready
→ dedicated Project Planning action bar
→ embedded ChatGPT Architect pane
→ prepare exact Approved Project Planning handoff
→ copy Project Planning MCP instruction
→ Operator pastes and sends instruction in embedded ChatGPT
→ ChatGPT Architect writes Pending canonical Project Profile and Project Roadmap
→ active workspace detects both outputs
→ Project Planning rail status: Awaiting Approval
→ Operator reviews Profile and Roadmap independently
→ one shared bundle disposition writes both documents atomically
→ both current documents Approved
→ Project Planning rail status: Completed
→ Phase Map rail status: Ready
```

Repository canonical Markdown is workflow authority. Browser chat is a drafting and interaction surface only.

## Required Change 1 — Remove Legacy Migration From Normal Lifecycle Work

Files likely involved:

- `src/renderer/app/App.tsx`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- focused migration UI/API tests

Requirements:

- remove the `Workspace Migration Required` panel from Project Planning and all normal lifecycle workspaces;
- stop calling migration preview from routine document refresh;
- remove `Preview Migration` and `Migrate Workspace` from the normal product interaction surface;
- opening, navigating, or refreshing a workspace must not scan for migration candidates as part of the lifecycle path;
- no WC26 action may rewrite legacy Markdown or delete JSON siblings;
- do not run a migration against Revisionary during implementation or validation;
- the existing migration module may remain dormant if deleting it would broaden the card, but it must not remain reachable through normal renderer controls;
- do not replace the panel with another unexplained warning or maintenance action.

WC26 does not design a future legacy-maintenance workspace.

## Required Change 2 — One Status Projection for the Seven Top Project Rail Cards

Files likely involved:

- `src/shared/workspaces/projectRailPresentation.ts`
- one bounded shared project-lifecycle rail projection helper
- `src/renderer/app/NestedWorkflowRail.tsx`
- `src/renderer/app/App.tsx`
- shared contracts and focused tests

The seven top project rail cards are:

1. Project Intake;
2. Architect Interview;
3. Project Planning;
4. Phase Map;
5. Phases;
6. Project Validation;
7. Project Close.

### General rules

- every card displays one evidence-derived lifecycle status;
- remove the static lower `Open` line from all seven cards;
- preserve the accepted Project Intake status derivation;
- preserve the accepted Architect Interview status derivation;
- selection highlight remains derived from the viewed workspace;
- required-step ring remains derived from the current required workspace;
- lifecycle status, selection, and required-step styling remain independent;
- do not restore a generic `CURRENT` status;
- do not infer completion from navigation history or hidden state;
- stale, conflicting, unreadable, or mixed bundle evidence must surface as `Needs Attention` or the existing Project Intake `Conflict` state rather than `Completed`;
- use title casing consistently in visible UI; do not display a fallback uppercase `OPEN`.

### Common status vocabulary

Use only statuses that accurately describe available evidence:

```text
Not Ready
Open
Ready
Waiting for Output
Awaiting Approval
In Progress
Completed
Needs Attention
Conflict
```

A workspace may use a subset.

### Project Intake

Preserve current mapping:

```text
no canonical Intake                   → Open
Pending/Rejected/RevisionRequested    → Awaiting Approval
Approved current Intake               → Completed
multiple active canonical Intakes     → Conflict
```

### Architect Interview

Preserve current mapping:

```text
prerequisites unavailable             → Open
Approved prompt, no Interview          → Waiting for Output
Interview review required              → Awaiting Approval
Approved current Interview             → Completed
conflict/stale/read failure/mismatch   → Needs Attention
```

### Project Planning

Required mapping:

```text
Approved current Interview unavailable                         → Not Ready
Approved inputs available; no current planning handoff         → Ready
Approved current handoff; neither output exists                → Waiting for Output
one output missing, Pending, Rejected, or RevisionRequested     → Awaiting Approval
both outputs current, readable, fresh, synchronized, Approved   → Completed
stale, unreadable, conflicting, mixed-disposition, or mismatch → Needs Attention
```

The Revisionary screenshot state must display `Ready`, not `OPEN`.

### Phase Map

Required mapping:

```text
Project Planning not complete            → Not Ready
Project Planning complete; no handoff     → Ready
Approved handoff; no Phase Map output     → Waiting for Output
Phase Map requires review                 → Awaiting Approval
Approved current Phase Map                → Completed
stale/conflicting/unreadable/mismatched   → Needs Attention
```

### Phases aggregate

Required mapping:

```text
Approved current Phase Map unavailable                  → Not Ready
Phase Map approved; no mapped phase started             → Ready
one or more required phases active or incomplete        → In Progress
all required mapped phases have Approved Close outcomes → Completed
conflict, stale map, or invalid phase evidence           → Needs Attention
```

### Project Validation

Required mapping:

```text
entry requirements not satisfied                    → Not Ready
all mapped phases complete; no Project Closeout      → Ready
Project Closeout requires review                     → Awaiting Approval
Approved Project Closeout with complete review state → Completed
stale/unreadable/conflicting closeout or population  → Needs Attention
```

### Project Close

Required mapping:

```text
Approved closeout decision unavailable                  → Not Ready
Approved closeout with closureDecision=Close             → Completed
Approved closeout with closureDecision=DoNotClose        → Needs Attention
pending/rejected/revision-requested or invalid closeout   → Not Ready or Needs Attention according to evidence
```

Project Close is a derived terminal view and must not introduce a second approval.

## Required Change 3 — Canonical Project Planning Context

Files likely involved:

- `src/main/projectPlanning/projectPlanningService.ts`
- one bounded `src/main/projectPlanning/` context/model helper
- focused project-planning tests

Resolve one associated Project Planning context from canonical evidence.

The context must include:

- the one active canonical Approved Project Intake;
- the associated Approved non-review Architect Interview Prompt;
- the exact current Approved Project Architect Interview at the prompt target;
- source revisions for all three inputs;
- exact Project Planning handoff path;
- exact Project Profile target;
- exact Project Roadmap target;
- current Profile and Roadmap documents when present;
- synchronization, freshness, disposition, and read state for both outputs;
- repository-relative evidence paths;
- conflict and local-error diagnostics.

Requirements:

- do not select inputs independently by prefix plus `.at(-1)`;
- do not combine unrelated logical documents;
- ignore archived and historical records;
- reject stale, unreadable, wrong-role, wrong-type, or ambiguous evidence;
- output targets must be constrained repository-relative Markdown paths;
- existing valid Revisionary Intake and Interview paths must resolve;
- no JSON sibling is required or created under the current canonical Markdown-only protocol.

## Required Change 4 — Dedicated Project Planning Handoff and MCP Instruction

Files likely involved:

- `src/main/projectPlanning/projectPlanningService.ts`
- a bounded Project Planning handoff service or a safe generalization of the accepted Architect handoff service
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`

Provide dedicated actions with product-specific labels:

```text
Prepare Project Planning Handoff
Copy Project Planning Handoff
Refresh Planning Outputs
```

Do not display the generic `Run Current Handoff Action` button in Project Planning.

The generated handoff must remain an Approved `nonReviewHandoff` canonical Markdown document and reference the exact current source revisions.

The copied instruction must contain:

- repository reference `<PROJECT_REPO>`;
- exact Project Intake path;
- exact Architect Interview Prompt path;
- exact Approved Architect Interview path;
- exact Project Planning handoff path;
- exact Project Profile target path;
- exact Project Roadmap target path;
- instruction to use ChampCity MCP for repository reads and writes;
- instruction to create or revise both canonical Markdown outputs as substantive documents;
- required artifact types `project-profile` and `project-roadmap`;
- required `participationRole=compoundGatingReview`;
- required `Document.Status=Pending` for new or substantively revised outputs;
- current source revisions;
- current Operator revision instructions when the bundle is RevisionRequested;
- instruction not to write placeholders or claim completion before both documents are substantive and coherent;
- instruction that browser chat is not durable authority.

The Operator manually pastes and sends the copied instruction. Do not automate remote ChatGPT DOM interaction or submission.

## Required Change 5 — Embedded ChatGPT in Project Planning

Files likely involved:

- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`
- existing browser attachment coordination and tests

Requirements:

- attach the accepted embedded ChatGPT browser when either Architect Interview or Project Planning is the viewed Architect-enabled workspace;
- only one browser surface may be attached and visible at a time;
- preserve the accepted browser partition, navigation allowlist, popup handling, context menu, reload behavior, and security settings;
- detach or hide the browser when leaving both Architect-enabled workspaces;
- do not duplicate browser instances or create a second authentication session;
- Project Planning must use a dedicated action bar and a practical dual-pane layout:

```text
selected Project Profile or Roadmap preview | Embedded ChatGPT
```

- at narrow widths, stack the panes using the accepted responsive boundary;
- no horizontal workspace overflow at supported desktop widths;
- remove the persistent empty generic document-list column from Project Planning;
- remove the generic Project Planning Architect Output textareas.

## Required Change 6 — Dedicated Project Planning Workspace Model

Expose a repository-derived model through main IPC, preload, and shared contracts.

The model must include at minimum:

```text
state
railStatus
requiredAction
reason/error
handoff identity and path
handoff readiness
copyable handoff instruction
Profile target and current document
Roadmap target and current document
selected planning document role
Profile read/freshness/disposition state
Roadmap read/freshness/disposition state
bundle synchronization state
current shared Operator review notes
canPrepareHandoff
canCopyHandoff
canApplyBundleDisposition
```

Authorized model states:

```text
not-ready
ready-for-handoff
waiting-for-output
partial-output
ready-for-review
revision-requested
rejected
completed
needs-attention
```

Do not persist hidden active-document, handoff-submitted, consumed, route-token, queue, execution-run, or completion state.

## Required Change 7 — Output Detection and Independent Review

While Project Planning is viewed:

- refresh the dedicated Project Planning model at a bounded interval between 2 and 5 seconds;
- stop the interval when leaving the workspace or unmounting;
- detect Profile and Roadmap only at the exact handoff targets;
- refresh on first appearance and higher artifact revision;
- preserve the last readable preview during transient read failure and show the error separately;
- provide compact Profile and Roadmap selection controls in the action bar;
- clearly label each selected document and its current status;
- allow each document to be reviewed independently without leaving Project Planning;
- use session-only viewed markers to confirm the Operator opened both current artifact revisions before enabling `Approved`;
- reset viewed markers when either artifact revision, source revisions, repository, or selected workspace changes;
- viewed markers are usability gates only and never workflow authority.

The application must not infer output from browser content or chat text.

## Required Change 8 — One Shared Bundle Disposition

The Project Profile and Project Roadmap are separate review documents but one approval bundle.

Requirements:

- no disposition control is available until both exact outputs exist, are readable, current, fresh, and synchronized;
- `Approved` remains disabled until both current revisions have been opened in the workspace;
- one action supports `Approved`, `Rejected`, and `RevisionRequested`;
- `RevisionRequested` requires nonblank Operator instructions;
- review notes identify whether concerns apply to Profile, Roadmap, or both;
- the same disposition and notes are written to both documents through one atomic operation;
- mixed final disposition is prohibited;
- no separate bundle-approval artifact is created;
- a substantive revision to either document increments its artifact revision and returns both outputs to coherent Pending review state;
- after disposition, remain in Project Planning and refresh both previews and rail status;
- only both current Approved outputs complete Project Planning and make Phase Map `Ready`.

Remove the generic message that the workspace uses specialized action authority. Replace it with concrete bundle state and review guidance.

## Required Change 9 — Current Workflow and Generic Shell Cleanup

- Project Planning must not use the generic `CurrentActionPanel`.
- Project Planning must not display `Apply Current Disposition` before valid outputs exist.
- Project Planning must not display `Run Current Handoff Action`.
- Project Planning must not display generic manual output-import textareas.
- Existing generic actions for later workspaces must not be silently treated as accepted by this card.
- Preserve Project Intake and Architect Interview behavior.
- Do not alter Phase Map, phase, Work Card, validation, or close workspace product layouts except for the shared top project rail status projection.

## Required Behavioral Coverage

Add focused coverage proving:

1. routine refresh does not invoke migration preview;
2. no lifecycle workspace renders migration controls;
3. no WC26 validation action rewrites legacy Markdown or deletes JSON;
4. all seven top project rail cards receive one lifecycle status;
5. the static lower `Open` line is absent;
6. Project Intake and Architect Interview accepted mappings remain unchanged;
7. Revisionary Project Planning resolves `Ready` from the Approved Interview;
8. Phase Map, Phases, Project Validation, and Project Close status mappings follow canonical evidence;
9. canonical Project Planning context does not mix unrelated or archived inputs;
10. handoff contains exact input, handoff, and output paths;
11. copied instruction requires MCP, canonical Pending outputs, and no automatic submission;
12. browser attachment works in both Architect Interview and Project Planning without two visible instances;
13. Project Planning uses dual-pane mode and no generic document list or output textareas;
14. exact Profile and Roadmap outputs are detected while the workspace is active;
15. approval is unavailable when either output is missing, invalid, stale, mismatched, or not reviewed;
16. RevisionRequested without notes is blocked;
17. shared disposition and notes write coherently to both documents;
18. a substantive revision returns the bundle to Pending with updated revisions;
19. both Approved current outputs complete Project Planning and make Phase Map Ready;
20. Project Intake and Architect Interview regressions remain passing.

No new renderer testing dependency or Playwright is authorized.

## Authorized Production Surface

Expected production changes are limited to:

```text
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/<one bounded context or workspace-model helper>.ts
src/main/integrations/<bounded Project Planning handoff helper>.ts          [if needed]
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/projectRailPresentation.ts
src/shared/workspaces/<one project lifecycle rail helper>.ts               [if needed]
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/styles.css
```

The existing browser service or attachment coordinator may be changed only when narrowly required to support one accepted browser instance across the two Architect-enabled workspaces. Its security contract must remain unchanged.

The legacy migration service may be left unchanged and unreachable. Deleting or redesigning migration behavior is not required.

Focused tests under existing test directories are authorized.

A production change outside this list requires a concrete necessity explanation in the Implementer Report.

## Explicit Non-Goals

Do not:

- migrate Revisionary or any selected workspace;
- rewrite historical documents;
- delete JSON siblings;
- create a legacy-maintenance workspace;
- change canonical serialization unrelated to Project Planning outputs;
- add provider API or SDK integration;
- automate ChatGPT DOM interaction or message submission;
- inspect credentials, cookies, tokens, DOM text, session storage, or account identity;
- persist raw chat transcripts;
- create hidden workflow state;
- redesign lower Phase or Work Card loop rails;
- implement Phase Map or later workspace product completion;
- add dependencies;
- perform Git operations.

## Required Running-Product Evidence

Record each item as `Proven` or `NotProven`.

1. The migration panel is absent from Project Planning and every normal lifecycle workspace.
2. Opening and refreshing Revisionary changes no repository document through migration behavior.
3. Project Intake and Architect Interview rail cards retain their accepted `Completed` state.
4. Project Planning shows `Ready` as its lifecycle status and does not display a second static `Open` line.
5. Phase Map, Phases, Project Validation, and Project Close display accurate nonfallback status.
6. Project Planning shows a dedicated action bar and embedded ChatGPT pane.
7. No empty generic document-list column or generic Architect Output textareas remain in Project Planning.
8. Preparing and copying the handoff produces an instruction with the exact Intake, prompt, Interview, handoff, Profile, and Roadmap paths.
9. The Operator can paste and send the instruction in embedded ChatGPT; WC26 does not claim the later purpose-built planning-output MCP action.
10. A controlled external write of a valid canonical Pending Project Profile and Project Roadmap pair at the exact targets is detected without manual import.
11. The open Project Planning workspace detects both outputs without global navigation. Live embedded ChatGPT invocation of `artifact_toolbox.save_project_planning_outputs` is deferred to WC27/WC-V1-0202C.
12. The Operator can switch between and read the complete current Profile and Roadmap.
13. Approval remains disabled until both current revisions have been opened.
14. RevisionRequested without instructions is blocked.
15. RevisionRequested with instructions writes the same status and notes to both documents.
16. A revised Profile or Roadmap returns the coherent bundle to Pending and refreshes the current preview.
17. Approving the bundle writes both documents Approved with no mixed state.
18. Project Planning changes to `Completed` and Phase Map changes to `Ready`.
19. The workspace remains usable at maximized, intermediate, and minimum supported widths.
20. Architect Interview remains usable and its browser attachment behavior is not regressed.

Any `NotProven` item means implementation remains active in WC26. Do not create WC26-REPAIR01 or another repair to move unresolved implementation defects out of the active card. WC27 remains the separately planned reconciliation and purpose-built planning-output integration pass.

## Validation

Running-product evidence is controlling. Source inspection and automated tests support but do not replace it.

After the product path passes, run once:

```text
npm run typecheck
npm run build
npm test
```

No Git operation.

## Implementer Report

Write the Implementer Report only after all twenty product evidence items are Proven.

The report must include:

- starting repository, branch, remote, and dirty-tree inventory;
- exact files changed;
- migration UI/API removal and confirmation that no migration ran;
- final seven-card rail status model and mappings;
- canonical Project Planning context algorithm;
- exact handoff artifact and copied instruction contract;
- browser reuse and security preservation;
- dedicated action bar and dual-pane layout;
- output detection interval and cleanup;
- independent review and session-only viewed-marker behavior;
- synchronized bundle disposition and revision-note persistence;
- current-workflow and generic-shell cleanup;
- all twenty evidence results;
- typecheck, build, and test results;
- final repository status;
- confirmation that no Git operation occurred.
