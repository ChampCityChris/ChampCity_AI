<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC26-REPAIR01",
    "repairId": "WC26-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC26_project_planning_architect_workspace_and_project_rail_status_completion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC26_project_planning_architect_workspace_and_project_rail_status_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Idempotent Handoff, Conflict-Safe Rail, and Visible Polling Failure",
    "status": "approved_for_implementation",
    "parentWorkCardId": "WC26",
    "executionMode": "one continuous repair implementation",
    "recommendedReasoning": "high",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC26-REPAIR01_idempotent_handoff_conflict_safe_rail_and_visible_polling_failure.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator authorized this bounded repair card. Keep corrections inside WC26-REPAIR01 until every required product behavior is proven.",
    "reviewedAt": "2026-07-29"
  }
}
CHAMPCITY-METADATA -->

# WC26-REPAIR01 — Idempotent Handoff, Conflict-Safe Rail, and Visible Polling Failure

Status: Approved for Implementer execution  
Parent: WC26  
Repository: `C:\Users\chapm\Projects\ChampCity_AI`  
Expected remote: `ChampCityChris/ChampCity_AI`  
Expected branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Git mutation: prohibited  
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC26-REPAIR01_idempotent_handoff_conflict_safe_rail_and_visible_polling_failure.md`

This repair supersedes the loose continuation handoff as the controlling Implementer instruction for the three confirmed WC26 defects. Preserve the existing dirty tree and all accepted WC26, WC25, REPAIR09, and unrelated changes.

Do not create another repair for ordinary corrections. Keep this card active until every evidence item below is Proven.

## Objective

Correct three defects discovered during Architect review:

1. repeated Project Planning handoff preparation changes authority without a substantive source change;
2. later project rail statuses silently choose one active artifact when evidence is duplicated or ambiguous;
3. Project Planning polling failures are hidden and stale asynchronous responses can replace newer state.

No other Project Planning architecture is reopened.

## Defect 1 — Handoff Preparation Is Not Idempotent

### Current failure

`generateProjectPlanningHandoff()` increments `artifactRevision` every time the Operator clicks **Prepare Project Planning Handoff**, even when current Intake, Prompt, Interview, targets, and handoff body are unchanged.

Profile and Roadmap outputs reference the handoff revision. An unnecessary handoff increment can therefore make valid outputs stale and can regress a completed bundle merely because the Operator clicked Prepare again.

The renderer also enables Prepare whenever `canPrepareHandoff=true`, including states where a valid current handoff already exists.

### Required correction

Handoff preparation must be evidence-idempotent.

When a valid current handoff already has:

- the exact current Intake, Prompt, and Interview source revisions;
- the exact current Profile and Roadmap targets;
- the expected handoff identity, role, disposition, workflow data, and body;

then Prepare must:

- leave repository bytes unchanged;
- leave handoff artifact revision unchanged;
- return the current workspace model;
- report that the handoff is already prepared.

Create or increment the handoff revision only when the application-owned handoff content or current source authority has substantively changed.

A source change may create exactly one new handoff revision after the stale prior handoff is no longer current. Repeated preparation against that same new evidence must again be idempotent.

### UI state

`canPrepareHandoff` must be true only when preparation is a valid required action, normally `ready-for-handoff` or an explicitly recoverable missing-handoff state.

It must be false when:

- a valid current handoff already exists;
- outputs are waiting, partial, reviewable, revision requested, rejected, completed, or invalid;
- context is stale, conflicting, unreadable, or otherwise `Needs Attention`.

The existing valid handoff may still be copied whenever `canCopyHandoff` is true.

Do not use a hidden prepared flag. Repository evidence remains authority.

## Defect 2 — Later Rail Projection Silently Selects Ambiguous Evidence

### Current failure

The shared project rail projection uses broad `find()` and `.at(-1)` selection for Phase Map handoffs, Phase Maps, phase closeouts, and Project Closeouts.

Multiple active candidates can therefore produce a plausible lifecycle status instead of `Needs Attention`.

### Required correction

All seven top project rail cards must continue to display one evidence-derived status, but later-stage projection must reject ambiguity.

For each authority family used by the rail, resolve zero, exactly one, or conflict. Do not silently choose the first, last, newest path, lexicographically last file, or highest array position.

At minimum cover:

- current Project Planning handoff;
- current Project Profile and Roadmap targets;
- current Phase Map handoff;
- current Phase Map;
- required phase closeouts by phase identity;
- current Project Closeout.

### Conflict behavior

Return `Needs Attention` when active evidence contains:

- more than one current handoff for the same handoff kind and authority context;
- more than one current Phase Map;
- duplicate active closeouts for the same phase identity;
- more than one current Project Closeout;
- mixed identities, wrong roles, unreadable candidates, or stale candidates that make current authority ambiguous.

Archived and historical artifacts remain excluded.

Distinct closeouts for distinct mapped phases are valid and must not be treated as duplicates.

Do not solve conflicts by path sorting, timestamp selection, Git history, or hidden current-document state.

### Preserve accepted statuses

Do not change accepted Project Intake or Architect Interview status behavior.

Preserve the approved vocabulary:

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

The lower duplicate `Open` line must remain absent.

## Defect 3 — Project Planning Polling Failure Is Hidden

### Current failure

The active Project Planning interval calls refresh with `quiet: true`. Errors from those calls are swallowed. `ProjectPlanningActionBar` receives an empty polling-error string, so the Operator cannot see that automatic output detection stopped working.

The Project Planning refresh path also lacks the request sequencing and in-flight protection used by the Architect Interview refresh path. An older response can overwrite newer model or document state.

### Required correction

Add bounded Project Planning polling state equivalent in rigor to the accepted Architect Interview pattern.

Requirements:

- maintain a Project Planning polling error state;
- pass that error into `ProjectPlanningActionBar`;
- show the error visibly without discarding the last readable model or preview;
- clear the error after a later successful refresh;
- prevent overlapping interval refreshes from running concurrently;
- bind each request to a monotonically increasing request ID or equivalent generation;
- ignore stale completion from an older request;
- stop and invalidate polling when the workspace changes, repository changes, or component unmounts;
- retain manual **Refresh Planning Outputs**;
- a manual refresh must surface failure immediately;
- background polling must not clear unrelated Operator feedback.

Do not introduce a global watcher, filesystem daemon, hidden queue, or persistent polling state.

## WC26/WC27 Boundary

WC26-REPAIR01 must not implement the future action:

```text
artifact_toolbox.save_project_planning_outputs
```

That action remains ChampCity_GPT WC-V1-0202C and ChampCity_AI WC27 scope.

For WC26 validation, use a controlled external creation of a valid canonical Pending Profile/Roadmap pair at the exact handoff targets to prove detection and review behavior.

Do not:

- use generic repository writers as the embedded Architect completion path;
- restore Project Planning manual output-import textareas;
- add reconciliation mode or legacy-planning analysis;
- modify WC27 requirements;
- claim live MCP planning-output save behavior.

## Authorized Production Surface

Expected production changes are limited to:

```text
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningContext.ts                 [only if current handoff comparison needs it]
src/shared/workspaces/projectLifecycleRailStatus.ts
src/shared/workspaceContracts.ts                                  [only for polling/model contract if required]
src/renderer/app/App.tsx
focused Project Planning and rail tests
```

`src/renderer/app/NestedWorkflowRail.tsx` may change only if a narrowly necessary status-presentation correction cannot be made through the shared projection.

No browser security, migration, Project Intake, Architect Interview, Phase Map service, Phase service, Work Card service, OAuth, MCP, package, or release changes are authorized.

A production change outside this surface requires a concrete necessity explanation and must remain directly tied to one of the three defects.

## Explicit Non-Scope

Do not:

- redesign the Project Planning workspace;
- create or change the future MCP save action;
- implement WC27 reconciliation;
- migrate or rewrite legacy documents;
- restore migration controls;
- add manual output-import fallbacks;
- change canonical Markdown format;
- alter browser partition, navigation, authentication, or popup policy;
- use Git as workflow authority;
- add dependencies;
- stage, commit, push, merge, reset, clean, stash, tag, package, or publish.

## Required Evidence

Record each item as `Proven` or `NotProven`.

1. First preparation creates one Approved current Project Planning handoff.
2. Repeating Prepare with unchanged evidence does not change bytes or artifact revision.
3. A genuine upstream source revision permits exactly one new handoff revision.
4. Prepare is disabled when a valid handoff already exists or the workspace is waiting, reviewing, completed, or Needs Attention.
5. Copy remains available when the current handoff is valid.
6. Duplicate current Project Planning handoff evidence produces `Needs Attention`.
7. Duplicate current Phase Map evidence produces `Needs Attention`.
8. Duplicate active closeouts for one phase identity produce `Needs Attention` while distinct phase closeouts remain valid.
9. Duplicate current Project Closeout evidence produces `Needs Attention`.
10. Project Intake and Architect Interview rail mappings remain unchanged.
11. All seven top project cards still receive one title-cased status and no lower static `Open` line.
12. A background Project Planning poll failure is visibly reported while the last readable model and preview remain displayed.
13. A later successful poll clears the polling error.
14. An older delayed poll cannot replace a newer successful model.
15. Polling stops and invalidates pending work when leaving Project Planning or changing repositories.
16. Manual Refresh Planning Outputs reports failure immediately and remains usable after recovery.
17. Controlled external canonical Profile/Roadmap creation is detected by the open workspace without manual import.
18. Project Planning bundle review behavior from WC26 remains intact.
19. Architect Interview browser attachment and review behavior do not regress.
20. `npm run typecheck`, `npm run build`, and `npm test` pass in the approved Windows lane.

Any `NotProven` item means WC26-REPAIR01 remains active. Do not create WC26-REPAIR02 to move ordinary corrections out of this card.

## Validation

Running-product behavior controls acceptance. Focused tests and source inspection support it.

After the required behavior passes, run once in the approved normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

Do not repeatedly retry documented sandbox `spawn EPERM` failures. Record the sandbox result and use the approved normal Windows lane.

## Implementer Report

Create the Implementer Report only after all twenty evidence items are Proven.

The report must include:

- repository, remote, branch, HEAD, and starting dirty-tree inventory;
- exact files changed;
- handoff idempotency comparison and revision rules;
- final `canPrepareHandoff` and `canCopyHandoff` state mapping;
- conflict-resolution rules for every rail authority family changed;
- polling request ordering, overlap protection, cleanup, error display, and recovery behavior;
- controlled external-output validation method;
- all twenty evidence results;
- typecheck, build, and test results with execution lanes;
- remaining Operator validation, if any;
- final dirty-tree inventory;
- confirmation that WC27 and ChampCity_GPT were not modified;
- confirmation that no migration or Git operation occurred.

No fallback implementation is authorized.
