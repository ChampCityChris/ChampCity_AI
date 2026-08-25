# ISSUE_001-FC03-REPAIR04 — Automatic Architect Draft Detection and Promotion

## Failed Evidence

Parent Fix Card:

`issues/ISSUE_001/Fix_Cards/ISSUE_001-FC03_issue_architect_planning.md`

Relevant prior repairs:

- `ISSUE_001-FC03-REPAIR01` — embedded ChatGPT pane sizing;
- `ISSUE_001-FC03-REPAIR02` — Architect recommendation, disposition, and selected-Issue status authority;
- `ISSUE_001-FC03-REPAIR03` — Figma Architect Planning workspace and sidebar status.

Operator validation exposed one remaining FC03 workflow inconsistency while testing `ISSUE_002`:

- Browser GPT successfully wrote the prepared Architect draft under `issues/Architect_Drafts/.../architect-investigation.md`;
- `issues/ISSUE_002/ARCHITECT_INVESTIGATION.md` did not yet exist;
- the Architect Planning workspace continued presenting the pre-promotion state and therefore had no investigation disposition surface;
- the Operator had to discover and press the new `Promote Draft` action manually.

Verified repository evidence confirms this is current designed behavior rather than a Browser GPT write failure. `getIssueArchitectPlanningProjection()` detects whether the active temporary draft exists and exposes `canPromoteDraft`; `IssueArchitectPlanningWorkspace` renders `Promote Draft`; the renderer does not continuously refresh the Issue Architect projection after Browser GPT writes the draft.

The established Development Architect-output runtime already uses the desired pattern: status refresh inspects the exact expected temporary Architect submission and application-owned code automatically promotes a ready valid draft rather than requiring a separate Operator promotion decision.

## Confirmed Defect

Issue Architect Planning introduces a manual lifecycle gate that the equivalent mature Architect workspaces do not have.

Current sequence:

```text
Prepare Handoff
→ Copy Handoff
→ Browser GPT writes exact temporary draft
→ Operator manually clicks Promote Draft
→ ChampCity validates/promotes
→ Awaiting Operator Review
```

Required sequence:

```text
Prepare Handoff
→ Copy Handoff
→ Browser GPT writes exact temporary draft
→ ChampCity detects the draft
→ ChampCity validates and promotes automatically
→ Awaiting Operator Review
→ Operator dispositions the investigation
```

Promotion is application plumbing, not an Operator authority decision. The Operator-owned decision is the subsequent Architect Investigation disposition.

## Root Cause

FC03 implemented Issue Architect draft promotion as an explicit renderer action instead of following the existing Architect-output status-refresh pattern.

Two adjacent implementation gaps create the unnecessary gate:

1. Issue Architect projection refresh only reports that an expected draft exists; it does not application-promote a valid current submission automatically.
2. `App.tsx` does not poll the selected Issue Architect projection while Issue Resolution / Architect Planning is foregrounded, so an MCP-written draft does not naturally transition the workspace after it appears.

## Objective

Make Issue Architect temporary-draft completion self-advancing and consistent with existing Architect-output workspaces: detect the exact current prepared draft, validate/promote it through application-owned authority, refresh immediately to `Awaiting Operator Review`, and remove the user-facing `Promote Draft` gate.

Do not reopen prompt semantics, review/disposition authority, Figma composition, browser attachment, or FC04 planning.

## Required Changes

### 1. Application-owned automatic promotion

Use the existing Issue Architect active-submission identity and exact `temporaryDraftPath` as the only promotable draft authority.

When the Issue Architect status/projection path observes that the exact current prepared temporary draft now exists:

- inspect only that expected draft;
- apply the existing FC03 Architect Investigation body validation, including exact Issue H1, required sections, exact Architect Recommendation, no metadata delimiters, and substantive content;
- if valid, promote it through the existing application-owned promotion/revision-replacement behavior;
- clean up the successful temporary submission as currently required;
- return/project the resulting current state as `Awaiting Operator Review`;
- for `RevisionRequested`, preserve the existing REPAIR02 archive/replacement semantics and return the revised investigation to `Awaiting Operator Review`.

Do not infer ownership from arbitrary files under `issues/Architect_Drafts/`. An unrelated/stale draft must never promote merely because it exists.

### 2. Invalid-draft behavior

An invalid expected draft must not be promoted.

The application must surface a stable Issue Architect attention/error state with the validation reason rather than repeatedly attempting the same invalid draft on every poll and flooding the UI/error channel.

Recovery must remain bounded and explicit: a fresh Prepare Handoff/submission may be created after the invalid submission is cleared or otherwise made non-retry-looping by the service.

Do not overwrite the current final investigation or current review on failed validation/promotion.

### 3. Scoped projection polling

While all of the following are true:

```text
Issue Resolution is foregrounded
+ selected Issue is readable
+ active Issue stage = Architect Planning
```

poll/refresh the Issue Architect projection at a modest interval comparable to the existing Architect-output workspace polling behavior.

The polling path must:

- detect Browser GPT/MCP draft arrival without requiring Operator Refresh;
- stop when leaving Architect Planning, leaving Issue Resolution, opening another project, or unmounting the active context;
- not invoke Development `currentWorkflowService`, Development Architect-output polling, Codex start actions, or another workflow authority;
- avoid overlapping/in-flight refresh races in the normal renderer path.

Once automatic promotion produces `Awaiting Operator Review`, the workspace must update to the investigation document and disposition panel without another manual lifecycle action.

### 4. Remove manual promotion from Operator UI

Remove the user-facing `Promote Draft` action from Issue Architect Planning.

The right Architect action surface should retain state-appropriate controls such as:

- Reload ChatGPT;
- Prepare Handoff;
- Copy Handoff;
- Refresh.

Do not replace `Promote Draft` with another confirmation button, approval dialog, or hidden Operator gate.

The internal promotion function may remain as a service implementation seam or focused-test helper if useful, but it must no longer be required as an Operator action in the normal Issue Architect workflow.

## Preservation Requirements

Preserve without redesign:

- REPAIR01 full-height embedded ChatGPT/browser behavior;
- REPAIR02 Architect Recommendation semantics, `ARCHITECT_REVIEW.md`, Approved / RevisionRequested / Rejected dispositions, Issue Planning eligibility, and revision history preservation;
- REPAIR03 Figma document/review + browser/action composition and sidebar Stage/State projection;
- Browser GPT writing only the exact temporary draft through `artifact_toolbox.write_markdown_artifact`;
- application-owned final-write authority;
- Issue/Development workflow isolation;
- multiple open Issue selection behavior;
- Development Architect-output behavior;
- Settings/Hub/project-switch behavior;
- no Git mutation.

## Forbidden Changes

This repair does not authorize:

- changing the Issue Architect prompt/recommendation policy;
- changing Operator disposition semantics;
- changing Issue Planning eligibility;
- redesigning the Figma workspace or sidebar;
- redesigning the embedded browser/attachment coordinator;
- moving Issue Architect into Development `WorkspaceId` or planning-document authority;
- implementing FC04 Issue Planning or later Issue stages;
- generic filesystem watching infrastructure;
- scanning/promoting arbitrary Architect draft directories;
- new packages or dependencies;
- Git mutation.

## Acceptance Criteria

1. After Prepare/Copy, a valid exact current temporary Architect draft can complete the Issue Architect workflow without any Operator `Promote Draft` action.
2. The active Issue Architect projection/status refresh detects the expected draft, validates it, promotes it through application-owned authority, and projects `Awaiting Operator Review`.
3. The Figma workspace automatically transitions from Issue Record/pre-promotion presentation to `ARCHITECT_INVESTIGATION.md` plus the disposition panel after successful auto-promotion.
4. No `Promote Draft` button or equivalent Operator promotion gate appears in Issue Architect Planning.
5. An invalid expected draft never reaches the final investigation path, produces a visible stable validation failure/attention state, and does not enter an infinite repeated-promotion loop.
6. An unrelated or stale draft under `issues/Architect_Drafts/` is ignored and never promoted for the selected Issue.
7. `RevisionRequested` revised drafts auto-promote through the existing history-preserving replacement path and return to Awaiting Operator Review.
8. Polling runs only for foreground Issue Resolution Architect Planning and stops outside that context.
9. Automatic Issue Architect polling/promotion does not invoke or modify Development lifecycle/Architect/Codex authority.
10. Existing recommendation, disposition, Figma layout, sidebar status, browser sizing, multiple-Issue behavior, and Development Architect behavior remain intact.

## Tests and Validation

Add focused regression proof at the smallest relevant boundary.

Service coverage must prove at least:

- valid exact active draft auto-promotes from a status/projection refresh without an explicit manual promotion call;
- invalid draft remains unpromoted and does not repeatedly reattempt indefinitely;
- unrelated/stale draft is ignored;
- revision-requested draft auto-promotes while preserving prior investigation/review history;
- successful auto-promotion produces `awaiting-operator-review` and retains the existing recommendation/disposition rules.

Renderer coverage must prove at least:

- Architect Planning has scoped projection polling while foregrounded;
- the polling path contains no Development/Codex start action;
- `Promote Draft` is absent from the Issue Architect Operator UI;
- Figma disposition presentation remains available after the promoted projection is returned.

Run and report:

```text
npm run build
node --test test/issue-resolution/issue-architect-planning-service.test.cjs
node --test test/renderer/issue-architect-planning-workspace.test.cjs
node --test test/renderer/issue-resolution-shell.test.cjs
node --test test/browser/architect-browser-handoff.test.cjs
```

Run a broader existing Architect-output regression only if needed to prove preserved shared behavior. Unrelated/pre-existing source-string failures are evidence to classify, not automatic blockers.

## Implementer Report

Write:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03-REPAIR04_automatic_architect_draft_detection_and_promotion.md`

The report must include:

- failed evidence and confirmed root cause;
- files changed;
- exact automatic detection/promotion path;
- invalid-draft/retry-loop prevention behavior;
- scoped polling proof;
- confirmation the Operator `Promote Draft` action was removed;
- revision-history preservation proof;
- focused commands/results and causal classification of unrelated failures;
- remaining Operator validation.

## Operator Validation

Using an Issue without a final investigation:

1. Prepare and copy the Architect handoff.
2. Have Browser GPT create the expected temporary draft through MCP.
3. Do **not** click Refresh or any promotion action.
4. Confirm ChampCity detects/promotes the draft automatically within the normal polling interval.
5. Confirm `ARCHITECT_INVESTIGATION.md` appears as the active review document and the disposition panel appears automatically.
6. Confirm no `Promote Draft` control exists.

If practical, also confirm a RevisionRequested rerun returns automatically to Awaiting Operator Review after Browser GPT writes the revised draft.

## Return Path

Return to parent FC03 after implementation and focused review.

If REPAIR04 passes, FC03 remains accepted and the workflow can proceed to FC04 without retaining a manual draft-promotion exception unique to Issue Architect Planning.
