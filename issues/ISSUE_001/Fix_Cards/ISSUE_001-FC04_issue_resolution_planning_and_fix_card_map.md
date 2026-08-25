# ISSUE_001-FC04 — Issue Resolution Planning and Fix Card Map

## Governing Evidence

- `issues/ISSUE_001/ISSUE_RESOLUTION_PLAN.md`
- `issues/ISSUE_001/FIX_CARD_PLAN.md`
- `issues/ISSUE_001/Fix_Cards/ISSUE_001-FC03_issue_architect_planning.md`
- accepted FC03 repairs `REPAIR01` through `REPAIR04`
- `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`
- current Issue Resolution production path in `src/main/issueResolution/`, `src/shared/issueResolutionContracts.ts`, `src/renderer/app/App.tsx`, `IssueResolutionRail.tsx`, `IssueArchitectPlanningWorkspace.tsx`, and `FigmaSidebar.tsx`
- existing atomic Architect planning-bundle pattern in `src/main/phasePlanning/phasePlanningDraftBundle.ts` and the shared Architect draft/promotion substrate

## Verified Current State

FC03 now provides a selected-Issue Architect Planning projection, automatic temporary-draft promotion, Figma document/chat presentation, durable `ARCHITECT_REVIEW.md`, and an explicit `issuePlanningEligible` result.

Issue Planning is not yet functional. The Issue rail exposes it only as a future stage, there is no Issue-owned planning bundle service, no generated `ISSUE_RESOLUTION_PLAN.md` / `FIX_CARD_PLAN.md` workflow, no Fix Card Map projection, and no Issue Planning Operator review authority.

The mature Development planning path already proves the useful lower-level pattern: a prepared Architect handoff can own multiple expected temporary drafts, validate all bundle members, promote them application-side as one coherent bundle, and then expose the promoted documents for Operator review. FC04 should reuse that machinery where semantics match without making Issue Planning a Development `WorkspaceId` or Phase.

## Objective

Make **Issue Planning** the third functional Issue Resolution stage.

For a selected Issue whose Architect Planning has been approved with recommendation `Proceed in Issue Resolution`, generate and review one Issue-owned planning bundle:

```text
ISSUE_RESOLUTION_PLAN.md
+
FIX_CARD_PLAN.md / Fix Card Map
```

The bundle must decompose the accepted correction architecture into one or more bounded Fix Card candidates without introducing Issue phases or implementing the Fix Card execution loop owned by FC05+.

## Required Runtime Sequence

```text
Approved Issue Architect Planning
→ Issue Planning available
→ Prepare / Copy Issue Planning handoff
→ Browser GPT inspects Issue Record + accepted Architect evidence through bound MCP
→ Browser GPT writes exactly two temporary planning drafts
→ ChampCity detects both expected drafts
→ validates both
→ atomically promotes both to the selected Issue directory
→ Issue Planning shows the promoted bundle
→ Operator dispositions the bundle
→ Approved bundle makes Fix Cards stage / Fix Card Map eligible
```

Draft promotion is application plumbing. Do not add a manual `Promote Draft` action.

## Required Changes

### 1. Issue Planning eligibility and stage ownership

`Issue Planning` is available only when the selected Issue has current FC03 evidence equivalent to:

```text
ARCHITECT_INVESTIGATION.md readable
+ ARCHITECT_REVIEW.md disposition = Approved
+ Architect Recommendation = Proceed in Issue Resolution
+ issuePlanningEligible = true
```

Do not require a Development Phase, Work Card, Development planning document, or Development current-workflow resolver.

Approved `Reframe to Development/Feature`, `Unsupported / No Action`, `Rejected`, `RevisionRequested`, missing/unreadable Architect evidence, or another non-eligible FC03 state must not activate Issue Planning.

Extend the selected-Issue workflow-status projection so the sidebar can report `Stage: Issue Planning` and its service-owned state while this stage is current.

### 2. Issue-owned planning bundle

The final bundle paths are exactly:

```text
issues/<ISSUE_ID>/ISSUE_RESOLUTION_PLAN.md
issues/<ISSUE_ID>/FIX_CARD_PLAN.md
```

Browser GPT writes only temporary body drafts under the existing Issue Architect draft area, for example:

```text
issues/Architect_Drafts/<submission-id>/issue-resolution-plan.md
issues/Architect_Drafts/<submission-id>/fix-card-plan.md
```

Use one active selected-Issue planning submission containing both expected draft identities. Do not scan arbitrary draft directories or infer ownership from filenames.

Both final outputs are one atomic planning bundle: either both current validated drafts promote, or neither final file changes.

Reuse/generalize the existing Architect draft-submission / validation / atomic-promotion substrate where practical. Do not register Issue Planning as a Development workspace merely to access that machinery and do not create a second generic draft engine.

### 3. Issue Planning Architect handoff

The prepared Browser GPT handoff must bind the selected MCP workspace and identify at minimum:

- selected Issue ID/title;
- exact `ISSUE_RECORD.md` path;
- exact accepted `ARCHITECT_INVESTIGATION.md` path;
- exact `ARCHITECT_REVIEW.md` path/disposition/recommendation;
- final planning bundle paths;
- exact temporary draft paths.

The Architect's job is to translate the **accepted** correction architecture into one coherent bounded implementation plan. It must not reinvestigate the Issue from scratch or silently overturn the accepted Architect recommendation.

If repository evidence discovered during planning materially contradicts the accepted investigation, or the correction cannot reasonably remain bounded without becoming phase-like/multi-phase product development, stop and surface that as a material Operator decision rather than manufacturing an oversized Fix Card Plan.

Otherwise proceed without another question gate.

The handoff must direct Browser GPT to use `artifact_toolbox.write_markdown_artifact` with `overwrite: false` for exactly the two temporary drafts and never write the final bundle or review artifact directly.

### 4. Issue Resolution Plan body

Require substantive body-only Markdown with exact selected-Issue H1:

```text
# ISSUE_NNN — Issue Resolution Plan
```

The plan must clearly contain the accepted correction objective, bounded scope/non-scope, architecture/correction direction, preservation requirements, dependencies/sequencing, risks, validation strategy, and completion criteria. Exact prose may vary; do not force Development Phase terminology into the document.

The plan must not create an Issue Phase hierarchy.

### 5. Fix Card Plan and machine-readable map

Require substantive body-only Markdown with exact selected-Issue H1:

```text
# ISSUE_NNN — Fix Card Plan
```

The document must provide a readable card decomposition and exactly one fenced domain block:

```text
```champcity-fix-card-plan
[
  {
    "fixCardId": "ISSUE_NNN-FC01",
    "order": 1,
    "title": "...",
    "purpose": "...",
    "dependsOn": [],
    "evidencePaths": ["..."]
  }
]
```
```

Validation requirements:

- at least one candidate;
- IDs belong to the selected Issue and use sequential `FC01`, `FC02`, ... identity;
- `order` is unique and deterministic;
- title and purpose are substantive;
- `dependsOn` references only candidates in the same plan and contains no cycles;
- dependencies represent real implementation ordering, not separate approval-gate artifacts;
- evidence paths are repository-relative strings;
- no persisted `completed`, validation disposition, repair state, or other lifecycle result that later services must derive from actual artifacts.

The Fix Card Map UI projection is derived from this validated domain block. Do not derive map authority from loose prose headings.

Fix Card candidates must follow the retained Work/Repair Card discipline: verified evidence, bounded scope, explicit preservation, forbidden changes, objective acceptance, focused validation, and Implementer proof. Small Issues may have one Fix Card. Normal Issues may have several. Do not create an Issue Phase merely because more than one card exists.

### 6. Automatic two-draft detection and promotion

Follow the accepted FC03-REPAIR04 behavior:

- poll/refresh only while Issue Resolution → Issue Planning is foregrounded for an eligible readable selected Issue;
- inspect only the exact active submission's two temporary paths;
- wait until both expected drafts exist;
- validate both before final writes;
- promote as one bundle;
- clean successful temporary submission state;
- update the workspace automatically without Operator Refresh or Promote action.

If one or both drafts are invalid, promote neither and surface a stable `Needs Attention` reason. Do not repeatedly reattempt the same failed submission on every poll. A fresh Prepare Handoff creates a fresh submission.

### 7. Operator review and revision

After both final planning documents exist, project:

```text
Awaiting Operator Review
```

Persist one application-owned bundle review at:

```text
issues/<ISSUE_ID>/ISSUE_PLANNING_REVIEW.md
```

Support:

```text
Approved
RevisionRequested
Rejected
```

The review records the Issue ID, both current planning paths, disposition, and Operator notes. `RevisionRequested` requires notes and reopens planning handoff preparation with the exact current bundle plus review notes.

A successful revised bundle must preserve the prior two planning documents and prior review under one deterministic Issue-owned planning-history location before replacing the current bundle, then return to `Awaiting Operator Review`.

Only `Approved` makes the `Fix Cards` parent stage / Fix Card Map eligible. File existence alone is not completion authority.

No separate approval is required merely because two files comprise the bundle; they are reviewed as one planning decision.

### 8. Figma Issue Planning workspace

Use the established Figma Architect workspace grammar from FC03/REPAIR03 rather than a new dashboard stack.

At normal desktop width:

```text
Left planning document/review column     Right Architect column
Issue Resolution Plan / Fix Card Plan    Embedded ChatGPT
scrollable tabs/documents                 full usable browser
bundle disposition below                 handoff/browser actions below
```

Required behavior:

- before promotion, show accepted Architect evidence/current planning status appropriately;
- after promotion, default to `ISSUE_RESOLUTION_PLAN.md` with an obvious tab for `FIX_CARD_PLAN.md`;
- display the derived Fix Card Map in the Issue Planning surface or a clearly adjacent bounded map panel without replacing the documents as authority;
- disposition panel appears for the current bundle when awaiting review;
- right-side actions include state-appropriate `Reload ChatGPT`, `Prepare Handoff`, `Copy Handoff`, and `Refresh` only;
- no manual Promote action;
- preserve REPAIR01 browser sizing and responsive stacking.

Do not reuse Development planning disposition authority merely for visual similarity.

## Preservation Requirements

Preserve:

- FC01–FC03 and all accepted FC03 repair behavior;
- multiple independent open Issues and selected-Issue state;
- Issue Architect recommendation/review authority;
- automatic Architect draft promotion pattern;
- Development project/phase/Work Card/Repair/validation/close semantics;
- selected-project, Hub, Settings, theme, MCP, browser, Codex, and execution behavior;
- current `issues/ISSUE_001/ISSUE_RESOLUTION_PLAN.md` and `FIX_CARD_PLAN.md` as bootstrap/manual planning evidence; opening FC04 must not rewrite them merely to satisfy the new generated-plan format;
- no Git mutation.

## Forbidden Changes

FC04 does not authorize:

- Issue Phase creation;
- Fix Card implementation-contract creation or execution (FC05);
- Fix Card Operator Validation or Repair (FC06);
- Fix Card Close/Next (FC07);
- Issue Validation or Issue Close;
- cross-workflow transfer implementation;
- rewriting existing bootstrap Issue planning documents as migration;
- adding Issue Planning to Development `workspaceDefinitions` or `currentWorkflowService`;
- a duplicate generic Architect-output engine;
- manual draft-promotion gates;
- ticketing/backlog/severity/assignment features;
- new packages unless separately approved;
- Git stage/commit/push/branch mutation.

## Acceptance Criteria

1. Issue Planning is functional only for a selected Issue with FC03 `issuePlanningEligible = true`; ineligible Architect outcomes do not activate it.
2. Issue Planning remains Issue-owned and does not require Development Phase/Work Card/current-workflow authority.
3. Prepare/Copy generates one bound MCP handoff for exactly two temporary drafts and never directs Browser GPT to write final planning/review paths.
4. A valid exact two-draft submission auto-promotes atomically to `ISSUE_RESOLUTION_PLAN.md` and `FIX_CARD_PLAN.md`; no manual Promote action exists.
5. Partial, invalid, unrelated, or stale draft sets never produce a partial/final planning bundle and yield bounded retryable evidence.
6. Fix Card Plan validation produces a deterministic candidate map with Issue-relative sequential IDs, valid dependencies, and no persisted lifecycle completion state.
7. The Figma Issue Planning workspace presents both planning documents, derived Fix Card Map, full embedded ChatGPT pane, right-side handoff actions, and one bundle disposition surface.
8. Current planning bundle without review is `Awaiting Operator Review`; `Approved`, `RevisionRequested`, and `Rejected` persist in `ISSUE_PLANNING_REVIEW.md`.
9. Only Approved planning makes the Fix Cards parent stage/Map eligible.
10. RevisionRequested requires notes, prepares a revision-aware two-output handoff, preserves prior bundle/review history, atomically replaces the bundle, and returns to Awaiting Operator Review.
11. Sidebar reports the selected Issue's service-owned `Stage: Issue Planning` and current state while planning is current.
12. Existing bootstrap ISSUE_001 planning documents are not silently rewritten or migrated.
13. Development and accepted FC01–FC03 behavior remain intact and no FC05+ functionality is introduced.

## Tests and Validation

Add focused service and renderer coverage at the smallest relevant boundaries, preferably:

```text
test/issue-resolution/issue-planning-service.test.cjs
test/renderer/issue-planning-workspace.test.cjs
```

Update Issue shell/rail tests only for the intentional new Issue Planning eligibility behavior.

Prove at minimum:

- eligibility matrix from FC03 recommendation/disposition;
- two-draft prepared handoff contract;
- partial bundle waits;
- valid bundle auto-promotes atomically;
- invalid member promotes neither and does not retry-loop;
- stale/unrelated drafts ignored;
- Fix Card Plan domain-block parsing, sequential IDs, dependency validation/cycle rejection, and no persisted completion state;
- bundle review dispositions and Issue Planning eligibility;
- revision history/atomic replacement;
- Figma document/chat/disposition composition, no Promote action, sidebar Stage/State, and browser sizing preservation.

Run and report:

```text
npm run build
node --test test/issue-resolution/issue-planning-service.test.cjs
node --test test/renderer/issue-planning-workspace.test.cjs
node --test test/issue-resolution/issue-architect-planning-service.test.cjs
node --test test/renderer/issue-architect-planning-workspace.test.cjs
node --test test/renderer/issue-resolution-shell.test.cjs
node --test test/browser/architect-browser-handoff.test.cjs
```

Use broader suites only when a concrete FC04 integration boundary requires them. Tests are evidence, not independent product authority; causally unrelated/pre-existing failures must be classified rather than mechanically blocking FC04.

## Implementer Report

Write:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC04_issue_resolution_planning_and_fix_card_map.md`

Report:

- verified repository state and files changed;
- Issue Planning eligibility/authority path;
- reuse/generalization of the Architect draft/atomic-promotion substrate;
- exact two-draft MCP contract and auto-promotion path;
- Fix Card Plan map schema/parser and validation;
- bundle review/revision/history behavior;
- Figma workspace/sidebar/rail behavior;
- proof no FC05+ implementation or Development authority leakage occurred;
- exact commands/results, causal classification of unrelated failures, residual risks, and remaining Operator validation.

## Operator Validation

Using an Issue whose Architect Planning is `Approved — Ready for Issue Planning`:

1. Open Issue Planning and confirm the selected Issue Stage/State is correct.
2. Confirm the workspace uses the Figma planning-document + embedded ChatGPT composition.
3. Prepare/copy the handoff and let Browser GPT write the two expected drafts.
4. Confirm both drafts auto-promote together with no Promote button/manual gate.
5. Confirm both planning documents and the Fix Card Map appear.
6. Confirm the bundle disposition panel appears and Approved enables the Fix Cards stage.
7. If practical, request one revision and confirm the revised bundle returns automatically to Awaiting Operator Review with prior bundle evidence preserved.
8. Confirm Development state remains unchanged after Hub/Development round trips.

Do not create extra durable test Issues solely to satisfy visual validation if a real eligible Issue is unavailable; focused fixture proof may cover promotion/revision mechanics.

## Return Path

Return FC04 for Architect code/evidence review and Operator validation.

If FC04 passes, proceed to `ISSUE_001-FC05` for Fix Card Planning, Implement, and Architect Review reuse. Do not implement the Fix Card execution loop opportunistically inside FC04.
