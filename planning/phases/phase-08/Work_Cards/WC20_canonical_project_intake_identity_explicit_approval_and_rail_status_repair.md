# Work Card — Phase 08 WC20 Canonical Project Intake Identity, Explicit Approval, and Rail Status Repair

Status: approved by Operator
Owner: Implementer
Phase: phase-08
Risk: high
Depends on: completed WC18 Project Intake Operator Validation Defect Repair and WC19 Project Intake Post-Submit Review and Continuation Precedence Repair
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC20_canonical_project_intake_identity_explicit_approval_and_rail_status_repair.md`

Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.

## Purpose

Repair exactly three post-WC19 Project Intake defects:

1. changing the Project Name changes the generated slug and creates additional Project Intake, Architect Interview Prompt, and future Interview artifact identities in the same repository;
2. saving Project Intake creates the Operator-authored gating document as `Approved`, bypassing explicit Operator review and disposition;
3. the Project Intake rail card displays `CURRENT` or `OPEN` based only on which workspace is selected rather than the actual Project Intake lifecycle state.

This card is tightly bounded to Project Intake identity, Project Intake disposition, duplicate-conflict handling, and the Project Intake card’s evidence-derived status label. It does not reopen completed viewport, post-submit confirmation, generated prompt content, context-menu, repository-selection, embedded-browser, or later-lifecycle repairs.

## Controlling Evidence

Operator evidence:

- one repository contains both `PROJECT_INTAKE_revisionary` and `PROJECT_INTAKE_test` after Project Name was changed and the intake was submitted again;
- created Project Intake documents display `Approved` immediately without a separate Operator approval action;
- the Project Intake rail card displays `CURRENT` when selected and `OPEN` when not selected, even when the repository contains an Approved Project Intake.

Governing design:

`planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`

The design confirms that saving the questionnaire creates the durable Project Intake and the Architect Interview Prompt. It does not state that the Operator-authored `gatingReview` Intake self-approves. The existing generic synchronized disposition writer already provides an explicit Operator approval path.

## Verified Code Ownership

### Project Intake artifact identity and initial disposition

Owned by:

`src/main/projectIntake/projectIntakeService.ts`

Current behavior:

```ts
const projectSlug = slugify(submission.projectName);
const projectIntakeJsonPath =
  `planning/project/Project_Intake/PROJECT_INTAKE_${projectSlug}.json`;
const previousIntake = findByPath(projectRoot, projectIntakeJsonPath);
```

The service searches only the path derived from the newly submitted Project Name. A changed name produces a different path, so the existing Intake is not recognized as the same repository’s canonical Intake.

The same service currently writes:

```text
participationRole=gatingReview
Document.Status=Approved
```

and JSON:

```json
{
  "participationRole": "gatingReview",
  "documentDisposition": { "status": "Approved" }
}
```

### Explicit disposition persistence

Already owned and implemented by:

`src/main/documents/planningDocumentService.ts`

`setDocumentDisposition()` writes and verifies synchronized Markdown/JSON dispositions. WC20 must use the existing path. Do not create a new approval subsystem, hidden state, or duplicate disposition writer.

### Resolver and current-workspace projection

Owned by:

- `src/shared/documents/documentOrder.ts`
- `src/main/currentWorkflow/currentWorkflowService.ts`

A Pending Project Intake already qualifies as the current `gatingReview` document through normal resolver behavior. A duplicate canonical Intake corpus requires one narrowly bounded explicit conflict result so the application does not silently choose one Intake as authoritative.

### Rail status derivation and display

Owned by:

- `src/renderer/app/App.tsx`
- `src/renderer/app/NestedWorkflowRail.tsx`

Current rail props provide only:

```text
activeWorkspaceId
onWorkspaceChange
workspaceCounts
```

The rail has no document-disposition or lifecycle-status input. `WorkflowStepButton` currently derives its text from selection state:

```text
exact     → CURRENT
parent    → CONTEXT
available → OPEN
```

Selection highlighting and lifecycle status are therefore conflated.

## Root Cause Analysis

### Defect 1 — Mutable Project Name creates multiple Intake identities

#### Failure chain

```text
Operator enters Project Name A
→ slug A determines Intake, prompt, and Interview paths
→ submission creates artifact family A
→ Operator changes Project Name to B
→ slug B determines different paths
→ lookup for previous Intake checks only path B
→ existing Intake A is not found
→ submission creates artifact family B
→ repository now contains multiple canonical Intake records
```

#### Primary root cause

A mutable questionnaire answer is being used as the durable repository artifact identity.

#### Contributing causes

- no repository-level singleton analysis occurs before Project Intake writes;
- revision lookup is path-based rather than artifact-type and canonical-directory based;
- prompt and Interview target paths are recalculated from every submitted Project Name;
- service tests assert slug generation but do not test Project Name changes in the same repository;
- no duplicate canonical Intake conflict is surfaced.

#### Detection gap

Tests validated one initial submission and same-name revision behavior. They did not submit two different Project Names to the same repository and assert one stable artifact family.

### Defect 2 — Gating Intake self-approves on save

#### Failure chain

```text
Operator enters questionnaire answers
→ Submit Project Intake writes durable Intake
→ renderer reloads created document
→ Intake already contains Approved disposition
→ resolver treats Intake as complete
→ no distinct Operator review and approval occurs
```

#### Primary root cause

The implementation equated Operator authorship with Operator approval.

#### Contributing causes

- the generated prompt is correctly an Approved `nonReviewHandoff`, and that disposition was copied to the separate `gatingReview` Intake;
- a service test explicitly requires the Intake JSON to be Approved;
- the post-submit workflow was designed around immediate transition to Architect Interview waiting rather than Pending Intake review;
- the generic disposition controls already existed but were bypassed by creation-time approval.

#### Detection gap

Automated tests checked file contents and downstream resolver progression but did not validate the human distinction between saving a draft and approving the durable record.

### Defect 3 — Rail selection state masquerades as lifecycle status

#### Failure chain

```text
Rail receives activeWorkspaceId only
→ selected card becomes exact state
→ exact state text is CURRENT
→ unselected card becomes available state
→ available state text is OPEN
→ Project Intake disposition is never examined
→ Approved, Pending, absent, and duplicate states display the same navigation labels
```

#### Primary root cause

One UI state is being used for two independent concepts:

```text
Viewed-workspace selection
and
Repository-derived lifecycle status
```

#### Contributing causes

- no shared Project Intake corpus-status helper exists;
- `workspaceCounts` are insufficient to determine disposition or singleton validity;
- `NestedWorkflowRail` hardcodes status text inside the visual-selection component;
- no rail-state behavioral tests exist.

#### Detection gap

The rail was visually validated for placement and selection highlighting, but not for evidence-derived lifecycle semantics.

## Required Outcome

```text
One selected repository
→ zero or one canonical Project Intake artifact family
→ initial save creates Pending Intake plus Approved non-review prompt
→ Operator reviews and explicitly approves Intake
→ Project Intake rail status changes from Open
   to Awaiting Approval
   to Completed
→ changing Project Name revises the same artifact family in place
→ duplicate existing Intake families produce an explicit local conflict
```

## Required Repair 1 — Repository-Level Canonical Project Intake Identity

Implement one stable Project Intake artifact family per selected repository.

### Corpus analysis

Create or extend one narrowly scoped shared helper that analyzes active non-historical canonical Project Intake logical documents using:

```text
artifactType=project-intake
or canonical path under planning/project/Project_Intake/
```

The helper must distinguish:

```text
open       → no canonical Project Intake logical document
single     → exactly one canonical Project Intake logical document
conflict   → more than one canonical Project Intake logical document
```

Do not use filename substring matching outside the canonical directory.

### Initial repository behavior

When no canonical Project Intake exists:

1. Create one Project Intake pair.
2. Create one associated Project Architect Interview Prompt pair.
3. Establish one future Project Architect Interview target pair.
4. The first submitted Project Name may supply the initial stable artifact key under the existing slug-based path contract.
5. Persist enough metadata in the Intake and prompt JSON siblings to identify the stable project artifact key on later revisions.

Do not add a separate database, project registry, hidden settings file, or global identity service.

### Existing singleton behavior

When exactly one canonical Project Intake exists:

1. Reuse that existing Intake Markdown and JSON path exactly.
2. Preserve the existing stable artifact key when Project Name changes.
3. Reuse the associated prompt pair’s exact paths when it exists.
4. Preserve the existing Architect Interview output targets when they exist in prompt metadata.
5. If the associated prompt is absent, derive its paths from the existing stable Intake identity, not from the newly submitted Project Name.
6. Update Project Name and all other submitted answers as document content.
7. Increment Intake and prompt revisions through the existing revision contract.
8. Do not create a second Intake, prompt, or Interview target family.

### Existing duplicate behavior

When more than one canonical Project Intake exists:

1. Do not select one silently.
2. Do not create or overwrite any Intake family.
3. Fail submission locally with an actionable conflict message listing the repository-relative Intake paths.
4. Surface the repository as a Project Intake conflict in resolver/current-workspace context.
5. Display a Project Intake rail status of `Conflict`.
6. Do not automatically delete, merge, rename, archive, or approve any duplicate.

Automatic duplicate cleanup is outside WC20. The Operator must resolve which artifact family to retain through a separately controlled action or manual repository correction.

### Stable path rules

- Project Name changes must not rename existing artifacts.
- Project Name changes must not change the prompt’s output targets.
- Project Name remains editable content.
- The confirmation panel must continue to show the actual preserved paths returned by the service.
- Existing repositories with one valid slugged artifact family remain supported without migration.

## Required Repair 2 — Pending Intake and Explicit Operator Approval

Change Project Intake creation and revision disposition behavior.

### Initial save

The Project Intake Markdown/JSON pair must be created as:

```text
participationRole=gatingReview
Document.Status=Pending
```

The generated Project Architect Interview Prompt remains:

```text
participationRole=nonReviewHandoff
Document.Status=Approved
```

The prompt is generated on save as required by the governing design, but it does not make the Pending Intake complete.

### Post-submit behavior

After successful save:

1. Keep the visible workspace in Project Intake Capture.
2. Select and preview the Pending Project Intake document.
3. Preserve the WC19 four-path confirmation behavior.
4. Show the existing generic disposition controls for the selected Intake.
5. Resolver/current-workspace context must identify Project Intake as current while its disposition is not Approved.
6. Do not project Architect Interview waiting until the Intake becomes Approved.

### Explicit approval

When the Operator applies `Approved` through the existing disposition control:

1. Write Approved to both Intake siblings using `setDocumentDisposition()`.
2. Reload documents and resolver/current-model context.
3. Update the Project Intake rail status to `Completed`.
4. With an Approved prompt and no Interview output, current required context becomes Architect Interview waiting.
5. The Operator may remain in Project Intake Capture if the viewed-workspace/current-required-workspace separation requires it; do not reintroduce forced navigation solely to update rail status.

### Revisions

When an existing Intake is submitted again:

1. Revise the same artifact family in place.
2. Increment the Intake revision.
3. Regenerate the prompt against the new source revision.
4. Set the revised Intake disposition to `Pending`, even if it was previously Approved.
5. Keep the regenerated prompt Approved as a non-review handoff.
6. Invalidate an existing approved downstream Interview according to the current source-revision contract.
7. Set the Project Intake rail status to `Awaiting Approval` until the revised Intake is explicitly Approved.

### Other dispositions

For Project Intake dispositions `Pending`, `Rejected`, or `RevisionRequested`, the rail status is `Awaiting Approval` because the Intake is not complete. Do not add new disposition values.

## Required Repair 3 — Evidence-Derived Project Intake Rail Status

Separate visual selection from lifecycle status for the primary Project rail.

### Shared status model

Derive Project Intake rail status from the active repository’s canonical Intake corpus:

| Corpus state | Project Intake card label |
|---|---|
| No canonical Intake | `Open` |
| Exactly one canonical Intake not Approved | `Awaiting Approval` |
| Exactly one canonical Intake Approved | `Completed` |
| More than one canonical Intake | `Conflict` |

The status must be derived from repository documents after every:

- initial workspace load;
- repository switch;
- Project Intake submission;
- document refresh;
- Intake disposition change.

### Selection behavior

- The currently viewed card remains visually highlighted through `activeWorkspaceId`.
- Do not display the word `CURRENT` on the Project Intake card.
- Highlighting is sufficient to communicate which workspace is being viewed.
- Selection must not change the lifecycle label.
- A selected Completed card must still read `Completed`.
- A selected Awaiting Approval card must still read `Awaiting Approval`.
- An unselected Completed card must still read `Completed`.

### Rail component boundary

Update `NestedWorkflowRail` to receive an explicit Project Intake lifecycle status or a bounded primary-rail status map from `App.tsx`.

Do not make the rail independently call IPC or inspect filesystem paths.

For other primary Project cards under WC20:

- preserve their current generic availability behavior;
- remove `CURRENT` as the textual label for exact selection if the shared button implementation would otherwise display it;
- use visual highlighting and `aria-current` for selection;
- do not invent evidence-derived statuses for later workspaces in this card.

The lower Phase and Work Card loop rails are outside WC20 unless a minimal shared selection-label correction is required to remove the word `CURRENT` from the primary card component only.

### Accessibility

- `aria-current="page"` remains the selected-workspace indicator.
- The accessible label must state both the lifecycle status and that activating the card opens the workspace.
- Do not encode status through color alone.

## Required Repair 4 — Duplicate Conflict Projection

Add the minimum explicit resolver/current-model behavior required for repositories that already contain multiple Project Intake documents.

### Required result

A duplicate corpus must project:

```text
activeWorkspaceId: project-intake-capture
state: project-intake-conflict
required action: resolve multiple canonical Project Intake documents
source evidence: every conflicting Intake path
```

It must not:

- return `all-approved`;
- choose one Intake based on sort order;
- proceed to Architect Interview;
- proceed to later Project or Phase evidence;
- allow Project Intake submission to create another artifact family.

A narrowly scoped `project-intake-conflict` result shape is authorized in:

- `src/shared/documents/documentOrder.ts`;
- `src/main/currentWorkflow/currentWorkflowService.ts`;
- `src/renderer/app/App.tsx` only as required to display the local conflict.

Do not create a universal duplicate-artifact framework.

## Required Repair 5 — Focused Behavioral Tests

Retain completed WC18/WC19 tests and add tests for these exact behaviors.

### Canonical identity tests

1. First submission creates one Intake pair and one prompt pair.
2. Second submission with the same Project Name revises the same paths.
3. Second submission with a different Project Name revises the same paths.
4. Project Name content changes in both Intake siblings without path changes.
5. Prompt paths and Interview output targets remain unchanged after Project Name changes.
6. File inventory contains no second Intake, prompt, or Interview target family.
7. Revisions increment correctly.
8. One existing slugged Intake family is reused without migration.
9. Multiple existing Intake families cause an actionable conflict and no writes.

### Explicit approval tests

1. Initial Intake Markdown and JSON dispositions are Pending.
2. Initial prompt Markdown and JSON dispositions remain Approved.
3. Resolver selects the Pending Intake as current.
4. Applying Approved through the existing disposition service synchronizes both Intake siblings.
5. Approved Intake plus Approved prompt plus no Interview projects Architect Interview waiting.
6. Revising an Approved Intake returns it to Pending.
7. Revised Intake requires explicit reapproval before Architect Interview waiting resumes.
8. Existing approved Interview invalidation remains correct after Intake revision.

### Rail-status tests

Create a narrowly scoped pure helper when needed and verify:

1. zero canonical Intake documents → `Open`;
2. one Pending Intake → `Awaiting Approval`;
3. one Rejected Intake → `Awaiting Approval`;
4. one RevisionRequested Intake → `Awaiting Approval`;
5. one Approved Intake → `Completed`;
6. multiple canonical Intakes → `Conflict`;
7. changing `activeWorkspaceId` does not change the lifecycle label;
8. exact visual selection does not produce the text `CURRENT` for Project Intake.

Do not rely only on source-string assertions. Pure status derivation and artifact-write behavior must be tested directly.

### Conflict precedence tests

1. Multiple Intakes plus later Pending Project evidence returns Project Intake conflict.
2. Multiple Intakes plus later Pending Phase evidence returns Project Intake conflict.
3. Submission against a conflicting corpus writes no files.

No Playwright or new dependency is authorized.

## Authorized Files

Production changes are limited to files that own the confirmed behavior, expected to include:

```text
src/main/projectIntake/projectIntakeService.ts
src/shared/documents/documentOrder.ts                 [duplicate conflict only]
src/main/currentWorkflow/currentWorkflowService.ts    [duplicate conflict only]
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
```

One narrowly scoped shared Project Intake corpus/rail-status helper is authorized, for example under:

```text
src/shared/projectIntake/
```

Expected tests:

```text
test/project-intake/project-intake-service.test.cjs
test/resolver/first-non-approved-resolver.test.cjs
test/lifecycle/evidence-lifecycle-resolver.test.cjs   [only if needed]
test/project-intake/<bounded-status-or-identity-test>.test.cjs
```

`src/main/documents/planningDocumentService.ts` should not require production modification because synchronized explicit disposition writes already exist. A change there is authorized only if repository evidence proves a narrowly necessary defect in the existing disposition API; otherwise leave it untouched.

A minimal `src/shared/workspaceContracts.ts` change is authorized only if an explicit shared result or prop type cannot be expressed in the bounded helper or existing contracts.

## Explicit Non-Goals

Do not:

- reopen or revise WC18 or WC19 artifacts;
- change WC19 viewport, scrolling, confirmation, or viewed-workspace behavior;
- change native context-menu behavior;
- rewrite Architect Interview Prompt content;
- change repository selection or persistence;
- change canonical Project Intake directory classification;
- rename an existing valid singleton artifact family;
- automatically delete, merge, archive, or choose among duplicate Intakes;
- implement a duplicate-resolution UI;
- implement Architect chat-to-MCP transfer;
- create placeholder Architect Interview output;
- derive lifecycle statuses for every rail card;
- redesign the workflow rail visually;
- redesign sidebar navigation;
- add a project database, registry file, hidden state, queue, route token, or approval artifact;
- add dependencies;
- perform Git operations.

## Validation

Run the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

Perform a non-acceptance Electron launch smoke confirming only that:

- the application launches;
- a clean repository can save a Pending Intake;
- the Pending Intake is selected for review;
- the Project Intake card reads `Awaiting Approval`;
- explicit approval updates the card to `Completed`;
- changing Project Name and resubmitting preserves the existing artifact paths;
- a duplicate fixture displays Conflict without a renderer crash.

Automated checks and launch smoke do not replace Operator visual and workflow validation.

## Acceptance Criteria

WC20 is acceptable for Operator validation only when:

1. one selected repository can contain at most one active canonical Project Intake artifact family through application writes;
2. initial Project Name may establish the stable artifact key, but later Project Name changes do not change paths;
3. existing singleton Intake paths are reused exactly;
4. prompt paths and Interview output targets remain stable across Project Name changes;
5. no second Intake or prompt family is created by resubmission;
6. duplicate existing Intake families cause an actionable conflict and no writes;
7. newly saved Project Intake Markdown and JSON are Pending;
8. the generated prompt remains Approved and non-review;
9. the Pending Intake is selected and reviewable after save;
10. explicit Operator disposition is required before Intake is complete;
11. applying Approved synchronizes both Intake siblings;
12. revised Intake returns to Pending and requires reapproval;
13. approved downstream Interview invalidation remains correct on Intake revision;
14. Project Intake rail reads `Open` with no Intake;
15. Project Intake rail reads `Awaiting Approval` for any non-Approved singleton Intake;
16. Project Intake rail reads `Completed` for an Approved singleton Intake;
17. Project Intake rail reads `Conflict` for multiple canonical Intakes;
18. Project Intake card selection does not replace the lifecycle label with `CURRENT`;
19. selected workspace remains indicated visually and through `aria-current`;
20. rail status updates after load, repository switch, submission, refresh, and disposition changes;
21. duplicate conflict takes precedence over later Project or Phase evidence;
22. no unrelated workspace, prompt-content, context-menu, browser, repository-selection, or viewport behavior is changed;
23. no dependency, hidden authority, duplicate approval system, or Git mutation is introduced;
24. typecheck, build, and all tests pass;
25. the Implementer Report accurately distinguishes automated evidence from remaining Operator validation.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC20_canonical_project_intake_identity_explicit_approval_and_rail_status_repair.md`

The report must include:

- repository, remote, branch, and starting dirty-tree inventory;
- exact files created, modified, and deleted;
- final singleton Intake corpus analysis;
- stable artifact-key and path-reuse behavior;
- changed-name resubmission evidence;
- duplicate-conflict behavior and exact error form;
- final Intake and prompt dispositions on initial save;
- explicit approval and revised-Intake reapproval behavior;
- downstream invalidation behavior;
- Project Intake rail-status derivation and labels;
- selection-versus-status separation;
- focused test inventory and results;
- launch-smoke result and limitations;
- remaining Operator validation;
- final repository status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator will perform controlling validation after Architect review.

Required human checks:

1. select a new empty repository;
2. enter Project Name A and submit Project Intake;
3. confirm exactly one Intake pair and one prompt pair are created;
4. confirm the Intake is Pending and the prompt is Approved;
5. confirm the rail card reads `Awaiting Approval` whether selected or unselected;
6. approve the Intake through the visible disposition controls;
7. confirm the rail card changes to `Completed`;
8. confirm Architect Interview becomes the current required workspace;
9. return to Project Intake, change the name to Project Name B, and resubmit;
10. confirm the same Intake and prompt paths are reused;
11. confirm Project Name B appears in content;
12. confirm the Intake returns to Pending;
13. confirm the rail card returns to `Awaiting Approval`;
14. approve the revised Intake and confirm the rail returns to `Completed`;
15. confirm no second Intake, prompt, or Interview target family exists;
16. repeat after application restart and confirm stable path reuse;
17. open a fixture with two Intake families and confirm the rail reads `Conflict`;
18. confirm the conflict lists the repository-relative paths and blocks submission;
19. confirm no later Project or Phase evidence bypasses the conflict;
20. confirm selected-card highlighting remains visual and no Project Intake card displays `CURRENT`.

## Document Disposition

Document.Status=Approved
