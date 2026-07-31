<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC26"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC26_project_planning_architect_workspace_and_project_rail_status_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC26 Project Planning Architect Workspace and Project Rail Status Completion",
    "reviewResult": "RevisionRequested",
    "implementerReportPresent": false,
    "continuationRequired": true
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "The implementation substantially establishes the intended Project Planning workspace, but handoff preparation can invalidate outputs, later project-rail conflicts are silently selected, and Project Planning polling failures are hidden. WC26 remains active. The purpose-built planning-output MCP action remains WC27/WC-V1-0202C scope.",
    "reviewedAt": "2026-07-29"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC26 Project Planning Architect Workspace and Project Rail Status Completion

Review result: `RevisionRequested`  
Work Card remains active: yes  
New repair authorized: no  
Git mutation: none

## Review Basis

Reviewed:

- WC26 revision 1;
- the complete current ChampCity_AI diff;
- new Project Planning context, service, IPC, preload, renderer, rail, and test code;
- current ChampCity MCP tool inventory;
- independent normal-Windows validation.

No Implementer Report exists. That is correct while required running-product evidence remains incomplete.

## Substantially Correct Work

The implementation correctly establishes the major WC26 product structure:

- the broad migration panel is removed from normal lifecycle workspaces;
- routine document refresh no longer invokes migration preview;
- Project Planning uses a dedicated action bar rather than the generic current-action shell;
- the empty generic document-list column and manual Profile/Roadmap textareas are removed;
- the accepted embedded ChatGPT browser instance is reused in Project Planning;
- Project Profile and Project Roadmap receive compact selectors and complete-document preview;
- repository polling is scoped to the viewed Project Planning workspace;
- shared bundle disposition writes both canonical documents through one transaction;
- RevisionRequested requires nonblank instructions;
- approval is gated by session-only viewing of both current revisions;
- the static lower `Open` text was removed from all top project rail cards;
- Project Intake and Architect Interview behavior remains present.

The new canonical Project Planning context is materially better than the prior prefix-plus-`.at(-1)` service logic. It associates Intake, Prompt, Interview, handoff, Profile, and Roadmap through exact source revisions and exact targets.

## Independent Validation

Normal Windows lane:

```text
npm run typecheck  → passed
npm run build      → passed; 1,610 modules
npm test           → passed; 112/112
```

Tests support the review but do not override the product defects below.

## Required Correction 1 — Handoff Preparation Is Destructive and Non-Idempotent

`generateProjectPlanningHandoff()` always writes:

```text
existing handoff revision + 1
```

It increments the handoff revision even when current source revisions, targets, and handoff body are unchanged.

`getProjectPlanningWorkspaceModel()` also reports:

```text
canPrepareHandoff=true
```

for every otherwise ready context, including:

- waiting for output;
- partial output;
- ready for review;
- RevisionRequested;
- Rejected;
- Completed;
- output or handoff Needs Attention.

The renderer enables `Prepare Project Planning Handoff` from that value.

Consequences:

1. Repeated preparation creates unnecessary handoff revisions.
2. Existing Profile and Roadmap source revisions no longer match the new handoff revision.
3. A completed planning bundle can be made stale or invalid by clicking Prepare again.
4. The action can worsen a Needs Attention state instead of preserving evidence.

Required behavior:

- preparing the same current handoff is idempotent;
- unchanged current handoff returns the existing revision without rewriting;
- `canPrepareHandoff` is true only when no valid current handoff exists and prerequisites are ready;
- once a current handoff exists, the normal action is Copy, not Prepare;
- completed or reviewable outputs cannot be invalidated by an ordinary Prepare click;
- a future upstream revision may authorize a new handoff because its source revisions changed, but that transition must be explicit and tested.

Add tests proving repeated Prepare does not change revision or invalidate existing outputs.

## Required Correction 2 — Later Project Rail Conflicts Are Silently Selected

`projectLifecycleRailStatus.ts` still uses broad final-entry selection for later project stages:

```text
latestHandoff(...).at(-1)
latestActiveByArtifactType(...).at(-1)
find(...)
```

This affects Phase Map, the Phases aggregate, Project Validation, and Project Close.

The helper does not consistently detect:

- multiple active Phase Map handoffs;
- multiple active Phase Maps;
- multiple active Project Closeouts;
- ambiguous or mixed closeout populations;
- wrong-role or wrong-type candidates occupying expected evidence families.

WC26 requires conflicting, stale, unreadable, or mixed evidence to display `Needs Attention`. Silently choosing the last matching document is not evidence-derived status.

Required behavior:

- resolve zero, exactly one, or conflict for each governing evidence family;
- ignore historical and archive evidence;
- validate role, type, disposition, readability, freshness, and required association;
- return `Needs Attention` for more than one active governing candidate;
- do not implement the later workspace products themselves.

Add focused tests for duplicate active Phase Map handoffs, duplicate Phase Maps, duplicate Project Closeouts, stale evidence, and wrong-role evidence.

## Required Correction 3 — Project Planning Polling Failures Are Hidden

The Architect Interview polling path has explicit polling-error state. Project Planning does not.

`refreshProjectPlanningWorkspace()` catches errors, but when the periodic call uses `quiet: true`, it does not surface the failure anywhere. `ProjectPlanningActionBar` is always passed:

```text
pollingError=""
```

The implementation therefore fails the WC26 requirement to preserve the last readable preview while displaying a transient refresh error separately.

The Project Planning polling path also lacks the Architect Interview path's in-flight and request-order protection, allowing overlapping refreshes to apply stale results.

Required behavior:

- add a dedicated Project Planning polling error state;
- clear it on successful refresh;
- display it in the Project Planning action bar without discarding the last readable preview;
- prevent overlapping or out-of-order polling results from replacing newer state;
- retain manual Refresh Planning Outputs;
- test transient failure, recovery, and stale-request suppression.

## WC26/WC27 MCP Boundary

The currently loaded ChampCity MCP exposes:

```text
artifact_toolbox.save_architect_interview_output
```

It does not yet expose:

```text
artifact_toolbox.save_project_planning_outputs
```

The current copied Project Planning instruction says to use ChampCity MCP generally and asks the model to construct canonical Profile and Roadmap metadata itself. It does not name an executable save action.

The Operator explicitly assigned reconciliation and the purpose-built planning-output action to WC27 and ChampCity_GPT WC-V1-0202C. WC26 must not implement that later scope or introduce a generic-writer fallback.

Accordingly, WC26 running-product acceptance is narrowed to:

- prepare and copy the correct handoff;
- paste/send the handoff in embedded ChatGPT;
- prove exact-output detection, independent review, revision handling, and synchronized bundle disposition using a controlled externally created canonical Profile/Roadmap pair.

The actual embedded ChatGPT call to `artifact_toolbox.save_project_planning_outputs` is WC27/WC-V1-0202C acceptance evidence.

Do not claim live MCP planning-output creation under WC26.

## Disposition

WC26 is not ready for Operator validation yet.

The Implementer must continue the same WC26 card and correct the three bounded defects above. Do not create WC26-REPAIR01 or another Work Card.

After correction:

1. rerun typecheck, build, and tests once;
2. perform the revised WC26 Electron validation boundary;
3. create the Implementer Report only when every revised WC26 evidence item is Proven;
4. return for Architect review before Operator acceptance.
